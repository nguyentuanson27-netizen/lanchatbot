import { createHash } from "node:crypto";
import { canonicalJsonV1, type SalesRubricAssessmentV2 } from "@lana/contracts";
import { redactAnalyticsMessage, type ShadowContextMessage } from "@lana/database";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
import { redactCustomerUrlsForModel } from "./customer-url-policy.js";
import { assertTrackCC1MustPass } from "./track-c-must-pass.js";
import {
  qualitySuiteFactsForJudge,
  TRACK_C_QUALITY_SUITE_V1,
  type TrackCQualityFixtureV1,
} from "./track-c-quality-suite.js";
import {
  runTrackCQualityComparison,
  type TrackCQualityComparisonResult,
  type TrackCQualityJudgePort,
  type TrackCQualityReplyInput,
} from "./track-c-quality-judge.js";

const QUALITY_SUITE_FIXTURE_SET_HASH = createHash("sha256")
  .update(canonicalJsonV1(TRACK_C_QUALITY_SUITE_V1), "utf8")
  .digest("hex");

export interface TrackCQualitySuiteCaseInput {
  readonly caseId: string;
  /** Existing offline output evidence; this suite adds no runtime generator. */
  readonly accepted: TrackCQualityReplyInput;
  readonly candidate: TrackCQualityReplyInput;
}

export interface TrackCQualitySuiteGateInput {
  readonly mustPassReplay: TrackBLivePathReplayResult;
  readonly judge: TrackCQualityJudgePort;
  readonly cases: readonly TrackCQualitySuiteCaseInput[];
  readonly onCaseComplete?: (
    checkpoint: TrackCQualitySuiteHistoryCase,
  ) => void | Promise<void>;
}

type QualitySuiteDisposition = "BETTER" | "SAME" | "WORSE";

export interface TrackCQualitySuiteHistoryCase {
  readonly caseId: string;
  readonly fixture: TrackCQualityFixtureV1;
  readonly accepted: Readonly<{
    readonly reply: string;
    readonly replyHash: string;
    readonly assessment: Pick<
      SalesRubricAssessmentV2,
      "scores" | "recommendationAction"
    >;
  }>;
  readonly candidate: Readonly<{
    readonly reply: string;
    readonly replyHash: string;
    readonly assessment: Pick<
      SalesRubricAssessmentV2,
      "scores" | "recommendationAction"
    >;
  }>;
  readonly quality: Readonly<{
    readonly disposition: QualitySuiteDisposition;
    readonly overallScoreDelta: number;
    readonly requiresHumanReview: boolean;
    readonly reviewReasonCodes: readonly string[];
  }>;
  /** Non-identity observation only: tokens/latency cannot influence the gate. */
  readonly judgeMetrics: TrackCQualityComparisonResult["metrics"];
  readonly identity: TrackCQualityComparisonResult["identity"];
}

export interface TrackCQualitySuiteGateResult {
  readonly contractVersion: "TRACK_C_QUALITY_SUITE_GATE_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly mandatory: true;
  readonly fixtureSetHash: string;
  readonly aggregate: Readonly<{
    readonly caseCount: number;
    readonly better: number;
    readonly same: number;
    readonly worse: number;
  }>;
  /** This evaluation never selects or promotes a candidate. */
  readonly gate: Readonly<{
    readonly status:
      | "AWAITING_OWNER_APPROVAL"
      | "NO_CLEAR_IMPROVEMENT"
      | "REGRESSION_DETECTED";
    readonly selectionAuthorized: false;
  }>;
  /** PII-safe fixture and both replies/scores for every required quality case. */
  readonly history: Readonly<{
    readonly contractVersion: "TRACK_C_QUALITY_SUITE_HISTORY_V1";
    readonly cases: readonly TrackCQualitySuiteHistoryCase[];
  }>;
}

function assertExactCaseSet(cases: readonly TrackCQualitySuiteCaseInput[]): void {
  const expected = TRACK_C_QUALITY_SUITE_V1.map(({ id }) => id);
  const actual = cases.map(({ caseId }) => caseId);
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    !expected.every((caseId) => actual.includes(caseId))
  ) {
    throw new Error("TRACK_C_QUALITY_SUITE_CASE_SET_MISMATCH");
  }
}

function assertReply(
  caseId: string,
  side: "ACCEPTED" | "CANDIDATE",
  reply: TrackCQualityReplyInput,
): void {
  if (typeof reply.reply !== "string" || !reply.reply.trim()) {
    throw new Error(`TRACK_C_QUALITY_SUITE_${side}_REPLY_INVALID:${caseId}`);
  }
  assertHistoryTextSafe(reply.reply, `${caseId}:${side.toLowerCase()}`);
}

function assertHistoryTextSafe(value: string, label: string): string {
  const redacted = redactAnalyticsMessage(value);
  if (
    redacted.dlpStatus !== "PASSED" ||
    redactCustomerUrlsForModel(redacted.text) !== value
  ) {
    throw new Error(`TRACK_C_QUALITY_SUITE_HISTORY_TEXT_NOT_PII_SAFE:${label}`);
  }
  return value;
}

