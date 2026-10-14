import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {hash,validateProtocol,preflight} from '../protocol.mjs';
import {registerA2Attempts,evaluateA2Attempt,summarizeA2,operational,validateA2Evidence,assertSealedSource,providerCapacityExhausted} from '../run-a2.mjs';
import {runStagedAttempts} from '../run-staged-round52.mjs';
import {scoreWholeReplies,a3Operational,validateA3Evidence,humanView} from '../run-a3.mjs';
import {runDiagnostic} from '../failure-recheck-20261014/run.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
import {inspectGemini,createGeminiInference} from '../gemini-inference.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8'),json=file=>JSON.parse(read(file));
const directory=new URL('./',import.meta.url),prefix='apps/worker/evals/single-agent-semantic-verifier/clear-boundaries-run-20261014/';
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url),vertex=new URL('../../../dist/vertex.js',import.meta.url);

export function loadRun(proposedPlan){
 const plan=json('clear-boundaries-run-20261014/plan.json');if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'C3_CLEAR_BOUNDARIES_RUN_20261014_01');assert.equal(plan.generationRetries,0);assert.equal(plan.adoptedOutcomes,0);
 assert.equal(plan.maxGenerationRequestsPerRoleAttempt,1);assert.equal(plan.a3Repetitions,1);
 for(const [file,expected] of Object.entries(plan.frozenFiles))assert.equal(hash(read(file)),expected);
 const base=json(plan.baseManifestFile),a2=json('round-68/corpus-a2.json'),a3=json('round-68/corpus-a3.json');
 assert.deepEqual(validateProtocol(base,a2,a3),{a2Unsafe:87,a2Safe:51,a3:42});
 assert.deepEqual(plan.models,base.models);assert.deepEqual(plan.primaryScoring,base.scoring);
 assert.deepEqual(plan.corpusHashes,base.corpusHashes);assert.equal(plan.schemaHash,base.schemaHash);
 const manifest=structuredClone(base);
 for(const [role,prompt] of Object.entries(plan.prompts)){
  assert.ok(['conversation','verifier'].includes(role));const text=read(prompt.file);assert.equal(hash(text),prompt.sha256);
  manifest.prompts[role]=text;manifest.promptHashes[role]=prompt.sha256;
 }
 assert.equal(hash(JSON.stringify(manifest)),plan.effectiveManifestHash);
 const attempts=registerA2Attempts(manifest,a2);assert.equal(attempts.length,142);
 assert.equal(attempts.filter(a=>a.expected==='UNSAFE').length,91);assert.equal(attempts.filter(a=>a.expected==='SAFE').length,51);
 return {plan,manifest,a2,a3,baseManifestHash:hash(read(plan.baseManifestFile)),planHash:hash(read('clear-boundaries-run-20261014/plan.json'))};
}

export function requireFreshA2(data,evidence){
 assert.equal(evidence.runId,data.plan.runId);assert.equal(evidence.planHash,data.planHash);
 assert.equal(evidence.manifestHash,data.baseManifestHash);assert.equal(evidence.effectiveManifestHash,data.plan.effectiveManifestHash);
 assert.equal(evidence.promptHash,data.manifest.promptHashes.verifier);
 const summary=validateA2Evidence(data.manifest,data.a2,evidence);
 assert.equal(summary.status,'PASS');assert.equal(summary.executedDenominator,142);assert.equal(summary.unexecuted,0);
 assert.equal(evidence.regression?.status,'PASS');return summary;
}

