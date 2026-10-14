import test from 'node:test';
import assert from 'node:assert/strict';
process.env.C3_CHECKPOINT_A_ROUND='68';

test('stream recheck registers only three observed provider-stream failures as fresh N1 without adopting historical outcomes',async()=>{
 const {loadStreamRecheck}=await import('./a3-stream-recheck-20261014/run.mjs');
 const d=loadStreamRecheck();
 assert.deepEqual(d.plan.caseIds,['r5-referent-navy','r5-simple-price','r15-fit-reassurance']);
 assert.deepEqual(d.a3.cases.map(c=>c.evaluator.caseId),d.plan.caseIds);
 assert.deepEqual(d.manifest,d.parent.manifest);
 assert.equal(d.plan.fullCheckpointQualification,false);assert.equal(d.plan.maximumGenerationRequests,6);
 assert.equal(d.plan.generationRetries,0);assert.equal(d.plan.repetitions,1);
 assert.equal(d.attempts.length,3);
 assert.ok(d.attempts.every(a=>a.repetition===1&&!a.conversation&&!a.verification&&!a.terminal&&!a.dispatchStartedAt));
 assert.ok(d.prior.attempts.filter(a=>d.plan.caseIds.includes(a.caseId)).every(a=>a.verification.provider.errorStage==='GENERATION_STREAM'));
 assert.throws(()=>loadStreamRecheck({...d.plan,caseIds:['r7-opacity-context-change']}));
 assert.throws(()=>loadStreamRecheck({...d.plan,fullCheckpointQualification:true}));
});
