import { createHash } from "node:crypto";
import {
  buildProtectedCartPolicyClaimsV1,
  buildProtectedClaimsFromCartSelectionsV1,
  evaluateDeterministicEffectReadinessV1,
  foldVietnameseForRecall,
  hashCanonicalBuyingIntentV1,
} from "@lana/business-tools";
import {
  CheckoutRevalidationV1Schema,
  canonicalJsonV1,
  canonicalCartStateHashPreimageV1,
  canonicalCartStateV1,
  canonicalBuyingIntentAuthorizesCartMutationV1,
  cartMutationAuthorityBindingHashPreimageV1,
  cartMutationBatchEvidenceHashPreimageV1,
  cartMutationReceiptHashPreimageV1,
  cartOpenEvidenceHashPreimageV1,
  canonicalCheckoutDraftHashPreimageV1,
  canonicalClarificationStateHashPreimageV1,
  checkoutDetailsTransitionEvidenceHashPreimageV1,
  clarificationTransitionEvidenceHashPreimageV1,
  negotiationTransitionEvidenceHashPreimageV1,
  CartOpenEvidenceV1Schema,
  CheckoutDetailsTransitionEvidenceV1Schema,
  ClarificationTransitionEvidenceV1Schema,
  NegotiationTransitionEvidenceV1Schema,
  AgentStrategyAnalysisV1Schema,
  CartMutationAuthorityBindingV1Schema,
  CartMutationBatchEvidenceV1Schema,
  CartMutationReceiptV1Schema,
  OrderPreviewV1Schema,
  type AgentSalesSignalsV1,
  type AgentStrategyAnalysisV1,
  type CanonicalBuyingIntentV1,
  type CartV1,
  type CanonicalCartMutationPayloadV1,
  type CartMutationActionV1,
  type CartMutationReceiptV1,
  type CartOpenEvidenceV1,
  type CanonicalCartReplayContextV1,
  type DeterministicConfirmationEvidenceV1,
  type DeterministicEffectReadinessV1,
  MAX_CART_LINES_V1,
  CART_TTL_MS_V1,
  isStateAdvancingSalesOutcomeV1,
  requiredPersistedSalesEffectsV1,
  type ProtectedClaimV1,
  type BankTransferPolicyV1,
  type CheckoutRevalidationV1,
  type RevalidatedFactV1,
} from "@lana/contracts";
import {
  applySalesCycleCommand,
  computeBankTransferPolicyHash,
  computeBusinessContentHash,
  computeOrderPreviewHash,
  createSalesCycleRuntimeState,
  outboundRuntimePolicy,
  runtimePolicyBundleReference,
  startupBehaviorModeResolution,
  type BankTransferPolicyResolver,
  type RuntimePolicyResolution,
  type ResolvedCartDraftV1,
  type ResolvedCartMutationV1,
  type SalesCycleCommand,
  type SalesCycleRuntimeResult,
  type SalesCycleRuntimeState,
  type RuntimeBehaviorModeResolution,
  type SalesCycleTrustedPortsV1,
  type VerifiedInboundMessageV1,
} from "@lana/chat-runtime";
import type {
  RealtimeSalesCycleEventPlan,
  RealtimeSalesCyclePlan,
} from "@lana/database";
import type {
  BusinessFactsReader,
} from "./redis-business-facts.js";
import type {
  CartSelectionResult,
} from "./realtime-sales-catalog.js";
import {
  ASK_CONFIRMATION_CLARIFICATION,
  classifyConfirmationContract,
  confirmationClarificationAction,
} from "./confirmation-classifier.js";

const PREVIEW_TTL_MS = 30 * 60 * 1_000;
const MAX_CHECKOUT_CLARIFICATION_ATTEMPTS = 3;

export interface RealtimeSalesCycleInput {
  readonly pageId: string;
  readonly conversationId: string;
  readonly customerHash: string;
  readonly state: SalesCycleRuntimeState;
  readonly stateRevision: number;
  readonly conversationRevision: number;
  readonly text: string;
  readonly messageId: string;
  readonly eventKey: string;
  readonly senderId: string;
  readonly occurredAt: string;
  readonly attachmentIds: readonly string[];
  readonly productId: string | null;
  readonly offerType: string | null;
  readonly size: string | null;
  readonly color: string | null;
  readonly canonicalBuyingIntent: CanonicalBuyingIntentV1;
  readonly salesSignals?: AgentSalesSignalsV1 | null;
  /**
   * Guarded post-generation proposal. COMMERCE may use this for conversational
   * negotiation semantics and wording; it never carries a monetary request.
   */
  readonly negotiationProposal?: ModelNegotiationProposalV1 | null;
  readonly shopAlias: string;
  readonly behaviorModeResolution?: RuntimeBehaviorModeResolution;
  readonly policyResolution: RuntimePolicyResolution | null;
  readonly facts: BusinessFactsReader;
  readonly now: Date;
  /** Production supplies a live clock; deterministic tests may omit it. */
  readonly effectNow?: () => Date;
}

export interface ModelNegotiationProposalV1 {
  readonly contractVersion: "MODEL_NEGOTIATION_PROPOSAL_V1";
  readonly decision: "ANSWER_PRICE_OBJECTION";
  readonly wording: string;
  readonly sourceMessageId: string;
  readonly guardEvidence: "VERIFIED_PROPOSAL_GUARD";
  readonly protectedClaims: "NONE";
  readonly strategyAnalysis: AgentStrategyAnalysisV1;
}

export function buildGuardedModelNegotiationProposalV1(input: Readonly<{
  sourceMessageId: string;
  wordingUnits: readonly string[];
  action: "REPLY" | "ASK_PRODUCT_SELECTION" | "HANDOFF" | "NO_REPLY";
  guardReasonCodes: readonly string[];
  protectedClaimTypes: readonly string[];
  strategyAnalysis: AgentStrategyAnalysisV1 | null | undefined;
}>): ModelNegotiationProposalV1 | null {
  const strategy = AgentStrategyAnalysisV1Schema.safeParse(input.strategyAnalysis);
  const wording = input.wordingUnits.join("\n");
  if (
    input.action !== "REPLY" ||
    input.guardReasonCodes.length > 0 ||
    input.protectedClaimTypes.length > 0 ||
    !strategy.success ||
    strategy.data.need !== "NEED_BUDGET" ||
    strategy.data.barrier !== "BARRIER_PRICE" ||
    strategy.data.decisionFactor !== "BUDGET" ||
    strategy.data.recommendedStrategy !== "STRATEGY_ANSWER_OBJECTION" ||
    strategy.data.confidence < 0.85 ||
    !strategy.data.evidence.includes("TEXT_PRICE_OBJECTION") ||
    input.sourceMessageId.trim().length < 1 || input.sourceMessageId.length > 256 ||
    wording.trim().length < 1 || wording.length > 2_000 || wording !== wording.trim()
  ) return null;
  return {
    contractVersion: "MODEL_NEGOTIATION_PROPOSAL_V1",
    decision: "ANSWER_PRICE_OBJECTION",
    wording,
    sourceMessageId: input.sourceMessageId,
    guardEvidence: "VERIFIED_PROPOSAL_GUARD",
    protectedClaims: "NONE",
    strategyAnalysis: strategy.data,
  };
}

export interface RealtimeSalesCycleOutput {
  readonly handled: boolean;
  readonly messages: readonly (
    | { readonly kind: "TEXT"; readonly text: string }
    | { readonly kind: "IMAGE"; readonly imageUrl: string }
  )[];
  readonly plan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null;
  readonly transferToHuman: boolean;
  readonly desiredTag: "NHAN_VIEN" | "DA_CHOT_DON" | null;
  readonly reasonCode: string | null;
  readonly readinessAttempt?: DeterministicEffectReadinessV1;
  readonly protectedOutbound?: Readonly<{
    claims: readonly ProtectedClaimV1[];
    claimTypes: readonly ProtectedClaimV1["type"][];
    readiness: DeterministicEffectReadinessV1;
  }>;
  readonly telemetry?: RealtimeSalesCycleTelemetry;
}

export function prepareHandoffStatePlanV1<TState>(
  value: RealtimeSalesCyclePlan<TState> | null,
): RealtimeSalesCyclePlan<TState> | null {
  if (value === null) return null;
  const state = value.state as Readonly<{
    cart?: unknown;
    preview?: unknown;
    confirmation?: unknown;
  }>;
  const requiredEffects = new Set(requiredPersistedSalesEffectsV1({
    events: value.events,
    hasFinalPreview: state.preview !== null && state.preview !== undefined,
    hasFinalConfirmation: state.confirmation !== null && state.confirmation !== undefined,
  }));
  const {
    deterministicConfirmationEvidence,
    effectClaimSets: _effectClaimSets,
    effectReadiness: _effectReadiness,
    ...statePlan
  } = value;
  return {
    ...statePlan,
    ...(requiredEffects.has("PURCHASE_CONFIRMATION_READY") &&
        deterministicConfirmationEvidence !== undefined
      ? { deterministicConfirmationEvidence }
      : {}),
    effectClaimSets: (value.effectClaimSets ?? [])
      .filter(({ effect }) => requiredEffects.has(effect)),
    effectReadiness: (value.effectReadiness ?? [])
      .filter(({ effect }) => requiredEffects.has(effect)),
  };
}

export type CheckoutFieldKey =
  | "FULL_NAME"
  | "PHONE"
  | "ADDRESS"
  | "PAYMENT_METHOD";

export interface RealtimeSalesCycleTelemetry {
  readonly checkoutCapturedFields?: readonly CheckoutFieldKey[];
  readonly checkoutMissingFields?: readonly CheckoutFieldKey[];
  readonly checkoutCompleted?: boolean;
  readonly clarificationReasonCode?: "CHECKOUT_DETAILS_MISSING";
  readonly clarificationAttemptCount?: number;
  readonly clarificationMaxAttempts?: number;
  readonly clarificationBudgetExhausted?: boolean;
  readonly clarificationCase?: boolean;
  readonly orderPreviewCreated?: boolean;
  readonly confirmationAttempted?: boolean;
  readonly confirmationConfirmed?: boolean;
  readonly confirmationSource?:
    | "DETERMINISTIC_CLASSIFIER"
    | "MODEL_STRUCTURED_OUTPUT"
    | null;
  readonly confirmationAction?: typeof ASK_CONFIRMATION_CLARIFICATION | null;
  readonly confirmationBehaviorMode?: RuntimeBehaviorModeResolution["confirmationMode"];
  readonly confirmationModeSource?: RuntimeBehaviorModeResolution["source"];
  readonly confirmationModeVersionId?: string | null;
  readonly confirmationModeContentHash?: string | null;
  readonly confirmationModePointerRevision?: number | null;
  readonly confirmationModeAuditWrite?: RuntimeBehaviorModeResolution["auditWrite"];
  readonly confirmationContainmentActive?: boolean;
  readonly confirmationShadow?: Readonly<{
    readonly decision: "CONFIRM" | "REJECT" | "UNCLEAR";
    readonly terminal: boolean;
    readonly reasonCode: string | null;
    readonly action: typeof ASK_CONFIRMATION_CLARIFICATION | null;
    readonly differsFromLegacy: boolean;
    readonly sideEffects: "DISABLED";
  }>;
  readonly confirmationReasonCode?: string | null;
}

interface CheckoutDetails {
  readonly fullName?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly paymentMethod?: "COD" | "BANK_TRANSFER";
}

interface ConfirmationDecision {
  readonly decision: "CONFIRM" | "REJECT" | "UNCLEAR";
  readonly attempted: boolean;
  readonly source:
    | "DETERMINISTIC_CLASSIFIER"
    | "MODEL_STRUCTURED_OUTPUT"
    | null;
  readonly reasonCode: string | null;
}

interface RevalidationBuild {
  readonly value: CheckoutRevalidationV1;
  readonly eta: { readonly minDays: number; readonly maxDays: number } | null;
}

function asciiFold(value: string): string {
  return foldVietnameseForRecall(value);
}

const canonicalJson = canonicalJsonV1;

