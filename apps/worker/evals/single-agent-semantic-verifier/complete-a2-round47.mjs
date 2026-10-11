import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {hash,inputUrl,evidencePath,validateProtocol,preflight} from './protocol.mjs';
import {loadInputs,registerA2Attempts,evaluateA2Attempt,summarizeA2,operational,assertSealedSource,validateA2Evidence,providerCapacityExhausted} from './run-a2.mjs';
import {inspectCodex,runCodexModel} from './codex-inference.mjs';

// Owner-authorized completion of Round47 only. Keep the original partial raw
// evidence intact; observations from this source have a separate runtime seal.
export function prepareCompletion(plan,priorRaw,manifest,a2,sourceSha) {
 const prior=JSON.parse(priorRaw),missing=prior.attempts.filter(a=>!a.terminal);
 const registered=registerA2Attempts(manifest,a2).map(a=>a.attemptId);
 if(plan.round!==47||manifest.round!==47||plan.retryCompletedAttempts!==false||plan.maximumGenerationRequestsPerAttempt!==1||
    plan.protocolChanges!==false||plan.promptChanges!==false||plan.modelChanges!==false||plan.thresholdChanges!==false||
    !/^[a-f0-9]{40}$/.test(sourceSha)||hash(priorRaw)!==plan.priorEvidenceHash||prior.a2RunSourceSha!==plan.priorA2RunSourceSha||
    prior.manifestHash!==plan.manifestHash||prior.promptHash!==manifest.promptHashes.verifier||prior.corpusHash!==manifest.corpusHashes.a2||
    prior.schemaHash!==manifest.schemaHash||JSON.stringify(prior.models)!==JSON.stringify(manifest.models)||
    JSON.stringify(prior.attempts.map(a=>a.attemptId))!==JSON.stringify(registered)||
    registered.length!==plan.registeredDenominator||prior.attempts.length-missing.length!==plan.preservedAttemptCount||
    JSON.stringify(missing.map(a=>a.attemptId))!==JSON.stringify(plan.missingAttemptIds)||
    missing.some(a=>a.precheck!==null||a.provider!==null||a.invocationStartedAt)||prior.summary.unsafeSendEligibleFalsePassCount!==0)throw new Error('COMPLETION_SCOPE_CHANGED');
 const evidence=structuredClone(prior);
 evidence.a2RunSourceSha=sourceSha;
 evidence.completion={...structuredClone(plan),planHash:hash(JSON.stringify(plan,null,2)+'\n'),runSourceSha:sourceSha,startedAt:new Date().toISOString(),
  priorInterruptionAccounting:'Original runner did not persist dispatch starts. The first missing slot may have had an unrecorded invocation; original evidence is retained and its total transport count is not certified complete.'};
 delete evidence.finishedAt;
 return evidence;
}

export async function completeMissingAttempts(manifest,a2,evidence,generate,save) {
 const update=()=>{evidence.summary=summarizeA2(manifest,evidence.attempts);evidence.operational=operational(evidence.attempts);save(evidence);};
 for(const id of evidence.completion.missingAttemptIds){
  const attempt=evidence.attempts.find(a=>a.attemptId===id);
  if(attempt.terminal||attempt.invocationStartedAt)throw new Error('COMPLETION_ALREADY_ATTEMPTED');
  attempt.originRunSourceSha=evidence.a2RunSourceSha;
  // Record dispatch before awaiting the client; a lost process cannot disguise
  // an already-started completion invocation as an untouched slot.
  attempt.invocationStartedAt=new Date().toISOString();update();
  const fixture=a2.cases.find(c=>c.evaluator.caseId===attempt.caseId);
  Object.assign(attempt,await evaluateA2Attempt(manifest,fixture,generate));update();
  if(attempt.expected==='UNSAFE'&&attempt.terminal.disposition==='SEND_ELIGIBLE')break;
  if(providerCapacityExhausted(manifest,attempt.provider)){
   evidence.completion.capacityBlock={attemptId:attempt.attemptId,role:'verifier',providerErrorCode:attempt.provider.providerErrorCode};break;
  }
 }
 evidence.finishedAt=new Date().toISOString();update();
 return evidence;
}

async function main(){
 if(process.env.C3_CHECKPOINT_A_ROUND!=='47')throw new Error('ROUND47_REQUIRED');
 const {manifest,a2,a3}=loadInputs();validateProtocol(manifest,a2,a3);
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 preflight(manifest,'a2',{a2RunSourceSha:process.env.A2_RUN_SOURCE_SHA},sha,status);
 const output=inputUrl('a2-completed-evidence.json');if(existsSync(output))throw new Error('COMPLETION_EVIDENCE_ALREADY_EXISTS');
 const priorRaw=readFileSync(inputUrl('a2-evidence.json'),'utf8'),plan=JSON.parse(readFileSync(inputUrl('a2-completion-plan.json'),'utf8'));
 validateA2Evidence(manifest,a2,JSON.parse(priorRaw));
 if(hash(readFileSync(inputUrl('manifest.json')))!==plan.manifestHash)throw new Error('MANIFEST_CHANGED');
 const client=inspectCodex();if(JSON.stringify(client)!==JSON.stringify(manifest.inspectedClient))throw new Error('CLIENT_IDENTITY_CHANGED');
 const evidence=prepareCompletion(plan,priorRaw,manifest,a2,sha);
 const boundary=new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url);
 const save=value=>{
  assertSealedSource(sha,[evidencePath('a2-completed-evidence.json')]);
  if(hash(readFileSync(boundary))!==plan.boundaryExecutableHash||hash(readFileSync(inputUrl('a2-evidence.json'),'utf8'))!==plan.priorEvidenceHash)throw new Error('PRIOR_OR_BOUNDARY_CHANGED');
  writeFileSync(output,JSON.stringify(value,null,2)+'\n');
 };
 console.log(JSON.stringify({status:'COMPLETION_PREFLIGHT_PASS',a2CompletionRunSourceSha:sha,priorA2RunSourceSha:plan.priorA2RunSourceSha,
  preserved:plan.preservedAttemptCount,registeredMissing:plan.missingAttemptIds.length,providerGenerationRequests:0}));
 await completeMissingAttempts(manifest,a2,evidence,request=>runCodexModel(manifest,'verifier',request),save);
 validateA2Evidence(manifest,a2,evidence);
 console.log(JSON.stringify({summary:evidence.summary,completionOperational:operational(evidence.attempts.filter(a=>a.originRunSourceSha===sha)),combinedOperational:evidence.operational}));
 if(evidence.summary.status!=='PASS')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(['COMPLETION_SCOPE_CHANGED','COMPLETION_ALREADY_ATTEMPTED','COMPLETION_EVIDENCE_ALREADY_EXISTS','RUN_SOURCE_CHANGED','PRIOR_OR_BOUNDARY_CHANGED','CLIENT_IDENTITY_CHANGED'].includes(error.message)?error.message:'A2_COMPLETION_FAILED_CLOSED; retained evidence if dispatched');process.exitCode=1;
});
