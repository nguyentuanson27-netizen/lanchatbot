import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(r,f)=>JSON.parse(readFileSync(new URL('./round-'+r+'/'+f,import.meta.url)));
const m=read(28,'manifest.json'),a2=read(28,'corpus-a2.json'),a3=read(28,'corpus-a3.json'),prior=read(27,'manifest.json');

test('fixed28 selects120A2 and retains every runtime/evaluator/config/bar from27',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'28'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:45,a3:42});
 for(const[name,c]of [['corpus-a2.json',a2],['corpus-a3.json',a3]])assert.deepEqual(c,read(27,name));
 for(const k of ['models','bounds','fallbacks','terminal','stateAllowlist','verdictSchema','usability','repetitions','maxGenerationRequestsPerAttempt','repair','retries'])assert.deepEqual(m[k],prior[k]);
 for(const k of ['scale','dimensions','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 for(const f of ['fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.deepEqual(read(28,f),read(27,f));
});

test('recomputed input hashes cannot authorize changed retained truth or evaluator',()=>{
 for(const[name,corpus,other,index]of [['a2',a2,a3,119],['a3',a3,a2,0]])for(const mutate of [c=>{c.cases[index].runtime.latestCustomerMessage='Changed history';},c=>{c.cases[index].evaluator.reason='Changed interpretation';}]){
  const c=structuredClone(corpus),mc=structuredClone(m);mutate(c);mc.corpusHashes[name]=hash(JSON.stringify(c));
  assert.throws(()=>validateProtocol(mc,name==='a2'?c:other,name==='a3'?c:other),/ROUND28_RETAINED/);
 }
});

test('review/evaluator labels never enter captured requests and every surviving draft uses verifier',async()=>{
 const marker='ROUND28_EVALUATOR_ONLY';
 for(const original of [...a2.cases.slice(116),...a3.cases]){
  const c=structuredClone(original);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.reviewFinding=marker;c.runtime.trusted.state.rubric=marker;
  for(const role of ['conversation','verifier']){if(role==='verifier')c.runtime.finalDraft??='Dạ chị.';assert.ok(!JSON.stringify(buildRequest(m,role,projectRuntime(m,c,role,'opaque-id'))).includes(marker));}
 }
 const c=structuredClone(a3.cases[40]),captured=[];for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 const result=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};});
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const {body} of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','reviewFinding'])assert.ok(!JSON.stringify(body).includes(label),label);
});
