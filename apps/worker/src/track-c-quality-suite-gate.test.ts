import { describe, expect, it, vi } from "vitest";
import type { SalesRubricAssessmentV2 } from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import { TRACK_C_QUALITY_SUITE_V1 } from "./track-c-quality-suite.js";
import { runTrackCQualitySuiteGate } from "./track-c-quality-suite-gate.js";

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
      fixtureModelVersion: "track-c-quality-suite-test-v1",
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

function input(options: Readonly<{ worseCaseId?: string; allSame?: boolean }> = {}) {
  let call = 0;
  const judge = {
    judgeSalesReplyV2Descriptor: vi.fn(() => ({
      provider: "VERTEX_AI" as const,
      location: "global",
      model: "gemini-3.7-flash",
      promptRubric: { version: "v2" },
      generationConfig: { thinkingConfig: { thinkingLevel: "HIGH" } },
    })),
    judgeSalesReplyV2: vi.fn(async () => {
      const caseIndex = Math.floor(call++ / 2);
      const caseId = TRACK_C_QUALITY_SUITE_V1[caseIndex]?.id;
      const candidate = call % 2 === 0;
      const score = options.allSame ? 3 : caseId === options.worseCaseId
        ? candidate ? 3 : 4
        : candidate ? 4 : 3;
      return { assessment: assessment(score), latencyMs: 10, tokenUsage: {} };
    }),
  };
  return {
    mustPassReplay: passingReplay(),
    judge,
    cases: TRACK_C_QUALITY_SUITE_V1.map((fixture) => ({
      caseId: fixture.id,
      accepted: {
        reply: `accepted ${fixture.id}`,
        proposalSummary: { action: "REPLY" },
        guardOutcome: { action: "REPLY", sideEffects: "DISABLED" },
      },
      candidate: {
        reply: `candidate ${fixture.id}`,
        proposalSummary: { action: "REPLY" },
        guardOutcome: { action: "REPLY", sideEffects: "DISABLED" },
      },
    })),
  };
}

describe("Track C mandatory 50-case quality gate", () => {
  it("requires C1 first, scores the exact 50-case suite, and retains a complete review history", async () => {
    const request = input();

    const result = await runTrackCQualitySuiteGate(request);

    expect(request.judge.judgeSalesReplyV2).toHaveBeenCalledTimes(100);
    expect(result).toMatchObject({
      contractVersion: "TRACK_C_QUALITY_SUITE_GATE_V1",
      evaluationOnly: true,
      sideEffects: "DISABLED",
      mandatory: true,
      aggregate: { caseCount: 50, better: 50, same: 0, worse: 0 },
      gate: { status: "AWAITING_OWNER_APPROVAL", selectionAuthorized: false },
    });
    expect(result.history.cases).toHaveLength(50);
    expect(result.history.cases[0]).toMatchObject({
      caseId: "q01-stock",
      fixture: { customerMessage: "Mẫu SD398 còn không em?" },
      accepted: { reply: "accepted q01-stock", assessment: { scores: { overall: 3 } } },
      candidate: { reply: "candidate q01-stock", assessment: { scores: { overall: 4 } } },
      quality: { disposition: "BETTER" },
    });
    expect(result.history.cases.every(({ fixture }) => fixture.verifiedFacts.length > 0)).toBe(true);
  });

  it("blocks owner approval on any quality regression while retaining the completed 50-case history", async () => {
    const request = input({ worseCaseId: "q29-price-hesitation" });

    const result = await runTrackCQualitySuiteGate(request);

    expect(result.aggregate).toMatchObject({ better: 49, same: 0, worse: 1 });
    expect(result.gate).toEqual({
      status: "REGRESSION_DETECTED",
      selectionAuthorized: false,
    });
    expect(result.history.cases.find(({ caseId }) => caseId === "q29-price-hesitation"))
      .toMatchObject({ quality: { disposition: "WORSE" } });
  });

  it("fails closed before Judge if C1 is not passing", async () => {
    const request = input();
    request.mustPassReplay = {
      ...request.mustPassReplay,
      sideEffects: "ENABLED",
    } as unknown as TrackBLivePathReplayResult;

    await expect(runTrackCQualitySuiteGate(request)).rejects.toThrow(
      "TRACK_C_C1_B3_SIDE_EFFECTS_NOT_DISABLED",
    );
    expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("requires the exact complete suite rather than allowing a partial quality result", async () => {
    const request = input();
    request.cases = request.cases.slice(0, -1);

    await expect(runTrackCQualitySuiteGate(request)).rejects.toThrow(
      "TRACK_C_QUALITY_SUITE_CASE_SET_MISMATCH",
    );
    expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });

  it("requires a BETTER signal but never self-authorizes selection", async () => {
    const request = input({ allSame: true });

    const result = await runTrackCQualitySuiteGate(request);

    expect(result.aggregate).toMatchObject({ better: 0, same: 50, worse: 0 });
    expect(result.gate).toEqual({
      status: "NO_CLEAR_IMPROVEMENT",
      selectionAuthorized: false,
    });
  });

  it("fails closed before Judge when a reply would make the all-case history unsafe", async () => {
    const request = input();
    request.cases[0] = {
      ...request.cases[0]!,
      candidate: {
        ...request.cases[0]!.candidate,
        reply: "Liên hệ em qua 0912345678 nhé.",
      },
    };

    await expect(runTrackCQualitySuiteGate(request)).rejects.toThrow(
      "TRACK_C_QUALITY_SUITE_HISTORY_TEXT_NOT_PII_SAFE:q01-stock:candidate",
    );
    expect(request.judge.judgeSalesReplyV2).not.toHaveBeenCalled();
  });
});
