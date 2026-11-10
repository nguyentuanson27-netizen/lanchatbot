import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const raw=(r,f)=>readFileSync(new URL('./round-'+r+'/'+f,import.meta.url),'utf8');
const read=(r,f)=>JSON.parse(raw(r,f)),m=read(32,'manifest.json'),a2=read(32,'corpus-a2.json'),a3=read(32,'corpus-a3.json'),control=read(31,'manifest.json');
const textOf=r=>r.contents?.[0].parts[0].text??r.input[0].content[0].text;
const dataRows=s=>s.split('\n').filter(v=>!v.startsWith('#')&&v.includes(': ')).map(v=>JSON.parse(v.slice(v.indexOf(': ')+2)));
test('fixed32 admits exact122 safety controls and42 unchanged consultations with frozen bars',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'32'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:47,a3:42});
 assert.deepEqual(a2.cases.slice(0,120),read(31,'corpus-a2.json').cases);
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json'])assert.equal(raw(32,f),raw(31,f));
 for(const k of ['models','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','repetitions','retries','repair','maxGenerationRequestsPerAttempt','unsafeRule','usability','scoring','measurements'])assert.deepEqual(m[k],control[k]);
 const prior=read(31,'a3-evidence.json').attempts;
 for(const [i,id] of [[120,'r5-competitor-price'],[121,'r7-price-ready-fit']]){assert.equal(a2.cases[i].evaluator.expected,'SAFE');assert.deepEqual(a2.cases[i].runtime,{...a3.cases.find(c=>c.evaluator.caseId===id).runtime,finalDraft:prior.find(a=>a.caseId===id).finalDraft});}
});
test('rehashing labels,inputs or bars cannot expand fixed32 treatment',()=>{
 for(const index of [0,119,120]){const c=structuredClone(a2),v=structuredClone(m);c.cases[index].evaluator.reason='Unregistered relabel';v.corpusHashes.a2=hash(JSON.stringify(c));assert.throws(()=>validateProtocol(v,c,a3),/ROUND32_POPULATION|ROUND32_RETAINED/);}
 for(const change of [v=>{v.scoring.naturalnessRequired=1;},v=>{v.usability.maximumTerminalFailureRate=.15;},v=>{v.bounds.totalBytes++;},v=>{v.terminal.FAIL='HANDOFF';}]){const v=structuredClone(m);change(v);assert.throws(()=>validateProtocol(v,a2,a3),/CONSULTATION_BAR|TERMINAL_MAP|ROUND32_CONTROL_CONFIGURATION/);}
 for(const role of ['conversation','verifier']){const v=structuredClone(m);v.prompts[role]+=' Another treatment';v.promptHashes[role]=hash(v.prompts[role]);assert.throws(()=>validateProtocol(v,a2,a3),/ROUND32_PROMPTS/);}
});
test('V2 price labels preserve all42 JSON data,bindings and unchanged verifier serialization',()=>{
 for(const fixture of a3.cases){
  const p=projectRuntime(m,fixture,'conversation','opaque-retention-id'),before=structuredClone(p);
  const v1=buildRequest(control,'conversation',p),v2=buildRequest(m,'conversation',p);
  assert.match(textOf(v2),/^# Context tư vấn — READABLE_FACTS_V2/);assert.deepEqual(dataRows(textOf(v2)),dataRows(textOf(v1)));assert.deepEqual(p,before);
  const rv=projectRuntime(m,{runtime:{...fixture.runtime,finalDraft:'Dạ chị.'}},'verifier','opaque-verifier-id');
  assert.equal(textOf(buildRequest(m,'verifier',rv)),textOf(buildRequest(control,'verifier',rv)));
 }
 const render=id=>textOf(buildRequest(m,'conversation',projectRuntime(m,a3.cases.find(c=>c.evaluator.caseId===id),'conversation','opaque-price-id')));
 assert.match(render('r5-correct-measurement'),/Giá món \(không phải tổng thanh toán\):/);assert.ok(!render('r5-correct-measurement').includes('Tổng thanh toán theo báo giá:'));
 assert.match(render('r5-size-price-stock'),/Tổng thanh toán theo báo giá:/);
});
test('all42 captured V2 attempts exclude evaluator labels and always call verifier,retaining requestId',async()=>{
 const marker='ROUND32_EVALUATOR_ONLY';
 for(const original of a3.cases){const c=structuredClone(original),captured=[];for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;c.reviewFinding=marker;c.runtime.trusted.state.rubric=marker;
  const a=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);assert.equal(a.terminal.disposition,'FALLBACK');
  assert.equal(a.conversationRequestId,JSON.parse(textOf(captured[0].body).match(/^Identity: (.+)$/m)[1]).requestId);
  for(const{role,body}of captured){assert.equal(hash(role==='conversation'?body.systemInstruction.parts[0].text:body.instructions),m.promptHashes[role]);for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','reviewFinding'])assert.ok(!JSON.stringify(body).includes(label),label);}
 }
});
