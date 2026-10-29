// One approved development batch only. Never a qualification registration or safety prerequisite.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest,qualificationIdentity,runtimeProjection,validateConfig} from './qualification.mjs';
import {assertCurrentCandidate,assertApprovedDecisions} from './source-identity.mjs';
import {assertCandidateSource} from './candidate-provider.mjs';
import {frozenFacts} from './frozen-world.mjs';
import {assertJudgeSourceInventory} from './evaluator-source.mjs';
import {hardPrecheck} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {validateProtocol} from '../single-agent-commerce-read-only/protocol.mjs';
import {inspectCodex} from '../single-agent-semantic-verifier/codex-inference.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
export const DIAGNOSTIC_SCOPE=read(new URL('./remediation-20261029/DIAGNOSTIC_SCOPE.json',import.meta.url));
export function diagnosticSlots(corpus){
 assert.equal(corpus.scenarios.length,6,'D_CASE_DENOMINATOR');
 return DIAGNOSTIC_SCOPE.cases.map((c,i)=>{const s=corpus.scenarios[i];
  assert(s.id===c.sourceCase&&s.turns.length===c.turns&&s.mode===(i===5?'SAFETY':c.turns===3?'JOURNEY':'SINGLE'),'D_SCOPE_CHANGED');
  return {slotId:digest({diagnostic:true,corpusHash:digest(corpus),caseId:s.id}),caseId:s.id,mode:s.mode,arm:'CANDIDATE',repetition:1,maximumGenerations:c.maximumGenerationRequests};
 });
}
export function validateDiagnostic(reg,world){
 assert(reg.kind==='PHASE_C_DEVELOPMENT_DIAGNOSTIC_V1'&&reg.status==='REGISTERED_DEVELOPMENT_NOT_QUALIFICATION'&&
  reg.sendEnabled===false&&reg.corpus.provenance?.developmentOnly===true&&reg.scopeHash===digest(DIAGNOSTIC_SCOPE),'D_REGISTRATION_KIND');
 validateConfig(reg.config);assert.equal(reg.config.repetitions,1);assert.equal(reg.config.retry,0);
 assert.deepEqual(reg.identity,qualificationIdentity(reg.config));assert.equal(reg.worldHash,digest(world));frozenFacts(world);
 assert.equal(reg.corpusHash,digest(reg.corpus));assert.deepEqual(reg.slots,diagnosticSlots(reg.corpus));
 assert(reg.review?.status==='APPROVED'&&reg.review.corpusHash===reg.corpusHash&&reg.review.worldHash===reg.worldHash&&
  reg.review.sourceChecksHash===digest(reg.sourceChecks)&&reg.review.reviewer&&reg.review.evidenceRef&&reg.review.newProviderResultsObserved===0,'D_INPUT_REVIEW');
 assert(Number.isFinite(Date.parse(reg.registeredAt))&&Date.parse(reg.registeredAt)<=Date.now(),'D_REGISTRATION_TIME');
 assertDiagnosticInitial(reg);const initial=reg.initialStateArtifact;
 assert(reg.sourceChecks.length===6,'D_SOURCE_CHECKS');
 for(const [i,s]of reg.corpus.scenarios.entries()){
  for(let n=0;n<s.turns.length;n++){
   const t=s.turns[n];assert(typeof t.latest==='string'&&t.latest.trim()&&Buffer.byteLength(t.latest)<=2048&&t.history.length===0&&
    t.initialProductCodes.length<=3,'D_RUNTIME_BOUND');runtimeProjection(s,n,{acceptedHistory:[]});
  }
  if(s.mode==='JOURNEY')assert(s.customerPolicy?.kind==='FROZEN_SCRIPTED_BRANCHES'&&s.customerPolicy.hash===digest(s.customerPolicy.branches),'D_BRANCH_CHANGED');
  assert.deepEqual(reg.sourceChecks[i],s.diagnosticTrusted,'D_SOURCE_BINDING');
  if(i<5){assert.equal(s.initialContext.worldHash,reg.worldHash);assert.equal(s.initialContext.initialStateHash,digest(initial.publicState));
   assertJudgeSourceInventory(s.judgeContext?.sourceInventory,reg.worldHash,world,s);
   assert.deepEqual(s.nativeCodeOwnedTurns??[],s.id==='c-20261028-j6'?[1,2]:[],'D_CODE_OWNED_SCOPE');
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
 let stopped=null;
 const stop=reason=>{stopped??=reason;};
 return {blocked:()=>!!stopped,reason:()=>stopped,stop,
  beforeGeneration({generations,active,role}){
   assert(!stopped,'D_BATCH_STOPPED:'+stopped);
   try{
    checkSource();assert(generations.every(g=>Number.isInteger(g.providerRequests)&&g.providerRequests>=0&&g.providerRequests<=1&&g.status!=='PENDING'),'D_ACCOUNTING_UNKNOWN');
    assert(generations.length<37,'D_BATCH_CAP');
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
export function diagnosticPreflight(root,registrationPath,worldPath){
 const sealed=read(registrationPath),world=read(worldPath);validateDiagnostic(sealed,world);
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','C_DIRTY_SOURCE');
 assertCurrentCandidate(root,sealed.config);assertApprovedDecisions(root,sealed.config);
 const m=validateProtocol(read(resolve(root,'apps/worker/evals/single-agent-commerce-read-only/manifest.json'))),codex=inspectCodex();
 assert.equal(codex.version,'codex-cli '+m.models.verifier.generationConfig.cliVersion);
 assert.deepEqual(m.models.conversation,sealed.config.candidate.model);assert.deepEqual(m.models.verifier,sealed.config.candidate.verifier.model);
 const p={root,sealed,world,m,codex,config:world.config,registration:{mode:'PHASE_C_DEVELOPMENT_DIAGNOSTIC_ONLY',maximumGenerationRequests:37,arm:'CANDIDATE'}};
 p.diagnosticControl=diagnosticControl(sealed,{checkSource:()=>{assertCandidateSource(p);for(const snapshot of sealed.sourceChecks)assert.equal(hardPrecheck(snapshot,'Dạ.',new Date()),null,'D_SOURCE_INVALIDATED');}});
 p.diagnosticControl.beforeGeneration({generations:[],active:{slotId:sealed.slots[0].slotId,turnIndex:0},role:'OWNER'});
 return p;
}
