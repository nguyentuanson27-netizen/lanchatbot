import { describe, expect, it } from "vitest";
import {
  CanonicalCheckoutCompletenessV1Schema,
  deriveCanonicalCheckoutCompletenessV1,
} from "./checkout-completeness.js";

describe("canonical checkout completeness", () => {
  it("projects only missing recipient fields from canonical commerce state", () => {
    const result = deriveCanonicalCheckoutCompletenessV1({
      commerceStage: "CART_OPEN",
      hasCart: true,
      hasPreview: false,
      hasCheckoutDraft: true,
      checkoutClarificationActive: true,
      recipientFields: {
        fullNamePresent: true,
        phonePresent: false,
        addressPresent: true,
      },
      salesCycleRevision: 7,
    });

    expect(result).toEqual({
      schemaVersion: 1,
      contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state: "REQUIRED",
      missingFields: ["PHONE"],
      source: "CANONICAL_COMMERCE_STATE_V1",
      salesCycleRevision: 7,
      authority: "SHADOW_ONLY",
      authorization: "NONE",
    });
    expect(JSON.stringify(result)).not.toMatch(/fullNamePresent|phonePresent|addressPresent/iu);
  });

  it("uses an authoritative order preview as proof that recipient details are complete", () => {
    expect(deriveCanonicalCheckoutCompletenessV1({
      commerceStage: "ORDER_PREVIEW",
      hasCart: true,
      hasPreview: true,
      hasCheckoutDraft: false,
      checkoutClarificationActive: false,
      recipientFields: {
        fullNamePresent: false,
        phonePresent: false,
        addressPresent: false,
      },
      salesCycleRevision: 8,
    })).toMatchObject({
      state: "COMPLETE",
      missingFields: [],
      salesCycleRevision: 8,
    });
  });

  it("stays absent before checkout and rejects contradictory states", () => {
    expect(deriveCanonicalCheckoutCompletenessV1({
      commerceStage: "FACTS_PRESENTED",
      hasCart: false,
      hasPreview: false,
      hasCheckoutDraft: false,
      checkoutClarificationActive: false,
      recipientFields: {
        fullNamePresent: false,
        phonePresent: false,
        addressPresent: false,
      },
      salesCycleRevision: 2,
    })).toBeNull();

    expect(deriveCanonicalCheckoutCompletenessV1({
      commerceStage: "CART_OPEN",
      hasCart: true,
      hasPreview: false,
      hasCheckoutDraft: false,
      checkoutClarificationActive: false,
      recipientFields: {
        fullNamePresent: false,
        phonePresent: false,
        addressPresent: false,
      },
      salesCycleRevision: 3,
    })).toBeNull();

    expect(() => CanonicalCheckoutCompletenessV1Schema.parse({
      schemaVersion: 1,
      contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state: "COMPLETE",
      missingFields: ["PHONE"],
      source: "CANONICAL_COMMERCE_STATE_V1",
      salesCycleRevision: 8,
      authority: "SHADOW_ONLY",
      authorization: "NONE",
    })).toThrow();
  });
});
