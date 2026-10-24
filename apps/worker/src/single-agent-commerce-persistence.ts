import type { PostgresRealtimeRuntimeStore, RealtimeCommitInput, RealtimeInboxBatchGuard } from "@lana/database";
import { createHash, randomUUID } from "node:crypto";
import { createSalesCycleRuntimeState, type SalesCycleCommand, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1,
  type SalesCycleTrustedPortsV1 } from "@lana/chat-runtime";
import { buildCanonicalDecisionEvidenceV1, evaluateDeterministicEffectReadinessV1 } from "@lana/business-tools";
import { CanonicalBuyingIntentV1Schema, type ProtectedClaimV1 } from "@lana/contracts";
import { evaluateRealtimeSalesCycle, type RealtimeSalesCycleInput } from "./realtime-sales-cycle.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import type { CommerceScope } from "./single-agent-commerce-read-only-tools.js";
import { terminalFallback, type TrustedContext } from "./single-agent-semantic-verifier-boundary.js";
import type { CommerceHandoffCommit, HandoffAuthority } from "./single-agent-commerce-handoff.js";

/** Reuse the current inbox/CAS transaction. A tag intent is not a Pancake delivery receipt. */
export function createPersistedCommerceHandoffPort(input: {
  scope: CommerceScope; clock: () => Date; read: () => Promise<HandoffAuthority>;
  store: Pick<PostgresRealtimeRuntimeStore, "commitWithinTransaction">;
  transaction: <T>(work: (client: Parameters<PostgresRealtimeRuntimeStore["commitWithinTransaction"]>[0]) => Promise<T>) => Promise<T>;
  inboxBatchGuard: RealtimeInboxBatchGuard;
  completeInboxBatch?: boolean;
  /** Code-only provider recipient. Required only when this port owns a holding reply. */
  deliveryRecipient?: string;
  triggerSource?: {eventKey:string;messagePk:string;attachmentCount:number};
  resolveTagId: (tag: "NHAN_VIEN" | "VAN_DON") => string | null;
}) {
  let outboxMessages = 0;
  return { read: input.read, outboxCount: () => outboxMessages, async commit({ before, next, decision, media }: CommerceHandoffCommit): Promise<boolean> {
    const tagId = input.resolveTagId(decision.tag);
    if (!tagId || !input.inboxBatchGuard.inboxIds.length) throw new Error("HANDOFF_TAG_OR_SOURCE_UNAVAILABLE");
    const now = input.clock();
    if (media && (decision.reason !== "SIZE_RULE_UNAVAILABLE" || !decision.customerMessages.length ||
      !media.images.length || media.images.length > 4 || new Set(media.images.map(image => image.url)).size !== media.images.length)) throw new Error("HANDOFF_MEDIA_SCOPE");
    const claims: ProtectedClaimV1[] = media?.claims ?? [];
    if (media && (claims.some(c => c.type !== "PRODUCT_MEDIA") || media.images.some(image =>
      !claims.some(c => c.type === "PRODUCT_MEDIA" && c.scope.kind === "PRODUCT" && c.scope.productId === image.productId &&
        c.value.assetSha256 === commerceHash(image.url))))) throw new Error("HANDOFF_MEDIA_CLAIMS");
    const messages = media ? [{ kind: "TEXT" as const, text: terminalFallback("C3_B_VERIFIED_MEDIA_V1").text! },
      ...media.images.map(image => ({ kind: "IMAGE" as const, imageUrl: image.url })),
      ...decision.customerMessages.map(text => ({ kind: "TEXT" as const, text }))]
      : input.completeInboxBatch === false ? [] : decision.customerMessages.map(text => ({ kind: "TEXT" as const, text }));
    if (messages.length && !input.deliveryRecipient) throw new Error("HANDOFF_DELIVERY_ROUTE_REQUIRED");
    const sourceMessageIdHash = createHash("sha256").update(input.scope.sourceMessageId, "utf8").digest("hex");
    const payloadHash = commerceHash(messages);
    const readiness = messages.length ? evaluateDeterministicEffectReadinessV1({ effect: "PROTECTED_OUTBOUND",
      pageId: input.scope.pageId, conversationId: input.scope.conversationId, sourceMessageIdHash,
      conversationRevision: before.stateVersion, salesCycleRevision: null, productIds: [...new Set(media?.images.map(image => image.productId) ?? [])], cartId: null, cartVersion: null,
      cartStateHash: null, orderPreviewId: null, orderPreviewHash: null, buyingIntent: null, claims, protectedClaimTypes: media ? ["PRODUCT_MEDIA"] : [],
      deterministicEvidenceHash: payloadHash, payloadHash, checkedAt: now }) : null;
    const applied = await input.transaction(async client => {
      if (media && (readiness?.outcome !== "READY" || !await media.validate())) return false;
      const result = await input.store.commitWithinTransaction(client, { pageId: input.scope.pageId,
        customerHash: input.scope.customerHash, conversationId: input.scope.conversationId,
        expectedStateVersion: before.stateVersion, state: next.state, inboxBatchGuard: input.inboxBatchGuard,
        ...(input.completeInboxBatch === false && !media ? { completeInboxBatch: false } : {}),
        pancakeTagPlan: { desiredTag: decision.tag, tagId, handoffGeneration: next.stateVersion },
        handoffEventPlan: { source: decision.category === "AFTER_SALES" ? "POST_SALE" : decision.reason === "CUSTOMER_REQUESTED_HUMAN" ? "CUSTOMER_REQUEST" : "BOT_POLICY",
          reasonCode: decision.reason, reasonDetailSafe: { rulesetVersion: decision.provenance.rulesetVersion,
            ...(input.triggerSource ? {attachmentCount:input.triggerSource.attachmentCount} : {}) },
          productId: before.state.currentProductId, factsStatus: null, factsReasonCode: null,
          desiredTag: decision.tag, handoffGeneration: next.stateVersion, triggerEventKey: input.triggerSource?.eventKey ?? input.scope.sourceMessageId,
          triggerMessagePk: input.triggerSource?.messagePk ?? null, occurredAt: now },
        ...(messages.length ? { metaPlan: { replyPlanId: randomUUID(), responseGroupId: randomUUID(), recipientId: input.deliveryRecipient!, messages,
          sourceMessageIdHash, protectedClaims: claims, protectedClaimTypes: media ? ["PRODUCT_MEDIA"] : [], effectReadiness: readiness!, sendAfterOwnerHandoff: true } } : {}) }, now);
      if (!result.stateCommitted) return false;
      if (!result.handoffEventCreated || !result.pancakeTagOutboxCreated ||
        (messages.length && result.metaOutboxCreated !== messages.length)) throw new Error("ATOMIC_HANDOFF_INTENTS");
      return true;
    });
    if (applied) outboxMessages += messages.length;
    return applied;
  } };
}

