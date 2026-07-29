import { describe, expect, it } from "vitest";
import {
  AcquisitionEventV1Schema,
  AcquisitionSessionV1Schema,
  LeadQualificationStageV1Schema,
} from "./ad-acquisition.js";

describe("ad acquisition contracts", () => {
  it("keeps the lead stages and POS-only conversion boundary explicit", () => {
    expect(LeadQualificationStageV1Schema.parse("PURCHASE_CONFIRMED")).toBe("PURCHASE_CONFIRMED");
    expect(LeadQualificationStageV1Schema.parse("CONVERTED")).toBe("CONVERTED");
    expect(LeadQualificationStageV1Schema.safeParse("ORDER_CREATED").success).toBe(false);
  });

  it("accepts a PII-free causal acquisition event", () => {
    const event = AcquisitionEventV1Schema.parse({
      schemaVersion: 1,
      eventId: "10000000-0000-4000-8000-000000000001",
      eventType: "BOT_INITIAL_AD_REPLY_ACCEPTED",
      acquisitionSessionId: "10000000-0000-4000-8000-000000000002",
      entryMessagePk: "10000000-0000-4000-8000-000000000003",
      triggerMessagePk: "10000000-0000-4000-8000-000000000003",
      replyPlanId: "10000000-0000-4000-8000-000000000004",
      outboxId: "10000000-0000-4000-8000-000000000005",
      salesCycleId: null,
      previousStage: "UNQUALIFIED_ENTRY",
      nextStage: "UNQUALIFIED_ENTRY",
      previousDisposition: "ACTIVE",
      nextDisposition: "ACTIVE",
      qualifyingLabels: [],
      derivationVersion: "ad-acquisition-v1",
      occurredAt: "2026-07-29T10:00:00.000Z",
    });
    expect(JSON.stringify(event)).not.toContain("customerId");
  });

  it("keeps orderCreatedAt nullable until the deferred POS acknowledgement task", () => {
    const base = {
      schemaVersion: 1 as const,
      acquisitionSessionId: "10000000-0000-4000-8000-000000000002",
      pageId: "page-1",
      conversationId: "10000000-0000-4000-8000-000000000006",
      entryMessagePk: "10000000-0000-4000-8000-000000000003",
      entryMessageOccurredAt: "2026-07-29T10:00:00.000Z",
      entrySource: "META_ADS_CONFIRMED" as const,
      evidenceStrength: "WEAK_ENTRY" as const,
      attributionExpiresAt: "2026-08-05T10:00:00.000Z",
      salesCycleId: null,
      initialReplyPlanId: null,
      initialOutboxId: null,
      initialReplyAcceptedAt: null,
      initialReplyTerminalStatus: null,
      initialReplyFailedAt: null,
      initialReplyDeliveredAt: null,
      initialReplyReadAt: null,
      reengagedAt: null,
      meaningfulAt: null,
      qualifiedAt: null,
      buyingCandidateAt: null,
      committedAt: null,
      purchaseConfirmedAt: null,
      orderCreatedAt: null,
      maxStageReached: "UNQUALIFIED_ENTRY" as const,
      currentDisposition: "ACTIVE" as const,
      firstMeaningfulLabel: null,
      firstBarrier: null,
      firstPlaybook: null,
      derivationVersion: "ad-acquisition-v1",
    };
    expect(AcquisitionSessionV1Schema.parse(base).orderCreatedAt).toBeNull();
  });
});
