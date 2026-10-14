import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,validateProtocol} from './protocol.mjs';
import {registerA2Attempts} from './run-a2.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(round,name)=>JSON.parse(readFileSync(new URL('./round-'+round+'/'+name,import.meta.url)));
const m=read(6,'manifest.json'),a2=read(6,'corpus-a2.json'),a3=read(6,'corpus-a3.json');

test('Round6 selects its own frozen inputs and registers every retained case fresh exactly once',()=>{
 assert.deepEqual(a2,read(5,'corpus-a2.json'));assert.deepEqual(a3,read(5,'corpus-a3.json'));
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-review-20261007.vi.txt',import.meta.url),'utf8'));
 assert.equal(m.prompts.verifier,read(5,'manifest.json').prompts.verifier);
 assert.deepEqual(m.scoring,JSON.parse(readFileSync(new URL('./round-5/one-pass/manifest.json',import.meta.url))).scoring);
 assert.equal(m.repetitions,1);assert.ok(!m.ownerAmendment);
 const attempts=registerA2Attempts(m,a2);
 assert.equal(attempts.length,66);assert.equal(new Set(attempts.map(a=>a.caseId)).size,66);
 assert.ok(attempts.every(a=>a.repetition===1&&a.provider===null&&a.terminal===null));
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:48,a2Safe:18,a3:20});
 const script=fileURLToPath(new URL('./protocol.mjs',import.meta.url));
 assert.match(execFileSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'6'}}),/FROZEN_PROTOCOL_VALID/);
});

test('Round6 retains code-derived current size/profile/policy authority in both role projections',()=>{
 for(const role of ['conversation','verifier']){
  const c=structuredClone(a3.cases[0]);c.runtime.finalDraft='Em chọn ST411 size M cho chị.';
  const p=projectRuntime(m,c,role,'opaque-request');
  assert.deepEqual(p.trusted.protectedClaims.at(-1).value,c.runtime.trusted.protectedClaims.at(-1).value);
  assert.deepEqual(p.trusted.productProfiles,c.runtime.trusted.productProfiles);
  assert.deepEqual(p.trusted.policyLiterals,c.runtime.trusted.policyLiterals);
  assert.deepEqual(p.trusted.state,c.runtime.trusted.state);
 }
});

test('Round6 captured owner and mandatory verifier requests exclude evaluator-only labels and references',async()=>{
 const c=structuredClone(a3.cases[0]),marker='ROUND6_EVALUATOR_ONLY_SENTINEL';
 for(const key of ['caseId','split','family','expected','buyerGoal','unresolvedConcern','adequateResolution','attainableProgress','requiredBehaviors','forbiddenBehaviors','qualityTags'])c.evaluator[key]=marker;
 c.runtime.history[0].rubric=marker;c.runtime.trusted.state.requiredBehaviors=marker;
 const captured=[];
 const result=await evaluateA3Attempt(m,c,async(role,request)=>{
  captured.push({role,request});return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em chọn ST411 size M cho chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);
 for(const {role,request} of captured){
  assert.equal(request.instructions,m.prompts[role]);
  const text=JSON.stringify(request);
  for(const label of [marker,'caseId','split','expected','buyerGoal','unresolvedConcern','adequateResolution','attainableProgress','requiredBehaviors','forbiddenBehaviors','qualityTags','rubric','referenceReplies','consultationCaseIds'])assert.ok(!text.includes(label),label);
  for(const ref of read(6,'reference-replies.json').references)assert.ok(!text.includes(ref.text));
 }
});
