import {createMediaCapabilityCache} from "./single-agent-commerce-media-capabilities.js";
import {describe,it,expect,vi} from "vitest";
import {createCommerceTools} from "./single-agent-commerce.js";
import {runCommerceTurn} from "./single-agent-commerce-read-only.js";
import {commerceNow,commerceScope,fixtureProduct,fixturePolicy} from "./single-agent-commerce.test-support.js";
import type {ProductImage} from "@lana/business-tools";
import type {ProtectedClaimV1} from "@lana/contracts";
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

it("does not mislabel a second asset fetch failure as validation of that asset",async()=>{
 const s=await setup(),events:import("./single-agent-commerce-diagnostics.js").CommerceDiagnostic[]=[];
 s.f.product.images[0]!.angle="FRONT";s.f.product.images=[...s.f.product.images,{...s.f.product.images[0]!,angle:"BACK",url:"https://content.pancake.vn/second-back.jpg",sortOrder:1}];
 const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY90AAAAASUVORK5CYII=","base64");let fetched=0;
 const mock=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>{if(fetched++>0)throw Error("secret fetch failure");return new Response(png,{headers:{"content-type":"image/png"}});});
 try{const tools=await createCommerceTools({read:{scope:s.scope,clock:()=>commerceNow,policy:fixturePolicy,initialProducts:[s.f.product],catalog:{readProduct:async()=>structuredClone(s.f),searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
   media:{allowedHostSuffixes:["content.pancake.vn"]},observeDiagnostics:e=>events.push(e)});
  expect(await tools.invoke({name:"view_product_media",args:{subjectRef:s.f.product.productId,intent:"GENERIC"}})).toMatchObject({status:"UNAVAILABLE",reason:"MEDIA_SOURCE_UNAVAILABLE"});
  expect(events.filter(e=>e.stage==="MEDIA_FETCH"&&e.status==="STARTED")).toHaveLength(2);
  expect(events.filter(e=>e.stage==="MEDIA_VALIDATE"&&e.status==="STARTED")).toHaveLength(1);
  expect(events.filter(e=>e.stage==="MEDIA_VALIDATE"&&e.status==="OK")).toHaveLength(1);
  expect(events.filter(e=>e.stage==="MEDIA_VALIDATE"&&e.status==="ERROR")).toHaveLength(0);
  expect(JSON.stringify(events)).not.toContain("secret");
 }finally{mock.mockRestore();}
});
describe("candidate product media",()=>{
  it("binds claims to a successful revalidation and rejects later proof changes",async()=>{
    const s=await setup();s.f.product.images[0]!.observedAt="2026-09-01T00:00:00.000Z";
    s.f.product.images[0]!.revalidation={status:"VALID",checkedAt:commerceNow.toISOString()};
    expect(await s.tools.invoke(s.call)).toMatchObject({status:"OK"});
    expect(s.tools.mediaSelection?.()[0]?.observedAt).toBe(commerceNow.toISOString());
    expect((s.tools.snapshot().protectedClaims as ProtectedClaimV1[]).some(c=>
      c.type==="PRODUCT_MEDIA"&&c.provenance.observedAt===commerceNow.toISOString())).toBe(true);
    await expect(s.tools.readback()).resolves.toEqual(s.tools.snapshot());
    s.f.product.images[0]!.revalidation={status:"INVALID"};
    await expect(s.tools.readback()).rejects.toThrow("MEDIA_SOURCE_CHANGED");
  });
  it("preserves approved whole-look evidence without inventing component or material evidence",async()=>{
    const s=await setup();s.f.product.images[0]!.partsVisible=["FULL_SET"];
    const selected=await s.tools.invoke(s.call);
    expect(selected).toMatchObject({status:"OK",data:{descriptionEvidence:{assets:[{
      wholeLook:true,confirmedParts:[],componentKnown:false,
    }]}}});
    const literal=s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("media:"))!;
    expect(JSON.parse(literal.text).descriptionEvidence).toEqual((selected.data as Record<string,unknown>).descriptionEvidence);
    s.f.product.images[0]!.partsVisible=["UNKNOWN"];
    const other=await setup();other.f.product.images[0]!.partsVisible=["UNKNOWN"];
    expect(await other.tools.invoke(other.call)).toMatchObject({data:{descriptionEvidence:{assets:[{wholeLook:false}]}}});
  });
  it("describes only confirmed parts of selected assets, never catalog fabric or requested color",async()=>{
    const s=await setup();s.f.product.images[0]!.partsVisible=["UNKNOWN"];
    const selected=await s.tools.invoke(s.call);
    expect(selected).toMatchObject({status:"OK",data:{descriptionEvidence:{color:null,
      assets:[{confirmedParts:[],componentKnown:false}]}}});
    const literal=s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("media:"))!;
    expect(JSON.parse(literal.text).descriptionEvidence).toEqual((selected.data as Record<string,unknown>).descriptionEvidence);
  });
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
  it("offers only eligible alternatives from the same lookup, visible to both models",async()=>{
    const s=await setup();s.f.product.images=[...s.f.product.images,
      {...s.image,url:"https://content.pancake.vn/detail.jpg",imageType:"DETAIL",angle:"CLOSEUP"},
      {...s.image,url:"https://content.pancake.vn/feedback.jpg",feedback:true,metadataVerified:false}];
    const before=s.readProduct.mock.calls.length;
    const result=await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK",componentRole:"TOP"}});
    const alternatives=(result.data as {availableAlternatives:unknown}).availableAlternatives;
    expect(alternatives).toEqual(["GENERIC","BACK","DETAIL","PRODUCT_ONLY"]);
    expect(s.readProduct).toHaveBeenCalledTimes(before+1);
    expect(s.tools.mediaSelection!()).toEqual([]); // Availability is not a selection or a send.
    const observation=JSON.parse(s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("media-lookup:"))!.text);
    expect(observation.availableAlternatives).toEqual(alternatives);
    expect(observation.requested.componentRole).toBe("TOP");
    await expect(s.tools.readback()).resolves.toEqual(s.tools.snapshot());
    const captured:unknown[]=[];
    const turn=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Có ảnh khách mặc không em?",history:[],clock:()=>commerceNow,
      ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm nghĩa",owner:async r=>{captured.push(r.context);return {kind:"FINAL",text:"Chị xem ảnh cận phần áo nhé?"};},
      verifier:async r=>{captured.push(r.trusted);return {result:{verdict:"PASS",violations:[]}};}});
    expect(turn.terminal.disposition).toBe("SEND_ELIGIBLE");
    expect(captured).toHaveLength(2);expect(captured[0]).toEqual(captured[1]);
    expect(JSON.stringify(captured[1])).toContain('availableAlternatives');
    s.f.product.images[1]!.metadataVerified=false;
    await expect(s.tools.readback()).rejects.toThrow("MEDIA_LOOKUP_SOURCE_CHANGED");
  });
  it("does not offer another component, unknown color or a failed source as an alternative",async()=>{
    const s=await setup();
    const missing=await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK",componentRole:"SKIRT"}});
    expect(missing.data).toMatchObject({availableAlternatives:[]});
    s.f.product.colors=["navy","be"];
    const color=await s.tools.invoke({...s.call,args:{...s.call.args,color:"be"}});
    expect(color.data).toMatchObject({availableAlternatives:null});
    s.readProduct.mockRejectedValue(new Error("SOURCE_ERROR"));
    const unavailable=await s.tools.invoke(s.call);
    expect(unavailable.data).toMatchObject({availableAlternatives:null});
  });
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

