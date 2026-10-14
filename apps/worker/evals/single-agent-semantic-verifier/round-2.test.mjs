import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRuntime,buildRequest,validateProtocol} from './protocol.mjs';
const read=n=>JSON.parse(readFileSync(new URL('./round-2/'+n,import.meta.url)));
const m=read('manifest.json'),a2=read('corpus-a2.json'),a3=read('corpus-a3.json');

test('conversation sees the selected code clock without changing protected truth or verifier binding',()=>{
 const c=projectRuntime(m,a3.cases[0],'conversation','opaque');
 const v=projectRuntime(m,a2.cases[1],'verifier','opaque');
 assert.equal(c.requestIdentity.evaluationAt,a3.cases[0].runtime.evaluationAt);
 assert.ok(!Object.hasOwn(v.requestIdentity,'evaluationAt'));
 assert.equal(c.trusted.protectedClaims[0].authorization,'NONE');
 assert.equal(c.trusted.protectedClaims[0].value.amountVnd,849000);
 assert.equal(c.trusted.protectedClaims[1].value.status,'OUT_OF_STOCK');
 assert.equal(c.trusted.protectedClaims[0].scope.variantId,null);
});
test('round-2 captured requests contain runtime data and code-clock, never evaluation instructions',()=>{
 const fixture=structuredClone(a3.cases.at(-1));fixture.evaluator={caseId:'ROUND2_EVAL_SENTINEL',split:'ROUND2_EVAL_SENTINEL',requiredBehaviors:['ROUND2_EVAL_SENTINEL']};
 const request=buildRequest(m,'conversation',projectRuntime(m,fixture,'conversation','opaque'));
 assert.equal(JSON.parse(request.input[0].content[0].text).requestIdentity.evaluationAt,fixture.runtime.evaluationAt);
 assert.ok(!JSON.stringify(request).includes('ROUND2_EVAL_SENTINEL'));
 assert.ok(!JSON.stringify(request).includes('OWNER_AUTHORIZED_CODEX_OFFLINE_REVIEW'));
 assert.equal(JSON.parse(request.input[0].content[0].text).trusted.protectedClaims[0].value.amountVnd,729000);
});
test('explicit round selector validates separate frozen inputs; cannot overwrite round-1 outcomes',()=>{
 const script=fileURLToPath(new URL('./protocol.mjs',import.meta.url));
 const out=execFileSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'2'}});
 assert.ok(out.includes('"round":2'));assert.ok(out.includes('FROZEN_PROTOCOL_VALID'));
 const location=execFileSync(process.execPath,['--input-type=module','-e',`import {inputUrl} from ${JSON.stringify(new URL('./protocol.mjs',import.meta.url).href)}; console.log(inputUrl('a2-evidence.json').href)`],
   {encoding:'utf8',env:{...process.env,C3_CHECKPOINT_A_ROUND:'2'}});
 assert.ok(location.trim().endsWith('/round-2/a2-evidence.json'));
 assert.doesNotThrow(()=>validateProtocol(m,a2,a3));
});
