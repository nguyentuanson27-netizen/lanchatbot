import type {CommerceTools} from './single-agent-commerce-read-only.js';
import type {CommerceScope,PreparationControl} from './single-agent-commerce-read-only-tools.js';
import type {TrustedContext} from './single-agent-semantic-verifier-boundary.js';
import type {CommerceMediaAsset} from './single-agent-commerce-media.js';
import {normalizeCatalogToken} from '@lana/business-tools';
export const OPENING_PRODUCT_MEDIA_RULE=Object.freeze({version:'FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1'} as const);
export type OpeningProductMediaRule=typeof OPENING_PRODUCT_MEDIA_RULE;
export interface OpeningMediaWork {status:'NOT_REQUIRED'|'READY'|'UNAVAILABLE';requiredProducts:string[];chargedUnits:number;reason?:string}
export function assertOpeningProductMediaRule(value:unknown):asserts value is OpeningProductMediaRule {
 if(value===null||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!('version' in value)||value.version!==OPENING_PRODUCT_MEDIA_RULE.version)throw Error('OPENING_MEDIA_RULE');
}
export function withOpeningProductMedia(base:CommerceTools,input:{rule:OpeningProductMediaRule;scope:CommerceScope;clock:()=>Date;firstContact:boolean|null;codeOutputSupported?:boolean}):CommerceTools {
 assertOpeningProductMediaRule(input.rule);
 const required=(c:TrustedContext)=>input.firstContact===false?[]:[...new Set([
  ...c.boundSubjects.filter(s=>s.kind==='PRODUCT').map(s=>s.ref),
  ...(Array.isArray(c.state.cartItems)?c.state.cartItems.flatMap(i=>typeof i?.productRef==='string'?[i.productRef]:[]):[])
 ])].sort();
 const metadata=(c:TrustedContext)=>c.policyLiterals.filter(p=>p.ref.startsWith('media:')||p.ref.startsWith('read:')).flatMap(p=>{try{return [JSON.parse(p.text) as Record<string,unknown>];}catch{return [];}});
 const colors=(c:TrustedContext,id:string)=>[...new Set([...metadata(c).flatMap(m=>{
  if((m.subjectRef??m.productId)!==id)return [];
  return [m,...(Array.isArray(m.sellingOptions)?m.sellingOptions:[])].flatMap(v=>typeof v.color==='string'&&v.color.trim()?[v.color]:[]);
 }),...(Array.isArray(c.state.cartItems)?c.state.cartItems.flatMap(i=>i.productRef===id&&Array.isArray(i.components)?i.components.flatMap((v:{color?:unknown})=>typeof v.color==='string'&&v.color.trim()?[v.color]:[]):[]):[])].map(normalizeCatalogToken))];
 const currentPhotos=(c:TrustedContext,images:readonly CommerceMediaAsset[])=>images.filter(a=>{
  const now=input.clock().getTime();
  if(a.imageType==='SIZE_GUIDE'||!Number.isFinite(Date.parse(a.observedAt))||Date.parse(a.observedAt)>now||Date.parse(a.expiresAt)<=now||!Number.isFinite(Date.parse(a.expiresAt)))return false;
  const wanted=colors(c,a.productId);
  return metadata(c).some(m=>m.subjectRef===a.productId&&m.intent!=='SIZE_GUIDE'&&Array.isArray(m.assets)&&
   m.assets.some(v=>v.assetRef===a.assetRef)&&(!wanted.length||wanted.length===1&&typeof m.color==='string'&&normalizeCatalogToken(m.color)===wanted[0]));
 });
 const ready=(c:TrustedContext,images:readonly CommerceMediaAsset[]=base.mediaSelection?.()??[])=>{
  const ids=required(c);if(!ids.length)return true;if(input.firstContact===null)return false;
  const photos=currentPhotos(c,images);return ids.every(id=>photos.some(a=>a.productId===id));
 };
 return {...base,openingMediaReady:ready,
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
   if(missing.some(id=>colors(context,id).length>1))return fail('OPENING_MEDIA_COLOR_SCOPE');
   for(const id of missing){
    const current=base.snapshot();
    if(!current.state.permission||!current.state.privacyAllowed||current.state.conversationOwner!=='BOT'||
      current.state.bindingVersion!==input.scope.bindingVersion||current.state.recipient!==input.scope.recipient||base.handoffStatus?.())return fail('OPENING_MEDIA_AUTHORITY');
    control.onDispatch();chargedUnits++;
    const result=await base.prepareProductImage(id,colors(current,id)[0]);
    if(result.status!=='OK')return fail('OPENING_MEDIA_SOURCE');
   }
   return ready(base.snapshot())?{status:'READY',requiredProducts,chargedUnits}:fail('OPENING_MEDIA_UNPROVED');
  }};
}
