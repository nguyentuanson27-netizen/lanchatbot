import type {StableProductDocument} from '@lana/business-tools';
import type {TrustedContext} from './single-agent-semantic-verifier-boundary.js';
import {commerceHash} from './single-agent-commerce-read-only-context.js';
import {eligibleCommerceMedia,type MediaQuery} from './single-agent-commerce-media-eligibility.js';
export interface MediaCapability {
 schemaVersion:1;subjectRef:string;observedAt:string;expiresAt:string;mediaSourceHash:string;
 queries:{intent:string;componentRole:string|null;color:string|null;status:'MATCH_AVAILABLE'|'NO_VERIFIED_MATCH'}[];
}
export function createMediaCapabilityCache(clock:()=>Date,hosts:readonly string[],bindingVersion:string){
 const entries=new Map<string,{product:StableProductDocument;at:number;expires:number;hash:string;color?:string}>();
 const omissions=new Set<string>();
 const clear=(id:string,reason?:string)=>{entries.delete(id);if(reason)omissions.add(reason);};
 const observe=(id:string,p:StableProductDocument)=>{
  clear(id);const at=clock().getTime(),t=Date.parse(p.observedAt??'');
  if(entries.size>=8||p.productId!==id||!Number.isFinite(at)||!Number.isFinite(t)||t>at){omissions.add("SUBJECT_OR_CLOCK");return;}
  const product=structuredClone(p);
  const basic=eligibleCommerceMedia(product,{subjectRef:id,intent:'GENERIC'},at,hosts);
  entries.set(id,{product,at,expires:basic.expiresAt,hash:commerceHash({id,images:product.images??[],colors:product.colors,hosts})});
 };
 return {clear,observe,takeDiagnostics(){const value=[...omissions];omissions.clear();return value;},addColor(id:string,color:string){const entry=entries.get(id);if(entry&&color.trim()&&Buffer.byteLength(color)<=64)entry.color=color;},
  get(context:TrustedContext):MediaCapability[]{
   const state=context.state,now=clock().getTime();if(!Number.isFinite(now)){entries.clear();omissions.add('SUBJECT_OR_CLOCK');return [];}if(!state.permission||!state.privacyAllowed||state.conversationOwner!=='BOT'){entries.clear();omissions.add('AUTHORITY');return [];}
   const result:MediaCapability[]=[];
   for(const[id,e]of entries){
    if(now<e.at||now>=e.expires||!context.boundSubjects.some(s=>s.ref===id&&s.kind==='PRODUCT'&&s.bindingVersion===bindingVersion)){clear(id,now>=e.expires?"EXPIRED":"SUBJECT_OR_CLOCK");continue;}
    const queries:MediaQuery[]=[{subjectRef:id,intent:'GENERIC'},{subjectRef:id,intent:'FEEDBACK'},
     ...(['TOP','SKIRT','PANTS'] as const).map(componentRole=>({subjectRef:id,intent:'DETAIL' as const,componentRole})),{subjectRef:id,intent:'BACK'}];
    if(e.color)queries.push({subjectRef:id,intent:'GENERIC',color:e.color});
    const rows=queries.map(q=>{let available=false;try{available=eligibleCommerceMedia(e.product,q,e.at,hosts).images.length>0;}catch{}
     return {intent:q.intent,componentRole:q.componentRole??null,color:q.color??null,status:available?'MATCH_AVAILABLE' as const:'NO_VERIFIED_MATCH' as const};});
    const value:MediaCapability={schemaVersion:1,subjectRef:id,observedAt:new Date(e.at).toISOString(),expiresAt:new Date(e.expires).toISOString(),mediaSourceHash:e.hash,queries:rows};
    if(Buffer.byteLength(JSON.stringify(value))<=1024)result.push(value);else omissions.add("PRODUCT_BYTES");
   }
   if(Buffer.byteLength(JSON.stringify(result))>4096){omissions.add("FIELD_BYTES");return [];}
   return result;
  }};
}
