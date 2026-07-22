import type { PolicyBundleV1 } from "@lana/contracts";
import {
  evaluateShopPolicy,
  type AuthorizedPolicyAdjustment,
  type ClosingCustomerState,
  type PolicyCartLineInput,
  type ShopPolicyEvaluation,
} from "./policy-engine.js";

export interface NegotiationCartSnapshotV2 {
  readonly cartId: string;
  readonly cartVersion: number;
  readonly lines: readonly PolicyCartLineInput[];
}

/**
 * The model may classify a customer message, but it cannot name a customer
 * state or request a concession. Those are derived below from policy and the
 * persisted negotiation state.
 */
export type NegotiationEvidenceV2 =
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

export interface NegotiationQuoteV2 {
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

export interface NegotiationProcessedEventV2 {
  readonly eventId: string;
  readonly fingerprint: string;
  readonly resultingStateVersion: number;
}

export interface NegotiationStateV2 {
  readonly schemaVersion: 2;
  readonly negotiationId: string;
  readonly cartId: string;
  readonly cartVersion: number;
  readonly stateVersion: number;
  readonly customerState: ClosingCustomerState;
  readonly consumedObjectionEvidenceIds: readonly string[];
  readonly processedEvents: readonly NegotiationProcessedEventV2[];
  readonly quote: NegotiationQuoteV2;
  readonly updatedAt: string;
}

export interface ApplyNegotiationEventV2Input {
  readonly negotiationId: string;
  readonly state: NegotiationStateV2 | null;
  /** Version read by the caller. Persistence must compare-and-swap on it. */
  readonly expectedStateVersion: number;
  /** Existing cart version read by the caller; mutation events carry a newer snapshot. */
  readonly expectedCartVersion: number;
  readonly eventId: string;
  readonly evidence: NegotiationEvidenceV2;
  readonly cart: NegotiationCartSnapshotV2;
  readonly policy: PolicyBundleV1;
  readonly now: Date;
}

export type NegotiationBlockReasonV2 =
  | "INVALID_IDENTITY"
  | "INVALID_VERSION"
  | "STATE_VERSION_CONFLICT"
  | "CART_VERSION_CONFLICT"
  | "CART_MUTATION_VERSION_NOT_ADVANCED"
  | "CART_CHANGED_WITHOUT_MUTATION_EVENT"
  | "EVENT_ID_COLLISION"
  | "EVIDENCE_INVALID"
  | "NEGOTIATION_LEDGER_FULL"
  | "POLICY_EVALUATION_BLOCKED";

export interface NegotiationAuditV2 {
  readonly eventId: string;
  readonly negotiationId: string;
  readonly cartId: string;
  readonly expectedStateVersion: number;
  readonly stateVersionBefore: number;
  readonly stateVersionAfter: number;
  readonly expectedCartVersion: number;
  readonly cartVersionBefore: number;
  readonly cartVersionAfter: number;
  readonly customerStateBefore: ClosingCustomerState | null;
  readonly customerStateAfter: ClosingCustomerState | null;
  readonly intent: NegotiationEvidenceV2["intent"];
  readonly evidenceSource: NegotiationEvidenceV2["source"];
  readonly evidenceId: string;
  readonly objectionEvidenceId: string | null;
  readonly newObjectionAccepted: boolean;
  readonly action: "INITIALIZED" | "TRANSITIONED" | "REPRICED" | "NO_CHANGE" | "REPLAYED" | "BLOCKED";
  readonly reasonCode: NegotiationBlockReasonV2 | "EVENT_ALREADY_APPLIED" | "OBJECTION_ALREADY_CONSUMED" | null;
  readonly policyBundleId: string;
  readonly policyVersion: string;
  readonly decisionMode: "DETERMINISTIC_POLICY_ONLY";
  readonly parentProductUnitCount: number | null;
  readonly subtotalVnd: number | null;
  readonly shippingFeeVnd: number | null;
  readonly adjustments: readonly AuthorizedPolicyAdjustment[];
  readonly discountTotalVnd: number | null;
  readonly grandTotalVnd: number | null;
  readonly occurredAt: string;
}

export type NegotiationDecisionV2 =
  | {
      readonly status: "APPLIED" | "REPLAYED";
      readonly state: NegotiationStateV2;
      readonly cas: { readonly expectedStateVersion: number; readonly nextStateVersion: number };
      readonly audit: NegotiationAuditV2;
    }
  | {
      readonly status: "BLOCKED";
      readonly reasonCode: NegotiationBlockReasonV2;
      readonly policyReasonCode: Extract<ShopPolicyEvaluation, { status: "BLOCKED" }>["reasonCode"] | null;
      readonly state: NegotiationStateV2 | null;
      readonly cas: { readonly expectedStateVersion: number; readonly nextStateVersion: number };
      readonly audit: NegotiationAuditV2;
    };

function normalizedId(value: string): string {
  return value.trim().normalize("NFC").toLocaleUpperCase("en-US");
}

function validId(value: string): boolean {
  return value.trim().length > 0 && value.trim().length <= 256;
}

function eventFingerprint(input: ApplyNegotiationEventV2Input): string {
  const evidence = input.evidence.intent === "PRICE_OBJECTION"
    ? [input.evidence.source, input.evidence.intent, input.evidence.evidenceId, input.evidence.objectionEvidenceId, input.evidence.reasonCode, input.evidence.observedAt]
    : input.evidence.intent === "CART_MUTATED"
      ? [input.evidence.source, input.evidence.intent, input.evidence.evidenceId, input.evidence.mutationReasonCode, input.evidence.observedAt]
      : [input.evidence.source, input.evidence.intent, input.evidence.evidenceId, input.evidence.observedAt];
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

function nextCustomerState(
  current: ClosingCustomerState | null,
  evidence: NegotiationEvidenceV2,
  objectionAlreadyConsumed: boolean,
): ClosingCustomerState {
  const base = current ?? "READY";
  if (evidence.intent !== "PRICE_OBJECTION" || objectionAlreadyConsumed) return base;
  if (base === "READY") return "HESITANT";
  if (base === "HESITANT") return "CAUTIOUS";
  return "CAUTIOUS";
}

function policyEvidenceFor(state: ClosingCustomerState) {
  if (state === "READY") {
    return { previousState: null, purchaseReady: true, priceObjectionCount: 0, secondConcessionAlreadyApplied: false } as const;
  }
  if (state === "HESITANT") {
    return { previousState: "HESITANT", purchaseReady: false, priceObjectionCount: 1, secondConcessionAlreadyApplied: false } as const;
  }
  return { previousState: "HESITANT", purchaseReady: false, priceObjectionCount: 2, secondConcessionAlreadyApplied: true } as const;
}

function quoteFrom(evaluation: Extract<ShopPolicyEvaluation, { status: "AUTHORIZED" }>): NegotiationQuoteV2 {
  const adjustments: AuthorizedPolicyAdjustment[] = [];
  let freeShippingSeen = false;
  for (const adjustment of evaluation.adjustments) {
    if (adjustment.kind === "FREE_SHIPPING") {
      if (freeShippingSeen) continue;
      freeShippingSeen = true;
    }
    adjustments.push(adjustment);
  }
  const discountTotalVnd = adjustments.reduce((sum, adjustment) => sum + adjustment.amountVnd, 0);
  return {
    policyBundleId: evaluation.policyBundleId,
    policyVersion: evaluation.policyVersion,
    customerState: evaluation.customerState,
    parentProductUnitCount: evaluation.parentProductUnitCount,
    subtotalVnd: evaluation.subtotalVnd,
    shippingFeeVnd: evaluation.shippingFeeVnd,
    adjustments,
    discountTotalVnd,
    grandTotalVnd: Math.max(0, evaluation.subtotalVnd + evaluation.shippingFeeVnd - discountTotalVnd),
  };
}

function auditFor(
  input: ApplyNegotiationEventV2Input,
  action: NegotiationAuditV2["action"],
  stateAfter: NegotiationStateV2 | null,
  reasonCode: NegotiationAuditV2["reasonCode"],
  newObjectionAccepted: boolean,
): NegotiationAuditV2 {
  const before = input.state;
  const quote = stateAfter?.quote ?? before?.quote ?? null;
  return {
    eventId: input.eventId,
    negotiationId: input.negotiationId,
    cartId: input.cart.cartId,
    expectedStateVersion: input.expectedStateVersion,
    stateVersionBefore: before?.stateVersion ?? 0,
    stateVersionAfter: stateAfter?.stateVersion ?? before?.stateVersion ?? 0,
    expectedCartVersion: input.expectedCartVersion,
    cartVersionBefore: before?.cartVersion ?? input.expectedCartVersion,
    cartVersionAfter: stateAfter?.cartVersion ?? before?.cartVersion ?? input.cart.cartVersion,
    customerStateBefore: before?.customerState ?? null,
    customerStateAfter: stateAfter?.customerState ?? before?.customerState ?? null,
    intent: input.evidence.intent,
    evidenceSource: input.evidence.source,
    evidenceId: input.evidence.evidenceId,
    objectionEvidenceId: input.evidence.intent === "PRICE_OBJECTION" ? input.evidence.objectionEvidenceId : null,
    newObjectionAccepted,
    action,
    reasonCode,
    policyBundleId: input.policy.policyBundleId,
    policyVersion: input.policy.policyVersion,
    decisionMode: "DETERMINISTIC_POLICY_ONLY",
    parentProductUnitCount: quote?.parentProductUnitCount ?? null,
    subtotalVnd: quote?.subtotalVnd ?? null,
    shippingFeeVnd: quote?.shippingFeeVnd ?? null,
    adjustments: quote?.adjustments ?? [],
    discountTotalVnd: quote?.discountTotalVnd ?? null,
    grandTotalVnd: quote?.grandTotalVnd ?? null,
    occurredAt: input.now.toISOString(),
  };
}

function blocked(
  input: ApplyNegotiationEventV2Input,
  reasonCode: NegotiationBlockReasonV2,
  policyReasonCode: Extract<ShopPolicyEvaluation, { status: "BLOCKED" }>["reasonCode"] | null = null,
): NegotiationDecisionV2 {
  const currentVersion = input.state?.stateVersion ?? 0;
  return {
    status: "BLOCKED",
    reasonCode,
    policyReasonCode,
    state: input.state,
    cas: { expectedStateVersion: currentVersion, nextStateVersion: currentVersion },
    audit: auditFor(input, "BLOCKED", input.state, reasonCode, false),
  };
}

/**
 * Pure deterministic reducer. The caller must persist `state` using the
 * returned CAS pair; this is what makes two simultaneous objection events
 * unable to both advance the concession tier.
 */
export function applyNegotiationEventV2(input: ApplyNegotiationEventV2Input): NegotiationDecisionV2 {
  if (
    !validId(input.negotiationId) ||
    !validId(input.cart.cartId) ||
    !validId(input.eventId) ||
    !validId(input.evidence.evidenceId) ||
    (input.evidence.intent === "PRICE_OBJECTION" && (!validId(input.evidence.objectionEvidenceId) || !validId(input.evidence.reasonCode)))
  ) return blocked(input, "INVALID_IDENTITY");
  const evidenceTime = Date.parse(input.evidence.observedAt);
  if (!Number.isFinite(input.now.getTime()) || !Number.isFinite(evidenceTime) || evidenceTime > input.now.getTime() + 5 * 60 * 1_000) {
    return blocked(input, "EVIDENCE_INVALID");
  }
  if (
    !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 0 ||
    !Number.isInteger(input.expectedCartVersion) || input.expectedCartVersion < 1 ||
    !Number.isInteger(input.cart.cartVersion) || input.cart.cartVersion < 1
  ) return blocked(input, "INVALID_VERSION");
  if (input.state !== null && (
    normalizedId(input.state.negotiationId) !== normalizedId(input.negotiationId) ||
    normalizedId(input.state.cartId) !== normalizedId(input.cart.cartId)
  )) return blocked(input, "INVALID_IDENTITY");

  const fingerprint = eventFingerprint(input);
  const processed = input.state?.processedEvents.find(({ eventId }) => normalizedId(eventId) === normalizedId(input.eventId));
  if (processed !== undefined) {
    if (processed.fingerprint !== fingerprint) return blocked(input, "EVENT_ID_COLLISION");
    const state = input.state;
    if (state === null) throw new Error("unreachable");
    return {
      status: "REPLAYED",
      state,
      cas: { expectedStateVersion: state.stateVersion, nextStateVersion: state.stateVersion },
      audit: auditFor(input, "REPLAYED", state, "EVENT_ALREADY_APPLIED", false),
    };
  }

  const currentStateVersion = input.state?.stateVersion ?? 0;
  if (input.expectedStateVersion !== currentStateVersion) return blocked(input, "STATE_VERSION_CONFLICT");
  const currentCartVersion = input.state?.cartVersion ?? input.cart.cartVersion;
  if (input.expectedCartVersion !== currentCartVersion) return blocked(input, "CART_VERSION_CONFLICT");

  if (input.evidence.intent === "CART_MUTATED") {
    if (input.state === null || input.cart.cartVersion !== currentCartVersion + 1) {
      return blocked(input, "CART_MUTATION_VERSION_NOT_ADVANCED");
    }
  } else if (input.cart.cartVersion !== currentCartVersion) {
    return blocked(input, "CART_CHANGED_WITHOUT_MUTATION_EVENT");
  }

  const objectionEvidenceId = input.evidence.intent === "PRICE_OBJECTION"
    ? input.evidence.objectionEvidenceId
    : null;
  const objectionAlreadyConsumed = objectionEvidenceId !== null &&
    input.state?.consumedObjectionEvidenceIds.some((id) => normalizedId(id) === normalizedId(objectionEvidenceId)) === true;
  if (
    (input.state?.processedEvents.length ?? 0) >= 200 ||
    (input.evidence.intent === "PRICE_OBJECTION" && !objectionAlreadyConsumed && (input.state?.consumedObjectionEvidenceIds.length ?? 0) >= 50)
  ) return blocked(input, "NEGOTIATION_LEDGER_FULL");
  const customerState = nextCustomerState(input.state?.customerState ?? null, input.evidence, objectionAlreadyConsumed);
  const evaluation = evaluateShopPolicy({
    policy: input.policy,
    lines: input.cart.lines,
    closingEvidence: policyEvidenceFor(customerState),
    now: input.now,
  });
  if (evaluation.status === "BLOCKED") {
    return blocked(input, "POLICY_EVALUATION_BLOCKED", evaluation.reasonCode);
  }

  const nextStateVersion = currentStateVersion + 1;
  const newObjectionAccepted = input.evidence.intent === "PRICE_OBJECTION" && !objectionAlreadyConsumed;
  const state: NegotiationStateV2 = {
    schemaVersion: 2,
    negotiationId: input.negotiationId,
    cartId: input.cart.cartId,
    cartVersion: input.cart.cartVersion,
    stateVersion: nextStateVersion,
    customerState,
    consumedObjectionEvidenceIds: newObjectionAccepted
      ? [...(input.state?.consumedObjectionEvidenceIds ?? []), input.evidence.objectionEvidenceId]
      : [...(input.state?.consumedObjectionEvidenceIds ?? [])],
    processedEvents: [
      ...(input.state?.processedEvents ?? []),
      { eventId: input.eventId, fingerprint, resultingStateVersion: nextStateVersion },
    ],
    quote: quoteFrom(evaluation),
    updatedAt: input.now.toISOString(),
  };
  const action: NegotiationAuditV2["action"] = input.state === null
    ? "INITIALIZED"
    : input.evidence.intent === "CART_MUTATED"
      ? "REPRICED"
      : customerState !== input.state.customerState
        ? "TRANSITIONED"
        : "NO_CHANGE";
  return {
    status: "APPLIED",
    state,
    cas: { expectedStateVersion: currentStateVersion, nextStateVersion },
    audit: auditFor(
      input,
      action,
      state,
      objectionAlreadyConsumed ? "OBJECTION_ALREADY_CONSUMED" : null,
      newObjectionAccepted,
    ),
  };
}
