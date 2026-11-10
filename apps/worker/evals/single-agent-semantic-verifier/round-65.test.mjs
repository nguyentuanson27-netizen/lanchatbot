import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt} from './run-a2.mjs';import {runStagedAttempts,regressionSummary} from './run-staged-round52.mjs';
import {createGeminiInference} from './gemini-inference.mjs';import {generateKeyPairSync} from 'node:crypto';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(65,'manifest.json'),old=read(64,'manifest.json'),a2=read(65,'corpus-a2.json'),a3=read(65,'corpus-a3.json');

test('round65 freezes one verifier treatment and retains all original worlds/labels/model/authority/quality bars',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:108,a2Safe:79,a3:42});
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','fallbacks','terminal','sourcePolicy','serialization'])assert.deepEqual(m[key],old[key]);
 const scoring={...m.scoring,evidencePolicy:old.scoring.evidencePolicy};assert.deepEqual(scoring,old.scoring);
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json','dialogue-edits.json','legacy-policy-source-view.json','label-review.json'])assert.equal(raw(65,f),raw(64,f));
 assert.equal(m.prompts.conversation,old.prompts.conversation);assert.notEqual(m.promptHashes.verifier,old.promptHashes.verifier);
 for(const heading of ['# Việc của bạn','# Đọc nguồn và hội thoại','# Đúng món, size, tiền và thời gian','# Xác nhận lựa chọn và thao tác','# Kết quả']){
  const section=s=>s.slice(s.indexOf(heading)).split(/\n# /)[0];assert.equal(section(m.prompts.verifier),section(old.prompts.verifier));
 }
 const changed=structuredClone(m);changed.prompts.verifier+=' changed';changed.promptHashes.verifier=hash(changed.prompts.verifier);assert.throws(()=>validateProtocol(changed,a2,a3));
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'65'}}),/FROZEN_PROTOCOL_VALID/);
});

test('all three old semantic controls N3 precede nine N3 safety contrasts and retain complete355registration',()=>{
 const attempts=registerA2Attempts(m,a2);assert.equal(attempts.length,355);assert.equal(attempts.filter(a=>a.expected==='UNSAFE').length,186);assert.equal(attempts.filter(a=>a.expected==='SAFE').length,169);
 assert.deepEqual(attempts.slice(0,36).map(a=>a.attemptId),m.regression.a2CaseIds.flatMap(id=>[1,2,3].map(n=>id+':'+n)));
 assert.deepEqual([...new Set(attempts.slice(0,9).map(a=>a.caseId))],['r45-trial-partial-eligibility-unsafe','r22-neat-busy-day-safe','r26-material-advice-safe']);
 assert.ok(attempts.every(a=>a.terminal===null&&a.provider===null));
 assert.equal(regressionSummary(m,'a2',a2,attempts).status,'BLOCKED');
});

test('all42owner requests remain exact64 and the admitted native Gemini adapter issues one generation',async()=>{
 for(const c of a3.cases)assert.deepEqual(buildRequest(m,'conversation',projectRuntime(m,c,'conversation','opaque')),buildRequest(old,'conversation',projectRuntime(old,c,'conversation','opaque')));
 const request=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque'));
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};let generations=0;
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_TOKEN',expires_in:3600});generations++;assert.deepEqual(JSON.parse(options.body),request);return Response.json({modelVersion:m.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});}});
 const outcome=await run(request);assert.equal(outcome.status,'OK');assert.equal(outcome.providerRequests,1);assert.equal(generations,1);
});

test('every surviving captured verifier request changes only instructions; evaluator-only poison never leaks',async()=>{
 let captures=0;
 for(const c of a2.cases){const poisoned=structuredClone(c);for(const key of Object.keys(poisoned.evaluator))poisoned.evaluator[key]='ROUND65_PRIVATE_LABEL';poisoned.labelReview='ROUND65_PRIVATE_LABEL';
  const outcome=await evaluateA2Attempt(m,poisoned,async request=>{captures++;
   const p=JSON.parse(request.input[0].content[0].text),control=buildRequest(old,'verifier',projectRuntime(old,c,'verifier',p.requestIdentity.requestId));
   assert.deepEqual(request,{...control,instructions:m.prompts.verifier});assert.ok(!JSON.stringify(request).includes('ROUND65_PRIVATE_LABEL'));
   for(const key of ['caseId','split','expected','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric'])assert.ok(!JSON.stringify(request).includes('"'+key+'"'));
   return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',requestBody:request,providerRequests:1,clientRequests:1,latencyMs:0,usage:null};
  });if(outcome.precheck==='SURVIVED')assert.equal(outcome.provider.providerRequests,1);
 }assert.ok(captures>170);
});

test('staged runner persists dispatched provider/result checkpoint before client cleanup and clears it only on terminal',async()=>{
 const evidence={attempts:registerA2Attempts(m,a2),regression:null},snapshots=[];
 await runStagedAttempts(m,'a2',a2,evidence,async(attempt,options)=>{
  options.onCheckpoint({phase:'DISPATCHED',providerRequests:1});assert.equal(snapshots.at(-1).attempts.find(a=>a.attemptId===attempt.attemptId).transportCheckpoint.providerRequests,1);
  options.onCheckpoint({phase:'RESULT',provider:{status:'OK',providerRequests:1,answer:'retained-before-cleanup'}});
  assert.equal(snapshots.at(-1).attempts.find(a=>a.attemptId===attempt.attemptId).transportCheckpoint.provider.answer,'retained-before-cleanup');
  return {precheck:'SURVIVED',provider:{status:'OK',providerRequests:1},terminal:{disposition:attempt.expected==='SAFE'?'SEND_ELIGIBLE':'FALLBACK',reason:attempt.expected==='SAFE'?'PASS':'FAIL'}};
 },{mode:'REGRESSION',save:()=>snapshots.push(structuredClone(evidence)),checkSource:()=>{},log:()=>{}});
 assert.equal(evidence.attempts.filter(a=>a.terminal).length,36);assert.ok(evidence.attempts.every(a=>!a.transportCheckpoint));
 assert.equal(regressionSummary(m,'a2',a2,evidence.attempts).status,'PASS');
});

test('SAFE regression refusal withholds every remaining slot; an unsafe eligible PASS stops immediately',async()=>{
 for(const unsafePass of [false,true]){
  const evidence={attempts:registerA2Attempts(m,a2),regression:null};let calls=0;
  await runStagedAttempts(m,'a2',a2,evidence,async a=>{calls++;return {precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:unsafePass?'SEND_ELIGIBLE':'FALLBACK',reason:'FAIL'}};},{mode:'ALL',save:()=>{},checkSource:()=>{},log:()=>{}});
  assert.equal(evidence.regression.status,'FAIL');assert.equal(calls,unsafePass?10:36);assert.ok(evidence.attempts.slice(calls).every(a=>!a.terminal&&!a.dispatchStartedAt));
 }
});

test('Round65 direct A3 entry refuses bypassing the registered regression schedule before any generation',()=>{
 assert.throws(()=>execFileSync(process.execPath,[fileURLToPath(new URL('./run-a3.mjs',import.meta.url))],{encoding:'utf8',stdio:'pipe',env:{...process.env,C3_CHECKPOINT_A_ROUND:'65',A3_RUN_SOURCE_SHA:''}}),/A3_RUN_FAILED_CLOSED:STAGED_RUN_REQUIRED/);
});
