import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,validateA2Evidence} from './run-a2.mjs';
import {scoreWholeReplies,validateA3Evidence} from './run-a3.mjs';
const raw=(n,f)=>readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'),read=(n,f)=>JSON.parse(raw(n,f));
const m=read(44,'manifest.json'),prior=read(43,'manifest.json'),a2=read(44,'corpus-a2.json'),a3=read(44,'corpus-a3.json');
test('fixed44 admits the sealed owner/review treatment without changing protected truth or verifier qualification population',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'44'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:88,a2Safe:58,a3:42});
 for(const f of ['corpus-a2.json','corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(44,f),raw(43,f));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerProfilePresentation','conversationContextFormat','attemptRepetitions'])assert.deepEqual(m[k],prior[k]);
 assert.equal(m.prompts.verifier,prior.prompts.verifier);assert.equal(m.promptHashes.verifier,prior.promptHashes.verifier);
 assert.notEqual(m.prompts.conversation,prior.prompts.conversation);assert.ok(m.prompts.conversation.length<=prior.prompts.conversation.length+100);
 for(const k of ['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 const changed=structuredClone(m);changed.prompts.conversation+='unsealed instructions';changed.promptHashes.conversation=hash(changed.prompts.conversation);assert.throws(()=>validateProtocol(changed,a2,a3));
 const altered=structuredClone(m);altered.scoring.anchors.naturalness.good='post-result rescue';assert.throws(()=>validateProtocol(altered,a2,a3));
});
test('fixed44 preserves all registered samples, mandatory unsafe rule and whole-terminal denominator',()=>{
 validateProtocol(m,a2,a3);
 const slots=registerA2Attempts(m,a2);assert.equal(slots.length,202);assert.equal(slots.filter(a=>a.expected==='UNSAFE').length,116);assert.equal(slots.filter(a=>a.expected==='SAFE').length,86);
 assert.throws(()=>validateA2Evidence(m,a2,{attempts:slots.slice(0,-1)}),/ATTEMPT_DENOMINATOR/);
 const outcomes=a3.cases.flatMap(c=>Array.from({length:m.attemptRepetitions.a3[c.evaluator.caseId]??1},(_,i)=>({caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':'+(i+1),terminal:{disposition:'SEND_ELIGIBLE'}})));
 assert.equal(outcomes.length,66);assert.equal(scoreWholeReplies(m,a3,outcomes,[]).status,'BLOCKED');
 assert.throws(()=>validateA3Evidence(m,a3,{attempts:outcomes.slice(0,-1)}),/A3_DENOMINATOR/);
});
test('fixed44 captured request projections exclude review/evaluator labels and preserve canonical trusted snapshots',()=>{
 for(const [phase,corpus]of [['a2',a2],['a3',a3]])for(const c of corpus.cases){
  if(c.evaluator.family==='oversized-context')continue;
  const edited=structuredClone(c),marker='R44_EVALUATOR_ONLY_HIDDEN';
  for(const k of Object.keys(edited.evaluator))edited.evaluator[k]=marker;
  if(phase==='a3')edited.runtime.finalDraft='Dạ, chị nhé.';
  for(const role of phase==='a3'?['conversation','verifier']:['verifier']){
   const projection=projectRuntime(m,edited,role,'opaque'),body=buildRequest(m,role,projection),serialized=JSON.stringify(body);
   assert.ok(!serialized.includes(marker)&&!serialized.includes(c.evaluator.caseId));
   assert.deepEqual(body,buildRequest(m,role,projectRuntime(m,{runtime:edited.runtime},role,'opaque')));
   assert.ok(Buffer.byteLength(serialized)<=m.bounds.totalBytes);
   if(role==='verifier'){
    const input=JSON.parse(body.input[0].content[0].text);assert.equal(input.requestIdentity.trustedSnapshotId,hash(JSON.stringify(input.trusted)));
    assert.deepEqual(body,buildRequest(prior,role,projectRuntime(prior,edited,role,'opaque')));
   }else{
    const ownerOnly=structuredClone(prior);ownerOnly.prompts.conversation=m.prompts.conversation;
    assert.deepEqual(body,buildRequest(ownerOnly,role,projectRuntime(prior,edited,role,'opaque')));
   }
  }
 }
});
