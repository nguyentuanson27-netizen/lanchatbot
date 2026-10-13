import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash,projectRuntime,buildRequest,validateProtocol} from './protocol.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));
const base=json('./round-66/corpus-a2.json');
const core=json('./round-2/corpus-a2.json');
const manifest=json('./round-66/manifest.json');
const a3=json('./round-66/corpus-a3.json');
const labels=json('./policy-meaning-preparation-20261013/label-review.json');
const selection=json('./corpus-reduction-preparation-20261014/selection.json');
const reduced=json('./corpus-reduction-preparation-20261014/corpus-a2.json');
const byId=new Map(base.cases.map(c=>[c.evaluator.caseId,c]));
const keptIds=new Set(reduced.cases.map(c=>c.evaluator.caseId));
const runtimeHash=c=>hash(JSON.stringify({runtime:c.runtime,codeScenario:c.codeScenario??null}));
const recent=selection.recentEvidenceRounds.map(round=>{
 const file=round===63?'a2-resumed-evidence.json':'a2-evidence.json';
 return {round,file,evidence:json('./round-'+round+'/'+file),corpus:json('./round-'+round+'/corpus-a2.json')};
});

test('reduced future corpus partitions the original and changes only the previously reviewed evaluator record',()=>{
 assert.equal(selection.status,'PREPARATION_ONLY');
 assert.equal(selection.sourceCorpusHash,hash(read('./round-66/corpus-a2.json')));
 assert.equal(selection.labelReviewHash,hash(read('./policy-meaning-preparation-20261013/label-review.json')));
 assert.equal(selection.candidateVerifierHash,hash(read('./prompts/semantic-verifier-policy-meaning-preparation-20261013.vi.txt')));
 assert.equal(selection.reducedCorpusHash,hash(read('./corpus-reduction-preparation-20261014/corpus-a2.json')));
 assert.deepEqual(selection.counts,{before:187,removed:49,after:138,unsafe:87,safe:51});
 assert.deepEqual(selection.counts,{before:base.cases.length,removed:selection.removals.length,after:reduced.cases.length,unsafe:reduced.cases.filter(c=>c.evaluator.expected==='UNSAFE').length,safe:reduced.cases.filter(c=>c.evaluator.expected==='SAFE').length});
 const removed=new Set(selection.removals.map(c=>c.caseId));
 assert.equal(removed.size,49);assert.equal(keptIds.size,138);
 assert.deepEqual(selection.keepCaseIds,reduced.cases.map(c=>c.evaluator.caseId));
 assert.deepEqual(reduced.cases.map(c=>c.evaluator.caseId),base.cases.filter(c=>!removed.has(c.evaluator.caseId)).map(c=>c.evaluator.caseId));
 assert.equal(reduced.schemaVersion,base.schemaVersion);
 for(const c of reduced.cases){
  const expected=structuredClone(byId.get(c.evaluator.caseId));
  const correction=labels.corrections.find(x=>x.caseId===c.evaluator.caseId);
  if(correction){assert.equal(hash(JSON.stringify(expected)),correction.beforeFixtureHash);expected.evaluator.expected=correction.to;expected.evaluator.reason=correction.reason;}
  assert.deepEqual(c,expected);
 }
 for(const r of selection.removals){
  assert.ok(byId.has(r.caseId));assert.ok(!keptIds.has(r.caseId));assert.ok(r.coveredBy.length);
  assert.equal(r.expected,byId.get(r.caseId).evaluator.expected);
  assert.equal(r.runtimeHash,runtimeHash(byId.get(r.caseId)));
  for(const id of r.coveredBy){assert.ok(keptIds.has(id),'Retired representative '+id);assert.equal(byId.get(id).evaluator.expected,r.expected);}
 }
});

test('all mandatory attacks, paraphrases, source-policy controls and the new adjudication stay in the subset',()=>{
 assert.deepEqual(selection.mandatoryCaseIds,core.cases.map(c=>c.evaluator.caseId));
 for(const id of [...selection.mandatoryCaseIds,...selection.protectedV2CaseIds,...selection.protectedNewLabelCaseIds])assert.ok(keptIds.has(id),'Required case removed '+id);
 assert.deepEqual(selection.protectedNewLabelCaseIds,labels.corrections.map(c=>c.caseId));
 assert.deepEqual(selection.protectedV2CaseIds,base.cases.filter(c=>c.evaluator.caseId.startsWith('r53-v2-')).map(c=>c.evaluator.caseId));
 const seeds=reduced.cases.filter(c=>c.evaluator.seed);assert.equal(seeds.length,7);
 for(const c of seeds)assert.equal(hash(JSON.stringify({runtime:c.runtime,seed:c.evaluator.seed})),manifest.seedHashes[c.evaluator.seed.sourceAttemptId]);
 for(const family of ['wrong-subject','negation-inversion','material-condition-loss','policy-strengthening','effect-without-receipt']){
  assert.ok(reduced.cases.filter(c=>c.evaluator.family===family&&c.evaluator.expected==='UNSAFE'&&!c.evaluator.seed).length>=2,family);
 }
 // Same-answer/different-world contrast must remain a contrast, not a draft-text dedup.
 for(const id of ['r63-same-answer-washed-unsafe','r63-same-answer-bounded-safe','r63-outdoor-refusal-paraphrase-safe','r63-outdoor-permission-unsafe'])assert.ok(keptIds.has(id),id);
});

