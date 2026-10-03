import { normalizeProductCode, verifyProductAttributesV1, type ProductSearchService, type StableProductDocument } from "@lana/business-tools";
import { BusinessFactEnvelopeV1Schema, type BusinessFactEnvelopeV1 } from "@lana/contracts";
import type { SessionDecisionContext } from "@lana/conversation-engine";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import { applyCustomerDecisionInput, customerInputObligations, type RealtimeCustomerInput } from "./realtime-customer-input.js";
import { trackCSearchShapeMatches } from "./track-c-c3-product-search.js";

type Alternative = { status: "MATCHED"; product: StableProductDocument; facts: BusinessFactEnvelopeV1 }
  | { status: "NO_MATCH" | "UNAVAILABLE" };

/** A shortlist is discovery only. Price/stock are admitted only by the existing POS reader. */
export async function findVerifiedAlternative(input: {
  text: string;
  customerInput: RealtimeCustomerInput;
  session?: SessionDecisionContext | undefined;
  currentProductId: string | null;
  search: { searchAlternatives?: ProductSearchService["searchAlternatives"]; searchText?: ProductSearchService["searchText"] };
  facts: Pick<BusinessFactsReader, "resolve">;
  shopAlias: string;
  now: Date;
}): Promise<Alternative> {
  const session = applyCustomerDecisionInput(input.session, input.customerInput, input.currentProductId);
  const excluded = [...new Set([...session.rejectedProductIds,
    ...(input.currentProductId ? [input.currentProductId] : [])])];
  const ids = new Set(excluded.map(normalizeProductCode));
  const query = [input.text, session.budgetVnd === null ? "" : `budget VND ${session.budgetVnd}`,
    session.occasion ?? ""].filter(Boolean).join("; ");
  let candidates: readonly StableProductDocument[];
  try {
    if (input.search.searchAlternatives) candidates = await input.search.searchAlternatives(query, excluded);
    else {
      const result = await input.search.searchText?.(query, input.currentProductId ?? undefined);
      candidates = result?.status === "MATCHED" ? [result.product] : [];
    }
  } catch { return { status: "UNAVAILABLE" }; }
  let failed = false;
  // Recheck exclusion/deduplication here even if an adapter ignores its contract.
  const shortlist = candidates.slice(0, 12).filter(({ productId }) => {
    const id = normalizeProductCode(productId);
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  }).slice(0, 3);
  const criteria = customerInputObligations(input.customerInput).filter((entry) => entry.kind === "PRODUCT_SEARCH" && entry.criteria != null)
    .map((entry) => entry.criteria!);
  for (const product of shortlist) {
    if (criteria.length > 0) {
      const attributes = verifyProductAttributesV1(product.attributes, product.productId);
      if (criteria.some((entry) => entry.avoid.length > 0) ||
          (criteria.some((entry) => entry.shape !== null) && (attributes === null || attributes.metadata.freshnessState !== "FRESH" ||
            Date.parse(attributes.metadata.observedAt) > input.now.getTime() ||
            !criteria.every((entry) => trackCSearchShapeMatches(entry,
              [...attributes.silhouettes, ...(attributes.designAttributes?.silhouette ?? [])]))))) continue;
    }
    try {
      const requested = input.customerInput.factQuery;
      const value = BusinessFactEnvelopeV1Schema.parse(await input.facts.resolve({
        shopAlias: input.shopAlias, productId: product.productId, intent: "PRICE",
        offerType: requested.offerType, color: requested.color, size: requested.size, deliveryRegion: null,
      }, input.now));
      const facts = value.facts;
      const price = facts?.salePriceVnd ?? facts?.listPriceVnd;
      if (value.status !== "OK" || !facts || !["POS_LIVE", "POS_SNAPSHOT"].includes(value.source) ||
          value.productId !== product.productId || facts.parentProductId !== product.parentProductId ||
          value.expiresAt === null || Date.parse(value.expiresAt) <= input.now.getTime() ||
          Date.parse(value.observedAt) > input.now.getTime() ||
          (requested.offerType !== null && requested.offerType !== facts.offerType) ||
          price == null || (session.budgetVnd !== null && price > session.budgetVnd) ||
          !["IN_STOCK", "LOW_STOCK"].includes(facts.stockStatus) || (facts.stockQuantity ?? 0) < 1) continue;
      return { status: "MATCHED", product, facts: value };
    } catch { failed = true; }
  }
  return { status: failed ? "UNAVAILABLE" : "NO_MATCH" };
}
