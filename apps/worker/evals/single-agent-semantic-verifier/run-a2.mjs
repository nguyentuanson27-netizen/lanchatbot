import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {projectRuntime,buildRequest,validateProtocol,preflight,hash,inputUrl,evidencePath} from './protocol.mjs';
import {runCodexModel,inspectCodex} from './codex-inference.mjs';
import {makeBinding,hardPrecheck,finalGate,terminalFallback} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {authorizeRealtimeProtectedClaimProposal} from '../../dist/realtime-protected-claim-boundary.js';
const read=name=>readFileSync(inputUrl(name),'utf8');
export const loadInputs=()=>({manifest:JSON.parse(read('manifest.json')),a2:JSON.parse(read('corpus-a2.json')),a3:JSON.parse(read('corpus-a3.json'))});

export function registerA2Attempts(manifest,a2,prior=null) {
  const fresh=cases=>cases.flatMap(c=>Array.from({length:manifest.repetitions},(_,i)=>({attemptId:c.evaluator.caseId+':'+(i+1),caseId:c.evaluator.caseId,
    repetition:i+1,expected:c.evaluator.expected,finalDraft:c.runtime.finalDraft,finalDraftHash:hash(c.runtime.finalDraft),precheck:null,provider:null,terminal:null})));
  if(!manifest.ownerAmendment)return fresh(a2.cases);
  const amendment=manifest.ownerAmendment;
  if(!prior||hash(JSON.stringify(prior,null,2)+'\n')!==amendment.priorEvidenceHash||prior.a2RunSourceSha!==amendment.priorRunSourceSha)throw new Error('PRIOR_EVIDENCE_CHANGED');
  const adopted=prior.attempts.filter(a=>a.terminal).map(a=>({...a,originRunSourceSha:prior.a2RunSourceSha})),seen=new Set(adopted.map(a=>a.caseId));
  const remaining=a2.cases.filter(c=>!seen.has(c.evaluator.caseId));
  const attempts=[...adopted,...fresh(remaining)];
  if(JSON.stringify(remaining.map(c=>c.evaluator.caseId))!==JSON.stringify(amendment.remainingCaseIds)||JSON.stringify(attempts.map(a=>a.attemptId))!==JSON.stringify(amendment.registeredAttemptIds))throw new Error('AMENDED_REGISTRATION_CHANGED');
  return attempts;
}

export async function evaluateA2Attempt(manifest,fixture,generate) {
  const started=performance.now();
  const draft=fixture.runtime.finalDraft;
  const now=new Date(fixture.runtime.evaluationAt);
  let projection,binding,problem;
  try {
    projection=projectRuntime(manifest,fixture,'verifier',randomUUID());
    binding=makeBinding(projection.requestIdentity.requestId,draft,projection.trusted);
    problem=hardPrecheck(projection.trusted,draft,now);
    if(!problem && fixture.codeScenario?.legacyAuthority) {
      const authority=authorizeRealtimeProtectedClaimProposal({...fixture.codeScenario.legacyAuthority,
        availableClaims:projection.trusted.protectedClaims,expectedProductIds:projection.trusted.boundSubjects.map(v=>v.ref),now});
      if(authority.outcome!=='AUTHORIZED')problem='AUTHORITY';
    }
  } catch {problem='MALFORMED';}
  if(problem) {
    const disposition=['PRIVACY','PERMISSION','RECIPIENT'].includes(problem)?'NO_SEND':problem==='STALE'?'HANDOFF':'FALLBACK';
    return {precheck:'BLOCKED',precheckReason:problem,binding:binding??null,provider:null,
      terminal:disposition==='FALLBACK'?{...terminalFallback(),reason:problem}:{disposition,reason:problem,text:null,fallbackId:null},
      addedVerificationLatencyMs:0};
  }
  // All surviving exact drafts, including nonprotected controls, take this path.
  const provider=await generate(buildRequest(manifest,'verifier',projection));
  const returnedBinding={...binding,...fixture.codeScenario?.returnedBindingOverride};
  const response=provider.status==='OK'?{kind:'VERDICT',binding:returnedBinding,result:provider.answer}:
    {kind:provider.status==='TIMEOUT'?'TIMEOUT':'PROVIDER_ERROR'};
  const finalGateAt=new Date(now.getTime()+Math.round(performance.now()-started));
  const terminal=finalGate({expected:binding,response,current:projection.trusted,finalDraft:draft,now:finalGateAt});
  return {precheck:'SURVIVED',precheckReason:null,binding,returnedBinding,provider,terminal,finalGateAt:finalGateAt.toISOString(),
    addedVerificationLatencyMs:Math.round(performance.now()-started)};
}

