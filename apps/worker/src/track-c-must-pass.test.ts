import { describe, expect, it } from "vitest";
import {
  TRACK_C_C1_MUST_PASS_POLICY,
  assertTrackCC1MustPass,
} from "./track-c-must-pass.js";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";

function passingReplay(): TrackBLivePathReplayResult {
  const cases = TRACK_C_C1_MUST_PASS_POLICY.fixtures.map((fixture) => ({
    caseId: fixture.caseId,
    riskClasses: [...fixture.riskClasses],
    status: "PASS" as const,
    reply: {
      contractVersion: "REALTIME_REPLY_DIFFERENTIAL_V1" as const,
      status: "MATCH" as const,
      sideEffects: "DISABLED" as const,
      differences: [],
    },
    state: {
      status: "MATCH" as const,
      differences: [],
    },
    sideEffects: {
      status: "NONE" as const,
      reasonCodes: [],
      capturedCommitPlans: 2,
    },
    riskAssertions: fixture.riskClasses.map((riskClass) => ({
      riskClass,
      assertionCode: `TRACK_B_B3_${riskClass}_POSTCONDITION`,
      status: "PASS" as const,
    })),
  }));
  return {
    contractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1",
    status: "PASS",
    sideEffects: "DISABLED",
    identity: {
      modelProvider: "VERTEX_AI",
      configuredProviderModel: "gemini-3.5-flash-lite",
      fixtureModelVersion: "track-b-replay-fixture-v1",
      capability: "BASELINE_MODEL_CAPABILITY",
      livePathSourceRevision: "c22d0a5181e1e4e67401bf00b79ce9f49cbb663d",
      promptVersion: "lana-realtime-v1",
      promptTemplateHash: "a".repeat(64),
      generationConfigHash: "b".repeat(64),
      policyIdentityHash: "c".repeat(64),
      schemaIdentityHash: "d".repeat(64),
      behaviorContentHash: "e".repeat(64),
      authorityBundleHash: "f".repeat(64),
      factFixtureHash: TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash,
    },
    identityHash: "1".repeat(64),
    captureSetHash: TRACK_C_C1_MUST_PASS_POLICY.captureSetHash,
    coverage: {
      complete: true,
      coveredRiskClasses: [...TRACK_C_C1_MUST_PASS_POLICY.riskPriority],
      missingRiskClasses: [],
    },
    cases,
  };
}

