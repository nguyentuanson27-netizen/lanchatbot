import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {hash,validateProtocol,projectRuntime,buildRequest,repetitionCount} from './protocol.mjs';
import {registerA2Attempts,assertSealedSource} from './run-a2.mjs';
import {createGeminiInference} from './gemini-inference.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const raw=(round,file)=>readFileSync(new URL('./round-'+round+'/'+file,import.meta.url),'utf8');
const read=(round,file)=>JSON.parse(raw(round,file));
const m=read(52,'manifest.json'),prior=read(51,'manifest.json'),a2=read(52,'corpus-a2.json'),a3=read(52,'corpus-a3.json');
const display=request=>JSON.parse(request.contents[0].parts[0].text.split('\n')[1]);

test('round52 admits its frozen protocol, rejects changed cohort and keeps all prior worlds and safety configuration',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'52'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:99,a2Safe:64,a3:42});
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerPolicyPresentation','ownerProfilePresentation','providerCapacityPolicy'])assert.deepEqual(m[key],prior[key]);
 for(const key of ['dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds','anchors','interpretation'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json','label-review.json','dialogue-edits.json'])assert.equal(raw(52,f),raw(51,f));
 const changed=structuredClone(m);changed.regression.a3CaseIds.pop();assert.throws(()=>validateProtocol(changed,a2,a3));
});

test('V5 associates inputs, fit and facts with their exact product and retains all V4 owner data and native dialogue',()=>{
 for(const fixture of a3.cases){
  const p=projectRuntime(m,fixture,'conversation','opaque'),old=projectRuntime(prior,fixture,'conversation','opaque');assert.deepEqual(p,old);
  const request=buildRequest(m,'conversation',p),now=display(request).trusted,before=display(buildRequest(prior,'conversation',old)).trusted;
  assert.deepEqual(now.products.map(x=>x.subject),before.boundSubjects);
  assert.deepEqual([...now.products.flatMap(x=>x.claims),...now.otherClaims].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),[...before.protectedClaims].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  assert.deepEqual([...now.products.flatMap(x=>x.profile?[x.profile]:[]),...now.otherProfiles].sort((a,b)=>a.ref.localeCompare(b.ref)),[...before.productProfiles].sort((a,b)=>a.ref.localeCompare(b.ref)));
  for(const product of now.products){assert.ok(product.claims.every(c=>c.scope.productId===product.subject.ref));if(product.profile)assert.equal(product.profile.subjectRef,product.subject.ref);}
  for(const key of ['policyLiterals','effectReceipts','state'])assert.deepEqual(now[key],before[key]);
  assert.equal(p.requestIdentity.trustedSnapshotId,hash(JSON.stringify(p.trusted)));
  assert.deepEqual(request.contents.slice(1),buildRequest(prior,'conversation',old).contents.slice(1));
  const f={runtime:{...fixture.runtime,finalDraft:'Dạ, chị nhé.'}};assert.deepEqual(buildRequest(m,'verifier',projectRuntime(m,f,'verifier','opaque')),buildRequest(prior,'verifier',projectRuntime(prior,f,'verifier','opaque')));
 }
 const pants=a3.cases.find(c=>c.evaluator.caseId==='r16-pants-color-alternative');const products=display(buildRequest(m,'conversation',projectRuntime(m,pants,'conversation','opaque'))).trusted.products;
 assert.deepEqual(products.find(x=>x.subject.ref==='QU714').profile.details.codeSizeInput.missingInputs,['WAIST_CM','HIPS_CM']);
 assert.deepEqual(products.find(x=>x.subject.ref==='SM613').profile.details.codeSizeInput.missingInputs,['BUST_CM']);
});

test('all prior failures receive exactly three registrations before remaining attempts with no duplicates or denominator loss',()=>{
 const attempts=registerA2Attempts(m,a2);assert.equal(attempts.length,277);assert.deepEqual(attempts.slice(0,90).map(x=>x.attemptId),m.regression.a2CaseIds.flatMap(id=>[1,2,3].map(n=>id+':'+n)));
 assert.equal(new Set(attempts.map(x=>x.attemptId)).size,277);assert.equal(a3.cases.reduce((n,c)=>n+repetitionCount(m,'a3',c.evaluator.caseId),0),72);
 assert.equal(a2.cases.filter(c=>c.evaluator.caseId.startsWith('pr387-')).length,7);
});

