import {
  ContextV2CaptureV1Schema,
  type ContextV2,
} from "@lana/contracts";
import {
  buildCandidateRequest,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
} from "./context-v2-candidate.js";
import { parseContextV2WithIntegrity } from "./context-v2.js";

function validEvaluationTime(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

/**
 * Makes a Context V2 capture admissible for the Track C offline capability.
 * This is evaluation-only: it neither reads a store nor exposes a runtime port.
 */
function contextFromFrozenCapture(input: Readonly<{
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
 * capture. The request identity pins the candidate prompt independently from
 * the byte-frozen baseline capability.
 */
export function buildTrackCOfflineCandidateRequest(input: Readonly<{
  modelResource: string;
  capture: unknown;
  evaluationAt: Date;
  systemInstruction: string;
}>): BuiltCandidateRequest {
  if (!input.systemInstruction.trim()) {
    throw new Error("TRACK_C_OFFLINE_CANDIDATE_SYSTEM_INSTRUCTION_INVALID");
  }
  const request = buildCandidateRequest({
    modelResource: input.modelResource,
    context: contextFromFrozenCapture({
      capture: input.capture,
      evaluationAt: input.evaluationAt,
    }),
  });
  const body = JSON.parse(request.body) as Record<string, unknown>;
  const candidateBody = JSON.stringify({
    ...body,
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
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
