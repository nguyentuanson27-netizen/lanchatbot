import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
process.env.C3_CHECKPOINT_A_ROUND='68';
const {hash,projectRuntime,buildRequest}=await import('./protocol.mjs');
const {registerA2Attempts,evaluateA2Attempt,summarizeA2,operational}=await import('./run-a2.mjs');
const {runStagedAttempts}=await import('./run-staged-round52.mjs');
const {runDiagnostic}=await import('./failure-recheck-20261014/run.mjs');
const read=file=>JSON.parse(readFileSync(new URL('./'+file,import.meta.url),'utf8'));

test('clear-boundaries run admits only the frozen prompt delta and unchanged full populations/configuration',async()=>{
 const {loadRun}=await import('./clear-boundaries-run-20261014/run.mjs');
 const data=loadRun(),base=read('round-68/manifest.json');
 const expected=structuredClone(base);
 for(const role of ['conversation','verifier']){
  expected.prompts[role]=readFileSync(new URL('./'+data.plan.prompts[role].file,import.meta.url),'utf8');
  expected.promptHashes[role]=hash(expected.prompts[role]);
 }
 assert.deepEqual(data.manifest,expected);
 assert.equal(hash(JSON.stringify(expected)),data.plan.effectiveManifestHash);
 assert.equal(data.a2.cases.length,138);assert.equal(data.a3.cases.length,42);
 const attempts=registerA2Attempts(data.manifest,data.a2);
 assert.equal(attempts.length,142);assert.equal(attempts.filter(a=>a.expected==='UNSAFE').length,91);
 assert.ok(attempts.every(a=>!a.dispatchStartedAt&&!a.provider&&!a.terminal));
 assert.throws(()=>loadRun({...data.plan,effectiveManifestHash:'0'.repeat(64)}));
});

test('A3 rejects inherited or incomplete A2 qualification and accepts only new identity with all 142 fresh outcomes',async()=>{
 const {loadRun,requireFreshA2}=await import('./clear-boundaries-run-20261014/run.mjs');
 const data=loadRun(),{manifest,a2,plan}=data;
 const e={runId:plan.runId,planHash:data.planHash,manifestHash:data.baseManifestHash,effectiveManifestHash:plan.effectiveManifestHash,
  promptHash:manifest.promptHashes.verifier,a2RunSourceSha:'f'.repeat(40),attempts:registerA2Attempts(manifest,a2),regression:null};
 let requests=0;
 await runStagedAttempts(manifest,'a2',a2,e,(slot)=>evaluateA2Attempt(manifest,a2.cases.find(c=>c.evaluator.caseId===slot.caseId),async request=>{
  requests++;return {status:'OK',answer:slot.expected==='SAFE'?'{"verdict":"PASS","violations":[]}':'{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":null}]}',
   requestBody:request,providerRequests:1,clientRequests:1,rejectedClientRequests:0,latencyMs:0};
 }),{save:()=>{},checkSource:()=>{},mode:'ALL',stopAfterFailedPrefix:false,log:()=>{}});
 e.summary=summarizeA2(manifest,e.attempts);e.operational=operational(e.attempts);
 assert.equal(requests,138);assert.equal(requireFreshA2(data,e).status,'PASS');
 assert.throws(()=>requireFreshA2(data,read('a2-full-rerun-20261014/a2-evidence.json')));
 const changed=structuredClone(e);changed.effectiveManifestHash='0'.repeat(64);assert.throws(()=>requireFreshA2(data,changed));
 const missing=structuredClone(e);missing.attempts.at(-1).terminal=null;assert.throws(()=>requireFreshA2(data,missing));
 const prefix=structuredClone(e);prefix.regression.status='FAIL';assert.throws(()=>requireFreshA2(data,prefix));
});

test('all 42 current owner outputs persist before mandatory verification, exact texts and poisoned-label firewall remain intact',async()=>{
 const {loadRun}=await import('./clear-boundaries-run-20261014/run.mjs');
 const data=loadRun(),poison='CLEAR_BOUNDARIES_EVALUATOR_ONLY';
 for(const c of data.a3.cases)for(const key of Object.keys(c.evaluator))if(key!=='caseId')c.evaluator[key]=poison;
 const e={attempts:data.a3.cases.map(c=>({phase:'A3',caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':1',repetition:1,conversation:null,provider:null,finalDraft:null,verification:null,terminal:null}))};
 let owner=0,verifier=0;
 await runDiagnostic(data,e,async(role,body)=>{
  assert.ok(!JSON.stringify(body).includes(poison));
  if(role==='conversation'){
   owner++;assert.equal(body.systemInstruction.parts[0].text,data.manifest.prompts.conversation);
  }else{
   verifier++;const slot=e.attempts.find(a=>a.verifierRequestBody===body);
   assert.ok(slot.conversation);assert.equal(slot.conversation.answer,'Dạ, chị nhé.');
   const payload=JSON.parse(body.input[0].content[0].text);assert.equal(payload.untrusted.finalDraft,slot.conversation.answer);
   const c=data.a3.cases.find(c=>c.evaluator.caseId===slot.caseId);
   assert.deepEqual(body,buildRequest(data.manifest,'verifier',projectRuntime(data.manifest,{runtime:{...c.runtime,finalDraft:slot.conversation.answer}},'verifier',payload.requestIdentity.requestId)));
  }
  return {status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',requestBody:body,providerRequests:1,clientRequests:1,rejectedClientRequests:0,latencyMs:0};
 },{save:()=>{},check:()=>{}});
 assert.equal(owner,42);assert.equal(verifier,42);assert.ok(e.attempts.every(a=>a.finalDraft===a.conversation.answer&&a.terminal));
 await assert.rejects(()=>runDiagnostic(data,e,()=>{throw new Error('NO_RETRY');},{save:()=>{},check:()=>{}}),/ALREADY_STARTED/);
});
