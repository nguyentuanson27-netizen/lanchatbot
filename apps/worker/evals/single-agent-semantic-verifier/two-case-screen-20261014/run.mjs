import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {hash,validateProtocol} from '../protocol.mjs';
import {assertSealedSource} from '../run-a2.mjs';
import {runDiagnostic} from '../failure-recheck-20261014/run.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
import {inspectGemini,createGeminiInference} from '../gemini-inference.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file)),directory=new URL('./',import.meta.url);
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url);
const vertex=new URL('../../../dist/vertex.js',import.meta.url);

export function loadScreen(proposedPlan){
 const plan=json('two-case-screen-20261014/plan.json');if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'C3_TWO_CASE_SCREEN_20261014_01');assert.equal(plan.fullCheckpointQualification,false);
 assert.equal(plan.repetitions,1);assert.equal(plan.retry,0);assert.equal(plan.maximumGenerationRequests,4);
 for(const [file,expected] of Object.entries(plan.frozenFiles))assert.equal(hash(read(file)),expected);
 const manifest=json('round-67/manifest.json'),a2=json('round-67/corpus-a2.json'),allA3=json('round-67/corpus-a3.json');
 validateProtocol(manifest,a2,allA3);assert.deepEqual(plan.models,manifest.models);assert.equal(plan.schemaHash,manifest.schemaHash);
 const previous=json('failure-recheck-20261014-02/evidence.json'),quality=json('failure-recheck-20261014-02/a3-quality.json');
 assert.deepEqual(plan.caseIds,quality.rows.filter(r=>!r.pass).map(r=>previous.attempts.find(a=>a.attemptId===r.attemptId).caseId));
 for(const [role,prompt] of Object.entries(plan.prompts)){const text=read(prompt.file);assert.equal(hash(text),prompt.hash);manifest.prompts[role]=text;manifest.promptHashes[role]=prompt.hash;}
 const a3={schemaVersion:allA3.schemaVersion,cases:plan.caseIds.map(id=>{const f=allA3.cases.find(c=>c.evaluator.caseId===id);assert.ok(f);return f;})};
 return {plan,manifest,a2:{schemaVersion:a2.schemaVersion,cases:[]},a3,
  attempts:plan.caseIds.map(caseId=>({phase:'A3',caseId,attemptId:plan.runId+'/'+caseId+':1',repetition:1,terminal:null,provider:null,conversation:null}))};
}

async function main(){
 const data=loadScreen(),{plan,manifest}=data,sha=process.env.DIAGNOSTIC_RUN_SOURCE_SHA;
 const output=new URL('evidence.json',directory),temporary=new URL('evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('SCREEN_ALREADY_STARTED');
 const allowed=['evidence.json','evidence.json.tmp'].map(f=>'apps/worker/evals/single-agent-semantic-verifier/two-case-screen-20261014/'+f);
 const check=()=>{assertSealedSource(sha,allowed);assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);assert.equal(hash(readFileSync(vertex)),plan.vertexExecutableHash);};
 check();const client=inspectCodex(),conversationClient=inspectGemini(manifest);
 assert.equal(client.version,manifest.inspectedClient.version);assert.equal(client.binarySha256,manifest.inspectedClient.binarySha256);
 const evidence={schemaVersion:1,runId:plan.runId,scope:plan.scope,fullCheckpointQualification:false,runSourceSha:sha,
  implementationBaseSha:plan.implementationBaseSha,specSha:manifest.specSha,planHash:hash(read('two-case-screen-20261014/plan.json')),
  effectiveManifestHash:hash(JSON.stringify(manifest)),promptHashes:manifest.promptHashes,schemaHash:manifest.schemaHash,models:manifest.models,
  client,conversationClient,startedAt:new Date().toISOString(),attempts:data.attempts};
 console.log(JSON.stringify({status:'SCREEN_PREFLIGHT_PASS',runSourceSha:sha,registered:2,maxGenerations:4}));
 if(process.argv.includes('--preflight'))return;
 const save=()=>publishA2Evidence(evidence,temporary,output,check);save();const gemini=createGeminiInference(manifest);
 await runDiagnostic(data,evidence,(role,request,options)=>role==='conversation'?gemini(request):runCodexModel(manifest,role,request,options),{save,check});
 console.log(JSON.stringify({status:evidence.capacityBlock?'BLOCKED':'SCREEN_COMPLETE_AWAITING_WHOLE_TURN_REVIEW',completed:evidence.attempts.filter(a=>a.terminal).length,registered:2}));
 if(evidence.capacityBlock)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.name==='A2EvidencePersistError'?error.message:'SCREEN_STOPPED_RETAIN_EVIDENCE_NO_RETRY');process.exitCode=1;});
