import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {assertWire,byteHash,CASES,normalizeOutput,registerSlots} from './bc-control.mjs';
import {createCapturedOwnerSender} from './bc-owner-replay.mjs';
const body=()=>({systemInstruction:{parts:[{text:'Tư vấn bán hàng dựa trên dữ liệu được cấp.'}]},contents:[{role:'user',parts:[{text:'Áo này bao nhiêu em?'}]}],tools:[],
 toolConfig:{functionCallingConfig:{mode:'NONE'}},generationConfig:{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}});
const model={model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',generationConfig:{retry:0}};
const credential={type:'service_account',project_id:'control-project',client_email:'test@control-project.iam.gserviceaccount.com',private_key:generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'})};
const answer=()=>({modelVersion:model.model,candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Áo 499.000đ chị nhé.'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:8,thoughtsTokenCount:3}});
test('every immutable body gets three separately registered slots; population changes reject',()=>{
 const cases=CASES.map(caseId=>({caseId,bodyHash:byteHash(JSON.stringify(body()))})),slots=registerSlots(cases);
 assert.equal(slots.length,18);assert.equal(new Set(slots.map(s=>s.slotId)).size,18);assert.deepEqual(slots.slice(0,6).map(s=>s.caseId),CASES);
 assert.throws(()=>registerSlots(cases.slice(1)),/CONTROL_CASE_DENOMINATOR/);
});
test('recursive evaluator data and changed generation settings cannot enter captured owner requests',()=>{
 assert.doesNotThrow(()=>assertWire(body()));const v=body();v.contents[0].parts[0].text=JSON.stringify({nested:{wholeTurnPass:true}});
 assert.throws(()=>assertWire(v),/CONTROL_EVALUATOR_LABEL/);const changed=body();changed.generationConfig.temperature=0;assert.throws(()=>assertWire(changed),/CONTROL_GENERATION_CONFIG/);
});
test('opaque call IDs/signatures vary without creating a different decision; selectors and order remain significant',()=>{
 const a={kind:'TOOLS',calls:[{name:'read_product',args:{subjectRef:'A101'},id:'one'}],content:{parts:[{thoughtSignature:'opaque-one'}]}};
 const b=structuredClone(a);b.calls[0].id='two';b.content.parts[0].thoughtSignature='opaque-two';assert.deepEqual(normalizeOutput(a),normalizeOutput(b));
 b.calls[0].args.subjectRef='B202';assert.notDeepEqual(normalizeOutput(a),normalizeOutput(b));
});
test('actual forwarded body is byte-identical and parser telemetry counts a single upstream request',async()=>{
 const wire=body(),captured=[];const send=createCapturedOwnerSender({projectId:'control-project',model},{credential,fetchImpl:async(url,init)=>{
  if(url.includes('oauth2'))return Response.json({access_token:'local-stub',expires_in:3600});captured.push(init.body);return Response.json(answer());}});
 const r=await send(wire,byteHash(JSON.stringify(wire)));assert.equal(r.status,'OK');assert.deepEqual(captured,[JSON.stringify(wire)]);assert.equal(r.telemetry.providerRequests,1);assert.equal(r.telemetry.outputTokens,11);
 await assert.rejects(()=>send(wire,'0'.repeat(64)),/CONTROL_OWNER_BODY_CHANGED/);assert.equal(captured.length,1);
});
test('401 fails the registered attempt without retry and refreshes only before the next sample',async()=>{
 let auth=0,generation=0;const send=createCapturedOwnerSender({projectId:'control-project',model},{credential,fetchImpl:async url=>{
  if(url.includes('oauth2')){auth++;return Response.json({access_token:'local-stub'});}generation++;return generation===1?new Response('',{status:401}):Response.json(answer());}});
 const v=body(),hash=byteHash(JSON.stringify(v)),a=await send(v,hash);assert.equal(a.status,'PROVIDER_ERROR');assert.equal(generation,1);assert.equal(a.telemetry.providerRequests,1);
 const b=await send(v,hash);assert.equal(b.status,'OK');assert.equal(auth,2);assert.equal(generation,2);
});
test('5xx, model mismatch and oversized response remain failed samples with one generation each',async()=>{
 for(const fault of ['500','model','bound']){let requests=0;const send=createCapturedOwnerSender({projectId:'control-project',model},{credential,fetchImpl:async url=>{
  if(url.includes('oauth2'))return Response.json({access_token:'local-stub'});requests++;
  return fault==='500'?new Response('',{status:500}):fault==='bound'?new Response('x'.repeat(1048577)):Response.json({...answer(),modelVersion:'other-model'});}});
  const v=body(),r=await send(v,byteHash(JSON.stringify(v)));assert.notEqual(r.status,'OK');assert.equal(requests,1);assert.equal(r.telemetry.providerRequests,1);
 }
});
