import {
  CheckoutRevalidationV1Schema,
  OrderPreviewV1Schema,
  PurchaseConfirmationV1Schema,
  PolicyBundleV1Schema,
  BankTransferPolicyV1Schema,
  SalesIntentV1Schema,
  type CartV1,
  type CartLineV1,
  type PolicyBundleV1,
  type CheckoutRevalidationV1,
  type OrderPreviewV1,
  type PurchaseConfirmationV1,
  type SalesCycleStageV1,
  type SalesIntentV1,
  type HandoffDecisionV2,
  type BankTransferPolicyV1,
  type BankTransferPolicyReferenceV1,
  type VersionedBusinessReferenceV1,
  PancakeTagCommandV2Schema,
  type PancakeTagCommandV2,
} from "@lana/contracts";
import { decideHandoffFallbackV2 } from "@lana/conversation-engine";
import {
  applyCanonicalCartDecisionV2,
  applyNegotiationEventV2,
  canonicalCartPolicyLinesV2,
  createCanonicalCartV2,
  type CanonicalCartIdentityV2,
  type CanonicalCartMutationV2,
  type NegotiationEvidenceV2,
  type NegotiationStateV2,
} from "@lana/business-tools";
import { createHash } from "node:crypto";

const MAX_PROCESSED_COMMANDS = 100;
const CART_TTL_MS = 48 * 60 * 60 * 1_000;
const MAX_REVALIDATION_AGE_MS = 60 * 1_000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;

export type SalesCycleClarificationReasonV1 = "CHECKOUT_DETAILS_MISSING";

export interface SalesCycleClarificationStateV1 {
  readonly reasonCode: SalesCycleClarificationReasonV1;
  readonly missingFields: readonly string[];
  readonly productId: string | null;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly askedQuestionFingerprints: readonly string[];
  readonly lastRequestedAt: string;
}

export interface SalesCycleRuntimeState {
  readonly schemaVersion: 2;
  readonly conversationKey: string;
  readonly routing: { readonly pageId: string; readonly conversationId: string };
  readonly revision: number;
  readonly stage: SalesCycleStageV1;
  readonly cart: { readonly value: CartV1; readonly expiresAt: string } | null;
  readonly commerceContext: { readonly shopId: string; readonly policyRef: VersionedBusinessReferenceV1 } | null;
  readonly negotiation: NegotiationStateV2 | null;
  /** Encrypted at rest by the production adapter; never copied to analytics. */
  readonly checkoutDraft: {
    readonly fullName: string | null;
    readonly phone: string | null;
    readonly address: string | null;
    readonly paymentMethod: "COD" | "BANK_TRANSFER" | null;
    readonly updatedAt: string;
  } | null;
  /**
   * Additive Wave 1 state. Old persisted schema-v2 records may omit this
   * property; readers must treat an absent value as null.
   */
  readonly clarification?: SalesCycleClarificationStateV1 | null;
  readonly preview: OrderPreviewV1 | null;
  readonly confirmation: PurchaseConfirmationV1 | null;
  readonly processedCommandIds: readonly string[];
  readonly updatedAt: string;
}

export type SalesCycleCommand =
  | { readonly kind: "FACTS_PRESENTED"; readonly commandId: string }
  | { readonly kind: "MEASUREMENTS_REQUIRED"; readonly commandId: string }
  | { readonly kind: "SIZE_RECOMMENDED"; readonly commandId: string }
  | {
      readonly kind: "CART_OPENED";
      readonly commandId: string;
      readonly cartDraftRef: VersionedBusinessReferenceV1;
      readonly expiresAt: string;
    }
  | {
      readonly kind: "CART_MUTATED";
      readonly commandId: string;
      readonly expectedCartVersion: number;
      readonly mutationRef: VersionedBusinessReferenceV1;
      readonly mutationReasonCode: Extract<NegotiationEvidenceV2, { intent: "CART_MUTATED" }>["mutationReasonCode"];
    }
  | {
      readonly kind: "CHECKOUT_DETAILS_CAPTURED";
      readonly commandId: string;
      readonly details: {
        readonly fullName?: string;
        readonly phone?: string;
        readonly address?: string;
        readonly paymentMethod?: "COD" | "BANK_TRANSFER";
      };
    }
  | {
      readonly kind: "CLARIFICATION_REQUESTED";
      readonly commandId: string;
      readonly reasonCode: SalesCycleClarificationReasonV1;
      readonly missingFields: readonly string[];
      readonly productId: string | null;
      readonly questionFingerprint: string;
      readonly maxAttempts: number;
    }
  | {
      readonly kind: "CLARIFICATION_RESOLVED";
      readonly commandId: string;
    }
  | {
      readonly kind: "NEGOTIATION_EVENT";
      readonly commandId: string;
      readonly expectedNegotiationVersion: number;
      readonly sourceMessageId: string;
      readonly intent: "PURCHASE_READY" | "PRICE_OBJECTION" | "OTHER";
      readonly reasonCode: string | null;
    }
  | {
      readonly kind: "CART_READY";
      readonly commandId: string;
      readonly expectedCartVersion: number;
    }
  | { readonly kind: "PREVIEW_CREATED"; readonly commandId: string; readonly preview: OrderPreviewV1 }
  | {
      readonly kind: "CONFIRM_PURCHASE";
      readonly commandId: string;
      readonly intent: SalesIntentV1;
    }
  | { readonly kind: "PAYMENT_RECEIPT_RECEIVED"; readonly commandId: string; readonly sourceMessageId: string; readonly attachmentId: string };

