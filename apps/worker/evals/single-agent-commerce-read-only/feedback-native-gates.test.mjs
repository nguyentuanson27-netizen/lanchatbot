import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNativePrefix,validateControlsEvidence} from './feedback-native-gates.mjs';
import {customerOutcome} from './delivery-capture.mjs';
import {sha256} from './protocol.mjs';
const identity={sourceSha:'a'.repeat(40),promptHashes:{owner:'o',verifier:'v'},models:{verifier:'high'}};
function prefix(){
 const expected=Array.from({length:21},(_,i)=>'case-'+i);
 const actual=expected.map((caseId,i)=>{const terminal={disposition:i===0?'HANDOFF':'SEND_ELIGIBLE'};return {caseId,hash:'hash-'+i,terminal,evidenceMode:'SEND_ELIGIBILITY_ONLY',result:{terminal,generations:[]}};});
 const review={identity,allowRest:true,entries:actual.map(a=>({caseId:a.caseId,artifactHash:a.hash,terminal:a.terminal,customerOutcomeHash:sha256(JSON.stringify(customerOutcome(a,a.evidenceMode))),safety:'PASS',regression:false,reason:'Whole-turn review completed.'}))};
 return {identity,expected,actual,review};
}
test('a complete reviewed prefix allows expected handoff without requiring every outcome eligible',()=>assert.doesNotThrow(()=>validateNativePrefix(prefix())));
test('missing or duplicate actuals, provider error, wrong source/config or a flag alone cannot open rest',()=>{
 for(const mutate of [p=>p.actual.pop(),p=>p.actual[20]=p.actual[0],p=>p.actual[20].result.generations.push({status:'ERROR'}),
  p=>p.review.identity={...identity,promptHashes:{owner:'o',verifier:'baseline'}},p=>p.review={identity,allowRest:true},
  p=>p.review.entries[20].artifactHash='old-hash',p=>p.review.entries[20].regression=true]){
  const p=prefix();mutate(p);assert.throws(()=>validateNativePrefix(p));
 }
});
test('changed actual customer outcome after review cannot open native rest',()=>{
 const p=prefix(),a=p.actual[20];a.evidenceMode='CAPTURE_TRANSPORT';a.result.enqueued=1;a.actualCapturedMessages=['Actual committed reply'];a.actualCapturedAttachments=[];
 a.deliveryEvidence={outboxRows:[{id:'out-1',group:'group-1',sequence:0,status:'SENT_ACCEPTED'}]};
 assert.throws(()=>validateNativePrefix(p),/PREFIX_CUSTOMER_OUTCOME_CHANGED/);
});
test('controls PASS flag or old-source summary alone never authorizes native',()=>{
 assert.throws(()=>validateControlsEvidence({identity,summary:{controlsPass:true,identity},bundle:{},attempts:[],requests:[]}));
});
test('persisted eligible reply with enqueued intent but no actual capture must not open rest',()=>{
 const p=prefix();
 for(const a of p.actual){a.evidenceMode='CAPTURE_TRANSPORT';a.result.enqueued=1;a.actualCapturedMessages=[];a.actualCapturedAttachments=[];}
 assert.throws(()=>validateNativePrefix(p));
});
