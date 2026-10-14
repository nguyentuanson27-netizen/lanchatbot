import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {hash,inputUrl,evidencePath,validateProtocol,preflight} from './protocol.mjs';
import {loadInputs,registerA2Attempts,evaluateA2Attempt,summarizeA2,operational,assertSealedSource,validateA2Evidence,providerCapacityExhausted} from './run-a2.mjs';
import {inspectCodex,runCodexModel} from './codex-inference.mjs';

// Fixed Round64 evaluation orchestration only; no semantic interpretation.
export function publishA2Evidence(value,temporary,output,checkSource,{write=writeFileSync,rename=renameSync,
 pause=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)}={}) {
 checkSource();
 const failed=(stage,error)=>Object.assign(new Error('A2_EVIDENCE_PERSIST_FAILED:'+stage+':'+
  (['EPERM','EACCES','EBUSY','ENOSPC','ENOENT','EIO','EROFS','EMFILE','ENFILE'].includes(error.code)?error.code:'OTHER')),{name:'A2EvidencePersistError'});
 try{write(temporary,JSON.stringify(value,null,2)+'\n');}catch(error){throw failed('WRITE',error);}
 // Retry publication of these exact bytes only; never retry a generation.
 for(let n=0;;n++){
  try{rename(temporary,output);return;}catch(error){
   if(n>=3||!['EPERM','EACCES','EBUSY'].includes(error.code))throw failed('PUBLISH',error);
   pause(50);
  }
 }
}

export function prepareShard(manifest,a2,plan,sourceSha,index) {
 const attempts=registerA2Attempts(manifest,a2),ids=attempts.map(a=>a.attemptId);
 if(manifest.round!==64||plan.round!==64||plan.phase!=='A2'||plan.concurrency!==3||plan.maximumGenerationRequestsPerAttempt!==1||plan.retry!==0||
  plan.fullCorpusDiagnosticAfterHardFail!==true||plan.a3RequiresFullA2Pass!==true||!Number.isInteger(index)||index<0||index>2||!/^[a-f0-9]{40}$/.test(sourceSha)||
  hash(JSON.stringify(plan,null,2)+'\n')!==manifest.a2ShardPlan.sha256||plan.registeredDenominator!==ids.length||JSON.stringify(plan.registeredAttemptIds)!==JSON.stringify(ids)||
  plan.shards?.length!==3||plan.shards.some((s,i)=>s.index!==i)||new Set(plan.shards.flatMap(s=>s.attemptIds)).size!==ids.length||
  JSON.stringify(plan.shards.flatMap(s=>s.attemptIds).sort())!==JSON.stringify([...ids].sort()))throw new Error('A2_SHARD_SCOPE_CHANGED');
 return {schemaVersion:1,phase:'A2',a2RunSourceSha:sourceSha,implementationBaseSha:manifest.implementationBaseSha,specSha:manifest.specSha,
  manifestHash:hash(JSON.stringify(manifest,null,2)+'\n'),corpusHash:manifest.corpusHashes.a2,promptHash:manifest.promptHashes.verifier,schemaHash:manifest.schemaHash,
  models:manifest.models,boundaryExecutableHash:plan.boundaryExecutableHash,startedAt:new Date().toISOString(),
  shard:{index,planHash:manifest.a2ShardPlan.sha256,attemptIds:[...plan.shards[index].attemptIds]},attempts,summary:null};
}

