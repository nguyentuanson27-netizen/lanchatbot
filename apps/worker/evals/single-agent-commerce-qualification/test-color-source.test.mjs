import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureProduct,commerceNow} from '../../dist/single-agent-commerce.test-support.js';
import {supplementTestColorWorld} from './test-color-source.mjs';
import {frozenFacts} from './frozen-world.mjs';
import {eligibleCommerceMedia} from '../../dist/single-agent-commerce-media-eligibility.js';
import {digest} from './qualification.mjs';
import {createFrozenSearch} from './frozen-search.mjs';
import {stableProductDocumentFromQdrantPayload} from '@lana/business-tools';
import {cartSelectionsHaveIndependentStockV2} from '../../dist/realtime-sales-catalog.js';
const url='https://content.pancake.vn/test-shirt-detail.jpg',sha='a'.repeat(64);
function fixture(){
 const config={scope:{shopAlias:'LANA'},testColorSources:[{approvalRef:'owner-test-white',
  productTitles:{AA100:'Áo thử A',BB200:'Áo thử B'},offerType:'AO',componentSku:'PART-AO',sourceColor:'__NO_COLOR__',color:'TRẮNG',
  assets:[{url,sha256:sha,partsVisible:['AO']}]}]},products=[],snapshots={};
 for(const [id,title]of Object.entries(config.testColorSources[0].productTitles)){
  const f=fixtureProduct(id);f.product.title=title;
  f.product.images=[{url,role:'ADDITIONAL',angle:'CLOSEUP',imageType:'DETAIL',intents:['DETAIL'],partsVisible:['AO'],sortOrder:0,qualityScore:1,
   feedback:false,observedAt:commerceNow.toISOString(),reviewStatus:'APPROVED',metadataVerified:true,sourceContentSha256:sha}];
  const row={...f.snapshot.offers.DIRECT.rows[0],offer_type:'AO',component_1_sku:'PART-AO',component_2_sku:'',price_sku:'PART-AO',color:'__NO_COLOR__',inventory_source:'PANCAKE_DIRECT'};
  f.snapshot.offers={...f.snapshot.offers,AO:{...f.snapshot.offers.DIRECT,rows:[row,{...row,color:'BE',stock_quantity:0}]}};
  products.push(f.product);snapshots[id]=f.snapshot;
 }
 const world={kind:'FROZEN_PUBLIC_BUSINESS_WORLD',config,products,snapshots,policyRecords:[],capturedAt:commerceNow.toISOString(),sourceWrites:0,providerRequests:0};
 world.sourceEvidenceHashes=[digest(products),digest(snapshots),digest([])];return world;
}
test('approved test source adds white without changing stock, prices, other offers, clocks or parent colours',async()=>{
 const world=fixture(),before=structuredClone(world),result=supplementTestColorWorld(world),selections=[];
 assert.deepEqual(world,before);
 for(const id of ['AA100','BB200']){
  const original=world.snapshots[id],s=result.snapshots[id];
  assert.deepEqual(s.offers.AO.rows,[{...original.offers.AO.rows[0],color:'TRẮNG'},original.offers.AO.rows[1]]);
  assert.deepEqual(s.offers.DIRECT,original.offers.DIRECT);assert.equal(s.synced_at,original.synced_at);
  const product=result.products.find(p=>p.productId===id);assert.deepEqual(product.colors,world.products.find(p=>p.productId===id).colors);
  assert.equal(product.images[0].colorBinding.color,'TRẮNG');assert.equal(product.images[0].colorBinding.sha256,sha);
  assert.equal(eligibleCommerceMedia(product,{subjectRef:id,intent:'DETAIL',componentRole:'TOP',color:'trắng'},commerceNow.getTime(),['content.pancake.vn']).images.length,1);
  const selected=await frozenFacts(result).resolveCartSelection({shopAlias:'LANA',productId:id,offerType:'AO',size:original.offers.AO.rows[0].size,color:'trắng',quantity:1,lineId:'00000000-0000-4000-8000-000000000001'},commerceNow);
  assert.equal(selected.status,'READY');assert.equal(selected.stockAvailableQuantity,original.offers.AO.rows[0].stock_quantity);
  selections.push(selected);
 }
 assert.equal(result.testSourceSupplement.kind,'OWNER_APPROVED_ISOLATED_COLOR_V1');
 assert.deepEqual(result.policyRecords,world.policyRecords);assert.notEqual(digest(result),digest(world));
 assert.equal(cartSelectionsHaveIndependentStockV2(selections),false,'same shirt stock across parents is never an independent pool');
 const missing=structuredClone(result);delete missing.testSourceSupplement;assert.throws(()=>frozenFacts(missing),/TEST_COLOR_PROVENANCE/);
});
test('supplement rejects changed titles, SKU/hash/approval, conflicting rows and revoked image proof',()=>{
 for(const fault of ['title','sku','hash','approval','conflict','proof','stock-disagreement']){
  const w=fixture();
  if(fault==='title')w.products[0].title='Khác';
  if(fault==='sku')w.snapshots.AA100.offers.AO.rows[0].component_1_sku='OTHER-AO';
  if(fault==='hash')w.products[0].images[0].sourceContentSha256='b'.repeat(64);
  if(fault==='approval')w.config.testColorSources[0].approvalRef='';
  if(fault==='conflict')w.snapshots.AA100.offers.AO.rows.push({...w.snapshots.AA100.offers.AO.rows[0],color:'TRẮNG'});
  if(fault==='proof')w.products[0].images[0].revalidation={status:'INVALID'};
  if(fault==='stock-disagreement')w.snapshots.BB200.offers.AO.rows[0].stock_quantity++;
  // Rehash controlled negative inputs so these checks exercise semantic source guards rather than only the outer digest.
  w.sourceEvidenceHashes=[digest(w.products),digest(w.snapshots),digest(w.policyRecords)];
  const before=structuredClone(w);assert.throws(()=>supplementTestColorWorld(w),/TEST_COLOR/);assert.deepEqual(w,before);
 }
});
test('no configured assumption leaves historical world byte-equivalent',()=>{
 const w=fixture();delete w.config.testColorSources;assert.equal(supplementTestColorWorld(w),w);
});
test('native exact lookup and search expose the same supplemented data without rewriting the public index',async()=>{
 const w=fixture();Object.assign(w.config,{qdrantCollection:'unit',vertex:{embeddingDimension:2},searchThresholds:{textMinScore:.7,imageMinScore:.7,minTopGap:.04,maxCandidates:3}});
 const points=w.products.map((p,i)=>({id:i+1,vector:{product_text:i?[0,1]:[1,0]},payload:{active:true,product_id:p.productId,ma_sp:p.productId,title:p.title,catalog_version:'unit',
  image_url:url,image_type:'DETAIL',image_angle:'CLOSEUP',image_parts_visible:['AO'],image_content_sha256:sha,image_metadata_review_status:'APPROVED',metadata_verified:true,source_updated_at:commerceNow.toISOString()}}));
 w.search={version:1,status:'FROZEN_NATIVE_INDEX',distance:'Cosine',dimension:2,queryVector:'product_text',ranking:'EXACT_COSINE_SHARED_NATIVE_ADAPTER_V1',points,pointsHash:digest(points)};
 w.products=points.map(p=>stableProductDocumentFromQdrantPayload(p.payload));
 w.sourceEvidenceHashes=[digest(w.products),digest(w.snapshots),digest(w.policyRecords),digest(w.search)];
 const before=structuredClone(w.search),out=supplementTestColorWorld(w),port=createFrozenSearch(out,{embedText:async()=>[1,0]});
 assert.deepEqual(await port.catalog.findByExactCode('AA100'),out.products[0]);
 assert.deepEqual((await port.search.searchText('Cho chị xem áo.')).product,out.products[0]);
 assert.deepEqual(out.search,before);
});
