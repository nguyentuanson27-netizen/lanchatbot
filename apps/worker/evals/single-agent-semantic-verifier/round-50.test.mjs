import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest,repetitionCount} from './protocol.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {registerA2Attempts} from './run-a2.mjs';
const raw=(round,file)=>readFileSync(new URL('./round-'+round+'/'+file,import.meta.url),'utf8');
const read=(round,file)=>JSON.parse(raw(round,file));
const m=read(50,'manifest.json'),prior=read(49,'manifest.json'),a2=read(50,'corpus-a2.json'),a3=read(50,'corpus-a3.json');
const display=request=>JSON.parse(request.contents[0].parts[0].text.split('\n')[1]);

test('round50 admits its sealed input only and retains all authority/configuration bars',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'50'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:99,a2Safe:64,a3:42});
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerProfilePresentation','ownerPolicyPresentation','conversationContextFormat','attemptRepetitions','providerCapacityPolicy'])assert.deepEqual(m[key],prior[key]);
 for(const key of ['dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds','anchors','interpretation'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-round50.vi.txt',import.meta.url),'utf8'));
 assert.ok(m.prompts.conversation.length<=prior.prompts.conversation.length*1.02);
 const changed=structuredClone(m);changed.ownerPolicyPresentation[0].display.exchange.indoorTrial.conditions.pop();assert.throws(()=>validateProtocol(changed,a2,a3));
});

test('round50 forwards identical trusted context and verifier request with unchanged exact binding',()=>{
 for(const fixture of a3.cases){
  const a=projectRuntime(m,fixture,'conversation','opaque-same-binding'),b=projectRuntime(prior,fixture,'conversation','opaque-same-binding');
  assert.deepEqual(a,b);assert.deepEqual(display(buildRequest(m,'conversation',a)),display(buildRequest(prior,'conversation',b)));
  assert.equal(a.requestIdentity.trustedSnapshotId,hash(JSON.stringify(a.trusted)));
  const v={runtime:{...fixture.runtime,finalDraft:'Dạ, chị nhé.'}};
  assert.deepEqual(buildRequest(m,'verifier',projectRuntime(m,v,'verifier','opaque')),buildRequest(prior,'verifier',projectRuntime(prior,v,'verifier','opaque')));
 }
});

test('round50 preserves every A2/A3 fixture and registered repetition including seven PR387 attacks',()=>{
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json','label-review.json','dialogue-edits.json'])assert.equal(raw(50,f),raw(49,f));
 assert.equal(registerA2Attempts(m,a2).length,253);
 assert.equal(a3.cases.reduce((n,c)=>n+repetitionCount(m,'a3',c.evaluator.caseId),0),66);
 assert.equal(a2.cases.filter(c=>c.evaluator.caseId.startsWith('pr387-')).length,7);
});

test('round50 actual captured owner and mandatory verifier bodies exclude evaluator-only labels',async()=>{
 for(const original of a3.cases){
  const fixture=structuredClone(original),marker='R50_EVALUATOR_ONLY_SENTINEL';
  for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;
  fixture.reviewNotes=marker;fixture.scoringLabels=marker;
  const roles=[];
  const outcome=await evaluateA3Attempt(m,fixture,async(role,request)=>{
   roles.push(role);const text=JSON.stringify(request);assert.ok(!text.includes(marker));assert.ok(!text.includes(original.evaluator.caseId));
   return {status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',providerRequests:1};
  });
  assert.deepEqual(roles,['conversation','verifier']);assert.equal(outcome.terminal.disposition,'SEND_ELIGIBLE');assert.equal(outcome.terminal.text,'Dạ, chị nhé.');
 }
});

test('round50 native adapter forwards its exact final text request once without retry',async()=>{
 const fixture=a3.cases[0],request=buildRequest(m,'conversation',projectRuntime(prior,fixture,'conversation','opaque-native'));
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};
 let generations=0;
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{
  if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'local-test-token',expires_in:3600});
  generations++;assert.deepEqual(JSON.parse(options.body),request);assert.equal(request.contents.at(-1).parts[0].text,fixture.runtime.latestCustomerMessage);
  return Response.json({modelVersion:m.models.conversation.version,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:3}});
 }});
 const result=await generate(request);assert.equal(result.status,'OK');assert.equal(generations,1);assert.equal(result.providerRequests,1);
});
