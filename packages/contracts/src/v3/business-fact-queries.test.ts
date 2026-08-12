import { describe, expect, it } from "vitest";
import { BusinessFactQueriesV2Schema } from "./business-fact-queries.js";

const query = {
  schemaVersion: 2 as const,
  queryId: "10000000-0000-4000-8000-000000000001",
  productRef: {
    raw: "CB182",
    productId: "CB182",
    resolution: "RESOLVED" as const,
  },
  requestedFacts: ["PRICE", "STOCK", "SIZE"] as const,
  qualifiers: {
    offerType: null,
    color: null,
    size: "M",
    deliveryRegion: null,
  },
};

describe("BusinessFactQueriesV2", () => {
  it("accepts ordered independently-resolved queries", () => {
    const parsed = BusinessFactQueriesV2Schema.parse({
      schemaVersion: 2,
      queries: [query],
    });
    expect(parsed.queries[0]?.requestedFacts).toEqual(["PRICE", "STOCK", "SIZE"]);
  });

  it("rejects duplicate facts, duplicate IDs and unresolved product IDs", () => {
    expect(BusinessFactQueriesV2Schema.safeParse({
      schemaVersion: 2,
      queries: [{ ...query, requestedFacts: ["PRICE", "PRICE"] }],
    }).success).toBe(false);
    expect(BusinessFactQueriesV2Schema.safeParse({
      schemaVersion: 2,
      queries: [query, query],
    }).success).toBe(false);
    expect(BusinessFactQueriesV2Schema.safeParse({
      schemaVersion: 2,
      queries: [{
        ...query,
        productRef: {
          raw: "mẫu kia",
          productId: "CB182",
          resolution: "AMBIGUOUS",
        },
      }],
    }).success).toBe(false);
  });

  it("accepts more than ten queries without introducing a product-count cap", () => {
    const parsed = BusinessFactQueriesV2Schema.parse({
      schemaVersion: 2,
      queries: Array.from({ length: 12 }, (_, index) => ({
        ...query,
        queryId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        productRef: {
          ...query.productRef,
          raw: `SD${String(index + 1).padStart(3, "0")}`,
          productId: `SD${String(index + 1).padStart(3, "0")}`,
        },
      })),
    });

    expect(parsed.queries.map(({ productRef }) => productRef.productId)).toEqual(
      Array.from({ length: 12 }, (_, index) => `SD${String(index + 1).padStart(3, "0")}`),
    );
  });
});
