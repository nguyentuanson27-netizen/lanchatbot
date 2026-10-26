import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sha256,validateProtocol} from './protocol.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {buildQuoteRequest} from './quote-presentation-diagnostic.mjs';
import {parsePresentationArgs,prepareFullPresentation,recordPresentationSlot} from './full-context-presentation.mjs';
import * as gate from '../../dist/single-agent-semantic-verifier-boundary.js';
const V1='VI_DATA_BLOCKS_V1',V2='VI_DATA_BLOCKS_COMPACT_V2';
const frozen=()=>JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url)));
const prompt=()=>readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
test('legacy commands keep V1; compact is explicit and malformed selections fail closed',()=>{
 assert.equal(parsePresentationArgs(['new-out','--preflight','controls']).presentation,V1);
 assert.equal(parsePresentationArgs(['new-out','--run','controls','prepared']).presentation,V1);
 assert.equal(parsePresentationArgs(['new-out','--preflight','controls','--presentation',V2]).presentation,V2);
 assert.equal(parsePresentationArgs(['new-out','--run','controls','prepared','--presentation',V2]).presentation,V2);
 for(const args of [
  ['out','--preflight','controls','--presentation','UNKNOWN'],
  ['out','--preflight','controls','--presentation'],
  ['out','--preflight','controls','--compact-v2'],
  ['out','--run','controls'],
  ['out','--run','controls','prepared','--presentation',V2,'extra'],
 ])assert.throws(()=>parsePresentationArgs(args));
});
test('V1 registration inputs remain byte-equivalent while V2 gets separate identities and exact compact wires',()=>{
 const f=frozen(),p=prompt(),old=prepareFullPresentation(f,p),compact=prepareFullPresentation(f,p,V2);
 const historical=JSON.parse(readFileSync(new URL('./full-context-presentation-run-20261026/REGISTRATION.json',import.meta.url)));
 assert.equal(sha256(JSON.stringify(old)),historical.bundleHash,'HISTORICAL_V1_BUNDLE_CHANGED');
 assert.deepEqual(old,prepareFullPresentation(f,p,V1));assert.equal(compact.slots.length,16);
 const oldIds=new Set(old.slots.map(s=>s.id));assert(compact.slots.every(s=>!oldIds.has(s.id)));
 for(const [i,pair]of compact.wires.entries()){
  assert.deepEqual(pair.A,old.wires[i].A);
  const req=buildQuoteRequest(f.records[i],'A','neutral',p);
  assert.deepEqual(pair.B,buildGeminiCommerceRequest({...req,ownerContextPresentation:V2}));
  assert.equal(old.slots[i*2].id,sha256('full-context-presentation-20261026:'+i+':'+old.slots[i*2].arm));
 }
 assert.throws(()=>prepareFullPresentation(f,p,'UNKNOWN'),/OWNER_PRESENTATION/);
});
test('actual slot dispatch obeys selection, excludes labels and invokes verifier exactly once',async()=>{
 const f=frozen(),row=f.records.find(r=>r.caseId==='b1-price'),p=prompt(),manifest=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))));
 for(const presentation of [V1,V2])for(const arm of ['A','B']){
  let wire,ownerCalls=0,verifierCalls=0;
  const infer=createGeminiCommerceInference({model:'gemini-3.5-flash-lite',effort:'high',location:'global',projectId:'test'},
   {getToken:async()=>'test',fetchImpl:async(_url,init)=>{ownerCalls++;wire=JSON.parse(init.body);return new Response(JSON.stringify({modelVersion:'gemini-3.5-flash-lite',
    candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'Cả bộ Thạch Thảo 799k chị nhé.'}]}}]}));}});
  const result=await recordPresentationSlot({slot:{id:'neutral-slot',caseId:'EVAL_CASE_ID',arm},presentation,row,ownerPrompt:p,
   verifierPrompt:readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8'),manifest,infer,
   verify:async()=>{verifierCalls++;return {result:{verdict:'PASS',violations:[]},telemetry:{providerRequests:1}};},audit:()=>{},gate});
  const req=buildQuoteRequest(row,'A','neutral-slot',p);if(arm==='B')req.ownerContextPresentation=presentation;
  assert.deepEqual(wire,buildGeminiCommerceRequest(req));assert.equal(result.terminal.disposition,'SEND_ELIGIBLE');
  assert.equal(ownerCalls,1);assert.equal(verifierCalls,1);assert.doesNotMatch(JSON.stringify(wire),/EVAL_CASE_ID|ownerContextPresentation/);
 }
});
