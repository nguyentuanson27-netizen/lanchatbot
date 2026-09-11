import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it, vi } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import type { TrackCV5TwoPassBenchmarkResult } from "./track-c-c3-v5-benchmark-runner.js";
import type {
  TrackCV5RubricConfig,
  TrackCV5StageAssessmentInput,
} from "./track-c-c3-v5-benchmark-scoring.js";
import {
  evaluateTrackCV5BenchmarkCase,
  type TrackCV5StageJudgeInput,
  type TrackCV5StageJudgePort,
} from "./track-c-c3-v5-benchmark-evaluator.js";

const RUBRIC = JSON.parse(readFileSync(
  new URL("../evals/track-c-c3-v5/v4/rubric.json", import.meta.url),
  "utf8",
)) as TrackCV5RubricConfig;
const HASH = "a".repeat(64);
const BUNDLE_FINGERPRINT = "b".repeat(64);
const SOURCE_REVISION = "c".repeat(40);
const RUBRIC_HASH = createHash("sha256")
  .update(canonicalJsonV1(RUBRIC), "utf8")
  .digest("hex");

function dialogue(text = "Mẫu này bao nhiêu em?"): readonly ShadowContextMessage[] {
  return [{
    direction: "INBOUND",
    senderType: "CUSTOMER",
    messageType: "TEXT",
    text,
    attachmentCount: 0,
    occurredAt: "2026-09-10T01:59:00.000Z",
  }];
}

function candidate(): TrackCV5TwoPassBenchmarkResult {
  return {
    contractVersion: "TRACK_C_V5_TWO_PASS_BENCHMARK_RESULT_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    executionLane: "PRODUCTION_CONTRACT",
    conversationPlan: {
      currentNeed: "Answer the price question.",
      mustResolve: "Give the verified price.",
      conversationRead: "Product is resolved.",
      nextMove: "NONE",
      avoid: "Do not invent facts.",
    },
    output: {
      schemaVersion: 2,
      contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
      contextHash: HASH,
      productBinding: { status: "RESOLVED", productIds: ["SQ9012"] },
      segments: [{
        kind: "VERIFIED_CLAIM",
        text: "Mẫu này hiện 849k chị ạ.",
        claimContentHash: HASH,
      }],
      strategy: "ANSWER_VERIFIED_FACTS",
      cta: "NONE",
    },
    reply: "Mẫu này hiện 849k chị ạ.",
    identity: {
      captureContextHash: HASH,
      strategistRequestEnvelopeHash: HASH,
      conversationPlanHash: HASH,
      responderRequestEnvelopeHash: HASH,
      responseOutputHash: HASH,
      compositionHash: HASH,
    },
  };
}

function assessment(stage: TrackCV5StageJudgeInput["stage"]): TrackCV5StageAssessmentInput {
  return {
    scores: stage === "STRATEGIST"
      ? {
          QUESTION_RESOLUTION: 4,
          FACT_GROUNDING: 4,
          CONTEXT_USE: 4,
          NEXT_MOVE_QUALITY: 4,
        }
      : {
          QUESTION_RESOLUTION: 4,
          FACT_GROUNDING: 4,
          CONTEXT_USE: 4,
          NEXT_MOVE_QUALITY: 4,
          NATURALNESS_LANA: 4,
          CONCISION: 4,
        },
    hardFailures: [],
    behaviorRequirementsSatisfied: true,
  };
}

function judge(
  assess: TrackCV5StageJudgePort["assess"],
  rubricHash = RUBRIC_HASH,
): TrackCV5StageJudgePort {
  return {
    descriptor: () => ({
      provider: "TEST_JUDGE",
      model: "judge-v1",
      location: "global",
      rubricHash,
      generationConfigHash: HASH,
    }),
    assess,
  };
}

function evaluationInput(
  assess: TrackCV5StageJudgePort["assess"],
  overrides: Partial<Parameters<typeof evaluateTrackCV5BenchmarkCase>[0]> = {},
): Parameters<typeof evaluateTrackCV5BenchmarkCase>[0] {
  return {
    rubric: RUBRIC,
    domain: "PRICE_VALUE",
    dialogue: dialogue(),
    expected: {
      required_behaviors: ["answer exact verified price"],
      forbidden_behaviors: ["no invented promotion"],
    },
    authoritativeEvidence: {
      verifiedClaims: [{ type: "PRICE", amountVnd: 849000 }],
    },
    candidate: candidate(),
    judge: judge(assess),
    bundleFingerprint: BUNDLE_FINGERPRINT,
    candidateSourceRevision: SOURCE_REVISION,
    ...overrides,
  };
}

