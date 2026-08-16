import type { PolicyBundleV1 } from "@lana/contracts";
import {
  evaluateShopPolicy,
  type AuthorizedPolicyAdjustment,
  type ClosingCustomerState,
  type PolicyCartLineInput,
} from "./policy-engine.js";

export type CanonicalNegotiationEvidenceV1 =
  | {
      readonly source: "MODEL_INTERPRETATION";
      readonly intent: "PURCHASE_READY" | "OTHER";
      readonly evidenceId: string;
      readonly observedAt: string;
    }
  | {
      readonly source: "MODEL_INTERPRETATION";
      readonly intent: "PRICE_OBJECTION";
      readonly evidenceId: string;
      readonly objectionEvidenceId: string;
      readonly reasonCode: string;
      readonly observedAt: string;
    }
  | {
      readonly source: "RUNTIME";
      readonly intent: "CART_MUTATED";
      readonly evidenceId: string;
      readonly mutationReasonCode:
        | "LINE_ADDED"
        | "LINE_REMOVED"
        | "QUANTITY_CHANGED"
        | "VARIANT_CHANGED"
        | "OTHER";
      readonly observedAt: string;
    };

export interface CanonicalNegotiationFingerprintInputV1 {
  readonly negotiationId: string;
  readonly expectedStateVersion: number;
  readonly expectedCartVersion: number;
  readonly eventId: string;
  readonly evidence: CanonicalNegotiationEvidenceV1;
  readonly cart: {
    readonly cartId: string;
    readonly cartVersion: number;
    readonly lines: readonly PolicyCartLineInput[];
  };
}

/** Single exact fingerprint used by the writer and the locked DB verifier. */
export function canonicalNegotiationEventFingerprintV1(
  input: CanonicalNegotiationFingerprintInputV1,
): string {
  const evidence = input.evidence.intent === "PRICE_OBJECTION"
    ? [input.evidence.source, input.evidence.intent, input.evidence.evidenceId,
        input.evidence.objectionEvidenceId, input.evidence.reasonCode, input.evidence.observedAt]
    : input.evidence.intent === "CART_MUTATED"
      ? [input.evidence.source, input.evidence.intent, input.evidence.evidenceId,
          input.evidence.mutationReasonCode, input.evidence.observedAt]
      : [input.evidence.source, input.evidence.intent, input.evidence.evidenceId,
          input.evidence.observedAt];
  const lines = [...input.cart.lines]
    .sort((left, right) => left.lineId.localeCompare(right.lineId))
    .map((line) => [
      line.lineId,
      line.shopId,
      line.parentProductId,
      line.offerKind,
      line.quantity,
      line.priceEvidence.authority,
      line.priceEvidence.shopId,
      line.priceEvidence.parentProductId,
      line.priceEvidence.offerKind,
      line.priceEvidence.sourceVersion,
      line.priceEvidence.observedAt,
      line.priceEvidence.expiresAt,
      line.priceEvidence.freshForSeconds,
      line.priceEvidence.unitPriceVnd,
    ]);
  return JSON.stringify([
    input.negotiationId,
    input.expectedStateVersion,
    input.expectedCartVersion,
    input.cart.cartId,
    input.cart.cartVersion,
    evidence,
    lines,
  ]);
}

/** Only this primitive may turn evidence into a concession-state transition. */
export function deriveCanonicalNegotiationCustomerStateV1(
  current: ClosingCustomerState | null,
  intent: CanonicalNegotiationEvidenceV1["intent"],
  objectionAlreadyConsumed: boolean,
): ClosingCustomerState {
  const base = current ?? "READY";
  if (intent !== "PRICE_OBJECTION" || objectionAlreadyConsumed) return base;
  if (base === "READY") return "HESITANT";
  return "CAUTIOUS";
}

export interface CanonicalNegotiationQuoteV1 {
  readonly policyBundleId: string;
  readonly policyVersion: string;
  readonly customerState: ClosingCustomerState;
  readonly parentProductUnitCount: number;
  readonly subtotalVnd: number;
  readonly shippingFeeVnd: number;
  readonly adjustments: readonly AuthorizedPolicyAdjustment[];
  readonly discountTotalVnd: number;
  readonly grandTotalVnd: number;
}

export interface CanonicalNegotiationStateV1 {
  readonly schemaVersion: 2;
  readonly negotiationId: string;
  readonly cartId: string;
  readonly cartVersion: number;
  readonly stateVersion: number;
  readonly customerState: ClosingCustomerState;
  readonly consumedObjectionEvidenceIds: readonly string[];
  readonly processedEvents: readonly Readonly<{
    eventId: string;
    fingerprint: string;
    resultingStateVersion: number;
  }>[];
  readonly quote: CanonicalNegotiationQuoteV1;
  readonly updatedAt: string;
}

export type CanonicalCartMutationReasonV1 =
  | "LINE_ADDED"
  | "LINE_REMOVED"
  | "QUANTITY_CHANGED"
  | "VARIANT_CHANGED"
  | "OTHER";

function repricePolicyEvidenceV1(state: ClosingCustomerState) {
  if (state === "READY") {
    return {
      previousState: null,
      purchaseReady: true,
      priceObjectionCount: 0,
      secondConcessionAlreadyApplied: false,
    } as const;
  }
  if (state === "HESITANT") {
    return {
      previousState: "HESITANT",
      purchaseReady: false,
      priceObjectionCount: 1,
      secondConcessionAlreadyApplied: false,
    } as const;
  }
  return {
    previousState: "HESITANT",
    purchaseReady: false,
    priceObjectionCount: 2,
    secondConcessionAlreadyApplied: true,
  } as const;
}

