import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runtimeCase,readRegisteredCases,buildVerifierRequest,createCommerceVerifier,validateProtocol,requiredSourceConfig,sha256,dispatchRange} from './protocol.mjs';
const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
test('recovery text is code-owned even if a changed manifest recomputes its hash',()=>{
 const bad=structuredClone(manifest);bad.recoveryFallbacks[0].text='Size M vừa chị nhé.';
 bad.recoveryFallbacks[0].sha256=sha256(bad.recoveryFallbacks[0].text);
 assert.throws(()=>validateProtocol(bad),/RECOVERY_FALLBACK_IDENTITY/);
});
const request=()=>({generationId:'turn:verifier:1',instructions:'Kiểm reply.',finalDraft:'Dạ chị.',
 trusted:{boundSubjects:[],protectedClaims:[],policyLiterals:[],effectReceipts:[],runtimeProducts:[],state:{}},
 latest:'Em ơi',history:[],binding:{requestId:'turn'},signal:new AbortController().signal});

test('verifier receives the same bounded turn time outside trusted facts',()=>{
 const r=request();r.turnTime={processingAt:'2026-10-22T17:05:00.000Z',timeZone:'Asia/Ho_Chi_Minh',private:'NEVER_FORWARD'};
 const projected=JSON.parse(buildVerifierRequest(manifest,r).input[0].content[0].text);
 assert.deepEqual(projected.turnTime,{processingAt:r.turnTime.processingAt,timeZone:r.turnTime.timeZone});
 assert.deepEqual(projected.trusted,r.trusted);assert.doesNotMatch(JSON.stringify(projected),/NEVER_FORWARD/);
});
test('explicit dispatch ranges partition the twenty-four registered slots without retries or hidden selection',()=>{
 assert.deepEqual(dispatchRange(),{first:1,last:24});
 assert.deepEqual(dispatchRange('1:8'),{first:1,last:8});
 assert.deepEqual(dispatchRange('9:16'),{first:9,last:16});
 assert.deepEqual(dispatchRange('17:24'),{first:17,last:24});
 for(const value of ['0:3','17:25','4:3','1:3:5','3','1.0:3','',null])assert.throws(()=>dispatchRange(value),/DISPATCH_RANGE/);
});

test('protocol identity is fixed before any provider invocation',()=>{
 assert.doesNotThrow(()=>validateProtocol(manifest));
 assert.throws(()=>validateProtocol({...manifest,models:{...manifest.models,verifier:{...manifest.models.verifier,effort:'max'}}}));
 assert.throws(()=>validateProtocol({...manifest,models:{...manifest.models,conversation:{...manifest.models.conversation,
  generationConfig:{...manifest.models.conversation.generationConfig,maxOutputTokens:100}}}}));
 assert.throws(()=>validateProtocol({...manifest,providerBatch:{...manifest.providerBatch,scenarios:8}}));
 assert.throws(()=>validateProtocol({...manifest,fallback:{...manifest.fallback,text:'Changed fallback'}}));
});

