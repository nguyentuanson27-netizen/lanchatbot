import { describe, expect, it, vi } from "vitest";
import { RuntimePolicyResolver } from "@lana/chat-runtime";
import { buildProductAttributesV1 } from "@lana/business-tools";
import { canonicalJsonV1, CustomerCarePolicyAdminContentV1Schema } from "@lana/contracts";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { commerceNow, commerceScope, fixturePolicy, fixturePolicyPointers, fixtureProduct } from "./single-agent-commerce.test-support.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { hardPrecheck, makeBinding, finalGate } from "./single-agent-semantic-verifier-boundary.js";

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
const sellingFixture = (prices: Record<string, number>) => {
  const f = fixtureProduct(), template = f.snapshot.offers.DIRECT!;
  f.snapshot.offers = Object.fromEntries(Object.entries(prices).map(([offer, price]) => [offer, {
    ...structuredClone(template), sale_price: price,
    rows: template.rows.map(r => ({ ...r, offer_type: offer, sale_price: price })),
  }]));
  const readProduct = vi.fn(async () => structuredClone(f));
  const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
    initialProducts: [f.product], catalog: { readProduct, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  return { f, readProduct, tools };
};
describe("read-only domain tools", () => {
  it("uses checkout region priority for southern addresses and binds the resolved source key",async()=>{
    const {f,tools}=sellingFixture({DIRECT:499000});
    f.snapshot.fulfillment_policy={tinh_trang:"READY_STOCK",can_order_when_zero:false,prep_min_days:1,prep_max_days:2,zero_stock_policy:"",zero_stock_prep_min_days:null,zero_stock_prep_max_days:null,eta_valid_until:" "};
    f.snapshot.shipping_eta={"MIEN-NAM":{transit_min_days:2,transit_max_days:4},TOAN_QUOC:{transit_min_days:3,transit_max_days:5}};
    const result=await tools.invoke({name:"read_product",args:{subjectRef:"SM613",deliveryRegion:"Cần Thơ"}});
    expect(result).toMatchObject({status:"OK",data:{availability:{eta:{status:"OK"}},facts:expect.arrayContaining([expect.objectContaining({type:"ETA",value:{minDays:3,maxDays:6}})])}});
    expect(tools.snapshot().policyLiterals.map(p=>JSON.parse(p.text))).toContainEqual(expect.objectContaining({deliveryRegion:"MIEN-NAM"}));
    const before=makeBinding("turn","Dự kiến 3–6 ngày.",tools.snapshot());
    expect(makeBinding("turn","Dự kiến 3–6 ngày.",await tools.readback())).toEqual(before);
  });

  it("keeps repeated reads stable but binds a new POS observation even when business values match", async () => {
    const { f, tools } = sellingFixture({ DIRECT: 499_000 });
    f.snapshot.synced_at = new Date(commerceNow.getTime() - 60_000).toISOString();
    await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: "DIRECT" } });
    const before = tools.snapshot(), binding = makeBinding("turn", "Giá 499k chị nhé.", before);
    expect(makeBinding("turn", "Giá 499k chị nhé.", await tools.readback())).toEqual(binding);
    f.snapshot.synced_at = new Date(commerceNow.getTime() - 1_000).toISOString();
    const after = await tools.readback();
    const businessValues = (context: typeof before) => context.protectedClaims.map(raw => {
      const claim = raw as { type: string; scope: unknown; value: unknown };
      return { type: claim.type, scope: claim.scope, value: claim.value };
    });
    expect(businessValues(after)).toEqual(businessValues(before));
    expect(hardPrecheck(after, "Giá 499k chị nhé.", commerceNow)).toBeNull();
    expect(makeBinding("turn", "Giá 499k chị nhé.", after).trustedSnapshotId).not.toBe(binding.trustedSnapshotId);
  });
  it("rejects search overflow before exposing or binding unretained product evidence", async () => {
    const records = Array.from({ length: 7 }, (_, i) => fixtureProduct(`TEST${i + 1}`));
    const searchText = vi.fn(async (query: string) => ({ status: "AMBIGUOUS" as const, reasonCode: "TOP_GAP_TOO_SMALL" as const,
      candidates: (query === "first" ? records.slice(1, 4) : records.slice(4)).map(f => ({ document: f.product, score: 0.8 })) }));
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [records[0]!.product], catalog: { searchText,
        readProduct: async id => structuredClone(records.find(f => f.product.productId === id)!) } });
    await tools.prepare();
    expect((await tools.invoke({ name: "search_products", args: { query: "first" } })).status).toBe("OK");
    const before = tools.snapshot();
    expect(before.runtimeProducts).toHaveLength(4);
    expect(await tools.invoke({ name: "search_products", args: { query: "second" } }))
      .toEqual({ status: "REJECTED", reason: "PRODUCT_BOUND" });
    expect(tools.snapshot()).toEqual(before);
    expect(hardPrecheck(tools.snapshot(), "Em chọn mẫu này cho chị.", commerceNow)).toBeNull();
    expect(await tools.readback()).toEqual(before);
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "TEST2" } })).status).toBe("OK");
    expect(tools.snapshot().runtimeProducts).toHaveLength(4);
  });
  it("keeps concurrent searches within the same product budget without partial admission", async () => {
    const groups = [Array.from({ length: 3 }, (_, i) => fixtureProduct(`A${i}`)),
      Array.from({ length: 3 }, (_, i) => fixtureProduct(`B${i}`))];
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      catalog: { searchText: async query => ({ status: "AMBIGUOUS", reasonCode: "TOP_GAP_TOO_SMALL",
        candidates: groups[Number(query)]!.map(f => ({ document: f.product, score: 0.8 })) }),
      readProduct: async () => fixtureProduct() } });
    const results = await tools.invokeBatch([0, 1].map(n => ({ name: "search_products", args: { query: String(n) } })));
    expect(results.map(r => r.status).sort()).toEqual(["OK", "REJECTED"]);
    expect(tools.snapshot().runtimeProducts).toHaveLength(3);
    expect(tools.snapshot().boundSubjects).toHaveLength(3);
  });
  it("does not leave bound subjects behind when a search candidate fails source validation", async () => {
    const f = fixtureProduct(); f.product.observedAt = "2099-01-01T00:00:00.000Z";
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      catalog: { searchText: async () => ({ status: "MATCHED", matchKind: "EXACT_CODE", product: f.product, score: 1, gap: null }),
        readProduct: async () => f } });
    const before = tools.snapshot();
    expect((await tools.invoke({ name: "search_products", args: { query: "SM613" } })).status).toBe("UNAVAILABLE");
    expect(tools.snapshot()).toEqual(before);
  });
  it("rejects a fifth product read without dropping earlier source or claims", async () => {
    const records = Array.from({ length: 5 }, (_, i) => fixtureProduct(`READ${i}`));
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: records.map(f => f.product), catalog: {
        searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }),
        readProduct: async id => ({ product: records.find(f => f.product.productId === id)!.product, snapshot: null }) } });
    for (const f of records.slice(0, 4)) expect((await tools.invoke({ name: "read_product", args: { subjectRef: f.product.productId } })).status).toBe("OK");
    const before = tools.snapshot();
    expect(await tools.invoke({ name: "read_product", args: { subjectRef: "READ4" } })).toEqual({ status: "REJECTED", reason: "PRODUCT_BOUND" });
    expect(tools.snapshot()).toEqual(before);
  });
  it("uses the supplied product code for lookup even when a garment query accompanies it", async () => {
    const f = fixtureProduct(), searchText = vi.fn(async () => ({ status: "MATCHED" as const,
      matchKind: "EXACT_CODE" as const, product: f.product, score: 1, gap: null }));
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      catalog: { searchText, readProduct: async () => f } });
    expect((await tools.invoke({ name: "search_products", args: { productCode: " sm613 ", query: "sơ mi SM613" } })).status).toBe("OK");
    expect(searchText).toHaveBeenCalledWith("SM613");
    expect(tools.snapshot().boundSubjects.map(s => s.ref)).toEqual(["SM613"]);
  });
  it("does not overflow on readback when a previously empty search source gains content", async () => {
    const records = Array.from({ length: 5 }, (_, i) => fixtureProduct(`LATER${i}`));
    const partial = structuredClone(records[4]!.product); delete partial.observedAt; delete partial.attributes;
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      catalog: { searchText: async query => ({ status: "MATCHED", matchKind: "EXACT_CODE", score: 1, gap: null,
        product: query === "LATER4" ? partial : records.find(f => f.product.productId === query)!.product }),
        readProduct: async id => structuredClone(records.find(f => f.product.productId === id)!) } });
    for (const f of records) expect((await tools.invoke({ name: "search_products", args: { productCode: f.product.productId } })).status).toBe("OK");
    const before = tools.snapshot(); expect(before.runtimeProducts).toHaveLength(4);
    await expect(tools.readback()).rejects.toThrow("PRODUCT_BOUND");
    expect(tools.snapshot()).toEqual(before);
  });
  it("does not bind a similar product as the requested code, or treat an empty code as discovery", async () => {
    const { tools } = setup();
    expect(await tools.invoke({ name: "search_products", args: { productCode: "NOT999" } }))
      .toMatchObject({ status: "OK", data: { status: "NOT_FOUND", subjects: [], products: [] } });
    expect(tools.snapshot().boundSubjects).toEqual([]);
    expect(await tools.invoke({ name: "search_products", args: { productCode: "", query: "sơ mi" } }))
      .toEqual({ status: "REJECTED", reason: "TOOL_ARGUMENTS" });
  });
  it("withdraws attributes missing from the current preparation readback instead of retaining old evidence", async () => {
    const { tools, f } = sellingFixture({ DIRECT: 499_000 });
    await tools.prepare();
    const before = tools.snapshot();
    expect(before.runtimeProducts?.[0]?.attributes).toBeTruthy();
    delete f.product.attributes;
    const after = await tools.readback();
    expect(after.runtimeProducts?.[0]?.attributes).toBeUndefined();
    expect(after.runtimeProducts?.[0]?.content).toBeTruthy();
    expect(after.state.factSnapshotVersion).not.toBe(before.state.factSnapshotVersion);
  });
  it("prepares offers and content without price/stock variants or full-read dependencies", async () => {
    const { tools, f, readProduct } = sellingFixture({ COMPOSITE: 1_065_000, AO: 645_000 });
    expect(await tools.prepare()).toBe(1);
    const before = tools.snapshot();
    expect(before.protectedClaims).toEqual([]);
    expect(before.boundSubjects.map(s => s.kind)).toEqual(["PRODUCT"]);
    expect(before.state.currentProductId).toBe(null);
    expect(before.policyLiterals.find(p => p.ref === "offers:SM613")?.text).toContain('"AO"');
    f.snapshot.offers.AO!.sale_price = 650_000;
    f.snapshot.offers.AO!.rows[0]!.sale_price = 650_000;
    expect(await tools.readback()).toEqual(before);
    expect(readProduct).toHaveBeenCalledTimes(2);
  });
  it("retains content and an explicit missing-offer status when POS is unavailable", async () => {
    const f = fixtureProduct(), tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow,
      initialProducts: [f.product], policy: () => fixturePolicy(), catalog: {
        readProduct: async () => ({ product: f.product, snapshot: null }),
        searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }),
      } });
    await tools.prepare();
    expect(tools.snapshot().runtimeProducts?.[0]?.content).toBeTruthy();
    expect(JSON.parse(tools.snapshot().policyLiterals.find(p => p.ref === "preparation:SM613")!.text))
      .toMatchObject({ subjectRef: "SM613", availability: { content: { status: "OK" }, offers: { status: "UNAVAILABLE", reason: "SOURCE_UNAVAILABLE" } } });
    expect(tools.snapshot().protectedClaims).toEqual([]);
  });
  it("reads all selling-option prices from one snapshot while keeping the top-level default price scoped", async () => {
    const { tools, readProduct, f } = sellingFixture({ COMPOSITE: 1_065_000, AO: 645_000 });
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(readProduct).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ status: "OK", data: { offerType: "COMPOSITE", requestedOfferType: null,
      facts: expect.arrayContaining([{ type: "PRICE", scope: expect.objectContaining({ variantId: "offer:SM613:COMPOSITE" }), value: { amountVnd: 1_065_000, currency: "VND" } }]),
      sellingOptions: [
        expect.objectContaining({ offerType: "AO", variantId: "offer:SM613:AO", sourceVersion: "pos-v1", observedAt: f.snapshot.synced_at,
          expiresAt: new Date(commerceNow.getTime() + 1200_000).toISOString(),
          facts: expect.arrayContaining([{ type: "PRICE", scope: expect.objectContaining({ variantId: "offer:SM613:AO" }), value: { amountVnd: 645_000, currency: "VND" } }]) }),
        expect.objectContaining({ offerType: "COMPOSITE", variantId: "offer:SM613:COMPOSITE" }),
      ] } });
    expect(tools.snapshot().protectedClaims).toHaveLength(4);
    expect(hardPrecheck(tools.snapshot(), "Áo lẻ 645k chị nhé.", commerceNow)).toBeNull();
    const before = makeBinding("turn", "Áo lẻ 645k chị nhé.", tools.snapshot());
    expect(makeBinding("turn", "Áo lẻ 645k chị nhé.", await tools.readback())).toEqual(before);
    f.snapshot.offers.AO!.sale_price = 650_000;
    f.snapshot.offers.AO!.rows[0]!.sale_price = 650_000;
    expect(makeBinding("turn", "Áo lẻ 645k chị nhé.", await tools.readback()).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
  });
  it("keeps an explicitly requested option isolated from another option with an unavailable price", async () => {
    const { tools, f } = sellingFixture({ COMPOSITE: 1_065_000, AO: 645_000 });
    f.snapshot.offers.COMPOSITE!.price_status = "PRICE_NOT_FOUND";
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: "AO" } });
    expect(result).toMatchObject({ status: "OK", data: { offerType: "AO", sellingOptions: [expect.objectContaining({ offerType: "AO" })] } });
    expect(tools.snapshot().protectedClaims).toHaveLength(2);
    expect(JSON.stringify(tools.snapshot().protectedClaims)).not.toContain("1065000");
  });
  it("retains a usable component and product content when the default offer cannot supply facts", async () => {
    const { tools, f } = sellingFixture({ COMPOSITE: 1_065_000, AO: 645_000 });
    f.snapshot.offers.COMPOSITE!.price_status = "PRICE_NOT_FOUND";
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(result).toMatchObject({ status: "OK", data: { offerType: null, sellingOptions: [
      { offerType: "AO", availability: { price: { status: "OK" } } },
      { offerType: "COMPOSITE", facts: [], availability: { price: { status: "ERROR" } } },
    ] } });
    expect(tools.snapshot().protectedClaims).toHaveLength(2);
    expect(tools.snapshot().runtimeProducts).toHaveLength(1);
  });
  it("binds each option's filters and ETA even when two offers share a source SKU", async () => {
    const { tools, f } = sellingFixture({ COMPOSITE: 1_065_000, AO: 645_000 });
    f.snapshot.fulfillment_policy = { tinh_trang: "READY_STOCK", can_order_when_zero: false, prep_min_days: 1,
      prep_max_days: 2, zero_stock_policy: "", zero_stock_prep_min_days: null, zero_stock_prep_max_days: null, eta_valid_until: "" };
    f.snapshot.shipping_eta = { HANOI: { transit_min_days: 2, transit_max_days: 4 } };
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", size: "M", color: "navy", deliveryRegion: "HANOI" } });
    expect(result).toMatchObject({ status: "OK", data: { sellingOptions: [
      { offerType: "AO", variantId: "offer:SM613:AO", availability: { eta: { status: "OK" } } },
      expect.objectContaining({ offerType: "COMPOSITE", variantId: "offer:SM613:COMPOSITE" }),
    ] } });
    const filter = tools.snapshot().policyLiterals.map(p => JSON.parse(p.text)).find(p => p.sellingOptions);
    expect(filter).toMatchObject({ productId: "SM613", sellingOptions: [
      expect.objectContaining({ offerType: "AO", size: "M", color: "navy", deliveryRegion: "HANOI", etaClaimId: expect.any(String) }),
      expect.objectContaining({ offerType: "COMPOSITE", size: "M", color: "navy", deliveryRegion: "HANOI", stockClaimId: expect.any(String) }),
    ] });
    expect(tools.snapshot().protectedClaims).toHaveLength(6);
    expect(hardPrecheck(tools.snapshot(), "Giá theo từng lựa chọn.", commerceNow)).toBeNull();
    const before = makeBinding("turn", "Giá theo từng lựa chọn.", tools.snapshot());
    expect(makeBinding("turn", "Giá theo từng lựa chọn.", await tools.readback())).toEqual(before);
  });
  it("rejects option expansion beyond the existing subject bound without a partial list or partial context write", async () => {
    const { tools } = sellingFixture({ COMBO_3: 900_000, COMPOSITE: 800_000, SET_VAY: 700_000, SET_CV: 600_000,
      SET_QUAN: 500_000, SET: 400_000, DIRECT: 300_000, AO: 200_000 });
    const before = tools.snapshot();
    expect(await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).toEqual({ status: "REJECTED", reason: "SUBJECT_BOUND" });
    expect(tools.snapshot()).toEqual(before);
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: "AO" } })).status).toBe("OK");
  });
  it("distinguishes confirmed empty selling options from absent or stale POS", async () => {
    const { tools, f } = sellingFixture({ AO: 645_000 });
    f.snapshot.offers = {};
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).data).toMatchObject({ availableOffers: [], sellingOptions: [] });
    f.snapshot.synced_at = "2026-10-01T00:00:00.000Z";
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).data).toMatchObject({ availableOffers: null, sellingOptions: null });
  });
  it("preserves the existing claim bound across independently filtered multi-option reads", async () => {
    const { tools, f } = sellingFixture({ COMPOSITE: 800_000, SET_VAY: 700_000, SET_CV: 600_000,
      SET_QUAN: 500_000, SET: 400_000, DIRECT: 300_000, AO: 200_000 });
    f.snapshot.fulfillment_policy = { tinh_trang: "READY_STOCK", can_order_when_zero: false, prep_min_days: 1,
      prep_max_days: 2, zero_stock_policy: "", zero_stock_prep_min_days: null, zero_stock_prep_max_days: null, eta_valid_until: "" };
    f.snapshot.shipping_eta = { A: { transit_min_days: 1, transit_max_days: 2 }, B: { transit_min_days: 2, transit_max_days: 3 },
      C: { transit_min_days: 3, transit_max_days: 4 } };
    for (const deliveryRegion of ["A", "B"]) expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", deliveryRegion } })).status).toBe("OK");
    expect(tools.snapshot().protectedClaims).toHaveLength(28);
    expect(tools.snapshot().boundSubjects).toHaveLength(8);
    const before = tools.snapshot();
    expect(await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", deliveryRegion: "C" } })).toEqual({ status: "REJECTED", reason: "CLAIM_BOUND" });
    expect(tools.snapshot()).toEqual(before);
    expect(await tools.readback()).toEqual(before);
  });
  it("binds available selling options to the same current verifier snapshot and invalidates changed options", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => structuredClone(f) } });
    const first = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: "DIRECT" } });
    expect(first.data).toMatchObject({ availableOffers: ["DIRECT"] });
    expect(tools.snapshot().policyLiterals.map(p => JSON.parse(p.text))).toContainEqual({ productId: "SM613", availableOffers: ["DIRECT"] });
    const before = makeBinding("turn", "Có bán riêng áo.", tools.snapshot());
    expect(makeBinding("turn", "Có bán riêng áo.", await tools.readback())).toEqual(before);
    f.snapshot.offers.AO = { ...structuredClone(f.snapshot.offers.DIRECT!),
      rows: f.snapshot.offers.DIRECT!.rows.map(r => ({ ...r, offer_type: "AO" })) };
    expect(makeBinding("turn", "Có bán riêng áo.", await tools.readback())).not.toEqual(before);
  });
  it("never represents unavailable or stale selling options as verified absence", async () => {
    const f = fixtureProduct(), { catalog } = setup(); let available = true;
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => ({ ...f, snapshot: available ? f.snapshot : null }) } });
    await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    available = false;
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).data).toMatchObject({ availableOffers: null });
    expect(tools.snapshot().policyLiterals.some(p => JSON.parse(p.text).availableOffers)).toBe(false);
    available = true; f.snapshot.synced_at = "2026-10-01T00:00:00.000Z";
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).data).toMatchObject({ availableOffers: null });
  });
  it("keeps size-filtered stock attached to the code-read size when only an offer identity resolves", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    f.snapshot.offers.DIRECT!.rows.push({ ...f.snapshot.offers.DIRECT!.rows[0]!, color: "cream", parent_variation_id: "SM613-CREAM-M" });
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", size: "M" } });
    const stock = tools.snapshot().protectedClaims.find(c => (c as {type:string}).type === "STOCK") as {claimId:string};
    expect(tools.snapshot().policyLiterals.map(p => JSON.parse(p.text))).toContainEqual(expect.objectContaining({
      productId: "SM613", size: "M", color: null, stockClaimId: stock.claimId,
    }));
  });
  it("invalidates verified selling options when a fresh snapshot cannot resolve the product", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => structuredClone(f) } });
    await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    const before = makeBinding("turn", "Có bán riêng áo.", tools.snapshot());
    f.snapshot.offers = {};
    for (const status of ["PRODUCT_NOT_FOUND", "SHOP_ERROR", "ERROR"]) {
      f.snapshot.data_status = status;
      expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).data).toMatchObject({ availableOffers: null });
      expect(tools.snapshot().policyLiterals.some(p => p.ref === "offers:SM613")).toBe(false);
      expect(makeBinding("turn", "Có bán riêng áo.", await tools.readback())).not.toEqual(before);
    }
  });
  it("keeps independent offer mappings when fulfillment policy or price is missing", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    f.snapshot.data_status = "FULFILLMENT_POLICY_NOT_FOUND";
    f.snapshot.fulfillment_policy = null;
    f.snapshot.offers.DIRECT!.price_status = "PRICE_NOT_FOUND";
    f.snapshot.offers.DIRECT!.sale_price = null;
    f.snapshot.offers.DIRECT!.list_price = null;
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(result.data).toMatchObject({ availableOffers: ["DIRECT"], availability: { price: { status: "ERROR" } } });
    expect(tools.snapshot().protectedClaims).toEqual([]);
  });
  it("binds delivery ETA to the requested region and invalidates a changed delivery source", async () => {
    const f = fixtureProduct();
    f.snapshot.fulfillment_policy = { tinh_trang: "READY_STOCK", can_order_when_zero: false, prep_min_days: 1,
      prep_max_days: 2, zero_stock_policy: "", zero_stock_prep_min_days: null, zero_stock_prep_max_days: null, eta_valid_until: " " };
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
  it("exposes the source-approved payment methods without private payment or checkout data", async () => {
    const {tools}=setup(), result=await tools.invoke({name:"read_policy",args:{}});
    expect(result.data).toMatchObject({policy:{payment:{allowedMethods:["COD","BANK_TRANSFER"]}}});
    expect(JSON.stringify(result.data)).not.toMatch(/accountNumber|accountHolder|qrImageUrl|requirePhoneNumber|requireDeliveryAddress/);
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
    expect(JSON.stringify(data)).not.toContain("tryOnModeDescription");
  });
  it.each([
    { days: 15, fee: 30_000, unused: true },
    { days: 7, fee: 25_000, unused: true },
    { days: 15, fee: 30_000, unused: false },
  ])("explains inspection and exchange together without changing source rules ($days days / $fee VND / unused=$unused)", async ({ days, fee, unused }) => {
    const care = CustomerCarePolicyAdminContentV1Schema.parse({
      exchange: { windowDaysFromReceipt: days, maxExchangesPerOrder: 1, supportedActions: ["SIZE", "COLOR", "MODEL"],
        saleRestriction: { discountThresholdBps: 3000, allowedActions: ["SIZE", "COLOR"] },
        requiredConditions: { clean: true, originalTags: true, undamaged: true, unused, unwashed: true },
        totalTwoWayShippingFeeVnd: fee, modelExchangePricing: "NEW_PRODUCT_LIST_PRICE_NO_SALE",
        customerPaysPositivePriceDifference: true, fulfillmentMethod: "COURIER_SWAP" },
      returns: { eligibleReasons: ["MANUFACTURING_FABRIC_DEFECT", "MANUFACTURING_SEAM_DEFECT", "WRONG_PRODUCT_SENT"],
        reportingWindowDaysFromReceipt: 5, shopShippingCoveragePercent: 100, refundBusinessDaysMin: 1,
        refundBusinessDaysMax: 3, refundStartsAfter: "SHOP_CONFIRMS_ELIGIBLE_ERROR" },
      inspection: { tryOnMode: "HOLD_UP_ONLY", refusedParcelShippingFeeVnd: fee },
      marketplacePricing: { shopeePriceMatch: false, reason: "PLATFORM_SUBSIDY_AND_VOUCHERS" },
      customerFaq: { discloseLightingAndDisplayColorVariance: true, handWashPreferred: true,
        machineWashAllowedWithLaundryBagAndGentleCycle: true },
    });
    const pointers = fixturePolicyPointers().map(p => {
      const content = p.version.content.kind === "SHOP_POLICY" ? { ...p.version.content, customerCare: care } : p.version.content;
      return { ...p, version: { ...p.version, content, contentHash: `sha256:${commerceHash(content)}` } };
    });
    const resolver = new RuntimePolicyResolver({ loadActivePointers: async () => pointers }, { enabled: true });
    const resolution = await resolver.resolve({ pageId: commerceScope().pageId, channel: "CANARY_SHADOW", now: commerceNow });
    expect(resolution.status).toBe("RESOLVED");
    const original = structuredClone(resolution);
    let current = resolution;
    const { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, catalog, policy: async () => current });
    const result = await tools.invoke({ name: "read_policy", args: {} });
    const literal = tools.snapshot().policyLiterals[0]!;
    const projected = JSON.parse(literal.text);
    expect(result).toEqual({ status: "OK", data: { scope: "SHOP_RULES", orderEligibility: null,
      policy: projected, sourceVersion: literal.sourceVersion } });
    const { tryOnModeDescription, ...inspection } = projected.customerCare.inspection;
    const inspectionMeaning = "Chỉ ướm bên ngoài, không mặc vào người.";
    const exchangeMeaning = " Với đổi hàng yêu cầu chưa sử dụng, mặc thử vào người không đáp ứng điều kiện này; còn tem, chưa giặt hay chưa mặc ra ngoài không thay đổi kết luận đó. Giới hạn này áp dụng cho đổi hàng theo exchange, không tự loại trừ trả hàng do lỗi theo returns.";
    expect(tryOnModeDescription).toBe(inspectionMeaning + (unused ? exchangeMeaning : ""));
    expect({ ...projected.customerCare, inspection }).toEqual(care);
    expect(resolution).toEqual(original);
    expect(literal).toMatchObject({ ref: `policy:${literal.sourceVersion}`, observedAt: commerceNow.toISOString(), expiresAt: null });
    expect(literal.sourceVersion).toBe(commerceHash({ policyVersion: resolution.bundle!.policy.policyVersion,
      references: [...resolution.bundle!.versionReferences].sort((a, b) => a.artifactKey.localeCompare(b.artifactKey)) }));
    const binding = makeBinding("turn", "Quy định theo nguồn hiện hành.", tools.snapshot());
    if (unused) {
      const beforeExplanation = structuredClone(tools.snapshot());
      const oldPolicy = JSON.parse(beforeExplanation.policyLiterals[0]!.text);
      oldPolicy.customerCare.inspection.tryOnModeDescription = inspectionMeaning;
      beforeExplanation.policyLiterals[0]!.text = canonicalJsonV1(oldPolicy);
      // Upstream source identity stays the same; exact trusted meaning still binds the verdict.
      expect(beforeExplanation.policyLiterals[0]!.sourceVersion).toBe(literal.sourceVersion);
      expect(makeBinding("turn", "Quy định theo nguồn hiện hành.", beforeExplanation).trustedSnapshotId).not.toBe(binding.trustedSnapshotId);
    }
    expect(makeBinding("turn", "Quy định theo nguồn hiện hành.", await tools.readback())).toEqual(binding);
    current = await fixturePolicy();
    const withoutCare = await tools.readback();
    expect(JSON.parse(withoutCare.policyLiterals[0]!.text).customerCare).toBeNull();
    expect(JSON.stringify(withoutCare)).not.toContain("tryOnModeDescription");
    expect(makeBinding("turn", "Quy định theo nguồn hiện hành.", withoutCare).trustedSnapshotId).not.toBe(binding.trustedSnapshotId);
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

 it.each([true,false])("offers the existing price card only for first contact (%s)",async firstContact=>{
 const f=fixtureProduct();const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,
 entry:{firstContact,fromAd:true},initialProducts:[f.product],catalog:{readProduct:async()=>f,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 const r=await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId}});
 const card=(r.data as {openingQuote?:{text:string}}).openingQuote;
 if(firstContact){expect(card?.text).toContain("499.000đ");expect(card?.text).toContain("Chất liệu: cotton");expect(card?.text).toContain("Form dáng: suông");expect(card?.text).toContain("Size: M");}
 else expect(card).toBeUndefined();
 });

it.each(["missing-price","stale","ambiguous-offer"])("does not supply an opening price card for %s",async fault=>{
 const f=fault==="ambiguous-offer"?sellingFixture({AO:300000,SET:700000}).f:fixtureProduct();
 if(fault==="stale")f.snapshot.synced_at="2020-01-01T00:00:00.000Z";
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,entry:{firstContact:true,fromAd:false},initialProducts:[f.product],
 catalog:{readProduct:async()=>({...f,snapshot:fault==="missing-price"?null:f.snapshot}),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 const r=await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId}});
 expect((r.data as {openingQuote?:unknown})?.openingQuote).toBeUndefined();
});

