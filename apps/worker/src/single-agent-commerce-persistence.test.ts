import { describe, expect, it, vi } from "vitest";
import { createPersistedCommerceRepository, createPersistedCommerceHandoffPort } from "./single-agent-commerce-persistence.js";
import { createSalesCycleRuntimeState } from "@lana/chat-runtime";
import { createConversationState, applySilentHandoff } from "@lana/conversation-engine";
import { selectCommerceHandoff } from "./single-agent-commerce-handoff.js";
import { commerceNow, commerceScope, fixturePolicy } from "./single-agent-commerce.test-support.js";

describe("existing transaction owner for candidate commerce", () => {
  it("commits ownership, handoff event and tag intent together and rolls back incomplete intents", async () => {
    const scope = commerceScope(), decision = selectCommerceHandoff((await fixturePolicy()).bundle!, scope, "EXCHANGE", commerceNow);
    const state = { ...createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow }), revision: 1 };
    const before = { ...scope, state, stateVersion: 1, fence: 1 };
    const next = { ...before, stateVersion: 2, state: applySilentHandoff(state, "EXCHANGE", 1, 1, commerceNow).state };
    const commitWithinTransaction = vi.fn(async () => ({ stateCommitted: true, handoffEventCreated: false, pancakeTagOutboxCreated: true }));
    const port = createPersistedCommerceHandoffPort({ scope, clock: () => commerceNow, read: async () => before,
      inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] }, resolveTagId: () => "existing-tag-id",
      store: { commitWithinTransaction } as never, transaction: work => work({} as never) });
    await expect(port.commit({ before, next, decision })).rejects.toThrow("ATOMIC_HANDOFF_INTENTS");
    expect(commitWithinTransaction).toHaveBeenCalledWith({}, expect.objectContaining({ expectedStateVersion: 1,
      state: expect.objectContaining({ conversationOwner: "HUMAN" }), inboxBatchGuard: expect.any(Object),
      pancakeTagPlan: { desiredTag: "VAN_DON", tagId: "existing-tag-id", handoffGeneration: 2 },
      handoffEventPlan: expect.objectContaining({ source: "POST_SALE", reasonCode: "EXCHANGE", desiredTag: "VAN_DON" }) }), commerceNow);
    commitWithinTransaction.mockResolvedValue({ stateCommitted: true, handoffEventCreated: true, pancakeTagOutboxCreated: true });
    expect(await port.commit({ before, next, decision })).toBe(true);
  });
  it("requires the exact prepared transition and current source lease before commit", async () => {
    const state = createSalesCycleRuntimeState("key", { pageId: "1198992073286645", conversationId: "conversation" }, new Date());
    const commit = vi.fn(async () => ({ stateCommitted: true, sendAuthorized: false }));
    const store = { loadOrCreateSalesCycle: vi.fn(async () => ({ state, stateRevision: 0 })), commitWithinTransaction: commit };
    const next = { ...state, revision: 1 };
    const prepared = { pageId: state.routing.pageId, conversationId: "conversation", customerHash: "hash", expectedStateVersion: 0,
      state: { revision: 1 }, inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] },
      salesCyclePlan: { expectedRevision: 0, state: next } };
    const repository = createPersistedCommerceRepository({ store: store as never, conversationKey: "key", pageId: state.routing.pageId,
      conversationId: "conversation", customerHash: "hash", clock: () => new Date(), prepare: async () => prepared as never,
      transaction: work => work({} as never) });
    await expect(repository.compareAndSwap({ conversationKey: "key", expectedRevision: 0, nextState: { ...next, revision: 2 }, effects: {} as never })).rejects.toThrow("PREPARED_TRANSITION");
    expect(commit).not.toHaveBeenCalled();
    expect(await repository.compareAndSwap({ conversationKey: "key", expectedRevision: 0, nextState: next, effects: {} as never })).toBe(true);
    expect(commit).toHaveBeenCalledWith({}, prepared, expect.any(Date));
    delete (prepared as Partial<typeof prepared>).inboxBatchGuard;
    await expect(repository.compareAndSwap({ conversationKey: "key", expectedRevision: 0, nextState: next, effects: {} as never })).rejects.toThrow("CURRENT_SOURCE_LEASE");
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
