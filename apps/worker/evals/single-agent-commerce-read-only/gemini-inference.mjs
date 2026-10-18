import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServiceAccountAssertion,vertexGenerateEndpoint} from '../../dist/vertex.js';
import {HandoffReasonV2Schema,canonicalJsonV1} from '@lana/contracts';

const requireThat=(ok,reason)=>{if(!ok)throw new Error(reason);};
const bytes=v=>Buffer.byteLength(typeof v==='string'?v:JSON.stringify(v));
export const OWNER_REQUEST_MAX_BYTES=65536;
const safeFailureCodes=new Set(['CAPABILITY_UNAVAILABLE','OWNER_REQUEST_BOUND','CREDENTIAL_SCOPE','AUTH_HTTP','AUTH_INVALID','GENERATION_HTTP',
 'EMPTY_BODY','RESPONSE_BOUND','OWNER_MODEL_VERSION','OWNER_CANDIDATE_COUNT','OWNER_FINISH_REASON','OWNER_CONTENT_ROLE','OWNER_CONTENT_PARTS',
 'OWNER_OUTPUT_SURFACE','OWNER_TOOL_OUTPUT','OWNER_FINAL_EMPTY','OWNER_FINAL_BOUND']);
const safeFinishReasons=new Set(['FINISH_REASON_UNSPECIFIED','STOP','MAX_TOKENS','SAFETY','RECITATION','OTHER','BLOCKLIST','PROHIBITED_CONTENT','SPII','MODEL_ARMOR',
 'MALFORMED_FUNCTION_CALL','UNEXPECTED_TOOL_CALL','NO_IMAGE','IMAGE_SAFETY','IMAGE_PROHIBITED_CONTENT','IMAGE_RECITATION','IMAGE_OTHER']);
const publicSourceReasons=new Set(['POS_SNAPSHOT_UNAVAILABLE','CATALOG_SNAPSHOT_STALE','OFFER_NOT_FOUND','VARIANT_NOT_FOUND',
 'SIZE_UNSUPPORTED','PRICE_NOT_FOUND','FULFILLMENT_POLICY_NOT_FOUND','DELIVERY_REGION_REQUIRED','ETA_DATA_MISSING_OR_EXPIRED']);
