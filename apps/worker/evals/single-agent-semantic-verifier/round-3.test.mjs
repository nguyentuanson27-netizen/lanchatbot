import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,validateProtocol,hash} from './protocol.mjs';
import {evaluateA3Attempt,scoreWholeReplies} from './run-a3.mjs';
const read=(round,n)=>JSON.parse(readFileSync(new URL('./round-'+round+'/'+n,import.meta.url)));
const m=read(3,'manifest.json'),a2=read(3,'corpus-a2.json'),a3=read(3,'corpus-a3.json');
const fixture=a3.cases.find(c=>c.evaluator.caseId==='fashion-budget-choice');
test('Round3 preserves34/20 earlier cases exactly and adds preregistered bounded histories',()=>{
 assert.deepEqual(a2.cases.slice(0,34),read(2,'corpus-a2.json').cases);
 assert.deepEqual(a3.cases.slice(0,20),read(2,'corpus-a3.json').cases);
 assert.equal(a2.cases.length,46);assert.equal(a3.cases.length,32);
 for(const c of a3.cases.slice(20))assert.ok(c.runtime.history.length>=2&&c.runtime.history.length<=4);
 assert.doesNotThrow(()=>validateProtocol(m,a2,a3));
});
test('bounded profile projection supplies hashed data and code clock, strips nested evaluator fields',()=>{
 const c=structuredClone(fixture);const marker='EVALUATOR_ONLY_SENTINEL_R3';
 c.evaluator={caseId:marker,split:marker,family:marker,expected:marker,requiredBehaviors:[marker],forbiddenBehaviors:[marker],scoring:marker,anchors:marker};
 c.runtime.trusted.productProfiles[0].evaluator=marker;c.runtime.trusted.productProfiles[0].details.rubric=marker;c.runtime.history[0].caseId=marker;
 for(const role of ['conversation','verifier']){
  c.runtime.finalDraft='Chị cân nhắc mẫu này nhé.';
  const projection=projectRuntime(m,c,role,'opaque');
  const request=buildRequest(m,role,projection);
  assert.deepEqual(projection.trusted.productProfiles,fixture.runtime.trusted.productProfiles);
  assert.ok(!JSON.stringify(request).includes(marker));
  assert.ok(!JSON.stringify(request).includes('consultationCaseIds'));
  assert.ok(!JSON.stringify(request).includes('minimumFamilyPassRate'));
  if(role==='conversation')assert.equal(projection.requestIdentity.evaluationAt,c.runtime.evaluationAt);
 }
});
test('new trusted profile affects exact snapshot; record/count bounds reject without truncation',()=>{
 const p=projectRuntime(m,fixture,'conversation','opaque');
 const changed=structuredClone(fixture);changed.runtime.trusted.productProfiles[0].details.material='Changed material';
 assert.notEqual(projectRuntime(m,changed,'conversation','opaque').requestIdentity.trustedSnapshotId,p.requestIdentity.trustedSnapshotId);
 const oversized=structuredClone(fixture);oversized.runtime.trusted.productProfiles[0].details.material='x'.repeat(2049);
 assert.throws(()=>projectRuntime(m,oversized,'conversation','opaque'),/PROFILE_BOUND/);
 const count=structuredClone(fixture);count.runtime.trusted.productProfiles=Array(5).fill(count.runtime.trusted.productProfiles[0]);
 assert.throws(()=>projectRuntime(m,count,'conversation','opaque'),/PROFILE_BOUND/);
});
test('captured requests from both owner and verifier exclude evaluator-only anchors/cohort/rubric',async()=>{
 const c=structuredClone(fixture);c.evaluator.requiredBehaviors=['ACTUAL_CAPTURE_SENTINEL'];c.evaluator.anchors='ACTUAL_CAPTURE_SENTINEL';
 const calls=[];
 const result=await evaluateA3Attempt(m,c,async(role,request)=>{
  calls.push({role,request});return {status:'OK',providerRequests:1,answer:role==='conversation'?'Chị có thể cân nhắc LT301.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.deepEqual(calls.map(c=>c.role),['conversation','verifier']);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const {request} of calls){assert.ok(!JSON.stringify(request).includes('ACTUAL_CAPTURE_SENTINEL'));assert.ok(!JSON.stringify(request).includes('consultationCaseIds'));
  assert.equal(JSON.parse(request.input[0].content[0].text).trusted.productProfiles[0].subjectRef,'LT301');}
});
test('stricter consultation cannot pass on high mean; simple/closing turns need no invented step',()=>{
 const attempts=a3.cases.flatMap(c=>Array.from({length:3},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),caseId:c.evaluator.caseId,terminal:{disposition:'SEND_ELIGIBLE'}})));
 const scores=attempts.map(a=>({attemptId:a.attemptId,scores:Object.fromEntries(m.scoring.dimensions.map(d=>[d,2]))}));
 scores[0].scores.naturalness=1;
 const weak=scoreWholeReplies(m,a3,attempts,scores);
 assert.equal(weak.rows[0].pass,false);assert.ok(weak.rows[0].mean>1.5);
 scores[0].scores.naturalness=2;
 const simple=scores.find(a=>a.attemptId==='simple-price:1');simple.scores.nextStep=1;
 const closing=scores.find(a=>a.attemptId==='fashion-defer-after-advice:1');closing.scores.decisionSupport=1;
 const result=scoreWholeReplies(m,a3,attempts,scores);
 assert.equal(result.status,'PASS');assert.equal(result.cohorts.original.denominator,60);assert.equal(result.cohorts.new.denominator,36);
});
test('explicit Round3 folder selection cannot overwrite older evidence',()=>{
 const script=fileURLToPath(new URL('./protocol.mjs',import.meta.url));
 const out=execFileSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'3'}});
 assert.ok(out.includes('"round":3'));assert.ok(out.includes('FROZEN_PROTOCOL_VALID'));
 const location=execFileSync(process.execPath,['--input-type=module','-e',`import {inputUrl} from ${JSON.stringify(new URL('./protocol.mjs',import.meta.url).href)}; console.log(inputUrl('a2-evidence.json').href)`],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'3'}});
 assert.ok(location.trim().endsWith('/round-3/a2-evidence.json'));
 assert.equal(hash(JSON.stringify(read(2,'corpus-a3.json'))),m.cohorts.originalA3Hash);
});
