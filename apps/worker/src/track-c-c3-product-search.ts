import { normalizeProductCode } from "@lana/business-tools";
import type { TrackCRequestedObligation, TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";

type SearchCriteria = NonNullable<TrackCRequestedObligation["criteria"]>;

/** Registry tokens and source-bound criteria use exact normalized equality.
 * Missing attributes never prove an avoidance condition false. */
export function trackCSearchShapeMatches(criteria: SearchCriteria, shapes: readonly string[]): boolean {
  if (criteria.avoid.length > 0) return false;
  return criteria.shape === null || shapes.some((shape) => shape.normalize("NFC").toLocaleUpperCase("vi-VN") ===
    criteria.shape!.normalize("NFC").toLocaleUpperCase("vi-VN"));
}

/** A constrained search joins the admitted candidate's price and registry
 * shape. Independent subjects cannot complete the join. */
export function trackCConstrainedSearchMatchesEvidence(obligation: TrackCRequestedObligation,
  evidence: TrackCSelectableEvidence, pool: readonly TrackCSelectableEvidence[]): boolean {
  const criteria = obligation.criteria;
  const constraints = obligation.searchConstraints;
  if (obligation.lookupStatus !== undefined || criteria == null || constraints === undefined || criteria.avoid.length > 0 ||
      (constraints.budgetVnd !== null && (!Number.isSafeInteger(constraints.budgetVnd) || constraints.budgetVnd < 0))) return false;
  const id = evidence.subject?.productId;
  if (id === undefined || (obligation.productId !== null && normalizeProductCode(id) === normalizeProductCode(obligation.productId)) ||
      constraints.rejectedProductIds.some((rejected) => normalizeProductCode(rejected) === normalizeProductCode(id))) return false;
  const candidate = pool.filter((entry) => entry.subject?.productId !== undefined &&
    normalizeProductCode(entry.subject.productId) === normalizeProductCode(id) && entry.deterministicText !== undefined);
  const prices = candidate.filter((entry) => entry.capability === "PRICE" && entry.value.currency === "VND" &&
    Number.isSafeInteger(entry.value.amountVnd) && (entry.value.amountVnd as number) >= 0 &&
    (obligation.component === undefined ? !["TOP", "BOTTOM"].includes(String(entry.value.component))
      : entry.value.component === obligation.component) &&
    (obligation.offerScope === undefined || entry.value.offerScope === obligation.offerScope));
  // More than one selling configuration is not a single price for this need.
  if (prices.length !== 1 || (constraints.budgetVnd !== null && (prices[0]!.value.amountVnd as number) > constraints.budgetVnd)) return false;
  const shapes = candidate.filter((entry) => {
    if (entry.capability !== "PRODUCT_ATTRIBUTES") return false;
    const values = entry.value.silhouettes ?? entry.value["design.silhouette"];
    return Array.isArray(values) && values.every((value) => typeof value === "string") &&
      trackCSearchShapeMatches(criteria, values);
  });
  if (criteria.shape !== null && shapes.length === 0) return false;
  return [...prices, ...(criteria.shape === null ? [] : shapes)].some((entry) =>
    entry.ref === evidence.ref && entry.provenance.contentHash === evidence.provenance.contentHash);
}
