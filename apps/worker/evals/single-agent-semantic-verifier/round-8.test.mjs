import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,validateProtocol,hash} from './protocol.mjs';
import {registerA2Attempts} from './run-a2.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(round,name)=>JSON.parse(readFileSync(new URL('./round-'+round+'/'+name,import.meta.url)));
const m=read(8,'manifest.json'),a2=read(8,'corpus-a2.json'),a3=read(8,'corpus-a3.json');

test('Round8 registers66 fresh attempts, preserves48unsafe and24A3, freezes reviewed voice and only declared SAFE corrections',()=>{
 const old=read(7,'corpus-a2.json'),changed=[];
 for(const [index,c] of a2.cases.entries()){
  assert.deepEqual(c.evaluator,old.cases[index].evaluator);
  assert.deepEqual(c.runtime.trusted,old.cases[index].runtime.trusted);
  if(JSON.stringify(c)!==JSON.stringify(old.cases[index])){
   changed.push(c.evaluator.caseId);assert.equal(c.evaluator.expected,'SAFE');assert.ok(!c.evaluator.seed);
  }
 }
 assert.deepEqual(changed,['fashion-safe-choice','fashion-safe-chart','fashion-safe-unknown','r4-safe-sale','r4-safe-policy']);
 assert.deepEqual(a2.cases.filter(c=>c.evaluator.expected==='UNSAFE'),old.cases.filter(c=>c.evaluator.expected==='UNSAFE'));
 assert.deepEqual(a3,read(7,'corpus-a3.json'));
 assert.equal(m.prompts.verifier,read(7,'manifest.json').prompts.verifier);
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-voice-review-20261007.vi.txt',import.meta.url),'utf8'));
 assert.equal(m.scoring.reviewProcedureHash,hash(readFileSync(new URL('../../../../'+m.scoring.reviewProcedureFile,import.meta.url))));
 assert.equal(m.repetitions,1);assert.ok(!m.ownerAmendment);
 const attempts=registerA2Attempts(m,a2);assert.equal(attempts.length,66);
 assert.ok(attempts.every(a=>a.repetition===1&&a.provider===null&&a.terminal===null));
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:48,a2Safe:18,a3:24});
 const missing=structuredClone(a3);missing.cases.pop();assert.throws(()=>validateProtocol(m,a2,missing));
 const script=fileURLToPath(new URL('./protocol.mjs',import.meta.url));
 assert.match(execFileSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'8'}}),/FROZEN_PROTOCOL_VALID/);
});

test('Round8 preserves current size binding, complete policy and profiles in both role projections',()=>{
 const c=a3.cases.find(c=>c.evaluator.caseId==='r7-price-ready-fit');
 for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='Em chọn ST411 M theo số đo chị gửi.';
  const p=projectRuntime(m,f,role,'opaque-request');
  assert.deepEqual(p.trusted.protectedClaims.at(-1).value,f.runtime.trusted.protectedClaims.at(-1).value);
  assert.deepEqual(p.trusted.state,f.runtime.trusted.state);
  assert.deepEqual(p.trusted.productProfiles,f.runtime.trusted.productProfiles);
  assert.deepEqual(p.trusted.policyLiterals,f.runtime.trusted.policyLiterals);
 }
});

test('Round8 captured owner/verifier requests exclude evaluator labels, review procedure and references',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND8_EVALUATOR_ONLY_SENTINEL';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.runtime.history[0].rubric=marker;c.runtime.trusted.state.requiredBehaviors=marker;
 const captured=[];
 const outcome=await evaluateA3Attempt(m,c,async(role,request)=>{
  captured.push({role,request});return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em cảm ơn chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(outcome.terminal.disposition,'SEND_ELIGIBLE');
 assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);
 for(const {request} of captured){
  const text=JSON.stringify(request);
  for(const label of [marker,'caseId','split','expected','buyerGoal','unresolvedConcern','adequateResolution','attainableProgress','requiredBehaviors','forbiddenBehaviors','qualityTags','rubric','referenceReplies','consultationCaseIds','reviewProcedureFile','reviewProcedureHash'])assert.ok(!text.includes(label),label);
  for(const ref of read(8,'reference-replies.json').references)assert.ok(!text.includes(ref.text));
 }
});
