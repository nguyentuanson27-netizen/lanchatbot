import {
  assertTrackCRequestedObligationCoverage,
  trackCObligationMatchesEvidence,
} from "./track-c-c3-conversational-guard.js";
import {
  MeasurementKindSchema,
  type MeasurementKind,
  type RealtimeCustomerObligationV1,
} from "@lana/contracts";
import { redactAnalyticsMessage } from "@lana/database";
import { trackCResolveObligations, type TrackCObligationResolution } from "./track-c-c3-obligation-resolution.js";

export type TrackCConversationLane =
  | "FIRST_CONTACT_FIXED"
  | "ADAPTIVE_FOLLOWUP";

export type TrackCOrdinaryDecisionInput =
  | "SIZE"
  | "USUAL_SIZE"
  | "COLOR"
  | "VARIANT"
  | "LOCALITY"
  | "PAYMENT_PREFERENCE"
  | "QUANTITY"
  | "STYLE"
  | "BUDGET"
  | "DECISION_CRITERION"
  | "DEADLINE";

export type TrackCCanonicalAction =
  | "NONE"
  | "ASK_PRODUCT"
  | "ASK_MEASUREMENTS"
  | "ASK_CHECKOUT_DETAILS"
  | "HOLD_POSITION";

export const TRACK_C_PROTECTED_PROPOSITIONS = Object.freeze([
  "NONE",
  "PRICE",
  "STOCK",
  "SIZE_FIT",
  "ETA",
  "SHIPPING_FEE",
  "FREESHIP",
  "PROMOTION_OFFER",
  "PRODUCT_MEDIA",
  "PRODUCT_ATTRIBUTES",
  "PRODUCT_PRESENTATION",
  "POLICY",
  "CARE_GUIDANCE",
  "OFFER_CONFIGURATION",
  "BUSINESS_LOCATION",
  "FULFILLMENT_STATUS",
  "CART_TOTAL",
  "PRODUCT_LIFECYCLE",
  "PRODUCT_COMPARISON",
] as const);
export type TrackCProtectedProposition =
  typeof TRACK_C_PROTECTED_PROPOSITIONS[number];

export type TrackCRequestedObligation = Readonly<Pick<
  RealtimeCustomerObligationV1,
  "kind" | "capability" | "scope" | "productId"
> & {
  /** Assigned by customer-input code, never by Strategist or Responder. */
  id?: string;
  /** Source-bound lookup subject, independent of a selected commerce variant. */
  variantId?: string;
  size?: string;
  color?: string;
  lookupStatus?: "FAILED" | "STALE";
}>;

/**
 * Mirrors the runtime `missingCheckout` field set. PAYMENT_METHOD was missing
 * here, so a cart that only lacked a payment choice could not be asked for
 * through the canonical request and had to fall back to free wording.
 */
export type TrackCCheckoutField =
  | "FULL_NAME"
  | "PHONE"
  | "ADDRESS"
  | "PAYMENT_METHOD";

export type TrackCSelectableEvidence = Readonly<{
  ref: string;
  capability: TrackCProtectedProposition;
  /**
   * The evidence subject keeps the scope it was produced under. Collapsing
   * every scope to an optional productId dropped cart identity and version,
   * so cart-scoped facts could not be revalidated before egress.
   */
  subject?: Readonly<{
    scope?: "PRODUCT" | "VARIANT" | "OFFER" | "CART" | "SHOP";
    productId?: string;
    variantId?: string;
    displayName?: string;
    /** Customer-facing variant label from the authoritative presentation. */
    variantLabel?: Readonly<{ color?: string; size?: string }>;
    offerId?: string;
    cartId?: string;
    cartVersion?: number;
    shopId?: string;
  }>;
  value: Readonly<Record<string, unknown>>;
  /**
   * Optional code-owned customer-facing projection. It must already be safe,
   * natural reply copy; value remains the factual authority/reasoning data.
   */
  deterministicText?: string;
  provenance: Readonly<{
    contentHash: string;
    authority: "RUNTIME" | "SIMULATION";
  }>;
}>;

const TRACK_C_CUSTOMER_SIZE_VALUES = new Set([
  "XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL",
  ...Array.from({ length: 17 }, (_, index) => String(index + 34)),
]);