function version(group: string, values: readonly string[]): string {
  return `${group}:sha256:${createHash("sha256").update(canonicalJson([...values].sort()), "utf8").digest("hex")}`;
}

function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed, "utf8").digest("hex");
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function explicitSize(text: string): string | null {
  return text.toUpperCase().match(/(?:^|[^A-Z])(S|M|L|XL)(?:$|[^A-Z])/u)?.[1] ?? null;
}

function requestedQuantityValue(
  buyingIntent: CanonicalBuyingIntentV1,
): number | null {
  return buyingIntent.decision === "COMMITTED" ? buyingIntent.quantity : null;
}

function requestedQuantity(
  buyingIntent: CanonicalBuyingIntentV1,
): number {
  return requestedQuantityValue(buyingIntent) ?? 1;
}

function purchaseReady(
  buyingIntent: CanonicalBuyingIntentV1,
): boolean {
  return buyingIntent.decision === "COMMITTED";
}

function deterministicMutationIntentReady(
  buyingIntent: CanonicalBuyingIntentV1,
  action: "ADD_LINE" | "SET_QUANTITY",
  productId: string,
  quantity: number,
): boolean {
  return canonicalBuyingIntentAuthorizesCartMutationV1(
    buyingIntent,
    action,
    productId,
    quantity,
  );
}

function exactEvidence(text: string, evidenceText: string | null): boolean {
  if (!evidenceText) return false;
  return text.normalize("NFC").includes(evidenceText.normalize("NFC"));
}

function deterministicConfirmation(text: string): ConfirmationDecision {
  const folded = asciiFold(text)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  const hasConfirmationVocabulary =
    /\b(?:ok|oke|okay|dong y|xac nhan|chot|len don|lay)\b/u.test(folded);
  if (!hasConfirmationVocabulary) {
    return { decision: "UNCLEAR", attempted: false, source: null, reasonCode: null };
  }
  if (
    /\b(?:khong|ko|k|chua|dung|huy)\s+(?:lay|chot|xac nhan|len don)\b/u.test(folded) ||
    /\b(?:de|doi)\s+(?:chi|c|em|e)?\s*(?:suy nghi|can nhac|xem lai)\b/u.test(folded) ||
    /\b(?:lay|xin|gui|xem)\s+(?:them\s+)?anh\b/u.test(folded) ||
    /\b(?:chot|lay|len don).*(?:duoc khong|khong em|chua em)\b/u.test(folded) ||
    text.includes("?")
  ) {
    return {
      decision: "REJECT",
      attempted: true,
      source: "DETERMINISTIC_CLASSIFIER",
      reasonCode: "CONFIRMATION_NEGATED_OR_HESITANT",
    };
  }
  if (
    /\b(?:ok|oke|okay|dong y|xac nhan)\b/u.test(folded) ||
    /\b(?:cho|giup)\s+(?:chi|c|em|e)?\s*(?:lay|chot|len don)\b/u.test(folded) ||
    /\b(?:chot|len don)\b/u.test(folded) ||
    /\b(?:lay)\s+(?:di|nha|nhe|a)?\s*$/u.test(folded)
  ) {
    return {
      decision: "CONFIRM",
      attempted: true,
      source: "DETERMINISTIC_CLASSIFIER",
      reasonCode: "CONFIRMATION_DETERMINISTIC_MATCH",
    };
  }
  return {
    decision: "UNCLEAR",
    attempted: true,
    source: "DETERMINISTIC_CLASSIFIER",
    reasonCode: "CONFIRMATION_AMBIGUOUS",
  };
}

function confirmation(
  text: string,
  salesSignals: AgentSalesSignalsV1 | null | undefined,
): ConfirmationDecision {
  const deterministic = deterministicConfirmation(text);
  if (deterministic.decision !== "UNCLEAR" || deterministic.attempted) {
    return deterministic;
  }
  const signal = salesSignals?.purchaseConfirmation;
  if (
    !signal ||
    signal.confidence < 0.85 ||
    !exactEvidence(text, signal.evidenceText)
  ) return deterministic;
  return {
    decision: signal.decision,
    attempted: signal.decision !== "UNCLEAR",
    source: "MODEL_STRUCTURED_OUTPUT",
    reasonCode: signal.decision === "CONFIRM"
      ? "CONFIRMATION_MODEL_MATCH"
      : signal.decision === "REJECT"
        ? "CONFIRMATION_MODEL_REJECTED"
        : null,
  };
}

function priceObjection(text: string): boolean {
  return /(đắt|dat qua|giá cao|gia cao|bớt giá|bot gia|giảm thêm|giam them|fix giá|fix gia|ưu đãi thêm|uu dai them)/iu.test(text);
}

function acceptedModelNegotiationProposal(
  input: RealtimeSalesCycleInput,
): ModelNegotiationProposalV1 | null {
  if (input.behaviorModeResolution?.salesAuthorityMode !== "COMMERCE") return null;
  const proposal = input.negotiationProposal;
  if (
    proposal === null || proposal === undefined ||
    proposal.contractVersion !== "MODEL_NEGOTIATION_PROPOSAL_V1" ||
    proposal.decision !== "ANSWER_PRICE_OBJECTION" ||
    proposal.guardEvidence !== "VERIFIED_PROPOSAL_GUARD" ||
    proposal.protectedClaims !== "NONE" ||
    proposal.sourceMessageId !== input.messageId ||
    proposal.wording.length < 1 || proposal.wording.length > 2_000 ||
    proposal.wording !== proposal.wording.trim()
  ) return null;
  const strategy = AgentStrategyAnalysisV1Schema.safeParse(proposal.strategyAnalysis);
  if (
    !strategy.success ||
    strategy.data.need !== "NEED_BUDGET" ||
    strategy.data.barrier !== "BARRIER_PRICE" ||
    strategy.data.decisionFactor !== "BUDGET" ||
    strategy.data.recommendedStrategy !== "STRATEGY_ANSWER_OBJECTION" ||
    strategy.data.confidence < 0.85 ||
    !strategy.data.evidence.includes("TEXT_PRICE_OBJECTION")
  ) return null;
  return { ...proposal, strategyAnalysis: strategy.data };
}

function removeItem(text: string): boolean {
  return /(bỏ|bo|bớt|bot|không lấy|khong lay)\s+(?:mẫu|mau|sp|sản phẩm|san pham|set|bộ|bo)/iu.test(text);
}

function labeledValue(text: string, labels: readonly string[]): string | undefined {
  const pattern = new RegExp(`^(?:${labels.join("|")})\\s*[:\\-]\\s*(.+)$`, "imu");
  const value = text.match(pattern)?.[1]?.trim();
  return value || undefined;
}

function modelCheckoutValue(
  text: string,
  field: {
    readonly value: string | null;
    readonly evidenceText: string | null;
    readonly confidence: number;
  } | undefined,
  kind: "FULL_NAME" | "PHONE" | "ADDRESS",
): string | undefined {
  if (
    !field ||
    field.confidence < 0.85 ||
    !field.value ||
    !exactEvidence(text, field.evidenceText)
  ) return undefined;
  const value = field.value.trim();
  if (
    kind === "FULL_NAME" &&
    (value.length < 2 || value.length > 160 || /\d/u.test(value))
  ) return undefined;
  if (
    kind === "PHONE" &&
    !/^(?:\+?84|0)\d{8,10}$/u.test(value)
  ) return undefined;
  if (
    kind === "ADDRESS" &&
    (value.length < 8 || value.length > 1_000)
  ) return undefined;
  return value;
}

function modelPaymentMethod(
  text: string,
  field: AgentSalesSignalsV1["checkoutExtraction"]["paymentMethod"] | undefined,
): "COD" | "BANK_TRANSFER" | undefined {
  if (
    !field ||
    field.confidence < 0.85 ||
    !field.value ||
    !exactEvidence(text, field.evidenceText)
  ) return undefined;
  return field.value;
}

