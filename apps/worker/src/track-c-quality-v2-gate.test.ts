import { describe, expect, it } from "vitest";
import {
  evaluateTrackCV5OwnerSafetyProbe,
  gateTrackCV5QualityResults,
  type TrackCV5CaseExecutionRecord,
  type TrackCV5ExpectedCase,
} from "./track-c-c3-v5-benchmark-gate.js";
import type { TrackCV5CaseScoreResult } from "./track-c-c3-v5-benchmark-scoring.js";

function score(outcome: "PASS" | "PASS_WITH_NOTE" | "FAIL"): TrackCV5CaseScoreResult {
  const stage = {
    weightedScore: 4,
    threshold: 3.2,
    failedDimensions: [],
    hardFailures: [],
    behaviorRequirementsSatisfied: outcome !== "FAIL",
    passed: outcome !== "FAIL",
  } as const;
  return {
    contractVersion: "TRACK_C_V5_RUBRIC_SCORE_V1",
    lane: "PRODUCTION_CONTRACT",
    domain: "PRICE_VALUE",
    strategist: { stage: "STRATEGIST", ...stage },
    responder: { stage: "RESPONDER", ...stage },
    outcome,
    hardFailures: [],
    tuningNotes: outcome === "PASS_WITH_NOTE" ? ["minor"] : [],
  };
}

function record(
  caseId: string,
  overrides: Partial<TrackCV5CaseExecutionRecord> = {},
): TrackCV5CaseExecutionRecord {
  return {
    caseId,
    lane: "PRODUCTION_CONTRACT",
    productionClassification: "SUPPORTED",
    expectedPreModelReject: false,
    outcome: "SCORED",
    providerCallCount: 2,
    score: score("PASS"),
    ...overrides,
  };
}

function expectedCase(
  value: TrackCV5CaseExecutionRecord,
): TrackCV5ExpectedCase {
  return {
    caseId: value.caseId,
    productionClassification: value.productionClassification,
    expectedPreModelReject: value.expectedPreModelReject,
  };
}

function gate(
  records: readonly TrackCV5CaseExecutionRecord[],
  expectedCases: readonly TrackCV5ExpectedCase[] = records.map(expectedCase),
) {
  return gateTrackCV5QualityResults({
    lane: "PRODUCTION_CONTRACT",
    expectedCases,
    records,
  });
}

