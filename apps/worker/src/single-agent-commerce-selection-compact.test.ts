import {it,expect,vi} from "vitest";
import {candidateCartOptions} from "./realtime-sales-catalog.js";
import * as selection from "./single-agent-commerce-selection-evidence.js";
import {createReadOnlyTools} from "./single-agent-commerce-read-only-tools.js";
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from "./single-agent-commerce.test-support.js";
import {omitCurrentProductDuplicates} from "./single-agent-commerce-read-only-context.js";
import {hardPrecheck} from "./single-agent-semantic-verifier-boundary.js";

const optionsFixture=()=>{
 const f=fixtureProduct(),options=candidateCartOptions(f.snapshot,{shopAlias:commerceScope().shopAlias,productId:f.product.productId,offerType:"DIRECT",size:null,color:null,quantity:1,lineId:"00000000-0000-4000-8000-000000000001"},commerceNow);
 const input={productId:f.product.productId,offerType:"DIRECT",size:null,color:null,quantity:1,sourceVersion:f.snapshot.release_id,sourceHash:selection.selectionSourceHash(f.snapshot),observedAt:f.snapshot.synced_at,expiresAt:new Date(commerceNow.getTime()+120000).toISOString()};
 return {f,options,input};
};
const toolsFor=(f:ReturnType<typeof fixtureProduct>)=>createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,candidateEvidence:true,initialProducts:[f.product],catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}});

it("three offers with eight exact tuples fit without dropping options or raising product bounds",async()=>{
 const f=fixtureProduct(),template=f.snapshot.offers.DIRECT!,row=template.rows[0]!;
 f.snapshot.offers=Object.fromEntries(["AO","CV","SET"].map(offer=>[offer,{...structuredClone(template),rows:["be","navy","white","black","red","blue","green","brown"].map(color=>({...structuredClone(row),offer_type:offer,color,parent_variation_id:`SM613-${offer}-${color}`}))}]));
 const tools=toolsFor(f),result=await tools.invoke({name:"read_product",args:{subjectRef:f.product.productId,offerTypes:["AO","CV","SET"]}});
 expect(result.status).toBe("OK");const product=tools.snapshot().runtimeProducts![0]!;
 expect(Buffer.byteLength(JSON.stringify(product))).toBeLessThanOrEqual(8192);
 expect(product.selectionEvidence?.map(e=>e.options.length)).toEqual([8,8,8]);
 expect(hardPrecheck(tools.snapshot(),"Chị xem các lựa chọn nhé.",commerceNow)).toBeNull();
 const before=tools.snapshot();await expect(tools.readback()).resolves.toEqual(before);
});

it("V2 factors only repeated envelope fields and expands exactly the original normalized tuple contract",()=>{
 const {options,input}=optionsFixture(),e=selection.selectionEvidenceFromOptions(input,options,commerceNow)!;
 expect(e.kind).toBe("CANDIDATE_SELECTION_V2");
 expect(Object.keys(e.options[0]!).sort()).toEqual(["color","identityHash","reasonCode","size","status"]);
 const expanded=selection.expandSelectionOptions(e);
 expect(expanded).toEqual(options.slice(0,8).map(o=>({...o,expiresAt:input.expiresAt})));
 expect(omitCurrentProductDuplicates({selectionEvidence:e,selectionOptions:expanded},{ref:`product:${input.productId}`,subjectRef:input.productId,selectionEvidence:[e]})).toEqual({});
 const changed=structuredClone(expanded);changed[0]!.status="UNKNOWN";
 expect(omitCurrentProductDuplicates({selectionOptions:changed},{ref:`product:${input.productId}`,subjectRef:input.productId,selectionEvidence:[e]})).toHaveProperty("selectionOptions",changed);
});

