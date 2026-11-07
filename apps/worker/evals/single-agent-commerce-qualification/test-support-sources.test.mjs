import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixtureProduct,fixturePolicyPointers,commerceScope,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
import {RuntimePolicyResolver} from '@lana/chat-runtime';
import {digest} from './qualification.mjs';
import {supplementTestSupportWorld} from './test-support-sources.mjs';
import {eligibleCommerceMedia} from '../../dist/single-agent-commerce-media-eligibility.js';
import {selectCommerceHandoff} from '../../dist/single-agent-commerce-handoff.js';
import {supplementTestColorWorld} from './test-color-source.mjs';
import {frozenFacts} from './frozen-world.mjs';
import {createFrozenSearch} from './frozen-search.mjs';
import {stableProductDocumentFromQdrantPayload} from '@lana/business-tools';
const candidate=JSON.parse(readFileSync(new URL('../single-agent-commerce-read-only/handoff-matrix.candidate.json',import.meta.url)));
const url='https://content.pancake.vn/component-feedback-fixture.jpg',sha='a'.repeat(64);
function fixture(){
 const f=fixtureProduct();f.product.images=[{url,role:'ADDITIONAL',angle:'CLOSEUP',imageType:'DETAIL',intents:['DETAIL'],partsVisible:['AO'],sortOrder:0,qualityScore:1,
  feedback:false,sourceContentSha256:sha,reviewStatus:'APPROVED',metadataVerified:true,observedAt:commerceNow.toISOString()}];
 f.snapshot.offers.AO={...f.snapshot.offers.DIRECT,rows:[{...f.snapshot.offers.DIRECT.rows[0],component_1_sku:'SM613-AO',component_2_sku:'',price_sku:'SM613-AO',inventory_source:'PANCAKE_DIRECT'}]};
 const config={scope:commerceScope(),channel:'PUBLISHED',testSupportSources:{approvalRef:'owner-test-support',handoffCandidateHash:digest(candidate),
  feedback:[{productTitles:{SM613:f.product.title},offerType:'AO',componentSku:'SM613-AO',asset:{url,sha256:sha,partsVisible:['AO']}}]}};
 const policyRecords=fixturePolicyPointers();for(const r of policyRecords){r.pointer.channel='PUBLISHED';r.version.lifecycle='PUBLISHED';}
 const w={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',config,products:[f.product],snapshots:{SM613:f.snapshot},policyRecords,sourceWrites:0,providerRequests:0};
 w.sourceEvidenceHashes=[digest(w.products),digest(w.snapshots),digest(policyRecords)];return w;
}
test('test feedback is exact-component scoped and raw metadata, snapshots and clocks stay unchanged',()=>{
 const w=fixture(),before=structuredClone(w),out=supplementTestSupportWorld(w);
 assert.deepEqual(w,before);assert.deepEqual(out.snapshots,w.snapshots);
 const product=out.products[0];assert.equal(product.images[0].feedback,true);
 assert.equal(product.images[0].observedAt,w.products[0].images[0].observedAt);
 assert.equal(eligibleCommerceMedia(product,{subjectRef:'SM613',intent:'FEEDBACK',componentRole:'TOP'},commerceNow.getTime(),['content.pancake.vn']).images.length,1);
 assert.equal(eligibleCommerceMedia(product,{subjectRef:'SM613',intent:'FEEDBACK',componentRole:'PANTS'},commerceNow.getTime(),['content.pancake.vn']).images.length,0);
 assert.match(out.testSupportSupplement.meaning,/not verified customer/);
 assert.deepEqual(supplementTestSupportWorld(w),out,'same inputs give stable policy identities and world hash');
});
test('active test policy resolves the reviewed silent matrix for every configured reason',async()=>{
 const w=supplementTestSupportWorld(fixture());
 const r=await new RuntimePolicyResolver({loadActivePointers:async()=>structuredClone(w.policyRecords)},{enabled:true,publishedEnabled:true})
  .resolve({pageId:w.config.scope.pageId,channel:'PUBLISHED',now:new Date('2026-11-04T03:00:00.000Z')});
 assert.equal(r.status,'RESOLVED');assert.deepEqual(r.bundle.artifacts.handoffMatrix,candidate);
 for(const rule of candidate.rules){
  if(rule.reason==='ADMIN_REQUEST'){
   assert.throws(()=>selectCommerceHandoff(r.bundle,w.config.scope,rule.reason,new Date('2026-11-04T03:00:00.000Z')),/HANDOFF_REASON/);continue;
  }
  const decision=selectCommerceHandoff(r.bundle,w.config.scope,rule.reason,new Date('2026-11-04T03:00:00.000Z'));
  assert.equal(decision.customerMessagePolicy,'SILENT_HANDOFF');assert.deepEqual(decision.customerMessages,[]);
 }
});
test('changed asset or candidate/approval fails without modifying the raw world',()=>{
 for(const fault of ['hash','sku','proof','candidate','approval']){
  const w=fixture();
  if(fault==='hash')w.products[0].images[0].sourceContentSha256='b'.repeat(64);
  if(fault==='sku')w.snapshots.SM613.offers.AO.rows[0].component_1_sku='OTHER-AO';
  if(fault==='proof')w.products[0].images[0].revalidation={status:'INVALID'};
  if(fault==='candidate')w.config.testSupportSources.handoffCandidateHash='b'.repeat(64);
  if(fault==='approval')w.config.testSupportSources.approvalRef='';
  w.sourceEvidenceHashes=[digest(w.products),digest(w.snapshots),digest(w.policyRecords)];
  const before=structuredClone(w);assert.throws(()=>supplementTestSupportWorld(w),/TEST_SUPPORT/);assert.deepEqual(w,before);
 }
});
test('colour and feedback composition stays identical in native lookup/search and requires both provenance markers',async()=>{
 const w=fixture(),id='SM613',title=w.products[0].title,entry=w.config.testSupportSources.feedback[0];
 w.config.testColorSources=[{approvalRef:'white-test',productTitles:entry.productTitles,offerType:'AO',componentSku:entry.componentSku,sourceColor:'__NO_COLOR__',color:'TRẮNG',assets:[entry.asset]}];
 w.snapshots.SM613.offers.AO.rows[0].color='__NO_COLOR__';
 Object.assign(w.config,{qdrantCollection:'unit',vertex:{embeddingDimension:2},searchThresholds:{textMinScore:.7,imageMinScore:.7,minTopGap:.04,maxCandidates:3}});
 const payload={active:true,product_id:id,ma_sp:id,title,catalog_version:'unit',source_updated_at:commerceNow.toISOString(),image_url:url,
  image_type:'DETAIL',image_angle:'CLOSEUP',image_parts_visible:['AO'],image_content_sha256:sha,image_metadata_review_status:'APPROVED',metadata_verified:true};
 const points=[{id:1,payload,vector:{product_text:[1,0]}}];
 w.search={version:1,status:'FROZEN_NATIVE_INDEX',distance:'Cosine',dimension:2,queryVector:'product_text',ranking:'EXACT_COSINE_SHARED_NATIVE_ADAPTER_V1',points,pointsHash:digest(points)};
 w.products=[stableProductDocumentFromQdrantPayload(payload)];
 w.sourceEvidenceHashes=[digest(w.products),digest(w.snapshots),digest(w.policyRecords),digest(w.search)];
 const out=supplementTestSupportWorld(supplementTestColorWorld(w)),port=createFrozenSearch(out,{embedText:async()=>[1,0]});
 assert.deepEqual(await port.catalog.findByExactCode(id),out.products[0]);
 assert.deepEqual((await port.search.searchText('Cho chị xem áo.')).product,out.products[0]);
 assert.equal(eligibleCommerceMedia(out.products[0],{subjectRef:id,intent:'FEEDBACK',componentRole:'TOP',color:'trắng'},commerceNow.getTime(),['content.pancake.vn']).images.length,1);
 frozenFacts(out);const missing=structuredClone(out);delete missing.testSupportSupplement;
 assert.throws(()=>frozenFacts(missing),/TEST_SUPPORT_PROVENANCE/);assert.deepEqual(out.search,w.search);
});
