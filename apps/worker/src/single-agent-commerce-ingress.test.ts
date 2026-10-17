import { afterEach, describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { applySalesCycleCommand, computeBusinessContentHash, createSalesCycleRuntimeState } from "@lana/chat-runtime";
import type { RealtimeCommitInput } from "@lana/database";
import * as composition from "./single-agent-commerce.js";
import { runPersistedCommerceIngress } from "./single-agent-commerce-ingress.js";
import { commerceScope, commerceNow, fixtureProfile, fixturePolicy, fixtureProduct, fixtureCartLine } from "./single-agent-commerce.test-support.js";
import type { OwnerGeneration } from "./single-agent-commerce-read-only.js";

function fixture(productIds = ["SM613"]) {
  const scope = commerceScope(), products = productIds.map(id => fixtureProduct(id));
  let generation = 1, revision = 1, profile = fixtureProfile();
  let conversation = createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow });
  let cycle = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
  const profileWrite = vi.fn(async (_page: string, _customer: string, expected: number, next: ReturnType<typeof fixtureProfile>) => {
    if (expected !== profile.profile.revision) return false;
    profile = { profile: next.profile, fieldEvidence: next.fieldEvidence }; return true;
  });
  const commit = vi.fn(async (_client: unknown, prepared: RealtimeCommitInput<unknown>) => ({ stateCommitted: true, metaOutboxCreated: prepared.metaPlan ? 1 : 0, inboxBatchStatus: "COMMITTED" }));
  const store = { loadOrCreate: async () => ({ conversationId: scope.conversationId, stateVersion: revision, state: { ...conversation, revision } }),
    loadOrCreateSalesCycle: async () => ({ state: cycle, stateRevision: cycle.revision }),
    loadOrCreateCustomerProfile: async () => ({ ...profile, pageId: scope.pageId, customerHash: scope.customerHash, revision: profile.profile.revision }),
    compareAndSwapCustomerProfile: profileWrite, commitWithinTransaction: commit };
  const id = "current-message", message = { schemaVersion: 1, traceId: "00000000-0000-4000-8000-000000000001", eventKey: id, messageId: id,
    pageId: scope.pageId, senderId: "synthetic-customer", conversationId: "meta-conversation", occurredAt: commerceNow.toISOString(),
    isEcho: false, appId: null, text: "Em ơi", attachments: [] };
  const batch = { pageId: scope.pageId, conversationHash: scope.customerHash, eventKind: "CUSTOMER", generation: 1,
    evaluationGroupId: "turn", leaseToken: "lease", inboxIds: ["inbox"], items: [{ envelope: { message } }] };
  const verifier = vi.fn(async () => ({ result: { verdict: "PASS", violations: [] } }));
  const inbox = { isBatchCurrent: async () => generation === 1, readGeneration: async () => generation, completeBatch: async () => {} };
  const run = (owner: () => Promise<OwnerGeneration> = async () => ({ kind: "FINAL", text: "Dạ chị." })) => runPersistedCommerceIngress({
    batch, fence: 1, scope, store, inbox,
    history: { recordInboundCustomerMessage: async () => {}, listConversationHistory: async () => [] }, transaction: async (work: (client: never) => Promise<unknown>) => work({} as never),
    facts: { ready: async () => true, resolve: async () => {}, close: async () => {} }, policy: () => fixturePolicy(),
    read: { policy: () => fixturePolicy(), initialProducts: products.map(p => p.product), catalog: {
      readProduct: async (id: string) => products.find(p => p.product.productId === id), searchText: async () => ({ status: "NOT_FOUND" }) } },
    resolveTagId: () => null, clock: () => commerceNow, ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm tra.", owner, verifier,
  } as unknown as Parameters<typeof runPersistedCommerceIngress>[0]);
  return { run, store, inbox, commit, verifier, profileWrite, profile: () => profile, supersede: () => { generation++; }, changeRevision: () => { revision++; },
    setCycle: (state: typeof cycle) => { cycle = state; },
    transferToHuman: () => { conversation = { ...conversation, conversationOwner: "HUMAN" }; revision++; } };
}

afterEach(() => vi.restoreAllMocks());

it("starts the independent generation read while current authority is being loaded", async () => {
  const f = fixture(), load = f.store.loadOrCreate;
  let loads = 0, generationReads = 0;
  vi.spyOn(f.inbox, "readGeneration").mockImplementation(async () => { generationReads++; return 1; });
  vi.spyOn(f.store, "loadOrCreate").mockImplementation(async () => {
    if (++loads === 2) { await Promise.resolve(); expect(generationReads).toBeGreaterThan(0); }
    return load();
  });
  expect((await f.run()).terminal.disposition).toBe("SEND_ELIGIBLE");
  expect(f.commit.mock.calls[0]![1].expectedStateVersion).toBe(1);
});

