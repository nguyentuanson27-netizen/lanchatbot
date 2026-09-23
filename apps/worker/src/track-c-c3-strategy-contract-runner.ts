import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
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
  buildTrackCSharedCandidateRequest,
  contextFromFrozenTrackCCapture,
} from "./track-c-offline-candidate.js";
import { parseContextV2WithIntegrity } from "./context-v2.js";
import type { TrackCCurrentCartBinding } from "./track-c-c3-cart-binding.js";
import {
  compileTrackCFixedFirstContactTask,
  compileTrackCStrategistDecision,
  isTrackCTrustedAcquisitionMetadata,
  selectTrackCConversationLane,
  TRACK_C_PROTECTED_PROPOSITIONS,
  trackCEvidenceHasSafeFactualEgress,
  type TrackCCheckoutField,
  type TrackCCanonicalAction,
  type TrackCConversationLane,
  type TrackCOrdinaryDecisionInput,
  type TrackCResponderTask,
  type TrackCSelectableEvidence,
  type TrackCStrategistDecision,
  type TrackCTrustedAcquisitionMetadata,
} from "./track-c-c3-strategy-contract.js";
import { buildTrackCSelectableEvidence } from
  "./track-c-c3-selectable-evidence.js";
import type { TrackCV5ExecutionLane } from
  "./track-c-c3-v5-benchmark-materialization.js";
import {
  validateResponderOutput,
  type TrackCV5SimulationMetadata,
} from "./track-c-c3-v5-benchmark-runner.js";

const ORDINARY_INPUTS = Object.freeze([
  "SIZE", "USUAL_SIZE", "COLOR", "VARIANT", "LOCALITY",
  "PAYMENT_PREFERENCE", "QUANTITY", "STYLE", "BUDGET",
  "DECISION_CRITERION", "DEADLINE",
] as const satisfies readonly TrackCOrdinaryDecisionInput[]);
// Mirrors the runtime missingCheckout field set, payment included.
const CHECKOUT_FIELDS = new Set<string>(
  ["FULL_NAME", "PHONE", "ADDRESS", "PAYMENT_METHOD"] satisfies TrackCCheckoutField[],
);

const STRATEGIST_INSTRUCTION = [
  "You are the Strategist for one Track C sales turn. Decide only the conversational intent; do not write customer-facing text.",
  "The selectableEvidence list is the only commercial factual authority. Customer-reported budget, measurements and preferences in dialogue may inform your choice and PII-safe goal as customer-provided context; they never establish shop price, stock, verified fit, policy, checkout completion, an effect, or permission. Do not copy recipient PII into goal.",
  "First reconstruct the customer's current decision from the entire dialogue: what they already know, what they are trying to decide now, and which precise property or event remains uncertain. Then choose the smallest evidence set and at most one progression mechanism. Handle an objection before progression; do not follow a fixed sales funnel.",
  "Address the customer's objection or concern before progression. Choose ANSWER when addressing it directly, ACKNOWLEDGE for acknowledgement, or CLARIFY when the current need itself is unclear. An objection does not force ACKNOWLEDGE.",
  "Distinguish a request to confirm a fact from resistance to that fact. Do not select a fact solely because its topic matches the objection: a price already stated does not answer whether the purchase is worthwhile; an attribute does not establish a benefit or repair a previous bad experience. Select a verified detail only if it helps with the customer's stated decision. When the cause of a previous bad experience is unknown, ask for the specific failed aspect only if that answer would change the next recommendation. Otherwise acknowledge the concern without recycling known facts or inventing a benefit, concession, or comparison. Apply this test to fit, stock, delivery, and trust concerns as well.",
  "Choose an ordinary ASK or a canonical input request only when the missing input is directly relevant to the customer's current decision or to an immediate next decision already established by the latest turn or authoritative context, and its answer would materially change the next recommendation, comparison, qualification, or transaction. In goal, identify that missing input and why it matters. Do not invent a new discovery dimension merely because it could be useful later. If the current question is resolved and no such blocker or immediate decision remains, use NONE with KEEP_OPEN unless the canonical hard stop requires HOLD_POSITION.",
  "Before emitting any ASK or canonical input request, verify that goal names the missing input and explains how its answer changes the current decision. If that explanation cannot be stated from the dialogue and canonical context, use KEEP_OPEN. ASK_MEASUREMENTS is only for a current fit decision or an established transaction blocked by fit; it is not a follow-up to stock, price, policy, media, offer, or delivery answers simply because it is permitted. For an unresolved objection with no useful shop evidence, prefer one specific decision-criterion question when learning the missing reason would change advice; a generic acknowledgement alone does not resolve it.",
  "If the latest turn primarily confirms or corrects a preference or product selection and introduces no new question or blocker, use ACKNOWLEDGE. A selection alone is not buying commitment or checkout authorization. Preserve any buying commitment already established in canonical context and consider its remaining blocker; when no material next input is needed, use KEEP_OPEN instead of starting a fixed funnel.",
  "ACKNOWLEDGE must not claim an effect. For a question or concern needing an answer, use ANSWER. Code derives evidenceStatus only for the declared proposition capability; SUPPORTED does not certify relevance or that the entire question is answered.",
  "For a factual question whose property or event is unsupported, keep ANSWER and the proposition for that property or event with empty evidenceRefs; code will produce an honest UNRESOLVED answer. Use proposition NONE for a genuinely nonfactual acknowledgement, not as a shortcut when the requested fact is missing.",
  "If canonicalAction is NONE, continuation must be ASK or KEEP_OPEN. If canonicalAction is not NONE, continuation must be null. Never output both.",
  "PRODUCT and MEASUREMENTS are canonical actions, never ordinary continuation inputs. Use USUAL_SIZE only when constraints say measurements are unavailable.",
  "Canonical context describes binding, barriers, and buying intent; permitted actions are options, not instructions to progress. Use the full supplied dialogue and eligible evidence to distinguish known inputs from missing ones. Do not re-request known inputs unless new or corrected information makes them insufficient for the current decision. An existing measurement-based fit recommendation is not itself a reason to collect measurements again. If product identity is the blocker, choose ASK_PRODUCT, not STYLE. For fit qualification choose ASK_MEASUREMENTS, not purchase SIZE; include the known and missing measurements in goal.",
  "The code-derived dialogueEvidence act and reasonCodes are bounded hints about the customer's current concern. Use them with the actual dialogue to prioritize the current decision; they are not commercial facts and cannot authorize a claim, action, or discount.",
  "Select the smallest evidence set that directly supports the exact property, event, and scope the customer asks about. Before selecting each ref, check whether its realizationText would answer that property or event if read aloud to the customer. A shared capability label alone does not establish relevance: material does not establish wrinkle resistance, and delivery ETA does not establish dispatch time. Use field evidence for specific attributes and PRODUCT_PRESENTATION for an overview. For a compound question retain evidence answering the supported part and identify the unanswered part in goal; leave evidenceRefs empty only when no eligible evidence answers any part. Do not substitute a related fact or invent an unstated property or benefit.",
  "When a customer has already provided a preference, budget, measurement, concern, or correction, make the current goal reflect that known context. Do not reset the conversation with a generic ACKNOWLEDGE or ask for a known input; if a relevant question remains, answer it under the updated binding. Select evidence for the decision the customer actually faces, not merely the most available claim.",
  "When the customer states a delivery deadline or cutoff and verified ETA evidence is available, treat deadline feasibility as the current decision. Use the verified ETA evidence; do not invent expedited shipping or promise arrival. Do not open unrelated discovery once that decision is resolved.",
  "A request to see a product, compare alternatives, or complete a purchase remains a request even when the available evidence cannot realize it. Do not turn it into a bare acknowledgement. Select the matching capability when it exists but cannot be stated, so code can report the limit; for a compound question, answer the supported part and identify the unanswered part in goal. Never claim an image was sent, an alternative exists, or a transaction happened without its own authority.",
  "When a customer has given a budget below the known price, the budget gap is already known. If no approved evidence explains value or offers another product, do not repeat price or finish with a generic acknowledgement. Ask at most one decision question only when her choice between keeping this model and prioritizing her budget would change the next advice; otherwise state the limit honestly. Do not imply that a cheaper option exists.",
  "BUDGET asks for an amount only when the customer has not supplied one. If an amount is already in the dialogue, use DECISION_CRITERION for the remaining tradeoff; do not select BUDGET simply because the topic is price. A previous shop price in the dialogue is already known to the customer; select PRICE again only when the latest turn explicitly asks to confirm it.",
  "Missing evidence is not negative evidence. A proposition may be unresolved with no evidenceRefs. Never invent a fact, discount, availability, policy, effect, PII, or external action.",
  "Evidence marked realizationSupported=false is valid factual input with an unsupported output capability. It is not negative evidence. Select what the current decision needs; code will report a capability gap instead of inventing a rendering.",
  "Each evidence entry with realizationText shows the exact sentence code will state if you select it. Compare these sentences before selecting refs: do not select an overview and field entries that repeat the same details, and do not select a sentence that answers a different event or property from the customer's question. The text is a preview of existing authorized evidence, not new authority.",
  "Decision examples (patterns, not scripts): an explicit new price question selects PRICE; a customer who already knows the price but doubts value needs relevant verified product evidence, not PRICE again. A verified attribute matching a preference the customer already stated can help her weigh that choice: select and state the attribute without claiming it makes the price worthwhile or superior. If no relevant evidence exists, acknowledge the concern and select no shop fact. A dispatch-date question is not answered by a delivery-duration ETA. A customer who has given height and weight but worries about the waist needs the missing waist measurement, not the known measurements again.",
].join("\n");