export async function runShard(manifest,a2,evidence,generate,{save,checkSource,peerCapacity=()=>null,log=console.log,stopOnUnsafePass=false}) {
 if(evidence.finishedAt)throw new Error('A2_SHARD_ALREADY_ATTEMPTED');
 const update=()=>{evidence.summary=summarizeA2(manifest,evidence.attempts);evidence.operational=operational(evidence.attempts);save(evidence);};
 update();
 for(const id of evidence.shard.attemptIds){
  checkSource();const peer=peerCapacity();if(peer){evidence.peerCapacityBlock=peer;break;}
  const attempt=evidence.attempts.find(a=>a.attemptId===id);
  if(attempt.terminal||attempt.invocationStartedAt)throw new Error('A2_SHARD_ALREADY_ATTEMPTED');
  attempt.originRunSourceSha=evidence.a2RunSourceSha;attempt.invocationStartedAt=new Date().toISOString();update();
  const onCheckpoint=checkpoint=>{
   attempt.transportCheckpoint=checkpoint;
   if(checkpoint.phase==='RESULT'&&providerCapacityExhausted(manifest,checkpoint.provider))evidence.shard.capacityBlock={attemptId:id,role:'verifier',providerErrorCode:checkpoint.provider.providerErrorCode,httpStatus:checkpoint.provider.httpStatus??null};
   update();
  };
  Object.assign(attempt,await evaluateA2Attempt(manifest,a2.cases.find(c=>c.evaluator.caseId===attempt.caseId),request=>generate(request,{onCheckpoint})));
  delete attempt.transportCheckpoint;
  if(providerCapacityExhausted(manifest,attempt.provider))evidence.shard.capacityBlock={attemptId:id,role:'verifier',providerErrorCode:attempt.provider.providerErrorCode,httpStatus:attempt.provider.httpStatus??null};
  update();log(JSON.stringify({shard:evidence.shard.index,attemptId:id,precheck:attempt.precheck,provider:attempt.provider?.status??null,
   outcome:attempt.terminal.disposition,reason:attempt.terminal.reason,requests:attempt.provider?.providerRequests??0,qualification:evidence.summary.status}));
  // Any unsafe eligible PASS remains hard FAIL. Explicit full-corpus authorization
  // permits remaining A2 diagnosis; this function never dispatches A3.
  if(evidence.shard.capacityBlock||stopOnUnsafePass&&attempt.expected==='UNSAFE'&&attempt.terminal.disposition==='SEND_ELIGIBLE')break;
 }
 evidence.finishedAt=new Date().toISOString();update();return evidence;
}

export function mergeShards(manifest,a2,plan,shards,sourceSha) {
 if(shards.length!==3)throw new Error('A2_SHARD_SCOPE_CHANGED');
 const combined=prepareShard(manifest,a2,plan,sourceSha,0),fresh=registerA2Attempts(manifest,a2),seen=new Set();
 delete combined.shard;
 for(const e of shards){const i=e.shard?.index;if(!Number.isInteger(i)||i<0||i>2||seen.has(i)||!e.finishedAt||e.a2RunSourceSha!==sourceSha||
  e.shard.planHash!==manifest.a2ShardPlan.sha256||e.boundaryExecutableHash!==plan.boundaryExecutableHash||JSON.stringify(e.shard.attemptIds)!==JSON.stringify(plan.shards[i].attemptIds))throw new Error('A2_SHARD_SCOPE_CHANGED');
  seen.add(i);validateA2Evidence(manifest,a2,e);const assigned=new Set(plan.shards[i].attemptIds);
  const own=plan.shards[i].attemptIds.map(id=>e.attempts.find(a=>a.attemptId===id)),done=own.filter(a=>a.terminal).length,block=e.shard.capacityBlock,stop=own[done-1];
  if(own.slice(0,done).some(a=>!a.terminal)||own.slice(done).some(a=>a.terminal||a.invocationStartedAt)||
   block&&(!providerCapacityExhausted(manifest,stop?.provider)||block.attemptId!==stop.attemptId||block.role!=='verifier'||block.providerErrorCode!==stop.provider.providerErrorCode))throw new Error('A2_SHARD_CAPACITY_ACCOUNTING');
  for(let n=0;n<fresh.length;n++){const old=fresh[n],now=e.attempts[n];
   if(!assigned.has(old.attemptId)){if(JSON.stringify(now)!==JSON.stringify(old))throw new Error('A2_UNASSIGNED_ATTEMPT_CHANGED');continue;}
   for(const key of ['attemptId','caseId','repetition','expected','finalDraft','finalDraftHash'])if(now[key]!==old[key])throw new Error('A2_REGISTERED_ATTEMPT_CHANGED');
   if((now.terminal||now.invocationStartedAt)&&(now.originRunSourceSha!==sourceSha||!now.invocationStartedAt))throw new Error('A2_DISPATCH_ACCOUNTING_CHANGED');
   combined.attempts[n]=structuredClone(now);
  }
 }
 combined.startedAt=shards.map(s=>s.startedAt).sort()[0];combined.finishedAt=shards.map(s=>s.finishedAt).sort().at(-1);
 combined.shardRuns=shards.map(s=>({index:s.shard.index,finishedAt:s.finishedAt,capacityBlock:s.shard.capacityBlock??null,peerCapacityBlock:s.peerCapacityBlock??null}));
 combined.client=shards[0].client??null;combined.summary=summarizeA2(manifest,combined.attempts);combined.operational=operational(combined.attempts);
 validateA2Evidence(manifest,a2,combined);return combined;
}

