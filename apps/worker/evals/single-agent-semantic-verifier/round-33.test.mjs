import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';import {evaluateA3Attempt} from './run-a3.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8'),read=(r,f)=>JSON.parse(raw(r,f));
const m=read(33,'manifest.json'),a2=read(33,'corpus-a2.json'),a3=read(33,'corpus-a3.json'),control=read(32,'manifest.json');
const metadata=['round','specSha','previousRoundSourceSha','reviewedPromptSourceSha','roundAuthorization','roundChangePolicy'];
test('fixed33 admits a fresh exact32 rerun without adopting prior observations',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'33'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','reference-replies.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.equal(raw(33,f),raw(32,f));
 for(const [key,value]of Object.entries(control))if(!metadata.includes(key))assert.deepEqual(m[key],value,key);
 assert.equal(m.ownerAmendment,undefined);assert.equal(m.repetitions,1);assert.equal(m.retries,0);
});
test('rehashing a new treatment cannot authorize this exact rerun',()=>{
 for(const index of [0,120,121]){const c=structuredClone(a2),v=structuredClone(m);c.cases[index].evaluator.reason='Unregistered treatment';v.corpusHashes.a2=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(v,c,a3),/ROUND33_POPULATION|ROUND33_CONTROL/);}
 for(const change of [v=>{v.bounds.totalBytes++;},v=>{v.usability.maximumTerminalFailureRate=.15;},v=>{v.ownerAmendment={};},v=>{v.prompts.verifier+=' Another instruction';v.promptHashes.verifier=hash(v.prompts.verifier);}]){const v=structuredClone(m);change(v);assert.throws(()=>validateProtocol(v,a2,a3),/ROUND33_CONTROL/);}
});
test('all42 fresh requests equal32 runtime bodies and exclude evaluator labels;verifier mandatory',async()=>{
 const marker='ROUND33_EVALUATOR_ONLY';
 for(const original of a3.cases){
  for(const role of ['conversation','verifier']){const c=role==='conversation'?original:{runtime:{...original.runtime,finalDraft:'Dạ chị.'}};assert.deepEqual(buildRequest(m,role,projectRuntime(m,c,role,'opaque-equal-request')),buildRequest(control,role,projectRuntime(control,c,role,'opaque-equal-request')));}
  const c=structuredClone(original),captured=[];for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.runtime.trusted.state.rubric=marker;c.reviewFinding=marker;
  const attempt=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);assert.equal(attempt.terminal.disposition,'FALLBACK');assert.ok(attempt.conversationRequestId);
  for(const{body}of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','reviewFinding'])assert.ok(!JSON.stringify(body).includes(label),label);
 }
});
