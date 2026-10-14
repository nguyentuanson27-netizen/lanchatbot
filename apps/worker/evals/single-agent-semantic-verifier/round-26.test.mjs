import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(r,f)=>JSON.parse(readFileSync(new URL('./round-'+r+'/'+f,import.meta.url)));
const m=read(26,'manifest.json'),a2=read(26,'corpus-a2.json'),a3=read(26,'corpus-a3.json'),prior=read(25,'manifest.json');

test('fixed26 selects frozen116 A2, retains108 labels/runtime and all42 A3 runtime with only two evaluator clarifications',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'26'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:73,a2Safe:43,a3:42});
 assert.deepEqual({schemaVersion:1,cases:a2.cases.slice(0,108)},read(25,'corpus-a2.json'));
 const old=read(25,'corpus-a3.json');assert.deepEqual(a3.cases.map(c=>c.runtime),old.cases.map(c=>c.runtime));
 const changed=a3.cases.filter((c,i)=>JSON.stringify(c.evaluator)!==JSON.stringify(old.cases[i].evaluator)).map(c=>c.evaluator.caseId);
 assert.deepEqual(changed,['r16-effort-and-use','r16-budget-alternative']);
 for(const k of ['models','bounds','fallbacks','terminal','stateAllowlist','verdictSchema','usability','repetitions','maxGenerationRequestsPerAttempt','repair','retries'])assert.deepEqual(m[k],prior[k]);
 for(const k of ['scale','dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 for(const name of ['fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.deepEqual(read(26,name),read(25,name));
});

test('recomputed corpus hashes cannot authorize changed retained truth, an unrelated evaluator change or a relabelled new contrast',()=>{
 for(const mutate of [c=>{c.cases[0].runtime.latestCustomerMessage='Changed customer history';},c=>{c.cases[0].evaluator.adequateResolution='Changed interpretation';}]){
  const c=structuredClone(a3),mc=structuredClone(m);mutate(c);mc.corpusHashes.a3=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(mc,a2,c),/ROUND26_RETAINED/);
 }
 const c=structuredClone(a2),mc=structuredClone(m);c.cases[109].evaluator.reason='Changed safety contract';mc.corpusHashes.a2=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(mc,c,a3),/ROUND26_RETAINED/);
});

test('new semantic controls and whole-turn evaluator data never enter captured requests; surviving A3 draft still mandates verifier',async()=>{
 const marker='ROUND26_EVALUATOR_ONLY';
 for(const original of [...a2.cases.slice(108),...a3.cases]){
  const c=structuredClone(original);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.reviewFinding=marker;c.contextAdmissions=marker;c.runtime.trusted.state.rubric=marker;
  for(const role of ['conversation','verifier']){if(role==='verifier')c.runtime.finalDraft??='Dạ chị.';assert.ok(!JSON.stringify(buildRequest(m,role,projectRuntime(m,c,role,'opaque-local-id'))).includes(marker));}
 }
 const c=structuredClone(a3.cases[40]),captured=[];for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 const result=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};});
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const {body} of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','reviewFinding','contextAdmissions'])assert.ok(!JSON.stringify(body).includes(label),label);
});
