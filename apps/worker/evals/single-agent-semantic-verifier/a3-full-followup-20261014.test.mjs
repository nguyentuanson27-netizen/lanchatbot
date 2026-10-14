import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runDiagnostic} from './failure-recheck-20261014/run.mjs';
const read=f=>JSON.parse(readFileSync(new URL('./round-68/'+f,import.meta.url),'utf8'));
const manifest=read('manifest.json'),a3=read('corpus-a3.json');
const attempts=()=>a3.cases.map(c=>({phase:'A3',caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':1',repetition:1,conversation:null,provider:null,finalDraft:null,verification:null,terminal:null}));

test('fixed full A3 consumes the exact completed A2 PASS rather than incomplete R68 and retains all42 fresh registrations',()=>{
 const entry=new URL('./a3-full-followup-20261014/run.mjs',import.meta.url);
 const code=`import assert from 'node:assert/strict';const {loadFullA3}=await import(${JSON.stringify(entry.href)});const d=loadFullA3();assert.equal(d.priorA2.summary.status,'PASS');assert.equal(d.priorA2.summary.executedDenominator,142);assert.equal(d.priorA2.regression.status,'PASS');assert.equal(d.attempts.length,42);assert.ok(d.attempts.every(a=>!a.dispatchStartedAt&&!a.conversation&&!a.terminal));assert.equal(d.plan.counts.maximumGenerationRequests,84);assert.throws(()=>loadFullA3({...d.plan,a2Evidence:{}}));console.log('FULL_A3_PREREQUISITE_VALID');`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,C3_CHECKPOINT_A_ROUND:'68'},encoding:'utf8',stdio:'pipe'}),/FULL_A3_PREREQUISITE_VALID/);
});

test('all42 exact final-text owner generations are saved before mandatory verifier; poisoned evaluator labels never enter either role',async()=>{
 const poisoned=structuredClone(a3);for(const c of poisoned.cases)for(const k of Object.keys(c.evaluator))if(k!=='caseId')c.evaluator[k]='A3_PRIVATE_EVALUATOR_LABEL';
 const data={manifest,a2:{schemaVersion:1,cases:[]},a3:poisoned},e={attempts:attempts()};let calls=0,ownersPersisted=0;
 await runDiagnostic(data,e,async(role,body,options)=>{
  calls++;assert.ok(!JSON.stringify(body).includes('A3_PRIVATE_EVALUATOR_LABEL'));
  for(const c of a3.cases)assert.ok(!JSON.stringify(body).includes(c.evaluator.caseId));
  if(role==='verifier'){
   const current=e.attempts.find(a=>a.verifierDispatchStartedAt&&!a.terminal);
   assert.equal(current.conversation.answer,'Dạ, chị nhé.');assert.ok(current.conversationRequestBody);
   assert.equal(JSON.parse(body.input[0].content[0].text).untrusted.finalDraft,'Dạ, chị nhé.');ownersPersisted++;
  }
  assert.equal(typeof options.onCheckpoint,'function');options.onCheckpoint({phase:'MOCK'});
  return {status:'OK',answer:role==='conversation'?'Dạ, chị nhé.':'{"verdict":"PASS","violations":[]}',providerRequests:1,clientRequests:1,rejectedClientRequests:0,requestBody:body,latencyMs:0};
 },{save:()=>{},check:()=>{}});
 assert.equal(calls,84);assert.equal(ownersPersisted,42);assert.ok(e.attempts.every(a=>a.finalDraft==='Dạ, chị nhé.'&&a.verification?.provider&&a.terminal.text==='Dạ, chị nhé.'));
 await assert.rejects(()=>runDiagnostic(data,e,()=>{throw new Error('NO_RETRY');},{save:()=>{},check:()=>{}}),/ALREADY_STARTED/);
});

test('provider availability failure retains failed actual terminal and every missing registration without another generation',async()=>{
 const data={manifest,a2:{schemaVersion:1,cases:[]},a3},e={attempts:attempts()};let calls=0;
 await runDiagnostic(data,e,async(role,body)=>{
  calls++;return role==='conversation'?{status:'OK',answer:'Dạ, chị nhé.',providerRequests:1,clientRequests:1,requestBody:body,latencyMs:0}:
   {status:'PROVIDER_ERROR',answer:null,httpStatus:401,errorStage:'UPSTREAM',providerErrorCode:'AUTH_REJECTED',providerRequests:1,clientRequests:1,requestBody:body,latencyMs:0};
 },{save:()=>{},check:()=>{}});
 assert.equal(calls,2);assert.ok(e.capacityBlock);assert.equal(e.attempts[0].terminal.disposition,'FALLBACK');
 assert.equal(e.attempts[0].terminal.text,manifest.fallbacks[0].text);
 assert.ok(e.attempts.slice(1).every(a=>!a.dispatchStartedAt&&!a.conversation&&!a.verification&&!a.terminal));
});
