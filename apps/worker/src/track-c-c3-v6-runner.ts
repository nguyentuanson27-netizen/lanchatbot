/*
 * Track C C3 V6 execution seam (BEHAVIOR_SIMULATION, evaluation only).
 *
 * Kept separate from the C2-pinned V5 runner on purpose: that file is a pinned
 * bundle component, so editing it would force a benchmark revision bump. Wiring
 * V6 into C2 scoring is deliberately a follow-up change.
 *
 * No persistence, delivery, or effect port is reachable from here, and the
 * production-contract lane is out of scope for this seam.
 */
import { createHash } from "node:crypto";
import {
  ContextV2CandidateOutputV2Schema,
  canonicalJsonV1,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
import type { ShadowContextMessage } from "@lana/database";
import {
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
  type CandidateVertexTransport,
} from "./context-v2-candidate.js";
import {
  buildTrackCClaimReferenceRegistry,
  resolveTrackCCandidateClaimReferences,
} from "./track-c-claim-reference-resolver.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import {
  TRACK_C_C3_V6_CANDIDATE,
  buildTrackCV6ResponderRequest,
  buildTrackCV6StrategistRequest,
} from "./track-c-c3-v6-candidate.js";
import {
  assertTrackCV6PlanConformance,
  parseTrackCV6DirectivePlan,
  trackCV6RuleShape,
  type TrackCV6DirectivePlan,
} from "./track-c-c3-v6-directive-plan.js";
import type { TrackCV5SimulationMetadata } from "./track-c-c3-v5-benchmark-runner.js";

