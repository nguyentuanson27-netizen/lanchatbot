import {it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {readMediaRevalidation,type MediaRevalidationProof} from "@lana/business-tools";
import {revalidatePublishedMedia,type MediaRevalidationSource} from "./p23c-media-revalidation.js";
const bytes=Buffer.from("reviewed canonical bytes"),sha=createHash("sha256").update(bytes).digest("hex");
function fixture(){
 const payload={product_id:"P1",ma_sp:"P1",image_url:"https://content.pancake.vn/a.jpg",active:true,metadata_verified:true,
   image_metadata_review_status:"APPROVED",image_content_sha256:sha,image_type:"MODEL",image_parts_visible:["AO"],published_at:"2026-09-01T00:00:00Z"};
 const current:MediaRevalidationSource={pointId:"point1",payload:{...payload},approvedPayload:{...payload}};
 const input={source:structuredClone(current),clock:()=>new Date("2026-10-28T12:00:00Z"),prepare:vi.fn(async()=>({buffer:bytes})),
   readCurrent:vi.fn(async()=>structuredClone(current)),writeProof:vi.fn(async (proof:MediaRevalidationProof)=>{current.payload.image_revalidation=proof;}),
   invalidateProof:vi.fn(async (proof:MediaRevalidationProof)=>{
    if(JSON.stringify(current.payload.image_revalidation)===JSON.stringify(proof))current.payload.image_revalidation={...proof,status:"INVALID"};
   })};
 return{current,input};
}
it("renews unchanged source metadata without changing publication, approval, hash or vectors",async()=>{
 const f=fixture(),before=structuredClone(f.current.payload);expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"VERIFIED"});
 const after={...f.current.payload};delete after.image_revalidation;expect(after).toEqual(before);expect(f.input.writeProof).toHaveBeenCalledOnce();
 f.input.source=structuredClone(f.current);expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"NOT_DUE"});
 expect(f.input.prepare).toHaveBeenCalledOnce();
});
it.each(["hash","revoked","missing","metadata","subject"])("does not renew %s source",async mode=>{
 const f=fixture();
 if(mode==="hash")f.input.prepare.mockResolvedValue({buffer:Buffer.from("different")});
 if(mode==="revoked")f.current.approvedPayload!.image_metadata_review_status="REJECTED";
 if(mode==="missing")f.current.approvedPayload=null;
 if(mode==="metadata")f.current.payload.image_parts_visible=["CHAN_VAY"];
 if(mode==="subject")f.current.payload.product_id="OTHER_PRODUCT";
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"BLOCKED"});
 if(mode==="metadata"||mode==="subject")expect(f.input.writeProof).not.toHaveBeenCalled();
 else expect(f.current.payload.image_revalidation).toMatchObject({status:"INVALID"});
});
it("does not retry or claim success after an unconfirmed write",async()=>{
 const f=fixture();f.input.writeProof.mockRejectedValue(new Error("RESPONSE_LOST"));
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"WRITE_UNCONFIRMED"});expect(f.input.writeProof).toHaveBeenCalledOnce();
});
it("accepts an identical readback with reordered JSON keys",async()=>{
 const f=fixture();f.input.writeProof.mockImplementation(async proof=>{
   f.current.payload.image_revalidation={metadataSha256:proof.metadataSha256,checkedAt:proof.checkedAt,status:proof.status,version:proof.version};
 });
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"VERIFIED"});
});
it("does not call the image port for an unsafe source URL",async()=>{
 const f=fixture();f.input.source.payload.image_url="http://127.0.0.1/private";f.input.source.approvedPayload!.image_url="http://127.0.0.1/private";
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"BLOCKED"});expect(f.input.prepare).not.toHaveBeenCalled();
});
it("records an invalid check when canonical preparation fails and the current source can be read",async()=>{
 const f=fixture();f.input.prepare.mockRejectedValue(new Error("HTTP_404"));
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"BLOCKED",reason:"CANONICAL_IMAGE_UNAVAILABLE"});
 expect(f.current.payload.image_revalidation).toMatchObject({status:"INVALID"});
});
it.each(["revoked","changed"])("quarantines its own proof when readback positively observes registry %s",async mode=>{
 const f=fixture();f.input.writeProof.mockImplementation(async proof=>{
  f.current.payload.image_revalidation=proof;
  if(mode==="revoked")f.current.approvedPayload=null;
  else f.current.approvedPayload!.image_parts_visible=["CHAN_VAY"];
 });
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"BLOCKED",reason:"SOURCE_CHANGED_PROOF_INVALIDATED"});
 expect(readMediaRevalidation(f.current.payload)).toEqual({status:"INVALID"});
 expect(f.input.writeProof).toHaveBeenCalledOnce();expect(f.input.invalidateProof).toHaveBeenCalledOnce();
});
it("does not overwrite a concurrent newer proof during quarantine or claim it was invalidated",async()=>{
 const f=fixture(),conditional=f.input.invalidateProof.getMockImplementation()!;
 f.input.writeProof.mockImplementation(async proof=>{f.current.payload.image_revalidation=proof;f.current.approvedPayload=null;});
 let newer:MediaRevalidationProof|undefined;
 f.input.invalidateProof.mockImplementation(async expected=>{
  newer={...expected,checkedAt:"2026-10-28T12:00:01.000Z"};f.current.payload.image_revalidation=newer;
  await conditional(expected);
 });
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"WRITE_UNCONFIRMED",reason:"PROOF_INVALIDATION_UNCONFIRMED"});
 expect(f.current.payload.image_revalidation).toEqual(newer);expect(f.input.invalidateProof).toHaveBeenCalledOnce();
});
it("retains unconfirmed quarantine errors without retrying either write",async()=>{
 const f=fixture();f.input.writeProof.mockImplementation(async proof=>{f.current.payload.image_revalidation=proof;f.current.approvedPayload=null;});
 f.input.invalidateProof.mockRejectedValue(new Error("INVALIDATION_RESPONSE_LOST"));
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"WRITE_UNCONFIRMED"});
 expect(f.input.writeProof).toHaveBeenCalledOnce();expect(f.input.invalidateProof).toHaveBeenCalledOnce();
});
it("distinguishes an unavailable readback from positively observed revocation",async()=>{
 const f=fixture();f.input.readCurrent.mockResolvedValueOnce(structuredClone(f.current)).mockRejectedValueOnce(new Error("SOURCE_UNAVAILABLE"));
 expect(await revalidatePublishedMedia(f.input)).toMatchObject({status:"WRITE_UNCONFIRMED"});
 expect(f.input.invalidateProof).not.toHaveBeenCalled();expect(f.input.writeProof).toHaveBeenCalledOnce();
 // Unknown readback is not a guarantee that the persisted proof became INVALID.
 expect(readMediaRevalidation(f.current.payload)?.status).toBe("VALID");
});
