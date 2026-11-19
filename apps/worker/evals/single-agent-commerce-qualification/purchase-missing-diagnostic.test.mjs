import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {digest} from './qualification.mjs';
import {diagnosticSlots,diagnosticScope,diagnosticControl} from './diagnostic.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const scope=read('./PURCHASE_MISSING_SCOPE_20261103.json'),parent=read('./PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE_20261031.json');
const corpus=()=>({provenance:{diagnosticScope:scope.name},scenarios:scope.cases.map(c=>({id:c.sourceCase,mode:c.mode,turns:Array.from({length:c.turns},()=>({latest:'unit'}))}))});
test('missing-only registration keeps exactly seven uncompleted cases, eleven turns and no completed case',()=>{
 assert.equal(scope.parentScopeHash,digest(parent));
 const excluded=new Set(scope.excludedCompletedCaseIds);
 assert.deepEqual(scope.cases,parent.cases.filter(c=>!excluded.has(c.sourceCase)));
 assert.equal(excluded.size,14);assert.equal(scope.cases.length,7);
 assert.equal(parent.cases.filter(c=>excluded.has(c.sourceCase)).reduce((n,c)=>n+c.turns,0),17);
 const c=corpus(),slots=diagnosticSlots(c);assert.equal(diagnosticScope(c).maximumGenerationRequests,44);
 assert.equal(slots.length,7);assert.equal(c.scenarios.reduce((n,s)=>n+s.turns.length,0),11);
 assert.equal(slots.reduce((n,s)=>n+s.maximumGenerations,0),44);
 for(const mutate of [c=>c.scenarios.reverse(),c=>c.scenarios.pop(),c=>c.scenarios[0].id=scope.excludedCompletedCaseIds[0],c=>c.scenarios[0].turns.push({})]){
  const bad=corpus();mutate(bad);assert.throws(()=>diagnosticSlots(bad));
 }
});
test('missing-only cap retains N1, three owner requests plus one verifier per turn, no forty-fifth generation',()=>{
 const c=corpus(),r={corpus:c,slots:diagnosticSlots(c)},control=diagnosticControl(r,{checkSource:()=>{}}),rows=[];
 for(const slot of r.slots)for(let turnIndex=0;turnIndex<slot.maximumGenerations/4;turnIndex++)for(const role of ['OWNER','OWNER','OWNER','VERIFIER']){
  control.beforeGeneration({generations:rows,active:{slotId:slot.slotId,turnIndex},role});
  rows.push({slotId:slot.slotId,turnIndex,role,status:'OK',providerRequests:0});
 }
 assert.equal(rows.length,44);assert(!control.blocked());
 assert.throws(()=>control.beforeGeneration({generations:rows,active:{slotId:r.slots.at(-1).slotId,turnIndex:2},role:'OWNER'}),/BATCH_CAP/);
});
