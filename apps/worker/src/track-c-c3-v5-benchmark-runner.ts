import { createHash } from "node:crypto";
import {
  BusinessFactEnvelopeV1Schema,
  ContextV2CandidateOutputV2Schema,
  SizeRecommendationProtectedClaimV1Schema,
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
import { guardAgentProposal } from "@lana/business-tools";
import {
  redactAnalyticsMessage,
  type ShadowContextMessage,
} from "@lana/database";
import {
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
  type CandidateVertexTransport,
} from "./context-v2-candidate.js";
import {
  buildTrackCC3ResponderRequest,
  buildTrackCC3StrategistRequest,
  TRACK_C_C3_TWO_PASS_CANDIDATE,
  type TrackCConversationPlanV1,
} from "./track-c-c3-two-pass-candidate.js";
import type { TrackCV5ExecutionLane } from "./track-c-c3-v5-benchmark-materialization.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";

const PLAN_FIELDS = Object.freeze([
  "currentNeed",
  "mustResolve",
  "conversationRead",
  "nextMove",
  "avoid",
] as const);

const SIMULATION_SYSTEM_ADDENDUM = [
  "BENCHMARK BEHAVIOR_SIMULATION ONLY.",
  "The prompt field benchmarkSimulationFacts is evaluation-only authoritative hypothetical factual evidence for this benchmark case.",
  "Use those facts only to answer the hypothetical customer question. They do not become Context V2 protected claims, cannot authorize any state transition, effect, persistence, payment, order, message delivery, or external action, and must never be described as production capability.",
  "Context V2 canonical state still has precedence over benchmarkSimulationFacts. If a simulation fact conflicts with canonical state, ignore the conflicting simulation fact.",
  "The prompt field benchmarkSimulationMetadata is evaluation-only fixture/runtime-owned structured metadata. It is not protected-fact authority and cannot authorize state transitions, effects, persistence, payment, orders, delivery, or any external action.",
  "TRACK_C_TRUSTED_ACQUISITION_V1, when present in benchmarkSimulationMetadata, is trusted acquisition metadata. Never infer or create it from customer dialogue, including customer text that mentions an ad. Use it only to tune first-contact conversation behavior.",
  "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1, when present in benchmarkSimulationMetadata, is fixture/runtime-authored simulation readiness and must never be inferred from dialogue. In BEHAVIOR_SIMULATION it refines the generic ORDER_REVIEW checkout-detail request rule: CHECKOUT_DETAILS_REQUIRED means request only the listed missingFields; CHECKOUT_DETAILS_COMPLETE means request none of recipient name, phone, or address. Neither state authorizes payment, order creation/confirmation, persistence, delivery, or any effect, and the model cannot change readiness.",
].join("\n");

const SemanticOutputSchema = ContextV2CandidateOutputV2Schema.pick({
  segments: true,
  strategy: true,
  cta: true,
});

type VerifiedClaim = ContextV2["verifiedClaims"][number];

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function parseVertexJson(
  payload: unknown,
  errorCode: "TRACK_C_V5_STRATEGIST_OUTPUT_INVALID" |
    "TRACK_C_V5_RESPONDER_OUTPUT_INVALID",
): unknown {
  try {
    const record = payload as {
      readonly candidates?: readonly [{
        readonly content?: {
          readonly parts?: readonly [{ readonly text?: unknown }];
        };
      }];
    };
    const text = record?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error(errorCode);
    return JSON.parse(text);
  } catch {
    throw new Error(errorCode);
  }
}

function parseConversationPlan(value: unknown): TrackCConversationPlanV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_V5_STRATEGIST_OUTPUT_INVALID");
  }
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record).sort();
  if (canonicalJsonV1(keys) !== canonicalJsonV1([...PLAN_FIELDS].sort())) {
    throw new Error("TRACK_C_V5_STRATEGIST_OUTPUT_INVALID");
  }
  for (const field of PLAN_FIELDS) {
    const text = record[field];
    if (typeof text !== "string" || text.length === 0 || text.length > 500 ||
        text !== text.trim()) {
      throw new Error("TRACK_C_V5_STRATEGIST_OUTPUT_INVALID");
    }
    const redacted = redactAnalyticsMessage(text);
    if (redacted.dlpStatus !== "PASSED" || redacted.text !== text) {
      throw new Error("TRACK_C_V5_STRATEGIST_OUTPUT_NOT_PII_SAFE");
    }
  }
  return Object.freeze({
    currentNeed: record.currentNeed as string,
    mustResolve: record.mustResolve as string,
    conversationRead: record.conversationRead as string,
    nextMove: record.nextMove as string,
    avoid: record.avoid as string,
  });
}