const string={type:'STRING'};
export const readOnlyDeclarations=[
 {name:'search_products',description:'Tìm theo mã, tên hoặc nhu cầu; products.subjectRef dùng để đọc tiếp. MATCHED là tìm được mẫu; AMBIGUOUS chỉ là các gợi ý chưa xác định đúng mẫu khách hỏi, không chứng minh shop không có mẫu đó. Chỉ đọc tiếp khi còn cần giá, tồn hoặc chi tiết chưa có.',parameters:{type:'OBJECT',properties:{query:string},required:['query']}},
 {name:'read_product',description:'Đọc thông tin sản phẩm bằng PRODUCT subjectRef. Có offerType thì chỉ đọc lựa chọn đó. Bỏ offerType thì sellingOptions trả giá/tồn riêng từng lựa chọn bán; dữ kiện offer còn ở ngoài cùng chỉ thuộc offerType/variantId ghi tại đó, không phải giá chung cho áo lẻ và cả bộ. Có size/màu thì truyền ngay; size chỉ xem tồn, không chứng minh mặc vừa. deliveryRegion tra ETA. availability chỉ rõ dữ kiện nào đọc được; sellingOptions=null là chưa biết lựa chọn bán.',parameters:{type:'OBJECT',properties:{subjectRef:string,offerType:string,color:string,size:string,deliveryRegion:string},required:['subjectRef']}},
 {name:'read_policy',description:'Đọc quy định hiện hành của shop. Không đọc lịch sử đơn hoặc duyệt điều kiện đổi của riêng khách; orderEligibility=null nghĩa là chưa xét đơn.',parameters:{type:'OBJECT',properties:{}}},
];
export const stateDeclarations=[
 {name:'apply_customer_state',description:'Chỉ ghi thông tin khách mới cung cấp/sửa/bỏ trong tin hiện tại trước tool phụ thuộc. Hồ sơ đã nhận nằm trong state; không gửi lại số đo hoặc sourceQuote của history. field dùng nguyên đường dẫn enum, số đo có tiền tố measurements. sourceQuote trích nguyên văn ngắn chứa đúng một giá trị từ tin hiện tại; code kiểm trước khi ghi. Bị từ chối thì cả batch chưa ghi; xử lý đủ unresolvedFields trước khi xác nhận đã cập nhật.',parametersJsonSchema:{type:'object',additionalProperties:false,required:['ops'],properties:{ops:{type:'array',minItems:1,maxItems:8,items:{type:'object',additionalProperties:false,required:['op','field'],properties:{op:{type:'string',enum:['SET','REPLACE','CLEAR']},field:{type:'string',enum:['measurements.HEIGHT_CM','measurements.WEIGHT_KG','measurements.BUST_CM','measurements.WAIST_CM','measurements.HIPS_CM','fitPreference','preferences.colors','preferences.styles','preferences.materials']},value:{anyOf:[{type:'number'},{type:'string'},{type:'array',items:{type:'string'}}]},sourceQuote:{type:'string',minLength:1,maxLength:160}}}}}}},
 {name:'recommend_size',description:'Chọn size bằng hồ sơ khách đã được code nhận và bảng size của đúng sản phẩm. Thiếu đầu vào thì hỏi phần tool yêu cầu, chưa gợi size.',parameters:{type:'OBJECT',properties:{subjectRef:string},required:['subjectRef']}},
 {name:'quote_cart',description:'Tính tổng khi chưa có cartQuote cho lựa chọn hiện tại. add_to_cart/change_cart_item đã cấp cartQuote trong trusted.state thì dùng luôn, không gọi lại chỉ để đọc tổng. Giá, phí và ưu đãi do code cấp; không truyền tổng tiền hoặc tự chọn ưu đãi.',parameters:{type:'OBJECT',properties:{}}},
];
export const effectDeclarations=[
 {name:'add_to_cart',description:'Thêm món khách yêu cầu mua bằng PRODUCT subjectRef. Lấy offerType, size, color, quantity từ lựa chọn hiện tại của khách; phần không đổi giữ theo hội thoại/giỏ đã có. color chỉ là null khi khách thực sự chưa chọn màu, không bỏ màu đã nói hoặc tự chọn thay. Khách tự chọn size thì gọi tool này trực tiếp, không cần recommend_size hay read_product trước; code tự kiểm cấu hình, giá và tồn. Kết quả OK xác nhận thao tác, cartItems cho biết lựa chọn hiện tại và trạng thái hàng.',parameters:{type:'OBJECT',properties:{subjectRef:string,offerType:string,size:string,color:{type:'STRING',nullable:true},quantity:{type:'INTEGER',minimum:1,maximum:20}},required:['subjectRef','color']}},
 {name:'change_cart_item',description:'Sửa dòng giỏ bằng CART_LINE ref code cấp. Phần khách không đổi giữ từ cartItems/hội thoại; đổi size hoặc số lượng không bỏ màu đã chọn. SET_COMPONENT_VARIANT nhận componentRole và size/color; SET_QUANTITY chỉ nhận quantity; REMOVE_LINE không nhận field sửa. Đổi size/màu và số lượng thì gọi hai action trong cùng batch, mỗi action commit riêng. Không cần read_product trước vì code kiểm biến thể, giá/tồn, quyền và commit. Field lẫn action bị từ chối trước commit.',parameters:{type:'OBJECT',properties:{subjectRef:string,action:{type:'STRING',enum:['SET_QUANTITY','REMOVE_LINE','SET_COMPONENT_VARIANT']},quantity:{type:'INTEGER',minimum:1,maximum:20},size:string,color:string,componentRole:string},required:['subjectRef','action']}},
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
 declarations=structuredClone(declarations);
 for(const declaration of declarations){
  const kind=['read_product','recommend_size','add_to_cart'].includes(declaration.name)?'PRODUCT':declaration.name==='change_cart_item'?'CART_LINE':null;
  const refs=c.boundSubjects.filter(s=>s.kind===kind).map(s=>s.ref);
  if(refs.length)declaration.parameters.properties.subjectRef={type:'STRING',enum:[...new Set(refs)]};
 }
 const subject=s=>({...(['PRODUCT','CART_LINE'].includes(s.kind)?{subjectRef:s.ref}:{evidenceRef:s.ref}),kind:s.kind,label:s.label,...(s.productId?{productId:s.productId}:{})});
 const measurement=m=>({field:'measurements.'+m.kind,value:m.value});
 const availability=value=>Object.fromEntries(Object.entries(value).map(([field,v])=>[field,
  {status:v.status,reason:v.reason==null||v.reason==='POS_SNAPSHOT_UNAVAILABLE'?null:publicSourceReasons.has(v.reason)?v.reason:'SOURCE_UNAVAILABLE'}]));
 const facts=c.protectedClaims.map(p=>({type:p.type,scope:p.scope,value:p.value}));
 // The same current evidence is already in trusted. Keep older/different values and native model parts intact.
 const product=(p,keepLocalEvidence=false)=>{
  const value={...p};delete value.ref;delete value.requestedOfferType;delete value.missing;
  const current=c.runtimeProducts?.find(x=>x.subjectRef===p.subjectRef);
  for(const key of ['content','attributes','presentation','sizeCharts']){
   if(!keepLocalEvidence&&value[key]!==undefined&&current?.[key]!==undefined&&canonicalJsonV1(value[key])===canonicalJsonV1(current[key]))delete value[key];
  }
  return value;
 };
 const defaultInOptions=p=>{
  if(p.requestedOfferType!==null||!Array.isArray(p.sellingOptions)||p.sellingOptions.length<2||
   typeof p.offerType!=='string'||typeof p.variantId!=='string'||!Array.isArray(p.facts)||!p.facts.length)return false;
  const matches=p.sellingOptions.filter(o=>o.offerType===p.offerType&&o.variantId===p.variantId);
  if(matches.length!==1)return false;
  const option=matches[0],same=(a,b)=>canonicalJsonV1(a)===canonicalJsonV1(b);
  return Array.isArray(option.facts)&&p.facts.every(f=>option.facts.some(g=>same(f,g)))&&
   ['sourceVersion','observedAt','expiresAt','metadata'].every(k=>!Object.hasOwn(p,k)||Object.hasOwn(option,k)&&same(p[k],option[k]))&&
   Object.entries(p.availability??{}).every(([k,v])=>option.availability&&Object.hasOwn(option.availability,k)&&same(v,option.availability[k]));
 };
 const contents=structuredClone(request.contents);
 for(const message of contents)for(const part of message.parts??[]){
  const response=part.functionResponse;
  const data=response?.response?.data;if(!data)continue;
  if(response.name==='search_products'){
   if(data.subjects)data.subjects=data.subjects.map(subject);
   if(data.products)data.products=data.products.map(p=>product(p));
  }
  if(response.name==='read_product'){
   const partial=['price','stock'].some(field=>data.availability?.[field]&&data.availability[field].status!=='OK');
   response.response.data=product(data,partial);
   // Compare only raw evidence in this response, before availability reasons are sanitized.
   if(!partial&&defaultInOptions(data))for(const key of ['offerType','variantId','facts','availability'])delete response.response.data[key];
   if(response.response.data.availability)response.response.data.availability=availability(data.availability);
   if(Array.isArray(data.sellingOptions))response.response.data.sellingOptions=data.sellingOptions.map(o=>({...o,availability:availability(o.availability)}));
  }
  if(response.name==='apply_customer_state'&&data.measurements)data.measurements=data.measurements.map(measurement);
  if(['add_to_cart','change_cart_item','confirm_purchase'].includes(response.name)&&Array.isArray(data.cartItems))delete data.cart;
 }
 const state=Object.fromEntries(['currentProductId','consideredSize','salesStage','customerMeasurements','fitPreference','preferences','cartQuote','cartItems','checkoutStatus',
  'customerProfileId','customerProfileRevision','measurementFingerprint','sizeMeasurementFingerprints','customerStateUpdatePending']
  .filter(k=>Object.hasOwn(c.state,k)).map(k=>[k,c.state[k]]));
 if(Array.isArray(state.customerMeasurements))state.customerMeasurements=state.customerMeasurements.map(measurement);
 // Move only code-owned offer literals. Read/filter and verifier evidence remain intact.
 const products=new Map((c.runtimeProducts??[]).map(p=>[p.subjectRef,p])),offers=new Map(),offerRefs=new Set();
 for(const s of c.boundSubjects.filter(s=>s.kind==='PRODUCT')){
  const literal=c.policyLiterals.find(p=>p.ref===`offers:${s.ref}`);if(!literal)continue;
  const data=JSON.parse(literal.text);
  if(data.productId!==s.ref||!Array.isArray(data.availableOffers))continue;
  offers.set(s.ref,data.availableOffers);offerRefs.add(literal.ref);
  if(!products.has(s.ref))products.set(s.ref,{subjectRef:s.ref});
 }
 const ownerView={subjects:c.boundSubjects.map(subject),products:[...products.values()].map(p=>({subjectRef:p.subjectRef,
   availableOffers:offers.get(p.subjectRef)??null,
   attributes:p.attributes?Object.fromEntries(Object.entries(p.attributes).filter(([k])=>!['schemaVersion','productId','metadata'].includes(k))):null,
   content:p.content??null,presentation:p.presentation??null,sizeCharts:p.sizeCharts??[]})),facts,
   policy:c.policyLiterals.filter(p=>!offerRefs.has(p.ref)).map(p=>({ref:p.ref,text:p.text})),receipts:c.effectReceipts,
   state,
   execution:{availableTools:request.toolsAllowed===false?[]:declarations.map(d=>d.name),toolBudget:request.toolBudget??null}};
 const body={systemInstruction:{parts:[{text:request.instructions}]},
  contents:[{role:'user',parts:[{text:JSON.stringify({trusted:ownerView})}]},...contents],
  tools:request.toolsAllowed!==false&&declarations.length?[{functionDeclarations:declarations}]:[],toolConfig:{functionCallingConfig:{mode:request.toolsAllowed===false?'NONE':'AUTO'}},
  generationConfig:{candidateCount:1,responseMimeType:'text/plain',maxOutputTokens:8192,thinkingConfig:{thinkingLevel:'HIGH',includeThoughts:false}}};
 const requestBytes=bytes(body);
 if(requestBytes>OWNER_REQUEST_MAX_BYTES)throw Object.assign(new Error('OWNER_REQUEST_BOUND'),{requestBytes});
 return body;
}
export function parseGeminiGeneration(body){
 const candidate=body?.candidates?.[0],content=candidate?.content;
 requireThat(Array.isArray(body?.candidates)&&body.candidates.length===1,'OWNER_CANDIDATE_COUNT');
 requireThat(candidate?.finishReason==='STOP','OWNER_FINISH_REASON');
 requireThat(content?.role==='model','OWNER_CONTENT_ROLE');
 requireThat(Array.isArray(content.parts)&&content.parts.length>0,'OWNER_CONTENT_PARTS');
 requireThat(content.parts.every(p=>p&&typeof p==='object'&&Object.keys(p).every(k=>['text','thought','thoughtSignature','functionCall'].includes(k))&&
  (typeof p.text==='string'||p.functionCall)),'OWNER_OUTPUT_SURFACE');
 const calls=content.parts.filter(p=>p.functionCall).map(p=>({name:p.functionCall.name,args:p.functionCall.args,
  ...(typeof p.functionCall.id==='string'?{id:p.functionCall.id}:{})}));
 if(calls.length){requireThat(calls.length<=6&&calls.every(c=>typeof c.name==='string'&&c.args&&typeof c.args==='object'&&!Array.isArray(c.args)),'OWNER_TOOL_OUTPUT');
  return {kind:'TOOLS',calls,content:structuredClone(content)};}
 const text=content.parts.filter(p=>p.thought!==true&&typeof p.text==='string').map(p=>p.text).join('');
 requireThat(text.trim(),'OWNER_FINAL_EMPTY');requireThat(bytes(text)<=4096,'OWNER_FINAL_BOUND');return {kind:'FINAL',text};
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
   inputTokens:null,outputTokens:null,cost:null,finishReason:null};
  let stage='REQUEST';
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(config.timeoutMs??90000)]);
  try{
   const body=buildGeminiCommerceRequest(request,config.declarations??readOnlyDeclarations);
   const wire=JSON.stringify(body);
   telemetry.requestBytes=Buffer.byteLength(wire);telemetry.requestHash=createHash('sha256').update(wire).digest('hex');
   telemetry.functionCallingMode=body.toolConfig.functionCallingConfig.mode;
   telemetry.declaredToolCount=body.tools.reduce((n,tool)=>n+tool.functionDeclarations.length,0);
   if(!token||token.expiresAt-Date.now()<60000){
    stage='AUTH';
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
   stage='GENERATION';telemetry.providerRequests++;
   const response=await fetchImpl(vertexGenerateEndpoint(config.projectId,'global',config.model),{method:'POST',redirect:'error',signal,
    headers:{authorization:'Bearer '+token.value,'content-type':'application/json'},body:wire});
   telemetry.httpStatus=response.status;
   if(!response.ok){if(response.status===401)token=null;await response.body?.cancel();throw new Error('GENERATION_HTTP');}
   stage='RESPONSE';
   const data=await boundedJson(response,1048576),u=data.usageMetadata;
   telemetry.modelVersion=data.modelVersion??null;
   telemetry.inputTokens=u?.promptTokenCount??null;
   telemetry.outputTokens=u?((u.candidatesTokenCount??0)+(u.thoughtsTokenCount??0)):null;
   telemetry.thinkingTokens=u?.thoughtsTokenCount??null;
   const finish=data.candidates?.[0]?.finishReason;
   telemetry.finishReason=finish==null?null:safeFinishReasons.has(finish)?finish:'UNKNOWN';
   telemetry.rawFinishReason=typeof finish==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(finish)?finish:null;
   stage='COMPLETION';
   requireThat(telemetry.modelVersion===config.model,'OWNER_MODEL_VERSION');
   const parsed=parseGeminiGeneration(data);
   telemetry.unexpectedToolCall=request.toolsAllowed===false&&parsed.kind==='TOOLS';
   return {...parsed,telemetry};
  }catch(error){
   const timedOut=signal.aborted||error?.name==='AbortError'||error?.name==='TimeoutError';
   if(error?.message==='OWNER_REQUEST_BOUND'&&Number.isSafeInteger(error.requestBytes))telemetry.requestBytes=error.requestBytes;
   telemetry.failureStage=stage;
   telemetry.failureCode=timedOut?'TIMEOUT':safeFailureCodes.has(error?.message)?error.message:
    stage==='AUTH'?'AUTH_UNAVAILABLE':stage==='GENERATION'?'TRANSPORT_ERROR':stage==='RESPONSE'?'RESPONSE_INVALID':'UNKNOWN';
   throw Object.assign(new Error(timedOut?'PROVIDER_TIMEOUT':'PROVIDER_ERROR'),{telemetry});
  }
 };
}
