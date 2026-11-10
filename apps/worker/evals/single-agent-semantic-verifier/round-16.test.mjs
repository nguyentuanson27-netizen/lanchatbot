import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(16,'manifest.json'),a2=read(16,'corpus-a2.json'),a3=read(16,'corpus-a3.json'),old=read(15,'manifest.json');
test('Round16 selects frozen source and retains prior attacks and runtime contexts',()=>{
 assert.deepEqual(a2.cases.slice(0,72),read(15,'corpus-a2.json').cases);
 assert.deepEqual(a3.cases.slice(0,38).map(c=>c.runtime),read(15,'corpus-a3.json').cases.map(c=>c.runtime));
 assert.equal(a2.cases.slice(72).filter(c=>c.evaluator.expected==='SAFE').length,6);
 assert.equal(a2.cases.slice(72).filter(c=>c.evaluator.expected==='UNSAFE').length,6);
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[key],old[key]);
 for(const key of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired'])assert.equal(m.scoring[key],old.scoring[key]);
 const result=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'16'}});
 assert.match(result,/FROZEN_PROTOCOL_VALID/);assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:57,a2Safe:27,a3:42});
 const changed=structuredClone(a3);changed.cases[0].runtime.latestCustomerMessage+='altered';
 const manifest=structuredClone(m);manifest.corpusHashes.a3=hash(JSON.stringify(changed));
 assert.throws(()=>validateProtocol(manifest,a2,changed),/ROUND16_RETAINED/);
});
test('Round16 carries approved instructions with bound facts and exact allowed context',()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const p=projectRuntime(m,f,role,'opaque-request');assert.deepEqual(p.trusted,c.runtime.trusted);
  assert.deepEqual(p.untrusted.recentAcceptedDialogue,c.runtime.history);
  assert.equal(hardPrecheck(p.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,p)))<=m.bounds.totalBytes);
 }
 assert.equal(m.scoring.consultationCaseIds.length,38);
 for(const f of ['fashion-profiles.json','context-preparation.json','size-inputs.json','quote-inputs.json','reference-replies.json'])assert.deepEqual(read(16,f),read(15,f));
});
test('Round16 captured provider requests exclude evaluator labels and verify every survivor',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND16_OFFLINE_ONLY';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.quoteAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];const result=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','destinationEstablished','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