it("keeps a component opening quote separate from the set price and set attributes",async()=>{
 const {f}=sellingFixture({AO:300000,SET:700000});
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,entry:{firstContact:true,fromAd:true},initialProducts:[f.product],catalog:{readProduct:async()=>f,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 const r=await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"AO"}});
 const c=(r.data as {openingQuote:{text:string}}).openingQuote;
 expect(c.text).toContain("Áo lẻ");expect(c.text).toContain("300.000đ");expect(c.text).not.toContain("700.000đ");expect(c.text).not.toContain("Chất liệu:");
});

it.each([false, true])("uses verified opening-quote attributes even when search fields disagree (empty=%s)", async empty => {
  const f = fixtureProduct();
  f.product.materials = ["lụa"];
  f.product.silhouettes = ["ôm"];
  if (empty) {
    const { schemaVersion: _schemaVersion, productId, metadata, ...data } = f.product.attributes!;
    f.product.attributes = buildProductAttributesV1({ productId, observedAt: metadata.observedAt,
      data: { ...data, materials: [], silhouettes: [] } });
  }
  const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: fixturePolicy,
    entry: { firstContact: true, fromAd: true }, initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  const result = await tools.invoke({ name: "read_product", args: { subjectRef: f.product.productId } });
  const card = (result.data as { openingQuote: { text: string } }).openingQuote.text;
  expect(card).toContain("499.000đ");
  expect(card).toContain("Size: M");
  expect(card).not.toContain("lụa");
  expect(card).not.toContain("ôm");
  if (empty) {
    expect(card).not.toContain("Chất liệu:");
    expect(card).not.toContain("Form dáng:");
  } else {
    expect(card).toContain("Chất liệu: cotton");
    expect(card).toContain("Form dáng: suông");
  }
});

