import { describe, expect, it } from "vitest";
import {
  canonicalizeReadinessProductIdsV1,
  CanonicalBuyingIntentV1Schema,
  CanonicalDialogueEvidenceV1Schema,
  DeterministicCartMutationEvidenceV1Schema,
  DeterministicConfirmationEvidenceV1Schema,
  DeterministicEffectReadinessV1Schema,
  MAX_READINESS_PRODUCT_IDS_V1,
  ProtectedClaimV1Schema,
  validateCartEffectClaimSemanticsV1,
  validateEffectClaimSemanticsV1,
  type ProtectedClaimV1,
} from "./canonical-evidence-readiness.js";

const HASH = "a".repeat(64);
const OTHER_HASH = "b".repeat(64);

function productClaim(
  type: "PRICE" | "STOCK" | "ETA",
  productId: string,
  contentHash = OTHER_HASH,
): ProtectedClaimV1 {
  const value = type === "PRICE"
    ? { amountVnd: 1250000, currency: "VND" as const }
    : type === "STOCK"
      ? { status: "IN_STOCK" as const, availableQuantity: 3 }
      : { minDays: 2, maxDays: 4 };
  return ProtectedClaimV1Schema.parse({
    schemaVersion: 1,
    claimId: type === "PRICE"
      ? "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e361"
      : type === "STOCK"
        ? "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e362"
        : "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e363",
    type,
    scope: { kind: "PRODUCT", productId, variantId: null },
    provenance: {
      authority: "POS_LIVE",
      sourceVersion: "version-1",
      evidenceRef: `opaque:${type}:${productId}`,
      contentHash,
      observedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:05:00.000Z",
    },
    value,
    authorization: "NONE",
  });
}

