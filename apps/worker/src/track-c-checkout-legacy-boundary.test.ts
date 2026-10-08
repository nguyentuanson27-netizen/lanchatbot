import { describe, expect, it } from "vitest";
import type { ContextV2, ContextV2CandidateOutputV2 } from "@lana/contracts";
import { renderTrackCCheckoutSafeReply } from "./track-c-checkout-safe-reply.js";

const legacyContext: Pick<
  ContextV2,
  "checkoutCompleteness" | "phase" | "buyingIntent"
> = {
  checkoutCompleteness: null,
  phase: {
    schemaVersion: 2,
    contractVersion: "CONVERSATION_PHASE_V2",
    phase: "ORDER_REVIEW",
    source: "CANONICAL_COMMERCE_STATE_V1",
    sourceStage: "ORDER_PREVIEW",
    salesCycleRevision: 1,
    authority: "SHADOW_ONLY",
  },
  buyingIntent: {
    decision: "COMMITTED",
    requestedAction: "PROCEED_TO_PAYMENT",
    productId: "SQ9012",
    evidenceHash: "a".repeat(64),
  },
};

type CheckoutField = "FULL_NAME" | "PHONE" | "ADDRESS" | "PAYMENT_METHOD";

function checkoutOutput(
  requestedFields: readonly CheckoutField[],
): Pick<ContextV2CandidateOutputV2, "segments" | "strategy" | "cta"> {
  return {
    segments: [{
      kind: "CLARIFICATION",
      text: "Em cần thông tin nhận hàng ạ.",
      target: "CHECKOUT_DETAILS",
    }, {
      kind: "ACTION_REQUEST",
      text: "Chị gửi em thông tin nhận hàng nhé.",
      action: "PROVIDE_CHECKOUT_DETAILS",
      requestedFields: [...requestedFields],
    }],
    strategy: "ASK_CLARIFICATION",
    cta: "ASK_CHECKOUT_DETAILS",
  };
}

describe("Track C legacy checkout boundary", () => {
  it("rejects a legacy checkout request whose declared fields do not match the permitted set", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      legacyContext,
      checkoutOutput(["PHONE"]),
    )).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });
});
