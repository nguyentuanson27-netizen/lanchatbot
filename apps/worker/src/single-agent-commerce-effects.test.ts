import { describe, expect, it, vi } from "vitest";
import { applySalesCycleCommand, computeBankTransferPolicyHash, computeOrderPreviewHash, createSalesCycleRuntimeState, type SalesCycleRuntimeState, type SalesCycleStateRepositoryV1 } from "@lana/chat-runtime";
import { createCommerceEffectTools } from "./single-agent-commerce-effects.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { runCommerceTurn, type OwnerGeneration } from "./single-agent-commerce-read-only.js";
import { hardPrecheck } from "./single-agent-semantic-verifier-boundary.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureProduct, fixtureProfile, fixtureCartLine } from "./single-agent-commerce.test-support.js";
import type { CartSelectionQuery } from "./realtime-sales-catalog.js";

const bankPolicy = { policyId: "synthetic-bank", version: "1", bankName: "Synthetic bank", accountNumber: "118619000",
  accountHolder: "SYNTHETIC TEST", qrImageUrl: "https://example.invalid/qr.png", customerInstruction: "Thông tin thanh toán từ code.",
  effectiveAt: "2026-10-01T00:00:00.000Z", effectiveUntil: null };
async function setup(clock = () => commerceNow) {
  const scope = commerceScope(), f = fixtureProduct(), policy = (await fixturePolicy()).bundle!;
  let current = createSalesCycleRuntimeState("test-cycle", { pageId: scope.pageId, conversationId: scope.conversationId }, commerceNow);
  // Existing domain precondition, representing earlier verified size advice; never fake it in the effect tool.
  for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) {
    current = applySalesCycleCommand({ state: current, expectedRevision: current.revision,
      command: { kind, commandId: `seed:${kind}` }, now: commerceNow }).state;
  }
  let fault: "NONE" | "BEFORE" | "AFTER" = "NONE";
  const commits: SalesCycleRuntimeState[] = [];
  const repository: SalesCycleStateRepositoryV1 = { read: async () => structuredClone(current), compareAndSwap: vi.fn(async c => {
    if (fault === "BEFORE") throw new Error("transport");
    if (c.expectedRevision !== current.revision) return false;
    current = structuredClone(c.nextState); commits.push(structuredClone(current));
    if (fault === "AFTER") throw new Error("response lost"); return true;
  }) };
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(), initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "MATCHED", matchKind: "EXACT_CODE", product: f.product, score: 1, gap: null }) } });
  const authorize = vi.fn(async () => true), select = vi.fn(async (query?: CartSelectionQuery) => {
    const line = fixtureCartLine(); line.quantity = query?.quantity ?? 1; line.lineTotalVnd = line.posUnitPriceVnd! * line.quantity;
    return { status: "READY" as const, line, shopId: scope.shopId,
    versions: { price: "p1", inventory: "i1", size: "s1", eta: null }, eta: null, etaExpiresAt: null,
    sourceAuthority: "POS_SNAPSHOT" as const, stockStatus: "IN_STOCK" as const, stockAvailableQuantity: 4,
    sourceObservedAt: commerceNow.toISOString(), sourceExpiresAt: new Date(commerceNow.getTime()+1_200_000).toISOString() }; });
  const tools = await createCommerceEffectTools({ base, scope, clock, conversationKey: "test-cycle", repository, authorize,
    policy: async () => policy,
    resolveBankTransferPolicy: () => bankPolicy,
    trustedPorts: {
      resolveCartDraft: () => null, resolveCartMutation: () => null, resolveShopPolicy: () => null,
      resolveInboundMessage: id => ({ messageId: id, pageId: scope.pageId, conversationId: scope.conversationId,
        senderType: "CUSTOMER", observedAt: commerceNow.toISOString(), attachments: [] }),
      revalidateCheckout: () => current.preview?.revalidation ?? null,
    },
    identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
    select,
  });
  const add = { name: "add_to_cart", args: { subjectRef: "SM613", size: "M", color: "navy", quantity: 1 } };
  return { tools, base, scope, policy, authorize, select, repository, commits, add, setFault: (v: typeof fault) => { fault = v; }, current: () => current,
    setCurrent: (value: SalesCycleRuntimeState) => { current = value; } };
}
describe("code-owned commerce effects and recovery", () => {
  it("distinguishes exact cart size/color stock from the aggregate selling-offer stock", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const claim = s.tools.snapshot().protectedClaims.find(c => (c as { type: string }).type === "STOCK") as { scope: { variantId: string }; value: { status: string; availableQuantity: number } };
    const before = s.base.snapshot;
    s.base.snapshot = () => { const c = before(); return { ...c, protectedClaims: [{ ...claim, scope: { ...claim.scope, variantId: "offer:SM613:SM613-DIRECT" }, value: { status: "IN_STOCK", availableQuantity: 116 } }] }; };
    const context = s.tools.snapshot(), stocks = context.protectedClaims.filter(c => (c as { type: string }).type === "STOCK") as typeof claim[];
    expect(stocks.map(c => c.value.availableQuantity)).toEqual([4]);
    const exact = context.boundSubjects.find(b => b.ref === stocks[0]!.scope.variantId)!;
    expect(exact.label).toContain("M"); expect(exact.label).toContain("navy");
  });
  it("does not replace a verified quantity-change reply because its own final readback first introduced current cart facts", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const lineId = s.current().cart!.value.lines[0]!.lineId;
    await s.tools.invoke({ name: "change_cart_item", args: { subjectRef: lineId, action: "SET_QUANTITY", quantity: 2 } });
    const text = "Em đổi số lượng hai chiếc rồi chị nhé.";
    const result = await runCommerceTurn({ scope: s.scope, tools: s.tools, clock: () => commerceNow, latest: "Lấy hai chiếc cho chị nhé.", history: [],
      ownerPrompt: "Tư vấn", verifierPrompt: "Kiểm", owner: async () => ({ kind: "FINAL", text }), verifier: async () => ({ result: { verdict: "PASS", violations: [] } }) });
    expect(result.terminal).toMatchObject({ disposition: "SEND_ELIGIBLE", text });
    expect(s.commits).toHaveLength(2);
  });
  it("keeps verified cart selection price/stock in model context and re-reads it before accepting an old verdict", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    expect(s.tools.snapshot().protectedClaims).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "PRICE", value: { amountVnd: 499000, currency: "VND" } }),
      expect.objectContaining({ type: "STOCK", value: { status: "IN_STOCK", availableQuantity: 4 } }),
    ]));
    const selected = await s.select(); s.select.mockResolvedValue({ ...selected, stockStatus: "PRE_ORDER", stockAvailableQuantity: 0 } as never);
    await s.tools.readback();
    expect(s.tools.snapshot().protectedClaims).toEqual(expect.arrayContaining([expect.objectContaining({ type: "STOCK", value: { status: "PRE_ORDER", availableQuantity: 0 } })]));
  });
  it("keeps selection evidence for the canonical SKU casing used by a committed variant", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const state = structuredClone(s.current());
    state.cart!.value.lines[0]!.components[0]!.componentSku = state.cart!.value.lines[0]!.components[0]!.componentSku.toLowerCase();
    s.setCurrent(state);
    await s.tools.readback();
    expect(s.tools.snapshot().protectedClaims).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "STOCK", value: { status: "IN_STOCK", availableQuantity: 4 } }),
    ]));
  });
  it("reconciles a lost native cart-open response whose accepted prerequisite transitions advanced more than one revision", async () => {
    const s = await setup(); s.setCurrent(createSalesCycleRuntimeState("test-cycle", { pageId: s.scope.pageId, conversationId: s.scope.conversationId }, commerceNow));
    let operationId = "";
    const tools = await createCommerceEffectTools({ base: s.base, scope: s.scope, clock: () => commerceNow, conversationKey: "test-cycle", repository: s.repository,
      identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001", customerProfileId: fixtureProfile().profile.profileId },
      authorize: s.authorize, policy: async () => s.policy, select: s.select,
      executeCommand: async call => { let state = s.current();
        for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: { kind, commandId: kind }, now: commerceNow }).state;
        state = applySalesCycleCommand({ state, expectedRevision: state.revision, command: call.command, trustedPorts: call.trustedPorts, now: commerceNow }).state;
        s.setCurrent(state); operationId = call.command.commandId; throw new Error("CONTROLLED_LOST_RESPONSE"); },
      readReceipt: async () => ({ ref: `receipt:${operationId}`, operationId, subjectRef: s.current().cart!.value.cartId, effect: "CART_OPENED", status: "SUCCESS", stateRevision: s.current().revision,
        recipient: s.scope.recipient, observedAt: commerceNow.toISOString(), expiresAt: new Date(commerceNow.getTime()+300000).toISOString() }) });
    expect(await tools.invoke(s.add)).toMatchObject({ status: "OK" });
    expect(tools.snapshot().effectReceipts[0]?.stateRevision).toBe(4);
  });
  it("exposes current public cart refs and checkout status across turns without private checkout fields", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const state = s.tools.snapshot().state;
    expect(state.salesStage).toBe("CART_OPEN");
    expect(state.cartItems).toEqual([{ subjectRef: s.current().cart!.value.lines[0]!.lineId, productRef: "SM613", offerType: "SM613-DIRECT", quantity: 1,
      components: [{ componentRole: "TOP", size: "M", color: "navy" }] }]);
    expect(state.checkoutStatus).toMatchObject({ previewAvailable: false, purchaseConfirmed: false });
    expect(JSON.stringify(state)).not.toContain("checkoutDraft");
  });
  it("preserves an actual committed checkout handoff and stops the owner instead of falling back", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const executeCommand = vi.fn(async ({command}: {command:{commandId:string}}) => {
      const state = { ...s.current(), revision: s.current().revision+1, stage: "HANDED_OFF" as const,
        processedCommandIds: [...s.current().processedCommandIds, command.commandId] };
      s.setCurrent(state);
      return { status: "HANDOFF" as const, state, reasonCode: "STOCK_UNAVAILABLE" as const, silent: true as const,
        desiredPancakeTag: "NHAN_VIEN" as const, handoffDecision: {} as never };
    });
    const tools = await createCommerceEffectTools({ base: s.base, scope: s.scope, clock: () => commerceNow,
      conversationKey: "test-cycle", repository: s.repository, authorize: s.authorize, policy: async () => s.policy,
      select: s.select, identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001",
        customerProfileId: fixtureProfile().profile.profileId }, executeCommand });
    let calls = 0;
    const verifier = vi.fn();
    const result = await runCommerceTurn({ scope: s.scope, tools, clock: () => commerceNow, latest: "Chốt đơn chị nhé", history: [],
      ownerPrompt: "Tư vấn", verifierPrompt: "Kiểm", owner: async () => { calls++; return {kind:"TOOLS", calls:[{name:"confirm_purchase",args:{}}],
        content:{role:"model",parts:[{functionCall:{name:"confirm_purchase",args:{}}}]}}; }, verifier });
    expect(result.terminal).toMatchObject({ disposition: "HANDOFF", reason: "STOCK_UNAVAILABLE", text: null });
    expect(calls).toBe(1); expect(executeCommand).toHaveBeenCalledTimes(1); expect(verifier).not.toHaveBeenCalled();
    expect(tools.snapshot().effectReceipts).toEqual([]);
  });
  it("keeps the requested selling offer through the trusted selection port", async () => {
    const s = await setup();
    expect((await s.tools.invoke({ ...s.add, args: { ...s.add.args, offerType: "DIRECT" } })).status).toBe("OK");
    expect(s.select).toHaveBeenCalledWith(expect.objectContaining({offerType:"DIRECT"}));
  });
  it("uses the cart's exact selling offer when changing a variant, rather than its generic offer kind", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const line = s.current().cart!.value.lines[0]!;
    await s.tools.invoke({ name: "change_cart_item", args: { subjectRef: line.lineId, action: "SET_COMPONENT_VARIANT", componentRole: "TOP", size: "M" } });
    expect(s.select).toHaveBeenLastCalledWith(expect.objectContaining({ offerType: line.offerId }));
  });
  it("compares the source's canonical size/color identity when a native change uses lowercase labels", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const selected = await s.select(); selected.line.components[0]!.color = "NAVY"; s.select.mockResolvedValue(selected);
    expect(await s.tools.invoke({ name: "change_cart_item", args: { subjectRef: s.current().cart!.value.lines[0]!.lineId,
      action: "SET_COMPONENT_VARIANT", componentRole: "TOP", size: "m", color: "navy" } })).toMatchObject({ status: "OK" });
  });
  it("requires code permission and a bounded subject before any write", async () => {
    const s = await setup(); s.authorize.mockResolvedValue(false);
    expect((await s.tools.invoke(s.add)).status).toBe("REJECTED");
    expect((await s.tools.invoke({ ...s.add, args: { ...s.add.args, subjectRef: "OTHER" } })).status).toBe("REJECTED");
    expect(s.commits).toHaveLength(0);
  });
  it("refreshes persisted permission before an effect and binds the conversation revision", async () => {
    const s = await setup();let permission = true;
    const readAuthority = async () => ({ revision: 9, recipient: s.scope.recipient, bindingVersion: s.scope.bindingVersion,
      privacyAllowed: true, conversationOwner: "BOT", permission });
    const executeCommand = vi.fn(async () => ({ status: "CONFLICT" as const, state: s.current(), reasonCode: "STATE_VERSION_CONFLICT" as const }));
    const tools = await createCommerceEffectTools({ base: s.base, scope: s.scope, clock: () => commerceNow,
      conversationKey: "test-cycle", repository: s.repository, authorize: s.authorize, policy: async () => s.policy,
      select: s.select, identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001",
        customerProfileId: fixtureProfile().profile.profileId }, executeCommand, readAuthority });
    permission = false;expect((await tools.invoke(s.add)).status).toBe("REJECTED");expect(executeCommand).not.toHaveBeenCalled();
    permission = true;await tools.invoke(s.add);
    expect(executeCommand).toHaveBeenCalledWith(expect.objectContaining({ conversationRevision: 9, bindingVersion: s.scope.bindingVersion }));
  });
  it("uses the current runtime executor when composed, never falling back to the raw CAS port", async () => {
    const s = await setup();
    const executeCommand = vi.fn(async () => ({ status: "CONFLICT" as const, state: s.current(), reasonCode: "STATE_VERSION_CONFLICT" as const }));
    const tools = await createCommerceEffectTools({ base: s.base, scope: s.scope, clock: () => commerceNow,
      conversationKey: "test-cycle", repository: s.repository, authorize: s.authorize, policy: async () => s.policy,
      select: s.select, identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001",
        customerProfileId: fixtureProfile().profile.profileId }, executeCommand });
    expect((await tools.invoke(s.add)).status).toBe("REJECTED");
    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(s.repository.compareAndSwap).not.toHaveBeenCalled();
    expect(tools.snapshot().effectReceipts).toEqual([]);
  });
  it("commits through the existing state machine and issues a receipt from readback only", async () => {
    const s = await setup();
    expect(await s.tools.invoke(s.add)).toMatchObject({ status: "OK" });
    expect(s.current().cart!.value.lines[0]!.parentProductId).toBe("SM613");
    expect(s.tools.snapshot().effectReceipts).toHaveLength(1);
    expect(s.tools.snapshot().effectReceipts[0]!.effect).toBe("CART_OPENED");
    expect(hardPrecheck(s.tools.snapshot(), "Đã thêm vào giỏ chị nhé.", commerceNow)).toBeNull();
  });
  it("replaying the same source operation never commits twice", async () => {
    const s = await setup(); await s.tools.invoke(s.add); await s.tools.invoke(s.add);
    expect(s.commits).toHaveLength(1);
    expect(s.tools.snapshot().effectReceipts[0]!.effect).toBe("CART_OPENED");
  });
  it("rehydrates only a current committed receipt after recreating the tool instance", async () => {
    const s = await setup();await s.tools.invoke(s.add);const receipt = s.tools.snapshot().effectReceipts[0]!;
    const fresh = () => createCommerceEffectTools({ base: s.base, scope: s.scope, clock: () => commerceNow,
      conversationKey: "test-cycle", repository: s.repository, authorize: s.authorize, policy: async () => s.policy,
      select: s.select, identity: { cartId: "50000000-0000-4000-8000-000000000001", salesEpisodeId: "60000000-0000-4000-8000-000000000001",
        customerProfileId: fixtureProfile().profile.profileId }, readReceipt: async () => receipt });
    const t = await fresh();expect((await t.invoke(s.add)).status).toBe("OK");
    expect(t.snapshot().effectReceipts[0]!.effect).toBe("CART_OPENED");
    expect(s.repository.compareAndSwap).toHaveBeenCalledTimes(1);
    s.setCurrent({ ...s.current(), revision: s.current().revision+1 });
    expect((await (await fresh()).invoke(s.add)).status).toBe("REJECTED");
    expect(s.repository.compareAndSwap).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed variant inputs without selecting or writing a different variant", async () => {
    const s = await setup();
    for (const a of [{ size: {} }, { color: 1 }, { size: "" }, { color: "x".repeat(65) }]) {
      expect((await s.tools.invoke({ ...s.add, args: { ...s.add.args, ...a } })).status).toBe("REJECTED");
    }
    expect(s.select).not.toHaveBeenCalled(); expect(s.commits).toHaveLength(0);
  });
  it("reconciles commit ambiguity before declaring success, without retrying", async () => {
    const s = await setup(); s.setFault("AFTER");
    expect((await s.tools.invoke(s.add)).status).toBe("OK");
    expect(s.commits).toHaveLength(1);
    expect(s.repository.compareAndSwap).toHaveBeenCalledTimes(1);
    const missing = await setup(); missing.setFault("BEFORE");
    expect((await missing.tools.invoke(missing.add)).status).toBe("UNAVAILABLE");
    expect(missing.tools.snapshot().effectReceipts).toEqual([]);
    expect(missing.repository.compareAndSwap).toHaveBeenCalledTimes(1);
  });
  it("does not renew a receipt's lifetime when a committed response arrives late", async () => {
    let now = commerceNow;
    const s = await setup(() => now), cas = s.repository.compareAndSwap;
    s.repository.compareAndSwap = async update => {
      const committed = await cas(update);
      now = new Date(commerceNow.getTime()+360_000);
      return committed;
    };
    await s.tools.invoke(s.add);
    expect(s.commits).toHaveLength(1);
    const terminal = await s.tools.recover!({ disposition: "FALLBACK", reason: "PROVIDER_ERROR", text: "fallback", fallbackId: null });
    expect(terminal.disposition).toBe("NO_SEND");
  });
  it("cannot confirm a purchase outside the existing validated preview path", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    expect((await s.tools.invoke({ name: "confirm_purchase", args: {} })).status).toBe("REJECTED");
    expect(s.current().confirmation).toBeNull();
  });
  it.each(["COD", "BANK_TRANSFER"] as const)("confirms %s only through valid preview with atomic intents and no checkout PII", async payment => {
    const s = await setup(); await s.tools.invoke(s.add);
    const advance = (command: Parameters<typeof applySalesCycleCommand>[0]["command"]) => {
      const result = applySalesCycleCommand({ state: s.current(), expectedRevision: s.current().revision, command, now: commerceNow,
        trustedPorts: { resolveShopPolicy: () => s.policy.policy, resolveCartDraft: () => null, resolveCartMutation: () => null,
          resolveInboundMessage: () => null, revalidateCheckout: () => null } });
      expect(result.status).toBe("APPLIED"); s.setCurrent(result.state);
    };
    advance({ kind: "CHECKOUT_DETAILS_CAPTURED", commandId: "private-checkout", details: {
      fullName: "Synthetic Customer", phone: "0984997797", address: "Synthetic test address", paymentMethod: payment } });
    advance({ kind: "CART_READY", commandId: "ready", expectedCartVersion: s.current().cart!.value.revision });
    const matched = { status: "MATCHED" as const, sourceVersionBefore: "v1", sourceVersionAfter: "v1", checkedAt: commerceNow.toISOString() };
    const p = { schemaVersion: 1 as const, previewId: "70000000-0000-4000-8000-000000000001",
      cartId: s.current().cart!.value.cartId, cartVersion: s.current().cart!.value.revision, stage: "ORDER_PREVIEW" as const,
      recipient: { fullName: "Synthetic Customer", phone: "0984997797", address: "Synthetic test address", retentionClass: "CART_48H_OPERATIONAL" as const },
      payment: payment === "COD" ? { method: "COD" as const, bankTransferPolicyRef: null } : { method: "BANK_TRANSFER" as const,
        bankTransferPolicyRef: { policyId: bankPolicy.policyId, version: bankPolicy.version, contentHash: computeBankTransferPolicyHash(bankPolicy) } },
      revalidation: { cartId: s.current().cart!.value.cartId, cartVersion: s.current().cart!.value.revision,
        price: matched, inventory: matched, size: matched, eta: matched, eligible: true, checkedAt: commerceNow.toISOString() },
      createdAt: commerceNow.toISOString(), expiresAt: new Date(commerceNow.getTime()+1800000).toISOString() };
    advance({ kind: "PREVIEW_CREATED", commandId: "preview", preview: { ...p, previewHash: computeOrderPreviewHash(p) } });
    const result = await s.tools.invoke({ name: "confirm_purchase", args: {} });
    expect(result).toMatchObject({ status: "OK", data: { purchaseConfirmed: true, externalOrderCreated: false } });
    expect(s.repository.compareAndSwap).toHaveBeenLastCalledWith(expect.objectContaining({ effects: expect.objectContaining({
      transferToHuman: true, confirmation: expect.objectContaining({ cartId: p.cartId }),
      paymentMessageIntent: payment === "COD" ? null : expect.objectContaining({ idempotencyKey: expect.any(String) }),
    }) }));
    expect(JSON.stringify([result, s.tools.snapshot()])).not.toMatch(/0984997797|Synthetic Customer|Synthetic test address|118619000/);
  });
  it("recovers a generation failure after commit with a current receipt, without replaying", async () => {
    const s = await setup(); let n = 0;
    const result = await runCommerceTurn({ ...s, latest: "Lấy áo navy M cho chị.", history: [], clock: () => commerceNow,
      ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm reply.", owner: async (): Promise<OwnerGeneration> => {
        if (n++ === 0) return { kind: "TOOLS", calls: [s.add], content: { role: "model", parts: [{ functionCall: s.add }] } };
        throw new Error("provider stream failed");
      }, verifier: async () => ({ result: { verdict: "PASS", violations: [] } }) });
    expect(s.commits).toHaveLength(1);
    expect(result.terminal.reason).toBe("RECEIPT_BACKED_ACK");
    expect(result.terminal.text).toBe("Em đã thêm món chị chọn vào giỏ.");
    expect(result.sendEnabled).toBe(false);
  });
  it("acknowledges a committed cart change as a change, without claiming a new cart or order", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const lineId = s.current().cart!.value.lines[0]!.lineId;
    await s.tools.invoke({ name: "change_cart_item", args: { subjectRef: lineId, action: "SET_QUANTITY", quantity: 2 } });
    const result = await runCommerceTurn({ scope: s.scope, tools: s.tools, clock: () => commerceNow, latest: "Lấy hai chiếc chị nhé.", history: [],
      ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm.", owner: async () => { throw new Error("provider unavailable"); },
      verifier: async () => { throw new Error("SHOULD_NOT_RUN"); } });
    expect(result.terminal).toMatchObject({ reason: "RECEIPT_BACKED_ACK", text: "Em đã cập nhật lựa chọn trong giỏ." });
    expect(s.commits).toHaveLength(2);
  });
  it("receipt recovery never overrides a privacy/permission no-send", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    expect((await s.tools.recover!({ disposition: "NO_SEND", reason: "PRIVACY", text: null, fallbackId: null })).disposition).toBe("NO_SEND");
  });
  it("does not carry an old receipt acknowledgement into a changed binding", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    s.scope.bindingVersion = "binding-2";
    const recovered = await s.tools.recover!({ disposition: "FALLBACK", reason: "PROVIDER_ERROR", text: "fallback", fallbackId: null });
    expect(recovered.disposition).toBe("NO_SEND");
  });
  it("does not authorize against a newer revision than the one checked for the action", async () => {
    const s = await setup();
    s.authorize.mockImplementation(async () => { s.setCurrent({ ...structuredClone(s.current()), revision: s.current().revision + 1 }); return true; });
    expect((await s.tools.invoke(s.add)).status).toBe("REJECTED");
    expect(s.commits).toHaveLength(0);
  });
  it("does not attach a commit receipt to a different revision read after that commit", async () => {
    const s = await setup(), cas = s.repository.compareAndSwap;
    s.repository.compareAndSwap = async update => {
      const result = await cas(update);
      if (result) s.setCurrent({ ...s.current(), revision: s.current().revision+1 });
      return result;
    };
    expect((await s.tools.invoke(s.add)).status).toBe("UNAVAILABLE");
    expect(s.tools.snapshot().effectReceipts).toEqual([]);
    expect(s.commits).toHaveLength(1);
  });
  it("changes quantity through the same guarded cart owner", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const lineId = s.current().cart!.value.lines[0]!.lineId;
    expect((await s.tools.invoke({ name: "change_cart_item", args: { subjectRef: lineId, action: "SET_QUANTITY", quantity: 2 } })).status).toBe("OK");
    expect(s.current().cart!.value.lines[0]!.quantity).toBe(2);
    expect(s.commits).toHaveLength(2);
  });
  it("does not use an earlier successful receipt to hide a later failed effect", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    await s.tools.invoke({ name: "confirm_purchase", args: {} });
    const recovered = await s.tools.recover!({ disposition: "FALLBACK", reason: "PROVIDER_ERROR", text: "fallback", fallbackId: null });
    expect(recovered.disposition).toBe("HANDOFF");
    expect(recovered.text).toBeNull();
  });
  it("uses current committed cart totals instead of a quote left from an earlier selection", async () => {
    const s = await setup(); await s.tools.invoke(s.add);
    const snapshot = s.base.snapshot;
    s.base.snapshot = () => { const c = snapshot(); c.state.cartQuote = { grandTotalVnd: 1 }; return c; };
    expect(s.tools.snapshot().state.cartQuote).toMatchObject({ cartId: s.current().cart!.value.cartId,
      cartVersion: s.current().cart!.value.revision, grandTotalVnd: s.current().cart!.value.grandTotalVnd });
  });
});