export function summarizeA2(manifest,attempts) {
  const unsafe=attempts.filter(v=>v.expected==='UNSAFE'),safe=attempts.filter(v=>v.expected==='SAFE');
  const falsePass=unsafe.filter(v=>v.terminal?.disposition==='SEND_ELIGIBLE').length;
  const safeFailures=safe.filter(v=>v.terminal?.disposition!=='SEND_ELIGIBLE').length;
  const missing=attempts.filter(v=>!v.terminal).length;
  const safeFailureRate=safe.length?safeFailures/safe.length:null;
  const available=attempts.some(v=>v.provider?.status==='OK');
  return {status:falsePass?'FAIL':missing||!available?'BLOCKED':safeFailureRate===null||safeFailureRate>manifest.usability.maximumTerminalFailureRate?'FAIL':'PASS',
    registeredDenominator:attempts.length,executedDenominator:attempts.length-missing,unsafeCount:unsafe.length,safeCount:safe.length,
    unsafeSendEligibleFalsePassCount:falsePass,safeFailures,safeFailureRate,unexecuted:missing};
}
export function operational(attempts) {
  const providers=attempts.filter(v=>v.provider).map(v=>v.provider);
  const latency=providers.map(v=>v.latencyMs).filter(Number.isFinite).sort((a,b)=>a-b);
  const percentile=p=>latency.length?latency[Math.ceil(latency.length*p)-1]:null;
  const dispositions=Object.fromEntries(['SEND_ELIGIBLE','FALLBACK','HANDOFF','NO_SEND'].map(d=>[d,attempts.filter(v=>v.terminal?.disposition===d).length]));
  return {providerAttemptDenominator:providers.length,providerRequests:providers.reduce((n,v)=>n+(v.providerRequests??0),0),
    clientRequests:providers.reduce((n,v)=>n+(v.clientRequests??0),0),rejectedClientRequests:providers.reduce((n,v)=>n+(v.rejectedClientRequests??0),0),
    maxRequestsPerAttempt:Math.max(0,...providers.map(v=>v.providerRequests??0)),verifierLatencyP50Ms:percentile(.5),verifierLatencyP95Ms:percentile(.95),
    timeoutCount:providers.filter(v=>v.status==='TIMEOUT').length,errorCount:providers.filter(v=>v.status==='PROVIDER_ERROR').length,
    timeoutErrorRate:providers.length?providers.filter(v=>v.status!=='OK').length/providers.length:null,
    inputTokens:providers.reduce((n,v)=>n+(v.usage?.input_tokens??0),0),outputTokens:providers.reduce((n,v)=>n+(v.usage?.output_tokens??0),0),
    usageUnavailableCount:providers.filter(v=>!v.usage).length,cost:null,dispositions,
    terminalFailureRate:attempts.length?(dispositions.FALLBACK+dispositions.HANDOFF+dispositions.NO_SEND)/attempts.length:null};
}
export function assertSealedSource(sha,allowedEvidence) {
  if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sha)throw new Error('RUN_SOURCE_CHANGED');
  const changed=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).split('\n').filter(Boolean);
  if(changed.some(line=>!allowedEvidence.some(path=>line.slice(3).replaceAll('\\','/').replaceAll('"','')===path)))throw new Error('RUN_SOURCE_CHANGED');
}
export function validateA2Evidence(manifest,a2,evidence) {
  const expected=manifest.ownerAmendment?.registeredAttemptIds??a2.cases.flatMap(c=>Array.from({length:manifest.repetitions},(_,i)=>c.evaluator.caseId+':'+(i+1)));
  if(JSON.stringify(expected)!==JSON.stringify(evidence.attempts.map(v=>v.attemptId)))throw new Error('ATTEMPT_DENOMINATOR');
  if(!/^[a-f0-9]{40}$/.test(evidence.a2RunSourceSha)||evidence.manifestHash!==hash(read('manifest.json')))throw new Error('EVIDENCE_IDENTITY');
  for(const attempt of evidence.attempts) {
    const fixture=a2.cases.find(c=>c.evaluator.caseId===attempt.caseId);
    if(attempt.expected!==fixture.evaluator.expected)throw new Error('EVIDENCE_EXPECTATION');
    if(attempt.provider) {
      if(attempt.precheck!=='SURVIVED'||attempt.provider.providerRequests>1)throw new Error('PROVIDER_REQUEST_POLICY');
      const projection=projectRuntime(manifest,fixture,'verifier',attempt.binding.requestId);
      if(JSON.stringify(attempt.provider.requestBody)!==JSON.stringify(buildRequest(manifest,'verifier',projection)))throw new Error('REQUEST_FIREWALL_OR_IDENTITY');
      if(JSON.stringify(makeBinding(attempt.binding.requestId,fixture.runtime.finalDraft,projection.trusted))!==JSON.stringify(attempt.binding))throw new Error('BINDING_IDENTITY');
      const response=attempt.provider.status==='OK'?{kind:'VERDICT',binding:attempt.returnedBinding,result:attempt.provider.answer}:
        {kind:attempt.provider.status==='TIMEOUT'?'TIMEOUT':'PROVIDER_ERROR'};
      if(JSON.stringify(finalGate({expected:attempt.binding,response,current:projection.trusted,finalDraft:fixture.runtime.finalDraft,now:new Date(attempt.finalGateAt)}))!==JSON.stringify(attempt.terminal))throw new Error('FINAL_GATE_EVIDENCE');
    } else if(attempt.precheck==='SURVIVED')throw new Error('MANDATORY_VERIFIER');
  }
  if(JSON.stringify(summarizeA2(manifest,evidence.attempts))!==JSON.stringify(evidence.summary))throw new Error('SUMMARY');
  return evidence.summary;
}

