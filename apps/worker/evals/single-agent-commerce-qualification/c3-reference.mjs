// Native main C3 orchestration on the same current deterministic tools and persisted ingress envelope.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadPinnedC3Context} from './baseline-source.mjs';
import {runPinnedC3Turn} from './c3-bridge.mjs';
import {createPinnedC3Transport} from './c3-transport.mjs';
import {digest,assertRuntimeFirewall} from './qualification.mjs';
import {NATIVE_CODECS} from './native-wire.mjs';
import {referenceContextCoverage} from './context-coverage.mjs';
const rawHash=text=>createHash('sha256').update(text,'utf8').digest('hex');
export async function createReferenceRunner({preflight,baselineRoot,baselineBuild,observe,active,assertCurrent,unitTransport}){
 const reg=preflight.sealed,model=reg.config.baseline.model;
 assert(model&&['VERIFIED_MATCHED_SEND_DISABLED','PACKAGE_ONLY_REFERENCE_SHARED_EGRESS'].includes(reg.config.baseline.capabilityStatus),'C_BASELINE_NOT_QUALIFIED');
 const context=await loadPinnedC3Context(baselineRoot,baselineBuild);
 if(unitTransport)assert(unitTransport.fixtureOnly===true,'C_BASELINE_TEST_TRANSPORT');
 const transport=unitTransport??await createPinnedC3Transport({baselineRoot,baselineBuild,projectId:preflight.world.config.vertex.projectId,model});
 return {kind:'PINNED_MAIN_C3',async run(turn,state){
  assertCurrent();const slot=active();assert(slot,'C_REFERENCE_ACTIVE_SLOT');
  const gens=[],initial=performance.now(),problem=reason=>({terminal:{disposition:'NO_SEND',reason,text:null,fallbackId:null},
   recovery:null,sendEnabled:false,ownerGenerations:0,verifierGenerations:0,toolRounds:0,normalToolCalls:0,terminalHandoffCalls:0,
   toolCalls:0,proposedToolCalls:0,rejectedToolCalls:0,handoff:null,generations:gens,toolLatencyMs:0,verificationLatencyMs:null});
  let prepared;const preparationStarted=performance.now();
  try{prepared=await turn.tools.prepare?.()??0;}catch{return problem('C3_PREPARATION_UNAVAILABLE');}
  const preparationMs=performance.now()-preparationStarted,trusted=turn.tools.snapshot(),at=turn.clock(),products=trusted.boundSubjects.filter(s=>s.kind==='PRODUCT').map(s=>s.ref).sort();
  const sourceHash=rawHash(turn.scope.sourceMessageId),canonical=context.buildCanonicalDecisionEvidenceV1({text:turn.latest,sourceMessageId:turn.scope.sourceMessageId,
   productId:products.length===1?products[0]:null,evaluatedAt:at,modelBuyingIntent:null});
  const runtimeProduct=trusted.runtimeProducts?.find(p=>p.subjectRef===products[0]);
  const capture=context.buildContextV2Capture({canonicalEvidence:canonical,verifiedClaims:trusted.protectedClaims,finalCommerceState:state.sales,readiness:[],
   finalTurnEvidence:{schemaVersion:2,contractVersion:'FINAL_TURN_EVIDENCE_V2',sourceMessagePk:state.sourceMessagePk,sourceMessageIdHash:sourceHash,
    preTransitionConversationRevision:state.conversationRevision,finalConversationRevision:state.conversationRevision+1,
    preTransitionSalesCycleRevision:state.sales.revision,finalSalesCycleRevision:state.sales.revision},
   productBinding:{schemaVersion:2,contractVersion:'PRODUCT_BINDING_V2',status:products.length===1?'RESOLVED':products.length?'AMBIGUOUS':'NOT_REQUIRED',
    productIds:products,catalogVersion:trusted.state.factSnapshotVersion},owner:trusted.state.conversationOwner,handoffReasonCode:null,now:at,sourceOccurredAt:new Date(turn.scope.sourceObservedAt),
   ...(runtimeProduct?.attributes?{productAttributes:runtimeProduct.attributes}:{}),...(runtimeProduct?.presentation?{productPresentation:runtimeProduct.presentation}:{})});
  if(capture.status!=='BUILT')return problem(capture.reasonCode??'C3_CONTEXT_UNAVAILABLE');
  const runtimeInput=slot.runtimeInput,rows=[...runtimeInput.history,{role:'customer',text:runtimeInput.latest}];
  const evaluationContext=rows.map(m=>({direction:m.role==='customer'?'INBOUND':'OUTBOUND',senderType:m.role==='customer'?'CUSTOMER':'BOT',messageType:'TEXT',
   text:m.text,attachmentCount:0,occurredAt:at.toISOString()}));
  let requestNumber=0;
  const guarded=await runPinnedC3Turn({baselineRoot,baselineBuild,registration:reg,slotId:slot.slotId,
   sourceClock:at,clock:turn.clock,requestId:turn.scope.requestId,readTrusted:()=>turn.tools.readback(),capture,
   captureProof:{sourceSha:reg.runSourceSha,worldHash:reg.worldHash,scenarioHash:reg.slots.find(s=>s.slotId===slot.slotId).scenarioHash,
    trustedSnapshotHash:rawHash(JSON.stringify(trusted)),contextHash:capture.contextHash,builderHash:reg.config.baseline.captureBuilderHash},
   runtimeInput,evaluationContext,model,modelResource:`projects/${preflight.world.config.vertex.projectId}/locations/global/publishers/google/models/${model.model}`,
   transport:{async send(request){
    assertCurrent();const role=requestNumber++===0?'STRATEGIST':'RESPONDER',body=JSON.parse(request.body);assertRuntimeFirewall(body,reg.corpus.scenarios.map(s=>s.id));
    const row={id:turn.scope.requestId+':'+role,slotId:slot.slotId,turnIndex:slot.turnIndex,role,wireCodec:NATIVE_CODECS[role],runtimeInput,
     boundRuntimeHash:digest(runtimeInput),requestBody:body,requestHash:digest(body),modelConfigHash:digest(model),providerRequests:0,status:'PENDING',observedModelVersion:null};
    observe(row,'STARTED');
    const started=performance.now();
    try{const response=await transport.send(request),t=response.telemetry;
     Object.assign(row,{providerRequests:t.providerRequests,status:'OK',observedModelVersion:t.modelVersion,
      metrics:{latencyMs:performance.now()-started,inputTokens:t.inputTokens,outputTokens:t.outputTokens,costUSD:null,unavailable:{costUSD:'PROVIDER_NOT_EXPOSED',inputTokens:'PROVIDER_NOT_EXPOSED',outputTokens:'PROVIDER_NOT_EXPOSED'}}});
     observe(row,'RESULT');gens.push({id:row.id,role,status:'OK',latencyMs:row.metrics.latencyMs,telemetry:t});return response;
    }catch(error){const t=error.telemetry??{};Object.assign(row,{providerRequests:t.providerRequests??0,status:t.status??'PROVIDER_ERROR',observedModelVersion:t.modelVersion??null,
     metrics:{latencyMs:performance.now()-started,inputTokens:null,outputTokens:null,costUSD:null,unavailable:{costUSD:'PROVIDER_NOT_EXPOSED',inputTokens:'PROVIDER_NOT_EXPOSED',outputTokens:'PROVIDER_NOT_EXPOSED'}}});
     observe(row,'ERROR');gens.push({id:row.id,role,status:row.status,latencyMs:row.metrics.latencyMs,telemetry:t});throw error;}
   }},
   authorizeSharedEgress:async({reply})=>({terminal:{disposition:'SEND_ELIGIBLE',messages:[reply],images:[]}})});
  const result=problem(guarded.terminal.reason??'C3_GUARD_REJECTED');result.toolCalls=prepared;result.normalToolCalls=prepared;
  result.ownerGenerations=requestNumber;result.toolLatencyMs=preparationMs;
  result.evaluationTiming={attestationMs:guarded.attestationMs,observedTurnMs:performance.now()-initial,
   note:'Observed harness latency includes pinned-source attestation; it is not a production architecture latency estimate.'};
  result.c3Witness={guarded,capture,trusted,coverage:referenceContextCoverage(trusted,capture.context,turn.historyMetadata),sourceSha:baselineBuild.sourceSha,worldHash:reg.worldHash};
  if(guarded.terminal.disposition==='SEND_ELIGIBLE')result.terminal={disposition:'SEND_ELIGIBLE',reason:'PASS',text:guarded.reply,fallbackId:null};
  return result;
 }};
}