it("full option inputs cannot launder subject/source/quantity/time/extra fields before compaction",()=>{
 const {options,input}=optionsFixture();expect(options.length).toBeGreaterThan(0);
 for(const patch of[{productId:"OTHER"},{offerType:"OTHER"},{quantity:2},{sourceVersion:"OTHER"},{observedAt:new Date(commerceNow.getTime()+1).toISOString()},{expiresAt:"not-a-date"},{unexpected:"private-marker"}]){
  const bad=structuredClone(options);Object.assign(bad[0]!,patch);expect(selection.selectionEvidenceFromOptions(input,bad,commerceNow)).toBeNull();
 }
 for(const expiresAt of[new Date(commerceNow.getTime()+60000).toISOString(),new Date(commerceNow.getTime()+3600000).toISOString()]){
  const source=options.map(o=>({...o,expiresAt})),e=selection.selectionEvidenceFromOptions(input,source,commerceNow)!;
  expect(selection.expandSelectionOptions(e)).toEqual(source.slice(0,8).map(o=>({...o,expiresAt:input.expiresAt})));
 }
});

it("V2 strict envelope/tuple hashes, expiry, selectors and identity remain fail closed",()=>{
 const {options,input}=optionsFixture(),e=selection.selectionEvidenceFromOptions(input,options,commerceNow)!;
 for(const mutate of[(x:typeof e)=>{(x as {kind:string}).kind="CANDIDATE_SELECTION_V1";},(x:typeof e)=>{Object.assign(x.options[0]!,{productId:"OTHER"});},(x:typeof e)=>{x.options[0]!.size="XL";},(x:typeof e)=>{x.quantity=2;},(x:typeof e)=>{x.expiresAt=commerceNow.toISOString();}]){
  const bad=structuredClone(e);mutate(bad);expect(selection.validSelectionEvidence(bad,input.productId,commerceNow)).toBe(false);
 }
 const extra=structuredClone(e);Object.assign(extra,{unexpected:true});expect(selection.validSelectionEvidence(extra,input.productId,commerceNow)).toBe(false);
 const missing=structuredClone(e);delete (missing.options[0] as Partial<typeof missing.options[number]>).status;expect(selection.validSelectionEvidence(missing,input.productId,commerceNow)).toBe(false);
 const duplicate=structuredClone(e);duplicate.options.push(duplicate.options[0]!);const {contentHash:_,...body}=duplicate;duplicate.contentHash=selection.selectionEvidenceHash(body);
 expect(selection.validSelectionEvidence(duplicate,input.productId,commerceNow)).toBe(false);
});

it("a failed source-proof constructor cannot silently publish an unverified candidate read",async()=>{
 const tools=toolsFor(fixtureProduct()),before=tools.snapshot();const spy=vi.spyOn(selection,"selectionEvidenceFromOptions").mockReturnValueOnce(null);
 try{expect(await tools.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT"}})).toEqual({status:"UNAVAILABLE",reason:"SOURCE_ERROR"});expect(tools.snapshot()).toEqual(before);}
 finally{spy.mockRestore();}
});

it("merge rejection reports known bound/conflict separately; unknown errors do not leak or poison snapshot",async()=>{
 for(const [message,status,reason]of[["PRODUCT_EVIDENCE_BOUND","REJECTED","PRODUCT_EVIDENCE_BOUND"],["SOURCE_EVIDENCE_CONFLICT","REJECTED","SOURCE_EVIDENCE_CONFLICT"],["private-marker","UNAVAILABLE","SOURCE_ERROR"]]){
  const tools=toolsFor(fixtureProduct()),before=tools.snapshot();
  const spy=vi.spyOn(selection,"mergeSelectionEvidence").mockImplementationOnce(()=>{throw Error(message);});
  try{const result=await tools.invoke({name:"read_product",args:{subjectRef:"SM613",offerType:"DIRECT"}});
   expect(result).toEqual({status,reason});expect(JSON.stringify(result)).not.toContain("private-marker");expect(tools.snapshot()).toEqual(before);
  }finally{spy.mockRestore();}
 }
});
