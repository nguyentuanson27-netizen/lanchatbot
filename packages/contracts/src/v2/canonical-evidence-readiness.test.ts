import { describe, expect, it } from "vitest";
import {
  CanonicalBuyingIntentV1Schema,
  CanonicalDialogueEvidenceV1Schema,
  DeterministicEffectReadinessV1Schema,
  ProtectedClaimV1Schema,
} from "./canonical-evidence-readiness.js";

const HASH = "a".repeat(64);
const OTHER_HASH = "b".repeat(64);

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
      cartId: null,
      cartVersion: null,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: OTHER_HASH,
      claimSetHash: HASH,
      checkedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:00:30.000Z",
      reasonCodes: [],
      authorization: "NONE",
    });

    expect(readiness.outcome).toBe("READY");
    expect(readiness.authorization).toBe("NONE");
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
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: OTHER_HASH,
      claimSetHash: HASH,
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
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: null,
      claimSetHash: null,
      checkedAt: "2026-08-13T05:00:00.000Z",
      expiresAt: "2026-08-13T05:00:30.000Z",
      reasonCodes: [],
      authorization: "NONE",
    }).success).toBe(false);
  });
});
