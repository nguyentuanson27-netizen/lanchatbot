import type {TrustedContext} from "./single-agent-semantic-verifier-boundary.js";
import type {CommerceTools} from "./single-agent-commerce-read-only.js";
import {toolArgs,type CommerceToolCall,type CommerceToolResult,type CommerceScope,type QuotePriceQuery,type QuotePriceEvidence} from "./single-agent-commerce-read-only-tools.js";
import {commerceHash} from "./single-agent-commerce-read-only-context.js";
import {ProtectedClaimV1Schema,CustomerPreferenceV1Schema,PRICE_INVENTORY_FRESH_FOR_SECONDS,type ProtectedClaimV1,type PolicyBundleV1} from "@lana/contracts";
import {evaluateShopPolicy} from "@lana/business-tools";
import {decodeCommerceMediaArgs} from "./single-agent-commerce-media.js";
import {offerKind} from "./realtime-sales-catalog.js";
import {normalizeCatalogToken} from "@lana/business-tools";
import {validSelectionEvidence,selectionChoiceResolution} from "./single-agent-commerce-selection-evidence.js";

export const EXPLICIT_QUOTE_TASK={version:"EXPLICIT_QUOTE_V3",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:1,readOnlyBatch:false,maxPerTurn:2} as const;
export type ExplicitQuoteTask=typeof EXPLICIT_QUOTE_TASK;
export interface QuoteTaskWork {reservedUnits:1;readInvocations:number;selectionInvocations:number}
export function validateQuoteTask(value:unknown):asserts value is ExplicitQuoteTask {
 if(commerceHash(value)!==commerceHash(EXPLICIT_QUOTE_TASK))throw new Error("QUOTE_TASK_CONFIG");
}
const boundedText=(v:unknown,n:number):v is string=>typeof v==="string"&&!!v.trim()&&Buffer.byteLength(v)<=n;
const isWriter=(c:CommerceToolCall)=>["apply_customer_state","record_negotiation"].includes(c.name)||
 (c.name==="read_product"&&(c.args as {customerSelected?:unknown}|null)?.customerSelected===true);
function batchShape(c:CommerceToolCall):boolean {
 const fields:Record<string,string[]>={quote_product:["subjectRef","offerTypes","color","quantity","deliveryRegion"],read_product:["subjectRef","offerType","offerTypes","detailsOnly","color","size","deliveryRegion","customerSelected"],
  read_policy:[],apply_customer_state:["ops"],record_negotiation:["intent","sourceQuote"],select_product_media:["subjectRef","intent","color","componentRole","deliveryMode","requiredEvidence"],view_product_media:["subjectRef","intent","color","componentRole","requiredEvidence"]};
 if(!fields[c.name])return false;const a=toolArgs(c.args,fields[c.name]!);if(!a)return false;
 if(c.name==="read_policy")return true;
 if(c.name==="apply_customer_state")return Array.isArray(a.ops)&&a.ops.length>0&&a.ops.length<=8&&a.ops.every(o=>{
  const op=toolArgs(o,["op","field","value","sourceQuote"]);
  if(!op||!["SET","REPLACE","CLEAR"].includes(String(op.op))||!boundedText(op.field,128)||
   !["measurements.HEIGHT_CM","measurements.WEIGHT_KG","measurements.BUST_CM","measurements.WAIST_CM","measurements.HIPS_CM","fitPreference","preferences.colors","preferences.styles","preferences.materials"].includes(op.field)||
   op.sourceQuote!==undefined&&(typeof op.sourceQuote!=="string"||!op.sourceQuote.trim()||op.sourceQuote.length>160))return false;
  if(op.op==="CLEAR")return !Object.hasOwn(op,"value");
  if(op.field.startsWith("preferences."))return CustomerPreferenceV1Schema.shape.colors.safeParse(op.value).success;
  return typeof op.sourceQuote==="string"&&!!op.sourceQuote.trim()&&op.sourceQuote.length<=160&&(op.field==="fitPreference"?["FITTED","REGULAR","RELAXED"].includes(String(op.value)):typeof op.value==="number"&&Number.isFinite(op.value));
 });
 if(c.name==="record_negotiation")return ["PRICE_OBJECTION","PURCHASE_READY"].includes(String(a.intent))&&boundedText(a.sourceQuote,512);
 if(c.name==="select_product_media"||c.name==="view_product_media")return decodeCommerceMediaArgs(a)!==null;
 if(!boundedText(a.subjectRef,128))return false;
 for(const [k,n]of [["color",64],["size",16],["deliveryRegion",128]] as const)if(a[k]!==undefined&&!boundedText(a[k],n))return false;
 if(c.name==="quote_product")return Array.isArray(a.offerTypes)&&a.offerTypes.length>=1&&a.offerTypes.length<=2&&a.offerTypes.every(v=>boundedText(v,64))&&
  new Set(a.offerTypes).size===a.offerTypes.length&&(a.quantity===undefined||Number.isInteger(a.quantity)&&Number(a.quantity)>=1&&Number(a.quantity)<=100);
 if(a.customerSelected!==undefined&&a.customerSelected!==true)return false;
 if(a.detailsOnly!==undefined)return a.detailsOnly===true&&a.offerType===undefined&&a.offerTypes===undefined&&a.customerSelected===undefined&&a.color===undefined&&a.size===undefined&&a.deliveryRegion===undefined;
 return a.offerTypes!==undefined?Array.isArray(a.offerTypes)&&a.offerTypes.length>=2&&a.offerTypes.length<=3&&a.offerTypes.every(v=>boundedText(v,64))&&
  new Set(a.offerTypes).size===a.offerTypes.length&&a.offerType===undefined&&a.customerSelected===undefined:boundedText(a.offerType,64);
}
/** Closed writer-first quote sequence. Runtime ports still validate live scope and authority. */
export function quoteBatchWork(calls:readonly CommerceToolCall[]):{units:number;targets:string[];quotes:number}|null {
 const quotes=calls.filter(c=>c.name==="quote_product");
 if(!quotes.length)return {units:calls.length,targets:[],quotes:0};
 const writers=calls.filter(isWriter);
 if(quotes.length>2||writers.length>1||writers.length===1&&calls[0]!==writers[0]||calls.some(c=>!batchShape(c)))return null;
 const targets=quotes.flatMap(c=>(c.args as {subjectRef:string;offerTypes:string[]}).offerTypes.map(o=>JSON.stringify([(c.args as {subjectRef:string}).subjectRef,o])));
 if(new Set(targets).size!==targets.length)return null;
 return {units:calls.length,targets,quotes:quotes.length};
}

