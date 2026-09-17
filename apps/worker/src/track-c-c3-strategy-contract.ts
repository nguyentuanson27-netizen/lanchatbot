/**
 * The small, code-owned contract between the fixed/adaptive policy and the
 * Responder.  It deliberately carries no customer data, factual values, or
 * effect authority.
 */
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
  | "STYLE";

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

export type TrackCResponderTask = Readonly<{
  answer: Readonly<{
    kind: "ANSWER" | "ACKNOWLEDGE" | "CLARIFY";
    status: "SUPPORTED" | "UNRESOLVED" | "NOT_APPLICABLE";
    goal: string;
  }>;
  evidenceRefs: readonly string[];
  continuation:
    | Readonly<{ type: "ASK"; input: TrackCOrdinaryDecisionInput }>
    | Readonly<{ type: "KEEP_OPEN" }>
    | null;
  canonicalRequest:
    | Readonly<{
      type: Exclude<TrackCCanonicalAction, "NONE">;
      requestedFields?: readonly ("FULL_NAME" | "PHONE" | "ADDRESS")[];
    }>
    | null;
}>;

export type TrackCTrustedAcquisitionMetadata = Readonly<{
  kind: "TRACK_C_TRUSTED_ACQUISITION_V1";
  origin: "ADVERTISEMENT";
  firstMeaningfulInbound: boolean;
  authorization: "NONE";
}>;

function isTrustedFirstContact(
  value: unknown,
): value is TrackCTrustedAcquisitionMetadata {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return record.kind === "TRACK_C_TRUSTED_ACQUISITION_V1" &&
    record.origin === "ADVERTISEMENT" &&
    record.firstMeaningfulInbound === true &&
    record.authorization === "NONE" &&
    Object.keys(record).length === 4;
}

/** Dialogue wording is intentionally not an input to this decision. */
export function selectTrackCConversationLane(
  metadata: readonly unknown[],
): TrackCConversationLane {
  return metadata.some(isTrustedFirstContact)
    ? "FIRST_CONTACT_FIXED"
    : "ADAPTIVE_FOLLOWUP";
}

export function compileTrackCFixedFirstContactTask(input: Readonly<{
  productResolved: boolean;
  colorChoiceMeaningful: boolean;
  priceEvidenceRef: string | null;
  productEvidenceRefs: readonly string[];
  authorizedSellingPointRef: string | null;
}>): TrackCResponderTask {
  if (!input.productResolved || input.priceEvidenceRef === null) {
    return Object.freeze({
      answer: Object.freeze({
        kind: "CLARIFY",
        status: "NOT_APPLICABLE",
        goal: "Clarify the product before giving product-specific information.",
      }),
      evidenceRefs: Object.freeze([]),
      continuation: null,
      canonicalRequest: Object.freeze({ type: "ASK_PRODUCT" }),
    });
  }

  const evidenceRefs = [
    input.priceEvidenceRef,
    ...input.productEvidenceRefs,
    ...(input.authorizedSellingPointRef === null
      ? []
      : [input.authorizedSellingPointRef]),
  ];
  if (new Set(evidenceRefs).size !== evidenceRefs.length) {
    throw new Error("TRACK_C_FIRST_CONTACT_EVIDENCE_DUPLICATE");
  }
  return Object.freeze({
    answer: Object.freeze({
      kind: "ANSWER",
      status: "SUPPORTED",
      goal: "Answer the verified price and give concise product information.",
    }),
    evidenceRefs: Object.freeze(evidenceRefs),
    continuation: input.colorChoiceMeaningful
      ? Object.freeze({ type: "ASK", input: "COLOR" as const })
      : null,
    canonicalRequest: input.colorChoiceMeaningful
      ? null
      : Object.freeze({ type: "ASK_MEASUREMENTS" }),
  });
}

const ORDINARY_INPUTS = new Set<TrackCOrdinaryDecisionInput>([
  "SIZE",
  "USUAL_SIZE",
  "COLOR",
  "VARIANT",
  "LOCALITY",
  "PAYMENT_PREFERENCE",
  "QUANTITY",
  "STYLE",
]);
const CANONICAL_ACTIONS = new Set<TrackCCanonicalAction>([
  "NONE",
  "ASK_PRODUCT",
  "ASK_MEASUREMENTS",
  "ASK_CHECKOUT_DETAILS",
  "HOLD_POSITION",
]);

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

