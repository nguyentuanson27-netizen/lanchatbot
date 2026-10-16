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

describe("one conversational owner, tools and exact egress", () => {
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
      {roundsRemaining:2,callsRemaining:6},{roundsRemaining:1,callsRemaining:5},{roundsRemaining:0,callsRemaining:4},
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
    expect(result.toolLatencyMs).toBe(0);
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
    expect(r.terminal.fallbackId).toBe("C3_A_NONPROTECTED_V2");
  });
  it("retains the original failure when a code-owned receipt acknowledgement recovers it", async () => {
    const s = setup();
    const owner = vi.fn(async () => { throw new Error("provider rejected"); });
    const result = await runCommerceTurn({ ...s, owner, tools: { ...s.tools, recover: async () => ({
      disposition: "SEND_ELIGIBLE", reason: "RECEIPT_BACKED_ACK", text: "Đã thêm áo vào giỏ.", fallbackId: null,
    }) } });
    expect(result.terminal.reason).toBe("RECEIPT_BACKED_ACK");
    expect(result).toMatchObject({ recovery: { originalDisposition: "FALLBACK", originalReason: "PROVIDER_ERROR" } });
    expect(owner).toHaveBeenCalledOnce(); expect(s.verifier).not.toHaveBeenCalled();
    expect(JSON.stringify(result.recovery)).not.toContain("Đã thêm áo");
  });
  it("stops after the tool budget, without using intermediate prose as a reply", async () => {
    const s = setup(), owner = vi.fn(async () => tool("read_policy"));
    const r = await runCommerceTurn({ ...s, owner });
    expect(owner).toHaveBeenCalledTimes(3);
    expect(r.toolRounds).toBe(2);
    expect(r.terminal.reason).toBe("BUDGET");
    expect(s.verifier).not.toHaveBeenCalled();
  });
  it.each(["FAIL", "UNCERTAIN"])("%s scores the actual frozen fallback", async verdict => {
    const s = setup(); s.verifier.mockImplementation(async () => ({ result: { verdict, violations: [] } }));
    const r = await runCommerceTurn({ ...s, owner: async () => final() });
    expect(r.terminal.disposition).toBe("FALLBACK");
    expect(r.terminal.text).toBe("Phần này em chưa trả lời được, chị nhé.");
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
    expect(r.terminal.reason).toBe("TIMEOUT");
    expect(r.verifierGenerations).toBe(1);
    expect(verifier).toHaveBeenCalledTimes(1);
  });
});
