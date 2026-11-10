import {readFileSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {hash,validateProtocol,preflight} from './protocol.mjs';
import {loadInputs,registerA2Attempts,assertSealedSource,validateA2Evidence} from './run-a2.mjs';
import {runShard,publishA2Evidence} from './run-a2-shards.mjs';import {inspectCodex,runCodexModel} from './codex-inference.mjs';
const runId='A2_FAILURE_RECHECK_20261013_01',directory=new URL('./a2-failure-recheck-20261013/',import.meta.url);

export function prepareFailureRecheck(m,a2,p,priorRaw,sourceSha) {
 const prior=JSON.parse(priorRaw),failed=prior.attempts.filter(a=>(a.expected==='SAFE'&&a.terminal&&a.terminal.disposition!=='SEND_ELIGIBLE')||(a.invocationStartedAt&&!a.terminal));
 const caseIds=[...new Set(failed.filter(a=>a.expected==='UNSAFE').map(a=>a.caseId)),...new Set(failed.filter(a=>a.expected==='SAFE').map(a=>a.caseId))];
 const fresh=registerA2Attempts(m,a2),attempts=caseIds.flatMap(id=>fresh.filter(a=>a.caseId===id).map(a=>({...a,sourceCaseAttemptId:a.attemptId,attemptId:runId+'/'+a.attemptId})));
 if(m.round!==64||p.baseRound!==64||p.runId!==runId||p.scope!=='DIAGNOSTIC_FAILURE_COHORT_ONLY'||p.sampling!=='UNCHANGED_R64_N1_N3'||
  p.maximumGenerationRequestsPerAttempt!==1||p.retry!==0||p.stopOnUnsafeSendEligiblePass!==true||p.fullA2Qualification!==false||p.a3Allowed!==false||
  !/^[a-f0-9]{40}$/.test(sourceSha)||p.manifestHash!==hash(JSON.stringify(m,null,2)+'\n')||p.priorEvidenceHash!==hash(priorRaw)||
  p.corpusHash!==m.corpusHashes.a2||JSON.stringify(p.verifier)!==JSON.stringify(m.models.verifier)||
  JSON.stringify(p.caseIds)!==JSON.stringify(caseIds)||JSON.stringify(p.sourceFailureAttemptIds)!==JSON.stringify(failed.map(a=>a.attemptId))||
  JSON.stringify(p.registeredAttemptIds)!==JSON.stringify(attempts.map(a=>a.attemptId)))throw new Error('FAILURE_RECHECK_SCOPE_CHANGED');
 return {schemaVersion:1,phase:'A2',runId,scope:p.scope,fullCheckpointQualification:false,a2RunSourceSha:sourceSha,
  implementationBaseSha:m.implementationBaseSha,specSha:m.specSha,manifestHash:p.manifestHash,corpusHash:p.corpusHash,
  promptHash:m.promptHashes.verifier,schemaHash:m.schemaHash,models:m.models,planHash:hash(JSON.stringify(p,null,2)+'\n'),
  boundaryExecutableHash:p.boundaryExecutableHash,priorEvidenceHash:p.priorEvidenceHash,startedAt:new Date().toISOString(),
  shard:{index:0,attemptIds:[...p.registeredAttemptIds]},attempts,summary:null};
}

async function main() {
 if(process.env.C3_CHECKPOINT_A_ROUND!=='64')throw new Error('FIXED_RECHECK_BASE_REQUIRED');
 const {manifest:m,a2,a3}=loadInputs();validateProtocol(m,a2,a3);const p=JSON.parse(readFileSync(new URL('plan.json',directory),'utf8'));
 const priorRaw=readFileSync(new URL('./round-64/a2-evidence.json',import.meta.url),'utf8'),sha=process.env.A2_RUN_SOURCE_SHA;
 const output=new URL('evidence.json',directory),temporary=new URL('evidence.json.tmp',directory),allowed=['evidence.json','evidence.json.tmp'].map(n=>'apps/worker/evals/single-agent-semantic-verifier/a2-failure-recheck-20261013/'+n);
 const check=()=>{assertSealedSource(sha,allowed);if(hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url)))!==p.boundaryExecutableHash)throw new Error('BOUNDARY_EXECUTABLE_CHANGED');};
 check();preflight(m,'a2',{a2RunSourceSha:sha},execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),[]);
 const e=prepareFailureRecheck(m,a2,p,priorRaw,sha);if(existsSync(output)||existsSync(temporary))throw new Error('FAILURE_RECHECK_ALREADY_STARTED');
 const client=inspectCodex();if(client.version!==m.inspectedClient.version||client.binarySha256!==m.inspectedClient.binarySha256)throw new Error('CLIENT_IDENTITY_CHANGED');e.client=client;
 console.log(JSON.stringify({status:'FAILURE_RECHECK_PREFLIGHT_PASS',runId,a2RunSourceSha:sha,registered:e.attempts.length,providerGenerations:0,fullCheckpointQualification:false}));
 if(process.argv.includes('--preflight'))return;
 await runShard(m,a2,e,(request,options)=>runCodexModel(m,'verifier',request,options),{
  save:value=>publishA2Evidence(value,temporary,output,check),checkSource:check,stopOnUnsafePass:true,log:()=>{}});
 validateA2Evidence(m,a2,e,{registeredAttemptIds:p.registeredAttemptIds});
 console.log(JSON.stringify({scope:e.scope,summary:e.summary,operational:e.operational,fullCheckpointQualification:false}));
 if(e.summary.status!=='PASS')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(error.name==='A2EvidencePersistError'||['FAILURE_RECHECK_SCOPE_CHANGED','FAILURE_RECHECK_ALREADY_STARTED','FIXED_RECHECK_BASE_REQUIRED','RUN_SOURCE_CHANGED','BOUNDARY_EXECUTABLE_CHANGED','CLIENT_IDENTITY_CHANGED'].includes(error.message)?error.message:'FAILURE_RECHECK_FAILED_CLOSED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;
});
