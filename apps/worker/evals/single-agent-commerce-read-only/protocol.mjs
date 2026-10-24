import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {runCodexModel} from '../single-agent-semantic-verifier/codex-inference.mjs';
import {OWNER_REQUEST_MAX_BYTES,publicTurnTime} from './gemini-inference.mjs';
import {terminalFallback} from '../../dist/single-agent-semantic-verifier-boundary.js';
const check=(ok,reason)=>{if(!ok)throw new Error(reason);};
export const sha256=value=>createHash('sha256').update(value).digest('hex');
// Eval-only explicit B1 selection. Stateful callers keep the shared full prompt.
export function readB1OwnerPrompt(registrationPath){
 if(registrationPath===undefined){
  const text=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8');
  return {text,sha256:sha256(text),registrationHash:null};
 }
 const bytes=readFileSync(registrationPath),registration=JSON.parse(bytes.toString('utf8'));
 check(registration&&Object.keys(registration).sort().join(',')==='promptPath,sha256'&&
  typeof registration.promptPath==='string'&&registration.promptPath.trim()&&
  typeof registration.sha256==='string'&&/^[a-f0-9]{64}$/.test(registration.sha256),'B1_OWNER_REGISTRATION');
 const text=readFileSync(resolve(dirname(resolve(registrationPath)),registration.promptPath),'utf8');
 check(text.trim()&&Buffer.byteLength(text)<=20000,'B1_OWNER_PROMPT_BOUND');
 check(sha256(text)===registration.sha256,'B1_OWNER_PROMPT_HASH');
 return {text,sha256:registration.sha256,registrationHash:sha256(bytes)};
}
export const REGISTERED_CASE_COUNT=24;
export const MAXIMUM_GENERATION_REQUESTS=REGISTERED_CASE_COUNT*4;
export function dispatchRange(value=undefined){
 if(value===undefined)return {first:1,last:REGISTERED_CASE_COUNT};
 check(typeof value==='string'&&/^\d+:\d+$/.test(value),'DISPATCH_RANGE');
 const [first,last]=value.split(':').map(Number);
 check(first>=1&&first<=last&&last<=REGISTERED_CASE_COUNT,'DISPATCH_RANGE');return {first,last};
}
const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value));
export function validateProtocol(m){
 check(m.schemaVersion===1&&m.sendEnabled===false&&m.ownerGenerations===3&&m.toolRounds===2&&m.toolCalls===6&&m.verifierGenerations===1,'PROTOCOL');
 check(m.requestBounds?.ownerWireBytes===OWNER_REQUEST_MAX_BYTES&&m.requestBounds.verifierWireBytes===32768,'REQUEST_BOUNDS');
 check(m.models.conversation.provider==='VERTEX_AI'&&['gemini-3.5-flash-lite','gemini-3.8-flash'].includes(m.models.conversation.model)&&m.models.conversation.effort==='high'&&
  m.models.verifier.provider==='OPENAI'&&m.models.verifier.model==='gpt-6.1-sol'&&m.models.verifier.effort==='high'&&
  m.models.verifier.generationConfig.reasoningEffort==='high'&&m.models.verifier.generationConfig.retry===0,'MODEL_IDENTITY');
 const owner=m.models.conversation.generationConfig,v=m.models.verifier.generationConfig;
 check(m.models.conversation.version===m.models.conversation.model&&m.models.conversation.location==='global'&&
  (m.models.conversation.model==='gemini-3.8-flash'?!Object.hasOwn(owner,'candidateCount'):owner.candidateCount===1)&&owner.responseMimeType==='text/plain'&&owner.maxOutputTokens===8192&&owner.thinkingConfig.thinkingLevel==='HIGH'&&
  owner.thinkingConfig.includeThoughts===false&&owner.retry===0&&owner.timeoutMs===90000&&
  m.models.verifier.version===m.models.verifier.model&&v.timeoutMs===90000&&v.maxResponseBytes===1048576&&
  v.relayUpstreamRequestsPerAttempt===1&&v.endpoint==='https://chatgpt.com/backend-api/codex/responses'&&v.cliVersion==='0.159.2','GENERATION_CONFIG');
 check(m.providerBatch.scenarios===REGISTERED_CASE_COUNT&&m.providerBatch.repetitions===1&&
  m.providerBatch.maximumGenerationRequests===MAXIMUM_GENERATION_REQUESTS,'PROVIDER_BATCH');
 for(const role of ['owner','verifier'])check(sha256(readFileSync(new URL('./prompts/'+role+'.vi.txt',import.meta.url)))===m.promptHashes[role],'PROMPT_HASH');
 check(sha256(JSON.stringify(m.verdictSchema))===m.schemaHash,'SCHEMA_HASH');
 check(m.fallback.id==='C3_A_NONPROTECTED_V2'&&m.fallback.text==='Phần này em chưa trả lời được, chị nhé.'&&sha256(m.fallback.text)===m.fallback.sha256,'FALLBACK_IDENTITY');
 check(Array.isArray(m.recoveryFallbacks)&&m.recoveryFallbacks.length===2&&
  ['C3_B_VERIFIED_MEDIA_V1','C3_B_MEDIA_UNAVAILABLE_V1'].every(id=>m.recoveryFallbacks.filter(f=>f.id===id).length===1)&&
  m.recoveryFallbacks.every(f=>terminalFallback(f.id,f.text).disposition==='FALLBACK'&&sha256(f.text)===f.sha256),'RECOVERY_FALLBACK_IDENTITY');
 return m;
}
export function runtimeCase(sample){
 const r=sample.runtime;
 check(r&&Object.keys(r).every(k=>['latest','history','initialProductCodes'].includes(k)),'RUNTIME_FIELDS');
 check(typeof r.latest==='string'&&r.latest.trim()&&bytes(r.latest)<=2048&&Array.isArray(r.history)&&r.history.length<=8&&
  r.history.every(m=>m&&Object.keys(m).sort().join(',')==='role,text'&&['customer','shop'].includes(m.role)&&typeof m.text==='string')&&
  r.history.reduce((n,m)=>n+bytes(m.text),0)<=4096,'INPUT_BOUND');
 check(Array.isArray(r.initialProductCodes)&&r.initialProductCodes.length<=3&&r.initialProductCodes.every(c=>typeof c==='string'&&c.trim()&&bytes(c)<=128),'PRODUCT_BOUND');
 return structuredClone({latest:r.latest,history:r.history,initialProductCodes:r.initialProductCodes});
}
export function readRegisteredCases(path){
 const source=readFileSync(path),samples=JSON.parse(source.toString('utf8'));
 check(Array.isArray(samples)&&samples.length===REGISTERED_CASE_COUNT&&samples.every(c=>typeof c.caseId==='string'&&c.caseId.length>0&&c.caseId.length<=128)&&
  new Set(samples.map(c=>c.caseId)).size===REGISTERED_CASE_COUNT,'EXACT_TWENTY_FOUR_CASES_REQUIRED');
 check(samples.every(c=>['LIVE','POS_UNAVAILABLE'].includes(c.sourceMode??'LIVE')),'SOURCE_MODE');
 return {samples,inputs:samples.map(runtimeCase),hash:sha256(source)};
}
export function buildVerifierRequest(m,r){
 check(typeof r.finalDraft==='string'&&bytes(r.finalDraft)<=4096,'DRAFT_BOUND');
 const request={model:m.models.verifier.model,reasoning:{effort:m.models.verifier.effort},instructions:r.instructions,
  input:[{type:'message',role:'user',content:[{type:'input_text',text:JSON.stringify({requestIdentity:r.binding,turnTime:publicTurnTime(r.turnTime),trusted:r.trusted,
    untrusted:{latestCustomerMessage:r.latest,recentAcceptedDialogue:r.history,finalDraft:r.finalDraft}})}]}],
  tools:[],tool_choice:'none',parallel_tool_calls:false,store:false,stream:true,
  text:{format:{type:'json_schema',name:'semantic_egress_verdict',strict:true,schema:m.verdictSchema}}};
 check(bytes(request)<=32768,'VERIFIER_INPUT_BOUND');return request;
}
export function createCommerceVerifier(m,runModel=runCodexModel,onCheckpoint){
 validateProtocol(m);
 return async r=>{
  if(r.signal.aborted)throw new Error('PROVIDER_TIMEOUT');
  const wire=buildVerifierRequest(m,r);
  const telemetry=await runModel(m,'verifier',wire,{onCheckpoint: value=>onCheckpoint?.(r.generationId,value)});
  if(telemetry.status!=='OK')throw Object.assign(new Error(telemetry.status==='TIMEOUT'?'PROVIDER_TIMEOUT':'PROVIDER_ERROR'),{telemetry});
  return {result:telemetry.answer,telemetry};
 };
}
export function requiredSourceConfig(config,env=process.env){
 const missing=[];
 for(const name of ['REDIS_URL','QDRANT_BASE_URL','QDRANT_API_KEY'])if(!env[name])missing.push(name);
 if(!env.RUNTIME_POLICY_DATABASE_URL&&!env.DATABASE_URL)missing.push('RUNTIME_POLICY_DATABASE_URL or DATABASE_URL');
 if(!env.C3_VERTEX_CREDENTIAL_FILE||!existsSync(env.C3_VERTEX_CREDENTIAL_FILE))missing.push('C3_VERTEX_CREDENTIAL_FILE');
 for(const key of ['projectId','embeddingModel','embeddingLocation','embeddingDimension'])if(!config.vertex?.[key])missing.push('config.vertex.'+key);
 for(const key of ['scope','channel','qdrantCollection','searchThresholds'])if(!config[key])missing.push('config.'+key);
 if(!Number.isSafeInteger(config.maxFactAgeSeconds)||config.maxFactAgeSeconds<60||config.maxFactAgeSeconds>86400)missing.push('config.maxFactAgeSeconds');
 return missing;
}