describe("Track C C3 V5 benchmark evaluator", () => {
  it("judges strategist and responder separately without exposing responder output to strategist", async () => {
    const observed: TrackCV5StageJudgeInput[] = [];
    const assess = vi.fn(async (input: TrackCV5StageJudgeInput) => {
      observed.push(input);
      return assessment(input.stage);
    });

    const result = await evaluateTrackCV5BenchmarkCase(evaluationInput(assess));

    expect(assess).toHaveBeenCalledTimes(2);
    expect(new Set(observed.map(({ stage }) => stage))).toEqual(
      new Set(["STRATEGIST", "RESPONDER"]),
    );
    for (const input of observed) {
      const serialized = JSON.stringify(input);
      expect(serialized).not.toContain("caseId");
      expect(serialized).not.toContain("split");
      expect(input.executionLane).toBe("PRODUCTION_CONTRACT");
    }
    const strategist = observed.find(({ stage }) => stage === "STRATEGIST");
    const responder = observed.find(({ stage }) => stage === "RESPONDER");
    expect(strategist).toBeDefined();
    expect(responder).toBeDefined();
    expect(strategist?.artifact).toEqual({
      conversationPlan: candidate().conversationPlan,
    });
    expect(JSON.stringify(strategist)).not.toContain("responderReply");
    expect(JSON.stringify(strategist)).not.toContain("responderOutput");
    expect(responder?.artifact).toMatchObject({
      conversationPlan: candidate().conversationPlan,
      responderReply: candidate().reply,
      responderOutput: candidate().output,
    });
    expect(result.sideEffects).toBe("DISABLED");
    expect(result.score.outcome).toBe("PASS");
    expect(result.runIdentity.bundleFingerprint).toBe(BUNDLE_FINGERPRINT);
    expect(result.runIdentity.candidateSourceRevision).toBe(SOURCE_REVISION);
    expect(result.runIdentity.rubricHash).toBe(RUBRIC_HASH);
    expect(result.runIdentity.runFingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("rejects a judge rubric label that does not match the rubric actually scored", async () => {
    const assess = vi.fn(async (input: TrackCV5StageJudgeInput) =>
      assessment(input.stage)
    );

    await expect(evaluateTrackCV5BenchmarkCase(evaluationInput(assess, {
      judge: judge(assess, "d".repeat(64)),
    }))).rejects.toThrow("TRACK_C_V5_JUDGE_IDENTITY_INVALID");
    expect(assess).not.toHaveBeenCalled();
  });

  it("rejects an invalid bundle or source revision before requesting assessments", async () => {
    const assess = vi.fn(async (input: TrackCV5StageJudgeInput) =>
      assessment(input.stage)
    );

    await expect(evaluateTrackCV5BenchmarkCase(evaluationInput(assess, {
      bundleFingerprint: "not-a-hash",
    }))).rejects.toThrow("TRACK_C_V5_BUNDLE_IDENTITY_INVALID");
    expect(assess).not.toHaveBeenCalled();

    await expect(evaluateTrackCV5BenchmarkCase(evaluationInput(assess, {
      candidateSourceRevision: "not-a-revision",
    }))).rejects.toThrow("TRACK_C_V5_CANDIDATE_SOURCE_REVISION_INVALID");
    expect(assess).not.toHaveBeenCalled();
  });

  it("rejects an unpinned judge descriptor before requesting assessments", async () => {
    const assess = vi.fn(async (input: TrackCV5StageJudgeInput) =>
      assessment(input.stage)
    );
    const unsafeJudge: TrackCV5StageJudgePort = {
      descriptor: () => ({
        provider: "TEST_JUDGE",
        model: "judge-v1",
        location: "global",
        rubricHash: RUBRIC_HASH,
        generationConfigHash: "not-a-hash",
      }),
      assess,
    };

    await expect(evaluateTrackCV5BenchmarkCase(evaluationInput(assess, {
      judge: unsafeJudge,
    }))).rejects.toThrow("TRACK_C_V5_JUDGE_IDENTITY_INVALID");
    expect(assess).not.toHaveBeenCalled();
  });

  it("rejects customer URLs before any judge provider call", async () => {
    const assess = vi.fn(async (input: TrackCV5StageJudgeInput) =>
      assessment(input.stage)
    );

    await expect(evaluateTrackCV5BenchmarkCase(evaluationInput(assess, {
      dialogue: dialogue("Xem giúp chị https://customer.example/order/123"),
      expected: { required_behaviors: [], forbidden_behaviors: [] },
      authoritativeEvidence: {},
    }))).rejects.toThrow("TRACK_C_V5_JUDGE_DIALOGUE_NOT_PII_SAFE");
    expect(assess).not.toHaveBeenCalled();
  });

  it("rejects PII-like authoritative evidence before any judge provider call", async () => {
    const assess = vi.fn(async (input: TrackCV5StageJudgeInput) =>
      assessment(input.stage)
    );

    await expect(evaluateTrackCV5BenchmarkCase(evaluationInput(assess, {
      expected: { required_behaviors: [], forbidden_behaviors: [] },
      authoritativeEvidence: { phone: "0901234567" },
    }))).rejects.toThrow("TRACK_C_V5_JUDGE_EVIDENCE_NOT_PII_SAFE");
    expect(assess).not.toHaveBeenCalled();
  });
});
