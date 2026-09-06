import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { assertTrackCC1MustPass, TRACK_C_C1_MUST_PASS_POLICY } from "./track-c-must-pass.js";
import {
  assertTrackCOfflineCandidateValidated,
} from "./track-c-offline-candidate-validation.js";
import {
  runTrackCReplay,
  type TrackCB3LiveObservationEnvelope,
  type TrackCOfflineCandidateValidatedEnvelope,
  type TrackCReplayResult,
} from "./track-c-replay.js";
import type {
  TrackCJudgeCallResult,
  TrackCQualityJudgePort,
} from "./track-c-quality-judge.js";

/** The accepted V2/LKG identity recorded in TRACK_B_INITIAL_LKG_V2_20260905. */
export const TRACK_C_ACCEPTED_V22_BASELINE = Object.freeze({
  release: "track-b-v22-b0aeb8907",
  sourceCommit: "b0aeb8907dae4ae2d9051b409ba25fa3f17fd188",
  authorityBundleHash:
    "56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8",
});

export interface TrackCOfflineQualityRunInput {
  /** A smoke confirms wiring only; it never establishes a quality improvement. */
  readonly runKind: "WIRING_SMOKE" | "CANDIDATE_EVALUATION";
  readonly acceptedBaseline: Readonly<{
    readonly release: string;
    readonly sourceCommit: string;
    readonly authorityBundleHash: string;
  }>;
  readonly mustPassReplay: TrackBLivePathReplayResult;
  readonly judge: TrackCQualityJudgePort;
  readonly cases: readonly {
    readonly caseId: string;
    readonly accepted: TrackCB3LiveObservationEnvelope;
    readonly candidate: TrackCOfflineCandidateValidatedEnvelope;
  }[];
}

type JudgeMetrics = Readonly<{
  readonly caseId: string;
  readonly accepted: Omit<TrackCJudgeCallResult, "assessment">;
  readonly candidate: Omit<TrackCJudgeCallResult, "assessment">;
}>;

export interface TrackCOfflineQualityEvidence {
  readonly contractVersion: "TRACK_C_OFFLINE_RUNNER_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly runKind: "WIRING_SMOKE" | "CANDIDATE_EVALUATION";
  /** A v22-vs-v22 smoke proves only that the offline runner and judge are callable. */
  readonly outcome: "WIRING_ONLY" | "QUALITY_COMPARISON";
  readonly acceptedBaseline: typeof TRACK_C_ACCEPTED_V22_BASELINE;
  readonly candidate: {
    readonly distinctReplyCaseCount: number;
    /** Hashes only: raw candidate requests, replies and credentials are never evidence output. */
    readonly identities: readonly {
      readonly caseId: string;
      readonly requestEnvelopeHash: string;
      readonly responseOutputHash: string;
      readonly providerModelVersion: string;
    }[];
  };
  readonly replay: TrackCReplayResult;
  /** Runtime telemetry is review-only and remains outside replay identities. */
  readonly judgeMetrics: readonly JudgeMetrics[];
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function assertAcceptedBaseline(
  baseline: TrackCOfflineQualityRunInput["acceptedBaseline"],
): void {
  if (
    baseline.release !== TRACK_C_ACCEPTED_V22_BASELINE.release ||
    baseline.sourceCommit !== TRACK_C_ACCEPTED_V22_BASELINE.sourceCommit ||
    baseline.authorityBundleHash !== TRACK_C_ACCEPTED_V22_BASELINE.authorityBundleHash
  ) {
    throw new Error("TRACK_C_OFFLINE_RUNNER_BASELINE_MISMATCH");
  }
}

function assertFrozenCaseSet(
  cases: TrackCOfflineQualityRunInput["cases"],
): void {
  const expected = TRACK_C_C1_MUST_PASS_POLICY.fixtures.map(({ caseId }) => caseId);
  const actual = cases.map(({ caseId }) => caseId);
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    !expected.every((caseId) => actual.includes(caseId))
  ) {
    throw new Error("TRACK_C_OFFLINE_RUNNER_CASE_SET_MISMATCH");
  }
}

