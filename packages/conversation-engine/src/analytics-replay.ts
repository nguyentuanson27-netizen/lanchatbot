import {
  FunnelEventV1Schema,
  HandoffDecisionV2Schema,
  VerifiedClosedOrderTagEvidenceV1Schema,
  type FunnelEventV1,
  type FunnelMilestoneV1,
  type HandoffDecisionV2,
  type VerifiedClosedOrderTagEvidenceV1,
} from "@lana/contracts";

const SHA256_REFERENCE = /^sha256:[a-f0-9]{64}$/u;
const RULE_TOKEN = /^[A-Z0-9_:-]{1,128}$/u;
const RAW_PII_KEYS = new Set([
  "address",
  "conversationId",
  "customerId",
  "customerName",
  "email",
  "facebookUserId",
  "fullName",
  "name",
  "phone",
  "phoneNumber",
  "rawText",
  "recipientId",
  "senderId",
  "text",
]);
const EMAIL_LIKE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const PHONE_LIKE = /(?:^|\D)(?:\+?84|0)[\s.-]*(?:\d[\s.-]*){8,10}(?:\D|$)/u;
const SOCIAL_ID_LIKE = /\b\d{15,20}\b/u;
const ADDRESS_OR_NAME_LABEL_LIKE =
  /\b(?:địa\s*chỉ|số\s*nhà|đường|phường|quận|huyện|tỉnh|thành\s*phố|họ\s*tên|tên\s+(?:chị|em|khách))\b/iu;
const STRICT_UTC_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u;

export const ANALYTICS_BASELINE_MONTHS = 3 as const;

export type AnalyticsChannel = "SALES" | "OUTREACH";

/**
 * A content-free projection of the anonymized chat history. The analytics
 * engine intentionally does not accept message text, provider IDs or customer
 * identifiers. Those values stay in the retention-controlled data layer.
 */
export interface AnonymizedHistoryRecord {
  readonly schemaVersion: 1;
  readonly eventHash: string;
  readonly pageId: string;
  readonly subjectHash: string;
  readonly conversationHash: string;
  readonly occurredAt: string;
  readonly channel: AnalyticsChannel;
  readonly direction: "INBOUND" | "OUTBOUND";
  readonly actor: "CUSTOMER" | "BOT" | "HUMAN" | "SYSTEM";
}

export interface ScopedFunnelEvent {
  readonly pageId: string;
  /** Outreach-attributed episodes are measured only by the outreach cohort. */
  readonly channel: AnalyticsChannel;
  readonly event: FunnelEventV1;
}

export interface AnonymizedOutreachRecord {
  readonly schemaVersion: 1;
  readonly recordHash: string;
  readonly pageId: string;
  readonly subjectHash: string;
  readonly conversationHash: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly sentAt: string;
  readonly deliveredAt: string | null;
  readonly readAt: string | null;
  readonly respondedAt: string | null;
  readonly positiveResponse: boolean;
  readonly optedOut: boolean;
  readonly convertedAt: string | null;
  readonly conversionEvidence: VerifiedClosedOrderTagEvidenceV1 | null;
}

export interface AnalyticsBaselineInput {
  readonly definitionVersion: string;
  readonly generatedAt: string;
  readonly testPageIds: readonly string[];
  readonly history: readonly AnonymizedHistoryRecord[];
  readonly funnelEvents: readonly ScopedFunnelEvent[];
  readonly outreach: readonly AnonymizedOutreachRecord[];
}

export interface FunnelBaseline {
  readonly priceAskedEpisodes: number;
  readonly sizeConsultedEpisodes: number;
  readonly purchaseConfirmedEpisodes: number;
  readonly convertedEpisodes: number;
  readonly priceToSizeRate: number | null;
  readonly sizeToPurchaseRate: number | null;
  readonly purchaseToConversionRate: number | null;
}

export interface OutreachBaseline {
  readonly sent: number;
  readonly delivered: number;
  readonly read: number;
  readonly responded: number;
  readonly positiveResponses: number;
  readonly optOuts: number;
  readonly converted: number;
  readonly responseRate: number | null;
  readonly conversionRate: number | null;
}

export interface AnalyticsBaseline {
  readonly schemaVersion: 1;
  readonly definitionVersion: string;
  readonly generatedAt: string;
  readonly window: {
    readonly months: typeof ANALYTICS_BASELINE_MONTHS;
    readonly from: string;
    readonly to: string;
  };
  readonly sales: {
    readonly messages: number;
    readonly conversations: number;
    readonly customers: number;
    readonly funnel: FunnelBaseline;
  };
  readonly outreach: OutreachBaseline;
  readonly exclusions: {
    readonly historyDuplicates: number;
    readonly historyOutsideWindow: number;
    readonly historyTestPage: number;
    readonly historyOutreachFromSales: number;
    readonly funnelDuplicates: number;
    readonly funnelOutsideWindow: number;
    readonly funnelTestPage: number;
    readonly funnelOutreachFromSales: number;
    readonly outreachDuplicates: number;
    readonly outreachOutsideWindow: number;
    readonly outreachTestPage: number;
  };
}

function fail(code: string): never {
  throw new Error(code);
}

