import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {createMediaRevalidationProof,mediaRevalidationIdentity,readMediaRevalidation,type MediaRevalidationProof} from "@lana/business-tools";
import {MEDIA_FRESH_FOR_SECONDS} from "@lana/contracts";
import {safeRecognitionImageUrl} from "./media-recognition-v2-image-pipeline.js";

export interface MediaRevalidationSource {pointId:string;payload:Record<string,unknown>;approvedPayload:Record<string,unknown>|null}
export interface MediaRevalidationResult {pointId:string;status:"VERIFIED"|"NOT_DUE"|"BLOCKED"|"WRITE_UNCONFIRMED";reason:string}
/** Source is reread after canonical preparation. Only proof metadata may be written. */
export async function revalidatePublishedMedia(input:{
  source:MediaRevalidationSource;clock:()=>Date;force?:boolean;
  prepare:(url:string)=>Promise<{buffer:Buffer}>;
  readCurrent:()=>Promise<MediaRevalidationSource|null>;
  writeProof:(proof:MediaRevalidationProof)=>Promise<void>;
}):Promise<MediaRevalidationResult>{
  const initial=input.source,result=(status:MediaRevalidationResult["status"],reason:string)=>({pointId:initial.pointId,status,reason});
  const matches=(s:MediaRevalidationSource)=>!!s.approvedPayload&&s.pointId===initial.pointId&&
    s.payload.active===true&&s.payload.metadata_verified===true&&s.payload.image_metadata_review_status==="APPROVED"&&
    mediaRevalidationIdentity(s.payload)===mediaRevalidationIdentity(s.approvedPayload);
  const existing=readMediaRevalidation(initial.payload),now=input.clock().getTime();
  if(!input.force&&matches(initial)&&existing?.status==="VALID"){
    const age=now-Date.parse(existing.checkedAt);
    if(age>=0&&age<MEDIA_FRESH_FOR_SECONDS*500)return result("NOT_DUE","RECENT_BOUND_VERIFICATION");
  }
  let current:MediaRevalidationSource|null=null,sha:string|null=null,reason="SOURCE_NOT_APPROVED";
  try{
    if(matches(initial)){
      try{
        const url=safeRecognitionImageUrl(String(initial.payload.image_url),["content.pancake.vn"]);
        const bytes=await input.prepare(url.toString());if(!bytes.buffer.length)throw new Error("EMPTY_CANONICAL_IMAGE");
        sha=createHash("sha256").update(bytes.buffer).digest("hex");
        reason=sha===initial.payload.image_content_sha256?"VERIFIED":"CANONICAL_IMAGE_HASH_CHANGED";
      }catch{reason="CANONICAL_IMAGE_UNAVAILABLE";}
    }
    current=await input.readCurrent();
    if(!current||current.pointId!==initial.pointId)return result("BLOCKED","CURRENT_SOURCE_UNAVAILABLE");
    if(mediaRevalidationIdentity(current.payload)!==mediaRevalidationIdentity(initial.payload))return result("BLOCKED","CURRENT_SOURCE_CHANGED");
    if(!matches(current))reason="SOURCE_NOT_APPROVED";
  }catch{return result("BLOCKED","SOURCE_OR_IMAGE_UNAVAILABLE");}
  const checkedAt=input.clock().toISOString();
  const proof:MediaRevalidationProof=reason==="VERIFIED"&&sha
    ?createMediaRevalidationProof(current.payload,sha,checkedAt)
    :{version:1,status:"INVALID",checkedAt,metadataSha256:mediaRevalidationIdentity(current.payload)};
  try{
    await input.writeProof(proof);
    const after=await input.readCurrent();
    if(!after||!isDeepStrictEqual(after.payload.image_revalidation,proof)||
      mediaRevalidationIdentity(after.payload)!==mediaRevalidationIdentity(current.payload)||
      mediaRevalidationIdentity(after.approvedPayload??{})!==mediaRevalidationIdentity(current.approvedPayload??{}))return result("WRITE_UNCONFIRMED","SOURCE_OR_READBACK_CHANGED");
    return result(proof.status==="VERIFIED"?"VERIFIED":"BLOCKED",reason);
  }catch{return result("WRITE_UNCONFIRMED","WRITE_OR_READBACK_UNAVAILABLE");}
}
