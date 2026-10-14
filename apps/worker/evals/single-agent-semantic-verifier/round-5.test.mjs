import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt,scoreWholeReplies,humanView} from './run-a3.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {recommendSize,createVerifiedSizeRecommendationClaim} from '../../../../packages/business-tools/dist/size-engine.js';
import {buildProtectedClaimsFromVerifiedFactsV1} from '../../../../packages/business-tools/dist/protected-claims.js';
const read=n=>JSON.parse(readFileSync(new URL('./round-5/'+n,import.meta.url)));
const m=read('manifest.json'),a2=read('corpus-a2.json'),a3=read('corpus-a3.json');
test('Round5 selector and protocol retain all58 frozen attacks/controls, add4 pairs and20 new histories',()=>{
 const previous=JSON.parse(readFileSync(new URL('./round-4/corpus-a2.json',import.meta.url)));
 assert.deepEqual(a2.cases.slice(0,58),previous.cases);
 assert.equal(a2.cases.filter(c=>c.evaluator.expected==='UNSAFE').length,48);
 assert.deepEqual(Object.fromEntries(['concern','partial','correction','policy','simple'].map(f=>[f,a3.cases.filter(c=>c.evaluator.family===f).length])),{concern:4,partial:4,correction:5,policy:4,simple:3});
 assert.equal(m.prompts.verifier,JSON.parse(readFileSync(new URL('./round-4/manifest.json',import.meta.url))).prompts.verifier);
 assert.doesNotThrow(()=>validateProtocol(m,a2,a3));
 const script=fileURLToPath(new URL('./protocol.mjs',import.meta.url));
 assert.match(execFileSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'5'}}),/FROZEN_PROTOCOL_VALID/);
});
test('Round5 projection preserves current size authority and exact concrete source conditions',()=>{
 const c=a3.cases[0];
 const p=projectRuntime(m,c,'conversation','opaque-request');
 assert.deepEqual(p.trusted.protectedClaims.at(-1).value,c.runtime.trusted.protectedClaims.at(-1).value);
 assert.deepEqual(p.trusted.productProfiles,c.runtime.trusted.productProfiles);
 assert.deepEqual(p.trusted.policyLiterals,c.runtime.trusted.policyLiterals);
 assert.equal(hardPrecheck(p.trusted,'Em chọn ST411 M.',new Date(c.runtime.evaluationAt)),null);
});
test('prepared size recommendations are reproducible using the existing Size Engine',()=>{
 for(const {input,claim} of read('size-inputs.json').records){
  const decision=recommendSize(input),sizeClaim=createVerifiedSizeRecommendationClaim({decision,productId:input.target.parentProductId,profile:input.profile});
  assert.deepEqual(buildProtectedClaimsFromVerifiedFactsV1({facts:null,sizeClaim,expectedProductId:input.target.parentProductId}).claims[0],claim);
 }
});
test('conditional quotes preserve their arithmetic and source prices; accepted history has no bogus browsing default',()=>{
 for(const c of a3.cases){
  assert.ok(!Object.hasOwn(c.runtime.trusted.state,'salesStage'));
  for(const p of c.runtime.trusted.policyLiterals.filter(p=>p.ref.startsWith('quote:'))){
   const q=JSON.parse(p.text);assert.equal(q.destination,'INNER_HCMC');
   assert.equal(q.subtotal,q.items.reduce((n,i)=>n+i.quantity*i.unitPrice,0));
   for(const item of q.items)assert.equal(item.unitPrice,c.runtime.trusted.protectedClaims.find(v=>v.type==='PRICE'&&v.scope.productId===item.productId).value.amountVnd);
   assert.equal(q.shipping,q.subtotal>=700000?0:25000);assert.equal(q.total,q.subtotal+q.shipping);
  }
 }
 assert.equal(a3.cases.find(c=>c.evaluator.caseId==='r5-referent-navy').runtime.trusted.state.consideredSize,'M');
 assert.equal(a3.cases.find(c=>c.evaluator.caseId==='r5-referent-navy').runtime.trusted.state.currentProductId,'QU714');
 assert.equal(new Date(a3.cases.find(c=>c.evaluator.caseId==='r5-delivery-timing').runtime.evaluationAt).getUTCDay(),2);
});
test('captured requests keep buyer goals, score labels and manual references behind the evaluator firewall',async()=>{
 const c=structuredClone(a3.cases[0]),marker='R5_EVALUATOR_SENTINEL';
 c.evaluator={...c.evaluator,buyerGoal:marker,unresolvedConcern:marker,adequateResolution:marker,attainableProgress:marker};
 c.runtime.history[0].rubric=marker;c.runtime.trusted.state.requiredBehaviors=marker;
 const calls=[];
 const result=await evaluateA3Attempt(m,c,async(role,request)=>{
  calls.push(request);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em chọn ST411 M cho chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');assert.equal(calls.length,2);
 for(const request of calls){
  const text=JSON.stringify(request);
  for(const label of [marker,'r5-workday-comfort','buyerGoal','unresolvedConcern','adequateResolution','attainableProgress','requiredBehaviors','forbiddenBehaviors','referenceReplies','consultationCaseIds'])assert.ok(!text.includes(label),label);
  for(const r of read('reference-replies.json').references)assert.ok(!text.includes(r.text));
 }
});
test('misunderstood buying motivation fails consultation even when facts, style and mean are good',()=>{
 const attempts=a3.cases.flatMap(c=>Array.from({length:3},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),caseId:c.evaluator.caseId,terminal:{disposition:'SEND_ELIGIBLE'}})));
 const scores=attempts.map(a=>({attemptId:a.attemptId,scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}));
 const weak=scores.find(s=>s.attemptId==='r5-wardrobe-budget:1');weak.scores.understanding=1;
 assert.equal(scoreWholeReplies(m,a3,attempts,scores).rows.find(r=>r.attemptId===weak.attemptId).pass,false);
 weak.scores.understanding=2;assert.equal(scoreWholeReplies(m,a3,attempts,scores).status,'PASS');
});
test('offline review packet carries the frozen buyer goal and obstacle without needing rejected draft or verdict',()=>{
 const c=a3.cases[2],view=humanView(c,{attemptId:'opaque',terminal:{text:'Chị lấy áo riêng nhé.'}});
 for(const key of ['buyerGoal','unresolvedConcern','adequateResolution','attainableProgress','knownDecisions'])assert.deepEqual(view[key],c.evaluator[key]);
 assert.ok(!Object.hasOwn(view,'verification'));assert.ok(!Object.hasOwn(view,'finalDraft'));
});
