// Prepare fresh, reviewed source evidence for one diagnostic registration, without inference.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {bindCorpus} from './bind-corpus.mjs';
import {read,write} from './bc-control.mjs';
import {diagnosticRepetitions,diagnosticSlots,diagnosticScope,validateDiagnostic} from './diagnostic.mjs';
import {digest,qualificationIdentity} from './qualification.mjs';
import {assertApprovedDecisions,assertCurrentCandidate} from './source-identity.mjs';
import {assertPopulationReadiness} from './source-readiness.mjs';
import {CONTEXT_BASELINE_SHA} from './sales-context-screen.mjs';

const scopes={
 BASELINE_J2:'TOOL_CONTRACT_SCREEN_20261109',
 CANDIDATE:'SALES_CONTEXT_PRIMARY_20261115',
 CONTROLS:'SALES_CONTEXT_CONTROLS_20261115',
};
const source=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function checkedSource(root,kind,config){
 assert(Object.hasOwn(scopes,kind),'CONTEXT_JOB_KIND');
 assert.equal(source(root,'status','--porcelain'),'','CONTEXT_DIRTY_SOURCE');
 assertApprovedDecisions(root,config);
 const head=source(root,'rev-parse','HEAD');
 if(kind==='BASELINE_J2'){
  assert.equal(head,CONTEXT_BASELINE_SHA,'CONTEXT_BASELINE_SOURCE');
  const module=pathToFileURL(resolve(root,'apps/worker/evals/single-agent-commerce-qualification/source-identity.mjs'));
  (await import(module.href)).assertCurrentCandidate(root,config);
 }else assertCurrentCandidate(root,config);
 return head;
}

export async function prepareContextRegistration({root,kind,template,draft,world,bindings,initial,seed}){
 assert.match(seed,/^[a-f0-9]{64}$/u,'CONTEXT_SEED');
 assert.equal(draft.provenance?.diagnosticScope,scopes[kind],'CONTEXT_JOB_SCOPE');
 const config=structuredClone(template);
 delete config.salesVoiceOfferTerms;
 delete config.salesContextScreen;
 delete config.salesContextPresentation;
 if(kind!=='BASELINE_J2')config.salesContextPresentation=true;
 if(kind==='CANDIDATE')config.salesContextScreen=true;
 config.blinding.seedCommitment=digest(seed);
 const runSourceSha=await checkedSource(root,kind,config);
 assert.equal(initial.sourceSha,runSourceSha,'CONTEXT_INITIAL_SOURCE');
 const corpus=await bindCorpus({draft,world,bindings,initialStateArtifact:initial,diagnosticOpeningMediaRule:config.candidate.openingMediaRule});
 await assertPopulationReadiness(world,corpus,new Date(),config.candidate.openingMediaRule);
 const scope=diagnosticScope(corpus),slots=diagnosticSlots(corpus,diagnosticRepetitions(corpus,config.repetitions));
 const pending={kind:'PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1',status:'REGISTERED_DEVELOPMENT_NOT_QUALIFICATION',scopeHash:digest(scope),
  runSourceSha,registeredAt:new Date().toISOString(),sendEnabled:false,config,identity:qualificationIdentity(config),
  corpus,corpusHash:digest(corpus),worldHash:digest(world),sourceChecks:corpus.scenarios.map(s=>s.diagnosticTrusted),
  initialStateArtifact:initial,initialStateArtifactHash:digest(initial),slots,review:{status:'PENDING',newProviderResultsObserved:0}};
 return pending;
}

export async function sealContextRegistration({root,kind,pending,world,review}){
 assert.equal(pending.review?.status,'PENDING');
 assert.equal(diagnosticScope(pending.corpus).name,scopes[kind],'CONTEXT_JOB_SCOPE');
 assert.equal(pending.runSourceSha,await checkedSource(root,kind,pending.config),'CONTEXT_SOURCE_CHANGED');
 assert(review.status==='APPROVED'&&review.pendingRegistrationHash===digest(pending)&&
  review.newProviderResultsObserved===0&&review.reviewer&&review.evidenceRef,'CONTEXT_INPUT_REVIEW');
 const sealed={...pending,review:{...review,corpusHash:pending.corpusHash,worldHash:digest(world),sourceChecksHash:digest(pending.sourceChecks)}};
 validateDiagnostic(sealed,world);
 await assertPopulationReadiness(world,sealed.corpus,new Date(),sealed.config.candidate.openingMediaRule);
 return sealed;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const {positionals:[command],values:v}=parseArgs({allowPositionals:true,options:{
  root:{type:'string',default:process.cwd()},kind:{type:'string'},template:{type:'string'},draft:{type:'string'},world:{type:'string'},
  bindings:{type:'string'},initial:{type:'string'},seed:{type:'string'},pending:{type:'string'},review:{type:'string'},out:{type:'string'},
 }});
 const args={root:v.root,kind:v.kind,world:read(v.world)};
 let result;
 if(command==='prepare'){
  const template=read(v.template);
  // Reuse the approved decisions and configuration, bind the executable identity to each clean worktree.
  const module=pathToFileURL(resolve(v.root,'apps/worker/evals/single-agent-commerce-qualification/source-identity.mjs'));
  const config={...template.config??template,candidate:(await import(module.href)).currentCandidate(v.root)};
  result=await prepareContextRegistration({...args,template:config,draft:read(v.draft),bindings:read(v.bindings),initial:read(v.initial),seed:read(v.seed).seed});
 }else if(command==='seal')result=await sealContextRegistration({...args,pending:read(v.pending),review:read(v.review)});
 else throw Error('CONTEXT_REGISTRATION_COMMAND');
 write(v.out,result);
 console.log(JSON.stringify({hash:digest(result),slots:result.slots.length,providerRequests:0}));
}