describe("DF05 canonical evidence contracts", () => {
  it("keeps dialogue evidence observational and separate from buying intent", () => {
    const evidence = CanonicalDialogueEvidenceV1Schema.parse({
      schemaVersion: 1,
      contractVersion: "CANONICAL_DIALOGUE_EVIDENCE_V1",
      act: "CONFIRMATION",
      contributors: ["DETERMINISTIC_RUNTIME", "MODEL_STRUCTURED_OUTPUT"],
      confidenceBand: "HIGH",
      sourceMessageIdHash: HASH,
      evidenceHash: OTHER_HASH,
      reasonCodes: ["DIRECT_PURCHASE_VERB"],
      authorization: "NONE",
    });

    expect(evidence.authorization).toBe("NONE");
    expect(evidence).not.toHaveProperty("requestedAction");
    expect(CanonicalDialogueEvidenceV1Schema.safeParse({
      ...evidence,
      requestedAction: "OPEN_CART",
    }).success).toBe(false);
  });

  it("makes canonical buying intent observational rather than effect authority", () => {
    const intent = CanonicalBuyingIntentV1Schema.parse({
      schemaVersion: 1,
      authorityVersion: "CANONICAL_BUYING_INTENT_V1",
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: 2,
      productId: "SP-001",
      contributors: ["DETERMINISTIC_RUNTIME"],
      sourceMessageIdHash: HASH,
      evidenceHash: OTHER_HASH,
      reasonCodes: ["DIRECT_PURCHASE_VERB"],
      evaluatedAt: "2026-08-13T05:00:00.000Z",
      authorization: "NONE",
    });

    expect(intent.authorization).toBe("NONE");
    expect(CanonicalBuyingIntentV1Schema.safeParse({
      ...intent,
      authorization: "CART_OPEN",
    }).success).toBe(false);
  });

  it("does not allow non-committed intent to carry action, quantity, or product scope", () => {
    expect(CanonicalBuyingIntentV1Schema.safeParse({
      schemaVersion: 1,
      authorityVersion: "CANONICAL_BUYING_INTENT_V1",
      decision: "CONSIDERING",
      requestedAction: "OPEN_CART",
      quantity: null,
      productId: "SP-001",
      contributors: ["MODEL_STRUCTURED_OUTPUT"],
      sourceMessageIdHash: HASH,
      evidenceHash: OTHER_HASH,
      reasonCodes: ["MODEL_BUYING_COMMITTED"],
      evaluatedAt: "2026-08-13T05:00:00.000Z",
      authorization: "NONE",
    }).success).toBe(false);
  });

  it("keeps committed intent observable when product scope is unresolved", () => {
    expect(CanonicalBuyingIntentV1Schema.parse({
      schemaVersion: 1,
      authorityVersion: "CANONICAL_BUYING_INTENT_V1",
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: null,
      productId: null,
      contributors: ["DETERMINISTIC_RUNTIME"],
      sourceMessageIdHash: HASH,
      evidenceHash: OTHER_HASH,
      reasonCodes: ["DIRECT_PURCHASE_VERB"],
      evaluatedAt: "2026-08-13T05:00:00.000Z",
      authorization: "NONE",
    }).productId).toBeNull();
  });

  it.each([
    ["PRICE", "POS_LIVE", { kind: "PRODUCT", productId: "SP-001", variantId: null }, { amountVnd: 1250000, currency: "VND" }],
    ["STOCK", "POS_LIVE", { kind: "PRODUCT", productId: "SP-001", variantId: "VAR-001" }, { status: "IN_STOCK", availableQuantity: 3 }],
    ["SIZE_FIT", "VERIFIED_SIZE_ENGINE_V1", { kind: "PRODUCT", productId: "SP-001", variantId: "VAR-001" }, {
      recommendedSizes: ["M"],
      alternativeSizes: [],
      customerProfileId: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e361",
      customerProfileRevision: 2,
      measurementFingerprint: HASH,
      evidenceBasis: "MEASUREMENTS",
    }],
    ["ETA", "POS_LIVE", { kind: "PRODUCT", productId: "SP-001", variantId: null }, { minDays: 2, maxDays: 4 }],
    ["SHIPPING_FEE", "CART_POLICY_V1", { kind: "CART", cartId: "cart-001", cartVersion: 2 }, { amountVnd: 30000, currency: "VND" }],
    ["FREESHIP", "CART_POLICY_V1", { kind: "CART", cartId: "cart-001", cartVersion: 2 }, { eligible: true }],
    ["PROMOTION_OFFER", "CART_POLICY_V1", { kind: "CART", cartId: "cart-001", cartVersion: 2 }, { adjustmentId: "adj-001", amountVnd: 50000 }],
    ["PRODUCT_MEDIA", "MEDIA_SELECTOR_V2", { kind: "PRODUCT", productId: "SP-001", variantId: null }, { assetId: "asset-001", assetSha256: HASH }],
  ] as const)("accepts typed %s provenance", (type, authority, scope, value) => {
    expect(ProtectedClaimV1Schema.parse({
      schemaVersion: 1,
      claimId: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e362",
      type,
      scope,
      provenance: {
        authority,
        sourceVersion: "version-1",
        evidenceRef: "opaque:evidence:1",
        contentHash: OTHER_HASH,
        observedAt: "2026-08-13T05:00:00.000Z",
        expiresAt: "2026-08-13T05:05:00.000Z",
      },
      value,
      authorization: "NONE",
    }).authorization).toBe("NONE");
  });

  it("rejects model provenance for a protected claim", () => {
    expect(ProtectedClaimV1Schema.safeParse({
      schemaVersion: 1,
      claimId: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e362",
      type: "PRICE",
      scope: { kind: "PRODUCT", productId: "SP-001", variantId: null },
      provenance: {
        authority: "MODEL_STRUCTURED_OUTPUT",
        sourceVersion: "model-1",
        evidenceRef: "opaque:model:1",
        contentHash: OTHER_HASH,
        observedAt: "2026-08-13T05:00:00.000Z",
        expiresAt: "2026-08-13T05:05:00.000Z",
      },
      value: { amountVnd: 1250000, currency: "VND" },
      authorization: "NONE",
    }).success).toBe(false);
  });
});

