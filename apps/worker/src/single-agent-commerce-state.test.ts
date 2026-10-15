import { describe, expect, it, vi } from "vitest";
import { canonicalCartPolicyLinesV2, type CustomerProfileMergeState } from "@lana/business-tools";
import { createCustomerStateTools, createRealtimeCustomerStatePort, type CustomerStatePort } from "./single-agent-commerce-state.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { hardPrecheck, makeBinding } from "./single-agent-semantic-verifier-boundary.js";
import { runCommerceTurn, type OwnerGeneration } from "./single-agent-commerce-read-only.js";
import { commerceScope, commerceNow, fixturePolicy, fixtureProduct, fixtureProfile, fixtureSizeInput, fixtureCartLine } from "./single-agent-commerce.test-support.js";

async function setup() {
  let stored: CustomerProfileMergeState = fixtureProfile();
  const store: CustomerStatePort = { read: async () => structuredClone(stored),
    compareAndSwap: vi.fn(async (expected, next) => { if (stored.profile.revision !== expected) return false; stored = structuredClone(next); return true; }) };
  const f = fixtureProduct("QU714"), scope = commerceScope();
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(), initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "MATCHED", matchKind: "EXACT_CODE", product: f.product, score: 1, gap: null }) } });
  const sizeInput = vi.fn(async () => fixtureSizeInput());
  const tools = await createCustomerStateTools({ base, scope, store, clock: () => commerceNow, sizeInput });
  return { tools, store, sizeInput, getStored: () => stored, setStored: (s: CustomerProfileMergeState) => { stored = s; } };
}
describe("accepted effective state before dependent tools", () => {
  it("provides a receipt only after profile CAS and committed readback, and invalidates it on another profile revision", async () => {
    const s = await setup();
    await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 74 }] } });
    const world = s.tools.snapshot();
    expect(world.effectReceipts).toEqual(expect.arrayContaining([expect.objectContaining({ effect: "CUSTOMER_STATE_UPDATED", status: "SUCCESS", subjectRef: s.getStored().profile.profileId })]));
    expect(hardPrecheck(world, "Em đã cập nhật số đo cho chị.", commerceNow)).toBeNull();
    const changed = structuredClone(s.getStored()); changed.profile.revision++; s.setStored(changed);
    expect((await s.tools.readback()).effectReceipts).toEqual([]);
  });
  it("does not issue a profile receipt when CAS claims success but readback does not contain that committed state", async () => {
    const s = await setup(); s.store.compareAndSwap = vi.fn(async () => true);
    expect((await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 74 }] } })).status).toBe("REJECTED");
    expect(s.tools.snapshot().effectReceipts).toEqual([]);
  });
  it("resolves a correction before size even when the model lists size first in the batch", async () => {
    const s = await setup();
    const results = await s.tools.invokeBatch([
      { name: "recommend_size", args: { subjectRef: "QU714" } },
      { name: "apply_customer_state", args: { ops: [
        { op: "SET", field: "measurements.WAIST_CM", value: 85 }, { op: "SET", field: "measurements.HIPS_CM", value: 105 },
      ] } },
    ]);
    expect(results[0]!.data).toMatchObject({ status: "RECOMMENDED", recommendedSizes: expect.arrayContaining([expect.objectContaining({ size: "L" })]) });
    expect(s.getStored().profile.revision).toBe(2);
    expect(s.getStored().profile.measurements.find(m => m.kind === "WAIST_CM")!.value).toBe(85);
    expect(s.tools.snapshot().protectedClaims).toEqual(expect.arrayContaining([expect.objectContaining({ type: "SIZE_FIT" })]));
    expect(hardPrecheck(s.tools.snapshot(), "Mình lấy L nhé chị.", commerceNow)).toBeNull();
  });
  it("CLEAR removes a measurement; the engine asks for missing input without a partial size claim", async () => {
    const s = await setup();
    await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "CLEAR", field: "measurements.HIPS_CM" }] } });
    const result = await s.tools.invoke({ name: "recommend_size", args: { subjectRef: "QU714" } });
    expect(result.data).toMatchObject({ status: "NEEDS_MEASUREMENTS", missingInputs: ["HIPS_CM"], recommendedSizes: [] });
    expect(s.tools.snapshot().protectedClaims).toEqual([]);
    expect(s.getStored().fieldEvidence["measurements.HIPS_CM"]!.sourceEventHash).toBeTruthy();
  });
  it("does not run size on old values if state CAS conflicts", async () => {
    const s = await setup();
    s.store.compareAndSwap = vi.fn(async () => false);
    const result = await s.tools.invokeBatch([{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85 }] } },
      { name: "recommend_size", args: { subjectRef: "QU714" } }]);
    expect(result[1]!.status).toBe("REJECTED");
    expect(s.sizeInput).not.toHaveBeenCalled();
  });
  it("validates the full operation batch atomically and rejects protected fields", async () => {
    const s = await setup();
    for (const field of ["profileId", "cart", "price", "permission", "recipient", "effectReceipts"]) {
      const r = await s.tools.invoke({ name: "apply_customer_state", args: { ops: [
        { op: "SET", field: "measurements.WAIST_CM", value: 85 }, { op: "SET", field, value: "injected" },
      ] } });
      expect(r.status).toBe("REJECTED");
    }
    expect(s.getStored().profile.revision).toBe(1);
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it("source-message provenance and revisions are supplied by code", async () => {
    const s = await setup();
    expect((await s.tools.invoke({ name: "apply_customer_state", args: { expectedRevision: 100, ops: [] } })).status).toBe("REJECTED");
    await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "REPLACE", field: "preferences.colors", value: ["navy"] }] } });
    expect(s.getStored().profile.preferences.colors).toEqual(["navy"]);
    expect(s.getStored().fieldEvidence["preferences.colors"]!.source).toBe("CUSTOMER_MESSAGE");
  });
  it("re-reads persisted profile before final eligibility and invalidates a past size result", async () => {
    const s = await setup(); await s.tools.invoke({ name: "recommend_size", args: { subjectRef: "QU714" } });
    const before = makeBinding("turn", "M vừa chị.", s.tools.snapshot());
    const changed = structuredClone(s.getStored()); changed.profile.revision++; changed.profile.measurements[0]!.value = 85; s.setStored(changed);
    const current = await s.tools.readback();
    expect(makeBinding("turn", "M vừa chị.", current).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
    expect(current.protectedClaims).toEqual([]);
  });
  it("invalidates a size result when the verified chart changes before the gate", async () => {
    const s = await setup();
    await s.tools.invoke({ name: "recommend_size", args: { subjectRef: "QU714" } });
    const before = makeBinding("turn", "M vừa chị.", s.tools.snapshot());
    s.sizeInput.mockImplementation(async () => { const changed = fixtureSizeInput(); changed.charts[0]!.chart.reference.version = "2"; return changed; });
    const current = await s.tools.readback();
    expect(makeBinding("turn", "M vừa chị.", current).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
    expect(current.protectedClaims).toEqual([]);
  });
  it("CLEAR of an absent measurement leaves a provenance tombstone against late old updates", async () => {
    const s = await setup();
    const empty = structuredClone(s.getStored()); empty.profile.measurements = [];
    s.setStored(empty);
    // A new turn reads this accepted state before accepting the clear.
    const f = fixtureProduct("QU714"), scope = commerceScope();
    const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(), initialProducts: [f.product],
      catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
    const tools = await createCustomerStateTools({ base, scope, store: s.store, clock: () => commerceNow, sizeInput: s.sizeInput });
    await tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "CLEAR", field: "measurements.HIPS_CM" }] } });
    expect(s.getStored().fieldEvidence["measurements.HIPS_CM"]!.observedAt).toBe(commerceNow.toISOString());
    expect(s.getStored().profile.measurements).toEqual([]);
    expect(s.getStored().profile.revision).toBe(2);
  });
  it("quotes through existing policy arithmetic and invalidates an equal total with changed price provenance", async () => {
    const s = await setup(), policy = (await fixturePolicy()).bundle!.policy;
    const source = { policy, lines: canonicalCartPolicyLinesV2([fixtureCartLine()], commerceScope().shopId)!,
      closingEvidence: { previousState: null, purchaseReady: true, priceObjectionCount: 0, secondConcessionAlreadyApplied: false }, now: commerceNow };
    const tools = await createCustomerStateTools({ base: s.tools, scope: commerceScope(), store: s.store,
      clock: () => commerceNow, sizeInput: s.sizeInput, quoteInput: async () => source });
    const result = await tools.invoke({ name: "quote_cart", args: {} });
    expect(result).toMatchObject({ status: "OK", data: { subtotalVnd: 499000, shippingFeeVnd: 25000, grandTotalVnd: 524000 } });
    const old = makeBinding("turn", "Tổng 524k chị nhé.", tools.snapshot());
    source.lines = source.lines.map(line => ({ ...line, priceEvidence: { ...line.priceEvidence, sourceVersion: "pos-v2" } }));
    expect(makeBinding("turn", "Tổng 524k chị nhé.", await tools.readback()).trustedSnapshotId).not.toBe(old.trustedSnapshotId);
  });
  it("reuses the current profile database CAS and verifies its scoped readback", async () => {
    const scope = commerceScope(), value = fixtureProfile();
    const row = { ...value, revision: value.profile.revision, pageId: scope.pageId, customerHash: scope.customerHash, expiresAt: new Date(commerceNow.getTime()+1000) };
    const db = { loadOrCreateCustomerProfile: vi.fn(async () => row), compareAndSwapCustomerProfile: vi.fn(async () => true) };
    const port = createRealtimeCustomerStatePort(db as Parameters<typeof createRealtimeCustomerStatePort>[0], scope, fixtureProfile, () => commerceNow);
    expect(await port.read()).toEqual(value);
    await port.compareAndSwap(1, value);
    expect(db.compareAndSwapCustomerProfile).toHaveBeenCalledWith(scope.pageId, scope.customerHash, 1,
      { ...value, revision: 1 }, commerceNow);
    row.pageId = "another-page";
    await expect(port.read()).rejects.toThrow("PROFILE_SCOPE");
  });
  it("carries accepted state through two turns and applies the later correction without resetting profile", async () => {
    const s = await setup(); const history: { role: "customer" | "shop"; text: string }[] = [];
    for (const [index, waist, hips, size] of [[0, 85, 105, "L"], [1, 75, 95, "M"]] as const) {
      const scope = { ...commerceScope(), requestId: `turn-${index}`, sourceMessageId: `message-${index}`,
        sourceObservedAt: new Date(commerceNow.getTime()+index*1000).toISOString(), revision: index+1 };
      const clock = () => new Date(commerceNow.getTime()+index*1000);
      const f = fixtureProduct("QU714");
      const base = createReadOnlyTools({ scope, clock, policy: () => fixturePolicy(), initialProducts: [f.product],
        catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
      const tools = await createCustomerStateTools({ base, scope, store: s.store, clock, sizeInput: s.sizeInput });
      expect(tools.snapshot().state.customerProfileRevision).toBe(index+1);
      if (index) expect(tools.snapshot().state.customerMeasurements).toEqual(expect.arrayContaining([{ kind: "WAIST_CM", value: 85 }]));
      const calls = [{ name: "apply_customer_state", args: { ops: [
        { op: "SET", field: "measurements.WAIST_CM", value: waist }, { op: "SET", field: "measurements.HIPS_CM", value: hips }] } },
        { name: "recommend_size", args: { subjectRef: "QU714" } }];
      const latest = index ? "Chị nhầm, eo 75 mông 95 nha." : "Eo chị 85, mông 105, chọn quần này size nào em?";
      let n = 0;
      const result = await runCommerceTurn({ scope, tools, clock, latest, history, ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm reply.",
        owner: async (): Promise<OwnerGeneration> => n++ === 0 ? { kind: "TOOLS", calls,
          content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } } : { kind: "FINAL", text: `Mình lấy ${size} nhé chị.` },
        verifier: async () => ({ result: { verdict: "PASS", violations: [] } }) });
      expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
      expect(s.getStored().profile.revision).toBe(index+2);
      expect(s.getStored().profile.measurements.find(m => m.kind === "WAIST_CM")!.value).toBe(waist);
      history.push({ role: "customer", text: latest }, { role: "shop", text: result.terminal.text! });
    }
  });
});
