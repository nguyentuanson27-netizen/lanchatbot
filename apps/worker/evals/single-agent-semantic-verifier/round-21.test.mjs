import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,validateProtocol} from './protocol.mjs';
import {evaluateA3Attempt} from './run-a3.mjs';
const read=(n,f)=>JSON.parse(readFileSync(new URL('./round-'+n+'/'+f,import.meta.url),'utf8'));
const m=read(21,'manifest.json'),a2=read(21,'corpus-a2.json'),a3=read(21,'corpus-a3.json'),prior=read(20,'manifest.json');

test('Round21 selects frozen inputs and rejects changed retained labels and A3 contracts despite recomputed hashes',()=>{
 assert.match(execFileSync(process.execPath,[fileURLToPath(new URL('./protocol.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'21'}}),/FROZEN_PROTOCOL_VALID/);
 assert.deepEqual(validateProtocol(m,a2,a3),{a2Unsafe:63,a2Safe:33,a3:42});
 const changed=structuredClone(a2),manifest=structuredClone(m);
 [changed.cases[72].evaluator.expected,changed.cases[78].evaluator.expected]=[changed.cases[78].evaluator.expected,changed.cases[72].evaluator.expected];
 manifest.corpusHashes.a2=hash(JSON.stringify(changed));manifest.cohorts.retainedA2Hash=manifest.corpusHashes.a2;
 assert.throws(()=>validateProtocol(manifest,changed,a3),/ROUND21_RETAINED/);
 const altered=structuredClone(a3),mc=structuredClone(m);altered.cases[0].evaluator.buyerGoal='make easier';
 mc.corpusHashes.a3=hash(JSON.stringify(altered));mc.cohorts.anchorA3Hash=mc.corpusHashes.a3;
 assert.throws(()=>validateProtocol(mc,a2,altered),/ROUND21_RETAINED/);
});

test('Round21 retains all corpora, owner prompt, configuration, authority and quality bars; only verifier policy section differs',()=>{
 assert.deepEqual(a2,read(20,'corpus-a2.json'));assert.deepEqual(a3,read(20,'corpus-a3.json'));
 for(const k of ['models','bounds','stateAllowlist','verdictSchema','schemaHash','fallbacks','terminal','usability','repetitions'])assert.deepEqual(m[k],prior[k]);
 for(const k of ['minimumPerDimension','minimumCaseMean','minimumFamilyPassRate','factualActionSafetyRequired','naturalnessRequired','consultationRequired','consultationDimensions','consultationCaseIds'])assert.deepEqual(m.scoring[k],prior.scoring[k]);
 assert.equal(m.prompts.conversation,prior.prompts.conversation);
 const outsidePolicy=text=>text.split('# Chính sách và phạm vi quyền lợi')[0]+text.split('# ACK và operation')[1];
 assert.equal(outsidePolicy(m.prompts.verifier),outsidePolicy(prior.prompts.verifier));
 assert.notEqual(m.promptHashes.verifier,prior.promptHashes.verifier);
 for(const f of ['fashion-profiles.json','reference-replies.json','size-inputs.json','quote-inputs.json','context-preparation.json'])assert.equal(readFileSync(new URL('./round-21/'+f,import.meta.url),'utf8'),readFileSync(new URL('./round-20/'+f,import.meta.url),'utf8'));
});

test('Round21 captured owner/verifier requests omit injected evaluator labels and require verifier plus final gate',async()=>{
 const c=structuredClone(a3.cases.find(v=>v.evaluator.caseId==='r15-known-waist-next')),marker='ROUND21_OFFLINE_ONLY';
 for(const k of Object.keys(c.evaluator))c.evaluator[k]=marker;
 c.quoteAdmissions=marker;c.runtime.trusted.state.rubric=marker;c.runtime.history[0].expected=marker;
 const captured=[],result=await evaluateA3Attempt(m,c,async(role,body)=>{
  captured.push(body);return{status:'OK',providerRequests:1,answer:role==='conversation'?'Dạ chị.':'{"verdict":"PASS","violations":[]}'};
 });
 assert.equal(captured.length,2);assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
 for(const body of captured)for(const label of [marker,'caseId','split','expected','buyerGoal','requiredBehaviors','forbiddenBehaviors','rubric','quoteAdmissions','adequateResolution','attainableProgress'])assert.ok(!JSON.stringify(body).includes(label),label);
});
