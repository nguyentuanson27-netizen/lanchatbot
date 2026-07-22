import { describe, expect, it } from "vitest";
import {
  FunnelEventV1Schema,
  HandoffDecisionV2Schema,
  SalesEpisodeV1Schema,
} from "./handoff-sales-funnel.js";

const HASH = `sha256:${"a".repeat(64)}`;
const OTHER_HASH = `sha256:${"b".repeat(64)}`;

const evidence = {
  source: "VERIFIED_PANCAKE_TAG" as const,
  tag: "DA_CHOT_DON" as const,
  verified: true as const,
  observationId: "7fc79b6c-8dce-4b56-9787-82a8a2cce5a1",
  observedAt: "2026-07-22T04:00:00.000Z",
};

const provenance = {
  decisionSource: "DETERMINISTIC_RULE_ENGINE" as const,
  rulesetVersion: "handoff-2026-07-22",
  evidence: [
    {
      source: "INBOUND_MESSAGE" as const,
      referenceHash: HASH,
      observedAt: "2026-07-22T03:59:59.000Z",
    },
  ],
};

describe("HandoffDecisionV2", () => {
  it("requires one holding reply and VAN_DON for after-sales", () => {
    expect(
      HandoffDecisionV2Schema.parse({
        schemaVersion: 2,
        decisionId: "56c33819-5c44-4d90-a592-d8fd0901571d",
        category: "AFTER_SALES",
        reason: "DELIVERY_TRACKING",
        customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF",
        customerMessages: ["Em đã chuyển bộ phận vận đơn kiểm tra giúp mình ạ."],
        tag: "VAN_DON",
        provenance,
        decidedAt: "2026-07-22T04:00:00.000Z",
      }).tag,
    ).toBe("VAN_DON");
  });

  it.each([
    { customerMessagePolicy: "SILENT_HANDOFF", customerMessages: [] },
    {
      customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF",
      customerMessages: [],
    },
  ])("rejects after-sales without its one holding reply", (override) => {
    expect(
      HandoffDecisionV2Schema.safeParse({
        schemaVersion: 2,
        decisionId: "56c33819-5c44-4d90-a592-d8fd0901571d",
        category: "AFTER_SALES",
        reason: "AFTER_SALES_REQUEST",
        tag: "VAN_DON",
        provenance,
        decidedAt: "2026-07-22T04:00:00.000Z",
        ...override,
      }).success,
    ).toBe(false);
  });

  it("requires silent NHAN_VIEN handoff for every non-after-sales category", () => {
    const base = {
      schemaVersion: 2,
      decisionId: "56c33819-5c44-4d90-a592-d8fd0901571d",
      category: "BUSINESS_FACT_UNAVAILABLE",
      reason: "PRICE_UNAVAILABLE",
      customerMessagePolicy: "SILENT_HANDOFF",
      customerMessages: [],
      tag: "NHAN_VIEN",
      provenance,
      decidedAt: "2026-07-22T04:00:00.000Z",
    } as const;

    expect(HandoffDecisionV2Schema.safeParse(base).success).toBe(true);
    expect(
      HandoffDecisionV2Schema.safeParse({
        ...base,
        customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF",
        customerMessages: ["Em kiểm tra giúp mình ạ."],
      }).success,
    ).toBe(false);
    expect(
      HandoffDecisionV2Schema.safeParse({ ...base, tag: "VAN_DON" }).success,
    ).toBe(false);
  });

  it("is strict and rejects fields that could bypass the policy", () => {
    expect(
      HandoffDecisionV2Schema.safeParse({
        schemaVersion: 2,
        decisionId: "56c33819-5c44-4d90-a592-d8fd0901571d",
        category: "CUSTOMER_REQUESTED_HUMAN",
        reason: "CUSTOMER_REQUESTED_HUMAN",
        customerMessagePolicy: "SILENT_HANDOFF",
        customerMessages: [],
        tag: "NHAN_VIEN",
        provenance,
        decidedAt: "2026-07-22T04:00:00.000Z",
        arbitraryTag: "DA_CHOT_DON",
      }).success,
    ).toBe(false);
  });
});

