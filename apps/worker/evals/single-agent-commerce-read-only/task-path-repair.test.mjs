import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as wire from './gemini-inference.mjs';
import * as tables from './owner-product-tables.mjs';
import {readCompactSections} from './owner-data-presentation.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const allNames=()=>['readOnlyDeclarations','stateDeclarations','effectDeclarations','quoteDeclarations','mediaDeclarations','handoffDeclarations'].flatMap(k=>wire[k].map(d=>d.name));
export const request=(returning=false,compact=true)=>({instructions:'Tư vấn theo nguồn.',ownerContextPresentation:compact?'VI_DATA_BLOCKS_COMPACT_V2':undefined,
 toolWorkAccounting:'PRIMITIVE_WORK_V2',availableTools:allNames(),toolsAllowed:true,toolBudget:{roundsRemaining:2,callsRemaining:6},contents:[{role:'user',parts:[{text:'Chị lấy áo.'}]}],
 context:{boundSubjects:[{ref:'P1',kind:'PRODUCT',label:'Mẫu một'},{ref:'L1',kind:'CART_LINE',label:'Dòng một',productId:'P1'}],protectedClaims:[],runtimeProducts:[],
 policyLiterals:[{ref:'conversation-entry',text:JSON.stringify({firstContact:!returning})}],effectReceipts:[],state:{revision:1,currentProductId:'P1'}}});
export const contract=r=>{const b=wire.buildGeminiCommerceRequest(r);return {schemas:b.tools[0].functionDeclarations.map(({description,...d})=>d),toolConfig:b.toolConfig};};
const baseline=JSON.parse(readFileSync(new URL('./task-path-contract-baseline.json',import.meta.url)));
test('full emitted schemas, names, native call policy and owner prompt remain unchanged',()=>{
 for(const compact of [false,true])for(const returning of [false,true])assert.equal(hash(contract(request(returning,compact))),baseline.contracts[`${compact}:${returning}`]);
 assert.equal(createHash('sha256').update(readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url))).digest('hex'),baseline.ownerPromptHash);
});
test('full native tool instructions save at least 4KiB without dropping tools',()=>{
 const b=wire.buildGeminiCommerceRequest(request());
 assert.equal(b.tools[0].functionDeclarations.length,14);
 assert(Buffer.byteLength(JSON.stringify(b.tools))<=baseline.toolBytes-4096);
});
const product=(id,role='TOP',ref='TOP-1',quantity=1)=>({subjectRef:id,purchaseOptions:[{offerType:'AO',priceRead:{subjectRef:id,offerType:'AO'},stockRead:{subjectRef:id,offerType:'AO'},
 componentSource:{status:'AVAILABLE',completeness:'INSPECTED_ROWS',components:[{role,componentRef:ref,quantity}]}}]});
