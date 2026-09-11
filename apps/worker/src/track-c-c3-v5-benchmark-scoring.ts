export type TrackCV5RubricDimension =
  | "QUESTION_RESOLUTION"
  | "FACT_GROUNDING"
  | "CONTEXT_USE"
  | "NEXT_MOVE_QUALITY"
  | "NATURALNESS_LANA"
  | "CONCISION";

export type TrackCV5ScoringLane = "BEHAVIOR_SIMULATION" | "PRODUCTION_CONTRACT";
export type TrackCV5Stage = "STRATEGIST" | "RESPONDER";

export interface TrackCV5RubricConfig {
  readonly score_scale: Readonly<{
    readonly min: number;
    readonly max: number;
    readonly integer_only: boolean;
  }>;
  readonly dimensions: readonly Readonly<{
    readonly id: TrackCV5RubricDimension;
    readonly weight: number;
  }>[];
  readonly hard_failures: readonly string[];
  readonly weighted_score: Readonly<{
    readonly base_pass_threshold: Readonly<Record<TrackCV5ScoringLane, number>>;
    readonly required_dimension_floor: Readonly<Record<TrackCV5RubricDimension, number>>;
    readonly production_contract_overrides: Readonly<Partial<Record<TrackCV5RubricDimension, number>>>;
  }>;
  readonly domain_thresholds: Readonly<Record<
    string,
    Readonly<Partial<Record<TrackCV5RubricDimension, number>>>
  >>;
  readonly stage_scoring: Readonly<Record<
    TrackCV5Stage,
    Readonly<{
      readonly required: boolean;
      readonly dimensions: readonly TrackCV5RubricDimension[];
    }>
  >>;
}

export interface TrackCV5StageAssessmentInput {
  readonly scores: Readonly<Partial<Record<TrackCV5RubricDimension, number>>>;
  readonly hardFailures: readonly string[];
  /** True only when all case required behaviors are met and no material forbidden behavior remains. */
  readonly behaviorRequirementsSatisfied: boolean;
  readonly tuningNotes?: readonly string[];
}

export interface TrackCV5CaseScoringInput {
  readonly rubric: TrackCV5RubricConfig;
  readonly lane: TrackCV5ScoringLane;
  readonly domain: string;
  readonly strategist: TrackCV5StageAssessmentInput;
  readonly responder: TrackCV5StageAssessmentInput;
}

export interface TrackCV5StageScoreResult {
  readonly stage: TrackCV5Stage;
  readonly weightedScore: number;
  readonly threshold: number;
  readonly failedDimensions: readonly TrackCV5RubricDimension[];
  readonly hardFailures: readonly string[];
  readonly behaviorRequirementsSatisfied: boolean;
  readonly passed: boolean;
}

export interface TrackCV5CaseScoreResult {
  readonly contractVersion: "TRACK_C_V5_RUBRIC_SCORE_V1";
  readonly lane: TrackCV5ScoringLane;
  readonly domain: string;
  readonly strategist: TrackCV5StageScoreResult;
  readonly responder: TrackCV5StageScoreResult;
  readonly outcome: "PASS" | "PASS_WITH_NOTE" | "FAIL";
  readonly hardFailures: readonly string[];
  readonly tuningNotes: readonly string[];
}

const DIMENSIONS: readonly TrackCV5RubricDimension[] = [
  "QUESTION_RESOLUTION",
  "FACT_GROUNDING",
  "CONTEXT_USE",
  "NEXT_MOVE_QUALITY",
  "NATURALNESS_LANA",
  "CONCISION",
];

function assertRubric(rubric: TrackCV5RubricConfig): void {
  const ids = rubric.dimensions.map(({ id }) => id);
  if (
    ids.length !== DIMENSIONS.length ||
    new Set(ids).size !== ids.length ||
    DIMENSIONS.some((id) => !ids.includes(id))
  ) {
    throw new Error("TRACK_C_V5_RUBRIC_DIMENSIONS_INVALID");
  }
  const weightTotal = rubric.dimensions.reduce((sum, { weight }) => sum + weight, 0);
  if (!Number.isFinite(weightTotal) || Math.abs(weightTotal - 1) > 1e-12) {
    throw new Error("TRACK_C_V5_RUBRIC_WEIGHTS_INVALID");
  }
  if (
    rubric.score_scale.integer_only !== true ||
    !Number.isInteger(rubric.score_scale.min) ||
    !Number.isInteger(rubric.score_scale.max) ||
    rubric.score_scale.min >= rubric.score_scale.max
  ) {
    throw new Error("TRACK_C_V5_RUBRIC_SCALE_INVALID");
  }
  for (const stage of ["STRATEGIST", "RESPONDER"] as const) {
    const config = rubric.stage_scoring[stage];
    if (!config?.required || config.dimensions.length === 0 ||
        new Set(config.dimensions).size !== config.dimensions.length ||
        config.dimensions.some((id) => !ids.includes(id))) {
      throw new Error("TRACK_C_V5_RUBRIC_STAGE_INVALID");
    }
  }
}

