// The pinned main transport performs one generation POST; no provider retry wrapper.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServiceAccountAssertion} from '../../dist/vertex.js';
import {loadPinnedC3Transport} from './baseline-source.mjs';
async function boundedBody(response,max=1048576){
 const reader=response.body?.getReader();assert(reader,'C_PROVIDER_EMPTY_BODY');const chunks=[];let bytes=0;
 try{for(;;){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>max){await reader.cancel();throw Error('C_PROVIDER_RESPONSE_BOUND');}chunks.push(Buffer.from(r.value));}
  return Buffer.concat(chunks);
 }finally{reader.releaseLock();}
}
export async function createPinnedC3Transport({baselineRoot,baselineBuild,projectId,model,fetchImpl=fetch,onAttempt=()=>{}}){
 const {FetchCandidateVertexTransport}=await loadPinnedC3Transport(baselineRoot,baselineBuild);
 assert.equal(model.model,'gemini-3.5-flash-lite');assert.equal(model.effort,'high');assert.equal(model.location,'global');
 let token=null,active=null;
 const native=new FetchCandidateVertexTransport(async signal=>{
  if(token&&token.expiresAt-Date.now()>60000)return token.value;
  const c=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
  assert(c.type==='service_account'&&c.project_id===projectId,'C_CREDENTIAL_SCOPE');
  active.authRequests++;
  const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal,
   headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion:createServiceAccountAssertion({email:c.client_email,privateKey:c.private_key},Date.now())})});
  if(!response.ok){await response.body?.cancel();throw Error('C_AUTH_HTTP');}
  const result=JSON.parse((await boundedBody(response,65536)).toString('utf8'));assert(typeof result.access_token==='string'&&result.access_token,'C_AUTH_TOKEN');
  token={value:result.access_token,expiresAt:Date.now()+Math.max(0,Number(result.expires_in??3600))*1000};return token.value;
 },async(url,options)=>{
  assert.equal(url,`https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${model.model}:generateContent`,'C_BASELINE_ENDPOINT');
  assert.equal(active.providerRequests,0,'C_PROVIDER_RETRY_FORBIDDEN');active.providerRequests++;
  const response=await fetchImpl(url,options);active.httpStatus=response.status;
  if(response.status===401)token=null; // Refresh is permitted for a later registered attempt only.
  if(!response.ok)return response;
  const bytes=await boundedBody(response),payload=JSON.parse(bytes.toString('utf8'));active.payload=payload;
  return new Response(bytes,{status:response.status,headers:response.headers});
 },90000);
 return {async send(request){
  assert(active===null,'C_BASELINE_SEQUENTIAL_TRANSPORT');
  const row={providerRequests:0,authRequests:0,httpStatus:null,modelVersion:null,inputTokens:null,outputTokens:null,cost:null},started=performance.now();active=row;
  try{
   const response=await native.send(request),usage=row.payload?.usageMetadata;
   row.modelVersion=response.providerModelVersion;row.inputTokens=usage?.promptTokenCount??null;
   row.outputTokens=usage?((usage.candidatesTokenCount??0)+(usage.thoughtsTokenCount??0)):null;row.status='OK';
   delete row.payload;row.latencyMs=performance.now()-started;onAttempt(row);
   return {...response,telemetry:row};
  }catch(error){
   delete row.payload;row.status=/TIMEOUT/.test(error.message)?'TIMEOUT':'PROVIDER_ERROR';row.latencyMs=performance.now()-started;
   row.errorCode=/^[A-Z0-9_]+$/.test(error.message)?error.message:'C_BASELINE_TRANSPORT_ERROR';onAttempt(row);
   throw Object.assign(error,{telemetry:row});
  }finally{active=null;}
 }};
}
