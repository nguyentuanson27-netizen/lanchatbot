import { describe, expect, it, vi } from "vitest";
import { ProductSearchService } from "@lana/business-tools";
import { createCommerceReadSources } from "./single-agent-commerce-read-only-sources.js";
import { commerceScope, commerceNow, fixtureProduct } from "./single-agent-commerce.test-support.js";

describe("scoped read-only source composition", () => {
  async function setup(channel: "CANARY_SHADOW" | "PUBLISHED" = "CANARY_SHADOW") {
    const f = fixtureProduct();
    const catalog = { findByExactCode: vi.fn(async () => f.product), findByAlias: async () => [],
      searchStableText: async () => [{ document: f.product, score: 0.99 }], searchStableImage: async () => [] };
    const policyStore = { loadActivePointers: vi.fn(async () => []), savePin: vi.fn(), appendAudit: vi.fn() };
    const facts = { readCatalogSnapshot: vi.fn(async () => f.snapshot) };
    const sources = createCommerceReadSources({ scope: commerceScope(), channel, clock: () => commerceNow,
      policyStore, catalog, search: new ProductSearchService(catalog, { textMinScore: 0.8, imageMinScore: 0.8, minTopGap: 0.05, maxCandidates: 3 }), facts });
    return { sources, catalog, policyStore, facts, f };
  }
  it("binds text search to canonical identity and reads current Qdrant/POS data", async () => {
    const s = await setup();
    await s.sources.catalog.searchText("SM613");
    const read = await s.sources.catalog.readProduct("SM613");
    expect(read.product.productId).toBe("SM613");
    expect(s.facts.readCatalogSnapshot).toHaveBeenCalledWith("LANA", "SM613");
    expect(s.catalog.findByExactCode).toHaveBeenCalledTimes(2);
  });
  it("does not allow a model-selected unbound identity or a source identity swap", async () => {
    const s = await setup();
    await expect(s.sources.catalog.readProduct("OTHER")).rejects.toThrow();
    expect(s.facts.readCatalogSnapshot).not.toHaveBeenCalled();
    await s.sources.catalog.searchText("SM613");
    s.catalog.findByExactCode.mockResolvedValue(fixtureProduct("OTHER").product);
    await expect(s.sources.catalog.readProduct("SM613")).rejects.toThrow();
    expect(s.facts.readCatalogSnapshot).not.toHaveBeenCalled();
  });
  it("supplies only active-pointer reads to the resolver, with no pin or audit writes", async () => {
    const s = await setup();
    await s.sources.policy();
    expect(s.policyStore.loadActivePointers).toHaveBeenCalledWith({ pageId: commerceScope().pageId, channel: "CANARY_SHADOW" });
    expect(s.policyStore.savePin).not.toHaveBeenCalled();
    expect(s.policyStore.appendAudit).not.toHaveBeenCalled();
  });
  it("reads the explicitly configured PUBLISHED channel without pin or audit writes", async () => {
    const s = await setup("PUBLISHED");
    await s.sources.policy();
    expect(s.policyStore.loadActivePointers).toHaveBeenCalledWith({ pageId: commerceScope().pageId, channel: "PUBLISHED" });
    expect(s.policyStore.savePin).not.toHaveBeenCalled();
    expect(s.policyStore.appendAudit).not.toHaveBeenCalled();
  });
});
