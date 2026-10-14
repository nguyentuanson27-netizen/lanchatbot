import type { PostgresRealtimeRuntimeStore, RealtimeCommitInput } from "@lana/database";
import { createSalesCycleRuntimeState, type SalesCycleCommand, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1,
  type SalesCycleTrustedPortsV1 } from "@lana/chat-runtime";
import { buildCanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import { evaluateRealtimeSalesCycle, type RealtimeSalesCycleInput } from "./realtime-sales-cycle.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import type { CommerceScope } from "./single-agent-commerce-read-only-tools.js";
import type { TrustedContext } from "./single-agent-semantic-verifier-boundary.js";

export function createPersistedCommerceReceiptReader(input: {
  store: Pick<PostgresRealtimeRuntimeStore, "readCommittedSalesCycleEvent">;
  repository: Pick<SalesCycleStateRepositoryV1, "read">; scope: CommerceScope; conversationKey: string;
}): (operationId: string) => Promise<TrustedContext["effectReceipts"][number] | null> {
  return async operationId => {
    const event = await input.store.readCommittedSalesCycleEvent(input.scope.pageId, input.scope.conversationId, operationId);
    const current = await input.repository.read(input.conversationKey);
    const effect = event?.commandKind === "CART_OPENED" ? "CART_OPENED" : event?.commandKind === "CART_MUTATED" ? "CART_MUTATED"
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
  const mutation = command.kind === "CART_MUTATED" && source.state.cart
    ? trustedPorts.resolveCartMutation(command.mutationRef, source.state.cart.value)?.mutation : null;
  if (mutation?.kind === "SET_COMPONENT_VARIANT") return {
    handled: false, messages: [], plan: null, transferToHuman: false, desiredTag: null, reasonCode: "PERSISTED_VARIANT_TRANSITION_UNAVAILABLE",
  };
  const requestedAction = mutation?.kind === "SET_QUANTITY" ? "SET_QUANTITY" : mutation?.kind === "ADD_LINE" ? "ADD_TO_CART" : null;
  const quantity = mutation?.kind === "SET_QUANTITY" ? mutation.quantity : mutation?.kind === "ADD_LINE" ? mutation.line.quantity : null;
  const draft = command.kind === "CART_OPENED" ? trustedPorts.resolveCartDraft(command.cartDraftRef) : null;
  const suffix = command.kind === "CART_OPENED" ? "cart-open" : command.kind === "CONFIRM_PURCHASE" ? "confirm"
    : mutation?.kind === "ADD_LINE" ? "add-line" : mutation?.kind === "REMOVE_LINE" ? "remove-line" : "set-quantity";
  const canonicalBuyingIntent = buildCanonicalDecisionEvidenceV1({ text: source.text, sourceMessageId: source.messageId,
    productId: source.productId, evaluatedAt: source.now, modelBuyingIntent: requestedAction
      ? { decision: "COMMITTED" as const, requestedAction, quantity, evidenceText: source.text, confidence: 1 } : null }).buyingIntent;
  return evaluateRealtimeSalesCycle({ ...source, canonicalBuyingIntent, commandIdentity: {
    primaryCommandId: command.commandId, primarySuffix: suffix,
    ...(draft ? { cartIdentity: draft.identity } : {}),
    ...(command.kind === "CART_OPENED" ? { cartExpiresAt: command.expiresAt } : {}),
  } });
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
