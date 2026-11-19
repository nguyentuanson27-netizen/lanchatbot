import { randomUUID,createHash } from "node:crypto";
import { createSalesCycleRuntimeState, type RuntimePolicyResolution, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1, type VerifiedInboundMessageV1 } from "@lana/chat-runtime";
import { applySilentHandoff } from "@lana/conversation-engine";
import { HandoffMatrixAdminContentV1Schema, HandoffReasonV2Schema, type CartV1,canonicalCartVariantScopeV2 } from "@lana/contracts";
import type { PostgresRealtimeRuntimeStore, RealtimeCommitInput, RealtimeInboxBatchGuard } from "@lana/database";
import { buildCanonicalDecisionEvidenceV1, buildProtectedClaimsFromCartSelectionsV1, evaluateDeterministicEffectReadinessV1 } from "@lana/business-tools";
import {selectionsMatchCartLines} from './realtime-sales-cycle.js';
import {cartSelectionsHaveIndependentStockV2} from './realtime-sales-catalog.js';
import {makeCommerceMediaDeliveryBinding} from './single-agent-commerce-media-delivery.js';
import type {CheckoutMedia} from './single-agent-commerce-checkout-media.js';
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { CommerceScope } from "./single-agent-commerce-read-only-tools.js";
import type { HandoffAuthority } from "./single-agent-commerce-handoff.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { createPersistedCommerceReceiptReader, prepareNativeCommerceTransition } from "./single-agent-commerce-persistence.js";
import { evaluateRealtimeSalesCycle, type RealtimeSalesCycleOutput, type RealtimeSalesCycleInput } from "./realtime-sales-cycle.js";
import type { createCommerceEffectTools, CommerceCommandResult } from "./single-agent-commerce-effects.js";
import { CommerceEffectCommitError, type CommerceEffectFailureStage } from "./single-agent-commerce-effect-failure.js";

class CheckoutMediaPreparationError extends Error {constructor(readonly stage:'AUTHORITY'|'SOURCE'){super('CHECKOUT_MEDIA_PREPARATION');}}

type CommandInput = Parameters<NonNullable<Parameters<typeof createCommerceEffectTools>[0]["executeCommand"]>>[0];

