// Isolated evaluation data only. No source-service writes or timestamp renewal.
import assert from 'node:assert/strict';
import {CatalogSnapshotV3Schema,normalizeCatalogToken} from '@lana/business-tools';
import {digest} from './qualification.mjs';
const kind='OWNER_APPROVED_ISOLATED_COLOR_V1';
function validate(entries){
 assert(Array.isArray(entries)&&entries.length>0&&entries.length<=4,'TEST_COLOR_CONFIG');
 const seen=new Set();
 for(const e of entries){
  assert(e&&Object.keys(e).length===7&&Object.keys(e).every(k=>['approvalRef','componentSku','offerType','sourceColor','color','productTitles','assets'].includes(k))&&
   typeof e.approvalRef==='string'&&e.approvalRef.trim()&&e.approvalRef.length<=256&&
   typeof e.componentSku==='string'&&e.componentSku.trim()&&e.componentSku.length<=128&&typeof e.offerType==='string'&&e.offerType.trim()&&e.sourceColor==='__NO_COLOR__'&&
   typeof e.color==='string'&&e.color.trim()&&Buffer.byteLength(e.color)<=64&&e.color!==e.sourceColor&&
   e.productTitles&&Object.keys(e.productTitles).length>0&&Object.keys(e.productTitles).length<=4&&
   Object.values(e.productTitles).every(t=>typeof t==='string'&&t.trim())&&Array.isArray(e.assets)&&e.assets.length>0&&e.assets.length<=4,'TEST_COLOR_CONFIG');
  for(const id of Object.keys(e.productTitles)){assert(/^[A-Z0-9]{3,24}$/.test(id)&&!seen.has(id),'TEST_COLOR_OVERLAPPING_CONFIG');seen.add(id);}
 }
}
/** Applies only an explicitly pinned, approved image of the separate shirt. Parent/set colours are not rewritten. */
export function supplementTestColorProduct(product,entries){
 if(!entries)return product;validate(entries);
 const entry=entries.find(e=>Object.hasOwn(e.productTitles,product?.productId));if(!entry)return product;
 assert(product.title===entry.productTitles[product.productId],'TEST_COLOR_TITLE_CHANGED');
 const result=structuredClone(product);
 for(const asset of entry.assets){
  assert(asset&&Object.keys(asset).sort().join(',')==='partsVisible,sha256,url','TEST_COLOR_ASSET_CONFIG');
  const matches=result.images.filter(i=>i.url===asset.url),image=matches[0];
  assert(matches.length===1&&/^[a-f0-9]{64}$/.test(asset.sha256)&&image.sourceContentSha256===asset.sha256&&
   image.reviewStatus==='APPROVED'&&image.metadataVerified&&image.revalidation?.status!=='INVALID'&&
   JSON.stringify(image.partsVisible)===JSON.stringify(asset.partsVisible)&&JSON.stringify(asset.partsVisible)==='["AO"]'&&
   (!image.colorBinding||image.colorBinding.status==='ABSENT'||image.colorBinding.status==='VALID'&&
    normalizeCatalogToken(image.colorBinding.color)===normalizeCatalogToken(entry.color)&&image.colorBinding.sha256===asset.sha256),'TEST_COLOR_IMAGE_CHANGED');
  image.colorBinding={status:'VALID',color:entry.color,sha256:asset.sha256};
 }
 result.catalogVersion=`isolated-test-color:${digest(entry).slice(0,16)}:${product.catalogVersion}`;
 return result;
}
export function assertTestColorWorld(world){
 const entries=world.config?.testColorSources;if(!entries&&!world.testSourceSupplement)return;
 validate(entries);
 assert(world.testSourceSupplement?.kind===kind&&world.testSourceSupplement.configurationHash===digest(entries), 'TEST_COLOR_PROVENANCE');
}
export function supplementTestColorWorld(world){
 const entries=world.config?.testColorSources;if(!entries)return world;validate(entries);
 assert(!world.testSourceSupplement,'TEST_COLOR_ALREADY_APPLIED');
 assert.deepEqual(world.sourceEvidenceHashes,[digest(world.products),digest(world.snapshots),digest(world.policyRecords),
  ...(world.search?.status==='FROZEN_NATIVE_INDEX'?[digest(world.search)]:[])],'TEST_COLOR_RAW_SOURCE_CHANGED');
 const result=structuredClone(world),changedRows=[];
 for(const entry of entries){
  let counterRows=null;
  for(const id of Object.keys(entry.productTitles)){
   const product=result.products.find(p=>p.productId===id);assert(product,'TEST_COLOR_PRODUCT_MISSING');
   const s=result.snapshots[id];assert(s&&s.product_id===id&&s.offers[entry.offerType],'TEST_COLOR_SNAPSHOT_MISSING');
   const offer=s.offers[entry.offerType],rows=offer.rows.filter(r=>r.color===entry.sourceColor);
   assert(rows.length&&rows.every(r=>r.component_1_sku===entry.componentSku&&r.price_sku===entry.componentSku&&
    !r.component_2_sku&&r.inventory_source==='PANCAKE_DIRECT'&&r.size&&Number.isFinite(r.stock_quantity)&&r.stock_quantity>=0)&&
    new Set(rows.map(r=>r.size)).size===rows.length&&!offer.rows.some(r=>normalizeCatalogToken(r.color)===normalizeCatalogToken(entry.color)),'TEST_COLOR_ROWS_CHANGED');
   const counters=rows.map(r=>({size:r.size,stock:r.stock_quantity,list:r.list_price,sale:r.sale_price,status:r.stock_status})).sort((a,b)=>a.size.localeCompare(b.size));
   if(counterRows)assert.deepEqual(counters,counterRows,'TEST_COLOR_SHARED_COUNTER_DISAGREEMENT');else counterRows=counters;
   for(const row of rows){changedRows.push({productId:id,componentSku:entry.componentSku,size:row.size,from:row.color,to:entry.color});row.color=entry.color;}
   s.release_id=`isolated-test-color:${digest(entry).slice(0,16)}:${s.release_id}`;
   CatalogSnapshotV3Schema.parse(s);
   result.products[result.products.indexOf(product)]=supplementTestColorProduct(product,entries);
  }
 }
 result.testSourceSupplement={kind,configurationHash:digest(entries),publicSourceWorldHash:digest(world),
  approvalRefs:entries.map(e=>e.approvalRef),changedRows,meaning:'Owner-approved test assumption; not verified physical stock colour or source publication.'};
 result.sourceEvidenceHashes=[digest(result.products),digest(result.snapshots),digest(result.policyRecords),
  ...(result.search?.status==='FROZEN_NATIVE_INDEX'?[digest(result.search)]:[])];
 return result;
}
