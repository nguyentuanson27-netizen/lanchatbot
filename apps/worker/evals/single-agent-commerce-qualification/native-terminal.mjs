// Evaluation capture only. Customer output comes from accepted transport payloads.
import {createHash} from 'node:crypto';
import {canonicalJsonV1} from '@lana/contracts';
const hash=text=>createHash('sha256').update(text).digest('hex');
const digest=v=>hash(canonicalJsonV1(v));
export function checkoutMediaCapture({result,messages,images,receipts,authority,state,acceptedOutbox,executionIdentity}){
 try{
 const w=result?.checkoutMediaOutput,units=[...messages.map(text=>({kind:'TEXT',text})),...images.map(i=>({kind:'IMAGE',imageUrl:i.url}))];
 if(w?.kind!=='NATIVE_CHECKOUT_MEDIA_V1'||w.requestId!==executionIdentity?.requestId||w.sourceMessageIdHash!==executionIdentity?.sourceMessageIdHash||!images.length||images.length>4||!messages.length||units.length>6||
  result.enqueued!==units.length||authority?.owner!=='BOT'||w.recipient!==authority.recipientHash||w.conversationRevision!==state?.revision||w.salesRevision!==state?.salesRevision||
  typeof w.requestId!=='string'||!w.requestId||typeof w.responseGroupId!=='string'||!w.responseGroupId||!/^[a-f0-9]{64}$/.test(w.sourceMessageIdHash??'')||
  !/^[a-f0-9]{64}$/.test(w.mediaBindingHash??'')||w.payloadHash!==digest(units)||digest(w.messageHashes)!==digest(units.map(digest))||digest(w.imageHashes)!==digest(images.map(i=>hash(i.url)))||
  !Array.isArray(w.operations)||!w.operations.length||new Set(w.operations.map(op=>op.id)).size!==w.operations.length||!w.operations.every(op=>receipts?.some(r=>r.operation_id===op.id&&r.commandKind===op.kind&&r.stateRevisionAfter<=w.salesRevision))||
  !w.operations.some(op=>receipts?.some(r=>r.operation_id===op.id&&r.stateRevisionAfter===w.salesRevision))||
  !Array.isArray(acceptedOutbox)||acceptedOutbox.length!==units.length||new Set(acceptedOutbox.map(r=>r.id)).size!==units.length||
  acceptedOutbox.some((r,i)=>!r.id||!['SENT_ACCEPTED','DELIVERED','READ'].includes(r.status)||r.group!==w.responseGroupId||r.sequence!==i||r.kind!==units[i].kind||r.contentHash!==hash(units[i].text??units[i].imageUrl)||r.mediaBindingHash!==w.mediaBindingHash||r.messageHash!==w.messageHashes[i]||r.bindingRevision!==w.conversationRevision||r.bindingRecipient!==w.recipient))return null;
 return structuredClone(w);
 }catch{return null;}
}
export function previewMediaCapture(input){
 const w=checkoutMediaCapture(input),p=input.state?.checkoutPreviewProof;
 if(!w||!p||input.result?.mode!=='PRIVATE_CODE_PATH'||input.result.terminal?.reason!=='PRIVATE_CHECKOUT_COMMITTED'||
  input.result.terminal?.disposition!=='NO_SEND'||input.generations?.length||input.state?.stage!=='ORDER_PREVIEW'||!w.preview||
  digest(w.preview)!==digest(p)||w.preview.cartId!==input.state.checkoutCartProof?.id||w.preview.cartVersion!==input.state.checkoutCartProof?.version||!w.operations.some(op=>op.kind==='PREVIEW_CREATED'))return null;
 return w;
}
export function clarificationCapture({result,generations,messages,images,receipts,authority,state,acceptedOutbox,executionIdentity}){
 const w=result?.codeOwnedOutput;
 const media=images.length?checkoutMediaCapture({result,messages,images,receipts,authority,state,acceptedOutbox,executionIdentity}):null;
 if(w?.kind!=='NATIVE_CHECKOUT_CLARIFICATION'||result.terminal?.disposition!=='NO_SEND'||
  !['CHECKOUT_DETAILS_MISSING','PRIVATE_CHECKOUT_COMMITTED'].includes(result.terminal.reason)||result.enqueued!==messages.length+images.length||
  (images.length&&(!media||media.requestId!==w.requestId||media.sourceMessageIdHash!==w.sourceMessageIdHash||!Array.isArray(w.operationIds)||!w.operationIds.every(id=>media.operations.some(op=>op.id===id&&op.kind==='CLARIFICATION_REQUESTED'))))||!messages.length||generations.some(g=>g.role!=='OWNER'||g.status!=='OK')||
  authority?.owner!=='BOT'||w.recipient!==authority.recipientHash||w.conversationRevision!==state?.revision||w.salesRevision!==state?.salesRevision||
  typeof w.requestId!=='string'||!w.requestId||!/^[a-f0-9]{64}$/.test(w.sourceMessageIdHash??'')||
  w.payloadHash!==hash(JSON.stringify(messages))||JSON.stringify(w.messageHashes)!==JSON.stringify(messages.map(hash))||
  !Array.isArray(w.missingFields)||!w.missingFields.length||w.missingFields.some(f=>!['FULL_NAME','PHONE','ADDRESS','PAYMENT_METHOD'].includes(f))||
  !Array.isArray(w.operationIds)||!w.operationIds.length||!w.operationIds.every(id=>receipts?.some(r=>
   r.operation_id===id&&r.commandKind==='CLARIFICATION_REQUESTED'&&r.stateRevisionAfter===w.salesRevision)))return null;
 return structuredClone(w);
}
export function captureNativeTerminal({native,codeOnly,messages,images,errorCode}){
 if(codeOnly)return {disposition:'CODE_OWNED_SEND',messages,images};
 if(native?.disposition==='HANDOFF')return {disposition:'HANDOFF',messages,images,reason:native.reason};
 if(native?.disposition==='SEND_ELIGIBLE'&&messages.length)return {disposition:'SEND_ELIGIBLE',messages,images};
 return {disposition:'NO_SEND',messages,images,reason:errorCode??native?.reason??'NO_ACCEPTED_CUSTOMER_OUTPUT'};
}
export function capturedOutputViolations(terminal){
 return ['HANDOFF','NO_SEND'].includes(terminal.disposition)&&(terminal.messages.length||terminal.images.length)
  ?[{kind:terminal.disposition==='HANDOFF'?'SILENT_HANDOFF_CUSTOMER_OUTPUT':'NO_SEND_CUSTOMER_OUTPUT'}]:[];
}