export type CheckoutHandoffReason =
  | "PRICE_CHANGED_BEFORE_CONFIRMATION"
  | "STOCK_CHANGED_BEFORE_CONFIRMATION"
  | "SIZE_CHANGED_BEFORE_CONFIRMATION"
  | "ETA_CHANGED_BEFORE_CONFIRMATION"
  | "PRICE_UNAVAILABLE"
  | "STOCK_UNAVAILABLE"
  | "SIZE_RULE_UNAVAILABLE"
  | "ETA_UNAVAILABLE"
  | "POLICY_UNAVAILABLE"
  | "PAYMENT_RECEIPT_REVIEW_REQUIRED";

export type SalesCycleRuntimeResult =
  | { readonly status: "APPLIED"; readonly state: SalesCycleRuntimeState; readonly confirmation: PurchaseConfirmationV1 | null; readonly paymentInstruction: PaymentInstruction | null; readonly desiredPancakeTag: "DA_CHOT_DON" | null; readonly transferToHuman: boolean }
  | { readonly status: "DUPLICATE"; readonly state: SalesCycleRuntimeState; readonly confirmation: PurchaseConfirmationV1 | null }
  | { readonly status: "CONFLICT" | "REJECTED"; readonly state: SalesCycleRuntimeState; readonly reasonCode: string }
  | { readonly status: "HANDOFF"; readonly state: SalesCycleRuntimeState; readonly reasonCode: CheckoutHandoffReason; readonly silent: true; readonly desiredPancakeTag: "NHAN_VIEN" | null; readonly handoffDecision: HandoffDecisionV2 };

export interface PaymentInstruction {
  readonly method: "BANK_TRANSFER";
  readonly policyId: string;
  readonly policyVersion: string;
  readonly text: string;
  readonly qrImageUrl: string;
}

export type BankTransferPolicyResolver = (reference: BankTransferPolicyReferenceV1) => BankTransferPolicyV1 | null;

export interface ResolvedCartDraftV1 {
  readonly identity: CanonicalCartIdentityV2;
  readonly lines: readonly CartLineV1[];
  readonly shopId: string;
  readonly policyRef: VersionedBusinessReferenceV1;
}

export interface ResolvedCartMutationV1 {
  readonly mutation: CanonicalCartMutationV2;
}

export interface SalesCycleTrustedPortsV1 {
  resolveCartDraft(reference: VersionedBusinessReferenceV1): ResolvedCartDraftV1 | null;
  resolveCartMutation(reference: VersionedBusinessReferenceV1, cart: CartV1): ResolvedCartMutationV1 | null;
  resolveShopPolicy(reference: VersionedBusinessReferenceV1): PolicyBundleV1 | null;
  resolveInboundMessage(sourceMessageId: string): VerifiedInboundMessageV1 | null;
  revalidateCheckout(input: { readonly cart: CartV1; readonly preview: OrderPreviewV1; readonly now: Date }): CheckoutRevalidationV1 | null;
}

export interface VerifiedInboundMessageV1 {
  readonly messageId: string;
  readonly pageId: string;
  readonly conversationId: string;
  readonly senderType: "CUSTOMER" | "PAGE";
  readonly observedAt: string;
  readonly attachments: readonly { readonly attachmentId: string; readonly kind: "IMAGE" | "FILE" | "OTHER" }[];
}

export interface SalesCycleTransactionalEffectsV1 {
  readonly pancakeTagCommand: PancakeTagCommandV2 | null;
  readonly transferToHuman: boolean;
  readonly paymentMessageIntent: { readonly idempotencyKey: string; readonly instruction: PaymentInstruction } | null;
  readonly handoffDecision: HandoffDecisionV2 | null;
  readonly confirmation: PurchaseConfirmationV1 | null;
}

/** Adapter contract: state and external-effect intents must be committed in one database transaction. */
export interface SalesCycleStateRepositoryV1 {
  read(conversationKey: string): Promise<SalesCycleRuntimeState | null>;
  compareAndSwap(input: {
    readonly conversationKey: string;
    readonly expectedRevision: number;
    readonly nextState: SalesCycleRuntimeState;
    readonly effects: SalesCycleTransactionalEffectsV1;
  }): Promise<boolean>;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function computeOrderPreviewHash(preview: Omit<OrderPreviewV1, "previewHash">): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(preview), "utf8").digest("hex")}`;
}

export function computeBankTransferPolicyHash(policy: BankTransferPolicyV1): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(policy), "utf8").digest("hex")}`;
}

export function computeBusinessContentHash(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed, "utf8").digest("hex");
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function resolveVerifiedCustomerInbound(input: {
  readonly state: SalesCycleRuntimeState;
  readonly sourceMessageId: string;
  readonly notBefore: string;
  readonly now: Date;
  readonly ports: SalesCycleTrustedPortsV1 | undefined;
}): VerifiedInboundMessageV1 | null {
  let inbound: VerifiedInboundMessageV1 | null = null;
  try {
    inbound = input.ports?.resolveInboundMessage(input.sourceMessageId) ?? null;
  } catch {
    return null;
  }
  if (inbound === null) return null;
  const observedAt = Date.parse(inbound.observedAt);
  if (
    inbound.messageId !== input.sourceMessageId ||
    inbound.pageId !== input.state.routing.pageId ||
    inbound.conversationId !== input.state.routing.conversationId ||
    inbound.senderType !== "CUSTOMER" ||
    !Number.isFinite(observedAt) ||
    observedAt < Date.parse(input.notBefore) ||
    observedAt > input.now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS
  ) return null;
  return inbound;
}

function buildHandoffTagCommand(state: SalesCycleRuntimeState, decision: HandoffDecisionV2): PancakeTagCommandV2 {
  return PancakeTagCommandV2Schema.parse({
    schemaVersion: 2,
    pageId: state.routing.pageId,
    conversationId: state.routing.conversationId,
    desiredTag: decision.tag,
    operation: "ADD",
    idempotencyKey: `handoff:${decision.decisionId}`,
  });
}

