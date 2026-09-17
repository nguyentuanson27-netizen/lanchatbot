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

export type TrackCResponderTask = Readonly<{
  answer: Readonly<{
    kind: "ANSWER" | "ACKNOWLEDGE" | "CLARIFY";
    status: "SUPPORTED" | "UNRESOLVED" | "NOT_APPLICABLE";
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
      answer: Object.freeze({ kind: "CLARIFY", status: "NOT_APPLICABLE" }),
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
    answer: Object.freeze({ kind: "ANSWER", status: "SUPPORTED" }),
    evidenceRefs: Object.freeze(evidenceRefs),
    continuation: input.colorChoiceMeaningful
      ? Object.freeze({ type: "ASK", input: "COLOR" as const })
      : null,
    canonicalRequest: input.colorChoiceMeaningful
      ? null
      : Object.freeze({ type: "ASK_MEASUREMENTS" }),
  });
}
