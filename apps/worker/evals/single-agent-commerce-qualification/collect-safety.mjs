// One native verifier generation per registered safety slot, no retry or semantic bypass.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {makeBinding,hardPrecheck,finalGate} from '../../dist/single-agent-semantic-verifier-boundary.js';
import {candidatePreflight,createCandidateProvider,assertCandidateSource} from './candidate-provider.mjs';
import {digest,runtimeProjection} from './qualification.mjs';
import {safetySummary} from './safety-accounting.mjs';
import {claimDispatch} from './dispatch-gates.mjs';
export async function collectSafety({preflight,provider,out,clock=()=>new Date()}){
 const reg=preflight.sealed,slots=reg.slots.filter(s=>s.mode==='SAFETY'&&s.arm==='CANDIDATE'),
  attempts=slots.map(s=>({...s,identity:reg.identity,status:'NOT_RUN'}));
 const save=()=>{writeFileSync(resolve(out,'SAFETY_EVIDENCE.json'),JSON.stringify({config:reg.config,identity:reg.identity,attempts},null,2));
  writeFileSync(resolve(out,'SAFETY_SUMMARY.json'),JSON.stringify(safetySummary(reg,attempts),null,2));};
 save();
 for(const [index,slot]of slots.entries()){
  assertCandidateSource(preflight);
  const scenario=reg.corpus.scenarios.find(s=>s.id===slot.caseId),prepared=scenario.nativeSafety;
  assert(prepared?.review?.status==='APPROVED'&&prepared.worldHash===reg.worldHash&&prepared.trusted,'C_SAFETY_SOURCE_BINDING_REQUIRED');
  const input=runtimeProjection(scenario,0),trusted=structuredClone(prepared.trusted),started=performance.now(),
   requestId=digest({slot:slot.slotId,source:reg.runSourceSha,protocol:reg.identity.protocol}),binding=makeBinding(requestId,input.finalDraft,trusted);
  const a={...slot,identity:reg.identity,status:'EXECUTED',startedAt:clock().toISOString(),safetyFindings:[],generations:[],
   terminal:{disposition:'NO_SEND',messages:[],images:[],reason:'NOT_FINISHED'},metrics:{elapsedMs:0,verificationAddedMs:0,toolCalls:0}};
  attempts[index]=a;save();
  const precheck=hardPrecheck(trusted,input.finalDraft,clock());
  if(precheck){a.precheck={status:'REJECTED',reason:precheck,artifactHash:digest({trusted,binding})};a.terminal.reason=precheck;}
  else{
   const request={generationId:requestId+':verifier',instructions:provider.verifierPrompt,finalDraft:input.finalDraft,trusted,latest:input.latest,
    history:input.history,binding,signal:AbortSignal.timeout(90000),turnTime:{processingAt:clock().toISOString(),timeZone:'Asia/Ho_Chi_Minh'}};
   provider.setSlot({slotId:slot.slotId,turnIndex:0,runtimeInput:input});const first=provider.observed().length;
   let result=null;
   try{result=await provider.verifier(request);}catch{a.status='ERROR';}
   a.generations=provider.observed().slice(first);const g=a.generations[0];
   const current=structuredClone(prepared.trusted),checkedAt=clock(),response=result?{kind:'VERDICT',binding,result:result.result}:{kind:g?.status==='TIMEOUT'?'TIMEOUT':'PROVIDER_ERROR'};
   const terminal=finalGate({expected:binding,response,current,finalDraft:input.finalDraft,now:checkedAt,fallback:preflight.m.fallback});
   a.terminal=terminal.disposition==='SEND_ELIGIBLE'?{disposition:'SEND_ELIGIBLE',messages:[input.finalDraft],images:[]}:
    {disposition:'NO_SEND',messages:[],images:[],reason:terminal.reason};
   if(g){a.verification={...g.verifierInput,generationId:g.id,verdict:g.verdict?.verdict};
    a.finalGate={status:terminal.disposition==='SEND_ELIGIBLE'?'ALLOWED':'BLOCKED',requestId:binding.requestId,draftHash:binding.finalDraftHash,snapshotHash:binding.trustedSnapshotId,
     nativeWitness:{expected:binding,currentBinding:makeBinding(binding.requestId,input.finalDraft,current),checkedAt:checkedAt.toISOString(),terminal,
      currentPublicContext:current,responseKind:response.kind}};
    a.metrics.verificationAddedMs=performance.now()-started;}
  }
  a.metrics.elapsedMs=performance.now()-started;save();
  if(scenario.evaluator.unsafe&&a.terminal.disposition==='SEND_ELIGIBLE')break;
 }
 assertCandidateSource(preflight);return safetySummary(reg,attempts);
}
if(process.argv[1]?.endsWith('collect-safety.mjs')){
 const [registration,world,out]=process.argv.slice(2);assert(registration&&world&&out,'C_SAFETY_ARGUMENTS');
 const r=relative(process.cwd(),resolve(out));assert(r&&(r==='..'||r.startsWith('..'+sep)||isAbsolute(r)),'C_RAW_OUTPUT_OUTSIDE_SOURCE');
 const preflight=candidatePreflight(process.cwd(),registration,world);mkdirSync(out);
 claimDispatch(registration,'SAFETY',preflight.sealed);
 const provider=createCandidateProvider({preflight,out});
 try{const result=await collectSafety({preflight,provider,out});console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=2;}
 finally{await provider.close();}
}
