// Evaluation only: three captured-world post-read pairs, not current send eligibility.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomInt} from 'node:crypto';
import {canonicalJsonV1} from '@lana/contracts';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {validateProtocol,sha256,createCommerceVerifier,buildVerifierRequest} from './protocol.mjs';
import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './feedback-run-identity.mjs';
import {requirePassingControls} from './feedback-native-gates.mjs';
const exposed=['b1-buying-concern-v2','b1-price','b1-price-v3'];
const unexposed=['b1-buying-concern','b1-buying-concern-v3','b1-price-v2','b1-current-policy','b1-changed-occasion-v3'];
const equal=(a,b,message)=>assert.equal(canonicalJsonV1(a),canonicalJsonV1(b),message);

// Independent golden transformation of the captured, already projected provider wire.
export function normalizedCapturedWire(original){
 const wire=structuredClone(original),top=JSON.parse(wire.contents[0].parts[0].text);
 top.trusted.execution={availableTools:[],toolsAllowed:false,callableTools:[],phase:'FINAL_REPLY',toolBudget:{roundsRemaining:0,callsRemaining:0}};
 wire.contents[0].parts[0].text=JSON.stringify(top);
 const start=wire.contents.findIndex(m=>m.parts.some(p=>p.functionCall||p.functionResponse));
 if(start>=0){
 assert(start>0,'MISSING_NATIVE_TRACE');
 const trace=wire.contents.slice(start).map(m=>({role:m.role,parts:m.parts
  .filter(p=>!p.thought&&(p.text!==undefined||p.functionCall||p.functionResponse))
  .map(p=>Object.fromEntries(['text','functionCall','functionResponse'].filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]])))}));
 wire.contents=[...wire.contents.slice(0,start),{role:'user',parts:[{text:JSON.stringify({completedToolTurns:trace})}]}];
 }
 wire.tools=[];wire.toolConfig={functionCallingConfig:{mode:'NONE'}};
 return wire;
}
export function stripQuote(original){
 const wire=structuredClone(original);let removed=0;
 for(const message of wire.contents.slice(1))for(const part of message.parts){
  if(typeof part.text!=='string')continue;
  let value;try{value=JSON.parse(part.text);}catch{continue;}
  if(!Array.isArray(value.completedToolTurns))continue;
  for(const m of value.completedToolTurns)for(const p of m.parts??[]){
   const response=p.functionResponse,data=response?.response?.data;
   if(response?.name!=='read_product'||!data||!Object.hasOwn(data,'openingQuote'))continue;
   assert(data.openingQuote&&typeof data.openingQuote==='object'&&!Array.isArray(data.openingQuote),'QUOTE_SHAPE');
   delete data.openingQuote;removed++;
  }
  part.text=JSON.stringify(value);
 }
 return {wire,removed};
}
export function buildQuoteRequest(row,arm,id,instructions,signal=new AbortController().signal){
 assert(['A','B'].includes(arm));
 const base=normalizedCapturedWire(row.wire),wire=arm==='B'?stripQuote(base).wire:base;
 const top=JSON.parse(wire.contents[0].parts[0].text);
 return {generationId:id+':owner:1',instructions,turnTime:top.turnTime,contents:wire.contents.slice(1),
  context:structuredClone(row.capture.context),availableTools:[],toolsAllowed:false,toolBudget:{roundsRemaining:0,callsRemaining:0},signal};
}
export function prepareQuoteDiagnostic(frozen,instructions){
 const {hash,...payload}=frozen;assert.equal(sha256(JSON.stringify(payload)),hash,'FROZEN_INPUT_CHANGED');
 assert.equal(frozen.schemaVersion,1);assert.equal(frozen.records.length,8);
 assert.deepEqual(frozen.records.map(r=>r.caseId).sort(),[...exposed,...unexposed].sort(),'WRONG_POPULATION');
 const pairs=[],offlineControls=[];
 for(const row of frozen.records){
  assert.equal(sha256(JSON.stringify(row.wire)),row.source.ownerRequestHash,'WIRE_CHANGED');
  assert.equal(sha256(JSON.stringify(row.capture)),row.source.captureHash,'CAPTURE_CHANGED');
  assert.equal(row.source.sourceSha,'468d85ea6577c428cf2f6f155c9774926537364b');
  assert.equal(row.capture.generationId,row.source.generationId);assert(Number.isFinite(Date.parse(row.capture.capturedAt)));
  assert.equal(row.wire.systemInstruction.parts[0].text,instructions,'PROMPT_CHANGED');
  const A=buildGeminiCommerceRequest(buildQuoteRequest(row,'A','neutral',instructions)),expected=normalizedCapturedWire(row.wire);
  equal(A,expected,'NORMALIZED_BASELINE_CHANGED');
  const B=buildGeminiCommerceRequest(buildQuoteRequest(row,'B','neutral',instructions)),treatment=stripQuote(A);
  equal(B,treatment.wire,'UNREGISTERED_PAIR_CHANGE');
  for(const wire of [A,B]){
   assert(Buffer.byteLength(JSON.stringify(wire))<=65536,'WIRE_BOUND');
   assert(!JSON.stringify(wire).includes(row.caseId),'EVALUATOR_LABEL_LEAK');
  }
  if(exposed.includes(row.caseId)){assert.equal(treatment.removed,1,'EXPOSURE_CHANGED');pairs.push({caseId:row.caseId,removedQuotes:1,wires:{A,B}});}
  else{assert.equal(treatment.removed,0,'UNEXPOSED_CHANGED');equal(A,B);offlineControls.push({caseId:row.caseId,wireHash:sha256(JSON.stringify(A))});}
 }
 const slots=exposed.flatMap((caseId,i)=>(i===1?['B','A']:['A','B']).map(arm=>({id:sha256('quote-presentation-20261026:'+i+':'+arm),caseId,arm})));
 return {inputHash:hash,pairs,offlineControls,slots};
}
export async function recordQuoteSlot({row,arm,id,ownerPrompt,verifierPrompt,manifest,infer,verify,audit,gate,buildVerifierWire=buildVerifierRequest}){
 const now=new Date(row.capture.capturedAt),trusted=structuredClone(row.capture.context),request=buildQuoteRequest(row,arm,id,ownerPrompt);
 const generations=[];let draft=null,verificationLatencyMs=null;const started=performance.now();
 try{
  const wire=buildGeminiCommerceRequest(request);audit(request.generationId,'OWNER_REQUEST',wire);
  let generated;
  try{generated=await infer(request);generations.push({role:'owner',status:'OK',telemetry:generated.telemetry});}
  catch(e){generations.push({role:'owner',status:'ERROR',telemetry:e.telemetry??null});throw e;}
  audit(request.generationId,'OWNER_RESULT',generated);assert.equal(generated.kind,'FINAL','OWNER_TOOL_MODE');draft=generated.text;
  const binding=gate.makeBinding(id,draft,trusted),problem=gate.hardPrecheck(trusted,draft,now);let response={kind:'PROVIDER_ERROR'};
  if(!problem){
   const req={generationId:id+':verifier:1',instructions:verifierPrompt,finalDraft:draft,trusted,latest:row.runtime.latest,history:row.runtime.history,binding,turnTime:request.turnTime,signal:request.signal};
   audit(req.generationId,'VERIFIER_REQUEST',buildVerifierWire(manifest,req));const start=performance.now();
   try{const v=await verify(req);generations.push({role:'verifier',status:'OK',telemetry:v.telemetry});response={kind:'VERDICT',binding,result:v.result};audit(req.generationId,'VERIFIER_RESULT',v);}
   catch(e){generations.push({role:'verifier',status:'ERROR',telemetry:e.telemetry??null});audit(req.generationId,'VERIFIER_ERROR',{code:e.code??'PROVIDER_ERROR',telemetry:e.telemetry??null});}
   verificationLatencyMs=performance.now()-start;
  }
  const terminal=gate.finalGate({expected:binding,response,current:structuredClone(trusted),finalDraft:draft,now,includeDiagnostic:true,fallback:manifest.fallback});
  return {draft,terminal,generations,verificationLatencyMs,elapsedMs:performance.now()-started,replayClock:row.capture.capturedAt,precheck:problem??null};
 }catch(e){
  return {draft,terminal:{...gate.terminalFallback(manifest.fallback.id,manifest.fallback.text),reason:'PROVIDER_ERROR'},error:e.code??'OWNER_GENERATION_FAILED',
   generations,verificationLatencyMs,elapsedMs:performance.now()-started,replayClock:row.capture.capturedAt};
 }
}
export function renderBlindPairs(records,attempts,mapping){
 const lines=['# Paired whole-turn review','',
  'Captured-world final-reply diagnostic. No live delivery. X/Y mapping withheld until review is frozen.',
  'Đọc toàn lượt: đáp đúng băn khoăn, giúp chọn mua, thông tin cần còn đủ, mạch/giọng và factual/action safety. Ngắn hơn không tự thắng.',
  'Với ca hỏi giá, kiểm tên/phần bán/giá/size và phần form nguồn có; không bắt trường mà nguồn không có.',
  'Chỉ chấm terminal text bên dưới; reply bị chặn không phải câu khách nhận. Lỗi/fallback không bị loại khỏi population.',''];
 for(const [i,caseId]of exposed.entries()){
  const row=records.find(r=>r.caseId===caseId);lines.push(`## Pair ${i+1}`,'');
  for(const h of row.runtime.history)lines.push(`${h.role==='customer'?'Khách':'Shop'}: ${h.text}`,'');
  lines.push('Khách: '+row.runtime.latest,'');
  for(const label of ['X','Y']){
   const a=attempts.find(a=>a.slot.caseId===caseId&&a.slot.arm===mapping[i][label]);assert(a,'BLIND_MISSING_SLOT');
   const t=a.result.terminal;
   lines.push(`### ${label}`, '',`Terminal: ${t.disposition}`,'',t.text??'(không có tin gửi khách)','');
  }
 }
 return lines.join('\n');
}
async function main(){
 const [out,mode,controls,prepared]=process.argv.slice(2);assert(out&&['--preflight','--run'].includes(mode));
 const identity=readFeedbackRunIdentity();assertCleanFeedbackSource(identity);
 const manifest=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))));
 const ownerPrompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifierPrompt=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 const frozen=JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url)));
 const bundle=prepareQuoteDiagnostic(frozen,ownerPrompt);
 assert.equal(manifest.models.conversation.model,'gemini-3.5-flash-lite');assert.equal(manifest.models.verifier.model,'gpt-6.1-sol');
 assert(Object.values(manifest.models).every(m=>m.effort==='high'));
 const gate=await import('../../dist/single-agent-semantic-verifier-boundary.js');
 // All frozen historical worlds must be fresh at their registered historical clocks before any generation.
 for(const row of frozen.records)assert.equal(gate.hardPrecheck(row.capture.context,'Dạ.',new Date(row.capture.capturedAt)),null,'CAPTURE_NOT_REPLAYABLE');
 const controlsHash=requirePassingControls(controls,identity);
 const registration={identity,inputHash:frozen.hash,bundleHash:sha256(JSON.stringify(bundle)),controlsHash,registeredOutcomes:6,
  mode:'CAPTURED_WORLD_FINAL_REPLY_DIAGNOSTIC_NOT_LIVE_ELIGIBILITY',maximumGenerationRequests:12,repetitions:1,retry:0,sendEnabled:false,slots:bundle.slots};
 if(mode==='--run'){assert(prepared,'PREFLIGHT_REQUIRED');assert.deepEqual(JSON.parse(readFileSync(resolve(prepared))),registration,'PREFLIGHT_CHANGED');}
 mkdirSync(out);writeFileSync(resolve(out,'registration.json'),JSON.stringify(registration,null,2),{flag:'wx'});
 if(mode==='--preflight'){writeFileSync(resolve(out,'preflight.json'),JSON.stringify({status:'PASS',providerRequests:0,offlineControls:bundle.offlineControls},null,2),{flag:'wx'});return;}
 // Shuffle policy is frozen; mapping is preregistered before dispatch and excluded from blind file.
 const mapping=exposed.map(()=>randomInt(2)?{X:'A',Y:'B'}:{X:'B',Y:'A'});
 writeFileSync(resolve(out,'BLIND_MAPPING.json'),JSON.stringify(mapping,null,2),{flag:'wx'});
 const audit=(id,phase,value)=>appendFileSync(resolve(out,'requests.jsonl'),JSON.stringify({id,phase,value})+'\n');
 const config=JSON.parse(readFileSync(new URL('./source-config.b1.json',import.meta.url)));
 const infer=createGeminiCommerceInference({model:manifest.models.conversation.model,effort:'high',location:'global',projectId:config.vertex.projectId});
 const verify=createCommerceVerifier(manifest,undefined,(id,v)=>audit(id,v.phase,v.provider));
 const attempts=[];
 for(const [i,slot]of bundle.slots.entries()){
  assertCleanFeedbackSource(identity);
  const row=frozen.records.find(r=>r.caseId===slot.caseId);
  const result=await recordQuoteSlot({row,arm:slot.arm,id:slot.id,ownerPrompt,verifierPrompt,manifest,infer,verify,audit,gate});
  const attempt={slot,runtime:row.runtime,result,sendEnabled:false};attempts.push(attempt);
  writeFileSync(resolve(out,`attempt-${i+1}.json`),JSON.stringify(attempt,null,2),{flag:'wx'});
 }
 assertCleanFeedbackSource(identity);
 writeFileSync(resolve(out,'BLIND_REVIEW.md'),renderBlindPairs(frozen.records,attempts,mapping),{flag:'wx'});
 writeFileSync(resolve(out,'complete.json'),JSON.stringify({completed:6,sendEnabled:false}),{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
