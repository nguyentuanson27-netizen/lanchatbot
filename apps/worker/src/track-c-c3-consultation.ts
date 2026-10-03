import type { TrackCRequestedObligation, TrackCResponderTask, TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";

/** Relevance permits a supported response, never a claim that the concern is resolved. */
export function trackCConsultationMatchesEvidence(request: TrackCRequestedObligation,
  evidence: TrackCSelectableEvidence, pool: readonly TrackCSelectableEvidence[] = [evidence]): boolean {
  if (request.lookupStatus !== undefined || evidence.deterministicText === undefined) return false;
  const productId = evidence.subject?.productId;
  const sameProduct = request.productId !== null && productId?.toUpperCase() === request.productId.toUpperCase();
  if (productId !== undefined && !sameProduct) return false;
  if (request.variantId !== undefined && evidence.subject?.variantId !== request.variantId) return false;
  const value = evidence.value;
  switch (request.decisionConcern) {
    case "FIT_RISK": {
      const sizes = value.recommendedSizes;
      return sameProduct && evidence.capability === "SIZE_FIT" && Array.isArray(sizes) && sizes.length > 0 &&
        sizes.every((size) => typeof size === "string") && (request.size === undefined ||
          sizes.some((size) => size.toUpperCase() === request.size!.toUpperCase()));
    }
    case "TRUST_RISK":
      // A realizable parent inspection already states its try-on condition.
      // Keep the atomic projection for direct TRY_ON or an unrealizable parent.
      if (value.policy === "TRY_ON" && pool.some((parent) => parent.capability === "POLICY" &&
          parent.value.policy === "INSPECTION" && parent.deterministicText !== undefined &&
          parent.provenance.contentHash === value.sourceContentHash)) return false;
      return evidence.capability === "POLICY" && (sameProduct || evidence.subject?.scope === "SHOP") &&
        ["INSPECTION", "TRY_ON", "EXCHANGE", "EXCHANGE_SIZE", "EXCHANGE_COLOR", "EXCHANGE_MODEL", "REFUND", "RETURN_AND_REFUND"]
          .includes(String(value.policy));
    case "USAGE_FREQUENCY":
      return sameProduct && evidence.capability === "PRODUCT_ATTRIBUTES" && Array.isArray(value.occasions) &&
        value.occasions.length > 0 && value.occasions.every((occasion) => typeof occasion === "string");
    case "PRICE_HESITATION":
      if (evidence.capability === "PRODUCT_COMPARISON") {
        return request.productId !== null && Array.isArray(value.productIds) && value.productIds.length === 2 && value.productIds.includes(request.productId) &&
          new Set(value.productIds).size === 2 && Number.isSafeInteger(value.differenceVnd) && (value.differenceVnd as number) >= 0 &&
          Array.isArray(value.sourceClaimHashes) && value.sourceClaimHashes.length === 2;
      }
      return sameProduct && evidence.capability === "OFFER_CONFIGURATION" &&
        ["FULL_SET", "TOP", "BOTTOM", "TWO_PIECE", "THREE_PIECE"].includes(String(value.offerScope)) &&
        value.available !== false && [value.fullSetVnd, value.twoPieceVnd, value.threePieceVnd, value.priceVnd]
          .some((amount) => Number.isSafeInteger(amount) && (amount as number) >= 0);
    default: return false;
  }
}

export function trackCConsultationClarificationTargets(request: TrackCRequestedObligation): readonly string[] {
  if (request.lookupStatus !== undefined) return [];
  if (request.productId === null) return ["PRODUCT"];
  return request.decisionConcern === "FIT_RISK" ? ["MEASUREMENTS"]
    : request.decisionConcern === "PRICE_HESITATION" ? ["DECISION_CRITERION", "BUDGET"] : ["DECISION_CRITERION"];
}

export function trackCConsultationClarification(request: TrackCRequestedObligation,
  canonical: TrackCResponderTask["canonicalRequest"], continuation: TrackCResponderTask["continuation"]): string | null {
  const target = canonical?.type === "ASK_PRODUCT" ? "PRODUCT"
    : canonical?.type === "ASK_MEASUREMENTS" ? "MEASUREMENTS" : continuation?.type === "ASK" ? continuation.input : null;
  return target !== null && trackCConsultationClarificationTargets(request).includes(target) ? target : null;
}

export function trackCConsultationClarificationPurpose(request: TrackCRequestedObligation): string {
  switch (request.decisionConcern) {
    case "FIT_RISK": return "missing verified measurements for a fit recommendation";
    case "PRICE_HESITATION": return "the remaining spending or value criterion that changes this choice";
    case "TRUST_RISK": return "the specific inspection or return concern that changes this choice";
    case "USAGE_FREQUENCY": return "the intended wearing occasions or frequency that changes this choice";
    default: return "the customer's deciding criterion before choosing this product";
  }
}
