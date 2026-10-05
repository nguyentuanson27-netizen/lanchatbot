import { describe, expect, it } from "vitest";
import { buildProtectedClaimsFromVerifiedFactsV1 } from "@lana/business-tools";
import type { BusinessFactEnvelopeV1 } from "@lana/contracts";
import {
  buildSingleAgentFactSurfaces,
  probeSingleAgentEgress,
} from "./single-agent-egress-feasibility.js";

const now = new Date("2026-10-05T03:00:00.000Z");
const facts: BusinessFactEnvelopeV1 = {
  schemaVersion: 1, status: "OK", source: "POS_LIVE",
  observedAt: "2026-10-05T02:59:00.000Z", expiresAt: "2026-10-05T03:05:00.000Z",
  productId: "SQ9012", reasonCode: null,
  facts: {
    schemaVersion: 1, productId: "SQ9012", parentProductId: "SQ9012", offerType: "SET",
    listPriceVnd: 849_000, salePriceVnd: null, sizes: [], stockStatus: "IN_STOCK",
    stockQuantity: 3, deliveryEta: null, fulfillmentPolicy: "STANDARD", imageUrls: [],
  },
};
const product = {
  productId: "SQ9012", parentProductId: "SQ9012", canonicalCode: "SQ9012",
  aliases: [], title: "Set SQ9012", colors: [], materials: [], silhouettes: [],
  occasions: [], imageUrls: [], images: [], catalogVersion: "catalog:1",
};
const surfaces = buildSingleAgentFactSurfaces(facts, product);
const price = surfaces.find(({ claim }) => claim?.type === "PRICE")!;
const probe = (output: unknown) => probeSingleAgentEgress({ output, surfaces, productId: "SQ9012", now });

describe("evaluation-only single-owner protected egress mechanics (not safety certification)", () => {
  it("preserves model decision-support prose and realizes the exact verified price", () => {
    const prose = "Chị đang lo mua rồi ít dùng; mình cân nhắc theo số lần chị dự định mặc nhé.";
    const result = probe({ segments: [{ text: prose }, { ref: price.ref }] });
    expect(result.boundaryOutcome).toBe("ACCEPT");
    expect(result.finalReply).toBe(`${prose}\n${price.text}`);
    expect(price.claim).toEqual(buildProtectedClaimsFromVerifiedFactsV1({ facts, sizeClaim: null }).claims.find(c => c.type === "PRICE"));
  });
  it("keeps partial-answer unknowns in one exact assembled reply", () => {
    const prose = "Về độ nhăn và việc mặc đi làm, em chưa có thông tin để khẳng định; chị thường cần mặc trong hoàn cảnh nào?";
    expect(probe({ segments: [{ ref: price.ref }, { text: prose }] }).finalReply).toBe(`${price.text}\n${prose}`);
  });
  it.each([
    { segments: [{ text: "Mẫu này 849.000đ nhé." }] },
    { segments: [{ ref: "invented" }] },
    { segments: [{ ref: price.ref, text: "Giá 1đ." }] },
    { segments: [{ ref: price.ref }, { ref: price.ref }] },
    { segments: [{ effect: "ORDER_PLACED", text: "Đã chốt đơn." }] },
    { segments: [{ text: "Dạ." }], tenantId: "arbitrary" },
    { segments: [{ text: "Chị gửi em số điện thoại nhận hàng nhé." }] },
  ])("rejects malformed, unbound, duplicate or observed undeclared output: %j", output => {
    expect(probe(output).boundaryOutcome).toBe("REJECT");
    expect(probe(output).finalReply).toBe("");
  });
  it("rejects stale evidence", () => {
    const result = probeSingleAgentEgress({ output: { segments: [{ ref: price.ref }] }, surfaces, productId: "SQ9012", now: new Date("2026-10-05T03:06:00.000Z") });
    expect(result.boundaryOutcome).toBe("REJECT");
    expect(result.reasonCodes.join()).toContain("PROTECTED_CLAIM_STALE");
  });
  it("rejects a reference for a different code-owned product", () => {
    expect(probeSingleAgentEgress({ output: { segments: [{ ref: price.ref }] }, surfaces, productId: "SQ9020", now }).boundaryOutcome).toBe("REJECT");
  });
  it("retains a code-issued conditional policy literal unchanged", () => {
    const policy = { ref: "exchange:v1", text: "Đổi khi còn nguyên tem và chưa sử dụng.", observedAt: facts.observedAt, expiresAt: facts.expiresAt!, sourceVersion: "shop-policy:v1" };
    expect(probeSingleAgentEgress({ output: { segments: [{ ref: policy.ref }] }, surfaces: [policy], productId: "SQ9012", now }).finalReply).toBe(policy.text);
  });
});
