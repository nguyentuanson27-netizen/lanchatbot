import { describe, expect, it } from "vitest";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureProduct } from "./single-agent-commerce.test-support.js";
import { finalGate, hardPrecheck, makeBinding } from "./single-agent-semantic-verifier-boundary.js";

function fixture() {
  const f = fixtureProduct();
  let now = new Date(commerceNow), missing = false, failed = false;
  f.snapshot.synced_at = new Date(now.getTime() - 60_000).toISOString();
  f.snapshot.offers.AO = structuredClone(f.snapshot.offers.DIRECT!);
  f.snapshot.fulfillment_policy = { tinh_trang: "READY_STOCK", can_order_when_zero: false,
    prep_min_days: 1, prep_max_days: 2, zero_stock_policy: "", zero_stock_prep_min_days: null,
    zero_stock_prep_max_days: null, eta_valid_until: new Date(now.getTime() + 600_000).toISOString() };
  f.snapshot.shipping_eta = { "MIEN-NAM": { transit_min_days: 2, transit_max_days: 4 } };
  const create = () => createReadOnlyTools({ scope: commerceScope(), clock: () => now, policy: fixturePolicy,
    initialProducts: [f.product], catalog: { readProduct: async () => {
      if (failed) throw new Error("SOURCE_FAILURE");
      return { product: structuredClone(f.product), snapshot: missing ? null : structuredClone(f.snapshot) };
    }, searchText: async () => ({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"}) } });
  return { f, tools: create(), create, time: (v: Date) => { now = v; }, missing: () => { missing = true; },
    fail: (v: boolean) => { failed = v; } };
}
const draft = "Áo 499.000đ chị nhé.";

describe("request-local POS observation pin", () => {
  it.each(["single", "filtered", "compare"])("keeps the exact verified context through synced_at-only refresh (%s)", async mode => {
    const { f, tools } = fixture();
    const args = { subjectRef: f.product.productId, ...(mode === "compare" ? {offerTypes:["DIRECT","AO"]}
      : {offerType:"DIRECT", ...(mode === "filtered" ? {color:"navy",size:"M",deliveryRegion:"Cần Thơ"} : {})}) };
    expect((await tools.invoke({name:"read_product",args})).status).toBe("OK");
    const before = tools.snapshot(), binding = makeBinding("refresh", draft, before);
    f.snapshot.synced_at = commerceNow.toISOString();
    const current = await tools.readback();
    expect(current).toEqual(before);
    expect(finalGate({expected:binding,response:{kind:"VERDICT",binding,result:{verdict:"PASS",violations:[]}},
      current,finalDraft:draft,now:commerceNow}).disposition).toBe("SEND_ELIGIBLE");
    expect(f.snapshot.synced_at).toBe(commerceNow.toISOString());
  });

  const mutations: [string, (f: ReturnType<typeof fixtureProduct>) => void][] = [
    ["price", f => { f.snapshot.offers.DIRECT!.sale_price = 600_000; }],
    ["stock", f => { f.snapshot.offers.DIRECT!.rows[0]!.stock_quantity = 1; }],
    ["stock-status", f => { f.snapshot.offers.DIRECT!.rows[0]!.stock_status = "ERROR"; }],
    ["color", f => { f.snapshot.offers.DIRECT!.rows[0]!.color = "be"; }],
    ["size", f => { f.snapshot.offers.DIRECT!.rows[0]!.size = "L"; }],
    ["sku", f => { f.snapshot.offers.DIRECT!.rows[0]!.parent_variation_id = "OTHER"; }],
    ["unprojected-row-field", f => { f.snapshot.offers.DIRECT!.rows[0]!.extra_guard = "changed"; }],
    ["unprojected-offer-field", f => { f.snapshot.offers.DIRECT!.extra_guard = "changed"; }],
    ["selling-rule", f => { f.snapshot.selling_rules.allow_component_sale = true; }],
    ["fulfillment", f => { f.snapshot.fulfillment_policy!.can_order_when_zero = true; }],
    ["eta-expiry", f => { f.snapshot.fulfillment_policy!.eta_valid_until = "2026-10-14T11:00:00.000Z"; }],
    ["regional-eta", f => { f.snapshot.shipping_eta["MIEN-NAM"]!.transit_max_days = 5; }],
    ["release", f => { f.snapshot.release_id = "pos-v2"; }],
    ["unprojected-catalog-version", f => { f.snapshot.catalog_version = "catalog-v2"; }],
    ["policy-version", f => { f.snapshot.policy_version = "policy-v2"; }],
    ["data-status", f => { f.snapshot.data_status = "ERROR"; }],
    ["shop", f => { f.snapshot.shop_alias = "OTHER"; }],
    ["product", f => { f.snapshot.product_id = "OTHER"; }],
    ["new-offer", f => { f.snapshot.offers.CV = structuredClone(f.snapshot.offers.DIRECT!); }],
  ];
  it.each(mutations)("invalidates directly and permanently on %s even with unchanged synced_at", async (_name, mutate) => {
    const { f, tools } = fixture();
    await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}});
    const old = structuredClone(f.snapshot);
    mutate(f);
    expect(f.snapshot.synced_at).toBe(old.synced_at);
    await expect(tools.readback()).rejects.toThrow();
    f.snapshot = old;
    await expect(tools.readback()).rejects.toThrow();
  });

  it.each(["future", "rollback", "stale", "null", "invalid"])("fails closed on %s source after pinning", async kind => {
    const {f,tools,missing} = fixture();
    await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}});
    if (kind === "future") f.snapshot.synced_at = new Date(commerceNow.getTime()+1).toISOString();
    if (kind === "rollback") f.snapshot.synced_at = new Date(commerceNow.getTime()-120_000).toISOString();
    if (kind === "stale") f.snapshot.synced_at = new Date(commerceNow.getTime()-3_600_000).toISOString();
    if (kind === "null") missing();
    if (kind === "invalid") f.snapshot.synced_at = "invalid";
    await expect(tools.readback()).rejects.toThrow();
  });

  it("compares observation against latest seen, not only the first observation", async () => {
    const {f,tools} = fixture();
    await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}});
    f.snapshot.synced_at = commerceNow.toISOString();
    await tools.readback();
    f.snapshot.synced_at = new Date(commerceNow.getTime()-30_000).toISOString();
    await expect(tools.readback()).rejects.toThrow();
  });

  it.each(["direct", "batch"])("keeps a source error invalidation after the source recovers (%s)", async path => {
    const {f,tools,fail} = fixture(), call = {name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}};
    await tools.invoke(call); fail(true);
    const result = path === "batch" ? (await tools.invokeBatch([call]))[0]! : await tools.invoke(call);
    expect(result.status).toBe("UNAVAILABLE");
    fail(false);
    await expect(tools.readback()).rejects.toThrow();
  });

  it("never renews original TTL, but a fresh request reads the new observation", async () => {
    const {f,tools,time,create} = fixture();
    await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}});
    const before = tools.snapshot();
    const expiry = (before.protectedClaims[0] as {provenance:{expiresAt:string}}).provenance.expiresAt;
    const at = new Date(expiry); time(at); f.snapshot.synced_at = at.toISOString();
    expect(hardPrecheck(before,draft,at)).toBe("STALE");
    await expect(tools.readback()).rejects.toThrow();
    const fresh = create();
    expect((await fresh.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}})).status).toBe("OK");
    expect((fresh.snapshot().protectedClaims[0] as {provenance:{observedAt:string}}).provenance.observedAt).toBe(at.toISOString());
  });

  it("does not pin catalog content or mask its changes", async () => {
    const {f,tools} = fixture();
    await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}});
    const binding = makeBinding("content",draft,tools.snapshot());
    f.product.title = "Tên mới";
    expect(makeBinding("content",draft,await tools.readback()).trustedSnapshotId).not.toBe(binding.trustedSnapshotId);
  });
});
