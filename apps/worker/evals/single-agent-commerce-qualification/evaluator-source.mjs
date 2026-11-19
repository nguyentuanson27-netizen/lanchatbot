// Evaluator-only ground truth; never an owner/verifier wire input.
import assert from 'node:assert/strict';
import {digest} from './qualification.mjs';
const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(v,k)).map(k=>[k,structuredClone(v[k])]));
export function judgeSourceInventory(world,codes,{noProductLookupRequired=false}={}){
 assert(Array.isArray(codes)&&codes.length<=3&&new Set(codes).size===codes.length,'C_JUDGE_SOURCE_BOUND');
 assert(codes.length||noProductLookupRequired,'C_JUDGE_SOURCE_COVERAGE_UNDECLARED');
 const products=codes.map(code=>{
  const p=world.products.find(p=>p.productId===code&&p.canonicalCode===code);
  assert(p&&Object.hasOwn(world.snapshots,code),'C_JUDGE_SOURCE_NOT_FROZEN');
  const s=world.snapshots[code];
  return {subjectRef:code,catalog:pick(p,['title','descriptionXml','attributes','colors','observedAt','catalogVersion']),
   pos:s===null?{status:'NOT_FOUND'}:{status:'FROZEN_SNAPSHOT',snapshot:pick(s,['schema_version','release_id','catalog_version','policy_version',
    'shop_alias','product_id','synced_at','data_status','fulfillment_policy','selling_rules','shipping_eta','offers'])},
   media:{scope:'INSPECTED_PRODUCT_INDEX_ONLY',assets:(p.images??[]).map(image=>({...pick(image,['url','role','angle','imageType','intents',
    'partsVisible','feedback','observedAt','revalidation','sourceContentSha256','reviewStatus','metadataVerified']),
    ...(image.colorBinding?{colorBinding:pick(image.colorBinding,['status','color','sha256'])}:{})}))}};
 });
 const groups=world.config?.productGroups??[];
 const sizeDelegations=groups.filter(g=>g&&typeof g.approvalRef==='string'&&g.approvalRef.trim()&&g.sharedSize&&
  Object.hasOwn(g.productTitles??{},g.sharedSize.sourceProductId)&&codes.some(code=>Object.hasOwn(g.productTitles??{},code)&&
   world.products.some(p=>p.productId===code&&p.title===g.productTitles[code]))).map(g=>{
    const records=(world.policyRecords??[]).filter(r=>r.pointer?.artifactKey===g.sharedSize.artifactKey&&r.version?.artifactKey===g.sharedSize.artifactKey);
    return {scope:'SIZE_APPLICABILITY_ONLY',approvalRef:'approval:'+digest(g.approvalRef),
     productTitles:structuredClone(g.productTitles),sharedSize:structuredClone(g.sharedSize),
     artifactStatus:records.length===1?'FROZEN_RECORD_NOT_RUNTIME_ELIGIBILITY':'NOT_PRESENT',
     artifacts:records.map(r=>({pointer:pick(r.pointer,['artifactKey','versionId','revision']),
      version:pick(r.version,['versionId','contentHash','lifecycle','revision','content'])}))};
   });
 const v={kind:'EVALUATOR_SOURCE_INVENTORY_V1',worldHash:digest(world),sourceConfigHash:digest(world.config??null),
  noProductLookupRequired,products,sizeDelegations};
 assert(Buffer.byteLength(JSON.stringify(v))<=262144,'C_JUDGE_SOURCE_BOUND');
 return {...v,contentHash:digest(v)};
}
export function assertJudgeSourceInventory(v,worldHash,world,scenario){
 assert(v?.kind==='EVALUATOR_SOURCE_INVENTORY_V1'&&v.worldHash===worldHash&&Array.isArray(v.products)&&
  (v.products.length>0||v.noProductLookupRequired===true),'C_JUDGE_SOURCE_COVERAGE');
 const {contentHash,...body}=v;assert(contentHash===digest(body),'C_JUDGE_SOURCE_HASH');
 assert(Buffer.byteLength(JSON.stringify(v))<=262144,'C_JUDGE_SOURCE_BOUND');
 if(world)assert.deepEqual(v,judgeSourceInventory(world,v.products.map(p=>p.subjectRef),{noProductLookupRequired:v.noProductLookupRequired}),'C_JUDGE_SOURCE_NOT_DERIVED');
 if(scenario){
  const requirement=scenario.judgeContext?.sourceRequirements,initial=[...new Set(scenario.turns.flatMap(t=>t.initialProductCodes))];
  assert(requirement&&['INITIAL_PRODUCTS','DISCOVERY_POOL','ORDER_ONLY','NO_PRODUCT_FACTS'].includes(requirement.kind)&&
   Array.isArray(requirement.productCodes)&&requirement.productCodes.length<=3&&new Set(requirement.productCodes).size===requirement.productCodes.length,'C_JUDGE_SOURCE_REQUIREMENTS');
  const noProducts=['ORDER_ONLY','NO_PRODUCT_FACTS'].includes(requirement.kind),actual=v.products.map(p=>p.subjectRef);
  assert(noProducts?initial.length===0&&requirement.productCodes.length===0&&actual.length===0&&v.noProductLookupRequired===true:
   requirement.productCodes.length>0&&v.noProductLookupRequired===false&&
   (initial.length>0?requirement.kind==='INITIAL_PRODUCTS':requirement.kind==='DISCOVERY_POOL')&&
   [...initial,...requirement.productCodes].every(code=>actual.includes(code))&&initial.every(code=>requirement.productCodes.includes(code)),
   'C_JUDGE_SOURCE_SUBJECT_COVERAGE');
 }
}
