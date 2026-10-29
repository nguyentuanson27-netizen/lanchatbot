import {createHash} from "node:crypto";
import {canonicalJsonV1,type ProductPresentationEvidenceV1} from "@lana/contracts";
import {hashProductPresentationEvidenceV1,normalizeCatalogToken} from "@lana/business-tools";
import type {CandidateCartOption} from "./realtime-sales-catalog.js";
export interface CandidateSelectionEvidence {
 kind:"CANDIDATE_SELECTION_V1";productId:string;offerType:string;size:string|null;color:string|null;quantity:number;
 sourceVersion:string;sourceHash:string;observedAt:string;expiresAt:string;
 completeness:"FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY";options:CandidateCartOption[];contentHash:string;
 colorSemantics:"UNRECORDED_IS_NOT_A_PHYSICAL_COLOR";
}
export const selectionEvidenceHash=(v:unknown)=>createHash("sha256").update(canonicalJsonV1(v)).digest("hex");
export const selectionSourceHash=(v:Record<string,unknown>)=>{const{synced_at:_heartbeat,...content}=v;return selectionEvidenceHash(content);};
export const selectionQueryKey=(e:Pick<CandidateSelectionEvidence,"productId"|"offerType"|"size"|"color"|"quantity">)=>selectionEvidenceHash({productId:normalizeCatalogToken(e.productId),offerType:normalizeCatalogToken(e.offerType),size:e.size===null?null:normalizeCatalogToken(e.size),color:e.color===null?null:normalizeCatalogToken(e.color),quantity:e.quantity});
export const selectionMeaningHash=(e:CandidateSelectionEvidence)=>selectionEvidenceHash({...e,queryKey:selectionQueryKey(e),size:null,color:null,
 observedAt:null,expiresAt:null,contentHash:null,options:e.options.map(o=>({...o,observedAt:null,expiresAt:null}))});
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const str=(v:unknown,max=128):v is string=>typeof v==="string"&&v.trim().length>0&&Buffer.byteLength(v)<=max;
const sha=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const nullable=(v:unknown,max:number)=>v===null||str(v,max);
/** Validates a code-produced observation's complete envelope; hashes provide integrity, not independent source authority. */
export function validSelectionEvidence(v:unknown,productId:string,now:Date):v is CandidateSelectionEvidence {
 if(!Number.isFinite(now.getTime()))return false;
 if(!object(v)||Object.keys(v).sort().join(',')!=="color,colorSemantics,completeness,contentHash,expiresAt,kind,observedAt,offerType,options,productId,quantity,size,sourceHash,sourceVersion"||
  v.kind!=="CANDIDATE_SELECTION_V1"||v.productId!==productId||!str(v.productId)||!str(v.offerType,64)||!str(v.sourceVersion)||!sha(v.sourceHash)||!sha(v.contentHash)||
  !nullable(v.size,32)||!nullable(v.color,64)||!Number.isSafeInteger(v.quantity)||(v.quantity as number)<1||(v.quantity as number)>20||
  v.completeness!=="FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY"||v.colorSemantics!=="UNRECORDED_IS_NOT_A_PHYSICAL_COLOR"||!Array.isArray(v.options)||v.options.length>8||
  !str(v.observedAt,64)||!str(v.expiresAt,64)||!Number.isFinite(Date.parse(v.observedAt))||Date.parse(v.observedAt)>now.getTime()||
  !Number.isFinite(Date.parse(v.expiresAt))||Date.parse(v.expiresAt)<=now.getTime()||Date.parse(v.expiresAt)<=Date.parse(v.observedAt))return false;
 const ids=new Set<string>();
 for(const o of v.options){if(!object(o)||Object.keys(o).sort().join(',')!=="color,expiresAt,identityHash,observedAt,offerType,productId,quantity,reasonCode,size,sourceVersion,status"||
  o.productId!==v.productId||o.offerType!==v.offerType||o.quantity!==v.quantity||o.sourceVersion!==v.sourceVersion||o.observedAt!==v.observedAt||o.expiresAt!==v.expiresAt||
  !nullable(o.size,32)||!nullable(o.color,64)||!sha(o.identityHash)||ids.has(o.identityHash as string)||
  !["IN_STOCK","PRE_ORDER","OUT_OF_STOCK","UNKNOWN"].includes(o.status as string)||!nullable(o.reasonCode,128)||
  (v.size!==null&&normalizeCatalogToken(o.size??"")!==normalizeCatalogToken(v.size))||(v.color!==null&&normalizeCatalogToken(o.color??"")!==normalizeCatalogToken(v.color)))return false;ids.add(o.identityHash as string);}
 const {contentHash,...body}=v;return selectionEvidenceHash(body)===contentHash&&Buffer.byteLength(canonicalJsonV1(v))<=4096;
}
export function selectionEvidenceFromOptions(input:Omit<CandidateSelectionEvidence,"kind"|"completeness"|"contentHash"|"options"|"colorSemantics">,options:readonly CandidateCartOption[],now:Date):CandidateSelectionEvidence|null {
 const body={kind:"CANDIDATE_SELECTION_V1" as const,...input,completeness:"FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY" as const,
  colorSemantics:"UNRECORDED_IS_NOT_A_PHYSICAL_COLOR" as const,options:options.slice(0,8).map(o=>({...o,expiresAt:input.expiresAt}))};
 const v={...body,contentHash:selectionEvidenceHash(body)};return validSelectionEvidence(v,input.productId,now)?v:null;
}
/** Presentation has no stock/offer semantics. Add exact source labels without inventing a physical color. */
export function selectionPresentation(p:ProductPresentationEvidenceV1,e:CandidateSelectionEvidence):ProductPresentationEvidenceV1 {
 if(p.productId!==e.productId)throw Error("SOURCE_EVIDENCE_CONFLICT");
 const variants=[...p.variants];
 for(const o of e.options)if(!variants.some(v=>v.color===o.color&&v.size===o.size))variants.push({variantId:`T${o.identityHash.slice(0,32).toUpperCase()}`,color:o.color,size:o.size});
 const sources={identity:p.provenance.identity,content:p.provenance.content,inventory:p.provenance.inventory};
 const value={productId:p.productId,displayName:p.displayName,variants};
 return {...p,...value,provenance:{...p.provenance,contentHash:hashProductPresentationEvidenceV1({value,sources})}};
}
export function mergeSelectionEvidence<T extends {subjectRef:string;selectionEvidence?:CandidateSelectionEvidence[];presentation?:ProductPresentationEvidenceV1}>(p:T,e:CandidateSelectionEvidence,now:Date):T {
 if(!validSelectionEvidence(e,p.subjectRef,now))throw Error("SELECTION_EVIDENCE_STALE");
 const values=[...(p.selectionEvidence??[])],key=selectionQueryKey(e),index=values.findIndex(old=>selectionQueryKey(old)===key);
 if(values.some(old=>!validSelectionEvidence(old,p.subjectRef,now)||old.sourceHash!==e.sourceHash))throw Error("SOURCE_EVIDENCE_CONFLICT");
 if(index>=0){if(selectionMeaningHash(values[index]!)!==selectionMeaningHash(e))throw Error("SOURCE_EVIDENCE_CONFLICT");
  if(Date.parse(e.expiresAt)<Date.parse(values[index]!.expiresAt))values[index]=e;
 }else values.push(e);
 if(values.length>3)throw Error("PRODUCT_EVIDENCE_BOUND");
 let presentation=p.presentation;for(const value of values)if(presentation)presentation=selectionPresentation(presentation,value);
 const next={...p,selectionEvidence:values,...(presentation?{presentation}:{})};
 if(Buffer.byteLength(canonicalJsonV1(next))>8192)throw Error("PRODUCT_EVIDENCE_BOUND");return next;
}