it("does not ask the customer to repeat an image choice after a failed feedback lookup",async()=>{
 const s=await setup();await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK"}});
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Có ảnh khách mặc không em?",history:[],clock:()=>commerceNow,
 ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm nghĩa",owner:async()=>({kind:"FINAL",text:"Shop không có ảnh."}),
 verifier:async()=>({result:{verdict:"UNCERTAIN",violations:[]}})});
 expect(r.terminal).toMatchObject({disposition:"NO_SEND",fallbackId:null,text:null});
});

it("retains feedback provenance but does not blame available media for a semantic rejection",async()=>{
 const s=await setup();s.f.product.images[0]!.feedback=true;
 await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"FEEDBACK"}});
 const media=s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("media:"))!;
 expect(JSON.parse(media.text).assets[0].feedback).toBe(true);
 const r=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Ảnh khách mặc nhé",history:[],clock:()=>commerceNow,
 ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm nghĩa",owner:async()=>({kind:"FINAL",text:"Ảnh đây chị"}),verifier:async()=>({result:{verdict:"UNCERTAIN",violations:[]}})});
 expect(r.terminal).toMatchObject({disposition:"NO_SEND",fallbackId:null,text:null});
});

it("does not claim an image was unavailable after a successful visual read for sales advice",async()=>{
 const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY90AAAAASUVORK5CYII=","base64");
 const fetched=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>new Response(png,{headers:{"content-type":"image/png"}}));
 try{
  const s=await setup();s.f.product.images[0]!.sourceContentSha256=createHash("sha256").update(png).digest("hex");
  expect(await s.tools.invoke({...s.call,name:"view_product_media"})).toMatchObject({status:"OK"});
  const r=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Đi gặp khách thì lấy cả bộ hay áo thôi em?",history:[],clock:()=>commerceNow,
   ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm nghĩa",owner:async()=>({kind:"FINAL",text:"Chân váy này dài đến mắt cá."}),
   verifier:async()=>({result:{verdict:"FAIL",violations:[{kind:"UNSUPPORTED_PROTECTED_ASSERTION",protectedRef:`product:${s.f.product.productId}`,excerpt:"dài đến mắt cá",basis:"Nguồn chưa xác nhận chiều dài."}]}})});
  expect(r.terminal).toMatchObject({disposition:"NO_SEND",text:null,fallbackId:null});
  expect(r.recovery?.originalReason).toBe("FAIL");
 }finally{fetched.mockRestore();}
});

