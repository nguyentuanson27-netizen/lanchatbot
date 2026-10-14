import { describe, expect, it, vi } from "vitest";
import { createPersistedCommerceRepository } from "./single-agent-commerce-persistence.js";
import { createSalesCycleRuntimeState } from "@lana/chat-runtime";

describe("existing transaction owner for candidate commerce", () => {
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
