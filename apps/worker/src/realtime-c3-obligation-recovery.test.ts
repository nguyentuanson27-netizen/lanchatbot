import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AT, answerPlan, deterministicRuntime, inputDelta } from "./realtime-c3-deterministic.fixture.js";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(AT)); });
afterEach(() => vi.useRealTimers());
const price = { intent: "PRICE" as const, offerType: "SET", size: null, color: null, deliveryRegion: null };
async function bound(runtime: ReturnType<typeof deterministicRuntime>) {
  await runtime.turn({ text: "Mẫu CB182 giá bao nhiêu?", producer: inputDelta({
    product: { operation: "SELECT", productId: "CB182", evidenceText: "CB182" }, factQuery: price,
  }) });
}
const compound = () => inputDelta({ factQuery: price, obligations: [
  { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "CB182", evidenceText: "giá bao nhiêu" },
  { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "CB182", evidenceText: "còn hàng" },
] });

describe("obligation-aware runtime recovery", () => {
  it.each(["ERROR", "STALE"] as const)("retains fresh price and names the %s stock sibling", async (status) => {
    const runtime = deterministicRuntime({ multiFact: true });
    await bound(runtime);
    if (status === "ERROR") runtime.failures.add("CB182:STOCK");
    else {
      const resolve = vi.mocked(runtime.facts.resolve).getMockImplementation()!;
      vi.mocked(runtime.facts.resolve).mockImplementation(async (query) => {
        const result = await resolve(query);
        return query.intent === "STOCK" ? { ...result, status: "STALE", reasonCode: "CATALOG_SNAPSHOT_STALE" } : result;
      });
    }
    const trace = await runtime.turn({ text: "CB182 giá bao nhiêu, còn hàng không?", producer: compound(),
      strategist: answerPlan("PRICE", "stock unsupported"), responderFailure: "TRANSPORT" });
    expect(trace.reply).toContain("799.000");
    expect(trace.reply).toContain("chưa có thông tin xác nhận về tình trạng còn hàng của mẫu CB182");
    expect(trace.after.conversation.conversationOwner).toBe("BOT");
    expect(trace.after.commerce).toEqual(trace.before.commerce);
    expect(trace.committed[0]?.input.metaPlan?.protectedClaimTypes).toEqual(["PRICE"]);
    const responder = trace.roleCalls.find(({ role }) => role === "RESPONDER")!.input;
    expect((responder.responderTask as { obligationResolutions: unknown }).obligationResolutions).toEqual(expect.arrayContaining([
      expect.objectContaining({ capability: "STOCK", status: status === "ERROR" ? "FAILED" : "STALE" }),
    ]));
  });

  it.each(["RESPONDER", "STRATEGIST"] as const)("keeps an unsupported-only scope after %s failure", async (role) => {
    const runtime = deterministicRuntime();
    await bound(runtime);
    const trace = await runtime.turn({ text: "Mẫu CB182 chống nhăn không?", producer: inputDelta({ obligations: [
      { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WRINKLE_RESISTANCE", productId: "CB182", evidenceText: "chống nhăn" },
    ] }), strategist: role === "STRATEGIST" ? () => { throw new Error("SYNTHETIC_STRATEGIST_UNAVAILABLE"); }
      : (input) => ({ ...answerPlan("PRODUCT_ATTRIBUTES", "wrinkle unsupported")(input), evidenceRefs: [] }),
      ...(role === "RESPONDER" ? { responderFailure: "TRANSPORT" as const } : {}) });
    expect(trace.reply).toBe("Em chưa có thông tin xác nhận về khả năng chống nhăn của mẫu CB182.");
    expect(trace.after.commerce).toEqual(trace.before.commerce);
    expect(trace.after.conversation.currentProductId).toBe("CB182");
    expect(trace.planned[0]?.salesCyclePlan).toBeUndefined();
    expect(trace.roleCalls.map(({ role: called }) => called)).toEqual(role === "RESPONDER"
      ? ["PRODUCER", "STRATEGIST", "RESPONDER"] : ["PRODUCER", "STRATEGIST"]);
  });

  it("preserves the requested S stock subject on Responder failure", async () => {
    const runtime = deterministicRuntime();
    await bound(runtime);
    const trace = await runtime.turn({ text: "Size S mẫu CB182 còn hàng không?", producer: inputDelta({
      factQuery: { ...price, intent: "STOCK", size: "S" }, obligations: [
        { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "CB182", evidenceText: "Size S mẫu CB182 còn hàng" },
      ],
    }), strategist: answerPlan("STOCK"), responderFailure: "TRANSPORT" });
    expect(trace.reply).toContain("size S");
    expect(trace.reply).toContain("hết màu BE size S");
    expect(trace.after.commerce).toEqual(trace.before.commerce);
  });

  it("keeps alternative identity with its verified price on Responder failure", async () => {
    const runtime = deterministicRuntime();
    await bound(runtime);
    const text = "Tìm mẫu khác, ngân sách 650k.";
    const trace = await runtime.turn({ text, producer: inputDelta({
      budget: { operation: "SET", value: 650_000, evidenceText: "ngân sách 650k" },
      obligations: [{ kind: "PRODUCT_SEARCH", capability: null, scope: null, productId: null, evidenceText: "Tìm mẫu khác" }],
    }), strategist: answerPlan("PRICE"), responderFailure: "TRANSPORT" });
    expect(trace.reply).toContain("SD12");
    expect(trace.reply).toContain("599.000");
    expect(trace.reply).not.toContain("799.000");
    expect(trace.after.commerce).toEqual(trace.before.commerce);
  });
});
