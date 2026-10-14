import type { PostgresRealtimeRuntimeStore, RealtimeCommitInput } from "@lana/database";
import { createSalesCycleRuntimeState, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1 } from "@lana/chat-runtime";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";

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
            (update.effects.paymentMessageIntent && result.metaOutboxCreated < 1))) throw new Error("ATOMIC_EFFECT_INTENTS");
          return result.stateCommitted;
        });
      } catch (error) {
        if (error instanceof Error && ["STATE_REVISION_CONFLICT", "SALES_CYCLE_STATE_REVISION_CONFLICT"].includes(error.message)) return false;
        throw error;
      }
    },
  };
}
