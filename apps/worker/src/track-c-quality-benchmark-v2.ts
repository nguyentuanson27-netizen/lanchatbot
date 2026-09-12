/*
 * Track C C2 quality benchmark V2 public surface.
 *
 * The benchmark owns corpus/rubric/scoring/gating. Candidate-specific execution
 * stays outside C2; the current C3 two-pass candidate is exposed through
 * track-c-c3-two-pass-quality-adapter.ts.
 */
export {
  scoreTrackCV5BenchmarkCase as scoreTrackCQualityV2Case,
} from "./track-c-c3-v5-benchmark-scoring.js";
export type {
  TrackCV5RubricDimension as TrackCQualityV2RubricDimension,
  TrackCV5ScoringLane as TrackCQualityV2ScoringLane,
  TrackCV5Stage as TrackCQualityV2Stage,
  TrackCV5RubricConfig as TrackCQualityV2RubricConfig,
  TrackCV5StageAssessmentInput as TrackCQualityV2StageAssessmentInput,
  TrackCV5CaseScoringInput as TrackCQualityV2CaseScoringInput,
  TrackCV5StageScoreResult as TrackCQualityV2StageScoreResult,
  TrackCV5CaseScoreResult as TrackCQualityV2CaseScoreResult,
} from "./track-c-c3-v5-benchmark-scoring.js";

export {
  evaluateTrackCV5BenchmarkCase as evaluateTrackCQualityV2Case,
} from "./track-c-c3-v5-benchmark-evaluator.js";

export { createTrackCV5StageJudge as createTrackCQualityV2StageJudge }
  from "./track-c-c3-v5-stage-judge.js";
export type {
  TrackCV5JudgeDescriptor as TrackCQualityV2JudgeDescriptor,
  TrackCV5StageJudgeInput as TrackCQualityV2StageJudgeInput,
  TrackCV5StageJudgePort as TrackCQualityV2StageJudgePort,
  TrackCV5BenchmarkEvaluationInput as TrackCQualityV2EvaluationInput,
  TrackCV5BenchmarkEvaluationResult as TrackCQualityV2EvaluationResult,
} from "./track-c-c3-v5-benchmark-evaluator.js";

export {
  gateTrackCV5QualityResults as gateTrackCQualityV2Results,
} from "./track-c-c3-v5-benchmark-gate.js";
export type {
  TrackCV5ExecutionOutcome as TrackCQualityV2ExecutionOutcome,
  TrackCV5ProductionClassification as TrackCQualityV2ProductionClassification,
  TrackCV5ExpectedCase as TrackCQualityV2ExpectedCase,
  TrackCV5CaseExecutionRecord as TrackCQualityV2CaseExecutionRecord,
  TrackCV5QualityGateResult as TrackCQualityV2GateResult,
} from "./track-c-c3-v5-benchmark-gate.js";

export type {
  TrackCV5ExecutionLane as TrackCQualityV2ExecutionLane,
  TrackCV5RuntimeClaimFixture as TrackCQualityV2RuntimeClaimFixture,
  TrackCV5CompactCase as TrackCQualityV2CompactCase,
  TrackCV5MaterializationRecipe as TrackCQualityV2MaterializationRecipe,
  MaterializeTrackCV5CaseInput as MaterializeTrackCQualityV2CaseInput,
} from "./track-c-c3-v5-benchmark-materialization.js";
