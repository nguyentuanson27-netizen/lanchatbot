import {test} from 'node:test';
import assert from 'node:assert/strict';
import {REAL_CHECKS,validateRealAdapterReport} from './real-adapter-driver.mjs';
test('all seven real adapter invariants require exact actual run identities, cleanup and no generation',()=>{
 const reg={runSourceSha:'a'.repeat(40)},report={sourceSha:reg.runSourceSha,sourceDirty:false,testDatabaseDropped:true,status:'PASS',
  providerGenerations:0,sendEnabled:false,mode:'REAL_POSTGRES_SYNTHETIC_DOMAIN_INPUTS_CURRENT_POLICY_CAPTURE',
  cases:Object.values(REAL_CHECKS).map(name=>({name,status:'PASS'}))};
 assert.equal(validateRealAdapterReport(report,reg).length,7);
 for(const mutate of [r=>{r.testDatabaseDropped=false;},r=>{r.cases.pop();},r=>{r.providerGenerations=1;},r=>{r.sourceSha='b'.repeat(40);}]){
  const bad=structuredClone(report);mutate(bad);assert.throws(()=>validateRealAdapterReport(bad,reg));
 }
});
