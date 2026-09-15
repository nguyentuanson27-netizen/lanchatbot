import { describe, expect, it } from "vitest";
import type {
  ContextV2,
  ContextV2CandidateOutputV2,
} from "@lana/contracts";
import { renderTrackCCheckoutSafeReply } from "./track-c-checkout-safe-reply.js";

function context(
  state: "REQUIRED" | "COMPLETE",
  missingFields: readonly ("FULL_NAME" | "PHONE" | "ADDRESS" | "PAYMENT_METHOD")[],
  options: Readonly<{
    productStatus?: "RESOLVED" | "UNRESOLVED" | "AMBIGUOUS" | "STALE";
    barriers?: readonly string[];
  }> = {},
): Pick<ContextV2, "checkoutCompleteness" | "productBinding" | "barriers"> {
  return {
    checkoutCompleteness: {
      schemaVersion: 1,
      contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
      state,
      missingFields: [...missingFields],
      source: "CANONICAL_COMMERCE_STATE_V1",
      salesCycleRevision: 1,
      authority: "SHADOW_ONLY",
      authorization: "NONE",
    },
    productBinding: {
      schemaVersion: 2,
      contractVersion: "PRODUCT_BINDING_V2",
      status: options.productStatus ?? "RESOLVED",
      productIds: options.productStatus === "UNRESOLVED" ? [] : ["SQ9012"],
      catalogVersion: "test",
    },
    barriers: {
      schemaVersion: 2,
      contractVersion: "CONVERSATION_BARRIERS_V2",
      active: options.barriers ??
        (state === "REQUIRED" ? ["CHECKOUT_DETAILS_REQUIRED"] : []),
      lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES",
      conversationRevision: 1,
      salesCycleRevision: 1,
      source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1",
      authority: "SHADOW_ONLY",
    },
  } as Pick<ContextV2, "checkoutCompleteness" | "productBinding" | "barriers">;
}

function output(
  segments: ContextV2CandidateOutputV2["segments"],
  strategy: ContextV2CandidateOutputV2["strategy"] = "ASK_CLARIFICATION",
  cta: ContextV2CandidateOutputV2["cta"] = "ASK_CHECKOUT_DETAILS",
): Pick<ContextV2CandidateOutputV2, "segments" | "strategy" | "cta"> {
  return { segments, strategy, cta };
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
      }], "HOLD_POSITION", "NONE"),
    );

    expect(reply).toBe("Dạ em đã có đủ thông tin cần thiết để tiếp tục ạ.");
    expect(reply).not.toContain("số điện thoại");
    expect(reply).not.toContain("địa chỉ");
  });

  it("renders canonical labels for all missing fields in order", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["FULL_NAME", "PHONE", "ADDRESS", "PAYMENT_METHOD"]),
      output([]),
    );

    expect(reply).toBe(
      "Em cần thêm thông tin nhận hàng còn thiếu để tiếp tục ạ.\nChị cho em xin họ tên, số điện thoại, địa chỉ nhận hàng và phương thức thanh toán nhé.",
    );
  });

  it("renders deferred product clarification without model-authored checkout PII", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"], {
        productStatus: "UNRESOLVED",
        barriers: ["PRODUCT_CONTEXT_UNREADY", "CHECKOUT_DETAILS_REQUIRED"],
      }),
      output([{
        kind: "CLARIFICATION",
        text: "Em chưa rõ mẫu, chị gửi em số điện thoại và địa chỉ luôn nhé.",
        target: "PRODUCT",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi tên mẫu, số điện thoại và địa chỉ nhận hàng nhé.",
        action: "PROVIDE_PRODUCT",
      }], "ASK_CLARIFICATION", "ASK_PRODUCT"),
    );

    expect(reply).toContain("mẫu sản phẩm");
    expect(reply).not.toContain("số điện thoại");
    expect(reply).not.toContain("địa chỉ");
  });

  it("renders deferred measurement clarification without model-authored checkout PII", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"], {
        barriers: ["MEASUREMENTS_REQUIRED", "CHECKOUT_DETAILS_REQUIRED"],
      }),
      output([{
        kind: "CLARIFICATION",
        text: "Em cần cân nặng, số điện thoại và địa chỉ nhận hàng ạ.",
        target: "MEASUREMENTS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em cân nặng, số điện thoại và địa chỉ nhé.",
        action: "PROVIDE_MEASUREMENTS",
      }], "ASK_CLARIFICATION", "ASK_MEASUREMENTS"),
    );

    expect(reply).toContain("số đo còn thiếu");
    expect(reply).not.toContain("số điện thoại");
    expect(reply).not.toContain("địa chỉ");
  });

  it("rejects a missing product clarification required by canonical state", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      context("COMPLETE", [], {
        productStatus: "UNRESOLVED",
        barriers: ["PRODUCT_CONTEXT_UNREADY"],
      }),
      output([{
        kind: "GENERAL",
        text: "Dạ em nắm rồi chị ạ.",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    )).toThrow("TRACK_C_CANONICAL_REQUEST_OUTPUT_INVALID");
  });

  it("rejects a missing measurement clarification required by canonical state", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      context("COMPLETE", [], {
        barriers: ["MEASUREMENTS_REQUIRED"],
      }),
      output([{
        kind: "GENERAL",
        text: "Dạ em nắm rồi chị ạ.",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    )).toThrow("TRACK_C_CANONICAL_REQUEST_OUTPUT_INVALID");
  });
});