const RESPONDER_INSTRUCTION = [
  "You are the Responder for one Track C sales turn. Write concise, natural Vietnamese Messenger wording for the supplied responder task only.",
  "All selected factual evidence is realized by code from customer-ready deterministic projections. Do not author factual wording.",
  "Emit factualTexts as an empty array. answerText may only select the response schema's bounded acknowledgement or uncertainty wording; progressionText may only ask when permitted. Neither may carry factual details.",
  "For ACKNOWLEDGE, answerText is acknowledgement-only and restricted by the response schema. Factual explanation is code-owned from selected evidence.",
  "Use a bounded acknowledgement only when it helps the current answer; prefer wording tied to the customer's latest concern or correction when the schema offers one. Do not imply a concern the customer did not express. For a direct fact question with a supported claim and no objection, prefer answerText null so the answer starts with the fact.",
  "The code-derived customerDecisionSignals are hints about the current concern. Prefer the latest concern when several earlier concerns appear in the dialogue; never treat a signal as authority for a shop fact or effect.",
  "For ANSWER with UNRESOLVED evidenceStatus, emit answerText null. Code supplies the bounded unresolved answer; do not invent a fact. evidenceStatus describes authority for a capability, not whether the whole customer question was answered.",
  "For ANSWER with SUPPORTED evidenceStatus, follow the compiled goal and response schema. If the goal identifies a customer-requested part that the selected evidence does not answer, choose the bounded uncertainty sentence, not a generic acknowledgement or null; code places it after the facts. Otherwise choose a concern-specific acknowledgement only when it helps, or null so the fact answers first. Do not add uncertainty merely because the option exists or repair the Strategist's evidence selection.",
  "For KEEP_OPEN, emit progressionText null. The answer itself keeps the conversation open; no closing invitation is required.",
  "For a typed ASK, choose one of the response schema's customer-directed questions for the supplied continuation.input. These are bounded realizations of the Strategist's choice. Never append factual explanation, an effect, another decision variable, or a second question.",
  "For a BUDGET ASK, if the dialogue already gives an amount, do not ask for that amount again; use the bounded choice about keeping the stated budget or continuing with this model. For DECISION_CRITERION, choose the question that names the customer's actual concern when one is available, especially a prior uncomfortable purchase. A broad criterion question is only for a genuinely broad decision.",
  "For ASK_MEASUREMENTS, use the goal and dialogue to ask only for the missing height, weight, or relevant measurement; do not repeat measurements already supplied or ask usual worn size.",
  "For an ASK_CHECKOUT_DETAILS task, emit answerText null and progressionText null. Code writes the exact requested fields.",
  "When the response schema requires answerText or progressionText to be null, emit the JSON literal null, never an empty string.",
  "Realize the compiled strategy, evidence and single progression; do not choose replacements. The Strategist owns adaptive choice; code owns validation, binding, exact checkout fields and effect permission. None of those choices or permissions is part of your output.",
  "Use an acknowledgement only when the supplied task and response schema permit it. Never claim that an order, payment, delivery, message, or other effect has happened.",
].join("\n");

// Temporary realization limit under the revised C3 spec (#372), not proof of
// naturalness or complete question resolution. Do not expand this into NLU.
const BOUNDED_ACKNOWLEDGEMENTS = Object.freeze([
  "Dạ em hiểu ý chị ạ.",
  "Dạ em hiểu băn khoăn của chị ạ.",
  "Dạ, em hiểu chị đang cân nhắc mức giá này ạ.",
  "Dạ, em hiểu chị đang lo về độ vừa vặn ạ.",
  "Dạ, em hiểu chị đang cân nhắc mốc nhận hàng ạ.",
  "Dạ, em theo thông tin chị vừa sửa ạ.",
] as const);
const UNRESOLVED_ANSWER_TEXT =
  "Dạ, phần này em chưa thể xác nhận chắc cho chị ạ.";
// Code-owned limit sentence for a selection that was only partly realizable.
// Without it, a compound question could be answered with the part that has
// wording while the rest disappeared silently. It carries no fact of its own.
const PARTIAL_REALIZATION_TEXT =
  "Riêng phần còn lại, em chưa thể xác nhận chắc cho chị ạ.";

// A small vocabulary for the existing typed requests, not a text classifier.
// The Strategist chooses the input; the Responder chooses its wording. Exact
// membership closes the fact/effect side channel without Vietnamese regexes.
const REQUEST_WORDING: Readonly<Record<TrackCOrdinaryDecisionInput |
  "ASK_PRODUCT" | "ASK_MEASUREMENTS", readonly string[]>> = Object.freeze({
  SIZE: ["Chị muốn chọn size nào ạ?", "Chị chọn size nào cho mình ạ?"],
  USUAL_SIZE: ["Chị thường mặc size gì ạ?", "Chị cho em biết size mình thường mặc nhé?"],
  COLOR: ["Chị thích màu nào hơn ạ?", "Màu nào hợp ý chị hơn ạ?"],
  VARIANT: ["Chị muốn chọn phiên bản nào ạ?", "Chị chọn phiên bản nào cho mình ạ?"],
  LOCALITY: ["Chị muốn nhận hàng ở tỉnh hoặc thành phố nào ạ?", "Chị ở tỉnh hoặc thành phố nào để em kiểm tra giao hàng ạ?"],
  PAYMENT_PREFERENCE: ["Chị muốn thanh toán theo cách nào ạ?", "Chị muốn chọn cách thanh toán nào ạ?"],
  QUANTITY: ["Chị muốn lấy bao nhiêu sản phẩm ạ?", "Chị cho em biết số lượng mình muốn lấy nhé?"],
  STYLE: ["Chị thích kiểu dáng như thế nào ạ?", "Chị muốn tìm phong cách như thế nào ạ?"],
  BUDGET: [
    "Chị đang cân nhắc ngân sách khoảng bao nhiêu ạ?",
    "Chị muốn chọn trong tầm ngân sách nào ạ?",
    "Chị muốn giữ mức ngân sách mình đã dự tính hay vẫn cân nhắc mẫu này ạ?",
  ],
  DECISION_CRITERION: [
    "Điều chị ưu tiên nhất khi lựa chọn là gì ạ?",
    "Chị đang cân nhắc nhất điểm nào ạ?",
    "Lần trước chị thấy không thoải mái ở phần nào để em tư vấn đúng điểm đó ạ?",
    "Điểm nào của mẫu khiến chị chưa thấy phù hợp với mức mình dự tính ạ?",
    "Chị muốn ưu tiên mức ngân sách của mình hay xem kỹ hơn mẫu này ạ?",
  ],
  DEADLINE: ["Chị cần nhận hàng trước thời điểm nào ạ?", "Chị muốn nhận hàng chậm nhất khi nào ạ?"],
  ASK_PRODUCT: ["Chị gửi em mã hoặc ảnh mẫu mình đang hỏi nhé?", "Chị đang hỏi mẫu nào ạ?"],
  ASK_MEASUREMENTS: [
    "Chị cho em xin chiều cao và cân nặng để em tư vấn tiếp ạ?",
    "Chị cho em xin thêm chiều cao nhé?",
    "Chị cho em xin thêm cân nặng nhé?",
    "Chị cho em xin thêm số đo vòng eo nhé?",
    "Chị cho em xin số đo cần kiểm tra để em tư vấn tiếp ạ?",
  ],
});

