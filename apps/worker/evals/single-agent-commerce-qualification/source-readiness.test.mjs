// Synthetic sources and actual eligibility code; zero provider or source writes.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureProduct,fixturePolicyPointers,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
import {sourceReadiness,assertSourceReadiness,assertTaskReadinessSpec,assertPopulationReadiness,assertProspectiveOpeningReadiness} from './source-readiness.mjs';
import {OPENING_PRODUCT_MEDIA_RULE} from '../../dist/single-agent-commerce-opening-media.js';
const world=()=>{const f=fixtureProduct();return {config:{scope:commerceScope(),channel:'CANARY_SHADOW',maxFactAgeSeconds:1200},
 products:[f.product],snapshots:{SM613:f.snapshot},policyRecords:fixturePolicyPointers()};};

test('V2 binds its rule before seal and permits an ambiguous candidate pool without mandatory per-candidate media',async()=>{
 const w=world(),second=fixtureProduct('SECOND');w.products.push(second.product);w.snapshots.SECOND=second.snapshot;
 const spec={version:3,task:{purpose:'CUSTOMER_INPUT'},cohort:'SALES_READY',checks:[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}],executionPaths:[{kind:'DISCOVERY',productIds:['SM613','SECOND']}]};
 const manifest=await sourceReadiness(w,spec,commerceNow,OPENING_PRODUCT_MEDIA_RULE);
 const scenario={mode:'SINGLE',turns:[{initialProductCodes:['SM613','SECOND']}],judgeContext:{sourceReadiness:manifest,sourceRequirements:{kind:'DISCOVERY_POOL',productCodes:['SM613','SECOND']}}},corpus={scenarios:[scenario]};
 assertProspectiveOpeningReadiness(corpus,OPENING_PRODUCT_MEDIA_RULE);await assertPopulationReadiness(w,corpus,commerceNow,OPENING_PRODUCT_MEDIA_RULE);
 assert.equal(manifest.executionPaths[0].chargedUnits,0);assert.equal(manifest.executionPaths[0].status,'AVAILABLE');
 const before=structuredClone(manifest);delete scenario.judgeContext.sourceReadiness.openingMediaRule;
 assert.throws(()=>assertProspectiveOpeningReadiness(corpus,OPENING_PRODUCT_MEDIA_RULE),/RULE_BINDING/);
 scenario.judgeContext.sourceReadiness=before;
 await assert.rejects(sourceReadiness(w,spec,commerceNow),/SOURCE_READINESS_BLOCKED/); // Unbound historical manifests still use V1.
 spec.task.productId='SM613';scenario.judgeContext.sourceReadiness=await sourceReadiness(w,spec,commerceNow,OPENING_PRODUCT_MEDIA_RULE);
 await assert.rejects(assertPopulationReadiness(w,corpus,commerceNow,OPENING_PRODUCT_MEDIA_RULE),/OPENING_MEDIA_READINESS_REQUIRED/);
 delete spec.task.productId;scenario.turns[0].initialProductCodes=['SM613','SM613'];
 scenario.judgeContext.sourceReadiness=await sourceReadiness(w,spec,commerceNow,OPENING_PRODUCT_MEDIA_RULE);
 await assert.rejects(assertPopulationReadiness(w,corpus,commerceNow,OPENING_PRODUCT_MEDIA_RULE),/OPENING_MEDIA_READINESS_REQUIRED/);
 w.products[0].images=[{url:'https://content.pancake.vn/initial.jpg',role:'PRIMARY',angle:'FRONT',imageType:'MODEL',intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:'a'.repeat(64),observedAt:commerceNow.toISOString()}];
 spec.checks.push({facet:'MEDIA',productId:'SM613',intent:'GENERIC',allowedHostSuffixes:['content.pancake.vn']});
 scenario.judgeContext.sourceReadiness=await sourceReadiness(w,spec,commerceNow,OPENING_PRODUCT_MEDIA_RULE);
 await assert.rejects(assertPopulationReadiness(w,corpus,commerceNow,OPENING_PRODUCT_MEDIA_RULE),/EXECUTION_DISCOVERY_COVERAGE/);
});
test('new opening-media seals require execution v3 without rewriting historical v2 manifests',()=>{
 const c={scenarios:[{mode:'SINGLE',judgeContext:{sourceReadiness:{spec:{version:2}}}}]},before=structuredClone(c),rule={version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'};
 assert.throws(()=>assertProspectiveOpeningReadiness(c,rule),/EXECUTION_READINESS_V3_REQUIRED/);assert.deepEqual(c,before);
 assertProspectiveOpeningReadiness(c,undefined);c.scenarios[0].judgeContext.sourceReadiness.spec.version=3;assertProspectiveOpeningReadiness(c,rule);
});
test('sales-ready price is exact-offer and expires at the real boundary without renewing source',async()=>{
 const w=world(),before=structuredClone(w),spec={cohort:'SALES_READY',checks:[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}]};
 const m=await sourceReadiness(w,spec,commerceNow);assert.equal(m.results[0].status,'AVAILABLE');assert.deepEqual(w,before);
 await assert.rejects(assertSourceReadiness(w,m,new Date(commerceNow.getTime()+1200000)),/SOURCE_READINESS_BLOCKED/);
 await assert.rejects(sourceReadiness(w,{...spec,checks:[{...spec.checks[0],offerType:'AO'}]},commerceNow),/SOURCE_READINESS_BLOCKED/);
});
test('missing media belongs to a registered source-unavailable control, never a ready quote',async()=>{
 const w=world(),checks=[{facet:'MEDIA',productId:'SM613',intent:'FEEDBACK',allowedHostSuffixes:['content.pancake.vn']}];
 await assert.rejects(sourceReadiness(w,{cohort:'SALES_READY',checks},commerceNow),/SOURCE_READINESS_BLOCKED/);
 const m=await sourceReadiness(w,{cohort:'SOURCE_UNAVAILABLE',checks},commerceNow);assert.equal(m.results[0].status,'FAILED');
 await assertSourceReadiness(w,m,commerceNow);
 await assert.rejects(sourceReadiness(w,{cohort:'SOURCE_UNAVAILABLE',checks:[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}]},commerceNow),/CONTROL_HAS_NO_SOURCE_FAILURE/);
});
test('unrecorded colour and absent size applicability do not become sales-ready from product metadata',async()=>{
 const w=world();w.snapshots.SM613.offers.DIRECT.rows[0].color='__NO_COLOR__';
 for(const facet of ['COLOR','SIZE_SOURCE']){
  const m=await sourceReadiness(w,{cohort:'SOURCE_UNAVAILABLE',checks:[{facet,productId:'SM613',offerType:'DIRECT'}]},commerceNow);
  assert.equal(m.results[0].status,'FAILED');
 }
 await assert.rejects(sourceReadiness(w,{cohort:'SALES_READY',checks:[]},commerceNow),/EMPTY_REQUIREMENTS/);
});
test('changed manifest or world cannot inherit a previous readiness decision',async()=>{
 const w=world(),m=await sourceReadiness(w,{cohort:'SALES_READY',checks:[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}]},commerceNow);
 const bad=structuredClone(m);bad.results[0].status='FAILED';await assert.rejects(assertSourceReadiness(w,bad,commerceNow),/MANIFEST_HASH/);
 w.snapshots.SM613.release_id='changed';await assert.rejects(assertSourceReadiness(w,m,commerceNow),/WORLD_CHANGED/);
});

