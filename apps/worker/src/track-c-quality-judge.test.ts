import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { SalesRubricAssessmentV2 } from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import {
  createTrackCQualityJudge,
  runTrackCQualityComparison,
  type TrackCJudgeCallResult,
  type TrackCQualityComparisonInput,
} from "./track-c-quality-judge.js";
import {
  qualitySuiteFactsForJudge,
  TRACK_C_QUALITY_SUITE_V1,
} from "./track-c-quality-suite.js";

const privateKey = generateKeyPairSync("rsa", {
  modulusLength: 2_048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

function judgeDescriptor(model = "gemini-3.7-flash") {
  return {
    provider: "VERTEX_AI" as const,
    location: "global",
    model,
    promptRubric: {
      systemInstruction: "fixed-rubric",
      userPromptEnvelope: ["VERIFIED_FACTS_JSON", "PROPOSAL_SUMMARY_JSON"],
    },
    generationConfig: {
      maxOutputTokens: 1_024,
      thinkingConfig: { thinkingLevel: "HIGH" },
    },
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

function judgeResult(
  value: SalesRubricAssessmentV2,
  latencyMs = 17,
  tokenUsage: TrackCJudgeCallResult["tokenUsage"] = {
    prompt: 100,
    completion: 20,
    thinking: 5,
    total: 125,
  },
): TrackCJudgeCallResult {
  return { assessment: value, latencyMs, tokenUsage };
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
        .mockResolvedValueOnce(judgeResult(assessment(3), 11))
        .mockResolvedValueOnce(judgeResult(assessment(4), 13)),
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
      mustPassReplay: { ...passingReplay(), sideEffects: "ENABLED" } as unknown as TrackBLivePathReplayResult,
    });

    await expect(runTrackCQualityComparison(request)).rejects.toThrow(
      "TRACK_C_C1_B3_SIDE_EFFECTS_NOT_DISABLED",
    );
    expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
    expect(request.judge.judgeSalesReplyV2Descriptor).not.toHaveBeenCalled();
  });

  it("pins the Track C V2 judge and returns evaluation-only BETTER evidence", async () => {
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
      contractVersion: "TRACK_C_QUALITY_JUDGE_V2",
      sideEffects: "DISABLED",
      evaluationOnly: true,
      comparison: { disposition: "BETTER", overallScoreDelta: 1 },
      identity: {
        mustPass: { captureSetHash: TRACK_C_C1_MUST_PASS_POLICY.captureSetHash },
        judge: { provider: "VERTEX_AI", location: "global", model: "gemini-3.7-flash" },
        verifiedFactFixtureHash: TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash,
      },
      metrics: {
        accepted: { latencyMs: 11, tokenUsage: { prompt: 100 } },
        candidate: { latencyMs: 13, tokenUsage: { completion: 20 } },
      },
    });
    expect(result.identity.judge.promptRubricHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.judge.generationConfigHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.accepted.replyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.candidate.replyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.identity.verifiedFactsPayloadHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.metrics.wallClockMs).toEqual(expect.any(Number));
  });

  it("fails closed on any unpinned judge descriptor before either call", async () => {
    for (const descriptor of [
      { ...judgeDescriptor(), provider: "OTHER" },
      { ...judgeDescriptor(), location: "us-central1" },
      { ...judgeDescriptor(), model: "gemini-other" },
      { ...judgeDescriptor(), location: undefined },
    ]) {
      const request = input({
        judge: {
          judgeSalesReplyV2Descriptor: vi.fn(() => descriptor as never),
          judgeSalesReplyV2: vi.fn(),
        },
      });

      await expect(runTrackCQualityComparison(request)).rejects.toThrow(
        "TRACK_C_C11_JUDGE_IDENTITY_MISMATCH",
      );
      expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
    }
  });

  it("accepts fixture-local facts only through the explicit 50-case quality source", async () => {
    const request = input({
      factFixtureHash: "a".repeat(64),
      factSource: "TRACK_C_QUALITY_SUITE_V1",
      verifiedFacts: null,
    });

    await expect(runTrackCQualityComparison(request)).rejects.toThrow(
      "TRACK_C_C11_QUALITY_SUITE_FACTS_MISMATCH",
    );
    expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("rejects fixture-local facts when a caller labels them as B3 facts", async () => {
    for (const withExplicitB3Source of [false, true]) {
      const request = input({
        verifiedFacts: qualitySuiteFactsForJudge(TRACK_C_QUALITY_SUITE_V1[0]!),
        ...(withExplicitB3Source ? { factSource: "B3_MUST_PASS" as const } : {}),
      });

      await expect(runTrackCQualityComparison(request)).rejects.toThrow(
        "TRACK_C_C11_FACT_SOURCE_MISMATCH",
      );
      expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
    }
  });

  it("fails closed for a malformed or cross-fixture quality-facts envelope", async () => {
    const firstFixture = TRACK_C_QUALITY_SUITE_V1[0]!;
    const secondFixture = TRACK_C_QUALITY_SUITE_V1[1]!;
    const crossFixture = input({
      factFixtureHash: "a".repeat(64),
      factSource: "TRACK_C_QUALITY_SUITE_V1",
      qualitySuiteFixtureId: secondFixture.id,
      verifiedFacts: qualitySuiteFactsForJudge(firstFixture),
    });
    const malformed = input({
      factFixtureHash: "a".repeat(64),
      factSource: "TRACK_C_QUALITY_SUITE_V1",
      qualitySuiteFixtureId: firstFixture.id,
      verifiedFacts: {
        contractVersion: "TRACK_C_QUALITY_SUITE_FACTS_V1",
        origin: "FIXTURE_LOCAL_EVALUATION_ONLY",
        fixtureId: firstFixture.id,
        facts: [123],
      } as unknown as TrackCQualityComparisonInput["verifiedFacts"],
    });

    for (const request of [crossFixture, malformed]) {
      await expect(runTrackCQualityComparison(request)).rejects.toThrow(
        "TRACK_C_C11_QUALITY_SUITE_FACTS_MISMATCH",
      );
      expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
    }
  });

  it("routes human review only for a near tie, regression, or disagreement", async () => {
    const tie = await runTrackCQualityComparison(input({
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(judgeResult(assessment(4, "KEEP")))
          .mockResolvedValueOnce(judgeResult(assessment(4.1, "REWRITE"))),
      },
    }));
    const regression = await runTrackCQualityComparison(input({
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(judgeResult(assessment(4)))
          .mockResolvedValueOnce(judgeResult(assessment(3))),
      },
    }));

    expect(tie.comparison.reviewReasonCodes).toEqual([
      "NEAR_TIE",
      "JUDGE_DISAGREEMENT",
    ]);
    expect(regression.comparison.reviewReasonCodes).toEqual([
      "UNEXPECTED_REGRESSION",
    ]);
  });

  it("does not let telemetry change deterministic identity or review routing", async () => {
    const first = await runTrackCQualityComparison(input({
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(judgeResult(assessment(4), 1, { prompt: 1 }))
          .mockResolvedValueOnce(judgeResult(assessment(4), 2, { total: 2 })),
      },
    }));
    const second = await runTrackCQualityComparison(input({
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(judgeResult(assessment(4), 999, { thinking: 999 }))
          .mockResolvedValueOnce(judgeResult(assessment(4), 888, { completion: 888 })),
      },
    }));

    expect(first.identity).toEqual(second.identity);
    expect(first.comparison).toEqual(second.comparison);
    expect(first.metrics).not.toEqual(second.metrics);
  });

  it("keeps the verified-facts payload in deterministic identity", async () => {
    const factsA = { products: [{ id: "SQ149", price: 699_000 }] } as unknown as NonNullable<
      TrackCQualityComparisonInput["verifiedFacts"]
    >;
    const factsB = { products: [{ id: "SQ149", price: 799_000 }] } as unknown as NonNullable<
      TrackCQualityComparisonInput["verifiedFacts"]
    >;
    const first = await runTrackCQualityComparison(input({
      verifiedFacts: factsA,
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(judgeResult(assessment(4)))
          .mockResolvedValueOnce(judgeResult(assessment(4))),
      },
    }));
    const second = await runTrackCQualityComparison(input({
      verifiedFacts: factsB,
      judge: {
        judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
        judgeSalesReplyV2: vi.fn()
          .mockResolvedValueOnce(judgeResult(assessment(4)))
          .mockResolvedValueOnce(judgeResult(assessment(4))),
      },
    }));

    expect(first.identity.verifiedFactsPayloadHash).not.toBe(
      second.identity.verifiedFactsPayloadHash,
    );
  });

  it("does not route a caller-supplied legacy calibration flag", async () => {
    const result = await runTrackCQualityComparison({
      ...input({
        judge: {
          judgeSalesReplyV2Descriptor: vi.fn(() => judgeDescriptor()),
          judgeSalesReplyV2: vi.fn()
            .mockResolvedValueOnce(judgeResult(assessment(4)))
            .mockResolvedValueOnce(judgeResult(assessment(4))),
        },
      }),
      calibrationSample: true,
    } as unknown as TrackCQualityComparisonInput);

    expect(result.comparison.reviewReasonCodes).toEqual(["NEAR_TIE"]);
  });

  it("creates an offline-only judge port pinned separately from generator options", () => {
    const judge = createTrackCQualityJudge({
      projectId: "test-project",
      location: "us-central1",
      modelName: "generator-model",
      judgeLocation: "europe-west1",
      judgeModelName: "other-model",
      serviceAccount: { email: "test@example.iam.gserviceaccount.com", privateKey },
    });

    expect(judge.judgeSalesReplyV2Descriptor()).toMatchObject({
      provider: "VERTEX_AI",
      location: "global",
      model: "gemini-3.7-flash",
    });
  });
});
