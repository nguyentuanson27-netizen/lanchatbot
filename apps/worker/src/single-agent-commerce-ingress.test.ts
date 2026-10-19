import { afterEach, describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { applySalesCycleCommand, computeBusinessContentHash, createSalesCycleRuntimeState } from "@lana/chat-runtime";
import type { RealtimeCommitInput } from "@lana/database";
import * as composition from "./single-agent-commerce.js";
import { runPersistedCommerceIngress } from "./single-agent-commerce-ingress.js";
import { commerceScope, commerceNow, fixtureProfile, fixturePolicy, fixtureProduct, fixtureCartLine } from "./single-agent-commerce.test-support.js";
import type { OwnerGeneration } from "./single-agent-commerce-read-only.js";
import type { CartSelectionResult } from "./realtime-sales-catalog.js";

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
  const select = vi.fn(async (): Promise<CartSelectionResult> => ({ status: "INVALID", reasonCode: "FIXTURE_SOURCE_UNAVAILABLE", availableSizes: [], availableColors: [] }));
  const inbox = { isBatchCurrent: async () => generation === 1, readGeneration: async () => generation, completeBatch: async () => {} };
  const policy = vi.fn(() => fixturePolicy());
  const catalogRead = vi.fn(async (id: string) => products.find(p => p.product.productId === id));
  const run = (owner: () => Promise<OwnerGeneration> = async () => ({ kind: "FINAL", text: "Dạ chị." })) => runPersistedCommerceIngress({
    batch, fence: 1, scope, store, inbox,
    history: { recordInboundCustomerMessage: async () => {}, listConversationHistory: async () => [] }, transaction: async (work: (client: never) => Promise<unknown>) => work({} as never),
    facts: { ready: async () => true, resolve: async () => {}, close: async () => {}, resolveCartSelection: select }, policy,
    read: { policy: () => fixturePolicy(), initialProducts: products.map(p => p.product), catalog: {
      readProduct: catalogRead, searchText: async () => ({ status: "NOT_FOUND" }) } },
    resolveTagId: () => null, clock: () => commerceNow, ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm tra.", owner, verifier,
  } as unknown as Parameters<typeof runPersistedCommerceIngress>[0]);
  return { run, store, inbox, commit, verifier, select, profileWrite, policy, message, products, catalogRead, profile: () => profile, supersede: () => { generation++; }, changeRevision: () => { revision++; },
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
  it.each([true, false])("uses available scoped names in the actual private preview without model or extra catalog reads (named=%s)", async named => {
    const f = fixture(named ? ["SM613"] : ["OTHER42"]), scope = commerceScope();
    if (named) f.products[0]!.product.title = "Set váy thử nghiệm";
    const resolution = await fixturePolicy(), policy = resolution.bundle!.policy;
    f.policy.mockResolvedValue({ ...resolution, mayAffectOutbound: true,
      bundle: { ...resolution.bundle!, channel: "PUBLISHED", sideEffects: "LIVE_OUTBOUND" } });
    let state = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const)
      state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
    const line = fixtureCartLine();
    const draft = { identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      lines: [line], shopId: scope.shopId, policyRef: { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) } };
    state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "open",
      cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1800000).toISOString() }, now: commerceNow,
      trustedPorts: { resolveCartDraft: () => draft, resolveShopPolicy: () => policy, resolveCartMutation: () => null, resolveInboundMessage: () => null, revalidateCheckout: () => null } }).state;
    f.setCycle(state);
    f.select.mockResolvedValue({ status: "READY", line, shopId: scope.shopId, versions: { price: line.priceAuthority!.priceFactRef, inventory: "i1", size: "s1", eta: "e1" },
      eta: { minDays: 8, maxDays: 14 }, etaExpiresAt: new Date(commerceNow.getTime()+1200000).toISOString(),
      sourceAuthority: "POS_SNAPSHOT", stockStatus: "PRE_ORDER", stockAvailableQuantity: 0,
      sourceObservedAt: commerceNow.toISOString(), sourceExpiresAt: new Date(commerceNow.getTime()+1200000).toISOString() });
    f.message.text = "Tên: Khách thử nghiệm\nSĐT: 0900000000\nĐịa chỉ: Quận 1, TP Hồ Chí Minh\nCOD";
    const owner = vi.fn(async (): Promise<OwnerGeneration> => { throw new Error("PRIVATE_TURN_MUST_NOT_GENERATE"); });
    const result = await f.run(owner);
    expect(result, JSON.stringify(result)).toMatchObject({ mode: "PRIVATE_CODE_PATH", enqueued: 1 });
    expect(owner).not.toHaveBeenCalled(); expect(f.verifier).not.toHaveBeenCalled(); expect(f.catalogRead).not.toHaveBeenCalled();
    const meta = f.commit.mock.calls.at(-1)![1].metaPlan!;
    const text = meta.messages.map(m => m.kind === "TEXT" ? m.text : "").join("\n");
    expect(text).toContain(named ? "1 áo (mẫu “Set váy thử nghiệm”) màu navy, size M" : "1 áo SM613 màu navy, size M");
    expect(text).toContain(named ? "Set váy thử nghiệm: hàng đặt trước" : "SM613: hàng đặt trước");
    expect(text).toContain("Tổng: 524.000đ"); expect(text).toContain("8-14 ngày");
    expect(meta.effectReadiness!.outcome).toBe("READY");
    expect(f.commit.mock.calls.at(-1)![1].salesCyclePlan).toMatchObject({ state: { cart: { value: { lines: [line] } } } });
  });

  it.each(["READY", "PRICE_CHANGED", "UNAVAILABLE"] as const)("binds a code-owned cart summary to current cart/fact readiness before enqueue (%s)", async source => {
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
    const selected: Extract<CartSelectionResult, { status: "READY" }> = { status: "READY", line: fixtureCartLine(), shopId: scope.shopId,
      versions: { price: fixtureCartLine().priceAuthority!.priceFactRef, inventory: "i1", size: "s1", eta: null }, eta: null, etaExpiresAt: null,
      sourceAuthority: "POS_SNAPSHOT", stockStatus: "IN_STOCK", stockAvailableQuantity: 4,
      sourceObservedAt: commerceNow.toISOString(), sourceExpiresAt: new Date(commerceNow.getTime()+1_200_000).toISOString() };
    f.select.mockResolvedValue(selected);
    const create = composition.createCommerceTools;
    vi.spyOn(composition, "createCommerceTools").mockImplementation(async input => {
      const tools = await create(input); await tools.readback();
      return { ...tools, recover: async () => ({ disposition: "SEND_ELIGIBLE", reason: "RECEIPT_BACKED_CART_SUMMARY",
        text: "Tổng 524.000đ, đã gồm phí giao hàng.", fallbackId: null }), async readback() {
        const world = await tools.readback();
        if (source === "UNAVAILABLE") f.select.mockResolvedValue({ status: "INVALID", reasonCode: "SOURCE_UNAVAILABLE", availableSizes: [], availableColors: [] });
        if (source === "PRICE_CHANGED") f.select.mockResolvedValue({ ...selected, line: { ...selected.line, posUnitPriceVnd: 600_000, lineTotalVnd: 600_000 } });
        return world;
      } };
    });
    const result = await f.run(async () => { throw new Error("owner unavailable"); });
    expect(f.verifier).not.toHaveBeenCalled();
    if (source === "READY") {
      expect(result.enqueued, JSON.stringify(result.terminal)).toBe(1);
      const meta = f.commit.mock.calls[0]![1].metaPlan!;
      expect(meta.effectReadiness!.binding.cart).toMatchObject({ cartId: draft.identity.cartId, cartRevision: state.cart!.value.revision });
      expect(meta.protectedClaimTypes).toEqual(expect.arrayContaining(["PRICE", "STOCK", "SHIPPING_FEE"]));
    } else {
      expect(result).toMatchObject({ enqueued: 0, terminal: { disposition: "NO_SEND", reason: "EGRESS_CART_SOURCE_CHANGED" } });
      expect(f.commit).not.toHaveBeenCalled();
    }
  });
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
      return { kind: "TOOLS", calls: [{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85, sourceQuote: "85" }] } }],
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
      return { kind: "TOOLS", calls: [{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85, sourceQuote: "85" }] } }],
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
