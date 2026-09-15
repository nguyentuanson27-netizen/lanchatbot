import { describe, expect, it } from "vitest";
import type {
  ContextV2,
  ContextV2CandidateOutputV2,
} from "@lana/contracts";
import {
  assertTrackCCanonicalActionPermitted,
  assertTrackCOrdinaryNextMoveSafe,
  renderTrackCCheckoutSafeReply,
} from "./track-c-checkout-safe-reply.js";
import { assertTrackCCheckoutCompletenessOutput } from
  "./track-c-offline-candidate-validation.js";

type TestContext = Pick<
  ContextV2,
  "checkoutCompleteness" | "productBinding" | "barriers" | "phase" | "buyingIntent"
>;

function context(
  state: "REQUIRED" | "COMPLETE",
  missingFields: readonly ("FULL_NAME" | "PHONE" | "ADDRESS" | "PAYMENT_METHOD")[],
  options: Readonly<{
    productStatus?: "RESOLVED" | "UNRESOLVED" | "AMBIGUOUS" | "STALE";
    barriers?: TestContext["barriers"]["active"];
  }> = {},
): TestContext {
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
      decision: "NONE",
      requestedAction: "NONE",
      productId: null,
      evidenceHash: null,
    },
  };
}

function legacyCheckoutContext(): Pick<
  ContextV2,
  "checkoutCompleteness" | "phase" | "buyingIntent"
> {
  return {
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
}

function output(
  segments: ContextV2CandidateOutputV2["segments"],
  strategy: ContextV2CandidateOutputV2["strategy"] = "ASK_CLARIFICATION",
  cta: ContextV2CandidateOutputV2["cta"] = "ASK_CHECKOUT_DETAILS",
): Pick<ContextV2CandidateOutputV2, "segments" | "strategy" | "cta"> {
  return { segments, strategy, cta };
}

describe("renderTrackCCheckoutSafeReply", () => {
  it("renders only canonical missing fields when the model chooses checkout", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"]),
      output([{
        kind: "CLARIFICATION",
        text: "Chị gửi em số điện thoại, họ tên và địa chỉ nhé.",
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
  });

  it("preserves a safe model-chosen product clarification", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"], {
        productStatus: "UNRESOLVED",
        barriers: ["PRODUCT_CONTEXT_UNREADY", "CHECKOUT_DETAILS_REQUIRED"],
      }),
      output([{
        kind: "CLARIFICATION",
        text: "Em cần xác định đúng mẫu chị đang hỏi ạ.",
        target: "PRODUCT",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị cho em biết mẫu sản phẩm nhé.",
        action: "PROVIDE_PRODUCT",
      }], "ASK_CLARIFICATION", "ASK_PRODUCT"),
    );

    expect(reply).toBe(
      "Em cần xác định đúng mẫu chị đang hỏi ạ.\nChị cho em biết mẫu sản phẩm nhé.",
    );
  });

  it("does not derive ASK_PRODUCT from unresolved product state", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("COMPLETE", [], {
        productStatus: "UNRESOLVED",
        barriers: ["PRODUCT_CONTEXT_UNREADY"],
      }),
      output([{
        kind: "GENERAL",
        text: "Dạ chính sách đổi size áp dụng theo điều kiện của shop ạ.",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    );

    expect(reply).toBe("Dạ chính sách đổi size áp dụng theo điều kiện của shop ạ.");
  });

  it("does not derive ASK_MEASUREMENTS from a measurement barrier", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"], {
        barriers: ["MEASUREMENTS_REQUIRED", "CHECKOUT_DETAILS_REQUIRED"],
      }),
      output([{
        kind: "GENERAL",
        text: "Dạ em trả lời đúng phần chính sách chị đang hỏi trước ạ.",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    );

    expect(reply).toBe("Dạ em trả lời đúng phần chính sách chị đang hỏi trước ạ.");
  });

  it("rejects checkout PII hidden inside a non-checkout request", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"], {
        productStatus: "UNRESOLVED",
        barriers: ["PRODUCT_CONTEXT_UNREADY", "CHECKOUT_DETAILS_REQUIRED"],
      }),
      output([{
        kind: "CLARIFICATION",
        text: "Em chưa rõ mẫu chị đang hỏi ạ.",
        target: "PRODUCT",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi tên mẫu, số điện thoại và địa chỉ nhận hàng nhé.",
        action: "PROVIDE_PRODUCT",
      }], "ASK_CLARIFICATION", "ASK_PRODUCT"),
    )).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });

  it("rejects checkout PII hidden inside an ordinary sales question", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"]),
      output([{
        kind: "GENERAL",
        text: "Chị gửi em địa chỉ nhận hàng nhé?",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    )).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });

  it("rejects imperative checkout PII hidden inside ordinary prose", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"]),
      output([{
        kind: "GENERAL",
        text: "Để lại số điện thoại nhé.",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    )).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });

  it("rejects ordinary checkout PII requests before checkout state exists", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      {
        ...legacyCheckoutContext(),
        phase: {
          ...legacyCheckoutContext().phase,
          phase: "DISCOVERY",
          sourceStage: "DISCOVERY",
        },
        buyingIntent: {
          decision: "NONE",
          requestedAction: "NONE",
          productId: null,
          evidenceHash: null,
        },
      },
      output([{
        kind: "GENERAL",
        text: "Chị cho em xin họ tên đầy đủ để em lên đơn nhé?",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    )).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });

  it("allows a factual payment-policy answer without treating it as a request", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"]),
      output([{
        kind: "GENERAL",
        text: "Dạ bên em có hỗ trợ COD và chuyển khoản ạ.",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    );

    expect(reply).toBe("Dạ bên em có hỗ trợ COD và chuyển khoản ạ.");
  });

  it("allows a payment-policy answer followed by a different sales question", () => {
    const reply = renderTrackCCheckoutSafeReply(
      context("REQUIRED", ["PHONE"]),
      output([{
        kind: "GENERAL",
        text: "Dạ bên em có hỗ trợ COD và chuyển khoản ạ. Chị mặc size nào?",
      }], "ANSWER_VERIFIED_FACTS", "NONE"),
    );

    expect(reply).toBe(
      "Dạ bên em có hỗ trợ COD và chuyển khoản ạ. Chị mặc size nào?",
    );
  });

  it("rejects declared checkout when legacy canonical state does not permit it", () => {
    expect(() => renderTrackCCheckoutSafeReply(
      {
        ...legacyCheckoutContext(),
        phase: {
          ...legacyCheckoutContext().phase,
          phase: "DISCOVERY",
          sourceStage: "DISCOVERY",
        },
      },
      output([{
        kind: "CLARIFICATION",
        text: "Em cần thông tin nhận hàng ạ.",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em họ tên, số điện thoại và địa chỉ nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["FULL_NAME", "PHONE", "ADDRESS"],
      }]),
    )).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  });

  it("renders only legacy code-owned checkout fields when that step is permitted", () => {
    const reply = renderTrackCCheckoutSafeReply(
      legacyCheckoutContext(),
      output([{
        kind: "CLARIFICATION",
        text: "Em cần thông tin nhận hàng ạ.",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em họ tên, số điện thoại, địa chỉ và phương thức thanh toán nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["FULL_NAME", "PHONE", "ADDRESS"],
      }]),
    );

    expect(reply).toContain("họ tên");
    expect(reply).toContain("số điện thoại");
    expect(reply).toContain("địa chỉ nhận hàng");
    expect(reply).not.toContain("phương thức thanh toán");
  });
});

