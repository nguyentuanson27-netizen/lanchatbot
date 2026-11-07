// CompactV2 representation of these existing product paths only. No retrieval or inference.
import assert from 'node:assert/strict';
import {canonicalJsonV1} from '@lana/contracts';
import {validSelectionEvidence,expandSelectionOptions} from '../../dist/single-agent-commerce-selection-evidence.js';
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
const component=v=>object(v)&&(same(Object.keys(v).sort(),['componentRef','role'])||same(Object.keys(v).sort(),['componentRef','quantity','role'])&&Number.isSafeInteger(v.quantity)&&v.quantity>=1&&v.quantity<=20)&&typeof v.componentRef==='string'&&v.componentRef.length>0&&v.componentRef.length<=128&&
 ['TOP','PANTS','SKIRT','DRESS','JACKET','ACCESSORY','OTHER'].includes(v.role);
/** Presentation-only links from inspected single-item composition, never title matching.
 * Each target keeps its own price/stock/size authority. No target is selected here. */
export function sharedSingleItemReads(products){
 if(!Array.isArray(products)||products.length>32||products.some(p=>!object(p)||typeof p.subjectRef!=='string')||new Set(products.map(p=>p.subjectRef)).size!==products.length)return [];
 const refs=new Map();
 for(const p of products){
  const options=p.purchaseOptions;
  if(!Array.isArray(options))continue;
  if(options.length>32||options.some(o=>!object(o)||typeof o.offerType!=='string')||new Set(options.map(o=>o.offerType)).size!==options.length)return [];
  for(const o of options){
   const s=o.componentSource;
   if(s?.status!=='AVAILABLE'||s.completeness!=='INSPECTED_ROWS'||!Array.isArray(s.components)||s.components.length>3)continue;
   for(const c of s.components){
    if(!component(c))continue;
    const r=refs.get(c.componentRef)??{componentRef:c.componentRef,role:c.role,conflict:false,readTargets:[]};
    if(r.role!==c.role||(c.quantity??1)!==1)r.conflict=true;
    if(s.components.length===1&&(c.quantity??1)===1&&ownRead(o.priceRead,p.subjectRef,o.offerType)&&ownRead(o.stockRead,p.subjectRef,o.offerType))r.readTargets.push({subjectRef:p.subjectRef,offerType:o.offerType});
    refs.set(c.componentRef,r);
   }
  }
 }
 return [...refs.values()].filter(r=>!r.conflict&&new Set(r.readTargets.map(t=>t.subjectRef)).size>1).map(({componentRef,role,readTargets})=>({componentRef,role,readTargets}));
}
function shareComponents(products){
 const refs=new Map();
 for(const p of products)for(const o of Array.isArray(p.purchaseOptions)?p.purchaseOptions:[]){
  const s=o.componentSource;if(s?.status!=='AVAILABLE'||s.completeness!=='INSPECTED_ROWS'||!Array.isArray(s.components)||s.components.length>3||Object.hasOwn(s,'componentIndices'))continue;
  for(const c of s.components)if(component(c)){
   const item=refs.get(c.componentRef)??{value:c,parents:new Set(),conflict:false};
   item.parents.add(p.subjectRef);if(!same(item.value,c))item.conflict=true;refs.set(c.componentRef,item);
  }
 }
 const components=[...refs.values()].filter(r=>r.parents.size>1&&!r.conflict).map(r=>structuredClone(r.value));
 if(!components.length)return [];
 for(const p of products)for(const o of Array.isArray(p.purchaseOptions)?p.purchaseOptions:[]){
  const s=o.componentSource;if(s?.status!=='AVAILABLE'||s.completeness!=='INSPECTED_ROWS'||!Array.isArray(s.components)||s.components.length>3||!s.components.length||Object.hasOwn(s,'componentIndices'))continue;
  const indices=s.components.map(c=>components.findIndex(v=>same(v,c)));
  if(indices.every(i=>i>=0)){delete s.components;s.componentIndices=indices;}
 }
 return components;
}
export function compactOwnerProducts(products){
 const out=JSON.parse(JSON.stringify(products)); // The same JSON omission semantics as the original wire.
 const components=shareComponents(out);
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
 const rows=pack(out,productKeys);
 return components.length?{format:'PRODUCT_COMPONENT_REFERENCES_V1',components,products:rows}:rows;
}
export function expandOwnerProducts(value){
 let components=null;
 if(object(value)&&value.format==='PRODUCT_COMPONENT_REFERENCES_V1'){
  assert(same(Object.keys(value).sort(),['components','format','products'])&&Array.isArray(value.components)&&value.components.length>0&&value.components.length<=96&&
   value.components.every(component)&&new Set(value.components.map(c=>c.componentRef)).size===value.components.length,'PRODUCT_COMPONENT_REFERENCE');
  components=value.components;value=value.products;
 }
 const products=structuredClone(unpack(value,productKeys));
 for(const p of products){
  if(p.purchaseOptions){
   p.purchaseOptions=unpack(p.purchaseOptions,purchaseKeys);
   for(const o of p.purchaseOptions)if(Object.hasOwn(o,'readTargetFromProductAndOffer')){
    assert(o.readTargetFromProductAndOffer===true&&!Object.hasOwn(o,'priceRead')&&!Object.hasOwn(o,'stockRead')&&typeof p.subjectRef==='string'&&typeof o.offerType==='string','PRODUCT_READ_TARGET');
    delete o.readTargetFromProductAndOffer;o.priceRead={subjectRef:p.subjectRef,offerType:o.offerType};o.stockRead={...o.priceRead};
   }
   for(const o of p.purchaseOptions){const s=o.componentSource;if(!s||!Object.hasOwn(s,'componentIndices'))continue;
    assert(components&&s.status==='AVAILABLE'&&s.completeness==='INSPECTED_ROWS'&&!Object.hasOwn(s,'components')&&Array.isArray(s.componentIndices)&&s.componentIndices.length>0&&s.componentIndices.length<=3&&
     s.componentIndices.every(i=>Number.isInteger(i)&&i>=0&&i<components.length),'PRODUCT_COMPONENT_REFERENCE');
    s.components=s.componentIndices.map(i=>structuredClone(components[i]));delete s.componentIndices;
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


// Exact same-body selection observations only. This is presentation, not source
// validation or a replacement for freshness/transaction/readback checks.
export function compactSelectionResult(data,products){
 assert(!Object.hasOwn(data,'selectionEvidenceFromProduct')&&!Object.hasOwn(data,'selectionOptionsFromEvidence'),'SELECTION_RESULT_REFERENCE');
 const out=structuredClone(data),e=data.selectionEvidence;
 if(!e||!validSelectionEvidence(e,e.productId,new Date(e.observedAt)))return out;
 const matches=products.filter(p=>p.subjectRef===e.productId).flatMap(p=>(p.selectionEvidence??[]).filter(v=>v.contentHash===e.contentHash));
 if(matches.length){
  assert(matches.length===1&&same(matches[0],e),'SELECTION_RESULT_REFERENCE');
  delete out.selectionEvidence;out.selectionEvidenceFromProduct={subjectRef:e.productId,contentHash:e.contentHash};
 }
 if(same(data.selectionOptions,expandSelectionOptions(e))){delete out.selectionOptions;out.selectionOptionsFromEvidence=true;}
 return out;
}
export function expandSelectionResult(data,products){
 const out=structuredClone(data),ref=data.selectionEvidenceFromProduct;
 if(Object.hasOwn(out,'selectionEvidenceFromProduct')){
  assert(object(ref)&&same(Object.keys(ref).sort(),['contentHash','subjectRef'])&&!Object.hasOwn(out,'selectionEvidence'),'SELECTION_RESULT_REFERENCE');
  const matches=products.filter(p=>p.subjectRef===ref.subjectRef).flatMap(p=>(p.selectionEvidence??[]).filter(e=>e.contentHash===ref.contentHash));
  assert(matches.length===1&&validSelectionEvidence(matches[0],ref.subjectRef,new Date(matches[0].observedAt)),'SELECTION_RESULT_REFERENCE');
  delete out.selectionEvidenceFromProduct;out.selectionEvidence=structuredClone(matches[0]);
 }
 if(Object.hasOwn(out,'selectionOptionsFromEvidence')){
  assert(out.selectionOptionsFromEvidence===true&&!Object.hasOwn(out,'selectionOptions')&&out.selectionEvidence&&
   validSelectionEvidence(out.selectionEvidence,out.selectionEvidence.productId,new Date(out.selectionEvidence.observedAt)),'SELECTION_RESULT_REFERENCE');
  delete out.selectionOptionsFromEvidence;out.selectionOptions=expandSelectionOptions(out.selectionEvidence);
 }
 return out;
}
