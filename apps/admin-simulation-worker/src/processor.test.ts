import { describe, expect, it, vi } from "vitest";
import { AdminSimulationProcessor } from "./processor.js";
import type { ClaimedSimulationRun, PolicyComparison, SimulationStore } from "./types.js";

const run: ClaimedSimulationRun = {
  simulationId: "11111111-1111-4111-8111-111111111111",
  leaseToken: "22222222-2222-4222-8222-222222222222",
  pageId: "1198992073286645",
  candidateVersionIds: ["33333333-3333-4333-8333-333333333333"],
  baselineVersionIds: [],
  baselineSource: "UNRESOLVED",
  lookbackDays: 30,
  maxConversations: 100,
  attemptCount: 1,
  sideEffects: "DISABLED",
};

const policies: PolicyComparison = {
  baseline: [],
  candidate: [],
  baselineSource: "HISTORICAL_ACTUAL",
};

describe("AdminSimulationProcessor", () => {
  it("completes an empty history as explicit insufficient evidence", async () => {
    const store = fakeStore();
    store.claim.mockResolvedValue(run);
    store.loadPolicies.mockResolvedValue(policies);
    store.loadHistory.mockResolvedValue([]);
    const processor = new AdminSimulationProcessor(store, "worker-1", { leaseMs: 60_000, maxAttempts: 3 });
    await expect(processor.processOne()).resolves.toBe(true);
    expect(store.complete).toHaveBeenCalledWith(
      run,
      [],
      expect.objectContaining({ totalConversations: 0, evaluatedConversations: 0, sideEffects: "DISABLED" }),
    );
  });

  it("requeues transient database failures through the lease-token fenced failure path", async () => {
    const store = fakeStore();
    store.claim.mockResolvedValue(run);
    store.loadPolicies.mockRejectedValue(Object.assign(new Error("serialization"), { code: "40001" }));
    const processor = new AdminSimulationProcessor(store, "worker-1", { leaseMs: 60_000, maxAttempts: 3 });
    await processor.processOne();
    expect(store.fail).toHaveBeenCalledWith(run, "SERIALIZATION", true, 3);
    expect(store.complete).not.toHaveBeenCalled();
  });
});

function fakeStore() {
  return {
    claim: vi.fn<SimulationStore["claim"]>(),
    loadPolicies: vi.fn<SimulationStore["loadPolicies"]>(),
    loadHistory: vi.fn<SimulationStore["loadHistory"]>(),
    renewLease: vi.fn<SimulationStore["renewLease"]>().mockResolvedValue(true),
    complete: vi.fn<SimulationStore["complete"]>().mockResolvedValue(true),
    fail: vi.fn<SimulationStore["fail"]>().mockResolvedValue(true),
  };
}
