import { describe, expect, it } from "vitest";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type { ProductBindingV2 } from "@lana/contracts";
import {
  buildDf13CommerceRuntimeContext,
  commerceStrategyStage,
} from "./df13-commerce-runtime-context.js";

function state(
  overrides: Partial<SalesCycleRuntimeState> = {},
): SalesCycleRuntimeState {
  return {
    schemaVersion: 2,
    conversationKey: "conversation-1",
    routing: {
      pageId: "1198992073286645",
      conversationId: "conversation-1",
    },
    revision: 4,
    stage: "FACTS_PRESENTED",
    cart: null,
    commerceContext: null,
    negotiation: null,
    checkoutDraft: null,
    preview: null,
    confirmation: null,
    clarification: null,
    processedCommandIds: [],
    updatedAt: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

const productBinding: ProductBindingV2 = {
  schemaVersion: 2,
  contractVersion: "PRODUCT_BINDING_V2",
  status: "RESOLVED",
  productIds: ["DRESS-001"],
  catalogVersion: "catalog-v1",
};

describe("DF13 Commerce runtime context", () => {
  it("derives Context V2 consumer inputs from Commerce state without a legacy salesStage", () => {
    const context = buildDf13CommerceRuntimeContext({
      commerceState: state(),
      productBinding,
      conversationRevision: 12,
      readiness: { outcome: "NOT_EVALUATED", reasonCodes: [] },
    });

    expect(context).toEqual({
      contractVersion: "DF13_COMMERCE_RUNTIME_CONTEXT_V1",
      authority: "COMMERCE",
      commerce: {
        revision: 4,
        stage: "FACTS_PRESENTED",
        hasCart: false,
        hasPreview: false,
        hasConfirmation: false,
        clarificationActive: false,
      },
      contextV2: {
        phase: "PRODUCT_EVALUATION",
        sourceStage: "FACTS_PRESENTED",
        barriers: [],
        productBinding,
        conversationRevision: 12,
      },
    });
    expect(JSON.stringify(context)).not.toContain("salesStage");
  });

  it("maps every Commerce lifecycle stage to the existing strategy contract without reading a regex stage", () => {
    expect(commerceStrategyStage("DISCOVERY")).toBe("DISCOVERY");
    expect(commerceStrategyStage("FACTS_PRESENTED")).toBe("PRODUCT_MATCHED");
    expect(commerceStrategyStage("MEASUREMENTS_REQUIRED")).toBe("FIT_CONSULTING");
    expect(commerceStrategyStage("SIZE_RECOMMENDED")).toBe("FIT_CONSULTING");
    expect(commerceStrategyStage("CART_OPEN")).toBe("READY_TO_BUY");
    expect(commerceStrategyStage("ORDER_PREVIEW")).toBe("ORDER_REVIEW");
    expect(commerceStrategyStage("PURCHASE_CONFIRMED")).toBe("POST_SALE");
    expect(commerceStrategyStage("HANDED_OFF")).toBe("POST_SALE");
  });

  it("fails closed when Commerce state and its canonical artifacts disagree", () => {
    expect(() => buildDf13CommerceRuntimeContext({
      commerceState: state({ stage: "ORDER_PREVIEW" }),
      productBinding,
      conversationRevision: 12,
      readiness: { outcome: "NOT_EVALUATED", reasonCodes: [] },
    })).toThrow("CONVERSATION_PHASE_V2_STATE_INVALID");
  });
});
