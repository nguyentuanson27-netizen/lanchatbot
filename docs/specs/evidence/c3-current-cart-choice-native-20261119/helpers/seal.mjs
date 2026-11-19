import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
const root=process.argv[2],repo=process.cwd(),q='apps/worker/evals/single-agent-commerce-qualification/';
const mod=name=>import(pathToFileURL(resolve(q,name)).href);
const {read,write,digest}=await mod('bc-control.mjs');
const {prepareContextRegistration,sealContextRegistration}=await mod('sales-context-registration.mjs');
const {currentCandidate}=await mod('source-identity.mjs');
const {diagnosticPreflight}=await mod('diagnostic.mjs');
const parent=resolve('..','c3-sales-context-native-9a65450f-20261115-151018');
const worldPath=resolve(root,'world/WORLD.json'),world=read(worldPath),initial=read(resolve(root,'initial/INITIAL_STATE.json'));
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(source,'48a27a1b39e8976face273a57983f91c8ad74cc2');
assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
const originalCampaign=read(resolve(parent,'NATIVE_CAMPAIGN.json')),score=read(resolve(parent,'INPUTS.json')).score;
const priorConfig=read(resolve(parent,'CANDIDATE/REGISTRATION.json')).config;
const decisions=read(resolve(q,'owner-decisions.json'));
const template={...priorConfig,candidate:currentCandidate(repo),
 ownerDecision:{...priorConfig.ownerDecision,decisionHash:digest(decisions)}};
const masterSeed=randomBytes(32).toString('hex'),jobs=[],preflights=[],registrations={};
const ownerRequest="Owner 2026-11-19: run independently approved current-cart benefit and purchase-choice repair; J4 x5 and two-shirt control x5 from first turn; all terminal outcomes retained; one review after completion";
for(let batch=1;batch<=5;batch++){
 const group=resolve(root,'batch-'+batch);mkdirSync(group);
 const seed=createHash('sha256').update(masterSeed+':'+batch).digest('hex');
 write(resolve(group,'PRIVATE_BLIND_SEED.json'),{seed});
 for(const kind of batch===1?['CANDIDATE','CONTROLS']:['CONTROLS']){
  const home=resolve(group,kind);mkdirSync(home);
  const draft=read(resolve(root,kind+'-DRAFT.json')),bindings=read(resolve(parent,kind,'BINDINGS.json'));
  bindings.review={...bindings.review,worldHash:digest(world),newProviderResultsObserved:0,
   reviewer:'Codex input review',evidenceRef:ownerRequest+'; fresh public source and current initial state'};
  const pending=await prepareContextRegistration({root:repo,kind,template,draft,world,bindings,initial,seed});
  const review={status:'APPROVED',pendingRegistrationHash:digest(pending),newProviderResultsObserved:0,
   reviewer:'Codex author input review',evidenceRef:ownerRequest};
  const reg=await sealContextRegistration({root:repo,kind,pending,world,review});
  write(resolve(home,'REGISTRATION.json'),reg);write(resolve(home,'INPUT_REVIEW.json'),review);
  registrations[batch+':'+kind]=reg;
 }
 const campaign=structuredClone(originalCampaign);campaign.worldHash=digest(world);
 campaign.ownerDecision={...campaign.ownerDecision,nativeSourceSha:source,evidenceRef:ownerRequest};
 campaign.targetedRerun={kind:'OWNER_REQUESTED_FAILED_CASE_RERUN',parentCampaignHash:digest(originalCampaign),
  evidenceRef:ownerRequest+'; control independent batch '+batch,qualificationEligible:false,selection:{
   CANDIDATE:[1,2,3,4,5].map(repetition=>({caseId:'c-20261028-j4',repetition})),
   CONTROLS:[{caseId:'c-context-two-units',repetition:1}]}};
 for(const kind of ['CANDIDATE','CONTROLS']){
  const reg=registrations[(kind==='CANDIDATE'?1:batch)+':'+kind],job=campaign.jobs.find(j=>j.kind===kind);
  job.source=source;job.registrationHash=digest(reg);job.slotIds=reg.slots.map(s=>s.slotId);
 }
 const campaignPath=resolve(group,'CAMPAIGN.json'),seal=digest(campaign);write(campaignPath,campaign);
 for(const kind of batch===1?['CANDIDATE','CONTROLS']:['CONTROLS']){
  const registrationPath=resolve(group,kind,'REGISTRATION.json');
  const pre=diagnosticPreflight(repo,registrationPath,worldPath,{campaignPath,seal,kind,scorePath:score});
  const job=pre.contextJob;
  const entry={batch,kind,externalRepetition:kind==='CONTROLS'?batch:null,
   registrationPath,registrationHash:digest(registrations[batch+':'+kind]),campaignPath,seal,score,world:worldPath,
   seedPath:resolve(group,'PRIVATE_BLIND_SEED.json'),out:resolve(group,kind,'native'),
   selectedSlots:job.slotIds,turns:job.turns,maximumGenerationRequests:job.maximumGenerationRequests,source};
  jobs.push(entry);preflights.push({batch,kind,slots:job.slotIds.length,turns:job.turns,cap:job.maximumGenerationRequests});
 }
}
assert.equal(jobs.length,6);assert.equal(preflights.reduce((n,j)=>n+j.slots,0),10);
assert.equal(preflights.reduce((n,j)=>n+j.turns,0),30);
assert.equal(jobs.reduce((n,j)=>n+j.maximumGenerationRequests,0),120);
const plan={kind:'OWNER_REQUESTED_NATIVE_J4_AND_TWO_SHIRTS_N5',registeredAt:new Date().toISOString(),source,
 world:worldPath,worldHash:digest(world),models:template.candidate,ownerRequest,
 repetitions:{'c-20261028-j4':5,'c-context-two-units':5},maximumNativeGenerationRequests:120,
 maximumJudgeGenerationRequests:10,controlRepetitionAccounting:'FIVE_DISTINCT_REGISTRATIONS_EACH_EXISTING_CONTROL_N1',
 jobs,providerRequests:0};
write(resolve(root,'RUN_PLAN.json'),plan);write(resolve(root,'PREFLIGHT.json'),{source,worldHash:digest(world),checks:preflights,providerRequests:0});
console.log(JSON.stringify({source,attempts:10,turns:30,cap:120,preflight:'PASS'}));