function resolveTrustedPolicy(reference: VersionedBusinessReferenceV1, ports: SalesCycleTrustedPortsV1 | undefined): PolicyBundleV1 | null {
  if (ports === undefined) return null;
  try {
    const resolved = ports.resolveShopPolicy(reference);
    if (resolved === null) return null;
    const parsed = PolicyBundleV1Schema.safeParse(resolved);
    if (!parsed.success || parsed.data.policyBundleId !== reference.id || parsed.data.policyVersion !== reference.version) return null;
    return computeBusinessContentHash(parsed.data) === reference.contentHash ? parsed.data : null;
  } catch {
    return null;
  }
}

export function buildPurchaseConfirmedTagCommand(input: {
  readonly pageId: string;
  readonly conversationId: string;
  readonly confirmation: PurchaseConfirmationV1;
}): PancakeTagCommandV2 {
  return PancakeTagCommandV2Schema.parse({
    schemaVersion: 2,
    pageId: input.pageId,
    conversationId: input.conversationId,
    desiredTag: "DA_CHOT_DON",
    operation: "ADD",
    idempotencyKey: `purchase-confirmed:${input.confirmation.confirmationId}`,
  });
}

export function createSalesCycleRuntimeState(conversationKey: string, routing: { readonly pageId: string; readonly conversationId: string }, now: Date): SalesCycleRuntimeState {
  if (conversationKey.trim() === "" || routing.pageId.trim() === "" || routing.conversationId.trim() === "" || !Number.isFinite(now.getTime())) throw new Error("SALES_CYCLE_STATE_INVALID");
  return {
    schemaVersion: 2,
    conversationKey,
    routing,
    revision: 0,
    stage: "DISCOVERY",
    cart: null,
    commerceContext: null,
    negotiation: null,
    checkoutDraft: null,
    preview: null,
    confirmation: null,
    processedCommandIds: [],
    updatedAt: now.toISOString(),
  };
}

function cartAlive(state: SalesCycleRuntimeState, now: Date): state is SalesCycleRuntimeState & { cart: NonNullable<SalesCycleRuntimeState["cart"]> } {
  return state.cart !== null && Date.parse(state.cart.expiresAt) > now.getTime();
}

function negotiationSnapshot(cart: CartV1, shopId: string) {
  const lines = canonicalCartPolicyLinesV2(cart.lines, shopId);
  return lines === null ? null : { cartId: cart.cartId, cartVersion: cart.revision, lines };
}

function applyCartMutationNegotiation(input: {
  readonly state: SalesCycleRuntimeState & { cart: NonNullable<SalesCycleRuntimeState["cart"]> };
  readonly cart: CartV1;
  readonly commandId: string;
  readonly mutationReasonCode: Extract<NegotiationEvidenceV2, { intent: "CART_MUTATED" }>["mutationReasonCode"];
  readonly shopId: string;
  readonly policy: PolicyBundleV1;
  readonly now: Date;
}): NegotiationStateV2 | null {
  if (input.state.negotiation === null) return null;
  const snapshot = negotiationSnapshot(input.cart, input.shopId);
  if (snapshot === null) return null;
  const decision = applyNegotiationEventV2({
    negotiationId: input.state.negotiation.negotiationId,
    state: input.state.negotiation,
    expectedStateVersion: input.state.negotiation.stateVersion,
    expectedCartVersion: input.state.cart.value.revision,
    eventId: `${input.commandId}:cart-mutated`,
    evidence: { source: "RUNTIME", intent: "CART_MUTATED", evidenceId: input.commandId, mutationReasonCode: input.mutationReasonCode, observedAt: input.now.toISOString() },
    cart: snapshot,
    policy: input.policy,
    now: input.now,
  });
  return decision.status === "BLOCKED" ? null : decision.state;
}

function withCommand(
  state: SalesCycleRuntimeState,
  commandId: string,
  now: Date,
  changes: Partial<Omit<SalesCycleRuntimeState, "schemaVersion" | "conversationKey" | "revision" | "processedCommandIds" | "updatedAt">>,
): SalesCycleRuntimeState {
  const processedCommandIds = [...state.processedCommandIds, commandId].slice(-MAX_PROCESSED_COMMANDS);
  return { ...state, ...changes, revision: state.revision + 1, processedCommandIds, updatedAt: now.toISOString() };
}

function revalidationHandoff(value: CheckoutRevalidationV1): CheckoutHandoffReason | null {
  const groups = [
    ["price", value.price, "PRICE_CHANGED_BEFORE_CONFIRMATION", "PRICE_UNAVAILABLE"],
    ["inventory", value.inventory, "STOCK_CHANGED_BEFORE_CONFIRMATION", "STOCK_UNAVAILABLE"],
    ["size", value.size, "SIZE_CHANGED_BEFORE_CONFIRMATION", "SIZE_RULE_UNAVAILABLE"],
    ["eta", value.eta, "ETA_CHANGED_BEFORE_CONFIRMATION", "ETA_UNAVAILABLE"],
  ] as const;
  for (const [, fact, changedReason, unavailableReason] of groups) {
    if (fact.status === "CHANGED") return changedReason;
    if (fact.status === "STALE" || fact.status === "MISSING") return unavailableReason;
  }
  return null;
}

