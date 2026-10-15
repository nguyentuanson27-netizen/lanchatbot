import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {comparisonSlots,comparisonOwnerRequest,createSolComparisonOwner,createGeminiComparisonOwner,dispatchComparison,validateComparison,readComparisonManifest} from './owner-comparison.mjs';

const base=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url)));
const samples=JSON.parse(readFileSync(new URL('./cases.b1.json',import.meta.url)));
const config=()=>({schemaVersion:1,surface:'POST_READ_OWNER_DIAGNOSTIC',repetitions:3,
 caseIds:['b1-changed-occasion','b1-current-policy'],
 verifier:base.models.verifier,ownerGenerationsPerSlot:1,verifierGenerationsPerSlot:1,maximumGenerationRequests:24,sendEnabled:false,
 owners:{gemini:base.models.conversation,sol:{...base.models.verifier,effort:'low',
  generationConfig:{...base.models.verifier.generationConfig,reasoningEffort:'low'}}}});
const request=()=>({generationId:'OPAQUE_ID',instructions:'Chỉ viết tin nhắn gửi khách.',
 contents:[{role:'user',parts:[{text:'Chị đang xem mẫu này.'}]},{role:'model',parts:[{text:'Dạ chị.'}]},
  {role:'user',parts:[{text:'Lên sân khấu thì sao em?'}]}],
 context:{boundSubjects:[],runtimeProducts:[],protectedClaims:[],policyLiterals:[],effectReceipts:[],state:{permission:true}},
 toolsAllowed:true,toolBudget:{roundsRemaining:2,callsRemaining:6},signal:new AbortController().signal,
 caseId:'EVAL_CASE_CANARY',split:'EVAL_SPLIT_CANARY',expectedSafe:false,requiredBehaviors:['EVAL_RUBRIC_CANARY']});

test('a fresh comparison selects its explicit registration without rewriting or falling back to the historical manifest',()=>{
 const historical=new URL('./owner-comparison-20261015/manifest.json',import.meta.url);
 const before=readFileSync(historical);
 assert.deepEqual(readComparisonManifest(),JSON.parse(before));
 const current=new URL('./manifest.json',import.meta.url);
 assert.deepEqual(readComparisonManifest(current),base);
 const fresh=readComparisonManifest(new URL('./owner-comparison-followup-20261015/manifest.json',import.meta.url));
 assert.doesNotThrow(()=>validateComparison(fresh,base));
 // Frozen registrations retain their own input identity across active-prompt rollbacks.
 // The CLI's existing frozen-input check controls admission before source/provider work.
 assert.notEqual(fresh.promptHashes.owner,JSON.parse(before).promptHashes.owner);
 assert.equal(fresh.promptHashes.verifier,JSON.parse(before).promptHashes.verifier);
 assert.throws(()=>readComparisonManifest(new URL('./unregistered-comparison/manifest.json',import.meta.url)),/ENOENT/);
 assert.deepEqual(readFileSync(historical),before);
});

test('comparison freezes exactly two approved owners and twelve unique slots, without changing historical registrations',()=>{
 const c=config();assert.doesNotThrow(()=>validateComparison(c,base));
 const slots=comparisonSlots(c,samples);
 assert.equal(slots.length,12);assert.equal(new Set(slots.map(s=>s.slot)).size,12);
 for(const owner of ['gemini','sol'])for(const caseId of c.caseIds){
  assert.deepEqual(slots.filter(s=>s.owner===owner&&s.caseId===caseId).map(s=>s.repetition),[1,2,3]);
 }
 assert.throws(()=>validateComparison({...c,owners:{...c.owners,sol:{...c.owners.sol,effort:'max'}}},base),/COMPARISON_MODEL/);
 assert.throws(()=>validateComparison({...c,repetitions:2},base),/COMPARISON_REGISTRATION/);
 assert.throws(()=>comparisonSlots(c,samples.filter(s=>s.caseId!==c.caseIds[1])),/COMPARISON_CASES/);
});

test('ordinary sales and retained regressions share one frozen ten-slot comparison without raising the request budget',()=>{
 const caseIds=['b1-changed-occasion','b1-current-policy','b1-price','b1-buying-concern','b1-policy-used'];
 const c={...config(),caseIds,repetitions:1,maximumGenerationRequests:20};
 assert.doesNotThrow(()=>validateComparison(c,base));
 const slots=comparisonSlots(c,samples);
 assert.equal(slots.length,10);assert.equal(new Set(slots.map(s=>s.slot)).size,10);
 for(const caseId of caseIds)assert.deepEqual(slots.filter(s=>s.caseId===caseId).map(s=>[s.owner,s.repetition]),[['gemini',1],['sol',1]]);
 assert.equal(c.maximumGenerationRequests,slots.length*2);
 for(const invalid of [
  {...c,maximumGenerationRequests:24},
  {...c,repetitions:3,maximumGenerationRequests:60},
  {...c,caseIds:[...caseIds,'b1-search-read'],maximumGenerationRequests:24},
  {...c,caseIds:['b1-price','b1-price'],maximumGenerationRequests:8},
 ])assert.throws(()=>validateComparison(invalid,base),/COMPARISON_REGISTRATION/);
});

