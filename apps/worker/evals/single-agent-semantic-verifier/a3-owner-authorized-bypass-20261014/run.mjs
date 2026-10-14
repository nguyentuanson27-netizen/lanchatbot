import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {hash} from '../protocol.mjs';
import {loadRun} from '../clear-boundaries-run-20261014/run.mjs';
import {assertSealedSource,providerCapacityExhausted} from '../run-a2.mjs';
import {runDiagnostic} from '../failure-recheck-20261014/run.mjs';
import {scoreWholeReplies,a3Operational,validateA3Evidence,humanView} from '../run-a3.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
import {inspectGemini,createGeminiInference} from '../gemini-inference.mjs';
const directory=new URL('./',import.meta.url),read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file)),prefix='apps/worker/evals/single-agent-semantic-verifier/a3-owner-authorized-bypass-20261014/';
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url),vertex=new URL('../../../dist/vertex.js',import.meta.url);

export function loadBypass(proposedPlan){
 const plan=json('a3-owner-authorized-bypass-20261014/plan.json');if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'C3_A3_DIAGNOSTIC_BYPASS_20261014_01');assert.equal(plan.ownerAuthorization,'chạy a3 đi, by pass a2');
 assert.equal(plan.fullCheckpointQualification,false);assert.equal(plan.a2PrerequisiteOverride,'OWNER_AUTHORIZED_DIAGNOSTIC_ONLY');
 assert.equal(plan.repetitions,1);assert.equal(plan.generationRetries,0);assert.equal(plan.maximumGenerationRequestsPerRoleAttempt,1);
 assert.equal(plan.maximumGenerationRequests,84);assert.equal(plan.adoptedOutcomes,0);
 assert.equal(hash(read('a3-owner-authorized-bypass-20261014/SCOPE.md')),plan.scopeSha256);
 const base=loadRun();assert.equal(base.planHash,plan.basePlanSha256);assert.equal(base.plan.effectiveManifestHash,plan.effectiveManifestHash);
 const priorA2=json(plan.a2Evidence.file),priorAudit=json(plan.a2Audit.file);
 assert.equal(hash(read(plan.a2Evidence.file)),plan.a2Evidence.sha256);assert.equal(hash(read(plan.a2Audit.file)),plan.a2Audit.sha256);
 assert.equal(priorAudit.finalA2Status,'FAIL');assert.equal(priorA2.summary.status,'PASS');assert.equal(priorA2.regression.status,'FAIL');
 assert.equal(priorA2.a2RunSourceSha,plan.a2Evidence.runSourceSha);
 assert.deepEqual(base.a3.cases.map(c=>c.evaluator.caseId),plan.caseIds);assert.equal(plan.caseIds.length,42);
 const attempts=plan.caseIds.map(caseId=>({phase:'A3',caseId,attemptId:caseId+':1',repetition:1,conversation:null,provider:null,finalDraft:null,verification:null,terminal:null}));
 return {plan,base,manifest:base.manifest,a2:{cases:[]},a3:base.a3,priorA2,priorAudit,attempts};
}

async function main(){
 assert.equal(process.env.C3_CHECKPOINT_A_ROUND,'68');
 const data=loadBypass(),{plan,manifest,a3,priorA2}=data,sha=process.env.A3_RUN_SOURCE_SHA;
 const output=new URL('a3-evidence.json',directory),temporary=new URL('a3-evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('DIAGNOSTIC_ALREADY_STARTED_NO_RETRY');
 const check=()=>{assertSealedSource(sha,[prefix+'a3-evidence.json',prefix+'a3-evidence.json.tmp']);
  assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);assert.equal(hash(readFileSync(vertex)),plan.vertexExecutableHash);};
 check();const client=inspectCodex(),conversationClient=inspectGemini(manifest);
 assert.deepEqual(client,{version:manifest.inspectedClient.version,binarySha256:manifest.inspectedClient.binarySha256});
 console.log(JSON.stringify({status:'DIAGNOSTIC_A3_PREFLIGHT_PASS_A2_BYPASSED',runId:plan.runId,a3RunSourceSha:sha,a2Qualification:'FAIL',fullCheckpointQualification:false,registered:42,maximumGenerationRequests:84}));
 if(process.argv.includes('--preflight'))return;
 const evidence={schemaVersion:1,phase:'A3',runId:plan.runId,fullCheckpointQualification:false,a2BypassOwnerAuthorized:true,
  a2QualificationStatus:'FAIL',a2PrefixStatus:'FAIL',a3RunSourceSha:sha,a2RunSourceSha:priorA2.a2RunSourceSha,a2EvidenceHash:plan.a2Evidence.sha256,
  implementationBaseSha:plan.implementationBaseSha,specSha:plan.specSha,manifestHash:data.base.baseManifestHash,effectiveManifestHash:plan.effectiveManifestHash,
  planHash:hash(read('a3-owner-authorized-bypass-20261014/plan.json')),corpusHash:manifest.corpusHashes.a3,promptHashes:manifest.promptHashes,
  schemaHash:manifest.schemaHash,models:manifest.models,client,conversationClient,boundaryExecutableHash:plan.boundaryExecutableHash,
  startedAt:new Date().toISOString(),attempts:data.attempts,quality:null,operational:null};
 const save=()=>{evidence.quality=scoreWholeReplies(manifest,a3,evidence.attempts,null);evidence.operational=a3Operational(evidence.attempts);
  publishA2Evidence(evidence,temporary,output,check);};
 save();const gemini=createGeminiInference(manifest);
 await runDiagnostic(data,evidence,(role,request,options)=>role==='conversation'?gemini(request):runCodexModel(manifest,role,request,options),{save,check});
 if(evidence.capacityBlock){const stopped=evidence.attempts.find(a=>a.attemptId===evidence.capacityBlock.attemptId),v=stopped.verification?.provider;
  if(providerCapacityExhausted(manifest,v))evidence.capacityBlock={attemptId:stopped.attemptId,role:'verifier',providerErrorCode:v.providerErrorCode};}
 save();const views=evidence.attempts.map(a=>humanView(a3.cases.find(c=>c.evaluator.caseId===a.caseId),a));
 writeFileSync(new URL('a3-human-review.json',directory),JSON.stringify({rubric:manifest.scoring,attempts:views},null,2)+'\n');
 writeFileSync(new URL('a3-human-scores.json',directory),JSON.stringify({scorer:null,scoredAt:null,a3RunSourceSha:sha,
  attempts:views.map(v=>({attemptId:v.attemptId,scores:Object.fromEntries(manifest.scoring.dimensions.map(d=>[d,null]))}))},null,2)+'\n');
 const completed=evidence.attempts.filter(a=>a.terminal).length;
 if(completed===42||evidence.capacityBlock?.role==='verifier')validateA3Evidence(manifest,a3,evidence);
 console.log(JSON.stringify({status:evidence.capacityBlock?'BLOCKED':'DIAGNOSTIC_A3_COMPLETE_AWAITING_PRIMARY',completed,registered:42,fullCheckpointQualification:false,operational:evidence.operational}));
 if(evidence.capacityBlock)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(error.name==='A2EvidencePersistError'?error.message:'DIAGNOSTIC_A3_STOPPED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;
});
