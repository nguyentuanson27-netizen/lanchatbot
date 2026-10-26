// One frozen paired diagnostic; historical worlds, no native effects or current delivery.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomInt} from 'node:crypto';
import {buildQuoteRequest,prepareQuoteDiagnostic,recordQuoteSlot} from './quote-presentation-diagnostic.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {readDataBlocks,contextDataBlocks,readCompactSections,compactContextSections} from './owner-data-presentation.mjs';
import {sha256,validateProtocol,createCommerceVerifier} from './protocol.mjs';
import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './feedback-run-identity.mjs';
import {requirePassingControls} from './feedback-native-gates.mjs';
import * as gate from '../../dist/single-agent-semantic-verifier-boundary.js';

const V1='VI_DATA_BLOCKS_V1',V2='VI_DATA_BLOCKS_COMPACT_V2';
const checkPresentation=p=>assert([V1,V2].includes(p),'OWNER_PRESENTATION');
export function parsePresentationArgs(args){
 const values=[...args];let presentation=V1;
 const index=values.indexOf('--presentation');
 if(index>=0){assert.equal(index,values.length-2,'PRESENTATION_ARGUMENT');presentation=values.at(-1);values.splice(index,2);}
 checkPresentation(presentation);
 const [out,mode,controls,prepared]=values;
 assert(out&&controls&&['--preflight','--run'].includes(mode),'PRESENTATION_ARGUMENT');
 assert.equal(values.length,mode==='--preflight'?3:4,'PRESENTATION_ARGUMENT');
 if(mode==='--run')assert(prepared,'PREFLIGHT_REQUIRED');
 return {out,mode,controls,prepared,presentation};
}
export function prepareFullPresentation(frozen,prompt,presentation=V1){
 checkPresentation(presentation);
 prepareQuoteDiagnostic(frozen,prompt);const wires=[],slots=[];
 for(const [i,row]of frozen.records.entries()){
  assert.equal(gate.hardPrecheck(row.capture.context,'Dạ.',new Date(row.capture.capturedAt)),null);
  const req=buildQuoteRequest(row,'A','neutral',prompt),A=buildGeminiCommerceRequest(req),B=buildGeminiCommerceRequest({...req,ownerContextPresentation:presentation});
  if(presentation===V1)assert.deepEqual(readDataBlocks(B.contents[0]),contextDataBlocks(A));
  else assert.deepEqual(readCompactSections(B.contents[0]),compactContextSections(A).map(({label,value})=>({label,value})));
  assert.notDeepEqual(A,B);
  assert.equal(B.contents.at(-1).parts[0].text,row.runtime.latest);
  wires.push({caseId:row.caseId,A,B});
  const prefix=presentation===V1?'full-context-presentation-20261026':'compact-context-presentation-v2-20261026';
  for(const arm of i%2?['B','A']:['A','B'])slots.push({id:sha256(prefix+':'+i+':'+arm),caseId:row.caseId,arm});
 }
 assert.equal(slots.length,16);return {wires,slots};
}
export function recordPresentationSlot({slot,presentation,...args}){
 checkPresentation(presentation);assert(['A','B'].includes(slot.arm),'PRESENTATION_ARM');
 return recordQuoteSlot({...args,arm:'A',id:slot.id,contextPresentation:slot.arm==='B'?presentation:undefined});
}
function blindText(records,attempts,mapping){
 const text=['# Whole-turn paired review','',
  'Historical replay, not live delivery. Judge whole-turn need resolution/usefulness, natural voice/coherence, missing information and factual/action safety. Shorter is not automatically better. Terminal text only; mappings withheld.',''];
 for(const [i,row]of records.entries()){
  text.push(`## Pair ${i+1}`,'');for(const h of row.runtime.history)text.push(`${h.role==='customer'?'Khách':'Shop'}: ${h.text}`,'');
  text.push('Khách: '+row.runtime.latest,'');
  for(const label of ['X','Y']){
   const t=attempts.find(a=>a.slot.caseId===row.caseId&&a.slot.arm===mapping[i][label]).result.terminal;
   text.push(`### ${label}`,'',`Terminal: ${t.disposition}`,'',t.text??'(không gửi tin khách)','');
  }
 }
 return text.join('\n');
}
async function main(){
 const {out,mode,controls,prepared,presentation}=parsePresentationArgs(process.argv.slice(2));
 const identity=readFeedbackRunIdentity();assertCleanFeedbackSource(identity);
 const frozen=JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url)));
 const ownerPrompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifierPrompt=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 const bundle=prepareFullPresentation(frozen,ownerPrompt,presentation),manifest=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))));
 assert.equal(manifest.models.conversation.model,'gemini-3.5-flash-lite');assert.equal(manifest.models.verifier.model,'gpt-6.1-sol');assert(Object.values(manifest.models).every(m=>m.effort==='high'));
 const registration={identity,inputHash:frozen.hash,bundleHash:sha256(JSON.stringify(bundle)),controlsHash:requirePassingControls(controls,identity),
  mode:'CAPTURED_WORLD_FULL_CONTEXT_PRESENTATION_NOT_LIVE_ELIGIBILITY',ownerContextPresentation:presentation,slots:bundle.slots,registeredOutcomes:16,maximumGenerationRequests:32,repetitions:1,retry:0,sendEnabled:false};
 if(mode==='--run'){assert(prepared);assert.deepEqual(JSON.parse(readFileSync(prepared)),registration,'FROZEN_PREFLIGHT_CHANGED');}
 mkdirSync(out);writeFileSync(resolve(out,'registration.json'),JSON.stringify(registration,null,2),{flag:'wx'});
 if(mode==='--preflight'){writeFileSync(resolve(out,'preflight.json'),JSON.stringify({status:'PASS',providerRequests:0,wireHashes:bundle.wires.map(r=>({caseId:r.caseId,A:sha256(JSON.stringify(r.A)),B:sha256(JSON.stringify(r.B))}))},null,2),{flag:'wx'});return;}
 const mapping=frozen.records.map(()=>randomInt(2)?{X:'A',Y:'B'}:{X:'B',Y:'A'});
 writeFileSync(resolve(out,'BLIND_MAPPING.json'),JSON.stringify(mapping,null,2),{flag:'wx'});
 const config=JSON.parse(readFileSync(new URL('./source-config.b1.json',import.meta.url))),audit=(id,phase,value)=>appendFileSync(resolve(out,'requests.jsonl'),JSON.stringify({id,phase,value})+'\n');
 const infer=createGeminiCommerceInference({model:manifest.models.conversation.model,effort:'high',location:'global',projectId:config.vertex.projectId});
 const verify=createCommerceVerifier(manifest,undefined,(id,v)=>audit(id,v.phase,v.provider)),attempts=[];
 for(const [i,slot]of bundle.slots.entries()){
  assertCleanFeedbackSource(identity);const row=frozen.records.find(r=>r.caseId===slot.caseId);
  // Both arms keep openingQuote. Only the optional whole-wire data presentation differs.
  const result=await recordPresentationSlot({slot,presentation,row,ownerPrompt,verifierPrompt,manifest,infer,verify,audit,gate});
  const a={slot,runtime:row.runtime,result,sendEnabled:false};attempts.push(a);
  writeFileSync(resolve(out,`attempt-${i+1}.json`),JSON.stringify(a,null,2),{flag:'wx'});
 }
 assertCleanFeedbackSource(identity);writeFileSync(resolve(out,'BLIND_REVIEW.md'),blindText(frozen.records,attempts,mapping),{flag:'wx'});
 writeFileSync(resolve(out,'complete.json'),JSON.stringify({completed:16,sendEnabled:false}),{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
