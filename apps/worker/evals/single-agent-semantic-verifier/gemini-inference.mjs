// Evaluation-only Round8 comparison. One final-text generation; no agent/proposal/retry.
import {readFileSync} from 'node:fs';
import {createServiceAccountAssertion,vertexGenerateEndpoint} from '../../dist/vertex.js';
import {hash} from './protocol.mjs';
const requireThat=(ok,code)=>{if(!ok)throw new Error(code);};
function configuration(manifest) {
 const model=manifest.models.conversation,c=model.generationConfig;
 requireThat(manifest.variant==='GEMINI_CONVERSATION'&&model.provider==='VERTEX_AI'&&model.model==='gemini-3.5-flash-lite'&&model.version===model.model&&model.effort==='high','GEMINI_IDENTITY');
 requireThat(c.endpoint===vertexGenerateEndpoint(c.projectId,'global',model.model)&&c.location==='global'&&c.retry===0&&c.relayUpstreamRequestsPerAttempt===1,'GEMINI_CONFIG');
 return c;
}
function readCredential(config) {
 try {
  const c=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
  requireThat(c.type==='service_account'&&c.project_id===config.projectId&&typeof c.client_email==='string'&&typeof c.private_key==='string','VERTEX_CREDENTIAL_INVALID');
  return c;
 } catch {throw new Error('VERTEX_CREDENTIAL_UNAVAILABLE_OR_PROJECT_MISMATCH');}
}
export function inspectGemini(manifest) {
 const c=configuration(manifest);readCredential(c);
 return {provider:'VERTEX_AI',model:manifest.models.conversation.model,projectId:c.projectId,location:c.location,
  transport:'NODE_FETCH_NO_RETRY',credentialRoute:'EXISTING_LOCAL_VERTEX_SERVICE_ACCOUNT',credentialAvailable:true,nodeVersion:process.version,
  helperExecutableHash:hash(readFileSync(new URL('../../dist/vertex.js',import.meta.url)))};
}
async function boundedText(response,bound) {
 const reader=response.body?.getReader();requireThat(reader,'VERTEX_EMPTY_BODY');
 const chunks=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>bound){await reader.cancel();throw new Error('VERTEX_RESPONSE_BOUND');}chunks.push(Buffer.from(value));}
 return Buffer.concat(chunks).toString('utf8');
}
export function createGeminiInference(manifest,dependencies={}) {
 const c=configuration(manifest),credential=dependencies.credential??readCredential(c);
 requireThat(credential.project_id===c.projectId&&credential.type==='service_account','VERTEX_CREDENTIAL_INVALID');
 const fetchImpl=dependencies.fetchImpl??fetch;let cachedToken=null;
 return async request=>{
  const started=performance.now(),controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),dependencies.timeoutMs??c.timeoutMs);
  let providerRequests=0,authRequests=0,httpStatus=null,authHttpStatus=null,usage=null,modelVersion=null,responseId=null,finishReason=null;
  let record;
  try {
   // Fixed35–38 carry exact native dialogue in the same single request.
   const native=[35,36,37].includes(manifest.round)&&manifest.conversationContextFormat==='NATIVE_DIALOGUE_FACTS_V3' || [38,39,40,41,42,43,44,45,46,47].includes(manifest.round)&&manifest.conversationContextFormat==='NATIVE_DIALOGUE_FACTS_V4';
   const textContents=native ? Array.isArray(request.contents)&&request.contents.length>=2&&request.contents.length<=manifest.bounds.historyCount+2&&
    request.contents[0].role==='user'&&request.contents.at(-1).role==='user'&&request.contents.every(message=>
     ['user','model'].includes(message.role)&&message.parts?.length===1&&Object.keys(message.parts[0]).length===1&&typeof message.parts[0].text==='string') :
    request.contents?.length===1&&request.contents[0].role==='user'&&request.contents[0].parts?.length===1&&typeof request.contents[0].parts[0].text==='string';
   // No tools, candidate selection or server-side memory.
   requireThat(request.systemInstruction?.parts?.[0]?.text===manifest.prompts.conversation&&
    textContents&&JSON.stringify(request.tools)==='[]'&&
    JSON.stringify(request.generationConfig)===JSON.stringify({candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}),
    'VERTEX_TEXT_REQUEST');
   if(!cachedToken||cachedToken.expiresAt-Date.now()<60000){
    const assertion=createServiceAccountAssertion({email:credential.client_email,privateKey:credential.private_key},Date.now());
    authRequests++;
    const auth=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},
     body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:controller.signal});
    authHttpStatus=auth.status;
    if(!auth.ok){await auth.body?.cancel();throw new Error('VERTEX_AUTH_FAILED');}
    let data;try{data=JSON.parse(await boundedText(auth,65536));}catch{throw new Error('VERTEX_AUTH_INVALID');}
    requireThat(typeof data.access_token==='string'&&data.access_token.length>0,'VERTEX_AUTH_INVALID');
    cachedToken={value:data.access_token,expiresAt:Date.now()+(Number.isFinite(data.expires_in)?data.expires_in:3600)*1000};
   }
   providerRequests++; // Seal before await, including failed transmission.
   const response=await fetchImpl(c.endpoint,{method:'POST',redirect:'error',
    headers:{authorization:'Bearer '+cachedToken.value,'content-type':'application/json'},body:JSON.stringify(request),signal:controller.signal});
   httpStatus=response.status;
   if(!response.ok){
    if(response.status===401)cachedToken=null; // Refresh only before a later registered attempt.
    await response.body?.cancel();throw new Error('VERTEX_GENERATION_HTTP');
   }
   let data;try{data=JSON.parse(await boundedText(response,c.maxResponseBytes));}
   catch(error){if(error.message==='VERTEX_RESPONSE_BOUND')throw error;throw new Error('VERTEX_RESPONSE_INVALID');}
   modelVersion=data.modelVersion??null;responseId=data.responseId??null;
   const u=data.usageMetadata;
   if(u&&Number.isFinite(u.promptTokenCount)&&Number.isFinite(u.candidatesTokenCount)){
    usage={inputTokens:u.promptTokenCount,outputTokens:u.candidatesTokenCount+(u.thoughtsTokenCount??0),thinkingTokens:u.thoughtsTokenCount??0,
     candidateOutputTokens:u.candidatesTokenCount,cachedInputTokens:u.cachedContentTokenCount??0,totalTokens:u.totalTokenCount??null};
   }
   requireThat(modelVersion===manifest.models.conversation.version,'VERTEX_MODEL_MISMATCH');
   requireThat(Array.isArray(data.candidates)&&data.candidates.length===1,'VERTEX_CANDIDATE_COUNT');
   const candidate=data.candidates[0];finishReason=candidate.finishReason??null;
   requireThat(finishReason==='STOP'&&!data.promptFeedback?.blockReason&&!candidate.safetyRatings?.some(v=>v.blocked),'VERTEX_INCOMPLETE_OR_BLOCKED');
   requireThat(Array.isArray(candidate.content?.parts)&&candidate.content.parts.length>0,'VERTEX_EMPTY_CANDIDATE');
   const parts=candidate.content.parts;
   requireThat(parts.every(p=>typeof p.text==='string'&&!p.functionCall&&!p.functionResponse&&!p.inlineData&&!p.fileData),'VERTEX_NON_TEXT_OUTPUT');
   const answer=parts.filter(p=>p.thought!==true).map(p=>p.text).join('');
   requireThat(answer.trim().length>0&&Buffer.byteLength(answer)<=manifest.bounds.draftBytes,'VERTEX_OUTPUT_BOUND');
   record={status:'OK',answer};
  } catch(error) {
   const known=['VERTEX_TEXT_REQUEST','VERTEX_AUTH_FAILED','VERTEX_AUTH_INVALID','VERTEX_GENERATION_HTTP','VERTEX_RESPONSE_BOUND','VERTEX_RESPONSE_INVALID',
    'VERTEX_MODEL_MISMATCH','VERTEX_CANDIDATE_COUNT','VERTEX_INCOMPLETE_OR_BLOCKED','VERTEX_EMPTY_CANDIDATE','VERTEX_NON_TEXT_OUTPUT','VERTEX_OUTPUT_BOUND'];
   record={status:controller.signal.aborted?'TIMEOUT':'PROVIDER_ERROR',error:known.includes(error.message)?error.message:'VERTEX_TRANSPORT'};
  } finally {clearTimeout(timer);controller.abort();}
  // No headers, tokens, assertion, credentials, raw errors or private thoughts retained.
  return {...record,providerRequests,clientRequests:providerRequests,rejectedClientRequests:0,authRequests,authHttpStatus,httpStatus,
   requestBody:request,modelVersion,responseId,finishReason,usage,cost:null,latencyMs:Math.round(performance.now()-started)};
 };
}
