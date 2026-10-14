import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
process.env.C3_CHECKPOINT_A_ROUND='5';process.env.C3_CHECKPOINT_A_ONE_PASS='1';
const {validateProtocol,projectRuntime,buildRequest,inputUrl}=await import('./protocol.mjs');
const runner=await import('./run-a2.mjs');
const read=n=>JSON.parse(readFileSync(new URL('./round-5/one-pass/'+n,import.meta.url)));
const m=read('manifest.json'),a2=read('corpus-a2.json'),a3=read('corpus-a3.json'),prior=JSON.parse(readFileSync(new URL('./round-5/a2-evidence.json',import.meta.url)));
test('owner one-pass amendment selects isolated inputs and preserves unchanged model/population/quality bars',()=>{
 assert.match(inputUrl('manifest.json').pathname,/round-5\/one-pass\/manifest.json$/);
 assert.doesNotThrow(()=>validateProtocol(m,a2,a3));assert.equal(m.repetitions,1);
 const old=JSON.parse(readFileSync(new URL('./round-5/manifest.json',import.meta.url)));
 assert.deepEqual(m.models,old.models);assert.deepEqual(m.prompts,old.prompts);assert.deepEqual(m.corpusHashes,old.corpusHashes);
 assert.deepEqual(m.scoring.consultationDimensions,old.scoring.consultationDimensions);assert.equal(m.scoring.minimumFamilyPassRate,.9);
 const request=JSON.stringify(buildRequest(m,'conversation',projectRuntime(m,a3.cases[0],'conversation','opaque')));
 assert.ok(!request.includes('ownerAmendment'));assert.ok(!request.includes('remainingCaseIds'));
});
test('one-pass registrations adopt all92completed results/errors and execute only35 untouched cases',()=>{
 const attempts=runner.registerA2Attempts(m,a2,prior);
 assert.equal(attempts.length,127);assert.equal(attempts.filter(a=>a.terminal).length,92);
 assert.deepEqual(attempts.filter(a=>a.terminal).map(({originRunSourceSha,...a})=>a),prior.attempts.filter(a=>a.terminal));
 assert.equal(attempts.filter(a=>a.provider?.status==='PROVIDER_ERROR').length,2);
 const adoptedCases=new Set(attempts.filter(a=>a.terminal).map(a=>a.caseId));
 const pending=attempts.filter(a=>!a.terminal);assert.equal(new Set(pending.map(a=>a.caseId)).size,35);
 assert.ok(pending.every(a=>!adoptedCases.has(a.caseId)&&a.repetition===1));
 assert.deepEqual(attempts.map(a=>a.attemptId),m.ownerAmendment.registeredAttemptIds);
 const changed=structuredClone(prior);changed.attempts[0].terminal.text='changed';
 assert.throws(()=>runner.registerA2Attempts(m,a2,changed),/PRIOR_EVIDENCE_CHANGED/);
});
