// CountTokens only. Never calls generateContent, verifier, tools or delivery.
// API checked 2026-10-26: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.publishers.models/countTokens
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServiceAccountAssertion,vertexGenerateEndpoint} from '../../dist/vertex.js';
import {buildQuoteRequest,prepareQuoteDiagnostic} from './quote-presentation-diagnostic.mjs';
import {buildGeminiCommerceRequest} from './gemini-inference.mjs';
import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './feedback-run-identity.mjs';
import {sha256} from './protocol.mjs';

export function prepareCompactMeasurement(frozen,prompt){
 prepareQuoteDiagnostic(frozen,prompt);
 return frozen.records.flatMap(row=>['ORIGINAL','V1','V2'].map(variant=>{
  const req=buildQuoteRequest(row,'A','neutral',prompt);
  if(variant!=='ORIGINAL')req.ownerContextPresentation=variant==='V1'?'VI_DATA_BLOCKS_V1':'VI_DATA_BLOCKS_COMPACT_V2';
  const wire=buildGeminiCommerceRequest(req);
  const body={contents:wire.contents,systemInstruction:wire.systemInstruction,tools:wire.tools,generationConfig:wire.generationConfig};
  return {caseId:row.caseId,variant,wireBytes:Buffer.byteLength(JSON.stringify(wire)),wireHash:sha256(JSON.stringify(wire)),body,bodyHash:sha256(JSON.stringify(body))};
 }));
}
export async function countInputTokens({url,token,body,fetchImpl=fetch}){
 assert(url.endsWith(':countTokens'),'COUNT_ENDPOINT_ONLY');
 const response=await fetchImpl(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
 const raw=await response.text();assert(Buffer.byteLength(raw)<=65536,'COUNT_RESPONSE_BOUND');
 if(!response.ok)throw Object.assign(new Error('COUNT_HTTP'),{httpStatus:response.status});
 const value=JSON.parse(raw);assert(Number.isSafeInteger(value.totalTokens)&&value.totalTokens>=0,'COUNT_RESPONSE');
 return {httpStatus:response.status,value};
}
async function main(){
 const [out]=process.argv.slice(2);assert(out,'NEW_OUTPUT_REQUIRED');
 const identity=readFeedbackRunIdentity();assertCleanFeedbackSource(identity);
 assert.equal(identity.models.conversation.model,'gemini-3.5-flash-lite');
 const prompt=readFileSync(new URL('./prompts/owner.vi.txt',import.meta.url),'utf8'),frozen=JSON.parse(readFileSync(new URL('./quote-presentation-run-20261026/frozen-inputs.json',import.meta.url)));
 const prepared=prepareCompactMeasurement(frozen,prompt);assert.equal(prepared.length,24);
 mkdirSync(out);writeFileSync(resolve(out,'REGISTRATION.json'),JSON.stringify({identity,inputHash:frozen.hash,mode:'COUNT_TOKENS_ONLY_NO_GENERATION',maximumCountRequests:24,retry:0,generationRequests:0,
  registered:prepared.map(({body,...entry})=>entry)},null,2),{flag:'wx'});
 const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8')),config=JSON.parse(readFileSync(new URL('./source-config.b1.json',import.meta.url)));
 assert.equal(credential.type,'service_account');assert.equal(credential.project_id,config.vertex.projectId);
 const assertion=createServiceAccountAssertion({email:credential.client_email,privateKey:credential.private_key},Date.now());
 const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 assert(auth.ok,'COUNT_AUTH_HTTP');const authValue=await auth.json();assert(typeof authValue.access_token==='string'&&authValue.access_token,'COUNT_AUTH_INVALID');
 const url=vertexGenerateEndpoint(config.vertex.projectId,'global','gemini-3.5-flash-lite').replace(/:generateContent$/,':countTokens');
 const outcomes=[];
 for(const [i,p]of prepared.entries()){
  assertCleanFeedbackSource(identity);appendFileSync(resolve(out,'ACCOUNTING.jsonl'),JSON.stringify({number:i+1,phase:'DISPATCHED',bodyHash:p.bodyHash})+'\n');
  try{
   const result=await countInputTokens({url,token:authValue.access_token,body:p.body});
   outcomes.push({caseId:p.caseId,variant:p.variant,wireBytes:p.wireBytes,wireHash:p.wireHash,bodyHash:p.bodyHash,...result});
  }catch(e){outcomes.push({caseId:p.caseId,variant:p.variant,error:e.code??e.message,httpStatus:e.httpStatus??null});}
  writeFileSync(resolve(out,`count-${i+1}.json`),JSON.stringify(outcomes.at(-1),null,2),{flag:'wx'});
  // A count/auth/model capability failure stops measurement, never switches endpoint/model or retries.
  if(outcomes.at(-1).error)break;
 }
 assertCleanFeedbackSource(identity);
 const totals=Object.fromEntries(['ORIGINAL','V1','V2'].map(variant=>[variant,{completed:outcomes.filter(o=>o.variant===variant&&!o.error).length,
  inputTokens:outcomes.filter(o=>o.variant===variant&&!o.error).reduce((sum,o)=>sum+o.value.totalTokens,0),wireBytes:prepared.filter(p=>p.variant===variant).reduce((sum,p)=>sum+p.wireBytes,0)}]));
 const status=outcomes.length===24&&!outcomes.some(o=>o.error)?'COMPLETE':'BLOCKED_RETAIN_EVIDENCE';
 writeFileSync(resolve(out,'SUMMARY.json'),JSON.stringify({identity,status,countRequests:outcomes.length,notRun:24-outcomes.length,generationRequests:0,totals},null,2),{flag:'wx'});
 console.log(JSON.stringify({status,countRequests:outcomes.length,generationRequests:0,totals}));
 if(status!=='COMPLETE')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
