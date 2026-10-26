import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonicalJsonV1} from '@lana/contracts';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {sha256} from './protocol.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {prepareQuoteDiagnostic,buildQuoteRequest,stripQuote,normalizedCapturedWire,recordQuoteSlot,renderBlindPairs} from './quote-presentation-diagnostic.mjs';

const inputs=()=>JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url)));
const prompt=()=>readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
test('all three exposed pairs and five offline controls have exact golden wires',()=>{
 const frozen=inputs(),before=structuredClone(frozen),bundle=prepareQuoteDiagnostic(frozen,prompt());
 assert.equal(bundle.slots.length,6);assert.equal(new Set(bundle.slots.map(s=>s.id)).size,6);
 assert.deepEqual(bundle.slots.map(s=>s.arm),['A','B','B','A','A','B']);
 assert.equal(bundle.offlineControls.length,5);
 for(const row of frozen.records)assert.equal(hardPrecheck(row.capture.context,'Dạ.',new Date(row.capture.capturedAt)),null);
 for(const pair of bundle.pairs){
  assert.equal(pair.removedQuotes,1);
  assert.deepEqual(stripQuote(pair.wires.A).wire,pair.wires.B);
  const original=frozen.records.find(r=>r.caseId===pair.caseId);
  assert.deepEqual(pair.wires.A,normalizedCapturedWire(original.wire));
  assert.deepEqual(buildGeminiCommerceRequest(buildQuoteRequest(original,'A','neutral',prompt())),pair.wires.A);
 }
 assert.deepEqual(frozen,before);
});
test('changed context, prompt, source capture and missing/duplicate populations block preflight',()=>{
 for(const mutate of [
  f=>{f.records.pop();},f=>{f.records.push(structuredClone(f.records[0]));},
  f=>{f.records[0].capture.context.state.revision++;},
  f=>{f.records[0].wire.systemInstruction.parts[0].text+='changed';},
  f=>{f.records[0].source.ownerRequestHash='changed';},
 ]){const f=inputs();mutate(f);assert.throws(()=>prepareQuoteDiagnostic(f,prompt()));}
});
test('golden reconstruction catches changed canonical data even with recomputed capture seals',()=>{
 const f=inputs(),r=f.records[0];r.capture.context.state.revision++;
 // revision is not owner-visible; change a field that is, without changing captured wire.
 r.capture.context.runtimeProducts[0].content.description+=' Thay nguồn.';
 r.source.captureHash=sha256(JSON.stringify(r.capture));const {hash,...payload}=f;f.hash=sha256(JSON.stringify(payload));
 assert.throws(()=>prepareQuoteDiagnostic(f,prompt()),/NORMALIZED_BASELINE_CHANGED/);
});
test('captured projected responses stay text data; provider receives no evaluator wrappers',async()=>{
 const row=inputs().records.find(r=>r.caseId==='b1-buying-concern-v2');
 Object.assign(row,{split:'EVAL_ONLY_SPLIT',rubric:'EVAL_ONLY_RUBRIC',requiredBehaviors:['EVAL_ONLY_REQUIRED']});
 const req=buildQuoteRequest(row,'B','neutral-request',prompt());let sent;
 await createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test'},
  {getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',
   candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Chị chọn bộ này nhé.'}]}}]}));}})(req);
 assert.deepEqual(sent,buildGeminiCommerceRequest(req));
 assert.doesNotMatch(JSON.stringify(sent),/EVAL_ONLY_|b1-buying-concern|caseId|removedQuotes|thoughtSignature/);
 assert(sent.contents.at(-1).parts[0].text.includes('completedToolTurns'));
 assert.equal(sent.tools.length,0);assert.equal(sent.toolConfig.functionCallingConfig.mode,'NONE');
 assert.equal(canonicalJsonV1(req.context),canonicalJsonV1(row.capture.context));
});
test('owner error retained once; precheck survivor always verifies; verifier failure records fallback',async()=>{
 const row=inputs().records.find(r=>r.caseId==='b1-price');let calls=0,verifications=0;
 const base={row,arm:'A',id:'neutral',ownerPrompt:prompt(),verifierPrompt:'verify',
  manifest:{fallback:{id:'C3_SAFE_ACK_V1',text:'Để em kiểm tra lại nhé.'}},audit:()=>{},
  gate:{makeBinding:()=>({hash:'bound'}),hardPrecheck:()=>null,finalGate:({response})=>({disposition:response.kind==='VERDICT'?'SEND_ELIGIBLE':'FALLBACK'}),terminalFallback:()=>({disposition:'FALLBACK'})},
  verify:async()=>{verifications++;return {result:{verdict:'PASS',violations:[]}};},buildVerifierWire:()=>({})};
 const fail=await recordQuoteSlot({...base,infer:async()=>{calls++;throw Object.assign(new Error('GENERATION_HTTP'),{telemetry:{providerRequests:1}});}});
 assert.equal(calls,1);assert.equal(verifications,0);assert.equal(fail.generations.length,1);assert.equal(fail.terminal.disposition,'FALLBACK');
 const ok=await recordQuoteSlot({...base,infer:async()=>({kind:'FINAL',text:'799k chị nhé.',telemetry:{providerRequests:1}})});
 assert.equal(verifications,1);assert.equal(ok.terminal.disposition,'SEND_ELIGIBLE');
 const blocked=await recordQuoteSlot({...base,infer:async()=>({kind:'FINAL',text:'799k chị nhé.',telemetry:{providerRequests:1}}),verify:async()=>{throw Object.assign(new Error('TIMEOUT'),{telemetry:{providerRequests:1}});}});
 assert.equal(blocked.generations.length,2);assert.equal(blocked.generations[1].status,'ERROR');assert.equal(blocked.terminal.disposition,'FALLBACK');
});
test('blind review includes terminal fallback rather than rejected draft and withholds mapping/labels',()=>{
 const f=inputs(),bundle=prepareQuoteDiagnostic(f,prompt()),mapping=Array.from({length:3},()=>({X:'B',Y:'A'}));
 const attempts=bundle.slots.map(slot=>({slot,result:{draft:'REJECTED_DRAFT',terminal:{disposition:slot.arm==='A'?'SEND_ELIGIBLE':'FALLBACK',text:slot.arm==='A'?'Câu đủ điều kiện.':'Câu fallback thực tế.'}}}));
 const md=renderBlindPairs(f.records,attempts,mapping);
 assert.doesNotMatch(md,/REJECTED_DRAFT|b1-buying-concern|"X":"B"|openingQuote/);
 assert.equal(md.match(/Câu fallback thực tế/g).length,3);assert.equal(md.match(/Câu đủ điều kiện/g).length,3);
});
