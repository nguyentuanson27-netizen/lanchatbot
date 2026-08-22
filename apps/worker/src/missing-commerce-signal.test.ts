import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CanonicalBuyingIntentV1Schema,
  canonicalJsonV1,
  type CanonicalBuyingIntentV1,
} from "@lana/contracts";
import {
  evaluateMissingCommerceSignal,
  type CommerceReadinessCandidate,
} from "./missing-commerce-signal.js";

const hash = (character: string): string => character.repeat(64);

function buyingIntent(
  overrides: Partial<CanonicalBuyingIntentV1> = {},
): CanonicalBuyingIntentV1 {
  return CanonicalBuyingIntentV1Schema.parse({
    schemaVersion: 1,
    authorityVersion: "CANONICAL_BUYING_INTENT_V1",
    decision: "COMMITTED",
    requestedAction: "OPEN_CART",
    quantity: null,
    productId: "CB182",
    contributors: ["DETERMINISTIC_RUNTIME"],
    sourceMessageIdHash: hash("a"),
    evidenceHash: hash("b"),
    reasonCodes: ["DIRECT_PURCHASE_VERB"],
    evaluatedAt: "2026-08-22T00:00:00.000Z",
    authorization: "NONE",
    ...overrides,
  });
}

function commerceCandidate(
  overrides: Partial<CommerceReadinessCandidate> = {},
): CommerceReadinessCandidate {
  return {
    scope: { pageId: "1198992073286645", conversationId: "conversation-1" },
    revision: 4,
    canonicalContent: {
      buyingIntent: buyingIntent(),
      stage: "CART_OPEN",
      productBinding: {
        schemaVersion: 2,
        contractVersion: "PRODUCT_BINDING_V2",
        status: "RESOLVED",
        productIds: ["CB182"],
        catalogVersion: "catalog-v1",
      },
      hasCart: true,
      hasOrderPreview: false,
      hasPurchaseConfirmation: false,
    },
    ...overrides,
  };
}

function fingerprint(value: object): string {
  return createHash("sha256")
    .update(`COMMERCE_READINESS_CANONICAL_CONTENT_V1\n${canonicalJsonV1(value)}`, "utf8")
    .digest("hex");
}

