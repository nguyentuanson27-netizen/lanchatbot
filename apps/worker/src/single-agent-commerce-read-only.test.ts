import { describe, expect, it, vi } from "vitest";
import { runCommerceTurn, type OwnerGeneration, type OwnerRequest, type VerifierRequest } from "./single-agent-commerce-read-only.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureProduct } from "./single-agent-commerce.test-support.js";

const setup = (description?: string) => {
  const f = fixtureProduct(), scope = commerceScope();
  if (description) f.product.descriptionXml = description;
  const tools = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(), initialProducts: [f.product],
    catalog: { readProduct: async () => f, searchText: async () => ({ status: "MATCHED", matchKind: "EXACT_CODE", product: f.product, score: 1, gap: null }) } });
  const verifier = vi.fn(async (_request: VerifierRequest) => ({ result: { verdict: "PASS", violations: [] } }));
  return { scope, tools, verifier, clock: () => commerceNow, latest: "Mẫu này bao nhiêu em?", history: [], ownerPrompt: "Tư vấn theo nguồn.", verifierPrompt: "Kiểm exact reply." };
};
const final = (text = "Áo giá 499k chị nhé."): OwnerGeneration => ({ kind: "FINAL", text });
const tool = (name: string, args: unknown = {}): OwnerGeneration => ({ kind: "TOOLS", calls: [{ name, args }],
  content: { role: "model", parts: [{ functionCall: { name, args }, thoughtSignature: "opaque-signature" }] } });

it("allows one separately accounted terminal handoff after six normal calls without a fourth generation", async () => {
  const s=setup();let committed=false,step=0;
  const invokeBatch=vi.fn(async(calls: import("./single-agent-commerce-read-only-tools.js").CommerceToolCall[])=>{
    if(calls[0]?.name==="request_handoff")committed=true;
    return calls.map(()=>({status:"OK" as const}));
  });
  const tools={...s.tools,prepare:async()=>0,availableTools:["read_policy","request_handoff"],invokeBatch,
    terminalOutcome:async()=>committed?{disposition:"HANDOFF" as const,reason:"STOCK_UNAVAILABLE",text:null,fallbackId:null}:null,
    handoffStatus:()=>committed?{attempts:1,status:"COMMITTED" as const,reason:"STOCK_UNAVAILABLE"}:null};
  const r=await runCommerceTurn({...s,tools,owner:async request=>{
    if(++step===3){expect(request.toolsAllowed).toBe(false);expect(request).toMatchObject({terminalHandoffAllowed:true});return tool("request_handoff",{reason:"STOCK_UNAVAILABLE"});}
    const calls=Array.from({length:3},()=>({name:"read_policy",args:{}}));
    return {kind:"TOOLS",calls,content:{role:"model",parts:calls.map(functionCall=>({functionCall}))}};
  }});
  expect(r.terminal.disposition).toBe("HANDOFF");expect(r.ownerGenerations).toBe(3);
  expect(r).toMatchObject({normalToolCalls:6,terminalHandoffCalls:1,toolCalls:7,proposedToolCalls:7,rejectedToolCalls:0});
  expect(s.verifier).not.toHaveBeenCalled();expect(invokeBatch).toHaveBeenCalledTimes(3);
});

it.each(["REJECTED","UNAVAILABLE"] as const)("ends a rejected terminal handoff without another generation (%s)",async status=>{
  const s=setup(),invokeBatch=vi.fn(async()=>[{status,reason:"HANDOFF_CONFLICT"}]),owner=vi.fn(async()=>tool("request_handoff",{reason:"CUSTOMER_REQUESTED_HUMAN"}));
  const r=await runCommerceTurn({...s,tools:{...s.tools,availableTools:["request_handoff"],invokeBatch},owner});
  expect(r.terminal).toMatchObject({disposition:"NO_SEND",reason:"HANDOFF_REQUEST_REJECTED",text:null});
  expect(owner).toHaveBeenCalledOnce();expect(s.verifier).not.toHaveBeenCalled();expect(invokeBatch).toHaveBeenCalledOnce();
  expect(r.terminalHandoffCalls).toBe(1);
});