export function trackCCustomerFacingSizeFromVariantId(
  variantId: string | null,
): string | null {
  if (variantId === null) return null;
  const match = /^SIZE_([A-Z0-9]+)$/iu.exec(variantId);
  if (match?.[1] === undefined) return null;
  const size = match[1].toLocaleUpperCase("vi-VN");
  return TRACK_C_CUSTOMER_SIZE_VALUES.has(size) ? size : null;
}

export function trackCEvidenceHasSafeFactualEgress(
  evidence: TrackCSelectableEvidence,
): boolean {
  // Realization support is separate from the validity of an evidence entry.
  return evidence.deterministicText !== undefined;
}

/**
 * Split a selection into the part that can be stated and the part that has
 * authority but no safe wording yet.
 *
 * Rejecting the whole turn when any selected entry lacked a projection threw
 * away the parts that were answerable, so a question the catalog could half
 * answer produced nothing. The unrealizable part is returned rather than
 * dropped: the task carries it so the reply can name what it cannot cover.
 */
export function trackCPartitionEvidenceRealization(
  evidence: readonly TrackCSelectableEvidence[],
): Readonly<{
  realizable: readonly TrackCSelectableEvidence[];
  unrealizable: readonly TrackCSelectableEvidence[];
}> {
  return Object.freeze({
    realizable: Object.freeze(
      evidence.filter((entry) => trackCEvidenceHasSafeFactualEgress(entry)),
    ),
    unrealizable: Object.freeze(
      evidence.filter((entry) => !trackCEvidenceHasSafeFactualEgress(entry)),
    ),
  });
}

export type TrackCStrategistDecision = Readonly<{
  replyAct: "ANSWER" | "ACKNOWLEDGE" | "CLARIFY";
  goal: string;
  proposition: TrackCProtectedProposition;
  evidenceRefs: readonly string[];
  continuation:
    | Readonly<{ type: "ASK"; input: TrackCOrdinaryDecisionInput }>
    | Readonly<{ type: "KEEP_OPEN" }>
    | null;
  canonicalAction: TrackCCanonicalAction;
}>;

/** Structured semantic instructions, never commercial evidence or action authority. */
export type TrackCSemanticHandoff = Readonly<{
  need: string;
  known: string | null;
  answer: string | null;
  limit: string | null;
  next: string | null;
}>;

export type TrackCResponderTask = Readonly<{
  semanticHandoff?: TrackCSemanticHandoff;
  requestedObligations?: readonly TrackCRequestedObligation[];
  obligationResolutions?: readonly TrackCObligationResolution[];
  answer:
    | Readonly<{
        kind: "ANSWER";
        /** Capability authority only; not semantic question resolution. */
        evidenceStatus: "SUPPORTED" | "UNRESOLVED" | "NOT_APPLICABLE";
        goal: string;
        proposition: TrackCProtectedProposition;
      }>
    | Readonly<{ kind: "ACKNOWLEDGE" | "CLARIFY"; goal: string }>;
  evidence: readonly TrackCSelectableEvidence[];
  requiredEvidenceRefs: readonly string[];
  /**
   * Selected evidence that holds authority but has no safe projection yet.
   * It is reported rather than dropped so the reply states the limit instead
   * of implying the question was fully covered.
   */
  unrealizedEvidence: readonly Readonly<{
    ref: string;
    capability: TrackCProtectedProposition;
  }>[];
  continuation:
    | Readonly<{ type: "ASK"; input: TrackCOrdinaryDecisionInput }>
    | Readonly<{ type: "KEEP_OPEN" }>
    | null;
  canonicalRequest:
    | Readonly<{
      type: Exclude<TrackCCanonicalAction, "NONE">;
      requestedFields?: readonly TrackCCheckoutField[];
      measurementFields?: readonly MeasurementKind[];
    }>
    | null;
  /** Code-derived before the Responder; never inferred from dialogue. */
  deliveryDeadlineText?: string;
}>;

export type TrackCTrustedAcquisitionMetadata = Readonly<{
  kind: "TRACK_C_TRUSTED_ACQUISITION_V1";
  origin: "ADVERTISEMENT";
  firstMeaningfulInbound: boolean;
  authorization: "NONE";
}>;