function plainObject(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  return value as Readonly<Record<string, unknown>>;
}

function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): void {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
}

function readContinuation(value: unknown): TrackCStrategistDecision["continuation"] {
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
  exactKeys(record, ["type", "input"]);
  return Object.freeze({
    type: "ASK",
    input: record.input as TrackCOrdinaryDecisionInput,
  });
}

export function compileTrackCStrategistDecision(input: Readonly<{
  decision: unknown;
  evidenceCapabilities: ReadonlyMap<string, TrackCProtectedProposition>;
  permittedCanonicalActions: readonly TrackCCanonicalAction[];
  measurementsUnavailable: boolean;
  checkoutRequestedFields?: readonly ("FULL_NAME" | "PHONE" | "ADDRESS")[];
}>): TrackCResponderTask {
  const record = plainObject(input.decision);
  exactKeys(record, [
    "replyAct",
    "goal",
    "proposition",
    "evidenceRefs",
    "continuation",
    "canonicalAction",
  ]);
  if ((record.replyAct !== "ANSWER" && record.replyAct !== "ACKNOWLEDGE" &&
       record.replyAct !== "CLARIFY") ||
      typeof record.goal !== "string" || !record.goal.trim() ||
      record.goal.length > 500 ||
      typeof record.proposition !== "string" ||
      !TRACK_C_PROTECTED_PROPOSITIONS.includes(
        record.proposition as TrackCProtectedProposition,
      ) ||
      !Array.isArray(record.evidenceRefs) ||
      record.evidenceRefs.some((ref) => typeof ref !== "string") ||
      typeof record.canonicalAction !== "string" ||
      !CANONICAL_ACTIONS.has(record.canonicalAction as TrackCCanonicalAction)) {
    throw new Error("TRACK_C_STRATEGIST_DECISION_INVALID");
  }
  const evidenceRefs = record.evidenceRefs as string[];
  if (new Set(evidenceRefs).size !== evidenceRefs.length ||
      evidenceRefs.some((ref) => !input.evidenceCapabilities.has(ref))) {
    throw new Error("TRACK_C_STRATEGIST_EVIDENCE_INVALID");
  }
  const continuation = readContinuation(record.continuation);
  const canonicalAction = record.canonicalAction as TrackCCanonicalAction;
  if (!input.permittedCanonicalActions.includes(canonicalAction) ||
      (canonicalAction === "NONE" && continuation === null) ||
      (canonicalAction !== "NONE" && continuation !== null)) {
    throw new Error("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  }
  if (continuation?.type === "ASK" && continuation.input === "USUAL_SIZE" &&
      !input.measurementsUnavailable) {
    throw new Error("TRACK_C_STRATEGIST_USUAL_SIZE_NOT_FALLBACK");
  }
  const replyAct = record.replyAct as TrackCStrategistDecision["replyAct"];
  const proposition = record.proposition as TrackCProtectedProposition;
  const status = replyAct !== "ANSWER"
    ? "NOT_APPLICABLE" as const
    : proposition === "NONE"
      ? "NOT_APPLICABLE" as const
      : evidenceRefs.some((ref) => input.evidenceCapabilities.get(ref) === proposition)
        ? "SUPPORTED" as const
        : "UNRESOLVED" as const;
  const canonicalRequest = canonicalAction === "NONE"
    ? null
    : canonicalAction === "ASK_CHECKOUT_DETAILS"
      ? Object.freeze({
          type: canonicalAction,
          requestedFields: Object.freeze([...(input.checkoutRequestedFields ?? [])]),
        })
      : Object.freeze({ type: canonicalAction });
  return Object.freeze({
    answer: Object.freeze({ kind: replyAct, status, goal: record.goal.trim() }),
    evidenceRefs: Object.freeze([...evidenceRefs]),
    continuation,
    canonicalRequest,
  });
}
