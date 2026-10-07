import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
const read=(round,file)=>JSON.parse(readFileSync(new URL('./round-'+round+'/'+file,import.meta.url)));
const m=read(13,'manifest.json'),a2=read(13,'corpus-a2.json'),a3=read(13,'corpus-a3.json'),old=read(12,'manifest.json');

test('Round13 selects the preregistered calibration population without changing any old A2 attack or A3 runtime',()=>{
 assert.deepEqual(a2.cases.slice(0,66),read(12,'corpus-a2.json').cases);
 assert.deepEqual(a3.cases.map(c=>c.runtime),read(12,'corpus-a3.json').cases.map(c=>c.runtime));
 assert.deepEqual(a2.cases.slice(66).map(c=>c.evaluator.expected),['SAFE','SAFE','SAFE','UNSAFE','UNSAFE','UNSAFE']);
 for(const key of ['models','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','usability','repetitions','profileFileHash','contextPreparationHash'])assert.deepEqual(m[key],old[key]);
 for(const key of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','reviewProcedureHash'])assert.deepEqual(m.scoring[key],old.scoring[key]);
 for(const role of ['conversation','verifier'])assert.notEqual(m.promptHashes[role],old.promptHashes[role]);
 const output=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'13'}});
 assert.match(output,/FROZEN_PROTOCOL_VALID/);assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:51,a2Safe:21,a3:28});
 const damaged=structuredClone(a2);damaged.cases[10].runtime.finalDraft+='changed';
 const changed=structuredClone(m);changed.corpusHashes.a2=hash(JSON.stringify(damaged));
 assert.throws(()=>validateProtocol(changed,damaged,a3),/ROUND13_RETAINED/);
});

test('Round13 preserves authoritative fit/customer bindings and maximum-draft envelopes under the revised prompts',()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const projection=projectRuntime(m,f,role,'opaque-request');assert.deepEqual(projection.trusted,c.runtime.trusted);
  assert.equal(hardPrecheck(projection.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,projection)))<=m.bounds.totalBytes);
 }
 for(const c of a2.cases.slice(66)){
  const projection=projectRuntime(m,c,'verifier','opaque-calibration-request');
  assert.equal(hardPrecheck(projection.trusted,c.runtime.finalDraft,new Date(c.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,'verifier',projection)))<=m.bounds.totalBytes);
 }
 assert.ok(!a3.cases.find(c=>c.evaluator.caseId==='r12-pants-known-waist').runtime.trusted.protectedClaims.some(c=>c.type==='SIZE_FIT'));
});

test('Round13 captured provider requests exclude scoring annotations and require the verifier for every surviving reply',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND13_EVALUATOR_ONLY';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];
 const outcome=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em cảm ơn chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(outcome.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric','referenceReplies','calibrationControl','addedSafeA2Count'])assert.ok(!JSON.stringify(body).includes(label),label);
});
