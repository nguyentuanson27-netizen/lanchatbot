import {it,expect,vi} from "vitest";
import {createReadOnlyTools} from "./single-agent-commerce-read-only-tools.js";
import {fixtureProduct,fixturePolicy,fixtureSizeInput,commerceScope,commerceNow} from "./single-agent-commerce.test-support.js";
import {finalGate,makeBinding} from "./single-agent-semantic-verifier-boundary.js";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn} from "./single-agent-commerce-read-only.js";
const setup=(mode="normal")=>{
 const f=fixtureProduct(),readProduct=vi.fn(async()=>structuredClone(f));
 if(mode==="many"){const template=f.snapshot.offers.DIRECT!;f.snapshot.offers=Object.fromEntries(["AO","CV","SET","QUAN"].map(name=>[name,{...structuredClone(template),rows:template.rows.map(r=>({...r,offer_type:name}))}]));}
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],prepareCurrentOffers:true,
  catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 return {f,readProduct,tools};
};
it.each([true,false])("publishes late policy charts before verification, numeric preparation=%s",async numeric=>{
 const f=fixtureProduct(),policy=await fixturePolicy();
 Object.assign(policy.bundle!.artifacts,{sizeCharts:{chart:fixtureSizeInput(f.product.productId).charts[0]}});
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:async()=>structuredClone(policy),initialProducts:[f.product],prepareCurrentOffers:numeric,
  catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 await tools.prepare(()=>true);expect((await tools.invoke({name:"read_policy",args:{}})).status).toBe("OK");
 const trusted=tools.snapshot();expect(trusted.runtimeProducts?.[0]?.sizeCharts).toHaveLength(1);
 const draft="Dạ chị.",binding=makeBinding("turn",draft,trusted),current=await tools.readback();expect(current).toEqual(trusted);
 expect(finalGate({expected:binding,response:{kind:"VERDICT",binding,result:{verdict:"PASS",violations:[]}},current,finalDraft:draft,now:commerceNow}).disposition).toBe("SEND_ELIGIBLE");
 Object.assign(policy.bundle!.artifacts,{sizeCharts:{}});
 const revoked=await tools.readback();expect(revoked.runtimeProducts?.[0]?.sizeCharts??[]).toEqual([]);
 expect(finalGate({expected:binding,response:{kind:"VERDICT",binding,result:{verdict:"PASS",violations:[]}},current:revoked,finalDraft:draft,now:commerceNow}).disposition).not.toBe("SEND_ELIGIBLE");
});
it("rejects failed chart publication atomically and revokes old charts without erasing independent facts",async()=>{
 const f=fixtureProduct(),policy=await fixturePolicy(),chart=fixtureSizeInput(f.product.productId).charts[0]!;
 Object.assign(policy.bundle!.artifacts,{sizeCharts:{chart}});
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:async()=>structuredClone(policy),initialProducts:[f.product],prepareCurrentOffers:true,
  catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 await tools.prepare(()=>true);await tools.invoke({name:"read_policy",args:{}});const before=tools.snapshot();
 Object.assign(policy.bundle!.artifacts,{sizeCharts:Object.fromEntries(Array.from({length:5},(_,i)=>[String(i),chart]))});
 expect(await tools.invoke({name:"read_policy",args:{}})).toMatchObject({status:"UNAVAILABLE",reason:"POLICY_UNAVAILABLE"});
 const failed=tools.snapshot();expect(failed.protectedClaims).toEqual(before.protectedClaims);expect(failed.runtimeProducts?.[0]?.sizeCharts).toBeUndefined();
 expect(failed.policyLiterals.some(p=>p.ref.startsWith("policy:"))).toBe(false);
 await expect(tools.readback()).rejects.toThrow("POLICY_READBACK_UNAVAILABLE");
});
it("uses the current policy after a pending catalog read, with no cross-product chart inheritance",async()=>{
 const f=fixtureProduct(),policy=await fixturePolicy();
 Object.assign(policy.bundle!.artifacts,{sizeCharts:{wrong:fixtureSizeInput("OTHER").charts[0]}});
 let resolve!:(v:typeof f)=>void;const pending=new Promise<typeof f>(r=>{resolve=r;});
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:async()=>structuredClone(policy),initialProducts:[f.product],
  catalog:{readProduct:async()=>pending,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 const read=tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerType:"DIRECT"}});
 await tools.invoke({name:"read_policy",args:{}});resolve(f);expect((await read).status).toBe("OK");
 expect(tools.snapshot().runtimeProducts?.[0]?.sizeCharts).toBeUndefined();
 Object.assign(policy.bundle!.artifacts,{sizeCharts:{right:fixtureSizeInput(f.product.productId).charts[0]}});
 await tools.invoke({name:"read_policy",args:{}});const current=tools.snapshot();
 expect(current.runtimeProducts?.[0]?.sizeCharts).toHaveLength(1);expect(await tools.readback()).toEqual(current);
});
it.each(["success","failure"])("does not let a superseded policy %s replace newer revocation",async mode=>{
 const f=fixtureProduct(),old=await fixturePolicy(),next=await fixturePolicy(30_000);
 Object.assign(old.bundle!.artifacts,{sizeCharts:{old:fixtureSizeInput(f.product.productId).charts[0]}});
 let finish!:(v:typeof old)=>void,fail!:(v:Error)=>void;const pending=new Promise<typeof old>((yes,no)=>{finish=yes;fail=no;});let count=0;
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,initialProducts:[f.product],prepareCurrentOffers:true,
  policy:async()=>++count===1?old:count===2?pending:next,
  catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 await tools.prepare(()=>true);await tools.invoke({name:"read_policy",args:{}});
 const late=tools.invoke({name:"read_policy",args:{}});await tools.invoke({name:"read_policy",args:{}});const newer=tools.snapshot();
 if(mode==="success")finish(old);else fail(Error("OLD_READ_FAILED"));
 expect(await late).toMatchObject({status:"REJECTED",reason:"SOURCE_EVIDENCE_CONFLICT"});
 expect(tools.snapshot()).toEqual(newer);expect(newer.runtimeProducts?.[0]?.sizeCharts).toBeUndefined();expect(await tools.readback()).toEqual(newer);
});
it("prepares current numeric evidence from exactly the existing singleton source observation, without hydration renewing it",async()=>{
 const s=setup();expect(await s.tools.prepare(()=>true)).toBe(1);expect(s.readProduct).toHaveBeenCalledTimes(1);
 expect(s.tools.snapshot().protectedClaims).toEqual(expect.arrayContaining([expect.objectContaining({type:"PRICE"}),expect.objectContaining({type:"STOCK"})]));
 const before=s.tools.snapshot();await expect(s.tools.readback()).resolves.toEqual(before);
 s.f.snapshot.offers.DIRECT!.rows[0]!.stock_quantity=0;await expect(s.tools.readback()).rejects.toThrow("POS_OBSERVATION_CHANGED");
});
it.each(["many","reject"])("does not partially publish optional numeric preparation when %s admission fails",async mode=>{
 const s=setup(mode);expect(await s.tools.prepare((_c,work)=>work?.kind==="FINAL"||mode!=="reject")).toBe(1);
 expect(s.tools.snapshot().protectedClaims).toEqual([]);expect(s.tools.snapshot().runtimeProducts?.[0]?.content).toBeDefined();
 expect(s.readProduct).toHaveBeenCalledTimes(1);
});
it("keeps catalog evidence on optional POS acquisition failure, without inserting stale facts",async()=>{
 const s=setup();s.f.snapshot.synced_at="2020-01-01T00:00:00.000Z";
 expect(await s.tools.prepare(()=>true)).toBe(1);expect(s.tools.snapshot().protectedClaims).toEqual([]);
 expect(s.tools.snapshot().runtimeProducts?.[0]?.content).toBeDefined();
});
it("does not admit optional data without a native-wire admission callback",async()=>{
 const s=setup();await s.tools.prepare();expect(s.tools.snapshot().protectedClaims).toEqual([]);expect(s.readProduct).toHaveBeenCalledTimes(1);
});
it.each([2,3])("prepares %i bound targets without choosing a product and charges actual first-owner budget",async count=>{
 const records=Array.from({length:count},(_,i)=>fixtureProduct(`A${i+101}`)),scope=commerceScope();
 const readProduct=vi.fn(async(id:string)=>structuredClone(records.find(f=>f.product.productId===id)!));
 const tools=await createCommerceTools({read:{scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:records.map(f=>f.product),
  catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}}});
 const admissions:number[]=[];
 const result=await runCommerceTurn({scope,tools,clock:()=>commerceNow,latest:"Chị hỏi áo nhé.",history:[],ownerPrompt:"owner",verifierPrompt:"verifier",
  admitPreparedContext:r=>{admissions.push(r.toolBudget.callsRemaining);return true;},
  owner:async r=>{expect(r.context.state.currentProductId).toBeNull();expect(r.toolBudget.callsRemaining).toBe(6-count);
   for(const f of records)expect(r.context.policyLiterals.some(p=>p.ref===`offers:${f.product.productId}`)).toBe(true);
   expect(r.context.protectedClaims).toEqual([]);
   expect(admissions.at(-1)).toBe(r.toolBudget.callsRemaining);return{kind:"FINAL",text:"Dạ chị."};},
  verifier:async()=>({result:{verdict:"PASS",violations:[]}})});
 expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(result.normalToolCalls).toBe(count);
});
it("keeps previously admitted numeric facts while preparing another ambiguous target as metadata",async()=>{
 const records=[fixtureProduct("A101"),fixtureProduct("B202")];
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:records.map(f=>f.product),prepareCurrentOffers:true,
  catalog:{readProduct:async id=>structuredClone(records.find(f=>f.product.productId===id)!),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 await tools.invoke({name:"read_product",args:{subjectRef:"A101",offerType:"DIRECT"}});const before=tools.snapshot();
 expect(await tools.prepare(()=>true)).toBe(1);const after=tools.snapshot();expect(after.protectedClaims).toEqual(before.protectedClaims);
 expect(after.policyLiterals.some(p=>p.ref==="offers:B202")).toBe(true);expect(after.protectedClaims).not.toEqual([]);
});
it.each(["Cảm ơn em nhé.","Áo này phối quần nâu được không?","Giặt máy được không?"])("optional POS failure preserves the independent answer path for %s",async latest=>{
 const f=fixtureProduct(),scope=commerceScope(),readProduct=vi.fn(async(_id:string,readPos=true)=>{if(readPos)throw Error("POS_OFFLINE");return{product:f.product,snapshot:null};});
 const tools=await createCommerceTools({read:{scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}}});
 let remaining=0;const result=await runCommerceTurn({scope,tools,clock:()=>commerceNow,latest,history:[],ownerPrompt:"owner",verifierPrompt:"verifier",admitPreparedContext:()=>true,
  owner:async r=>{remaining=r.toolBudget.callsRemaining;expect(r.context.protectedClaims).toEqual([]);expect(r.context.runtimeProducts?.[0]?.content).toBeDefined();return{kind:"FINAL",text:"Dạ chị."};},
  verifier:async()=>({result:{verdict:"PASS",violations:[]}})});
 expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(remaining).toBe(5);
 // Existing catalog-only fallback and final readback each make a failed POS read plus one catalog-only read.
 expect(readProduct.mock.calls.filter(([,pos])=>pos===false)).toHaveLength(2);
});

