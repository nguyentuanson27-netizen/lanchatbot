import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnosticSlots,diagnosticControl} from './diagnostic.mjs';
const scope=JSON.parse(readFileSync(new URL('./FULL_NATIVE_DIAGNOSTIC_SCOPE_20261029.json',import.meta.url)));
const registration=()=>({corpus:{provenance:{diagnosticScope:scope.name},scenarios:scope.cases.map(c=>({id:c.sourceCase,mode:c.turns===3?'JOURNEY':'SINGLE',turns:Array.from({length:c.turns},()=>({latest:'unit'}))}))}});
test('full native development population retains exactly 22 cases / 34 turns / no safety probes',()=>{
 const r=registration();r.slots=diagnosticSlots(r.corpus);
 assert.equal(r.slots.length,22);assert.equal(r.corpus.scenarios.reduce((n,s)=>n+s.turns.length,0),34);
 assert.equal(r.slots.reduce((n,s)=>n+s.maximumGenerations,0),136);assert(r.slots.every(s=>s.mode!=='SAFETY'));
 for(const change of [r=>r.corpus.scenarios.pop(),r=>r.corpus.scenarios.reverse(),r=>r.corpus.scenarios[0].turns.push({latest:'extra'}),r=>r.corpus.scenarios[0].mode='SAFETY']){
  const changed=registration();change(changed);assert.throws(()=>diagnosticSlots(changed.corpus));
 }
});
test('full development cap accounts for all 136 generation records without changing per-turn budget',()=>{
 const r=registration();r.slots=diagnosticSlots(r.corpus);const control=diagnosticControl(r,{checkSource:()=>{}}),rows=[];
 for(const s of r.slots)for(let turnIndex=0;turnIndex<s.maximumGenerations/4;turnIndex++)for(const role of ['OWNER','OWNER','OWNER','VERIFIER']){
  control.beforeGeneration({generations:rows,active:{slotId:s.slotId,turnIndex},role});rows.push({slotId:s.slotId,turnIndex,role,status:'OK',providerRequests:0});
 }
 assert.equal(rows.length,136);assert(!control.blocked());
 assert.throws(()=>control.beforeGeneration({generations:rows,active:{slotId:r.slots.at(-1).slotId,turnIndex:2},role:'OWNER'}),/BATCH_CAP/);
 const over=registration();over.slots=diagnosticSlots(over.corpus);const c=diagnosticControl(over,{checkSource:()=>{}});
 const bad=Array.from({length:4},()=>({slotId:over.slots[0].slotId,turnIndex:0,role:'OWNER',status:'OK',providerRequests:1}));
 assert.throws(()=>c.beforeGeneration({generations:bad,active:{slotId:over.slots[1].slotId,turnIndex:0},role:'OWNER'}),/CAP_VIOLATION/);
});
