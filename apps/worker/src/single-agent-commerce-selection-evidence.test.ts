import {it,expect} from "vitest";
import {createReadOnlyTools} from "./single-agent-commerce-read-only-tools.js";
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from "./single-agent-commerce.test-support.js";
import {hardPrecheck} from "./single-agent-semantic-verifier-boundary.js";
import {expandSelectionOptions,selectionChoiceResolution,selectionEvidenceFromOptions,selectionEvidenceWithExpiry,selectionEvidenceHash,selectionSourceHash,
 selectionOptionScope,selectionValues,validSelectionEvidence,type CandidateSelectionEvidence} from "./single-agent-commerce-selection-evidence.js";
import {candidateCartOptions} from "./realtime-sales-catalog.js";

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
 const evidence=data.selectionEvidence as CandidateSelectionEvidence;
 expect(selectionChoiceResolution(evidence,commerceNow,"COLOR_REQUIRED")).toMatchObject({kind:"NEEDS_CUSTOMER_CHOICE",field:"COLOR",evidenceHash:evidence.contentHash});
 expect(selectionChoiceResolution(evidence,commerceNow,"STALE")).toBeNull();
 expect(selectionChoiceResolution({...evidence,quantity:2},commerceNow,"COLOR_REQUIRED")).toBeNull();
 expect(selectionChoiceResolution(evidence,new Date(Date.parse(evidence.expiresAt)),"COLOR_REQUIRED")).toBeNull();
 expect(expandSelectionOptions(evidence)).toEqual(data.selectionOptions);
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
 f.snapshot.offers.DIRECT!.rows=["S","M","L","XL","XXL"].flatMap(size=>["be","navy","white","black","red","blue","green","brown"].map(color=>({...structuredClone(row),size,color,parent_variation_id:`SM613-${size}-${color}`})));
 const tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,candidateEvidence:true,initialProducts:[f.product],catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});
 let admitted=0,rejected=false;
 for(const size of["S","M","L","XL","XXL"]){const before=tools.snapshot(),r=await tools.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT",size}});
  if(r.status==="REJECTED"){expect(tools.snapshot()).toEqual(before);rejected=true;break;}admitted++;}
 expect(admitted).toBeGreaterThan(0);expect(rejected).toBe(true);
});