async function main(){
 assert.equal(process.env.C3_CHECKPOINT_A_ROUND,'68');
 const data=loadRun(),{plan,manifest,a2,a3}=data;
 const phase=process.argv.includes('--a2')?'a2':process.argv.includes('--a3')?'a3':null;assert.ok(phase);
 const sha=process.env[phase.toUpperCase()+'_RUN_SOURCE_SHA'];
 const output=new URL(phase+'-evidence.json',directory),temporary=new URL(phase+'-evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('RUN_ALREADY_STARTED_NO_RETRY');
 const allowed=[prefix+phase+'-evidence.json',prefix+phase+'-evidence.json.tmp'];
 const check=()=>{assertSealedSource(sha,allowed);assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);assert.equal(hash(readFileSync(vertex)),plan.vertexExecutableHash);};
 const priorA2=phase==='a3'?json('clear-boundaries-run-20261014/a2-evidence.json'):null;
 if(priorA2)requireFreshA2(data,priorA2);
 preflight(manifest,phase,{[phase+'RunSourceSha']:sha,...(priorA2?{a2Status:priorA2.summary.status}:{})},
  execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean));
 check();const client=inspectCodex(),conversationClient=inspectGemini(manifest);
 assert.deepEqual(client,{version:manifest.inspectedClient.version,binarySha256:manifest.inspectedClient.binarySha256});
 console.log(JSON.stringify({status:'CLEAR_BOUNDARIES_PREFLIGHT_PASS',runId:plan.runId,phase,sourceSha:sha,effectiveManifestHash:plan.effectiveManifestHash,registered:phase==='a2'?142:42}));
 if(process.argv.includes('--preflight'))return;
 const attempts=phase==='a2'?registerA2Attempts(manifest,a2):a3.cases.map(c=>({phase:'A3',caseId:c.evaluator.caseId,attemptId:c.evaluator.caseId+':1',repetition:1,conversation:null,provider:null,finalDraft:null,verification:null,terminal:null}));
 const evidence={schemaVersion:1,phase:phase.toUpperCase(),runId:plan.runId,[phase+'RunSourceSha']:sha,
  implementationBaseSha:manifest.implementationBaseSha,specSha:manifest.specSha,manifestHash:data.baseManifestHash,
  effectiveManifestHash:plan.effectiveManifestHash,planHash:data.planHash,corpusHash:manifest.corpusHashes[phase],
  promptHashes:manifest.promptHashes,promptHash:manifest.promptHashes.verifier,schemaHash:manifest.schemaHash,models:manifest.models,
  client,conversationClient,boundaryExecutableHash:plan.boundaryExecutableHash,startedAt:new Date().toISOString(),attempts,
  ...(priorA2?{a2RunSourceSha:priorA2.a2RunSourceSha,a2EvidenceHash:hash(read('clear-boundaries-run-20261014/a2-evidence.json'))}:{regression:null})};
 const save=()=>{
  if(phase==='a2'){evidence.summary=summarizeA2(manifest,attempts);evidence.operational=operational(attempts);}
  else{evidence.quality=scoreWholeReplies(manifest,a3,attempts,null);evidence.operational=a3Operational(attempts);}
  publishA2Evidence(evidence,temporary,output,check);
 };
 save();
 if(phase==='a2'){
  await runStagedAttempts(manifest,'a2',a2,evidence,(attempt,options)=>evaluateA2Attempt(manifest,
   a2.cases.find(c=>c.evaluator.caseId===attempt.caseId),request=>runCodexModel(manifest,'verifier',request,options)),
   {save,checkSource:check,mode:'ALL',stopAfterFailedPrefix:false});
  evidence.finishedAt=new Date().toISOString();save();validateA2Evidence(manifest,a2,evidence);
  console.log(JSON.stringify({runId:plan.runId,phase,summary:evidence.summary,regression:evidence.regression,operational:evidence.operational}));
  if(evidence.summary.status!=='PASS'||evidence.regression?.status!=='PASS')process.exitCode=1;
 }else{
  const gemini=createGeminiInference(manifest);
  await runDiagnostic(data,evidence,(role,request,options)=>role==='conversation'?gemini(request):runCodexModel(manifest,role,request,options),{save,check});
  if(evidence.capacityBlock){const stopped=attempts.find(a=>a.attemptId===evidence.capacityBlock.attemptId),v=stopped.verification?.provider;
   if(providerCapacityExhausted(manifest,v))evidence.capacityBlock={attemptId:stopped.attemptId,role:'verifier',providerErrorCode:v.providerErrorCode};}
  save();const views=attempts.map(a=>humanView(a3.cases.find(c=>c.evaluator.caseId===a.caseId),a));
  writeFileSync(new URL('a3-human-review.json',directory),JSON.stringify({rubric:manifest.scoring,attempts:views},null,2)+'\n');
  writeFileSync(new URL('a3-human-scores.json',directory),JSON.stringify({scorer:null,scoredAt:null,a3RunSourceSha:sha,attempts:views.map(v=>({attemptId:v.attemptId,scores:Object.fromEntries(manifest.scoring.dimensions.map(d=>[d,null]))}))},null,2)+'\n');
  const completed=attempts.filter(a=>a.terminal).length;
  if(completed===42||evidence.capacityBlock?.role==='verifier')validateA3Evidence(manifest,a3,evidence);
  console.log(JSON.stringify({status:evidence.capacityBlock?'BLOCKED':'A3_COMPLETE_AWAITING_PRIMARY_REVIEW',completed,registered:42,operational:evidence.operational}));
  if(evidence.capacityBlock)process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(error.name==='A2EvidencePersistError'?error.message:'CLEAR_BOUNDARIES_RUN_STOPPED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;
});
