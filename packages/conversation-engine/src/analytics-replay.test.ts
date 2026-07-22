import { describe, expect, it } from "vitest";
import {
  assertGoldenReplay,
  buildThreeMonthAnalyticsBaseline,
  runGoldenReplay,
  validateReplayDecision,
  type AnalyticsBaselineInput,
  type AnonymizedHistoryRecord,
  type AnonymizedOutreachRecord,
  type GoldenConversation,
  type ReplayDecisionSnapshot,
  type ScopedFunnelEvent,
} from "./analytics-replay.js";
import {
  evaluateGoldenSalesDecision,
  GOLDEN_CONVERSATIONS_V1,
} from "./analytics-golden-conversations.js";

const SUBJECT = `sha256:${"a".repeat(64)}`;
const CONVERSATION = `sha256:${"b".repeat(64)}`;
const EVENT = `sha256:${"c".repeat(64)}`;
const OUTREACH = `sha256:${"d".repeat(64)}`;
const TEST_PAGE = "1198992073286645";
const LIVE_PAGE = "page-live";

const conversionEvidence = {
  source: "VERIFIED_PANCAKE_TAG" as const,
  tag: "DA_CHOT_DON" as const,
  verified: true as const,
  observationId: "11ca2e3e-b77f-4e51-b4f7-1fe5ac4b9181",
  observedAt: "2026-07-20T10:10:00.000Z",
};
const outreachConversionEvidence = {
  ...conversionEvidence,
  observationId: "21ca2e3e-b77f-4e51-b4f7-1fe5ac4b9181",
};

function history(
  overrides: Partial<AnonymizedHistoryRecord> = {},
): AnonymizedHistoryRecord {
  return {
    schemaVersion: 1,
    eventHash: EVENT,
    pageId: LIVE_PAGE,
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    occurredAt: "2026-07-20T10:00:00.000Z",
    channel: "SALES",
    direction: "INBOUND",
    actor: "CUSTOMER",
    ...overrides,
  };
}

function funnel(
  milestone: "PRICE_ASKED" | "SIZE_CONSULTED" | "PURCHASE_CONFIRMED" | "SALE_CONVERTED",
  overrides: Partial<ScopedFunnelEvent> = {},
): ScopedFunnelEvent {
  return {
    pageId: LIVE_PAGE,
    channel: "SALES",
    event: {
      schemaVersion: 1,
      eventId: {
        PRICE_ASKED: "10000000-0000-4000-8000-000000000001",
        SIZE_CONSULTED: "10000000-0000-4000-8000-000000000002",
        PURCHASE_CONFIRMED: "10000000-0000-4000-8000-000000000003",
        SALE_CONVERTED: "10000000-0000-4000-8000-000000000004",
      }[milestone],
      episodeId: "20000000-0000-4000-8000-000000000001",
      subjectHash: SUBJECT,
      conversationHash: CONVERSATION,
      milestone,
      occurredAt: milestone === "SALE_CONVERTED"
        ? "2026-07-20T10:10:00.000Z"
        : "2026-07-20T10:00:00.000Z",
      productId: "CB182",
      source: milestone === "SALE_CONVERTED"
        ? "VERIFIED_PANCAKE_TAG"
        : "INBOUND_MESSAGE",
      conversionEvidence: milestone === "SALE_CONVERTED" ? conversionEvidence : null,
    },
    ...overrides,
  };
}

function outreach(
  overrides: Partial<AnonymizedOutreachRecord> = {},
): AnonymizedOutreachRecord {
  return {
    schemaVersion: 1,
    recordHash: OUTREACH,
    pageId: LIVE_PAGE,
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    templateId: "follow-up-1",
    templateVersion: "v1",
    sentAt: "2026-07-20T09:00:00.000Z",
    deliveredAt: "2026-07-20T09:00:05.000Z",
    readAt: "2026-07-20T09:01:00.000Z",
    respondedAt: "2026-07-20T10:00:00.000Z",
    positiveResponse: true,
    optedOut: false,
    convertedAt: "2026-07-20T10:10:00.000Z",
    conversionEvidence: outreachConversionEvidence,
    ...overrides,
  };
}

