import type { ClosingCustomerState, PolicyCartLineInput } from "./policy-engine.js";

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