function checkoutDetails(
  text: string,
  salesSignals: AgentSalesSignalsV1 | null | undefined,
): CheckoutDetails {
  const extracted = salesSignals?.checkoutExtraction;
  const phone = labeledValue(text, ["sđt", "sdt", "điện thoại", "dien thoai", "phone"]) ??
    text.match(/(?:^|[^\d])((?:\+?84|0)\d{8,10})(?:[^\d]|$)/u)?.[1] ??
    modelCheckoutValue(text, extracted?.phone, "PHONE");
  const paymentMethod = /(chuyển khoản|chuyen khoan|\bck\b|bank)/iu.test(text)
    ? "BANK_TRANSFER" as const
    : /(?:^|\s)(?:cod|tiền mặt|tien mat|nhận hàng trả|nhan hang tra)(?:\s|$)/iu.test(text)
      ? "COD" as const
      : modelPaymentMethod(text, extracted?.paymentMethod);
  const fullName =
    labeledValue(text, ["tên", "ten", "họ tên", "ho ten", "người nhận", "nguoi nhan"]) ??
    modelCheckoutValue(text, extracted?.fullName, "FULL_NAME");
  const address =
    labeledValue(text, ["địa chỉ", "dia chi", "đ/c", "dc"]) ??
    modelCheckoutValue(text, extracted?.address, "ADDRESS");
  return {
    ...(fullName ? { fullName } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? { address } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
  };
}

const CHECKOUT_FIELD_LABELS: Readonly<Record<CheckoutFieldKey, string>> = {
  FULL_NAME: "tên người nhận",
  PHONE: "số điện thoại",
  ADDRESS: "địa chỉ",
  PAYMENT_METHOD: "COD hoặc chuyển khoản",
};

function missingCheckout(
  state: SalesCycleRuntimeState,
): readonly CheckoutFieldKey[] {
  const draft = state.checkoutDraft;
  return [
    ...(draft?.fullName ? [] : ["FULL_NAME" as const]),
    ...(draft?.phone ? [] : ["PHONE" as const]),
    ...(draft?.address ? [] : ["ADDRESS" as const]),
    ...(draft?.paymentMethod ? [] : ["PAYMENT_METHOD" as const]),
  ];
}

function checkoutCapturedFields(details: CheckoutDetails): readonly CheckoutFieldKey[] {
  return [
    ...(details.fullName ? ["FULL_NAME" as const] : []),
    ...(details.phone ? ["PHONE" as const] : []),
    ...(details.address ? ["ADDRESS" as const] : []),
    ...(details.paymentMethod ? ["PAYMENT_METHOD" as const] : []),
  ];
}

function clarificationMessage(
  missing: readonly CheckoutFieldKey[],
  attemptCount: number,
): string {
  const labels = missing.map((field) => CHECKOUT_FIELD_LABELS[field]);
  if (attemptCount === 1) {
    return `Chị gửi thêm ${labels.join(", ")} trong một tin nhắn giúp em nhé.`;
  }
  if (attemptCount === 2) {
    return `Em vẫn còn thiếu ${labels[0]}. Chị bổ sung riêng thông tin này giúp em nhé.`;
  }
  return `Để tiếp tục lên đơn, chị gửi giúp em ${labels.join(", ")} nhé.`;
}

function clarificationFingerprint(message: string): string {
  return createHash("sha256").update(message.normalize("NFC"), "utf8").digest("hex");
}

function sameMissingFields(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((field, index) => field === normalizedRight[index]);
}

function negotiationOfferText(cart: CartV1, customerState: "READY" | "HESITANT" | "CAUTIOUS"): string {
  const parts = cart.adjustments.map((adjustment) => {
    if (adjustment.kind === "PERCENT_DISCOUNT" && adjustment.percentageBps) {
      return `giảm ${adjustment.percentageBps / 100}%`;
    }
    if (adjustment.kind === "FIXED_DISCOUNT" && adjustment.amountVnd > 0) {
      return `giảm thêm ${money(adjustment.amountVnd)}`;
    }
    if (adjustment.kind === "FREE_SHIPPING") return "freeship";
    return null;
  }).filter((value): value is string => value !== null);
  const offer = parts.length > 0 ? parts.join(", ").replace(/, ([^,]*)$/u, " và $1") : "ưu đãi hiện tại";
  return customerState === "CAUTIOUS"
    ? `Mức cuối em hỗ trợ ${offer} cho giỏ này.`
    : `Em hỗ trợ ${offer} cho giỏ này.`;
}

function cartSummary(cart: CartV1): string {
  const hasFreeShipping = cart.adjustments.some(({ kind }) => kind === "FREE_SHIPPING");
  const lines = cart.lines.map((line) => {
    const sizes = [...new Set(line.components.map(({ size }) => size).filter(Boolean))].join("/");
    return `${line.parentProductId}${sizes ? ` size ${sizes}` : ""} ×${line.quantity}: ${money(line.lineTotalVnd ?? 0)}`;
  });
  return [
    ...lines,
    `Tạm tính: ${money(cart.subtotalVnd ?? 0)}`,
    ...(cart.discountTotalVnd ? [`Ưu đãi: -${money(cart.discountTotalVnd)}`] : []),
    `Phí ship: ${hasFreeShipping || cart.shippingFeeVnd === 0 ? "Freeship" : money(cart.shippingFeeVnd ?? 0)}`,
    `Tổng: ${money(cart.grandTotalVnd ?? 0)}`,
  ].join("\n");
}

function checkoutTemplate(cart: CartV1): string {
  return `${cartSummary(cart)}\nChị gửi giúp em các thông tin nhận hàng:\nTên:\nSĐT:\nĐịa chỉ:\nThanh toán: COD hoặc chuyển khoản nhé.`;
}

function trustedInbound(input: RealtimeSalesCycleInput): VerifiedInboundMessageV1 {
  return {
    messageId: input.messageId,
    pageId: input.pageId,
    conversationId: input.conversationId,
    senderType: "CUSTOMER",
    observedAt: input.occurredAt,
    attachments: input.attachmentIds.map((attachmentId) => ({
      attachmentId,
      kind: "IMAGE" as const,
    })),
  };
}

function baseFailedOutput(
  reasonCode: string,
  plan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null = null,
): RealtimeSalesCycleOutput {
  return {
    handled: true,
    messages: [],
    plan,
    transferToHuman: true,
    desiredTag: "NHAN_VIEN",
    reasonCode,
  };
}

function paymentPolicy(
  resolution: RuntimePolicyResolution | null,
): {
  readonly policy: BankTransferPolicyV1;
  readonly reference: {
    readonly policyId: string;
    readonly version: string;
    readonly contentHash: `sha256:${string}`;
  };
} | null {
  const bundle = outboundRuntimePolicy(resolution);
  const artifact = bundle?.artifacts.paymentPolicy;
  if (!bundle || !artifact?.bankTransfer) return null;
  const ref = bundle.versionReferences.find(({ artifactKind }) =>
    artifact.kind === "PAYMENT_POLICY" && artifactKind === "PAYMENT_POLICY"
  );
  if (!ref) return null;
  const policy = {
    policyId: ref.artifactKey,
    version: String(ref.versionNumber),
    bankName: artifact.bankTransfer.bankName,
    accountNumber: artifact.bankTransfer.accountNumber,
    accountHolder: artifact.bankTransfer.accountHolder,
    qrImageUrl: artifact.bankTransfer.qrAssetUrl,
    customerInstruction: artifact.bankTransfer.receiptInstruction,
    effectiveAt: bundle.policy.effectiveAt,
    effectiveUntil: bundle.policy.effectiveUntil,
  };
  return {
    policy,
    reference: {
      policyId: policy.policyId,
      version: policy.version,
      contentHash: computeBankTransferPolicyHash(policy),
    },
  };
}

async function currentSelections(
  input: RealtimeSalesCycleInput,
  cart: CartV1,
  address: string,
  checkedAt: Date = input.now,
  quantityOverrides: ReadonlyMap<string, number> = new Map(),
): Promise<readonly CartSelectionResult[]> {
  if (!input.facts.resolveCartSelection) return [];
  return Promise.all(cart.lines.map((line) => {
    const sizes = [...new Set(line.components.map(({ size }) => size).filter((value): value is string => value !== null))];
    const colors = [...new Set(line.components.map(({ color }) => color).filter((value): value is string => value !== null))];
    return input.facts.resolveCartSelection!({
      shopAlias: input.shopAlias,
      productId: line.parentProductId,
      offerType: line.offerId,
      size: sizes.length === 1 ? sizes[0]! : null,
      color: colors.length === 1 ? colors[0]! : null,
      quantity: quantityOverrides.get(line.lineId) ?? line.quantity,
      lineId: line.lineId,
      deliveryAddress: address,
    }, checkedAt);
  }));
}

type ReadyCartSelection = Extract<CartSelectionResult, { status: "READY" }>;

function selectionsMatchCartLines(
  lines: CartV1["lines"],
  selections: readonly ReadyCartSelection[],
): boolean {
  if (lines.length !== selections.length) return false;
  const byLineId = new Map(selections.map((selection) => [selection.line.lineId, selection.line]));
  return lines.every((line) => {
    const selected = byLineId.get(line.lineId);
    return selected !== undefined &&
      selected.parentProductId === line.parentProductId &&
      selected.offerId === line.offerId &&
      selected.quantity === line.quantity &&
      selected.posUnitPriceVnd === line.posUnitPriceVnd &&
      selected.lineTotalVnd === line.lineTotalVnd &&
      canonicalJson(selected.components) === canonicalJson(line.components);
  });
}

function fact(
  before: string | null,
  after: string | null,
  checkedAt: string,
  missing: boolean,
): RevalidatedFactV1 {
  const status = missing ? "MISSING" : before === after ? "MATCHED" : "CHANGED";
  return {
    status,
    sourceVersionBefore: before,
    sourceVersionAfter: after,
    checkedAt,
  };
}

function revalidation(
  cart: CartV1,
  selections: readonly CartSelectionResult[],
  now: Date,
  baseline?: CheckoutRevalidationV1,
): RevalidationBuild {
  const ready = selections.filter((value): value is Extract<CartSelectionResult, { status: "READY" }> =>
    value.status === "READY"
  );
  const checkedAt = now.toISOString();
  const current = ready.length === cart.lines.length
    ? {
        price: version("price", ready.map(({ versions }) => versions.price)),
        inventory: version("inventory", ready.map(({ versions }) => versions.inventory)),
        size: version("size", ready.map(({ versions }) => versions.size)),
        eta: ready.every(({ versions }) => versions.eta !== null)
          ? version("eta", ready.map(({ versions }) => versions.eta!))
          : null,
      }
    : { price: null, inventory: null, size: null, eta: null };
  const initial = baseline ?? {
    price: { sourceVersionAfter: current.price },
    inventory: { sourceVersionAfter: current.inventory },
    size: { sourceVersionAfter: current.size },
    eta: { sourceVersionAfter: current.eta },
  };
  const value = CheckoutRevalidationV1Schema.parse({
    cartId: cart.cartId,
    cartVersion: cart.revision,
    price: fact(initial.price.sourceVersionAfter, current.price, checkedAt, current.price === null),
    inventory: fact(initial.inventory.sourceVersionAfter, current.inventory, checkedAt, current.inventory === null),
    size: fact(initial.size.sourceVersionAfter, current.size, checkedAt, current.size === null),
    eta: fact(initial.eta.sourceVersionAfter, current.eta, checkedAt, current.eta === null),
    eligible: current.price !== null && current.inventory !== null &&
      current.size !== null && current.eta !== null &&
      initial.price.sourceVersionAfter === current.price &&
      initial.inventory.sourceVersionAfter === current.inventory &&
      initial.size.sourceVersionAfter === current.size &&
      initial.eta.sourceVersionAfter === current.eta,
    checkedAt,
  });
  const etaValues = ready.map(({ eta }) => eta).filter((value): value is NonNullable<typeof value> => value !== null);
  return {
    value,
    eta: etaValues.length === ready.length && etaValues.length > 0
      ? {
          minDays: Math.max(...etaValues.map(({ minDays }) => minDays)),
          maxDays: Math.max(...etaValues.map(({ maxDays }) => maxDays)),
        }
      : null,
  };
}

export function createRealtimeSalesState(
  conversationId: string,
  pageId: string,
  now: Date,
): SalesCycleRuntimeState {
  return createSalesCycleRuntimeState(
    conversationId,
    { pageId, conversationId },
    now,
  );
}

export async function evaluateRealtimeSalesCycle(
  input: RealtimeSalesCycleInput,
): Promise<RealtimeSalesCycleOutput> {
  const initial = input.state;
  if (
    initial.revision !== input.stateRevision ||
    initial.routing.pageId !== input.pageId ||
    initial.routing.conversationId !== input.conversationId
  ) throw new Error("SALES_CYCLE_STATE_INVALID");
  const bundle = outboundRuntimePolicy(input.policyResolution);
  if (!bundle || !input.facts.resolveCartSelection) {
    return {
      handled: false, messages: [], plan: null, transferToHuman: false,
      desiredTag: null, reasonCode: null,
    };
  }
  let state = initial;
  const events: RealtimeSalesCycleEventPlan[] = [];
  const effectReadiness: DeterministicEffectReadinessV1[] = [];
  const cartMutationReceipts: CartMutationReceiptV1[] = [];
  let cartReplayContext: CanonicalCartReplayContextV1 | null = null;
  let cartOpenEvidence: CartOpenEvidenceV1 | null = null;
  let lastReadinessAttempt: DeterministicEffectReadinessV1 | null = null;
  const failedOutput = (
    reasonCode: string,
    failurePlan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null = null,
  ): RealtimeSalesCycleOutput => ({
    ...baseFailedOutput(reasonCode, failurePlan),
    ...(lastReadinessAttempt === null ? {} : { readinessAttempt: lastReadinessAttempt }),
  });
  const effectClaimSets = new Map<
    DeterministicEffectReadinessV1["effect"],
    ReturnType<typeof buildProtectedClaimsFromCartSelectionsV1>
  >();
  let deterministicConfirmationEvidence: DeterministicConfirmationEvidenceV1 | null = null;
  const effectNow = (): Date => {
    const value = input.effectNow?.() ?? input.now;
    if (!Number.isFinite(value.getTime())) throw new Error("EFFECT_CLOCK_INVALID");
    return value;
  };
  const references = new Map<string, unknown>();
  const inbound = trustedInbound(input);
  let checkoutValidation: CheckoutRevalidationV1 | null = null;
  const bank = paymentPolicy(input.policyResolution);
  const policyReference = runtimePolicyBundleReference(bundle);
  references.set(canonicalJson(policyReference), bundle.policy);
  const ports: SalesCycleTrustedPortsV1 = {
    resolveCartDraft: (reference) =>
      (references.get(canonicalJson(reference)) as ResolvedCartDraftV1 | undefined) ?? null,
    resolveCartMutation: (reference) =>
      (references.get(canonicalJson(reference)) as ResolvedCartMutationV1 | undefined) ?? null,
    resolveShopPolicy: (reference) =>
      (references.get(canonicalJson(reference)) as ReturnType<SalesCycleTrustedPortsV1["resolveShopPolicy"]> | undefined) ?? null,
    resolveInboundMessage: (sourceMessageId) => sourceMessageId === input.messageId ? inbound : null,
    revalidateCheckout: () => checkoutValidation,
  };
  const bankResolver: BankTransferPolicyResolver = (reference) =>
    bank && canonicalJson(reference) === canonicalJson(bank.reference) ? bank.policy : null;

  const apply = (command: SalesCycleCommand): SalesCycleRuntimeResult => {
    const before = state;
    const resolvedMutation = command.kind === "CART_MUTATED"
      ? references.get(canonicalJson(command.mutationRef)) as ResolvedCartMutationV1 | undefined
      : undefined;
    const readinessMutationAction = resolvedMutation?.mutation.kind === "ADD_LINE" ||
        resolvedMutation?.mutation.kind === "REMOVE_LINE" ||
        resolvedMutation?.mutation.kind === "SET_QUANTITY"
      ? resolvedMutation.mutation.kind
      : null;
    const result = applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command,
      now: input.now,
      trustedPorts: ports,
      resolveBankTransferPolicy: bankResolver,
    });
    if (isStateAdvancingSalesOutcomeV1(result.status)) {
      state = result.state;
      const negotiationTransitionEvidence = command.kind === "NEGOTIATION_EVENT"
        ? (() => {
            const exactEvidenceId = `inbound:${command.sourceMessageId}`;
            const placeholder = {
              schemaVersion: 1 as const,
              contractVersion: "NEGOTIATION_TRANSITION_EVIDENCE_V1" as const,
              sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
              commandIdHash: createHash("sha256").update(command.commandId, "utf8").digest("hex"),
              eventIdHash: createHash("sha256").update(exactEvidenceId, "utf8").digest("hex"),
              evidenceIdHash: createHash("sha256").update(exactEvidenceId, "utf8").digest("hex"),
              objectionEvidenceIdHash: command.intent === "PRICE_OBJECTION"
                ? createHash("sha256").update(exactEvidenceId, "utf8").digest("hex")
                : null,
              intent: command.intent,
              reasonCode: command.intent === "PRICE_OBJECTION" ? command.reasonCode : null,
              observedAt: input.occurredAt,
              evidenceHash: "0".repeat(64),
            };
            return NegotiationTransitionEvidenceV1Schema.parse({
              ...placeholder,
              evidenceHash: createHash("sha256")
                .update(negotiationTransitionEvidenceHashPreimageV1(placeholder), "utf8")
                .digest("hex"),
            });
          })()
        : null;
      const checkoutDetailsTransitionEvidence = command.kind === "CHECKOUT_DETAILS_CAPTURED"
        ? (() => {
            const draftHash = (draft: SalesCycleRuntimeState["checkoutDraft"]): string =>
              createHash("sha256")
                .update(canonicalCheckoutDraftHashPreimageV1(draft), "utf8")
                .digest("hex");
            const placeholder = {
              schemaVersion: 1 as const,
              contractVersion: "CHECKOUT_DETAILS_TRANSITION_EVIDENCE_V1" as const,
              sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
              commandIdHash: createHash("sha256").update(command.commandId, "utf8").digest("hex"),
              details: command.details,
              beforeCheckoutDraftHash: draftHash(before.checkoutDraft),
              afterCheckoutDraftHash: draftHash(state.checkoutDraft),
              appliedAt: input.now.toISOString(),
              evidenceHash: "0".repeat(64),
              contributor: "DETERMINISTIC_RUNTIME" as const,
              authorization: "NONE" as const,
            };
            return CheckoutDetailsTransitionEvidenceV1Schema.parse({
              ...placeholder,
              evidenceHash: createHash("sha256")
                .update(checkoutDetailsTransitionEvidenceHashPreimageV1(placeholder), "utf8")
                .digest("hex"),
            });
          })()
        : null;
      const clarificationTransitionEvidence =
        command.kind === "CLARIFICATION_REQUESTED" || command.kind === "CLARIFICATION_RESOLVED"
          ? (() => {
              const clarificationHash = (
                clarification: SalesCycleRuntimeState["clarification"],
              ): string => createHash("sha256")
                .update(canonicalClarificationStateHashPreimageV1(clarification), "utf8")
                .digest("hex");
              const transition = command.kind === "CLARIFICATION_REQUESTED"
                ? {
                    kind: "REQUESTED" as const,
                    reasonCode: command.reasonCode,
                    missingFields: [...command.missingFields],
                    productId: command.productId,
                    questionFingerprint: command.questionFingerprint,
                    maxAttempts: command.maxAttempts,
                  }
                : { kind: "RESOLVED" as const };
              const placeholder = {
                schemaVersion: 1 as const,
                contractVersion: "CLARIFICATION_TRANSITION_EVIDENCE_V1" as const,
                sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
                commandIdHash: createHash("sha256").update(command.commandId, "utf8").digest("hex"),
                transition,
                beforeClarificationHash: clarificationHash(before.clarification),
                afterClarificationHash: clarificationHash(state.clarification),
                appliedAt: input.now.toISOString(),
                evidenceHash: "0".repeat(64),
                contributor: "DETERMINISTIC_RUNTIME" as const,
                authorization: "NONE" as const,
              };
              return ClarificationTransitionEvidenceV1Schema.parse({
                ...placeholder,
                evidenceHash: createHash("sha256")
                  .update(clarificationTransitionEvidenceHashPreimageV1(placeholder), "utf8")
                  .digest("hex"),
              });
            })()
          : null;
      events.push({
        commandId: command.commandId,
        commandKind: command.kind,
        outcome: result.status,
        stateRevisionBefore: before.revision,
        stateRevisionAfter: state.revision,
        stageBefore: before.stage,
        stageAfter: state.stage,
        cartId: state.cart?.value.cartId ?? null,
        cartVersion: state.cart?.value.revision ?? null,
        reasonCode: result.status === "HANDOFF" ? result.reasonCode : null,
        mutationAction: readinessMutationAction,
        mutationPayloadHash: readinessMutationAction === null || resolvedMutation === undefined
          ? null
          : computeBusinessContentHash(resolvedMutation).replace(/^sha256:/u, ""),
        ...(negotiationTransitionEvidence === null ? {} : { negotiationTransitionEvidence }),
        ...(checkoutDetailsTransitionEvidence === null
          ? {}
          : { checkoutDetailsTransitionEvidence }),
        ...(clarificationTransitionEvidence === null
          ? {}
          : { clarificationTransitionEvidence }),
        ...(command.kind === "PREVIEW_CREATED" && state.preview !== null
          ? { previewArtifact: state.preview }
          : {}),
        occurredAt: input.now,
      });
    }
    return result;
  };

  const commandId = (suffix: string) => `sales:${input.eventKey}:${suffix}`;
  const setCartReplayContext = (
    customerState: "READY" | "HESITANT" | "CAUTIOUS",
  ): void => {
    cartReplayContext = {
      schemaVersion: 1 as const,
      contractVersion: "CANONICAL_CART_REPLAY_CONTEXT_V1",
      shopId: bundle.policy.shopId,
      policyRef: policyReference,
      policyBundle: bundle.policy,
      customerState,
    };
  };
  const cartHash = (cart: CartV1): string => createHash("sha256")
    .update(canonicalCartStateHashPreimageV1(canonicalCartStateV1(cart)), "utf8")
    .digest("hex");
  const freshReadiness = (
    effect: DeterministicEffectReadinessV1["effect"],
    selections: readonly Extract<CartSelectionResult, { status: "READY" }>[],
    cart: CartV1 | null = null,
    preview: SalesCycleRuntimeState["preview"] = null,
    deterministicEvidenceHash: string | null = null,
    checkedAt: Date = effectNow(),
    mutationAction: CartMutationActionV1 | null = null,
    parentReadinessHash: string | null = null,
    payloadHash: string | null = null,
    mutationQuantity: number | null = null,
  ): DeterministicEffectReadinessV1 => {
    const claims = buildProtectedClaimsFromCartSelectionsV1(selections.map((selection) => ({
      productId: selection.line.parentProductId,
      variantId: selection.line.offerId,
      priceVnd: selection.line.posUnitPriceVnd!,
      priceVersion: selection.versions.price,
      inventoryVersion: selection.versions.inventory,
      etaVersion: selection.versions.eta,
      eta: selection.eta,
      etaExpiresAt: selection.etaExpiresAt,
      sourceAuthority: selection.sourceAuthority,
      stockStatus: selection.stockStatus,
      stockAvailableQuantity: selection.stockAvailableQuantity,
      observedAt: selection.sourceObservedAt,
      expiresAt: selection.sourceExpiresAt,
    })));
    effectClaimSets.set(effect, claims);
    return evaluateDeterministicEffectReadinessV1({
      effect,
      pageId: input.pageId,
      conversationId: input.conversationId,
      sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
      conversationRevision: input.conversationRevision,
      salesCycleRevision: initial.revision,
      productIds: selections.map(({ line }) => line.parentProductId),
      cartId: cart?.cartId ?? null,
      cartVersion: cart?.revision ?? null,
      cartStateHash: cart === null
        ? null
        : cartHash(cart),
      ...(cart === null ? {} : { cartLines: cart.lines }),
      orderPreviewId: preview?.previewId ?? null,
      orderPreviewHash: preview?.previewHash.replace(/^sha256:/u, "") ?? null,
      buyingIntent: effect === "CART_OPEN" || (
        effect === "CART_MUTATION" && mutationAction !== "REMOVE_LINE"
      )
        ? input.canonicalBuyingIntent
        : null,
      claims,
      deterministicEvidenceHash,
      mutationAction,
      mutationQuantity,
      parentReadinessHash,
      payloadHash,
      checkedAt,
    });
  };
  const acceptReadiness = (readiness: DeterministicEffectReadinessV1): boolean => {
    lastReadinessAttempt = readiness;
    if (readiness.outcome !== "READY") return false;
    effectReadiness.push(readiness);
    return true;
  };
  const acceptCartMutationReadiness = (
    action: CartMutationActionV1,
    mutationCommandId: string,
    beforeCart: CartV1,
    selections: readonly ReadyCartSelection[],
    checkedAt: Date,
    mutation: CanonicalCartMutationPayloadV1,
    mutationPayloadHash: string,
    authorityKind: "CANONICAL_BUYING_INTENT" | "DETERMINISTIC_REMOVE_CLASSIFIER",
    authorityEvidenceHash: string,
    customerState: "READY" | "HESITANT" | "CAUTIOUS",
  ): DeterministicEffectReadinessV1 => {
    if (!state.cart) {
      return freshReadiness("CART_MUTATION", selections, null, null, null, checkedAt);
    }
    const authorityLine = action === "ADD_LINE"
      ? mutation.kind === "ADD_LINE" ? mutation.line : null
      : mutation.kind === "ADD_LINE"
        ? null
        : beforeCart.lines.find(({ lineId }) => lineId === mutation.lineId) ?? null;
    if (authorityLine === null) {
      return freshReadiness("CART_MUTATION", selections, null, null, null, checkedAt);
    }
    const authorityWithPlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CART_MUTATION_AUTHORITY_BINDING_V1" as const,
      sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
      action,
      productId: authorityLine.parentProductId,
      offerId: authorityLine.offerId,
      authorityKind,
      authorityEvidenceHash,
      bindingHash: "0".repeat(64),
    };
    const authority = CartMutationAuthorityBindingV1Schema.parse({
      ...authorityWithPlaceholder,
      bindingHash: createHash("sha256")
        .update(cartMutationAuthorityBindingHashPreimageV1(authorityWithPlaceholder), "utf8")
        .digest("hex"),
    });
    const receiptWithPlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CART_MUTATION_RECEIPT_V1" as const,
      sequence: cartMutationReceipts.length,
      commandIdHash: createHash("sha256").update(mutationCommandId, "utf8").digest("hex"),
      mutation,
      mutationPayloadHash,
      mutationReasonCode: action === "ADD_LINE"
        ? "LINE_ADDED" as const
        : action === "REMOVE_LINE"
          ? "LINE_REMOVED" as const
          : "QUANTITY_CHANGED" as const,
      authority,
      beforeCartStateHash: cartHash(beforeCart),
      afterCartStateHash: cartHash(state.cart.value),
      customerState,
      appliedAt: input.now.toISOString(),
      evaluatedAt: checkedAt.toISOString(),
      evidenceHash: "0".repeat(64),
      contributor: "DETERMINISTIC_RUNTIME" as const,
      authorization: "NONE" as const,
    };
    const receipt = CartMutationReceiptV1Schema.parse({
      ...receiptWithPlaceholder,
      evidenceHash: createHash("sha256")
        .update(cartMutationReceiptHashPreimageV1(receiptWithPlaceholder), "utf8")
        .digest("hex"),
    });
    const readiness = freshReadiness(
      "CART_MUTATION",
      selections,
      state.cart.value,
      null,
      receipt.evidenceHash,
      checkedAt,
      action,
      null,
      null,
      mutation.kind === "ADD_LINE"
        ? mutation.line.quantity
        : mutation.kind === "SET_QUANTITY"
          ? mutation.quantity
          : null,
    );
    if (acceptReadiness(readiness)) cartMutationReceipts.push(receipt);
    return readiness;
  };
  const plan = (): RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null => {
    if (events.length === 0) return null;
    const cartExpiry = state.cart ? new Date(state.cart.expiresAt) : null;
    const expiresAt = cartExpiry ?? new Date(input.now.getTime() + CART_TTL_MS_V1);
    const batchWithPlaceholder = cartMutationReceipts.length === 0
      ? null
      : {
          schemaVersion: 1 as const,
          contractVersion: "CART_MUTATION_BATCH_EVIDENCE_V1" as const,
          sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
          initialCartStateHash: cartMutationReceipts[0]!.beforeCartStateHash,
          finalCartStateHash: cartMutationReceipts.at(-1)!.afterCartStateHash,
          receipts: cartMutationReceipts,
          replayContext: {
            schemaVersion: 1 as const,
            contractVersion: "CANONICAL_CART_REPLAY_CONTEXT_V1" as const,
            shopId: bundle.policy.shopId,
            policyRef: policyReference,
            policyBundle: bundle.policy,
            customerState: null,
          },
          evidenceHash: "0".repeat(64),
        };
    const cartMutationBatchEvidence = batchWithPlaceholder === null
      ? null
      : CartMutationBatchEvidenceV1Schema.parse({
          ...batchWithPlaceholder,
          evidenceHash: createHash("sha256")
            .update(cartMutationBatchEvidenceHashPreimageV1(batchWithPlaceholder), "utf8")
            .digest("hex"),
        });
    return {
      expectedRevision: initial.revision,
      state,
      cartExpiresAt: cartExpiry,
      expiresAt,
      events,
      readinessContractVersion: "DF06_EFFECT_READINESS_V1",
      sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
      canonicalBuyingIntent: input.canonicalBuyingIntent,
      ...(deterministicConfirmationEvidence
        ? { deterministicConfirmationEvidence }
        : {}),
      effectClaimSets: [...effectClaimSets].map(([effect, claims]) => ({ effect, claims })),
      ...(effectReadiness.length > 0 ? { effectReadiness } : {}),
      ...(cartMutationBatchEvidence === null ? {} : { cartMutationBatchEvidence }),
      ...(cartOpenEvidence === null ? {} : { cartOpenEvidence }),
      ...(cartReplayContext === null ? {} : { cartReplayContext }),
    };
  };
  const handoffStatePlan = (): RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null => {
    return prepareHandoffStatePlanV1(plan());
  };

  const protectedCartReply = async (
    render: (cart: CartV1, selections: readonly ReadyCartSelection[]) => string,
    options: Readonly<{
      selections: readonly ReadyCartSelection[];
      includeEta?: boolean;
      telemetry?: RealtimeSalesCycleTelemetry;
    }>,
  ): Promise<RealtimeSalesCycleOutput> => {
    if (!state.cart) return failedOutput("PROTECTED_OUTBOUND_CART_MISSING");
    if (!selectionsMatchCartLines(state.cart.value.lines, options.selections)) {
      return failedOutput("PROTECTED_OUTBOUND_CART_SNAPSHOT_CHANGED");
    }
    const checkedAt = effectNow();
    const cartClaimExpiry = new Date(Math.min(
      Date.parse(state.cart.expiresAt),
      bundle.policy.effectiveUntil === null
        ? Number.POSITIVE_INFINITY
        : Date.parse(bundle.policy.effectiveUntil),
    )).toISOString();
    const cartClaims = buildProtectedCartPolicyClaimsV1({
      cart: state.cart.value,
      policySourceVersion: `${bundle.policy.policyBundleId}:${bundle.policy.policyVersion}`,
      policyEvidenceRef: `policy:${policyReference.contentHash}`,
      expiresAt: cartClaimExpiry,
    });
    const allClaims = [
      ...buildProtectedClaimsFromCartSelectionsV1(options.selections.map((selection) => ({
        productId: selection.line.parentProductId,
        variantId: selection.line.offerId,
        priceVnd: selection.line.posUnitPriceVnd!,
        priceVersion: selection.versions.price,
        inventoryVersion: selection.versions.inventory,
        etaVersion: selection.versions.eta,
        eta: selection.eta,
        etaExpiresAt: selection.etaExpiresAt,
        sourceAuthority: selection.sourceAuthority,
        stockStatus: selection.stockStatus,
        stockAvailableQuantity: selection.stockAvailableQuantity,
        observedAt: selection.sourceObservedAt,
        expiresAt: selection.sourceExpiresAt,
      }))),
      ...cartClaims,
    ];
    const claimTypes = [...new Set<ProtectedClaimV1["type"]>([
      "PRICE",
      ...cartClaims.map(({ type }) => type),
      ...(options.includeEta ? ["ETA" as const] : []),
    ])].sort();
    const claimTypeSet = new Set(claimTypes);
    const claims = allClaims.filter(({ type }) => claimTypeSet.has(type));
    const message = { kind: "TEXT" as const, text: render(state.cart.value, options.selections) };
    const payloadHash = createHash("sha256")
      .update(canonicalJson([message]), "utf8")
      .digest("hex");
    let parentReadiness = [...effectReadiness].reverse().find((candidate) =>
      candidate.effect !== "PROTECTED_OUTBOUND" &&
      candidate.binding.cart?.cartStateHash === cartHash(state.cart!.value)
    ) ?? null;
    if (parentReadiness === null) {
      const cartReady = freshReadiness(
        "CART_READY",
        options.selections,
        state.cart.value,
        null,
        null,
        checkedAt,
      );
      if (!acceptReadiness(cartReady)) {
        return failedOutput(cartReady.reasonCodes[0] ?? "CART_READY_BLOCKED");
      }
      parentReadiness = cartReady;
    }
    const readiness = evaluateDeterministicEffectReadinessV1({
      effect: "PROTECTED_OUTBOUND",
      pageId: input.pageId,
      conversationId: input.conversationId,
      sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
      conversationRevision: input.conversationRevision,
      salesCycleRevision: initial.revision,
      productIds: state.cart.value.lines.map(({ parentProductId }) => parentProductId),
      cartId: state.cart.value.cartId,
      cartVersion: state.cart.value.revision,
      cartStateHash: cartHash(state.cart.value),
      cartLines: state.cart.value.lines,
      orderPreviewId: state.preview?.previewId ?? null,
      orderPreviewHash: state.preview?.previewHash.replace(/^sha256:/u, "") ?? null,
      buyingIntent: null,
      claims,
      protectedClaimTypes: claimTypes,
      parentReadinessHash: parentReadiness.readinessHash,
      payloadHash,
      checkedAt,
    });
    effectClaimSets.set("PROTECTED_OUTBOUND", claims);
    if (!acceptReadiness(readiness)) {
      return failedOutput(readiness.reasonCodes[0] ?? "PROTECTED_OUTBOUND_BLOCKED");
    }
    return {
      handled: true,
      messages: [message],
      plan: plan(),
      transferToHuman: false,
      desiredTag: null,
      reasonCode: null,
      protectedOutbound: { claims, claimTypes, readiness },
      ...(options.telemetry ? { telemetry: options.telemetry } : {}),
    };
  };

  const requestCheckoutClarification = (
    missing: readonly CheckoutFieldKey[],
    capturedFields: readonly CheckoutFieldKey[] = [],
  ): RealtimeSalesCycleOutput => {
    const productId = input.productId ?? state.cart?.value.lines.at(-1)?.parentProductId ?? null;
    const previous = state.clarification ?? null;
    const sameRequest = previous?.reasonCode === "CHECKOUT_DETAILS_MISSING" &&
      previous.productId === productId &&
      sameMissingFields(previous.missingFields, missing);
    const attemptCount = sameRequest ? previous.attemptCount + 1 : 1;
    if (attemptCount > MAX_CHECKOUT_CLARIFICATION_ATTEMPTS) {
      return {
        ...failedOutput("CLARIFICATION_RETRY_EXHAUSTED", plan()),
        telemetry: {
          checkoutCapturedFields: capturedFields,
          checkoutMissingFields: missing,
          checkoutCompleted: false,
          clarificationReasonCode: "CHECKOUT_DETAILS_MISSING",
          clarificationAttemptCount: previous?.attemptCount ?? MAX_CHECKOUT_CLARIFICATION_ATTEMPTS,
          clarificationMaxAttempts: MAX_CHECKOUT_CLARIFICATION_ATTEMPTS,
          clarificationBudgetExhausted: true,
          clarificationCase: true,
        },
      };
    }
    const message = clarificationMessage(missing, attemptCount);
    const requested = apply({
      kind: "CLARIFICATION_REQUESTED",
      commandId: commandId(`clarification-${attemptCount}`),
      reasonCode: "CHECKOUT_DETAILS_MISSING",
      missingFields: missing,
      productId,
      questionFingerprint: clarificationFingerprint(message),
      maxAttempts: MAX_CHECKOUT_CLARIFICATION_ATTEMPTS,
    });
    if (requested.status !== "APPLIED") {
      return failedOutput(requested.status === "REJECTED"
        ? requested.reasonCode
        : "CLARIFICATION_REQUEST_REJECTED", plan());
    }
    return {
      handled: true,
      messages: [{ kind: "TEXT", text: message }],
      plan: plan(),
      transferToHuman: false,
      desiredTag: null,
      reasonCode: "CHECKOUT_DETAILS_MISSING",
      telemetry: {
        checkoutCapturedFields: capturedFields,
        checkoutMissingFields: missing,
        checkoutCompleted: false,
        clarificationReasonCode: "CHECKOUT_DETAILS_MISSING",
        clarificationAttemptCount: attemptCount,
        clarificationMaxAttempts: MAX_CHECKOUT_CLARIFICATION_ATTEMPTS,
        clarificationBudgetExhausted: false,
        clarificationCase: true,
      },
    };
  };

  if (
    state.stage === "PURCHASE_CONFIRMED" &&
    input.attachmentIds.length > 0
  ) {
    const result = apply({
      kind: "PAYMENT_RECEIPT_RECEIVED",
      commandId: commandId("payment-receipt"),
      sourceMessageId: input.messageId,
      attachmentId: input.attachmentIds[0]!,
    });
    return result.status === "HANDOFF"
      ? failedOutput(result.reasonCode, plan())
      : { handled: false, messages: [], plan: plan(), transferToHuman: false, desiredTag: null, reasonCode: null };
  }

  const legacyConfirmationDecision = confirmation(input.text, input.salesSignals);
  const behaviorModeResolution = input.behaviorModeResolution
    ?? startupBehaviorModeResolution("LEGACY", input.now);
  const behaviorMode = behaviorModeResolution.confirmationMode;
  const v2Classification = behaviorMode === "LEGACY"
    ? null
    : classifyConfirmationContract(
        input.text,
        behaviorMode === "CLARIFY_ONLY"
          ? null
          : input.salesSignals?.purchaseConfirmation ?? null,
      );
  const v2Action = v2Classification
    ? confirmationClarificationAction(v2Classification, state.stage)
    : null;
  const confirmationDecision: ConfirmationDecision = v2Classification && (
    behaviorMode === "V2_ACTIVE" || behaviorMode === "CLARIFY_ONLY"
  )
    ? {
        decision: v2Classification.decision,
        attempted: v2Classification.evidenceDetected,
        source: v2Classification.source,
        reasonCode: v2Classification.reasonCode,
      }
    : legacyConfirmationDecision;
  const behaviorTelemetry = {
    confirmationBehaviorMode: behaviorMode,
    confirmationModeSource: behaviorModeResolution.source,
    confirmationModeVersionId: behaviorModeResolution.modeVersionId,
    confirmationModeContentHash: behaviorModeResolution.contentHash,
    confirmationModePointerRevision: behaviorModeResolution.pointerRevision,
    confirmationModeAuditWrite: behaviorModeResolution.auditWrite,
    confirmationContainmentActive: behaviorMode === "CLARIFY_ONLY",
    ...(behaviorMode === "V2_SHADOW" && v2Classification
      ? {
          confirmationShadow: {
            decision: v2Classification.decision,
            terminal: v2Classification.terminal,
            reasonCode: v2Classification.reasonCode,
            action: v2Action,
            differsFromLegacy:
              legacyConfirmationDecision.decision !== v2Classification.decision ||
              legacyConfirmationDecision.attempted !== v2Classification.evidenceDetected,
            sideEffects: "DISABLED" as const,
          },
        }
      : {}),
  };
  if (behaviorMode === "V2_SHADOW") {
    const legacyOutput = await evaluateRealtimeSalesCycle({
      ...input,
      behaviorModeResolution: startupBehaviorModeResolution("LEGACY", input.now),
    });
    return {
      ...legacyOutput,
      telemetry: {
        ...legacyOutput.telemetry,
        ...behaviorTelemetry,
      },
    };
  }
  const mustClarify = state.stage === "ORDER_PREVIEW" && (
    behaviorMode === "CLARIFY_ONLY"
      ? v2Classification?.evidenceDetected === true
        && v2Classification.decision !== "REJECT"
      : behaviorMode === "V2_ACTIVE" && v2Action === ASK_CONFIRMATION_CLARIFICATION
  );
  if (mustClarify) {
    return {
      handled: true,
      messages: [{ kind: "TEXT", text: "Chị muốn xác nhận mua theo đơn đang xem hay chưa chốt lúc này ạ?" }],
      plan: plan(),
      transferToHuman: false,
      desiredTag: null,
      reasonCode: ASK_CONFIRMATION_CLARIFICATION,
      telemetry: {
        ...behaviorTelemetry,
        confirmationAttempted: true,
        confirmationConfirmed: false,
        confirmationSource: v2Classification?.source ?? null,
        confirmationReasonCode: v2Classification?.reasonCode ?? "CONFIRMATION_CLARIFY_ONLY_CONTAINMENT",
        confirmationAction: ASK_CONFIRMATION_CLARIFICATION,
      },
    };
  }
  if (
    state.stage === "ORDER_PREVIEW"
    && behaviorMode !== "LEGACY"
    && v2Classification?.decision === "REJECT"
  ) {
    return {
      handled: true,
      messages: [],
      plan: null,
      transferToHuman: false,
      desiredTag: null,
      reasonCode: "PURCHASE_CONFIRMATION_REJECTED",
      telemetry: {
        ...behaviorTelemetry,
        confirmationAttempted: true,
        confirmationConfirmed: false,
        confirmationSource: v2Classification.source,
        confirmationReasonCode: v2Classification.reasonCode,
        confirmationAction: null,
      },
    };
  }

  if (state.stage === "ORDER_PREVIEW" && confirmationDecision.decision === "CONFIRM") {
    if (confirmationDecision.source !== "DETERMINISTIC_CLASSIFIER") {
      return {
        handled: true,
        messages: [{ kind: "TEXT", text: "Chị xác nhận rõ giúp em là đồng ý chốt đơn đang xem nhé." }],
        plan: null,
        transferToHuman: false,
        desiredTag: null,
        reasonCode: "ASK_CONFIRMATION_CLARIFICATION",
        telemetry: {
          ...behaviorTelemetry,
          confirmationAttempted: true,
          confirmationConfirmed: false,
          confirmationSource: confirmationDecision.source,
          confirmationReasonCode: "MODEL_CONFIRMATION_NOT_AUTHORITY",
          confirmationAction: ASK_CONFIRMATION_CLARIFICATION,
        },
      };
    }
    if (!state.cart || !state.preview || !state.checkoutDraft?.address) {
      return failedOutput("ORDER_PREVIEW_STATE_INVALID", plan());
    }
    const selections = await currentSelections(
      input, state.cart.value, state.checkoutDraft.address, effectNow(),
    );
    const confirmationCheckedAt = effectNow();
    checkoutValidation = revalidation(
      state.cart.value,
      selections,
      confirmationCheckedAt,
      state.preview.revalidation,
    ).value;
    const readySelections = selections.filter((value): value is Extract<CartSelectionResult, { status: "READY" }> =>
      value.status === "READY"
    );
    deterministicConfirmationEvidence = {
      schemaVersion: 1,
      authorityVersion: "DETERMINISTIC_CONFIRMATION_EVIDENCE_V1",
      classifierVersion: behaviorMode === "LEGACY"
        ? "LEGACY_CONFIRMATION_V1"
        : "CONFIRMATION_CLASSIFIER_V2",
      decision: "CONFIRM",
      reasonCode: "CONFIRMATION_DETERMINISTIC_MATCH",
      sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
      evidenceHash: createHash("sha256")
        .update(canonicalJson([
          input.canonicalBuyingIntent.sourceMessageIdHash,
          behaviorMode === "LEGACY"
            ? "LEGACY_CONFIRMATION_V1"
            : "CONFIRMATION_CLASSIFIER_V2",
          "CONFIRM",
          "CONFIRMATION_DETERMINISTIC_MATCH",
        ]), "utf8")
        .digest("hex"),
      evaluatedAt: confirmationCheckedAt.toISOString(),
      authorization: "NONE",
    };
    const cartReadyReadiness = freshReadiness(
      "CART_READY",
      readySelections,
      state.cart.value,
      null,
      null,
      confirmationCheckedAt,
    );
    if (!acceptReadiness(cartReadyReadiness)) {
      return failedOutput(cartReadyReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
    }
    const previewReadyReadiness = freshReadiness(
      "PREVIEW_READY",
      readySelections,
      state.cart.value,
      state.preview,
      null,
      confirmationCheckedAt,
      null,
      cartReadyReadiness.readinessHash,
    );
    if (!acceptReadiness(previewReadyReadiness)) {
      return failedOutput(previewReadyReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
    }
    const confirmationReadiness = freshReadiness(
      "PURCHASE_CONFIRMATION_READY", readySelections, state.cart.value, state.preview,
      createHash("sha256")
        .update(canonicalJson(deterministicConfirmationEvidence), "utf8")
        .digest("hex"),
      confirmationCheckedAt,
      null,
      previewReadyReadiness.readinessHash,
    );
    if (!acceptReadiness(confirmationReadiness)) {
      return failedOutput(confirmationReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
    }
    const result = apply({
      kind: "CONFIRM_PURCHASE",
      commandId: commandId("confirm"),
      intent: {
        source: confirmationDecision.source ?? "DETERMINISTIC_CLASSIFIER",
        intent: "PURCHASE_CONFIRMATION",
        sourceMessageId: input.messageId,
      },
    });
    if (result.status === "HANDOFF") return failedOutput(result.reasonCode, handoffStatePlan());
    if (result.status !== "APPLIED" || !result.confirmation) {
      return failedOutput("PURCHASE_CONFIRMATION_REJECTED");
    }
    if (!state.cart) return failedOutput("PURCHASE_CONFIRMATION_CART_MISSING");
    const messages: RealtimeSalesCycleOutput["messages"] = [
      {
        kind: "TEXT",
        text: "Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.",
      },
      ...(result.paymentInstruction
        ? [
            { kind: "TEXT" as const, text: result.paymentInstruction.text },
            { kind: "IMAGE" as const, imageUrl: result.paymentInstruction.qrImageUrl },
          ]
        : []),
    ];
    const protectedPayloadHash = createHash("sha256")
      .update(canonicalJson(messages), "utf8")
      .digest("hex");
    const confirmationClaims = effectClaimSets.get("PURCHASE_CONFIRMATION_READY") ?? [];
    const confirmationClaimTypes = [...new Set(
      confirmationClaims.map(({ type }) => type),
    )].sort();
    const protectedOutboundReadiness = evaluateDeterministicEffectReadinessV1({
      effect: "PROTECTED_OUTBOUND",
      pageId: input.pageId,
      conversationId: input.conversationId,
      sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
      conversationRevision: input.conversationRevision,
      salesCycleRevision: input.stateRevision,
      productIds: state.cart?.value.lines.map(({ parentProductId }) => parentProductId) ?? [],
      cartId: state.cart?.value.cartId ?? null,
      cartVersion: state.cart?.value.revision ?? null,
      cartStateHash: state.cart ? cartHash(state.cart.value) : null,
      ...(state.cart ? { cartLines: state.cart.value.lines } : {}),
      orderPreviewId: state.preview?.previewId ?? null,
      orderPreviewHash: state.preview?.previewHash.replace(/^sha256:/u, "") ?? null,
      buyingIntent: null,
      claims: confirmationClaims,
      protectedClaimTypes: confirmationClaimTypes,
      deterministicEvidenceHash: protectedPayloadHash,
      parentReadinessHash: confirmationReadiness.readinessHash,
      payloadHash: protectedPayloadHash,
      checkedAt: confirmationCheckedAt,
    });
    effectClaimSets.set("PROTECTED_OUTBOUND", confirmationClaims);
    if (!acceptReadiness(protectedOutboundReadiness)) {
      return failedOutput(
        protectedOutboundReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED",
      );
    }
    return {
      handled: true,
      messages,
      plan: plan(),
      transferToHuman: true,
      desiredTag: "DA_CHOT_DON",
      reasonCode: "PURCHASE_CONFIRMED",
      protectedOutbound: {
        claims: confirmationClaims,
        claimTypes: confirmationClaimTypes,
        readiness: protectedOutboundReadiness,
      },
      telemetry: {
        ...behaviorTelemetry,
        confirmationAttempted: true,
        confirmationConfirmed: true,
        confirmationSource: confirmationDecision.source,
        confirmationReasonCode: confirmationDecision.reasonCode,
      },
    };
  }

  if (state.cart && (state.stage === "CART_OPEN" || state.stage === "ORDER_PREVIEW")) {
    if (removeItem(input.text)) {
      const productId = input.productId ?? state.cart.value.lines.at(-1)?.parentProductId ?? null;
      const line = state.cart.value.lines.find(({ parentProductId }) => parentProductId === productId);
      if (!line || state.cart.value.lines.length <= 1) {
        return {
          handled: true,
          messages: [{ kind: "TEXT", text: "Giỏ hiện chỉ còn một sản phẩm. Chị gửi mã mẫu muốn đổi để em kiểm tra." }],
          plan: null,
          transferToHuman: false,
          desiredTag: null,
          reasonCode: null,
        };
      }
      const selections = await currentSelections(
        input,
        state.cart.value,
        state.checkoutDraft?.address ?? "",
        effectNow(),
      );
      const readySelections = selections.filter((value): value is Extract<CartSelectionResult, { status: "READY" }> =>
        value.status === "READY" && value.line.lineId !== line.lineId
      );
      const remainingLines = state.cart.value.lines.filter(({ lineId }) => lineId !== line.lineId);
      if (!selectionsMatchCartLines(remainingLines, readySelections)) {
        return failedOutput("CART_REMOVE_SNAPSHOT_CHANGED", plan());
      }
      const beforeCart = state.cart.value;
      const beforeCustomerState = state.negotiation?.customerState;
      if (beforeCustomerState === undefined) return failedOutput("NEGOTIATION_STATE_MISSING");
      const resolved = { mutation: { kind: "REMOVE_LINE" as const, lineId: line.lineId } };
      const mutationPayloadHash = computeBusinessContentHash(resolved).replace(/^sha256:/u, "");
      const reference = {
        id: `cart-mutation:${state.cart.value.cartId}`,
        version: `${state.cart.value.revision + 1}`,
        contentHash: computeBusinessContentHash(resolved),
      };
      references.set(canonicalJson(reference), resolved);
      const result = apply({
        kind: "CART_MUTATED",
        commandId: commandId("remove-line"),
        expectedCartVersion: state.cart.value.revision,
        mutationRef: reference,
        mutationReasonCode: "LINE_REMOVED",
      });
      if (result.status !== "APPLIED" || !state.cart) return failedOutput("CART_REMOVE_FAILED", plan());
      const removeReadiness = acceptCartMutationReadiness(
        "REMOVE_LINE",
        commandId("remove-line"),
        beforeCart,
        readySelections,
        effectNow(),
        resolved.mutation,
        mutationPayloadHash,
        "DETERMINISTIC_REMOVE_CLASSIFIER",
        createHash("sha256").update(canonicalJson([
          "DETERMINISTIC_REMOVE_CLASSIFIER_V1",
          input.canonicalBuyingIntent.sourceMessageIdHash,
          mutationPayloadHash,
        ]), "utf8").digest("hex"),
        beforeCustomerState,
      );
      if (removeReadiness.outcome !== "READY") {
        return failedOutput(removeReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
      }
      return protectedCartReply(
        (cart) => `${cartSummary(cart)}\nEm đã tính lại ưu đãi theo giỏ mới ạ.`,
        { selections: readySelections },
      );
    }

    const modelNegotiation = acceptedModelNegotiationProposal(input);
    if (
      input.behaviorModeResolution?.salesAuthorityMode === "COMMERCE" &&
      modelNegotiation === null &&
      priceObjection(input.text)
    ) {
      // Legacy text matching is rejection-only on COMMERCE: it can contain an
      // undeclared proposal, but can never authorize strategy or an effect.
      return failedOutput("MODEL_NEGOTIATION_PROPOSAL_REJECTED");
    }
    const legacyNegotiation =
      input.behaviorModeResolution?.salesAuthorityMode !== "COMMERCE" &&
      priceObjection(input.text);
    if (modelNegotiation !== null || legacyNegotiation) {
      if (!state.negotiation) return failedOutput("NEGOTIATION_STATE_MISSING", plan());
      const negotiationSelections = await currentSelections(
        input, state.cart.value, state.checkoutDraft?.address ?? "", effectNow(),
      );
      const readyNegotiationSelections = negotiationSelections.filter(
        (value): value is ReadyCartSelection => value.status === "READY",
      );
      if (readyNegotiationSelections.length !== state.cart.value.lines.length) {
        const unavailable = negotiationSelections.find(({ status }) => status !== "READY");
        return failedOutput(
          unavailable && "reasonCode" in unavailable
            ? unavailable.reasonCode
            : "NEGOTIATION_FACTS_UNAVAILABLE",
          plan(),
        );
      }
      if (!selectionsMatchCartLines(state.cart.value.lines, readyNegotiationSelections)) {
        return failedOutput("NEGOTIATION_CART_SNAPSHOT_CHANGED", plan());
      }
      const result = apply({
        kind: "NEGOTIATION_EVENT",
        commandId: commandId("price-objection"),
        expectedNegotiationVersion: state.negotiation.stateVersion,
        sourceMessageId: input.messageId,
        intent: "PRICE_OBJECTION",
        reasonCode: "PRICE_TOO_HIGH",
      });
      if (
        result.status === "DUPLICATE" ||
        (result.status === "REJECTED" &&
          result.reasonCode === "NEGOTIATION_EVENT_ID_COLLISION")
      ) {
        return {
          handled: true,
          messages: [],
          plan: plan(),
          transferToHuman: false,
          desiredTag: null,
          reasonCode: "NEGOTIATION_REPLAY_IGNORED",
        };
      }
      if (result.status !== "APPLIED" || !state.cart || !state.negotiation) {
        return failedOutput("NEGOTIATION_FAILED", plan());
      }
      setCartReplayContext(state.negotiation.customerState);
      return protectedCartReply(
        (cart) => `${modelNegotiation?.wording ?? negotiationOfferText(cart, state.negotiation!.customerState)}\n${cartSummary(cart)}`,
        { selections: readyNegotiationSelections },
      );
    }

    const details = checkoutDetails(input.text, input.salesSignals);
    const hasDetails = Object.keys(details).length > 0;
    if (hasDetails) {
      const prospectiveCheckoutDraft = { ...state.checkoutDraft, ...details };
      const capturedFields = checkoutCapturedFields(details);
      const prospectiveMissing = [
        ...(prospectiveCheckoutDraft.fullName ? [] : ["FULL_NAME" as const]),
        ...(prospectiveCheckoutDraft.phone ? [] : ["PHONE" as const]),
        ...(prospectiveCheckoutDraft.address ? [] : ["ADDRESS" as const]),
        ...(prospectiveCheckoutDraft.paymentMethod ? [] : ["PAYMENT_METHOD" as const]),
      ];
      if (prospectiveMissing.length > 0) {
        const captured = apply({
          kind: "CHECKOUT_DETAILS_CAPTURED",
          commandId: commandId("checkout-details"),
          details,
        });
        if (captured.status !== "APPLIED") {
          return failedOutput("CHECKOUT_DETAILS_REJECTED", plan());
        }
        return requestCheckoutClarification(prospectiveMissing, capturedFields);
      }
      if (prospectiveCheckoutDraft.paymentMethod === "BANK_TRANSFER" && !bank) {
        return failedOutput("BANK_TRANSFER_POLICY_UNAVAILABLE");
      }
      if (!state.cart) return failedOutput("CHECKOUT_DRAFT_INCOMPLETE");
      const preflightCheckedAt = effectNow();
      const selections = await currentSelections(
        input, state.cart.value, prospectiveCheckoutDraft.address!, preflightCheckedAt,
      );
      const readySelections = selections.filter(
        (value): value is ReadyCartSelection => value.status === "READY",
      );
      if (!selectionsMatchCartLines(state.cart.value.lines, readySelections)) {
        return failedOutput("ORDER_PREVIEW_CART_SNAPSHOT_CHANGED");
      }
      const preflightValidation = revalidation(
        state.cart.value, selections, preflightCheckedAt,
      );
      if (!preflightValidation.value.eligible || !preflightValidation.eta) {
        return failedOutput("CHECKOUT_REVALIDATION_UNAVAILABLE");
      }
      const preflightReadiness = freshReadiness(
        "CART_READY", readySelections, state.cart.value,
        null, null, preflightCheckedAt,
      );
      lastReadinessAttempt = preflightReadiness;
      if (preflightReadiness.outcome !== "READY") {
        return failedOutput(
          preflightReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED",
        );
      }
      const captured = apply({
        kind: "CHECKOUT_DETAILS_CAPTURED",
        commandId: commandId("checkout-details"),
        details,
      });
      if (captured.status !== "APPLIED") return failedOutput("CHECKOUT_DETAILS_REJECTED");
      if (state.clarification) {
        const resolved = apply({
          kind: "CLARIFICATION_RESOLVED",
          commandId: commandId("clarification-resolved"),
        });
        if (resolved.status !== "APPLIED") {
          return failedOutput("CLARIFICATION_RESOLVE_REJECTED");
        }
      }
      if (!state.cart || !state.checkoutDraft?.fullName || !state.checkoutDraft.phone ||
          !state.checkoutDraft.address || !state.checkoutDraft.paymentMethod) {
        return failedOutput("CHECKOUT_DRAFT_INCOMPLETE");
      }
      if (state.checkoutDraft.paymentMethod === "BANK_TRANSFER" && !bank) {
        return failedOutput("BANK_TRANSFER_POLICY_UNAVAILABLE");
      }
      if (!state.negotiation) return failedOutput("NEGOTIATION_STATE_MISSING");
      setCartReplayContext(state.negotiation.customerState);
      const ready = apply({
        kind: "CART_READY",
        commandId: commandId("cart-ready"),
        expectedCartVersion: state.cart.value.revision,
      });
      if (ready.status !== "APPLIED" || !state.cart) return failedOutput("CART_READY_REJECTED");
      const previewCheckedAt = effectNow();
      const checked = revalidation(state.cart.value, selections, previewCheckedAt);
      if (!checked.value.eligible || !checked.eta) {
        return failedOutput("CHECKOUT_REVALIDATION_UNAVAILABLE");
      }
      const checkedEta = checked.eta;
      const cartReadyReadiness = freshReadiness(
        "CART_READY", readySelections, state.cart.value,
        null, null, previewCheckedAt,
      );
      if (!acceptReadiness(cartReadyReadiness)) {
        return failedOutput(cartReadyReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
      }
      const previewPayload = {
        schemaVersion: 1 as const,
        previewId: deterministicUuid(`${state.cart.value.cartId}:${state.cart.value.revision}:preview`),
        cartId: state.cart.value.cartId,
        cartVersion: state.cart.value.revision,
        stage: "ORDER_PREVIEW" as const,
        recipient: {
          fullName: state.checkoutDraft.fullName,
          phone: state.checkoutDraft.phone,
          address: state.checkoutDraft.address,
          retentionClass: "CART_48H_OPERATIONAL" as const,
        },
        payment: state.checkoutDraft.paymentMethod === "COD"
          ? { method: "COD" as const, bankTransferPolicyRef: null }
          : { method: "BANK_TRANSFER" as const, bankTransferPolicyRef: bank!.reference },
        revalidation: checked.value,
        createdAt: previewCheckedAt.toISOString(),
        expiresAt: new Date(Math.min(
          Date.parse(state.cart.expiresAt),
          previewCheckedAt.getTime() + PREVIEW_TTL_MS,
        )).toISOString(),
      };
      const preview = OrderPreviewV1Schema.parse({
        ...previewPayload,
        previewHash: computeOrderPreviewHash(previewPayload),
      });
      const previewReadiness = freshReadiness(
        "PREVIEW_READY",
        readySelections,
        state.cart.value,
        preview,
        null,
        previewCheckedAt,
        null,
        cartReadyReadiness.readinessHash,
      );
      if (!acceptReadiness(previewReadiness)) {
        return failedOutput(previewReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
      }
      const previewed = apply({
        kind: "PREVIEW_CREATED",
        commandId: commandId("preview"),
        preview,
      });
      if (previewed.status !== "APPLIED" || !state.cart) return failedOutput("ORDER_PREVIEW_REJECTED");
      return protectedCartReply(
        (cart) => `${cartSummary(cart)}\nNgười nhận: ${preview.recipient.fullName} - ${preview.recipient.phone}\nĐịa chỉ: ${preview.recipient.address}\nThanh toán: ${preview.payment.method === "COD" ? "COD" : "Chuyển khoản"}\nDự kiến nhận hàng: ${checkedEta.minDays}-${checkedEta.maxDays} ngày.\nChị xác nhận chốt đơn giúp em nhé.`,
        { selections: readySelections, includeEta: true, telemetry: {
          checkoutCapturedFields: capturedFields,
          checkoutMissingFields: [],
          checkoutCompleted: true,
          orderPreviewCreated: true,
        } },
      );
    }

    if (
      purchaseReady(input.canonicalBuyingIntent) &&
      input.productId &&
      state.cart.value.lines.some(({ parentProductId }) => parentProductId === input.productId) &&
      requestedQuantityValue(input.canonicalBuyingIntent) !== null
    ) {
      if (!deterministicMutationIntentReady(
        input.canonicalBuyingIntent,
        "SET_QUANTITY",
        input.productId,
        requestedQuantityValue(input.canonicalBuyingIntent)!,
      )) return failedOutput("BUYING_INTENT_MISSING");
      const existing = state.cart.value.lines.find(({ parentProductId }) =>
        parentProductId === input.productId
      )!;
      const quantity = requestedQuantityValue(input.canonicalBuyingIntent)!;
      if (quantity === existing.quantity) {
        return {
          handled: true,
          messages: [],
          plan: null,
          transferToHuman: false,
          desiredTag: null,
          reasonCode: "CART_QUANTITY_UNCHANGED",
        };
      }
      const selections = await currentSelections(
        input,
        state.cart.value,
        state.checkoutDraft?.address ?? "",
        effectNow(),
        new Map([[existing.lineId, quantity]]),
      );
      const readySelections = selections.filter(
        (value): value is ReadyCartSelection => value.status === "READY",
      );
      const prospectiveLines = state.cart.value.lines.map((line) => line.lineId === existing.lineId
        ? {
            ...line,
            quantity,
            lineTotalVnd: line.posUnitPriceVnd === null ? null : line.posUnitPriceVnd * quantity,
          }
        : line);
      if (!selectionsMatchCartLines(prospectiveLines, readySelections)) {
        return failedOutput("CART_QUANTITY_SNAPSHOT_CHANGED", plan());
      }
      const beforeCart = state.cart.value;
      const beforeCustomerState = state.negotiation?.customerState;
      if (beforeCustomerState === undefined) return failedOutput("NEGOTIATION_STATE_MISSING");
      const resolved = {
        mutation: {
          kind: "SET_QUANTITY" as const,
          lineId: existing.lineId,
          quantity,
        },
      };
      const mutationPayloadHash = computeBusinessContentHash(resolved).replace(/^sha256:/u, "");
      const reference = {
        id: `cart-mutation:${state.cart.value.cartId}`,
        version: `${state.cart.value.revision + 1}`,
        contentHash: computeBusinessContentHash(resolved),
      };
      references.set(canonicalJson(reference), resolved);
      const result = apply({
        kind: "CART_MUTATED",
        commandId: commandId("set-quantity"),
        expectedCartVersion: state.cart.value.revision,
        mutationRef: reference,
        mutationReasonCode: "QUANTITY_CHANGED",
      });
      if (result.status !== "APPLIED" || !state.cart) {
        return failedOutput("CART_QUANTITY_CHANGE_FAILED", plan());
      }
      const mutationReadiness = acceptCartMutationReadiness(
        "SET_QUANTITY",
        commandId("set-quantity"),
        beforeCart,
        readySelections,
        effectNow(),
        resolved.mutation,
        mutationPayloadHash,
        "CANONICAL_BUYING_INTENT",
        hashCanonicalBuyingIntentV1(input.canonicalBuyingIntent),
        beforeCustomerState,
      );
      if (mutationReadiness.outcome !== "READY") {
        return failedOutput(mutationReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
      }
      return protectedCartReply(checkoutTemplate, { selections: readySelections });
    }

    if (
      purchaseReady(input.canonicalBuyingIntent) &&
      input.productId &&
      !state.cart.value.lines.some(({ parentProductId }) => parentProductId === input.productId)
    ) {
      if (!deterministicMutationIntentReady(
        input.canonicalBuyingIntent,
        "ADD_LINE",
        input.productId,
        requestedQuantity(input.canonicalBuyingIntent),
      )) return failedOutput("BUYING_INTENT_MISSING");
      if (state.cart.value.lines.length >= MAX_CART_LINES_V1) {
        return failedOutput("CART_CAPACITY_EXCEEDED", plan());
      }
      const selected = await input.facts.resolveCartSelection({
        shopAlias: input.shopAlias,
        productId: input.productId,
        offerType: input.offerType,
        size: explicitSize(input.text) ?? input.size,
        color: input.color,
        quantity: requestedQuantity(input.canonicalBuyingIntent),
        lineId: deterministicUuid(`${state.cart.value.cartId}:${input.productId}:${input.eventKey}`),
      }, effectNow());
      if (selected.status !== "READY") {
        if (selected.status === "SIZE_REQUIRED" || selected.status === "COLOR_REQUIRED") {
          const values = selected.status === "SIZE_REQUIRED" ? selected.availableSizes : selected.availableColors;
          return {
            handled: true,
            messages: [{ kind: "TEXT", text: `Mẫu này hiện có ${selected.status === "SIZE_REQUIRED" ? "size" : "màu"} ${values.join("/")}. Chị chọn phương án phù hợp để em tiếp tục lên giỏ nhé.` }],
            plan: null,
            transferToHuman: false,
            desiredTag: null,
            reasonCode: null,
          };
        }
        return failedOutput(selected.reasonCode, plan());
      }
      const existingSelections = await currentSelections(
        input, state.cart.value, state.checkoutDraft?.address ?? "", effectNow(),
      );
      const readyExistingSelections = existingSelections.filter(
        (value): value is ReadyCartSelection => value.status === "READY",
      );
      if (!selectionsMatchCartLines(state.cart.value.lines, readyExistingSelections)) {
        return failedOutput("CART_ADD_SNAPSHOT_CHANGED", plan());
      }
      const readySelections = [...readyExistingSelections, selected];
      const beforeCart = state.cart.value;
      const beforeCustomerState = state.negotiation?.customerState;
      if (beforeCustomerState === undefined) return failedOutput("NEGOTIATION_STATE_MISSING");
      const resolved = { mutation: { kind: "ADD_LINE" as const, line: selected.line } };
      const mutationPayloadHash = computeBusinessContentHash(resolved).replace(/^sha256:/u, "");
      const reference = {
        id: `cart-mutation:${state.cart.value.cartId}`,
        version: `${state.cart.value.revision + 1}`,
        contentHash: computeBusinessContentHash(resolved),
      };
      references.set(canonicalJson(reference), resolved);
      const result = apply({
        kind: "CART_MUTATED",
        commandId: commandId("add-line"),
        expectedCartVersion: state.cart.value.revision,
        mutationRef: reference,
        mutationReasonCode: "LINE_ADDED",
      });
      if (result.status !== "APPLIED" || !state.cart) return failedOutput("CART_ADD_FAILED", plan());
      const mutationReadiness = acceptCartMutationReadiness(
        "ADD_LINE",
        commandId("add-line"),
        beforeCart,
        readySelections,
        effectNow(),
        resolved.mutation,
        mutationPayloadHash,
        "CANONICAL_BUYING_INTENT",
        hashCanonicalBuyingIntentV1(input.canonicalBuyingIntent),
        beforeCustomerState,
      );
      if (mutationReadiness.outcome !== "READY") {
        return failedOutput(mutationReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
      }
      return protectedCartReply(checkoutTemplate, { selections: readySelections });
    }

    if (state.clarification?.reasonCode === "CHECKOUT_DETAILS_MISSING") {
      const missing = missingCheckout(state);
      if (missing.length === 0) {
        const resolved = apply({
          kind: "CLARIFICATION_RESOLVED",
          commandId: commandId("clarification-resolved"),
        });
        if (resolved.status !== "APPLIED") {
          return failedOutput("CLARIFICATION_RESOLVE_REJECTED", plan());
        }
      } else {
        return requestCheckoutClarification(missing);
      }
    }
  }

  if (
    purchaseReady(input.canonicalBuyingIntent) &&
    input.productId
  ) {
    const selected = await input.facts.resolveCartSelection({
      shopAlias: input.shopAlias,
      productId: input.productId,
      offerType: input.offerType,
      size: explicitSize(input.text) ?? input.size,
      color: input.color,
      quantity: requestedQuantity(input.canonicalBuyingIntent),
      lineId: deterministicUuid(`${input.conversationId}:${input.productId}:${input.eventKey}`),
    }, effectNow());
    if (selected.status !== "READY") {
      if (selected.status === "SIZE_REQUIRED" || selected.status === "COLOR_REQUIRED") {
        if (state.stage === "DISCOVERY") {
          apply({ kind: "FACTS_PRESENTED", commandId: commandId("facts") });
        }
        if (state.stage === "FACTS_PRESENTED") {
          apply({ kind: "MEASUREMENTS_REQUIRED", commandId: commandId("measurements") });
        }
        const values = selected.status === "SIZE_REQUIRED" ? selected.availableSizes : selected.availableColors;
        return {
          handled: true,
          messages: [{ kind: "TEXT", text: `Mẫu này hiện có ${selected.status === "SIZE_REQUIRED" ? "size" : "màu"} ${values.join("/")}. Chị chọn phương án phù hợp để em tiếp tục lên giỏ nhé.` }],
          plan: plan(),
          transferToHuman: false,
          desiredTag: null,
          reasonCode: null,
        };
      }
      return failedOutput(selected.reasonCode, plan());
    }
    if (state.stage === "DISCOVERY") {
      apply({ kind: "FACTS_PRESENTED", commandId: commandId("facts") });
    }
    if (state.stage === "FACTS_PRESENTED") {
      apply({ kind: "MEASUREMENTS_REQUIRED", commandId: commandId("measurements") });
    }
    if (state.stage === "MEASUREMENTS_REQUIRED") {
      apply({ kind: "SIZE_RECOMMENDED", commandId: commandId("size") });
    }
    if (state.stage !== "SIZE_RECOMMENDED") {
      return failedOutput("SALES_STAGE_NOT_READY_FOR_CART", plan());
    }
    const draft = {
      identity: {
        cartId: deterministicUuid(`${input.conversationId}:${input.eventKey}:cart`),
        salesEpisodeId: deterministicUuid(`${input.conversationId}:sales-episode`),
        customerProfileId: deterministicUuid(`${input.customerHash}:customer-profile`),
      },
      lines: [selected.line],
      shopId: selected.shopId,
      policyRef: policyReference,
    };
    const draftReference = {
      id: `cart-draft:${input.conversationId}`,
      version: input.eventKey.slice(-128),
      contentHash: computeBusinessContentHash(draft),
    };
    const policyPin = input.policyResolution?.audit;
    if ((bundle.channel !== "CANARY_LIVE" && bundle.channel !== "PUBLISHED") ||
      policyPin?.pinScopeType !== "SALES_EPISODE" || policyPin.pinScopeId === null ||
      policyPin.channel !== bundle.channel || policyPin.bundleHash !== bundle.bundleHash) {
      return failedOutput("CART_OPEN_POLICY_PIN_REQUIRED");
    }
    references.set(canonicalJson(draftReference), draft);
    const opened = apply({
      kind: "CART_OPENED",
      commandId: commandId("cart-open"),
      cartDraftRef: draftReference,
      expiresAt: new Date(input.now.getTime() + CART_TTL_MS_V1).toISOString(),
    });
    if (opened.status !== "APPLIED" || !state.cart) return failedOutput("CART_OPEN_FAILED", plan());
    const cartOpenPlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CART_OPEN_EVIDENCE_V1" as const,
      sourceMessageIdHash: input.canonicalBuyingIntent.sourceMessageIdHash,
      commandIdHash: createHash("sha256").update(commandId("cart-open"), "utf8").digest("hex"),
      cartDraftRef: draftReference,
      draft,
      replayContext: {
        schemaVersion: 1 as const,
        contractVersion: "CANONICAL_CART_REPLAY_CONTEXT_V1" as const,
        shopId: bundle.policy.shopId,
        policyRef: policyReference,
        policyBundle: bundle.policy,
        customerState: null,
      },
      policyPin: {
        scopeType: "SALES_EPISODE" as const,
        scopeId: policyPin.pinScopeId,
        channel: bundle.channel,
        bundleHash: bundle.bundleHash,
      },
      createdAt: input.now.toISOString(),
      cartExpiresAt: state.cart.expiresAt,
      evidenceHash: "0".repeat(64),
    };
    cartOpenEvidence = CartOpenEvidenceV1Schema.parse({
      ...cartOpenPlaceholder,
      evidenceHash: createHash("sha256")
        .update(cartOpenEvidenceHashPreimageV1(cartOpenPlaceholder), "utf8")
        .digest("hex"),
    });
    const cartOpenReadiness = freshReadiness("CART_OPEN", [selected], state.cart.value);
    if (!acceptReadiness(cartOpenReadiness)) {
      return failedOutput(cartOpenReadiness.reasonCodes[0] ?? "EFFECT_READINESS_BLOCKED");
    }
    return protectedCartReply(checkoutTemplate, { selections: [selected] });
  }

  if (
    state.stage === "DISCOVERY" &&
    input.productId &&
    input.offerType
  ) {
    apply({ kind: "FACTS_PRESENTED", commandId: commandId("facts") });
  }
  return {
    handled: false,
    messages: [],
    plan: plan(),
    transferToHuman: false,
    desiredTag: null,
    reasonCode: null,
    ...(state.stage === "ORDER_PREVIEW" && confirmationDecision.attempted
      ? {
          telemetry: {
            ...behaviorTelemetry,
            confirmationAttempted: true,
            confirmationConfirmed: false,
            confirmationSource: confirmationDecision.source,
            confirmationReasonCode: confirmationDecision.reasonCode,
            confirmationAction: v2Action,
          },
        }
      : {}),
  };
}