test('both owners receive identical trusted text and native dialogue; evaluator labels and tool capability are excluded',()=>{
 const r=request(),gemini=comparisonOwnerRequest('gemini',config(),r),sol=comparisonOwnerRequest('sol',config(),r);
 assert.equal(sol.model,'gpt-6.1-sol');assert.deepEqual(sol.reasoning,{effort:'low'});
 assert.equal(sol.instructions,gemini.systemInstruction.parts[0].text);
 assert.deepEqual(sol.input.map(m=>m.content),gemini.contents.map(m=>m.parts[0].text));
 assert.deepEqual(sol.input.map(m=>m.role),['user','user','user','assistant','user']);
 assert.deepEqual(sol.tools,[]);assert.equal(sol.tool_choice,'none');
 assert.equal(gemini.toolConfig.functionCallingConfig.mode,'NONE');
 assert.deepEqual(gemini.tools,[]);
 assert.deepEqual(JSON.parse(gemini.contents[0].parts[0].text).trusted.execution,
  {availableTools:[],toolBudget:{roundsRemaining:0,callsRemaining:0}});
 for(const wire of [gemini,sol])assert.doesNotMatch(JSON.stringify(wire),/EVAL_CASE_CANARY|EVAL_SPLIT_CANARY|EVAL_RUBRIC_CANARY|caseId|expectedSafe|requiredBehaviors/);
});

test('Sol owner explicitly uses low effort and retains a failed single generation without retry or fallback model',async()=>{
 let count=0,captured;
 const owner=createSolComparisonOwner(config(),async(m,role,wire)=>{
  count++;captured=wire;assert.equal(role,'conversation');assert.equal(m.models.conversation.effort,'low');
  assert.equal(m.models.conversation.generationConfig.reasoningEffort,'low');
  return {status:'PROVIDER_ERROR',providerRequests:1,httpStatus:429};
 });
 await assert.rejects(owner(request()),e=>e.telemetry.providerRequests===1&&e.telemetry.httpStatus===429);
 assert.equal(count,1);assert.equal(captured.reasoning.effort,'low');
});

const geminiResponse=parts=>({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts}}],
 usageMetadata:{promptTokenCount:10,candidatesTokenCount:5}});
test('captured Gemini HTTP body equals the registered projection, including rule scope and no evaluator labels',async()=>{
 const r={...request(),sourceReads:[{name:'read_policy',response:{status:'OK',data:{scope:'SHOP_RULES',orderEligibility:null,policy:{}}}}]};
 let captured;
 const owner=createGeminiComparisonOwner(config(),'test-project',{getToken:async()=> 'test-token',
  fetchImpl:async(_url,init)=>{captured=JSON.parse(init.body);return new Response(JSON.stringify(geminiResponse([{text:'Dạ chị.'}])));}});
 assert.equal((await owner(r)).kind,'FINAL');
 assert.deepEqual(captured,comparisonOwnerRequest('gemini',config(),r));
 assert.deepEqual(captured.tools,[]);
 assert.match(JSON.stringify(captured),/SHOP_RULES/);assert.match(JSON.stringify(captured),/orderEligibility/);
 assert.doesNotMatch(JSON.stringify(captured),/EVAL_CASE_CANARY|EVAL_SPLIT_CANARY|EVAL_RUBRIC_CANARY|expectedSafe|requiredBehaviors/);
});
test('a provider tool call is rejected in the post-read comparison and retains the one-request accounting',async()=>{
 let calls=0;
 const owner=createGeminiComparisonOwner(config(),'test-project',{getToken:async()=> 'test-token',
  fetchImpl:async()=>{calls++;return new Response(JSON.stringify(geminiResponse([{functionCall:{name:'read_policy',args:{}}}])));}});
 await assert.rejects(owner(request()),e=>e.telemetry.providerRequests===1);
 assert.equal(calls,1);
});

test('all registered repetitions retain fallback/error outcomes and later slots still run once',async()=>{
 const slots=comparisonSlots(config(),samples),calls=[],saved=[];
 await dispatchComparison(slots,async slot=>{
  calls.push(slot.slot);
  if(slot.slot===2)throw new Error('SOURCE_UNAVAILABLE');
  return {terminal:{disposition:slot.slot===3?'STATIC_FALLBACK':'SEND_ELIGIBLE',text:'Dạ chị.'}};
 },async(slot,result)=>saved.push({slot:slot.slot,result}));
 assert.deepEqual(calls,slots.map(s=>s.slot));assert.equal(saved.length,12);
 assert.equal(saved[1].result.terminal.disposition,'NO_SEND');
 assert.equal(saved[1].result.errorCode,'SOURCE_UNAVAILABLE');
 assert.equal(saved[2].result.terminal.disposition,'STATIC_FALLBACK');
});
