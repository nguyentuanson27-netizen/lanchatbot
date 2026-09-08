import { createHash } from "node:crypto";
import { canonicalJsonV1, type BusinessFactEnvelopeV1 } from "@lana/contracts";
import { redactAnalyticsMessage, type ShadowContextMessage } from "@lana/database";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { redactCustomerUrlsForModel } from "./customer-url-policy.js";
import {
  assertTrackCC1CandidateMustPass,
  assertTrackCC1MustPass,
  TRACK_C_C1_MUST_PASS_POLICY,
} from "./track-c-must-pass.js";
import {
  assertTrackCOfflineCandidateValidated,
} from "./track-c-offline-candidate-validation.js";
import {
  runTrackCReplay,
  type TrackCB3LiveObservationEnvelope,
  type TrackCOfflineCandidateValidatedEnvelope,
  type TrackCReplayResult,
} from "./track-c-replay.js";
import {
  runTrackCQualitySuiteGate,
  type TrackCQualitySuiteGateInput,
  type TrackCQualitySuiteGateResult,
} from "./track-c-quality-suite-gate.js";
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
  readonly onCaseComplete?: (
    checkpoint: TrackCOfflineCaseCheckpoint,
  ) => void | Promise<void>;
  /** Mandatory for a candidate evaluation; wiring smoke remains B3-only. */
  readonly qualitySuite?: Omit<TrackCQualitySuiteGateInput, "mustPassReplay" | "judge">;
}

type JudgeMetrics = Readonly<{
  readonly caseId: string;
  readonly accepted: Omit<TrackCJudgeCallResult, "assessment">;
  readonly candidate: Omit<TrackCJudgeCallResult, "assessment">;
}>;

export interface TrackCOfflineCaseCheckpoint {
  readonly contractVersion: "TRACK_C_OFFLINE_CASE_CHECKPOINT_V2";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly caseId: string;
  readonly replay: TrackCReplayResult["cases"][number];
  /** Runtime telemetry is review-only and remains outside replay identities. */
  readonly judgeMetrics: JudgeMetrics | null;
  /**
   * Exact frozen-fixture replies for owner-local review. This is not a human
   * review route, a provider payload, or an identity input.
   */
  readonly ownerLocalReplyPair: TrackCOfflineOwnerLocalReplyPair;
  /** Null unless this completed case is routed to human review. */
  readonly humanReview: TrackCOfflineHumanReviewCase | null;
}

export interface TrackCOfflineOwnerLocalReplyPair {
  readonly caseId: string;
  readonly accepted: Readonly<{
    readonly reply: string;
    readonly replyHash: string;
  }>;
  readonly candidate: Readonly<{
    readonly reply: string;
    readonly replyHash: string;
  }>;
}

export interface TrackCOfflineOwnerLocalReplyHistory {
  readonly contractVersion: "TRACK_C_OFFLINE_OWNER_LOCAL_REPLY_HISTORY_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  /** Frozen PII-safe test fixtures; never emit this material outside owner-local evidence. */
  readonly ownerLocalOnly: true;
  readonly cases: readonly TrackCOfflineOwnerLocalReplyPair[];
}

export interface TrackCOfflineHumanReviewCase {
  readonly caseId: string;
  readonly context: readonly Pick<
    ShadowContextMessage,
    "direction" | "senderType" | "messageType" | "text" | "attachmentCount"
  >[];
  /** URL-free projection of exactly the facts the judge received. */
  readonly verifiedFacts: Readonly<{
      readonly payloadHash: string;
      readonly status: BusinessFactEnvelopeV1["status"] | "NO_FACTS";
      readonly source: BusinessFactEnvelopeV1["source"] | null;
      readonly observedAt: string | null;
      readonly expiresAt: string | null;
      readonly productId: string | null;
      readonly reasonCode: string | null;
      readonly facts: null | Readonly<{
        readonly productId: string;
        readonly parentProductId: string;
        readonly offerType: string;
        readonly listPriceVnd: number | null;
        readonly salePriceVnd: number | null;
        readonly sizes: readonly string[];
        readonly stockStatus: string;
        readonly stockQuantity: number | null;
        readonly deliveryEta: Readonly<{ readonly minDays: number; readonly maxDays: number }> | null;
        readonly fulfillmentPolicy: string | null;
      }>;
      readonly policyContext: BusinessFactEnvelopeV1["policyContext"] | null;
  }>;
  readonly accepted: Readonly<{
      readonly reply: string;
      readonly replyHash: string;
      /** Scores only; free-form judge text is not review evidence. */
      readonly assessment: Pick<
        TrackCJudgeCallResult["assessment"],
        "scores" | "recommendationAction"
      >;
  }>;
  readonly candidate: Readonly<{
      readonly reply: string;
      readonly replyHash: string;
      /** Scores only; free-form judge text is not review evidence. */
      readonly assessment: Pick<
        TrackCJudgeCallResult["assessment"],
        "scores" | "recommendationAction"
      >;
  }>;
  readonly quality: Readonly<{
      readonly disposition: "BETTER" | "SAME" | "WORSE";
      readonly overallScoreDelta: number;
      readonly reviewReasonCodes: readonly string[];
  }>;
}

