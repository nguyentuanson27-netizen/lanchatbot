import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerOpeningQuotes,registerJourneyOpenings,journeyMessages,registerNegotiationProbe,selectStatefulThrough,registerMediaProbe,registerMediaFollowup} from './sales-journeys-registration.mjs';
const corpus=JSON.parse(readFileSync(new URL('./sales-journeys.candidate.json',import.meta.url)));

test('media followups retain actual prerequisites and never manufacture a shop reply',()=>{
 const rows=JSON.parse(readFileSync(new URL('./sales-media-followup-cases.json',import.meta.url)));
 const samples=registerMediaFollowup(rows);
 assert.equal(samples.length,7);assert.equal(new Set(samples.map(c=>c.journeyId)).size,5);
 assert.equal(samples[0].journeyId,samples[1].journeyId);
 assert.equal(samples[2].journeyId,samples[3].journeyId);
 assert.notEqual(samples[0].journeyId,samples[2].journeyId);
 assert(samples.every(c=>!Object.hasOwn(c.runtime,'history')));
 assert.doesNotMatch(JSON.stringify(samples.map(c=>c.runtime)),/evaluator|purpose|expected|caseId|turnId/);
 assert.deepEqual(selectStatefulThrough(samples,samples[1].caseId),samples.slice(0,2));
 const bad=structuredClone(rows);bad[0].turns[1].turnId='ask';
 assert.throws(()=>registerMediaFollowup(bad),/DUPLICATE_MEDIA_TURN/);
});

test('four independent media turns use actual ingress input, not evaluator labels or imagined accepted history',()=>{
 const rows=JSON.parse(readFileSync(new URL('./sales-media-cases.json',import.meta.url)));
 const samples=registerMediaProbe(rows);
 assert.equal(samples.length,4);assert.equal(new Set(samples.map(c=>c.journeyId)).size,4);
 assert(samples.every(c=>c.runtime.history.length===0&&c.runtime.initialProductCodes.length===1));
 assert.doesNotMatch(JSON.stringify(samples.map(c=>c.runtime)),/caseId|evaluator|required|FEEDBACK|DETAIL|expected/);
 assert.deepEqual(samples.map(c=>c.runtime.latest),rows.map(c=>c.runtime.messages[0].text));
 assert.throws(()=>registerMediaProbe(rows.slice(1)),/FOUR_MEDIA_CASES/);
 const bad=structuredClone(rows);bad[0].runtime.messages[0].attachments=[{fixtureRef:'NOT_READY'}];
 assert.throws(()=>registerMediaProbe(bad),/MEDIA_FIXTURE/);
});

test('targeted stateful rerun retains actual prerequisite turns and stops before unrelated checkout',()=>{
 const baseline=JSON.parse(readFileSync(new URL('./stateful-cases.json',import.meta.url)));
 assert.deepEqual(selectStatefulThrough(baseline),baseline);
 assert.deepEqual(selectStatefulThrough(baseline,'stateful-correction').map(c=>c.caseId),
  ['stateful-open','stateful-variant-quantity','stateful-quote','stateful-correction']);
 assert.throws(()=>selectStatefulThrough(baseline,''),/UNKNOWN_THROUGH_CASE/);
 assert.throws(()=>selectStatefulThrough(baseline,'missing'),/UNKNOWN_THROUGH_CASE/);
});
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

test('opening quotes use real repeated journey history and keep evaluation separate',()=>{
 const rows=JSON.parse(readFileSync(new URL('./opening-quote-cases.json',import.meta.url)));
 const registered=registerOpeningQuotes(rows);assert.equal(registered.length,5);
 assert.equal(registered[0].journeyId,registered[1].journeyId);
 assert.equal(registered[0].runtime.messages[0].adsContext.adTitle,'Set Thạch Thảo SV2447');
 assert.deepEqual(registered[0].runtime.initialProductCodes,[]);
 assert(!JSON.stringify(registered.map(r=>r.runtime)).includes('expected'));
 const invalid=structuredClone(rows);invalid[1].runtime.history=[{role:'shop',text:'Invented successful quote'}];
 assert.throws(()=>registerOpeningQuotes(invalid),/NO_SYNTHETIC_SHOP_HISTORY/);
});