function assertProviderIdentity(value: string | null): string {
  if (value !== CONTEXT_V2_CANDIDATE_PROVIDER_VERSION) {
    throw new Error("TRACK_C_V5_PROVIDER_IDENTITY_MISMATCH");
  }
  return value;
}

function withBenchmarkLane(
  request: BuiltCandidateRequest,
  lane: TrackCV5ExecutionLane,
  simulationFacts: readonly unknown[],
  simulationMetadata: readonly unknown[],
): BuiltCandidateRequest {
  if (lane === "PRODUCTION_CONTRACT") {
    if (simulationFacts.length > 0) {
      throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
    }
    if (simulationMetadata.length > 0) {
      throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_METADATA_LEAK");
    }
    return request;
  }
  const body = JSON.parse(request.body) as {
    systemInstruction: { parts: [{ text: string }] };
    contents: [{ role: string; parts: [{ text: string }] }];
    readonly [key: string]: unknown;
  };
  const prompt = JSON.parse(body.contents[0].parts[0].text) as
    Readonly<Record<string, unknown>>;
  const candidateBody = JSON.stringify({
    ...body,
    systemInstruction: {
      parts: [{
        text: `${body.systemInstruction.parts[0].text}\n${SIMULATION_SYSTEM_ADDENDUM}`,
      }],
    },
    contents: [{
      ...body.contents[0],
      parts: [{
        text: canonicalJsonV1({
          ...prompt,
          benchmarkExecutionLane: "BEHAVIOR_SIMULATION",
          benchmarkSimulationFacts: simulationFacts,
          benchmarkSimulationMetadata: simulationMetadata,
        }),
      }],
    }],
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

function resolveClaimReferences(
  value: unknown,
  registry: ReadonlyMap<string, string>,
): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_V5_RESPONDER_OUTPUT_INVALID");
  }
  const output = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(output.segments)) {
    throw new Error("TRACK_C_V5_RESPONDER_OUTPUT_INVALID");
  }
  const used = new Set<string>();
  const segments = output.segments.map((segment) => {
    if (segment === null || typeof segment !== "object" || Array.isArray(segment)) {
      throw new Error("TRACK_C_V5_RESPONDER_OUTPUT_INVALID");
    }
    const record = segment as Readonly<Record<string, unknown>>;
    if (Object.hasOwn(record, "claimContentHash")) {
      throw new Error("TRACK_C_V5_CLAIM_REFERENCE_INVALID");
    }
    if (record.kind !== "VERIFIED_CLAIM") {
      if (Object.hasOwn(record, "claimRef")) {
        throw new Error("TRACK_C_V5_CLAIM_REFERENCE_INVALID");
      }
      return record;
    }
    if (typeof record.claimRef !== "string") {
      throw new Error("TRACK_C_V5_CLAIM_REFERENCE_INVALID");
    }
    const contentHash = registry.get(record.claimRef);
    if (contentHash === undefined) {
      throw new Error("TRACK_C_V5_CLAIM_REFERENCE_UNKNOWN");
    }
    if (used.has(record.claimRef)) {
      throw new Error("TRACK_C_V5_CLAIM_REFERENCE_DUPLICATE");
    }
    used.add(record.claimRef);
    const { claimRef: _claimRef, ...rest } = record;
    return Object.freeze({ ...rest, claimContentHash: contentHash });
  });
  return Object.freeze({ ...output, segments: Object.freeze(segments) });
}

