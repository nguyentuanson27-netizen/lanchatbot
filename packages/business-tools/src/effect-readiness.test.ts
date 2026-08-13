import { describe, expect, it } from "vitest";
import { CanonicalBuyingIntentV1Schema, ProtectedClaimV1Schema } from "@lana/contracts";
import { evaluateDeterministicEffectReadinessV1 } from "./effect-readiness.js";

const hash = (character: string) => character.repeat(64);
const now = new Date("2026-08-13T03:00:00.000Z");
const provenance = (type: "PRICE" | "STOCK" | "ETA") => ({
  authority: "POS_LIVE" as const,
  sourceVersion: `pos:${type}:7`,
  evidenceRef: `fact:${type}:safe-ref`,
  contentHash: hash(type === "PRICE" ? "a" : type === "STOCK" ? "b" : "c"),
  observedAt: "2026-08-13T02:59:00.000Z",
  expiresAt: "2026-08-13T03:05:00.000Z",
});
const scope = { kind: "PRODUCT" as const, productId: "product-1", variantId: null };
const claims = [
  ProtectedClaimV1Schema.parse({ schemaVersion: 1, claimId: "11111111-1111-5111-8111-111111111111", type: "PRICE", scope, provenance: provenance("PRICE"), value: { amountVnd: 120_000, currency: "VND" }, authorization: "NONE" }),
  ProtectedClaimV1Schema.parse({ schemaVersion: 1, claimId: "22222222-2222-5222-8222-222222222222", type: "STOCK", scope, provenance: provenance("STOCK"), value: { status: "IN_STOCK", availableQuantity: 4 }, authorization: "NONE" }),
];
const intent = CanonicalBuyingIntentV1Schema.parse({
  schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1",
  decision: "COMMITTED", requestedAction: "OPEN_CART", quantity: 1,
  productId: "product-1", contributors: ["DETERMINISTIC_RUNTIME"],
  sourceMessageIdHash: hash("d"), evidenceHash: hash("e"),
  reasonCodes: ["DIRECT_PURCHASE_VERB"], evaluatedAt: now.toISOString(),
  authorization: "NONE",
});
const base = {
  effect: "CART_OPEN" as const,
  pageId: "page-1", conversationId: "conversation-1",
  sourceMessageIdHash: hash("d"), conversationRevision: 8,
  salesCycleRevision: 2, productIds: ["product-1"],
  cartId: null, cartVersion: null, orderPreviewId: null, orderPreviewHash: null,
  buyingIntent: intent, claims, checkedAt: now,
};

