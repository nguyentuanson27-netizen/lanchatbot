import {HandoffReasonV2Schema} from "@lana/contracts";
import {createHash} from "node:crypto";
export type CommerceDiagnosticStage="ARGUMENT_VALIDATION"|"CATALOG_READ"|"POS_READ"|"POLICY_READ"|"MEDIA_SELECT"|"MEDIA_FETCH"|"MEDIA_VALIDATE"|"RESULT_PROJECTION"|"RESULT_BOUND"|"CURRENT_READBACK"|"FINAL_GATE";
export interface CommerceDiagnostic {ordinal:number;parentOrdinal:number|null;stage:CommerceDiagnosticStage;operation:string|null;status:string;selectorHash:string;reason:string|null;resultBytes:number|null;resultHash:string|null}
export type CommerceDiagnosticObserver=(event:CommerceDiagnostic)=>void;
/** Candidate evaluation diagnostics only; never retain selectors, exception text or customer content. */
const reasons=new Set(["UNKNOWN_INTERNAL","OPTIONAL_PREPARATION_UNAVAILABLE","NO_VERIFIED_MATCHING_MEDIA","MEDIA_SOURCE_UNAVAILABLE","MEDIA_COLOR_BINDING_UNVERIFIED","SOURCE_ERROR","PRODUCT_BOUND","SUBJECT_BOUND","CLAIM_BOUND","TOOL_RESULT_BOUND","TOOL_ARGUMENTS_OR_REF","CAPABILITY_UNAVAILABLE","PERMISSION","SELECTION_UNAVAILABLE","CART_COLOR_REQUIRED","CART_SIZE_REQUIRED","SIZE_SOURCE_UNAVAILABLE","STATE_OR_REF","CURRENT_READBACK_UNAVAILABLE","SHOP_INFORMATION_HANDOFF_UNPROVED","SOURCE_EVIDENCE_CONFLICT","PRODUCT_EVIDENCE_BOUND"]);
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
  catch(error){emit(stage,"ERROR",selector,"UNKNOWN_INTERNAL",null,parent);throw error;}
 }};
}
export type CommerceDiagnostics=ReturnType<typeof commerceDiagnostics>;