// The checkout field set is owned by the contract so it stays aligned with the
// runtime state machine instead of drifting as a second local copy.
type CheckoutField = TrackCCheckoutField;
type TrackCDeliveryDeadlineConstraint = Readonly<{
  maxDeliveryDays: number;
}>;
type ResponderDraft = Readonly<{
  answerText: string | null;
  factualTexts: readonly string[];
  progressionText: string | null;
}>;

export type TrackCStrategistConstraints = Readonly<{
  permittedCanonicalActions: readonly TrackCCanonicalAction[];
  measurementsUnavailable: boolean;
  productResolved: boolean;
  hardStop: boolean;
  checkoutRequestedFields?: readonly CheckoutField[];
}>;

export interface TrackCStrategyContractCaseInput {
  readonly lane: TrackCV5ExecutionLane;
  readonly modelResource: string;
  readonly capture: unknown;
  readonly evaluationAt: Date;
  readonly evaluationContext: readonly ShadowContextMessage[];
  readonly simulationFacts?: readonly unknown[];
  /** Runtime-owned; never inferred from dialogue or carried as model evidence. */
  readonly trustedAcquisition?: TrackCTrustedAcquisitionMetadata;
  /**
   * Code-owned structured decision constraint. Never derive this value from
   * customer dialogue text inside this contract runner.
   */
  readonly deliveryDeadlineConstraint?: TrackCDeliveryDeadlineConstraint;
  readonly simulationMetadata?: readonly TrackCV5SimulationMetadata[];
  /** Frozen C2 cart readback; every cart claim must revalidate against it. */
  readonly currentCart?: TrackCCurrentCartBinding | null;
  readonly transport: CandidateVertexTransport;
  readonly signal?: AbortSignal;
}

export interface TrackCStrategyLiveInput {
  readonly context: ContextV2;
  readonly modelResource: string;
  readonly decisionAt: Date;
  readonly dialogue: readonly ShadowContextMessage[];
  readonly checkoutRequestedFields: readonly TrackCCheckoutField[];
  readonly checkoutClarificationActive: boolean;
  readonly currentCart: TrackCCurrentCartBinding | null;
  readonly paymentOptions: readonly ("COD" | "BANK_TRANSFER")[];
  readonly trustedAcquisition?: TrackCTrustedAcquisitionMetadata;
  readonly transport: CandidateVertexTransport;
  readonly signal?: AbortSignal;
}

export interface TrackCStrategyContractCaseResult {
  readonly contractVersion: "TRACK_C_C3_STRATEGY_CONTRACT_RESULT_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly executionLane: TrackCV5ExecutionLane;
  readonly conversationLane: TrackCConversationLane;
  readonly conversationPlan: TrackCResponderTask | TrackCStrategistDecision;
  /** Full code-compiled task; the model prompt sees only safe factual projections. */
  readonly responderTask: TrackCResponderTask;
  readonly output: ContextV2CandidateOutputV2;
  readonly reply: string;
  readonly identity: Readonly<{
    readonly captureContextHash: string;
    readonly strategistRequestEnvelopeHash: string | null;
    readonly decisionHash: string;
    readonly responderRequestEnvelopeHash: string;
    readonly responseOutputHash: string;
    readonly compositionHash: string;
  }>;
}

export type TrackCStrategyContractStage =
  | "EVIDENCE"
  | "STRATEGIST"
  | "RESPONDER"
  | "FINAL_GUARD";

export type TrackCStrategyContractDiagnostic = Readonly<{
  stage: TrackCStrategyContractStage;
  sanitizedRawModelOutput: string | null;
  errorCode: string;
}>;

/**
 * The journey adapter carries this bounded diagnostic to its caller. It is
 * intentionally not a persistent transcript and never contains raw PII.
 */
export class TrackCStrategyContractFailure extends Error {
  readonly diagnostic: TrackCStrategyContractDiagnostic;

  constructor(diagnostic: TrackCStrategyContractDiagnostic) {
    super(diagnostic.errorCode);
    this.name = "TrackCStrategyContractFailure";
    this.diagnostic = diagnostic;
  }
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function plainObject(value: unknown, errorCode: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorCode);
  }
  return value as Readonly<Record<string, unknown>>;
}

function exactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  errorCode: string,
): void {
  if (canonicalJsonV1(Object.keys(value).sort()) !==
      canonicalJsonV1([...keys].sort())) {
    throw new Error(errorCode);
  }
}

function providerText(payload: unknown): string | null {
  const value = (payload as { candidates?: readonly [{ content?: {
    parts?: readonly [{ text?: unknown }];
  } }] })?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof value === "string" ? value : null;
}

function providerJson(payload: unknown, errorCode: string): unknown {
  const value = providerText(payload);
  if (value === null) throw new Error(errorCode);
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(errorCode);
  }
}

function errorCode(error: unknown): string {
  return error instanceof Error && /^[A-Z0-9_]+(?::|$)/.test(error.message)
    ? error.message.split(":", 1)[0]!
    : "TRACK_C_STRATEGY_CONTRACT_UNEXPECTED_ERROR";
}

function sanitizedRawModelOutput(payload: unknown): string | null {
  const raw = providerText(payload);
  if (raw === null) return null;
  const redacted = redactAnalyticsMessage(raw);
  return redacted.text.slice(0, 2_000);
}

function stageFailure(
  stage: TrackCStrategyContractStage,
  payload: unknown,
  error: unknown,
): TrackCStrategyContractFailure {
  return new TrackCStrategyContractFailure(Object.freeze({
    stage,
    sanitizedRawModelOutput: sanitizedRawModelOutput(payload),
    errorCode: errorCode(error),
  }));
}

function assertProviderIdentity(value: string | null): void {
  if (value !== CONTEXT_V2_CANDIDATE_PROVIDER_VERSION) {
    throw new Error("TRACK_C_V5_PROVIDER_IDENTITY_MISMATCH");
  }
}

function narrowRequest(
  base: BuiltCandidateRequest,
  responseSchema: unknown,
  prompt: Readonly<Record<string, unknown>>,
): BuiltCandidateRequest {
  const body = JSON.parse(base.body) as {
    contents: readonly [{ role: string; parts: readonly [{ text: string }] }];
    generationConfig: Readonly<Record<string, unknown>>;
    readonly [key: string]: unknown;
  };
  const candidateBody = JSON.stringify({
    ...body,
    contents: [{
      ...body.contents[0],
      parts: [{ text: canonicalJsonV1(prompt) }],
    }],
    generationConfig: { ...body.generationConfig, responseSchema },
  });
  return Object.freeze({
    url: base.url,
    body: candidateBody,
    identity: deriveCandidateRequestIdentity({ url: base.url, body: candidateBody }),
  });
}

function frozenDialogueWindow(
  evaluationContext: readonly ShadowContextMessage[],
): readonly ShadowContextMessage[] {
  // The offline request builder already validates the full 1..15-message
  // window, including PII. Truncating again discards known inputs and blockers.
  return Object.freeze(evaluationContext.map((message) => Object.freeze({
    direction: message.direction,
    senderType: message.senderType,
    messageType: message.messageType,
    text: message.text,
    attachmentCount: message.attachmentCount,
    occurredAt: message.occurredAt,
  })));
}

