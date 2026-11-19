import assert from 'node:assert/strict';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const root=process.argv[2],q='apps/worker/evals/single-agent-commerce-qualification/';
const mod=path=>import(pathToFileURL(resolve(path)).href);
const {read,write,digest}=await mod(q+'bc-control.mjs');
const {assertRuntimeFirewall,textDigest}=await mod(q+'qualification.mjs');
const {hardPrecheck}=await mod('apps/worker/dist/single-agent-semantic-verifier-boundary.js');
const {validatedReceiptContinuity}=await mod('apps/worker/dist/single-agent-commerce-effect-receipts.js');
const plan=read(resolve(root,'RUN_PLAN.json')),conversations=[],generations=[],jobAudits=[],continuity=[];
const fence=String.fromCharCode(96).repeat(3),md=['# J4 ×5 và control hai áo ×5','','Source '+plan.source,''];
for(const job of plan.jobs){
 const reg=read(job.registrationPath),e=read(resolve(job.out,'CANDIDATE_EVIDENCE.partial.json'));
 const integration=read(resolve(job.out,'integration.json'));
 assert.equal(integration.sourceSha,plan.source);assert.equal(integration.sourceDirty,false);
 assert.equal(integration.sendEnabled,false);assert.equal(integration.testDatabaseDropped,true);
 const ids=new Set(job.selectedSlots),attempts=e.attempts.filter(a=>ids.has(a.slotId));
 assert.equal(attempts.length,ids.size);
 let requests=0;
 for(const a of attempts){
  const scenario=reg.corpus.scenarios.find(s=>s.id===a.caseId),repetition=job.externalRepetition??a.repetition;
  assert.equal(a.status,'EXECUTED');assert.equal(a.audit.nativeResults.length,scenario.turns.length);
  const c={kind:job.kind,batch:job.batch,caseId:a.caseId,repetition,localRepetition:a.repetition,
   registrationHash:job.registrationHash,slotId:a.slotId,safetyFindings:a.safetyFindings,turns:[]};
  md.push('## '+a.caseId+' · lần '+repetition,'');
  for(const trace of a.audit.nativeResults){
   const rawPath=resolve(job.out,trace.artifact),r=read(rawPath),t=a.turns[trace.turnIndex];
   assert.equal(digest(r),trace.artifactHash);assert(t,'Native turn not captured');
   assert.deepEqual(t.acceptedOutbox.filter(x=>x.kind==='TEXT').map(x=>x.contentHash),t.terminal.messages.map(textDigest));
   const v=r.generations.find(g=>g.role==='VERIFIER');
   const frame=v?.requestBody?JSON.parse(v.requestBody.input[0].content[0].text):null;
   const result=r.observed.result,code=result?.codeReply,witness=result?.boundaryWitness;
   if(t.terminal.disposition==='SEND_ELIGIBLE'){
    assert(v&&frame);
    if(code){
     assert.equal(result.terminal.reason,'VERIFIED_QUOTE_REPLY');
     assert.equal(code.kind,'PRE_CART_QUOTE_V1');
     assert(['FAIL','UNCERTAIN','MALFORMED'].includes(code.rejectedDraftReason));
     assert.equal(witness.terminal.disposition,'FALLBACK');assert.equal(witness.responseKind,'VERDICT');
     const current=witness.currentPublicContext,at=new Date(witness.checkedAt);
     assert.equal(hardPrecheck(current,t.terminal.messages[0],at),null);assert.equal(current.cartBinding,undefined);
     const quotes=current.policyLiterals.filter(p=>p.ref.startsWith('pre-cart-quote:'));
     assert.equal(quotes.length,1);assert.equal(quotes[0].ref,code.evidenceRef);
     const proof=JSON.parse(quotes[0].text);assert.equal(proof.kind,'PRE_CART_TOTAL_V1');
     assert.equal(proof.recipient,current.state.recipient);assert.equal(proof.bindingVersion,current.state.bindingVersion);
     const title=current.boundSubjects.find(s=>s.ref===proof.subjectRef&&s.kind==='PRODUCT').label.trim();
     const names={AO:'áo',QUAN:'quần',VAY:'váy',CHAN_VAY:'chân váy'};
     assert(names[proof.offerType],'Quote offer requires audit support');
     const money=x=>x.toLocaleString('vi-VN'),included=[
      ...(proof.shippingFeeVnd>0?['đã gồm '+money(proof.shippingFeeVnd)+'đ phí giao hàng']:[]),
      ...(proof.discountTotalVnd>0?['đã trừ ưu đãi '+money(proof.discountTotalVnd)+'đ']:[])];
     const expected='Dạ '+proof.quantity+' '+names[proof.offerType]+' của '+title+' hết '+money(proof.grandTotalVnd)+
      'đ chị nhé'+(included.length?', '+included.join(' và '):'')+'.';
     assert.deepEqual(t.terminal.messages,[expected]);assert.notEqual(expected,frame.untrusted.finalDraft);
    }else{
     assert.equal(v.verdict.verdict,'PASS');assert.deepEqual(t.terminal.messages,[frame.untrusted.finalDraft]);
     assert.equal(textDigest(frame.untrusted.finalDraft),frame.requestIdentity.finalDraftHash);
     assert.equal(witness.terminal.disposition,'SEND_ELIGIBLE');
    }
   }
   if(frame?.trusted.effectReceiptContinuity){
    const trusted=frame.trusted,refs=validatedReceiptContinuity(trusted);assert(refs?.size>=2);
    const receipts=trusted.effectReceipts.filter(x=>refs.has(x.ref));
    for(const receipt of receipts){
     const matches=r.after.receipts.filter(x=>x.operation_id===receipt.operationId);assert.equal(matches.length,1);
     assert.equal(matches[0].stateRevisionAfter,receipt.stateRevision);
     assert.equal(Date.parse(matches[0].occurredAt),Date.parse(receipt.observedAt));
    }
    continuity.push({caseId:a.caseId,repetition,turn:trace.turnIndex,currentRevision:trusted.state.revision,
     receipts:receipts.map(x=>({effect:x.effect,stateRevision:x.stateRevision,observedAt:x.observedAt})),ledgerMatch:true});
   }
   const tools=r.observed.toolResponses??[];
   c.turns.push({turn:trace.turnIndex,customer:t.customer,terminal:t.terminal,codeReply:code??null,
    recovery:result?.recovery??null,errorCode:r.errorCode,verdict:v?.verdict??null,
    tools:tools.map(x=>({name:x.name,status:x.response.status,reason:x.response.reason??null,data:x.response.data??null})),
    currentQuote:frame?.trusted.state.cartQuote??null,pendingSupport:frame?.trusted.state.pendingSupport??null,
    before:r.before.publicState,after:r.after.publicState,capturedArtifact:relative(root,rawPath),artifactHash:trace.artifactHash});
   md.push('### Lượt '+(trace.turnIndex+1),'','Khách — '+t.customer,'',
    'Kết quả **'+t.terminal.disposition+'**'+(code?' · báo giá do code dựng':''),'',
    fence+'text',t.terminal.messages.join('\n')||'(Không gửi tin cho khách.)',fence,'');
   if(frame&&t.terminal.messages[0]!==frame.untrusted.finalDraft)md.push('Draft owner trước gate','',
    fence+'text',frame.untrusted.finalDraft,fence,'');
   md.push('Tool — '+tools.map(x=>x.name+' '+x.response.status+(x.response.reason?' '+x.response.reason:'')).join(', '),'');
   if(v?.verdict)md.push('Verifier',fence+'json',JSON.stringify(v.verdict,null,2),fence,'');
   for(const g of r.generations){
    assert([0,1].includes(g.providerRequests));requests+=g.providerRequests;
    if(g.requestBody){assertRuntimeFirewall(g.requestBody,reg.corpus.scenarios.map(s=>s.id));assert.equal(digest(g.requestBody),g.requestHash);}
    if(g.status==='OK')assert.equal(g.observedModelVersion,g.role==='OWNER'?plan.models.model.model:plan.models.verifier.model.model);
    const safe={caseId:a.caseId,repetition,turn:trace.turnIndex,role:g.role,status:g.status,
     id:g.id,providerRequests:g.providerRequests,authRequests:g.authRequests,requestHash:g.requestHash,
     modelVersion:g.observedModelVersion,metrics:g.metrics,failureLayer:g.failureLayer??null,errorCode:g.errorCode??null};
    const telemetry=g.telemetry??{};
    for(const k of ['httpStatus','finishReason','failureCode','failureStage','functionCallingMode','declaredToolCount','requestBytes','inputTokens','outputTokens','thinkingTokens'])if(k in telemetry)safe[k]=telemetry[k];
    generations.push(safe);
   }
  }
  conversations.push(c);
 }
 assert.equal(requests,integration.providerGenerations);
 jobAudits.push({batch:job.batch,kind:job.kind,attempts:attempts.length,providerRequests:requests,
  testDatabaseDropped:true,source:integration.sourceSha,registrationHash:job.registrationHash});
}
assert.equal(conversations.length,10);assert.equal(conversations.flatMap(c=>c.turns).length,30);
for(const caseId of ['c-20261028-j4','c-context-two-units']){
 const group=conversations.filter(c=>c.caseId===caseId);assert.equal(group.length,5);
 assert.deepEqual(group.map(c=>c.repetition).sort(),[1,2,3,4,5]);
}
write(resolve(root,'AUDIT.json'),{status:'PASS',source:plan.source,worldHash:plan.worldHash,jobAudits,conversations,generations,continuity});
writeFileSync(resolve(root,'CONVERSATIONS.md'),md.join('\n').trimEnd()+'\n');
console.log(JSON.stringify({audit:'PASS',attempts:10,turns:30,providerRequests:generations.reduce((n,g)=>n+g.providerRequests,0),
 codeReplies:conversations.flatMap(c=>c.turns).filter(t=>t.codeReply).length,continuityFrames:continuity.length}));