function factEnvelopeForClaim(claim: VerifiedClaim) {
  if (claim.scope.kind !== "PRODUCT") return null;
  let listPriceVnd: number | null = null;
  let salePriceVnd: number | null = null;
  let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" |
    "PRE_ORDER" | "COMING_SOON" | "UNKNOWN" = "UNKNOWN";
  let stockQuantity: number | null = null;
  let deliveryEta: { minDays: number; maxDays: number } | null = null;
  if (claim.type === "PRICE") {
    salePriceVnd = claim.value.amountVnd;
  } else if (claim.type === "STOCK") {
    stockStatus = claim.value.status;
    stockQuantity = claim.value.availableQuantity;
  } else if (claim.type === "ETA") {
    deliveryEta = {
      minDays: claim.value.minDays,
      maxDays: claim.value.maxDays,
    };
  } else {
    return null;
  }
  return BusinessFactEnvelopeV1Schema.parse({
    schemaVersion: 1,
    status: "OK",
    source: "POS_SNAPSHOT",
    observedAt: claim.provenance.observedAt,
    expiresAt: claim.provenance.expiresAt,
    productId: claim.scope.productId,
    facts: {
      schemaVersion: 1,
      productId: claim.scope.productId,
      parentProductId: claim.scope.productId,
      offerType: "DIRECT",
      listPriceVnd,
      salePriceVnd,
      sizes: [],
      stockStatus,
      stockQuantity,
      deliveryEta,
      fulfillmentPolicy: null,
      imageUrls: [],
    },
    reasonCode: null,
  });
}

function sizeGuardInputForClaim(
  context: ContextV2,
  claim: VerifiedClaim | null,
) {
  if (claim?.type !== "SIZE_FIT" || claim.scope.kind !== "PRODUCT" ||
      claim.provenance.authority !== "VERIFIED_SIZE_ENGINE_V1" ||
      claim.value.evidenceBasis !== "MEASUREMENTS" ||
      !claim.provenance.evidenceRef.includes(
        `measurements:${claim.value.measurementFingerprint}`,
      )) {
    return {
      activeProductId: context.productBinding.status === "RESOLVED"
        ? context.productBinding.productIds[0] ?? null
        : null,
      activeVariantId: null,
      customerProfileId: null,
      customerProfileRevision: null,
      claims: [],
    };
  }
  const sizeClaim = SizeRecommendationProtectedClaimV1Schema.parse({
    id: claim.claimId,
    type: "SIZE_RECOMMENDATION",
    value: {
      recommendedSizes: claim.value.recommendedSizes,
      alternativeSizes: claim.value.alternativeSizes,
    },
    productId: claim.scope.productId,
    variantId: claim.scope.variantId,
    evidenceRef: claim.provenance.evidenceRef,
    source: "VERIFIED_SIZE_ENGINE_V1",
    observedAt: claim.provenance.observedAt,
    expiresAt: claim.provenance.expiresAt,
    customerProfileId: claim.value.customerProfileId,
    customerProfileRevision: claim.value.customerProfileRevision,
    measurementFingerprint: claim.value.measurementFingerprint,
    evidenceBasis: {
      kind: "CURRENT_MEASUREMENTS",
      measurementFingerprint: claim.value.measurementFingerprint,
      sourceEventHashes: [claim.provenance.contentHash],
    },
  });
  return {
    activeProductId: claim.scope.productId,
    activeVariantId: claim.scope.variantId,
    customerProfileId: claim.value.customerProfileId,
    customerProfileRevision: claim.value.customerProfileRevision,
    claims: [sizeClaim],
  };
}