const SIMULATION_ADDENDUM = [
  "BENCHMARK BEHAVIOR_SIMULATION.",
  "benchmarkSimulationFacts: evaluation-only hypothetical evidence for this case. Usable as supplied evidence. Never protected claims; authorizes no state, effect, persistence, payment, order, or delivery. Canonical state wins on conflict.",
  "benchmarkSimulationMetadata: fixture-owned wiring signal. Never fact authority, never inferred from dialogue.",
  "TRACK_C_TRUSTED_ACQUISITION_V1: trusted first-contact origin. Use only to judge whether this turn is a first-contact opportunity.",
  "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1 state REQUIRED: rule CHECKOUT_DETAILS, and ask only for the listed missingFields.",
  "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1 state COMPLETE: never rule CHECKOUT_DETAILS. Use ORDER_CONFIRMED_HOLD, acknowledge SUPPLIED_INFO, and claim no order, payment, or update effect.",
].join("\n");

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function parseProviderJson(payload: unknown, errorCode: string): unknown {
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

function withSimulationLane(
  request: BuiltCandidateRequest,
  simulationFacts: readonly unknown[],
  simulationMetadata: readonly TrackCV5SimulationMetadata[],
): BuiltCandidateRequest {
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
        text: `${body.systemInstruction.parts[0].text}\n${SIMULATION_ADDENDUM}`,
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

function assertProviderIdentity(value: string | null): void {
  if (value !== CONTEXT_V2_CANDIDATE_PROVIDER_VERSION) {
    throw new Error("TRACK_C_V6_PROVIDER_IDENTITY_MISMATCH");
  }
}

/**
 * Validates the reply against the frozen context, then against the plan. Claim
 * provenance is resolved exactly as the V5 seam does; the plan conformance check
 * runs first, while segments still carry their code-owned claimRef.
 */
function validateReply(
  context: ReturnType<typeof contextFromFrozenTrackCCapture>,
  raw: unknown,
  plan: TrackCV6DirectivePlan,
): ContextV2CandidateOutputV2 {
  assertTrackCV6PlanConformance(plan, raw);
  const resolved = resolveTrackCCandidateClaimReferences(
    raw,
    buildTrackCClaimReferenceRegistry(context),
    {
      invalid: "TRACK_C_V6_CLAIM_REFERENCE_INVALID",
      unknown: "TRACK_C_V6_CLAIM_REFERENCE_UNKNOWN",
      duplicate: "TRACK_C_V6_CLAIM_REFERENCE_DUPLICATE",
      textMismatch: "TRACK_C_V6_CLAIM_REFERENCE_TEXT_MISMATCH",
    },
  ) as Readonly<Record<string, unknown>>;
  const semantic = ContextV2CandidateOutputV2Schema.pick({
    segments: true,
    strategy: true,
    cta: true,
  }).safeParse(resolved);
  if (!semantic.success) {
    throw new Error("TRACK_C_V6_RESPONDER_OUTPUT_INVALID");
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
  const known = new Set([
    ...context.verifiedClaims.map(({ provenance }) => provenance.contentHash),
    ...(context.productAttributes === null ||
        context.productAttributes === undefined
      ? []
      : [context.productAttributes.metadata.contentHash]),
    ...(context.productPresentation === null ||
        context.productPresentation === undefined
      ? []
      : [context.productPresentation.provenance.contentHash]),
  ]);
  if (output.segments.some((segment) =>
    segment.kind === "VERIFIED_CLAIM" && !known.has(segment.claimContentHash)
  )) {
    throw new Error("TRACK_C_V6_RESPONDER_PROVENANCE_INVALID");
  }
  return output;
}

export interface TrackCV6RunInput {
  readonly modelResource: string;
  readonly capture: unknown;
  readonly evaluationAt: Date;
  readonly evaluationContext: readonly ShadowContextMessage[];
  readonly simulationFacts?: readonly unknown[];
  readonly simulationMetadata?: readonly TrackCV5SimulationMetadata[];
  readonly transport: CandidateVertexTransport;
  readonly signal?: AbortSignal;
}

export interface TrackCV6RunResult {
  readonly contractVersion: "TRACK_C_C3_V6_RESULT_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly executionLane: "BEHAVIOR_SIMULATION";
  readonly candidateId: typeof TRACK_C_C3_V6_CANDIDATE.id;
  readonly plan: TrackCV6DirectivePlan;
  readonly output: ContextV2CandidateOutputV2;
  readonly reply: string;
  readonly identity: Readonly<{
    readonly captureContextHash: string;
    readonly strategistRequestEnvelopeHash: string;
    readonly planHash: string;
    readonly responderRequestEnvelopeHash: string;
    readonly responseOutputHash: string;
    readonly compositionHash: string;
  }>;
}

/**
 * One V6 case: Strategist decides, code checks the decision is well formed,
 * Responder realizes it, code checks the reply matches the decision. A reply
 * that drifts from the plan fails here instead of being scored as a quality
 * opinion later.
 */
export async function runTrackCV6Case(
  input: TrackCV6RunInput,
): Promise<TrackCV6RunResult> {
  let context: ReturnType<typeof contextFromFrozenTrackCCapture>;
  try {
    context = contextFromFrozenTrackCCapture({
      capture: input.capture,
      evaluationAt: input.evaluationAt,
    });
  } catch {
    throw new Error("TRACK_C_V6_PRE_MODEL_REJECT");
  }
  if (context.ownership.owner !== "BOT" || context.ownership.handoffActive) {
    throw new Error("TRACK_C_V6_GENERATION_OWNER_FORBIDDEN");
  }

  const common = {
    modelResource: input.modelResource,
    capture: input.capture,
    evaluationAt: input.evaluationAt,
    evaluationContext: input.evaluationContext,
  };
  const simulationFacts = input.simulationFacts ?? [];
  const simulationMetadata = input.simulationMetadata ?? [];
  const claimRefs = [...buildTrackCClaimReferenceRegistry(context).keys()];

  const strategistRequest = withSimulationLane(
    buildTrackCV6StrategistRequest(common),
    simulationFacts,
    simulationMetadata,
  );
  const strategistResponse = await input.transport.send({
    url: strategistRequest.url,
    body: strategistRequest.body,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  assertProviderIdentity(strategistResponse.providerModelVersion);
  const plan = parseTrackCV6DirectivePlan(
    parseProviderJson(strategistResponse.payload, "TRACK_C_V6_PLAN_SHAPE_INVALID"),
    claimRefs,
  );

  const responderRequest = withSimulationLane(
    buildTrackCV6ResponderRequest({ ...common, plan }),
    simulationFacts,
    simulationMetadata,
  );
  const responderResponse = await input.transport.send({
    url: responderRequest.url,
    body: responderRequest.body,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  assertProviderIdentity(responderResponse.providerModelVersion);

  const output = validateReply(
    context,
    parseProviderJson(
      responderResponse.payload,
      "TRACK_C_V6_RESPONDER_OUTPUT_INVALID",
    ),
    plan,
  );
  const reply = output.segments.map(({ text }) => text).join("\n");
  const identityBase = Object.freeze({
    captureContextHash: context.contextHash,
    strategistRequestEnvelopeHash:
      strategistRequest.identity.requestEnvelopeHash,
    planHash: sha256(plan),
    responderRequestEnvelopeHash:
      responderRequest.identity.requestEnvelopeHash,
    responseOutputHash: sha256(output),
  });
  return Object.freeze({
    contractVersion: "TRACK_C_C3_V6_RESULT_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    executionLane: "BEHAVIOR_SIMULATION",
    candidateId: TRACK_C_C3_V6_CANDIDATE.id,
    plan,
    output,
    reply,
    identity: Object.freeze({
      ...identityBase,
      compositionHash: sha256({
        candidateId: TRACK_C_C3_V6_CANDIDATE.id,
        rule: plan.rule,
        ruleShape: trackCV6RuleShape(plan.rule),
        ...identityBase,
      }),
    }),
  });
}
