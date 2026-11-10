import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
const read=(round,file)=>JSON.parse(readFileSync(new URL('./round-'+round+'/'+file,import.meta.url)));
const m=read(12,'manifest.json'),a2=read(12,'corpus-a2.json'),a3=read(12,'corpus-a3.json'),old=read(11,'manifest.json');

test('Round12 selects its sealed population, retaining exact attacks and24anchors with unchanged safety contracts',()=>{
 assert.deepEqual(a2,read(11,'corpus-a2.json'));
 assert.deepEqual(a3.cases.slice(0,24),read(11,'corpus-a3.json').cases);
 assert.equal(hash(JSON.stringify({schemaVersion:1,cases:a3.cases.slice(0,24)})),m.cohorts.anchorA3Hash);
 for(const key of ['models','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','usability','repetitions','profileFileHash','contextPreparationHash'])assert.deepEqual(m[key],old[key]);
 for(const key of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','reviewProcedureHash','interpretation','evidencePolicy'])assert.deepEqual(m.scoring[key],old.scoring[key]);
 assert.equal(m.prompts.verifier,old.prompts.verifier);assert.notEqual(m.promptHashes.conversation,old.promptHashes.conversation);
 const result=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'12'}});
 assert.match(result,/FROZEN_PROTOCOL_VALID/);assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:48,a2Safe:18,a3:28});
 const damaged=structuredClone(a3);damaged.cases[0].runtime.latestCustomerMessage+='changed';
 const changed=structuredClone(m);changed.corpusHashes.a3=hash(JSON.stringify(damaged));
 assert.throws(()=>validateProtocol(changed,a2,damaged),/ROUND12_ANCHOR/);
});

test('Round12 preserves exact trusted context for both roles, fits bounds and does not infer size from a partial customer measurement',()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const p=projectRuntime(m,f,role,'opaque-request');assert.deepEqual(p.trusted,c.runtime.trusted);
  assert.equal(hardPrecheck(p.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,p)))<=m.bounds.totalBytes);
 }
 const partial=a3.cases.find(c=>c.evaluator.caseId==='r12-pants-known-waist');
 assert.ok(partial.runtime.history[0].text.includes('74cm'));
 assert.ok(!partial.runtime.trusted.protectedClaims.some(c=>c.type==='SIZE_FIT'));
 const correction=a3.cases.find(c=>c.evaluator.caseId==='r12-change-color-only');
 assert.deepEqual(correction.runtime.trusted,read(11,'corpus-a3.json').cases.find(c=>c.evaluator.caseId==='r5-white-opacity').runtime.trusted);
});

test('Round12 captured provider requests exclude evaluator labels and verify every surviving final text',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND12_EVALUATOR_PRIVATE';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];
 const outcome=await evaluateA3Attempt(m,c,async(role,request)=>{
  captured.push(request);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em cảm ơn chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(outcome.terminal.disposition,'SEND_ELIGIBLE');
 for(const request of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric','referenceReplies','anchorA3Hash','quoteAdmissions'])assert.ok(!JSON.stringify(request).includes(label),label);
});
