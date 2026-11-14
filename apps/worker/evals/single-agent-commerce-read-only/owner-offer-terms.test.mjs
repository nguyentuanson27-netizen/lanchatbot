import test from 'node:test';
import assert from 'node:assert/strict';
import {readCompactSections} from './owner-data-presentation.mjs';
import {presentVerifiedOfferTerms} from './owner-offer-terms.mjs';

const now='2026-11-13T09:40:00.000Z';
const provenance={authority:'POS_SNAPSHOT',observedAt:'2026-11-13T09:00:00.000Z',expiresAt:'2026-11-13T11:00:00.000Z'};
const scope=(productId,variantId)=>({kind:'PRODUCT',productId,variantId});
const price=(scope,amountVnd,overrides={})=>({type:'PRICE',scope,value:{amountVnd,currency:'VND'},provenance:{...provenance,...overrides}});
const stock=(scope,status,overrides={})=>({type:'STOCK',scope,value:{status,availableQuantity:status==='IN_STOCK'?3:0},provenance:{...provenance,...overrides}});
const a=scope('P1','offer:P1:DIRECT'), b=scope('P2','offer:P2:DIRECT');
const subjects=[{kind:'PRODUCT',subjectRef:'P1',label:'Váy Một'},{kind:'PRODUCT',subjectRef:'P2',label:'Váy Hai'},
 {kind:'VARIANT',productId:'P1',evidenceRef:a.variantId,label:'Váy Một DIRECT'},{kind:'VARIANT',productId:'P2',evidenceRef:b.variantId,label:'Váy Hai DIRECT'}];
function wire(claims,bound=subjects,policies=[]){
 const facts=claims.map(({type,scope,value})=>({type,scope,value}));
 const header=[['Thời điểm xử lý',{processingAt:now}],['Giá, tồn và kết quả đã xác minh',facts],['Sản phẩm',[]],['Đối tượng đã gắn',bound],['Quy định và dữ liệu nguồn',policies]];
 return {systemInstruction:{parts:[{text:'Tư vấn'}]},contents:[
  {role:'user',parts:[{text:header.map(([k,v])=>k+'\n'+JSON.stringify(v)).join('\n\n')}]},
  {role:'user',parts:[{text:'Chọn giúp chị một mẫu đi lễ.'}]},
  {role:'model',parts:[{functionCall:{name:'read_product',args:{subjectRef:'P1'}},thoughtSignature:'untouched'}]},
  {role:'user',parts:[{functionResponse:{name:'read_product',response:{status:'OK'}}}]}],
  toolConfig:{functionCallingConfig:{mode:'AUTO'}},tools:[]};
}
const found=wire=>readCompactSections(wire.contents[0],{expandProducts:false}).find(s=>s.label==='Giá và tình trạng bán theo đúng lựa chọn')?.value;
test('fresh exact offer claims group names, price, and availability without changing native continuation',()=>{
 const claims=[price(a,699000),stock(a,'PRE_ORDER'),stock(b,'IN_STOCK'),price(b,799000)],source=wire(claims),copy=structuredClone(source);
 const result=presentVerifiedOfferTerms(source,claims);
 assert.deepEqual(found(result),[
  {productId:'P1',variantId:a.variantId,productName:'Váy Một',offerType:'DIRECT',amountVnd:699000,stockStatus:'PRE_ORDER'},
  {productId:'P2',variantId:b.variantId,productName:'Váy Hai',offerType:'DIRECT',amountVnd:799000,stockStatus:'IN_STOCK'},
 ]);
 assert.deepEqual(result.contents.slice(1),source.contents.slice(1));
 assert.deepEqual(result.toolConfig,source.toolConfig);
 assert.deepEqual(source,copy);
 assert.deepEqual(readCompactSections(result.contents[0],{expandProducts:false}).filter(s=>s.label!=='Giá và tình trạng bán theo đúng lựa chọn'),readCompactSections(source.contents[0],{expandProducts:false}));
});
test('no summary joins a different variant, a conflicted state, expired proof or a fact not visible to the owner',()=>{
 for(const claims of [[price(a,699000),stock(b,'PRE_ORDER')],[price(a,699000),stock(a,'PRE_ORDER'),stock(a,'IN_STOCK')],
  [price(a,699000),stock(a,'PRE_ORDER',{expiresAt:now})],[price(a,699000),stock(a,'PRE_ORDER',{observedAt:'2026-11-13T10:00:00.000Z'})]]){
  const source=wire(claims);assert.equal(presentVerifiedOfferTerms(source,claims),source);
 }
 const source=wire([price(a,699000)]);assert.equal(presentVerifiedOfferTerms(source,[price(a,699000),stock(a,'PRE_ORDER')]),source);
});
test('per-color and size filters stay attached to their exact price and status',()=>{
 const be=scope('P1','P1-BE-M'), white=scope('P1','P1-TRANG-M');
 const claims=[price(be,699000),stock(be,'PRE_ORDER'),price(white,710000),stock(white,'IN_STOCK')].map((c,i)=>({...c,claimId:'claim-'+i}));
 const filters=[be,white].map(({productId,variantId},i)=>({productId,variantId,offerType:'DIRECT',size:'M',color:i?'trắng':'be',priceClaimId:claims[i*2].claimId,stockClaimId:claims[i*2+1].claimId}));
 const bound=[subjects[0],...filters.map(f=>({kind:'VARIANT',productId:f.productId,evidenceRef:f.variantId}))];
 const view=presentVerifiedOfferTerms(wire(claims,bound,[{ref:'read:1',text:JSON.stringify({sellingOptions:filters})}]),claims);
 assert.deepEqual(found(view).map(x=>[x.variantId,x.size,x.color,x.amountVnd,x.stockStatus]),[
  ['P1-BE-M','M','be',699000,'PRE_ORDER'],['P1-TRANG-M','M','trắng',710000,'IN_STOCK']
 ]);
 assert.equal(found(presentVerifiedOfferTerms(wire(claims,bound),claims)),undefined);
 filters[0].stockClaimId=filters[1].stockClaimId;
 const mismatched=presentVerifiedOfferTerms(wire(claims,bound,[{ref:'read:1',text:JSON.stringify({sellingOptions:filters})}]),claims);
 assert.deepEqual(found(mismatched).map(x=>x.variantId),[white.variantId]);
});