function asTimestamp(value: string, code: string): number {
  const match = STRICT_UTC_TIMESTAMP.exec(value);
  if (match === null) fail(code);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail(code);
  const normalized = `${match[1]}.${(match[2] ?? "").padEnd(3, "0")}Z`;
  if (new Date(timestamp).toISOString() !== normalized) fail(code);
  return timestamp;
}

function requireHash(value: string, code: string): void {
  if (!SHA256_REFERENCE.test(value)) fail(code);
}

function requireToken(value: string, code: string, max = 128): void {
  if (!value.trim() || value !== value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    fail(code);
  }
}

function assertAllowedKeys(
  value: object,
  allowed: ReadonlySet<string>,
  code: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(code);
  }
}

function assertNoPiiLikeContent(value: string, code: string): void {
  if (
    EMAIL_LIKE.test(value) ||
    PHONE_LIKE.test(value) ||
    SOCIAL_ID_LIKE.test(value) ||
    ADDRESS_OR_NAME_LABEL_LIKE.test(value)
  ) {
    fail(code);
  }
}

function assertNoRawPiiKeys(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) assertNoRawPiiKeys(item, seen);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (RAW_PII_KEYS.has(key)) fail("ANALYTICS_RAW_PII_FIELD_REJECTED");
    assertNoRawPiiKeys(nested, seen);
  }
}

function subtractUtcMonths(value: Date, months: number): Date {
  const targetMonthIndex = value.getUTCMonth() - months;
  const targetYear = value.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      Math.min(value.getUTCDate(), lastDay),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds(),
    ),
  );
}

