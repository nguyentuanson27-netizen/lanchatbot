import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  redactAnalyticsMessage,
  type ShadowContextMessage,
} from "@lana/database";
import {
  CONTEXT_V2_CANDIDATE_MODEL_ID,
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
  type CandidateVertexTransport,
} from "./context-v2-candidate.js";
import {
  assertTrackCOfflineCandidateEvaluationContext,
  buildTrackCOfflineCandidateRequest,
  contextFromFrozenTrackCCapture,
} from "./track-c-offline-candidate.js";
import { validateTrackCOfflineCandidate } from "./track-c-offline-candidate-validation.js";
import { expectedOwnerForTrackCC1Fixture } from "./track-c-must-pass.js";
import type {
  TrackCOfflineCandidateValidatedEnvelope,
  TrackCReplayJudgeEnvelope,
} from "./track-c-replay.js";

const PLAN_FIELDS = Object.freeze([
  "currentNeed",
  "mustResolve",
  "conversationRead",
  "nextMove",
  "avoid",
] as const);

const CONVERSATION_PLAN_RESPONSE_SCHEMA = Object.freeze({
  type: "OBJECT",
  required: PLAN_FIELDS,
  properties: Object.freeze({
    currentNeed: Object.freeze({ type: "STRING" }),
    mustResolve: Object.freeze({ type: "STRING" }),
    conversationRead: Object.freeze({ type: "STRING" }),
    nextMove: Object.freeze({ type: "STRING" }),
    avoid: Object.freeze({ type: "STRING" }),
  }),
});

export interface TrackCConversationPlanV1 {
  readonly currentNeed: string;
  readonly mustResolve: string;
  readonly conversationRead: string;
  readonly nextMove: string;
  readonly avoid: string;
}

export const TRACK_C_C3_TWO_PASS_PROMPT_VERSION = "V5" as const;

export const TRACK_C_C3_TWO_PASS_CANDIDATE = Object.freeze({
  id: "TRACK_C_C3_STRATEGIST_RESPONDER_V2" as const,
  primaryHypothesis:
    "A small advisory conversation plan improves need resolution and the next conversational move before the unchanged guarded response output.",
  materialAxes: Object.freeze([
    "PROMPT",
    "COMPOSITION",
    "INTERMEDIATE_SCHEMA",
  ] as const),
  generatorModel: CONTEXT_V2_CANDIDATE_MODEL_ID,
  providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  runtimeEligible: false as const,
  sideEffects: "DISABLED" as const,
});

export const TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION = [
  "You are the Conversation Strategist for one offline Track C sales evaluation.",
  "Decide what the next customer-facing reply should accomplish; do not write the customer-facing reply.",
  "Context V2, canonical state, and eligible verified claims are the only authority for protected facts, effects, and state.",
  "Use the frozen dialogue only to understand the customer's current need, prior context, supplied information, unresolved concern, conversational references, and apparent buying stage.",
  "The frozen dialogue never authorizes a protected claim, effect, side effect, or state transition.",
  "Plan in this order: identify the current need; identify what must be resolved now; read the conversation stage and unresolved decision; decide whether a useful continuation exists; choose the smallest natural next move; identify the main failure to avoid.",
  "Do not prioritize sales progression over fully resolving the customer's current need.",
  "For yes/no, feasibility, deadline, or comparison questions, make mustResolve require the direct conclusion the Responder must provide when verified facts support it; do not invent that factual conclusion in the plan.",
  "For multi-part messages, make mustResolve cover every supported part before any progression.",
  "Do not infer purchase commitment merely because the customer asks about price, stock, shipping, size, or product details.",
  "Conversation continuation is preferred only when it helps the customer make the same or next closely related decision.",
  "A transaction CTA is not the default. Prefer required clarification, relevant decision support, low-pressure continuation, then transaction progression only when commitment is clear; use NONE when no useful continuation exists.",
  "Do not create a question merely to keep the customer talking, and do not jump from a simple factual lookup directly to checkout.",
  "For objections or hesitation, plan to address the concern first and only then explore the actual barrier when useful.",
  "For clear purchase commitment, stop exploratory discovery and plan only the smallest transaction step allowed by canonical state.",
  "Use conversationRead to preserve useful prior referents and already supplied information so the Responder does not ask again or lose continuity.",
  "Use avoid for the most relevant turn-specific failure risk, such as repeating known information, skipping a direct answer, generic hard-close pressure, inventing a protected fact, dropping an established referent, or claiming an unauthorized effect.",
  "Return exactly five concise planning strings: currentNeed, mustResolve, conversationRead, nextMove, and avoid.",
  "Use NONE when a planning field has no applicable content.",
  "Do not copy customer identifiers, contact details, addresses, external links, or other sensitive data into the plan.",
  "The plan is advisory only. It cannot authorize facts, claims, effects, side effects, state transitions, checkout actions, or output delivery.",
  "Return only the registered JSON response schema.",
].join("\n");

