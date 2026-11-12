// The turn loop and the real Gemini adapter together: the adapter normalises its error message to
// PROVIDER_ERROR and reports the specific code in telemetry, which is what the loop has to read.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiCommerceInference} from './gemini-inference.mjs';
import {runCommerceTurn} from '../../dist/single-agent-commerce-read-only.js';
import {createReadOnlyTools} from '../../dist/single-agent-commerce-read-only-tools.js';
import {fixtureProduct,fixturePolicy,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';

const provider=candidate=>new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',usageMetadata:{promptTokenCount:10,candidatesTokenCount:5},candidates:[candidate]}));
const text=value=>({finishReason:'STOP',content:{role:'model',parts:[{text:value}]}});
async function turn(responses){
 const f=fixtureProduct(),scope=commerceScope(),calls=[];
 const tools=createReadOnlyTools({scope,clock:()=>commerceNow,policy:()=>fixturePolicy(),initialProducts:[f.product],
  catalog:{readProduct:async()=>f,searchText:async()=>({status:'NOT_FOUND',reasonCode:'NO_CANDIDATES'})}});
 const infer=createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'unit'},
  {getToken:async()=>'unit',fetchImpl:async(_url,init)=>{calls.push(JSON.parse(init.body));const next=responses.shift();return typeof next==='function'?next():provider(next);}});
 const result=await runCommerceTurn({scope,tools,clock:()=>commerceNow,latest:'Mẫu này bao nhiêu em?',history:[],ownerPrompt:'Tư vấn theo nguồn.',verifierPrompt:'Kiểm exact reply.',
  owner:request=>infer(request),verifier:async()=>({result:{verdict:'PASS',violations:[]}})});
 return {result,calls};
}
for(const [name,bad] of [['an abnormal finish',{finishReason:'MALFORMED_RESPONSE',content:{role:'model',parts:[]}}],['a malformed function call',{finishReason:'MALFORMED_FUNCTION_CALL'}],
 ['no parts',{finishReason:'STOP',content:{role:'model',parts:[]}}],['an empty text',text('  ')]])
 test(`${name} from the provider is asked for once more and the turn is sent`,async()=>{
  const {result,calls}=await turn([bad,text('Áo giá 499k chị nhé.')]);
  assert.equal(calls.length,2);assert.deepEqual(calls[1],calls[0]);
  assert.deepEqual([result.terminal.disposition,result.terminal.reason],['SEND_ELIGIBLE','PASS']);
  assert.deepEqual(result.generations.map(g=>g.role+':'+g.status),['owner:PROVIDER_ERROR','owner:OK','verifier:OK']);
  assert.equal(result.generations[0].telemetry.providerRequests,1);
 });
test('a second unusable answer ends the turn without a third request',async()=>{
 const bad={finishReason:'MALFORMED_RESPONSE',content:{role:'model',parts:[]}};
 const {result,calls}=await turn([bad,bad,text('không được dùng')]);
 assert.equal(calls.length,2);assert.notEqual(result.terminal.disposition,'SEND_ELIGIBLE');
});
test('an HTTP error or a parsed answer of the wrong shape is not retried',async()=>{
 const http=await turn([()=>new Response('{}',{status:429}),text('không được dùng')]);
 assert.equal(http.calls.length,1);assert.notEqual(http.result.terminal.disposition,'SEND_ELIGIBLE');
 const surface=await turn([{finishReason:'STOP',content:{role:'model',parts:[{inlineData:{mimeType:'image/png',data:'AA=='}}]}},text('không được dùng')]);
 assert.equal(surface.calls.length,1);assert.notEqual(surface.result.terminal.disposition,'SEND_ELIGIBLE');
});