function baselineInput(
  overrides: Partial<AnalyticsBaselineInput> = {},
): AnalyticsBaselineInput {
  return {
    definitionVersion: "sales-baseline-v1",
    generatedAt: "2026-07-22T12:00:00.000Z",
    testPageIds: [TEST_PAGE],
    history: [history()],
    funnelEvents: [
      funnel("PRICE_ASKED"),
      funnel("SIZE_CONSULTED"),
      funnel("PURCHASE_CONFIRMED"),
      funnel("SALE_CONVERTED"),
    ],
    outreach: [outreach()],
    ...overrides,
  };
}

describe("three-month anonymized analytics baseline", () => {
  it("builds sales funnel and independent outreach metrics", () => {
    const result = buildThreeMonthAnalyticsBaseline(baselineInput());

    expect(result.window).toEqual({
      months: 3,
      from: "2026-04-22T12:00:00.000Z",
      to: "2026-07-22T12:00:00.000Z",
    });
    expect(result.sales).toMatchObject({
      messages: 1,
      conversations: 1,
      customers: 1,
      funnel: {
        priceAskedEpisodes: 1,
        sizeConsultedEpisodes: 1,
        purchaseConfirmedEpisodes: 1,
        convertedEpisodes: 1,
        priceToSizeRate: 1,
        sizeToPurchaseRate: 1,
        purchaseToConversionRate: 1,
      },
    });
    expect(result.outreach).toMatchObject({
      sent: 1,
      delivered: 1,
      read: 1,
      responded: 1,
      positiveResponses: 1,
      optOuts: 0,
      converted: 1,
      responseRate: 1,
      conversionRate: 1,
    });
  });

  it("excludes test pages and outreach messages from the sales baseline", () => {
    const testRecord = history({
      eventHash: `sha256:${"e".repeat(64)}`,
      pageId: TEST_PAGE,
    });
    const outreachHistory = history({
      eventHash: `sha256:${"f".repeat(64)}`,
      channel: "OUTREACH",
    });
    const result = buildThreeMonthAnalyticsBaseline(
      baselineInput({
        history: [history(), testRecord, outreachHistory],
        funnelEvents: [
          funnel("PRICE_ASKED"),
          funnel("SIZE_CONSULTED", { pageId: TEST_PAGE }),
          funnel("PURCHASE_CONFIRMED", { channel: "OUTREACH" }),
        ],
        outreach: [outreach(), outreach({ recordHash: `sha256:${"1".repeat(64)}`, pageId: TEST_PAGE })],
      }),
    );

    expect(result.sales.messages).toBe(1);
    expect(result.exclusions).toMatchObject({
      historyTestPage: 1,
      historyOutreachFromSales: 1,
      funnelTestPage: 1,
      funnelOutreachFromSales: 1,
      outreachTestPage: 1,
    });
  });

  it("deduplicates every source before counting", () => {
    const historyRecord = history();
    const funnelEvent = funnel("PRICE_ASKED");
    const outreachRecord = outreach();
    const result = buildThreeMonthAnalyticsBaseline(
      baselineInput({
        history: [historyRecord, historyRecord],
        funnelEvents: [funnelEvent, funnelEvent],
        outreach: [outreachRecord, outreachRecord],
      }),
    );

    expect(result.sales.messages).toBe(1);
    expect(result.sales.funnel.priceAskedEpisodes).toBe(1);
    expect(result.outreach.sent).toBe(1);
    expect(result.exclusions).toMatchObject({
      historyDuplicates: 1,
      funnelDuplicates: 1,
      outreachDuplicates: 1,
    });
  });

  it("does not count purchase confirmation as conversion", () => {
    const result = buildThreeMonthAnalyticsBaseline(
      baselineInput({ funnelEvents: [funnel("PURCHASE_CONFIRMED")] }),
    );
    expect(result.sales.funnel.purchaseConfirmedEpisodes).toBe(1);
    expect(result.sales.funnel.convertedEpisodes).toBe(0);
    expect(result.sales.funnel.purchaseToConversionRate).toBe(0);
  });

  it("rejects conversion without verified Pancake DA_CHOT_DON evidence", () => {
    const invalid = funnel("SALE_CONVERTED");
    expect(() =>
      buildThreeMonthAnalyticsBaseline(
        baselineInput({
          funnelEvents: [
            {
              ...invalid,
              event: { ...invalid.event, conversionEvidence: null },
            },
          ],
        }),
      ),
    ).toThrow();

    expect(() =>
      buildThreeMonthAnalyticsBaseline(
        baselineInput({
          outreach: [outreach({ convertedAt: null })],
        }),
      ),
    ).toThrow("ANALYTICS_OUTREACH_CONVERSION_EVIDENCE_REQUIRED");
  });

  it("rejects raw PII fields even when passed by an untyped caller", () => {
    expect(() =>
      buildThreeMonthAnalyticsBaseline({
        ...baselineInput(),
        phone: "0900000000",
      } as AnalyticsBaselineInput),
    ).toThrow("ANALYTICS_RAW_PII_FIELD_REJECTED");
  });

  it("fails closed on conflicting duplicates regardless of source order", () => {
    const original = history();
    const conflict = history({ pageId: TEST_PAGE });
    for (const records of [[original, conflict], [conflict, original]]) {
      expect(() =>
        buildThreeMonthAnalyticsBaseline(baselineInput({ history: records })),
      ).toThrow("ANALYTICS_HISTORY_DUPLICATE_CONFLICT");
    }
  });

  it("does not count outreach outcomes that occur after the report cutoff", () => {
    const futureEvidence = {
      ...outreachConversionEvidence,
      observedAt: "2026-07-23T10:10:00.000Z",
    };
    const result = buildThreeMonthAnalyticsBaseline(
      baselineInput({
        funnelEvents: [],
        outreach: [outreach({
          deliveredAt: "2026-07-23T09:00:05.000Z",
          readAt: "2026-07-23T09:01:00.000Z",
          respondedAt: "2026-07-23T10:00:00.000Z",
          convertedAt: "2026-07-23T10:10:00.000Z",
          conversionEvidence: futureEvidence,
        })],
      }),
    );
    expect(result.outreach).toMatchObject({
      sent: 1,
      delivered: 0,
      read: 0,
      responded: 0,
      positiveResponses: 0,
      converted: 0,
    });
  });

  it("rejects reuse of one verified conversion observation across the baseline", () => {
    expect(() =>
      buildThreeMonthAnalyticsBaseline(
        baselineInput({
          outreach: [outreach({ conversionEvidence })],
        }),
      ),
    ).toThrow("ANALYTICS_CONVERSION_OBSERVATION_REUSED");
  });

  it("requires canonical UTC timestamps", () => {
    expect(() =>
      buildThreeMonthAnalyticsBaseline(
        baselineInput({ generatedAt: "2026-07-22T12:00:00" }),
      ),
    ).toThrow("ANALYTICS_GENERATED_AT_INVALID");
  });

  it("computes transition rates from ordered episode cohorts", () => {
    const basePrice = funnel("PRICE_ASKED");
    const unrelatedSize = funnel("SIZE_CONSULTED");
    const result = buildThreeMonthAnalyticsBaseline(
      baselineInput({
        funnelEvents: [
          basePrice,
          {
            ...unrelatedSize,
            event: {
              ...unrelatedSize.event,
              eventId: "10000000-0000-4000-8000-000000000099",
              episodeId: "20000000-0000-4000-8000-000000000099",
            },
          },
        ],
        outreach: [],
      }),
    );
    expect(result.sales.funnel.sizeConsultedEpisodes).toBe(1);
    expect(result.sales.funnel.priceToSizeRate).toBe(0);
  });
});