function fixtureContext(
  fixture: TrackCQualityFixtureV1,
): readonly ShadowContextMessage[] {
  const occurredAt = "2026-09-06T00:00:00.000Z";
  return Object.freeze([
    ...fixture.context.priorCustomerMessages.map((text) => Object.freeze({
      direction: "INBOUND" as const,
      senderType: "CUSTOMER" as const,
      messageType: "TEXT" as const,
      text,
      attachmentCount: 0,
      occurredAt,
    })),
    Object.freeze({
      direction: "INBOUND" as const,
      senderType: "CUSTOMER" as const,
      messageType: "TEXT" as const,
      text: fixture.customerMessage,
      attachmentCount: 0,
      occurredAt,
    }),
  ]);
}

function historyCase(
  fixture: TrackCQualityFixtureV1,
  replies: Readonly<{
    readonly accepted: TrackCQualityReplyInput;
    readonly candidate: TrackCQualityReplyInput;
  }>,
  judged: TrackCQualityComparisonResult,
): TrackCQualitySuiteHistoryCase {
  return Object.freeze({
    caseId: fixture.id,
    fixture,
    accepted: Object.freeze({
      reply: replies.accepted.reply,
      replyHash: judged.identity.accepted.replyHash,
      assessment: Object.freeze({
        scores: judged.accepted.scores,
        recommendationAction: judged.accepted.recommendationAction,
      }),
    }),
    candidate: Object.freeze({
      reply: replies.candidate.reply,
      replyHash: judged.identity.candidate.replyHash,
      assessment: Object.freeze({
        scores: judged.candidate.scores,
        recommendationAction: judged.candidate.recommendationAction,
      }),
    }),
    quality: Object.freeze({
      disposition: judged.comparison.disposition,
      overallScoreDelta: judged.comparison.overallScoreDelta,
      requiresHumanReview: judged.comparison.requiresHumanReview,
      reviewReasonCodes: Object.freeze([...judged.comparison.reviewReasonCodes]),
    }),
    judgeMetrics: judged.metrics,
    identity: judged.identity,
  });
}

/**
 * The mandatory C2 sales-quality gate. C1's frozen B3 safety contract runs
 * first; this then scores the exact PII-safe 50-case suite using Judge V2.
 * It only returns review evidence and never authorizes selection or promotion.
 */
export async function runTrackCQualitySuiteGate(
  input: TrackCQualitySuiteGateInput,
): Promise<TrackCQualitySuiteGateResult> {
  assertTrackCC1MustPass(input.mustPassReplay);
  assertExactCaseSet(input.cases);
  const supplied = new Map(input.cases.map((item) => [item.caseId, item]));
  const history: TrackCQualitySuiteHistoryCase[] = [];

  for (const fixture of TRACK_C_QUALITY_SUITE_V1) {
    const current = supplied.get(fixture.id);
    if (current === undefined) {
      throw new Error(`TRACK_C_QUALITY_SUITE_CASE_MISSING:${fixture.id}`);
    }
    assertReply(fixture.id, "ACCEPTED", current.accepted);
    assertReply(fixture.id, "CANDIDATE", current.candidate);
    const judged = await runTrackCQualityComparison({
      mustPassReplay: input.mustPassReplay,
      judge: input.judge,
      context: fixtureContext(fixture),
      verifiedFacts: qualitySuiteFactsForJudge(fixture),
      factFixtureHash: QUALITY_SUITE_FIXTURE_SET_HASH,
      factSource: "TRACK_C_QUALITY_SUITE_V1",
      qualitySuiteFixtureId: fixture.id,
      accepted: current.accepted,
      candidate: current.candidate,
    });
    const completed = historyCase(fixture, current, judged);
    history.push(completed);
    await input.onCaseComplete?.(completed);
  }

  const aggregate = Object.freeze({
    caseCount: history.length,
    better: history.filter(({ quality }) => quality.disposition === "BETTER").length,
    same: history.filter(({ quality }) => quality.disposition === "SAME").length,
    worse: history.filter(({ quality }) => quality.disposition === "WORSE").length,
  });
  const status = aggregate.worse > 0
    ? "REGRESSION_DETECTED" as const
    : aggregate.better === 0
      ? "NO_CLEAR_IMPROVEMENT" as const
      : "AWAITING_OWNER_APPROVAL" as const;
  return Object.freeze({
    contractVersion: "TRACK_C_QUALITY_SUITE_GATE_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    mandatory: true,
    fixtureSetHash: QUALITY_SUITE_FIXTURE_SET_HASH,
    aggregate,
    gate: Object.freeze({ status, selectionAuthorized: false as const }),
    history: Object.freeze({
      contractVersion: "TRACK_C_QUALITY_SUITE_HISTORY_V1",
      cases: Object.freeze(history),
    }),
  });
}
