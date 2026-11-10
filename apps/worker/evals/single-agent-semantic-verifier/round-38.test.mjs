import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const raw=(folder,file)=>readFileSync(new URL('./'+folder+'/'+file,import.meta.url),'utf8');
const read=(folder,file)=>JSON.parse(raw(folder,file));
const m=read('round-38','manifest.json'),prior=read('round-37','manifest.json');
const a2=read('round-38','corpus-a2.json'),a3=read('round-38','corpus-a3.json');
const ownerData=body=>JSON.parse(body.contents[0].parts[0].text.split('\n').slice(1).join('\n'));
const codePrefix='CodeSizeInput: ';

test('fixed38 freezes identical populations, authority and bars; rejects rehashed changes',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'38'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 for(const file of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw('round-38',file),raw('round-37',file));
 for(const field of ['models','bounds','stateAllowlist','verdictSchema','terminal','fallbacks','usability','measurements'])assert.deepEqual(m[field],prior[field]);
 const heading='# Dữ kiện và phạm vi lời khẳng định';
 assert.equal(m.prompts.conversation.slice(m.prompts.conversation.indexOf(heading)),prior.prompts.conversation.slice(prior.prompts.conversation.indexOf(heading)));
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 for(const change of [v=>v.bounds.totalBytes++,v=>v.scoring.naturalnessRequired=1,v=>v.models.conversation.effort='medium',v=>{v.prompts.conversation+=' Changed';v.promptHashes.conversation=hash(v.prompts.conversation);},v=>v.adoptedA2RunSourceSha='a'.repeat(40)]){
  const changed=structuredClone(m);change(changed);assert.throws(()=>validateProtocol(changed,a2,a3),/ROUND38|MODEL_IDENTITY|CONSULTATION_BAR/);
 }
 const population=structuredClone(a3),changed=structuredClone(m);population.cases[0].runtime.latestCustomerMessage+=' Changed';changed.corpusHashes.a3=hash(JSON.stringify(population)+'\n');assert.throws(()=>validateProtocol(changed,a2,population),/ROUND38/);
});

test('all42 captured V4 requests retain sales facts and native turns, omit charts/labels, leave verifier and snapshot exact',async()=>{
 for(const original of a3.cases){
  const c=structuredClone(original),marker='ROUND38_EVALUATOR_ONLY';
  for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
  c.runtime.trusted.state.rubric=marker;
  const projection=projectRuntime(m,c,'conversation','opaque'),before=JSON.stringify(projection);
  assert.deepEqual(projection,projectRuntime(prior,c,'conversation','opaque'));
  const request=buildRequest(m,'conversation',projection),data=ownerData(request);
  assert.equal(JSON.stringify(projection),before);
  assert.deepEqual(data.requestIdentity,projection.requestIdentity);
  assert.deepEqual(data.trusted.boundSubjects,projection.trusted.boundSubjects);
  assert.deepEqual(data.trusted.protectedClaims,projection.trusted.protectedClaims.map(({type,scope,value})=>({type,scope,value})));
  assert.deepEqual(data.trusted.policyLiterals,projection.trusted.policyLiterals.map(({ref,text})=>({ref,text})));
  assert.deepEqual(data.trusted.effectReceipts,projection.trusted.effectReceipts);
  assert.deepEqual(data.untrusted.retrievedText,projection.untrusted.retrievedText);
  assert.deepEqual(Object.keys(data.trusted.state),['conversationOwner','currentProductId','consideredSize','salesStage'].filter(k=>Object.hasOwn(projection.trusted.state,k)));
  assert.deepEqual(data.trusted.productProfiles,projection.trusted.productProfiles.map(({ref,subjectRef,details})=>{
   const {sizeChart,...sales}=details,line=sizeChart.find(text=>text.startsWith(codePrefix));
   return{ref,subjectRef,details:{...sales,codeSizeInput:line?JSON.parse(line.slice(codePrefix.length)):null}};
  }));
  assert.deepEqual(request.contents.slice(1,-1),c.runtime.history.map(turn=>({role:turn.role==='customer'?'user':'model',parts:[{text:turn.text}]})));
  assert.equal(request.contents.at(-1).parts[0].text,c.runtime.latestCustomerMessage);
  const captured=[];
  const attempt=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,requestBody:body,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(item=>item.role),['conversation','verifier']);
  assert.ok(attempt.conversationRequestId);assert.equal(attempt.terminal.disposition,'FALLBACK');
  const verifierProjection=projectRuntime(m,{runtime:{...c.runtime,finalDraft:'Dạ chị.'}},'verifier','opaque');
  assert.deepEqual(buildRequest(m,'verifier',verifierProjection),buildRequest(prior,'verifier',verifierProjection));
  for(const{body}of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric'])assert.ok(!JSON.stringify(body).includes(label),label);
 }
 const receiptCase=a2.cases.find(c=>c.runtime.trusted.effectReceipts.length);
 assert.ok(receiptCase);
 const receiptProjection=projectRuntime(m,receiptCase,'conversation','opaque');
 assert.deepEqual(ownerData(buildRequest(m,'conversation',receiptProjection)).trusted.effectReceipts,receiptProjection.trusted.effectReceipts);
});

test('V4 presents only machine size decisions and missing inputs and enforces encoded bounds',()=>{
 for(const id of ['r12-pants-known-waist','r15-known-waist-next']){
  const c=a3.cases.find(c=>c.evaluator.caseId===id),projection=projectRuntime(m,c,'conversation','opaque');
  const data=ownerData(buildRequest(m,'conversation',projection));
  assert.ok(!data.trusted.protectedClaims.some(claim=>claim.type==='SIZE_FIT'));
  const summary=data.trusted.productProfiles.find(p=>p.subjectRef==='QU714').details.codeSizeInput;
  assert.equal(summary.status,'NEEDS_MEASUREMENTS');assert.deepEqual(summary.missingInputs,['HIPS_CM']);
 }
 const complete=a3.cases.find(c=>c.runtime.trusted.protectedClaims.some(claim=>claim.type==='SIZE_FIT'));
 assert.ok(ownerData(buildRequest(m,'conversation',projectRuntime(m,complete,'conversation','opaque'))).trusted.protectedClaims.some(claim=>claim.type==='SIZE_FIT'));
 const projection=projectRuntime(m,a3.cases[0],'conversation','opaque');
 const request=buildRequest(m,'conversation',projection),modified=structuredClone(m);
 modified.bounds.totalBytes=Buffer.byteLength(JSON.stringify(request))-1;
 assert.throws(()=>buildRequest(modified,'conversation',projection),/TOTAL_BOUND/);
});

test('fixed38 native adapter forwards one request on HTTP429 without generation retry',async()=>{
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'round38@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 const body=buildRequest(prior,'conversation',projectRuntime(prior,a3.cases[0],'conversation','opaque'));
 body.systemInstruction.parts[0].text=m.prompts.conversation;
 let calls=0,captured;
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'UNIT_SECRET',expires_in:3600});calls++;captured=JSON.parse(options.body);return new Response(null,{status:429});}});
 const result=await generate(body);
 assert.equal(calls,1);assert.deepEqual(captured,body);
 assert.equal(result.providerRequests,1);assert.equal(result.httpStatus,429);assert.equal(result.status,'PROVIDER_ERROR');
 assert.ok(!JSON.stringify(result).includes('UNIT_SECRET'));
});