const ORDINARY_INPUTS = new Set<TrackCOrdinaryDecisionInput>([
  "SIZE", "USUAL_SIZE", "COLOR", "VARIANT", "LOCALITY",
  "PAYMENT_PREFERENCE", "QUANTITY", "STYLE", "BUDGET",
  "DECISION_CRITERION", "DEADLINE",
]);
const CANONICAL_ACTIONS = new Set<TrackCCanonicalAction>([
  "NONE", "ASK_PRODUCT", "ASK_MEASUREMENTS", "ASK_CHECKOUT_DETAILS",
  "HOLD_POSITION",
]);

function exactKeys(record: Readonly<Record<string, unknown>>, keys: string[]): void {
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys.sort())) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
}

function plainObject(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  return value as Readonly<Record<string, unknown>>;
}

export function isTrackCTrustedAcquisitionMetadata(
  value: unknown,
): value is TrackCTrustedAcquisitionMetadata {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return record.kind === "TRACK_C_TRUSTED_ACQUISITION_V1" &&
    record.origin === "ADVERTISEMENT" &&
    record.firstMeaningfulInbound === true &&
    record.authorization === "NONE" && Object.keys(record).length === 4;
}

/** Trusted acquisition is a metadata seam; dialogue is deliberately absent. */
export function selectTrackCConversationLane(
  metadata: readonly unknown[],
): TrackCConversationLane {
  return metadata.some(isTrackCTrustedAcquisitionMetadata)
    ? "FIRST_CONTACT_FIXED"
    : "ADAPTIVE_FOLLOWUP";
}

function continuation(value: unknown): TrackCStrategistDecision["continuation"] {
  if (value === null) return null;
  const record = plainObject(value);
  if (record.type === "KEEP_OPEN") {
    exactKeys(record, ["type"]);
    return Object.freeze({ type: "KEEP_OPEN" });
  }
  if (record.type !== "ASK" || typeof record.input !== "string" ||
      !ORDINARY_INPUTS.has(record.input as TrackCOrdinaryDecisionInput)) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  exactKeys(record, ["input", "type"]);
  return Object.freeze({
    type: "ASK",
    input: record.input as TrackCOrdinaryDecisionInput,
  });
}

