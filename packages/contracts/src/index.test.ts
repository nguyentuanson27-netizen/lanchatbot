import { describe, expect, it } from "vitest";
import {
  InboundMessageV1Schema,
  BusinessFactEnvelopeV1Schema,
  GuardedReplyPlanV1Schema,
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
});
