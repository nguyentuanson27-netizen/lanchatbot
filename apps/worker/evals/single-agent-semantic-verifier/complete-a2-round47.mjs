import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {hash,inputUrl,evidencePath,validateProtocol,preflight} from './protocol.mjs';
import {loadInputs,registerA2Attempts,evaluateA2Attempt,summarizeA2,operational,assertSealedSource,validateA2Evidence,providerCapacityExhausted} from './run-a2.mjs';
import {inspectCodex,runCodexModel} from './codex-inference.mjs';

// Owner-authorized Round47 completion or fixed Round63 diagnostic completion.
// Diagnostic completion cannot reverse a failed qualification. Keep original raw
// evidence intact; observations from this source have a separate runtime seal.
export function prepareCompletion(plan,priorRaw,manifest,a2,sourceSha) {
 const prior=JSON.parse(priorRaw),missing=prior.attempts.filter(a=>!a.terminal);
 const registered=registerA2Attempts(manifest,a2).map(a=>a.attemptId);
 const diagnostic=plan.round===63&&manifest.round===63&&plan.diagnosticOnly===true&&plan.qualificationStatus==='FAIL'&&
  plan.stopOnUnsafeFalsePass===false&&prior.summary.status==='FAIL'&&prior.summary.unsafeSendEligibleFalsePassCount>0&&!!prior.finishedAt;
 if(!(plan.round===47&&manifest.round===47&&!plan.diagnosticOnly||diagnostic)||plan.retryCompletedAttempts!==false||plan.maximumGenerationRequestsPerAttempt!==1||
    plan.protocolChanges!==false||plan.promptChanges!==false||plan.modelChanges!==false||plan.thresholdChanges!==false||
    !/^[a-f0-9]{40}$/.test(sourceSha)||hash(priorRaw)!==plan.priorEvidenceHash||prior.a2RunSourceSha!==plan.priorA2RunSourceSha||
    prior.manifestHash!==plan.manifestHash||prior.promptHash!==manifest.promptHashes.verifier||prior.corpusHash!==manifest.corpusHashes.a2||
    prior.schemaHash!==manifest.schemaHash||JSON.stringify(prior.models)!==JSON.stringify(manifest.models)||
    JSON.stringify(prior.attempts.map(a=>a.attemptId))!==JSON.stringify(registered)||
    registered.length!==plan.registeredDenominator||prior.attempts.length-missing.length!==plan.preservedAttemptCount||
    JSON.stringify(missing.map(a=>a.attemptId))!==JSON.stringify(plan.missingAttemptIds)||
    missing.some(a=>a.precheck!==null||a.provider!==null||a.invocationStartedAt||a.dispatchStartedAt)||!diagnostic&&prior.summary.unsafeSendEligibleFalsePassCount!==0)throw new Error('COMPLETION_SCOPE_CHANGED');
 const evidence=structuredClone(prior);
 evidence.a2RunSourceSha=sourceSha;
 evidence.completion={...structuredClone(plan),planHash:hash(JSON.stringify(plan,null,2)+'\n'),runSourceSha:sourceSha,startedAt:new Date().toISOString(),
  priorInterruptionAccounting:diagnostic?'Prior closed source retained dispatch starts and failed qualification. Only undispatched slots are completed; qualification remains FAIL.':'Original runner did not persist dispatch starts. The first missing slot may have had an unrecorded invocation; original evidence is retained and its total transport count is not certified complete.'};
 delete evidence.finishedAt;
 return evidence;
}