describe("Track C model-selected plan constraints", () => {
  it("rejects checkout data in an ordinary nextMove target", () => {
    expect(() => assertTrackCOrdinaryNextMoveSafe({
      action: "ASK",
      target: "PHONE",
    })).toThrow("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
    expect(() => assertTrackCOrdinaryNextMoveSafe({
      action: "ASK",
      target: "SIZE_PREFERENCE",
    })).not.toThrow();
  });

  it("permits ASK_PRODUCT only when product context is unready", () => {
    expect(() => assertTrackCCanonicalActionPermitted(
      context("COMPLETE", []),
      { type: "ASK_PRODUCT", requestedFields: [] },
    )).toThrow("TRACK_C_CANONICAL_ACTION_NOT_PERMITTED");
    expect(() => assertTrackCCanonicalActionPermitted(
      context("COMPLETE", [], {
        productStatus: "UNRESOLVED",
        barriers: ["PRODUCT_CONTEXT_UNREADY"],
      }),
      { type: "ASK_PRODUCT", requestedFields: [] },
    )).not.toThrow();
  });

  it("permits ASK_MEASUREMENTS only when measurements are required", () => {
    expect(() => assertTrackCCanonicalActionPermitted(
      context("COMPLETE", []),
      { type: "ASK_MEASUREMENTS", requestedFields: [] },
    )).toThrow("TRACK_C_CANONICAL_ACTION_NOT_PERMITTED");
    expect(() => assertTrackCCanonicalActionPermitted(
      context("COMPLETE", [], { barriers: ["MEASUREMENTS_REQUIRED"] }),
      { type: "ASK_MEASUREMENTS", requestedFields: [] },
    )).not.toThrow();
  });
});

describe("assertTrackCCheckoutCompletenessOutput", () => {
  it("does not turn checkout completeness into a required conversational action", () => {
    expect(() => assertTrackCCheckoutCompletenessOutput(
      context("REQUIRED", ["PHONE"]) as ContextV2,
      output([{
        kind: "GENERAL",
        text: "Dạ em trả lời phần chị đang hỏi trước ạ.",
      }], "ANSWER_VERIFIED_FACTS", "NONE") as ContextV2CandidateOutputV2,
      "TEST_CHECKOUT_INVALID",
    )).not.toThrow();
  });

  it("still rejects a model-chosen checkout request that widens missing fields", () => {
    expect(() => assertTrackCCheckoutCompletenessOutput(
      context("REQUIRED", ["PHONE"]) as ContextV2,
      output([{
        kind: "CLARIFICATION",
        text: "Em cần thông tin nhận hàng còn thiếu ạ.",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em thông tin còn thiếu nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["PHONE", "ADDRESS"],
      }]) as ContextV2CandidateOutputV2,
      "TEST_CHECKOUT_INVALID",
    )).toThrow("TEST_CHECKOUT_INVALID");
  });

  it("rejects a checkout request when canonical checkout is already complete", () => {
    expect(() => assertTrackCCheckoutCompletenessOutput(
      context("COMPLETE", []) as ContextV2,
      output([{
        kind: "CLARIFICATION",
        text: "Em cần thêm thông tin nhận hàng ạ.",
        target: "CHECKOUT_DETAILS",
      }, {
        kind: "ACTION_REQUEST",
        text: "Chị gửi em số điện thoại nhé.",
        action: "PROVIDE_CHECKOUT_DETAILS",
        requestedFields: ["PHONE"],
      }]) as ContextV2CandidateOutputV2,
      "TEST_CHECKOUT_INVALID",
    )).toThrow("TEST_CHECKOUT_INVALID");
  });
});
