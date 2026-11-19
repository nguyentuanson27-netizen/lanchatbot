import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {expandDeclaredToolExecution,expandDefaultSellingOption} from './owner-data-presentation.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference,stateDeclarations,readOnlyDeclarations} from './gemini-inference.mjs';
const request=()=>({generationId:'turn:owner:1',instructions:'Tư vấn theo dữ kiện.',contents:[{role:'user',parts:[{text:'Chị xem mẫu này.'}]}],
 ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2',toolsAllowed:true,toolBudget:{roundsRemaining:1,callsRemaining:4},
 context:{boundSubjects:[],protectedClaims:[],runtimeProducts:[],policyLiterals:[],effectReceipts:[],state:{revision:1,currentProductId:null}}});
const sections=wire=>Object.fromEntries(wire.contents[0].parts[0].text.split('\n\n').map(s=>{const i=s.indexOf('\n');return [s.slice(0,i),JSON.parse(s.slice(i+1))];}));
const bytes=wire=>Buffer.byteLength(JSON.stringify(wire));
const nameList=wire=>wire.tools.flatMap(t=>t.functionDeclarations.map(d=>d.name));
const readResponse=wire=>wire.contents.at(-1).parts[0].functionResponse.response.data;
function exactRead(){
 const r=request();r.availableTools=['read_product'];
 const o={offerType:'AO',variantId:'V1',facts:[{type:'PRICE',scope:{kind:'PRODUCT',productId:'P1',variantId:'V1'},value:{amountVnd:499000,currency:'VND'}}],
 availability:{price:{status:'OK',reason:null},stock:{status:'OK',reason:null}},sizeAvailability:{confirmedInStockSizes:['M'],missingSizes:[]},sourceVersion:'v1',observedAt:'2026-11-01T00:00:00Z',expiresAt:'2026-11-01T00:20:00Z'};
 const data={subjectRef:'P1',requestedOfferType:'AO',...structuredClone(o),sellingOptions:[structuredClone(o)]};
 r.contents.push({role:'model',parts:[{functionCall:{id:'read1',name:'read_product',args:{subjectRef:'P1',selection:'SINGLE',offerType:'AO'}},thoughtSignature:'opaque-signature'}]},
  {role:'user',parts:[{functionResponse:{id:'read1',name:'read_product',response:{status:'OK',data}}}]});
 return {r,data};
}
test('CompactV2 factors only the duplicate operation envelope and preserves state schema instances',()=>{
 const r=request();r.availableTools=['apply_customer_state','recommend_size'];
 const wire=buildGeminiCommerceRequest(r),declarations=wire.tools[0].functionDeclarations;
 const ajv=new Ajv({strict:false});let checked=0;
 const fields=['HEIGHT_CM','WEIGHT_KG','BUST_CM','WAIST_CM','HIPS_CM','fitPreference','preferences.colors','preferences.styles','preferences.materials','UNKNOWN'];
 const values=[undefined,null,0,74,'REGULAR','RELAXED','BAD',[],['navy'],[1],{},'x'.repeat(161)];
 for(const name of r.availableTools){
  const original=stateDeclarations.find(d=>d.name===name).parametersJsonSchema;
  const current=declarations.find(d=>d.name===name).parametersJsonSchema;
  const key=name==='apply_customer_state'?'ops':'customerStateOps';
  assert.equal(current.properties[key].items.properties,undefined,'duplicate outer properties');
  assert(current.properties[key].items.anyOf.every(b=>b.additionalProperties===false));
  const before=ajv.compile(original),after=ajv.compile(current);
  for(const field of fields)for(const op of ['SET','REPLACE','CLEAR','UNKNOWN'])for(const value of values)for(const extra of [{},{sourceQuote:'Chị đổi số đo.'},{sourceQuote:null},{sourceQuote:''},{extra:true}]){
   const entry={op,field,...(value!==undefined?{value}:{}),...extra};
   const sample={[key]:[entry],...(name==='recommend_size'?{subjectRef:'P1'}:{})};
   assert.equal(after(sample),before(sample),JSON.stringify({name,sample}));checked++;
  }
  for(const ops of [[],Array(9).fill({op:'CLEAR',field:'HEIGHT_CM'}),null,{},[null]]){
   const sample={[key]:ops,...(name==='recommend_size'?{subjectRef:'P1'}:{})};assert.equal(after(sample),before(sample));checked++;
  }
 }
 assert(checked>=4000);
 const legacy=structuredClone(r);delete legacy.ownerContextPresentation;
 assert.deepEqual(buildGeminiCommerceRequest(legacy).tools[0].functionDeclarations.find(d=>d.name==='apply_customer_state').parametersJsonSchema,stateDeclarations[0].parametersJsonSchema);
});
test('single exact option carries one copy of default data and preserves native call/signature and original response',()=>{
 const {r,data}=exactRead(),saved=structuredClone(r),wire=buildGeminiCommerceRequest(r),projected=readResponse(wire);
 for(const key of ['offerType','variantId','facts','availability','sizeAvailability'])assert.equal(Object.hasOwn(projected,key),false,key);
 const expanded=expandDefaultSellingOption(projected);
 const original={...data};delete original.requestedOfferType;assert.deepEqual(expanded,original);
 assert.deepEqual(wire.contents.at(-2),r.contents.at(-2));assert.deepEqual(r,saved);
});
for(const field of ['offerType','variantId','facts','availability','sizeAvailability','sourceVersion','observedAt','expiresAt'])test(`single option dedup retains mismatched ${field}`,()=>{
 const {r,data}=exactRead();
 if(field==='facts')data.sellingOptions[0].facts=[...data.facts,{type:'STOCK',scope:{},value:{quantity:1}}];
 else if(field==='availability')data.sellingOptions[0].availability.price.status='UNAVAILABLE';
 else if(field==='sizeAvailability')data.sellingOptions[0].sizeAvailability.confirmedInStockSizes=['L'];
 else data.sellingOptions[0][field]='changed';
 const value=readResponse(buildGeminiCommerceRequest(r));assert(Object.hasOwn(value,'offerType'));assert(Object.hasOwn(value,'facts'));
});
test('single dedup retains partial results and explicit selected identity with multiple options',()=>{
 const a=exactRead();a.data.availability.stock.status='UNAVAILABLE';a.data.sellingOptions[0].availability.stock.status='UNAVAILABLE';
 assert(Object.hasOwn(readResponse(buildGeminiCommerceRequest(a.r)),'facts'));
 const b=exactRead();b.data.sellingOptions.push({...structuredClone(b.data.sellingOptions[0]),offerType:'SET',variantId:'V2'});
 assert.equal(readResponse(buildGeminiCommerceRequest(b.r)).offerType,'AO');
});
test('tool names reference exactly the same ordered native declaration inventory and leave subsets explicit',()=>{
 const r=request();r.availableTools=['read_policy','request_handoff'];const wire=buildGeminiCommerceRequest(r),e=sections(wire)['Khả năng thực hiện lượt này'];
 assert.equal(e.toolNamesFrom,'DECLARED_TOOL_SCHEMAS');assert.equal(Object.hasOwn(e,'availableTools'),false);assert.equal(Object.hasOwn(e,'callableTools'),false);
 assert.deepEqual(nameList(wire),r.availableTools);
 r.toolsAllowed=false;r.terminalHandoffAllowed=true;
 const subset=sections(buildGeminiCommerceRequest(r))['Khả năng thực hiện lượt này'];assert.deepEqual(subset.availableTools,r.availableTools);assert.deepEqual(subset.callableTools,['request_handoff']);assert.equal(subset.toolNamesFrom,undefined);
 r.availableTools=[];r.terminalHandoffAllowed=false;const empty=buildGeminiCommerceRequest(r);assert.deepEqual(nameList(empty),[]);
});
test('raw and presented request guards keep65536 with limit-1/limit/limit+1 and zero auth/HTTP on overflow',async()=>{
 const r=request();r.availableTools=[];let budget;
 const initial=buildGeminiCommerceRequest(r,undefined,undefined,b=>{budget=b;}),base=bytes(initial);
 for(const delta of [-1,0,1]){
  const probe=structuredClone(r);probe.instructions+='x'.repeat(65536-base+delta);
  if(delta>0)assert.throws(()=>buildGeminiCommerceRequest(probe),/OWNER_REQUEST_BOUND/);
  else assert.equal(bytes(buildGeminiCommerceRequest(probe)),65536+delta);
 }
 let auth=0,http=0;const infer=createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',projectId:'unit',location:'global'},
 {getToken:async()=>{auth++;return 'unit';},fetchImpl:async()=>{http++;throw Error('must not call');}});
 r.instructions='x'.repeat(65537);await assert.rejects(()=>infer({...r,signal:new AbortController().signal}),error=>error.telemetry?.failureCode==='OWNER_REQUEST_BOUND');assert.equal(auth,0);assert.equal(http,0);
});


