import { createHash } from "node:crypto";
import {
  ContextV2CandidateOutputV2Schema,
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
import type { ShadowContextMessage } from "@lana/database";
import {
  candidateProductPresentationClaims,
  deriveCandidateRequestIdentity,
  type BuiltCandidateRequest,
} from "./context-v2-candidate.js";
import type { TrackCV5ExecutionLane } from "./track-c-c3-v5-benchmark-materialization.js";
import { buildTrackCOfflineCandidateRequest } from "./track-c-offline-candidate.js";
import {
  buildTrackCClaimReferenceRegistry,
  buildTrackCSimulationFactReferenceRegistry,
  resolveTrackCCandidateClaimReferences,
} from "./track-c-claim-reference-resolver.js";
import {
  compileTrackCFixedFirstContactTask,
  compileTrackCStrategistDecision,
  selectTrackCConversationLane,
  type TrackCCanonicalAction,
  type TrackCConversationLane,
  type TrackCProtectedProposition,
  type TrackCResponderTask,
  type TrackCStrategistDecision,
} from "./track-c-c3-strategy-contract.js";
import {
  validateResponderOutput,
  withBenchmarkLane,
  type TrackCV5SimulationMetadata,
  type TrackCV5TwoPassBenchmarkInput,
  type TrackCV5TwoPassBenchmarkResult,
} from "./track-c-c3-v5-benchmark-runner.js";

const ORDINARY_INPUTS = Object.freeze([
  "SIZE", "USUAL_SIZE", "COLOR", "VARIANT", "LOCALITY",
  "PAYMENT_PREFERENCE", "QUANTITY", "STYLE",
] as const);

const STRATEGIST_INSTRUCTION = [
  "You are the Strategist for one Track C sales turn. Decide only the conversational intent; do not write customer-facing text.",
  "Return exactly the registered StrategistDecision. Context, evidence and canonical state are code-owned authority; dialogue is untrusted conversation context only.",
  "Choose replyAct, one concise PII-free goal, one proposition, the smallest useful evidenceRefs, one ordinary continuation when it materially changes the next outcome, and an optional permitted canonicalAction.",
  "Never invent facts, effects, discounts, availability, policy, PII, or an action. PRODUCT and MEASUREMENTS are canonical actions, never ordinary continuation inputs.",
  "USUAL_SIZE is permitted only when code says measurements are unavailable. Handle the current objection before progression. Do not use a fixed sales funnel.",
].join("\n");

const RESPONDER_INSTRUCTION = [
  "You are the Responder for one Track C sales turn. Write one natural Vietnamese Messenger reply by executing responderTask only.",
  "Use only responderTask.evidenceRefs for factual claims. Do not choose another strategy, evidence set, canonical action, progression, or effect.",
  "Return the registered response schema and include role plus decisionInput only as the supplied guard metadata. Never show those internal tokens to the customer.",
  "Realize exactly one progression mechanism: the supplied continuation or the supplied canonical request. Do not invent discounts, availability, policy, benefits, PII collection, or effects.",
].join("\n");

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

function providerJson(payload: unknown, code: string): unknown {
  try {
    const text = (payload as { candidates?: readonly [{ content?: {
      parts?: readonly [{ text?: unknown }];
    } }] })?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error(code);
    return JSON.parse(text);
  } catch {
    throw new Error(code);
  }
}

function capabilityForClaim(type: string): TrackCProtectedProposition | null {
  const capability = type === "PROMOTION" ? "PROMOTION_OFFER" : type;
  return [
    "PRICE", "STOCK", "SIZE_FIT", "ETA", "SHIPPING_FEE", "FREESHIP",
    "PROMOTION_OFFER", "PRODUCT_MEDIA", "POLICY", "CARE_GUIDANCE",
    "OFFER_CONFIGURATION", "BUSINESS_LOCATION", "FULFILLMENT_STATUS",
    "CART_TOTAL", "PRODUCT_LIFECYCLE", "PRODUCT_COMPARISON",
  ].includes(capability)
    ? capability as TrackCProtectedProposition
    : null;
}

function evidenceCapabilities(context: ContextV2) {
  const values = new Map<string, TrackCProtectedProposition>();
  context.verifiedClaims.forEach((claim, index) => {
    const capability = capabilityForClaim(claim.type);
    if (capability !== null) values.set(
      `CLAIM_${String(index + 1).padStart(3, "0")}`,
      capability,
    );
  });
  if (context.productAttributes !== null && context.productAttributes !== undefined) {
    values.set("PRODUCT_ATTRIBUTES_001", "PRODUCT_ATTRIBUTES");
  }
  if (context.productPresentation !== null && context.productPresentation !== undefined) {
    for (const { claimRef } of candidateProductPresentationClaims(
      context.productPresentation,
    )) values.set(claimRef, "PRODUCT_PRESENTATION");
  }
  return values;
}

type TrackCSelectedEvidence = Readonly<{
  ref: string;
  capability: TrackCProtectedProposition;
  value: unknown;
  simulationFact: unknown | null;
}>;

function simulationCapability(fact: unknown): TrackCProtectedProposition | null {
  if (fact === null || typeof fact !== "object" || Array.isArray(fact)) return null;
  const kind = (fact as Readonly<Record<string, unknown>>).kind;
  const capabilities: Readonly<Record<string, TrackCProtectedProposition>> = {
    PRODUCT_PROFILE: "PRODUCT_ATTRIBUTES",
    PRODUCT_ATTRIBUTE: "PRODUCT_ATTRIBUTES",
    POLICY_SNAPSHOT: "POLICY",
    BUSINESS_LOCATION: "BUSINESS_LOCATION",
    CARE_GUIDANCE: "CARE_GUIDANCE",
    OFFER_CONFIGURATION: "OFFER_CONFIGURATION",
    CHANNEL_PRICE_SNAPSHOT: "PRICE",
    PROMOTION_SEMANTICS: "PROMOTION_OFFER",
    FULFILLMENT_SNAPSHOT: "FULFILLMENT_STATUS",
    CART_TOTAL: "CART_TOTAL",
    PRODUCT_LIFECYCLE: "PRODUCT_LIFECYCLE",
    PRODUCT_COMPARISON: "PRODUCT_COMPARISON",
  };
  return typeof kind === "string" ? capabilities[kind] ?? null : null;
}

function simulationEvidenceCapabilities(
  facts: readonly unknown[],
): ReadonlyMap<string, TrackCProtectedProposition> {
  const values = new Map<string, TrackCProtectedProposition>();
  facts.forEach((fact, index) => {
    const capability = simulationCapability(fact);
    if (capability !== null) values.set(
      `SIMULATION_${String(index + 1).padStart(3, "0")}`,
      capability,
    );
  });
  return values;
}

function evidenceValues(
  context: ContextV2,
  simulationFacts: readonly unknown[],
): ReadonlyMap<string, TrackCSelectedEvidence> {
  const values = new Map<string, TrackCSelectedEvidence>();
  context.verifiedClaims.forEach((claim, index) => {
    const capability = capabilityForClaim(claim.type);
    if (capability !== null) values.set(`CLAIM_${String(index + 1).padStart(3, "0")}`, {
      ref: `CLAIM_${String(index + 1).padStart(3, "0")}`,
      capability,
      value: claim.value,
      simulationFact: null,
    });
  });
  if (context.productAttributes !== null && context.productAttributes !== undefined) {
    values.set("PRODUCT_ATTRIBUTES_001", {
      ref: "PRODUCT_ATTRIBUTES_001",
      capability: "PRODUCT_ATTRIBUTES",
      value: {
        materials: context.productAttributes.materials,
        materialComponents: context.productAttributes.materialComponents,
        colors: context.productAttributes.colors,
        styles: context.productAttributes.styles,
        silhouettes: context.productAttributes.silhouettes,
        occasions: context.productAttributes.occasions,
        designAttributes: context.productAttributes.designAttributes,
        careInstructions: context.productAttributes.careInstructions,
        wearProperties: context.productAttributes.wearProperties,
        backCoverage: context.productAttributes.backCoverage,
        designComplexity: context.productAttributes.designComplexity,
      },
      simulationFact: null,
    });
  }
  if (context.productPresentation !== null && context.productPresentation !== undefined) {
    for (const claim of candidateProductPresentationClaims(context.productPresentation)) {
      values.set(claim.claimRef, {
        ref: claim.claimRef,
        capability: "PRODUCT_PRESENTATION",
        value: claim.placeholders,
        simulationFact: null,
      });
    }
  }
  simulationFacts.forEach((fact, index) => {
    const capability = simulationCapability(fact);
    if (capability !== null) {
      const ref = `SIMULATION_${String(index + 1).padStart(3, "0")}`;
      values.set(ref, { ref, capability, value: fact, simulationFact: fact });
    }
  });
  return values;
}

function materializedEvidenceText(evidence: TrackCSelectedEvidence): string {
  if (evidence.capability === "PRICE" && evidence.value !== null &&
      typeof evidence.value === "object" && !Array.isArray(evidence.value)) {
    const value = evidence.value as Readonly<Record<string, unknown>>;
    if (typeof value.amountVnd === "number" && typeof value.currency === "string") {
      return `Giá hiện tại là ${new Intl.NumberFormat("vi-VN").format(value.amountVnd)} ${value.currency} ạ.`;
    }
  }
  if (evidence.capability === "PRODUCT_PRESENTATION" && evidence.value !== null &&
      typeof evidence.value === "object" && !Array.isArray(evidence.value)) {
    const value = evidence.value as Readonly<Record<string, unknown>>;
    const displayName = value.DISPLAY_NAME;
    const color = value.VARIANT_COLOR;
    const size = value.VARIANT_SIZE;
    if (typeof displayName === "string" && typeof color === "string" &&
        typeof size === "string") {
      return `Dạ ${displayName} có phiên bản màu ${color}, size ${size} ạ.`;
    }
    if (typeof displayName === "string") return `Dạ tên mẫu là ${displayName} ạ.`;
  }
  if (evidence.capability === "PRODUCT_ATTRIBUTES" && evidence.value !== null &&
      typeof evidence.value === "object" && !Array.isArray(evidence.value)) {
    const value = evidence.value as Readonly<Record<string, unknown>>;
    const materials = value.materials;
    if (Array.isArray(materials) && materials.every((material) => typeof material === "string") &&
        materials.length > 0) {
      return `Dạ mẫu có chất liệu ${materials.join(", ")} ạ.`;
    }
  }
  return `Thông tin đã xác minh: ${canonicalJsonV1(evidence.value)}.`;
}

function selectedEvidence(
  allEvidence: ReadonlyMap<string, TrackCSelectedEvidence>,
  refs: readonly string[],
): readonly TrackCSelectedEvidence[] {
  return Object.freeze(refs.map((ref) => {
    const evidence = allEvidence.get(ref);
    if (evidence === undefined) throw new Error("TRACK_C_SELECTED_EVIDENCE_INVALID");
    return evidence;
  }));
}

function canonicalConstraints(
  context: ContextV2,
  metadata: readonly TrackCV5SimulationMetadata[],
): Readonly<{
  permitted: readonly TrackCCanonicalAction[];
  checkoutRequestedFields: readonly ("FULL_NAME" | "PHONE" | "ADDRESS")[];
}> {
  const permitted: TrackCCanonicalAction[] = ["NONE"];
  if (context.productBinding.status !== "RESOLVED" ||
      context.barriers.active.includes("PRODUCT_CONTEXT_UNREADY")) {
    permitted.push("ASK_PRODUCT");
  }
  if (context.barriers.active.includes("MEASUREMENTS_REQUIRED")) {
    permitted.push("ASK_MEASUREMENTS");
  }
  const checkout = metadata.find((entry) =>
    entry.kind === "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1" &&
    entry.state === "REQUIRED"
  );
  const checkoutRequestedFields = checkout?.kind ===
      "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1"
    ? checkout.missingFields
    : [];
  if (checkoutRequestedFields.length > 0) permitted.push("ASK_CHECKOUT_DETAILS");
  if (context.phase.phase === "ORDER_CONFIRMED" ||
      context.phase.sourceStage === "PURCHASE_CONFIRMED") {
    permitted.push("HOLD_POSITION");
  }
  return Object.freeze({
    permitted: Object.freeze(permitted),
    checkoutRequestedFields: Object.freeze([...checkoutRequestedFields]),
  });
}

function measurementsUnavailable(
  dialogue: readonly ShadowContextMessage[],
): boolean {
  return dialogue.some((message) => message.direction === "INBOUND" &&
    /(?:không|chưa)\s+(?:có|biết|đo(?:\s+được)?)\s+(?:số\s*đo|chiều\s*cao|cân\s*nặng)/iu
      .test(message.text.normalize("NFC")));
}

function withSchema(
  request: BuiltCandidateRequest,
  responseSchema: unknown,
  promptPatch: Readonly<Record<string, unknown>>,
  omittedPromptKeys: readonly string[] = [],
): BuiltCandidateRequest {
  const body = JSON.parse(request.body) as {
    contents: readonly [{ parts: readonly [{ text: string }] }];
    generationConfig: Readonly<Record<string, unknown>>;
    readonly [key: string]: unknown;
  };
  const prompt = JSON.parse(body.contents[0].parts[0].text) as Record<string, unknown>;
  const candidateBody = JSON.stringify({
    ...body,
    contents: [{ ...body.contents[0], parts: [{
      text: canonicalJsonV1({
        ...Object.fromEntries(Object.entries(prompt).filter(([key]) =>
          !omittedPromptKeys.includes(key)
        )),
        ...promptPatch,
      }),
    }] }],
    generationConfig: { ...body.generationConfig, responseSchema },
  });
  return Object.freeze({
    url: request.url,
    body: candidateBody,
    identity: deriveCandidateRequestIdentity({ url: request.url, body: candidateBody }),
  });
}

function strategistRequest(input: Readonly<{
  modelResource: string;
  capture: unknown;
  evaluationAt: Date;
  evaluationContext: readonly ShadowContextMessage[];
  capabilities: ReadonlyMap<string, TrackCProtectedProposition>;
  constraints: ReturnType<typeof canonicalConstraints>;
  measurementsUnavailable: boolean;
}>): BuiltCandidateRequest {
  const base = buildTrackCOfflineCandidateRequest({ ...input, systemInstruction: STRATEGIST_INSTRUCTION });
  return withSchema(base, {
    type: "OBJECT",
    required: ["replyAct", "goal", "proposition", "evidenceRefs", "continuation", "canonicalAction"],
    properties: {
      replyAct: { type: "STRING", enum: ["ANSWER", "ACKNOWLEDGE", "CLARIFY"] },
      goal: { type: "STRING" },
      proposition: { type: "STRING" },
      evidenceRefs: { type: "ARRAY", items: { type: "STRING", enum: [...input.capabilities.keys()] } },
      continuation: { nullable: true },
      canonicalAction: { type: "STRING", enum: input.constraints.permitted },
    },
  }, {
    strategistConstraints: {
      evidenceCapabilities: Object.fromEntries(input.capabilities),
      permittedCanonicalActions: input.constraints.permitted,
      measurementsUnavailable: input.measurementsUnavailable,
    },
  });
}

function responderRequest(input: Readonly<{
  modelResource: string;
  capture: unknown;
  evaluationAt: Date;
  evaluationContext: readonly ShadowContextMessage[];
  task: TrackCResponderTask;
  evidence: readonly TrackCSelectedEvidence[];
}>): BuiltCandidateRequest {
  const base = buildTrackCOfflineCandidateRequest({ ...input, systemInstruction: RESPONDER_INSTRUCTION });
  const body = JSON.parse(base.body) as {
    generationConfig: { responseSchema: { properties: { segments: {
      items: { properties: Record<string, unknown>; required?: readonly string[] };
    } } } };
  };
  const item = body.generationConfig.responseSchema.properties.segments.items;
  const responseSchema = {
    ...body.generationConfig.responseSchema,
    properties: {
      ...body.generationConfig.responseSchema.properties,
      segments: {
        ...body.generationConfig.responseSchema.properties.segments,
        items: {
          ...item,
          required: [...(item.required ?? []), "role", "decisionInput"],
          properties: {
            ...item.properties,
            role: { type: "STRING", enum: ["ANSWER", "PROGRESSION", "CANONICAL"] },
            decisionInput: { type: "STRING", enum: ["NONE", ...ORDINARY_INPUTS] },
          },
        },
      },
    },
  };
  return withSchema(base, responseSchema, {
    responderTask: input.task,
    selectedEvidence: input.evidence.map((evidence) => Object.freeze({
      ref: evidence.ref,
      capability: evidence.capability,
      value: evidence.value,
    })),
  }, [
    "verifiedClaims",
    "productAttributes",
    "productPresentation",
    "dialogueEvidence",
    "phase",
    "barriers",
    "buyingIntent",
    "cartReadiness",
    "ownership",
  ]);
}

function metadataFreeOutput(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const output = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(output.segments)) return output;
  return Object.freeze({
    ...output,
    segments: Object.freeze(output.segments.map((segment) => {
      if (segment === null || typeof segment !== "object" || Array.isArray(segment)) return segment;
      const { role: _role, decisionInput: _decisionInput, ...rest } =
        segment as Readonly<Record<string, unknown>>;
      return Object.freeze(rest);
    })),
  });
}