test('unknown stock quantity is not usable STOCK evidence and runtime media intents stay in parity',async()=>{
 const w=world();w.snapshots.SM613.offers.DIRECT.rows[0].stock_quantity=null;
 await assert.rejects(sourceReadiness(w,{cohort:'SALES_READY',checks:[{facet:'STOCK',productId:'SM613',offerType:'DIRECT'}]},commerceNow),/SOURCE_READINESS_BLOCKED/);
 const {commerceMediaIntents}=await import('../../dist/single-agent-commerce-media-eligibility.js');
 for(const intent of commerceMediaIntents){
  const m=await sourceReadiness(w,{cohort:'SOURCE_UNAVAILABLE',checks:[{facet:'MEDIA',productId:'SM613',intent,allowedHostSuffixes:['content.pancake.vn']}]},commerceNow);
  assert.equal(m.results[0].status,'FAILED');
 }
 await assert.rejects(sourceReadiness(w,{cohort:'SOURCE_UNAVAILABLE',checks:[{facet:'MEDIA',productId:'SM613',intent:'ON_BODY',allowedHostSuffixes:['content.pancake.vn']}]},commerceNow),/MEDIA_INTENT/);
});

test('checkout readiness requires the existing exact selection/BOM resolver, not price presence',async()=>{
 const w=world();const checks=[{facet:'SELECTION',productId:'SM613',offerType:'DIRECT',color:'navy',size:'M'}];
 await sourceReadiness(w,{cohort:'SALES_READY',checks},commerceNow);
 w.snapshots.SM613.offers.COMBO_3=structuredClone(w.snapshots.SM613.offers.DIRECT);w.snapshots.SM613.offers.COMBO_3.rows[0].offer_type='COMBO_3';
 await assert.rejects(sourceReadiness(w,{cohort:'SALES_READY',checks:[{...checks[0],offerType:'COMBO_3'}]},commerceNow),/SOURCE_READINESS_BLOCKED/);
});

