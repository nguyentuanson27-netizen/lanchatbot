import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {registerA2Attempts,providerCapacityExhausted,summarizeA2,evaluateA2Attempt} from './run-a2.mjs';
const raw=(round,file)=>readFileSync(new URL('./round-'+round+'/'+file,import.meta.url),'utf8');
const read=(round,file)=>JSON.parse(raw(round,file));

test('availability stop retains the failed attempt without changing historical transport policy',()=>{
 const prior=read(47,'manifest.json'),next=structuredClone(prior);
 next.providerCapacityPolicy.stopErrorStages=['AUTH_HEADER'];
 next.providerCapacityPolicy.stopHttpStatuses=[401,429];
 for(const failure of [
  {status:'PROVIDER_ERROR',error:'AUTH_UNAVAILABLE',errorStage:'AUTH_HEADER',providerRequests:0},
  {status:'PROVIDER_ERROR',httpStatus:401,providerRequests:1},
  {status:'PROVIDER_ERROR',httpStatus:429,providerRequests:1},
 ]){
  assert.equal(providerCapacityExhausted(next,failure),true);
  assert.equal(providerCapacityExhausted(prior,failure),false);
  const summary=summarizeA2(next,[{expected:'SAFE',provider:failure,terminal:{disposition:'FALLBACK'}},{expected:'SAFE',provider:null,terminal:null}]);
  assert.equal(summary.status,'BLOCKED');assert.equal(summary.registeredDenominator,2);
  assert.equal(summary.safeFailures,1);assert.equal(summary.unexecuted,1);assert.equal(summary.safeFailureRate,null);
 }
 assert.equal(providerCapacityExhausted(next,{status:'PROVIDER_ERROR',httpStatus:503}),false);
 assert.equal(providerCapacityExhausted(next,{status:'TIMEOUT'}),false);
 assert.equal(providerCapacityExhausted(next,{status:'OK',httpStatus:429}),false);
 assert.equal(providerCapacityExhausted(next,{status:'PROVIDER_ERROR',providerErrorCode:'usage_limit_reached'}),true);
});

test('round48 seals a prospective policy correction with owner, facts, bars and A3 held constant',()=>{
 const m=read(48,'manifest.json'),prior=read(47,'manifest.json'),a2=read(48,'corpus-a2.json'),a3=read(48,'corpus-a3.json');
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'48'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:99,a2Safe:64,a3:42});
 for(const file of ['corpus-a3.json','fashion-profiles.json','size-inputs.json','quote-inputs.json','context-preparation.json','reference-replies.json'])assert.equal(raw(48,file),raw(47,file));
 for(const key of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','usability','measurements','fallbacks','terminal','ownerProfilePresentation','conversationContextFormat','scoring'])assert.deepEqual(m[key],prior[key]);
 assert.equal(m.prompts.conversation,prior.prompts.conversation);
 assert.equal(m.prompts.verifier,readFileSync(new URL('./prompts/semantic-verifier-round48.vi.txt',import.meta.url),'utf8'));
 assert.ok(m.prompts.verifier.length<prior.prompts.verifier.length);
 for(const part of [0,1])assert.equal(m.prompts.verifier.split('# Chính sách trong hội thoại')[part===0?0:1].split('# Thao tác')[part===0?0:1],prior.prompts.verifier.split('# Chính sách trong hội thoại')[part===0?0:1].split('# Thao tác')[part===0?0:1]);
 const changed=structuredClone(m);changed.prompts.verifier+=' modified';changed.promptHashes.verifier=hash(changed.prompts.verifier);
 assert.throws(()=>validateProtocol(changed,a2,a3));
 const relabeled=structuredClone(a2);relabeled.cases.find(c=>c.evaluator.caseId==='r4-safe-policy').evaluator.expected='SAFE';
 const rehashed=structuredClone(m);rehashed.corpusHashes.a2=hash(JSON.stringify(relabeled));
 assert.throws(()=>validateProtocol(rehashed,relabeled,a3));
});

test('prospective adjudications preserve every old draft/world and expose every denominator change',()=>{
 const m=read(48,'manifest.json'),a2=read(48,'corpus-a2.json'),prior=read(47,'corpus-a2.json');
 const revisions=read(48,'label-review.json').revisions;
 assert.deepEqual(revisions.map(r=>r.caseId).sort(),['r4-safe-policy','r47-policy-necessary-restriction-safe'].sort());
 for(const original of prior.cases){
  const current=a2.cases.find(c=>c.evaluator.caseId===original.evaluator.caseId);
  assert.ok(current);assert.deepEqual(current.runtime,original.runtime);assert.deepEqual(current.codeScenario,original.codeScenario);
  const revision=revisions.find(r=>r.caseId===original.evaluator.caseId);
  if(revision){assert.equal(original.evaluator.expected,'SAFE');assert.equal(current.evaluator.expected,'UNSAFE');assert.equal(revision.priorFixtureHash,hash(JSON.stringify(original)));}
  else assert.deepEqual(current,original);
 }
 const slots=registerA2Attempts(m,a2);
 assert.equal(slots.length,253);assert.equal(slots.filter(a=>a.expected==='UNSAFE').length,147);assert.equal(slots.filter(a=>a.expected==='SAFE').length,106);
 assert.equal(new Set(slots.map(a=>a.attemptId)).size,253);
 assert.deepEqual(a2.cases.slice(0,7),prior.cases.filter(c=>c.evaluator.seed));
 assert.ok(a2.cases.slice(7,22).some(c=>c.evaluator.caseId==='r45-observed-trial-false-pass-unsafe'));
 assert.equal(a2.cases.filter(c=>c.evaluator.caseId.startsWith('r48-')).length,6);
 const critical=['r4-safe-policy','r47-policy-necessary-restriction-safe','r45-observed-trial-false-pass-unsafe'];
 for(const id of critical)assert.equal(a2.cases.find(c=>c.evaluator.caseId===id).evaluator.expected,'UNSAFE');
 const trial=structuredClone(slots);trial[0].terminal={disposition:'SEND_ELIGIBLE'};
 assert.equal(summarizeA2(m,trial).status,'FAIL');
});

test('new label review stays evaluator-only in actual stub-captured verifier requests',async()=>{
 const m=read(48,'manifest.json'),a2=read(48,'corpus-a2.json');
 for(const original of a2.cases.filter(c=>c.evaluator.caseId.startsWith('r48-'))){
  const fixture=structuredClone(original),marker='R48_PRIVATE_ADJUDICATION';
  for(const key of Object.keys(fixture.evaluator))fixture.evaluator[key]=marker;
  fixture.labelReview={reason:marker,expected:marker};
  let calls=0;
  const outcome=await evaluateA2Attempt(m,fixture,async request=>{
   calls++;const text=JSON.stringify(request);assert.ok(!text.includes(marker));assert.ok(!text.includes(original.evaluator.caseId));
   const projection=JSON.parse(request.input[0].content[0].text);
   assert.equal(projection.requestIdentity.trustedSnapshotId,hash(JSON.stringify(projection.trusted)));
   assert.deepEqual(request,buildRequest(m,'verifier',projectRuntime(m,{runtime:fixture.runtime},'verifier',projection.requestIdentity.requestId)));
   return {status:'OK',answer:'{"verdict":"UNCERTAIN","violations":[]}',providerRequests:1};
  });
  assert.equal(calls,1);assert.equal(outcome.terminal.disposition,'FALLBACK');
 }
});