function expectedResponderStrategy(task: TrackCResponderTask): string {
  if (task.canonicalRequest?.type === "HOLD_POSITION") {
    return "HOLD_POSITION";
  }
  if (task.canonicalRequest !== null || task.continuation?.type === "ASK" ||
      task.answer.kind === "CLARIFY") {
    return "ASK_CLARIFICATION";
  }
  if (task.answer.kind === "ACKNOWLEDGE") return "HOLD_POSITION";
  return "ANSWER_VERIFIED_FACTS";
}

function assertResponderTask(output: unknown, task: TrackCResponderTask): void {
  const record = output as Readonly<Record<string, unknown>>;
  if (record === null || typeof record !== "object" || Array.isArray(record) ||
      !Array.isArray(record.segments) || typeof record.strategy !== "string" ||
      typeof record.cta !== "string") throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  const segments = record.segments.map((segment) => segment as Readonly<Record<string, unknown>>);
  if (segments.some((segment) => segment === null || typeof segment !== "object" ||
      !["ANSWER", "PROGRESSION", "CANONICAL"].includes(segment.role as string) ||
      typeof segment.decisionInput !== "string")) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  if (segments.some((segment) => segment.kind === "EFFECT_CLAIM")) {
    throw new Error("TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN");
  }
  const answerSegments = segments.filter((segment) => segment.role === "ANSWER");
  const progressionSegments = segments.filter((segment) => segment.role === "PROGRESSION");
  const canonicalSegments = segments.filter((segment) => segment.role === "CANONICAL");
  if (record.strategy !== expectedResponderStrategy(task)) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  if (task.answer.kind === "ANSWER" && answerSegments.length === 0 ||
      task.answer.kind !== "ANSWER" && answerSegments.some((segment) =>
        segment.kind === "VERIFIED_CLAIM")) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  if (task.answer.status === "SUPPORTED" &&
      !answerSegments.some((segment) => segment.kind === "VERIFIED_CLAIM") ||
      task.answer.status !== "SUPPORTED" &&
      answerSegments.some((segment) => segment.kind === "VERIFIED_CLAIM")) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  if (task.answer.status === "SUPPORTED" &&
      answerSegments.some((segment) => segment.kind !== "VERIFIED_CLAIM")) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  const realizedRefs = new Set(answerSegments.flatMap((segment) =>
    segment.kind === "VERIFIED_CLAIM" && typeof segment.claimRef === "string"
      ? [segment.claimRef]
      : []
  ));
  if (task.requiredEvidenceRefs.some((ref) => !realizedRefs.has(ref))) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  if (task.continuation?.type === "ASK") {
    if (progressionSegments.length !== 1 || canonicalSegments.length !== 0 ||
        progressionSegments[0]?.decisionInput !== task.continuation.input ||
        record.cta !== "NONE") throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
    return;
  }
  if (task.continuation?.type === "KEEP_OPEN") {
    if (progressionSegments.length !== 1 || canonicalSegments.length !== 0 ||
        progressionSegments[0]?.kind !== "GENERAL" ||
        progressionSegments[0]?.decisionInput !== "NONE" ||
        record.cta !== "NONE") throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
    return;
  }
  if (progressionSegments.length !== 0 || canonicalSegments.length === 0) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  const type = task.canonicalRequest?.type;
  const expected = type === "ASK_PRODUCT"
    ? ["PRODUCT", "PROVIDE_PRODUCT", "ASK_PRODUCT"]
    : type === "ASK_MEASUREMENTS"
      ? ["MEASUREMENTS", "PROVIDE_MEASUREMENTS", "ASK_MEASUREMENTS"]
      : type === "ASK_CHECKOUT_DETAILS"
        ? ["CHECKOUT_DETAILS", "PROVIDE_CHECKOUT_DETAILS", "ASK_CHECKOUT_DETAILS"]
        : null;
  if (expected !== null) {
    if (record.strategy !== "ASK_CLARIFICATION" || record.cta !== expected[2] ||
        canonicalSegments.length !== 2 ||
        canonicalSegments.filter((segment) =>
          segment.kind === "CLARIFICATION" && segment.target === expected[0]
        ).length !== 1 ||
        canonicalSegments.filter((segment) =>
          segment.kind === "ACTION_REQUEST" && segment.action === expected[1]
        ).length !== 1) {
      throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
    }
    return;
  }
  if (type !== "HOLD_POSITION" || canonicalSegments.length !== 0 ||
      record.strategy !== "HOLD_POSITION" ||
      record.cta !== "NONE" || segments.some((segment) =>
        segment.kind === "CLARIFICATION" || segment.kind === "ACTION_REQUEST" ||
        (typeof segment.text === "string" && segment.text.includes("?")))) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
}

