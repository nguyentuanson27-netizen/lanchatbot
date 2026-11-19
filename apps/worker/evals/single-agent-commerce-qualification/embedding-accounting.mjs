// Auxiliary HTTP accounting only. Never logs OAuth bodies, authorization headers or credentials.
import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {digest} from './qualification.mjs';
export const EMBEDDING_POLICY=Object.freeze({kind:'NATIVE_VERTEX_EMBED_TEXT_V1',
 maximumPredictHttpPerInvocation:2,retry:'ONE_REFRESH_AND_RETRY_ONLY_AFTER_FIRST_PREDICT_401',
 oauth:'NATIVE_TOKEN_CACHE_SINGLE_REFRESH_NO_OAUTH_RETRY',generationRequests:0,
 requestEvidence:'PREDICT_BODY_HASH_ONLY_OAUTH_BODY_NEVER_RETAINED',usage:'NOT_EXPOSED_BY_NATIVE_EMBED_PORT'});
export function embeddingHttpAccounting({fetchImpl=fetch,observe,context}){
 const rows=[],scope=new AsyncLocalStorage();
 return {run:(identity,fn)=>scope.run(structuredClone(identity),fn),observed:()=>structuredClone(rows),fetchImpl:async(url,options)=>{
  const parsed=new URL(url),kind=parsed.href==='https://oauth2.googleapis.com/token'?'OAUTH':
   parsed.protocol==='https:'&&/^(?:[a-z0-9-]+-)?aiplatform.googleapis.com$/.test(parsed.hostname)&&parsed.pathname.endsWith(':predict')?'EMBEDDING':null;
  assert(kind&&options.method==='POST','C_EMBEDDING_HTTP_ENDPOINT');
  const row={...(scope.getStore()??context()),kind,ordinal:rows.length+1,status:null,error:null,latencyMs:null,
   requestHash:kind==='EMBEDDING'?digest(JSON.parse(options.body)):null,usage:null,usageReason:'NATIVE_EMBED_PORT_NOT_EXPOSED'};
  rows.push(row);observe('AUXILIARY_HTTP_STARTED',row);const start=performance.now();
  try{const response=await fetchImpl(url,options);row.status=response.status;return response;}
  catch(error){row.error=error?.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR';throw error;}
  finally{row.latencyMs=performance.now()-start;observe('AUXILIARY_HTTP_RESULT',row);}
 }};
}
