import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
const read=(round,file)=>JSON.parse(readFileSync(new URL('./round-'+round+'/'+file,import.meta.url)));
const m=read(14,'manifest.json'),a2=read(14,'corpus-a2.json'),a3=read(14,'corpus-a3.json'),old=read(13,'manifest.json');

test('Round14 retains every attack and anchor while registering the six new development continuations before results',()=>{
 assert.deepEqual(a2,read(13,'corpus-a2.json'));assert.deepEqual(a3.cases.slice(0,28),read(13,'corpus-a3.json').cases);
 assert.deepEqual(a3.cases.slice(28).map(c=>c.evaluator.family),['concern','concern','partial','correction','policy','policy']);
 assert.ok(a3.cases.slice(28).every(c=>c.evaluator.split==='DEVELOPMENT_NEW'));
 for(const key of ['models','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','usability','repetitions','profileFileHash','referenceFileHash','sizeInputsFileHash','quoteInputsFileHash'])assert.deepEqual(m[key],old[key]);
 for(const key of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired'])assert.deepEqual(m.scoring[key],old.scoring[key]);
 assert.equal(m.promptHashes.verifier,old.promptHashes.verifier);assert.notEqual(m.promptHashes.conversation,old.promptHashes.conversation);
 assert.equal(hash(readFileSync(new URL('../../../../'+m.scoring.reviewProcedureFile,import.meta.url))),m.scoring.reviewProcedureHash);
 const output=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'14'}});
 assert.match(output,/FROZEN_PROTOCOL_VALID/);assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:51,a2Safe:21,a3:34});
 const damaged=structuredClone(a3);damaged.cases[25].runtime.latestCustomerMessage+='changed';
 const changed=structuredClone(m);changed.corpusHashes.a3=hash(JSON.stringify(damaged));
 assert.throws(()=>validateProtocol(changed,a2,damaged),/ROUND14_RETAINED/);
});

test('Round14 carries the same authority/fit bindings to both models under maximum final-draft bounds',()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const projection=projectRuntime(m,f,role,'opaque-request');assert.deepEqual(projection.trusted,c.runtime.trusted);
  assert.deepEqual(projection.untrusted.recentAcceptedDialogue,c.runtime.history);assert.equal(projection.untrusted.latestCustomerMessage,c.runtime.latestCustomerMessage);
  assert.equal(hardPrecheck(projection.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,projection)))<=m.bounds.totalBytes);
 }
 assert.ok(!a3.cases.find(c=>c.evaluator.caseId==='r12-pants-known-waist').runtime.trusted.protectedClaims.some(c=>c.type==='SIZE_FIT'));
 assert.equal(m.scoring.consultationCaseIds.length,30);
});

test('Round14 captured requests omit evaluator-only judgments and every surviving draft invokes the verifier',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND14_OFFLINE_REVIEW_ONLY';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];
 const outcome=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em cảm ơn chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(outcome.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric','referenceReplies','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