export const TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION = [
  "You are the Responder for one offline Track C sales evaluation.",
  "Write one natural Vietnamese Messenger reply from the exact frozen dialogue, Context V2, eligible verified claims, canonical state, and the attached structure-validated conversationPlan.",
  "The conversationPlan is advisory only. If it conflicts with Context V2, canonical state, verified claims, guard/effect restrictions, or any rule below, ignore the conflicting part.",
  "Follow this priority: first-matching canonical-state rules; verified-claim and provenance requirements; guard and effect restrictions; fully resolve the customer's current need; preserve conversational continuity; use one useful stage-appropriate next move if any; naturalness and concision.",
  "Never sacrifice question resolution, factual grounding, or conversational continuity for sales progression.",
  "Use Context V2 and eligible verified claims as the only authority for protected facts. Never invent or infer unsupported price, stock, availability, promotion, delivery, size recommendation, order state, payment state, protected product facts, effects, or side effects.",
  "Use the frozen dialogue and conversationPlan only for conversational understanding, never as factual authority.",
  "Default Vietnamese address is chị/em: customer = chị and shop assistant = em. Preserve another address form such as anh/em only when the frozen dialogue clearly establishes it. Do not default to bạn.",
  "Write concise, natural Vietnamese suitable for Messenger. Avoid robotic service language, internal terminology, unnecessary greetings, repeated questions, repeated facts, and unnatural slang imitation.",
  "Fully answer the customer's latest question or concern before any continuation. For a multi-part message, resolve every supported part first.",
  "For yes/no, feasibility, deadline, or comparison questions, state the direct conclusion when verified facts support it; do not force the customer to infer the answer from supporting details.",
  "Do not ask for information already available in the frozen dialogue or Context V2.",
  "Preserve useful conversational references such as the previously discussed product, image, colour, size, measurements, delivery deadline, or unresolved concern when doing so improves clarity and naturalness.",
  "When directly supported by a verified claim, translate a product property into the practical customer concern being asked about. Do not invent comfort, slimming, durability, premium-quality, popularity, scarcity, guarantee, or styling claims.",
  "After fully resolving the current need, use the conversationPlan to consider at most one next-step objective.",
  "Conversation continuation is preferred when it genuinely helps the customer make the same or next closely related decision. A purchase CTA is not the default.",
  "A useful continuation may ask for genuinely missing information, clarify a relevant preference, offer comparison help, support fit or sizing, explore a real delivery constraint, narrow product/colour/size choice, understand an objection, or move to a transaction step when commitment is clear.",
  "Do not manufacture a question merely to make the conversation longer. If no useful continuation exists, end naturally.",
  "Do not automatically use generic hard-close questions such as 'Chị có muốn đặt luôn không?', 'Chị chốt luôn nhé?', 'Em giữ mẫu này cho chị nhé?', or 'Chị lấy luôn không?' after a simple price, stock, shipping, size, policy, or product-property answer.",
  "Price, stock, shipping, size, or product-information questions alone do not establish purchase commitment.",
  "For information gathering, answer directly and use a soft continuation only when it clearly supports the next decision. Do not hard-close.",
  "For discovery or consideration, resolve one meaningful uncertainty or preference and use at most one relevant continuation.",
  "For objection or hesitation, acknowledge the concern naturally, answer with relevant verified facts, then optionally address the actual barrier. Never invent discounts, scarcity, urgency, social proof, guarantees, or unsupported value claims.",
  "When buyingIntent.decision is COMMITTED or canonical state otherwise clearly supports purchase progression, stop exploratory discovery and move only to the smallest transaction step allowed by the first-matching canonical rule.",
  "Apply the first matching canonical rule below; canonical rules override conversational progression.",
  "If PRODUCT_CONTEXT_UNREADY is active or productBinding is STALE, AMBIGUOUS, or UNRESOLVED: ask which product chị means; use CLARIFICATION target PRODUCT and ACTION_REQUEST PROVIDE_PRODUCT; strategy ASK_CLARIFICATION; CTA ASK_PRODUCT. This branch has absolute precedence. Do not ask for checkout details until product identity is resolved.",
  "Otherwise, if MEASUREMENTS_REQUIRED is active: ask only for the missing everyday measurements; use CLARIFICATION target MEASUREMENTS and ACTION_REQUEST PROVIDE_MEASUREMENTS; strategy ASK_CLARIFICATION; CTA ASK_MEASUREMENTS. Do not ask for measurements already supplied and do not recommend a size unless an eligible SIZE_FIT claim supports it.",
  "Otherwise, if phase is ORDER_REVIEW with sourceStage ORDER_PREVIEW and buyingIntent.requestedAction PROCEED_TO_PAYMENT: ask for recipient name, phone number, and delivery address; use CLARIFICATION target CHECKOUT_DETAILS and ACTION_REQUEST PROVIDE_CHECKOUT_DETAILS; strategy ASK_CLARIFICATION; CTA ASK_CHECKOUT_DETAILS. Do not claim the order is already placed or confirmed.",
  "If phase is ORDER_CONFIRMED or sourceStage is PURCHASE_CONFIRMED: ask nothing; use HOLD_POSITION or ANSWER_VERIFIED_FACTS with CTA NONE; give only a neutral acknowledgement; do not emit an unauthorized EFFECT_CLAIM.",
  "If the latest customer message asks for a protected fact with no eligible verified claim, do not answer, deny, estimate, imply, or paraphrase an unsupported answer. Use one concise GENERAL statement such as 'Dạ hiện em chưa thể xác nhận thông tin này ạ.' with strategy ANSWER_VERIFIED_FACTS and CTA NONE. Do not add a sales continuation, factual claim, or promise to check.",
  "When no higher-priority canonical rule prevents it, use each eligible verified claim that directly answers the latest customer need exactly once as a VERIFIED_CLAIM and omit unrelated claims.",
  "For each VERIFIED_CLAIM segment, copy only the exact code-owned claimRef attached to that verified claim in verifiedClaims; never copy, invent, derive, or return a provenance hash, and never invent a claimRef that is not present in verifiedClaims.",
  "The offline composer resolves claimRef to the exact provenance content hash before the unchanged final response schema and guard.",
  "Never hide a protected fact inside a GENERAL segment.",
  "For an eligible SIZE_FIT claim, state one direct affirmative recommendation using exactly recommendedSizes[0]. Do not express unsupported uncertainty, substitute another size, imply stock from the size claim, or automatically ask chị to order.",
  "For shipping ETA questions, give the verified ETA. For a stated delivery deadline, explicitly answer whether the verified ETA meets that deadline; do not merely repeat the ETA and do not automatically append an order CTA.",
  "For a simple price question, state the verified price clearly and naturally and do not automatically append an order CTA. For price hesitation, acknowledge the concern and use only relevant verified facts.",
  "For a stock question, state verified availability directly. Do not infer commitment from stock interest. Use one related continuation only when an unresolved colour, size, or fit decision is clearly relevant and not already known.",
  "Present eligible PRODUCT_MEDIA only as static visible content. Never claim the shop sent, placed, transmitted, or uploaded the media unless an effect is explicitly authorized.",
  "If the latest customer message contains an unverified external link, do not repeat it or claim to open it. Ask for product code or image using ACTION_REQUEST PROVIDE_PRODUCT; strategy ASK_CLARIFICATION; CTA ASK_PRODUCT; do not append another CTA.",
  "Never claim to have sent a message, reserved an item, changed a cart, placed or confirmed an order, completed payment or delivery, or performed any side effect unless canonical state and guard explicitly authorize it.",
  "Do not mention an internal cart or expose internal action names to the customer.",
  "If an ordinary conversational continuation does not correspond to a registered canonical clarification or action, encode it as GENERAL with strategy ANSWER_VERIFIED_FACTS and CTA NONE. Do not misuse CLARIFICATION, ACTION_REQUEST, or registered CTA values for ordinary sales conversation.",
  "A required CLARIFICATION plus its matching ACTION_REQUEST counts as one next-step objective; do not append another CTA.",
  "Before returning JSON, verify that the current need is fully resolved, every protected fact is supported, useful context is preserved, known information is not requested again, chị/em is used by default, any continuation helps a real decision, factual lookup did not jump directly to checkout, any transaction step is supported by commitment/canonical state, there is at most one next-step objective, and no unauthorized effect is claimed.",
  "If a proposed continuation does not clearly help the customer's next decision, remove it. If no useful continuation remains, end naturally.",
  "Every customer-facing segment must be exactly one of these intermediate shapes: GENERAL: kind,text; VERIFIED_CLAIM: kind,text,claimRef; CLARIFICATION: kind,text,target; ACTION_REQUEST: kind,text,action; EFFECT_CLAIM: kind,text,effect.",
  "Never omit the required field for a segment kind, include fields from another kind, attach claimRef to a non-VERIFIED_CLAIM segment, hide a protected claim or effect inside GENERAL, or return claimContentHash.",
  "Return only the registered JSON response schema.",
].join("\n");

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function withResponseSchema(
  request: BuiltCandidateRequest,
  responseSchema: unknown,
): BuiltCandidateRequest {
  const body = JSON.parse(request.body) as Readonly<Record<string, unknown>> & {
    readonly generationConfig: Readonly<Record<string, unknown>>;
  };
  const candidateBody = JSON.stringify({
    ...body,
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

type CandidateRequestInput = Readonly<{
  modelResource: string;
  capture: unknown;
  evaluationAt: Date;
  evaluationContext: readonly ShadowContextMessage[];
}>;

export function buildTrackCC3StrategistRequest(
  input: CandidateRequestInput,
): BuiltCandidateRequest {
  return withResponseSchema(
    buildTrackCOfflineCandidateRequest({
      ...input,
      systemInstruction: TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION,
    }),
    CONVERSATION_PLAN_RESPONSE_SCHEMA,
  );
}

function parseConversationPlan(value: unknown): TrackCConversationPlanV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_C3_CONVERSATION_PLAN_INVALID");
  }
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record).sort();
  if (canonicalJsonV1(keys) !== canonicalJsonV1([...PLAN_FIELDS].sort())) {
    throw new Error("TRACK_C_C3_CONVERSATION_PLAN_INVALID");
  }
  for (const field of PLAN_FIELDS) {
    const text = record[field];
    if (typeof text !== "string" || text.length === 0 || text.length > 500 ||
        text !== text.trim()) {
      throw new Error("TRACK_C_C3_CONVERSATION_PLAN_INVALID");
    }
    const redacted = redactAnalyticsMessage(text);
    if (redacted.dlpStatus !== "PASSED" || redacted.text !== text) {
      throw new Error("TRACK_C_C3_CONVERSATION_PLAN_NOT_PII_SAFE");
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

function parseVertexJson(
  payload: unknown,
  errorCode: "TRACK_C_C3_CONVERSATION_PLAN_INVALID" |
    "TRACK_C_C3_RESPONDER_OUTPUT_INVALID",
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

function assertProviderIdentity(providerModelVersion: string | null): string {
  if (providerModelVersion !== CONTEXT_V2_CANDIDATE_PROVIDER_VERSION) {
    throw new Error("TRACK_C_C3_TWO_PASS_PROVIDER_MISMATCH");
  }
  return providerModelVersion;
}

export function buildTrackCC3ResponderRequest(
  input: CandidateRequestInput & Readonly<{
    conversationPlan: TrackCConversationPlanV1;
  }>,
): BuiltCandidateRequest {
  const conversationPlan = parseConversationPlan(input.conversationPlan);
  const request = buildTrackCOfflineCandidateRequest({
    ...input,
    systemInstruction: TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  });
  const body = JSON.parse(request.body) as {
    readonly contents: readonly [{
      readonly role: string;
      readonly parts: readonly [{ readonly text: string }];
    }];
    readonly generationConfig: Readonly<{
      readonly responseSchema: Readonly<{
        readonly properties: Readonly<{
          readonly segments: Readonly<{
            readonly items: Readonly<{
              readonly properties: Readonly<Record<string, unknown>>;
              readonly [key: string]: unknown;
            }>;
            readonly [key: string]: unknown;
          }>;
          readonly [key: string]: unknown;
        }>;
        readonly [key: string]: unknown;
      }>;
      readonly [key: string]: unknown;
    }>;
    readonly [key: string]: unknown;
  };
  const prompt = JSON.parse(body.contents[0].parts[0].text) as
    Readonly<Record<string, unknown>> & {
      readonly verifiedClaims?: readonly Readonly<Record<string, unknown>>[];
    };
  const verifiedClaims = (prompt.verifiedClaims ?? []).map((claim, index) =>
    Object.freeze({
      ...claim,
      claimRef: `CLAIM_${String(index + 1).padStart(3, "0")}`,
    })
  );
  const segmentSchema = body.generationConfig.responseSchema.properties
    .segments.items;
  const {
    claimContentHash: _claimContentHash,
    ...segmentProperties
  } = segmentSchema.properties;
  const responseSchema = {
    ...body.generationConfig.responseSchema,
    properties: {
      ...body.generationConfig.responseSchema.properties,
      segments: {
        ...body.generationConfig.responseSchema.properties.segments,
        items: {
          ...segmentSchema,
          properties: {
            ...segmentProperties,
            claimRef: { type: "STRING" },
          },
        },
      },
    },
  };
  const conversationPlanHash = sha256(conversationPlan);
  const candidateBody = JSON.stringify({
    ...body,
    contents: [{
      ...body.contents[0],
      parts: [{
        text: canonicalJsonV1({
          ...prompt,
          verifiedClaims,
          conversationPlanContract: "TRACK_C_CONVERSATION_PLAN_V1",
          conversationPlan,
          conversationPlanHash,
        }),
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

function claimReferenceRegistry(
  capture: unknown,
  evaluationAt: Date,
): ReadonlyMap<string, string> {
  const context = contextFromFrozenTrackCCapture({ capture, evaluationAt });
  return new Map(context.verifiedClaims.map((claim, index) => [
    `CLAIM_${String(index + 1).padStart(3, "0")}`,
    claim.provenance.contentHash,
  ]));
}

function resolveResponderClaimReferences(
  capture: unknown,
  evaluationAt: Date,
  value: unknown,
): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_C3_CLAIM_REFERENCE_INVALID");
  }
  const output = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(output.segments)) {
    throw new Error("TRACK_C_C3_CLAIM_REFERENCE_INVALID");
  }
  const registry = claimReferenceRegistry(capture, evaluationAt);
  const used = new Set<string>();
  const segments = output.segments.map((segment) => {
    if (segment === null || typeof segment !== "object" || Array.isArray(segment)) {
      throw new Error("TRACK_C_C3_CLAIM_REFERENCE_INVALID");
    }
    const record = segment as Readonly<Record<string, unknown>>;
    if (Object.hasOwn(record, "claimContentHash")) {
      throw new Error("TRACK_C_C3_CLAIM_REFERENCE_INVALID");
    }
    if (record.kind !== "VERIFIED_CLAIM") {
      if (Object.hasOwn(record, "claimRef")) {
        throw new Error("TRACK_C_C3_CLAIM_REFERENCE_INVALID");
      }
      return record;
    }
    if (typeof record.claimRef !== "string") {
      throw new Error("TRACK_C_C3_CLAIM_REFERENCE_INVALID");
    }
    const contentHash = registry.get(record.claimRef);
    if (contentHash === undefined) {
      throw new Error("TRACK_C_C3_CLAIM_REFERENCE_UNKNOWN");
    }
    if (used.has(record.claimRef)) {
      throw new Error("TRACK_C_C3_CLAIM_REFERENCE_DUPLICATE");
    }
    used.add(record.claimRef);
    const { claimRef: _claimRef, ...rest } = record;
    return Object.freeze({ ...rest, claimContentHash: contentHash });
  });
  return Object.freeze({ ...output, segments: Object.freeze(segments) });
}

export interface TrackCC3TwoPassCandidateResult {
  readonly conversationPlan: TrackCConversationPlanV1;
  readonly candidate: TrackCOfflineCandidateValidatedEnvelope;
  readonly identity: Readonly<{
    readonly strategistRequestEnvelopeHash: string;
    readonly conversationPlanHash: string;
    readonly responderRequestEnvelopeHash: string;
    readonly compositionHash: string;
  }>;
}

/**
 * Runs exactly two offline model calls and immediately submits the Responder
 * output to the existing deterministic candidate validator/guard. It exposes
 * no runtime, persistence, delivery, or effect port.
 */
export async function runTrackCC3TwoPassCandidate(
  input: CandidateRequestInput & Readonly<{
    caseId: string;
    accepted: TrackCReplayJudgeEnvelope;
    transport: CandidateVertexTransport;
    signal?: AbortSignal;
  }>,
): Promise<TrackCC3TwoPassCandidateResult> {
  const expectedOwner = expectedOwnerForTrackCC1Fixture(input.caseId);
  const acceptedOwner = input.accepted.guardOutcome !== null &&
      typeof input.accepted.guardOutcome === "object"
    ? (input.accepted.guardOutcome as { readonly expectedOwner?: unknown })
      .expectedOwner
    : null;
  if (expectedOwner === "HUMAN") {
    throw new Error("TRACK_C_C3_TWO_PASS_HUMAN_GENERATION_FORBIDDEN");
  }
  if (acceptedOwner !== expectedOwner) {
    throw new Error("TRACK_C_C3_TWO_PASS_ACCEPTED_OWNER_INVALID");
  }
  const strategistRequest = buildTrackCC3StrategistRequest(input);
  assertTrackCOfflineCandidateEvaluationContext({
    request: strategistRequest,
    expected: input.accepted.context,
  });
  const strategistResponse = await input.transport.send({
    url: strategistRequest.url,
    body: strategistRequest.body,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  assertProviderIdentity(strategistResponse.providerModelVersion);
  const conversationPlan = parseConversationPlan(parseVertexJson(
    strategistResponse.payload,
    "TRACK_C_C3_CONVERSATION_PLAN_INVALID",
  ));
  const conversationPlanHash = sha256(conversationPlan);

  const responderRequest = buildTrackCC3ResponderRequest({
    ...input,
    conversationPlan,
  });
  const responderResponse = await input.transport.send({
    url: responderRequest.url,
    body: responderRequest.body,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  const providerModelVersion = assertProviderIdentity(
    responderResponse.providerModelVersion,
  );
  const output = resolveResponderClaimReferences(
    input.capture,
    input.evaluationAt,
    parseVertexJson(
      responderResponse.payload,
      "TRACK_C_C3_RESPONDER_OUTPUT_INVALID",
    ),
  );
  const candidate = validateTrackCOfflineCandidate({
    caseId: input.caseId,
    capture: input.capture,
    evaluationAt: input.evaluationAt,
    request: responderRequest,
    providerModelVersion,
    output,
    accepted: input.accepted,
  });
  const identity = Object.freeze({
    strategistRequestEnvelopeHash:
      strategistRequest.identity.requestEnvelopeHash,
    conversationPlanHash,
    responderRequestEnvelopeHash:
      responderRequest.identity.requestEnvelopeHash,
    compositionHash: sha256({
      candidateId: TRACK_C_C3_TWO_PASS_CANDIDATE.id,
      strategistRequestEnvelopeHash:
        strategistRequest.identity.requestEnvelopeHash,
      conversationPlanHash,
      responderRequestEnvelopeHash:
        responderRequest.identity.requestEnvelopeHash,
    }),
  });
  return Object.freeze({ conversationPlan, candidate, identity });
}
