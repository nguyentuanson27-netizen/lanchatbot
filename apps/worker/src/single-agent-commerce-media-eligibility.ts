import {normalizeCatalogToken,selectRequestedImages,selectPriceCardImages,type StableProductDocument,type CustomerImageIntent} from '@lana/business-tools';
import {MEDIA_FRESH_FOR_SECONDS} from '@lana/contracts';
import {safeRecognitionImageUrl} from './media-recognition-v2-image-pipeline.js';
export interface MediaQuery {subjectRef:string;intent:CustomerImageIntent;color?:string;componentRole?:'TOP'|'SKIRT'|'PANTS'}
const parts={TOP:'AO',SKIRT:'CHAN_VAY',PANTS:'QUAN'};
export const commerceMediaIntents:CustomerImageIntent[]=['GENERIC','BACK','DETAIL','SIZE_GUIDE','PRODUCT_ONLY','FEEDBACK'];
/** Pure eligibility shared by hints and real selection. Never authorizes delivery. */
export function eligibleCommerceMedia(product:StableProductDocument,query:MediaQuery,at:number,hosts:readonly string[]){
 if(product.productId!==query.subjectRef)throw Error('MEDIA_SOURCE_UNAVAILABLE');
 const base=(product.images??[]).filter(image=>{
  const observed=Date.parse(image.observedAt??product.observedAt??'');
  if(image.reviewStatus!=='APPROVED'||image.metadataVerified!==true||!image.sourceContentSha256||
   !/^[a-f0-9]{64}$/.test(image.sourceContentSha256)||!Number.isFinite(observed)||observed>at||observed+MEDIA_FRESH_FOR_SECONDS*1000<=at)return false;
  try{safeRecognitionImageUrl(image.url,hosts);}catch{return false;}
  return !query.componentRole||(image.partsVisible?.length===1&&normalizeCatalogToken(image.partsVisible[0]!)===parts[query.componentRole]);
 });
 const colorMatch=(image:typeof base[number])=>{
  const b=image.colorBinding;
  if(b?.status==='INVALID')return false;
  if(b?.status==='VALID')return b.sha256===image.sourceContentSha256&&normalizeCatalogToken(b.color)===normalizeCatalogToken(query.color!);
  if(b&&b.status!=='ABSENT')return false;
  return product.colors.length===1&&normalizeCatalogToken(product.colors[0]!)===normalizeCatalogToken(query.color!);
 };
 if(query.color&&!base.some(colorMatch))throw Error('MEDIA_COLOR_BINDING_UNVERIFIED');
 const approved={...product,images:query.color?base.filter(colorMatch):base,imageUrls:[]};
 const select=(intent:CustomerImageIntent)=>intent==='GENERIC'?selectPriceCardImages(approved):selectRequestedImages(approved,intent);
 const selected=select(query.intent);
 const transitions=(product.images??[]).flatMap(i=>{const t=Date.parse(i.observedAt??product.observedAt??'');return [t,t+MEDIA_FRESH_FOR_SECONDS*1000].filter(t=>Number.isFinite(t)&&t>at);});
 return {images:selected.images,alternatives:selected.images.length?[]:commerceMediaIntents.filter(i=>i!==query.intent&&select(i).images.length>0),
  expiresAt:Math.min(at+MEDIA_FRESH_FOR_SECONDS*1000,...transitions)};
}
