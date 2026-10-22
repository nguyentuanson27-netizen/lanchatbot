import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSnapshotDiff} from './snapshot-diagnosis.mjs';
test('snapshot diagnosis exposes changed source versions without private payloads',()=>{
 const before={state:{revision:1,bindingVersion:'v1',customerMeasurements:[{value:'PRIVATE_MEASUREMENT'}],history:'PRIVATE_HISTORY'},protectedClaims:[{type:'PRICE',scope:{productId:'P1'},value:{amountVnd:499000,currency:'VND',extra:'PRIVATE_VALUE'},provenance:{sourceVersion:'v1',observedAt:'2026-10-22'}}],policyLiterals:[],runtimeProducts:[],effectReceipts:[{text:'PRIVATE_RECEIPT'}]};
 const after=structuredClone(before);after.protectedClaims[0].provenance.sourceVersion='v2';
 const result=publicSnapshotDiff(before,after);
 assert.equal(result.status,'COMPARED');assert.ok(result.changes.some(c=>c.path.endsWith('sourceVersion')));
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_/);
 assert.equal(publicSnapshotDiff(null,after).status,'INSUFFICIENT_EVIDENCE');
});
test('snapshot diagnosis retains explicit truncation and a bounded output',()=>{
 const ctx=v=>({state:{revision:v},policyLiterals:Array.from({length:30},(_,i)=>({ref:'p'+i,sourceVersion:'v'+v,observedAt:String(v),expiresAt:null,text:'PRIVATE_URL'}))});
 const result=publicSnapshotDiff(ctx(1),ctx(2));
 assert.ok(result.truncated);assert.ok(result.changes.length<=20);assert.ok(Buffer.byteLength(JSON.stringify(result))<=4096);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_URL/);
});

test('all same-scope claims survive projection without an overwritten source',()=>{
 const c={state:{},protectedClaims:[{type:'ETA',scope:{productId:'P1',variantId:'v1'},value:{minDays:1,maxDays:2},provenance:{sourceVersion:'a'}},{type:'ETA',scope:{productId:'P1',variantId:'v1'},value:{minDays:3,maxDays:4},provenance:{sourceVersion:'b'}}]};
 const after=structuredClone(c);after.protectedClaims[0].value.maxDays=5;
 const result=publicSnapshotDiff(c,after);assert.ok(result.changes.some(x=>x.path.endsWith('maxDays')&&x.before===2&&x.after===5));
});
