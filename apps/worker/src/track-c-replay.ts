import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  type BusinessFactEnvelopeV1,
  type SalesRubricAssessmentV2,
} from "@lana/contracts";
import type { ShadowContextMessage } from "@lana/database";
import {
  TRACK_C_C1_MUST_PASS_POLICY,
  assertTrackCC1MustPass,
} from "./track-c-must-pass.js";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import {
  runTrackCQualityComparison,
  type TrackCQualityComparisonResult,
  type TrackCQualityJudgePort,
  type TrackCQualityReplyInput,
} from "./track-c-quality-judge.js";

const SCORE_DIMENSIONS = Object.freeze([
  "relevance",
  "questionResolution",
  "nextStepQuality",
  "naturalness",
  "concision",
  "factGrounding",
  "objectionResolution",
  "salesProgression",
  "ctaStageFit",
  "overall",
] as const satisfies readonly (keyof SalesRubricAssessmentV2["scores"])[]);

type ScoreDimension = typeof SCORE_DIMENSIONS[number];
type QualityReasonCode =
  | "NO_MATERIAL_SCORE_DELTA"
  | "RECOMMENDATION_IMPROVEMENT"
  | "RECOMMENDATION_REGRESSION"
  | `SCORE_IMPROVEMENT:${ScoreDimension}`
  | `SCORE_REGRESSION:${ScoreDimension}`;

export interface TrackCReplayJudgeEnvelope extends TrackCQualityReplyInput {
  readonly context: readonly ShadowContextMessage[];
  readonly verifiedFacts: BusinessFactEnvelopeV1 | null;
}

export interface TrackCReplayCaseInput {
  readonly caseId: string;
  readonly judge: TrackCQualityJudgePort;
  /** Exact B3 observations, retained in memory only for this offline replay. */
  readonly accepted: TrackCReplayJudgeEnvelope;
  readonly candidate: TrackCReplayJudgeEnvelope;
  readonly calibrationSample?: boolean;
}

export interface TrackCReplayInput {
  readonly mustPassReplay: TrackBLivePathReplayResult;
  readonly cases: readonly TrackCReplayCaseInput[];
}

type MaterialRegressionCluster = {
  readonly caseIds: readonly string[];
  readonly riskClasses: readonly string[];
  readonly materialReasonCode: QualityReasonCode;
};

type QualityRationale = {
  readonly scoreDeltas: Readonly<Record<ScoreDimension, number>>;
  readonly acceptedRecommendationAction: SalesRubricAssessmentV2["recommendationAction"];
  readonly candidateRecommendationAction: SalesRubricAssessmentV2["recommendationAction"];
  /** Integrity without retaining free-form judge prose. */
  readonly acceptedAssessmentHash: string;
  readonly candidateAssessmentHash: string;
  readonly materialReasonCode: QualityReasonCode;
};

export interface TrackCReplayResult {
  readonly contractVersion: "TRACK_C_REPLAY_V1";
  /** C2 never has effect or delivery authority. */
  readonly sideEffects: "DISABLED";
  readonly holdout: "NOT_INCLUDED";
  readonly deterministic: {
    readonly status: "PASS";
    readonly caseCount: number;
    readonly riskClassCount: number;
    readonly captureSetHash: string;
    readonly replayIdentityHash: string;
  };
  readonly cases: readonly {
    readonly caseId: string;
    readonly deterministic: {
      readonly status: "PASS";
      readonly riskClasses: readonly string[];
      readonly riskAssertionCodes: readonly string[];
      readonly qualityEnvelopeHashes: Readonly<{
        readonly accepted: string;
        readonly candidate: string;
      }>;
    };
    readonly quality: {
      readonly disposition: "BETTER" | "SAME" | "WORSE";
      readonly overallScoreDelta: number;
      readonly requiresHumanReview: boolean;
      readonly reviewReasonCodes: readonly string[];
      readonly rationale: QualityRationale;
      readonly identity: TrackCQualityComparisonResult["identity"];
    };
  }[];
  readonly aggregate: {
    readonly better: number;
    readonly same: number;
    readonly worse: number;
    readonly materialRegressionClusters: readonly MaterialRegressionCluster[];
  };
  /** Same frozen inputs and judge results produce the same value. */
  readonly repeatabilityHash: string;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function exactFrozenCaseSet(caseIds: readonly string[]): boolean {
  const expected = TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => caseId);
  return caseIds.length === expected.length &&
    new Set(caseIds).size === caseIds.length &&
    expected.every((caseId) => caseIds.includes(caseId));
}

