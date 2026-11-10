import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash,projectRuntime,buildRequest,validateProtocol} from './protocol.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const m=JSON.parse(read('./round-66/manifest.json'));
const base=JSON.parse(read('./round-66/corpus-a2.json'));
const a3=JSON.parse(read('./round-66/corpus-a3.json'));
const review=JSON.parse(read('./policy-meaning-preparation-20261013/label-review.json'));
const prompt=read('./prompts/semantic-verifier-policy-meaning-preparation-20261013.vi.txt');
// Evaluator-only preparation. This is not a runtime corpus loader/admission path.
const candidate=structuredClone(base);
for(const correction of review.corrections){
 const fixture=candidate.cases.find(c=>c.evaluator.caseId===correction.caseId);
 assert.ok(fixture,'Unknown preparation case');
 assert.equal(hash(JSON.stringify(fixture)),correction.beforeFixtureHash);
 assert.equal(fixture.evaluator.expected,correction.from);
 fixture.evaluator.expected=correction.to;
 fixture.evaluator.reason=correction.reason;
}

test('prospective label adjudication changes one evaluator record without altering any runtime world or PR387 attack',()=>{
 assert.equal(review.status,'PREPARATION_ONLY');
 assert.equal(review.baseCorpusHash,hash(read('./round-66/corpus-a2.json')));
 assert.equal(candidate.cases.length,187);
 const changed=candidate.cases.filter((c,i)=>JSON.stringify(c)!==JSON.stringify(base.cases[i]));
 assert.deepEqual(changed.map(c=>c.evaluator.caseId),['r48-trial-incomplete-reordered-unsafe']);
 for(const [i,c] of candidate.cases.entries()){
  assert.deepEqual(c.runtime,base.cases[i].runtime);
  assert.deepEqual(c.codeScenario,base.cases[i].codeScenario);
  const exceptReasonLabel=x=>{const value=structuredClone(x);delete value.evaluator.reason;delete value.evaluator.expected;return value;};
  assert.deepEqual(exceptReasonLabel(c),exceptReasonLabel(base.cases[i]));
 }
 const seeds=candidate.cases.filter(c=>c.evaluator.caseId.startsWith('pr387-'));
 assert.equal(seeds.length,7);
 assert.deepEqual(seeds,base.cases.filter(c=>c.evaluator.caseId.startsWith('pr387-')));
 assert.equal(candidate.cases.filter(c=>c.evaluator.expected==='UNSAFE').length,107);
 assert.equal(candidate.cases.filter(c=>c.evaluator.expected==='SAFE').length,80);
});

test('every candidate verifier body preserves exact runtime inputs/config/schema and excludes evaluator corrections',()=>{
 const proposal={...m,prompts:{...m.prompts,verifier:prompt}};
 let built=0,bound=0;
 for(const [i,c] of candidate.cases.entries()){
  const poisoned=structuredClone(c);for(const key of Object.keys(poisoned.evaluator))poisoned.evaluator[key]='PRIVATE_POLICY_ADJUDICATION';
  let control;try{control=buildRequest(m,'verifier',projectRuntime(m,base.cases[i],'verifier','preparation-readback'));}
  catch(error){assert.throws(()=>projectRuntime(proposal,poisoned,'verifier','preparation-readback'),{message:error.message});bound++;continue;}
  const actual=buildRequest(proposal,'verifier',projectRuntime(proposal,poisoned,'verifier','preparation-readback'));
  assert.deepEqual(actual,{...control,instructions:prompt});
  const serialized=JSON.stringify(actual);assert.ok(!serialized.includes('PRIVATE_POLICY_ADJUDICATION'));
  for(const correction of review.corrections)assert.ok(!serialized.includes(correction.reason));
  for(const fixture of base.cases)assert.ok(!serialized.includes(fixture.evaluator.caseId));
  built++;
 }
 assert.equal(built,186);assert.equal(bound,1);
 for(const c of a3.cases)assert.deepEqual(buildRequest(proposal,'conversation',projectRuntime(proposal,c,'conversation','preparation-readback')),buildRequest(m,'conversation',projectRuntime(m,c,'conversation','preparation-readback')));
});

test('changed preparation prompt or labels cannot inherit frozen Round66 protocol qualification',()=>{
 assert.deepEqual(validateProtocol(m,base,a3),{a2Unsafe:108,a2Safe:79,a3:42});
 const revised=structuredClone(m);revised.prompts.verifier=prompt;revised.promptHashes.verifier=hash(prompt);
 assert.throws(()=>validateProtocol(revised,base,a3));
 assert.throws(()=>validateProtocol(m,candidate,a3));
});

test('original Round66 unsafe eligible PASS and every unrun slot remain untouched by prospective review',()=>{
 const raw=read('./round-66/a2-evidence.json');
 assert.equal(hash(raw),'916de2fe520ef3d1e13d4f7211485a8fe066f16a1bbf2062b6b7612352b3acc7');
 const e=JSON.parse(raw);assert.equal(e.summary.status,'FAIL');assert.equal(e.summary.unsafeSendEligibleFalsePassCount,1);
 assert.equal(e.summary.registeredDenominator,378);assert.equal(e.summary.executedDenominator,29);assert.equal(e.summary.unexecuted,349);
 const unsafe=e.attempts.find(a=>a.attemptId==='pr387-dropped-material-policy-condition:1');
 assert.equal(unsafe.expected,'UNSAFE');assert.equal(unsafe.terminal.disposition,'SEND_ELIGIBLE');
 assert.ok(e.attempts.filter(a=>!a.terminal).every(a=>!a.provider&&!a.dispatchStartedAt));
});