test('PUBLISHED readiness consumes the same approved channel as runtime policy reads',async()=>{
 const w=world();w.config.channel='PUBLISHED';
 for(const r of w.policyRecords){r.pointer.channel='PUBLISHED';r.version.lifecycle='PUBLISHED';}
 const m=await sourceReadiness(w,{cohort:'SALES_READY',checks:[{facet:'POLICY'}]},commerceNow);
 assert.equal(m.results[0].status,'AVAILABLE');
});

test('a component-fit capability gap cannot be registered as a source-ready product fit',async()=>{
 const w=world(),checks=[{facet:'SIZE_SOURCE',productId:'SM613',fitScope:'COMPONENT',componentRole:'TOP'}];
 const m=await sourceReadiness(w,{cohort:'SOURCE_UNAVAILABLE',checks},commerceNow);
 assert.equal(m.results[0].reason,'COMPONENT_FIT_UNSUPPORTED');
 await assert.rejects(sourceReadiness(w,{cohort:'SALES_READY',checks},commerceNow),/SOURCE_READINESS_BLOCKED/);
});
test('task declarations require the matching scope and media prerequisites before corpus binding',()=>{
 const spec={version:2,task:{purpose:'SALE',productId:'SM613',fitScope:'COMPONENT',componentRole:'TOP'},cohort:'SALES_READY',checks:[{facet:'SIZE_SOURCE',productId:'SM613'}]};
 assert.throws(()=>assertTaskReadinessSpec(spec),/SIZE_SCOPE_COVERAGE/);
 spec.checks[0]={...spec.checks[0],fitScope:'COMPONENT',componentRole:'TOP'};assertTaskReadinessSpec(spec);
 spec.task={purpose:'SALE',productId:'SM613',openingQuote:true};spec.checks=[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}];
 assert.throws(()=>assertTaskReadinessSpec(spec),/QUOTE_MEDIA_COVERAGE/);
 spec.checks.push({facet:'MEDIA',productId:'SM613',intent:'GENERIC',allowedHostSuffixes:['content.pancake.vn']});assertTaskReadinessSpec(spec);
 assert.throws(()=>assertTaskReadinessSpec({checks:[]},{required:true}),/TASK_SCOPE_REGISTRATION_REQUIRED/);
});
test('three variant refs do not prove a three-garment composition',async()=>{
 const w=world(),checks=[{facet:'SELECTION',productId:'SM613',offerType:'DIRECT',size:'M',color:'navy',requiredComponentRoles:['TOP','PANTS','SKIRT']}];
 const m=await sourceReadiness(w,{cohort:'SOURCE_UNAVAILABLE',checks},commerceNow);assert.equal(m.results[0].reason,'COMPOSITION_SCOPE_UNAVAILABLE');
 await assert.rejects(sourceReadiness(w,{cohort:'SALES_READY',checks},commerceNow),/SOURCE_READINESS_BLOCKED/);
});

