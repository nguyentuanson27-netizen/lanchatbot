import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol,projectRuntime,buildRequest} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(22,'manifest.json'),a2=read(22,'corpus-a2.json'),a3=read(22,'corpus-a3.json'),prior=read(21,'manifest.json');

test('Round22 selects frozen 108-case inputs and rejects retained-label or A3-contract tampering despite recomputed hashes',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'22'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:69,a2Safe:39,a3:42});
 const changed=structuredClone(a2),manifest=structuredClone(m);
 [changed.cases[72].evaluator.expected,changed.cases[78].evaluator.expected]=[changed.cases[78].evaluator.expected,changed.cases[72].evaluator.expected];
 manifest.corpusHashes.a2=hash(JSON.stringify(changed));manifest.cohorts.retainedA2Hash=hash(JSON.stringify({schemaVersion:1,cases:changed.cases.slice(0,96)}));
 assert.throws(()=>validateProtocol(manifest,changed,a3),/ROUND22_RETAINED/);
 const altered=structuredClone(a3),mc=structuredClone(m);altered.cases[0].evaluator.buyerGoal='make easier';
 mc.corpusHashes.a3=hash(JSON.stringify(altered));mc.cohorts.anchorA3Hash=mc.corpusHashes.a3;
 assert.throws(()=>validateProtocol(mc,a2,altered),/ROUND22_RETAINED/);
});

test('Round22 retains all96 attacks/labels and all42 histories; prompts match owner-reviewed identities, authority/config/quality bars unchanged',()=>{
 assert.deepEqual(a2.cases.slice(0,96),read(21,'corpus-a2.json').cases);assert.deepEqual(a3,read(21,'corpus-a3.json'));
 assert.equal(a2.cases.slice(96).filter(c=>c.evaluator.expected==='SAFE').length,6);
 assert.equal(a2.cases.slice(96).filter(c=>c.evaluator.expected==='UNSAFE').length,6);
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[k],prior[k]);
 for(const k of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 for(const [role,file]of [['conversation','fashion-sales-owner-advisory-scope-20261008.vi.txt'],['verifier','semantic-verifier-advisory-scope-20261008.vi.txt']])assert.equal(m.prompts[role],readFileSync(new URL('./prompts/'+file,import.meta.url),'utf8'));
 const outsideAdvisory=text=>text.replaceAll('\r\n','\n').split('# Tư vấn có căn cứ và đặc tính tự thêm')[0]+text.replaceAll('\r\n','\n').split('# Chính sách và phạm vi quyền lợi')[1];
 assert.equal(outsideAdvisory(m.prompts.verifier),outsideAdvisory(prior.prompts.verifier));
 for(const f of ['fashion-profiles.json','reference-replies.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.equal(readFileSync(new URL('./round-22/'+f,import.meta.url),'utf8'),readFileSync(new URL('./round-21/'+f,import.meta.url),'utf8'));
});

test('Round22 captured owner/verifier requests omit all evaluator labels and require mandatory verification plus final gate',async()=>{
 const marker='ROUND22_EVALUATOR_ONLY';
 for(const [kind,corpus]of [['a2',a2],['a3',a3]])for(const original of corpus.cases){
  if(original.evaluator.family==='oversized-context')continue;
  const c=structuredClone(original);for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
  c.quoteAdmissions=marker;c.runtime.trusted.state.rubric=marker;if(c.runtime.history[0])c.runtime.history[0].expected=marker;
  if(kind==='a3')c.runtime.finalDraft='x'.repeat(m.bounds.draftBytes);
  for(const role of kind==='a2'?['verifier']:['conversation','verifier']){
   const body=buildRequest(m,role,projectRuntime(m,c,role,'local-test-opaque-id'));assert.ok(!JSON.stringify(body).includes(marker));
  }
 }
 const c=structuredClone(a3.cases.find(v=>v.evaluator.caseId==='r15-known-waist-next'));for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 const captured=[],result=await evaluateA3Attempt(m,c,async(role,body)=>{captured.push(body);return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};});
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