it("exposes six source offers as read references without numeric fanout",async()=>{
 const s=setup("many"),base=s.f.snapshot.offers.AO!;
 s.f.snapshot.offers=Object.fromEntries(["AO","QUAN","CV","SET_QUAN","SET_VAY","COMBO_3"].map(offer=>[offer,{...structuredClone(base),rows:base.rows.map(r=>({...r,offer_type:offer}))}]));
 await s.tools.prepare(()=>true);
 const literal=s.tools.snapshot().policyLiterals.find(p=>p.ref===`offers:${s.f.product.productId}`)!;
 const data=JSON.parse(literal.text);expect(data.purchaseOptions).toHaveLength(6);
 for(const o of data.purchaseOptions){expect(o.priceRead).toMatchObject({subjectRef:s.f.product.productId,offerType:o.offerType});expect(o.stockRead).toEqual(o.priceRead);}
 expect(s.tools.snapshot().protectedClaims).toEqual([]);expect(s.readProduct).toHaveBeenCalledTimes(1);
});
it("charges failed preparation before terminal recovery",async()=>{
 const scope=commerceScope(),f=fixtureProduct();
 const tools=await createCommerceTools({read:{scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],
 catalog:{readProduct:async()=>{throw Error("SOURCE_OFFLINE");},searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}}});
 const result=await runCommerceTurn({scope,tools,clock:()=>commerceNow,latest:"Giá áo?",history:[],ownerPrompt:"owner",verifierPrompt:"verifier",
 owner:async()=>{throw Error("must not call");},verifier:async()=>{throw Error("must not call");}});
 expect(result.normalToolCalls).toBe(1);expect(result.ownerGenerations).toBe(0);
});