test('opening-media candidate registration cannot call a no-photo first-contact task sales-ready',async()=>{
 const w=world(),spec={version:2,task:{purpose:'SALE',productId:'SM613'},cohort:'SALES_READY',checks:[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}]};
 const manifest=await sourceReadiness(w,spec,commerceNow),pop={scenarios:[{mode:'SINGLE',turns:[{initialProductCodes:['SM613']}],judgeContext:{sourceReadiness:manifest}}]};
 await assert.rejects(assertPopulationReadiness(w,pop,commerceNow,{version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'}),/OPENING_MEDIA_READINESS_REQUIRED/);
});

test('discovery/task scope needs photos even without initial product codes',async()=>{
 const w=world(),spec={version:2,task:{purpose:'SALE',productId:'SM613'},cohort:'SALES_READY',checks:[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}]};
 const manifest=await sourceReadiness(w,spec,commerceNow),scenario={mode:'SINGLE',turns:[{initialProductCodes:[]}],judgeContext:{sourceReadiness:manifest,sourceRequirements:{kind:'DISCOVERY_POOL',productCodes:['SM613']}}};
 await assert.rejects(assertPopulationReadiness(w,{scenarios:[scenario]},commerceNow,{version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'}),/OPENING_MEDIA_READINESS_REQUIRED/);
 delete spec.task.productId;scenario.judgeContext.sourceReadiness=await sourceReadiness(w,spec,commerceNow);
 await assert.rejects(assertPopulationReadiness(w,{scenarios:[scenario]},commerceNow,{version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'}),/OPENING_MEDIA_READINESS_REQUIRED/);
});
test('v3 readiness executes post-cart colours and the entire declared discovery media scope',async()=>{
 const w=world(),p=w.products[0];p.images=[{url:'https://content.pancake.vn/readiness.jpg',role:'PRIMARY',angle:'FRONT',imageType:'MODEL',intents:[],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:'a'.repeat(64),observedAt:commerceNow.toISOString()}];
 w.snapshots.SM613.offers.DIRECT.rows[0].color='__NO_COLOR__';
 const selection={facet:'SELECTION',productId:'SM613',offerType:'DIRECT',size:'M',color:'__NO_COLOR__'};
 const spec={version:3,task:{purpose:'SALE',productId:'SM613'},cohort:'SALES_READY',checks:[selection],executionPaths:[
  {kind:'POST_CART',selections:[selection]},{kind:'DISCOVERY',productIds:['SM613']}]};
 const before=structuredClone(w),m=await sourceReadiness(w,spec,commerceNow);assert.equal(m.executionPaths.length,2);assert(m.executionPaths.every(p=>p.status==='AVAILABLE'));assert.deepEqual(w,before);
 w.snapshots.SM613.offers.DIRECT.rows[0].color='navy';p.colors=['navy','red'];spec.checks[0].color='navy';spec.executionPaths[0].selections[0].color='navy';
 await assert.rejects(sourceReadiness(w,spec,commerceNow),/SOURCE_READINESS_BLOCKED/);
 // Generic image readiness alone cannot establish a colour-bound cart path.
 const gap=await sourceReadiness(w,{...spec,cohort:'SOURCE_UNAVAILABLE'},commerceNow);assert.equal(gap.executionPaths[0].status,'FAILED');
 const second=structuredClone(p);second.productId='SECOND';second.canonicalCode='SECOND';second.images=[];w.products.push(second);
 spec.executionPaths=[{kind:'DISCOVERY',productIds:['SM613','SECOND']}];spec.checks=[{facet:'PRICE',productId:'SM613',offerType:'DIRECT'}];
 await assert.rejects(sourceReadiness(w,spec,commerceNow),/SOURCE_READINESS_BLOCKED/);
});
test('productless acknowledgement/policy needs no invented product, but later discovery and selections cannot use the empty proof',async()=>{
 const w=world(),spec={version:3,task:{purpose:'CUSTOMER_INPUT'},cohort:'SALES_READY',checks:[{facet:'POLICY'}],noProductFactsRequired:true,executionPaths:[]};
 const manifest=await sourceReadiness(w,spec,commerceNow),scenario={mode:'SINGLE',turns:[{initialProductCodes:[]}],judgeContext:{sourceReadiness:manifest,sourceRequirements:{kind:'NO_PRODUCT_FACTS',productCodes:[]}}};
 await assertPopulationReadiness(w,{scenarios:[scenario]},commerceNow,{version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'});
 scenario.judgeContext.sourceRequirements={kind:'DISCOVERY_POOL',productCodes:[]};await assert.rejects(assertPopulationReadiness(w,{scenarios:[scenario]},commerceNow),/EMPTY_PRODUCT_SCOPE/);
 assert.throws(()=>assertTaskReadinessSpec({...spec,checks:[{facet:'SELECTION',productId:'SM613',offerType:'DIRECT'}]}),/EMPTY_PRODUCT_SCOPE/);
});


test('conditional later-cart prerequisite never stands in for first-contact media readiness',async()=>{
 const w=world();w.products[0].images=[];
 const selection={facet:'SELECTION',productId:'SM613',offerType:'DIRECT',size:'M',color:'navy'};
 const spec={version:3,task:{purpose:'CUSTOMER_INPUT'},cohort:'SALES_READY',checks:[selection],executionPaths:[{kind:'POST_CART',selections:[selection],afterAcceptedReply:true}]};
 const r=await sourceReadiness(w,spec,commerceNow,OPENING_PRODUCT_MEDIA_RULE);
 assert.equal(r.executionPaths[0].status,'AVAILABLE');assert.equal(r.executionPaths[0].conditionalOn,'ACCEPTED_PRIOR_CUSTOMER_REPLY');
 const immediate=structuredClone(spec);delete immediate.executionPaths[0].afterAcceptedReply;
 await assert.rejects(sourceReadiness(w,immediate,commerceNow,OPENING_PRODUCT_MEDIA_RULE),/SOURCE_READINESS_BLOCKED/);
 for(const value of [false,'true',1]){const forged=structuredClone(spec);forged.executionPaths[0].afterAcceptedReply=value;await assert.rejects(sourceReadiness(w,forged,commerceNow,OPENING_PRODUCT_MEDIA_RULE),/EXECUTION_PATH/);}
});
