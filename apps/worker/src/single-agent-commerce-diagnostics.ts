import {HandoffReasonV2Schema,SizeRecommendationStatusSchema} from "@lana/contracts";
import {createHash} from "node:crypto";
export type CommerceDiagnosticStage="ARGUMENT_VALIDATION"|"CATALOG_READ"|"POS_READ"|"POLICY_READ"|"MEDIA_SELECT"|"MEDIA_FETCH"|"MEDIA_VALIDATE"|"RESULT_PROJECTION"|"RESULT_BOUND"|"CURRENT_READBACK"|"FINAL_GATE";
export interface CommerceDiagnostic {ordinal:number;parentOrdinal:number|null;stage:CommerceDiagnosticStage;operation:string|null;status:string;selectorHash:string;reason:string|null;resultBytes:number|null;resultHash:string|null}
export type CommerceDiagnosticObserver=(event:CommerceDiagnostic)=>void;
/** Candidate evaluation diagnostics only; never retain selectors, exception text or customer content. */
const reasons=new Set(["UNKNOWN_INTERNAL","OPTIONAL_PREPARATION_UNAVAILABLE","NO_VERIFIED_MATCHING_MEDIA","MEDIA_SOURCE_UNAVAILABLE","MEDIA_COLOR_BINDING_UNVERIFIED","SOURCE_ERROR","PRODUCT_BOUND","SUBJECT_BOUND","CLAIM_BOUND","TOOL_RESULT_BOUND","TOOL_ARGUMENTS_OR_REF","CAPABILITY_UNAVAILABLE","PERMISSION","SELECTION_UNAVAILABLE","CART_COLOR_REQUIRED","CART_SIZE_REQUIRED","SIZE_SOURCE_UNAVAILABLE","STATE_OR_REF","CURRENT_READBACK_UNAVAILABLE","SHOP_INFORMATION_HANDOFF_UNPROVED","SOURCE_EVIDENCE_CONFLICT","PRODUCT_EVIDENCE_BOUND","MEDIA_ARGUMENTS_OR_REF","TOOL_ARGUMENTS","STATE_ARGUMENTS","MEDIA_PERMISSION","MEDIA_OBSERVATION_BOUND","MEDIA_BOUND","VISION_BOUND","MEDIA_MIME_INVALID","MEDIA_DIMENSION_BOUND","MEDIA_PREPARE_OUTPUT_INVALID","MEDIA_PREPARED_BYTE_BOUND"]);
const operations=new Set(["read_product","search_products","read_policy","recommend_size","apply_customer_state","add_to_cart","change_cart_item","confirm_purchase","record_negotiation","select_product_media","view_product_media","request_handoff","quote_cart","quote_product","PRODUCT","PROFILE","SALES_STATE","SIZE_SOURCE","CART_SELECTION","RECEIPT"]);
export function commerceDiagnostics(observe?:CommerceDiagnosticObserver){
 let ordinal=0;
 const emit=(stage:CommerceDiagnosticStage,status:string,selector:unknown,reason:string|null=null,resultBytes:number|null=null,parentOrdinal:number|null=null,resultHash:string|null=null):number|null=>{
  if(!observe||ordinal>=192)return null;
  const safeStatus=["STARTED","OK","ERROR","REJECTED","UNAVAILABLE","STALE","UNKNOWN","NOT_ADMITTED","SEND_ELIGIBLE","FALLBACK","HANDOFF","NO_SEND"].includes(status)?status:"UNKNOWN";
  const safeReason=reason===null?null:reasons.has(reason)||HandoffReasonV2Schema.safeParse(reason).success?reason:"UNKNOWN_INTERNAL";
  const data=selector&&typeof selector==='object'?selector as Record<string,unknown>:{};
  const name=data.tool??data.kind,operation=typeof name==='string'&&operations.has(name)?name:null;
  try{const n=++ordinal;observe({ordinal:n,parentOrdinal,stage,operation,status:safeStatus,selectorHash:createHash("sha256").update(JSON.stringify(selector??null)).digest("hex"),reason:safeReason,resultBytes,resultHash});return n;}catch{/* Instrumentation never changes an outcome. */return null;}
 };
 return {emit,async run<T>(stage:CommerceDiagnosticStage,selector:unknown,work:()=>Promise<T>):Promise<T>{
  const parent=emit(stage,"STARTED",selector);try{const result=await work();let size:number|null=null,hash:string|null=null;
   if(observe)try{const bytes=result instanceof Uint8Array?result:Buffer.from(JSON.stringify(result)??"null");size=bytes.length;hash=createHash("sha256").update(bytes).digest("hex");}catch{/* A diagnostic encoding failure never affects the source result. */}
   emit(stage,"OK",selector,null,size,parent,hash);return result;}
  catch(error){const code=error instanceof Error&&reasons.has(error.message)?error.message:'UNKNOWN_INTERNAL';emit(stage,"ERROR",selector,code,null,parent);throw error;}
 }};
}
export type CommerceDiagnostics=ReturnType<typeof commerceDiagnostics>;

