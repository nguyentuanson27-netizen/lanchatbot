import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {projectRuntime,buildRequest,validateProtocol,preflight,hash,inputUrl,evidencePath} from './protocol.mjs';
import {loadInputs,evaluateA2Attempt,operational,assertSealedSource,validateA2Evidence,providerCapacityExhausted} from './run-a2.mjs';
import {runCodexModel,inspectCodex} from './codex-inference.mjs';
import {createGeminiInference,inspectGemini} from './gemini-inference.mjs';
import {terminalFallback,finalGate,makeBinding} from '../../dist/single-agent-semantic-verifier-boundary.js';
const read=name=>readFileSync(inputUrl(name),'utf8');

export async function evaluateA3Attempt(manifest,fixture,generate) {
  const started=performance.now();
  const projection=projectRuntime(manifest,fixture,'conversation',randomUUID());
  const requestTelemetry=['READABLE_FACTS_V1','READABLE_FACTS_V2','NATIVE_DIALOGUE_FACTS_V3','NATIVE_DIALOGUE_FACTS_V4'].includes(manifest.conversationContextFormat)
    ? {conversationRequestId:projection.requestIdentity.requestId} : {};
  const conversation=await generate('conversation',buildRequest(manifest,'conversation',projection));
  if(conversation.status!=='OK')return {...requestTelemetry,conversation,finalDraft:null,verification:null,
    terminal:{...terminalFallback(),reason:conversation.status},endToEndLatencyMs:Math.round(performance.now()-started)};
  // Sole owner surface: exact final text + telemetry. No proposal/plan/intent object.
  const finalDraft=conversation.answer;
  const runtime=structuredClone(fixture.runtime);
  runtime.finalDraft=finalDraft;
  runtime.evaluationAt=new Date(Date.parse(runtime.evaluationAt)+Math.round(performance.now()-started)).toISOString();
  const verification=await evaluateA2Attempt(manifest,{runtime},request=>generate('verifier',request));
  return {...requestTelemetry,conversation,finalDraft,verification,terminal:verification.terminal,endToEndLatencyMs:Math.round(performance.now()-started)};
}
export function humanView(fixture,attempt) {
  // Evaluator-only, human view. No rejected candidate, verdict or verifier telemetry.
  return {attemptId:attempt.attemptId,customer:fixture.runtime.latestCustomerMessage,acceptedDialogue:fixture.runtime.history,
    trusted:fixture.runtime.trusted,requiredBehaviors:fixture.evaluator.requiredBehaviors,forbiddenBehaviors:fixture.evaluator.forbiddenBehaviors,
    ...(fixture.evaluator.buyerGoal ? Object.fromEntries(['buyerGoal','unresolvedConcern','adequateResolution','attainableProgress','knownDecisions']
      .map(key=>[key,fixture.evaluator[key]])) : {}),
    customerOutcome:{kind:attempt.terminal===null&&!attempt.conversation?'UNEXECUTED':attempt.terminal?.text===null?'NO_CUSTOMER_REPLY':'REPLY',text:attempt.terminal?.text??null}};
}
export function scoreWholeReplies(manifest,corpus,attempts,scores) {
  const denominator=corpus.cases.length*manifest.repetitions;
  if(manifest.providerCapacityPolicy&&attempts.some(v=>!v.terminal))return {status:'BLOCKED',reason:'UNEXECUTED_REGISTERED_ATTEMPTS',denominator,executed:attempts.filter(v=>v.terminal).length};
  if(attempts.length!==denominator||!scores||scores.length!==denominator)return {status:'BLOCKED',reason:manifest.scoring.method==='OWNER_AUTHORIZED_CODEX_OFFLINE_REVIEW'?'MISSING_ALL_TERMINAL_OFFLINE_SCORES':'MISSING_ALL_TERMINAL_HUMAN_SCORES',denominator};
  const byId=new Map(scores.map(v=>[v.attemptId,v.scores]));
  if(byId.size!==denominator)return {status:'BLOCKED',reason:'DUPLICATE_HUMAN_SCORE',denominator};
  const rows=[];
  for(const attempt of attempts) {
    const values=byId.get(attempt.attemptId);
    if(!attempt.terminal||!values||Object.keys(values).sort().join(',')!==[...manifest.scoring.dimensions].sort().join(',')||
      Object.values(values).some(v=>!manifest.scoring.scale.includes(v)))return {status:'BLOCKED',reason:'INVALID_OR_MISSING_HUMAN_SCORE',denominator};
    const mean=Object.values(values).reduce((a,b)=>a+b,0)/manifest.scoring.dimensions.length;
    const consultation=manifest.scoring.consultationCaseIds?.includes(attempt.caseId)??false;
    const pass=Object.values(values).every(v=>v>=manifest.scoring.minimumPerDimension)&&mean>=manifest.scoring.minimumCaseMean&&
      values.factualActionSafety===manifest.scoring.factualActionSafetyRequired&&
      (manifest.scoring.naturalnessRequired===undefined||values.naturalness===manifest.scoring.naturalnessRequired)&&
      (!consultation||manifest.scoring.consultationDimensions.every(d=>values[d]===manifest.scoring.consultationRequired));
    rows.push({attemptId:attempt.attemptId,family:corpus.cases.find(c=>c.evaluator.caseId===attempt.caseId).evaluator.family,mean,pass,
      ...(manifest.round===3?{consultation,cohort:manifest.cohorts.originalA3CaseIds.includes(attempt.caseId)?'original':'new'}:{}),
      factualActionSafety:values.factualActionSafety});
  }
  const families=Object.fromEntries([...new Set(rows.map(r=>r.family))].map(family=>{
    const group=rows.filter(r=>r.family===family);const passed=group.filter(r=>r.pass).length;
    return [family,{denominator:group.length,passed,passRate:passed/group.length}];
  }));
  const terminalFailureRate=attempts.filter(v=>v.terminal.disposition!=='SEND_ELIGIBLE').length/denominator;
  const pass=rows.every(r=>r.factualActionSafety===manifest.scoring.factualActionSafetyRequired)&&
    Object.values(families).every(f=>f.passRate>=manifest.scoring.minimumFamilyPassRate)&&terminalFailureRate<=manifest.usability.maximumTerminalFailureRate;
  const cohorts=manifest.round===3?Object.fromEntries(['original','new'].map(cohort=>{
    const group=rows.filter(r=>r.cohort===cohort),passed=group.filter(r=>r.pass).length;
    return [cohort,{denominator:group.length,passed,passRate:passed/group.length}];
  })):null;
  return {status:pass?'PASS':'FAIL',denominator,scored:rows.length,families,terminalFailureRate,...(cohorts?{cohorts}:{}),rows};
}
export function a3Operational(attempts) {
  const verifiers=attempts.map(v=>({...v,provider:v.verification?.provider??null}));
  const conversations=attempts.map(v=>({...v,provider:v.conversation??null}));
  const percentile=(values,p)=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.ceil(sorted.length*p)-1]:null;};
  return {conversation:operational(conversations),verifier:operational(verifiers),
    addedVerificationLatencyP50Ms:percentile(attempts.filter(v=>v.verification?.provider).map(v=>v.verification.addedVerificationLatencyMs),.5),
    addedVerificationLatencyP95Ms:percentile(attempts.filter(v=>v.verification?.provider).map(v=>v.verification.addedVerificationLatencyMs),.95),
    endToEndLatencyP50Ms:percentile(attempts.map(v=>v.endToEndLatencyMs),.5),endToEndLatencyP95Ms:percentile(attempts.map(v=>v.endToEndLatencyMs),.95)};
}
export function validateA3Evidence(manifest,corpus,evidence) {
  const expected=corpus.cases.flatMap(c=>Array.from({length:manifest.repetitions},(_,i)=>c.evaluator.caseId+':'+(i+1)));
  if(JSON.stringify(expected)!==JSON.stringify(evidence.attempts.map(v=>v.attemptId)))throw new Error('A3_DENOMINATOR');
  if(!/^[a-f0-9]{40}$/.test(evidence.a3RunSourceSha)||evidence.manifestHash!==hash(read('manifest.json')))throw new Error('A3_IDENTITY');
  const executed=evidence.attempts.filter(v=>v.terminal).length;
  if(evidence.capacityBlock) {
    const stop=evidence.attempts[executed-1],provider=stop?.verification?.provider,block=evidence.capacityBlock;
    if(!providerCapacityExhausted(manifest,provider)||block.attemptId!==stop.attemptId||block.role!=='verifier'||block.providerErrorCode!==provider.providerErrorCode||
      evidence.attempts.slice(0,executed).some(v=>!v.terminal||!v.conversation)||evidence.attempts.slice(executed).some(v=>v.terminal!==null||v.conversation!==null||v.finalDraft!==null||v.verification!==null))throw new Error('A3_CAPACITY_PREFIX');
  }
  for(const attempt of evidence.attempts) {
    if(!attempt.terminal||!attempt.conversation) {
      if(evidence.capacityBlock)continue;
      throw new Error('A3_MISSING_GENERATION');
    }
    const fixture=corpus.cases.find(c=>c.evaluator.caseId===attempt.caseId);
    if(attempt.conversation.providerRequests>1)throw new Error('A3_CONVERSATION_REQUEST_POLICY');
    const conversationRequestId=['READABLE_FACTS_V1','READABLE_FACTS_V2','NATIVE_DIALOGUE_FACTS_V3','NATIVE_DIALOGUE_FACTS_V4'].includes(manifest.conversationContextFormat) ? attempt.conversationRequestId :
      JSON.parse(manifest.variant === 'GEMINI_CONVERSATION' ? attempt.conversation.requestBody.contents[0].parts[0].text : attempt.conversation.requestBody.input[0].content[0].text).requestIdentity.requestId;
    const expectedConversation=buildRequest(manifest,'conversation',projectRuntime(manifest,fixture,'conversation',conversationRequestId));
    if(JSON.stringify(attempt.conversation.requestBody)!==JSON.stringify(expectedConversation))throw new Error('A3_CONVERSATION_FIREWALL');
    if(attempt.conversation.status==='OK'&&attempt.finalDraft!==attempt.conversation.answer)throw new Error('A3_EXACT_OWNER_SURFACE');
    if(attempt.verification?.precheck==='SURVIVED') {
      const v=attempt.verification,provider=v.provider;
      if(!provider||provider.providerRequests>1)throw new Error('A3_MANDATORY_VERIFIER_OR_REQUEST_POLICY');
      const runtime={...fixture.runtime,finalDraft:attempt.finalDraft};
      const expectedVerifier=buildRequest(manifest,'verifier',projectRuntime(manifest,{runtime},'verifier',v.binding.requestId));
      if(JSON.stringify(provider.requestBody)!==JSON.stringify(expectedVerifier))throw new Error('A3_VERIFIER_FIREWALL');
      const trusted=JSON.parse(expectedVerifier.input[0].content[0].text).trusted;
      if(JSON.stringify(v.binding)!==JSON.stringify(makeBinding(v.binding.requestId,attempt.finalDraft,trusted)))throw new Error('A3_BINDING');
      const response=provider.status==='OK'?{kind:'VERDICT',binding:v.returnedBinding,result:provider.answer}:
        {kind:provider.status==='TIMEOUT'?'TIMEOUT':'PROVIDER_ERROR'};
      const terminal=finalGate({expected:v.binding,response,current:trusted,finalDraft:attempt.finalDraft,now:new Date(v.finalGateAt)});
      if(JSON.stringify(terminal)!==JSON.stringify(attempt.terminal))throw new Error('A3_FINAL_GATE');
    }
    if(attempt.terminal.disposition==='SEND_ELIGIBLE'&&attempt.terminal.text!==attempt.finalDraft)throw new Error('A3_TERMINAL_EXACT_TEXT');
    if(attempt.terminal.disposition==='FALLBACK'&&attempt.terminal.text!==manifest.fallbacks[0].text)throw new Error('A3_TERMINAL_FALLBACK');
  }
  return {registeredDenominator:expected.length,executedDenominator:executed,...(manifest.providerCapacityPolicy?{unexecuted:expected.length-executed}:{}),
    quality:evidence.quality.status,operational:evidence.operational};
}
async function main() {
  const {manifest,a2,a3}=loadInputs();validateProtocol(manifest,a2,a3);
  const a2Evidence=JSON.parse(read('a2-evidence.json'));
  if(validateA2Evidence(manifest,a2,a2Evidence).status!=='PASS')throw new Error('A2_NOT_PASS');
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  preflight(manifest,'a3',{a3RunSourceSha:process.env.A3_RUN_SOURCE_SHA,a2Status:a2Evidence.summary.status},sha,status);
  const output=inputUrl('a3-evidence.json');
  if(existsSync(output))throw new Error('A3_EVIDENCE_ALREADY_EXISTS');
  const client=inspectCodex();
  const gemini=manifest.variant === 'GEMINI_CONVERSATION' ? createGeminiInference(manifest) : null;
  const evidence={schemaVersion:1,phase:'A3',a3RunSourceSha:sha,a2RunSourceSha:a2Evidence.a2RunSourceSha,
    implementationBaseSha:manifest.implementationBaseSha,specSha:manifest.specSha,manifestHash:hash(read('manifest.json')),
    corpusHash:manifest.corpusHashes.a3,promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,models:manifest.models,client,
    ...(gemini ? {conversationClient:inspectGemini(manifest)} : {}),
    boundaryExecutableHash:hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url))),
    startedAt:new Date().toISOString(),attempts:a3.cases.flatMap(c=>Array.from({length:manifest.repetitions},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),
      caseId:c.evaluator.caseId,repetition:i+1,conversation:null,finalDraft:null,verification:null,terminal:null}))),quality:null,operational:null};
  const save=()=>{evidence.quality=scoreWholeReplies(manifest,a3,evidence.attempts,null);evidence.operational=a3Operational(evidence.attempts);
    writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');};
  save();
  for(const attempt of evidence.attempts) {
    assertSealedSource(sha,[evidencePath('a3-evidence.json')]);
    if(gemini && hash(readFileSync(new URL('../../dist/vertex.js',import.meta.url)))!==evidence.conversationClient.helperExecutableHash)throw new Error('A3_VERTEX_EXECUTABLE_CHANGED');
    if(hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url)))!==evidence.boundaryExecutableHash)throw new Error('A3_BOUNDARY_EXECUTABLE_CHANGED');
    const fixture=a3.cases.find(c=>c.evaluator.caseId===attempt.caseId);
    Object.assign(attempt,await evaluateA3Attempt(manifest,fixture,(role,request)=>role === 'conversation' && gemini ? gemini(request) : runCodexModel(manifest,role,request)));
    save();console.log(JSON.stringify({attemptId:attempt.attemptId,generation:attempt.conversation.status,verifier:attempt.verification?.provider?.status??null,
      terminal:attempt.terminal.disposition,reason:attempt.terminal.reason}));
    if(providerCapacityExhausted(manifest,attempt.verification?.provider)) {
      evidence.capacityBlock={attemptId:attempt.attemptId,role:'verifier',providerErrorCode:attempt.verification.provider.providerErrorCode};break;
    }
  }
  evidence.finishedAt=new Date().toISOString();save();
  const views=evidence.attempts.map(attempt=>humanView(a3.cases.find(c=>c.evaluator.caseId===attempt.caseId),attempt));
  writeFileSync(inputUrl('a3-human-review.json'),JSON.stringify({rubric:manifest.scoring,attempts:views},null,2)+'\n');
  writeFileSync(inputUrl('a3-human-scores.json'),JSON.stringify({scorer:null,scoredAt:null,a3RunSourceSha:sha,
    attempts:views.map(view=>({attemptId:view.attemptId,scores:Object.fromEntries(manifest.scoring.dimensions.map(d=>[d,null]))}))},null,2)+'\n');
  const review='# A3 — human review of actual terminal customer outcomes\n\nScore 0/1/2 on the ten frozen dimensions in a3-human-scores.json. No model/judge scores are synthesized.\n'+
    '\nTrusted truth and required/forbidden behavior per case are in a3-human-review.json. The packet excludes rejected drafts and verifier verdicts.\n\n'+
    views.map(view=>'## '+view.attemptId+'\n\nCustomer: '+view.customer+'\n\nAccepted dialogue:\n```json\n'+JSON.stringify(view.acceptedDialogue)+'\n```\n\nActual terminal customer outcome:\n```text\n'+(view.customerOutcome.text??(view.customerOutcome.kind==='UNEXECUTED'?'[UNEXECUTED REGISTERED ATTEMPT]':'[NO CUSTOMER REPLY]'))+'\n```\n').join('\n');
  writeFileSync(inputUrl('A3_HUMAN_REVIEW.md'),review);
  console.log(JSON.stringify(validateA3Evidence(manifest,a3,evidence)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error('A3_RUN_FAILED_CLOSED:'+error.message);process.exitCode=1;});
