import {describe,it,expect} from "vitest";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn} from "./single-agent-commerce-read-only.js";
import {commerceNow,commerceScope,fixtureProduct,fixturePolicy} from "./single-agent-commerce.test-support.js";
import type {ProductImage} from "@lana/business-tools";

const setup = async () => {
  const f=fixtureProduct(),scope=commerceScope();
  const image:ProductImage={url:"https://content.pancake.vn/product-back.jpg",role:"PRIMARY",angle:"BACK",imageType:"PRODUCT_ONLY",intents:[],sortOrder:0,qualityScore:null,feedback:false,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]};
  f.product.images=[image];f.product.imageUrls=[image.url];
  const tools=await createCommerceTools({read:{scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[f.product],
    catalog:{readProduct:async()=>structuredClone(f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
    media:{allowedHostSuffixes:["content.pancake.vn"]}});
  const call={name:"select_product_media",args:{subjectRef:f.product.productId,intent:"BACK"}};
  return {f,scope,tools,call,image};
};
describe("candidate product media",()=>{
  it("prepares bounded approved assets without sending and exposes their evidence to the verifier",async()=>{
    const s=await setup();expect(await s.tools.invoke(s.call)).toMatchObject({status:"OK"});
    expect(s.tools.mediaSelection!()).toMatchObject([{productId:s.f.product.productId,url:s.image.url}]);
    const context=s.tools.snapshot();
    expect(context.protectedClaims).toEqual(expect.arrayContaining([expect.objectContaining({type:"PRODUCT_MEDIA"})]));
    expect(context.policyLiterals.some(p=>p.text.includes('"intent":"BACK"'))).toBe(true);
    expect(JSON.stringify(context)).not.toContain(s.image.url);
  });
  it.each(["review","hash","timestamp","host","color"])("fails closed when selected media lacks source authority (%s)",async failure=>{
    const s=await setup();
    if(failure==="review") s.f.product.images[0]!.reviewStatus=null;
    if(failure==="hash") s.f.product.images[0]!.sourceContentSha256=null;
    if(failure==="timestamp") {s.f.product.images[0]!.observedAt=null;s.f.product.observedAt=null;}
    if(failure==="host") s.f.product.images[0]!.url="https://localhost/image.jpg";
    const call=failure==="color" ? {...s.call,args:{...s.call.args,color:"unverified-color"}} : s.call;
    expect(await s.tools.invoke(call)).toMatchObject({status:"UNAVAILABLE"});
    expect(s.tools.mediaSelection!()).toEqual([]);
  });
  it("rejects a fake URL argument or a subject not supplied by code",async()=>{
    const s=await setup();
    expect(await s.tools.invoke({...s.call,args:{...s.call.args,url:s.image.url}})).toMatchObject({status:"REJECTED"});
    expect(await s.tools.invoke({...s.call,args:{...s.call.args,subjectRef:"OTHER"}})).toMatchObject({status:"REJECTED"});
  });
  it("does not authorize changed media with an old verifier PASS",async()=>{
    const s=await setup();expect(await s.tools.invoke(s.call)).toMatchObject({status:"OK"});
    const result=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Gửi ảnh mặt sau chị nhé.",history:[],clock:()=>commerceNow,
      ownerPrompt:"Tư vấn.",verifierPrompt:"Kiểm nghĩa.",owner:async()=>({kind:"FINAL",text:"Ảnh mặt sau đây chị nhé."}),
      verifier:async()=>{s.f.product.images[0]!.url="https://content.pancake.vn/replaced.jpg";return {result:{verdict:"PASS",violations:[]}};}});
    expect(result.verifierGenerations).toBe(1);
    expect(result.terminal.disposition).not.toBe("SEND_ELIGIBLE");
  });
});
