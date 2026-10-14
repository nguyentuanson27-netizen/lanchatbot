import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {makeBinding,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(r,f)=>JSON.parse(readFileSync(new URL('./round-'+r+'/'+f,import.meta.url)));
const m=read(24,'manifest.json'),a2=read(24,'corpus-a2.json'),a3=read(24,'corpus-a3.json'),prior=read(23,'manifest.json');

test('Round24 selects fixed108/42 inputs; owner prompt treatment retains verifier, data and bars',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'24'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:69,a2Safe:39,a3:42});
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json'])assert.deepEqual(readFileSync(new URL('./round-24/'+f,import.meta.url)),readFileSync(new URL('./round-23/'+f,import.meta.url)));
 for(const key of ['models','bounds','fallbacks','terminal','stateAllowlist','verdictSchema','usability','repetitions'])assert.deepEqual(m[key],prior[key]);
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 const scoring=structuredClone(m.scoring);for(const key of ['reviewProcedureFile','reviewProcedureHash','reviewLimitations'])scoring[key]=prior.scoring[key];assert.deepEqual(scoring,prior.scoring);
 assert.notEqual(m.promptHashes.conversation,prior.promptHashes.conversation);
});

test('Round24 rejects changed retained evaluator, customer history or prepared size context',()=>{
 for(const mutate of [c=>c.cases[0].evaluator.adequateResolution='easy',c=>c.cases[0].runtime.history[0].text='changed',c=>{const p=c.cases[0].runtime.trusted.productProfiles[0];p.details.sizeChart[p.details.sizeChart.length-1]='CodeSizeInput: changed';p.contentHash=hash(JSON.stringify(p.details));}]){
  const c=structuredClone(a3),mc=structuredClone(m);mutate(c);mc.corpusHashes.a3=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(mc,a2,c),/ROUND24_RETAINED/);
 }
 const c=structuredClone(a3.cases[0]);c.runtime.finalDraft='Dạ chị.';const t=projectRuntime(m,c,'verifier','opaque-local-binding').trusted,now=new Date(c.runtime.evaluationAt);
 const binding=makeBinding('opaque-local-binding',c.runtime.finalDraft,t),response={kind:'VERDICT',result:{verdict:'PASS',violations:[]},binding};
 assert.equal(finalGate({expected:binding,response,current:t,finalDraft:c.runtime.finalDraft,now}).disposition,'SEND_ELIGIBLE');
 const changed=structuredClone(t),p=changed.productProfiles[0];p.details.sizeChart[p.details.sizeChart.length-1]='CodeSizeInput: changed';p.contentHash=hash(JSON.stringify(p.details));
 assert.equal(finalGate({expected:binding,response,current:changed,finalDraft:c.runtime.finalDraft,now}).reason,'STALE');
});

test('Round24 captured requests exclude evaluator/admission labels; every surviving final draft gets verifier and gate',async()=>{
 const marker='ROUND24_EVALUATOR_ONLY';
 for(const original of a3.cases){const c=structuredClone(original);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.sizeInputAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  for(const role of ['conversation','verifier'])assert.ok(!JSON.stringify(buildRequest(m,role,projectRuntime(m,c,role,'opaque-local-id'))).includes(marker));
 }
 const c=structuredClone(a3.cases[5]);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;const captured=[];
 const result=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push(body);return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};});
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','contextAdmissions'])assert.ok(!JSON.stringify(body).includes(label),label);
});
