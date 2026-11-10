import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,projectRuntime,buildRequest,validateProtocol,repetitionCount} from './protocol.mjs';
import {buildPreparedRequest} from './preparation-20261012.mjs';
import {registerA2Attempts} from './run-a2.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(53,'manifest.json'),prior=read(52,'manifest.json'),a2=read(53,'corpus-a2.json'),a3=read(53,'corpus-a3.json');
const display=r=>JSON.parse(r.contents[0].parts[0].text.split('\n')[1]);

test('round53 freezes its new mixed-source population and config before any result; all legacy fixtures are exact',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:107,a2Safe:72,a3:42});
 assert.equal(raw(53,'corpus-a2.json').slice(-1),'}');
 assert.deepEqual(a2.cases.slice(0,163),read(52,'corpus-a2.json').cases);
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','usability','terminal','fallbacks'])assert.deepEqual(m[key],prior[key]);
 assert.equal(a2.cases.filter(c=>c.evaluator.seed).length,7);
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'53'}}),/FROZEN_PROTOCOL_VALID/);
 const changed=structuredClone(m);changed.prompts.verifier+=' Changed';changed.promptHashes.verifier=hash(changed.prompts.verifier);assert.throws(()=>validateProtocol(changed,a2,a3));
});

test('V6 provider envelope reuses exact prepared source presentation, native history and canonical verifier for all42',()=>{
 for(const fixture of a3.cases){
  const p=projectRuntime(m,fixture,'conversation','opaque'),control=projectRuntime(prior,fixture,'conversation','opaque');assert.deepEqual(p,control);
  assert.deepEqual(buildRequest(m,'conversation',p),buildPreparedRequest(prior,'conversation',control));
  const f={runtime:{...fixture.runtime,finalDraft:'Dạ, chị nhé.'}};
  assert.deepEqual(buildRequest(m,'verifier',projectRuntime(m,f,'verifier','opaque')),buildPreparedRequest(prior,'verifier',projectRuntime(prior,f,'verifier','opaque')));
 }
});

test('all42 A3 worlds use v2 source and revised policy contracts/history never inherit indoor-wear permission',()=>{
 const literal=JSON.parse(readFileSync(new URL('./prompts/repository-policy-source-preparation-20261012.json',import.meta.url))).policyLiterals[0];
 for(const c of a3.cases){assert.equal(c.runtime.trusted.policyLiterals.find(p=>p.ref==='exchange:r5').text,literal.text);const priorCase=read(52,'corpus-a3.json').cases.find(p=>p.evaluator.caseId===c.evaluator.caseId);
  for(const key of ['protectedClaims','boundSubjects','productProfiles','effectReceipts','state'])assert.deepEqual(c.runtime.trusted[key],priorCase.runtime.trusted[key]);
 }
 assert.equal(read(53,'dialogue-edits.json').changes.length,6);
 assert.deepEqual(m.ownerPolicyPresentation,[]);assert.deepEqual(m.ownerProfilePresentation,[]);
});

test('new-policyN3 and all prior repetitions remain in one fixed schedule, unsafe send-eligible PASS stops remainder',async()=>{
 const attempts=registerA2Attempts(m,a2);assert.equal(attempts.length,325);assert.equal(new Set(attempts.map(a=>a.attemptId)).size,325);
 assert.deepEqual(attempts.slice(0,138).map(a=>a.attemptId),m.regression.a2CaseIds.flatMap(id=>[1,2,3].map(n=>id+':'+n)));
 assert.equal(a3.cases.reduce((n,c)=>n+repetitionCount(m,'a3',c.evaluator.caseId),0),72);
 const {runStagedAttempts}=await import('./run-staged-round52.mjs');const evidence={attempts,regression:null};let count=0;
 await runStagedAttempts(m,'a2',a2,evidence,async a=>{count++;return{terminal:{disposition:a.expected==='SAFE'?'SEND_ELIGIBLE':'SEND_ELIGIBLE'},precheck:'SURVIVED',provider:{status:'OK'}};},{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(evidence.regression.reason,'UNSAFE_SEND_ELIGIBLE_PASS');assert.ok(count<138);assert.ok(attempts.slice(count).every(a=>a.terminal===null));
});

test('captured native owner and mandatory verifier requests exclude evaluator/policy/cohort audit labels',async()=>{
 for(const original of a3.cases){const f=structuredClone(original),marker='R53_EVALUATOR_SENTINEL';for(const key of Object.keys(f.evaluator))f.evaluator[key]=marker;f.policySourceAudit=marker;f.regression=marker;
  const roles=[];const result=await evaluateA3Attempt(m,f,async(role,request)=>{roles.push(role);assert.ok(!JSON.stringify(request).includes(marker));assert.ok(!JSON.stringify(request).includes(original.evaluator.caseId));return{status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',providerRequests:1};});
  assert.deepEqual(roles,['conversation','verifier']);assert.equal(typeof result.conversationRequestId,'string');assert.equal(result.terminal.text,'Dạ, chị nhé.');
 }
});

test('V6 actual encoded input remains bounded at max draft and keeps product-specific missing size inputs',()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){const f={runtime:{...c.runtime,finalDraft:'x'.repeat(m.bounds.draftBytes)}};assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,projectRuntime(m,f,role,'opaque'))))<=32768);}
 const c=a3.cases.find(c=>c.evaluator.caseId==='r16-pants-color-alternative'),products=display(buildRequest(m,'conversation',projectRuntime(m,c,'conversation','opaque'))).trusted.products;
 assert.deepEqual(products.find(p=>p.subject.ref==='QU714').profiles[0].codeSizeInput.missingInputs,['WAIST_CM','HIPS_CM']);
 assert.deepEqual(products.find(p=>p.subject.ref==='SM613').profiles[0].codeSizeInput.missingInputs,['BUST_CM']);
});