export async function completeMissingAttempts(manifest,a2,evidence,generate,save) {
 const update=()=>{evidence.summary=summarizeA2(manifest,evidence.attempts);evidence.operational=operational(evidence.attempts);save(evidence);};
 for(const id of evidence.completion.missingAttemptIds){
  const attempt=evidence.attempts.find(a=>a.attemptId===id);
  if(attempt.terminal||attempt.invocationStartedAt||attempt.dispatchStartedAt)throw new Error('COMPLETION_ALREADY_ATTEMPTED');
  attempt.originRunSourceSha=evidence.a2RunSourceSha;
  // Record dispatch before awaiting the client; a lost process cannot disguise
  // an already-started completion invocation as an untouched slot.
  attempt.invocationStartedAt=new Date().toISOString();update();
  const fixture=a2.cases.find(c=>c.evaluator.caseId===attempt.caseId);
  Object.assign(attempt,await evaluateA2Attempt(manifest,fixture,generate));update();
  if(attempt.expected==='UNSAFE'&&attempt.terminal.disposition==='SEND_ELIGIBLE'&&!evidence.completion.diagnosticOnly)break;
  if(providerCapacityExhausted(manifest,attempt.provider)){
   evidence.completion.capacityBlock={attemptId:attempt.attemptId,role:'verifier',providerErrorCode:attempt.provider.providerErrorCode};break;
  }
 }
 evidence.finishedAt=new Date().toISOString();update();
 return evidence;
}

export function selectCompletionShard(evidence,index) {
 const c=evidence.completion,ids=c.missingAttemptIds,shards=c.shards;
 if(!c.diagnosticOnly||c.round!==63||c.concurrency!==3||!Number.isInteger(index)||index<0||index>2||
  shards?.length!==3||shards.some((s,i)=>s.index!==i)||
  JSON.stringify(shards.flatMap(s=>s.attemptIds).sort())!==JSON.stringify([...ids].sort())||
  new Set(shards.flatMap(s=>s.attemptIds)).size!==ids.length)throw new Error('COMPLETION_SHARD_CHANGED');
 c.allMissingAttemptIds=[...ids];c.missingAttemptIds=[...shards[index].attemptIds];c.shardIndex=index;return evidence;
}

export function mergeCompletionShards(plan,priorRaw,manifest,a2,shards,sourceSha) {
 const combined=prepareCompletion(plan,priorRaw,manifest,a2,sourceSha),prior=JSON.parse(priorRaw),seen=new Set();
 if(shards.length!==3)throw new Error('COMPLETION_SHARD_CHANGED');
 for(const e of shards){const i=e.completion?.shardIndex,allocation=plan.shards?.[i]?.attemptIds;
  if(!Number.isInteger(i)||i<0||i>2||seen.has(i)||e.a2RunSourceSha!==sourceSha||
   e.completion.planHash!==combined.completion.planHash||JSON.stringify(e.completion.missingAttemptIds)!==JSON.stringify(allocation))throw new Error('COMPLETION_SHARD_CHANGED');
  seen.add(i);validateA2Evidence(manifest,a2,e);
  for(let n=0;n<prior.attempts.length;n++){const old=prior.attempts[n],current=e.attempts[n];
   if(current?.attemptId!==old.attemptId)throw new Error('COMPLETION_SHARD_CHANGED');
   if(!allocation.includes(old.attemptId)){if(JSON.stringify(current)!==JSON.stringify(old))throw new Error('PRESERVED_OR_UNASSIGNED_ATTEMPT_CHANGED');}
   else {if((current.terminal||current.invocationStartedAt)&&current.originRunSourceSha!==sourceSha)throw new Error('COMPLETION_SHARD_CHANGED');combined.attempts[n]=structuredClone(current);}
  }
 }
 combined.completion.shardRuns=shards.map(e=>({index:e.completion.shardIndex,sourceSha,finishedAt:e.finishedAt??null,capacityBlock:e.completion.capacityBlock??null}));
 combined.finishedAt=new Date().toISOString();combined.summary=summarizeA2(manifest,combined.attempts);combined.operational=operational(combined.attempts);validateA2Evidence(manifest,a2,combined);return combined;
}

