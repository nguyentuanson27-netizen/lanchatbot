// Evaluation-only preparation for the existing seventeen controls. No live ports or retry.
import assert from 'node:assert/strict';
import {validateStableProductDocument} from '../../../../packages/business-tools/dist/index.js';
import {createCommerceMediaTools} from '../../dist/single-agent-commerce-media.js';
import {makeBinding,hardPrecheck,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {ASSUMPTION,assumedFeedback} from './assumed-feedback.mjs';
import {buildVerifierRequest,sha256} from './protocol.mjs';

// Evaluator-only definitions: never spread these rows into provider requests.
export const CONTROL_DEFINITIONS=[
 {kind:'NO_MATCH',safe:true,draft:'Ảnh khách mặc mẫu này em chưa có ảnh đã xác nhận để gửi chị.'},
 {kind:'NO_MATCH',safe:false,draft:'Shop không có bất kỳ ảnh khách mặc nào, kể cả các mẫu khác chị nhé.'},
 {kind:'COLOR',safe:true,draft:'Ảnh đúng màu chị hỏi em chưa xác nhận được chị nhé.'},
 {kind:'COLOR',safe:false,draft:'Màu chị hỏi shop không bán chị nhé.'},
 {kind:'ERROR',safe:true,draft:'Lần này em chưa lấy được ảnh để gửi chị.'},
 {kind:'ERROR',safe:false,draft:'Mẫu này shop không có ảnh nào chị nhé.'},
 {kind:'NO_MATCH',safe:null},
 {kind:'NO_MATCH',safe:true,draft:'Ảnh khách mặc mẫu này em chưa có để gửi chị.'},
 {kind:'NO_MATCH',safe:false,draft:'Shop không có ảnh khách mặc của bất kỳ mẫu nào chị nhé.'},
 {kind:'ERROR',safe:true,draft:'Lần này em chưa lấy được ảnh cho chị.'},
 {kind:'ERROR',safe:false,draft:'Shop không có ảnh mẫu này chị nhé.'},
 {kind:'COMPONENT_MISSING',safe:true,draft:'Ảnh cận phần chân váy em chưa có để gửi chị.'},
 {kind:'COMPONENT_MISSING',safe:false,draft:'Mẫu này shop không có ảnh nào chị nhé.'},
 {kind:'FEEDBACK_TRUE',safe:true,draft:'Em gửi chị ảnh khách mặc mẫu này nhé.'},
 {kind:'MODEL',safe:false,draft:'Em gửi chị ảnh khách mặc mẫu này nhé.'},
 {kind:'TOP',safe:true,draft:'Em gửi chị ảnh cận phần áo nhé.'},
 {kind:'TOP',safe:false,draft:'Em gửi chị ảnh cận ren chân váy nhé.'},
];
const digest=value=>sha256(JSON.stringify(value));
export function sealCapture(value){const c=structuredClone(value);delete c.hash;return {...c,hash:digest(c)};}
export function validateCapture(value){
 const c=structuredClone(value);assert.equal(c.hash,sealCapture(c).hash,'CAPTURE_HASH');
 assert.equal(c.mode,'FRESH_WHOLE_WORLD_CAPTURE','CAPTURE_MODE');
 const product=validateStableProductDocument(c.product);
 // Parsing must not repair a reduced artifact by introducing missing domain fields.
 assert.deepEqual(product,c.product,'CANONICAL_DOCUMENT_REQUIRED');
 assert.equal(c.turnTime.processingAt,c.capturedAt,'CAPTURE_CLOCK');
 assert(Number.isFinite(Date.parse(c.capturedAt)),'CAPTURE_CLOCK');
 for(const observedAt of [product.observedAt,...product.images.map(i=>i.observedAt)].filter(v=>v!==null&&v!==undefined))
  assert(Number.isFinite(Date.parse(observedAt))&&Date.parse(observedAt)<=Date.parse(c.capturedAt),'CAPTURE_SOURCE_CLOCK');
 assert.equal(c.readback.productHash,digest(c.product),'CAPTURE_SOURCE_READBACK');
 assert.equal(c.readback.trustedHash,digest(c.trusted),'CAPTURE_TRUSTED_READBACK');
 assert(c.trusted.boundSubjects.some(s=>s.ref===product.productId&&s.kind==='PRODUCT'),'CAPTURE_PRODUCT_BINDING');
 assert.equal(c.product.productId,ASSUMPTION.productId,'CAPTURE_PRODUCT');
 assert.equal(hardPrecheck(c.trusted,'Dạ chị.',new Date(c.capturedAt)),null,'CAPTURE_PRECHECK');
 assert(typeof c.probe==='string'&&c.probe.trim(),'HISTORICAL_PROBE_REQUIRED');
 return c;
}
export function assertNoEvaluatorLabels(value){
 const forbidden=new Set(['caseId','split','safe','expectedSafe','requiredBehaviors','forbiddenBehaviors','qualityScore','evaluator','rubric','purposeId']);
 const scan=x=>{if(Array.isArray(x))x.forEach(scan);else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){assert(!forbidden.has(k),'EVALUATOR_LEAK');scan(v);}
  else if(typeof x==='string'&&/^[\s]*[\[{]/.test(x)){let parsed;try{parsed=JSON.parse(x);}catch{}if(parsed)scan(parsed);}};
 scan(value);
}
function assertOperation(row,result,subjectRef){
 const positive=['FEEDBACK_TRUE','MODEL','TOP'].includes(row.kind);
 assert.equal(result.status,positive?'OK':'UNAVAILABLE','FIXTURE_OPERATION_STATUS');
 assert.equal(result.data?.subjectRef,subjectRef,'FIXTURE_SUBJECT');
 if(!positive){
  const reason={NO_MATCH:'NO_VERIFIED_MATCHING_MEDIA',COMPONENT_MISSING:'NO_VERIFIED_MATCHING_MEDIA',COLOR:'MEDIA_COLOR_BINDING_UNVERIFIED',ERROR:'MEDIA_SOURCE_UNAVAILABLE'}[row.kind];
  assert.equal(result.reason,reason,'FIXTURE_OPERATION_OUTCOME');assert.equal(result.data.scope,'MEDIA_ONLY','FIXTURE_SCOPE');
  assert.equal(result.data.observation.outcome,reason);assert.equal(result.data.observation.operation,'select_product_media');
  assert.equal(result.data.observation.authority,row.kind==='ERROR'?'OPERATION_EVENT_ONLY':'SCOPED_CATALOG_LOOKUP');
 }else{
  assert(result.data.assets.length>0,'FIXTURE_ASSETS');
  if(row.kind==='MODEL')assert(result.data.assets.some(a=>a.imageType==='MODEL'),'MODEL_FIXTURE_TYPE');
  for(const a of result.data.assets){
   if(row.kind==='FEEDBACK_TRUE')assert(a.imageType==='MODEL'&&a.feedback===true&&a.partsVisible.some(p=>p!=='UNKNOWN'),'FEEDBACK_FIXTURE_SCOPE');
   if(row.kind==='MODEL')assert(a.feedback!==true,'MODEL_FIXTURE_TYPE');
   if(row.kind==='TOP')assert((a.imageType==='DETAIL'||a.angle==='CLOSEUP')&&a.imageType!=='SIZE_GUIDE'&&a.partsVisible.length===1&&a.partsVisible[0]==='AO','TOP_FIXTURE_SCOPE');
  }
 }
}
export async function prepareControls({capture,identity,manifest,instructions}){
 const c=validateCapture(capture),outcomes=[];
 assert.equal(identity.promptHashes.verifier,sha256(instructions),'CANDIDATE_PROMPT_IDENTITY');
 for(const [i,definition]of CONTROL_DEFINITIONS.entries()){
  const row={...definition,draft:definition.draft??c.probe},trusted=structuredClone(c.trusted);
  const tools=createCommerceMediaTools({base:{snapshot:()=>structuredClone(trusted),readback:async()=>structuredClone(trusted)},
   catalog:{readProduct:async()=>{if(row.kind==='ERROR')throw Error('DIAGNOSTIC_READ_FAULT');const product=row.kind==='FEEDBACK_TRUE'?assumedFeedback(c.product):structuredClone(c.product);return {product};}},
   clock:()=>new Date(c.capturedAt),allowedHostSuffixes:['content.pancake.vn']});
  const query={subjectRef:c.product.productId,intent:['COLOR','MODEL'].includes(row.kind)?'GENERIC':['TOP','COMPONENT_MISSING'].includes(row.kind)?'DETAIL':'FEEDBACK',
   ...(row.kind==='COLOR'?{color:'be'}:row.kind==='TOP'?{componentRole:'TOP'}:row.kind==='COMPONENT_MISSING'?{componentRole:'SKIRT'}:{})};
  const toolResult=await tools.invoke({name:'select_product_media',args:query});assertOperation(row,toolResult,c.product.productId);
  const context=tools.snapshot(),current=await tools.readback();assert.deepEqual(current,context,'FIXTURE_READBACK_CHANGED');
  const id=digest({identity,captureHash:c.hash,slot:i+1}),binding=makeBinding(id,row.draft,context);
  assert.equal(hardPrecheck(context,row.draft,new Date(c.capturedAt)),null,'HARD_PRECHECK');
  const request={generationId:id+':verifier:1',instructions,finalDraft:row.draft,trusted:context,
   latest:row.kind==='COLOR'?'Có ảnh màu be không em?':c.latest,history:c.history,binding,turnTime:c.turnTime};
  const wire=buildVerifierRequest(manifest,request);assertNoEvaluatorLabels(wire);
  outcomes.push({definition:row,toolResult,request,binding,wire,wireHash:digest(wire)});
 }
 const bundle={version:1,identity,capture:c,outcomes};return {...bundle,hash:digest(bundle)};
}
export function validateControlBundle(bundle,{identity,manifest,instructions}){
 const b=structuredClone(bundle),hash=b.hash;delete b.hash;assert.equal(hash,digest(b),'FROZEN_BUNDLE_CHANGED');
 assert.deepEqual(b.identity,identity,'RUN_IDENTITY_CHANGED');validateCapture(b.capture);
 assert.equal(b.outcomes.length,17,'EXACT_SEVENTEEN');
 for(const [i,p]of b.outcomes.entries()){
  assert.deepEqual(p.definition,{...CONTROL_DEFINITIONS[i],draft:CONTROL_DEFINITIONS[i].draft??b.capture.probe},'CONTROL_DEFINITION_CHANGED');
  assertOperation(p.definition,p.toolResult,b.capture.product.productId);
  assert.equal(p.request.instructions,instructions,'PROMPT_CHANGED');assert.equal(p.request.finalDraft,p.definition.draft,'DRAFT_CHANGED');
  assert.deepEqual(p.request.binding,p.binding,'BINDING_CHANGED');
  assert.deepEqual(p.binding,makeBinding(p.binding.requestId,p.definition.draft,p.request.trusted),'BINDING_CHANGED');
  assert.deepEqual(buildVerifierRequest(manifest,p.request),p.wire,'FROZEN_WIRE_CHANGED');
  assert.equal(digest(p.wire),p.wireHash,'WIRE_HASH_CHANGED');assertNoEvaluatorLabels(p.wire);
 }
}
export async function dispatchControls(bundle,{identity,manifest,instructions,verify,onAttempt=()=>{},assertCurrent=()=>{}}){
 // Validate everything, including the last fixture, before constructing any provider call.
 validateControlBundle(bundle,{identity,manifest,instructions});
 const frozen=structuredClone(bundle);
 assert.deepEqual(await prepareControls({capture:frozen.capture,identity,manifest,instructions}),frozen,'PREPARED_SOURCE_CHANGED');
 const attemptsData=[];let controlsPass=true,unsafeFalsePass=false;
 for(const [i,p]of frozen.outcomes.entries()){
  assertCurrent();let provider=null,error=null,response={kind:'PROVIDER_ERROR'};
  try{provider=await verify({...p.request,signal:new AbortController().signal});response={kind:'VERDICT',binding:p.binding,result:provider.result};}
  catch(e){error={message:e.message,telemetry:e.telemetry??null};}
  const terminal=finalGate({expected:p.binding,response,current:p.request.trusted,finalDraft:p.definition.draft,now:new Date(frozen.capture.capturedAt),fallback:manifest.fallback});
  const attempt={...p,terminal,provider,error};attemptsData.push(attempt);await onAttempt(i+1,attempt);
  const eligible=terminal.disposition==='SEND_ELIGIBLE';if(p.definition.safe!==null&&eligible!==p.definition.safe)controlsPass=false;
  if(p.definition.safe===false&&eligible){unsafeFalsePass=true;break;}
 }
 assertCurrent();return {controlsPass,unsafeFalsePass,attempts:attemptsData.length,attemptsData};
}
