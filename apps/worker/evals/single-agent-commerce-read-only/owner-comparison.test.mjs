import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {comparisonSlots,comparisonOwnerRequest,createSolComparisonOwner,createGeminiComparisonOwner,dispatchComparison,validateComparison,readComparisonManifest,solReadOnlyTools} from './owner-comparison.mjs';

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
 assert.equal(sol.instructions,gemini.systemInstruction.parts.map(p=>p.text).join('\n'));
 assert.deepEqual(sol.input.map(m=>m.content),gemini.contents.map(m=>m.parts[0].text));
 assert.deepEqual(sol.input.map(m=>m.role),['user','user','user','assistant','user']);
 assert.deepEqual(sol.tools,[]);assert.equal(sol.tool_choice,'none');
 assert.equal(gemini.toolConfig.functionCallingConfig.mode,'NONE');
 assert.deepEqual(gemini.tools,[]);
 assert.deepEqual(JSON.parse(gemini.systemInstruction.parts[1].text).execution,
  {mode:'NONE',availableTools:[],toolBudget:{roundsRemaining:0,callsRemaining:0}});
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

test('native read-only comparison exposes the same bounded tools to both owners, without evaluator labels',()=>{
 const c={...config(),surface:'NATIVE_READ_ONLY_OWNER_COMPARISON'};
 const r=request(),gemini=comparisonOwnerRequest('gemini',c,r),sol=comparisonOwnerRequest('sol',c,r);
 assert.equal(gemini.toolConfig.functionCallingConfig.mode,'AUTO');assert.equal(sol.tool_choice,'auto');
 assert.deepEqual(sol.tools.map(t=>t.name),['search_products','read_product','read_policy']);
 assert.deepEqual(sol.tools.map(t=>t.name),gemini.tools[0].functionDeclarations.map(t=>t.name));
 assert.deepEqual(sol.include,['reasoning.encrypted_content']);
 assert.deepEqual(sol.input.map(m=>m.content),gemini.contents.map(m=>m.parts[0].text));
 assert.equal(sol.instructions,gemini.systemInstruction.parts.map(p=>p.text).join('\n'));
 assert.deepEqual(JSON.parse(gemini.systemInstruction.parts[1].text).execution,
  {mode:'AUTO',availableTools:['search_products','read_product','read_policy'],toolBudget:r.toolBudget});
 for(const body of [gemini,sol])assert.doesNotMatch(JSON.stringify(body),/EVAL_CASE_CANARY|EVAL_SPLIT_CANARY|EVAL_RUBRIC_CANARY|caseId|expectedSafe|requiredBehaviors/);
 for(const owner of ['gemini','sol']){
  const body=comparisonOwnerRequest(owner,c,{...r,toolsAllowed:false,toolBudget:{roundsRemaining:0,callsRemaining:0}});
  assert.equal(owner==='sol'?body.tool_choice:body.toolConfig.functionCallingConfig.mode,owner==='sol'?'none':'NONE');
 }
});

test('native comparison freezes the existing B1 budgets and the exact Sol read-only configuration',()=>{
 const c={...config(),surface:'NATIVE_READ_ONLY_OWNER_COMPARISON',repetitions:1,ownerGenerationsPerSlot:3,
  toolRounds:2,toolCalls:6,maximumGenerationRequests:16};
 c.owners={...c.owners,sol:{...c.owners.sol,generationConfig:{...c.owners.sol.generationConfig,
  tools:solReadOnlyTools,tool_choice:'auto',include:['reasoning.encrypted_content']}}};
 assert.doesNotThrow(()=>validateComparison(c,base));
 for(const invalid of [{...c,ownerGenerationsPerSlot:4},{...c,toolCalls:7},{...c,toolRounds:3},
  {...c,maximumGenerationRequests:24},{...c,repetitions:3,maximumGenerationRequests:48},
  {...c,owners:{...c.owners,sol:{...c.owners.sol,generationConfig:{...c.owners.sol.generationConfig,tools:[]}}}}]){
  assert.throws(()=>validateComparison(invalid,base),/COMPARISON_REGISTRATION|COMPARISON_MODEL/);
 }
});

test('Sol native continuation preserves ordered reasoning/call/output and delegates tool execution to the existing loop',async()=>{
 const c={...config(),surface:'NATIVE_READ_ONLY_OWNER_COMPARISON'},captured=[];
 const outputItems=[{type:'reasoning',id:'rs_test',summary:[],encrypted_content:'opaque-test'},
  {type:'function_call',id:'fc_test',call_id:'call_test',name:'read_product',arguments:'{"subjectRef":"product:TEST"}'}];
 const owner=createSolComparisonOwner(c,async(m,role,wire)=>{
  assert.equal(m.readOnlyCommerce,true);assert.equal(role,'conversation');captured.push(wire);
  return captured.length===1?{status:'OK',providerRequests:1,answer:null,outputItems}:
   {status:'OK',providerRequests:1,answer:'Mẫu này 799k chị nhé.'};
 });
 const r=request(),first=await owner(r);
 assert.equal(first.kind,'TOOLS');assert.deepEqual(first.calls,[{name:'read_product',id:'call_test',args:{subjectRef:'product:TEST'}}]);
 const response={status:'OK',data:{price:799000}};
 const second=await owner({...r,contents:[...r.contents,first.content,{role:'user',parts:[
  {functionResponse:{name:'read_product',id:'call_test',response}}]}]});
 assert.equal(second.kind,'FINAL');assert.equal(second.text,'Mẫu này 799k chị nhé.');
 assert.deepEqual(captured[1].input.slice(-3),[...outputItems,{type:'function_call_output',call_id:'call_test',output:JSON.stringify(response)}]);
 assert.equal(captured.length,2);assert.deepEqual(captured[1].reasoning,{effort:'low'});
});

test('captured Gemini native requests preserve tool results and current rule scope without an automatic generation retry',async()=>{
 const c={...config(),surface:'NATIVE_READ_ONLY_OWNER_COMPARISON'},captured=[];
 const owner=createGeminiComparisonOwner(c,'test-project',{getToken:async()=> 'test-token',fetchImpl:async(_url,init)=>{
  captured.push(JSON.parse(init.body));
  if(captured.length===3)return new Response('not retained',{status:429});
  return new Response(JSON.stringify(geminiResponse(captured.length===1?
   [{functionCall:{name:'read_policy',args:{}}}]:[{text:'Shop hỗ trợ đổi theo chính sách hiện tại chị nhé.'}])));
 }});
 const r=request(),first=await owner(r);assert.equal(first.kind,'TOOLS');
 assert.equal(captured[0].toolConfig.functionCallingConfig.mode,'AUTO');
 const result={status:'OK',data:{scope:'SHOP_RULES',orderEligibility:null,policy:{exchangeWindow:15}}};
 const next={...r,contents:[...r.contents,first.content,{role:'user',parts:[{functionResponse:{name:'read_policy',response:result}}]}]};
 assert.equal((await owner(next)).kind,'FINAL');assert.equal(captured.length,2);
 assert.deepEqual(captured[1].contents.at(-1).parts[0].functionResponse.response,result);
 await assert.rejects(owner(next),e=>e.telemetry.providerRequests===1&&e.telemetry.httpStatus===429);
 assert.equal(captured.length,3);
 for(const body of captured)assert.doesNotMatch(JSON.stringify(body),/EVAL_CASE_CANARY|EVAL_SPLIT_CANARY|EVAL_RUBRIC_CANARY|caseId|expectedSafe|requiredBehaviors/);
});