describe("Track C C1 deterministic MUST_PASS guard", () => {
  it("accepts only the frozen PII-safe B3 Commerce fixture anchors", () => {
    const replay = passingReplay();

    expect(assertTrackCC1MustPass(replay)).toBe(replay);
    expect(TRACK_C_C1_MUST_PASS_POLICY).toMatchObject({
      replayContractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1",
      captureSetHash:
        "e2341920e60f8d445b193b0931154f81715856c289bde11aeafff623fd383312",
      factFixtureHash:
        "8f9f61030b5dc4c215ecb613d82b8ca1e86a2df6d3cfecc9cb915605607d2044",
      holdout: "NOT_INCLUDED",
      riskPriority: [
        "PROTECTED_CLAIM",
        "UNSUPPORTED_OUTPUT",
        "PII_SECURITY",
        "UNAUTHORIZED_EFFECT",
        "STALE_OR_MISSING_FACTS",
        "MALFORMED_OUTPUT",
        "SINGLE_REPAIR_BUDGET",
        "VERIFIED_FACTS_FALLBACK",
        "BF04_SIZE",
      ],
    });
    expect(TRACK_C_C1_MUST_PASS_POLICY.fixtures).toEqual([
      {
        caseId: "unsupported-protected-claim",
        riskClasses: ["UNSUPPORTED_OUTPUT", "PROTECTED_CLAIM"],
      },
      { caseId: "pii-security", riskClasses: ["PII_SECURITY"] },
      { caseId: "unauthorized-effect", riskClasses: ["UNAUTHORIZED_EFFECT"] },
      { caseId: "stale-facts", riskClasses: ["STALE_OR_MISSING_FACTS"] },
      { caseId: "missing-facts", riskClasses: ["STALE_OR_MISSING_FACTS"] },
      { caseId: "malformed-output", riskClasses: ["MALFORMED_OUTPUT"] },
      {
        caseId: "single-repair-and-verified-fallback",
        riskClasses: [
          "SINGLE_REPAIR_BUDGET",
          "VERIFIED_FACTS_FALLBACK",
          "BF04_SIZE",
        ],
      },
    ]);
  });

  it.each([
    ["captureSetHash", "0".repeat(64), "TRACK_C_C1_B3_CAPTURE_SET_MISMATCH"],
    [
      "factFixtureHash",
      "0".repeat(64),
      "TRACK_C_C1_B3_FACT_FIXTURE_MISMATCH",
    ],
  ] as const)("rejects a changed frozen %s before candidate quality", (field, value, code) => {
    const replay = passingReplay();
    const changed = field === "captureSetHash"
      ? { ...replay, captureSetHash: value }
      : { ...replay, identity: { ...replay.identity, factFixtureHash: value } };

    expect(() => assertTrackCC1MustPass(changed)).toThrowError(code);
  });

  it("requires every frozen B3 case and its exact risk postconditions", () => {
    const replay = passingReplay();
    const missing = {
      ...replay,
      cases: replay.cases.filter(({ caseId }) => caseId !== "missing-facts"),
    };
    expect(() => assertTrackCC1MustPass(missing)).toThrowError(
      "TRACK_C_C1_B3_CASE_SET_MISMATCH",
    );

    const changedRisk = {
      ...replay,
      cases: replay.cases.map((item) => item.caseId === "malformed-output"
        ? { ...item, riskClasses: ["PROTECTED_CLAIM" as const] }
        : item),
    };
    expect(() => assertTrackCC1MustPass(changedRisk)).toThrowError(
      "TRACK_C_C1_RISK_SET_MISMATCH:malformed-output",
    );

    const extraPostcondition = {
      ...replay,
      cases: replay.cases.map((item) => item.caseId === "pii-security"
        ? {
            ...item,
            riskAssertions: [...item.riskAssertions, {
              riskClass: "PII_SECURITY" as const,
              assertionCode: "UNFROZEN_PII_ASSERTION",
              status: "PASS" as const,
            }],
          }
        : item),
    };
    expect(() => assertTrackCC1MustPass(extraPostcondition)).toThrowError(
      "TRACK_C_C1_POSTCONDITION_SET_MISMATCH:pii-security",
    );
  });

  it("rejects the pre-B2.4 diagnostic or any other case outside the seven-case set", () => {
    const replay = passingReplay();
    const extraCase = {
      ...replay.cases[0]!,
      caseId: "pre-b24-versus-current-live-path",
      riskClasses: [],
      riskAssertions: [],
    };

    expect(() =>
      assertTrackCC1MustPass({
        ...replay,
        cases: [extraCase, ...replay.cases],
      })
    ).toThrowError("TRACK_C_C1_B3_CASE_SET_MISMATCH");
  });

  it("reports the highest-priority deterministic failure, independent of case order", () => {
    const replay = passingReplay();
    const failed = {
      ...replay,
      status: "VIOLATION" as const,
      cases: [...replay.cases].reverse().map((item) => ({
        ...item,
        status: item.caseId === "unsupported-protected-claim" ||
            item.caseId === "pii-security"
          ? "VIOLATION" as const
          : item.status,
        riskAssertions: item.riskAssertions.map((assertion) =>
          assertion.riskClass === "PROTECTED_CLAIM" ||
              assertion.riskClass === "UNSUPPORTED_OUTPUT" ||
              assertion.riskClass === "PII_SECURITY"
            ? { ...assertion, status: "VIOLATION" as const }
            : assertion
        ),
      })),
    };

    expect(() => assertTrackCC1MustPass(failed)).toThrowError(
      "TRACK_C_C1_MUST_PASS_FAILED:PROTECTED_CLAIM:unsupported-protected-claim:" +
        "TRACK_B_B3_PROTECTED_CLAIM_POSTCONDITION",
    );
  });

  it.each([
    ["PII_SECURITY", "pii-security"],
    ["UNAUTHORIZED_EFFECT", "unauthorized-effect"],
    ["STALE_OR_MISSING_FACTS", "stale-facts"],
    ["MALFORMED_OUTPUT", "malformed-output"],
    ["SINGLE_REPAIR_BUDGET", "single-repair-and-verified-fallback"],
    ["VERIFIED_FACTS_FALLBACK", "single-repair-and-verified-fallback"],
    ["BF04_SIZE", "single-repair-and-verified-fallback"],
  ] as const)("rejects %s before quality comparison", (riskClass, caseId) => {
    const replay = passingReplay();
    const failed = {
      ...replay,
      status: "VIOLATION" as const,
      cases: replay.cases.map((item) => item.caseId === caseId
        ? {
            ...item,
            status: "VIOLATION" as const,
            riskAssertions: item.riskAssertions.map((assertion) =>
              assertion.riskClass === riskClass
                ? { ...assertion, status: "VIOLATION" as const }
                : assertion
            ),
          }
        : item),
    };

    expect(() => assertTrackCC1MustPass(failed)).toThrowError(
      `TRACK_C_C1_MUST_PASS_FAILED:${riskClass}:${caseId}:` +
        `TRACK_B_B3_${riskClass}_POSTCONDITION`,
    );
  });

  it("rejects any replay-side effect or non-assertion B3 violation", () => {
    const replay = passingReplay();
    const sideEffect = {
      ...replay,
      status: "VIOLATION" as const,
      cases: replay.cases.map((item) => item.caseId === "unauthorized-effect"
        ? {
            ...item,
            status: "VIOLATION" as const,
            sideEffects: {
              status: "VIOLATION" as const,
              reasonCodes: ["TRACK_B_REPLAY_PROTECTED_EFFECT_EXECUTED"],
              capturedCommitPlans: 2,
            },
          }
        : item),
    };
    expect(() => assertTrackCC1MustPass(sideEffect)).toThrowError(
      "TRACK_C_C1_SIDE_EFFECT_VIOLATION:unauthorized-effect:" +
        "TRACK_B_REPLAY_PROTECTED_EFFECT_EXECUTED",
    );

    const replyViolation = {
      ...replay,
      status: "VIOLATION" as const,
      cases: replay.cases.map((item) => item.caseId === "malformed-output"
        ? {
            ...item,
            status: "VIOLATION" as const,
            reply: { ...item.reply, status: "VIOLATION" as const },
          }
        : item),
    };
    expect(() => assertTrackCC1MustPass(replyViolation)).toThrowError(
      "TRACK_C_C1_B3_CASE_VIOLATION:malformed-output",
    );
  });
});
