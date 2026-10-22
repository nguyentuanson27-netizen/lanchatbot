import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerJourneyOpenings,journeyMessages,registerNegotiationProbe} from './sales-journeys-registration.mjs';
const corpus=JSON.parse(readFileSync(new URL('./sales-journeys.candidate.json',import.meta.url)));
test('explicit opening selection preserves the complete deferred denominator instead of pretending twelve journeys ran',()=>{
 const r=registerJourneyOpenings(corpus,['J02','J03','J05','J08']);
 assert.equal(r.samples.length,4);assert.equal(r.deferred.length,28);
 assert(r.samples.every(c=>c.runtime.history.length===0&&c.runtime.messages.length===1));
 assert.deepEqual(r.samples[0].runtime.initialProductCodes,[]);
 assert.throws(()=>registerJourneyOpenings(corpus,['J07']),/SETUP_NOT_MATERIALIZED/);
 assert.throws(()=>registerJourneyOpenings(corpus,['J02','J02']),/DUPLICATE/);
});
test('message projection copies only runtime input and refuses unresolved private/media fixtures',()=>{
 const t=corpus.journeys[0].turns[0],input={...t,caseId:'CANARY',evaluator:{expected:'RUBRIC_CANARY'}};
 assert.doesNotMatch(JSON.stringify(journeyMessages(input)),/CANARY|expected|evaluator/);
 assert.deepEqual(journeyMessages(input)[0].adsContext,t.runtime.messages[0].adsContext);
 assert.throws(()=>journeyMessages({runtime:{privateFixture:'NOT_READY'}}),/PRIVATE_FIXTURE/);
 assert.throws(()=>journeyMessages({runtime:{messages:[{text:null,attachments:[{fixtureRef:'NOT_READY'}]}]}}),/MEDIA_FIXTURE/);
});
test('negotiation companion uses an actual model cart setup then one objection and one ordinary total question',()=>{
 const baseline=JSON.parse(readFileSync(new URL('./stateful-cases.json',import.meta.url)));
 const r=registerNegotiationProbe(corpus,baseline);
 assert.equal(r.length,3);assert.equal(new Set(r.map(c=>c.journeyId)).size,1);
 assert.deepEqual(r[0].runtime,baseline[0].runtime);
 assert(r.slice(1).every(c=>c.evaluator.requiresCurrentCart));
 assert.equal(r[1].runtime.latest,corpus.journeys.find(j=>j.purposeId==='J07').turns[0].runtime.messages[0].text);
 assert.equal(r[2].runtime.latest,'Thế một áo cả ship là bao nhiêu em?');
});
