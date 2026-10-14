import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runtimeCase,readRegisteredCases,buildVerifierRequest,createCommerceVerifier,validateProtocol,requiredSourceConfig,sha256} from './protocol.mjs';
const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
const request=()=>({generationId:'turn:verifier:1',instructions:'Kiểm reply.',finalDraft:'Dạ chị.',
 trusted:{boundSubjects:[],protectedClaims:[],policyLiterals:[],effectReceipts:[],runtimeProducts:[],state:{}},
 latest:'Em ơi',history:[],binding:{requestId:'turn'},signal:new AbortController().signal});

test('protocol identity is fixed before any provider invocation',()=>{
 assert.doesNotThrow(()=>validateProtocol(manifest));
 assert.throws(()=>validateProtocol({...manifest,models:{...manifest.models,verifier:{...manifest.models.verifier,effort:'max'}}}));
 assert.throws(()=>validateProtocol({...manifest,models:{...manifest.models,conversation:{...manifest.models.conversation,
  generationConfig:{...manifest.models.conversation.generationConfig,maxOutputTokens:100}}}}));
 assert.throws(()=>validateProtocol({...manifest,fallback:{...manifest.fallback,text:'Changed fallback'}}));
});
test('runtime projection and captured verifier request exclude all evaluator fields',async()=>{
 const sample={caseId:'LABEL_CANARY',split:'HOLDOUT_CANARY',evaluator:{expectedSafe:false,requiredBehaviors:['RUBRIC_CANARY']},
  runtime:{latest:'Em ơi',history:[],initialProductCodes:['SM613']}};
 const runtime=runtimeCase(sample);assert.deepEqual(Object.keys(runtime).sort(),['history','initialProductCodes','latest']);
 let captured;
 const infer=createCommerceVerifier(manifest,async(_m,role,r)=>{captured=r;assert.equal(role,'verifier');
  return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1,usage:{input_tokens:4,output_tokens:3}};});
 const result=await infer({...request(),...sample});
 assert.equal(result.result,'{"verdict":"PASS","violations":[]}');
 assert.doesNotMatch(JSON.stringify(captured),/LABEL_CANARY|HOLDOUT_CANARY|RUBRIC_CANARY|expectedSafe|requiredBehaviors/);
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
  const cases=Array.from({length:8},(_,i)=>({caseId:'EVAL_'+i,evaluator:{requiredBehaviors:['PRIVATE_RUBRIC']},
   runtime:{latest:'Áo bao nhiêu em?',history:[],initialProductCodes:[]}}));
  const original=JSON.stringify(cases);writeFileSync(file,original);
  const loaded=readRegisteredCases(file);writeFileSync(file,'[]');
  assert.equal(loaded.hash,sha256(original));assert.equal(loaded.inputs.length,8);
  assert.doesNotMatch(JSON.stringify(loaded.inputs),/EVAL_|PRIVATE_RUBRIC|requiredBehaviors/);
  assert.throws(()=>readRegisteredCases(file));
 }finally{unlinkSync(file);rmdirSync(dir);}
});
test('source fault mode is registered outside runtime input and rejects unrecognized modes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'c3-b-source-mode-')),file=join(dir,'cases.json');
 try{
  const cases=Array.from({length:8},(_,i)=>({caseId:'case-'+i,sourceMode:i===7?'POS_UNAVAILABLE':'LIVE',
   runtime:{latest:'Áo bao nhiêu em?',history:[],initialProductCodes:[]}}));
  writeFileSync(file,JSON.stringify(cases));const loaded=readRegisteredCases(file);
  assert.doesNotMatch(JSON.stringify(loaded.inputs),/POS_UNAVAILABLE|sourceMode/);
  cases[7].sourceMode='REPLACE_PRICE';writeFileSync(file,JSON.stringify(cases));
  assert.throws(()=>readRegisteredCases(file),/SOURCE_MODE/);
 }finally{unlinkSync(file);rmdirSync(dir);}
});
