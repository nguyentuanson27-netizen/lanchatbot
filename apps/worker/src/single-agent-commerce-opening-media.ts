import type {CommerceTools} from './single-agent-commerce-read-only.js';
import type {CommerceScope,PreparationControl} from './single-agent-commerce-read-only-tools.js';
import type {TrustedContext} from './single-agent-semantic-verifier-boundary.js';
import {decodeCommerceMediaArgs,type CommerceMediaAsset} from './single-agent-commerce-media.js';
import {normalizeCatalogToken} from '@lana/business-tools';
export const OPENING_PRODUCT_MEDIA_RULE=Object.freeze({version:'FIRST_CONTACT_UNIQUE_OR_CART_IMAGE_V2'} as const);
export type OpeningProductMediaRule=typeof OPENING_PRODUCT_MEDIA_RULE|{readonly version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'};
export interface OpeningMediaWork {status:'NOT_REQUIRED'|'READY'|'UNAVAILABLE';requiredProducts:string[];chargedUnits:number;reason?:string}
export function assertOpeningProductMediaRule(value:unknown):asserts value is OpeningProductMediaRule {
 if(value===null||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!('version' in value)||![OPENING_PRODUCT_MEDIA_RULE.version,'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'].includes(String(value.version)))throw Error('OPENING_MEDIA_RULE');
}
export function withOpeningProductMedia(base:CommerceTools,input:{rule:OpeningProductMediaRule;scope:CommerceScope;clock:()=>Date;firstContact:boolean|null;codeOutputSupported?:boolean}):CommerceTools {
 assertOpeningProductMediaRule(input.rule);
 const eager=input.rule.version===OPENING_PRODUCT_MEDIA_RULE.version;
 const required=(c:TrustedContext)=>input.firstContact===false?[]:[...new Set([
  ...c.boundSubjects.filter(s=>s.kind==='PRODUCT'&&(!eager||c.boundSubjects.filter(s=>s.kind==='PRODUCT').length===1)).map(s=>s.ref),
  ...(Array.isArray(c.state.cartItems)?c.state.cartItems.flatMap(i=>typeof i?.productRef==='string'?[i.productRef]:[]):[])
 ])].sort();
 const metadata=(c:TrustedContext)=>c.policyLiterals.filter(p=>p.ref.startsWith('media:')||p.ref.startsWith('read:')).flatMap(p=>{try{return [JSON.parse(p.text) as Record<string,unknown>];}catch{return [];}});
 const colors=(c:TrustedContext,id:string)=>{
  const cartItems=Array.isArray(c.state.cartItems)?c.state.cartItems.filter(i=>i.productRef===id):[];
  // A cart with unknown variant colour cannot borrow the no-selection generic path.
  if(cartItems.some(i=>!Array.isArray(i.components)||!i.components.length||i.components.some((v:{color?:unknown})=>typeof v.color!=='string'||!v.color.trim())))return null;
  const cartColors=cartItems.flatMap(i=>i.components.map((v:{color:string})=>v.color));
  const filters=metadata(c).flatMap(m=>{
  if((m.subjectRef??m.productId)!==id)return [];
  return [m,...(Array.isArray(m.sellingOptions)?m.sellingOptions:[])].flatMap(v=>typeof v.color==='string'&&v.color.trim()?[v.color]:[]);
 });
  // V1 retains its strict union. V2 physical cart selections supersede older read
  // filters; a source-unlabelled tuple never erases an explicit physical constraint.
  const raw=eager&&cartColors.length&&!cartColors.includes('__NO_COLOR__')?cartColors:[...cartColors,...filters];
  const physical=[...new Set(raw.filter(v=>v!=='__NO_COLOR__').map(normalizeCatalogToken))];
  if(raw.includes('__NO_COLOR__')&&(physical.length||!base.unlabelledCartProducts?.(c).includes(id)))return null;
  return physical;
 };
 const covers=(c:TrustedContext,a:CommerceMediaAsset,wanted:readonly string[]|null)=>{
  const now=input.clock().getTime();
  if(a.imageType==='SIZE_GUIDE'||!Number.isFinite(Date.parse(a.observedAt))||Date.parse(a.observedAt)>now||Date.parse(a.expiresAt)<=now||!Number.isFinite(Date.parse(a.expiresAt)))return false;
  if(wanted===null)return false;
  return metadata(c).some(m=>m.subjectRef===a.productId&&m.intent!=='SIZE_GUIDE'&&Array.isArray(m.assets)&&
   m.assets.some(v=>v.assetRef===a.assetRef)&&(!wanted.length||wanted.length===1&&typeof m.color==='string'&&normalizeCatalogToken(m.color)===wanted[0]));
 };
 const currentPhotos=(c:TrustedContext,images:readonly CommerceMediaAsset[])=>images.filter(a=>covers(c,a,colors(c,a.productId)));
 const ready=(c:TrustedContext,images:readonly CommerceMediaAsset[]=base.mediaSelection?.()??[])=>{
  const ids=required(c);if(!ids.length)return true;if(input.firstContact===null)return false;
  const photos=currentPhotos(c,images);return ids.every(id=>photos.some(a=>a.productId===id));
 };
 return {...base,openingMediaReady:ready,...(eager?{openingMediaTiming:'BEFORE_OWNER' as const}:{}),
  openingMediaFeasible(calls,remaining){
   if(!eager||input.firstContact===false)return true;
   const context=base.snapshot(),existing=base.mediaSelection?.()??[],photos=currentPhotos(context,existing);
   const mutations=calls.flatMap(call=>{
    const a=call.args as Record<string,unknown>|null;
    const id=call.name==='add_to_cart'?a?.subjectRef:call.name==='change_cart_item'&&a?.action==='REPLACE_LINE'?a.targetSubjectRef:null;
    return typeof id==='string'?[{id,color:typeof a?.color==='string'?normalizeCatalogToken(a.color):null}]:[];
   });
   const ids=[...new Set([...required(context),...mutations.map(m=>m.id)])];
   // Null/omission cannot prove a new canonical tuple keeps the old photo colour.
   const missing=ids.filter(id=>!photos.some(p=>p.productId===id&&mutations.filter(m=>m.id===id).every(m=>m.color!==null&&covers(context,p,[m.color]))));
   // A matching selection in this already-debited batch may cover the lookup.
   // This is feasibility only; actual assets/source/colour are checked after I/O.
   const prepaid=(id:string)=>{
    const targets=mutations.filter(m=>m.id===id);
    return targets.length>0&&targets.every(m=>m.color!==null&&calls.some(call=>{
      const a=decodeCommerceMediaArgs(call.args);
      return call.name==='select_product_media'&&a?.subjectRef===id&&['GENERIC','BACK','DETAIL','PRODUCT_ONLY','FEEDBACK'].includes(String(a.intent))&&
        typeof a.color==='string'&&normalizeCatalogToken(a.color)===m.color;
    }));
   };
   return missing.filter(id=>!prepaid(id)).length<=remaining&&existing.length+missing.length<=4;
  },
  openingMediaBlocksCodeOutput:calls=>!input.codeOutputSupported&&input.firstContact!==false&&calls.some(c=>c.name==='confirm_purchase'),
  async prepareOpeningMedia(control:PreparationControl):Promise<OpeningMediaWork>{
   let chargedUnits=0;const context=base.snapshot(),requiredProducts=required(context);
   const fail=(reason:string):OpeningMediaWork=>({status:'UNAVAILABLE',requiredProducts,chargedUnits,reason});
   if(!requiredProducts.length)return {status:'NOT_REQUIRED',requiredProducts,chargedUnits};
   if(input.firstContact===null)return fail('OPENING_HISTORY_UNKNOWN');
   const existing=base.mediaSelection?.()??[],photos=currentPhotos(context,existing),missing=requiredProducts.filter(id=>!photos.some(a=>a.productId===id));
   if(!missing.length)return {status:'READY',requiredProducts,chargedUnits};
   if(!Number.isSafeInteger(control.maxCalls)||control.maxCalls>6||control.maxCalls<missing.length)return fail('OPENING_MEDIA_BUDGET');
   if(existing.length+missing.length>4||!base.prepareProductImage)return fail('OPENING_MEDIA_BOUND_OR_CAPABILITY');
   if(missing.some(id=>colors(context,id)===null||colors(context,id)!.length>1))return fail('OPENING_MEDIA_COLOR_SCOPE');
   for(const id of missing){
    const current=base.snapshot();
    if(!current.state.permission||!current.state.privacyAllowed||current.state.conversationOwner!=='BOT'||
      current.state.bindingVersion!==input.scope.bindingVersion||current.state.recipient!==input.scope.recipient||base.handoffStatus?.())return fail('OPENING_MEDIA_AUTHORITY');
    control.onDispatch();chargedUnits++;
    const wanted=colors(current,id);if(wanted===null||wanted.length>1)return fail('OPENING_MEDIA_COLOR_SCOPE');
    const result=await base.prepareProductImage(id,wanted[0]);
    if(result.status!=='OK')return fail('OPENING_MEDIA_SOURCE');
   }
   return ready(base.snapshot())?{status:'READY',requiredProducts,chargedUnits}:fail('OPENING_MEDIA_UNPROVED');
  }};
}
