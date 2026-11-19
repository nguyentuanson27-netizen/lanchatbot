import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildVerifiedFactBlocks} from '@lana/business-tools';
import {commerceHash} from '../../dist/single-agent-commerce-read-only-context.js';
import {selectionEvidenceHash} from '../../dist/single-agent-commerce-selection-evidence.js';
import {buildGeminiCommerceRequest,OWNER_REQUEST_MAX_BYTES,ownerTextBytes} from './gemini-inference.mjs';
import {projectOwnerReplyEvidence} from './owner-reply-evidence.mjs';

const now=new Date('2026-11-19T04:30:00Z'),observedAt='2026-11-19T04:00:00Z',expiresAt='2026-11-19T06:00:00Z';
const bind={bindingVersion:'binding-1',recipient:'recipient-1',cartItems:[]};
const price={type:'PRICE',scope:{kind:'PRODUCT',productId:'SD023',variantId:'offer:SD023:COMPOSITE'},
 value:{currency:'VND',amountVnd:989000}};
const sizes=['S','M','L'];
const priceCard=(materials=[])=>buildVerifiedFactBlocks({status:'OK',productId:'SD023',
 facts:{productId:'SD023',salePriceVnd:989000,listPriceVnd:null,sizes}},'PRICE',
 {productId:'SD023',title:'SD023',materials,silhouettes:[]}).blocks[0].text;
function tool(name,args,data,{id='call-1',status='OK'}={}){
 return [{role:'model',parts:[{functionCall:{name,args,...(id?{id}:{})},thoughtSignature:'signed-by-model'}]},
  {role:'user',parts:[{functionResponse:{name,response:{status,data},...(id?{id}:{})}}]}];
}
const dataOf=messages=>messages[1].parts[0].functionResponse.response.data;

function quote(overrides={},state=bind){
 const q={kind:'PRE_CART_TOTAL_V1',calculationBasis:'PRE_CART_POLICY',subjectRef:'SD023',offerType:'COMPOSITE',quantity:1,
  deliveryRegion:null,subtotalVnd:989000,shippingFeeVnd:30000,discountTotalVnd:0,grandTotalVnd:1019000,
  appliesNegotiationReceipt:false,negotiationAssessment:'NOT_EVALUATED',
  benefitAuthorization:{scope:'ADDITIONAL_SUPPORT_IN_THIS_PRE_CART_QUOTE',status:'NOT_GRANTED',grantedBenefits:[],receiptRef:null},
  priceHash:commerceHash(price),policyHash:'1'.repeat(64),cartStateHash:commerceHash({binding:null,items:[]}),
  bindingVersion:state.bindingVersion,recipient:state.recipient,...overrides};
 const hash=commerceHash(q),literal={ref:'pre-cart-quote:'+hash,text:JSON.stringify(q),sourceVersion:hash,observedAt,expiresAt};
 const data={subjectRef:'SD023',label:'SD023',openingQuote:{subjectRef:'SD023',offerType:'COMPOSITE',text:priceCard()},
  sellingOptions:[{offerType:'COMPOSITE',variantId:price.scope.variantId,availability:{price:{status:'OK'}},
   sizeAvailability:{productId:'SD023',offerType:'COMPOSITE',color:null,confirmedInStockSizes:sizes},facts:[price]}],
  preCartQuote:q};
 return {q,data,context:{state,policyLiterals:[literal],protectedClaims:[price],boundSubjects:[{ref:'SD023',kind:'PRODUCT',label:'SD023'}]},
  messages:tool('quote_product',{subjectRef:'SD023',offerTypes:['COMPOSITE'],quantity:1},data)};
}

test('places the proved total first and removes only the exact duplicate opening price card',()=>{
 const f=quote(),original=structuredClone(f.messages),snapshot=structuredClone(f.context);
 const candidate=projectOwnerReplyEvidence(f.messages,f.context,now),p=dataOf(candidate);
 assert.equal(Object.keys(p)[0],'preCartQuote');
 assert.deepEqual(Object.keys(p.preCartQuote).slice(0,4),['grandTotalVnd','currency','shippingBasis','shippingFeeVnd']);
 assert.equal(p.preCartQuote.shippingBasis,'DEFAULT_SHOP_POLICY');
 assert.equal(p.preCartQuote.grandTotalVnd,1019000);
 assert.equal(p.preCartQuote.benefitAuthorization.status,'NOT_GRANTED');
 assert.equal(p.openingQuote,undefined);
 assert.deepEqual(p.sellingOptions,original[1].parts[0].functionResponse.response.data.sellingOptions);
 assert.deepEqual(candidate[0],f.messages[0]);
 assert.deepEqual(f.messages,original);
 assert.deepEqual(f.context,snapshot);
});

