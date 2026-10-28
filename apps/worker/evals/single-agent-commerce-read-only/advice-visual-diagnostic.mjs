// Evaluation-only paired visual replay. No delivery, mutations or generation retry.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {buildAdviceOwnerRequest} from './advice-diagnostic.mjs';
import {buildGeminiCommerceRequest,createGeminiCommerceInference} from './gemini-inference.mjs';
import {validateProtocol,buildVerifierRequest,createCommerceVerifier,sha256} from './protocol.mjs';
import {createCommerceMediaTools} from '../../dist/single-agent-commerce-media.js';
import {buildReadOnlyContext} from '../../dist/single-agent-commerce-read-only-context.js';
import {makeBinding,hardPrecheck,finalGate,terminalFallback} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {validateCapture} from './feedback-control-inputs.mjs';
import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './feedback-run-identity.mjs';
import {requirePassingControls} from './feedback-native-gates.mjs';
export function buildVisualOwnerRequest(row,capture,instructions,id,images){
 const request=buildAdviceOwnerRequest(row,capture,instructions,id,new AbortController().signal);
 if(images!==undefined)request.catalogImages=images;
 buildGeminiCommerceRequest(request); // Validate the final transport body before dispatch.
 return request;
}
async function main(){
const b=resolve('apps/worker/evals/single-agent-commerce-read-only');
const [out]=process.argv.slice(2);assert(out);mkdirSync(out);
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','DIRTY_SOURCE');
const identity=readFeedbackRunIdentity();assertCleanFeedbackSource(identity);
assert(process.env.C3_FEEDBACK_CAPTURE,'CANONICAL_CAPTURE_REQUIRED');
const world=validateCapture(JSON.parse(readFileSync(process.env.C3_FEEDBACK_CAPTURE)));
assert.equal(world.sourceConfigHash,identity.sourceConfigHash,'CAPTURE_CONFIG_CHANGED');
if(!process.argv.includes('--preflight')){
 assert(process.env.C3_CONTROLS_READINESS&&process.env.C3_VISUAL_PREFLIGHT,'CONTROLS_AND_VISUAL_PREFLIGHT_REQUIRED');
 requirePassingControls(process.env.C3_CONTROLS_READINESS,identity);
 const controlsBundle=JSON.parse(readFileSync(resolve(process.env.C3_CONTROLS_READINESS,'prepared.json')));
 assert.equal(controlsBundle.capture.hash,world.hash,'CONTROLS_VISUAL_WORLD_CHANGED');
}
const m=validateProtocol(JSON.parse(readFileSync(resolve(b,'manifest.json'))));
const instructions=readFileSync(resolve(b,'prompts/owner.vi.txt'),'utf8'),vi=readFileSync(resolve(b,'prompts/verifier.vi.txt'),'utf8');
const input=JSON.parse(readFileSync(resolve(b,'sales-media-followup-preparation-20261023/advice-paired-inputs.json')));
const selected=['b1-buying-concern','b1-buying-concern-v2'].map(id=>{const row=input.find(r=>r.caseId===id+':baseline');assert(row,'CAPTURE_MISSING');return row;});
const product=world.product;
const registration={sourceSha,identity,captureHash:world.hash,models:m.models,promptHashes:m.promptHashes,mode:'NEW_CAPTURED_WORLD_VISUAL_REPLAY_NOT_NATIVE_ELIGIBILITY',registeredOutcomes:4,maximumGenerationRequests:8,retry:0,sendEnabled:false,inputHash:sha256(JSON.stringify(selected.map(r=>r.runtime))),registryHash:sha256(JSON.stringify(product))};
writeFileSync(resolve(out,'registration.json'),JSON.stringify(registration,null,2));
const prepared=[];
try{
 for(const [pair,row] of selected.entries()){
  assert((!row.ownerInstructions||sha256(row.ownerInstructions)===sha256(instructions))&&!row.ownerDescriptions,'UNREGISTERED_TREATMENT');
  // Reuse registered customer inputs only. Never combine historical facts/clock with fresh media.
  const capture={context:structuredClone(world.trusted),capturedAt:world.capturedAt};
  const now=new Date(capture.capturedAt);assert(Number.isFinite(now.getTime()),'CAPTURE_CLOCK');
  const base={snapshot:()=>structuredClone(capture.context),readback:async()=>structuredClone(capture.context)};
  const tools=createCommerceMediaTools({base,catalog:{readProduct:async()=>({product:structuredClone(product)})},clock:()=>now,allowedHostSuffixes:['content.pancake.vn']});
  const result=await tools.invoke({name:'view_product_media',args:{subjectRef:product.productId,intent:'GENERIC'}});
  assert.equal(result.status,'OK','VISION_PREPARATION_UNAVAILABLE');
  const images=tools.catalogImages();assert(images.length>0&&images.length<=2,'IMAGE_COUNT');
  const treatment=tools.snapshot(),baseline=structuredClone(capture.context);
  const normalize=c=>buildReadOnlyContext({state:c.state,subjects:c.boundSubjects,claims:c.protectedClaims,products:c.runtimeProducts,policies:c.policyLiterals.filter(p=>!p.ref.startsWith('vision:')),receipts:c.effectReceipts,...(c.cartBinding?{cartBinding:c.cartBinding}:{})});
  assert.deepEqual(normalize(treatment),normalize(baseline),'COMMON_FIELDS_CHANGED');
  for(const arm of pair===0?['baseline','visual']:['visual','baseline']){
   const id=randomUUID(),trusted=arm==='visual'?treatment:baseline;
   const request=buildVisualOwnerRequest(row,{...capture,context:trusted},instructions,id,arm==='visual'?images:undefined);
   const wire=buildGeminiCommerceRequest(request),count=wire.contents.flatMap(c=>c.parts).filter(p=>p.inlineData).length;
   assert.equal(count,arm==='visual'?images.length:0,'INLINE_DATA_MISSING');
   const forbidden=new Set(['caseId','evaluator','purposeId','qualityScore','expectedSafe']);
   const scan=x=>{if(Array.isArray(x))x.forEach(scan);else if(x&&typeof x==='object'){for(const[k,v]of Object.entries(x)){assert(!forbidden.has(k),'LABEL_LEAK');scan(v);}}else if(typeof x==='string'&&x.trim().startsWith('{')){let value;try{value=JSON.parse(x);}catch{}if(value)scan(value);}};scan(wire);
   prepared.push({pair,arm,caseId:row.caseId,now:now.toISOString(),latest:row.runtime.latest,history:row.runtime.history,trusted,request,wireHash:sha256(JSON.stringify(wire)),imageHashes:arm==='visual'?images.map(i=>i.sha256):[]});
  }
 }
 assert.equal(prepared.length,4);if(process.env.C3_VISUAL_PREFLIGHT){const frozen=JSON.parse(readFileSync(process.env.C3_VISUAL_PREFLIGHT));assert.deepEqual(frozen.identity,identity,'VISUAL_IDENTITY_CHANGED');assert.equal(frozen.captureHash,world.hash,'VISUAL_CAPTURE_CHANGED');assert.deepEqual(prepared.map(p=>({pair:p.pair,arm:p.arm,wireHash:p.wireHash,imageHashes:p.imageHashes})),frozen.outcomes.map(p=>({pair:p.pair,arm:p.arm,wireHash:p.wireHash,imageHashes:p.imageHashes})),'FROZEN_BUNDLE_CHANGED');}writeFileSync(resolve(out,'preflight.json'),JSON.stringify({status:'PASS',identity,captureHash:world.hash,outcomes:prepared.map(({request,...x})=>x)},null,2));
}catch(e){writeFileSync(resolve(out,'summary.json'),JSON.stringify({status:'BLOCKED',stage:'ZERO_GENERATION_PREFLIGHT',reason:e.code??e.message,providerRequests:0}));throw e;}
if(process.argv.includes('--preflight')){writeFileSync(resolve(out,'summary.json'),JSON.stringify({status:'PREFLIGHT_PASS',providerRequests:0}));process.exit(0);}
const config=JSON.parse(readFileSync(resolve(b,'source-config.b1.json')));
const infer=createGeminiCommerceInference({model:m.models.conversation.model,effort:'high',location:'global',projectId:config.vertex.projectId});
const audit=(id,phase,value)=>appendFileSync(resolve(out,'requests.jsonl'),JSON.stringify({id,phase,value})+'\n');
const verify=createCommerceVerifier(m,undefined,(id,v)=>audit(id,v.phase,v.provider));
for(const [index,p]of prepared.entries()){
 assertCleanFeedbackSource(identity);
 const gens=[];let draft=null,terminal=terminalFallback(m.fallback.id);
 try{
  audit(p.request.generationId,'OWNER_REQUEST',buildGeminiCommerceRequest(p.request));
  const g=await infer(p.request);gens.push({role:'owner',status:'OK',telemetry:g.telemetry});assert.equal(g.kind,'FINAL','OWNER_TOOL_MODE');draft=g.text;
  const binding=makeBinding(p.request.generationId,draft,p.trusted);let response={kind:'PROVIDER_ERROR'};
  if(!hardPrecheck(p.trusted,draft,new Date(p.now))){
   assertCleanFeedbackSource(identity);
   const r={generationId:p.request.generationId+':verifier',instructions:vi,finalDraft:draft,trusted:p.trusted,latest:p.latest,history:p.history,binding,turnTime:p.request.turnTime,signal:new AbortController().signal};
   audit(r.generationId,'VERIFIER_REQUEST',buildVerifierRequest(m,r));
   try{const v=await verify(r);gens.push({role:'verifier',status:'OK',telemetry:v.telemetry});response={kind:'VERDICT',binding,result:v.result};}catch(e){gens.push({role:'verifier',status:'ERROR',telemetry:e.telemetry??null});}
  }
  terminal=finalGate({expected:binding,response,current:structuredClone(p.trusted),finalDraft:draft,now:new Date(p.now),fallback:m.fallback});
 }catch(e){if(e.telemetry)gens.push({role:'owner',status:'ERROR',telemetry:e.telemetry});terminal={...terminalFallback(m.fallback.id),reason:'PROVIDER_ERROR'};}
 writeFileSync(resolve(out,`attempt-${index+1}.json`),JSON.stringify({pair:p.pair,arm:p.arm,caseId:p.caseId,draft,terminal,generations:gens,sendEnabled:false},null,2));
}
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha,'SOURCE_CHANGED');
writeFileSync(resolve(out,'summary.json'),JSON.stringify({status:'COMPLETE',outcomes:4,maximumGenerationRequests:8}));

}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
