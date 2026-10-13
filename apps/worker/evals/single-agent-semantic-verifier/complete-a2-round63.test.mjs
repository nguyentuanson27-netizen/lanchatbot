import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
process.env.C3_CHECKPOINT_A_ROUND='63';
const {prepareCompletion,completeMissingAttempts,selectCompletionShard,mergeCompletionShards}=await import('./complete-a2-round47.mjs');
const {hash}=await import('./protocol.mjs');
const read=f=>readFileSync(new URL('./round-63/'+f,import.meta.url),'utf8'),priorRaw=read('a2-evidence.json'),prior=JSON.parse(priorRaw),m=JSON.parse(read('manifest.json')),a2=JSON.parse(read('corpus-a2.json')),plan=JSON.parse(read('a2-completion-plan.json')),sha='b'.repeat(40);
const prepared=()=>prepareCompletion(plan,priorRaw,m,a2,sha);
const provider=request=>({status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1,clientRequests:1,rejectedClientRequests:0,latencyMs:1,requestBody:request});

test('explicit63diagnostic plan adopts278unchanged outcomes and only73undispatched slots while preserving FAIL',()=>{
 const e=prepared();assert.deepEqual(e.attempts,prior.attempts);assert.equal(e.summary.status,'FAIL');assert.equal(e.completion.diagnosticOnly,true);assert.equal(e.completion.missingAttemptIds.length,73);assert.equal(e.a2RunSourceSha,sha);assert.equal(e.completion.priorA2RunSourceSha,prior.a2RunSourceSha);
 for(const change of [p=>p.diagnosticOnly=false,p=>p.qualificationStatus='PASS',p=>p.stopOnUnsafeFalsePass=true,p=>p.missingAttemptIds.push(prior.attempts[0].attemptId),p=>p.retryCompletedAttempts=true]){const p=structuredClone(plan);change(p);assert.throws(()=>prepareCompletion(p,priorRaw,m,a2,sha));}
});

test('a staged dispatch without outcome cannot be adopted as a new completion slot',()=>{
 const p=structuredClone(prior);p.attempts[278].dispatchStartedAt=new Date().toISOString();const raw=JSON.stringify(p),changed={...plan,priorEvidenceHash:hash(raw)};assert.throws(()=>prepareCompletion(changed,raw,m,a2,sha),/COMPLETION_SCOPE_CHANGED/);
});

test('diagnostic loop collects every remaining result after extra unsafePASS without rerunning old errors or authorizing PASS',async()=>{
 const e=prepared(),captured=[];await completeMissingAttempts(m,a2,e,async request=>{captured.push(request);return provider(request);},()=>{});
 assert.equal(captured.length,73);assert.equal(e.summary.executedDenominator,351);assert.equal(e.summary.unexecuted,0);assert.equal(e.summary.status,'FAIL');assert.ok(e.summary.unsafeSendEligibleFalsePassCount>1);assert.deepEqual(e.attempts.slice(0,278),prior.attempts.slice(0,278));assert.deepEqual(JSON.parse(priorRaw),prior);
 assert.ok(e.attempts.slice(278).every(a=>a.originRunSourceSha===sha));assert.equal(e.operational.maxRequestsPerAttempt,1);for(const r of captured){const text=JSON.stringify(r);assert.ok(!text.includes('caseId'));assert.ok(!text.includes('expected'));assert.ok(!plan.missingAttemptIds.some(id=>text.includes(id)));}
});

test('already dispatched completion is never retried and provider-capacity failure retains all remaining NOT_RUN',async()=>{
 const e=prepared();e.attempts[278].invocationStartedAt=new Date().toISOString();let calls=0;await assert.rejects(completeMissingAttempts(m,a2,e,async()=>{calls++;},()=>{}),/COMPLETION_ALREADY_ATTEMPTED/);assert.equal(calls,0);
 const blocked=prepared();await completeMissingAttempts(m,a2,blocked,async request=>{calls++;return {status:'PROVIDER_ERROR',providerErrorCode:'usage_limit_reached',providerRequests:1,clientRequests:1,rejectedClientRequests:0,requestBody:request};},()=>{});assert.equal(calls,1);assert.equal(blocked.summary.status,'FAIL');assert.equal(blocked.summary.unexecuted,72);assert.ok(blocked.completion.capacityBlock);
});

test('three fixed shards cover73slots once and merge old278outcomes only once even after extra unsafePASS',async()=>{
 const shards=[],seen=new Set();let calls=0;
 for(let index=0;index<3;index++){const e=selectCompletionShard(prepared(),index);
  for(const id of e.completion.missingAttemptIds){assert.ok(!seen.has(id));seen.add(id);}
  await completeMissingAttempts(m,a2,e,async request=>{calls++;return provider(request);},()=>{});shards.push(e);
 }
 assert.equal(seen.size,73);assert.equal(calls,73);assert.deepEqual(shards.map(s=>s.completion.missingAttemptIds.length),[25,24,24]);
 const combined=mergeCompletionShards(plan,priorRaw,m,a2,shards,sha);assert.equal(combined.attempts.length,351);assert.equal(combined.summary.executedDenominator,351);assert.equal(combined.summary.status,'FAIL');assert.equal(combined.operational.providerRequests,347);assert.deepEqual(combined.attempts.slice(0,278),prior.attempts.slice(0,278));
});

test('shard selection/merge reject invalid allocation, duplicates and wrong source without starting new model calls',async()=>{
 assert.throws(()=>selectCompletionShard(prepared(),3));const bad=prepared();bad.completion.shards[1].attemptIds[0]=bad.completion.shards[0].attemptIds[0];assert.throws(()=>selectCompletionShard(bad,0));
 const shards=[0,1,2].map(i=>selectCompletionShard(prepared(),i));assert.throws(()=>mergeCompletionShards(plan,priorRaw,m,a2,[shards[0],shards[0],shards[2]],sha));
 shards[1].a2RunSourceSha='c'.repeat(40);assert.throws(()=>mergeCompletionShards(plan,priorRaw,m,a2,shards,sha));
});
