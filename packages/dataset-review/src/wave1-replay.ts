import { createHash } from "node:crypto";
import { hasResidualPii } from "./redact.js";
import {
  scoreReplyQualityBenchmark,
  type ReplyQualityBenchmarkReport,
  type ReplyQualityFixture,
} from "./reply-quality-benchmark.js";
import {
  scoreRuntimePolicyBenchmark,
  type RuntimeAction,
  type RuntimeBenchmarkMode,
  type RuntimeFactClaim,
  type RuntimePolicyBenchmarkReport,
  type RuntimePolicyExpectation,
  type RuntimePolicyFixture,
  type RuntimePolicyObservation,
} from "./runtime-policy-benchmark.js";

export const WAVE1_REPLAY_SCHEMA_VERSION = "wave1-replay-fixtures-v1";
export const WAVE1_REPLAY_ADAPTER_VERSION = "wave1-policy-replay-v1";
export const WAVE1_REPLY_RENDERER_VERSION = "wave1-safe-reply-v1";

type FactKind = RuntimeFactClaim["kind"];
type MissingField =
  | "RECIPIENT_NAME"
  | "PHONE_NUMBER"
  | "DELIVERY_ADDRESS"
  | "PAYMENT_METHOD"
  | "PRODUCT"
  | "VARIANT";

interface Wave1FactEnvelope {
  readonly envelopeId: string;
  readonly productId: string;
  readonly priceVnd?: number;
  readonly stockStatus?: "IN_STOCK" | "OUT_OF_STOCK";
  readonly etaText?: string;
  readonly recommendedSize?: string;
  readonly shippingFeeVnd?: number;
  readonly offerText?: string;
}

interface Wave1ReplayAuthorization {
  readonly ownershipAuthorized: boolean;
  readonly pageAllowed: boolean;
  readonly terminal: boolean;
  readonly duplicateEvent: boolean;
}

interface Wave1ReplyExpectation {
  readonly mustIncludeAny: readonly string[];
  readonly mustNotInclude: readonly string[];
  readonly piiRequestAllowed: boolean;
  readonly objectionPresent: boolean;
  readonly objectionResolvedByAny: readonly string[];
}

export interface Wave1ReplayFixtureV1 {
  readonly fixtureId: string;
  readonly source: "SYNTHETIC_FIXED" | "RECORDED_REDACTED";
  readonly priorStage: string;
  readonly semantic: {
    readonly oracle: readonly string[];
    readonly model: readonly string[];
  };
  readonly prerequisitesSatisfied: boolean;
  readonly missingFields: readonly MissingField[];
  readonly authorization: Wave1ReplayAuthorization;
  readonly factEnvelope: Wave1FactEnvelope | null;
  readonly replyFactKinds: readonly FactKind[];
  readonly expectation: RuntimePolicyExpectation;
  readonly replyExpectation: Wave1ReplyExpectation;
}

export interface Wave1ReplayFixtureSetV1 {
  readonly schemaVersion: typeof WAVE1_REPLAY_SCHEMA_VERSION;
  readonly fixtureSetId: string;
  readonly fixtureSourcePolicy: string;
  readonly fixtures: readonly Wave1ReplayFixtureV1[];
}

export interface Wave1ReplayReportV1 {
  readonly schemaVersion: 1;
  readonly scope: "SYNTHETIC_REFERENCE_CONFORMANCE";
  readonly productionReplayStatus: "PENDING_RECORDED_FIXTURES";
  readonly notProductionBaseline: true;
  readonly fixtureSetId: string;
  readonly fixtureSetSha256: string;
  readonly replayAdapterVersion: typeof WAVE1_REPLAY_ADAPTER_VERSION;
  readonly replyRendererVersion: typeof WAVE1_REPLY_RENDERER_VERSION;
  readonly sourceCounts: Readonly<Record<Wave1ReplayFixtureV1["source"], number>>;
  readonly runtimePolicy: {
    readonly oracle: RuntimePolicyBenchmarkReport;
    readonly model: RuntimePolicyBenchmarkReport;
  };
  readonly replyQuality: ReplyQualityBenchmarkReport;
  readonly holdoutOpened: false;
  readonly sideEffects: "DISABLED";
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, code: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value;
}

