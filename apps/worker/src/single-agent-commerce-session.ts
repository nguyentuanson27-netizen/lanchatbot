import { randomUUID } from "node:crypto";
import { createSalesCycleRuntimeState, type RuntimePolicyResolution, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1, type VerifiedInboundMessageV1 } from "@lana/chat-runtime";
import { applySilentHandoff } from "@lana/conversation-engine";
import { HandoffMatrixAdminContentV1Schema, HandoffReasonV2Schema } from "@lana/contracts";
import type { PostgresRealtimeRuntimeStore, RealtimeCommitInput, RealtimeInboxBatchGuard } from "@lana/database";
import { buildCanonicalDecisionEvidenceV1, evaluateDeterministicEffectReadinessV1 } from "@lana/business-tools";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { CommerceScope } from "./single-agent-commerce-read-only-tools.js";
import type { HandoffAuthority } from "./single-agent-commerce-handoff.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { createPersistedCommerceReceiptReader, prepareNativeCommerceTransition } from "./single-agent-commerce-persistence.js";
import { evaluateRealtimeSalesCycle, type RealtimeSalesCycleOutput, type RealtimeSalesCycleInput } from "./realtime-sales-cycle.js";
import type { createCommerceEffectTools, CommerceCommandResult } from "./single-agent-commerce-effects.js";

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
}) {
  const { scope } = input;
  let outboxMessages = 0;
  const repository: SalesCycleStateRepositoryV1 = {
    async read(key) {
      if (key !== scope.conversationId) throw new Error("COMMERCE_SCOPE");
      const row = await input.store.loadOrCreateSalesCycle(scope.pageId, key,
        () => createSalesCycleRuntimeState(key, { pageId: scope.pageId, conversationId: key }, input.clock()), input.clock());
      if (row.state.routing.pageId !== scope.pageId || row.state.routing.conversationId !== key || row.state.revision !== row.stateRevision) throw new Error("COMMERCE_SCOPE");
      return row.state;
    }, async compareAndSwap() { throw new Error("USE_CURRENT_SOURCE_EXECUTOR"); },
  };
  const source = (state: SalesCycleRuntimeState, authority: HandoffAuthority, policyResolution: RuntimePolicyResolution) => ({
    pageId: scope.pageId, conversationId: scope.conversationId, customerHash: scope.customerHash, state, stateRevision: state.revision,
    checkoutCollection: "SINGLE_FIELD" as const,
    conversationRevision: authority.stateVersion, text: input.latest, messageId: scope.sourceMessageId, eventKey: scope.sourceMessageId,
    senderId: scope.customerHash, occurredAt: scope.sourceObservedAt!, attachmentIds: input.attachmentIds ?? [],
    ...(input.paymentReceiptInbound ? {paymentReceiptInbound: input.paymentReceiptInbound} : {}), productId: state.cart?.value.lines[0]?.parentProductId ?? null,
    offerType: null, size: null, color: null, shopAlias: scope.shopAlias, policyResolution, facts: input.facts, ...(input.productNames ? { productNames: input.productNames } : {}), now: input.clock(), effectNow: input.clock,
  });
  const matches = (a: HandoffAuthority) => a.pageId === scope.pageId && a.customerHash === scope.customerHash && a.conversationId === scope.conversationId &&
    a.state.conversationId === scope.conversationId && a.bindingVersion === scope.bindingVersion && a.recipient === scope.recipient &&
    a.permission && a.privacyAllowed && a.state.conversationOwner === "BOT" && a.state.routingOwner === "APP";
  async function commit(output: RealtimeSalesCycleOutput, authority: HandoffAuthority, terminal: boolean, resolution: RuntimePolicyResolution) {
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
    const messages = terminal && !silentTransfer ? output.messages : [];
    const tag = transfer ? output.desiredTag ?? "NHAN_VIEN" : null, tagId = tag ? input.resolveTagId(tag) : null;
    if (tag && !tagId) throw new Error("HANDOFF_TAG_UNAVAILABLE");
    const clarification = ["CHECKOUT_DETAILS_MISSING", "CHECKOUT_PAUSED"].includes(output.reasonCode ?? "") && output.telemetry?.clarificationCase === true;
    if (messages.length && (!input.deliveryRecipient || (!output.protectedOutbound && !clarification))) throw new Error("PRIVATE_DELIVERY_ROUTE_REQUIRED");
    // Same final-payload binding as realtime-runner: a planner readiness is not yet a Meta envelope.
    const original = output.protectedOutbound?.readiness, cart = output.plan.state.cart?.value;
    const outbound = original && messages.length ? evaluateDeterministicEffectReadinessV1({ effect: "PROTECTED_OUTBOUND", pageId: scope.pageId, conversationId: scope.conversationId,
      sourceMessageIdHash: original.sourceMessageIdHash, conversationRevision: authority.stateVersion, salesCycleRevision: original.salesCycleRevision, productIds: original.productIds,
      cartId: cart?.cartId ?? null, cartVersion: cart?.revision ?? null, cartStateHash: original.cartStateHash, ...(cart ? { cartLines: cart.lines } : {}),
      orderPreviewId: original.orderPreviewId, orderPreviewHash: original.orderPreviewHash, buyingIntent: null,
      claims: output.protectedOutbound!.claims, protectedClaimTypes: output.protectedOutbound!.claimTypes, deterministicEvidenceHash: commerceHash(messages),
      parentReadinessHash: original.binding.parentReadinessHash, payloadHash: commerceHash(messages), checkedAt: now }) : messages.length && clarification ?
      evaluateDeterministicEffectReadinessV1({ effect: "PROTECTED_OUTBOUND", pageId: scope.pageId, conversationId: scope.conversationId,
        sourceMessageIdHash: output.plan.sourceMessageIdHash!, conversationRevision: authority.stateVersion, salesCycleRevision: output.plan.expectedRevision,
        productIds: [...new Set(cart?.lines.map(l => l.parentProductId) ?? [])].sort(), cartId: null, cartVersion: null, cartStateHash: null, orderPreviewId: null, orderPreviewHash: null, buyingIntent: null,
        claims: [], protectedClaimTypes: [], deterministicEvidenceHash: commerceHash(messages), payloadHash: commerceHash(messages), checkedAt: now }) : null;
    const prepared: RealtimeCommitInput<typeof next, SalesCycleRuntimeState> = { pageId: scope.pageId, conversationId: scope.conversationId,
      customerHash: scope.customerHash, expectedStateVersion: authority.stateVersion, state: next, salesCyclePlan: output.plan,
      inboxBatchGuard: input.inboxBatchGuard, completeInboxBatch: terminal,
      ...(tag && tagId ? { pancakeTagPlan: { desiredTag: tag, tagId, handoffGeneration: next.revision }, handoffEventPlan: {
        source: "BOT_POLICY" as const, reasonCode: output.reasonCode ?? "DEPENDENCY_FAILURE", productId: output.plan.state.cart?.value.lines[0]?.parentProductId ?? null,
        reasonDetailSafe: {attachmentCount:input.handoffSource?.()?.attachmentCount ?? 0},
        factsStatus: null, factsReasonCode: null, desiredTag: "NHAN_VIEN" as const, handoffGeneration: next.revision,
        triggerEventKey: input.handoffSource?.()?.eventKey ?? scope.sourceMessageId, triggerMessagePk: input.handoffSource?.()?.messagePk ?? null, occurredAt: now } } : {}),
      ...(messages.length ? { metaPlan: { replyPlanId: randomUUID(), responseGroupId: randomUUID(), recipientId: input.deliveryRecipient!, messages,
        sourceMessageIdHash: output.plan.sourceMessageIdHash!, protectedClaimTypes: output.protectedOutbound?.claimTypes ?? [],
        protectedClaims: output.protectedOutbound?.claims ?? [], effectReadiness: outbound!, sendAfterOwnerHandoff: transfer } } : {}) };
    return input.transaction(async client => {
      const r = await input.store.commitWithinTransaction(client, prepared, now);
      if (r.stateCommitted && ((transfer && (!r.pancakeTagOutboxCreated || !r.handoffEventCreated)) || (messages.length && r.metaOutboxCreated !== messages.length))) throw new Error("ATOMIC_EFFECT_INTENTS");
      if (r.stateCommitted) outboxMessages += r.metaOutboxCreated;
      return r;
    });
  }
  return { repository, outboxCount: () => outboxMessages, readReceipt: createPersistedCommerceReceiptReader({ store: input.store, repository, scope, conversationKey: scope.conversationId }),
    async privateCheckoutPending() {
      const current = await repository.read(scope.conversationId);
      return !!current && ["CART_OPEN", "ORDER_PREVIEW"].includes(current.stage) &&
        current.clarification?.reasonCode === "CHECKOUT_DETAILS_MISSING";
    },
    async executeCommand(call: CommandInput): Promise<CommerceCommandResult> {
      const authority = await input.readAuthority();
      if (!matches(authority) || authority.stateVersion !== call.conversationRevision || call.bindingVersion !== scope.bindingVersion) return { status: "REJECTED", reasonCode: "CURRENT_AUTHORITY_CHANGED" };
      const state = (await repository.read(scope.conversationId))!;
      if (state.revision !== call.expectedRevision) return { status: "CONFLICT", reasonCode: "STATE_VERSION_CONFLICT" };
      const resolution = await input.policy();
      if (!resolution.bundle || commerceHash(resolution.bundle.policy) !== commerceHash(call.policy.policy)) return { status: "REJECTED", reasonCode: "POLICY_CHANGED" };
      const draft = call.command.kind === "CART_OPENED" ? call.trustedPorts.resolveCartDraft(call.command.cartDraftRef) : null;
      const selected = draft?.lines[0], component = selected?.components[0];
      const output = await prepareNativeCommerceTransition({ command: call.command, trustedPorts: call.trustedPorts,
        source: { ...source(state, authority, resolution), ...(selected ? { productId: selected.parentProductId, offerType: selected.offerId, size: component?.size ?? null, color: component?.color ?? null } : {}) } });
      if (!output.plan) return { status: "REJECTED", reasonCode: output.reasonCode ?? "TRANSITION_UNAVAILABLE" };
      const terminal = call.command.kind === "CONFIRM_PURCHASE" || output.transferToHuman;
      if (!(await commit(output, authority, terminal, resolution))?.stateCommitted) return { status: "CONFLICT", reasonCode: "STATE_VERSION_CONFLICT" };
      const actual = (await repository.read(scope.conversationId))!;
      if (commerceHash(actual) !== commerceHash(output.plan.state)) throw new Error("COMMITTED_STATE_CHANGED");
      if (call.command.kind === "CONFIRM_PURCHASE" && output.reasonCode === "CHECKOUT_DETAILS_MISSING" &&
          output.telemetry?.clarificationCase === true) return { status: "CHECKOUT_REQUESTED", state: actual };
      return actual.stage === "HANDED_OFF" ? { status: "HANDOFF", state: actual, reasonCode: output.reasonCode ?? "DEPENDENCY_FAILURE" }
        : { status: "APPLIED", state: actual, transferToHuman: output.transferToHuman };
    },
    /** The existing private checkout parser/preview runs in code; no raw private input goes to a model. */
    async advancePrivateCheckout() {
      const authority = await input.readAuthority(); if (!matches(authority)) return { committed: false, messages: 0,
        failure: { stage: "AUTHORITY" as const, reasonCode: "CURRENT_AUTHORITY_CHANGED" } };
      const state = (await repository.read(scope.conversationId))!, resolution = await input.policy();
      const output = await evaluateRealtimeSalesCycle({ ...source(state, authority, resolution), canonicalBuyingIntent: buildCanonicalDecisionEvidenceV1({
        text: input.latest, sourceMessageId: scope.sourceMessageId, productId: null, modelBuyingIntent: null, evaluatedAt: input.clock() }).buyingIntent });
      if (!output.plan) return { committed: false, messages: 0, failure: { stage: "PLANNER" as const,
        reasonCode: output.reasonCode ?? "NO_TRANSITION_PLAN", readinessReasons: output.readinessAttempt?.reasonCodes ?? [] } };
      const committed = await commit(output, authority, true, resolution);
      return committed?.stateCommitted ? { committed: true, messages: committed.metaOutboxCreated } : { committed: false, messages: 0,
        failure: { stage: "COMMIT" as const, reasonCode: "COMMIT_NOT_APPLIED", reasonCodes: committed?.reasonCodes ?? [],
          inboxBatchStatus: committed?.inboxBatchStatus ?? null } };
    },
  };
}
