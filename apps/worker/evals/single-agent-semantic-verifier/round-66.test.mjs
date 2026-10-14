import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest,repetitionCount} from './protocol.mjs';import {registerA2Attempts,evaluateA2Attempt} from './run-a2.mjs';import {runStagedAttempts,regressionSummary} from './run-staged-round52.mjs';import {createGeminiInference} from './gemini-inference.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(66,'manifest.json'),old=read(65,'manifest.json'),a2=read(66,'corpus-a2.json'),a3=read(66,'corpus-a3.json'),reg=read(66,'regression-cohort.json'),prior=read(65,'a2-evidence.json');
// Independent expected schedule used to reproduce the old hardcoded-three cutoff.
const attempts=(phase,corpus)=>{const ids=m.regression[phase+'CaseIds'],ordered=[...ids.map(id=>corpus.cases.find(c=>c.evaluator.caseId===id)),...corpus.cases.filter(c=>!ids.includes(c.evaluator.caseId))];return ordered.flatMap(c=>Array.from({length:phase==='a2'&&reg.sourceFailedCaseIds.includes(c.evaluator.caseId)?3:2},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),caseId:c.evaluator.caseId,repetition:i+1,expected:c.evaluator.expected,precheck:null,provider:null,terminal:null,conversation:null,finalDraft:null,verification:null})));};

test('Round66 admits exact N2/N3 contract and only policy prompt changes with all worlds/labels/authority/bar values retained',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:108,a2Safe:79,a3:42});
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','fallbacks','terminal','sourcePolicy','serialization'])assert.deepEqual(m[key],old[key]);
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json','dialogue-edits.json','legacy-policy-source-view.json','label-review.json'])assert.equal(raw(66,f),raw(65,f));
 assert.deepEqual({...m.scoring,evidencePolicy:old.scoring.evidencePolicy},old.scoring);assert.equal(m.prompts.conversation,old.prompts.conversation);
 const remove=s=>s.slice(0,s.indexOf('# Quyền đổi, trả và các chính sách'))+s.slice(s.indexOf('# Tư vấn sản phẩm'));assert.equal(remove(m.prompts.verifier),remove(old.prompts.verifier));
 const bad=structuredClone(m);bad.repetitions=3;assert.throws(()=>validateProtocol(bad,a2,a3));
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'66'}}),/FROZEN_PROTOCOL_VALID/);
});

test('378fresh A2 slots include exactly four failed/error groups N3; all other A2/A3 cases N2',()=>{
 assert.equal(reg.sourceEvidenceHash,hash(raw(65,'a2-evidence.json')));
 assert.deepEqual(reg.sourceFailedAttemptIds,prior.regression.failedAttemptIds);assert.deepEqual(reg.sourceFailedCaseIds,[...new Set(prior.regression.failedAttemptIds.map(id=>prior.attempts.find(a=>a.attemptId===id).caseId))]);
 const actual=registerA2Attempts(m,a2);assert.equal(actual.length,378);assert.equal(actual.filter(a=>a.expected==='UNSAFE').length,218);assert.equal(actual.filter(a=>a.expected==='SAFE').length,160);
 for(const c of a2.cases)assert.equal(actual.filter(a=>a.caseId===c.evaluator.caseId).length,reg.sourceFailedCaseIds.includes(c.evaluator.caseId)?3:2);
 assert.equal(a3.cases.reduce((n,c)=>n+repetitionCount(m,'a3',c.evaluator.caseId),0),84);assert.ok(actual.every(a=>!a.terminal&&!a.provider));
 assert.deepEqual(actual.map(a=>a.attemptId),attempts('a2',a2).map(a=>a.attemptId));
});

test('mixed N3/N2 A2 prefix stops at22 before356remainder, counts errors, and unsafe eligible PASS stops at7',async()=>{
 for(const unsafePass of [false,true]){
  const e={attempts:attempts('a2',a2),regression:null};let calls=0;
  await runStagedAttempts(m,'a2',a2,e,async a=>{calls++;return {precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:unsafePass?'SEND_ELIGIBLE':'FALLBACK',reason:'FAIL'}};},{mode:'ALL',save:()=>{},checkSource:()=>{},log:()=>{}});
  assert.equal(calls,unsafePass?7:22);assert.equal(e.regression.status,'FAIL');assert.ok(e.attempts.slice(calls).every(a=>!a.terminal&&!a.dispatchStartedAt));
 }
 const complete=attempts('a2',a2);for(const a of complete.slice(0,22))Object.assign(a,{precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:a.expected==='SAFE'?'SEND_ELIGIBLE':'FALLBACK',reason:a.expected==='SAFE'?'PASS':'FAIL'}});
 assert.equal(regressionSummary(m,'a2',a2,complete).status,'PASS');complete[7].provider.status='PROVIDER_ERROR';assert.equal(regressionSummary(m,'a2',a2,complete).status,'FAIL');
});

test('A3 N2 prefix generates exactly20 outcomes before review, never silently reaching30',async()=>{
 const e={attempts:attempts('a3',a3),regression:null};let calls=0;
 await runStagedAttempts(m,'a3',a3,e,async()=>{calls++;return {conversation:{status:'OK'},terminal:{disposition:'SEND_ELIGIBLE',reason:'PASS'}};},{mode:'REGRESSION',save:()=>{},checkSource:()=>{},log:()=>{}});
 assert.equal(calls,20);assert.equal(e.regression.denominator,20);assert.equal(e.regression.status,'AWAITING_REVIEW');assert.ok(e.attempts.slice(20).every(a=>!a.terminal&&!a.dispatchStartedAt));
});

test('all surviving actual verifier request captures preserve exact context/draft and exclude private evaluator labels',async()=>{
 let captured=0;for(const c of a2.cases){const poisoned=structuredClone(c);for(const k of Object.keys(poisoned.evaluator))poisoned.evaluator[k]='ROUND66_PRIVATE_LABEL';
  await evaluateA2Attempt(m,poisoned,async request=>{captured++;const p=JSON.parse(request.input[0].content[0].text),control=buildRequest(old,'verifier',projectRuntime(old,c,'verifier',p.requestIdentity.requestId));assert.deepEqual(request,{...control,instructions:m.prompts.verifier});assert.ok(!JSON.stringify(request).includes('ROUND66_PRIVATE_LABEL'));
   return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',requestBody:request,providerRequests:1,clientRequests:1,usage:null,latencyMs:0};
  });
 }assert.ok(captured>170);
});

test('native owner projection remains exact65 and admitted Gemini adapter makes one generation per slot',async()=>{
 for(const c of a3.cases)assert.deepEqual(buildRequest(m,'conversation',projectRuntime(m,c,'conversation','opaque')),buildRequest(old,'conversation',projectRuntime(old,c,'conversation','opaque')));
 const request=buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque'));
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};let calls=0;
 const run=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'LOCAL_TOKEN',expires_in:3600});calls++;assert.deepEqual(JSON.parse(options.body),request);return Response.json({modelVersion:m.models.conversation.model,candidates:[{content:{parts:[{text:'Dạ, chị nhé.'}]},finishReason:'STOP'}]});}});
 const result=await run(request);assert.equal(result.status,'OK');assert.equal(calls,1);assert.equal(result.providerRequests,1);
});