it("keeps repeated readbacks unchanged for a no-match component lookup after all offers",async()=>{
 const s=await setup();await s.tools.invoke({name:"read_product",args:{subjectRef:s.f.product.productId}});
 await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"DETAIL",componentRole:"SKIRT"}});
 const original=s.tools.snapshot();expect(await s.tools.readback()).toEqual(original);expect(await s.tools.readback()).toEqual(original);
});


it("offers an explicit unselected color-free query, preserving intent/component and requiring a real second selection",async()=>{
 const s=await setup();s.f.product.colors=[];
 const result=await s.tools.invoke({...s.call,args:{subjectRef:s.f.product.productId,intent:"BACK",color:"be",componentRole:"TOP"}});
 expect(result).toMatchObject({status:"UNAVAILABLE",reason:"MEDIA_COLOR_BINDING_UNVERIFIED",data:{preparedAttachmentCount:0,
  nextSelection:{name:"select_product_media",args:{subjectRef:s.f.product.productId,intent:"BACK",componentRole:"TOP"}}}});
 expect(s.tools.mediaSelection!()).toEqual([]);expect(s.readProduct).toHaveBeenCalledTimes(1);
 const next=(result.data as {nextSelection:{name:string;args:Record<string,unknown>}}).nextSelection;
 expect(await s.tools.invoke(next)).toMatchObject({status:"OK"});expect(s.tools.mediaSelection!()).toHaveLength(1);
 const failed=await setup();failed.readProduct.mockRejectedValue(new Error("source unavailable"));
 const error=await failed.tools.invoke(failed.call);
 expect(error).toMatchObject({reason:"MEDIA_SOURCE_UNAVAILABLE"});expect(error.data).not.toHaveProperty("nextSelection");
});

