import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {hash,validateProtocol,preflight} from '../protocol.mjs';
import {validateA2Evidence,assertSealedSource,providerCapacityExhausted} from '../run-a2.mjs';
import {scoreWholeReplies,a3Operational,validateA3Evidence,humanView} from '../run-a3.mjs';
import {runDiagnostic} from '../failure-recheck-20261014/run.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
import {inspectGemini,createGeminiInference} from '../gemini-inference.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file)),directory=new URL('./',import.meta.url);
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url),vertex=new URL('../../../dist/vertex.js',import.meta.url);

export function loadFullA3(proposedPlan){
 assert.equal(process.env.C3_CHECKPOINT_A_ROUND,'68');
 const plan=json('a3-full-followup-20261014/plan.json');if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'C3_FULL_A3_FOLLOWUP_20261014_01');assert.equal(plan.repetitions,1);assert.equal(plan.retry,0);
 for(const [file,expected] of Object.entries(plan.frozenFiles))assert.equal(hash(read(file)),expected);
 const manifest=json(plan.manifestFile),a2=json('round-68/corpus-a2.json'),a3=json('round-68/corpus-a3.json');
 validateProtocol(manifest,a2,a3);assert.deepEqual(plan.models,manifest.models);assert.deepEqual(plan.promptHashes,manifest.promptHashes);
 assert.deepEqual(plan.primaryScoring,manifest.scoring);assert.equal(plan.schemaHash,manifest.schemaHash);
 const priorA2=json(plan.a2Evidence.file);assert.equal(hash(read(plan.a2Evidence.file)),plan.a2Evidence.sha256);
 assert.equal(priorA2.a2RunSourceSha,plan.a2Evidence.runSourceSha);
 assert.equal(validateA2Evidence(manifest,a2,priorA2).status,'PASS');assert.equal(priorA2.regression.status,'PASS');
 assert.equal(priorA2.summary.executedDenominator,142);assert.equal(priorA2.summary.unexecuted,0);
 const attempts=a3.cases.map(c=>({phase:'A3',caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':1',repetition:1,
  conversation:null,provider:null,finalDraft:null,verification:null,terminal:null}));
 assert.equal(attempts.length,42);return {plan,manifest,a2:{schemaVersion:1,cases:[]},a3,priorA2,attempts};
}

async function main(){
 const data=loadFullA3(),{plan,manifest,a3,priorA2}=data,sha=process.env.A3_RUN_SOURCE_SHA;
 const output=new URL('a3-evidence.json',directory),temporary=new URL('a3-evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('FULL_A3_ALREADY_STARTED');
 const allowed=['a3-evidence.json','a3-evidence.json.tmp'].map(f=>'apps/worker/evals/single-agent-semantic-verifier/a3-full-followup-20261014/'+f);
 const check=()=>{assertSealedSource(sha,allowed);assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);assert.equal(hash(readFileSync(vertex)),plan.vertexExecutableHash);};
 preflight(manifest,'a3',{a3RunSourceSha:sha,a2Status:priorA2.summary.status},execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean));
 check();const client=inspectCodex(),conversationClient=inspectGemini(manifest);
 assert.deepEqual(client,{version:manifest.inspectedClient.version,binarySha256:manifest.inspectedClient.binarySha256});
 console.log(JSON.stringify({status:'FULL_A3_PREFLIGHT_PASS',runId:plan.runId,a3RunSourceSha:sha,a2RunSourceSha:priorA2.a2RunSourceSha,registered:42,maximumGenerationRequests:84}));
 if(process.argv.includes('--preflight'))return;
 const evidence={schemaVersion:1,phase:'A3',runId:plan.runId,a3RunSourceSha:sha,a2RunSourceSha:priorA2.a2RunSourceSha,
  implementationBaseSha:manifest.implementationBaseSha,specSha:manifest.specSha,manifestHash:hash(read(plan.manifestFile)),
  planHash:hash(read('a3-full-followup-20261014/plan.json')),a2EvidenceHash:plan.a2Evidence.sha256,
  corpusHash:manifest.corpusHashes.a3,promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,models:manifest.models,client,conversationClient,
  boundaryExecutableHash:plan.boundaryExecutableHash,startedAt:new Date().toISOString(),attempts:data.attempts,quality:null,operational:null};
 const save=()=>{evidence.quality=scoreWholeReplies(manifest,a3,evidence.attempts,null);evidence.operational=a3Operational(evidence.attempts);
  publishA2Evidence(evidence,temporary,output,check);};
 save();const gemini=createGeminiInference(manifest);
 await runDiagnostic(data,evidence,(role,request,options)=>role==='conversation'?gemini(request):runCodexModel(manifest,role,request,options),{save,check});
 if(evidence.capacityBlock){const stopped=evidence.attempts.find(a=>a.attemptId===evidence.capacityBlock.attemptId),v=stopped.verification?.provider;
  if(providerCapacityExhausted(manifest,v))evidence.capacityBlock={attemptId:stopped.attemptId,role:'verifier',providerErrorCode:v.providerErrorCode};}
 save();
 const views=evidence.attempts.map(a=>humanView(a3.cases.find(c=>c.evaluator.caseId===a.caseId),a));
 writeFileSync(new URL('a3-human-review.json',directory),JSON.stringify({rubric:manifest.scoring,attempts:views},null,2)+'\n');
 writeFileSync(new URL('a3-human-scores.json',directory),JSON.stringify({scorer:null,scoredAt:null,a3RunSourceSha:sha,
  attempts:views.map(v=>({attemptId:v.attemptId,scores:Object.fromEntries(manifest.scoring.dimensions.map(d=>[d,null]))}))},null,2)+'\n');
 const completed=evidence.attempts.filter(a=>a.terminal).length;
 if(completed===42||evidence.capacityBlock?.role==='verifier')validateA3Evidence(manifest,a3,evidence);
 console.log(JSON.stringify({status:evidence.capacityBlock?'BLOCKED':'FULL_A3_COMPLETE_AWAITING_PRIMARY_REVIEW',completed,registered:42,operational:evidence.operational}));
 if(evidence.capacityBlock)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(error.name==='A2EvidencePersistError'?error.message:'FULL_A3_STOPPED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;
});
