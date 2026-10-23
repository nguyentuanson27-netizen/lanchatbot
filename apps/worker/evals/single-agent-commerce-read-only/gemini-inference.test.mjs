import test from 'node:test';
test('native field contract maps domain paths without rewriting the signed transcript',()=>{
 const b=body([{functionCall:{id:'m1',name:'apply_customer_state',args:{ops:[{op:'SET',field:'WAIST_CM',value:74,sourceQuote:'74'}]}},thoughtSignature:'signed'}]);
 const parsed=parseGeminiGeneration(b);
 assert.equal(parsed.calls[0].args.ops[0].field,'measurements.WAIST_CM');
 assert.equal(parsed.content.parts[0].functionCall.args.ops[0].field,'WAIST_CM');
 assert.equal(parsed.content.parts[0].thoughtSignature,'signed');
 const invalid=body([{functionCall:{name:'apply_customer_state',args:{ops:[{op:'SET',field:'UNKNOWN',value:74}]}}}]);
 assert.throws(()=>parseGeminiGeneration(invalid));
});
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createCommerceVerifier} from './protocol.mjs';
import {createGeminiCommerceInference,parseGeminiGeneration,buildGeminiCommerceRequest,stateDeclarations,effectDeclarations} from './gemini-inference.mjs';

test('product reads require an explicit source offer or null while unknown offers remain discoverable',()=>{
 const r=request();r.availableTools=['read_product'];
 r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Mẫu'}];
 r.context.policyLiterals=[{ref:'offers:P1',text:JSON.stringify({productId:'P1',availableOffers:['AO','SET']})}];
 const declaration=()=>buildGeminiCommerceRequest(r).tools[0].functionDeclarations[0];
 assert.ok(declaration().parameters.required.includes('offerType'));
 assert.deepEqual(declaration().parameters.properties.offerType,{type:'STRING',nullable:true,enum:['AO','SET']});
 r.context.boundSubjects.push({ref:'P2',kind:'PRODUCT',label:'Chưa tra'});
 assert.deepEqual(declaration().parameters.properties.offerType,{type:'STRING',nullable:true});
 r.context.policyLiterals=[];
 assert.deepEqual(declaration().parameters.properties.offerType,{type:'STRING',nullable:true});
});

test('read offer null is explicit discovery, never an implicit default or a rewritten signed call',()=>{
 const original=body([{functionCall:{id:'read-1',name:'read_product',args:{subjectRef:'P1',offerType:null}},thoughtSignature:'signed'}]);
 const saved=structuredClone(original),parsed=parseGeminiGeneration(original);
 assert.deepEqual(parsed.calls[0].args,{subjectRef:'P1'});
 assert.deepEqual(parsed.content,original.candidates[0].content);
 assert.deepEqual(original,saved);
 const explicit=body([{functionCall:{name:'read_product',args:{subjectRef:'P1',offerType:'AO'}}}]);
 assert.equal(parseGeminiGeneration(explicit).calls[0].args.offerType,'AO');
 for(const args of [{subjectRef:'P1'},{subjectRef:'P1',offerType:''},{subjectRef:'P1',offerType:42}])
  assert.throws(()=>parseGeminiGeneration(body([{functionCall:{name:'read_product',args}}])),/OWNER_TOOL_OUTPUT/);
});
const config={model:'gemini-3.5-flash-lite',effort:'high',projectId:'test-project',location:'global'};
const request=()=>({generationId:'turn:owner:1',instructions:'Tư vấn theo dữ liệu nguồn.',contents:[{role:'user',parts:[{text:'Áo bao nhiêu em?'}]}],
 context:{boundSubjects:[],protectedClaims:[],runtimeProducts:[],policyLiterals:[],effectReceipts:[],state:{revision:1,currentProductId:null}},signal:new AbortController().signal});
const body=parts=>({modelVersion:'gemini-3.5-flash-lite',candidates:[{finishReason:'STOP',content:{role:'model',parts}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:4,thoughtsTokenCount:2}});

test('media probe provider wires expose view/select capability but never evaluation labels',async()=>{
 const {registerMediaProbe}=await import('./sales-journeys-registration.mjs');
 const rows=JSON.parse(readFileSync(new URL('./sales-media-cases.json',import.meta.url)));
 rows.forEach(c=>{c.evaluator.expected='SCORING_CANARY';});
 for(const c of registerMediaProbe(rows)){
  const r=request();r.contents=[{role:'user',parts:[{text:c.runtime.latest}]}];
  r.availableTools=['select_product_media','view_product_media'];
  r.context.boundSubjects=[{ref:'SV2447',kind:'PRODUCT',label:'Thạch Thảo'}];
  const b=buildGeminiCommerceRequest(r),wire=JSON.stringify(b);
  assert.deepEqual(b.tools[0].functionDeclarations.map(d=>d.name),r.availableTools);
  assert.doesNotMatch(wire,/SCORING_CANARY|caseId|evaluator|expected|purpose/);
  assert(!b.contents.flatMap(c=>c.parts).some(p=>p.inlineData));
 }
});

test('owner wire includes bounded turn metadata, not private fields or mutable fact identity',()=>{
 const r=request();r.turnTime={processingAt:'2026-10-22T17:05:00.000Z',timeZone:'Asia/Ho_Chi_Minh',private:'NEVER_FORWARD'};
 const text=buildGeminiCommerceRequest(r).contents[0].parts[0].text;
 assert.deepEqual(JSON.parse(text).turnTime,{processingAt:r.turnTime.processingAt,timeZone:r.turnTime.timeZone});
 assert.doesNotMatch(text,/NEVER_FORWARD/);
 for(const turnTime of [{...r.turnTime,processingAt:'not a date'},{...r.turnTime,timeZone:'invented'}])
  assert.throws(()=>buildGeminiCommerceRequest({...r,turnTime}),/TURN_TIME/);
});

test('native effect projection keeps each historical quote after dropping the full cart',()=>{
 const r=request(),first={cartId:'cart',cartVersion:1,grandTotalVnd:524000},second={...first,cartVersion:2,grandTotalVnd:499000};
 r.context.state.cartQuote=second;
 r.contents=[{role:'user',parts:[{functionResponse:{name:'add_to_cart',response:{status:'OK',data:{cart:{secret:'DO_NOT_EXPOSE'},cartItems:[],cartQuote:first}}}}]},
  {role:'user',parts:[{functionResponse:{name:'record_negotiation',response:{status:'OK',data:{cart:{secret:'DO_NOT_EXPOSE'},cartItems:[],cartQuote:second}}}}]}];
 const before=JSON.stringify(r),b=buildGeminiCommerceRequest(r);
 assert.deepEqual(b.contents[1].parts[0].functionResponse.response.data.cartQuote,first);
 assert.deepEqual(b.contents[2].parts[0].functionResponse.response.data.cartQuote,second);
 assert.doesNotMatch(JSON.stringify(b),/DO_NOT_EXPOSE/);assert.equal(JSON.stringify(r),before);
});

test('only bound catalog image bytes reach native inlineData; evaluator fields and arbitrary media do not',()=>{
 const r=request(),data=Buffer.from('synthetic-public-catalog-bytes').toString('base64'),sha256=createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');
 r.availableTools=['view_product_media'];r.context.boundSubjects=[{kind:'PRODUCT',ref:'P1',label:'Mẫu'}];
 r.catalogImages=[{subjectRef:'P1',assetRef:'asset:1',sha256,mimeType:'image/png',data,caseId:'IMAGE_CASE_CANARY'}];
 r.context.policyLiterals=[{ref:'vision:1',text:JSON.stringify({subjectRef:'P1',assets:[{assetRef:'asset:1',sha256,mimeType:'image/png'}]})}];
 const b=buildGeminiCommerceRequest(r),image=b.contents.flatMap(c=>c.parts).find(p=>p.inlineData);
 assert.deepEqual(image.inlineData,{mimeType:'image/png',data});
 assert.doesNotMatch(JSON.stringify(b),/IMAGE_CASE_CANARY|caseId/);
 r.catalogImages[0].data=Buffer.from('different').toString('base64');assert.throws(()=>buildGeminiCommerceRequest(r),/OWNER_IMAGE_BINDING/);
 r.catalogImages[0].data=data;r.context.policyLiterals=[];assert.throws(()=>buildGeminiCommerceRequest(r),/OWNER_IMAGE_BINDING/);
});

test('media selection has one native bounded subject and no model URL or send argument',()=>{
 const r=request();r.availableTools=['select_product_media'];r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Mẫu'}];
 const declaration=buildGeminiCommerceRequest(r).tools[0].functionDeclarations[0];
 assert.equal(declaration.name,'select_product_media');
 assert.deepEqual(declaration.parameters.properties.subjectRef.enum,['P1']);
 assert.deepEqual(declaration.parameters.required,['subjectRef','intent']);
 assert(!Object.hasOwn(declaration.parameters.properties,'url'));
 assert(!Object.hasOwn(declaration.parameters.properties,'send'));
});

test('both captured model requests keep the same policy meaning without deciding eligibility or leaking evaluator labels',async()=>{
 const r=request(),policy={customerCare:{inspection:{tryOnMode:'HOLD_UP_ONLY',
  tryOnModeDescription:'Chỉ ướm bên ngoài, không mặc vào người. Với đổi hàng yêu cầu chưa sử dụng, mặc thử vào người không đáp ứng điều kiện này; còn tem, chưa giặt hay chưa mặc ra ngoài không thay đổi kết luận đó. Giới hạn này áp dụng cho đổi hàng theo exchange, không tự loại trừ trả hàng do lỗi theo returns.'},
  exchange:{requiredConditions:{unused:true}}}};
 r.context.policyLiterals=[{ref:'policy:test',text:JSON.stringify(policy)}];
 r.contents.push({role:'model',parts:[{functionCall:{name:'read_policy',args:{}}}]},
  {role:'user',parts:[{functionResponse:{name:'read_policy',response:{status:'OK',data:{
   scope:'SHOP_RULES',orderEligibility:null,policy,sourceVersion:'test-source'}}}}]});
 r.caseId='POLICY_CASE_CANARY';r.evaluator={requiredBehaviors:['POLICY_RUBRIC_CANARY']};
 const original=structuredClone({context:r.context,contents:r.contents});let captured;
 const result=await createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
  captured=JSON.parse(init.body);return new Response(JSON.stringify(body([{text:'Dạ chị.'}])));
 }})(r);
 assert.equal(result.telemetry.providerRequests,1);
 const view=JSON.parse(captured.contents[0].parts[0].text).trusted;
 assert.deepEqual(view.policy,r.context.policyLiterals);
 assert.deepEqual(captured.contents.at(-1).parts[0].functionResponse.response.data,
  r.contents.at(-1).parts[0].functionResponse.response.data);
 assert.deepEqual({context:r.context,contents:r.contents},original);
 assert.doesNotMatch(JSON.stringify(captured),/POLICY_CASE_CANARY|POLICY_RUBRIC_CANARY|caseId|requiredBehaviors/);
 let verifierCaptured;
 const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
 await createCommerceVerifier(manifest,async(_manifest,_role,wire)=>{
  verifierCaptured=wire;
  return {status:'OK',answer:'{"verdict":"PASS","violations":[]}',providerRequests:1};
 })({generationId:'turn:verifier:1',instructions:'Kiểm reply.',trusted:r.context,finalDraft:'Dạ chị.',
  latest:'Em ơi',history:[],binding:{requestId:'turn'},signal:r.signal,caseId:r.caseId,evaluator:r.evaluator});
 const verifierView=JSON.parse(verifierCaptured.input[0].content[0].text);
 assert.deepEqual(verifierView.trusted.policyLiterals,view.policy);
 assert.doesNotMatch(JSON.stringify(verifierCaptured),/POLICY_CASE_CANARY|POLICY_RUBRIC_CANARY|caseId|requiredBehaviors/);
});

