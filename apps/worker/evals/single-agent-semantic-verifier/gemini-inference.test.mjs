import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync} from 'node:crypto';
import {buildRequest,projectRuntime} from './protocol.mjs';
const m=JSON.parse(readFileSync(new URL('./round-8-gemini/manifest.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('./round-8-gemini/corpus-a3.json',import.meta.url))).cases.at(-1);
const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',
 private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
const body=()=>buildRequest(m,'conversation',projectRuntime(m,fixture,'conversation','opaque'));
const response=(patch={})=>({modelVersion:'gemini-3.5-flash-lite',responseId:'provider-response',candidates:[{content:{role:'model',parts:[{text:'Em cảm ơn chị.\n'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:3,thoughtsTokenCount:5,totalTokenCount:18},...patch});
async function create(deps){return (await import('./gemini-inference.mjs')).createGeminiInference(m,{credential,...deps});}
const auth=()=>Response.json({access_token:'TEST_SECRET_TOKEN',expires_in:3600});
test('actual captured Gemini request preserves exact final text and usage without evaluator/secret leakage',async()=>{
 const calls=[];const run=await create({fetchImpl:async(url,options)=>{calls.push({url,options});return url.includes('oauth2')?auth():Response.json(response());}});
 const r=await run(body());assert.equal(r.status,'OK');assert.equal(r.answer,'Em cảm ơn chị.\n');
 assert.equal(r.providerRequests,1);assert.equal(r.authRequests,1);assert.equal(r.usage.inputTokens,10);assert.equal(r.usage.outputTokens,8);assert.equal(r.usage.thinkingTokens,5);
 assert.deepEqual(JSON.parse(calls[1].options.body),r.requestBody);assert.equal(calls[1].url,m.models.conversation.generationConfig.endpoint);
 for(const label of ['caseId','split','expected','requiredBehaviors','forbiddenBehaviors','buyerGoal','rubric'])assert.ok(!calls[1].options.body.includes(label),label);
 for(const secret of ['TEST_SECRET_TOKEN',credential.client_email,credential.private_key])assert.ok(!JSON.stringify(r).includes(secret));
});
for(const status of [401,429,500])test('Gemini HTTP'+status+' terminates current slot with one generation, no retry',async()=>{
 let count=0;const run=await create({fetchImpl:async url=>url.includes('oauth2')?auth():(count++,new Response('provider error',{status}))});
 const r=await run(body());assert.equal(r.status,'PROVIDER_ERROR');assert.equal(r.httpStatus,status);assert.equal(r.providerRequests,1);assert.equal(count,1);
});
test('failed OAuth is retained without generation or hidden auth retry',async()=>{
 let count=0;const run=await create({fetchImpl:async()=>{count++;return new Response('TEST_SECRET_TOKEN',{status:401});}});
 const r=await run(body());assert.equal(r.status,'PROVIDER_ERROR');assert.equal(r.error,'VERTEX_AUTH_FAILED');assert.equal(r.providerRequests,0);assert.equal(r.authRequests,1);assert.equal(count,1);assert.ok(!JSON.stringify(r).includes('TEST_SECRET_TOKEN'));
});
test('401 permits token refresh only before later registered slot, never current-slot retry',async()=>{
 let oauth=0,generation=0;
 const run=await create({fetchImpl:async url=>{if(url.includes('oauth2')){oauth++;return auth();}generation++;return generation===1?new Response('',{status:401}):Response.json(response());}});
 const first=await run(body()),second=await run(body());assert.equal(first.status,'PROVIDER_ERROR');assert.equal(second.status,'OK');
 assert.equal(first.providerRequests,1);assert.equal(second.providerRequests,1);assert.equal(oauth,2);assert.equal(generation,2);
});
test('timeout and network error each terminate without generation retry',async()=>{
 for(const timeout of [false,true]){
  let count=0;const run=await create({timeoutMs:5,fetchImpl:async(url,{signal})=>{
   if(url.includes('oauth2'))return auth();count++;
   if(!timeout)throw new Error('TEST_SECRET_TOKEN');
   return await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  }});
  const r=await run(body());assert.equal(r.status,timeout?'TIMEOUT':'PROVIDER_ERROR');assert.equal(r.providerRequests,1);assert.equal(count,1);assert.ok(!JSON.stringify(r).includes('TEST_SECRET_TOKEN'));
 }
});
test('malformed/model/tool/truncation/oversize responses fail closed with one generation and no rewrite',async()=>{
 for(const value of [
  '{bad',response({modelVersion:'gemini-3.5-flash'}),response({modelVersion:null}),
  response({candidates:[{content:{parts:[{functionCall:{name:'send'}}]},finishReason:'STOP'}]}),
  response({candidates:[{content:{parts:[{text:'partial'}]},finishReason:'MAX_TOKENS'}]}),
  response({candidates:[{content:{parts:[{text:'x'.repeat(4097)}]},finishReason:'STOP'}]}),
  response({candidates:[]})
 ]){
  const run=await create({fetchImpl:async url=>url.includes('oauth2')?auth():(typeof value==='string'?new Response(value):Response.json(value))});
  const r=await run(body());assert.equal(r.status,'PROVIDER_ERROR');assert.equal(r.providerRequests,1);assert.equal(r.answer,undefined);
 }
});
test('response byte bound aborts at1MiB and cache reuses token for subsequent successful slot',async()=>{
 let authCount=0;
 const run=await create({fetchImpl:async url=>{if(url.includes('oauth2')){authCount++;return auth();}return new Response('x'.repeat(1048577));}});
 const r=await run(body());assert.equal(r.status,'PROVIDER_ERROR');assert.equal(r.error,'VERTEX_RESPONSE_BOUND');
 const cached=await create({fetchImpl:async url=>{if(url.includes('oauth2')){authCount++;return auth();}return Response.json(response());}});
 await cached(body());await cached(body());assert.equal(authCount,2);
});
