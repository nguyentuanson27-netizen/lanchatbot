import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGeminiCommerceRequest,FIT_EVALUATION_MEANING} from './gemini-inference.mjs';
import {readCompactSections} from './owner-data-presentation.mjs';
import {buildVerifierRequest} from './protocol.mjs';
import {makeBinding} from '../../dist/single-agent-semantic-verifier-boundary.js';

const request=(name,data,final=false)=>({generationId:'meaning:1',instructions:'Tư vấn',ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2',
 context:{boundSubjects:[],protectedClaims:[],runtimeProducts:[],policyLiterals:[],effectReceipts:[],state:{revision:1}},
 contents:[{role:'user',parts:[{text:'Chị nhờ em chọn giúp.'}]},{role:'model',parts:[{functionCall:{name,args:{},id:'c1'},thoughtSignature:'signed-unchanged'}]},
 {role:'user',parts:[{functionResponse:{name,id:'c1',response:{status:'OK',data}}}]}],
 toolsAllowed:!final,toolBudget:{callsRemaining:final?0:2,roundsRemaining:final?0:1},availableTools:['read_policy'],signal:new AbortController().signal});
const result=(wire,final)=>final?readCompactSections(wire.contents[0]).find(s=>s.label==='Lịch sử công cụ đã hoàn tất').value[0].completedToolTurns.at(-1).parts[0].functionResponse.response.data:
 wire.contents.at(-1).parts[0].functionResponse.response.data;