describe("persisted ingress source and final revision", () => {
  it.each([{ ids: [] }, { ids: ["SM613", "OTHER1", "OTHER2"] }])("enqueues a code-owned fallback without unrelated product coverage ($ids)", async ({ ids }) => {
    const f = fixture(ids), result = await f.run(async () => { throw new Error("provider unavailable"); });
    expect(result.terminal.disposition).toBe("FALLBACK"); expect(result.enqueued).toBe(1);
    expect(f.verifier).not.toHaveBeenCalled();
    const meta = f.commit.mock.calls[0]![1].metaPlan!;
    expect(meta.protectedClaims).toEqual([]); expect(meta.effectReadiness).toMatchObject({ outcome: "READY", productIds: [], cartId: null });
    expect(meta.sourceMessageIdHash).toBeTruthy();
  });
  it("enqueues a policy-only generated reply without a product and still verifies it", async () => {
    const f = fixture([]), outputs: OwnerGeneration[] = [{ kind: "TOOLS", calls: [{ name: "read_policy", args: {} }],
      content: { role: "model", parts: [{ functionCall: { name: "read_policy", args: {} } }] } },
    { kind: "FINAL", text: "Shop có hỗ trợ đổi hàng chị nhé." }];
    const result = await f.run(async () => outputs.shift()!);
    expect(result.terminal.reason).toBe("PASS"); expect(result.enqueued).toBe(1); expect(f.verifier).toHaveBeenCalledOnce();
    expect(f.commit.mock.calls[0]![1].metaPlan!.effectReadiness!.productIds).toEqual([]);
  });
  it("binds only products with actual verified claims after other candidates were loaded", async () => {
    const f = fixture(["SM613", "OTHER1", "OTHER2"]), outputs: OwnerGeneration[] = [{ kind: "TOOLS", calls: [{ name: "read_product", args: { subjectRef: "SM613" } }],
      content: { role: "model", parts: [{ functionCall: { name: "read_product", args: { subjectRef: "SM613" } } }] } },
    { kind: "FINAL", text: "Áo SM613 giá 499k chị nhé." }];
    const result = await f.run(async () => outputs.shift()!);
    expect(result.terminal.reason).toBe("PASS"); expect(result.enqueued).toBe(1);
    expect(f.commit.mock.calls[0]![1].metaPlan!.effectReadiness!.productIds).toEqual(["SM613"]);
  });
  it("enqueues a static fallback when an existing cart cannot be refreshed", async () => {
    const f = fixture(), scope = commerceScope(), policy = (await fixturePolicy()).bundle!.policy;
    let state = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) state = applySalesCycleCommand({ state,
      expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
    const draft = { identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      lines: [fixtureCartLine()], shopId: scope.shopId, policyRef: { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) } };
    state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "open",
      cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1800000).toISOString() }, now: commerceNow,
      trustedPorts: { resolveCartDraft: () => draft, resolveShopPolicy: () => policy, resolveCartMutation: () => null, resolveInboundMessage: () => null, revalidateCheckout: () => null } }).state;
    f.setCycle(state);
    const result = await f.run(async () => { throw new Error("provider unavailable"); });
    expect(result.terminal.disposition).toBe("FALLBACK"); expect(result.enqueued).toBe(1);
    const prepared = f.commit.mock.calls[0]![1];
    expect(prepared.salesCyclePlan).toMatchObject({ expectedRevision: state.revision, state, events: [] });
    expect(prepared.salesCyclePlan!.effectReadiness).toBeUndefined(); expect(prepared.metaPlan!.effectReadiness!.binding.cart).toBeNull();
  });
  it("does not write customer state after a newer Inbox generation arrives during owner generation", async () => {
    const f = fixture();
    const result = await f.run(async () => {
      f.supersede();
      return { kind: "TOOLS", calls: [{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85 }] } }],
        content: { role: "model", parts: [] } };
    });
    expect(result.terminal.disposition).toBe("NO_SEND");
    expect(f.profile().profile.measurements.find(m => m.kind === "WAIST_CM")!.value).toBe(74);
    expect(f.profileWrite).not.toHaveBeenCalled();
  });
  it("does not rebase a verified reply onto a conversation revision changed after final tools readback", async () => {
    const f = fixture(), create = composition.createCommerceTools;
    vi.spyOn(composition, "createCommerceTools").mockImplementation(async input => {
      const tools = await create(input); let readbacks = 0;
      return { ...tools, async readback() {
        const world = await tools.readback();
        // First readback is the verifier final gate; the second is the ingress handoff to Outbox.
        if (++readbacks === 2) f.changeRevision();
        return world;
      } };
    });
    const result = await f.run();
    expect(f.verifier).toHaveBeenCalledOnce();
    expect(result.terminal).toMatchObject({ disposition: "NO_SEND", reason: "EGRESS_WORLD_CHANGED" });
    expect(f.commit).not.toHaveBeenCalled();
  });
  it("does not write customer state after authority transfers to a human during generation", async () => {
    const f = fixture();
    const result = await f.run(async () => {
      f.transferToHuman();
      return { kind: "TOOLS", calls: [{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85 }] } }],
        content: { role: "model", parts: [] } };
    });
    expect(result.terminal.disposition).toBe("NO_SEND");
    expect(f.profileWrite).not.toHaveBeenCalled();
    expect(f.profile().profile.revision).toBe(1);
  });
  it("enqueues an unchanged verified world with precisely its conversation revision", async () => {
    const f = fixture(), result = await f.run();
    expect(result.terminal).toMatchObject({ disposition: "SEND_ELIGIBLE", reason: "PASS" });
    expect(result.enqueued).toBe(1);
    expect(f.commit.mock.calls[0]![1].expectedStateVersion).toBe(1);
    expect(f.commit.mock.calls[0]![1].metaPlan!.effectReadiness!.binding.conversationRevision).toBe(1);
  });
});