export function createPersistedCommerceReceiptReader(input: {
  store: Pick<PostgresRealtimeRuntimeStore, "readCommittedSalesCycleEvent">;
  repository: Pick<SalesCycleStateRepositoryV1, "read">; scope: CommerceScope; conversationKey: string;
}): (operationId: string) => Promise<TrustedContext["effectReceipts"][number] | null> {
  return async operationId => {
    const event = await input.store.readCommittedSalesCycleEvent(input.scope.pageId, input.scope.conversationId, operationId);
    const current = await input.repository.read(input.conversationKey);
    const effect = event?.commandKind === "NEGOTIATION_EVENT"?"NEGOTIATION_UPDATED":event?.commandKind === "CART_OPENED" ? "CART_OPENED" : event?.commandKind === "CART_MUTATED" ? "CART_MUTATED"
      : event?.commandKind === "CONFIRM_PURCHASE" ? "PURCHASE_CONFIRMED" : null;
    if (!event || !effect || !current?.cart || current.revision !== event.stateRevisionAfter || current.cart.value.cartId !== event.cartId) return null;
    return { ref: `receipt:${operationId}`, operationId, subjectRef: event.cartId, effect, status: "SUCCESS",
      stateRevision: event.stateRevisionAfter, recipient: input.scope.recipient, observedAt: event.occurredAt.toISOString(),
      expiresAt: new Date(Math.min(Date.parse(current.cart.expiresAt), event.occurredAt.getTime()+300_000)).toISOString() };
  };
}

