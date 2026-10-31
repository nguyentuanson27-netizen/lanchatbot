// Synthetic sources and actual eligibility code; zero provider or source writes.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureProduct,fixturePolicyPointers,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
import {sourceReadiness,assertSourceReadiness} from './source-readiness.mjs';
const world=()=>{const f=fixtureProduct();return {config:{scope:commerceScope(),channel:'CANARY_SHADOW',maxFactAgeSeconds:1200},
 products:[f.product],snapshots:{SM613:f.snapshot},policyRecords:fixturePolicyPointers()};};
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