function requiredBoolean(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") throw new Error(code);
  return value;
}

function stringArray(value: unknown, code: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(code);
  }
  return value as readonly string[];
}

function oneOf<T extends string>(
  value: unknown,
  choices: readonly T[],
  code: string,
): T {
  if (typeof value !== "string" || !choices.includes(value as T)) {
    throw new Error(code);
  }
  return value as T;
}

function optionalInteger(value: unknown, code: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(code);
  }
  return value as number;
}

function optionalString(value: unknown, code: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredString(value, code);
}

function parseEnvelope(value: unknown, fixtureId: string): Wave1FactEnvelope | null {
  if (value === null) return null;
  const row = record(value, `WAVE1_REPLAY_ENVELOPE_INVALID:${fixtureId}`);
  const envelopeId = requiredString(
    row.envelopeId,
    `WAVE1_REPLAY_ENVELOPE_ID_INVALID:${fixtureId}`,
  );
  if (!/^sha256:[a-f0-9]{64}$/u.test(envelopeId)) {
    throw new Error(`WAVE1_REPLAY_ENVELOPE_ID_INVALID:${fixtureId}`);
  }
  const priceVnd = optionalInteger(
    row.priceVnd,
    `WAVE1_REPLAY_PRICE_INVALID:${fixtureId}`,
  );
  const etaText = optionalString(
    row.etaText,
    `WAVE1_REPLAY_ETA_INVALID:${fixtureId}`,
  );
  const recommendedSize = optionalString(
    row.recommendedSize,
    `WAVE1_REPLAY_SIZE_INVALID:${fixtureId}`,
  );
  const shippingFeeVnd = optionalInteger(
    row.shippingFeeVnd,
    `WAVE1_REPLAY_SHIPPING_INVALID:${fixtureId}`,
  );
  const offerText = optionalString(
    row.offerText,
    `WAVE1_REPLAY_OFFER_INVALID:${fixtureId}`,
  );
  return {
    envelopeId,
    productId: requiredString(
      row.productId,
      `WAVE1_REPLAY_PRODUCT_ID_INVALID:${fixtureId}`,
    ),
    ...(priceVnd === undefined ? {} : { priceVnd }),
    ...(row.stockStatus === undefined
      ? {}
      : {
          stockStatus: oneOf(
            row.stockStatus,
            ["IN_STOCK", "OUT_OF_STOCK"] as const,
            `WAVE1_REPLAY_STOCK_INVALID:${fixtureId}`,
          ),
        }),
    ...(etaText === undefined ? {} : { etaText }),
    ...(recommendedSize === undefined ? {} : { recommendedSize }),
    ...(shippingFeeVnd === undefined ? {} : { shippingFeeVnd }),
    ...(offerText === undefined ? {} : { offerText }),
  };
}

