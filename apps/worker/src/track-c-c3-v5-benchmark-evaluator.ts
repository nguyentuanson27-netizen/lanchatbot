import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  redactAnalyticsMessage,
  type ShadowContextMessage,
} from "@lana/database";
import {
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
} from "./context-v2-candidate.js";
import { redactCustomerUrlsForModel } from "./customer-url-policy.js";
import type { TrackCConversationPlanV1 } from "./track-c-c3-two-pass-candidate.js";
import type { TrackCV5TwoPassBenchmarkResult } from "./track-c-c3-v5-benchmark-runner.js";
import {
  scoreTrackCV5BenchmarkCase,
  type TrackCV5CaseScoreResult,
  type TrackCV5RubricConfig,
  type TrackCV5Stage,
  type TrackCV5StageAssessmentInput,
} from "./track-c-c3-v5-benchmark-scoring.js";

export interface TrackCV5JudgeDescriptor {
  readonly provider: string;
  readonly model: string;
  readonly location: string;
  readonly rubricHash: string;
  readonly generationConfigHash: string;
}

export interface TrackCV5StageJudgeInput {
  readonly contractVersion: "TRACK_C_V5_STAGE_JUDGE_INPUT_V1";
  readonly executionLane: TrackCV5TwoPassBenchmarkResult["executionLane"];
  readonly domain: string;
  readonly stage: TrackCV5Stage;
  readonly dialogue: readonly ShadowContextMessage[];
  readonly expected: Readonly<{
    readonly requiredBehaviors: readonly string[];
    readonly forbiddenBehaviors: readonly string[];
  }>;
  readonly authoritativeEvidence: unknown;
  readonly artifact: Readonly<{
    readonly conversationPlan: TrackCConversationPlanV1;
    readonly responderReply?: string;
    readonly responderOutput?: TrackCV5TwoPassBenchmarkResult["output"];
  }>;
}

export interface TrackCV5StageJudgePort {
  descriptor(): TrackCV5JudgeDescriptor;
  assess(input: TrackCV5StageJudgeInput): Promise<TrackCV5StageAssessmentInput>;
}

export interface TrackCV5BenchmarkEvaluationInput {
  readonly rubric: TrackCV5RubricConfig;
  readonly domain: string;
  readonly dialogue: readonly ShadowContextMessage[];
  readonly expected: Readonly<{
    readonly required_behaviors: readonly string[];
    readonly forbidden_behaviors: readonly string[];
  }>;
  /** Exact lane-authoritative evidence only. Never include split labels or case IDs. */
  readonly authoritativeEvidence: unknown;
  readonly candidate: TrackCV5TwoPassBenchmarkResult;
  readonly judge: TrackCV5StageJudgePort;
  /** Frozen manifest core-bundle fingerprint used for this run. */
  readonly bundleFingerprint: string;
  /** Exact repository source revision used to execute candidate + harness. */
  readonly candidateSourceRevision: string;
}

export interface TrackCV5BenchmarkEvaluationResult {
  readonly contractVersion: "TRACK_C_V5_BENCHMARK_EVALUATION_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly judge: TrackCV5JudgeDescriptor;
  readonly score: TrackCV5CaseScoreResult;
  readonly runIdentity: Readonly<{
    readonly bundleFingerprint: string;
    readonly candidateSourceRevision: string;
    readonly candidateProviderModelVersion: string;
    readonly candidateCompositionHash: string;
    readonly strategistRequestEnvelopeHash: string;
    readonly responderRequestEnvelopeHash: string;
    readonly judgeProvider: string;
    readonly judgeModel: string;
    readonly judgeLocation: string;
    readonly rubricHash: string;
    readonly judgeGenerationConfigHash: string;
    readonly runFingerprint: string;
  }>;
}

function canonicalSha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function assertModelSafeText(value: string, errorCode: string): string {
  const redacted = redactAnalyticsMessage(value);
  const withoutCustomerUrls = redactCustomerUrlsForModel(redacted.text);
  if (
    redacted.dlpStatus !== "PASSED" ||
    redacted.text !== value ||
    withoutCustomerUrls !== value
  ) {
    throw new Error(errorCode);
  }
  return value;
}

function safeDialogue(
  value: readonly ShadowContextMessage[],
): readonly ShadowContextMessage[] {
  return Object.freeze(value.map((message) => Object.freeze({
    direction: message.direction,
    senderType: message.senderType,
    messageType: message.messageType,
    text: assertModelSafeText(
      message.text,
      "TRACK_C_V5_JUDGE_DIALOGUE_NOT_PII_SAFE",
    ),
    attachmentCount: message.attachmentCount,
    occurredAt: message.occurredAt,
  })));
}

function assertModelSafeValue(value: unknown, errorCode: string): void {
  if (typeof value === "string") {
    assertModelSafeText(value, errorCode);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertModelSafeValue(item, errorCode);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      assertModelSafeText(key, errorCode);
      assertModelSafeValue(nested, errorCode);
    }
  }
}

function safeEvidence(value: unknown): unknown {
  const serialized = canonicalJsonV1(value);
  const parsed = JSON.parse(serialized) as unknown;
  assertModelSafeValue(parsed, "TRACK_C_V5_JUDGE_EVIDENCE_NOT_PII_SAFE");
  return parsed;
}