async function main() {
  const {manifest,a2,a3}=loadInputs();validateProtocol(manifest,a2,a3);
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  preflight(manifest,'a2',{a2RunSourceSha:process.env.A2_RUN_SOURCE_SHA},sha,status);
  const output=inputUrl('a2-evidence.json');
  if(existsSync(output))throw new Error('EVIDENCE_ALREADY_EXISTS');
  const client=inspectCodex();
  const evidence={schemaVersion:1,phase:'A2',a2RunSourceSha:sha,implementationBaseSha:manifest.implementationBaseSha,specSha:manifest.specSha,
    manifestHash:hash(read('manifest.json')),corpusHash:manifest.corpusHashes.a2,promptHash:manifest.promptHashes.verifier,schemaHash:manifest.schemaHash,
    models:manifest.models,client,startedAt:new Date().toISOString(),
    boundaryExecutableHash:hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url))),
    ownerAmendment:manifest.ownerAmendment??null,
    attempts:registerA2Attempts(manifest,a2,manifest.ownerAmendment?JSON.parse(readFileSync(inputUrl('../a2-evidence.json'),'utf8')):null),summary:null};
  const save=()=>{evidence.summary=summarizeA2(manifest,evidence.attempts);evidence.operational=operational(evidence.attempts);writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');};
  save();
  for(const attempt of evidence.attempts) {
    if(attempt.terminal)continue; // Preserve every adopted observation; never rerun completed cases.
    assertSealedSource(sha,[evidencePath('a2-evidence.json')]);
    if(hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url)))!==evidence.boundaryExecutableHash)throw new Error('BOUNDARY_EXECUTABLE_CHANGED');
    const fixture=a2.cases.find(c=>c.evaluator.caseId===attempt.caseId);
    Object.assign(attempt,await evaluateA2Attempt(manifest,fixture,request=>runCodexModel(manifest,'verifier',request)));
    attempt.originRunSourceSha=sha;
    save();
    console.log(JSON.stringify({attemptId:attempt.attemptId,precheck:attempt.precheck,provider:attempt.provider?.status??null,
      outcome:attempt.terminal.disposition,reason:attempt.terminal.reason,requests:attempt.provider?.providerRequests??0}));
    if(attempt.expected==='UNSAFE'&&attempt.terminal.disposition==='SEND_ELIGIBLE')break;
  }
  evidence.finishedAt=new Date().toISOString();save();validateA2Evidence(manifest,a2,evidence);
  console.log(JSON.stringify({summary:evidence.summary,operational:evidence.operational}));
  if(evidence.summary.status!=='PASS')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('A2_RUN_FAILED_CLOSED; retained evidence if registered');process.exitCode=1;});
