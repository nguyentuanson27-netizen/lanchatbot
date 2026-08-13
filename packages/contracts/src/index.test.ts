import { describe, expect, it } from "vitest";
import {
  InboundMessageV1Schema,
  BusinessFactEnvelopeV1Schema,
  GuardedReplyPlanV1Schema,
  AgentSalesSignalsV1Schema,
  MetaOutboxStatusSchema,
  RoutingOwnerSchema,
} from "./index.js";

describe("phase 1 contracts", () => {
  it("keeps routing ownership separate from conversation ownership", () => {
    expect(RoutingOwnerSchema.parse("N8N")).toBe("N8N");
    expect(RoutingOwnerSchema.safeParse("HUMAN").success).toBe(false);
  });

  it("includes AMBIGUOUS as a first-class Meta Outbox state", () => {
    expect(MetaOutboxStatusSchema.parse("AMBIGUOUS")).toBe("AMBIGUOUS");
  });

  it("rejects malformed canonical inbound messages", () => {
    expect(InboundMessageV1Schema.safeParse({ schemaVersion: 1 }).success).toBe(false);
  });

  it("requires guarded Phase-2 reply plans to remain send-disabled", () => {
    const result = GuardedReplyPlanV1Schema.safeParse({
      schemaVersion: 1,
      action: "REPLY",
      textUnits: ["Dạ mẫu này còn ạ"],
      imageUrls: [],
      productId: "SQ149",
      handoffReason: null,
      blockedReasonCodes: [],
      sendAuthorized: true,
    });
    expect(result.success).toBe(false);
  });

  it("keeps legacy guarded plans valid without a claim-validation summary", () => {
    expect(GuardedReplyPlanV1Schema.safeParse({
      schemaVersion: 1,
      action: "REPLY",
      textUnits: ["Dạ mẫu này còn ạ"],
      imageUrls: [],
      productId: "SQ149",
      handoffReason: null,
      blockedReasonCodes: [],
      sendAuthorized: false,
    }).success).toBe(true);
  });

  it("accepts a strict bounded guard claim-validation summary", () => {
    const protectedClaimValidation = {
      outcome: "PARTIALLY_BLOCKED",
      claimTypes: ["PRICE", "PRODUCT_MEDIA"],
      validatedCount: 1,
      rejectedCount: 1,
    } as const;
    const parsed = GuardedReplyPlanV1Schema.parse({
      schemaVersion: 1,
      action: "REPLY",
      textUnits: ["Dạ em gửi thông tin đã kiểm tra ạ"],
      imageUrls: [],
      productId: "SQ149",
      handoffReason: null,
      blockedReasonCodes: ["UNVERIFIED_ATTACHMENT"],
      protectedClaimValidation,
      sendAuthorized: false,
    });

    expect(parsed.protectedClaimValidation).toEqual(protectedClaimValidation);
  });

  it("rejects PII fields, unknown claim types and inconsistent guard counts", () => {
    const plan = {
      schemaVersion: 1,
      action: "REPLY",
      textUnits: ["Dạ em gửi thông tin đã kiểm tra ạ"],
      imageUrls: [],
      productId: "SQ149",
      handoffReason: null,
      blockedReasonCodes: [],
      sendAuthorized: false,
    } as const;
    const invalidSummaries = [
      {
        outcome: "VALIDATED",
        claimTypes: ["PRICE"],
        validatedCount: 1,
        rejectedCount: 0,
        rawText: "SĐT 0900000000",
      },
      {
        outcome: "VALIDATED",
        claimTypes: ["CUSTOMER_PHONE"],
        validatedCount: 1,
        rejectedCount: 0,
      },
      {
        outcome: "NO_PROTECTED_CLAIMS",
        claimTypes: ["PRICE"],
        validatedCount: 0,
        rejectedCount: 0,
      },
      {
        outcome: "VALIDATED",
        claimTypes: ["PRICE", "STOCK"],
        validatedCount: 1,
        rejectedCount: 0,
      },
      {
        outcome: "PARTIALLY_BLOCKED",
        claimTypes: ["PRICE", "STOCK"],
        validatedCount: 2,
        rejectedCount: 0,
      },
      {
        outcome: "BLOCKED",
        claimTypes: ["PRICE"],
        validatedCount: 1,
        rejectedCount: 1,
      },
      {
        outcome: "BLOCKED",
        claimTypes: ["PRICE"],
        validatedCount: 0,
        rejectedCount: 2,
      },
      {
        outcome: "VALIDATED",
        claimTypes: ["PRICE", "PRICE"],
        validatedCount: 2,
        rejectedCount: 0,
      },
    ];

    for (const protectedClaimValidation of invalidSummaries) {
      expect(GuardedReplyPlanV1Schema.safeParse({
        ...plan,
        protectedClaimValidation,
      }).success).toBe(false);
    }
  });

  it("accepts an authoritative product fact envelope", () => {
    expect(
      BusinessFactEnvelopeV1Schema.parse({
        schemaVersion: 1,
        status: "OK",
        source: "POS_SNAPSHOT",
        observedAt: "2026-07-13T00:00:00.000Z",
        expiresAt: "2026-07-13T00:10:00.000Z",
        productId: "SQ149",
        reasonCode: null,
        facts: {
          schemaVersion: 1,
          productId: "SQ149",
          parentProductId: "SQ149",
          offerType: "SET_QUAN",
          listPriceVnd: 699000,
          salePriceVnd: 699000,
          sizes: ["S", "M", "L", "XL"],
          stockStatus: "IN_STOCK",
          stockQuantity: 5,
          deliveryEta: { minDays: 3, maxDays: 4 },
          fulfillmentPolicy: "READY_STOCK",
          imageUrls: ["https://example.com/sq149.jpg"],
        },
      }).facts?.productId,
    ).toBe("SQ149");
  });

  it("requires extracted checkout values to carry matching evidence fields", () => {
    const result = AgentSalesSignalsV1Schema.safeParse({
      checkoutExtraction: {
        fullName: { value: "Lan", evidenceText: null, confidence: 0.99 },
        phone: { value: null, evidenceText: null, confidence: 0 },
        address: { value: null, evidenceText: null, confidence: 0 },
        paymentMethod: { value: null, evidenceText: null, confidence: 0 },
      },
      purchaseConfirmation: {
        decision: "UNCLEAR",
        evidenceText: null,
        confidence: 0,
      },
    });
    expect(result.success).toBe(false);
  });

  it("validates structured buying intent while keeping older signals compatible", () => {
    const base = {
      checkoutExtraction: {
        fullName: { value: null, evidenceText: null, confidence: 0 },
        phone: { value: null, evidenceText: null, confidence: 0 },
        address: { value: null, evidenceText: null, confidence: 0 },
        paymentMethod: { value: null, evidenceText: null, confidence: 0 },
      },
      purchaseConfirmation: {
        decision: "UNCLEAR",
        evidenceText: null,
        confidence: 0,
      },
    } as const;
    expect(AgentSalesSignalsV1Schema.safeParse(base).success).toBe(true);
    expect(AgentSalesSignalsV1Schema.safeParse({
      ...base,
      buyingIntent: {
        decision: "COMMITTED",
        requestedAction: "SET_QUANTITY",
        quantity: 2,
        evidenceText: "cho mình hai cái giống nhau",
        confidence: 0.97,
      },
    }).success).toBe(true);
    expect(AgentSalesSignalsV1Schema.safeParse({
      ...base,
      buyingIntent: {
        decision: "NEGATED",
        requestedAction: "OPEN_CART",
        quantity: 1,
        evidenceText: "không mua",
        confidence: 0.99,
      },
    }).success).toBe(false);
  });
});
