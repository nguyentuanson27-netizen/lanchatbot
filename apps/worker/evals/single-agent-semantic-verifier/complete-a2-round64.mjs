import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {hash,inputUrl,evidencePath,validateProtocol,preflight} from './protocol.mjs';
import {loadInputs,registerA2Attempts,validateA2Evidence,assertSealedSource} from './run-a2.mjs';
import {runShard} from './run-a2-shards.mjs';import {inspectCodex,runCodexModel} from './codex-inference.mjs';
export function prepareR64Completion(m,a2,p,priorRaw,sha,index){
 const prior=JSON.parse(priorRaw),missing=prior.attempts.filter(a=>!a.terminal&&!a.invocationStartedAt).map(a=>a.attemptId),unknown=prior.attempts.filter(a=>a.invocationStartedAt&&!a.terminal).map(a=>a.attemptId);
 if(m.round!==64||p.round!==64||p.retry!==0||p.noRetryStartedSlots!==true||p.diagnosticOnly!==true||p.maximumGenerationRequestsPerAttempt!==1||p.concurrency!==3||
  !Number.isInteger(index)||index<0||index>2||!/^[a-f0-9]{40}$/.test(sha)||hash(priorRaw)!==p.priorEvidenceHash||prior.a2RunSourceSha!==p.priorRunSourceSha||prior.manifestHash!==p.manifestHash||
  JSON.stringify(prior.attempts.map(a=>a.attemptId))!==JSON.stringify(registerA2Attempts(m,a2).map(a=>a.attemptId))||
  JSON.stringify(missing)!==JSON.stringify(p.missingAttemptIds)||JSON.stringify(unknown)!==JSON.stringify(p.unknownStartedAttemptIds)||p.shards?.length!==3||p.shards.some((s,i)=>s.index!==i)||
  new Set(p.shards.flatMap(s=>s.attemptIds)).size!==missing.length||JSON.stringify(p.shards.flatMap(s=>s.attemptIds).sort())!==JSON.stringify([...missing].sort()))throw new Error('R64_COMPLETION_SCOPE_CHANGED');
 const e=structuredClone(prior);e.a2RunSourceSha=sha;delete e.finishedAt;e.startedAt=new Date().toISOString();
 e.completion={...p,runSourceSha:sha,missingAttemptIds:[...p.shards[index].attemptIds],planHash:hash(JSON.stringify(p,null,2)+'\n')};
 e.shard={index,planHash:e.completion.planHash,attemptIds:[...p.shards[index].attemptIds]};return e;
}
async function main(){
 if(process.env.C3_CHECKPOINT_A_ROUND!=='64')throw new Error('FIXED_R64_REQUIRED');const {manifest:m,a2,a3}=loadInputs();validateProtocol(m,a2,a3);
 const resume=process.argv.includes('--resume-remaining'),priorFile=resume?'a2-completed-evidence.json':'a2-initial-evidence.json';
 const raw=readFileSync(inputUrl(priorFile),'utf8'),p=JSON.parse(readFileSync(inputUrl(resume?'a2-resume-plan.json':'a2-completion-plan.json'),'utf8'));
 validateA2Evidence(m,a2,JSON.parse(raw));const sha=process.env.A2_RUN_SOURCE_SHA,head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),index=Number(process.argv.find(v=>v.startsWith('--shard='))?.slice(8));
 const names=[0,1,2].map(i=>(resume?'a2-resumed-evidence.shard-':'a2-completion-evidence.shard-')+i+'.json'),allowed=names.flatMap(n=>[evidencePath(n),evidencePath(n+'.tmp')]);
 const check=()=>{assertSealedSource(sha,allowed);if(hash(readFileSync(inputUrl(priorFile),'utf8'))!==p.priorEvidenceHash||hash(readFileSync(new URL('../../dist/single-agent-semantic-verifier-boundary.js',import.meta.url)))!==p.boundaryExecutableHash)throw new Error('R64_PRIOR_OR_BOUNDARY_CHANGED');};
 check();preflight(m,'a2',{a2RunSourceSha:sha},head,[]);const e=prepareR64Completion(m,a2,p,raw,sha,index);const output=inputUrl(names[index]),temp=inputUrl(names[index]+'.tmp');if(existsSync(output)||existsSync(temp))throw new Error('R64_COMPLETION_ALREADY_STARTED');
 const client=inspectCodex();if(JSON.stringify(client)!==JSON.stringify(JSON.parse(raw).client))throw new Error('CLIENT_IDENTITY_CHANGED');e.client=client;
 console.log(JSON.stringify({status:'R64_COMPLETION_PREFLIGHT_PASS',a2CompletionRunSourceSha:sha,preserved:p.preservedTerminalCount,unknownStarted:p.unknownStartedAttemptIds.length,assigned:e.shard.attemptIds.length,providerGenerations:0}));if(process.argv.includes('--preflight'))return;
 const save=v=>{check();writeFileSync(temp,JSON.stringify(v,null,2)+'\n');for(let n=0;;n++){try{renameSync(temp,output);break;}catch(error){if(n>=3||!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}}};
 const peer=()=>{for(const name of names){if(name===names[index]||!existsSync(inputUrl(name)))continue;const other=JSON.parse(readFileSync(inputUrl(name),'utf8'));if(other.a2RunSourceSha!==sha||other.shard.planHash!==e.shard.planHash)throw new Error('PEER_IDENTITY_CHANGED');if(other.shard.capacityBlock)return other.shard.capacityBlock;}return null;};
 await runShard(m,a2,e,r=>runCodexModel(m,'verifier',r),{save,checkSource:check,peerCapacity:peer});validateA2Evidence(m,a2,e);
 console.log(JSON.stringify({shard:index,assigned:e.shard.attemptIds.length,completed:e.attempts.filter(a=>e.shard.attemptIds.includes(a.attemptId)&&a.terminal).length,summary:e.summary}));if(e.shard.capacityBlock||e.peerCapacityBlock)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error('R64_COMPLETION_FAILED_CLOSED:'+(['R64_COMPLETION_SCOPE_CHANGED','R64_PRIOR_OR_BOUNDARY_CHANGED','R64_COMPLETION_ALREADY_STARTED','RUN_SOURCE_CHANGED','CLIENT_IDENTITY_CHANGED'].includes(error.message)?error.message:'RETAIN_RAW_AND_TEMP_NO_RETRY'));process.exitCode=1;});