test('same-body references round-trip and reject mixed, invalid or duplicate reference shapes',()=>{
 const r=request();r.availableTools=['read_policy','request_handoff'];
 const body=buildGeminiCommerceRequest(r),current=sections(body)['Khả năng thực hiện lượt này'],decl=body.tools[0].functionDeclarations;
 assert.deepEqual(expandDeclaredToolExecution(current,decl),{toolsAllowed:true,phase:'TOOL_OR_REPLY',toolBudget:r.toolBudget,availableTools:r.availableTools,callableTools:r.availableTools});
 for(const value of [{...current,toolNamesFrom:'OTHER'},{...current,availableTools:[]},{...current,callableTools:[]}])
  assert.throws(()=>expandDeclaredToolExecution(value,decl),/EXECUTION_REFERENCE/);
 assert.throws(()=>expandDeclaredToolExecution(current,[decl[0],decl[0]]),/EXECUTION_REFERENCE/);
 assert.throws(()=>expandDeclaredToolExecution(current,[{name:null}]),/EXECUTION_REFERENCE/);
 const explicit={availableTools:['a'],callableTools:[]};assert.deepEqual(expandDeclaredToolExecution(explicit,[]),explicit);
 r.availableTools=['read_policy','read_policy'];const duplicate=sections(buildGeminiCommerceRequest(r))['Khả năng thực hiện lượt này'];
 assert.equal(duplicate.toolNamesFrom,undefined);assert.deepEqual(duplicate.availableTools,r.availableTools);
 const {r:read}=exactRead(),d=readResponse(buildGeminiCommerceRequest(read));assert.equal(d.defaultFromOption,0);
 for(const bad of [{...d,defaultFromOption:1},{...d,offerType:'AO'},{...d,sellingOptions:[]},{...d,sellingOptions:[d.sellingOptions[0],d.sellingOptions[0]]}])
  assert.throws(()=>expandDefaultSellingOption(bad),/DEFAULT_OPTION_REFERENCE/);
});
test('unknown state input schema is retained and no custom contract is compacted by guesswork',()=>{
 const r=request();const custom={...structuredClone(stateDeclarations[0]),parametersJsonSchema:{type:'object',properties:{ops:{type:'string'}}}};
 const wire=buildGeminiCommerceRequest(r,[custom]);assert.deepEqual(wire.tools[0].functionDeclarations[0].parametersJsonSchema,custom.parametersJsonSchema);
});
