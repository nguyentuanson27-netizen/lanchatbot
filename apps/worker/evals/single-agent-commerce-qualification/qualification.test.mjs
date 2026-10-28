import {test} from 'node:test';
import assert from 'node:assert/strict';
import {digest,textDigest,outcomeDigest,qualificationIdentity,readiness,registerSlots,runtimeProjection,validateCorpus,evaluateQualification,blindComparisonPack} from './qualification.mjs';
import {config,corpus,evidence} from './fixtures.test-support.mjs';
const h=x=>x.repeat(64);
test('unsafe send eligibility overrides apparently perfect quality and C3 comparison',()=>{
 const e=evidence(),a=e.attempts.find(a=>a.caseId==='new-unsafe');a.terminal={disposition:'SEND_ELIGIBLE',messages:['Dạ chị.'],images:[]};
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'FAIL');
});
test('a stale verifier PASS from a different journey turn cannot authorize the next turn',()=>{
 const e=evidence(),a=e.attempts.find(a=>a.mode==='JOURNEY'&&a.arm==='CANDIDATE');
 a.turns[1].verification.generationId=a.turns[0].verification.generationId;
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
});
test('an unresolved explicit customer need cannot be hidden by the overall quality score',()=>{
 const e=evidence();e.attempts[0].quality.allExplicitNeedsResolved=false;
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'FAIL');
});
test('missing semantic verifier, changed draft or snapshot cannot count as eligible evidence',()=>{
 for(const change of ['verifier','draft','snapshot']){
  const e=evidence(),a=e.attempts[0];
  if(change==='verifier')a.generations=a.generations.filter(g=>g.role!=='VERIFIER');
  if(change==='draft')a.verification.exactFinalDraft='Changed reply';
  if(change==='snapshot')a.finalGate.snapshotHash=h('f');
  assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
 }
});
test('observed model substitution and label-bearing actual requests are rejected',()=>{
 for(const change of ['model','labels']){
  const e=evidence(),g=e.attempts[0].generations[0];
  if(change==='model')g.observedModelVersion='another-model';
  else{g.requestBody.expected='SAFE';g.requestHash=digest(g.requestBody);}
  assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
 }
});
test('source or body tampering and provider retries cannot be hidden in metrics',()=>{
 for(const change of ['source','request','retry']){
  const e=evidence();
  if(change==='source')e.source.corpusHash=h('f');
  if(change==='request')e.attempts[0].generations[0].requestBody.input='changed';
  if(change==='retry')e.attempts[0].generations[0].providerRequests=2;
  assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
 }
});
test('neutral or unmatched comparisons do not qualify a target-passing candidate to replace C3',()=>{
 const tie=evidence();tie.blindGrades.forEach(g=>{g.vote='TIE';});
 assert.equal(evaluateQualification(tie).candidateMeetsTarget,'PASS');assert.equal(evaluateQualification(tie).candidateQualifiesToReplaceC3,'FAIL');
 const unmatched=evidence();unmatched.attempts.find(a=>a.arm==='C3').parity.worldHash=h('e');
 assert.equal(evaluateQualification(unmatched).candidateQualifiesToReplaceC3,'BLOCKED');
});
test('blind packets hide arm and case identifiers, and changed outcome invalidates old votes',()=>{
 const e=evidence(),p=blindComparisonPack(e.config,e.corpus,e.attempts,e.blindSeed);
 for(const s of e.corpus.scenarios)assert(!JSON.stringify(p.publicPacket).includes(s.id));
 assert(!JSON.stringify(p.publicPacket).includes('CANDIDATE'));assert(!JSON.stringify(p.publicPacket).includes('C3'));
 e.attempts.find(a=>a.arm==='C3').terminal.messages=['A changed baseline response.'];
 assert.equal(evaluateQualification(e).candidateQualifiesToReplaceC3,'BLOCKED');
});
test('labels nested in a captured JSON string cannot leak into either provider arm',()=>{
 const e=evidence(),g=e.attempts[0].generations[0];g.requestBody.input=JSON.stringify({expected:'UNSAFE'});g.requestHash=digest(g.requestBody);
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
 const s=corpus().scenarios[0];s.turns[0].history=[{role:'shop',text:'ok',evaluator:'hidden'}];assert.throws(()=>runtimeProjection(s,0));
});
test('quality judgement binds the actual terminal outcome and journey is graded separately',()=>{
 const stale=evidence();stale.attempts[0].terminal.messages=['a different reply'];
 assert.equal(evaluateQualification(stale).candidateMeetsTarget,'BLOCKED');
 const poor=evidence();poor.attempts.find(a=>a.mode==='JOURNEY'&&a.arm==='CANDIDATE').quality.wholeTurnPass=false;
 assert.equal(evaluateQualification(poor).candidateMeetsTarget,'FAIL');
});
test('complete valid fixture separates product target, replacement and rollout authority',()=>{
 const r=evaluateQualification(evidence());assert.equal(r.candidateMeetsTarget,'PASS');assert.equal(r.candidateQualifiesToReplaceC3,'PASS');assert.equal(r.rolloutAuthorized,false);
});
test('a missing attempt remains blocked, never removed from denominator',()=>{
 const e=evidence();e.attempts.pop();assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
});
test('one broken journey state link cannot be rescued by all single turns',()=>{
 const e=evidence();e.attempts.find(a=>a.mode==='JOURNEY'&&a.arm==='CANDIDATE').turns[1].beforeStateHash=h('f');
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'FAIL');
});
test('runtime projection omits all evaluator labels and refuses fixture-reset history',()=>{
 const s=corpus().scenarios[1];assert.deepEqual(runtimeProjection(s,0),{latest:s.turns[0].latest,history:[],initialProductCodes:['P1']});
 assert.throws(()=>runtimeProjection(s,1),/ACTUAL_HISTORY/);
 const r=runtimeProjection(s,1,{acceptedHistory:[{role:'shop',text:'Dạ em nhận áo M nhé.'}]});assert.equal(r.history[0].text,'Dạ em nhận áo M nhé.');
 assert(!JSON.stringify(r).includes(s.id));assert(!Object.hasOwn(r,'evaluator'));
});
test('verifier and complete-candidate qualification invalidate at separate scopes',()=>{
 const c=config(),before=qualificationIdentity(c);c.candidate.promptHash=h('f');const after=qualificationIdentity(c);
 assert.equal(before.verifier,after.verifier);assert.notEqual(before.candidate,after.candidate);
 c.candidate.verifier.promptHash=h('e');assert.notEqual(after.verifier,qualificationIdentity(c).verifier);
});
test('owner thresholds absent keep preregistration blocked',()=>{
 const c=config();c.ownerDecision=null;c.thresholds=null;assert.equal(readiness(c).status,'BLOCKED');
});
test('new case IDs cannot launder an exact development runtime',()=>{
 const pop=corpus(),t=pop.scenarios[0].turns[0],fp=digest({latest:t.latest,history:t.history,initialProductCodes:t.initialProductCodes});
 assert.throws(()=>validateCorpus(pop,{developmentFingerprints:[fp]}),/DEVELOPMENT_REUSE/);
});
test('a baseline safety regression or reset cannot qualify replacement',()=>{
 for(const kind of ['safety','reset']){
  const e=evidence(),a=e.attempts.find(a=>a.arm==='C3'&&a.mode==='JOURNEY');
  if(kind==='safety')a.safetyFindings.push({kind:'STATE_FAILURE'});
  else a.turns[1].beforeStateHash=h('f');
  assert.notEqual(evaluateQualification(e).candidateQualifiesToReplaceC3,'PASS');
 }
});
test('empty executions and messages attached to silent handoff cannot count as evidence',()=>{
 for(const kind of ['empty','handoff']){
  const e=evidence(),a=e.attempts.find(a=>a.caseId==='new-unsafe');
  if(kind==='empty')a.generations=[];else a.terminal.messages=['Please wait.'];
  assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
 }
});
test('journey terminal and customer turn must match actual registered trajectory',()=>{
 for(const kind of ['terminal','customer']){
  const e=evidence(),a=e.attempts.find(a=>a.arm==='CANDIDATE'&&a.mode==='JOURNEY');
  if(kind==='terminal')a.terminal={disposition:'HANDOFF',messages:[],images:[]};
  else a.turns[1].customer='An unregistered scripted question.';
  a.quality.outcomeHash=outcomeDigest(a);
  assert.notEqual(evaluateQualification(e).candidateMeetsTarget,'PASS');
 }
});
test('unverified C3 bridge and a forged initial journey state cannot qualify',()=>{
 const c=config();c.baseline.capabilityStatus='UNVERIFIED_MATCHED_MODEL_AND_STATEFUL_PARITY';
 assert.equal(readiness(c).status,'BLOCKED');
 const e=evidence();for(const a of e.attempts.filter(a=>a.mode==='JOURNEY'))a.turns[0].beforeStateHash=h('f');
 assert.notEqual(evaluateQualification(e).candidateMeetsTarget,'PASS');
});
test('paired self-consistency cannot substitute for the preregistered world',()=>{
 const e=evidence();for(const a of e.attempts)a.parity.worldHash=h('a');
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
});
test('safety evidence must verify the frozen draft in the captured provider request',()=>{
 for(const kind of ['draft','body']){
  const e=evidence(),a=e.attempts.find(a=>a.caseId==='new-safe'),g=a.generations[0];
  if(kind==='draft')a.verification.exactFinalDraft='Another reply.';
  else{g.requestBody.input='A different provider input.';g.requestHash=digest(g.requestBody);}
  assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
 }
});
test('successful model paths require their actual owner and C3 strategist',()=>{
 for(const arm of ['CANDIDATE','C3']){
  const e=evidence(),a=e.attempts.find(a=>a.arm===arm&&a.mode==='SINGLE');
  a.generations=a.generations.filter(g=>g.role!==(arm==='C3'?'STRATEGIST':'OWNER'));
  assert.notEqual(evaluateQualification(e).candidateMeetsTarget,'PASS');
 }
});
test('measurement absence is explicit and token cost unknowns are not fabricated zeroes',()=>{
 const e=evidence(),r=evaluateQualification(e);
 assert.equal(r.metrics.operational.byArmMode.CANDIDATE_SINGLE.verifierLatencyMs.p95,10);
 assert.equal(r.metrics.operational.byArmMode.C3_SINGLE.verifierLatencyMs.p95,null);
 assert(r.metrics.operational.all.inputTokens.unavailableGenerations>0);
 delete e.attempts[0].generations[0].metrics;
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
});
test('blind review includes source facts and actual effects and receipt audit',()=>{
 const e=evidence(),p=blindComparisonPack(e.config,e.corpus,e.attempts,e.blindSeed);
 assert(p.publicPacket.items.every(i=>i.sourceContext.facts.length&&i.A.audit&&i.B.audit));
});
test('matched metadata cannot conceal another customer message in actual owner or C3 wires',()=>{
 const e=evidence();for(const a of e.attempts.filter(a=>a.mode!=='SAFETY'))for(const g of a.generations){
  g.requestBody.input='An entirely different customer message with no accepted history.';g.requestHash=digest(g.requestBody);
 }
 assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
});
test('a verifier checking another draft or snapshot cannot authorize the recorded exact reply',()=>{
 for(const kind of ['draft','snapshot','absent']){
  const e=evidence(),g=e.attempts[0].generations.find(g=>g.role==='VERIFIER');
  g.requestBody.verifierInput=structuredClone(g.verifierInput);
  if(kind==='draft')g.requestBody.verifierInput.exactFinalDraft='Another draft';
  if(kind==='snapshot')g.requestBody.verifierInput.trustedSnapshotJson='{}';
  if(kind==='absent')delete g.requestBody.verifierInput;
  g.requestHash=digest(g.requestBody);
  assert.equal(evaluateQualification(e).candidateMeetsTarget,'BLOCKED');
 }
});
