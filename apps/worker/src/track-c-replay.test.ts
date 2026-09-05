import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { canonicalJsonV1, type SalesRubricAssessmentV2 } from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { buildContextV2Capture } from "./context-v2.js";
import { buildTrackCOfflineCandidateRequest } from "./track-c-offline-candidate.js";
import { validateTrackCOfflineCandidate } from "./track-c-offline-candidate-validation.js";
import { TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import {
  runTrackCReplay,
  type TrackCOfflineCandidateValidatedEnvelope,
  type TrackCReplayJudgeEnvelope,
} from "./track-c-replay.js";

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
function frozenCapture(caseId: string) {
  const now = new Date("2026-09-05T00:00:00.000Z");
  return buildContextV2Capture({
    canonicalEvidence: {
      dialogueEvidence: {
        schemaVersion: 1, contractVersion: "CANONICAL_DIALOGUE_EVIDENCE_V1",
        act: "REQUEST", contributors: ["DETERMINISTIC_RUNTIME"], confidenceBand: "HIGH",
        sourceMessageIdHash: "a".repeat(64), evidenceHash: "b".repeat(64),
        reasonCodes: [], authorization: "NONE",
      },
      buyingIntent: {
        schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1",
        decision: "CONSIDERING", requestedAction: "NONE", quantity: null, productId: null,
        contributors: ["DETERMINISTIC_RUNTIME"], sourceMessageIdHash: "a".repeat(64),
        evidenceHash: "c".repeat(64), reasonCodes: [], evaluatedAt: now.toISOString(), authorization: "NONE",
      },
    },
    verifiedClaims: [], readiness: [],
    finalCommerceState: {
      schemaVersion: 2, conversationKey: caseId,
      routing: { pageId: "track-c-fixture", conversationId: caseId }, revision: 1,
      stage: "DISCOVERY", cart: null, commerceContext: null, negotiation: null,
      checkoutDraft: null, clarification: null, preview: null, confirmation: null,
      processedCommandIds: [], updatedAt: now.toISOString(),
    },
    finalTurnEvidence: {
      schemaVersion: 2, contractVersion: "FINAL_TURN_EVIDENCE_V2",
      sourceMessagePk: "00000000-0000-4000-8000-000000000001",
      sourceMessageIdHash: "a".repeat(64), preTransitionConversationRevision: 0,
      finalConversationRevision: 1, preTransitionSalesCycleRevision: 0, finalSalesCycleRevision: 1,
    },
    productBinding: {
      schemaVersion: 2, contractVersion: "PRODUCT_BINDING_V2", status: "NOT_REQUIRED",
      productIds: [], catalogVersion: null,
    },
    owner: "BOT", handoffReasonCode: null, now, sourceOccurredAt: now,
  });
}
function offlineCandidate(
  caseId: string,
  accepted: TrackCReplayJudgeEnvelope,
  options: Readonly<{ reply?: string }> = {},
): TrackCOfflineCandidateValidatedEnvelope {
  const capture = frozenCapture(caseId);
  if (capture.status !== "BUILT" || capture.context === null) throw new Error("TEST_CAPTURE_REQUIRED");
  const request = buildTrackCOfflineCandidateRequest({
    modelResource: "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite",
    capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"),
    systemInstruction: "Offline-only Track C test candidate.",
  });
  return validateTrackCOfflineCandidate({
    capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), request,
    providerModelVersion: "gemini-3.5-flash-lite", accepted,
    output: {
      schemaVersion: 2, contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
      contextHash: capture.context.contextHash,
      productBinding: { status: "NOT_REQUIRED", productIds: [] },
      segments: [{ kind: "GENERAL", text: options.reply ?? `offline-candidate-${caseId}` }],
      strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
    },
  });
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
    return {
      caseId, judge,
      accepted: { origin: "B3_LIVE_OBSERVATION" as const, quality: observed },
      candidate: offlineCandidate(caseId, observed),
    };
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
    const input = replayInput(); input.cases[0]!.accepted = {
      origin: "B3_LIVE_OBSERVATION",
      quality: { ...input.cases[0]!.accepted.quality, reply: "unbound reply" },
    };
    await expect(runTrackCReplay(input)).rejects.toThrow("TRACK_C_C2_B3_ENVELOPE_MISMATCH:unsupported-protected-claim");
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });
  it("accepts a distinct candidate only through its independently guarded offline origin", async () => {
    const input = replayInput();

    const result = await runTrackCReplay(input);

    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(14);
    expect(result.cases.every(({ deterministic }) =>
      deterministic.candidateOrigin === "OFFLINE_CANDIDATE_DETERMINISTICALLY_VALIDATED"
    )).toBe(true);
  });
  it("rejects offline candidate envelope substitution or a guard failure before judge calls", async () => {
    const substituted = replayInput();
    substituted.cases[0]!.candidate = {
      ...substituted.cases[0]!.candidate,
    };
    await expect(runTrackCReplay(substituted)).rejects.toThrow(
      "TRACK_C_C3_OFFLINE_CANDIDATE_GUARD_FAILED",
    );
    expect(substituted.judge.judgeSalesReplyV2).not.toHaveBeenCalled();

    const guardFailed = replayInput();
    const accepted = guardFailed.cases[0]!.accepted.quality;
    const capture = frozenCapture("unsupported-protected-claim");
    if (capture.status !== "BUILT" || capture.context === null) throw new Error("TEST_CAPTURE_REQUIRED");
    const context = capture.context;
    const request = buildTrackCOfflineCandidateRequest({
      modelResource: "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), systemInstruction: "candidate",
    });
    expect(() => validateTrackCOfflineCandidate({
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), request,
      providerModelVersion: "gemini-3.5-flash-lite", accepted,
      output: {
        schemaVersion: 2, contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
        contextHash: context.contextHash,
        productBinding: { status: "NOT_REQUIRED", productIds: [] },
        segments: [{ kind: "EFFECT_CLAIM", text: "Đơn đã đặt xong.", effect: "ORDER_PLACED" }],
        strategy: "HOLD_POSITION", cta: "NONE",
      },
    })).toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_PROVENANCE_INVALID");
    expect(() => validateTrackCOfflineCandidate({
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), request,
      providerModelVersion: "gemini-3.5-flash-lite", accepted,
      output: {
        schemaVersion: 2, contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
        contextHash: "0".repeat(64),
        productBinding: { status: "NOT_REQUIRED", productIds: [] },
        segments: [{ kind: "GENERAL", text: "Chị cho em biết mẫu đang xem nhé." }],
        strategy: "ASK_CLARIFICATION", cta: "ASK_PRODUCT",
      },
    })).toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_CONTEXT_MISMATCH");
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
  it("does not label a score regression as recommendation improvement", async () => {
    const accepted = assessment(4, { recommendationAction: "REWRITE" });
    const candidate = assessment(3, {
      scores: { ...assessment(3).scores, factGrounding: 1 },
      recommendationAction: "KEEP",
    });
    const result = await runTrackCReplay(replayInput([], [accepted, candidate]));

    expect(result.cases[0]!.quality).toMatchObject({
      disposition: "WORSE",
      reviewReasonCodes: ["UNEXPECTED_REGRESSION", "JUDGE_DISAGREEMENT"],
      rationale: { materialReasonCode: "SCORE_REGRESSION:factGrounding" },
    });
    expect(result.aggregate.materialRegressionClusters[0]).toMatchObject({
      materialReasonCode: "SCORE_REGRESSION:factGrounding",
    });
  });
});