function repriceQuoteV1(
  evaluation: Extract<ReturnType<typeof evaluateShopPolicy>, { status: "AUTHORIZED" }>,
): CanonicalNegotiationQuoteV1 {
  const adjustments: AuthorizedPolicyAdjustment[] = [];
  let freeShippingSeen = false;
  for (const adjustment of evaluation.adjustments) {
    if (adjustment.kind === "FREE_SHIPPING") {
      if (freeShippingSeen) continue;
      freeShippingSeen = true;
    }
    adjustments.push(adjustment);
  }
  const discountTotalVnd = adjustments.reduce(
    (sum, adjustment) => sum + adjustment.amountVnd,
    0,
  );
  return {
    policyBundleId: evaluation.policyBundleId,
    policyVersion: evaluation.policyVersion,
    customerState: evaluation.customerState,
    parentProductUnitCount: evaluation.parentProductUnitCount,
    subtotalVnd: evaluation.subtotalVnd,
    shippingFeeVnd: evaluation.shippingFeeVnd,
    adjustments,
    discountTotalVnd,
    grandTotalVnd: Math.max(
      0,
      evaluation.subtotalVnd + evaluation.shippingFeeVnd - discountTotalVnd,
    ),
  };
}

export type CanonicalCartRepriceNegotiationResultV1 =
  | { readonly status: "APPLIED"; readonly state: CanonicalNegotiationStateV1 }
  | {
      readonly status: "BLOCKED";
      readonly reasonCode:
        | "NEGOTIATION_REPRICE_IDENTITY_INVALID"
        | "NEGOTIATION_REPRICE_VERSION_INVALID"
        | "NEGOTIATION_REPRICE_EVENT_COLLISION"
        | "NEGOTIATION_LEDGER_FULL"
        | "NEGOTIATION_REPRICE_POLICY_BLOCKED";
    };

/**
 * Single pure cart-reprice transition used by the runtime writer and DB replay.
 * It deliberately cannot change the customer concession tier or objection ledger.
 */
export function replayCanonicalCartRepriceNegotiationV1(input: Readonly<{
  state: CanonicalNegotiationStateV1;
  commandId: string;
  mutationReasonCode: CanonicalCartMutationReasonV1;
  cart: Readonly<{
    cartId: string;
    cartVersion: number;
    lines: readonly PolicyCartLineInput[];
  }>;
  policy: PolicyBundleV1;
  occurredAt: Date;
  authorizationNow?: Date;
}>): CanonicalCartRepriceNegotiationResultV1 {
  const authorizationNow = input.authorizationNow ?? input.occurredAt;
  if (!input.commandId || input.commandId !== input.commandId.trim() ||
    input.commandId.length > 256 || input.state.cartId !== input.cart.cartId ||
    input.state.negotiationId !== `negotiation:${input.cart.cartId}` ||
    !Number.isFinite(input.occurredAt.getTime()) ||
    !Number.isFinite(authorizationNow.getTime()) ||
    input.occurredAt.getTime() > authorizationNow.getTime() + 5 * 60 * 1_000) {
    return { status: "BLOCKED", reasonCode: "NEGOTIATION_REPRICE_IDENTITY_INVALID" };
  }
  if (!Number.isSafeInteger(input.state.stateVersion) || input.state.stateVersion < 1 ||
    !Number.isSafeInteger(input.state.cartVersion) || input.state.cartVersion < 1 ||
    input.cart.cartVersion !== input.state.cartVersion + 1) {
    return { status: "BLOCKED", reasonCode: "NEGOTIATION_REPRICE_VERSION_INVALID" };
  }
  if (input.state.processedEvents.length >= 200) {
    return { status: "BLOCKED", reasonCode: "NEGOTIATION_LEDGER_FULL" };
  }
  const eventId = `${input.commandId}:cart-mutated`;
  const evidence = {
    source: "RUNTIME" as const,
    intent: "CART_MUTATED" as const,
    evidenceId: input.commandId,
    mutationReasonCode: input.mutationReasonCode,
    observedAt: input.occurredAt.toISOString(),
  };
  const fingerprint = canonicalNegotiationEventFingerprintV1({
    negotiationId: input.state.negotiationId,
    expectedStateVersion: input.state.stateVersion,
    expectedCartVersion: input.state.cartVersion,
    eventId,
    evidence,
    cart: input.cart,
  });
  if (input.state.processedEvents.some((event) => event.eventId === eventId)) {
    return { status: "BLOCKED", reasonCode: "NEGOTIATION_REPRICE_EVENT_COLLISION" };
  }
  const evaluation = evaluateShopPolicy({
    policy: input.policy,
    lines: input.cart.lines,
    closingEvidence: repricePolicyEvidenceV1(input.state.customerState),
    now: input.occurredAt,
    authorizationNow,
  });
  if (evaluation.status === "BLOCKED") {
    return { status: "BLOCKED", reasonCode: "NEGOTIATION_REPRICE_POLICY_BLOCKED" };
  }
  const nextStateVersion = input.state.stateVersion + 1;
  return {
    status: "APPLIED",
    state: {
      ...input.state,
      cartVersion: input.cart.cartVersion,
      stateVersion: nextStateVersion,
      consumedObjectionEvidenceIds: [...input.state.consumedObjectionEvidenceIds],
      processedEvents: [...input.state.processedEvents, {
        eventId,
        fingerprint,
        resultingStateVersion: nextStateVersion,
      }],
      quote: repriceQuoteV1(evaluation),
      updatedAt: input.occurredAt.toISOString(),
    },
  };
}