test('B request bounds are frozen per role and reject silent owner or verifier changes',()=>{
 assert.deepEqual(manifest.requestBounds,{ownerWireBytes:65536,verifierWireBytes:32768});
 for(const requestBounds of [undefined,{ownerWireBytes:32768,verifierWireBytes:32768},{ownerWireBytes:65536,verifierWireBytes:65536}])
  assert.throws(()=>validateProtocol({...manifest,requestBounds}),/REQUEST_BOUNDS/);
});
test('runtime projection and captured verifier request exclude all evaluator fields',async()=>{
 const sample={caseId:'LABEL_CANARY',split:'HOLDOUT_CANARY',evaluator:{purposeId:'PURPOSE_CANARY',variant:3,expectedSafe:false,requiredBehaviors:['RUBRIC_CANARY']},
  runtime:{latest:'Em ơi',history:[],initialProductCodes:['SM613']}};
 const runtime=runtimeCase(sample);assert.deepEqual(Object.keys(runtime).sort(),['history','initialProductCodes','latest']);
 let captured;
 const infer=createCommerceVerifier(manifest,async(_m,role,r)=>{captured=r;assert.equal(role,'verifier');
  return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1,usage:{input_tokens:4,output_tokens:3}};});
 const result=await infer({...request(),...sample});
 assert.equal(result.result,'{"verdict":"PASS","violations":[]}');
 assert.doesNotMatch(JSON.stringify(captured),/LABEL_CANARY|HOLDOUT_CANARY|PURPOSE_CANARY|RUBRIC_CANARY|purposeId|variant|expectedSafe|requiredBehaviors/);
 assert.equal(captured.tools.length,0);assert.equal(captured.reasoning.effort,'high');
});
test('failed verifier generation has retained accounting and no retry',async()=>{
 let count=0;
 const infer=createCommerceVerifier(manifest,async()=>{count++;return {status:'PROVIDER_ERROR',providerRequests:1,httpStatus:429};});
 await assert.rejects(infer(request()),e=>e.telemetry.providerRequests===1&&e.telemetry.httpStatus===429);
 assert.equal(count,1);
});
test('oversized or undeclared runtime inputs fail before generation',()=>{
 assert.throws(()=>runtimeCase({runtime:{latest:'x'.repeat(2049),history:[],initialProductCodes:[]}}));
 assert.throws(()=>runtimeCase({runtime:{latest:'Em ơi',history:[],initialProductCodes:[],expectedSafe:true}}));
 assert.throws(()=>buildVerifierRequest(manifest,{...request(),finalDraft:'x'.repeat(4097)}));
});
test('source preflight reports missing names only without constructing adapters',()=>{
 const missing=requiredSourceConfig({},{});
 assert.ok(missing.includes('REDIS_URL'));assert.ok(missing.includes('QDRANT_BASE_URL'));
 assert.ok(missing.includes('config.vertex.embeddingModel'));
 assert.ok(!JSON.stringify(missing).includes('postgres://'));
});
test('registered cases bind the exact bytes loaded once, without later file edits changing in-memory inputs',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c3-b-inputs-')),file=join(dir,'cases.json');
 try{
  const cases=Array.from({length:24},(_,i)=>({caseId:'EVAL_'+i,evaluator:{requiredBehaviors:['PRIVATE_RUBRIC']},
   runtime:{latest:'Áo bao nhiêu em?',history:[],initialProductCodes:[]}}));
  const original=JSON.stringify(cases);writeFileSync(file,original);
  const loaded=readRegisteredCases(file);writeFileSync(file,'[]');
  assert.equal(loaded.hash,sha256(original));assert.equal(loaded.inputs.length,24);
  assert.doesNotMatch(JSON.stringify(loaded.inputs),/EVAL_|PRIVATE_RUBRIC|requiredBehaviors/);
  assert.throws(()=>readRegisteredCases(file));
 }finally{unlinkSync(file);rmdirSync(dir);}
});
test('source fault mode is registered outside runtime input and rejects unrecognized modes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c3-b-source-mode-')),file=join(dir,'cases.json');
 try{
  const cases=Array.from({length:24},(_,i)=>({caseId:'case-'+i,sourceMode:i>=21?'POS_UNAVAILABLE':'LIVE',
   runtime:{latest:'Áo bao nhiêu em?',history:[],initialProductCodes:[]}}));
  writeFileSync(file,JSON.stringify(cases));const loaded=readRegisteredCases(file);
  assert.doesNotMatch(JSON.stringify(loaded.inputs),/POS_UNAVAILABLE|sourceMode/);
  cases[23].sourceMode='REPLACE_PRICE';writeFileSync(file,JSON.stringify(cases));
  assert.throws(()=>readRegisteredCases(file),/SOURCE_MODE/);
 }finally{unlinkSync(file);rmdirSync(dir);}
});

test('the approved corpus registers three distinct dialogue variants for each of the eight purposes',()=>{
 const cases=JSON.parse(readFileSync(new URL('./cases.b1.json',import.meta.url),'utf8'));
 assert.equal(cases.length,24);
 const grouped=new Map();
 for(const c of cases)grouped.set(c.evaluator?.purposeId,[...(grouped.get(c.evaluator?.purposeId)??[]),c]);
 assert.equal(grouped.size,8);
 for(const variants of grouped.values()){
  assert.deepEqual(variants.map(c=>c.evaluator.variant).sort((a,b)=>a-b),[1,2,3]);
  assert.equal(new Set(variants.map(c=>c.runtime.latest)).size,3);
 }
 const firstPass=cases.slice(0,8).map(c=>c.evaluator.purposeId).sort();
 for(let pass=0;pass<3;pass++){
  const block=cases.slice(pass*8,(pass+1)*8);
  assert.ok(block.every(c=>c.evaluator.variant===pass+1));
  assert.deepEqual(block.map(c=>c.evaluator.purposeId).sort(),firstPass);
 }
 assert.ok(cases.every(c=>!('requiredKeywords' in c.evaluator)&&!('forbiddenKeywords' in c.evaluator)));
});
