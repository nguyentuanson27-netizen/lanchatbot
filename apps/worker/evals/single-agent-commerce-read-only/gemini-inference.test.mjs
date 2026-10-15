import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiCommerceInference,parseGeminiGeneration,buildGeminiCommerceRequest,stateDeclarations,effectDeclarations} from './gemini-inference.mjs';
const config={model:'gemini-3.5-flash-lite',effort:'high',projectId:'test-project',location:'global'};
const request=()=>({generationId:'turn:owner:1',instructions:'Tư vấn theo dữ liệu nguồn.',contents:[{role:'user',parts:[{text:'Áo bao nhiêu em?'}]}],
 context:{boundSubjects:[],protectedClaims:[],runtimeProducts:[],policyLiterals:[],effectReceipts:[],state:{revision:1,currentProductId:null}},signal:new AbortController().signal});
const body=parts=>({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:4,thoughtsTokenCount:2}});

test('owner has one callable product identity and measurement fields match the write enum',()=>{
 const r=request();r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Áo',bindingVersion:'b'}];
 r.context.runtimeProducts=[{ref:'product:P1',subjectRef:'P1',content:{description:'Cotton.'}}];
 r.context.state.customerMeasurements=[{kind:'WAIST_CM',value:74}];
 r.contents.push({role:'model',parts:[{functionCall:{id:'s1',name:'search_products',args:{query:'P1'}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:{id:'s1',name:'search_products',response:{status:'OK',data:{status:'MATCHED',subjects:r.context.boundSubjects,products:r.context.runtimeProducts}}}}]});
 const b=buildGeminiCommerceRequest(r),view=JSON.parse(b.contents[0].parts[0].text).trusted;
 assert.equal(view.subjects[0].subjectRef,'P1');assert.equal(view.products[0].subjectRef,'P1');
 assert.deepEqual(view.state.customerMeasurements,[{field:'measurements.WAIST_CM',value:74}]);
 assert.ok(stateDeclarations[0].parametersJsonSchema.properties.ops.items.properties.field.enum.includes(view.state.customerMeasurements[0].field));
 assert.doesNotMatch(JSON.stringify(b),/product:P1/);
 assert.equal(b.contents[2].parts[0].thoughtSignature,'opaque');
});

test('continuations reuse exact current source evidence once but retain changed results, receipts and native identities',()=>{
 const r=request(),description='Áo cotton dáng suông. '.repeat(320),content={description};
 r.context.runtimeProducts=[{ref:'product:P1',subjectRef:'P1',content}];
 r.context.effectReceipts=[{ref:'receipt-1',effect:'CUSTOMER_STATE_UPDATED'}];
 const fn={id:'r1',name:'read_product',response:{status:'OK',data:{subjectRef:'P1',content,facts:[{type:'PRICE',value:{amountVnd:499000}}],availableOffers:['AO'],availability:{price:{status:'OK'}}}}};
 r.contents.push({role:'model',parts:[{functionCall:{id:'r1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:structuredClone(fn)}]});
 const b=buildGeminiCommerceRequest(r),serialized=JSON.stringify(b);
 assert.equal(serialized.split(description).length-1,1);assert.ok(Buffer.byteLength(serialized)<32768);
 assert.equal(b.contents[3].parts[0].functionResponse.id,'r1');
 assert.deepEqual(b.contents[3].parts[0].functionResponse.response.data.facts,fn.response.data.facts);
 assert.deepEqual(JSON.parse(b.contents[0].parts[0].text).trusted.receipts,r.context.effectReceipts);
 assert.equal(r.contents[2].parts[0].functionResponse.response.data.content.description,description);
 r.context.runtimeProducts[0].content={description:'Nguồn mới.'};
 const changed=buildGeminiCommerceRequest(r);assert.equal(changed.contents[3].parts[0].functionResponse.response.data.content.description,description);
});
test('canonical key ordering does not duplicate source evidence between snapshot and tool response',()=>{
 const r=request();r.context.runtimeProducts=[{ref:'product:P1',subjectRef:'P1',content:{description:'Cotton.',metadata:{observedAt:'now',authority:'WEBSTORE_XML'}}}];
 r.contents.push({role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:{subjectRef:'P1',content:{metadata:{authority:'WEBSTORE_XML',observedAt:'now'},description:'Cotton.'}}}}}]});
 const b=buildGeminiCommerceRequest(r);
 assert.equal(b.contents[2].parts[0].functionResponse.response.data.content,undefined);
 assert.equal(JSON.parse(b.contents[0].parts[0].text).trusted.products[0].content.description,'Cotton.');
});
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

test('native variant changes and public current cart reach the owner without private checkout',()=>{
 const r=request();r.context.state.cartItems=[{subjectRef:'line-ref',productRef:'SM613',quantity:1}];
 r.context.state.checkoutStatus={previewAvailable:true,purchaseConfirmed:false};r.context.state.checkoutDraft={phone:'PRIVATE_PHONE'};
 const b=buildGeminiCommerceRequest(r,effectDeclarations),d=b.tools[0].functionDeclarations.find(d=>d.name==='change_cart_item');
 assert.ok(d.parameters.properties.action.enum.includes('SET_COMPONENT_VARIANT'));
 assert.ok(d.parameters.properties.componentRole);assert.ok(d.parameters.properties.size);assert.ok(d.parameters.properties.color);
 const view=JSON.parse(b.contents[0].parts[0].text).trusted.state;
 assert.deepEqual(view.cartItems,r.context.state.cartItems);assert.deepEqual(view.checkoutStatus,r.context.state.checkoutStatus);
 assert.doesNotMatch(JSON.stringify(b),/PRIVATE_PHONE|checkoutDraft/);
});

test('composed capabilities restrict the actual native declarations and expose only a handoff reason',()=>{
 const r=request();r.availableTools=['read_policy','request_handoff'];
 const built=buildGeminiCommerceRequest(r),decls=built.tools[0].functionDeclarations;
 assert.deepEqual(decls.map(d=>d.name),r.availableTools);
 const handoff=decls.find(d=>d.name==='request_handoff');
 assert.deepEqual(Object.keys(handoff.parameters.properties),['reason']);
 assert.ok(handoff.parameters.properties.reason.enum.includes('CUSTOMER_REQUESTED_HUMAN'));
 assert.ok(!handoff.parameters.properties.reason.enum.includes('ADMIN_REQUEST'));
 r.availableTools=['invented'];assert.throws(()=>buildGeminiCommerceRequest(r),/CAPABILITY_UNAVAILABLE/);
});

test('current fit comparison fields and actual remaining tool capabilities reach the owner without private authority',()=>{
 const r=request();Object.assign(r.context.state,{customerProfileId:'profile-1',customerProfileRevision:4,
  measurementFingerprint:'current-fingerprint',sizeMeasurementFingerprints:{SM613:'size-fingerprint'},recipient:'PRIVATE_RECIPIENT',permission:true});
 r.toolBudget={roundsRemaining:1,callsRemaining:4};
 const trusted=JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted;
 assert.equal(trusted.state.customerProfileRevision,4);assert.equal(trusted.state.customerProfileId,'profile-1');
 assert.equal(trusted.state.measurementFingerprint,'current-fingerprint');assert.deepEqual(trusted.state.sizeMeasurementFingerprints,{SM613:'size-fingerprint'});
 assert.deepEqual(trusted.execution,{availableTools:['search_products','read_product','read_policy'],toolBudget:{roundsRemaining:1,callsRemaining:4}});
 assert.doesNotMatch(JSON.stringify(trusted),/PRIVATE_RECIPIENT|"permission"/);
 r.toolsAllowed=false;r.toolBudget={roundsRemaining:0,callsRemaining:4};
 const last=JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted;
 assert.deepEqual(last.execution.availableTools,[]);assert.equal(last.execution.toolBudget.roundsRemaining,0);
});

test('native call identity remains paired with its function response',()=>{
 const result=parseGeminiGeneration(body([{functionCall:{id:'native-call-1',name:'read_policy',args:{}}}]));
 assert.equal(result.calls[0].id,'native-call-1');
});
test('owner sees field availability without internal operational diagnostics or loss of native parts',()=>{
 const r=request();
 const response={status:'OK',data:{content:{description:'Áo cotton.'},facts:[],
  availability:{price:{status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'},stock:{status:'STALE',reason:'CATALOG_SNAPSHOT_STALE'}}}};
 r.contents.push({role:'model',parts:[{functionCall:{id:'read-1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:{id:'read-1',name:'read_product',response}}]});
 const built=buildGeminiCommerceRequest(r),part=built.contents[3].parts[0];
 assert.deepEqual(part.functionResponse.response.data.availability,{price:{status:'UNAVAILABLE'},stock:{status:'STALE'}});
 assert.equal(part.functionResponse.id,'read-1');
 assert.equal(part.functionResponse.response.data.content.description,'Áo cotton.');
 assert.equal(built.contents[2].parts[0].thoughtSignature,'opaque');
 assert.equal(response.data.availability.price.reason,'POS_SNAPSHOT_UNAVAILABLE');
 assert.doesNotMatch(JSON.stringify(built),/POS_SNAPSHOT_UNAVAILABLE|CATALOG_SNAPSHOT_STALE/);
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