function assertNoUndeclaredCheckoutPii(
  output: ContextV2CandidateOutputV2,
  task: TrackCResponderTask,
): void {
  if (task.canonicalRequest?.type === "ASK_CHECKOUT_DETAILS") return;
  const pii = /(?:họ\s*(?:và\s*)?tên|số\s*điện\s*thoại|\bsđt\b|\bsdt\b|địa\s*chỉ\s*(?:nhận|giao)\s*hàng|recipient\s+name|phone\s+number|delivery\s+address)/iu;
  if (output.segments.some(({ text }) => pii.test(text.normalize("NFC")))) {
    throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  }
}

function materializeSelectedFactualText(
  raw: unknown,
  resolved: unknown,
  evidence: readonly TrackCSelectedEvidence[],
): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw) ||
      resolved === null || typeof resolved !== "object" || Array.isArray(resolved)) {
    throw new Error("TRACK_C_SELECTED_EVIDENCE_INVALID");
  }
  const rawSegments = (raw as Readonly<Record<string, unknown>>).segments;
  const resolvedSegments = (resolved as Readonly<Record<string, unknown>>).segments;
  if (!Array.isArray(rawSegments) || !Array.isArray(resolvedSegments) ||
      rawSegments.length !== resolvedSegments.length) {
    throw new Error("TRACK_C_SELECTED_EVIDENCE_INVALID");
  }
  const byRef = new Map(evidence.map((entry) => [entry.ref, entry]));
  return Object.freeze({
    ...(resolved as Readonly<Record<string, unknown>>),
    segments: Object.freeze(resolvedSegments.map((segment, index) => {
      const rawSegment = rawSegments[index];
      if (segment === null || typeof segment !== "object" || Array.isArray(segment) ||
          rawSegment === null || typeof rawSegment !== "object" || Array.isArray(rawSegment)) {
        throw new Error("TRACK_C_SELECTED_EVIDENCE_INVALID");
      }
      const rawRecord = rawSegment as Readonly<Record<string, unknown>>;
      if (rawRecord.kind !== "VERIFIED_CLAIM") return segment;
      const selected = typeof rawRecord.claimRef === "string"
        ? byRef.get(rawRecord.claimRef)
        : undefined;
      if (selected === undefined) throw new Error("TRACK_C_SELECTED_EVIDENCE_INVALID");
      return Object.freeze({
        ...(segment as Readonly<Record<string, unknown>>),
        text: materializedEvidenceText(selected),
      });
    })),
  });
}