/** Native selection is an intent proposal; existing runtime permission/readiness and transaction checks still own effects. */
export async function prepareNativeCommerceTransition(input: {
  source: Omit<RealtimeSalesCycleInput, "canonicalBuyingIntent" | "commandIdentity">;
  command: SalesCycleCommand; trustedPorts: SalesCycleTrustedPortsV1;
}) {
  const { source, command, trustedPorts } = input;
  const textHash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
  const mutation = command.kind === "CART_MUTATED" && source.state.cart
    ? trustedPorts.resolveCartMutation(command.mutationRef, source.state.cart.value)?.mutation : null;
  const requestedAction = mutation?.kind === "SET_QUANTITY" ? "SET_QUANTITY" : mutation?.kind === "ADD_LINE" ? "ADD_TO_CART" : null;
  const quantity = mutation?.kind === "SET_QUANTITY" ? mutation.quantity : mutation?.kind === "ADD_LINE" ? mutation.line.quantity : null;
  const draft = command.kind === "CART_OPENED" ? trustedPorts.resolveCartDraft(command.cartDraftRef) : null;
  const suffix = command.kind === "NEGOTIATION_EVENT"?"negotiation":command.kind === "CART_OPENED" ? "cart-open" : command.kind === "CONFIRM_PURCHASE" ? "confirm"
    : mutation?.kind === "ADD_LINE" ? "add-line" : mutation?.kind === "REMOVE_LINE" ? "remove-line" : "set-quantity";
  const legacyIntent = buildCanonicalDecisionEvidenceV1({ text: source.text, sourceMessageId: source.messageId,
    productId: source.productId, evaluatedAt: source.now, modelBuyingIntent: requestedAction
      ? { decision: "COMMITTED" as const, requestedAction, quantity, evidenceText: source.text, confidence: 1 } : null }).buyingIntent;
  const line = mutation?.kind === "ADD_LINE" ? mutation.line : mutation ? source.state.cart?.value.lines.find(l => l.lineId === mutation.lineId) : draft?.lines[0];
  const canonicalBuyingIntent = (mutation || draft) && line ? CanonicalBuyingIntentV1Schema.parse({
    schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1", decision: "COMMITTED",
    requestedAction: mutation?.kind === "SET_COMPONENT_VARIANT" ? "SET_COMPONENT_VARIANT" : mutation?.kind === "REMOVE_LINE" ? "REMOVE_FROM_CART" : mutation?.kind === "SET_QUANTITY" ? "SET_QUANTITY" : draft ? "OPEN_CART" : "ADD_TO_CART",
    quantity: mutation?.kind === "SET_QUANTITY" ? mutation.quantity : mutation?.kind === "REMOVE_LINE" || mutation?.kind === "SET_COMPONENT_VARIANT" ? null : line.quantity,
    productId: line.parentProductId, contributors: ["NATIVE_TOOL_PERMISSION"], sourceMessageIdHash: textHash(source.messageId),
    evidenceHash: commerceHash(["NATIVE_COMMERCE_PERMISSION_V1", textHash(source.messageId), textHash(command.commandId), commerceHash(mutation ? { mutation } : draft)]),
    reasonCodes: [], evaluatedAt: source.now.toISOString(), authorization: "NONE",
  }) : legacyIntent;
  return evaluateRealtimeSalesCycle({ ...source, canonicalBuyingIntent, commandIdentity: {
    primaryCommandId: command.commandId, primarySuffix: suffix,
    ...(draft ? { cartIdentity: draft.identity, ...(draft.lines[0] ? { cartLineId: draft.lines[0].lineId } : {}) } : {}),
    ...(command.kind === "CART_OPENED" ? { cartExpiresAt: command.expiresAt } : {}),
  }, ...(command.kind==="NEGOTIATION_EVENT"?{nativeNegotiation:command,nativeNegotiationInbound:trustedPorts.resolveInboundMessage(command.sourceMessageId)}:{}),
    ...(mutation && command.kind === "CART_MUTATED" ? { nativeMutation: { command, mutation } } : {}) });
}