function dimensionFloor(
  rubric: TrackCV5RubricConfig,
  lane: TrackCV5ScoringLane,
  domain: string,
  dimension: TrackCV5RubricDimension,
): number {
  const base = rubric.weighted_score.required_dimension_floor[dimension];
  const production = lane === "PRODUCTION_CONTRACT"
    ? rubric.weighted_score.production_contract_overrides[dimension]
    : undefined;
  const domainFloor = rubric.domain_thresholds[domain]?.[dimension];
  return Math.max(base, production ?? base, domainFloor ?? base);
}

function scoreStage(
  input: TrackCV5CaseScoringInput,
  stage: TrackCV5Stage,
  assessment: TrackCV5StageAssessmentInput,
): TrackCV5StageScoreResult {
  const stageDimensions = input.rubric.stage_scoring[stage].dimensions;
  const weights = new Map(
    input.rubric.dimensions.map(({ id, weight }) => [id, weight] as const),
  );
  const allowedHardFailures = new Set(input.rubric.hard_failures);
  if (assessment.hardFailures.some((failure) => !allowedHardFailures.has(failure))) {
    throw new Error("TRACK_C_V5_RUBRIC_HARD_FAILURE_UNKNOWN");
  }

  let weighted = 0;
  let totalWeight = 0;
  const failedDimensions: TrackCV5RubricDimension[] = [];
  for (const dimension of stageDimensions) {
    const score = assessment.scores[dimension];
    if (
      score === undefined ||
      !Number.isFinite(score) ||
      (input.rubric.score_scale.integer_only && !Number.isInteger(score)) ||
      score < input.rubric.score_scale.min ||
      score > input.rubric.score_scale.max
    ) {
      throw new Error(`TRACK_C_V5_RUBRIC_SCORE_INVALID:${stage}:${dimension}`);
    }
    const weight = weights.get(dimension);
    if (weight === undefined) {
      throw new Error("TRACK_C_V5_RUBRIC_DIMENSIONS_INVALID");
    }
    weighted += score * weight;
    totalWeight += weight;
    if (score < dimensionFloor(input.rubric, input.lane, input.domain, dimension)) {
      failedDimensions.push(dimension);
    }
  }
  if (totalWeight <= 0) throw new Error("TRACK_C_V5_RUBRIC_STAGE_INVALID");
  const weightedScore = weighted / totalWeight;
  const threshold = input.rubric.weighted_score.base_pass_threshold[input.lane];
  const hardFailures = [...new Set(assessment.hardFailures)];
  const passed = hardFailures.length === 0 &&
    assessment.behaviorRequirementsSatisfied &&
    failedDimensions.length === 0 &&
    weightedScore >= threshold;
  return Object.freeze({
    stage,
    weightedScore,
    threshold,
    failedDimensions: Object.freeze(failedDimensions),
    hardFailures: Object.freeze(hardFailures),
    behaviorRequirementsSatisfied: assessment.behaviorRequirementsSatisfied,
    passed,
  });
}

export function scoreTrackCV5BenchmarkCase(
  input: TrackCV5CaseScoringInput,
): TrackCV5CaseScoreResult {
  assertRubric(input.rubric);
  if (!input.rubric.domain_thresholds[input.domain]) {
    throw new Error(`TRACK_C_V5_RUBRIC_DOMAIN_UNKNOWN:${input.domain}`);
  }
  const strategist = scoreStage(input, "STRATEGIST", input.strategist);
  const responder = scoreStage(input, "RESPONDER", input.responder);
  const hardFailures = [...new Set([
    ...strategist.hardFailures,
    ...responder.hardFailures,
  ])].sort();
  const tuningNotes = [...new Set([
    ...(input.strategist.tuningNotes ?? []),
    ...(input.responder.tuningNotes ?? []),
  ].map((note) => note.trim()).filter(Boolean))];
  const passed = strategist.passed && responder.passed && hardFailures.length === 0;
  return Object.freeze({
    contractVersion: "TRACK_C_V5_RUBRIC_SCORE_V1",
    lane: input.lane,
    domain: input.domain,
    strategist,
    responder,
    outcome: !passed ? "FAIL" : tuningNotes.length > 0 ? "PASS_WITH_NOTE" : "PASS",
    hardFailures: Object.freeze(hardFailures),
    tuningNotes: Object.freeze(tuningNotes),
  });
}
