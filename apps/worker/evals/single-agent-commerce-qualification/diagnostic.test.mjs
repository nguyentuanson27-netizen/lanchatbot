import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {diagnosticControl,claimDiagnostic,diagnosticSlots,assertDiagnosticFlags} from './diagnostic.mjs';
import {validateCorpus} from './qualification.mjs';
import {corpus} from './fixtures.test-support.mjs';
const cases=[['c-20261028-s09',1],['c-20261028-j1',3],['c-20261028-j6',3],['c-20261028-s06',1],['c-20261028-s11',1],['SCOPED_MEDIA_OBSERVATION_VERIFIER_ONLY',1]];
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
test('diagnostic stop persists across cases and blocks probe; known malformed is retained without global stop',()=>{
 for(const event of [{errorCode:'UNKNOWN_PROVIDER_COMPLETION'},{reason:'STALE'},{safetyFindings:[{kind:'PRIVACY_VIOLATION'}]},{accounting:'UNKNOWN'}]){
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
