import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCapturedAttachments,publicCapturedTextHashes,customerOutcome} from './delivery-capture.mjs';
import {createHash} from 'node:crypto';

test('capture hashes exact transport text before redaction without retaining recipient or plaintext',()=>{
 const text='Em gửi chị xem đường nét thêu nhé.',payloads=[{text,recipient:'PRIVATE'},{attachment:{type:'image',payload:{url:'https://example.com/a.jpg'}}}];
 assert.deepEqual(publicCapturedTextHashes(payloads,0),[{sequence:0,sha256:createHash('sha256').update(text).digest('hex')}]);
 assert.deepEqual(publicCapturedTextHashes(payloads,2),[]);
 assert.doesNotMatch(JSON.stringify(publicCapturedTextHashes(payloads,0)),/PRIVATE|đường|recipient/);
});
test('media evidence retains each delivered URL and turn order without recipient or token',()=>{
 const payloads=[{text:'Em gửi ảnh chị nhé.'},
  {attachment:{type:'image',payload:{url:'https://content.pancake.vn/a.jpg',token:'SECRET'}},recipient:'PRIVATE'},
  {attachment:{type:'image',payload:{url:'https://content.pancake.vn/b.jpg'}}}];
 assert.deepEqual(publicCapturedAttachments(payloads,0),[
  {sequence:1,type:'image',url:'https://content.pancake.vn/a.jpg'},
  {sequence:2,type:'image',url:'https://content.pancake.vn/b.jpg'}]);
 const boundary=payloads.length;
 payloads.push({attachment:{type:'image',payload:{url:'https://content.pancake.vn/c.jpg'}}});
 assert.deepEqual(publicCapturedAttachments(payloads,boundary),[{sequence:0,type:'image',url:'https://content.pancake.vn/c.jpg'}]);
 assert.doesNotMatch(JSON.stringify(publicCapturedAttachments(payloads,0)),/SECRET|PRIVATE|recipient|token/);
 assert.deepEqual(publicCapturedAttachments(payloads,payloads.length),[]);
 assert.throws(()=>publicCapturedAttachments(payloads,-1));
});

function captured(text='Em gửi ảnh chị nhé.',images=[]){
 const messages=[...(text?[text]:[]),...images.map(()=>'[CODE_IMAGE]')];
 return {result:{terminal:{disposition:'SEND_ELIGIBLE',reason:'PASS',text},enqueued:messages.length,commitStatus:'COMMITTED'},actualCapturedMessages:messages,
  actualCapturedAttachments:images.map((url,i)=>({sequence:(text?1:0)+i,type:'image',url})),
  deliveryEvidence:{outboxRows:messages.map((_,i)=>({id:'out-'+i,group:'group',sequence:i,status:'SENT_ACCEPTED'}))}};
}
test('customer outcome retains ordinary text, gallery and exact committed delivery evidence',()=>{
 for(const a of [captured('Dạ chị.'),captured('Em gửi ảnh chị nhé.',['https://content.pancake.vn/a.jpg','https://content.pancake.vn/b.jpg'])])
  assert.equal(customerOutcome(a,'CAPTURE_TRANSPORT').messages.length,a.result.enqueued);
});
test('missing/empty capture, missing gallery attachments, duplicate images or unaccepted rows reject',()=>{
 for(const mutate of [a=>delete a.actualCapturedMessages,a=>a.actualCapturedMessages=[],a=>delete a.actualCapturedAttachments,a=>a.actualCapturedAttachments.pop(),
  a=>a.actualCapturedAttachments[1].url=a.actualCapturedAttachments[0].url,a=>a.deliveryEvidence.outboxRows[1].status='PENDING',a=>a.actualCapturedMessages[0]='Wrong reply']){
  const a=captured('Em gửi ảnh chị nhé.',['https://content.pancake.vn/a.jpg','https://content.pancake.vn/b.jpg']);mutate(a);
  assert.throws(()=>customerOutcome(a,'CAPTURE_TRANSPORT'));
 }
});
test('code checkout, receipt ACK and handoff use actual committed capture without inventing terminal prose',()=>{
 for(const disposition of ['NO_SEND','HANDOFF','SEND_ELIGIBLE']){
  const a=captured('Code-owned committed message');a.result.terminal={disposition,reason:'CODE_RECOVERY',text:disposition==='NO_SEND'?null:'Code-owned committed message'};
  delete a.result.commitStatus;assert.doesNotThrow(()=>customerOutcome(a,'CAPTURE_TRANSPORT'));
 }
 const silent=captured(null);silent.result.terminal={disposition:'HANDOFF',text:null};assert.doesNotThrow(()=>customerOutcome(silent,'CAPTURE_TRANSPORT'));
});