test('regression admission rejects one failing repetition, missing scores and stale raw evidence without dispatching a remaining slot',async()=>{
 const {regressionSummary,runStagedAttempts,authorizeA3Continuation}=await import('./run-staged-round52.mjs');
 const rows=m.regression.a2CaseIds.flatMap(id=>[1,2,3].map(n=>({attemptId:id+':'+n,caseId:id,expected:a2.cases.find(c=>c.evaluator.caseId===id).evaluator.expected,precheck:'SURVIVED',provider:{status:'OK',answer:'{"verdict":"FAIL","violations":[]}'},terminal:{disposition:'FALLBACK'}})));
 for(const row of rows)if(row.expected==='SAFE')row.terminal={disposition:'SEND_ELIGIBLE'};
 assert.equal(regressionSummary(m,'a2',a2,rows).status,'PASS');rows.find(x=>x.expected==='SAFE').terminal={disposition:'FALLBACK'};assert.equal(regressionSummary(m,'a2',a2,rows).status,'FAIL');
 const evidence={attempts:registerA2Attempts(m,a2),regression:null};let calls=0;
 await runStagedAttempts(m,'a2',a2,evidence,async attempt=>{calls++;return rows.find(x=>x.attemptId===attempt.attemptId);},{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(calls,90);assert.ok(evidence.attempts.slice(90).every(x=>x.terminal===null));assert.equal(evidence.regression.status,'FAIL');
 const a3rows=m.regression.a3CaseIds.flatMap(id=>[1,2,3].map(n=>({attemptId:id+':'+n,caseId:id,terminal:{disposition:'SEND_ELIGIBLE'}})));
 assert.equal(regressionSummary(m,'a3',a3,a3rows).status,'BLOCKED');
 const a3e={a3RunSourceSha:'a'.repeat(40),manifestHash:hash(raw(52,'manifest.json')),attempts:a3rows};
 const scores={a3RunSourceSha:a3e.a3RunSourceSha,manifestHash:a3e.manifestHash,evidenceHash:'prefix-raw-hash',attempts:a3rows.map(a=>({attemptId:a.attemptId,wholeTurnReview:'Local mechanics fixture, not a provider result.',scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}))};
 assert.equal(authorizeA3Continuation(m,a3,a3e,scores,'prefix-raw-hash').status,'PASS');
 assert.throws(()=>authorizeA3Continuation(m,a3,a3e,scores,'changed-raw-hash'),/REGRESSION_REVIEW_IDENTITY/);
 scores.attempts[0].scores.decisionSupport=1;assert.throws(()=>authorizeA3Continuation(m,a3,a3e,scores,'prefix-raw-hash'),/REGRESSION_NOT_PASS/);
});

test('interrupted dispatched slot is never generated again',async()=>{
 const {runStagedAttempts}=await import('./run-staged-round52.mjs');const evidence={attempts:registerA2Attempts(m,a2),regression:null};evidence.attempts[0].dispatchStartedAt='2026-10-12T00:00:00Z';let calls=0;
 await assert.rejects(runStagedAttempts(m,'a2',a2,evidence,async()=>{calls++;},{save:()=>{},checkSource:()=>{},mode:'ALL'}),/DISPATCH_OUTCOME_UNKNOWN/);assert.equal(calls,0);
});

test('source seal accepts evidence-only commits for a staged run and rejects executable or frozen-input changes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c3-r52-seal-')),git=args=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','ignore']});
 git(['init']);git(['config','user.email','fixture@example.invalid']);git(['config','user.name','Fixture']);writeFileSync(join(dir,'source.mjs'),'export const x=1;\n');writeFileSync(join(dir,'manifest.json'),'{}\n');git(['add','.']);git(['commit','-m','seal']);const sha=git(['rev-parse','HEAD']).trim();
 assertSealedSource(sha,['evidence.json'],{cwd:dir,allowEvidenceCommits:true});writeFileSync(join(dir,'evidence.json'),'{}\n');git(['add','.']);git(['commit','-m','raw']);assertSealedSource(sha,['evidence.json'],{cwd:dir,allowEvidenceCommits:true});
 writeFileSync(join(dir,'manifest.json'),'[]\n');assert.throws(()=>assertSealedSource(sha,['evidence.json'],{cwd:dir,allowEvidenceCommits:true}),/RUN_SOURCE_CHANGED/);writeFileSync(join(dir,'manifest.json'),'{}\n');writeFileSync(join(dir,'source.mjs'),'export const x=2;\n');assert.throws(()=>assertSealedSource(sha,['evidence.json'],{cwd:dir,allowEvidenceCommits:true}),/RUN_SOURCE_CHANGED/);
});

test('captured V5 owner and mandatory verifier bodies exclude all evaluator and regression labels',async()=>{
 for(const original of a3.cases){const fixture=structuredClone(original),marker='R52_EVALUATOR_ONLY_SENTINEL';for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;fixture.regression=marker;
  const roles=[];const outcome=await evaluateA3Attempt(m,fixture,async(role,request)=>{roles.push(role);const text=JSON.stringify(request);assert.ok(!text.includes(marker));assert.ok(!text.includes(original.evaluator.caseId));assert.ok(!text.includes('a3CaseIds'));return{status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',providerRequests:1};});
  assert.deepEqual(roles,['conversation','verifier']);assert.equal(outcome.terminal.text,'Dạ, chị nhé.');
 }
});

test('native V5 provider adapter forwards exact request once and keeps errors fail-closed',async()=>{
 const fixture=a3.cases[0],request=buildRequest(m,'conversation',projectRuntime(m,fixture,'conversation','opaque'));
 const credential={type:'service_account',project_id:m.models.conversation.generationConfig.projectId,client_email:'fixture@example.invalid',private_key:generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey};let generations=0;
 const generate=createGeminiInference(m,{credential,fetchImpl:async(url,options)=>{if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'local-test-token',expires_in:3600});generations++;assert.deepEqual(JSON.parse(options.body),request);return new Response('',{status:503});}});
 const result=await generate(request);assert.equal(result.status,'PROVIDER_ERROR');assert.equal(result.httpStatus,503);assert.equal(generations,1);assert.equal(result.providerRequests,1);
});
