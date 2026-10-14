import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(15,'manifest.json'),a2=read(15,'corpus-a2.json'),a3=read(15,'corpus-a3.json'),old=read(14,'manifest.json');
const contract=c=>({evaluator:c.evaluator,history:c.runtime.history,latest:c.runtime.latestCustomerMessage,protectedClaims:c.runtime.trusted.protectedClaims,boundSubjects:c.runtime.trusted.boundSubjects,effectReceipts:c.runtime.trusted.effectReceipts,state:{...c.runtime.trusted.state,factSnapshotVersion:null}});
test('Round15 freezes retained attacks and customer contracts before explicit executable selection',()=>{
 assert.deepEqual(a2,read(14,'corpus-a2.json'));
 assert.deepEqual(a3.cases.slice(0,34).map(contract),read(14,'corpus-a3.json').cases.map(contract));
 assert.deepEqual(a3.cases.slice(34).map(c=>c.evaluator.family),['concern','concern','partial','correction']);
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[key],old[key]);
 for(const key of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired'])assert.equal(m.scoring[key],old.scoring[key]);
 assert.equal(m.promptHashes.verifier,old.promptHashes.verifier);
 const result=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'15'}});
 assert.match(result,/FROZEN_PROTOCOL_VALID/);assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:51,a2Safe:21,a3:38});
 const changed=structuredClone(a3);changed.cases[0].runtime.latestCustomerMessage+='altered';
 const manifest=structuredClone(m);manifest.corpusHashes.a3=hash(JSON.stringify(changed));
 assert.throws(()=>validateProtocol(manifest,a2,changed),/ROUND15_RETAINED/);
});
test('Round15 keeps price stock fit and underlying catalog data while carrying new scope to both roles',()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const p=projectRuntime(m,f,role,'opaque-request');assert.deepEqual(p.trusted,c.runtime.trusted);
  assert.deepEqual(p.untrusted.recentAcceptedDialogue,c.runtime.history);
  assert.equal(hardPrecheck(p.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,p)))<=m.bounds.totalBytes);
 }
 for(const p of read(15,'fashion-profiles.json').profiles){
  const original=read(14,'fashion-profiles.json').profiles.find(v=>v.subjectRef===p.subjectRef);
  for(const key of ['silhouette','material','colors','sizeChart','care'])assert.deepEqual(p.details[key],original.details[key]);
 }
 assert.equal(m.scoring.consultationCaseIds.length,34);
 assert.ok(!a3.cases.find(c=>c.evaluator.caseId==='r15-known-waist-next').runtime.trusted.protectedClaims.some(c=>c.type==='SIZE_FIT'));
});
test('Round15 reconstructed captured requests exclude evaluator and preparation markers and always verify survivors',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND15_OFFLINE_ONLY';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.quoteAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];
 const result=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','destinationEstablished','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
