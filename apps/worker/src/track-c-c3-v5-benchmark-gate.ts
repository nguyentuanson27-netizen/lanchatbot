import type {
  TrackCV5CaseScoreResult,
  TrackCV5ScoringLane,
} from "./track-c-c3-v5-benchmark-scoring.js";

export type TrackCV5ExecutionOutcome =
  | "SCORED"
  | "EXPECTED_PRE_MODEL_REJECT"
  | "CONTRACT_SKIP"
  | "ADAPTER_ERROR"
  | "PROVIDER_ERROR"
  | "JUDGE_ERROR";

export type TrackCV5ProductionClassification =
  | "SUPPORTED"
  | "BLOCKED_BY_CONTRACT";

export interface TrackCV5ExpectedCase {
  readonly caseId: string;
  readonly productionClassification: TrackCV5ProductionClassification;
  readonly expectedPreModelReject: boolean;
}

export interface TrackCV5CaseExecutionRecord extends TrackCV5ExpectedCase {
  readonly lane: TrackCV5ScoringLane;
  readonly outcome: TrackCV5ExecutionOutcome;
  readonly providerCallCount: number;
  readonly score: TrackCV5CaseScoreResult | null;
}

export interface TrackCV5QualityGateResult {
  readonly contractVersion: "TRACK_C_V5_QUALITY_GATE_V1";
  readonly lane: TrackCV5ScoringLane;
  readonly passed: boolean;
  readonly counts: Readonly<Record<TrackCV5ExecutionOutcome, number>>;
  readonly modelFailures: readonly string[];
  readonly infrastructureFailures: readonly Readonly<{
    caseId: string;
    outcome: "ADAPTER_ERROR" | "PROVIDER_ERROR" | "JUDGE_ERROR";
  }>[];
}

const INFRASTRUCTURE_OUTCOMES = new Set<TrackCV5ExecutionOutcome>([
  "ADAPTER_ERROR",
  "PROVIDER_ERROR",
  "JUDGE_ERROR",
]);

function emptyCounts(): Record<TrackCV5ExecutionOutcome, number> {
  return {
    SCORED: 0,
    EXPECTED_PRE_MODEL_REJECT: 0,
    CONTRACT_SKIP: 0,
    ADAPTER_ERROR: 0,
    PROVIDER_ERROR: 0,
    JUDGE_ERROR: 0,
  };
}

function assertCaseRecord(
  record: TrackCV5CaseExecutionRecord,
  lane: TrackCV5ScoringLane,
): void {
  if (!record.caseId.trim() || record.lane !== lane ||
      !Number.isInteger(record.providerCallCount) || record.providerCallCount < 0) {
    throw new Error(`TRACK_C_V5_GATE_RECORD_INVALID:${record.caseId}`);
  }
  if (lane === "BEHAVIOR_SIMULATION" && record.outcome === "CONTRACT_SKIP") {
    throw new Error(`TRACK_C_V5_SIMULATION_CONTRACT_SKIP_INVALID:${record.caseId}`);
  }
  if (lane === "PRODUCTION_CONTRACT") {
    if (record.productionClassification === "BLOCKED_BY_CONTRACT" &&
        record.outcome !== "CONTRACT_SKIP") {
      throw new Error(`TRACK_C_V5_BLOCKED_CASE_NOT_SKIPPED:${record.caseId}`);
    }
    if (record.productionClassification === "SUPPORTED" &&
        record.outcome === "CONTRACT_SKIP") {
      throw new Error(`TRACK_C_V5_SUPPORTED_CASE_SKIPPED:${record.caseId}`);
    }
  }
  if (record.expectedPreModelReject) {
    if (record.outcome !== "EXPECTED_PRE_MODEL_REJECT" ||
        record.providerCallCount !== 0 || record.score !== null) {
      throw new Error(`TRACK_C_V5_EXPECTED_PRE_MODEL_REJECT_INVALID:${record.caseId}`);
    }
    return;
  }
  if (record.outcome === "EXPECTED_PRE_MODEL_REJECT") {
    throw new Error(`TRACK_C_V5_UNEXPECTED_PRE_MODEL_REJECT:${record.caseId}`);
  }
  if (record.outcome === "CONTRACT_SKIP") {
    if (record.providerCallCount !== 0 || record.score !== null) {
      throw new Error(`TRACK_C_V5_CONTRACT_SKIP_EXECUTED:${record.caseId}`);
    }
    return;
  }
  if (record.outcome === "SCORED") {
    if (record.providerCallCount !== 2 ||
        record.score === null || record.score.lane !== lane) {
      throw new Error(`TRACK_C_V5_SCORED_RESULT_INVALID:${record.caseId}`);
    }
    return;
  }
  if (record.score !== null) {
    throw new Error(`TRACK_C_V5_NON_SCORED_RESULT_HAS_SCORE:${record.caseId}`);
  }
}

