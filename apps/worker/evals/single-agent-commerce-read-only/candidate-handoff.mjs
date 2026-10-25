// Eval-only records for the existing isolated DB clone. No source-store writer or policy overlay.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {canonicalJsonV1,HandoffMatrixAdminContentV1Schema} from '@lana/contracts';
export const handoffContentHash=content=>'sha256:'+createHash('sha256').update(canonicalJsonV1(content)).digest('hex');
export function isolatedHandoffRecords(upstream,{pageId,candidate}){
 const approved=HandoffMatrixAdminContentV1Schema.parse(candidate),records=structuredClone(upstream);
 const matrices=records.filter(r=>r.version.artifactKind==='HANDOFF_MATRIX');
 assert(matrices.length<=1,'CANDIDATE_MATRIX_SCOPE_DUPLICATE');
 const prior=matrices[0],content=structuredClone(prior?.version.content??approved);
 const approvedByReason=new Map(approved.rules.map(rule=>[rule.reason,rule]));
 for(const reason of ['CUSTOMER_REQUESTED_HUMAN','SIZE_RULE_UNAVAILABLE','DEPENDENCY_FAILURE','RESPONSE_UNAVAILABLE','PRICE_UNAVAILABLE','STOCK_UNAVAILABLE','ETA_UNAVAILABLE','POLICY_UNAVAILABLE']){
  const delta=approvedByReason.get(reason);assert(delta?.customerMessagePolicy==='HOLDING_REPLY_THEN_HANDOFF'&&delta.holdingReply,'CANDIDATE_HOLDING_REQUIRED');
  const rule=content.rules.find(r=>r.reason===reason);
  if(rule)rule.customerMessagePolicy=delta.customerMessagePolicy;
  else content.rules.push(structuredClone(delta));
 }
 // The candidate owns customer copy for every retained holding rule, including
 // rules inherited from the upstream matrix. Preserve tags and every mode
 // outside the eight owner-approved holding reasons above.
 for(const rule of content.rules){
  if(rule.customerMessagePolicy==='HOLDING_REPLY_THEN_HANDOFF'){
   const copy=approvedByReason.get(rule.reason)?.holdingReply;
   assert(copy,'CANDIDATE_COPY_UNAVAILABLE');
   rule.holdingReply=copy;
  }else rule.holdingReply=null;
 }
 content.sourceMetadata=approved.sourceMetadata;
 HandoffMatrixAdminContentV1Schema.parse(content);
 const artifactKey=prior?.version.artifactKey??'handoff-matrix:c3-opening-candidate',versionId=randomUUID(),at=new Date(approved.sourceMetadata.observedAt);
 const record={version:{...prior?.version,versionId,artifactKey,artifactKind:'HANDOFF_MATRIX',versionNumber:(prior?.version.versionNumber??0)+1,
   lifecycle:'PUBLISHED',revision:1,contentHash:handoffContentHash(content),content,createdBy:'c3-isolated-eval',createdAt:at,updatedAt:at},
  pointer:{...prior?.pointer,pointerId:prior?.pointer.pointerId??randomUUID(),artifactKey,artifactKind:'HANDOFF_MATRIX',pageId,channel:'PUBLISHED',
   versionId,revision:(prior?.pointer.revision??0)+1,updatedBy:'c3-isolated-eval',updatedAt:at}};
 if(prior)records[records.indexOf(prior)]=record;else records.push(record);
 return {records,upstreamHash:prior?handoffContentHash(prior.version.content):null,candidateHash:record.version.contentHash,versionId};
}