function replyForTask(
  output: ContextV2CandidateOutputV2,
  task: TrackCResponderTask,
): string {
  if (task.canonicalRequest?.type !== "ASK_CHECKOUT_DETAILS") {
    return output.segments.map(({ text }) => text).join("\n");
  }
  const names: Record<"FULL_NAME" | "PHONE" | "ADDRESS", string> = {
    FULL_NAME: "họ tên",
    PHONE: "số điện thoại",
    ADDRESS: "địa chỉ nhận hàng",
  };
  const fields = task.canonicalRequest.requestedFields ?? [];
  const joined = fields.length === 1
    ? names[fields[0]!]
    : fields.length === 2
      ? `${names[fields[0]!]} và ${names[fields[1]!]}`
      : `${fields.slice(0, -1).map((field) => names[field]).join(", ")} và ${names[fields.at(-1)!]}`;
  return `Em cần thêm thông tin nhận hàng còn thiếu để tiếp tục ạ. Chị cho em xin ${joined} nhé.`;
}

function fixedTask(context: ContextV2): TrackCResponderTask {
  const priceIndex = context.verifiedClaims.findIndex((claim) => claim.type === "PRICE");
  const presentation = context.productPresentation;
  const productEvidenceRefs = presentation === null || presentation === undefined
    ? context.productAttributes === null || context.productAttributes === undefined
      ? []
      : ["PRODUCT_ATTRIBUTES_001"]
    : candidateProductPresentationClaims(presentation).slice(0, 1).map(({ claimRef }) => claimRef);
  const colors = presentation?.variants.flatMap((variant) => variant.color === null ? [] : [variant.color]) ?? [];
  const classificationOrVariantRequired = context.productBinding.status !== "RESOLVED" ||
    context.productBinding.productIds.length !== 1 ||
    context.barriers.active.includes("PRODUCT_CONTEXT_UNREADY");
  const authorizedSellingPointRef = context.productAttributes !== null &&
      context.productAttributes !== undefined &&
      (context.productAttributes.materials.length > 0 ||
       Object.values(context.productAttributes.wearProperties ?? {}).some(Boolean) ||
       context.productAttributes.styles.length > 0)
    ? "PRODUCT_ATTRIBUTES_001"
    : null;
  return compileTrackCFixedFirstContactTask({
    productResolved: context.productBinding.status === "RESOLVED",
    classificationOrVariantRequired,
    colorChoiceMeaningful: new Set(colors).size > 1,
    priceEvidenceRef: priceIndex === -1 ? null : `CLAIM_${String(priceIndex + 1).padStart(3, "0")}`,
    productEvidenceRefs,
    authorizedSellingPointRef,
  });
}