function baselineMismatchHandoff(preview: CheckoutRevalidationV1, current: CheckoutRevalidationV1): CheckoutHandoffReason | null {
  const groups = [
    [preview.price, current.price, "PRICE_CHANGED_BEFORE_CONFIRMATION"],
    [preview.inventory, current.inventory, "STOCK_CHANGED_BEFORE_CONFIRMATION"],
    [preview.size, current.size, "SIZE_CHANGED_BEFORE_CONFIRMATION"],
    [preview.eta, current.eta, "ETA_CHANGED_BEFORE_CONFIRMATION"],
  ] as const;
  for (const [before, after, reason] of groups) {
    if (after.sourceVersionBefore !== before.sourceVersionAfter) return reason;
  }
  return null;
}

function paymentInstruction(preview: OrderPreviewV1, now: Date, resolvePolicy: BankTransferPolicyResolver | undefined): PaymentInstruction | null {
  if (preview.payment.method !== "BANK_TRANSFER") return null;
  if (resolvePolicy === undefined) return null;
  const reference = preview.payment.bankTransferPolicyRef;
  let rawPolicy: BankTransferPolicyV1 | null = null;
  try {
    rawPolicy = resolvePolicy(reference);
  } catch {
    return null;
  }
  const parsed = BankTransferPolicyV1Schema.safeParse(rawPolicy);
  if (!parsed.success) return null;
  const policy = parsed.data;
  if (policy.policyId !== reference.policyId || policy.version !== reference.version || computeBankTransferPolicyHash(policy) !== reference.contentHash) return null;
  if (now.getTime() < Date.parse(policy.effectiveAt) || (policy.effectiveUntil !== null && now.getTime() >= Date.parse(policy.effectiveUntil))) {
    return null;
  }
  return {
    method: "BANK_TRANSFER",
    policyId: policy.policyId,
    policyVersion: policy.version,
    text: `Số tài khoản: ${policy.accountNumber}\nChủ tài khoản: ${policy.accountHolder}\nNgân hàng: ${policy.bankName}\n${policy.customerInstruction}`,
    qrImageUrl: policy.qrImageUrl,
  };
}

function checkoutHandoff(reason: CheckoutHandoffReason, commandId: string, now: Date): HandoffDecisionV2 {
  const receipt = reason === "PAYMENT_RECEIPT_REVIEW_REQUIRED";
  return decideHandoffFallbackV2({
    schemaVersion: 2,
    commandId,
    decidedAt: now.toISOString(),
    trigger: receipt
      ? { kind: "PAYMENT_RECEIPT_AFTER_PURCHASE_CONFIRMED", milestone: "PURCHASE_CONFIRMED" }
      : { kind: "REASON_CODE", reason },
    evidence: [{
      source: receipt ? "INBOUND_MESSAGE" : "BUSINESS_TOOL",
      reference: commandId,
      observedAt: now.toISOString(),
    }],
  });
}

