// Isolated evaluation input supplements. No shop-source writes or customer sends.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HandoffMatrixAdminContentV1Schema,AdminArtifactVersionV1Schema,AdminActivePointerV1Schema} from '@lana/contracts';
import {isolatedHandoffRecords} from '../single-agent-commerce-read-only/candidate-handoff.mjs';
import {digest} from './qualification.mjs';
const kind='OWNER_APPROVED_TEST_FEEDBACK_HANDOFF_V1';
const candidate=()=>JSON.parse(readFileSync(new URL('../single-agent-commerce-read-only/handoff-matrix.candidate.json',import.meta.url)));
const sourceUuid=seed=>{const h=digest(seed);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
function validate(config){
 assert(config&&Object.keys(config).sort().join(',')==='approvalRef,feedback,handoffCandidateHash'&&
  typeof config.approvalRef==='string'&&config.approvalRef.trim()&&config.approvalRef.length<=256&&
  Array.isArray(config.feedback)&&config.feedback.length>0&&config.feedback.length<=4&&/^[a-f0-9]{64}$/.test(config.handoffCandidateHash),'TEST_SUPPORT_CONFIG');
 const keys=new Set();
 for(const e of config.feedback){
  assert(e&&Object.keys(e).sort().join(',')==='asset,componentSku,offerType,productTitles'&&e.productTitles&&Object.keys(e.productTitles).length>0&&
   Object.keys(e.productTitles).length<=4&&typeof e.componentSku==='string'&&e.componentSku.trim()&&typeof e.offerType==='string'&&e.offerType.trim()&&
   e.asset&&Object.keys(e.asset).sort().join(',')==='partsVisible,sha256,url'&&/^[a-f0-9]{64}$/.test(e.asset.sha256)&&
   typeof e.asset.url==='string'&&e.asset.url.startsWith('https://')&&JSON.stringify(e.asset.partsVisible)==='["AO"]','TEST_SUPPORT_FEEDBACK_CONFIG');
  for(const [id,title]of Object.entries(e.productTitles)){
   assert(/^[A-Z0-9]{3,24}$/.test(id)&&typeof title==='string'&&title.trim()&&!keys.has(id),'TEST_SUPPORT_FEEDBACK_SCOPE');keys.add(id);
  }
 }
}
export function supplementTestFeedbackProduct(product,config){
 if(!config)return product;validate(config);
 const entry=config.feedback.find(e=>Object.hasOwn(e.productTitles,product?.productId));if(!entry)return product;
 assert(product.title===entry.productTitles[product.productId],'TEST_SUPPORT_PRODUCT_CHANGED');
 const result=structuredClone(product),images=result.images.filter(i=>i.url===entry.asset.url),image=images[0];
 assert(images.length===1&&image.sourceContentSha256===entry.asset.sha256&&image.reviewStatus==='APPROVED'&&image.metadataVerified&&
  image.imageType!=='SIZE_GUIDE'&&image.revalidation?.status!=='INVALID'&&JSON.stringify(image.partsVisible)===JSON.stringify(entry.asset.partsVisible),'TEST_SUPPORT_IMAGE_CHANGED');
 image.feedback=true;
 result.catalogVersion=`isolated-test-feedback:${digest(entry).slice(0,16)}:${product.catalogVersion}`;return result;
}
export function assertTestSupportWorld(world){
 const config=world.config?.testSupportSources;if(!config&&!world.testSupportSupplement)return;validate(config);
 assert(world.testSupportSupplement?.kind===kind&&world.testSupportSupplement.configurationHash===digest(config),'TEST_SUPPORT_PROVENANCE');
}
export function supplementTestSupportWorld(world){
 const config=world.config?.testSupportSources;if(!config)return world;validate(config);
 assert(!world.testSupportSupplement,'TEST_SUPPORT_ALREADY_APPLIED');
 assert.deepEqual(world.sourceEvidenceHashes,[digest(world.products),digest(world.snapshots),digest(world.policyRecords),
  ...(world.search?.status==='FROZEN_NATIVE_INDEX'?[digest(world.search)]:[])],'TEST_SUPPORT_SOURCE_CHANGED');
 const approved=HandoffMatrixAdminContentV1Schema.parse(candidate());
 assert(digest(approved)===config.handoffCandidateHash&&approved.rules.every(r=>r.customerMessagePolicy==='SILENT_HANDOFF'&&r.holdingReply===null),'TEST_SUPPORT_CANDIDATE_CHANGED');
 const result=structuredClone(world);
 for(const e of config.feedback)for(const id of Object.keys(e.productTitles)){
  const product=result.products.find(p=>p.productId===id),rows=result.snapshots[id]?.offers[e.offerType]?.rows;
  assert(product&&rows?.length&&rows.every(r=>r.component_1_sku===e.componentSku&&!r.component_2_sku),'TEST_SUPPORT_COMPONENT_CHANGED');
  result.products[result.products.indexOf(product)]=supplementTestFeedbackProduct(product,config);
 }
 const isolated=isolatedHandoffRecords(result.policyRecords,{pageId:world.config.scope.pageId,candidate:approved});
 const record=isolated.records.find(r=>r.version.artifactKind==='HANDOFF_MATRIX'),prior=result.policyRecords.find(r=>r.version.artifactKind==='HANDOFF_MATRIX');
 // Stable input preparation; keep existing pointer identity/tags, never renew the source clock.
 const versionId=sourceUuid({pageId:world.config.scope.pageId,prior:prior?.version.versionId??null,hash:isolated.candidateHash});
 record.version.schemaVersion=1;record.pointer.schemaVersion=1;
 record.version.versionId=versionId;record.pointer.versionId=versionId;
 record.version.createdAt=new Date(record.version.createdAt).toISOString();record.version.updatedAt=new Date(record.version.updatedAt).toISOString();
 record.pointer.updatedAt=new Date(record.pointer.updatedAt).toISOString();
 if(!prior)record.pointer.pointerId=sourceUuid({kind:'pointer',pageId:world.config.scope.pageId,artifactKey:record.pointer.artifactKey});
 AdminArtifactVersionV1Schema.parse(record.version);AdminActivePointerV1Schema.parse(record.pointer);
 result.policyRecords=isolated.records;
 result.testSupportSupplement={kind,configurationHash:digest(config),approvalRef:config.approvalRef,baseWorldHash:digest(world),
  handoffContentHash:record.version.contentHash,handoffVersionId:versionId,
  meaning:'Owner-approved isolated test feedback; not verified customer provenance. Handoff policy is active only in the test clone.'};
 result.sourceEvidenceHashes=[digest(result.products),digest(result.snapshots),digest(result.policyRecords),
  ...(result.search?.status==='FROZEN_NATIVE_INDEX'?[digest(result.search)]:[])];return result;
}
