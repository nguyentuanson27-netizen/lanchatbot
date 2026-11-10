import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,validateA2Evidence} from './run-a2.mjs';
import {scoreWholeReplies,validateA3Evidence} from './run-a3.mjs';
const raw=(n,f)=>readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'),read=(n,f)=>JSON.parse(raw(n,f));
const m=read(45,'manifest.json'),prior=read(44,'manifest.json'),a2=read(45,'corpus-a2.json'),a3=read(45,'corpus-a3.json');

test('fixed45 admits frozen prompt scope and contrasts while preserving existing world and quality contracts',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'45'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:93,a2Safe:62,a3:42});
 assert.deepEqual(a2.cases.slice(0,146),read(44,'corpus-a2.json').cases);
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(45,f),raw(44,f));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerProfilePresentation','conversationContextFormat'])assert.deepEqual(m[k],prior[k]);
 for(const role of ['conversation','verifier']){
  assert.notEqual(m.prompts[role],prior.prompts[role]);assert.ok(m.prompts[role].length<=prior.prompts[role].length);
  const filename=role==='conversation'?'fashion-sales-owner-round45.vi.txt':'semantic-verifier-round45.vi.txt';
  assert.equal(readFileSync(new URL('./prompts/'+filename,import.meta.url),'utf8'),m.prompts[role]);
 }
 for(const k of ['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate','anchors','interpretation'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 const changed=structuredClone(m);changed.prompts.verifier+='unsealed instructions';changed.promptHashes.verifier=hash(changed.prompts.verifier);assert.throws(()=>validateProtocol(changed,a2,a3));
 const altered=structuredClone(a2);altered.cases.at(-1).evaluator.expected='UNSAFE';assert.throws(()=>validateProtocol(m,altered,a3));
});

test('fixed45 registers every repeated contrast and preserves the full terminal outcome denominator',()=>{
 validateProtocol(m,a2,a3);
 const slots=registerA2Attempts(m,a2);assert.equal(slots.length,229);assert.equal(slots.filter(a=>a.expected==='UNSAFE').length,131);assert.equal(slots.filter(a=>a.expected==='SAFE').length,98);
 for(const [id,n]of Object.entries(prior.attemptRepetitions.a2))assert.equal(m.attemptRepetitions.a2[id],n);
 assert.deepEqual(m.attemptRepetitions.a3,prior.attemptRepetitions.a3);
 const observed=read(44,'a3-evidence.json');
 for(const c of a2.cases.slice(146)){
  assert.equal(slots.filter(s=>s.caseId===c.evaluator.caseId).length,3);
  const source=observed.attempts.find(s=>s.attemptId===c.evaluator.sourceAttempt);assert.ok(source);
  assert.deepEqual(c.runtime.trusted,a3.cases.find(s=>s.evaluator.caseId===source.caseId).runtime.trusted);
  if(c.evaluator.sourceIsExactDraft)assert.equal(c.runtime.finalDraft,source.finalDraft);
 }
 assert.equal(a2.cases.slice(146).filter(c=>c.evaluator.expected==='UNSAFE').length,5);
 assert.equal(a2.cases.slice(146).filter(c=>c.evaluator.expected==='SAFE').length,4);
 assert.throws(()=>validateA2Evidence(m,a2,{attempts:slots.slice(0,-1)}),/ATTEMPT_DENOMINATOR/);
 const outcomes=a3.cases.flatMap(c=>Array.from({length:m.attemptRepetitions.a3[c.evaluator.caseId]??1},(_,i)=>({caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':'+(i+1),terminal:{disposition:'SEND_ELIGIBLE'}})));
 assert.equal(outcomes.length,66);assert.equal(scoreWholeReplies(m,a3,outcomes,[]).status,'BLOCKED');
 assert.throws(()=>validateA3Evidence(m,a3,{attempts:outcomes.slice(0,-1)}),/A3_DENOMINATOR/);
});

test('fixed45 captured requests exclude all evaluator/source labels and preserve canonical snapshots',()=>{
 const promptOnly=structuredClone(prior);promptOnly.prompts=structuredClone(m.prompts);
 for(const [phase,corpus]of [['a2',a2],['a3',a3]])for(const c of corpus.cases){
  if(c.evaluator.family==='oversized-context')continue;
  const edited=structuredClone(c),marker='R45_EVALUATOR_ONLY_HIDDEN';
  for(const k of Object.keys(edited.evaluator))edited.evaluator[k]=marker;
  if(phase==='a3')edited.runtime.finalDraft='Dạ, chị nhé.';
  for(const role of phase==='a3'?['conversation','verifier']:['verifier']){
   const body=buildRequest(m,role,projectRuntime(m,edited,role,'opaque')),serialized=JSON.stringify(body);
   assert.ok(!serialized.includes(marker)&&!serialized.includes(c.evaluator.caseId));
   assert.deepEqual(body,buildRequest(m,role,projectRuntime(m,{runtime:edited.runtime},role,'opaque')));
   assert.deepEqual(body,buildRequest(promptOnly,role,projectRuntime(prior,edited,role,'opaque')));
   assert.ok(Buffer.byteLength(serialized)<=m.bounds.totalBytes);
   if(role==='verifier'){
    const input=JSON.parse(body.input[0].content[0].text);assert.equal(input.requestIdentity.trustedSnapshotId,hash(JSON.stringify(input.trusted)));
   }
  }
 }
});