function recommendationRank(
  action: SalesRubricAssessmentV2["recommendationAction"],
): number {
  switch (action) {
    case "KEEP": return 2;
    case "HANDOFF_REVIEW": return 1;
    case "REWRITE": return 0;
  }
}

function materialReason(
  disposition: "BETTER" | "SAME" | "WORSE",
  scoreDeltas: Readonly<Record<ScoreDimension, number>>,
  accepted: SalesRubricAssessmentV2,
  candidate: SalesRubricAssessmentV2,
): QualityReasonCode {
  if (disposition === "SAME") return "NO_MATERIAL_SCORE_DELTA";

  const recommendationDelta = recommendationRank(candidate.recommendationAction) -
    recommendationRank(accepted.recommendationAction);
  const expectedSign = disposition === "BETTER" ? 1 : -1;
  if (recommendationDelta * expectedSign > 0) {
    return disposition === "BETTER"
      ? "RECOMMENDATION_IMPROVEMENT"
      : "RECOMMENDATION_REGRESSION";
  }
  const selected = SCORE_DIMENSIONS.reduce((best, dimension) =>
    scoreDeltas[dimension] * expectedSign > scoreDeltas[best] * expectedSign
      ? dimension
      : best, SCORE_DIMENSIONS[0]);
  return disposition === "BETTER"
    ? `SCORE_IMPROVEMENT:${selected}`
    : `SCORE_REGRESSION:${selected}`;
}

function qualityRationale(
  judged: TrackCQualityComparisonResult,
): QualityRationale {
  const scoreDeltas = Object.freeze(Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [
      dimension,
      judged.candidate.scores[dimension] - judged.accepted.scores[dimension],
    ]),
  ) as Record<ScoreDimension, number>);
  return Object.freeze({
    scoreDeltas,
    acceptedRecommendationAction: judged.accepted.recommendationAction,
    candidateRecommendationAction: judged.candidate.recommendationAction,
    acceptedAssessmentHash: sha256(judged.accepted),
    candidateAssessmentHash: sha256(judged.candidate),
    materialReasonCode: materialReason(
      judged.comparison.disposition,
      scoreDeltas,
      judged.accepted,
      judged.candidate,
    ),
  });
}

function assertObservationBinding(
  replayCase: TrackBLivePathReplayResult["cases"][number],
  inputCase: TrackCReplayCaseInput,
): Readonly<{ accepted: string; candidate: string }> {
  const expected = replayCase.qualityEnvelopeHashes;
  if (expected === undefined) {
    throw new Error(`TRACK_C_C2_B3_ENVELOPE_MISSING:${inputCase.caseId}`);
  }
  const actual = Object.freeze({
    accepted: sha256(inputCase.accepted),
    candidate: sha256(inputCase.candidate),
  });
  if (expected.baseline !== actual.accepted || expected.candidate !== actual.candidate) {
    throw new Error(`TRACK_C_C2_B3_ENVELOPE_MISMATCH:${inputCase.caseId}`);
  }
  if (sha256(inputCase.accepted.context) !== sha256(inputCase.candidate.context)) {
    throw new Error(`TRACK_C_C2_CONTEXT_MISMATCH:${inputCase.caseId}`);
  }
  if (
    sha256(inputCase.accepted.verifiedFacts) !==
      sha256(inputCase.candidate.verifiedFacts)
  ) {
    throw new Error(`TRACK_C_C2_VERIFIED_FACTS_MISMATCH:${inputCase.caseId}`);
  }
  return actual;
}

