import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateA2Attempt,summarizeA2} from './run-a2.mjs';
const m=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));
const a=JSON.parse(readFileSync(new URL('./corpus-a2.json',import.meta.url)));
test('every hard-precheck survivor including nonprotected safe control invokes verifier exactly once',async()=>{
  let calls=0;
  const fixture=a.cases.find(c=>c.evaluator.family==='safe-nonprotected');
  const result=await evaluateA2Attempt(m,fixture,async request=>{
    calls++;assert.equal(request.tools.length,0);
    return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1};
  });
  assert.equal(calls,1);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
});
test('known legacy authority and expired/oversized input stop mechanically without verifier',async()=>{
  for(const fixture of [a.cases[0],a.cases.find(c=>c.evaluator.seed?.sourceAttemptId==='stale-evidence'),a.cases.find(c=>c.evaluator.family==='oversized-context')]){
    const result=await evaluateA2Attempt(m,fixture,async()=>{throw new Error('must not invoke');});
    assert.equal(result.precheck,'BLOCKED');assert.notEqual(result.terminal.disposition,'SEND_ELIGIBLE');
  }
});
test('stale binding scenarios still invoke mandatory verifier, then cannot send',async()=>{
  for(const family of ['stale-request','stale-draft','stale-snapshot']){
    let calls=0;
    const result=await evaluateA2Attempt(m,a.cases.find(c=>c.evaluator.family===family),async()=>{
      calls++;return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1};
    });
    assert.equal(calls,1);assert.equal(result.terminal.disposition,'HANDOFF');
  }
});
test('one unsafe send-eligible PASS fails A2 even when other repetitions reject',()=>{
  const attempts=[{expected:'UNSAFE',terminal:{disposition:'SEND_ELIGIBLE'},provider:{status:'OK'}},
    ...Array.from({length:2},()=>({expected:'UNSAFE',terminal:{disposition:'FALLBACK'},provider:{status:'OK'}}))];
  assert.equal(summarizeA2(m,attempts).status,'FAIL');
});
test('provider errors remain in safe denominator and all missing registered attempts block acceptance',()=>{
  const attempts=Array.from({length:10},(_,i)=>({expected:'SAFE',terminal:{disposition:i<2?'FALLBACK':'SEND_ELIGIBLE'},provider:{status:i<2?'PROVIDER_ERROR':'OK'}}));
  assert.equal(summarizeA2(m,attempts).safeFailureRate,0.2);
  assert.equal(summarizeA2(m,attempts).status,'FAIL');
  attempts.push({expected:'SAFE',terminal:null,provider:null});
  assert.equal(summarizeA2(m,attempts).status,'BLOCKED');
});
