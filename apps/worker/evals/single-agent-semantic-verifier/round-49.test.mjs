import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {registerA2Attempts} from './run-a2.mjs';
const raw=(round,file)=>readFileSync(new URL('./round-'+round+'/'+file,import.meta.url),'utf8');
const read=(round,file)=>JSON.parse(raw(round,file));
const m=read(49,'manifest.json'),a2=read(49,'corpus-a2.json'),a3=read(49,'corpus-a3.json');
const display=request=>JSON.parse(request.contents[0].parts[0].text.split('\n')[1]);

test('round49 admits only its sealed inputs and keeps authority/configuration controls',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'49'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:99,a2Safe:64,a3:42});
 const prior=read(48,'manifest.json');
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerProfilePresentation','conversationContextFormat','attemptRepetitions','providerCapacityPolicy'])assert.deepEqual(m[key],prior[key]);
 for(const key of ['dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds','anchors','interpretation'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-round49.vi.txt',import.meta.url),'utf8'));
 assert.ok(m.prompts.conversation.length<prior.prompts.conversation.length);
 const changed=structuredClone(m);changed.ownerPolicyPresentation[0].display.exchange.indoorTrial.conditions.pop();
 assert.throws(()=>validateProtocol(changed,a2,a3));
});

test('owner policy display keeps independent conditions while canonical/verifier text and binding stay exact',()=>{
 for(const fixture of a3.cases){
  const projection=projectRuntime({...m,round:48},fixture,'conversation','opaque-policy-request'),original=structuredClone(projection);
  const shown=display(buildRequest(m,'conversation',projection));
  const policy=shown.trusted.policyLiterals.find(p=>p.ref==='exchange:r5');
  assert.deepEqual(policy,{ref:'exchange:r5',...m.ownerPolicyPresentation[0].display});
  assert.deepEqual(policy.exchange.window,{days:7,startsAt:'ngày nhận hàng'});
  assert.deepEqual(policy.exchange.generalGoods,['chưa sử dụng','nguyên tem']);
  assert.deepEqual(policy.exchange.indoorTrial.conditions,['chỉ thử trong nhà','chưa giặt','sạch','không mùi','giữ tem']);
  assert.equal(policy.exchange.outdoorWorn,'không nhận đổi');assert.equal(policy.exchange.shippingPayer,'khách');assert.equal(policy.refund,'không áp dụng');
  assert.deepEqual(projection,original);assert.equal(projection.requestIdentity.trustedSnapshotId,hash(JSON.stringify(projection.trusted)));
  for(const p of projection.trusted.policyLiterals.filter(p=>p.ref!=='exchange:r5'))assert.deepEqual(shown.trusted.policyLiterals.find(v=>v.ref===p.ref),{ref:p.ref,text:p.text});
  const verifierFixture={runtime:{...fixture.runtime,finalDraft:'Dạ, chị nhé.'}};
  assert.deepEqual(buildRequest(m,'verifier',projectRuntime(m,verifierFixture,'verifier','same-identity')),buildRequest(read(48,'manifest.json'),'verifier',projectRuntime(read(48,'manifest.json'),verifierFixture,'verifier','same-identity')));
 }
 for(const field of ['ref','text','sourceVersion']){
  const fixture=structuredClone(a3.cases[0]),policy=fixture.runtime.trusted.policyLiterals.find(p=>p.ref==='exchange:r5');policy[field]+=' changed';
  const shown=display(buildRequest(m,'conversation',projectRuntime(m,fixture,'conversation','opaque')));
  assert.deepEqual(shown.trusted.policyLiterals.find(p=>p.ref===policy.ref),{ref:policy.ref,text:policy.text});
 }
});

test('all A2 slots and A3 facts/evaluators survive prospective dialogue edits with an exact audit',()=>{
 assert.equal(raw(49,'corpus-a2.json'),raw(48,'corpus-a2.json'));
 assert.equal(registerA2Attempts(m,a2).length,253);
 const prior=read(48,'corpus-a3.json'),audit=read(49,'dialogue-edits.json'),matched=[];
 for(let i=0;i<a3.cases.length;i++){
  const current=a3.cases[i],old=prior.cases[i];assert.deepEqual(current.evaluator,old.evaluator);
  assert.deepEqual({...current.runtime,history:null,latestCustomerMessage:null},{...old.runtime,history:null,latestCustomerMessage:null});
  assert.deepEqual(current.runtime.history.map(v=>v.role),old.runtime.history.map(v=>v.role));
  for(const [field,before,after]of [...old.runtime.history.map((v,j)=>['history['+j+'].text',v.text,current.runtime.history[j].text]),['latestCustomerMessage',old.runtime.latestCustomerMessage,current.runtime.latestCustomerMessage]])if(before!==after){
   const edit=audit.edits.find(v=>v.caseId===current.evaluator.caseId&&v.field===field);assert.ok(edit);assert.equal(edit.before,before);assert.equal(edit.after,after);matched.push(edit);
  }
 }
 assert.equal(matched.length,audit.edits.length);assert.equal(matched.length,32);
 for(const file of ['fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(49,file),raw(48,file));
});

test('actual stub-captured owner and mandatory verifier requests exclude evaluator-only labels',async()=>{
 for(const original of a3.cases){
  const fixture=structuredClone(original),marker='R49_EVALUATOR_PRIVATE_LABEL';
  for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;
  fixture.dialogueEditReview=marker;fixture.labelReview=marker;
  const roles=[];
  const outcome=await evaluateA3Attempt(m,fixture,async(role,request)=>{
   roles.push(role);const serialized=JSON.stringify(request);assert.ok(!serialized.includes(marker));assert.ok(!serialized.includes(original.evaluator.caseId));
   const projection=role==='verifier'?JSON.parse(request.input[0].content[0].text):display(request);
   assert.equal(projection.requestIdentity.trustedSnapshotId,hash(JSON.stringify(projectRuntime(m,fixture,'conversation',projection.requestIdentity.requestId).trusted)));
   return {status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',providerRequests:1};
  });
  assert.deepEqual(roles,['conversation','verifier']);assert.equal(outcome.terminal.disposition,'SEND_ELIGIBLE');
 }
});

test('round49 native conversation adapter forwards the exact frozen request once without retry',async()=>{
 const fixture=a3.cases[0],request=buildRequest(m,'conversation',projectRuntime({...m,round:48},fixture,'conversation','opaque-r49'));
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 let generations=0;
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{
  if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'local-test-token',expires_in:3600});
  generations++;assert.deepEqual(JSON.parse(options.body),request);assert.equal(request.contents.at(-1).parts[0].text,fixture.runtime.latestCustomerMessage);
  return Response.json({modelVersion:m.models.conversation.version,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:3}});
 }});
 const result=await generate(request);assert.equal(result.status,'OK');assert.equal(generations,1);assert.equal(result.providerRequests,1);
});
