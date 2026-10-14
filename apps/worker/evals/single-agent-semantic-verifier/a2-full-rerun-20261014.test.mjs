import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProtocol,buildRequest,projectRuntime} from './protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt} from './run-a2.mjs';
import {runStagedAttempts} from './run-staged-round52.mjs';
const read=file=>JSON.parse(readFileSync(new URL('./round-68/'+file,import.meta.url),'utf8'));
const manifest=read('manifest.json'),a2=read('corpus-a2.json'),a3=read('corpus-a3.json');

test('full A2 rerun admits exact current inputs and 142 fresh slots without changing models, prompts or repetition policy',async()=>{
 const {loadFullA2}=await import('./a2-full-rerun-20261014/run.mjs');
 const data=loadFullA2();assert.deepEqual(data.manifest,manifest);assert.deepEqual(data.a2,a2);
 assert.deepEqual(validateProtocol(data.manifest,a2,a3),{a2Unsafe:87,a2Safe:51,a3:42});
 assert.equal(data.attempts.length,142);assert.equal(data.attempts.filter(a=>a.expected==='UNSAFE').length,91);
 assert.ok(data.attempts.every(a=>a.terminal===null&&a.provider===null));
 assert.equal(data.plan.includesA3,false);assert.equal(data.plan.prefixAcceptancePolicy,'ALL_MATCH_VALID_VERDICTS_UNCHANGED');
 assert.throws(()=>loadFullA2({...data.plan,models:{}}));
});

test('report-only prefix executes every remaining case after malformed/refusal errors but retains prefix FAIL and early accounting',async()=>{
 const evidence={attempts:registerA2Attempts(manifest,a2),regression:null};let count=0,checkpoints=0;
 await runStagedAttempts(manifest,'a2',a2,evidence,async(a,options)=>{
  count++;assert.ok(a.dispatchStartedAt);options.onCheckpoint({stage:'LOCAL_MOCK'});checkpoints++;
  return {precheck:'SURVIVED',provider:{status:'OK'},terminal:{disposition:a.expected==='SAFE'?'SEND_ELIGIBLE':'FALLBACK',reason:count===1?'MALFORMED':a.expected==='SAFE'?'PASS':'FAIL'}};
 },{save:()=>{},checkSource:()=>{},mode:'ALL',stopAfterFailedPrefix:false,log:()=>{}});
 assert.equal(count,142);assert.equal(checkpoints,142);assert.equal(evidence.regression.status,'FAIL');
 assert.deepEqual(evidence.regression.failedAttemptIds,['pr387-negation-inversion:1']);
 assert.ok(evidence.attempts.every(a=>a.terminal));
});

test('historical default still holds a failed prefix; report-only mode preserves unsafe and auth/capacity hard stops',async()=>{
 for(const scenario of ['DEFAULT_MALFORMED','UNSAFE_PASS','AUTH_401']){
  const evidence={attempts:registerA2Attempts(manifest,a2),regression:null};let count=0;
  await runStagedAttempts(manifest,'a2',a2,evidence,async(a)=>{
   count++;const unsafe=scenario==='UNSAFE_PASS',auth=scenario==='AUTH_401';
   return {precheck:'SURVIVED',provider:{status:auth?'PROVIDER_ERROR':'OK',...(auth?{httpStatus:401,errorStage:'UPSTREAM',providerErrorCode:'AUTH_REJECTED'}:{})},terminal:{disposition:unsafe?'SEND_ELIGIBLE':'FALLBACK',reason:unsafe?'PASS':auth?'PROVIDER_ERROR':'MALFORMED'}};
  },{save:()=>{},checkSource:()=>{},mode:'ALL',...(scenario==='DEFAULT_MALFORMED'?{}:{stopAfterFailedPrefix:false}),log:()=>{}});
  assert.equal(count,scenario==='DEFAULT_MALFORMED'?6:1);
  assert.equal(evidence.regression.status,scenario==='AUTH_401'?'BLOCKED':'FAIL');
  assert.ok(evidence.attempts.slice(count).every(a=>!a.dispatchStartedAt&&!a.provider&&!a.terminal));
 }
});

test('all hard-precheck survivors still invoke current verifier with exact runtime and no poisoned evaluator labels',async()=>{
 let captured=0,nonprotected=false;
 for(const fixture of a2.cases){
  const poisoned=structuredClone(fixture);for(const key of Object.keys(poisoned.evaluator))poisoned.evaluator[key]='FULL_A2_PRIVATE_EVALUATOR';
  const result=await evaluateA2Attempt(manifest,poisoned,async request=>{
   captured++;if(fixture.evaluator.caseId==='safe-nonprotected')nonprotected=true;
   const payload=JSON.parse(request.input[0].content[0].text);
   assert.deepEqual(request,buildRequest(manifest,'verifier',projectRuntime(manifest,fixture,'verifier',payload.requestIdentity.requestId)));
   assert.ok(!JSON.stringify(request).includes('FULL_A2_PRIVATE_EVALUATOR'));
   return {status:'OK',answer:'{"verdict":"FAIL","violations":[]}',requestBody:request,providerRequests:1,clientRequests:1,latencyMs:0};
  });
  if(result.precheck==='SURVIVED')assert.ok(result.provider);
 }
 assert.equal(captured,134);assert.equal(nonprotected,true);
});
