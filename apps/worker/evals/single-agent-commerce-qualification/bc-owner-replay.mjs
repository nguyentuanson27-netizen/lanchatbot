// Captured-body one-step sampling only. Returned tools are never executed.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServiceAccountAssertion,vertexGenerateEndpoint} from '../../dist/vertex.js';
import {parseGeminiGeneration} from '../single-agent-commerce-read-only/gemini-inference.mjs';
import {read,write,assertWire,byteHash,digest,validateInput,normalizeOutput} from './bc-control.mjs';
async function bounded(response,max){
 const reader=response.body?.getReader();assert(reader,'CONTROL_RESPONSE_EMPTY');const chunks=[];let bytes=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max){await reader.cancel();throw Error('CONTROL_RESPONSE_BOUND');}chunks.push(Buffer.from(value));}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{reader.releaseLock();}
}
export function createCapturedOwnerSender({projectId,model},{fetchImpl=fetch,credential}={}){
 assert(model.model==='gemini-3.5-flash-lite'&&model.effort==='high'&&model.generationConfig.retry===0,'CONTROL_OWNER_IDENTITY');let token=null;
 return async(body,expectedHash)=>{
  assertWire(body);const wire=JSON.stringify(body);assert.equal(byteHash(wire),expectedHash,'CONTROL_OWNER_BODY_CHANGED');
  const telemetry={providerRequests:0,authRequests:0,httpStatus:null,modelVersion:null,inputTokens:null,outputTokens:null,cost:null,requestHash:expectedHash};
  const start=performance.now(),signal=AbortSignal.timeout(90000);let raw=null,stage='AUTH';
  try{
   if(!token||token.expiresAt-Date.now()<60000){
    const c=credential??read(process.env.C3_VERTEX_CREDENTIAL_FILE);assert(c.type==='service_account'&&c.project_id===projectId,'CONTROL_CREDENTIAL_SCOPE');
    const assertion=createServiceAccountAssertion({email:c.client_email,privateKey:c.private_key},Date.now());telemetry.authRequests++;
    const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal,headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
    if(!response.ok){await response.body?.cancel();throw Error('CONTROL_AUTH_HTTP');}
    const data=await bounded(response,65536);assert(typeof data.access_token==='string'&&data.access_token,'CONTROL_AUTH_INVALID');
    token={value:data.access_token,expiresAt:Date.now()+(data.expires_in??3600)*1000};
   }
   stage='GENERATION';telemetry.providerRequests=1;
   const response=await fetchImpl(vertexGenerateEndpoint(projectId,'global',model.model),{method:'POST',redirect:'error',signal,headers:{authorization:'Bearer '+token.value,'content-type':'application/json'},body:wire});
   telemetry.httpStatus=response.status;if(!response.ok){if(response.status===401)token=null;await response.body?.cancel();throw Error('CONTROL_GENERATION_HTTP');}
   stage='RESPONSE';raw=await bounded(response,1048576);telemetry.modelVersion=raw.modelVersion??null;
   telemetry.inputTokens=raw.usageMetadata?.promptTokenCount??null;telemetry.outputTokens=raw.usageMetadata?(raw.usageMetadata.candidatesTokenCount??0)+(raw.usageMetadata.thoughtsTokenCount??0):null;
   assert.equal(telemetry.modelVersion,model.version,'CONTROL_OBSERVED_MODEL');stage='OUTPUT';const output=parseGeminiGeneration(raw);
   return {status:'OK',telemetry:{...telemetry,latencyMs:performance.now()-start},output,normalized:normalizeOutput(output),raw};
  }catch(error){return {status:signal.aborted?'TIMEOUT':stage==='OUTPUT'?'MALFORMED':stage==='RESPONSE'?'INVALID_RESPONSE':'PROVIDER_ERROR',stage,
   errorCode:/^CONTROL_[A-Z_]+$/.test(error.message)?error.message:'CONTROL_REQUEST_FAILED',telemetry:{...telemetry,latencyMs:performance.now()-start},raw};}
 };
}
export async function runOwnerReplay({input,seal,out,root,send}){
 validateInput(input);assert.equal(digest(input),seal.inputHash,'CONTROL_SEALED_INPUT_CHANGED');assert(seal.maximumGenerationRequests===18&&seal.retry===0,'CONTROL_SEAL_LIMITS');
 const verify=()=>{assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),seal.runSourceSha,'CONTROL_RUN_SOURCE_CHANGED');
  assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','CONTROL_DIRTY_SOURCE');
  for(const a of seal.artifacts)assert.equal(byteHash(readFileSync(a.path)),a.sha256,'CONTROL_SEALED_ARTIFACT_CHANGED');};
 verify();write(resolve(out,'OWNER_DISPATCH.json'),{startedAt:new Date().toISOString(),sealHash:digest(seal),maximum:18,retry:0});
 const attempts=[];
 for(const slot of input.slots){verify();const c=input.cases.find(c=>c.caseId===slot.caseId);assert.equal(slot.bodyHash,c.bodyHash);
  write(resolve(out,slot.slotId+'.claim.json'),{...slot,status:'CLAIMED',bodyHash:c.bodyHash});
  appendFileSync(resolve(out,'OWNER_REQUESTS.jsonl'),JSON.stringify({...slot,body:c.ownerBody})+'\n');
  const result=await send(c.ownerBody,c.bodyHash);assert(Number.isInteger(result.telemetry?.providerRequests)&&result.telemetry.providerRequests>=0&&result.telemetry.providerRequests<=1,'CONTROL_ACCOUNTING_UNKNOWN');
  write(resolve(out,slot.slotId+'.result.json'),result);attempts.push({...slot,status:result.status,providerRequests:result.telemetry.providerRequests,
   outputHash:result.normalized?digest(result.normalized):null,normalized:result.normalized??null,telemetry:result.telemetry,resultFile:slot.slotId+'.result.json'});
  write(resolve(out,slot.slotId+'.accounting.json'),attempts.at(-1));
  // Known errors remain in denominator. A next registered sample is never a retry.
 }
 verify();const report={kind:'IDENTICAL_WIRE_ONE_STEP_OWNER_SAMPLES_NOT_END_TO_END',runSourceSha:seal.runSourceSha,inputHash:digest(input),registered:18,completed:attempts.length,
  providerRequests:attempts.reduce((n,a)=>n+a.providerRequests,0),retry:0,toolsExecuted:0,effects:0,sendEnabled:false,attempts,
  cases:input.cases.map(c=>{const rows=attempts.filter(a=>a.caseId===c.caseId);return {caseId:c.caseId,bodyHash:c.bodyHash,samples:rows.length,errors:rows.filter(r=>r.status!=='OK').length,
   uniqueNormalizedOutputs:new Set(rows.filter(r=>r.status==='OK').map(r=>r.outputHash)).size,
   uniqueActionSequences:[...new Set(rows.filter(r=>r.status==='OK').map(r=>JSON.stringify(r.normalized.kind==='TOOLS'?r.normalized.calls.map(c=>c.name):['FINAL'])))],
   note:'Variation is measured only at the captured decision point. Same output in three samples is not general stability.'};})};
 write(resolve(out,'OWNER_RESULTS.json'),report);return report;
}
if(process.argv[1]?.endsWith('bc-owner-replay.mjs')){
 const [inputFile,sealFile,out]=process.argv.slice(2);assert(out,'CONTROL_OWNER_ARGS');const input=read(inputFile),seal=read(sealFile),world=read(input.cWorld);
 const report=await runOwnerReplay({input,seal,out,root:input.cRoot,send:createCapturedOwnerSender({projectId:world.config.vertex.projectId,model:input.model})});
 console.log(JSON.stringify({registered:report.registered,completed:report.completed,providerRequests:report.providerRequests,errors:report.attempts.filter(a=>a.status!=='OK').length,retry:0}));
}