it("rejects exhausted preparation before I/O and publishes no partial set after admission rejects",async()=>{
 const records=[fixtureProduct("A101"),fixtureProduct("B202")],readProduct=vi.fn(async(id:string)=>structuredClone(records.find(f=>f.product.productId===id)!));
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:records.map(f=>f.product),prepareCurrentOffers:true,
 catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 const before=tools.snapshot(),onDispatch=vi.fn();
 await expect(tools.prepare(()=>true,{maxCalls:1,onDispatch})).rejects.toThrow("PREPARATION_BUDGET");expect(readProduct).not.toHaveBeenCalled();
 await expect(tools.prepare((_c,w)=>w?.kind!=="FINAL",{maxCalls:6,onDispatch})).rejects.toThrow("PREPARATION_ADMISSION");
 expect(tools.snapshot()).toEqual(before);expect(onDispatch).toHaveBeenCalledTimes(2);
});
it("does not debit cached preparation or already admitted full reads again",async()=>{
 const s=setup(),dispatch=vi.fn();await s.tools.prepare(()=>true,{maxCalls:6,onDispatch:dispatch});
 const before=s.tools.snapshot();expect(await s.tools.prepare(()=>true,{maxCalls:5,onDispatch:dispatch})).toBe(0);
 expect(dispatch).toHaveBeenCalledTimes(1);expect(s.tools.snapshot()).toEqual(before);
});