function strategyActions(constraints: TrackCStrategistConstraints): readonly TrackCCanonicalAction[] {
  if (constraints.hardStop) return Object.freeze(["HOLD_POSITION"]);
  return Object.freeze([...constraints.permittedCanonicalActions]);
}

function strategistResponseSchema(
  constraints: TrackCStrategistConstraints,
  evidence: readonly TrackCSelectableEvidence[],
) {
  // USUAL_SIZE is a last-resort continuation. Keep it out of the provider
  // contract until the code-derived, latest-relevant dialogue state says that
  // measurements are unavailable; the compiler retains the same check as a
  // defense at the provider boundary.
  const continuationInputs = constraints.measurementsUnavailable
    ? ORDINARY_INPUTS
    : ORDINARY_INPUTS.filter((input) => input !== "USUAL_SIZE");
  const shared = {
    replyAct: { type: "STRING", enum: constraints.hardStop
      ? ["ACKNOWLEDGE"] : ["ANSWER", "ACKNOWLEDGE", "CLARIFY"] },
    goal: { type: "STRING", minLength: 1, maxLength: 500 },
    proposition: { type: "STRING", enum: TRACK_C_PROTECTED_PROPOSITIONS },
    evidenceRefs: {
      type: "ARRAY",
      minItems: 0,
      maxItems: 8,
      items: { type: "STRING", enum: evidence.map(({ ref }) => ref) },
    },
  };
  const ask = {
    type: "OBJECT",
    required: ["type", "input"],
    minProperties: 2,
    maxProperties: 2,
    properties: {
      type: { type: "STRING", enum: ["ASK"] },
      input: { type: "STRING", enum: continuationInputs },
    },
  };
  const keepOpen = {
    type: "OBJECT",
    required: ["type"],
    minProperties: 1,
    maxProperties: 1,
    properties: { type: { type: "STRING", enum: ["KEEP_OPEN"] } },
  };
  const actions = strategyActions(constraints);
  const noneAllowed = actions.includes("NONE");
  const requestedActions = actions.filter((action) => action !== "NONE");
  const variants: unknown[] = [];
  if (noneAllowed) {
    variants.push({
      type: "OBJECT",
      required: ["replyAct", "goal", "proposition", "evidenceRefs", "continuation", "canonicalAction"],
      minProperties: 6,
      maxProperties: 6,
      properties: {
        ...shared,
        continuation: { anyOf: [ask, keepOpen] },
        canonicalAction: { type: "STRING", enum: ["NONE"] },
      },
    });
  }
  if (requestedActions.length > 0) {
    variants.push({
      type: "OBJECT",
      required: ["replyAct", "goal", "proposition", "evidenceRefs", "continuation", "canonicalAction"],
      minProperties: 6,
      maxProperties: 6,
      properties: {
        ...shared,
        continuation: { type: "NULL" },
        canonicalAction: { type: "STRING", enum: requestedActions },
      },
    });
  }
  return { anyOf: variants };
}

function presentableEvidence(
  evidence: readonly TrackCSelectableEvidence[],
): readonly Readonly<Record<string, unknown>>[] {
  return Object.freeze(evidence.map(({ ref, capability, subject, value, deterministicText }) =>
    Object.freeze({
      ref,
      capability,
      ...(subject === undefined ? {} : { subject }),
      value,
      realizationSupported: deterministicText !== undefined,
      ...(deterministicText === undefined ? {} : { realizationText: deterministicText }),
    })
  ));
}

export function buildTrackCStrategistContractRequest(input: Readonly<{
  modelResource: string;
  context?: ContextV2;
  capture?: unknown;
  evaluationAt?: Date;
  evaluationContext: readonly ShadowContextMessage[];
  evidence: readonly TrackCSelectableEvidence[];
  constraints: TrackCStrategistConstraints;
}>): BuiltCandidateRequest {
  const context = input.context ?? contextFromFrozenTrackCCapture({
    capture: input.capture,
    evaluationAt: input.evaluationAt ?? new Date(Number.NaN),
  });
  const base = buildTrackCSharedCandidateRequest({
    modelResource: input.modelResource,
    context,
    evaluationContext: input.evaluationContext,
    systemInstruction: STRATEGIST_INSTRUCTION,
  });
  return narrowRequest(base, strategistResponseSchema(input.constraints, input.evidence), {
    contractVersion: "TRACK_C_C3_STRATEGIST_INPUT_V1",
    dialogue: frozenDialogueWindow(input.evaluationContext),
    selectableEvidence: presentableEvidence(input.evidence),
    canonicalContext: {
      productBinding: context.productBinding,
      dialogueEvidence: {
        act: context.dialogueEvidence.act,
        confidenceBand: context.dialogueEvidence.confidenceBand,
        reasonCodes: context.dialogueEvidence.reasonCodes,
      },
      activeBarriers: context.barriers.active,
      phase: context.phase.phase,
      sourceStage: context.phase.sourceStage,
      buyingIntent: {
        decision: context.buyingIntent.decision,
        requestedAction: context.buyingIntent.requestedAction,
      },
    },
    constraints: {
      permittedCanonicalActions: strategyActions(input.constraints),
      measurementsUnavailable: input.constraints.measurementsUnavailable,
      productResolved: input.constraints.productResolved,
      hardStop: input.constraints.hardStop,
      checkoutRequestedFields: input.constraints.checkoutRequestedFields ?? [],
    },
  });
}

function responderReadableEvidence(
  task: TrackCResponderTask,
): readonly Readonly<{ text: string }>[] {
  return Object.freeze(task.evidence.map((evidence) => {
    if (!trackCEvidenceHasSafeFactualEgress(evidence) ||
        evidence.deterministicText === undefined) {
      throw new Error("TRACK_C_RESPONDER_TASK_EVIDENCE_INVALID");
    }
    const factualText = text(
      evidence.deterministicText,
      "TRACK_C_DETERMINISTIC_EVIDENCE_NOT_PII_SAFE",
    );
    if (factualText === null) {
      throw new Error("TRACK_C_DETERMINISTIC_EVIDENCE_NOT_PII_SAFE");
    }
    assertNoEffectText(factualText);
    return Object.freeze({ text: factualText });
  }));
}

function modelAuthoredEvidence(
  _task: TrackCResponderTask,
): readonly TrackCSelectableEvidence[] {
  return Object.freeze([]);
}

function responderTaskPrompt(task: TrackCResponderTask) {
  return Object.freeze({
    answer: task.answer,
    evidence: responderReadableEvidence(task),
    // Capability names only: enough for the Responder to know part of the
    // question is not covered, with none of the underlying values.
    ...(task.unrealizedEvidence.length === 0 ? {} : {
      unrealizedCapabilities: Object.freeze(
        [...new Set(task.unrealizedEvidence.map(({ capability }) => capability))],
      ),
    }),
    continuation: task.continuation,
    canonicalRequest: task.canonicalRequest,
    ...(task.deliveryDeadlineText === undefined ? {} : {
      deliveryDeadlineText: task.deliveryDeadlineText,
    }),
  });
}

function responderNeedsModelProgression(task: TrackCResponderTask): boolean {
  return task.canonicalRequest?.type === "ASK_PRODUCT" ||
    task.canonicalRequest?.type === "ASK_MEASUREMENTS" ||
    task.continuation?.type === "ASK";
}

function usesBoundedAcknowledgement(task: TrackCResponderTask): boolean {
  return task.canonicalRequest?.type !== "ASK_CHECKOUT_DETAILS" &&
    (task.answer.kind !== "ANSWER" || task.answer.evidenceStatus === "NOT_APPLICABLE");
}

