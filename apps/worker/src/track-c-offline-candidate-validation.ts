import { createHash } from "node:crypto";
import {
  BusinessFactEnvelopeV1Schema,
  ContextV2CandidateOutputV2Schema,
  SizeRecommendationProtectedClaimV1Schema,
  canonicalJsonV1,
  type BusinessFactEnvelopeV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
import { guardAgentProposal } from "@lana/business-tools";
import {
  deriveCandidateRequestContextHash,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
} from "./context-v2-candidate.js";
import {
  assertTrackCOfflineCandidateEvaluationContext,
  contextFromFrozenTrackCCapture,
} from "./track-c-offline-candidate.js";
import { expectedOwnerForTrackCC1Fixture } from "./track-c-must-pass.js";
import type {
  TrackCOfflineCandidateValidatedEnvelope,
  TrackCReplayJudgeEnvelope,
} from "./track-c-replay.js";

const validated = new WeakSet<object>();
const TrackCOfflineCandidateSemanticOutputSchema =
  ContextV2CandidateOutputV2Schema.pick({
    segments: true,
    strategy: true,
    cta: true,
  });

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

function sizeGuardInput(context: ContextV2, claimHashes: ReadonlySet<string>) {
  type SizeClaim = Extract<ContextV2["verifiedClaims"][number], { type: "SIZE_FIT" }>;
  const claims = context.verifiedClaims
    .filter((claim): claim is SizeClaim => claim.type === "SIZE_FIT")
    .filter((claim) => claimHashes.has(claim.provenance.contentHash))
    .map((claim) => {
      if (claim.scope.kind !== "PRODUCT" ||
          claim.provenance.authority !== "VERIFIED_SIZE_ENGINE_V1" ||
          claim.value.evidenceBasis !== "MEASUREMENTS" ||
          !claim.provenance.evidenceRef.includes(
            `measurements:${claim.value.measurementFingerprint}`,
          )) return null;
      return SizeRecommendationProtectedClaimV1Schema.parse({
        id: claim.claimId, type: "SIZE_RECOMMENDATION",
        value: {
          recommendedSizes: claim.value.recommendedSizes,
          alternativeSizes: claim.value.alternativeSizes,
        },
        productId: claim.scope.productId, variantId: claim.scope.variantId,
        evidenceRef: claim.provenance.evidenceRef, source: "VERIFIED_SIZE_ENGINE_V1",
        observedAt: claim.provenance.observedAt, expiresAt: claim.provenance.expiresAt,
        customerProfileId: claim.value.customerProfileId,
        customerProfileRevision: claim.value.customerProfileRevision,
        measurementFingerprint: claim.value.measurementFingerprint,
        evidenceBasis: {
          kind: "CURRENT_MEASUREMENTS",
          measurementFingerprint: claim.value.measurementFingerprint,
          sourceEventHashes: [claim.provenance.contentHash],
        },
      });
    })
    .filter((claim): claim is NonNullable<typeof claim> => claim !== null);
  const first = claims[0] ?? null;
  return {
    activeProductId: context.productBinding.status === "RESOLVED"
      ? context.productBinding.productIds[0] ?? null : null,
    activeVariantId: first?.variantId ?? null,
    customerProfileId: first?.customerProfileId ?? null,
    customerProfileRevision: first?.customerProfileRevision ?? null,
    claims,
  };
}

function replyFromOutput(output: ContextV2CandidateOutputV2): string {
  return output.segments.map(({ text }) => text).join("\n");
}

export interface TrackCOfflineCandidateValidationInput {
  readonly caseId: string;
  readonly capture: unknown;
  readonly evaluationAt: Date;
  readonly request: BuiltCandidateRequest;
  readonly providerModelVersion: string;
  readonly output: unknown;
  readonly accepted: TrackCReplayJudgeEnvelope;
}

function expectedOwnerFromGuardOutcome(value: unknown): "BOT" | "HUMAN" | null {
  if (typeof value !== "object" || value === null) return null;
  const expectedOwner = (value as { readonly expectedOwner?: unknown }).expectedOwner;
  return expectedOwner === "BOT" || expectedOwner === "HUMAN"
    ? expectedOwner
    : null;
}

/**
 * The C3 composition seam. It executes the existing deterministic claim guard
 * over a side-effect-free candidate reply, then keeps its result in memory for
 * the immediately following C1.1/C2 replay. It has no Gate E interpreter,
 * persistence, runtime port, or effect authority.
 */
export function validateTrackCOfflineCandidate(
  input: TrackCOfflineCandidateValidationInput,
): TrackCOfflineCandidateValidatedEnvelope {
  const context = contextFromFrozenTrackCCapture({
    capture: input.capture, evaluationAt: input.evaluationAt,
  });
  const recomputedIdentity = deriveCandidateRequestIdentity(input.request);
  if (canonicalJsonV1(recomputedIdentity) !== canonicalJsonV1(input.request.identity) ||
      deriveCandidateRequestContextHash(input.request) !== context.contextHash) {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_REQUEST_MISMATCH");
  }
  assertTrackCOfflineCandidateEvaluationContext({
    request: input.request,
    expected: input.accepted.context,
  });
  if (input.providerModelVersion !== "gemini-3.5-flash-lite") {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_PROVIDER_MISMATCH");
  }
  const expectedOwner = expectedOwnerForTrackCC1Fixture(input.caseId);
  if (expectedOwnerFromGuardOutcome(input.accepted.guardOutcome) !== expectedOwner) {
    throw new Error(`TRACK_C_C1_ACCEPTED_OWNER_MISMATCH:${input.caseId}`);
  }
  if (expectedOwner === "HUMAN") {
    if (input.output !== null) {
      throw new Error(`TRACK_C_C1_HUMAN_REPLY_FORBIDDEN:${input.caseId}`);
    }
    const handoff: TrackCOfflineCandidateValidatedEnvelope = Object.freeze({
      origin: "OFFLINE_CANDIDATE_DETERMINISTICALLY_VALIDATED",
      quality: Object.freeze({
        context: input.accepted.context,
        verifiedFacts: input.accepted.verifiedFacts,
        reply: "",
        proposalSummary: Object.freeze({ strategy: "HOLD_POSITION", cta: "NONE" }),
        guardOutcome: Object.freeze({
          expectedOwner: "HUMAN",
          action: "HANDOFF",
          blockedReasonCodes: [] as const,
        }),
      }),
      identity: Object.freeze({
        captureContextHash: context.contextHash,
        requestEnvelopeHash: input.request.identity.requestEnvelopeHash,
        responseOutputHash: hash(null),
        providerModelVersion: input.providerModelVersion,
      }),
      guard: Object.freeze({ status: "PASS", sideEffects: "DISABLED", blockedReasonCodes: [] as const }),
    });
    validated.add(handoff);
    return handoff;
  }
  const parsed = TrackCOfflineCandidateSemanticOutputSchema.safeParse(input.output);
  if (!parsed.success) throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_OUTPUT_INVALID");
  const semanticOutput = parsed.data;
  const output = ContextV2CandidateOutputV2Schema.parse({
    schemaVersion: 2,
    contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
    contextHash: context.contextHash,
    productBinding: {
      status: context.productBinding.status,
      productIds: context.productBinding.productIds,
    },
    ...semanticOutput,
  });
  const claimHashes = output.segments.flatMap((segment) =>
    segment.kind === "VERIFIED_CLAIM" ? [segment.claimContentHash] : []);
  const knownEvidenceHashes = new Set([
    ...context.verifiedClaims.map(({ provenance }) => provenance.contentHash),
    ...(context.productAttributes === null || context.productAttributes === undefined
      ? []
      : [context.productAttributes.metadata.contentHash]),
    ...(context.productPresentation === null ||
        context.productPresentation === undefined
      ? []
      : [context.productPresentation.provenance.contentHash]),
  ]);
  if (new Set(claimHashes).size !== claimHashes.length || claimHashes.some((claimHash) =>
    !knownEvidenceHashes.has(claimHash)
  ) || output.segments.some((segment) => segment.kind === "EFFECT_CLAIM")) {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_PROVENANCE_INVALID");
  }
  let verifiedFacts: BusinessFactEnvelopeV1 | null;
  try {
    verifiedFacts = input.accepted.verifiedFacts === null
      ? null : BusinessFactEnvelopeV1Schema.parse(input.accepted.verifiedFacts);
  } catch {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_FACTS_MISMATCH");
  }
  if (verifiedFacts?.status === "OK" &&
      (context.productBinding.status !== "RESOLVED" ||
       verifiedFacts.productId !== context.productBinding.productIds[0])) {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_FACTS_MISMATCH");
  }
  const productId = context.productBinding.status === "RESOLVED"
    ? context.productBinding.productIds[0] ?? null : null;
  const sizeClaimContext = sizeGuardInput(context, new Set(claimHashes));
  const guard = guardAgentProposal({
    proposal: {
      schemaVersion: 1, intent: "TRACK_C_OFFLINE_EVALUATION",
      conversationStage: context.phase.phase, productId, action: "REPLY",
      reply: replyFromOutput(output), attachments: [], handoffReason: null,
      protectedClaimIds: sizeClaimContext.claims.map(({ id }) => id),
    },
    facts: verifiedFacts,
    verifiedProductIds: new Set(context.productBinding.productIds),
    buyingSignal: context.buyingIntent.decision === "COMMITTED",
    sizeClaimContext,
    now: input.evaluationAt,
  });
  if (guard.blockedReasonCodes.length > 0) {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_GUARD_FAILED");
  }
  const value: TrackCOfflineCandidateValidatedEnvelope = Object.freeze({
    origin: "OFFLINE_CANDIDATE_DETERMINISTICALLY_VALIDATED",
    quality: Object.freeze({
      context: input.accepted.context,
      verifiedFacts: input.accepted.verifiedFacts,
      reply: replyFromOutput(output),
      proposalSummary: Object.freeze({ strategy: output.strategy, cta: output.cta }),
      guardOutcome: Object.freeze({
        expectedOwner: "BOT",
        action: "REPLY",
        blockedReasonCodes: [] as const,
      }),
    }),
    identity: Object.freeze({
      captureContextHash: context.contextHash,
      requestEnvelopeHash: input.request.identity.requestEnvelopeHash,
      responseOutputHash: hash(semanticOutput),
      providerModelVersion: input.providerModelVersion,
    }),
    guard: Object.freeze({ status: "PASS", sideEffects: "DISABLED", blockedReasonCodes: [] as const }),
  });
  validated.add(value);
  return value;
}

export function assertTrackCOfflineCandidateValidated(
  value: TrackCOfflineCandidateValidatedEnvelope,
): TrackCOfflineCandidateValidatedEnvelope {
  if (!validated.has(value) || value.guard.status !== "PASS" ||
      value.guard.sideEffects !== "DISABLED" || value.guard.blockedReasonCodes.length > 0) {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_GUARD_FAILED");
  }
  const handoff = value.quality.guardOutcome.expectedOwner === "HUMAN";
  if (
    (handoff && (value.quality.reply !== "" || value.quality.guardOutcome.action !== "HANDOFF")) ||
    (!handoff && (value.quality.reply.length === 0 || value.quality.guardOutcome.action !== "REPLY"))
  ) {
    throw new Error("TRACK_C_C3_OFFLINE_CANDIDATE_OWNER_CONTRACT_FAILED");
  }
  return value;
}
