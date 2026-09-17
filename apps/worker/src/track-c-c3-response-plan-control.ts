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

export type TrackCResponsePlanControlV1 = Readonly<{
  answer: Readonly<{
    protectedProposition: TrackCProtectedProposition;
    protectedResolution: TrackCProtectedResolution;
  }>;
  nextMove: Readonly<{
    decisionInputs: readonly string[];
  }>;
  effectIntent: "NONE";
}>;

type TrackCResponsePlanControlInput = Readonly<{
  control: TrackCResponsePlanControlV1;
  answerMode: string;
  selectedEvidenceCapabilities: readonly TrackCProtectedProposition[];
  nextMoveAction: "ASK" | "NONE";
  canonicalActionType: string;
  terminal: boolean;
}>;

function semanticInvalid(): never {
  throw new Error("TRACK_C_C3_CONVERSATION_PLAN_INVALID:SEMANTIC");
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
  if (control.effectIntent !== "NONE") semanticInvalid();

  const decisionInputs = control.nextMove.decisionInputs;
  if (decisionInputs.length > 1 ||
      (input.nextMoveAction === "ASK" && decisionInputs.length !== 1) ||
      (input.nextMoveAction === "NONE" && decisionInputs.length !== 0) ||
      (input.canonicalActionType !== "NONE" && decisionInputs.length !== 0) ||
      (input.terminal && decisionInputs.length !== 0)) {
    semanticInvalid();
  }

  const proposition = control.answer.protectedProposition;
  const resolution = control.answer.protectedResolution;
  if (proposition === "NONE") {
    if (resolution !== "NOT_APPLICABLE") semanticInvalid();
    return;
  }
  if (resolution === "NOT_APPLICABLE") semanticInvalid();
  if (resolution === "SUPPORTED" &&
      !input.selectedEvidenceCapabilities.includes(proposition)) {
    semanticInvalid();
  }
  if (resolution === "UNRESOLVED" &&
      input.answerMode !== "BOUNDED_UNCERTAINTY") {
    semanticInvalid();
  }
  if (input.answerMode === "BOUNDED_UNCERTAINTY" &&
      resolution === "SUPPORTED") {
    semanticInvalid();
  }
}
