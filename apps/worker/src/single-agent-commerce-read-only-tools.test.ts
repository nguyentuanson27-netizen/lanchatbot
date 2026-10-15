import { describe, expect, it, vi } from "vitest";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureProduct } from "./single-agent-commerce.test-support.js";
import { hardPrecheck, makeBinding } from "./single-agent-semantic-verifier-boundary.js";

const setup = (options: { fee?: number } = {}) => {
  const product = fixtureProduct();
  const readProduct = vi.fn(async () => product);
  const catalog = {
      searchText: async () => ({ status: "MATCHED" as const, matchKind: "EXACT_CODE" as const,
        product: product.product, score: 1, gap: null }), readProduct,
  };
  return { readProduct, catalog, tools: createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow,
    policy: () => fixturePolicy(options.fee), catalog }) };
};
describe("read-only domain tools", () => {
  it("binds delivery ETA to the requested region and invalidates a changed delivery source", async () => {
    const f = fixtureProduct();
    f.snapshot.fulfillment_policy = { tinh_trang: "READY_STOCK", can_order_when_zero: false, prep_min_days: 1,
      prep_max_days: 2, zero_stock_policy: "", zero_stock_prep_min_days: null, zero_stock_prep_max_days: null, eta_valid_until: "" };
    f.snapshot.shipping_eta = { HANOI: { transit_min_days: 2, transit_max_days: 4 } };
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { readProduct: async () => structuredClone(f),
        searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", deliveryRegion: "HANOI" } });
    expect(result).toMatchObject({ status: "OK", data: { availability: { eta: { status: "OK" } },
      facts: expect.arrayContaining([expect.objectContaining({ type: "ETA", value: { minDays: 3, maxDays: 6 } })]) } });
    expect(tools.snapshot().policyLiterals.map(p => JSON.parse(p.text))).toContainEqual(expect.objectContaining({
      productId: "SM613", deliveryRegion: "HANOI", etaClaimId: expect.any(String) }));
    const binding = makeBinding("turn", "Dự kiến 3–6 ngày chị nhé.", tools.snapshot());
    expect(makeBinding("turn", "Dự kiến 3–6 ngày chị nhé.", await tools.readback())).toEqual(binding);
    f.snapshot.shipping_eta.HANOI!.transit_max_days = 5;
    expect(makeBinding("turn", "Dự kiến 3–6 ngày chị nhé.", await tools.readback()).trustedSnapshotId).not.toBe(binding.trustedSnapshotId);
    const missing = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", deliveryRegion: "UNKNOWN" } });
    expect(missing).toMatchObject({ status: "OK", data: { availability: { price: { status: "OK" }, stock: { status: "OK" },
      eta: { status: "NOT_FOUND" } } } });
  });
  it("search supplies source-bound static evidence without hidden POS reads and revalidates it before eligibility", async () => {
    const f = fixtureProduct(); f.product.descriptionXml = "Áo cotton dáng suông.";
    const readProduct = vi.fn(async () => structuredClone(f));
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      catalog: { searchText: async () => ({status:"MATCHED",matchKind:"EXACT_CODE",product:structuredClone(f.product),score:1,gap:null}), readProduct } });
    const found = await tools.invoke({name:"search_products",args:{query:"áo cotton"}});
    expect(found.data).toMatchObject({products:[{subjectRef:"SM613",attributes:{materials:["cotton"]},
      content:{description:"Áo cotton dáng suông."}}]});
    expect(readProduct).not.toHaveBeenCalled();
    expect(tools.snapshot().protectedClaims).toEqual([]);
    expect(tools.snapshot().runtimeProducts![0]!.content!.description).toBe("Áo cotton dáng suông.");
    const before = makeBinding("turn","Áo cotton dáng suông.",tools.snapshot());
    expect(makeBinding("turn","Áo cotton dáng suông.",await tools.readback())).toEqual(before);
    f.product.descriptionXml = "Mô tả nguồn đã đổi.";
    expect(makeBinding("turn","Áo cotton dáng suông.",await tools.readback()).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
  });
  it("policy lookup never represents a checked or approved individual exchange", async () => {
    const {tools} = setup();
    expect((await tools.invoke({name:"read_policy",args:{}})).data).toMatchObject({scope:"SHOP_RULES",orderEligibility:null});
  });
  it("search and the trusted verifier snapshot use the same existing product evidence after a full read", async () => {
    const f = fixtureProduct(); f.product.descriptionXml = "Mô tả đã đọc.";
    const catalog = {readProduct:async()=>structuredClone(f),searchText:async()=>({status:"MATCHED" as const,
      matchKind:"EXACT_CODE" as const,product:structuredClone(f.product),score:1,gap:null})};
    const tools = createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:()=>fixturePolicy(),
      initialProducts:[f.product],catalog});
    await tools.invoke({name:"read_product",args:{subjectRef:"SM613"}});
    f.product.descriptionXml = "Mô tả nguồn thay đổi giữa lượt.";
    const search = await tools.invoke({name:"search_products",args:{query:"SM613"}});
    expect((search.data as {products:unknown[]}).products).toEqual(tools.snapshot().runtimeProducts);
    expect(tools.snapshot().protectedClaims).not.toHaveLength(0);
    const before = makeBinding("turn","Mô tả đã đọc.",tools.snapshot());
    expect(makeBinding("turn","Mô tả đã đọc.",await tools.readback()).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
  });
  it("identifies the resolver's default selling offer and canonical aliases without losing price scope", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    f.snapshot.offers.SET_VAY = { ...structuredClone(f.snapshot.offers.DIRECT!), sale_price: 799_000,
      rows: f.snapshot.offers.DIRECT!.rows.map(r => ({ ...r, offer_type: "SET_VAY", sale_price: 799_000 })) };
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    const initial = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(initial.data).toMatchObject({ offerType: "SET_VAY", requestedOfferType: null,
      facts: expect.arrayContaining([expect.objectContaining({ type: "PRICE", value: { amountVnd: 799_000, currency: "VND" } })]) });
    const alias = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: " direct " } });
    expect(alias.data).toMatchObject({ offerType: "DIRECT", requestedOfferType: " direct " });
    const prices = tools.snapshot().protectedClaims.filter(c => (c as {type:string}).type === "PRICE");
    expect(prices).toHaveLength(2);
    expect(prices.map(c => (c as {scope:unknown}).scope)).toEqual(expect.arrayContaining([
      expect.objectContaining({ variantId: "offer:SM613:SET_VAY" }), expect.objectContaining({ variantId: "offer:SM613:DIRECT" }),
    ]));
    const before = makeBinding("turn", "Giá theo đúng lựa chọn.", tools.snapshot());
    expect(makeBinding("turn", "Giá theo đúng lựa chọn.", await tools.readback())).toEqual(before);
  });
  it("distinguishes absent POS, stale POS and unavailable offer without deleting independent product content", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    const missing = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => ({ ...f, snapshot: null }) } });
    expect((await missing.invoke({name:"read_product",args:{subjectRef:"SM613"}})).data).toMatchObject({
      availability: { price: {status:"UNAVAILABLE",reason:"POS_SNAPSHOT_UNAVAILABLE"}, stock:{status:"UNAVAILABLE",reason:"POS_SNAPSHOT_UNAVAILABLE"} },
    });
    expect(missing.snapshot().runtimeProducts).toHaveLength(1);
    f.snapshot.synced_at = new Date(commerceNow.getTime()-3_600_000).toISOString();
    const stale = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    expect((await stale.invoke({name:"read_product",args:{subjectRef:"SM613"}})).data).toMatchObject({
      availability: {price:{status:"STALE",reason:"CATALOG_SNAPSHOT_STALE"}}, offerType:null,
    });
    f.snapshot.synced_at = commerceNow.toISOString();
    expect((await stale.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"ABSENT"}})).data).toMatchObject({
      availability:{price:{status:"NOT_FOUND",reason:"OFFER_NOT_FOUND"}}, offerType:null,
    });
    expect(stale.snapshot().protectedClaims).toEqual([]);
  });
  it("uses the explicitly supplied source freshness bound and preserves content without POS", async () => {
    const f = fixtureProduct(), { catalog } = setup();delete f.product.attributes;
    f.snapshot.synced_at = new Date(commerceNow.getTime()-3600_000).toISOString();
    const make = (maxFactAgeSeconds: number, missing = false) => createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow,
      policy: () => fixturePolicy(), initialProducts: [f.product], maxFactAgeSeconds,
      catalog: { ...catalog, readProduct: async () => ({ ...f, snapshot: missing ? null : f.snapshot }) } });
    const accepted = make(7200), expired = make(1200), partial = make(7200,true);
    for (const t of [accepted,expired,partial]) await t.invoke({name:"read_product",args:{subjectRef:"SM613"}});
    expect(accepted.snapshot().protectedClaims.some((c: unknown) => (c as {type:string}).type === "PRICE")).toBe(true);
    expect(expired.snapshot().protectedClaims).toEqual([]);
    expect(partial.snapshot().runtimeProducts![0]!.content!.description).toBeNull();
    expect(partial.snapshot().runtimeProducts![0]!.content!.metadata.observedAt).toBe(f.product.observedAt);
  });
  it("reads source policy, keeps missing customerCare explicit and never exposes negotiation internals", async () => {
    const { tools } = setup();
    expect((await tools.invoke({ name: "read_policy", args: {} })).status).toBe("OK");
    const data = JSON.parse(tools.snapshot().policyLiterals[0]!.text);
    expect(data.shipping.defaultFeeVnd).toBe(25_000);
    expect(data.customerCare).toBeNull();
    expect(JSON.stringify(data)).not.toContain("finalConcession");
  });
  it("policy source changes invalidate old snapshots without changing prompt", async () => {
    let fee = 25_000;
    const { catalog } = setup();
    const changed = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow,
      policy: () => fixturePolicy(fee), catalog });
    await changed.invoke({ name: "read_policy", args: {} });
    const before = makeBinding("turn", "Phí theo nguồn.", changed.snapshot());
    fee = 30_000;
    const after = await changed.readback();
    expect(makeBinding("turn", "Phí theo nguồn.", after).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
  });
  it("does not treat last-known-good policy as a successful current-pointer readback", async () => {
    const { catalog } = setup(); const resolution = await fixturePolicy(); let failed = false;
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, catalog,
      policy: async () => failed ? { ...resolution, status: "LAST_KNOWN_GOOD" as const } : resolution });
    expect((await tools.invoke({ name: "read_policy", args: {} })).status).toBe("OK");
    failed = true;
    await expect(tools.readback()).rejects.toThrow("POLICY_READBACK_UNAVAILABLE");
  });
  it("rejects invented refs and privileged arguments before I/O", async () => {
    const { tools, readProduct } = setup();
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "OTHER" } })).status).toBe("REJECTED");
    expect((await tools.invoke({ name: "read_policy", args: { pageId: "other" } })).status).toBe("REJECTED");
    expect(readProduct).not.toHaveBeenCalled();
  });
  it("turns a verified search match into an allowlisted ref, then reads price/stock", async () => {
    const { tools } = setup();
    await tools.invoke({ name: "search_products", args: { query: "SM613" } });
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", color: "navy", size: "M" } })).status).toBe("OK");
    expect(tools.snapshot().protectedClaims.some((c: unknown) => (c as { type: string }).type === "PRICE")).toBe(true);
    expect(tools.snapshot().runtimeProducts![0]!.attributes!.materials).toEqual(["cotton"]);
    expect(hardPrecheck(tools.snapshot(), "Áo giá 499k chị nhé.", commerceNow)).toBeNull();
  });
  it("retains independent verified facts when another reader fails", async () => {
    const { tools } = setup();
    await tools.invoke({ name: "read_policy", args: {} });
    expect((await tools.invoke({ name: "unknown", args: {} })).status).toBe("REJECTED");
    expect(tools.snapshot().policyLiterals).toHaveLength(1);
  });
  it("does not erase a verified price because attributes are invalid", async () => {
    const f = fixtureProduct(); f.product.attributes!.materials = ["forged"];
    const { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(result.status).toBe("OK");
    expect(tools.snapshot().protectedClaims).not.toHaveLength(0);
    expect(tools.snapshot().runtimeProducts!.some(p => p.attributes)).toBe(false);
  });
  it("returns product evidence when POS is unavailable and marks price/stock missing", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => ({ ...f, snapshot: null }) } });
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(result.status).toBe("OK");
    expect(result.data).toMatchObject({ missing: expect.arrayContaining(["PRICE", "STOCK"]) });
    expect(tools.snapshot().protectedClaims).toEqual([]);
    expect(tools.snapshot().runtimeProducts).toHaveLength(1);
  });
  it("rejects cross-shop catalog data and loses old price eligibility on stale readback", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => structuredClone(f) } });
    await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    const before = makeBinding("turn", "Giá 499k.", tools.snapshot());
    f.snapshot.synced_at = "2026-10-01T00:00:00.000Z";
    expect(makeBinding("turn", "Giá 499k.", await tools.readback()).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
    f.snapshot.shop_alias = "OTHER";
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).status).toBe("STALE");
  });
  it("keeps both allowed variant claims when comparing sizes of one product", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    f.snapshot.offers.DIRECT!.rows.push({ ...f.snapshot.offers.DIRECT!.rows[0]!, size: "L", parent_variation_id: "SM613-NAVY-L" });
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    await tools.invokeBatch([ { name: "read_product", args: { subjectRef: "SM613", size: "M", color: "navy" } },
      { name: "read_product", args: { subjectRef: "SM613", size: "L", color: "navy" } } ]);
    expect(tools.snapshot().protectedClaims).toHaveLength(4);
    expect(hardPrecheck(tools.snapshot(), "Hai size đều còn chị nhé.", commerceNow)).toBeNull();
    const before = makeBinding("turn", "Hai size đều còn chị nhé.", tools.snapshot());
    expect(makeBinding("turn", "Hai size đều còn chị nhé.", await tools.readback())).toEqual(before);
  });
  it("retains current POS facts without inventing missing catalog timestamps or attributes", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    delete f.product.observedAt; delete f.product.attributes;
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).status).toBe("OK");
    expect(tools.snapshot().protectedClaims.some((c: unknown) => (c as {type: string}).type === "PRICE")).toBe(true);
    expect(tools.snapshot().runtimeProducts).toEqual([]);
    expect(f.product.observedAt).toBeUndefined();
  });
  it("selects the requested selling offer and keeps its claims distinct from another offer", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    f.snapshot.offers.AO = { ...structuredClone(f.snapshot.offers.DIRECT!), sale_price: 300_000,
      rows: f.snapshot.offers.DIRECT!.rows.map(r => ({ ...r, offer_type: "AO", sale_price: 300_000 })) };
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: "AO" } })).status).toBe("OK");
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: "DIRECT" } })).status).toBe("OK");
    const price = tools.snapshot().protectedClaims.filter((c: unknown) => (c as {type: string}).type === "PRICE");
    expect(price).toHaveLength(2);
    expect(JSON.stringify(price)).toContain("300000");
    expect(JSON.stringify(price)).toContain("499000");
    expect(JSON.stringify(price)).toContain('"variantId":"offer:SM613:AO"');
    expect(tools.snapshot().boundSubjects.some(s => s.ref === "offer:SM613:AO" && s.label.includes("AO"))).toBe(true);
    const binding = makeBinding("turn", "Giá theo lựa chọn chị nhé.", tools.snapshot());
    expect(makeBinding("turn", "Giá theo lựa chọn chị nhé.", await tools.readback())).toEqual(binding);
  });
});
