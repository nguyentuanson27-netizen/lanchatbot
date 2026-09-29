import { ProductSearchService, type StableProductDocument } from "@lana/business-tools";
import { describe, expect, it } from "vitest";
import { RedisCachedProductSearch } from "./redis-product-search-cache.js";

function product(productId: string): StableProductDocument {
  return {
    productId, parentProductId: productId, canonicalCode: productId,
    aliases: [], title: productId, descriptionXml: "", colors: [], materials: [],
    silhouettes: [], occasions: [], imageUrls: [], images: [], catalogVersion: "test-v1",
  };
}

describe("production product search composition", () => {
  const rejected = product("SD396");
  const alternative = product("SD397");

  it.each([true, false])("preserves rejection through the Redis wrapper (alternative=%s)", async (hasAlternative) => {
    const service = new ProductSearchService({
      findByExactCode: async () => rejected,
      findByAlias: async () => [],
      searchStableText: async () => [
        { document: rejected, score: 0.99 },
        ...(hasAlternative ? [{ document: alternative, score: 0.9 }] : []),
      ],
      searchStableImage: async () => [],
    }, { textMinScore: 0.75, imageMinScore: 0.8, minTopGap: 0.05, maxCandidates: 3 });
    // Text retrieval does not connect to Redis; only the catalog IO is simulated.
    const search = new RedisCachedProductSearch("redis://127.0.0.1:1", service);
    try {
      expect(await search.searchText("tìm mẫu khác")).toMatchObject({
        status: "MATCHED", product: { productId: rejected.productId },
      });
      for (const query of ["tìm mẫu khác", "SD396"]) {
        const result = await search.searchText(query, rejected.productId);
        expect(result).toMatchObject(hasAlternative
          ? { status: "MATCHED", product: { productId: alternative.productId } }
          : { status: "NOT_FOUND" });
      }
    } finally {
      await search.close();
    }
  });
});
