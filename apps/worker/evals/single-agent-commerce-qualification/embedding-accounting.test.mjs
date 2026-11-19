// Actual native Vertex embedding client against local stubs; no external request or campaign result.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {VertexShadowModel} from '../../dist/vertex.js';
import {embeddingHttpAccounting,EMBEDDING_POLICY} from './embedding-accounting.mjs';
import {MEASUREMENT_POLICY} from './qualification.mjs';
const privateKey=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'pem',type:'pkcs8'});
test('concurrent auxiliary calls keep their immutable invocation identity across awaits',async()=>{
 let current=0;const http=embeddingHttpAccounting({context:()=>({invocation:current}),observe:()=>{},fetchImpl:async()=>Response.json({})}),
  url='https://us-central1-aiplatform.googleapis.com/v1/projects/unit/models/unit:predict';
 await Promise.all([1,2].map(invocation=>http.run({invocation},async()=>{
  current=invocation;await new Promise(resolve=>setTimeout(resolve,invocation===1?10:1));
  await http.fetchImpl(url,{method:'POST',body:JSON.stringify({instances:[{text:String(invocation)}]})});
 })));
 assert.deepEqual(http.observed().map(r=>r.invocation),[2,1]);
});
test('native embedding first 401 refresh counts two predict and two OAuth HTTP, separately from generations',async()=>{
 let predicts=0;const events=[],http=embeddingHttpAccounting({context:()=>({slotId:'unit',turnIndex:0,invocation:1}),
  observe:(phase,row)=>events.push({phase,...structuredClone(row)}),fetchImpl:async(url)=>{
   if(url.includes('oauth2'))return Response.json({access_token:'PRIVATE_UNIT_ACCESS_TOKEN',expires_in:3600});
   return ++predicts===1?Response.json({error:'unit unauthorized'},{status:401}):Response.json({predictions:[{textEmbedding:Array(128).fill(1)}]});
  }}),client=new VertexShadowModel({projectId:'unit',location:'global',modelName:'unused',embeddingDimension:128,
   serviceAccount:{email:'unit@example.invalid',privateKey},fetchImpl:http.fetchImpl});
 assert.deepEqual(await client.embedText('Áo đi làm'),Array(128).fill(1));
 assert.deepEqual(http.observed().map(r=>[r.kind,r.status]),[['OAUTH',200],['EMBEDDING',401],['OAUTH',200],['EMBEDDING',200]]);
 assert(!JSON.stringify(events).includes('PRIVATE_UNIT_ACCESS_TOKEN'));assert(!JSON.stringify(events).includes('assertion'));
 assert.equal(http.observed().filter(r=>r.kind==='OAUTH'&&r.requestHash!==null).length,0);
 assert.deepEqual(EMBEDDING_POLICY,MEASUREMENT_POLICY.embedding);
 await client.embedText('Áo khác');assert.equal(http.observed().length,5); // Native cached token, no new OAuth.
});
test('native embedding 429/5xx and OAuth failures are retained without retry; transport failure has null status',async()=>{
 for(const status of [401,429,500]){
  const http=embeddingHttpAccounting({context:()=>({invocation:1}),observe:()=>{},fetchImpl:async url=>
   url.includes('oauth2')?Response.json({access_token:'unit',expires_in:3600}):Response.json({}, {status})}),
   client=new VertexShadowModel({projectId:'unit',location:'global',modelName:'unused',embeddingDimension:128,
    serviceAccount:{email:'unit@example.invalid',privateKey},fetchImpl:http.fetchImpl});
  await assert.rejects(client.embedText('Áo'));
  assert.equal(http.observed().filter(r=>r.kind==='EMBEDDING').length,status===401?2:1);
 }
 const http=embeddingHttpAccounting({context:()=>({}),observe:()=>{},fetchImpl:async()=>{throw Error('private transport message');}});
 await assert.rejects(http.fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',body:'PRIVATE_ASSERTION'}));
 assert.equal(http.observed()[0].status,null);assert.equal(http.observed()[0].error,'NETWORK_ERROR');
 assert(!JSON.stringify(http.observed()).includes('PRIVATE_ASSERTION'));
 const failed=embeddingHttpAccounting({context:()=>({}),observe:()=>{},fetchImpl:async()=>Response.json({}, {status:500})}),
  client=new VertexShadowModel({projectId:'unit',location:'global',modelName:'unused',embeddingDimension:128,
   serviceAccount:{email:'unit@example.invalid',privateKey},fetchImpl:failed.fetchImpl});
 await assert.rejects(client.embedText('Áo'));
 assert.deepEqual(failed.observed().map(r=>[r.kind,r.status]),[['OAUTH',500]]);
});
