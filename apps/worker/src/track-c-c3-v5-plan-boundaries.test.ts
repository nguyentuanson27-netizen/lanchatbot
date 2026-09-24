import { describe, expect, it } from "vitest";
import type { ContextV2, ContextV2CandidateOutputV2 } from "@lana/contracts";
import {
  assertTrackCCanonicalActionPermitted,
  assertTrackCOrdinaryNextMoveSafe,
  renderTrackCCheckoutSafeReply,
  trackCCanonicalActionConstraints,
} from "./track-c-checkout-safe-reply.js";

type ConstraintContext = Pick<
  ContextV2,
  | "checkoutCompleteness"
  | "productBinding"
  | "barriers"
  | "phase"
  | "buyingIntent"
>;

function context(
  overrides: Partial<ConstraintContext> = {},
): ConstraintContext {
  return {
    checkoutCompleteness: null,
    productBinding: {
      schemaVersion: 2,
      contractVersion: "PRODUCT_BINDING_V2",
      status: "RESOLVED",
      productIds: ["SQ9012"],
      catalogVersion: "test",
    },
    barriers: {
      schemaVersion: 2,
      contractVersion: "CONVERSATION_BARRIERS_V2",
      active: [],
      lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES",
      conversationRevision: 1,
      salesCycleRevision: 1,
      source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1",
      authority: "SHADOW_ONLY",
    },
    phase: {
      schemaVersion: 2,
      contractVersion: "CONVERSATION_PHASE_V2",
      phase: "DISCOVERY",
      source: "CANONICAL_COMMERCE_STATE_V1",
      sourceStage: "DISCOVERY",
      salesCycleRevision: 1,
      authority: "SHADOW_ONLY",
    },
    buyingIntent: {
      decision: "CONSIDERING",
      requestedAction: "NONE",
      productId: "SQ9012",
      evidenceHash: "a".repeat(64),
    },
    ...overrides,
  };
}

function output(
  text: string,
): Pick<ContextV2CandidateOutputV2, "segments" | "strategy" | "cta"> {
  return {
    segments: [{ kind: "GENERAL", text }],
    strategy: "ANSWER_VERIFIED_FACTS",
    cta: "NONE",
  };
}

describe("Track C V5 model/code boundaries", () => {
  it("allows payment preference as an ordinary commercial next move", () => {
    expect(() => assertTrackCOrdinaryNextMoveSafe({
      action: "ASK",
      target: "preferred payment method: COD or bank transfer",
    })).not.toThrow();
  });

  it.each([
    "địa chỉ shop ở đâu",
    "địa chỉ cửa hàng",
    "địa chỉ của shop",
    "shop address",
    "store address",
    "Shop ở Hà Nội địa chỉ đâu em?",
  ])("allows shop address as an ordinary commercial next move: %s", (target) => {
    expect(() => assertTrackCOrdinaryNextMoveSafe({
      action: "ASK",
      target,
    })).not.toThrow();
  });

  it.each([
    "địa chỉ giao hàng",
    "địa chỉ của chị",
    "địa chỉ của chị có gần store không?",
    "Chị cho em địa chỉ của chị gần cửa hàng nhé",
    "delivery address",
    "shop address and your address",
  ])("keeps recipient address behind the checkout PII boundary: %s", (target) => {
    expect(() => assertTrackCOrdinaryNextMoveSafe({
      action: "ASK",
      target,
    })).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });

  it("allows shop-address wording in a non-checkout final reply", () => {
    expect(renderTrackCCheckoutSafeReply(
      context(),
      output("Chị muốn em gửi địa chỉ shop không ạ?"),
    )).toBe("Chị muốn em gửi địa chỉ shop không ạ?");
  });

  it("does not let shop-address wording mask a recipient-address request", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      context(),
      output("Chị cho em địa chỉ shop và địa chỉ của chị nhé?"),
    )).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });

  it("rejects invalid canonical checkout selection at the code boundary", () => {
    expect(() => assertTrackCCanonicalActionPermitted(context(), {
      type: "ASK_CHECKOUT_DETAILS",
      requestedFields: ["PHONE"],
    })).toThrow("TRACK_C_CANONICAL_ACTION_NOT_PERMITTED");
  });

  it("does not infer nextMove cardinality from conjunctions in free text", () => {
    expect(() => assertTrackCOrdinaryNextMoveSafe({
      action: "ASK",
      target: "size or color preference",
    })).not.toThrow();
  });

  it("exposes canonical permissions without choosing an action", () => {
    const constraints = trackCCanonicalActionConstraints(context({
      checkoutCompleteness: {
        schemaVersion: 1,
        contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
        state: "REQUIRED",
        missingFields: ["PHONE"],
        source: "CANONICAL_COMMERCE_STATE_V1",
        salesCycleRevision: 1,
        authority: "SHADOW_ONLY",
        authorization: "NONE",
      },
      productBinding: {
        schemaVersion: 2,
        contractVersion: "PRODUCT_BINDING_V2",
        status: "UNRESOLVED",
        productIds: [],
        catalogVersion: null,
      },
      barriers: {
        ...context().barriers,
        active: ["PRODUCT_CONTEXT_UNREADY", "CHECKOUT_DETAILS_REQUIRED"],
      },
    }));

    expect(constraints.allowedTypes).toEqual([
      "NONE",
      "ASK_PRODUCT",
      "ASK_CHECKOUT_DETAILS",
    ]);
    expect(constraints.checkoutRequestedFields).toEqual(["PHONE"]);
  });

  it.each([
    "Dạ em gửi chị ảnh asset_sq9012_front ạ.",
    "Mẫu này có giá là CLAIM_001 ạ.",
  ])("rejects internal identifiers in customer-facing text: %s", (text) => {
    expect(() => renderTrackCCheckoutSafeReply(
      context(),
      output(text),
    )).toThrow("TRACK_C_INTERNAL_TOKEN_LEAK");
  });

  it("rejects text that claims a media-send effect happened", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      context(),
      output("Dạ em gửi chị hình ảnh mẫu này ạ."),
    )).toThrow("TRACK_C_UNAUTHORIZED_EFFECT_CLAIM");
  });
});