function materialRegressionClusters(
  cases: readonly TrackCReplayResult["cases"][number][],
): readonly MaterialRegressionCluster[] {
  const clusters = new Map<string, {
    caseIds: string[];
    riskClasses: string[];
    materialReasonCode: QualityReasonCode;
  }>();
  for (const item of cases) {
    if (item.quality.disposition !== "WORSE") continue;
    const riskClasses = [...item.deterministic.riskClasses].sort();
    const materialReasonCode = item.quality.rationale.materialReasonCode;
    const key = canonicalJsonV1({ riskClasses, materialReasonCode });
    const cluster = clusters.get(key) ?? {
      caseIds: [],
      riskClasses,
      materialReasonCode,
    };
    cluster.caseIds.push(item.caseId);
    clusters.set(key, cluster);
  }
  return [...clusters.values()].map((cluster) => Object.freeze({
    caseIds: Object.freeze([...cluster.caseIds]),
    riskClasses: Object.freeze([...cluster.riskClasses]),
    materialReasonCode: cluster.materialReasonCode,
  }));
}

/** C2 binds frozen B3 observations before invoking C1.1's offline judge. */
export async function runTrackCReplay(
  input: TrackCReplayInput,
): Promise<TrackCReplayResult> {
  assertTrackCC1MustPass(input.mustPassReplay);
  const inputCaseIds = input.cases.map(({ caseId }) => caseId);
  const replayCaseIds = input.mustPassReplay.cases.map(({ caseId }) => caseId);
  if (!exactFrozenCaseSet(inputCaseIds) || !exactFrozenCaseSet(replayCaseIds)) {
    throw new Error("TRACK_C_C2_CASE_SET_MISMATCH");
  }
  if (inputCaseIds.some((caseId) => !replayCaseIds.includes(caseId))) {
    throw new Error("TRACK_C_C2_CASE_REPLAY_MISMATCH");
  }

  const replayCases = new Map(
    input.mustPassReplay.cases.map((item) => [item.caseId, item]),
  );
  const cases: TrackCReplayResult["cases"][number][] = [];
  for (const replayCase of input.cases) {
    const deterministicCase = replayCases.get(replayCase.caseId)!;
    const qualityEnvelopeHashes = assertObservationBinding(
      deterministicCase,
      replayCase,
    );
    const judged = await runTrackCQualityComparison({
      mustPassReplay: input.mustPassReplay,
      judge: replayCase.judge,
      context: replayCase.accepted.context,
      verifiedFacts: replayCase.accepted.verifiedFacts,
      factFixtureHash: input.mustPassReplay.identity.factFixtureHash,
      accepted: replayCase.accepted,
      candidate: replayCase.candidate,
      ...(replayCase.calibrationSample === undefined
        ? {}
        : { calibrationSample: replayCase.calibrationSample }),
    });
    cases.push(Object.freeze({
      caseId: replayCase.caseId,
      deterministic: Object.freeze({
        status: "PASS" as const,
        riskClasses: Object.freeze([...deterministicCase.riskClasses]),
        riskAssertionCodes: Object.freeze(
          deterministicCase.riskAssertions.map(({ assertionCode }) => assertionCode),
        ),
        qualityEnvelopeHashes,
      }),
      quality: Object.freeze({
        disposition: judged.comparison.disposition,
        overallScoreDelta: judged.comparison.overallScoreDelta,
        requiresHumanReview: judged.comparison.requiresHumanReview,
        reviewReasonCodes: Object.freeze([...judged.comparison.reviewReasonCodes]),
        rationale: qualityRationale(judged),
        identity: judged.identity,
      }),
    }));
  }

  const aggregate = Object.freeze({
    better: cases.filter(({ quality }) => quality.disposition === "BETTER").length,
    same: cases.filter(({ quality }) => quality.disposition === "SAME").length,
    worse: cases.filter(({ quality }) => quality.disposition === "WORSE").length,
    materialRegressionClusters: materialRegressionClusters(cases),
  });
  const result = {
    contractVersion: "TRACK_C_REPLAY_V1" as const,
    sideEffects: "DISABLED" as const,
    holdout: "NOT_INCLUDED" as const,
    deterministic: Object.freeze({
      status: "PASS" as const,
      caseCount: cases.length,
      riskClassCount: input.mustPassReplay.coverage.coveredRiskClasses.length,
      captureSetHash: input.mustPassReplay.captureSetHash,
      replayIdentityHash: input.mustPassReplay.identityHash,
    }),
    cases: Object.freeze(cases),
    aggregate,
  };
  return Object.freeze({ ...result, repeatabilityHash: sha256(result) });
}
