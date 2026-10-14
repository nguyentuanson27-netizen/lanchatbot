import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiCommerceInference,parseGeminiGeneration,buildGeminiCommerceRequest,stateDeclarations,effectDeclarations} from './gemini-inference.mjs';
const config={model:'gemini-3.5-flash-lite',effort:'high',projectId:'test-project',location:'global'};
const request=()=>({generationId:'turn:owner:1',instructions:'Tư vấn theo dữ liệu nguồn.',contents:[{role:'user',parts:[{text:'Áo bao nhiêu em?'}]}],
 context:{boundSubjects:[],protectedClaims:[],runtimeProducts:[],policyLiterals:[],effectReceipts:[],state:{revision:1,currentProductId:null}},signal:new AbortController().signal});
const body=parts=>({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:4,thoughtsTokenCount:2}});
test('native function content keeps opaque signatures for the next invocation',()=>{
 const source=body([{functionCall:{name:'read_policy',args:{}},thoughtSignature:'opaque'}]);
 const result=parseGeminiGeneration(source);
 assert.equal(result.kind,'TOOLS');assert.deepEqual(result.content,source.candidates[0].content);
 const next=request();next.contents.push(result.content,{role:'user',parts:[{functionResponse:{name:'read_policy',response:{status:'OK'}}}]});
 assert.equal(buildGeminiCommerceRequest(next).contents[2].parts[0].thoughtSignature,'opaque');
});
test('final customer text excludes thought parts but preserves exact visible bytes',()=>{
 assert.equal(parseGeminiGeneration(body([{text:'private reasoning',thought:true},{text:'Áo 499k chị nhé.\n'}])).text,'Áo 499k chị nhé.\n');
 for(const b of [{},body([]),{candidates:[{finishReason:'MAX_TOKENS',content:{role:'model',parts:[{text:'partial'}]}}]}]) assert.throws(()=>parseGeminiGeneration(b));
});
test('each failed generation has one upstream request and is never retried',async()=>{
 for(const status of [401,429,500,503]){
  let calls=0;
  const infer=createGeminiCommerceInference(config,{getToken:async()=> 'test-token',fetchImpl:async()=>{calls++;return new Response('',{status});}});
  await assert.rejects(infer(request()),e=>e.telemetry.providerRequests===1&&e.telemetry.httpStatus===status);
  assert.equal(calls,1);
 }
});
test('auth failure stays in accounting without a generation request',async()=>{
 let calls=0;
 const infer=createGeminiCommerceInference(config,{getToken:async()=>{throw new Error('auth');},fetchImpl:async()=>{calls++;}});
 await assert.rejects(infer(request()),e=>e.telemetry.providerRequests===0);assert.equal(calls,0);
});
test('only runtime request fields reach the captured HTTP body; usage is retained',async()=>{
 let captured;
 const infer=createGeminiCommerceInference(config,{getToken:async()=> 'test-token',fetchImpl:async(_url,init)=>{captured=JSON.parse(init.body);return new Response(JSON.stringify(body([{text:'Dạ chị.'}])));}});
 const r={...request(),caseId:'EVALUATOR_ONLY',expectedSafe:true,requiredBehaviors:['PRIVATE_RUBRIC']};
 const result=await infer(r);
 assert.equal(result.text,'Dạ chị.');assert.equal(result.telemetry.providerRequests,1);
 assert.equal(result.telemetry.outputTokens,6);assert.equal(result.telemetry.cost,null);
 assert.doesNotMatch(JSON.stringify(captured),/EVALUATOR_ONLY|PRIVATE_RUBRIC|expectedSafe/);
 assert.equal(captured.generationConfig.thinkingConfig.thinkingLevel,'HIGH');
 assert.ok(captured.tools[0].functionDeclarations.some(f=>f.name==='read_product'));
});

test('state/effect capabilities are explicit and the accepted quote reaches the owner',()=>{
 const r=request();r.context.state.cartQuote={grandTotalVnd:524000};
 const built=buildGeminiCommerceRequest(r,[...stateDeclarations,...effectDeclarations]);
 const names=built.tools[0].functionDeclarations.map(d=>d.name);
 assert.deepEqual(names,['apply_customer_state','recommend_size','quote_cart','add_to_cart','change_cart_item','confirm_purchase']);
 const fields=stateDeclarations[0].parametersJsonSchema.properties.ops.items.properties;
 assert.ok(fields.field.enum.includes('measurements.WAIST_CM'));
 assert.ok(!fields.field.enum.includes('permission'));
 assert.equal(JSON.parse(built.contents[0].parts[0].text).trusted.state.cartQuote.grandTotalVnd,524000);
 r.toolsAllowed=false;assert.equal(buildGeminiCommerceRequest(r).toolConfig.functionCallingConfig.mode,'NONE');
});

test('native call identity remains paired with its function response',()=>{
 const result=parseGeminiGeneration(body([{functionCall:{id:'native-call-1',name:'read_policy',args:{}}}]));
 assert.equal(result.calls[0].id,'native-call-1');
});
test('a different or absent model version is not accepted as the approved model',async()=>{
 for(const version of ['other-model',undefined]){
  const data=body([{text:'Dạ chị.'}]);data.modelVersion=version;
  const infer=createGeminiCommerceInference(config,{getToken:async()=> 'test-token',fetchImpl:async()=>new Response(JSON.stringify(data))});
  await assert.rejects(infer(request()),e=>e.telemetry.providerRequests===1);
 }
});
test('unsupported visible media/code is rejected instead of silently discarded',()=>{
 for(const part of [{inlineData:{mimeType:'image/png',data:'unused'}},{executableCode:{language:'PYTHON',code:'unused'}}]){
  assert.throws(()=>parseGeminiGeneration(body([part,{text:'Dạ chị.'}])));
 }
});
test('captured continuation HTTP requests still exclude evaluator labels',async()=>{
 const captured=[];let n=0;
 const infer=createGeminiCommerceInference(config,{getToken:async()=> 'test-token',fetchImpl:async(_url,init)=>{
  captured.push(JSON.parse(init.body));return new Response(JSON.stringify(body(n++===0
   ?[{functionCall:{id:'c1',name:'read_policy',args:{}},thoughtSignature:'opaque'}]:[{text:'Dạ chị.'}])));
 }});
 const r={...request(),caseId:'EVALUATOR_CASE',split:'EVALUATOR_SPLIT',forbiddenBehaviors:['EVALUATOR_RUBRIC']};
 const first=await infer(r);
 r.contents.push(first.content,{role:'user',parts:[{functionResponse:{name:'read_policy',id:'c1',response:{status:'OK',data:{customerCare:null}}}}]});
 await infer(r);
 assert.equal(captured.length,2);assert.doesNotMatch(JSON.stringify(captured),/EVALUATOR_CASE|EVALUATOR_SPLIT|EVALUATOR_RUBRIC|forbiddenBehaviors/);
 assert.equal(captured[1].contents[2].parts[0].thoughtSignature,'opaque');
});
