import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  canonicalJsonV1,
  type BusinessFactEnvelopeV1,
  type SalesRubricAssessmentV2,
} from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { buildContextV2Capture } from "./context-v2.js";
import { buildTrackCOfflineCandidateRequest } from "./track-c-offline-candidate.js";
import { validateTrackCOfflineCandidate } from "./track-c-offline-candidate-validation.js";
import { TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import { TRACK_C_QUALITY_SUITE_V1 } from "./track-c-quality-suite.js";
import {
  TRACK_C_ACCEPTED_V22_BASELINE,
  assertTrackCOfflineHumanReviewTextSafe,
  runTrackCOfflineQuality,
} from "./track-c-offline-runner.js";
import {
  runTrackCReplay,
  type TrackCOfflineCandidateValidatedEnvelope,
  type TrackCReplayInput,
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
function envelope(
  caseId: string,
  verifiedFacts: BusinessFactEnvelopeV1 | null = null,
): TrackCReplayJudgeEnvelope {
  return {
    context: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
      text: `Mẫu ${caseId} giá bao nhiêu?`, attachmentCount: 0, occurredAt: "2026-09-05T00:00:00.000Z" }],
    verifiedFacts, reply: `reply-${caseId}`,
    proposalSummary: { action: "REPLY" }, guardOutcome: {
      expectedOwner: [
        "unsupported-protected-claim",
        "stale-facts",
        "missing-facts",
      ].includes(caseId) ? "HUMAN" : "BOT",
      action: "REPLY",
      blockedReasonCodes: [],
    },
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
  options: Readonly<{ reply?: string; output?: unknown }> = {},
): TrackCOfflineCandidateValidatedEnvelope {
  const capture = frozenCapture(caseId);
  if (capture.status !== "BUILT" || capture.context === null) throw new Error("TEST_CAPTURE_REQUIRED");
  const request = buildTrackCOfflineCandidateRequest({
    modelResource: "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite",
    capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"),
    evaluationContext: accepted.context,
    systemInstruction: "Offline-only Track C test candidate.",
  });
  return validateTrackCOfflineCandidate({
    caseId,
    capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), request,
    providerModelVersion: "gemini-3.5-flash-lite", accepted,
    output: options.output ?? (
      (accepted.guardOutcome as { expectedOwner?: unknown }).expectedOwner === "HUMAN"
        ? null
        : {
          segments: [{ kind: "GENERAL", text: options.reply ?? `offline-candidate-${caseId}` }],
          strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
        }
    ),
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
function replayInput(
  scores: readonly (readonly [number, number])[] = [],
  assessments: readonly SalesRubricAssessmentV2[] = [],
  factsByCase: Readonly<Record<string, BusinessFactEnvelopeV1 | null>> = {},
  qualitySuiteBetter = false,
) {
  let scoreIndex = 0;
  const judge = {
    judgeSalesReplyV2Descriptor: vi.fn(() => ({ provider: "VERTEX_AI" as const, location: "global", model: "gemini-3.6-flash",
      promptRubric: { version: "v2" }, generationConfig: { thinkingConfig: { thinkingLevel: "HIGH" } } })),
    judgeSalesReplyV2: vi.fn(async () => {
      const index = scoreIndex++;
      if (qualitySuiteBetter && index >= 8) {
        return {
          assessment: assessment(index % 2 === 0 ? 3 : 4),
          latencyMs: index,
          tokenUsage: {},
        };
      }
      return {
        assessment: assessments[index] ?? assessment(
          (scores[Math.floor(index / 2)] ?? [4, 4] as const)[index % 2]!,
        ),
        latencyMs: index,
        tokenUsage: {},
      };
    }),
  };
  const cases = TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => {
    const observed = envelope(caseId, factsByCase[caseId] ?? null);
    return {
      caseId, judge,
      accepted: { origin: "B3_LIVE_OBSERVATION" as const, quality: observed },
      candidate: offlineCandidate(caseId, observed),
    };
  });
  const mustPassReplay = passingReplay();
  const input = {
    mustPassReplay: {
      ...mustPassReplay,
      cases: mustPassReplay.cases.map((replayCase) => {
        const inputCase = cases.find(({ caseId }) => caseId === replayCase.caseId);
        if (inputCase === undefined) throw new Error(`TEST_CASE_REQUIRED:${replayCase.caseId}`);
        const qualityEnvelopeHashes = replayCase.qualityEnvelopeHashes;
        if (qualityEnvelopeHashes === undefined) throw new Error(`TEST_ENVELOPE_REQUIRED:${replayCase.caseId}`);
        return {
          ...replayCase,
          qualityEnvelopeHashes: {
            baseline: sha256(inputCase.accepted.quality),
            candidate: sha256(inputCase.candidate),
          },
        };
      }),
    },
    judge,
    cases,
  };
  input satisfies TrackCReplayInput;
  return input;
}

function qualitySuiteInput() {
  return {
    cases: TRACK_C_QUALITY_SUITE_V1.map(({ id }) => ({
      caseId: id,
      accepted: {
        reply: `accepted ${id}`,
        proposalSummary: { action: "REPLY" },
        guardOutcome: { action: "REPLY", sideEffects: "DISABLED" },
      },
      candidate: {
        reply: `candidate ${id}`,
        proposalSummary: { action: "REPLY" },
        guardOutcome: { action: "REPLY", sideEffects: "DISABLED" },
      },
    })),
  };
}

describe("Track C C2 offline replay", () => {
  it("fails C1 before Judge when a HUMAN-owned B3 candidate emits a BOT reply", async () => {
    const input = replayInput();
    const humanCase = input.cases.find(({ caseId }) =>
      caseId === "unsupported-protected-claim",
    );
    if (humanCase === undefined) throw new Error("TEST_HUMAN_CASE_REQUIRED");

    expect(() => offlineCandidate(humanCase.caseId, humanCase.accepted.quality, {
      output: {
        segments: [{ kind: "GENERAL", text: "Em sẽ trả lời thay nhân viên." }],
        strategy: "HOLD_POSITION",
        cta: "NONE",
      },
    })).toThrow("TRACK_C_C1_HUMAN_REPLY_FORBIDDEN:unsupported-protected-claim");
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("runs the frozen v22 baseline through MUST_PASS, guarded replay, and V2 judge evidence", async () => {
    const input = replayInput([], [], {}, true);

    const evidence = await runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
    });
    expect(evidence.qualitySuite).toMatchObject({
      mandatory: true,
      aggregate: { caseCount: 50, worse: 0 },
      gate: { status: "AWAITING_OWNER_APPROVAL", selectionAuthorized: false },
    });
    expect(evidence.candidateReadiness).toEqual({
      status: "AWAITING_OWNER_APPROVAL",
      selectionAuthorized: false,
    });

    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(108);
    const firstB3Quality = evidence.replay.cases.find(({ quality }) =>
      quality.status === "SCORED",
    )?.quality;
    if (firstB3Quality?.status !== "SCORED") {
      throw new Error("TEST_B3_JUDGE_IDENTITY_REQUIRED");
    }
    const firstSuiteHistory = evidence.qualitySuite?.history.cases[0];
    if (firstSuiteHistory?.status !== "SCORED") {
      throw new Error("TEST_SUITE_JUDGE_IDENTITY_REQUIRED");
    }
    expect(firstSuiteHistory.identity.judge).toEqual(
      firstB3Quality.identity.judge,
    );
    expect(evidence).toMatchObject({
      contractVersion: "TRACK_C_OFFLINE_RUNNER_V1",
      evaluationOnly: true,
      sideEffects: "DISABLED",
      runKind: "CANDIDATE_EVALUATION",
      outcome: "QUALITY_COMPARISON",
      acceptedBaseline: {
        release: "track-b-v22-b0aeb8907",
        sourceCommit: "b0aeb8907dae4ae2d9051b409ba25fa3f17fd188",
      },
      candidate: { distinctReplyCaseCount: 4 },
      replay: { aggregate: { better: 0, same: 4, worse: 0, handoffCorrect: 3, scoredCaseCount: 4 } },
    });
    expect(evidence.judgeMetrics).toHaveLength(4);
    expect(evidence.humanReview.cases).toHaveLength(4);
    expect(evidence.humanReview.cases[0]).toMatchObject({
      caseId: "pii-security",
      accepted: { reply: "reply-pii-security" },
      candidate: { reply: "offline-candidate-pii-security" },
    });
  });

  it("requires the mandatory 50-case quality gate for a candidate evaluation", async () => {
    const input = replayInput();

    await expect(runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
    })).rejects.toThrow("TRACK_C_OFFLINE_RUNNER_QUALITY_SUITE_REQUIRED");
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("keeps a B3 quality regression out of the owner-approval state", async () => {
    const input = replayInput([[4, 3], [4, 4], [4, 4], [4, 4]], [], {}, true);

    const evidence = await runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
    });

    expect(evidence.replay.aggregate.worse).toBe(1);
    expect(evidence.qualitySuite?.gate.status).toBe("AWAITING_OWNER_APPROVAL");
    expect(evidence.candidateReadiness).toEqual({
      status: "REGRESSION_DETECTED",
      selectionAuthorized: false,
    });
  });

  it("records correct HUMAN handoffs as N/A and judges only BOT-eligible cases", async () => {
    const input = replayInput([], [], {}, true);
    const evidence = await runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({ caseId, accepted, candidate })),
    });

    expect(evidence.replay.cases.filter(({ quality }) => quality.status === "HANDOFF_CORRECT")
      .map(({ caseId, quality }) => ({ caseId, quality }))).toEqual([
        {
          caseId: "unsupported-protected-claim",
          quality: {
            status: "HANDOFF_CORRECT",
            disposition: null,
            overallScoreDelta: null,
            requiresHumanReview: false,
            reviewReasonCodes: [],
            rationale: null,
            identity: null,
          },
        },
        {
          caseId: "stale-facts",
          quality: {
            status: "HANDOFF_CORRECT",
            disposition: null,
            overallScoreDelta: null,
            requiresHumanReview: false,
            reviewReasonCodes: [],
            rationale: null,
            identity: null,
          },
        },
        {
          caseId: "missing-facts",
          quality: {
            status: "HANDOFF_CORRECT",
            disposition: null,
            overallScoreDelta: null,
            requiresHumanReview: false,
            reviewReasonCodes: [],
            rationale: null,
            identity: null,
          },
        },
      ]);
    expect(evidence.judgeMetrics.map(({ caseId }) => caseId)).toEqual([
      "pii-security",
      "unauthorized-effect",
      "malformed-output",
      "single-repair-and-verified-fallback",
    ]);
    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(108);
  });

  it("emits an exact PII-safe reply pair only for a case requiring human review", async () => {
    const accepted = assessment(4, {
      recommendationAction: "REWRITE",
      strengths: ["free-form judge text must not be emitted"],
      improvedReply: "free-form judge text must not be emitted",
    });
    const candidate = assessment(3, {
      scores: { ...assessment(3).scores, factGrounding: 1 },
      recommendationAction: "KEEP",
    });
    const staleFacts: BusinessFactEnvelopeV1 = {
      schemaVersion: 1,
      status: "STALE",
      source: "POS_SNAPSHOT",
      observedAt: "2026-09-04T00:00:00.000Z",
      expiresAt: "2026-09-04T00:05:00.000Z",
      productId: "SKU-REVIEW",
      facts: null,
      reasonCode: "FACTS_EXPIRED",
    };
    const input = replayInput([], [accepted, candidate], {
      "pii-security": staleFacts,
    });

    const evidence = await runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
    });

    expect(evidence.humanReview.contractVersion).toBe("TRACK_C_OFFLINE_HUMAN_REVIEW_V1");
    expect(evidence.humanReview.cases.find(({ caseId }) =>
      caseId === "pii-security",
    )).toMatchObject({
        caseId: "pii-security",
        accepted: {
          reply: "reply-pii-security",
          replyHash: sha256("reply-pii-security"),
          assessment: {
            scores: accepted.scores,
            recommendationAction: accepted.recommendationAction,
          },
        },
        candidate: {
          reply: "offline-candidate-pii-security",
          replyHash: sha256("offline-candidate-pii-security"),
          assessment: {
            scores: candidate.scores,
            recommendationAction: candidate.recommendationAction,
          },
        },
        verifiedFacts: {
          payloadHash: sha256(staleFacts),
          status: "STALE",
          source: "POS_SNAPSHOT",
          observedAt: "2026-09-04T00:00:00.000Z",
          expiresAt: "2026-09-04T00:05:00.000Z",
          productId: "SKU-REVIEW",
          reasonCode: "FACTS_EXPIRED",
          facts: null,
          policyContext: null,
        },
        quality: {
          disposition: "WORSE",
          reviewReasonCodes: ["UNEXPECTED_REGRESSION", "JUDGE_DISAGREEMENT"],
        },
    });
    expect(evidence.humanReview.cases.every(({ quality }) =>
      quality.reviewReasonCodes.length > 0,
    )).toBe(true);
    expect(JSON.stringify(evidence.humanReview)).not.toContain("[PII_REDACTED_MESSAGE]");
    expect(JSON.stringify(evidence.humanReview)).not.toContain(
      "free-form judge text must not be emitted",
    );
  });

  it("does not expose a reply pair for a case that does not require human review", async () => {
    const input = replayInput([
      [4, 3], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5],
    ]);

    const evidence = await runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
    });

    expect(evidence.humanReview.cases.map(({ caseId }) => caseId)).toEqual([
      "pii-security",
    ]);
    expect(JSON.stringify(evidence.humanReview)).not.toContain(
      "offline-candidate-unauthorized-effect",
    );
  });

  it("rejects a customer URL before it can enter human-review evidence", () => {
    expect(() => assertTrackCOfflineHumanReviewTextSafe(
      "Xem https://customer.example/secret nhé.",
      "test:url",
    )).toThrow("TRACK_C_OFFLINE_HUMAN_REVIEW_TEXT_NOT_PII_SAFE:test:url");
  });

  it("redacts a customer URL in human-review context without changing the frozen identity", async () => {
    const input = replayInput([
      [4, 4], [4, 5], [4, 5], [4, 5],
    ]);
    const piiCase = input.cases.find(({ caseId }) => caseId === "pii-security");
    if (piiCase === undefined) throw new Error("TEST_PII_CASE_REQUIRED");
    const rawContext = [{
      ...piiCase.accepted.quality.context[0]!,
      text: "Xem https://customer.example/external-product nhé.",
    }];
    const accepted = {
      ...piiCase.accepted,
      quality: { ...piiCase.accepted.quality, context: rawContext },
    };
    piiCase.accepted = accepted;
    piiCase.candidate = offlineCandidate(piiCase.caseId, accepted.quality);
    input.mustPassReplay = {
      ...input.mustPassReplay,
      cases: input.mustPassReplay.cases.map((replayCase) => replayCase.caseId === piiCase.caseId
        ? {
          ...replayCase,
          qualityEnvelopeHashes: {
            baseline: sha256(accepted.quality),
            candidate: sha256(piiCase.candidate),
          },
        }
        : replayCase),
    };

    const evidence = await runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId, accepted, candidate,
      })),
    });

    const review = evidence.humanReview.cases.find(({ caseId }) => caseId === "pii-security");
    const replay = evidence.replay.cases.find(({ caseId }) => caseId === "pii-security");
    expect(review?.context[0]?.text).toBe("Xem [CUSTOMER_URL] nhé.");
    expect(JSON.stringify(evidence.humanReview)).not.toContain("customer.example");
    expect(replay?.quality.status).toBe("SCORED");
    if (replay?.quality.status !== "SCORED") throw new Error("TEST_SCORED_CASE_REQUIRED");
    expect(replay.quality.identity.contextHash).toBe(sha256(rawContext));
  });

  it("fails closed instead of emitting a human-review reply with PII", async () => {
    const accepted = assessment(4, { recommendationAction: "REWRITE" });
    const candidate = assessment(3, {
      scores: { ...assessment(3).scores, factGrounding: 1 },
      recommendationAction: "KEEP",
    });
    const input = replayInput([], [accepted, candidate]);
    const first = input.cases[1]!;
    first.candidate = offlineCandidate(
      first.caseId,
      first.accepted.quality,
      { reply: "Liên hệ em qua 0912345678 nhé." },
    );
    input.mustPassReplay = {
      ...input.mustPassReplay,
      cases: input.mustPassReplay.cases.map((replayCase, index) => index === 1
        ? {
          ...replayCase,
          qualityEnvelopeHashes: {
            baseline: replayCase.qualityEnvelopeHashes!.baseline,
            candidate: sha256(first.candidate),
          },
        }
        : replayCase),
    };

    await expect(runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
    })).rejects.toThrow(
      "TRACK_C_OFFLINE_HUMAN_REVIEW_TEXT_NOT_PII_SAFE:pii-security:candidate",
    );
  });

  it("checkpoints every completed case before a later judge failure stops the run", async () => {
    const input = replayInput();
    const checkpoints: unknown[] = [];
    let callIndex = 0;
    input.judge.judgeSalesReplyV2.mockImplementation(async () => {
      const index = callIndex++;
      if (index === 6) throw new Error("TRACK_C_TEST_JUDGE_FAILED");
      return {
        assessment: assessment(4),
        latencyMs: index,
        tokenUsage: { total: 10 + index },
      };
    });

    await expect(runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
      onCaseComplete: async (checkpoint) => {
        checkpoints.push(checkpoint);
      },
    })).rejects.toThrow("TRACK_C_TEST_JUDGE_FAILED");

    expect(checkpoints).toHaveLength(6);
    expect(checkpoints).toMatchObject([
      { caseId: "unsupported-protected-claim" },
      { caseId: "pii-security" },
      { caseId: "unauthorized-effect" },
      { caseId: "stale-facts" },
      { caseId: "missing-facts" },
      { caseId: "malformed-output" },
    ]);
    expect((checkpoints as Array<{ caseId: string; judgeMetrics: unknown }>)[0]).toMatchObject({
      caseId: "unsupported-protected-claim", judgeMetrics: null,
    });
  });

  it("keeps a routed human-review pair in its checkpoint when a later judge call fails", async () => {
    const input = replayInput([
      [4, 3], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5],
    ]);
    const checkpoints: unknown[] = [];
    let callIndex = 0;
    input.judge.judgeSalesReplyV2.mockImplementation(async () => {
      const index = callIndex++;
      if (index === 4) throw new Error("TRACK_C_TEST_LATE_JUDGE_FAILED");
      const scorePair = [
        [4, 3], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5],
      ][Math.floor(index / 2)]!;
      return {
        assessment: assessment(index % 2 === 0 ? scorePair[0]! : scorePair[1]!),
        latencyMs: index,
        tokenUsage: {},
      };
    });

    await expect(runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      qualitySuite: qualitySuiteInput(),
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId,
        accepted,
        candidate,
      })),
      onCaseComplete: async (checkpoint) => {
        checkpoints.push(checkpoint);
      },
    })).rejects.toThrow("TRACK_C_TEST_LATE_JUDGE_FAILED");

    expect(checkpoints.slice(0, 2)).toMatchObject([
      {
        contractVersion: "TRACK_C_OFFLINE_CASE_CHECKPOINT_V2",
        caseId: "unsupported-protected-claim",
        judgeMetrics: null,
        humanReview: null,
      },
      {
        contractVersion: "TRACK_C_OFFLINE_CASE_CHECKPOINT_V2",
        caseId: "pii-security",
        humanReview: {
          accepted: { reply: "reply-pii-security" },
          candidate: { reply: "offline-candidate-pii-security" },
          verifiedFacts: { payloadHash: sha256(null), status: "NO_FACTS" },
        },
      },
    ]);
  });

  it("labels a v22-versus-v22 run as wiring-only, never as quality improvement evidence", async () => {
    const input = replayInput();
    const cases = input.cases.map(({ caseId, accepted }) => ({
      caseId,
      accepted,
      candidate: offlineCandidate(caseId, accepted.quality, { reply: accepted.quality.reply }),
    }));

    const evidence = await runTrackCOfflineQuality({
      runKind: "WIRING_SMOKE",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      cases,
    });

    expect(evidence).toMatchObject({
      runKind: "WIRING_SMOKE",
      outcome: "WIRING_ONLY",
      candidate: { distinctReplyCaseCount: 0 },
    });
    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(8);
  });

  it("rejects a non-v22 baseline or an unchanged candidate before calling the V2 judge", async () => {
    const baselineMismatch = replayInput();
    await expect(runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: { ...TRACK_C_ACCEPTED_V22_BASELINE, release: "other" },
      mustPassReplay: baselineMismatch.mustPassReplay,
      judge: baselineMismatch.judge,
      cases: baselineMismatch.cases.map(({ caseId, accepted, candidate }) => ({
        caseId, accepted, candidate,
      })),
    })).rejects.toThrow("TRACK_C_OFFLINE_RUNNER_BASELINE_MISMATCH");
    expect(baselineMismatch.judge.judgeSalesReplyV2).not.toHaveBeenCalled();

    const unchanged = replayInput();
    const cases = unchanged.cases.map(({ caseId, accepted }) => ({
      caseId,
      accepted,
      candidate: offlineCandidate(caseId, accepted.quality, { reply: accepted.quality.reply }),
    }));
    await expect(runTrackCOfflineQuality({
      runKind: "CANDIDATE_EVALUATION",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: unchanged.mustPassReplay,
      judge: unchanged.judge,
      cases,
    })).rejects.toThrow("TRACK_C_OFFLINE_RUNNER_CANDIDATE_NOT_DISTINCT");
    expect(unchanged.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("stops at MUST_PASS before candidate or judge evaluation", async () => {
    const input = replayInput();
    await expect(runTrackCOfflineQuality({
      runKind: "WIRING_SMOKE",
      acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
      mustPassReplay: {
        ...input.mustPassReplay,
        sideEffects: "ENABLED",
      } as unknown as TrackBLivePathReplayResult,
      judge: input.judge,
      cases: input.cases.map(({ caseId, accepted, candidate }) => ({
        caseId, accepted, candidate,
      })),
    })).rejects.toThrow("TRACK_C_C1_B3_SIDE_EFFECTS_NOT_DISABLED");
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("replays exactly the frozen seven-case corpus with side effects disabled", async () => {
    const input = replayInput(); const result = await runTrackCReplay(input);
    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(8);
    expect(result).toMatchObject({ contractVersion: "TRACK_C_REPLAY_V1", sideEffects: "DISABLED", holdout: "NOT_INCLUDED",
      deterministic: { status: "PASS", caseCount: 7, riskClassCount: 9 },
      aggregate: {
        better: 0, same: 4, worse: 0, handoffCorrect: 3, scoredCaseCount: 4,
        materialRegressionClusters: [],
      } });
    expect(result.cases.map(({ caseId }) => caseId)).toEqual(TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => caseId));
    expect(result.cases.filter(({ quality }) => quality.status === "SCORED").every(({ quality }) =>
      quality.status === "SCORED" && quality.rationale.materialReasonCode === "NO_MATERIAL_SCORE_DELTA",
    )).toBe(true);
  });
  it("rejects a changed corpus before calling the offline judge", async () => {
    const input = replayInput(); input.cases[0]!.caseId = "pre-b24-versus-current-live-path";
    await expect(runTrackCReplay(input)).rejects.toThrow("TRACK_C_C1_CANDIDATE_CASE_SET_MISMATCH");
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
  it("rejects a stale candidate envelope binding before judge calls", async () => {
    const input = replayInput();
    const firstEnvelope = input.mustPassReplay.cases[0]?.qualityEnvelopeHashes;
    if (firstEnvelope === undefined) throw new Error("TEST_ENVELOPE_REQUIRED");
    input.mustPassReplay = {
      ...input.mustPassReplay,
      cases: input.mustPassReplay.cases.map((replayCase, index) => index === 0
        ? {
          ...replayCase,
          qualityEnvelopeHashes: {
            baseline: firstEnvelope.baseline,
            candidate: "f".repeat(64),
          },
        }
        : replayCase),
    };

    await expect(runTrackCReplay(input)).rejects.toThrow(
      "TRACK_C_C2_CANDIDATE_ENVELOPE_MISMATCH:unsupported-protected-claim",
    );
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });
  it("accepts a distinct candidate only through its independently guarded offline origin", async () => {
    const input = replayInput();

    const result = await runTrackCReplay(input);

    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(8);
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
    const accepted = guardFailed.cases[1]!.accepted.quality;
    const capture = frozenCapture("pii-security");
    if (capture.status !== "BUILT" || capture.context === null) throw new Error("TEST_CAPTURE_REQUIRED");
    const context = capture.context;
    const request = buildTrackCOfflineCandidateRequest({
      modelResource: "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"),
      evaluationContext: accepted.context, systemInstruction: "candidate",
    });
    const mismatchedRequest = buildTrackCOfflineCandidateRequest({
      modelResource: "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"),
      evaluationContext: [{
        ...accepted.context[0]!,
        text: "Một frozen customer turn khác",
      }],
      systemInstruction: "candidate",
    });
    expect(() => validateTrackCOfflineCandidate({
      caseId: "pii-security",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"),
      request: mismatchedRequest,
      providerModelVersion: "gemini-3.5-flash-lite", accepted,
      output: {
        segments: [{ kind: "GENERAL", text: "Chị cho em biết mẫu đang xem nhé." }],
        strategy: "ASK_CLARIFICATION", cta: "ASK_PRODUCT",
      },
    })).toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_DIALOGUE_MISMATCH");
    expect(() => validateTrackCOfflineCandidate({
      caseId: "pii-security",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"),
      request: { ...request, body: request.body.replace("candidate", "tampered") },
      providerModelVersion: "gemini-3.5-flash-lite", accepted,
      output: {
        schemaVersion: 2, contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
        contextHash: context.contextHash,
        productBinding: { status: "NOT_REQUIRED", productIds: [] },
        segments: [{ kind: "GENERAL", text: "Chị cho em biết mẫu đang xem nhé." }],
        strategy: "ASK_CLARIFICATION", cta: "ASK_PRODUCT",
      },
    })).toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_REQUEST_MISMATCH");
    expect(() => validateTrackCOfflineCandidate({
      caseId: "pii-security",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), request,
      providerModelVersion: "gemini-3.5-flash-lite", accepted,
      output: {
        segments: [{ kind: "EFFECT_CLAIM", text: "Đơn đã đặt xong.", effect: "ORDER_PLACED" }],
        strategy: "HOLD_POSITION", cta: "NONE",
      },
    })).toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_PROVENANCE_INVALID");
    expect(() => validateTrackCOfflineCandidate({
      caseId: "pii-security",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), request,
      providerModelVersion: "gemini-3.5-flash-lite", accepted,
      output: {
        schemaVersion: 2, contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
        contextHash: "0".repeat(64),
        productBinding: { status: "NOT_REQUIRED", productIds: [] },
        segments: [{ kind: "GENERAL", text: "Chị cho em biết mẫu đang xem nhé." }],
        strategy: "ASK_CLARIFICATION", cta: "ASK_PRODUCT",
      },
    })).toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_OUTPUT_INVALID");
    expect(() => validateTrackCOfflineCandidate({
      caseId: "pii-security",
      capture, evaluationAt: new Date("2026-09-05T00:00:00.000Z"), request,
      providerModelVersion: "gemini-3.5-flash-lite", accepted,
      output: {
        segments: [{ kind: "GENERAL", text: "Mẫu này giá 1.199.000đ nhé chị." }],
        strategy: "ANSWER_VERIFIED_FACTS", cta: "NONE",
      },
    })).toThrow("TRACK_C_C3_OFFLINE_CANDIDATE_GUARD_FAILED");
  });
  it("retains bounded rationale integrity and distinct material regression clusters", async () => {
    const worseFactGrounding = assessment(3, { scores: { ...assessment(3).scores, factGrounding: 1 }, weaknesses: ["fact grounding"] });
    const sameWithDifferentRationale = assessment(4, { strengths: ["clear answer"], recommendationAction: "HANDOFF_REVIEW" });
    const first = await runTrackCReplay(replayInput([], [assessment(4), worseFactGrounding, sameWithDifferentRationale, assessment(4),
      assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4)]));
    const second = await runTrackCReplay(replayInput([], [assessment(4), worseFactGrounding, sameWithDifferentRationale, assessment(4),
      assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4), assessment(4)]));
    expect(first.aggregate).toEqual({ better: 0, same: 3, worse: 1, handoffCorrect: 3, scoredCaseCount: 4, materialRegressionClusters: [{
      caseIds: ["pii-security"], riskClasses: ["PII_SECURITY"],
      materialReasonCode: "SCORE_REGRESSION:factGrounding",
    }] });
    const firstScored = first.cases.find(({ quality }) => quality.status === "SCORED");
    const secondScored = first.cases.filter(({ quality }) => quality.status === "SCORED")[1];
    if (firstScored?.quality.status !== "SCORED" || secondScored?.quality.status !== "SCORED") {
      throw new Error("TEST_SCORED_CASES_REQUIRED");
    }
    expect(firstScored.quality.rationale.candidateAssessmentHash).not.toBe(
      secondScored.quality.rationale.acceptedAssessmentHash,
    );
    expect(first.repeatabilityHash).toBe(second.repeatabilityHash);
  });
  it("does not label a score regression as recommendation improvement", async () => {
    const accepted = assessment(4, { recommendationAction: "REWRITE" });
    const candidate = assessment(3, {
      scores: { ...assessment(3).scores, factGrounding: 1 },
      recommendationAction: "KEEP",
    });
    const result = await runTrackCReplay(replayInput([], [accepted, candidate]));

    expect(result.cases[1]!.quality).toMatchObject({
      status: "SCORED",
      disposition: "WORSE",
      reviewReasonCodes: ["UNEXPECTED_REGRESSION", "JUDGE_DISAGREEMENT"],
      rationale: { materialReasonCode: "SCORE_REGRESSION:factGrounding" },
    });
    expect(result.aggregate.materialRegressionClusters[0]).toMatchObject({
      materialReasonCode: "SCORE_REGRESSION:factGrounding",
    });
  });
});
