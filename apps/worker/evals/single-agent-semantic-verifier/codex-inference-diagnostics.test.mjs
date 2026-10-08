import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runCodexModel} from './codex-inference.mjs';
import {projectRuntime,buildRequest} from './protocol.mjs';
const read=f=>JSON.parse(readFileSync(new URL('./round-24/'+f,import.meta.url)));
const m=read('manifest.json'),request=buildRequest(m,'verifier',projectRuntime(m,read('corpus-a2.json').cases[1],'verifier','opaque-local-diagnostics'));
const client=auth=>async base=>{await fetch(base+'/responses',{method:'POST',headers:auth?{authorization:'synthetic-auth-not-retained'}:{},body:'{}'});};
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