test('shared single item lists both source targets, never selects or merges commercial data',()=>{
 const ps=[product('P1'),product('P2')],saved=structuredClone(ps);
 assert.deepEqual(tables.sharedSingleItemReads(ps),[{componentRef:'TOP-1',role:'TOP',readTargets:[{subjectRef:'P1',offerType:'AO'},{subjectRef:'P2',offerType:'AO'}]}]);
 assert.deepEqual(ps,saved);
 assert.deepEqual(tables.sharedSingleItemReads(tables.expandOwnerProducts(tables.compactOwnerProducts(ps))),tables.sharedSingleItemReads(ps));
});
test('emitted CompactV2 links retain both independent offers without altering source context',()=>{
 const r=request(),ps=[product('P1'),product('P2')];
 r.context.boundSubjects=ps.map(p=>({ref:p.subjectRef,kind:'PRODUCT',label:'Cùng tên chưa đủ để gộp'}));
 for(const p of ps)r.context.policyLiterals.push({ref:`offers:${p.subjectRef}`,text:JSON.stringify({productId:p.subjectRef,availableOffers:['AO'],purchaseOptions:p.purchaseOptions})});
 const before=structuredClone(r),body=wire.buildGeminiCommerceRequest(r);
 const sections=readCompactSections(body.contents[0]);
 assert.deepEqual(sections.find(s=>s.label==='"sharedSingleItemReads"').value,tables.sharedSingleItemReads(ps));
 const visible=sections.find(s=>s.label==='Sản phẩm').value;
 assert.equal(visible.length,2);assert.deepEqual(visible.map(p=>p.purchaseOptions),ps.map(p=>p.purchaseOptions));assert.deepEqual(r,before);
});
test('unknown, conflicting, bundle and duplicate source identities do not suggest common purchase paths',()=>{
 for(const modify of [p=>p[1].purchaseOptions[0].componentSource.status='UNKNOWN',p=>p[1].purchaseOptions[0].componentSource.completeness='UNKNOWN',
 p=>p[1].purchaseOptions[0].componentSource.components[0].role='PANTS',p=>p[1].purchaseOptions[0].componentSource.components[0].quantity=2,
 p=>p[1].purchaseOptions[0].componentSource.components.push({role:'SKIRT',componentRef:'SKIRT-1',quantity:1}),
 p=>p.push(structuredClone(p[0])),p=>p[1].purchaseOptions.push(structuredClone(p[1].purchaseOptions[0])),
 p=>p[1].purchaseOptions[0].priceRead.subjectRef='OTHER',p=>p[1].purchaseOptions[0].componentSource.components[0].componentRef='OTHER']){
  const ps=[product('P1'),product('P2')];modify(ps);assert.deepEqual(tables.sharedSingleItemReads(ps),[]);
 }
});
test('malformed native function calls retain failure, count one HTTP, expose no supplied values',async()=>{
 let calls=0;const secret='private-raw-value';
 const infer=wire.createGeminiCommerceInference({model:'gemini-3.5-flash-lite',projectId:'unit',location:'global',effort:'high'}, {getToken:async()=>'unit',fetchImpl:async()=>{calls++;return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'MALFORMED_FUNCTION_CALL',content:{role:'model',parts:[{functionCall:{name:'apply_customer_state',args:{ops:[{sourceQuote:secret}], [secret]:secret}}},{functionCall:{name:secret,args:{secret}}}]}}]}),{status:200});}});
 await assert.rejects(()=>infer({...request(),signal:new AbortController().signal}),e=>{
  assert.equal(e.telemetry.failureCode,'OWNER_FINISH_REASON');assert.equal(e.telemetry.providerRequests,1);
  const d=e.telemetry.malformedCallShape;assert(d);assert.equal(d.calls[0].tool,'apply_customer_state');assert.equal(d.calls[0].argsType,'OBJECT');
  assert.equal(d.calls[1].tool,'UNKNOWN_TOOL');assert(!JSON.stringify(d).includes(secret));return true;
 });assert.equal(calls,1);
});
test('no emitted call is recorded as absent; malformed shape inspection is bounded',()=>{
 assert.deepEqual(wire.malformedCallShape({candidates:[{content:{parts:[{text:'private'}]}}]}),{inspectedParts:1,truncated:false,calls:[]});
 const d=wire.malformedCallShape({candidates:[{content:{parts:Array(100).fill({functionCall:{name:'read_product',args:{subjectRef:'private'}}})}}]});
 assert(d.inspectedParts<=16);assert.equal(d.calls.length,8);assert.equal(d.truncated,true);assert(!JSON.stringify(d).includes('private'));
 const nine=wire.malformedCallShape({candidates:[{content:{parts:Array(9).fill({functionCall:{name:'read_product',args:{}}})}}]});
 assert.equal(nine.calls.length,8);assert.equal(nine.truncated,true,'ninth call omitted even when it is the last part');
});
for(const [label,sourceBytes,signatureBytes,tool] of [['read-continuation',10500,13500,'read_product'],['state-continuation',6500,17500,'apply_customer_state']])test(`full native ${label} fits with existing tools, prompt and signed parts`,async()=>{
 // Portable size regression, modeled on observed source/signature sizes; not a historical replay.
 const r=request(true);r.instructions=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
 r.context.policyLiterals.push({ref:'synthetic-public-source',text:JSON.stringify({description:'x'.repeat(sourceBytes)})});
 const args=tool==='read_product'?{subjectRef:'P1',selection:'SINGLE',offerType:'AO'}:{ops:[{op:'SET',field:'preferences.colors',value:['be'],sourceQuote:'Chị thích be'}]};
 const signed={role:'model',parts:[{functionCall:{id:'captured-call',name:tool,args},thoughtSignature:'s'.repeat(signatureBytes)}]};
 r.contents.push(signed,{role:'user',parts:[{functionResponse:{id:'captured-call',name:tool,response:{status:'OK',data:{revision:2,measurements:[]}}}}]});
 r.toolBudget={roundsRemaining:1,callsRemaining:5};let calls=0;
 await wire.createGeminiCommerceInference({model:'gemini-3.5-flash-lite',projectId:'unit',location:'global',effort:'high'},{getToken:async()=>'mock',fetchImpl:async(_url,init)=>{
  calls++;const body=JSON.parse(init.body);assert.deepEqual(body.contents.at(-2),signed);assert.equal(body.tools[0].functionDeclarations.length,14);assert(Buffer.byteLength(init.body)<=65536);
  return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Dạ chị.'}]}}]}));
 }} )({...r,signal:new AbortController().signal});assert.equal(calls,1);
});
