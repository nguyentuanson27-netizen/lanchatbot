import { describe, expect, it, vi } from "vitest";
import type { CustomerProfileMergeState } from "@lana/business-tools";
import { createCustomerStateTools, type CustomerStatePort } from "./single-agent-commerce-state.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { hardPrecheck, makeBinding } from "./single-agent-semantic-verifier-boundary.js";
import { commerceScope, commerceNow, fixturePolicy, fixtureProduct, fixtureProfile, fixtureSizeInput } from "./single-agent-commerce.test-support.js";

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
});