export async function runTrackCStrategyContractBenchmarkCase(input: Readonly<{
  input: TrackCV5TwoPassBenchmarkInput;
  context: ContextV2;
  simulationFacts: readonly unknown[];
  simulationMetadata: readonly TrackCV5SimulationMetadata[];
}>): Promise<TrackCV5TwoPassBenchmarkResult> {
  const lane = selectTrackCConversationLane(input.simulationMetadata);
  const allEvidence = evidenceValues(input.context, input.simulationFacts);
  const capabilities = new Map([
    ...evidenceCapabilities(input.context),
    ...simulationEvidenceCapabilities(input.simulationFacts),
  ]);
  const constraints = canonicalConstraints(input.context, input.simulationMetadata);
  const common = {
    modelResource: input.input.modelResource,
    capture: input.input.capture,
    evaluationAt: input.input.evaluationAt,
    evaluationContext: input.input.evaluationContext,
  };
  let strategistHash: string | null = null;
  let artifact: TrackCResponderTask | TrackCStrategistDecision;
  let task: TrackCResponderTask;
  if (lane === "FIRST_CONTACT_FIXED") {
    task = fixedTask(input.context);
    artifact = task;
  } else {
    const request = withBenchmarkLane(strategistRequest({
      ...common,
      capabilities,
      constraints,
      measurementsUnavailable: measurementsUnavailable(common.evaluationContext),
    }), input.input.lane, input.simulationFacts, input.simulationMetadata);
    const response = await input.input.transport.send({
      url: request.url,
      body: request.body,
      ...(input.input.signal === undefined ? {} : { signal: input.input.signal }),
    });
    if (response.providerModelVersion !== "gemini-3.5-flash-lite") {
      throw new Error("TRACK_C_V5_PROVIDER_IDENTITY_MISMATCH");
    }
    const decision = providerJson(response.payload, "TRACK_C_STRATEGIST_OUTPUT_INVALID");
    task = compileTrackCStrategistDecision({
      decision,
      evidenceCapabilities: capabilities,
      permittedCanonicalActions: constraints.permitted,
      measurementsUnavailable: measurementsUnavailable(common.evaluationContext),
      checkoutRequestedFields: constraints.checkoutRequestedFields,
    });
    strategistHash = request.identity.requestEnvelopeHash;
    artifact = decision as TrackCStrategistDecision;
  }
  const selected = selectedEvidence(allEvidence, task.evidenceRefs);
  const request = withBenchmarkLane(responderRequest({ ...common, task, evidence: selected }), input.input.lane,
    selected.flatMap((evidence) => evidence.simulationFact === null ? [] : [evidence.simulationFact]),
    input.simulationMetadata);
  const response = await input.input.transport.send({
    url: request.url,
    body: request.body,
    ...(input.input.signal === undefined ? {} : { signal: input.input.signal }),
  });
  if (response.providerModelVersion !== "gemini-3.5-flash-lite") {
    throw new Error("TRACK_C_V5_PROVIDER_IDENTITY_MISMATCH");
  }
  const selectedRegistry = new Map([
    ...buildTrackCClaimReferenceRegistry(input.context),
    ...buildTrackCSimulationFactReferenceRegistry(input.simulationFacts),
  ]
    .filter(([ref]) => task.evidenceRefs.includes(ref)));
  const selectedSimulationHashes = selected.flatMap((evidence) => {
    if (evidence.simulationFact === null) return [];
    const entry = selectedRegistry.get(evidence.ref);
    if (entry === undefined) throw new Error("TRACK_C_SELECTED_EVIDENCE_INVALID");
    return [entry.contentHash];
  });
  const raw = providerJson(response.payload, "TRACK_C_V5_RESPONDER_OUTPUT_INVALID");
  assertResponderTask(raw, task);
  const resolved = resolveTrackCCandidateClaimReferences(raw, selectedRegistry, {
    invalid: "TRACK_C_V5_CLAIM_REFERENCE_INVALID",
    unknown: "TRACK_C_V5_CLAIM_REFERENCE_UNKNOWN",
    duplicate: "TRACK_C_V5_CLAIM_REFERENCE_DUPLICATE",
    textMismatch: "TRACK_C_V5_CLAIM_REFERENCE_TEXT_MISMATCH",
  });
  const output = validateResponderOutput(input.context, metadataFreeOutput(
    materializeSelectedFactualText(raw, resolved, selected),
  ), input.input.lane, input.input.evaluationAt, selectedSimulationHashes) as
    ContextV2CandidateOutputV2;
  assertNoUndeclaredCheckoutPii(output, task);
  const reply = replyForTask(output, task);
  const identity = Object.freeze({
    captureContextHash: input.context.contextHash,
    strategistRequestEnvelopeHash: strategistHash,
    conversationPlanHash: sha256(artifact),
    responderRequestEnvelopeHash: request.identity.requestEnvelopeHash,
    responseOutputHash: sha256(output),
    compositionHash: sha256({ lane, strategistHash, task, output }),
  });
  return Object.freeze({
    contractVersion: "TRACK_C_V5_TWO_PASS_BENCHMARK_RESULT_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    executionLane: input.input.lane,
    conversationLane: lane,
    conversationPlan: artifact,
    output,
    reply,
    identity,
  });
}