describe("FunnelEventV1", () => {
  const base = {
    schemaVersion: 1,
    eventId: "0d80484c-4fd4-41e7-bb4b-af34f2f954a9",
    episodeId: "63141b83-c39d-49fc-be67-c4cf788f287f",
    subjectHash: HASH,
    conversationHash: OTHER_HASH,
    occurredAt: "2026-07-22T04:00:00.000Z",
    productId: "CB182",
  } as const;

  it.each([
    ["PRICE_ASKED", "INBOUND_MESSAGE"],
    ["SIZE_CONSULTED", "BUSINESS_TOOL"],
    ["PURCHASE_CONFIRMED", "INBOUND_MESSAGE"],
  ] as const)("accepts the %s funnel milestone", (milestone, source) => {
    expect(
      FunnelEventV1Schema.safeParse({
        ...base,
        milestone,
        source,
        conversionEvidence: null,
      }).success,
    ).toBe(true);
  });

  it("counts conversion only from verified Pancake DA_CHOT_DON", () => {
    expect(
      FunnelEventV1Schema.safeParse({
        ...base,
        milestone: "SALE_CONVERTED",
        source: "VERIFIED_PANCAKE_TAG",
        conversionEvidence: evidence,
      }).success,
    ).toBe(true);

    expect(
      FunnelEventV1Schema.safeParse({
        ...base,
        milestone: "SALE_CONVERTED",
        source: "AGENT_OUTPUT",
        conversionEvidence: evidence,
      }).success,
    ).toBe(false);

    expect(
      FunnelEventV1Schema.safeParse({
        ...base,
        milestone: "SALE_CONVERTED",
        source: "VERIFIED_PANCAKE_TAG",
        conversionEvidence: null,
      }).success,
    ).toBe(false);
  });
});

describe("SalesEpisodeV1", () => {
  const base = {
    schemaVersion: 1,
    episodeId: "63141b83-c39d-49fc-be67-c4cf788f287f",
    definitionVersion: "sales-funnel-2026-07-22",
    subjectHash: HASH,
    conversationHash: OTHER_HASH,
    startedAt: "2026-07-22T03:00:00.000Z",
    attribution: {
      model: "FIRST_AND_LAST_TOUCH",
      firstTouch: {
        source: "META_AD",
        occurredAt: "2026-07-22T03:00:00.000Z",
        pageId: "1198992073286645",
        campaignId: "campaign-1",
        adId: "ad-1",
        variantId: null,
      },
      lastTouch: {
        source: "ORGANIC_MESSENGER",
        occurredAt: "2026-07-22T04:00:00.000Z",
        pageId: "1198992073286645",
        campaignId: null,
        adId: null,
        variantId: null,
      },
    },
  } as const;

  it("accepts a converted episode only with verified tag evidence", () => {
    expect(
      SalesEpisodeV1Schema.safeParse({
        ...base,
        endedAt: "2026-07-22T04:00:00.000Z",
        outcome: "CONVERTED",
        highestMilestone: "SALE_CONVERTED",
        conversionEvidence: evidence,
      }).success,
    ).toBe(true);

    expect(
      SalesEpisodeV1Schema.safeParse({
        ...base,
        endedAt: "2026-07-22T04:00:00.000Z",
        outcome: "CONVERTED",
        highestMilestone: "PURCHASE_CONFIRMED",
        conversionEvidence: null,
      }).success,
    ).toBe(false);
  });

  it("enforces episode lifecycle and terminal timestamps", () => {
    expect(
      SalesEpisodeV1Schema.safeParse({
        ...base,
        endedAt: null,
        outcome: "IN_PROGRESS",
        highestMilestone: "PRICE_ASKED",
        conversionEvidence: null,
      }).success,
    ).toBe(true);

    expect(
      SalesEpisodeV1Schema.safeParse({
        ...base,
        endedAt: "2026-07-22T02:00:00.000Z",
        outcome: "ABANDONED",
        highestMilestone: "PRICE_ASKED",
        conversionEvidence: null,
      }).success,
    ).toBe(false);
  });

  it("rejects raw PII fields and non-hashed subject identifiers", () => {
    const episode = {
      ...base,
      endedAt: null,
      outcome: "IN_PROGRESS",
      highestMilestone: null,
      conversionEvidence: null,
    } as const;

    expect(
      SalesEpisodeV1Schema.safeParse({ ...episode, phone: "0900000000" }).success,
    ).toBe(false);
    expect(
      SalesEpisodeV1Schema.safeParse({ ...episode, subjectHash: "facebook-user-id" })
        .success,
    ).toBe(false);
  });
});