async function main(){
 if(!['47','63'].includes(process.env.C3_CHECKPOINT_A_ROUND)||process.env.C3_CHECKPOINT_A_ROUND==='63'&&!process.argv.includes('--diagnostic-remaining'))throw new Error('FIXED_COMPLETION_ROUND_REQUIRED');
 const {manifest,a2,a3}=loadInputs();validateProtocol(manifest,a2,a3);
 const resume=process.argv.includes('--resume-remaining');
 if(resume&&manifest.round!==63)throw new Error('FIXED_COMPLETION_ROUND_REQUIRED');
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const shardArg=process.argv.find(a=>a.startsWith('--shard=')),shard=shardArg?Number(shardArg.slice(8)):null;
 if(manifest.round===63&&(!Number.isInteger(shard)||shard<0||shard>2))throw new Error('COMPLETION_SHARD_CHANGED');
 const outputs=manifest.round===63?[0,1,2].map(i=>(resume?'a2-resumed-evidence':'a2-completed-evidence')+'.shard-'+i+'.json'):['a2-completed-evidence.json'];
 // A peer may have started writing its evidence before this shard starts. Reuse
 // the existing source guard, allowing only the three frozen evidence paths.
 if(manifest.round===63){
  assertSealedSource(sha,outputs.map(evidencePath));
  preflight(manifest,'a2',{a2RunSourceSha:process.env.A2_RUN_SOURCE_SHA},sha,[]);
 } else {
  const status=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  preflight(manifest,'a2',{a2RunSourceSha:process.env.A2_RUN_SOURCE_SHA},sha,status);
 }
 const output=inputUrl(manifest.round===63?outputs[shard]:outputs[0]);if(existsSync(output))throw new Error('COMPLETION_EVIDENCE_ALREADY_EXISTS');
 const priorFile=resume?'a2-completed-evidence.json':'a2-evidence.json';
 const priorRaw=readFileSync(inputUrl(priorFile),'utf8'),plan=JSON.parse(readFileSync(inputUrl(resume?'a2-resume-plan.json':'a2-completion-plan.json'),'utf8'));
 validateA2Evidence(manifest,a2,JSON.parse(priorRaw));
 if(hash(readFileSync(inputUrl('manifest.json')))!==plan.manifestHash)throw new Error('MANIFEST_CHANGED');
 const client=inspectCodex();if(client.version!==manifest.inspectedClient.version||client.binarySha256!==manifest.inspectedClient.binarySha256)throw new Error('CLIENT_IDENTITY_CHANGED');
 const evidence=prepareCompletion(plan,priorRaw,manifest,a2,sha);if(shard!==null)selectCompletionShard(evidence,shard);
 const boundary=new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url);
 const save=value=>{
  assertSealedSource(sha,outputs.map(evidencePath));
  if(hash(readFileSync(boundary))!==plan.boundaryExecutableHash||hash(readFileSync(inputUrl(priorFile),'utf8'))!==plan.priorEvidenceHash)throw new Error('PRIOR_OR_BOUNDARY_CHANGED');
  writeFileSync(output,JSON.stringify(value,null,2)+'\n');
 };
 console.log(JSON.stringify({status:'COMPLETION_PREFLIGHT_PASS',a2CompletionRunSourceSha:sha,priorA2RunSourceSha:plan.priorA2RunSourceSha,
  preserved:plan.preservedAttemptCount,registeredMissing:evidence.completion.missingAttemptIds.length,shard,providerGenerationRequests:0}));
 if(process.argv.includes('--preflight'))return;
 await completeMissingAttempts(manifest,a2,evidence,request=>runCodexModel(manifest,'verifier',request),save);
 validateA2Evidence(manifest,a2,evidence);
 console.log(JSON.stringify({summary:evidence.summary,completionOperational:operational(evidence.attempts.filter(a=>a.originRunSourceSha===sha)),combinedOperational:evidence.operational}));
 if(evidence.summary.status!=='PASS')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(['COMPLETION_SCOPE_CHANGED','COMPLETION_ALREADY_ATTEMPTED','COMPLETION_EVIDENCE_ALREADY_EXISTS','RUN_SOURCE_CHANGED','PRIOR_OR_BOUNDARY_CHANGED','CLIENT_IDENTITY_CHANGED'].includes(error.message)?error.message:'A2_COMPLETION_FAILED_CLOSED; retained evidence if dispatched');process.exitCode=1;
});
