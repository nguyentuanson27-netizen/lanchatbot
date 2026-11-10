import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,projectRuntime,buildRequest,validateProtocol} from './protocol.mjs';
import {registerA2Attempts} from './run-a2.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {runStagedAttempts} from './run-staged-round52.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(55,'manifest.json'),prior=read(54,'manifest.json'),a2=read(55,'corpus-a2.json'),a3=read(55,'corpus-a3.json');

test('round55 admits only the frozen verifier treatment; all population, owner, sources and numeric bars remain exact',()=>{
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:107,a2Safe:72,a3:42});
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json','label-review.json','dialogue-edits.json'])assert.equal(raw(55,f),raw(54,f));
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','fallbacks','terminal','attemptRepetitions','conversationContextFormat','sourcePolicy'])assert.deepEqual(m[key],prior[key]);
 assert.equal(m.prompts.conversation,prior.prompts.conversation);
 for(const key of ['dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','interpretation'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 const changed=structuredClone(m);changed.prompts.verifier+=' Changed';changed.promptHashes.verifier=hash(changed.prompts.verifier);assert.throws(()=>validateProtocol(changed,a2,a3));
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'55'}}),/FROZEN_PROTOCOL_VALID/);
});

test('the four observed prior failures lead the 325attempt denominator; a failed repetition stops all313remaining',async()=>{
 const failures=prior.regression.a2CaseIds; // retain the passing policy control to check compatibility
 assert.deepEqual(m.regression.a2CaseIds,failures);
 const attempts=registerA2Attempts(m,a2);assert.equal(attempts.length,325);assert.equal(new Set(attempts.map(a=>a.attemptId)).size,325);
 assert.deepEqual(attempts.slice(0,12).map(a=>a.attemptId),failures.flatMap(id=>[1,2,3].map(n=>id+':'+n)));
 const evidence={attempts,regression:null};let dispatched=0;
 await runStagedAttempts(m,'a2',a2,evidence,async a=>({precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:++dispatched===1?'FALLBACK':a.expected==='SAFE'?'SEND_ELIGIBLE':'FALLBACK',reason:dispatched===1?'FAIL':'PASS'}}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 assert.equal(dispatched,12);assert.equal(evidence.regression.status,'FAIL');assert.equal(evidence.regression.failedAttemptIds.length,1);assert.ok(attempts.slice(12).every(a=>a.terminal===null&&a.provider===null));
});

test('passing all12opens existing remainder once, but any unsafe send-eligible outcome still stops the run',async()=>{
 const evidence={attempts:registerA2Attempts(m,a2),regression:null};let dispatched=0;
 await runStagedAttempts(m,'a2',a2,evidence,async a=>({precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:'SEND_ELIGIBLE',reason:'PASS'},dispatch:++dispatched}),{save:()=>{},checkSource:()=>{},mode:'ALL',log:()=>{}});
 const unsafeIndex=evidence.attempts.findIndex(a=>a.expected==='UNSAFE');assert.equal(dispatched,unsafeIndex+1);assert.ok(dispatched>12);assert.equal(evidence.regression.reason,'UNSAFE_SEND_ELIGIBLE_PASS');assert.ok(evidence.attempts.slice(dispatched).every(a=>a.terminal===null));
});

test('all42native owner bodies stay exact and verifier bodies change instructions only; evaluator failure labels never enter either role',async()=>{
 for(const c of a3.cases){
  for(const role of ['conversation','verifier']){const fixture={runtime:{...c.runtime,finalDraft:'Dạ, chị nhé.'}},now=buildRequest(m,role,projectRuntime(m,fixture,role,'opaque')),before=buildRequest(prior,role,projectRuntime(prior,fixture,role,'opaque'));assert.deepEqual(now,role==='verifier'?{...before,instructions:m.prompts.verifier}:before);}
  const f=structuredClone(c),marker='R55_EVALUATOR_FAILURE_COHORT_SENTINEL';for(const key of Object.keys(f.evaluator))f.evaluator[key]=marker;f.regression=marker;f.policySourceAudit=marker;
  const roles=[];const result=await evaluateA3Attempt(m,f,async(role,request)=>{roles.push(role);assert.ok(!JSON.stringify(request).includes(marker));return{status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',providerRequests:1};});assert.deepEqual(roles,['conversation','verifier']);assert.equal(result.terminal.text,'Dạ, chị nhé.');
  const max={runtime:{...c.runtime,finalDraft:'x'.repeat(m.bounds.draftBytes)}};assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,'verifier',projectRuntime(m,max,'verifier','opaque'))))<=m.bounds.totalBytes);
 }
});
