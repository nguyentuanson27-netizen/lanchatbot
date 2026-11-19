import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evidence} from './fixtures.test-support.mjs';
import {registerSlots,digest} from './qualification.mjs';
import {mergeEvidence} from './merge-evidence.mjs';
test('missing cohorts stay registered NOT_RUN and duplicate/error attempts cannot be replaced',()=>{
 const e=evidence(),registration={config:e.config,corpus:e.corpus,corpusHash:digest(e.corpus),identity:e.identity,
  runSourceSha:e.source.sourceSha,slots:registerSlots(e.config,e.corpus),registeredAt:'2026-10-28T00:00:00.000Z'};
 e.attempts.forEach(a=>{a.startedAt='2026-10-28T01:00:00.000Z';});
 const partial={...e,attempts:e.attempts.slice(0,2)};partial.attempts[0].status='ERROR';
 const result=mergeEvidence(registration,[partial],e.blindSeed);assert.equal(result.attempts.length,registration.slots.length);
 assert.equal(result.attempts.filter(a=>a.status==='NOT_RUN').length,registration.slots.length-2);assert.equal(result.attempts[0].status,'ERROR');
 assert.throws(()=>mergeEvidence(registration,[partial,partial],e.blindSeed),/DUPLICATE/);
 const early=structuredClone(partial);early.attempts[0].startedAt='2000-01-01T00:00:00Z';assert.throws(()=>mergeEvidence(registration,[early],e.blindSeed),/PRE_REGISTRATION/);
});
