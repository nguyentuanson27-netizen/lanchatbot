import { describe, expect, it } from "vitest";
import {
  cartSelectionFromSnapshot,
  verifiedVariantFromSnapshot,
  candidateCartOptions,
  cartSelectionsHaveIndependentStockV2,
} from "./realtime-sales-catalog.js";

const observedAt = "2026-07-23T02:00:00.000Z";
const now = new Date("2026-07-23T03:00:00.000Z");

describe("candidate tuple selection",()=>{
 it("does not call a zero-stock color available or merge it into an unlabelled POS row",()=>{
  const s=snapshot(9),row=s.offers.SET.rows[0]!;row.color="__NO_COLOR__";
  for(const c of row.components)c.color="__NO_COLOR__";
  s.offers.SET.rows.push({...structuredClone(row),color:"BE",stock_quantity:0});
  const q={shopAlias:"LANA",productId:"CB182",offerType:"SET",size:"M",color:null,quantity:1,lineId:"50000000-0000-4000-8000-000000000001",selectionMode:"CANDIDATE_TUPLES" as const};
  const picked=cartSelectionFromSnapshot(s,q,now);expect(picked.status).toBe("READY");
  if(picked.status==="READY")expect(picked.line.components.every(c=>c.color==="__NO_COLOR__")).toBe(true);
  const explicit=cartSelectionFromSnapshot(s,{...q,color:"BE"},now);expect(explicit.status).toBe("OUT_OF_STOCK");
  if(explicit.status!=="READY"){expect(explicit.availableColors).toEqual([]);expect(explicit.selectionOptions?.find(o=>o.color==="BE")?.status).toBe("OUT_OF_STOCK");}
  expect(candidateCartOptions(s,{...q,quantity:10},now).some(o=>o.status==="IN_STOCK")).toBe(false);
  // Legacy matching remains unchanged and still reports ambiguity.
  expect(cartSelectionFromSnapshot(s,{...q,selectionMode:undefined},now).status).toBe("INVALID");
 });
 it("does not collapse conflicting identities/prices or invent a cross-product of size/color",()=>{
  const s=snapshot(3),row=s.offers.SET.rows[0]!;
  s.offers.SET.rows.push({...structuredClone(row),sale_price:row.sale_price+1});
  expect(cartSelectionFromSnapshot(s,{shopAlias:"LANA",productId:"CB182",offerType:"SET",size:"M",color:"BE",quantity:1,lineId:"50000000-0000-4000-8000-000000000001",selectionMode:"CANDIDATE_TUPLES"},now).status).toBe("INVALID");
 });
 it("keeps zero-stock preorder distinct and does not silently prefer an unlabelled tuple",()=>{
  const s=snapshot(9),row=s.offers.SET.rows[0]!;row.color="__NO_COLOR__";for(const c of row.components)c.color="__NO_COLOR__";
  s.offers.SET.rows.push({...structuredClone(row),color:"BE",stock_quantity:0});s.fulfillment_policy.can_order_when_zero=true;
  const q={shopAlias:"LANA",productId:"CB182",offerType:"SET",size:"M",color:null,quantity:1,lineId:"50000000-0000-4000-8000-000000000001",selectionMode:"CANDIDATE_TUPLES" as const};
  const r=cartSelectionFromSnapshot(s,q,now);expect(r.status).toBe("COLOR_REQUIRED");
  if(r.status!=="READY")expect(r.selectionOptions?.find(o=>o.color==="BE")?.status).toBe("PRE_ORDER");
  const explicit=cartSelectionFromSnapshot(s,{...q,color:"BE"},now);expect(explicit).toMatchObject({status:"READY",stockStatus:"PRE_ORDER",stockAvailableQuantity:0});
  expect(candidateCartOptions(s,q,new Date("2026-07-26T00:00:00Z")).every(o=>o.status==="UNKNOWN")).toBe(true);
  row.stock_quantity=null as never;row.stock_status="QUANTITY_HIDDEN";s.fulfillment_policy.can_order_when_zero=false;
  expect(cartSelectionFromSnapshot(s,q,now).status).not.toBe("READY");
 });
});

