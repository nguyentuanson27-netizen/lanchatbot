import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,validateA2Evidence} from './run-a2.mjs';
import {scoreWholeReplies,validateA3Evidence} from './run-a3.mjs';
const raw=(n,f)=>readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'),read=(n,f)=>JSON.parse(raw(n,f));
const m=read(47,'manifest.json'),prior=read(46,'manifest.json'),a2=read(47,'corpus-a2.json'),a3=read(47,'corpus-a3.json');

test('fixed47 admits bounded owner/verifier treatment and scope contrasts while preserving historical populations/world',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'47'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:94,a2Safe:63,a3:42});
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(47,f),raw(46,f));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerProfilePresentation','conversationContextFormat'])assert.deepEqual(m[k],prior[k]);
 assert.notEqual(m.prompts.conversation,prior.prompts.conversation);assert.ok(m.prompts.conversation.length<=prior.prompts.conversation.length+500);assert.notEqual(m.prompts.verifier,prior.prompts.verifier);
 assert.ok(m.prompts.verifier.length<=prior.prompts.verifier.length+350);
 for(const role of ['conversation','verifier']){
  const filename=role==='conversation'?'fashion-sales-owner-round47.vi.txt':'semantic-verifier-round47.vi.txt';
  assert.equal(readFileSync(new URL('./prompts/'+filename,import.meta.url),'utf8'),m.prompts[role]);
 }
 for(const k of ['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate','anchors','interpretation'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 const changed=structuredClone(m);changed.prompts.verifier+='unsealed instructions';changed.promptHashes.verifier=hash(changed.prompts.verifier);assert.throws(()=>validateProtocol(changed,a2,a3));
 const altered=structuredClone(a2);altered.cases.at(-1).evaluator.expected='SAFE';assert.throws(()=>validateProtocol(m,altered,a3));
});

test('fixed47 retains every repetition, contrast label and actual terminal outcome denominator',()=>{
 validateProtocol(m,a2,a3);
 const slots=registerA2Attempts(m,a2);assert.equal(slots.length,235);assert.equal(slots.filter(a=>a.expected==='UNSAFE').length,134);assert.equal(slots.filter(a=>a.expected==='SAFE').length,101);
 assert.deepEqual(slots.slice(0,229).map(v=>({caseId:v.caseId,attemptId:v.attemptId,expected:v.expected})),registerA2Attempts(prior,read(46,'corpus-a2.json')).map(v=>({caseId:v.caseId,attemptId:v.attemptId,expected:v.expected})));
 assert.deepEqual(a2.cases.slice(0,155),read(46,'corpus-a2.json').cases);assert.deepEqual(m.attemptRepetitions.a3,prior.attemptRepetitions.a3);
 assert.deepEqual(slots.slice(229).map(v=>v.expected),['SAFE','SAFE','SAFE','UNSAFE','UNSAFE','UNSAFE']);
 assert.equal(a2.cases.filter(c=>c.evaluator.caseId.startsWith('r45-')).length,9);
 assert.throws(()=>validateA2Evidence(m,a2,{attempts:slots.slice(0,-1)}),/ATTEMPT_DENOMINATOR/);
 const outcomes=a3.cases.flatMap(c=>Array.from({length:m.attemptRepetitions.a3[c.evaluator.caseId]??1},(_,i)=>({caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':'+(i+1),terminal:{disposition:'SEND_ELIGIBLE'}})));
 assert.equal(outcomes.length,66);assert.equal(scoreWholeReplies(m,a3,outcomes,[]).status,'BLOCKED');
 for(const [f,n,h]of [['concern',23,11],['partial',11,9],['correction',12,10],['policy',17,9],['simple',3,3]]){
  assert.equal(a3.cases.filter(c=>c.evaluator.family===f).length,h);
  assert.equal(outcomes.filter(v=>a3.cases.find(c=>c.evaluator.caseId===v.caseId).evaluator.family===f).length,n);
 }
 assert.throws(()=>validateA3Evidence(m,a3,{attempts:outcomes.slice(0,-1)}),/A3_DENOMINATOR/);
});

test('fixed47 captured requests exclude evaluator/source labels and preserve canonical trusted snapshots',()=>{
 const promptOnly=structuredClone(prior);promptOnly.prompts=structuredClone(m.prompts);
 for(const [phase,corpus]of [['a2',a2],['a3',a3]])for(const c of corpus.cases){
  if(c.evaluator.family==='oversized-context')continue;
  const edited=structuredClone(c),marker='R47_EVALUATOR_ONLY_HIDDEN';
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
