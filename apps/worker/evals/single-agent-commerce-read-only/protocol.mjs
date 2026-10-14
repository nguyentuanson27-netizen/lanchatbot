import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {runCodexModel} from '../single-agent-semantic-verifier/codex-inference.mjs';
const check=(ok,reason)=>{if(!ok)throw new Error(reason);};
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function dispatchRange(value=undefined){
 if(value===undefined)return {first:1,last:8};
 check(typeof value==='string'&&/^[1-8]:[1-8]$/.test(value),'DISPATCH_RANGE');
 const [first,last]=value.split(':').map(Number);check(first<=last,'DISPATCH_RANGE');return {first,last};
}
const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value));
export function validateProtocol(m){
 check(m.schemaVersion===1&&m.sendEnabled===false&&m.ownerGenerations===3&&m.toolRounds===2&&m.toolCalls===6&&m.verifierGenerations===1,'PROTOCOL');
 check(m.models.conversation.provider==='VERTEX_AI'&&m.models.conversation.model==='gemini-3.5-flash-lite'&&m.models.conversation.effort==='high'&&
  m.models.verifier.provider==='OPENAI'&&m.models.verifier.model==='gpt-6.1-sol'&&m.models.verifier.effort==='high'&&
  m.models.verifier.generationConfig.reasoningEffort==='high'&&m.models.verifier.generationConfig.retry===0,'MODEL_IDENTITY');
 const owner=m.models.conversation.generationConfig,v=m.models.verifier.generationConfig;
 check(m.models.conversation.version===m.models.conversation.model&&m.models.conversation.location==='global'&&
  owner.candidateCount===1&&owner.responseMimeType==='text/plain'&&owner.maxOutputTokens===8192&&owner.thinkingConfig.thinkingLevel==='HIGH'&&
  owner.thinkingConfig.includeThoughts===false&&owner.retry===0&&owner.timeoutMs===90000&&
  m.models.verifier.version===m.models.verifier.model&&v.timeoutMs===90000&&v.maxResponseBytes===1048576&&
  v.relayUpstreamRequestsPerAttempt===1&&v.endpoint==='https://chatgpt.com/backend-api/codex/responses'&&v.cliVersion==='0.159.2','GENERATION_CONFIG');
 for(const role of ['owner','verifier'])check(sha256(readFileSync(new URL('./prompts/'+role+'.vi.txt',import.meta.url)))===m.promptHashes[role],'PROMPT_HASH');
 check(sha256(JSON.stringify(m.verdictSchema))===m.schemaHash,'SCHEMA_HASH');
 check(m.fallback.id==='C3_A_NONPROTECTED_V2'&&m.fallback.text==='Phần này em chưa trả lời được, chị nhé.'&&sha256(m.fallback.text)===m.fallback.sha256,'FALLBACK_IDENTITY');
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
 check(Array.isArray(samples)&&samples.length===8&&samples.every(c=>typeof c.caseId==='string'&&c.caseId.length>0&&c.caseId.length<=128)&&
  new Set(samples.map(c=>c.caseId)).size===8,'EXACT_EIGHT_CASES_REQUIRED');
 check(samples.every(c=>['LIVE','POS_UNAVAILABLE'].includes(c.sourceMode??'LIVE')),'SOURCE_MODE');
 return {samples,inputs:samples.map(runtimeCase),hash:sha256(source)};
}
export function buildVerifierRequest(m,r){
 check(typeof r.finalDraft==='string'&&bytes(r.finalDraft)<=4096,'DRAFT_BOUND');
 const request={model:m.models.verifier.model,reasoning:{effort:m.models.verifier.effort},instructions:r.instructions,
  input:[{type:'message',role:'user',content:[{type:'input_text',text:JSON.stringify({requestIdentity:r.binding,trusted:r.trusted,
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
