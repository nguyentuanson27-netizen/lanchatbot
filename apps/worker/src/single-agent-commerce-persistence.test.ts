import { describe, expect, it, vi } from "vitest";
import { createPersistedCommerceRepository, createPersistedCommerceHandoffPort, prepareNativeCommerceTransition } from "./single-agent-commerce-persistence.js";
import { createSalesCycleRuntimeState, applySalesCycleCommand, computeBusinessContentHash } from "@lana/chat-runtime";
import { createConversationState, applySilentHandoff } from "@lana/conversation-engine";
import type { RealtimeCommitInput } from "@lana/database";
import { selectCommerceHandoff } from "./single-agent-commerce-handoff.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureCartLine, fixtureProfile } from "./single-agent-commerce.test-support.js";

async function handoffFixture(options: {
  holdingReply?: string; reason?: "DEPENDENCY_FAILURE" | "CUSTOMER_REQUESTED_HUMAN";
  completeInboxBatch?: boolean; outboxResult?: "TRUNCATED" | "ABSENT";
} = {}) {
  const scope = commerceScope(), policy = { ...(await fixturePolicy()).bundle!, channel: "PUBLISHED" as const, sideEffects: "LIVE_OUTBOUND" as const };
  const reason = options.reason ?? "DEPENDENCY_FAILURE";
  if (options.holdingReply) Object.assign(policy.artifacts, { handoffMatrix: {
    schemaVersion: 1, kind: "HANDOFF_MATRIX", sourceMetadata: policy.artifacts.shopPolicy.sourceMetadata,
    rules: [{ reason, customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF", holdingReply: options.holdingReply, tag: "NHAN_VIEN" }],
  } });
  const decision = selectCommerceHandoff(policy, scope, reason, commerceNow);
  const state = { ...createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow }), revision: scope.revision };
  const before = { ...scope, state, stateVersion: scope.revision, fence: 1 };
  const nextState = applySilentHandoff(state, reason === "CUSTOMER_REQUESTED_HUMAN" ? reason : "AGENT_REQUEST", scope.revision, 1, commerceNow).state;
  const next = { ...before, state: nextState, stateVersion: nextState.revision };
  const completed = vi.fn(), rollback = vi.fn(), client = {};
  const commitWithinTransaction = vi.fn(async (_client: unknown, prepared: RealtimeCommitInput<unknown>) => {
    const intents = { stateCommitted: true, handoffEventCreated: true, pancakeTagOutboxCreated: true };
    return options.outboxResult === "ABSENT" ? intents : { ...intents,
      metaOutboxCreated: options.outboxResult === "TRUNCATED" ? 0 : prepared.metaPlan?.messages.length ?? 0 };
  });
  const transaction: Parameters<typeof createPersistedCommerceHandoffPort>[0]["transaction"] = async work => {
    try { const result = await work(client as never); completed(); return result; }
    catch (error) { rollback(); throw error; }
  };
  const deliveryRecipient = "synthetic-private-provider-recipient";
  const inboxBatchGuard = { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] };
  const port = createPersistedCommerceHandoffPort({ scope, clock: () => commerceNow, read: async () => before,
    inboxBatchGuard, ...(options.completeInboxBatch === undefined ? {} : { completeInboxBatch: options.completeInboxBatch }), deliveryRecipient, resolveTagId: () => "existing-tag-id",
    store: { commitWithinTransaction } as never, transaction });
  return { scope, before, next, decision, port, deliveryRecipient, inboxBatchGuard, client, commitWithinTransaction, completed, rollback };
}

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
    const commitWithinTransaction = vi.fn(async () => ({ stateCommitted: true, handoffEventCreated: false, pancakeTagOutboxCreated: true, metaOutboxCreated: 1 }));
    const port = createPersistedCommerceHandoffPort({ scope, clock: () => commerceNow, read: async () => before,
      inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] }, resolveTagId: () => "existing-tag-id",
      deliveryRecipient: "synthetic-recipient",
      store: { commitWithinTransaction } as never, transaction: work => work({} as never) });
    await expect(port.commit({ before, next, decision })).rejects.toThrow("ATOMIC_HANDOFF_INTENTS");
    expect(commitWithinTransaction).toHaveBeenCalledWith({}, expect.objectContaining({ expectedStateVersion: 1,
      state: expect.objectContaining({ conversationOwner: "HUMAN" }), inboxBatchGuard: expect.any(Object),
      pancakeTagPlan: { desiredTag: "VAN_DON", tagId: "existing-tag-id", handoffGeneration: 2 },
      handoffEventPlan: expect.objectContaining({ source: "POST_SALE", reasonCode: "EXCHANGE", desiredTag: "VAN_DON" }) }), commerceNow);
    commitWithinTransaction.mockResolvedValue({ stateCommitted: true, handoffEventCreated: true, pancakeTagOutboxCreated: true, metaOutboxCreated: 1 });
    expect(await port.commit({ before, next, decision })).toBe(true);
  });
  it("atomically enqueues the configured dependency holding reply when handoff completes the source", async () => {
    const holdingReply = "Nhân viên sẽ kiểm tra thông tin nhận hàng của chị.", f = await handoffFixture({ holdingReply });
    expect(await f.port.commit(f)).toBe(true);
    expect(f.commitWithinTransaction).toHaveBeenCalledOnce();
    expect(f.commitWithinTransaction).toHaveBeenCalledWith(f.client, expect.objectContaining({
      expectedStateVersion: f.before.stateVersion, state: f.next.state, inboxBatchGuard: f.inboxBatchGuard,
      pancakeTagPlan: { desiredTag: "NHAN_VIEN", tagId: "existing-tag-id", handoffGeneration: f.next.stateVersion },
      handoffEventPlan: expect.objectContaining({ source: "BOT_POLICY", reasonCode: "DEPENDENCY_FAILURE", desiredTag: "NHAN_VIEN" }),
      metaPlan: expect.objectContaining({ recipientId: f.deliveryRecipient, messages: [{ kind: "TEXT", text: holdingReply }],
        sendAfterOwnerHandoff: true, protectedClaims: [], protectedClaimTypes: [] }),
    }), commerceNow);
    const prepared = f.commitWithinTransaction.mock.calls[0]![1], meta = prepared.metaPlan!;
    expect(prepared.completeInboxBatch).not.toBe(false);
    expect(meta.effectReadiness).toMatchObject({ effect: "PROTECTED_OUTBOUND", outcome: "READY",
      pageId: f.scope.pageId, conversationId: f.scope.conversationId, conversationRevision: f.before.stateVersion,
      sourceMessageIdHash: meta.sourceMessageIdHash, deterministicEvidenceHash: commerceHash(meta.messages),
      binding: expect.objectContaining({ payloadHash: commerceHash(meta.messages) }) });
    expect(meta.sourceMessageIdHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify({ scope: f.scope, decision: f.decision, state: prepared.state, readiness: meta.effectReadiness })).not.toContain(f.deliveryRecipient);
    expect(f.completed).toHaveBeenCalledOnce(); expect(f.rollback).not.toHaveBeenCalled();
    expect(f.port.outboxCount()).toBe(1);
  });
  it.each(["TRUNCATED", "ABSENT"] as const)("rolls back handoff when its holding reply outbox intent is %s", async outboxResult => {
    const f = await handoffFixture({ holdingReply: "Nhân viên sẽ kiểm tra thông tin nhận hàng của chị.", outboxResult });
    await expect(f.port.commit(f)).rejects.toThrow("ATOMIC_HANDOFF_INTENTS");
    expect(f.commitWithinTransaction).toHaveBeenCalledOnce();
    expect(f.rollback).toHaveBeenCalledOnce(); expect(f.completed).not.toHaveBeenCalled();
    expect(f.port.outboxCount()).toBe(0);
  });
  it.each(["DEPENDENCY_FAILURE", "CUSTOMER_REQUESTED_HUMAN"] as const)("keeps the default %s handoff silent without a published holding rule", async reason => {
    const f = await handoffFixture({ reason });
    expect(f.decision.customerMessages).toEqual([]);
    expect(await f.port.commit(f)).toBe(true);
    expect(f.commitWithinTransaction.mock.calls[0]![1].metaPlan).toBeUndefined();
    expect(f.port.outboxCount()).toBe(0);
  });
  it("leaves configured holding replies to public final egress when the handoff retains its source", async () => {
    const holdingReply = "Nhân viên sẽ kiểm tra thông tin nhận hàng của chị.", f = await handoffFixture({ holdingReply, completeInboxBatch: false });
    expect(f.decision.customerMessages).toEqual([holdingReply]);
    expect(await f.port.commit(f)).toBe(true);
    const prepared = f.commitWithinTransaction.mock.calls[0]![1];
    expect(prepared.completeInboxBatch).toBe(false); expect(prepared.metaPlan).toBeUndefined();
    expect(f.port.outboxCount()).toBe(0);
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
