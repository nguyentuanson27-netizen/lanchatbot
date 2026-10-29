import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {diagnosticControl,claimDiagnostic,diagnosticSlots,assertDiagnosticFlags,assertDiagnosticInitial} from './diagnostic.mjs';
import {validateCorpus,digest} from './qualification.mjs';
import {corpus,config} from './fixtures.test-support.mjs';
import {collectNativePopulation} from './native-population.mjs';
import {createAttemptQueue} from '../single-agent-commerce-read-only/attempt-evidence.mjs';
const cases=[['c-20261028-j1',3],['c-20261028-j6',3],['c-20261028-s09',1],['c-20261028-s06',1],['c-20261028-s11',1],['SCOPED_MEDIA_OBSERVATION_VERIFIER_ONLY',1]];
const reg=()=>({kind:'PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1',corpus:{scenarios:cases.map(([id,n],i)=>({id,mode:i===5?'SAFETY':n===3?'JOURNEY':'SINGLE',turns:Array.from({length:n},()=>({latest:'unit',history:[],initialProductCodes:[]}))}))},sourceChecks:[]});
test('diagnostic cap includes failed zero-HTTP generations, permits owner3/verifier1 and all37;38 stops',()=>{
 const r=reg();r.slots=diagnosticSlots(r.corpus);const c=diagnosticControl(r,{checkSource:()=>{}});
 const rows=[];for(const s of r.slots)for(let turnIndex=0;turnIndex<(s.mode==='SAFETY'?1:s.maximumGenerations/4);turnIndex++){
  for(const role of s.mode==='SAFETY'?['VERIFIER']:['OWNER','OWNER','OWNER','VERIFIER']){
   c.beforeGeneration({generations:rows,active:{slotId:s.slotId,turnIndex},role});rows.push({slotId:s.slotId,turnIndex,role,status:'OK',providerRequests:0});
  }
 }
 assert.equal(rows.length,37);assert.equal(c.blocked(),false);
 assert.throws(()=>c.beforeGeneration({generations:rows,active:{slotId:r.slots.at(-1).slotId,turnIndex:0},role:'VERIFIER'}),/BATCH_CAP/);assert(c.blocked());
});
test('initial source and exact artifact hash must match before dispatch',()=>{
 const a={kind:'REAL_ADAPTER_NATIVE_INITIAL_STATE',worldHash:'unit-world',sourceSha:'a'.repeat(40),sourceDirty:false,testDatabaseDropped:true,providerRequests:0,publicState:{}};
 const r={runSourceSha:a.sourceSha,worldHash:a.worldHash,initialStateArtifact:a,initialStateArtifactHash:digest(a)};assertDiagnosticInitial(r);
 for(const mutate of [r=>{delete r.initialStateArtifact.sourceSha;},r=>{r.initialStateArtifact.sourceSha='b'.repeat(40);r.initialStateArtifactHash=digest(r.initialStateArtifact);},r=>{r.initialStateArtifact.publicState.owner='HUMAN';}]){
  const changed=structuredClone(r);mutate(changed);assert.throws(()=>assertDiagnosticInitial(changed),/INITIAL_STATE/);
 }
});
test('actual collector latches native privacy, recovery and unknown commit outcomes before later cases or probe',async()=>{
 for(const native of [{terminal:{disposition:'NO_SEND',reason:'PRIVACY'}},{terminal:{disposition:'HANDOFF',reason:'HANDOFF'},recovery:{originalReason:'PERMISSION_OR_PRIVACY'}},{terminal:{disposition:'NO_SEND',reason:'UNKNOWN_COMMIT'},commitStatus:'UNKNOWN'},
  {terminal:{disposition:'NO_SEND',reason:'PRIVACY'},recovery:{originalReason:'FAIL'}},{terminal:{disposition:'HANDOFF',reason:'HANDOFF'},recovery:{originalReason:'FAIL'},handoff:{status:'UNKNOWN'}}]){
  const dir=mkdtempSync(resolve(tmpdir(),'c3-diagnostic-unit-'));try{
   const r=reg();r.config=config();const seed='unit-development-seed';r.config.blinding.seedCommitment=digest(seed);r.identity={};r.runSourceSha='a'.repeat(40);
   for(const s of r.corpus.scenarios){s.initialContext={initialStateHash:digest({})};s.judgeContext={};}r.slots=diagnosticSlots(r.corpus);
   const q=createAttemptQueue(),control=diagnosticControl(r,{checkSource:()=>{}});let sessions=0;
   const ports={observed:()=>[],observedSources:()=>[],setSlot:()=>{},awaitSettled:async()=>true,assertSource:()=>{}};
   const sessionFactory=async()=>{sessions++;return{capture:[],capturePayloads:[],turn:async()=>({result:native,qualification:{status:'VALID'}}),drain:async()=>{}};};
   const seedPath=resolve(dir,'seed.json');writeFileSync(seedPath,JSON.stringify({seed}));
   const result=await collectNativePopulation({preflight:{sealed:r,registration:{arm:'CANDIDATE'},diagnosticControl:control},providerPorts:ports,sessionFactory,
    snapshot:async()=>({publicState:{},publicHistory:{history:[],trace:[]},receipts:[],events:[],outbox:[]}),out:dir,seedPath,queue:q});
   assert.equal(sessions,1);assert.equal(result.attempts.filter(a=>a.status==='NOT_RUN').length,4);assert(q.blocked());assert(control.blocked());
   assert.throws(()=>control.beforeGeneration({generations:[],active:{slotId:r.slots.at(-1).slotId,turnIndex:0},role:'VERIFIER'}),/STOPPED/);
  }finally{assert(dir.startsWith(resolve(tmpdir(),'c3-diagnostic-unit-')));rmSync(dir,{recursive:true,force:true});}
 }
});
test('diagnostic stop persists across cases and blocks probe; known malformed is retained without global stop',()=>{
 for(const event of [{errorCode:'UNKNOWN_PROVIDER_COMPLETION'},{reason:'STALE'},{reason:'PRIVACY'},{reason:'RECIPIENT'},{reason:'PERMISSION'},{safetyFindings:[{kind:'PRIVACY_VIOLATION'}]},{accounting:'UNKNOWN'}]){
  const r=reg();r.slots=diagnosticSlots(r.corpus);const c=diagnosticControl(r,{checkSource:()=>{}});c.afterTurn(event);assert(c.blocked());
  assert.throws(()=>c.beforeGeneration({generations:[],active:{slotId:r.slots.at(-1).slotId,turnIndex:0},role:'VERIFIER'}),/STOPPED/);
 }
 const r=reg();r.slots=diagnosticSlots(r.corpus);const c=diagnosticControl(r,{checkSource:()=>{}});c.afterTurn({errorCode:'OWNER_TOOL_OUTPUT'});assert(!c.blocked());
 const stale=diagnosticControl(r,{checkSource:()=>{throw Error('UNIT_EXPIRED');}});assert.throws(()=>stale.beforeGeneration({generations:[],active:{slotId:r.slots[0].slotId,turnIndex:0},role:'OWNER'}));assert(stale.blocked());
});
test('diagnostic dispatch is create-once and separate from qualification',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'c3-diagnostic-unit-'));try{claimDiagnostic(resolve(dir,'REGISTRATION.json'),reg());assert.throws(()=>claimDiagnostic(resolve(dir,'REGISTRATION.json'),reg()));}finally{assert(dir.startsWith(resolve(tmpdir(),'c3-diagnostic-unit-')));rmSync(dir,{recursive:true,force:true});}
});
test('diagnostic cannot be passed as qualification or mixed with qualification/provider flags',()=>{
 const c=corpus();c.provenance={developmentOnly:true};assert.throws(()=>validateCorpus(c),/DIAGNOSTIC_NOT_QUALIFICATION/);
 for(const flag of ['--phase-c-registration','--phase-c-arm','--phase-c-initial-world','--provider-run','--provider-preflight','--phase-c-safety'])assert.throws(()=>assertDiagnosticFlags(['--phase-c-diagnostic-registration',flag]),/FLAGS_CONFLICT/);
 assertDiagnosticFlags(['--phase-c-diagnostic-registration','--phase-c-world']);
 const changed=reg();changed.corpus.scenarios.reverse();assert.throws(()=>diagnosticSlots(changed.corpus),/SCOPE_CHANGED/);
});
