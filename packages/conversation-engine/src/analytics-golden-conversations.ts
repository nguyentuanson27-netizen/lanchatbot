import type {
  FunnelEventV1,
  HandoffDecisionV2,
  VerifiedClosedOrderTagEvidenceV1,
} from "@lana/contracts";
import type {
  GoldenConversation,
  GoldenReplayTurnInput,
  ReplayEvaluationContext,
  ReplayDecisionSnapshot,
} from "./analytics-replay.js";

const SUBJECT = `sha256:${"1".repeat(64)}`;
const CONVERSATION = `sha256:${"2".repeat(64)}`;
const MESSAGE = `sha256:${"3".repeat(64)}`;
const EVIDENCE = `sha256:${"4".repeat(64)}`;
const EPISODE_ID = "30000000-0000-4000-8000-000000000001";
const BASE_TIME = "2026-07-22T04:00:00.000Z";

function input(
  redactedText: string,
  overrides: Partial<GoldenReplayTurnInput> = {},
): GoldenReplayTurnInput {
  return {
    schemaVersion: 1,
    eventHash: MESSAGE,
    occurredAt: BASE_TIME,
    actor: "CUSTOMER",
    source: "SYNTHETIC",
    redactedText,
    dlpStatus: "PASSED",
    attachmentCount: 0,
    providerEvidence: null,
    facts: {
      price: "NOT_REQUESTED",
      size: "NOT_REQUESTED",
      requestedMedia: null,
      exactMediaAvailable: false,
      policy: "NOT_REQUESTED",
      profile: "UNCHANGED",
      channel: "SALES",
    },
    ...overrides,
  };
}

function funnelEvent(
  milestone: FunnelEventV1["milestone"],
  eventId: string,
  conversionEvidence: VerifiedClosedOrderTagEvidenceV1 | null = null,
): FunnelEventV1 {
  return {
    schemaVersion: 1,
    eventId,
    episodeId: EPISODE_ID,
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    milestone,
    occurredAt: BASE_TIME,
    productId: "CB182",
    source: milestone === "SALE_CONVERTED" ? "VERIFIED_PANCAKE_TAG" : "INBOUND_MESSAGE",
    conversionEvidence,
  };
}

function decision(
  overrides: Partial<ReplayDecisionSnapshot> = {},
): ReplayDecisionSnapshot {
  return {
    schemaVersion: 1,
    action: "REPLY",
    intent: "HOI_GIA",
    productId: "CB182",
    quoteStatus: "QUOTED_VERIFIED",
    sizeStatus: "NOT_REQUESTED",
    mediaPurposes: ["FULL_LOOK"],
    funnelEvent: funnelEvent(
      "PRICE_ASKED",
      "40000000-0000-4000-8000-000000000001",
    ),
    handoffDecision: null,
    reasonCodes: ["PRICE_FROM_POS"],
    ...overrides,
  };
}

function handoff(
  kind: "AFTER_SALES" | "PRICE_UNAVAILABLE",
): HandoffDecisionV2 {
  const isAfterSales = kind === "AFTER_SALES";
  return {
    schemaVersion: 2,
    decisionId: isAfterSales
      ? "50000000-0000-4000-8000-000000000001"
      : "50000000-0000-4000-8000-000000000002",
    category: isAfterSales ? "AFTER_SALES" : "BUSINESS_FACT_UNAVAILABLE",
    reason: isAfterSales ? "DELIVERY_TRACKING" : "PRICE_UNAVAILABLE",
    customerMessagePolicy: isAfterSales
      ? "HOLDING_REPLY_THEN_HANDOFF"
      : "SILENT_HANDOFF",
    customerMessages: isAfterSales
      ? ["Em chuyển bộ phận vận đơn kiểm tra giúp mình ngay ạ."]
      : [],
    tag: isAfterSales ? "VAN_DON" : "NHAN_VIEN",
    provenance: {
      decisionSource: "DETERMINISTIC_RULE_ENGINE",
      rulesetVersion: "handoff-golden-v1",
      evidence: [
        {
          source: "INBOUND_MESSAGE",
          referenceHash: EVIDENCE,
          observedAt: BASE_TIME,
        },
      ],
    },
    decidedAt: BASE_TIME,
  };
}

