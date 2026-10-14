import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runDiagnostic} from './failure-recheck-20261014/run.mjs';

test('second failure recheck freezes the same eleven cases with both newly prepared prompts and fresh registrations',async()=>{
 const {loadDiagnostic}=await import('./failure-recheck-20261014-02/run.mjs');
 const {plan,manifest,a2,a3,attempts}=loadDiagnostic();
 assert.equal(plan.runId,'R67_FAILURE_RECHECK_20261014_02');
 assert.deepEqual(plan.denominator,{a2:3,a3:8,total:11,maximumGenerationRequests:19});
 assert.deepEqual(a2.cases.map(c=>c.evaluator.caseId),plan.a2CaseIds);
 assert.deepEqual(a3.cases.map(c=>c.evaluator.caseId),plan.a3CaseIds);
 assert.equal(manifest.prompts.conversation,readFileSync(new URL('./prompts/fashion-sales-owner-whole-turn-preparation-20261014.vi.txt',import.meta.url),'utf8'));
 assert.equal(manifest.prompts.verifier,readFileSync(new URL('./prompts/semantic-verifier-whole-turn-preparation-20261014.vi.txt',import.meta.url),'utf8'));
 assert.deepEqual(attempts.map(a=>a.attemptId),plan.registeredAttempts.map(a=>a.attemptId));
 assert.ok(attempts.every(a=>!a.terminal&&!a.conversation&&!a.provider&&!a.dispatchStartedAt));
 const changed=structuredClone(plan);changed.repetitions=3;assert.throws(()=>loadDiagnostic(changed));
});

test('reused dispatcher uses the new instructions on all nineteen role requests without leaking evaluation labels or retrying',async()=>{
 const {loadDiagnostic}=await import('./failure-recheck-20261014-02/run.mjs');
 const data=loadDiagnostic(),evidence={...data.plan,attempts:data.attempts},requests=[];
 await runDiagnostic(data,evidence,async(role,body)=>{
  requests.push({role,body});
  assert.equal(role==='conversation'?body.systemInstruction.parts[0].text:body.instructions,data.manifest.prompts[role]);
  const serialized=JSON.stringify(body);
  for(const value of [data.plan.runId,...data.plan.a2CaseIds,...data.plan.a3CaseIds])assert.ok(!serialized.includes(value));
  for(const key of ['caseId','split','expected','requiredBehaviors','forbiddenBehaviors','rubric','qualityTags'])assert.ok(!serialized.includes('"'+key+'"'));
  return {status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',
   providerRequests:1,clientRequests:1,rejectedClientRequests:0,requestBody:body,usage:null,cost:null,latencyMs:0};
 },{save:()=>{},check:()=>{}});
 assert.equal(requests.length,19);assert.equal(requests.filter(r=>r.role==='conversation').length,8);
 assert.equal(evidence.attempts.filter(a=>a.terminal).length,11);
 await assert.rejects(()=>runDiagnostic(data,evidence,()=>{throw new Error('MUST_NOT_RETRY');},{save:()=>{},check:()=>{}}),/ALREADY_STARTED/);
});
