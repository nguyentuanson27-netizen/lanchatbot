import {describe,it,expect,vi} from "vitest";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn} from "./single-agent-commerce-read-only.js";
import {commerceNow,commerceScope,fixtureProduct,fixturePolicy} from "./single-agent-commerce.test-support.js";
import type {ProductImage} from "@lana/business-tools";
import {createHash} from "node:crypto";

const setup = async (clock:()=>Date=()=>commerceNow) => {
  const f=fixtureProduct(),scope=commerceScope();
  const image:ProductImage={url:"https://content.pancake.vn/product-back.jpg",role:"PRIMARY",angle:"BACK",imageType:"PRODUCT_ONLY",intents:[],sortOrder:0,qualityScore:null,feedback:false,
    reviewStatus:"APPROVED",metadataVerified:true,sourceContentSha256:"a".repeat(64),observedAt:commerceNow.toISOString(),partsVisible:["AO"]};
  f.product.images=[image];f.product.imageUrls=[image.url];
  const readProduct=vi.fn(async()=>structuredClone(f));
  const tools=await createCommerceTools({read:{scope,clock,policy:fixturePolicy,initialProducts:[f.product],
    catalog:{readProduct,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
    media:{allowedHostSuffixes:["content.pancake.vn"]}});
  const call={name:"select_product_media",args:{subjectRef:f.product.productId,intent:"BACK"}};
  return {f,scope,tools,call,image,readProduct};
};
describe("candidate product media",()=>{
  it("pairs the overview with a complementary approved angle instead of a second front image",async()=>{
    const s=await setup();
    s.f.product.images=[
      {...s.image,url:"https://content.pancake.vn/front.jpg",angle:"FRONT",role:"PRIMARY",sortOrder:0},
      {...s.image,url:"https://content.pancake.vn/front-2.jpg",angle:"FRONT",role:"ADDITIONAL",sortOrder:1},
      {...s.image,url:"https://content.pancake.vn/back.jpg",angle:"BACK",role:"ADDITIONAL",sortOrder:2},
      {...s.image,url:"https://content.pancake.vn/unapproved-side.jpg",angle:"SIDE",role:"ADDITIONAL",sortOrder:0,metadataVerified:false},
    ];
    const call={...s.call,args:{subjectRef:s.f.product.productId,intent:"GENERIC"}};
    expect(await s.tools.invoke(call)).toMatchObject({status:"OK"});
    expect(s.tools.mediaSelection!().map(a=>a.url)).toEqual([
      "https://content.pancake.vn/front.jpg","https://content.pancake.vn/back.jpg",
    ]);
    await expect(s.tools.readback()).resolves.toBeDefined();
    s.f.product.images[2]!.url="https://content.pancake.vn/replaced-back.jpg";
    const result=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Cho chị xem mẫu này nhé.",history:[],clock:()=>commerceNow,
      ownerPrompt:"Tư vấn.",verifierPrompt:"Kiểm nghĩa.",owner:async()=>({kind:"FINAL",text:"Em gửi ảnh mẫu này chị nhé."}),
      verifier:async()=>{s.f.product.images[2]!.url="https://content.pancake.vn/changed-again.jpg";return {result:{verdict:"PASS",violations:[]}};}});
    expect(result.terminal.disposition).not.toBe("SEND_ELIGIBLE");
  });
  it("keeps detail and verified feedback distinct without substituting catalog images",async()=>{
    const s=await setup();
    s.f.product.images=[s.image,
      {...s.image,url:"https://content.pancake.vn/detail.jpg",angle:"CLOSEUP",imageType:"DETAIL",role:"ADDITIONAL"},
      {...s.image,url:"https://content.pancake.vn/feedback.jpg",feedback:true,role:"ADDITIONAL"},
    ];
    for(const [intent,url] of [["DETAIL","detail.jpg"],["FEEDBACK","feedback.jpg"]]){
      const t=await setup();t.f.product.images=structuredClone(s.f.product.images);
      expect(await t.tools.invoke({...t.call,args:{subjectRef:t.f.product.productId,intent}})).toMatchObject({status:"OK"});
      expect(t.tools.mediaSelection!().map(a=>a.url)).toEqual([`https://content.pancake.vn/${url}`]);
    }
    s.f.product.images=s.f.product.images.filter(i=>!i.feedback);
    expect(await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK"}})).toMatchObject({status:"UNAVAILABLE",reason:"NO_VERIFIED_MATCHING_MEDIA"});
    expect(s.tools.mediaSelection!()).toEqual([]);
  });
  it("never uses legacy imageUrls when no approved overview remains",async()=>{
    const s=await setup();s.f.product.images[0]!.metadataVerified=false;
    expect(s.f.product.imageUrls).toHaveLength(1);
    expect(await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"GENERIC"}})).toMatchObject({status:"UNAVAILABLE",reason:"NO_VERIFIED_MATCHING_MEDIA"});
    expect(s.tools.mediaSelection!()).toEqual([]);
  });
  it("distinguishes an unverified color binding from an unavailable source or missing approved image",async()=>{
    const s=await setup();s.f.product.colors=["navy","be"];
    expect(await s.tools.invoke({...s.call,args:{...s.call.args,color:"be"}})).toMatchObject({status:"UNAVAILABLE",reason:"MEDIA_COLOR_BINDING_UNVERIFIED",data:{subjectRef:s.f.product.productId,requested:{intent:"BACK",color:"be"},scope:"MEDIA_ONLY"}});
    expect(await s.tools.invoke(s.call)).toMatchObject({status:"OK",data:{scope:"GENERIC_PRODUCT",colorMatched:false}});
    s.f.product.images[0]!.reviewStatus=null;
    expect(await s.tools.invoke(s.call)).toMatchObject({status:"UNAVAILABLE",reason:"NO_VERIFIED_MATCHING_MEDIA",data:{scope:"MEDIA_ONLY"}});
  });

  it("lets the same owner inspect verified public bytes without selecting an outbound image",async()=>{
    const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY90AAAAASUVORK5CYII=","base64");
    const fetch=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>new Response(png,{headers:{"content-type":"image/png"}}));
    try{
      const s=await setup();s.f.product.images[0]!.sourceContentSha256=createHash("sha256").update(png).digest("hex");
      expect(await s.tools.invoke({...s.call,name:"view_product_media"})).toMatchObject({status:"OK"});
      expect(s.tools.mediaSelection!()).toEqual([]);
      const images=s.tools.catalogImages!();expect(images).toHaveLength(1);
      expect(images[0]).toMatchObject({subjectRef:s.f.product.productId,sha256:s.f.product.images[0]!.sourceContentSha256,mimeType:"image/png"});
      expect(Buffer.from(images[0]!.data,"base64")).toEqual(png);
      expect(JSON.stringify(s.tools.snapshot())).not.toContain(images[0]!.data);
      expect(JSON.stringify(s.tools.snapshot())).toContain(images[0]!.sha256);
      const captured:unknown[]=[];
      const result=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Phối áo này với quần jeans được không em?",history:[],clock:()=>commerceNow,
        ownerPrompt:"Tư vấn.",verifierPrompt:"Kiểm nghĩa.",owner:async request=>{expect(request.catalogImages).toHaveLength(1);return {kind:"FINAL",text:"Chị phối với quần jeans nhé."};},
        verifier:async request=>{captured.push(request);return {result:{verdict:"PASS",violations:[]}};}});
      expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
      expect(JSON.stringify(captured)).not.toContain(images[0]!.data);
    }finally{fetch.mockRestore();}
  });
  it("never passes invalid image bytes to the owner",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new Uint8Array([1,2,3]),{headers:{"content-type":"image/png"}}));
    try{const s=await setup();expect(await s.tools.invoke({...s.call,name:"view_product_media"})).toMatchObject({status:"UNAVAILABLE"});expect(s.tools.catalogImages!()).toEqual([]);expect(fetch).toHaveBeenCalledTimes(1);}
    finally{fetch.mockRestore();}
  });
  it("keeps the registry reconciliation hash separate from the exact downloaded bytes",async()=>{
    const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY90AAAAASUVORK5CYII=","base64"),
      fetch=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>new Response(png,{headers:{"content-type":"image/png"}}));
    try{
      const s=await setup();expect(await s.tools.invoke({...s.call,name:"view_product_media"})).toMatchObject({status:"OK"});
      const image=s.tools.catalogImages!()[0]!;
      expect(image.sha256).toBe(createHash("sha256").update(png).digest("hex"));
      const vision=JSON.parse(s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("vision:"))!.text);
      expect(vision.assets[0]).toMatchObject({registrySha256:"a".repeat(64),downloadSha256:image.sha256});
      await expect(s.tools.readback()).resolves.toBeDefined();
      fetch.mockImplementation(async()=>new Response(Buffer.concat([png,Buffer.from([0])]),{headers:{"content-type":"image/png"}}));
      await expect(s.tools.readback()).rejects.toThrow("VIEWED_MEDIA_BYTES_CHANGED");
    }finally{fetch.mockRestore();}
  });
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