describe("Track C C3 V5 benchmark aggregate gate", () => {
  it("passes supported scores, declared zero-call preflight rejects, and blocked skips", () => {
    const records = [
      record("Q001"),
      record("Q002", {
        expectedPreModelReject: true,
        outcome: "EXPECTED_PRE_MODEL_REJECT",
        providerCallCount: 0,
        score: null,
      }),
      record("Q003", {
        productionClassification: "BLOCKED_BY_CONTRACT",
        outcome: "CONTRACT_SKIP",
        providerCallCount: 0,
        score: null,
      }),
    ];
    const result = gate(records);

    expect(result.passed).toBe(true);
    expect(result.counts.SCORED).toBe(1);
    expect(result.counts.EXPECTED_PRE_MODEL_REJECT).toBe(1);
    expect(result.counts.CONTRACT_SKIP).toBe(1);
    expect(result.modelFailures).toEqual([]);
    expect(result.infrastructureFailures).toEqual([]);
  });

  it("rejects a partial execution population before aggregation", () => {
    const q1 = record("Q001");
    const q2 = record("Q002");
    expect(() => gate([q1], [expectedCase(q1), expectedCase(q2)]))
      .toThrow("TRACK_C_V5_GATE_POPULATION_MISMATCH");
  });

  it("rejects caller metadata that disagrees with the frozen execution plan", () => {
    const q1 = record("Q001");
    expect(() => gate([q1], [{
      caseId: "Q001",
      productionClassification: "BLOCKED_BY_CONTRACT",
      expectedPreModelReject: false,
    }])).toThrow("TRACK_C_V5_GATE_EXPECTATION_MISMATCH:Q001");
  });

  it("keeps provider failure separate from model-quality failure", () => {
    const result = gate([record("Q001", {
      outcome: "PROVIDER_ERROR",
      score: null,
      providerCallCount: 1,
    })]);

    expect(result.passed).toBe(false);
    expect(result.modelFailures).toEqual([]);
    expect(result.infrastructureFailures).toEqual([{
      caseId: "Q001",
      outcome: "PROVIDER_ERROR",
    }]);
  });

  it("records a scored FAIL as model quality, not infrastructure", () => {
    const result = gate([record("Q001", { score: score("FAIL") })]);

    expect(result.passed).toBe(false);
    expect(result.modelFailures).toEqual(["Q001"]);
    expect(result.infrastructureFailures).toEqual([]);
  });

  it("refuses to score a production-blocked case", () => {
    const q1 = record("Q001", {
      productionClassification: "BLOCKED_BY_CONTRACT",
    });
    expect(() => gate([q1])).toThrow("TRACK_C_V5_BLOCKED_CASE_NOT_SKIPPED:Q001");
  });

  it("requires exactly two provider calls for a scored two-pass case", () => {
    const q1 = record("Q001", { providerCallCount: 0 });
    expect(() => gate([q1])).toThrow("TRACK_C_V5_SCORED_RESULT_INVALID:Q001");
  });

  it("requires zero provider calls for a production contract skip", () => {
    const q1 = record("Q001", {
      productionClassification: "BLOCKED_BY_CONTRACT",
      outcome: "CONTRACT_SKIP",
      providerCallCount: 1,
      score: null,
    });
    expect(() => gate([q1])).toThrow("TRACK_C_V5_CONTRACT_SKIP_EXECUTED:Q001");
  });
});

describe("Track C C3 V5 owner/safety probe gate", () => {
  const routeCapabilities = {
    HUMAN_OR_ORDER_STATUS_CAPABILITY: "ORDER_STATUS_READ",
  };
  const safeObservation = {
    mode: "AUTHORIZED_CAPABILITY" as const,
    capability: "ORDER_STATUS_READ",
    provider_call_count: 0,
    effect_attempt_count: 0,
    persisted_mutation_count: 0,
    outbox_write_count: 0,
    customer_effect_claimed: false,
    protected_effect_executed: false,
  };

  it("fails an always-HUMAN observation on a positive capability probe", () => {
    const result = evaluateTrackCV5OwnerSafetyProbe({
      route: "HUMAN_OR_ORDER_STATUS_CAPABILITY",
      capabilityState: "AVAILABLE_AND_AUTHORIZED",
      routeCapabilities,
      observation: {
        ...safeObservation,
        mode: "HUMAN",
        capability: null,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("MODE_MISMATCH");
    expect(result.failures).toContain("CAPABILITY_MISMATCH");
  });

  it("passes the exact authorized capability with all effects disabled", () => {
    const result = evaluateTrackCV5OwnerSafetyProbe({
      route: "HUMAN_OR_ORDER_STATUS_CAPABILITY",
      capabilityState: "AVAILABLE_AND_AUTHORIZED",
      routeCapabilities,
      observation: safeObservation,
    });

    expect(result.passed).toBe(true);
    expect(result.expectedCapability).toBe("ORDER_STATUS_READ");
  });

  it("fails any provider/effect activity even when ownership routing matches", () => {
    const result = evaluateTrackCV5OwnerSafetyProbe({
      route: "HUMAN_OR_ORDER_STATUS_CAPABILITY",
      capabilityState: "AVAILABLE_AND_AUTHORIZED",
      routeCapabilities,
      observation: {
        ...safeObservation,
        provider_call_count: 1,
        effect_attempt_count: 1,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("PROVIDER_CALL_NOT_ZERO");
    expect(result.failures).toContain("EFFECT_ATTEMPT_NOT_ZERO");
  });
});
