import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {runShard} from './run-a2-shards.mjs';import {registerA2Attempts} from './run-a2.mjs';
const raw=f=>readFileSync(new URL('./'+f,import.meta.url),'utf8'),m=JSON.parse(raw('round-64/manifest.json')),a2=JSON.parse(raw('round-64/corpus-a2.json')),
 p=JSON.parse(raw('a2-failure-recheck-20261013/plan.json')),priorRaw=raw('round-64/a2-evidence.json');

test('failure recheck freezes six exact old failure cases as14new slots without adopting old outcomes',async()=>{
 const {prepareFailureRecheck}=await import('./recheck-a2-failures.mjs'),e=prepareFailureRecheck(m,a2,p,priorRaw,'b'.repeat(40));
 assert.equal(e.attempts.length,14);assert.equal(e.attempts.filter(a=>a.expected==='UNSAFE').length,3);assert.equal(e.attempts.filter(a=>a.expected==='SAFE').length,11);
 assert.deepEqual(e.attempts.map(a=>a.attemptId),p.registeredAttemptIds);assert.ok(e.attempts.every(a=>a.attemptId.startsWith(p.runId+'/')&&!a.terminal&&!a.provider&&!a.invocationStartedAt));
 const bad=structuredClone(p);bad.caseIds.push('r4-safe-policy');assert.throws(()=>prepareFailureRecheck(m,a2,bad,priorRaw,'b'.repeat(40)));
 assert.throws(()=>prepareFailureRecheck(m,a2,p,priorRaw+' ','b'.repeat(40)));assert.throws(()=>prepareFailureRecheck(m,a2,p,priorRaw,'invalid'));
});

test('a diagnostic unsafe eligible PASS stops on its first observation with all unrun slots retained',async()=>{
 const attempts=registerA2Attempts(m,a2).filter(a=>['r41-alternative-opacity-explicit-unsafe','r53-v2-refund-safe'].includes(a.caseId)).sort((a,b)=>Number(a.expected==='SAFE')-Number(b.expected==='SAFE'));
 const e={a2RunSourceSha:'a'.repeat(40),shard:{index:0,attemptIds:attempts.map(a=>a.attemptId)},attempts};let generations=0;
 await runShard(m,a2,e,async request=>{generations++;return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1,requestBody:request};},
  {save:()=>{},checkSource:()=>{},log:()=>{},stopOnUnsafePass:true});
 assert.equal(generations,1);assert.equal(e.summary.status,'FAIL');assert.equal(e.summary.registeredDenominator,6);assert.equal(e.summary.executedDenominator,1);
 assert.ok(e.attempts.slice(1).every(a=>!a.invocationStartedAt&&!a.terminal));
});

test('recheck requests retain exact final text/context and exclude case/run/evaluator labels',async()=>{
 const {prepareFailureRecheck}=await import('./recheck-a2-failures.mjs'),e=prepareFailureRecheck(m,a2,p,priorRaw,'b'.repeat(40));let generations=0;
 const tagged=structuredClone(a2),marker='RECHECK_PRIVATE_EVALUATOR_SENTINEL';for(const f of tagged.cases)for(const key of Object.keys(f.evaluator))if(key!=='caseId')f.evaluator[key]=marker;
 await runShard(m,tagged,e,async request=>{
  generations++;const text=JSON.stringify(request);assert.ok(!text.includes(marker));assert.ok(!text.includes(p.runId));for(const id of p.caseIds)assert.ok(!text.includes(id));
  const input=JSON.parse(request.input[0].content[0].text),fixture=a2.cases.find(f=>f.runtime.finalDraft===input.untrusted.finalDraft&&p.caseIds.includes(f.evaluator.caseId));
  assert.ok(fixture);assert.equal(input.untrusted.latestCustomerMessage,fixture.runtime.latestCustomerMessage);assert.deepEqual(request.tools,[]);
  return {status:'OK',answer:fixture.evaluator.expected==='SAFE'?'{"verdict":"PASS","violations":[]}':'{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":null}]}',providerRequests:1,requestBody:request};
 },{save:()=>{},checkSource:()=>{},log:()=>{},stopOnUnsafePass:true});
 assert.equal(generations,14);assert.equal(e.summary.executedDenominator,14);assert.equal(e.summary.unsafeSendEligibleFalsePassCount,0);
});

test('trusted selected registration audits14fresh outcomes but cannot stand in for the full351slot registration',()=>{
 const code=`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
 import {prepareFailureRecheck} from ${JSON.stringify(new URL('./recheck-a2-failures.mjs',import.meta.url).href)};
 import {runShard} from ${JSON.stringify(new URL('./run-a2-shards.mjs',import.meta.url).href)};
 import {validateA2Evidence} from ${JSON.stringify(new URL('./run-a2.mjs',import.meta.url).href)};
 const read=f=>JSON.parse(readFileSync(new URL(f,${JSON.stringify(new URL('./',import.meta.url).href)}),'utf8')),
 m=read('round-64/manifest.json'),a2=read('round-64/corpus-a2.json'),p=read('a2-failure-recheck-20261013/plan.json'),old=readFileSync(new URL('round-64/a2-evidence.json',${JSON.stringify(new URL('./',import.meta.url).href)}),'utf8'),e=prepareFailureRecheck(m,a2,p,old,'b'.repeat(40));let calls=0;
 await runShard(m,a2,e,async request=>{const expected=e.attempts[calls++].expected;return {status:'OK',answer:expected==='SAFE'?'{"verdict":"PASS","violations":[]}':'{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":null}]}',providerRequests:1,requestBody:request};},{save:()=>{},checkSource:()=>{},log:()=>{},stopOnUnsafePass:true});
 assert.throws(()=>validateA2Evidence(m,a2,e),/ATTEMPT_DENOMINATOR/);assert.equal(validateA2Evidence(m,a2,e,{registeredAttemptIds:p.registeredAttemptIds}).executedDenominator,14);
 e.attempts[0].provider.requestBody.input[0].content[0].text+=' changed';assert.throws(()=>validateA2Evidence(m,a2,e,{registeredAttemptIds:p.registeredAttemptIds}),/REQUEST_FIREWALL_OR_IDENTITY/);console.log('DIAGNOSTIC_AUDIT_GREEN');`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'64'}}),/DIAGNOSTIC_AUDIT_GREEN/);
});
