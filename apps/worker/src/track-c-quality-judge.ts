import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  type BusinessFactEnvelopeV1,
  type SalesRubricAssessmentV2,
} from "@lana/contracts";
import type { ShadowContextMessage } from "@lana/database";
import { assertTrackCC1MustPass } from "./track-c-must-pass.js";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import {
  VertexShadowModel,
  type JudgeSalesReplyV2Descriptor,
  type VertexShadowModelOptions,
} from "./vertex.js";

const HASH = /^[a-f0-9]{64}$/u;
const NEAR_TIE_DELTA = 0.25;
const TRACK_C_JUDGE_LOCATION = "global";
const TRACK_C_JUDGE_MODEL = "gemini-3.7-flash";

export interface TrackCJudgeCallResult {
  readonly assessment: SalesRubricAssessmentV2;
  readonly latencyMs: number;
  readonly tokenUsage: Readonly<{
    readonly prompt?: number;
    readonly completion?: number;
    readonly thinking?: number;
    readonly total?: number;
  }>;
}

export interface TrackCQualityJudgePort {
  judgeSalesReplyV2Descriptor(): JudgeSalesReplyV2Descriptor;
  judgeSalesReplyV2(
    context: readonly ShadowContextMessage[],
    actualReply: string,
    verifiedFacts: BusinessFactEnvelopeV1 | null,
    proposalSummary: unknown,
    guardOutcome: unknown,
  ): Promise<TrackCJudgeCallResult>;
}

/**
 * The only Track C composition: a fresh offline evaluator port that pins the
 * owner-selected judge without exposing generator methods or runtime wiring.
 */
export function createTrackCQualityJudge(
  options: VertexShadowModelOptions,
): TrackCQualityJudgePort {
  const model = new VertexShadowModel({
    ...options,
    judgeLocation: TRACK_C_JUDGE_LOCATION,
    judgeModelName: TRACK_C_JUDGE_MODEL,
  });
  const port: TrackCQualityJudgePort = {
    judgeSalesReplyV2Descriptor: () => model.judgeSalesReplyV2Descriptor(),
    judgeSalesReplyV2: (
      context: readonly ShadowContextMessage[],
      actualReply: string,
      verifiedFacts: BusinessFactEnvelopeV1 | null,
      proposalSummary: unknown,
      guardOutcome: unknown,
    ) => model.judgeSalesReplyV2WithMetrics(
      context,
      actualReply,
      verifiedFacts,
      proposalSummary,
      guardOutcome,
    ),
  };
  return Object.freeze(port);
}

export interface TrackCQualityReplyInput {
  readonly reply: string;
  readonly proposalSummary: unknown;
  readonly guardOutcome: unknown;
}

export interface TrackCQualityComparisonInput {
  readonly mustPassReplay: TrackBLivePathReplayResult;
  readonly judge: TrackCQualityJudgePort;
  readonly context: readonly ShadowContextMessage[];
  readonly verifiedFacts: BusinessFactEnvelopeV1 | null;
  readonly factFixtureHash: string;
  readonly accepted: TrackCQualityReplyInput;
  readonly candidate: TrackCQualityReplyInput;
}

type ReviewReasonCode =
  | "NEAR_TIE"
  | "UNEXPECTED_REGRESSION"
  | "JUDGE_DISAGREEMENT";

