import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {prepareSizeInputContext} from './size-input-context.mjs';
import {hardPrecheck,makeBinding,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(r,f)=>JSON.parse(readFileSync(new URL('./round-'+r+'/'+f,import.meta.url)));
const m=read(23,'manifest.json'),a2=read(23,'corpus-a2.json'),a3=read(23,'corpus-a3.json'),prior=read(22,'manifest.json');

test('Round23 selects fixed108/42 inputs, retains attacks/history/evaluators and rejects relabeling',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'23'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:69,a2Safe:39,a3:42});
 assert.deepEqual(a2,read(22,'corpus-a2.json'));
 for(const key of ['models','bounds','fallbacks','terminal','stateAllowlist','verdictSchema','usability','repetitions'])assert.deepEqual(m[key],prior[key]);
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 const changed=structuredClone(a3),mc=structuredClone(m);changed.cases[0].evaluator.adequateResolution='easy';mc.corpusHashes.a3=hash(JSON.stringify(changed));
 assert.throws(()=>validateProtocol(mc,a2,changed),/ROUND23_RETAINED/);
});

test('all61 code sizing admissions match engine, fit/policy identity retained; changing hint invalidates oldPASS binding',()=>{
 const admissions=read(23,'size-inputs.json').contextAdmissions;assert.equal(admissions.length,61);
 const old=read(22,'corpus-a3.json');
 for(let i=0;i<a3.cases.length;i++){
  const c=a3.cases[i];assert.deepEqual(c.evaluator,old.cases[i].evaluator);
  assert.deepEqual(c.runtime.history,old.cases[i].runtime.history);
  const restored=structuredClone(c);restored.runtime.trusted.productProfiles=structuredClone(old.cases[i].runtime.trusted.productProfiles);
  assert.deepEqual(restored,old.cases[i]);
  for(const p of c.runtime.trusted.productProfiles){const rec=admissions.find(v=>v.caseId===c.evaluator.caseId&&v.subjectRef===p.subjectRef),op=old.cases[i].runtime.trusted.productProfiles.find(v=>v.subjectRef===p.subjectRef);assert.deepEqual(prepareSizeInputContext(op,rec.input),{profile:p,summary:rec.summary});}
  const r=structuredClone(c);r.runtime.finalDraft='Dạ chị.';
  const t=projectRuntime(m,r,'verifier','local-sizing-binding').trusted,now=new Date(c.runtime.evaluationAt);
  assert.equal(hardPrecheck(t,r.runtime.finalDraft,now),null);
  const binding=makeBinding('local-sizing-binding',r.runtime.finalDraft,t),answer={kind:'VERDICT',result:{verdict:'PASS',violations:[]},binding};
  assert.equal(finalGate({expected:binding,response:answer,current:t,finalDraft:r.runtime.finalDraft,now}).disposition,'SEND_ELIGIBLE');
  const changed=structuredClone(t),p=changed.productProfiles[0];p.details.sizeChart[p.details.sizeChart.length-1]='CodeSizeInput: changed';p.contentHash=hash(JSON.stringify(p.details));
  assert.equal(finalGate({expected:binding,response:answer,current:changed,finalDraft:r.runtime.finalDraft,now}).reason,'STALE');
 }
});

test('captured requests omit evaluator/admission labels and every surviving reply invokes owner+verifier+finalgate',async()=>{
 const marker='ROUND23_EVALUATOR_ONLY';
 for(const original of a3.cases){const c=structuredClone(original);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.sizeInputAdmissions=marker;c.runtime.trusted.state.rubric=marker;
  c.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  for(const role of ['conversation','verifier'])assert.ok(!JSON.stringify(buildRequest(m,role,projectRuntime(m,c,role,'local-opaque-id'))).includes(marker));
 }
 const c=structuredClone(a3.cases[5]);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;const captured=[];
 const result=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push(body);return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};});
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','contextAdmissions'])assert.ok(!JSON.stringify(body).includes(label),label);
});
