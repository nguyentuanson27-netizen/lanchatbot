import {assertOpeningProductMediaRule} from '../../dist/single-agent-commerce-opening-media.js';
// Evaluation-only prerequisites. No network, clock override, source write or generation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {resolveCatalogFacts,normalizeProductCode} from '@lana/business-tools';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {candidateCartOptions,cartSelectionFromSnapshot} from '../../dist/realtime-sales-catalog.js';
import {commerceSizeSource,commerceComponentSizeSource} from '../../dist/single-agent-commerce-product-groups.js';
import {eligibleCommerceMedia,commerceMediaIntents} from '../../dist/single-agent-commerce-media-eligibility.js';
import {digest} from './qualification.mjs';
import {openingExecutionReadiness} from './opening-execution-readiness.mjs';

/** Evaluator-only task declaration, reviewed/frozen before results. No prose classification. */
export function assertTaskReadinessSpec(spec,{required=false}={}){
 if(spec?.version===undefined){assert(!required,'C_TASK_SCOPE_REGISTRATION_REQUIRED');return;}
 assert([2,3].includes(spec.version)&&spec.task&&typeof spec.task==='object'&&!Array.isArray(spec.task),'C_TASK_SCOPE_VERSION');
 if(spec.version===3){
  assert(Array.isArray(spec.executionPaths)&&(spec.executionPaths.length>0||spec.noProductFactsRequired===true),'C_EXECUTION_PATHS');
  if(spec.executionPaths.length===0)assert(spec.noProductFactsRequired===true&&!spec.task.productId&&spec.checks.every(q=>q.facet==='POLICY'),'C_EXECUTION_EMPTY_PRODUCT_SCOPE');
  for(const q of spec.checks.filter(q=>q.facet==='SELECTION'))assert(spec.executionPaths.some(p=>p.kind==='POST_CART'&&p.selections?.some(s=>digest(s)===digest(q))),'C_EXECUTION_SELECTION_COVERAGE');
 }
 const t=spec.task;
 assert(Object.keys(t).every(k=>['purpose','productId','fitScope','componentRole','openingQuote','requiredComponentRoles'].includes(k))&&
  ['SALE','CUSTOMER_INPUT','SHOP_GAP'].includes(t.purpose),'C_TASK_SCOPE_FIELDS');
 if(t.fitScope!==undefined){
  assert(['PRODUCT','COMPONENT'].includes(t.fitScope)&&typeof t.productId==='string'&&
   spec.checks.some(q=>q.facet==='SIZE_SOURCE'&&q.productId===t.productId&&(q.fitScope??'PRODUCT')===t.fitScope&&
    (t.fitScope!=='COMPONENT'||typeof t.componentRole==='string'&&q.componentRole===t.componentRole)),'C_TASK_SIZE_SCOPE_COVERAGE');
 }
 if(t.openingQuote!==undefined){
  assert(typeof t.openingQuote==='boolean','C_TASK_QUOTE_SCOPE');
  if(t.openingQuote)assert(typeof t.productId==='string'&&spec.checks.some(q=>q.facet==='PRICE'&&q.productId===t.productId)&&
   spec.checks.some(q=>q.facet==='MEDIA'&&q.productId===t.productId&&q.intent==='GENERIC'),'C_TASK_QUOTE_MEDIA_COVERAGE');
 }
 if(t.requiredComponentRoles!==undefined)assert(spec.checks.some(q=>q.facet==='SELECTION'&&q.productId===t.productId&&
  JSON.stringify(q.requiredComponentRoles)===JSON.stringify(t.requiredComponentRoles)),'C_TASK_COMPOSITION_COVERAGE');
}

/** New seals only. Historical v2 manifests remain byte-replayable, never upgraded in place. */
export function assertProspectiveOpeningReadiness(corpus,rule){
 if(!rule)return;assertOpeningProductMediaRule(rule);
 assert(corpus.scenarios.filter(s=>s.mode!=='SAFETY').every(s=>s.judgeContext?.sourceReadiness?.spec?.version===3),'C_EXECUTION_READINESS_V3_REQUIRED');
 if(rule.version==='FIRST_CONTACT_UNIQUE_OR_CART_IMAGE_V2')assert(corpus.scenarios.filter(s=>s.mode!=='SAFETY').every(s=>digest(s.judgeContext.sourceReadiness.openingMediaRule??null)===digest(rule)),'C_OPENING_READINESS_RULE_BINDING');
}

