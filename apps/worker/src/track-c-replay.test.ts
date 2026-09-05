import { describe, expect, it, vi } from "vitest";
import type { SalesRubricAssessmentV2 } from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import { runTrackCReplay } from "./track-c-replay.js";

function assessment(overall: number): SalesRubricAssessmentV2 {
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
    recommendationAction: "KEEP",
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

function replayInput(scores: readonly (readonly [number, number])[] = []) {
  let scoreIndex = 0;
  const judge = {
    judgeSalesReplyV2Descriptor: vi.fn(() => ({
      provider: "VERTEX_AI" as const,
      model: "gemini-3.5-flash-lite",
      promptRubric: { version: "v2" },
      generationConfig: { temperature: 0.1 },
    })),
    judgeSalesReplyV2: vi.fn(async () => {
      const pair = scores[Math.floor(scoreIndex / 2)] ?? [4, 4] as const;
      const score = pair[scoreIndex % 2]!;
      scoreIndex += 1;
      return assessment(score);
    }),
  };
  return {
    mustPassReplay: passingReplay(),
    cases: TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => ({
      caseId,
      quality: {
        judge,
        context: [{
          direction: "INBOUND" as const,
          senderType: "CUSTOMER" as const,
          messageType: "TEXT" as const,
          text: "Mẫu này giá bao nhiêu?",
          attachmentCount: 0,
          occurredAt: "2026-09-05T00:00:00.000Z",
        }],
        verifiedFacts: null,
        factFixtureHash: TRACK_C_C1_MUST_PASS_POLICY.factFixtureHash,
        accepted: {
          reply: `accepted-${caseId}`,
          proposalSummary: { action: "REPLY" },
          guardOutcome: { action: "REPLY", blockedReasonCodes: [] },
        },
        candidate: {
          reply: `candidate-${caseId}`,
          proposalSummary: { action: "REPLY" },
          guardOutcome: { action: "REPLY", blockedReasonCodes: [] },
        },
      },
    })),
    judge,
  };
}

describe("Track C C2 offline replay", () => {
  it("replays exactly the frozen seven-case corpus with side effects disabled", async () => {
    const input = replayInput();

    const result = await runTrackCReplay(input);

    expect(input.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(14);
    expect(result).toMatchObject({
      contractVersion: "TRACK_C_REPLAY_V1",
      sideEffects: "DISABLED",
      holdout: "NOT_INCLUDED",
      deterministic: { status: "PASS", caseCount: 7, riskClassCount: 9 },
      aggregate: {
        better: 0,
        same: 7,
        worse: 0,
        materialRegressionClusters: [],
      },
    });
    expect(result.cases.map(({ caseId }) => caseId)).toEqual(
      TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => caseId),
    );
    expect(result.cases.every(({ quality }) => quality.disposition === "SAME")).toBe(true);
  });

  it("rejects a changed corpus before calling the offline judge", async () => {
    const input = replayInput();
    input.cases[0]!.caseId = "pre-b24-versus-current-live-path";

    await expect(runTrackCReplay(input)).rejects.toThrow(
      "TRACK_C_C2_CASE_SET_MISMATCH",
    );
    expect(input.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("reports a bounded material regression cluster and stable repeatability hash", async () => {
    const scores = [
      [4, 3],
      [4, 4],
      [4, 4],
      [4, 4],
      [4, 4],
      [4, 4],
      [4, 4],
    ] as const;
    const first = await runTrackCReplay(replayInput(scores));
    const second = await runTrackCReplay(replayInput(scores));

    expect(first.aggregate).toEqual({
      better: 0,
      same: 6,
      worse: 1,
      materialRegressionClusters: [{
        caseIds: ["unsupported-protected-claim"],
        reviewReasonCodes: ["UNEXPECTED_REGRESSION"],
      }],
    });
    expect(first.repeatabilityHash).toBe(second.repeatabilityHash);
  });
});
