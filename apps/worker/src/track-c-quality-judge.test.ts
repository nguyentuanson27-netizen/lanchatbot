import { describe, expect, it, vi } from "vitest";
import type { SalesRubricAssessmentV2 } from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import {
  runTrackCQualityComparison,
  type TrackCQualityComparisonInput,
} from "./track-c-quality-judge.js";

function judgeDescriptor(model = "gemini-3.5-flash-lite") {
  return {
    provider: "VERTEX_AI" as const,
    model,
    promptRubric: {
      systemInstruction: "fixed-rubric",
      userPromptEnvelope: ["VERIFIED_FACTS_JSON", "PROPOSAL_SUMMARY_JSON"],
    },
    generationConfig: { temperature: 0.1, maxOutputTokens: 1_024 },
  };
}

function assessment(
  overall: number,
  recommendationAction: SalesRubricAssessmentV2["recommendationAction"] = "KEEP",
): SalesRubricAssessmentV2 {
  return {
    schemaVersion: 2,
    intent: "hoi_gia",
    conversationStage: "consulting",
    scores: {
      relevance: overall,
      questionResolution: overall,
      nextStepQuality: overall,
      naturalness: overall,
      concision: overall,
      factGrounding: overall,
      objectionResolution: overall,
      salesProgression: overall,
      ctaStageFit: overall,
      overall,
    },
    strengths: [],
    weaknesses: [],
    improvedReply: "",
    recommendationAction,
  };
}

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
    state: { status: "MATCH" as const, differences: [] },
    sideEffects: { status: "NONE" as const, reasonCodes: [], capturedCommitPlans: 2 },
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

function input(
  overrides: Partial<TrackCQualityComparisonInput> = {},
): TrackCQualityComparisonInput {
  const base: TrackCQualityComparisonInput = {
    mustPassReplay: passingReplay(),
    judge: {
      judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
      judgeSalesReplyV2: vi.fn()
        .mockResolvedValueOnce(assessment(3))
        .mockResolvedValueOnce(assessment(4)),
    },
    context: [{
      direction: "INBOUND",
      senderType: "CUSTOMER",
      messageType: "TEXT",
      text: "Mẫu này giá bao nhiêu?",
      attachmentCount: 0,
      occurredAt: "2026-09-05T00:00:00.000Z",
    }],
    verifiedFacts: null,
    factFixtureHash: TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash,
    accepted: {
      reply: "Dạ mẫu này giá 699k ạ.",
      proposalSummary: { action: "REPLY" },
      guardOutcome: { action: "REPLY", blockedReasonCodes: [] },
    },
    candidate: {
      reply: "Dạ mẫu này 699k ạ, chị muốn xem màu nào?",
      proposalSummary: { action: "REPLY" },
      guardOutcome: { action: "REPLY", blockedReasonCodes: [] },
    },
  };
  return { ...base, ...overrides };
}

describe("Track C C1.1 offline quality judge", () => {
  it("requires frozen MUST_PASS before invoking either judge call", async () => {
    const request = input({
      mustPassReplay: {
        ...passingReplay(),
        sideEffects: "ENABLED",
      } as unknown as TrackBLivePathReplayResult,
    });

    await expect(runTrackCQualityComparison(request)).rejects.toThrow(
      "TRACK_C_C1_B3_SIDE_EFFECTS_NOT_DISABLED",
    );
    expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
    expect(request.judge.judgeSalesReplyV2Descriptor).not.toHaveBeenCalled();
  });

  it("pins one judge configuration and returns evaluation-only BETTER evidence", async () => {
    const request = input();

    const result = await runTrackCQualityComparison(request);

    expect(request.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(2);
    expect(request.judge.judgeSalesReplyV2Descriptor).toHaveBeenCalledTimes(1);
    expect(request.judge.judgeSalesReplyV2).toHaveBeenNthCalledWith(
      1,
      request.context,
      request.accepted.reply,
      request.verifiedFacts,
      request.accepted.proposalSummary,
      request.accepted.guardOutcome,
    );
    expect(request.judge.judgeSalesReplyV2).toHaveBeenNthCalledWith(
      2,
      request.context,
      request.candidate.reply,
      request.verifiedFacts,
      request.candidate.proposalSummary,
      request.candidate.guardOutcome,
    );
    expect(result).toMatchObject({
      contractVersion: "TRACK_C_QUALITY_JUDGE_V1",
      sideEffects: "DISABLED",
      evaluationOnly: true,
      comparison: { disposition: "BETTER", overallScoreDelta: 1 },
      identity: {
        mustPass: {
          captureSetHash: TRACK_C_C1_MUST_PASS_POLICY.captureSetHash,
        },
        judge: { provider: "VERTEX_AI", model: "gemini-3.5-flash-lite" },
        verifiedFactFixtureHash: TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash,
      },
    });
    expect(result.identity.judge.promptRubricHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.judge.generationConfigHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.accepted.replyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.candidate.replyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.verifiedFactsPayloadHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("marks ties and score/recommendation disagreement for bounded human review", async () => {
    const request = input({
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(assessment(4, "KEEP"))
          .mockResolvedValueOnce(assessment(4.1, "REWRITE")),
      },
    });

    const result = await runTrackCQualityComparison(request);

    expect(result.comparison).toMatchObject({
      disposition: "SAME",
      requiresHumanReview: true,
      reviewReasonCodes: expect.arrayContaining([
        "NEAR_TIE",
        "JUDGE_DISAGREEMENT",
      ]),
    });
  });

  it("reserves human review for an unexpected quality regression", async () => {
    const request = input({
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(assessment(4))
          .mockResolvedValueOnce(assessment(3)),
      },
    });

    const result = await runTrackCQualityComparison(request);

    expect(result.comparison).toEqual({
      disposition: "WORSE",
      overallScoreDelta: -1,
      requiresHumanReview: true,
      reviewReasonCodes: ["UNEXPECTED_REGRESSION"],
    });
  });

  it("derives the model identity from the invoked judge and binds the fact payload", async () => {
    const factsA = { products: [{ id: "SQ149", price: 699_000 }] } as unknown as NonNullable<
      TrackCQualityComparisonInput["verifiedFacts"]
    >;
    const factsB = { products: [{ id: "SQ149", price: 799_000 }] } as unknown as NonNullable<
      TrackCQualityComparisonInput["verifiedFacts"]
    >;
    const resultA = await runTrackCQualityComparison(input({
      verifiedFacts: factsA,
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor("actual-model-a")),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(assessment(3))
          .mockResolvedValueOnce(assessment(4)),
      },
    }));
    const resultB = await runTrackCQualityComparison(input({
      verifiedFacts: factsB,
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor("actual-model-b")),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(assessment(3))
          .mockResolvedValueOnce(assessment(4)),
      },
    }));

    expect(resultA.identity.judge.model).toBe("actual-model-a");
    expect(resultA.identity.verifiedFactFixtureHash).toBe(
      TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash,
    );
    expect(resultA.identity.verifiedFactsPayloadHash).not.toBe(
      resultB.identity.verifiedFactsPayloadHash,
    );
  });
});
