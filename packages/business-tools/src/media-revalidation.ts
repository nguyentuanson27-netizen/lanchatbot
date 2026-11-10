import {createHash} from "node:crypto";
import type {ProductImage} from "./types.js";

/** Source identity excludes publication/check timestamps and unrelated product text. */
const fields=["product_id","ma_sp","image_url","normalized_image_url","active","image_content_sha256",
  "image_metadata_review_status","metadata_verified","image_type","image_intents","image_angle","image_parts_visible",
  "feedback_verified","image_metadata_version","image_color_binding_status","image_verified_product_color","image_color_binding_sha256"] as const;
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"
  ?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)])):value;
export function mediaRevalidationIdentity(payload:Readonly<Record<string,unknown>>):string {
  return createHash("sha256").update(JSON.stringify(canonical(Object.fromEntries(fields.map(k=>[k,payload[k]??null]))))).digest("hex");
}
export interface MediaRevalidationProof {
  version:1;status:"VERIFIED"|"INVALID";checkedAt:string;metadataSha256:string;
}
export function createMediaRevalidationProof(payload:Readonly<Record<string,unknown>>,canonicalImageSha256:string,checkedAt:string):MediaRevalidationProof {
  if(payload.active!==true||payload.metadata_verified!==true||payload.image_metadata_review_status!=="APPROVED"||
    !/^[a-f0-9]{64}$/.test(canonicalImageSha256)||canonicalImageSha256!==payload.image_content_sha256||
    !Number.isFinite(Date.parse(checkedAt))||new Date(checkedAt).toISOString()!==checkedAt)throw new Error("MEDIA_REVALIDATION_UNPROVED");
  return {version:1,status:"VERIFIED",checkedAt,metadataSha256:mediaRevalidationIdentity(payload)};
}
export function readMediaRevalidation(payload:Readonly<Record<string,unknown>>):ProductImage["revalidation"] {
  if(!Object.hasOwn(payload,"image_revalidation"))return undefined;
  const proof=payload.image_revalidation as Partial<MediaRevalidationProof>|null;
  if(!proof||proof.version!==1||proof.status!=="VERIFIED"||typeof proof.checkedAt!=="string"||
    !Number.isFinite(Date.parse(proof.checkedAt))||new Date(proof.checkedAt).toISOString()!==proof.checkedAt||proof.metadataSha256!==mediaRevalidationIdentity(payload)||
    payload.active!==true||payload.metadata_verified!==true||payload.image_metadata_review_status!=="APPROVED")return {status:"INVALID"};
  return {status:"VALID",checkedAt:proof.checkedAt};
}
/** An invalid explicit check never falls back to the legacy publication clock. */
export function mediaObservationTime(image:ProductImage,productObservedAt:string|null|undefined):number {
  return image.revalidation?.status==="INVALID"?Number.NaN:
    Date.parse(image.revalidation?.status==="VALID"?image.revalidation.checkedAt:image.observedAt??productObservedAt??"");
}
