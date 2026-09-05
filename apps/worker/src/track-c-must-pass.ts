import type {
  TrackBLivePathReplayResult,
  TrackBReplayRiskClass,
} from "./track-b-live-path-replay.js";

const riskPriority = Object.freeze([
  "PROTECTED_CLAIM",
  "UNSUPPORTED_OUTPUT",
  "PII_SECURITY",
  "UNAUTHORIZED_EFFECT",
  "STALE_OR_MISSING_FACTS",
  "MALFORMED_OUTPUT",
  "SINGLE_REPAIR_BUDGET",
  "VERIFIED_FACTS_FALLBACK",
  "BF04_SIZE",
] as const satisfies readonly TrackBReplayRiskClass[]);

const fixture = (
  caseId: string,
  riskClasses: readonly TrackBReplayRiskClass[],
) => Object.freeze({ caseId, riskClasses: Object.freeze([...riskClasses]) });

/**
 * The minimum C1 selection from the existing PII-safe B3 Commerce corpus.
 * The hashes bind the unchanged B3 inputs and verified business-fact fixture;
 * C1 adds no new replay population and intentionally excludes Wave1 holdout.
 */
export const TRACK_C_C1_MUST_PASS_POLICY = Object.freeze({
  replayContractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1" as const,
  captureSetHash:
    "e2341920e60f8d445b193b0931154f81715856c289bde11aeafff623fd383312",
  factFixtureHash:
    "8f9f61030b5dc4c215ecb613d82b8ca1e86a2df6d3cfecc9cb915605607d2044",
  holdout: "NOT_INCLUDED" as const,
  riskPriority,
  fixtures: Object.freeze([
    fixture("unsupported-protected-claim", [
      "UNSUPPORTED_OUTPUT",
      "PROTECTED_CLAIM",
    ]),
    fixture("pii-security", ["PII_SECURITY"]),
    fixture("unauthorized-effect", ["UNAUTHORIZED_EFFECT"]),
    fixture("stale-facts", ["STALE_OR_MISSING_FACTS"]),
    fixture("missing-facts", ["STALE_OR_MISSING_FACTS"]),
    fixture("malformed-output", ["MALFORMED_OUTPUT"]),
    fixture("single-repair-and-verified-fallback", [
      "SINGLE_REPAIR_BUDGET",
      "VERIFIED_FACTS_FALLBACK",
      "BF04_SIZE",
    ]),
  ]),
});

function sameRiskSet(
  actual: readonly TrackBReplayRiskClass[],
  expected: readonly TrackBReplayRiskClass[],
): boolean {
  return actual.length === expected.length &&
    expected.every((riskClass) => actual.includes(riskClass));
}

/**
 * Rejects a candidate before any quality/judge step unless the frozen B3
 * Commerce MUST_PASS evidence is complete and side-effect-free. It returns the
 * same B3 result so downstream comparison reuses, rather than replaces, the
 * existing evidence boundary.
 */
