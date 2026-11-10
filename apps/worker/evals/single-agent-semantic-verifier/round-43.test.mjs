import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,validateA2Evidence} from './run-a2.mjs';
import {scoreWholeReplies,validateA3Evidence} from './run-a3.mjs';
const raw=(n,f)=>readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'),read=(n,f)=>JSON.parse(raw(n,f));
const m=read(43,'manifest.json'),prior=read(42,'manifest.json'),a2=read(43,'corpus-a2.json'),a3=read(43,'corpus-a3.json');
test('fixed43 admits the sealed policy treatment while retaining owner, facts and approved safety/usability controls',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'43'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:88,a2Safe:58,a3:42});
 assert.deepEqual(a2.cases.slice(0,142),read(42,'corpus-a2.json').cases);
 for(const f of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(43,f),raw(42,f));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerProfilePresentation','conversationContextFormat'])assert.deepEqual(m[k],prior[k]);
 assert.equal(m.prompts.conversation,prior.prompts.conversation);assert.equal(m.promptHashes.conversation,prior.promptHashes.conversation);
 const begin='# Chính sách và thao tác',end='# Kết quả';
 assert.equal(m.prompts.verifier.split(begin)[0],prior.prompts.verifier.split(begin)[0]);
 assert.equal(m.prompts.verifier.split(end)[1],prior.prompts.verifier.split(end)[1]);
 for(const k of ['dimensions','scale','minimumPerDimension','minimumCaseMean','factualActionSafetyRequired','naturalnessRequired','consultationDimensions','consultationRequired','consultationCaseIds','minimumFamilyPassRate'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 const changed=structuredClone(m);changed.attemptRepetitions.a2['pr387-dropped-material-policy-condition']=1;assert.throws(()=>validateProtocol(changed,a2,a3));
 const altered=structuredClone(m);altered.prompts.verifier+='changed instructions';assert.throws(()=>validateProtocol(altered,a2,a3));
});
test('registered policy contrasts count every sample and preserve the mandatory unsafe and whole-terminal denominators',()=>{
 validateProtocol(m,a2,a3);
 const slots=registerA2Attempts(m,a2);assert.equal(slots.length,202);assert.equal(slots.filter(a=>a.expected==='UNSAFE').length,116);assert.equal(slots.filter(a=>a.expected==='SAFE').length,86);
 for(const id of ['pr387-dropped-material-policy-condition',...a2.cases.slice(142).map(c=>c.evaluator.caseId)])assert.deepEqual(slots.filter(a=>a.caseId===id).map(a=>a.repetition),[1,2,3]);
 assert.throws(()=>validateA2Evidence(m,a2,{attempts:slots.slice(0,-1)}),/ATTEMPT_DENOMINATOR/);
 const outcomes=a3.cases.flatMap(c=>Array.from({length:m.attemptRepetitions.a3[c.evaluator.caseId]??1},(_,i)=>({caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':'+(i+1),terminal:{disposition:'SEND_ELIGIBLE'}})));
 assert.equal(outcomes.length,66);assert.equal(scoreWholeReplies(m,a3,outcomes,[]).status,'BLOCKED');
 assert.throws(()=>validateA3Evidence(m,a3,{attempts:outcomes.slice(0,-1)}),/A3_DENOMINATOR/);
});
test('captured fixed43 request bodies exclude evaluator labels and preserve the exact trusted snapshot for both roles',()=>{
 for(const [phase,corpus]of [['a2',a2],['a3',a3]])for(const c of corpus.cases){
  if(c.evaluator.family==='oversized-context')continue;
  const edited=structuredClone(c),marker='R43_EVALUATOR_ONLY_HIDDEN';
  for(const k of Object.keys(edited.evaluator))edited.evaluator[k]=marker;
  if(phase==='a3')edited.runtime.finalDraft='Dạ, chị nhé.';
  for(const role of phase==='a3'?['conversation','verifier']:['verifier']){
   const projection=projectRuntime(m,edited,role,'opaque'),body=buildRequest(m,role,projection),serialized=JSON.stringify(body);
   assert.ok(!serialized.includes(marker)&&!serialized.includes(c.evaluator.caseId));
   assert.deepEqual(body,buildRequest(m,role,projectRuntime(m,{runtime:edited.runtime},role,'opaque')));
   assert.ok(Buffer.byteLength(serialized)<=m.bounds.totalBytes);
   if(role==='verifier'){
    const input=JSON.parse(body.input[0].content[0].text);assert.equal(input.requestIdentity.trustedSnapshotId,hash(JSON.stringify(input.trusted)));
   }else assert.deepEqual(body,buildRequest(prior,role,projectRuntime(prior,edited,role,'opaque')));
  }
 }
});
