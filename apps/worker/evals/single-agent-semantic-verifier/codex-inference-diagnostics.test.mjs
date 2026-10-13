import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runCodexModel} from './codex-inference.mjs';
import {projectRuntime,buildRequest} from './protocol.mjs';
import {providerCapacityExhausted} from './run-a2.mjs';
const read=f=>JSON.parse(readFileSync(new URL('./round-24/'+f,import.meta.url)));
const m=read('manifest.json'),request=buildRequest(m,'verifier',projectRuntime(m,read('corpus-a2.json').cases[1],'verifier','opaque-local-diagnostics'));
const client=auth=>async base=>{const response=await fetch(base+'/responses',{method:'POST',headers:{connection:'close',...(auth?{authorization:'synthetic-auth-not-retained'}:{})},body:'{}'});await response.arrayBuffer();};
test('auth header absence is distinguished from upstream auth failure and costs zero generations',async()=>{
 let calls=0;const result=await runCodexModel(m,'verifier',request,{runClient:client(false),upstreamFetch:async()=>{calls++;throw Error('must not call');}});
 assert.equal(result.errorStage,'AUTH_HEADER');assert.equal(result.error,'AUTH_UNAVAILABLE');assert.equal(calls,0);assert.equal(result.providerRequests,0);
 assert.equal(result.upstreamRequestId,null);assert.equal(result.retryAfterSeconds,null);
});
test('HTTP429 retains only bounded request-id and retry-after metadata and never retries',async()=>{
 let calls=0;const result=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>{calls++;return new Response('secret error message must never be stored',{status:429,headers:{'x-request-id':'req_1234567890abcdef','retry-after':'30'}});}});
 assert.equal(result.errorStage,'GENERATION_HTTP');assert.equal(result.httpStatus,429);assert.equal(result.upstreamRequestId,'req_1234567890abcdef');assert.equal(result.retryAfterSeconds,30);
 assert.equal(calls,1);assert.equal(result.providerRequests,1);
 assert.ok(!JSON.stringify(result).includes('synthetic-auth'));assert.ok(!JSON.stringify(result).includes('secret error message'));
});
test('unrecognized metadata cannot expose arbitrary provider text or credentials',async()=>{
 const result=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>new Response('sensitive raw error',{status:401,headers:{'x-request-id':'Bearer private-token','retry-after':'private-token'}})});
 assert.equal(result.errorStage,'GENERATION_HTTP');assert.equal(result.upstreamRequestId,null);assert.equal(result.retryAfterSeconds,null);
 assert.ok(!JSON.stringify(result).includes('private-token'));assert.ok(!JSON.stringify(result).includes('sensitive raw error'));
});

test('recognized HTTP error codes survive as bounded diagnostics without a retry or raw text',async()=>{
 for(const code of ['rate_limit_exceeded','usage_limit_reached','insufficient_quota','too_many_requests']){
  let calls=0;const result=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>{calls++;return Response.json({error:{code,message:'PRIVATE_ERROR_MESSAGE'}},{status:429});}});
  assert.equal(result.providerErrorCode,code);assert.equal(result.httpStatus,429);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerRequests,1);assert.equal(calls,1);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_ERROR_MESSAGE'));assert.ok(!JSON.stringify(result).includes('synthetic-auth'));
 }
});
test('unknown or malformed error bodies cannot become diagnostics or alter fail-closed HTTP outcomes',async()=>{
 for(const body of ['PRIVATE_NON_JSON',JSON.stringify({error:{code:'PRIVATE_UNKNOWN_CODE',message:'PRIVATE_ERROR_MESSAGE'}}),JSON.stringify({error:{code:{secret:'PRIVATE_OBJECT'}}}),JSON.stringify({code:'rate_limit_exceeded'}),'null']){
  const result=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>new Response(body,{status:429})});
  assert.equal(result.providerErrorCode,null);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.httpStatus,429);assert.equal(result.providerRequests,1);assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
 }
});
test('oversized streamed HTTP diagnostics are canceled without retaining even a recognized prefix',async()=>{
 let canceled=false,calls=0;const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify({error:{code:'rate_limit_exceeded',message:'PRIVATE_OVERSIZED'.repeat(500)}})));},cancel(){canceled=true;}});
 const result=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>{calls++;return new Response(body,{status:429});}});
 assert.equal(result.providerErrorCode,null);assert.equal(canceled,true);assert.equal(result.httpStatus,429);assert.equal(result.providerRequests,1);assert.equal(calls,1);assert.ok(!JSON.stringify(result).includes('PRIVATE_OVERSIZED'));
});
test('recognized error type fallback is retained but an interrupted error stream stays unclassified',async()=>{
 const typed=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>Response.json({error:{type:'usage_limit_reached',message:'PRIVATE_MESSAGE'}},{status:429})});assert.equal(typed.providerErrorCode,'usage_limit_reached');
 const interrupted=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>new Response(new ReadableStream({start(c){c.error(Error('PRIVATE_STREAM_ERROR'));}}),{status:500})});
 assert.equal(interrupted.providerErrorCode,null);assert.equal(interrupted.httpStatus,500);assert.equal(interrupted.error,'UPSTREAM_HTTP');assert.equal(interrupted.providerRequests,1);assert.ok(!JSON.stringify(interrupted).includes('PRIVATE_STREAM_ERROR'));
});

