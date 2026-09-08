import { createHash } from "node:crypto";
import { canonicalJsonV1, type SalesRubricAssessmentV2 } from "@lana/contracts";
import type { ShadowContextMessage } from "@lana/database";
import type { TrackBLivePathReplayResult } from "./track-b-live-path-replay.js";
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

interface TrackCQualitySuiteHistoryReply {
  /** Exact frozen-fixture text supplied to Judge V2 and kept owner-local. */
  readonly reply: string;
  /** Hash of the exact text actually supplied to Judge V2. */
  readonly replyHash: string;
  /** Hash-only binding to the source output; equal to replyHash for this fixture suite. */
  readonly sourceReplyHash: string;
  /** Frozen fixture replies are never rewritten, so this is always false. */
  readonly redacted: boolean;
}

interface TrackCQualitySuiteScoredHistoryCase {
  readonly caseId: string;
  readonly status: "SCORED";
  readonly fixture: TrackCQualityFixtureV1;
  readonly accepted: Readonly<TrackCQualitySuiteHistoryReply & {
    readonly assessment: Pick<
      SalesRubricAssessmentV2,
      "scores" | "recommendationAction"
    >;
  }>;
  readonly candidate: Readonly<TrackCQualitySuiteHistoryReply & {
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

interface TrackCQualitySuiteFailedHistoryCase {
  readonly caseId: string;
  readonly status: "FAILED";
  readonly fixture: TrackCQualityFixtureV1;
  /** Retain owner-local frozen-fixture history even when the Judge/provider case did not score. */
  readonly replies: Readonly<{
    readonly accepted: TrackCQualitySuiteHistoryReply;
    readonly candidate: TrackCQualitySuiteHistoryReply;
  }> | null;
  /** Redacted code only; never retain an unsafe reply or provider message. */
  readonly failure: Readonly<{
    readonly code: string;
  }>;
}

export type TrackCQualitySuiteHistoryCase =
  | TrackCQualitySuiteScoredHistoryCase
  | TrackCQualitySuiteFailedHistoryCase;

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
    readonly failed: number;
    /** A redacted model output remains reviewable but cannot satisfy the gate. */
    readonly redactedCaseCount: number;
  }>;
  /** This evaluation never selects or promotes a candidate. */
  readonly gate: Readonly<{
    readonly status:
      | "AWAITING_OWNER_APPROVAL"
      | "NO_CLEAR_IMPROVEMENT"
      | "REGRESSION_DETECTED"
      | "INCOMPLETE";
    readonly selectionAuthorized: false;
  }>;
  /** Exact frozen-fixture replies/scores for owner-local review of every required case. */
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

function replyHash(value: string): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

interface PreparedQualitySuiteReply {
  readonly judge: TrackCQualityReplyInput;
  readonly history: TrackCQualitySuiteHistoryReply;
}

function prepareReply(
  caseId: string,
  side: "ACCEPTED" | "CANDIDATE",
  reply: TrackCQualityReplyInput,
): PreparedQualitySuiteReply {
  if (typeof reply.reply !== "string" || !reply.reply.trim()) {
    throw new Error(`TRACK_C_QUALITY_SUITE_${side}_REPLY_INVALID:${caseId}`);
  }
  return Object.freeze({
    judge: Object.freeze({ ...reply }),
    history: Object.freeze({
      reply: reply.reply,
      replyHash: replyHash(reply.reply),
      sourceReplyHash: replyHash(reply.reply),
      redacted: false,
    }),
  });
}

interface PreparedQualitySuiteCase {
  readonly accepted: PreparedQualitySuiteReply;
  readonly candidate: PreparedQualitySuiteReply;
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
  replies: PreparedQualitySuiteCase,
  judged: TrackCQualityComparisonResult,
): TrackCQualitySuiteScoredHistoryCase {
  if (
    judged.identity.accepted.replyHash !== replies.accepted.history.replyHash ||
    judged.identity.candidate.replyHash !== replies.candidate.history.replyHash
  ) {
    throw new Error("TRACK_C_QUALITY_SUITE_JUDGE_INPUT_HASH_MISMATCH");
  }
  return Object.freeze({
    caseId: fixture.id,
    status: "SCORED" as const,
    fixture,
    accepted: Object.freeze({
      ...replies.accepted.history,
      assessment: Object.freeze({
        scores: judged.accepted.scores,
        recommendationAction: judged.accepted.recommendationAction,
      }),
    }),
    candidate: Object.freeze({
      ...replies.candidate.history,
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

function redactedFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const code = /^([A-Z0-9_]+)(?::|$)/u.exec(message)?.[1];
  return code ?? "TRACK_C_QUALITY_SUITE_CASE_FAILED";
}

function failedHistoryCase(
  fixture: TrackCQualityFixtureV1,
  error: unknown,
  replies: PreparedQualitySuiteCase | null,
): TrackCQualitySuiteFailedHistoryCase {
  return Object.freeze({
    caseId: fixture.id,
    status: "FAILED" as const,
    fixture,
    replies: replies === null ? null : Object.freeze({
      accepted: replies.accepted.history,
      candidate: replies.candidate.history,
    }),
    failure: Object.freeze({ code: redactedFailureCode(error) }),
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
    let prepared: PreparedQualitySuiteCase | null = null;
    let completed: TrackCQualitySuiteHistoryCase;
    try {
      prepared = Object.freeze({
        accepted: prepareReply(fixture.id, "ACCEPTED", current.accepted),
        candidate: prepareReply(fixture.id, "CANDIDATE", current.candidate),
      });
      const judged = await runTrackCQualityComparison({
        mustPassReplay: input.mustPassReplay,
        judge: input.judge,
        context: fixtureContext(fixture),
        verifiedFacts: qualitySuiteFactsForJudge(fixture),
        factFixtureHash: QUALITY_SUITE_FIXTURE_SET_HASH,
        factSource: "TRACK_C_QUALITY_SUITE_V1",
        qualitySuiteFixtureId: fixture.id,
        accepted: prepared.accepted.judge,
        candidate: prepared.candidate.judge,
      });
      completed = historyCase(fixture, prepared, judged);
    } catch (error) {
      completed = failedHistoryCase(fixture, error, prepared);
    }
    history.push(completed);
    await input.onCaseComplete?.(completed);
  }

  const scored = history.filter(
    (item): item is TrackCQualitySuiteScoredHistoryCase => item.status === "SCORED",
  );
  const aggregate = Object.freeze({
    caseCount: history.length,
    better: scored.filter(({ quality }) => quality.disposition === "BETTER").length,
    same: scored.filter(({ quality }) => quality.disposition === "SAME").length,
    worse: scored.filter(({ quality }) => quality.disposition === "WORSE").length,
    failed: history.length - scored.length,
    redactedCaseCount: history.filter((item) => item.status === "SCORED"
      ? item.accepted.redacted || item.candidate.redacted
      : item.replies?.accepted.redacted === true || item.replies?.candidate.redacted === true).length,
  });
  const status = aggregate.failed > 0 || aggregate.redactedCaseCount > 0
    ? "INCOMPLETE" as const
    : aggregate.worse > 0
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
