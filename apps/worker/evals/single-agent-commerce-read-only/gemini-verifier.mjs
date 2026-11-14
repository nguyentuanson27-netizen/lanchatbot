// Evaluation-only verifier transport for Vertex Gemini. Owner decision 2026-11-10: the semantic
// verifier runs on the same gemini-3.5-flash-lite route as the owner. It consumes the exact request
// buildVerifierRequest produces (instructions, one JSON user message, verdict schema) and returns the
// runModel telemetry shape createCommerceVerifier expects. One HTTP per call, no retry, no tools.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServiceAccountAssertion,vertexGenerateEndpoint} from '../../dist/vertex.js';

export const GEMINI_VERIFIER_MODEL={provider:'VERTEX_AI',model:'gemini-3.5-flash-lite',version:'gemini-3.5-flash-lite',effort:'high',location:'global',
 credentialRoute:'C3_VERTEX_CREDENTIAL_FILE'};
const requireThat=(ok,code)=>{if(!ok)throw new Error(code);};
async function bounded(response,max){
 const reader=response.body?.getReader();requireThat(reader,'VERIFIER_EMPTY_BODY');const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>max){await reader.cancel();throw new Error('VERIFIER_RESPONSE_BOUND');}chunks.push(Buffer.from(value));}
 }finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
/** The provider body. Same instructions, same single user message, same verdict schema; nothing is added. */
export function buildGeminiVerifierBody(wire){
 requireThat(typeof wire?.instructions==='string'&&wire.instructions.length>0,'VERIFIER_INSTRUCTIONS');
 requireThat(Array.isArray(wire.input)&&wire.input.length===1&&wire.input[0].role==='user'&&wire.input[0].content?.length===1&&
  wire.input[0].content[0].type==='input_text'&&typeof wire.input[0].content[0].text==='string','VERIFIER_INPUT_SHAPE');
 requireThat(Array.isArray(wire.tools)&&wire.tools.length===0&&wire.text?.format?.type==='json_schema'&&wire.text.format.schema,'VERIFIER_CONTRACT');
 return {systemInstruction:{parts:[{text:wire.instructions}]},contents:[{role:'user',parts:[{text:wire.input[0].content[0].text}]}],
  generationConfig:{candidateCount:1,responseMimeType:'application/json',responseJsonSchema:wire.text.format.schema,maxOutputTokens:8192,
   thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}};
}
/** A runModel for createCommerceVerifier(manifest, runModel). */
export function createGeminiVerifierModel(config,dependencies={}){
 requireThat(typeof config?.projectId==='string'&&config.projectId.length>0,'VERIFIER_PROJECT');
 const fetchImpl=dependencies.fetchImpl??fetch,timeoutMs=config.timeoutMs??90000;let token=null;
 return async(_manifest,role,wire)=>{
  requireThat(role==='verifier','VERIFIER_ROLE');
  const body=buildGeminiVerifierBody(wire),text=JSON.stringify(body),started=performance.now();
  const telemetry={status:'PROVIDER_ERROR',provider:GEMINI_VERIFIER_MODEL.provider,model:GEMINI_VERIFIER_MODEL.model,providerRequests:0,authRequests:0,httpStatus:null,
   modelVersion:null,inputTokens:null,outputTokens:null,cost:null,finishReason:null,requestBytes:Buffer.byteLength(text),
   requestHash:createHash('sha256').update(text).digest('hex'),failureStage:'REQUEST'};
  const signal=AbortSignal.timeout(timeoutMs);
  try{
   if(!token||token.expiresAt-Date.now()<60000){
    telemetry.failureStage='AUTH';
    if(dependencies.getToken)token={value:await dependencies.getToken(),expiresAt:Date.now()+3600000};
    else{
     const credential=dependencies.credential??JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
     requireThat(credential.type==='service_account'&&credential.project_id===config.projectId,'CREDENTIAL_SCOPE');
     const assertion=createServiceAccountAssertion({email:credential.client_email,privateKey:credential.private_key},Date.now());
     telemetry.authRequests++;
     const auth=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal,
      headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
     if(!auth.ok){await auth.body?.cancel();throw new Error('AUTH_HTTP');}
     const data=await bounded(auth,65536);requireThat(typeof data.access_token==='string'&&data.access_token,'AUTH_INVALID');
     token={value:data.access_token,expiresAt:Date.now()+(data.expires_in??3600)*1000};
    }
   }
   telemetry.failureStage='GENERATION';telemetry.providerRequests=1;
   const response=await fetchImpl(vertexGenerateEndpoint(config.projectId,GEMINI_VERIFIER_MODEL.location,GEMINI_VERIFIER_MODEL.model),{method:'POST',redirect:'error',signal,
    headers:{authorization:'Bearer '+token.value,'content-type':'application/json'},body:text});
   telemetry.httpStatus=response.status;
   if(!response.ok){await response.body?.cancel();throw new Error('GENERATION_HTTP');}
   telemetry.failureStage='RESPONSE';
   const data=await bounded(response,1048576),candidate=data?.candidates?.[0];
   telemetry.modelVersion=data.modelVersion??null;telemetry.inputTokens=data.usageMetadata?.promptTokenCount??null;
   telemetry.outputTokens=data.usageMetadata?.candidatesTokenCount??null;telemetry.finishReason=candidate?.finishReason??null;
   requireThat(data.modelVersion===GEMINI_VERIFIER_MODEL.model,'VERIFIER_MODEL_VERSION');
   requireThat(Array.isArray(data.candidates)&&data.candidates.length===1&&candidate.finishReason==='STOP','VERIFIER_FINISH_REASON');
   const parts=(candidate.content?.parts??[]).filter(p=>!p.thought&&typeof p.text==='string');
   requireThat(parts.length>=1,'VERIFIER_EMPTY_ANSWER');
   // The final gate parses and validates the verdict; this transport only hands the text over.
   return {...telemetry,status:'OK',failureStage:null,answer:parts.map(p=>p.text).join(''),latencyMs:performance.now()-started};
  }catch(error){
   const timedOut=signal.aborted||error?.name==='AbortError'||error?.name==='TimeoutError';
   return {...telemetry,status:timedOut?'TIMEOUT':'PROVIDER_ERROR',errorCode:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'PROVIDER_ERROR',latencyMs:performance.now()-started};
  }
 };
}
