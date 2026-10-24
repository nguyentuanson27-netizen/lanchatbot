// Evaluation-only projection of the existing capture transport. No delivery or identity authority.
import assert from 'node:assert/strict';
export function publicCapturedAttachments(payloads,first){
 assert(Number.isSafeInteger(first)&&first>=0&&first<=payloads.length,'CAPTURE_BOUNDARY');
 return payloads.slice(first).flatMap((message,sequence)=>{
  const a=message.attachment;
  return a?.type==='image'&&typeof a.payload?.url==='string'
   ?[{sequence,type:'image',url:a.payload.url}]:[];
 });
}

/** Structural evaluation evidence only; never decides runtime send authority. */
export function customerOutcome(attempt,mode){
 const result=attempt.result,terminal=result?.terminal;
 assert(terminal,'CUSTOMER_TERMINAL_REQUIRED');
 if(mode==='SEND_ELIGIBILITY_ONLY'){
  assert(result.enqueued===undefined&&!Object.hasOwn(attempt,'actualCapturedMessages'),'ELIGIBILITY_IS_NOT_DELIVERY');
  return {mode,terminal};
 }
 assert.equal(mode,'CAPTURE_TRANSPORT','CUSTOMER_OUTCOME_MODE');
 const messages=attempt.actualCapturedMessages,attachments=attempt.actualCapturedAttachments,rows=attempt.deliveryEvidence?.outboxRows;
 assert(Array.isArray(messages)&&messages.every(t=>typeof t==='string'&&t.length>0),'CUSTOMER_CAPTURE_REQUIRED');
 assert(Array.isArray(attachments)&&Array.isArray(rows),'CUSTOMER_DELIVERY_EVIDENCE_REQUIRED');
 assert(Number.isSafeInteger(result.enqueued)&&result.enqueued>=0,'CUSTOMER_ENQUEUED_REQUIRED');
 assert.equal(messages.length,result.enqueued,'CUSTOMER_CAPTURE_COUNT');assert.equal(rows.length,result.enqueued,'CUSTOMER_COMMIT_COUNT');
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'CUSTOMER_DUPLICATE_OUTBOX');
 assert.equal(new Set(rows.map(r=>r.group+':'+r.sequence)).size,rows.length,'CUSTOMER_DUPLICATE_SEQUENCE');
 for(const r of rows)assert(typeof r.id==='string'&&r.id&&typeof r.group==='string'&&r.group&&Number.isSafeInteger(r.sequence)&&r.sequence>=0&&['SENT_ACCEPTED','DELIVERED','READ'].includes(r.status),'CUSTOMER_DELIVERY_INCOMPLETE');
 if(result.commitStatus!==undefined)assert.equal(result.commitStatus,'COMMITTED','CUSTOMER_COMMIT_NOT_ACCEPTED');
 const imageSlots=messages.flatMap((t,i)=>t==='[CODE_IMAGE]'?[i]:[]);
 assert.equal(attachments.length,imageSlots.length,'CUSTOMER_IMAGE_COUNT');
 assert.equal(new Set(attachments.map(a=>a.sequence)).size,attachments.length,'CUSTOMER_DUPLICATE_IMAGE_SEQUENCE');
 assert.equal(new Set(attachments.map(a=>a.url)).size,attachments.length,'CUSTOMER_DUPLICATE_IMAGE');
 for(const a of attachments)assert(a.type==='image'&&imageSlots.includes(a.sequence)&&typeof a.url==='string'&&a.url.startsWith('https://'),'CUSTOMER_IMAGE_EVIDENCE');
 // Code checkout/receipt/handoff may commit a message with NO_SEND as its model terminal.
 // Actual accepted Outbox rows above remain authoritative; do not invent terminal prose.
 if(terminal.disposition!=='NO_SEND'&&terminal.text){assert(messages.includes(terminal.text),'CUSTOMER_TERMINAL_NOT_CAPTURED');}
 if(terminal.disposition==='SEND_ELIGIBLE')assert(messages.length>0,'CUSTOMER_ELIGIBLE_NOT_CAPTURED');
 return {mode,messages,attachments,committedOutbox:rows,enqueued:result.enqueued,commitStatus:result.commitStatus??null};
}
