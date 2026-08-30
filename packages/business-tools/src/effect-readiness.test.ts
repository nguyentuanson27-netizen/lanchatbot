import { describe, expect, it } from "vitest";
import {
  CanonicalBuyingIntentV1Schema,
  MAX_EFFECT_READINESS_LIFETIME_MS_V1,
  ProtectedClaimV1Schema,
  type CartLineV1,
} from "@lana/contracts";
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
const scope = {
  kind: "PRODUCT" as const,
  productId: "product-1",
  variantId: "product-1-DIRECT",
};
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
const cartId = "10000000-0000-4000-8000-000000000001";
function cartLinesFor(productIds: readonly string[]): CartLineV1[] {
  return productIds.map((productId, index) => ({
    lineId: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    parentProductId: productId,
    offerId: `${productId}-DIRECT`,
    offerKind: "DIRECT",
    quantity: 1,
    components: [{
      componentProductId: productId,
      componentSku: `${productId}-M`,
      componentRole: "OTHER",
      color: null,
      size: "M",
      quantity: 1,
    }],
    allowMixedSizes: false,
    allowComponentSale: true,
    posUnitPriceVnd: 120_000,
    priceAuthority: {
      priceFactRef: "pos:PRICE:7",
      shopId: "shop-1",
      parentProductId: productId,
      offerId: `${productId}-DIRECT`,
      offerPriceKind: "DIRECT",
      componentProductId: null,
      metadata: {
        authority: "PANCAKE_POS",
        sourceVersion: "pos:PRICE:7",
        observedAt: "2026-08-13T02:59:00.000Z",
        expiresAt: "2026-08-15T02:59:00.000Z",
        freshForSeconds: 172_800,
        freshnessState: "FRESH",
      },
    },
    lineTotalVnd: 120_000,
  }));
}
const base = {
  effect: "CART_OPEN" as const,
  pageId: "page-1", conversationId: "conversation-1",
  sourceMessageIdHash: hash("d"), conversationRevision: 8,
  salesCycleRevision: 2, productIds: ["product-1"],
  cartId, cartVersion: 1, orderPreviewId: null, orderPreviewHash: null,
  cartStateHash: hash("f"),
  cartLines: cartLinesFor(["product-1"]),
  buyingIntent: intent, claims, checkedAt: now,
};
const { cartLines: _baseCartLines, ...baseWithoutCartLines } = base;

function claimsFor(productIds: readonly string[]) {
  return productIds.flatMap((productId, index) => ([
    ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: `10000000-0000-5000-8000-${String(index * 2 + 1).padStart(12, "0")}`,
      type: "PRICE",
      scope: { kind: "PRODUCT", productId, variantId: `${productId}-DIRECT` },
      provenance: provenance("PRICE"),
      value: { amountVnd: 120_000, currency: "VND" },
      authorization: "NONE",
    }),
    ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: `20000000-0000-5000-8000-${String(index * 2 + 2).padStart(12, "0")}`,
      type: "STOCK",
      scope: { kind: "PRODUCT", productId, variantId: `${productId}-DIRECT` },
      provenance: provenance("STOCK"),
      value: { status: "IN_STOCK", availableQuantity: 4 },
      authorization: "NONE",
    }),
  ]));
}