test('search exposes exact product codes independently of discovery text and preserves signed call arguments',()=>{
 const declaration=buildGeminiCommerceRequest(request()).tools[0].functionDeclarations.find(d=>d.name==='search_products');
 assert.equal(declaration.parameters.properties.productCode.type,'STRING');
 assert.ok(!declaration.parameters.required?.includes('query'));
 const native={id:'lookup',name:'search_products',args:{productCode:'AB824',query:'áo AB824'}};
 const parsed=parseGeminiGeneration(body([{functionCall:native,thoughtSignature:'signed-lookup'}]));
 assert.deepEqual(parsed.calls[0].args,native.args);
 assert.deepEqual(parsed.content.parts[0],{functionCall:native,thoughtSignature:'signed-lookup'});
});

test('captured owner context names only confirmed selling choices and leaves unknown offers unknown',async()=>{
 const r=request();r.context.boundSubjects=['P1','P2','P3'].map(ref=>({ref,kind:'PRODUCT',label:ref}));
 r.context.runtimeProducts=r.context.boundSubjects.map(s=>({subjectRef:s.ref,content:{productName:s.label,description:'Áo và chân váy.'}}));
 r.context.policyLiterals=[{ref:'offers:P1',text:JSON.stringify({productId:'P1',availableOffers:['AO','CV','SET','DIRECT','CUSTOM']})},
  {ref:'offers:P3',text:JSON.stringify({productId:'P3',availableOffers:[]})}];
 r.caseId='EVALUATOR_CASE_DISPLAY';r.requiredBehaviors=['EVALUATOR_LABEL_DISPLAY'];
 const before=structuredClone(r.context);let captured;
 await createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
  captured=JSON.parse(init.body);return new Response(JSON.stringify(body([{text:'Chị xem áo này nhé.'}])));
 }})(r);
 const view=JSON.parse(captured.contents[0].parts[0].text).trusted;
 assert.deepEqual(view.products[0].offerLabels,{AO:'áo lẻ',CV:'chân váy lẻ',SET:'cả bộ',DIRECT:'sản phẩm',CUSTOM:null});
 assert.equal(view.products[1].availableOffers,null);assert.equal(view.products[1].offerLabels,null);
 assert.deepEqual(view.products[2].availableOffers,[]);assert.deepEqual(view.products[2].offerLabels,{});
 assert.deepEqual(r.context,before);
 assert.doesNotMatch(JSON.stringify(captured),/EVALUATOR_CASE_DISPLAY|EVALUATOR_LABEL_DISPLAY/);
});

