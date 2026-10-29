import {createHash} from "node:crypto";
export type CommerceDiagnosticStage="ARGUMENT_VALIDATION"|"CATALOG_READ"|"POS_READ"|"POLICY_READ"|"MEDIA_SELECT"|"MEDIA_FETCH"|"MEDIA_VALIDATE"|"RESULT_PROJECTION"|"RESULT_BOUND"|"CURRENT_READBACK"|"FINAL_GATE";
export interface CommerceDiagnostic {ordinal:number;parentOrdinal:number|null;stage:CommerceDiagnosticStage;status:string;selectorHash:string;reason:string|null;resultBytes:number|null;resultHash:string|null}
export type CommerceDiagnosticObserver=(event:CommerceDiagnostic)=>void;
/** Candidate evaluation diagnostics only; never retain selectors, exception text or customer content. */
export function commerceDiagnostics(observe?:CommerceDiagnosticObserver){
 let ordinal=0;
 const emit=(stage:CommerceDiagnosticStage,status:string,selector:unknown,reason:string|null=null,resultBytes:number|null=null,parentOrdinal:number|null=null,resultHash:string|null=null):number|null=>{
  if(!observe||ordinal>=192)return null;
  const safeStatus=["STARTED","OK","ERROR","REJECTED","UNAVAILABLE","STALE","UNKNOWN","NOT_ADMITTED","SEND_ELIGIBLE","FALLBACK","HANDOFF","NO_SEND"].includes(status)?status:"UNKNOWN";
  const safeReason=reason===null?null:["UNKNOWN_INTERNAL","OPTIONAL_PREPARATION_UNAVAILABLE"].includes(reason)?reason:"UNKNOWN_INTERNAL";
  try{const n=++ordinal;observe({ordinal:n,parentOrdinal,stage,status:safeStatus,selectorHash:createHash("sha256").update(JSON.stringify(selector??null)).digest("hex"),reason:safeReason,resultBytes,resultHash});return n;}catch{/* Instrumentation never changes an outcome. */return null;}
 };
 return {emit,async run<T>(stage:CommerceDiagnosticStage,selector:unknown,work:()=>Promise<T>):Promise<T>{
  const parent=emit(stage,"STARTED",selector);try{const result=await work();let size:number|null=null,hash:string|null=null;
   if(observe)try{const bytes=result instanceof Uint8Array?result:Buffer.from(JSON.stringify(result)??"null");size=bytes.length;hash=createHash("sha256").update(bytes).digest("hex");}catch{/* A diagnostic encoding failure never affects the source result. */}
   emit(stage,"OK",selector,null,size,parent,hash);return result;}
  catch(error){emit(stage,"ERROR",selector,"UNKNOWN_INTERNAL",null,parent);throw error;}
 }};
}
export type CommerceDiagnostics=ReturnType<typeof commerceDiagnostics>;