/** Pure CAS state machine. Persistence must commit state and outbox/tag intents atomically. */
export function applySalesCycleCommand(input: {
  readonly state: SalesCycleRuntimeState;
  readonly expectedRevision: number;
  readonly command: SalesCycleCommand;
  readonly now: Date;
  /** Trusted application port. Commands/model output can carry only a policy reference. */
  readonly resolveBankTransferPolicy?: BankTransferPolicyResolver;
  /** Only application adapters may implement these ports; model output never supplies facts or policy payloads. */
  readonly trustedPorts?: SalesCycleTrustedPortsV1;
}): SalesCycleRuntimeResult {
  const { state, command, now } = input;
  if (!Number.isFinite(now.getTime()) || command.commandId.trim() === "") return { status: "REJECTED", state, reasonCode: "COMMAND_INVALID" };
  if (state.processedCommandIds.includes(command.commandId)) return { status: "DUPLICATE", state, confirmation: state.confirmation };
  if (input.expectedRevision !== state.revision) return { status: "CONFLICT", state, reasonCode: "STATE_VERSION_CONFLICT" };
  if (state.stage === "HANDED_OFF" || (state.stage === "PURCHASE_CONFIRMED" && command.kind !== "PAYMENT_RECEIPT_RECEIVED")) {
    return { status: "REJECTED", state, reasonCode: "SALES_CYCLE_TERMINAL" };
  }

  if (command.kind === "FACTS_PRESENTED" || command.kind === "MEASUREMENTS_REQUIRED" || command.kind === "SIZE_RECOMMENDED") {
    const transitionAllowed =
      (command.kind === "FACTS_PRESENTED" && (state.stage === "DISCOVERY" || state.stage === "FACTS_PRESENTED")) ||
      (command.kind === "MEASUREMENTS_REQUIRED" && (state.stage === "FACTS_PRESENTED" || state.stage === "MEASUREMENTS_REQUIRED")) ||
      (command.kind === "SIZE_RECOMMENDED" && (state.stage === "MEASUREMENTS_REQUIRED" || state.stage === "SIZE_RECOMMENDED"));
    if (!transitionAllowed) return { status: "REJECTED", state, reasonCode: "SALES_STAGE_TRANSITION_INVALID" };
    const stage = command.kind === "FACTS_PRESENTED" ? "FACTS_PRESENTED" : command.kind === "MEASUREMENTS_REQUIRED" ? "MEASUREMENTS_REQUIRED" : "SIZE_RECOMMENDED";
    return { status: "APPLIED", state: withCommand(state, command.commandId, now, { stage }), confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "CART_OPENED") {
    if (!["SIZE_RECOMMENDED", "CART_OPEN", "ORDER_PREVIEW"].includes(state.stage)) {
      return { status: "REJECTED", state, reasonCode: "SALES_STAGE_TRANSITION_INVALID" };
    }
    if (state.confirmation !== null) return { status: "REJECTED", state, reasonCode: "PURCHASE_ALREADY_CONFIRMED" };
    if (cartAlive(state, now)) return { status: "REJECTED", state, reasonCode: "CART_ALREADY_OPEN" };
    const expiresAt = Date.parse(command.expiresAt);
    const remainingTtl = expiresAt - now.getTime();
    if (!Number.isFinite(expiresAt) || remainingTtl <= 0 || remainingTtl > CART_TTL_MS) return { status: "REJECTED", state, reasonCode: "CART_EXPIRY_INVALID" };
    let draft: ResolvedCartDraftV1 | null = null;
    try {
      draft = input.trustedPorts?.resolveCartDraft(command.cartDraftRef) ?? null;
    } catch {
      draft = null;
    }
    if (draft === null || computeBusinessContentHash(draft) !== command.cartDraftRef.contentHash) return { status: "REJECTED", state, reasonCode: "CART_DRAFT_UNTRUSTED" };
    const policy = resolveTrustedPolicy(draft.policyRef, input.trustedPorts);
    if (policy === null) return { status: "REJECTED", state, reasonCode: "SHOP_POLICY_UNTRUSTED" };
    const creation = createCanonicalCartV2({ identity: draft.identity, lines: draft.lines, shopId: draft.shopId, policy, now });
    if (creation.status === "BLOCKED") return { status: "REJECTED", state, reasonCode: `CART_CREATE_${creation.reasonCode}` };
    const snapshot = negotiationSnapshot(creation.cart, draft.shopId);
    if (snapshot === null) return { status: "REJECTED", state, reasonCode: "CART_PRICE_FACT_INVALID" };
    const negotiation = applyNegotiationEventV2({
      negotiationId: `negotiation:${creation.cart.cartId}`,
      state: null,
      expectedStateVersion: 0,
      expectedCartVersion: creation.cart.revision,
      eventId: `${command.commandId}:ready`,
      evidence: { source: "MODEL_INTERPRETATION", intent: "PURCHASE_READY", evidenceId: `${command.commandId}:ready`, observedAt: now.toISOString() },
      cart: snapshot,
      policy,
      now,
    });
    if (negotiation.status === "BLOCKED") return { status: "REJECTED", state, reasonCode: `NEGOTIATION_${negotiation.reasonCode}` };
    const next = withCommand(state, command.commandId, now, { stage: "CART_OPEN", cart: { value: creation.cart, expiresAt: command.expiresAt }, commerceContext: { shopId: draft.shopId, policyRef: draft.policyRef }, negotiation: negotiation.state, checkoutDraft: null, preview: null });
    return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "CHECKOUT_DETAILS_CAPTURED") {
    if (state.stage !== "CART_OPEN" && state.stage !== "ORDER_PREVIEW") {
      return { status: "REJECTED", state, reasonCode: "SALES_STAGE_TRANSITION_INVALID" };
    }
    if (!cartAlive(state, now)) {
      return { status: "REJECTED", state, reasonCode: "CART_EXPIRED_OR_MISSING" };
    }
    const details = command.details;
    const fullName = details.fullName?.trim().replace(/\s+/gu, " ") ?? null;
    const phone = details.phone?.trim().replace(/\s+/gu, " ") ?? null;
    const address = details.address?.trim().replace(/\s+/gu, " ") ?? null;
    if (
      (fullName !== null && (fullName.length < 2 || fullName.length > 160)) ||
      (phone !== null && !/^[0-9+][0-9 .()-]{7,24}$/u.test(phone)) ||
      (address !== null && (address.length < 8 || address.length > 1_000)) ||
      (fullName === null && phone === null && address === null && details.paymentMethod === undefined)
    ) {
      return { status: "REJECTED", state, reasonCode: "CHECKOUT_DETAILS_INVALID" };
    }
    const previous = state.checkoutDraft;
    const checkoutDraft = {
      fullName: fullName ?? previous?.fullName ?? null,
      phone: phone ?? previous?.phone ?? null,
      address: address ?? previous?.address ?? null,
      paymentMethod: details.paymentMethod ?? previous?.paymentMethod ?? null,
      updatedAt: now.toISOString(),
    };
    const next = withCommand(state, command.commandId, now, {
      stage: "CART_OPEN",
      checkoutDraft,
      preview: null,
    });
    return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "CLARIFICATION_REQUESTED") {
    if (state.stage !== "CART_OPEN" && state.stage !== "ORDER_PREVIEW") {
      return { status: "REJECTED", state, reasonCode: "SALES_STAGE_TRANSITION_INVALID" };
    }
    const missingFields = [...new Set(command.missingFields.map((field) => field.trim()))]
      .filter(Boolean)
      .sort();
    const questionFingerprint = command.questionFingerprint.trim();
    if (
      missingFields.length === 0 ||
      missingFields.some((field) => field.length > 80) ||
      !Number.isSafeInteger(command.maxAttempts) ||
      command.maxAttempts < 1 ||
      command.maxAttempts > 10 ||
      !/^[a-f0-9]{64}$/u.test(questionFingerprint)
    ) {
      return { status: "REJECTED", state, reasonCode: "CLARIFICATION_REQUEST_INVALID" };
    }
    const previous = state.clarification ?? null;
    const sameQuestion =
      previous?.reasonCode === command.reasonCode &&
      previous.productId === command.productId &&
      previous.missingFields.length === missingFields.length &&
      previous.missingFields.every((field, index) => field === missingFields[index]);
    const attemptCount = sameQuestion ? previous.attemptCount + 1 : 1;
    const askedQuestionFingerprints = sameQuestion
      ? [...previous.askedQuestionFingerprints, questionFingerprint]
      : [questionFingerprint];
    if (
      attemptCount > command.maxAttempts ||
      (sameQuestion && previous.askedQuestionFingerprints.includes(questionFingerprint))
    ) {
      return { status: "REJECTED", state, reasonCode: "CLARIFICATION_RETRY_INVALID" };
    }
    const next = withCommand(state, command.commandId, now, {
      clarification: {
        reasonCode: command.reasonCode,
        missingFields,
        productId: command.productId,
        attemptCount,
        maxAttempts: command.maxAttempts,
        askedQuestionFingerprints,
        lastRequestedAt: now.toISOString(),
      },
    });
    return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "CLARIFICATION_RESOLVED") {
    if (state.clarification === null || state.clarification === undefined) {
      return { status: "REJECTED", state, reasonCode: "CLARIFICATION_NOT_ACTIVE" };
    }
    const next = withCommand(state, command.commandId, now, { clarification: null });
    return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "CART_MUTATED" || command.kind === "CART_READY") {
    if (state.stage !== "CART_OPEN" && state.stage !== "ORDER_PREVIEW") return { status: "REJECTED", state, reasonCode: "SALES_STAGE_TRANSITION_INVALID" };
    if (!cartAlive(state, now) || state.negotiation === null || state.commerceContext === null) return { status: "REJECTED", state, reasonCode: "CART_EXPIRED_OR_MISSING" };
    const policy = resolveTrustedPolicy(state.commerceContext.policyRef, input.trustedPorts);
    if (policy === null) return { status: "REJECTED", state, reasonCode: "SHOP_POLICY_UNTRUSTED" };
    let mutation: CanonicalCartMutationV2 | null = null;
    if (command.kind === "CART_MUTATED") {
      let resolved: ResolvedCartMutationV1 | null = null;
      try {
        resolved = input.trustedPorts?.resolveCartMutation(command.mutationRef, state.cart.value) ?? null;
      } catch {
        resolved = null;
      }
      if (resolved === null || computeBusinessContentHash(resolved) !== command.mutationRef.contentHash) return { status: "REJECTED", state, reasonCode: "CART_MUTATION_UNTRUSTED" };
      mutation = resolved.mutation;
    }
    const cartDecision = applyCanonicalCartDecisionV2({
      cart: state.cart.value,
      expectedCartVersion: command.expectedCartVersion,
      mutation,
      shopId: state.commerceContext.shopId,
      policy,
      customerState: state.negotiation.customerState,
      readyForConfirmation: command.kind === "CART_READY",
      now,
    });
    if (cartDecision.status === "BLOCKED") {
      const status = cartDecision.reasonCode === "CART_VERSION_CONFLICT" ? "CONFLICT" : "REJECTED";
      return { status, state, reasonCode: cartDecision.reasonCode };
    }
    const negotiation = applyCartMutationNegotiation({ state, cart: cartDecision.cart, commandId: command.commandId, mutationReasonCode: command.kind === "CART_MUTATED" ? command.mutationReasonCode : "OTHER", shopId: state.commerceContext.shopId, policy, now });
    if (negotiation === null) return { status: "REJECTED", state, reasonCode: "NEGOTIATION_REPRICE_BLOCKED" };
    const next = withCommand(state, command.commandId, now, { stage: "CART_OPEN", cart: { value: cartDecision.cart, expiresAt: state.cart.expiresAt }, negotiation, preview: null });
    return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "NEGOTIATION_EVENT") {
    if (state.stage !== "CART_OPEN" && state.stage !== "ORDER_PREVIEW") return { status: "REJECTED", state, reasonCode: "SALES_STAGE_TRANSITION_INVALID" };
    if (!cartAlive(state, now) || state.negotiation === null || state.commerceContext === null) return { status: "REJECTED", state, reasonCode: "CART_EXPIRED_OR_MISSING" };
    const policy = resolveTrustedPolicy(state.commerceContext.policyRef, input.trustedPorts);
    if (policy === null) return { status: "REJECTED", state, reasonCode: "SHOP_POLICY_UNTRUSTED" };
    const inbound = resolveVerifiedCustomerInbound({ state, sourceMessageId: command.sourceMessageId, notBefore: state.cart.value.createdAt, now, ports: input.trustedPorts });
    if (inbound === null) return { status: "REJECTED", state, reasonCode: "INBOUND_EVIDENCE_UNTRUSTED" };
    const snapshot = negotiationSnapshot(state.cart.value, state.commerceContext.shopId);
    if (snapshot === null) return { status: "REJECTED", state, reasonCode: "CART_PRICE_FACT_INVALID" };
    const evidence: Exclude<NegotiationEvidenceV2, { intent: "CART_MUTATED" }> = command.intent === "PRICE_OBJECTION"
      ? { source: "MODEL_INTERPRETATION", intent: "PRICE_OBJECTION", evidenceId: `inbound:${inbound.messageId}`, objectionEvidenceId: `inbound:${inbound.messageId}`, reasonCode: command.reasonCode ?? "PRICE_OBJECTION", observedAt: inbound.observedAt }
      : { source: "MODEL_INTERPRETATION", intent: command.intent, evidenceId: `inbound:${inbound.messageId}`, observedAt: inbound.observedAt };
    const decision = applyNegotiationEventV2({ negotiationId: state.negotiation.negotiationId, state: state.negotiation, expectedStateVersion: command.expectedNegotiationVersion, expectedCartVersion: state.cart.value.revision, eventId: `inbound:${inbound.messageId}`, evidence, cart: snapshot, policy, now });
    if (decision.status === "BLOCKED") {
      const status = decision.reasonCode === "STATE_VERSION_CONFLICT" || decision.reasonCode === "CART_VERSION_CONFLICT" ? "CONFLICT" : "REJECTED";
      return { status, state, reasonCode: `NEGOTIATION_${decision.reasonCode}` };
    }
    if (decision.status === "REPLAYED") {
      const next = withCommand(state, command.commandId, now, {});
      return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
    }
    const repriced = applyCanonicalCartDecisionV2({ cart: state.cart.value, expectedCartVersion: state.cart.value.revision, mutation: null, shopId: state.commerceContext.shopId, policy, customerState: decision.state.customerState, now });
    if (repriced.status === "BLOCKED") return { status: "REJECTED", state, reasonCode: `CART_REPRICE_${repriced.reasonCode}` };
    const negotiation = { ...decision.state, cartVersion: repriced.cart.revision, updatedAt: now.toISOString() };
    const next = withCommand(state, command.commandId, now, { stage: "CART_OPEN", cart: { value: repriced.cart, expiresAt: state.cart.expiresAt }, negotiation, preview: null });
    return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "PREVIEW_CREATED") {
    if (state.stage !== "CART_OPEN") return { status: "REJECTED", state, reasonCode: "SALES_STAGE_TRANSITION_INVALID" };
    const preview = OrderPreviewV1Schema.safeParse(command.preview);
    if (!preview.success || state.cart === null || Date.parse(state.cart.expiresAt) <= now.getTime()) {
      return { status: "REJECTED", state, reasonCode: "PREVIEW_INVALID" };
    }
    if (state.cart.value.status !== "READY_FOR_CONFIRMATION" || preview.data.cartId !== state.cart.value.cartId || preview.data.cartVersion !== state.cart.value.revision) {
      return { status: "CONFLICT", state, reasonCode: "PREVIEW_CART_VERSION_CONFLICT" };
    }
    const { previewHash: _providedHash, ...hashPayload } = preview.data;
    if (
      preview.data.previewHash !== computeOrderPreviewHash(hashPayload) ||
      Date.parse(preview.data.expiresAt) > Date.parse(state.cart.expiresAt) ||
      state.checkoutDraft === null ||
      state.checkoutDraft.fullName !== preview.data.recipient.fullName ||
      state.checkoutDraft.phone !== preview.data.recipient.phone ||
      state.checkoutDraft.address !== preview.data.recipient.address ||
      state.checkoutDraft.paymentMethod !== preview.data.payment.method
    ) {
      return { status: "REJECTED", state, reasonCode: "PREVIEW_INTEGRITY_INVALID" };
    }
    const next = withCommand(state, command.commandId, now, { stage: "ORDER_PREVIEW", preview: preview.data });
    return { status: "APPLIED", state: next, confirmation: null, paymentInstruction: null, desiredPancakeTag: null, transferToHuman: false };
  }

  if (command.kind === "PAYMENT_RECEIPT_RECEIVED") {
    if (state.stage !== "PURCHASE_CONFIRMED" || state.confirmation === null) return { status: "REJECTED", state, reasonCode: "PAYMENT_RECEIPT_WITHOUT_CONFIRMED_PURCHASE" };
    const inbound = resolveVerifiedCustomerInbound({ state, sourceMessageId: command.sourceMessageId, notBefore: state.confirmation.confirmedAt, now, ports: input.trustedPorts });
    if (inbound === null || !inbound.attachments.some(({ attachmentId, kind }) => attachmentId === command.attachmentId && (kind === "IMAGE" || kind === "FILE"))) {
      return { status: "REJECTED", state, reasonCode: "PAYMENT_RECEIPT_EVIDENCE_UNTRUSTED" };
    }
    const next = withCommand(state, command.commandId, now, { stage: "HANDED_OFF" });
    return { status: "HANDOFF", state: next, reasonCode: "PAYMENT_RECEIPT_REVIEW_REQUIRED", silent: true, desiredPancakeTag: "NHAN_VIEN", handoffDecision: checkoutHandoff("PAYMENT_RECEIPT_REVIEW_REQUIRED", command.commandId, now) };
  }

  const intent = SalesIntentV1Schema.safeParse(command.intent);
  if (!intent.success || intent.data.intent !== "PURCHASE_CONFIRMATION") {
    return { status: "REJECTED", state, reasonCode: "NOT_A_PURCHASE_CONFIRMATION" };
  }
  if (state.stage !== "ORDER_PREVIEW" || state.preview === null || state.cart === null) {
    return { status: "REJECTED", state, reasonCode: "CONFIRMATION_OUTSIDE_ORDER_PREVIEW" };
  }
  const confirmationInbound = resolveVerifiedCustomerInbound({ state, sourceMessageId: intent.data.sourceMessageId, notBefore: state.preview.createdAt, now, ports: input.trustedPorts });
  if (confirmationInbound === null) return { status: "REJECTED", state, reasonCode: "PURCHASE_CONFIRMATION_EVIDENCE_UNTRUSTED" };
  if (state.confirmation !== null) return { status: "REJECTED", state, reasonCode: "PURCHASE_ALREADY_CONFIRMED" };
  let rawValidation: CheckoutRevalidationV1 | null = null;
  try {
    rawValidation = input.trustedPorts?.revalidateCheckout({ cart: state.cart.value, preview: state.preview, now }) ?? null;
  } catch {
    rawValidation = null;
  }
  const validation = CheckoutRevalidationV1Schema.safeParse(rawValidation);
  if (!validation.success) {
    const next = withCommand(state, command.commandId, now, { stage: "HANDED_OFF", preview: null });
    return { status: "HANDOFF", state: next, reasonCode: "POLICY_UNAVAILABLE", silent: true, desiredPancakeTag: "NHAN_VIEN", handoffDecision: checkoutHandoff("POLICY_UNAVAILABLE", command.commandId, now) };
  }
  if (!validation.success || validation.data.cartId !== state.cart.value.cartId || validation.data.cartVersion !== state.cart.value.revision) {
    return { status: "CONFLICT", state, reasonCode: "CONFIRMATION_REVALIDATION_CONFLICT" };
  }
  const handoffReason = revalidationHandoff(validation.data) ?? baselineMismatchHandoff(state.preview.revalidation, validation.data);
  if (handoffReason !== null || !validation.data.eligible) {
    const next = withCommand(state, command.commandId, now, { stage: "HANDED_OFF", preview: null });
    const reason = handoffReason ?? "POLICY_UNAVAILABLE";
    return { status: "HANDOFF", state: next, reasonCode: reason, silent: true, desiredPancakeTag: "NHAN_VIEN", handoffDecision: checkoutHandoff(reason, command.commandId, now) };
  }
  if (state.preview.previewId === "" || state.preview.cartVersion !== validation.data.cartVersion || Date.parse(state.preview.expiresAt) <= now.getTime()) {
    return { status: "REJECTED", state, reasonCode: "ORDER_PREVIEW_EXPIRED_OR_CHANGED" };
  }
  const validationTime = Date.parse(validation.data.checkedAt);
  if (
    validationTime < Date.parse(state.preview.createdAt) ||
    now.getTime() - validationTime > MAX_REVALIDATION_AGE_MS ||
    validationTime > now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS
  ) {
    const next = withCommand(state, command.commandId, now, { stage: "HANDED_OFF", preview: null });
    return { status: "HANDOFF", state: next, reasonCode: "POLICY_UNAVAILABLE", silent: true, desiredPancakeTag: "NHAN_VIEN", handoffDecision: checkoutHandoff("POLICY_UNAVAILABLE", command.commandId, now) };
  }
  const confirmationResult = PurchaseConfirmationV1Schema.safeParse({
    schemaVersion: 1,
    confirmationId: deterministicUuid(`purchase-confirmation\u0000${state.cart.value.cartId}\u0000${state.cart.value.revision}\u0000${confirmationInbound.messageId}`),
    idempotencyKey: `purchase-confirmed:${state.conversationKey}:${state.cart.value.cartId}:${state.cart.value.revision}:${confirmationInbound.messageId}`,
    cartId: state.cart.value.cartId,
    cartVersion: state.cart.value.revision,
    previewId: state.preview.previewId,
    previewHash: state.preview.previewHash,
    status: "PURCHASE_CONFIRMED",
    posOrderId: null,
    desiredPancakeTag: "DA_CHOT_DON",
    confirmedAt: now.toISOString(),
    sourceMessageId: intent.data.sourceMessageId,
  });
  if (!confirmationResult.success) return { status: "REJECTED", state, reasonCode: "CONFIRMATION_IDENTITY_INVALID" };
  const confirmation = confirmationResult.data;
  const instruction = paymentInstruction(state.preview, now, input.resolveBankTransferPolicy);
  if (state.preview.payment.method === "BANK_TRANSFER" && instruction === null) {
    const next = withCommand(state, command.commandId, now, { stage: "HANDED_OFF", preview: null });
    return { status: "HANDOFF", state: next, reasonCode: "POLICY_UNAVAILABLE", silent: true, desiredPancakeTag: "NHAN_VIEN", handoffDecision: checkoutHandoff("POLICY_UNAVAILABLE", command.commandId, now) };
  }
  const next = withCommand(state, command.commandId, now, { stage: "PURCHASE_CONFIRMED", confirmation });
  return { status: "APPLIED", state: next, confirmation, paymentInstruction: instruction, desiredPancakeTag: "DA_CHOT_DON", transferToHuman: true };
}

/** Executes one command through an atomic repository CAS; losing concurrent commands never emit effects. */
export async function executePersistedSalesCycleCommand(input: {
  readonly repository: SalesCycleStateRepositoryV1;
  readonly conversationKey: string;
  readonly command: SalesCycleCommand;
  readonly now: Date;
  readonly resolveBankTransferPolicy?: BankTransferPolicyResolver;
  readonly trustedPorts?: SalesCycleTrustedPortsV1;
}): Promise<SalesCycleRuntimeResult> {
  const state = await input.repository.read(input.conversationKey);
  if (state === null) throw new Error("SALES_CYCLE_STATE_NOT_FOUND");
  const result = applySalesCycleCommand({
    state,
    expectedRevision: state.revision,
    command: input.command,
    now: input.now,
    ...(input.resolveBankTransferPolicy === undefined ? {} : { resolveBankTransferPolicy: input.resolveBankTransferPolicy }),
    ...(input.trustedPorts === undefined ? {} : { trustedPorts: input.trustedPorts }),
  });
  if (result.status !== "APPLIED" && result.status !== "HANDOFF") return result;
  const committed = await input.repository.compareAndSwap({
    conversationKey: input.conversationKey,
    expectedRevision: state.revision,
    nextState: result.state,
    effects: {
      pancakeTagCommand: result.desiredPancakeTag === null
        ? null
        : result.status === "HANDOFF"
          ? buildHandoffTagCommand(result.state, result.handoffDecision)
          : result.confirmation === null
            ? null
            : buildPurchaseConfirmedTagCommand({ pageId: result.state.routing.pageId, conversationId: result.state.routing.conversationId, confirmation: result.confirmation }),
      transferToHuman: result.status === "APPLIED" ? result.transferToHuman : true,
      paymentMessageIntent: result.status === "APPLIED" && result.paymentInstruction !== null && result.confirmation !== null
        ? { idempotencyKey: `payment-instruction:${result.confirmation.confirmationId}`, instruction: result.paymentInstruction }
        : null,
      handoffDecision: result.status === "HANDOFF" ? result.handoffDecision : null,
      confirmation: result.status === "APPLIED" ? result.confirmation : null,
    },
  });
  if (committed) return result;
  const latest = await input.repository.read(input.conversationKey);
  return { status: "CONFLICT", state: latest ?? state, reasonCode: "STATE_VERSION_CONFLICT" };
}
