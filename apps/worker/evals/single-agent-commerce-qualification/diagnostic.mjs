// One approved development batch only. Never a qualification registration or safety prerequisite.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest,qualificationIdentity,runtimeProjection,validateConfig} from './qualification.mjs';
import {assertCurrentCandidate,assertApprovedDecisions} from './source-identity.mjs';
import {assertCandidateSource} from './candidate-provider.mjs';
import {frozenFacts} from './frozen-world.mjs';
import {assertJudgeSourceInventory} from './evaluator-source.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {validateProtocol} from '../single-agent-commerce-read-only/protocol.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {assertOpeningProductMediaRule} from '../../dist/single-agent-commerce-opening-media.js';
import {assertProspectiveOpeningReadiness} from './source-readiness.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
export const DIAGNOSTIC_SCOPE=read(new URL('./remediation-20261029/DIAGNOSTIC_SCOPE.json',import.meta.url));
export const FULL_NATIVE_DIAGNOSTIC_SCOPE=read(new URL('./FULL_NATIVE_DIAGNOSTIC_SCOPE_20261029.json',import.meta.url));
export const PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE=read(new URL('./PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE_20261031.json',import.meta.url));
export const FULL_NATIVE_REMAINDER_SCOPE=read(new URL('./FULL_NATIVE_REMAINDER_SCOPE_20261102.json',import.meta.url));
export const PURCHASE_MISSING_SCOPE=read(new URL('./PURCHASE_MISSING_SCOPE_20261103.json',import.meta.url));
export const B_PRESERVING_SCOPES=[...['PREFIX','REMAINDER','CHECKOUT'].map(n=>read(new URL(`./B_PRESERVING_${n}_SCOPE_20261104.json`,import.meta.url))),...['R1','R2'].map(n=>read(new URL(`./TARGET_REPAIR_${n}_SCOPE_20261105.json`,import.meta.url)))];
B_PRESERVING_SCOPES.push(read(new URL('./TOOL_CONTRACT_SCREEN_SCOPE_20261109.json',import.meta.url)));
export function diagnosticScope(corpus){
 const name=corpus.provenance?.diagnosticScope;
 const repairScope=B_PRESERVING_SCOPES.find(s=>s.name===name);if(repairScope)return repairScope;
 assert(name===undefined||[FULL_NATIVE_DIAGNOSTIC_SCOPE.name,PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE.name,FULL_NATIVE_REMAINDER_SCOPE.name,PURCHASE_MISSING_SCOPE.name].includes(name),'D_UNKNOWN_SCOPE');
 return name===PURCHASE_MISSING_SCOPE.name?PURCHASE_MISSING_SCOPE:name===FULL_NATIVE_REMAINDER_SCOPE.name?FULL_NATIVE_REMAINDER_SCOPE:name===PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE.name?PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE:name===FULL_NATIVE_DIAGNOSTIC_SCOPE.name?FULL_NATIVE_DIAGNOSTIC_SCOPE:DIAGNOSTIC_SCOPE;
}
export function diagnosticSlots(corpus){
 const scope=diagnosticScope(corpus);
 assert.equal(corpus.scenarios.length,scope.maximumCases,'D_CASE_DENOMINATOR');
 return scope.cases.map((c,i)=>{const s=corpus.scenarios[i];
  const probe=c.sourceCase==='SCOPED_MEDIA_OBSERVATION_VERIFIER_ONLY';
  assert(s.id===c.sourceCase&&s.turns.length===c.turns&&s.mode===(c.mode??(probe?'SAFETY':c.turns===3?'JOURNEY':'SINGLE')),'D_SCOPE_CHANGED');
  return {slotId:digest({diagnostic:true,corpusHash:digest(corpus),caseId:s.id}),caseId:s.id,mode:s.mode,arm:'CANDIDATE',repetition:1,maximumGenerations:c.maximumGenerationRequests};
 });
}
export function validateDiagnostic(reg,world){
 const scope=diagnosticScope(reg.corpus);
 assert(reg.kind==='PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1'&&reg.status==='REGISTERED_DEVELOPMENT_NOT_QUALIFICATION'&&
  reg.sendEnabled===false&&reg.corpus.provenance?.developmentOnly===true&&reg.scopeHash===digest(scope),'D_REGISTRATION_KIND');
 if(scope===FULL_NATIVE_DIAGNOSTIC_SCOPE||scope===PURCHASE_OPTIONS_DIAGNOSTIC_SCOPE||scope===FULL_NATIVE_REMAINDER_SCOPE||scope===PURCHASE_MISSING_SCOPE||B_PRESERVING_SCOPES.includes(scope))assert.equal(digest(reg.corpus.scenarios.map(s=>({id:s.id,mode:s.mode,turns:s.turns,customerPolicy:s.customerPolicy??null}))),scope.customerScriptsHash,'D_CUSTOMER_SCRIPTS_CHANGED');
 validateConfig(reg.config);assert.equal(reg.config.repetitions,1);assert.equal(reg.config.retry,0);
 assert.deepEqual(reg.identity,qualificationIdentity(reg.config));assert.equal(reg.worldHash,digest(world));frozenFacts(world);
 assert.equal(reg.corpusHash,digest(reg.corpus));assert.deepEqual(reg.slots,diagnosticSlots(reg.corpus));
 assert(reg.review?.status==='APPROVED'&&reg.review.corpusHash===reg.corpusHash&&reg.review.worldHash===reg.worldHash&&
  reg.review.sourceChecksHash===digest(reg.sourceChecks)&&reg.review.reviewer&&reg.review.evidenceRef&&reg.review.newProviderResultsObserved===0,'D_INPUT_REVIEW');
 assert(Number.isFinite(Date.parse(reg.registeredAt))&&Date.parse(reg.registeredAt)<=Date.now(),'D_REGISTRATION_TIME');
 assertDiagnosticInitial(reg);const initial=reg.initialStateArtifact;
 assert(reg.sourceChecks.length===scope.maximumCases,'D_SOURCE_CHECKS');
 for(const [i,s]of reg.corpus.scenarios.entries()){
  for(let n=0;n<s.turns.length;n++){
   const t=s.turns[n];assert(typeof t.latest==='string'&&t.latest.trim()&&Buffer.byteLength(t.latest)<=2048&&t.history.length===0&&
    t.initialProductCodes.length<=3,'D_RUNTIME_BOUND');runtimeProjection(s,n,{acceptedHistory:[]});
  }
  if(s.mode==='JOURNEY')assert(s.customerPolicy?.kind==='FROZEN_SCRIPTED_BRANCHES'&&s.customerPolicy.hash===digest(s.customerPolicy.branches),'D_BRANCH_CHANGED');
  assert.deepEqual(reg.sourceChecks[i],s.diagnosticTrusted,'D_SOURCE_BINDING');
  if(s.mode!=='SAFETY'){assert.equal(s.initialContext.worldHash,reg.worldHash);assert.equal(s.initialContext.initialStateHash,digest(initial.publicState));
   assertJudgeSourceInventory(s.judgeContext?.sourceInventory,reg.worldHash,world,s);
   const checkout=B_PRESERVING_SCOPES.includes(scope)&&s.id==='c-20261104-checkout-complete';
   assert.deepEqual(s.nativeCodeOwnedTurns??[],checkout?[0,1,2,3,4,5,6]:s.id==='c-20261028-j6'?[1,2]:[],'D_CODE_OWNED_SCOPE');
   if(checkout)assert(s.customerPolicy?.selector==='EVALUATOR_CODE_PROOF','D_CHECKOUT_SELECTOR');
  }else assert(s.evaluator.unsafe===false&&s.nativeSafety?.worldHash===reg.worldHash&&s.nativeSafety.sourceHash===digest(s.diagnosticTrusted)&&
    digest(s.nativeSafety.trusted)===digest(s.diagnosticTrusted)&&s.nativeSafety.review?.status==='APPROVED','D_PROBE_BINDING');
 }
}
export function assertDiagnosticInitial(reg){
 const a=reg.initialStateArtifact;
 assert(a?.kind==='REAL_ADAPTER_NATIVE_INITIAL_STATE'&&a.worldHash===reg.worldHash&&a.sourceSha===reg.runSourceSha&&
  a.sourceDirty===false&&a.testDatabaseDropped===true&&a.providerRequests===0&&reg.initialStateArtifactHash===digest(a),'D_INITIAL_STATE');
}
export function diagnosticControl(reg,{checkSource}){
 const scope=diagnosticScope(reg.corpus);
 let stopped=null;
 const stop=reason=>{stopped??=reason;};
 return {blocked:()=>!!stopped,reason:()=>stopped,stop,
  beforeGeneration({generations,active,role}){
   assert(!stopped,'D_BATCH_STOPPED:'+stopped);
   try{
    checkSource();assert(generations.every(g=>Number.isInteger(g.providerRequests)&&g.providerRequests>=0&&g.providerRequests<=1&&g.status!=='PENDING'),'D_ACCOUNTING_UNKNOWN');
    assert(generations.length<scope.maximumGenerationRequests,'D_BATCH_CAP');
    for(const s of reg.slots){const rows=generations.filter(g=>g.slotId===s.slotId);assert(rows.length<=s.maximumGenerations,'D_ACTUAL_CAP_VIOLATION');
     for(let i=0;i<reg.corpus.scenarios.find(c=>c.id===s.caseId).turns.length;i++)for(const r of ['OWNER','VERIFIER'])assert(rows.filter(g=>g.turnIndex===i&&g.role===r).length<=(r==='OWNER'?3:1),'D_ACTUAL_CAP_VIOLATION');}
    assert(reg.slots.some(s=>s.slotId===active?.slotId&&(s.mode!=='SAFETY'||role==='VERIFIER')),'D_UNREGISTERED_DISPATCH');
   }catch(e){stop(e.message);throw e;}
  },
  afterTurn({errorCode,reason,recoveryReason,safetyFindings=[],accounting,commitStatus,handoffStatus}={}){
   if(safetyFindings.length||accounting==='UNKNOWN'||['UNKNOWN_PROVIDER_COMPLETION','C_ACCEPTED_CAPTURE_COUNT','C_CODE_CAPTURE_COUNT'].includes(errorCode)||
    [commitStatus,handoffStatus].some(s=>['UNKNOWN','UNKNOWN_COMMIT','PARTIAL_EFFECT'].includes(s))||
    [reason,recoveryReason].some(r=>['STALE','FACT_EXPIRED','SNAPSHOT_MISMATCH','PRIVACY','RECIPIENT','PERMISSION','PERMISSION_OR_PRIVACY','PRIVACY_VIOLATION','EFFECT_RECEIPT_MISMATCH','UNKNOWN_COMMIT','PARTIAL_EFFECT','CURRENT_READBACK_UNAVAILABLE'].includes(r)))stop(errorCode??reason??recoveryReason??commitStatus??handoffStatus??'D_HARD_INVARIANT');
  }};
}
export function claimDiagnostic(path,reg){
 assert.equal(reg.kind,'PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1');
 writeFileSync(resolve(dirname(resolve(path)),'DIAGNOSTIC_DISPATCH.json'),JSON.stringify({kind:'DEVELOPMENT_ONLY',registrationHash:digest(reg),startedAt:new Date().toISOString(),retry:0}),{flag:'wx'});
}
export function assertDiagnosticFlags(argv){
 if(argv.includes('--phase-c-diagnostic-registration'))assert(!['--phase-c-registration','--phase-c-initial-world','--phase-c-arm','--provider-run','--provider-preflight','--phase-c-safety'].some(f=>argv.includes(f)),'D_FLAGS_CONFLICT');
}
export function diagnosticProviderRegistration(sealed){
 const openingMediaRule=sealed.config?.candidate?.openingMediaRule;assertOpeningProductMediaRule(openingMediaRule);
 assertProspectiveOpeningReadiness(sealed.corpus,openingMediaRule);
 return {sourceSha:sealed.runSourceSha,mode:'PHASE_C_DEVELOPMENT_DIAGNOSTIC_ONLY',arm:'CANDIDATE',openingMediaRule,
  maximumGenerationRequests:diagnosticScope(sealed.corpus).maximumGenerationRequests,ownerContextPresentation:'VI_DATA_BLOCKS_COMPACT_V2'};
}
export function diagnosticPreflight(root,registrationPath,worldPath){
 const sealed=read(registrationPath),world=read(worldPath);validateDiagnostic(sealed,world);
 assertProspectiveOpeningReadiness(sealed.corpus,sealed.config.candidate.openingMediaRule);
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','C_DIRTY_SOURCE');
 assertCurrentCandidate(root,sealed.config);assertApprovedDecisions(root,sealed.config);
 execFileSync(process.execPath,[fileURLToPath(new URL('./source-readiness.mjs',import.meta.url)),'--assert',worldPath,registrationPath],{stdio:['ignore','pipe','pipe']});
 const m=validateProtocol(read(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/manifest.json'))),codex=inspectCodex();
 assert.equal(codex.version,'codex-cli '+m.models.verifier.generationConfig.cliVersion);
 assert.deepEqual(m.models.conversation,sealed.config.candidate.model);assert.deepEqual(m.models.verifier,sealed.config.candidate.verifier.model);
 const p={root,sealed,world,m,codex,config:world.config,registration:diagnosticProviderRegistration(sealed)};
 p.diagnosticControl=diagnosticControl(sealed,{checkSource:()=>{assertCandidateSource(p);for(const snapshot of sealed.sourceChecks)assert.equal(hardPrecheck(snapshot,'Dạ.',new Date()),null,'D_SOURCE_INVALIDATED');}});
 p.diagnosticControl.beforeGeneration({generations:[],active:{slotId:sealed.slots[0].slotId,turnIndex:0},role:'OWNER'});
 return p;
}
