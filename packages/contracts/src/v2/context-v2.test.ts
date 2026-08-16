import { describe, expect, it } from "vitest";
import {
  ContextV2Schema,
  ContextV2CommerceStageSchema,
  deriveConversationPhaseV2,
  deriveConversationBarriersV2,
  type ContextV2,
} from "./context-v2.js";
import { SalesCycleStageV1Schema } from "../v3/sales-cycle.js";

const hash = (character: string): string => character.repeat(64);

describe("DF07 ConversationPhaseV2", () => {
  it("mirrors the canonical commerce-stage vocabulary without importing its authority", () => {
    expect(ContextV2CommerceStageSchema.options)
      .toEqual(SalesCycleStageV1Schema.options);
  });
  it.each([
    ["DISCOVERY", false, false, false, "DISCOVERY"],
    ["FACTS_PRESENTED", false, false, false, "PRODUCT_EVALUATION"],
    ["MEASUREMENTS_REQUIRED", false, false, false, "FIT_CONSULTATION"],
    ["SIZE_RECOMMENDED", false, false, false, "FIT_CONSULTATION"],
    ["CART_OPEN", true, false, false, "CART_ACTIVE"],
    ["ORDER_PREVIEW", true, true, false, "ORDER_REVIEW"],
    ["PURCHASE_CONFIRMED", true, true, true, "ORDER_CONFIRMED"],
  ] as const)(
    "derives %s without consulting a legacy regex or stage writer",
    (commerceStage, hasCart, hasPreview, hasConfirmation, expected) => {
      expect(deriveConversationPhaseV2({
        commerceStage,
        hasCart,
        hasPreview,
        hasConfirmation,
        salesCycleRevision: 7,
      })).toMatchObject({
        contractVersion: "CONVERSATION_PHASE_V2",
        phase: expected,
        source: "CANONICAL_COMMERCE_STATE_V1",
        authority: "SHADOW_ONLY",
      });
    },
  );

  it("keeps order review distinct from order confirmation", () => {
    const review = deriveConversationPhaseV2({
      commerceStage: "ORDER_PREVIEW",
      hasCart: true,
      hasPreview: true,
      hasConfirmation: false,
      salesCycleRevision: 8,
    });
    const confirmed = deriveConversationPhaseV2({
      commerceStage: "PURCHASE_CONFIRMED",
      hasCart: true,
      hasPreview: true,
      hasConfirmation: true,
      salesCycleRevision: 9,
    });
    expect(review.phase).toBe("ORDER_REVIEW");
    expect(confirmed.phase).toBe("ORDER_CONFIRMED");
  });

  it("moves backward when authoritative commerce state moves backward", () => {
    const review = deriveConversationPhaseV2({
      commerceStage: "ORDER_PREVIEW",
      hasCart: true,
      hasPreview: true,
      hasConfirmation: false,
      salesCycleRevision: 10,
    });
    const reopened = deriveConversationPhaseV2({
      commerceStage: "CART_OPEN",
      hasCart: true,
      hasPreview: false,
      hasConfirmation: false,
      salesCycleRevision: 11,
    });
    expect([review.phase, reopened.phase]).toEqual(["ORDER_REVIEW", "CART_ACTIVE"]);
  });

  it("derives the commercial phase from artifacts when handoff owns delivery", () => {
    expect(deriveConversationPhaseV2({
      commerceStage: "HANDED_OFF",
      hasCart: true,
      hasPreview: true,
      hasConfirmation: true,
      salesCycleRevision: 12,
    }).phase).toBe("ORDER_CONFIRMED");
  });

  it("fails closed on impossible artifact combinations", () => {
    expect(() => deriveConversationPhaseV2({
      commerceStage: "ORDER_PREVIEW",
      hasCart: true,
      hasPreview: false,
      hasConfirmation: false,
      salesCycleRevision: 1,
    })).toThrow("CONVERSATION_PHASE_V2_STATE_INVALID");

    expect(() => deriveConversationPhaseV2({
      commerceStage: "FACTS_PRESENTED",
      hasCart: true,
      hasPreview: false,
      hasConfirmation: false,
      salesCycleRevision: 1,
    })).toThrow("CONVERSATION_PHASE_V2_STATE_INVALID");

    expect(() => deriveConversationPhaseV2({
      commerceStage: "HANDED_OFF",
      hasCart: false,
      hasPreview: false,
      hasConfirmation: false,
      salesCycleRevision: 1,
    })).toThrow("CONVERSATION_PHASE_V2_STATE_INVALID");
  });
});

