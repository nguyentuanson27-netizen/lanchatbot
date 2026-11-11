// New owner-approved test assets, not renewal of a mismatched registry proof.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {digest} from './qualification.mjs';
export function assertTestMediaWorld(w){
 const c=w.config?.testMediaSources;if(!c&&!w.testMediaSupplement)return;
 assert(c?.approvalRef&&Array.isArray(c.assets)&&c.assets.length>0&&c.assets.length<=4,'TEST_MEDIA_CONFIG');
 assert(w.testMediaSupplement?.kind==='OWNER_APPROVED_NEW_TEST_MEDIA_V1'&&w.testMediaSupplement.configurationHash===digest(c),'TEST_MEDIA_PROVENANCE');
 for(const a of w.testMediaSupplement.assets)assert(/^[a-f0-9]{64}$/.test(a.sha256)&&Number.isFinite(Date.parse(a.checkedAt))&&c.assets.some(v=>v.productId===a.productId&&v.url===a.url),'TEST_MEDIA_ASSET');
}
export function supplementTestMediaProduct(p,w){
 if(!w.testMediaSupplement)return p;assertTestMediaWorld(w);
 const assets=w.testMediaSupplement.assets.filter(a=>a.productId===p?.productId);if(!assets.length)return p;
 const result=structuredClone(p);
 for(const a of assets){const c=w.config.testMediaSources.assets.find(c=>c.productId===a.productId&&c.url===a.url),i=result.images.find(i=>i.url===a.url);
  assert(i&&i.sourceContentSha256===c.priorSha256&&i.metadataVerified&&i.reviewStatus==='APPROVED'&&i.imageType!=='SIZE_GUIDE','TEST_MEDIA_SOURCE_CHANGED');
  i.sourceContentSha256=a.sha256;i.revalidation={status:'VALID',checkedAt:a.checkedAt};
 }
 result.catalogVersion=`isolated-test-media:${digest(assets).slice(0,16)}:${result.catalogVersion}`;return result;
}
export async function captureTestMediaWorld(w,{prepare,clock=()=>new Date()}){
 const c=w.config?.testMediaSources;if(!c)return w;
 assert(!w.testMediaSupplement&&c.approvalRef&&c.assets.length<=4,'TEST_MEDIA_CONFIG');
 const assets=[];
 for(const a of c.assets){const i=w.products.find(p=>p.productId===a.productId)?.images.find(i=>i.url===a.url);
  assert(i&&i.sourceContentSha256===a.priorSha256&&i.metadataVerified&&i.reviewStatus==='APPROVED'&&i.imageType!=='SIZE_GUIDE','TEST_MEDIA_SOURCE_CHANGED');
  const bytes=await prepare(a.url);assert(bytes.buffer?.length,'TEST_MEDIA_BYTES');
  assets.push({productId:a.productId,url:a.url,sha256:createHash('sha256').update(bytes.buffer).digest('hex'),checkedAt:clock().toISOString()});
 }
 const r=structuredClone(w);r.testMediaSupplement={kind:'OWNER_APPROVED_NEW_TEST_MEDIA_V1',configurationHash:digest(c),approvalRef:c.approvalRef,baseWorldHash:digest(w),assets,
  meaning:'New isolated test assets from actual canonical bytes; not a successful old-hash revalidation or live publication.'};
 r.products=r.products.map(p=>supplementTestMediaProduct(p,r));
 r.sourceEvidenceHashes=[digest(r.products),digest(r.snapshots),digest(r.policyRecords),...(r.search?.status==='FROZEN_NATIVE_INDEX'?[digest(r.search)]:[])];return r;
}
export function reuseTestMediaWorld(w,previous){
 assertTestMediaWorld(previous);
 assert(!w.testMediaSupplement&&previous.testMediaSupplement&&
  digest(w.config?.testMediaSources)===previous.testMediaSupplement.configurationHash,'TEST_MEDIA_REUSE_CONFIG');
 const result=structuredClone(w);
 result.testMediaSupplement={...structuredClone(previous.testMediaSupplement),baseWorldHash:digest(w),
  proofReuse:{previousWorldHash:digest(previous),policy:'REUSE_OWNER_APPROVED_TEST_ASSET_ORIGINAL_CHECK_TIME'}};
 result.products=result.products.map(product=>supplementTestMediaProduct(product,result));
 result.sourceEvidenceHashes=[digest(result.products),digest(result.snapshots),digest(result.policyRecords),
  ...(result.search?.status==='FROZEN_NATIVE_INDEX'?[digest(result.search)]:[])];
 return result;
}
