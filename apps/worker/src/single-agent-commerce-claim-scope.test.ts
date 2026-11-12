import {describe,it,expect} from "vitest";
import {validateEffectClaimSemanticsV1,type ProtectedClaimV1} from "@lana/contracts";
import {createReadOnlyTools} from "./single-agent-commerce-read-only-tools.js";
import {hardPrecheck} from "./single-agent-semantic-verifier-boundary.js";
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from "./single-agent-commerce.test-support.js";

// Two colours in three sizes; only size M is out of stock and sold as pre-order.
const world=()=>{
 const f=fixtureProduct(),row=f.snapshot.offers.DIRECT!.rows[0]!;
 f.snapshot.offers.DIRECT!.rows=["trắng","be"].flatMap(color=>["S","M","L"].map(size=>({...structuredClone(row),color,size,stock_quantity:size==="M"?0:4,
  parent_variation_id:`SM613-${color==="be"?"BE":"TRANG"}-${size}`})));
 f.snapshot.fulfillment_policy={tinh_trang:"READY_STOCK",can_order_when_zero:true,prep_min_days:1,prep_max_days:2,zero_stock_policy:"ALLOW",zero_stock_prep_min_days:3,zero_stock_prep_max_days:5,eta_valid_until:""};
 return f;
};
const tools=()=>{const f=world();return createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,candidateEvidence:true,initialProducts:[f.product],
 catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});};
const semantics=(claims:readonly unknown[])=>validateEffectClaimSemanticsV1({effect:"PROTECTED_OUTBOUND",productIds:["SM613"],cartId:null,cartVersion:null,
 protectedClaimTypes:[...new Set((claims as ProtectedClaimV1[]).map(c=>c.type))],claims:claims as ProtectedClaimV1[]});
const stock=(claims:readonly unknown[])=>(claims as ProtectedClaimV1[]).filter(c=>c.type==="STOCK"&&c.scope.kind==="PRODUCT").map(c=>(c.scope as {variantId:string|null}).variantId);

describe("stock read for one size and for the whole offer in the same turn",()=>{
 it("does not collide at the send gate (PR 392 case P09)",async()=>{
  const t=tools();
  // The owner checks size M, then asks for the offer's price: the read behind quote_product has no size.
  expect((await t.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",size:"M"}})).status).toBe("OK");
  expect((await t.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT"}})).status).toBe("OK");
  const context=t.snapshot();
  expect(new Set(stock(context.protectedClaims)).size).toBe(2);
  expect(semantics(context.protectedClaims)).toEqual({missing:false,conflict:false});
  expect(hardPrecheck(context,"Dạ chị.",commerceNow)).toBeNull();
 });
 it("keeps two sizes of one offer apart",async()=>{
  const t=tools();
  for(const size of["M","L"])expect((await t.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",size}})).status).toBe("OK");
  expect(semantics(t.snapshot().protectedClaims).conflict).toBe(false);
  expect(hardPrecheck(t.snapshot(),"Dạ chị.",commerceNow)).toBeNull();
 });
 it("still reports a real contradiction for the same size",async()=>{
  const t=tools();await t.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",size:"M"}});
  const claims=structuredClone(t.snapshot().protectedClaims) as ProtectedClaimV1[],m=claims.find(c=>c.type==="STOCK")!;
  claims.push({...m,claimId:"70000000-0000-4000-8000-000000000001",provenance:{...m.provenance,contentHash:"f".repeat(64)}});
  expect(semantics(claims).conflict).toBe(true);
 });
 it("leaves reads without a size, with or without a colour, on the offer scope the quote path looks up",async()=>{
  const t=tools();await t.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",color:"be"}});
  expect(stock(t.snapshot().protectedClaims)).toEqual(["offer:SM613:DIRECT"]);
  const u=tools();await u.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT"}});
  expect(stock(u.snapshot().protectedClaims)).toEqual(["offer:SM613:DIRECT"]);
 });
});