it("rejects a mixed handoff/read batch without executing either call",async()=>{
  const s=setup(),invokeBatch=vi.fn(async()=>[]),calls=[{name:"request_handoff",args:{reason:"EXCHANGE"}},{name:"read_policy",args:{}}];
  const r=await runCommerceTurn({...s,tools:{...s.tools,availableTools:["read_policy","request_handoff"],invokeBatch},
    owner:async()=>({kind:"TOOLS",calls,content:{role:"model",parts:calls.map(functionCall=>({functionCall}))}})});
  expect(invokeBatch).not.toHaveBeenCalled();expect(r.terminal.disposition).toBe("NO_SEND");
  expect(r).toMatchObject({proposedToolCalls:2,rejectedToolCalls:2,terminalHandoffCalls:0});
});

describe("one conversational owner, tools and exact egress", () => {
  it.each(["[asset:declared]", "asset:unknown", "[asset:", "Chị xem ảnh asset:from-history nhé"])("rejects transport artifacts before verification: %s", async text => {
    const s = setup();
    const result = await runCommerceTurn({ ...s, history: [{role:"shop",text:"asset:from-history"}], owner:async()=>final(text) });
    expect(result.terminal.disposition).toBe("NO_SEND");
    expect(result.recovery?.originalReason).toBe("OWNER_OUTPUT_ARTIFACT");
    expect(s.verifier).not.toHaveBeenCalled();
    expect(result.ownerGenerations).toBe(1);
  });
  it("keeps customer prose and product codes byte exact", async () => {
    const s=setup(),text="Áo SV2447 màu be: 499.000đ (mua riêng).";
    const result=await runCommerceTurn({...s,owner:async()=>final(text)});
    expect(result.terminal.text).toBe(text);
    expect(s.verifier).toHaveBeenCalledOnce();
    expect(s.verifier.mock.calls[0]![0].finalDraft).toBe(text);
  });
  it("does not use the artifact fallback after permission is revoked",async()=>{
    const s=setup();let permission=true;
    const tools={...s.tools,snapshot:()=>{const c=s.tools.snapshot();return {...c,state:{...c.state,permission}};}};
    const result=await runCommerceTurn({...s,tools,owner:async()=>{permission=false;return final('asset:unknown');}});
    expect(result.terminal.disposition).toBe('NO_SEND');
    expect(s.verifier).not.toHaveBeenCalled();
  });
  it("shares a single processing clock with every owner generation and verifier, outside the world snapshot", async () => {
    const s = setup(), anchors: unknown[] = [], before = s.tools.snapshot();
    let now = new Date(commerceNow);
    const outputs = [tool("read_policy"), final("Dạ chị.")];
    const result = await runCommerceTurn({ ...s, clock: () => now, owner: async r => {
      anchors.push((r as OwnerRequest & { turnTime?: unknown }).turnTime);
      now = new Date(now.getTime()+1000);
      return outputs.shift()!;
    }, verifier: async r => {
      anchors.push((r as VerifierRequest & { turnTime?: unknown }).turnTime);
      expect(Object.hasOwn(r.trusted, "turnTime")).toBe(false);
      expect(Object.hasOwn(r.trusted.state, "turnTime")).toBe(false);
      return { result: { verdict: "PASS", violations: [] } };
    } });
    expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
    expect(anchors).toHaveLength(3);
    for (const anchor of anchors) expect(anchor).toEqual({ processingAt: commerceNow.toISOString(), timeZone: "Asia/Ho_Chi_Minh" });
    expect(before.state.bindingVersion).toBe(s.tools.snapshot().state.bindingVersion);
    await runCommerceTurn({ ...s, clock: () => now, owner: async r => {
      expect((r as OwnerRequest & { turnTime?: unknown }).turnTime).toEqual({ processingAt: now.toISOString(), timeZone: "Asia/Ho_Chi_Minh" });
      return final("Dạ chị.");
    } });
  });
  it("prepares after privacy and permission checks and charges one call before the first owner", async () => {
    const s = setup();
    const owner = vi.fn(async (r: OwnerRequest) => {
      expect(r.toolBudget).toEqual({ roundsRemaining: 2, callsRemaining: 5 });
      expect(r.context.runtimeProducts?.[0]?.content).toBeTruthy();
      return final("Dạ chị.");
    });
    const result = await runCommerceTurn({ ...s, owner });
    expect(result.toolCalls).toBe(1);
    expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
    const prepare = vi.fn(async () => 1);
    await runCommerceTurn({ ...s, latest: "SĐT 0900000000", tools: { ...s.tools, prepare }, owner });
    expect(prepare).not.toHaveBeenCalled();
  });
  it("reuses the immediately completed terminal readback before the next owner call without skipping final freshness", async () => {
    const s = setup(), checks = vi.fn(async () => null), readback = vi.spyOn(s.tools, "readback");
    const owner = vi.fn().mockResolvedValueOnce(tool("read_policy")).mockResolvedValueOnce(final());
    const result = await runCommerceTurn({ ...s, tools: { ...s.tools, terminalOutcome: checks }, owner });
    expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
    expect(checks).toHaveBeenCalledTimes(2); // Entry and immediately after the tool, with no I/O before the next owner call.
    expect(readback).toHaveBeenCalledOnce(); expect(s.verifier).toHaveBeenCalledOnce();
  });
  it.each([false, true])("finishes search -> one option-summary read -> final in budget, changed source=%s", async changed => {
    const s = setup(), f = fixtureProduct();
    f.snapshot.offers.COMPOSITE = { ...structuredClone(f.snapshot.offers.DIRECT!), sale_price: 1_065_000,
      rows: f.snapshot.offers.DIRECT!.rows.map(r => ({ ...r, offer_type: "COMPOSITE", sale_price: 1_065_000 })) };
    f.snapshot.offers.AO = { ...structuredClone(f.snapshot.offers.DIRECT!), sale_price: 645_000,
      rows: f.snapshot.offers.DIRECT!.rows.map(r => ({ ...r, offer_type: "AO", sale_price: 645_000 })) };
    delete f.snapshot.offers.DIRECT;
    const tools = createReadOnlyTools({ scope: s.scope, clock: s.clock, policy: () => fixturePolicy(), catalog: {
      readProduct: async () => structuredClone(f),
      searchText: async () => ({ status: "MATCHED", matchKind: "EXACT_CODE", product: structuredClone(f.product), score: 1, gap: null }),
    } });
    let step = 0;
    const result = await runCommerceTurn({ ...s, tools, owner: async request => {
      if (step++ === 0) return tool("search_products", { query: "SM613" });
      if (step === 2) return tool("read_product", { subjectRef: "SM613" });
      expect(request.toolsAllowed).toBe(false);
      expect(request.contents.at(-1)!.parts[0]).toMatchObject({ functionResponse: { response: { data: { sellingOptions: [
        { offerType: "AO", facts: expect.arrayContaining([expect.objectContaining({ type: "PRICE", value: { amountVnd: 645_000, currency: "VND" } })]) },
        { offerType: "COMPOSITE" },
      ] } } } });
      return final("Áo lẻ 645k chị nhé.");
    }, verifier: async request => {
      expect(request.finalDraft).toBe("Áo lẻ 645k chị nhé.");
      expect(request.trusted.protectedClaims).toHaveLength(4);
      if (changed) {
        f.snapshot.offers.AO!.sale_price = 650_000;
        f.snapshot.offers.AO!.rows[0]!.sale_price = 650_000;
      }
      return { result: { verdict: "PASS", violations: [] } };
    } });
    expect(result.ownerGenerations).toBe(3);
    expect(result.toolRounds).toBe(2);
    expect(result.toolCalls).toBe(2);
    expect(result.verifierGenerations).toBe(1);
    expect(result.terminal.disposition).toBe(changed ? "NO_SEND" : "SEND_ELIGIBLE");
    expect(changed ? result.recovery?.originalReason : result.terminal.reason).toBe(changed ? "CURRENT_READBACK_UNAVAILABLE" : "PASS");
    expect(result.sendEnabled).toBe(false);
  });
  it("does not reject a read batch solely because product evidence is duplicated in the trusted snapshot", async () => {
    const s = setup(), products = [fixtureProduct("SM613"), fixtureProduct("SM614")];
    for (const p of products) p.product.descriptionXml = "cotton ".repeat(400);
    const tools = createReadOnlyTools({ scope: s.scope, clock: s.clock, policy: () => fixturePolicy(),
      initialProducts: products.map(p => p.product), catalog: {
        readProduct: async id => products.find(p => p.product.productId === id)!,
        searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }),
      } });
    const calls = products.map(p => ({ name: "read_product", args: { subjectRef: p.product.productId } }));
    const results = await tools.invokeBatch(calls);
    expect(results.every(r => Buffer.byteLength(JSON.stringify(r)) <= 8192)).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(results))).toBeGreaterThan(8192);
    let step = 0, lastRequest: OwnerRequest | undefined;
    const owner = vi.fn(async (request: OwnerRequest): Promise<OwnerGeneration> => {
      if (step++ === 0) return { kind: "TOOLS", calls,
        content: { role: "model", parts: calls.map(functionCall => ({ functionCall })) } };
      // Raw results remain intact: later source changes must not erase earlier evidence.
      lastRequest = request;
      return final();
    });
    const result = await runCommerceTurn({ ...s, tools, owner });
    expect(lastRequest!.contents.at(-1)!.parts).toHaveLength(2);
    expect(JSON.stringify(lastRequest!.contents.at(-1))).toContain("cotton ".repeat(399));
    expect(lastRequest!.context.runtimeProducts).toHaveLength(2);
    expect(result.terminal.reason).toBe("PASS");
    expect(owner).toHaveBeenCalledTimes(2);
    expect(s.verifier).toHaveBeenCalledOnce();
  });
  it.each(["different-evidence", "unknown-product", "error", "partial", "other-tool"])("keeps the batch bound for nonredundant results: %s", async kind => {
    const s = setup();
    await s.tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    const context = s.tools.snapshot(), product = structuredClone(context.runtimeProducts![0]!);
    product.content = {...product.content!, description:"cotton ".repeat(1400)};
    const data = { ...structuredClone(product),
      ...(kind === "different-evidence" ? {content:{description:"linen ".repeat(1600)}} : {}),
      ...(kind === "unknown-product" ? {subjectRef:"UNKNOWN"} : {}),
      ...(kind === "partial" ? {availability:{price:{status:"UNAVAILABLE"}}} : {}) };
    const owner = vi.fn(async () => tool(kind === "other-tool" ? "read_policy" : "read_product", {subjectRef:"SM613"}));
    const result = await runCommerceTurn({...s, owner, tools:{...s.tools, prepare:async()=>0, snapshot:()=>({...context,runtimeProducts:[product]}),
      invokeBatch:async()=>[{status:kind === "error" ? "UNAVAILABLE" as const : "OK" as const, data}]}});
    expect(result.recovery?.originalReason).toBe("TOOL_RESULT_BOUND");
    expect(owner).toHaveBeenCalledOnce(); expect(s.verifier).not.toHaveBeenCalled();
  });
  it("keeps every discovery candidate and unknown price when duplicate search descriptions exceed 8KB", async () => {
    const s=setup(), products=["SM613","SM614","SM615"].map(id=>fixtureProduct(id));
    for(const p of products)p.product.descriptionXml="Vải cotton, dáng suông. ".repeat(120);
    const tools=createReadOnlyTools({scope:s.scope,clock:s.clock,policy:fixturePolicy,catalog:{
      readProduct:async id=>products.find(p=>p.product.productId===id)!,
      searchText:async()=>({status:"AMBIGUOUS",reasonCode:"TOP_GAP_TOO_SMALL",
        candidates:products.map(p=>({document:p.product,score:0.8})),topScore:0.8,gap:0}),
    }});
    let request:OwnerRequest|undefined,step=0;
    const result=await runCommerceTurn({...s,tools,owner:async r=>{
      if(step++===0)return tool("search_products",{query:"bộ đi làm"});
      request=r;return final("Chị thích áo quần hay váy ạ?");
    }});
    expect(result.terminal.reason).toBe("PASS");
    expect(Buffer.byteLength(JSON.stringify(request!.contents.at(-1)))).toBeGreaterThan(8192);
    expect(request!.context.runtimeProducts).toHaveLength(3);
    expect(request!.context.protectedClaims).toEqual([]); // Search does not invent a current quote.
    expect(s.verifier).toHaveBeenCalledOnce();
  });
  it("lets the transport bound the exact provider projection instead of rejecting duplicated internal context", async () => {
    const adapterUrl = new URL("../evals/single-agent-commerce-read-only/gemini-inference.mjs", import.meta.url);
    const { buildGeminiCommerceRequest } = await import(adapterUrl.href) as { buildGeminiCommerceRequest: (request: OwnerRequest) => unknown };
    const s = setup("cotton ".repeat(850));
    await s.tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    const context = s.tools.snapshot(), sizes: { internal: number; wire: number }[] = [];
    const native = () => ({ ...tool("read_product", { subjectRef: "SM613" }), content: { role: "model" as const,
      parts: [{ functionCall: { name: "read_product", args: { subjectRef: "SM613" } }, thoughtSignature: "s".repeat(3000) }] } });
    const outputs = [native(), native(), final("Dạ chị.")];
    const result = await runCommerceTurn({ ...s, ownerPrompt: "i".repeat(10000),
      tools: { ...s.tools, invokeBatch: async () => [{ status: "OK", data: { subjectRef: "SM613", content: context.runtimeProducts![0]!.content } }] },
      owner: async request => {
        sizes.push({ internal: Buffer.byteLength(JSON.stringify(request)), wire: Buffer.byteLength(JSON.stringify(buildGeminiCommerceRequest(request))) });
        return outputs.shift()!;
      } });
    expect(sizes).toHaveLength(3); expect(sizes[2]!.internal).toBeGreaterThan(32768);
    expect(sizes.every(s => s.wire <= 32768)).toBe(true);
    expect(result.terminal.reason).toBe("PASS"); expect(s.verifier).toHaveBeenCalledOnce();
  });
  it("exposes the remaining existing tool budget to each native continuation without granting extra rounds", async () => {
    const s = setup(), requests: unknown[] = [];
    const outputs = [tool("read_product", {subjectRef:"SM613"}),tool("read_policy"),final()];
    await runCommerceTurn({ ...s, owner: async request => {requests.push(structuredClone(request));return outputs.shift()!;} });
    expect(requests.map(r => (r as {toolBudget:unknown}).toolBudget)).toEqual([
      {roundsRemaining:2,callsRemaining:5},{roundsRemaining:1,callsRemaining:4},{roundsRemaining:0,callsRemaining:3},
    ]);
    expect(s.verifier).toHaveBeenCalledTimes(1);
  });
  it("measures verification through the current-source readback, including its added delay", async () => {
    const s = setup(), readback = s.tools.readback;
    s.tools.readback = async () => { await new Promise(resolve => setTimeout(resolve,20));return readback(); };
    const result = await runCommerceTurn({ ...s, clock: () => commerceNow, latest: "Em ơi", history: [],
      ownerPrompt: "Tư vấn.", verifierPrompt: "Kiểm reply.", owner: async () => ({kind:"FINAL",text:"Dạ chị."}),
      verifier: async () => ({result:{verdict:"PASS",violations:[]}}) });
    expect(result.verificationLatencyMs).toBeGreaterThanOrEqual(10);
    expect(result.toolLatencyMs).toBeGreaterThanOrEqual(0);
  });
  it("verifies even a simple non-protected reply and never sends", async () => {
    const s = setup();
    const result = await runCommerceTurn({ ...s, owner: async () => final("Dạ chị.") });
    expect(s.verifier).toHaveBeenCalledTimes(1);
    expect(result.terminal.text).toBe("Dạ chị.");
    expect(result.sendEnabled).toBe(false);
    expect(result.ownerGenerations).toBe(1);
  });
  it("continues the same native dialogue with tool results and exact final draft", async () => {
    const s = setup(), bodies: unknown[] = [];
    const outputs = [tool("read_product", { subjectRef: "SM613" }), final()];
    const result = await runCommerceTurn({ ...s, owner: async request => { bodies.push(structuredClone(request)); return outputs.shift()!; } });
    expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
    expect(result.ownerGenerations).toBe(2);
    expect(JSON.stringify(bodies[1])).toContain("opaque-signature");
    expect(JSON.stringify(bodies[1])).toContain("functionResponse");
    expect(s.verifier.mock.calls[0]![0].finalDraft).toBe("Áo giá 499k chị nhé.");
  });
  it("pairs a provider-issued native call id with its continuation result", async () => {
    const s = setup(); let n = 0;
    const result = await runCommerceTurn({ ...s, owner: async request => {
      if (n++ === 0) return { kind: "TOOLS", calls: [{ id: "call-1", name: "read_policy", args: {} }],
        content: { role: "model", parts: [{ functionCall: { id: "call-1", name: "read_policy", args: {} } }] } };
      expect(request.contents.at(-1)!.parts[0]).toMatchObject({ functionResponse: { id: "call-1", name: "read_policy" } });
      return final("Dạ chị.");
    } });
    expect(result.terminal.disposition).toBe("SEND_ELIGIBLE");
  });
  it("does not retry a failed owner generation", async () => {
    const s = setup(), owner = vi.fn(async () => { throw new Error("429"); });
    const r = await runCommerceTurn({ ...s, owner });
    expect(owner).toHaveBeenCalledTimes(1);
    expect(s.verifier).not.toHaveBeenCalled();
    expect(r.terminal).toMatchObject({disposition:"NO_SEND",text:null,fallbackId:null});
  });
  it("retains the original failure without sending a legacy receipt acknowledgement", async () => {
    const s = setup();
    const owner = vi.fn(async () => { throw new Error("provider rejected"); });
    const result = await runCommerceTurn({ ...s, owner, tools: { ...s.tools, recover: async () => ({
      disposition: "SEND_ELIGIBLE", reason: "RECEIPT_BACKED_ACK", text: "Đã thêm áo vào giỏ.", fallbackId: null,
    }) } });
    expect(result.terminal).toMatchObject({disposition:"NO_SEND",text:null});
    expect(result).toMatchObject({ recovery: { originalDisposition: "FALLBACK", originalReason: "PROVIDER_ERROR" } });
    expect(owner).toHaveBeenCalledOnce(); expect(s.verifier).not.toHaveBeenCalled();
    expect(JSON.stringify(result.recovery)).not.toContain("Đã thêm áo");
  });
  it("retains stale final-gate diagnostics without authorizing a receipt acknowledgement", async () => {
    const s = setup(), readback = s.tools.readback;
    const result = await runCommerceTurn({ ...s, owner: async () => final("Dạ chị."), tools: { ...s.tools,
      readback: async () => { const current = await readback(); current.state.revision++; return current; },
      recover: async () => ({ disposition: "SEND_ELIGIBLE", reason: "RECEIPT_BACKED_ACK", text: "Đã thêm áo vào giỏ.", fallbackId: null }),
    } });
    expect(result.terminal).toMatchObject({disposition:"NO_SEND",text:null});
    expect(result.recovery).toMatchObject({ originalDisposition: "HANDOFF", originalReason: "STALE",
      originalDiagnostic: { check: "CURRENT_SNAPSHOT", expectedRevision: s.scope.revision, currentRevision: s.scope.revision + 1, reasonCodes: [] } });
  });
  it("records final-only tool output as a conformance failure without executing, retrying or sending intermediate prose", async () => {
    const s = setup(), owner = vi.fn(async () => tool("read_policy"));
    const invokeBatch = vi.spyOn(s.tools, "invokeBatch");
    const r = await runCommerceTurn({ ...s, owner });
    expect(owner).toHaveBeenCalledTimes(3);
    expect(r.toolRounds).toBe(2);
    expect(invokeBatch).toHaveBeenCalledTimes(2);
    expect(r.recovery?.originalReason).toBe("OWNER_TOOL_MODE");
    expect(r.generations.map(g => g.status)).toEqual(["OK", "OK", "PROVIDER_ERROR"]);
    expect(s.verifier).not.toHaveBeenCalled();
  });
  it("preserves tool-mode failure without invoking legacy receipt recovery", async () => {
    const s = setup();
    const r = await runCommerceTurn({ ...s, owner: async () => tool("read_policy"), tools: { ...s.tools,
      recover: async () => ({ disposition: "SEND_ELIGIBLE", reason: "RECEIPT_BACKED_ACK", text: "Đã nhận lựa chọn.", fallbackId: null }),
    } });
    expect(r.recovery?.originalReason).toBe("OWNER_TOOL_MODE");
    expect(r.generations.at(-1)?.status).toBe("PROVIDER_ERROR");
    expect(r.ownerGenerations).toBe(3); expect(r.verifierGenerations).toBe(0);
  });
  it.each(["FAIL", "UNCERTAIN"])("%s has no customer output without a committed handoff", async verdict => {
    const s = setup(); s.verifier.mockImplementation(async () => ({ result: { verdict, violations: [] } }));
    const r = await runCommerceTurn({ ...s, owner: async () => final() });
    expect(r.terminal.disposition).toBe("NO_SEND");
    expect(r.terminal.text).toBeNull();
  });
  it("does not mention staff or the bot after a failed verdict just because handoff is available",async()=>{
    const s=setup();s.verifier.mockResolvedValue({result:{verdict:"FAIL",violations:[]}});
    const tools={...s.tools,availableTools:["request_handoff"],fallbackId:()=>"C3_A_NONPROTECTED_V2"};
    const r=await runCommerceTurn({...s,tools,owner:async()=>final()});
    expect(r.terminal).toMatchObject({disposition:"NO_SEND",text:null,fallbackId:null});
    expect(r.recovery?.originalReason).toBe("FAIL");
  });
  it("does not send the media-source fallback when handoff is unproved",async()=>{
    const s=setup();s.verifier.mockResolvedValue({result:{verdict:"FAIL",violations:[]}});
    const tools={...s.tools,availableTools:["request_handoff"],fallbackId:()=>"C3_B_MEDIA_UNAVAILABLE_V1"};
    const r=await runCommerceTurn({...s,tools,owner:async()=>final()});
    expect(r.terminal).toMatchObject({disposition:"NO_SEND",text:null,fallbackId:null});
  });
  it("invalidates PASS if permission changes during verification", async () => {
    const s = setup(), readback = s.tools.readback;
    s.tools.readback = async () => { const current = await readback(); current.state.permission = false; return current; };
    const r = await runCommerceTurn({ ...s, owner: async () => final() });
    expect(r.terminal.disposition).toBe("NO_SEND");
  });
  it("never projects evaluator-only input into either provider request", async () => {
    const s = setup(), seen: unknown[] = []; let n = 0;
    const input = { ...s, caseId: "CANARY_CASE", expectedSafe: true, requiredBehaviors: ["CANARY_RUBRIC"],
      owner: async (r: unknown) => { seen.push(r); return n++ === 0 ? tool("read_policy") : final("Dạ chị."); },
      verifier: async (r: unknown) => { seen.push(r); return { result: { verdict: "PASS", violations: [] } }; } };
    await runCommerceTurn(input);
    expect(seen).toHaveLength(3);
    expect(JSON.stringify(seen)).not.toMatch(/CANARY_CASE|CANARY_RUBRIC|expectedSafe|requiredBehaviors/);
  });
  it("bounds a hung verifier, counts it once and fails closed", async () => {
    const s = setup();
    const verifier = vi.fn(() => new Promise<never>(() => {}));
    const r = await runCommerceTurn({ ...s, timeoutMs: 5, owner: async () => final(), verifier });
    expect(r.recovery?.originalReason).toBe("TIMEOUT");
    expect(r.verifierGenerations).toBe(1);
    expect(verifier).toHaveBeenCalledTimes(1);
  });
  it.each(["owner", "verifier"] as const)("counts an adapter timeout as TIMEOUT for %s, without retrying", async role => {
    const s = setup(), timeout = vi.fn(async () => { throw Object.assign(new Error("PROVIDER_TIMEOUT"), { telemetry: { providerRequests: 1, failureCode: "TIMEOUT" } }); });
    const result = await runCommerceTurn({ ...s, owner: role === "owner" ? timeout : async () => final("Dạ chị."),
      verifier: role === "verifier" ? timeout : s.verifier });
    expect(result.recovery?.originalReason).toBe("TIMEOUT"); expect(timeout).toHaveBeenCalledOnce();
    expect(result.generations.find(g => g.role === role)).toMatchObject({ status: "TIMEOUT", telemetry: { providerRequests: 1 } });
  });
});
