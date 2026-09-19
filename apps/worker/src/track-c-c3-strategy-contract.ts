import { redactAnalyticsMessage } from "@lana/database";

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

type TrackCCheckoutField = "FULL_NAME" | "PHONE" | "ADDRESS";

export type TrackCSelectableEvidence = Readonly<{
  ref: string;
  capability: TrackCProtectedProposition;
  subject?: Readonly<{
    productId?: string;
    variantId?: string;
    displayName?: string;
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
  // Existing authoritative guards validate protected facts, not arbitrary
  // surrounding sales/value prose. Selectable evidence therefore needs a
  // customer-ready code-owned projection before the Strategist can choose it.
  return evidence.deterministicText !== undefined;
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

export type TrackCResponderTask = Readonly<{
  answer: Readonly<{
    kind: "ANSWER" | "ACKNOWLEDGE" | "CLARIFY";
    status: "SUPPORTED" | "UNRESOLVED" | "NOT_APPLICABLE";
    goal: string;
    proposition: TrackCProtectedProposition;
  }>;
  evidence: readonly TrackCSelectableEvidence[];
  requiredEvidenceRefs: readonly string[];
  continuation:
    | Readonly<{ type: "ASK"; input: TrackCOrdinaryDecisionInput }>
    | Readonly<{ type: "KEEP_OPEN" }>
    | null;
  canonicalRequest:
    | Readonly<{
      type: Exclude<TrackCCanonicalAction, "NONE">;
      requestedFields?: readonly TrackCCheckoutField[];
    }>
    | null;
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
  if (redacted.dlpStatus !== "PASSED" || redacted.text !== value) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  return value;
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

function canonicalRequest(
  action: TrackCCanonicalAction,
  requestedFields: readonly TrackCCheckoutField[],
): TrackCResponderTask["canonicalRequest"] {
  if (action === "NONE") return null;
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
  if (values.some((entry) => !trackCEvidenceHasSafeFactualEgress(entry))) {
    throw new Error("TRACK_C_STRATEGIST_EVIDENCE_INVALID");
  }
  if (new Set(values.map(({ provenance }) => provenance.contentHash)).size !==
      values.length) {
    throw new Error("TRACK_C_EVIDENCE_PROVENANCE_DUPLICATE");
  }
  if (boundProductIds.length > 0 && values.some(({ subject }) =>
    subject?.productId !== undefined && !boundProductIds.includes(subject.productId)
  )) {
    throw new Error("TRACK_C_EVIDENCE_BINDING_INVALID");
  }
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
}>): TrackCResponderTask {
  const decision = readDecision(input.decision);
  const evidence = selectedEvidence(
    decision.evidenceRefs,
    input.evidence,
    input.boundProductIds ?? [],
  );
  if (!input.permittedCanonicalActions.includes(decision.canonicalAction) ||
      (decision.canonicalAction === "NONE" && decision.continuation === null) ||
      (decision.canonicalAction !== "NONE" && decision.continuation !== null) ||
      (input.hardStop && decision.canonicalAction !== "HOLD_POSITION") ||
      (!input.hardStop && !input.productResolved &&
        decision.canonicalAction !== "ASK_PRODUCT") ||
      (decision.continuation?.type === "ASK" &&
        decision.continuation.input === "USUAL_SIZE" &&
        !input.measurementsUnavailable)) {
    throw new Error("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  }
  const supportsProposition = decision.proposition !== "NONE" &&
    evidence.some(({ capability }) => capability === decision.proposition);
  if (decision.replyAct === "ACKNOWLEDGE" &&
      decision.proposition !== "NONE" &&
      !supportsProposition) {
    throw new Error("TRACK_C_STRATEGIST_REPLY_ACT_INVALID");
  }
  const status = decision.replyAct !== "ANSWER" || decision.proposition === "NONE"
    ? "NOT_APPLICABLE" as const
    : supportsProposition ? "SUPPORTED" as const : "UNRESOLVED" as const;
  if (supportsProposition &&
      decision.canonicalAction === "NONE" &&
      decision.continuation?.type === "ASK") {
    throw new Error("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  }
  return Object.freeze({
    answer: Object.freeze({
      kind: decision.replyAct,
      status,
      goal: decision.goal,
      proposition: decision.proposition,
    }),
    evidence,
    requiredEvidenceRefs: Object.freeze(
      status === "SUPPORTED" ? [...decision.evidenceRefs] : [],
    ),
    continuation: decision.continuation,
    canonicalRequest: canonicalRequest(
      decision.canonicalAction,
      input.checkoutRequestedFields ?? [],
    ),
  });
}

export function compileTrackCFixedFirstContactTask(input: Readonly<{
  productResolved: boolean;
  classificationOrVariantRequired: boolean;
  colorChoiceMeaningful: boolean;
  evidence: readonly TrackCSelectableEvidence[];
  boundProductIds?: readonly string[];
}>): TrackCResponderTask {
  if (!input.productResolved || input.classificationOrVariantRequired) {
    return Object.freeze({
      answer: Object.freeze({
        kind: "CLARIFY", status: "NOT_APPLICABLE", proposition: "NONE",
        goal: "Làm rõ mẫu sản phẩm đang được hỏi.",
      }),
      evidence: Object.freeze([]),
      requiredEvidenceRefs: Object.freeze([]),
      continuation: null,
      canonicalRequest: Object.freeze({ type: "ASK_PRODUCT" }),
    });
  }
  const bound = input.boundProductIds ?? [];
  const available = input.evidence.filter(({ subject }) =>
    subject?.productId === undefined || bound.length === 0 ||
    bound.includes(subject.productId)
  );
  const price = available.find(({ capability }) => capability === "PRICE") ?? null;
  if (price === null) {
    return Object.freeze({
      answer: Object.freeze({
        kind: "ANSWER", status: "UNRESOLVED", proposition: "PRICE",
        goal: "Trả lời câu hỏi giá mà không suy đoán khi chưa có authority.",
      }),
      evidence: Object.freeze([]),
      requiredEvidenceRefs: Object.freeze([]),
      continuation: input.colorChoiceMeaningful
        ? Object.freeze({ type: "ASK", input: "COLOR" })
        : null,
      canonicalRequest: input.colorChoiceMeaningful
        ? null : Object.freeze({ type: "ASK_MEASUREMENTS" }),
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
      kind: "ANSWER", status: "SUPPORTED", proposition: "PRICE",
      goal: "Trả lời giá đã xác minh và một thông tin sản phẩm hữu ích.",
    }),
    evidence,
    requiredEvidenceRefs: Object.freeze(evidence.map(({ ref }) => ref)),
    continuation: input.colorChoiceMeaningful
      ? Object.freeze({ type: "ASK", input: "COLOR" })
      : null,
    canonicalRequest: input.colorChoiceMeaningful
      ? null : Object.freeze({ type: "ASK_MEASUREMENTS" }),
  });
}
