import { describe, expect, it } from "vitest";
import type {
  ContextV2,
  ContextV2CandidateOutputV2,
} from "@lana/contracts";
import { renderTrackCCheckoutSafeReply } from "./track-c-checkout-safe-reply.js";

function context(
  state: "REQUIRED" | "COMPLETE",
  missingFields: readonly ("FULL_NAME" | "PHONE" | "ADDRESS" | "PAYMENT_METHOD")[],
): Pick<ContextV2, "checkoutCompleteness" | "productBinding" | "barriers"> {
  return {
    checkoutCompleteness: {
      schemaVersion: 1,
      contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state,
      missingFields: [...missingFields],
      authority: "SHADOW_ONLY",
      authorization: "NONE",
    },
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
      active: state === "REQUIRED" ? ["CHECKOUT_DETAILS_REQUIRED"] : [],
      lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES",
      conversationRevision: 1,
      salesCycleRevision: 1,
      source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1",
      authority: "SHADOW_ONLY",
    },
  };
}

function output(
  segments: ContextV2CandidateOutputV2["segments"],
): Pick<ContextV2CandidateOutputV2, "segments"> {
  return { segments };
}

describe("renderTrackCCheckoutSafeReply", () => {
  it("renders only canonical missing fields when model prose asks for extra PII", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"]),
      output([{
        kind: "CLARIFICATION",
        text: "Chị gửi em số điện thoại, họ tên, địa chỉ và phương thức thanh toán nhé.",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Em cần đủ toàn bộ thông tin nhận hàng ạ.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["PHONE"],
      }]),
    );

    expect(reply).toContain("số điện thoại");
    expect(reply).not.toContain("họ tên");
    expect(reply).not.toContain("địa chỉ");
    expect(reply).not.toContain("phương thức thanh toán");
  });

  it("renders COMPLETE without exposing a model-authored checkout request", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("COMPLETE", []),
      output([{
        kind: "GENERAL",
        text: "Chị gửi em số điện thoại và địa chỉ nhé.",
      }]),
    );

    expect(reply).toBe("Dạ em đã có đủ thông tin cần thiết để tiếp tục ạ.");
    expect(reply).not.toContain("số điện thoại");
    expect(reply).not.toContain("địa chỉ");
  });
});