test('owner current product view keeps advice evidence and variant bindings without source bookkeeping',()=>{
 const r=request(),content={productName:'Áo An',description:'Cotton, tay dài. Không có thông tin lớp lót.',productUrl:null,metadata:{sourceVersion:'CONTENT_VERSION'}};
 const presentation={schemaVersion:1,productId:'P1',displayName:'Áo An',variants:[{variantId:'P1-M',color:'BE',size:'M'}],provenance:{contentHash:'CONTENT_HASH'}};
 r.context.runtimeProducts=[{ref:'product:P1',subjectRef:'P1',content,presentation}];
 r.contents.push({role:'model',parts:[{functionCall:{id:'r1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'signed'}]},
  {role:'user',parts:[{functionResponse:{id:'r1',name:'read_product',response:{status:'OK',data:{subjectRef:'P1',content:{...content,description:'Nguồn cũ.'}}}}}]});
 const before=structuredClone(r.context),history=structuredClone(r.contents),built=buildGeminiCommerceRequest(r);
 const product=JSON.parse(built.contents[0].parts[0].text).trusted.products[0];
 assert.deepEqual(product.content,{productName:content.productName,description:content.description,productUrl:null});
 assert.deepEqual(product.presentation,{displayName:presentation.displayName,variants:presentation.variants});
 // Different historical evidence must remain distinguishable; only current trusted bookkeeping is omitted.
 assert.deepEqual(built.contents.at(-1).parts[0].functionResponse.response.data.content,history.at(-1).parts[0].functionResponse.response.data.content);
 assert.deepEqual(built.contents.at(-2),history.at(-2));
 assert.deepEqual(r.context,before);assert.deepEqual(r.contents,history);
});

test('owner checkout projection omits code intake fields without changing confirmation state or source',()=>{
 const r=request();r.context.state.checkoutStatus={missingFields:['FULL_NAME','PHONE','ADDRESS','PAYMENT_METHOD'],previewAvailable:false,purchaseConfirmed:false};
 const before=structuredClone(r.context);
 const state=JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted.state;
 assert.deepEqual(state.checkoutStatus,{previewAvailable:false,purchaseConfirmed:false});
 assert.deepEqual(r.context,before);
 r.context.state.checkoutStatus={...r.context.state.checkoutStatus,previewAvailable:true,purchaseConfirmed:true};
 assert.deepEqual(JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted.state.checkoutStatus,{previewAvailable:true,purchaseConfirmed:true});
});

test('owner exposes source unavailability without naming the private source and retains actionable reasons',()=>{
 const r=request(),reasons=['POS_SNAPSHOT_UNAVAILABLE','SIZE_UNSUPPORTED','VARIANT_NOT_FOUND','DELIVERY_REGION_REQUIRED','CATALOG_SNAPSHOT_STALE'];
 const data={subjectRef:'P1',content:{description:'Áo thêu.'},availableOffers:null,sellingOptions:null,
  availability:Object.fromEntries(reasons.map((reason,i)=>['field'+i,{status:'UNAVAILABLE',reason}]))};
 r.contents.push({role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data}}}]});
 const out=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
 assert.deepEqual(out.availability.field0,{status:'UNAVAILABLE',reason:'SOURCE_UNAVAILABLE'});
 for(let i=1;i<reasons.length;i++)assert.equal(out.availability['field'+i].reason,reasons[i]);
 assert.equal(out.content.description,data.content.description);assert.equal(out.availableOffers,null);
 assert.equal(data.availability.field0.reason,'POS_SNAPSHOT_UNAVAILABLE');
});

test('partial reads preserve unknown, unavailable, absent, stale and zero-stock evidence as distinct outcomes',async()=>{
 for(const [status,reason,expected,offers] of [
  ['UNAVAILABLE',null,null,null],
  ['UNAVAILABLE','POS_SNAPSHOT_UNAVAILABLE','SOURCE_UNAVAILABLE',null],
  ['UNAVAILABLE','OFFER_NOT_FOUND','OFFER_NOT_FOUND',['AO']],
  ['STALE','CATALOG_SNAPSHOT_STALE','CATALOG_SNAPSHOT_STALE',['AO']],
  ['OK',null,null,['AO']],
 ]){
  const r=request(),facts=status==='OK'?[{type:'STOCK',value:{status:'OUT_OF_STOCK',quantity:0}}]:[];
  const data={subjectRef:'P1',content:{description:'Áo cotton.'},availableOffers:offers,sellingOptions:offers?[]:null,
   facts,availability:{stock:{status,reason}}};
  r.contents.push({role:'model',parts:[{functionCall:{id:'read-1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'opaque'}]},
   {role:'user',parts:[{functionResponse:{id:'read-1',name:'read_product',response:{status:'OK',data}}}]});
  let captured;
  await createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
   captured=JSON.parse(init.body);return new Response(JSON.stringify(body([{text:'Dạ chị.'}])));
  }})(r);
  const native=captured.contents.at(-1).parts[0].functionResponse;
  assert.equal(native.id,'read-1');assert.equal(native.response.status,'OK');
  assert.deepEqual(native.response.data.availability.stock,{status,reason:expected});
  assert.deepEqual(native.response.data.facts,facts);assert.deepEqual(native.response.data.availableOffers,offers);
  assert.equal(native.response.data.content.description,data.content.description);
  assert.equal(captured.contents.at(-2).parts[0].thoughtSignature,'opaque');
  assert.equal(data.availability.stock.reason,reason);
  assert.doesNotMatch(JSON.stringify(captured),/POS_SNAPSHOT_UNAVAILABLE/);
 }
});
test('unknown bounded finish enum survives telemetry without accepting completion or retrying',async()=>{
 for(const finish of ['NEW_PROVIDER_FINISH', 'private text should not be logged', 'A'.repeat(65), null]){
  let calls=0;const data=body([{text:'Dạ chị.'}]);data.candidates[0].finishReason=finish;
  const infer=createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async()=>{
   calls++;return new Response(JSON.stringify(data));}});
  await assert.rejects(infer(request()),error=>{
   assert.equal(error.telemetry.failureCode,'OWNER_FINISH_REASON');
   assert.equal(error.telemetry.rawFinishReason,finish==='NEW_PROVIDER_FINISH'?finish:null);
   return true;
  });assert.equal(calls,1);
 }
});


test('numeric writes expose bounded source quotes and cart adds require an explicit color or unknown',()=>{
 const op=stateDeclarations[0].parametersJsonSchema.properties.ops.items.properties;
 assert.deepEqual(op.sourceQuote,{type:'string',minLength:1,maxLength:160});
 const add=effectDeclarations.find(d=>d.name==='add_to_cart');
 assert.ok(add.parameters.required.includes('color'));
 assert.ok(add.parameters.required.includes('offerType'));
 assert.equal(add.parameters.properties.color.nullable,true);
 const r=request();r.context.state.customerStateUpdatePending=true;
 const view=JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted;
 assert.equal(view.state.customerStateUpdatePending,true);
});

test('cart offer arguments use confirmed source options without inventing an enum for unknown offers',()=>{
 const r=request();r.availableTools=['add_to_cart'];
 r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Mẫu'}];
 r.context.policyLiterals=[{ref:'offers:P1',text:JSON.stringify({productId:'P1',availableOffers:['DIRECT']})}];
 const declaration=()=>buildGeminiCommerceRequest(r).tools[0].functionDeclarations[0];
 assert.deepEqual(declaration().parameters.properties.offerType,{type:'STRING',enum:['DIRECT']});
 r.context.policyLiterals[0].text=JSON.stringify({productId:'P1',availableOffers:['AO','SET']});
 assert.deepEqual(declaration().parameters.properties.offerType.enum,['AO','SET']);
 r.context.policyLiterals=[];
 assert.deepEqual(declaration().parameters.properties.offerType,{type:'STRING'});
 assert.ok(declaration().parameters.required.includes('offerType'));
 r.context.policyLiterals=[{ref:'offers:P1',text:JSON.stringify({productId:'P1',availableOffers:['DIRECT']})}];
 r.context.boundSubjects.push({ref:'P2',kind:'PRODUCT',label:'Chưa tra'});
 assert.deepEqual(declaration().parameters.properties.offerType,{type:'STRING'});
});

