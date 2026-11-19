import { describe, expect, it, vi } from "vitest";
import { canonicalCartPolicyLinesV2, type CustomerProfileMergeState } from "@lana/business-tools";
import { createCustomerStateTools, createRealtimeCustomerStatePort, type CustomerStatePort } from "./single-agent-commerce-state.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { hardPrecheck, makeBinding,finalGate } from "./single-agent-semantic-verifier-boundary.js";
import { runCommerceTurn, type OwnerGeneration } from "./single-agent-commerce-read-only.js";
import { commerceScope, commerceNow, fixturePolicy, fixtureProduct, fixtureProfile, fixtureSizeInput, fixtureCartLine } from "./single-agent-commerce.test-support.js";

async function setup(sourceText = "Eo 74. Eo 85, mông 105.") {
  let stored: CustomerProfileMergeState = fixtureProfile();
  const store: CustomerStatePort = { read: async () => structuredClone(stored),
    compareAndSwap: vi.fn(async (expected, next) => { if (stored.profile.revision !== expected) return false; stored = structuredClone(next); return true; }) };
  const f = fixtureProduct("QU714"), scope = commerceScope();
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(), initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "MATCHED", matchKind: "EXACT_CODE", product: f.product, score: 1, gap: null }) } });
  const sizeInput = vi.fn(async () => fixtureSizeInput());
  const tools = await createCustomerStateTools({ base, scope, store, clock: () => commerceNow, sizeInput, sourceMessages: [{ text: sourceText, sourceMessageId: scope.sourceMessageId, observedAt: scope.sourceObservedAt! }] });
  return { tools, base, store, sizeInput, getStored: () => stored, setStored: (s: CustomerProfileMergeState) => { stored = s; } };
}
describe("accepted effective state before dependent tools", () => {
  it("records an explicit current offer choice without opening a cart or treating a comparison read as a choice",async()=>{
    const s=await setup();const r=await s.tools.invoke({name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT",customerSelected:true}});
    expect(r.status).toBe("OK");expect(s.tools.snapshot().state.shoppingSelection).toEqual({productId:"QU714",offerType:"DIRECT"});
    expect(s.tools.snapshot().state.currentProductId).toBe("QU714");expect(s.tools.snapshot().state.cartItems).toBeUndefined();
    expect(s.tools.snapshot().effectReceipts).toEqual([]);
    const before=s.getStored();await s.tools.invoke({name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT"}});
    expect(s.getStored()).toEqual(before);
  });
  it("selection metadata preserves a just-verified fit and real numeric correction receipt",async()=>{
    const s=await setup("Eo 74.");
    await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}]}});
    const receipts=structuredClone(s.tools.snapshot().effectReceipts);
    await s.tools.invoke({name:"read_product",args:{subjectRef:"QU714",offerType:"DIRECT",customerSelected:true}});
    expect(s.tools.snapshot().effectReceipts).toEqual(receipts);
    expect(s.tools.snapshot().protectedClaims.filter(c=>(c as {type:string}).type==="SIZE_FIT")).toHaveLength(1);
    expect(hardPrecheck(s.tools.snapshot(),"Mình chọn M chị nhé.",commerceNow)).toBeNull();
  });
  it("drops old unbound advice metadata instead of exhausting a customer lifetime limit",async()=>{
    const s=await setup(),old=structuredClone(s.getStored());old.profile.sizeAdviceTargets=[1,2,3,4].map(n=>({kind:"PRODUCT",productId:`OLD${n}`}));s.setStored(old);
    const tools=await createCustomerStateTools({base:s.base,scope:commerceScope(),store:s.store,clock:()=>commerceNow,sizeInput:s.sizeInput,retainAdvice:true});
    expect((await tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}})).status).toBe("OK");
    expect(s.getStored().profile.sizeAdviceTargets).toEqual([{kind:"PRODUCT",productId:"QU714"}]);
  });
  it("recomputes retained advice in a new turn and never carries a stale fit after correction",async()=>{
    const s=await setup();const make=()=>createCustomerStateTools({base:s.base,scope:commerceScope(),store:s.store,
      clock:()=>commerceNow,sizeInput:s.sizeInput,retainAdvice:true} as Parameters<typeof createCustomerStateTools>[0]);
    const first=await make();await first.invoke({name:"recommend_size",args:{subjectRef:"QU714"}});
    expect(first.snapshot().protectedClaims.some(c=>(c as {type:string}).type==="SIZE_FIT")).toBe(true);
    const second=await make();expect(second.snapshot().protectedClaims.some(c=>(c as {type:string}).type==="SIZE_FIT")).toBe(true);
    const changed=structuredClone(s.getStored());changed.profile.revision++;changed.profile.measurements=[];s.setStored(changed);
    expect((await second.readback()).protectedClaims.some(c=>(c as {type:string}).type==="SIZE_FIT")).toBe(false);
  });
  it("applies identical inline profile evidence once before computing two targets",async()=>{
    const s=await setup("Eo 74.");const ops=[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}];
    const results=await s.tools.invokeBatch(["QU714","QU714"].map(subjectRef=>({name:"recommend_size",args:{subjectRef,customerStateOps:ops}})));
    expect(results.every(r=>r.status==="OK")).toBe(true);expect(s.store.compareAndSwap).toHaveBeenCalledTimes(1);
  });
  it("retains two different component targets without a CAS race or losing the real correction receipt",async()=>{
    const s=await setup("Eo 74.");
    const componentSizeInput=async(r:{parentProductId:string;componentRole:"TOP"|"PANTS"})=>{
      const v=fixtureSizeInput(r.parentProductId),target={...v.target,componentProductId:`PART-${r.componentRole}`,componentRole:r.componentRole};
      return {...v,target,charts:v.charts.map(c=>({chart:{...c.chart,componentRole:r.componentRole},scope:{...c.scope,componentRole:r.componentRole}})),
        fitTarget:{kind:"COMPONENT" as const,parentProductId:r.parentProductId,componentProductId:target.componentProductId,componentRole:r.componentRole},
        sourceBindingHash:"b".repeat(64),sourceExpiresAt:new Date(commerceNow.getTime()+1000).toISOString()};
    };
    const make=(unavailable=false)=>createCustomerStateTools({base:s.base,scope:commerceScope(),store:s.store,clock:()=>commerceNow,sizeInput:s.sizeInput,
      sourceMessages:[{text:"Eo 74.",sourceMessageId:commerceScope().sourceMessageId,observedAt:commerceScope().sourceObservedAt}],retainAdvice:true,
      componentSizeInput:unavailable?async()=>{throw Error("SOURCE_UNAVAILABLE");}:componentSizeInput as NonNullable<Parameters<typeof createCustomerStateTools>[0]["componentSizeInput"]>});
    const tools=await make(),ops=[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}];
    const results=await tools.invokeBatch(["TOP","PANTS"].map(componentRole=>({name:"recommend_size",args:{subjectRef:"QU714",fitScope:"COMPONENT",componentRole,customerStateOps:ops}})));
    expect(results.map(r=>r.status)).toEqual(["OK","OK"]);expect(s.store.compareAndSwap).toHaveBeenCalledTimes(2);
    expect(tools.snapshot().protectedClaims.filter(c=>(c as {type:string}).type==="SIZE_FIT")).toHaveLength(2);
    expect(tools.snapshot().effectReceipts).toContainEqual(expect.objectContaining({effect:"CUSTOMER_STATE_UPDATED",status:"SUCCESS"}));
    expect(hardPrecheck(tools.snapshot(),"Dạ, em chọn M chị nhé.",commerceNow)).toBeNull();
    const restarted=await make();expect(restarted.snapshot().protectedClaims.filter(c=>(c as {type:string}).type==="SIZE_FIT")).toHaveLength(2);
    const missing=await make(true);expect(missing.snapshot().state.customerStateUpdatePending).toBeUndefined();expect(missing.sizeOutcome?.()).toBeNull();
    expect(hardPrecheck(missing.snapshot(),"Dạ chị.",commerceNow)).toBeNull();
  });
  it.each(["backward","forward","profile"])("keeps component evidence nonrenewing and invalidates changed %s source",async mode=>{
    const s=await setup();let delta=100000;
    const source=fixtureSizeInput(),fitTarget={kind:"COMPONENT" as const,parentProductId:"QU714",componentProductId:"PART-PANTS",componentRole:"PANTS" as const};
    const componentSizeInput=async()=>({...source,target:{...source.target,componentProductId:fitTarget.componentProductId},fitTarget,
      sourceBindingHash:"c".repeat(64),sourceExpiresAt:new Date(commerceNow.getTime()+delta).toISOString()});
    const tools=await createCustomerStateTools({base:s.base,scope:commerceScope(),clock:()=>commerceNow,store:s.store,sizeInput:s.sizeInput,componentSizeInput});
    expect((await tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",fitScope:"COMPONENT",componentRole:"PANTS"}})).status).toBe("OK");
    const before=tools.snapshot();expect(before.protectedClaims).toHaveLength(1);
    if(mode==="profile"){const profile=structuredClone(s.getStored());profile.profile.revision++;s.setStored(profile);}
    else delta+=mode==="backward"?-1000:1000;
    const after=await tools.readback();
    expect(after.protectedClaims).toHaveLength(mode==="forward"?1:0);
    if(mode==="forward")expect(after.protectedClaims).toEqual(before.protectedClaims);
  });
  it("keeps independent component fits and revokes them when their BOM/chart binding changes",async()=>{
    const s=await setup();let changed=false;
    const componentSizeInput=vi.fn(async(request:{parentProductId:string;componentRole:string})=>{
      const source=fixtureSizeInput(request.parentProductId),role=request.componentRole as "TOP"|"PANTS";
      const componentProductId=`PART-${role}`;
      const target={...source.target,componentRole:role,componentProductId};
      const charts=source.charts.map(c=>({chart:{...c.chart,componentRole:role},scope:{...c.scope,componentRole:role}}));
      return {target,charts,fitTarget:{kind:"COMPONENT" as const,parentProductId:request.parentProductId,componentProductId,componentRole:role},
        sourceBindingHash:(changed?"d":"c").repeat(64),sourceExpiresAt:new Date(commerceNow.getTime()+1000).toISOString()};
    });
    const tools=await createCustomerStateTools({base:s.base,scope:commerceScope(),clock:()=>commerceNow,store:s.store,sizeInput:s.sizeInput,componentSizeInput});
    for(const componentRole of ["TOP","PANTS"]){
      expect(await tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",fitScope:"COMPONENT",componentRole}})).toMatchObject({status:"OK",data:{status:"RECOMMENDED",fitScope:{kind:"COMPONENT",componentRole}}});
    }
    const context=tools.snapshot();expect(context.protectedClaims).toHaveLength(2);
    expect(hardPrecheck(context,"Em chọn M chị nhé.",commerceNow)).toBeNull();
    const claims=context.protectedClaims as {value:{fitTarget:{componentRole:string}}}[];
    expect(claims.map(c=>c.value.fitTarget.componentRole).sort()).toEqual(["PANTS","TOP"]);
    const forged=structuredClone(context);delete forged.state.sizeFitTargets;
    expect(hardPrecheck(forged,"Dạ chị.",commerceNow)).not.toBeNull();
    expect((await tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}})).status).toBe("OK");
    const mixed=tools.snapshot();expect(mixed.protectedClaims).toHaveLength(3);
    const downgraded=structuredClone(mixed),component=(downgraded.protectedClaims as {value:{fitTarget?:{kind:string}}}[]).find(c=>c.value.fitTarget?.kind==="COMPONENT")!;
    delete component.value.fitTarget;expect(hardPrecheck(downgraded,"Dạ chị.",commerceNow)).not.toBeNull();
    const binding=makeBinding("expiry-test","Dạ chị.",mixed);
    expect(finalGate({expected:binding,response:{kind:"VERDICT",binding,result:{verdict:"PASS",violations:[]}},current:mixed,finalDraft:"Dạ chị.",now:new Date(commerceNow.getTime()+1001)}).disposition).toBe("HANDOFF");
    changed=true;expect((await tools.readback()).protectedClaims).toHaveLength(1);
  });
  it("keeps correction→size through actual runtime and native declarations",async()=>{
    const s=await setup(),tools={...s.tools,availableTools:["apply_customer_state","recommend_size"]};let n=0;
    const {buildGeminiCommerceRequest}=await import(new URL("../evals/single-agent-commerce-read-only/gemini-inference.mjs",import.meta.url).href);
    const calls=[{name:"recommend_size",args:{subjectRef:"QU714"}},{name:"apply_customer_state",args:{ops:[
      {op:"SET",field:"measurements.WAIST_CM",value:85,sourceQuote:"85"},{op:"SET",field:"measurements.HIPS_CM",value:105,sourceQuote:"105"}]}}];
    const result=await runCommerceTurn({scope:commerceScope(),tools,clock:()=>commerceNow,latest:"Eo 85, mông 105.",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",
      owner:async r=>{const wire=buildGeminiCommerceRequest(r);expect(wire.tools.flatMap((t:{functionDeclarations:{name:string}[]})=>t.functionDeclarations.map(d=>d.name))).toEqual(r.callableTools);
        return n++===0?{kind:"TOOLS",calls,content:{role:"model",parts:calls.map(functionCall=>({functionCall}))}}:{kind:"FINAL",text:"Mình chọn L chị nhé."};},
      verifier:async r=>{expect(r.trusted.protectedClaims).toContainEqual(expect.objectContaining({type:"SIZE_FIT",value:expect.objectContaining({recommendedSizes:[{size:"L"}]})}));return {result:{verdict:"PASS",violations:[]}};}});
    expect(result.rejectedToolCalls).toBe(0);expect(s.getStored().profile.measurements).toContainEqual(expect.objectContaining({kind:"WAIST_CM",value:85}));
    expect(result.verifierGenerations).toBe(1);
  });
  it("does not substitute product fit for a component request or write its inline state", async () => {
    const s=await setup("Eo 74.");
    const result=await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",fitScope:"COMPONENT",componentRole:"PANTS",
      customerStateOps:[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}]}});
    expect(result).toMatchObject({status:"UNAVAILABLE",reason:"SIZE_SOURCE_UNAVAILABLE"});
    expect(s.sizeInput).not.toHaveBeenCalled();expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    expect(s.tools.snapshot().protectedClaims).not.toEqual(expect.arrayContaining([expect.objectContaining({type:"SIZE_FIT"})]));
  });
  it("marks legacy product fit as product-only without blocking a valid size request",async()=>{
    const s=await setup();const result=await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}});
    expect(result).toMatchObject({status:"OK",data:{status:"RECOMMENDED",fitScope:{kind:"PRODUCT",productId:"QU714"},unsupportedScopes:["COMPONENT"]}});
  });
  it.each([{fitScope:null},{fitScope:"OTHER"},{fitScope:"COMPONENT"},{componentRole:"TOP"},{fitScope:"PRODUCT",componentRole:"TOP"},{fitScope:"COMPONENT",componentRole:"BOGUS"}])("rejects invalid sizing scope before state or engine: %j",async args=>{
    const s=await setup();expect((await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",...args}})).status).toBe("REJECTED");
    expect(s.sizeInput).not.toHaveBeenCalled();expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it("commits inline size inputs before calculation without a second tool call", async () => {
    const s = await setup("Eo 74, mông 96.");
    const result = await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:[
      {op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"},
      {op:"SET",field:"measurements.HIPS_CM",value:96,sourceQuote:"96"},
    ]}});
    expect(result).toMatchObject({status:"OK",data:{status:"RECOMMENDED"}});
    expect(s.store.compareAndSwap).toHaveBeenCalledTimes(1);
    expect(s.sizeInput).toHaveBeenCalledTimes(1);
    expect(s.tools.snapshot().effectReceipts).toHaveLength(1);
  });
  it("rejects inline input evidence before size calculation and permits one corrected bounded call", async () => {
    const s = await setup("Eo 74, mông 96.");
    const ops=[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"Eo 74, mông 96"}];
    expect(await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:ops}}))
      .toMatchObject({status:"REJECTED",reason:"MEASUREMENT_SOURCE_INVALID",data:{applied:false}});
    expect(s.sizeInput).not.toHaveBeenCalled(); expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    expect((await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:[{...ops[0],sourceQuote:"74"}]}})).status).toBe("OK");
  });
  // PR 392 case J2: the size request was refused for its inline inputs, the owner then fixed the inputs with a
  // plain write in its last tool round and had no round left to ask for the size again.
  it("evaluates a size request that waited for customer inputs once a later write commits them", async () => {
    const s = await setup("Eo 74, mông 96."),bad=[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"Eo 74, mông 96"}];
    const refused=await s.tools.invokeBatch([1,2].map(()=>({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:bad}})));
    expect(refused.map(r=>r.reason)).toEqual(["MEASUREMENT_SOURCE_INVALID","MEASUREMENT_SOURCE_INVALID"]);
    expect(s.tools.sizeOutcome!()).toBeNull();expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    const written=await s.tools.invokeBatch([{name:"apply_customer_state",args:{ops:[{...bad[0],sourceQuote:"74"}]}}]);
    expect(written).toEqual([{status:"OK",data:{revision:expect.any(Number),measurements:expect.arrayContaining([{kind:"WAIST_CM",value:74}]),
      sizeEvaluations:[{request:{subjectRef:"QU714"},status:"OK",data:expect.objectContaining({status:"RECOMMENDED",recommendedSizes:expect.any(Array)})}]}}]);
    const data=(written[0]!.data as {revision:number;sizeEvaluations:{data:{profileRevision:number;recommendedSizes:string[]}}[]});
    // The result is for the profile as just written, and the reply can state it.
    expect(data.sizeEvaluations[0]!.data.profileRevision).toBe(data.revision);
    expect(s.tools.sizeOutcome!()).toEqual({status:"RECOMMENDED"});
    expect(s.tools.snapshot().protectedClaims.filter(c=>(c as {type:string}).type==="SIZE_FIT")).toHaveLength(1);
    expect(s.tools.snapshot().effectReceipts).toHaveLength(1);
    // Settled: a further write in the turn does not evaluate it again.
    const calls=s.sizeInput.mock.calls.length;
    const later=await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.HIPS_CM",value:96,sourceQuote:"96"}]}});
    expect(later.status).toBe("OK");expect(later.data).not.toHaveProperty("sizeEvaluations");
    expect(s.sizeInput.mock.calls.length).toBe(calls);
  });
  it("evaluates nothing the owner did not ask for and nothing while an input is still unresolved", async () => {
    const plain=await setup("Eo 74.");
    expect((await plain.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}]}})).data).not.toHaveProperty("sizeEvaluations");
    expect(plain.sizeInput).not.toHaveBeenCalled();
    const s=await setup("Eo 74, mông 96.");
    await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:[
      {op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"Eo 74, mông 96"},{op:"SET",field:"measurements.HIPS_CM",value:96,sourceQuote:"Eo 74, mông 96"}]}});
    // Only one of the two refused fields is corrected: the write is incomplete, so no size is computed.
    const partial=await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}]}});
    expect(partial.status).toBe("REJECTED");expect(partial.data).not.toHaveProperty("sizeEvaluations");expect(s.sizeInput).not.toHaveBeenCalled();
    const full=await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"},{op:"SET",field:"measurements.HIPS_CM",value:96,sourceQuote:"96"}]}});
    expect(full).toMatchObject({status:"OK",data:{sizeEvaluations:[{request:{subjectRef:"QU714"},status:"OK"}]}});
  });
  it("does not evaluate a waiting request twice when the owner asks again itself", async () => {
    const s = await setup("Eo 74, mông 96."),bad=[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"Eo 74, mông 96"}];
    await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:bad}});
    expect((await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:[{...bad[0],sourceQuote:"74"}]}})).status).toBe("OK");
    const calls=s.sizeInput.mock.calls.length;
    const later=await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.HIPS_CM",value:96,sourceQuote:"96"}]}});
    expect(later.status).toBe("OK");expect(later.data).not.toHaveProperty("sizeEvaluations");
    expect(s.sizeInput.mock.calls.length).toBe(calls);
  });
  // PR 392 case J1: a note of what the customer asked to buy, kept in the profile for the next turn.
  it("keeps a pending purchase across turns without touching the profile receipt or a verified fit", async () => {
    const s = await setup("Eo 74."),line={productId:"QU714",offerType:"DIRECT",size:"M",color:null,quantity:1,missing:"COLOR" as const};
    await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}]}});
    const receipts=structuredClone(s.tools.snapshot().effectReceipts),revision=s.getStored().profile.revision;
    await s.tools.setPendingPurchase!([line,{...line,size:"L"}]);
    expect(s.getStored().profile).toMatchObject({revision:revision+1,pendingPurchase:{lines:[line,{...line,size:"L"}],recordedAt:commerceNow.toISOString()}});
    expect(s.tools.snapshot().state.pendingPurchase).toEqual({lines:[line,{...line,size:"L"}],recordedAt:commerceNow.toISOString()});
    expect(s.tools.snapshot().effectReceipts).toEqual(receipts);
    expect(s.tools.snapshot().protectedClaims.filter(c=>(c as {type:string}).type==="SIZE_FIT")).toHaveLength(1);
    // The same lines again write nothing.
    await s.tools.setPendingPurchase!([line,{...line,size:"L"}]);expect(s.getStored().profile.revision).toBe(revision+1);
    // The next turn starts from the store and still shows it.
    const make=(clock=()=>commerceNow)=>createCustomerStateTools({base:s.base,scope:commerceScope(),store:s.store,clock,sizeInput:s.sizeInput});
    expect((await make()).snapshot().state.pendingPurchase).toMatchObject({lines:[line,{...line,size:"L"}]});
    // Not shown once it is a day old, and never for a product that is not bound in the turn.
    expect((await make(()=>new Date(commerceNow.getTime()+24*3600_000+1))).snapshot().state).not.toHaveProperty("pendingPurchase");
    const other=await make();await other.setPendingPurchase!([{...line,productId:"SM000"}]);
    expect(other.snapshot().state).not.toHaveProperty("pendingPurchase");
    await other.setPendingPurchase!(null);
    expect(s.getStored().profile).not.toHaveProperty("pendingPurchase");expect(other.snapshot().state).not.toHaveProperty("pendingPurchase");
  });
  it("stays reachable through the composed tool layers", async () => {
    const {createCommerceTools}=await import("./single-agent-commerce.js"),{EXPLICIT_QUOTE_TASK}=await import("./single-agent-commerce-quote.js");
    const s=await setup(),f=fixtureProduct("QU714"),scope=commerceScope();
    const tools=await createCommerceTools({quoteTask:EXPLICIT_QUOTE_TASK,media:{allowedHostSuffixes:["example.invalid"]},
      read:{scope,clock:()=>commerceNow,policy:()=>fixturePolicy(),initialProducts:[f.product],entry:{firstContact:false,fromAd:false},
        catalog:{readProduct:async()=>f,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
      state:{store:s.store,sizeInput:s.sizeInput,sourceMessages:[]}});
    await tools.setPendingPurchase!([{productId:"QU714",offerType:"DIRECT",size:"M",color:null,quantity:2,missing:"COLOR"}]);
    expect(s.getStored().profile.pendingPurchase?.lines).toEqual([{productId:"QU714",offerType:"DIRECT",size:"M",color:null,quantity:2,missing:"COLOR"}]);
    expect(tools.snapshot().state.pendingPurchase).toMatchObject({lines:[{productId:"QU714",quantity:2}]});
  });
  it("never fails the turn when the pending purchase cannot be written", async () => {
    const s = await setup(),line={productId:"QU714",offerType:"DIRECT",size:"M",color:null,quantity:1,missing:"COLOR" as const};
    vi.mocked(s.store.compareAndSwap).mockResolvedValueOnce(false);
    await expect(s.tools.setPendingPurchase!([line])).resolves.toBeUndefined();
    expect(s.tools.snapshot().state).not.toHaveProperty("pendingPurchase");expect(s.tools.snapshot().state.customerStateUpdatePending).toBeUndefined();
    // A line the contract does not accept is dropped, not thrown.
    await expect(s.tools.setPendingPurchase!([{...line,quantity:0}])).resolves.toBeUndefined();
    expect(s.getStored().profile).not.toHaveProperty("pendingPurchase");
    expect((await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}})).status).toBe("OK");
  });
  it("does not write inline inputs for an unbound size subject or two concurrent writers", async () => {
    const s=await setup("Eo 74.");
    const ops=[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}];
    expect((await s.tools.invoke({name:"recommend_size",args:{subjectRef:"UNKNOWN",customerStateOps:ops}})).status).toBe("REJECTED");
    const results=await s.tools.invokeBatch([{name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:ops}},
      {name:"apply_customer_state",args:{ops}}]);
    expect(results.every(r=>r.reason==="MULTIPLE_STATE_UPDATES")).toBe(true);
    expect(s.store.compareAndSwap).not.toHaveBeenCalled(); expect(s.sizeInput).not.toHaveBeenCalled();
  });
  it("returns the domain enum on a fit error without partially writing numeric fields", async () => {
    const s = await setup("Eo 74, mông 96. Chị thích rộng một chút.");
    const result = await s.tools.invoke({name:"apply_customer_state",args:{ops:[
      {op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"},
      {op:"SET",field:"fitPreference",value:"rộng một chút",sourceQuote:"rộng một chút"},
    ]}});
    expect(result).toMatchObject({status:"REJECTED",reason:"STATE_FIELD_INVALID",data:{applied:false,
      fieldErrors:[{field:"fitPreference",reason:"INVALID_DOMAIN_VALUE",allowedValues:["FITTED","REGULAR","RELAXED"]}]}});
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    expect((await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}})).status).toBe("REJECTED");
    expect((await s.tools.invoke({name:"apply_customer_state",args:{ops:[
      {op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"},
      {op:"SET",field:"fitPreference",value:"RELAXED",sourceQuote:"rộng một chút"},
    ]}})).status).toBe("OK");
    expect(s.getStored().profile.fitPreference).toBe("RELAXED");
  });
  it.each([
    {field:"measurements.WEIGHT_KG",value:251,sourceQuote:"251kg"},
    {field:"preferences.colors",value:[""]},
  ])("reports domain input at the offending field without a partial write ($field)",async op=>{
    const s=await setup("Eo 85, 251kg.");
    const result=await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:85,sourceQuote:"85"},{op:"SET",...op}]}});
    expect(result).toMatchObject({status:"REJECTED",reason:"STATE_FIELD_INVALID",data:{applied:false,fieldErrors:[{field:op.field,reason:"INVALID_DOMAIN_VALUE"}]}});
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it("distinguishes a store read outage before commit from invalid input",async()=>{
    const s=await setup();s.store.read=async()=>{throw new Error("private database detail")};
    expect(await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:85,sourceQuote:"85"}]}})).toMatchObject({status:"UNAVAILABLE",reason:"STATE_SOURCE_UNAVAILABLE",data:{applied:false}});
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it.each([undefined,"not in the message"])("rejects an ungrounded fit quote without a write (%s)",async sourceQuote=>{
    const s=await setup();
    expect(await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"fitPreference",value:"RELAXED",sourceQuote}]}})).toMatchObject({status:"REJECTED",reason:"STATE_FIELD_INVALID",data:{applied:false,fieldErrors:[{field:"fitPreference",reason:"QUOTE_NOT_IN_CURRENT_MESSAGE"}]}});
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it.each(["read-throw","read-different","cas-throw"])("keeps an unknown commit blocked after a real store write (%s)", async fault => {
    const s = await setup();
    await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"}]}});
    await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}});
    expect(s.tools.snapshot().effectReceipts).toHaveLength(1);
    const cas=s.store.compareAndSwap;
    let afterWrite=false;
    const read=s.store.read;
    s.store.read=async()=>{
      if(afterWrite && fault==="read-throw") throw new Error("private transport error");
      const current=await read();
      if(afterWrite && fault==="read-different") current.profile.revision++;
      return current;
    };
    s.store.compareAndSwap=vi.fn(async(expected,next)=>{
      const result=await cas(expected,next);afterWrite=true;
      if(fault==="cas-throw")throw new Error("commit response lost");
      return result;
    });
    const result=await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:85,sourceQuote:"85"}]}});
    expect(s.getStored().profile.measurements.find(m=>m.kind==="WAIST_CM")!.value).toBe(85);
    expect(result.status).toBe("REJECTED");
    expect(result.data).not.toHaveProperty("applied");
    expect(result.reason).toMatch(/STATE_(COMMIT_UNCONFIRMED|READBACK_CHANGED)/);
    expect(s.tools.snapshot().effectReceipts).toEqual([]);
    expect(s.tools.snapshot().protectedClaims.filter(c=>(c as {type:string}).type==="SIZE_FIT")).toEqual([]);
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBe(true);
    afterWrite=false;
    expect((await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}})).status).toBe("REJECTED");
    expect((await s.tools.invoke({name:"apply_customer_state",args:{ops:[{op:"CLEAR",field:"fitPreference"}]}})).status).toBe("REJECTED");
    expect(s.store.compareAndSwap).toHaveBeenCalledTimes(1);
    expect((await s.tools.readback()).state.customerStateUpdatePending).toBe(true);
  });

  it("reports each numeric source issue without a partial write, then accepts a corrected batch", async () => {
    const s = await setup("Chị sửa lại: eo 74, mông 96.");
    const fields = ["measurements.WAIST_CM", "measurements.HIPS_CM"];
    const result = await s.tools.invoke({ name: "apply_customer_state", args: { ops: [
      { op: "SET", field: fields[0], value: 74, sourceQuote: "eo 74, mông 96" },
      { op: "SET", field: fields[1], value: 96, sourceQuote: "eo 74, mông 96" },
    ] } });
    expect(result).toEqual({ status: "REJECTED", reason: "MEASUREMENT_SOURCE_INVALID", data: {
      applied: false, unresolvedFields: fields, fieldErrors: fields.map(field => ({ field, reason: "QUOTE_MUST_CONTAIN_ONE_VALUE" })),
    } });
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    expect(s.getStored().profile.revision).toBe(1);
    expect(s.tools.snapshot().effectReceipts).toEqual([]);
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBe(true);
    const corrected = await s.tools.invoke({ name: "apply_customer_state", args: { ops: [
      { op: "SET", field: fields[0], value: 74, sourceQuote: "eo 74" },
      { op: "SET", field: fields[1], value: 96, sourceQuote: "mông 96" },
    ] } });
    expect(corrected.status).toBe("OK");
    expect(s.getStored().profile.measurements.map(({ kind, value }) => ({ kind, value }))).toEqual([
      { kind: "WAIST_CM", value: 74 }, { kind: "HIPS_CM", value: 96 },
    ]);
    expect(s.store.compareAndSwap).toHaveBeenCalledTimes(1);
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBeUndefined();
  });
  it.each([
    ["Eo 83.", "85", 85, "QUOTE_NOT_IN_CURRENT_MESSAGE"],
    ["Eo 85. Eo 85.", "Eo 85", 85, "QUOTE_NOT_UNIQUE"],
    ["Eo 84.", "84", 85, "VALUE_DOES_NOT_MATCH_QUOTE"],
    ["Eo 85kg.", "85", 85, "UNIT_DOES_NOT_MATCH_FIELD"],
    ["Eo 185.", "85", 85, "QUOTE_MUST_CONTAIN_COMPLETE_NUMBER"],
  ])("returns a bounded field reason for invalid numeric evidence: %s", async (text, quote, value, reason) => {
    const s = await setup(text as string);
    expect(await s.tools.invoke({ name: "apply_customer_state", args: { ops: [
      { op: "REPLACE", field: "preferences.colors", value: ["navy"] },
      { op: "SET", field: "measurements.WAIST_CM", value, sourceQuote: quote },
    ] } })).toEqual({ status: "REJECTED", reason: "MEASUREMENT_SOURCE_INVALID", data: {
      applied: false, unresolvedFields: ["preferences.colors", "measurements.WAIST_CM"],
      fieldErrors: [{ field: "measurements.WAIST_CM", reason }],
    } });
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    expect(s.getStored().profile.preferences.colors).toEqual([]);
  });
  it.each(["1m65", "1,65m"])("keeps existing height conversion for %s", async height => {
    const s = await setup(`Chị cao ${height}.`);
    expect((await s.tools.invoke({ name: "apply_customer_state", args: { ops: [
      { op: "SET", field: "measurements.HEIGHT_CM", value: 165, sourceQuote: height },
    ] } })).status).toBe("OK");
    expect(s.getStored().profile.measurements).toContainEqual(expect.objectContaining({ kind: "HEIGHT_CM", value: 165 }));
  });
  it("lets the owner fix numeric arguments within the existing two rounds before size and final verification", async () => {
    const s = await setup("Chị sửa lại: eo 74, mông 96.");
    const outputs: OwnerGeneration[] = ["eo 74, mông 96", null].map<OwnerGeneration>(quote => {
      const calls = [{ name: "apply_customer_state", args: { ops: [
        { op: "SET", field: "measurements.WAIST_CM", value: 74, sourceQuote: quote ?? "eo 74" },
        { op: "SET", field: "measurements.HIPS_CM", value: 96, sourceQuote: quote ?? "mông 96" },
      ] } }, { name: "recommend_size", args: { subjectRef: "QU714" } }];
      return { kind: "TOOLS", calls, content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } };
    });
    outputs.push({ kind: "FINAL", text: "Mình lấy M nhé chị." });
    const verifier = vi.fn(async () => ({ result: { verdict: "PASS", violations: [] } }));
    let owners = 0;
    const result = await runCommerceTurn({ scope: commerceScope(), tools: s.tools, clock: () => commerceNow,
      latest: "Chị sửa lại: eo 74, mông 96.", history: [], ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm reply.",
      owner: async request => {
        if (owners === 1) {
          expect(JSON.stringify(request.contents)).toContain("QUOTE_MUST_CONTAIN_ONE_VALUE");
          expect(s.sizeInput).not.toHaveBeenCalled();
        }
        if (owners === 2) expect(s.sizeInput).toHaveBeenCalledTimes(1);
        owners++;
        return outputs.shift()!;
      }, verifier });
    expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
    expect(result.toolRounds).toBe(2); expect(result.toolCalls).toBe(4); expect(owners).toBe(3);
    expect(verifier).toHaveBeenCalledTimes(1);
    expect(s.sizeInput).toHaveBeenCalledTimes(2); // The final gate re-reads the chart after verification.
    expect(s.store.compareAndSwap).toHaveBeenCalledTimes(1);
    expect(s.getStored().profile.measurements).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "WAIST_CM", value: 74 }), expect.objectContaining({ kind: "HIPS_CM", value: 96 }),
    ]));
  });
  it("provides a receipt only after profile CAS and committed readback, and invalidates it on another profile revision", async () => {
    const s = await setup();
    await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 74, sourceQuote: "74" }] } });
    const world = s.tools.snapshot();
    expect(world.effectReceipts).toEqual(expect.arrayContaining([expect.objectContaining({ effect: "CUSTOMER_STATE_UPDATED", status: "SUCCESS", subjectRef: s.getStored().profile.profileId })]));
    expect(hardPrecheck(world, "Em đã cập nhật số đo cho chị.", commerceNow)).toBeNull();
    const changed = structuredClone(s.getStored()); changed.profile.revision++; s.setStored(changed);
    expect((await s.tools.readback()).effectReceipts).toEqual([]);
  });
  it("does not issue a profile receipt when CAS claims success but readback does not contain that committed state", async () => {
    const s = await setup(); s.store.compareAndSwap = vi.fn(async () => true);
    expect((await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 74, sourceQuote: "74" }] } })).status).toBe("REJECTED");
    expect(s.tools.snapshot().effectReceipts).toEqual([]);
  });
  it("resolves a correction before size even when the model lists size first in the batch", async () => {
    const s = await setup();
    const results = await s.tools.invokeBatch([
      { name: "recommend_size", args: { subjectRef: "QU714" } },
      { name: "apply_customer_state", args: { ops: [
        { op: "SET", field: "measurements.WAIST_CM", value: 85, sourceQuote: "85" }, { op: "SET", field: "measurements.HIPS_CM", value: 105, sourceQuote: "105" },
      ] } },
    ]);
    expect(results[0]!.data).toMatchObject({ status: "RECOMMENDED", recommendedSizes: expect.arrayContaining([expect.objectContaining({ size: "L" })]) });
    expect(s.getStored().profile.revision).toBe(2);
    expect(s.getStored().profile.measurements.find(m => m.kind === "WAIST_CM")!.value).toBe(85);
    expect(s.tools.snapshot().protectedClaims).toEqual(expect.arrayContaining([expect.objectContaining({ type: "SIZE_FIT" })]));
    expect(hardPrecheck(s.tools.snapshot(), "Mình lấy L nhé chị.", commerceNow)).toBeNull();
  });
  it("CLEAR removes a measurement; the engine asks for missing input without a partial size claim", async () => {
    const s = await setup();
    await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "CLEAR", field: "measurements.HIPS_CM" }] } });
    const result = await s.tools.invoke({ name: "recommend_size", args: { subjectRef: "QU714" } });
    expect(result.data).toMatchObject({ status: "NEEDS_MEASUREMENTS", missingInputs: ["HIPS_CM"], recommendedSizes: [] });
    expect(s.tools.snapshot().protectedClaims).toEqual([]);
    expect(s.getStored().fieldEvidence["measurements.HIPS_CM"]!.sourceEventHash).toBeTruthy();
  });
  it("does not run size on old values if state CAS conflicts", async () => {
    const s = await setup();
    s.store.compareAndSwap = vi.fn(async () => false);
    const result = await s.tools.invokeBatch([{ name: "apply_customer_state", args: { ops: [{ op: "SET", field: "measurements.WAIST_CM", value: 85, sourceQuote: "85" }] } },
      { name: "recommend_size", args: { subjectRef: "QU714" } }]);
    expect(result[1]!.status).toBe("REJECTED");
    expect(s.sizeInput).not.toHaveBeenCalled();
  });
  it("validates the full operation batch atomically and rejects protected fields", async () => {
    const s = await setup();
    for (const field of ["profileId", "cart", "price", "permission", "recipient", "effectReceipts"]) {
      const r = await s.tools.invoke({ name: "apply_customer_state", args: { ops: [
        { op: "SET", field: "measurements.WAIST_CM", value: 85, sourceQuote: "85" }, { op: "SET", field, value: "injected" },
      ] } });
      expect(r.status).toBe("REJECTED");
    }
    expect(s.getStored().profile.revision).toBe(1);
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it("source-message provenance and revisions are supplied by code", async () => {
    const invalid = await setup();
    expect((await invalid.tools.invoke({ name: "apply_customer_state", args: { expectedRevision: 100, ops: [] } })).status).toBe("REJECTED");
    expect(invalid.tools.snapshot().state.customerStateUpdatePending).toBe(true);
    // Unknown-shape recovery stays blocked for that request. Test the valid
    // provenance contract on a separate request, rather than resetting its ledger.
    const s = await setup();
    await s.tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "REPLACE", field: "preferences.colors", value: ["navy"] }] } });
    expect(s.getStored().profile.preferences.colors).toEqual(["navy"]);
    expect(s.getStored().fieldEvidence["preferences.colors"]!.source).toBe("CUSTOMER_MESSAGE");
  });
  it("re-reads persisted profile before final eligibility and invalidates a past size result", async () => {
    const s = await setup(); await s.tools.invoke({ name: "recommend_size", args: { subjectRef: "QU714" } });
    const before = makeBinding("turn", "M vừa chị.", s.tools.snapshot());
    const changed = structuredClone(s.getStored()); changed.profile.revision++; changed.profile.measurements[0]!.value = 85; s.setStored(changed);
    const current = await s.tools.readback();
    expect(makeBinding("turn", "M vừa chị.", current).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
    expect(current.protectedClaims).toEqual([]);
  });
  it("invalidates a size result when the verified chart changes before the gate", async () => {
    const s = await setup();
    await s.tools.invoke({ name: "recommend_size", args: { subjectRef: "QU714" } });
    const before = makeBinding("turn", "M vừa chị.", s.tools.snapshot());
    s.sizeInput.mockImplementation(async () => { const changed = fixtureSizeInput(); changed.charts[0]!.chart.reference.version = "2"; return changed; });
    const current = await s.tools.readback();
    expect(makeBinding("turn", "M vừa chị.", current).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
    expect(current.protectedClaims).toEqual([]);
  });
  it("CLEAR of an absent measurement leaves a provenance tombstone against late old updates", async () => {
    const s = await setup();
    const empty = structuredClone(s.getStored()); empty.profile.measurements = [];
    s.setStored(empty);
    // A new turn reads this accepted state before accepting the clear.
    const f = fixtureProduct("QU714"), scope = commerceScope();
    const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(), initialProducts: [f.product],
      catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
    const tools = await createCustomerStateTools({ base, scope, store: s.store, clock: () => commerceNow, sizeInput: s.sizeInput });
    await tools.invoke({ name: "apply_customer_state", args: { ops: [{ op: "CLEAR", field: "measurements.HIPS_CM" }] } });
    expect(s.getStored().fieldEvidence["measurements.HIPS_CM"]!.observedAt).toBe(commerceNow.toISOString());
    expect(s.getStored().profile.measurements).toEqual([]);
    expect(s.getStored().profile.revision).toBe(2);
  });
  it("quotes through existing policy arithmetic and invalidates an equal total with changed price provenance", async () => {
    const s = await setup(), policy = (await fixturePolicy()).bundle!.policy;
    const source = { policy, lines: canonicalCartPolicyLinesV2([fixtureCartLine()], commerceScope().shopId)!,
      closingEvidence: { previousState: null, purchaseReady: true, priceObjectionCount: 0, secondConcessionAlreadyApplied: false }, now: commerceNow };
    const tools = await createCustomerStateTools({ base: s.tools, scope: commerceScope(), store: s.store,
      clock: () => commerceNow, sizeInput: s.sizeInput, quoteInput: async () => source });
    const result = await tools.invoke({ name: "quote_cart", args: {} });
    expect(result).toMatchObject({ status: "OK", data: { subtotalVnd: 499000, shippingFeeVnd: 25000, grandTotalVnd: 524000 } });
    const old = makeBinding("turn", "Tổng 524k chị nhé.", tools.snapshot());
    source.lines = source.lines.map(line => ({ ...line, priceEvidence: { ...line.priceEvidence, sourceVersion: "pos-v2" } }));
    expect(makeBinding("turn", "Tổng 524k chị nhé.", await tools.readback()).trustedSnapshotId).not.toBe(old.trustedSnapshotId);
  });
  it("reuses the current profile database CAS and verifies its scoped readback", async () => {
    const scope = commerceScope(), value = fixtureProfile();
    const row = { ...value, revision: value.profile.revision, pageId: scope.pageId, customerHash: scope.customerHash, expiresAt: new Date(commerceNow.getTime()+1000) };
    const db = { loadOrCreateCustomerProfile: vi.fn(async () => row), compareAndSwapCustomerProfile: vi.fn(async () => true) };
    const port = createRealtimeCustomerStatePort(db as Parameters<typeof createRealtimeCustomerStatePort>[0], scope, fixtureProfile, () => commerceNow);
    expect(await port.read()).toEqual(value);
    await port.compareAndSwap(1, value);
    expect(db.compareAndSwapCustomerProfile).toHaveBeenCalledWith(scope.pageId, scope.customerHash, 1,
      { ...value, revision: 1 }, commerceNow);
    row.pageId = "another-page";
    await expect(port.read()).rejects.toThrow("PROFILE_SCOPE");
  });
  it("carries accepted state through two turns and applies the later correction without resetting profile", async () => {
    const s = await setup(); const history: { role: "customer" | "shop"; text: string }[] = [];
    for (const [index, waist, hips, size] of [[0, 85, 105, "L"], [1, 75, 95, "M"]] as const) {
      const scope = { ...commerceScope(), requestId: `turn-${index}`, sourceMessageId: `message-${index}`,
        sourceObservedAt: new Date(commerceNow.getTime()+index*1000).toISOString(), revision: index+1 };
      const clock = () => new Date(commerceNow.getTime()+index*1000);
      const f = fixtureProduct("QU714");
      const base = createReadOnlyTools({ scope, clock, policy: () => fixturePolicy(), initialProducts: [f.product],
        catalog: { readProduct: async () => f, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
      const tools = await createCustomerStateTools({ base, scope, store: s.store, clock, sizeInput: s.sizeInput, sourceMessages: [{ text: `Eo ${waist}, mông ${hips}.`, sourceMessageId: scope.sourceMessageId, observedAt: scope.sourceObservedAt! }] });
      expect(tools.snapshot().state.customerProfileRevision).toBe(index+1);
      if (index) expect(tools.snapshot().state.customerMeasurements).toEqual(expect.arrayContaining([{ kind: "WAIST_CM", value: 85 }]));
      const calls = [{ name: "apply_customer_state", args: { ops: [
        { op: "SET", field: "measurements.WAIST_CM", value: waist, sourceQuote: String(waist) }, { op: "SET", field: "measurements.HIPS_CM", value: hips, sourceQuote: String(hips) }] } },
        { name: "recommend_size", args: { subjectRef: "QU714" } }];
      const latest = index ? "Chị nhầm, eo 75 mông 95 nha." : "Eo chị 85, mông 105, chọn quần này size nào em?";
      let n = 0;
      const result = await runCommerceTurn({ scope, tools, clock, latest, history, ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm reply.",
        owner: async (): Promise<OwnerGeneration> => n++ === 0 ? { kind: "TOOLS", calls,
          content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } } : { kind: "FINAL", text: `Mình lấy ${size} nhé chị.` },
        verifier: async () => ({ result: { verdict: "PASS", violations: [] } }) });
      expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
      expect(s.getStored().profile.revision).toBe(index+2);
      expect(s.getStored().profile.measurements.find(m => m.kind === "WAIST_CM")!.value).toBe(waist);
      history.push({ role: "customer", text: latest }, { role: "shop", text: result.terminal.text! });
    }
  });
});

 it("terminates no-chart after the last tool round without generating a fit draft",async()=>{
 const s=await setup();s.sizeInput.mockResolvedValue({...fixtureSizeInput(),charts:[]});let calls=0;
 const r=await runCommerceTurn({scope:commerceScope(),tools:s.tools,latest:"Tư vấn size chị nhé",history:[],clock:()=>commerceNow,
 ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",owner:async()=>{calls++;const c={name:calls===1?"read_product":"recommend_size",args:{subjectRef:"QU714"}};return {kind:"TOOLS",calls:[c],content:{role:"model",parts:[{functionCall:c}]}};},verifier:async()=>{throw Error("NO_DRAFT_EXPECTED");}});
 expect(calls).toBe(2);expect(r.verifierGenerations).toBe(0);expect(r.terminal).toMatchObject({disposition:"NO_SEND",text:null,fallbackId:null});expect(r.recovery?.originalReason).toBe("SIZE_RULE_UNAVAILABLE");
 });

it("co-locates received fit preference and only the alternatives authorized by the current size claim",async()=>{
 const s=await setup("Eo 74, mông 96. Chị thích rộng.");
 const r=await s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",customerStateOps:[
 {op:"SET",field:"measurements.WAIST_CM",value:74,sourceQuote:"74"},
 {op:"SET",field:"measurements.HIPS_CM",value:96,sourceQuote:"96"},
 {op:"SET",field:"fitPreference",value:"RELAXED",sourceQuote:"thích rộng"}]}});
 const claim=(s.tools.snapshot().protectedClaims as {type:string;value:{alternativeSizes:string[];measurementFingerprint:string;customerProfileRevision:number}}[]).find(c=>c.type==="SIZE_FIT");
 expect(claim).toBeDefined();expect(r).toMatchObject({status:"OK",data:{inputFitPreference:"RELAXED",alternativeSizes:claim!.value.alternativeSizes}});
 expect(r).toMatchObject({data:{profileRevision:claim!.value.customerProfileRevision,measurementFingerprint:claim!.value.measurementFingerprint}});
 const missing=await setup();const empty=missing.getStored();empty.profile.measurements=[];missing.setStored(empty);await missing.tools.readback();const result=await missing.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714"}});
 expect(result).toMatchObject({data:{alternativeSizes:null}});
});
