import {
  ContextV2CaptureV1Schema,
  canonicalJsonV1,
  type ContextV2,
} from "@lana/contracts";
import {
  redactAnalyticsMessage,
  type ShadowContextMessage,
} from "@lana/database";
import {
  buildCandidateRequest,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
} from "./context-v2-candidate.js";
import { parseContextV2WithIntegrity } from "./context-v2.js";

function validEvaluationTime(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function frozenEvaluationContext(
  value: readonly ShadowContextMessage[],
): readonly ShadowContextMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 15) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_DIALOGUE_INVALID");
  }
  return Object.freeze(value.map((message) => {
    if (
      typeof message !== "object" || message === null ||
      !["INBOUND", "OUTBOUND"].includes(message.direction) ||
      !["CUSTOMER", "BOT", "HUMAN", "SYSTEM"].includes(message.senderType) ||
      !["TEXT", "IMAGE", "MIXED", "EVENT", "POSTBACK"].includes(
        message.messageType,
      ) ||
      typeof message.text !== "string" ||
      !Number.isInteger(message.attachmentCount) ||
      message.attachmentCount < 0 ||
      !Number.isFinite(Date.parse(message.occurredAt))
    ) {
      throw new Error("TRACK_C_OFFLINE_CANDIDATE_DIALOGUE_INVALID");
    }
    const redacted = redactAnalyticsMessage(message.text);
    if (redacted.dlpStatus !== "PASSED" || redacted.text !== message.text) {
      throw new Error("TRACK_C_OFFLINE_CANDIDATE_DIALOGUE_NOT_PII_SAFE");
    }
    return Object.freeze({
      direction: message.direction,
      senderType: message.senderType,
      messageType: message.messageType,
      text: message.text,
      attachmentCount: message.attachmentCount,
      occurredAt: message.occurredAt,
    });
  }));
}

export function assertTrackCOfflineCandidateEvaluationContext(input: Readonly<{
  request: Readonly<{ body: string }>;
  expected: readonly ShadowContextMessage[];
}>): void {
  let observed: unknown;
  try {
    const body = JSON.parse(input.request.body) as {
      contents?: Array<{ parts?: Array<{ text?: unknown }> }>;
    };
    const prompt = body.contents?.[0]?.parts?.[0]?.text;
    observed = typeof prompt === "string"
      ? (JSON.parse(prompt) as { evaluationContext?: unknown }).evaluationContext
      : undefined;
  } catch {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_DIALOGUE_MISMATCH");
  }
  const expected = frozenEvaluationContext(input.expected);
  if (!Array.isArray(observed) ||
      canonicalJsonV1(observed) !== canonicalJsonV1(expected)) {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_DIALOGUE_MISMATCH");
  }
}

/**
 * Makes a Context V2 capture admissible for the Track C offline capability.
 * This is evaluation-only: it neither reads a store nor exposes a runtime port.
 */
export function contextFromFrozenTrackCCapture(input: Readonly<{
  capture: unknown;
  evaluationAt: Date;
}>): ContextV2 {
  const parsedCapture = ContextV2CaptureV1Schema.safeParse(input.capture);
  if (!parsedCapture.success) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_INVALID");
  }
  const capture = parsedCapture.data;
  if (capture.status !== "BUILT" || capture.context === null ||
      capture.contextHash === null) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_UNAVAILABLE");
  }
  if (!validEvaluationTime(input.evaluationAt)) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_EVALUATION_TIME_INVALID");
  }
  let context: ContextV2;
  try {
    context = parseContextV2WithIntegrity(capture.context);
  } catch {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_INTEGRITY_INVALID");
  }
  if (
    context.verifiedClaims.some(({ provenance }) =>
      Date.parse(provenance.observedAt) > input.evaluationAt.getTime() + 5 * 60_000 ||
      Date.parse(provenance.expiresAt) <= input.evaluationAt.getTime()
    ) ||
    (context.cartReadiness !== null &&
      Date.parse(context.cartReadiness.expiresAt) <= input.evaluationAt.getTime())
  ) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE");
  }
  if (
    context.productBinding.status === "RESOLVED" &&
    context.verifiedClaims.some((claim) =>
      claim.scope.kind === "PRODUCT" &&
      !context.productBinding.productIds.includes(claim.scope.productId)
    )
  ) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_PRODUCT_BINDING_MISMATCH");
  }
  return context;
}

/**
 * Builds a distinct, side-effect-free candidate request from one frozen B3
 * capture and its PII-safe dialogue. The request identity pins every provider
 * input independently from the byte-frozen baseline capability.
 */
export function buildTrackCOfflineCandidateRequest(input: Readonly<{
  modelResource: string;
  capture: unknown;
  evaluationAt: Date;
  evaluationContext: readonly ShadowContextMessage[];
  systemInstruction: string;
}>): BuiltCandidateRequest {
  if (!input.systemInstruction.trim()) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_SYSTEM_INSTRUCTION_INVALID");
  }
  const request = buildCandidateRequest({
    modelResource: input.modelResource,
    context: contextFromFrozenTrackCCapture({
      capture: input.capture,
      evaluationAt: input.evaluationAt,
    }),
  });
  const body = JSON.parse(request.body) as {
    readonly contents: readonly [{
      readonly role: string;
      readonly parts: readonly [{ readonly text: string }];
    }];
    readonly generationConfig: Readonly<{
      readonly responseSchema: Readonly<{
        readonly properties: Readonly<Record<string, unknown>>;
      }>;
      readonly [key: string]: unknown;
    }>;
    readonly [key: string]: unknown;
  };
  const contextInput = JSON.parse(body.contents[0].parts[0].text) as
    Readonly<Record<string, unknown>>;
  const evaluationContext = frozenEvaluationContext(input.evaluationContext);
  const responseProperties = body.generationConfig.responseSchema.properties;
  const responseSchema = Object.freeze({
    type: "OBJECT",
    required: Object.freeze(["segments", "strategy", "cta"]),
    properties: Object.freeze({
      segments: responseProperties.segments,
      strategy: responseProperties.strategy,
      cta: responseProperties.cta,
    }),
  });
  const candidateBody = JSON.stringify({
    ...body,
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
    contents: [{
      ...body.contents[0],
      parts: [{
        text: canonicalJsonV1({ ...contextInput, evaluationContext }),
      }],
    }],
    generationConfig: {
      ...body.generationConfig,
      responseSchema,
    },
  });
  return Object.freeze({
    url: request.url,
    body: candidateBody,
    identity: deriveCandidateRequestIdentity({
      url: request.url,
      body: candidateBody,
    }),
  });
}
