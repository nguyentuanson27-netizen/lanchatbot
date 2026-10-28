import {it,expect} from "vitest";
import {eligibleCommerceMedia} from "./single-agent-commerce-media-eligibility.js";
import {fixtureProduct} from "./single-agent-commerce.test-support.js";
import type {ProductImage} from "@lana/business-tools";

const at=Date.parse("2026-10-28T12:00:00.000Z");
const image:ProductImage={url:"https://content.pancake.vn/item.jpg",role:"PRIMARY",angle:"FRONT",imageType:"MODEL",intents:[],partsVisible:["AO"],sortOrder:0,qualityScore:null,feedback:false,reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:"2026-09-01T00:00:00.000Z"};
function select(revalidation:unknown,observedAt=image.observedAt){
 const product=fixtureProduct().product;
 product.images=[{...image,observedAt,...(revalidation===undefined?{}:{revalidation})} as ProductImage];
 return eligibleCommerceMedia(product,{subjectRef:product.productId,intent:"GENERIC"},at,["content.pancake.vn"]);
}
it("uses verified revalidation of an unchanged image without changing publication time",()=>{
 expect(select({status:"VALID",checkedAt:"2026-10-28T11:00:00.000Z"}).images).toHaveLength(1);
});
it("does not revive an explicit invalid proof through a recent publication time",()=>{
 expect(select({status:"INVALID"},"2026-10-28T11:00:00.000Z").images).toHaveLength(0);
});
it.each(["2026-10-29T00:00:00.000Z","2026-09-01T00:00:00.000Z"])("rejects future or expired revalidation %s",checkedAt=>{
 expect(select({status:"VALID",checkedAt}).images).toHaveLength(0);
});
it("keeps legacy freshness when no proof is present",()=>{
 expect(select(undefined,"2026-10-28T11:00:00.000Z").images).toHaveLength(1);
 expect(select(undefined).images).toHaveLength(0);
});