describe("media lookup observations",()=>{
  it("binds no-match evidence and rejects a later feedback asset",async()=>{
    const s=await setup();
    await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK"}});
    const before=s.tools.snapshot();
    expect(before.policyLiterals.some(p=>p.ref.startsWith("media-lookup:"))).toBe(true);
    expect(JSON.stringify(before)).toContain("NO_VERIFIED_MATCHING_MEDIA");
    expect(await s.tools.readback()).toEqual(before);
    s.f.product.images[0]!.feedback=true;
    await expect(s.tools.readback()).rejects.toThrow("MEDIA_LOOKUP_SOURCE_CHANGED");
  });
  it("binds color uncertainty to the inspected source",async()=>{
    const s=await setup();s.f.product.colors=["navy","be"];
    await s.tools.invoke({...s.call,args:{...s.call.args,color:"be"}});
    expect(JSON.stringify(s.tools.snapshot())).toContain("MEDIA_COLOR_BINDING_UNVERIFIED");
    s.f.product.colors=["be"];
    await expect(s.tools.readback()).rejects.toThrow("MEDIA_LOOKUP_SOURCE_CHANGED");
  });
  it("keeps selected images when view decoding fails and exposes only operation evidence",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new Uint8Array([1,2,3])));
    try{
      const s=await setup();await s.tools.invoke(s.call);
      await s.tools.invoke({...s.call,name:"view_product_media"});
      expect(s.tools.mediaSelection!()).toHaveLength(1);
      const text=JSON.stringify(s.tools.snapshot());
      expect(text).toContain("IMAGE_FETCH_OR_PREPARE");
      expect(text).toContain("OPERATION_EVENT_ONLY");
      expect(text).not.toContain("MEDIA_DIMENSION_BOUND");
      await s.tools.readback();expect(fetch).toHaveBeenCalledTimes(1);
      const t=await setup();expect(JSON.stringify(t.tools.snapshot())).not.toContain("media-lookup:");
    }finally{fetch.mockRestore();}
  });
});

