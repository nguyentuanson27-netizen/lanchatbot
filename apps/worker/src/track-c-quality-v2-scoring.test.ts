import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  scoreTrackCV5BenchmarkCase,
  type TrackCV5RubricConfig,
  type TrackCV5StageAssessmentInput,
} from "./track-c-c3-v5-benchmark-scoring.js";

const RUBRIC = JSON.parse(readFileSync(
  new URL("../evals/track-c-c3-v5/v4/rubric.json", import.meta.url),
  "utf8",
)) as TrackCV5RubricConfig;

function strategist(score = 4): TrackCV5StageAssessmentInput {
  return {
    scores: {
      QUESTION_RESOLUTION: score,
      FACT_GROUNDING: score,
      CONTEXT_USE: score,
      NEXT_MOVE_QUALITY: score,
    },
    hardFailures: [],
    behaviorRequirementsSatisfied: true,
  };
}

function responder(score = 4): TrackCV5StageAssessmentInput {
  return {
    scores: {
      QUESTION_RESOLUTION: score,
      FACT_GROUNDING: score,
      CONTEXT_USE: score,
      NEXT_MOVE_QUALITY: score,
      NATURALNESS_LANA: score,
      CONCISION: score,
    },
    hardFailures: [],
    behaviorRequirementsSatisfied: true,
  };
}

describe("Track C C3 V5 benchmark scoring", () => {
  it("passes only when both production stages clear numeric and behavior gates", () => {
    const result = scoreTrackCV5BenchmarkCase({
      rubric: RUBRIC,
      lane: "PRODUCTION_CONTRACT",
      domain: "PRICE_VALUE",
      strategist: strategist(),
      responder: responder(),
    });

    expect(result.outcome).toBe("PASS");
    expect(result.strategist.passed).toBe(true);
    expect(result.responder.passed).toBe(true);
    expect(result.strategist.weightedScore).toBe(4);
    expect(result.responder.weightedScore).toBe(4);
  });

  it("does not let a perfect responder hide a strategist failure", () => {
    const weakStrategist = strategist();
    const result = scoreTrackCV5BenchmarkCase({
      rubric: RUBRIC,
      lane: "PRODUCTION_CONTRACT",
      domain: "CONVERSATION_CONTROL",
      strategist: {
        ...weakStrategist,
        scores: {
          ...weakStrategist.scores,
          QUESTION_RESOLUTION: 2,
        },
      },
      responder: responder(),
    });

    expect(result.outcome).toBe("FAIL");
    expect(result.strategist.passed).toBe(false);
    expect(result.strategist.failedDimensions).toContain("QUESTION_RESOLUTION");
    expect(result.responder.passed).toBe(true);
  });

  it("hard-fails invented protected facts even when every numeric score is perfect", () => {
    const hardFailure = "invented protected/business fact";
    const result = scoreTrackCV5BenchmarkCase({
      rubric: RUBRIC,
      lane: "PRODUCTION_CONTRACT",
      domain: "PRICE_VALUE",
      strategist: strategist(),
      responder: {
        ...responder(),
        hardFailures: [hardFailure],
      },
    });

    expect(result.outcome).toBe("FAIL");
    expect(result.hardFailures).toEqual([hardFailure]);
    expect(result.responder.passed).toBe(false);
  });

  it("enforces the production factual-grounding floor independently of weighted score", () => {
    const stage = strategist();
    const result = scoreTrackCV5BenchmarkCase({
      rubric: RUBRIC,
      lane: "PRODUCTION_CONTRACT",
      domain: "PRICE_VALUE",
      strategist: {
        ...stage,
        scores: { ...stage.scores, FACT_GROUNDING: 3 },
      },
      responder: responder(),
    });

    expect(result.outcome).toBe("FAIL");
    expect(result.strategist.failedDimensions).toContain("FACT_GROUNDING");
    expect(result.strategist.weightedScore).toBeGreaterThan(3.2);
  });

  it("allows an all-3 simulation case when its domain floors are satisfied", () => {
    const result = scoreTrackCV5BenchmarkCase({
      rubric: RUBRIC,
      lane: "BEHAVIOR_SIMULATION",
      domain: "CONVERSATION_CONTROL",
      strategist: strategist(3),
      responder: {
        ...responder(3),
        tuningNotes: ["Minor wording polish."],
      },
    });

    expect(result.outcome).toBe("PASS_WITH_NOTE");
    expect(result.strategist.passed).toBe(true);
    expect(result.responder.passed).toBe(true);
  });

  it("rejects fractional scores because the registered rubric is integer-only", () => {
    const invalid = responder();
    expect(() => scoreTrackCV5BenchmarkCase({
      rubric: RUBRIC,
      lane: "BEHAVIOR_SIMULATION",
      domain: "CONVERSATION_CONTROL",
      strategist: strategist(3),
      responder: {
        ...invalid,
        scores: { ...invalid.scores, CONCISION: 3.5 },
      },
    })).toThrow("TRACK_C_V5_RUBRIC_SCORE_INVALID:RESPONDER:CONCISION");
  });
});
