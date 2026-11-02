// CompactV2 representation of these existing product paths only. No retrieval or inference.
import assert from 'node:assert/strict';
import {canonicalJsonV1} from '@lana/contracts';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const same=(a,b)=>canonicalJsonV1(a)===canonicalJsonV1(b);
const productKeys=['subjectRef','availableOffers','purchaseOptions','productSizeRead','offerLabels','preparation','attributes','content','presentation','colorEvidence','selectionEvidence','offerReadCoverage','sizeCharts'];
const purchaseKeys=['offerType','priceRead','stockRead','componentSource','sizeApplicability','colorSemantics','readTargetFromProductAndOffer'];
const optionKeys=['size','color','status','reasonCode','identityHash'];
const variantKeys=['variantId','color','size'];
function pack(rows,allowed){
 if(!Array.isArray(rows)||rows.length<2||!rows.every(object))return rows;
 const keys=Object.keys(rows[0]);
 if(!keys.every(k=>allowed.includes(k))||!rows.every(r=>same(Object.keys(r).sort(),[...keys].sort())))return rows;
 const defaults=Object.fromEntries(keys.filter(k=>rows.every(r=>same(r[k],rows[0][k]))).map(k=>[k,rows[0][k]]));
 const columns=keys.filter(k=>!Object.hasOwn(defaults,k));
 const table={format:'PRODUCT_ROWS_V1',defaults,columns,rows:rows.map(r=>columns.map(k=>r[k]))};
 return Buffer.byteLength(JSON.stringify(table))<Buffer.byteLength(JSON.stringify(rows))?table:rows;
}
function unpack(value,allowed){
 if(Array.isArray(value))return value;
 assert(object(value)&&value.format==='PRODUCT_ROWS_V1'&&same(Object.keys(value).sort(),['columns','defaults','format','rows']),'PRODUCT_TABLE');
 assert(object(value.defaults)&&Array.isArray(value.columns)&&Array.isArray(value.rows),'PRODUCT_TABLE');
 const keys=[...Object.keys(value.defaults),...value.columns];
 assert(keys.every(k=>typeof k==='string'&&allowed.includes(k))&&new Set(keys).size===keys.length,'PRODUCT_TABLE');
 assert(value.rows.length>=2&&value.rows.every(r=>Array.isArray(r)&&r.length===value.columns.length),'PRODUCT_TABLE');
 return value.rows.map(row=>({...structuredClone(value.defaults),...Object.fromEntries(value.columns.map((k,i)=>[k,row[i]]))}));
}
const ownRead=(v,id,offer)=>object(v)&&same(Object.keys(v).sort(),['offerType','subjectRef'])&&v.subjectRef===id&&v.offerType===offer;
export function compactOwnerProducts(products){
 const out=JSON.parse(JSON.stringify(products)); // The same JSON omission semantics as the original wire.
 for(const p of out){
  if(Array.isArray(p.purchaseOptions)){
   for(const o of p.purchaseOptions)if(!Object.hasOwn(o,'readTargetFromProductAndOffer')&&ownRead(o.priceRead,p.subjectRef,o.offerType)&&ownRead(o.stockRead,p.subjectRef,o.offerType)){
    delete o.priceRead;delete o.stockRead;o.readTargetFromProductAndOffer=true;
   }
   p.purchaseOptions=pack(p.purchaseOptions,purchaseKeys);
  }
  if(p.presentation&&Array.isArray(p.presentation.variants))p.presentation.variants=pack(p.presentation.variants,variantKeys);
  for(const e of p.selectionEvidence??[])if(Array.isArray(e.options))e.options=pack(e.options,optionKeys);
 }
 return pack(out,productKeys);
}
export function expandOwnerProducts(value){
 const products=structuredClone(unpack(value,productKeys));
 for(const p of products){
  if(p.purchaseOptions){
   p.purchaseOptions=unpack(p.purchaseOptions,purchaseKeys);
   for(const o of p.purchaseOptions)if(Object.hasOwn(o,'readTargetFromProductAndOffer')){
    assert(o.readTargetFromProductAndOffer===true&&!Object.hasOwn(o,'priceRead')&&!Object.hasOwn(o,'stockRead')&&typeof p.subjectRef==='string'&&typeof o.offerType==='string','PRODUCT_READ_TARGET');
    delete o.readTargetFromProductAndOffer;o.priceRead={subjectRef:p.subjectRef,offerType:o.offerType};o.stockRead={...o.priceRead};
   }
  }
  if(p.presentation?.variants)p.presentation.variants=unpack(p.presentation.variants,variantKeys);
  for(const e of p.selectionEvidence??[])if(e.options)e.options=unpack(e.options,optionKeys);
 }
 return products;
}

/** Exact public fact values already present in this body's trusted facts; historical differences stay local. */
export function compactCurrentFacts(data,facts){
 const out=structuredClone(data);
 if(!Array.isArray(out.facts)||!out.facts.length||Object.hasOwn(out,'factsFromTrustedIndices'))return out;
 const indices=out.facts.map(f=>facts.findIndex(g=>same(f,g)));
 if(indices.some(i=>i<0))return out;
 delete out.facts;out.factsFromTrustedIndices=indices;return out;
}
export function expandCurrentFacts(data,facts){
 const out=structuredClone(data);
 if(!Object.hasOwn(out,'factsFromTrustedIndices'))return out;
 assert(!Object.hasOwn(out,'facts')&&Array.isArray(out.factsFromTrustedIndices)&&out.factsFromTrustedIndices.length>0&&out.factsFromTrustedIndices.every(i=>Number.isInteger(i)&&i>=0&&i<facts.length),'PRODUCT_FACT_REFERENCE');
 const indices=out.factsFromTrustedIndices;delete out.factsFromTrustedIndices;out.facts=indices.map(i=>structuredClone(facts[i]));return out;
}