/** Candidate only: the existing transaction owns each effect; the source is completed at the terminal commit. */
export function createPersistedCommerceExecutor(input: {
  scope: CommerceScope; clock: () => Date; latest: string; facts: BusinessFactsReader;
  policy: () => Promise<RuntimePolicyResolution>; readAuthority: () => Promise<HandoffAuthority>;
  store: Pick<PostgresRealtimeRuntimeStore, "loadOrCreateSalesCycle" | "commitWithinTransaction" | "readCommittedSalesCycleEvent">;
  transaction: <T>(work: (client: Parameters<PostgresRealtimeRuntimeStore["commitWithinTransaction"]>[0]) => Promise<T>) => Promise<T>;
  inboxBatchGuard: RealtimeInboxBatchGuard; resolveTagId: (tag: "NHAN_VIEN" | "VAN_DON" | "DA_CHOT_DON") => string | null;
  /** Private provider recipient is supplied by code and never added to a model projection. */
  deliveryRecipient?: string;
  productNames?: RealtimeSalesCycleInput["productNames"];
  attachmentIds?: readonly string[];
  paymentReceiptInbound?: VerifiedInboundMessageV1;
  handoffSource?: () => {eventKey:string;messagePk:string;attachmentCount:number} | undefined;
  prepareTerminalMedia?:(cart:CartV1)=>Promise<CheckoutMedia>;
}) {
  const { scope } = input;
  let outboxMessages = 0;
  let terminalCommitted = false;
  let checkoutMediaOutput:{kind:'NATIVE_CHECKOUT_MEDIA_V1';requestId:string;responseGroupId:string;recipient:string;conversationRevision:number;
    salesRevision:number;sourceMessageIdHash:string;operations:{id:string;kind:string}[];preview:{id:string;hash:string;cartId:string;cartVersion:number}|null;
    payloadHash:string;messageHashes:string[];imageHashes:string[];mediaBindingHash:string}|null=null;
  let checkoutProgressOutput:{kind:"NATIVE_CHECKOUT_PROGRESS_V1";requestId:string;sourceMessageIdHash:string;recipient:string;conversationRevision:number;salesRevision:number;
    responseGroupId:string;unitHashes:string[];unitKinds:string[];operations:{id:string;kind:string}[];cart:{id:string;version:number}|null;
    preview:{id:string;hash:string;cartId:string;cartVersion:number}|null}|null=null;
  let codeOwnedOutput: {kind:"NATIVE_CHECKOUT_CLARIFICATION";requestId:string;recipient:string;conversationRevision:number;
    salesRevision:number;sourceMessageIdHash:string;operationIds:string[];payloadHash:string;messageHashes:string[];missingFields:readonly string[]} | null = null;
  const repository: SalesCycleStateRepositoryV1 = {
    async read(key) {
      if (key !== scope.conversationId) throw new Error("COMMERCE_SCOPE");
      const row = await input.store.loadOrCreateSalesCycle(scope.pageId, key,
        () => createSalesCycleRuntimeState(key, { pageId: scope.pageId, conversationId: key }, input.clock()), input.clock());
      if (row.state.routing.pageId !== scope.pageId || row.state.routing.conversationId !== key || row.state.revision !== row.stateRevision) throw new Error("COMMERCE_SCOPE");
      return row.state;
    }, async compareAndSwap() { throw new Error("USE_CURRENT_SOURCE_EXECUTOR"); },
  };
  const nativeSelections=new Map<string,{query:Parameters<NonNullable<BusinessFactsReader['resolveCartSelection']>>[0];hash:string}>();
  const observedFacts:BusinessFactsReader={...input.facts,resolveCartSelection:async(query,at)=>{
    const result=await input.facts.resolveCartSelection!(query,at),key=commerceHash(query);
    if(!nativeSelections.has(key)&&nativeSelections.size>=32)throw Error('CHECKOUT_SOURCE_BOUND');
    nativeSelections.set(key,{query:structuredClone(query),hash:commerceHash(result)});return result;
  }};
  const source = (state: SalesCycleRuntimeState, authority: HandoffAuthority, policyResolution: RuntimePolicyResolution) => ({
    pageId: scope.pageId, conversationId: scope.conversationId, customerHash: scope.customerHash, state, stateRevision: state.revision,
    checkoutCollection: "SINGLE_FIELD" as const,
    conversationRevision: authority.stateVersion, text: input.latest, messageId: scope.sourceMessageId, eventKey: scope.sourceMessageId,
    senderId: scope.customerHash, occurredAt: scope.sourceObservedAt!, attachmentIds: input.attachmentIds ?? [],
    ...(input.paymentReceiptInbound ? {paymentReceiptInbound: input.paymentReceiptInbound} : {}), productId: state.cart?.value.lines[0]?.parentProductId ?? null,
    offerType: null, size: null, color: null, shopAlias: scope.shopAlias, policyResolution, facts: input.prepareTerminalMedia?observedFacts:input.facts, ...(input.productNames ? { productNames: input.productNames } : {}), now: input.clock(), effectNow: input.clock,
  });
  const matches = (a: HandoffAuthority) => a.pageId === scope.pageId && a.customerHash === scope.customerHash && a.conversationId === scope.conversationId &&
    a.state.conversationId === scope.conversationId && a.bindingVersion === scope.bindingVersion && a.recipient === scope.recipient &&
    a.permission && a.privacyAllowed && a.state.conversationOwner === "BOT" && a.state.routingOwner === "APP";
  async function prepareMedia(output:RealtimeSalesCycleOutput,authority:HandoffAuthority,terminal:boolean,resolution:RuntimePolicyResolution,canonicalVariant:boolean){
    if(!input.prepareTerminalMedia||!terminal||output.transferToHuman||!output.messages.length)return undefined;
    const cart=output.plan?.state.cart?.value;if(!cart)throw Error('CHECKOUT_MEDIA_CART_REQUIRED');
    const media=await input.prepareTerminalMedia(cart);
    if(media.images.length>4||output.messages.length+media.images.length>6)throw Error("CHECKOUT_MEDIA_GROUP_BOUND");
    if(!media.images.length)return media; // Proven returning path, unchanged native output.
    const current=await repository.read(scope.conversationId),freshPolicy=await input.policy();
    if(!current||current.revision!==output.plan!.expectedRevision||commerceHash(await input.readAuthority())!==commerceHash(authority))throw new CheckoutMediaPreparationError('AUTHORITY');
    if(!current.cart||!(Date.parse(current.cart.expiresAt)>input.clock().getTime()))throw new CheckoutMediaPreparationError('SOURCE');
    if(commerceHash(freshPolicy.bundle)!==commerceHash(resolution.bundle))throw new CheckoutMediaPreparationError('SOURCE');
    for(const saved of nativeSelections.values())if(commerceHash(await input.facts.resolveCartSelection!(saved.query,input.clock()))!==saved.hash)throw Error('CHECKOUT_MEDIA_LINE_SOURCE_CHANGED');
    const selections=await Promise.all(cart.lines.map(l=>input.facts.resolveCartSelection!({shopAlias:scope.shopAlias,productId:l.parentProductId,offerType:l.offerId,
      size:l.components[0]?.size??null,color:l.components[0]?.color??null,quantity:l.quantity,lineId:l.lineId,
      ...(output.plan!.state.checkoutDraft?.address?{deliveryAddress:output.plan!.state.checkoutDraft.address}:{})},input.clock())));
    const ready=selections.flatMap(s=>s.status==='READY'?[s]:[]);
    if(!selectionsMatchCartLines(cart.lines,ready)||!cartSelectionsHaveIndependentStockV2(ready))throw Error('CHECKOUT_MEDIA_CART_SOURCE_CHANGED');
    const freshClaims=buildProtectedClaimsFromCartSelectionsV1(ready.map(s=>({productId:s.line.parentProductId,variantId:canonicalVariant?canonicalCartVariantScopeV2(s.line,text=>createHash('sha256').update(text).digest('hex')):s.line.offerId,priceVnd:s.line.posUnitPriceVnd!,
      priceVersion:s.versions.price,inventoryVersion:s.versions.inventory,etaVersion:s.versions.eta,eta:s.eta,etaExpiresAt:s.etaExpiresAt,sourceAuthority:s.sourceAuthority,
      stockStatus:s.stockStatus,stockAvailableQuantity:s.stockAvailableQuantity,observedAt:s.sourceObservedAt,expiresAt:s.sourceExpiresAt})));
    if(output.protectedOutbound?.claims.some(c=>['PRICE','STOCK','ETA'].includes(c.type)&&!freshClaims.some(f=>commerceHash(f)===commerceHash(c))))throw Error('CHECKOUT_MEDIA_FACT_CHANGED');
    if(commerceHash((await input.policy()).bundle)!==commerceHash(resolution.bundle))throw new CheckoutMediaPreparationError('SOURCE');
    if(commerceHash(await input.readAuthority())!==commerceHash(authority))throw new CheckoutMediaPreparationError('AUTHORITY');
    const at=input.clock().getTime();
    if(!(Date.parse(current.cart.expiresAt)>at)||ready.some(s=>!(Date.parse(s.sourceObservedAt)<=at&&Date.parse(s.sourceExpiresAt)>at)))throw new CheckoutMediaPreparationError('SOURCE');
    return media;
  }
  async function commit(output: RealtimeSalesCycleOutput, authority: HandoffAuthority, terminal: boolean, resolution: RuntimePolicyResolution,media?:CheckoutMedia,beforeDispatch?:()=>void) {
    if (!output.plan) return null;
    const now = input.clock(), transfer = output.transferToHuman;
    const next = transfer ? applySilentHandoff(authority.state, "AGENT_REQUEST", authority.stateVersion, authority.fence, now).state
      : { ...authority.state, revision: authority.stateVersion+1 };
    // Candidate policy covers code-owned checkout transfers as well as the
    // request_handoff tool. A partial/default matrix keeps legacy behavior.
    const matrix = resolution.bundle?.artifacts.handoffMatrix
      ? HandoffMatrixAdminContentV1Schema.parse(resolution.bundle.artifacts.handoffMatrix) : null;
    const silentTransfer = transfer && resolution.bundle?.channel === "PUBLISHED" &&
      HandoffReasonV2Schema.options.every(reason => matrix?.rules.some(rule => rule.reason === reason &&
        rule.customerMessagePolicy === "SILENT_HANDOFF" && rule.holdingReply === null));
    const images=!transfer?media?.images??[]:[];
    const messages = terminal && !silentTransfer ? [...output.messages,...images.map(a=>({kind:'IMAGE' as const,imageUrl:a.url}))] : [];
    const tag = transfer ? output.desiredTag ?? "NHAN_VIEN" : null, tagId = tag ? input.resolveTagId(tag) : null;
    if (tag && !tagId) throw new Error("HANDOFF_TAG_UNAVAILABLE");
    const clarification = ["CHECKOUT_DETAILS_MISSING", "CHECKOUT_PAUSED"].includes(output.reasonCode ?? "") && output.telemetry?.clarificationCase === true;
    if (messages.length && (!input.deliveryRecipient || (!output.protectedOutbound && !clarification))) throw new Error("PRIVATE_DELIVERY_ROUTE_REQUIRED");
    // Same final-payload binding as realtime-runner: a planner readiness is not yet a Meta envelope.
    const original = output.protectedOutbound?.readiness, cart = output.plan.state.cart?.value;
    const claims=[...(output.protectedOutbound?.claims??[]),...(!transfer?media?.claims??[]:[])],claimTypes=[...new Set(claims.map(c=>c.type))];
    const productIds=[...new Set([...(original?.productIds??cart?.lines.map(l=>l.parentProductId)??[]),...images.map(a=>a.productId)])].sort();
    const outbound = original && messages.length ? evaluateDeterministicEffectReadinessV1({ effect: "PROTECTED_OUTBOUND", pageId: scope.pageId, conversationId: scope.conversationId,
      sourceMessageIdHash: original.sourceMessageIdHash, conversationRevision: authority.stateVersion, salesCycleRevision: original.salesCycleRevision, productIds,
      cartId: cart?.cartId ?? null, cartVersion: cart?.revision ?? null, cartStateHash: original.cartStateHash, ...(cart ? { cartLines: cart.lines } : {}),
      orderPreviewId: original.orderPreviewId, orderPreviewHash: original.orderPreviewHash, buyingIntent: null,
      claims, protectedClaimTypes: claimTypes, deterministicEvidenceHash: commerceHash(messages),
      parentReadinessHash: original.binding.parentReadinessHash, payloadHash: commerceHash(messages), checkedAt: now }) : messages.length && clarification ?
      evaluateDeterministicEffectReadinessV1({ effect: "PROTECTED_OUTBOUND", pageId: scope.pageId, conversationId: scope.conversationId,
        sourceMessageIdHash: output.plan.sourceMessageIdHash!, conversationRevision: authority.stateVersion, salesCycleRevision: output.plan.expectedRevision,
        productIds, cartId: null, cartVersion: null, cartStateHash: null, orderPreviewId: null, orderPreviewHash: null, buyingIntent: null,
        claims, protectedClaimTypes: claimTypes, deterministicEvidenceHash: commerceHash(messages), payloadHash: commerceHash(messages), checkedAt: now }) : null;
    if(messages.length&&outbound?.outcome!=='READY')throw new CheckoutMediaPreparationError('SOURCE');
    const responseGroupId=randomUUID(),mediaBinding=images.length?makeCommerceMediaDeliveryBinding({scope,generation:input.inboxBatchGuard.generation,responseGroupId,nextState:next,
      policy:resolution.bundle!,messages,images,now}):undefined;
    const prepared: RealtimeCommitInput<typeof next, SalesCycleRuntimeState> = { pageId: scope.pageId, conversationId: scope.conversationId,
      customerHash: scope.customerHash, expectedStateVersion: authority.stateVersion, state: next, salesCyclePlan: output.plan,
      inboxBatchGuard: input.inboxBatchGuard, completeInboxBatch: terminal,
      ...(tag && tagId ? { pancakeTagPlan: { desiredTag: tag, tagId, handoffGeneration: next.revision }, handoffEventPlan: {
        source: "BOT_POLICY" as const, reasonCode: output.reasonCode ?? "DEPENDENCY_FAILURE", productId: output.plan.state.cart?.value.lines[0]?.parentProductId ?? null,
        reasonDetailSafe: {attachmentCount:input.handoffSource?.()?.attachmentCount ?? 0},
        factsStatus: null, factsReasonCode: null, desiredTag: "NHAN_VIEN" as const, handoffGeneration: next.revision,
        triggerEventKey: input.handoffSource?.()?.eventKey ?? scope.sourceMessageId, triggerMessagePk: input.handoffSource?.()?.messagePk ?? null, occurredAt: now } } : {}),
      ...(messages.length ? { metaPlan: { replyPlanId: randomUUID(), responseGroupId, recipientId: input.deliveryRecipient!, messages,
        ...(mediaBinding?{mediaBinding}:{}),sourceMessageIdHash: output.plan.sourceMessageIdHash!, protectedClaimTypes: claimTypes,
        protectedClaims: claims, effectReadiness: outbound!, sendAfterOwnerHandoff: transfer } } : {}) };
    beforeDispatch?.();
    const committed = await input.transaction(async client => {
      const r = await input.store.commitWithinTransaction(client, prepared, now);
      if (r.stateCommitted && ((transfer && (!r.pancakeTagOutboxCreated || !r.handoffEventCreated)) || (messages.length && r.metaOutboxCreated !== messages.length))) throw new Error("ATOMIC_EFFECT_INTENTS");
      if (r.stateCommitted) outboxMessages += r.metaOutboxCreated;
      return r;
    });
    if (terminal && committed.stateCommitted) terminalCommitted = true;
    if(committed.stateCommitted&&Array.isArray(output.plan.events)&&output.plan.events.length)checkoutProgressOutput={kind:"NATIVE_CHECKOUT_PROGRESS_V1",requestId:scope.requestId,
      sourceMessageIdHash:output.plan.sourceMessageIdHash!,recipient:scope.recipient,conversationRevision:next.revision,salesRevision:output.plan.state.revision,
      responseGroupId,unitHashes:messages.map(m=>createHash('sha256').update(m.kind==='TEXT'?m.text:m.imageUrl).digest('hex')),unitKinds:messages.map(m=>m.kind),
      operations:output.plan.events.map(e=>({id:e.commandId,kind:e.commandKind})),cart:cart?{id:cart.cartId,version:cart.revision}:null,
      preview:output.plan.state.preview?{id:output.plan.state.preview.previewId,hash:output.plan.state.preview.previewHash,cartId:output.plan.state.preview.cartId,cartVersion:output.plan.state.preview.cartVersion}:null};
    if(terminal&&committed.stateCommitted&&mediaBinding)checkoutMediaOutput={kind:'NATIVE_CHECKOUT_MEDIA_V1',requestId:scope.requestId,responseGroupId,recipient:scope.recipient,
      conversationRevision:next.revision,salesRevision:output.plan.state.revision,sourceMessageIdHash:output.plan.sourceMessageIdHash!,operations:output.plan.events.map(e=>({id:e.commandId,kind:e.commandKind})),
      preview:output.plan.state.preview?{id:output.plan.state.preview.previewId,hash:output.plan.state.preview.previewHash,cartId:output.plan.state.preview.cartId,cartVersion:output.plan.state.preview.cartVersion}:null,
      payloadHash:commerceHash(messages),messageHashes:messages.map(commerceHash),imageHashes:images.map(a=>createHash('sha256').update(a.url).digest('hex')),mediaBindingHash:commerceHash(mediaBinding)};
    if (committed.stateCommitted && clarification && messages.length && output.plan.state.clarification &&
      !output.protectedOutbound && output.messages.every(m=>m.kind==="TEXT") && output.plan.events.some(e=>e.commandKind==="CLARIFICATION_REQUESTED")) {
      const texts=messages.flatMap(m=>m.kind==="TEXT"?[m.text]:[]);
      codeOwnedOutput={kind:"NATIVE_CHECKOUT_CLARIFICATION",requestId:scope.requestId,recipient:scope.recipient,
        conversationRevision:next.revision,salesRevision:output.plan.state.revision,sourceMessageIdHash:output.plan.sourceMessageIdHash!,
        operationIds:output.plan.events.filter(e=>e.commandKind==="CLARIFICATION_REQUESTED").map(e=>e.commandId),
        payloadHash:commerceHash(texts),messageHashes:texts.map(text=>createHash("sha256").update(text).digest("hex")),
        missingFields:[...output.plan.state.clarification.missingFields]};
    }
    return committed;
  }
  return { repository, outboxCount: () => outboxMessages, terminalCommitted: () => terminalCommitted,
    codeOwnedOutput:()=>codeOwnedOutput?structuredClone(codeOwnedOutput):null,
    checkoutMediaOutput:()=>checkoutMediaOutput?structuredClone(checkoutMediaOutput):null,
    checkoutProgressOutput:()=>checkoutProgressOutput?structuredClone(checkoutProgressOutput):null,
    readReceipt: createPersistedCommerceReceiptReader({ store: input.store, repository, scope, conversationKey: scope.conversationId }),
    async privateCheckoutPending() {
      const current = await repository.read(scope.conversationId);
      return !!current && ["CART_OPEN", "ORDER_PREVIEW"].includes(current.stage) &&
        current.clarification?.reasonCode === "CHECKOUT_DETAILS_MISSING";
    },
    async executeCommand(call: CommandInput): Promise<CommerceCommandResult> {
      let phase:CommerceEffectFailureStage="AUTHORITY";
      let commitStarted=false;
      try {
      const authority = await input.readAuthority();
      if (!matches(authority) || authority.stateVersion !== call.conversationRevision || call.bindingVersion !== scope.bindingVersion) return { status: "REJECTED", reasonCode: "CURRENT_AUTHORITY_CHANGED",failureStage:"AUTHORITY" };
      phase="READBACK";
      const state = (await repository.read(scope.conversationId))!;
      if (state.revision !== call.expectedRevision) return { status: "CONFLICT", reasonCode: "STATE_VERSION_CONFLICT",failureStage:"CAS" };
      phase="SOURCE";
      const resolution = await input.policy();
      if (!resolution.bundle || commerceHash(resolution.bundle.policy) !== commerceHash(call.policy.policy)) return { status: "REJECTED", reasonCode: "POLICY_CHANGED",failureStage:"SOURCE" };
      const draft = call.command.kind === "CART_OPENED" ? call.trustedPorts.resolveCartDraft(call.command.cartDraftRef) : null;
      const selected = draft?.lines[0], component = selected?.components[0];
      nativeSelections.clear();
      const output = await prepareNativeCommerceTransition({ command: call.command, trustedPorts: call.trustedPorts,
        source: { ...source(state, authority, resolution), ...(selected ? { productId: selected.parentProductId, offerType: selected.offerId, size: component?.size ?? null, color: component?.color ?? null } : {}) } });
      if (!output.plan) return { status: "REJECTED", reasonCode: output.reasonCode ?? "TRANSITION_UNAVAILABLE",failureStage:output.failureStage??"DOMAIN" };
      const terminal = call.command.kind === "CONFIRM_PURCHASE" || output.transferToHuman;
      const media=await prepareMedia(output,authority,terminal,resolution,true);
      if (!(await commit(output, authority, terminal, resolution,media,()=>{phase="COMMIT_UNKNOWN";commitStarted=true;}))?.stateCommitted) return { status: "CONFLICT", reasonCode: "STATE_VERSION_CONFLICT",failureStage:"CAS" };
      phase="READBACK";
      const actual = (await repository.read(scope.conversationId))!;
      if (commerceHash(actual) !== commerceHash(output.plan.state)) throw new Error("COMMITTED_STATE_CHANGED");
      if (call.command.kind === "CONFIRM_PURCHASE" && output.reasonCode === "CHECKOUT_DETAILS_MISSING" &&
          output.telemetry?.clarificationCase === true) return { status: "CHECKOUT_REQUESTED", state: actual };
      return actual.stage === "HANDED_OFF" ? { status: "HANDOFF", state: actual, reasonCode: output.reasonCode ?? "DEPENDENCY_FAILURE" }
        : { status: "APPLIED", state: actual, transferToHuman: output.transferToHuman };
      } catch (error) {
        if(error instanceof CheckoutMediaPreparationError)phase=error.stage;
        if(commitStarted)throw new CommerceEffectCommitError(phase==="READBACK"?"READBACK":"COMMIT_UNKNOWN");
        return {status:"REJECTED",reasonCode:"TRANSITION_PREPARATION_UNAVAILABLE",failureStage:phase};
      }
    },
    /** The existing private checkout parser/preview runs in code; no raw private input goes to a model. */
    async advancePrivateCheckout() {
      const authority = await input.readAuthority(); if (!matches(authority)) return { committed: false, messages: 0,
        failure: { stage: "AUTHORITY" as const, reasonCode: "CURRENT_AUTHORITY_CHANGED" } };
      const state = (await repository.read(scope.conversationId))!, resolution = await input.policy();
      nativeSelections.clear();
      const output = await evaluateRealtimeSalesCycle({ ...source(state, authority, resolution), canonicalBuyingIntent: buildCanonicalDecisionEvidenceV1({
        text: input.latest, sourceMessageId: scope.sourceMessageId, productId: null, modelBuyingIntent: null, evaluatedAt: input.clock() }).buyingIntent });
      if (!output.plan) return { committed: false, messages: 0, failure: { stage: "PLANNER" as const,
        reasonCode: output.reasonCode ?? "NO_TRANSITION_PLAN", readinessReasons: output.readinessAttempt?.reasonCodes ?? [] } };
      let media:CheckoutMedia|undefined;
      let dispatched=false,committed;
      try{media=await prepareMedia(output,authority,true,resolution,false);
        committed=await commit(output,authority,true,resolution,media,()=>{dispatched=true;});
      }catch(error){if(dispatched)throw error;return {committed:false,messages:0,failure:{stage:error instanceof CheckoutMediaPreparationError?error.stage:'SOURCE' as const,reasonCode:'CHECKOUT_MEDIA_UNAVAILABLE'}};}
      return committed?.stateCommitted ? { committed: true, messages: committed.metaOutboxCreated } : { committed: false, messages: 0,
        failure: { stage: "COMMIT" as const, reasonCode: "COMMIT_NOT_APPLIED", reasonCodes: committed?.reasonCodes ?? [],
          inboxBatchStatus: committed?.inboxBatchStatus ?? null } };
    },
  };
}
