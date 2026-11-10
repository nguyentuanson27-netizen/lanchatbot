import test from 'node:test';
import assert from 'node:assert/strict';
import {projectRuntime,buildRequest} from './protocol.mjs';

test('R67 diagnostic registers exactly three prior SAFE failures and eight prior A3 failures as fresh N1 slots',async()=>{
 const {loadDiagnostic}=await import('./failure-recheck-20261014/run.mjs');
 const {plan,manifest,a2,a3,attempts}=loadDiagnostic();
 assert.deepEqual(plan.denominator,{a2:3,a3:8,total:11,maximumGenerationRequests:19});
 assert.deepEqual(attempts.map(a=>a.attemptId),plan.registeredAttempts.map(a=>a.attemptId));
 assert.ok(attempts.every(a=>!a.terminal&&!a.provider&&!a.conversation&&!a.dispatchStartedAt));
 assert.ok(plan.fullCheckpointQualification===false&&plan.repetitions===1);
 assert.equal(manifest.promptHashes.conversation,'d77cf63c96522bbfd5e900458f5969d2020d69d723c8cbd88344e0d02e3f9acf');
 assert.deepEqual(a2.cases.map(c=>c.evaluator.caseId),plan.a2CaseIds);
 assert.deepEqual(a3.cases.map(c=>c.evaluator.caseId),plan.a3CaseIds);
 const changed=structuredClone(plan);changed.a2CaseIds[0]='safe-nonprotected';
 assert.throws(()=>loadDiagnostic(changed));
});

test('all 11 diagnostic slots survive a non-capacity error without retry; every A3 draft invokes verifier and requests exclude registration labels',async()=>{
 const {loadDiagnostic,runDiagnostic}=await import('./failure-recheck-20261014/run.mjs');
 const data=loadDiagnostic(),e={...data.plan,attempts:data.attempts},seen=[];let saves=0;
 await runDiagnostic(data,e,async(role,request,options)=>{
  seen.push({role,request});
  assert.equal(typeof options.onCheckpoint,'function');
  assert.ok(!JSON.stringify(request).includes(data.plan.runId));
  for(const id of [...data.plan.a2CaseIds,...data.plan.a3CaseIds])assert.ok(!JSON.stringify(request).includes(id));
  if(role==='verifier'){
   const slot=e.attempts.find(a=>a.dispatchStartedAt&&!a.terminal);
   if(slot.phase==='A3')assert.equal(slot.conversation.answer,'Dạ, chị nhé.');
  }
  return {status:seen.length===1?'PROVIDER_ERROR':'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',
   providerRequests:1,clientRequests:1,rejectedClientRequests:0,requestBody:request,usage:null,cost:null,latencyMs:0};
 },{save:()=>{saves++;},check:()=>{}});
 assert.equal(seen.length,19);assert.equal(seen.filter(x=>x.role==='conversation').length,8);
 assert.equal(e.attempts.filter(a=>a.terminal).length,11);assert.ok(saves>=23);
 assert.equal(e.attempts[0].terminal.disposition,'FALLBACK');
 assert.ok(e.attempts.every(a=>a.dispatchStartedAt));
 assert.ok(e.attempts.filter(a=>a.phase==='A3').every(a=>a.verification?.provider));
 await assert.rejects(()=>runDiagnostic(data,e,()=>{throw new Error('MUST_NOT_RETRY');},{save:()=>{},check:()=>{}}),/ALREADY_STARTED/);
 const first=data.a2.cases[0],request=seen[0].request;
 assert.deepEqual(request,buildRequest(data.manifest,'verifier',projectRuntime(data.manifest,first,'verifier',JSON.parse(request.input[0].content[0].text).requestIdentity.requestId)));
});

test('owner result is saved before a verifier interruption; a capacity block retains every later registration untouched',async()=>{
 const {loadDiagnostic,runDiagnostic}=await import('./failure-recheck-20261014/run.mjs');
 const data=loadDiagnostic(),e={...data.plan,attempts:data.attempts};
 let calls=0;
 await runDiagnostic(data,e,async()=>{calls++;return {status:'PROVIDER_ERROR',providerErrorCode:'usage_limit_reached',providerRequests:1,clientRequests:1,usage:null};},{save:()=>{},check:()=>{}});
 assert.equal(calls,1);assert.equal(e.attempts.filter(a=>a.terminal).length,1);
 assert.ok(e.attempts.slice(1).every(a=>!a.dispatchStartedAt&&!a.terminal));
 const next=loadDiagnostic(),partial={...next.plan,attempts:next.attempts.filter(a=>a.phase==='A3')};
 await assert.rejects(()=>runDiagnostic(next,partial,async(role,request)=>{
  if(role==='verifier')throw new Error('LOCAL_INTERRUPTION');
  return {status:'OK',answer:'Dạ, chị nhé.',providerRequests:1,clientRequests:1,requestBody:request};
 },{save:()=>{},check:()=>{}}),/LOCAL_INTERRUPTION/);
 assert.equal(partial.attempts[0].conversation.answer,'Dạ, chị nhé.');
 assert.ok(partial.attempts[0].dispatchStartedAt);assert.equal(partial.attempts[0].terminal,null);
});
