import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  TRACK_C_C1_MUST_PASS_POLICY,
  assertTrackCC1MustPass,
} from "./track-c-must-pass.js";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import {
  runTrackCQualityComparison,
  type TrackCQualityComparisonInput,
  type TrackCQualityComparisonResult,
} from "./track-c-quality-judge.js";

export interface TrackCReplayCaseInput {
  readonly caseId: string;
  readonly quality: Omit<TrackCQualityComparisonInput, "mustPassReplay">;
}

export interface TrackCReplayInput {
  readonly mustPassReplay: TrackBLivePathReplayResult;
  readonly cases: readonly TrackCReplayCaseInput[];
}

type MaterialRegressionCluster = {
  readonly caseIds: readonly string[];
  readonly reviewReasonCodes: readonly string[];
};

export interface TrackCReplayResult {
  readonly contractVersion: "TRACK_C_REPLAY_V1";
  /** C2 is an offline projection; it has no effect or delivery authority. */
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
    };
    readonly quality: {
      readonly disposition: "BETTER" | "SAME" | "WORSE";
      readonly overallScoreDelta: number;
      readonly requiresHumanReview: boolean;
      readonly reviewReasonCodes: readonly string[];
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

function materialRegressionClusters(
  cases: readonly TrackCReplayResult["cases"][number][],
): readonly MaterialRegressionCluster[] {
  const clusters = new Map<string, { caseIds: string[]; reviewReasonCodes: string[] }>();
  for (const item of cases) {
    if (item.quality.disposition !== "WORSE") continue;
    const reviewReasonCodes = [...item.quality.reviewReasonCodes];
    const key = canonicalJsonV1(reviewReasonCodes);
    const cluster = clusters.get(key) ?? { caseIds: [], reviewReasonCodes };
    cluster.caseIds.push(item.caseId);
    clusters.set(key, cluster);
  }
  return [...clusters.values()].map((cluster) => Object.freeze({
    caseIds: Object.freeze([...cluster.caseIds]),
    reviewReasonCodes: Object.freeze([...cluster.reviewReasonCodes]),
  }));
}

/**
 * C2 reuses the frozen C1 replay and C1.1 judge for a fixed seven-case,
 * side-effect-free accepted-versus-candidate comparison. It does not persist,
 * send, claim, or authorize any result.
 */
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
    const judged = await runTrackCQualityComparison({
      ...replayCase.quality,
      mustPassReplay: input.mustPassReplay,
    });
    cases.push(Object.freeze({
      caseId: replayCase.caseId,
      deterministic: Object.freeze({
        status: "PASS" as const,
        riskClasses: Object.freeze([...deterministicCase.riskClasses]),
        riskAssertionCodes: Object.freeze(
          deterministicCase.riskAssertions.map(({ assertionCode }) => assertionCode),
        ),
      }),
      quality: Object.freeze({
        disposition: judged.comparison.disposition,
        overallScoreDelta: judged.comparison.overallScoreDelta,
        requiresHumanReview: judged.comparison.requiresHumanReview,
        reviewReasonCodes: Object.freeze([...judged.comparison.reviewReasonCodes]),
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