describe("DF12 missing-commerce signal", () => {
  it("is disabled by default and cannot change authority or authorize an action", () => {
    expect(evaluateMissingCommerceSignal({
      buyingIntent: buyingIntent(),
      commerce: null,
    })).toEqual({
      contractVersion: "MISSING_COMMERCE_SIGNAL_V1",
      status: "DISABLED",
      activeAuthority: "LEGACY",
      candidateAuthority: "COMMERCE",
      sideEffects: "DISABLED",
      futureCommerceDisposition: "NOT_EVALUATED",
      canonicalIntentFingerprint: null,
      commerceContentFingerprint: null,
      reasonCodes: [],
    });
  });

  it("blocks future COMMERCE authority when committed canonical intent has no commerce state", () => {
    const intent = buyingIntent();

    expect(evaluateMissingCommerceSignal({ enabled: true, buyingIntent: intent, commerce: null }))
      .toEqual({
        contractVersion: "MISSING_COMMERCE_SIGNAL_V1",
        status: "MISSING_COMMERCE_STATE",
        activeAuthority: "LEGACY",
        candidateAuthority: "COMMERCE",
        sideEffects: "DISABLED",
        futureCommerceDisposition: "BLOCK_COMMERCE_CUTOVER",
        canonicalIntentFingerprint: fingerprint(intent),
        commerceContentFingerprint: null,
        reasonCodes: ["MISSING_COMMERCE_STATE_FOR_COMMITTED_INTENT"],
      });
  });

  it("re-derives the canonical intent fingerprint instead of copying evidence hashes", () => {
    const initial = buyingIntent();
    const changed = buyingIntent({ evaluatedAt: "2026-08-22T00:01:00.000Z" });

    const initialSignal = evaluateMissingCommerceSignal({
      enabled: true,
      buyingIntent: initial,
      commerce: null,
    });
    const changedSignal = evaluateMissingCommerceSignal({
      enabled: true,
      buyingIntent: changed,
      commerce: null,
    });

    expect(initialSignal.canonicalIntentFingerprint).toBe(fingerprint(initial));
    expect(initialSignal.canonicalIntentFingerprint).not.toBe(initial.evidenceHash);
    expect(changedSignal.canonicalIntentFingerprint).toBe(fingerprint(changed));
    expect(changedSignal.canonicalIntentFingerprint).not.toBe(
      initialSignal.canonicalIntentFingerprint,
    );
  });

  it("does not raise a missing-commerce signal for a canonical intent that is not committed", () => {
    const intent = buyingIntent({
      decision: "CONSIDERING",
      requestedAction: "NONE",
      quantity: null,
      productId: null,
    });

    expect(evaluateMissingCommerceSignal({ enabled: true, buyingIntent: intent, commerce: null }))
      .toMatchObject({
        status: "NOT_COMMITTED",
        activeAuthority: "LEGACY",
        sideEffects: "DISABLED",
        futureCommerceDisposition: "NOT_REQUIRED",
        reasonCodes: ["CANONICAL_INTENT_NOT_COMMITTED"],
      });
  });

  it("records a present commerce projection through a re-derived canonical content fingerprint", () => {
    const commerce = commerceCandidate();

    expect(evaluateMissingCommerceSignal({
      enabled: true,
      buyingIntent: buyingIntent(),
      commerce,
    })).toEqual({
      contractVersion: "MISSING_COMMERCE_SIGNAL_V1",
      status: "COMMERCE_STATE_PRESENT",
      activeAuthority: "LEGACY",
      candidateAuthority: "COMMERCE",
      sideEffects: "DISABLED",
      futureCommerceDisposition: "SATISFIED",
      canonicalIntentFingerprint: fingerprint(buyingIntent()),
      commerceContentFingerprint: fingerprint(commerce),
      reasonCodes: ["COMMERCE_STATE_PRESENT"],
    });
  });

  it("fails closed when canonical buying-intent evidence is malformed", () => {
    expect(evaluateMissingCommerceSignal({
      enabled: true,
      buyingIntent: { decision: "COMMITTED" },
      commerce: commerceCandidate(),
    })).toEqual({
      contractVersion: "MISSING_COMMERCE_SIGNAL_V1",
      status: "INVALID_CANONICAL_INTENT",
      activeAuthority: "LEGACY",
      candidateAuthority: "COMMERCE",
      sideEffects: "DISABLED",
      futureCommerceDisposition: "BLOCK_COMMERCE_CUTOVER",
      canonicalIntentFingerprint: null,
      commerceContentFingerprint: null,
      reasonCodes: ["CANONICAL_BUYING_INTENT_INVALID"],
    });
  });

  it("fails closed when the supplied commerce projection cannot be validated", () => {
    expect(evaluateMissingCommerceSignal({
      enabled: true,
      buyingIntent: buyingIntent(),
      commerce: { revision: -1, canonicalContent: { stage: "INVALID" } },
    })).toMatchObject({
      status: "INVALID_COMMERCE_STATE",
      activeAuthority: "LEGACY",
      sideEffects: "DISABLED",
      futureCommerceDisposition: "BLOCK_COMMERCE_CUTOVER",
      reasonCodes: ["COMMERCE_STATE_INVALID"],
    });
  });

  it("fails closed when the commerce state was built from a stale canonical intent", () => {
    const commerce = commerceCandidate({
      canonicalContent: {
        ...commerceCandidate().canonicalContent,
        buyingIntent: buyingIntent({ evaluatedAt: "2026-08-22T00:01:00.000Z" }),
      },
    });

    expect(evaluateMissingCommerceSignal({
      enabled: true,
      buyingIntent: buyingIntent(),
      commerce,
    })).toMatchObject({
      status: "STALE_COMMERCE_STATE",
      activeAuthority: "LEGACY",
      sideEffects: "DISABLED",
      futureCommerceDisposition: "BLOCK_COMMERCE_CUTOVER",
      commerceContentFingerprint: fingerprint(commerce),
      reasonCodes: ["COMMERCE_STATE_INTENT_FINGERPRINT_MISMATCH"],
    });
  });

  it("fails closed when a commerce projection carries stale product binding", () => {
    const commerce = commerceCandidate({
      canonicalContent: {
        ...commerceCandidate().canonicalContent,
        productBinding: {
          schemaVersion: 2,
          contractVersion: "PRODUCT_BINDING_V2",
          status: "STALE",
          productIds: ["CB182"],
          catalogVersion: "catalog-v1",
        },
      },
    });

    expect(evaluateMissingCommerceSignal({
      enabled: true,
      buyingIntent: buyingIntent(),
      commerce,
    })).toMatchObject({
      status: "STALE_COMMERCE_STATE",
      activeAuthority: "LEGACY",
      sideEffects: "DISABLED",
      futureCommerceDisposition: "BLOCK_COMMERCE_CUTOVER",
      commerceContentFingerprint: fingerprint(commerce),
      reasonCodes: ["COMMERCE_PRODUCT_BINDING_UNREADY"],
    });
  });
});