it.each(["AO", "CV", "QUAN"])("does not assign parent attributes to the only remaining %s offer", async offerType => {
  const { f } = sellingFixture({ [offerType]: 300000 });
  const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: fixturePolicy,
    entry: { firstContact: true, fromAd: true }, initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  // Both inferred and explicitly requested sole components must keep the same scope.
  for (const args of [{ subjectRef: f.product.productId }, { subjectRef: f.product.productId, offerType }]) {
    const result = await tools.invoke({ name: "read_product", args });
    const card = (result.data as { openingQuote: { text: string; offerType: string } }).openingQuote;
    expect(card.offerType).toBe(offerType);
    expect(card.text).toContain("300.000đ");
    expect(card.text).toContain("Size: M");
    expect(card.text).not.toContain("Chất liệu:");
    expect(card.text).not.toContain("Form dáng:");
  }
});

it("shares scoped positive-stock sizes with owner and verifier and invalidates a size-only source change", async () => {
  const f = fixtureProduct(), row = f.snapshot.offers.DIRECT!.rows[0]!;
  f.snapshot.offers.DIRECT!.rows.push({ ...row, size: "L", stock_quantity: 0 },
    { ...row, size: "XL", color: "white", stock_quantity: 2 });
  const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: fixturePolicy,
    entry: { firstContact: true, fromAd: true }, initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", offerType: "DIRECT", color: "navy" } });
  const data = result.data as { sizeAvailability: unknown; openingQuote: { text: string } };
  expect(data.sizeAvailability).toMatchObject({ offerType: "DIRECT", color: "navy", confirmedInStockSizes: ["M"] });
  expect(data.openingQuote.text).toContain("Size: M");
  const trusted = tools.snapshot();
  const literal = trusted.policyLiterals.find(p => JSON.parse(p.text).sizeAvailability);
  expect(JSON.parse(literal!.text).sizeAvailability).toEqual(data.sizeAvailability);
  const draft = "Size M còn chị nhé.", binding = makeBinding("turn", draft, trusted);
  // Total quantity and source timestamps stay unchanged; only size identities change.
  f.snapshot.offers.DIRECT!.rows[0]!.size = "S";
  const current = await tools.readback();
  expect(makeBinding("turn", draft, current)).not.toEqual(binding);
  expect(finalGate({ expected: binding, response: { kind: "VERDICT", binding, result: { verdict: "PASS", violations: [] } },
    current, finalDraft: draft, now: commerceNow, fallback: { id: "C3_A_NONPROTECTED_V2", text: "Phần này em chưa trả lời được, chị nhé." } }).disposition).not.toBe("SEND_ELIGIBLE");
});