function guardProductionOutput(
  context: ContextV2,
  output: ContextV2CandidateOutputV2,
  evaluationAt: Date,
): void {
  const claims = new Map(
    context.verifiedClaims.map((claim) => [
      claim.provenance.contentHash,
      claim,
    ] as const),
  );
  const verifiedProductIds = new Set(context.productBinding.productIds);
  for (const segment of output.segments) {
    const claim = segment.kind === "VERIFIED_CLAIM"
      ? claims.get(segment.claimContentHash) ?? null
      : null;
    if (claim?.scope.kind === "CART") {
      throw new Error("TRACK_C_V5_PRODUCTION_CART_GUARD_UNSUPPORTED");
    }
    const productId = claim?.scope.kind === "PRODUCT"
      ? claim.scope.productId
      : null;
    const sizeClaimContext = sizeGuardInputForClaim(context, claim);
    const guard = guardAgentProposal({
      proposal: {
        schemaVersion: 1,
        intent: "TRACK_C_V5_PRODUCTION_EVALUATION",
        conversationStage: context.phase.phase,
        productId,
        action: "REPLY",
        reply: segment.text,
        attachments: [],
        handoffReason: null,
        protectedClaimIds: sizeClaimContext.claims.map(({ id }) => id),
      },
      facts: claim === null ? null : factEnvelopeForClaim(claim),
      verifiedProductIds,
      buyingSignal: context.buyingIntent.decision === "COMMITTED",
      sizeClaimContext,
      sizeClaimTextMode: "STRUCTURED_REJECT_ONLY",
      now: evaluationAt,
    });
    if (guard.blockedReasonCodes.length > 0) {
      throw new Error(
        `TRACK_C_V5_PRODUCTION_GUARD_FAILED:${guard.blockedReasonCodes.join(",")}`,
      );
    }
  }
}

function validateResponderOutput(
  context: ReturnType<typeof contextFromFrozenTrackCCapture>,
  value: unknown,
  lane: TrackCV5ExecutionLane,
  evaluationAt: Date,
): ContextV2CandidateOutputV2 {
  const semantic = SemanticOutputSchema.safeParse(value);
  if (!semantic.success) {
    throw new Error("TRACK_C_V5_RESPONDER_OUTPUT_INVALID");
  }
  const output = ContextV2CandidateOutputV2Schema.parse({
    schemaVersion: 2,
    contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V2",
    contextHash: context.contextHash,
    productBinding: {
      status: context.productBinding.status,
      productIds: context.productBinding.productIds,
    },
    ...semantic.data,
  });
  if (output.segments.some(({ kind }) => kind === "EFFECT_CLAIM")) {
    throw new Error("TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN");
  }
  const known = new Set(
    context.verifiedClaims.map(({ provenance }) => provenance.contentHash),
  );
  const claimHashes = output.segments.flatMap((segment) =>
    segment.kind === "VERIFIED_CLAIM" ? [segment.claimContentHash] : []
  );
  if (
    new Set(claimHashes).size !== claimHashes.length ||
    claimHashes.some((claimHash) => !known.has(claimHash))
  ) {
    throw new Error("TRACK_C_V5_RESPONDER_PROVENANCE_INVALID");
  }
  if (lane === "PRODUCTION_CONTRACT") {
    guardProductionOutput(context, output, evaluationAt);
  }
  return output;
}

export interface TrackCV5TwoPassBenchmarkInput {
  readonly lane: TrackCV5ExecutionLane;
  readonly modelResource: string;
  readonly capture: unknown;
  readonly evaluationAt: Date;
  readonly evaluationContext: readonly ShadowContextMessage[];
  readonly simulationFacts?: readonly unknown[];
  readonly simulationMetadata?: readonly unknown[];
  readonly transport: CandidateVertexTransport;
  readonly signal?: AbortSignal;
}

export interface TrackCV5TwoPassBenchmarkResult {
  readonly contractVersion: "TRACK_C_V5_TWO_PASS_BENCHMARK_RESULT_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly executionLane: TrackCV5ExecutionLane;
  readonly conversationPlan: TrackCConversationPlanV1;
  readonly output: ContextV2CandidateOutputV2;
  readonly reply: string;
  readonly identity: Readonly<{
    readonly captureContextHash: string;
    readonly strategistRequestEnvelopeHash: string;
    readonly conversationPlanHash: string;
    readonly responderRequestEnvelopeHash: string;
    readonly responseOutputHash: string;
    readonly compositionHash: string;
  }>;
}

