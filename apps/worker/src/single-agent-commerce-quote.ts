import type {CommerceTools} from "./single-agent-commerce-read-only.js";
import {toolArgs,type CommerceToolCall,type CommerceToolResult,type CommerceScope} from "./single-agent-commerce-read-only-tools.js";
import {commerceHash} from "./single-agent-commerce-read-only-context.js";
import {ProtectedClaimV1Schema,PRICE_INVENTORY_FRESH_FOR_SECONDS,type ProtectedClaimV1,type PolicyBundleV1} from "@lana/contracts";
import {evaluateShopPolicy} from "@lana/business-tools";
import {offerKind} from "./realtime-sales-catalog.js";

export const EXPLICIT_QUOTE_TASK={version:"EXPLICIT_QUOTE_V1",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:2,standalone:true,maxPerTurn:1} as const;
export type ExplicitQuoteTask=typeof EXPLICIT_QUOTE_TASK;
export interface QuoteTaskWork {reservedUnits:2;readInvocations:number;selectionInvocations:number}
export function validateQuoteTask(value:unknown):asserts value is ExplicitQuoteTask {
 if(commerceHash(value)!==commerceHash(EXPLICIT_QUOTE_TASK))throw new Error("QUOTE_TASK_CONFIG");
}

/** One explicit owner action, not a classifier of customer text or generated prose. */
export function withExplicitQuoteTask(base:CommerceTools,scope:CommerceScope,firstContact:boolean|null,
 policy?:()=>Promise<PolicyBundleV1>,clock:()=>Date=()=>new Date()):CommerceTools {
 const work:QuoteTaskWork[]=[],availableTools=[...(base.availableTools??[])];let attempted=false;
 let quoteRequest:{subjectRef:string;offerType:string;quantity:number;deliveryRegion:string|null}|null=null;
 let quoteLiteral:ReturnType<CommerceTools["snapshot"]>["policyLiterals"][number]|null=null;
 async function total(current:ReturnType<CommerceTools["snapshot"]>){
  if(!quoteRequest||!policy)return null;
  const p=await policy(),q=quoteRequest;
  const claims=current.protectedClaims.flatMap(c=>{const r=ProtectedClaimV1Schema.safeParse(c);return r.success?[r.data]:[];});
  const candidates=claims.filter((c):c is Extract<ProtectedClaimV1,{type:"PRICE"}>=>c.type==="PRICE"&&c.scope.kind==="PRODUCT"&&c.scope.productId===q.subjectRef&&
   c.scope.variantId===`offer:${q.subjectRef}:${q.offerType}`);
  if(candidates.length!==1)return null;
  const price=candidates[0]!,at=clock(),kind=offerKind(q.offerType,1);
  if(!price.provenance.expiresAt||Date.parse(price.provenance.expiresAt)<=at.getTime())return null;
  const result=evaluateShopPolicy({policy:p,lines:[{lineId:"pre-cart-selection",shopId:scope.shopId,parentProductId:q.subjectRef,offerKind:kind,quantity:q.quantity,
   priceEvidence:{authority:"PANCAKE_POS",shopId:scope.shopId,parentProductId:q.subjectRef,offerKind:kind,sourceVersion:price.provenance.sourceVersion,
    // The calculator's canonical POS policy uses 48h from the original source
    // clock; the quote proof below retains the stricter runtime claim expiry.
    observedAt:price.provenance.observedAt,expiresAt:new Date(Date.parse(price.provenance.observedAt)+PRICE_INVENTORY_FRESH_FOR_SECONDS*1000).toISOString(),
    freshForSeconds:PRICE_INVENTORY_FRESH_FOR_SECONDS,unitPriceVnd:price.value.amountVnd}}],
   closingEvidence:{previousState:null,purchaseReady:false,priceObjectionCount:0,secondConcessionAlreadyApplied:false},now:at,authorizationNow:at});
  if(result.status!=="AUTHORIZED")return null;
  const evidence={kind:"PRE_CART_TOTAL_V1",...q,subtotalVnd:result.subtotalVnd,shippingFeeVnd:result.shippingFeeVnd,
   discountTotalVnd:result.discountTotalVnd,grandTotalVnd:result.grandTotalVnd,priceHash:commerceHash(price),policyHash:commerceHash(p),
   cartStateHash:commerceHash({binding:current.cartBinding??null,items:current.state.cartItems??[]}),bindingVersion:current.state.bindingVersion,recipient:current.state.recipient};
  const hash=commerceHash(evidence),expiry=Math.min(Date.parse(price.provenance.expiresAt!),p.effectiveUntil?Date.parse(p.effectiveUntil):Infinity);
  quoteLiteral={ref:`pre-cart-quote:${hash}`,text:JSON.stringify(evidence),sourceVersion:hash,observedAt:price.provenance.observedAt,expiresAt:new Date(expiry).toISOString()};
  return evidence;
 }
 const withQuote=(current:ReturnType<CommerceTools["snapshot"]>)=>quoteLiteral?{...current,policyLiterals:[...current.policyLiterals,quoteLiteral]}:current;
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
  const a=toolArgs(call.args,["subjectRef","offerTypes","color","quantity","deliveryRegion"]),context=base.snapshot();
  if(!context.state.permission||!context.state.privacyAllowed||context.state.conversationOwner!=="BOT"||
   context.state.bindingVersion!==scope.bindingVersion||context.state.recipient!==scope.recipient)return reject("QUOTE_AUTHORITY");
  if(!a||typeof a.subjectRef!=="string"||!context.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===a.subjectRef&&s.bindingVersion===scope.bindingVersion)||
   !Array.isArray(a.offerTypes)||a.offerTypes.length<1||a.offerTypes.length>2||a.offerTypes.some(x=>typeof x!=="string"||!x.trim())||new Set(a.offerTypes).size!==a.offerTypes.length||
   (a.color!==undefined&&(typeof a.color!=="string"||!a.color.trim()||Buffer.byteLength(a.color)>64))||
   (a.quantity!==undefined&&(!Number.isInteger(a.quantity)||Number(a.quantity)<1||Number(a.quantity)>100))||
   (a.deliveryRegion!==undefined&&(typeof a.deliveryRegion!=="string"||!a.deliveryRegion.trim()||Buffer.byteLength(a.deliveryRegion)>128))||
   ((a.quantity!==undefined||a.deliveryRegion!==undefined)&&(a.offerTypes.length!==1||!policy)))return reject("QUOTE_ARGUMENTS_OR_REF");
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
  let preCartQuote:unknown=null;
  if(a.quantity!==undefined||a.deliveryRegion!==undefined){quoteRequest={subjectRef:a.subjectRef,offerType:offerTypes[0]!,quantity:Number(a.quantity??1),deliveryRegion:typeof a.deliveryRegion==="string"?a.deliveryRegion:null};
   preCartQuote=await total(base.snapshot());if(!preCartQuote)return fail("PRICE_UNAVAILABLE");}
  return {status:"OK",data:{...data,quoteTaskStatus:"PREPARED_PENDING_FINAL_GATE",media:{...m},...(preCartQuote?{preCartQuote}:{})}};
 }
 return {...base,availableTools,toolWorkAccounting:"PRIMITIVE_WORK_V2",quoteTaskWork:()=>structuredClone(work),
  snapshot:()=>withQuote(base.snapshot()),readback:async()=>{const current=await base.readback();if(quoteRequest){quoteLiteral=null;await total(current);}return withQuote(current);},
  invoke:call=>call.name==="quote_product"?quote(call):base.invoke(call),
  invokeBatch:async calls=>calls.some(c=>c.name==="quote_product")
   ?calls.length===1?[await quote(calls[0]!)]:calls.map(()=>reject("QUOTE_STANDALONE_REQUIRED"))
   :base.invokeBatch(calls)};
}