it.each(["empty", "unknown", "size-filter", "stale"])("does not expand confirmed in-stock sizes from %s evidence", async mode => {
  const f = fixtureProduct();
  if (mode === "empty") f.snapshot.offers.DIRECT!.rows[0]!.stock_quantity = 0;
  if (mode === "unknown") f.snapshot.offers.DIRECT!.rows[0]!.stock_quantity = null;
  if (mode === "size-filter") f.snapshot.offers.DIRECT!.rows.push({ ...f.snapshot.offers.DIRECT!.rows[0]!, size: "L" });
  if (mode === "stale") f.snapshot.synced_at = "2020-01-01T00:00:00.000Z";
  const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: fixturePolicy,
    entry: { firstContact: true, fromAd: true }, initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", ...(mode === "size-filter" ? { size: "M" } : {}) } });
  const data = result.data as { sizeAvailability: { confirmedInStockSizes: string[]; unlistedSizeMeaning: string } | null; openingQuote?: { text: string } };
  if (mode === "stale") {
    expect(data.sizeAvailability).toBeNull();
    expect(data.openingQuote).toBeUndefined();
    expect(tools.snapshot().policyLiterals.some(p => JSON.parse(p.text).sizeAvailability)).toBe(false);
  } else {
    expect(data.sizeAvailability).toMatchObject({ confirmedInStockSizes: mode === "size-filter" ? ["M"] : [], unlistedSizeMeaning: "NOT_CONFIRMED" });
    if (mode !== "size-filter") expect(data.openingQuote?.text).not.toContain("Size:");
  }
});