function acknowledgementWording(context: ContextV2): readonly string[] {
  // The frozen benchmark and some live paths have no objection reason code.
  // These choices say nothing about shop facts or effects; the Responder uses
  // the full dialogue to choose one, while the guard still checks exact text.
  return context.buyingIntent.decision === "COMMITTED" &&
      context.buyingIntent.requestedAction === "PROCEED_TO_PAYMENT"
    ? [...BOUNDED_ACKNOWLEDGEMENTS, "Dạ, em nắm ý chị muốn chốt mẫu này ạ."]
    : BOUNDED_ACKNOWLEDGEMENTS;
}

function answerWording(
  task: TrackCResponderTask,
  conversationLane: TrackCConversationLane,
  context: ContextV2,
): readonly string[] {
  const acknowledgements = conversationLane === "FIRST_CONTACT_FIXED" ||
      task.answer.kind === "CLARIFY" ||
      task.canonicalRequest?.type === "HOLD_POSITION"
    ? BOUNDED_ACKNOWLEDGEMENTS : acknowledgementWording(context);
  if (usesBoundedAcknowledgement(task)) return acknowledgements;
  if (conversationLane === "ADAPTIVE_FOLLOWUP" &&
      task.canonicalRequest?.type !== "ASK_CHECKOUT_DETAILS" &&
      task.answer.kind === "ANSWER" && task.answer.evidenceStatus === "SUPPORTED") {
    // Reuse the existing wording surface. Authority support must not prevent
    // the Responder from realizing uncertainty already identified in the goal.
    return [...acknowledgements, UNRESOLVED_ANSWER_TEXT];
  }
  return [];
}

function requestWording(task: TrackCResponderTask): readonly string[] {
  const canonical = task.canonicalRequest?.type;
  if (canonical === "ASK_PRODUCT" || canonical === "ASK_MEASUREMENTS") {
    return REQUEST_WORDING[canonical];
  }
  return task.continuation?.type === "ASK"
    ? REQUEST_WORDING[task.continuation.input] : [];
}

function responderDraftSchema(
  task: TrackCResponderTask,
  conversationLane: TrackCConversationLane,
  context: ContextV2,
) {
  const needsProgression = responderNeedsModelProgression(task);
  const factualEvidenceCount = modelAuthoredEvidence(task).length;
  const boundedAcknowledgement = usesBoundedAcknowledgement(task);
  const answers = answerWording(task, conversationLane, context);
  return {
    type: "OBJECT",
    required: ["answerText", "factualTexts", "progressionText"],
    minProperties: 3,
    maxProperties: 3,
    properties: {
      answerText: boundedAcknowledgement
        ? { type: "STRING", enum: answers }
        : answers.length > 0
          ? { anyOf: [{ type: "NULL" }, { type: "STRING", enum: answers }] }
          : { type: "NULL" },
      factualTexts: {
        type: "ARRAY",
        minItems: factualEvidenceCount,
        maxItems: factualEvidenceCount,
        items: { type: "STRING", minLength: 1, maxLength: 1_000 },
      },
      progressionText: needsProgression
        ? { type: "STRING", enum: requestWording(task) }
        : { type: "NULL" },
    },
  };
}

function buildTrackCResponderContractRequest(input: Readonly<{
  modelResource: string;
  context: ContextV2;
  evaluationContext: readonly ShadowContextMessage[];
  task: TrackCResponderTask;
  conversationLane: TrackCConversationLane;
}>): BuiltCandidateRequest {
  const base = buildTrackCSharedCandidateRequest({
    modelResource: input.modelResource,
    context: input.context,
    evaluationContext: input.evaluationContext,
    systemInstruction: RESPONDER_INSTRUCTION,
  });
  return narrowRequest(base, responderDraftSchema(
    input.task, input.conversationLane, input.context,
  ), {
    contractVersion: "TRACK_C_C3_RESPONDER_INPUT_V1",
    dialogue: frozenDialogueWindow(input.evaluationContext),
    customerDecisionSignals: {
      act: input.context.dialogueEvidence.act,
      confidenceBand: input.context.dialogueEvidence.confidenceBand,
      reasonCodes: input.context.dialogueEvidence.reasonCodes,
    },
    responderTask: responderTaskPrompt(input.task),
  });
}

function text(value: unknown, errorCode: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim() || value !== value.trim() ||
      value.length > 1_000) {
    throw new Error(errorCode);
  }
  const redacted = redactAnalyticsMessage(value);
  if (redacted.dlpStatus !== "PASSED" || redacted.text !== value) {
    throw new Error(errorCode);
  }
  return value;
}

function parseResponderDraft(value: unknown, task: TrackCResponderTask): ResponderDraft {
  const record = plainObject(value, "TRACK_C_RESPONDER_DRAFT_INVALID");
  exactKeys(record, ["answerText", "factualTexts", "progressionText"],
    "TRACK_C_RESPONDER_DRAFT_INVALID");
  if (!Array.isArray(record.factualTexts) ||
      record.factualTexts.length !== modelAuthoredEvidence(task).length) {
    throw new Error("TRACK_C_RESPONDER_DRAFT_INVALID");
  }
  return Object.freeze({
    answerText: text(record.answerText, "TRACK_C_RESPONDER_DRAFT_INVALID"),
    factualTexts: Object.freeze(record.factualTexts.map((item) => {
      const result = text(item, "TRACK_C_RESPONDER_DRAFT_INVALID");
      if (result === null) throw new Error("TRACK_C_RESPONDER_DRAFT_INVALID");
      return result;
    })),
    // Exact schema vocabulary contains no customer values. Resolve it to the
    // code-owned string before DLP, which can mistake a locality question for
    // an address. Any other text still goes through DLP and final validation.
    progressionText: requestWording(task).find((wording) =>
      wording === record.progressionText
    ) ?? text(record.progressionText, "TRACK_C_RESPONDER_DRAFT_INVALID"),
  });
}

function assertNoEffectText(value: string | null): void {
  if (value !== null &&
      /\b(?:em|shop)\s+đã\s+(?:tạo|đặt|xác\s*nhận|gửi|cập\s*nhật)\b/iu.test(value)) {
    throw new Error("TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN");
  }
}

function expectedStrategy(task: TrackCResponderTask): ContextV2CandidateOutputV2["strategy"] {
  if (task.canonicalRequest?.type === "HOLD_POSITION") return "HOLD_POSITION";
  if (task.canonicalRequest !== null || task.continuation?.type === "ASK" ||
      task.answer.kind === "CLARIFY") return "ASK_CLARIFICATION";
  return "ANSWER_VERIFIED_FACTS";
}

function expectedCta(task: TrackCResponderTask): ContextV2CandidateOutputV2["cta"] {
  const action = task.canonicalRequest?.type;
  return action === "ASK_PRODUCT" ? "ASK_PRODUCT" :
    action === "ASK_MEASUREMENTS" ? "ASK_MEASUREMENTS" :
    action === "ASK_CHECKOUT_DETAILS" ? "ASK_CHECKOUT_DETAILS" : "NONE";
}

function deterministicCheckoutText(
  fields: readonly CheckoutField[],
  paymentOptions: readonly ("COD" | "BANK_TRANSFER")[],
): string {
  const labels: Record<CheckoutField, string> = {
    FULL_NAME: "họ tên",
    PHONE: "số điện thoại",
    ADDRESS: "địa chỉ nhận hàng",
    PAYMENT_METHOD: paymentOptions.includes("BANK_TRANSFER")
      ? "hình thức thanh toán (COD hoặc chuyển khoản)"
      : "hình thức thanh toán COD",
  };
  const names = fields.map((field) => labels[field]);
  const joined = names.length === 1 ? names[0]! : names.length === 2
    ? `${names[0]!} và ${names[1]!}`
    : `${names.slice(0, -1).join(", ")} và ${names.at(-1)!}`;
  return `Chị cho em xin ${joined} để tiếp tục nhé.`;
}

