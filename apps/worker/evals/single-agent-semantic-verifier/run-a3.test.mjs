import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateA3Attempt,humanView,scoreWholeReplies} from './run-a3.mjs';
const m=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));
const corpus=JSON.parse(readFileSync(new URL('./corpus-a3.json',import.meta.url)));
const ok=answer=>({status:'OK',answer,providerRequests:1});
test('conversation owns exact final customer text; every surviving draft invokes one verifier',async()=>{
  const text='  Dạ, chị cứ cân nhắc nhé.\n';const calls=[];
  const result=await evaluateA3Attempt(m,corpus.cases[0],async(role,request)=>{
    calls.push({role,request});return ok(role==='conversation'?text:'{"verdict":"PASS","violations":[]}');
  });
  assert.deepEqual(calls.map(v=>v.role),['conversation','verifier']);
  assert.equal(result.finalDraft,text);assert.equal(result.terminal.text,text);
  const v=JSON.parse(calls[1].request.input[0].content[0].text);
  assert.equal(v.untrusted.finalDraft,text);
  assert.ok(!JSON.stringify(calls).includes('requiredBehaviors'));
});
test('human scores actual frozen fallback, never rejected candidate or verifier status',async()=>{
  const result=await evaluateA3Attempt(m,corpus.cases[0],async role=>ok(role==='conversation'?'Candidate draft':'{"verdict":"FAIL","violations":[]}'));
  const view=humanView(corpus.cases[0],{...result,attemptId:'opaque'});
  assert.equal(view.customerOutcome.text,m.fallbacks[0].text);
  assert.ok(!JSON.stringify(view).includes('Candidate draft'));
  assert.ok(!Object.hasOwn(view,'verifier'));
});
test('generation error remains a terminal outcome and cannot cause generation retry',async()=>{
  let calls=0;
  const result=await evaluateA3Attempt(m,corpus.cases[0],async()=>{calls++;return {status:'PROVIDER_ERROR',providerRequests:1};});
  assert.equal(calls,1);assert.equal(result.terminal.disposition,'FALLBACK');
  assert.equal(result.verification,null);
});
test('PII hard precheck terminates before verifier, using no-send',async()=>{
  let calls=0;
  const result=await evaluateA3Attempt(m,corpus.cases[0],async()=>{calls++;return ok('Contact private@example.com');});
  assert.equal(calls,1);assert.equal(result.terminal.disposition,'NO_SEND');
});
const attempts=corpus.cases.flatMap(c=>Array.from({length:m.repetitions},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),caseId:c.evaluator.caseId,terminal:{disposition:'SEND_ELIGIBLE'}})));
const allGood=()=>attempts.map(a=>({attemptId:a.attemptId,scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}));
test('missing human scores cannot yield quality PASS; complete all-generation denominator required',()=>{
  assert.equal(scoreWholeReplies(m,corpus,attempts,null).status,'BLOCKED');
  assert.equal(scoreWholeReplies(m,corpus,attempts,allGood().slice(1)).status,'BLOCKED');
  assert.equal(scoreWholeReplies(m,corpus,attempts.slice(1),allGood()).status,'BLOCKED');
});
test('whole-reply quality uses frozen per-dimension, mean, family and factual/action safety bars',()=>{
  assert.equal(scoreWholeReplies(m,corpus,attempts,allGood()).status,'PASS');
  const scores=allGood();scores[0].scores.explicitNeedCompleteness=0;
  assert.equal(scoreWholeReplies(m,corpus,attempts,scores).status,'FAIL');
  const unsafe=allGood();unsafe[0].scores.factualActionSafety=1;
  assert.equal(scoreWholeReplies(m,corpus,attempts,unsafe).status,'FAIL');
});
