import { describe, expect, it, vi } from "vitest";
import type { CustomerProfileMergeState } from "@lana/business-tools";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { createCustomerStateTools } from "./single-agent-commerce-state.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { hardPrecheck } from "./single-agent-semantic-verifier-boundary.js";
import { runCommerceTurn, type OwnerGeneration } from "./single-agent-commerce-read-only.js";
import { commerceScope, commerceNow, fixtureProfile, fixtureProduct, fixturePolicy, fixtureSizeInput } from "./single-agent-commerce.test-support.js";

const set = (field: string, value: number, sourceQuote?: string) => ({ op: "SET", field: "measurements." + field, value, ...(sourceQuote ? { sourceQuote } : {}) });
async function setup(text = "Eo 74, mông 96.", initial?: CustomerProfileMergeState, extra: { text: string; sourceMessageId: string; observedAt: string }[] = []) {
  const scope = commerceScope(), product = fixtureProduct("QU714");
  let stored: CustomerProfileMergeState = structuredClone(initial ?? fixtureProfile());
  const store = { read: async () => structuredClone(stored), compareAndSwap: vi.fn(async (revision: number, next: CustomerProfileMergeState) => {
    if (revision !== stored.profile.revision) return false; stored = structuredClone(next); return true;
  }) };
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: fixturePolicy, initialProducts: [product.product],
    catalog: { readProduct: async () => product, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  const sourceMessages = [...extra, { text, sourceMessageId: scope.sourceMessageId, observedAt: scope.sourceObservedAt! }];
  const tools = await createCustomerStateTools({ base, scope, store, clock: () => commerceNow, sizeInput: async () => fixtureSizeInput(), sourceMessages });
  const apply = (ops: unknown[]) => tools.invoke({ name: "apply_customer_state", args: { ops } });
  return { tools, scope, store, apply, stored: () => structuredClone(stored), sourceMessages };
}
describe("grounded numeric customer state", () => {
  it.each([
    ["Eo 74, mông 96.", set("HIPS_CM", 76)],
    ["Eo 74, mông 96.", set("HIPS_CM", 76, "mông 96")],
    ["Eo 74, mông 96.", set("HIPS_CM", 76, "mông 76")],
    ["Cao 176cm.", set("WAIST_CM", 76, "76")],
    ["Cao 11m60.", set("HEIGHT_CM", 160, "1m60")],
    ["Cao 1m600.", set("HEIGHT_CM", 160, "1m60")],
    ["Mông cũ 98, mới 96.", set("HIPS_CM", 96, "Mông cũ 98, mới 96")],
  ])("rejects ungrounded scalar before any write: %s", async (text, op) => {
    const s = await setup(text), before = s.stored();
    expect((await s.apply([op])).status).toBe("REJECTED");
    expect(s.stored()).toEqual(before); expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it("rejects the entire batch, then requires every unresolved field to be corrected", async () => {
    const s = await setup();
    expect((await s.apply([set("WAIST_CM", 74, "Eo 74"), set("HIPS_CM", 76, "mông 96")])).status).toBe("REJECTED");
    expect(s.stored().profile.revision).toBe(1);
    expect((await s.apply([set("HIPS_CM", 96, "mông 96")])).status).toBe("REJECTED");
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    expect(hardPrecheck(s.tools.snapshot(), "Em đã cập nhật số đo.", commerceNow)).toBe("STATE_UPDATE_INCOMPLETE");
    await s.apply([set("WAIST_CM", 74, "Eo 74"), set("HIPS_CM", 96, "mông 96")]);
    expect(hardPrecheck(s.tools.snapshot(), "Em đã cập nhật số đo.", commerceNow)).toBeNull();
  });
  it("uses the actual message containing the quote rather than the last message timestamp", async () => {
    const first = { text: "Mông 96.", sourceMessageId: "earlier-in-batch", observedAt: new Date(commerceNow.getTime() - 1000).toISOString() };
    const s = await setup("Chị vẫn lấy L.", undefined, [first]);
    expect((await s.apply([set("HIPS_CM", 96, "Mông 96")])).status).toBe("OK");
    expect(s.stored().fieldEvidence["measurements.HIPS_CM"]).toMatchObject({ observedAt: first.observedAt,
      sourceEventHash: commerceHash({ pageId: s.scope.pageId, conversationId: s.scope.conversationId, sourceMessageId: first.sourceMessageId }) });
  });
  it("rejects a quote occurring in two different messages", async () => {
    const s = await setup("Mông 96.", undefined, [{ text: "Mông 96.", sourceMessageId: "other", observedAt: commerceNow.toISOString() }]);
    expect((await s.apply([set("HIPS_CM", 96, "Mông 96")])).status).toBe("REJECTED");
    expect(s.stored().profile.revision).toBe(1);
  });
  it("does not discard a repeated quote in one message when checking global ambiguity", async () => {
    const s = await setup("Mông 96.", undefined, [{ text: "Mông 96. Mông 96.", sourceMessageId: "other", observedAt: commerceNow.toISOString() }]);
    expect((await s.apply([set("HIPS_CM", 96, "Mông 96")])).status).toBe("REJECTED");
  });
  it("keeps a pending hips correction after an unrelated valid waist replay", async () => {
    const s = await setup();
    await s.apply([set("WAIST_CM", 74, "Eo 74")]);
    await s.apply([set("HIPS_CM", 76, "mông 96")]);
    await s.apply([set("WAIST_CM", 74, "Eo 74")]);
    expect(hardPrecheck(s.tools.snapshot(), "Em đã cập nhật.", commerceNow)).toBe("STATE_UPDATE_INCOMPLETE");
  });
  it("preserves source authority when a same-time human-confirmed field exists", async () => {
    const initial = fixtureProfile(), scope = commerceScope();
    const evidence = { source: "HUMAN_CONFIRMED" as const, observedAt: scope.sourceObservedAt!, confidence: 1,
      sourceEventHash: commerceHash({ pageId: scope.pageId, conversationId: scope.conversationId, sourceMessageId: scope.sourceMessageId }) };
    initial.profile.measurements = initial.profile.measurements.map(m => ({ ...m, provenance: evidence }));
    initial.fieldEvidence = Object.fromEntries(initial.profile.measurements.map(m => ["measurements." + m.kind, evidence]));
    const s = await setup(undefined, initial);
    expect((await s.apply([set("HIPS_CM", 96, "mông 96")])).status).toBe("REJECTED");
    expect(s.stored()).toEqual(initial);
  });
  it.each([["Mông 96,5cm.", "HIPS_CM", 96.5], ["Cao 1,60m.", "HEIGHT_CM", 160], ["Cao 1m60.", "HEIGHT_CM", 160]])(
    "accepts an explicit supported scalar/unit: %s", async (text, field, value) => {
      const s = await setup(text);
      expect((await s.apply([set(field, value, text)])).status).toBe("OK");
      expect(s.stored().profile.measurements.find(m => m.kind === field)?.value).toBe(value);
    });
  it("corrects legacy accepted data with the same current message, without changing shared evidence ordering", async () => {
    const initial = fixtureProfile(), scope = commerceScope();
    const evidence = { source: "CUSTOMER_MESSAGE" as const, observedAt: scope.sourceObservedAt!, confidence: 1,
      sourceEventHash: commerceHash({ pageId: scope.pageId, conversationId: scope.conversationId, sourceMessageId: scope.sourceMessageId }) };
    initial.profile.measurements = initial.profile.measurements.map(m => ({ ...m, value: m.kind === "WAIST_CM" ? 74 : 76, provenance: evidence }));
    initial.fieldEvidence = Object.fromEntries(initial.profile.measurements.map(m => ["measurements." + m.kind, evidence]));
    const s = await setup(undefined, initial);
    expect((await s.apply([set("HIPS_CM", 96, "mông 96")])).status).toBe("OK");
    expect(s.stored().profile.measurements.find(m => m.kind === "HIPS_CM")?.value).toBe(96);
  });
  it("does not mint a new revision or effect for a same-source replay", async () => {
    const s = await setup(), op = set("HIPS_CM", 96, "mông 96");
    await s.apply([op]); const before = s.stored(), receipts = s.tools.snapshot().effectReceipts;
    expect((await s.apply([op])).status).toBe("OK");
    expect(s.stored()).toEqual(before); expect(s.store.compareAndSwap).toHaveBeenCalledTimes(1);
    expect(s.tools.snapshot().effectReceipts).toEqual(receipts);
  });
  it.each([false, true])("keeps the existing correction round and accepts FINAL only after complete correction (%s)", async complete => {
    const s = await setup(); let n = 0; const verifier = vi.fn(async () => ({ result: { verdict: "PASS", violations: [] } }));
    const owner = async (): Promise<OwnerGeneration> => {
      const ops = n++ === 0 ? [set("WAIST_CM", 74, "Eo 74"), set("HIPS_CM", 76, "mông 96")] : n === 2 ?
        [set("HIPS_CM", 96, "mông 96"), ...(complete ? [set("WAIST_CM", 74, "Eo 74")] : [])] : null;
      return ops ? { kind: "TOOLS", calls: [{ name: "apply_customer_state", args: { ops } }], content: { role: "model", parts: [] } }
        : { kind: "FINAL", text: "Em đã cập nhật đầy đủ số đo." };
    };
    const result = await runCommerceTurn({ scope: s.scope, tools: s.tools, clock: () => commerceNow, latest: "Eo 74, mông 96.",
      history: [], ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm nghĩa.", owner, verifier });
    expect(result.ownerGenerations).toBe(3);
    expect(result.terminal.disposition).toBe(complete ? "SEND_ELIGIBLE" : "NO_SEND");
    expect(verifier).toHaveBeenCalledTimes(complete ? 1 : 0);
  });
});

// Same-request recovery; source coverage is supplied by the verified ingress port,
// never by an owner tool argument. These fixtures contain synthetic customer data.
describe("j2 request/profile recovery ledger", () => {
  const latest = "51kg, ngực 88, eo 70, mông 94.";
  const correct = [set("WEIGHT_KG", 51, "51kg"), set("BUST_CM", 88, "ngực 88"), set("WAIST_CM", 70, "eo 70"), set("HIPS_CM", 94, "mông 94")];
  const oldHeight = set("HEIGHT_CM", 162, "cao 1m62");
  async function recovery(coverage = true, retainAdvice = false) {
    const scope = commerceScope(), old = fixtureProfile();
    old.profile.measurements.push({kind:"HEIGHT_CM",value:162,provenance:structuredClone(old.profile.measurements[0]!.provenance)});
    const s = await setup(latest, old);
    const sources = s.sourceMessages;
    const args = {base: createReadOnlyTools({scope,clock:()=>commerceNow,policy:fixturePolicy,
      initialProducts:[fixtureProduct("QU714").product,fixtureProduct("SM613").product],
      catalog:{readProduct:async id=>fixtureProduct(id),searchText:async()=>({status:"NOT_FOUND" as const,reasonCode:"NO_CANDIDATES"})}}),
      scope,store:s.store,clock:()=>commerceNow,sizeInput:async(id:string)=>fixtureSizeInput(id),sourceMessages:sources,retainAdvice,
      componentSizeInput:async(r:{parentProductId:string;componentRole:string})=>{
        const v=fixtureSizeInput(r.parentProductId),role=r.componentRole as "TOP"|"PANTS";
        return {...v,target:{...v.target,componentRole:role,componentProductId:`PART-${role}`},
          charts:v.charts.map(c=>({chart:{...c.chart,componentRole:role},scope:{...c.scope,componentRole:role}})),
          fitTarget:{kind:"COMPONENT" as const,parentProductId:r.parentProductId,componentProductId:`PART-${role}`,componentRole:role},
          sourceBindingHash:"c".repeat(64),sourceExpiresAt:new Date(commerceNow.getTime()+60000).toISOString()};},
      ...(coverage?{verifiedCurrentSourceHash:commerceHash({pageId:scope.pageId,conversationId:scope.conversationId,
        customerHash:scope.customerHash,requestId:scope.requestId,sourceMessages:sources})}:{})};
    const tools=await createCustomerStateTools(args);
    const apply=(ops:unknown[])=>tools.invoke({name:"apply_customer_state",args:{ops}});
    const fit=(ops?:unknown[],subjectRef="QU714")=>tools.invoke({name:"recommend_size",args:{subjectRef,...(ops?{customerStateOps:ops}:{})}});
    return {...s,tools,apply,fit};
  }
  it("rejects old HEIGHT then accepts complete current correction, without rewriting old provenance",async()=>{
    const s=await recovery(), before=s.stored().profile.measurements.find(m=>m.kind==="HEIGHT_CM");
    expect((await s.fit([oldHeight,...correct])).status).toBe("REJECTED");
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
    expect(await s.fit(correct)).toMatchObject({status:"OK",data:{status:"RECOMMENDED"}});
    expect(s.stored().profile.measurements.find(m=>m.kind==="HEIGHT_CM")).toEqual(before);
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBeUndefined();
    expect(s.tools.snapshot().protectedClaims.some(c=>(c as {type:string}).type==="SIZE_FIT")).toBe(true);
  });
  it("rejects partial current-invalid recovery before CAS; full corrected patch resolves",async()=>{
    const s=await recovery(),before=s.stored();
    await s.apply([correct[0],set("BUST_CM",86,"ngực 88")]);
    expect((await s.apply([correct[0]])).status).toBe("REJECTED");
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();expect(s.stored()).toEqual(before);
    expect((await s.fit()).status).toBe("REJECTED");
    expect((await s.apply(correct.slice(0,2))).status).toBe("OK");
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBeUndefined();
  });
  it.each(["unit","domain","unknown","no-coverage","changed-quote","current-equality"])("does not mistake %s for rejected old reuse",async mode=>{
    const s=await recovery(mode!=="no-coverage");
    const op=mode==="unit"?set("BUST_CM",51,"51kg"):
      mode==="domain"?set("HEIGHT_CM",51,"51kg"):
      mode==="unknown"?set("WRONG",162,"cao 1m62"):
      mode==="changed-quote"?set("HEIGHT_CM",162,"cao 1m70"):
      mode==="current-equality"?set("WAIST_CM",74,"eo 70"):oldHeight;
    await s.apply([op,...correct.filter(c=>c.field!==op.field)]);
    await s.apply(correct.filter(c=>c.field!==op.field));
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBe(true);
    expect((await s.fit()).status).toBe("REJECTED");
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
  it.each(["inline-standalone","standalone-inline","different-target","identical-batch"])("shares one profile ledger across %s",async path=>{
    const s=await recovery();
    const bad=[oldHeight,...correct];
    if(path==="standalone-inline")await s.apply(bad);else await s.fit(bad);
    expect((await s.fit(undefined,"SM613")).status).toBe("REJECTED");
    const result=path==="inline-standalone"?await s.apply(correct):path==="identical-batch"?
      (await s.tools.invokeBatch!(["QU714","SM613"].map(subjectRef=>({name:"recommend_size",args:{subjectRef,customerStateOps:correct}}))))[0]:
      await s.fit(correct,path==="different-target"?"SM613":"QU714");
    expect(result?.status).toBe("OK");expect(s.store.compareAndSwap).toHaveBeenCalledTimes(1);
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBeUndefined();
  });
  it("recovers retained COMPONENT/TOP advice and keeps a numerical-update receipt",async()=>{
    const s=await recovery(true,true);
    const fit=(ops?:unknown[])=>s.tools.invoke({name:"recommend_size",args:{subjectRef:"QU714",fitScope:"COMPONENT",componentRole:"TOP",...(ops?{customerStateOps:ops}:{})}});
    await fit();const oldClaims=structuredClone(s.tools.snapshot().protectedClaims);
    await fit([oldHeight,...correct]);expect(s.tools.snapshot().protectedClaims).toHaveLength(0);
    expect((await fit(correct)).status).toBe("OK");
    const ctx=s.tools.snapshot();expect(ctx.state.customerStateUpdatePending).toBeUndefined();
    expect(ctx.protectedClaims).not.toEqual(oldClaims);
    expect(Object.values(ctx.state.sizeFitTargets as Record<string,unknown>)).toContainEqual(expect.objectContaining({target:{kind:"COMPONENT",parentProductId:"QU714",componentRole:"TOP",componentProductId:"PART-TOP"}}));
    expect(ctx.effectReceipts).toContainEqual(expect.objectContaining({effect:"CUSTOMER_STATE_UPDATED"}));
  });
  it("keeps conflicting current corrections and unconfirmed writes blocked",async()=>{
    const s=await recovery();
    await s.apply([correct[0],set("BUST_CM",86,"ngực 88")]);
    expect((await s.apply([set("WEIGHT_KG",51,"51kg"),set("BUST_CM",88,"ngực 88")])).status).toBe("OK");
    s.store.compareAndSwap.mockRejectedValueOnce(new Error("UNKNOWN_COMMIT"));
    await s.apply([set("WAIST_CM",70,"eo 70")]);await s.apply(correct);
    expect(s.tools.snapshot().state.customerStateUpdatePending).toBe(true);
  });
  it("cannot replace a pending SET with CLEAR, a preference or an empty patch",async()=>{
    const s=await recovery();
    await s.apply([correct[0],set("BUST_CM",86,"ngực 88")]);
    for(const ops of [[correct[0],{op:"CLEAR",field:"measurements.BUST_CM"}],
      [{op:"SET",field:"preferences.colors",value:["navy"]}],[]]) {
      expect((await s.apply(ops)).status).toBe("REJECTED");
      expect(s.tools.snapshot().state.customerStateUpdatePending).toBe(true);
    }
    expect(s.store.compareAndSwap).not.toHaveBeenCalled();
  });
});
