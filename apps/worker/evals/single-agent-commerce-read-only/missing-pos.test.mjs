import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerMissingPos} from './sales-journeys-registration.mjs';
import {liveDispatchSlots,runtimeCase} from './protocol.mjs';
import {scopedProviderFacts} from './stateful-provider.mjs';
const rows=JSON.parse(readFileSync(new URL('./cases.b1.json',import.meta.url)));

test('all existing B1 slots partition into 21 read-only and three composed POS failures, without duplication or changed customer input',()=>{
 const missing=registerMissingPos(rows),first=liveDispatchSlots(rows,{first:1,last:8},true),rest=liveDispatchSlots(rows,{first:9,last:24},true);
 assert.equal(first.length,7);assert.equal(rest.length,14);assert.equal(missing.length,3);
 const ids=[...first,...rest].map(i=>rows[i].caseId).concat(missing.map(c=>c.caseId));
 assert.equal(new Set(ids).size,24);assert.deepEqual(ids.sort(),rows.map(c=>c.caseId).sort());
 for(const c of missing){const original=rows.find(r=>r.caseId===c.caseId);
  assert.equal(c.runtime.latest,original.runtime.latest);assert.deepEqual(c.runtime.initialProductCodes,original.runtime.initialProductCodes);
  assert.deepEqual(original.runtime.history,[]);
  const wire=runtimeCase({runtime:{...c.runtime,history:[]}});
  assert.doesNotMatch(JSON.stringify(wire),/caseId|evaluator|sourceMode|POS_UNAVAILABLE|Committed silent/);
 }
 assert.equal(liveDispatchSlots(rows,{first:1,last:24}).length,24);
});

test('POS fault never reaches live POS and leaves unrelated readers bound to the original source',async()=>{
 class Source {value='catalog';async readCatalogSnapshot(){throw Error('LIVE_POS_MUST_NOT_BE_READ');}
  async resolveCartSelection(){throw Error('LIVE_SELECTION_MUST_NOT_BE_READ');}async ready(){return this.value;}}
 const source=new Source(),counts={posReads:0,selectorCalls:0},fault=scopedProviderFacts(source,'POS_UNAVAILABLE',counts);
 assert.equal(await fault.readCatalogSnapshot('LANA','SV2447'),null);
 await assert.rejects(fault.resolveCartSelection({}),/CONTROLLED_POS_UNAVAILABLE/);
 assert.equal(await fault.ready(),'catalog');assert.deepEqual(counts,{posReads:1,selectorCalls:1});
 assert.equal(scopedProviderFacts(source,'LIVE',counts),source);
 assert.throws(()=>scopedProviderFacts(source,'UNKNOWN',counts),/SOURCE_MODE/);
});
