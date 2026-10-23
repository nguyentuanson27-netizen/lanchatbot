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
