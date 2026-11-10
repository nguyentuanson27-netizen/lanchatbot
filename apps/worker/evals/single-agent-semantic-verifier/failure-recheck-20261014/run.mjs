import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {hash,validateProtocol} from '../protocol.mjs';
import {evaluateA2Attempt,assertSealedSource,providerCapacityExhausted} from '../run-a2.mjs';
import {evaluateA3Attempt} from '../run-a3.mjs';
import {publishA2Evidence} from '../run-a2-shards.mjs';
import {inspectCodex,runCodexModel} from '../codex-inference.mjs';
import {inspectGemini,createGeminiInference} from '../gemini-inference.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file));
const directory=new URL('./',import.meta.url);
const boundary=new URL('../../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url);
const vertex=new URL('../../../dist/vertex.js',import.meta.url);

export function loadDiagnostic(proposedPlan) {
 const plan=json('failure-recheck-20261014/plan.json');
 if(proposedPlan)assert.deepEqual(proposedPlan,plan);
 assert.equal(plan.runId,'R67_FAILURE_RECHECK_20261014_01');
 assert.equal(plan.fullCheckpointQualification,false);assert.equal(plan.repetitions,1);assert.equal(plan.retries,0);
 for(const [file,expected] of Object.entries(plan.frozenFiles))assert.equal(hash(read(file)),expected);
 const base=json('round-67/manifest.json'),allA2=json('round-67/corpus-a2.json'),allA3=json('round-67/corpus-a3.json');
 validateProtocol(base,allA2,allA3);
 assert.deepEqual(plan.models,base.models);assert.equal(plan.verifierPromptHash,base.promptHashes.verifier);
 const priorA2=json('round-67/a2-evidence.json'),priorA3=json('round-67/a3-evidence.json'),scores=json('round-67/a3-primary-scores.json');
 const failures=priorA2.attempts.filter(a=>a.expected==='SAFE'&&a.terminal?.disposition!=='SEND_ELIGIBLE');
 const unsafe=priorA3.attempts.filter(a=>a.terminal?.disposition==='SEND_ELIGIBLE'&&scores.attempts.find(s=>s.attemptId===a.attemptId)?.scores.factualActionSafety<2);
 const fallback=priorA3.attempts.filter(a=>a.terminal?.disposition==='FALLBACK');
 assert.deepEqual(plan.a2CaseIds,failures.map(a=>a.caseId));
 assert.deepEqual(plan.a3CaseIds,[...unsafe,...fallback].map(a=>a.caseId));
 assert.deepEqual(plan.sourceA2Attempts,failures.map(a=>a.attemptId));
 assert.deepEqual(plan.sourceA3Attempts,[...unsafe,...fallback].map(a=>a.attemptId));
 assert.deepEqual(plan.denominator,{a2:3,a3:8,total:11,maximumGenerationRequests:19});
 const manifest=structuredClone(base),prompt=read(plan.ownerPrompt.file);
 assert.equal(hash(prompt),plan.ownerPrompt.hash);
 assert.equal(plan.ownerPrompt.hash,'d77cf63c96522bbfd5e900458f5969d2020d69d723c8cbd88344e0d02e3f9acf');
 manifest.prompts.conversation=prompt;manifest.promptHashes.conversation=hash(prompt);
 const expected=[...plan.a2CaseIds.map(caseId=>({phase:'A2',caseId})),...plan.a3CaseIds.map(caseId=>({phase:'A3',caseId}))]
  .map(a=>({...a,attemptId:plan.runId+'/'+a.phase+'/'+a.caseId+':1',repetition:1}));
 assert.deepEqual(plan.registeredAttempts,expected);
 const select=(corpus,ids)=>({schemaVersion:corpus.schemaVersion,cases:ids.map(id=>{const c=corpus.cases.find(f=>f.evaluator.caseId===id);assert.ok(c);return c;})});
 return {plan,manifest,a2:select(allA2,plan.a2CaseIds),a3:select(allA3,plan.a3CaseIds),
  attempts:expected.map(a=>({...a,...(a.phase==='A2'?{expected:'SAFE'}:{}),terminal:null,provider:null,conversation:null}))};
}

// Fixed diagnostic cohort only. Reuse the existing exact-text evaluators and final gate.
export async function runDiagnostic({manifest,a2,a3},evidence,generate,{save,check}) {
 if(evidence.finishedAt||evidence.attempts.some(a=>a.dispatchStartedAt))throw new Error('DIAGNOSTIC_ALREADY_STARTED');
 for(const slot of evidence.attempts){
  check();slot.dispatchStartedAt=new Date().toISOString();save();
  const invoke=async(role,request)=>{
   check();const key=role+'DispatchStartedAt';if(slot[key])throw new Error('ROLE_ALREADY_STARTED');
   slot[key]=new Date().toISOString();slot[role+'RequestBody']=request;save();
   const provider=await generate(role,request,{onCheckpoint:checkpoint=>{slot.transportCheckpoint={role,...checkpoint};save();}});
   if(role==='conversation'){slot.conversation=provider;save();}
   return provider;
  };
  const fixture=(slot.phase==='A2'?a2:a3).cases.find(c=>c.evaluator.caseId===slot.caseId);assert.ok(fixture);
  const result=slot.phase==='A2'
   ? await evaluateA2Attempt(manifest,fixture,request=>invoke('verifier',request))
   : await evaluateA3Attempt(manifest,fixture,invoke);
  Object.assign(slot,result);delete slot.transportCheckpoint;save();
  const providers=slot.phase==='A2'?[slot.provider]:[slot.conversation,slot.verification?.provider];
  if(providers.some(p=>providerCapacityExhausted(manifest,p)||p?.error==='VERTEX_AUTH_FAILED')){
   evidence.capacityBlock={attemptId:slot.attemptId};break;
  }
 }
 evidence.finishedAt=new Date().toISOString();save();return evidence;
}

async function main(){
 const data=loadDiagnostic(),{plan,manifest}=data,sha=process.env.DIAGNOSTIC_RUN_SOURCE_SHA;
 const output=new URL('evidence.json',directory),temporary=new URL('evidence.json.tmp',directory);
 if(existsSync(output)||existsSync(temporary))throw new Error('DIAGNOSTIC_ALREADY_STARTED');
 const allowed=['evidence.json','evidence.json.tmp'].map(file=>'apps/worker/evals/single-agent-semantic-verifier/failure-recheck-20261014/'+file);
 const check=()=>{assertSealedSource(sha,allowed);
  assert.equal(hash(readFileSync(boundary)),plan.boundaryExecutableHash);assert.equal(hash(readFileSync(vertex)),plan.vertexExecutableHash);};
 check();
 const client=inspectCodex(),conversationClient=inspectGemini(manifest),base=json('round-67/manifest.json');
 assert.equal(client.version,base.inspectedClient.version);assert.equal(client.binarySha256,base.inspectedClient.binarySha256);
 const evidence={schemaVersion:1,runId:plan.runId,scope:plan.scope,fullCheckpointQualification:false,runSourceSha:sha,
  implementationBaseSha:plan.implementationBaseSha,specSha:manifest.specSha,planHash:hash(read('failure-recheck-20261014/plan.json')),
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