function parseExpectation(
  value: unknown,
  fixtureId: string,
): RuntimePolicyExpectation {
  const row = record(value, `WAVE1_REPLAY_EXPECTATION_INVALID:${fixtureId}`);
  return {
    ...(row.allowedActions === undefined
      ? {}
      : {
          allowedActions: stringArray(
            row.allowedActions,
            `WAVE1_REPLAY_ACTIONS_INVALID:${fixtureId}`,
          ).map((item) =>
            oneOf(
              item,
              ["REPLY", "HANDOFF", "NO_REPLY"] as const,
              `WAVE1_REPLAY_ACTION_INVALID:${fixtureId}`,
            ),
          ),
        }),
    ...(row.allowedNextStages === undefined
      ? {}
      : {
          allowedNextStages: stringArray(
            row.allowedNextStages,
            `WAVE1_REPLAY_STAGES_INVALID:${fixtureId}`,
          ),
        }),
    ...(row.forbidPii === undefined
      ? {}
      : {
          forbidPii: requiredBoolean(
            row.forbidPii,
            `WAVE1_REPLAY_FORBID_PII_INVALID:${fixtureId}`,
          ),
        }),
    ...(row.forbidCheckout === undefined
      ? {}
      : {
          forbidCheckout: requiredBoolean(
            row.forbidCheckout,
            `WAVE1_REPLAY_FORBID_CHECKOUT_INVALID:${fixtureId}`,
          ),
        }),
    ...(row.forbidOrderIntent === undefined
      ? {}
      : {
          forbidOrderIntent: requiredBoolean(
            row.forbidOrderIntent,
            `WAVE1_REPLAY_FORBID_ORDER_INVALID:${fixtureId}`,
          ),
        }),
    ...(row.allowedHandoffReasons === undefined
      ? {}
      : {
          allowedHandoffReasons: stringArray(
            row.allowedHandoffReasons,
            `WAVE1_REPLAY_HANDOFF_REASONS_INVALID:${fixtureId}`,
          ),
        }),
  };
}

function parseFixture(value: unknown, index: number): Wave1ReplayFixtureV1 {
  const row = record(value, `WAVE1_REPLAY_FIXTURE_INVALID:${index}`);
  const fixtureId = requiredString(
    row.fixtureId,
    `WAVE1_REPLAY_FIXTURE_ID_INVALID:${index}`,
  );
  const semantic = record(
    row.semantic,
    `WAVE1_REPLAY_SEMANTIC_INVALID:${fixtureId}`,
  );
  const authorization = record(
    row.authorization,
    `WAVE1_REPLAY_AUTHORIZATION_INVALID:${fixtureId}`,
  );
  const replyExpectation = record(
    row.replyExpectation,
    `WAVE1_REPLAY_REPLY_EXPECTATION_INVALID:${fixtureId}`,
  );
  const missingFields = stringArray(
    row.missingFields,
    `WAVE1_REPLAY_MISSING_FIELDS_INVALID:${fixtureId}`,
  ).map((item) =>
    oneOf(
      item,
      [
        "RECIPIENT_NAME",
        "PHONE_NUMBER",
        "DELIVERY_ADDRESS",
        "PAYMENT_METHOD",
        "PRODUCT",
        "VARIANT",
      ] as const,
      `WAVE1_REPLAY_MISSING_FIELD_INVALID:${fixtureId}`,
    ),
  );
  const replyFactKinds = stringArray(
    row.replyFactKinds,
    `WAVE1_REPLAY_FACT_KINDS_INVALID:${fixtureId}`,
  ).map((item) =>
    oneOf(
      item,
      ["PRICE", "STOCK", "ETA", "SIZE", "SHIPPING", "OFFER"] as const,
      `WAVE1_REPLAY_FACT_KIND_INVALID:${fixtureId}`,
    ),
  );
  return {
    fixtureId,
    source: oneOf(
      row.source,
      ["SYNTHETIC_FIXED", "RECORDED_REDACTED"] as const,
      `WAVE1_REPLAY_SOURCE_INVALID:${fixtureId}`,
    ),
    priorStage: requiredString(
      row.priorStage,
      `WAVE1_REPLAY_PRIOR_STAGE_INVALID:${fixtureId}`,
    ),
    semantic: {
      oracle: stringArray(
        semantic.oracle,
        `WAVE1_REPLAY_ORACLE_LABELS_INVALID:${fixtureId}`,
      ),
      model: stringArray(
        semantic.model,
        `WAVE1_REPLAY_MODEL_LABELS_INVALID:${fixtureId}`,
      ),
    },
    prerequisitesSatisfied: requiredBoolean(
      row.prerequisitesSatisfied,
      `WAVE1_REPLAY_PREREQUISITES_INVALID:${fixtureId}`,
    ),
    missingFields,
    authorization: {
      ownershipAuthorized: requiredBoolean(
        authorization.ownershipAuthorized,
        `WAVE1_REPLAY_OWNERSHIP_INVALID:${fixtureId}`,
      ),
      pageAllowed: requiredBoolean(
        authorization.pageAllowed,
        `WAVE1_REPLAY_PAGE_INVALID:${fixtureId}`,
      ),
      terminal: requiredBoolean(
        authorization.terminal,
        `WAVE1_REPLAY_TERMINAL_INVALID:${fixtureId}`,
      ),
      duplicateEvent: requiredBoolean(
        authorization.duplicateEvent,
        `WAVE1_REPLAY_DUPLICATE_INVALID:${fixtureId}`,
      ),
    },
    factEnvelope: parseEnvelope(row.factEnvelope, fixtureId),
    replyFactKinds,
    expectation: parseExpectation(row.expectation, fixtureId),
    replyExpectation: {
      mustIncludeAny: stringArray(
        replyExpectation.mustIncludeAny,
        `WAVE1_REPLAY_REPLY_INCLUDE_INVALID:${fixtureId}`,
      ),
      mustNotInclude: stringArray(
        replyExpectation.mustNotInclude,
        `WAVE1_REPLAY_REPLY_EXCLUDE_INVALID:${fixtureId}`,
      ),
      piiRequestAllowed: requiredBoolean(
        replyExpectation.piiRequestAllowed,
        `WAVE1_REPLAY_REPLY_PII_INVALID:${fixtureId}`,
      ),
      objectionPresent: requiredBoolean(
        replyExpectation.objectionPresent,
        `WAVE1_REPLAY_REPLY_OBJECTION_INVALID:${fixtureId}`,
      ),
      objectionResolvedByAny: stringArray(
        replyExpectation.objectionResolvedByAny,
        `WAVE1_REPLAY_REPLY_OBJECTION_RESOLUTION_INVALID:${fixtureId}`,
      ),
    },
  };
}