const conversionEvidence: VerifiedClosedOrderTagEvidenceV1 = {
  source: "VERIFIED_PANCAKE_TAG",
  tag: "DA_CHOT_DON",
  verified: true,
  observationId: "60000000-0000-4000-8000-000000000001",
  observedAt: BASE_TIME,
};

/**
 * Deterministic structural evaluator used by the release-gate replay. It reads
 * captured business facts and structured provider evidence; it never returns
 * the catalog's expected object and never infers a conversion from text.
 */
export function evaluateGoldenSalesDecision(
  context: ReplayEvaluationContext,
): ReplayDecisionSnapshot {
  const turn = context.currentTurn;
  const text = turn.redactedText.toLocaleLowerCase("vi-VN");
  const productId = text.includes("cb182") ? "CB182" : null;

  if (turn.providerEvidence !== null) {
    return decision({
      action: "NO_REPLY",
      intent: "VERIFIED_ORDER_TAG",
      productId,
      quoteStatus: "NOT_REQUESTED",
      mediaPurposes: [],
      funnelEvent: funnelEvent(
        "SALE_CONVERTED",
        "40000000-0000-4000-8000-000000000003",
        turn.providerEvidence,
      ),
      reasonCodes: ["VERIFIED_PANCAKE_DA_CHOT_DON"],
    });
  }

  if (turn.facts.channel === "OUTREACH") {
    return decision({
      action: "NO_REPLY",
      intent: "OUTREACH_MESSAGE",
      productId,
      quoteStatus: "NOT_REQUESTED",
      mediaPurposes: [],
      funnelEvent: null,
      reasonCodes: ["OUTREACH_EXCLUDED_FROM_SALES"],
    });
  }

  if (text.includes("vận đơn")) {
    return decision({
      action: "HANDOFF",
      intent: "DELIVERY_TRACKING",
      productId: null,
      quoteStatus: "NOT_REQUESTED",
      mediaPurposes: [],
      funnelEvent: null,
      handoffDecision: handoff("AFTER_SALES"),
      reasonCodes: ["AFTER_SALES_HOLDING_REPLY", "VAN_DON_HANDOFF"],
    });
  }

  if (turn.facts.price === "FRESH") return decision({ productId });
  if (turn.facts.price === "MISSING" || turn.facts.price === "STALE") {
    return decision({
      action: "HANDOFF",
      productId,
      quoteStatus: "BLOCKED",
      mediaPurposes: [],
      funnelEvent: null,
      handoffDecision: handoff("PRICE_UNAVAILABLE"),
      reasonCodes: [
        turn.facts.price === "STALE" ? "POS_PRICE_STALE" : "POS_PRICE_UNAVAILABLE",
        "SILENT_HANDOFF",
      ],
    });
  }

  if (turn.facts.size !== "NOT_REQUESTED") {
    return decision({
      intent: "SIZE_CONSULTATION",
      productId,
      quoteStatus: "NOT_REQUESTED",
      sizeStatus: turn.facts.size,
      mediaPurposes: [],
      funnelEvent: turn.facts.size === "RECOMMENDED"
        ? funnelEvent("SIZE_CONSULTED", "40000000-0000-4000-8000-000000000004")
        : null,
      reasonCodes: [turn.facts.size === "RECOMMENDED" ? "VERIFIED_SIZE_RECOMMENDATION" : "SIZE_INPUT_REQUIRED"],
    });
  }

  if (turn.facts.requestedMedia !== null) {
    return decision({
      intent: "MEDIA_REQUEST",
      productId,
      quoteStatus: "NOT_REQUESTED",
      mediaPurposes: turn.facts.exactMediaAvailable ? [turn.facts.requestedMedia] : [],
      funnelEvent: null,
      reasonCodes: turn.facts.exactMediaAvailable
        ? ["EXACT_MEDIA_SELECTED"]
        : ["EXACT_MEDIA_UNAVAILABLE", "ANSWER_THEN_CONTINUE_CLOSING"],
    });
  }

  if (turn.facts.policy !== "NOT_REQUESTED") {
    return decision({
      intent: "OFFER_EVALUATION",
      productId,
      quoteStatus: "NOT_REQUESTED",
      mediaPurposes: [],
      funnelEvent: null,
      reasonCodes: [turn.facts.policy === "STACKING_ALLOWED" ? "SHOP_WIDE_STACKING_ALLOWED" : "OFFER_BLOCKED"],
    });
  }

  if (turn.facts.profile !== "UNCHANGED") {
    return decision({
      intent: "CUSTOMER_PROFILE_UPDATE",
      productId,
      quoteStatus: "NOT_REQUESTED",
      mediaPurposes: [],
      funnelEvent: null,
      reasonCodes: [turn.facts.profile === "MERGED" ? "PROFILE_FIELD_MERGED" : "PROFILE_FIELD_CONFLICT"],
    });
  }

  if (text.includes("lấy mẫu")) {
    return decision({
      intent: "PURCHASE_CONFIRMATION",
      productId,
      quoteStatus: "NOT_REQUESTED",
      mediaPurposes: [],
      funnelEvent: funnelEvent(
        "PURCHASE_CONFIRMED",
        "40000000-0000-4000-8000-000000000002",
      ),
      reasonCodes: ["PURCHASE_CONFIRMED_NOT_CONVERTED"],
    });
  }

  return decision({
    intent: "UNCLASSIFIED",
    productId,
    quoteStatus: "NOT_REQUESTED",
    mediaPurposes: [],
    funnelEvent: null,
    reasonCodes: ["NO_MATCHING_DETERMINISTIC_RULE"],
  });
}

