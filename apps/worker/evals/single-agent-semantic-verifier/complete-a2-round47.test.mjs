import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCompletion,completeMissingAttempts} from './complete-a2-round47.mjs';
import {hash} from './protocol.mjs';
const read=n=>readFileSync(new URL('./round-47/'+n,import.meta.url),'utf8');
const priorRaw=read('a2-evidence.json'),prior=JSON.parse(priorRaw),plan=JSON.parse(read('a2-completion-plan.json'));
const manifest=JSON.parse(read('manifest.json')),a2=JSON.parse(read('corpus-a2.json'));
const sourceSha='a'.repeat(40);
const prepared=()=>prepareCompletion(plan,priorRaw,manifest,a2,sourceSha);
const provider=(request,verdict)=>({status:'OK',answer:JSON.stringify({verdict,violations:[]}),
 providerRequests:1,clientRequests:1,rejectedClientRequests:0,latencyMs:1,requestBody:request});

test('completion adopts all 168 observations unchanged and freezes exactly the 67 slots without retained outcomes',()=>{
 const evidence=prepared();assert.deepEqual(evidence.attempts,prior.attempts);
 assert.equal(evidence.a2RunSourceSha,sourceSha);assert.equal(evidence.completion.priorA2RunSourceSha,prior.a2RunSourceSha);
 assert.equal(evidence.attempts.length,235);assert.equal(evidence.completion.missingAttemptIds.length,67);
 for(const update of [p=>p.priorEvidenceHash='0'.repeat(64),p=>p.missingAttemptIds.shift(),p=>p.missingAttemptIds.push(prior.attempts[0].attemptId),p=>p.retryCompletedAttempts=true]){
  const changed=structuredClone(plan);update(changed);assert.throws(()=>prepareCompletion(changed,priorRaw,manifest,a2,sourceSha));
 }
});

test('a recorded dispatch is never treated as a fresh missing invocation',async()=>{
 const changed=structuredClone(prior);changed.attempts[168].invocationStartedAt=new Date().toISOString();
 const raw=JSON.stringify(changed),updated={...plan,priorEvidenceHash:hash(raw)};
 assert.throws(()=>prepareCompletion(updated,raw,manifest,a2,sourceSha),/COMPLETION_SCOPE_CHANGED/);
 const evidence=prepared();evidence.attempts[168].invocationStartedAt=new Date().toISOString();let calls=0;
 await assert.rejects(completeMissingAttempts(manifest,a2,evidence,async()=>{calls++;},()=>{}),/COMPLETION_ALREADY_ATTEMPTED/);
 assert.equal(calls,0);
});

test('missing-slot completion invokes the unchanged verifier at most once, never retries old errors, and retains all outcomes',async()=>{
 const evidence=prepared(),captured=[];
 await completeMissingAttempts(manifest,a2,evidence,async request=>{captured.push(request);return provider(request,'FAIL');},()=>{});
 assert.equal(captured.length,67);assert.equal(evidence.summary.executedDenominator,235);assert.equal(evidence.summary.unexecuted,0);
 assert.equal(evidence.summary.status,'FAIL');assert.deepEqual(evidence.attempts.slice(0,168),prior.attempts.slice(0,168));
 assert.deepEqual(JSON.parse(priorRaw),prior);assert.ok(evidence.attempts.slice(168).every(a=>a.originRunSourceSha===sourceSha));
 for(const request of captured){const text=JSON.stringify(request);assert.ok(!text.includes('caseId'));assert.ok(!text.includes('expected'));assert.ok(!plan.missingAttemptIds.some(id=>text.includes(id)));}
 assert.equal(evidence.operational.maxRequestsPerAttempt,1);
});

test('a send-eligible unsafe observation stops missing-slot generation immediately',async()=>{
 const evidence=prepared();let calls=0;
 await completeMissingAttempts(manifest,a2,evidence,async request=>{calls++;return provider(request,'PASS');},()=>{});
 assert.equal(evidence.summary.status,'FAIL');assert.equal(evidence.summary.unsafeSendEligibleFalsePassCount,1);
 assert.ok(calls<67);const index=evidence.attempts.findIndex(a=>a.expected==='UNSAFE'&&a.terminal?.disposition==='SEND_ELIGIBLE');
 assert.ok(index>=168);assert.ok(evidence.attempts.slice(index+1).every(a=>!a.terminal));
 assert.deepEqual(evidence.attempts.slice(0,168),prior.attempts.slice(0,168));
});