export function assertTrackCC1MustPass(
  replay: TrackBLivePathReplayResult,
): TrackBLivePathReplayResult {
  if (replay.contractVersion !== TRACK_C_C1_MUST_PASS_POLICY.replayContractVersion) {
    throw new Error("TRACK_C_C1_B3_CONTRACT_MISMATCH");
  }
  if (replay.sideEffects !== "DISABLED") {
    throw new Error("TRACK_C_C1_B3_SIDE_EFFECTS_NOT_DISABLED");
  }
  if (replay.captureSetHash !== TRACK_C_C1_MUST_PASS_POLICY.captureSetHash) {
    throw new Error("TRACK_C_C1_B3_CAPTURE_SET_MISMATCH");
  }
  if (replay.identity.factFixtureHash !== TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash) {
    throw new Error("TRACK_C_C1_B3_FACT_FIXTURE_MISMATCH");
  }
  if (!replay.coverage.complete || replay.coverage.missingRiskClasses.length > 0) {
    throw new Error("TRACK_C_C1_B3_COVERAGE_INCOMPLETE");
  }
  if (!sameRiskSet(
    replay.coverage.coveredRiskClasses,
    TRACK_C_C1_MUST_PASS_POLICY.riskPriority,
  )) {
    throw new Error("TRACK_C_C1_B3_COVERAGE_MISMATCH");
  }

  const cases = new Map(replay.cases.map((item) => [item.caseId, item]));
  if (cases.size !== replay.cases.length) {
    throw new Error("TRACK_C_C1_B3_CASE_ID_DUPLICATE");
  }
  const requiredCaseIds = new Set(
    TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => caseId),
  );
  if (
    replay.cases.length !== TRACK_C_C1_MUST_PASS_POLICY.fixtures.length ||
    replay.cases.some(({ caseId }) => !requiredCaseIds.has(caseId))
  ) {
    throw new Error("TRACK_C_C1_B3_CASE_SET_MISMATCH");
  }
  for (const required of TRACK_C_C1_MUST_PASS_POLICY.fixtures) {
    const observed = cases.get(required.caseId);
    if (!observed) {
      throw new Error(`TRACK_C_C1_FIXTURE_MISSING:${required.caseId}`);
    }
    if (!sameRiskSet(observed.riskClasses, required.riskClasses)) {
      throw new Error(`TRACK_C_C1_RISK_SET_MISMATCH:${required.caseId}`);
    }
    if (
      observed.riskAssertions.length !== required.riskClasses.length ||
      observed.riskAssertions.some(({ riskClass, assertionCode }) =>
        !required.riskClasses.includes(riskClass) ||
        assertionCode !== `TRACK_B_B3_${riskClass}_POSTCONDITION`
      )
    ) {
      throw new Error(
        `TRACK_C_C1_POSTCONDITION_SET_MISMATCH:${required.caseId}`,
      );
    }
  }

  for (const riskClass of TRACK_C_C1_MUST_PASS_POLICY.riskPriority) {
    for (const required of TRACK_C_C1_MUST_PASS_POLICY.fixtures) {
      if (!required.riskClasses.includes(riskClass)) continue;
      const observed = cases.get(required.caseId)!;
      const assertionCode = `TRACK_B_B3_${riskClass}_POSTCONDITION`;
      const assertions = observed.riskAssertions.filter((assertion) =>
        assertion.riskClass === riskClass && assertion.assertionCode === assertionCode
      );
      if (assertions.length !== 1) {
        throw new Error(
          `TRACK_C_C1_POSTCONDITION_MISMATCH:${riskClass}:${required.caseId}`,
        );
      }
      if (assertions[0]!.status !== "PASS") {
        throw new Error(
          `TRACK_C_C1_MUST_PASS_FAILED:${riskClass}:${required.caseId}:${assertionCode}`,
        );
      }
    }

    if (riskClass === "UNAUTHORIZED_EFFECT") {
      const sideEffectCase = replay.cases.find(({ sideEffects }) =>
        sideEffects.status !== "NONE"
      );
      if (sideEffectCase) {
        throw new Error(
          `TRACK_C_C1_SIDE_EFFECT_VIOLATION:${sideEffectCase.caseId}:` +
            (sideEffectCase.sideEffects.reasonCodes[0] ?? "UNKNOWN"),
        );
      }
    }
  }

  for (const required of TRACK_C_C1_MUST_PASS_POLICY.fixtures) {
    const observed = cases.get(required.caseId)!;
    if (
      observed.status !== "PASS" ||
      observed.reply.status === "VIOLATION" ||
      observed.reply.sideEffects !== "DISABLED" ||
      observed.state.status === "VIOLATION"
    ) {
      throw new Error(`TRACK_C_C1_B3_CASE_VIOLATION:${required.caseId}`);
    }
  }
  if (replay.status !== "PASS") {
    throw new Error("TRACK_C_C1_B3_REPLAY_VIOLATION");
  }
  return replay;
}
