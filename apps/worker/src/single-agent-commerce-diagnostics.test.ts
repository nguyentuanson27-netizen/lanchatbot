import {it,expect} from "vitest";
import {createCommerceTools} from "./single-agent-commerce.js";
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from "./single-agent-commerce.test-support.js";
import {commerceDiagnostics} from "./single-agent-commerce-diagnostics.js";

it("retains a bounded source failure observation before the early tool result without raw errors",async()=>{
 const events:unknown[]=[],f=fixtureProduct();
 const tools=await createCommerceTools({read:{scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],
  catalog:{readProduct:async()=>{throw Error('password=SECRET https://source/?token=SECRET');},searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
  observeDiagnostics:e=>events.push(e)});
 const result=await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}});
 expect(result.status).toBe("UNAVAILABLE");
 expect(events).toEqual(expect.arrayContaining([expect.objectContaining({stage:"CATALOG_READ",status:"STARTED"}),expect.objectContaining({stage:"CATALOG_READ",status:"ERROR",reason:"UNKNOWN_INTERNAL"}),expect.objectContaining({stage:"RESULT_PROJECTION",status:"UNAVAILABLE"})]));
 expect(JSON.stringify(events)).not.toContain("SECRET");
});
it("bounds events and links start/result without retaining private selectors or arbitrary reason text",async()=>{
 const events:unknown[]=[],d=commerceDiagnostics(e=>events.push(e));
 await d.run("POS_READ",{phone:"0901234567",token:"SECRET"},async()=>({public:"value"}));
 expect(events[1]).toMatchObject({parentOrdinal:1,status:"OK",resultHash:expect.stringMatching(/^[a-f0-9]{64}$/)});
 for(let i=0;i<300;i++)d.emit("RESULT_PROJECTION","SECRET",{raw:"SECRET"},"SECRET");
 expect(events).toHaveLength(192);expect(JSON.stringify(events)).not.toContain("SECRET");expect(JSON.stringify(events)).not.toContain("0901234567");
});
it("diagnostics observer failure cannot change a successful tool outcome",async()=>{
 const f=fixtureProduct();const tools=await createCommerceTools({read:{scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],catalog:{
  readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},observeDiagnostics:()=>{throw Error("OBSERVER");}});
 expect((await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}})).status).toBe("OK");
});
it("retains a known media absence reason and paired argument result before any later owner call",async()=>{
 const events:import("./single-agent-commerce-diagnostics.js").CommerceDiagnostic[]=[],f=fixtureProduct();
 const tools=await createCommerceTools({read:{scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],catalog:{
  readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},media:{allowedHostSuffixes:["content.pancake.vn"]},observeDiagnostics:e=>events.push(e)});
 expect(await tools.invoke({name:"select_product_media",args:{subjectRef:f.product.productId,intent:"FEEDBACK"}})).toMatchObject({status:"UNAVAILABLE",reason:"NO_VERIFIED_MATCHING_MEDIA"});
 const start=events.find(e=>e.stage==="ARGUMENT_VALIDATION"&&e.status==="STARTED")!;
 expect(events).toContainEqual(expect.objectContaining({stage:"ARGUMENT_VALIDATION",status:"OK",parentOrdinal:start.ordinal,operation:"select_product_media"}));
 expect(events).toContainEqual(expect.objectContaining({stage:"RESULT_PROJECTION",status:"UNAVAILABLE",reason:"NO_VERIFIED_MATCHING_MEDIA",parentOrdinal:start.ordinal,operation:"select_product_media"}));
});

it("marks invalid media arguments as rejected rather than validated OK",async()=>{
 const events:import("./single-agent-commerce-diagnostics.js").CommerceDiagnostic[]=[],f=fixtureProduct();
 const tools=await createCommerceTools({read:{scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],catalog:{readProduct:async()=>f,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},media:{allowedHostSuffixes:["content.pancake.vn"]},observeDiagnostics:e=>events.push(e)});
 await tools.invoke({name:"select_product_media",args:{subjectRef:f.product.productId,intent:"NOT_A_REAL_INTENT"}});
 expect(events).toContainEqual(expect.objectContaining({stage:"ARGUMENT_VALIDATION",status:"REJECTED",reason:"MEDIA_ARGUMENTS_OR_REF"}));
});
