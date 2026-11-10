import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {readCompactSections} from './owner-data-presentation.mjs';

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
  meaning:'Kết quả lần gọi này; chỉ dùng khi còn khớp hồ sơ và target hiện hành. Size thường mặc không cấp thêm alternative.'});
 for(const k of ['fitScope','recommendedSizes','inputFitPreference','alternativeSizes','sizeSourceHash','missingInputs'])assert(!Object.hasOwn(view,k));
 assert.deepEqual(r.contents,before);assert.deepEqual(r.context,trusted);
 if(!final)assert.deepEqual(wire.contents[2],before[1]);
 const nr=request('record_negotiation',{effectCommitted:false,negotiationStatus:'NOT_EVALUATED',supportAvailability:'UNKNOWN',missing:['CART','NEGOTIATION']},final);
 nr.contents.at(-1).parts[0].functionResponse.response.status='REJECTED';nr.contents.at(-1).parts[0].functionResponse.response.reason='NEGOTIATION_CONTEXT_REQUIRED';
 const n=result(buildGeminiCommerceRequest(nr),final);
 assert.equal(n.effectCommitted,false);assert.deepEqual(n.supportEvaluation,{status:'NOT_EVALUATED',supportAvailability:'UNKNOWN',missing:['CART','NEGOTIATION'],
  meaning:'Lần gọi này chưa xét được hỗ trợ; chưa có kết luận shop có hay không có ưu đãi.'});
 assert(!Object.hasOwn(n,'negotiationStatus'));assert(!Object.hasOwn(n,'supportAvailability'));assert(!Object.hasOwn(n,'missing'));
 assert(Buffer.byteLength(JSON.stringify(wire))<=65536);
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
 assert.equal(results[0].supportEvaluation.status,'NOT_EVALUATED');assert(!results[0].supportEvaluation.meaning.includes('hiện tại'));
 assert.equal(results[1].cartQuote.grandTotalVnd,499000);assert.equal(results[1].effectCommitted,true);
});
