import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {hash} from '../protocol.mjs';
import {loadBypass} from '../a3-owner-authorized-bypass-20261014/run.mjs';
import {assertSealedSource,providerCapacityExhausted} from '../run-a2.mjs';
import {runDiagnostic} from '../failure-recheck-20261014/run.mjs';
import {scoreWholeReplies,a3Operational,validateA3Evidence,humanView} from '../run-a3.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
import {inspectGemini,createGeminiInference} from '../gemini-inference.mjs';
const directory=new URL('./',import.meta.url),read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),json=f=>JSON.parse(read(f));
const prefix='apps/worker/evals/single-agent-semantic-verifier/a3-stream-recheck-20261014/';
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url),vertex=new URL('../../../dist/vertex.js',import.meta.url);

export function loadStreamRecheck(proposedPlan){
 const plan=json('a3-stream-recheck-20261014/plan.json');if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'C3_A3_STREAM_RECHECK_20261014_01');assert.equal(plan.ownerAuthorization,'chạy lại 3 case lỗi stream');
 assert.equal(plan.fullCheckpointQualification,false);assert.equal(plan.repetitions,1);assert.equal(plan.generationRetries,0);
 assert.equal(plan.maximumGenerationRequests,6);assert.equal(plan.maxGenerationRequestsPerRoleAttempt,1);assert.equal(plan.adoptedOutcomes,0);
 assert.equal(hash(read('a3-stream-recheck-20261014/SCOPE.md')),plan.scopeHash);
 const parent=loadBypass();assert.equal(hash(read('a3-owner-authorized-bypass-20261014/plan.json')),plan.parentPlanHash);
 assert.equal(parent.plan.effectiveManifestHash,plan.effectiveManifestHash);
 const prior=json(plan.priorEvidence.file);assert.equal(hash(read(plan.priorEvidence.file)),plan.priorEvidence.sha256);
 const failures=prior.attempts.filter(a=>a.verification?.provider?.status==='PROVIDER_ERROR'&&a.verification.provider.errorStage==='GENERATION_STREAM');
 assert.equal(failures.length,3);assert.deepEqual(failures.map(a=>a.caseId),plan.caseIds);assert.deepEqual(failures.map(a=>a.attemptId),plan.priorAttemptIds);
 const a3={schemaVersion:parent.a3.schemaVersion,cases:plan.caseIds.map(id=>parent.a3.cases.find(c=>c.evaluator.caseId===id))};
 assert.ok(a3.cases.every(Boolean));
 const attempts=plan.caseIds.map(caseId=>({phase:'A3',caseId,attemptId:caseId+':1',repetition:1,conversation:null,provider:null,finalDraft:null,verification:null,terminal:null}));
 return {plan,parent,manifest:parent.manifest,a2:{cases:[]},a3,prior,attempts};
}

async function main(){
 assert.equal(process.env.C3_CHECKPOINT_A_ROUND,'68');
 const data=loadStreamRecheck(),{plan,manifest,a3}=data,sha=process.env.A3_RUN_SOURCE_SHA;
 const output=new URL('a3-evidence.json',directory),temporary=new URL('a3-evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('STREAM_RECHECK_ALREADY_STARTED_NO_RETRY');
 const check=()=>{assertSealedSource(sha,[prefix+'a3-evidence.json',prefix+'a3-evidence.json.tmp']);assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);assert.equal(hash(readFileSync(vertex)),plan.vertexExecutableHash);};
 check();const client=inspectCodex(),conversationClient=inspectGemini(manifest);
 assert.deepEqual(client,{version:manifest.inspectedClient.version,binarySha256:manifest.inspectedClient.binarySha256});
 console.log(JSON.stringify({status:'STREAM_RECHECK_PREFLIGHT_PASS',runId:plan.runId,a3RunSourceSha:sha,registered:3,maximumGenerationRequests:6,fullCheckpointQualification:false}));
 if(process.argv.includes('--preflight'))return;
 const evidence={schemaVersion:1,phase:'A3',runId:plan.runId,fullCheckpointQualification:false,a2BypassOwnerAuthorized:true,a2QualificationStatus:'FAIL',
  a3RunSourceSha:sha,implementationBaseSha:plan.implementationBaseSha,specSha:plan.specSha,manifestHash:data.parent.base.baseManifestHash,
  effectiveManifestHash:plan.effectiveManifestHash,planHash:hash(read('a3-stream-recheck-20261014/plan.json')),priorEvidenceHash:plan.priorEvidence.sha256,
  corpusHash:manifest.corpusHashes.a3,cohortCaseIds:plan.caseIds,promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,models:manifest.models,
  client,conversationClient,boundaryExecutableHash:plan.boundaryExecutableHash,startedAt:new Date().toISOString(),attempts:data.attempts,quality:null,operational:null};
 const save=()=>{evidence.quality=scoreWholeReplies(manifest,a3,evidence.attempts,null);evidence.operational=a3Operational(evidence.attempts);publishA2Evidence(evidence,temporary,output,check);};
 save();const gemini=createGeminiInference(manifest);
 await runDiagnostic(data,evidence,(role,body,options)=>role==='conversation'?gemini(body):runCodexModel(manifest,role,body,options),{save,check});
 if(evidence.capacityBlock){const slot=evidence.attempts.find(a=>a.attemptId===evidence.capacityBlock.attemptId),v=slot.verification?.provider;
  if(providerCapacityExhausted(manifest,v))evidence.capacityBlock={attemptId:slot.attemptId,role:'verifier',providerErrorCode:v.providerErrorCode};}
 save();const views=evidence.attempts.map(a=>humanView(a3.cases.find(c=>c.evaluator.caseId===a.caseId),a));
 writeFileSync(new URL('a3-human-review.json',directory),JSON.stringify({rubric:manifest.scoring,attempts:views},null,2)+'\n');
 writeFileSync(new URL('a3-human-scores.json',directory),JSON.stringify({scorer:null,scoredAt:null,a3RunSourceSha:sha,attempts:views.map(v=>({attemptId:v.attemptId,scores:Object.fromEntries(manifest.scoring.dimensions.map(d=>[d,null]))}))},null,2)+'\n');
 const completed=evidence.attempts.filter(a=>a.terminal).length;if(completed===3||evidence.capacityBlock?.role==='verifier')validateA3Evidence(manifest,a3,evidence);
 console.log(JSON.stringify({status:evidence.capacityBlock?'BLOCKED':'STREAM_RECHECK_COMPLETE_AWAITING_PRIMARY',registered:3,completed,operational:evidence.operational}));
 if(evidence.capacityBlock)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.name==='A2EvidencePersistError'?error.message:'STREAM_RECHECK_STOPPED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;});
