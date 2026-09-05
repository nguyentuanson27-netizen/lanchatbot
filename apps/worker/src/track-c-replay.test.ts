import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { canonicalJsonV1, type SalesRubricAssessmentV2 } from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import { runTrackCReplay, type TrackCReplayJudgeEnvelope } from "./track-c-replay.js";

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}
function assessment(overall: number, options: Partial<SalesRubricAssessmentV2> = {}): SalesRubricAssessmentV2 {
  return {
    schemaVersion: 2, intent: "hoi_gia", conversationStage: "consulting",
    scores: { relevance: overall, questionResolution: overall, nextStepQuality: overall,
      naturalness: overall, concision: overall, factGrounding: overall, objectionResolution: overall,
      salesProgression: overall, ctaStageFit: overall, overall },
    strengths: [], weaknesses: [], improvedReply: "", recommendationAction: "KEEP", ...options,
  };
}
function envelope(caseId: string): TrackCReplayJudgeEnvelope {
  return {
    context: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
      text: `Mẫu ${caseId} giá bao nhiêu?`, attachmentCount: 0, occurredAt: "2026-09-05T00:00:00.000Z" }],
    verifiedFacts: null, reply: `reply-${caseId}`,
    proposalSummary: { action: "REPLY" }, guardOutcome: { action: "REPLY", blockedReasonCodes: [] },
  };
}
function passingReplay(): TrackBLivePathReplayResult {
  const cases = TRACK_C_C1_MUST_PASS_POLICY.fixtures.map((fixture) => {
    const observed = envelope(fixture.caseId);
    return {
      caseId: fixture.caseId, riskClasses: [...fixture.riskClasses], status: "PASS" as const,
      reply: { contractVersion: "REALTIME_REPLY_DIFFERENTIAL_V1" as const, status: "MATCH" as const,
        sideEffects: "DISABLED" as const, differences: [] },
      state: { status: "MATCH" as const, differences: [] },
      sideEffects: { status: "NONE" as const, reasonCodes: [], capturedCommitPlans: 2 },
      riskAssertions: fixture.riskClasses.map((riskClass) => ({ riskClass,
        assertionCode: `TRACK_B_B3_${riskClass}_POSTCONDITION`, status: "PASS" as const })),
      qualityEnvelopeHashes: { baseline: sha256(observed), candidate: sha256(observed) },
    };
  });
  return {
    contractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1", status: "PASS", sideEffects: "DISABLED",
    identity: { modelProvider: "VERTEX_AI", configuredProviderModel: "gemini-3.5-flash-lite",
      fixtureModelVersion: "track-b-replay-fixture-v1", capability: "BASELINE_MODEL_CAPABILITY",
      livePathSourceRevision: "c22d0a5181e1e4e67401bf00b79ce9f49cbb663d", promptVersion: "lana-realtime-v1",
      promptTemplateHash: "a".repeat(64), generationConfigHash: "b".repeat(64), policyIdentityHash: "c".repeat(64),
      schemaIdentityHash: "d".repeat(64), behaviorContentHash: "e".repeat(64), authorityBundleHash: "f".repeat(64),
      factFixtureHash: TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash },
    identityHash: "1".repeat(64), captureSetHash: TRACK_C_C1_MUST_PASS_POLICY.captureSetHash,
    coverage: { complete: true, coveredRiskClasses: [...TRACK_C_C1_MUST_PASS_POLICY.riskPriority], missingRiskClasses: [] }, cases,
  };
}
function replayInput(scores: readonly (readonly [number, number])[] = [], assessments: readonly SalesRubricAssessmentV2[] = []) {
  let scoreIndex = 0;
  const judge = {
    judgeSalesReplyV2Descriptor: vi.fn(() => ({ provider: "VERTEX_AI" as const, model: "gemini-3.5-flash-lite",
      promptRubric: { version: "v2" }, generationConfig: { temperature: 0.1 } })),
    judgeSalesReplyV2: vi.fn(async () => {
      const index = scoreIndex++;
      return assessments[index] ?? assessment(
        (scores[Math.floor(index / 2)] ?? [4, 4] as const)[index % 2]!,
      );
    }),
  };
  return { mustPassReplay: passingReplay(), judge, cases: TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => {
    const observed = envelope(caseId);
    return { caseId, judge, accepted: observed, candidate: observed };
  }) };
}

describe("Track C C2 offline replay", () => {
  it("replays exactly the frozen seven-case corpus with side effects disabled", async () => {
    const input = replayInput(); const result = await runTrackCReplay(input);
    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(14);
    expect(result).toMatchObject({ contractVersion: "TRACK_C_REPLAY_V1", sideEffects: "DISABLED", holdout: "NOT_INCLUDED",
      deterministic: { status: "PASS", caseCount: 7, riskClassCount: 9 },
      aggregate: { better: 0, same: 7, worse: 0, materialRegressionClusters: [] } });
    expect(result.cases.map(({ caseId }) => caseId)).toEqual(TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => caseId));
    expect(result.cases.every(({ quality }) => quality.rationale.materialReasonCode === "NO_MATERIAL_SCORE_DELTA")).toBe(true);
  });
  it("rejects a changed corpus before calling the offline judge", async () => {
    const input = replayInput(); input.cases[0]!.caseId = "pre-b24-versus-current-live-path";
    await expect(runTrackCReplay(input)).rejects.toThrow("TRACK_C_C2_CASE_SET_MISMATCH");
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });
  it("rejects caller-authored envelopes that do not match exact B3 observations", async () => {
    const input = replayInput(); input.cases[0]!.candidate = { ...input.cases[0]!.candidate, reply: "unbound reply" };
    await expect(runTrackCReplay(input)).rejects.toThrow("TRACK_C_C2_B3_ENVELOPE_MISMATCH:unsupported-protected-claim");
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });
  it("retains bounded rationale integrity and distinct material regression clusters", async () => {
    const worseFactGrounding = assessment(3, { scores: { ...assessment(3).scores, factGrounding: 1 }, weaknesses: ["fact grounding"] });
    const sameWithDifferentRationale = assessment(4, { strengths: ["clear answer"], recommendationAction: "HANDOFF_REVIEW" });
    const first = await runTrackCReplay(replayInput([], [assessment(4), worseFactGrounding, sameWithDifferentRationale, assessment(4),
      assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4)]));
    const second = await runTrackCReplay(replayInput([], [assessment(4), worseFactGrounding, sameWithDifferentRationale, assessment(4),
      assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4)]));
    expect(first.aggregate).toEqual({ better: 0, same: 6, worse: 1, materialRegressionClusters: [{
      caseIds: ["unsupported-protected-claim"], riskClasses: ["PROTECTED_CLAIM", "UNSUPPORTED_OUTPUT"],
      materialReasonCode: "SCORE_REGRESSION:factGrounding",
    }] });
    expect(first.cases[0]!.quality.rationale.candidateAssessmentHash).not.toBe(first.cases[1]!.quality.rationale.acceptedAssessmentHash);
    expect(first.repeatabilityHash).toBe(second.repeatabilityHash);
  });
});