export interface TrackCQualityComparisonResult {
  readonly contractVersion: "TRACK_C_QUALITY_JUDGE_V2";
  /** This adapter returns evaluation evidence only; it cannot authorize effects. */
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly identity: {
    readonly mustPass: {
      readonly captureSetHash: string;
      readonly replayIdentityHash: string;
    };
    readonly judge: {
      readonly provider: string;
      readonly location: string;
      readonly model: string;
      readonly promptRubricHash: string;
      readonly generationConfigHash: string;
    };
    readonly verifiedFactFixtureHash: string;
    readonly verifiedFactsPayloadHash: string;
    readonly contextHash: string;
    readonly accepted: {
      readonly replyHash: string;
      readonly proposalSummaryHash: string;
      readonly guardOutcomeHash: string;
    };
    readonly candidate: {
      readonly replyHash: string;
      readonly proposalSummaryHash: string;
      readonly guardOutcomeHash: string;
    };
  };
  readonly accepted: SalesRubricAssessmentV2;
  readonly candidate: SalesRubricAssessmentV2;
  /** Runtime observation only. Never part of deterministic identity. */
  readonly metrics: {
    readonly accepted: Omit<TrackCJudgeCallResult, "assessment">;
    readonly candidate: Omit<TrackCJudgeCallResult, "assessment">;
    readonly wallClockMs: number;
  };
  readonly comparison: {
    readonly disposition: "BETTER" | "SAME" | "WORSE";
    readonly overallScoreDelta: number;
    readonly requiresHumanReview: boolean;
    readonly reviewReasonCodes: readonly ReviewReasonCode[];
  };
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function recommendationRank(
  assessment: SalesRubricAssessmentV2,
): number {
  switch (assessment.recommendationAction) {
    case "KEEP": return 2;
    case "HANDOFF_REVIEW": return 1;
    case "REWRITE": return 0;
  }
}

function hasJudgeDisagreement(
  overallScoreDelta: number,
  accepted: SalesRubricAssessmentV2,
  candidate: SalesRubricAssessmentV2,
): boolean {
  const recommendationDelta = recommendationRank(candidate) -
    recommendationRank(accepted);
  return recommendationDelta !== 0 && (
    Math.abs(overallScoreDelta) <= NEAR_TIE_DELTA ||
    Math.sign(recommendationDelta) !== Math.sign(overallScoreDelta)
  );
}

/**
 * Offline-only adapter: C1 MUST_PASS is asserted before scoring either reply,
 * then the same V2 judge configuration scores accepted and candidate replies.
 */
export async function runTrackCQualityComparison(
  input: TrackCQualityComparisonInput,
): Promise<TrackCQualityComparisonResult> {
  assertTrackCC1MustPass(input.mustPassReplay);
  if (!HASH.test(input.factFixtureHash)) {
    throw new Error("TRACK_C_C11_FACT_FIXTURE_HASH_INVALID");
  }
  if (input.factFixtureHash !== input.mustPassReplay.identity.factFixtureHash) {
    throw new Error("TRACK_C_C11_FACT_FIXTURE_MISMATCH");
  }
  const judgeDescriptor = input.judge.judgeSalesReplyV2Descriptor();
  if (
    judgeDescriptor.provider !== "VERTEX_AI" ||
    judgeDescriptor.location !== TRACK_C_JUDGE_LOCATION ||
    judgeDescriptor.model !== TRACK_C_JUDGE_MODEL
  ) {
    throw new Error("TRACK_C_C11_JUDGE_IDENTITY_MISMATCH");
  }

  const started = Date.now();
  const [acceptedCall, candidateCall] = await Promise.all([
    input.judge.judgeSalesReplyV2(
      input.context,
      input.accepted.reply,
      input.verifiedFacts,
      input.accepted.proposalSummary,
      input.accepted.guardOutcome,
    ),
    input.judge.judgeSalesReplyV2(
      input.context,
      input.candidate.reply,
      input.verifiedFacts,
      input.candidate.proposalSummary,
      input.candidate.guardOutcome,
    ),
  ]);
  const accepted = acceptedCall.assessment;
  const candidate = candidateCall.assessment;
  const overallScoreDelta = candidate.scores.overall - accepted.scores.overall;
  const disposition = overallScoreDelta > NEAR_TIE_DELTA
    ? "BETTER"
    : overallScoreDelta < -NEAR_TIE_DELTA
    ? "WORSE"
    : "SAME";
  const reviewReasonCodes: ReviewReasonCode[] = [];
  if (disposition === "SAME") reviewReasonCodes.push("NEAR_TIE");
  if (disposition === "WORSE") reviewReasonCodes.push("UNEXPECTED_REGRESSION");
  if (hasJudgeDisagreement(overallScoreDelta, accepted, candidate)) {
    reviewReasonCodes.push("JUDGE_DISAGREEMENT");
  }
  return {
    contractVersion: "TRACK_C_QUALITY_JUDGE_V2",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    identity: {
      mustPass: {
        captureSetHash: input.mustPassReplay.captureSetHash,
        replayIdentityHash: input.mustPassReplay.identityHash,
      },
      judge: {
        provider: judgeDescriptor.provider,
        location: judgeDescriptor.location,
        model: judgeDescriptor.model,
        promptRubricHash: sha256(judgeDescriptor.promptRubric),
        generationConfigHash: sha256(judgeDescriptor.generationConfig),
      },
      verifiedFactFixtureHash: input.factFixtureHash,
      verifiedFactsPayloadHash: sha256(input.verifiedFacts),
      contextHash: sha256(input.context),
      accepted: {
        replyHash: sha256(input.accepted.reply),
        proposalSummaryHash: sha256(input.accepted.proposalSummary),
        guardOutcomeHash: sha256(input.accepted.guardOutcome),
      },
      candidate: {
        replyHash: sha256(input.candidate.reply),
        proposalSummaryHash: sha256(input.candidate.proposalSummary),
        guardOutcomeHash: sha256(input.candidate.guardOutcome),
      },
    },
    accepted,
    candidate,
    metrics: {
      accepted: {
        latencyMs: acceptedCall.latencyMs,
        tokenUsage: acceptedCall.tokenUsage,
      },
      candidate: {
        latencyMs: candidateCall.latencyMs,
        tokenUsage: candidateCall.tokenUsage,
      },
      wallClockMs: Math.max(0, Date.now() - started),
    },
    comparison: {
      disposition,
      overallScoreDelta,
      requiresHumanReview: reviewReasonCodes.length > 0,
      reviewReasonCodes,
    },
  };
}
