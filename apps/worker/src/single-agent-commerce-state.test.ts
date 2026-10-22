import { describe, expect, it, vi } from "vitest";
import { canonicalCartPolicyLinesV2, type CustomerProfileMergeState } from "@lana/business-tools";
import { createCustomerStateTools, createRealtimeCustomerStatePort, type CustomerStatePort } from "./single-agent-commerce-state.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { hardPrecheck, makeBinding } from "./single-agent-semantic-verifier-boundary.js";
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
  return { tools, store, sizeInput, getStored: () => stored, setStored: (s: CustomerProfileMergeState) => { stored = s; } };
}
describe("accepted effective state before dependent tools", () => {
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
    const s = await setup();
    expect((await s.tools.invoke({ name: "apply_customer_state", args: { expectedRevision: 100, ops: [] } })).status).toBe("REJECTED");
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
