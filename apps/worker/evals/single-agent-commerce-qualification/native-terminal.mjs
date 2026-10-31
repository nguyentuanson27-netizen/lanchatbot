// Evaluation capture only. Customer output comes from accepted transport payloads.
import {createHash} from 'node:crypto';
const hash=text=>createHash('sha256').update(text).digest('hex');
export function clarificationCapture({result,generations,messages,images,receipts,authority,state}){
 const w=result?.codeOwnedOutput;
 if(w?.kind!=='NATIVE_CHECKOUT_CLARIFICATION'||result.terminal?.disposition!=='NO_SEND'||
  !['CHECKOUT_DETAILS_MISSING','PRIVATE_CHECKOUT_COMMITTED'].includes(result.terminal.reason)||result.enqueued!==messages.length||
  images.length||!messages.length||generations.some(g=>g.role!=='OWNER'||g.status!=='OK')||
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
