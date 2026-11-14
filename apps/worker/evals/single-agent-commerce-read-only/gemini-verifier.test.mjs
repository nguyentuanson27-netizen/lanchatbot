import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildVerifierRequest,createCommerceVerifier} from './protocol.mjs';
import {buildGeminiVerifierBody,createGeminiVerifierModel,GEMINI_VERIFIER_MODEL} from './gemini-verifier.mjs';
import {makeBinding,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';

const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));
const f=fixtureProduct(),tools=createReadOnlyTools({scope:commerceScope(),clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],
 catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
const trusted=tools.snapshot();
const request=(finalDraft='Dạ chị.')=>({generationId:'g:verifier:1',instructions:'Kiểm exact reply.',finalDraft,trusted,latest:'Chị hỏi chút.',history:[],
 binding:makeBinding('g',finalDraft,trusted),signal:new AbortController().signal});
const answer=(text,extra={})=>new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',usageMetadata:{promptTokenCount:120,candidatesTokenCount:9},
 candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text}]}}],...extra}));

test('the provider body carries exactly the registered instructions, message and verdict schema',()=>{
 const wire=buildVerifierRequest(manifest,request()),body=buildGeminiVerifierBody(wire);
 assert.equal(body.systemInstruction.parts[0].text,wire.instructions);
 assert.deepEqual(body.contents,[{role:'user',parts:[{text:wire.input[0].content[0].text}]}]);
 assert.deepEqual(body.generationConfig.responseJsonSchema,manifest.verdictSchema);
 assert.equal(body.generationConfig.responseMimeType,'application/json');assert(!Object.hasOwn(body,'tools'));
 assert.deepEqual(JSON.parse(body.contents[0].parts[0].text).untrusted.finalDraft,'Dạ chị.');
 for(const bad of [{...wire,tools:[{}]},{...wire,input:[...wire.input,wire.input[0]]},{...wire,instructions:''}])assert.throws(()=>buildGeminiVerifierBody(bad));
});
test('one request, no retry: a verdict reaches the unchanged final gate',async()=>{
 const calls=[],r=request();
 const run=createGeminiVerifierModel({projectId:'p'},{getToken:async()=>'t',fetchImpl:async(url,init)=>{calls.push({url,init});return answer('{"verdict":"PASS","violations":[]}');}});
 const out=await createCommerceVerifier(manifest,run)(r);
 assert.equal(calls.length,1);assert.match(calls[0].url,/gemini-3\.5-flash-lite:generateContent$/);
 assert.equal(out.telemetry.providerRequests,1);assert.equal(out.telemetry.model,GEMINI_VERIFIER_MODEL.model);assert.equal(out.telemetry.inputTokens,120);
 const terminal=finalGate({expected:r.binding,response:{kind:'VERDICT',binding:r.binding,result:out.result},current:trusted,finalDraft:r.finalDraft,now:commerceNow});
 assert.deepEqual(terminal,{disposition:'SEND_ELIGIBLE',reason:'PASS',text:r.finalDraft,fallbackId:null});
});
test('every non-verdict outcome fails closed without a second request',async()=>{
 const run=fetchImpl=>createCommerceVerifier(manifest,createGeminiVerifierModel({projectId:'p',timeoutMs:50},{getToken:async()=>'t',fetchImpl}));
 let calls=0;const count=f=>async(...a)=>{calls++;return f(...a);};
 for(const [fetchImpl,code] of [
  [async()=>new Response('{}',{status:429}),'GENERATION_HTTP'],
  [async()=>answer('{}',{modelVersion:'other-model'}),'VERIFIER_MODEL_VERSION'],
  [async()=>new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{'}]}}]})),'VERIFIER_FINISH_REASON'],
  [async()=>new Response('not json'),'PROVIDER_ERROR']]){
  calls=0;await assert.rejects(run(count(fetchImpl))(request()),e=>e.message==='PROVIDER_ERROR'&&e.telemetry.errorCode===code&&e.telemetry.providerRequests===1);
  assert.equal(calls,1);
 }
 const alive=setInterval(()=>{},10); // AbortSignal.timeout is unref'd; a real socket would keep the loop alive.
 try{await assert.rejects(run(async(_u,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(Object.assign(new Error('x'),{name:'TimeoutError'})))))(request()),/PROVIDER_TIMEOUT/);}
 finally{clearInterval(alive);}
 // A malformed verdict is transported as is and rejected by the final gate, never repaired here.
 const r=request(),out=await run(async()=>answer('{"verdict":"MAYBE","violations":[]}'))(r);
 assert.notEqual(finalGate({expected:r.binding,response:{kind:'VERDICT',binding:r.binding,result:out.result},current:trusted,finalDraft:r.finalDraft,now:commerceNow}).disposition,'SEND_ELIGIBLE');
});
test('a credential for another project is refused before any provider call',async()=>{
 let calls=0;const run=createGeminiVerifierModel({projectId:'p'},{credential:{type:'service_account',project_id:'other',client_email:'x',private_key:'y'},fetchImpl:async()=>{calls++;return answer('{}');}});
 const out=await run(manifest,'verifier',buildVerifierRequest(manifest,request()));
 assert.equal(out.status,'PROVIDER_ERROR');assert.equal(out.errorCode,'CREDENTIAL_SCOPE');assert.equal(calls,0);assert.equal(out.providerRequests,0);
});