for(const final of [false,true])test(`owner groups exact current fit and unknown negotiation in ${final?'final completed trace':'native continuation'} without changing raw or signed parts`,()=>{
 const data={status:'RECOMMENDED',action:'REPLY',fitScope:{kind:'COMPONENT',parentProductId:'P',componentProductId:'C',componentRole:'PANTS'},
  sizeSourceHash:'a'.repeat(64),missingInputs:[],recommendedSizes:[{componentProductId:'C',componentRole:'PANTS',size:'M'}],inputFitPreference:null,alternativeSizes:[]};
 const r=request('recommend_size',data,final),before=structuredClone(r.contents),trusted=structuredClone(r.context);
 const wire=buildGeminiCommerceRequest(r),view=result(wire,final);
 assert.deepEqual(view.fitEvaluation,{status:data.status,target:data.fitScope,sizeSourceHash:data.sizeSourceHash,missingInputs:[],recommendedSizes:data.recommendedSizes,inputFitPreference:null,alternativeSizes:[],
  meaning:FIT_EVALUATION_MEANING});
 for(const k of ['fitScope','recommendedSizes','inputFitPreference','alternativeSizes','sizeSourceHash','missingInputs'])assert(!Object.hasOwn(view,k));
 assert.deepEqual(r.contents,before);assert.deepEqual(r.context,trusted);
 if(!final)assert.deepEqual(wire.contents[2],before[1]);
 const nr=request('record_negotiation',{effectCommitted:false,negotiationStatus:'NOT_EVALUATED',supportAvailability:'UNKNOWN',missing:['CART','NEGOTIATION']},final);
 nr.contents.at(-1).parts[0].functionResponse.response.status='REJECTED';nr.contents.at(-1).parts[0].functionResponse.response.reason='NEGOTIATION_CONTEXT_REQUIRED';
 const n=result(buildGeminiCommerceRequest(nr),final);
 assert.equal(n.effectCommitted,false);assert.deepEqual(n.supportEvaluation,{status:'NOT_EVALUATED',supportAvailability:'UNKNOWN',missing:['CART','NEGOTIATION']});
 assert.equal(Object.keys(n)[0],'supportEvaluation');assert(!Object.hasOwn(n.supportEvaluation,'meaning'));
 assert(!Object.hasOwn(n,'negotiationStatus'));assert(!Object.hasOwn(n,'supportAvailability'));assert(!Object.hasOwn(n,'missing'));
 assert(Buffer.byteLength(JSON.stringify(wire))<=65536);
});
// PR 392 case J2: the size the owner asked for earlier in the turn, evaluated by code after the inputs were written.
for(const final of [false,true])test(`a customer-state write shows the size it unblocked in the same shape as a size call (${final?'final':'native'})`,()=>{
 const fit={status:'RECOMMENDED',action:'REPLY',fitScope:{kind:'COMPONENT',parentProductId:'P',componentProductId:'C',componentRole:'TOP'},sizeSourceHash:'a'.repeat(64),
  missingInputs:[],recommendedSizes:[{componentProductId:'C',componentRole:'TOP',size:'M'}],inputFitPreference:null,alternativeSizes:[],profileRevision:5,measurementFingerprint:'b'.repeat(64)};
 const data={revision:5,measurements:[{kind:'WEIGHT_KG',value:51}],sizeEvaluations:[
  {request:{subjectRef:'P',fitScope:'COMPONENT',componentRole:'TOP'},status:'OK',data:fit},
  {request:{subjectRef:'Q'},status:'UNAVAILABLE',reason:'SIZE_SOURCE_UNAVAILABLE'}]};
 const r=request('apply_customer_state',data,final),before=structuredClone(r.contents),view=result(buildGeminiCommerceRequest(r),final);
 assert.equal(view.sizeEvaluations.length,2);
 assert.deepEqual(view.sizeEvaluations[0],{request:data.sizeEvaluations[0].request,status:'OK',fitEvaluation:{status:'RECOMMENDED',target:fit.fitScope,sizeSourceHash:fit.sizeSourceHash,
  missingInputs:[],recommendedSizes:fit.recommendedSizes,inputFitPreference:null,alternativeSizes:[],profileRevision:5,measurementFingerprint:fit.measurementFingerprint,
  meaning:FIT_EVALUATION_MEANING}});
 // A request that produced no size says so and carries no size to state.
 assert.deepEqual(view.sizeEvaluations[1],{request:{subjectRef:'Q'},status:'UNAVAILABLE',reason:'SIZE_SOURCE_UNAVAILABLE'});
 assert.match(view.sizeEvaluationsMeaning,/Dùng đúng kết quả này; mục không có fitEvaluation thì chưa có kết quả size, không tự suy ra size\./u);
 assert.deepEqual(r.contents,before);
 const plain=result(buildGeminiCommerceRequest(request('apply_customer_state',{revision:5,measurements:[]},final)),final);
 assert(!Object.hasOwn(plain,'sizeEvaluations'));assert(!Object.hasOwn(plain,'sizeEvaluationsMeaning'));
});
// Owner decision 2026-11-13 (PR 392 case P07): the size a customer says they usually wear may be mentioned.
test('the usual-size rule reads the same in the size result, the owner prompt and the verifier prompt',()=>{
 const owner=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifier=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 // Mentioned after the recommended size, as the customer's habit.
 assert.match(FIT_EVALUATION_MEANING,/được nhắc như lựa chọn theo thói quen của khách sau size đề xuất/u);
 // The size call still comes first: a measured wording that dropped it made the owner skip recommend_size.
 assert.match(owner,/Khách nêu size quen mặc khi nhờ tư vấn: vẫn gọi recommend_size và báo size đề xuất theo kết quả; sau đó được nhắc size quen mặc như lựa chọn theo thói quen của khách/u);
 assert.match(verifier,/Shop được nhắc lại size khách tự nêu là quen mặc như một lựa chọn theo thói quen của khách khi draft vẫn nêu size theo SIZE_FIT là size shop đề xuất/u);
 // Never as a fit result or the shop's recommendation.
 assert.match(FIT_EVALUATION_MEANING,/không phải kết quả tính và không cấp thêm alternative.*không nói size ấy vừa/u);
 // The N=5 run of 13 November: four of five replies tied the usual size to wearing more comfortably.
 assert.match(owner,/không ghi nhận nó thành size đã chọn và không nói nó vừa, hợp hơn, rộng hay thoải mái hơn, hay là size shop đề xuất/u);
 assert.match(FIT_EVALUATION_MEANING,/không nói size ấy vừa, rộng hay thoải mái hơn/u);
 assert.match(verifier,/Draft khẳng định size quen mặc vừa, hợp hơn hoặc là size shop đề xuất thì vẫn cần SIZE_FIT/u);
 // The rules that keep a usual size from becoming an order or a second recommendation are unchanged.
 assert.match(verifier,/Size thường mặc không tự là lựa chọn mua/u);assert.match(owner,/Size thường mặc khi nhờ tư vấn chưa là yêu cầu mua size ấy/u);
});
test('current owner prompt uses only the active public read/quote contract',()=>{
 const prompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
 assert.doesNotMatch(prompt,/SINGLE|COMPARE|DETAILS_ONLY|mỗi quote hai đơn vị|Không quote trùng offer hay batch cùng mutation/);
 assert.match(prompt,/offerTypes/);assert.match(prompt,/declaration/);
});
for(const final of [false,true])test(`quote request target survives only when actually callable (${final?'final':'native'})`,()=>{
 const hint={tool:'quote_product',target:{subjectRef:'P',offerTypes:['AO']},quantity:'FROM_CUSTOMER_REQUEST',calculationStatus:'NOT_CALCULATED',sourcePriceStatus:'REQUIRES_QUOTE_READ',purchaseMissingField:'COLOR',evidenceHash:'e'.repeat(64)};
 const r=request('add_to_cart',{effectCommitted:false,preCartQuoteRequest:hint},false);
 r.availableTools=['quote_product'];r.toolWorkAccounting='PRIMITIVE_WORK_V2';
 r.contents.at(-1).parts[0].functionResponse.response.status='UNAVAILABLE';
 assert.deepEqual(result(buildGeminiCommerceRequest(r),false).preCartQuoteRequest,hint);
 r.toolsAllowed=!final;r.toolBudget={roundsRemaining:final?0:1,callsRemaining:final?0:0};
 const body=buildGeminiCommerceRequest(r);
 assert(!Object.hasOwn(result(body,final),'preCartQuoteRequest'));
 assert.deepEqual(r.contents.at(-1).parts[0].functionResponse.response.data.preCartQuoteRequest,hint);
});
test('missing fit inputs and explicit engine alternatives retain their distinct meanings',()=>{
 for(const [status,recommendedSizes,alternativeSizes,missingInputs,inputFitPreference] of [
  ['NEEDS_MEASUREMENTS',[],null,['WAIST_CM'],null],
  ['RECOMMENDED',[{componentProductId:'C',componentRole:'PANTS',size:'M'}],['L'],[],'RELAXED']]){
  const r=request('recommend_size',{status,fitScope:{kind:'COMPONENT',parentProductId:'P',componentProductId:'C',componentRole:'PANTS'},sizeSourceHash:'b'.repeat(64),recommendedSizes,alternativeSizes,missingInputs,inputFitPreference});
  const out=result(buildGeminiCommerceRequest(r),false).fitEvaluation;
  assert.deepEqual([out.recommendedSizes,out.alternativeSizes,out.missingInputs,out.inputFitPreference],[recommendedSizes,alternativeSizes,missingInputs,inputFitPreference]);
 }
 const r=request('record_negotiation',{effectCommitted:true,negotiationStatus:'EVALUATED',supportAvailability:'AVAILABLE',cartQuote:{grandTotalVnd:500000}});
 const out=result(buildGeminiCommerceRequest(r),false);
 assert(!Object.hasOwn(out,'supportEvaluation'));assert.equal(out.negotiationStatus,'EVALUATED');assert.equal(out.cartQuote.grandTotalVnd,500000);
});
for(const final of [false,true])test(`historical fit and negotiation results stay historical in ${final?'final':'native'} wires`,()=>{
 const old={status:'RECOMMENDED',fitScope:{kind:'COMPONENT',parentProductId:'P',componentProductId:'C',componentRole:'PANTS'},sizeSourceHash:'a'.repeat(64),missingInputs:[],recommendedSizes:[{componentProductId:'C',componentRole:'PANTS',size:'M'}],alternativeSizes:[],inputFitPreference:null,profileRevision:1,measurementFingerprint:'old'};
 const r=request('recommend_size',old,final),next={...structuredClone(old),sizeSourceHash:'b'.repeat(64),recommendedSizes:[{componentProductId:'C',componentRole:'PANTS',size:'L'}],inputFitPreference:'RELAXED',profileRevision:2,measurementFingerprint:'new'};
 r.contents.push({role:'model',parts:[{functionCall:{name:'recommend_size',args:{},id:'c2'},thoughtSignature:'signed-new'}]},
  {role:'user',parts:[{functionResponse:{name:'recommend_size',id:'c2',response:{status:'OK',data:next}}}]} );
 r.context.state.customerProfileRevision=2;r.context.state.sizeFitTargets={target:{sourceHash:next.sizeSourceHash}};
 const body=buildGeminiCommerceRequest(r),turns=final?readCompactSections(body.contents[0]).find(s=>s.label==='Lịch sử công cụ đã hoàn tất').value[0].completedToolTurns:body.contents;
 const evaluations=turns.flatMap(m=>m.parts.flatMap(p=>p.functionResponse?.response.data.fitEvaluation?[p.functionResponse.response.data.fitEvaluation]:[]));
 assert.equal(evaluations.length,2);assert.deepEqual(evaluations.map(e=>[e.recommendedSizes[0].size,e.profileRevision,e.measurementFingerprint]),[['M',1,'old'],['L',2,'new']]);
 assert(!JSON.stringify(evaluations).includes('currentFit'));assert(!JSON.stringify(evaluations).includes('hồ sơ hiện tại'));
 const nr=request('record_negotiation',{effectCommitted:false,negotiationStatus:'NOT_EVALUATED',supportAvailability:'UNKNOWN',missing:['CART']},final);
 const oldResponse=nr.contents.at(-1).parts[0].functionResponse.response;oldResponse.status='REJECTED';oldResponse.reason='NEGOTIATION_CONTEXT_REQUIRED';
 nr.contents.push({role:'model',parts:[{functionCall:{name:'record_negotiation',args:{},id:'c2'}}]},
  {role:'user',parts:[{functionResponse:{name:'record_negotiation',response:{status:'OK',data:{effectCommitted:true,cartQuote:{grandTotalVnd:499000}}},id:'c2'}}]});
 nr.context.state.cartQuote={grandTotalVnd:499000};
 const nbody=buildGeminiCommerceRequest(nr),nturns=final?readCompactSections(nbody.contents[0]).find(s=>s.label==='Lịch sử công cụ đã hoàn tất').value[0].completedToolTurns:nbody.contents;
 const results=nturns.flatMap(m=>m.parts.flatMap(p=>p.functionResponse?[p.functionResponse.response.data]:[]));
 assert.deepEqual(results[0].supportEvaluation,{status:'NOT_EVALUATED',supportAvailability:'UNKNOWN',missing:['CART']});
 assert(!Object.hasOwn(results[0],'cartQuote'));
 assert.equal(results[1].cartQuote.grandTotalVnd,499000);assert.equal(results[1].effectCommitted,true);
});
for(const final of [false,true])test(`a quote without a cart carries the same support statement as a refused record (${final?'final':'native'})`,()=>{
 const r=request('quote_product',{subjectRef:'P',calculationBasis:'PRE_CART_POLICY',appliesNegotiationReceipt:false,quoteTaskStatus:'PREPARED_PENDING_FINAL_GATE',
  preCartQuote:{negotiationAssessment:'NOT_EVALUATED',grandTotalVnd:529000}},final);
 r.availableTools=['quote_product'];r.toolWorkAccounting='PRIMITIVE_WORK_V2';
 const before=structuredClone(r.contents),view=result(buildGeminiCommerceRequest(r),final);
 assert.deepEqual(view.supportEvaluation,{status:'NOT_EVALUATED',supportAvailability:'UNKNOWN',missing:['CART']});
 assert.equal(view.preCartQuote.grandTotalVnd,529000);assert.equal(view.preCartQuote.negotiationAssessment,'NOT_EVALUATED');
 assert.deepEqual(r.contents,before);
 const withCart=request('quote_product',{subjectRef:'P',calculationBasis:'CART',appliesNegotiationReceipt:true},final);
 withCart.availableTools=['quote_product'];withCart.toolWorkAccounting='PRIMITIVE_WORK_V2';
 assert(!Object.hasOwn(result(buildGeminiCommerceRequest(withCart),final),'supportEvaluation'));
});