it("retains option-specific BOM roles without claiming component size applicability from a product chart",async()=>{
 const s=setup("many");s.f.snapshot.offers.AO!.rows[0]!.components=[{product_sku:"DESIGN_AO",quantity:1}];
 s.f.snapshot.offers.QUAN!.rows[0]!.components=[{product_sku:"DESIGN_QUAN",quantity:1}];
 await s.tools.prepare();const data=JSON.parse(s.tools.snapshot().policyLiterals.find(p=>p.ref===`offers:${s.f.product.productId}`)!.text);
 expect(data.purchaseOptions.find((o:{offerType:string})=>o.offerType==="AO").componentSource.components).toEqual([{componentRef:"DESIGN_AO",role:"TOP",quantity:1,label:null,labelSource:null}]);
 expect(data.purchaseOptions.find((o:{offerType:string})=>o.offerType==="QUAN").componentSource.components).toEqual([{componentRef:"DESIGN_QUAN",role:"PANTS",quantity:1,label:null,labelSource:null}]);
 for(const o of data.purchaseOptions){expect(o).not.toHaveProperty("sizeRead");expect(o.sizeApplicability).toMatchObject({status:"NOT_READ",componentSizing:"UNSUPPORTED_BY_PRODUCT_TARGET_API",chartRef:null});}
 expect(data.productSizeRead.scope).toBe("PRODUCT_ONLY");
});

it.each([null,{product_sku:"x".repeat(129)},{}])("does not publish a partial BOM as complete after rejecting %j",async bad=>{
 const s=setup("many");s.f.snapshot.offers.AO!.rows[0]!.components=[{product_sku:"DESIGN_AO"},bad];
 await s.tools.prepare();const options=JSON.parse(s.tools.snapshot().policyLiterals.find(p=>p.ref===`offers:${s.f.product.productId}`)!.text).purchaseOptions;
 const o=options.find((o:{offerType:string})=>o.offerType==="AO");expect(o.componentSource.status).toBe("INCOMPLETE_SOURCE");expect(o.componentSource.components).toEqual([]);
});
it("empty BOM array uses the same legacy source components as the cart resolver",async()=>{
 const s=setup("many"),row=s.f.snapshot.offers.AO!.rows[0]!;row.components=[];row.component_1_sku="DESIGN_AO";row.component_2_sku="DESIGN_QUAN";
 await s.tools.prepare();const options=JSON.parse(s.tools.snapshot().policyLiterals.find(p=>p.ref===`offers:${s.f.product.productId}`)!.text).purchaseOptions;
 expect(options.find((o:{offerType:string})=>o.offerType==="AO").componentSource).toMatchObject({status:"AVAILABLE",components:[{componentRef:"DESIGN_AO",role:"TOP",quantity:1,label:null,labelSource:null},{componentRef:"DESIGN_QUAN",role:"PANTS",quantity:1,label:null,labelSource:null}]});
});
