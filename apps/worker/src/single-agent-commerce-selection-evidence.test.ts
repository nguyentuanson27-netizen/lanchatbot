import {it,expect} from "vitest";
import {createReadOnlyTools} from "./single-agent-commerce-read-only-tools.js";
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from "./single-agent-commerce.test-support.js";
import {hardPrecheck} from "./single-agent-semantic-verifier-boundary.js";

it("publishes the exact owner tuple view in the verifier snapshot with read-path expiry and immutable readback",async()=>{
 const f=fixtureProduct(),row=f.snapshot.offers.DIRECT!.rows[0]!;
 f.snapshot.offers.DIRECT!.rows.push({...structuredClone(row),color:"be",stock_quantity:0});
 f.snapshot.fulfillment_policy={tinh_trang:"READY_STOCK",can_order_when_zero:true,prep_min_days:1,prep_max_days:2,
  zero_stock_policy:"ALLOW",zero_stock_prep_min_days:3,zero_stock_prep_max_days:5,eta_valid_until:""};
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,maxFactAgeSeconds:120,candidateEvidence:true,
  initialProducts:[f.product],catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 const r=await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT",size:"M"}});
 const data=r.data as {selectionEvidence:unknown;selectionOptions:unknown[]};
 expect(data.selectionEvidence).toBeDefined();
 expect(tools.snapshot().runtimeProducts?.[0]).toHaveProperty("selectionEvidence",[data.selectionEvidence]);
 const evidence=data.selectionEvidence as {expiresAt:string;options:unknown[]};
 expect(evidence.options).toEqual(data.selectionOptions);
 expect(Date.parse(evidence.expiresAt)).toBe(commerceNow.getTime()+120000);
 expect(evidence.options).toEqual(expect.arrayContaining([expect.objectContaining({color:"be",status:"PRE_ORDER"})]));
 const before=tools.snapshot();expect(hardPrecheck(before,"Chị xem các lựa chọn nhé.",commerceNow)).toBeNull();
 await expect(tools.readback()).resolves.toEqual(before);
 const forged=structuredClone(before);(forged.runtimeProducts![0] as unknown as {selectionEvidence:{quantity:number}[]}).selectionEvidence[0]!.quantity=2;
 expect(hardPrecheck(forged,"Dạ chị.",commerceNow)).not.toBeNull();
 expect(hardPrecheck(before,"Dạ chị.",new Date(commerceNow.getTime()+120001))).not.toBeNull();
});
it("retains both source-bound selections across a second selector and readback",async()=>{
 const f=fixtureProduct();f.snapshot.offers.DIRECT!.rows.push({...structuredClone(f.snapshot.offers.DIRECT!.rows[0]!),size:"L",parent_variation_id:"SM613-NAVY-L"});
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,candidateEvidence:true,initialProducts:[f.product],
  catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 for(const size of["M","L"])expect((await tools.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",size}})).status).toBe("OK");
 const before=tools.snapshot();expect(before.runtimeProducts?.[0]?.selectionEvidence).toHaveLength(2);
 await tools.invoke({name:"read_product",args:{subjectRef:"SM613",detailsOnly:true}});
 expect(tools.snapshot().runtimeProducts?.[0]?.selectionEvidence).toEqual(before.runtimeProducts?.[0]?.selectionEvidence);
 const withDetails=tools.snapshot();await expect(tools.readback()).resolves.toEqual(withDetails);
});
it("allows compare-three then refining one offer within the same existing tool budget",async()=>{
 const f=fixtureProduct(),template=f.snapshot.offers.DIRECT!;
 f.snapshot.offers=Object.fromEntries(["AO","CV","SET"].map(offer=>[offer,{...structuredClone(template),rows:template.rows.map(r=>({...r,offer_type:offer}))}]));
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,candidateEvidence:true,initialProducts:[f.product],catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 expect((await tools.invoke({name:"read_product",args:{subjectRef:"SM613",offerTypes:["AO","CV","SET"]}})).status).toBe("OK");
 expect((await tools.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"AO",size:"M",color:"navy"}})).status).toBe("OK");
 expect(tools.snapshot().runtimeProducts?.[0]?.selectionEvidence).toHaveLength(4);
 const before=tools.snapshot();await expect(tools.readback()).resolves.toEqual(before);
});
it("rejects actual product-byte overflow atomically without forgetting previously admitted selections",async()=>{
 const f=fixtureProduct(),row=f.snapshot.offers.DIRECT!.rows[0]!;
 f.snapshot.offers.DIRECT!.rows=["S","M","L"].flatMap(size=>["be","navy","white","black","red","blue","green","brown"].map(color=>({...structuredClone(row),size,color,parent_variation_id:`SM613-${size}-${color}`})));
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,candidateEvidence:true,initialProducts:[f.product],catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 let admitted=0,rejected=false;
 for(const size of["S","M","L"]){const before=tools.snapshot(),r=await tools.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",size}});
  if(r.status==="REJECTED"){expect(tools.snapshot()).toEqual(before);rejected=true;break;}admitted++;}
 expect(admitted).toBeGreaterThan(0);expect(rejected).toBe(true);
});
