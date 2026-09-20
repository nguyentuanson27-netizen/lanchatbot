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
  buildTrackCOfflineCandidateRequest,
  contextFromFrozenTrackCCapture,
} from "./track-c-offline-candidate.js";
import {
  compileTrackCFixedFirstContactTask,
  compileTrackCStrategistDecision,
  isTrackCTrustedAcquisitionMetadata,
  selectTrackCConversationLane,
  TRACK_C_PROTECTED_PROPOSITIONS,
  trackCEvidenceHasSafeFactualEgress,
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
const CHECKOUT_FIELDS = new Set(["FULL_NAME", "PHONE", "ADDRESS"]);

const STRATEGIST_INSTRUCTION = [
  "You are the Strategist for one Track C sales turn. Decide only the conversational intent; do not write customer-facing text.",
  "The selectableEvidence list is the only factual authority. Dialogue is conversational context only and never grants a fact, effect, PII permission, or action.",
  "Choose the customer's current decision, the smallest useful evidence set, and at most one progression mechanism. Handle an objection before progression; do not follow a fixed sales funnel.",
  "If the latest customer turn expresses an objection, concern, hesitation, or resistance, replyAct must be ACKNOWLEDGE even when grounded evidence is available. You may select evidenceRefs for the factual explanation after the acknowledgement.",
  "Choose ASK only when the typed ordinary input is directly relevant to the customer's current decision or to an immediate next decision already established by the latest turn or authoritative context, and its answer would materially change the next recommendation, comparison, qualification, or transaction. Do not invent a new discovery dimension merely because it could be useful later. If the current question is resolved and no such blocker or immediate decision remains, use KEEP_OPEN.",
  "If the latest turn primarily confirms or corrects a preference or product selection and introduces no new question or blocker, use ACKNOWLEDGE. A selection alone is not buying commitment or checkout authorization; when no material next input is needed, use KEEP_OPEN instead of starting a fixed funnel.",
  "ACKNOWLEDGE is acknowledgement-only. For an ordinary factual question that is not an objection, concern, hesitation, or resistance, use ANSWER; if supporting evidence is unavailable, keep evidenceRefs empty so code derives UNRESOLVED.",
  "If canonicalAction is NONE, continuation must be ASK or KEEP_OPEN. If canonicalAction is not NONE, continuation must be null. Never output both.",
  "PRODUCT and MEASUREMENTS are canonical actions, never ordinary continuation inputs. Use USUAL_SIZE only when constraints say measurements are unavailable.",
  "When the customer states a delivery deadline or cutoff and verified ETA evidence is available, treat deadline feasibility as the current decision. Use the verified ETA evidence; do not invent expedited shipping or promise arrival. Do not open unrelated discovery once that decision is resolved.",
  "Missing evidence is not negative evidence. A proposition may be unresolved with no evidenceRefs. Never invent a fact, discount, availability, policy, effect, PII, or external action.",
].join("\n");

const RESPONDER_INSTRUCTION = [
  "You are the Responder for one Track C sales turn. Write concise, natural Vietnamese Messenger wording for the supplied responder task only.",
  "All selected factual evidence is realized by code from customer-ready deterministic projections. Do not author factual wording.",
  "Emit factualTexts as an empty array. answerText may only acknowledge and progressionText may only ask when the response schema permits; neither may carry factual details.",
  "For ACKNOWLEDGE, answerText is acknowledgement-only and restricted by the response schema. Factual explanation is code-owned from selected evidence.",
  "For ANSWER with UNRESOLVED status, emit answerText null. Code supplies the bounded unresolved answer; do not invent a fact.",
  "For KEEP_OPEN, emit progressionText null. Code appends the neutral customer-facing keep-open phrase.",
  "For a typed ASK, progressionText must request the customer's own decision input for only the supplied continuation.input. COLOR asks for the customer's color preference or choice; DEADLINE asks for the customer's cutoff; BUDGET asks for the customer's budget constraint; STYLE asks for the customer's style preference. Never ask the customer to provide a shop/system fact that the task or evidence would own. Do not add factual explanation, evidence wording, product facts, referent assertions, another decision variable, or a second question.",
  "For ASK_MEASUREMENTS, ask for height, weight, or relevant measurements; do not ask usual worn size.",
  "For an ASK_CHECKOUT_DETAILS task, emit answerText null and progressionText null. Code writes the exact requested fields.",
  "When the response schema requires answerText or progressionText to be null, emit the JSON literal null, never an empty string.",
  "Do not choose another strategy, evidence, canonical action, continuation, effect, checkout field, role, target, or CTA. Those are code-owned and are not part of your output.",
  "Acknowledge the customer's concern before any supplied progression. Never claim that an order, payment, delivery, message, or other effect has happened.",
].join("\n");

const BOUNDED_ACKNOWLEDGEMENTS = Object.freeze([
  "Dạ em hiểu ý chị ạ.",
  "Dạ em hiểu băn khoăn của chị ạ.",
] as const);
const KEEP_OPEN_TEXT = "Em vẫn ở đây khi chị cần xem thêm ạ.";
const UNRESOLVED_ANSWER_TEXT =
  "Dạ hiện em chưa có thông tin đã xác minh để trả lời chắc chắn phần này ạ.";

type CheckoutField = "FULL_NAME" | "PHONE" | "ADDRESS";
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
  return Object.freeze(evaluationContext.slice(-4).map((message) => Object.freeze({
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
  if (!constraints.productResolved) return Object.freeze(["ASK_PRODUCT"]);
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
    replyAct: { type: "STRING", enum: ["ANSWER", "ACKNOWLEDGE", "CLARIFY"] },
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
  return Object.freeze(evidence.map(({ ref, capability, subject, value }) =>
    Object.freeze({
      ref,
      capability,
      ...(subject === undefined ? {} : { subject }),
      value,
    })
  ));
}

export function buildTrackCStrategistContractRequest(input: Readonly<{
  modelResource: string;
  capture: unknown;
  evaluationAt: Date;
  evaluationContext: readonly ShadowContextMessage[];
  evidence: readonly TrackCSelectableEvidence[];
  constraints: TrackCStrategistConstraints;
}>): BuiltCandidateRequest {
  if (input.evidence.some((evidence) => !trackCEvidenceHasSafeFactualEgress(evidence))) {
    throw new Error("TRACK_C_STRATEGIST_EVIDENCE_NOT_EXECUTABLE");
  }
  const base = buildTrackCOfflineCandidateRequest({
    modelResource: input.modelResource,
    capture: input.capture,
    evaluationAt: input.evaluationAt,
    evaluationContext: input.evaluationContext,
    systemInstruction: STRATEGIST_INSTRUCTION,
  });
  return narrowRequest(base, strategistResponseSchema(input.constraints, input.evidence), {
    contractVersion: "TRACK_C_C3_STRATEGIST_INPUT_V1",
    dialogue: frozenDialogueWindow(input.evaluationContext),
    selectableEvidence: presentableEvidence(input.evidence),
    constraints: {
      permittedCanonicalActions: strategyActions(input.constraints),
      measurementsUnavailable: input.constraints.measurementsUnavailable,
    },
  });
}

function modelAuthoredEvidence(
  task: TrackCResponderTask,
): readonly TrackCSelectableEvidence[] {
  if (task.evidence.some((evidence) => !trackCEvidenceHasSafeFactualEgress(evidence))) {
    throw new Error("TRACK_C_RESPONDER_TASK_EVIDENCE_INVALID");
  }
  return Object.freeze([]);
}

function responderTaskPrompt(task: TrackCResponderTask) {
  return Object.freeze({
    answer: task.answer,
    evidence: presentableEvidence(modelAuthoredEvidence(task)),
    continuation: task.continuation,
    canonicalRequest: task.canonicalRequest,
  });
}

function responderNeedsModelProgression(task: TrackCResponderTask): boolean {
  return task.canonicalRequest?.type === "ASK_PRODUCT" ||
    task.canonicalRequest?.type === "ASK_MEASUREMENTS" ||
    task.continuation?.type === "ASK";
}

function usesBoundedAcknowledgement(task: TrackCResponderTask): boolean {
  return task.answer.kind === "ACKNOWLEDGE" &&
    task.canonicalRequest?.type !== "ASK_CHECKOUT_DETAILS";
}

function responderDraftSchema(task: TrackCResponderTask) {
  const needsProgression = responderNeedsModelProgression(task);
  const factualEvidenceCount = modelAuthoredEvidence(task).length;
  const boundedAcknowledgement = usesBoundedAcknowledgement(task);
  const codeOwnedUnresolved =
    task.answer.kind === "ANSWER" && task.answer.status === "UNRESOLVED";
  const answerTextAllowed =
    task.canonicalRequest?.type !== "ASK_CHECKOUT_DETAILS" &&
    !codeOwnedUnresolved &&
    (task.evidence.length === 0 || boundedAcknowledgement);
  return {
    type: "OBJECT",
    required: ["answerText", "factualTexts", "progressionText"],
    minProperties: 3,
    maxProperties: 3,
    properties: {
      answerText: boundedAcknowledgement
        ? { type: "STRING", enum: BOUNDED_ACKNOWLEDGEMENTS }
        : answerTextAllowed
          ? { type: "STRING", minLength: 1, maxLength: 1_000 }
          : { type: "NULL" },
      factualTexts: {
        type: "ARRAY",
        minItems: factualEvidenceCount,
        maxItems: factualEvidenceCount,
        items: { type: "STRING", minLength: 1, maxLength: 1_000 },
      },
      progressionText: needsProgression
        ? { type: "STRING", minLength: 1, maxLength: 1_000 }
        : { type: "NULL" },
    },
  };
}

function buildTrackCResponderContractRequest(input: Readonly<{
  modelResource: string;
  capture: unknown;
  evaluationAt: Date;
  evaluationContext: readonly ShadowContextMessage[];
  task: TrackCResponderTask;
}>): BuiltCandidateRequest {
  const base = buildTrackCOfflineCandidateRequest({
    modelResource: input.modelResource,
    capture: input.capture,
    evaluationAt: input.evaluationAt,
    evaluationContext: input.evaluationContext,
    systemInstruction: RESPONDER_INSTRUCTION,
  });
  return narrowRequest(base, responderDraftSchema(input.task), {
    contractVersion: "TRACK_C_C3_RESPONDER_INPUT_V1",
    dialogue: frozenDialogueWindow(input.evaluationContext),
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
    progressionText: text(record.progressionText, "TRACK_C_RESPONDER_DRAFT_INVALID"),
  });
}

function factLiterals(value: unknown): readonly string[] {
  if (typeof value === "string") return value.trim().length >= 4 ? [value] : [];
  if (typeof value === "number" && Number.isFinite(value)) return [String(value)];
  if (Array.isArray(value)) return value.flatMap(factLiterals);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Readonly<Record<string, unknown>>).flatMap(factLiterals);
  }
  return [];
}

function assertNoUnboundFactText(value: string | null, task: TrackCResponderTask): void {
  if (value === null) return;
  const normalized = value.normalize("NFC").toLocaleLowerCase("vi-VN");
  const literals = task.evidence.flatMap(({ value: fact }) => factLiterals(fact));
  if (literals.some((literal) => normalized.includes(
    literal.normalize("NFC").toLocaleLowerCase("vi-VN"),
  )) || /\d{3,}(?:[.,]\d{3})*\s*(?:đ|vnđ|vnd|đồng)/iu.test(value)) {
    throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  }
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

function deterministicCheckoutText(fields: readonly CheckoutField[]): string {
  const labels: Record<CheckoutField, string> = {
    FULL_NAME: "họ tên",
    PHONE: "số điện thoại",
    ADDRESS: "địa chỉ nhận hàng",
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
    if (draft.progressionText !== null || draft.answerText === null ||
        draft.answerText.includes("?")) {
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
  if (task.canonicalRequest?.type === "ASK_MEASUREMENTS") {
    const progression = draft.progressionText?.normalize("NFC") ?? "";
    if (!/(?:chiều\s*cao|cân\s*nặng|số\s*đo|kích\s*thước)/iu.test(progression)) {
      throw new Error("TRACK_C_RESPONDER_MEASUREMENTS_QUESTION_INVALID");
    }
  }
  if (task.continuation?.type === "ASK" && task.continuation.input === "COLOR") {
    const progression = draft.progressionText?.normalize("NFC") ?? "";
    const asksShopColorFact =
      /(?:shop|bên\s+em|mẫu(?:\s+này)?(?:\s+bên\s+em)?)\s+(?:hiện\s+)?(?:có|còn)\s+(?:những\s+)?màu\s+(?:gì|nào)/iu
        .test(progression);
    if (asksShopColorFact) {
      throw new Error("TRACK_C_RESPONDER_COLOR_DECISION_QUESTION_INVALID");
    }
  }
  const needsProgression = responderNeedsModelProgression(task);
  if (needsProgression !== (draft.progressionText !== null)) {
    throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
  }
}

function deterministicDeadlineFeasibilityText(
  task: TrackCResponderTask,
  constraint: TrackCDeliveryDeadlineConstraint | null,
): string | null {
  if (constraint === null || task.answer.proposition !== "ETA") return null;
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
  evaluationAt: Date;
  deliveryDeadlineConstraint: TrackCDeliveryDeadlineConstraint | null;
}>): ContextV2CandidateOutputV2 {
  const { task, draft } = input;
  if ((task.answer.status === "SUPPORTED" ||
       (task.answer.kind === "ANSWER" && task.answer.status === "UNRESOLVED")) &&
      draft.answerText !== null) {
    throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  }
  if (usesBoundedAcknowledgement(task)) {
    if (draft.answerText === null) {
      throw new Error("TRACK_C_RESPONDER_TASK_MISMATCH");
    }
    if (!BOUNDED_ACKNOWLEDGEMENTS.some((acknowledgement) =>
      acknowledgement === draft.answerText
    )) {
      throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
    }
  }
  assertNoUnboundFactText(draft.answerText, task);
  assertNoUnboundFactText(draft.progressionText, task);
  assertNoEffectText(draft.answerText);
  assertNoEffectText(draft.progressionText);
  // Selectable evidence already has a customer-ready deterministic factual
  // projection. The Responder never owns factual wording.
  const authoredEvidence = modelAuthoredEvidence(task);
  if (authoredEvidence.length !== 0 || draft.factualTexts.length !== 0) {
    throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  }
  assertProgression(task, draft);
  const segments: ContextV2CandidateOutputV2["segments"] = [];
  if (task.answer.kind === "ANSWER" && task.answer.status === "UNRESOLVED") {
    segments.push({ kind: "GENERAL", text: UNRESOLVED_ANSWER_TEXT });
  } else if (draft.answerText !== null) {
    segments.push({ kind: "GENERAL", text: draft.answerText });
  }
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
    segments.push({
      kind: "VERIFIED_CLAIM",
      text: factualText,
      claimContentHash: evidence.provenance.contentHash,
    });
  });
  const deadlineFeasibilityText = deterministicDeadlineFeasibilityText(
    task,
    input.deliveryDeadlineConstraint,
  );
  if (deadlineFeasibilityText !== null) {
    segments.push({ kind: "GENERAL", text: deadlineFeasibilityText });
  }
  if (task.canonicalRequest?.type === "ASK_CHECKOUT_DETAILS") {
    segments.push({
      kind: "ACTION_REQUEST",
      action: "PROVIDE_CHECKOUT_DETAILS",
      text: deterministicCheckoutText(task.canonicalRequest.requestedFields ?? []),
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
  } else if (task.continuation?.type === "KEEP_OPEN") {
    segments.push({ kind: "GENERAL", text: KEEP_OPEN_TEXT });
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
  const checkoutRequestedFields = checkout?.kind ===
      "TRACK_C_CANONICAL_CHECKOUT_COMPLETENESS_V1"
    ? checkout.missingFields : [];
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
      permittedCanonicalActions: Object.freeze(["ASK_PRODUCT"] as const),
      measurementsUnavailable: false,
      productResolved: false,
      hardStop: false,
    });
  }
  if (checkoutRequestedFields.length > 0) {
    return Object.freeze({
      permittedCanonicalActions: Object.freeze(["ASK_CHECKOUT_DETAILS"] as const),
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
      checkoutRequestedFields: Object.freeze([...checkoutRequestedFields]),
    });
  }
  const unavailable = measurementsUnavailable(dialogue);
  if (context.barriers.active.includes("MEASUREMENTS_REQUIRED") && !unavailable) {
    return Object.freeze({
      permittedCanonicalActions: Object.freeze(["ASK_MEASUREMENTS"] as const),
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });
  }
  return Object.freeze({
    permittedCanonicalActions: Object.freeze(["NONE"] as const),
    measurementsUnavailable: unavailable,
    productResolved: true,
    hardStop: false,
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

export async function runTrackCStrategyContractCase(
  input: TrackCStrategyContractCaseInput,
): Promise<TrackCStrategyContractCaseResult> {
  const context = contextFromFrozenTrackCCapture({
    capture: input.capture,
    evaluationAt: input.evaluationAt,
  });
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
  const constraints = constraintsFor(context, simulationMetadata, input.evaluationContext);
  let strategistRequestEnvelopeHash: string | null = null;
  let conversationPlan: TrackCResponderTask | TrackCStrategistDecision;
  let task: TrackCResponderTask;
  if (lane === "FIRST_CONTACT_FIXED") {
    task = fixedTask(context, evidence);
    conversationPlan = task;
  } else {
    const strategistRequest = buildTrackCStrategistContractRequest({
      modelResource: input.modelResource,
      capture: input.capture,
      evaluationAt: input.evaluationAt,
      evaluationContext: input.evaluationContext,
      evidence,
      constraints,
    });
    let strategistPayload: unknown = null;
    let decision: unknown;
    try {
      const strategistResponse = await input.transport.send({
        url: strategistRequest.url,
        body: strategistRequest.body,
        ...(input.signal === undefined ? {} : { signal: input.signal }),
      });
      strategistPayload = strategistResponse.payload;
      assertProviderIdentity(strategistResponse.providerModelVersion);
      decision = providerJson(
        strategistPayload,
        "TRACK_C_STRATEGIST_OUTPUT_INVALID",
      );
      task = compileTrackCStrategistDecision({
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
    } catch (error) {
      throw stageFailure("STRATEGIST", strategistPayload, error);
    }
    strategistRequestEnvelopeHash = strategistRequest.identity.requestEnvelopeHash;
    conversationPlan = decision as TrackCStrategistDecision;
  }
  const responderRequest = buildTrackCResponderContractRequest({
    modelResource: input.modelResource,
    capture: input.capture,
    evaluationAt: input.evaluationAt,
    evaluationContext: input.evaluationContext,
    task,
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
      evaluationAt: input.evaluationAt,
      deliveryDeadlineConstraint,
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
    output,
    reply: output.segments.map(({ text }) => text).join("\n"),
    identity,
  });
}
