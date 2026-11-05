import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactSelectionResult,expandSelectionResult,compactOwnerProducts,expandOwnerProducts} from './owner-product-tables.mjs';
import {selectionEvidenceHash,expandSelectionOptions} from '../../dist/single-agent-commerce-selection-evidence.js';
const fixture=()=>{
 const body={kind:'CANDIDATE_SELECTION_V2',productId:'P1',offerType:'AO',size:'M',color:null,quantity:1,sourceVersion:'s',sourceHash:'a'.repeat(64),observedAt:'2026-11-05T00:00:00.000Z',expiresAt:'2026-11-05T02:00:00.000Z',completeness:'FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY',colorSemantics:'UNRECORDED_IS_NOT_A_PHYSICAL_COLOR',options:[{size:'M',color:'WHITE',status:'IN_STOCK',reasonCode:null,identityHash:'b'.repeat(64)},{size:'M',color:'BE',status:'PRE_ORDER',reasonCode:null,identityHash:'c'.repeat(64)}]};
 const e={...body,contentHash:selectionEvidenceHash(body)},products=[{subjectRef:'P1',selectionEvidence:[e]}];
 const data={status:'COLOR_REQUIRED',reasonCode:'CART_COLOR_REQUIRED',selectionEvidence:e,selectionOptions:expandSelectionOptions(e),choiceResolution:{kind:'NEEDS_CUSTOMER_CHOICE',field:'COLOR',evidenceHash:e.contentHash,optionRefs:e.options.map(o=>o.identityHash)}};
 return {data,products};
};
test('same-body exact selection result references preserve the full query and options',()=>{
 const {data,products}=fixture(),before=structuredClone(data),packed=compactSelectionResult(data,products);
 assert(!Object.hasOwn(packed,'selectionEvidence'));assert(!Object.hasOwn(packed,'selectionOptions'));
 assert.equal(packed.selectionEvidenceFromProduct.contentHash,data.selectionEvidence.contentHash);
 assert.deepEqual(expandSelectionResult(packed,expandOwnerProducts(compactOwnerProducts(products))),data);assert.deepEqual(data,before);
 assert(Buffer.byteLength(JSON.stringify(packed))<Buffer.byteLength(JSON.stringify(data)));
});
test('different historical/source/query evidence remains local; references cannot dangle or forge a hash',()=>{
 const {data,products}=fixture(),other=structuredClone(data);other.selectionEvidence.sourceVersion='old';
 assert.deepEqual(compactSelectionResult(other,products),other);
 const packed=compactSelectionResult(data,products);
 for(const mutate of [v=>v.selectionEvidenceFromProduct.contentHash='d'.repeat(64),v=>v.selectionEvidenceFromProduct.subjectRef='OTHER',v=>v.selectionOptions=[]]){
  const bad=structuredClone(packed);mutate(bad);assert.throws(()=>expandSelectionResult(bad,products));
 }
 assert.throws(()=>expandSelectionResult(packed,[]));
});
test('quantity-bearing logical components preserve multiplicity across owner product packing',()=>{
 const component={componentRef:'A',role:'TOP',quantity:2};
 const products=['P1','P2'].map(subjectRef=>({subjectRef,purchaseOptions:[{offerType:'SET',componentSource:{status:'AVAILABLE',completeness:'INSPECTED_ROWS',components:[component]}}]}));
 assert.deepEqual(expandOwnerProducts(compactOwnerProducts(products)),products);
});


test('a conflicting dictionary cannot emit an ambiguous same-body reference',()=>{
 const {data,products}=fixture();products[0].selectionEvidence.push({...data.selectionEvidence,sourceVersion:'forged-same-hash'});
 assert.throws(()=>compactSelectionResult(data,products),/SELECTION_RESULT_REFERENCE/);
});