describe("DF08 deterministic finite-lifecycle barriers", () => {
  it("derives barriers only from canonical scope, readiness and commerce state", () => {
    const result = deriveConversationBarriersV2({
      productScope: "AMBIGUOUS",
      commerceStage: "MEASUREMENTS_REQUIRED",
      hasCart: false,
      hasActiveClarification: false,
      readiness: {
        outcome: "BLOCKED",
        reasonCodes: ["CLAIM_MISSING"],
      },
      conversationRevision: 3,
      salesCycleRevision: 2,
    });
    expect(result.active).toEqual([
      "PRODUCT_CONTEXT_UNREADY",
      "VERIFIED_CLAIMS_UNREADY",
      "MEASUREMENTS_REQUIRED",
    ]);
    expect(result.lifecycle).toBe("UNTIL_AUTHORITATIVE_STATE_CHANGES");
    expect(JSON.stringify(result)).not.toMatch(/regex|wave2|salesStage/iu);
  });

  it("resolves barriers when a later authoritative snapshot is ready", () => {
    const blocked = deriveConversationBarriersV2({
      productScope: "UNRESOLVED",
      commerceStage: "CART_OPEN",
      hasCart: false,
      hasActiveClarification: true,
      readiness: { outcome: "BLOCKED", reasonCodes: ["EFFECT_PRODUCT_SCOPE_UNRESOLVED"] },
      conversationRevision: 4,
      salesCycleRevision: 4,
    });
    const resolved = deriveConversationBarriersV2({
      productScope: "RESOLVED",
      commerceStage: "CART_OPEN",
      hasCart: true,
      hasActiveClarification: false,
      readiness: { outcome: "READY", reasonCodes: [] },
      conversationRevision: 5,
      salesCycleRevision: 5,
    });
    expect(blocked.active.length).toBeGreaterThan(0);
    expect(resolved.active).toEqual([]);
  });

  it("does not turn ownership or handoff into a commercial barrier", () => {
    const common = {
      productScope: "RESOLVED" as const,
      commerceStage: "HANDED_OFF" as const,
      hasCart: true,
      hasActiveClarification: false,
      readiness: { outcome: "READY" as const, reasonCodes: [] },
      conversationRevision: 6,
      salesCycleRevision: 6,
    };
    expect(deriveConversationBarriersV2(common).active).toEqual([]);
  });
});

describe("DF09 Context V2 contract", () => {
  it("accepts a PII-free shadow snapshot bound to canonical evidence and readiness", () => {
    const context: ContextV2 = {
      schemaVersion: 2,
      contractVersion: "CONTEXT_V2",
      authority: "SHADOW_ONLY",
      sourceMessageIdHash: hash("a"),
      conversationRevision: 5,
      salesCycleRevision: 3,
      dialogueEvidence: {
        act: "REQUEST",
        confidenceBand: "HIGH",
        evidenceHash: hash("b"),
        reasonCodes: ["DIRECT_PURCHASE_VERB"],
      },
      verifiedClaimSetHash: hash("d"),
      verifiedClaimTypes: ["PRICE", "STOCK"],
      verifiedClaims: [{
        schemaVersion: 1,
        claimId: "00000000-0000-4000-8000-000000000001",
        type: "PRICE",
        scope: { kind: "PRODUCT", productId: "SD398", variantId: null },
        value: { amountVnd: 699_000, currency: "VND" },
        provenance: {
          authority: "POS_SNAPSHOT",
          sourceVersion: "pos:20260816",
          evidenceRef: "fact:price:SD398",
          contentHash: hash("1"),
          observedAt: "2026-08-16T10:00:00.000Z",
          expiresAt: "2026-08-16T10:05:00.000Z",
        },
        authorization: "NONE",
      }, {
        schemaVersion: 1,
        claimId: "00000000-0000-4000-8000-000000000002",
        type: "STOCK",
        scope: { kind: "PRODUCT", productId: "SD398", variantId: null },
        value: { status: "IN_STOCK", availableQuantity: 2 },
        provenance: {
          authority: "POS_SNAPSHOT",
          sourceVersion: "pos:20260816",
          evidenceRef: "fact:stock:SD398",
          contentHash: hash("2"),
          observedAt: "2026-08-16T10:00:00.000Z",
          expiresAt: "2026-08-16T10:05:00.000Z",
        },
        authorization: "NONE",
      }],
      phase: deriveConversationPhaseV2({
        commerceStage: "CART_OPEN",
        hasCart: true,
        hasPreview: false,
        hasConfirmation: false,
        salesCycleRevision: 3,
      }),
      barriers: deriveConversationBarriersV2({
        productScope: "RESOLVED",
        commerceStage: "CART_OPEN",
        hasCart: true,
        hasActiveClarification: false,
        readiness: { outcome: "READY", reasonCodes: [] },
        conversationRevision: 5,
        salesCycleRevision: 3,
      }),
      buyingIntent: {
        decision: "COMMITTED",
        requestedAction: "OPEN_CART",
        productId: "SD398",
        evidenceHash: hash("c"),
      },
      cartReadiness: {
        effect: "CART_READY",
        outcome: "READY",
        readinessHash: hash("e"),
        expiresAt: "2026-08-16T10:01:00.000Z",
      },
      ownership: { owner: "BOT", handoffActive: false, reasonCode: null },
      consumerContractVersions: {
        strategy: "CONTEXT_V2_STRATEGY_INPUT_V1",
        cta: "CONTEXT_V2_CTA_INPUT_V1",
        postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1",
        outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1",
        audit: "CONTEXT_V2_AUDIT_V1",
      },
      contextHash: hash("f"),
    };
    expect(ContextV2Schema.parse(context)).toEqual(context);
    expect(JSON.stringify(context)).not.toMatch(/fullName|phone|address|customerText/iu);
  });
});