function assertProgression(task: TrackCResponderTask, draft: ResponderDraft): void {
  if (task.continuation?.type === "KEEP_OPEN") {
    if (draft.progressionText !== null) {
      throw new Error("TRACK_C_RESPONDER_KEEP_OPEN_INVALID");
    }
    return;
  }
  if (task.canonicalRequest?.type === "HOLD_POSITION") {
    if (draft.progressionText !== null || draft.answerText === null) {
      throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
    }
    return;
  }
  if (task.canonicalRequest?.type === "ASK_CHECKOUT_DETAILS") {
    if (draft.answerText !== null || draft.progressionText !== null) {
      throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
    }
    return;
  }
  const needsProgression = responderNeedsModelProgression(task);
  if (needsProgression !== (draft.progressionText !== null)) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  if (draft.progressionText !== null &&
      !requestWording(task).includes(draft.progressionText)) {
    throw new Error("TRACK_C_RESPONDER_REQUEST_WORDING_INVALID");
  }
}

function deterministicDeadlineFeasibilityText(
  task: TrackCResponderTask,
  constraint: TrackCDeliveryDeadlineConstraint | null,
): string | null {
  if (constraint === null || task.answer.kind !== "ANSWER" ||
      task.answer.proposition !== "ETA") return null;
  const eta = task.evidence.find(({ capability }) => capability === "ETA");
  const minDays = eta?.value.minDays;
  const maxDays = eta?.value.maxDays;
  if (!Number.isInteger(minDays) || !Number.isInteger(maxDays) ||
      (minDays as number) < 0 || (maxDays as number) < (minDays as number)) {
    return null;
  }
  return (maxDays as number) > constraint.maxDeliveryDays
    ? "Với mốc nhận hàng đã xác định, khoảng giao dự kiến này không bảo đảm kịp mốc đó ạ."
    : null;
}

function compileResponderDraft(input: Readonly<{
  context: ContextV2;
  task: TrackCResponderTask;
  draft: ResponderDraft;
  lane: TrackCV5ExecutionLane;
  conversationLane: TrackCConversationLane;
  evaluationAt: Date;
  currentCart?: TrackCCurrentCartBinding | null;
  paymentOptions?: readonly ("COD" | "BANK_TRANSFER")[];
}>): ContextV2CandidateOutputV2 {
  const { task, draft } = input;
  if (draft.answerText !== null &&
      !answerWording(task, input.conversationLane, input.context).includes(draft.answerText)) {
    throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  }
  if (usesBoundedAcknowledgement(task) && draft.answerText === null) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
  // Selectable evidence already has a customer-ready deterministic factual
  // projection. The Responder never owns factual wording.
  const authoredEvidence = modelAuthoredEvidence(task);
  if (authoredEvidence.length !== 0 || draft.factualTexts.length !== 0) {
    throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  }
  assertProgression(task, draft);
  const segments: ContextV2CandidateOutputV2["segments"] = [];
  if (task.answer.kind === "ANSWER" && task.answer.evidenceStatus === "UNRESOLVED") {
    segments.push({ kind: "GENERAL", text: UNRESOLVED_ANSWER_TEXT });
  } else if (draft.answerText !== null && draft.answerText !== UNRESOLVED_ANSWER_TEXT) {
    segments.push({ kind: "GENERAL", text: draft.answerText });
  }
  const multipleSubjects = new Set(task.evidence.flatMap(({ subject }) =>
    subject?.productId === undefined ? [] : [subject.productId]
  )).size > 1;
  task.evidence.forEach((evidence) => {
    const factualText = evidence.deterministicText === undefined
      ? null
      : text(
          evidence.deterministicText,
          "TRACK_C_DETERMINISTIC_EVIDENCE_NOT_PII_SAFE",
        );
    if (factualText === null) {
      throw new Error(
        evidence.deterministicText === undefined
          ? "TRACK_C_RESPONDER_TASK_EVIDENCE_INVALID"
          : "TRACK_C_DETERMINISTIC_EVIDENCE_NOT_PII_SAFE",
      );
    }
    assertNoEffectText(factualText);
    if (multipleSubjects && evidence.subject?.productId !== undefined) {
      const label = text(evidence.subject.displayName,
        "TRACK_C_EVIDENCE_SUBJECT_LABEL_UNAVAILABLE");
      if (label === null) throw new Error("TRACK_C_EVIDENCE_SUBJECT_LABEL_UNAVAILABLE");
      assertNoEffectText(label);
      segments.push({ kind: "GENERAL", text: `Với mẫu ${label}:` });
    }
    segments.push({
      kind: "VERIFIED_CLAIM",
      text: factualText,
      claimContentHash: evidence.provenance.contentHash,
    });
  });
  if (draft.answerText === UNRESOLVED_ANSWER_TEXT) {
    segments.push({ kind: "GENERAL", text: draft.answerText });
  }
  // Only when facts were actually stated: an UNRESOLVED answer already opened
  // with its own uncertainty sentence, so a second one would repeat it.
  if (task.unrealizedEvidence.length > 0 &&
      task.answer.kind === "ANSWER" &&
      task.answer.evidenceStatus === "SUPPORTED" &&
      draft.answerText !== UNRESOLVED_ANSWER_TEXT) {
    segments.push({ kind: "GENERAL", text: PARTIAL_REALIZATION_TEXT });
  }
  if (task.deliveryDeadlineText !== undefined) {
    segments.push({ kind: "GENERAL", text: task.deliveryDeadlineText });
  }
  if (task.canonicalRequest?.type === "ASK_CHECKOUT_DETAILS") {
    segments.push({
      kind: "ACTION_REQUEST",
      action: "PROVIDE_CHECKOUT_DETAILS",
      text: deterministicCheckoutText(
        task.canonicalRequest.requestedFields ?? [],
        input.paymentOptions ?? ["COD", "BANK_TRANSFER"],
      ),
    });
  } else if (task.canonicalRequest?.type === "ASK_PRODUCT") {
    segments.push({
      kind: "CLARIFICATION",
      target: "PRODUCT",
      text: draft.progressionText!,
    });
  } else if (task.canonicalRequest?.type === "ASK_MEASUREMENTS") {
    segments.push({
      kind: "CLARIFICATION",
      target: "MEASUREMENTS",
      text: draft.progressionText!,
    });
  } else if (draft.progressionText !== null) {
    segments.push({ kind: "GENERAL", text: draft.progressionText });
  }
  const semanticOutput = {
    segments,
    strategy: expectedStrategy(task),
    cta: expectedCta(task),
  };
  const simulationHashes = task.evidence.flatMap(({ provenance }) =>
    provenance.authority === "SIMULATION" ? [provenance.contentHash] : []
  );
  const validated = validateResponderOutput(
    input.context,
    semanticOutput,
    input.lane,
    input.evaluationAt,
    simulationHashes,
    input.currentCart ?? null,
  );
  if (task.canonicalRequest?.type !== "ASK_CHECKOUT_DETAILS" &&
      validated.segments.some(({ text }) =>
        /(?:họ\s*(?:và\s*)?tên|số\s*điện\s*thoại|\bsđt\b|\bsdt\b|địa\s*chỉ\s*(?:nhận|giao)\s*hàng)/iu
          .test(text.normalize("NFC"))
      )) {
    throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  }
  return validated;
}

function explicitStopRequested(dialogue: readonly ShadowContextMessage[]): boolean {
  const latestInbound = [...dialogue].reverse().find(({ direction }) =>
    direction === "INBOUND"
  );
  return latestInbound !== undefined &&
    /^\s*(?:(?:dạ\s*)?(?:chị|mình)\s*)?(?:dừng(?:\s+lại|\s+ở\s+đây)?|không\s+cần(?:\s+(?:hỗ\s+trợ|tư\s+vấn))?\s+nữa)(?:\s+(?:nhé|ạ|em|chị|mình|đừng\s+hỏi\s+thêm|nữa)|[,!.…])*\s*$/iu
      .test(latestInbound.text.normalize("NFC"));
}

