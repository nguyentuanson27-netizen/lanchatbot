import {publicCheckoutState} from "./single-agent-commerce-public-history.js";
import { computeBusinessContentHash, executePersistedSalesCycleCommand, type RuntimePolicyBundle,
  type SalesCycleCommand, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1,
  type SalesCycleTrustedPortsV1, type ResolvedCartDraftV1 } from "@lana/chat-runtime";
import type { CanonicalCartIdentityV2, CanonicalCartMutationV2 } from "@lana/business-tools";
import { buildProtectedClaimsFromCartSelectionsV1, normalizeCatalogToken } from "@lana/business-tools";
import { buildReadOnlyContext, commerceHash, commerceUuid, publicPolicyLiteral } from "./single-agent-commerce-read-only-context.js";
import { toolArgs, type CommerceScope, type CommerceToolCall, type CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { CartSelectionQuery, CartSelectionResult } from "./realtime-sales-catalog.js";
import type { TerminalOutcome, TrustedContext } from "./single-agent-semantic-verifier-boundary.js";
import { formatCartLineSelection, selectionsMatchCartLines } from "./realtime-sales-cycle.js";
import {selectionChoiceResolution,validSelectionEvidence,selectionEvidenceWithExpiry,selectionOptionScope,mergeSelectionEvidence,selectionMeaningHash,selectionQueryKey,expandSelectionOptions,type CandidateSelectionEvidence} from "./single-agent-commerce-selection-evidence.js";
import { CommerceEffectCommitError, type CommerceEffectFailureStage } from "./single-agent-commerce-effect-failure.js";
import {CART_TTL_MS_V1,PendingNegotiationV1Schema,pendingNegotiationIdPreimageV1,pendingNegotiationAfterActivationV1,type PendingNegotiationV1} from "@lana/contracts";
import {createHash} from "node:crypto";
import {receiptCartItemsHash} from "./single-agent-commerce-effect-receipts.js";
import {unestablishedPriceFloor,supportEvaluationStep,type SupportWaitingFor} from "./single-agent-commerce-pricing-view.js";

const names = new Set(["add_to_cart", "change_cart_item", "confirm_purchase", "record_negotiation", "apply_pending_negotiation", "cancel_pending_negotiation"]);
export type CommerceCommandResult =
  | { status: "APPLIED"; state: SalesCycleRuntimeState; transferToHuman: boolean }
  | { status: "DUPLICATE"; state: SalesCycleRuntimeState }
  | { status: "CHECKOUT_REQUESTED"; state: SalesCycleRuntimeState }
  | { status: "HANDOFF"; state: SalesCycleRuntimeState; reasonCode: string }
  | { status: "REJECTED" | "CONFLICT"; reasonCode: string; failureStage?: CommerceEffectFailureStage };

/** Native tools bridge to existing atomic sales-cycle repository. No external order/send implementation. */
export async function createCommerceEffectTools(input: {
  base: CommerceTools; scope: CommerceScope; clock: () => Date; conversationKey: string;
  repository: SalesCycleStateRepositoryV1; identity: CanonicalCartIdentityV2;
  authorize: (effect: "CART_OPEN" | "CART_MUTATION" | "PURCHASE_CONFIRMATION", current: SalesCycleRuntimeState) => Promise<boolean>;
  policy: () => Promise<RuntimePolicyBundle>;
  select: (query: CartSelectionQuery) => Promise<CartSelectionResult>;
  selectionMaxAgeSeconds?:number;
  /**
   * Owner decision 2026-11-16: a support request stored before the cart is evaluated by code, once, in the
   * same add_to_cart that opens the matching cart. It reuses the guarded activation command and its receipts.
   * apply_pending_negotiation stays as the recovery path for an evaluation that did not complete.
   */
  evaluateStoredSupportAtCartOpening?:boolean;
  /** Current public batch messages; code resolves the exact quote's evidence identity. */
  negotiationSources?: readonly { text: string; sourceMessageId: string; observedAt: string }[];
  trustedPorts?: SalesCycleTrustedPortsV1;
  resolveBankTransferPolicy?: Parameters<typeof executePersistedSalesCycleCommand>[0]["resolveBankTransferPolicy"];
  /** A real composition supplies the existing guarded runtime transaction; isolated tests may use the domain CAS. */
  readAuthority?: () => Promise<Pick<CommerceScope, "revision" | "conversationOwner" | "recipient" | "permission" | "privacyAllowed" | "bindingVersion">>;
  readReceipt?: (operationId: string) => Promise<TrustedContext["effectReceipts"][number] | null>;
  executeCommand?: (input: { command: SalesCycleCommand; expectedRevision: number; conversationRevision: number; bindingVersion: string; trustedPorts: SalesCycleTrustedPortsV1;
    policy: RuntimePolicyBundle }) => Promise<CommerceCommandResult>;
}): Promise<CommerceTools> {
  async function read() {
    const s = await input.repository.read(input.conversationKey);
    if (!s || s.conversationKey !== input.conversationKey || s.routing.pageId !== input.scope.pageId ||
      s.routing.conversationId !== input.scope.conversationId) throw new Error("COMMERCE_SCOPE");
    return s;
  }
  let current = await read(), policy: RuntimePolicyBundle | null = null, uncertain = false, failedEffect = false;
  const noCommitNegotiations=new WeakMap<CommerceToolResult,{state:string;authority:string}>();
  const noCommitSelections=new WeakMap<CommerceToolResult,{state:string;authority:string}>();
  const selections = new Map<string, Extract<CartSelectionResult, { status: "READY" }>>();
  const selectionObservations=new Map<string,{query:CartSelectionQuery;evidence:CandidateSelectionEvidence}>();
  let authority = await input.readAuthority?.();
  if (authority && (authority.bindingVersion !== input.scope.bindingVersion || authority.recipient !== input.scope.recipient)) throw new Error("COMMERCE_SCOPE");
  const turnBinding = authority?.bindingVersion ?? input.scope.bindingVersion;
  const turnRecipient = authority?.recipient ?? input.scope.recipient;
  const refreshAuthority = async () => { authority = await input.readAuthority?.(); };
  let receipt: TrustedContext["effectReceipts"][number] | undefined;
  let receiptSequence:TrustedContext["effectReceipts"]=[],receiptStateHash:string|undefined,receiptLinesHash:string|undefined;
  let publicSummary: unknown;
  let receiptConversationRevision: number | undefined;
  let receiptBindingVersion: string | undefined;
  let committedTerminal: { reason: string; revision: number; operationId: string; conversationRevision: number; disposition?: "NO_SEND" } | undefined;
  const selectionRef = (lineId: string) => `cart-variant:${lineId}`;
  const activeSelections = () => [...selections.values()].filter(s => current.cart?.value.lines.some(l => selectionsMatchCartLines([l], [s])));
  const cartItems = (active = activeSelections()) => current.cart?.value.lines.map(line => {
    const selected = active.find(s => s.line.lineId === line.lineId);
    return { subjectRef: line.lineId, productRef: line.parentProductId, offerType: line.offerId, quantity: line.quantity,
      components: line.components.map(c => ({ componentRole: c.componentRole, size: c.size, color: c.color })),
      ...(selected ? { stockStatus: selected.stockStatus, stockAvailableQuantity: selected.stockAvailableQuantity } : {}) };
  }) ?? [];
  const cartQuote = () => {
    const cart = current.cart?.value;
    return cart ? { cartId: cart.cartId, cartVersion: cart.revision, subtotalVnd: cart.subtotalVnd,
      shippingFeeVnd: cart.shippingFeeVnd, discountTotalVnd: cart.discountTotalVnd, grandTotalVnd: cart.grandTotalVnd,
      appliedAdjustments:cart.adjustments.map(a=>({kind:a.kind,amountVnd:a.amountVnd,percentageBps:a.percentageBps,
        decisionId:a.policyAuthorization.decisionId,policyRuleId:a.policyAuthorization.ruleId})),
      negotiatedPriceFloor:unestablishedPriceFloor() } : null;
  };
  function pendingSupportView(){
    const pending=current.pendingNegotiation;
    if(!pending||pending.status!=="PENDING"||Date.parse(pending.expiresAt)<=input.clock().getTime())return undefined;
    const eligible=current.cart&&current.commerceContext&&pending.cartOpeningCommandId?
      pendingNegotiationAfterActivationV1(pending,current.cart.value,current.commerceContext.policyRef,pending.cartOpeningCommandId,input.clock().toISOString()):null;
    // What the customer still has to choose for this exact item; a cart is never the thing being waited for.
    const wanted=(input.base.snapshot().state.pendingPurchase as {lines?:{productId?:unknown;offerType?:unknown;missing?:unknown}[]}|undefined)?.lines;
    const missing=(Array.isArray(wanted)?wanted:[]).filter(l=>l.productId===pending.productId&&l.offerType===pending.offerId&&(l.missing==="COLOR"||l.missing==="SIZE"))
      .map(l=>l.missing as SupportWaitingFor);
    const waitingFor:SupportWaitingFor[]=current.cart?[]:[...new Set(missing)];
    const waitingForStatus=eligible||(!current.cart&&missing.length>0)?"KNOWN":"UNKNOWN";
    return {pendingRef:pending.pendingId,subjectRef:pending.productId,offerType:pending.offerId,status:"NOT_EVALUATED",
      negotiatedPriceFloor:unestablishedPriceFloor(),
      benefitAuthorization:{scope:"ADDITIONAL_SUPPORT_FOR_THIS_PENDING_REQUEST",status:"NOT_GRANTED",grantedBenefits:[],receiptRef:null},
      canApply:!!eligible,
      evaluation:supportEvaluationStep(!current.cart?"MATCHING_CART_OPENS":eligible?"NOT_COMPLETED_AT_CART_OPENING":"REQUEST_DIFFERS_FROM_CART",waitingFor,waitingForStatus)};
  }
  // One result shape for a first commit and for its replay, so a repeated call never reads as an empty outcome.
  const effectData=(operationId:string,effectName:string,pendingRecord:boolean)=>{
    const pendingSupport=pendingSupportView(),pending=current.pendingNegotiation;
    return { operationId, effect: effectName, cart: current.cart?.value, cartItems: cartItems(), cartQuote: cartQuote(),
      ...(pendingRecord&&pending?.status==="PENDING"?{supportEvaluation:{status:"NOT_EVALUATED",supportAvailability:"UNKNOWN",pendingRef:pending.pendingId,
        pendingCommitted:true,negotiationApplied:false}}:{}),
      ...(pendingSupport?{pendingSupport}:{}),
      purchaseConfirmed: current.confirmation !== null, externalOrderCreated: false };
  };
  async function terminalOutcome(): Promise<TerminalOutcome | null> {
    // An unproved effect blocks every reply, including an otherwise harmless
    // ACK. Recovery of a rejected draft is not a substitute for this send gate.
    if(uncertain)return {disposition:"NO_SEND",reason:"UNKNOWN_COMMIT",text:null,fallbackId:null};
    if (!committedTerminal) {
      await refreshAuthority();
      if (authority && (!authority.permission || !authority.privacyAllowed || authority.conversationOwner !== "BOT" ||
        authority.recipient !== turnRecipient || authority.bindingVersion !== turnBinding)) {
        return { disposition: "NO_SEND", reason: "CURRENT_AUTHORITY_CHANGED", text: null, fallbackId: null };
      }
      return await input.base.terminalOutcome?.() ?? null;
    }
    current = await read(); await refreshAuthority();
    const state = snapshot().state;
    if (!state.privacyAllowed || state.recipient !== turnRecipient || state.bindingVersion !== turnBinding ||
      current.revision !== committedTerminal.revision || !current.processedCommandIds.includes(committedTerminal.operationId) ||
      (authority?.revision ?? input.scope.revision) !== committedTerminal.conversationRevision) {
      return { disposition: "NO_SEND", reason: "HANDOFF_SCOPE_CHANGED", text: null, fallbackId: null };
    }
    return { disposition: committedTerminal.disposition ?? "HANDOFF", reason: committedTerminal.reason, text: null, fallbackId: null };
  }
  const snapshot = (): TrustedContext => {
    if(policy&&current.cart){
      const ref=current.commerceContext?.policyRef;
      if(!ref||ref.id!==policy.policy.policyBundleId||ref.version!==policy.policy.policyVersion||
        ref.contentHash!==computeBusinessContentHash(policy.policy))throw new Error("TRANSACTION_POLICY_BINDING_CHANGED");
    }
    const base = input.base.snapshot(), subjects = [...base.boundSubjects],pendingSupport=pendingSupportView();
    const active = activeSelections();
    if (current.cart) {
      subjects.push({ ref: current.cart.value.cartId, kind: "CART", label: "Giỏ hàng hiện tại", bindingVersion: base.state.bindingVersion });
      for (const line of current.cart.value.lines) subjects.push({ ref: line.lineId, kind: "CART_LINE", label: line.parentProductId, bindingVersion: base.state.bindingVersion });
    }
    for (const s of active) subjects.push({ ref: selectionRef(s.line.lineId), kind: "VARIANT",
      label: `${s.line.parentProductId} ${s.line.offerId}: ${s.line.components.map(c => [c.componentRole, c.size, c.color].filter(Boolean).join(" ")).join("; ")}`,
      productId: s.line.parentProductId, bindingVersion: base.state.bindingVersion });
    const selectionClaims = buildProtectedClaimsFromCartSelectionsV1(active.map(s => ({ productId: s.line.parentProductId, variantId: selectionRef(s.line.lineId), priceVnd: s.line.posUnitPriceVnd!,
      priceVersion: s.versions.price, inventoryVersion: s.versions.inventory, etaVersion: s.versions.eta, eta: s.eta, etaExpiresAt: s.etaExpiresAt, sourceAuthority: s.sourceAuthority,
      stockStatus: s.stockStatus, stockAvailableQuantity: s.stockAvailableQuantity, observedAt: s.sourceObservedAt, expiresAt: s.sourceExpiresAt })));
    const cart = current.cart?.value;
    const stateReceipts = base.effectReceipts.filter(r => r.effect === "CUSTOMER_STATE_UPDATED" && r.subjectRef === base.state.customerProfileId &&
      base.boundSubjects.some(s => s.kind === "CUSTOMER_PROFILE" && s.ref === r.subjectRef)).map(r => ({ ...r, stateRevision: current.revision }));
    const supersededVariantRefs = new Set<string>();
    return buildReadOnlyContext({ state: { ...base.state, ...authority, conversationRevision: authority?.revision ?? base.state.revision, revision: current.revision,
      salesStage: current.stage, cartItems: cartItems(active),
      ...(pendingSupport?{pendingSupport}:{}),
      checkoutStatus: { publicIntake:publicCheckoutState(current),previewAvailable: current.stage === "ORDER_PREVIEW" && current.preview !== null, purchaseConfirmed: current.confirmation !== null,
        missingFields: [!current.checkoutDraft?.fullName && "FULL_NAME", !current.checkoutDraft?.phone && "PHONE", !current.checkoutDraft?.address && "ADDRESS", !current.checkoutDraft?.paymentMethod && "PAYMENT_METHOD"].filter(Boolean) },
      ...(current.stage === "HANDED_OFF" ? { permission: false, conversationOwner: "HUMAN" } : {}),
      ...(cart ? { cartQuote: cartQuote() } : {}) },
      subjects, supersededVariantRefs, products: (()=>{
        const products=new Map((base.runtimeProducts??[]).map(p=>[p.subjectRef,structuredClone(p)]));
        for(const {evidence}of selectionObservations.values()){
          const p=products.get(evidence.productId)??{ref:`product:${evidence.productId}`,subjectRef:evidence.productId};
          const next=mergeSelectionEvidence(p,evidence,input.clock());
          if(!products.has(p.subjectRef)&&products.size>=4)throw Error("PRODUCT_EVIDENCE_BOUND");
          products.set(p.subjectRef,next);
        }return [...products.values()];
      })(), claims: [...base.protectedClaims.filter(c => {
        const claim = c as { type: string; scope: { kind: string; productId?: string; variantId?: string } };
        const replaced = ["PRICE", "STOCK"].includes(claim.type) && active.some(s => claim.scope.kind === "PRODUCT" && claim.scope.productId === s.line.parentProductId &&
          (claim.scope.variantId === s.line.offerId || claim.scope.variantId === `offer:${s.line.parentProductId}:${s.line.offerId}` ||
            // A size-filtered read of the same offer is superseded by the selected line as well.
            (claim.scope.variantId ?? "").startsWith(`offer:${s.line.parentProductId}:${s.line.offerId}:size:`)));
        if(replaced && claim.scope.variantId) supersededVariantRefs.add(claim.scope.variantId);
        return !replaced;
      }), ...selectionClaims],
      // Active shop rules and durable transaction terms have different authority.
      // Never replace a current active-pointer observation with a historical pin.
      policies: policy ? [...base.policyLiterals, (() => {
        const literal=publicPolicyLiteral(policy, input.scope.pageId, input.scope.shopId, input.clock());
        return {...literal,ref:literal.ref.replace("policy:","transaction-policy:"),text:JSON.stringify({
          ...JSON.parse(literal.text),policyBinding:{purpose:current.cart?"COMMITTED_TRANSACTION":"TRANSACTION_PREPARATION",
            policyRef:current.commerceContext?.policyRef??null}})};
      })()] : base.policyLiterals,
      // Reuse the selection readback: a known contradiction invalidates this
      // receipt's current scope; unavailable source data adds no new assertion.
      receipts: [...stateReceipts, ...(receipt && active.length === selections.size ? receiptSequence : [])],
      ...(cart&&receipt&&receiptSequence.length>1&&receiptStateHash===commerceHash(current)&&receiptSequence.every(r=>current.processedCommandIds.includes(r.operationId))?{receiptContinuity:{kind:"UNCHANGED_CART_NEGOTIATION_V1" as const,cartId:cart.cartId,cartVersion:cart.revision,
        stateRevision:receipt!.stateRevision,bindingVersion:turnBinding,recipient:turnRecipient,cartItemsHash:receiptCartItemsHash(cartItems(active)),receiptRefs:receiptSequence.map(r=>r.ref)}}:{}),
      ...(cart ? { cartBinding: { cartId: cart.cartId, cartVersion: cart.revision } } : {}) });
  };
  async function selection(productId: string, a: Record<string, unknown>, lineId: string, offerType: string | null = null, requireColorChoice=false) {
    const query:CartSelectionQuery={ shopAlias: input.scope.shopAlias, productId, offerType,
      size: typeof a.size === "string" ? a.size : null, color: requireColorChoice?null:typeof a.color === "string" ? a.color : null,
      ...(requireColorChoice?{requireColorChoice:true}:{}),
      quantity: typeof a.quantity === "number" ? a.quantity : 1, lineId,selectionMaxAgeSeconds:input.selectionMaxAgeSeconds??1200};
    const result = await input.select(query);
    if(requireColorChoice&&result.status==="READY")throw Error("SELECTION_COLOR_CHOICE_UNPROVED");
    if(result.status!=="READY"&&result.selectionEvidence){
      const e=result.selectionEvidence,now=input.clock();
      if(!validSelectionEvidence(e,productId,now)||normalizeCatalogToken(e.offerType)!==normalizeCatalogToken(offerType??"")||e.quantity!==query.quantity||
        normalizeCatalogToken(e.size??"")!==normalizeCatalogToken(query.size??"")||normalizeCatalogToken(e.color??"")!==normalizeCatalogToken(query.color??""))throw Error("SELECTION_EVIDENCE_SCOPE");
      const expiresAt=new Date(Math.min(Date.parse(e.expiresAt),Date.parse(e.observedAt)+(input.selectionMaxAgeSeconds??1200)*1000,
        policy?.policy.effectiveUntil?Date.parse(policy.policy.effectiveUntil):Infinity)).toISOString();
      const clipped=selectionEvidenceWithExpiry(e,expiresAt,now);
      if(!clipped)throw Error("SELECTION_EVIDENCE_STALE");
      const key=selectionQueryKey(clipped),previous=selectionObservations.get(key);
      if(previous&&(selectionMeaningHash(previous.evidence)!==selectionMeaningHash(clipped)||Date.parse(clipped.observedAt)<Date.parse(previous.evidence.observedAt)))throw Error("SOURCE_EVIDENCE_CONFLICT");
      const bound=previous&&Date.parse(previous.evidence.expiresAt)<=Date.parse(clipped.expiresAt)?previous.evidence:clipped;
      const proposed=input.base.snapshot().runtimeProducts?.find(p=>p.subjectRef===productId)??{ref:`product:${productId}`,subjectRef:productId};
      let checked=proposed;for(const old of selectionObservations.values())if(old.evidence.productId===productId)checked=mergeSelectionEvidence(checked,old.evidence,now);
      mergeSelectionEvidence(checked,bound,now);
      selectionObservations.set(key,{query:previous?.query??query,evidence:bound});
      const choiceResolution=selectionChoiceResolution(bound,now,result.status);
      return {...result,effectCommitted:false,selectionOptions:expandSelectionOptions(bound),selectionEvidence:bound,selectionOptionScope:selectionOptionScope(bound.completeness==="ALL_EXACT_TUPLES_FOR_QUERY"?bound.options.length:Infinity),selectionStatus:result.status,
        ...(choiceResolution?{choiceResolution}:{}),
        ...(choiceResolution?.kind==="SHOP_DATA_MISSING"?{shopDataGap:choiceResolution.reason}: {})};
    }
    if (result.status !== "READY") return { status: result.status, reasonCode: result.reasonCode,
      selectionOptions:(result.selectionOptions??[]).slice(0,8),selectionOptionScope:selectionOptionScope((result.selectionOptions??[]).length),selectionStatus:result.status };
    if (result.shopId !== input.scope.shopId || result.line.parentProductId !== productId ||
      Date.parse(result.sourceObservedAt) > input.clock().getTime() || Date.parse(result.sourceExpiresAt) <= input.clock().getTime()) throw new Error("SELECTION_UNAVAILABLE");
    const line = { ...result.line, lineId }; selections.set(lineId, { ...result, line }); return { ...result, line };
  }
  async function refreshSelections() {
    const lines = current.cart?.value.lines ?? [];
    for (const id of selections.keys()) if (!lines.some(line => line.lineId === id)) selections.delete(id);
    for (const line of lines) {
      const sizes = [...new Set(line.components.map(c => c.size))], colors = [...new Set(line.components.map(c => c.color))];
      try {
        const selected = await selection(line.parentProductId, { size: sizes.length === 1 ? sizes[0] : null, color: colors.length === 1 ? colors[0] : null, quantity: line.quantity }, line.lineId, line.offerId);
        if (selected.status !== "READY") selections.delete(line.lineId);
      }
      catch { selections.delete(line.lineId); }
    }
  }
  function rememberReceipt(next:TrustedContext["effectReceipts"][number],predecessorHash?:string){
    if(receipt&&commerceHash(receipt)===commerceHash(next))return;
    const linesHash=commerceHash(current.cart?.value.lines??null);
    const continuous=receipt&&next.effect==="NEGOTIATION_UPDATED"&&receiptSequence[0]?.effect==="CART_OPENED"&&
      receiptSequence.length<8&&receipt.subjectRef===next.subjectRef&&receipt.stateRevision+1===next.stateRevision&&
      predecessorHash===receiptStateHash&&linesHash===receiptLinesHash;
    receiptSequence=continuous?[...receiptSequence,structuredClone(next)]:[structuredClone(next)];
    receipt=next;receiptStateHash=commerceHash(current);receiptLinesHash=linesHash;
  }
  function recordReceipt(operationId: string, effect: string, expectedRevision: number,predecessorHash?:string) {
    const pendingEffect=effect.startsWith("NEGOTIATION_REQUEST_");
    const subject=pendingEffect?current.pendingNegotiation?.productId:current.cart?.value.cartId;
    const expiresAt=pendingEffect?current.pendingNegotiation?.expiresAt:current.cart?.expiresAt;
    if (current.revision !== expectedRevision || !current.processedCommandIds.includes(operationId) || !subject||!expiresAt || current.stage === "HANDED_OFF") return false;
    rememberReceipt({ ref: `receipt:${operationId}`, operationId, subjectRef: subject, status: "SUCCESS", effect,
      stateRevision: current.revision, recipient: turnRecipient, observedAt: current.updatedAt,
      expiresAt: new Date(Math.min(Date.parse(expiresAt), Date.parse(current.updatedAt) + 300_000)).toISOString() },predecessorHash);
    receiptConversationRevision = authority?.revision ?? input.base.snapshot().state.revision;
    receiptBindingVersion = turnBinding;
    return true;
  }
  function acceptReceipt(recovered: TrustedContext["effectReceipts"][number] | null | undefined, operationId: string, allowed: string[],predecessorHash?:string) {
    const pendingEffect=recovered?.effect.startsWith("NEGOTIATION_REQUEST_");
    const subject=pendingEffect?current.pendingNegotiation?.productId:current.cart?.value.cartId;
    const expiresAt=pendingEffect?current.pendingNegotiation?.expiresAt:current.cart?.expiresAt;
    if (!recovered || recovered.operationId !== operationId || recovered.status !== "SUCCESS" || !allowed.includes(recovered.effect) ||
      !subject||!expiresAt||!current.processedCommandIds.includes(operationId) || recovered.stateRevision !== current.revision || recovered.subjectRef !== subject || recovered.recipient !== turnRecipient ||
      !Number.isFinite(Date.parse(recovered.observedAt)) || !Number.isFinite(Date.parse(recovered.expiresAt)) || Date.parse(recovered.observedAt) > input.clock().getTime() ||
      Date.parse(recovered.expiresAt) <= input.clock().getTime() || Date.parse(recovered.expiresAt) > Date.parse(expiresAt)) return false;
    rememberReceipt(recovered,predecessorHash); receiptConversationRevision = authority?.revision ?? input.base.snapshot().state.revision; receiptBindingVersion = turnBinding;
    return true;
  }
  async function invokeEffect(call: CommerceToolCall): Promise<CommerceToolResult> {
    if (!names.has(call.name)) return input.base.invoke(call);
    if(call.name==="apply_pending_negotiation"||call.name==="cancel_pending_negotiation"){
      const args=toolArgs(call.args,["pendingRef"]);
      if(!args)return {status:"REJECTED",reason:"TOOL_ARGUMENTS",failureStage:"VALIDATION"};
      call={name:"record_negotiation",args:{...args,action:call.name==="apply_pending_negotiation"?"APPLY_PENDING":"CANCEL_PENDING"}};
    }
    let phase:CommerceEffectFailureStage="AUTHORITY";
    const execute = async():Promise<CommerceToolResult> => {
    try { await refreshAuthority(); } catch { return { status: "UNAVAILABLE", reason: "CURRENT_AUTHORITY_UNAVAILABLE" }; }
    const state = snapshot().state;
    if (state.customerStateUpdatePending === true) return { status: "REJECTED", reason: "DEPENDENT_STATE_REJECTED" };
    if (!state.permission || !state.privacyAllowed || state.conversationOwner !== "BOT" || uncertain ||
      state.bindingVersion !== turnBinding || state.recipient !== turnRecipient) return { status: "REJECTED", reason: "PERMISSION_OR_UNKNOWN_COMMIT" };
    let commitAttempted = false;
    try {
      current = await read();
      const authorizedRevision = current.revision;
      const predecessorHash=commerceHash(current);
      phase="VALIDATION";
      const a = toolArgs(call.args, call.name === "add_to_cart" ? ["subjectRef", "offerType", "size", "color", "quantity"] :
        call.name === "change_cart_item" ? ["subjectRef", "action", "quantity", "size", "color", "componentRole", "targetSubjectRef", "offerType"] : call.name === "record_negotiation" ? ["intent","sourceQuote","subjectRef","offerType","action","pendingRef"] : []);
      if (!a) return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
      let negotiationSource: NonNullable<typeof input.negotiationSources>[number] | undefined;
      const supportAction=call.name==="record_negotiation"?(a.action??"RECORD"):null;
      let pendingRecord=false,targetExpiry:string|undefined;
      let pendingActivation:PendingNegotiationV1|undefined;
      let openingReceipt:TrustedContext["effectReceipts"][number]|null=null;
      if(call.name==="record_negotiation"&&supportAction!=="RECORD"){
        if(!["APPLY_PENDING","CANCEL_PENDING"].includes(String(supportAction))||typeof a.pendingRef!=="string"||
          Object.keys(a).some(k=>!["action","pendingRef"].includes(k)))return {status:"REJECTED",reason:"TOOL_ARGUMENTS"};
        const pending=current.pendingNegotiation;
        if(!pending||pending.pendingId!==a.pendingRef)return {status:"REJECTED",reason:"PENDING_NEGOTIATION_INVALID"};
        if(supportAction==="APPLY_PENDING"){
          if(!current.cart||!pending.cartOpeningCommandId||!current.negotiation)return {status:"REJECTED",reason:"PENDING_NEGOTIATION_INVALID"};
          openingReceipt=await input.readReceipt?.(pending.cartOpeningCommandId)??
            (receipt?.operationId===pending.cartOpeningCommandId?receipt:null);
          pendingActivation=pending;
          negotiationSource={text:"",sourceMessageId:pending.sourceMessageId,observedAt:pending.sourceObservedAt};
        }
      }
      if(call.name==="record_negotiation"&&supportAction==="RECORD"){
        const quote=a.sourceQuote;
        if(!["PRICE_OBJECTION","PURCHASE_READY"].includes(String(a.intent))||
          typeof quote!=="string"||!quote.trim()||Buffer.byteLength(quote)>512)return {status:"REJECTED",reason:"NEGOTIATION_SOURCE_OR_CART"};
        const matches=input.negotiationSources?.filter(source=>source.text.includes(quote))??[];
        negotiationSource=matches[0];
        if(matches.length!==1||!negotiationSource?.sourceMessageId||
          negotiationSource.text.indexOf(quote)!==negotiationSource.text.lastIndexOf(quote))return {status:"REJECTED",reason:"NEGOTIATION_SOURCE_OR_CART"};
        if(!current.cart||!current.negotiation){
          const view=input.base.snapshot(),literal=view.policyLiterals.find(p=>p.ref===`offers:${a.subjectRef}`);
          const target=typeof a.subjectRef==="string"&&view.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===a.subjectRef);
          let offers:unknown;try{offers=literal?JSON.parse(literal.text).availableOffers:null;}catch{}
          pendingRecord=a.intent==="PRICE_OBJECTION"&&negotiationSource.sourceMessageId===input.scope.sourceMessageId&&!!target&&
            typeof a.offerType==="string"&&Array.isArray(offers)&&offers.includes(a.offerType)&&!!literal?.expiresAt&&Date.parse(literal.expiresAt)>input.clock().getTime();
          if(pendingRecord)targetExpiry=literal!.expiresAt!;
          else return {status:"REJECTED",reason:"NEGOTIATION_CONTEXT_REQUIRED",data:{
          effectCommitted:false,negotiationStatus:"NOT_EVALUATED",supportAvailability:"UNKNOWN",
          missing:[...(!current.cart?["CART"]:[]),...(!current.negotiation?["NEGOTIATION"]:[])]}};
        }
      }
      if (call.name === "add_to_cart" && (typeof a.offerType !== "string" || !a.offerType.trim())) {
        return { status: "REJECTED", reason: "OFFER_REQUIRED" };
      }
      if (call.name === "change_cart_item") {
        const fields = a.action === "REMOVE_LINE" ? ["subjectRef", "action"] :
          a.action === "REPLACE_LINE" ? ["subjectRef", "action", "targetSubjectRef", "offerType", "quantity", "size", "color"] :
          a.action === "SET_QUANTITY" ? ["subjectRef", "action", "quantity"] :
          a.action === "SET_COMPONENT_VARIANT" ? ["subjectRef", "action", "componentRole", "size", "color"] : null;
        if (!fields || !toolArgs(a, fields)) return { status: "REJECTED", reason: "TOOL_ARGUMENTS" };
        if(a.action==="REPLACE_LINE"&&(typeof a.targetSubjectRef!=="string"||!a.targetSubjectRef.trim()||
          typeof a.offerType!=="string"||!a.offerType.trim()||!Object.hasOwn(a,"color")||
          (a.quantity!==undefined&&(!Number.isInteger(a.quantity)||(a.quantity as number)<1||(a.quantity as number)>20))))
          return {status:"REJECTED",reason:"REPLACEMENT_ARGUMENTS"};
      }
      for (const [field, max] of [["size", 16], ["color", 64], ["offerType", 64]] as const) {
        const value = a[field];
        if (value !== undefined && !(field === "color" && value === null) &&
          (typeof value !== "string" || !value.trim() || Buffer.byteLength(value) > max)) return { status: "REJECTED", reason: "VARIANT_ARGUMENTS" };
      }
      const product = call.name === "add_to_cart" ? state && input.base.snapshot().boundSubjects.find(s => s.kind === "PRODUCT" && s.ref === a.subjectRef) : undefined;
      const line = current.cart?.value.lines.find(l => l.lineId === a.subjectRef);
      if ((call.name === "add_to_cart" && !product) || (call.name === "change_cart_item" && !line)) return { status: "REJECTED", reason: "SUBJECT_REF" };
      const target=call.name==="change_cart_item"&&a.action==="REPLACE_LINE"?
        input.base.snapshot().boundSubjects.find(s=>s.kind==="PRODUCT"&&s.ref===a.targetSubjectRef):undefined;
      if(call.name==="change_cart_item"&&a.action==="REPLACE_LINE"&&!target)return {status:"REJECTED",reason:"SUBJECT_REF"};
      const effect = call.name === "confirm_purchase" ? "PURCHASE_CONFIRMATION" : current.cart ? "CART_MUTATION" : "CART_OPEN";
      phase="AUTHORITY";
      if (!await input.authorize(effect, current)) return { status: "REJECTED", reason: "EFFECT_PERMISSION" };
      const operationId = commerceHash({ pageId: input.scope.pageId, conversationId: input.scope.conversationId,
        sourceMessageId: negotiationSource?.sourceMessageId ?? input.scope.sourceMessageId, tool: call.name,
        ...(pendingRecord?{pendingAction:"RECORD",productId:a.subjectRef,offerId:a.offerType,episodeId:input.identity.salesEpisodeId}:
          supportAction==="APPLY_PENDING"||supportAction==="CANCEL_PENDING"?{pendingAction:supportAction,pendingRef:a.pendingRef,cartId:current.cart?.value.cartId??null}:call.name==="record_negotiation"?{}:{args:a}) });
      const effectName = pendingRecord?"NEGOTIATION_REQUEST_RECORDED":supportAction==="CANCEL_PENDING"?"NEGOTIATION_REQUEST_INVALIDATED":call.name==="record_negotiation"?"NEGOTIATION_UPDATED":call.name === "confirm_purchase" ? "PURCHASE_CONFIRMED" : effect === "CART_OPEN" ? "CART_OPENED" : "CART_MUTATED";
      if (current.processedCommandIds.includes(operationId)) {
        if(pendingRecord){
          // Only the very same source event can reuse this request. A later customer
          // message keeps its own operation identity, even for the same product.
          phase="SOURCE";policy=await input.policy();
          publicPolicyLiteral(policy,input.scope.pageId,input.scope.shopId,input.clock());
          const pending=current.pendingNegotiation,proof=preCartSupportEvidence({subjectRef:String(a.subjectRef),offerType:String(a.offerType)},policy.policy);
          if(!proof||!pending||pending.sourceMessageId!==negotiationSource!.sourceMessageId||
            pending.sourceTextHash!==commerceHash(negotiationSource!.text)||pending.sourceObservedAt!==negotiationSource!.observedAt)
            return {status:"REJECTED",reason:"PENDING_NEGOTIATION_INVALID"};
          // Read-only reuse is not a new effect or a receipt for this turn.
          return {status:"OK",data:{duplicate:true,pendingReused:true,effectCommitted:false,pendingSupport:pendingSupportView()}};
        }
        const recovered = receipt?.operationId === operationId ? receipt : await input.readReceipt?.(operationId);
        const allowed = call.name==="record_negotiation"?[effectName]:call.name === "confirm_purchase" ? ["PURCHASE_CONFIRMED"] : call.name === "change_cart_item" ? ["CART_MUTATED"] : ["CART_OPENED", "CART_MUTATED"];
        if (!acceptReceipt(recovered, operationId, allowed)) return { status: "REJECTED", reason: "NOT_A_SUCCESS_RECEIPT" };
        await refreshSelections();
        // The replayed receipt names the effect that actually committed (a cart may have been opened by this very command).
        return { status: "OK", data: { ...effectData(operationId,recovered!.effect,pendingRecord), duplicate: true } };
      }
      if(supportAction==="APPLY_PENDING"&&!openingReceipt)return {status:"REJECTED",reason:"PENDING_NEGOTIATION_CART_RECEIPT"};
      if(supportAction==="APPLY_PENDING"&&!receipt&&openingReceipt)
        acceptReceipt(openingReceipt,openingReceipt.operationId,["CART_OPENED"]);
      phase="SOURCE";policy = await input.policy();
      publicPolicyLiteral(policy, input.scope.pageId, input.scope.shopId, input.clock());
      const policyRef = { id: policy.policy.policyBundleId, version: policy.policy.policyVersion, contentHash: computeBusinessContentHash(policy.policy) };
      let draft: ResolvedCartDraftV1 | null = null, mutation: CanonicalCartMutationV2 | null = null;
      let command: SalesCycleCommand;
      if (call.name === "add_to_cart") {
        if (a.quantity !== undefined && (!Number.isInteger(a.quantity) || (a.quantity as number) < 1 || (a.quantity as number) > 20)) return { status: "REJECTED", reason: "QUANTITY" };
        const result = await selection(product!.ref, a, commerceUuid(operationId), a.offerType as string);
        if (result.status !== "READY") return { status: "UNAVAILABLE", reason: "SELECTION_UNAVAILABLE", data: result };
        const selected = result.line;
        if (!current.cart) {
          draft = { identity: input.identity, lines: [selected], shopId: input.scope.shopId, policyRef };
          command = { kind: "CART_OPENED", commandId: operationId, cartDraftRef: { id: operationId, version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(input.clock().getTime()+1_800_000).toISOString() };
        } else mutation = { kind: "ADD_LINE", line: selected };
      } else if (call.name === "change_cart_item") {
        if (a.action === "REPLACE_LINE") {
          const changedScope=target!.ref!==line!.parentProductId||normalizeCatalogToken(a.offerType as string)!==normalizeCatalogToken(line!.offerId);
          const requireColorChoice=changedScope&&a.color==="__NO_COLOR__";
          const selected = await selection(target!.ref,{...a,quantity:a.quantity??line!.quantity},line!.lineId,a.offerType as string,requireColorChoice);
          if (selected.status !== "READY") return {status:"UNAVAILABLE",reason:"SELECTION_UNAVAILABLE",data:selected};
          if (normalizeCatalogToken(selected.line.offerId) !== normalizeCatalogToken(a.offerType as string) ||
            selected.line.quantity !== (a.quantity??line!.quantity) ||
            (typeof a.size==="string"&&selected.line.components.some(c=>normalizeCatalogToken(c.size??"")!==normalizeCatalogToken(a.size as string))) ||
            (typeof a.color==="string"&&selected.line.components.some(c=>normalizeCatalogToken(c.color??"")!==normalizeCatalogToken(a.color as string))))
            return {status:"REJECTED",reason:"REPLACEMENT_SELECTION_SCOPE"};
          mutation = {kind:"REPLACE_LINE",lineId:line!.lineId,line:selected.line};
        }
        else if (a.action === "REMOVE_LINE") mutation = { kind: "REMOVE_LINE", lineId: line!.lineId };
        else if (a.action === "SET_QUANTITY" && Number.isInteger(a.quantity) && (a.quantity as number) > 0 && (a.quantity as number) <= 20) mutation = { kind: "SET_QUANTITY", lineId: line!.lineId, quantity: a.quantity as number };
        else if (a.action === "SET_COMPONENT_VARIANT" && (typeof a.size === "string" || typeof a.color === "string")) {
          const component = line!.components.find(c => c.componentRole === a.componentRole);
          if (!component) return { status: "REJECTED", reason: "COMPONENT_REF" };
          const result = await selection(line!.parentProductId, { ...a, size: a.size ?? component.size, color: a.color ?? component.color, quantity: line!.quantity }, line!.lineId, line!.offerId);
          if (result.status !== "READY") return { status: "UNAVAILABLE", reason: "SELECTION_UNAVAILABLE", data: result };
          const selected = result.line;
          const variant = selected.components.find(c => c.componentProductId === component.componentProductId);
          if (!variant || variant.size === null || normalizeCatalogToken(variant.size) !== normalizeCatalogToken(String(a.size ?? component.size ?? "")) ||
            normalizeCatalogToken(variant.color ?? "") !== normalizeCatalogToken(String(a.color ?? component.color ?? ""))) return { status: "REJECTED", reason: "VARIANT_UNAVAILABLE" };
          mutation = { kind: "SET_COMPONENT_VARIANT", lineId: line!.lineId, componentProductId: component.componentProductId,
            componentSku: variant.componentSku, size: variant.size!, color: variant.color };
        } else return { status: "REJECTED", reason: "MUTATION_ARGUMENTS" };
      }
      if (mutation) command = { kind: "CART_MUTATED", commandId: operationId, expectedCartVersion: current.cart!.value.revision,
        mutationRef: { id: operationId, version: "1", contentHash: computeBusinessContentHash({ mutation }) }, mutationReasonCode: mutation.kind === "REPLACE_LINE" ? "LINE_REPLACED" : mutation.kind === "ADD_LINE" ? "LINE_ADDED" : mutation.kind === "REMOVE_LINE" ? "LINE_REMOVED" : mutation.kind === "SET_COMPONENT_VARIANT" ? "VARIANT_CHANGED" : "QUANTITY_CHANGED" };
      else if (call.name === "confirm_purchase") command = { kind: "CONFIRM_PURCHASE", commandId: operationId,
        intent: { source: "MODEL_STRUCTURED_OUTPUT", intent: "PURCHASE_CONFIRMATION", sourceMessageId: input.scope.sourceMessageId } };
      else if(call.name==="record_negotiation"){
        if(pendingRecord){
          const at=input.clock();
          const pending=PendingNegotiationV1Schema.parse({schemaVersion:1,pendingId:"0".repeat(64),sourceMessageId:negotiationSource!.sourceMessageId,
            sourceTextHash:commerceHash(negotiationSource!.text),sourceObservedAt:negotiationSource!.observedAt,
            productId:a.subjectRef,offerId:a.offerType,salesEpisodeId:input.identity.salesEpisodeId,customerProfileId:input.identity.customerProfileId,
            policyRef:{id:policy.policy.policyBundleId,version:policy.policy.policyVersion,contentHash:computeBusinessContentHash(policy.policy)},
            recordedAt:at.toISOString(),expiresAt:new Date(Math.min(Date.parse(targetExpiry!),Date.parse(negotiationSource!.observedAt)+CART_TTL_MS_V1)).toISOString(),
            status:"PENDING",cartOpeningCommandId:null,activatedByCartId:null});
          pending.pendingId=createHash("sha256").update(pendingNegotiationIdPreimageV1(pending)).digest("hex");
          command={kind:"PENDING_NEGOTIATION_RECORDED",commandId:operationId,pending};
        }else if(supportAction==="CANCEL_PENDING")command={kind:"PENDING_NEGOTIATION_INVALIDATED",commandId:operationId,pendingId:String(a.pendingRef),sourceMessageId:input.scope.sourceMessageId};
        else command={kind:"NEGOTIATION_EVENT",commandId:operationId,expectedNegotiationVersion:current.negotiation!.stateVersion,
          sourceMessageId:negotiationSource!.sourceMessageId,intent:pendingActivation?"PRICE_OBJECTION":a.intent as "PRICE_OBJECTION"|"PURCHASE_READY",
          reasonCode:pendingActivation||a.intent==="PRICE_OBJECTION"?"PRICE_OBJECTION":null,
          ...(pendingActivation?{pendingId:pendingActivation.pendingId,cartOpeningCommandId:pendingActivation.cartOpeningCommandId!}:{})};
      }
      const ports: SalesCycleTrustedPortsV1 = {
        resolveCartCreationReceipt:id=>openingReceipt&&openingReceipt.operationId===id&&openingReceipt.effect==="CART_OPENED"&&
          openingReceipt.status==="SUCCESS"&&openingReceipt.recipient===turnRecipient&&Date.parse(openingReceipt.expiresAt)>input.clock().getTime()?
          {commandId:id,cartId:openingReceipt.subjectRef,stateRevision:openingReceipt.stateRevision,observedAt:openingReceipt.observedAt}:null,
        resolveCartDraft: r => draft && r.contentHash === computeBusinessContentHash(draft) ? draft : null,
        resolveCartMutation: r => mutation && r.contentHash === computeBusinessContentHash({ mutation }) ? { mutation } : null,
        resolveShopPolicy: r => policy && r.contentHash === computeBusinessContentHash(policy.policy) ? policy.policy : null,
        resolveInboundMessage: id => negotiationSource?.sourceMessageId === id ? { messageId:id,pageId:input.scope.pageId,
          conversationId:input.scope.conversationId,senderType:"CUSTOMER",observedAt:negotiationSource.observedAt,attachments:[] }
          : input.trustedPorts?.resolveInboundMessage(id) ?? null,
        revalidateCheckout: q => input.trustedPorts?.revalidateCheckout(q) ?? null,
      };
      let result, reconciledRevision: number | undefined;
      const repository: SalesCycleStateRepositoryV1 = { read: key => input.repository.read(key),
        compareAndSwap: update => update.expectedRevision === authorizedRevision
          ? input.repository.compareAndSwap(update) : Promise.resolve(false) };
      phase="AUTHORITY";await refreshAuthority();
      const permission=snapshot().state;
      if(!permission.permission||!permission.privacyAllowed||permission.conversationOwner!=="BOT"||
        permission.recipient!==turnRecipient||permission.bindingVersion!==turnBinding||!await input.authorize(effect,current))
        return {status:"REJECTED",reason:"EFFECT_PERMISSION"};
      phase="SOURCE";
      if(mutation?.kind==="REPLACE_LINE"){
        const target=selections.get(mutation.lineId);
        if(!target||Date.parse(target.sourceExpiresAt)<=input.clock().getTime())return {status:"UNAVAILABLE",reason:"SELECTION_UNAVAILABLE"};
      }
      phase="COMMIT_UNKNOWN";
      try { commitAttempted = true; result = input.executeCommand
        ? await input.executeCommand({ command: command!, expectedRevision: authorizedRevision,
          conversationRevision: authority?.revision ?? input.scope.revision,
          bindingVersion: authority?.bindingVersion ?? input.scope.bindingVersion, trustedPorts: ports, policy })
        : await executePersistedSalesCycleCommand({ repository, conversationKey: input.conversationKey,
        command: command!, now: input.clock(), trustedPorts: ports,
        ...(input.resolveBankTransferPolicy ? { resolveBankTransferPolicy: input.resolveBankTransferPolicy } : {}) }); }
      catch (error) { if(error instanceof CommerceEffectCommitError)phase=error.stage;
        current = await read(); await refreshAuthority();
        const proved = input.executeCommand && input.readReceipt ? acceptReceipt(await input.readReceipt(operationId), operationId, [effectName],predecessorHash) : recordReceipt(operationId, effectName, authorizedRevision+1,predecessorHash);
        if (!proved) { uncertain = true; return { status: "UNAVAILABLE", reason: "UNKNOWN_COMMIT" }; }
        reconciledRevision = current.revision;
      }
      if (result?.status === "CHECKOUT_REQUESTED") {
        current = await read(); await refreshAuthority();
        if (call.name !== "confirm_purchase" || current.confirmation !== null ||
            current.clarification?.reasonCode !== "CHECKOUT_DETAILS_MISSING" ||
            current.revision !== authorizedRevision+1 || !current.processedCommandIds.includes(operationId) ||
            commerceHash(current) !== commerceHash(result.state)) {
          uncertain = true; return { status: "UNAVAILABLE", reason: "CHECKOUT_COMMIT_UNPROVED" };
        }
        committedTerminal = { reason: "CHECKOUT_DETAILS_MISSING", disposition: "NO_SEND", revision: current.revision,
          operationId, conversationRevision: authority?.revision ?? input.scope.revision };
        receipt = undefined;
        return { status: "OK", data: { checkoutRequested: true, purchaseConfirmed: false, externalOrderCreated: false } };
      }
      if (result?.status === "HANDOFF") {
        current = await read(); await refreshAuthority();
        if (current.stage !== "HANDED_OFF" || current.revision !== authorizedRevision+1 ||
          !current.processedCommandIds.includes(operationId) || commerceHash(current) !== commerceHash(result.state)) {
          uncertain = true; return { status: "UNAVAILABLE", reason: "HANDOFF_COMMIT_UNPROVED" };
        }
        committedTerminal = { reason: result.reasonCode, revision: current.revision, operationId,
          conversationRevision: authority?.revision ?? input.scope.revision };
        receipt = undefined;
        return { status: "OK", data: { handoffAccepted: true } };
      }
      if (result && !["APPLIED", "DUPLICATE"].includes(result.status)) return { status: "REJECTED", reason: "reasonCode" in result ? result.reasonCode : result.status,
        failureStage:result.status==="CONFLICT"?"CAS":"failureStage" in result?result.failureStage??"DOMAIN":"DOMAIN" };
      phase="READBACK";
      current = await read();
      await refreshAuthority();
      const expectedReceiptRevision=result?.status==="APPLIED"&&input.executeCommand?result.state.revision:authorizedRevision+1;
      const proved=reconciledRevision!==undefined?current.revision===reconciledRevision:input.executeCommand
        ? current.revision===expectedReceiptRevision&&acceptReceipt(await input.readReceipt?.(operationId),operationId,[effectName],predecessorHash)
        : recordReceipt(operationId,effectName,expectedReceiptRevision,predecessorHash);
      if(!proved){uncertain=true;return {status:"UNAVAILABLE",reason:"RECEIPT_UNAVAILABLE"};}
      await refreshSelections();
      if (result?.status === "APPLIED" && result.transferToHuman) committedTerminal = {
        reason: "PURCHASE_CONFIRMED", revision: current.revision, operationId, conversationRevision: authority?.revision ?? input.scope.revision };
      return { status: "OK", data: effectData(operationId,effectName,pendingRecord) };
    } catch { if (commitAttempted) uncertain = true; return { status: "UNAVAILABLE", reason: "COMMERCE_UNAVAILABLE" }; }
    };
    const result=await execute();
    return result.status==="OK"?result:{...result,failureStage:result.failureStage??phase};
  }
  /**
   * The cart this add_to_cart just opened carries a stored support request: evaluate it now through the existing
   * activation command (authority, source, CAS, opening receipt and its own receipt are all checked there).
   * The opening stays a success whatever the evaluation returns; an unproved second commit blocks the turn
   * through the same UNKNOWN_COMMIT gate as any other effect.
   */
  async function evaluateStoredSupport(opened: CommerceToolResult, requested: {pendingRef:string}|undefined): Promise<CommerceToolResult> {
    const {pendingSupport:_stale,...data}=opened.data as Record<string,unknown>;
    const notEvaluated=(reason:string):CommerceToolResult=>{const pendingSupport=pendingSupportView();
      return {status:"OK",data:{...data,cartItems:cartItems(),cartQuote:cartQuote(),
        supportEvaluation:{status:"NOT_EVALUATED",evaluatedBy:"CODE_AT_CART_OPENING",negotiationApplied:false,reason},...(pendingSupport?{pendingSupport}:{})}};};
    const view=pendingSupportView();
    if(!view||view.pendingRef!==requested?.pendingRef||!view.canApply)return notEvaluated("REQUEST_DIFFERS_FROM_CART");
    const grandTotalBeforeVnd=current.cart?.value.grandTotalVnd??null;
    const applied=await invokeEffect({name:"apply_pending_negotiation",args:{pendingRef:view.pendingRef}});
    if(uncertain)return applied.status==="OK"?{status:"UNAVAILABLE",reason:"UNKNOWN_COMMIT"}:applied;
    if(applied.status!=="OK")return notEvaluated(applied.reason??"SUPPORT_EVALUATION_UNAVAILABLE");
    const after=applied.data as {operationId?:unknown;cart?:unknown;cartItems?:unknown;cartQuote?:unknown};
    return {status:"OK",data:{...data,cart:after.cart,cartItems:after.cartItems,cartQuote:after.cartQuote,
      supportEvaluation:{status:"EVALUATED",evaluatedBy:"CODE_AT_CART_OPENING",negotiationApplied:true,supportOperationId:after.operationId,
        grandTotalBeforeVnd,grandTotalAfterVnd:current.cart?.value.grandTotalVnd??null}}};
  }
  async function invoke(call: CommerceToolCall): Promise<CommerceToolResult> {
    const stored=input.evaluateStoredSupportAtCartOpening===true&&call.name==="add_to_cart"&&!current.cart?pendingSupportView():undefined;
    let result = await invokeEffect(call);
    if(stored&&result.status==="OK"&&(result.data as {effect?:unknown;duplicate?:unknown}|undefined)?.effect==="CART_OPENED"&&
      (result.data as {duplicate?:unknown}).duplicate!==true&&!uncertain)result=await evaluateStoredSupport(result,stored);
    if(call.name==="record_negotiation"&&["NEGOTIATION_CONTEXT_REQUIRED","NEGOTIATION_SOURCE_OR_CART"].includes(result.reason??"")&&result.failureStage==="VALIDATION"&&!uncertain&&
      ((call.args as {action?:unknown}|null)?.action??"RECORD")==="RECORD"){
      result.data={...(result.data as Record<string,unknown>|undefined),effectCommitted:false,...(pendingSupportView()?{pendingSupport:pendingSupportView()}: {})};
      noCommitNegotiations.set(result,{state:commerceHash(current),authority:commerceHash(authority??input.scope)});
    }
    const data=result.data as {effectCommitted?:boolean;choiceResolution?:{kind?:string}}|undefined;
    if(["add_to_cart","change_cart_item"].includes(call.name)&&result.status==="UNAVAILABLE"&&result.reason==="SELECTION_UNAVAILABLE"&&
      result.failureStage==="SOURCE"&&data?.effectCommitted===false&&data.choiceResolution?.kind==="NEEDS_CUSTOMER_CHOICE"&&!uncertain)
      noCommitSelections.set(result,{state:commerceHash(current),authority:commerceHash(authority??input.scope)});
    if (names.has(call.name) && result.status !== "OK") failedEffect = true;
    return result;
  }
  // Establish current evidence before the owner/verifier sees this turn, including existing carts on later turns.
  await refreshSelections();
  function preCartSupportEvidence(target:{subjectRef:string;offerType:string},quotePolicy:RuntimePolicyBundle["policy"]){
      const pending=current.pendingNegotiation,at=input.clock().getTime();
      if(uncertain||current.cart||current.negotiation||!pending||pending.status!=="PENDING"||pending.cartOpeningCommandId!==null||pending.activatedByCartId!==null||
        pending.productId!==target.subjectRef||pending.offerId!==target.offerType||pending.salesEpisodeId!==input.identity.salesEpisodeId||
        pending.customerProfileId!==input.identity.customerProfileId||pending.policyRef.id!==quotePolicy.policyBundleId||pending.policyRef.version!==quotePolicy.policyVersion||
        pending.policyRef.contentHash!==computeBusinessContentHash(quotePolicy)||!Number.isFinite(at)||Date.parse(pending.expiresAt)<=at||
        Date.parse(pending.recordedAt)>at||Date.parse(pending.sourceObservedAt)>at||
        pending.pendingId!==createHash("sha256").update(pendingNegotiationIdPreimageV1(pending)).digest("hex"))return null;
      return {pendingRef:pending.pendingId,sourceMessageId:pending.sourceMessageId,sourceObservedAt:pending.sourceObservedAt,expiresAt:pending.expiresAt};
  }
  return { invoke, snapshot,preCartSupportEvidence,
    async preparePendingSelections(admit,control){
    const state=input.base.snapshot().state;
    if(!state.permission||!state.privacyAllowed||state.conversationOwner!=="BOT"||state.bindingVersion!==turnBinding||state.recipient!==turnRecipient)return 0;
    const pending=state.pendingPurchase as {lines:import("./single-agent-commerce-read-only.js").PendingPurchaseLine[]}|undefined;
    const lines=pending?.lines??[],max=control?.maxCalls??6;
    if(!Number.isSafeInteger(max)||max<0||max>6||lines.length>max)throw Error("PREPARATION_BUDGET");
    const saved=new Map(selectionObservations),savedSelections=new Map(selections);
    try{
      for(const [index,line]of lines.entries()){
        control?.onDispatch();
        const lineId=commerceUuid(commerceHash({pendingRead:line,index}));
        await selection(line.productId,{size:line.size,color:line.color,quantity:line.quantity},lineId,line.offerType,line.missing==="COLOR");
        selections.delete(lineId); // This was a source read, never an active cart selection.
      }
      if(lines.length&&admit&&!admit(snapshot(),{chargedUnits:lines.length,kind:"FINAL"}))throw Error("PREPARATION_ADMISSION");
      return lines.length;
    }catch(error){selectionObservations.clear();for(const [key,value]of saved)selectionObservations.set(key,value);
      selections.clear();for(const [key,value]of savedSelections)selections.set(key,value);throw error;}
  }, noCommitNegotiationResult(result){
    const proof=noCommitNegotiations.get(result),s=snapshot().state;
    return !!proof&&!uncertain&&s.permission&&s.privacyAllowed&&s.conversationOwner==="BOT"&&s.bindingVersion===turnBinding&&s.recipient===turnRecipient&&
      proof.state===commerceHash(current)&&proof.authority===commerceHash(authority??input.scope);
  },uncommittedSelectionResult(result){
    const proof=noCommitSelections.get(result),s=snapshot().state;
    return !!proof&&!uncertain&&s.permission&&s.privacyAllowed&&s.conversationOwner==="BOT"&&s.bindingVersion===turnBinding&&s.recipient===turnRecipient&&
      proof.state===commerceHash(current)&&proof.authority===commerceHash(authority??input.scope);
  },unlabelledCartProducts(context){
    const cart=current.cart,at=input.clock().getTime();
    if(!cart||Date.parse(cart.expiresAt)<=at||context.cartBinding?.cartId!==cart.value.cartId||context.cartBinding.cartVersion!==cart.value.revision||
      context.state.revision!==current.revision||commerceHash(context.state.cartItems)!==commerceHash(cartItems())||!context.state.permission||!context.state.privacyAllowed||context.state.conversationOwner!=='BOT'||context.state.bindingVersion!==turnBinding||context.state.recipient!==turnRecipient)return [];
    const active=activeSelections();return [...new Set(cart.value.lines.map(l=>l.parentProductId))].filter(id=>cart.value.lines.filter(l=>l.parentProductId===id).every(l=>{
      const s=active.find(s=>selectionsMatchCartLines([l],[s]));return l.components.length>0&&l.components.every(c=>c.color==='__NO_COLOR__')&&!!s&&
        s.line.components.length>0&&s.line.components.every(c=>c.color==='__NO_COLOR__')&&Date.parse(s.sourceObservedAt)<=at&&Date.parse(s.sourceExpiresAt)>at;
    }));
  }, ...(input.base.sizeOutcome ? {sizeOutcome: input.base.sizeOutcome} : {}), terminalOutcome, async invokeBatch(calls) {
    const independent = calls.filter(c => !names.has(c.name) && c.name !== "quote_cart");
    const results = new Map<CommerceToolCall, CommerceToolResult>();
    const readResults = await input.base.invokeBatch(independent); independent.forEach((c, i) => results.set(c, readResults[i]!));
    const stateRejected = independent.some(c => c.name === "apply_customer_state" && results.get(c)!.status !== "OK");
    for (const c of calls.filter(c => names.has(c.name))) results.set(c, stateRejected ? { status: "REJECTED", reason: "DEPENDENT_STATE_REJECTED" } : await invoke(c));
    const effectRejected = calls.some(c => names.has(c.name) && results.get(c)!.status !== "OK");
    for (const c of calls.filter(c => c.name === "quote_cart")) results.set(c, effectRejected ? { status: "REJECTED", reason: "DEPENDENT_EFFECT_REJECTED" } : await input.base.invoke(c));
    return calls.map(c => results.get(c)!);
  }, async readback() { await input.base.readback(); current = await read(); await refreshAuthority(); if (policy) policy = await input.policy();
    for(const {query,evidence}of [...selectionObservations.values()]){
      const replay=await input.select(query);
      const next=replay.status!=="READY"?replay.selectionEvidence:undefined;
      if(!next||!validSelectionEvidence(next,evidence.productId,input.clock())||!validSelectionEvidence(evidence,evidence.productId,input.clock())||
        Date.parse(next.observedAt)<Date.parse(evidence.observedAt)||Date.parse(next.expiresAt)<Date.parse(evidence.expiresAt)||
        selectionMeaningHash(next)!==selectionMeaningHash(evidence)||
        (policy?.policy.effectiveUntil&&Date.parse(policy.policy.effectiveUntil)<Date.parse(evidence.expiresAt)))throw Error("SELECTION_EVIDENCE_CHANGED");
    }
    await refreshSelections();
    return snapshot(); },
  publicCartSummary:()=>publicSummary,
  async recover(outcome: TerminalOutcome) {
    publicSummary=undefined;
    if (outcome.disposition === "NO_SEND") return outcome;
    const handoff = await terminalOutcome(); if (handoff) return handoff;
    if (input.base.snapshot().state.customerStateUpdatePending === true) return outcome;
    if (receipt && failedEffect) return { disposition: "HANDOFF", reason: uncertain ? "UNKNOWN_COMMIT" : "PARTIAL_EFFECT", text: null, fallbackId: null };
    if (!receipt) return uncertain ? { disposition: "HANDOFF", reason: "UNKNOWN_COMMIT", text: null, fallbackId: null } : outcome;
    await input.base.readback(); await refreshSelections();
    let recoveryPolicy: RuntimePolicyBundle | null = null;
    try { recoveryPolicy = await input.policy(); } catch { /* A proved receipt can still acknowledge the commit without a current quote. */ }
    current = await read(); await refreshAuthority(); const world = snapshot();
    if (!world.effectReceipts.some(r => r.ref === receipt!.ref) || !world.state.permission || !world.state.privacyAllowed || world.state.conversationOwner !== "BOT" ||
      world.state.recipient !== receipt.recipient || world.state.conversationRevision !== receiptConversationRevision || world.state.bindingVersion !== receiptBindingVersion ||
      current.revision !== receipt.stateRevision || !current.processedCommandIds.includes(receipt.operationId) || Date.parse(receipt.expiresAt) <= input.clock().getTime()) return { disposition: "NO_SEND", reason: "RECOVERY_SCOPE_CHANGED", text: null, fallbackId: null };
    const cart = current.cart!.value;
    const cartAck = `Giỏ của chị: ${cart.lines.map(line => {
      // Prefer the exact component title when present. Never manufacture it from a parent set's name.
      const component = line.components.length === 1 ? line.components[0] : undefined;
      const componentName = component && world.runtimeProducts?.find(p => p.subjectRef === component.componentProductId)?.content?.productName;
      if (component && componentName?.trim() && (line.offerKind === "DIRECT" || line.offerKind === "COMPONENT")) {
        return `${line.quantity} ${componentName}${component.color ? ` màu ${component.color.toLocaleLowerCase("vi-VN")}` : ""}${component.size ? `, size ${component.size}` : ""}`;
      }
      const product = world.runtimeProducts?.find(p => p.subjectRef === line.parentProductId);
      return formatCartLineSelection(line, product?.content ? { productId: product.subjectRef, title: product.content.productName } : undefined);
    }).join("; ")}.`;
    let summary = "";
    const active = activeSelections(), now = input.clock();
    const policyRef = current.commerceContext?.policyRef;
    if (recoveryPolicy && policyRef?.id === recoveryPolicy.policy.policyBundleId && policyRef.version === recoveryPolicy.policy.policyVersion &&
      policyRef.contentHash === computeBusinessContentHash(recoveryPolicy.policy) &&
      selectionsMatchCartLines(cart.lines, active) && active.every(s => Date.parse(s.sourceObservedAt) <= now.getTime() && Date.parse(s.sourceExpiresAt) > now.getTime()) &&
      Date.parse(current.cart!.expiresAt) > now.getTime() && cart.grandTotalVnd !== null && cart.shippingFeeVnd !== null) {
      try {
        publicPolicyLiteral(recoveryPolicy, input.scope.pageId, input.scope.shopId, now);
        summary = (receipt.effect === "NEGOTIATION_UPDATED" && cart.discountTotalVnd !== null && cart.discountTotalVnd > 0 ? ` Ưu đãi ${cart.discountTotalVnd.toLocaleString("vi-VN")}đ.` : "") +
          ` Tổng ${cart.grandTotalVnd.toLocaleString("vi-VN")}đ, đã gồm phí giao hàng.` +
          (active.some(s => s.stockStatus === "PRE_ORDER") ? " Có món đặt trước, chị nhé." : "");
      } catch { /* No fresh policy means no current money or stock assertion. */ }
    }
    if(summary && receipt.effect!=="PURCHASE_CONFIRMED")publicSummary={cartId:cart.cartId,cartVersion:cart.revision,
      ...(receipt.effect==="NEGOTIATION_UPDATED"&&cart.discountTotalVnd!==null&&cart.discountTotalVnd>0?{discountTotalVnd:cart.discountTotalVnd}:{}),grandTotalVnd:cart.grandTotalVnd};
    return { disposition: "SEND_ELIGIBLE", reason: summary && receipt.effect !== "PURCHASE_CONFIRMED" ? "RECEIPT_BACKED_CART_SUMMARY" : "RECEIPT_BACKED_ACK", text: receipt.effect === "PURCHASE_CONFIRMED"
      ? "Shop đã nhận xác nhận mua hàng của chị." : receipt.effect === "CART_OPENED"
        ? "Em đã thêm món chị chọn vào giỏ." + summary : receipt.effect === "NEGOTIATION_UPDATED" && summary
          ? `${summary.trim()} ${cartAck}` : cartAck + summary, fallbackId: null };
  } };
}