/**
 * Minimal mandatory acceptance catalog for every sales-engine release. It
 * contains synthetic, PII-free messages and asserts structure rather than
 * model prose, so prompt copy can evolve without weakening business rules.
 */
export const GOLDEN_CONVERSATIONS_V1: readonly GoldenConversation[] = [
  {
    schemaVersion: 1,
    scenarioId: "verified-pos-price-reply",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "price-1",
        input: input("CB182 giá bao nhiêu?", {
          facts: {
            price: "FRESH",
            size: "NOT_REQUESTED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "UNCHANGED",
            channel: "SALES",
          },
        }),
        expected: decision(),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "missing-price-silent-human-handoff",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "missing-price-1",
        input: input("CB182 giá bao nhiêu?", {
          facts: {
            price: "MISSING",
            size: "NOT_REQUESTED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "UNCHANGED",
            channel: "SALES",
          },
        }),
        expected: decision({
          action: "HANDOFF",
          quoteStatus: "BLOCKED",
          mediaPurposes: [],
          funnelEvent: null,
          handoffDecision: handoff("PRICE_UNAVAILABLE"),
          reasonCodes: ["POS_PRICE_UNAVAILABLE", "SILENT_HANDOFF"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "after-sales-holding-reply-and-van-don-handoff",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "tracking-1",
        input: input("Kiểm tra vận đơn giúp mình"),
        expected: decision({
          action: "HANDOFF",
          intent: "DELIVERY_TRACKING",
          productId: null,
          quoteStatus: "NOT_REQUESTED",
          mediaPurposes: [],
          funnelEvent: null,
          handoffDecision: handoff("AFTER_SALES"),
          reasonCodes: ["AFTER_SALES_HOLDING_REPLY", "VAN_DON_HANDOFF"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "purchase-confirmation-is-not-conversion",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "confirm-1",
        input: input("Chị lấy mẫu CB182"),
        expected: decision({
          intent: "PURCHASE_CONFIRMATION",
          quoteStatus: "NOT_REQUESTED",
          mediaPurposes: [],
          funnelEvent: funnelEvent(
            "PURCHASE_CONFIRMED",
            "40000000-0000-4000-8000-000000000002",
          ),
          reasonCodes: ["PURCHASE_CONFIRMED_NOT_CONVERTED"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "verified-da-chot-don-is-conversion",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "conversion-1",
        input: input("Pancake provider tag observation for CB182", {
          actor: "SYSTEM",
          providerEvidence: conversionEvidence,
        }),
        expected: decision({
          action: "NO_REPLY",
          intent: "VERIFIED_ORDER_TAG",
          quoteStatus: "NOT_REQUESTED",
          mediaPurposes: [],
          funnelEvent: funnelEvent(
            "SALE_CONVERTED",
            "40000000-0000-4000-8000-000000000003",
            conversionEvidence,
          ),
          reasonCodes: ["VERIFIED_PANCAKE_DA_CHOT_DON"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "stale-pos-price-silent-human-handoff",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "stale-price-1",
        input: input("CB182 giá bao nhiêu?", {
          facts: {
            price: "STALE",
            size: "NOT_REQUESTED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "UNCHANGED",
            channel: "SALES",
          },
        }),
        expected: decision({
          action: "HANDOFF",
          quoteStatus: "BLOCKED",
          mediaPurposes: [],
          funnelEvent: null,
          handoffDecision: handoff("PRICE_UNAVAILABLE"),
          reasonCodes: ["POS_PRICE_STALE", "SILENT_HANDOFF"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "verified-size-recommendation",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "size-1",
        input: input("Tư vấn size CB182", {
          facts: {
            price: "NOT_REQUESTED",
            size: "RECOMMENDED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "UNCHANGED",
            channel: "SALES",
          },
        }),
        expected: decision({
          intent: "SIZE_CONSULTATION",
          quoteStatus: "NOT_REQUESTED",
          sizeStatus: "RECOMMENDED",
          mediaPurposes: [],
          funnelEvent: funnelEvent("SIZE_CONSULTED", "40000000-0000-4000-8000-000000000004"),
          reasonCodes: ["VERIFIED_SIZE_RECOMMENDATION"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "exact-media-missing-answer-without-image",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "media-1",
        input: input("Cho xem ảnh cận chất CB182", {
          facts: {
            price: "NOT_REQUESTED",
            size: "NOT_REQUESTED",
            requestedMedia: "DETAIL_FABRIC",
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "UNCHANGED",
            channel: "SALES",
          },
        }),
        expected: decision({
          intent: "MEDIA_REQUEST",
          quoteStatus: "NOT_REQUESTED",
          mediaPurposes: [],
          funnelEvent: null,
          reasonCodes: ["EXACT_MEDIA_UNAVAILABLE", "ANSWER_THEN_CONTINUE_CLOSING"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "shop-wide-offer-stacking",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "policy-1",
        input: input("Áp dụng ưu đãi cuối và giảm 5%", {
          facts: {
            price: "NOT_REQUESTED",
            size: "NOT_REQUESTED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "STACKING_ALLOWED",
            profile: "UNCHANGED",
            channel: "SALES",
          },
        }),
        expected: decision({
          intent: "OFFER_EVALUATION",
          productId: null,
          quoteStatus: "NOT_REQUESTED",
          mediaPurposes: [],
          funnelEvent: null,
          reasonCodes: ["SHOP_WIDE_STACKING_ALLOWED"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "profile-field-merge",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "profile-1",
        input: input("Cập nhật hồ sơ đã ẩn danh", {
          facts: {
            price: "NOT_REQUESTED",
            size: "NOT_REQUESTED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "MERGED",
            channel: "SALES",
          },
        }),
        expected: decision({
          intent: "CUSTOMER_PROFILE_UPDATE",
          productId: null,
          quoteStatus: "NOT_REQUESTED",
          mediaPurposes: [],
          funnelEvent: null,
          reasonCodes: ["PROFILE_FIELD_MERGED"],
        }),
      },
    ],
  },
  {
    schemaVersion: 1,
    scenarioId: "outreach-excluded-from-sales-replay",
    definitionVersion: "golden-sales-v1",
    subjectHash: SUBJECT,
    conversationHash: CONVERSATION,
    turns: [
      {
        turnId: "outreach-1",
        input: input("Hôm trước mình có hỏi về sản phẩm", {
          facts: {
            price: "NOT_REQUESTED",
            size: "NOT_REQUESTED",
            requestedMedia: null,
            exactMediaAvailable: false,
            policy: "NOT_REQUESTED",
            profile: "UNCHANGED",
            channel: "OUTREACH",
          },
        }),
        expected: decision({
          action: "NO_REPLY",
          intent: "OUTREACH_MESSAGE",
          productId: null,
          quoteStatus: "NOT_REQUESTED",
          mediaPurposes: [],
          funnelEvent: null,
          reasonCodes: ["OUTREACH_EXCLUDED_FROM_SALES"],
        }),
      },
    ],
  },
] as const;
