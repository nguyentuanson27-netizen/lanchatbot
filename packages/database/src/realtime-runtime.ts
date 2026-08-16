import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  canonicalBuyingIntentAuthorizesCartMutationV1,
  canonicalCheckoutDraftHashPreimageV1,
  canonicalClarificationStateHashPreimageV1,
  canonicalOrderPreviewHashPreimageV1,
  canonicalCartOfferBindingsV1,
  canonicalCartStateHashPreimageV1,
  canonicalCartStateV1,
  canonicalJsonV1,
  cartMutationAuthorityBindingHashPreimageV1,
  cartMutationBatchEvidenceHashPreimageV1,
  cartMutationReceiptHashPreimageV1,
  cartOpenEvidenceHashPreimageV1,
  checkoutDetailsTransitionEvidenceHashPreimageV1,
  clarificationTransitionEvidenceHashPreimageV1,
  negotiationTransitionEvidenceHashPreimageV1,
  CanonicalCartReplayContextV1Schema,
  CartOpenEvidenceV1Schema,
  CheckoutDetailsTransitionEvidenceV1Schema,
  ClarificationTransitionEvidenceV1Schema,
  CheckoutDraftV1Schema,
  SalesCycleClarificationStateV1Schema,
  CartMutationBatchEvidenceV1Schema,
  NegotiationTransitionEvidenceV1Schema,
  CartV1Schema,
  DeterministicConfirmationEvidenceV1Schema,
  DeterministicEffectReadinessV1Schema,
  MAX_EFFECT_FUTURE_CLOCK_SKEW_MS_V1,
  CART_TTL_MS_V1,
  isSalesStageTransitionAllowedV1,
  isStateAdvancingSalesOutcomeV1,
  requiredPersistedSalesEffectsV1,
  SalesCycleStageV1Schema,
  deterministicEffectReadinessHashPreimageV1,
  effectBindingHashPreimageV1,
  OrderPreviewV1Schema,
  PurchaseConfirmationV1Schema,
  CanonicalBuyingIntentV1Schema,
  ProtectedClaimV1Schema,
  validateCartEffectClaimSemanticsV1,
  validateEffectReadinessTemporalWindowV1,
  validateEffectClaimSemanticsV1,
  type DecisionObservabilityV1,
  type CartV1,
  type DeterministicEffectReadinessV1,
  type StateAdvancingSalesOutcomeV1,
  type SalesCycleCommandKindV1,
  type OrderPreviewV1,
} from "@lana/contracts";
import {
  applyCanonicalCartDecisionV2,
  applyCheckoutDetailsTransitionV1,
  applySalesClarificationTransitionV1,
  canonicalCartPolicyLinesV2,
  canonicalNegotiationEventFingerprintV1,
  createCanonicalCartV2,
  deriveCanonicalPurchaseConfirmationV1,
  deriveCanonicalNegotiationCustomerStateV1,
  replayCanonicalCartRepriceNegotiationV1,
  validateOrderPreviewTransitionV1,
  type CanonicalNegotiationStateV1,
} from "@lana/commerce-kernel";
import type { CipherBundle } from "./repositories.js";
import {
  LocalEnvelopeCipher,
  type EncryptedValue,
} from "./envelope-cipher.js";
import { withTransaction } from "./repositories.js";
import {
  commitAcquisitionPlan,
  recordInitialReplySendFailed,
  type AcquisitionCommitPlan,
} from "./ad-acquisition.js";
import {
  insertContextV2Capture,
  type ContextV2CapturePlan,
} from "./context-v2-capture.js";

export interface MetaOutboxOperatorCancelResult {
  readonly responseGroupId: string;
  readonly pageId: string;
  readonly cancelledCount: number;
  readonly changed: boolean;
}

export interface MetaOutboxHealthSnapshot {
  readonly pageId: string;
  readonly actionableCount: number;
  readonly sendingCount: number;
  readonly expiredSendingCount: number;
  readonly manualReviewCount: number;
  readonly stuckDescendantCount: number;
  readonly oldestActionableAgeSeconds: number | null;
  readonly oldestManualReviewAgeSeconds: number | null;
}

export interface RealtimeConversationRecord<TState> {
  readonly conversationId: string;
  readonly pageId: string;
  readonly customerHash: string;
  readonly stateVersion: number;
  readonly state: TState;
  readonly routingOwner: "N8N" | "APP";
  readonly appSendEnabled: boolean;
  readonly killSwitch: boolean;
}

export interface RealtimeCustomerProfileRecord<TProfile, TEvidence = unknown> {
  readonly pageId: string;
  readonly customerHash: string;
  readonly revision: number;
  readonly profile: TProfile;
  readonly fieldEvidence: TEvidence;
  readonly expiresAt: Date;
}

export type RealtimeMetaMessageUnit =
  | { readonly kind: "TEXT"; readonly text: string }
  | { readonly kind: "IMAGE"; readonly imageUrl: string };

export interface RealtimeMetaPlan {
  readonly replyPlanId: string;
  readonly responseGroupId: string;
  readonly recipientId: string;
  readonly messages: readonly RealtimeMetaMessageUnit[];
  /** Ảnh chỉ đủ điều kiện gửi sau text và sau khoảng nghỉ này tính từ lúc commit. */
  readonly imageDelayMs?: number;
  readonly sendAfterOwnerHandoff?: boolean;
  readonly protectedClaimTypes?: readonly DeterministicEffectReadinessV1["protectedClaimTypes"][number][];
  readonly sourceMessageIdHash?: string;
  readonly effectReadiness?: DeterministicEffectReadinessV1;
  readonly protectedClaims?: readonly import("@lana/contracts").ProtectedClaimV1[];
}

export interface RealtimePancakeTagPlan {
  readonly desiredTag:
    | "NHAN_VIEN"
    | "VAN_DON"
    | "DA_CHOT_DON"
    | "KHONG_UP_SALE";
  readonly tagId: string;
  readonly handoffGeneration: number;
  readonly afterResponseGroupId?: string | null;
}

export interface RealtimeSalesCycleRecord<TState> {
  readonly conversationId: string;
  readonly pageId: string;
  readonly stateRevision: number;
  readonly state: TState;
  readonly cartExpiresAt: Date | null;
  readonly expiresAt: Date;
}

export interface RealtimeSalesCycleEventPlan {
  readonly commandId: string;
  readonly commandKind: SalesCycleCommandKindV1;
  readonly outcome: StateAdvancingSalesOutcomeV1;
  readonly stateRevisionBefore: number;
  readonly stateRevisionAfter: number;
  readonly stageBefore: string;
  readonly stageAfter: string;
  readonly cartId: string | null;
  readonly cartVersion: number | null;
  readonly reasonCode: string | null;
  readonly mutationAction?: "ADD_LINE" | "REMOVE_LINE" | "SET_QUANTITY" | null;
  readonly mutationPayloadHash?: string | null;
  readonly negotiationTransitionEvidence?: import("@lana/contracts").NegotiationTransitionEvidenceV1;
  readonly checkoutDetailsTransitionEvidence?: import("@lana/contracts").CheckoutDetailsTransitionEvidenceV1;
  readonly clarificationTransitionEvidence?: import("@lana/contracts").ClarificationTransitionEvidenceV1;
  readonly previewArtifact?: OrderPreviewV1;
  readonly occurredAt: Date;
}

export interface RealtimeSalesCyclePlan<TState> {
  readonly expectedRevision: number;
  readonly state: TState;
  readonly cartExpiresAt: Date | null;
  readonly expiresAt: Date;
  readonly events: readonly RealtimeSalesCycleEventPlan[];
  readonly readinessContractVersion: "DF06_EFFECT_READINESS_V1";
  readonly sourceMessageIdHash?: string;
  readonly canonicalBuyingIntent?: import("@lana/contracts").CanonicalBuyingIntentV1;
  readonly deterministicConfirmationEvidence?: import("@lana/contracts").DeterministicConfirmationEvidenceV1;
  readonly cartMutationBatchEvidence?: import("@lana/contracts").CartMutationBatchEvidenceV1;
  readonly cartOpenEvidence?: import("@lana/contracts").CartOpenEvidenceV1;
  readonly cartReplayContext?: import("@lana/contracts").CanonicalCartReplayContextV1;
  readonly effectClaimSets?: readonly Readonly<{
    effect: DeterministicEffectReadinessV1["effect"];
    claims: readonly import("@lana/contracts").ProtectedClaimV1[];
  }>[];
  readonly effectReadiness?: readonly DeterministicEffectReadinessV1[];
}

export interface RealtimeHandoffEventPlan {
  readonly source: "BOT_POLICY" | "CUSTOMER_REQUEST" | "POST_SALE";
  readonly reasonCode: string;
  readonly reasonDetailSafe?: Readonly<Record<string, unknown>>;
  readonly productId: string | null;
  readonly factsStatus:
    | "OK"
    | "STALE"
    | "AMBIGUOUS"
    | "NOT_FOUND"
    | "ERROR"
    | null;
  readonly factsReasonCode: string | null;
  readonly desiredTag: "NHAN_VIEN" | "VAN_DON";
  readonly handoffGeneration: number;
  readonly triggerEventKey: string;
  readonly triggerMessagePk: string | null;
  readonly occurredAt: Date;
}

export interface RealtimeHandoffAcknowledgementPlan {
  readonly actorRef: string;
  readonly occurredAt: Date;
}

export interface RealtimeInboxBatchGuard {
  readonly generation: number;
  readonly leaseToken: string;
  readonly inboxIds: readonly string[];
}

export interface RealtimeDecisionEventPlan {
  readonly eventId: string;
  readonly eventKeyHash: string;
  readonly eventType:
    | "PRODUCT_RESOLVED"
    | "PRODUCT_MATCHED"
    | "PRICE_CARD_SENT"
    | "SIZE_CONSULT_STARTED"
    | "BUYING_SIGNAL_DETECTED"
    | "BUYING_SIGNAL_COMMITTED"
    | "BUYING_SIGNAL_RETRACTED"
    | "READY_TO_BUY"
    | "ORDER_INFO_REQUESTED"
    | "CHECKOUT_DETAILS_MISSING"
    | "CLARIFICATION_REQUESTED"
    | "CHECKOUT_COMPLETED"
    | "ORDER_PREVIEW_CREATED"
    | "PURCHASE_CONFIRMATION_DETECTED"
    | "PURCHASE_CONFIRMATION_REJECTED"
    | "PURCHASE_CONFIRMED"
    | "ORDER_INTENT_CREATED"
    | "HANDOFF"
    | "HANDOFF_REQUESTED"
    | "GUARD_BLOCKED"
    | "NO_REPLY"
    | "NO_REPLY_SELECTED"
    | "WAVE2_STRATEGY_SELECTED"
    | "WAVE2_BARRIER_DETECTED";
  readonly origin: string | null;
  readonly reasonCodes: readonly string[];
  readonly releaseId: string;
  readonly promptVersion: string;
  readonly modelVersion: string | null;
  readonly policyVersion: string | null;
  readonly catalogVersion: string | null;
  readonly mode: "DRY_RUN" | "LIVE";
  readonly productId: string | null;
  readonly intent: string | null;
  readonly stage: string | null;
  readonly action: string | null;
  readonly occurredAt: Date;
  readonly details: Readonly<{
    decisionObservability?: DecisionObservabilityV1;
    auditSchemaVersion?: 1 | 2;
    stateRevisionBefore?: number;
    stateRevisionAfter?: number;
    conversationHash?: string | null;
    proposalHash?: string | null;
    guardedPlanHash?: string | null;
    renderedReplyHash?: string | null;
    factsSourceVersion?: string | null;
    guardOutcome?: "ALLOWED" | "BLOCKED" | "NOT_APPLICABLE";
    processingLatencyMs?: number | null;
    factQueryResults?: readonly {
      readonly queryId: string;
      readonly productId: string;
      readonly requestedFact: "PRICE" | "STOCK" | "SIZE" | "ETA";
      readonly status: "OK" | "STALE" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
      readonly reasonCode: string | null;
      readonly source: string;
      readonly observedAt: string;
    }[];
    productResolutionOrigin: string | null;
    buyingSignalReasons: readonly string[];
    guardReasonCodes: readonly string[];
    factsStatus: "OK" | "STALE" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR" | null;
    factsReasonCode: string | null;
    salesCycleStageBefore: string | null;
    salesCycleStageAfter: string | null;
    outboundMessageCount: number;
    modelCalled: boolean;
    modelLatencyMs: number | null;
    modelTokenUsage: Readonly<{
      prompt: number | null;
      output: number | null;
      total: number | null;
    }>;
    modelUsageSource?: "provider" | "estimated" | "missing";
    modelPath?:
      | "not_called"
      | "model"
      | "initial_fallback"
      | "grounded_fallback"
      | "grounded_draft_fallback";
    modelErrorClass?: string | null;
    buyingSignalOverride: boolean;
    wave2Strategy?: Readonly<{
      rulesetVersion: "wave2-strategy-v1";
      need:
        | "NEED_OCCASION"
        | "NEED_STYLE"
        | "NEED_BUDGET"
        | "NOT_ENOUGH_CONTEXT";
      barrier:
        | "NONE"
        | "BARRIER_PRICE"
        | "BARRIER_FIT"
        | "BARRIER_MATERIAL"
        | "BARRIER_TRUST"
        | "BARRIER_DELIVERY"
        | "CHOICE_OVERLOAD";
      decisionFactor:
        | "OCCASION"
        | "STYLE"
        | "BUDGET"
        | "FIT"
        | "MATERIAL"
        | "TRUST"
        | "DELIVERY"
        | "PRODUCT"
        | "UNKNOWN";
      recommendedStrategy:
        | "STRATEGY_RECOMMEND_PRODUCT"
        | "STRATEGY_SHOW_PROOF"
        | "STRATEGY_ANSWER_OBJECTION"
        | "STRATEGY_ASK_CLARIFY"
        | "STRATEGY_CLOSE";
      ctaPolicy:
        | "ASK_OCCASION"
        | "ASK_STYLE"
        | "ASK_BUDGET"
        | "ASK_MEASUREMENTS"
        | "ASK_PROOF_PREFERENCE"
        | "REDUCE_TO_TWO"
        | "POST_MEDIA_CLOSE"
        | "NO_ADDITIONAL_CTA";
      confidence: number;
      evidence: readonly string[];
      experimentId: "wave2-stage-playbook-v1";
      experimentVariant: "LIVE_100";
    }> | null;
    checkoutCapturedFields?: readonly string[];
    checkoutMissingFields?: readonly string[];
    checkoutCompleted?: boolean;
    clarificationReasonCode?: string | null;
    clarificationAttemptCount?: number;
    clarificationMaxAttempts?: number;
    clarificationBudgetExhausted?: boolean;
    clarificationCase?: boolean;
    orderPreviewCreated?: boolean;
    confirmationAttempted?: boolean;
    confirmationConfirmed?: boolean;
    confirmationSource?: string | null;
    confirmationAction?: string | null;
    confirmationBehaviorMode?: "LEGACY" | "V2_SHADOW" | "V2_ACTIVE" | "CLARIFY_ONLY";
    confirmationModeSource?: "DATABASE" | "CACHE" | "LAST_KNOWN_GOOD" | "STARTUP_DEFAULT" | "FAIL_SAFE";
    confirmationModeVersionId?: string | null;
    confirmationModeContentHash?: string | null;
    confirmationModePointerRevision?: number | null;
    confirmationModeAuditWrite?: "RECORDED" | "FAILED" | "NOT_CONFIGURED";
    confirmationContainmentActive?: boolean;
    confirmationShadow?: Readonly<{
      decision: "CONFIRM" | "REJECT" | "UNCLEAR";
      terminal: boolean;
      reasonCode: string | null;
      action: string | null;
      differsFromLegacy: boolean;
      sideEffects: "DISABLED";
    }> | null;
  }>;
}

export interface RealtimeCommitInput<TState, TSalesState = unknown> {
  readonly pageId: string;
  readonly customerHash: string;
  readonly conversationId: string;
  readonly expectedStateVersion: number;
  readonly state: TState;
  readonly metaPlan?: RealtimeMetaPlan;
  readonly pancakeTagPlan?: RealtimePancakeTagPlan;
  readonly handoffEventPlan?: RealtimeHandoffEventPlan;
  readonly handoffAcknowledgementPlan?: RealtimeHandoffAcknowledgementPlan;
  readonly salesCyclePlan?: RealtimeSalesCyclePlan<TSalesState>;
  readonly decisionEvents?: readonly RealtimeDecisionEventPlan[];
  readonly contextV2CapturePlan?: ContextV2CapturePlan;
  readonly acquisitionPlan?: AcquisitionCommitPlan;
  /**
   * When present, state/outbox and all source inbox rows share one transaction.
   * A newer committed inbound changes the generation and makes this decision a
   * no-op, so a stale model result can never be published.
   */
  readonly inboxBatchGuard?: RealtimeInboxBatchGuard;
}

export interface RealtimeCommitResult {
  readonly stateCommitted: boolean;
  readonly metaOutboxCreated: number;
  readonly pancakeTagOutboxCreated: boolean;
  readonly handoffEventCreated: boolean;
  readonly decisionEventsCreated?: number;
  readonly contextV2CaptureCreated?: boolean;
  readonly sendAuthorized: boolean;
  readonly reasonCodes: readonly string[];
  readonly inboxBatchStatus?: "NOT_REQUESTED" | "COMMITTED" | "SUPERSEDED";
}

