import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
process.env.C3_CHECKPOINT_A_ROUND='68';
const {requireFreshA2}=await import('./clear-boundaries-run-20261014/run.mjs');

test('explicit diagnostic admits exactly 42 unchanged cases from failed A2 while qualified admission remains closed',async()=>{
 const {loadBypass}=await import('./a3-owner-authorized-bypass-20261014/run.mjs');
 const data=loadBypass();
 assert.equal(data.plan.ownerAuthorization,'chạy a3 đi, by pass a2');
 assert.equal(data.plan.fullCheckpointQualification,false);
 assert.equal(data.priorA2.regression.status,'FAIL');
 assert.equal(data.priorAudit.finalA2Status,'FAIL');
 assert.throws(()=>requireFreshA2(data.base,data.priorA2));
 assert.equal(data.attempts.length,42);
 assert.ok(data.attempts.every(a=>a.phase==='A3'&&a.repetition===1&&!a.dispatchStartedAt&&!a.conversation&&!a.terminal));
 assert.deepEqual(data.manifest,data.base.manifest);
 assert.equal(data.plan.maximumGenerationRequests,84);
 assert.equal(data.plan.generationRetries,0);
 const historical=readFileSync(new URL('./clear-boundaries-run-20261014/a2-evidence.json',import.meta.url),'utf8');
 assert.throws(()=>loadBypass({...data.plan,fullCheckpointQualification:true}));
 assert.throws(()=>loadBypass({...data.plan,ownerAuthorization:'implicit bypass'}));
 assert.equal(readFileSync(new URL('./clear-boundaries-run-20261014/a2-evidence.json',import.meta.url),'utf8'),historical);
});
