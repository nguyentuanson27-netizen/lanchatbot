import {it,expect} from "vitest";
import {createHash} from "node:crypto";
import {createMediaRevalidationProof,readMediaRevalidation} from "./media-revalidation.js";
import {stableProductDocumentFromQdrantPayload} from "./qdrant.js";
import {validateStableProductDocument} from "./search.js";
const sha=createHash("sha256").update("reviewed canonical image").digest("hex");
const payload=()=>({product_id:"P1",ma_sp:"P1",image_url:"https://content.pancake.vn/a.jpg",active:true,
  image_content_sha256:sha,image_metadata_review_status:"APPROVED",metadata_verified:true,image_type:"MODEL",image_angle:"FRONT",
  image_parts_visible:["AO"],published_at:"2026-09-01T00:00:00.000Z"});
it("preserves publication time while projecting a bound successful revalidation",()=>{
 const p=payload(),proof=createMediaRevalidationProof(p,sha,"2026-10-28T10:00:00.000Z");
 const d=validateStableProductDocument(stableProductDocumentFromQdrantPayload({...p,image_revalidation:proof}));
 expect(d.images[0]).toMatchObject({observedAt:p.published_at,revalidation:{status:"VALID",checkedAt:proof.checkedAt}});
});
it.each([{image_content_sha256:"b".repeat(64)},{image_url:"https://content.pancake.vn/b.jpg"},{product_id:"P2"},{image_parts_visible:["CHAN_VAY"]},
 {metadata_verified:false},{image_metadata_review_status:"REJECTED"},{feedback_verified:true},{active:false}])("does not grant freshness after bound identity or review changes %j",change=>{
 const p=payload(),proof=createMediaRevalidationProof(p,sha,"2026-10-28T10:00:00.000Z");
 expect(readMediaRevalidation({...p,...change,image_revalidation:proof})).toEqual({status:"INVALID"});
});
it("does not treat a timestamp alone or a failure as a successful proof",()=>{
 expect(readMediaRevalidation({...payload(),image_revalidation:{checkedAt:"2026-10-28T10:00:00Z"}})).toEqual({status:"INVALID"});
 expect(readMediaRevalidation({...payload(),image_revalidation:null})).toEqual({status:"INVALID"});
 expect(readMediaRevalidation(payload())).toBeUndefined();
 expect(()=>createMediaRevalidationProof(payload(),"b".repeat(64),"2026-10-28T10:00:00Z")).toThrow("MEDIA_REVALIDATION_UNPROVED");
});
