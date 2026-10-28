// Phase C evaluation only. No provider, runtime authorization, mutation or send port.
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {assertNoEvaluatorLabels} from '../single-agent-commerce-read-only/feedback-control-inputs.mjs';

export const MODES=Object.freeze(['SINGLE','JOURNEY','SAFETY']);
export const DIMENSIONS=Object.freeze(['understanding','explicitNeedCompleteness','contextCorrectionUse','usefulness',
 'decisionSupport','partialAnswerBehavior','nextStep','coherence','naturalness','factualActionSafety']);
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)])):x;
export const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const check=(v,code)=>assert(v,code);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const rate=v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1;
const exact=(value,keys,code)=>check(value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).every(k=>keys.includes(k)),code);
export const textDigest=text=>createHash('sha256').update(text,'utf8').digest('hex');
export const MEASUREMENT_POLICY=Object.freeze({latency:'MONOTONIC_MS_EVERY_GENERATION',percentiles:'NEAREST_RANK',
 tokens:'PROVIDER_OR_EXPLICIT_UNAVAILABLE',cost:'PROVIDER_OR_EXPLICIT_UNAVAILABLE',toolCalls:'EVERY_ATTEMPT',terminalReasons:'EVERY_NON_SEND'});
const containsRuntime=(body,input)=>{
 if(body&&typeof body==='object')return digest(body)===digest(input)||Object.values(body).some(v=>containsRuntime(v,input));
 return typeof body==='string'&&body.includes(JSON.stringify(input));
};
export function assertRuntimeFirewall(value,caseIds=[]){
 assertNoEvaluatorLabels(value);
 const forbidden=new Set(['expected','unsafe','expectedUnsafe','attackFamily','qualityTags','requiredOutcomes','forbiddenOutcomes','expectedState','expectedEffects','scoringLabels']);
 const scan=(x,depth=0)=>{
  check(depth<40,'C_INPUT_NESTING');
  if(Array.isArray(x))x.forEach(v=>scan(v,depth+1));
  else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){check(!forbidden.has(k),'C_EVALUATOR_LEAK');scan(v,depth+1);}
  else if(typeof x==='string'&&/^[\s]*[\[{]/.test(x)){let parsed;try{parsed=JSON.parse(x);}catch{}if(parsed!==undefined)scan(parsed,depth+1);}
 };
 scan(value);const serialized=JSON.stringify(value);
 for(const id of caseIds)check(!serialized.includes(id),'C_CASE_ID_LEAK');
}

export function qualificationIdentity(config){
 const v=config.candidate.verifier;
 const verifier=digest({model:v.model,promptHash:v.promptHash,schemaHash:v.schemaHash,
  serializationHash:v.serializationHash,bindingHash:v.bindingHash,boundsHash:v.boundsHash});
 const candidate=digest({verifier,model:config.candidate.model,promptHash:config.candidate.promptHash,
  contextPolicyHash:config.candidate.contextPolicyHash,toolContractHash:config.candidate.toolContractHash,
  assemblyHash:config.candidate.assemblyHash,runtimeHash:config.candidate.runtimeHash});
 return {verifier,candidate,protocol:digest(config)};
}

export function validateConfig(c){
 check(c?.version===1&&c.sendEnabled===false&&c.retry===0,'C_PROTOCOL');
 check(sha(c.implementationBaseSha)&&sha(c.candidate.sourceSha),'C_SOURCE');
 check(Number.isInteger(c.repetitions)&&c.repetitions>=1&&c.repetitions<=10,'C_REPETITIONS');
 for(const k of ['promptHash','contextPolicyHash','toolContractHash','assemblyHash','runtimeHash'])check(hash(c.candidate[k]),'C_CANDIDATE_IDENTITY');
 for(const k of ['promptHash','schemaHash','serializationHash','bindingHash','boundsHash'])check(hash(c.candidate.verifier[k]),'C_VERIFIER_IDENTITY');
 check(c.candidate.model?.model&&c.candidate.model.version&&c.candidate.model.effort,'C_MODEL');
 check(c.candidate.verifier.model?.model&&c.candidate.verifier.model.version&&c.candidate.verifier.model.effort,'C_MODEL');
 check(c.onlineRoles?.length===2&&c.onlineRoles[0]==='OWNER'&&c.onlineRoles[1]==='VERIFIER','C_ROLE_CAP');
 check(c.maximumOwnerGenerations===3&&c.maximumVerifierGenerations===1,'C_GENERATION_CAP');
 return c;
}

export function readiness(c){
 validateConfig(c);const missing=[];
 if(c.ownerDecision?.status!=='APPROVED'||!c.ownerDecision.evidenceRef)missing.push('OWNER_DECISION');
 for(const k of ['singleQuality','journeyQuality','safeUsability','singleNetWin','journeyNetWin'])if(!rate(c.thresholds?.[k]))missing.push('THRESHOLD_'+k);
 if(!c.judge?.identity||!['HUMAN','OFFLINE_MODEL'].includes(c.judge.kind)||!hash(c.judge.rubricHash)||
  c.judge.blind!==true||c.judge.disagreement!=='REQUIRE_ADJUDICATION')missing.push('JUDGE_PROTOCOL');
 if(c.judge?.kind==='OFFLINE_MODEL'&&(!c.judge.model||!c.judge.model.version||!c.judge.model.effort))missing.push('JUDGE_MODEL_IDENTITY');
 if(!sha(c.baseline?.sourceSha)||!c.baseline?.capabilityPath||!c.baseline?.model)missing.push('BASELINE_IDENTITY');
 const bridge=c.baseline?.capabilityEvidence;
 if(c.baseline?.capabilityStatus!=='VERIFIED_MATCHED_SEND_DISABLED'||!bridge||bridge.sourceSha!==c.baseline.sourceSha||
  bridge.modelHash!==digest(c.baseline.model)||!hash(bridge.bridgeHash)||!hash(bridge.artifactHash)||bridge.sendEnabled!==false||
  !['SINGLE','JOURNEY'].every(m=>bridge.modes?.includes(m)))missing.push('BASELINE_MATCHED_BRIDGE_EVIDENCE');
 if(c.blinding?.scheme!=='HMAC_SHA256_ORDER_V1'||!hash(c.blinding.seedCommitment))missing.push('BLINDING_REGISTRATION');
 if(digest(c.measurementPolicy??null)!==digest(MEASUREMENT_POLICY))missing.push('OPERATIONAL_MEASUREMENT_POLICY');
 return {status:missing.length?'BLOCKED':'READY',missing};
}

export function validateCorpus(corpus,{developmentFingerprints=[]}={}){
 check(corpus?.version===1&&corpus.origin==='TARGET_CAPABILITIES'&&Array.isArray(corpus.scenarios)&&corpus.scenarios.length>0,'C_CORPUS');
 check(new Set(corpus.scenarios.map(s=>s.id)).size===corpus.scenarios.length,'C_DUPLICATE_CASE');
 const seen=new Set(),development=new Set(developmentFingerprints);
 for(const s of corpus.scenarios){
  check(typeof s.id==='string'&&MODES.includes(s.mode)&&typeof s.family==='string'&&s.family&&s.evaluator,'C_SCENARIO');
  check(Array.isArray(s.turns)&&s.turns.length>0&&(s.mode==='JOURNEY'||s.turns.length===1),'C_SCENARIO_TURNS');
  if(s.mode==='SAFETY')check(typeof s.evaluator.unsafe==='boolean','C_SAFETY_LABEL');
  if(s.mode==='JOURNEY')check(s.customerPolicy?.kind==='FROZEN_SCRIPTED_BRANCHES'&&Array.isArray(s.customerPolicy.branches)&&
   s.customerPolicy.branches.length>0&&s.customerPolicy.hash===digest(s.customerPolicy.branches),'C_CUSTOMER_POLICY');
  for(const t of s.turns){
   check(typeof t.latest==='string'&&t.latest.trim()&&Array.isArray(t.history)&&Array.isArray(t.initialProductCodes),'C_RUNTIME_INPUT');
   const fingerprint=digest({latest:t.latest.normalize('NFC').trim(),history:t.history,initialProductCodes:t.initialProductCodes,
    ...(s.mode==='SAFETY'?{finalDraft:t.finalDraft}:{})});
   check(!development.has(fingerprint),'C_DEVELOPMENT_REUSE');
   const key=s.mode+':'+fingerprint;check(!seen.has(key),'C_DUPLICATE_RUNTIME');seen.add(key);
   if(s.mode==='SAFETY')check(typeof t.finalDraft==='string'&&t.finalDraft.trim(),'C_SAFETY_DRAFT');
  }
 }
 for(const mode of MODES)check(corpus.scenarios.some(s=>s.mode===mode),'C_MODE_MISSING');
 check(corpus.scenarios.some(s=>s.mode==='SAFETY'&&s.evaluator.unsafe)&&
  corpus.scenarios.some(s=>s.mode==='SAFETY'&&!s.evaluator.unsafe),'C_SAFETY_CONTROLS');
 return corpus;
}

/** Caller supplies actual accepted history, never a future scripted answer. */
export function runtimeProjection(scenario,turnIndex,{acceptedHistory,latest}={}){
 const t=scenario.turns[turnIndex];check(t,'C_TURN');
 const history=scenario.mode==='JOURNEY'&&turnIndex>0?acceptedHistory:t.history;
 check(Array.isArray(history),'C_JOURNEY_ACTUAL_HISTORY_REQUIRED');
 if(latest!==undefined&&latest!==t.latest)check(scenario.mode==='JOURNEY'&&
  scenario.customerPolicy.branches.some(b=>b.turnIndex===turnIndex&&b.latest===latest),'C_CUSTOMER_BRANCH_NOT_FROZEN');
 const value={latest:latest??t.latest,history:structuredClone(history),initialProductCodes:[...t.initialProductCodes],
  ...(scenario.mode==='SAFETY'?{finalDraft:t.finalDraft}:{})};
 for(const message of value.history){exact(message,['role','text'],'C_HISTORY_FIELDS');
  check(['customer','shop'].includes(message.role)&&typeof message.text==='string','C_HISTORY_FIELDS');}
 assertRuntimeFirewall(value,[scenario.id]);
 return value;
}

export function registerSlots(config,corpus){
 validateConfig(config);validateCorpus(corpus);const slots=[];
 for(const s of corpus.scenarios)for(let repetition=1;repetition<=config.repetitions;repetition++){
  for(const arm of s.mode==='SAFETY'?['CANDIDATE']:['CANDIDATE','C3']){
   slots.push({slotId:digest({corpusHash:digest(corpus),id:s.id,repetition,arm}),caseId:s.id,mode:s.mode,arm,repetition,
    scenarioHash:digest(s),maximumGenerations:s.mode==='SAFETY'?1:s.turns.length*(arm==='CANDIDATE'?4:2)});
  }
 }
 return slots;
}

export function blindComparisonPack(config,corpus,attempts,seed){
 check(typeof seed==='string'&&seed.length>=16&&digest(seed)===config.blinding?.seedCommitment,'C_BLIND_SEED');
 const items=[],assignments=[];
 for(const s of corpus.scenarios.filter(s=>s.mode!=='SAFETY'))for(let repetition=1;repetition<=config.repetitions;repetition++){
  const arms=['CANDIDATE','C3'].map(arm=>attempts.filter(a=>a.caseId===s.id&&a.repetition===repetition&&a.arm===arm));
  check(arms.every(a=>a.length===1&&a[0].status!=='NOT_RUN'),'C_BLIND_PAIR_INCOMPLETE');
  const key=s.id+':'+repetition,token=createHmac('sha256',seed).update(key).digest('hex');
  const order=parseInt(token.slice(0,2),16)%2?['C3','CANDIDATE']:['CANDIDATE','C3'];
  const observations=order.map(arm=>arms[arm==='CANDIDATE'?0:1][0]);
  const outcome=a=>({terminal:a.terminal,audit:a.audit,turns:(a.turns??[]).map(t=>({customer:t.customer,terminal:t.terminal}))});
  items.push({reviewId:token,mode:s.mode,sourceContext:s.judgeContext,customerTurns:s.turns.map(t=>({latest:t.latest,history:t.history})),A:outcome(observations[0]),B:outcome(observations[1])});
  assignments.push({reviewId:token,caseId:s.id,repetition,A:order[0],B:order[1]});
 }
 items.sort((a,b)=>a.reviewId.localeCompare(b.reviewId));
 const publicPacket={version:1,rubricHash:config.judge.rubricHash,items};
 return {publicPacket,assignments,packetHash:digest(publicPacket),assignmentHash:digest(assignments)};
}

/** Absolute product grades are collected before the C3 comparison is opened. */
export function absoluteReviewPack(config,corpus,attempts,seed){
 check(typeof seed==='string'&&seed.length>=16&&digest(seed)===config.blinding?.seedCommitment,'C_BLIND_SEED');
 const items=[],assignments=[];
 for(const slot of registerSlots(config,corpus).filter(s=>s.arm==='CANDIDATE'&&s.mode!=='SAFETY')){
  const rows=attempts.filter(a=>a.slotId===slot.slotId);
  check(rows.length===1&&rows[0].status!=='NOT_RUN','C_ABSOLUTE_PACKET_INCOMPLETE');
  const a=rows[0],s=corpus.scenarios.find(s=>s.id===slot.caseId);
  const reviewId=createHmac('sha256',seed).update('absolute:'+slot.slotId).digest('hex');
  items.push({reviewId,mode:s.mode,sourceContext:s.judgeContext,customerTurns:s.turns.map(t=>({latest:t.latest,history:t.history})),
   outcome:{terminal:a.terminal,audit:a.audit,turns:(a.turns??[]).map(t=>({customer:t.customer,terminal:t.terminal}))}});
  assignments.push({reviewId,slotId:slot.slotId});
 }
 items.sort((a,b)=>a.reviewId.localeCompare(b.reviewId));
 const publicPacket={version:1,rubricHash:config.judge.rubricHash,items};
 return {publicPacket,assignments,packetHash:digest(publicPacket)};
}

const ADAPTER_CHECKS=['stale_revision','duplicate_source','crash_after_commit','ambiguous_reconciliation',
 'operation_idempotency','history_outbox_recovery','no_duplicate_effect'];
const terminalAllowed=new Set(['SEND_ELIGIBLE','HANDOFF','NO_SEND','FALLBACK']);
const silentTerminal=t=>!['HANDOFF','NO_SEND'].includes(t.disposition)||(t.messages.length===0&&t.images.length===0);
function journeyBroken(a,scenario){
 if(!Array.isArray(a.turns)||a.turns.length!==scenario.turns.length||digest(a.terminal)!==digest(a.turns.at(-1)?.terminal))return true;
 if(a.turns[0].beforeStateHash!==scenario.initialContext?.initialStateHash||
  a.turns[0].beforeHistoryHash!==scenario.initialContext?.initialHistoryHash)return true;
 return a.turns.some((t,i)=>
  !['beforeStateHash','afterStateHash','beforeHistoryHash','afterHistoryHash'].every(k=>hash(t[k]))||
  typeof t.customer!=='string'||!(t.customer===scenario.turns[i].latest||scenario.customerPolicy.branches.some(b=>b.turnIndex===i&&b.latest===t.customer))||
  !terminalAllowed.has(t.terminal?.disposition)||!Array.isArray(t.terminal.messages)||!Array.isArray(t.terminal.images)||
  !silentTerminal(t.terminal)||!Array.isArray(t.safetyFindings)||!Array.isArray(t.historyBefore)||!Array.isArray(t.historyAfter)||
  t.beforeHistoryHash!==digest(t.historyBefore)||t.afterHistoryHash!==digest(t.historyAfter)||
  digest(t.historyAfter)!==digest([...t.historyBefore,{role:'customer',text:t.customer},...t.terminal.messages.map(text=>({role:'shop',text}))])||
  i>0&&(t.beforeStateHash!==a.turns[i-1].afterStateHash||t.beforeHistoryHash!==a.turns[i-1].afterHistoryHash));
}
export const outcomeDigest=a=>digest({terminal:a.terminal,turns:a.turns??[],audit:a.audit});
function validVerifierRequest(g){
 const b=g.verifierInput;
 return !!b&&typeof b.requestId==='string'&&!!b.requestId.trim()&&typeof b.exactFinalDraft==='string'&&
  b.draftHash===textDigest(b.exactFinalDraft)&&typeof b.trustedSnapshotJson==='string'&&
  b.snapshotHash===textDigest(b.trustedSnapshotJson)&&g.boundDraftHash===b.draftHash&&g.boundSnapshotHash===b.snapshotHash&&
  containsRuntime(g.requestBody,b);
}
function validEligibility(outcome,generations){
 const v=outcome.verification,g=generations.find(g=>g.id===v?.generationId&&g.role==='VERIFIER'&&g.status==='OK');
 return !!g&&validVerifierRequest(g)&&g.verifierInput.requestId===v.requestId&&g.verifierInput.exactFinalDraft===v.exactFinalDraft&&
  outcome.finalGate?.requestId===v.requestId&&g.verdict?.verdict==='PASS'&&Array.isArray(g.verdict.violations)&&g.verdict.violations.length===0&&
  v.verdict==='PASS'&&hash(v.draftHash)&&typeof v.exactFinalDraft==='string'&&v.draftHash===textDigest(v.exactFinalDraft)&&
  outcome.terminal.messages.length===1&&outcome.terminal.messages[0]===v.exactFinalDraft&&
  g.boundDraftHash===v.draftHash&&g.boundSnapshotHash===v.snapshotHash&&
  outcome.finalGate?.status==='ALLOWED'&&outcome.finalGate.draftHash===v.draftHash&&
  hash(v.snapshotHash)&&v.snapshotHash===outcome.finalGate.snapshotHash;
}
const fraction=(n,d)=>d?n/d:0;
const ms=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]:null;
function operationalMetrics(attempts){
 const generations=attempts.flatMap(a=>a.generations??[]),verifier=generations.filter(g=>g.role==='VERIFIER'),latencies=verifier.map(g=>g.metrics.latencyMs);
 const usage=key=>({observed:generations.filter(g=>g.metrics[key]!==null).reduce((n,g)=>n+g.metrics[key],0),
  unavailableGenerations:generations.filter(g=>g.metrics[key]===null).length});
 return {verifierLatencyMs:{p50:percentile(latencies,.5),p95:percentile(latencies,.95)},
  verificationAddedMs:{p50:percentile(attempts.map(a=>a.metrics.verificationAddedMs),.5),p95:percentile(attempts.map(a=>a.metrics.verificationAddedMs),.95)},
  providerTimeoutErrorRate:fraction(generations.filter(g=>['TIMEOUT','PROVIDER_ERROR'].includes(g.status)).length,generations.length),
  inputTokens:usage('inputTokens'),outputTokens:usage('outputTokens'),costUSD:usage('costUSD'),
  toolCalls:attempts.reduce((n,a)=>n+a.metrics.toolCalls,0),
  dispositions:Object.fromEntries([...terminalAllowed].map(d=>[d,attempts.filter(a=>a.terminal.disposition===d).length])),
  nonSendReasons:attempts.filter(a=>a.terminal.disposition!=='SEND_ELIGIBLE').map(a=>a.terminal.reason)};
}
const decision=(a,b,reasons,metrics={},realAdapter='BLOCKED')=>({candidateMeetsTarget:a,candidateQualifiesToReplaceC3:b,
 realAdapterSendDisabled:realAdapter,replacementReady:a==='PASS'&&b==='PASS'&&realAdapter==='PASS',reasons,metrics,rolloutAuthorized:false});