test('every removal has an exact matched successful observation, while all recent failures and started unknowns remain',()=>{
 const failedIds=new Set();
 for(const {evidence,corpus} of recent){
  for(const fixture of corpus.cases){
   const current=byId.get(fixture.evaluator.caseId);
   if(!current||fixture.evaluator.expected!==current.evaluator.expected||runtimeHash(fixture)!==runtimeHash(current))continue;
   for(const a of evidence.attempts.filter(a=>a.caseId===fixture.evaluator.caseId)){
    if(!a.terminal){if(a.dispatchStartedAt||a.invocationStartedAt)failedIds.add(a.caseId);continue;}
    const matches=(a.expected==='SAFE')===(a.terminal.disposition==='SEND_ELIGIBLE');
    // The required oversized input intentionally fails hard precheck as MALFORMED.
    // It is not a malformed provider verdict, nor a reason to drop a mandatory case.
    const verifierFailure=a.precheck==='SURVIVED'&&(a.provider?.status!=='OK'||['MALFORMED','UNCERTAIN','TIMEOUT','PROVIDER_ERROR'].includes(a.terminal.reason));
    if(!matches||verifierFailure)failedIds.add(a.caseId);
   }
  }
 }
 assert.equal(failedIds.size,16);
 assert.deepEqual(new Set(selection.protectedFailureOrUnknownCaseIds),failedIds);
 for(const id of failedIds)assert.ok(keptIds.has(id),'Failing or unknown case removed '+id);
 for(const r of selection.removals){
  assert.ok(!failedIds.has(r.caseId));assert.equal(r.recentFailureOrUnknownCount,0);
  const p=r.passObservation,record=recent.find(x=>x.round===p.round);
  assert.equal(p.evidenceFile,record.file);assert.equal(p.evidenceHash,hash(read('./round-'+p.round+'/'+p.evidenceFile)));
  const fixture=record.corpus.cases.find(c=>c.evaluator.caseId===r.caseId);
  assert.equal(runtimeHash(fixture),r.runtimeHash);assert.equal(fixture.evaluator.expected,r.expected);
  const a=record.evidence.attempts.find(a=>a.attemptId===p.attemptId);
  assert.equal(a.caseId,r.caseId);assert.equal(a.expected,r.expected);assert.equal(a.precheck,'SURVIVED');
  assert.equal(a.provider.status,'OK');assert.equal(p.providerStatus,'OK');
  assert.equal(p.evidenceRunSourceSha,record.evidence.a2RunSourceSha);
  assert.equal(p.attemptRunSourceSha,a.originRunSourceSha??record.evidence.a2RunSourceSha);
  assert.deepEqual(p.terminal,a.terminal);
  assert.equal(a.terminal.disposition==='SEND_ELIGIBLE',r.expected==='SAFE');
  assert.equal(a.terminal.reason,r.expected==='SAFE'?'PASS':'FAIL');
 }
});

test('selection labels cannot enter requests or inherit frozen admission/results; proposed slots are counted exactly',()=>{
 let built=0,bound=0;
 for(const c of reduced.cases){
  const poisoned=structuredClone(c);for(const key of Object.keys(poisoned.evaluator))poisoned.evaluator[key]='PRIVATE_SELECTION_EVALUATOR';
  let control;try{control=buildRequest(manifest,'verifier',projectRuntime(manifest,byId.get(c.evaluator.caseId),'verifier','subset-readback'));}
  catch(error){assert.throws(()=>projectRuntime(manifest,poisoned,'verifier','subset-readback'),{message:error.message});bound++;continue;}
  const actual=buildRequest(manifest,'verifier',projectRuntime(manifest,poisoned,'verifier','subset-readback'));
  assert.deepEqual(actual,control);assert.ok(!JSON.stringify(actual).includes('PRIVATE_SELECTION_EVALUATOR'));built++;
 }
 assert.equal(built,137);assert.equal(bound,1);
 assert.deepEqual(validateProtocol(manifest,base,a3),{a2Unsafe:108,a2Safe:79,a3:42});
 assert.throws(()=>validateProtocol(manifest,reduced,a3));
 const schedule=selection.proposedSampling;
 assert.deepEqual(schedule.latestRound66FailedCaseIds,['pr387-negation-inversion','pr387-dropped-material-policy-condition']);
 const slots=reduced.cases.reduce((n,c)=>n+(schedule.latestRound66FailedCaseIds.includes(c.evaluator.caseId)?schedule.failedRepetitions:schedule.otherRepetitions),0);
 assert.equal(schedule.failedRepetitions,3);assert.equal(schedule.otherRepetitions,1);
 assert.equal(slots,142);assert.equal(schedule.a2Slots,slots);assert.equal(schedule.combinedIfA2Pass,slots+a3.cases.length);
 assert.equal(schedule.a3CasesUnchanged,42);assert.equal(schedule.a3IfEachOnce,42);
 assert.equal(selection.providerQualificationGenerations,0);assert.equal(selection.newRuntimeAdmission,false);
 assert.equal(hash(read('./round-66/a2-evidence.json')),'916de2fe520ef3d1e13d4f7211485a8fe066f16a1bbf2062b6b7612352b3acc7');
});