function snapshot(stockQuantity = 3) {
  return {
    schema_version: 3,
    release_id: "pos-release-1",
    catalog_version: "catalog-v3",
    policy_version: "fulfillment-v2",
    shop_alias: "LANA",
    brand: "lanadesign",
    product_id: "CB182",
    synced_at: observedAt,
    data_status: "OK",
    fulfillment_policy: {
      tinh_trang: "READY_STOCK",
      can_order_when_zero: false,
      prep_min_days: 1,
      prep_max_days: 2,
      zero_stock_policy: "",
      zero_stock_prep_min_days: null as number | null,
      zero_stock_prep_max_days: null as number | null,
      eta_valid_until: "",
    },
    selling_rules: {
      allow_mixed_sizes: true,
      allow_component_sale: false,
      source_version: "registry:CB182:7",
    },
    shipping_eta: {
      DEFAULT: { transit_min_days: 2, transit_max_days: 4 },
    },
    offers: {
      SET: {
        list_price: 799_000,
        sale_price: 699_000,
        price_status: "OK",
        rows: [
          {
            offer_type: "SET",
            price_sku: "CB182-SET",
            color: "BE",
            size: "M",
            stock_quantity: stockQuantity,
            list_price: 799_000,
            sale_price: 699_000,
            stock_status: "OK",
            components: [
              {
                product_sku: "CB182-AO",
                variation_sku: "CB182-AO-BE-M",
                quantity: 1,
                color: "BE",
                size: "M",
              },
              {
                product_sku: "CB182-CV",
                variation_sku: "CB182-CV-BE-M",
                quantity: 1,
                color: "BE",
                size: "M",
              },
            ],
          },
        ],
      },
    },
  };
}

