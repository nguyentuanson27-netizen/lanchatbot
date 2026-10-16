import { describe, expect, it, vi } from "vitest";
import { createPersistedCommerceExecutor } from "./single-agent-commerce-session.js";
import { runPersistedCommerceIngress, commerceHistory, isPrivateCommerceText, bindCommerceFacts } from "./single-agent-commerce-ingress.js";
import { commerceScope, commerceNow, fixturePolicy, fixtureCartLine, fixtureProfile } from "./single-agent-commerce.test-support.js";
import { createSalesCycleRuntimeState, applySalesCycleCommand, computeBusinessContentHash } from "@lana/chat-runtime";
import { createConversationState } from "@lana/conversation-engine";

describe("persisted native commerce session", () => {
  it("binds the configured POS alias to canonical shop identity while preserving exact source evidence", async () => {
    const line = fixtureCartLine(); line.priceAuthority!.shopId = "LANA";
    const selected = { status: "READY", shopId: "LANA", line, versions: { price: "p1", inventory: "i1", size: "s1", eta: null } };
    const facts = { ready: vi.fn(), resolve: vi.fn(), close: vi.fn(), resolveCartSelection: vi.fn(async () => structuredClone(selected)) };
    const bound = bindCommerceFacts(facts as never, { shopAlias: "LANA", shopId: "LANA_DESIGN" });
    const query = { shopAlias: "LANA", productId: "SM613", offerType: "DIRECT", size: "M", color: "navy", quantity: 1, lineId: line.lineId };
    const result = await bound.resolveCartSelection!(query);
    expect(result).toMatchObject({ status: "READY", shopId: "LANA_DESIGN", line: { priceAuthority: { shopId: "LANA_DESIGN", metadata: line.priceAuthority!.metadata } }, versions: selected.versions });
    expect(selected.shopId).toBe("LANA"); expect(line.priceAuthority!.shopId).toBe("LANA");
    facts.resolveCartSelection.mockResolvedValue({ ...selected, shopId: "OTHER" });
    expect(await bound.resolveCartSelection!(query)).toMatchObject({ status: "INVALID" });
    facts.resolveCartSelection.mockClear();
    expect(await bound.resolveCartSelection!({ ...query, shopAlias: "OTHER" })).toMatchObject({ status: "INVALID" });
    expect(facts.resolveCartSelection).not.toHaveBeenCalled();
  });
  it.each([true, false])("retains checkout clarification commit success/failure without exposing private input (committed=%s)", async committed => {
    const scope = commerceScope(), fixture = await fixturePolicy(), policy = fixture.bundle!.policy;
    let state = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
    const draft = { identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      lines: [fixtureCartLine()], shopId: scope.shopId, policyRef: { id: policy.policyBundleId, version: policy.policyVersion, contentHash: computeBusinessContentHash(policy) } };
    state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind: "CART_OPENED", commandId: "open", cartDraftRef: { id: "draft", version: "1", contentHash: computeBusinessContentHash(draft) }, expiresAt: new Date(commerceNow.getTime()+1800000).toISOString() },
      now: commerceNow, trustedPorts: { resolveCartDraft: () => draft, resolveShopPolicy: () => policy, resolveCartMutation: () => null, resolveInboundMessage: () => null, revalidateCheckout: () => null } }).state;
    const commit = vi.fn(async () => ({ stateCommitted: committed, metaOutboxCreated: committed ? 1 : 0, handoffEventCreated: false, pancakeTagOutboxCreated: false,
      reasonCodes: committed ? [] : ["CLAIM_STALE"], inboxBatchStatus: committed ? "COMMITTED" : "SUPERSEDED" }));
    const executor = createPersistedCommerceExecutor({ scope, clock: () => commerceNow, latest: "Tên: Khách thử nghiệm", facts: { resolveCartSelection: async () => { throw new Error("NOT_LOOKED_UP"); } } as never,
      policy: async () => ({ ...fixture, mayAffectOutbound: true, bundle: { ...fixture.bundle!, channel: "PUBLISHED", sideEffects: "LIVE_OUTBOUND" } }),
      readAuthority: async () => ({ ...scope, stateVersion: 1, fence: 1, state: { ...createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow }), revision: 1 } }),
      store: { loadOrCreateSalesCycle: async () => ({ state, stateRevision: state.revision }), commitWithinTransaction: commit } as never,
      transaction: work => work({} as never), inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] }, resolveTagId: () => null, deliveryRecipient: "synthetic-recipient" });
    const result = await executor.advancePrivateCheckout();
    if (committed) expect(result).toEqual({ committed: true, messages: 1 });
    else expect(result).toMatchObject({ committed: false, messages: 0,
      failure: { stage: "COMMIT", reasonCode: "COMMIT_NOT_APPLIED", reasonCodes: ["CLAIM_STALE"], inboxBatchStatus: "SUPERSEDED" } });
    expect(JSON.stringify(result)).not.toContain("Khách thử nghiệm");
    const prepared = (commit.mock.calls as unknown as [unknown, { metaPlan: { messages: unknown; effectReadiness: { outcome: string } } }][]) [0]![1];
    expect(JSON.stringify(prepared.metaPlan.messages)).not.toContain("Khách thử nghiệm");
    expect(prepared.metaPlan.effectReadiness.outcome).toBe("READY");
  });
  it("does not put a partly redacted checkout message or recipient name back into model history", () => {
    expect(commerceHistory([{ senderType: "CUSTOMER", text: "Chị lấy áo navy size M." },
      { senderType: "BOT", text: "Người nhận: PRIVATE_NAME - [PHONE]\n[ADDRESS]" },
      { senderType: "CUSTOMER", text: "Tên: PRIVATE_NAME\nSĐT: [PHONE]" }, { senderType: "BOT", text: "Áo còn hàng chị nhé." }]))
      .toEqual([{ role: "customer", text: "Chị lấy áo navy size M." }, { role: "shop", text: "Áo còn hàng chị nhé." }]);
  });
  it("reuses existing privacy redaction for spaced phone numbers and names without treating product refs as private checkout", () => {
    expect(isPrivateCommerceText("SĐT: 0900 000 000")).toBe(true);
    expect(isPrivateCommerceText("Tên: Nguyễn Thị An")).toBe(true);
    expect(isPrivateCommerceText("Thạch Thảo")).toBe(false);
    expect(isPrivateCommerceText("Chị lấy SV2447-AO size M nhé.")).toBe(false);
  });
  it("rejects page-echo ingress before opening a conversational turn", async () => {
    const owner = vi.fn(), verifier = vi.fn();
    const r = await runPersistedCommerceIngress({ batch: { eventKind: "PAGE_ECHO", items: [] }, owner, verifier } as never);
    expect(r.terminal.disposition).toBe("NO_SEND"); expect(owner).not.toHaveBeenCalled(); expect(verifier).not.toHaveBeenCalled();
  });
  it("rejects a stale source before planning, reading private checkout or writing", async () => {
    const write = vi.fn(), policy = vi.fn();
    const session = createPersistedCommerceExecutor({ scope: commerceScope(), clock: () => commerceNow,
      store: { commitWithinTransaction: write } as never, transaction: vi.fn(),
      readAuthority: async () => ({ bindingVersion: "new-source" }) as never, policy,
      facts: {} as never, latest: "Đổi size L nhé", inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] }, resolveTagId: () => null });
    const result = await session.executeCommand({ command: { kind: "CONFIRM_PURCHASE", commandId: "op", intent: { source: "MODEL_STRUCTURED_OUTPUT", intent: "PURCHASE_CONFIRMATION", sourceMessageId: "old" } },
      expectedRevision: 0, conversationRevision: 1, bindingVersion: "binding-1", trustedPorts: {} as never, policy: {} as never });
    expect(result.status).toBe("REJECTED");
    expect(policy).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it("retains the private-checkout authority failure without reading or exposing private input", async () => {
    const policy = vi.fn(), write = vi.fn();
    const executor = createPersistedCommerceExecutor({ scope: commerceScope(), clock: () => commerceNow,
      store: { commitWithinTransaction: write } as never, transaction: vi.fn(),
      readAuthority: async () => ({ bindingVersion: "superseded" }) as never, policy,
      facts: {} as never, latest: "Tên: PRIVATE_CUSTOMER", inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] }, resolveTagId: () => null });
    const result = await executor.advancePrivateCheckout();
    expect(result).toMatchObject({ committed: false, messages: 0,
      failure: { stage: "AUTHORITY", reasonCode: "CURRENT_AUTHORITY_CHANGED" } });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_CUSTOMER");
    expect(policy).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it("distinguishes a missing checkout plan from a commit failure", async () => {
    const scope = commerceScope(), policy = await fixturePolicy(), write = vi.fn();
    const state = createSalesCycleRuntimeState(scope.conversationId, { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
    const executor = createPersistedCommerceExecutor({ scope, clock: () => commerceNow, latest: "Tên: PRIVATE_CUSTOMER",
      facts: {} as never, policy: async () => policy,
      readAuthority: async () => ({ ...scope, stateVersion: 1, fence: 1,
        state: { ...createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow }), revision: 1 } }),
      store: { loadOrCreateSalesCycle: async () => ({ state, stateRevision: state.revision }), commitWithinTransaction: write } as never,
      transaction: work => work({} as never), inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] }, resolveTagId: () => null });
    const result = await executor.advancePrivateCheckout();
    expect(result).toMatchObject({ committed: false, messages: 0, failure: { stage: "PLANNER", reasonCode: expect.any(String) } });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_CUSTOMER"); expect(write).not.toHaveBeenCalled();
  });
});
