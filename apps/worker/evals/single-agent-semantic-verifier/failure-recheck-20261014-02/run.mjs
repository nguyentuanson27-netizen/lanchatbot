import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {hash} from '../protocol.mjs';
import {assertSealedSource} from '../run-a2.mjs';
import {loadDiagnostic as loadPriorDiagnostic,runDiagnostic} from '../failure-recheck-20261014/run.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
import {inspectGemini,createGeminiInference} from '../gemini-inference.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file));
const directory=new URL('./',import.meta.url);
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url);
const vertex=new URL('../../../dist/vertex.js',import.meta.url);

export function loadDiagnostic(proposedPlan){
 const plan=json('failure-recheck-20261014-02/plan.json');if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'R67_FAILURE_RECHECK_20261014_02');assert.equal(plan.fullCheckpointQualification,false);
 assert.equal(plan.repetitions,1);assert.equal(plan.retries,0);assert.equal(plan.maxGenerationRequestsPerRoleAttempt,1);
 for(const [file,expected] of Object.entries(plan.frozenFiles))assert.equal(hash(read(file)),expected);
 const prior=loadPriorDiagnostic();
 for(const key of ['models','schemaHash','a2CaseIds','a3CaseIds','sourceA2Attempts','sourceA3Attempts','denominator'])assert.deepEqual(plan[key],prior.plan[key]);
 const manifest=structuredClone(prior.manifest);
 for(const [role,prompt] of [['conversation',plan.ownerPrompt],['verifier',plan.verifierPrompt]]){
  const text=read(prompt.file);assert.equal(hash(text),prompt.hash);
  manifest.prompts[role]=text;manifest.promptHashes[role]=prompt.hash;
 }
 assert.equal(plan.verifierPromptHash,manifest.promptHashes.verifier);
 const expected=prior.plan.registeredAttempts.map(a=>({...a,attemptId:a.attemptId.replace(prior.plan.runId,plan.runId)}));
 assert.deepEqual(plan.registeredAttempts,expected);
 return {plan,manifest,a2:prior.a2,a3:prior.a3,attempts:expected.map(a=>({...a,...(a.phase==='A2'?{expected:'SAFE'}:{}),terminal:null,provider:null,conversation:null}))};
}

async function main(){
 const data=loadDiagnostic(),{plan,manifest}=data,sha=process.env.DIAGNOSTIC_RUN_SOURCE_SHA;
 const output=new URL('evidence.json',directory),temporary=new URL('evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('DIAGNOSTIC_ALREADY_STARTED');
 const allowed=['evidence.json','evidence.json.tmp'].map(file=>'apps/worker/evals/single-agent-semantic-verifier/failure-recheck-20261014-02/'+file);
 const check=()=>{assertSealedSource(sha,allowed);
  assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);assert.equal(hash(readFileSync(vertex)),plan.vertexExecutableHash);};
 check();
 const client=inspectCodex(),conversationClient=inspectGemini(manifest),base=json('round-67/manifest.json');
 assert.equal(client.version,base.inspectedClient.version);assert.equal(client.binarySha256,base.inspectedClient.binarySha256);
 const evidence={schemaVersion:1,runId:plan.runId,scope:plan.scope,fullCheckpointQualification:false,runSourceSha:sha,
  implementationBaseSha:plan.implementationBaseSha,specSha:manifest.specSha,planHash:hash(read('failure-recheck-20261014-02/plan.json')),
  baseManifestHash:plan.frozenFiles['round-67/manifest.json'],effectiveManifestHash:hash(JSON.stringify(manifest)),
  promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,models:manifest.models,client,conversationClient,
  startedAt:new Date().toISOString(),attempts:data.attempts};
 console.log(JSON.stringify({status:'DIAGNOSTIC_PREFLIGHT_PASS',runId:plan.runId,runSourceSha:sha,registered:11,maxGenerationRequests:19,fullCheckpointQualification:false}));
 if(process.argv.includes('--preflight'))return;
 const save=()=>publishA2Evidence(evidence,temporary,output,check);
 save();const gemini=createGeminiInference(manifest);
 await runDiagnostic(data,evidence,(role,request,options)=>role==='conversation'?gemini(request):runCodexModel(manifest,role,request,options),{save,check});
 console.log(JSON.stringify({status:evidence.capacityBlock?'BLOCKED':'DIAGNOSTIC_EXECUTION_COMPLETE',completed:evidence.attempts.filter(a=>a.terminal).length,registered:11,fullCheckpointQualification:false}));
 if(evidence.capacityBlock)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(error.name==='A2EvidencePersistError'?error.message:'DIAGNOSTIC_STOPPED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;
});
