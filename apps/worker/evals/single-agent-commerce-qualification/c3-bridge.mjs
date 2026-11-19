// Existing main C3 two-pass generation/guard, followed by the common code authority envelope.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadPinnedC3} from './baseline-source.mjs';
import {assertNativeRuntime,NATIVE_CODECS} from './native-wire.mjs';
import {hardPrecheck,makeBinding} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {digest} from './qualification.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function matchedC3Wire(native,model){
 assert.equal(model.provider,'VERTEX_AI');assert.equal(model.model,'gemini-3.5-flash-lite');assert.equal(model.effort,'high');
 assert.equal(model.location,'global');
 const body=JSON.parse(native.body),original=structuredClone(body);
 const configured=model.generationConfig;
 assert(configured?.maxOutputTokens===8192&&configured.thinkingConfig?.thinkingLevel==='HIGH'&&configured.retry===0,'C_BASELINE_COMMON_CONFIG');
 assert.equal(body.generationConfig.responseMimeType,'application/json','C_BASELINE_NATIVE_JSON_CONTRACT');
 assert(body.generationConfig.responseSchema,'C_BASELINE_NATIVE_SCHEMA');
 // Preserve native JSON/schema/systemInstruction/contents. Only preregistered common knobs change.
 const common={candidateCount:1,maxOutputTokens:configured.maxOutputTokens,thinkingConfig:structuredClone(configured.thinkingConfig)};
 body.generationConfig={...body.generationConfig,...common};
 assert.deepEqual(body.contents,original.contents);assert.deepEqual(body.systemInstruction,original.systemInstruction);
 const wire=JSON.stringify(body);
 return {url:native.url,body:wire,requestBody:body,nativeRequestHash:hash({url:native.url,body:native.body}),
  effectiveRequestHash:hash({url:native.url,body:wire}),outputContractHash:hash({mime:body.generationConfig.responseMimeType,schema:body.generationConfig.responseSchema})};
}

export async function runPinnedC3Turn(input){
 assert(typeof input.authorizeSharedEgress==='function','C_BASELINE_PERSISTED_ENVELOPE_REQUIRED');
 assert.equal(input.baselineBuild?.sourceSha,input.registration?.config.baseline.sourceSha,'C_BASELINE_REFERENCE_CHANGED');
 const attestationStarted=performance.now(),core=await loadPinnedC3(input.baselineRoot,input.baselineBuild),attestationMs=performance.now()-attestationStarted;
 assert(input.sourceClock instanceof Date&&Number.isFinite(input.sourceClock.getTime()),'C_BASELINE_CLOCK');
 const before=await input.readTrusted(),guard=hardPrecheck(before,'Dạ chị.',input.sourceClock);
 if(guard)return {attestationMs,terminal:{disposition:'NO_SEND',messages:[],images:[],reason:guard},generations:[],precheck:{status:'REJECTED',reason:guard,artifactHash:hash(before)}};
 const proof=input.captureProof,context=input.capture?.context,slot=input.registration.slots.find(s=>s.slotId===input.slotId&&s.arm==='C3');
 assert(proof&&slot&&proof.sourceSha===input.registration.runSourceSha&&proof.worldHash===input.registration.worldHash&&
  proof.scenarioHash===slot.scenarioHash&&proof.trustedSnapshotHash===hash(before)&&proof.contextHash===input.capture.contextHash&&
  proof.builderHash===input.registration.config.baseline.captureBuilderHash&&/^[a-f0-9]{64}$/.test(proof.builderHash),'C_BASELINE_CAPTURE_BINDING');
 assert(context&&digest(context.productBinding.productIds.slice().sort())===digest(before.boundSubjects.filter(s=>s.kind==='PRODUCT').map(s=>s.ref).sort()),'C_BASELINE_PRODUCT_BINDING');
 const claims=new Set(before.protectedClaims.map(digest));assert(context.verifiedClaims.every(c=>claims.has(digest(c))),'C_BASELINE_TRUSTED_CLAIMS');
 const originalBinding=makeBinding(input.requestId,'',before),requests=[];
 try{
  const native=await core.runTrackCV5TwoPassBenchmarkCase({lane:'PRODUCTION_CONTRACT',modelResource:input.modelResource,
   capture:input.capture,evaluationAt:input.sourceClock,evaluationContext:input.evaluationContext,signal:input.signal,
   transport:{async send(request){
    assert(requests.length<2,'C_BASELINE_GENERATION_CAP');
    const role=requests.length===0?'STRATEGIST':'RESPONDER',wire=matchedC3Wire(request,input.model);
    assertNativeRuntime(wire.requestBody,NATIVE_CODECS[role],input.runtimeInput);
    const row={role,...wire};requests.push(row);
    try{const response=await input.transport.send({url:wire.url,body:wire.body,signal:request.signal});row.response=response;return response;}
    catch(error){row.errorCode=error.code??error.message;throw error;}
   }}});
  const current=await input.readTrusted(),checkedAt=input.clock();
  const nowBinding=makeBinding(input.requestId,'',current),invalid=hardPrecheck(current,native.reply,checkedAt);
  if(invalid||hash(nowBinding)!==hash(originalBinding))return {attestationMs,nativeBuilderIdentity:native.identity,requests,
   terminal:{disposition:'NO_SEND',messages:[],images:[],reason:invalid??'CURRENT_SNAPSHOT_CHANGED'}};
  // This callback uses the shared persisted delivery envelope. Missing wiring cannot be labelled matched.
  const eligible=await input.authorizeSharedEgress({reply:native.reply,output:native.output,trusted:current,checkedAt});
  if(eligible.terminal?.disposition==='SEND_ELIGIBLE')assert.deepEqual(eligible.terminal.messages,[native.reply],'C_BASELINE_REPLY_CHANGED');
  return {attestationMs,nativeBuilderIdentity:native.identity,requests,reply:native.reply,output:native.output,sharedEgressPending:true,
   boundary:{expected:originalBinding,current:nowBinding,checkedAt:checkedAt.toISOString(),trusted:current},terminal:eligible.terminal};
 }catch(error){
  return {attestationMs,requests,errorCode:error.code??error.message,terminal:{disposition:'NO_SEND',messages:[],images:[],reason:'BASELINE_ATTEMPT_FAILED'}};
 }
}
