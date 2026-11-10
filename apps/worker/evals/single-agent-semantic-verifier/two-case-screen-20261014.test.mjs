import test from 'node:test';
import assert from 'node:assert/strict';
import {runDiagnostic} from './failure-recheck-20261014/run.mjs';

test('principles screen freezes exactly the two failed whole turns, N1, with no adopted outcome or new cases',async()=>{
 const {loadScreen}=await import('./two-case-screen-20261014/run.mjs');
 const {plan,manifest,a3,attempts}=loadScreen();
 assert.deepEqual(plan.caseIds,['r5-competitor-price','r14-stage-light-change']);
 assert.equal(plan.repetitions,1);assert.equal(plan.maximumGenerationRequests,4);
 assert.deepEqual(a3.cases.map(c=>c.evaluator.caseId),plan.caseIds);
 assert.ok(attempts.every(a=>a.phase==='A3'&&!a.terminal&&!a.conversation&&!a.dispatchStartedAt));
 assert.equal(manifest.promptHashes.conversation,plan.prompts.conversation.hash);
 assert.equal(manifest.promptHashes.verifier,plan.prompts.verifier.hash);
 assert.deepEqual(plan.followup,{a2Registered:142,a2UniqueCases:138,a3Registered:42,condition:'BOTH_SCREEN_ROWS_PASS_THEN_FULL_A2_PASS_BEFORE_FULL_A3',adoptScreenOutcomes:false});
 const changed=structuredClone(plan);changed.caseIds.reverse();assert.throws(()=>loadScreen(changed));
});

test('both screened final drafts take the verifier with new instructions, no labels or generation retry',async()=>{
 const {loadScreen}=await import('./two-case-screen-20261014/run.mjs');
 const data=loadScreen(),e={...data.plan,attempts:data.attempts};let requests=0;
 await runDiagnostic(data,e,async(role,body)=>{
  requests++;
  assert.equal(role==='conversation'?body.systemInstruction.parts[0].text:body.instructions,data.manifest.prompts[role]);
  for(const value of [data.plan.runId,...data.plan.caseIds])assert.ok(!JSON.stringify(body).includes(value));
  return {status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',providerRequests:1,clientRequests:1,rejectedClientRequests:0,requestBody:body,latencyMs:0};
 },{save:()=>{},check:()=>{}});
 assert.equal(requests,4);assert.equal(e.attempts.filter(a=>a.verification?.provider&&a.terminal).length,2);
 await assert.rejects(()=>runDiagnostic(data,e,()=>{throw new Error('NO_RETRY');},{save:()=>{},check:()=>{}}),/ALREADY_STARTED/);
});