test('owner wire carries the code-evaluated support result and the shared pending evaluation step',()=>{
 const evaluation={by:'CODE',when:'MATCHING_CART_OPENS',waitingFor:['COLOR'],meaning:'Lời xin hỗ trợ giá cho món này đã lưu, chưa xét.'};
 const r=request('add_to_cart',{operationId:'op',effect:'CART_OPENED',cartItems:[],cartQuote:{grandTotalVnd:948100},
  supportEvaluation:{status:'EVALUATED',evaluatedBy:'CODE_AT_CART_OPENING',negotiationApplied:true,grandTotalBeforeVnd:978100,grandTotalAfterVnd:948100}});
 r.availableTools=['read_policy','add_to_cart'];
 r.context.state.pendingSupport={pendingRef:'a'.repeat(64),subjectRef:'P',offerType:'AO',status:'NOT_EVALUATED',canApply:false,evaluation};
 const wire=buildGeminiCommerceRequest(r),view=result(wire,false);
 assert.equal(view.supportEvaluation.status,'EVALUATED');assert(!Object.hasOwn(view.supportEvaluation,'meaning'));
 assert.equal(view.supportEvaluation.grandTotalAfterVnd,948100);
 // The same code-owned step the verifier reads in trusted state is in the owner's frame, with no cart to create named.
 const frame=wire.contents[0].parts[0].text;
 assert.match(frame,/MATCHING_CART_OPENS/u);assert.match(frame,/COLOR/u);assert(!frame.includes(evaluation.meaning));
 assert.doesNotMatch(frame,/CART_REQUIRED|blockedReason/u);
});
for (const final of [false,true]) for(const current of ['legacy','settled']) test('support owner projection retains facts without process prose ('+(final?'final':'native')+', '+current+')',()=>{
 const legacy={pendingRef:'a'.repeat(64),subjectRef:'P',offerType:'AO',status:'NOT_EVALUATED',canApply:false,
  evaluation:{by:'CODE',when:'MATCHING_CART_OPENS',waitingFor:['CUSTOMER_PURCHASE_CHOICE'],meaning:'SUPPORT_PROCESS_CANARY'}};
 const adjustment={kind:'FREE_SHIPPING',amountVnd:30000,decisionId:'policy-decision'};
 const r=request('record_negotiation',{operationId:'record-op',effect:'NEGOTIATION_REQUEST_RECORDED',pendingSupport:legacy,
  supportEvaluation:{status:'NOT_EVALUATED',pendingCommitted:true,negotiationApplied:false,meaning:'RECORD_PROCESS_CANARY'}},final);
 if(current==='legacy')r.context.state.pendingSupport=structuredClone(legacy);
 r.contents.splice(0,0,{role:'model',parts:[{text:'ACCEPTED_HISTORY_CANARY'}]});
 r.contents.push(
  {role:'model',parts:[{functionCall:{name:'quote_product',args:{subjectRef:'P',offerTypes:['AO']},id:'quote-call'},thoughtSignature:'quote-signature'}]},
  {role:'user',parts:[{functionResponse:{name:'quote_product',id:'quote-call',response:{status:'OK',data:{
   calculationBasis:'PRE_CART_POLICY',appliesNegotiationReceipt:false,
   preCartQuote:{negotiationAssessment:'NOT_EVALUATED',grandTotalVnd:978100}}}}}]},
  {role:'model',parts:[{functionCall:{name:'add_to_cart',args:{subjectRef:'P',offerType:'AO',color:'white',size:'M',quantity:2},id:'add-call'},thoughtSignature:'add-signature'}]},
  {role:'user',parts:[{functionResponse:{name:'add_to_cart',id:'add-call',response:{status:'OK',data:{
   operationId:'cart-op',effect:'CART_OPENED',cartItems:[{productRef:'P',quantity:2}],
   cartQuote:{cartId:'cart',cartVersion:2,grandTotalVnd:948100,appliedAdjustments:[adjustment]},
   supportEvaluation:{status:'EVALUATED',evaluatedBy:'CODE_AT_CART_OPENING',negotiationApplied:true,
    supportOperationId:'support-op',grandTotalBeforeVnd:978100,grandTotalAfterVnd:948100,meaning:'ADD_PROCESS_CANARY'}}}}}]});
 r.context.state.cartQuote={cartId:'cart',cartVersion:2,grandTotalVnd:948100};
 if(current==='settled')r.contents.push(
  {role:'model',parts:[{functionCall:{name:'quote_product',args:{subjectRef:'P',offerTypes:['AO']},id:'cart-quote-call'},thoughtSignature:'cart-quote-signature'}]},
  {role:'user',parts:[{functionResponse:{name:'quote_product',id:'cart-quote-call',response:{status:'OK',data:{
   calculationBasis:'CART',appliesNegotiationReceipt:true,cartQuote:{grandTotalVnd:948100}}}}}]});
 const raw={...structuredClone(r),signal:r.signal},wire=buildGeminiCommerceRequest(r);
 const sections=readCompactSections(wire.contents[0]),state=sections.find(s=>s.label==='Hồ sơ và trạng thái hiện tại').value;
 const expectedEvaluation={by:'CODE',when:'MATCHING_CART_OPENS',waitingFor:[],waitingForStatus:'UNKNOWN'};
 if(current==='legacy')assert.deepEqual(state.pendingSupport.evaluation,expectedEvaluation);
 else {assert(!Object.hasOwn(state,'pendingSupport'));assert.equal(state.cartQuote.grandTotalVnd,948100);}
 const turns=final?sections.find(s=>s.label==='Lịch sử công cụ đã hoàn tất').value[0].completedToolTurns:wire.contents;
 const responses=turns.flatMap(m=>m.parts.flatMap(p=>p.functionResponse?[p.functionResponse]:[]));
 assert.deepEqual(responses.map(x=>x.id),['c1','quote-call','add-call',...(current==='settled'?['cart-quote-call']:[])]);
 assert.deepEqual(responses[0].response.data.pendingSupport.evaluation,expectedEvaluation);
 assert.equal(responses[0].response.data.supportEvaluation.status,'NOT_EVALUATED');
 assert.equal(responses[0].response.data.operationId,'record-op');
 assert.equal(responses[1].response.data.preCartQuote.grandTotalVnd,978100);
 assert.equal(responses[1].response.data.supportEvaluation.status,'NOT_EVALUATED');
 assert.deepEqual(responses[2].response.data.cartQuote.appliedAdjustments,[adjustment]);
 assert.equal(responses[2].response.data.supportEvaluation.supportOperationId,'support-op');
 assert.equal(responses[2].response.data.supportEvaluation.grandTotalAfterVnd,948100);
 for(const x of responses)if(x.response.data.supportEvaluation)assert(!Object.hasOwn(x.response.data.supportEvaluation,'meaning'));
 if(current==='settled'){
  assert.equal(responses[3].response.data.cartQuote.grandTotalVnd,948100);
  assert(!Object.hasOwn(responses[3].response.data,'supportEvaluation'));
 }
 assert(!JSON.stringify(wire).includes('SUPPORT_PROCESS_CANARY'));
 assert(!JSON.stringify(wire).includes('RECORD_PROCESS_CANARY'));
 assert(!JSON.stringify(wire).includes('ADD_PROCESS_CANARY'));
 assert(JSON.stringify(wire).includes('ACCEPTED_HISTORY_CANARY'));
 if(!final)assert.deepEqual(wire.contents.filter(m=>m.parts.some(p=>p.functionCall)),raw.contents.filter(m=>m.parts.some(p=>p.functionCall)));
 assert.deepEqual(r,raw);
 const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
 const verifier=buildVerifierRequest(manifest,{instructions:'Verify',finalDraft:'Dạ chị.',trusted:r.context,
  binding:makeBinding('wire-check','Dạ chị.',r.context),latest:'Chị lấy hai áo.',history:[]});
 const verifiedFrame=JSON.parse(verifier.input[0].content[0].text);
 assert.deepEqual(verifiedFrame.trusted,r.context);
 if(current==='legacy')assert.equal(verifiedFrame.trusted.state.pendingSupport.evaluation.meaning,'SUPPORT_PROCESS_CANARY');
});