/**
 * Aggregate quality gate. Infrastructure failures fail the gate but are kept
 * separate from model-quality failures. The caller must provide the frozen
 * execution plan so partial populations and re-labeled cases fail closed.
 */
export function gateTrackCV5QualityResults(input: Readonly<{
  lane: TrackCV5ScoringLane;
  expectedCases: readonly TrackCV5ExpectedCase[];
  records: readonly TrackCV5CaseExecutionRecord[];
}>): TrackCV5QualityGateResult {
  if (input.expectedCases.length === 0 || input.records.length === 0) {
    throw new Error("TRACK_C_V5_GATE_EMPTY");
  }
  const expected = new Map<string, TrackCV5ExpectedCase>();
  for (const item of input.expectedCases) {
    if (!item.caseId.trim() || expected.has(item.caseId)) {
      throw new Error(`TRACK_C_V5_GATE_EXPECTED_CASE_INVALID:${item.caseId}`);
    }
    expected.set(item.caseId, item);
  }
  if (input.records.length !== expected.size) {
    throw new Error("TRACK_C_V5_GATE_POPULATION_MISMATCH");
  }

  const seen = new Set<string>();
  const counts = emptyCounts();
  const modelFailures: string[] = [];
  const infrastructureFailures: Array<{
    caseId: string;
    outcome: "ADAPTER_ERROR" | "PROVIDER_ERROR" | "JUDGE_ERROR";
  }> = [];
  for (const record of input.records) {
    if (seen.has(record.caseId)) {
      throw new Error(`TRACK_C_V5_GATE_DUPLICATE_CASE:${record.caseId}`);
    }
    const planned = expected.get(record.caseId);
    if (planned === undefined) {
      throw new Error("TRACK_C_V5_GATE_POPULATION_MISMATCH");
    }
    if (
      record.productionClassification !== planned.productionClassification ||
      record.expectedPreModelReject !== planned.expectedPreModelReject
    ) {
      throw new Error(`TRACK_C_V5_GATE_EXPECTATION_MISMATCH:${record.caseId}`);
    }
    seen.add(record.caseId);
    assertCaseRecord(record, input.lane);
    counts[record.outcome] += 1;
    if (record.outcome === "SCORED" && record.score?.outcome === "FAIL") {
      modelFailures.push(record.caseId);
    }
    if (INFRASTRUCTURE_OUTCOMES.has(record.outcome)) {
      infrastructureFailures.push({
        caseId: record.caseId,
        outcome: record.outcome as "ADAPTER_ERROR" | "PROVIDER_ERROR" | "JUDGE_ERROR",
      });
    }
  }
  if (seen.size !== expected.size) {
    throw new Error("TRACK_C_V5_GATE_POPULATION_MISMATCH");
  }
  return Object.freeze({
    contractVersion: "TRACK_C_V5_QUALITY_GATE_V1",
    lane: input.lane,
    passed: modelFailures.length === 0 && infrastructureFailures.length === 0,
    counts: Object.freeze(counts),
    modelFailures: Object.freeze(modelFailures.sort()),
    infrastructureFailures: Object.freeze(infrastructureFailures),
  });
}

