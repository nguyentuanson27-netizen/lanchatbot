import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {hash,validateProtocol,preflight} from '../protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt,summarizeA2,operational,validateA2Evidence,assertSealedSource} from '../run-a2.mjs';
import {runStagedAttempts} from '../run-staged-round52.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file)),directory=new URL('./',import.meta.url);
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url);

export function loadFullA2(proposedPlan){
 const plan=json('a2-full-rerun-20261014/plan.json');if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'C3_FULL_A2_RERUN_20261014_01');assert.equal(plan.includesA3,false);
 assert.equal(plan.retries,0);assert.equal(plan.maxGenerationRequestsPerAttempt,1);
 assert.equal(plan.prefixExecutionPolicy,'REPORT_ONLY_CONTINUE_AFTER_FAILED_PREFIX');
 assert.equal(plan.prefixAcceptancePolicy,'ALL_MATCH_VALID_VERDICTS_UNCHANGED');
 for(const [file,expected] of Object.entries(plan.frozenFiles))assert.equal(hash(read(file)),expected);
 const manifest=json(plan.manifestFile),a2=json('round-68/corpus-a2.json'),a3=json('round-68/corpus-a3.json');
 validateProtocol(manifest,a2,a3);assert.deepEqual(plan.models,manifest.models);
 assert.deepEqual(plan.promptHashes,manifest.promptHashes);assert.equal(plan.schemaHash,manifest.schemaHash);
 const attempts=registerA2Attempts(manifest,a2);assert.equal(attempts.length,142);
 assert.equal(attempts.filter(a=>a.expected==='UNSAFE').length,91);assert.equal(attempts.filter(a=>a.expected==='SAFE').length,51);
 return {plan,manifest,a2,attempts};
}

async function main(){
 assert.equal(process.env.C3_CHECKPOINT_A_ROUND,'68');
 const {plan,manifest,a2,attempts}=loadFullA2(),sha=process.env.A2_RUN_SOURCE_SHA;
 const output=new URL('a2-evidence.json',directory),temporary=new URL('a2-evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('FULL_A2_ALREADY_STARTED');
 const allowed=['a2-evidence.json','a2-evidence.json.tmp'].map(f=>'apps/worker/evals/single-agent-semantic-verifier/a2-full-rerun-20261014/'+f);
 const check=()=>{assertSealedSource(sha,allowed);assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);};
 preflight(manifest,'a2',{a2RunSourceSha:sha},execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean));
 check();const client=inspectCodex();assert.deepEqual(client,{version:manifest.inspectedClient.version,binarySha256:manifest.inspectedClient.binarySha256});
 console.log(JSON.stringify({status:'FULL_A2_PREFLIGHT_PASS',runId:plan.runId,a2RunSourceSha:sha,registered:142,includesA3:false}));
 if(process.argv.includes('--preflight'))return;
 const evidence={schemaVersion:1,phase:'A2',runId:plan.runId,scope:plan.scope,a2RunSourceSha:sha,
  implementationBaseSha:manifest.implementationBaseSha,specSha:manifest.specSha,
  manifestHash:hash(read(plan.manifestFile)),planHash:hash(read('a2-full-rerun-20261014/plan.json')),
  corpusHash:manifest.corpusHashes.a2,promptHash:manifest.promptHashes.verifier,schemaHash:manifest.schemaHash,
  models:manifest.models,client,boundaryExecutableHash:plan.boundaryExecutableHash,startedAt:new Date().toISOString(),attempts,regression:null};
 const save=()=>{evidence.summary=summarizeA2(manifest,attempts);evidence.operational=operational(attempts);
  publishA2Evidence(evidence,temporary,output,check);};
 save();
 await runStagedAttempts(manifest,'a2',a2,evidence,(attempt,options)=>evaluateA2Attempt(manifest,
  a2.cases.find(c=>c.evaluator.caseId===attempt.caseId),request=>runCodexModel(manifest,'verifier',request,options)),
  {save,checkSource:check,mode:'ALL',stopAfterFailedPrefix:false});
 evidence.finishedAt=new Date().toISOString();save();validateA2Evidence(manifest,a2,evidence);
 console.log(JSON.stringify({runId:plan.runId,summary:evidence.summary,regression:evidence.regression,operational:evidence.operational}));
 if(evidence.summary.status!=='PASS'||evidence.regression?.status!=='PASS')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(error.name==='A2EvidencePersistError'?error.message:'FULL_A2_STOPPED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;
});