test('captured HTTP request keeps per-option scope and sanitizes nested availability without evaluator labels',async()=>{
 const r=request(),captured=[],options=[{offerType:'AO',variantId:'offer:P1:AO',facts:[{type:'PRICE',scope:{productId:'P1',variantId:'offer:P1:AO'},value:{amountVnd:645000}}],
  availability:{price:{status:'OK',reason:null},stock:{status:'ERROR',reason:'PRIVATE_EVALUATOR_CANARY'}}},
 {offerType:'COMPOSITE',variantId:'offer:P1:COMPOSITE',facts:[{type:'PRICE',scope:{productId:'P1',variantId:'offer:P1:COMPOSITE'},value:{amountVnd:1065000}}],
  availability:{price:{status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'}}}];
 r.context.protectedClaims=options.flatMap(o=>o.facts);
 r.caseId='EVALUATOR_CASE_CANARY';r.expectedSafe=true;r.requiredBehaviors=['EVALUATOR_RUBRIC_CANARY'];
 r.contents.push({role:'model',parts:[{functionCall:{id:'r1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:{id:'r1',name:'read_product',response:{status:'OK',data:{subjectRef:'P1',offerType:'COMPOSITE',sellingOptions:options}}}}]});
 const infer=createGeminiCommerceInference(config,{getToken:async()=> 'test-token',fetchImpl:async(_url,init)=>{
  captured.push(JSON.parse(init.body));return new Response(JSON.stringify(body([{text:'Áo lẻ 645k chị nhé.'}])),{status:200});
 }});
 await infer(r);assert.equal(captured.length,1);
 const result=captured[0].contents.at(-1).parts[0].functionResponse.response.data;
 assert.equal(result.offerType,'COMPOSITE');assert.deepEqual(result.sellingOptions[0].facts,options[0].facts);
 assert.equal(result.sellingOptions[0].availability.stock.reason,'SOURCE_UNAVAILABLE');
 assert.equal(result.sellingOptions[1].availability.price.reason,'SOURCE_UNAVAILABLE');
 assert.doesNotMatch(JSON.stringify(captured),/CANARY|expectedSafe|requiredBehaviors/);
 assert.equal(r.contents.at(-1).parts[0].functionResponse.response.data.sellingOptions[0].availability.stock.reason,'PRIVATE_EVALUATOR_CANARY');
});

test('owner has one callable product identity and measurement fields match the write enum',()=>{
 const r=request();r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Áo',bindingVersion:'b'}];
 r.context.runtimeProducts=[{ref:'product:P1',subjectRef:'P1',content:{description:'Cotton.'}}];
 r.context.state.customerMeasurements=[{kind:'WAIST_CM',value:74}];
 r.contents.push({role:'model',parts:[{functionCall:{id:'s1',name:'search_products',args:{query:'P1'}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:{id:'s1',name:'search_products',response:{status:'OK',data:{status:'MATCHED',subjects:r.context.boundSubjects,products:r.context.runtimeProducts}}}}]});
 const b=buildGeminiCommerceRequest(r),view=JSON.parse(b.contents[0].parts[0].text).trusted;
 assert.equal(view.subjects[0].subjectRef,'P1');assert.equal(view.products[0].subjectRef,'P1');
 assert.deepEqual(view.state.customerMeasurements,[{field:'WAIST_CM',value:74}]);
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

test('current price and stock stay with their native offer even when also present in trusted facts',()=>{
 const r=request(),price={type:'PRICE',scope:{kind:'PRODUCT',productId:'P1',variantId:'offer:P1:AO'},value:{amountVnd:499000,currency:'VND'}};
 const stock={type:'STOCK',scope:price.scope,value:{status:'IN_STOCK',quantity:12}},facts=[price,stock];
 r.context.protectedClaims=facts.map((f,i)=>({...f,claimId:'code-owned-'+i,provenance:{sourceVersion:'current'}}));
 r.contents.push({role:'model',parts:[{functionCall:{id:'read-1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:{id:'read-1',name:'read_product',response:{status:'OK',data:{subjectRef:'P1',sourceVersion:'current',
   facts,sellingOptions:[{offerType:'AO',sourceVersion:'current',availability:{price:{status:'OK'}},facts}]}}}}]});
 const original=structuredClone(r.contents),b=buildGeminiCommerceRequest(r),data=b.contents.at(-1).parts[0].functionResponse.response.data;
 assert.deepEqual(JSON.parse(b.contents[0].parts[0].text).trusted.facts,facts);
 assert.deepEqual(data.facts,facts);assert.deepEqual(data.sellingOptions[0].facts,facts);
 assert.equal(data.sourceVersion,'current');assert.deepEqual(data.sellingOptions[0].availability,{price:{status:'OK',reason:null}});
 assert.equal(b.contents.at(-1).parts[0].functionResponse.id,'read-1');assert.deepEqual(b.contents.at(-2),r.contents.at(-2));
 assert.deepEqual(r.contents,original);
});

test('changed values and different product scopes in prior tool results remain visible',()=>{
 for(const change of ['value','scope']){
  const r=request(),old={type:'PRICE',scope:{kind:'PRODUCT',productId:'P1',variantId:'offer:P1:AO'},value:{amountVnd:499000}};
  const current=structuredClone(old);if(change==='value')current.value.amountVnd=599000;else current.scope.variantId='offer:P1:CV';
  r.context.protectedClaims=[current];
  r.contents.push({role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:{subjectRef:'P1',facts:[old],sellingOptions:[{offerType:'AO',facts:[old],availability:{}}]}}}}]});
  const data=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
  assert.deepEqual(data.facts,[old]);assert.deepEqual(data.sellingOptions[0].facts,[old]);
 }
});

const multiOfferRequest=()=>{
 const r=request(),scope={kind:'PRODUCT',productId:'RP42',variantId:'offer:RP42:SET'};
 const facts=[{type:'PRICE',scope,value:{amountVnd:590000,currency:'VND'}},
  {type:'STOCK',scope,value:{status:'IN_STOCK',availableQuantity:8}}];
 const availability={price:{status:'OK',reason:null},stock:{status:'OK',reason:null}};
 const metadata={sourceVersion:'snapshot-2',observedAt:'2026-10-18T00:00:00Z',expiresAt:'2026-10-18T02:00:00Z'};
 const data={subjectRef:'RP42',requestedOfferType:null,offerType:'SET',variantId:scope.variantId,...metadata,facts,availability,
  availableOffers:['AO','SET'],content:{description:'Áo cotton và chân váy.'},sellingOptions:[
   {offerType:'AO',variantId:'offer:RP42:AO',...metadata,availability:structuredClone(availability),facts:[
    {type:'PRICE',scope:{...scope,variantId:'offer:RP42:AO'},value:{amountVnd:310000,currency:'VND'}}]},
   {offerType:'SET',variantId:scope.variantId,...metadata,availability:structuredClone(availability),facts:structuredClone(facts)}]};
 r.context.boundSubjects=[{ref:'RP42',kind:'PRODUCT',label:'Mẫu RP42',bindingVersion:'b'}];
 r.context.protectedClaims=data.sellingOptions.flatMap(o=>o.facts);
 r.contents.push({role:'model',parts:[{functionCall:{id:'multi-read',name:'read_product',args:{subjectRef:'RP42'}},thoughtSignature:'opaque-multi'}]},
  {role:'user',parts:[{functionResponse:{id:'multi-read',name:'read_product',response:{status:'OK',data}}}]});
 return {r,data};
};

test('owner receives scoped unit-price differences without changing source facts or choosing an offer',()=>{
 const {r,data}=multiOfferRequest(),before=structuredClone(r);
 const output=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
 assert.deepEqual(output.priceDifferences,[{
  subjectRef:'RP42',basis:'ONE_UNIT_EACH_EXCLUDING_SHIPPING_AND_DISCOUNTS',currency:'VND',
  from:{offerType:'AO',variantId:'offer:RP42:AO',amountVnd:310000},
  to:{offerType:'SET',variantId:'offer:RP42:SET',amountVnd:590000},additionalAmountVnd:280000,
 }]);
 assert.deepEqual(output.sellingOptions,data.sellingOptions);
 assert.deepEqual(r.context,before.context);assert.deepEqual(r.contents,before.contents);
 // Input order, equal prices and a cheaper destination do not become a sales recommendation.
 data.sellingOptions.reverse();
 assert.equal(buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data.priceDifferences[0].additionalAmountVnd,-280000);
 for(const option of data.sellingOptions)option.facts.find(f=>f.type==='PRICE').value.amountVnd=410000;
 r.context.protectedClaims=data.sellingOptions.flatMap(o=>o.facts);
 assert.equal(buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data.priceDifferences[0].additionalAmountVnd,0);
});

test('owner price differences require unambiguous same-product current VND price evidence',()=>{
 for(const change of ['unavailable','missing','duplicate','stale','conflictingCurrent','otherProduct','otherVariant','currency','negative','fraction','unsafeInteger','unknownOffers']){
  const {r,data}=multiOfferRequest(),option=data.sellingOptions[0];
  if(change==='unavailable')option.availability.price.status='UNAVAILABLE';
  if(change==='missing')option.facts=[];
  if(change==='duplicate')option.facts.push(structuredClone(option.facts[0]));
  if(change==='stale')r.context.protectedClaims=structuredClone(r.context.protectedClaims).map(f=>f.type==='PRICE'?{...f,value:{...f.value,amountVnd:1}}:f);
  if(change==='conflictingCurrent')r.context.protectedClaims.push({...structuredClone(option.facts[0]),value:{amountVnd:1,currency:'VND'}});
  if(change==='otherProduct')option.facts[0].scope.productId='RP43';
  if(change==='otherVariant')option.facts[0].scope.variantId='another-variant';
  if(change==='currency')option.facts[0].value.currency='USD';
  if(change==='negative')option.facts[0].value.amountVnd=-10;
  if(change==='fraction')option.facts[0].value.amountVnd=10.5;
  if(change==='unsafeInteger')option.facts[0].value.amountVnd=Number.MAX_SAFE_INTEGER+1;
  if(change==='unknownOffers')data.availableOffers=null;
  const output=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
  assert.equal(output.priceDifferences,undefined,change);
  assert.deepEqual(output.sellingOptions,data.sellingOptions,change);
 }
});

test('captured multi-offer read removes only fully duplicated defaults while preserving every option and native identity',async()=>{
 const {r,data}=multiOfferRequest(),captured=[],before=structuredClone(r);
 r.caseId='EVALUATOR_MULTI_CANARY';r.requiredBehaviors=['EVALUATOR_RESPONSE_CANARY'];
 const infer=createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
  captured.push(JSON.parse(init.body));return new Response(JSON.stringify(body([{text:'Áo cotton chị nhé.'}])));
 }});
 await infer(r);assert.equal(captured.length,1);
 const wire=captured[0],local=wire.contents.at(-1).parts[0].functionResponse;
 for(const key of ['offerType','variantId','facts','availability'])assert.equal(Object.hasOwn(local.response.data,key),false,key);
 assert.deepEqual(local.response.data.sellingOptions,data.sellingOptions);
 assert.equal(local.response.data.priceDifferences[0].additionalAmountVnd,280000);
 assert.equal(local.response.data.sourceVersion,data.sourceVersion);assert.deepEqual(local.response.data.content,data.content);
 assert.deepEqual(JSON.parse(wire.contents[0].parts[0].text).trusted.facts,before.context.protectedClaims);
 assert.equal(local.id,'multi-read');assert.deepEqual(wire.contents.at(-2),before.contents.at(-2));
 assert.deepEqual(r.context,before.context);assert.deepEqual(r.contents,before.contents);
 assert.doesNotMatch(JSON.stringify(wire),/EVALUATOR_MULTI_CANARY|EVALUATOR_RESPONSE_CANARY|test-token/);
});

test('same-response evidence differences retain default scope instead of hiding version, expiry, availability or unique facts',()=>{
 for(const change of ['sourceVersion','observedAt','expiresAt','metadata','value','scope','variantId','missingFact','availability','eta','unknownAvailability','maskedReason']){
  const {r,data}=multiOfferRequest(),option=data.sellingOptions[1];
  if(['sourceVersion','observedAt','expiresAt'].includes(change))option[change]='different';
  if(change==='metadata'){data.metadata={authority:'POS',revision:2};option.metadata={authority:'POS',revision:1};}
  if(change==='value')option.facts[0].value.amountVnd=600000;
  if(change==='scope')option.facts[0].scope.productId='RP43';
  if(change==='variantId')option.variantId='offer:RP42:OTHER';
  if(change==='missingFact')option.facts.pop();
  if(change==='availability')option.availability.stock={status:'UNAVAILABLE',reason:'SIZE_UNSUPPORTED'};
  if(change==='eta')data.availability.eta={status:'UNAVAILABLE',reason:'DELIVERY_REGION_REQUIRED'};
  if(change==='unknownAvailability')data.availability.stock={status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'};
  if(change==='maskedReason'){
   data.availability.eta={status:'UNAVAILABLE',reason:'PRIVATE_SOURCE_ONE'};
   option.availability.eta={status:'UNAVAILABLE',reason:'PRIVATE_SOURCE_TWO'};
  }
  const out=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
  assert.deepEqual(out.facts,data.facts,change);assert.equal(out.offerType,'SET',change);assert.equal(out.variantId,data.variantId,change);
  assert.equal(out.availability.stock.status,data.availability.stock.status,change);
  if(change==='eta')assert.deepEqual(out.availability.eta,data.availability.eta);
 }
});

test('unfiltered source defaults without root metadata can be folded while partial reads retain their current shape',()=>{
 for(const partial of [false,true]){
  const {r,data}=multiOfferRequest();for(const key of ['sourceVersion','observedAt','expiresAt'])delete data[key];
  if(partial){data.availability.stock={status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'};data.sellingOptions[1].availability=structuredClone(data.availability);}
  const out=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
  assert.equal(Object.hasOwn(out,'facts'),partial);assert.deepEqual(out.sellingOptions[1].facts,data.facts);
  if(partial){assert.equal(out.availability.stock.status,'UNAVAILABLE');assert.equal(out.availability.stock.reason,'SOURCE_UNAVAILABLE');}
 }
});

test('an explicit offer read and an unproven request shape keep their scoped defaults',()=>{
 for(const mode of ['explicit','missingRequestScope','emptyFacts','single','nullOptions']){
  const {r,data}=multiOfferRequest();
  if(mode==='explicit'){data.requestedOfferType='SET';r.contents.at(-2).parts[0].functionCall.args.offerType='SET';}
  if(mode==='missingRequestScope')delete data.requestedOfferType;
  if(mode==='emptyFacts')data.facts=[];
  if(mode==='single')data.sellingOptions=[data.sellingOptions[1]];
  if(mode==='nullOptions'){data.availableOffers=null;data.sellingOptions=null;}
  const out=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
  assert.equal(out.offerType,'SET',mode);assert.deepEqual(out.facts,data.facts,mode);
  assert.deepEqual(out.availableOffers,data.availableOffers,mode);
 }
});

test('historical multi-offer results are compared locally rather than against newer trusted values',()=>{
 const {r,data}=multiOfferRequest();r.context.protectedClaims=structuredClone(r.context.protectedClaims);
 r.context.protectedClaims.find(f=>f.scope.variantId==='offer:RP42:SET'&&f.type==='PRICE').value.amountVnd=610000;
 const out=buildGeminiCommerceRequest(r),local=out.contents.at(-1).parts[0].functionResponse.response.data;
 assert.equal(Object.hasOwn(local,'facts'),false);
 assert.deepEqual(local.sellingOptions,data.sellingOptions);
 assert.equal(local.sellingOptions[1].facts[0].value.amountVnd,590000);
 assert.equal(JSON.parse(out.contents[0].parts[0].text).trusted.facts.find(f=>f.scope.variantId==='offer:RP42:SET'&&f.type==='PRICE').value.amountVnd,610000);
});

test('the serialized B owner HTTP body owns the exact 65536-byte bound before any auth or generation request',async()=>{
 const r=request();r.instructions='';
 const baseline=Buffer.byteLength(JSON.stringify(buildGeminiCommerceRequest(r)));
 for(const size of [65535,65536]){
  r.instructions='x'.repeat(size-baseline);assert.equal(Buffer.byteLength(JSON.stringify(buildGeminiCommerceRequest(r))),size);
 }
 r.instructions+='x';let auth=0,dispatch=0;
 const infer=createGeminiCommerceInference(config,{getToken:async()=>{auth++;return 'test-token';},fetchImpl:async()=>{dispatch++;}});
 await assert.rejects(infer(r),e=>{
  assert.equal(e.telemetry.requestBytes,65537);
  return e.telemetry.failureCode==='OWNER_REQUEST_BOUND'&&e.telemetry.providerRequests===0;
 });
 assert.equal(auth,0);assert.equal(dispatch,0);
});

test('partial commerce reads retain independent product evidence locally even when trusted contains the identical evidence',async()=>{
 for(const missing of ['price','stock']){
  const r=request(),captured=[],evidence={content:{description:'Áo cotton, dáng suông.',metadata:{authority:'WEBSTORE_XML',sourceVersion:'current'}},
   attributes:{material:'Cotton'},presentation:{text:'Dáng suông.'},sizeCharts:[{sizes:['M']}]};
  r.context.runtimeProducts=[{ref:'product:P1',subjectRef:'P1',...structuredClone(evidence)}];
  r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Áo',bindingVersion:'current'}];
  const data={subjectRef:'P1',...structuredClone(evidence),sellingOptions:null,facts:[],
   availability:{price:{status:'OK',reason:null},stock:{status:'OK',reason:null}}};
  data.availability[missing]={status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'};
  const model={role:'model',parts:[{functionCall:{id:'partial',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'opaque-partial'}]};
  r.contents.push(model,{role:'user',parts:[{functionResponse:{id:'partial',name:'read_product',response:{status:'OK',data}}}]});
  r.caseId='EVALUATOR_ONLY';r.requiredBehaviors=['PRIVATE_RUBRIC'];const original=structuredClone(r.contents);
  const infer=createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
   captured.push(JSON.parse(init.body));return new Response(JSON.stringify(body([{text:'Áo cotton dáng suông chị nhé.'}])));
  }});
  await infer(r);assert.equal(captured.length,1);
  const wire=captured[0],local=wire.contents.at(-1).parts[0].functionResponse;
  for(const [key,value] of Object.entries(evidence))assert.deepEqual(local.response.data[key],value);
  assert.equal(local.response.data.sellingOptions,null);assert.deepEqual(local.response.data.facts,[]);
  assert.deepEqual(local.response.data.availability[missing],{...data.availability[missing],reason:'SOURCE_UNAVAILABLE'});
  assert.equal(local.id,'partial');assert.deepEqual(wire.contents.at(-2),model);assert.deepEqual(r.contents,original);
  assert.doesNotMatch(JSON.stringify(wire),/EVALUATOR_ONLY|PRIVATE_RUBRIC|test-token/);
 }
});

test('bounded long native continuations reach HTTP with the exact model parts and call identities',async()=>{
 const r=request(),captured=[],signature='opaque-signature-'.repeat(2200);
 const model={role:'model',parts:[{functionCall:{id:'read-1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:signature}]};
 const response={status:'OK',data:{subjectRef:'P1',content:{description:'Cotton.'},facts:[],
  availability:{stock:{status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'}}}};
 r.contents.push(model,{role:'user',parts:[{functionResponse:{id:'read-1',name:'read_product',response}}]});
 const infer=createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
  captured.push(JSON.parse(init.body));return new Response(JSON.stringify(body([{text:'Áo cotton chị nhé.'}])));
 }});
 const result=await infer(r);assert.equal(captured.length,1);assert.equal(result.telemetry.providerRequests,1);
 assert.ok(result.telemetry.requestBytes>32768&&result.telemetry.requestBytes<=65536);
 assert.deepEqual(captured[0].contents.at(-2),model);assert.equal(captured[0].contents.at(-1).parts[0].functionResponse.id,'read-1');
 assert.equal(result.telemetry.requestHash,createHash('sha256').update(JSON.stringify(captured[0])).digest('hex'));
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

test('failed generations retain bounded stage and completion reason without leaking arbitrary errors',async()=>{
 const completion=body([{text:'partial'}]);completion.candidates[0].finishReason='MAX_TOKENS';
 const cases=[
  {fetchImpl:async()=>new Response(JSON.stringify(completion)),stage:'COMPLETION',code:'OWNER_FINISH_REASON',finishReason:'MAX_TOKENS'},
  {fetchImpl:async()=>new Response('not json'),stage:'RESPONSE',code:'RESPONSE_INVALID',finishReason:null},
  {fetchImpl:async()=>{throw new Error('PRIVATE_CUSTOMER_AND_TOKEN');},stage:'GENERATION',code:'TRANSPORT_ERROR',finishReason:null},
 ];
 for(const c of cases){
  let calls=0;
  const infer=createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(...args)=>{calls++;return c.fetchImpl(...args);}});
  await assert.rejects(infer(request()),error=>{
   assert.equal(error.telemetry.failureStage,c.stage);assert.equal(error.telemetry.failureCode,c.code);
   assert.equal(error.telemetry.finishReason,c.finishReason);assert.equal(error.telemetry.providerRequests,1);
   assert.doesNotMatch(JSON.stringify(error.telemetry),/PRIVATE_CUSTOMER_AND_TOKEN|test-token|partial/);
   return true;
  });
  assert.equal(calls,1);
 }
});
test('completion failures distinguish candidate count, finish, role, parts and empty visible output without retaining response text',async()=>{
 const cases=[
  {data:{modelVersion:config.model,candidates:[]},code:'OWNER_CANDIDATE_COUNT',finish:null},
  {data:{...body([{text:'PRIVATE_RESPONSE'}]),candidates:[{finishReason:'MODEL_ARMOR'}]},code:'OWNER_FINISH_REASON',finish:'MODEL_ARMOR'},
  {data:{...body([{text:'PRIVATE_RESPONSE'}]),candidates:[{finishReason:'FINISH_REASON_UNSPECIFIED'}]},code:'OWNER_FINISH_REASON',finish:'FINISH_REASON_UNSPECIFIED'},
  {data:{...body([{text:'PRIVATE_RESPONSE'}]),candidates:[{finishReason:'FUTURE_PROVIDER_REASON'}]},code:'OWNER_FINISH_REASON',finish:'UNKNOWN'},
  {data:{...body([{text:'PRIVATE_RESPONSE'}]),candidates:[{finishReason:'STOP',content:{role:'user',parts:[{text:'PRIVATE_RESPONSE'}]}}]},code:'OWNER_CONTENT_ROLE',finish:'STOP'},
  {data:body([]),code:'OWNER_CONTENT_PARTS',finish:'STOP'},
  {data:body([{thought:true,text:'PRIVATE_RESPONSE'}]),code:'OWNER_FINAL_EMPTY',finish:'STOP'},
 ];
 for(const c of cases){
  let calls=0;const infer=createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async()=>{calls++;return new Response(JSON.stringify(c.data));}});
  await assert.rejects(infer(request()),e=>{
   assert.equal(e.telemetry.failureStage,'COMPLETION');assert.equal(e.telemetry.failureCode,c.code);assert.equal(e.telemetry.finishReason,c.finish);
   assert.equal(e.telemetry.providerRequests,1);assert.doesNotMatch(JSON.stringify(e.telemetry),/PRIVATE_RESPONSE|test-token/);return true;
  });assert.equal(calls,1);
 }
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
 assert.deepEqual(names,['apply_customer_state','recommend_size','quote_cart','record_negotiation','add_to_cart','change_cart_item','confirm_purchase']);
 const fields=stateDeclarations[0].parametersJsonSchema.properties.ops.items.properties;
 assert.ok(fields.field.enum.includes('WAIST_CM'));
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

test('two committed cart actions keep their own bounded stock summaries and native identities without repeating full carts',()=>{
 const r=request(),summary=(size,quantity)=>[{subjectRef:'line-1',productRef:'SM613',offerType:'AO',quantity,
  components:[{componentRole:'TOP',size,color:'BE'}],stockStatus:'PRE_ORDER',stockAvailableQuantity:0}];
 const first=summary('L',1),second=summary('L',2);
 r.context.state.cartItems=second;
 const model={role:'model',parts:[{functionCall:{id:'variant',name:'change_cart_item',args:{subjectRef:'line-1',action:'SET_COMPONENT_VARIANT',componentRole:'TOP',size:'L'}},thoughtSignature:'opaque'},
  {functionCall:{id:'quantity',name:'change_cart_item',args:{subjectRef:'line-1',action:'SET_QUANTITY',quantity:2}}}]};
 r.contents.push(model,{role:'user',parts:[first,second].map((cartItems,i)=>({functionResponse:{id:i?'quantity':'variant',name:'change_cart_item',response:{status:'OK',data:{
  operationId:'operation-'+i,effect:'CART_MUTATED',cart:{lines:[{internal:'FULL_CART_ONLY',padding:'x'.repeat(2000)}]},cartItems,purchaseConfirmed:false,externalOrderCreated:false}}}}))});
 const original=structuredClone(r),built=buildGeminiCommerceRequest(r,effectDeclarations),data=built.contents.at(-1).parts.map(p=>p.functionResponse.response.data);
 assert.deepEqual(data.map(d=>d.cartItems),[first,second]);assert.ok(data.every(d=>!Object.hasOwn(d,'cart')));
 assert.deepEqual(built.contents.at(-1).parts.map(p=>p.functionResponse.id),['variant','quantity']);
 assert.deepEqual(built.contents.at(-2),model);assert.deepEqual(r.contents,original.contents);
 assert.deepEqual(JSON.parse(built.contents[0].parts[0].text).trusted.state.cartItems,second);
 assert.doesNotMatch(JSON.stringify(built),/FULL_CART_ONLY/);assert.ok(Buffer.byteLength(JSON.stringify(built))<32768);
 assert.ok(Buffer.byteLength(JSON.stringify(built.contents.at(-1)))<8192);
 assert.ok(Buffer.byteLength(JSON.stringify(r.contents.at(-1).parts.map(p=>p.functionResponse.response)))<8192);
 const legacy=request();legacy.contents.push({role:'user',parts:[{functionResponse:{name:'add_to_cart',response:{status:'OK',data:{cart:{lines:[]}}}}}]});
 assert.deepEqual(buildGeminiCommerceRequest(legacy).contents.at(-1).parts[0].functionResponse.response.data.cart,{lines:[]});
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

test('tool product identities are restricted to bound products, not offer evidence or cart lines',()=>{
 const r=request();r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Áo'},
  {ref:'offer:P1:AO',kind:'VARIANT',productId:'P1',label:'Áo lẻ'},{ref:'line-1',kind:'CART_LINE',label:'Áo trong giỏ'}];
 r.availableTools=['read_product','recommend_size','add_to_cart','change_cart_item'];
 const b=buildGeminiCommerceRequest(r),decls=b.tools[0].functionDeclarations,subjects=JSON.parse(b.contents[0].parts[0].text).trusted.subjects;
 for(const name of ['read_product','recommend_size','add_to_cart'])assert.deepEqual(decls.find(d=>d.name===name).parameters.properties.subjectRef.enum,['P1']);
 assert.deepEqual(decls.find(d=>d.name==='change_cart_item').parameters.properties.subjectRef.enum,['line-1']);
 assert.equal(subjects.find(s=>s.kind==='VARIANT').subjectRef,undefined);
 assert.equal(subjects.find(s=>s.kind==='VARIANT').evidenceRef,'offer:P1:AO');
 assert.equal(effectDeclarations.find(d=>d.name==='add_to_cart').parameters.properties.subjectRef.enum,undefined);
});

test('negotiation exposes intent and current source quote without model-selected money, tier or policy',()=>{
 const r=request();r.availableTools=['record_negotiation'];
 const d=buildGeminiCommerceRequest(r).tools[0].functionDeclarations[0];
 assert.deepEqual(Object.keys(d.parameters.properties),['intent','sourceQuote']);
 assert.deepEqual(d.parameters.required,['intent','sourceQuote']);
 assert.deepEqual(d.parameters.properties.intent.enum,['PRICE_OBJECTION','PURCHASE_READY']);
});

test('read results do not advertise an output-only field as an alternative input parameter',()=>{
 const r=request();r.contents.push({role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data:{
  subjectRef:'P1',requestedOfferType:'AO',offerType:'AO',variantId:'offer:P1:AO',availableOffers:['AO','SET']}}}}]});
 const projected=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
 assert.equal(projected.requestedOfferType,undefined);assert.equal(projected.offerType,'AO');
 assert.equal(projected.variantId,'offer:P1:AO');assert.equal(r.contents.at(-1).parts[0].functionResponse.response.data.requestedOfferType,'AO');
});

test('the actual final-only HTTP body has no declarations and its hash and tool-mode violation are retained',async()=>{
 const r=request();r.toolsAllowed=false;r.toolBudget={roundsRemaining:0,callsRemaining:2};
 r.contents.push({role:'model',parts:[{functionCall:{id:'f1',name:'read_policy',args:{}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:{id:'f1',name:'read_policy',response:{status:'OK'}}}]});
 let calls=0,wire;
 const infer=createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
  calls++;wire=init.body;return new Response(JSON.stringify(body([{functionCall:{name:'read_policy',args:{}}}])));
 }});
 const result=await infer(r),sent=JSON.parse(wire);
 assert.deepEqual(sent.tools,[]);assert.equal(sent.toolConfig.functionCallingConfig.mode,'NONE');
 assert.equal(sent.contents[2].parts[0].thoughtSignature,'opaque');assert.equal(sent.contents[3].parts[0].functionResponse.id,'f1');
 assert.equal(result.telemetry.requestHash,createHash('sha256').update(wire).digest('hex'));
 assert.equal(result.telemetry.requestBytes,Buffer.byteLength(wire));assert.equal(result.telemetry.functionCallingMode,'NONE');
 assert.equal(result.telemetry.declaredToolCount,0);assert.equal(result.telemetry.unexpectedToolCall,true);
 assert.equal(result.kind,'TOOLS');assert.equal(calls,1);
});

test('captured requests distinguish configured capabilities from permission to call tools this generation',async()=>{
 for(const availableTools of [['read_product','read_policy'],['read_product','add_to_cart','confirm_purchase']]){
  for(const toolsAllowed of [true,false]){
   const r=request();Object.assign(r,{availableTools,toolsAllowed,toolBudget:{roundsRemaining:toolsAllowed?1:0,callsRemaining:3}});
   let wire;
   const result=await createGeminiCommerceInference(config,{getToken:async()=>'test-token',fetchImpl:async(_url,init)=>{
    wire=JSON.parse(init.body);return new Response(JSON.stringify(body([{text:'Dạ chị.'}])));
   }})(r);
   const execution=JSON.parse(wire.contents[0].parts[0].text).trusted.execution;
   assert.deepEqual(execution.availableTools,availableTools);
   assert.equal(execution.toolsAllowed,toolsAllowed);
   assert.deepEqual(wire.tools.flatMap(t=>t.functionDeclarations.map(d=>d.name)),toolsAllowed?availableTools:[]);
   assert.equal(wire.toolConfig.functionCallingConfig.mode,toolsAllowed?'AUTO':'NONE');
   assert.equal(result.telemetry.providerRequests,1);
  }
 }
 const empty=request();empty.availableTools=[];empty.toolsAllowed=false;
 assert.deepEqual(JSON.parse(buildGeminiCommerceRequest(empty).contents[0].parts[0].text).trusted.execution.availableTools,[]);
});

test('current fit comparison fields and configured tool capabilities reach the owner without private authority',()=>{
 const r=request();Object.assign(r.context.state,{customerProfileId:'profile-1',customerProfileRevision:4,
  measurementFingerprint:'current-fingerprint',sizeMeasurementFingerprints:{SM613:'size-fingerprint'},recipient:'PRIVATE_RECIPIENT',permission:true});
 r.toolBudget={roundsRemaining:1,callsRemaining:4};
 const built=buildGeminiCommerceRequest(r),trusted=JSON.parse(built.contents[0].parts[0].text).trusted;
 assert.equal(trusted.state.customerProfileRevision,4);assert.equal(trusted.state.customerProfileId,'profile-1');
 assert.equal(trusted.state.measurementFingerprint,'current-fingerprint');assert.deepEqual(trusted.state.sizeMeasurementFingerprints,{SM613:'size-fingerprint'});
 assert.deepEqual(built.systemInstruction,{parts:[{text:r.instructions}]});
 assert.deepEqual(trusted.execution,{availableTools:['search_products','read_product','read_policy'],toolsAllowed:true,toolBudget:{roundsRemaining:1,callsRemaining:4}});
 assert.doesNotMatch(JSON.stringify(trusted),/PRIVATE_RECIPIENT|"permission"/);
 r.toolsAllowed=false;r.toolBudget={roundsRemaining:0,callsRemaining:4};
 const finalRequest=buildGeminiCommerceRequest(r),last=JSON.parse(finalRequest.contents[0].parts[0].text).trusted.execution;
 assert.deepEqual(last.availableTools,['search_products','read_product','read_policy']);assert.equal(last.toolsAllowed,false);assert.equal(last.toolBudget.roundsRemaining,0);
 assert.deepEqual(finalRequest.tools,[]);assert.equal(finalRequest.toolConfig.functionCallingConfig.mode,'NONE');
});

test('rollback keeps bounded execution data and native dialogue outside system instructions',()=>{
 const r=request();r.toolsAllowed=false;r.toolBudget={roundsRemaining:0,callsRemaining:3,extra:'EVALUATOR_ONLY_CANARY'};
 r.contents=[{role:'user',parts:[{text:'Khách đã chọn màu xanh, size S. DATA_ONLY_CANARY'}]},
  {role:'model',parts:[{text:'Phần này em chưa trả lời được.'}]},
  {role:'user',parts:[{text:'Lấy hai chiếc nhé.'}]}];
 r.context.runtimeProducts=[{subjectRef:'P1',content:{description:'PRODUCT_DATA_CANARY'}}];
 const before=structuredClone(r.contents),built=buildGeminiCommerceRequest(r),system=JSON.stringify(built.systemInstruction);
 assert.deepEqual(built.contents.slice(1),before);assert.deepEqual(r.contents,before);
 assert.doesNotMatch(system,/DATA_ONLY_CANARY|PRODUCT_DATA_CANARY|EVALUATOR_ONLY_CANARY/);
 assert.doesNotMatch(JSON.stringify(built),/EVALUATOR_ONLY_CANARY/);
 assert.deepEqual(built.systemInstruction,{parts:[{text:r.instructions}]});
 assert.deepEqual(JSON.parse(built.contents[0].parts[0].text).trusted.execution,{availableTools:['search_products','read_product','read_policy'],toolsAllowed:false,toolBudget:{roundsRemaining:0,callsRemaining:3}});
});

test('execution budget accepts only bounded code-owned numbers before provider dispatch',async()=>{
 for(const budget of [{roundsRemaining:'INSTRUCTION_CANARY',callsRemaining:3},
  {roundsRemaining:3,callsRemaining:3},{roundsRemaining:1,callsRemaining:-1},{roundsRemaining:1,callsRemaining:7}]){
  const r=request();r.toolBudget=budget;let calls=0;
  const infer=createGeminiCommerceInference(config,{getToken:async()=>{calls++;return 'test-token';},
   fetchImpl:async()=>{calls++;return new Response(JSON.stringify(body([{text:'Dạ chị.'}])));}});
  await assert.rejects(infer(r),error=>error.telemetry.failureCode==='OWNER_EXECUTION_BOUND'&&error.telemetry.providerRequests===0);
  assert.equal(calls,0);
 }
});

test('native call identity remains paired with its function response',()=>{
 const result=parseGeminiGeneration(body([{functionCall:{id:'native-call-1',name:'read_policy',args:{}}}]));
 assert.equal(result.calls[0].id,'native-call-1');
});
test('owner retains bounded source reasons for partial answers without arbitrary diagnostics or loss of native parts',()=>{
 const r=request();
 const response={status:'OK',data:{content:{description:'Áo cotton.'},facts:[],
  availability:{price:{status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'},stock:{status:'STALE',reason:'CATALOG_SNAPSHOT_STALE'},
   eta:{status:'UNAVAILABLE',reason:'PRIVATE_CUSTOMER_AND_TOKEN'}}}};
 r.contents.push({role:'model',parts:[{functionCall:{id:'read-1',name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'opaque'}]},
  {role:'user',parts:[{functionResponse:{id:'read-1',name:'read_product',response}}]});
 const built=buildGeminiCommerceRequest(r),part=built.contents[3].parts[0];
 assert.deepEqual(part.functionResponse.response.data.availability,{price:{status:'UNAVAILABLE',reason:'SOURCE_UNAVAILABLE'},
  stock:{status:'STALE',reason:'CATALOG_SNAPSHOT_STALE'},eta:{status:'UNAVAILABLE',reason:'SOURCE_UNAVAILABLE'}});
 assert.equal(part.functionResponse.id,'read-1');
 assert.equal(part.functionResponse.response.data.content.description,'Áo cotton.');
 assert.equal(built.contents[2].parts[0].thoughtSignature,'opaque');
 assert.equal(response.data.availability.price.reason,'POS_SNAPSHOT_UNAVAILABLE');
 assert.doesNotMatch(JSON.stringify(built),/PRIVATE_CUSTOMER_AND_TOKEN/);
});

test('selling options belong to owner products while rule and read literals retain their exact evidence',()=>{
 const r=request();r.context.boundSubjects=[{ref:'P1',kind:'PRODUCT',label:'Set'}, {ref:'P2',kind:'PRODUCT',label:'Áo dài'}];
 r.context.runtimeProducts=[{ref:'product:P1',subjectRef:'P1',content:{description:'Áo thêu, chân váy ren.'}}];
 r.context.policyLiterals=[{ref:'offers:P1',text:JSON.stringify({productId:'P1',availableOffers:['AO','CV','SET']})},
  {ref:'offers:P2',text:JSON.stringify({productId:'P2',availableOffers:['AO','COMPOSITE']})},
  {ref:'policy:shop',text:'Current shop rules'}, {ref:'read:filters',text:JSON.stringify({productId:'P1',size:'M',color:'BE',deliveryRegion:'HANOI',stockClaimId:'claim-1'})}];
 const before=structuredClone(r.context),view=JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted;
 assert.deepEqual(view.products.find(p=>p.subjectRef==='P1').availableOffers,['AO','CV','SET']);
 assert.deepEqual(view.products.find(p=>p.subjectRef==='P2').availableOffers,['AO','COMPOSITE']);
 assert.equal(view.products.find(p=>p.subjectRef==='P1').content.description,'Áo thêu, chân váy ren.');
 assert.deepEqual(view.policy,r.context.policyLiterals.filter(p=>!p.ref.startsWith('offers:')));
 assert.deepEqual(r.context,before);
 r.context.policyLiterals=r.context.policyLiterals.filter(p=>!p.ref.startsWith('offers:'));
 const unknown=JSON.parse(buildGeminiCommerceRequest(r).contents[0].parts[0].text).trusted.products.find(p=>p.subjectRef==='P1');
 assert.notDeepEqual(unknown.availableOffers,[]);assert.equal(unknown.availableOffers,null);
});

test('owner read responses keep independent content and missing field statuses without a duplicate missing checklist',()=>{
 const r=request();const data={subjectRef:'P1',content:{description:'Áo thêu, chân váy ren.'},attributes:null,
  availability:{price:{status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'},stock:{status:'UNAVAILABLE',reason:'POS_SNAPSHOT_UNAVAILABLE'}},
  missing:['PRICE','STOCK','ATTRIBUTES'],availableOffers:null};
 r.contents.push({role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK',data}}}]});
 const out=buildGeminiCommerceRequest(r).contents.at(-1).parts[0].functionResponse.response.data;
 assert.equal(out.missing,undefined);assert.equal(out.content.description,data.content.description);
 assert.equal(out.availableOffers,null);assert.equal(out.availability.price.reason,'SOURCE_UNAVAILABLE');
 assert.deepEqual(data.missing,['PRICE','STOCK','ATTRIBUTES']);
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


test('state operation schema binds each field to its domain and separates CLEAR',()=>{
 const item=stateDeclarations[0].parametersJsonSchema.properties.ops.items;
 assert.ok(item.anyOf);
 const fit=item.anyOf.find(b=>b.properties.field.enum.includes('fitPreference')&&b.properties.value);
 assert.deepEqual(fit.properties.value.enum,['FITTED','REGULAR','RELAXED']);
 const numeric=item.anyOf.find(b=>b.properties.field.enum.includes('WAIST_CM')&&b.properties.value);
 assert.equal(numeric.properties.value.type,'number');
 assert.ok(numeric.required.includes('sourceQuote'));
 const clear=item.anyOf.find(b=>b.properties.op.enum.length===1&&b.properties.op.enum[0]==='CLEAR');
 assert.ok(!clear.required.includes('value'));assert.equal(clear.additionalProperties,false);
 assert.ok(!clear.properties.value);
 assert.doesNotMatch(stateDeclarations[0].description,/Bị từ chối thì cả batch chưa ghi/);
});