// Small evaluation-only branch. Baseline 24 cases and runtime projection remain unchanged.
export function readImageComparisonCases(path){
 const source=readFileSync(path),samples=JSON.parse(source);
 check(Array.isArray(samples)&&samples.length===6&&new Set(samples.map(s=>s.caseId)).size===6,'EXACT_SIX_IMAGE_CASES_REQUIRED');
 check(samples.every(s=>typeof s.caseId==='string'&&s.caseId.length<=128&&(s.sourceMode??'LIVE')==='LIVE'&&s.runtime?.initialProductCodes?.length===1),'IMAGE_CASE_SCOPE');
 return {samples,inputs:samples.map(runtimeCase),hash:sha256(source)};
}
export function imageComparisonSlots(){
 return Array.from({length:6},(_,caseIndex)=>(caseIndex%2?['PRELOAD','CONTROL']:['CONTROL','PRELOAD']).map(arm=>({caseIndex,arm}))).flat();
}
export function prepareImageComparison(tools,{arm,subjectRef,pinned},telemetry){
 check(['CONTROL','PRELOAD'].includes(arm),'IMAGE_ARM');let prepared=false;
 return {...tools,async prepare(){
  if(prepared)return 0;prepared=true;
  const started=performance.now();telemetry.preloadCalls=0;
  try {
  const count=await tools.prepare?.()??0;
  if(arm==='PRELOAD'){
   check(tools.snapshot().boundSubjects.some(s=>s.kind==='PRODUCT'&&s.ref===subjectRef),'IMAGE_SUBJECT_BINDING');
   telemetry.preloadCalls++;
   const result=await tools.invoke({name:'view_product_media',args:{subjectRef,intent:'GENERIC'}});
   check(result.status==='OK','IMAGE_PRELOAD_UNAVAILABLE');
   const images=tools.catalogImages();check(images.length>0&&images.every(i=>i.subjectRef===subjectRef),'IMAGE_SUBJECT_BINDING');
   const metadata=images.map(({data,...identity})=>identity);
   check(sha256(JSON.stringify(metadata))===sha256(JSON.stringify(pinned)),'IMAGE_PIN_CHANGED');
   telemetry.images=metadata;telemetry.preparedBytes=images.reduce((n,i)=>n+Buffer.from(i.data,'base64').length,0);
  }
  telemetry.status='OK';return count;
  }catch(error){telemetry.status='ERROR';telemetry.reason=/^[A-Z0-9_]{1,80}$/.test(error.message)?error.message:'PREPARATION_UNAVAILABLE';throw error;}
  finally{telemetry.preparationLatencyMs=performance.now()-started;}
 }};
}
export function readImageComparisonRegistration(path,corpus){
 const bytes=readFileSync(path),r=JSON.parse(bytes);
 check(r.kind==='IMAGE_PRELOAD_VS_ON_DEMAND'&&r.corpusHash===corpus.hash&&r.registered===12&&r.repetitions===1&&r.maximumGenerationRequests===48&&r.retry===0,'IMAGE_REGISTRATION');
 check(JSON.stringify(r.slots)===JSON.stringify(imageComparisonSlots()),'IMAGE_SLOTS');
 check(Array.isArray(r.cases)&&r.cases.length===6&&r.cases.every((c,i)=>c.caseId===corpus.samples[i].caseId&&c.productCode===corpus.inputs[i].initialProductCodes[0]&&Array.isArray(c.images)&&c.images.length>0&&c.images.length<=2&&c.images.every(a=>a.subjectRef===c.productCode&&['sha256','downloadSha256','registrySha256'].every(k=>/^[a-f0-9]{64}$/.test(a[k])))),'IMAGE_REGISTRATION_BINDING');
 return {registration:r,hash:sha256(bytes)};
}
