import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactOwnerProducts,expandOwnerProducts,compactCurrentFacts,expandCurrentFacts} from './owner-product-tables.mjs';
const products=()=>['P1','P2'].map(subjectRef=>({subjectRef,availableOffers:['AO','SET'],attributes:null,content:{description:'Nguồn có\n\nđoạn văn.'},sizeCharts:[],
 purchaseOptions:['AO','SET'].map(offerType=>({offerType,priceRead:{subjectRef,offerType},stockRead:{subjectRef,offerType},componentSource:{status:'AVAILABLE',components:[{role:'TOP',componentRef:subjectRef+'-AO'}]},sizeApplicability:{status:'NOT_READ',chartRef:null},colorSemantics:'UNRECORDED_IS_NOT_A_PHYSICAL_COLOR'})),
 presentation:{variants:Array.from({length:8},(_,n)=>({variantId:`${subjectRef}-${n}`,color:n%2?'be':'__NO_COLOR__',size:String(n)}))},
 selectionEvidence:[{sourceHash:'a'.repeat(64),contentHash:'b'.repeat(64),options:Array.from({length:8},(_,n)=>({size:String(n),color:n%2?'be':'__NO_COLOR__',status:'IN_STOCK',reasonCode:null,identityHash:String(n).padStart(64,'0')}))}]}));

test('known product data tables round-trip all values, order and nested source identities',()=>{
 const input=products(),before=structuredClone(input),wire=compactOwnerProducts(input);
 assert(Buffer.byteLength(JSON.stringify(wire))<Buffer.byteLength(JSON.stringify(input)));
 assert.deepEqual(expandOwnerProducts(JSON.parse(JSON.stringify(wire))),input);assert.deepEqual(input,before);
 assert(JSON.stringify(wire).includes('identityHash'));assert(JSON.stringify(wire).includes('sourceHash'));
});

test('heterogeneous omitted fields are not conflated with null, false, zero or an empty array',()=>{
 const input=products();input[0].content.extra=null;input[0].purchaseOptions[0].extra=false;
 input[0].selectionEvidence[0].options[0].extra=0;delete input[0].selectionEvidence[0].options[1].reasonCode;
 assert.deepEqual(expandOwnerProducts(compactOwnerProducts(input)),input);
 const changed=products();changed[0].purchaseOptions[0].stockRead.offerType='OTHER';
 assert.deepEqual(expandOwnerProducts(compactOwnerProducts(changed)),changed);
});

test('invalid table markers, duplicate columns, wrong rows and mixed read targets fail explicitly',()=>{
 const table={format:'PRODUCT_ROWS_V1',defaults:{},columns:['subjectRef'],rows:[['P1'],['P2']]};
 for(const bad of [{...table,format:'OLD'},{...table,extra:[]},{...table,columns:['subjectRef','subjectRef']},{...table,defaults:{subjectRef:'x'}},{...table,rows:[[],['P2']]},{...table,rows:'bad'},{...table,columns:['__proto__']}])assert.throws(()=>expandOwnerProducts(bad),/PRODUCT_TABLE/);
 const p=[{subjectRef:'P1',purchaseOptions:[{offerType:'AO',priceRead:{subjectRef:'P1',offerType:'AO'},readTargetFromProductAndOffer:true}]}];
 assert.throws(()=>expandOwnerProducts(p),/PRODUCT_READ_TARGET/);
});

test('same-body fact references round-trip exact facts and retain historical differences',()=>{
 const facts=[{type:'PRICE',scope:{kind:'PRODUCT',productId:'P1',variantId:'offer:P1:AO'},value:{amountVnd:499000,currency:'VND'}}];
 const data={offerType:'AO',facts,availability:{price:{status:'OK',reason:null}}},wire=compactCurrentFacts(data,facts);
 assert.deepEqual(wire.factsFromTrustedIndices,[0]);assert.deepEqual(expandCurrentFacts(wire,facts),data);
 const changed=structuredClone(data);changed.facts[0].value.amountVnd=1;
 assert.deepEqual(compactCurrentFacts(changed,facts),changed);
 for(const bad of [{...wire,facts},{...wire,factsFromTrustedIndices:[1]},{...wire,factsFromTrustedIndices:[null]},{...wire,factsFromTrustedIndices:[]}])assert.throws(()=>expandCurrentFacts(bad,facts),/PRODUCT_FACT_REFERENCE/);
});