describe("DF06 deterministic readiness contract", () => {
  it("keeps the technical readiness envelope separate from cart capacity", () => {
    expect(MAX_READINESS_PRODUCT_IDS_V1).toBeGreaterThan(50);
  });

  it.each([
    [0, 0, true, false],
    [1, 1, false, false],
    [3, 3, false, false],
    [4, 4, false, false],
    [10, 10, false, false],
    [11, 11, false, false],
    [49, 49, false, false],
    [50, 50, false, false],
    [51, 51, false, false],
  ] as const)(
    "canonicalizes product count %i without applying cart-capacity policy",
    (count, expectedCount, unresolved, invalid) => {
      const input = Array.from({ length: count }, (_, index) => `P-${String(index).padStart(3, "0")}`);
      const first = canonicalizeReadinessProductIdsV1(input);
      const second = canonicalizeReadinessProductIdsV1(input);

      expect(first).toEqual(second);
      expect(first.productIds).toHaveLength(expectedCount);
      expect(first.productIds.length).toBeLessThanOrEqual(MAX_READINESS_PRODUCT_IDS_V1);
      expect(first.unresolved).toBe(unresolved);
      expect(first.invalid).toBe(invalid);
    },
  );

  it.each([
    [[null, "P-001"]],
    [[17, "P-001"]],
    [["", "P-001"]],
    [["   ", "P-001"]],
    [["X".repeat(129), "P-001"]],
    [[" P-001 "]],
    [["P-001", "P-001"]],
  ] as const)("blocks malformed, normalized, or duplicate product IDs at the choke point", (input) => {
    expect(() => canonicalizeReadinessProductIdsV1(input)).not.toThrow();
    const result = canonicalizeReadinessProductIdsV1(input);
    expect(result.invalid).toBe(true);
    expect(result.productIds.length).toBeLessThanOrEqual(MAX_READINESS_PRODUCT_IDS_V1);
  });

  it.each([null, undefined, 17, {}, "P-001"])(
    "turns a malformed product-ID container into bounded unresolved input",
    (input) => {
      expect(canonicalizeReadinessProductIdsV1(input)).toEqual({
        productIds: [],
        unresolved: true,
        invalid: true,
      });
    },
  );

  it("stays bounded and deterministic across broad cardinalities and malformed mixtures", () => {
    for (const count of [...Array.from({ length: 65 }, (_, index) => index), 100, 1001]) {
      const valid = Array.from({ length: count }, (_, index) => `P-${String(index).padStart(4, "0")}`);
      const input: unknown[] = [...valid, null, "", " P-0000 ", "P-0000"];
      const result = canonicalizeReadinessProductIdsV1(input);
      expect(result).toEqual(canonicalizeReadinessProductIdsV1(input));
      expect(result.productIds.length).toBeLessThanOrEqual(MAX_READINESS_PRODUCT_IDS_V1);
      expect(result.invalid).toBe(true);
    }
  });

  it("rejects an oversized hostile product scope before reading individual entries", () => {
    let reads = 0;
    const hostile = new Proxy(
      Array.from({ length: MAX_READINESS_PRODUCT_IDS_V1 + 1 }, (_, index) => `P-${index}`),
      {
        get(target, property, receiver) {
          if (typeof property === "string" && /^\d+$/u.test(property)) reads += 1;
          return Reflect.get(target, property, receiver);
        },
      },
    );

    expect(canonicalizeReadinessProductIdsV1(hostile)).toEqual({
      productIds: [],
      unresolved: true,
      invalid: true,
    });
    expect(reads).toBe(0);
  });

  it.each([
    ["CART_OPEN", ["PRICE", "STOCK"]],
    ["CART_MUTATION", ["PRICE", "STOCK"]],
    ["ORDER_PREVIEW", ["PRICE", "STOCK", "ETA"]],
    ["PURCHASE_CONFIRMATION", ["PRICE", "STOCK", "ETA"]],
  ] as const)("enforces complete per-product claim coverage for %s", (effect, requiredTypes) => {
    const productIds = ["P-001", "P-002"];
    const complete = productIds.flatMap((productId) =>
      requiredTypes.map((type) => productClaim(type, productId))
    );
    expect(validateEffectClaimSemanticsV1({
      effect,
      productIds,
      cartId: null,
      cartVersion: null,
      claims: complete,
    })).toEqual({ missing: false, conflict: false });
    expect(validateEffectClaimSemanticsV1({
      effect,
      productIds,
      cartId: "cart-1",
      cartVersion: 2,
      claims: complete.slice(0, -1),
    }).missing).toBe(true);
  });

  it("detects conflicting protected claims through the shared semantic guard", () => {
    expect(validateEffectClaimSemanticsV1({
      effect: "CART_MUTATION",
      productIds: ["P-001"],
      cartId: "cart-1",
      cartVersion: 2,
      claims: [
        productClaim("PRICE", "P-001", HASH),
        productClaim("PRICE", "P-001", OTHER_HASH),
        productClaim("STOCK", "P-001"),
      ],
    }).conflict).toBe(true);
  });

  it("requires exact offer-scoped cart claims with matching price and orderable stock", () => {
    const line = {
      parentProductId: "P-001",
      offerId: "SET",
      quantity: 2,
      posUnitPriceVnd: 699_000,
      priceFactRef: "price:P-001:SET:v1",
    } as const;
    const exact: ProtectedClaimV1[] = [
      ProtectedClaimV1Schema.parse({
        ...productClaim("PRICE", "P-001"),
        scope: { kind: "PRODUCT" as const, productId: "P-001", variantId: "SET" },
        provenance: {
          ...productClaim("PRICE", "P-001").provenance,
          sourceVersion: line.priceFactRef,
        },
        value: { amountVnd: line.posUnitPriceVnd, currency: "VND" as const },
      }),
      ProtectedClaimV1Schema.parse({
        ...productClaim("STOCK", "P-001"),
        scope: { kind: "PRODUCT" as const, productId: "P-001", variantId: "SET" },
        value: { status: "IN_STOCK" as const, availableQuantity: 3 },
      }),
      ProtectedClaimV1Schema.parse({
        ...productClaim("ETA", "P-001"),
        scope: { kind: "PRODUCT" as const, productId: "P-001", variantId: "SET" },
      }),
    ];

    expect(validateCartEffectClaimSemanticsV1({
      effect: "ORDER_PREVIEW",
      lines: [line],
      claims: exact,
    })).toEqual({ missing: false, conflict: false, mismatch: false });
    expect(validateCartEffectClaimSemanticsV1({
      effect: "ORDER_PREVIEW",
      lines: [line],
      claims: exact.map((claim) => ProtectedClaimV1Schema.parse({
        ...claim,
        scope: { ...claim.scope, variantId: "WRONG-OFFER" },
      })),
    }).mismatch).toBe(true);
    expect(validateCartEffectClaimSemanticsV1({
      effect: "ORDER_PREVIEW",
      lines: [line],
      claims: exact.map((claim) => ProtectedClaimV1Schema.parse(claim.type === "PRICE"
        ? { ...claim, value: { amountVnd: 1, currency: "VND" as const } }
        : claim)),
    }).mismatch).toBe(true);
    expect(validateCartEffectClaimSemanticsV1({
      effect: "ORDER_PREVIEW",
      lines: [line],
      claims: exact.map((claim) => ProtectedClaimV1Schema.parse(claim.type === "STOCK"
        ? { ...claim, value: { status: "IN_STOCK" as const, availableQuantity: 1 } }
        : claim)),
    }).mismatch).toBe(true);
    expect(validateCartEffectClaimSemanticsV1({
      effect: "ORDER_PREVIEW",
      lines: [line],
      claims: exact.map((claim) => ProtectedClaimV1Schema.parse(claim.type === "STOCK"
        ? { ...claim, value: { status: "PRE_ORDER" as const, availableQuantity: 0 } }
        : claim)),
    }).mismatch).toBe(false);
    expect(validateCartEffectClaimSemanticsV1({
      effect: "ORDER_PREVIEW",
      lines: [line, { ...line, quantity: 2 }],
      claims: exact,
    }).mismatch).toBe(true);
  });

  it("keeps purchase confirmation evidence deterministic, typed, and non-authorizing", () => {
    const evidence = DeterministicConfirmationEvidenceV1Schema.parse({
      schemaVersion: 1,
      authorityVersion: "DETERMINISTIC_CONFIRMATION_EVIDENCE_V1",
      classifierVersion: "LEGACY_CONFIRMATION_V1",
      decision: "CONFIRM",
      reasonCode: "CONFIRMATION_DETERMINISTIC_MATCH",
      sourceMessageIdHash: HASH,
      evidenceHash: OTHER_HASH,
      evaluatedAt: "2026-08-13T05:00:00.000Z",
      authorization: "NONE",
    });

    expect(evidence.authorization).toBe("NONE");
    expect(DeterministicConfirmationEvidenceV1Schema.safeParse({
      ...evidence,
      classifierVersion: "MODEL_STRUCTURED_OUTPUT",
    }).success).toBe(false);
  });

  it("binds a ready effect to message, state, product, cart and claim revisions", () => {
    const readiness = DeterministicEffectReadinessV1Schema.parse({
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "CART_OPEN",
      outcome: "READY",
      pageId: "page-1",
      conversationId: "conversation-1",
      sourceMessageIdHash: HASH,
      conversationRevision: 7,
      salesCycleRevision: 3,
      productIds: ["SP-001"],
      cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
      cartVersion: 1,
      cartStateHash: HASH,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: OTHER_HASH,
      deterministicEvidenceHash: null,
      claimSetHash: HASH,
      binding: {
        schemaVersion: 1,
        contractVersion: "EFFECT_BINDING_V1",
        pageId: "page-1",
        conversationId: "conversation-1",
        sourceMessageIdHash: HASH,
        conversationRevision: 7,
        salesCycleRevision: 3,
        productIds: ["SP-001"],
        cart: {
          cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
          cartRevision: 1,
          cartStateHash: HASH,
          offerBindings: [{
            lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
            productId: "SP-001",
            offerId: "SP-001-DIRECT",
            quantity: 1,
            unitPriceVnd: 1_250_000,
          priceFactRef: "price-fact-v1",
          }],
        },
        preview: null,
        claimSetHash: HASH,
        parentReadinessHash: null,
        payloadHash: null,
      },
      bindingHash: OTHER_HASH,
      readinessHash: HASH,
      protectedClaimTypes: [],
      checkedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:00:30.000Z",
      reasonCodes: [],
      authorization: "NONE",
    });

    expect(readiness.outcome).toBe("READY");
    expect(readiness.authorization).toBe("NONE");
  });

  it("rejects READY cart effects without an exact final-cart state hash", () => {
    const parsed = DeterministicEffectReadinessV1Schema.safeParse({
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "CART_MUTATION",
      outcome: "READY",
      pageId: "page-1",
      conversationId: "conversation-1",
      sourceMessageIdHash: HASH,
      conversationRevision: 7,
      salesCycleRevision: 3,
      productIds: ["SP-001"],
      cartId: null,
      cartVersion: null,
      cartStateHash: null,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: OTHER_HASH,
      deterministicEvidenceHash: OTHER_HASH,
      claimSetHash: HASH,
      protectedClaimTypes: [],
      checkedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:00:30.000Z",
      reasonCodes: [],
      authorization: "NONE",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts only deterministic typed cart-mutation evidence", () => {
    const evidence = {
      schemaVersion: 1,
      authorityVersion: "DETERMINISTIC_CART_MUTATION_EVIDENCE_V1",
      action: "SET_QUANTITY",
      authorityKind: "CANONICAL_BUYING_INTENT",
      authorityEvidenceHash: OTHER_HASH,
      mutation: {
        kind: "SET_QUANTITY",
        lineId: "3f4c7f35-3ac1-4bb1-a398-1f6fc5b6e364",
        quantity: 2,
      },
      mutationPayloadHash: HASH,
      sourceMessageIdHash: HASH,
      commandIdHash: OTHER_HASH,
      beforeCartStateHash: HASH,
      afterCartStateHash: OTHER_HASH,
      evidenceHash: HASH,
      evaluatedAt: "2026-08-13T05:00:00.000Z",
      contributor: "DETERMINISTIC_RUNTIME",
      authorization: "NONE",
    } as const;

    expect(DeterministicCartMutationEvidenceV1Schema.parse(evidence).authorization)
      .toBe("NONE");
    expect(DeterministicCartMutationEvidenceV1Schema.safeParse({
      ...evidence,
      contributor: "MODEL_STRUCTURED_OUTPUT",
    }).success).toBe(false);
    expect(DeterministicCartMutationEvidenceV1Schema.safeParse({
      ...evidence,
      authorityKind: "DETERMINISTIC_REMOVE_CLASSIFIER",
      action: "SET_QUANTITY",
    }).success).toBe(false);
    expect(DeterministicCartMutationEvidenceV1Schema.safeParse({
      ...evidence,
      afterCartStateHash: evidence.beforeCartStateHash,
    }).success).toBe(false);
  });

  it("supports payload-only protected outbound readiness with a deterministic hash", () => {
    expect(DeterministicEffectReadinessV1Schema.parse({
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "PROTECTED_OUTBOUND",
      outcome: "READY",
      pageId: "page-1",
      conversationId: "conversation-1",
      sourceMessageIdHash: HASH,
      conversationRevision: 7,
      salesCycleRevision: 3,
      productIds: ["SP-001"],
      cartId: null,
      cartVersion: null,
      cartStateHash: null,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: null,
      deterministicEvidenceHash: HASH,
      claimSetHash: null,
      binding: {
        schemaVersion: 1,
        contractVersion: "EFFECT_BINDING_V1",
        pageId: "page-1",
        conversationId: "conversation-1",
        sourceMessageIdHash: HASH,
        conversationRevision: 7,
        salesCycleRevision: 3,
        productIds: ["SP-001"],
        cart: null,
        preview: null,
        claimSetHash: null,
        parentReadinessHash: null,
        payloadHash: HASH,
      },
      bindingHash: OTHER_HASH,
      readinessHash: HASH,
      protectedClaimTypes: [],
      checkedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:00:30.000Z",
      reasonCodes: [],
      authorization: "NONE",
    }).deterministicEvidenceHash).toBe(HASH);
  });

  it("requires order bindings for purchase confirmation", () => {
    expect(DeterministicEffectReadinessV1Schema.safeParse({
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "PURCHASE_CONFIRMATION",
      outcome: "READY",
      pageId: "page-1",
      conversationId: "conversation-1",
      sourceMessageIdHash: HASH,
      conversationRevision: 7,
      salesCycleRevision: 3,
      productIds: ["SP-001"],
      cartId: null,
      cartVersion: null,
      cartStateHash: null,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: OTHER_HASH,
      deterministicEvidenceHash: HASH,
      claimSetHash: HASH,
      protectedClaimTypes: [],
      checkedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:00:30.000Z",
      reasonCodes: [],
      authorization: "NONE",
    }).success).toBe(false);
  });

  it("requires blocked readiness to carry bounded deterministic reasons", () => {
    expect(DeterministicEffectReadinessV1Schema.safeParse({
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "CART_OPEN",
      outcome: "BLOCKED",
      pageId: "page-1",
      conversationId: "conversation-1",
      sourceMessageIdHash: HASH,
      conversationRevision: 7,
      salesCycleRevision: 3,
      productIds: [],
      cartId: null,
      cartVersion: null,
      cartStateHash: null,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: null,
      deterministicEvidenceHash: null,
      claimSetHash: null,
      protectedClaimTypes: [],
      checkedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:00:30.000Z",
      reasonCodes: [],
      authorization: "NONE",
    }).success).toBe(false);
  });
});