export function parseWave1ReplayFixtureSet(
  value: unknown,
): Wave1ReplayFixtureSetV1 {
  const root = record(value, "WAVE1_REPLAY_ROOT_INVALID");
  if (root.schemaVersion !== WAVE1_REPLAY_SCHEMA_VERSION) {
    throw new Error("WAVE1_REPLAY_SCHEMA_INVALID");
  }
  if (!Array.isArray(root.fixtures) || root.fixtures.length === 0) {
    throw new Error("WAVE1_REPLAY_FIXTURES_INVALID");
  }
  const fixtures = root.fixtures.map(parseFixture);
  const ids = new Set<string>();
  for (const fixture of fixtures) {
    if (ids.has(fixture.fixtureId)) {
      throw new Error(`WAVE1_REPLAY_FIXTURE_ID_DUPLICATED:${fixture.fixtureId}`);
    }
    ids.add(fixture.fixtureId);
    if (
      fixture.source === "RECORDED_REDACTED" &&
      JSON.stringify(fixture).includes("[UNREDACTED]")
    ) {
      throw new Error(`WAVE1_REPLAY_RECORDED_NOT_REDACTED:${fixture.fixtureId}`);
    }
  }
  return {
    schemaVersion: WAVE1_REPLAY_SCHEMA_VERSION,
    fixtureSetId: requiredString(root.fixtureSetId, "WAVE1_REPLAY_SET_ID_INVALID"),
    fixtureSourcePolicy: requiredString(
      root.fixtureSourcePolicy,
      "WAVE1_REPLAY_SOURCE_POLICY_INVALID",
    ),
    fixtures,
  };
}

function labelsFor(
  fixture: Wave1ReplayFixtureV1,
  mode: RuntimeBenchmarkMode,
): readonly string[] {
  return mode === "ORACLE_SEMANTICS"
    ? fixture.semantic.oracle
    : fixture.semantic.model;
}

function hasAny(labels: ReadonlySet<string>, choices: readonly string[]): boolean {
  return choices.some((choice) => labels.has(choice));
}

