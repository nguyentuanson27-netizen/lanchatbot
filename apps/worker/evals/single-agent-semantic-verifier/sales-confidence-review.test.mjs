import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRuntime,buildRequest,hash} from './protocol.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const frozen=read('./round-8-gemini/manifest.json');
const corpus=read('./round-8-gemini/corpus-a3.json');
const context=read('./prompts/sales-confidence-context-review-20261007.json');
const candidate=structuredClone(frozen);
candidate.status='DRAFT';
for(const [role,file] of Object.entries({conversation:'fashion-sales-owner-confidence-review',verifier:'semantic-verifier-sales-confidence-review'}))
 candidate.prompts[role]=readFileSync(new URL('./prompts/'+file+'-20261007.vi.txt',import.meta.url),'utf8');

// Local preparation of new authored inputs only; no runner activation/provider call.
function prepare(fixture){
 const c=structuredClone(fixture),t=c.runtime.trusted;
 t.state.factSnapshotVersion=context.sourceVersion;
 for(const policy of t.policyLiterals){
  policy.sourceVersion=context.sourceVersion;
  if(Object.hasOwn(context.policyTexts,policy.ref))policy.text=context.policyTexts[policy.ref];
 }
 for(const profile of t.productProfiles??[]){
  profile.sourceVersion=context.sourceVersion;
  if(Object.hasOwn(context.profileLimitations,profile.ref))profile.details.limitations=context.profileLimitations[profile.ref];
  profile.contentHash=hash(JSON.stringify(profile.details));
 }
 // Exercise the frozen maximum draft size; this is envelope data, not a model result.
 c.runtime.finalDraft='x'.repeat(candidate.bounds.draftBytes);
 return c;
}

test('both role projections retain clarified policy/profile sources and exact code-bound size without changing other business values',()=>{
 for(const original of corpus.cases){
  const c=prepare(original);
  for(const role of ['conversation','verifier']){
   const p=projectRuntime(candidate,c,role,'opaque-review-request');
   assert.deepEqual(p.trusted.policyLiterals,c.runtime.trusted.policyLiterals);
   assert.deepEqual(p.trusted.productProfiles,c.runtime.trusted.productProfiles);
   assert.deepEqual(p.trusted.protectedClaims,original.runtime.trusted.protectedClaims);
   assert.equal(p.requestIdentity.trustedSnapshotId,hash(JSON.stringify(p.trusted)));
   for(const profile of p.trusted.productProfiles??[])assert.equal(profile.contentHash,hash(JSON.stringify(profile.details)));
   assert.equal(hardPrecheck(p.trusted,c.runtime.finalDraft,new Date(c.runtime.evaluationAt)),null);
  }
 }
});

test('captured candidate request bodies remain bounded and exclude evaluator/review/private annotations for every history',()=>{
 const captured=[];
 for(const original of corpus.cases){
  const c=prepare(original),marker='CONFIDENCE_REVIEW_EVALUATOR_ONLY';
  for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
  c.runtime.trusted.state.privateCheckout=marker;
  c.runtime.trusted.policyLiterals[0].rubric=marker;
  for(const profile of c.runtime.trusted.productProfiles??[])profile.details.requiredBehaviors=marker;
  for(const role of ['conversation','verifier'])captured.push({role,body:buildRequest(candidate,role,projectRuntime(candidate,c,role,'opaque-review-request'))});
 }
 assert.equal(captured.length,48);
 for(const {role,body} of captured){
  const text=JSON.stringify(body);
  assert.ok(Buffer.byteLength(text)<=candidate.bounds.totalBytes);
  for(const label of ['CONFIDENCE_REVIEW_EVALUATOR_ONLY','caseId','split','expected','rubric','requiredBehaviors','forbiddenBehaviors','buyerGoal','referenceReplies','privateCheckout'])assert.ok(!text.includes(label),label);
  assert.equal(role==='conversation'?body.systemInstruction.parts[0].text:body.instructions,candidate.prompts[role]);
 }
});
