import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {prepareSizeInputContext} from './size-input-context.mjs';
import {makeBinding,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(r,f)=>JSON.parse(readFileSync(new URL('./round-'+r+'/'+f,import.meta.url)));
const m=read(25,'manifest.json'),a2=read(25,'corpus-a2.json'),a3=read(25,'corpus-a3.json'),prior=read(24,'manifest.json');
test('fixed25 protocol retains all108 A2 and exact42 histories/evaluators/facts; only summary representation changes',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'25'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:69,a2Safe:39,a3:42});
 assert.deepEqual(a2,read(24,'corpus-a2.json'));
 for(const k of ['models','bounds','fallbacks','terminal','stateAllowlist','verdictSchema','usability','repetitions'])assert.deepEqual(m[k],prior[k]);
 assert.equal(m.prompts.verifier,prior.prompts.verifier);
 const s=structuredClone(m.scoring);for(const k of ['reviewProcedureFile','reviewProcedureHash','reviewLimitations'])s[k]=prior.scoring[k];assert.deepEqual(s,prior.scoring);
 const normalized=structuredClone(a3);
 for(const c of normalized.cases)for(const p of c.runtime.trusted.productProfiles){const summary=JSON.parse(p.details.sizeChart.shift().slice('CodeSizeInput: '.length));delete summary.status;p.details.sizeChart.push('CodeSizeInput: '+JSON.stringify(summary));p.contentHash=hash(JSON.stringify(p.details));}
 assert.deepEqual(normalized,read(24,'corpus-a3.json'));
 let count=0;for(const admission of read(25,'size-inputs.json').contextAdmissions){const c=a3.cases.find(c=>c.evaluator.caseId===admission.caseId),prepared=c.runtime.trusted.productProfiles.find(p=>p.subjectRef===admission.subjectRef),base=structuredClone(prepared);base.details.sizeChart.shift();base.contentHash=hash(JSON.stringify(base.details));assert.deepEqual(prepareSizeInputContext(base,admission.input,{includeDecision:true}).profile,prepared);count++;}assert.equal(count,61);
});
test('changed evaluator or invented summary/fact is rejected; changed current status invalidates old PASS',()=>{
 for(const mutate of [c=>{c.cases[0].evaluator.adequateResolution='changed';},c=>{const p=c.cases[0].runtime.trusted.productProfiles[0];p.details.sizeChart[0]=p.details.sizeChart[0].replace('RECOMMENDED','NEEDS_MEASUREMENTS');p.contentHash=hash(JSON.stringify(p.details));}]){const c=structuredClone(a3),mc=structuredClone(m);mutate(c);mc.corpusHashes.a3=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(mc,a2,c),/ROUND25_RETAINED/);}
 const c=structuredClone(a3.cases[0]);c.runtime.finalDraft='Dạ chị.';const t=projectRuntime(m,c,'verifier','opaque-local-binding').trusted,binding=makeBinding('opaque-local-binding',c.runtime.finalDraft,t),response={kind:'VERDICT',result:{verdict:'PASS',violations:[]},binding};
 assert.equal(finalGate({expected:binding,response,current:t,finalDraft:c.runtime.finalDraft,now:new Date(c.runtime.evaluationAt)}).disposition,'SEND_ELIGIBLE');
 const changed=structuredClone(t),p=changed.productProfiles[0];p.details.sizeChart[0]=p.details.sizeChart[0].replace('RECOMMENDED','NEEDS_MEASUREMENTS');p.contentHash=hash(JSON.stringify(p.details));
 assert.equal(finalGate({expected:binding,response,current:changed,finalDraft:c.runtime.finalDraft,now:new Date(c.runtime.evaluationAt)}).reason,'STALE');
});
test('captured status-context requests omit evaluator/admission labels and still mandate verifier',async()=>{
 const marker='ROUND25_EVALUATOR_ONLY';for(const original of a3.cases){const c=structuredClone(original);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.sizeInputAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);for(const role of ['conversation','verifier'])assert.ok(!JSON.stringify(buildRequest(m,role,projectRuntime(m,c,role,'opaque-local-id'))).includes(marker));}
 const c=structuredClone(a3.cases[36]),captured=[];for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 const result=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push(body);return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};});
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');for(const body of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','contextAdmissions'])assert.ok(!JSON.stringify(body).includes(label),label);
});