function measurementsUnavailable(dialogue: readonly ShadowContextMessage[]): boolean {
  const unavailable = /(?:không|chưa)\s+(?:có|biết|đo(?:\s+được)?)\s+(?:số\s*đo|chiều\s*cao|cân\s*nặng)/iu;
  const provided = /(?:\b\d{2,3}\s*(?:cm|kg)\b|\b\d(?:[.,]\d+)?\s*m\s*\d{1,2}\b|(?:đã\s+)?(?:có|gửi)\s+(?:số\s*đo|chiều\s*cao|cân\s*nặng))/iu;
  const latest = [...dialogue].reverse().find(({ direction, text }) =>
    direction === "INBOUND" &&
    (unavailable.test(text.normalize("NFC")) || provided.test(text.normalize("NFC")))
  );
  return latest !== undefined && unavailable.test(latest.text.normalize("NFC"));
}

function validMetadata(entry: unknown): entry is TrackCV5SimulationMetadata {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return false;
  const record = entry as Readonly<Record<string, unknown>>;
  if (record.kind === "TRACK_C_TRUSTED_ACQUISITION_V1") {
    return canonicalJsonV1(Object.keys(record).sort()) === canonicalJsonV1([
      "authorization", "firstMeaningfulInbound", "kind", "origin",
    ]) && record.origin === "ADVERTISEMENT" &&
      typeof record.firstMeaningfulInbound === "boolean" && record.authorization === "NONE";
  }
  if (record.kind === "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1") {
    const fields = record.missingFields;
    return canonicalJsonV1(Object.keys(record).sort()) === canonicalJsonV1([
      "authorization", "kind", "missingFields", "state",
    ]) && (record.state === "REQUIRED" || record.state === "COMPLETE") &&
      record.authorization === "NONE" && Array.isArray(fields) &&
      fields.every((field) => CHECKOUT_FIELDS.has(field as string)) &&
      new Set(fields).size === fields.length &&
      (record.state === "COMPLETE") === (fields.length === 0);
  }
  return false;
}

function constraintsFor(
  context: ContextV2,
  metadata: readonly TrackCV5SimulationMetadata[],
  dialogue: readonly ShadowContextMessage[],
  canonicalCheckoutRequestedFields?: readonly TrackCCheckoutField[],
  checkoutClarificationActive = false,
): TrackCStrategistConstraints {
  if (!metadata.every(validMetadata)) {
    throw new Error("TRACK_C_V5_SIMULATION_METADATA_INVALID");
  }
  const hardStop = context.buyingIntent.decision === "NEGATED" ||
    context.phase.phase === "ORDER_CONFIRMED" || explicitStopRequested(dialogue);
  const productResolved = context.productBinding.status === "RESOLVED" &&
    !context.barriers.active.includes("PRODUCT_CONTEXT_UNREADY");
  const checkout = metadata.find((entry) =>
    entry.kind === "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1" &&
    entry.state === "REQUIRED"
  );
  const checkoutRequestedFields = canonicalCheckoutRequestedFields ?? (checkout?.kind ===
      "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1"
    ? checkout.missingFields : []);
  if (hardStop) {
    return Object.freeze({
      permittedCanonicalActions: Object.freeze(["HOLD_POSITION"] as const),
      measurementsUnavailable: false,
      productResolved,
      hardStop: true,
    });
  }
  if (!productResolved) {
    return Object.freeze({
      permittedCanonicalActions: Object.freeze(["NONE", "ASK_PRODUCT"] as const),
      measurementsUnavailable: false,
      productResolved: false,
      hardStop: false,
    });
  }
  const unavailable = measurementsUnavailable(dialogue);
  const permittedCanonicalActions: TrackCCanonicalAction[] = ["NONE"];
  // The fixed first-contact lane owns its fit question. In adaptive turns,
  // canonical fit readiness must identify a measurement blocker before this
  // action is offered; a resolved product alone does not authorize a new fit
  // funnel after an unrelated question.
  if (!unavailable && context.barriers.active.includes("MEASUREMENTS_REQUIRED")) {
    permittedCanonicalActions.push("ASK_MEASUREMENTS");
  }
  // Ask for the missing details at the state the runtime actually reaches.
  //
  // Requiring ORDER_PREVIEW made this unreachable: the runtime only builds a
  // preview once checkout data is complete and revalidation passed, so a
  // preview never coexists with missing fields. The runtime raises its
  // CHECKOUT_DETAILS_MISSING clarification while the cart is open, so an open
  // cart is the state that permits the request. ORDER_PREVIEW stays permitted
  // for the case where a later mutation invalidates a previously complete draft.
  const checkoutStageReached =
    context.phase.sourceStage === "CART_OPEN" ||
    context.phase.sourceStage === "ORDER_PREVIEW";
  const checkoutAuthorized = (checkoutClarificationActive ||
      (context.buyingIntent.decision === "COMMITTED" &&
       context.buyingIntent.requestedAction === "PROCEED_TO_PAYMENT")) &&
    checkoutStageReached &&
    !context.barriers.active.includes("MEASUREMENTS_REQUIRED") &&
    checkoutRequestedFields.length > 0;
  if (checkoutAuthorized) {
    permittedCanonicalActions.push("ASK_CHECKOUT_DETAILS");
  }
  return Object.freeze({
    permittedCanonicalActions: Object.freeze(permittedCanonicalActions),
    measurementsUnavailable: unavailable,
    productResolved: true,
    hardStop: false,
    ...(checkoutAuthorized ? {
      checkoutRequestedFields: Object.freeze([...checkoutRequestedFields]),
    } : {}),
  });
}

function validatedDeliveryDeadlineConstraint(
  value: TrackCDeliveryDeadlineConstraint | undefined,
): TrackCDeliveryDeadlineConstraint | null {
  if (value === undefined) return null;
  if (canonicalJsonV1(Object.keys(value).sort()) !==
      canonicalJsonV1(["maxDeliveryDays"]) ||
      !Number.isInteger(value.maxDeliveryDays) || value.maxDeliveryDays < 0) {
    throw new Error("TRACK_C_DEADLINE_CONSTRAINT_INVALID");
  }
  return Object.freeze({ maxDeliveryDays: value.maxDeliveryDays });
}

function fixedTask(
  context: ContextV2,
  evidence: readonly TrackCSelectableEvidence[],
): TrackCResponderTask {
  const presentation = evidence.find(({ capability }) =>
    capability === "PRODUCT_PRESENTATION"
  );
  const colors = presentation?.value.colors;
  const colorChoiceMeaningful = Array.isArray(colors) &&
    new Set(colors.filter((color) => typeof color === "string")).size > 1;
  return compileTrackCFixedFirstContactTask({
    productResolved: context.productBinding.status === "RESOLVED",
    classificationOrVariantRequired: context.productBinding.status !== "RESOLVED" ||
      context.productBinding.productIds.length !== 1 ||
      context.barriers.active.includes("PRODUCT_CONTEXT_UNREADY"),
    colorChoiceMeaningful,
    evidence,
    boundProductIds: context.productBinding.productIds,
  });
}

type TrackCStrategyCoreInput = Omit<TrackCStrategyContractCaseInput, "capture"> & Readonly<{
  context: ContextV2;
  canonicalCheckoutRequestedFields?: readonly TrackCCheckoutField[];
  checkoutClarificationActive?: boolean;
  currentCart?: TrackCCurrentCartBinding | null;
  paymentOptions?: readonly ("COD" | "BANK_TRANSFER")[];
}>;

