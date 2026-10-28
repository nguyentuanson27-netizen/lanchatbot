import type {CommerceTools} from "./single-agent-commerce-read-only.js";
import {toolArgs,type CommerceToolCall,type CommerceToolResult,type CommerceScope} from "./single-agent-commerce-read-only-tools.js";
import {commerceHash} from "./single-agent-commerce-read-only-context.js";
import type {ProtectedClaimV1} from "@lana/contracts";

export const EXPLICIT_QUOTE_TASK={version:"EXPLICIT_QUOTE_V1",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:2,standalone:true,maxPerTurn:1} as const;
export type ExplicitQuoteTask=typeof EXPLICIT_QUOTE_TASK;
export interface QuoteTaskWork {reservedUnits:2;readInvocations:number;selectionInvocations:number}
export function validateQuoteTask(value:unknown):asserts value is ExplicitQuoteTask {
 if(commerceHash(value)!==commerceHash(EXPLICIT_QUOTE_TASK))throw new Error("QUOTE_TASK_CONFIG");
}

/** One explicit owner action, not a classifier of customer text or generated prose. */
export function withExplicitQuoteTask(base:CommerceTools,scope:CommerceScope,firstContact:boolean|null):CommerceTools {
 const work:QuoteTaskWork[]=[],availableTools=[...(base.availableTools??[])];let attempted=false;
 if(firstContact===true&&["read_product","select_product_media","request_handoff"].every(n=>availableTools.includes(n)))availableTools.push("quote_product");
 const reject=(reason:string):CommerceToolResult=>({status:"REJECTED",reason});
 const fail=async(reason:string):Promise<CommerceToolResult>=>{
  if(!base.handoffStatus?.())await base.invoke({name:"request_handoff",args:{reason}});
  return {status:"UNAVAILABLE",reason};
 };
 async function quote(call:CommerceToolCall):Promise<CommerceToolResult>{
  if(attempted)return reject("QUOTE_ALREADY_ATTEMPTED");
  attempted=true;
  const record:QuoteTaskWork={reservedUnits:2,readInvocations:0,selectionInvocations:0};work.push(record);
  if(!availableTools.includes("quote_product"))return reject("CAPABILITY_UNAVAILABLE");
  const a=toolArgs(call.args,["subjectRef","offerTypes","color"]),context=base.snapshot();
  if(!context.state.permission||!context.state.privacyAllowed||context.state.conversationOwner!=="BOT"||
   context.state.bindingVersion!==scope.bindingVersion||context.state.recipient!==scope.recipient)return reject("QUOTE_AUTHORITY");
  if(!a||typeof a.subjectRef!=="string"||!context.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===a.subjectRef&&s.bindingVersion===scope.bindingVersion)||
   !Array.isArray(a.offerTypes)||a.offerTypes.length<1||a.offerTypes.length>2||a.offerTypes.some(x=>typeof x!=="string"||!x.trim())||new Set(a.offerTypes).size!==a.offerTypes.length||
   (a.color!==undefined&&(typeof a.color!=="string"||!a.color.trim()||Buffer.byteLength(a.color)>64)))return reject("QUOTE_ARGUMENTS_OR_REF");
  const literal=context.policyLiterals.find(p=>p.ref===`offers:${a.subjectRef}`);
  let offers:unknown;
  try{offers=literal?JSON.parse(literal.text).availableOffers:null;}catch{return reject("QUOTE_OFFERS_UNVERIFIED");}
  if(!Array.isArray(offers)||a.offerTypes.some(x=>!offers.includes(x)))return reject("QUOTE_OFFERS_UNVERIFIED");
  const invoke=async(name:string,args:unknown):Promise<CommerceToolResult>=>{
   if(name==="read_product")record.readInvocations++;else record.selectionInvocations++;
   try{return await base.invoke({name,args});}catch{return {status:"UNAVAILABLE",reason:"TOOL_ERROR"};}
  };
  const offerTypes=a.offerTypes as string[];
  const read=await invoke("read_product",{subjectRef:a.subjectRef,...(offerTypes.length===1?{offerType:offerTypes[0]}:{offerTypes}),...(a.color!==undefined?{color:a.color}:{})});
  if(read.status!=="OK"||!read.data||typeof read.data!=="object"){await fail("DEPENDENCY_FAILURE");return read;}
  const data=read.data as Record<string,unknown>;
  const options=(Array.isArray(data.sellingOptions)?data.sellingOptions:[]) as {offerType:string;availability?:{price?:{status:string}};facts?:{type:string;scope:unknown;value:unknown}[]}[];
  const current=base.snapshot();
  if(offerTypes.some(offer=>{
   const matches=options.filter(o=>o.offerType===offer),o=matches[0],prices=o?.facts?.filter(f=>f.type==="PRICE")??[];
   return matches.length!==1||o?.availability?.price?.status!=="OK"||prices.length!==1||!(current.protectedClaims as ProtectedClaimV1[]).some(c=>c.type==="PRICE"&&commerceHash({scope:c.scope,value:c.value})===commerceHash({scope:prices[0]!.scope,value:prices[0]!.value}));
  }))return fail("PRICE_UNAVAILABLE");
  const media=await invoke("select_product_media",{subjectRef:a.subjectRef,intent:"GENERIC",...(a.color!==undefined?{color:a.color}:{})});
  if(media.status!=="OK"||!media.data||typeof media.data!=="object"){await fail("DEPENDENCY_FAILURE");return media;}
  const m=media.data as Record<string,unknown>;
  if(m.subjectRef!==a.subjectRef||!Array.isArray(m.assets)||!m.assets.length)return fail("DEPENDENCY_FAILURE");
  return {status:"OK",data:{...data,quoteTaskStatus:"PREPARED_PENDING_FINAL_GATE",media:{...m}}};
 }
 return {...base,availableTools,toolWorkAccounting:"PRIMITIVE_WORK_V2",quoteTaskWork:()=>structuredClone(work),
  invoke:call=>call.name==="quote_product"?quote(call):base.invoke(call),
  invokeBatch:async calls=>calls.some(c=>c.name==="quote_product")
   ?calls.length===1?[await quote(calls[0]!)]:calls.map(()=>reject("QUOTE_STANDALONE_REQUIRED"))
   :base.invokeBatch(calls)};
}
