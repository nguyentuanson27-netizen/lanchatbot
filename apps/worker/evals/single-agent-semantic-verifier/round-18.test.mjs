import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {recommendSize,createVerifiedSizeRecommendationClaim} from '../../../../packages/business-tools/dist/size-engine.js';
import {buildProtectedClaimsFromVerifiedFactsV1} from '../../../../packages/business-tools/dist/protected-claims.js';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(18,'manifest.json'),a2=read(18,'corpus-a2.json'),a3=read(18,'corpus-a3.json');

test('Round18 indoor dress decision carries a reproducible VA512 fit bound to current customer',()=>{
 const c=a3.cases.find(c=>c.evaluator.caseId==='r16-change-to-indoor-dress');
 const claim=c.runtime.trusted.protectedClaims.find(v=>v.type==='SIZE_FIT'&&v.scope.productId==='VA512');
 assert.ok(claim,'missing code-confirmed VA512 fit despite complete customer measurements and existing chart');
 const record=read(18,'size-inputs.json').records.find(v=>v.claim.claimId===claim.claimId);
 assert.ok(record);const decision=recommendSize(record.input);
 const sizeClaim=createVerifiedSizeRecommendationClaim({decision,productId:record.input.target.parentProductId,profile:record.input.profile});
 assert.deepEqual(buildProtectedClaimsFromVerifiedFactsV1({facts:null,sizeClaim,expectedProductId:'VA512'}).claims,[claim]);
 assert.deepEqual(record.claim,claim);assert.deepEqual(claim.value.recommendedSizes,['M']);
 for(const [field,value] of Object.entries(claim.value))if(['customerProfileId','customerProfileRevision','measurementFingerprint'].includes(field))assert.equal(c.runtime.trusted.state[field],value);
});

test('Round18 retains all attacks, contracts, other41 runtime inputs and numeric bars',()=>{
 assert.deepEqual(a2,read(17,'corpus-a2.json'));
 const old=read(17,'manifest.json');
 for(const k of ['bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[k],old[k]);
 assert.deepEqual(m.models.verifier,old.models.verifier);assert.deepEqual(m.models.conversation,read(16,'manifest.json').models.conversation);
 assert.equal(m.prompts.verifier,old.prompts.verifier);
 for(const k of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds'])assert.deepEqual(m.scoring[k],old.scoring[k]);
 const prior=read(17,'corpus-a3.json').cases;
 for(let i=0;i<a3.cases.length;i++){
  assert.deepEqual(a3.cases[i].evaluator,prior[i].evaluator);
  assert.deepEqual(a3.cases[i].runtime.history,prior[i].runtime.history);
  if(a3.cases[i].evaluator.caseId!=='r16-change-to-indoor-dress')assert.deepEqual(a3.cases[i],prior[i]);
 }
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'18'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:57,a2Safe:27,a3:42});
 const changed=structuredClone(a3);changed.cases[0].runtime.latestCustomerMessage+='altered';
 const manifest=structuredClone(m);manifest.corpusHashes.a3=hash(JSON.stringify(changed));
 assert.throws(()=>validateProtocol(manifest,a2,changed),/ROUND18_RETAINED/);
});

test('Round18 bounded requests preserve trusted binding and captured requests exclude evaluation labels',async()=>{
 for(const c of a3.cases)for(const role of ['conversation','verifier']){
  const f=structuredClone(c);f.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  const p=projectRuntime(m,f,role,'opaque');assert.deepEqual(p.trusted,f.runtime.trusted);
  assert.equal(hardPrecheck(p.trusted,f.runtime.finalDraft,new Date(f.runtime.evaluationAt)),null);
  assert.ok(Buffer.byteLength(JSON.stringify(buildRequest(m,role,p)))<=m.bounds.totalBytes);
 }
 const c=structuredClone(a3.cases.at(-1)),marker='ROUND18_OFFLINE_ONLY';
 for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 c.quoteAdmissions=marker;c.contextPreparation=marker;c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[];const result=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return {status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 assert.ok(captured[0].systemInstruction);assert.equal(captured[1].reasoning.effort,'high');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','contextPreparation','destinationEstablished','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
