import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(r,f)=>JSON.parse(readFileSync(new URL('./round-'+r+'/'+f,import.meta.url)));
const m=read(31,'manifest.json'),a2=read(31,'corpus-a2.json'),a3=read(31,'corpus-a3.json'),control=read(30,'manifest.json');
test('fixed31 admits only the frozen existing29 owner prompt with exact30 readable inputs',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'31'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:75,a2Safe:45,a3:42});
 assert.equal(m.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-round29.vi.txt',import.meta.url),'utf8'));
 assert.equal(m.prompts.verifier,control.prompts.verifier);
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','reference-replies.json','context-preparation.json'])assert.equal(readFileSync(new URL('./round-31/'+f,import.meta.url),'utf8'),readFileSync(new URL('./round-30/'+f,import.meta.url),'utf8'));
 for(const key of ['models','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','repetitions','retries','repair','maxGenerationRequestsPerAttempt','unsafeRule','usability','scoring','measurements','conversationContextFormat'])assert.deepEqual(m[key],control[key]);
});
test('rehashing inputs,another prompt or changed bars cannot expand the registered31 treatment',()=>{
 for(const [name,corpus,other,index] of [['a2',a2,a3,119],['a3',a3,a2,0]]){
  const c=structuredClone(corpus),v=structuredClone(m);c.cases[index].evaluator.reason='Unregistered relabel';v.corpusHashes[name]=hash(JSON.stringify(c));
  assert.throws(()=>validateProtocol(v,name==='a2'?c:other,name==='a3'?c:other),/ROUND31_RETAINED/);
 }
 for(const mutate of [v=>{v.prompts.verifier+=' Other verdict rule';v.promptHashes.verifier=hash(v.prompts.verifier);},v=>{v.usability.maximumTerminalFailureRate=.15;},v=>{v.scoring.naturalnessRequired=1;},v=>{v.bounds.totalBytes+=1;},v=>{v.fallbacks[0].text='Dạ chị.';v.fallbacks[0].hash=hash(v.fallbacks[0].text);}]){const v=structuredClone(m);mutate(v);assert.throws(()=>validateProtocol(v,a2,a3),/ROUND31_CONTROL_CONFIGURATION|CONSULTATION_BAR/);}
 const v=structuredClone(m);v.prompts.conversation+=' Another owner treatment';v.promptHashes.conversation=hash(v.prompts.conversation);assert.throws(()=>validateProtocol(v,a2,a3),/ROUND31_OWNER_PROMPT/);
});
test('all42 captured31 requests exclude evaluator labels and require verifier even for nonprotected drafts',async()=>{
 const marker='ROUND31_EVALUATOR_ONLY';
 for(const original of a3.cases){
  const fixture=structuredClone(original),captured=[];
  for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;
  fixture.reviewFinding=marker;fixture.runtime.trusted.state.rubric=marker;
  const attempt=await evaluateA3Attempt(m,fixture,async(role,body)=>{captured.push({role,body});return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"UNCERTAIN","violations":[]}'};});
  assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);assert.equal(attempt.terminal.disposition,'FALLBACK');
  assert.equal(hash(captured[0].body.systemInstruction.parts[0].text),m.promptHashes.conversation);
  assert.match(captured[0].body.contents[0].parts[0].text,/^# Context tư vấn — READABLE_FACTS_V1/);
  assert.equal(hash(captured[1].body.instructions),control.promptHashes.verifier);
  for(const {body} of captured)for(const label of [marker,'caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','reviewFinding'])assert.ok(!JSON.stringify(body).includes(label),label);
 }
});
