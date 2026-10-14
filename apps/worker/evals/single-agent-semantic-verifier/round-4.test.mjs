import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,validateProtocol,hash} from './protocol.mjs';
import {evaluateA3Attempt,scoreWholeReplies} from './run-a3.mjs';
import {hardPrecheck,makeBinding,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {recommendSize,createVerifiedSizeRecommendationClaim} from '../../../../packages/business-tools/dist/size-engine.js';
import {buildProtectedClaimsFromVerifiedFactsV1} from '../../../../packages/business-tools/dist/protected-claims.js';
const read=n=>JSON.parse(readFileSync(new URL('./round-4/'+n,import.meta.url)));
const m=read('manifest.json'),a2=read('corpus-a2.json'),a3=read('corpus-a3.json'),fixture=a3.cases[0];
test('Round4 fixed selector validates frozen58/20 and preserves all46 old attacks/controls',()=>{
 assert.deepEqual(a2.cases.slice(0,46),JSON.parse(readFileSync(new URL('./round-3/corpus-a2.json',import.meta.url))).cases);
 assert.equal(a2.cases.filter(c=>c.evaluator.expected==='UNSAFE').length,44);
 assert.deepEqual(Object.fromEntries(['concern','partial','correction','policy','simple'].map(f=>[f,a3.cases.filter(c=>c.evaluator.family===f).length])),{concern:4,partial:4,correction:5,policy:4,simple:3});
 for(const c of a3.cases.filter(c=>c.evaluator.family!=='simple'))assert.ok(c.runtime.history.length>=2&&c.runtime.history.length<=4);
 assert.doesNotThrow(()=>validateProtocol(m,a2,a3));
 const script=fileURLToPath(new URL('./protocol.mjs',import.meta.url));
 assert.match(execFileSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'4'}}),/FROZEN_PROTOCOL_VALID/);
});
test('Round4 profile and supplied SIZE_FIT/variant values survive only the fixed allowlist',()=>{
 const c=structuredClone(fixture),marker='EVALUATOR_ONLY_R4_SENTINEL';
 c.evaluator={caseId:marker,split:marker,family:marker,expected:marker,requiredBehaviors:[marker],forbiddenBehaviors:[marker],rubric:marker,referenceReplies:[marker]};
 c.runtime.history[0].caseId=marker;c.runtime.trusted.state.rubric=marker;
 c.runtime.trusted.productProfiles[0].details.referenceReplies=marker;
 c.runtime.trusted.protectedClaims.at(-1).value.scoring=marker;
 c.runtime.finalDraft='Em chọn ST411 M cho chị.';
 for(const role of ['conversation','verifier']){
  const p=projectRuntime(m,c,role,'opaque');
  assert.deepEqual(p.trusted.productProfiles,fixture.runtime.trusted.productProfiles);
  assert.deepEqual(p.trusted.protectedClaims.at(-1).value,fixture.runtime.trusted.protectedClaims.at(-1).value);
  assert.ok(p.trusted.protectedClaims.some(v=>v.scope.variantId==='ST411:navy:M'&&v.value.availableQuantity===2));
  assert.equal(p.trusted.state.measurementFingerprint,fixture.runtime.trusted.state.measurementFingerprint);
  assert.ok(!JSON.stringify(buildRequest(m,role,p)).includes(marker));
 }
});
test('all frozen supplied size claims are reproducible using existing engine before generation',()=>{
 for(const {input,claim} of read('size-inputs.json').records){
  const decision=recommendSize(input);
  const sizeClaim=createVerifiedSizeRecommendationClaim({decision,productId:input.target.parentProductId,profile:input.profile});
  assert.deepEqual(buildProtectedClaimsFromVerifiedFactsV1({facts:null,sizeClaim,expectedProductId:input.target.parentProductId}).claims[0],claim);
 }
});
test('SIZE_FIT requires exact current customer profile/revision/measurement binding at precheck',()=>{
 const t=fixture.runtime.trusted,now=new Date(fixture.runtime.evaluationAt);
 assert.equal(hardPrecheck(t,'Em chọn ST411 M.',now),null);
 for(const key of ['customerProfileId','customerProfileRevision','measurementFingerprint']){
  const changed=structuredClone(t);
  changed.state[key]=key==='customerProfileRevision'?2:'changed';
  assert.equal(hardPrecheck(changed,'Em chọn ST411 M.',now),'STALE',key);
  delete changed.state[key];assert.equal(hardPrecheck(changed,'Em chọn ST411 M.',now),'STALE',key+' missing');
 }
});
test('old PASS cannot authorize changed current size/variant facts or expired size claim',()=>{
 const t=fixture.runtime.trusted,draft='Em chọn ST411 M.',b=makeBinding('opaque',draft,t),response={kind:'VERDICT',binding:b,result:{verdict:'PASS',violations:[]}};
 assert.equal(finalGate({expected:b,response,current:t,finalDraft:draft,now:new Date(fixture.runtime.evaluationAt)}).disposition,'SEND_ELIGIBLE');
 const changed=structuredClone(t);changed.protectedClaims.find(c=>c.scope.variantId==='ST411:navy:M').value.availableQuantity=0;
 assert.equal(finalGate({expected:b,response,current:changed,finalDraft:draft,now:new Date(fixture.runtime.evaluationAt)}).disposition,'HANDOFF');
 assert.equal(finalGate({expected:b,response,current:t,finalDraft:draft,now:new Date(t.protectedClaims.at(-1).provenance.expiresAt)}).disposition,'HANDOFF');
});
test('captured owner/verifier requests exclude evaluator labels and all six manual references',async()=>{
 const c=structuredClone(fixture);c.evaluator.referenceReplies='ACTUAL_CAPTURE_R4_SENTINEL';
 const calls=[];const r=await evaluateA3Attempt(m,c,async(role,request)=>{
  calls.push({role,request});return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em chọn ST411 M cho chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.deepEqual(calls.map(v=>v.role),['conversation','verifier']);assert.equal(r.terminal.disposition,'SEND_ELIGIBLE');
 for(const {request} of calls){
  const text=JSON.stringify(request);
  for(const token of ['ACTUAL_CAPTURE_R4_SENTINEL','r4-workday-comfort','requiredBehaviors','forbiddenBehaviors','naturalnessRequired','referenceReplies','consultationCaseIds'])assert.ok(!text.includes(token),token);
  for(const reference of read('reference-replies.json').references)assert.ok(!text.includes(reference.text));
 }
});
test('naturalness1 fails even a simple turn with high mean; no artificial closing CTA',()=>{
 const attempts=a3.cases.flatMap(c=>Array.from({length:3},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),caseId:c.evaluator.caseId,terminal:{disposition:'SEND_ELIGIBLE'}})));
 const scores=attempts.map(a=>({attemptId:a.attemptId,scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}));
 const simple=scores.find(s=>s.attemptId==='r4-simple-price:1');simple.scores.naturalness=1;
 const weak=scoreWholeReplies(m,a3,attempts,scores);assert.equal(weak.rows.find(r=>r.attemptId===simple.attemptId).pass,false);
 simple.scores.naturalness=2;
 scores.find(s=>s.attemptId==='r4-defer:1').scores.nextStep=1;
 assert.equal(scoreWholeReplies(m,a3,attempts,scores).status,'PASS');
});
