import {readFileSync} from 'node:fs';
import {createServiceAccountAssertion,vertexGenerateEndpoint} from '../../dist/vertex.js';

const requireThat=(ok,reason)=>{if(!ok)throw new Error(reason);};
const bytes=v=>Buffer.byteLength(typeof v==='string'?v:JSON.stringify(v));
const string={type:'STRING'};
export const readOnlyDeclarations=[
 {name:'search_products',description:'Tìm sản phẩm của shop; dùng ref trong kết quả để đọc sản phẩm.',parameters:{type:'OBJECT',properties:{query:string},required:['query']}},
 {name:'read_product',description:'Đọc dữ liệu, bảng size, giá và tồn của ref shop đã cấp. size là biến thể muốn xem tồn, không phải kết luận vừa người.',parameters:{type:'OBJECT',properties:{subjectRef:string,color:string,size:string},required:['subjectRef']}},
 {name:'read_policy',description:'Đọc chính sách hiện hành từ nguồn của shop.',parameters:{type:'OBJECT',properties:{}}},
];
export function buildGeminiCommerceRequest(request,declarations=readOnlyDeclarations){
 const c=request.context;
 const ownerView={subjects:c.boundSubjects,products:(c.runtimeProducts??[]).map(p=>({ref:p.ref,subjectRef:p.subjectRef,
   attributes:p.attributes?Object.fromEntries(Object.entries(p.attributes).filter(([k])=>!['schemaVersion','productId','metadata'].includes(k))):null,
   sizeCharts:p.sizeCharts??[]})),facts:c.protectedClaims.map(p=>({type:p.type,scope:p.scope,value:p.value})),
   policy:c.policyLiterals.map(p=>({ref:p.ref,text:p.text})),receipts:c.effectReceipts,
   state:Object.fromEntries(['currentProductId','consideredSize','salesStage','customerMeasurements','fitPreference','preferences']
     .filter(k=>Object.hasOwn(c.state,k)).map(k=>[k,c.state[k]]))};
 const body={systemInstruction:{parts:[{text:request.instructions}]},
  contents:[{role:'user',parts:[{text:JSON.stringify({trusted:ownerView})}]},...structuredClone(request.contents)],
  tools:[{functionDeclarations:declarations}],toolConfig:{functionCallingConfig:{mode:request.toolsAllowed===false?'NONE':'AUTO'}},
  generationConfig:{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}};
 requireThat(bytes(body)<=32768,'OWNER_REQUEST_BOUND');return body;
}
export function parseGeminiGeneration(body){
 const candidate=body?.candidates?.[0],content=candidate?.content;
 requireThat(body.candidates?.length===1&&candidate.finishReason==='STOP'&&content?.role==='model'&&Array.isArray(content.parts)&&content.parts.length>0,'OWNER_COMPLETION');
 const calls=content.parts.filter(p=>p.functionCall).map(p=>({name:p.functionCall.name,args:p.functionCall.args}));
 if(calls.length){requireThat(calls.length<=6&&calls.every(c=>typeof c.name==='string'&&c.args&&typeof c.args==='object'&&!Array.isArray(c.args)),'OWNER_TOOL_OUTPUT');
  return {kind:'TOOLS',calls,content:structuredClone(content)};}
 const text=content.parts.filter(p=>p.thought!==true&&typeof p.text==='string').map(p=>p.text).join('');
 requireThat(text.trim()&&bytes(text)<=4096,'OWNER_FINAL_BOUND');return {kind:'FINAL',text};
}
async function boundedJson(response,max){
 const reader=response.body?.getReader();requireThat(reader,'EMPTY_BODY');const chunks=[];let length=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;
   if(length>max){await reader.cancel();throw new Error('RESPONSE_BOUND');}chunks.push(Buffer.from(value));}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{reader.releaseLock();}
}
export function createGeminiCommerceInference(config,dependencies={}){
 requireThat(config.model==='gemini-3.5-flash-lite'&&config.effort==='high'&&config.location==='global','OWNER_MODEL_IDENTITY');
 const fetchImpl=dependencies.fetchImpl??fetch;let token=null;
 return async request=>{
  const telemetry={generationId:request.generationId,providerRequests:0,authRequests:0,httpStatus:null,modelVersion:null,
   inputTokens:null,outputTokens:null,cost:null};
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(config.timeoutMs??90000)]);
  try{
   const body=buildGeminiCommerceRequest(request,config.declarations??readOnlyDeclarations);
   if(!token||token.expiresAt-Date.now()<60000){
    if(dependencies.getToken)token={value:await dependencies.getToken(),expiresAt:Date.now()+3600000};
    else {
     const credential=JSON.parse(readFileSync(process.env.C3_VERTEX_CREDENTIAL_FILE,'utf8'));
     requireThat(credential.type==='service_account'&&credential.project_id===config.projectId,'CREDENTIAL_SCOPE');
     const assertion=createServiceAccountAssertion({email:credential.client_email,privateKey:credential.private_key},Date.now());
     telemetry.authRequests++;
     const auth=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal,
      headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
     if(!auth.ok){await auth.body?.cancel();throw new Error('AUTH_HTTP');}
     const data=await boundedJson(auth,65536);requireThat(typeof data.access_token==='string'&&data.access_token,'AUTH_INVALID');
     token={value:data.access_token,expiresAt:Date.now()+(data.expires_in??3600)*1000};
    }
   }
   telemetry.providerRequests++;
   const response=await fetchImpl(vertexGenerateEndpoint(config.projectId,'global',config.model),{method:'POST',redirect:'error',signal,
    headers:{authorization:'Bearer '+token.value,'content-type':'application/json'},body:JSON.stringify(body)});
   telemetry.httpStatus=response.status;
   if(!response.ok){if(response.status===401)token=null;await response.body?.cancel();throw new Error('GENERATION_HTTP');}
   const data=await boundedJson(response,1048576),u=data.usageMetadata;
   telemetry.modelVersion=data.modelVersion??null;
   telemetry.inputTokens=u?.promptTokenCount??null;
   telemetry.outputTokens=u?((u.candidatesTokenCount??0)+(u.thoughtsTokenCount??0)):null;
   telemetry.thinkingTokens=u?.thoughtsTokenCount??null;
   return {...parseGeminiGeneration(data),telemetry};
  }catch(error){throw Object.assign(new Error(error?.name==='AbortError'?'PROVIDER_TIMEOUT':'PROVIDER_ERROR'),{telemetry});}
 };
}
