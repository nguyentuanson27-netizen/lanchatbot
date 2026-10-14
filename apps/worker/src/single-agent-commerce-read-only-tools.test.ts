import { describe, expect, it, vi } from "vitest";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureProduct } from "./single-agent-commerce.test-support.js";
import { hardPrecheck, makeBinding } from "./single-agent-semantic-verifier-boundary.js";

const setup = (options: { fee?: number } = {}) => {
  const product = fixtureProduct();
  const readProduct = vi.fn(async () => product);
  const catalog = {
      searchText: async () => ({ status: "MATCHED" as const, matchKind: "EXACT_CODE" as const,
        product: product.product, score: 1, gap: null }), readProduct,
  };
  return { readProduct, catalog, tools: createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow,
    policy: () => fixturePolicy(options.fee), catalog }) };
};
describe("read-only domain tools", () => {
  it("reads source policy, keeps missing customerCare explicit and never exposes negotiation internals", async () => {
    const { tools } = setup();
    expect((await tools.invoke({ name: "read_policy", args: {} })).status).toBe("OK");
    const data = JSON.parse(tools.snapshot().policyLiterals[0]!.text);
    expect(data.shipping.defaultFeeVnd).toBe(25_000);
    expect(data.customerCare).toBeNull();
    expect(JSON.stringify(data)).not.toContain("finalConcession");
  });
  it("policy source changes invalidate old snapshots without changing prompt", async () => {
    let fee = 25_000;
    const { catalog } = setup();
    const changed = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow,
      policy: () => fixturePolicy(fee), catalog });
    await changed.invoke({ name: "read_policy", args: {} });
    const before = makeBinding("turn", "Phí theo nguồn.", changed.snapshot());
    fee = 30_000;
    const after = await changed.readback();
    expect(makeBinding("turn", "Phí theo nguồn.", after).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
  });
  it("rejects invented refs and privileged arguments before I/O", async () => {
    const { tools, readProduct } = setup();
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "OTHER" } })).status).toBe("REJECTED");
    expect((await tools.invoke({ name: "read_policy", args: { pageId: "other" } })).status).toBe("REJECTED");
    expect(readProduct).not.toHaveBeenCalled();
  });
  it("turns a verified search match into an allowlisted ref, then reads price/stock", async () => {
    const { tools } = setup();
    await tools.invoke({ name: "search_products", args: { query: "SM613" } });
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613", color: "navy", size: "M" } })).status).toBe("OK");
    expect(tools.snapshot().protectedClaims.some((c: unknown) => (c as { type: string }).type === "PRICE")).toBe(true);
    expect(tools.snapshot().runtimeProducts![0]!.attributes!.materials).toEqual(["cotton"]);
    expect(hardPrecheck(tools.snapshot(), "Áo giá 499k chị nhé.", commerceNow)).toBeNull();
  });
  it("retains independent verified facts when another reader fails", async () => {
    const { tools } = setup();
    await tools.invoke({ name: "read_policy", args: {} });
    expect((await tools.invoke({ name: "unknown", args: {} })).status).toBe("REJECTED");
    expect(tools.snapshot().policyLiterals).toHaveLength(1);
  });
  it("does not erase a verified price because attributes are invalid", async () => {
    const f = fixtureProduct(); f.product.attributes!.materials = ["forged"];
    const { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => f } });
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(result.status).toBe("OK");
    expect(tools.snapshot().protectedClaims).not.toHaveLength(0);
    expect(tools.snapshot().runtimeProducts!.some(p => p.attributes)).toBe(false);
  });
  it("returns product evidence when POS is unavailable and marks price/stock missing", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => ({ ...f, snapshot: null }) } });
    const result = await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    expect(result.status).toBe("OK");
    expect(result.data).toMatchObject({ missing: expect.arrayContaining(["PRICE", "STOCK"]) });
    expect(tools.snapshot().protectedClaims).toEqual([]);
    expect(tools.snapshot().runtimeProducts).toHaveLength(1);
  });
  it("rejects cross-shop catalog data and loses old price eligibility on stale readback", async () => {
    const f = fixtureProduct(), { catalog } = setup();
    const tools = createReadOnlyTools({ scope: commerceScope(), clock: () => commerceNow, policy: () => fixturePolicy(),
      initialProducts: [f.product], catalog: { ...catalog, readProduct: async () => structuredClone(f) } });
    await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } });
    const before = makeBinding("turn", "Giá 499k.", tools.snapshot());
    f.snapshot.synced_at = "2026-10-01T00:00:00.000Z";
    expect(makeBinding("turn", "Giá 499k.", await tools.readback()).trustedSnapshotId).not.toBe(before.trustedSnapshotId);
    f.snapshot.shop_alias = "OTHER";
    expect((await tools.invoke({ name: "read_product", args: { subjectRef: "SM613" } })).status).toBe("STALE");
  });
});