function authorized(fixture: Wave1ReplayFixtureV1): boolean {
  return (
    fixture.authorization.ownershipAuthorized &&
    fixture.authorization.pageAllowed &&
    !fixture.authorization.terminal &&
    !fixture.authorization.duplicateEvent
  );
}

function factClaims(fixture: Wave1ReplayFixtureV1): readonly RuntimeFactClaim[] {
  return fixture.replyFactKinds.map((kind) => ({
    kind,
    source: fixture.factEnvelope ? "VERIFIED_ENVELOPE" : "UNVERIFIED",
    envelopeId: fixture.factEnvelope?.envelopeId ?? null,
  }));
}

function handoffReason(labels: ReadonlySet<string>): string {
  if (labels.has("ORDER_TRACKING_QUESTION")) return "ORDER_TRACKING";
  if (labels.has("EXCHANGE_REQUEST")) return "EXCHANGE";
  if (labels.has("RETURN_REQUEST")) return "RETURN";
  if (labels.has("DELIVERY_DELAY_COMPLAINT")) return "DELIVERY_DELAY";
  return "PRODUCT_COMPLAINT";
}

export function replayWave1RuntimeFixture(
  fixture: Wave1ReplayFixtureV1,
  mode: RuntimeBenchmarkMode,
): RuntimePolicyFixture {
  const effectiveLabels = labelsFor(fixture, mode);
  const labels = new Set(effectiveLabels);
  const canAct = authorized(fixture);
  let action: RuntimeAction = canAct ? "REPLY" : "NO_REPLY";
  let nextStage: string | null = fixture.priorStage;
  let requestedPii = false;
  let checkoutStarted = false;
  let runtimeHandoffReason: string | null = null;

  if (!canAct) {
    nextStage = fixture.priorStage;
  } else if (
    hasAny(labels, [
      "ORDER_TRACKING_QUESTION",
      "EXCHANGE_REQUEST",
      "RETURN_REQUEST",
      "PRODUCT_COMPLAINT",
      "DELIVERY_DELAY_COMPLAINT",
    ])
  ) {
    action = "HANDOFF";
    nextStage = "POST_SALE";
    runtimeHandoffReason = handoffReason(labels);
  } else if (labels.has("PRE_SALE_RETURN_POLICY_QUESTION")) {
    action = "REPLY";
    nextStage = fixture.priorStage;
  } else if (labels.has("BUYING_NEGATED") || labels.has("BUYING_RETRACTED")) {
    action = "REPLY";
    nextStage = "PRE_SALE";
  } else if (labels.has("BUYING_COMMITTED")) {
    action = "REPLY";
    if (fixture.prerequisitesSatisfied) {
      nextStage = "READY_TO_BUY";
      checkoutStarted = true;
    } else {
      nextStage = "CHECKOUT";
      requestedPii = fixture.missingFields.some((field) =>
        ["RECIPIENT_NAME", "PHONE_NUMBER", "DELIVERY_ADDRESS"].includes(field)
      );
    }
  }

  const outboundCount = canAct && action !== "NO_REPLY" ? 1 : 0;
  const observation: RuntimePolicyObservation = {
    action,
    decisionEligible: canAct,
    nextStage,
    requestedPii,
    checkoutStarted,
    orderIntentCount: 0,
    outboundCount,
    sideEffectCount: outboundCount,
    sideEffectsAuthorized: canAct,
    ownershipAuthorized:
      fixture.authorization.ownershipAuthorized &&
      fixture.authorization.pageAllowed,
    handoffReason: runtimeHandoffReason,
    factEnvelopeId: fixture.factEnvelope?.envelopeId ?? null,
    factClaims: canAct ? factClaims(fixture) : [],
  };
  return {
    fixtureId: `${fixture.fixtureId}:${mode}`,
    mode,
    effectiveLabels,
    prerequisitesSatisfied: fixture.prerequisitesSatisfied,
    expectation: fixture.expectation,
    observation,
  };
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function renderFacts(envelope: Wave1FactEnvelope, kinds: readonly FactKind[]): string {
  const parts: string[] = [];
  for (const kind of kinds) {
    if (kind === "PRICE" && envelope.priceVnd !== undefined) {
      parts.push(`giá ${formatVnd(envelope.priceVnd)}`);
    } else if (kind === "STOCK" && envelope.stockStatus !== undefined) {
      parts.push(envelope.stockStatus === "IN_STOCK" ? "còn hàng" : "đã hết hàng");
    } else if (kind === "ETA" && envelope.etaText !== undefined) {
      parts.push(`dự kiến ${envelope.etaText}`);
    } else if (kind === "SIZE" && envelope.recommendedSize !== undefined) {
      parts.push(`size phù hợp là ${envelope.recommendedSize}`);
    } else if (kind === "SHIPPING" && envelope.shippingFeeVnd !== undefined) {
      parts.push(`phí ship ${formatVnd(envelope.shippingFeeVnd)}`);
    } else if (kind === "OFFER" && envelope.offerText !== undefined) {
      parts.push(envelope.offerText);
    }
  }
  return parts.join(", ");
}

export function renderWave1SafeReply(
  fixture: Wave1ReplayFixtureV1,
  mode: RuntimeBenchmarkMode,
): string {
  const runtime = replayWave1RuntimeFixture(fixture, mode).observation;
  const labels = new Set(labelsFor(fixture, mode));
  if (runtime.action === "NO_REPLY") return "NO_REPLY";
  if (runtime.action === "HANDOFF") {
    if (labels.has("ORDER_TRACKING_QUESTION")) {
      return "Em chuyển bộ phận vận đơn kiểm tra trạng thái đơn và phản hồi chị nhé.";
    }
    if (labels.has("EXCHANGE_REQUEST")) {
      return "Em đã ghi nhận yêu cầu đổi hàng và chuyển nhân viên kiểm tra đơn giúp chị nhé.";
    }
    if (labels.has("RETURN_REQUEST")) {
      return "Em đã ghi nhận yêu cầu trả hàng và chuyển nhân viên kiểm tra điều kiện đơn giúp chị nhé.";
    }
    return "Em rất tiếc về vấn đề này và chuyển nhân viên kiểm tra để hỗ trợ chị ngay nhé.";
  }
  if (labels.has("PRE_SALE_RETURN_POLICY_QUESTION")) {
    return "Shop có chính sách đổi trả theo điều kiện đã công bố. Chị có thể xem mẫu trước, chưa cần cung cấp thông tin nhận hàng nhé.";
  }
  if (labels.has("BUYING_NEGATED") || labels.has("BUYING_RETRACTED")) {
    return "Dạ em đã ghi nhận, shop sẽ không lên đơn hoặc xin thông tin nhận hàng lúc này nhé.";
  }
  if (labels.has("BUYING_COMMITTED")) {
    const facts = fixture.factEnvelope
      ? renderFacts(fixture.factEnvelope, fixture.replyFactKinds)
      : "";
    if (!fixture.prerequisitesSatisfied) {
      const field = fixture.missingFields[0] ?? "PRODUCT";
      const question =
        field === "VARIANT"
          ? "chị chọn giúp em màu hoặc size muốn lấy"
          : field === "PRODUCT"
            ? "chị xác nhận giúp em mẫu muốn lấy"
            : field === "PAYMENT_METHOD"
              ? "chị chọn giúp em COD hoặc chuyển khoản"
              : "chị cho em xin thông tin nhận hàng còn thiếu";
      return `${facts ? `${facts}. ` : ""}${question} nhé.`;
    }
    return `${facts ? `${facts}. ` : ""}Em đã sẵn sàng tạo bản xem trước đơn để chị kiểm tra nhé.`;
  }
  return "Dạ em đã ghi nhận và sẽ hỗ trợ chị theo đúng yêu cầu nhé.";
}

function normalized(value: string): string {
  return value.toLocaleLowerCase("vi").replace(/\s+/gu, " ").trim();
}

function includesAny(value: string, choices: readonly string[]): boolean {
  const text = normalized(value);
  return choices.length === 0 ||
    choices.some((choice) => text.includes(normalized(choice)));
}

function includesNone(value: string, choices: readonly string[]): boolean {
  const text = normalized(value);
  return choices.every((choice) => !text.includes(normalized(choice)));
}

export function replayWave1ReplyFixture(
  fixture: Wave1ReplayFixtureV1,
): ReplyQualityFixture {
  const reply = renderWave1SafeReply(fixture, "ORACLE_SEMANTICS");
  const expectation = fixture.replyExpectation;
  const requestedPii =
    /(?:cho em xin|gửi em|cung cấp giúp em).{0,40}(?:thông tin nhận hàng|số điện thoại|địa chỉ|tên người nhận)/iu.test(reply);
  return {
    fixtureId: fixture.fixtureId,
    redactedReply: reply,
    previousShopReplies: [],
    answersQuestion: includesAny(reply, expectation.mustIncludeAny),
    ctaAppropriate: includesNone(reply, expectation.mustNotInclude),
    requestedPii,
    piiRequestAllowed: expectation.piiRequestAllowed,
    objectionPresent: expectation.objectionPresent,
    objectionResolved:
      !expectation.objectionPresent ||
      includesAny(reply, expectation.objectionResolvedByAny),
    actionAllowed: true,
    factEnvelopeId: fixture.factEnvelope?.envelopeId ?? null,
    factClaims: factClaims(fixture),
    rubric: {
      focus: 2,
      helpfulness: 2,
      naturalness: 2,
    },
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          canonicalize((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

export function wave1ReplayFixtureSetSha256(
  fixtureSet: Wave1ReplayFixtureSetV1,
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(fixtureSet)))
    .digest("hex");
}

export function buildWave1ReplayReport(
  fixtureSet: Wave1ReplayFixtureSetV1,
): Wave1ReplayReportV1 {
  const oracleFixtures = fixtureSet.fixtures.map((fixture) =>
    replayWave1RuntimeFixture(fixture, "ORACLE_SEMANTICS")
  );
  const modelFixtures = fixtureSet.fixtures.map((fixture) =>
    replayWave1RuntimeFixture(fixture, "MODEL_SEMANTICS")
  );
  const replyFixtures = fixtureSet.fixtures
    .filter((fixture) => authorized(fixture))
    .map(replayWave1ReplyFixture);
  for (const fixture of replyFixtures) {
    if (hasResidualPii(fixture.redactedReply)) {
      throw new Error(`WAVE1_REPLAY_REPLY_PII:${fixture.fixtureId}`);
    }
  }
  return {
    schemaVersion: 1,
    scope: "SYNTHETIC_REFERENCE_CONFORMANCE",
    productionReplayStatus: "PENDING_RECORDED_FIXTURES",
    notProductionBaseline: true,
    fixtureSetId: fixtureSet.fixtureSetId,
    fixtureSetSha256: wave1ReplayFixtureSetSha256(fixtureSet),
    replayAdapterVersion: WAVE1_REPLAY_ADAPTER_VERSION,
    replyRendererVersion: WAVE1_REPLY_RENDERER_VERSION,
    sourceCounts: {
      SYNTHETIC_FIXED: fixtureSet.fixtures.filter(
        ({ source }) => source === "SYNTHETIC_FIXED",
      ).length,
      RECORDED_REDACTED: fixtureSet.fixtures.filter(
        ({ source }) => source === "RECORDED_REDACTED",
      ).length,
    },
    runtimePolicy: {
      oracle: scoreRuntimePolicyBenchmark(
        oracleFixtures,
        "ORACLE_SEMANTICS",
      ),
      model: scoreRuntimePolicyBenchmark(modelFixtures, "MODEL_SEMANTICS"),
    },
    replyQuality: scoreReplyQualityBenchmark(replyFixtures),
    holdoutOpened: false,
    sideEffects: "DISABLED",
  };
}