function safeGoal(value: unknown): string {
  if (typeof value !== "string" || value !== value.trim() ||
      value.length === 0 || value.length > 500) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  const redacted = redactAnalyticsMessage(value);
  if (redacted.dlpStatus !== "PASSED") {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  return redacted.text;
}

function readDecision(value: unknown): TrackCStrategistDecision {
  const record = plainObject(value);
  exactKeys(record, [
    "canonicalAction", "continuation", "evidenceRefs", "goal", "proposition",
    "replyAct",
  ]);
  if ((record.replyAct !== "ANSWER" && record.replyAct !== "ACKNOWLEDGE" &&
       record.replyAct !== "CLARIFY") ||
      typeof record.proposition !== "string" ||
      !TRACK_C_PROTECTED_PROPOSITIONS.includes(
        record.proposition as TrackCProtectedProposition,
      ) ||
      !Array.isArray(record.evidenceRefs) ||
      record.evidenceRefs.some((ref) => typeof ref !== "string" || !ref) ||
      typeof record.canonicalAction !== "string" ||
      !CANONICAL_ACTIONS.has(record.canonicalAction as TrackCCanonicalAction)) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  return Object.freeze({
    replyAct: record.replyAct,
    goal: safeGoal(record.goal),
    proposition: record.proposition as TrackCProtectedProposition,
    evidenceRefs: Object.freeze([...record.evidenceRefs] as string[]),
    continuation: continuation(record.continuation),
    canonicalAction: record.canonicalAction as TrackCCanonicalAction,
  });
}

/** Canonical field names only; neither dialogue nor model goal selects them. */
export function validatedTrackCMeasurementFields(
  fields: readonly MeasurementKind[] = ["HEIGHT_CM", "WEIGHT_KG"],
): readonly MeasurementKind[] {
  if (!Array.isArray(fields) || fields.length > 5 ||
      new Set(fields).size !== fields.length ||
      fields.some((field) => !MeasurementKindSchema.safeParse(field).success)) {
    throw new Error("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  }
  return Object.freeze([...fields]);
}

function canonicalRequest(
  action: TrackCCanonicalAction,
  requestedFields: readonly TrackCCheckoutField[],
  measurementFields?: readonly MeasurementKind[],
): TrackCResponderTask["canonicalRequest"] {
  if (action === "NONE") return null;
  if (action === "ASK_MEASUREMENTS") {
    const fields = validatedTrackCMeasurementFields(measurementFields);
    if (fields.length === 0) throw new Error("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
    return Object.freeze({ type: action, measurementFields: fields });
  }
  if (action === "ASK_CHECKOUT_DETAILS") {
    if (requestedFields.length === 0) {
      throw new Error("TRACK_C_CHECKOUT_FIELDS_UNRESOLVED");
    }
    return Object.freeze({
      type: action,
      requestedFields: Object.freeze([...requestedFields]),
    });
  }
  return Object.freeze({ type: action });
}

function selectedEvidence(
  refs: readonly string[],
  evidence: readonly TrackCSelectableEvidence[],
  boundProductIds: readonly string[],
): readonly TrackCSelectableEvidence[] {
  const available = new Map(evidence.map((entry) => [entry.ref, entry]));
  if (new Set(refs).size !== refs.length) {
    throw new Error("TRACK_C_STRATEGIST_EVIDENCE_INVALID");
  }
  const selected = refs.map((ref) => available.get(ref));
  if (selected.some((entry) => entry === undefined)) {
    throw new Error("TRACK_C_STRATEGIST_EVIDENCE_INVALID");
  }
  const values = selected as TrackCSelectableEvidence[];
  if (new Set(values.map(({ provenance }) => provenance.contentHash)).size !==
      values.length) {
    throw new Error("TRACK_C_EVIDENCE_PROVENANCE_DUPLICATE");
  }
  if (boundProductIds.length > 0 && values.some(({ subject }) =>
    subject?.productId !== undefined && !boundProductIds.includes(subject.productId)
  )) {
    throw new Error("TRACK_C_EVIDENCE_BINDING_INVALID");
  }
  // Realization is handled by the caller, which keeps the answerable part and
  // reports the rest. Integrity and scope violations above still reject.
  // A canonical product ID already identifies the subject when a display name
  // is unavailable. Rendering validates that label before egress; lack of a
  // display name must not discard otherwise bound multi-product facts.
  return Object.freeze(values);
}

export function compileTrackCStrategistDecision(input: Readonly<{
  decision: unknown;
  evidence: readonly TrackCSelectableEvidence[];
  permittedCanonicalActions: readonly TrackCCanonicalAction[];
  measurementsUnavailable: boolean;
  productResolved: boolean;
  hardStop: boolean;
  boundProductIds?: readonly string[];
  checkoutRequestedFields?: readonly TrackCCheckoutField[];
  budgetKnown?: boolean;
  measurementRequestedFields?: readonly MeasurementKind[];
  requestedObligations?: readonly TrackCRequestedObligation[];
  /** Include code-derived handoff at the model boundary; retain the legacy flag name for direct callers. */
  requireStructuredGoal?: boolean;
}>): Readonly<{ decision: TrackCStrategistDecision; task: TrackCResponderTask }> {
  let decision = readDecision(input.decision);
  const evidence = selectedEvidence(
    decision.evidenceRefs,
    input.evidence,
    input.boundProductIds ?? [],
  );
  if (!input.productResolved && evidence.some(({ subject }) =>
    subject?.productId !== undefined
  )) {
    throw new Error("TRACK_C_EVIDENCE_BINDING_INVALID");
  }
  if ((input.budgetKnown && decision.continuation?.type === "ASK" &&
       decision.continuation.input === "BUDGET") ||
      !input.permittedCanonicalActions.includes(decision.canonicalAction) ||
      (decision.canonicalAction === "NONE" && decision.continuation === null) ||
      (decision.canonicalAction !== "NONE" && decision.continuation !== null) ||
      (input.hardStop && decision.canonicalAction !== "HOLD_POSITION") ||
      (decision.canonicalAction === "HOLD_POSITION" &&
        (decision.replyAct !== "ACKNOWLEDGE" || decision.evidenceRefs.length !== 0)) ||
      (decision.continuation?.type === "ASK" &&
        decision.continuation.input === "USUAL_SIZE" &&
        !input.measurementsUnavailable)) {
    throw new Error("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  }
  if (input.requestedObligations !== undefined) {
    input = { ...input, requestedObligations: input.requestedObligations.map((entry) => ({ ...entry,
      productId: entry.productId ?? (entry.kind === "FACT_REQUEST" &&
        entry.capability !== "POLICY" && entry.capability !== "PROMOTION_OFFER" &&
        input.boundProductIds?.length === 1 ? input.boundProductIds[0]! : null),
    })) };
  }
  if (input.requestedObligations !== undefined) {
    const bound = input.boundProductIds ?? [];
    if (bound.length > 0 && input.requestedObligations.some((entry) =>
      entry.kind === "FACT_REQUEST" && entry.productId !== null &&
      !bound.some((productId) =>
        productId.normalize("NFC").toLocaleUpperCase("vi-VN") ===
        entry.productId!.normalize("NFC").toLocaleUpperCase("vi-VN")
      )
    )) {
      throw new Error("TRACK_C_REQUESTED_OBLIGATION_BINDING_INVALID");
    }
    assertTrackCRequestedObligationCoverage(
      input.requestedObligations,
      input.evidence,
      evidence,
    );
  }
  const { realizable, unrealizable } =
    trackCPartitionEvidenceRealization(evidence);
  // A capability counts as supported only when it can also be stated: holding
  // authority the reply cannot express does not answer the customer.
  const supportsProposition = decision.proposition !== "NONE" &&
    realizable.some(({ capability }) => capability === decision.proposition);
  const evidenceStatus = decision.proposition === "NONE"
    ? "NOT_APPLICABLE" as const
    : supportsProposition ? "SUPPORTED" as const : "UNRESOLVED" as const;
  // SIZE selects a purchase size. It cannot substitute for the canonical
  // measurement request while the declared fit question is still unresolved.
  if (decision.proposition === "SIZE_FIT" && !supportsProposition &&
      decision.continuation?.type === "ASK" && decision.continuation.input === "SIZE") {
    throw new Error("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  }
  // Planning is a control plane. Never carry provider-authored factual values
  // into the decision/task, even if the provider repeated an authorized fact.
  const facts = input.requestedObligations?.filter(({ kind }) => kind === "FACT_REQUEST") ?? [];
  const describe = (entry: TrackCRequestedObligation) =>
    [entry.capability ?? entry.kind, entry.scope].filter(Boolean).join("/");
  const unsupported = facts.filter((entry) =>
    !realizable.some((fact) => trackCObligationMatchesEvidence(entry, fact)));
  const semanticHandoff = input.requireStructuredGoal !== true ? undefined : Object.freeze({
    need: facts.length > 0 ? facts.map(describe).join("; ") : decision.replyAct,
    known: null,
    answer: realizable.length > 0 ? [...new Set(realizable.map(({ capability }) => capability))]
      .map((capability) => `${capability} supported`).join("; ") : null,
    limit: unsupported.length > 0 ? unsupported.map((entry) => `${describe(entry)} unsupported`).join("; ")
      : unrealizable.length > 0 ? [...new Set(unrealizable.map(({ capability }) => capability))]
          .map((capability) => `${capability} unrealized`).join("; ")
        : decision.replyAct === "ANSWER" && evidenceStatus === "UNRESOLVED" ? `${decision.proposition} unsupported` : null,
    next: decision.canonicalAction !== "NONE" && decision.canonicalAction !== "HOLD_POSITION"
      ? decision.canonicalAction : decision.continuation?.type === "ASK" ? decision.continuation.input : null,
  });
  const planningGoal = semanticHandoff === undefined
    ? `${decision.replyAct}: ${decision.proposition}; ${decision.canonicalAction}`
    : ["NEED", "KNOWN", "ANSWER", "LIMIT", "NEXT"].map((key) =>
      `${key}: ${semanticHandoff[key.toLowerCase() as keyof TrackCSemanticHandoff] ?? "NONE"}`).join("\n");
  decision = Object.freeze({ ...decision, goal: planningGoal });
  const answer: TrackCResponderTask["answer"] = decision.replyAct === "ANSWER"
    ? Object.freeze({
        kind: "ANSWER", evidenceStatus, goal: decision.goal,
        proposition: decision.proposition,
      })
    : Object.freeze({ kind: decision.replyAct, goal: decision.goal });
  const task: TrackCResponderTask = Object.freeze({
    ...(semanticHandoff === undefined ? {} : { semanticHandoff }),
    ...(input.requestedObligations === undefined ? {} : {
      obligationResolutions: trackCResolveObligations(input.requestedObligations, realizable,
        input.boundProductIds ?? []),
      requestedObligations: Object.freeze(input.requestedObligations.map((entry) =>
        Object.freeze({ ...entry })
      )),
    }),
    answer,
    evidence: realizable,
    requiredEvidenceRefs: Object.freeze(
      decision.replyAct === "ANSWER" && evidenceStatus === "SUPPORTED"
        ? realizable.map(({ ref }) => ref) : [],
    ),
    unrealizedEvidence: Object.freeze(unrealizable.map(({ ref, capability }) =>
      Object.freeze({ ref, capability })
    )),
    continuation: decision.continuation,
    canonicalRequest: canonicalRequest(
      decision.canonicalAction,
      input.checkoutRequestedFields ?? [],
      input.measurementRequestedFields,
    ),
  });
  // Return the validated, PII-safe decision used to compile this exact task.
  // Consumers must not reuse the provider's raw planning text for reporting.
  return Object.freeze({ decision, task });
}

export function compileTrackCFixedFirstContactTask(input: Readonly<{
  productResolved: boolean;
  classificationOrVariantRequired: boolean;
  colorChoiceMeaningful: boolean;
  missingMeasurements?: readonly ("HEIGHT_CM" | "WEIGHT_KG")[];
  evidence: readonly TrackCSelectableEvidence[];
  boundProductIds?: readonly string[];
}>): TrackCResponderTask {
  if (!input.productResolved || input.classificationOrVariantRequired) {
    return Object.freeze({
      answer: Object.freeze({
        kind: "CLARIFY",
        goal: "Làm rõ mẫu sản phẩm đang được hỏi.",
      }),
      evidence: Object.freeze([]),
      requiredEvidenceRefs: Object.freeze([]),
      unrealizedEvidence: Object.freeze([]),
      continuation: null,
      canonicalRequest: Object.freeze({ type: "ASK_PRODUCT" }),
    });
  }
  const progression: Pick<TrackCResponderTask, "continuation" | "canonicalRequest"> = input.colorChoiceMeaningful
    ? { continuation: { type: "ASK", input: "COLOR" }, canonicalRequest: null }
    : input.missingMeasurements?.length === 0
      ? { continuation: { type: "KEEP_OPEN" }, canonicalRequest: null }
      : { continuation: null, canonicalRequest: { type: "ASK_MEASUREMENTS",
          measurementFields: validatedTrackCMeasurementFields(input.missingMeasurements) } };
  const bound = input.boundProductIds ?? [];
  const available = input.evidence.filter((entry) =>
    trackCEvidenceHasSafeFactualEgress(entry) &&
    (entry.subject?.productId === undefined || bound.length === 0 ||
    bound.includes(entry.subject.productId))
  );
  const price = available.find(({ capability }) => capability === "PRICE") ?? null;
  if (price === null) {
    return Object.freeze({
      answer: Object.freeze({
        kind: "ANSWER", evidenceStatus: "UNRESOLVED", proposition: "PRICE",
        goal: "Trả lời câu hỏi giá mà không suy đoán khi chưa có authority.",
      }),
      evidence: Object.freeze([]),
      requiredEvidenceRefs: Object.freeze([]),
      unrealizedEvidence: Object.freeze([]),
      ...progression,
    });
  }
  const useful = available.find(({ capability, ref }) =>
    ref !== price.ref &&
    (capability === "PRODUCT_PRESENTATION" || capability === "PRODUCT_ATTRIBUTES")
  ) ?? null;
  const evidence = Object.freeze([price, ...(useful === null ? [] : [useful])]);
  if (new Set(evidence.map(({ provenance }) => provenance.contentHash)).size !==
      evidence.length) {
    throw new Error("TRACK_C_EVIDENCE_PROVENANCE_DUPLICATE");
  }
  return Object.freeze({
    answer: Object.freeze({
      kind: "ANSWER", evidenceStatus: "SUPPORTED", proposition: "PRICE",
      goal: "Trả lời giá đã xác minh và một thông tin sản phẩm hữu ích.",
    }),
    evidence,
    requiredEvidenceRefs: Object.freeze(evidence.map(({ ref }) => ref)),
    // The fixed lane only ever selects entries that already passed the
    // realization filter above, so nothing is left unstated here.
    unrealizedEvidence: Object.freeze([]),
    ...progression,
  });
}