describe("realtime sales catalog", () => {
  it.each([true,false])("binds parent stock units and rejects malformed source identity (candidate=%s)", candidate => {
    const s=snapshot(14),offer=s.offers.SET,row=offer.rows[0]!;
    Object.assign(offer,{inventory_source:"PANCAKE_BOM"});
    Object.assign(row,{inventory_source:"PANCAKE_BOM",parent_variation_id:"pool-M"});
    const q={shopAlias:"LANA",productId:"CB182",offerType:"SET",size:"M",color:"BE",quantity:1,lineId:"50000000-0000-4000-8000-000000000001",...(candidate?{selectionMode:"CANDIDATE_TUPLES" as const}:{})};
    const a=cartSelectionFromSnapshot(s,q,now);
    expect(a).toMatchObject({status:"READY",stockCounter:{unit:"PARENT_OFFER",identity:"pool-M"}});
    Object.assign(row,{parent_variation_id:"pool-new"});
    const changed=cartSelectionFromSnapshot(s,q,now);
    if(a.status!=="READY"||changed.status!=="READY")throw Error("READY_REQUIRED");
    expect(changed.versions.inventory).not.toBe(a.versions.inventory);
    Object.assign(row,{parent_variation_id:"pool-M|pool-other"});
    expect(cartSelectionFromSnapshot(s,q,now)).toMatchObject({status:"INVALID",reasonCode:"CART_INVENTORY_SOURCE_UNRESOLVED"});
    Object.assign(row,{parent_variation_id:"pool-M",inventory_source:"PANCAKE_DIRECT"});
    expect(cartSelectionFromSnapshot(s,q,now).status).toBe("INVALID");
    const b=structuredClone(a);b.line.parentProductId="OTHER";b.line.components=b.line.components.map(c=>({...c,componentProductId:"OTHER_"+c.componentProductId,componentSku:"OTHER_"+c.componentSku}));
    expect(cartSelectionsHaveIndependentStockV2([a,b])).toBe(false);
    expect(cartSelectionsHaveIndependentStockV2([a,{...b,stockCounter:{source:"PANCAKE_BOM",unit:"PARENT_OFFER",identity:"other-pool"}}])).toBe(true);
    expect(cartSelectionsHaveIndependentStockV2([a,{...b,stockCounter:null}])).toBe(false);
  });

  it("maps southern destination components, not street names, to current shared transit", () => {
    const regional = { ...snapshot(), shipping_eta: { "MIEN-NAM": { transit_min_days: 3, transit_max_days: 6 } } };
    const query = { shopAlias: "LANA", productId: "CB182", offerType: "SET", size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001" };
    for (const deliveryAddress of ["Quận 1, TP.HCM", "Phường 1, Cần Thơ", "Phường 2, tỉnh Đồng Nai",
      "Phường 2, Bình Dương, TP Hồ Chí Minh", "Phường 1, Long An", "Phường 1, Kiên Giang"]) {
      expect(cartSelectionFromSnapshot(regional, { ...query, deliveryAddress }, now), deliveryAddress)
        .toMatchObject({ status: "READY", eta: { minDays: 4, maxDays: 8 } });
    }
    for (const deliveryAddress of ["12 đường Cần Thơ, Hà Nội", "12 đường Đồng Nai", "Phường 1",
      "Hà Nội, TP Hồ Chí Minh", "Tỉnh Đồng Nai, Cần Thơ", "Phường 1, Lâm Đồng"]) {
      expect(cartSelectionFromSnapshot(regional, { ...query, deliveryAddress }, now), deliveryAddress)
        .toMatchObject({ status: "ETA_UNAVAILABLE", reasonCode: "CART_ETA_REGION_UNRESOLVED" });
    }
    const preorder = { ...snapshot(0), shipping_eta: regional.shipping_eta,
      fulfillment_policy: { ...regional.fulfillment_policy, can_order_when_zero: true, zero_stock_prep_min_days: 5, zero_stock_prep_max_days: 8 } };
    expect(cartSelectionFromSnapshot(preorder, { ...query, deliveryAddress: "Quận 1, TP Hồ Chí Minh" }, now))
      .toMatchObject({ status: "READY", eta: { minDays: 8, maxDays: 14 } });
    expect(cartSelectionFromSnapshot({ ...preorder, shipping_eta: { "MIEN-NAM": { transit_min_days: 1, transit_max_days: 2 } } },
      { ...query, deliveryAddress: "Quận 1, TP Hồ Chí Minh" }, now)).toMatchObject({ status: "READY", eta: { minDays: 6, maxDays: 10 } });
    expect(cartSelectionFromSnapshot({ ...preorder, fulfillment_policy: { ...preorder.fulfillment_policy, eta_valid_until: observedAt } },
      { ...query, deliveryAddress: "Quận 1, TP Hồ Chí Minh" }, now)).toMatchObject({ status: "ETA_UNAVAILABLE", reasonCode: "CART_ETA_STALE" });
  });

  it("distinguishes an unresolved destination region from missing ETA durations without guessing geography", () => {
    const regional = { ...snapshot(), shipping_eta: { "MIEN-NAM": { transit_min_days: 3, transit_max_days: 6 } } };
    const query = { shopAlias: "LANA", productId: "CB182", offerType: "SET", size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001", deliveryAddress: "Quận 1, TP Hồ Chí Minh" };
    expect(cartSelectionFromSnapshot(regional, query, now)).toMatchObject({ status: "READY", eta: { minDays: 4, maxDays: 8 } });
    expect(cartSelectionFromSnapshot(regional, { ...query, deliveryAddress: "MIEN-NAM" }, now)).toMatchObject({ status: "READY", eta: { minDays: 4, maxDays: 8 } });
    expect(cartSelectionFromSnapshot(snapshot(), query, now)).toMatchObject({ status: "READY", eta: { minDays: 3, maxDays: 6 } });
  });
  it("builds a POS-authoritative cart line with BOM, selling rules and ETA", () => {
    const result = cartSelectionFromSnapshot(snapshot(), {
      shopAlias: "LANA",
      productId: "CB182",
      offerType: "SET",
      size: "M",
      color: "BE",
      quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
      deliveryAddress: "Tân Châu, Tây Ninh",
    }, now);

    expect(result).toMatchObject({
      status: "READY",
      line: {
        parentProductId: "CB182",
        offerKind: "SET",
        posUnitPriceVnd: 699_000,
        allowMixedSizes: true,
        allowComponentSale: false,
        components: [
          { componentProductId: "CB182_AO", componentRole: "TOP", size: "M" },
          { componentProductId: "CB182_CV", componentRole: "SKIRT", size: "M" },
        ],
        priceAuthority: {
          metadata: {
            authority: "PANCAKE_POS",
            freshForSeconds: 172_800,
          },
        },
      },
      eta: { minDays: 3, maxDays: 6 },
    });
  });

  it("requires a verified size and never fabricates price or stock", () => {
    expect(cartSelectionFromSnapshot(snapshot(), {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: null, color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, now)).toMatchObject({ status: "SIZE_REQUIRED", availableSizes: ["M"] });

    const missingPrice = snapshot();
    missingPrice.offers.SET.sale_price = null as never;
    missingPrice.offers.SET.rows[0]!.sale_price = null as never;
    expect(cartSelectionFromSnapshot(missingPrice, {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, now)).toMatchObject({ status: "PRICE_UNAVAILABLE" });

    expect(cartSelectionFromSnapshot(snapshot(0), {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, now)).toMatchObject({ status: "OUT_OF_STOCK" });
  });

  it("separates the 48-hour storage window from fact freshness", () => {
    expect(cartSelectionFromSnapshot(snapshot(), {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
    }, new Date("2026-07-25T02:00:00.001Z")))
      .toMatchObject({ status: "STALE", reasonCode: "CATALOG_PRICE_STALE" });
  });

  it("reports preorder stock from the POS snapshot without claiming live inventory", () => {
    const preorder = snapshot(0);
    preorder.fulfillment_policy.can_order_when_zero = true;
    preorder.fulfillment_policy.zero_stock_policy = "PRE_ORDER";
    preorder.fulfillment_policy.zero_stock_prep_min_days = 5;
    preorder.fulfillment_policy.zero_stock_prep_max_days = 7;

    expect(cartSelectionFromSnapshot(preorder, {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
      deliveryAddress: "Tân Châu, Tây Ninh",
    }, now)).toMatchObject({
      status: "READY",
      sourceAuthority: "POS_SNAPSHOT",
      stockStatus: "PRE_ORDER",
      stockAvailableQuantity: 0,
    });
  });

  it("fails closed when the fulfillment ETA policy has expired", () => {
    const staleEta = snapshot();
    staleEta.fulfillment_policy.eta_valid_until = "2026-07-23T02:59:59.000Z";

    expect(cartSelectionFromSnapshot(staleEta, {
      shopAlias: "LANA", productId: "CB182", offerType: "SET",
      size: "M", color: "BE", quantity: 1,
      lineId: "13000000-0000-4000-8000-000000000001",
      deliveryAddress: "Tân Châu, Tây Ninh",
    }, now)).toMatchObject({ status: "ETA_UNAVAILABLE", reasonCode: "CART_ETA_STALE" });
  });

  it("projects a variant only from exact POS color and size values", () => {
    const value = snapshot();
    value.offers.SET.rows[0] = {
      ...value.offers.SET.rows[0]!,
      parent_variation_id: "pos-variation-182",
    } as typeof value.offers.SET.rows[number];
    expect(verifiedVariantFromSnapshot(value, {
      shopAlias: "LANA",
      productId: "CB182",
      offerType: "SET",
      mentionedSize: "m",
      mentionedColor: "be",
    }, now)).toMatchObject({
      resolution: "VERIFIED",
      parentProductId: "CB182",
      selectedVariantId: "pos-variation-182",
      selectedColorId: null,
      selectedColorLabel: "BE",
      selectedSizeCode: "M",
      selectedOfferType: "SET",
      selectedComponentProductId: null,
      sourceVersion: "pos-release-1",
    });
  });

  it("keeps incomplete and unknown mentions non-authoritative", () => {
    expect(verifiedVariantFromSnapshot(snapshot(), {
      shopAlias: "LANA",
      productId: "CB182",
      offerType: "SET",
      mentionedSize: "M",
      mentionedColor: null,
    }, now)).toMatchObject({
      resolution: "PARTIAL",
      selectedSizeCode: "M",
      selectedVariantId: null,
    });
    expect(verifiedVariantFromSnapshot(snapshot(), {
      shopAlias: "LANA",
      productId: "CB182",
      offerType: "SET",
      mentionedSize: "XXL",
      mentionedColor: "ĐỎ",
    }, now)).toMatchObject({
      resolution: "NOT_FOUND",
      selectedVariantId: null,
      selectedSizeCode: null,
      selectedColorId: null,
    });
  });
});


describe("shared configured delivery region priority",()=>{
  it.each([
    ["Cần Thơ","CAN_THO"], ["TP.HCM","MIEN-NAM"], ["Hà Nội","TOAN_QUOC"], ["unknown","TOAN_QUOC"],
    ["Hà Nội, Cần Thơ",null],
  ])("resolves %s using checkout priority (%s)",async(address,expected)=>{
    const {resolveCatalogDeliveryRegion}=await import("./realtime-sales-catalog.js");
    const snapshot={shipping_eta:{CAN_THO:{transit_min_days:2,transit_max_days:4},"MIEN-NAM":{transit_min_days:2,transit_max_days:4},TOAN_QUOC:{transit_min_days:3,transit_max_days:5}}};
    expect(resolveCatalogDeliveryRegion(snapshot as never,address!)?.[0]??null).toBe(expected);
  });
});
