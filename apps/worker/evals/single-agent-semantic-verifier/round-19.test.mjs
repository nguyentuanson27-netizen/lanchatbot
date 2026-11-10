import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(19,'manifest.json'),a2=read(19,'corpus-a2.json'),a3=read(19,'corpus-a3.json'),prior=read(18,'manifest.json');

test('Round19 selects its own frozen population and rejects changed runtime even with a new corpus hash',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'19'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:57,a2Safe:27,a3:42});
 const changed=structuredClone(a3);changed.cases[0].runtime.latestCustomerMessage+='altered';
 const manifest=structuredClone(m);manifest.corpusHashes.a3=hash(JSON.stringify(changed));
 manifest.cohorts.anchorA3RuntimeHash=hash(JSON.stringify(changed.cases.map(c=>c.runtime)));
 assert.throws(()=>validateProtocol(manifest,a2,changed),/ROUND19_RETAINED/);
});

test('Round19 preserves generation, safety and numeric bars while revising only two offline sales contracts',()=>{
 assert.deepEqual(a2,read(18,'corpus-a2.json'));
 for(const k of ['models','prompts','promptHashes','bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[k],prior[k]);
 for(const k of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 const old=read(18,'corpus-a3.json').cases;
 for(let i=0;i<a3.cases.length;i++){
  assert.deepEqual(a3.cases[i].runtime,old[i].runtime);
  if(m.cohorts.revisedEvaluatorCaseIds.includes(a3.cases[i].evaluator.caseId))assert.notDeepEqual(a3.cases[i].evaluator,old[i].evaluator);
  else assert.deepEqual(a3.cases[i].evaluator,old[i].evaluator);
 }
 const changed=structuredClone(a3);changed.cases[0].evaluator.buyerGoal='silently changed';
 const manifest=structuredClone(m);manifest.corpusHashes.a3=hash(JSON.stringify(changed));
 assert.throws(()=>validateProtocol(manifest,a2,changed),/ROUND19_RETAINED/);
});

test('Round19 evaluator correction cannot change model bodies and injected offline labels never reach captured providers',async()=>{
 const old=read(18,'corpus-a3.json').cases;
 for(let i=0;i<a3.cases.length;i++)for(const role of ['conversation','verifier']){
  const c=structuredClone(a3.cases[i]),p=structuredClone(old[i]);c.runtime.finalDraft=p.runtime.finalDraft='Dạ chị.';
  assert.deepEqual(buildRequest(m,role,projectRuntime(m,c,role,'opaque')),buildRequest(prior,role,projectRuntime(prior,p,role,'opaque')));
 }
 const c=structuredClone(a3.cases.find(c=>c.evaluator.caseId==='r5-shipping-threshold')),marker='ROUND19_OFFLINE_ONLY';
 for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 c.quoteAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];const result=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