describe("deterministic effect readiness", () => {
  it("authorizes nothing while producing a fresh READY binding for a verified cart open", () => {
    const result = evaluateDeterministicEffectReadinessV1(base);
    expect(result.outcome).toBe("READY");
    expect(result.authorization).toBe("NONE");
    expect(result.buyingIntentHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.claimSetHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("blocks model-only or missing canonical buying intent", () => {
    const result = evaluateDeterministicEffectReadinessV1({ ...base, buyingIntent: null });
    expect(result.outcome).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("BUYING_INTENT_MISSING");
    const modelOnly = evaluateDeterministicEffectReadinessV1({
      ...base,
      buyingIntent: CanonicalBuyingIntentV1Schema.parse({
        ...intent,
        contributors: ["MODEL_STRUCTURED_OUTPUT"],
        reasonCodes: ["MODEL_BUYING_COMMITTED"],
      }),
    });
    expect(modelOnly.outcome).toBe("BLOCKED");
    expect(modelOnly.reasonCodes).toContain("BUYING_INTENT_MISSING");
  });

  it("blocks stale, missing, conflicting, and cross-product claims", () => {
    const stale = ProtectedClaimV1Schema.parse({
      ...claims[0]!,
      provenance: { ...claims[0]!.provenance, expiresAt: now.toISOString() },
    });
    const conflict = ProtectedClaimV1Schema.parse({
      ...claims[0]!, claimId: "33333333-3333-5333-8333-333333333333",
      provenance: { ...claims[0]!.provenance, contentHash: hash("f") },
      value: { amountVnd: 130_000, currency: "VND" },
    });
    const crossProduct = ProtectedClaimV1Schema.parse({
      ...claims[0]!, claimId: "44444444-4444-5444-8444-444444444444",
      scope: { kind: "PRODUCT", productId: "product-3", variantId: null },
    });
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      productIds: ["product-1", "product-2"],
      claims: [stale, claims[0]!, conflict, crossProduct],
    });
    expect(result.outcome).toBe("BLOCKED");
    expect(result.reasonCodes).toEqual(expect.arrayContaining([
      "CLAIM_STALE", "CLAIM_MISSING", "CLAIM_CONFLICT", "CLAIM_SCOPE_MISMATCH",
    ]));
  });

  it("returns a controlled block for a fourth distinct cart product", () => {
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      productIds: ["product-1", "product-2", "product-3", "product-4"],
      deterministicEvidenceHash: hash("f"),
    });

    expect(result.outcome).toBe("BLOCKED");
    expect(result.productIds).toEqual(["product-1", "product-2", "product-3", "product-4"]);
    expect(result.reasonCodes).toContain("PRODUCT_AMBIGUOUS");
  });

  it("bounds oversized blocked readiness without throwing", () => {
    const fiftyProductIds = Array.from({ length: 50 }, (_, index) => `product-${index + 1}`);
    const atCapacity = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      productIds: fiftyProductIds,
      deterministicEvidenceHash: hash("f"),
    });
    expect(atCapacity).toMatchObject({
      outcome: "BLOCKED",
      productIds: fiftyProductIds.sort(),
      reasonCodes: expect.arrayContaining(["PRODUCT_AMBIGUOUS"]),
    });

    const overCapacity = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      productIds: [...fiftyProductIds, "product-51"],
      deterministicEvidenceHash: hash("f"),
    });
    expect(overCapacity.outcome).toBe("BLOCKED");
    expect(overCapacity.productIds).toHaveLength(50);
    expect(overCapacity.reasonCodes).toContain("PRODUCT_AMBIGUOUS");

    for (const invalidId of ["", "   ", "x".repeat(129)]) {
      const invalid = evaluateDeterministicEffectReadinessV1({
        ...base,
        effect: "CART_MUTATION",
        productIds: [...fiftyProductIds, invalidId],
        deterministicEvidenceHash: hash("f"),
      });
      expect(invalid.outcome).toBe("BLOCKED");
      expect(invalid.productIds).toHaveLength(50);
      expect(invalid.reasonCodes).toContain("PRODUCT_AMBIGUOUS");
    }

    const duplicate = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      productIds: ["product-1", "product-1"],
      deterministicEvidenceHash: hash("f"),
    });
    expect(duplicate).toMatchObject({
      outcome: "BLOCKED",
      productIds: ["product-1"],
      reasonCodes: expect.arrayContaining(["PRODUCT_AMBIGUOUS"]),
    });
  });

  it("allows protected outbound without buying intent but still requires product claims", () => {
    const result = evaluateDeterministicEffectReadinessV1({
      ...base, effect: "PROTECTED_OUTBOUND", buyingIntent: null,
      protectedClaimTypes: ["PRICE"],
    });
    expect(result.outcome).toBe("READY");
    expect(result.buyingIntentHash).toBeNull();
  });

  it("binds protected outbound to the exact protected claim types", () => {
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "PROTECTED_OUTBOUND",
      buyingIntent: null,
      protectedClaimTypes: ["ETA"],
    });
    expect(result.outcome).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("CLAIM_MISSING");
  });

  it("accepts cart-scoped shipping claims once instead of requiring them per product", () => {
    const shipping = ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: "55555555-5555-5555-8555-555555555555",
      type: "SHIPPING_FEE",
      scope: { kind: "CART", cartId: "10000000-0000-4000-8000-000000000001", cartVersion: 2 },
      provenance: {
        authority: "CART_POLICY_V1",
        sourceVersion: "policy:v1",
        evidenceRef: "policy:safe-ref",
        contentHash: hash("f"),
        observedAt: "2026-08-13T02:59:00.000Z",
        expiresAt: "2026-08-13T03:05:00.000Z",
      },
      value: { amountVnd: 30_000, currency: "VND" },
      authorization: "NONE",
    });
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "PROTECTED_OUTBOUND",
      buyingIntent: null,
      cartId: "10000000-0000-4000-8000-000000000001",
      cartVersion: 2,
      claims: [claims[0]!, shipping],
      protectedClaimTypes: ["PRICE", "SHIPPING_FEE"],
    });
    expect(result.outcome).toBe("READY");
  });

  it("requires cart and preview bindings for purchase confirmation", () => {
    const result = evaluateDeterministicEffectReadinessV1({
      ...base, effect: "PURCHASE_CONFIRMATION", buyingIntent: null,
      cartId: null, cartVersion: null, orderPreviewId: null, orderPreviewHash: null,
      deterministicEvidenceHash: hash("f"),
    });
    expect(result.outcome).toBe("BLOCKED");
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["CART_REQUIRED", "ORDER_PREVIEW_REQUIRED"]));
  });
});