/** Reuse the existing inbox/revision/authority transaction; this adapter never writes SQL or sends. */
export function createPersistedCommerceRepository(input: {
  store: Pick<PostgresRealtimeRuntimeStore, "loadOrCreateSalesCycle" | "commitWithinTransaction">;
  transaction: <T>(work: (client: Parameters<PostgresRealtimeRuntimeStore["commitWithinTransaction"]>[0]) => Promise<T>) => Promise<T>;
  conversationKey: string; pageId: string; conversationId: string; customerHash: string; clock: () => Date;
  prepare: (update: Parameters<SalesCycleStateRepositoryV1["compareAndSwap"]>[0]) => Promise<RealtimeCommitInput<unknown, SalesCycleRuntimeState>>;
}): SalesCycleStateRepositoryV1 {
  return {
    async read(key) {
      if (key !== input.conversationKey) throw new Error("COMMERCE_SCOPE");
      const row = await input.store.loadOrCreateSalesCycle(input.pageId, input.conversationId,
        () => createSalesCycleRuntimeState(key, { pageId: input.pageId, conversationId: input.conversationId }, input.clock()), input.clock());
      if (row.state.conversationKey !== key || row.state.routing.pageId !== input.pageId ||
        row.state.routing.conversationId !== input.conversationId || row.state.revision !== row.stateRevision) throw new Error("COMMERCE_SCOPE");
      return row.state;
    },
    async compareAndSwap(update) {
      if (update.conversationKey !== input.conversationKey) throw new Error("COMMERCE_SCOPE");
      const prepared = await input.prepare(update);
      if (!prepared.inboxBatchGuard) throw new Error("CURRENT_SOURCE_LEASE");
      if (prepared.pageId !== input.pageId || prepared.conversationId !== input.conversationId ||
        prepared.customerHash !== input.customerHash || prepared.salesCyclePlan?.expectedRevision !== update.expectedRevision ||
        commerceHash(prepared.salesCyclePlan.state) !== commerceHash(update.nextState)) throw new Error("PREPARED_TRANSITION");
      if ((update.effects.transferToHuman && !prepared.handoffEventPlan) ||
        (update.effects.pancakeTagCommand && !prepared.pancakeTagPlan) ||
        (update.effects.paymentMessageIntent && !prepared.metaPlan)) throw new Error("ATOMIC_EFFECT_INTENTS");
      try {
        return await input.transaction(async client => {
          const result = await input.store.commitWithinTransaction(client, prepared, input.clock());
          if (result.stateCommitted && ((update.effects.transferToHuman && !result.handoffEventCreated) ||
            (update.effects.pancakeTagCommand && !result.pancakeTagOutboxCreated) ||
            (update.effects.paymentMessageIntent && result.metaOutboxCreated !== prepared.metaPlan!.messages.length))) throw new Error("ATOMIC_EFFECT_INTENTS");
          return result.stateCommitted;
        });
      } catch (error) {
        if (error instanceof Error && ["STATE_REVISION_CONFLICT", "SALES_CYCLE_STATE_REVISION_CONFLICT"].includes(error.message)) return false;
        throw error;
      }
    },
  };
}
