import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnosticSlots,diagnosticControl,diagnosticProviderRegistration} from './diagnostic.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const scope=read('./FULL_NATIVE_REMAINDER_SCOPE_20261102.json'),parent=read('./FULL_NATIVE_DIAGNOSTIC_SCOPE_20261029.json'),done=read('./PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE_20261031.json');
const registration=()=>({runSourceSha:'a'.repeat(40),config:{candidate:{openingMediaRule:{version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'}}},corpus:{provenance:{diagnosticScope:scope.name},scenarios:scope.cases.map(c=>({id:c.sourceCase,mode:c.turns===3?'JOURNEY':'SINGLE',turns:Array.from({length:c.turns},()=>({latest:'unit'}))}))}});
test('remaining population is exactly full22 minus the completed21, with20turns and no repeated case',()=>{
 const completed=new Set(done.cases.map(c=>c.sourceCase));assert.deepEqual(scope.cases,parent.cases.filter(c=>!completed.has(c.sourceCase)));
 const r=registration();r.slots=diagnosticSlots(r.corpus);assert.equal(r.slots.length,12);assert.equal(r.corpus.scenarios.reduce((n,s)=>n+s.turns.length,0),20);
 assert.equal(r.slots.reduce((n,s)=>n+s.maximumGenerations,0),80);assert.equal(diagnosticProviderRegistration(r).maximumGenerationRequests,80);
 for(const mutate of [r=>r.corpus.scenarios.pop(),r=>r.corpus.scenarios.reverse(),r=>r.corpus.scenarios[0].turns.push({latest:'extra'}),r=>r.corpus.scenarios[0].id='c-po-20261031-p01']){
  const changed=registration();mutate(changed);assert.throws(()=>diagnosticSlots(changed.corpus));
 }
});
test('remaining population accounts all80 generation records without resetting turn roles or allowing81',()=>{
 const r=registration();r.slots=diagnosticSlots(r.corpus);const control=diagnosticControl(r,{checkSource:()=>{}}),rows=[];
 for(const s of r.slots)for(let turnIndex=0;turnIndex<s.maximumGenerations/4;turnIndex++)for(const role of ['OWNER','OWNER','OWNER','VERIFIER']){
  control.beforeGeneration({generations:rows,active:{slotId:s.slotId,turnIndex},role});rows.push({slotId:s.slotId,turnIndex,role,status:'OK',providerRequests:0});
 }
 assert.equal(rows.length,80);assert(!control.blocked());assert.throws(()=>control.beforeGeneration({generations:rows,active:{slotId:r.slots.at(-1).slotId,turnIndex:2},role:'OWNER'}),/BATCH_CAP/);
});
