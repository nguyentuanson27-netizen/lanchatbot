import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaRevalidationOperatorOutcome} from './media-revalidation-operator-outcome.mjs';
const proof=status=>({version:1,status,checkedAt:'2026-10-28T12:00:00.000Z',metadataSha256:'a'.repeat(64)});
const outcome=(results,rest={})=>mediaRevalidationOperatorOutcome({apply:true,results,notRun:[],semanticFieldsUnchanged:true,...rest});
for(const status of ['VERIFIED','INVALID'])test(`last-point unknown ${status} write cannot report COMPLETE even if final payload appears present`,()=>{
 const p=proof(status);
 assert.deepEqual(outcome([{status:'WRITE_UNCONFIRMED',proposedProof:p,observedProof:p}]),{status:'WRITE_UNCONFIRMED_RETAIN_EVIDENCE',exitCode:1});
});
test('confirmed verification and explicit invalidation can complete without claiming all images are verified',()=>{
 const good=proof('VERIFIED'),bad=proof('INVALID');
 assert.deepEqual(outcome([{status:'VERIFIED',proposedProof:good,observedProof:good},{status:'BLOCKED',proposedProof:bad,observedProof:bad}]),{status:'COMPLETE',exitCode:0});
});
test('proposed INVALID without actual proof and a concurrent changed proof cannot count as confirmed',()=>{
 const p=proof('INVALID');
 for(const observedProof of [null,{...p,checkedAt:'2026-10-28T12:00:01.000Z'}])
  assert.equal(outcome([{status:'BLOCKED',proposedProof:p,observedProof}]).exitCode,1);
});
test('source changes and unfinished bounded points remain failures',()=>{
 assert.equal(outcome([],{semanticFieldsUnchanged:false}).status,'SOURCE_CHANGED_RETAIN_EVIDENCE');
 assert.equal(outcome([],{notRun:['last-point']}).status,'INCOMPLETE_RETAIN_EVIDENCE');
});
test('preflight reports planned checks only and cannot accept a blocked preparation as complete',()=>{
 assert.equal(outcome([{status:'WOULD_VERIFY'},{status:'WOULD_INVALIDATE'}],{apply:false}).exitCode,0);
 assert.equal(outcome([{status:'BLOCKED'}],{apply:false}).exitCode,1);
});