function sha256CanonicalV1(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

function sha256TextV1(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalCartStateHashV1(cart: CartV1): string {
  return sha256TextV1(canonicalCartStateHashPreimageV1(canonicalCartStateV1(cart)));
}

function validateReadinessEnvelopeHashesV1(
  readiness: DeterministicEffectReadinessV1,
): void {
  if (readiness.bindingHash !== sha256TextV1(effectBindingHashPreimageV1(readiness.binding))) {
    throw new Error("EFFECT_BINDING_HASH_MISMATCH");
  }
  if (readiness.readinessHash !== sha256TextV1(
    deterministicEffectReadinessHashPreimageV1(readiness),
  )) {
    throw new Error("EFFECT_READINESS_HASH_MISMATCH");
  }
}

function validateSalesEffectReadiness<TState, TSalesState>(
  input: RealtimeCommitInput<TState, TSalesState>,
  now: Date,
  currentSourceMessageIdHash: string | null,
): void {
  const plan = input.salesCyclePlan;
  if (!plan) return;
  if (plan.readinessContractVersion !== "DF06_EFFECT_READINESS_V1") {
    throw new Error("EFFECT_READINESS_CONTRACT_REQUIRED");
  }
  const parsed = (plan.effectReadiness ?? []).map((value) =>
    DeterministicEffectReadinessV1Schema.parse(value)
  );
  const buyingIntent = CanonicalBuyingIntentV1Schema.parse(plan.canonicalBuyingIntent);
  if (currentSourceMessageIdHash === null ||
    plan.sourceMessageIdHash !== currentSourceMessageIdHash ||
    buyingIntent.sourceMessageIdHash !== currentSourceMessageIdHash) {
    throw new Error("CURRENT_MESSAGE_BINDING_MISMATCH");
  }
  const intentHash = sha256CanonicalV1(buyingIntent);
  const confirmationEvidence = plan.deterministicConfirmationEvidence === undefined
    ? null
    : DeterministicConfirmationEvidenceV1Schema.parse(plan.deterministicConfirmationEvidence);
  const claimSets = new Map((plan.effectClaimSets ?? []).map(({ effect, claims }) => [
    effect,
    claims.map((claim) => ProtectedClaimV1Schema.parse(claim)),
  ]));
  const state = plan.state as Record<string, unknown>;
  const cartEnvelope = state.cart as { value?: {
    cartId?: string;
    revision?: number;
    lines?: readonly {
      lineId?: string;
      parentProductId?: string;
      offerId?: string;
      quantity?: number;
      posUnitPriceVnd?: number | null;
      priceAuthority?: { priceFactRef?: string } | null;
    }[];
  } } | null | undefined;
  const cart = cartEnvelope?.value === undefined ? undefined : CartV1Schema.parse(cartEnvelope.value);
  const finalCartStateHash = cart === undefined ? null : canonicalCartStateHashV1(cart);
  const preview = state.preview === null || state.preview === undefined
    ? undefined
    : OrderPreviewV1Schema.parse(state.preview);
  if (preview !== undefined) {
    const { previewHash, ...previewArtifact } = preview;
    if (previewHash !== `sha256:${sha256TextV1(
      canonicalOrderPreviewHashPreimageV1(previewArtifact),
    )}`) throw new Error("ORDER_PREVIEW_HASH_MISMATCH");
  }
  const required = new Set(requiredPersistedSalesEffectsV1({
    events: plan.events,
    hasFinalPreview: preview !== undefined,
    hasFinalConfirmation: state.confirmation !== null && state.confirmation !== undefined,
  }));
  for (const effect of required) {
    if (!parsed.some((value) => value.effect === effect)) {
      throw new Error("EFFECT_READINESS_REQUIRED");
    }
  }
  for (const readiness of parsed) {
    validateReadinessEnvelopeHashesV1(readiness);
    if (readiness.outcome !== "READY") throw new Error("EFFECT_READINESS_BLOCKED");
    if (readiness.authorization !== "NONE") throw new Error("EFFECT_READINESS_AUTHORITY_INVALID");
    if (
      readiness.pageId !== input.pageId ||
      readiness.conversationId !== input.conversationId
    ) throw new Error("EFFECT_READINESS_SCOPE_MISMATCH");
    if (readiness.sourceMessageIdHash !== plan.sourceMessageIdHash ||
      readiness.binding.sourceMessageIdHash !== currentSourceMessageIdHash) {
      throw new Error("EFFECT_READINESS_MESSAGE_MISMATCH");
    }
    if (
      readiness.conversationRevision !== input.expectedStateVersion ||
      readiness.salesCycleRevision !== plan.expectedRevision
    ) throw new Error("EFFECT_READINESS_REVISION_MISMATCH");
    const temporalStatus = validateEffectReadinessTemporalWindowV1({
      checkedAt: readiness.checkedAt,
      expiresAt: readiness.expiresAt,
      now,
    });
    if (temporalStatus === "LIFETIME_EXCEEDED") {
      throw new Error("EFFECT_READINESS_LIFETIME_INVALID");
    }
    if (temporalStatus !== "VALID") {
      throw new Error("EFFECT_READINESS_STALE");
    }
    const claims = claimSets.get(readiness.effect);
    const expectedClaimSetHash = claims?.length === 0
      ? null
      : claims
        ? sha256CanonicalV1([...claims].sort((a, b) => a.claimId.localeCompare(b.claimId)))
        : undefined;
    if (!claims || expectedClaimSetHash !== readiness.claimSetHash) {
      throw new Error("EFFECT_READINESS_CLAIM_BINDING_MISMATCH");
    }
    const claimSemantics = validateEffectClaimSemanticsV1({
      effect: readiness.effect,
      productIds: readiness.productIds,
      cartId: readiness.cartId,
      cartVersion: readiness.cartVersion,
      protectedClaimTypes: readiness.protectedClaimTypes,
      claims,
    });
    if (claimSemantics.missing) throw new Error("EFFECT_READINESS_CLAIM_MISSING");
    if (claimSemantics.conflict) throw new Error("EFFECT_READINESS_CLAIM_CONFLICT");
    if (claims.some((claim) =>
      Date.parse(claim.provenance.observedAt) >
        now.getTime() + MAX_EFFECT_FUTURE_CLOCK_SKEW_MS_V1 ||
      Date.parse(claim.provenance.expiresAt) <= now.getTime()
    )) {
      throw new Error("EFFECT_READINESS_CLAIM_STALE");
    }
    if (claims.some((claim) => claim.scope.kind === "PRODUCT"
      ? !readiness.productIds.includes(claim.scope.productId)
      : claim.scope.kind === "CART" &&
        (claim.scope.cartId !== readiness.cartId || claim.scope.cartVersion !== readiness.cartVersion))) {
      throw new Error("EFFECT_READINESS_CLAIM_SCOPE_MISMATCH");
    }
    if (readiness.buyingIntentHash !== null && readiness.buyingIntentHash !== intentHash) {
      throw new Error("EFFECT_READINESS_INTENT_BINDING_MISMATCH");
    }
    const cartProductIds = [...new Set((cart?.lines ?? [])
      .map(({ parentProductId }) => parentProductId)
      .filter((value): value is string => typeof value === "string"))].sort();
    const productsMatch = JSON.stringify(readiness.productIds) === JSON.stringify(cartProductIds);
    if (!productsMatch) {
      throw new Error("EFFECT_READINESS_PRODUCT_MISMATCH");
    }
    const expectedOffers = cart === undefined ? [] : canonicalCartOfferBindingsV1(cart.lines);
    if (readiness.binding.cart !== null &&
      canonicalJsonV1(readiness.binding.cart.offerBindings) !== canonicalJsonV1(expectedOffers)) {
      throw new Error("EFFECT_READINESS_OFFER_BINDING_MISMATCH");
    }
    if (cart !== undefined && (
      readiness.effect !== "PROTECTED_OUTBOUND" || readiness.cartId !== null
    )) {
      const lines = (cart.lines ?? []).map((line) => ({
        parentProductId: line.parentProductId,
        offerId: line.offerId,
        quantity: line.quantity,
        posUnitPriceVnd: line.posUnitPriceVnd,
        priceFactRef: line.priceAuthority?.priceFactRef ?? null,
      }));
      if (lines.some((line) =>
        typeof line.parentProductId !== "string" ||
        typeof line.offerId !== "string" ||
        typeof line.quantity !== "number" ||
        (typeof line.posUnitPriceVnd !== "number" && line.posUnitPriceVnd !== null)
      )) throw new Error("EFFECT_READINESS_CART_LINE_INVALID");
      const cartClaimSemantics = validateCartEffectClaimSemanticsV1({
        effect: readiness.effect,
        lines: lines as readonly {
          parentProductId: string;
          offerId: string;
          quantity: number;
          posUnitPriceVnd: number | null;
          priceFactRef: string | null;
        }[],
        claims,
        cartId: readiness.cartId,
        cartVersion: readiness.cartVersion,
        protectedClaimTypes: readiness.protectedClaimTypes,
      });
      if (cartClaimSemantics.mismatch) {
        throw new Error("EFFECT_READINESS_CLAIM_VALUE_MISMATCH");
      }
      if (cartClaimSemantics.missing) throw new Error("EFFECT_READINESS_CLAIM_MISSING");
      if (cartClaimSemantics.conflict) throw new Error("EFFECT_READINESS_CLAIM_CONFLICT");
    }
    const bindsFinalCart = readiness.effect !== "PROTECTED_OUTBOUND" ||
      readiness.cartId !== null;
    if (bindsFinalCart && readiness.cartStateHash !== finalCartStateHash) {
      throw new Error("EFFECT_READINESS_CART_STATE_MISMATCH");
    }
    if (readiness.effect !== "PROTECTED_OUTBOUND" &&
      (readiness.cartId !== cart?.cartId || readiness.cartVersion !== cart?.revision)) {
      throw new Error("EFFECT_READINESS_CART_MISMATCH");
    }
    if ((readiness.effect === "PREVIEW_READY" ||
      readiness.effect === "PURCHASE_CONFIRMATION_READY") &&
      (readiness.orderPreviewId !== preview?.previewId ||
        readiness.orderPreviewHash !== preview?.previewHash?.replace(/^sha256:/u, ""))) {
      throw new Error("EFFECT_READINESS_PREVIEW_MISMATCH");
    }
    if (readiness.effect === "PURCHASE_CONFIRMATION_READY" && (
      confirmationEvidence === null ||
      readiness.deterministicEvidenceHash !== sha256CanonicalV1(confirmationEvidence) ||
      confirmationEvidence.sourceMessageIdHash !== readiness.sourceMessageIdHash ||
      confirmationEvidence.evaluatedAt !== readiness.checkedAt ||
      confirmationEvidence.evidenceHash !== sha256CanonicalV1([
        confirmationEvidence.sourceMessageIdHash,
        confirmationEvidence.classifierVersion,
        confirmationEvidence.decision,
        confirmationEvidence.reasonCode,
      ])
    )) {
      throw new Error("EFFECT_READINESS_CONFIRMATION_BINDING_MISMATCH");
    }
  }
  for (const readiness of parsed) {
    const parentHash = readiness.binding.parentReadinessHash;
    if (parentHash === null) continue;
    const parent = parsed.find((candidate) => candidate.readinessHash === parentHash);
    if (!parent) throw new Error("EFFECT_READINESS_PARENT_MISSING");
    if (readiness.effect === "PREVIEW_READY" && parent.effect !== "CART_READY") {
      throw new Error("EFFECT_READINESS_PARENT_MISMATCH");
    }
    if (readiness.effect === "PURCHASE_CONFIRMATION_READY" &&
      parent.effect !== "PREVIEW_READY") {
      throw new Error("EFFECT_READINESS_PARENT_MISMATCH");
    }
    if (readiness.effect === "PROTECTED_OUTBOUND" &&
      (parent.effect === "PROTECTED_OUTBOUND" || parent.binding.cart === null)) {
      throw new Error("PROTECTED_OUTBOUND_SALES_READINESS_MISMATCH");
    }
    if (readiness.binding.cart !== null &&
      canonicalJsonV1(readiness.binding.cart) !== canonicalJsonV1(parent.binding.cart)) {
      throw new Error("EFFECT_READINESS_PARENT_CART_MISMATCH");
    }
    if ((readiness.effect === "PURCHASE_CONFIRMATION_READY" ||
      readiness.effect === "PROTECTED_OUTBOUND") && readiness.binding.preview !== null &&
      canonicalJsonV1(readiness.binding.preview) !== canonicalJsonV1(parent.binding.preview)) {
      throw new Error("EFFECT_READINESS_PARENT_PREVIEW_MISMATCH");
    }
  }
  const mutationEvents = plan.events.filter(({ commandKind, outcome }) =>
    commandKind === "CART_MUTATED" && outcome === "APPLIED"
  );
  if (mutationEvents.length === 0) {
    if (plan.cartMutationBatchEvidence !== undefined) {
      throw new Error("CART_MUTATION_BATCH_UNEXPECTED");
    }
    return;
  }
  if (plan.cartMutationBatchEvidence === undefined) {
    throw new Error("CART_MUTATION_BATCH_REQUIRED");
  }
  const batch = CartMutationBatchEvidenceV1Schema.parse(plan.cartMutationBatchEvidence);
  if (batch.receipts.length !== mutationEvents.length ||
    batch.sourceMessageIdHash !== currentSourceMessageIdHash ||
    batch.finalCartStateHash !== finalCartStateHash ||
    batch.evidenceHash !== sha256TextV1(cartMutationBatchEvidenceHashPreimageV1(batch)) ||
    batch.replayContext.policyRef.contentHash !== `sha256:${sha256CanonicalV1(batch.replayContext.policyBundle)}`) {
    throw new Error("CART_MUTATION_BATCH_MISMATCH");
  }
  mutationEvents.forEach((event, index) => {
    const receipt = batch.receipts[index]!;
    if (event.mutationAction !== receipt.mutation.kind ||
      event.mutationPayloadHash !== receipt.mutationPayloadHash ||
      receipt.commandIdHash !== sha256TextV1(event.commandId) ||
      receipt.mutationPayloadHash !== sha256CanonicalV1({ mutation: receipt.mutation }) ||
      receipt.authority.bindingHash !== sha256TextV1(
        cartMutationAuthorityBindingHashPreimageV1(receipt.authority),
      ) ||
      receipt.evidenceHash !== sha256TextV1(cartMutationReceiptHashPreimageV1(receipt)) ||
      receipt.appliedAt !== event.occurredAt.toISOString() ||
      Date.parse(receipt.appliedAt) > now.getTime() + MAX_EFFECT_FUTURE_CLOCK_SKEW_MS_V1 ||
      Date.parse(receipt.evaluatedAt) > now.getTime() + MAX_EFFECT_FUTURE_CLOCK_SKEW_MS_V1) {
      throw new Error("CART_MUTATION_RECEIPT_MISMATCH");
    }
    if (receipt.mutation.kind === "ADD_LINE" && (
      receipt.authority.productId !== receipt.mutation.line.parentProductId ||
      receipt.authority.offerId !== receipt.mutation.line.offerId
    )) throw new Error("CART_MUTATION_AUTHORITY_SCOPE_MISMATCH");
    if (receipt.authority.action === "REMOVE_LINE") {
      const removalAuthority = sha256CanonicalV1([
        "DETERMINISTIC_REMOVE_CLASSIFIER_V1",
        receipt.authority.sourceMessageIdHash,
        receipt.mutationPayloadHash,
      ]);
      if (receipt.authority.authorityEvidenceHash !== removalAuthority) {
        throw new Error("CART_MUTATION_AUTHORITY_MISMATCH");
      }
    } else if (
      buyingIntent.productId !== receipt.authority.productId ||
      !canonicalBuyingIntentAuthorizesCartMutationV1(
        buyingIntent,
        receipt.authority.action,
        receipt.authority.productId,
      ) || receipt.authority.authorityEvidenceHash !== intentHash
    ) {
      throw new Error("CART_MUTATION_AUTHORITY_MISMATCH");
    }
    const readiness = parsed.find((value) =>
      value.effect === "CART_MUTATION" &&
      value.deterministicEvidenceHash === receipt.evidenceHash &&
      value.checkedAt === receipt.evaluatedAt
    );
    if (!readiness) throw new Error("CART_MUTATION_EVIDENCE_BINDING_MISMATCH");
  });
}

function readCanonicalNegotiationStateV1(value: unknown): CanonicalNegotiationStateV1 {
  const state = value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const quote = state.quote !== null && typeof state.quote === "object"
    ? state.quote as Record<string, unknown>
    : {};
  const processedEvents = Array.isArray(state.processedEvents) ? state.processedEvents : null;
  const consumed = Array.isArray(state.consumedObjectionEvidenceIds)
    ? state.consumedObjectionEvidenceIds
    : null;
  const customerState = state.customerState;
  if (state.schemaVersion !== 2 || typeof state.negotiationId !== "string" ||
    typeof state.cartId !== "string" || !Number.isSafeInteger(state.cartVersion) ||
    !Number.isSafeInteger(state.stateVersion) ||
    (customerState !== "READY" && customerState !== "HESITANT" && customerState !== "CAUTIOUS") ||
    processedEvents === null || consumed === null ||
    !processedEvents.every((entry) => {
      const event = entry !== null && typeof entry === "object"
        ? entry as Record<string, unknown>
        : {};
      return typeof event.eventId === "string" && typeof event.fingerprint === "string" &&
        Number.isSafeInteger(event.resultingStateVersion);
    }) || !consumed.every((entry) => typeof entry === "string") ||
    typeof quote.policyBundleId !== "string" || typeof quote.policyVersion !== "string" ||
    quote.customerState !== customerState || !Array.isArray(quote.adjustments) ||
    !["parentProductUnitCount", "subtotalVnd", "shippingFeeVnd", "discountTotalVnd", "grandTotalVnd"]
      .every((key) => Number.isSafeInteger(quote[key])) || typeof state.updatedAt !== "string") {
    throw new Error("NEGOTIATION_LOCKED_STATE_INVALID");
  }
  return state as unknown as CanonicalNegotiationStateV1;
}

function validateLockedCartMutationTransitionV1(
  plan: RealtimeSalesCyclePlan<unknown>,
  lockedState: unknown,
  transactionNow: Date,
): void {
  const mutationEvents = plan.events.filter(({ commandKind, outcome }) =>
    commandKind === "CART_MUTATED" && outcome === "APPLIED"
  );
  if (mutationEvents.length === 0) return;
  const readCart = (state: unknown): CartV1 => {
    const record = state !== null && typeof state === "object"
      ? state as Record<string, unknown>
      : {};
    const envelope = record.cart !== null && typeof record.cart === "object"
      ? record.cart as Record<string, unknown>
      : {};
    return CartV1Schema.parse(envelope.value);
  };
  const beforeCart = readCart(lockedState);
  const afterCart = readCart(plan.state);
  const batch = CartMutationBatchEvidenceV1Schema.parse(plan.cartMutationBatchEvidence);
  const lockedRecord = lockedState !== null && typeof lockedState === "object"
    ? lockedState as Record<string, unknown>
    : {};
  const commerceContext = lockedRecord.commerceContext !== null &&
      typeof lockedRecord.commerceContext === "object"
    ? lockedRecord.commerceContext as Record<string, unknown>
    : null;
  const negotiation = readCanonicalNegotiationStateV1(lockedRecord.negotiation);
  if (commerceContext === null ||
    commerceContext.shopId !== batch.replayContext.shopId ||
    canonicalJsonV1(commerceContext.policyRef) !== canonicalJsonV1(batch.replayContext.policyRef) ||
    batch.replayContext.policyRef.contentHash !==
      `sha256:${sha256CanonicalV1(batch.replayContext.policyBundle)}`) {
    throw new Error("CART_MUTATION_REPLAY_CONTEXT_MISMATCH");
  }
  if (
    beforeCart.cartId !== afterCart.cartId ||
    beforeCart.salesEpisodeId !== afterCart.salesEpisodeId ||
    beforeCart.customerProfileId !== afterCart.customerProfileId ||
    afterCart.revision !== beforeCart.revision + mutationEvents.length ||
    batch.initialCartStateHash !== canonicalCartStateHashV1(beforeCart)
  ) throw new Error("CART_MUTATION_TRANSITION_MISMATCH");

  let replayedCart = beforeCart;
  let replayedNegotiation = negotiation;
  for (const [index, receipt] of batch.receipts.entries()) {
    const event = mutationEvents[index];
    if (!event || receipt.commandIdHash !== sha256TextV1(event.commandId) ||
      receipt.beforeCartStateHash !== canonicalCartStateHashV1(replayedCart)) {
      throw new Error("CART_MUTATION_BEFORE_STATE_MISMATCH");
    }
    let authorityLine: CartV1["lines"][number] | undefined;
    if (receipt.mutation.kind === "ADD_LINE") {
      authorityLine = receipt.mutation.line;
    } else {
      const mutationLineId = receipt.mutation.lineId;
      authorityLine = replayedCart.lines.find(({ lineId }) => lineId === mutationLineId);
    }
    if (!authorityLine || authorityLine.parentProductId !== receipt.authority.productId ||
      authorityLine.offerId !== receipt.authority.offerId ||
      receipt.customerState !== replayedNegotiation.customerState) {
      throw new Error("CART_MUTATION_AUTHORITY_SCOPE_MISMATCH");
    }
    const replay = applyCanonicalCartDecisionV2({
      cart: replayedCart,
      expectedCartVersion: replayedCart.revision,
      mutation: receipt.mutation,
      shopId: batch.replayContext.shopId,
      policy: batch.replayContext.policyBundle,
      customerState: receipt.customerState,
      readyForConfirmation: false,
      now: new Date(receipt.appliedAt),
      authorizationNow: transactionNow,
    });
    if (replay.status !== "APPLIED" ||
      canonicalCartStateHashV1(replay.cart) !== receipt.afterCartStateHash) {
      throw new Error("CART_MUTATION_REPLAY_MISMATCH");
    }
    replayedCart = replay.cart;
    const policyLines = canonicalCartPolicyLinesV2(replayedCart.lines, batch.replayContext.shopId);
    if (policyLines === null) throw new Error("NEGOTIATION_CART_FACT_INVALID");
    const repriced = replayCanonicalCartRepriceNegotiationV1({
      state: replayedNegotiation,
      commandId: event.commandId,
      mutationReasonCode: receipt.mutationReasonCode,
      cart: {
        cartId: replayedCart.cartId,
        cartVersion: replayedCart.revision,
        lines: policyLines,
      },
      policy: batch.replayContext.policyBundle,
      occurredAt: event.occurredAt,
      authorizationNow: transactionNow,
    });
    if (repriced.status !== "APPLIED") {
      throw new Error("CART_MUTATION_NEGOTIATION_REPLAY_BLOCKED");
    }
    replayedNegotiation = repriced.state;
  }
  const proposedNegotiation = readCanonicalNegotiationStateV1(
    (plan.state !== null && typeof plan.state === "object"
      ? plan.state as Record<string, unknown>
      : {}).negotiation,
  );
  if (
    batch.finalCartStateHash !== canonicalCartStateHashV1(afterCart) ||
    canonicalJsonV1(replayedCart) !== canonicalJsonV1(afterCart) ||
    canonicalJsonV1(replayedNegotiation) !== canonicalJsonV1(proposedNegotiation)
  ) throw new Error("CART_MUTATION_TRANSITION_MISMATCH");
}

function validateLockedCanonicalCartTransitionV1(
  plan: RealtimeSalesCyclePlan<unknown>,
  lockedState: unknown,
  transactionNow: Date,
): void {
  const transitionEvents = plan.events.filter(({ commandKind, outcome }) =>
    outcome === "APPLIED" && (commandKind === "CART_READY" || commandKind === "NEGOTIATION_EVENT")
  );
  if (transitionEvents.length === 0) return;
  if (transitionEvents.length !== 1 || plan.events.some(({ commandKind, outcome }) =>
    outcome === "APPLIED" && commandKind === "CART_MUTATED"
  )) throw new Error("CART_TRANSITION_BATCH_UNSUPPORTED");
  const context = CanonicalCartReplayContextV1Schema.parse(plan.cartReplayContext);
  if (context.customerState === null ||
    context.policyRef.contentHash !== `sha256:${sha256CanonicalV1(context.policyBundle)}`) {
    throw new Error("CART_REPLAY_CONTEXT_MISMATCH");
  }
  const readState = (raw: unknown): Record<string, unknown> =>
    raw !== null && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const lockedRecord = readState(lockedState);
  const nextRecord = readState(plan.state);
  const readCart = (record: Record<string, unknown>): CartV1 => {
    const envelope = readState(record.cart);
    return CartV1Schema.parse(envelope.value);
  };
  const beforeCart = readCart(lockedRecord);
  const afterCart = readCart(nextRecord);
  const commerceContext = readState(lockedRecord.commerceContext);
  if (commerceContext.shopId !== context.shopId ||
    canonicalJsonV1(commerceContext.policyRef) !== canonicalJsonV1(context.policyRef)) {
    throw new Error("CART_REPLAY_CONTEXT_MISMATCH");
  }
  const event = transitionEvents[0]!;
  const lockedNegotiation = readCanonicalNegotiationStateV1(lockedRecord.negotiation);
  const lockedCustomerState = lockedNegotiation.customerState;
  const derivedCustomerState = event.commandKind === "NEGOTIATION_EVENT"
    ? validateLockedNegotiationTransitionV1(
        plan,
        lockedState,
        event,
        beforeCart,
        afterCart,
        context.shopId,
        context.policyBundle.policyBundleId,
        context.policyBundle.policyVersion,
      )
    : lockedCustomerState;
  if ((derivedCustomerState !== "READY" && derivedCustomerState !== "HESITANT" &&
    derivedCustomerState !== "CAUTIOUS") || context.customerState !== derivedCustomerState ||
    (event.commandKind === "CART_READY" && event.negotiationTransitionEvidence !== undefined)) {
    throw new Error("NEGOTIATION_AUTHORITY_MISMATCH");
  }
  const replay = applyCanonicalCartDecisionV2({
    cart: beforeCart,
    expectedCartVersion: beforeCart.revision,
    mutation: null,
    shopId: context.shopId,
    policy: context.policyBundle,
    customerState: derivedCustomerState,
    readyForConfirmation: event.commandKind === "CART_READY",
    now: event.occurredAt,
    authorizationNow: transactionNow,
  });
  if (replay.status !== "APPLIED" ||
    canonicalJsonV1(replay.cart) !== canonicalJsonV1(afterCart)) {
    throw new Error("CART_FULL_REPLAY_MISMATCH");
  }
  if (event.commandKind === "CART_READY") {
    const policyLines = canonicalCartPolicyLinesV2(afterCart.lines, context.shopId);
    if (policyLines === null) throw new Error("NEGOTIATION_CART_FACT_INVALID");
    const repriced = replayCanonicalCartRepriceNegotiationV1({
      state: lockedNegotiation,
      commandId: event.commandId,
      mutationReasonCode: "OTHER",
      cart: {
        cartId: afterCart.cartId,
        cartVersion: afterCart.revision,
        lines: policyLines,
      },
      policy: context.policyBundle,
      occurredAt: event.occurredAt,
      authorizationNow: transactionNow,
    });
    const nextNegotiation = readCanonicalNegotiationStateV1(nextRecord.negotiation);
    if (repriced.status !== "APPLIED" ||
      canonicalJsonV1(repriced.state) !== canonicalJsonV1(nextNegotiation)) {
      throw new Error("CART_READY_NEGOTIATION_REPLAY_MISMATCH");
    }
  }
}

const MAX_SALES_PROCESSED_COMMAND_IDS_V1 = 100;
const SALES_STATE_TOP_LEVEL_KEYS_V2 = new Set([
  "schemaVersion",
  "conversationKey",
  "routing",
  "revision",
  "stage",
  "cart",
  "commerceContext",
  "negotiation",
  "checkoutDraft",
  "clarification",
  "preview",
  "confirmation",
  "processedCommandIds",
  "updatedAt",
]);

export function validateLockedSalesStateEnvelopeV1(
  plan: Pick<RealtimeSalesCyclePlan<unknown>, "expectedRevision" | "state" | "events">,
  lockedState: unknown,
  pageId: string,
  conversationId: string,
): void {
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
  const before = record(lockedState);
  const after = record(plan.state);
  const beforeRouting = record(before.routing);
  const afterRouting = record(after.routing);
  if (Object.keys(before).some((key) => !SALES_STATE_TOP_LEVEL_KEYS_V2.has(key)) ||
    Object.keys(after).some((key) => !SALES_STATE_TOP_LEVEL_KEYS_V2.has(key))) {
    throw new Error("SALES_STATE_KEY_INVALID");
  }
  const beforeProcessed = Array.isArray(before.processedCommandIds)
    ? before.processedCommandIds
    : null;
  const stateAdvancingEvents = plan.events.filter(({ outcome }) =>
    isStateAdvancingSalesOutcomeV1(outcome)
  );
  const mismatch = (): never => {
    throw new Error("SALES_STATE_ENVELOPE_REPLAY_MISMATCH");
  };

  if (before.schemaVersion !== 2 || after.schemaVersion !== 2 ||
    typeof before.conversationKey !== "string" || before.conversationKey.length === 0 ||
    after.conversationKey !== before.conversationKey ||
    beforeRouting.pageId !== pageId || beforeRouting.conversationId !== conversationId ||
    canonicalJsonV1(afterRouting) !== canonicalJsonV1(beforeRouting) ||
    !Number.isSafeInteger(before.revision) || before.revision !== plan.expectedRevision ||
    typeof before.stage !== "string" || typeof before.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(before.updatedAt)) ||
    beforeProcessed === null || beforeProcessed.length > MAX_SALES_PROCESSED_COMMAND_IDS_V1 ||
    beforeProcessed.some((value) => typeof value !== "string" || value.length === 0) ||
    new Set(beforeProcessed).size !== beforeProcessed.length) {
    mismatch();
  }

  let expectedRevision = before.revision as number;
  let expectedStage = before.stage as string;
  let expectedUpdatedAt = before.updatedAt;
  let expectedProcessed = [...(beforeProcessed as readonly string[])];
  for (const event of stateAdvancingEvents) {
    if (!SalesCycleStageV1Schema.safeParse(event.stageBefore).success ||
      !SalesCycleStageV1Schema.safeParse(event.stageAfter).success ||
      !isSalesStageTransitionAllowedV1(event)) {
      throw new Error("SALES_STAGE_EVENT_CHAIN_MISMATCH");
    }
    if (event.stateRevisionBefore !== expectedRevision ||
      event.stateRevisionAfter !== expectedRevision + 1 ||
      event.stageBefore !== expectedStage ||
      expectedProcessed.includes(event.commandId)) {
      mismatch();
    }
    expectedRevision = event.stateRevisionAfter;
    expectedStage = event.stageAfter;
    expectedUpdatedAt = event.occurredAt.toISOString();
    expectedProcessed = [...expectedProcessed, event.commandId]
      .slice(-MAX_SALES_PROCESSED_COMMAND_IDS_V1);
  }

  if (after.revision !== expectedRevision || after.stage !== expectedStage ||
    after.updatedAt !== expectedUpdatedAt ||
    canonicalJsonV1(after.processedCommandIds) !== canonicalJsonV1(expectedProcessed)) {
    mismatch();
  }
}

function validateLockedProtectedSalesStateTransitionV1(
  plan: RealtimeSalesCyclePlan<unknown>,
  lockedState: unknown,
): void {
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
  const before = record(lockedState);
  const after = record(plan.state);
  const stateAdvancingEvents = plan.events.filter(({ outcome }) =>
    isStateAdvancingSalesOutcomeV1(outcome)
  );
  const changed = (key: string): boolean =>
    canonicalJsonV1(before[key] ?? null) !== canonicalJsonV1(after[key] ?? null);
  const ownedFields = new Set<string>();

  let expectedStage = before.stage;
  let expectedRevision = before.revision;
  for (const event of stateAdvancingEvents) {
    if (event.stageBefore !== expectedStage || event.stateRevisionBefore !== expectedRevision) {
      throw new Error("SALES_STAGE_EVENT_CHAIN_MISMATCH");
    }
    expectedStage = event.stageAfter;
    expectedRevision = event.stateRevisionAfter;
    switch (event.commandKind) {
      case "FACTS_PRESENTED":
      case "MEASUREMENTS_REQUIRED":
      case "SIZE_RECOMMENDED":
        if (event.outcome !== "APPLIED") {
          throw new Error("SALES_STATE_OUTCOME_INVALID");
        }
        break;
      case "CART_OPENED":
        if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
        ["cart", "commerceContext", "negotiation", "checkoutDraft", "preview"]
          .forEach((key) => ownedFields.add(key));
        break;
      case "CART_MUTATED":
      case "CART_READY":
      case "NEGOTIATION_EVENT":
        if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
        ["cart", "negotiation", "preview"].forEach((key) => ownedFields.add(key));
        break;
      case "CHECKOUT_DETAILS_CAPTURED":
        if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
        ["checkoutDraft", "preview"].forEach((key) => ownedFields.add(key));
        break;
      case "CLARIFICATION_REQUESTED":
      case "CLARIFICATION_RESOLVED":
        if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
        ownedFields.add("clarification");
        break;
      case "PREVIEW_CREATED":
        if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
        ownedFields.add("preview");
        break;
      case "CONFIRM_PURCHASE":
        ownedFields.add(event.outcome === "HANDOFF" ? "preview" : "confirmation");
        break;
      case "PAYMENT_RECEIPT_RECEIVED":
        if (event.outcome !== "HANDOFF") throw new Error("SALES_STATE_OUTCOME_INVALID");
        break;
      default:
        event.commandKind satisfies never;
    }
  }
  if ((stateAdvancingEvents.length === 0 && changed("stage")) ||
    (stateAdvancingEvents.length > 0 &&
      (after.stage !== expectedStage || after.revision !== expectedRevision))) {
    throw new Error("SALES_STAGE_EVENT_CHAIN_MISMATCH");
  }

  for (const key of [
    "cart",
    "commerceContext",
    "negotiation",
    "checkoutDraft",
    "clarification",
    "preview",
    "confirmation",
  ] as const) {
    if (changed(key) && !ownedFields.has(key)) {
      throw new Error("PROTECTED_SALES_STATE_EVENT_MISMATCH");
    }
  }
}

function validateLockedProtectedSalesArtifactsV1(
  plan: RealtimeSalesCyclePlan<unknown>,
  lockedState: unknown,
  currentSourceMessageIdHash: string | null,
): void {
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
  const locked = record(lockedState);
  const proposed = record(plan.state);
  let checkoutDraft = locked.checkoutDraft === undefined || locked.checkoutDraft === null
    ? null
    : CheckoutDraftV1Schema.parse(locked.checkoutDraft);
  let clarification = locked.clarification === undefined || locked.clarification === null
    ? null
    : SalesCycleClarificationStateV1Schema.parse(locked.clarification);
  let preview = locked.preview === undefined || locked.preview === null
    ? null
    : OrderPreviewV1Schema.parse(locked.preview);
  let confirmation = locked.confirmation === undefined || locked.confirmation === null
    ? null
    : PurchaseConfirmationV1Schema.parse(locked.confirmation);
  const finalCart = proposed.cart === null || proposed.cart === undefined
    ? null
    : CartV1Schema.parse(record(proposed.cart).value);
  const finalCartExpiresAt = proposed.cart === null || proposed.cart === undefined
    ? null
    : String(record(proposed.cart).expiresAt ?? "");

  for (const event of plan.events) {
    switch (event.commandKind) {
    case "CHECKOUT_DETAILS_CAPTURED": {
      if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
      if (currentSourceMessageIdHash === null) throw new Error("CURRENT_MESSAGE_BINDING_REQUIRED");
      const evidence = CheckoutDetailsTransitionEvidenceV1Schema.parse(
        event.checkoutDetailsTransitionEvidence,
      );
      const beforeHash = sha256TextV1(canonicalCheckoutDraftHashPreimageV1(checkoutDraft));
      if (evidence.sourceMessageIdHash !== currentSourceMessageIdHash ||
        plan.sourceMessageIdHash !== currentSourceMessageIdHash ||
        evidence.commandIdHash !== sha256TextV1(event.commandId) ||
        evidence.appliedAt !== event.occurredAt.toISOString() ||
        evidence.beforeCheckoutDraftHash !== beforeHash ||
        evidence.evidenceHash !== sha256TextV1(
          checkoutDetailsTransitionEvidenceHashPreimageV1(evidence),
        )) {
        throw new Error("CHECKOUT_DETAILS_TRANSITION_EVIDENCE_MISMATCH");
      }
      const transition = applyCheckoutDetailsTransitionV1({
        current: checkoutDraft,
        details: evidence.details,
        appliedAt: event.occurredAt,
      });
      if (transition.status !== "APPLIED" ||
        evidence.afterCheckoutDraftHash !== sha256TextV1(
          canonicalCheckoutDraftHashPreimageV1(transition.draft),
        )) {
        throw new Error("CHECKOUT_DETAILS_TRANSITION_REPLAY_MISMATCH");
      }
      checkoutDraft = transition.draft;
      preview = null;
      break;
    }
    case "CART_OPENED":
      if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
      checkoutDraft = null;
      preview = null;
      break;
    case "CLARIFICATION_REQUESTED":
    case "CLARIFICATION_RESOLVED": {
      if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
      if (currentSourceMessageIdHash === null) throw new Error("CURRENT_MESSAGE_BINDING_REQUIRED");
      const evidence = ClarificationTransitionEvidenceV1Schema.parse(
        event.clarificationTransitionEvidence,
      );
      const beforeHash = sha256TextV1(
        canonicalClarificationStateHashPreimageV1(clarification),
      );
      if (evidence.sourceMessageIdHash !== currentSourceMessageIdHash ||
        plan.sourceMessageIdHash !== currentSourceMessageIdHash ||
        evidence.commandIdHash !== sha256TextV1(event.commandId) ||
        evidence.appliedAt !== event.occurredAt.toISOString() ||
        evidence.beforeClarificationHash !== beforeHash ||
        evidence.evidenceHash !== sha256TextV1(
          clarificationTransitionEvidenceHashPreimageV1(evidence),
        ) ||
        (event.commandKind === "CLARIFICATION_REQUESTED" &&
          evidence.transition.kind !== "REQUESTED") ||
        (event.commandKind === "CLARIFICATION_RESOLVED" &&
          evidence.transition.kind !== "RESOLVED")) {
        throw new Error("CLARIFICATION_TRANSITION_EVIDENCE_MISMATCH");
      }
      const transition = applySalesClarificationTransitionV1({
        current: clarification,
        transition: evidence.transition,
        appliedAt: event.occurredAt,
      });
      if (transition.status !== "APPLIED" ||
        evidence.afterClarificationHash !== sha256TextV1(
          canonicalClarificationStateHashPreimageV1(transition.clarification),
        )) {
        throw new Error("CLARIFICATION_TRANSITION_REPLAY_MISMATCH");
      }
      clarification = transition.clarification;
      break;
    }
    case "CART_MUTATED":
    case "CART_READY":
    case "NEGOTIATION_EVENT":
      if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
      preview = null;
      break;
    case "PREVIEW_CREATED": {
      if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
      if (finalCart === null) throw new Error("PREVIEW_TRANSITION_CART_REQUIRED");
      const candidate = OrderPreviewV1Schema.parse(event.previewArtifact);
      const transition = validateOrderPreviewTransitionV1({
        stage: event.stageBefore,
        cart: finalCart,
        cartExpiresAt: finalCartExpiresAt,
        checkoutDraft,
        preview: candidate,
        now: event.occurredAt,
      });
      if (transition.status !== "APPLIED" || event.cartId !== finalCart.cartId ||
        event.cartVersion !== finalCart.revision) {
        throw new Error("ORDER_PREVIEW_TRANSITION_REPLAY_MISMATCH");
      }
      preview = transition.preview;
      break;
    }
    case "CONFIRM_PURCHASE": {
      if (event.outcome === "HANDOFF") {
        preview = null;
        break;
      }
      if (currentSourceMessageIdHash === null || finalCart === null || preview === null ||
        typeof proposed.conversationKey !== "string") {
        throw new Error("PURCHASE_CONFIRMATION_TRANSITION_REQUIRED");
      }
      const candidate = PurchaseConfirmationV1Schema.parse(proposed.confirmation);
      if (sha256TextV1(candidate.sourceMessageId) !== currentSourceMessageIdHash ||
        plan.sourceMessageIdHash !== currentSourceMessageIdHash) {
        throw new Error("PURCHASE_CONFIRMATION_MESSAGE_MISMATCH");
      }
      const expected = deriveCanonicalPurchaseConfirmationV1({
        conversationKey: proposed.conversationKey,
        cart: finalCart,
        preview: {
          previewId: preview.previewId,
          previewHash: preview.previewHash as `sha256:${string}`,
        },
        sourceMessageId: candidate.sourceMessageId,
        confirmedAt: event.occurredAt,
      });
      if (event.cartId !== finalCart.cartId || event.cartVersion !== finalCart.revision ||
        canonicalJsonV1(candidate) !== canonicalJsonV1(expected)) {
        throw new Error("PURCHASE_CONFIRMATION_TRANSITION_REPLAY_MISMATCH");
      }
      confirmation = expected;
      break;
    }
    case "PAYMENT_RECEIPT_RECEIVED":
      if (event.outcome !== "HANDOFF") throw new Error("SALES_STATE_OUTCOME_INVALID");
      break;
    case "FACTS_PRESENTED":
    case "MEASUREMENTS_REQUIRED":
    case "SIZE_RECOMMENDED":
      if (event.outcome !== "APPLIED") throw new Error("SALES_STATE_OUTCOME_INVALID");
      break;
    default:
      event.commandKind satisfies never;
    }
  }

  const finalCheckoutDraft = proposed.checkoutDraft === undefined || proposed.checkoutDraft === null
    ? null
    : CheckoutDraftV1Schema.parse(proposed.checkoutDraft);
  const finalPreview = proposed.preview === undefined || proposed.preview === null
    ? null
    : OrderPreviewV1Schema.parse(proposed.preview);
  const finalClarification = proposed.clarification === undefined || proposed.clarification === null
    ? null
    : SalesCycleClarificationStateV1Schema.parse(proposed.clarification);
  const finalConfirmation = proposed.confirmation === undefined || proposed.confirmation === null
    ? null
    : PurchaseConfirmationV1Schema.parse(proposed.confirmation);
  if (canonicalJsonV1(checkoutDraft) !== canonicalJsonV1(finalCheckoutDraft) ||
    canonicalJsonV1(clarification) !== canonicalJsonV1(finalClarification) ||
    canonicalJsonV1(preview) !== canonicalJsonV1(finalPreview) ||
    canonicalJsonV1(confirmation) !== canonicalJsonV1(finalConfirmation)) {
    throw new Error("PROTECTED_SALES_ARTIFACT_REPLAY_MISMATCH");
  }
}

function salesStateRecordV1(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function salesStateCartExpiryV1(value: unknown): string | null {
  const cart = salesStateRecordV1(salesStateRecordV1(value).cart);
  if (cart.value === undefined || cart.value === null) return null;
  if (typeof cart.expiresAt !== "string" || !Number.isFinite(Date.parse(cart.expiresAt))) {
    throw new Error("CART_EXPIRY_BINDING_MISMATCH");
  }
  return cart.expiresAt;
}

function validateLockedCartExpiryBindingV1(
  plan: RealtimeSalesCyclePlan<unknown>,
  lockedState: unknown,
  lockedCartExpiresAt: Date | null,
): void {
  const beforeExpiry = salesStateCartExpiryV1(lockedState);
  const beforeExpiryMs = beforeExpiry === null ? null : Date.parse(beforeExpiry);
  const lockedColumnExpiryMs = lockedCartExpiresAt?.getTime() ?? null;
  if ((beforeExpiryMs !== null && !Number.isFinite(beforeExpiryMs)) ||
    (lockedColumnExpiryMs !== null && !Number.isFinite(lockedColumnExpiryMs)) ||
    beforeExpiryMs !== lockedColumnExpiryMs) {
    throw new Error("CART_EXPIRY_BINDING_MISMATCH");
  }
  const afterExpiry = salesStateCartExpiryV1(plan.state);
  const planExpiry = plan.cartExpiresAt?.toISOString() ?? null;
  if (afterExpiry !== planExpiry) throw new Error("CART_EXPIRY_BINDING_MISMATCH");

  const cartOpenEvents = plan.events.filter(({ commandKind, outcome }) =>
    commandKind === "CART_OPENED" && outcome === "APPLIED"
  );
  if (cartOpenEvents.length > 0) {
    const evidence = CartOpenEvidenceV1Schema.parse(plan.cartOpenEvidence);
    const createdAt = Date.parse(evidence.createdAt);
    const expiresAt = Date.parse(evidence.cartExpiresAt);
    if (cartOpenEvents.length !== 1 || afterExpiry !== evidence.cartExpiresAt ||
      expiresAt - createdAt > CART_TTL_MS_V1) {
      throw new Error("CART_EXPIRY_BINDING_MISMATCH");
    }
    return;
  }
  if (afterExpiry !== beforeExpiry) throw new Error("CART_EXPIRY_BINDING_MISMATCH");
}

function cartFromSalesStateV1(value: unknown): CartV1 {
  const envelope = salesStateRecordV1(salesStateRecordV1(value).cart);
  return CartV1Schema.parse(envelope.value);
}

function negotiationQuoteFromCartV1(
  cart: CartV1,
  policyBundleId: string,
  policyVersion: string,
  customerState: "READY" | "HESITANT" | "CAUTIOUS",
): Record<string, unknown> {
  return {
    policyBundleId,
    policyVersion,
    customerState,
    parentProductUnitCount: cart.lines.reduce((total, { quantity }) => total + quantity, 0),
    subtotalVnd: cart.subtotalVnd,
    shippingFeeVnd: cart.shippingFeeVnd,
    adjustments: cart.adjustments.map((adjustment) => ({
      ruleId: adjustment.policyAuthorization.ruleId,
      kind: adjustment.kind,
      amountVnd: adjustment.amountVnd,
      percentageBps: adjustment.percentageBps,
    })),
    discountTotalVnd: cart.discountTotalVnd,
    grandTotalVnd: cart.grandTotalVnd,
  };
}

function validateInitialCartNegotiationV1(
  event: RealtimeSalesCycleEventPlan,
  cart: CartV1,
  nextState: unknown,
  shopId: string,
  policyBundleId: string,
  policyVersion: string,
  createdAt: string,
): void {
  const negotiation = salesStateRecordV1(salesStateRecordV1(nextState).negotiation);
  const lines = canonicalCartPolicyLinesV2(cart.lines, shopId);
  if (lines === null) throw new Error("CART_OPEN_NEGOTIATION_MISMATCH");
  const eventId = `${event.commandId}:ready`;
  const fingerprint = canonicalNegotiationEventFingerprintV1({
    negotiationId: `negotiation:${cart.cartId}`,
    expectedStateVersion: 0,
    expectedCartVersion: cart.revision,
    eventId,
    evidence: {
      source: "MODEL_INTERPRETATION",
      intent: "PURCHASE_READY",
      evidenceId: eventId,
      observedAt: createdAt,
    },
    cart: { cartId: cart.cartId, cartVersion: cart.revision, lines },
  });
  const expected = {
    schemaVersion: 2,
    negotiationId: `negotiation:${cart.cartId}`,
    cartId: cart.cartId,
    cartVersion: cart.revision,
    stateVersion: 1,
    customerState: "READY",
    consumedObjectionEvidenceIds: [],
    processedEvents: [{ eventId, fingerprint, resultingStateVersion: 1 }],
    quote: negotiationQuoteFromCartV1(cart, policyBundleId, policyVersion, "READY"),
    updatedAt: createdAt,
  };
  if (canonicalJsonV1(negotiation) !== canonicalJsonV1(expected)) {
    throw new Error("CART_OPEN_NEGOTIATION_MISMATCH");
  }
}

async function validateLockedCartOpenTransitionV1(
  client: PoolClient,
  pageId: string,
  plan: RealtimeSalesCyclePlan<unknown>,
  lockedState: unknown,
  transactionNow: Date,
): Promise<void> {
  const events = plan.events.filter(({ commandKind, outcome }) =>
    commandKind === "CART_OPENED" && outcome === "APPLIED"
  );
  if (events.length === 0) {
    if (plan.cartOpenEvidence !== undefined) throw new Error("CART_OPEN_EVIDENCE_UNEXPECTED");
    return;
  }
  if (events.length !== 1 || plan.cartOpenEvidence === undefined) {
    throw new Error("CART_OPEN_EVIDENCE_REQUIRED");
  }
  const event = events[0]!;
  const evidence = CartOpenEvidenceV1Schema.parse(plan.cartOpenEvidence);
  const buyingIntent = CanonicalBuyingIntentV1Schema.parse(plan.canonicalBuyingIntent);
  const seedLine = evidence.draft.lines[0]!;
  if (evidence.sourceMessageIdHash !== plan.sourceMessageIdHash ||
    evidence.commandIdHash !== sha256TextV1(event.commandId) ||
    evidence.createdAt !== event.occurredAt.toISOString() ||
    evidence.cartExpiresAt !== salesStateCartExpiryV1(plan.state) ||
    evidence.cartExpiresAt !== plan.cartExpiresAt?.toISOString() ||
    evidence.evidenceHash !== sha256TextV1(cartOpenEvidenceHashPreimageV1(evidence)) ||
    evidence.cartDraftRef.contentHash !== `sha256:${sha256CanonicalV1(evidence.draft)}` ||
    evidence.replayContext.policyRef.contentHash !==
      `sha256:${sha256CanonicalV1(evidence.replayContext.policyBundle)}` ||
    buyingIntent.decision !== "COMMITTED" ||
    !buyingIntent.contributors.includes("DETERMINISTIC_RUNTIME") ||
    buyingIntent.productId !== seedLine.parentProductId ||
    !(buyingIntent.requestedAction === "OPEN_CART" ||
      buyingIntent.requestedAction === "ADD_TO_CART")) {
    throw new Error("CART_OPEN_EVIDENCE_MISMATCH");
  }
  const locked = salesStateRecordV1(lockedState);
  const lockedCartEnvelope = salesStateRecordV1(locked.cart);
  if (lockedCartEnvelope.value !== undefined && lockedCartEnvelope.value !== null) {
    const expiresAt = Date.parse(String(lockedCartEnvelope.expiresAt ?? ""));
    if (!Number.isFinite(expiresAt) || expiresAt > transactionNow.getTime()) {
      throw new Error("CART_OPEN_PRIOR_CART_ACTIVE");
    }
  }
  const pin = await client.query<{ bundle_hash: string; bundle: Record<string, unknown> }>(
    `SELECT bundle_hash, bundle
     FROM runtime_policy_pins
     WHERE pin_scope_type = $1 AND pin_scope_id = $2
       AND page_id = $3 AND channel = $4
     FOR SHARE`,
    [evidence.policyPin.scopeType, evidence.policyPin.scopeId, pageId, evidence.policyPin.channel],
  );
  const pinned = pin.rows[0];
  if (!pinned || pinned.bundle_hash !== evidence.policyPin.bundleHash ||
    canonicalJsonV1(pinned.bundle.policy) !== canonicalJsonV1(evidence.replayContext.policyBundle)) {
    throw new Error("CART_OPEN_POLICY_PIN_MISMATCH");
  }
  const replay = createCanonicalCartV2({
    identity: evidence.draft.identity,
    lines: evidence.draft.lines,
    shopId: evidence.draft.shopId,
    policy: evidence.replayContext.policyBundle,
    now: new Date(evidence.createdAt),
    authorizationNow: transactionNow,
  });
  const next = salesStateRecordV1(plan.state);
  const nextCart = cartFromSalesStateV1(next);
  if (event.cartId !== nextCart.cartId || event.cartVersion !== nextCart.revision ||
    event.stateRevisionBefore !== plan.expectedRevision ||
    event.stateRevisionAfter !== Number(next.revision)) {
    throw new Error("CART_OPEN_EVENT_BINDING_MISMATCH");
  }
  if (replay.status !== "CREATED" || canonicalJsonV1(replay.cart) !== canonicalJsonV1(nextCart) ||
    canonicalJsonV1(next.commerceContext) !== canonicalJsonV1({
      shopId: evidence.draft.shopId,
      policyRef: evidence.draft.policyRef,
    })) {
    throw new Error("CART_OPEN_FULL_REPLAY_MISMATCH");
  }
  validateInitialCartNegotiationV1(
    event,
    nextCart,
    next,
    evidence.draft.shopId,
    evidence.replayContext.policyBundle.policyBundleId,
    evidence.replayContext.policyBundle.policyVersion,
    evidence.createdAt,
  );
}

function validateLockedNegotiationTransitionV1(
  plan: RealtimeSalesCyclePlan<unknown>,
  lockedState: unknown,
  event: RealtimeSalesCycleEventPlan,
  beforeCart: CartV1,
  afterCart: CartV1,
  shopId: string,
  policyBundleId: string,
  policyVersion: string,
): "READY" | "HESITANT" | "CAUTIOUS" {
  const nextRecord = salesStateRecordV1(plan.state);
  if (event.cartId !== afterCart.cartId || event.cartVersion !== afterCart.revision ||
    event.stateRevisionBefore !== plan.expectedRevision ||
    event.stateRevisionAfter !== Number(nextRecord.revision)) {
    throw new Error("NEGOTIATION_EVENT_BINDING_MISMATCH");
  }
  const evidence = NegotiationTransitionEvidenceV1Schema.parse(
    event.negotiationTransitionEvidence,
  );
  if (evidence.sourceMessageIdHash !== plan.sourceMessageIdHash ||
    evidence.commandIdHash !== sha256TextV1(event.commandId) ||
    evidence.evidenceHash !== sha256TextV1(
      negotiationTransitionEvidenceHashPreimageV1(evidence),
    )) throw new Error("NEGOTIATION_TRANSITION_EVIDENCE_MISMATCH");
  const before = salesStateRecordV1(salesStateRecordV1(lockedState).negotiation);
  const after = salesStateRecordV1(salesStateRecordV1(plan.state).negotiation);
  const beforeProcessed = Array.isArray(before.processedEvents) ? before.processedEvents : [];
  const afterProcessed = Array.isArray(after.processedEvents) ? after.processedEvents : [];
  const beforeConsumed = Array.isArray(before.consumedObjectionEvidenceIds)
    ? before.consumedObjectionEvidenceIds : [];
  const afterConsumed = Array.isArray(after.consumedObjectionEvidenceIds)
    ? after.consumedObjectionEvidenceIds : [];
  const newProcessed = salesStateRecordV1(afterProcessed[beforeProcessed.length]);
  const eventId = typeof newProcessed.eventId === "string" ? newProcessed.eventId : "";
  const evidenceId = eventId;
  const objectionId = evidence.intent === "PRICE_OBJECTION"
    ? afterConsumed[beforeConsumed.length]
    : null;
  if (sha256TextV1(eventId) !== evidence.eventIdHash ||
    sha256TextV1(evidenceId) !== evidence.evidenceIdHash ||
    (evidence.intent === "PRICE_OBJECTION" &&
      (typeof objectionId !== "string" || sha256TextV1(objectionId) !== evidence.objectionEvidenceIdHash)) ||
    canonicalJsonV1(afterProcessed.slice(0, beforeProcessed.length)) !== canonicalJsonV1(beforeProcessed) ||
    canonicalJsonV1(afterConsumed.slice(0, beforeConsumed.length)) !== canonicalJsonV1(beforeConsumed) ||
    afterProcessed.length !== beforeProcessed.length + 1 ||
    afterConsumed.length !== beforeConsumed.length + (evidence.intent === "PRICE_OBJECTION" ? 1 : 0)) {
    throw new Error("NEGOTIATION_TRANSITION_EVIDENCE_MISMATCH");
  }
  const previousCustomerState = before.customerState;
  if (previousCustomerState !== "READY" && previousCustomerState !== "HESITANT" &&
    previousCustomerState !== "CAUTIOUS") {
    throw new Error("NEGOTIATION_LOCKED_STATE_INVALID");
  }
  const customerState = deriveCanonicalNegotiationCustomerStateV1(
    previousCustomerState,
    evidence.intent,
    false,
  );
  const lines = canonicalCartPolicyLinesV2(beforeCart.lines, shopId);
  if (lines === null) throw new Error("NEGOTIATION_CART_FACT_INVALID");
  const rawEvidence = evidence.intent === "PRICE_OBJECTION"
    ? {
        source: "MODEL_INTERPRETATION" as const,
        intent: "PRICE_OBJECTION" as const,
        evidenceId,
        objectionEvidenceId: objectionId as string,
        reasonCode: evidence.reasonCode!,
        observedAt: evidence.observedAt,
      }
    : {
        source: "MODEL_INTERPRETATION" as const,
        intent: evidence.intent,
        evidenceId,
        observedAt: evidence.observedAt,
      };
  const fingerprint = canonicalNegotiationEventFingerprintV1({
    negotiationId: String(before.negotiationId),
    expectedStateVersion: Number(before.stateVersion),
    expectedCartVersion: beforeCart.revision,
    eventId,
    evidence: rawEvidence,
    cart: { cartId: beforeCart.cartId, cartVersion: beforeCart.revision, lines },
  });
  const expected = {
    ...before,
    cartVersion: afterCart.revision,
    stateVersion: Number(before.stateVersion) + 1,
    customerState,
    consumedObjectionEvidenceIds: afterConsumed,
    processedEvents: [...beforeProcessed, {
      eventId,
      fingerprint,
      resultingStateVersion: Number(before.stateVersion) + 1,
    }],
    quote: negotiationQuoteFromCartV1(afterCart, policyBundleId, policyVersion, customerState),
    updatedAt: event.occurredAt.toISOString(),
  };
  if (canonicalJsonV1(after) !== canonicalJsonV1(expected)) {
    throw new Error("NEGOTIATION_TRANSITION_REPLAY_MISMATCH");
  }
  return customerState;
}

function validateMetaEffectReadiness<TState, TSalesState>(
  input: RealtimeCommitInput<TState, TSalesState>,
  now: Date,
  currentSourceMessageIdHash: string | null,
): void {
  const meta = input.metaPlan;
  if (!meta) return;
  if (!meta.effectReadiness) {
    const hasCommerceSalesReadiness = (input.salesCyclePlan?.effectReadiness ?? [])
      .map((value) => DeterministicEffectReadinessV1Schema.parse(value))
      .some(({ binding }) => binding.cart !== null);
    if (
      hasCommerceSalesReadiness ||
      (meta.protectedClaimTypes?.length ?? 0) > 0 ||
      (meta.protectedClaims?.length ?? 0) > 0 ||
      meta.sourceMessageIdHash !== undefined
    ) {
      throw new Error("PROTECTED_OUTBOUND_READINESS_REQUIRED");
    }
    return;
  }
  const readiness = DeterministicEffectReadinessV1Schema.parse(meta.effectReadiness);
  validateReadinessEnvelopeHashesV1(readiness);
  if (readiness.effect !== "PROTECTED_OUTBOUND" || readiness.outcome !== "READY") {
    throw new Error("PROTECTED_OUTBOUND_READINESS_REQUIRED");
  }
  const temporalStatus = validateEffectReadinessTemporalWindowV1({
    checkedAt: readiness.checkedAt,
    expiresAt: readiness.expiresAt,
    now,
  });
  if (currentSourceMessageIdHash === null ||
    readiness.pageId !== input.pageId || readiness.conversationId !== input.conversationId ||
    readiness.conversationRevision !== input.expectedStateVersion ||
    readiness.sourceMessageIdHash !== meta.sourceMessageIdHash ||
    readiness.sourceMessageIdHash !== currentSourceMessageIdHash ||
    temporalStatus !== "VALID") {
    throw new Error("PROTECTED_OUTBOUND_READINESS_MISMATCH");
  }
  const claims = (meta.protectedClaims ?? []).map((claim) => ProtectedClaimV1Schema.parse(claim));
  const claimHash = claims.length === 0
    ? null
    : sha256CanonicalV1([...claims].sort((a, b) => a.claimId.localeCompare(b.claimId)));
  const actualClaimTypes = [...new Set(claims.map(({ type }) => type))].sort();
  const expectedClaimTypes = [...readiness.protectedClaimTypes].sort();
  if (claimHash !== readiness.claimSetHash ||
    JSON.stringify([...(meta.protectedClaimTypes ?? [])].sort()) !== JSON.stringify([...readiness.protectedClaimTypes].sort()) ||
    JSON.stringify(actualClaimTypes) !== JSON.stringify(expectedClaimTypes)) {
    throw new Error("PROTECTED_OUTBOUND_CLAIM_BINDING_MISMATCH");
  }
  const payloadHash = sha256CanonicalV1(meta.messages);
  if (readiness.deterministicEvidenceHash !== payloadHash ||
    readiness.binding.payloadHash !== payloadHash) {
    throw new Error("PROTECTED_OUTBOUND_PAYLOAD_MISMATCH");
  }
  if (readiness.binding.cart !== null) {
    const salesReadiness = (input.salesCyclePlan?.effectReadiness ?? []).map((value) =>
      DeterministicEffectReadinessV1Schema.parse(value)
    );
    const parent = salesReadiness.find(({ readinessHash }) =>
      readinessHash === readiness.binding.parentReadinessHash
    );
    if (!parent || parent.effect === "PROTECTED_OUTBOUND" ||
      canonicalJsonV1(parent.binding.cart) !== canonicalJsonV1(readiness.binding.cart) ||
      canonicalJsonV1(parent.binding.preview) !== canonicalJsonV1(readiness.binding.preview)) {
      throw new Error("PROTECTED_OUTBOUND_SALES_READINESS_MISMATCH");
    }
  }
  if (claims.some((claim) =>
    Date.parse(claim.provenance.observedAt) >
      now.getTime() + MAX_EFFECT_FUTURE_CLOCK_SKEW_MS_V1 ||
    Date.parse(claim.provenance.expiresAt) <= now.getTime()
  )) {
    throw new Error("PROTECTED_OUTBOUND_CLAIM_STALE");
  }
  if (claims.some((claim) => claim.scope.kind === "PRODUCT"
    ? !readiness.productIds.includes(claim.scope.productId)
    : claim.scope.kind === "CART" &&
      (claim.scope.cartId !== readiness.cartId || claim.scope.cartVersion !== readiness.cartVersion))) {
    throw new Error("PROTECTED_OUTBOUND_CLAIM_SCOPE_MISMATCH");
  }
  const claimSemantics = validateEffectClaimSemanticsV1({
    effect: "PROTECTED_OUTBOUND",
    productIds: readiness.productIds,
    cartId: readiness.cartId,
    cartVersion: readiness.cartVersion,
    protectedClaimTypes: readiness.protectedClaimTypes,
    claims,
  });
  if (claimSemantics.missing) throw new Error("PROTECTED_OUTBOUND_CLAIM_MISSING");
  if (claimSemantics.conflict) throw new Error("PROTECTED_OUTBOUND_CLAIM_CONFLICT");
  if (readiness.binding.cart !== null) {
    const state = input.salesCyclePlan?.state as Record<string, unknown> | undefined;
    const cartEnvelope = state?.cart as { value?: unknown } | null | undefined;
    const cart = CartV1Schema.parse(cartEnvelope?.value);
    const cartSemantics = validateCartEffectClaimSemanticsV1({
      effect: "PROTECTED_OUTBOUND",
      lines: cart.lines.map((line) => ({
        parentProductId: line.parentProductId,
        offerId: line.offerId,
        quantity: line.quantity,
        posUnitPriceVnd: line.posUnitPriceVnd,
        priceFactRef: line.priceAuthority?.priceFactRef ?? null,
      })),
      claims,
      cartId: readiness.cartId,
      cartVersion: readiness.cartVersion,
      protectedClaimTypes: readiness.protectedClaimTypes,
    });
    if (cartSemantics.mismatch) throw new Error("PROTECTED_OUTBOUND_CLAIM_VALUE_MISMATCH");
    if (cartSemantics.missing) throw new Error("PROTECTED_OUTBOUND_CLAIM_MISSING");
    if (cartSemantics.conflict) throw new Error("PROTECTED_OUTBOUND_CLAIM_CONFLICT");
  }
}

export type MetaResponseGroupGateStatus =
  | "UNVERIFIED"
  | "ALLOWED"
  | "BLOCKED";

export type MetaResponseGroupBlockingTag =
  | "NHAN_VIEN"
  | "VAN_DON"
  | "DA_CHOT_DON"
  | "KHONG_UP_SALE";

export interface MetaResponseGroupGateSnapshot {
  readonly responseGroupId: string;
  readonly source: "PANCAKE";
  readonly status: MetaResponseGroupGateStatus;
  readonly reasonCode: string | null;
  readonly blockingTag: MetaResponseGroupBlockingTag | null;
  readonly observedAt: Date | null;
  readonly attemptCount: number;
  readonly expiresAt: Date;
}

export interface MetaResponseGroupGateObservation {
  readonly status: MetaResponseGroupGateStatus;
  readonly reasonCode: string | null;
  readonly blockingTag: MetaResponseGroupBlockingTag | null;
  readonly observedAt: Date | null;
}

export interface ClaimedMetaOutbox {
  readonly outboxId: string;
  readonly leaseToken: string;
  readonly pageId: string;
  readonly conversationId: string;
  readonly replyPlanId: string;
  readonly responseGroupId: string;
  readonly sequenceNo: number;
  readonly recipientId: string;
  readonly pancakeConversationId: string | null;
  readonly message: RealtimeMetaMessageUnit;
  readonly attemptCount: number;
}

export interface ClaimedPancakeTagOutbox {
  readonly operationId: string;
  readonly leaseToken: string;
  readonly pageId: string;
  readonly conversationId: string;
  readonly pancakeConversationId: string;
  readonly desiredTag:
    | "NHAN_VIEN"
    | "VAN_DON"
    | "DA_CHOT_DON"
    | "KHONG_UP_SALE";
  readonly operation: "ADD" | "REMOVE";
  readonly tagId: string;
  readonly attemptCount: number;
}

interface ConversationRow {
  conversation_id: string;
  page_id: string;
  customer_hash: string;
  state_version: string;
  state_snapshot: unknown;
  routing_owner: "N8N" | "APP";
  app_send_enabled: boolean;
  kill_switch: boolean;
}

interface MetaOutboxRow {
  outbox_id: string;
  page_id: string;
  conversation_id: string;
  reply_plan_id: string;
  response_group_id: string;
  sequence_no: number;
  attempt_count: number;
  lease_token: string;
  recipient_ciphertext: Buffer;
  recipient_nonce: Buffer;
  recipient_auth_tag: Buffer;
  payload_ciphertext: Buffer;
  payload_nonce: Buffer;
  payload_auth_tag: Buffer;
  payload_encrypted_dek: Buffer;
  payload_key_ref: string;
  payload_expires_at: Date;
  pancake_conversation_ciphertext: Buffer | null;
  pancake_conversation_nonce: Buffer | null;
  pancake_conversation_auth_tag: Buffer | null;
}

interface MetaResponseGroupGateRow {
  response_group_id: string;
  source: "PANCAKE";
  status: MetaResponseGroupGateStatus;
  reason_code: string | null;
  blocking_tag: MetaResponseGroupBlockingTag | null;
  observed_at: Date | null;
  attempt_count: number;
  expires_at: Date;
}

interface PancakeTagOutboxRow {
  operation_id: string;
  page_id: string;
  conversation_id: string;
  desired_tag:
    | "NHAN_VIEN"
    | "VAN_DON"
    | "DA_CHOT_DON"
    | "KHONG_UP_SALE";
  operation: "ADD" | "REMOVE";
  pancake_tag_id: string;
  attempt_count: number;
  lease_token: string;
  pancake_conversation_ciphertext: Buffer;
  pancake_conversation_nonce: Buffer;
  pancake_conversation_auth_tag: Buffer;
}

interface SalesCycleRow {
  conversation_id: string;
  page_id: string;
  state_revision: string;
  state_ciphertext: Buffer;
  state_nonce: Buffer;
  state_auth_tag: Buffer;
  state_encrypted_dek: Buffer;
  state_key_ref: string;
  cart_expires_at: Date | null;
  expires_at: Date;
}

export class PostgresRealtimeRuntimeStore {
  private readonly pool: Pool;

  constructor(
    connectionString: string,
    private readonly cipher: LocalEnvelopeCipher,
    maxPoolSize = 5,
  ) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
  }

  async isOwnMetaMessage(
    pageId: string,
    providerMessageId: string,
  ): Promise<boolean> {
    if (!pageId.trim() || !providerMessageId.trim()) return false;
    const result = await this.pool.query(
      `SELECT 1
       FROM meta_outbox
       WHERE page_id = $1
         AND meta_message_id = $2
         AND status IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')
       LIMIT 1`,
      [pageId, providerMessageId],
    );
    return result.rowCount === 1;
  }

  async loadOrCreate<TState>(
    pageId: string,
    customerHash: string,
    routingOwner: "N8N" | "APP",
    createState: (conversationId: string) => TState,
    now = new Date(),
  ): Promise<RealtimeConversationRecord<TState>> {
    return withTransaction(this.pool, async (client) => {
      const existing = await this.selectConversation<TState>(
        client,
        pageId,
        customerHash,
        true,
      );
      if (existing) {
        if (
          existing.stateVersion === 0 &&
          this.emptyObject(existing.state)
        ) {
          const initialized = createState(existing.conversationId);
          await client.query(
            `UPDATE conversations
             SET state_snapshot = $2::jsonb, updated_at = $3
             WHERE conversation_id = $1 AND state_version = 0`,
            [existing.conversationId, JSON.stringify(initialized), now],
          );
          return { ...existing, state: initialized };
        }
        return existing;
      }

      const conversationId = randomUUID();
      const state = createState(conversationId);
      await client.query(
        `INSERT INTO conversations (
           conversation_id, page_id, customer_hash, hash_key_version,
           routing_owner, conversation_owner, state_version, state_snapshot,
           first_seen_at, updated_at, expires_at
         ) VALUES (
           $1,$2,$3,'analytics-hmac-v1',$4,'BOT',0,$5::jsonb,
           $6::timestamptz,$6::timestamptz,
           $6::timestamptz + interval '20 days'
         )
         ON CONFLICT (page_id, customer_hash) DO NOTHING`,
        [
          conversationId,
          pageId,
          customerHash,
          routingOwner,
          JSON.stringify(state),
          now,
        ],
      );
      const inserted = await this.selectConversation<TState>(
        client,
        pageId,
        customerHash,
        true,
      );
      if (!inserted) throw new Error("REALTIME_CONVERSATION_CREATE_FAILED");
      if (
        inserted.stateVersion === 0 &&
        this.emptyObject(inserted.state)
      ) {
        const initialized = createState(inserted.conversationId);
        await client.query(
          `UPDATE conversations
           SET state_snapshot = $2::jsonb, updated_at = $3
           WHERE conversation_id = $1 AND state_version = 0`,
          [inserted.conversationId, JSON.stringify(initialized), now],
        );
        return { ...inserted, state: initialized };
      }
      return inserted;
    });
  }

  async loadOrCreateCustomerProfile<TProfile, TEvidence = Record<string, unknown>>(
    pageId: string,
    customerHash: string,
    create: () => {
      readonly profile: TProfile;
      readonly fieldEvidence: TEvidence;
      readonly revision: number;
    },
    now = new Date(),
  ): Promise<RealtimeCustomerProfileRecord<TProfile, TEvidence>> {
    if (!pageId.trim() || !customerHash.trim() || Number.isNaN(now.getTime())) {
      throw new Error("CUSTOMER_PROFILE_IDENTITY_INVALID");
    }
    return withTransaction(this.pool, async (client) => {
      const selected = await client.query<{
        revision: string;
        profile_snapshot: TProfile;
        field_evidence: TEvidence;
        expires_at: Date;
      }>(
        `SELECT revision, profile_snapshot, field_evidence, expires_at
         FROM realtime_customer_profiles
         WHERE page_id = $1 AND customer_hash = $2
         FOR UPDATE`,
        [pageId, customerHash],
      );
      const existing = selected.rows[0];
      if (existing && existing.expires_at.getTime() > now.getTime()) {
        return {
          pageId,
          customerHash,
          revision: Number(existing.revision),
          profile: existing.profile_snapshot,
          fieldEvidence: existing.field_evidence,
          expiresAt: existing.expires_at,
        };
      }

      const initial = create();
      if (!Number.isInteger(initial.revision) || initial.revision < 1) {
        throw new Error("CUSTOMER_PROFILE_INITIAL_REVISION_INVALID");
      }
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
      await client.query(
        `INSERT INTO realtime_customer_profiles (
           page_id, customer_hash, revision, profile_snapshot, field_evidence,
           expires_at, created_at, updated_at
         ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$7)
         ON CONFLICT (page_id, customer_hash) DO UPDATE SET
           revision = EXCLUDED.revision,
           profile_snapshot = EXCLUDED.profile_snapshot,
           field_evidence = EXCLUDED.field_evidence,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at
         WHERE realtime_customer_profiles.expires_at <= $7`,
        [
          pageId,
          customerHash,
          initial.revision,
          JSON.stringify(initial.profile),
          JSON.stringify(initial.fieldEvidence),
          expiresAt,
          now,
        ],
      );
      return {
        pageId,
        customerHash,
        revision: initial.revision,
        profile: initial.profile,
        fieldEvidence: initial.fieldEvidence,
        expiresAt,
      };
    });
  }

  async compareAndSwapCustomerProfile<TProfile, TEvidence>(
    pageId: string,
    customerHash: string,
    expectedRevision: number,
    next: {
      readonly revision: number;
      readonly profile: TProfile;
      readonly fieldEvidence: TEvidence;
    },
    now = new Date(),
  ): Promise<boolean> {
    if (
      !pageId.trim() ||
      !customerHash.trim() ||
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 1 ||
      !Number.isInteger(next.revision) ||
      next.revision !== expectedRevision + 1 ||
      Number.isNaN(now.getTime())
    ) {
      throw new Error("CUSTOMER_PROFILE_CAS_INPUT_INVALID");
    }
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
    const result = await this.pool.query(
      `UPDATE realtime_customer_profiles
       SET revision = $4,
           profile_snapshot = $5::jsonb,
           field_evidence = $6::jsonb,
           expires_at = $7,
           updated_at = $8
       WHERE page_id = $1
         AND customer_hash = $2
         AND revision = $3
         AND expires_at > $8`,
      [
        pageId,
        customerHash,
        expectedRevision,
        next.revision,
        JSON.stringify(next.profile),
        JSON.stringify(next.fieldEvidence),
        expiresAt,
        now,
      ],
    );
    return result.rowCount === 1;
  }

  async loadOrCreateSalesCycle<TState>(
    pageId: string,
    conversationId: string,
    createState: () => TState,
    now = new Date(),
  ): Promise<RealtimeSalesCycleRecord<TState>> {
    if (!pageId.trim() || !conversationId.trim() || Number.isNaN(now.getTime())) {
      throw new Error("SALES_CYCLE_IDENTITY_INVALID");
    }
    return withTransaction(this.pool, async (client) => {
      const selected = await client.query<SalesCycleRow>(
        `SELECT conversation_id, page_id, state_revision, state_ciphertext,
                state_nonce, state_auth_tag, state_encrypted_dek,
                state_key_ref, cart_expires_at, expires_at
         FROM sales_cycle_states
         WHERE conversation_id = $1 AND page_id = $2
         FOR UPDATE`,
        [conversationId, pageId],
      );
      const existing = selected.rows[0];
      if (existing && existing.expires_at.getTime() > now.getTime()) {
        return this.salesCycleRecord<TState>(existing);
      }

      const state = createState();
      const expiresAt = new Date(now.getTime() + CART_TTL_MS_V1);
      const encrypted = this.cipher.encryptJson(
        state,
        this.salesCycleAad(pageId, conversationId),
        expiresAt,
      );
      await client.query(
        `INSERT INTO sales_cycle_states (
           conversation_id, page_id, state_revision, state_ciphertext,
           state_nonce, state_auth_tag, state_encrypted_dek, state_key_ref,
           cart_expires_at, expires_at, created_at, updated_at
         ) VALUES ($1,$2,0,$3,$4,$5,$6,$7,NULL,$8,$9,$9)
         ON CONFLICT (conversation_id) DO UPDATE SET
           page_id = EXCLUDED.page_id,
           state_revision = 0,
           state_ciphertext = EXCLUDED.state_ciphertext,
           state_nonce = EXCLUDED.state_nonce,
           state_auth_tag = EXCLUDED.state_auth_tag,
           state_encrypted_dek = EXCLUDED.state_encrypted_dek,
           state_key_ref = EXCLUDED.state_key_ref,
           cart_expires_at = NULL,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at`,
        [
          conversationId,
          pageId,
          encrypted.ciphertext,
          encrypted.nonce,
          encrypted.authTag,
          encrypted.encryptedDek,
          encrypted.keyRef,
          expiresAt,
          now,
        ],
      );
      return {
        conversationId,
        pageId,
        stateRevision: 0,
        state,
        cartExpiresAt: null,
        expiresAt,
      };
    });
  }

  async persistObservedCustomerIdentity(
    pageId: string,
    conversationId: string,
    customerName: string,
    observedAt: Date,
  ): Promise<boolean> {
    const normalized = customerName.trim().replace(/\s+/gu, " ").slice(0, 160);
    if (!normalized || Number.isNaN(observedAt.getTime())) return false;
    const encrypted = this.cipher.encryptValue(
      normalized,
      `lana:admin-identity:v1:${pageId}:${conversationId}:PANCAKE`,
    );
    const expiresAt = new Date(observedAt.getTime() + 20 * 24 * 60 * 60_000);
    const result = await this.pool.query(
      `INSERT INTO admin_conversation_identities (
         page_id, conversation_id, provider, customer_name_ciphertext,
         customer_name_nonce, customer_name_auth_tag, encryption_key_ref,
         observed_at, expires_at, updated_at
       ) VALUES ($1::text,$2::uuid,'PANCAKE',$3,$4,$5,$6::text,$7::timestamptz,$8::timestamptz,now())
       ON CONFLICT (page_id, conversation_id, provider) DO UPDATE SET
         customer_name_ciphertext = EXCLUDED.customer_name_ciphertext,
         customer_name_nonce = EXCLUDED.customer_name_nonce,
         customer_name_auth_tag = EXCLUDED.customer_name_auth_tag,
         encryption_key_ref = EXCLUDED.encryption_key_ref,
         observed_at = EXCLUDED.observed_at,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()
       WHERE admin_conversation_identities.observed_at <= EXCLUDED.observed_at`,
      [
        pageId,
        conversationId,
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.authTag,
        this.cipher.keyRef,
        observedAt,
        expiresAt,
      ],
    );
    return result.rowCount === 1;
  }

  async commit<TState, TSalesState = unknown>(
    input: RealtimeCommitInput<TState, TSalesState>,
    now = new Date(),
  ): Promise<RealtimeCommitResult> {
    return withTransaction(this.pool, async (client) => {
      // Keep the same lock order as webhook enqueue: pages -> ingress head.
      // Reversing these two locks allows an enqueue and a model commit for the
      // same page/conversation to deadlock under load.
      const route = await client.query<{
        routing_owner: "N8N" | "APP";
        app_send_enabled: boolean;
        kill_switch: boolean;
        transaction_now: Date;
      }>(
        `SELECT routing_owner, app_send_enabled, kill_switch,
                clock_timestamp() AS transaction_now
         FROM pages WHERE page_id = $1 FOR UPDATE`,
        [input.pageId],
      );
      const page = route.rows[0];
      if (!page) throw new Error("REALTIME_PAGE_NOT_FOUND");
      if (!(page.transaction_now instanceof Date) || !Number.isFinite(page.transaction_now.getTime())) {
        throw new Error("REALTIME_TRANSACTION_CLOCK_INVALID");
      }
      const transactionNow = page.transaction_now;
      let currentSourceMessageIdHash: string | null = null;
      if (input.inboxBatchGuard) {
        const current = await this.lockCurrentInboxBatch(
          client,
          input,
          input.inboxBatchGuard,
        );
        if (!current.current) {
          await this.releaseSupersededInboxBatch(
            client,
            input,
            input.inboxBatchGuard,
          );
          return {
            stateCommitted: false,
            metaOutboxCreated: 0,
            pancakeTagOutboxCreated: false,
            handoffEventCreated: false,
            sendAuthorized: false,
            reasonCodes: ["INBOX_BATCH_SUPERSEDED"],
            inboxBatchStatus: "SUPERSEDED",
          };
        }
        currentSourceMessageIdHash = current.sourceMessageIdHash;
      }
      const before = await client.query<{
        conversation_owner: "BOT" | "HUMAN";
      }>(
        `SELECT conversation_owner
         FROM conversations
         WHERE conversation_id = $1
           AND page_id = $2
           AND customer_hash = $3
           AND state_version = $4
         FOR UPDATE`,
        [
          input.conversationId,
          input.pageId,
          input.customerHash,
          input.expectedStateVersion,
        ],
      );
      const ownerBefore = before.rows[0]?.conversation_owner;
      if (!ownerBefore) throw new Error("STATE_REVISION_CONFLICT");
      validateMetaEffectReadiness(input, transactionNow, currentSourceMessageIdHash);
      if (input.salesCyclePlan) {
        validateSalesEffectReadiness(input, transactionNow, currentSourceMessageIdHash);
        await this.commitSalesCyclePlan(
          client,
          input.pageId,
          input.conversationId,
          input.salesCyclePlan,
          transactionNow,
          currentSourceMessageIdHash,
        );
      }
      const stateRevision = this.stateNumber(
        input.state,
        "revision",
        input.expectedStateVersion + 1,
      );
      if (stateRevision <= input.expectedStateVersion) {
        throw new Error("STATE_REVISION_INCREMENT_REQUIRED");
      }
      const updated = await client.query(
        `UPDATE conversations
         SET state_version = $4,
             state_snapshot = $5::jsonb,
             routing_owner = $6,
             conversation_owner = $7,
             owner_lease_until = $8,
             blocking_tag = $9,
             blocking_tag_verified_at = $10,
             updated_at = $11::timestamptz,
             expires_at = $11::timestamptz + interval '20 days'
         WHERE conversation_id = $1
           AND page_id = $2
           AND customer_hash = $3
           AND state_version = $12`,
        [
          input.conversationId,
          input.pageId,
          input.customerHash,
          stateRevision,
          JSON.stringify(input.state),
          this.stateString(input.state, "routingOwner", "N8N"),
          this.stateString(input.state, "conversationOwner", "BOT"),
          this.stateNullableString(input.state, "ownerLeaseUntil"),
          this.stateNullableString(input.state, "blockingTag"),
          this.stateNullableString(input.state, "blockingTagVerifiedAt"),
          now,
          input.expectedStateVersion,
        ],
      );
      if (updated.rowCount !== 1) {
        throw new Error("STATE_REVISION_CONFLICT");
      }

      const reasonCodes: string[] = [];
      const sendAuthorized =
        page.routing_owner === "APP" &&
        page.app_send_enabled &&
        !page.kill_switch;
      if (page.routing_owner !== "APP") reasonCodes.push("PAGE_ROUTE_NOT_APP");
      if (!page.app_send_enabled) reasonCodes.push("PAGE_SEND_DISABLED");
      if (page.kill_switch) reasonCodes.push("PAGE_KILL_SWITCH_ACTIVE");

      let metaOutboxCreated = 0;
      if (input.metaPlan && sendAuthorized) {
        metaOutboxCreated = await this.insertMetaPlan(
          client,
          input,
          input.metaPlan,
          now,
        );
      } else if (input.metaPlan) {
        reasonCodes.push("META_PLAN_SUPPRESSED");
      }

      if (input.acquisitionPlan) {
        await commitAcquisitionPlan(client, {
          pageId: input.pageId,
          conversationId: input.conversationId,
          customerHash: input.customerHash,
          plan: {
            ...input.acquisitionPlan,
            replyPlanId: input.metaPlan && sendAuthorized
              ? input.acquisitionPlan.replyPlanId
              : null,
          },
        });
      }

      let pancakeTagOutboxCreated = false;
      if (input.pancakeTagPlan) {
        pancakeTagOutboxCreated = await this.insertPancakeTagPlan(
          client,
          input,
          input.pancakeTagPlan,
        );
        if (!pancakeTagOutboxCreated) {
          reasonCodes.push("PANCAKE_CONVERSATION_LINK_MISSING");
        }
      }

      const ownerAfter = this.stateString(
        input.state,
        "conversationOwner",
        ownerBefore,
      );
      let handoffEventCreated = false;
      if (
        input.handoffEventPlan &&
        ownerBefore === "BOT" &&
        ownerAfter === "HUMAN"
      ) {
        handoffEventCreated = await this.insertHandoffEvent(
          client,
          input,
          input.handoffEventPlan,
          ownerBefore,
          ownerAfter,
        );
      }
      if (input.handoffAcknowledgementPlan && ownerBefore === "HUMAN") {
        await this.acknowledgeActiveHandoff(
          client,
          input.conversationId,
          input.handoffAcknowledgementPlan,
        );
      }

      const decisionEventsCreated = input.decisionEvents
        ? await this.insertDecisionEvents(client, input, input.decisionEvents)
        : 0;
      const contextV2CaptureCreated = input.contextV2CapturePlan
        ? await insertContextV2Capture(
            client,
            {
              conversationId: input.conversationId,
              pageId: input.pageId,
              customerHash: input.customerHash,
              owner: this.stateString(
                input.state,
                "conversationOwner",
                ownerBefore,
              ) as "BOT" | "HUMAN",
            },
            input.contextV2CapturePlan,
          )
        : false;

      if (input.inboxBatchGuard) {
        await this.completeInboxBatch(
          client,
          input,
          input.inboxBatchGuard,
          now,
        );
      }

      return {
        stateCommitted: true,
        metaOutboxCreated,
        pancakeTagOutboxCreated,
        handoffEventCreated,
        decisionEventsCreated,
        contextV2CaptureCreated,
        sendAuthorized,
        reasonCodes,
        inboxBatchStatus: input.inboxBatchGuard
          ? "COMMITTED"
          : "NOT_REQUESTED",
      };
    });
  }

  async linkProviderConversation(
    pageId: string,
    conversationId: string,
    provider: "META" | "PANCAKE",
    externalId: string,
    verifiedAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    const aad = this.providerLinkAad(pageId, conversationId, provider);
    const encrypted = this.cipher.encryptValue(externalId, aad);
    await this.pool.query(
      `INSERT INTO provider_conversation_links (
         page_id, conversation_id, provider, external_id_hash,
         external_id_ciphertext, external_id_nonce, external_id_auth_tag,
         verified_at, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (page_id, conversation_id, provider) DO UPDATE SET
         external_id_hash = EXCLUDED.external_id_hash,
         external_id_ciphertext = EXCLUDED.external_id_ciphertext,
         external_id_nonce = EXCLUDED.external_id_nonce,
         external_id_auth_tag = EXCLUDED.external_id_auth_tag,
         verified_at = EXCLUDED.verified_at,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`,
      [
        pageId,
        conversationId,
        provider,
        this.cipher.fingerprint(externalId, `provider-link:${provider}`),
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.authTag,
        verifiedAt,
        expiresAt,
      ],
    );
  }

  async claimMetaOutbox(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedMetaOutbox | null> {
    const result = await this.pool.query<MetaOutboxRow>(
       `WITH candidate AS (
         SELECT outbox.outbox_id
         FROM meta_outbox AS outbox
         JOIN pages AS page ON page.page_id = outbox.page_id
         JOIN conversations AS conversation
           ON conversation.conversation_id = outbox.conversation_id
         WHERE outbox.status IN ('PENDING', 'RETRYABLE')
           AND (outbox.next_attempt_at IS NULL OR outbox.next_attempt_at <= now())
           AND page.routing_owner = 'APP'
           AND page.app_send_enabled = true
           AND page.kill_switch = false
           AND (
             conversation.conversation_owner = 'BOT'
             OR outbox.send_after_owner_handoff = true
           )
           AND conversation.blocking_tag IS NULL
           AND NOT EXISTS (
             SELECT 1
             FROM meta_outbox AS prior
             WHERE prior.reply_plan_id = outbox.reply_plan_id
               AND prior.sequence_no < outbox.sequence_no
               AND prior.status NOT IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')
           )
         ORDER BY outbox.created_at, outbox.sequence_no
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE meta_outbox AS outbox
       SET status = 'SENDING',
           attempt_count = attempt_count + 1,
           lease_owner = $1,
           lease_token = gen_random_uuid(),
           lease_until = now() + ($2::integer * interval '1 millisecond'),
           request_started_at = now(),
           updated_at = now()
       FROM candidate
       WHERE outbox.outbox_id = candidate.outbox_id
       RETURNING
         outbox.outbox_id, outbox.page_id, outbox.conversation_id,
         outbox.reply_plan_id, outbox.response_group_id,
         outbox.sequence_no, outbox.attempt_count, outbox.lease_token,
         outbox.recipient_ciphertext, outbox.recipient_nonce,
         outbox.recipient_auth_tag, outbox.payload_ciphertext,
         outbox.payload_nonce, outbox.payload_auth_tag,
         outbox.payload_encrypted_dek, outbox.payload_key_ref,
         outbox.payload_expires_at,
         (
           SELECT external_id_ciphertext
           FROM provider_conversation_links
           WHERE page_id = outbox.page_id
             AND conversation_id = outbox.conversation_id
             AND provider = 'PANCAKE'
             AND expires_at > now()
         ) AS pancake_conversation_ciphertext,
         (
           SELECT external_id_nonce
           FROM provider_conversation_links
           WHERE page_id = outbox.page_id
             AND conversation_id = outbox.conversation_id
             AND provider = 'PANCAKE'
             AND expires_at > now()
         ) AS pancake_conversation_nonce,
         (
           SELECT external_id_auth_tag
           FROM provider_conversation_links
           WHERE page_id = outbox.page_id
             AND conversation_id = outbox.conversation_id
             AND provider = 'PANCAKE'
             AND expires_at > now()
         ) AS pancake_conversation_auth_tag`,
      [workerId, leaseMs],
    );
    const row = result.rows[0];
    if (!row) return null;
    const recipient = this.cipher.decryptValue(
      {
        ciphertext: row.recipient_ciphertext,
        nonce: row.recipient_nonce,
        authTag: row.recipient_auth_tag,
      },
      this.metaRecipientAad(row.page_id, row.outbox_id),
    );
    const payload = this.cipher.decryptJson<RealtimeMetaMessageUnit>(
      this.bundleFromMetaRow(row),
      this.metaPayloadAad(row.page_id, row.outbox_id),
    );
    const pancakeConversationId =
      row.pancake_conversation_ciphertext &&
      row.pancake_conversation_nonce &&
      row.pancake_conversation_auth_tag
        ? this.cipher.decryptValue(
            {
              ciphertext: row.pancake_conversation_ciphertext,
              nonce: row.pancake_conversation_nonce,
              authTag: row.pancake_conversation_auth_tag,
            },
            this.providerLinkAad(
              row.page_id,
              row.conversation_id,
              "PANCAKE",
            ),
          )
        : null;
    return {
      outboxId: row.outbox_id,
      leaseToken: row.lease_token,
      pageId: row.page_id,
      conversationId: row.conversation_id,
      replyPlanId: row.reply_plan_id,
      responseGroupId: row.response_group_id,
      sequenceNo: row.sequence_no,
      recipientId: recipient,
      pancakeConversationId,
      message: payload,
      attemptCount: row.attempt_count,
    };
  }

  async readMetaResponseGroupGate(
    responseGroupId: string,
  ): Promise<MetaResponseGroupGateSnapshot | null> {
    const result = await this.pool.query<MetaResponseGroupGateRow>(
      `SELECT response_group_id, source, status, reason_code, blocking_tag,
              observed_at, attempt_count, expires_at
       FROM meta_response_group_gates
       WHERE response_group_id = $1`,
      [responseGroupId],
    );
    const row = result.rows[0];
    return row ? this.metaResponseGroupGateSnapshot(row) : null;
  }

  async recordMetaResponseGroupGate(input: {
    readonly responseGroupId: string;
    readonly replyPlanId: string;
    readonly conversationId: string;
    readonly pageId: string;
    readonly observation: MetaResponseGroupGateObservation;
  }): Promise<MetaResponseGroupGateSnapshot> {
    const reasonCode = input.observation.reasonCode?.slice(0, 128) ?? null;
    const result = await this.pool.query<MetaResponseGroupGateRow>(
      `INSERT INTO meta_response_group_gates (
         response_group_id, reply_plan_id, conversation_id, page_id,
         status, reason_code, blocking_tag, observed_at, source, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PANCAKE',now() + interval '5 minutes')
       ON CONFLICT (response_group_id) DO UPDATE
       SET status = CASE
             WHEN meta_response_group_gates.status = 'UNVERIFIED'
               THEN EXCLUDED.status
             ELSE meta_response_group_gates.status
           END,
           reason_code = CASE
             WHEN meta_response_group_gates.status = 'UNVERIFIED'
               THEN EXCLUDED.reason_code
             ELSE meta_response_group_gates.reason_code
           END,
           blocking_tag = CASE
             WHEN meta_response_group_gates.status = 'UNVERIFIED'
               THEN EXCLUDED.blocking_tag
             ELSE meta_response_group_gates.blocking_tag
           END,
           observed_at = CASE
             WHEN meta_response_group_gates.status = 'UNVERIFIED'
               THEN EXCLUDED.observed_at
             ELSE meta_response_group_gates.observed_at
           END,
           expires_at = CASE
             WHEN meta_response_group_gates.status = 'UNVERIFIED'
               THEN EXCLUDED.expires_at
             ELSE meta_response_group_gates.expires_at
           END,
           attempt_count = meta_response_group_gates.attempt_count + 1,
           updated_at = now()
       RETURNING response_group_id, source, status, reason_code, blocking_tag,
                 observed_at, attempt_count, expires_at`,
      [
        input.responseGroupId,
        input.replyPlanId,
        input.conversationId,
        input.pageId,
        input.observation.status,
        reasonCode,
        input.observation.blockingTag,
        input.observation.observedAt,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("META_RESPONSE_GROUP_GATE_NOT_RECORDED");
    return this.metaResponseGroupGateSnapshot(row);
  }

  private metaResponseGroupGateSnapshot(
    row: MetaResponseGroupGateRow,
  ): MetaResponseGroupGateSnapshot {
    return {
      responseGroupId: row.response_group_id,
      source: row.source,
      status: row.status,
      reasonCode: row.reason_code,
      blockingTag: row.blocking_tag,
      observedAt: row.observed_at,
      attemptCount: row.attempt_count,
      expiresAt: row.expires_at,
    };
  }

  async markMetaAccepted(
    outboxId: string,
    leaseToken: string,
    providerMessageId: string,
  ): Promise<boolean> {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query<{
        prior_error_code: string | null;
        attempt_count: number;
      }>(
        `WITH candidate AS (
           SELECT outbox_id, last_error_code AS prior_error_code, attempt_count
           FROM meta_outbox
           WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2
           FOR UPDATE
         )
         UPDATE meta_outbox AS outbox
         SET status = 'SENT_ACCEPTED', meta_message_id = $3,
             accepted_at = now(), last_error_code = NULL,
             next_attempt_at = NULL,
             lease_owner = NULL, lease_token = NULL,
             lease_until = NULL, updated_at = now()
         FROM candidate
         WHERE outbox.outbox_id = candidate.outbox_id
         RETURNING candidate.prior_error_code, candidate.attempt_count`,
        [outboxId, leaseToken, providerMessageId],
      );
      const row = result.rows[0];
      if (!row) return false;
      if (row.prior_error_code) {
        await client.query(
          `INSERT INTO audit_log (
             actor_type, actor_id, action, resource_type, resource_id_hash,
             metadata_safe, correlation_id, entry_hash
           ) VALUES (
             'SERVICE','meta-outbox-runtime','META_OUTBOX_ACCEPTED_AFTER_RETRY',
             'META_OUTBOX',encode(digest($1, 'sha256'), 'hex'),$2::jsonb,
             gen_random_uuid(),digest('', 'sha256')
           )`,
          [
            outboxId,
            JSON.stringify({
              attempt_count: row.attempt_count,
              cleared_error_code: row.prior_error_code,
            }),
          ],
        );
      }
      return true;
    });
  }

  async markMetaRetryable(
    outboxId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE meta_outbox
       SET status = 'RETRYABLE',
           next_attempt_at = now() + ($3::integer * interval '1 second'),
           last_error_code = $4, lease_owner = NULL, lease_token = NULL,
           lease_until = NULL, updated_at = now()
       WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2`,
      [
        outboxId,
        leaseToken,
        Math.max(1, Math.min(3_600, Math.trunc(delaySeconds))),
        errorCode.slice(0, 128),
      ],
    );
    return result.rowCount === 1;
  }

  async markMetaTerminal(
    outboxId: string,
    leaseToken: string,
    status: "AMBIGUOUS" | "FAILED_PERMANENT",
    errorCode: string,
  ): Promise<boolean> {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query<{
        reply_plan_id: string;
        sequence_no: number;
        updated_at: Date;
      }>(
        `UPDATE meta_outbox
         SET status = $3,
             ambiguity_reason = CASE WHEN $3 = 'AMBIGUOUS' THEN $4 ELSE NULL END,
             last_error_code = $4, lease_owner = NULL, lease_token = NULL,
             lease_until = NULL, updated_at = now()
         WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2
         RETURNING reply_plan_id, sequence_no, updated_at`,
        [outboxId, leaseToken, status, errorCode.slice(0, 128)],
      );
      const row = result.rows[0];
      if (!row) return false;
      await client.query(
        `UPDATE meta_outbox
         SET status = 'MANUAL_REVIEW',
             last_error_code = $3,
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             updated_at = now()
         WHERE reply_plan_id = $1
           AND sequence_no > $2
           AND status IN ('PENDING', 'RETRYABLE')`,
        [
          row.reply_plan_id,
          row.sequence_no,
          `META_PREDECESSOR_${status}`,
        ],
      );
      await recordInitialReplySendFailed(client, {
        replyPlanId: row.reply_plan_id,
        outboxId,
        sequenceNo: row.sequence_no,
        failedAt: row.updated_at,
        terminalStatus: status,
      });
      return true;
    });
  }

  async markMetaManualReview(
    outboxId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean> {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query<{
        reply_plan_id: string;
        sequence_no: number;
      }>(
        `UPDATE meta_outbox
         SET status = 'MANUAL_REVIEW',
             last_error_code = $3, lease_owner = NULL, lease_token = NULL,
             lease_until = NULL, updated_at = now()
         WHERE outbox_id = $1 AND status = 'SENDING' AND lease_token = $2
         RETURNING reply_plan_id, sequence_no`,
        [outboxId, leaseToken, errorCode.slice(0, 128)],
      );
      const row = result.rows[0];
      if (!row) return false;
      await client.query(
        `UPDATE meta_outbox
         SET status = 'MANUAL_REVIEW',
             last_error_code = 'META_PREDECESSOR_MANUAL_REVIEW',
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             updated_at = now()
         WHERE reply_plan_id = $1
           AND sequence_no > $2
           AND status IN ('PENDING', 'RETRYABLE')`,
        [row.reply_plan_id, row.sequence_no],
      );
      return true;
    });
  }

  async quarantineExpiredMetaSending(): Promise<number> {
    const result = await this.pool.query<{ quarantined_count: string }>(
      `WITH expired AS (
         UPDATE meta_outbox
         SET status = 'AMBIGUOUS',
             ambiguity_reason = 'META_SENDING_LEASE_EXPIRED',
             last_error_code = 'META_SENDING_LEASE_EXPIRED',
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             updated_at = now()
         WHERE status = 'SENDING'
           AND lease_until IS NOT NULL
           AND lease_until <= now()
         RETURNING reply_plan_id, sequence_no
       ), held AS (
         UPDATE meta_outbox AS descendant
         SET status = 'MANUAL_REVIEW',
             last_error_code = 'META_PREDECESSOR_AMBIGUOUS',
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             updated_at = now()
         FROM expired
         WHERE descendant.reply_plan_id = expired.reply_plan_id
           AND descendant.sequence_no > expired.sequence_no
           AND descendant.status IN ('PENDING', 'RETRYABLE')
         RETURNING descendant.outbox_id
       )
       SELECT count(*)::text AS quarantined_count FROM expired`,
    );
    return Number(result.rows[0]?.quarantined_count ?? 0);
  }

  async cancelMetaResponseGroup(
    responseGroupId: string,
    actorRef: string,
    reasonCode: string,
  ): Promise<MetaOutboxOperatorCancelResult | null> {
    if (!/^[A-Z0-9_:-]{3,128}$/u.test(reasonCode)) {
      throw new Error("META_OUTBOX_OPERATOR_REASON_CODE_INVALID");
    }
    return withTransaction(this.pool, async (client) => {
      const current = await client.query<{
        page_id: string;
        reviewable: boolean;
        already_cancelled: boolean;
      }>(
        `SELECT page_id,
                bool_or(status IN ('MANUAL_REVIEW', 'AMBIGUOUS')) AS reviewable,
                bool_or(
                  last_error_code = 'OPERATOR_CANCELLED_MANUAL_REVIEW'
                ) AS already_cancelled
         FROM meta_outbox
         WHERE response_group_id = $1
         GROUP BY page_id`,
        [responseGroupId],
      );
      const row = current.rows[0];
      if (!row) return null;
      const pageId = row.page_id;
      if (!row.reviewable && !row.already_cancelled) {
        throw new Error("META_OUTBOX_RESPONSE_GROUP_NOT_MANUAL_REVIEW");
      }
      const updated = row.reviewable
        ? await client.query(
            `UPDATE meta_outbox
         SET status = 'FAILED_PERMANENT',
             last_error_code = 'OPERATOR_CANCELLED_MANUAL_REVIEW',
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             updated_at = now()
         WHERE response_group_id = $1
           AND status IN (
             'PENDING', 'RETRYABLE', 'MANUAL_REVIEW', 'AMBIGUOUS'
           )`,
            [responseGroupId],
          )
        : { rowCount: 0 };
      const cancelledCount = updated.rowCount ?? 0;
      if (cancelledCount > 0) {
        await client.query(
          `INSERT INTO audit_log (
             actor_type, actor_id, action, resource_type, resource_id_hash,
             metadata_safe, correlation_id, entry_hash
           ) VALUES (
             'USER',$1,'META_RESPONSE_GROUP_CANCELLED','META_RESPONSE_GROUP',
             encode(digest($2, 'sha256'), 'hex'),$3::jsonb,gen_random_uuid(),
             digest('', 'sha256')
           )`,
          [
            actorRef.slice(0, 256),
            responseGroupId,
            JSON.stringify({
              page_id: pageId,
              cancelled_count: cancelledCount,
              reason_code: reasonCode,
            }),
          ],
        );
      }
      return {
        responseGroupId,
        pageId,
        cancelledCount,
        changed: cancelledCount > 0,
      };
    });
  }

  async readMetaOutboxHealth(pageId: string): Promise<MetaOutboxHealthSnapshot> {
    const result = await this.pool.query<{
      actionable_count: string;
      sending_count: string;
      expired_sending_count: string;
      manual_review_count: string;
      stuck_descendant_count: string;
      oldest_actionable_age_seconds: string | null;
      oldest_manual_review_age_seconds: string | null;
    }>(
      `SELECT
         count(*) FILTER (
           WHERE outbox.status IN ('PENDING', 'RETRYABLE')
         )::text AS actionable_count,
         count(*) FILTER (
           WHERE outbox.status = 'SENDING'
         )::text AS sending_count,
         count(*) FILTER (
           WHERE outbox.status = 'SENDING'
             AND outbox.lease_until IS NOT NULL
             AND outbox.lease_until <= now()
         )::text AS expired_sending_count,
         count(*) FILTER (
           WHERE outbox.status = 'MANUAL_REVIEW'
         )::text AS manual_review_count,
         count(*) FILTER (
           WHERE outbox.status IN ('PENDING', 'RETRYABLE')
             AND EXISTS (
               SELECT 1
               FROM meta_outbox AS prior
               WHERE prior.reply_plan_id = outbox.reply_plan_id
                 AND prior.sequence_no < outbox.sequence_no
                 AND prior.status IN (
                   'FAILED_PERMANENT', 'AMBIGUOUS', 'MANUAL_REVIEW'
                 )
             )
         )::text AS stuck_descendant_count,
         extract(epoch FROM now() - min(outbox.created_at) FILTER (
           WHERE outbox.status IN ('PENDING', 'RETRYABLE')
         ))::text AS oldest_actionable_age_seconds,
         extract(epoch FROM now() - min(outbox.updated_at) FILTER (
           WHERE outbox.status = 'MANUAL_REVIEW'
         ))::text AS oldest_manual_review_age_seconds
       FROM meta_outbox AS outbox
       WHERE outbox.page_id = $1`,
      [pageId],
    );
    const row = result.rows[0];
    const nullableNumber = (value: string | null | undefined): number | null =>
      value === null || value === undefined ? null : Number(value);
    return {
      pageId,
      actionableCount: Number(row?.actionable_count ?? 0),
      sendingCount: Number(row?.sending_count ?? 0),
      expiredSendingCount: Number(row?.expired_sending_count ?? 0),
      manualReviewCount: Number(row?.manual_review_count ?? 0),
      stuckDescendantCount: Number(row?.stuck_descendant_count ?? 0),
      oldestActionableAgeSeconds: nullableNumber(
        row?.oldest_actionable_age_seconds,
      ),
      oldestManualReviewAgeSeconds: nullableNumber(
        row?.oldest_manual_review_age_seconds,
      ),
    };
  }
  async claimPancakeTagOutbox(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedPancakeTagOutbox | null> {
    const result = await this.pool.query<PancakeTagOutboxRow>(
      `WITH candidate AS (
         SELECT operation_id
         FROM pancake_tag_outbox
         WHERE ((
           status IN ('PENDING', 'RETRYABLE')
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
         ) OR (
           status = 'APPLYING'
           AND lease_until IS NOT NULL
           AND lease_until <= now()
         ))
           AND (
             after_response_group_id IS NULL
             OR NOT EXISTS (
               SELECT 1
               FROM meta_outbox AS dependency
               WHERE dependency.response_group_id =
                 pancake_tag_outbox.after_response_group_id
                 AND dependency.status IN ('PENDING', 'RETRYABLE', 'SENDING')
             )
           )
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE pancake_tag_outbox AS outbox
       SET status = 'APPLYING',
           attempt_count = attempt_count + 1,
           lease_owner = $1,
           lease_token = gen_random_uuid(),
           lease_until = now() + ($2::integer * interval '1 millisecond'),
           updated_at = now()
       FROM candidate
       WHERE outbox.operation_id = candidate.operation_id
       RETURNING
         outbox.operation_id, outbox.page_id, outbox.conversation_id,
         outbox.desired_tag, outbox.operation, outbox.pancake_tag_id,
         outbox.attempt_count,
         outbox.lease_token, outbox.pancake_conversation_ciphertext,
         outbox.pancake_conversation_nonce,
         outbox.pancake_conversation_auth_tag`,
      [workerId, leaseMs],
    );
    const row = result.rows[0];
    if (!row) return null;
    const pancakeConversationId = this.cipher.decryptValue(
      {
        ciphertext: row.pancake_conversation_ciphertext,
        nonce: row.pancake_conversation_nonce,
        authTag: row.pancake_conversation_auth_tag,
      },
      this.providerLinkAad(
        row.page_id,
        row.conversation_id,
        "PANCAKE",
      ),
    );
    return {
      operationId: row.operation_id,
      leaseToken: row.lease_token,
      pageId: row.page_id,
      conversationId: row.conversation_id,
      pancakeConversationId,
      desiredTag: row.desired_tag,
      operation: row.operation,
      tagId: row.pancake_tag_id,
      attemptCount: row.attempt_count,
    };
  }

  async markPancakeTagApplied(
    operationId: string,
    leaseToken: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE pancake_tag_outbox
       SET status = 'APPLIED', applied_at = now(),
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           last_error_code = NULL, updated_at = now()
       WHERE operation_id = $1
         AND status = 'APPLYING'
         AND lease_token = $2`,
      [operationId, leaseToken],
    );
    return result.rowCount === 1;
  }

  async markPancakeTagRetryable(
    operationId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE pancake_tag_outbox
       SET status = 'RETRYABLE',
           next_attempt_at = now() + ($3::integer * interval '1 second'),
           last_error_code = $4,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           updated_at = now()
       WHERE operation_id = $1
         AND status = 'APPLYING'
         AND lease_token = $2`,
      [
        operationId,
        leaseToken,
        Math.max(1, Math.min(3_600, Math.trunc(delaySeconds))),
        errorCode.slice(0, 128),
      ],
    );
    return result.rowCount === 1;
  }

  async markPancakeTagPermanent(
    operationId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE pancake_tag_outbox
       SET status = 'FAILED_PERMANENT', last_error_code = $3,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           updated_at = now()
       WHERE operation_id = $1
         AND status = 'APPLYING'
         AND lease_token = $2`,
      [operationId, leaseToken, errorCode.slice(0, 128)],
    );
    return result.rowCount === 1;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async lockCurrentInboxBatch<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    guard: RealtimeInboxBatchGuard,
  ): Promise<Readonly<{ current: boolean; sourceMessageIdHash: string | null }>> {
    if (
      !Number.isSafeInteger(guard.generation) ||
      guard.generation <= 0 ||
      !guard.leaseToken.trim() ||
      guard.inboxIds.length === 0 || new Set(guard.inboxIds).size !== guard.inboxIds.length
    ) {
      throw new Error("INBOX_BATCH_GUARD_INVALID");
    }
    const current = await client.query<{ generation: string }>(
      `SELECT generation
       FROM conversation_ingress_heads
       WHERE page_id = $1 AND conversation_hash = $2
         AND lease_token = $3
       FOR UPDATE`,
      [input.pageId, input.customerHash, guard.leaseToken],
    );
    if (Number(current.rows[0]?.generation) !== guard.generation) {
      return { current: false, sourceMessageIdHash: null };
    }
    const sources = await client.query<{ source_message_id: string }>(
      `SELECT COALESCE(provider_message_id, event_key) AS source_message_id
       FROM webhook_inbox
       WHERE inbox_id = ANY($1::uuid[])
         AND page_id = $2 AND conversation_hash = $3
         AND status = 'PROCESSING' AND lease_token = $4
       ORDER BY receive_sequence DESC`,
      [guard.inboxIds, input.pageId, input.customerHash, guard.leaseToken],
    );
    if (sources.rowCount !== guard.inboxIds.length) {
      return { current: false, sourceMessageIdHash: null };
    }
    if (typeof sources.rows[0]?.source_message_id !== "string" ||
      sources.rows[0].source_message_id.length === 0) {
      throw new Error("INBOX_BATCH_SOURCE_BINDING_INVALID");
    }
    return {
      current: true,
      sourceMessageIdHash: sha256TextV1(sources.rows[0].source_message_id),
    };
  }

  private async releaseSupersededInboxBatch<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    guard: RealtimeInboxBatchGuard,
  ): Promise<void> {
    await client.query(
      `UPDATE webhook_inbox
       SET status = 'VERIFIED',
           attempt_count = GREATEST(attempt_count - 1, 0),
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           next_attempt_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE inbox_id = ANY($1::uuid[])
         AND status = 'PROCESSING' AND lease_token = $2`,
      [guard.inboxIds, guard.leaseToken],
    );
    await client.query(
      `UPDATE conversation_ingress_heads
       SET lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           attempt_count = GREATEST(attempt_count - 1, 0),
           next_attempt_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE page_id = $1 AND conversation_hash = $2 AND lease_token = $3`,
      [input.pageId, input.customerHash, guard.leaseToken],
    );
  }

  private async completeInboxBatch<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    guard: RealtimeInboxBatchGuard,
    now: Date,
  ): Promise<void> {
    const completed = await client.query(
      `UPDATE webhook_inbox
       SET status = 'PROCESSED', processed_at = $3,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           next_attempt_at = NULL, last_error_code = NULL, updated_at = $3
       WHERE inbox_id = ANY($1::uuid[])
         AND status = 'PROCESSING' AND lease_token = $2`,
      [guard.inboxIds, guard.leaseToken, now],
    );
    if (completed.rowCount !== guard.inboxIds.length) {
      throw new Error("INBOX_BATCH_LEASE_LOST");
    }
    const released = await client.query(
      `UPDATE conversation_ingress_heads AS head
       SET lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           attempt_count = 0,
           last_customer_receive_sequence = CASE
             WHEN NOT EXISTS (
               SELECT 1 FROM webhook_inbox AS pending
               WHERE pending.page_id = head.page_id
                 AND pending.conversation_hash = head.conversation_hash
                 AND pending.event_kind = 'CUSTOMER'
                 AND pending.status IN (
                   'VERIFIED', 'QUEUED', 'PROCESSING', 'FAILED_RETRYABLE'
                 )
             ) THEN NULL
             ELSE head.last_customer_receive_sequence
           END,
           quiet_until = CASE
             WHEN NOT EXISTS (
               SELECT 1 FROM webhook_inbox AS pending
               WHERE pending.page_id = head.page_id
                 AND pending.conversation_hash = head.conversation_hash
                 AND pending.event_kind = 'CUSTOMER'
                 AND pending.status IN (
                   'VERIFIED', 'QUEUED', 'PROCESSING', 'FAILED_RETRYABLE'
                 )
             ) THEN NULL
             ELSE head.quiet_until
           END,
           next_attempt_at = NULL, last_error_code = NULL, updated_at = $4
       WHERE head.page_id = $1 AND head.conversation_hash = $2
         AND head.lease_token = $3 AND head.generation = $5`,
      [
        input.pageId,
        input.customerHash,
        guard.leaseToken,
        now,
        guard.generation,
      ],
    );
    if (released.rowCount !== 1) {
      throw new Error("INBOX_BATCH_LEASE_LOST");
    }
  }

  private async insertDecisionEvents<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    events: readonly RealtimeDecisionEventPlan[],
  ): Promise<number> {
    let created = 0;
    for (const event of events) {
      const result = await client.query(
        `INSERT INTO conversation_events (
           event_id, conversation_id, page_id, customer_hash, event_type,
           intent, stage, action, handoff_reason, owner, product_id,
           prompt_version, model_version, policy_version, catalog_version,
           event_metadata, occurred_at
         ) VALUES (
           $1::uuid, $2::uuid, $3, $4, $5,
           $6, $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16::jsonb, $17
         )
         ON CONFLICT (event_id, occurred_at) DO NOTHING`,
        [
          event.eventId,
          input.conversationId,
          input.pageId,
          input.customerHash,
          event.eventType,
          event.intent,
          event.stage,
          event.action,
          event.eventType === "HANDOFF" ? event.reasonCodes[0] ?? null : null,
          this.stateString(input.state, "conversationOwner", "BOT"),
          event.productId,
          event.promptVersion,
          event.modelVersion,
          event.policyVersion,
          event.catalogVersion,
          JSON.stringify({
            schemaVersion: 1,
            eventKeyHash: event.eventKeyHash,
            origin: event.origin,
            reasonCodes: event.reasonCodes,
            releaseId: event.releaseId,
            mode: event.mode,
            ...event.details,
          }),
          event.occurredAt,
        ],
      );
      created += result.rowCount ?? 0;
    }
    return created;
  }

  private async selectConversation<TState>(
    client: PoolClient,
    pageId: string,
    customerHash: string,
    forUpdate: boolean,
  ): Promise<RealtimeConversationRecord<TState> | null> {
    const result = await client.query<ConversationRow>(
      `SELECT
         c.conversation_id, c.page_id, c.customer_hash, c.state_version,
         c.state_snapshot, p.routing_owner, p.app_send_enabled, p.kill_switch
       FROM conversations c
       JOIN pages p ON p.page_id = c.page_id
       WHERE c.page_id = $1 AND c.customer_hash = $2
       ${forUpdate ? "FOR UPDATE OF c" : ""}`,
      [pageId, customerHash],
    );
    const row = result.rows[0];
    return row
      ? {
          conversationId: row.conversation_id,
          pageId: row.page_id,
          customerHash: row.customer_hash,
          stateVersion: Number(row.state_version),
          state: row.state_snapshot as TState,
          routingOwner: row.routing_owner,
          appSendEnabled: row.app_send_enabled,
          killSwitch: row.kill_switch,
        }
      : null;
  }

  private async insertMetaPlan<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    plan: RealtimeMetaPlan,
    now: Date,
  ): Promise<number> {
    let created = 0;
    for (let sequence = 0; sequence < plan.messages.length; sequence += 1) {
      const message = plan.messages[sequence];
      if (!message) continue;
      const outboxId = randomUUID();
      const recipient = this.cipher.encryptValue(
        plan.recipientId,
        this.metaRecipientAad(input.pageId, outboxId),
      );
      const payload = this.cipher.encryptJson(
        message,
        this.metaPayloadAad(input.pageId, outboxId),
        new Date(now.getTime() + 20 * 86_400_000),
      );
      const imageDelayMs = message.kind === "IMAGE"
        ? Math.max(0, Math.min(5_000, Math.trunc(plan.imageDelayMs ?? 0)))
        : 0;
      const result = await client.query(
        `INSERT INTO meta_outbox (
           outbox_id, idempotency_key, reply_plan_id, response_group_id,
           conversation_id, page_id, customer_hash,
           recipient_ciphertext, recipient_nonce, recipient_auth_tag,
           payload_ciphertext, payload_nonce, payload_auth_tag,
           payload_encrypted_dek, payload_key_ref, payload_expires_at,
           payload_fingerprint, sequence_no, next_attempt_at,
           send_after_owner_handoff
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
         )
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          outboxId,
          `meta:v2:${plan.replyPlanId}:${sequence}`,
          plan.replyPlanId,
          plan.responseGroupId,
          input.conversationId,
          input.pageId,
          input.customerHash,
          recipient.ciphertext,
          recipient.nonce,
          recipient.authTag,
          payload.ciphertext,
          payload.nonce,
          payload.authTag,
          payload.encryptedDek,
          payload.keyRef,
          payload.expiresAt,
          this.cipher.fingerprint(JSON.stringify(message), "meta-payload:v2"),
          sequence,
          new Date(now.getTime() + imageDelayMs),
          plan.sendAfterOwnerHandoff === true,
        ],
      );
      created += result.rowCount ?? 0;
    }
    return created;
  }

  private async insertPancakeTagPlan<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    plan: RealtimePancakeTagPlan,
  ): Promise<boolean> {
    const link = await client.query<{
      external_id_ciphertext: Buffer;
      external_id_nonce: Buffer;
      external_id_auth_tag: Buffer;
    }>(
      `SELECT external_id_ciphertext, external_id_nonce, external_id_auth_tag
       FROM provider_conversation_links
       WHERE page_id = $1 AND conversation_id = $2
         AND provider = 'PANCAKE' AND expires_at > now()`,
      [input.pageId, input.conversationId],
    );
    const external = link.rows[0];
    if (!external) return false;
    const result = await client.query(
      `INSERT INTO pancake_tag_outbox (
         operation_id, idempotency_key, page_id, conversation_id,
         desired_tag, pancake_tag_id, handoff_generation,
         pancake_conversation_ciphertext, pancake_conversation_nonce,
         pancake_conversation_auth_tag, after_response_group_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        randomUUID(),
        `pancake-tag:v2:${input.conversationId}:${plan.desiredTag}:${plan.handoffGeneration}`,
        input.pageId,
        input.conversationId,
        plan.desiredTag,
        plan.tagId,
        plan.handoffGeneration,
        external.external_id_ciphertext,
        external.external_id_nonce,
        external.external_id_auth_tag,
        plan.afterResponseGroupId ?? null,
      ],
    );
    return result.rowCount === 1;
  }

  private async commitSalesCyclePlan<TState>(
    client: PoolClient,
    pageId: string,
    conversationId: string,
    plan: RealtimeSalesCyclePlan<TState>,
    now: Date,
    currentSourceMessageIdHash: string | null,
  ): Promise<void> {
    if (
      Number.isNaN(plan.expiresAt.getTime()) ||
      plan.expiresAt.getTime() <= now.getTime() ||
      plan.expiresAt.getTime() > now.getTime() + CART_TTL_MS_V1 ||
      (plan.cartExpiresAt !== null &&
        (Number.isNaN(plan.cartExpiresAt.getTime()) ||
          plan.cartExpiresAt.getTime() > plan.expiresAt.getTime()))
    ) {
      throw new Error("SALES_CYCLE_EXPIRY_INVALID");
    }
    const locked = await client.query<SalesCycleRow>(
      `SELECT state_revision, conversation_id, page_id,
              state_ciphertext, state_nonce, state_auth_tag,
              state_encrypted_dek, state_key_ref, cart_expires_at, expires_at
       FROM sales_cycle_states
       WHERE conversation_id = $1 AND page_id = $2
       FOR UPDATE`,
      [conversationId, pageId],
    );
    const storedRevision = Number(locked.rows[0]?.state_revision ?? -1);
    if (storedRevision !== plan.expectedRevision) {
      throw new Error("SALES_CYCLE_STATE_REVISION_CONFLICT");
    }
    const lockedRow = locked.rows[0];
    if (lockedRow?.state_ciphertext) {
      const lockedState = this.salesCycleRecord<unknown>(lockedRow).state;
      validateLockedSalesStateEnvelopeV1(
        plan as RealtimeSalesCyclePlan<unknown>, lockedState, pageId, conversationId,
      );
      validateLockedCartExpiryBindingV1(
        plan as RealtimeSalesCyclePlan<unknown>, lockedState, lockedRow.cart_expires_at,
      );
      validateLockedProtectedSalesStateTransitionV1(
        plan as RealtimeSalesCyclePlan<unknown>, lockedState,
      );
      validateLockedProtectedSalesArtifactsV1(
        plan as RealtimeSalesCyclePlan<unknown>, lockedState, currentSourceMessageIdHash,
      );
      await validateLockedCartOpenTransitionV1(
        client, pageId, plan as RealtimeSalesCyclePlan<unknown>, lockedState, now,
      );
      validateLockedCartMutationTransitionV1(
        plan as RealtimeSalesCyclePlan<unknown>, lockedState, now,
      );
      validateLockedCanonicalCartTransitionV1(
        plan as RealtimeSalesCyclePlan<unknown>, lockedState, now,
      );
    } else {
      throw new Error("CART_MUTATION_LOCKED_STATE_REQUIRED");
    }
    const nextRevision = this.stateNumber(
      plan.state,
      "revision",
      plan.expectedRevision + 1,
    );
    if (nextRevision <= plan.expectedRevision) {
      throw new Error("SALES_CYCLE_REVISION_INCREMENT_REQUIRED");
    }
    const encrypted = this.cipher.encryptJson(
      plan.state,
      this.salesCycleAad(pageId, conversationId),
      plan.expiresAt,
    );
    const updated = await client.query(
      `UPDATE sales_cycle_states
       SET state_revision = $3,
           state_ciphertext = $4,
           state_nonce = $5,
           state_auth_tag = $6,
           state_encrypted_dek = $7,
           state_key_ref = $8,
           cart_expires_at = $9,
           expires_at = $10,
           updated_at = $11
       WHERE conversation_id = $1 AND page_id = $2 AND state_revision = $12`,
      [
        conversationId,
        pageId,
        nextRevision,
        encrypted.ciphertext,
        encrypted.nonce,
        encrypted.authTag,
        encrypted.encryptedDek,
        encrypted.keyRef,
        plan.cartExpiresAt,
        plan.expiresAt,
        now,
        plan.expectedRevision,
      ],
    );
    if (updated.rowCount !== 1) {
      throw new Error("SALES_CYCLE_STATE_REVISION_CONFLICT");
    }
    for (const event of plan.events) {
      if (
        event.stateRevisionAfter <= event.stateRevisionBefore ||
        event.stateRevisionBefore < plan.expectedRevision ||
        event.stateRevisionAfter > nextRevision
      ) {
        throw new Error("SALES_CYCLE_EVENT_REVISION_INVALID");
      }
      await client.query(
        `INSERT INTO sales_cycle_events (
           event_id, conversation_id, page_id, command_id_hash, command_kind,
           outcome, state_revision_before, state_revision_after, stage_before,
           stage_after, cart_id, cart_version, reason_code, occurred_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          randomUUID(),
          conversationId,
          pageId,
          this.cipher.fingerprint(event.commandId, "sales-cycle-command:v1"),
          event.commandKind,
          event.outcome,
          event.stateRevisionBefore,
          event.stateRevisionAfter,
          event.stageBefore,
          event.stageAfter,
          event.cartId,
          event.cartVersion,
          event.reasonCode,
          event.occurredAt,
        ],
      );
    }
  }

  private async insertHandoffEvent<TState>(
    client: PoolClient,
    input: RealtimeCommitInput<TState>,
    plan: RealtimeHandoffEventPlan,
    ownerBefore: "BOT" | "HUMAN",
    ownerAfter: "BOT" | "HUMAN",
  ): Promise<boolean> {
    const handoffId = randomUUID();
    const inserted = await client.query<{ handoff_id: string }>(
      `INSERT INTO handoff_events (
         handoff_id, page_id, conversation_id, direction, source,
         reason_code, reason_detail_safe, product_id, facts_status,
         facts_reason_code, desired_tag, owner_before, owner_after,
         handoff_generation, trigger_event_key_hash, trigger_message_pk,
         occurred_at
       ) VALUES (
         $1,$2,$3,'BOT_TO_HUMAN',$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,
         $13,$14,$15,$16
       )
       ON CONFLICT (
         conversation_id, direction, trigger_event_key_hash,
         handoff_generation
       ) DO NOTHING
       RETURNING handoff_id`,
      [
        handoffId,
        input.pageId,
        input.conversationId,
        plan.source,
        plan.reasonCode.trim().slice(0, 128) || "HANDOFF_REASON_UNKNOWN",
        JSON.stringify(plan.reasonDetailSafe ?? {}),
        plan.productId?.trim().slice(0, 128) || null,
        plan.factsStatus,
        plan.factsReasonCode?.trim().slice(0, 128) || null,
        plan.desiredTag,
        ownerBefore,
        ownerAfter,
        plan.handoffGeneration,
        this.cipher.fingerprint(plan.triggerEventKey, "handoff-trigger:v1"),
        plan.triggerMessagePk,
        plan.occurredAt,
      ],
    );
    const created = inserted.rows[0];
    if (!created) return false;
    await client.query(
      `INSERT INTO handoff_cases (
         opening_handoff_id, page_id, conversation_id, status, created_at,
         updated_at, sla_due_at
       ) VALUES (
         $1,$2,$3,'NEW',
         $4::timestamptz,$4::timestamptz,
         ($4::timestamptz + interval '30 minutes')
       )`,
      [created.handoff_id, input.pageId, input.conversationId, plan.occurredAt],
    );
    return true;
  }

  private async acknowledgeActiveHandoff(
    client: PoolClient,
    conversationId: string,
    plan: RealtimeHandoffAcknowledgementPlan,
  ): Promise<void> {
    await client.query(
      `UPDATE handoff_cases
       SET status = 'IN_PROGRESS',
           acknowledged_at = $2,
           acknowledged_by_ref = $3,
           updated_at = $2
       WHERE conversation_id = $1
         AND status = 'NEW'`,
      [
        conversationId,
        plan.occurredAt,
        this.cipher.fingerprint(plan.actorRef, "handoff-actor:v1"),
      ],
    );
  }

  private bundleFromMetaRow(row: MetaOutboxRow): CipherBundle {
    return {
      ciphertext: row.payload_ciphertext,
      nonce: row.payload_nonce,
      authTag: row.payload_auth_tag,
      encryptedDek: row.payload_encrypted_dek,
      keyRef: row.payload_key_ref,
      expiresAt: row.payload_expires_at,
    };
  }

  private salesCycleAad(pageId: string, conversationId: string): string {
    return `lana:sales-cycle:v1:${pageId}:${conversationId}`;
  }

  private salesCycleRecord<TState>(
    row: SalesCycleRow,
  ): RealtimeSalesCycleRecord<TState> {
    const state = this.cipher.decryptJson<TState>(
      {
        ciphertext: row.state_ciphertext,
        nonce: row.state_nonce,
        authTag: row.state_auth_tag,
        encryptedDek: row.state_encrypted_dek,
        keyRef: row.state_key_ref,
        expiresAt: row.expires_at,
      },
      this.salesCycleAad(row.page_id, row.conversation_id),
    );
    return {
      conversationId: row.conversation_id,
      pageId: row.page_id,
      stateRevision: Number(row.state_revision),
      state,
      cartExpiresAt: row.cart_expires_at,
      expiresAt: row.expires_at,
    };
  }

  private metaRecipientAad(pageId: string, outboxId: string): string {
    return `lana:meta-recipient:v2:${pageId}:${outboxId}`;
  }

  private metaPayloadAad(pageId: string, outboxId: string): string {
    return `lana:meta-payload:v2:${pageId}:${outboxId}`;
  }

  private providerLinkAad(
    pageId: string,
    conversationId: string,
    provider: string,
  ): string {
    return `lana:provider-link:v1:${pageId}:${conversationId}:${provider}`;
  }

  private emptyObject(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    );
  }

  private stateString(
    state: unknown,
    key: string,
    fallback: string,
  ): string {
    if (state !== null && typeof state === "object") {
      const value = (state as Record<string, unknown>)[key];
      if (typeof value === "string") return value;
    }
    return fallback;
  }

  private stateNullableString(state: unknown, key: string): string | null {
    if (state !== null && typeof state === "object") {
      const value = (state as Record<string, unknown>)[key];
      if (typeof value === "string") return value;
    }
    return null;
  }

  private stateNumber(
    state: unknown,
    key: string,
    fallback: number,
  ): number {
    if (state !== null && typeof state === "object") {
      const value = (state as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isSafeInteger(value)) return value;
    }
    return fallback;
  }
}