async function main(){
 if(process.env.C3_CHECKPOINT_A_ROUND!=='64')throw new Error('FIXED_A2_ROUND_REQUIRED');
 const {manifest,a2,a3}=loadInputs();validateProtocol(manifest,a2,a3);
 const plan=JSON.parse(readFileSync(inputUrl('a2-shard-plan.json'),'utf8'));
 const sourceSha=process.env.A2_RUN_SOURCE_SHA,head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const index=Number(process.argv.find(a=>a.startsWith('--shard='))?.slice(8));
 const names=[0,1,2].map(i=>'a2-evidence.shard-'+i+'.json'),allowed=names.flatMap(n=>[evidencePath(n),evidencePath(n+'.tmp')]);
 const checkSource=()=>{assertSealedSource(sourceSha,allowed);if(hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url)))!==plan.boundaryExecutableHash)throw new Error('BOUNDARY_EXECUTABLE_CHANGED');};
 checkSource();preflight(manifest,'a2',{a2RunSourceSha:sourceSha},head,[]);
 const e=prepareShard(manifest,a2,plan,sourceSha,index),output=inputUrl(names[index]),temporary=inputUrl(names[index]+'.tmp');
 if(existsSync(output)||existsSync(temporary))throw new Error('A2_SHARD_EVIDENCE_ALREADY_EXISTS');
 const client=inspectCodex();if(client.version!==manifest.inspectedClient.version||client.binarySha256!==manifest.inspectedClient.binarySha256)throw new Error('CLIENT_IDENTITY_CHANGED');
 e.client=client;
 console.log(JSON.stringify({status:'A2_SHARD_PREFLIGHT_PASS',a2RunSourceSha:sourceSha,shard:index,registered:plan.registeredDenominator,assigned:e.shard.attemptIds.length,providerGenerationRequests:0}));
 if(process.argv.includes('--preflight'))return;
 const save=value=>publishA2Evidence(value,temporary,output,checkSource);
 const peerCapacity=()=>{for(const name of names){if(name===names[index]||!existsSync(inputUrl(name)))continue;const peer=JSON.parse(readFileSync(inputUrl(name),'utf8'));if(peer.a2RunSourceSha!==sourceSha||peer.shard?.planHash!==manifest.a2ShardPlan.sha256)throw new Error('PEER_RUN_IDENTITY_CHANGED');if(peer.shard.capacityBlock)return peer.shard.capacityBlock;}return null;};
 await runShard(manifest,a2,e,(request,options)=>runCodexModel(manifest,'verifier',request,options),{save,checkSource,peerCapacity});
 validateA2Evidence(manifest,a2,e);
 const own=e.attempts.filter(a=>e.shard.attemptIds.includes(a.attemptId));
 console.log(JSON.stringify({shard:index,assigned:own.length,executed:own.filter(a=>a.terminal).length,unsafeSendEligibleFalsePassCount:own.filter(a=>a.expected==='UNSAFE'&&a.terminal?.disposition==='SEND_ELIGIBLE').length,safeFailures:own.filter(a=>a.expected==='SAFE'&&a.terminal&&a.terminal.disposition!=='SEND_ELIGIBLE').length,operational:operational(own)}));
 if(own.some(a=>!a.terminal||a.expected==='UNSAFE'&&a.terminal.disposition==='SEND_ELIGIBLE')||e.shard.capacityBlock||e.peerCapacityBlock)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
 console.error(error.name==='A2EvidencePersistError'||['A2_SHARD_SCOPE_CHANGED','A2_SHARD_ALREADY_ATTEMPTED','A2_SHARD_EVIDENCE_ALREADY_EXISTS','RUN_SOURCE_CHANGED','BOUNDARY_EXECUTABLE_CHANGED','CLIENT_IDENTITY_CHANGED','PEER_RUN_IDENTITY_CHANGED'].includes(error.message)?error.message:'A2_SHARD_FAILED_CLOSED; retain dispatched evidence');process.exitCode=1;
});
