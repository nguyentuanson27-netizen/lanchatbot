import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(folder,file)=>JSON.parse(readFileSync(new URL('./'+folder+'/'+file,import.meta.url)));
const m=read('round-11','manifest.json'),a2=read('round-11','corpus-a2.json'),a3=read('round-11','corpus-a3.json');
const prior=read('round-10','manifest.json'),before=read('round-10','corpus-a2.json');

test('Round11 keeps exact attacks, both prompts/config/bars and the complete registered population',()=>{
 assert.deepEqual(a2.cases.filter(c=>c.evaluator.seed),before.cases.filter(c=>c.evaluator.seed));
 for(const [i,c] of a2.cases.entries()){
  assert.equal(c.runtime.finalDraft,before.cases[i].runtime.finalDraft);assert.deepEqual(c.evaluator,before.cases[i].evaluator);
  assert.deepEqual(c.runtime.trusted.protectedClaims,before.cases[i].runtime.trusted.protectedClaims);
  for(const p of before.cases[i].runtime.trusted.productProfiles??[]){
   const current=c.runtime.trusted.productProfiles.find(v=>v.ref===p.ref);
   assert.equal(current.observedAt,p.observedAt);assert.equal(current.expiresAt,p.expiresAt);
   if(!['ST411','VA512','SM613','QU714'].includes(p.subjectRef))assert.deepEqual(current,p);
  }
 }
 for(const key of ['models','prompts','promptHashes','verdictSchema','schemaHash','bounds','stateAllowlist','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[key],prior[key]);
 for(const key of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationCaseIds','reviewProcedureHash','interpretation','evidencePolicy'])assert.deepEqual(m.scoring[key],prior.scoring[key]);
 assert.equal(hash(readFileSync(new URL('./round-11/context-preparation.json',import.meta.url),'utf8')),m.contextPreparationHash);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:48,a2Safe:18,a3:24});
 const out=execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'11'}});
 assert.match(out,/FROZEN_PROTOCOL_VALID/);
});

test('Round11 exact context reaches both roles within bounds without losing size authority or admitting unbound quotes',()=>{
 const old=read('round-10','corpus-a3.json'),preparation=read('round-11','context-preparation.json');
 for(const [i,c] of a3.cases.entries()){
  assert.deepEqual(c.evaluator,old.cases[i].evaluator);assert.deepEqual(c.runtime.history,old.cases[i].runtime.history);
  assert.equal(c.runtime.latestCustomerMessage,old.cases[i].runtime.latestCustomerMessage);
  assert.deepEqual(c.runtime.trusted.protectedClaims,old.cases[i].runtime.trusted.protectedClaims);
  for(const p of c.runtime.trusted.productProfiles){const priorProfile=old.cases[i].runtime.trusted.productProfiles.find(v=>v.ref===p.ref);
   for(const field of ['sizeChart','colors','care'])assert.deepEqual(p.details[field],priorProfile.details[field]);
  }
  const admission=preparation.quoteAdmissions.find(v=>v.caseId===c.evaluator.caseId);
  const quotes=c.runtime.trusted.policyLiterals.filter(p=>p.ref.startsWith('quote:'));
  assert.equal(quotes.length>0,admission.destinationEstablished);
  if(admission.destinationEstablished)assert.ok([...c.runtime.history.map(v=>v.text),c.runtime.latestCustomerMessage].join(' ').includes('TP.HCM'));
  for(const role of ['conversation','verifier']){
   const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
   const p=projectRuntime(m,f,role,'opaque-request');
   assert.deepEqual(p.trusted.protectedClaims,c.runtime.trusted.protectedClaims);
   assert.deepEqual(p.trusted.productProfiles,c.runtime.trusted.productProfiles);
   assert.deepEqual(p.trusted.policyLiterals,c.runtime.trusted.policyLiterals);
   assert.equal(hardPrecheck(p.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
   assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,p)))<=m.bounds.totalBytes);
   assert.notEqual(p.requestIdentity.trustedSnapshotId,projectRuntime(prior,{runtime:{...old.cases[i].runtime,finalDraft:f.runtime.finalDraft}},role,'opaque-request').requestIdentity.trustedSnapshotId);
  }
 }
});

test('Round11 captured requests exclude evaluator/preparation labels; every surviving text takes verifier and final gate',async()=>{
 const c=structuredClone(a3.cases[0]),marker='ROUND11_EVALUATOR_ONLY';
 for(const key of Object.keys(c.evaluator))c.evaluator[key]=marker;
 c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];
 const result=await evaluateA3Attempt(m,c,async(role,request)=>{
  captured.push({role,request});return {status:'OK',providerRequests:1,answer:role==='conversation'?'Em cảm ơn chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.deepEqual(captured.map(c=>c.role),['conversation','verifier']);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const {request} of captured)for(const key of [marker,'caseId','split','expected','buyerGoal','qualityTags','requiredBehaviors','forbiddenBehaviors','rubric','referenceReplies','quoteAdmissions','destinationEstablished','contextPreparationHash'])assert.ok(!JSON.stringify(request).includes(key),key);
});
