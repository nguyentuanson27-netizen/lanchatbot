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

export const TRACK_C_PROTECTED_RESOLUTIONS = Object.freeze([
  "SUPPORTED",
  "UNRESOLVED",
  "NOT_APPLICABLE",
] as const);

export type TrackCProtectedProposition =
  typeof TRACK_C_PROTECTED_PROPOSITIONS[number];
export type TrackCProtectedResolution =
  typeof TRACK_C_PROTECTED_RESOLUTIONS[number];

/**
 * A deliberately small, code-readable identity for the one ordinary customer
 * decision the Strategist selected. Natural-language target/purpose remain
 * model-owned guidance; they are never parsed to determine this identity.
 */
export const TRACK_C_DECISION_INPUTS = Object.freeze([
  "NONE",
  "PRODUCT",
  "MEASUREMENTS",
  "SIZE",
  "COLOR",
  "VARIANT",
  "LOCALITY",
  "PAYMENT_PREFERENCE",
  "QUANTITY",
  "STYLE",
] as const);

export type TrackCDecisionInput = typeof TRACK_C_DECISION_INPUTS[number];

export type TrackCResponsePlanSemanticReason =
  | "EFFECT_INTENT_FORBIDDEN"
  | "DECISION_INPUT_CONSTRAINT"
  | "PROTECTED_PROPOSITION_CONSTRAINT"
  | "UNSUPPORTED_PROTECTED_PROPOSITION";

/**
 * Diagnostics intentionally expose only a stable stage and reason. They never
 * carry free-text plan fields, customer messages, values, or provider payloads.
 */
export class TrackCResponsePlanSemanticError extends Error {
  readonly stage = "SEMANTIC" as const;

  constructor(
    readonly reason: TrackCResponsePlanSemanticReason,
    message = "TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC",
  ) {
    super(message);
    this.name = "TrackCResponsePlanSemanticError";
  }
}

export function trackCResponsePlanSemanticError(
  reason: TrackCResponsePlanSemanticReason,
  message?: string,
): TrackCResponsePlanSemanticError {
  return new TrackCResponsePlanSemanticError(reason, message);
}

export type TrackCResponsePlanControlV1 = Readonly<{
  answer: Readonly<{
    protectedProposition: TrackCProtectedProposition;
    protectedResolution: TrackCProtectedResolution;
  }>;
  nextMove: Readonly<{
    target: string;
    purpose: string;
    decisionInput: TrackCDecisionInput;
  }>;
  effectIntent: string;
}>;

type TrackCResponsePlanControlInput = Readonly<{
  control: TrackCResponsePlanControlV1;
  answerMode: string;
  selectedEvidenceCapabilities: readonly TrackCProtectedProposition[];
  nextMoveAction: "ASK" | "NONE";
  canonicalActionType: string;
  terminal: boolean;
}>;

function semanticInvalid(reason: TrackCResponsePlanSemanticReason): never {
  throw trackCResponsePlanSemanticError(reason);
}

/**
 * Validates the code-enforced control plane only. The Strategist still owns
 * the conversational choice; this function only checks that the choice stays
 * within evidence/effect/cardinality authority.
 */
export function assertTrackCC3ResponsePlanControl(
  input: TrackCResponsePlanControlInput,
): void {
  const { control } = input;
  if (control.effectIntent !== "NONE") semanticInvalid("EFFECT_INTENT_FORBIDDEN");

  const { target, purpose, decisionInput } = control.nextMove;
  if (!TRACK_C_DECISION_INPUTS.includes(decisionInput) ||
      (input.nextMoveAction === "ASK" && decisionInput === "NONE") ||
      (input.nextMoveAction === "NONE" && decisionInput !== "NONE") ||
      (input.canonicalActionType !== "NONE" && decisionInput !== "NONE") ||
      (input.terminal && decisionInput !== "NONE") ||
      (input.canonicalActionType === "HOLD_POSITION" && !input.terminal) ||
      (input.nextMoveAction === "ASK" &&
        (target === "NONE" || purpose === "NONE")) ||
      (input.nextMoveAction === "NONE" &&
        (target !== "NONE" || purpose !== "NONE"))) {
    semanticInvalid("DECISION_INPUT_CONSTRAINT");
  }

  const proposition = control.answer.protectedProposition;
  const resolution = control.answer.protectedResolution;
  if (proposition === "NONE") {
    if (resolution !== "NOT_APPLICABLE") {
      semanticInvalid("PROTECTED_PROPOSITION_CONSTRAINT");
    }
    return;
  }
  if (resolution === "NOT_APPLICABLE") {
    semanticInvalid("PROTECTED_PROPOSITION_CONSTRAINT");
  }
  if (resolution === "SUPPORTED" &&
      !input.selectedEvidenceCapabilities.includes(proposition)) {
    semanticInvalid("UNSUPPORTED_PROTECTED_PROPOSITION");
  }
  if (resolution === "UNRESOLVED" &&
      input.answerMode !== "BOUNDED_UNCERTAINTY") {
    semanticInvalid("PROTECTED_PROPOSITION_CONSTRAINT");
  }
  if (input.answerMode === "BOUNDED_UNCERTAINTY" &&
      resolution === "SUPPORTED") {
    semanticInvalid("PROTECTED_PROPOSITION_CONSTRAINT");
  }
}