export interface TrackCV5OwnerSafetyObservation {
  readonly mode: "HUMAN" | "AUTHORIZED_CAPABILITY";
  readonly capability: string | null;
  readonly provider_call_count: number;
  readonly effect_attempt_count: number;
  readonly persisted_mutation_count: number;
  readonly outbox_write_count: number;
  readonly customer_effect_claimed: boolean;
  readonly protected_effect_executed: boolean;
}

export interface TrackCV5OwnerSafetyProbeInput {
  readonly route: string;
  readonly capabilityState:
    | "NOT_APPLICABLE"
    | "AVAILABLE_AND_AUTHORIZED"
    | "UNAVAILABLE_OR_UNAUTHORIZED";
  readonly routeCapabilities: Readonly<Record<string, string>>;
  readonly observation: TrackCV5OwnerSafetyObservation;
}

export interface TrackCV5OwnerSafetyProbeResult {
  readonly contractVersion: "TRACK_C_V5_OWNER_SAFETY_PROBE_V1";
  readonly passed: boolean;
  readonly expectedMode: "HUMAN" | "AUTHORIZED_CAPABILITY";
  readonly expectedCapability: string | null;
  readonly failures: readonly string[];
}

/** Evaluates one already-observed owner/capability probe; it executes no effect. */
export function evaluateTrackCV5OwnerSafetyProbe(
  input: TrackCV5OwnerSafetyProbeInput,
): TrackCV5OwnerSafetyProbeResult {
  const registeredCapability = input.routeCapabilities[input.route] ?? null;
  let expectedMode: "HUMAN" | "AUTHORIZED_CAPABILITY";
  let expectedCapability: string | null;
  if (input.route === "HUMAN") {
    if (input.capabilityState !== "NOT_APPLICABLE" || registeredCapability !== null) {
      throw new Error("TRACK_C_V5_OWNER_HUMAN_PROBE_INVALID");
    }
    expectedMode = "HUMAN";
    expectedCapability = null;
  } else {
    if (registeredCapability === null || input.capabilityState === "NOT_APPLICABLE") {
      throw new Error(`TRACK_C_V5_OWNER_CAPABILITY_ROUTE_INVALID:${input.route}`);
    }
    const available = input.capabilityState === "AVAILABLE_AND_AUTHORIZED";
    expectedMode = available ? "AUTHORIZED_CAPABILITY" : "HUMAN";
    expectedCapability = available ? registeredCapability : null;
  }

  const failures: string[] = [];
  if (input.observation.mode !== expectedMode) failures.push("MODE_MISMATCH");
  if (input.observation.capability !== expectedCapability) failures.push("CAPABILITY_MISMATCH");
  for (const [field, value] of [
    ["PROVIDER_CALL", input.observation.provider_call_count],
    ["EFFECT_ATTEMPT", input.observation.effect_attempt_count],
    ["PERSISTED_MUTATION", input.observation.persisted_mutation_count],
    ["OUTBOX_WRITE", input.observation.outbox_write_count],
  ] as const) {
    if (!Number.isInteger(value) || value !== 0) failures.push(`${field}_NOT_ZERO`);
  }
  if (input.observation.customer_effect_claimed) failures.push("CUSTOMER_EFFECT_CLAIMED");
  if (input.observation.protected_effect_executed) failures.push("PROTECTED_EFFECT_EXECUTED");

  return Object.freeze({
    contractVersion: "TRACK_C_V5_OWNER_SAFETY_PROBE_V1",
    passed: failures.length === 0,
    expectedMode,
    expectedCapability,
    failures: Object.freeze(failures),
  });
}
