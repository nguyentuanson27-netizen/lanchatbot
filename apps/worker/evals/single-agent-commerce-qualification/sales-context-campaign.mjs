import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {digest} from './qualification.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const kinds=['BASELINE_J2','CANDIDATE','CONTROLS'];

export function assertContextReplayAuthority(score,decision){
 assert.equal(score.stage,'CONTEXT');
 if(decision===undefined){
  assert.equal(score.status,'PASS','CONTEXT_REPLAY_NOT_PASSED');
  return;
 }
 assert.equal(score.status,'STOP','CONTEXT_OVERRIDE_REQUIRES_STOP');
 assert(decision.kind==='OWNER_REQUESTED_NATIVE_DIAGNOSTIC'&&
  decision.replayScoreHash===digest(score)&&decision.replaySourceSha===score.sourceSha&&
  /^[a-f0-9]{40}$/u.test(decision.nativeSourceSha)&&typeof decision.evidenceRef==='string'&&decision.evidenceRef.trim()&&
  decision.qualificationEligible===false,'CONTEXT_OVERRIDE_BINDING');
}

/** The same campaign is rechecked at preflight and immediately before each generation. */
export function checkedContextJob({campaign,seal,kind,registration,world,score,source}){
 assert.equal(digest(campaign),seal,'CONTEXT_CAMPAIGN_SEAL');
 assert(kinds.includes(kind),'CONTEXT_JOB_KIND');
 assert.equal(campaign.kind,'SALES_CONTEXT_NATIVE_CAMPAIGN');
 assert.equal(campaign.replayScoreHash,digest(score),'CONTEXT_REPLAY_SCORE_CHANGED');
 assertContextReplayAuthority(score,campaign.ownerDecision);
 if(campaign.ownerDecision&&kind!=='BASELINE_J2')assert.equal(campaign.ownerDecision.nativeSourceSha,source,'CONTEXT_OVERRIDE_SOURCE');
 assert.equal(campaign.worldHash,digest(world),'CONTEXT_WORLD_CHANGED');
 const job=campaign.jobs.find(j=>j.kind===kind);
 assert(job&&job.source===source&&registration.runSourceSha===source,'CONTEXT_JOB_SOURCE');
 assert.equal(job.registrationHash,digest(registration),'CONTEXT_JOB_REGISTRATION');
 assert.equal(registration.worldHash,campaign.worldHash);
 assert(registration.slots.every(s=>s.mode!=='SAFETY'),'CONTEXT_NATIVE_NO_PROBES');
 assert.deepEqual(campaign.jobs.map(j=>[j.kind,j.turns,j.maximumGenerationRequests]),
  [['BASELINE_J2',15,60],['CANDIDATE',45,180],['CONTROLS',6,24]],'CONTEXT_CAMPAIGN_CAP');
 const expectedSlots=kind==='BASELINE_J2'?5:kind==='CANDIDATE'?25:4;
 assert.equal(job.slotIds.length,expectedSlots);assert.equal(new Set(job.slotIds).size,expectedSlots);
 const selected=job.slotIds.map(id=>registration.slots.find(s=>s.slotId===id));
 assert(selected.every(s=>s?.arm==='CANDIDATE'&&s.mode!=='SAFETY'),'CONTEXT_JOB_SLOTS');
 if(kind==='BASELINE_J2')assert(selected.every(s=>s.caseId==='c-20261028-j2')&&
  selected.map(s=>s.repetition).sort().join(',')==='1,2,3,4,5','CONTEXT_BASELINE_J2_ONLY');
 assert.equal(selected.reduce((n,s)=>n+registration.corpus.scenarios.find(c=>c.id===s.caseId).turns.length,0),job.turns);
 if(campaign.targetedRerun){
  const rerun=campaign.targetedRerun;
  assert(kind!=='BASELINE_J2'&&rerun.kind==='OWNER_REQUESTED_FAILED_CASE_RERUN'&&
   typeof rerun.evidenceRef==='string'&&rerun.evidenceRef.trim()&&/^[a-f0-9]{64}$/u.test(rerun.parentCampaignHash),
   'CONTEXT_RERUN_AUTHORITY');
  const choices=rerun.selection[kind];
  assert(Array.isArray(choices)&&choices.length>0&&choices.every(c=>typeof c.caseId==='string'&&Number.isInteger(c.repetition)),
   'CONTEXT_RERUN_SELECTION');
  const slots=choices.map(c=>selected.find(s=>s.caseId===c.caseId&&s.repetition===c.repetition));
  assert(slots.every(Boolean)&&new Set(slots.map(s=>s.slotId)).size===slots.length,'CONTEXT_RERUN_SELECTION');
  const turns=slots.reduce((n,s)=>n+registration.corpus.scenarios.find(c=>c.id===s.caseId).turns.length,0);
  return {...job,slotIds:slots.map(s=>s.slotId),turns,maximumGenerationRequests:turns*4,targetedRerun:true};
 }
 return job;
}
export function contextGenerationGuard({load,registration,world,source}){
 const check=()=>checkedContextJob({...load(),registration,world,source});
 const job=check(),selected=new Set(job.slotIds);
 return {job,check,beforeGeneration({generations,active,role}){
  const current=check();assert.equal(digest(current),digest(job),'CONTEXT_JOB_CHANGED');
  assert(active&&selected.has(active.slotId),'CONTEXT_UNREGISTERED_SLOT');
  assert(generations.every(g=>selected.has(g.slotId)),'CONTEXT_UNREGISTERED_HISTORY');
  assert(generations.length<job.maximumGenerationRequests,'CONTEXT_JOB_CAP');
  assert(['OWNER','VERIFIER'].includes(role),'CONTEXT_JOB_ROLE');
  const same=generations.filter(g=>g.slotId===active.slotId&&g.turnIndex===active.turnIndex&&g.role===role);
  assert(same.length<(role==='OWNER'?3:1),'CONTEXT_JOB_ROLE_CAP');
 }};
}
export function loadContextProof(proof){
 assert(proof?.campaignPath&&proof.scorePath&&proof.seal&&proof.kind,'CONTEXT_CAMPAIGN_REQUIRED');
 return {campaign:read(proof.campaignPath),seal:proof.seal,kind:proof.kind,score:read(proof.scorePath)};
}
export function claimContextNative(proof,registration,world,source){
 const job=checkedContextJob({...loadContextProof(proof),registration,world,source});
 const claim=resolve(dirname(resolve(proof.campaignPath)),
  'CONTEXT_'+proof.seal+'_'+proof.kind+'.generation-dispatch.json');
 writeFileSync(claim,JSON.stringify({campaignSeal:proof.seal,job:proof.kind,registrationHash:digest(registration),source,
  slotIds:job.slotIds,maximumGenerationRequests:job.maximumGenerationRequests})+'\n',{flag:'wx'});
 return claim;
}

