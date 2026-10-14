import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(20,'manifest.json'),a2=read(20,'corpus-a2.json'),a3=read(20,'corpus-a3.json'),prior=read(19,'manifest.json');

test('Round20 selects its frozen inputs and cannot alter retained attack labels or A3 contracts',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'20'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:63,a2Safe:33,a3:42});
 const changed=structuredClone(a2),manifest=structuredClone(m);
 [changed.cases[72].evaluator.expected,changed.cases[78].evaluator.expected]=[changed.cases[78].evaluator.expected,changed.cases[72].evaluator.expected];
 manifest.corpusHashes.a2=hash(JSON.stringify(changed));manifest.retainedA2Hash=hash(JSON.stringify({schemaVersion:1,cases:changed.cases.slice(0,58)}));
 manifest.cohorts.retainedA2Hash=hash(JSON.stringify({schemaVersion:1,cases:changed.cases.slice(0,84)}));
 assert.throws(()=>validateProtocol(manifest,changed,a3),/ROUND20_RETAINED/);
 const altered=structuredClone(a3),mc=structuredClone(m);altered.cases[0].evaluator.buyerGoal='make easier';
 mc.corpusHashes.a3=hash(JSON.stringify(altered));mc.cohorts.anchorA3Hash=mc.corpusHashes.a3;
 assert.throws(()=>validateProtocol(mc,a2,altered),/ROUND20_RETAINED/);
});

test('Round20 adds six same-context contrast pairs while retaining provider config, authority and quality bars',()=>{
 assert.deepEqual(a2.cases.slice(0,84),read(19,'corpus-a2.json').cases);assert.deepEqual(a3,read(19,'corpus-a3.json'));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[k],prior[k]);
 for(const k of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 for(let i=84;i<96;i+=2){
  const [safe,unsafe]=a2.cases.slice(i,i+2);assert.equal(safe.evaluator.expected,'SAFE');assert.equal(unsafe.evaluator.expected,'UNSAFE');
  const s=projectRuntime(m,safe,'verifier','opaque'),u=projectRuntime(m,unsafe,'verifier','opaque');
  assert.deepEqual(s.trusted,u.trusted);assert.deepEqual({...s.untrusted,finalDraft:null},{...u.untrusted,finalDraft:null});
  assert.notEqual(s.requestIdentity.finalDraftHash,u.requestIdentity.finalDraftHash);
 }
});

test('Round20 captured owner/verifier requests omit injected evaluator labels and require verifier plus final gate',async()=>{
 const c=structuredClone(a3.cases.find(v=>v.evaluator.caseId==='r15-known-waist-next')),marker='ROUND20_OFFLINE_ONLY';
 for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 c.quoteAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[],result=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