export async function sourceReadiness(world,spec,at=new Date(),openingMediaRule=undefined){
 if(openingMediaRule)assertOpeningProductMediaRule(openingMediaRule);
 assert(Number.isFinite(at.getTime())&&['SALES_READY','SOURCE_UNAVAILABLE'].includes(spec?.cohort)&&Array.isArray(spec.checks)&&spec.checks.length<=32,'C_READINESS_SPEC');
 assertTaskReadinessSpec(spec);
 assert(spec.checks.length||spec.noProductFactsRequired===true,'C_READINESS_EMPTY_REQUIREMENTS');
 const policy=world.config?.scope?.pageId&&world.config?.channel?await new RuntimePolicyResolver({loadActivePointers:async()=>structuredClone(world.policyRecords??[])},{enabled:true,publishedEnabled:world.config.channel==='PUBLISHED'})
  .resolve({pageId:world.config.scope.pageId,channel:world.config.channel,now:at}):{status:'UNAVAILABLE',bundle:null};
 const results=[];
 for(const q of spec.checks){
  assert(q&&['PRICE','STOCK','COLOR','SELECTION','SIZE_SOURCE','MEDIA','POLICY'].includes(q.facet),'C_READINESS_FACET');
  assert(Object.keys(q).every(k=>['facet','productId','offerType','color','size','intent','fitScope','componentRole','allowedHostSuffixes','requiredComponentRoles'].includes(k)),'C_READINESS_FIELDS');
  assert(q.fitScope===undefined||q.facet==='SIZE_SOURCE'&&['PRODUCT','COMPONENT'].includes(q.fitScope),'C_READINESS_FIT_SCOPE');
  assert(q.requiredComponentRoles===undefined||q.facet==='SELECTION','C_READINESS_COMPONENT_SCOPE');
  if(q.fitScope==='COMPONENT')assert(['TOP','PANTS','SKIRT','DRESS','OTHER'].includes(q.componentRole),'C_READINESS_COMPONENT_SCOPE');
  const p=world.products.find(p=>p.productId===q.productId),snapshot=world.snapshots[q.productId];
  let available=false,reason='SOURCE_UNAVAILABLE';
  if(q.facet==='POLICY'){available=policy.status==='RESOLVED'&&!!policy.bundle;reason=available?null:'POLICY_UNAVAILABLE';}
  else if(!p||!snapshot&&!['MEDIA','SIZE_SOURCE'].includes(q.facet)){reason='PRODUCT_SOURCE_UNAVAILABLE';}
  else if(q.facet==='MEDIA'){
   assert(commerceMediaIntents.includes(q.intent),'C_READINESS_MEDIA_INTENT');
   assert(Array.isArray(q.allowedHostSuffixes)&&q.allowedHostSuffixes.length>0&&q.allowedHostSuffixes.every(h=>['content.pancake.vn','lanadesign.vn','fbcdn.net','fbsbx.com'].includes(h)),'C_READINESS_HOSTS');
   try{available=eligibleCommerceMedia(p,{subjectRef:q.productId,intent:q.intent,...(q.componentRole?{componentRole:q.componentRole}:{}),...(q.color?{color:q.color}:{})},at.getTime(),q.allowedHostSuffixes).images.length>0;
    reason=available?null:'NO_VERIFIED_MATCHING_MEDIA';}catch{reason='MEDIA_INELIGIBLE';}
  }else if(q.facet==='SIZE_SOURCE'){
   const component=q.fitScope==='COMPONENT';
   try{
    const source=component?commerceComponentSizeSource(p,snapshot,policy,q.componentRole,at,world.config.maxFactAgeSeconds??1200,world.config.productGroups??[]):
      commerceSizeSource(p,policy,world.config.productGroups??[]);
    available=source.charts.length>0&&(!q.componentRole||source.target.componentRole===q.componentRole);
    reason=available?null:'SIZE_SOURCE_UNAVAILABLE';
   }catch{reason=component?'COMPONENT_FIT_UNSUPPORTED':'SIZE_SOURCE_UNAVAILABLE';}
  }else{
   assert(typeof q.offerType==='string'&&q.offerType.trim(),'C_READINESS_EXACT_OFFER');
   const observed=Date.parse(snapshot.synced_at),expires=observed+(world.config.maxFactAgeSeconds??1200)*1000;
   if(!Number.isFinite(observed)||observed>at.getTime()||expires<=at.getTime()){reason='SOURCE_STALE';}
   else if(q.facet==='SELECTION'){
    const selected=cartSelectionFromSnapshot(snapshot,{selectionMode:'CANDIDATE_TUPLES',shopAlias:world.config.scope.shopAlias,productId:q.productId,offerType:q.offerType,size:q.size??null,color:q.color??null,quantity:1,lineId:'00000000-0000-4000-8000-000000000001',selectionMaxAgeSeconds:world.config.maxFactAgeSeconds??1200},at);
    available=selected.status==='READY';reason=available?null:selected.reasonCode??selected.status;
    if(q.requiredComponentRoles!==undefined){
     assert(Array.isArray(q.requiredComponentRoles)&&q.requiredComponentRoles.length>=1&&q.requiredComponentRoles.length<=4&&
      new Set(q.requiredComponentRoles).size===q.requiredComponentRoles.length&&q.requiredComponentRoles.every(r=>['TOP','PANTS','SKIRT','DRESS','OTHER'].includes(r)),'C_READINESS_COMPONENT_ROLES');
     if(available&&!q.requiredComponentRoles.every(role=>selected.line.components.some(c=>c.componentRole===role)))
      {available=false;reason='COMPOSITION_SCOPE_UNAVAILABLE';}
    }
   }else if(q.facet==='COLOR'){
    const options=candidateCartOptions(snapshot,{shopAlias:world.config.scope.shopAlias,productId:q.productId,offerType:q.offerType,
     size:q.size??null,color:q.color??null,quantity:1,lineId:'00000000-0000-4000-8000-000000000001'},at);
    available=options.length>0&&options.every(o=>o.color!==null&&o.color!=='__NO_COLOR__');
    reason=available?null:'SHOP_COLOR_UNRECORDED_OR_UNAVAILABLE';
   }else{
    const facts=resolveCatalogFacts(snapshot,{shopAlias:world.config.scope.shopAlias,productId:q.productId,intent:q.facet,
     offerType:q.offerType,color:q.color??null,size:q.size??null,deliveryRegion:null},at,world.config.maxFactAgeSeconds??1200);
    available=facts.status==='OK'&&(q.facet!=='STOCK'||facts.facts?.stockStatus!=='UNKNOWN'&&facts.facts?.stockQuantity!==null);reason=available?null:facts.reasonCode??'SOURCE_UNAVAILABLE';
   }
  }
  results.push({requirement:structuredClone(q),status:available?'AVAILABLE':'FAILED',reason});
 }
 const executionPaths=spec.version===3?(spec.executionPaths.length?await openingExecutionReadiness(world,spec.executionPaths,at,openingMediaRule):[]):undefined;
 const all=[...results,...(executionPaths??[])];
 assert(spec.cohort==='SALES_READY'?all.every(r=>r.status==='AVAILABLE'):all.some(r=>r.status==='FAILED'),
  spec.cohort==='SALES_READY'?'C_SOURCE_READINESS_BLOCKED':'C_CONTROL_HAS_NO_SOURCE_FAILURE');
 const body={kind:'C_SOURCE_READINESS_V1',worldHash:digest(world),checkedAt:at.toISOString(),spec:structuredClone(spec),results,...(executionPaths?{executionPaths}:{}),...(openingMediaRule?{openingMediaRule:structuredClone(openingMediaRule)}:{})};
 return {...body,contentHash:digest(body)};
}
export async function assertSourceReadiness(world,manifest,at=new Date()){
 assert(manifest?.kind==='C_SOURCE_READINESS_V1'&&manifest.worldHash===digest(world),'C_READINESS_WORLD_CHANGED');
 const {contentHash,...body}=manifest;assert(contentHash===digest(body),'C_READINESS_MANIFEST_HASH');
 assert.deepEqual(manifest,await sourceReadiness(world,manifest.spec,new Date(manifest.checkedAt),manifest.openingMediaRule),'C_READINESS_NOT_DERIVED');
 return sourceReadiness(world,manifest.spec,at,manifest.openingMediaRule);
}
export async function assertScenarioReadiness(world,s,at=new Date(),openingMediaRule=undefined){
 if(openingMediaRule)assertOpeningProductMediaRule(openingMediaRule);
 if(s.mode!=='SAFETY'){
  assertTaskReadinessSpec(s.judgeContext?.sourceReadiness?.spec,{required:true});
  const spec=s.judgeContext.sourceReadiness.spec;
  if(openingMediaRule&&s.judgeContext.sourceReadiness.openingMediaRule)assert(digest(s.judgeContext.sourceReadiness.openingMediaRule)===digest(openingMediaRule),'C_OPENING_READINESS_RULE_BINDING');
  if(openingMediaRule?.version==='FIRST_CONTACT_UNIQUE_OR_CART_IMAGE_V2')assert(digest(s.judgeContext.sourceReadiness.openingMediaRule??null)===digest(openingMediaRule),'C_OPENING_READINESS_RULE_BINDING');
  const openingProducts=[...new Set([...s.turns.flatMap(t=>t.initialProductCodes),...(s.judgeContext?.sourceRequirements?.productCodes??[]),...(spec.task?.productId?[spec.task.productId]:[])])];
  if(spec.version===3&&spec.executionPaths.length===0)assert(openingProducts.length===0&&['ORDER_ONLY','NO_PRODUCT_FACTS'].includes(s.judgeContext?.sourceRequirements?.kind),'C_EXECUTION_EMPTY_PRODUCT_SCOPE');
  const resolvedInitialProducts=openingMediaRule?.version==='FIRST_CONTACT_UNIQUE_OR_CART_IMAGE_V2'?s.turns.map(t=>[...new Set(t.initialProductCodes.map(code=>{
   const matches=world.products.filter(p=>[p.productId,p.canonicalCode,...(p.aliases??[])].some(v=>normalizeProductCode(v)===normalizeProductCode(code)));
   assert(matches.length===1,'C_OPENING_INITIAL_IDENTITY_AMBIGUOUS');return matches[0].productId;
  }))]):[];
  const mandatoryProducts=openingMediaRule?.version==='FIRST_CONTACT_UNIQUE_OR_CART_IMAGE_V2'?[...new Set([
   ...resolvedInitialProducts.flatMap(ids=>ids.length===1?ids:[]),
   ...(spec.task?.productId?[spec.task.productId]:[]),
   ...((s.judgeContext?.sourceRequirements?.productCodes??[]).length===1?s.judgeContext.sourceRequirements.productCodes:[]),
   ...(spec.executionPaths??[]).flatMap(p=>p.kind==='POST_CART'?p.selections.map(q=>q.productId):p.productIds.length===1?p.productIds:[])
  ])]:openingProducts;
  if(openingMediaRule&&spec.cohort==='SALES_READY')for(const code of mandatoryProducts){
   const p=world.products.find(p=>[p.productId,p.canonicalCode,...(p.aliases??[])].some(v=>normalizeProductCode(v)===normalizeProductCode(code)));
   assert(p&&spec.checks.some(q=>q.facet==='MEDIA'&&q.productId===p.productId&&q.intent==='GENERIC'),'C_OPENING_MEDIA_READINESS_REQUIRED');
   if(spec.version===3)assert(spec.executionPaths.some(path=>openingMediaRule.version==='FIRST_CONTACT_UNIQUE_OR_CART_IMAGE_V2'
    ?path.kind==='DISCOVERY'&&path.productIds?.length===1&&path.productIds[0]===p.productId||path.kind==='POST_CART'&&path.selections?.some(q=>q.productId===p.productId)
    :path.kind==='DISCOVERY'&&path.productIds?.includes(p.productId)),'C_EXECUTION_DISCOVERY_COVERAGE');
  }
  if(openingMediaRule&&spec.version===3&&spec.cohort==='SALES_READY'&&openingProducts.length){
   const ids=openingProducts.map(code=>world.products.find(p=>[p.productId,p.canonicalCode,...(p.aliases??[])].some(v=>normalizeProductCode(v)===normalizeProductCode(code)))?.productId);
   assert(spec.executionPaths.some(path=>path.kind==='DISCOVERY'&&ids.every(id=>id&&path.productIds?.includes(id))),'C_EXECUTION_COMBINED_SCOPE');
  }
  await assertSourceReadiness(world,s.judgeContext?.sourceReadiness,at);
 }
}
export async function assertPopulationReadiness(world,corpus,at=new Date(),openingMediaRule=undefined){
 for(const s of corpus.scenarios)await assertScenarioReadiness(world,s,at,openingMediaRule);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  assert(process.argv[2]==='--assert'&&process.argv.length===5,'C_READINESS_ARGUMENTS');
  const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),world=read(process.argv[3]),reg=read(process.argv[4]);
  await assertPopulationReadiness(world,reg.corpus,new Date(),reg.config?.candidate?.openingMediaRule);
  process.stdout.write(JSON.stringify({status:'READY',providerRequests:0,sourceWrites:0}));
 }catch(error){process.stderr.write(JSON.stringify({status:'BLOCKED',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'C_SOURCE_READINESS_ERROR',providerRequests:0}));process.exitCode=2;}
}
