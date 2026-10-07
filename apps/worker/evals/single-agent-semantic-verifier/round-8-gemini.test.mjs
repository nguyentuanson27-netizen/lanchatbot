import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,validateProtocol,hash} from './protocol.mjs';
import {registerA2Attempts} from './run-a2.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(folder,name)=>JSON.parse(readFileSync(new URL('./'+folder+'/'+name,import.meta.url)));
const m=read('round-8-gemini','manifest.json'),a2=read('round-8-gemini','corpus-a2.json'),a3=read('round-8-gemini','corpus-a3.json');

test('Gemini comparison preserves exact Round8 inputs/prompts/review/bars; only owner provider changes',()=>{
 const old=read('round-8','manifest.json');
 for(const file of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','reference-replies.json','size-inputs.json','quote-inputs.json'])
  assert.equal(hash(readFileSync(new URL('./round-8/'+file,import.meta.url))),hash(readFileSync(new URL('./round-8-gemini/'+file,import.meta.url))));
 for(const field of ['prompts','promptHashes','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','usability','repetitions'])
  assert.deepEqual(m[field],old[field]);
 for(const field of ['dimensions','scale','minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds','reviewProcedureHash'])
  assert.deepEqual(m.scoring[field],old.scoring[field]);
 assert.deepEqual(m.models.verifier,old.models.verifier);
 assert.equal(m.models.conversation.model,'gemini-3.5-flash-lite');
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:48,a2Safe:18,a3:24});
 assert.equal(registerA2Attempts(m,a2).length,66);
 const script=fileURLToPath(new URL('./protocol.mjs',import.meta.url));
 assert.match(execFileSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'8-gemini'}}),/FROZEN_PROTOCOL_VALID/);
 for(const change of [v=>v.models.verifier.provider='VERTEX_AI',v=>v.models.conversation.model='gemini-3.5-flash',v=>v.models.conversation.generationConfig.retry=1,v=>v.models.conversation.generationConfig.thinkingLevel='MINIMAL']){
  const bad=structuredClone(m);change(bad);assert.throws(()=>validateProtocol(bad,a2,a3));
 }
});

test('Gemini captured final-text owner and mandatory Codex verifier exclude evaluator context',async()=>{
 const c=structuredClone(a3.cases.at(-1)),marker='GEMINI_EVALUATOR_ONLY_SENTINEL';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];
 const outcome=await evaluateA3Attempt(m,c,async(role,request)=>{
  captured.push({role,request});return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em cảm ơn chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(outcome.terminal.disposition,'SEND_ELIGIBLE');
 assert.deepEqual(captured.map(x=>x.role),['conversation','verifier']);
 assert.equal(captured[0].request.systemInstruction.parts[0].text,m.prompts.conversation);
 assert.equal(captured[0].request.generationConfig.thinkingConfig.thinkingLevel,'HIGH');
 assert.equal(captured[1].request.model,'gpt-6.1-sol');
 for(const {request} of captured){
  const text=JSON.stringify(request);
  for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','qualityTags','rubric','referenceReplies','consultationCaseIds','reviewProcedureFile'])assert.ok(!text.includes(label),label);
  for(const ref of read('round-8','reference-replies.json').references)assert.ok(!text.includes(ref.text));
 }
});
test('Gemini owner receives full unchanged trusted sizing/policy/context within frozen byte bound',()=>{
 for(const c of a3.cases){
  const p=projectRuntime(m,c,'conversation','opaque');
  assert.deepEqual(p.trusted.productProfiles,c.runtime.trusted.productProfiles);
  assert.deepEqual(p.trusted.state,c.runtime.trusted.state);
  assert.deepEqual(p.trusted.policyLiterals,c.runtime.trusted.policyLiterals);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,'conversation',p)))<=m.bounds.totalBytes);
 }
});

