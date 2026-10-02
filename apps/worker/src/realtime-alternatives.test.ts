import { describe, expect, it, vi } from "vitest";
import type { StableProductDocument } from "@lana/business-tools";
import type { BusinessFactEnvelopeV1 } from "@lana/contracts";
import { findVerifiedAlternative } from "./realtime-alternatives.js";
import { bindRealtimeCustomerInput } from "./realtime-customer-input.js";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";

const now = new Date("2026-09-30T12:00:00Z");
const product = (id: string): StableProductDocument => ({ productId: id, parentProductId: id,
  canonicalCode: id, title: id, aliases: [], colors: [], materials: [], silhouettes: [],
  occasions: [], imageUrls: [], images: [], catalogVersion: "v1" });
const fact = (id: string, price = 600_000): BusinessFactEnvelopeV1 => ({ schemaVersion: 1,
  status: "OK", source: "POS_SNAPSHOT", observedAt: "2026-09-30T11:59:00Z",
  expiresAt: "2026-09-30T12:10:00Z", productId: id, reasonCode: null,
  facts: { schemaVersion: 1, productId: id, parentProductId: id, offerType: "SET",
    salePriceVnd: price, listPriceVnd: null, sizes: ["M"], stockStatus: "IN_STOCK",
    stockQuantity: 2, deliveryEta: null, fulfillmentPolicy: "READY_STOCK", imageUrls: [] } });
const text = "another one budget 650k";
const customerInput = bindRealtimeCustomerInput({ ...noCustomerSelection(),
  product: { operation: "REJECT", productId: null, evidenceText: "another one" },
  budget: { operation: "SET", value: 650_000, evidenceText: "budget 650k" },
}, text);

it("uses the same-turn budget and all rejected IDs before verifying a recommendation", async () => {
  const searchAlternatives = vi.fn().mockResolvedValue([product("CB182"), product("SD10"), product("SD11")]);
  const resolve = vi.fn().mockImplementation(async ({ productId }) => fact(productId, productId === "SD10" ? 700_000 : 600_000));
  const result = await findVerifiedAlternative({ text, customerInput,
    session: { budgetVnd: 900_000, occasion: "WORK", rejectedProductIds: ["SD09"] },
    currentProductId: "CB182", search: { searchAlternatives }, facts: { resolve }, shopAlias: "LANA", now });
  expect(searchAlternatives).toHaveBeenCalledWith(expect.stringContaining("650000"), ["SD09", "CB182"]);
  expect(searchAlternatives.mock.calls[0]![0]).toContain("WORK");
  expect(resolve.mock.calls.map(([query]) => query.productId)).toEqual(["SD10", "SD11"]);
  expect(result).toMatchObject({ status: "MATCHED", product: { productId: "SD11" }, facts: fact("SD11") });
});

it("applies same-turn reject and search obligations independently", async () => {
  const inputText = "SV9031 thôi không lấy, tìm mẫu khác dưới 800k";
  const input = bindRealtimeCustomerInput({
    ...noCustomerSelection(),
    product: { operation: "SEARCH", productId: null, evidenceText: "tìm mẫu khác" },
    budget: { operation: "SET", value: 800_000, evidenceText: "dưới 800k" },
    obligations: [
      { kind: "PRODUCT_REJECT", capability: null, scope: null,
        productId: "SV9031", evidenceText: "SV9031 thôi không lấy" },
      { kind: "PRODUCT_SEARCH", capability: null, scope: null,
        productId: null, evidenceText: "tìm mẫu khác" },
    ],
  }, inputText);
  const searchAlternatives = vi.fn().mockResolvedValue([product("SV9031"), product("SD11")]);
  const result = await findVerifiedAlternative({
    text: inputText, customerInput: input,
    currentProductId: "CB182", search: { searchAlternatives },
    facts: { resolve: async ({ productId }) => fact(productId, 600_000) },
    shopAlias: "LANA", now,
  });
  expect(searchAlternatives).toHaveBeenCalledWith(
    expect.stringContaining("800000"),
    ["SV9031", "CB182"],
  );
  expect(result).toMatchObject({ status: "MATCHED", product: { productId: "SD11" } });
});

describe("alternative lookup authority", () => {
  it.each(["stale", "future", "no-stock", "wrong-subject", "wrong-offer", "error"])("does not recommend %s facts", async (mode) => {
    const value = fact("SD11");
    if (mode === "stale") value.expiresAt = now.toISOString();
    if (mode === "future") value.observedAt = "2026-10-01T12:00:00Z";
    if (mode === "no-stock") value.facts!.stockStatus = "OUT_OF_STOCK";
    if (mode === "wrong-subject") value.facts!.parentProductId = "SD99";
    if (mode === "wrong-offer") value.facts!.offerType = "AO";
    const result = await findVerifiedAlternative({ text, customerInput: { ...customerInput,
      factQuery: { ...customerInput.factQuery, offerType: "SET" } },
      currentProductId: "CB182", search: { searchAlternatives: async () => [product("SD11")] },
      facts: { resolve: async () => { if (mode === "error") throw new Error("timeout"); return value; } },
      shopAlias: "LANA", now });
    expect(result.status).toBe(mode === "error" ? "UNAVAILABLE" : "NO_MATCH");
  });

  it("bounds lookup even if a port returns too many products", async () => {
    const resolve = vi.fn().mockImplementation(async ({ productId }) => fact(productId, 900_000));
    const result = await findVerifiedAlternative({ text, customerInput, currentProductId: null,
      search: { searchAlternatives: async () => Array.from({ length: 20 }, (_, i) => product(`SD${i}`)) },
      facts: { resolve }, shopAlias: "LANA", now });
    expect(resolve).toHaveBeenCalledTimes(3);
    expect(result.status).toBe("NO_MATCH");
  });
});
