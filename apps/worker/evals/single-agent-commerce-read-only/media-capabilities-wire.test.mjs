import {createHash} from 'node:crypto';
import {readCompactSections} from './owner-data-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildQuoteRequest} from './quote-presentation-diagnostic.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
const row=JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url))).records[0];
const prompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
const request=()=>buildQuoteRequest(row,'A','neutral',prompt);
const hint=()=>({schemaVersion:1,subjectRef:row.capture.context.boundSubjects.find(s=>s.kind==='PRODUCT').ref,
 observedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),mediaSourceHash:'a'.repeat(64),
 queries:[{intent:'GENERIC',componentRole:null,color:null,status:'MATCH_AVAILABLE'}]});
test('hint reaches exact HTTP without canonical snapshot changes or evaluator labels',async()=>{
 const r=request(),before=structuredClone(r.context);r.mediaCapabilities=[hint()];let wire;
 await createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test'},
 {getToken:async()=>'test',fetchImpl:async(_u,i)=>{wire=JSON.parse(i.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Dạ chị.'}]}}]}));}})(r);
 assert.deepEqual(JSON.parse(wire.contents[0].parts[0].text).trusted.execution.mediaCapabilities,r.mediaCapabilities);
 assert.deepEqual(r.context,before);assert.deepEqual(wire,buildGeminiCommerceRequest(r));
});
test('malformed, unbound and expired hints are omitted; near-bound base/history remains exact',()=>{
 for(const bad of [{...hint(),caseId:'EVALUATOR_ONLY'},{...hint(),subjectRef:'WRONG'},{...hint(),expiresAt:new Date(0).toISOString()}]){
  const r=request(),base=buildGeminiCommerceRequest(r);r.mediaCapabilities=[bad];assert.deepEqual(buildGeminiCommerceRequest(r),base);
 }
 const r=request();const baseline=buildGeminiCommerceRequest(r);const padding=65500-Buffer.byteLength(JSON.stringify(baseline))-100;
 r.contents.push({role:'user',parts:[{text:'x'.repeat(padding)}]});const base=buildGeminiCommerceRequest(r);
 r.mediaCapabilities=[hint()];assert.deepEqual(buildGeminiCommerceRequest(r),base);
});

test('native Compact V2 keeps signed tool pairs and history while adding one bounded hint',()=>{
 const r=request();r.toolsAllowed=true;r.availableTools=['read_product'];
 r.contents.push({role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:hint().subjectRef}},thoughtSignature:'signed'}]},
  {role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:{subjectRef:hint().subjectRef}}}}]});
 r.ownerContextPresentation='VI_DATA_BLOCKS_COMPACT_V2';const base=buildGeminiCommerceRequest(r);r.mediaCapabilities=[hint()];const withHint=buildGeminiCommerceRequest(r);
 assert.deepEqual(withHint.contents.slice(1),base.contents.slice(1));assert.deepEqual(withHint.tools,base.tools);
 assert.deepEqual(readCompactSections(withHint.contents[0]).find(s=>s.label==='Khả năng thực hiện lượt này').value.mediaCapabilities,r.mediaCapabilities);
});

test('captured generation clock keeps audit and HTTP selection deterministic at the expiry boundary',()=>{
 const r=request(),h=hint();r.mediaCapabilities=[h];r.mediaCapabilitiesAt=Date.parse(h.expiresAt)-1;
 const first=buildGeminiCommerceRequest(r);assert.deepEqual(buildGeminiCommerceRequest(r),first);
 r.mediaCapabilitiesAt=Date.parse(h.expiresAt);assert.equal(JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted.execution.mediaCapabilities,undefined);
});

test('omitting an optional hint never rejects an otherwise valid large image request on the default transport',()=>{
 const r=request(),data=Buffer.alloc(70000,1),sha256=createHash('sha256').update(data).digest('hex');
 const subjectRef=hint().subjectRef,assetRef='asset:large';
 r.catalogImages=[{subjectRef,assetRef,sha256,mimeType:'image/png',data:data.toString('base64')}];
 r.context.policyLiterals.push({ref:'vision:large',text:JSON.stringify({subjectRef,assets:[{assetRef,sha256,mimeType:'image/png'}]})});
 const base=buildGeminiCommerceRequest(r);assert(Buffer.byteLength(JSON.stringify(base))>65536);
 r.mediaCapabilities=[hint()];assert.deepEqual(buildGeminiCommerceRequest(r),base);
});