describe("media observation final gate",()=>{
  it("keeps timestamps fixed and expires without renewing the observation",async()=>{
    let now=commerceNow;const s=await setup(()=>now);
    await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK"}});
    const before=s.tools.snapshot();now=new Date(now.getTime()+1000);
    expect(await s.tools.readback()).toEqual(before);
    now=new Date(before.policyLiterals.find(p=>p.ref.startsWith("media-lookup:"))!.expiresAt!);
    await expect(s.tools.readback()).rejects.toThrow("MEDIA_LOOKUP_EXPIRED");
  });
  it("records a catalog error as an operation event without retrying or leaking its error",async()=>{
    const s=await setup();s.readProduct.mockRejectedValue(new Error("SECRET_RAW_ERROR"));
    await s.tools.invoke(s.call);const before=s.tools.snapshot();
    expect(JSON.stringify(before)).toContain("OPERATION_EVENT_ONLY");
    expect(JSON.stringify(before)).not.toContain("SECRET_RAW_ERROR");
    const calls=s.readProduct.mock.calls.length;
    expect(await s.tools.readback()).toEqual(before);
    expect(s.readProduct).toHaveBeenCalledTimes(calls);
  });
  it("passes identical scoped evidence to both models and blocks a changed source after PASS",async()=>{
    const s=await setup();await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK"}});
    const contexts:unknown[]=[];
    const result=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Có ảnh khách mặc không em?",history:[],clock:()=>commerceNow,
      ownerPrompt:"Tư vấn.",verifierPrompt:"Kiểm nghĩa.",owner:async r=>{contexts.push(r.context);return {kind:"FINAL",text:"Ảnh khách mặc mẫu này em chưa có để gửi chị."};},
      verifier:async r=>{contexts.push(r.trusted);s.f.product.images[0]!.feedback=true;return {result:{verdict:"PASS",violations:[]}};}});
    expect(contexts).toHaveLength(2);expect(contexts[0]).toEqual(contexts[1]);
    expect(result.terminal.disposition).not.toBe("SEND_ELIGIBLE");
  });
});
