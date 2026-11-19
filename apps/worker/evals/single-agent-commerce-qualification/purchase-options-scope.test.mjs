import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnosticSlots,diagnosticScope} from './diagnostic.mjs';
const scope=JSON.parse(readFileSync(new URL('./PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE_20261031.json',import.meta.url)));
const corpus={provenance:{diagnosticScope:scope.name},scenarios:scope.cases.map(c=>({id:c.sourceCase,mode:c.mode,turns:Array.from({length:c.turns},()=>({}))}))};
test('purchase-options N1 scope fixes21cases28turns112max and accepts real two-turn journeys',()=>{
 assert.equal(diagnosticScope(corpus).maximumCases,21);const slots=diagnosticSlots(corpus);assert.equal(slots.length,21);
 assert.equal(slots.reduce((n,s)=>n+s.maximumGenerations,0),112);assert.equal(slots.filter(s=>s.mode==='JOURNEY').length,5);
 for(const mutate of [c=>c.scenarios.reverse(),c=>c.scenarios[0].turns.push({}),c=>c.scenarios[0].mode='JOURNEY']){
  const bad=structuredClone(corpus);mutate(bad);assert.throws(()=>diagnosticSlots(bad),/SCOPE_CHANGED/);
 }
});