test('retains opening facts when the form has additional proof or a separate offer',()=>{
 for(const edit of [d=>{d.openingQuote.text=priceCard(['Tơ']);},d=>{d.openingQuote.offerType='AO';}]){
  const f=quote();edit(f.data);
  const p=dataOf(projectOwnerReplyEvidence(f.messages,f.context,now));
  assert.equal(Object.keys(p)[0],'preCartQuote');
  assert.deepEqual(p.openingQuote,f.data.openingQuote);
 }
});

test('leaves the wire unchanged for stale, inconsistent or differently scoped receipts and calls',()=>{
 const mutations=[
  f=>{f.context.policyLiterals[0].expiresAt=now.toISOString();},
  f=>{f.context.policyLiterals[0].sourceVersion='0'.repeat(64);},
  f=>{f.context.state={...bind,recipient:'changed'};},
  f=>{f.context.state={...bind,bindingVersion:'changed'};},
  f=>{f.context.state={...bind,cartItems:[{offerType:'COMPOSITE'}]};},
  f=>{f.context.cartBinding={revision:8};},
  f=>{f.messages[0].parts[0].functionCall.args.quantity=2;},
  f=>{f.messages[0].parts[0].functionCall.args.deliveryRegion='OTHER';},
  f=>{f.messages[0].parts[0].functionCall.args.offerTypes=['AO'];},
  f=>{f.messages[1].parts[0].functionResponse.id='unexpected';},
  f=>{f.data.preCartQuote.grandTotalVnd=900000;},
 ];
 for(const mutate of mutations){const f=quote();mutate(f);assert.strictEqual(projectOwnerReplyEvidence(f.messages,f.context,now),f.messages);}
});

function stock(overrides={},id='call-1'){
 const options=[['TRẮNG','S','IN_STOCK'],['TRẮNG','M','IN_STOCK'],['BE','S','PRE_ORDER'],['BE','M','PRE_ORDER']]
  .map(([color,size,status],i)=>({color,size,status,reasonCode:null,identityHash:String(i).repeat(64)}));
 const {refMode,...scope}=overrides;
 const raw={kind:'CANDIDATE_SELECTION_V3',productId:'SQ2447',offerType:'AO',color:null,size:null,quantity:1,sourceVersion:'POS-1',
  sourceHash:'5'.repeat(64),observedAt,expiresAt,options,completeness:'ALL_EXACT_TUPLES_FOR_QUERY',allSourceValuesForQuery:null,
  colorSemantics:'UNRECORDED_IS_NOT_A_PHYSICAL_COLOR',...scope};
 const evidence={...raw,contentHash:selectionEvidenceHash(raw)};
 const sourceOption={offerType:'AO',sourceVersion:'POS-1',observedAt:raw.observedAt,expiresAt:raw.expiresAt,availability:{stock:{status:'OK'}},
  sizeAvailability:{productId:'SQ2447',offerType:'AO',color:null,requestedSize:null}};
 const data={subjectRef:'SQ2447',sellingOptions:[sourceOption],defaultFromOption:0,
  openingQuote:{subjectRef:'SQ2447',offerType:'AO',text:'Thẻ giá gốc'}};
 if(refMode)data.selectionEvidenceFromProduct={subjectRef:'SQ2447',contentHash:evidence.contentHash};
 return {evidence,data,context:{state:bind,policyLiterals:[],runtimeProducts:[{subjectRef:'SQ2447',selectionEvidence:[evidence]}]},
  messages:tool('read_product',{subjectRef:'SQ2447',offerTypes:['AO']},data,{id})};
}

test('sets sale terms by colour from complete matching evidence, keeping the price card',()=>{
 for(const [refMode,id] of [[true,'call-1'],[false,undefined],[false,'call-1']]){
  const f=stock({refMode},id===undefined?null:id);
  const next=projectOwnerReplyEvidence(f.messages,f.context,now);
  const p=dataOf(next);
  assert.equal(Object.keys(p)[0],'verifiedColorAvailability');
  assert.deepEqual(p.verifiedColorAvailability,{subjectRef:'SQ2447',offerType:'AO',query:{color:null,size:null,quantity:1},
   colors:[{color:'TRẮNG',status:'IN_STOCK',sizes:['S','M']},{color:'BE',status:'PRE_ORDER',sizes:['S','M']}]});
  assert.deepEqual(p.openingQuote,f.data.openingQuote);
  assert.deepEqual(next[0],f.messages[0]);
 }
});