async function runTrackCStrategyContractCore(
  input: TrackCStrategyCoreInput,
): Promise<TrackCStrategyContractCaseResult> {
  const context = input.context;
  if (context.ownership.owner !== "BOT" || context.ownership.handoffActive) {
    throw new Error("TRACK_C_V5_GENERATION_OWNER_FORBIDDEN");
  }
  const simulationFacts = input.simulationFacts ?? [];
  const simulationMetadata = input.simulationMetadata ?? [];
  const trustedAcquisition = input.trustedAcquisition;
  const deliveryDeadlineConstraint = validatedDeliveryDeadlineConstraint(
    input.deliveryDeadlineConstraint,
  );
  if (trustedAcquisition !== undefined &&
      !isTrackCTrustedAcquisitionMetadata(trustedAcquisition)) {
    throw new Error("TRACK_C_ACQUISITION_METADATA_INVALID");
  }
  if (input.lane !== "BEHAVIOR_SIMULATION" &&
      (simulationFacts.length > 0 || simulationMetadata.length > 0)) {
    throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  }
  let evidence: readonly TrackCSelectableEvidence[];
  try {
    evidence = buildTrackCSelectableEvidence({
      context,
      simulationFacts,
      executionLane: input.lane,
      currentCart: input.currentCart ?? null,
      evaluationAt: input.evaluationAt,
    });
  } catch (error) {
    throw stageFailure("EVIDENCE", null, error);
  }
  if (simulationMetadata.some((entry) =>
    entry.kind === "TRACK_C_TRUSTED_ACQUISITION_V1"
  )) {
    throw new Error("TRACK_C_EXTERNAL_SIMULATION_METADATA_FORBIDDEN");
  }
  const lane = selectTrackCConversationLane(
    trustedAcquisition === undefined ? [] : [trustedAcquisition],
  );
  const constraints = constraintsFor(
    context, simulationMetadata, input.evaluationContext,
    input.canonicalCheckoutRequestedFields,
    input.checkoutClarificationActive,
  );
  let strategistRequestEnvelopeHash: string | null = null;
  let conversationPlan: TrackCResponderTask | TrackCStrategistDecision;
  let task: TrackCResponderTask;
  if (lane === "FIRST_CONTACT_FIXED") {
    task = constraints.hardStop
      ? compileTrackCStrategistDecision({
          ...constraints,
          evidence,
          boundProductIds: context.productBinding.productIds,
          decision: {
            replyAct: "ACKNOWLEDGE", goal: "Respect the canonical hard stop.",
            proposition: "NONE", evidenceRefs: [], continuation: null,
            canonicalAction: "HOLD_POSITION",
          },
        }).task
      : fixedTask(context, evidence);
    conversationPlan = task;
  } else {
    const strategistRequest = buildTrackCStrategistContractRequest({
      modelResource: input.modelResource,
      context,
      evaluationContext: input.evaluationContext,
      evidence,
      constraints,
    });
    let strategistPayload: unknown = null;
    try {
      const strategistResponse = await input.transport.send({
        url: strategistRequest.url,
        body: strategistRequest.body,
        ...(input.signal === undefined ? {} : { signal: input.signal }),
      });
      strategistPayload = strategistResponse.payload;
      assertProviderIdentity(strategistResponse.providerModelVersion);
      const decision = providerJson(
        strategistPayload,
        "TRACK_C_STRATEGIST_OUTPUT_INVALID",
      );
      const compiled = compileTrackCStrategistDecision({
        decision,
        evidence,
        permittedCanonicalActions: constraints.permittedCanonicalActions,
        measurementsUnavailable: constraints.measurementsUnavailable,
        productResolved: constraints.productResolved,
        hardStop: constraints.hardStop,
        boundProductIds: context.productBinding.productIds,
        ...(constraints.checkoutRequestedFields === undefined
          ? {} : { checkoutRequestedFields: constraints.checkoutRequestedFields }),
      });
      task = compiled.task;
      conversationPlan = compiled.decision;
    } catch (error) {
      const capabilityGap = error instanceof Error &&
        (error.message === "TRACK_C_EVIDENCE_REALIZATION_UNSUPPORTED" ||
         error.message === "TRACK_C_EVIDENCE_SUBJECT_LABEL_UNAVAILABLE");
      throw stageFailure(capabilityGap ? "EVIDENCE" : "STRATEGIST", strategistPayload, error);
    }
    strategistRequestEnvelopeHash = strategistRequest.identity.requestEnvelopeHash;
  }
  const deadlineText = deterministicDeadlineFeasibilityText(task, deliveryDeadlineConstraint);
  if (deadlineText !== null) {
    task = Object.freeze({ ...task, deliveryDeadlineText: deadlineText });
  }
  const responderRequest = buildTrackCResponderContractRequest({
    modelResource: input.modelResource,
    context,
    evaluationContext: input.evaluationContext,
    task,
    conversationLane: lane,
  });
  let responderPayload: unknown = null;
  let draft: ResponderDraft;
  try {
    const responderResponse = await input.transport.send({
      url: responderRequest.url,
      body: responderRequest.body,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    });
    responderPayload = responderResponse.payload;
    assertProviderIdentity(responderResponse.providerModelVersion);
    draft = parseResponderDraft(
      providerJson(responderPayload, "TRACK_C_RESPONDER_DRAFT_INVALID"),
      task,
    );
  } catch (error) {
    throw stageFailure("RESPONDER", responderPayload, error);
  }
  let output: ContextV2CandidateOutputV2;
  try {
    output = compileResponderDraft({
      context,
      task,
      draft,
      lane: input.lane,
      conversationLane: lane,
      evaluationAt: input.evaluationAt,
      currentCart: input.currentCart ?? null,
      ...(input.paymentOptions === undefined ? {} : { paymentOptions: input.paymentOptions }),
    });
  } catch (error) {
    throw stageFailure("FINAL_GUARD", responderPayload, error);
  }
  const decisionHash = sha256(conversationPlan);
  const identity = Object.freeze({
    captureContextHash: context.contextHash,
    strategistRequestEnvelopeHash,
    decisionHash,
    responderRequestEnvelopeHash: responderRequest.identity.requestEnvelopeHash,
    responseOutputHash: sha256(output),
    compositionHash: sha256({
      conversationLane: lane,
      strategistRequestEnvelopeHash,
      task,
      output,
    }),
  });
  return Object.freeze({
    contractVersion: "TRACK_C_C3_STRATEGY_CONTRACT_RESULT_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    executionLane: input.lane,
    conversationLane: lane,
    conversationPlan,
    responderTask: task,
    output,
    reply: output.segments.map(({ text }) => text).join("\n"),
    identity,
  });
}

/** Frozen replay keeps its original admission and evaluation-only contract. */
export async function runTrackCStrategyContractCase(
  input: TrackCStrategyContractCaseInput,
): Promise<TrackCStrategyContractCaseResult> {
  const context = contextFromFrozenTrackCCapture({
    capture: input.capture,
    evaluationAt: input.evaluationAt,
  });
  const { capture: _capture, ...coreInput } = input;
  return runTrackCStrategyContractCore({ ...coreInput, context });
}

/** Live adapter accepts only a validated pre-decision context and canonical fields. */
export async function runTrackCStrategyLive(
  input: TrackCStrategyLiveInput,
): Promise<Pick<TrackCStrategyContractCaseResult,
  "conversationLane" | "conversationPlan" | "responderTask" | "output" | "reply" | "identity">> {
  if ("simulationFacts" in input || "simulationMetadata" in input ||
      "capture" in input) {
    throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  }
  const context = parseContextV2WithIntegrity(input.context);
  if (input.checkoutRequestedFields.some((field) => !CHECKOUT_FIELDS.has(field)) ||
      input.paymentOptions.length === 0 ||
      input.paymentOptions.some((option) => option !== "COD" && option !== "BANK_TRANSFER") ||
      context.phase.sourceStage !== "CART_OPEN" &&
        context.phase.sourceStage !== "ORDER_PREVIEW" &&
        input.checkoutRequestedFields.length > 0) {
    throw new Error("TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_INVALID");
  }
  const result = await runTrackCStrategyContractCore({
    lane: "PRODUCTION_CONTRACT",
    context,
    modelResource: input.modelResource,
    evaluationAt: input.decisionAt,
    evaluationContext: input.dialogue,
    simulationFacts: [],
    simulationMetadata: [],
    canonicalCheckoutRequestedFields: input.checkoutRequestedFields,
    checkoutClarificationActive: input.checkoutClarificationActive,
    currentCart: input.currentCart,
    paymentOptions: input.paymentOptions,
    ...(input.trustedAcquisition === undefined
      ? {} : { trustedAcquisition: input.trustedAcquisition }),
    transport: input.transport,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  return Object.freeze({
    conversationLane: result.conversationLane,
    conversationPlan: result.conversationPlan,
    responderTask: result.responderTask,
    output: result.output,
    reply: result.reply,
    identity: result.identity,
  });
}
