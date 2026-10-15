import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runCodexModel} from './codex-inference.mjs';
import {projectRuntime,buildRequest} from './protocol.mjs';
const m=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));
const a=JSON.parse(readFileSync(new URL('./corpus-a2.json',import.meta.url)));
const request=buildRequest(m,'verifier',projectRuntime(m,a.cases[1],'verifier','opaque'));
const response=(model='gpt-6.1-sol')=>new Response('data: '+JSON.stringify({type:'response.completed',response:{id:'synthetic-response',model,
  output:[{type:'message',content:[{type:'output_text',text:'{"verdict":"PASS","violations":[]}'}]}],usage:{input_tokens:12,output_tokens:8}}})+'\n\n',
  {status:200,headers:{'content-type':'text/event-stream'}});
const client=(count=1,auth=true)=>async base=>{
  for(let i=0;i<count;i++)await fetch(base+'/responses',{method:'POST',headers:auth?{authorization:'synthetic-auth-not-for-evidence'}:{},
    body:JSON.stringify({tools:[{name:'shell'}],input:'EVALUATOR_SENTINEL',model:'wrong-model'})});
};

test('read-only commerce owner receives native calls once; verifier retains its no-tool contract',async()=>{
  const owner={readOnlyCommerce:true,models:{conversation:{...m.models.verifier,effort:'low',
    generationConfig:{...m.models.verifier.generationConfig,reasoningEffort:'low'}}}};
  const wire={...request,reasoning:{effort:'low'},tool_choice:'auto',
    tools:['search_products','read_product','read_policy'].map(name=>({type:'function',name,parameters:{type:'object',properties:{}}})),
    include:['reasoning.encrypted_content']};
  const output=[{type:'reasoning',id:'rs_test',summary:[],encrypted_content:'opaque-native-continuation'},
    {type:'function_call',id:'fc_test',call_id:'call_test',name:'search_products',arguments:'{"query":"áo có lót"}'}];
  let calls=0;
  const result=await runCodexModel(owner,'conversation',wire,{runClient:client(2),upstreamFetch:async()=>{
    calls++;return new Response('data: '+JSON.stringify({type:'response.completed',response:{model:'gpt-6.1-sol',output}})+'\n\n');}});
  assert.equal(result.status,'OK');assert.deepEqual(result.outputItems,output);
  assert.equal(calls,1);assert.equal(result.providerRequests,1);assert.equal(result.rejectedClientRequests,1);
  assert.equal(result.answer,null);
  await assert.rejects(runCodexModel({...m,readOnlyCommerce:true},'verifier',{...wire,reasoning:{effort:'high'}}),/FROZEN_REQUEST/);
  const forbidden={...wire,tools:[{type:'function',name:'add_to_cart'}]};
  await assert.rejects(runCodexModel(owner,'conversation',forbidden),/FROZEN_REQUEST/);
});

test('read-only commerce rejects unadvertised tool output and tools after the budget is exhausted',async()=>{
  const owner={readOnlyCommerce:true,models:{conversation:{...m.models.verifier,effort:'low',
    generationConfig:{...m.models.verifier.generationConfig,reasoningEffort:'low'}}}};
  const wire={...request,reasoning:{effort:'low'},include:['reasoning.encrypted_content']};
  for(const name of ['read_product','add_to_cart','shell']){
    const result=await runCodexModel(owner,'conversation',wire,{runClient:client(),upstreamFetch:async()=>
      new Response('data: '+JSON.stringify({type:'response.completed',response:{model:'gpt-6.1-sol',output:[
        {type:'function_call',call_id:'call_test',name,arguments:'{}'}]}})+'\n\n')});
    assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerRequests,1);
  }
});
test('actual forwarded body equals frozen runtime request and excludes CLI tools/context/evaluator labels',async()=>{
  let captured;
  const result=await runCodexModel(m,'verifier',request,{runClient:client(),upstreamFetch:async(url,init)=>{
    captured=JSON.parse(init.body);return response();}});
  assert.deepEqual(captured,request);
  assert.equal(result.status,'OK');assert.equal(result.providerRequests,1);
  assert.ok(!JSON.stringify(result).includes('synthetic-auth'));
  assert.ok(!JSON.stringify(result).includes('EVALUATOR_SENTINEL'));
  assert.equal(result.usage.input_tokens,12);
});
test('CLI retry/continuation never forwards a second upstream generation',async()=>{
  let calls=0;
  const result=await runCodexModel(m,'verifier',request,{runClient:client(3),upstreamFetch:async()=>{calls++;return response();}});
  assert.equal(calls,1);assert.equal(result.providerRequests,1);
  assert.equal(result.clientRequests,3);assert.equal(result.rejectedClientRequests,2);
});
for(const status of [401,429,500,503])test('upstream '+status+' is retained without generation retry',async()=>{
  let calls=0;
  const result=await runCodexModel(m,'verifier',request,{runClient:client(2),upstreamFetch:async()=>{calls++;return new Response('sensitive-error-do-not-retain',{status});}});
  assert.equal(calls,1);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.httpStatus,status);
  assert.ok(!JSON.stringify(result).includes('sensitive-error'));
});
test('missing login acquisition fails closed with zero upstream generations',async()=>{
  const result=await runCodexModel(m,'verifier',request,{runClient:client(1,false),upstreamFetch:async()=>{throw new Error('must not run');}});
  assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerRequests,0);
});
test('wrong returned model and malformed response fail closed',async()=>{
  for(const upstreamFetch of [async()=>response('other-model'),async()=>new Response('garbage',{status:200})]){
    const result=await runCodexModel(m,'verifier',request,{runClient:client(),upstreamFetch});
    assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerRequests,1);
  }
});
test('Codex streaming final item owns the reply; completed event may contain metadata only',async()=>{
  const wire=[{type:'response.output_item.done',item:{type:'message',role:'assistant',phase:'final_answer',
    content:[{type:'output_text',text:'{"verdict":"FAIL","violations":[]}'}]}},
    {type:'response.completed',response:{id:'stream-response',usage:{input_tokens:10,output_tokens:9}}}]
    .map(event=>'data: '+JSON.stringify(event)+'\n\n').join('');
  const result=await runCodexModel(m,'verifier',request,{runClient:client(),upstreamFetch:async()=>new Response(wire,{status:200})});
  assert.equal(result.status,'OK');assert.equal(result.answer,'{"verdict":"FAIL","violations":[]}');
  assert.equal(result.usage.output_tokens,9);assert.equal(result.responseId,'stream-response');
});
test('timeout after one request is retained; no retry',async()=>{
  // The deadline includes local relay startup; allow it to reach the upstream
  // before testing a stalled response, rather than assuming startup takes <25ms.
  let calls=0;
  const result=await runCodexModel(m,'verifier',request,{timeoutMs:1000,runClient:client(),upstreamFetch:async(_url,init)=>{
    calls++;return new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('aborted'))));
  }});
  assert.equal(result.status,'TIMEOUT');assert.equal(result.providerRequests,1);
  assert.equal(calls,1);
});
test('installed Codex login reaches relay; upstream is a local stub, no provider generation',
  {skip:process.env.C3_TEST_CODEX_TRANSPORT!=='1'},async()=>{
    let captured;
    const result=await runCodexModel(m,'verifier',request,{upstreamFetch:async(_url,init)=>{
      captured=JSON.parse(init.body);return new Response('stubbed upstream failure',{status:503});
    }});
    assert.deepEqual(captured,request);assert.equal(result.providerRequests,1);
    assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.httpStatus,503);
  });
