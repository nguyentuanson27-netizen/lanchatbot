import { describe, expect, it, vi } from "vitest";
import { ProductSearchService } from "@lana/business-tools";
import { createCommerceReadSources } from "./single-agent-commerce-read-only-sources.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { makeBinding, finalGate } from "./single-agent-semantic-verifier-boundary.js";
import { commerceScope, commerceNow, fixtureProduct, fixturePolicyPointers } from "./single-agent-commerce.test-support.js";

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
  it("rechecks search-only product content without depending on an unrelated POS read", async () => {
    const s = await setup();
    const tools = createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,...s.sources});
    expect((await tools.invoke({name:"search_products",args:{query:"SM613"}})).status).toBe("OK");
    const before = makeBinding("turn","Áo cotton.",tools.snapshot());
    s.facts.readCatalogSnapshot.mockRejectedValue(new Error("POS_UNAVAILABLE"));
    expect(makeBinding("turn","Áo cotton.",await tools.readback())).toEqual(before);
    expect(s.facts.readCatalogSnapshot).not.toHaveBeenCalled();
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
  it.each(["CHANGED", "UNAVAILABLE"] as const)("policy readback bypasses resolver cache within five seconds: %s", async mode => {
    const s = await setup(); let fee = 25_000, failed = false;
    const sources = createCommerceReadSources({ scope:commerceScope(),channel:"CANARY_SHADOW",clock:()=>commerceNow,
      policyStore:{loadActivePointers:async()=>{if(failed)throw new Error("DATABASE_UNAVAILABLE");return fixturePolicyPointers(fee);}},
      catalog:s.catalog,search:new ProductSearchService(s.catalog,{textMinScore:0.8,imageMinScore:0.8,minTopGap:0.05,maxCandidates:3}),facts:s.facts });
    const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,...sources});
    expect((await tools.invoke({name:"read_policy",args:{}})).status).toBe("OK");
    const draft="Phí ship 25k chị nhé.",before=makeBinding("turn",draft,tools.snapshot());
    if(mode==="UNAVAILABLE"){
      failed=true;
      await expect(tools.readback()).rejects.toThrow("POLICY_READBACK_UNAVAILABLE");
    }else{
      fee=30_000;
      const current=await tools.readback();
      expect(JSON.parse(current.policyLiterals[0]!.text).shipping.defaultFeeVnd).toBe(30_000);
      const terminal=finalGate({expected:before,response:{kind:"VERDICT",binding:before,result:{verdict:"PASS",violations:[]}},
        current,finalDraft:draft,now:commerceNow,fallback:{id:"C3_A_NONPROTECTED_V2",text:"Phần này em chưa trả lời được, chị nhé."}});
      expect(terminal.disposition).not.toBe("SEND_ELIGIBLE");
    }
  });
});