test('preserves scoped sizes for mixed colours and skips incomplete, stale, foreign or uncertain evidence',()=>{
 const fixture=stock();
 const options=structuredClone(fixture.evidence.options);options[1].status='PRE_ORDER';
 const f=stock({options});
 const colors=dataOf(projectOwnerReplyEvidence(f.messages,f.context,now)).verifiedColorAvailability.colors;
 assert.deepEqual(colors[0],{color:'TRẮNG',bySize:[{size:'S',status:'IN_STOCK'},{size:'M',status:'PRE_ORDER'}]});
 const cases=[
  stock({quantity:2}),stock({size:'S',options:options.filter(x=>x.size==='S')}),
  stock({offerType:'SET_VAY'}),stock({expiresAt:now.toISOString()}),
  stock({options:options.map((o,i)=>i===0?{...o,color:'__NO_COLOR__'}:o)}),
  stock({options:options.map((o,i)=>i===0?{...o,status:'UNKNOWN'}:o)}),
  stock({completeness:'FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY'}),
 ];
 for(const x of cases)assert.strictEqual(projectOwnerReplyEvidence(x.messages,x.context,now),x.messages);
 fixture.context.runtimeProducts[0].subjectRef='SV2447';
 assert.strictEqual(projectOwnerReplyEvidence(fixture.messages,fixture.context,now),fixture.messages);
});

test('matches a supported quote after the owner projection moves the support block alongside it',()=>{
 const supportEvaluation={status:'QUOTED',pendingRef:'pending',negotiationApplied:false,additionalDiscountVnd:30000};
 const f=quote({negotiationAssessment:'QUOTED',supportEvaluation,discountTotalVnd:30000,grandTotalVnd:989000,
  deliveryRegion:'Cần Thơ'});
 f.messages[0].parts[0].functionCall.args.deliveryRegion='Cần Thơ';
 f.data.supportEvaluation=supportEvaluation;
 f.data.preCartQuote={...f.q};delete f.data.preCartQuote.supportEvaluation;
 const result=dataOf(projectOwnerReplyEvidence(f.messages,f.context,now));
 assert.equal(result.preCartQuote.grandTotalVnd,989000);
 assert.equal(result.preCartQuote.shippingBasis,'DEFAULT_SHOP_POLICY');
 assert.equal(result.preCartQuote.benefitAuthorization.status,'NOT_GRANTED');
 assert.equal(result.preCartQuote.supportEvaluation,undefined);
 assert.deepEqual(result.supportEvaluation,supportEvaluation);
 f.data.supportEvaluation={...supportEvaluation,pendingRef:'other'};
 assert.strictEqual(projectOwnerReplyEvidence(f.messages,f.context,now),f.messages);
});

function liveWireRequest(){
 const f=stock({observedAt:new Date(Date.now()-5000).toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()});
 const context={...f.context,protectedClaims:[],effectReceipts:[],
  boundSubjects:[{ref:'SQ2447',kind:'PRODUCT',label:'Áo lẻ',bindingVersion:'binding-1'}]};
 return {generationId:'fixture-owner',instructions:'Tư vấn từ nguồn.',context,contents:f.messages,
  availableTools:['read_product','request_handoff'],ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2',
  toolsAllowed:true,validateNativeToolCalls:true,toolBudget:{roundsRemaining:1,callsRemaining:4},signal:new AbortController().signal};
}

test('the owner builder projects the same terms in native, handoff-or-reply and final trace envelopes',()=>{
 const req=liveWireRequest(),signed=structuredClone(req.contents[0]);
 for(const [toolsAllowed,callableTools] of [[true,undefined],[false,['request_handoff']],[false,[]]]){
  const wire=buildGeminiCommerceRequest({...req,toolsAllowed,callableTools,terminalHandoffAllowed:callableTools?.includes('request_handoff')===true});
  const flat=wire.contents.slice(1).flatMap(m=>m.parts);
  const packed=wire.contents[0].parts.flatMap(p=>p.text?.includes('Lịch sử công cụ đã hoàn tất')?[p.text]:[]);
  const rendered=JSON.stringify([...flat,...packed]);
  assert(rendered.includes('verifiedColorAvailability'));
  assert(rendered.includes('PRE_ORDER'));
  assert(rendered.includes('Thẻ giá gốc'));
  assert.equal(wire.toolConfig.functionCallingConfig.mode,toolsAllowed||callableTools.length?'VALIDATED':'NONE');
  if(toolsAllowed)assert.deepEqual(wire.contents[1],signed);
 }
 assert.deepEqual(req.contents[0],signed);
 assert(!Object.hasOwn(dataOf(req.contents),'verifiedColorAvailability'));
});

test('skips an optional projection when the original owner wire is already at its bound',()=>{
 const req=liveWireRequest(),unmatched=structuredClone(req.contents);
 unmatched[1].parts[0].functionResponse.id='call-2';
 let budget;
 buildGeminiCommerceRequest({...req,contents:unmatched},undefined,undefined,x=>{budget=x;});
 req.instructions+='x'.repeat(OWNER_REQUEST_MAX_BYTES-Math.max(budget.textFrameBytes,budget.presentedTextFrameBytes));
 const wire=buildGeminiCommerceRequest(req);
 assert(ownerTextBytes(wire)<=OWNER_REQUEST_MAX_BYTES);
 assert(!Object.hasOwn(wire.contents.at(-1).parts[0].functionResponse.response.data,'verifiedColorAvailability'));
 assert.equal(wire.contents.at(-1).parts[0].functionResponse.id,'call-1');
});
