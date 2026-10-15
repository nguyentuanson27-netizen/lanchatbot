import {readFileSync} from 'node:fs';
import {createServiceAccountAssertion,vertexGenerateEndpoint} from '../../dist/vertex.js';
import {HandoffReasonV2Schema,canonicalJsonV1} from '@lana/contracts';

const requireThat=(ok,reason)=>{if(!ok)throw new Error(reason);};
const bytes=v=>Buffer.byteLength(typeof v==='string'?v:JSON.stringify(v));
const string={type:'STRING'};
export const readOnlyDeclarations=[
 {name:'search_products',description:'Tìm theo mã, tên hoặc nhu cầu; products.subjectRef dùng để đọc tiếp. MATCHED là tìm được mẫu; AMBIGUOUS chỉ là các gợi ý chưa xác định đúng mẫu khách hỏi, không chứng minh shop không có mẫu đó. Chỉ đọc tiếp khi còn cần giá, tồn hoặc chi tiết chưa có.',parameters:{type:'OBJECT',properties:{query:string},required:['query']}},
 {name:'read_product',description:'Đọc giá/tồn, mô tả và bảng size của sản phẩm. subjectRef lấy nguyên giá trị từ products.subjectRef hoặc subjects.subjectRef, không ghép thêm tiền tố. Chọn offerType theo món khách muốn mua từ availableOffers; null nghĩa chưa biết các lựa chọn bán, không phải không bán lẻ. size dùng xem tồn, không chứng minh mặc vừa. deliveryRegion là tỉnh/thành cần tra ETA, không phải địa chỉ. availability giữ trạng thái từng dữ kiện.',parameters:{type:'OBJECT',properties:{subjectRef:string,offerType:string,color:string,size:string,deliveryRegion:string},required:['subjectRef']}},
 {name:'read_policy',description:'Đọc quy định hiện hành của shop. Không đọc lịch sử đơn hoặc duyệt điều kiện đổi của riêng khách; orderEligibility=null nghĩa là chưa xét đơn.',parameters:{type:'OBJECT',properties:{}}},
];
export const stateDeclarations=[
 {name:'apply_customer_state',description:'Cập nhật đúng thông tin khách vừa cung cấp, sửa hoặc yêu cầu bỏ. Gọi trước các tool phụ thuộc thông tin đó.',parametersJsonSchema:{type:'object',additionalProperties:false,required:['ops'],properties:{ops:{type:'array',minItems:1,maxItems:8,items:{type:'object',additionalProperties:false,required:['op','field'],properties:{op:{type:'string',enum:['SET','REPLACE','CLEAR']},field:{type:'string',enum:['measurements.HEIGHT_CM','measurements.WEIGHT_KG','measurements.BUST_CM','measurements.WAIST_CM','measurements.HIPS_CM','fitPreference','preferences.colors','preferences.styles','preferences.materials']},value:{anyOf:[{type:'number'},{type:'string'},{type:'array',items:{type:'string'}}]}}}}}}},
 {name:'recommend_size',description:'Chọn size bằng hồ sơ khách đã được code nhận và bảng size của đúng sản phẩm. Thiếu đầu vào thì hỏi phần tool yêu cầu, chưa gợi size.',parameters:{type:'OBJECT',properties:{subjectRef:string},required:['subjectRef']}},
 {name:'quote_cart',description:'Tính tiền từ lựa chọn, giá, phí và ưu đãi hiện hành do code cấp. Không truyền tổng tiền hoặc tự chọn ưu đãi.',parameters:{type:'OBJECT',properties:{}}},
];
export const effectDeclarations=[
 {name:'add_to_cart',description:'Thêm lựa chọn khách muốn mua vào giỏ qua code; offerType chọn đúng cả set hoặc món lẻ từ nguồn. Chỉ báo đã thêm khi tool có kết quả commit thành công.',parameters:{type:'OBJECT',properties:{subjectRef:string,offerType:string,size:string,color:string,quantity:{type:'INTEGER',minimum:1,maximum:20}},required:['subjectRef']}},
 {name:'change_cart_item',description:'Đổi số lượng, size/màu của thành phần hoặc bỏ dòng giỏ bằng ref code đã cấp. Đổi size/màu dùng SET_COMPONENT_VARIANT, componentRole từ giỏ hiện tại và size/color khách chọn. Code kiểm biến thể, quyền và commit.',parameters:{type:'OBJECT',properties:{subjectRef:string,action:{type:'STRING',enum:['SET_QUANTITY','REMOVE_LINE','SET_COMPONENT_VARIANT']},quantity:{type:'INTEGER',minimum:1,maximum:20},size:string,color:string,componentRole:string},required:['subjectRef','action']}},
 {name:'confirm_purchase',description:'Gửi ý định xác nhận mua của tin khách hiện tại vào luồng checkout đã có. Cần preview, thông tin riêng tư và revalidation hợp lệ từ code; không tự tạo đơn POS.',parameters:{type:'OBJECT',properties:{}}},
];
export const handoffDeclarations=[
 {name:'request_handoff',description:'Đề nghị chuyển người khi khách yêu cầu gặp nhân viên, cần xử lý hậu mãi hoặc công việc ngoài khả năng hiện có. Hỏi quy định trước mua thì đọc policy và trả lời. Code quyết định rule, tag và tin báo; tool chỉ thành công sau commit và đọc lại kết quả. Không hứa đã chuyển trước kết quả.',parameters:{type:'OBJECT',properties:{reason:{type:'STRING',enum:HandoffReasonV2Schema.options.filter(r=>r!=='ADMIN_REQUEST')}},required:['reason']}},
];
export function buildGeminiCommerceRequest(request,declarations=readOnlyDeclarations){
 if(request.availableTools){
  const known=[...readOnlyDeclarations,...stateDeclarations,...effectDeclarations,...handoffDeclarations];
  declarations=request.availableTools.map(name=>{const d=known.find(d=>d.name===name);requireThat(d,'CAPABILITY_UNAVAILABLE');return d;});
 }
 const c=request.context;
 const subject=s=>({subjectRef:s.ref,kind:s.kind,label:s.label,...(s.productId?{productId:s.productId}:{})});
 const measurement=m=>({field:'measurements.'+m.kind,value:m.value});
 // The same current evidence is already in trusted. Keep older/different values and native model parts intact.
 const product=p=>{
  const value={...p};delete value.ref;
  const current=c.runtimeProducts?.find(x=>x.subjectRef===p.subjectRef);
  for(const key of ['content','attributes','presentation','sizeCharts']){
   if(value[key]!==undefined&&current?.[key]!==undefined&&canonicalJsonV1(value[key])===canonicalJsonV1(current[key]))delete value[key];
  }
  return value;
 };
 const contents=structuredClone(request.contents);
 for(const message of contents)for(const part of message.parts??[]){
  const response=part.functionResponse;
  const data=response?.response?.data;if(!data)continue;
  if(response.name==='search_products'){
   if(data.subjects)data.subjects=data.subjects.map(subject);
   if(data.products)data.products=data.products.map(product);
  }
  if(response.name==='read_product'){
   response.response.data=product(data);
   if(data.availability)response.response.data.availability=Object.fromEntries(Object.entries(data.availability).map(([field,value])=>[field,{status:value.status}]));
  }
  if(response.name==='apply_customer_state'&&data.measurements)data.measurements=data.measurements.map(measurement);
 }
 const state=Object.fromEntries(['currentProductId','consideredSize','salesStage','customerMeasurements','fitPreference','preferences','cartQuote','cartItems','checkoutStatus',
  'customerProfileId','customerProfileRevision','measurementFingerprint','sizeMeasurementFingerprints']
  .filter(k=>Object.hasOwn(c.state,k)).map(k=>[k,c.state[k]]));
 if(Array.isArray(state.customerMeasurements))state.customerMeasurements=state.customerMeasurements.map(measurement);
 const ownerView={subjects:c.boundSubjects.map(subject),products:(c.runtimeProducts??[]).map(p=>({subjectRef:p.subjectRef,
   attributes:p.attributes?Object.fromEntries(Object.entries(p.attributes).filter(([k])=>!['schemaVersion','productId','metadata'].includes(k))):null,
   content:p.content??null,presentation:p.presentation??null,sizeCharts:p.sizeCharts??[]})),facts:c.protectedClaims.map(p=>({type:p.type,scope:p.scope,value:p.value})),
   policy:c.policyLiterals.map(p=>({ref:p.ref,text:p.text})),receipts:c.effectReceipts,
   state,
   execution:{availableTools:request.toolsAllowed===false?[]:declarations.map(d=>d.name),toolBudget:request.toolBudget??null}};
 const body={systemInstruction:{parts:[{text:request.instructions}]},
  contents:[{role:'user',parts:[{text:JSON.stringify({trusted:ownerView})}]},...contents],
  tools:declarations.length?[{functionDeclarations:declarations}]:[],toolConfig:{functionCallingConfig:{mode:request.toolsAllowed===false?'NONE':'AUTO'}},
  generationConfig:{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}};
 requireThat(bytes(body)<=32768,'OWNER_REQUEST_BOUND');return body;
}
export function parseGeminiGeneration(body){
 const candidate=body?.candidates?.[0],content=candidate?.content;
 requireThat(body.candidates?.length===1&&candidate.finishReason==='STOP'&&content?.role==='model'&&Array.isArray(content.parts)&&content.parts.length>0,'OWNER_COMPLETION');
 requireThat(content.parts.every(p=>p&&typeof p==='object'&&Object.keys(p).every(k=>['text','thought','thoughtSignature','functionCall'].includes(k))&&
  (typeof p.text==='string'||p.functionCall)),'OWNER_OUTPUT_SURFACE');
 const calls=content.parts.filter(p=>p.functionCall).map(p=>({name:p.functionCall.name,args:p.functionCall.args,
  ...(typeof p.functionCall.id==='string'?{id:p.functionCall.id}:{})}));
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
   requireThat(telemetry.modelVersion===config.model,'OWNER_MODEL_VERSION');
   telemetry.inputTokens=u?.promptTokenCount??null;
   telemetry.outputTokens=u?((u.candidatesTokenCount??0)+(u.thoughtsTokenCount??0)):null;
   telemetry.thinkingTokens=u?.thoughtsTokenCount??null;
   return {...parseGeminiGeneration(data),telemetry};
  }catch(error){throw Object.assign(new Error(error?.name==='AbortError'?'PROVIDER_TIMEOUT':'PROVIDER_ERROR'),{telemetry});}
 };
}