/** Evaluator-only coverage. Never infer customer intent or change a handoff outcome. */
export interface CommerceReadCoverage {
 complete:boolean; declaredHandoffReason:string|null;
 records:{ordinal:number;operation:string;facet:string;selectorHash:string;status:"AVAILABLE"|"FAILED";reason:string|null;resultHash:string;engineOutcome?:string;sizeSourceHash?:string}[];
}
export function commerceReadCoverage(){
 const value:CommerceReadCoverage={complete:true,declaredHandoffReason:null,records:[]};
 const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v??null)).digest("hex");
 const observe=(call:{name:string;args:unknown},result:{status:string;reason?:string;data?:unknown})=>{
  try{
   const a=call.args&&typeof call.args==='object'?call.args as Record<string,unknown>:{};
   if(call.name==='request_handoff'){
    const parsed=HandoffReasonV2Schema.safeParse(a.reason);value.declaredHandoffReason=parsed.success?parsed.data:null;return;
   }
   if(!['read_product','read_policy','recommend_size','select_product_media','view_product_media','search_products'].includes(call.name))return;
   const data=result.data&&typeof result.data==='object'?result.data as Record<string,unknown>:{};
   const add=(facet:string,selector:unknown,available:boolean,reason=result.reason??null)=>{
    if(value.records.length>=192){value.complete=false;return;}
    value.records.push({ordinal:value.records.length+1,operation:call.name,facet,selectorHash:hash(selector),
     status:available?'AVAILABLE':'FAILED',reason:reason!==null&&(reasons.has(reason)||HandoffReasonV2Schema.safeParse(reason).success)?reason:reason===null?null:'UNKNOWN_INTERNAL',resultHash:hash(result)});
   };
   if(call.name==='read_product'){
    if(a.detailsOnly===true){add('METADATA',a,result.status==='OK');return;}
    const options=Array.isArray(data.sellingOptions)?data.sellingOptions as Record<string,unknown>[]:[];
    if(!options.length){for(const facet of ['PRICE','STOCK'])add(facet,a,false);return;}
    for(const o of options){
     const availability=o.availability as Record<string,{status:string}>|undefined;
     for(const facet of ['PRICE','STOCK'])add(facet,{subjectRef:a.subjectRef,offerType:o.offerType,color:a.color??null,size:a.size??null,deliveryRegion:a.deliveryRegion??null},result.status==='OK'&&availability?.[facet.toLowerCase()]?.status==='OK');
    }
    }else {
    add(call.name==='recommend_size'?'SIZE_ENGINE':call.name==='read_policy'?'POLICY':call.name==='search_products'?'DISCOVERY':'MEDIA',a,result.status==='OK');
    if(call.name==='recommend_size'&&value.complete){
     const last=value.records.at(-1)!,parsed=SizeRecommendationStatusSchema.safeParse(data.status);
     if(parsed.success)last.engineOutcome=parsed.data;
     if(typeof data.sizeSourceHash==='string'&&/^[a-f0-9]{64}$/.test(data.sizeSourceHash))last.sizeSourceHash=data.sizeSourceHash;
    }
   }
  }catch{value.complete=false;}
 };
 return {observe,observePrepared(context:{protectedClaims:unknown[];metadata?:{ref:string;text:string}[]}){
   for(const literal of context.metadata??[]){
    if(value.records.length>=192){value.complete=false;break;}
    try{const data=JSON.parse(literal.text);value.records.push({ordinal:value.records.length+1,operation:'prepare',facet:'METADATA',selectorHash:hash({subjectRef:data.productId}),status:'AVAILABLE',reason:null,resultHash:hash(literal)});}catch{value.complete=false;}
   }
   for(const item of context.protectedClaims){
    if(!item||typeof item!=='object')continue;const c=item as {type?:string;scope?:unknown};
    if(c.type!=='PRICE'&&c.type!=='STOCK')continue;
    if(value.records.length>=192){value.complete=false;break;}
    value.records.push({ordinal:value.records.length+1,operation:'prepare',facet:c.type,selectorHash:hash(c.scope),status:'AVAILABLE',reason:null,resultHash:hash(item)});
   }
  },snapshot:():CommerceReadCoverage=>structuredClone(value)};
}