export interface TrackCOfflineHumanReviewArtifact {
  readonly contractVersion: "TRACK_C_OFFLINE_HUMAN_REVIEW_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  /** Only cases already routed to human review expose a PII-safe reply pair. */
  readonly cases: readonly TrackCOfflineHumanReviewCase[];
}

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
  /** PII-safe review material for only the cases the V2 contract routes to a human. */
  readonly humanReview: TrackCOfflineHumanReviewArtifact;
  /** Exact frozen B3 reply pairs for owner-local review of every completed case. */
  readonly ownerLocalReplyHistory: TrackCOfflineOwnerLocalReplyHistory;
  /** Required C2 quality gate for candidate evaluation; never authorizes selection. */
  readonly qualitySuite: TrackCQualitySuiteGateResult | null;
  /** B3 and the mandatory suite combined for owner review; never auto-selects. */
  readonly candidateReadiness: Readonly<{
    readonly status:
      | "AWAITING_OWNER_APPROVAL"
      | "NO_CLEAR_IMPROVEMENT"
      | "REGRESSION_DETECTED"
      | "INCOMPLETE";
    readonly selectionAuthorized: false;
  }> | null;
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

function assertOwnerLocalReplyInputsSafe(
  cases: TrackCOfflineQualityRunInput["cases"],
): void {
  for (const { caseId, accepted, candidate } of cases) {
    assertTrackCOfflineHumanReviewTextSafe(accepted.quality.reply, `${caseId}:accepted`);
    assertTrackCOfflineHumanReviewTextSafe(candidate.quality.reply, `${caseId}:candidate`);
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

function metricsForCase(
  caseId: string,
  recorders: ReadonlyMap<string, ReturnType<typeof recordingJudge>>,
): JudgeMetrics {
  const calls = recorders.get(caseId)?.calls;
  if (calls?.length !== 2 || calls[0] === undefined || calls[1] === undefined) {
    throw new Error(`TRACK_C_OFFLINE_RUNNER_JUDGE_METRICS_MISSING:${caseId}`);
  }
  return Object.freeze({
    caseId,
    accepted: Object.freeze({
      latencyMs: calls[0].latencyMs,
      tokenUsage: Object.freeze({ ...calls[0].tokenUsage }),
    }),
    candidate: Object.freeze({
      latencyMs: calls[1].latencyMs,
      tokenUsage: Object.freeze({ ...calls[1].tokenUsage }),
    }),
  });
}

export function assertTrackCOfflineHumanReviewTextSafe(
  value: string,
  label: string,
): string {
  const redacted = redactAnalyticsMessage(value);
  const withoutCustomerUrls = redactCustomerUrlsForModel(redacted.text);
  if (redacted.dlpStatus !== "PASSED" || withoutCustomerUrls !== value) {
    throw new Error(`TRACK_C_OFFLINE_HUMAN_REVIEW_TEXT_NOT_PII_SAFE:${label}`);
  }
  return value;
}

function redactTrackCOfflineHumanReviewContextText(value: string): string {
  return redactCustomerUrlsForModel(redactAnalyticsMessage(value).text);
}

function humanReviewContext(
  context: readonly ShadowContextMessage[],
  caseId: string,
): TrackCOfflineHumanReviewArtifact["cases"][number]["context"] {
  return Object.freeze(context.map((message, index) => Object.freeze({
    direction: message.direction,
    senderType: message.senderType,
    messageType: message.messageType,
    // Display-only: the original context remains bound by the replay identity.
    text: redactTrackCOfflineHumanReviewContextText(message.text),
    attachmentCount: message.attachmentCount,
  })));
}

function humanReviewFacts(
  facts: BusinessFactEnvelopeV1 | null,
  expectedHash: string,
  caseId: string,
): TrackCOfflineHumanReviewArtifact["cases"][number]["verifiedFacts"] {
  if (sha256(facts) !== expectedHash) {
    throw new Error(`TRACK_C_OFFLINE_HUMAN_REVIEW_FACT_HASH_MISMATCH:${caseId}`);
  }
  if (facts === null) {
    return Object.freeze({
      payloadHash: expectedHash,
      status: "NO_FACTS",
      source: null,
      observedAt: null,
      expiresAt: null,
      productId: null,
      reasonCode: null,
      facts: null,
      policyContext: null,
    });
  }
  const factsProjection = facts.facts === null ? null : Object.freeze({
    productId: assertTrackCOfflineHumanReviewTextSafe(
      facts.facts.productId,
      `${caseId}:facts:productId`,
    ),
    parentProductId: assertTrackCOfflineHumanReviewTextSafe(
      facts.facts.parentProductId,
      `${caseId}:facts:parentProductId`,
    ),
    offerType: assertTrackCOfflineHumanReviewTextSafe(
      facts.facts.offerType,
      `${caseId}:facts:offerType`,
    ),
    listPriceVnd: facts.facts.listPriceVnd,
    salePriceVnd: facts.facts.salePriceVnd,
    sizes: Object.freeze(facts.facts.sizes.map((size, index) =>
      assertTrackCOfflineHumanReviewTextSafe(size, `${caseId}:facts:size:${index}`),
    )),
    stockStatus: facts.facts.stockStatus,
    stockQuantity: facts.facts.stockQuantity,
    deliveryEta: facts.facts.deliveryEta === null ? null : Object.freeze({
      minDays: facts.facts.deliveryEta.minDays,
      maxDays: facts.facts.deliveryEta.maxDays,
    }),
    fulfillmentPolicy: facts.facts.fulfillmentPolicy === null ? null :
      assertTrackCOfflineHumanReviewTextSafe(
        facts.facts.fulfillmentPolicy,
        `${caseId}:facts:fulfillmentPolicy`,
      ),
  });
  return Object.freeze({
    payloadHash: expectedHash,
    status: facts.status,
    source: facts.source,
    observedAt: facts.observedAt,
    expiresAt: facts.expiresAt,
    productId: assertTrackCOfflineHumanReviewTextSafe(
      facts.productId,
      `${caseId}:productId`,
    ),
    reasonCode: facts.reasonCode === null ? null :
      assertTrackCOfflineHumanReviewTextSafe(facts.reasonCode, `${caseId}:reasonCode`),
    facts: factsProjection,
    policyContext: facts.policyContext === undefined || facts.policyContext === null
      ? null
      : Object.freeze({
        fulfillmentPolicy: facts.policyContext.fulfillmentPolicy === null ? null :
          assertTrackCOfflineHumanReviewTextSafe(
            facts.policyContext.fulfillmentPolicy,
            `${caseId}:policyContext:fulfillmentPolicy`,
          ),
        canOrderWhenZero: facts.policyContext.canOrderWhenZero,
      }),
  });
}

function humanReviewCase(input: Readonly<{
  readonly source: TrackCOfflineQualityRunInput["cases"][number];
  readonly replay: TrackCReplayResult["cases"][number];
  readonly recorder: ReturnType<typeof recordingJudge> | undefined;
}>): TrackCOfflineHumanReviewCase | null {
  const replayCase = input.replay;
  if (replayCase.quality.status === "HANDOFF_CORRECT") return null;
  if (!replayCase.quality.requiresHumanReview) return null;
  const source = input.source;
  const calls = input.recorder?.calls;
  if (calls?.length !== 2 || calls[0] === undefined || calls[1] === undefined) {
    throw new Error(`TRACK_C_OFFLINE_HUMAN_REVIEW_MATERIAL_MISSING:${replayCase.caseId}`);
  }
  const acceptedReply = assertTrackCOfflineHumanReviewTextSafe(
    source.accepted.quality.reply,
    `${replayCase.caseId}:accepted`,
  );
  const candidateReply = assertTrackCOfflineHumanReviewTextSafe(
    source.candidate.quality.reply,
    `${replayCase.caseId}:candidate`,
  );
  if (
    sha256(acceptedReply) !== replayCase.quality.identity.accepted.replyHash ||
    sha256(candidateReply) !== replayCase.quality.identity.candidate.replyHash
  ) {
    throw new Error(`TRACK_C_OFFLINE_HUMAN_REVIEW_REPLY_HASH_MISMATCH:${replayCase.caseId}`);
  }
  return Object.freeze({
    caseId: replayCase.caseId,
    context: humanReviewContext(source.accepted.quality.context, replayCase.caseId),
    verifiedFacts: humanReviewFacts(
      source.accepted.quality.verifiedFacts,
      replayCase.quality.identity.verifiedFactsPayloadHash,
      replayCase.caseId,
    ),
    accepted: Object.freeze({
      reply: acceptedReply,
      replyHash: replayCase.quality.identity.accepted.replyHash,
      assessment: Object.freeze({
        scores: Object.freeze({ ...calls[0].assessment.scores }),
        recommendationAction: calls[0].assessment.recommendationAction,
      }),
    }),
    candidate: Object.freeze({
      reply: candidateReply,
      replyHash: replayCase.quality.identity.candidate.replyHash,
      assessment: Object.freeze({
        scores: Object.freeze({ ...calls[1].assessment.scores }),
        recommendationAction: calls[1].assessment.recommendationAction,
      }),
    }),
    quality: Object.freeze({
      disposition: replayCase.quality.disposition,
      overallScoreDelta: replayCase.quality.overallScoreDelta,
      reviewReasonCodes: Object.freeze([...replayCase.quality.reviewReasonCodes]),
    }),
  });
}

function ownerLocalReplyPair(input: Readonly<{
  readonly source: TrackCOfflineQualityRunInput["cases"][number];
  readonly replay: TrackCReplayResult["cases"][number];
}>): TrackCOfflineOwnerLocalReplyPair {
  const acceptedReply = assertTrackCOfflineHumanReviewTextSafe(
    input.source.accepted.quality.reply,
    `${input.replay.caseId}:accepted`,
  );
  const candidateReply = assertTrackCOfflineHumanReviewTextSafe(
    input.source.candidate.quality.reply,
    `${input.replay.caseId}:candidate`,
  );
  const acceptedReplyHash = sha256(acceptedReply);
  const candidateReplyHash = sha256(candidateReply);
  if (input.replay.quality.status === "SCORED" && (
    input.replay.quality.identity.accepted.replyHash !== acceptedReplyHash ||
    input.replay.quality.identity.candidate.replyHash !== candidateReplyHash
  )) {
    throw new Error(`TRACK_C_OFFLINE_OWNER_LOCAL_REPLY_HASH_MISMATCH:${input.replay.caseId}`);
  }
  return Object.freeze({
    caseId: input.replay.caseId,
    accepted: Object.freeze({ reply: acceptedReply, replyHash: acceptedReplyHash }),
    candidate: Object.freeze({ reply: candidateReply, replyHash: candidateReplyHash }),
  });
}

function ownerLocalReplyHistory(input: Readonly<{
  readonly replay: TrackCReplayResult;
  readonly cases: ReadonlyMap<string, TrackCOfflineOwnerLocalReplyPair>;
}>): TrackCOfflineOwnerLocalReplyHistory {
  const cases = input.replay.cases.map((replayCase) => {
    const pair = input.cases.get(replayCase.caseId);
    if (pair === undefined) {
      throw new Error(`TRACK_C_OFFLINE_OWNER_LOCAL_REPLY_MISSING:${replayCase.caseId}`);
    }
    return pair;
  });
  return Object.freeze({
    contractVersion: "TRACK_C_OFFLINE_OWNER_LOCAL_REPLY_HISTORY_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    ownerLocalOnly: true,
    cases: Object.freeze(cases),
  });
}

function humanReviewArtifact(input: Readonly<{
  readonly replay: TrackCReplayResult;
  readonly cases: ReadonlyMap<string, TrackCOfflineHumanReviewCase>;
}>): TrackCOfflineHumanReviewArtifact {
  const cases = input.replay.cases.flatMap((replayCase) => {
    if (replayCase.quality.status === "HANDOFF_CORRECT") return [];
    if (!replayCase.quality.requiresHumanReview) return [];
    const review = input.cases.get(replayCase.caseId);
    if (review === undefined) {
      throw new Error(`TRACK_C_OFFLINE_HUMAN_REVIEW_MATERIAL_MISSING:${replayCase.caseId}`);
    }
    return [review];
  });
  return Object.freeze({
    contractVersion: "TRACK_C_OFFLINE_HUMAN_REVIEW_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    cases: Object.freeze(cases),
  });
}

/**
 * One callable offline composition for a pre-built, independently guarded
 * candidate. It has no runtime/service/DB/effect authority; a local harness
 * may JSON-serialize its returned owner-local fixture evidence for review.
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
  assertTrackCC1CandidateMustPass(input.mustPassReplay, input.cases);
  // C1 still leads; this must run before the offline Judge sees any reply.
  assertOwnerLocalReplyInputsSafe(input.cases);
  const distinctReplyCaseCount = input.cases.filter(({ accepted, candidate }) =>
    candidate.quality.guardOutcome.expectedOwner === "BOT" &&
    accepted.quality.reply !== candidate.quality.reply
  ).length;
  if (input.runKind === "CANDIDATE_EVALUATION" && distinctReplyCaseCount === 0) {
    throw new Error("TRACK_C_OFFLINE_RUNNER_CANDIDATE_NOT_DISTINCT");
  }
  if (input.runKind === "CANDIDATE_EVALUATION" && input.qualitySuite === undefined) {
    throw new Error("TRACK_C_OFFLINE_RUNNER_QUALITY_SUITE_REQUIRED");
  }

  const recorders = new Map<string, ReturnType<typeof recordingJudge>>();
  const sourceCases = new Map(input.cases.map((item) => [item.caseId, item]));
  const humanReviewCases = new Map<string, TrackCOfflineHumanReviewCase>();
  const ownerLocalReplyPairs = new Map<string, TrackCOfflineOwnerLocalReplyPair>();
  const replay = await runTrackCReplay({
    mustPassReplay: candidateBoundReplay(input.mustPassReplay, candidates),
    cases: input.cases.map(({ caseId, accepted, candidate }) => {
      if (candidate.quality.guardOutcome.expectedOwner === "HUMAN") {
        return { caseId, judge: input.judge, accepted, candidate };
      }
      const recorder = recordingJudge(input.judge);
      recorders.set(caseId, recorder);
      return { caseId, judge: recorder.judge, accepted, candidate };
    }),
    onCaseComplete: async (replayCase: TrackCReplayResult["cases"][number]) => {
      const source = sourceCases.get(replayCase.caseId);
      if (source === undefined) {
        throw new Error(`TRACK_C_OFFLINE_OWNER_LOCAL_REPLY_MATERIAL_MISSING:${replayCase.caseId}`);
      }
      const humanReview = humanReviewCase({
        source,
        replay: replayCase,
        recorder: recorders.get(replayCase.caseId),
      });
      if (humanReview !== null) humanReviewCases.set(replayCase.caseId, humanReview);
      const ownerLocalReply = ownerLocalReplyPair({ source, replay: replayCase });
      ownerLocalReplyPairs.set(replayCase.caseId, ownerLocalReply);
      const judgeMetrics = replayCase.quality.status === "SCORED"
        ? metricsForCase(replayCase.caseId, recorders)
        : null;
      await input.onCaseComplete?.(Object.freeze({
          contractVersion: "TRACK_C_OFFLINE_CASE_CHECKPOINT_V2",
          evaluationOnly: true,
          sideEffects: "DISABLED",
          caseId: replayCase.caseId,
          replay: structuredClone(replayCase),
          judgeMetrics,
          ownerLocalReplyPair: ownerLocalReply,
          humanReview,
      }));
    },
  });
  const judgeMetrics = replay.cases.flatMap(({ caseId, quality }) =>
    quality.status === "SCORED" ? [metricsForCase(caseId, recorders)] : []);
  const qualitySuite = input.runKind === "CANDIDATE_EVALUATION"
    ? await runTrackCQualitySuiteGate({
      ...input.qualitySuite!,
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
    })
    : null;
  const candidateReadiness = qualitySuite === null ? null : Object.freeze({
    status: replay.aggregate.worse > 0
      ? "REGRESSION_DETECTED" as const
      : qualitySuite.gate.status,
    selectionAuthorized: false as const,
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
    humanReview: humanReviewArtifact({ replay, cases: humanReviewCases }),
    ownerLocalReplyHistory: ownerLocalReplyHistory({ replay, cases: ownerLocalReplyPairs }),
    qualitySuite,
    candidateReadiness,
  });
}