const streamResult=async events=>{
 let calls=0;
 const result=await runCodexModel(m,'verifier',request,{runClient:client(true),upstreamFetch:async()=>{calls++;return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{status:200,headers:{'content-type':'text/event-stream'}});}});
 assert.equal(calls,1);assert.equal(result.providerRequests,1);assert.equal(result.httpStatus,200);
 assert.ok(!JSON.stringify(result).includes('PRIVATE_'));assert.ok(!JSON.stringify(result).includes('synthetic-auth'));
 return result;
};
const completed={type:'response.completed',response:{status:'completed',model:m.models.verifier.model,output:[{type:'message',content:[{type:'output_text',text:'{"verdict":"PASS","violations":[]}'}]}]}};

test('HTTP200 response.failed retains a bounded cause and never authorizes partial or later complete output',async()=>{
 const failed={type:'response.failed',response:{status:'failed',error:{code:'server_error',message:'PRIVATE_FAILURE_MESSAGE'},output:[{type:'message',content:[{type:'output_text',text:'PRIVATE_PARTIAL_OUTPUT'}]}]}};
 const result=await streamResult([{type:'response.output_item.done',item:completed.response.output[0]},failed,completed]);
 assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.error,'PROVIDER_STREAM_FAILED');assert.equal(result.errorStage,'GENERATION_STREAM');
 assert.equal(result.providerTerminalEvent,'response.failed');assert.equal(result.providerErrorCode,'server_error');assert.equal(result.providerIncompleteReason,null);assert.equal(result.answer,undefined);
 assert.equal(providerCapacityExhausted(m,result),false);
});

test('HTTP200 response.incomplete retains only the known reason and cannot turn a partial PASS into success',async()=>{
 for(const reason of ['max_output_tokens','content_filter']){
  const result=await streamResult([{type:'response.incomplete',response:{status:'incomplete',incomplete_details:{reason},error:null,output:completed.response.output}}]);
  assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.error,'PROVIDER_STREAM_INCOMPLETE');assert.equal(result.errorStage,'GENERATION_STREAM');
  assert.equal(result.providerTerminalEvent,'response.incomplete');assert.equal(result.providerIncompleteReason,reason);assert.equal(result.providerErrorCode,null);assert.equal(result.answer,undefined);
 }
});

test('HTTP200 error and failed events preserve known capacity codes for the existing stop policy without retrying',async()=>{
 const config={...m,providerCapacityPolicy:{stopHttpStatuses:[401,429],stopCodes:['rate_limit_exceeded','usage_limit_reached','insufficient_quota','too_many_requests']}};
 for(const code of config.providerCapacityPolicy.stopCodes){
  for(const event of [{type:'error',code,message:'PRIVATE_CAPACITY_MESSAGE'},{type:'response.failed',response:{error:{code,message:'PRIVATE_CAPACITY_MESSAGE'}}}]){
   const result=await streamResult([event]);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerErrorCode,code);assert.equal(result.providerTerminalEvent,event.type);
   assert.equal(providerCapacityExhausted(config,result),true);
  }
 }
});

test('stream failure diagnostics discard unknown values, messages and response bodies while remaining fail closed',async()=>{
 for(const event of [{type:'error',code:'PRIVATE_UNKNOWN_CODE',message:'PRIVATE_MESSAGE',param:'PRIVATE_PARAM'},
  {type:'response.failed',response:{error:{code:{secret:'PRIVATE_OBJECT'},message:'PRIVATE_MESSAGE'},id:'PRIVATE_ID',model:'PRIVATE_MODEL'}},
  {type:'response.incomplete',response:{incomplete_details:{reason:'PRIVATE_UNKNOWN_REASON'},error:{code:'PRIVATE_ERROR'},output:completed.response.output}}]){
  const result=await streamResult([event]);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.providerErrorCode,null);assert.equal(result.providerIncompleteReason,null);assert.equal(result.answer,undefined);
 }
});

test('valid completed SSE still returns the exact answer; completed event with failed status fails closed',async()=>{
 const valid=await streamResult([completed]);assert.equal(valid.status,'OK');assert.equal(valid.answer,'{"verdict":"PASS","violations":[]}');
 const invalid=await streamResult([{...completed,response:{...completed.response,status:'failed'}}]);assert.equal(invalid.status,'PROVIDER_ERROR');assert.equal(invalid.answer,undefined);
});