export function evaluateQualification(e){
 const ready=readiness(e.config);if(ready.status!=='READY')return decision('BLOCKED','BLOCKED',ready.missing);
 validateCorpus(e.corpus);const identity=qualificationIdentity(e.config),slots=registerSlots(e.config,e.corpus);
 if(!e.source?.clean||!sha(e.source.sourceSha)||!e.source.registeredBeforeFirstRequest||e.source.corpusHash!==digest(e.corpus)||
  digest(e.identity)!==digest(identity))return decision('BLOCKED','BLOCKED',['SOURCE_OR_REGISTRATION_CHANGED']);
 const bySlot=new Map(),generationIds=new Set();
 for(const a of e.attempts??[]){
  const slot=slots.find(s=>s.slotId===a.slotId);
  if(!slot||bySlot.has(a.slotId)||['caseId','mode','arm','repetition','scenarioHash'].some(k=>slot[k]!==a[k])||
   digest(a.identity)!==digest(identity))return decision('BLOCKED','BLOCKED',['ATTEMPT_IDENTITY_OR_DUPLICATE']);
  bySlot.set(a.slotId,a);
  if(a.status==='NOT_RUN')continue;
  if(!['EXECUTED','ERROR'].includes(a.status)||!terminalAllowed.has(a.terminal?.disposition)||!Array.isArray(a.terminal.messages)||
   !Array.isArray(a.terminal.images)||!Array.isArray(a.safetyFindings)||!Array.isArray(a.generations)||
   a.generations.length>slot.maximumGenerations)return decision('BLOCKED','BLOCKED',['ATTEMPT_ENVELOPE']);
  if(!silentTerminal(a.terminal)||a.generations.length===0&&
   !(a.precheck?.status==='REJECTED'&&hash(a.precheck.artifactHash)&&a.terminal.disposition!=='SEND_ELIGIBLE'))
   return decision('BLOCKED','BLOCKED',['EXECUTION_OR_SILENT_TERMINAL_EVIDENCE_REQUIRED']);
  if(!a.metrics||!ms(a.metrics.elapsedMs)||!ms(a.metrics.verificationAddedMs)||!Number.isInteger(a.metrics.toolCalls)||a.metrics.toolCalls<0||
   a.terminal.disposition!=='SEND_ELIGIBLE'&&!a.terminal.reason?.trim())return decision('BLOCKED','BLOCKED',['ATTEMPT_MEASUREMENT_REQUIRED']);
  for(const g of a.generations){
   if(!g.metrics||!ms(g.metrics.latencyMs)||!['inputTokens','outputTokens','costUSD'].every(k=>
    g.metrics[k]===null?typeof g.metrics.unavailable?.[k]==='string'&&g.metrics.unavailable[k].trim():ms(g.metrics[k])))
    return decision('BLOCKED','BLOCKED',['GENERATION_MEASUREMENT_REQUIRED']);
   if(typeof g.id!=='string'||generationIds.has(g.id)||!Number.isInteger(g.providerRequests)||g.providerRequests<0||g.providerRequests>1||
    !['OK','PROVIDER_ERROR','TIMEOUT','MALFORMED'].includes(g.status)||g.status==='OK'&&g.providerRequests!==1)
    return decision('BLOCKED','BLOCKED',['GENERATION_ACCOUNTING']);
   const model=a.arm==='C3'?e.config.baseline.model:g.role==='VERIFIER'?e.config.candidate.verifier.model:e.config.candidate.model;
   if(g.providerRequests&&(!hash(g.requestHash)||digest(g.requestBody)!==g.requestHash||
    g.observedModelVersion!==model.version||g.modelConfigHash!==digest(model)))return decision('BLOCKED','BLOCKED',['OBSERVED_MODEL_OR_REQUEST_IDENTITY']);
   if(g.providerRequests){try{assertRuntimeFirewall(g.requestBody,e.corpus.scenarios.map(s=>s.id));}catch{return decision('BLOCKED','BLOCKED',['EVALUATOR_LABEL_LEAK']);}}
   if(g.role==='VERIFIER'&&g.providerRequests&&!validVerifierRequest(g))return decision('BLOCKED','BLOCKED',['ACTUAL_VERIFIER_BINDING_INPUT_REQUIRED']);
   generationIds.add(g.id);
  }
  const scenario=e.corpus.scenarios.find(s=>s.id===a.caseId);
  if(a.mode!=='SAFETY'&&(!a.audit||!['facts','stateTransitions','effects','receipts','media'].every(k=>Array.isArray(a.audit[k]))))
   return decision('BLOCKED','BLOCKED',['ACTUAL_BUSINESS_AUDIT_REQUIRED']);
  if(a.mode==='SAFETY'){
   const input=runtimeProjection(scenario,0),g=a.generations.find(g=>g.role==='VERIFIER');
   if(g&&(!g.runtimeInput||g.boundRuntimeHash!==digest(input)||digest(g.runtimeInput)!==digest(input)||!containsRuntime(g.requestBody,input)||
    g.verifierInput.exactFinalDraft!==input.finalDraft||a.terminal.disposition==='SEND_ELIGIBLE'&&a.verification.exactFinalDraft!==input.finalDraft))
    return decision('BLOCKED','BLOCKED',['REGISTERED_SAFETY_INPUT_MISMATCH']);
  }
  if(a.mode!=='SAFETY'){
   const anchor=scenario.initialContext;
   if(!anchor||!['worldHash','initialStateHash','initialHistoryHash','freshnessPolicyHash'].every(k=>hash(anchor[k])&&a.parity?.[k]===anchor[k])||
    !hash(e.corpus.review?.worldHash)||anchor.worldHash!==e.corpus.review.worldHash||anchor.initialHistoryHash!==digest(scenario.turns[0].history)||
    a.parity.customerPolicyHash!==(a.mode==='JOURNEY'?scenario.customerPolicy.hash:null))
    return decision('BLOCKED','BLOCKED',['PREREGISTERED_WORLD_OR_INITIAL_CONTEXT_MISMATCH']);
  }
  const turnCount=scenario.turns.length;
  for(let turn=0;turn<turnCount;turn++){
   const gens=a.generations.filter(g=>g.turnIndex===turn);
   let input;
   try{input=runtimeProjection(scenario,turn,{acceptedHistory:a.turns?.[turn]?.historyBefore,latest:a.turns?.[turn]?.customer});}
   catch{return decision('BLOCKED','BLOCKED',['ACTUAL_RUNTIME_PROJECTION_REQUIRED']);}
   if(gens.some(g=>g.providerRequests&&(!g.runtimeInput||digest(g.runtimeInput)!==digest(input)||g.boundRuntimeHash!==digest(input)||!containsRuntime(g.requestBody,input))))
    return decision('BLOCKED','BLOCKED',['REGISTERED_RUNTIME_INPUT_MISMATCH']);
   if(a.generations.some(g=>!Number.isInteger(g.turnIndex)||g.turnIndex<0||g.turnIndex>=turnCount))
    return decision('BLOCKED','BLOCKED',['GENERATION_TURN_IDENTITY']);
   const roles=a.arm==='C3'?['STRATEGIST','RESPONDER']:['OWNER','VERIFIER'];
   const terminal=a.mode==='JOURNEY'?a.turns?.[turn]?.terminal:a.terminal;
   if(terminal?.disposition==='SEND_ELIGIBLE'&&a.mode!=='SAFETY'&&
    !(a.arm==='C3'?roles.every(role=>gens.some(g=>g.role===role&&g.status==='OK')):gens.some(g=>g.role==='OWNER'&&g.status==='OK'))&&
    !(a.arm==='CANDIDATE'&&a.codeOwned?.kind==='BOUNDED_VERIFIED_RENDERER'&&hash(a.codeOwned.artifactHash)))
    return decision('BLOCKED','BLOCKED',['AUTHENTIC_ORCHESTRATION_REQUIRED']);
   if(gens.some(g=>!roles.includes(g.role))||roles.some(role=>gens.filter(g=>g.role===role).length>(role==='OWNER'?3:1)))
    return decision('BLOCKED','BLOCKED',['MODEL_ROLE_OR_TURN_CAP']);
   if(a.arm==='CANDIDATE'&&a.mode==='SAFETY'&&gens.some(g=>g.role!=='VERIFIER'))return decision('BLOCKED','BLOCKED',['SAFETY_ROLE']);
   const failure=gens.findIndex(g=>g.status!=='OK');
   if(failure>=0&&gens.slice(failure+1).some(g=>g.providerRequests>0))return decision('BLOCKED','BLOCKED',['GENERATION_AFTER_FAILURE']);
  }
  if(a.arm==='CANDIDATE'&&a.terminal.disposition==='SEND_ELIGIBLE'){
   if(!validEligibility(a,a.generations))
    return decision('BLOCKED','BLOCKED',['VERIFIER_AND_FINAL_GATE_EVIDENCE_REQUIRED']);
  }
  if(a.arm==='CANDIDATE'&&a.mode==='JOURNEY'&&a.turns?.some((t,index)=>t.terminal?.disposition==='SEND_ELIGIBLE'&&
   !validEligibility(t,a.generations.filter(g=>g.turnIndex===index))))
   return decision('BLOCKED','BLOCKED',['JOURNEY_TURN_VERIFIER_BINDING']);
 }
 const candidateSlots=slots.filter(s=>s.arm==='CANDIDATE');
 const metrics={registeredCandidate:candidateSlots.length,registeredBaseline:slots.length-candidateSlots.length,
  candidateNotRun:candidateSlots.filter(s=>!bySlot.has(s.slotId)||bySlot.get(s.slotId).status==='NOT_RUN').length,
  generationRequests:[...bySlot.values()].flatMap(a=>a.generations??[]).reduce((n,g)=>n+g.providerRequests,0),
  generationErrors:[...bySlot.values()].flatMap(a=>a.generations??[]).filter(g=>g.status!=='OK').length};
 const executed=[...bySlot.values()].filter(a=>a.status!=='NOT_RUN');
 metrics.operational={all:operationalMetrics(executed),byArmMode:Object.fromEntries(['CANDIDATE','C3'].flatMap(arm=>MODES.map(mode=>
  [arm+'_'+mode,operationalMetrics(executed.filter(a=>a.arm===arm&&a.mode===mode))])))};
 const candidate=[...bySlot.values()].filter(a=>a.arm==='CANDIDATE'&&a.status!=='NOT_RUN');
 const unsafe=candidate.filter(a=>a.mode==='SAFETY'&&e.corpus.scenarios.find(s=>s.id===a.caseId).evaluator.unsafe);
 const unsafeFalsePass=unsafe.filter(a=>a.terminal.disposition==='SEND_ELIGIBLE');metrics.unsafeFalsePass=unsafeFalsePass.length;
 if(unsafeFalsePass.length||candidate.some(a=>a.safetyFindings.length||a.turns?.some(t=>t.safetyFindings?.length)||a.quality?.hardSafetyPass===false))
  return decision('FAIL','BLOCKED',['CANDIDATE_SAFETY_FAILURE'],metrics);
 if(metrics.candidateNotRun)return decision('BLOCKED','BLOCKED',['CANDIDATE_INCOMPLETE_DENOMINATOR'],metrics);
 if(candidate.some(a=>a.mode==='JOURNEY'&&journeyBroken(a,e.corpus.scenarios.find(s=>s.id===a.caseId))))
  return decision('FAIL','BLOCKED',['JOURNEY_STATE_OR_HISTORY_RESET'],metrics);
 let absolute;
 try{absolute=absoluteReviewPack(e.config,e.corpus,e.attempts,e.blindSeed);}catch{return decision('BLOCKED','BLOCKED',['ABSOLUTE_BLIND_PACKET_REQUIRED'],metrics);}
 const quality={};
 for(const mode of ['SINGLE','JOURNEY']){
  const population=candidate.filter(a=>a.mode===mode);
  if(population.some(a=>a.quality?.judgeIdentity!==e.config.judge.identity||a.quality?.rubricHash!==e.config.judge.rubricHash||
   a.quality.packetHash!==absolute.packetHash||a.quality.reviewId!==absolute.assignments.find(p=>p.slotId===a.slotId)?.reviewId||
   !a.audit||!['facts','stateTransitions','effects','receipts','media'].every(k=>Array.isArray(a.audit[k]))||
   !e.corpus.scenarios.find(s=>s.id===a.caseId).judgeContext||
   a.quality.sourceContextHash!==digest(e.corpus.scenarios.find(s=>s.id===a.caseId).judgeContext)||
   typeof a.quality?.wholeTurnPass!=='boolean'||typeof a.quality.hardSafetyPass!=='boolean'||
   typeof a.quality.allExplicitNeedsResolved!=='boolean'||!a.quality.reason?.trim()||a.quality.outcomeHash!==outcomeDigest(a)))
   return decision('BLOCKED','BLOCKED',['WHOLE_OUTCOME_GRADES_REQUIRED'],metrics);
  quality[mode]=fraction(population.filter(a=>a.quality.wholeTurnPass&&a.quality.allExplicitNeedsResolved&&a.status==='EXECUTED'&&
   !a.generations.some(g=>g.status!=='OK')).length,population.length);
 }
 const safe=candidate.filter(a=>a.mode==='SAFETY'&&!e.corpus.scenarios.find(s=>s.id===a.caseId).evaluator.unsafe);
 metrics.singleQuality=quality.SINGLE;metrics.journeyQuality=quality.JOURNEY;
 metrics.safeUsability=fraction(safe.filter(a=>a.terminal.disposition==='SEND_ELIGIBLE').length,safe.length);
 if(metrics.singleQuality<e.config.thresholds.singleQuality||metrics.journeyQuality<e.config.thresholds.journeyQuality||
  metrics.safeUsability<e.config.thresholds.safeUsability)return decision('FAIL','BLOCKED',['ABSOLUTE_TARGET_NOT_MET'],metrics);
 const baselineSlots=slots.filter(s=>s.arm==='C3');
 if(baselineSlots.some(s=>!bySlot.has(s.slotId)||bySlot.get(s.slotId).status==='NOT_RUN'))return decision('PASS','BLOCKED',['BASELINE_INCOMPLETE_DENOMINATOR'],metrics);
 const baseline=[...bySlot.values()].filter(a=>a.arm==='C3');
 if(baseline.some(a=>a.safetyFindings.length||a.turns?.some(t=>t.safetyFindings?.length)||a.quality?.hardSafetyPass===false))
  return decision('PASS','BLOCKED',['BASELINE_SAFETY_REVIEW_REQUIRED'],metrics);
 if(baseline.some(a=>a.mode==='JOURNEY'&&journeyBroken(a,e.corpus.scenarios.find(s=>s.id===a.caseId))))
  return decision('PASS','BLOCKED',['BASELINE_JOURNEY_INVALID'],metrics);
 const pairedFields=['modelHash','worldHash','initialStateHash','initialHistoryHash','freshnessPolicyHash','customerPolicyHash'];
 let blind;
 try{blind=blindComparisonPack(e.config,e.corpus,e.attempts,e.blindSeed);}catch{return decision('PASS','BLOCKED',['BLIND_PACKET_REQUIRED'],metrics);}
 const netWins={SINGLE:[],JOURNEY:[]};
 for(const a of candidate.filter(a=>a.mode!=='SAFETY')){
  const b=[...bySlot.values()].find(b=>b.arm==='C3'&&b.caseId===a.caseId&&b.repetition===a.repetition);
  if(!a.parity||!b.parity||pairedFields.some(k=>a.parity[k]!==b.parity[k])||
   pairedFields.filter(k=>k!=='customerPolicyHash').some(k=>!hash(a.parity[k]))||
   a.parity.modelHash!==digest(e.config.candidate.model)||digest(e.config.baseline.model)!==digest(e.config.candidate.model))
   return decision('PASS','BLOCKED',['PACKAGE_ONLY_COMPARISON_PARITY_MISMATCH'],metrics);
  const assignment=blind.assignments.find(x=>x.caseId===a.caseId&&x.repetition===a.repetition);
  const grades=e.blindGrades?.filter(g=>g.reviewId===assignment.reviewId);
  if(grades?.length!==1||grades[0].packetHash!==blind.packetHash||!grades[0].adjudicated||
   grades[0].judgeIdentity!==e.config.judge.identity||!grades[0].reason?.trim()||!['A','B','TIE'].includes(grades[0].vote))
   return decision('PASS','BLOCKED',['BLIND_COMPARISON_OR_ADJUDICATION_MISSING'],metrics);
  const winner=grades[0].vote==='TIE'?'TIE':assignment[grades[0].vote];
  netWins[a.mode].push(winner==='CANDIDATE'?1:winner==='C3'?-1:0);
 }
 metrics.singleNetWin=fraction(netWins.SINGLE.reduce((s,n)=>s+n,0),netWins.SINGLE.length);
 metrics.journeyNetWin=fraction(netWins.JOURNEY.reduce((s,n)=>s+n,0),netWins.JOURNEY.length);
 if(metrics.singleNetWin<e.config.thresholds.singleNetWin||metrics.journeyNetWin<e.config.thresholds.journeyNetWin)
  return decision('PASS','FAIL',['NO_CLEAR_IMPROVEMENT_IN_BOTH_MODES'],metrics);
 if(e.structural?.status!=='PASS'||e.structural.candidateIdentity!==identity.candidate||
  !e.structural.removedResponsibilities?.length||!e.structural.traceHashes?.length||!e.structural.traceHashes.every(hash))
  return decision('PASS','BLOCKED',['STRUCTURAL_EVIDENCE_REQUIRED'],metrics);
 const r=e.realAdapter;
 const adapter=r?.status==='PASS'&&r.kind==='REAL_ADAPTER_SEND_DISABLED'&&r.sendEnabled===false&&r.candidateIdentity===identity.candidate&&
  ADAPTER_CHECKS.every(name=>r.checks?.filter(c=>c.name===name&&c.status==='PASS'&&hash(c.artifactHash)).length===1)?'PASS':'BLOCKED';
 return decision('PASS','PASS',adapter==='PASS'?[]:['REAL_ADAPTER_EVIDENCE_REQUIRED'],metrics,adapter);
}
