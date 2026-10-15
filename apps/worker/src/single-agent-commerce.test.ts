import { describe, expect, it } from "vitest";
import { applySalesCycleCommand, createSalesCycleRuntimeState, executePersistedSalesCycleCommand,
  type SalesCycleStateRepositoryV1 } from "@lana/chat-runtime";
import { createCommerceTools } from "./single-agent-commerce.js";
import { runCommerceTurn, type OwnerGeneration } from "./single-agent-commerce-read-only.js";
import { commerceNow, commerceScope, fixtureCartLine, fixturePolicy, fixtureProduct, fixtureProfile, fixtureSizeInput } from "./single-agent-commerce.test-support.js";

const native = (calls: {name:string;args:unknown}[]): OwnerGeneration => ({ kind: "TOOLS", calls,
  content: { role: "model", parts: calls.map(c => ({ functionCall: c })) } });
describe("Phase B capability composition", () => {
  it("keeps B1 read-only and never advertises unavailable state/effect/handoff capabilities", async () => {
    const f = fixtureProduct(), scope = commerceScope();
    const tools = await createCommerceTools({ read: { scope, clock: () => commerceNow, initialProducts: [f.product],
      policy: () => fixturePolicy(), catalog: { readProduct: async () => f, searchText: async () => ({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"}) } } });
    expect(tools.availableTools).toEqual(["search_products", "read_product", "read_policy"]);
    expect((await tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).status).toBe("REJECTED");
    expect((await tools.invoke({ name: "add_to_cart", args: { subjectRef: "SM613" } })).status).toBe("REJECTED");
  });
  it("retains accepted state across instances and uses corrections before dependent size and cart operations", async () => {
    const scope = commerceScope(), f = fixtureProduct("QU714"), policy = (await fixturePolicy()).bundle!;
    let profile = fixtureProfile();
    let cycle = createSalesCycleRuntimeState(scope.conversationId, {pageId:scope.pageId,conversationId:scope.conversationId}, commerceNow);
    // Existing accepted earlier stages are a domain precondition, not manufactured by a tool.
    for (const kind of ["FACTS_PRESENTED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"] as const) {
      cycle = applySalesCycleCommand({ state:cycle,expectedRevision:cycle.revision,command:{kind,commandId:kind},now:commerceNow }).state;
    }
    const store = { read: async () => structuredClone(profile), compareAndSwap: async (revision: number, next: typeof profile) => {
      if (revision !== profile.profile.revision) return false; profile = structuredClone(next);return true;
    } };
    const repository: SalesCycleStateRepositoryV1 = { read:async()=>structuredClone(cycle),compareAndSwap:async update=>{
      if(update.expectedRevision!==cycle.revision)return false;cycle=structuredClone(update.nextState);return true;
    } };
    const compose = () => createCommerceTools({ read: {scope,clock:()=>commerceNow,initialProducts:[f.product],policy:()=>fixturePolicy(),
      catalog:{readProduct:async()=>f,searchText:async()=>({status:"NOT_FOUND",reasonCode:"NO_CANDIDATES"})}},
      state:{store,sizeInput:async()=>fixtureSizeInput()},
      effects:{conversationKey:scope.conversationId,repository,policy:async()=>policy,
        authorize:async()=>profile.profile.measurements.some(m=>m.kind==="WAIST_CM"&&m.value===85),
        identity:{cartId:"50000000-0000-4000-8000-000000000001",salesEpisodeId:"60000000-0000-4000-8000-000000000001",customerProfileId:profile.profile.profileId},
        select:async query=>{const line=fixtureCartLine();line.parentProductId="QU714";line.priceAuthority!.parentProductId="QU714";
          return {status:"READY",shopId:scope.shopId,line:{...line,lineId:query.lineId},versions:{price:"p1",inventory:"i1",size:"s1",eta:null},
            eta:null,etaExpiresAt:null,sourceAuthority:"POS_SNAPSHOT",stockStatus:"IN_STOCK",stockAvailableQuantity:4,
            sourceObservedAt:commerceNow.toISOString(),sourceExpiresAt:new Date(commerceNow.getTime()+1200000).toISOString()};},
        readAuthority:async()=>({...scope,revision:scope.revision}),readReceipt:async()=>null,
        executeCommand:({command,trustedPorts})=>executePersistedSalesCycleCommand({repository,conversationKey:scope.conversationId,
          command,now:commerceNow,trustedPorts})}
    });
    const tools=await compose(), outputs=[native([
      {name:"add_to_cart",args:{subjectRef:"QU714",size:"M",color:"navy"}},
      {name:"recommend_size",args:{subjectRef:"QU714"}},
      {name:"apply_customer_state",args:{ops:[{op:"SET",field:"measurements.WAIST_CM",value:85},{op:"SET",field:"measurements.HIPS_CM",value:105}]}}
    ]), {kind:"FINAL" as const,text:"Shop đã thêm sản phẩm vào giỏ cho chị."}];
    const result=await runCommerceTurn({scope,tools,clock:()=>commerceNow,latest:"Eo 85, mông 105. Lấy màu navy M cho chị.",history:[],ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",
      owner:async request=>{expect(request.availableTools).toContain("add_to_cart");return outputs.shift()!;},
      verifier:async request=>{
        expect(request.trusted.effectReceipts).toEqual(expect.arrayContaining([expect.objectContaining({ effect:"CUSTOMER_STATE_UPDATED",subjectRef:profile.profile.profileId,stateRevision:request.trusted.state.revision })]));
        return {result:{verdict:"PASS",violations:[]}}; }});
    expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");expect(result.sendEnabled).toBe(false);
    expect(cycle.cart).not.toBeNull();expect(profile.profile.revision).toBe(2);
    const second=await compose();
    expect(second.snapshot().state.customerMeasurements).toContainEqual({kind:"WAIST_CM",value:85});
    const size=await second.invoke({name:"recommend_size",args:{subjectRef:"QU714"}});
    expect(size).toMatchObject({status:"OK",data:{recommendedSizes:[{size:"L"}]}});
    expect(JSON.stringify(second.snapshot())).not.toMatch(/fullName|phone|checkoutDraft|accountNumber/);
  });
});