function safeExpected(input: TrackCV5BenchmarkEvaluationInput["expected"]) {
  const requiredBehaviors = input.required_behaviors.map((text) =>
    assertModelSafeText(text, "TRACK_C_V5_JUDGE_EXPECTED_NOT_PII_SAFE")
  );
  const forbiddenBehaviors = input.forbidden_behaviors.map((text) =>
    assertModelSafeText(text, "TRACK_C_V5_JUDGE_EXPECTED_NOT_PII_SAFE")
  );
  return Object.freeze({
    requiredBehaviors: Object.freeze(requiredBehaviors),
    forbiddenBehaviors: Object.freeze(forbiddenBehaviors),
  });
}

function judgeInput(
  input: TrackCV5BenchmarkEvaluationInput,
  stage: TrackCV5Stage,
  dialogue: readonly ShadowContextMessage[],
  expected: ReturnType<typeof safeExpected>,
  authoritativeEvidence: unknown,
  conversationPlan: TrackCConversationPlanV1,
): TrackCV5StageJudgeInput {
  const artifact = stage === "STRATEGIST"
    ? Object.freeze({ conversationPlan })
    : Object.freeze({
        conversationPlan,
        responderReply: assertModelSafeText(
          input.candidate.reply,
          "TRACK_C_V5_JUDGE_CANDIDATE_NOT_PII_SAFE",
        ),
        responderOutput: input.candidate.output,
      });
  return Object.freeze({
    contractVersion: "TRACK_C_V5_STAGE_JUDGE_INPUT_V1" as const,
    executionLane: input.candidate.executionLane,
    domain: input.domain,
    stage,
    dialogue,
    expected,
    authoritativeEvidence,
    artifact,
  });
}

function assertRunIdentityInput(input: TrackCV5BenchmarkEvaluationInput): void {
  if (!/^[a-f0-9]{64}$/u.test(input.bundleFingerprint)) {
    throw new Error("TRACK_C_V5_BUNDLE_IDENTITY_INVALID");
  }
  if (!/^[a-f0-9]{40}$/u.test(input.candidateSourceRevision)) {
    throw new Error("TRACK_C_V5_CANDIDATE_SOURCE_REVISION_INVALID");
  }
}

/**
 * Composes the two required V5 stage assessments and the deterministic rubric
 * scorer. The public input deliberately has no caseId or split field, matching
 * the registered judge visibility policy. Every text/evidence field is proven
 * model-safe before the first judge call. The judge-declared rubric hash is
 * bound to the exact rubric object used for scoring, and the result records the
 * frozen bundle/source/candidate/judge identities. This adapter remains
 * evaluation-only and cannot select, promote, persist, send, or execute effects.
 */
export async function evaluateTrackCV5BenchmarkCase(
  input: TrackCV5BenchmarkEvaluationInput,
): Promise<TrackCV5BenchmarkEvaluationResult> {
  assertRunIdentityInput(input);
  const descriptor = Object.freeze({ ...input.judge.descriptor() });
  const actualRubricHash = canonicalSha256(input.rubric);
  if (
    !descriptor.provider.trim() || !descriptor.model.trim() ||
    !descriptor.location.trim() ||
    descriptor.rubricHash !== actualRubricHash ||
    !/^[a-f0-9]{64}$/u.test(descriptor.generationConfigHash)
  ) {
    throw new Error("TRACK_C_V5_JUDGE_IDENTITY_INVALID");
  }
  const dialogue = safeDialogue(input.dialogue);
  const expected = safeExpected(input.expected);
  const authoritativeEvidence = safeEvidence(input.authoritativeEvidence);
  const conversationPlan = safeEvidence(
    input.candidate.conversationPlan,
  ) as TrackCConversationPlanV1;
  const [strategist, responder] = await Promise.all([
    input.judge.assess(judgeInput(
      input,
      "STRATEGIST",
      dialogue,
      expected,
      authoritativeEvidence,
      conversationPlan,
    )),
    input.judge.assess(judgeInput(
      input,
      "RESPONDER",
      dialogue,
      expected,
      authoritativeEvidence,
      conversationPlan,
    )),
  ]);
  const score = scoreTrackCV5BenchmarkCase({
    rubric: input.rubric,
    lane: input.candidate.executionLane,
    domain: input.domain,
    strategist,
    responder,
  });
  const runIdentityBase = Object.freeze({
    bundleFingerprint: input.bundleFingerprint,
    candidateSourceRevision: input.candidateSourceRevision,
    candidateProviderModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
    candidateCompositionHash: input.candidate.identity.compositionHash,
    strategistRequestEnvelopeHash:
      input.candidate.identity.strategistRequestEnvelopeHash,
    responderRequestEnvelopeHash:
      input.candidate.identity.responderRequestEnvelopeHash,
    judgeProvider: descriptor.provider,
    judgeModel: descriptor.model,
    judgeLocation: descriptor.location,
    rubricHash: descriptor.rubricHash,
    judgeGenerationConfigHash: descriptor.generationConfigHash,
  });
  const runIdentity = Object.freeze({
    ...runIdentityBase,
    runFingerprint: canonicalSha256(runIdentityBase),
  });
  canonicalJsonV1({ descriptor, score, runIdentity });
  return Object.freeze({
    contractVersion: "TRACK_C_V5_BENCHMARK_EVALUATION_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    judge: descriptor,
    score,
    runIdentity,
  });
}