describe("deterministic effect readiness", () => {
  it.each([
    [0, "BLOCKED", "PRODUCT_UNRESOLVED"],
    [1, "READY", null],
    [3, "READY", null],
    [4, "READY", null],
    [10, "READY", null],
    [11, "READY", null],
    [49, "READY", null],
    [50, "READY", null],
    [51, "BLOCKED", "CART_CAPACITY_EXCEEDED"],
  ] as const)("evaluates product-count boundary %i without throwing", (count, outcome, reason) => {
    const productIds = Array.from({ length: count }, (_, index) =>
      `product-${String(index).padStart(3, "0")}`
    );
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      productIds,
      cartId,
      cartVersion: 2,
      cartLines: cartLinesFor(productIds),
      mutationAction: "REMOVE_LINE",
      deterministicEvidenceHash: hash("f"),
      claims: claimsFor(productIds),
    });
    expect(result.outcome).toBe(outcome);
    expect(result.productIds.length).toBe(count);
    if (reason !== null) expect(result.reasonCodes).toContain(reason);
  });

  it("authorizes nothing while producing a fresh READY binding for a verified cart open", () => {
    const result = evaluateDeterministicEffectReadinessV1(base);
    expect(result.outcome).toBe("READY");
    expect(result.authorization).toBe("NONE");
    expect(result.buyingIntentHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.claimSetHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(Date.parse(result.expiresAt) - now.getTime())
      .toBe(MAX_EFFECT_READINESS_LIFETIME_MS_V1);
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

  it.each(["SET_QUANTITY", "PROCEED_TO_PAYMENT"] as const)(
    "blocks a %s request from authorizing CART_OPEN",
    (requestedAction) => {
      const result = evaluateDeterministicEffectReadinessV1({
        ...base,
        buyingIntent: CanonicalBuyingIntentV1Schema.parse({
          ...intent,
          requestedAction,
          contributors: ["DETERMINISTIC_RUNTIME", "MODEL_STRUCTURED_OUTPUT"],
          reasonCodes: ["DIRECT_PURCHASE_VERB", "MODEL_BUYING_COMMITTED"],
        }),
      });

      expect(result.outcome).toBe("BLOCKED");
      expect(result.reasonCodes).toContain("BUYING_INTENT_SCOPE_MISMATCH");
      expect(result.authorization).toBe("NONE");
    },
  );

  it("blocks model-only authority for add or quantity cart mutations", () => {
    const modelOnly = CanonicalBuyingIntentV1Schema.parse({
      ...intent,
      requestedAction: "ADD_TO_CART",
      contributors: ["MODEL_STRUCTURED_OUTPUT"],
      reasonCodes: ["MODEL_BUYING_COMMITTED"],
    });
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      cartId,
      cartVersion: 2,
      cartLines: cartLinesFor(["product-1"]),
      mutationAction: "ADD_LINE",
      deterministicEvidenceHash: hash("f"),
      buyingIntent: modelOnly,
    });
    expect(result.outcome).toBe("BLOCKED");
    expect(result.reasonCodes).toContain("BUYING_INTENT_MISSING");
    const wrongAction = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      cartId,
      cartVersion: 2,
      cartLines: cartLinesFor(["product-1"]),
      mutationAction: "SET_QUANTITY",
      deterministicEvidenceHash: hash("f"),
      buyingIntent: CanonicalBuyingIntentV1Schema.parse({
        ...intent,
        requestedAction: "ADD_TO_CART",
      }),
    });
    expect(wrongAction.outcome).toBe("BLOCKED");
    expect(wrongAction.reasonCodes).toContain("BUYING_INTENT_SCOPE_MISMATCH");

    const hybridGenericAction = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      cartId,
      cartVersion: 2,
      cartLines: cartLinesFor(["product-1"]),
      mutationAction: "SET_QUANTITY",
      deterministicEvidenceHash: hash("f"),
      buyingIntent: CanonicalBuyingIntentV1Schema.parse({
        ...intent,
        requestedAction: "OPEN_CART",
        contributors: ["DETERMINISTIC_RUNTIME", "MODEL_STRUCTURED_OUTPUT"],
        reasonCodes: ["DIRECT_PURCHASE_VERB", "MODEL_BUYING_COMMITTED"],
      }),
    });
    expect(hybridGenericAction.outcome).toBe("BLOCKED");
    expect(hybridGenericAction.reasonCodes).toContain("BUYING_INTENT_SCOPE_MISMATCH");
  });

  it("allows deterministic removal authority without buying intent", () => {
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      cartId,
      cartVersion: 2,
      cartLines: cartLinesFor(["product-1"]),
      mutationAction: "REMOVE_LINE",
      deterministicEvidenceHash: hash("f"),
      buyingIntent: null,
    });
    expect(result.outcome).toBe("READY");
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

  it("keeps a fourth distinct cart product eligible when all deterministic facts are ready", () => {
    const productIds = ["product-1", "product-2", "product-3", "product-4"];
    const result = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      productIds,
      cartId,
      cartVersion: 2,
      cartLines: cartLinesFor(productIds),
      mutationAction: "ADD_LINE",
      deterministicEvidenceHash: hash("f"),
      claims: claimsFor(productIds),
    });

    expect(result.outcome).toBe("READY");
    expect(result.productIds).toEqual(productIds);
    expect(result.reasonCodes).toEqual([]);
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
      reasonCodes: expect.arrayContaining(["OFFER_BINDING_MISMATCH"]),
    });

    const overCapacity = evaluateDeterministicEffectReadinessV1({
      ...base,
      effect: "CART_MUTATION",
      productIds: [...fiftyProductIds, "product-51"],
      deterministicEvidenceHash: hash("f"),
    });
    expect(overCapacity.outcome).toBe("BLOCKED");
    expect(overCapacity.productIds).toHaveLength(51);
    expect(overCapacity.reasonCodes).toContain("CART_CAPACITY_EXCEEDED");

    for (const invalidId of ["", "   ", "x".repeat(129)]) {
      const invalid = evaluateDeterministicEffectReadinessV1({
        ...base,
        effect: "CART_MUTATION",
        productIds: [...fiftyProductIds, invalidId],
        deterministicEvidenceHash: hash("f"),
      });
      expect(invalid.outcome).toBe("BLOCKED");
      expect(invalid.productIds).toHaveLength(50);
      expect(invalid.reasonCodes).toContain("PRODUCT_SCOPE_INVALID");
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
      reasonCodes: expect.arrayContaining(["PRODUCT_SCOPE_INVALID"]),
    });
  });

  it.each([null, undefined, 17, {}, "product-1"])(
    "turns malformed runtime product-ID containers into a controlled block",
    (productIds) => {
      expect(() => evaluateDeterministicEffectReadinessV1({
        ...base,
        effect: "CART_MUTATION",
        productIds: productIds as unknown as readonly string[],
        deterministicEvidenceHash: hash("f"),
      })).not.toThrow();
      expect(evaluateDeterministicEffectReadinessV1({
        ...base,
        effect: "CART_MUTATION",
        productIds: productIds as unknown as readonly string[],
        deterministicEvidenceHash: hash("f"),
      })).toMatchObject({
        outcome: "BLOCKED",
        productIds: [],
        reasonCodes: expect.arrayContaining(["PRODUCT_SCOPE_INVALID", "PRODUCT_UNRESOLVED"]),
      });
    },
  );

  it("bounds hostile mixed and oversized product-ID arrays without throwing", () => {
    const hostileInputs: readonly unknown[] = [
      ["product-1", Symbol("id"), 1n, null, undefined, true, {}, []],
      [...Array.from({ length: 1_001 }, (_, index) => `product-${index}`), ""],
      ["product-1", " product-1 ", "product-1".normalize("NFD")],
    ];
    for (const productIds of hostileInputs) {
      const evaluate = () => evaluateDeterministicEffectReadinessV1({
        ...base,
        effect: "CART_MUTATION",
        productIds: productIds as readonly string[],
        deterministicEvidenceHash: hash("f"),
      });
      expect(evaluate).not.toThrow();
      expect(evaluate()).toMatchObject({
        outcome: "BLOCKED",
        reasonCodes: expect.arrayContaining(["PRODUCT_SCOPE_INVALID"]),
      });
      expect(evaluate().productIds.length).toBeLessThanOrEqual(1_000);
    }
  });

  it("allows protected outbound without buying intent but still requires product claims", () => {
    const result = evaluateDeterministicEffectReadinessV1({
      ...baseWithoutCartLines, effect: "PROTECTED_OUTBOUND", buyingIntent: null,
      cartId: null, cartVersion: null, cartStateHash: null,
      protectedClaimTypes: ["PRICE"],
    });
    expect(result.outcome).toBe("READY");
    expect(result.buyingIntentHash).toBeNull();
  });

  it("does not reuse cart capacity for protected-text aggregation", () => {
    const productIds = Array.from(
      { length: 51 },
      (_, index) => `product-${String(index).padStart(3, "0")}`,
    );
    const result = evaluateDeterministicEffectReadinessV1({
      ...baseWithoutCartLines,
      effect: "PROTECTED_OUTBOUND",
      buyingIntent: null,
      productIds,
      cartId: null,
      cartVersion: null,
      cartStateHash: null,
      claims: claimsFor(productIds),
      protectedClaimTypes: ["PRICE", "STOCK"],
    });

    expect(result).toMatchObject({ outcome: "READY", productIds });
    expect(result.reasonCodes).not.toContain("CART_CAPACITY_EXCEEDED");
  });

  it("binds protected outbound to the exact protected claim types", () => {
    const result = evaluateDeterministicEffectReadinessV1({
      ...baseWithoutCartLines,
      effect: "PROTECTED_OUTBOUND",
      buyingIntent: null,
      cartId: null, cartVersion: null, cartStateHash: null,
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
      cartLines: cartLinesFor(["product-1"]),
      parentReadinessHash: hash("e"),
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
