import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAdviceOwnerRequest,selectAdviceCapture} from './advice-diagnostic.mjs';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {buildVerifierRequest,validateProtocol} from './protocol.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const manifest=validateProtocol(read('./manifest.json'));
const rows=read('./advice-source-layout-20261024.candidate.json');
test('all four context pairs preserve the source, scopes, time and full verifier evidence; candidate only edits source description',()=>{
 assert.equal(rows.length,8);
 for(let i=0;i<rows.length;i+=2){
  const [base,candidate]=rows.slice(i,i+2),capture=selectAdviceCapture(base.requests),before=structuredClone(capture);
  assert.ok(capture);assert.equal(capture.providerRequests,1);
  assert.deepEqual(base.runtime,candidate.runtime);assert.deepEqual(base.requests,candidate.requests);
  const signal=new AbortController().signal;
  const make=r=>buildAdviceOwnerRequest(r,capture,'Same owner prompt','paired-request',signal);
  const b=make(base),c=make(candidate),expected={...b,context:structuredClone(b.context)};
  expected.context.runtimeProducts.find(p=>p.subjectRef==='SV2447').content.description=candidate.ownerDescriptions.SV2447.description;
  assert.deepEqual(c,expected);assert.deepEqual(capture,before);
  const original=capture.context.runtimeProducts.find(p=>p.subjectRef==='SV2447').content.description;
  const wire=JSON.stringify(buildGeminiCommerceRequest(c));
  assert(!wire.includes(original));assert(wire.includes(candidate.ownerDescriptions.SV2447.description));
  assert(!wire.includes(candidate.caseId));assert(!wire.includes('ownerDescriptions'));
  const verifier=buildVerifierRequest(manifest,{generationId:'v',instructions:'Verify',trusted:capture.context,finalDraft:'Dạ chị.',
   latest:candidate.runtime.latest,history:candidate.runtime.history,binding:{requestId:'p'},turnTime:c.turnTime});
  assert(JSON.stringify(verifier).includes(original));
 }
});