function inWindow(timestamp: number, from: number, to: number): boolean {
  return timestamp >= from && timestamp <= to;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function validateHistoryRecord(record: AnonymizedHistoryRecord): void {
  assertAllowedKeys(
    record,
    new Set([
      "schemaVersion",
      "eventHash",
      "pageId",
      "subjectHash",
      "conversationHash",
      "occurredAt",
      "channel",
      "direction",
      "actor",
    ]),
    "ANALYTICS_HISTORY_UNKNOWN_FIELD_REJECTED",
  );
  if (record.schemaVersion !== 1) fail("ANALYTICS_HISTORY_SCHEMA_UNSUPPORTED");
  requireHash(record.eventHash, "ANALYTICS_EVENT_HASH_INVALID");
  requireHash(record.subjectHash, "ANALYTICS_SUBJECT_HASH_INVALID");
  requireHash(record.conversationHash, "ANALYTICS_CONVERSATION_HASH_INVALID");
  requireToken(record.pageId, "ANALYTICS_PAGE_ID_INVALID", 64);
  asTimestamp(record.occurredAt, "ANALYTICS_HISTORY_TIME_INVALID");
  if (record.channel !== "SALES" && record.channel !== "OUTREACH") {
    fail("ANALYTICS_HISTORY_CHANNEL_INVALID");
  }
  if (record.direction !== "INBOUND" && record.direction !== "OUTBOUND") {
    fail("ANALYTICS_HISTORY_DIRECTION_INVALID");
  }
  if (!["CUSTOMER", "BOT", "HUMAN", "SYSTEM"].includes(record.actor)) {
    fail("ANALYTICS_HISTORY_ACTOR_INVALID");
  }
}

function validateOutreachRecord(record: AnonymizedOutreachRecord): void {
  assertAllowedKeys(
    record,
    new Set([
      "schemaVersion",
      "recordHash",
      "pageId",
      "subjectHash",
      "conversationHash",
      "templateId",
      "templateVersion",
      "sentAt",
      "deliveredAt",
      "readAt",
      "respondedAt",
      "positiveResponse",
      "optedOut",
      "convertedAt",
      "conversionEvidence",
    ]),
    "ANALYTICS_OUTREACH_UNKNOWN_FIELD_REJECTED",
  );
  if (record.schemaVersion !== 1) fail("ANALYTICS_OUTREACH_SCHEMA_UNSUPPORTED");
  requireHash(record.recordHash, "ANALYTICS_OUTREACH_HASH_INVALID");
  requireHash(record.subjectHash, "ANALYTICS_SUBJECT_HASH_INVALID");
  requireHash(record.conversationHash, "ANALYTICS_CONVERSATION_HASH_INVALID");
  requireToken(record.pageId, "ANALYTICS_PAGE_ID_INVALID", 64);
  requireToken(record.templateId, "ANALYTICS_OUTREACH_TEMPLATE_INVALID");
  requireToken(record.templateVersion, "ANALYTICS_OUTREACH_VERSION_INVALID", 64);
  if (
    typeof record.positiveResponse !== "boolean" ||
    typeof record.optedOut !== "boolean"
  ) {
    fail("ANALYTICS_OUTREACH_RESPONSE_FLAGS_INVALID");
  }

  const sentAt = asTimestamp(record.sentAt, "ANALYTICS_OUTREACH_SENT_TIME_INVALID");
  for (const [field, value] of [
    ["DELIVERED", record.deliveredAt],
    ["READ", record.readAt],
    ["RESPONDED", record.respondedAt],
    ["CONVERTED", record.convertedAt],
  ] as const) {
    if (value !== null && asTimestamp(value, `ANALYTICS_OUTREACH_${field}_TIME_INVALID`) < sentAt) {
      fail(`ANALYTICS_OUTREACH_${field}_BEFORE_SENT`);
    }
  }

  if ((record.convertedAt === null) !== (record.conversionEvidence === null)) {
    fail("ANALYTICS_OUTREACH_CONVERSION_EVIDENCE_REQUIRED");
  }
  if ((record.positiveResponse || record.optedOut) && record.respondedAt === null) {
    fail("ANALYTICS_OUTREACH_RESPONSE_CLASSIFICATION_WITHOUT_RESPONSE");
  }
  if (record.readAt !== null && record.deliveredAt === null) {
    fail("ANALYTICS_OUTREACH_READ_WITHOUT_DELIVERY");
  }
  if (record.conversionEvidence !== null) {
    VerifiedClosedOrderTagEvidenceV1Schema.parse(record.conversionEvidence);
    asTimestamp(
      record.conversionEvidence.observedAt,
      "ANALYTICS_OUTREACH_CONVERSION_OBSERVED_AT_INVALID",
    );
    if (
      asTimestamp(
        record.conversionEvidence.observedAt,
        "ANALYTICS_OUTREACH_CONVERSION_OBSERVED_AT_INVALID",
      ) >
      asTimestamp(record.convertedAt!, "ANALYTICS_OUTREACH_CONVERTED_TIME_INVALID")
    ) {
      fail("ANALYTICS_OUTREACH_EVIDENCE_AFTER_CONVERSION");
    }
  }
}

/**
 * Builds a calendar-three-month baseline. Exclusions are deterministic and
 * mutually exclusive inside each source: outside-window first, test page
 * second, and outreach classification third for chat history.
 */
export function buildThreeMonthAnalyticsBaseline(
  input: AnalyticsBaselineInput,
): AnalyticsBaseline {
  assertNoRawPiiKeys(input);
  assertAllowedKeys(
    input,
    new Set([
      "definitionVersion",
      "generatedAt",
      "testPageIds",
      "history",
      "funnelEvents",
      "outreach",
    ]),
    "ANALYTICS_INPUT_UNKNOWN_FIELD_REJECTED",
  );
  requireToken(input.definitionVersion, "ANALYTICS_DEFINITION_VERSION_INVALID");
  const generatedAtMs = asTimestamp(input.generatedAt, "ANALYTICS_GENERATED_AT_INVALID");
  const generatedAt = new Date(generatedAtMs);
  const from = subtractUtcMonths(generatedAt, ANALYTICS_BASELINE_MONTHS);
  const fromMs = from.getTime();
  const testPages = new Set(input.testPageIds);
  if (testPages.size !== input.testPageIds.length) {
    fail("ANALYTICS_TEST_PAGE_DUPLICATED");
  }
  for (const pageId of testPages) requireToken(pageId, "ANALYTICS_TEST_PAGE_ID_INVALID", 64);

  const salesConversations = new Set<string>();
  const salesCustomers = new Set<string>();
  let salesMessages = 0;
  let historyDuplicates = 0;
  let historyOutsideWindow = 0;
  let historyTestPage = 0;
  let historyOutreachFromSales = 0;

  const seenHistoryEvents = new Map<string, string>();
  for (const record of input.history) {
    validateHistoryRecord(record);
    const recordFingerprint = canonical(record);
    const seenFingerprint = seenHistoryEvents.get(record.eventHash);
    if (seenFingerprint !== undefined) {
      if (seenFingerprint !== recordFingerprint) {
        fail("ANALYTICS_HISTORY_DUPLICATE_CONFLICT");
      }
      historyDuplicates += 1;
      continue;
    }
    seenHistoryEvents.set(record.eventHash, recordFingerprint);
    const occurredAt = asTimestamp(record.occurredAt, "ANALYTICS_HISTORY_TIME_INVALID");
    if (!inWindow(occurredAt, fromMs, generatedAtMs)) {
      historyOutsideWindow += 1;
    } else if (testPages.has(record.pageId)) {
      historyTestPage += 1;
    } else if (record.channel === "OUTREACH") {
      historyOutreachFromSales += 1;
    } else {
      salesMessages += 1;
      salesConversations.add(record.conversationHash);
      salesCustomers.add(record.subjectHash);
    }
  }

  const funnelSets: Record<FunnelMilestoneV1, Set<string>> = {
    PRICE_ASKED: new Set<string>(),
    SIZE_CONSULTED: new Set<string>(),
    PURCHASE_CONFIRMED: new Set<string>(),
    SALE_CONVERTED: new Set<string>(),
  };
  let funnelDuplicates = 0;
  let funnelOutsideWindow = 0;
  let funnelTestPage = 0;
  let funnelOutreachFromSales = 0;
  const seenFunnelEvents = new Map<string, string>();
  const episodeMilestones = new Map<string, Map<FunnelMilestoneV1, number>>();
  const episodeScopes = new Map<string, string>();
  const claimedConversionObservations = new Set<string>();
  for (const scoped of input.funnelEvents) {
    assertAllowedKeys(
      scoped,
      new Set(["pageId", "channel", "event"]),
      "ANALYTICS_FUNNEL_SCOPE_UNKNOWN_FIELD_REJECTED",
    );
    requireToken(scoped.pageId, "ANALYTICS_PAGE_ID_INVALID", 64);
    if (scoped.channel !== "SALES" && scoped.channel !== "OUTREACH") {
      fail("ANALYTICS_FUNNEL_CHANNEL_INVALID");
    }
    const event = FunnelEventV1Schema.parse(scoped.event);
    asTimestamp(event.occurredAt, "ANALYTICS_FUNNEL_TIME_INVALID");
    const eventFingerprint = canonical(scoped);
    const seenFingerprint = seenFunnelEvents.get(event.eventId);
    if (seenFingerprint !== undefined) {
      if (seenFingerprint !== eventFingerprint) {
        fail("ANALYTICS_FUNNEL_DUPLICATE_CONFLICT");
      }
      funnelDuplicates += 1;
      continue;
    }
    seenFunnelEvents.set(event.eventId, eventFingerprint);
    const occurredAt = asTimestamp(event.occurredAt, "ANALYTICS_FUNNEL_TIME_INVALID");
    if (event.conversionEvidence !== null) {
      const observedAt = asTimestamp(
        event.conversionEvidence.observedAt,
        "ANALYTICS_FUNNEL_CONVERSION_OBSERVED_AT_INVALID",
      );
      if (observedAt > occurredAt) fail("ANALYTICS_FUNNEL_EVIDENCE_AFTER_EVENT");
    }
    if (!inWindow(occurredAt, fromMs, generatedAtMs)) {
      funnelOutsideWindow += 1;
    } else if (testPages.has(scoped.pageId)) {
      funnelTestPage += 1;
    } else if (scoped.channel === "OUTREACH") {
      funnelOutreachFromSales += 1;
    } else {
      if (event.conversionEvidence !== null) {
        if (claimedConversionObservations.has(event.conversionEvidence.observationId)) {
          fail("ANALYTICS_CONVERSION_OBSERVATION_REUSED");
        }
        claimedConversionObservations.add(event.conversionEvidence.observationId);
      }
      const episodeScope = canonical({
        pageId: scoped.pageId,
        channel: scoped.channel,
        subjectHash: event.subjectHash,
        conversationHash: event.conversationHash,
      });
      const knownScope = episodeScopes.get(event.episodeId);
      if (knownScope !== undefined && knownScope !== episodeScope) {
        fail("ANALYTICS_FUNNEL_EPISODE_SCOPE_CONFLICT");
      }
      episodeScopes.set(event.episodeId, episodeScope);
      funnelSets[event.milestone].add(event.episodeId);
      const milestones = episodeMilestones.get(event.episodeId) ?? new Map();
      const priorTime = milestones.get(event.milestone);
      if (priorTime === undefined || occurredAt < priorTime) milestones.set(event.milestone, occurredAt);
      episodeMilestones.set(event.episodeId, milestones);
    }
  }

  let outreachDuplicates = 0;
  let outreachOutsideWindow = 0;
  let outreachTestPage = 0;
  let outreachSent = 0;
  let outreachDelivered = 0;
  let outreachRead = 0;
  let outreachResponded = 0;
  let outreachPositive = 0;
  let outreachOptOut = 0;
  let outreachConverted = 0;
  const seenOutreachRecords = new Map<string, string>();
  for (const record of input.outreach) {
    validateOutreachRecord(record);
    const recordFingerprint = canonical(record);
    const seenFingerprint = seenOutreachRecords.get(record.recordHash);
    if (seenFingerprint !== undefined) {
      if (seenFingerprint !== recordFingerprint) {
        fail("ANALYTICS_OUTREACH_DUPLICATE_CONFLICT");
      }
      outreachDuplicates += 1;
      continue;
    }
    seenOutreachRecords.set(record.recordHash, recordFingerprint);
    const sentAt = asTimestamp(record.sentAt, "ANALYTICS_OUTREACH_SENT_TIME_INVALID");
    if (!inWindow(sentAt, fromMs, generatedAtMs)) {
      outreachOutsideWindow += 1;
    } else if (testPages.has(record.pageId)) {
      outreachTestPage += 1;
    } else {
      if (record.conversionEvidence !== null) {
        if (claimedConversionObservations.has(record.conversionEvidence.observationId)) {
          fail("ANALYTICS_CONVERSION_OBSERVATION_REUSED");
        }
        claimedConversionObservations.add(record.conversionEvidence.observationId);
      }
      outreachSent += 1;
      const deliveredByCutoff =
        record.deliveredAt !== null &&
        asTimestamp(record.deliveredAt, "ANALYTICS_OUTREACH_DELIVERED_TIME_INVALID") <= generatedAtMs;
      const readByCutoff =
        record.readAt !== null &&
        asTimestamp(record.readAt, "ANALYTICS_OUTREACH_READ_TIME_INVALID") <= generatedAtMs;
      const respondedByCutoff =
        record.respondedAt !== null &&
        asTimestamp(record.respondedAt, "ANALYTICS_OUTREACH_RESPONDED_TIME_INVALID") <= generatedAtMs;
      const convertedByCutoff =
        record.convertedAt !== null &&
        asTimestamp(record.convertedAt, "ANALYTICS_OUTREACH_CONVERTED_TIME_INVALID") <= generatedAtMs;
      if (deliveredByCutoff) outreachDelivered += 1;
      if (readByCutoff) outreachRead += 1;
      if (respondedByCutoff) outreachResponded += 1;
      if (record.positiveResponse && respondedByCutoff) outreachPositive += 1;
      if (record.optedOut && respondedByCutoff) outreachOptOut += 1;
      if (record.conversionEvidence !== null && convertedByCutoff) {
        const observedAt = asTimestamp(
          record.conversionEvidence.observedAt,
          "ANALYTICS_OUTREACH_CONVERSION_OBSERVED_AT_INVALID",
        );
        if (observedAt <= generatedAtMs) {
          outreachConverted += 1;
        }
      }
    }
  }

  const priceAsked = funnelSets.PRICE_ASKED.size;
  const sizeConsulted = funnelSets.SIZE_CONSULTED.size;
  const purchaseConfirmed = funnelSets.PURCHASE_CONFIRMED.size;
  const converted = funnelSets.SALE_CONVERTED.size;
  let priceToSizeTransitions = 0;
  let sizeToPurchaseTransitions = 0;
  let purchaseToConversionTransitions = 0;
  for (const milestones of episodeMilestones.values()) {
    const priceAt = milestones.get("PRICE_ASKED");
    const sizeAt = milestones.get("SIZE_CONSULTED");
    const purchaseAt = milestones.get("PURCHASE_CONFIRMED");
    const conversionAt = milestones.get("SALE_CONVERTED");
    if (priceAt !== undefined && sizeAt !== undefined && priceAt <= sizeAt) {
      priceToSizeTransitions += 1;
    }
    if (sizeAt !== undefined && purchaseAt !== undefined && sizeAt <= purchaseAt) {
      sizeToPurchaseTransitions += 1;
    }
    if (purchaseAt !== undefined && conversionAt !== undefined && purchaseAt <= conversionAt) {
      purchaseToConversionTransitions += 1;
    }
  }

  return {
    schemaVersion: 1,
    definitionVersion: input.definitionVersion,
    generatedAt: generatedAt.toISOString(),
    window: {
      months: ANALYTICS_BASELINE_MONTHS,
      from: from.toISOString(),
      to: generatedAt.toISOString(),
    },
    sales: {
      messages: salesMessages,
      conversations: salesConversations.size,
      customers: salesCustomers.size,
      funnel: {
        priceAskedEpisodes: priceAsked,
        sizeConsultedEpisodes: sizeConsulted,
        purchaseConfirmedEpisodes: purchaseConfirmed,
        convertedEpisodes: converted,
        priceToSizeRate: rate(priceToSizeTransitions, priceAsked),
        sizeToPurchaseRate: rate(sizeToPurchaseTransitions, sizeConsulted),
        purchaseToConversionRate: rate(purchaseToConversionTransitions, purchaseConfirmed),
      },
    },
    outreach: {
      sent: outreachSent,
      delivered: outreachDelivered,
      read: outreachRead,
      responded: outreachResponded,
      positiveResponses: outreachPositive,
      optOuts: outreachOptOut,
      converted: outreachConverted,
      responseRate: rate(outreachResponded, outreachSent),
      conversionRate: rate(outreachConverted, outreachSent),
    },
    exclusions: {
      historyDuplicates,
      historyOutsideWindow,
      historyTestPage,
      historyOutreachFromSales,
      funnelDuplicates,
      funnelOutsideWindow,
      funnelTestPage,
      funnelOutreachFromSales,
      outreachDuplicates,
      outreachOutsideWindow,
      outreachTestPage,
    },
  };
}

export type ReplayMediaPurpose =
  | "FULL_LOOK"
  | "AO"
  | "CHAN_VAY"
  | "QUAN"
  | "DETAIL_FABRIC"
  | "FEEDBACK"
  | "SIZE_GUIDE";

export interface ReplayFactSnapshot {
  readonly price: "NOT_REQUESTED" | "FRESH" | "STALE" | "MISSING";
  readonly size: "NOT_REQUESTED" | "RECOMMENDED" | "ASK_MORE" | "HANDOFF";
  readonly requestedMedia: ReplayMediaPurpose | null;
  readonly exactMediaAvailable: boolean;
  readonly policy: "NOT_REQUESTED" | "STACKING_ALLOWED" | "BLOCKED";
  readonly profile: "UNCHANGED" | "MERGED" | "CONFLICT";
  readonly channel: AnalyticsChannel;
}

export interface GoldenReplayTurnInput {
  readonly schemaVersion: 1;
  readonly eventHash: string;
  readonly occurredAt: string;
  readonly actor: "CUSTOMER" | "SYSTEM";
  readonly source: "SYNTHETIC" | "ANONYMIZED_HISTORY";
  /** Sanitized content only. QUARANTINED history must never enter replay. */
  readonly redactedText: string;
  readonly dlpStatus: "PASSED";
  readonly attachmentCount: number;
  /** Provider evidence is structured and never inferred from message text. */
  readonly providerEvidence: VerifiedClosedOrderTagEvidenceV1 | null;
  /** Immutable business inputs captured with the replay turn. */
  readonly facts: ReplayFactSnapshot;
}

export interface ReplayDecisionSnapshot {
  readonly schemaVersion: 1;
  readonly action: "REPLY" | "HANDOFF" | "NO_REPLY";
  readonly intent: string;
  readonly productId: string | null;
  readonly quoteStatus: "NOT_REQUESTED" | "QUOTED_VERIFIED" | "BLOCKED";
  readonly sizeStatus: "NOT_REQUESTED" | "RECOMMENDED" | "ASK_MORE" | "HANDOFF";
  readonly mediaPurposes: readonly ReplayMediaPurpose[];
  readonly funnelEvent: FunnelEventV1 | null;
  readonly handoffDecision: HandoffDecisionV2 | null;
  readonly reasonCodes: readonly string[];
}

export interface GoldenReplayTurn {
  readonly turnId: string;
  readonly input: GoldenReplayTurnInput;
  readonly expected: ReplayDecisionSnapshot;
}

export interface GoldenConversation {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly definitionVersion: string;
  readonly subjectHash: string;
  readonly conversationHash: string;
  readonly turns: readonly GoldenReplayTurn[];
}

export interface ReplayEvaluationContext {
  readonly scenarioId: string;
  readonly definitionVersion: string;
  readonly subjectHash: string;
  readonly conversationHash: string;
  readonly priorTurns: readonly GoldenReplayTurnInput[];
  readonly priorDecisions: readonly ReplayDecisionSnapshot[];
  readonly currentTurn: GoldenReplayTurnInput;
}

export type ReplayEvaluator = (
  context: ReplayEvaluationContext,
) => ReplayDecisionSnapshot | Promise<ReplayDecisionSnapshot>;

export type ReplayFailureCode =
  | "ACTUAL_MISMATCH"
  | "EVALUATOR_ERROR"
  | "INVARIANT_VIOLATION"
  | "NON_DETERMINISTIC";

export interface ReplayFailure {
  readonly scenarioId: string;
  readonly turnId: string;
  readonly code: ReplayFailureCode;
  readonly detail: string;
}

export interface ReplayReport {
  readonly scenarioId: string;
  readonly passed: boolean;
  readonly evaluatedTurns: number;
  readonly failures: readonly ReplayFailure[];
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateTurnInput(input: GoldenReplayTurnInput): void {
  assertNoRawPiiKeys(input);
  assertAllowedKeys(
    input,
    new Set([
      "schemaVersion",
      "eventHash",
      "occurredAt",
      "actor",
      "source",
      "redactedText",
      "dlpStatus",
      "attachmentCount",
      "providerEvidence",
      "facts",
    ]),
    "REPLAY_INPUT_UNKNOWN_FIELD_REJECTED",
  );
  if (input.schemaVersion !== 1) fail("REPLAY_INPUT_SCHEMA_UNSUPPORTED");
  requireHash(input.eventHash, "REPLAY_EVENT_HASH_INVALID");
  asTimestamp(input.occurredAt, "REPLAY_OCCURRED_AT_INVALID");
  if (input.actor !== "CUSTOMER" && input.actor !== "SYSTEM") {
    fail("REPLAY_ACTOR_INVALID");
  }
  if (input.source !== "SYNTHETIC" && input.source !== "ANONYMIZED_HISTORY") {
    fail("REPLAY_SOURCE_INVALID");
  }
  if (input.dlpStatus !== "PASSED") fail("REPLAY_DLP_STATUS_REJECTED");
  if (!input.redactedText.trim() || input.redactedText.length > 8_000) {
    fail("REPLAY_REDACTED_TEXT_INVALID");
  }
  assertNoPiiLikeContent(input.redactedText, "REPLAY_RAW_PII_CONTENT_REJECTED");
  if (!Number.isSafeInteger(input.attachmentCount) || input.attachmentCount < 0 || input.attachmentCount > 10) {
    fail("REPLAY_ATTACHMENT_COUNT_INVALID");
  }
  if (input.providerEvidence !== null) {
    VerifiedClosedOrderTagEvidenceV1Schema.parse(input.providerEvidence);
    asTimestamp(input.providerEvidence.observedAt, "REPLAY_PROVIDER_EVIDENCE_TIME_INVALID");
    if (input.actor !== "SYSTEM") fail("REPLAY_PROVIDER_EVIDENCE_ACTOR_INVALID");
  }
  assertAllowedKeys(
    input.facts,
    new Set([
      "price",
      "size",
      "requestedMedia",
      "exactMediaAvailable",
      "policy",
      "profile",
      "channel",
    ]),
    "REPLAY_FACTS_UNKNOWN_FIELD_REJECTED",
  );
  if (!(["NOT_REQUESTED", "FRESH", "STALE", "MISSING"] as const).includes(input.facts.price)) {
    fail("REPLAY_FACTS_PRICE_INVALID");
  }
  if (!(["NOT_REQUESTED", "RECOMMENDED", "ASK_MORE", "HANDOFF"] as const).includes(input.facts.size)) {
    fail("REPLAY_FACTS_SIZE_INVALID");
  }
  if (!(["NOT_REQUESTED", "STACKING_ALLOWED", "BLOCKED"] as const).includes(input.facts.policy)) {
    fail("REPLAY_FACTS_POLICY_INVALID");
  }
  if (!(["UNCHANGED", "MERGED", "CONFLICT"] as const).includes(input.facts.profile)) {
    fail("REPLAY_FACTS_PROFILE_INVALID");
  }
  if (
    input.facts.requestedMedia !== null &&
    !(["FULL_LOOK", "AO", "CHAN_VAY", "QUAN", "DETAIL_FABRIC", "FEEDBACK", "SIZE_GUIDE"] as const)
      .includes(input.facts.requestedMedia)
  ) {
    fail("REPLAY_FACTS_MEDIA_PURPOSE_INVALID");
  }
  if (input.facts.exactMediaAvailable && input.facts.requestedMedia === null) {
    fail("REPLAY_MEDIA_AVAILABILITY_WITHOUT_REQUEST");
  }
  if (input.facts.channel !== "SALES" && input.facts.channel !== "OUTREACH") {
    fail("REPLAY_FACTS_CHANNEL_INVALID");
  }
}

export function validateReplayDecision(decision: ReplayDecisionSnapshot): void {
  assertNoRawPiiKeys(decision);
  assertAllowedKeys(
    decision,
    new Set([
      "schemaVersion",
      "action",
      "intent",
      "productId",
      "quoteStatus",
      "sizeStatus",
      "mediaPurposes",
      "funnelEvent",
      "handoffDecision",
      "reasonCodes",
    ]),
    "REPLAY_DECISION_UNKNOWN_FIELD_REJECTED",
  );
  if (decision.schemaVersion !== 1) fail("REPLAY_DECISION_SCHEMA_UNSUPPORTED");
  requireToken(decision.intent, "REPLAY_INTENT_INVALID", 64);
  if (decision.productId !== null) requireToken(decision.productId, "REPLAY_PRODUCT_ID_INVALID");
  if (!["REPLY", "HANDOFF", "NO_REPLY"].includes(decision.action)) {
    fail("REPLAY_ACTION_INVALID");
  }
  if (!["NOT_REQUESTED", "QUOTED_VERIFIED", "BLOCKED"].includes(decision.quoteStatus)) {
    fail("REPLAY_QUOTE_STATUS_INVALID");
  }
  if (!["NOT_REQUESTED", "RECOMMENDED", "ASK_MORE", "HANDOFF"].includes(decision.sizeStatus)) {
    fail("REPLAY_SIZE_STATUS_INVALID");
  }
  if ((decision.action === "HANDOFF") !== (decision.handoffDecision !== null)) {
    fail("REPLAY_HANDOFF_ACTION_INCONSISTENT");
  }
  if (decision.handoffDecision !== null) {
    HandoffDecisionV2Schema.parse(decision.handoffDecision);
  }
  if (decision.funnelEvent !== null) {
    FunnelEventV1Schema.parse(decision.funnelEvent);
    asTimestamp(decision.funnelEvent.occurredAt, "REPLAY_FUNNEL_TIME_INVALID");
    if (decision.funnelEvent.conversionEvidence !== null) {
      asTimestamp(
        decision.funnelEvent.conversionEvidence.observedAt,
        "REPLAY_CONVERSION_EVIDENCE_TIME_INVALID",
      );
    }
  }
  if (decision.action === "NO_REPLY" && decision.mediaPurposes.length > 0) {
    fail("REPLAY_NO_REPLY_WITH_MEDIA");
  }
  if (new Set(decision.mediaPurposes).size !== decision.mediaPurposes.length) {
    fail("REPLAY_DUPLICATE_MEDIA_PURPOSE");
  }
  const mediaPurposes: readonly ReplayMediaPurpose[] = [
    "FULL_LOOK",
    "AO",
    "CHAN_VAY",
    "QUAN",
    "DETAIL_FABRIC",
    "FEEDBACK",
    "SIZE_GUIDE",
  ];
  for (const purpose of decision.mediaPurposes) {
    if (!mediaPurposes.includes(purpose)) fail("REPLAY_MEDIA_PURPOSE_INVALID");
  }
  if (new Set(decision.reasonCodes).size !== decision.reasonCodes.length) {
    fail("REPLAY_DUPLICATE_REASON_CODE");
  }
  for (const code of decision.reasonCodes) {
    if (!RULE_TOKEN.test(code)) fail("REPLAY_REASON_CODE_INVALID");
  }
}

function validateScenario(scenario: GoldenConversation): void {
  assertNoRawPiiKeys(scenario);
  assertAllowedKeys(
    scenario,
    new Set([
      "schemaVersion",
      "scenarioId",
      "definitionVersion",
      "subjectHash",
      "conversationHash",
      "turns",
    ]),
    "REPLAY_SCENARIO_UNKNOWN_FIELD_REJECTED",
  );
  if (scenario.schemaVersion !== 1) fail("REPLAY_SCENARIO_SCHEMA_UNSUPPORTED");
  requireToken(scenario.scenarioId, "REPLAY_SCENARIO_ID_INVALID");
  requireToken(scenario.definitionVersion, "REPLAY_DEFINITION_VERSION_INVALID");
  requireHash(scenario.subjectHash, "REPLAY_SUBJECT_HASH_INVALID");
  requireHash(scenario.conversationHash, "REPLAY_CONVERSATION_HASH_INVALID");
  if (scenario.turns.length === 0 || scenario.turns.length > 100) {
    fail("REPLAY_TURN_COUNT_INVALID");
  }
  const turnIds = new Set<string>();
  const eventHashes = new Set<string>();
  let lastTimestamp = Number.NEGATIVE_INFINITY;
  for (const turn of scenario.turns) {
    assertAllowedKeys(
      turn,
      new Set(["turnId", "input", "expected"]),
      "REPLAY_TURN_UNKNOWN_FIELD_REJECTED",
    );
    requireToken(turn.turnId, "REPLAY_TURN_ID_INVALID");
    if (turnIds.has(turn.turnId)) fail("REPLAY_TURN_ID_DUPLICATED");
    turnIds.add(turn.turnId);
    validateTurnInput(turn.input);
    if (eventHashes.has(turn.input.eventHash)) fail("REPLAY_EVENT_HASH_DUPLICATED");
    eventHashes.add(turn.input.eventHash);
    const timestamp = asTimestamp(turn.input.occurredAt, "REPLAY_OCCURRED_AT_INVALID");
    if (timestamp < lastTimestamp) fail("REPLAY_TURN_ORDER_INVALID");
    lastTimestamp = timestamp;
    validateReplayDecision(turn.expected);
    const expectedEvidence = turn.expected.funnelEvent?.conversionEvidence ?? null;
    if (canonical(expectedEvidence) !== canonical(turn.input.providerEvidence)) {
      fail("REPLAY_CONVERSION_EVIDENCE_NOT_BOUND_TO_INPUT");
    }
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, seen);
  return Object.freeze(value);
}

function replayContext(
  scenario: GoldenConversation,
  priorTurns: readonly GoldenReplayTurnInput[],
  priorDecisions: readonly ReplayDecisionSnapshot[],
  currentTurn: GoldenReplayTurnInput,
): ReplayEvaluationContext {
  return deepFreeze(
    cloneJson({
      scenarioId: scenario.scenarioId,
      definitionVersion: scenario.definitionVersion,
      subjectHash: scenario.subjectHash,
      conversationHash: scenario.conversationHash,
      priorTurns,
      priorDecisions,
      currentTurn,
    }),
  );
}

/** Runs each turn twice against an identical immutable context. */
export async function runGoldenReplay(
  scenario: GoldenConversation,
  evaluator: ReplayEvaluator,
): Promise<ReplayReport> {
  validateScenario(scenario);
  const failures: ReplayFailure[] = [];
  const priorTurns: GoldenReplayTurnInput[] = [];
  const priorDecisions: ReplayDecisionSnapshot[] = [];
  let evaluatedTurns = 0;

  for (const turn of scenario.turns) {
    evaluatedTurns += 1;
    let first: ReplayDecisionSnapshot;
    let second: ReplayDecisionSnapshot;
    try {
      first = deepFreeze(cloneJson(await evaluator(replayContext(scenario, priorTurns, priorDecisions, turn.input))));
      second = deepFreeze(cloneJson(await evaluator(replayContext(scenario, priorTurns, priorDecisions, turn.input))));
    } catch (error) {
      failures.push({
        scenarioId: scenario.scenarioId,
        turnId: turn.turnId,
        code: "EVALUATOR_ERROR",
        detail: error instanceof Error ? error.message : "UNKNOWN_EVALUATOR_ERROR",
      });
      break;
    }

    try {
      validateReplayDecision(first);
      validateReplayDecision(second);
    } catch (error) {
      failures.push({
        scenarioId: scenario.scenarioId,
        turnId: turn.turnId,
        code: "INVARIANT_VIOLATION",
        detail: error instanceof Error ? error.message : "UNKNOWN_INVARIANT_ERROR",
      });
      break;
    }

    if (canonical(first) !== canonical(second)) {
      failures.push({
        scenarioId: scenario.scenarioId,
        turnId: turn.turnId,
        code: "NON_DETERMINISTIC",
        detail: "the evaluator returned different structural decisions for the same context",
      });
      break;
    }
    if (canonical(first) !== canonical(turn.expected)) {
      failures.push({
        scenarioId: scenario.scenarioId,
        turnId: turn.turnId,
        code: "ACTUAL_MISMATCH",
        detail: "the structural decision did not match the golden expectation",
      });
      break;
    }

    priorTurns.push(deepFreeze(cloneJson(turn.input)));
    priorDecisions.push(first);
  }

  return {
    scenarioId: scenario.scenarioId,
    passed: failures.length === 0,
    evaluatedTurns,
    failures,
  };
}

export async function assertGoldenReplay(
  scenario: GoldenConversation,
  evaluator: ReplayEvaluator,
): Promise<void> {
  const report = await runGoldenReplay(scenario, evaluator);
  if (!report.passed) {
    throw new Error(
      `GOLDEN_REPLAY_FAILED:${report.failures
        .map((failure) => `${failure.turnId}:${failure.code}:${failure.detail}`)
        .join("|")}`,
    );
  }
}
