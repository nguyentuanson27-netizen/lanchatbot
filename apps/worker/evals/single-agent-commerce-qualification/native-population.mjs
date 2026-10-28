// Fixed Phase C population over the existing persisted B session. No scripted shop replies.
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runtimeProjection,digest,textDigest,outcomeDigest} from './qualification.mjs';
import {commonModelConfig} from './native-wire.mjs';
import {selectFrozenCustomerTurn} from './customer-branches.mjs';
const silent=(reason,disposition='NO_SEND')=>({disposition,messages:[],images:[],reason});
export async function collectNativePopulation({preflight,providerPorts,sessionFactory,snapshot,historyStore,out,seedPath,queue,branchSelector}){
 const reg=preflight.sealed,identity=reg.identity,arm=preflight.registration.arm??'CANDIDATE',seed=JSON.parse(readFileSync(seedPath,'utf8')).seed;
 const attempts=reg.slots.filter(s=>s.arm===arm&&s.mode!=='SAFETY').map(s=>({...s,identity,status:'NOT_RUN'}));
 assert.equal(digest(seed),reg.config.blinding.seedCommitment,'C_BLIND_SEED_CHANGED');
 const cases=reg.corpus.scenarios.filter(s=>s.mode!=='SAFETY');
 const save=()=>writeFileSync(resolve(out,arm+'_EVIDENCE.partial.json'),JSON.stringify({config:reg.config,corpus:reg.corpus,identity,
  source:{clean:true,sourceSha:reg.runSourceSha,registeredBeforeFirstRequest:true,corpusHash:reg.corpusHash},blindSeed:seed,attempts},null,2));
 save();
 for(const [scenarioIndex,scenario]of cases.entries()){
  const slot=reg.slots.find(s=>s.arm===arm&&s.caseId===scenario.id);assert(slot&&slot.repetition===1,'C_N1_SLOT');
  if(queue.blocked()){
   attempts[scenarioIndex]={...slot,identity,status:'NOT_RUN',reason:'PERSISTED_QUEUE_BLOCKED'};save();continue;
  }
  // Authored future shop messages are never inserted into a real history.
  assert(scenario.turns.every(t=>t.history.length===0),'C_NATIVE_INITIAL_HISTORY_REQUIRES_REVIEWED_SEED');
  const session=await sessionFactory({live:true,initialProductCodes:scenario.turns[0].initialProductCodes}),
   initial=await snapshot(session),start=performance.now();
  assert.equal(digest(initial.publicState),scenario.initialContext.initialStateHash,'C_ACTUAL_INITIAL_STATE_MISMATCH');
  const a={...slot,identity,status:'EXECUTED',startedAt:new Date().toISOString(),terminal:silent('ATTEMPT_NOT_FINISHED'),safetyFindings:[],turns:[],generations:[],
   audit:{facts:[],stateTransitions:[],effects:[],receipts:[],media:[]},parity:{...scenario.initialContext,
    modelHash:digest(commonModelConfig(arm==='C3'?reg.config.baseline.model:reg.config.candidate.model)),customerPolicyHash:scenario.mode==='JOURNEY'?scenario.customerPolicy.hash:null}};
  attempts[scenarioIndex]=a;save();
  for(let i=0;i<scenario.turns.length;i++){
   const choice=branchSelector?await branchSelector({scenario,turnIndex:i,priorTerminal:a.turns.at(-1)?.terminal??null}):null,
    selected=selectFrozenCustomerTurn(scenario,i,a.turns.at(-1)?.terminal??null,choice);
   const before=await snapshot(session),accepted=before.publicHistory.history,input=runtimeProjection(scenario,i,{acceptedHistory:accepted,latest:selected.latest}),turnStart=performance.now(),
    generationStart=providerPorts.observed().length,captureStart=session.capture.length,attachmentStart=session.capturePayloads.length;
   providerPorts.setSlot({slotId:slot.slotId,turnIndex:i,runtimeInput:input});
   let observed,errorCode=null;
   try{observed=await session.turn(input.latest,[],{slot:slot.slotId+':'+i});if(observed.qualification?.status==='VALID')await session.drain();}
   catch(error){errorCode=/^[A-Z0-9_]+$/.test(error.message)?error.message:'NATIVE_ATTEMPT_ERROR';a.status='ERROR';}
   if(!await providerPorts.awaitSettled()){errorCode='UNKNOWN_PROVIDER_COMPLETION';a.status='ERROR';queue.latch(slot.slotId,errorCode);}
   const after=await snapshot(session),gens=providerPorts.observed().slice(generationStart),terminal=observed?.result?.terminal;
   const messages=session.capturePayloads.slice(attachmentStart).flatMap(p=>typeof p.text==='string'?[p.text]:[]),images=session.capturePayloads.slice(attachmentStart).flatMap(p=>
    p.attachment?.type==='image'?[{url:p.attachment.payload.url}]:[]);
   const codeOnly=observed?.result?.mode==='PRIVATE_CODE_PATH'&&gens.length===0&&messages.length>0;
   const actual=codeOnly?{disposition:'CODE_OWNED_SEND',messages,images}:
    terminal?.disposition==='HANDOFF'?silent(terminal.reason,'HANDOFF'):
    terminal?.disposition==='SEND_ELIGIBLE'&&messages.length?{disposition:'SEND_ELIGIBLE',messages,images}:
     silent(errorCode??terminal?.reason??'NO_ACCEPTED_CUSTOMER_OUTPUT');
   const verifier=gens.find(g=>g.role==='VERIFIER'),b=verifier?.verifierInput,witness=observed?.result?.boundaryWitness;
   const t={customer:input.latest,customerSelection:selected.selection,terminal:actual,historyBefore:accepted,
    historyAfter:after.publicHistory.history,historyTrace:{before:before.publicHistory.trace,after:after.publicHistory.trace},
    beforeStateHash:digest(before.publicState),afterStateHash:digest(after.publicState),safetyFindings:[],
    elapsedMs:performance.now()-turnStart,...(b?{verification:{...b,generationId:verifier.id,verdict:verifier.verdict?.verdict},
     finalGate:{status:actual.disposition==='SEND_ELIGIBLE'&&witness?.terminal?.disposition==='SEND_ELIGIBLE'?'ALLOWED':'BLOCKED',
      requestId:witness?.expected?.requestId??b.requestId,draftHash:witness?.expected?.finalDraftHash??b.draftHash,
      snapshotHash:witness?.currentBinding?.trustedSnapshotId??b.snapshotHash,nativeWitness:witness??null}}:{})};
   const payloads=session.capturePayloads.slice(attachmentStart),newOutbox=after.outbox.filter(r=>!before.outbox.some(old=>old.outbox_id===r.outbox_id));
   assert.equal(newOutbox.length,payloads.length,'C_ACCEPTED_CAPTURE_COUNT');
   t.acceptedOutbox=newOutbox.map((r,index)=>({id:r.outbox_id,group:r.response_group_id,sequence:r.sequence_no,status:r.status,
    kind:payloads[index].attachment?'IMAGE':'TEXT',contentHash:textDigest(payloads[index].text??payloads[index].attachment.payload.url)}));
   a.acceptedOutbox=t.acceptedOutbox;
   if(arm==='C3'&&observed?.result?.c3Witness){t.c3Boundary=observed.result.c3Witness;a.c3Boundary=t.c3Boundary;}
   const rawFile=`native-${slot.slotId}-turn-${i}.json`,raw={observed,errorCode,before,after,generations:gens};
   writeFileSync(resolve(out,rawFile),JSON.stringify(raw,null,2),{flag:'wx'});
   (a.audit.nativeResults??=[]).push({turnIndex:i,artifact:rawFile,artifactHash:digest(JSON.parse(JSON.stringify(raw))),
    terminal:terminal??null,commitStatus:observed?.result?.commitStatus??null,egressDiagnostic:observed?.result?.egressDiagnostic??null});
   if(b){const trusted=JSON.parse(b.trustedSnapshotJson);a.audit.facts.push({turnIndex:i,snapshotHash:b.snapshotHash,
    protectedClaims:trusted.protectedClaims,policyLiterals:trusted.policyLiterals,runtimeProducts:trusted.runtimeProducts??[],effectReceipts:trusted.effectReceipts});}
   if(codeOnly){
    const newRows=after.outbox.filter(r=>!before.outbox.some(old=>old.outbox_id===r.outbox_id));
    assert.equal(newRows.length,messages.length,'C_CODE_CAPTURE_COUNT');
    t.codeOwned={kind:'NATIVE_PRIVATE_CODE_PATH',sourceSha:reg.config.candidate.sourceSha,runtimeInputHash:digest(input),
     nativeResult:observed.result,nativeResultHash:digest(observed.result),
     acceptedOutbox:newRows.map((r,index)=>({id:r.outbox_id,status:r.status,textHash:textDigest(messages[index])}))};
    a.codeOwned=t.codeOwned;
   }
   if(gens.length===0&&!codeOnly){t.precheck={status:'REJECTED',reason:terminal?.reason??'NO_MODEL_CODE_PATH',artifactHash:digest(observed?.result??{}),sourceSha:reg.config.candidate.sourceSha};a.precheck=t.precheck;}
   t.beforeHistoryHash=digest(t.historyBefore);t.afterHistoryHash=digest(t.historyAfter);
   a.turns.push(t);a.generations.push(...gens);a.terminal=actual;
   if(b){a.verification=t.verification;a.finalGate=t.finalGate;}
   a.audit.stateTransitions.push({before:before.publicState,after:after.publicState});
   a.audit.effects.push(...after.events.filter(e=>!before.events.some(old=>old.command_id_hash===e.command_id_hash)));
   a.audit.receipts.push(...after.receipts.filter(r=>!before.receipts.some(old=>old.operation_id===r.operation_id)));
   a.audit.media.push(...images);
   if(actual.disposition==='SEND_ELIGIBLE'&&messages.length!==1){a.safetyFindings.push({kind:'UNREGISTERED_CUSTOMER_MESSAGE_GROUP'});a.status='ERROR';}
   a.metrics={elapsedMs:performance.now()-start,verificationAddedMs:a.turns.reduce((n,t)=>n+(t.verificationAddedMs??0),0),
    evaluationAttestationMs:(a.metrics?.evaluationAttestationMs??0)+(observed?.result?.evaluationTiming?.attestationMs??0),
    toolCalls:observed?.result?.toolCalls===undefined&&!(gens.length===0&&observed?.result)?null:(a.metrics?.toolCalls??0)+(observed?.result?.toolCalls??0)};
   if(verifier){t.verificationAddedMs=performance.now()-verifier.startedMonotonicMs;a.metrics.verificationAddedMs+=t.verificationAddedMs;}
   if(errorCode||observed?.qualification?.status!=='VALID'){a.status='ERROR';save();break;}
   save();
  }
  if(scenario.mode==='SINGLE')a.turns=[];
  a.quality={judgeIdentity:reg.config.judge.identity,rubricHash:reg.config.judge.rubricHash,sourceContextHash:digest(scenario.judgeContext),
   outcomeHash:outcomeDigest(a),status:'NOT_GRADED'};save();
 }
 providerPorts.assertSource();
 return {attempts,providerRequests:providerPorts.observed().reduce((n,g)=>n+g.providerRequests,0)};
}