const noEventDecision: ReplayDecisionSnapshot = {
  schemaVersion: 1,
  action: "REPLY",
  intent: "HOI_GIA",
  productId: "CB182",
  quoteStatus: "QUOTED_VERIFIED",
  sizeStatus: "NOT_REQUESTED",
  mediaPurposes: ["FULL_LOOK"],
  funnelEvent: funnel("PRICE_ASKED").event,
  handoffDecision: null,
  reasonCodes: ["PRICE_FROM_POS"],
};

function golden(expected: ReplayDecisionSnapshot = noEventDecision): GoldenConversation {
  return {
    schemaVersion: 1,
    scenarioId: "price-query-with-pos-facts",
    definitionVersion: "golden-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "turn-1",
        input: {
          schemaVersion: 1,
          eventHash: EVENT,
          occurredAt: "2026-07-20T10:00:00.000Z",
          actor: "CUSTOMER",
          source: "SYNTHETIC",
          redactedText: "CB182 giá bao nhiêu?",
          dlpStatus: "PASSED",
          attachmentCount: 0,
          providerEvidence: null,
          facts: {
            price: "FRESH",
            size: "NOT_REQUESTED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "UNCHANGED",
            channel: "SALES",
          },
        },
        expected,
      },
    ],
  };
}

describe("deterministic golden conversation replay", () => {
  it.each(GOLDEN_CONVERSATIONS_V1)(
    "validates the mandatory $scenarioId golden scenario",
    async (scenario) => {
      await expect(
        assertGoldenReplay(scenario, evaluateGoldenSalesDecision),
      ).resolves.toBeUndefined();
    },
  );

  it("passes an exact structural decision", async () => {
    const scenario = golden();
    const report = await runGoldenReplay(scenario, () => noEventDecision);
    expect(report).toEqual({
      scenarioId: scenario.scenarioId,
      passed: true,
      evaluatedTurns: 1,
      failures: [],
    });
    await expect(assertGoldenReplay(scenario, () => noEventDecision)).resolves.toBeUndefined();
  });

  it("reports a structural mismatch", async () => {
    const report = await runGoldenReplay(golden(), () => ({
      ...noEventDecision,
      quoteStatus: "BLOCKED",
    }));
    expect(report.passed).toBe(false);
    expect(report.failures[0]?.code).toBe("ACTUAL_MISMATCH");
  });

  it("detects non-deterministic output", async () => {
    let calls = 0;
    const report = await runGoldenReplay(golden(), () => ({
      ...noEventDecision,
      reasonCodes: [calls++ % 2 === 0 ? "PRICE_FROM_POS" : "DIFFERENT_RESULT"],
    }));
    expect(report.failures[0]?.code).toBe("NON_DETERMINISTIC");
  });

  it("snapshots evaluator results before a reused object can be mutated", async () => {
    let calls = 0;
    const shared = {
      ...noEventDecision,
      reasonCodes: ["PRICE_FROM_POS"],
    } as { reasonCodes: string[] } & ReplayDecisionSnapshot;
    const report = await runGoldenReplay(golden(), () => {
      shared.reasonCodes = [calls++ === 0 ? "PRICE_FROM_POS" : "DIFFERENT_RESULT"];
      return shared;
    });
    expect(report.failures[0]?.code).toBe("NON_DETERMINISTIC");
  });

  it("rejects raw PII in replay content", async () => {
    const scenario = golden();
    const unsafe: GoldenConversation = {
      ...scenario,
      turns: [
        {
          ...scenario.turns[0]!,
          input: {
            ...scenario.turns[0]!.input,
            redactedText: "Số điện thoại của chị là 0984997797",
          },
        },
      ],
    };
    await expect(runGoldenReplay(unsafe, () => noEventDecision)).rejects.toThrow(
      "REPLAY_RAW_PII_CONTENT_REJECTED",
    );
  });

  it("rejects address-like PII even when the caller marks DLP as passed", async () => {
    const scenario = golden();
    const unsafe: GoldenConversation = {
      ...scenario,
      turns: [{
        ...scenario.turns[0]!,
        input: {
          ...scenario.turns[0]!.input,
          redactedText: "Địa chỉ nhận hàng ở Quận 1",
        },
      }],
    };
    await expect(runGoldenReplay(unsafe, () => noEventDecision)).rejects.toThrow(
      "REPLAY_RAW_PII_CONTENT_REJECTED",
    );
  });

  it("fails a replay decision that fabricates conversion evidence", () => {
    const converted = funnel("SALE_CONVERTED").event;
    expect(() =>
      validateReplayDecision({
        ...noEventDecision,
        funnelEvent: { ...converted, conversionEvidence: null },
      }),
    ).toThrow();
  });
});