// Completeness is a statement about the source, so it is computed from every source tuple.
const tupleFixture=(colors:(string|null)[],sizes:string[])=>{
 const f=fixtureProduct(),row=f.snapshot.offers.DIRECT!.rows[0]!;
 f.snapshot.offers.DIRECT!.rows=colors.flatMap(color=>sizes.map(size=>({...structuredClone(row),color:color??"",size,parent_variation_id:`SM613-${color??"NONE"}-${size}`})));
 const options=candidateCartOptions(f.snapshot,{shopAlias:commerceScope().shopAlias,productId:f.product.productId,offerType:"DIRECT",size:null,color:null,quantity:1,
  lineId:"00000000-0000-4000-8000-000000000001"},commerceNow);
 const input={productId:f.product.productId,offerType:"DIRECT",size:null,color:null,quantity:1,sourceVersion:f.snapshot.release_id,sourceHash:selectionSourceHash(f.snapshot),
  observedAt:f.snapshot.synced_at,expiresAt:new Date(commerceNow.getTime()+120000).toISOString()};
 return {options,input};
};
it("labels eight or fewer source tuples as the whole list for the query",()=>{
 const {options,input}=tupleFixture(["trắng","be"],["S","M","L","XL"]);expect(options).toHaveLength(8);
 const e=selectionEvidenceFromOptions(input,options,commerceNow)!;
 expect(e).toMatchObject({kind:"CANDIDATE_SELECTION_V3",completeness:"ALL_EXACT_TUPLES_FOR_QUERY",allSourceValuesForQuery:null});
 expect(e.options).toHaveLength(8);expect(validSelectionEvidence(e,e.productId,commerceNow)).toBe(true);
 expect(selectionOptionScope(options.length)).toBe("ALL_EXACT_TUPLES_FOR_QUERY");
});
it("keeps every colour and size of a cut list, with the stock states seen for each",()=>{
 const {options,input}=tupleFixture(["trắng","be","đen"],["S","M","L"]);expect(options).toHaveLength(9);
 options.filter(o=>o.color==="be").forEach(o=>{(o as {status:string}).status="PRE_ORDER";});
 const e=selectionEvidenceFromOptions(input,options,commerceNow)!;
 expect(e.completeness).toBe("FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY");expect(e.options).toHaveLength(8);
 // "đen" size L is the ninth tuple: absent from options, present in the value list.
 expect(e.allSourceValuesForQuery).toEqual({colors:{complete:true,values:[{value:"trắng",stock:["IN_STOCK"]},{value:"be",stock:["PRE_ORDER"]},{value:"đen",stock:["IN_STOCK"]}]},
  sizes:{complete:true,values:[{value:"S",stock:["IN_STOCK","PRE_ORDER"]},{value:"M",stock:["IN_STOCK","PRE_ORDER"]},{value:"L",stock:["IN_STOCK","PRE_ORDER"]}]}});
 expect(Buffer.byteLength(JSON.stringify(e))).toBeLessThanOrEqual(4096);
 expect(selectionOptionScope(options.length)).toBe("FIRST_8_EXACT_TUPLES_FOR_QUERY_NOT_COMPLETE_INVENTORY");
});
it("never counts an unrecorded colour as a colour and marks the colour list incomplete",()=>{
 const {options,input}=tupleFixture(["trắng",null,"be"],["S","M","L"]);
 const e=selectionEvidenceFromOptions(input,options,commerceNow)!;
 expect(e.allSourceValuesForQuery!.colors).toEqual({complete:false,values:[{value:"trắng",stock:["IN_STOCK"]},{value:"be",stock:["IN_STOCK"]}]});
 expect(e.allSourceValuesForQuery!.sizes.complete).toBe(true);
 expect(selectionValues([{size:"M",color:"__NO_COLOR__",status:"IN_STOCK"}],"color")).toEqual({values:[],complete:false});
});
it("caps a value list and says so instead of presenting it as complete",()=>{
 const colors=Array.from({length:14},(_,i)=>`mau${i}`),{options,input}=tupleFixture(colors,["M"]);
 const e=selectionEvidenceFromOptions(input,options,commerceNow)!;
 expect(e.allSourceValuesForQuery!.colors.values).toHaveLength(12);expect(e.allSourceValuesForQuery!.colors.complete).toBe(false);
});
it("rejects forged completeness and value lists that contradict the retained tuples",()=>{
 const rehash=(e:CandidateSelectionEvidence)=>{const {contentHash:_old,...body}=e;return {...body,contentHash:selectionEvidenceHash(body)} as CandidateSelectionEvidence;};
 const cut=selectionEvidenceFromOptions(tupleFixture(["trắng","be","đen"],["S","M","L"]).input,tupleFixture(["trắng","be","đen"],["S","M","L"]).options,commerceNow)!;
 // A cut list cannot be relabelled as the whole list, nor lose a colour its own tuples show.
 expect(validSelectionEvidence(rehash({...cut,completeness:"ALL_EXACT_TUPLES_FOR_QUERY"}),cut.productId,commerceNow)).toBe(false);
 expect(validSelectionEvidence(rehash({...cut,completeness:"ALL_EXACT_TUPLES_FOR_QUERY",allSourceValuesForQuery:null,options:cut.options.slice(0,7)}),cut.productId,commerceNow)).toBe(true);
 const dropped=structuredClone(cut);dropped.allSourceValuesForQuery!.colors.values.shift();
 expect(validSelectionEvidence(rehash(dropped),cut.productId,commerceNow)).toBe(false);
 const whole=selectionEvidenceFromOptions(tupleFixture(["trắng","be"],["M"]).input,tupleFixture(["trắng","be"],["M"]).options,commerceNow)!;
 expect(validSelectionEvidence(rehash({...whole,completeness:"FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY"}),whole.productId,commerceNow)).toBe(false);
});
it("shortening the lifetime keeps completeness and value lists that the retained tuples cannot rebuild",()=>{
 const {options,input}=tupleFixture(["trắng","be","đen"],["S","M","L"]),e=selectionEvidenceFromOptions(input,options,commerceNow)!;
 const sooner=new Date(commerceNow.getTime()+60000).toISOString(),clipped=selectionEvidenceWithExpiry(e,sooner,commerceNow)!;
 expect(clipped).toMatchObject({expiresAt:sooner,completeness:e.completeness,allSourceValuesForQuery:e.allSourceValuesForQuery,options:e.options});
 expect(clipped.contentHash).not.toBe(e.contentHash);expect(validSelectionEvidence(clipped,e.productId,commerceNow)).toBe(true);
 expect(selectionEvidenceWithExpiry(e,new Date(commerceNow.getTime()+999999).toISOString(),commerceNow)).toBeNull();
});