function candidateBoundReplay(
  replay: TrackBLivePathReplayResult,
  candidates: ReadonlyMap<string, TrackCOfflineCandidateValidatedEnvelope>,
): TrackBLivePathReplayResult {
  return {
    ...replay,
    cases: replay.cases.map((item) => {
      const candidate = candidates.get(item.caseId);
      if (!candidate || item.qualityEnvelopeHashes === undefined) return item;
      return {
        ...item,
        qualityEnvelopeHashes: {
          ...item.qualityEnvelopeHashes,
          candidate: sha256(candidate),
        },
      };
    }),
  };
}

function recordingJudge(delegate: TrackCQualityJudgePort): Readonly<{
  readonly judge: TrackCQualityJudgePort;
  readonly calls: Array<TrackCJudgeCallResult | undefined>;
}> {
  const calls: Array<TrackCJudgeCallResult | undefined> = [];
  return Object.freeze({
    judge: Object.freeze({
      judgeSalesReplyV2Descriptor: () => delegate.judgeSalesReplyV2Descriptor(),
      judgeSalesReplyV2: async (
        ...args: Parameters<TrackCQualityJudgePort["judgeSalesReplyV2"]>
      ) => {
        const index = calls.length;
        calls.push(undefined);
        const result = await delegate.judgeSalesReplyV2(...args);
        calls[index] = result;
        return result;
      },
    }),
    calls,
  });
}

/**
 * One callable offline composition for a pre-built, independently guarded
 * candidate. It has no runtime/service/DB/effect authority; a local harness
 * may JSON-serialize its returned, redacted evidence for review.
 */
export async function runTrackCOfflineQuality(
  input: TrackCOfflineQualityRunInput,
): Promise<TrackCOfflineQualityEvidence> {
  // C1 is deliberately first, before candidate/replay/judge work.
  assertTrackCC1MustPass(input.mustPassReplay);
  assertAcceptedBaseline(input.acceptedBaseline);
  assertFrozenCaseSet(input.cases);

  const candidates = new Map<string, TrackCOfflineCandidateValidatedEnvelope>();
  for (const item of input.cases) {
    candidates.set(item.caseId, assertTrackCOfflineCandidateValidated(item.candidate));
  }
  const distinctReplyCaseCount = input.cases.filter(({ accepted, candidate }) =>
    accepted.quality.reply !== candidate.quality.reply
  ).length;
  if (input.runKind === "CANDIDATE_EVALUATION" && distinctReplyCaseCount === 0) {
    throw new Error("TRACK_C_OFFLINE_RUNNER_CANDIDATE_NOT_DISTINCT");
  }

  const recorders = new Map<string, ReturnType<typeof recordingJudge>>();
  const replay = await runTrackCReplay({
    mustPassReplay: candidateBoundReplay(input.mustPassReplay, candidates),
    cases: input.cases.map(({ caseId, accepted, candidate }) => {
      const recorder = recordingJudge(input.judge);
      recorders.set(caseId, recorder);
      return { caseId, judge: recorder.judge, accepted, candidate };
    }),
  });
  const judgeMetrics = replay.cases.map(({ caseId }) => {
    const calls = recorders.get(caseId)?.calls;
    if (calls?.length !== 2 || calls[0] === undefined || calls[1] === undefined) {
      throw new Error(`TRACK_C_OFFLINE_RUNNER_JUDGE_METRICS_MISSING:${caseId}`);
    }
    return Object.freeze({
      caseId,
      accepted: Object.freeze({
        latencyMs: calls[0].latencyMs,
        tokenUsage: calls[0].tokenUsage,
      }),
      candidate: Object.freeze({
        latencyMs: calls[1].latencyMs,
        tokenUsage: calls[1].tokenUsage,
      }),
    });
  });
  return Object.freeze({
    contractVersion: "TRACK_C_OFFLINE_RUNNER_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    runKind: input.runKind,
    outcome: input.runKind === "WIRING_SMOKE"
      ? "WIRING_ONLY"
      : "QUALITY_COMPARISON",
    acceptedBaseline: TRACK_C_ACCEPTED_V22_BASELINE,
    candidate: Object.freeze({
      distinctReplyCaseCount,
      identities: Object.freeze(input.cases.map(({ caseId, candidate }) => Object.freeze({
        caseId,
        requestEnvelopeHash: candidate.identity.requestEnvelopeHash,
        responseOutputHash: candidate.identity.responseOutputHash,
        providerModelVersion: candidate.identity.providerModelVersion,
      }))),
    }),
    replay,
    judgeMetrics: Object.freeze(judgeMetrics),
  });
}