/** Run an immutable native entrypoint with exactly the job's selected slots.
 * Pinned baseline code already limits each selected turn to owner3/verifier1.
 * The wrapper provides its only slot input, so its five J2 slots have a hard maximum of60.
 */
export function contextNativeInvocation({proof,registrationPath,worldPath,sourceRoot,out,seedPath,slotFile,paymentMethod='COD'}){
 const script=resolve(sourceRoot,'apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs');
 const args=[script,resolve(out),paymentMethod,'--phase-c-diagnostic-registration',resolve(registrationPath),
  '--phase-c-world',resolve(worldPath),'--phase-c-slot-ids',slotFile,'--phase-c-seed',resolve(seedPath)];
 if(proof.kind!=='BASELINE_J2')args.push('--sales-context-campaign',resolve(proof.campaignPath),'--sales-context-seal',proof.seal,
  '--sales-context-job',proof.kind,'--sales-context-score',resolve(proof.scorePath));
 return args;
}

export function dispatchContextNative({proof,registrationPath,worldPath,sourceRoot,out,seedPath,paymentMethod='COD'}){
 const registration=read(registrationPath),world=read(worldPath),source=execFileSync('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8'}).trim();
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:sourceRoot,encoding:'utf8'}).trim(),'','CONTEXT_DIRTY_SOURCE');
 const job=checkedContextJob({...loadContextProof(proof),registration,world,source});
 assert.equal(digest(read(seedPath).seed),registration.config.blinding.seedCommitment,'CONTEXT_NATIVE_SEED');
 assert(['COD','BANK_TRANSFER'].includes(paymentMethod));
 assert(!existsSync(out),'NEW_EVIDENCE_DIRECTORY_REQUIRED');
 const prefix=resolve(dirname(resolve(proof.campaignPath)),'CONTEXT_'+proof.seal+'_'+proof.kind);
 const claim=prefix+'.wrapper-dispatch.json',slotFile=prefix+'.slots.json';
 writeFileSync(claim,JSON.stringify({campaignSeal:proof.seal,kind:proof.kind,registrationHash:digest(registration),source,
  maximumGenerationRequests:job.maximumGenerationRequests,slotIds:job.slotIds})+'\n',{flag:'wx'});
 writeFileSync(slotFile,JSON.stringify(job.slotIds)+'\n',{flag:'wx'});
 if(proof.kind==='BASELINE_J2')claimContextNative(proof,registration,world,source);
 const args=contextNativeInvocation({proof,registrationPath,worldPath,sourceRoot,out,seedPath,slotFile,paymentMethod});
 // No generation retry or automatic second dispatch after an interrupted process.
 execFileSync(process.execPath,args,{cwd:sourceRoot,stdio:'inherit',env:process.env});
 const journal=resolve(out,'NATIVE_REQUESTS.jsonl');
 const rows=readFileSync(journal,'utf8').trim().split(/\r?\n/).map(JSON.parse);
 const starts=rows.filter(r=>r.phase==='STARTED').map(r=>r.value);
 assert(starts.every(g=>job.slotIds.includes(g.slotId))&&starts.length<=job.maximumGenerationRequests,'CONTEXT_ACTUAL_JOB_CAP');
 writeFileSync(resolve(out,'CONTEXT_ACCOUNTING.json'),JSON.stringify({kind:proof.kind,registeredSlots:job.slotIds.length,
  generationAttempts:starts.length,maximumGenerationRequests:job.maximumGenerationRequests,source,campaignSeal:proof.seal})+'\n',{flag:'wx'});
}
