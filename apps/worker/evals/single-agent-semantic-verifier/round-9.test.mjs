import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(folder,file)=>JSON.parse(readFileSync(new URL('./'+folder+'/'+file,import.meta.url)));
const m=read('round-9','manifest.json'),a2=read('round-9','corpus-a2.json'),a3=read('round-9','corpus-a3.json');

test('Round9 preserves exact seven seeds and unsafe drafts, fixed models/bars; freezes reviewed context/prompts',()=>{
 const old=read('round-8-gemini','manifest.json'),before=read('round-8-gemini','corpus-a2.json');
 assert.deepEqual(a2.cases.filter(c=>c.evaluator.seed),before.cases.filter(c=>c.evaluator.seed));
 for(const c of a2.cases.filter(c=>c.evaluator.expected==='UNSAFE')){
  const prior=before.cases.find(p=>p.evaluator.caseId===c.evaluator.caseId);
  assert.equal(c.runtime.finalDraft,prior.runtime.finalDraft);assert.deepEqual(c.evaluator,prior.evaluator);
 }
 assert.deepEqual(a2.cases.filter((c,i)=>c.runtime.finalDraft!==before.cases[i].runtime.finalDraft).map(c=>c.evaluator.caseId),['r4-safe-policy','r5-safe-fit','r5-safe-exchange']);
 for(const key of ['models','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[key],old[key]);
 for(const key of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationCaseIds','reviewProcedureHash'])assert.deepEqual(m.scoring[key],old.scoring[key]);
 for(const [role,name] of Object.entries({conversation:'fashion-sales-owner-confidence-review',verifier:'semantic-verifier-sales-confidence-review'}))assert.equal(m.prompts[role],readFileSync(new URL('./prompts/'+name+'-20261007.vi.txt',import.meta.url),'utf8'));
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:48,a2Safe:18,a3:24});
 const out=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'9'}});
 assert.match(out,/FROZEN_PROTOCOL_VALID/);
});

test('Round9 context survives existing bounds/authority with exact claims and meaningful snapshot changes',()=>{
 const prior=read('round-8-gemini','corpus-a3.json');
 for(const [i,c] of a3.cases.entries())for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const p=projectRuntime(m,f,role,'opaque-request');
  assert.deepEqual(p.trusted.protectedClaims,prior.cases[i].runtime.trusted.protectedClaims);
  assert.deepEqual(p.trusted.policyLiterals,f.runtime.trusted.policyLiterals);
  assert.deepEqual(p.trusted.productProfiles,f.runtime.trusted.productProfiles);
  assert.equal(hardPrecheck(p.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,p)))<=m.bounds.totalBytes);
  assert.equal(p.requestIdentity.trustedSnapshotId,hash(JSON.stringify(p.trusted)));
  const changed=structuredClone(f);changed.runtime.trusted.policyLiterals[0].text+=' Another policy version.';
  assert.notEqual(projectRuntime(m,changed,role,'opaque-request').requestIdentity.trustedSnapshotId,p.requestIdentity.trustedSnapshotId);
 }
});

test('Round9 captured requests exclude evaluation labels; every surviving draft still invokes verifier then gate',async()=>{
 const c=structuredClone(a3.cases[0]),marker='ROUND9_EVALUATOR_ONLY';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];
 const result=await evaluateA3Attempt(m,c,async(role,request)=>{
  captured.push({role,request});return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em cảm ơn chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.deepEqual(captured.map(c=>c.role),['conversation','verifier']);
 assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const {request} of captured){const wire=JSON.stringify(request);
  for(const key of [marker,'caseId','split','expected','buyerGoal','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric','referenceReplies','reviewProcedureFile'])assert.ok(!wire.includes(key),key);
 }
});