/**
 * V5 benchmark-only execution seam. Preflight validates the frozen capture
 * before the first provider call, then the existing C3 strategist/responder
 * request builders are used without widening the C1 fixture registry. Eval-only
 * simulation evidence and trusted metadata are injected only for
 * BEHAVIOR_SIMULATION. Production output is guarded segment-by-segment against
 * the exact frozen claim scope. The result exposes no persistence/effect port.
 */
export async function runTrackCV5TwoPassBenchmarkCase(
  input: TrackCV5TwoPassBenchmarkInput,
): Promise<TrackCV5TwoPassBenchmarkResult> {
  let context: ReturnType<typeof contextFromFrozenTrackCCapture>;
  try {
    context = contextFromFrozenTrackCCapture({
      capture: input.capture,
      evaluationAt: input.evaluationAt,
    });
  } catch {
    throw new Error("TRACK_C_V5_PRE_MODEL_REJECT");
  }
  if (context.ownership.owner !== "BOT" || context.ownership.handoffActive) {
    throw new Error("TRACK_C_V5_GENERATION_OWNER_FORBIDDEN");
  }
  const simulationFacts = input.simulationFacts ?? [];
  const simulationMetadata = input.simulationMetadata ?? [];
  if (input.lane === "PRODUCTION_CONTRACT" && simulationFacts.length > 0) {
    throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  }
  if (input.lane === "PRODUCTION_CONTRACT" && simulationMetadata.length > 0) {
    throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_METADATA_LEAK");
  }

  const common = {
    modelResource: input.modelResource,
    capture: input.capture,
    evaluationAt: input.evaluationAt,
    evaluationContext: input.evaluationContext,
  };
  const strategistRequest = withBenchmarkLane(
    buildTrackCC3StrategistRequest(common),
    input.lane,
    simulationFacts,
    simulationMetadata,
  );
  const strategistResponse = await input.transport.send({
    url: strategistRequest.url,
    body: strategistRequest.body,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  assertProviderIdentity(strategistResponse.providerModelVersion);
  const conversationPlan = parseConversationPlan(parseVertexJson(
    strategistResponse.payload,
    "TRACK_C_V5_STRATEGIST_OUTPUT_INVALID",
  ));

  const responderRequest = withBenchmarkLane(
    buildTrackCC3ResponderRequest({ ...common, conversationPlan }),
    input.lane,
    simulationFacts,
    simulationMetadata,
  );
  const responderResponse = await input.transport.send({
    url: responderRequest.url,
    body: responderRequest.body,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  assertProviderIdentity(responderResponse.providerModelVersion);

  const registry = new Map(context.verifiedClaims.map((claim, index) => [
    `CLAIM_${String(index + 1).padStart(3, "0")}`,
    claim.provenance.contentHash,
  ]));
  const resolved = resolveClaimReferences(
    parseVertexJson(
      responderResponse.payload,
      "TRACK_C_V5_RESPONDER_OUTPUT_INVALID",
    ),
    registry,
  );
  const output = validateResponderOutput(
    context,
    resolved,
    input.lane,
    input.evaluationAt,
  );
  const reply = output.segments.map(({ text }) => text).join("\n");
  const identity = Object.freeze({
    captureContextHash: context.contextHash,
    strategistRequestEnvelopeHash:
      strategistRequest.identity.requestEnvelopeHash,
    conversationPlanHash: sha256(conversationPlan),
    responderRequestEnvelopeHash:
      responderRequest.identity.requestEnvelopeHash,
    responseOutputHash: sha256(output),
    compositionHash: sha256({
      candidateId: TRACK_C_C3_TWO_PASS_CANDIDATE.id,
      executionLane: input.lane,
      captureContextHash: context.contextHash,
      strategistRequestEnvelopeHash:
        strategistRequest.identity.requestEnvelopeHash,
      conversationPlanHash: sha256(conversationPlan),
      responderRequestEnvelopeHash:
        responderRequest.identity.requestEnvelopeHash,
      responseOutputHash: sha256(output),
    }),
  });
  return Object.freeze({
    contractVersion: "TRACK_C_V5_TWO_PASS_BENCHMARK_RESULT_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    executionLane: input.lane,
    conversationPlan,
    output,
    reply,
    identity,
  });
}