it("treats null optional media color as a generic lookup without claiming the requested color",async()=>{
 const s=await setup();s.f.product.colors=["navy","be"];
 expect(await s.tools.invoke({...s.call,args:{...s.call.args,color:"be"}})).toMatchObject({status:"UNAVAILABLE",reason:"MEDIA_COLOR_BINDING_UNVERIFIED"});
 const selected=await s.tools.invoke({...s.call,args:{...s.call.args,color:null,componentRole:"TOP"}});
 expect(selected).toMatchObject({status:"OK",data:{scope:"GENERIC_PRODUCT",colorMatched:false,descriptionEvidence:{color:null}}});
 expect(s.tools.mediaSelection!()).toHaveLength(1);
 const literal=s.tools.snapshot().policyLiterals.find(p=>p.ref.startsWith("media:"))!;
 expect(JSON.parse(literal.text)).toMatchObject({color:null,componentRole:"TOP",descriptionEvidence:{color:null}});
 expect(await s.tools.invoke({...s.call,args:{...s.call.args,color:0}})).toMatchObject({status:"REJECTED",reason:"MEDIA_ARGUMENTS_OR_REF"});

 const missing=await setup();missing.f.product.images=[];
 expect(await missing.tools.invoke({...missing.call,args:{...missing.call.args,color:null}})).toMatchObject({status:"UNAVAILABLE",reason:"NO_VERIFIED_MATCHING_MEDIA"});
 expect(missing.tools.mediaSelection!()).toEqual([]);
});

it("accepts null color for viewing only verified generic image bytes",async()=>{
 const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY90AAAAASUVORK5CYII=","base64");
 const fetch=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>new Response(png,{headers:{"content-type":"image/png"}}));
 try{
  const s=await setup();s.f.product.colors=["navy","be"];
  s.f.product.images[0]!.sourceContentSha256=createHash("sha256").update(png).digest("hex");
  expect(await s.tools.invoke({...s.call,name:"view_product_media",args:{...s.call.args,color:null,componentRole:"TOP"}})).toMatchObject({status:"OK",data:{subjectRef:s.f.product.productId,use:"APPEARANCE_ONLY"}});
  expect(s.tools.catalogImages!()).toHaveLength(1);
  expect(s.tools.mediaSelection!()).toEqual([]);
 }finally{fetch.mockRestore();}
});

it("uses verified per-asset color for multicolor products and never falls back for invalid bindings",async()=>{
 const s=await setup();s.f.product.colors=["be","navy"];
 s.f.product.images[0]!.colorBinding={status:"VALID",color:"be",sha256:"a".repeat(64)};
 const call={name:"select_product_media",args:{subjectRef:s.f.product.productId,intent:"BACK",color:"be"}};
 expect(await s.tools.invoke(call)).toMatchObject({status:"OK",data:{colorMatched:true}});
 const bad=await setup();bad.f.product.colors=["be"];bad.f.product.images[0]!.colorBinding={status:"INVALID"};
 expect(await bad.tools.invoke({...call,args:{...call.args,subjectRef:bad.f.product.productId}})).toMatchObject({status:"UNAVAILABLE"});
});

it("prepares bounded media hints without an extra read, never renews a cached observation, and clears failed reads",async()=>{
 let now=new Date(commerceNow);const s=await setup(()=>now);
 await s.tools.prepare!();const reads=s.readProduct.mock.calls.length;
 const first=s.tools.mediaCapabilities!();expect(first).toHaveLength(1);
 expect(first[0]!.queries).toContainEqual({intent:"BACK",componentRole:null,color:null,status:"MATCH_AVAILABLE"});
 now=new Date(now.getTime()+1000);expect(s.tools.mediaCapabilities!()).toEqual(first);expect(s.readProduct).toHaveBeenCalledTimes(reads);
 now=new Date(Date.parse(first[0]!.expiresAt)+1);expect(s.tools.mediaCapabilities!()).toEqual([]);
 now=new Date(commerceNow);await s.tools.invoke({name:"read_product",args:{subjectRef:s.f.product.productId,detailsOnly:true}});expect(s.tools.mediaCapabilities!()).toHaveLength(1);
 s.readProduct.mockRejectedValue(new Error("source down"));await s.tools.invoke({name:"read_product",args:{subjectRef:s.f.product.productId,detailsOnly:true}});
 expect(s.tools.mediaCapabilities!()).toEqual([]);
});

