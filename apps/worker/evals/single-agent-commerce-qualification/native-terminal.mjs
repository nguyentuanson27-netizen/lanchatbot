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
/** Evaluator-only state witness. No customer identity values or send permission. */
export function checkoutBranchWitness(input,terminal,publicState){
 const {result,authority,receipts,acceptedOutbox,executionIdentity,messages,images}=input;
 const allUnits=[...messages.map(text=>({kind:'TEXT',contentHash:hash(text)})),...images.map(i=>({kind:'IMAGE',contentHash:hash(i.url)}))];
 if(!executionIdentity?.requestId||!/^[a-f0-9]{64}$/.test(executionIdentity.sourceMessageIdHash??'')||
  !Array.isArray(acceptedOutbox)||acceptedOutbox.length!==allUnits.length||new Set(acceptedOutbox.map(r=>r.id)).size!==allUnits.length||
  acceptedOutbox.some((r,i)=>!r.id||!['SENT_ACCEPTED','DELIVERED','READ'].includes(r.status)||r.kind!==allUnits[i].kind||r.contentHash!==allUnits[i].contentHash||r.sequence!==i||!r.group||r.group!==acceptedOutbox[0].group)||
  publicState.revision!==input.state.revision||publicState.salesRevision!==input.state.salesRevision||!publicState.cart)return null;
 const progress=result?.checkoutProgressOutput;
 const progressValid=progress?.kind==='NATIVE_CHECKOUT_PROGRESS_V1'&&progress.requestId===executionIdentity.requestId&&progress.sourceMessageIdHash===executionIdentity.sourceMessageIdHash&&
  progress.recipient===authority?.recipientHash&&progress.conversationRevision===publicState.revision&&progress.salesRevision===publicState.salesRevision&&
  progress.cart?.id===publicState.cart.cartId&&progress.cart?.version===publicState.cart.revision&&
  digest(progress.unitKinds)===digest(allUnits.map(u=>u.kind))&&digest(progress.unitHashes)===digest(allUnits.map(u=>u.contentHash))&&
  acceptedOutbox.every(r=>r.group===progress.responseGroupId)&&Array.isArray(progress.operations)&&progress.operations.length>0&&
  progress.operations.every(op=>receipts?.some(r=>r.operation_id===op.id&&r.commandKind===op.kind&&r.stateRevisionAfter<=publicState.salesRevision));
 const currentReceipt=kind=>progressValid&&progress.operations.some(op=>op.kind===kind&&receipts?.some(r=>r.operation_id===op.id&&r.commandKind===kind&&r.stateRevisionAfter===publicState.salesRevision));
 let condition=null;
 const clarification=clarificationCapture(input);
 if(clarification&&clarification.requestId===executionIdentity.requestId&&clarification.sourceMessageIdHash===executionIdentity.sourceMessageIdHash&&
  digest(publicState.checkoutPublic?.lastQuestion?.missingFields)===digest(clarification.missingFields)&&
  publicState.checkoutPublic?.lastQuestion?.questionFingerprint===clarification.messageHashes[0])condition={kind:'MISSING_FIELD',field:clarification.missingFields[0]};
 else if(authority?.owner==='BOT'&&terminal.disposition==='CODE_OWNED_SEND'&&publicState.stage==='ORDER_PREVIEW'&&publicState.checkoutPreviewProof&&
  digest(progress?.preview)===digest(publicState.checkoutPreviewProof)&&
  publicState.checkoutPreviewProof.cartId===publicState.cart.cartId&&publicState.checkoutPreviewProof.cartVersion===publicState.cart.revision&&
  currentReceipt('PREVIEW_CREATED')&&result.mode==='PRIVATE_CODE_PATH'&&input.generations.length===0&&messages.length)condition={kind:'PREVIEW_READY'};
 else if(['SEND_ELIGIBLE','CODE_OWNED_SEND'].includes(terminal.disposition)&&publicState.stage==='PURCHASE_CONFIRMED'&&publicState.confirmation&&currentReceipt('PURCHASE_CONFIRMED'))condition={kind:'PURCHASE_CONFIRMED'};
 else if(authority?.owner==='BOT'&&['SEND_ELIGIBLE','CODE_OWNED_SEND'].includes(terminal.disposition)&&messages.length&&
  (currentReceipt('CART_OPENED')||input.result?.boundaryWitness?.terminal?.disposition==='SEND_ELIGIBLE'&&
   digest(input.result.boundaryWitness.currentPublicContext?.cartBinding)===digest({cartId:publicState.cart.cartId,cartVersion:publicState.cart.revision})))condition={kind:'CART_READY'};
 if(!condition)return null;
 const v={...condition,stateHash:digest(publicState),priorOutcomeHash:digest(terminal),requestId:executionIdentity.requestId,sourceMessageIdHash:executionIdentity.sourceMessageIdHash};
 return {...v,hash:digest(v)};
}
export function capturedOutputViolations(terminal){
 return ['HANDOFF','NO_SEND'].includes(terminal.disposition)&&(terminal.messages.length||terminal.images.length)
  ?[{kind:terminal.disposition==='HANDOFF'?'SILENT_HANDOFF_CUSTOMER_OUTPUT':'NO_SEND_CUSTOMER_OUTPUT'}]:[];
}
