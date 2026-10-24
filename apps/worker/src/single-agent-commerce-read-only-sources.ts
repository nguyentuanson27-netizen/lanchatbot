import { RuntimePolicyResolver } from "@lana/chat-runtime";
import type { RuntimePolicyDatabaseChannel, PostgresRuntimePolicyStore } from "@lana/database";
import { normalizeProductCode, type ProductSearchService, type StableCatalogSearchPort, type StableProductDocument } from "@lana/business-tools";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { CommerceScope, ReadOnlyCatalog } from "./single-agent-commerce-read-only-tools.js";

/** The only policy port passed to the resolver is SELECT of active pointers. No pin/audit/cache writer. */
export function createCommerceReadSources(input: {
  scope: CommerceScope; channel: RuntimePolicyDatabaseChannel; clock: () => Date;
  policyStore: Pick<PostgresRuntimePolicyStore, "loadActivePointers">;
  catalog: Pick<StableCatalogSearchPort, "findByExactCode">;
  search: Pick<ProductSearchService, "searchText">;
  facts: Required<Pick<BusinessFactsReader, "readCatalogSnapshot">>;
  initialProducts?: readonly StableProductDocument[];
}) {
  const resolver = new RuntimePolicyResolver({ loadActivePointers: q => input.policyStore.loadActivePointers(q) }, {
    enabled: true, publishedEnabled: input.channel === "PUBLISHED",
  });
  const known = new Map((input.initialProducts ?? []).map(p => [p.productId, p.canonicalCode]));
  const catalog: ReadOnlyCatalog = {
    async resolveProductCode(code) {
      const canonical = normalizeProductCode(code);
      if (!canonical || canonical !== code) return null;
      const product = await input.catalog.findByExactCode(canonical);
      if (!product || product.productId !== canonical || product.canonicalCode !== canonical) return null;
      // Ingress bounds code candidates; the tool context separately bounds admitted products.
      known.set(product.productId, canonical);
      return product;
    },
    async searchText(query) {
      const result = await input.search.searchText(query);
      const found = result.status === "MATCHED" ? [result.product] : result.status === "AMBIGUOUS" ? result.candidates.map(c => c.document) : [];
      for (const p of found) known.set(p.productId, p.canonicalCode);
      return result;
    },
    async readProduct(productId, readPos = true) {
      const code = known.get(productId);
      if (!code) throw new Error("UNBOUND_PRODUCT");
      const product = await input.catalog.findByExactCode(code);
      if (!product || product.productId !== productId || product.canonicalCode !== code) throw new Error("PRODUCT_SOURCE_CHANGED");
      return { product, snapshot: readPos ? await input.facts.readCatalogSnapshot(input.scope.shopAlias, productId) : null };
    },
  };
  return { catalog, policy: () => {
    // This port promises a current active-pointer read, including the final readback.
    resolver.invalidate(input.scope.pageId, input.channel);
    return resolver.resolve({ pageId: input.scope.pageId, channel: input.channel, now: input.clock() });
  } };
}