it.each([{status:"INVALID"} as const,{status:"VALID",color:"navy",sha256:"a".repeat(64)} as const,{status:"VALID",color:"be",sha256:"b".repeat(64)} as const])("blocks corrupt/conflicting color proof even on a single-color product (%j)",async colorBinding=>{
 const s=await setup();s.f.product.colors=["be"];s.f.product.images[0]!.colorBinding=colorBinding;
 expect(await s.tools.invoke({name:"select_product_media",args:{subjectRef:s.f.product.productId,intent:"BACK",color:"be"}})).toMatchObject({status:"UNAVAILABLE"});
 const generic=await setup();generic.f.product.images[0]!.colorBinding=colorBinding;expect(await generic.tools.invoke(generic.call)).toMatchObject({status:"OK"});
});
it("does not invalidate an unchanged text-only reply merely because an optional media hint changes",async()=>{
 const s=await setup();
 const result=await runCommerceTurn({scope:s.scope,tools:s.tools,latest:"Chào em",history:[],clock:()=>commerceNow,
 ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm nghĩa",owner:async request=>{expect(request.mediaCapabilities).toHaveLength(1);return {kind:"FINAL",text:"Dạ em chào chị."};},
 verifier:async()=>{s.f.product.images[0]!.colorBinding={status:"INVALID"};return {result:{verdict:"PASS",violations:[]}};}});
 expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(s.tools.mediaSelection!()).toEqual([]);
});

it("clears capabilities on a failed media source read, not only read_product",async()=>{
 const s=await setup();await s.tools.prepare!();expect(s.tools.mediaCapabilities!()).toHaveLength(1);
 s.readProduct.mockRejectedValue(new Error("source down"));await s.tools.invoke(s.call);expect(s.tools.mediaCapabilities!()).toEqual([]);
 expect(s.tools.mediaCapabilityDiagnostics!()).toContain("SOURCE_ERROR");
});

it("capability observations are immutable and bounded and never cross subject or permission boundaries",async()=>{
 const s=await setup();await s.tools.prepare!();let now=new Date(commerceNow);
 const cache=createMediaCapabilityCache(()=>now,["content.pancake.vn"],s.scope.bindingVersion);
 cache.observe(s.f.product.productId,s.f.product);const first=cache.get(s.tools.snapshot());expect(first).toHaveLength(1);
 s.f.product.images=[];expect(cache.get(s.tools.snapshot())).toEqual(first);
 const denied=s.tools.snapshot();denied.state.permission=false;expect(cache.get(denied)).toEqual([]);expect(cache.get(s.tools.snapshot())).toEqual([]);
 const product={...s.f.product,images:[s.image]};for(let i=0;i<8;i++)cache.observe("P"+i,{...product,productId:"P"+i});
 const ctx=s.tools.snapshot();ctx.boundSubjects=Array.from({length:8},(_,i)=>({ref:"P"+i,kind:"PRODUCT" as const,label:"p",bindingVersion:s.scope.bindingVersion}));
 expect(cache.get(ctx)).toEqual([]);expect(cache.takeDiagnostics()).toContain("FIELD_BYTES");
});
it("color hints summarize only the requested color tuple from the same read and do not prepare attachments",async()=>{
 const s=await setup();s.f.product.colors=["be","navy"];s.f.product.images[0]!.colorBinding={status:"VALID",color:"be",sha256:"a".repeat(64)};
 await s.tools.invoke({name:"read_product",args:{subjectRef:s.f.product.productId,offerType:"DIRECT",color:"be"}});
 expect(s.tools.mediaCapabilities!()[0]?.queries).toContainEqual({intent:"GENERIC",componentRole:null,color:"be",status:"MATCH_AVAILABLE"});
 expect(s.tools.mediaSelection!()).toEqual([]);
});