/** One explicit owner action, not a classifier of customer text or generated prose. */
export function withExplicitQuoteTask(base:CommerceTools,scope:CommerceScope,firstContact:boolean|null,
 policy?:()=>Promise<PolicyBundleV1>,clock:()=>Date=()=>new Date()):CommerceTools {
 const work:QuoteTaskWork[]=[],availableTools=[...(base.availableTools??[])],attemptedTargets=new Set<string>();let attempts=0;
 type QuoteRequest={subjectRef:string;offerType:string;quantity:number;deliveryRegion:string|null;color?:string};
 function currentCartRef(current:TrustedContext,q:{subjectRef:string;offerType:string;quantity?:number|undefined;color?:string}){
  const cart=current.state.cartQuote as {cartId?:string;cartVersion?:number}|undefined,items=current.state.cartItems;
  if(!cart||!current.cartBinding||current.cartBinding.cartId!==cart.cartId||current.cartBinding.cartVersion!==cart.cartVersion||
   q.quantity===undefined||!Array.isArray(items)||items.length!==1)return null;
  const line=items[0];
  return line.productRef===q.subjectRef&&line.offerType===q.offerType&&line.quantity===q.quantity&&
   (q.color===undefined||Array.isArray(line.components)&&line.components.length>0&&line.components.every((c:{color?:string})=>typeof c.color==="string"&&normalizeCatalogToken(c.color)===normalizeCatalogToken(q.color!)))?commerceHash(cart):null;
 }
 const openingProofs=new Map<string,TrustedContext["policyLiterals"][number]>();
 const priceProofs=new Map<string,{query:QuotePriceQuery;evidence:readonly QuotePriceEvidence[];literal:TrustedContext["policyLiterals"][number]}>();
 const sourcePrices=(query:QuotePriceQuery)=>{
  const values=base.quotePriceEvidence?.(query)??[],now=clock().getTime();
  if(values.length!==query.offerTypes.length||query.offerTypes.some(o=>values.filter(v=>v.offerType===o).length!==1))return [];
  return values.every(v=>{
   const parsed=ProtectedClaimV1Schema.safeParse(v.claim),p=parsed.success&&parsed.data.type==="PRICE"?parsed.data:null;
   return p&&p.scope.kind==="PRODUCT"&&p.scope.productId===query.subjectRef&&p.scope.variantId===`offer:${query.subjectRef}:${v.offerType}`&&
    !!p.provenance.expiresAt&&Date.parse(p.provenance.observedAt)<=now&&Date.parse(p.provenance.expiresAt)>now&&Date.parse(v.expiresAt)>now&&Date.parse(v.observedAt)<=now;
  })?values:[];
 };
 const quoteRequests=new Map<string,QuoteRequest>(),quoteLiterals=new Map<string,ReturnType<CommerceTools["snapshot"]>["policyLiterals"][number]>();
 async function total(current:ReturnType<CommerceTools["snapshot"]>,q:QuoteRequest){
  if(!policy)return null;
  const key=JSON.stringify([q.subjectRef,q.offerType]);quoteLiterals.delete(key);
  const p=await policy();
  const candidates=sourcePrices({subjectRef:q.subjectRef,offerTypes:[q.offerType],...(q.color?{color:q.color}:{})}).map(v=>v.claim);
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
  const evidence={kind:"PRE_CART_TOTAL_V1",calculationBasis:"PRE_CART_POLICY",appliesNegotiationReceipt:false,
   negotiationAssessment:"NOT_EVALUATED",
   standardPromotion:{status:result.adjustments.some(a=>a.ruleId==="SHOP_WIDE_MULTI_ITEM_PERCENT")?"APPLIED":"NOT_APPLIED",
    parentProductUnits:result.parentProductUnitCount,
    minimumParentProductUnits:p.multiItemOffer.minimumProductCount,discountBps:p.multiItemOffer.discountBps,
    countingUnit:p.multiItemOffer.countingUnit,setAndComboCountAsOne:p.multiItemOffer.setAndComboCountAsOne},
   currentCartQuoteRef:currentCartRef(current,q),...q,subtotalVnd:result.subtotalVnd,shippingFeeVnd:result.shippingFeeVnd,
   discountTotalVnd:result.discountTotalVnd,grandTotalVnd:result.grandTotalVnd,priceHash:commerceHash(price),policyHash:commerceHash(p),
   cartStateHash:commerceHash({binding:current.cartBinding??null,items:current.state.cartItems??[]}),bindingVersion:current.state.bindingVersion,recipient:current.state.recipient};
  const hash=commerceHash(evidence),expiry=Math.min(Date.parse(price.provenance.expiresAt!),p.effectiveUntil?Date.parse(p.effectiveUntil):Infinity);
  quoteLiterals.set(key,{ref:`pre-cart-quote:${hash}`,text:JSON.stringify(evidence),sourceVersion:hash,observedAt:price.provenance.observedAt,expiresAt:new Date(expiry).toISOString()});
  return evidence;
 }
 const withQuote=(current:ReturnType<CommerceTools["snapshot"]>)=>({...current,policyLiterals:[...current.policyLiterals,...[...priceProofs.values()].map(v=>v.literal),...quoteLiterals.values(),...openingProofs.values()]});
 // Returning totals reuse the same bounded read/policy calculation, without
 // turning a later price question into another opening image task.
 const opening=firstContact===true,followUp=firstContact===false&&!!policy;
 if(["read_product","request_handoff"].every(n=>availableTools.includes(n))&&
  (opening&&availableTools.includes("select_product_media")||followUp))availableTools.push("quote_product");
 const reject=(reason:string):CommerceToolResult=>({status:"REJECTED",reason});
 const knownBatch=(calls:readonly CommerceToolCall[])=>{
  const c=base.snapshot();
  return calls.every(call=>{
   const a=call.args as Record<string,unknown>;
   if(typeof a.subjectRef!=="string")return true;
   if(!c.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===a.subjectRef&&s.bindingVersion===scope.bindingVersion))return false;
   if(!["quote_product","read_product"].includes(call.name)||a.detailsOnly===true)return true;
   if(call.name==="quote_product"&&(
    (!opening&&(a.quantity===undefined||(a.offerTypes as unknown[]).length!==1))||
    (a.quantity!==undefined||a.deliveryRegion!==undefined)&&((a.offerTypes as unknown[]).length!==1||!policy)))return false;
   try{
    const offers=JSON.parse(c.policyLiterals.find(p=>p.ref===`offers:${a.subjectRef}`)?.text??"null")?.availableOffers;
    const wanted=Array.isArray(a.offerTypes)?a.offerTypes:[a.offerType];
    return Array.isArray(offers)&&wanted.every(o=>offers.includes(o));
   }catch{return false;}
  });
 };
 const fail=async(reason:string):Promise<CommerceToolResult>=>{
  if(!base.handoffStatus?.())await base.invoke({name:"request_handoff",args:{reason}});
  return {status:"UNAVAILABLE",reason};
 };
 async function quote(call:CommerceToolCall):Promise<CommerceToolResult>{
  const batch=quoteBatchWork([call]);
  if(!batch)return reject("QUOTE_ARGUMENTS_OR_REF");
  if(attempts>=2||batch.targets.some(t=>attemptedTargets.has(t)))return reject("QUOTE_ALREADY_ATTEMPTED");
  attempts++;batch.targets.forEach(t=>attemptedTargets.add(t));
  const record:QuoteTaskWork={reservedUnits:1,readInvocations:0,selectionInvocations:0};work.push(record);
  if(!availableTools.includes("quote_product"))return reject("CAPABILITY_UNAVAILABLE");
  const a=toolArgs(call.args,["subjectRef","offerTypes","color","quantity","deliveryRegion"]),context=base.snapshot();
  if(!context.state.permission||!context.state.privacyAllowed||context.state.conversationOwner!=="BOT"||
   context.state.bindingVersion!==scope.bindingVersion||context.state.recipient!==scope.recipient)return reject("QUOTE_AUTHORITY");
  if(!a||typeof a.subjectRef!=="string"||!context.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===a.subjectRef&&s.bindingVersion===scope.bindingVersion)||
   !Array.isArray(a.offerTypes)||a.offerTypes.length<1||a.offerTypes.length>2||a.offerTypes.some(x=>typeof x!=="string"||!x.trim())||new Set(a.offerTypes).size!==a.offerTypes.length||
   (a.color!==undefined&&(typeof a.color!=="string"||!a.color.trim()||Buffer.byteLength(a.color)>64))||
   (a.quantity!==undefined&&(!Number.isInteger(a.quantity)||Number(a.quantity)<1||Number(a.quantity)>100))||
   (a.deliveryRegion!==undefined&&(typeof a.deliveryRegion!=="string"||!a.deliveryRegion.trim()||Buffer.byteLength(a.deliveryRegion)>128))||
   ((a.quantity!==undefined||a.deliveryRegion!==undefined)&&(a.offerTypes.length!==1||!policy))||
   (!opening&&(a.quantity===undefined||a.offerTypes.length!==1)))return reject("QUOTE_ARGUMENTS_OR_REF");
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
  const options=(Array.isArray(data.sellingOptions)?data.sellingOptions:[]) as {offerType:string;sourceVersion:string;observedAt:string;expiresAt:string;availability?:{price?:{status:string}};facts?:{type:string;scope:unknown;value:unknown}[]}[];
  const current=base.snapshot();
  const priceQuery={subjectRef:a.subjectRef,offerTypes,...(typeof a.color==="string"?{color:a.color}:{})},sources=sourcePrices(priceQuery);
  if(offerTypes.some(offer=>{
   const matches=options.filter(o=>o.offerType===offer),o=matches[0],prices=o?.facts?.filter(f=>f.type==="PRICE")??[];
   const source=sources.find(v=>v.offerType===offer);
   return matches.length!==1||o?.availability?.price?.status!=="OK"||prices.length!==1||!source||
    source.sourceVersion!==o.sourceVersion||source.observedAt!==o.observedAt||source.expiresAt!==o.expiresAt||
    commerceHash({type:source.claim.type,scope:source.claim.scope,value:source.claim.value})!==commerceHash(prices[0]);
  }))return fail("PRICE_UNAVAILABLE");
  let preCartQuote:unknown=null;
  if(a.quantity!==undefined||a.deliveryRegion!==undefined){const q={subjectRef:a.subjectRef,offerType:offerTypes[0]!,quantity:Number(a.quantity??1),deliveryRegion:typeof a.deliveryRegion==="string"?a.deliveryRegion:null,...(typeof a.color==="string"?{color:a.color}:{})};
   quoteRequests.set(batch.targets[0]!,q);preCartQuote=await total(base.snapshot(),q);if(!preCartQuote)return fail("PRICE_UNAVAILABLE");}
  for(const source of sources){
   const proof={kind:"QUOTE_OFFER_PRICE_V1",calculationBasis:"PRE_CART_ONLY",appliesNegotiationReceipt:false,subjectRef:a.subjectRef,
    requestId:scope.requestId,bindingVersion:scope.bindingVersion,recipient:scope.recipient,...source,claimHash:commerceHash(source.claim)};
   const hash=commerceHash(proof);
   priceProofs.set(JSON.stringify([a.subjectRef,source.offerType]),{query:priceQuery,evidence:structuredClone(sources),literal:{ref:`quote-price:${hash}`,text:JSON.stringify(proof),sourceVersion:hash,observedAt:source.observedAt,expiresAt:source.claim.provenance.expiresAt}});
  }
  if(opening){
   const prices=sources.map(v=>v.claim);
   const proof={kind:"OPENING_QUOTE_TARGET_V1",subjectRef:a.subjectRef,offerTypes,requestId:scope.requestId,bindingVersion:scope.bindingVersion,recipient:scope.recipient,priceHashes:prices.map(commerceHash)};
   const hash=commerceHash(proof),expiries=prices.map(c=>(c as {provenance:{expiresAt:string}}).provenance.expiresAt).sort();
   openingProofs.set(a.subjectRef,{ref:`opening-quote:${hash}`,text:JSON.stringify(proof),sourceVersion:hash,observedAt:clock().toISOString(),expiresAt:expiries[0]??null});
  }
  return {status:"OK",data:{...data,quoteTaskStatus:"PREPARED_PENDING_FINAL_GATE",calculationBasis:"PRE_CART_POLICY",appliesNegotiationReceipt:false,currentCartQuoteRef:offerTypes.length===1?currentCartRef(current,{subjectRef:a.subjectRef,offerType:offerTypes[0]!,quantity:typeof a.quantity==="number"?a.quantity:undefined,...(typeof a.color==="string"?{color:a.color}:{})}):null,...(preCartQuote?{preCartQuote}:{})}};
 }
 // A proven missing purchase choice does not imply that a read-only quote needs
 // that choice. This describes a request target, never a calculated total or a
 // complete argument list. In particular, one attempted line is not order quantity.
 function quoteRoute(call:CommerceToolCall,result:CommerceToolResult):CommerceToolResult {
  if(!availableTools.includes("quote_product")||(!opening&&!followUp)||result.status!=="UNAVAILABLE"||result.reason!=="SELECTION_UNAVAILABLE"||result.failureStage!=="SOURCE"||!base.uncommittedSelectionResult?.(result))return result;
  try{
   const replace=call.name==="change_cart_item";
   if(call.name!=="add_to_cart"&&!replace)return result;
   const a=toolArgs(call.args,replace?["subjectRef","action","targetSubjectRef","offerType","quantity","size","color"]:["subjectRef","offerType","quantity","size","color"]);
   if(!a||replace&&a.action!=="REPLACE_LINE")return result;
   const target=replace?a.targetSubjectRef:a.subjectRef,data=result.data as Record<string,unknown>|undefined,c=base.snapshot();
   if(typeof target!=="string"||typeof a.offerType!=="string"||!data||data.effectCommitted!==false||
    !c.state.permission||!c.state.privacyAllowed||c.state.conversationOwner!=="BOT"||c.state.customerStateUpdatePending===true||
    c.state.bindingVersion!==scope.bindingVersion||c.state.recipient!==scope.recipient||
    !c.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===target&&s.bindingVersion===scope.bindingVersion))return result;
   const e=data.selectionEvidence;
   if(!validSelectionEvidence(e,target,clock())||e.offerType!==a.offerType||commerceHash(selectionChoiceResolution(e,clock(),String(data.status)))!==commerceHash(data.choiceResolution))return result;
   const choice=selectionChoiceResolution(e,clock(),String(data.status));if(choice?.kind!=="NEEDS_CUSTOMER_CHOICE")return result;
   const same=(x:unknown,y:unknown)=>x===y||typeof x==="string"&&typeof y==="string"&&normalizeCatalogToken(x)===normalizeCatalogToken(y);
   const lines=replace&&Array.isArray(c.state.cartItems)?c.state.cartItems.filter(line=>line.subjectRef===a.subjectRef):[];
   const cartQuote=c.state.cartQuote as {cartId?:string;cartVersion?:number}|undefined;
   if(replace&&(lines.length!==1||!c.cartBinding||cartQuote?.cartId!==c.cartBinding.cartId||cartQuote?.cartVersion!==c.cartBinding.cartVersion||
    !c.boundSubjects.some(s=>s.kind==="CART_LINE"&&s.ref===a.subjectRef&&s.bindingVersion===scope.bindingVersion)))return result;
   const quantity=a.quantity??(replace?lines[0]!.quantity:1),color=replace&&a.color==="__NO_COLOR__"?null:a.color??null;
   if(!Number.isInteger(quantity)||Number(quantity)<1||Number(quantity)>20||e.quantity!==quantity||!same(e.size,a.size??null)||!same(e.color,color))return result;
   const current=(c.runtimeProducts??[]).filter(p=>p.subjectRef===target).flatMap(p=>p.selectionEvidence??[]);
   if(!current.some(v=>commerceHash(v)===commerceHash(e)))return result;
   const offers=JSON.parse(c.policyLiterals.find(p=>p.ref===`offers:${target}`)?.text??"null")?.availableOffers;
   if(!Array.isArray(offers)||!offers.includes(a.offerType))return result;
   const sourcePriceStatus=sourcePrices({subjectRef:target,offerTypes:[a.offerType]}).length===1?"CURRENT_EXACT_READ":"REQUIRES_QUOTE_READ";
   return {...result,data:{...data,preCartQuoteRequest:{tool:"quote_product",target:{subjectRef:target,offerTypes:[a.offerType]},
    quantity:"FROM_CUSTOMER_REQUEST",calculationStatus:"NOT_CALCULATED",sourcePriceStatus,purchaseMissingField:choice.field,evidenceHash:e.contentHash}}};
  }catch{return result;}
 }
 return {...base,availableTools,openingQuoteTargets:()=>[...openingProofs.keys()],toolWorkAccounting:"PRIMITIVE_WORK_V2",quoteTaskWork:()=>structuredClone(work),
  snapshot:()=>withQuote(base.snapshot()),readback:async()=>{
   const current=await base.readback();
   for(const p of priceProofs.values())if(commerceHash(sourcePrices(p.query))!==commerceHash(p.evidence))throw Error("QUOTE_PRICE_SOURCE_CHANGED");
   quoteLiterals.clear();for(const q of quoteRequests.values())await total(current,q);return withQuote(current);
  },
  invoke:async call=>call.name==="quote_product"
   ? base.requiredMediaUnavailable?.()?reject('REQUIRED_MEDIA_UNAVAILABLE'):quote(call)
   :quoteRoute(call,await base.invoke(call)),
  invokeBatch:async calls=>{
   if(!calls.some(c=>c.name==="quote_product"))return (await base.invokeBatch(calls)).map((r,i)=>quoteRoute(calls[i]!,r));
   if(base.requiredMediaUnavailable?.())return calls.map(()=>reject('REQUIRED_MEDIA_UNAVAILABLE'));
   const batch=quoteBatchWork(calls);
   if(!batch||batch.units>6||attempts+batch.quotes>2||batch.targets.some(t=>attemptedTargets.has(t))||calls.some(c=>!availableTools.includes(c.name))||!knownBatch(calls))return calls.map(()=>reject("QUOTE_BATCH_INVALID"));
   const requiredMedia=calls.find(c=>['select_product_media','view_product_media'].includes(c.name)&&decodeCommerceMediaArgs(c.args)?.requiredEvidence==='CUSTOMER_WEARING');
   if(requiredMedia){
    const result=await base.invoke(requiredMedia);
    return calls.map(c=>c===requiredMedia?result:reject('REQUIRED_MEDIA_UNAVAILABLE'));
   }
   const results:CommerceToolResult[]=[];let stopped=false;
   for(const call of calls){
    const current=base.snapshot();
    if(stopped||current.state.conversationOwner!=="BOT"||!current.state.permission||!current.state.privacyAllowed){results.push(reject("QUOTE_BATCH_STOPPED"));continue;}
    const result=call.name==="quote_product"?await quote(call):await base.invoke(call);results.push(result);
    if(isWriter(call)){
      const {factSnapshotVersion:_version,...expectedState}=base.snapshot().state;
      try{await base.readback();}catch{stopped=true;}
      const now=base.snapshot().state;
      const {factSnapshotVersion:_nextVersion,...actualState}=now;
      if(commerceHash(expectedState)!==commerceHash(actualState))stopped=true;
      if(now.customerStateUpdatePending===true||!now.permission||!now.privacyAllowed||now.conversationOwner!=="BOT"||now.bindingVersion!==scope.bindingVersion||now.recipient!==scope.recipient)stopped=true;
      if(result.status!=="OK"&&!base.noCommitNegotiationResult?.(result))stopped=true;
    }else if(result.status!=="OK")stopped=true;
   }
   return results;
  }};
}
