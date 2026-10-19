// Evaluation only. Each registered attempt receives its own captured public world.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createGeminiCommerceInference,buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {validateProtocol,createCommerceVerifier,buildVerifierRequest,sha256} from './protocol.mjs';

export const selectAdviceCapture=rows=>{const dispatched=rows.filter(r=>r.providerRequests>0);return dispatched.find(r=>r.toolsAllowed===false)??dispatched.at(-1)??null;};

async function main(){
 const [input,out]=process.argv.slice(2);if(!input||!out)throw new Error('CAPTURE_AND_NEW_OUT_REQUIRED');
 const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain','--','apps/worker/src','packages','apps/worker/evals/single-agent-commerce-read-only'],{encoding:'utf8'}).trim())throw new Error('DIRTY_SOURCE');
 const rows=JSON.parse(readFileSync(input,'utf8'));
 const m=validateProtocol(JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url))));
 const config=JSON.parse(readFileSync(new URL('./source-config.b1.json',import.meta.url)));
 const {hardPrecheck,makeBinding,finalGate,terminalFallback}=await import('../../dist/single-agent-semantic-verifier-boundary.js');
 mkdirSync(out);
 const audit=(id,phase,value)=>appendFileSync(resolve(out,'requests.jsonl'),JSON.stringify({id,phase,value})+'\n');
 const infer=createGeminiCommerceInference({model:m.models.conversation.model,effort:'high',location:'global',projectId:config.vertex.projectId});
 const verify=createCommerceVerifier(m,undefined,(id,v)=>audit(id,v.phase,v.provider));
 const ownerPrompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),verifierPrompt=readFileSync(new URL('./prompts/verifier.vi.txt',import.meta.url),'utf8');
 writeFileSync(resolve(out,'registration.json'),JSON.stringify({sourceSha:source,inputHash:sha256(readFileSync(input)),registered:rows.length,maximumGenerationRequests:rows.length*2,mode:'CAPTURED_PUBLIC_WORLD_REPLAY_NOT_LIVE_ELIGIBILITY',models:m.models,promptHashes:m.promptHashes,retry:0,sendEnabled:false},null,2));
 for(const [index,row] of rows.entries()){
  const captures=row.requests??[],capture=selectAdviceCapture(captures);
  let result={status:'BLOCKED',terminal:null};
  if(capture){
   const trusted=structuredClone(capture.context),now=new Date(capture.capturedAt),requestId=randomUUID(),controller=new AbortController();
   const request={generationId:requestId+':owner:1',instructions:ownerPrompt,contents:[...row.runtime.history.map(h=>({role:h.role==='customer'?'user':'model',parts:[{text:h.text}]})),{role:'user',parts:[{text:row.runtime.latest}]}],context:trusted,toolsAllowed:false,availableTools:[],toolBudget:{roundsRemaining:0,callsRemaining:0},signal:controller.signal};
   const generations=[];const started=performance.now();let draft=null;
   try {
    audit(request.generationId,'OWNER_REQUEST',buildGeminiCommerceRequest(request));
    const generated=await infer(request);generations.push({role:'owner',status:'OK',telemetry:generated.telemetry});audit(request.generationId,'OWNER_RESULT',generated);
    if(generated.kind!=='FINAL')throw new Error('OWNER_TOOL_MODE');
    draft=generated.text;const binding=makeBinding(requestId,draft,trusted),problem=hardPrecheck(trusted,draft,now);
    let response={kind:'PROVIDER_ERROR'};
    const verificationStarted=performance.now();
    if(!problem){
     const vr={generationId:requestId+':verifier:1',instructions:verifierPrompt,finalDraft:draft,trusted,latest:row.runtime.latest,history:row.runtime.history,binding,signal:controller.signal};
     audit(vr.generationId,'VERIFIER_REQUEST',buildVerifierRequest(m,vr));
     try{const v=await verify(vr);generations.push({role:'verifier',status:'OK',telemetry:v.telemetry});response={kind:'VERDICT',binding,result:v.result};}
     catch(e){generations.push({role:'verifier',status:'ERROR',telemetry:e.telemetry??null});response={kind:'PROVIDER_ERROR'};}
    }
    result={status:'RECORDED_REPLAY',terminal:finalGate({expected:binding,response,current:structuredClone(trusted),finalDraft:draft,now,includeDiagnostic:true,fallback:{id:m.fallback.id,text:m.fallback.text}}),verificationLatencyMs:performance.now()-verificationStarted};
   }catch(e){if(e.telemetry)generations.push({role:'owner',status:'ERROR',telemetry:e.telemetry});result={status:'RECORDED_REPLAY',terminal:{...terminalFallback(m.fallback.id),reason:e.message==='OWNER_TOOL_MODE'?'OWNER_TOOL_MODE':'PROVIDER_ERROR'}};}
   result={...result,draft,generations,elapsedMs:performance.now()-started,captureHash:sha256(JSON.stringify(capture)),replayClock:capture.capturedAt};
  }
  writeFileSync(resolve(out,'attempt-'+(index+1)+'.json'),JSON.stringify({caseId:row.caseId,runtime:row.runtime,result,sendEnabled:false},null,2));
 }
 if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==source)throw new Error('SOURCE_CHANGED');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
