import {
  BusinessFactEnvelopeV1Schema,
  ProductFactsV1Schema,
  type BusinessFactEnvelopeV1,
  type ProductFactsV1,
  type StockStatus,
} from "@lana/contracts";
import type { FactsValidationResult, ProductFactsCompositionInput } from "./types.js";

function isFresh(expiresAt: string, now: Date): boolean {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

export function validateProductFacts(value: unknown): FactsValidationResult {
  const result = ProductFactsV1Schema.safeParse(value);
  return result.success
    ? { ok: true, facts: result.data, reasonCodes: [] }
    : {
        ok: false,
        facts: null,
        reasonCodes: result.error.issues.map((issue) => `INVALID_PRODUCT_FACT:${issue.path.join(".") || "root"}`),
      };
}

export function composeVerifiedProductFacts(input: ProductFactsCompositionInput): BusinessFactEnvelopeV1 {
  const productId = input.product.productId;
  const reason = (reasonCode: string, status: "STALE" | "NOT_FOUND" | "ERROR"): BusinessFactEnvelopeV1 => ({
    schemaVersion: 1,
    status,
    source: input.price.source,
    observedAt: input.price.observedAt,
    expiresAt: input.price.expiresAt,
    productId,
    facts: null,
    reasonCode,
  });

  if (
    input.price.productId !== productId ||
    input.parentPolicy.parentProductId !== input.product.parentProductId ||
    input.inventory.parentProductId !== input.product.parentProductId
  ) {
    return reason("BUSINESS_FACT_PRODUCT_MISMATCH", "ERROR");
  }
  if (input.inventory.status !== "OK") {
    const status =
      input.inventory.status === "STALE"
        ? "STALE"
        : input.inventory.status === "NOT_FOUND"
          ? "NOT_FOUND"
          : "ERROR";
    return reason(`INVENTORY_${input.inventory.status}`, status);
  }
  if (
    !isFresh(input.price.expiresAt, input.now) ||
    !isFresh(input.parentPolicy.expiresAt, input.now) ||
    !isFresh(input.transit.expiresAt, input.now)
  ) {
    return reason("BUSINESS_FACT_STALE", "STALE");
  }
  if (
    input.parentPolicy.preparationDaysMin < 0 ||
    input.parentPolicy.preparationDaysMax < input.parentPolicy.preparationDaysMin ||
    input.transit.minDays < 0 ||
    input.transit.maxDays < input.transit.minDays
  ) {
    return reason("INVALID_ETA_INPUT", "ERROR");
  }

  const relevantOffers = input.inventory.offers.filter((offer) => offer.offerType === input.offerType);
  const stockQuantity = relevantOffers.reduce((sum, offer) => sum + offer.quantity, 0);
  let stockStatus: StockStatus;
  if (input.parentPolicy.policyCode === "PRE_ORDER") stockStatus = "PRE_ORDER";
  else if (input.parentPolicy.policyCode === "COMING_SOON") stockStatus = "COMING_SOON";
  else stockStatus = stockQuantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK";

  const sizes = [...new Set(relevantOffers.filter((offer) => offer.quantity > 0).map((offer) => offer.size))];
  const facts: ProductFactsV1 = {
    schemaVersion: 1,
    productId,
    parentProductId: input.product.parentProductId,
    offerType: input.offerType,
    listPriceVnd: input.price.listPriceVnd,
    salePriceVnd: input.price.salePriceVnd,
    sizes,
    stockStatus,
    stockQuantity,
    deliveryEta: {
      minDays: input.parentPolicy.preparationDaysMin + input.transit.minDays,
      maxDays: input.parentPolicy.preparationDaysMax + input.transit.maxDays,
    },
    fulfillmentPolicy: input.parentPolicy.policyCode,
    imageUrls: [...input.product.imageUrls].slice(0, 6),
  };
  const parsedFacts = ProductFactsV1Schema.parse(facts);
  return BusinessFactEnvelopeV1Schema.parse({
    schemaVersion: 1,
    status: "OK",
    source: input.price.source,
    observedAt: input.price.observedAt,
    expiresAt: [input.price.expiresAt, input.parentPolicy.expiresAt, input.transit.expiresAt].sort()[0] ?? null,
    productId,
    facts: parsedFacts,
    reasonCode: null,
  });
}
