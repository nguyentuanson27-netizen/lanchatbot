import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mod=p=>import(pathToFileURL(resolve(p)).href);
const {digest}=await mod('apps/worker/evals/single-agent-commerce-qualification/bc-control.mjs');
const {ownerTextBytes,OWNER_REQUEST_MAX_BYTES,ownerSignatureBytes}=await mod('apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs');
const root=process.argv[2],plan=JSON.parse(readFileSync(resolve(root,'RUN_PLAN.json'))),audit=JSON.parse(readFileSync(resolve(root,'AUDIT.json')));
const rows=[],frames=[],quoteRows=[];
for(const job of plan.jobs){
 const reg=JSON.parse(readFileSync(job.registrationPath)),e=JSON.parse(readFileSync(resolve(job.out,'CANDIDATE_EVIDENCE.partial.json')));
 for(const a of e.attempts.filter(a=>job.selectedSlots.includes(a.slotId))){
  const quotes=[],receipts=new Map();
  for(const trace of a.audit.nativeResults){
   const raw=JSON.parse(readFileSync(resolve(job.out,trace.artifact)));assert.equal(digest(raw),trace.artifactHash);
   const repeat=job.externalRepetition??a.repetition;
   for(const g of raw.generations)if(g.role==='OWNER'&&g.requestBody){const bytes=ownerTextBytes(g.requestBody);assert(bytes<=OWNER_REQUEST_MAX_BYTES);frames.push({caseId:a.caseId,repetition:repeat,turn:trace.turnIndex,id:g.id,textBytes:bytes,signatureBytes:ownerSignatureBytes(g.requestBody)});}
   for(const rec of raw.after.receipts)if(!raw.before.receipts.some(before=>before.operation_id===rec.operation_id))receipts.set(rec.operation_id,rec);
   const v=raw.generations.find(g=>g.role==='VERIFIER');if(!v?.requestBody)continue;
   const trusted=JSON.parse(v.requestBody.input[0].content[0].text).trusted;
   const literals=trusted.policyLiterals.filter(p=>p.ref.startsWith('pre-cart-quote:'));
   for(const literal of literals){
    const q=JSON.parse(literal.text);assert.equal(literal.ref,'pre-cart-quote:'+digest(q));
    if(q.supportEvaluation?.status!=='QUOTED')continue;
    assert.equal(q.appliesNegotiationReceipt,false);assert.equal(q.benefitAuthorization.status,'NOT_GRANTED');assert.equal(q.benefitAuthorization.receiptRef,null);
    assert.equal(q.supportEvaluation.negotiationApplied,false);assert.equal(trusted.state.pendingSupport.pendingRef,q.supportEvaluation.pendingRef);
    assert.equal(q.subjectRef,'SV2447');assert.equal(q.offerType,'AO');
    const adjustmentTotal=q.quotedAdjustments.reduce((n,x)=>n+x.amountVnd,0);assert.equal(adjustmentTotal,q.discountTotalVnd);
    assert.equal(q.subtotalVnd+q.shippingFeeVnd-q.discountTotalVnd,q.grandTotalVnd);
    const row={caseId:a.caseId,repetition:repeat,turn:trace.turnIndex,evidenceRef:literal.ref,quantity:q.quantity,grandTotalVnd:q.grandTotalVnd,
     standardTotalVnd:q.supportEvaluation.grandTotalBeforeVnd,additionalSupportVnd:q.supportEvaluation.additionalDiscountVnd,
     quotedAdjustments:q.quotedAdjustments,benefitAuthorization:q.benefitAuthorization,expiresAt:literal.expiresAt,verifierVerdict:v.verdict?.verdict??null};
    quotes.push(row);quoteRows.push(row);
   }
  }
  const last=JSON.parse(readFileSync(resolve(job.out,a.audit.nativeResults.at(-1).artifact))),cart=last.after.publicState.cart;
  const events=[...receipts.values()];
  rows.push({caseId:a.caseId,repetition:job.externalRepetition??a.repetition,quotedSupportTurns:quotes.length,
   pendingRecords:events.filter(r=>r.commandKind==='PENDING_NEGOTIATION_RECORDED').length,
   negotiationEvents:events.filter(r=>r.commandKind==='NEGOTIATION_EVENT').length,
   finalCartTotalVnd:cart?.grandTotalVnd??null,preCartQuoteAndCartAgree:cart&&quotes.length?quotes.at(-1).grandTotalVnd===cart.grandTotalVnd:null,
   finalPendingStatus:last.after.publicState.pendingNegotiation?.status??null});
 }
}
writeFileSync(resolve(root,'SUPPORT_QUOTE_AUDIT.json'),JSON.stringify({status:'PASS_STRUCTURAL_BINDINGS',rows,quotes:quoteRows},null,2));
writeFileSync(resolve(root,'REQUEST_SIZE_AUDIT.json'),JSON.stringify({source:plan.source,bound:OWNER_REQUEST_MAX_BYTES,frames,maximum:Math.max(...frames.map(r=>r.textBytes))},null,2));
console.log(JSON.stringify({attempts:rows.length,quotedSupportTurns:quoteRows.length,ownerFrames:frames.length,maximumOwnerTextBytes:Math.max(...frames.map(r=>r.textBytes))}));
