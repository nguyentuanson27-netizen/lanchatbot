import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {runShard} from './run-a2-shards.mjs';
const read=f=>readFileSync(new URL('./round-64/'+f,import.meta.url),'utf8'),m=JSON.parse(read('manifest.json')),a2=JSON.parse(read('corpus-a2.json')),priorRaw=read('a2-initial-evidence.json'),plan=JSON.parse(read('a2-completion-plan.json'));
test('round64 completion adopts all217outcomes and2started unknown slots; only132untouched slots can dispatch',async()=>{
 const {prepareR64Completion}=await import('./complete-a2-round64.mjs');const e=prepareR64Completion(m,a2,plan,priorRaw,'b'.repeat(40),0),prior=JSON.parse(priorRaw);
 assert.deepEqual(e.attempts,prior.attempts);assert.equal(e.completion.missingAttemptIds.length,52);assert.equal(plan.shards[1].attemptIds.length,40);assert.equal(plan.shards[2].attemptIds.length,40);
 assert.ok(plan.unknownStartedAttemptIds.every(id=>!plan.missingAttemptIds.includes(id)));const bad=structuredClone(plan);bad.missingAttemptIds[0]=plan.unknownStartedAttemptIds[0];assert.throws(()=>prepareR64Completion(m,a2,bad,priorRaw,'b'.repeat(40),0));
 let calls=0;await runShard(m,a2,e,async request=>{calls++;return {status:'OK',answer:'{"verdict":"FAIL","violations":[{"kind":"POLICY_OR_BENEFIT_STRENGTHENING","protectedRef":null}]}',providerRequests:1,clientRequests:1,requestBody:request,latencyMs:0};},{save:()=>{},checkSource:()=>{},log:()=>{}});
 assert.equal(calls,52);assert.equal(e.attempts.filter(a=>a.originRunSourceSha==='b'.repeat(40)).length,52);for(let i=0;i<prior.attempts.length;i++)if(!plan.shards[0].attemptIds.includes(prior.attempts[i].attemptId))assert.deepEqual(e.attempts[i],prior.attempts[i]);
});
test('completion rejects changed raw evidence, source or overlap before provider invocation',async()=>{const {prepareR64Completion}=await import('./complete-a2-round64.mjs');assert.throws(()=>prepareR64Completion(m,a2,plan,priorRaw+' ','b'.repeat(40),0));assert.throws(()=>prepareR64Completion(m,a2,plan,priorRaw,'invalid',0));const p=structuredClone(plan);p.shards[1].attemptIds[0]=p.shards[0].attemptIds[0];assert.throws(()=>prepareR64Completion(m,a2,p,priorRaw,'b'.repeat(40),1));});
test('resuming15undispatched retains334outcomes including quotaerror and2started unknowns without retries',async()=>{
 const {prepareR64Completion}=await import('./complete-a2-round64.mjs'),raw=read('a2-completed-evidence.json'),p=JSON.parse(read('a2-resume-plan.json')),old=JSON.parse(raw);let calls=0;
 assert.equal(old.attempts.filter(a=>a.terminal).length,334);assert.equal(p.missingAttemptIds.length,15);
 for(let i=0;i<3;i++){const e=prepareR64Completion(m,a2,p,raw,'c'.repeat(40),i);assert.equal(e.shard.attemptIds.length,5);await runShard(m,a2,e,async request=>{calls++;return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1,requestBody:request};},{save:()=>{},checkSource:()=>{},log:()=>{}});for(let n=0;n<old.attempts.length;n++)if(!e.shard.attemptIds.includes(old.attempts[n].attemptId))assert.deepEqual(e.attempts[n],old.attempts[n]);}
 assert.equal(calls,15);assert.ok(p.unknownStartedAttemptIds.every(id=>!p.missingAttemptIds.includes(id)));assert.ok(!p.missingAttemptIds.includes('r53-v2-exchange-count-safe:3'));
});
