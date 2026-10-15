import { describe, expect, it, vi } from "vitest";
import { createPersistedCommerceRepository, createPersistedCommerceHandoffPort, prepareNativeCommerceTransition } from "./single-agent-commerce-persistence.js";
import { createSalesCycleRuntimeState, applySalesCycleCommand, computeBusinessContentHash } from "@lana/chat-runtime";
import { createConversationState, applySilentHandoff } from "@lana/conversation-engine";
import { selectCommerceHandoff } from "./single-agent-commerce-handoff.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureCartLine, fixtureProfile } from "./single-agent-commerce.test-support.js";

describe("existing transaction owner for candidate commerce", () => {
  it.each(["open", "variant"])("prepares native %s with fresh facts and exact replay evidence, independent of text classifiers", async mode => {
    const scope = commerceScope(), fixture = await fixturePolicy();
    const resolution = { ...fixture, mayAffectOutbound: true, audit: { ...fixture.audit, channel: "PUBLISHED" as const, pinScopeType: "SALES_EPISODE" as const, pinScopeId: "key", bundleHash: fixture.bundle!.bundleHash }, bundle: { ...fixture.bundle!, channel: "PUBLISHED" as const, sideEffects: "LIVE_OUTBOUND" as const } }, policy = resolution.bundle.policy;
    let state = createSalesCycleRuntimeState("key", { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
    const draft = { identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      lines: [fixtureCartLine()], shopId: scope.shopId, policyRef: { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) } };
    const mutation = { kind: "SET_COMPONENT_VARIANT" as const, lineId: draft.lines[0]!.lineId, componentProductId: "SM613", componentSku: "SM613-NAVY-L", size: "L", color: "navy" };
    const ports = { resolveCartDraft: () => draft, resolveCartMutation: () => ({ mutation }), resolveShopPolicy: () => policy, resolveInboundMessage: () => null, revalidateCheckout: () => null };
    state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "open", cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1_800_000).toISOString() }, now: commerceNow, trustedPorts: ports }).state;
    if (mode === "open") state = createSalesCycleRuntimeState("key", { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    const selection = { status: "READY" as const, line: mode === "open" ? draft.lines[0]! : { ...draft.lines[0]!, components: [{ ...draft.lines[0]!.components[0]!, size: "L", componentSku: mutation.componentSku }] }, shopId: scope.shopId,
      versions: { price: "pos:SM613", inventory: "stock-v1", size: "size-v1", eta: null }, eta: null, etaExpiresAt: null, sourceAuthority: "POS_SNAPSHOT" as const,
      stockStatus: "IN_STOCK" as const, stockAvailableQuantity: 4, sourceObservedAt: commerceNow.toISOString(), sourceExpiresAt: new Date(commerceNow.getTime()+1_200_000).toISOString() };
    const output = await prepareNativeCommerceTransition({ command: mode === "open" ? { kind: "CART_OPENED", commandId: "open", cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1_800_000).toISOString() } : { kind: "CART_MUTATED", commandId: "change-L", expectedCartVersion: state.cart!.value.revision,
      mutationRef: { id: "change", version: "1", contentHash: computeBusinessContentHash({ mutation }) }, mutationReasonCode: "VARIANT_CHANGED" }, trustedPorts: ports,
      source: { pageId: scope.pageId, conversationId: scope.conversationId, customerHash: scope.customerHash, state, stateRevision: state.revision, conversationRevision: scope.revision,
        text: "À thôi cho chị đổi sang L nhé", messageId: scope.sourceMessageId, eventKey: scope.sourceMessageId, senderId: "synthetic", occurredAt: commerceNow.toISOString(), attachmentIds: [],
        productId: "SM613", offerType: "DIRECT", size: "M", color: "navy", shopAlias: "LANA", policyResolution: resolution,
        facts: { resolveCartSelection: async () => selection } as never, now: commerceNow } });
    expect(output.plan, JSON.stringify(output)).not.toBeNull();
    expect(output.plan?.state.cart?.value.lines[0]?.components[0]?.size).toBe(mode === "open" ? "M" : "L");
    if (mode === "variant") expect(output.plan?.cartMutationBatchEvidence?.receipts[0]).toMatchObject({ mutation, mutationReasonCode: "VARIANT_CHANGED", authority: { authorityKind: "NATIVE_TOOL_PERMISSION" } });
    expect(output.plan?.canonicalBuyingIntent?.contributors).toContain("NATIVE_TOOL_PERMISSION");
  });
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
