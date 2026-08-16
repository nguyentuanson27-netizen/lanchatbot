import { createHash } from "node:crypto";
import {
  buildCanonicalDecisionEvidenceV1,
  buildProtectedClaimsFromVerifiedFactSetV1,
  buildProtectedMediaClaimsV1,
  evaluateDeterministicEffectReadinessV1,
  hashProtectedClaimSetV1,
  extractCustomerMeasurements,
  assembleReply,
  buildVerifiedFactBlocks,
  mergeCustomerProfile,
  normalizeProductCode,
  ProductSearchService,
  recommendSize,
  createVerifiedSizeRecommendationClaim,
  selectProductMediaV2,
  guardAgentProposal,
  selectImages,
  verifiedImageUrls,
  applyWave2ReplyPolicy,
  decideWave2SalesStrategy,
  detectBuyingSignal,
  type Wave2StrategyDecision,
  type CatalogFactQuery,
  type CustomerImageIntent,
  type ImageSelectionPurpose,
  type MediaProductSearchResult,
  type StableProductDocument,
  type CustomerProfileFieldEvidence,
  type CanonicalDecisionEvidenceV1,
} from "@lana/business-tools";
import {
  BusinessFactQueriesV2Schema,
  canonicalJsonV1,
  type AgentProposalV1,
  type BusinessFactQueriesV2,
  type BusinessFactEnvelopeV1,
  type CustomerProfileV1,
  type GroundedReplyDraftV1,
  type HandoffReasonV2,
  type InboundMessageV1,
  type MediaPartialResolutionPolicyV1,
  type MultiProductResolutionPolicyV1,
  type CustomerUrlPolicyV1,
  type MeasurementKind,
  type ProductComponentRole,
  type ProductFactsV2,
  type RequestedBusinessFactV2,
  type SizeRecommendationProtectedClaimV1,
  type DeterministicEffectReadinessV1,
  FinalTurnEvidenceV2Schema,
  ProductBindingV2Schema,
  type ProtectedClaimV1,
} from "@lana/contracts";
import type {
  RuntimePolicyChannel,
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
  StartupConfirmationBehaviorMode,
  RuntimeBehaviorModeResolution,
  SalesCycleRuntimeState,
} from "@lana/chat-runtime";
import {
  decideRuntimeMultiItemOffer,
  outboundRuntimePolicy,
  runtimePolicyAuditReference,
  startupBehaviorModeResolution,
} from "@lana/chat-runtime";
import {
  applyInboundEvent,
  applySilentHandoff,
  createConversationState,
  decideHandoffFallbackV2,
  type ConversationState,
  type HandoffDirective,
  type HandoffReason,
  type InboundConversationEvent,
  type ObjectionType,
  type PancakeTagObservation,
  type SalesStage,
} from "@lana/conversation-engine";
import type {
  ClaimedInbound,
  ClaimedInboundBatch,
  InboxBatchLease,
  RealtimeCommitInput,
  RealtimeCommitResult,
  ContextV2CapturePlan,
  RealtimeDecisionEventPlan,
  RealtimeInboxBatchGuard,
  RealtimeMetaMessageUnit,
  RealtimeSalesCyclePlan,
  ShadowContextMessage,
} from "@lana/database";
import { redactAnalyticsMessage } from "@lana/database";
import type { InboundEnvelopeV1 } from "@lana/meta-webhook";
import type { PancakeHandoffAdapter } from "@lana/pancake-handoff";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { VerifiedVariantResult } from "./realtime-sales-catalog.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";
import type { BaselineModelCapability } from "./vertex-baseline.js";
import type { ChatHistoryPort } from "./redis-chat-history.js";
import {
  aggregateMedia,
  aggregateVideoFrames,
  decideMediaBatchDisposition,
  extractAdProductCodes,
  mediaItemFromSearch,
  selectedProductId,
  type MediaAggregation,
  type MediaAnalysisItem,
  type MediaPartialResolutionPolicy,
} from "./media-resolution.js";
import {
  classifyCustomerUrls,
  customerUrlItemAuthorizesProduct,
  redactCustomerUrlsForModel,
  verifyCustomerUrlExplanationProposal,
  type CustomerUrlDecision,
  type CustomerUrlDisposition,
} from "./customer-url-policy.js";
import {
  decideMultiProductResolution,
  type MultiProductResolutionPolicy,
  verifyMultiProductClarificationProposal,
} from "./multi-product-clarification.js";
import type {
  RealtimeMediaRecognition,
  RealtimeMediaRecognitionService,
} from "./realtime-media-recognition.js";
import { buildRealtimeProductFactsV2 } from "./realtime-product-facts-v2.js";
import {
  blockedContextV2Capture,
  buildContextV2Capture,
} from "./context-v2.js";
import type { VideoFrameExtraction } from "./video-frame-extractor.js";
import { evaluateSizeChartEligibility } from "./size-chart-eligibility.js";
import { mapWithBoundedConcurrency } from "./bounded-concurrency.js";

const BUSINESS_FACT_QUERY_CONCURRENCY = 3;
const MAX_INBOUND_IMAGE_ATTACHMENTS = 10;
import { sizeChartTarget } from "./size-chart-target.js";
import {
  createRealtimeSalesState,
  evaluateRealtimeSalesCycle,
  type RealtimeSalesCycleOutput,
  type RealtimeSalesCycleTelemetry,
} from "./realtime-sales-cycle.js";
import {
  classifyPreSalePolicyIntent,
  renderPreSalePolicyReply,
} from "./pre-sale-policy.js";

import { deriveAdLeadQualification } from "./ad-lead-qualification.js";
import {
  buildDecisionObservabilityV1,
  protectedClaimReasonCodes,
  type BuildDecisionObservabilityInput,
  type ProtectedClaimValidationSummary,
} from "./decision-observability.js";
export interface RealtimeInboxPort {
  claimNext(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedInbound<InboundEnvelopeV1> | null>;
  complete(inboxId: string, leaseToken: string): Promise<boolean>;
  retry(
    inboxId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean>;
  failPermanent(
    inboxId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean>;
  claimNextBatch?(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedInboundBatch<InboundEnvelopeV1> | null>;
  completeBatch?(
    batch: InboxBatchLease,
    requireCurrentGeneration?: boolean,
  ): Promise<boolean>;
  isBatchCurrent?(batch: InboxBatchLease): Promise<boolean>;
  retryBatch?(
    batch: InboxBatchLease,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean>;
  failBatchPermanent?(
    batch: InboxBatchLease,
    errorCode: string,
  ): Promise<boolean>;
}

interface RunnerInboundBatch extends ClaimedInboundBatch<InboundEnvelopeV1> {
  readonly nativeBatch: boolean;
}

type BatchCommitStatus =
  | "COMMITTED"
  | "SUPERSEDED"
  | "NOT_REQUESTED"
  | "INBOX_ONLY";

function activeMediaPartialResolutionPolicy(
  resolution: RuntimePolicyResolution | null,
): MediaPartialResolutionPolicy {
  if (resolution?.bundle?.sideEffects !== "LIVE_OUTBOUND") return "LEGACY";
  const selected: MediaPartialResolutionPolicyV1 | undefined =
    resolution.bundle.artifacts?.closingStrategy?.mediaPartialResolutionPolicy;
  return selected ?? "LEGACY";
}

function activeMultiProductResolutionPolicy(
  resolution: RuntimePolicyResolution | null,
): MultiProductResolutionPolicy {
  const bundle = outboundRuntimePolicy(resolution);
  if (!bundle) return "LEGACY";
  const selected: MultiProductResolutionPolicyV1 | undefined =
    bundle.artifacts?.closingStrategy?.multiProductResolutionPolicy;
  return selected ?? "LEGACY";
}

function activeCustomerUrlPolicy(
  resolution: RuntimePolicyResolution | null,
): CustomerUrlPolicyV1 {
  const bundle = outboundRuntimePolicy(resolution);
  return bundle?.artifacts?.closingStrategy?.customerUrlPolicy ?? "STRICT_BLOCK_ALL";
}

const CUSTOMER_URL_SAFE_FALLBACK_REPLY =
  "Em kh\u00f4ng th\u1ec3 m\u1edf li\u00ean k\u1ebft n\u00e0y an to\u00e0n. Ch\u1ecb g\u1eedi m\u00e3 s\u1ea3n ph\u1ea9m ho\u1eb7c \u1ea3nh \u0111\u1ec3 em ki\u1ec3m tra nh\u00e9.";

function deterministicUuid(input: string): string {
  const hash = createHash("sha256").update(input).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

const canonicalJson = canonicalJsonV1;

function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function inboxRetryDelaySeconds(attemptCount: number, seed: string): number {
  const boundedAttempt = Math.max(0, Math.min(30, Math.floor(attemptCount)));
  const baseSeconds = Math.min(300, 2 ** boundedAttempt);
  const sample = Number.parseInt(
    createHash("sha256").update(seed).digest("hex").slice(0, 8),
    16,
  ) / 0xffff_ffff;
  const jittered = Math.round(baseSeconds * (0.8 + sample * 0.4));
  return Math.max(1, Math.min(300, jittered));
}

function batchCommitStatus(result: RealtimeCommitResult): BatchCommitStatus {
  return result.inboxBatchStatus ?? "NOT_REQUESTED";
}

function contextFingerprint(message: ShadowContextMessage): string {
  return JSON.stringify([
    message.direction,
    message.senderType,
    message.messageType,
    message.text,
    message.attachmentCount,
    message.occurredAt,
  ]);
}

export type ExplicitCustomerBusinessIntent = "PRICE" | "STOCK" | "SIZE" | "ETA";

export function productCodeOnly(value: string): string | null {
  const stripped = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .trim()
    .replace(/^(?:(?:ma|mau|sp|san\s*pham)\s*){1,2}[:#._-]?\s*/iu, "")
    .trim();
  if (!/^[A-Za-z]{1,6}\s*[-_.]?\s*\d{1,8}[A-Za-z0-9]*$/u.test(stripped)) {
    return null;
  }
  const normalized = normalizeProductCode(stripped);
  return /^[A-Z]{1,6}\d{1,8}[A-Z0-9]*$/u.test(normalized)
    ? normalized
    : null;
}

export function explicitCustomerBusinessIntent(
  value: string,
): ExplicitCustomerBusinessIntent | null {
  const text = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLowerCase();
  if (
    hasCustomerMeasurementSignal(value) ||
    hasSizeOnlyContinuationSignal(value) ||
    /\b(size|sz|kich co|co nao|mac co)\b/u.test(text)
  ) return "SIZE";
  if (/\b(bao lau|khi nao|may ngay|ngay nao|giao den|nhan hang|eta)\b/u.test(text)) {
    return "ETA";
  }
  if (/\b(gia|bao nhieu|bn|nhieu tien|price)\b/u.test(text)) return "PRICE";
  if (/\b(con|het|ton|co hang|san hang|available)\b/u.test(text)) return "STOCK";
  // A product code without another explicit business intent means the customer
  // wants the standard product-info card, which starts with the verified price.
  if (productCodeOnly(value) !== null || extractAdProductCodes(value).length > 0) return "PRICE";
  return null;
}

export function explicitCustomerBusinessIntents(
  value: string,
): readonly RequestedBusinessFactV2[] {
  const text = asciiFold(value);
  const intents: RequestedBusinessFactV2[] = [];
  const add = (intent: RequestedBusinessFactV2): void => {
    if (!intents.includes(intent)) intents.push(intent);
  };
  if (/\b(gia|bao nhieu|bn|nhieu tien|price)\b/u.test(text)) add("PRICE");
  if (/\b(con|het|ton|co hang|san hang|available)\b/u.test(text)) add("STOCK");
  if (
    hasCustomerMeasurementSignal(value) ||
    hasSizeOnlyContinuationSignal(value) ||
    /\b(size|sz|kich co|co nao|mac co)\b/u.test(text)
  ) add("SIZE");
  if (/\b(bao lau|khi nao|may ngay|ngay nao|giao den|nhan hang|eta)\b/u.test(text)) {
    add("ETA");
  }
  if (
    intents.length === 0 &&
    (productCodeOnly(value) !== null || extractAdProductCodes(value).length > 0)
  ) add("PRICE");
  return intents;
}

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLowerCase();
}

const MEASUREMENT_SIGNAL_TIME = "2000-01-01T00:00:00.000Z";
const MEASUREMENT_SIGNAL_HASH = "0".repeat(64);

export function hasCustomerMeasurementSignal(value: string): boolean {
  return extractCustomerMeasurements({
    text: value,
    observedAt: MEASUREMENT_SIGNAL_TIME,
    sourceEventHash: MEASUREMENT_SIGNAL_HASH,
  }).length > 0;
}

function textWithoutMeasurementTokens(value: string): string {
  return value
    .replace(/\b[12]\s*m\s*\d{1,2}\b/giu, " ")
    .replace(/\b\d{2,3}(?:[.,]\d+)?\s*(?:kg|ky|ki)\b/giu, " ")
    .replace(/\b\d{2,3}(?:[.,]\d+)?\s*[-/x]\s*\d{2,3}(?:[.,]\d+)?\s*[-/x]\s*\d{2,3}(?:[.,]\d+)?\b/giu, " ");
}

function hasExplicitProductReference(value: string): boolean {
  if (productCodeOnly(value) !== null) return true;
  const searchText = hasCustomerMeasurementSignal(value)
    ? textWithoutMeasurementTokens(value)
    : value;
  return extractAdProductCodes(searchText).length > 0;
}

function hasSizeOnlyContinuationSignal(value: string): boolean {
  const text = asciiFold(value)
    .trim()
    .replace(/[.!?]+$/gu, "")
    .trim();
  return /^(?:(?:size|sz|co)\s*)?(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)(?:\s+(?:nha|nhe|a|em|chi))?$/iu
    .test(text);
}

function hasColorContinuationSignal(value: string): boolean {
  const text = asciiFold(value)
    .trim()
    .replace(/[.!?]+$/gu, "")
    .trim();
  return /^mau\s+[a-z][a-z\s-]{0,30}(?:\s+(?:nha|nhe|a|em|chi))?$/u.test(text);
}

/**
 * AI may infer that a terse message still refers to the product in state.
 * This helper only returns that reference when the model and state agree and
 * the customer did not type a different product code. The caller must still
 * exact-match the returned ID against the stable product index.
 */
export function aiContinuationProductId(
  customerText: string,
  proposalProductId: string | null,
  currentProductId: string | null,
): string | null {
  if (!proposalProductId || !currentProductId) return null;
  if (hasExplicitProductReference(customerText)) return null;
  const proposal = normalizeProductCode(proposalProductId);
  const current = normalizeProductCode(currentProductId);
  return proposal === current ? current : null;
}

/**
 * Khách có đang chủ động xin ảnh không, và xin loại nào.
 *
 * Nói rõ loại ảnh thì chỉ cần nhắc tới ảnh là đủ ("ảnh mặt sau"); không nói loại
 * nào thì phải có thêm động từ xin/xem, để câu như "ảnh này đẹp quá" không bị
 * hiểu thành yêu cầu gửi ảnh. Thứ tự kiểm tra đi từ loại cụ thể tới chung, vì
 * "cho xin ảnh feedback" khớp nhiều nhánh.
 */
export function explicitCustomerImageIntent(value: string): CustomerImageIntent | null {
  const text = asciiFold(value);
  const mentionsImage = /\b(anh|hinh|pic|picture|photo|image)\b/u.test(text);
  const asksFor = /\b(xin|cho|gui|xem|coi|coa|co the cho|show)\b/u.test(text);
  const feedback = /\b(feedback|fb|phan hoi|khach mac|nguoi mac|khach dat|review|danh gia|thuc te)\b/u.test(text);

  // Hai loại này tự nó đã hàm ý xin ảnh nên không đòi từ "ảnh": khách hay nhắn
  // cộc lốc "có feedback k" hoặc "cho xem bảng size".
  if (feedback && (mentionsImage || /\b(feedback|fb|review)\b/u.test(text))) return "FEEDBACK";
  if (/\b(bang size|size chart|bang so do|so do size)\b/u.test(text)) return "SIZE_GUIDE";
  if (!mentionsImage) return null;

  // Nói rõ loại ảnh thì không cần thêm động từ xin/cho: khách hay nhắn gọn
  // "ảnh chất liệu" hoặc "ảnh mặt sau".
  if (/\b(mat sau|phia sau|dang sau|sau lung|behind|back)\b/u.test(text)) return "BACK";
  if (/\b(chat lieu|chat vai|can chat|can vai|can canh|cat can|chi tiet|detail|vai|texture)\b/u.test(text)) return "DETAIL";
  if (/\b(khong nguoi mau|khong co nguoi mau|san pham that|anh that|nguyen ban|flatlay)\b/u.test(text)) {
    return "PRODUCT_ONLY";
  }
  // Không nói loại nào thì phải có động từ xin/xem, để câu kiểu "ảnh này đẹp quá"
  // không bị hiểu thành yêu cầu gửi ảnh.
  return asksFor ? "GENERIC" : null;
}

/**
 * Reuses the verified product already stored in conversation state only for a
 * genuine product follow-up. An explicit/new product code always wins and an
 * unknown new code must never silently fall back to the old product.
 */
export function currentProductContinuationId(
  value: string,
  currentProductId: string | null,
): string | null {
  if (!currentProductId) return null;
  if (hasExplicitProductReference(value)) return null;
  const text = asciiFold(value);
  const refersToCurrentProduct =
    hasCustomerMeasurementSignal(value) ||
    hasSizeOnlyContinuationSignal(value) ||
    hasColorContinuationSignal(value) ||
    explicitCustomerImageIntent(value) !== null ||
    explicitCustomerBusinessIntent(value) !== null ||
    /\b(mau nay|sp nay|san pham nay|set nay|ao nay|vay nay|quan nay|cai nay|em nay|mau do|sp do)\b/u.test(text) ||
    /\b(form|dang|chat|vai|mau sac|mac len|phoi do|co dep|co hop)\b/u.test(text);
  return refersToCurrentProduct ? normalizeProductCode(currentProductId) : null;
}

function afterSalesReasonV2(reason: HandoffReason): HandoffReasonV2 {
  return reason === "POST_SALE" ? "AFTER_SALES_REQUEST" : reason as HandoffReasonV2;
}

function postSaleHandoffReason(value: string): HandoffReason {
  const text = asciiFold(value);
  if (/\b(doi dia chi|doi sdt|doi so dien thoai|sua dia chi|thay doi thong tin giao)\b/u.test(text)) return "CHANGE_DELIVERY_INFO";
  if (/\b(huy don|khong lay don)\b/u.test(text)) return "CANCEL_ORDER";
  if (/\b(hoan tien|refund)\b/u.test(text)) return "REFUND";
  if (/\b(doi hang|doi size|doi mau)\b/u.test(text)) return "EXCHANGE";
  if (/\b(tra hang|return)\b/u.test(text)) return "RETURN";
  if (/\b(loi|rach|bung chi|hong|lem|defect)\b/u.test(text)) return "DEFECT";
  if (/\b(bao hanh|warranty)\b/u.test(text)) return "WARRANTY";
  if (/\b(sai hang|thieu hang|thieu mon|giao nham)\b/u.test(text)) return "WRONG_OR_MISSING_ITEM";
  if (/\b(cham giao|tre giao|qua ngay|chua giao)\b/u.test(text)) return "DELIVERY_DELAY";
  if (/\b(van don|ma van don|tracking|theo doi don)\b/u.test(text)) return "DELIVERY_TRACKING";
  if (/\b(chuyen khoan|thanh toan|ck)\b/u.test(text)) return "PAYMENT_AFTER_ORDER";
  if (/\b(don dau|don hang dau|trang thai don|don cua chi)\b/u.test(text)) return "ORDER_STATUS";
  return "POST_SALE";
}

export function isPreSalePolicyQuestion(value: string): boolean {
  return classifyPreSalePolicyIntent(value) !== null;
}

export function isPostSaleRequest(value: string): boolean {
  const text = asciiFold(value);
  if (isPreSalePolicyQuestion(value)) return false;
  return (
    /\b(van don|ma van don|tracking|don (?:hang )?(?:cua|nay|do)|da dat|da chot|da mua|da nhan|moi nhan|nhan hang roi|chua giao|dang giao|giao nham|giao sai|shipper)\b/u.test(text) ||
    /\b(hang bi loi|san pham bi loi|loi vai|loi duong may)\b/u.test(text) ||
    /\b(doi dia chi|doi sdt|doi so dien thoai|sua dia chi|huy don|hoan tien|refund)\b/u.test(text) ||
    /\b(cho (?:chi|em|minh) doi|(?:chi|em|minh) (?:muon|can) doi|doi (?:size|mau|hang) (?:cho|cua) (?:chi|em|minh))\b/u.test(text)
  );
}

/** Only after-sales receives one holding reply; every other handoff stays silent. */
export function holdingMessagesForHandoff(
  message: Pick<InboundMessageV1, "eventKey" | "occurredAt">,
  handoff: HandoffDirective | null,
): readonly RealtimeMetaMessageUnit[] {
  if (handoff?.category !== "POST_SALE") return [];
  const observedAt = new Date(message.occurredAt).toISOString();
  const decision = decideHandoffFallbackV2({
    schemaVersion: 2,
    commandId: `realtime:${message.eventKey}:after-sales`,
    decidedAt: observedAt,
    trigger: { kind: "REASON_CODE", reason: afterSalesReasonV2(handoff.reason) },
    evidence: [{
      source: "INBOUND_MESSAGE",
      reference: message.eventKey,
      observedAt,
    }],
  });
  return decision.customerMessages.map((text) => ({ kind: "TEXT", text }));
}

const vietnameseSentenceSegmenter = new Intl.Segmenter("vi", {
  granularity: "sentence",
});

export function splitRealtimeMetaMessages(
  messages: readonly RealtimeMetaMessageUnit[],
): RealtimeMetaMessageUnit[] {
  return messages.flatMap((message) => {
    if (message.kind !== "TEXT") return [message];
    const segments = message.text
      .split(/\r?\n+/gu)
      .flatMap((line) => [...vietnameseSentenceSegmenter.segment(line)])
      .map(({ segment }) => segment.trim())
      .filter(Boolean);
    return segments.map((text): RealtimeMetaMessageUnit => ({
      kind: "TEXT",
      text,
    }));
  });
}

export function isLegacyUnaccentedProductInfoReply(value: string): boolean {
  const lines = value.replace(/\r\n?/gu, "\n").split("\n");

  const hasVietnameseMark = (line: string): boolean =>
    /[\u0300-\u036fđĐ]/u.test(line.normalize("NFD"));
  return lines.some((line) => {
    if (hasVietnameseMark(line)) return false;
    const folded = asciiFold(line).trim();
    return (
      /^da\s+(?:.*\s)?\d+(?:[.,]\d+)?(?:k|d)\s+a$/u.test(folded) ||
      folded.includes(
        "chi cho em xin chieu cao can nang hoac so do 3 vong em tu van size cho minh nha",
      )
    );
  });
}

export function groupRealtimeMetaMessagesV2(
  messages: readonly RealtimeMetaMessageUnit[],
  splitProductInfoFollowUp = false,
): RealtimeMetaMessageUnit[] {
  if (!splitProductInfoFollowUp) {
    return limitResponseGroupPoliteness(messages);
  }
  let split = false;
  const grouped = messages.flatMap((message) => {
    if (split || message.kind !== "TEXT") return [message];
    const [information, ...followUpParts] = message.text
      .replace(/\r\n?/gu, "\n")
      .split(/\n{2,}/gu)
      .map((part) => part.trim())
      .filter(Boolean);
    const followUp = followUpParts.join("\n\n").trim();
    if (!information || !followUp) return [message];
    split = true;
    return [
      { kind: "TEXT" as const, text: information },
      { kind: "TEXT" as const, text: followUp },
    ];
  });
  return limitResponseGroupPoliteness(grouped);
}

// "chị" is a second-person pronoun, not a decorative particle, so it is intentionally
// excluded — deduplicating it would drop sentence subjects and produce curt replies.
const RESPONSE_GROUP_POLITENESS_TOKENS = new Set(["nhé", "ạ"]);
const RESPONSE_GROUP_POLITENESS_TOKEN = /(?<![\p{L}\p{N}_])(nhé|ạ)(?![\p{L}\p{N}_])/giu;

/** Keeps the conversational particles natural by using each at most once per response group. */
export function limitResponseGroupPoliteness(
  messages: readonly RealtimeMetaMessageUnit[],
): RealtimeMetaMessageUnit[] {
  const used = new Set<string>();
  const limited: RealtimeMetaMessageUnit[] = [];
  for (const message of messages) {
    if (message.kind !== "TEXT") {
      limited.push(message);
      continue;
    }
    const text = message.text.replace(RESPONSE_GROUP_POLITENESS_TOKEN, (match) => {
      const token = match.toLocaleLowerCase("vi");
      if (!RESPONSE_GROUP_POLITENESS_TOKENS.has(token) || !used.has(token)) {
        used.add(token);
        return match;
      }
      return "";
    })
      .replace(/[ \t]+([,.;:!?])/gu, "$1")
      .replace(/[ \t]{2,}/gu, " ")
      .replace(/[ \t]*\n[ \t]*/gu, "\n")
      .trim();
    if (text) limited.push({ kind: "TEXT", text });
  }
  return limited;
}

export function isResolvedProductCodeOnly(
  value: string,
  product: StableProductDocument,
): boolean {
  const code = productCodeOnly(value);
  if (code === null) return false;
  return [product.productId, product.canonicalCode, ...product.aliases]
    .some((candidate) => normalizeProductCode(candidate) === code);
}

function shortPrice(value: number): string {
  return value % 1_000 === 0
    ? `${value / 1_000}k`
    : `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function naturalList(values: readonly string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} và ${values.at(-1)}`;
}

function compactMaterial(product: StableProductDocument): string {
  const materials = product.materials
    .map((value) => value.trim().toLocaleLowerCase("vi"))
    .filter(Boolean)
    .slice(0, 2);
  return materials.length > 0 ? naturalList(materials) : "đang cập nhật";
}

export function multiProductReply(
  products: readonly StableProductDocument[],
  facts: readonly BusinessFactEnvelopeV1[],
  policyResolution: RuntimePolicyResolution | null = null,
): string | null {
  const lines: string[] = [];
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const fact = facts[index];
    if (!product || fact?.status !== "OK" || !fact.facts) return null;
    const price = fact.facts.salePriceVnd ?? fact.facts.listPriceVnd;
    if (price === null) return null;
    lines.push(
      `Set ${index + 1} - ${product.productId} - giá ${shortPrice(price)} - chất ${compactMaterial(product)}`,
    );
  }
  const policy = outboundRuntimePolicy(policyResolution);
  const offer = policy
    ? decideRuntimeMultiItemOffer(policy, products.length)
    : null;
  if (offer) lines.push(offer.message);
  lines.push(
    "Chị chọn set mình thích và gửi em chiều cao, cân nặng để em tư vấn size phù hợp nhé.",
  );
  return lines.join("\n");
}

function hasBodyProfile(context: readonly ShadowContextMessage[]): boolean {
  const text = context
    .filter((message) => message.senderType === "CUSTOMER")
    .map((message) => message.text)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLowerCase();
  const hasHeight = /\b(?:chieu\s*cao|cao)\s*[:=]?\s*(?:1[45-8]\d|1[.,][45-8]\d|[45-8]\d)\b/u.test(text);
  const hasWeight = /\b(?:can\s*nang|nang)\s*[:=]?\s*(?:3\d|4\d|5\d|6\d|7\d|8\d|9\d)\b/u.test(text);
  return hasHeight && hasWeight;
}

function compactXmlDescription(value: string | undefined): string {
  return (value ?? "")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;|&#34;/giu, "\"")
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 10_000);
}

function normalizedVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLowerCase();
}

function sentenceCase(value: string): string {
  if (!value) return value;
  return `${value.charAt(0).toLocaleUpperCase("vi")}${value.slice(1)}`;
}

function productTypeLowercase(value: string): string {
  return value.replace(
    /^(Áo dài|Chân váy|Set váy|Set quần|Áo|Đầm|Váy|Set|Combo|Quần)\b/iu,
    (prefix) => prefix.toLocaleLowerCase("vi"),
  );
}

export function productDisplayName(product: StableProductDocument): string {
  const title = product.title
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[\s·|–—:;,.]+$/gu, "");
  if (!title) return `mẫu ${product.productId}`;
  const code = normalizedVietnamese(product.productId)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, "");
  const residual = normalizedVietnamese(title)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, "")
    .replace(code, "")
    .replace(
      /(?:SANPHAM|CHANVAY|AODAI|CROPTOP|JUMPSUIT|COMBO|MAU|SET|AO|VAY|DAM|QUAN)/gu,
      "",
    );
  const productType = title.match(
    /^(Áo dài|Chân váy|Set váy|Set quần|Áo|Đầm|Váy|Set|Combo|Quần)\b/iu,
  )?.[0];
  if (residual.length >= 2) return productTypeLowercase(title);
  return productType
    ? `${productType.toLocaleLowerCase("vi")} ${product.productId}`
    : `mẫu ${product.productId}`;
}

function xmlMaterialPhrase(
  product: StableProductDocument,
  description: string,
): string {
  const match = description.match(
    /(?:chất liệu|được may từ|may từ)\s+([^.!?]{3,120})/iu,
  );
  const extracted = (match?.[1] ?? "")
    .split(/,\s*(?:mang|tạo|giúp|cho|đem|vừa)\b/iu)[0]
    ?.trim()
    .replace(/\s+thêu\s+3d(?:\s+tinh xảo)?$/iu, "")
    .replace(/\s+(?:mềm mịn|tinh xảo)$/iu, "")
    .slice(0, 90) ?? "";
  if (extracted) return extracted.toLocaleLowerCase("vi");
  const materials = product.materials
    .map((value) => value.trim().toLocaleLowerCase("vi"))
    .filter(Boolean)
    .slice(0, 2);
  return materials.length > 0 ? naturalList(materials) : "";
}

function xmlFormPhrase(
  product: StableProductDocument,
  description: string,
): string {
  const candidates = [
    ...description.matchAll(
      /(?:được thiết kế|áo có|váy có|set có)\s+form\s+([^,.!?]{2,50})/giu,
    ),
  ];
  const extracted = candidates
    .map((match) => match[1]?.trim() ?? "")
    .find((value) => value !== "" && !/^(?:đẹp|tốt)\b/iu.test(value));
  if (extracted) {
    return extracted
      .split(/\s+(?:với|giúp|tạo)\b/iu)[0]
      ?.trim()
      .toLocaleLowerCase("vi")
      .slice(0, 50) ?? "";
  }
  return product.silhouettes
    .map((value) => value.trim().toLocaleLowerCase("vi"))
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

export function productDescriptionLine(
  product: StableProductDocument,
  includeMaterialLabel = false,
): string {
  const description = compactXmlDescription(product.descriptionXml);
  const normalized = normalizedVietnamese(description);
  const material = xmlMaterialPhrase(product, description);
  const form = xmlFormPhrase(product, description);
  let materialEffect = "tạo bề mặt mềm mại, tinh tế";
  if (/\btheu\s*3d\b/u.test(normalized)) {
    materialEffect = "tạo bề mặt thêu nổi tinh xảo";
  } else if (/\bhoa\s*chim\b/u.test(normalized)) {
    materialEffect = "tạo bề mặt tinh tế, có độ rủ mềm";
  } else if (/\bdan\s*soi\b/u.test(normalized)) {
    materialEffect = "giữ form nhẹ mà vẫn thoáng";
  } else if (/\bdung\s*form\b/u.test(normalized)) {
    materialEffect = "giữ dáng nhẹ mà vẫn mềm mại";
  } else if (/\bthoang\s*mat\b/u.test(normalized)) {
    materialEffect = "mang lại cảm giác nhẹ và thoáng";
  }
  const materialSentence = material
    ? `${includeMaterialLabel ? `Chất liệu ${material}` : sentenceCase(material)} ${materialEffect}.`
    : "";

  let designSentence = "";
  if (
    /\bao\s*dai\b/u.test(normalized) &&
    (/\b6\s*ta\b/u.test(normalized) || /\bta\s*xoe\b/u.test(normalized))
  ) {
    designSentence = `Form ${form || "suông"} giúp tà áo bay nhẹ khi di chuyển.`;
  } else if (
    /\bao\s*khoac\b/u.test(normalized) &&
    /\bao\s*quay\b/u.test(normalized) &&
    /\bchan\s*vay\b/u.test(normalized)
  ) {
    designSentence = "Thiết kế ba món dễ mặc, dễ phối.";
  } else if (form) {
    designSentence = `Form ${form} giúp tổng thể mềm mại, thanh thoát.`;
  } else if (/\bde\s*mac\b/u.test(normalized)) {
    designSentence = "Thiết kế nhẹ nhàng, dễ mặc và phối linh hoạt.";
  }

  const contextual = [materialSentence, designSentence]
    .filter(Boolean)
    .join(" ");
  if (contextual) return contextual;
  return "Thiết kế giữ form mềm mại, thanh lịch và dễ mặc.";
}

export function verifiedProductInfoProposal(
  product: StableProductDocument,
  facts: BusinessFactEnvelopeV1,
  context: readonly ShadowContextMessage[],
  profile: CustomerProfileV1 | null = null,
  productFactsV2: ProductFactsV2 | null = null,
  now = new Date(),
  _conversationalMessageFormatEnabled = false,
  mediaSelectorV2Authoritative = false,
): AgentProposalV1 | null {
  if (facts.status !== "OK" || facts.facts === null) return null;
  const price = facts.facts.salePriceVnd ?? facts.facts.listPriceVnd;
  if (price === null) return null;
  const displayName = productDisplayName(product);
  const description = compactXmlDescription(product.descriptionXml);
  const material = xmlMaterialPhrase(product, description);
  const form = xmlFormPhrase(product, description);
  const displayNameContainsCode = normalizedVietnamese(displayName)
    .replace(/[^a-z0-9]+/gu, "")
    .includes(normalizedVietnamese(product.productId).replace(/[^a-z0-9]+/gu, ""));
  const heading = displayNameContainsCode
    ? sentenceCase(displayName)
    : `${sentenceCase(displayName)} (mã ${product.productId})`;
  const informationLines = [
    `${heading} hiện có giá ${new Intl.NumberFormat("vi-VN").format(price)}đ.`,
    ...(material ? [`Chất liệu: ${material}`] : []),
    ...(form ? [`Form dáng: ${form}`] : []),
    ...(facts.facts.sizes.length > 0
      ? [`Size: ${facts.facts.sizes.join(", ")}`]
      : []),
  ];
  const measurementKinds = new Set(
    profile?.measurements.map(({ kind }) => kind) ?? [],
  );
  const hasHeight = measurementKinds.has("HEIGHT_CM");
  const hasWeight = measurementKinds.has("WEIGHT_KG");
  const hasCompleteMeasurements = profile !== null
    ? profileHasBodyMeasurements(profile)
    : hasBodyProfile(context);
  const followUp = hasCompleteMeasurements
    ? null
    : hasHeight
      ? "Chị nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?"
      : hasWeight
        ? "Chị cao khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?"
        : "Chị cao và nặng khoảng bao nhiêu để em tư vấn size phù hợp cho mẫu này?";
  const v2Overview = productFactsV2
    ? selectProductMediaV2({
        product: productFactsV2,
        kind: "FULL_LOOK",
        maxAssets: 3,
        now,
        unavailableFallback: {
          verifiedFact: {
            answer: `${displayName} vẫn có thể tư vấn size`,
            source: "PRODUCT_FACTS_V2",
            freshnessState: "FRESH",
            sourceVersion: productFactsV2.content.metadata.sourceVersion,
            observedAt: productFactsV2.content.metadata.observedAt,
          },
          nextStep: "ASK_SIZE_PROFILE",
        },
      })
    : null;
  const v2Images = v2Overview?.selection.selected.map(({ url }) => url) ?? [];
  return {
    schemaVersion: 1,
    intent: "product_info",
    conversationStage: "PRODUCT_MATCHED",
    productId: product.productId,
    action: "REPLY",
    reply: [informationLines.join("\n"), followUp].filter(Boolean).join("\n\n"),
    attachments: mediaSelectorV2Authoritative
      ? v2Images
      : v2Images.length > 0
        ? v2Images
        : verifiedImageUrls(product, "PRICE_CARD"),
    handoffReason: null,
    businessFactQuery: {
      intent: "PRICE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

export const IMAGE_INTENT_REPLIES: Readonly<Record<CustomerImageIntent, string>> = {
  FEEDBACK: "Em gửi chị ảnh khách đã mặc mẫu này.",
  DETAIL: "Em gửi chị ảnh cận chất liệu của mẫu này.",
  BACK: "Em gửi chị ảnh mặt sau của mẫu này.",
  SIZE_GUIDE: "Em gửi chị bảng size của mẫu này.",
  PRODUCT_ONLY: "Em gửi chị ảnh sản phẩm của mẫu này.",
  GENERIC: "Em gửi chị thêm ảnh của mẫu này.",
};

/**
 * Lượt trả lời chỉ để gửi ảnh khách vừa xin.
 *
 * Câu chữ cố định và không nhắc giá/tồn/size, nên guard không phải đối chiếu số
 * liệu nào; phần cần kiểm là URL đính kèm, vốn đã được `resolveFacts` giới hạn
 * đúng bằng tập ảnh này.
 */
function requestedProofForImageIntent(
  intent: CustomerImageIntent | null,
): "MATERIAL" | "SOCIAL" | null {
  if (intent === "DETAIL") return "MATERIAL";
  if (intent === "FEEDBACK") return "SOCIAL";
  return null;
}

function requestedImagesProposal(
  product: StableProductDocument,
  imageUrls: readonly string[],
  intent: CustomerImageIntent,
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "product_info",
    conversationStage: "PRODUCT_MATCHED",
    productId: product.productId,
    action: "REPLY",
    reply: IMAGE_INTENT_REPLIES[intent],
    attachments: [...imageUrls],
    handoffReason: null,
    businessFactQuery: {
      // Phải là `PRICE` chứ không phải `NONE`: `resolveFacts` bỏ qua truy vấn
      // `NONE`, mà không có facts thì guard coi mọi URL đính kèm là chưa xác
      // minh và chặn cả lượt gửi ảnh.
      intent: "PRICE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

function productInfoLookupProposal(product: StableProductDocument): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "product_info",
    conversationStage: "PRODUCT_MATCHED",
    productId: product.productId,
    action: "REPLY",
    reply: `Em đang kiểm tra thông tin mẫu ${product.productId} để trả lời chị chính xác.`,
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: "PRICE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

const DETERMINISTIC_GROUNDED_DRAFT: GroundedReplyDraftV1 = {
  schemaVersion: 1,
  advisoryText: "",
  objectionResponse: "",
  suggestedQuestion: "",
  suggestedNextStep: "",
  attachmentImageIndices: [],
};

export type VertexGroundedFallbackReason =
  | "GROUNDED_SCHEMA_INVALID"
  | "GROUNDED_DRAFT_FALLBACK";

export function vertexGroundedFallbackReason(
  error: unknown,
): VertexGroundedFallbackReason {
  return error instanceof Error && (
      error.message === "GROUNDED_SCHEMA_INVALID" ||
      error.message === "VERTEX_SCHEMA_INVALID"
    )
    ? "GROUNDED_SCHEMA_INVALID"
    : "GROUNDED_DRAFT_FALLBACK";
}

export function deterministicVertexProposalFallback(
  customerText: string,
  product: StableProductDocument | null,
  buyingSignal: boolean,
  error: unknown,
): {
  readonly proposal: AgentProposalV1;
  readonly reasonCode: VertexGroundedFallbackReason;
} {
  const reasonCode = vertexGroundedFallbackReason(error);
  if (product) {
    const proposal = productInfoLookupProposal(product);
    return {
      proposal: {
        ...proposal,
        businessFactQuery: {
          ...proposal.businessFactQuery,
          intent: explicitCustomerBusinessIntents(customerText)[0] ?? "PRICE",
        },
      },
      reasonCode,
    };
  }
  return {
    proposal: {
      schemaVersion: 1,
      intent: "deterministic_vertex_fallback",
      conversationStage: "AWARENESS",
      productId: null,
      action: buyingSignal ? "REPLY" : "ASK_PRODUCT_SELECTION",
      reply: buyingSignal
        ? "Em đã ghi nhận nhu cầu của chị và sẽ hỗ trợ tiếp ngay ạ."
        : "Chị gửi giúp em mã hoặc ảnh mẫu đang quan tâm để em kiểm tra thông tin chính xác nhé.",
      attachments: [],
      handoffReason: null,
      businessFactQuery: {
        intent: "NONE",
        offerType: null,
        color: null,
        size: null,
        deliveryRegion: null,
      },
    },
    reasonCode,
  };
}

export function enforceProtectedOutboundReadinessV1<
  TMessage,
  TClaim,
  TReadiness extends {
    readonly outcome: "READY" | "BLOCKED";
    readonly reasonCodes: readonly string[];
  },
  TSalesCyclePlan,
>(input: {
  readonly messages: readonly TMessage[];
  readonly claims: readonly TClaim[];
  readonly readiness: TReadiness | null;
  readonly salesCyclePlan: TSalesCyclePlan | null;
  readonly salesDesiredTag: "NHAN_VIEN" | "DA_CHOT_DON" | null;
}): {
  readonly messages: readonly TMessage[];
  readonly claims: readonly TClaim[];
  readonly readiness: TReadiness | null;
  readonly salesCyclePlan: TSalesCyclePlan | null;
  readonly salesDesiredTag: "NHAN_VIEN" | "DA_CHOT_DON" | null;
  readonly blockedReasonCodes: readonly string[];
} {
  if (input.readiness === null || input.readiness.outcome === "READY") {
    return {
      ...input,
      blockedReasonCodes: [],
    };
  }
  return {
    messages: [],
    claims: [],
    // Preserve the denial as telemetry evidence. It is never attached to a
    // Meta plan because only READY readiness can cross that boundary.
    readiness: input.readiness,
    salesCyclePlan: null,
    salesDesiredTag: null,
    blockedReasonCodes: [...new Set(input.readiness.reasonCodes)],
  };
}

export function staleFactsRequireHandoff(
  customerText: string,
  facts: BusinessFactEnvelopeV1 | null,
): boolean {
  return (
    facts?.status === "STALE" &&
    explicitCustomerBusinessIntent(customerText) !== null &&
    facts.policyContext?.fulfillmentPolicy === "READY_STOCK" &&
    facts.policyContext.canOrderWhenZero === false
  );
}

export function modelHandoffPermitted(
  customerText: string,
  facts: BusinessFactEnvelopeV1 | null,
): boolean {
  return (
    staleFactsRequireHandoff(customerText, facts) ||
    unavailableFactsRequireHandoff(facts)
  );
}

/**
 * A product was verified in the stable catalog, but the business authority
 * cannot safely provide price/stock/size/ETA. Handoff must be silent so the
 * customer never sees an interim "checking" reply as the final answer.
 */
export function unavailableFactsRequireHandoff(
  facts: BusinessFactEnvelopeV1 | null,
): boolean {
  return (
    facts !== null &&
    (facts.status === "NOT_FOUND" || facts.status === "ERROR") &&
    facts.reasonCode !== "DELIVERY_REGION_REQUIRED"
  );
}

export function unresolvedProductRequiresHandoff(
  customerText: string,
  context: {
    readonly isEcho: boolean;
    readonly hasAdsContext: boolean;
    readonly hasResolvedProduct: boolean;
    readonly hasClarification: boolean;
    readonly hasBuyingSignal: boolean;
  },
): boolean {
  return (
    !context.isEcho &&
    !context.hasResolvedProduct &&
    !context.hasClarification &&
    (
      context.hasAdsContext ||
      productCodeOnly(customerText) !== null ||
      extractAdProductCodes(customerText).length > 0 ||
      explicitCustomerBusinessIntent(customerText) !== null ||
      context.hasBuyingSignal
    )
  );
}

function safeStaleProposal(
  proposal: AgentProposalV1,
  explicitIntent: ExplicitCustomerBusinessIntent | null,
): AgentProposalV1 {
  const productId = proposal.productId ?? "mẫu này";
  const detail = explicitIntent === "STOCK"
    ? "Tồn kho hiện đang được cập nhật nên em chưa báo số lượng cụ thể để tránh sai ạ."
    : explicitIntent === "SIZE"
      ? "Tình trạng từng size hiện đang được cập nhật nên em chưa báo size cụ thể để tránh sai ạ."
      : explicitIntent === "PRICE"
        ? "Thông tin giá hiện đang được cập nhật nên em chưa báo con số cụ thể để tránh sai ạ."
        : explicitIntent === "ETA"
          ? "Thời gian giao dự kiến hiện đang được cập nhật nên em chưa báo mốc cụ thể để tránh sai ạ."
          : "Chị muốn xem thêm thông tin kiểu dáng hay màu sắc của mẫu không ạ?";
  return {
    ...proposal,
    action: "REPLY",
    reply: `Em đã tìm thấy mẫu ${productId}. ${detail}`,
    attachments: [],
    handoffReason: null,
  };
}

function safeModelHandoffFallback(
  proposal: AgentProposalV1,
  productId: string | null,
): AgentProposalV1 {
  const reply = productId
    ? `Em đã tìm thấy mẫu ${productId}. Chị muốn xem giá, size, tình trạng hàng hay thời gian giao dự kiến?`
    : "Chị gửi mã sản phẩm hoặc ảnh mẫu đang quan tâm để em kiểm tra chính xác nhé.";
  return {
    ...proposal,
    productId,
    action: "REPLY",
    reply,
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

export function continuationProductId(
  resolvedProductId: string | null,
  proposalProductId: string | null,
  currentProductId: string | null,
): string | null {
  return resolvedProductId ?? proposalProductId ?? currentProductId;
}

type CustomerProfileEvidenceMap = Readonly<
  Record<string, CustomerProfileFieldEvidence>
>;

function profileDigest(customerHash: string): string {
  const normalized = customerHash.trim().toLocaleLowerCase("en-US");
  return /^[a-f0-9]{64}$/u.test(normalized)
    ? normalized
    : createHash("sha256").update(customerHash).digest("hex");
}

function newCustomerProfile(
  pageId: string,
  customerHash: string,
  now: Date,
): CustomerProfileV1 {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    profileId: deterministicUuid(`lana:customer-profile:v1:${pageId}:${customerHash}`),
    customerKey: {
      namespace: `META_PAGE:${pageId}`.slice(0, 64),
      algorithm: "HMAC_SHA256",
      digest: profileDigest(customerHash),
    },
    revision: 1,
    measurements: [],
    fitPreference: null,
    preferences: { colors: [], styles: [], materials: [] },
    sizeHistory: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function customerProfileSummary(profile: CustomerProfileV1 | null): {
  readonly profileRevision: number | null;
  readonly measurements: Readonly<Record<string, number>>;
  readonly fitPreference: CustomerProfileV1["fitPreference"] | null;
} {
  return {
    profileRevision: profile?.revision ?? null,
    measurements: Object.fromEntries(
      (profile?.measurements ?? []).map(({ kind, value }) => [kind, value]),
    ),
    fitPreference: profile?.fitPreference ?? null,
  };
}

function profileHasBodyMeasurements(profile: CustomerProfileV1 | null): boolean {
  if (!profile) return false;
  const kinds = new Set(profile.measurements.map(({ kind }) => kind));
  return (
    kinds.has("HEIGHT_CM") && kinds.has("WEIGHT_KG")
  ) || (
    kinds.has("BUST_CM") && kinds.has("WAIST_CM") && kinds.has("HIPS_CM")
  );
}

export function extractVariantMentions(
  text: string,
  _proposal: AgentProposalV1,
): { readonly size: string | null; readonly color: string | null } {
  const normalized = normalizedVietnamese(text);
  const labelledSize = normalized.match(
    /(?:\bsize|\bsz|\bkich\s*co|\bco)\s*[:=]?\s*(XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3})\b/iu,
  );
  const sizeOnly = normalized.trim().match(
    /^(XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3})$/iu,
  );
  const colorMatch = text.normalize("NFC").match(
    /(?:\bmàu|\bcolor)\s*[:=]?\s*([\p{L}][\p{L}\s-]{0,30}?)(?=\s+(?:size|sz|cỡ)\b|[,.!?;\n]|$)/iu,
  );
  return {
    // The customer's text is the only source of variant evidence. Model
    // output may guide intent handling but can never invent a size or colour.
    size: (labelledSize?.[1]?.trim() ?? sizeOnly?.[1]?.trim() ?? null)?.toUpperCase() ?? null,
    color: colorMatch?.[1]?.trim().toLocaleLowerCase("vi-VN") ?? null,
  };
}

function verifiedVariantState(
  result: VerifiedVariantResult,
): NonNullable<ConversationState["verifiedVariant"]> {
  return {
    schemaVersion: 2,
    parentProductId: result.parentProductId,
    selectedVariantId: result.selectedVariantId,
    selectedColorId: result.selectedColorId,
    selectedColorLabel: result.selectedColorLabel,
    selectedSizeCode: result.selectedSizeCode,
    selectedOfferType: result.selectedOfferType,
    selectedComponentProductId: result.selectedComponentProductId,
    mentionedColorText: result.mentionedColorText,
    mentionedSizeText: result.mentionedSizeText,
    resolution: result.resolution,
    sourceVersion: result.sourceVersion,
    verifiedAt: result.verifiedAt,
  };
}


export interface MultiFactResolution {
  readonly queryId: string;
  readonly rawProductRef: string;
  readonly product: StableProductDocument | null;
  readonly resolution: "RESOLVED" | "AMBIGUOUS" | "NOT_FOUND";
  readonly facts: readonly {
    readonly requestedFact: RequestedBusinessFactV2;
    readonly envelope: BusinessFactEnvelopeV1;
  }[];
}

export async function resolveBusinessFactQueriesBounded(
  queries: BusinessFactQueriesV2,
  products: readonly StableProductDocument[],
  resolveFact: BusinessFactsReader["resolve"],
  shopAlias: string,
): Promise<readonly MultiFactResolution[]> {
  const byId = new Map(products.map((product) => [product.productId, product]));
  return mapWithBoundedConcurrency(
    queries.queries,
    BUSINESS_FACT_QUERY_CONCURRENCY,
    async (query) => {
      const productId = query.productRef.productId;
      const product = productId ? byId.get(productId) : undefined;
      if (!productId || !product) {
        return {
          queryId: query.queryId,
          rawProductRef: query.productRef.raw,
          product: null,
          resolution: query.productRef.resolution,
          facts: [],
        };
      }
      const facts: MultiFactResolution["facts"][number][] = [];
      for (const requestedFact of query.requestedFacts) {
        const envelope = await resolveFact({
          shopAlias,
          productId,
          intent: requestedFact,
          offerType: query.qualifiers.offerType,
          color: query.qualifiers.color,
          size: query.qualifiers.size,
          deliveryRegion: query.qualifiers.deliveryRegion,
        });
        facts.push({ requestedFact, envelope });
      }
      return {
        queryId: query.queryId,
        rawProductRef: query.productRef.raw,
        product,
        resolution: query.productRef.resolution,
        facts,
      };
    },
  );
}

export async function resolveProductReferencesBounded(
  productCodes: readonly string[],
  resolveProduct: (productCode: string) => Promise<StableProductDocument | null>,
): Promise<readonly ResolvedProductReference[]> {
  return mapWithBoundedConcurrency(
    productCodes,
    BUSINESS_FACT_QUERY_CONCURRENCY,
    async (productCode) => {
      const product = await resolveProduct(productCode);
      return {
        raw: productCode,
        product,
        resolution: product === null ? "NOT_FOUND" as const : "RESOLVED" as const,
      };
    },
  );
}

export function classifyCustomerUrlsForInbound(
  text: string,
  policy: CustomerUrlPolicyV1,
  mediaInputLimitExceeded: boolean,
  classify: typeof classifyCustomerUrls = classifyCustomerUrls,
): CustomerUrlDecision {
  if (!mediaInputLimitExceeded) return classify(text, policy);
  return {
    policy,
    disposition: "CONTINUE",
    items: [],
    productCodes: [],
    candidateProductCodes: [],
    reasonCodes: [],
    explanationAllowed: false,
  };
}

export interface ResolvedProductReference {
  readonly raw: string;
  readonly product: StableProductDocument | null;
  readonly resolution: "RESOLVED" | "AMBIGUOUS" | "NOT_FOUND";
}

function factsForProductClause(
  text: string,
  rawProductRef: string,
  fallback: readonly RequestedBusinessFactV2[],
): readonly RequestedBusinessFactV2[] {
  const clauses = text.split(/[,;.!?\n]|\s+(?:và|với|and)\s+/iu);
  const containing = clauses.find((clause) =>
    clause.toLocaleUpperCase("vi-VN").includes(rawProductRef.toLocaleUpperCase("vi-VN"))
  );
  const scoped = containing ? explicitCustomerBusinessIntents(containing) : [];
  return scoped.length > 0 ? scoped : fallback;
}

export function buildBusinessFactQueries(
  eventKey: string,
  text: string,
  references: readonly ResolvedProductReference[],
): BusinessFactQueriesV2 | null {
  const requestedFacts = explicitCustomerBusinessIntents(text);
  if (requestedFacts.length === 0 || references.length === 0) return null;
  const size = text.match(
    /(?:\bsize|\bsz|kích\s*cỡ|cỡ)\s*[:=]?\s*(XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3})\b/iu,
  )?.[1]?.trim() ?? null;
  const color = text.match(
    /(?:\bmàu|\bcolor)\s*[:=]?\s*([\p{L}][\p{L}\s-]{0,30}?)(?=\s+(?:size|sz|cỡ)\b|[,.!?;\n]|$)/iu,
  )?.[1]?.trim() ?? null;
  const seenReferences = new Set<string>();
  const distinctReferences = references.filter((reference) => {
    const identity = normalizeProductCode(
      reference.product?.productId ?? reference.raw,
    );
    if (seenReferences.has(identity)) return false;
    seenReferences.add(identity);
    return true;
  });
  return BusinessFactQueriesV2Schema.parse({
    schemaVersion: 2,
    queries: distinctReferences.map((reference, index) => ({
      schemaVersion: 2,
      queryId: deterministicUuid(`${eventKey}:business-fact-query:v2:${index}`),
      productRef: {
        raw: reference.raw,
        productId: reference.product?.productId ?? null,
        resolution: reference.resolution,
      },
      requestedFacts: factsForProductClause(text, reference.raw, requestedFacts),
      qualifiers: {
        offerType: null,
        color,
        size,
        deliveryRegion: null,
      },
    })),
  });
}

export function multiFactReply(
  resolutions: readonly MultiFactResolution[],
): string | null {
  const lines: string[] = [];
  for (const resolution of resolutions) {
    if (resolution.resolution !== "RESOLVED" || resolution.product === null) {
      lines.push(`Em chưa tìm thấy mã ${resolution.rawProductRef}.`);
      continue;
    }
    const details: string[] = [];
    for (const { requestedFact, envelope } of resolution.facts) {
      if (envelope.status !== "OK" || envelope.facts === null) {
        details.push(
          {
            PRICE: "giá đang cập nhật",
            STOCK: "tồn đang cập nhật",
            SIZE: "size đang cập nhật",
            ETA: "ETA đang cập nhật",
          }[requestedFact],
        );
        continue;
      }
      const facts = envelope.facts;
      if (requestedFact === "PRICE") {
        const price = facts.salePriceVnd ?? facts.listPriceVnd;
        details.push(price === null ? "giá đang cập nhật" : `giá ${shortPrice(price)}`);
      } else if (requestedFact === "STOCK") {
        details.push(
          facts.stockStatus === "OUT_OF_STOCK"
            ? "hiện hết hàng"
            : facts.stockQuantity === null
              ? `tình trạng ${facts.stockStatus}`
              : `còn ${facts.stockQuantity} sản phẩm`,
        );
      } else if (requestedFact === "SIZE") {
        details.push(
          facts.sizes.length > 0
            ? `size ${facts.sizes.join(", ")}`
            : "size đang cập nhật",
        );
      } else {
        details.push(
          facts.deliveryEta
            ? `giao dự kiến ${facts.deliveryEta.minDays}-${facts.deliveryEta.maxDays} ngày`
            : "ETA đang cập nhật",
        );
      }
    }
    lines.push(
      `${productDisplayName(resolution.product)}: ${details.join(", ")}.`,
    );
  }
  if (lines.length === 0) return null;
  lines.push("Chị chọn mẫu và size muốn lấy để em kiểm tra đúng biến thể nhé.");
  return lines.join("\n");
}

type CatalogAdvisoryIntent =
  | "COLORS"
  | "MATERIALS"
  | "SILHOUETTES"
  | "OCCASIONS";

export function catalogAdvisoryIntent(value: string): CatalogAdvisoryIntent | null {
  const text = asciiFold(value);
  if (/\b(mau gi|mau nao|mau sac|co mau)\b/u.test(text)) return "COLORS";
  if (/\b(chat lieu|chat vai|vai gi)\b/u.test(text)) return "MATERIALS";
  if (/\b(form|dang|kieu dang)\b/u.test(text)) return "SILHOUETTES";
  if (/\b(mac di dau|dip nao|di lam|di tiec|su kien)\b/u.test(text)) {
    return "OCCASIONS";
  }
  return null;
}

function explicitXmlAdvisory(
  product: StableProductDocument,
  intent: CatalogAdvisoryIntent,
): string | null {
  const description = compactXmlDescription(product.descriptionXml);
  const pattern = {
    COLORS: /(?:màu|màu sắc)\s*[:\-]?\s*([^.!?]{2,80})/iu,
    MATERIALS: /(?:chất liệu|được may từ|may từ)\s*[:\-]?\s*([^.!?]{2,100})/iu,
    SILHOUETTES: /(?:form|dáng|kiểu dáng)\s*[:\-]?\s*([^.!?]{2,100})/iu,
    OCCASIONS: /(?:phù hợp|thích hợp)\s+(?:cho|để)?\s*([^.!?]{2,100})/iu,
  }[intent];
  return description.match(pattern)?.[1]?.trim().slice(0, 100) ?? null;
}

export function catalogAdvisoryReply(
  product: StableProductDocument,
  intent: CatalogAdvisoryIntent,
): string {
  const structured = {
    COLORS: product.colors,
    MATERIALS: product.materials,
    SILHOUETTES: product.silhouettes,
    OCCASIONS: product.occasions,
  }[intent].map((value) => value.trim()).filter(Boolean);
  const fallback = structured.length === 0
    ? explicitXmlAdvisory(product, intent)
    : null;
  const label = {
    COLORS: "Màu",
    MATERIALS: "Chất liệu",
    SILHOUETTES: "Form dáng",
    OCCASIONS: "Dịp mặc",
  }[intent];
  const answer = structured.length > 0
    ? structured.join(", ")
    : fallback ?? "đang được cập nhật";
  return `${label} của ${productDisplayName(product)}: ${answer}. Chị cần em kiểm tra thêm giá hay size không?`;
}

const MEASUREMENT_LABELS: Readonly<Record<MeasurementKind, string>> = {
  HEIGHT_CM: "chiều cao",
  WEIGHT_KG: "cân nặng",
  BUST_CM: "vòng ngực",
  WAIST_CM: "vòng eo",
  HIPS_CM: "vòng mông",
};

export function verifiedSizeGuideAttachments(
  productFactsV2: ProductFactsV2 | null,
  chartHash: string | null,
  chartSourceUrl: string | null,
  now: Date,
): string[] {
  if (!productFactsV2 || !chartHash || !chartSourceUrl) return [];
  const media = productFactsV2.media;
  if (media.metadata.freshnessState !== "FRESH") return [];
  if (
    media.metadata.expiresAt !== null &&
    Date.parse(media.metadata.expiresAt) <= now.getTime()
  ) return [];
  return media.assets
    .filter((asset) =>
      asset.verified &&
      asset.reviewStatus === "APPROVED" &&
      asset.purposes.includes("SIZE_CHART") &&
      asset.sourceContentSha256 === chartHash &&
      asset.url === chartSourceUrl
    )
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, 1)
    .map(({ url }) => url);
}

export function proactiveSizeEvidencePrefix(reasonCodes: readonly string[]): string {
  return reasonCodes.some((code) => code.startsWith("PAST_SIZE_"))
    ? "Theo size chị đã mua và xác nhận trước đây"
    : "Theo số đo mới nhất";
}

function resolveSizeEngineDecision(
  product: StableProductDocument,
  profile: CustomerProfileV1,
  policyResolution: RuntimePolicyResolution | null,
  now: Date,
) {
  const target = sizeChartTarget(product);

  const eligibility = evaluateSizeChartEligibility({
    policy: policyResolution,
    productId: product.productId,
    target,
  });
  const decision = recommendSize({
    profile,
    target,
    charts: eligibility.charts,
    generatedAt: now.toISOString(),
    recommendationId: deterministicUuid(
      `lana:size:v1:${product.productId}:${profile.profileId}:${profile.revision}`,
    ),
  });

  return { decision, eligibility };
}

function sizeEngineProposal(
  proposal: AgentProposalV1,
  product: StableProductDocument,
  profile: CustomerProfileV1,
  policyResolution: RuntimePolicyResolution | null,
  productFactsV2: ProductFactsV2 | null,
  now: Date,
): AgentProposalV1 {
  const componentLabels: Readonly<Record<ProductComponentRole, string>> = {
    TOP: "áo",
    SKIRT: "chân váy",
    PANTS: "quần",
    DRESS: "váy",
    JACKET: "áo khoác",
    ACCESSORY: "phụ kiện",
    OTHER: "sản phẩm",
  };
  const { decision } = resolveSizeEngineDecision(product, profile, policyResolution, now);
  const chartArtifacts = Object.values(
    policyResolution?.bundle?.artifacts.sizeCharts ?? {},
  );
  if (decision.action === "HANDOFF") {
    return {
      ...proposal,
      action: "HANDOFF",
      reply: "",
      attachments: [],
      handoffReason: "BUSINESS_FACT_UNAVAILABLE",
    };
  }
  if (decision.action === "ASK_MORE") {
    const fields = decision.missingInputs
      .map((value) =>
        value === "FIT_PREFERENCE" ? "dáng mặc chị thích" : MEASUREMENT_LABELS[value]
      )
      .join(", ");
    return {
      ...proposal,
      action: "REPLY",
      reply: `Chị gửi thêm ${fields}, em tư vấn size phù hợp cho mẫu này nhé.`,
      attachments: [],
      handoffReason: null,
    };
  }
  const chartHash = decision.recommendation.chartRef?.sourceContentSha256 ?? null;
  const chartArtifact = chartHash === null
    ? null
    : chartArtifacts.find(({ chart }) =>
        chart.reference.sourceContentSha256 === chartHash
      ) ?? null;
  const chartSourceUrl = chartArtifact?.sourceMetadata.sourceReference ?? null;
  const sizeGuideUrls = verifiedSizeGuideAttachments(
    productFactsV2, chartHash, chartSourceUrl, now,
  );
  const sizes = decision.recommendation.recommendedSizes
    .map(({ componentRole, size }) => `${componentLabels[componentRole]} size ${size}`)
    .join(", ");
  const alternatives = decision.alternativeSizes.length > 0
    ? `; nếu thích mặc thoải mái có thể cân nhắc size ${decision.alternativeSizes.join(", ")}`
    : "";
  const confidence = decision.recommendation.confidence === null
    ? ""
    : ` Độ tin cậy ${Math.round(decision.recommendation.confidence * 100)}% theo bảng size đã xác minh.`;
  const evidencePrefix = proactiveSizeEvidencePrefix(decision.recommendation.reasonCodes);
  return {
    ...proposal,
    action: "REPLY",
    reply: [
      `${evidencePrefix}, chị hợp ${sizes}${alternatives}.${confidence}`,
      "Em giữ size này cho mình nha.",
    ].join(" "),
    attachments: sizeGuideUrls,
    handoffReason: null,
  };
}

export interface SizeAdviceComposition {
  readonly proposal: AgentProposalV1;
  readonly requiresHandoff: boolean;
  readonly reasonCodes: readonly string[];
}

export function composeSizeEngineAdvice(
  productInfoProposal: AgentProposalV1,
  product: StableProductDocument,
  profile: CustomerProfileV1,
  policyResolution: RuntimePolicyResolution | null,
  productFactsV2: ProductFactsV2 | null,
  now: Date,
): SizeAdviceComposition {
  const { decision, eligibility } = resolveSizeEngineDecision(product, profile, policyResolution, now);
  const sizeProposal = sizeEngineProposal(
    productInfoProposal,
    product,
    profile,
    policyResolution,
    productFactsV2,
    now,
  );
  if (sizeProposal.action === "HANDOFF") {
    return {
      proposal: productInfoProposal,
      requiresHandoff: true,
      reasonCodes: [...new Set([
        ...eligibility.eligibility.reasonCodes,
        ...decision.recommendation.reasonCodes,
      ])],
    };
  }
  return {
    proposal: {
      ...productInfoProposal,
      action: sizeProposal.action,
      reply: [productInfoProposal.reply.trim(), sizeProposal.reply.trim()]
        .filter(Boolean)
        .join("\n\n"),
      attachments: [
        ...new Set([...productInfoProposal.attachments, ...sizeProposal.attachments]),
      ],
      handoffReason: sizeProposal.handoffReason,
    },
    requiresHandoff: false,
    reasonCodes: [],
  };
}

/**
 * A deterministic response assembled from independently verified context after
 * the single permitted repair fails. It never edits model wording in place.
 */
export interface ApprovedSizeClaimFallbackContext {
  readonly facts: BusinessFactEnvelopeV1 | null;
  readonly product: StableProductDocument | null;
  readonly attachmentUrls: readonly string[];
  readonly preservedProtectedClaimIds: readonly string[];
  readonly approvedCta: string | null;
}

export function approvedSizeClaimClarification(
  proposal: AgentProposalV1,
  context?: ApprovedSizeClaimFallbackContext,
): AgentProposalV1 {
  const verifiedFactText = context?.facts && context.product
    ? (["PRICE", "STOCK", "ETA"] as const)
      .flatMap((intent) => buildVerifiedFactBlocks(context.facts!, intent, context.product!).blocks)
      .map((block) => block.text)
      .filter((text, index, values) => values.indexOf(text) === index)
      .join("\n\n")
    : "";
  const clarification = "Để tư vấn size chính xác, chị cho em xin chiều cao, cân nặng hoặc số đo phù hợp nhé.";
  return {
    ...proposal,
    action: "REPLY",
    reply: [verifiedFactText, clarification, context?.approvedCta?.trim() ?? ""]
      .filter(Boolean)
      .join("\n\n"),
    attachments: [...new Set(context?.attachmentUrls ?? [])],
    handoffReason: null,
    protectedClaimIds: [...new Set(context?.preservedProtectedClaimIds ?? [])],
  };
}
function verifiedSizeRecommendationClaimForGuard(
  product: StableProductDocument,
  profile: CustomerProfileV1,
  policyResolution: RuntimePolicyResolution | null,
  now: Date,
) {
  const { decision } = resolveSizeEngineDecision(
    product,
    profile,
    policyResolution,
    now,
  );
  return createVerifiedSizeRecommendationClaim({
    decision,
    productId: product.productId,
    profile,
  });
}

function hasSizeRecommendationBlock(reasonCodes: readonly string[]): boolean {
  return reasonCodes.some((reason) => reason.startsWith("SIZE_RECOMMENDATION_"));
}
export interface PostMediaProofCtaInput {
  readonly ctaPolicy: Wave2StrategyDecision["ctaPolicy"] | null;
  readonly imageIntent: CustomerImageIntent | null;
  readonly imageCount: number;
  readonly salesStage: SalesStage;
  readonly buyingSignal: boolean;
  readonly factsVerified: boolean;
  readonly product: StableProductDocument | null;
  readonly profile: CustomerProfileV1 | null;
  readonly policyResolution: RuntimePolicyResolution | null;
  readonly now: Date;
}

export function postMediaProofCta(
  input: PostMediaProofCtaInput,
): string | null {
  if (
    input.ctaPolicy !== "POST_MEDIA_CLOSE" ||
    (input.imageIntent !== "DETAIL" && input.imageIntent !== "FEEDBACK") ||
    input.imageCount <= 0 ||
    input.buyingSignal ||
    !input.factsVerified ||
    !input.product ||
    !input.profile ||
    (input.salesStage !== "FIT_CONSULTING" &&
      input.salesStage !== "OBJECTION_HANDLING")
  ) {
    return null;
  }
  const { decision } = resolveSizeEngineDecision(
    input.product,
    input.profile,
    input.policyResolution,
    input.now,
  );
  if (decision.action !== "REPLY") return null;
  const sizes = [...new Set(
    decision.recommendation.recommendedSizes
      .map(({ size }) => size.trim().toLocaleUpperCase("vi-VN"))
      .filter(Boolean),
  )];
  if (sizes.length === 0) return null;
  const verifiedSizes = sizes.length === 1
    ? `size ${sizes[0]}`
    : `cÃ¡c size ${naturalList(sizes)}`;
  const productId = normalizeProductCode(input.product.productId);
  return `Sau khi xem áº£nh, chá»‹ cÃ³ muá»‘n em giá»¯ ${verifiedSizes} cá»§a máº«u ${productId} Ä‘á»ƒ mÃ¬nh tiáº¿p tá»¥c Ä‘áº·t hÃ ng khÃ´ng?`;
}

export function withSizeEngineAdvice(
  productInfoProposal: AgentProposalV1,
  product: StableProductDocument,
  profile: CustomerProfileV1,
  policyResolution: RuntimePolicyResolution | null,
  productFactsV2: ProductFactsV2 | null,
  now: Date,
): AgentProposalV1 {
  return composeSizeEngineAdvice(
    productInfoProposal,
    product,
    profile,
    policyResolution,
    productFactsV2,
    now,
  ).proposal;
}

export function withProactiveSizeAdvice(
  productInfoProposal: AgentProposalV1,
  product: StableProductDocument,
  profile: CustomerProfileV1,
  policyResolution: RuntimePolicyResolution | null,
  productFactsV2: ProductFactsV2 | null,
  now: Date,
): AgentProposalV1 {
  if (!profileHasBodyMeasurements(profile)) return productInfoProposal;
  return withSizeEngineAdvice(
    productInfoProposal,
    product,
    profile,
    policyResolution,
    productFactsV2,
    now,
  );
}
export interface RealtimeRuntimePort {
  isOwnMetaMessage?(
    pageId: string,
    providerMessageId: string,
  ): Promise<boolean>;
  loadOrCreate(
    pageId: string,
    customerHash: string,
    routingOwner: "N8N" | "APP",
    createState: (conversationId: string) => ConversationState,
    now?: Date,
  ): Promise<{
    conversationId: string;
    pageId: string;
    customerHash: string;
    stateVersion: number;
    state: ConversationState;
    routingOwner: "N8N" | "APP";
    appSendEnabled: boolean;
    killSwitch: boolean;
  }>;
  loadOrCreateSalesCycle?<TState>(
    pageId: string,
    conversationId: string,
    createState: () => TState,
    now?: Date,
  ): Promise<{
    conversationId: string;
    pageId: string;
    stateRevision: number;
    state: TState;
    cartExpiresAt: Date | null;
    expiresAt: Date;
  }>;
  commit(
    input: RealtimeCommitInput<ConversationState, SalesCycleRuntimeState>,
    now?: Date,
  ): Promise<RealtimeCommitResult>;
  linkProviderConversation(
    pageId: string,
    conversationId: string,
    provider: "META" | "PANCAKE",
    externalId: string,
    verifiedAt: Date,
    expiresAt: Date,
  ): Promise<void>;
  persistObservedCustomerIdentity?(
    pageId: string,
    conversationId: string,
    customerName: string,
    observedAt: Date,
  ): Promise<boolean>;
  loadOrCreateCustomerProfile?<TProfile, TEvidence>(
    pageId: string,
    customerHash: string,
    create: () => {
      readonly profile: TProfile;
      readonly fieldEvidence: TEvidence;
      readonly revision: number;
    },
    now?: Date,
  ): Promise<{
    readonly pageId: string;
    readonly customerHash: string;
    readonly revision: number;
    readonly profile: TProfile;
    readonly fieldEvidence: TEvidence;
    readonly expiresAt: Date;
  }>;
  compareAndSwapCustomerProfile?<TProfile, TEvidence>(
    pageId: string,
    customerHash: string,
    expectedRevision: number,
    next: {
      readonly revision: number;
      readonly profile: TProfile;
      readonly fieldEvidence: TEvidence;
    },
    now?: Date,
  ): Promise<boolean>;
}

export interface RealtimeModelPort {
  generate: BaselineModelCapability["generate"];
  groundWithFacts: BaselineModelCapability["groundWithFacts"];
  groundDraftWithFacts?: BaselineModelCapability["groundDraftWithFacts"];
  repairSizeClaimDraft?: BaselineModelCapability["repairSizeClaimDraft"];
  draftMultiProductClarification?: BaselineModelCapability["draftMultiProductClarification"];
  draftCustomerUrlExplanation?: BaselineModelCapability["draftCustomerUrlExplanation"];
}

export interface CanonicalChatHistoryPort {
  recordInboundCustomerMessage(input: {
    pageId: string;
    conversationId: string;
    customerHash: string;
    providerMessageId: string;
    text: string | null;
    attachmentCount: number;
    occurredAt: Date;
    receivedAt: Date;
    enqueueShadowEvaluation?: boolean;
    adsContext?: InboundMessageV1["adsContext"];
    policyVersion?: string | null;
  }): Promise<{
    readonly messagePk: string;
    readonly shadowEvaluationEnqueued?: boolean;
  }>;
  recordOutboundHumanMessage(input: {
    pageId: string;
    conversationId: string;
    customerHash: string;
    providerMessageId: string;
    text: string | null;
    attachmentCount: number;
    occurredAt: Date;
    receivedAt: Date;
    policyVersion?: string | null;
  }): Promise<unknown>;
  recordMessageAnalysis?(input: {
    messagePk: string;
    occurredAt: Date;
    extractedAdProductId?: string | null;
    media: readonly {
      ordinal: number;
      mediaType: "IMAGE" | "VIDEO";
      status: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
      productId: string | null;
      score: number | null;
      gap: number | null;
      reasonCode: string | null;
      frameCount: number;
    }[];
  }): Promise<void>;
}

export interface RealtimeProductSearchPort {
  searchText: ProductSearchService["searchText"];
  searchImage: ProductSearchService["searchImage"];
  searchImages?: ProductSearchService["searchImages"];
  searchImageBytes?: ProductSearchService["searchImageBytes"];
}

export interface RealtimeVideoFrameExtractorPort {
  extract(videoUrl: string): Promise<VideoFrameExtraction>;
}

export interface RealtimeMediaRecognitionPort {
  recognize: RealtimeMediaRecognitionService["recognize"];
}

interface MediaClarificationDecision {
  readonly action: "OPEN" | "RETRY" | "REJECTED" | "EXHAUSTED" | "CLEAR";
  readonly candidates: readonly StableProductDocument[];
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly reasonCode: string;
}

interface ProductResolution {
  readonly primary: StableProductDocument | null;
  readonly products: readonly StableProductDocument[];
  readonly references: readonly ResolvedProductReference[];
  readonly media: MediaAggregation;
  readonly origin: "NONE" | "TEXT_CODE" | "TEXT_SEMANTIC" | "ADS" | "MEDIA" | "SELECTION" | "STATE";
      readonly extractedAdProductId: string | null;
  readonly clarification: MediaClarificationDecision | null;
}

export class RealtimeContextPreservingSchemaError extends Error {
  readonly code: string;

  constructor(
    error: unknown,
    readonly verifiedProduct: StableProductDocument | null,
    readonly productResolutionOrigin: ProductResolution["origin"],
    readonly phase: "INITIAL" | "GROUNDED" = "INITIAL",
  ) {
    const code =
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.trim()
        ? error.code.trim()
        : error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "VERTEX_SCHEMA_INVALID";
    super(code);
    this.name = "RealtimeContextPreservingSchemaError";
    this.code = code;
  }
}

export interface RealtimeTagObservationProvider {
  observe(input: {
    pageId: string;
    conversationId: string;
    customerHash: string;
    senderId: string;
    now: Date;
  }): Promise<PancakeTagObservation>;
}

export function pancakeConversationId(pageId: string, senderId: string): string {
  const page = pageId.trim();
  const sender = senderId.trim();
  if (!page) throw new Error("PANCAKE_PAGE_ID_REQUIRED");
  if (!sender) throw new Error("PANCAKE_SENDER_ID_REQUIRED");
  return `${page}_${sender}`;
}

export class PancakeRealtimeTagObservationProvider
  implements RealtimeTagObservationProvider
{
  constructor(private readonly pancake: PancakeHandoffAdapter) {}

  observe(input: {
    pageId: string;
    senderId: string;
  }): Promise<PancakeTagObservation> {
    return this.pancake.observeBlockingTags(
      input.pageId,
      pancakeConversationId(input.pageId, input.senderId),
    );
  }
}

/** Represents an unavailable Pancake observation. The conversation engine
 * applies the current fail-open policy while retaining the reason for logs.
 */
export class FailClosedTagObservationProvider
  implements RealtimeTagObservationProvider
{
  async observe(input: {
    now: Date;
  }): Promise<PancakeTagObservation> {
    return {
      schemaVersion: 1,
      verified: false,
      blockingTag: null,
      observedTagIds: [],
      observedAt: input.now.toISOString(),
      reasonCode: "PANCAKE_CONVERSATION_LINK_UNAVAILABLE",
    };
  }
}

/** Test/canary-only provider; construction is refused outside DRY_RUN. */
export class DryRunClearTagObservationProvider
  implements RealtimeTagObservationProvider
{
  constructor(mode: "DRY_RUN" | "LIVE") {
    if (mode !== "DRY_RUN") throw new Error("DRY_RUN_TAG_GATE_LIVE_FORBIDDEN");
  }

  async observe(input: {
    now: Date;
  }): Promise<PancakeTagObservation> {
    return {
      schemaVersion: 1,
      verified: true,
      blockingTag: null,
      observedTagIds: [],
      observedAt: input.now.toISOString(),
      reasonCode: null,
    };
  }
}

export interface RealtimeRunnerOptions {
  readonly workerId: string;
  readonly mode: "DRY_RUN" | "LIVE";
  readonly sendEnabled: boolean;
  readonly inboxLeaseMs?: number;
  readonly shopAlias?: string;
  readonly employeeTagId?: string;
  readonly postSaleTagId?: string;
  readonly closedOrderTagId?: string;
  readonly salesCycleEnabled?: boolean;
  readonly imageDelayMs?: number;
  readonly promptVersion?: string;
  readonly metaAppId?: string;
  readonly confirmationStartupMode?: StartupConfirmationBehaviorMode;
  readonly behaviorModeChannel?: string;
  readonly policyChannel?: RuntimePolicyChannel;
  readonly releaseId?: string;
  readonly decisionTelemetryEnabled?: boolean;
  readonly buyingSignalGuardEnabled?: boolean;
  readonly groundedDraftEnabled?: boolean;
  readonly verifiedFactAssemblerEnabled?: boolean;
  readonly customerProfileEnabled?: boolean;
  readonly verifiedVariantEnabled?: boolean;
  readonly contextHistoryLimit?: number;
  readonly multiFactQueryEnabled?: boolean;
  readonly catalogAdvisoryEnabled?: boolean;
  readonly decisionAuditV2Enabled?: boolean;
  readonly recordedReplayCaptureEnabled?: boolean;
  readonly recordedReplayPageId?: string;
  readonly mediaRecognitionEnabled?: boolean;
  readonly mediaClarificationEnabled?: boolean;
  readonly mediaRecognitionPageIds?: readonly string[];
  readonly conversationalMessageFormatEnabled?: boolean;
  readonly mediaSelectorV2GuardEnabled?: boolean;
  readonly messageGroupingV2Enabled?: boolean;
  readonly wave2StrategyEnabled?: boolean;
  readonly adAcquisitionAnalyticsMode?: "OFF" | "SHADOW" | "LIVE";
  readonly adAcquisitionPageIds?: readonly string[];
}

export interface RuntimeBehaviorModeResolverPort {
  resolve(input: {
    readonly resolutionId: string;
    readonly pageId: string;
    readonly channel: string;
    readonly workerId: string;
    readonly now?: Date;
  }): Promise<RuntimeBehaviorModeResolution>;
}

export type ModelUsageSource = "provider" | "estimated" | "missing";
export type ModelExecutionPath =
  | "not_called"
  | "model"
  | "initial_fallback"
  | "grounded_fallback"
  | "grounded_draft_fallback";

export interface ExplicitModelTelemetry {
  readonly usageSource: ModelUsageSource;
  readonly path: ModelExecutionPath;
  readonly errorClass: string | null;
  readonly tokenUsage: Readonly<{
    prompt: number | null;
    output: number | null;
    total: number | null;
  }>;
}

export function resolveExplicitModelTelemetry(input: Readonly<{
  modelCalled: boolean;
  hasProviderUsage: boolean;
  providerPromptTokens: number;
  providerOutputTokens: number;
  providerTotalTokens: number;
  inputCharacterCount: number;
  outputCharacterCount: number;
  initialFallbackUsed: boolean;
  groundedFallbackUsed?: boolean;
  groundedDraftFallbackUsed: boolean;
  errorClass: string | null;
}>): ExplicitModelTelemetry {
  if (!input.modelCalled) {
    return {
      usageSource: "missing",
      path: "not_called",
      errorClass: input.errorClass,
      tokenUsage: { prompt: null, output: null, total: null },
    };
  }
  const path: ModelExecutionPath = input.initialFallbackUsed
    ? "initial_fallback"
    : input.groundedFallbackUsed
      ? "grounded_fallback"
      : input.groundedDraftFallbackUsed
        ? "grounded_draft_fallback"
        : "model";
  if (input.hasProviderUsage) {
    return {
      usageSource: "provider",
      path,
      errorClass: input.errorClass,
      tokenUsage: {
        prompt: input.providerPromptTokens,
        output: input.providerOutputTokens,
        total: input.providerTotalTokens,
      },
    };
  }
  const prompt = Math.max(1, Math.ceil(input.inputCharacterCount / 4));
  const output = Math.max(1, Math.ceil(input.outputCharacterCount / 4));
  return {
    usageSource: "estimated",
    path,
    errorClass: input.errorClass,
    tokenUsage: { prompt, output, total: prompt + output },
  };
}

export interface ResponseGroupHandoffOrdering {
  readonly sendAfterOwnerHandoff: boolean;
  readonly afterResponseGroupId: string | null;
}

export function responseGroupHandoffOrdering(
  requiresHandoff: boolean,
  outboundMessageCount: number,
  responseGroupId: string,
): ResponseGroupHandoffOrdering {
  const orderedHandoff = requiresHandoff && outboundMessageCount > 0;
  return {
    sendAfterOwnerHandoff: orderedHandoff,
    afterResponseGroupId: orderedHandoff ? responseGroupId : null,
  };
}

export class RealtimeRunner {
  private readonly options: Required<RealtimeRunnerOptions>;

  constructor(
    private readonly inbox: RealtimeInboxPort,
    private readonly runtime: RealtimeRuntimePort,
    private readonly model: RealtimeModelPort,
    private readonly factsReader: BusinessFactsReader,
    private readonly productSearch: RealtimeProductSearchPort,
    private readonly tags: RealtimeTagObservationProvider,
    options: RealtimeRunnerOptions,
    private readonly quota?: RealtimeGenerationQuota,
    private readonly history?: ChatHistoryPort,
    private readonly canonicalHistory?: CanonicalChatHistoryPort,
    private readonly videoFrames?: RealtimeVideoFrameExtractorPort,
    private readonly policyResolver?: RuntimePolicyResolverPort,
    private readonly mediaRecognition?: RealtimeMediaRecognitionPort,
    private readonly behaviorModeResolver?: RuntimeBehaviorModeResolverPort,
  ) {
    if (options.mode === "DRY_RUN" && options.sendEnabled) {
      throw new Error("REALTIME_DRY_RUN_SEND_FORBIDDEN");
    }
    this.options = {
      workerId: options.workerId,
      mode: options.mode,
      sendEnabled: options.sendEnabled,
      inboxLeaseMs: options.inboxLeaseMs ?? 90_000,
      shopAlias: options.shopAlias ?? "LANA",
      employeeTagId: options.employeeTagId ?? "",
      postSaleTagId: options.postSaleTagId ?? "",
      closedOrderTagId: options.closedOrderTagId ?? "",
      salesCycleEnabled: options.salesCycleEnabled ?? false,
      imageDelayMs: Math.max(
        0,
        Math.min(5_000, Math.trunc(options.imageDelayMs ?? 500)),
      ),
      promptVersion: options.promptVersion ?? "lana-realtime-v1",
      metaAppId: options.metaAppId ?? "",
      policyChannel: options.policyChannel ?? "CANARY_SHADOW",
      releaseId: options.releaseId ?? "unversioned",
      decisionTelemetryEnabled: options.decisionTelemetryEnabled ?? false,
      confirmationStartupMode: options.confirmationStartupMode ?? "LEGACY",
      behaviorModeChannel: options.behaviorModeChannel ?? "MESSENGER",
      buyingSignalGuardEnabled: options.buyingSignalGuardEnabled ?? false,
      groundedDraftEnabled: options.groundedDraftEnabled ?? false,
      verifiedFactAssemblerEnabled:
        options.verifiedFactAssemblerEnabled ?? false,
      customerProfileEnabled: options.customerProfileEnabled ?? false,
      verifiedVariantEnabled: options.verifiedVariantEnabled ?? false,
      contextHistoryLimit: Math.max(
        1,
        Math.min(30, Math.trunc(options.contextHistoryLimit ?? 30)),
      ),
      multiFactQueryEnabled: options.multiFactQueryEnabled ?? false,
      catalogAdvisoryEnabled: options.catalogAdvisoryEnabled ?? false,
      decisionAuditV2Enabled: options.decisionAuditV2Enabled ?? false,
      recordedReplayCaptureEnabled:
        options.recordedReplayCaptureEnabled ?? false,
      recordedReplayPageId: options.recordedReplayPageId ?? "",
      mediaRecognitionEnabled: options.mediaRecognitionEnabled ?? false,
      mediaClarificationEnabled: options.mediaClarificationEnabled ?? false,
      mediaRecognitionPageIds: [
        ...(options.mediaRecognitionPageIds ?? []),
      ],
      conversationalMessageFormatEnabled:
        options.conversationalMessageFormatEnabled ?? false,
      messageGroupingV2Enabled:
        options.messageGroupingV2Enabled ?? false,
      mediaSelectorV2GuardEnabled:
        options.mediaSelectorV2GuardEnabled ?? false,
      wave2StrategyEnabled: options.wave2StrategyEnabled ?? false,
      adAcquisitionAnalyticsMode: options.adAcquisitionAnalyticsMode ?? "OFF",
      adAcquisitionPageIds: [...(options.adAcquisitionPageIds ?? [])],
    };
  }

  /**
   * Policy-aware extension point for the current inbound message.
   * The default is intentionally inert. An override can only run after the
   * envelope, generation and own-echo gates and canonical policy resolution.
   */
  protected transformInboundAfterPolicyResolution(
    message: InboundMessageV1,
    _policyResolution: RuntimePolicyResolution | null,
  ): InboundMessageV1 {
    return message;
  }

  private async loadAndMergeCustomerProfile(
    pageId: string,
    customerHash: string,
    messages: readonly InboundMessageV1[],
    now: Date,
  ): Promise<CustomerProfileV1> {
    if (
      !this.runtime.loadOrCreateCustomerProfile ||
      !this.runtime.compareAndSwapCustomerProfile
    ) {
      throw new Error("CUSTOMER_PROFILE_RUNTIME_PORT_REQUIRED");
    }
    const measurements = messages
      .filter((message) => !message.isEcho && Boolean(message.text?.trim()))
      .flatMap((message) =>
        extractCustomerMeasurements({
          text: message.text ?? "",
          observedAt: message.occurredAt,
          sourceEventHash: createHash("sha256")
            .update(message.eventKey)
            .digest("hex"),
        })
      );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const record = await this.runtime.loadOrCreateCustomerProfile<
        CustomerProfileV1,
        CustomerProfileEvidenceMap
      >(
        pageId,
        customerHash,
        () => ({
          profile: newCustomerProfile(pageId, customerHash, now),
          fieldEvidence: {},
          revision: 1,
        }),
        now,
      );
      if (measurements.length === 0) return record.profile;
      const merged = mergeCustomerProfile(
        {
          profile: record.profile,
          fieldEvidence: record.fieldEvidence,
        },
        {
          profileId: record.profile.profileId,
          expectedRevision: record.profile.revision,
          measurements,
        },
      );
      if (merged.cas.nextRevision === merged.cas.expectedRevision) {
        return merged.profile;
      }
      const stored = await this.runtime.compareAndSwapCustomerProfile(
        pageId,
        customerHash,
        record.revision,
        {
          revision: merged.profile.revision,
          profile: merged.profile,
          fieldEvidence: merged.fieldEvidence,
        },
        now,
      );
      if (stored) return merged.profile;
    }
    throw new Error("CUSTOMER_PROFILE_REVISION_CONFLICT");
  }

  private async resolveBusinessFactQueries(
    queries: BusinessFactQueriesV2,
    products: readonly StableProductDocument[],
  ): Promise<readonly MultiFactResolution[]> {
    return resolveBusinessFactQueriesBounded(
      queries,
      products,
      this.factsReader.resolve.bind(this.factsReader),
      this.options.shopAlias,
    );
  }

  async processOne(): Promise<boolean> {
    const batch = await this.claimNextWork();
    if (!batch) return false;
    try {
      // This is only a cost-saving hint. A newer message can still arrive
      // after this check, so every real customer/page-echo commit below also
      // carries the transactional inboxBatchGuard.
      const knownSuperseded =
        batch.nativeBatch &&
        batch.generation !== null &&
        this.inbox.isBatchCurrent
          ? !(await this.inbox.isBatchCurrent(this.batchLease(batch)))
          : false;
      if (knownSuperseded) {
        await this.completeWork(batch, true);
        return true;
      }
      const status = await this.processBatch(batch, knownSuperseded);
      if (status === "COMMITTED" || status === "SUPERSEDED") return true;
      await this.completeWork(batch, status === "INBOX_ONLY");
      return true;
    } catch (error) {
      const code =
        error instanceof Error && error.message
          ? error.message.slice(0, 128)
          : "REALTIME_PROCESSING_FAILED";
      const retrySeed = batch.items.at(-1)?.eventKey ?? batch.conversationHash;
      const delaySeconds = inboxRetryDelaySeconds(
        batch.attemptCount,
        `${retrySeed}:${batch.attemptCount}`,
      );
      if (batch.nativeBatch) {
        if (batch.attemptCount >= 5) {
          if (!this.inbox.failBatchPermanent) {
            throw new Error("REALTIME_FAIL_BATCH_PORT_REQUIRED");
          }
          await this.inbox.failBatchPermanent(this.batchLease(batch), code);
        } else {
          if (!this.inbox.retryBatch) {
            throw new Error("REALTIME_RETRY_BATCH_PORT_REQUIRED");
          }
          await this.inbox.retryBatch(
            this.batchLease(batch),
            code,
            delaySeconds,
          );
        }
      } else {
        const claim = batch.items[0];
        if (!claim) throw new Error("REALTIME_SINGLETON_BATCH_EMPTY");
        if (claim.attemptCount >= 5) {
          await this.inbox.failPermanent(claim.inboxId, claim.leaseToken, code);
        } else {
          await this.inbox.retry(
            claim.inboxId,
            claim.leaseToken,
            code,
            delaySeconds,
          );
        }
      }
      return true;
    }
  }

  private async claimNextWork(): Promise<RunnerInboundBatch | null> {
    if (this.inbox.claimNextBatch) {
      const batch = await this.inbox.claimNextBatch(
        this.options.workerId,
        this.options.inboxLeaseMs,
      );
      return batch ? { ...batch, nativeBatch: true } : null;
    }
    const claim = await this.inbox.claimNext(
      this.options.workerId,
      this.options.inboxLeaseMs,
    );
    if (!claim) return null;
    const eventKind = claim.eventKind ??
      (claim.envelope.message.isEcho ? "PAGE_ECHO" : "CUSTOMER");
    return {
      nativeBatch: false,
      pageId: claim.pageId,
      conversationHash: claim.conversationHash,
      generation: null,
      leaseToken: claim.leaseToken,
      inboxIds: [claim.inboxId],
      evaluationGroupId: claim.inboxId,
      eventKind,
      firstReceiveSequence: claim.receiveSequence,
      lastReceiveSequence: claim.receiveSequence,
      attemptCount: claim.attemptCount,
      items: [claim],
    };
  }

  private batchLease(batch: RunnerInboundBatch): InboxBatchLease {
    return {
      pageId: batch.pageId,
      conversationHash: batch.conversationHash,
      generation: batch.generation,
      leaseToken: batch.leaseToken,
      inboxIds: batch.inboxIds,
    };
  }

  private batchGuard(batch: RunnerInboundBatch): RealtimeInboxBatchGuard | undefined {
    return batch.nativeBatch && batch.eventKind !== "APP_ECHO" &&
        batch.generation !== null
      ? {
          generation: batch.generation,
          leaseToken: batch.leaseToken,
          inboxIds: batch.inboxIds,
        }
      : undefined;
  }

  private async completeWork(
    batch: RunnerInboundBatch,
    requireCurrentGeneration = false,
  ): Promise<void> {
    if (batch.nativeBatch) {
      if (!this.inbox.completeBatch) {
        throw new Error("REALTIME_COMPLETE_BATCH_PORT_REQUIRED");
      }
      const completed = await this.inbox.completeBatch(
        this.batchLease(batch),
        requireCurrentGeneration,
      );
      // A guarded inbox-only completion returns false when a newer generation
      // won the race; the store has already released those rows for regrouping.
      if (!completed && !requireCurrentGeneration) {
        throw new Error("INBOX_BATCH_LEASE_LOST");
      }
      return;
    }
    const claim = batch.items[0];
    if (!claim || !(await this.inbox.complete(claim.inboxId, claim.leaseToken))) {
      throw new Error("INBOX_LEASE_LOST");
    }
  }

  private async processBatch(
    batch: RunnerInboundBatch,
    knownSuperseded: boolean,
  ): Promise<BatchCommitStatus> {
    const processingStartedAt = Date.now();
    if (batch.items.length === 0) throw new Error("REALTIME_BATCH_EMPTY");
    const claims = [...batch.items].sort((left, right) =>
      left.receiveSequence - right.receiveSequence
    );
    const claim = claims.at(-1)!;
    const envelope = claim.envelope;
    for (const item of claims) {
      if (
        item.pageId !== batch.pageId ||
        item.conversationHash !== batch.conversationHash ||
        item.envelope.schemaVersion !== 1 ||
        item.envelope.message.pageId !== item.pageId
      ) {
        throw new Error("REALTIME_ENVELOPE_INVALID");
      }
    }
    const sourceMessages = claims.map((item) => item.envelope.message);
    const texts = sourceMessages
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean);
    let message: InboundMessageV1 = {
      ...envelope.message,
      text: texts.length > 0 ? texts.join("\n") : null,
      attachments: sourceMessages.flatMap((item) => item.attachments),
      adsContext: [...sourceMessages]
        .reverse()
        .find((item) => item.adsContext)?.adsContext ?? null,
    };
    const now = new Date();
    const inboxBatchGuard = this.batchGuard(batch);
    if (message.isEcho) {
      const matchesOutbox =
        message.messageId !== null && this.runtime.isOwnMetaMessage
          ? await this.runtime.isOwnMetaMessage(claim.pageId, message.messageId)
          : false;
      const matchesCurrentApp =
        this.options.metaAppId !== "" &&
        message.appId !== null &&
        message.appId === this.options.metaAppId;

      // Meta echoes every page-sent message back to the webhook. An echo that
      // matches our accepted outbox is delivery evidence, not a human reply.
      // app_id is intentionally only a fallback for echoes whose mid cannot be
      // reconciled (for example, a delayed or incomplete Meta callback).
      if (matchesOutbox || matchesCurrentApp) return "NOT_REQUESTED";
    }
    const record = await this.runtime.loadOrCreate(
      claim.pageId,
      claim.conversationHash,
      envelope.routing.routingOwner,
      (conversationId) =>
        createConversationState({
          conversationId,
          routingOwner: envelope.routing.routingOwner,
          now,
        }),
      now,
    );
    const pancakeId = pancakeConversationId(claim.pageId, message.senderId);
    await this.runtime.linkProviderConversation(
      claim.pageId,
      record.conversationId,
      "PANCAKE",
      pancakeId,
      now,
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000),
    );
    const state = record.state;
    if (
      state.schemaVersion !== 1 ||
      state.conversationId !== record.conversationId ||
      state.revision !== record.stateVersion
    ) {
      throw new Error("REALTIME_STATE_INVALID");
    }
    const salesCycleRecord = this.options.salesCycleEnabled
      ? this.runtime.loadOrCreateSalesCycle
        ? await this.runtime.loadOrCreateSalesCycle<SalesCycleRuntimeState>(
            claim.pageId,
            record.conversationId,
            () => createRealtimeSalesState(record.conversationId, claim.pageId, now),
            now,
          )
        : (() => {
            throw new Error("SALES_CYCLE_RUNTIME_PORT_REQUIRED");
          })()
      : null;
    const preSalePolicyIntent = message.isEcho
      ? null
      : classifyPreSalePolicyIntent(message.text ?? "");

    // Policy content is never fed to the model. CANARY_SHADOW is audit-only;
    // only a LIVE_OUTBOUND result can reach deterministic business helpers.
    const policyResolution = await this.policyResolver?.resolve({
      pageId: claim.pageId,
      channel: this.options.policyChannel,
      // Realtime currently has a conversation-scoped sales episode. The
      // cart runtime uses its own CART pin when a durable cart is opened.
      ...(this.options.policyChannel === "CANARY_SHADOW" || preSalePolicyIntent !== null
        ? {}
        : {
            pin: {
              scopeType: "SALES_EPISODE" as const,
              scopeId: `${record.conversationId}:${this.options.policyChannel}`,
            },
          }),
      now,
    }) ?? null;
    message = this.transformInboundAfterPolicyResolution(
      message,
      policyResolution,
    );
    const mediaInputLimitExceeded = !message.isEcho &&
      message.attachments.filter((attachment) =>
        attachment.type.toLowerCase() === "image"
      ).length > MAX_INBOUND_IMAGE_ATTACHMENTS;
    const customerUrlDecision = classifyCustomerUrlsForInbound(
      message.text ?? "",
      activeCustomerUrlPolicy(policyResolution),
      mediaInputLimitExceeded,
    );
    const policyAuditRef = policyResolution?.bundle
      ? runtimePolicyAuditReference(policyResolution.bundle)
      : null;
    const behaviorModeResolution = await this.behaviorModeResolver?.resolve({
      resolutionId: deterministicUuid(
        `behavior-mode:${claim.pageId}:${this.options.behaviorModeChannel}:${message.eventKey}`,
      ),
      pageId: claim.pageId,
      channel: this.options.behaviorModeChannel,
      workerId: this.options.workerId,
      now,
    }) ?? startupBehaviorModeResolution(
      this.options.confirmationStartupMode,
      now,
    );
    const customerProfile =
      this.options.customerProfileEnabled && !knownSuperseded && !message.isEcho
        ? await this.loadAndMergeCustomerProfile(
            claim.pageId,
            claim.conversationHash,
            sourceMessages,
            now,
          )
        : null;

    let triggerMessagePk: string | null = null;
    let lastInboundIndex = -1;
    for (let index = 0; index < claims.length; index += 1) {
      if (!claims[index]?.envelope.message.isEcho) lastInboundIndex = index;
    }
    for (let index = 0; index < claims.length; index += 1) {
      const item = claims[index];
      if (!item) continue;
      const original = item.envelope.message;
      if (!original.isEcho && this.canonicalHistory) {
        const enqueueShadowEvaluation =
          this.options.recordedReplayCaptureEnabled &&
          item.pageId === this.options.recordedReplayPageId &&
          index === lastInboundIndex;
        const recorded = await this.canonicalHistory.recordInboundCustomerMessage({
          pageId: item.pageId,
          conversationId: record.conversationId,
          customerHash: item.conversationHash,
          providerMessageId: original.messageId ?? `event:${original.eventKey}`,
          text: original.text,
          attachmentCount: original.attachments.length,
          occurredAt: new Date(original.occurredAt),
          receivedAt: item.receivedAt,
          enqueueShadowEvaluation,
          adsContext: original.adsContext,
          policyVersion: policyAuditRef,
        });
        if (
          enqueueShadowEvaluation &&
          recorded.shadowEvaluationEnqueued === false
        ) {
          process.stderr.write(
            `${JSON.stringify({
              level: "warn",
              code: "REALTIME_SHADOW_EVALUATION_ENQUEUE_SKIPPED",
              pageId: item.pageId,
            })}\n`,
          );
        }
        triggerMessagePk = recorded.messagePk;
      } else if (original.isEcho && this.canonicalHistory) {
        await this.canonicalHistory.recordOutboundHumanMessage({
          pageId: item.pageId,
          conversationId: record.conversationId,
          customerHash: item.conversationHash,
          providerMessageId: original.messageId ?? `event:${original.eventKey}`,
          text: original.text,
          attachmentCount: original.attachments.length,
          occurredAt: new Date(original.occurredAt),
          receivedAt: item.receivedAt,
          policyVersion: policyAuditRef,
        });
      }
    }

    const currentContexts: ShadowContextMessage[] = sourceMessages.map((original) => ({
      direction: original.isEcho ? ("OUTBOUND" as const) : ("INBOUND" as const),
      senderType: original.isEcho ? ("HUMAN" as const) : ("CUSTOMER" as const),
      messageType:
        original.attachments.length > 0
          ? original.text
            ? ("MIXED" as const)
            : ("IMAGE" as const)
          : ("TEXT" as const),
      text: redactCustomerUrlsForModel(
        redactAnalyticsMessage(original.text ?? "").text,
      ),
      attachmentCount: original.attachments.length,
      occurredAt: original.occurredAt,
    }));
    let context: ShadowContextMessage[] = currentContexts;
    if (this.history) {
      const currentFingerprints = new Set(currentContexts.map(contextFingerprint));
      const priorContext = [...await this.history.load(
        record.conversationId,
        this.options.contextHistoryLimit,
      )
        .catch(() => [])]
        .map((entry) => ({
          ...entry,
          text: redactCustomerUrlsForModel(entry.text),
        }))
        .filter((entry) => !currentFingerprints.has(contextFingerprint(entry)));
      for (let index = 0; index < currentContexts.length; index += 1) {
        const currentContext = currentContexts[index];
        const original = sourceMessages[index];
        if (!currentContext || !original) continue;
        await this.history.append(record.conversationId, {
          ...currentContext,
          identityKey: original.eventKey,
        }).catch(() => false);
      }
      context = [...priorContext, ...currentContexts];
    }
    const modelContext: ShadowContextMessage[] = [
      {
        direction: "INBOUND",
        senderType: "SYSTEM",
        messageType: "EVENT",
        text: JSON.stringify({
          type: "CONVERSATION_STATE",
          currentProductId: state.currentProductId,
          consideredVariant: state.consideredVariant,
          verifiedVariant:
            this.options.verifiedVariantEnabled
              ? state.verifiedVariant ?? null
              : null,
          customerProfile:
            this.options.customerProfileEnabled
              ? customerProfileSummary(customerProfile)
              : null,
          salesStage: state.salesStage,
          objectionType: state.objectionType,
        }),
        attachmentCount: 0,
        occurredAt: now.toISOString(),
      },
      ...context,
    ];

    const observation = await this.tags.observe({
      pageId: claim.pageId,
      conversationId: record.conversationId,
      customerHash: claim.conversationHash,
      senderId: message.senderId,
      now,
    });
    const observedName = observation.customerName
      ?.trim()
      .replace(/\s+/gu, " ")
      .slice(0, 160);
    if (
      observation.verified &&
      observedName &&
      this.runtime.persistObservedCustomerIdentity
    ) {
      // Admin identity enrichment is optional. It must never block customer
      // message processing if its short-lived encrypted projection is down.
      await this.runtime.persistObservedCustomerIdentity(
        claim.pageId,
        record.conversationId,
        observedName,
        new Date(observation.observedAt),
      ).catch(() => false);
    }
    if (knownSuperseded && inboxBatchGuard) {
      const event = this.conversationEvent(
        message,
        batch.lastReceiveSequence,
        null,
        customerUrlDecision.disposition === "HANDOFF",
      );
      const applied = applyInboundEvent({
        state,
        expectedRevision: state.revision,
        fence: Math.max(state.lastFence + 1, batch.lastReceiveSequence),
        event,
        tagObservation: observation,
        now,
      });
      if (applied.status !== "APPLIED") return "INBOX_ONLY";
      const result = await this.runtime.commit(
        {
          pageId: batch.pageId,
          customerHash: batch.conversationHash,
          conversationId: record.conversationId,
          expectedStateVersion: record.stateVersion,
          state: applied.state,
          inboxBatchGuard,
        },
        now,
      );
      return batchCommitStatus(result);
    }
    const mediaPartialResolutionPolicy =
      activeMediaPartialResolutionPolicy(policyResolution);
    let customerUrlDisposition: CustomerUrlDisposition = customerUrlDecision.disposition;
    let customerUrlReasonCodes = [...customerUrlDecision.reasonCodes];
    const approvedCustomerUrl = !mediaInputLimitExceeded && !message.isEcho &&
      (customerUrlDisposition === "CONTINUE" ||
        customerUrlDisposition === "VERIFY_ADMIN_MEDIA") &&
      customerUrlDecision.items.length > 0;
    const approvedCustomerUrlResolution = approvedCustomerUrl
      ? await this.resolveCustomerUrlProducts(customerUrlDecision)
      : null;
    if (approvedCustomerUrl && approvedCustomerUrlResolution === null) {
      customerUrlDisposition = "EXPLAIN_UNSUPPORTED";
      customerUrlReasonCodes = [
        ...new Set([
          ...customerUrlReasonCodes,
          customerUrlDecision.disposition === "VERIFY_ADMIN_MEDIA"
            ? "CUSTOMER_URL_MEDIA_NOT_VERIFIED"
            : "CUSTOMER_URL_PRODUCT_NOT_FOUND",
        ]),
      ];
    }
    const residualCustomerUrlResolution = approvedCustomerUrlResolution
      ? await this.resolveResidualCustomerUrlProducts(
          message,
          state,
          claim.pageId,
          mediaPartialResolutionPolicy,
        )
      : null;
    if (
      residualCustomerUrlResolution?.references.some(
        ({ resolution: referenceResolution }) => referenceResolution !== "RESOLVED",
      )
    ) {
      customerUrlDisposition = "HANDOFF";
      customerUrlReasonCodes = [
        ...new Set([
          ...customerUrlReasonCodes,
          "CUSTOMER_URL_RESIDUAL_PRODUCT_UNRESOLVED",
        ]),
      ];
    }
    const combinedCustomerUrlResolution = approvedCustomerUrlResolution
      ? this.combineCustomerUrlResolutions(
          approvedCustomerUrlResolution,
          residualCustomerUrlResolution ?? this.emptyResolution(),
        )
      : null;
    const resolution = mediaInputLimitExceeded || message.isEcho ||
        customerUrlDisposition === "HANDOFF" ||
        customerUrlDisposition === "EXPLAIN_UNSUPPORTED" ||
        isPostSaleRequest(message.text ?? "") ||
        preSalePolicyIntent !== null
      ? this.emptyResolution()
      : combinedCustomerUrlResolution ?? await this.resolveProducts(
          message,
          state,
          claim.pageId,
          mediaPartialResolutionPolicy,
        );
    const multiFactQueries =
      this.options.multiFactQueryEnabled && !message.isEcho
        ? buildBusinessFactQueries(
            message.eventKey,
            message.text ?? "",
            resolution.references,
          )
        : null;
    const mediaDisposition = decideMediaBatchDisposition({
      aggregation: resolution.media,
      policy: mediaPartialResolutionPolicy,
      hasClarification:
        resolution.clarification !== null && resolution.clarification.action !== "CLEAR",
    });
    const multiProductPolicy = activeMultiProductResolutionPolicy(policyResolution);
    const approvedUrlRequiresSelection = approvedCustomerUrl &&
      multiFactQueries === null;
    const multiProductIds = resolution.origin === "MEDIA" || approvedUrlRequiresSelection
      ? resolution.products.map((product) => product.productId)
      : [];
    const multiProductDecision = approvedCustomerUrl &&
        multiProductPolicy === "LEGACY" && new Set(multiProductIds).size > 1
      ? {
          disposition: "FAIL_CLOSED" as const,
          productIds: multiProductIds,
          reasonCodes: ["CUSTOMER_URL_MULTI_PRODUCT_POLICY_REQUIRED"],
        }
      : decideMultiProductResolution({
          policy: multiProductPolicy,
          productIds: multiProductIds,
        });
    let resolvedProduct = multiProductDecision.disposition !== "CONTINUE"
      ? null
      : resolution.primary;
    let productResolutionOrigin: ProductResolution["origin"] = resolution.origin;
    let suppressStateContinuation = false;
    if (
      triggerMessagePk &&
      this.canonicalHistory?.recordMessageAnalysis &&
      (message.adsContext || resolution.media.totalCount > 0)
    ) {
      await this.canonicalHistory.recordMessageAnalysis({
        messagePk: triggerMessagePk,
        occurredAt: new Date(message.occurredAt),
        extractedAdProductId: resolution.extractedAdProductId,
        media: resolution.media.items.map((item) => ({
          ordinal: item.ordinal,
          mediaType: item.mediaType,
          status: item.status,
          productId: item.product?.productId ?? null,
          score: item.score,
          gap: item.gap,
          reasonCode: item.reasonCode,
          frameCount: item.frameCount,
        })),
      }).catch(() => undefined);
    }
    const event = this.conversationEvent(
      message,
      batch.lastReceiveSequence,
      resolvedProduct?.productId ?? null,
      customerUrlDisposition === "HANDOFF",
    );
    const applied = applyInboundEvent({
      state,
      expectedRevision: state.revision,
      fence: Math.max(state.lastFence + 1, batch.lastReceiveSequence),
      event,
      tagObservation: observation,
      now,
    });
    if (applied.status !== "APPLIED") return "INBOX_ONLY";

    let nextState = applied.state;
    const hasNewCustomerImage = !message.isEcho &&
      message.attachments.some((attachment) =>
        attachment.type.toLowerCase() === "image" && Boolean(attachment.url)
      );
    const mediaRecognitionActive = this.mediaRecognitionEnabledForPage(claim.pageId);
    if (mediaRecognitionActive && hasNewCustomerImage) {
      nextState = {
        ...nextState,
        currentProductId: resolvedProduct?.productId ?? null,
        mediaClarification: null,
        ...(resolvedProduct ? {} : { productSelections: [] }),
      };
    }
    let clarificationHandled = false;
    const stateClarification =
      resolution.clarification && (
        resolution.clarification.action === "CLEAR" ||
        mediaDisposition.disposition === "OPEN_CLARIFICATION"
      )
        ? resolution.clarification
        : null;
    if (stateClarification) {
      const clarification = stateClarification;
      if (clarification.action === "OPEN") {
        const selections = clarification.candidates.map((product, index) => ({
          label: `MAU_${index + 1}`,
          productId: product.productId,
        }));
        nextState = {
          ...nextState,
          currentProductId: null,
          productSelections: selections,
          mediaClarification: {
            status: "ACTIVE",
            candidates: selections,
            attemptCount: clarification.attemptCount,
            maxAttempts: clarification.maxAttempts,
            reasonCode: clarification.reasonCode,
            openedAt: now.toISOString(),
          },
        };
      } else if (clarification.action === "RETRY" && nextState.mediaClarification) {
        nextState = {
          ...nextState,
          currentProductId: null,
          mediaClarification: {
            ...nextState.mediaClarification,
            attemptCount: clarification.attemptCount,
          },
        };
      } else {
        nextState = {
          ...nextState,
          mediaClarification: null,
          productSelections: [],
          ...(clarification.action === "CLEAR" && resolvedProduct
            ? { currentProductId: resolvedProduct.productId }
            : { currentProductId: null }),
        };
      }
    }
    let metaMessages: RealtimeMetaMessageUnit[] = [];
    let proposal: AgentProposalV1 | null = null;
    let guardVerifiedAttachmentUrls: ReadonlySet<string> | undefined;
    const mediaSelectorV2GuardActive =
      this.options.mediaSelectorV2GuardEnabled &&
      this.options.mediaRecognitionPageIds.includes(claim.pageId);
    let handoff = applied.handoff;
    let handoffEventReasonCode: string | null = null;
    let businessFacts: BusinessFactEnvelopeV1 | null = null;
    let businessFactEnvelopes: BusinessFactEnvelopeV1[] = [];
    let deterministicProtectedClaimTypes: ProtectedClaimV1["type"][] = [];
    let handoffGuardReasonCodes: readonly string[] =
      customerUrlDisposition === "HANDOFF" ? customerUrlReasonCodes : [];
    let sizeAdviceRequiresHandoff = false;
    let salesCyclePlan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null = null;
    let salesDesiredTag: "NHAN_VIEN" | "DA_CHOT_DON" | null = null;
    let salesHandoffReasonCode: string | null = null;
    let salesTelemetry: RealtimeSalesCycleTelemetry | null = null;
    let salesProtectedOutbound: RealtimeSalesCycleOutput["protectedOutbound"] | null = null;
    let salesReadinessAttempt: DeterministicEffectReadinessV1 | null = null;
    let buyingSignalOverride = false;
    let modelCalled = false;
    let modelVersion: string | null = null;
    let modelLatencyMs = 0;
    let modelPromptTokens = 0;
    let modelOutputTokens = 0;
    let modelTotalTokens = 0;
    let hasModelTokenUsage = false;
    let initialVertexFallbackUsed = false;
    let groundedFallbackUsed = false;
    let groundedDraftFallbackUsed = false;
    let modelErrorClass: string | null = null;
    let salesHandled = false;
    let guardedPlanHash: string | null = null;
    let proposalGuardReasonCodes: readonly string[] | null = null;
    let protectedClaimValidation: ProtectedClaimValidationSummary = {
      outcome: "NOT_EVALUATED",
      claimTypes: [],
      validatedCount: 0,
      rejectedCount: 0,
    };
    let verifiedSizeClaimForTurn: SizeRecommendationProtectedClaimV1 | null = null;
    let wave2StrategyDecision: Wave2StrategyDecision | null = null;
    let multiFactAudit: NonNullable<
      RealtimeDecisionEventPlan["details"]["factQueryResults"]
    > = [];
    let canonicalDecisionEvidence: CanonicalDecisionEvidenceV1 | null = null;
    const canonicalDecisionEvidenceForTurn = (): CanonicalDecisionEvidenceV1 => {
      canonicalDecisionEvidence ??= buildCanonicalDecisionEvidenceV1({
        text: message.isEcho ? "" : message.text ?? "",
        sourceMessageId: message.messageId ?? message.eventKey,
        productId:
          resolvedProduct?.productId ?? nextState.currentProductId,
        modelBuyingIntent: proposal?.salesSignals?.buyingIntent ?? null,
        evaluatedAt: now,
      });
      return canonicalDecisionEvidence;
    };
    let buyingSignal = {
      isBuyingSignal: false,
      reasons: [] as readonly string[],
    };
    const deterministicBuyingHintForTurn = () => detectBuyingSignal(
      message.isEcho ? "" : message.text ?? "",
      {
        hasProductContext: Boolean(
          resolvedProduct?.productId ?? nextState.currentProductId,
        ),
      },
    );
    const imageIntent = message.isEcho
      ? null
      : explicitCustomerImageIntent(message.text ?? "");
    if (
      this.options.wave2StrategyEnabled &&
      !message.isEcho &&
      nextState.salesStage !== "POST_SALE"
    ) {
      wave2StrategyDecision = decideWave2SalesStrategy({
        text: message.text ?? "",
        salesStage: nextState.salesStage,
        objectionType: event.objectionType,
        buyingSignal: deterministicBuyingHintForTurn().isBuyingSignal,
        hasVerifiedProduct: Boolean(
          resolvedProduct?.productId ?? nextState.currentProductId,
        ),
        resolvedProductCount: Math.max(
          resolution.products.length,
          resolvedProduct ? 1 : 0,
        ),
        hasMeasurements:
          (customerProfile?.measurements.length ?? 0) > 0 ||
          hasCustomerMeasurementSignal(message.text ?? ""),
        requestedProof: requestedProofForImageIntent(imageIntent),
        modelAnalysis: null,
      });
    }
    const catalogSnapshot =
      resolvedProduct && this.factsReader.readCatalogSnapshot
        ? await this.factsReader.readCatalogSnapshot(
            this.options.shopAlias,
            resolvedProduct.productId,
          )
        : null;
    const productFactsV2 =
      resolvedProduct && catalogSnapshot
        ? buildRealtimeProductFactsV2({
            snapshot: catalogSnapshot,
            product: resolvedProduct,
            policy: policyResolution,
            now,
          })
        : null;
    const mediaKindV2 = imageIntent === "DETAIL"
      ? "DETAIL_FABRIC" as const
      : imageIntent === "FEEDBACK" || imageIntent === "SIZE_GUIDE"
        ? imageIntent
        : imageIntent === "GENERIC" || imageIntent === "PRODUCT_ONLY"
          ? "FULL_LOOK" as const
          : null;
    const mediaV2 = mediaKindV2 && productFactsV2
      ? selectProductMediaV2({
          product: productFactsV2,
          kind: mediaKindV2,
          maxAssets: 3,
          now,
          unavailableFallback: {
            verifiedFact: {
              answer: `${productFactsV2.content.productName} vẫn có thể kiểm tra giá và size`,
              source: "PRODUCT_FACTS_V2",
              freshnessState: "FRESH",
              sourceVersion: productFactsV2.content.metadata.sourceVersion,
              observedAt: productFactsV2.content.metadata.observedAt,
            },
            nextStep: "ASK_SIZE_PROFILE",
          },
        })
      : null;
    const imageRequest = imageIntent !== null && resolvedProduct !== null
      ? mediaV2
        ? {
            intent: imageIntent,
            images: mediaV2.selection.selected.map(({ url }) => url),
            reasonCode: mediaV2.unavailableReason ?? "OK",
            customerTextUnits: mediaV2.customerTextUnits,
            mediaSelectorV2: true,
          }
        : (() => {
            const selection = selectImages(resolvedProduct!, imageIntent);
            return {
              intent: imageIntent,
              images: selection.images.map(({ url }) => url),
              reasonCode: selection.reasonCode,
              customerTextUnits: [] as readonly string[],
              mediaSelectorV2: false,
            };
          })()
      : null;
    const advisoryIntent =
      this.options.catalogAdvisoryEnabled && !message.isEcho
        ? catalogAdvisoryIntent(message.text ?? "")
        : null;
    const shouldUseMultiFacts = multiFactQueries !== null && (
      multiFactQueries.queries.length > 1 ||
      (multiFactQueries.queries[0]?.requestedFacts.length ?? 0) > 1
    );
    if (applied.status === "APPLIED" && applied.authorization.allowEvaluate) {
      if (mediaInputLimitExceeded) {
        handoffGuardReasonCodes = ["MEDIA_INPUT_LIMIT_EXCEEDED"];
        handoffEventReasonCode = "MEDIA_INPUT_LIMIT_EXCEEDED";
        const transitioned = applySilentHandoff(
          nextState,
          "PRODUCT_AMBIGUOUS",
          nextState.revision,
          nextState.lastFence,
          now,
        );
        nextState = transitioned.state;
        handoff = transitioned.handoff;
      } else if (customerUrlDisposition === "EXPLAIN_UNSUPPORTED") {
        clarificationHandled = true;
        const soleCustomerUrl = customerUrlDecision.items.length === 1
          ? customerUrlDecision.items[0]
          : undefined;
        const explanationClass = soleCustomerUrl &&
            soleCustomerUrl.classification !== "SUSPICIOUS_DANGEROUS"
          ? soleCustomerUrl.classification
          : "UNSUPPORTED_EXTERNAL";
        let explanationRejectionReasons: readonly string[] = [];
        if (!this.model.draftCustomerUrlExplanation) {
          explanationRejectionReasons = ["CUSTOMER_URL_EXPLANATION_MODEL_UNAVAILABLE"];
        } else {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            if (this.quota && !(await this.quota.reserve(claim.pageId, now))) {
              explanationRejectionReasons = ["CUSTOMER_URL_EXPLANATION_QUOTA_DENIED"];
              break;
            }
            try {
              modelCalled = true;
              const drafted = await this.model.draftCustomerUrlExplanation(
                explanationClass,
                [...new Set([
                  ...customerUrlReasonCodes,
                  ...explanationRejectionReasons,
                ])],
                this.options.promptVersion,
              );
              modelVersion = drafted.modelVersion;
              modelLatencyMs += drafted.latencyMs;
              modelPromptTokens += drafted.tokenUsage.promptTokenCount ?? 0;
              modelOutputTokens += drafted.tokenUsage.candidatesTokenCount ?? 0;
              modelTotalTokens += drafted.tokenUsage.totalTokenCount ??
                (drafted.tokenUsage.promptTokenCount ?? 0) +
                  (drafted.tokenUsage.candidatesTokenCount ?? 0);
              hasModelTokenUsage ||= Object.values(drafted.tokenUsage).some(
                (value) => typeof value === "number" && Number.isFinite(value),
              );
              const verification = verifyCustomerUrlExplanationProposal(drafted.proposal);
              if (verification.accepted) {
                proposal = drafted.proposal;
                customerUrlReasonCodes = [
                  ...new Set([
                    ...customerUrlReasonCodes,
                    "CUSTOMER_URL_SAFE_EXPLANATION_SENT",
                  ]),
                ];
                if (this.options.mode === "LIVE" && this.options.sendEnabled) {
                  metaMessages = [{ kind: "TEXT", text: drafted.proposal.reply }];
                }
                break;
              }
              explanationRejectionReasons = verification.reasonCodes;
            } catch {
              explanationRejectionReasons = ["CUSTOMER_URL_EXPLANATION_MODEL_FAILED"];
              break;
            }
          }
        }
        if (!proposal) {
          customerUrlReasonCodes = [
            ...new Set([
              ...customerUrlReasonCodes,
              ...explanationRejectionReasons,
              "CUSTOMER_URL_SAFE_EXPLANATION_FALLBACK",
            ]),
          ];
          if (this.options.mode === "LIVE" && this.options.sendEnabled) {
            metaMessages = [{ kind: "TEXT", text: CUSTOMER_URL_SAFE_FALLBACK_REPLY }];
          }
        }
      } else if (preSalePolicyIntent !== null) {
        const reply = renderPreSalePolicyReply(
          preSalePolicyIntent,
          outboundRuntimePolicy(policyResolution),
        );
        if (reply) {
          if (this.options.mode === "LIVE" && this.options.sendEnabled) {
            metaMessages = [{ kind: "TEXT", text: reply }];
          }
        } else {
          handoffGuardReasonCodes = [
            "PRE_SALE_POLICY_UNAVAILABLE",
            `PRE_SALE_POLICY_${preSalePolicyIntent}`,
          ];
          const transitioned = applySilentHandoff(
            nextState,
            "POLICY_TOOL_ERROR",
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        }
      } else if (
        mediaDisposition.disposition === "OPEN_CLARIFICATION" &&
        resolution.clarification &&
        resolution.clarification.action !== "CLEAR"
      ) {
        clarificationHandled = true;
        if (resolution.clarification.action === "EXHAUSTED") {
          handoffGuardReasonCodes = [
            "MEDIA_CLARIFICATION_EXHAUSTED",
            resolution.clarification.reasonCode,
          ];
          const transitioned = applySilentHandoff(
            nextState,
            "PRODUCT_AMBIGUOUS",
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        } else if (this.options.mode === "LIVE" && this.options.sendEnabled) {
          metaMessages = this.mediaClarificationMessages(
            resolution.clarification.action,
            resolution.clarification.candidates,
            resolution.clarification.attemptCount,
            resolution.clarification.maxAttempts,
          );
        }
      } else if (mediaDisposition.disposition === "HANDOFF") {
        handoffGuardReasonCodes = [...mediaDisposition.reasonCodes];
        const transitioned = applySilentHandoff(
          nextState,
          "PRODUCT_AMBIGUOUS",
          nextState.revision,
          nextState.lastFence,
          now,
        );
        nextState = transitioned.state;
        handoff = transitioned.handoff;
      } else if (multiProductDecision.disposition === "FAIL_CLOSED") {
        handoffGuardReasonCodes = multiProductDecision.reasonCodes;
        const transitioned = applySilentHandoff(
          nextState,
          "PRODUCT_TOOL_ERROR",
          nextState.revision,
          nextState.lastFence,
          now,
        );
        nextState = transitioned.state;
        handoff = transitioned.handoff;
      } else if (multiProductDecision.disposition === "CLARIFY_SELECTION") {
        const selections = multiProductDecision.productIds.map((productId, index) => ({
          label: `SET_${index + 1}`,
          productId,
        }));
        nextState = {
          ...nextState,
          currentProductId: null,
          productSelections: selections,
          mediaClarification: null,
        };
        let rejectionReasonCodes: readonly string[] = [];
        if (!this.model.draftMultiProductClarification) {
          rejectionReasonCodes = ["MULTI_PRODUCT_CLARIFICATION_MODEL_UNAVAILABLE"];
        } else {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            if (this.quota && !(await this.quota.reserve(claim.pageId, now))) {
              rejectionReasonCodes = ["MULTI_PRODUCT_CLARIFICATION_QUOTA_DENIED"];
              break;
            }
            try {
              modelCalled = true;
              const drafted = await this.model.draftMultiProductClarification(
                multiProductDecision.productIds,
                this.options.promptVersion,
                rejectionReasonCodes,
              );
              modelVersion = drafted.modelVersion;
              modelLatencyMs += drafted.latencyMs;
              modelPromptTokens += drafted.tokenUsage.promptTokenCount ?? 0;
              modelOutputTokens += drafted.tokenUsage.candidatesTokenCount ?? 0;
              modelTotalTokens += drafted.tokenUsage.totalTokenCount ??
                (drafted.tokenUsage.promptTokenCount ?? 0) +
                  (drafted.tokenUsage.candidatesTokenCount ?? 0);
              hasModelTokenUsage ||= Object.values(drafted.tokenUsage).some(
                (value) => typeof value === "number" && Number.isFinite(value),
              );
              const verification = verifyMultiProductClarificationProposal(
                drafted.proposal,
                multiProductDecision.productIds,
              );
              if (verification.accepted) {
                proposal = drafted.proposal;
                clarificationHandled = true;
                nextState = {
                  ...nextState,
                  mediaClarification: {
                    status: "ACTIVE",
                    candidates: selections,
                    attemptCount: 0,
                    maxAttempts: 3,
                    reasonCode: "MULTI_PRODUCT_SELECTION_REQUIRED",
                    openedAt: now.toISOString(),
                  },
                };
                if (this.options.mode === "LIVE" && this.options.sendEnabled) {
                  metaMessages = [{ kind: "TEXT", text: drafted.proposal.reply }];
                }
                break;
              }
              rejectionReasonCodes = verification.reasonCodes;
            } catch {
              rejectionReasonCodes = ["MULTI_PRODUCT_CLARIFICATION_MODEL_FAILED"];
              break;
            }
          }
        }
        if (!proposal) {
          handoffGuardReasonCodes = [
            ...new Set([
              ...multiProductDecision.reasonCodes,
              ...rejectionReasonCodes,
              "MULTI_PRODUCT_CLARIFICATION_REJECTED",
            ]),
          ];
          const transitioned = applySilentHandoff(
            nextState,
            "PRODUCT_TOOL_ERROR",
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        }
      } else if (
        unresolvedProductRequiresHandoff(message.text ?? "", {
          isEcho: message.isEcho,
          hasAdsContext: Boolean(message.adsContext),
          hasResolvedProduct: resolvedProduct !== null,
          hasClarification: resolution.clarification !== null,
          // Buying intent is resolved once after model semantics are available.
          // This early product-resolution guard must never act as that authority.
          hasBuyingSignal: false,
        })
      ) {
        handoffGuardReasonCodes = [
          "PRODUCT_UNRESOLVED_REQUIRES_HANDOFF",
        ];
        const transitioned = applySilentHandoff(
          nextState,
          "UNVERIFIED_PRODUCT_ID",
          nextState.revision,
          nextState.lastFence,
          now,
        );
        nextState = transitioned.state;
        handoff = transitioned.handoff;
      } else if (advisoryIntent !== null && resolvedProduct !== null) {
        proposal = {
          schemaVersion: 1,
          intent: `catalog_advisory_${advisoryIntent.toLocaleLowerCase("en-US")}`,
          conversationStage: nextState.salesStage,
          productId: resolvedProduct.productId,
          action: "REPLY",
          reply: catalogAdvisoryReply(resolvedProduct, advisoryIntent),
          attachments: [],
          handoffReason: null,
          businessFactQuery: {
            intent: "NONE",
            offerType: null,
            color: null,
            size: null,
            deliveryRegion: null,
          },
        };
        if (this.options.mode === "LIVE" && this.options.sendEnabled) {
          metaMessages = [{ kind: "TEXT", text: proposal.reply }];
        }
      } else if (shouldUseMultiFacts && multiFactQueries !== null) {
        const resolutions = await this.resolveBusinessFactQueries(
          multiFactQueries,
          resolution.products,
        );
        const flattened = resolutions.flatMap(({ facts }) => facts);
        multiFactAudit = resolutions.flatMap((resolution) =>
          resolution.facts.map(({ requestedFact, envelope }) => ({
            queryId: resolution.queryId,
            productId: resolution.product!.productId,
            requestedFact,
            status: envelope.status,
            reasonCode: envelope.reasonCode,
            source: envelope.source,
            observedAt: envelope.observedAt,
          }))
        );
        businessFacts = flattened[0]?.envelope ?? null;
        businessFactEnvelopes = flattened.map(({ envelope }) => envelope);
        const unsafe = flattened.some(({ envelope }) =>
          staleFactsRequireHandoff(message.text ?? "", envelope) ||
          unavailableFactsRequireHandoff(envelope)
        );
        const reply = unsafe ? null : multiFactReply(resolutions);
        if (!reply) {
          handoffGuardReasonCodes = unsafe
            ? ["MULTI_FACT_UNAVAILABLE_REQUIRES_HANDOFF"]
            : ["MULTI_FACT_REPLY_EMPTY"];
          const transitioned = applySilentHandoff(
            nextState,
            "PRODUCT_TOOL_ERROR",
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        } else {
          deterministicProtectedClaimTypes = [...new Set(flattened.map(({ requestedFact }) => ({
            PRICE: "PRICE" as const,
            STOCK: "STOCK" as const,
            SIZE: "SIZE_FIT" as const,
            ETA: "ETA" as const,
          })[requestedFact]))].sort();
          const first = multiFactQueries.queries[0]!;
          proposal = {
            schemaVersion: 1,
            intent: "multi_business_fact",
            conversationStage: nextState.salesStage,
            productId: first.productRef.productId,
            action: "REPLY",
            reply,
            attachments: [],
            handoffReason: null,
            businessFactQuery: {
              intent: first.requestedFacts[0] ?? "NONE",
              offerType: first.qualifiers.offerType,
              color: first.qualifiers.color,
              size: first.qualifiers.size,
              deliveryRegion: first.qualifiers.deliveryRegion,
            },
          };
          if (
            this.options.verifiedVariantEnabled &&
            this.factsReader.resolveVerifiedVariant &&
            resolution.primary
          ) {
            const mentions = extractVariantMentions(message.text ?? "", proposal);
            if (mentions.size !== null || mentions.color !== null) {
              const verified = await this.factsReader.resolveVerifiedVariant({
                shopAlias: this.options.shopAlias,
                productId: resolution.primary.productId,
                offerType: proposal.businessFactQuery.offerType,
                mentionedSize: mentions.size,
                mentionedColor: mentions.color,
              }, now);
              nextState = {
                ...nextState,
                verifiedVariant: verifiedVariantState(verified),
                consideredVariant: {
                  offerType: verified.selectedOfferType,
                  color: verified.selectedColorLabel,
                  size: verified.selectedSizeCode,
                },
              };
            }
          }
          if (
            this.options.customerProfileEnabled &&
            customerProfile &&
            resolutions.length === 1 &&
            resolutions[0]!.product !== null &&
            first.requestedFacts.includes("SIZE")
          ) {
            const sizeComposition = composeSizeEngineAdvice(
              proposal,
              resolutions[0]!.product!,
              customerProfile,
              policyResolution,
              productFactsV2,
              now,
            );
            proposal = sizeComposition.proposal;
            if (sizeComposition.requiresHandoff) {
              sizeAdviceRequiresHandoff = true;
              handoffGuardReasonCodes = [
                ...new Set([
                  ...handoffGuardReasonCodes,
                  ...sizeComposition.reasonCodes,
                ].filter((value): value is string => value !== null)),
              ];
              const transitioned = applySilentHandoff(
                nextState,
                "PRODUCT_TOOL_ERROR",
                nextState.revision,
                nextState.lastFence,
                now,
              );
              nextState = transitioned.state;
              handoff = transitioned.handoff;
            }
          }
          nextState = {
            ...nextState,
            productSelections: resolution.products.map((product, index) => ({
              label: `SET_${index + 1}`,
              productId: product.productId,
            })),
          };
          if (
            (handoff === null || sizeAdviceRequiresHandoff) &&
            this.options.mode === "LIVE" &&
            this.options.sendEnabled
          ) {
            metaMessages = [{ kind: "TEXT", text: proposal.reply }];
          }
        }
      } else if (resolution.products.length > 1) {
        const allFacts = await Promise.all(resolution.products.map((product) =>
          this.factsReader.resolve({
            shopAlias: this.options.shopAlias,
            productId: product.productId,
            intent: "PRICE",
            offerType: null,
            color: null,
            size: null,
            deliveryRegion: null,
          })
        ));
        businessFacts = allFacts[0] ?? null;
        businessFactEnvelopes = allFacts;
        const reply = multiProductReply(
          resolution.products,
          allFacts,
          policyResolution,
        );
        if (reply !== null) deterministicProtectedClaimTypes = ["PRICE"];
        if (!reply) {
          handoffGuardReasonCodes = ["MULTI_PRODUCT_FACT_UNAVAILABLE"];
          const transitioned = applySilentHandoff(
            nextState,
            "PRODUCT_TOOL_ERROR",
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        } else {
          nextState = {
            ...nextState,
            productSelections: resolution.products.map((product, index) => ({
              label: `SET_${index + 1}`,
              productId: product.productId,
            })),
          };
          if (this.options.mode === "LIVE" && this.options.sendEnabled) {
            metaMessages = [{ kind: "TEXT", text: reply }];
          }
        }
      } else if (imageRequest && imageRequest.images.length === 0) {
        // Media Selector V2 never substitutes the wrong image type. When the
        // exact media is unavailable it answers explicitly and advances the
        // sale using a verified ProductFactsV2 fact.
        if (imageRequest.customerTextUnits.length === 0) {
          handoffGuardReasonCodes = [
            `IMAGE_REQUEST_${imageRequest.intent}`,
            imageRequest.reasonCode,
          ];
          const transitioned = applySilentHandoff(
            nextState,
            "PRODUCT_TOOL_ERROR",
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        } else proposal = {
          schemaVersion: 1,
          intent: "product_media_unavailable",
          conversationStage: nextState.salesStage,
          productId: resolvedProduct?.productId ?? null,
          action: "REPLY",
          reply: imageRequest.customerTextUnits.join("\n"),
          attachments: [],
          handoffReason: null,
          businessFactQuery: {
            intent: "NONE",
            offerType: null,
            color: null,
            size: null,
            deliveryRegion: null,
          },
        };
        if (proposal && this.options.mode === "LIVE" && this.options.sendEnabled) {
          metaMessages = [{ kind: "TEXT", text: proposal.reply }];
        }
      } else {
        const directProductInfo = resolvedProduct !== null && imageRequest === null && (
          isResolvedProductCodeOnly(message.text ?? "", resolvedProduct) ||
          resolution.origin === "ADS" || resolution.origin === "MEDIA" ||
          resolution.origin === "SELECTION" || resolution.origin === "TEXT_CODE" ||
          (explicitCustomerBusinessIntent(message.text ?? "") === "PRICE" &&
            advisoryIntent === null)
        );
        // Lượt gửi ảnh và thẻ báo giá đều dựng bằng dữ liệu đã xác minh, không
        // gọi model, nên không được trừ hạn ngạch sinh nội dung.
        const skipsModel = directProductInfo || imageRequest !== null;
        if (
          !skipsModel &&
          this.quota &&
          !(await this.quota.reserve(claim.pageId, now))
        ) {
          const result = await this.runtime.commit(
            {
              pageId: claim.pageId,
              customerHash: claim.conversationHash,
              conversationId: record.conversationId,
              expectedStateVersion: record.stateVersion,
              state: nextState,
              ...(inboxBatchGuard ? { inboxBatchGuard } : {}),
            },
            now,
          );
          return batchCommitStatus(result);
        }
        if (imageRequest && resolvedProduct) {
          proposal = requestedImagesProposal(
            resolvedProduct,
            imageRequest.images,
            imageRequest.intent,
          );
          if (mediaSelectorV2GuardActive && imageRequest.mediaSelectorV2) {
            guardVerifiedAttachmentUrls = new Set(imageRequest.images);
          }
        } else if (directProductInfo && resolvedProduct) {
          proposal = productInfoLookupProposal(resolvedProduct);
        } else {
          modelCalled = true;
          try {
            const initial = await this.model.generate(
              modelContext,
              this.options.promptVersion,
            );
            modelVersion = initial.modelVersion;
            modelLatencyMs += initial.latencyMs;
            modelPromptTokens += initial.tokenUsage.promptTokenCount ?? 0;
            modelOutputTokens += initial.tokenUsage.candidatesTokenCount ?? 0;
            modelTotalTokens += initial.tokenUsage.totalTokenCount ??
              (initial.tokenUsage.promptTokenCount ?? 0) +
                (initial.tokenUsage.candidatesTokenCount ?? 0);
            hasModelTokenUsage ||= Object.values(initial.tokenUsage).some(
              (value) => typeof value === "number" && Number.isFinite(value),
            );
            proposal = {
              ...initial.proposal,
              productId:
                resolvedProduct?.productId ?? initial.proposal.productId,
            };
          } catch (error) {
            const contextFallback =
              error instanceof RealtimeContextPreservingSchemaError
                ? error
                : null;
            if (contextFallback) {
              suppressStateContinuation = true;
              if (!resolvedProduct && contextFallback.verifiedProduct) {
                resolvedProduct = contextFallback.verifiedProduct;
                productResolutionOrigin = contextFallback.productResolutionOrigin;
              }
            }
            const fallback = deterministicVertexProposalFallback(
              message.text ?? "",
              resolvedProduct,
              deterministicBuyingHintForTurn().isBuyingSignal,
              error,
            );
            proposal = fallback.proposal;
            initialVertexFallbackUsed = true;
            modelErrorClass = contextFallback?.code ?? fallback.reasonCode;
            handoffGuardReasonCodes = [
              ...new Set([...handoffGuardReasonCodes, fallback.reasonCode]),
            ];
          }
          const inferredCurrentProductId = aiContinuationProductId(
            message.text ?? "",
            proposal.productId,
            nextState.currentProductId,
          );
          if (!resolvedProduct && !suppressStateContinuation && inferredCurrentProductId) {
            const verifiedCurrentProduct = await this.exactProduct(
              inferredCurrentProductId,
            );
            if (verifiedCurrentProduct) {
              resolvedProduct = verifiedCurrentProduct;
              productResolutionOrigin = "STATE";
              proposal = {
                ...proposal,
                productId: verifiedCurrentProduct.productId,
              };
            }
          }
        }
        const hasVerifiedProductContext = Boolean(
          resolvedProduct?.productId ?? nextState.currentProductId,
        );
        const canonicalEvidence = canonicalDecisionEvidenceForTurn();
        buyingSignal = {
          isBuyingSignal: canonicalEvidence.buyingIntent.decision === "COMMITTED",
          reasons: canonicalEvidence.buyingIntent.reasonCodes,
        };
        if (
          !hasVerifiedProductContext &&
          canonicalEvidence.buyingIntent.decision === "COMMITTED"
        ) {
          handoffGuardReasonCodes = [
            ...new Set([
              ...handoffGuardReasonCodes,
              "PRODUCT_UNRESOLVED_REQUIRES_HANDOFF",
            ]),
          ];
          proposal = {
            ...proposal,
            productId: null,
            action: "HANDOFF",
            reply: "",
            attachments: [],
            handoffReason: "UNVERIFIED_PRODUCT_ID",
          };
        } else if (
          !hasVerifiedProductContext &&
          proposal.salesSignals?.buyingIntent?.decision === "COMMITTED"
        ) {
          handoffGuardReasonCodes = [
            ...new Set([
              ...handoffGuardReasonCodes,
              "MODEL_BUYING_EVIDENCE_NON_AUTHORIZING",
            ]),
          ];
          proposal = {
            ...proposal,
            productId: null,
            action: "ASK_PRODUCT_SELECTION",
            reply: "Chị gửi giúp em mã hoặc ảnh mẫu muốn lấy để em kiểm tra đúng sản phẩm nhé.",
            attachments: [],
            handoffReason: null,
          };
        }
        if (
          this.options.buyingSignalGuardEnabled &&
          proposal.action === "NO_REPLY" &&
          buyingSignal.isBuyingSignal
        ) {
          buyingSignalOverride = true;
          proposal = resolvedProduct
            ? {
                ...proposal,
                productId: resolvedProduct.productId,
                action: "REPLY",
                reply: "Mẫu này đã sẵn sàng để lên giỏ. Chị chọn giúp em size và màu muốn lấy nhé.",
                attachments: [],
                handoffReason: null,
              }
            : {
                ...proposal,
                productId: null,
                action: "ASK_PRODUCT_SELECTION",
                reply: "Chị cho em biết mẫu muốn lấy để em hỗ trợ đúng sản phẩm nhé.",
                attachments: [],
                handoffReason: null,
              };
        }
        const facts = await this.resolveFacts(
          proposal,
          resolvedProduct,
          imageRequest ? imageRequest.intent : "PRICE_CARD",
        );
        businessFacts = facts;
        businessFactEnvelopes = facts === null ? [] : [facts];
        const explicitIntent = explicitCustomerBusinessIntent(message.text ?? "");
        if (facts?.status === "STALE") {
          proposal = staleFactsRequireHandoff(message.text ?? "", facts)
            ? {
                ...proposal,
                action: "HANDOFF",
                reply: "",
                attachments: [],
                handoffReason: "BUSINESS_FACT_UNAVAILABLE",
              }
            : safeStaleProposal(proposal, explicitIntent);
        } else if (unavailableFactsRequireHandoff(facts)) {
          proposal = {
            ...proposal,
            action: "HANDOFF",
            reply: "",
            attachments: [],
            handoffReason: "BUSINESS_FACT_UNAVAILABLE",
          };
        } else if (
          facts &&
          (facts.status === "OK" ||
            facts.reasonCode === "DELIVERY_REGION_REQUIRED")
        ) {
          let deterministicProductInfo = imageRequest
            ? proposal
            : directProductInfo && resolvedProduct
              ? verifiedProductInfoProposal(
                  resolvedProduct,
                  facts,
                  modelContext,
                  this.options.customerProfileEnabled ? customerProfile : null,
                  productFactsV2,
                  now,
                  this.options.conversationalMessageFormatEnabled,
                  mediaSelectorV2GuardActive,
                )
              : null;
          if (
            deterministicProductInfo &&
            !imageRequest &&
            resolvedProduct &&
            this.options.customerProfileEnabled &&
            customerProfile
          ) {
            if (profileHasBodyMeasurements(customerProfile)) {
              const sizeComposition = composeSizeEngineAdvice(
                deterministicProductInfo,
                resolvedProduct,
                customerProfile,
                policyResolution,
                productFactsV2,
                now,
              );
              deterministicProductInfo = sizeComposition.proposal;
              if (sizeComposition.requiresHandoff) {
                sizeAdviceRequiresHandoff = true;
                handoffGuardReasonCodes = [...new Set([
                  ...handoffGuardReasonCodes,
                  ...sizeComposition.reasonCodes,
                ])];
              }
            }
          }
          if (deterministicProductInfo) {
            proposal = deterministicProductInfo;
            if (mediaSelectorV2GuardActive) {
              guardVerifiedAttachmentUrls = new Set(deterministicProductInfo.attachments);
            }
          } else if (
            facts.status === "OK" &&
            resolvedProduct &&
            (initialVertexFallbackUsed || (
              this.options.groundedDraftEnabled &&
              this.options.verifiedFactAssemblerEnabled &&
              this.model.groundDraftWithFacts
            ))
          ) {
            const factBlocks = buildVerifiedFactBlocks(
              facts,
              proposal.businessFactQuery.intent,
              resolvedProduct,
            );
            let groundedDraft = DETERMINISTIC_GROUNDED_DRAFT;
            let groundedDraftSucceeded = false;
            if (!initialVertexFallbackUsed) {
              try {
                modelCalled = true;
                const grounded = await this.model.groundDraftWithFacts!(
                  modelContext,
                  proposal,
                  facts,
                  {
                    productId: resolvedProduct.productId,
                    title: resolvedProduct.title,
                    descriptionXml: resolvedProduct.descriptionXml ?? "",
                    materials: resolvedProduct.materials,
                    silhouettes: resolvedProduct.silhouettes,
                    occasions: resolvedProduct.occasions,
                  },
                  this.options.promptVersion,
                );
                modelVersion = grounded.modelVersion;
                modelLatencyMs += grounded.latencyMs;
                modelPromptTokens += grounded.tokenUsage.promptTokenCount ?? 0;
                modelOutputTokens += grounded.tokenUsage.candidatesTokenCount ?? 0;
                modelTotalTokens += grounded.tokenUsage.totalTokenCount ??
                  (grounded.tokenUsage.promptTokenCount ?? 0) +
                    (grounded.tokenUsage.candidatesTokenCount ?? 0);
                hasModelTokenUsage ||= Object.values(grounded.tokenUsage).some(
                  (value) => typeof value === "number" && Number.isFinite(value),
                );
                groundedDraft = grounded.draft;
                groundedDraftSucceeded = true;
              } catch (error) {
                const fallbackReason = vertexGroundedFallbackReason(error);
                groundedDraftFallbackUsed = true;
                modelErrorClass = fallbackReason;
                handoffGuardReasonCodes = [
                  ...new Set([
                    ...handoffGuardReasonCodes,
                    fallbackReason,
                  ]),
                ];
              }
            }
            const assembled = assembleReply(
              factBlocks,
              groundedDraft,
              facts,
              resolvedProduct,
            );
            handoffGuardReasonCodes = [
              ...new Set([
                ...handoffGuardReasonCodes,
                ...assembled.reasonCodes,
              ]),
            ];
            proposal = {
              ...proposal,
              reply: assembled.text || proposal.reply,
              attachments: groundedDraftSucceeded
                ? [...assembled.imageUrls]
                : [],
            };
          } else {
            modelCalled = true;
            try {
              const grounded = await this.model.groundWithFacts(
                modelContext,
                proposal,
                facts,
                this.options.promptVersion,
              );
              modelVersion = grounded.modelVersion;
              modelLatencyMs += grounded.latencyMs;
              modelPromptTokens += grounded.tokenUsage.promptTokenCount ?? 0;
              modelOutputTokens += grounded.tokenUsage.candidatesTokenCount ?? 0;
              modelTotalTokens += grounded.tokenUsage.totalTokenCount ??
                (grounded.tokenUsage.promptTokenCount ?? 0) +
                  (grounded.tokenUsage.candidatesTokenCount ?? 0);
              hasModelTokenUsage ||= Object.values(grounded.tokenUsage).some(
                (value) => typeof value === "number" && Number.isFinite(value),
              );
              proposal = {
                ...grounded.proposal,
                salesSignals: proposal.salesSignals ?? grounded.proposal.salesSignals,
                strategyAnalysis:
                  proposal.strategyAnalysis ??
                  grounded.proposal.strategyAnalysis,
              };
            } catch (error) {
              const contextFallback =
                error instanceof RealtimeContextPreservingSchemaError &&
                error.phase === "GROUNDED"
                  ? error
                  : null;
              if (!contextFallback) throw error;
              const fallback = deterministicVertexProposalFallback(
                message.text ?? "",
                resolvedProduct ?? contextFallback.verifiedProduct,
                buyingSignal.isBuyingSignal,
                error,
              );
              proposal = {
                ...fallback.proposal,
                ...(proposal.salesSignals === undefined
                  ? {}
                  : { salesSignals: proposal.salesSignals }),
                ...(proposal.strategyAnalysis === undefined
                  ? {}
                  : { strategyAnalysis: proposal.strategyAnalysis }),
              };
              groundedFallbackUsed = true;
              modelErrorClass = contextFallback.code;
              handoffGuardReasonCodes = [
                ...new Set([...handoffGuardReasonCodes, fallback.reasonCode]),
              ];
            }
          }
        }
        if (
          resolvedProduct &&
          facts?.status === "OK" &&
          explicitIntent === "PRICE" &&
          isLegacyUnaccentedProductInfoReply(proposal.reply)
        ) {
          const baseVerifiedFallback = verifiedProductInfoProposal(
            resolvedProduct,
            facts,
            modelContext,
            this.options.customerProfileEnabled ? customerProfile : null,
            productFactsV2,
            now,
            this.options.conversationalMessageFormatEnabled,
            mediaSelectorV2GuardActive,
          );
          let verifiedFallback = baseVerifiedFallback;
          if (
            baseVerifiedFallback &&
            this.options.customerProfileEnabled &&
            customerProfile &&
            profileHasBodyMeasurements(customerProfile)
          ) {
            const sizeComposition = composeSizeEngineAdvice(
              baseVerifiedFallback,
              resolvedProduct,
              customerProfile,
              policyResolution,
              productFactsV2,
              now,
            );
            verifiedFallback = sizeComposition.proposal;
            if (sizeComposition.requiresHandoff) {
              sizeAdviceRequiresHandoff = true;
              handoffGuardReasonCodes = [...new Set([
                ...handoffGuardReasonCodes,
                ...sizeComposition.reasonCodes,
              ])];
            }
          }
          if (verifiedFallback) {
            const priorSalesSignals = proposal.salesSignals;
            const priorStrategyAnalysis = proposal.strategyAnalysis;
            proposal = {
              ...verifiedFallback,
              ...(priorSalesSignals === undefined
                ? {}
                : { salesSignals: priorSalesSignals }),
              ...(priorStrategyAnalysis === undefined
                ? {}
                : { strategyAnalysis: priorStrategyAnalysis }),
            };
            if (mediaSelectorV2GuardActive) {
              guardVerifiedAttachmentUrls = new Set(verifiedFallback.attachments);
            }
            handoffGuardReasonCodes = [
              ...new Set([...handoffGuardReasonCodes, "LEGACY_UNACCENTED_REPLY_REPLACED"]),
            ];
          }
        }
        if (
          this.options.customerProfileEnabled &&
          customerProfile &&
          resolvedProduct &&
          proposal.businessFactQuery.intent === "SIZE"
        ) {
          const sizeComposition = composeSizeEngineAdvice(
            proposal,
            resolvedProduct,
            customerProfile,
            policyResolution,
            productFactsV2,
            now,
          );
          proposal = sizeComposition.proposal;
          if (sizeComposition.requiresHandoff) {
            sizeAdviceRequiresHandoff = true;
            handoffGuardReasonCodes = [...new Set([
              ...handoffGuardReasonCodes,
              ...sizeComposition.reasonCodes,
            ])];
          }
        }
        if (
          this.options.verifiedVariantEnabled &&
          this.factsReader.resolveVerifiedVariant
        ) {
          const variantProductId = continuationProductId(
            resolvedProduct?.productId ?? null,
            proposal.productId,
            nextState.currentProductId,
          );
          const mentions = extractVariantMentions(message.text ?? "", proposal);
          if (variantProductId && (mentions.size !== null || mentions.color !== null)) {
            const verified = await this.factsReader.resolveVerifiedVariant(
              {
                shopAlias: this.options.shopAlias,
                productId: variantProductId,
                offerType: proposal.businessFactQuery.offerType,
                mentionedSize: mentions.size,
                mentionedColor: mentions.color,
              },
              now,
            );
            nextState = {
              ...nextState,
              verifiedVariant: verifiedVariantState(verified),
              consideredVariant: {
                offerType: verified.selectedOfferType,
                color: verified.selectedColorLabel,
                size: verified.selectedSizeCode,
              },
            };
          }
        }
        if (this.options.wave2StrategyEnabled && wave2StrategyDecision) {
          wave2StrategyDecision = decideWave2SalesStrategy({
            text: message.text ?? "",
            salesStage: nextState.salesStage,
            objectionType: event.objectionType,
            buyingSignal: buyingSignal.isBuyingSignal,
            hasVerifiedProduct: Boolean(
              resolvedProduct?.productId ?? nextState.currentProductId,
            ),
            resolvedProductCount: Math.max(
              resolution.products.length,
              resolvedProduct ? 1 : 0,
            ),
            hasMeasurements:
              (customerProfile?.measurements.length ?? 0) > 0 ||
              hasCustomerMeasurementSignal(message.text ?? ""),
            requestedProof: requestedProofForImageIntent(imageIntent),
            modelAnalysis: proposal.strategyAnalysis ?? null,
          });
          proposal = applyWave2ReplyPolicy(proposal, wave2StrategyDecision);
        }
        const verifiedProductIds = new Set<string>();
        if (resolvedProduct) verifiedProductIds.add(resolvedProduct.productId);
        if (facts?.status === "OK") verifiedProductIds.add(facts.productId);
        const activeSizeProductId = resolvedProduct?.productId ?? null;
        const activeVerifiedVariant = nextState.verifiedVariant;
        const activeSizeVariantId =
          activeVerifiedVariant?.parentProductId === activeSizeProductId
            ? activeVerifiedVariant.selectedVariantId
            : null;
        verifiedSizeClaimForTurn =
          resolvedProduct && customerProfile
            ? verifiedSizeRecommendationClaimForGuard(
                resolvedProduct,
                customerProfile,
                policyResolution,
                now,
              )
            : null;
        if (verifiedSizeClaimForTurn) {
          proposal = {
            ...proposal,
            protectedClaimIds: [
              ...new Set([
                ...(proposal.protectedClaimIds ?? []),
                verifiedSizeClaimForTurn.id,
              ]),
            ],
          };
        }
        const guardProposal = (
          candidate: AgentProposalV1,
          candidateFacts: BusinessFactEnvelopeV1 | null = facts,
        ) => guardAgentProposal({
          proposal: candidate,
          facts: candidateFacts,
          verifiedProductIds,
          ...(mediaSelectorV2GuardActive &&
              guardVerifiedAttachmentUrls !== undefined
            ? {
                verifiedAttachmentUrls: guardVerifiedAttachmentUrls,
                allowTextOnlyOnUnverifiedAttachment: true,
              }
            : {}),
          buyingSignal: buyingSignal.isBuyingSignal,
          sizeClaimContext: {
            activeProductId: activeSizeProductId,
            activeVariantId: activeSizeVariantId,
            customerProfileId: customerProfile?.profileId ?? null,
            customerProfileRevision: customerProfile?.revision ?? null,
            claims: verifiedSizeClaimForTurn ? [verifiedSizeClaimForTurn] : [],
          },
          now,
        });
        let guarded = guardProposal(proposal);
        const guardedPlanHashFor = (value: typeof guarded): string =>
          createHash("sha256").update(JSON.stringify({
            action: value.action,
            productId: value.productId,
            handoffReason: value.handoffReason,
            blockedReasonCodes: value.blockedReasonCodes,
            textUnitHashes: value.textUnits.map((text) =>
              createHash("sha256").update(text).digest("hex")
            ),
            imageCount: value.imageUrls.length,
          })).digest("hex");
        guardedPlanHash = guardedPlanHashFor(guarded);
        handoffGuardReasonCodes = [
          ...new Set([
            ...handoffGuardReasonCodes,
            ...guarded.blockedReasonCodes,
          ]),
        ];
        if (hasSizeRecommendationBlock(guarded.blockedReasonCodes)) {
          const sizeRepairBaseline = proposal;
          let repaired = false;
          if (this.model.repairSizeClaimDraft) {
            try {
              modelCalled = true;
              const repair = await this.model.repairSizeClaimDraft(
                modelContext,
                proposal,
                guarded.blockedReasonCodes.filter((reason) =>
                  reason.startsWith("SIZE_RECOMMENDATION_"),
                ),
                verifiedSizeClaimForTurn ? [verifiedSizeClaimForTurn] : [],
                this.options.promptVersion,
              );
              modelVersion = repair.modelVersion;
              modelLatencyMs += repair.latencyMs;
              modelPromptTokens += repair.tokenUsage.promptTokenCount ?? 0;
              modelOutputTokens += repair.tokenUsage.candidatesTokenCount ?? 0;
              modelTotalTokens += repair.tokenUsage.totalTokenCount ??
                (repair.tokenUsage.promptTokenCount ?? 0) +
                  (repair.tokenUsage.candidatesTokenCount ?? 0);
              hasModelTokenUsage ||= Object.values(repair.tokenUsage).some(
                (value) => typeof value === "number" && Number.isFinite(value),
              );
              proposal = {
                ...repair.proposal,
                salesSignals: proposal.salesSignals ?? repair.proposal.salesSignals,
                strategyAnalysis:
                  proposal.strategyAnalysis ?? repair.proposal.strategyAnalysis,
              };
              guarded = guardProposal(proposal);
              repaired =
                !hasSizeRecommendationBlock(guarded.blockedReasonCodes) &&
                (guarded.action === "REPLY" ||
                  guarded.action === "ASK_PRODUCT_SELECTION");
              if (repaired) {
                handoffGuardReasonCodes = [...new Set([
                  ...handoffGuardReasonCodes,
                  "SIZE_RECOMMENDATION_REPAIRED",
                ])];
              }
            } catch (error) {
              const repairFailure = vertexGroundedFallbackReason(error);
              modelErrorClass = repairFailure;
              handoffGuardReasonCodes = [...new Set([
                ...handoffGuardReasonCodes,
                repairFailure,
              ])];
            }
          } else {
            handoffGuardReasonCodes = [...new Set([
              ...handoffGuardReasonCodes,
              "SIZE_RECOMMENDATION_REPAIR_UNAVAILABLE",
            ])];
          }
          if (!repaired) {
            const verifiedAttachmentUrlsForFallback = new Set(
              guardVerifiedAttachmentUrls ?? facts?.facts?.imageUrls ?? [],
            );
            proposal = approvedSizeClaimClarification(sizeRepairBaseline, {
              facts,
              product: resolvedProduct,
              attachmentUrls: sizeRepairBaseline.attachments.filter((url) =>
                verifiedAttachmentUrlsForFallback.has(url)
              ),
              preservedProtectedClaimIds: (sizeRepairBaseline.protectedClaimIds ?? []).filter(
                (claimId) => claimId !== verifiedSizeClaimForTurn?.id,
              ),
              // The independently authorized post-media CTA is constructed
              // after this fallback from the guarded media plan below.
              approvedCta: null,
            });
            guarded = guardProposal(proposal);
            handoffGuardReasonCodes = [...new Set([
              ...handoffGuardReasonCodes,
              "SIZE_RECOMMENDATION_REPAIR_FAILED",
              ...guarded.blockedReasonCodes,
            ])];
          }
          guardedPlanHash = guardedPlanHashFor(guarded);
        }
        if (
          guarded.action === "HANDOFF" &&
          !modelHandoffPermitted(message.text ?? "", facts) &&
          !handoffGuardReasonCodes.includes("PRODUCT_UNRESOLVED_REQUIRES_HANDOFF")
        ) {
          proposal = safeModelHandoffFallback(
            proposal,
            continuationProductId(
              resolvedProduct?.productId ?? null,
              proposal.productId,
              nextState.currentProductId,
            ),
          );
          guarded = guardProposal(proposal, null);
          guardedPlanHash = guardedPlanHashFor(guarded);
        }
        if (guarded.action === "HANDOFF") {
          handoffGuardReasonCodes = [
            ...new Set([
              ...handoffGuardReasonCodes,
              ...guarded.blockedReasonCodes,
            ]),
          ];
          const transitioned = applySilentHandoff(
            nextState,
            handoffGuardReasonCodes.includes("PRODUCT_UNRESOLVED_REQUIRES_HANDOFF")
              ? "UNVERIFIED_PRODUCT_ID"
              : this.handoffReason(proposal, guarded.blockedReasonCodes),
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        } else if (
          this.options.mode === "LIVE" &&
          this.options.sendEnabled &&
          (guarded.action === "REPLY" ||
            guarded.action === "ASK_PRODUCT_SELECTION")
        ) {
          const postMediaCta = postMediaProofCta({
            ctaPolicy: wave2StrategyDecision?.ctaPolicy ?? null,
            imageIntent,
            imageCount: guarded.imageUrls.length,
            salesStage: nextState.salesStage,
            buyingSignal: buyingSignal.isBuyingSignal,
            factsVerified: facts?.status === "OK",
            product: resolvedProduct,
            profile: this.options.customerProfileEnabled ? customerProfile : null,
            policyResolution,
            now,
          });
          metaMessages = [
            ...guarded.textUnits.map(
              (text): RealtimeMetaMessageUnit => ({ kind: "TEXT", text }),
            ),
            ...guarded.imageUrls.map(
              (imageUrl): RealtimeMetaMessageUnit => ({
                kind: "IMAGE",
                imageUrl,
              }),
            ),
            ...(postMediaCta
              ? [{ kind: "TEXT" as const, text: postMediaCta }]
              : []),
          ];
        }
        proposalGuardReasonCodes = [...guarded.blockedReasonCodes];
        if (guarded.protectedClaimValidation) {
          protectedClaimValidation = guarded.protectedClaimValidation;
        }
        if (sizeAdviceRequiresHandoff && handoff === null) {
          const transitioned = applySilentHandoff(
            nextState,
            "PRODUCT_TOOL_ERROR",
            nextState.revision,
            nextState.lastFence,
            now,
          );
          nextState = transitioned.state;
          handoff = transitioned.handoff;
        }
      }
    }

    const protectedClaimSet = buildProtectedClaimsFromVerifiedFactSetV1({
      facts: businessFactEnvelopes,
      sizeClaim: verifiedSizeClaimForTurn,
      expectedSizeProductId:
        resolvedProduct?.productId ?? nextState.currentProductId,
    });

    if (
      salesCycleRecord &&
      !message.isEcho &&
      preSalePolicyIntent === null &&
      !clarificationHandled &&
      handoff === null
    ) {
      const canonicalEvidence = canonicalDecisionEvidenceForTurn();
      buyingSignal = {
        isBuyingSignal: canonicalEvidence.buyingIntent.decision === "COMMITTED",
        reasons: canonicalEvidence.buyingIntent.reasonCodes,
      };
      const sales = await evaluateRealtimeSalesCycle({
        pageId: claim.pageId,
        conversationId: record.conversationId,
        customerHash: claim.conversationHash,
        state: salesCycleRecord.state,
        stateRevision: salesCycleRecord.stateRevision,
        conversationRevision: record.stateVersion,
        text: message.text ?? "",
        messageId: message.messageId ?? message.eventKey,
        eventKey: message.eventKey,
        senderId: message.senderId,
        occurredAt: message.occurredAt,
        attachmentIds: message.attachments.map((attachment, index) =>
          attachment.providerId ??
          deterministicUuid(`${message.eventKey}:attachment:${index}`)
        ),
        productId:
          canonicalEvidence.buyingIntent.productId ??
          resolvedProduct?.productId ??
          nextState.currentProductId,
        offerType:
          businessFacts?.facts?.offerType ??
          proposal?.businessFactQuery.offerType ??
          nextState.consideredVariant.offerType,
        size:
          proposal?.businessFactQuery.size ??
          nextState.consideredVariant.size,
        color:
          proposal?.businessFactQuery.color ??
          nextState.consideredVariant.color,
        canonicalBuyingIntent: canonicalEvidence.buyingIntent,
        salesSignals: proposal?.salesSignals ?? null,
        shopAlias: this.options.shopAlias,
        policyResolution,
        behaviorModeResolution,
        facts: this.factsReader,
        now,
        effectNow: () => new Date(),
      });
      salesCyclePlan = sales.plan;
      salesHandled = sales.handled;
      salesTelemetry = sales.telemetry ?? null;
      salesProtectedOutbound = sales.protectedOutbound ?? null;
      salesReadinessAttempt = sales.readinessAttempt ?? null;
      if (sales.handled) {
        metaMessages = this.options.mode === "LIVE" && this.options.sendEnabled
          ? [...sales.messages]
          : [];
      }
      if (sales.transferToHuman) {
        salesDesiredTag = sales.desiredTag;
        salesHandoffReasonCode = sales.reasonCode;
        handoffGuardReasonCodes = sales.reasonCode ? [sales.reasonCode] : [];
        const transitioned = applySilentHandoff(
          nextState,
          "AGENT_REQUEST",
          nextState.revision,
          nextState.lastFence,
          now,
        );
        nextState = transitioned.state;
        handoff = transitioned.handoff;
      }
    }

    if (
      metaMessages.length === 0 &&
      this.options.mode === "LIVE" &&
      this.options.sendEnabled
    ) {
      metaMessages = [...holdingMessagesForHandoff(message, handoff)];
    }
    if (this.options.messageGroupingV2Enabled) {
      metaMessages = groupRealtimeMetaMessagesV2(
        metaMessages,
        !salesHandled && (
          proposal?.intent === "product_info" ||
          proposal?.businessFactQuery.intent === "PRICE"
        ),
      );
    } else if (this.options.conversationalMessageFormatEnabled) {
      metaMessages = splitRealtimeMetaMessages(metaMessages);
    }

    let protectedOutboundReadiness: DeterministicEffectReadinessV1 | null =
      salesProtectedOutbound?.readiness ?? null;
    let protectedOutboundClaims = salesProtectedOutbound?.claims ?? protectedClaimSet.claims;
    const outboundClaimTypes: readonly ProtectedClaimV1["type"][] = metaMessages.length === 0
      ? []
      : salesProtectedOutbound?.claimTypes ?? (
          !salesHandled
            ? [...new Set([
                ...protectedClaimValidation.claimTypes,
                ...deterministicProtectedClaimTypes,
              ])].sort()
            : []
        );
    if (protectedOutboundReadiness !== null) {
      const salesCart = salesCyclePlan?.state.cart?.value ?? null;
      const payloadHash = canonicalSha256(metaMessages);
      protectedOutboundReadiness = evaluateDeterministicEffectReadinessV1({
        effect: "PROTECTED_OUTBOUND",
        pageId: claim.pageId,
        conversationId: record.conversationId,
        sourceMessageIdHash: protectedOutboundReadiness.sourceMessageIdHash,
        conversationRevision: record.stateVersion,
        salesCycleRevision: protectedOutboundReadiness.salesCycleRevision,
        productIds: protectedOutboundReadiness.productIds,
        cartId: salesCart?.cartId ?? null,
        cartVersion: salesCart?.revision ?? null,
        cartStateHash: protectedOutboundReadiness.cartStateHash,
        ...(salesCart === null ? {} : { cartLines: salesCart.lines }),
        orderPreviewId: protectedOutboundReadiness.orderPreviewId,
        orderPreviewHash: protectedOutboundReadiness.orderPreviewHash,
        buyingIntent: null,
        claims: protectedOutboundClaims,
        protectedClaimTypes: outboundClaimTypes,
        deterministicEvidenceHash: payloadHash,
        parentReadinessHash: protectedOutboundReadiness.binding.parentReadinessHash,
        payloadHash,
        checkedAt: new Date(),
      });
    }
    if (outboundClaimTypes.length > 0 && !salesProtectedOutbound) {
      const canonicalEvidence = canonicalDecisionEvidenceForTurn();
      const expectedOutboundProductIds = [...new Set(
        businessFactEnvelopes.map(({ productId }) => productId),
      )].sort();
      const fallbackOutboundProductId = businessFacts?.productId ??
        resolvedProduct?.productId ?? nextState.currentProductId;
      if (expectedOutboundProductIds.length === 0 && fallbackOutboundProductId !== null) {
        expectedOutboundProductIds.push(fallbackOutboundProductId);
      }
      const mediaProductId = expectedOutboundProductIds.length === 1
        ? expectedOutboundProductIds[0]!
        : null;
      if (mediaProductId !== null && outboundClaimTypes.includes("PRODUCT_MEDIA")) {
        protectedOutboundClaims = [
          ...protectedOutboundClaims,
          ...buildProtectedMediaClaimsV1({
            productId: mediaProductId,
            imageUrls: metaMessages.flatMap((unit) => unit.kind === "IMAGE" ? [unit.imageUrl] : []),
            sourceVersion: `MEDIA_SELECTOR_V2:${mediaProductId}`,
            observedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 60_000).toISOString(),
          }),
        ];
      }
      const outboundClaimTypeSet = new Set(outboundClaimTypes);
      protectedOutboundClaims = protectedOutboundClaims.filter(({ type }) =>
        outboundClaimTypeSet.has(type)
      );
      protectedOutboundReadiness = evaluateDeterministicEffectReadinessV1({
        effect: "PROTECTED_OUTBOUND",
        pageId: claim.pageId,
        conversationId: record.conversationId,
        sourceMessageIdHash: canonicalEvidence.buyingIntent.sourceMessageIdHash,
        conversationRevision: record.stateVersion,
        salesCycleRevision: salesCycleRecord?.stateRevision ?? null,
        productIds: expectedOutboundProductIds,
        cartId: null,
        cartVersion: null,
        cartStateHash: null,
        orderPreviewId: null,
        orderPreviewHash: null,
        buyingIntent: null,
        claims: protectedOutboundClaims,
        protectedClaimTypes: outboundClaimTypes,
        deterministicEvidenceHash: canonicalSha256(metaMessages),
        payloadHash: canonicalSha256(metaMessages),
        checkedAt: new Date(),
      });
    }

    const protectedOutboundGate = enforceProtectedOutboundReadinessV1({
      messages: metaMessages,
      claims: protectedOutboundClaims,
      readiness: protectedOutboundReadiness,
      salesCyclePlan,
      salesDesiredTag,
    });
    metaMessages = [...protectedOutboundGate.messages];
    protectedOutboundClaims = [...protectedOutboundGate.claims];
    protectedOutboundReadiness = protectedOutboundGate.readiness;
    salesCyclePlan = protectedOutboundGate.salesCyclePlan;
    salesDesiredTag = protectedOutboundGate.salesDesiredTag;
    if (protectedOutboundGate.blockedReasonCodes.length > 0) {
      handoffGuardReasonCodes = [...new Set([
        ...handoffGuardReasonCodes,
        ...protectedOutboundGate.blockedReasonCodes,
      ])];
      salesProtectedOutbound = null;
    }

    const planSeed = [
      "lana:realtime-reply:v1",
      batch.pageId,
      batch.conversationHash,
      batch.generation ?? 0,
      batch.lastReceiveSequence,
    ].join(":");
    const replyPlanId = deterministicUuid(`${planSeed}:plan`);
    const responseGroupId = deterministicUuid(`${planSeed}:response`);
    const desiredTag = salesDesiredTag ?? handoff?.desiredTag ?? null;
    const tagId =
      desiredTag === "DA_CHOT_DON"
        ? this.options.closedOrderTagId
        : desiredTag === "VAN_DON"
          ? this.options.postSaleTagId
          : this.options.employeeTagId;
    const finalAction = handoff
      ? "HANDOFF"
      : metaMessages.length > 0
        ? "REPLY"
        : proposal?.action ?? "NO_REPLY";
    const decisionEvents: RealtimeDecisionEventPlan[] = [];
    const occurredAt = new Date(message.occurredAt);
    const eventKeyHash = createHash("sha256")
      .update(message.eventKey)
      .digest("hex");
    const salesStageBefore = salesCycleRecord?.state.stage ?? null;
    const salesStageAfter = salesCyclePlan?.state.stage ?? salesStageBefore;
    const guardOutcome: RealtimeDecisionEventPlan["details"]["guardOutcome"] =
      guardedPlanHash === null
        ? "NOT_APPLICABLE"
        : handoffGuardReasonCodes.length > 0 || handoff !== null
          ? "BLOCKED"
          : "ALLOWED";
    const observabilityGuardOutcome:
      BuildDecisionObservabilityInput["guardOutcome"] =
      proposalGuardReasonCodes === null
        ? "NOT_EVALUATED"
        : proposalGuardReasonCodes.length > 0
          ? "BLOCKED"
          : "ALLOWED";
    const canonicalEvidence = canonicalDecisionEvidenceForTurn();
    const dialogueEvidenceCodes = [
      ...canonicalEvidence.dialogueEvidence.reasonCodes,
      ...(wave2StrategyDecision?.evidence ?? []),
    ];
    const strategyUsesModelEvidence =
      wave2StrategyDecision?.evidence.includes("MODEL_ANALYSIS_ACCEPTED") ?? false;
    const modelDialogueEvidence =
      canonicalEvidence.dialogueEvidence.contributors.includes(
        "MODEL_STRUCTURED_OUTPUT",
      ) || strategyUsesModelEvidence;
    const deterministicDialogueEvidence =
      canonicalEvidence.dialogueEvidence.contributors.includes(
        "DETERMINISTIC_RUNTIME",
      ) || wave2StrategyDecision !== null;
    const dialogueEvidenceSource:
      BuildDecisionObservabilityInput["dialogueEvidenceSource"] =
      modelDialogueEvidence && deterministicDialogueEvidence
        ? "HYBRID_RUNTIME"
        : modelDialogueEvidence
          ? "MODEL_STRUCTURED_OUTPUT"
          : deterministicDialogueEvidence
            ? "DETERMINISTIC_RUNTIME"
            : "NONE";
    const sideEffectTypes: Array<
      BuildDecisionObservabilityInput["sideEffectTypes"][number]
    > = ["CONVERSATION_STATE"];
    if (metaMessages.length > 0) sideEffectTypes.push("META_OUTBOX");
    if (desiredTag && tagId) sideEffectTypes.push("PANCAKE_TAG_OUTBOX");
    if (
      handoff &&
      state.conversationOwner === "BOT" &&
      nextState.conversationOwner === "HUMAN"
    ) sideEffectTypes.push("HANDOFF");
    if (salesCyclePlan) {
      sideEffectTypes.push("SALES_CYCLE_STATE");
      if (salesCyclePlan.events.some((event) =>
        event.commandKind === "CART_OPENED" ||
        event.commandKind === "CART_MUTATED" ||
        event.commandKind === "CART_READY" ||
        event.commandKind === "CHECKOUT_DETAILS_CAPTURED" ||
        event.commandKind === "CLARIFICATION_REQUESTED" ||
        event.commandKind === "CLARIFICATION_RESOLVED"
      )) sideEffectTypes.push("CART");
      if (salesCyclePlan.events.some((event) =>
        event.commandKind === "PREVIEW_CREATED" ||
        event.commandKind === "CONFIRM_PURCHASE" ||
        event.commandKind === "PAYMENT_RECEIPT_RECEIVED"
      )) sideEffectTypes.push("ORDER");
    }
    const observedProductId =
      businessFacts?.productId ??
      resolvedProduct?.productId ??
      nextState.currentProductId;
    const customerUrlSafeFallbackPlanned =
      customerUrlDisposition === "HANDOFF" ||
      customerUrlDisposition === "EXPLAIN_UNSUPPORTED";
    const readinessObservations = [
      ...(salesCyclePlan?.effectReadiness ?? []),
      ...(salesReadinessAttempt === null ? [] : [salesReadinessAttempt]),
      ...(protectedOutboundReadiness === null ? [] : [protectedOutboundReadiness]),
    ];
    let contextV2CapturePlan: ContextV2CapturePlan | undefined;
    if (!message.isEcho && triggerMessagePk !== null) {
      const sourceOccurredAt = new Date(message.occurredAt);
      const finalCommerceState = salesCyclePlan?.state ?? salesCycleRecord?.state;
      const candidateProductIds = [...new Set(
        resolution.products.map(({ productId }) => productId),
      )].sort();
      const productBindingStatus =
        candidateProductIds.length > 1 &&
          multiProductDecision.disposition !== "CONTINUE"
          ? "AMBIGUOUS" as const
          : businessFacts?.status === "STALE" &&
              businessFacts.productId !== null
            ? "STALE" as const
            : observedProductId
              ? "RESOLVED" as const
              : protectedClaimValidation.claimTypes.length > 0 ||
                  salesCyclePlan !== null
                ? "UNRESOLVED" as const
                : "NOT_REQUIRED" as const;
      const productIds = productBindingStatus === "AMBIGUOUS"
        ? candidateProductIds
        : productBindingStatus === "RESOLVED"
          ? [observedProductId!]
          : productBindingStatus === "STALE"
            ? [businessFacts!.productId]
            : [];
      const finalTurnEvidence = FinalTurnEvidenceV2Schema.safeParse({
        schemaVersion: 2,
        contractVersion: "FINAL_TURN_EVIDENCE_V2",
        sourceMessagePk: triggerMessagePk,
        sourceMessageIdHash:
          canonicalEvidence.buyingIntent.sourceMessageIdHash,
        preTransitionConversationRevision: record.stateVersion,
        finalConversationRevision: nextState.revision,
        preTransitionSalesCycleRevision:
          salesCycleRecord?.stateRevision ?? salesCyclePlan?.expectedRevision ?? null,
        finalSalesCycleRevision: finalCommerceState?.revision ?? -1,
      });
      const productBinding = ProductBindingV2Schema.safeParse({
        schemaVersion: 2,
        contractVersion: "PRODUCT_BINDING_V2",
        status: productBindingStatus,
        productIds,
        catalogVersion: resolvedProduct?.catalogVersion ?? null,
      });
      const capture = finalCommerceState === undefined
        ? blockedContextV2Capture({
            sourceMessagePk: triggerMessagePk,
            sourceOccurredAt,
            reasonCode: "CONTEXT_V2_COMMERCE_STATE_UNAVAILABLE",
          })
        : !finalTurnEvidence.success
          ? blockedContextV2Capture({
              sourceMessagePk: triggerMessagePk,
              sourceOccurredAt,
              reasonCode: "CONTEXT_V2_FINAL_TURN_EVIDENCE_INVALID",
            })
          : !productBinding.success
            ? blockedContextV2Capture({
                sourceMessagePk: triggerMessagePk,
                sourceOccurredAt,
                reasonCode: "CONTEXT_V2_PRODUCT_BINDING_INVALID",
              })
            : buildContextV2Capture({
                canonicalEvidence,
                verifiedClaims: protectedOutboundClaims,
                finalCommerceState,
                readiness: readinessObservations,
                finalTurnEvidence: finalTurnEvidence.data,
                productBinding: productBinding.data,
                owner: nextState.conversationOwner,
                handoffReasonCode:
                  handoffEventReasonCode ?? salesHandoffReasonCode ?? null,
                now,
                sourceOccurredAt,
              });
      contextV2CapturePlan = {
        eventId: deterministicUuid(
          `lana:context-v2-capture:v1:${triggerMessagePk}`,
        ),
        capture,
      };
    }
    const decisionObservability = buildDecisionObservabilityV1({
      dialogueEvidenceCodes,
      dialogueEvidenceSource,
      dialogueEvidenceHash: canonicalEvidence.dialogueEvidence.evidenceHash,
      buyingIntent: {
        authorityVersion: canonicalEvidence.buyingIntent.authorityVersion,
        decision: canonicalEvidence.buyingIntent.decision,
        source:
          canonicalEvidence.buyingIntent.contributors.length === 2
            ? "HYBRID_RUNTIME"
            : canonicalEvidence.buyingIntent.contributors[0] ===
                "MODEL_STRUCTURED_OUTPUT"
              ? "MODEL_STRUCTURED_OUTPUT"
              : canonicalEvidence.buyingIntent.contributors[0] ===
                  "DETERMINISTIC_RUNTIME"
                ? "DETERMINISTIC"
                : null,
        requestedAction: canonicalEvidence.buyingIntent.requestedAction,
        quantity: canonicalEvidence.buyingIntent.quantity,
        confidence:
          canonicalEvidence.buyingIntent.decision === "NONE"
            ? null
            : canonicalEvidence.dialogueEvidence.confidenceBand === "HIGH"
              ? 0.95
              : canonicalEvidence.dialogueEvidence.confidenceBand === "MEDIUM"
                ? 0.8
                : 0.5,
        reasonCodes: canonicalEvidence.buyingIntent.reasonCodes,
        evidenceHash: canonicalEvidence.buyingIntent.evidenceHash,
      },
      protectedClaimTypes: protectedClaimValidation.claimTypes,
      protectedClaimOutcome: protectedClaimValidation.outcome,
      protectedClaimValidatedCount: protectedClaimValidation.validatedCount,
      protectedClaimRejectedCount: protectedClaimValidation.rejectedCount,
      canonicalClaimCount: protectedOutboundClaims.length,
      canonicalClaimSetHash: protectedOutboundClaims.length > 0
        ? hashProtectedClaimSetV1(protectedOutboundClaims)
        : null,
      protectedClaimReasonCodes: protectedClaimReasonCodes(
        proposalGuardReasonCodes ?? [],
      ),
      guardOutcome: observabilityGuardOutcome,
      guardReasonCodes: proposalGuardReasonCodes ?? [],
      guardedPlanHash,
      phase: salesStageAfter ?? nextState.salesStage,
      phaseSource: salesStageAfter === null
        ? "LEGACY_CONVERSATION_STAGE_V1"
        : "SALES_CYCLE_STAGE_V1",
      barrier: wave2StrategyDecision?.barrier ?? "NOT_EVALUATED",
      strategy: wave2StrategyDecision?.recommendedStrategy ?? "NONE",
      cta: wave2StrategyDecision?.ctaPolicy ?? "NONE",
      strategyUsesModelEvidence,
      readinessOutcome: readinessObservations.length > 0
        ? readinessObservations.every(({ outcome }) => outcome === "READY")
          ? "READY"
          : "BLOCKED"
        : "NOT_EVALUATED",
      readinessRulesetVersion: readinessObservations.length > 0
        ? "DETERMINISTIC_EFFECT_READINESS_V1"
        : "LEGACY_READINESS_OBSERVATION_V1",
      readinessReasonCodes: readinessObservations.flatMap(({ reasonCodes }) => reasonCodes),
      productScope: observedProductId
        ? "RESOLVED"
        : protectedClaimValidation.claimTypes.length > 0 || salesCyclePlan !== null
          ? "UNRESOLVED"
          : "NOT_REQUIRED",
      sideEffectTypes,
      sideEffectReasonCodes: [
        ...handoffGuardReasonCodes,
        ...(customerUrlSafeFallbackPlanned ? customerUrlReasonCodes : []),
      ],
      safeFallbackPlanned: customerUrlSafeFallbackPlanned,
    });
    const modelTelemetry = resolveExplicitModelTelemetry({
      modelCalled,
      hasProviderUsage: hasModelTokenUsage,
      providerPromptTokens: modelPromptTokens,
      providerOutputTokens: modelOutputTokens,
      providerTotalTokens: modelTotalTokens,
      inputCharacterCount: JSON.stringify(modelContext).length,
      outputCharacterCount: proposal?.reply.length ?? 0,
      initialFallbackUsed: initialVertexFallbackUsed,
      groundedFallbackUsed,
      groundedDraftFallbackUsed,
      errorClass: modelErrorClass,
    });
    const pushDecisionEvent = (
      eventType: RealtimeDecisionEventPlan["eventType"],
      reasonCodes: readonly string[] = [],
    ): void => {
      decisionEvents.push({
        eventId: deterministicUuid(
          `${message.eventKey}:decision:${eventType}:v${
            this.options.decisionAuditV2Enabled ? 2 : 1
          }`,
        ),
        eventKeyHash,
        eventType,
        origin: productResolutionOrigin,
        reasonCodes,
        releaseId: this.options.releaseId,
        promptVersion: this.options.promptVersion,
        modelVersion,
        policyVersion: policyAuditRef,
        catalogVersion: resolvedProduct?.catalogVersion ?? null,
        mode: this.options.mode,
        productId:
          businessFacts?.productId ??
          resolvedProduct?.productId ??
          nextState.currentProductId,
        intent:
          explicitCustomerBusinessIntent(message.text ?? "") ??
          (buyingSignal.isBuyingSignal
            ? "BUYING_SIGNAL"
            : preSalePolicyIntent !== null
              ? `PRE_SALE_${preSalePolicyIntent}`
              : null),
        stage: salesStageAfter ?? nextState.salesStage,
        action: finalAction,
        occurredAt,
        details: {
          decisionObservability,
          auditSchemaVersion: this.options.decisionAuditV2Enabled ? 2 : 1,
          stateRevisionBefore: state.revision,
          stateRevisionAfter: nextState.revision,
          conversationHash: this.options.decisionAuditV2Enabled
            ? claim.conversationHash
            : null,
          proposalHash:
            this.options.decisionAuditV2Enabled && proposal
              ? createHash("sha256").update(JSON.stringify({
                  schemaVersion: proposal.schemaVersion,
                  intent: proposal.intent,
                  conversationStage: proposal.conversationStage,
                  productId: proposal.productId,
                  action: proposal.action,
                  replyHash: createHash("sha256")
                    .update(proposal.reply)
                    .digest("hex"),
                  attachmentCount: proposal.attachments.length,
                  handoffReason: proposal.handoffReason,
                  businessFactQuery: proposal.businessFactQuery,
                  strategyAnalysis: proposal.strategyAnalysis ?? null,
                })).digest("hex")
              : null,
          guardedPlanHash:
            this.options.decisionAuditV2Enabled ? guardedPlanHash : null,
          renderedReplyHash:
            this.options.decisionAuditV2Enabled && metaMessages.length > 0
              ? createHash("sha256")
                  .update(JSON.stringify(metaMessages.map((unit) =>
                    unit.kind === "TEXT"
                      ? {
                          kind: unit.kind,
                          valueHash: createHash("sha256")
                            .update(unit.text)
                            .digest("hex"),
                        }
                      : {
                          kind: unit.kind,
                          valueHash: createHash("sha256")
                            .update(unit.imageUrl)
                            .digest("hex"),
                        }
                  )))
                  .digest("hex")
              : null,
          factsSourceVersion:
            this.options.decisionAuditV2Enabled && businessFacts
              ? `${businessFacts.source}:${businessFacts.observedAt}`
              : null,
          guardOutcome,
          processingLatencyMs:
            this.options.decisionAuditV2Enabled
              ? Math.max(0, Date.now() - processingStartedAt)
              : null,
          ...(this.options.decisionAuditV2Enabled
            ? { factQueryResults: multiFactAudit }
            : {}),
          productResolutionOrigin,
          buyingSignalReasons: buyingSignal.reasons,
          guardReasonCodes: handoffGuardReasonCodes,
          factsStatus: businessFacts?.status ?? null,
          factsReasonCode: businessFacts?.reasonCode ?? null,
          salesCycleStageBefore: salesStageBefore,
          salesCycleStageAfter: salesStageAfter,
          outboundMessageCount: metaMessages.length,
          modelCalled,
          modelLatencyMs: modelCalled ? modelLatencyMs : null,
          modelTokenUsage: modelTelemetry.tokenUsage,
          modelUsageSource: modelTelemetry.usageSource,
          modelPath: modelTelemetry.path,
          modelErrorClass: modelTelemetry.errorClass,
          buyingSignalOverride,
          wave2Strategy: wave2StrategyDecision
            ? {
                rulesetVersion: wave2StrategyDecision.rulesetVersion,
                need: wave2StrategyDecision.need,
                barrier: wave2StrategyDecision.barrier,
                decisionFactor: wave2StrategyDecision.decisionFactor,
                recommendedStrategy:
                  wave2StrategyDecision.recommendedStrategy,
                ctaPolicy: wave2StrategyDecision.ctaPolicy,
                confidence: wave2StrategyDecision.confidence,
                evidence: wave2StrategyDecision.evidence,
                experimentId:
                  wave2StrategyDecision.experiment.experimentId,
                experimentVariant:
                  wave2StrategyDecision.experiment.variant,
              }
            : null,
          checkoutCapturedFields: salesTelemetry?.checkoutCapturedFields ?? [],
          checkoutMissingFields: salesTelemetry?.checkoutMissingFields ?? [],
          checkoutCompleted: salesTelemetry?.checkoutCompleted ?? false,
          clarificationReasonCode: salesTelemetry?.clarificationReasonCode ?? null,
          clarificationAttemptCount: salesTelemetry?.clarificationAttemptCount ?? 0,
          clarificationMaxAttempts: salesTelemetry?.clarificationMaxAttempts ?? 0,
          clarificationBudgetExhausted: salesTelemetry?.clarificationBudgetExhausted ?? false,
          clarificationCase: salesTelemetry?.clarificationCase ?? false,
          orderPreviewCreated: salesTelemetry?.orderPreviewCreated ?? false,
          confirmationAttempted: salesTelemetry?.confirmationAttempted ?? false,
          confirmationConfirmed: salesTelemetry?.confirmationConfirmed ?? false,
          confirmationSource: salesTelemetry?.confirmationSource ?? null,
          confirmationAction: salesTelemetry?.confirmationAction ?? null,
          confirmationBehaviorMode: behaviorModeResolution.confirmationMode,
          confirmationModeSource: behaviorModeResolution.source,
          confirmationModeVersionId: behaviorModeResolution.modeVersionId,
          confirmationModeContentHash: behaviorModeResolution.contentHash,
          confirmationModePointerRevision: behaviorModeResolution.pointerRevision,
          confirmationModeAuditWrite: behaviorModeResolution.auditWrite,
          confirmationContainmentActive: salesTelemetry?.confirmationContainmentActive ?? false,
          confirmationShadow: salesTelemetry?.confirmationShadow ?? null,
        },
      });
    };
    if (wave2StrategyDecision) {
      pushDecisionEvent("WAVE2_STRATEGY_SELECTED", [
        wave2StrategyDecision.need,
        wave2StrategyDecision.barrier,
        wave2StrategyDecision.recommendedStrategy,
        wave2StrategyDecision.ctaPolicy,
      ]);
      if (wave2StrategyDecision.barrier !== "NONE") {
        pushDecisionEvent("WAVE2_BARRIER_DETECTED", [
          wave2StrategyDecision.barrier,
          wave2StrategyDecision.decisionFactor,
        ]);
      }
    }
    if (
      multiProductDecision.disposition === "CLARIFY_SELECTION" &&
      proposal?.action === "REPLY"
    ) {
      pushDecisionEvent(
        "CLARIFICATION_REQUESTED",
        [...new Set([
          ...multiProductDecision.reasonCodes,
          ...(mediaDisposition.disposition === "CONTINUE_MATCHES"
            ? mediaDisposition.reasonCodes
            : []),
        ])],
      );
    }
    if (resolvedProduct) {
      pushDecisionEvent("PRODUCT_RESOLVED");
      pushDecisionEvent(
        "PRODUCT_MATCHED",
        [
          ...(mediaDisposition.disposition === "CONTINUE_MATCHES"
            ? mediaDisposition.reasonCodes
            : []),
          ...(approvedCustomerUrl ? customerUrlReasonCodes : []),
        ],
      );
    }
    if (
      metaMessages.length > 0 &&
      businessFacts?.status === "OK" &&
      (explicitCustomerBusinessIntent(message.text ?? "") === "PRICE" ||
        productCodeOnly(message.text ?? "") !== null)
    ) {
      pushDecisionEvent("PRICE_CARD_SENT");
    }
    if (
      explicitCustomerBusinessIntent(message.text ?? "") === "SIZE" ||
      salesStageAfter === "MEASUREMENTS_REQUIRED" ||
      salesStageAfter === "SIZE_RECOMMENDED"
    ) {
      pushDecisionEvent("SIZE_CONSULT_STARTED");
    }
    if (buyingSignal.isBuyingSignal) {
      const committedReasons = [
        ...(buyingSignalOverride ? ["NO_REPLY_OVERRIDE_BUYING_SIGNAL"] : []),
        ...buyingSignal.reasons,
      ];
      pushDecisionEvent("BUYING_SIGNAL_DETECTED", committedReasons);
      pushDecisionEvent("BUYING_SIGNAL_COMMITTED", committedReasons);
      if (
        salesStageAfter === "CART_OPEN" ||
        nextState.salesStage === "READY_TO_BUY"
      ) {
        pushDecisionEvent("READY_TO_BUY");
      }
    }
    if (
      salesCyclePlan?.events.some((event) => event.commandKind === "CART_OPENED")
    ) {
      pushDecisionEvent("ORDER_INFO_REQUESTED");
      pushDecisionEvent("ORDER_INTENT_CREATED");
    }
    if ((salesTelemetry?.checkoutMissingFields?.length ?? 0) > 0) {
      const clarificationReasons = [
        ...salesTelemetry!.checkoutMissingFields!.map((field) => `MISSING_${field}`),
        ...(salesTelemetry?.clarificationAttemptCount
          ? [`ATTEMPT_${salesTelemetry.clarificationAttemptCount}`]
          : []),
        ...(salesTelemetry?.clarificationBudgetExhausted
          ? ["CLARIFICATION_RETRY_EXHAUSTED"]
          : []),
      ];
      pushDecisionEvent("CHECKOUT_DETAILS_MISSING", clarificationReasons);
      if (
        salesTelemetry?.clarificationReasonCode &&
        !salesTelemetry.clarificationBudgetExhausted
      ) {
        pushDecisionEvent("CLARIFICATION_REQUESTED", clarificationReasons);
      }
    }
    if (salesTelemetry?.checkoutCompleted) {
      pushDecisionEvent("CHECKOUT_COMPLETED");
    }
    if (salesTelemetry?.orderPreviewCreated) {
      pushDecisionEvent("ORDER_PREVIEW_CREATED");
    }
    if (salesTelemetry?.confirmationAttempted) {
      if (salesTelemetry.confirmationConfirmed) {
        pushDecisionEvent("PURCHASE_CONFIRMATION_DETECTED", [
          salesTelemetry.confirmationSource ?? "CONFIRMATION_SOURCE_UNKNOWN",
        ]);
        pushDecisionEvent("PURCHASE_CONFIRMED");
      } else {
        const rejectedReasons = [
          salesTelemetry.confirmationReasonCode ?? "CONFIRMATION_NOT_ACCEPTED",
          salesTelemetry.confirmationSource ?? "CONFIRMATION_SOURCE_UNKNOWN",
        ];
        pushDecisionEvent("PURCHASE_CONFIRMATION_REJECTED", rejectedReasons);
      }
    }
    if (handoff) {
      const handoffReasons = [
        salesHandoffReasonCode ?? businessFacts?.reasonCode ?? handoff.reason,
        ...handoffGuardReasonCodes,
      ];
      pushDecisionEvent("HANDOFF", handoffReasons);
      pushDecisionEvent("HANDOFF_REQUESTED", handoffReasons);
    }
    if (handoffGuardReasonCodes.length > 0) {
      pushDecisionEvent("GUARD_BLOCKED", handoffGuardReasonCodes);
    }
    if (customerUrlDisposition === "EXPLAIN_UNSUPPORTED") {
      pushDecisionEvent("GUARD_BLOCKED", customerUrlReasonCodes);
    }
    if (
      !message.isEcho &&
      !handoff &&
      metaMessages.length === 0 &&
      !salesHandled &&
      proposal?.action === "NO_REPLY"
    ) {
      pushDecisionEvent("NO_REPLY");
      pushDecisionEvent("NO_REPLY_SELECTED");
    }
    const acquisitionDecision = deriveAdLeadQualification({
      text: message.text ?? "",
      productMatched: Boolean(resolvedProduct),
      resolvedAttachment: resolution.media.items.some((item) => item.status === "MATCHED"),
      businessIntent: explicitCustomerBusinessIntent(message.text ?? ""),
      preSalePolicyIntent,
      objectionType: event.objectionType,
      buyingCommitted: buyingSignal.isBuyingSignal,
      orderPreviewCreated: salesTelemetry?.orderPreviewCreated === true,
      purchaseConfirmed: salesTelemetry?.confirmationConfirmed === true,
    });
    const acquisitionAnalyticsEnabled =
      this.options.adAcquisitionAnalyticsMode !== "OFF" &&
      this.options.adAcquisitionPageIds.includes(claim.pageId) &&
      !message.isEcho &&
      triggerMessagePk !== null;
    const handoffDeliveryOrdering = responseGroupHandoffOrdering(
      sizeAdviceRequiresHandoff,
      metaMessages.length,
      responseGroupId,
    );
    const result = await this.runtime.commit(
      {
        pageId: claim.pageId,
        customerHash: claim.conversationHash,
        conversationId: record.conversationId,
        expectedStateVersion: record.stateVersion,
        state: nextState,
        ...(metaMessages.length > 0
          ? {
              metaPlan: {
                replyPlanId,
                responseGroupId,
                recipientId: message.senderId,
                messages: metaMessages,
                imageDelayMs: this.options.imageDelayMs,
                sendAfterOwnerHandoff:
                  handoffDeliveryOrdering.sendAfterOwnerHandoff,
                ...(protectedOutboundReadiness?.outcome === "READY"
                  ? {
                      protectedClaimTypes: protectedOutboundReadiness.protectedClaimTypes,
                      sourceMessageIdHash: protectedOutboundReadiness.sourceMessageIdHash,
                      effectReadiness: protectedOutboundReadiness,
                      protectedClaims: protectedOutboundClaims,
                    }
                  : {}),
              },
            }
          : {}),
        ...(desiredTag && tagId
          ? {
              pancakeTagPlan: {
                desiredTag,
                tagId,
                handoffGeneration: nextState.revision,
                afterResponseGroupId:
                  handoffDeliveryOrdering.afterResponseGroupId,
              },
            }
          : {}),
        ...(handoff && state.conversationOwner === "BOT" &&
            nextState.conversationOwner === "HUMAN"
          ? {
              handoffEventPlan: {
                source:
                  handoff.reason === "CUSTOMER_REQUESTED_HUMAN"
                    ? ("CUSTOMER_REQUEST" as const)
                    : handoff.category === "POST_SALE"
                      ? ("POST_SALE" as const)
                      : ("BOT_POLICY" as const),
                reasonCode:
                  handoffEventReasonCode ??
                  salesHandoffReasonCode ??
                  businessFacts?.reasonCode ??
                  handoff.reason,
                reasonDetailSafe: {
                  directive_reason: handoff.reason,
                  guard_reason_codes: [...handoffGuardReasonCodes],
                },
                productId:
                  businessFacts?.productId ??
                  resolvedProduct?.productId ??
                  nextState.currentProductId,
                factsStatus: businessFacts?.status ?? null,
                factsReasonCode: businessFacts?.reasonCode ?? null,
                desiredTag: handoff.desiredTag,
                handoffGeneration: nextState.revision,
                triggerEventKey: message.eventKey,
                triggerMessagePk,
                occurredAt: new Date(message.occurredAt),
              },
            }
          : {}),
        ...(message.isEcho
          ? {
              handoffAcknowledgementPlan: {
                actorRef: message.senderId,
                occurredAt: new Date(message.occurredAt),
              },
            }
          : {}),
        ...(salesCyclePlan ? { salesCyclePlan } : {}),
        ...(acquisitionAnalyticsEnabled
          ? {
              acquisitionPlan: {
                triggerMessagePk: triggerMessagePk!,
                triggerOccurredAt: new Date(message.occurredAt),
                replyPlanId: metaMessages.length > 0 ? replyPlanId : null,
                meaningfulLabels: acquisitionDecision.meaningfulLabels,
                ambiguousAcknowledgement: acquisitionDecision.ambiguousAcknowledgement,
                buyingNegated: acquisitionDecision.buyingNegated,
                buyingCommitted: (buyingSignal.isBuyingSignal || salesTelemetry?.orderPreviewCreated === true) &&
                  !acquisitionDecision.buyingNegated,
                purchaseConfirmed: salesTelemetry?.confirmationConfirmed === true && !acquisitionDecision.buyingNegated,
                firstPlaybook: wave2StrategyDecision?.recommendedStrategy ?? null,
                firstBarrier:
                  wave2StrategyDecision?.barrier && wave2StrategyDecision.barrier !== "NONE"
                    ? wave2StrategyDecision.barrier
                    : null,
              },
            }
          : {}),
        ...(this.options.decisionTelemetryEnabled && decisionEvents.length > 0
          ? { decisionEvents }
          : {}),
        ...(contextV2CapturePlan ? { contextV2CapturePlan } : {}),
        ...(inboxBatchGuard ? { inboxBatchGuard } : {}),
      },
      new Date(),
    );
    return batchCommitStatus(result);
  }

  private emptyResolution(): ProductResolution {
    return {
      primary: null,
      products: [],
      references: [],
      media: aggregateMedia([]),
      origin: "NONE",
      extractedAdProductId: null,
      clarification: null,
    };
  }

  private singleResolution(
    product: StableProductDocument,
    origin: ProductResolution["origin"],
    extractedAdProductId: string | null = null,
  ): ProductResolution {
    return {
      primary: product,
      products: [product],
      references: [{ raw: product.productId, product, resolution: "RESOLVED" }],
      media: aggregateMedia([]),
      origin,
      extractedAdProductId,
      clarification: null,
    };
  }

  private mediaRecognitionEnabledForPage(pageId: string): boolean {
    return Boolean(
      this.options.mediaRecognitionEnabled &&
      this.mediaRecognition &&
      this.options.mediaRecognitionPageIds.includes(pageId),
    );
  }

  private mediaClarificationMessages(
    action: MediaClarificationDecision["action"],
    candidates: readonly StableProductDocument[],
    attemptCount: number,
    maxAttempts: number,
  ): RealtimeMetaMessageUnit[] {
    if (action === "REJECTED") {
      return [{
        kind: "TEXT",
        text: "Em đã bỏ các mẫu vừa gợi ý. Chị gửi ảnh khác rõ hơn hoặc mã sản phẩm giúp em nhé.",
      }];
    }
    if (action === "RETRY") {
      return [{
        kind: "TEXT",
        text: `Chị chọn giúp em “mẫu 1/2/3” hoặc gửi đúng mã trong danh sách nhé (${attemptCount}/${maxAttempts}).`,
      }];
    }
    if (candidates.length === 0) {
      return [{
        kind: "TEXT",
        text: "Em chưa đối chiếu chắc mẫu này. Chị gửi thêm ảnh rõ toàn bộ trang phục hoặc mã sản phẩm giúp em nhé.",
      }];
    }
    const units: RealtimeMetaMessageUnit[] = [{
      kind: "TEXT",
      text: "Em thấy các mẫu gần nhất dưới đây, chị chọn “mẫu 1/2/3” hoặc gửi mã giúp em nhé.",
    }];
    candidates.slice(0, 3).forEach((product, index) => {
      units.push({
        kind: "TEXT",
        text: `Mẫu ${index + 1} — ${product.productId}`,
      });
      const imageUrl = verifiedImageUrls(product, "PRICE_CARD")[0];
      if (imageUrl) units.push({ kind: "IMAGE", imageUrl });
    });
    return units;
  }

  private async resolveCustomerUrlProducts(
    decision: CustomerUrlDecision,
  ): Promise<ProductResolution | null> {
    const products: StableProductDocument[] = [];
    const references: ResolvedProductReference[] = [];
    for (const item of decision.items) {
      if (
        item.classification !== "APPROVED_FIRST_PARTY_PRODUCT" &&
        item.classification !== "APPROVED_SHOP_CDN"
      ) return null;
      if (!item.productCode) return null;
      const product = await this.exactProduct(item.productCode);
      if (!product || !customerUrlItemAuthorizesProduct(item, product)) return null;
      references.push({ raw: item.productCode, product, resolution: "RESOLVED" });
      if (!products.some(({ productId }) => productId === product.productId)) {
        products.push(product);
      }
    }
    if (products.length === 0) return null;
    return {
      primary: products[0] ?? null,
      products,
      references,
      media: aggregateMedia([]),
      origin: "TEXT_CODE",
      extractedAdProductId: null,
      clarification: null,
    };
  }

  private async resolveResidualCustomerUrlProducts(
    message: InboundMessageV1,
    state: ConversationState,
    pageId: string,
    mediaPartialResolutionPolicy: MediaPartialResolutionPolicy,
  ): Promise<ProductResolution> {
    const residualText = redactCustomerUrlsForModel(message.text ?? "")
      .replace(/\[CUSTOMER_URL\]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
    const residualCodes = [...new Set([
      ...(productCodeOnly(residualText) ? [productCodeOnly(residualText)!] : []),
      ...extractAdProductCodes(residualText),
    ].map((code) => normalizeProductCode(code)).filter(Boolean))];
    if (residualCodes.length > 0) {
      const references = await resolveProductReferencesBounded(
        residualCodes,
        (code) => this.exactProduct(code),
      );
      const products = references
        .map(({ product }) => product)
        .filter((product): product is StableProductDocument => product !== null);
      return {
        primary: products[0] ?? null,
        products,
        references,
        media: aggregateMedia([]),
        origin: "TEXT_CODE",
        extractedAdProductId: null,
        clarification: null,
      };
    }

    const hasResolvableTransportEvidence = Boolean(message.adsContext) ||
      message.attachments.some((attachment) =>
        (attachment.type.toLowerCase() === "image" ||
          attachment.type.toLowerCase() === "video") && Boolean(attachment.url)
      );
    if (!hasResolvableTransportEvidence) return this.emptyResolution();
    const resolution = await this.resolveProducts(
      { ...message, text: residualText || null },
      state,
      pageId,
      mediaPartialResolutionPolicy,
    );
    return resolution.origin === "ADS" || resolution.origin === "MEDIA" ||
        resolution.origin === "TEXT_CODE" || resolution.origin === "SELECTION"
      ? resolution
      : this.emptyResolution();
  }

  private combineCustomerUrlResolutions(
    approved: ProductResolution,
    residual: ProductResolution,
  ): ProductResolution {
    const products: StableProductDocument[] = [];
    for (const product of [...approved.products, ...residual.products]) {
      const productId = normalizeProductCode(product.productId);
      if (!products.some((candidate) =>
        normalizeProductCode(candidate.productId) === productId
      )) products.push(product);
    }
    const references: ResolvedProductReference[] = [];
    for (const reference of [...approved.references, ...residual.references]) {
      const key = reference.product
        ? normalizeProductCode(reference.product.productId)
        : `${normalizeProductCode(reference.raw)}:${reference.resolution}`;
      if (!references.some((candidate) => {
        const candidateKey = candidate.product
          ? normalizeProductCode(candidate.product.productId)
          : `${normalizeProductCode(candidate.raw)}:${candidate.resolution}`;
        return candidateKey === key;
      })) references.push(reference);
    }
    return {
      primary: products[0] ?? null,
      products,
      references,
      media: residual.media,
      origin: approved.origin,
      extractedAdProductId: residual.extractedAdProductId,
      clarification: residual.clarification,
    };
  }

  private async exactProduct(value: string): Promise<StableProductDocument | null> {
    const result = await this.productSearch.searchText(value);
    return result.status === "MATCHED" &&
        (result.matchKind === "EXACT_CODE" || result.matchKind === "ALIAS")
      ? result.product
      : null;
  }

  private async rehydrateRecognizedProduct(
    product: StableProductDocument,
  ): Promise<StableProductDocument> {
    try {
      const hydrated = await this.exactProduct(product.productId);
      return hydrated &&
          normalizeProductCode(hydrated.productId) === normalizeProductCode(product.productId)
        ? hydrated
        : product;
    } catch {
      // A catalog hydration outage must not erase an otherwise verified match.
      return product;
    }
  }

  private async searchImages(
    urls: readonly string[],
    policy: MediaPartialResolutionPolicy,
  ): Promise<readonly MediaProductSearchResult[]> {
    if (this.productSearch.searchImages) {
      if (policy === "LEGACY") {
        return this.productSearch.searchImages(urls, 3);
      }
      try {
        return await this.productSearch.searchImages(urls, 3);
      } catch {
        // Fall through to isolated per-asset searches. One malformed or failed
        // asset must not erase successful siblings in the same customer turn.
      }
    }
    return Promise.all(urls.map(async (url): Promise<MediaProductSearchResult> => {
      try {
        return await this.productSearch.searchImage(url);
      } catch (error) {
        return {
          status: "ERROR",
          reasonCode: error instanceof Error ? error.message.slice(0, 128) : "IMAGE_SEARCH_FAILED",
        };
      }
    }));
  }

  private async recognizeImages(
    urls: readonly string[],
    policy: MediaPartialResolutionPolicy,
  ): Promise<readonly PromiseSettledResult<RealtimeMediaRecognition>[]> {
    const pending = urls.map((url) => this.mediaRecognition!.recognize(url));
    if (policy === "PER_ASSET_V1") return Promise.allSettled(pending);
    const results = await Promise.all(pending);
    return results.map((value) => ({ status: "fulfilled", value }));
  }

  private boundedMediaFailureReason(error: unknown): string {
    const value = error instanceof Error ? error.message.trim() : "";
    const code = value.split(":", 1)[0] ?? "";
    return /^(?:MEDIA|IMAGE|QDRANT)_[A-Z0-9_]{1,120}$/u.test(code)
      ? code
      : "MEDIA_ASSET_PROCESSING_FAILED";
  }

  private async searchImageBytes(
    frame: Uint8Array,
  ): Promise<MediaProductSearchResult> {
    if (!this.productSearch.searchImageBytes) {
      return { status: "ERROR", reasonCode: "IMAGE_BYTES_UNSUPPORTED" };
    }
    return this.productSearch.searchImageBytes(frame);
  }

  private async resolveProducts(
    message: InboundMessageV1,
    state: ConversationState,
    pageId: string,
    mediaPartialResolutionPolicy: MediaPartialResolutionPolicy,
  ): Promise<ProductResolution> {
    const text = message.text?.trim() ?? "";
    const imageAttachments = message.attachments
      .map((attachment, ordinal) => ({ attachment, ordinal }))
      .filter((item): item is {
        attachment: typeof item.attachment & { url: string };
        ordinal: number;
      } =>
        item.attachment.type.toLowerCase() === "image" &&
        Boolean(item.attachment.url)
      );
    const activeClarification = state.mediaClarification;
    if (activeClarification?.status === "ACTIVE" && imageAttachments.length === 0) {
      const explicitCodes = [...new Set([
        ...(productCodeOnly(text) ? [productCodeOnly(text)!] : []),
        ...extractAdProductCodes(text),
      ])];
      if (explicitCodes.length > 0) {
        const references = await resolveProductReferencesBounded(
          explicitCodes,
          (code) => this.exactProduct(code),
        );
        const products = references
          .map(({ product }) => product)
          .filter((product): product is StableProductDocument => product !== null);
        if (products.length > 0) {
          return {
            primary: products[0] ?? null,
            products,
            references,
            media: aggregateMedia([]),
            origin: "TEXT_CODE",
            extractedAdProductId: null,
            clarification: {
              action: "CLEAR",
              candidates: [],
              attemptCount: activeClarification.attemptCount,
              maxAttempts: activeClarification.maxAttempts,
              reasonCode: "MEDIA_CLARIFICATION_EXPLICIT_CODE",
            },
          };
        }
      }
      const selected = selectedProductId(text, activeClarification.candidates);
      if (selected) {
        const product = await this.exactProduct(selected);
        if (product) {
          return {
            ...this.singleResolution(product, "SELECTION"),
            clarification: {
              action: "CLEAR",
              candidates: [],
              attemptCount: activeClarification.attemptCount,
              maxAttempts: activeClarification.maxAttempts,
              reasonCode: "MEDIA_CLARIFICATION_SELECTED",
            },
          };
        }
      }
      const normalizedText = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .toLocaleLowerCase("vi");
      const rejected = /(khong phai|khong co mau nao|sai het|khong dung)/iu
        .test(normalizedText);
      if (rejected) {
        return {
          ...this.emptyResolution(),
          clarification: {
            action: "REJECTED",
            candidates: [],
            attemptCount: activeClarification.attemptCount,
            maxAttempts: activeClarification.maxAttempts,
            reasonCode: "MEDIA_CLARIFICATION_REJECTED",
          },
        };
      }
      const attemptCount = activeClarification.attemptCount + 1;
      return {
        ...this.emptyResolution(),
        clarification: {
          action: attemptCount >= activeClarification.maxAttempts
            ? "EXHAUSTED"
            : "RETRY",
          candidates: [],
          attemptCount,
          maxAttempts: activeClarification.maxAttempts,
          reasonCode: "MEDIA_CLARIFICATION_UNRESOLVED",
        },
      };
    }
    const selected = selectedProductId(text, state.productSelections ?? []);
    if (selected) {
      const product = await this.exactProduct(selected);
      if (product) return this.singleResolution(product, "SELECTION");
    }

    const textCodes = [...new Set([
      ...(productCodeOnly(text) ? [productCodeOnly(text)!] : []),
      ...extractAdProductCodes(text),
    ])];
    if (this.options.multiFactQueryEnabled && textCodes.length > 1) {
      const references = await resolveProductReferencesBounded(
        textCodes,
        (code) => this.exactProduct(code),
      );
      const products = references
        .map(({ product }) => product)
        .filter((product): product is StableProductDocument => product !== null);
      return {
        primary: products[0] ?? null,
        products,
        references,
        media: aggregateMedia([]),
        origin: "TEXT_CODE",
        extractedAdProductId: null,
        clarification: null,
      };
    }

    const explicitCode = productCodeOnly(text);
    if (explicitCode) {
      const product = await this.exactProduct(explicitCode);
      if (product) return this.singleResolution(product, "TEXT_CODE");
    }
    for (const code of extractAdProductCodes(text)) {
      const product = await this.exactProduct(code);
      if (product) return this.singleResolution(product, "TEXT_CODE");
    }

    for (const code of extractAdProductCodes(message.adsContext?.adTitle ?? "")) {
      const product = await this.exactProduct(code);
      if (product) return this.singleResolution(product, "ADS", product.productId);
    }

    const mediaItems: MediaAnalysisItem[] = [];
    let mediaClarification: MediaClarificationDecision | null = null;
    if (imageAttachments.length > 0) {
      const useRecognition = this.mediaRecognitionEnabledForPage(pageId);
      const recognitionResults = useRecognition
        ? await this.recognizeImages(
            imageAttachments.map((item) => item.attachment.url),
            mediaPartialResolutionPolicy,
          )
        : null;
      const searchResults = useRecognition
        ? null
        : await this.searchImages(
            imageAttachments.map((item) => item.attachment.url),
            mediaPartialResolutionPolicy,
          );
      for (const [index, item] of imageAttachments.entries()) {
        if (useRecognition) {
          const settled = recognitionResults?.[index];
          if (!settled || settled.status === "rejected") {
            mediaItems.push({
              ordinal: item.ordinal,
              mediaType: "IMAGE",
              status: "ERROR",
              product: null,
              score: null,
              gap: null,
              reasonCode: settled
                ? this.boundedMediaFailureReason(settled.reason)
                : "IMAGE_SEARCH_RESULT_MISSING",
              frameCount: 1,
            });
            continue;
          }
          const recognition: RealtimeMediaRecognition = settled.value;
          if (recognition.status === "MATCHED") {
            const product = await this.rehydrateRecognizedProduct(recognition.product);
            mediaItems.push(mediaItemFromSearch(
              item.ordinal,
              "IMAGE",
              {
                status: "MATCHED",
                matchKind: "SEMANTIC",
                product,
                score: recognition.score,
                gap: recognition.gap,
              },
            ));
          } else {
            mediaItems.push({
              ordinal: item.ordinal,
              mediaType: "IMAGE",
              status: recognition.status,
              product: null,
              score: null,
              gap: null,
              reasonCode: recognition.reasonCode,
              frameCount: 1,
            });
          }
          if (
            recognition.status !== "MATCHED" &&
            this.options.mediaClarificationEnabled &&
            mediaClarification === null
          ) {
            mediaClarification = {
              action: "OPEN",
              candidates: recognition.candidates.map(({ product }) => product),
              attemptCount: 0,
              maxAttempts: 3,
              reasonCode: recognition.reasonCode,
            };
          }
        } else {
          const result = searchResults?.[index] ?? {
            status: "ERROR" as const,
            reasonCode: "IMAGE_SEARCH_RESULT_MISSING",
          };
          mediaItems.push(mediaItemFromSearch(
            item.ordinal,
            "IMAGE",
            result as MediaProductSearchResult,
          ));
        }
      }
    }

    const videos = message.attachments
      .map((attachment, ordinal) => ({ attachment, ordinal }))
      .filter((item): item is { attachment: typeof item.attachment & { url: string }; ordinal: number } =>
        item.attachment.type.toLowerCase() === "video" && Boolean(item.attachment.url)
      );
    for (const item of videos) {
      if (!this.videoFrames) {
        mediaItems.push(mediaItemFromSearch(item.ordinal, "VIDEO", {
          status: "ERROR",
          reasonCode: "VIDEO_FRAME_EXTRACTOR_UNAVAILABLE",
        }));
        continue;
      }
      try {
        const extraction = await this.videoFrames.extract(item.attachment.url);
        const frames: MediaProductSearchResult[] = await Promise.all(
          extraction.frames.map((frame) => this.searchImageBytes(frame)),
        );
        mediaItems.push(aggregateVideoFrames(item.ordinal, frames));
      } catch (error) {
        mediaItems.push(mediaItemFromSearch(item.ordinal, "VIDEO", {
          status: "ERROR",
          reasonCode: error instanceof Error ? error.message.slice(0, 128) : "VIDEO_PROCESSING_FAILED",
        }));
      }
    }

    if (mediaItems.length > 0) {
      const media = aggregateMedia(mediaItems);
      return {
        primary: media.products[0] ?? null,
        products: media.products,
        references: media.products.map((product) => ({
          raw: product.productId,
          product,
          resolution: "RESOLVED" as const,
        })),
        media,
        origin: "MEDIA",
        extractedAdProductId: null,
        clarification: mediaClarification,
      };
    }

    const stateProductId = currentProductContinuationId(text, state.currentProductId);
    if (stateProductId) {
      const product = await this.exactProduct(stateProductId);
      if (product) return this.singleResolution(product, "STATE");
    }

    if (text) {
      const result = await this.productSearch.searchText(text);
      if (result.status === "MATCHED") {
        return this.singleResolution(result.product, "TEXT_SEMANTIC");
      }
    }
    return this.emptyResolution();
  }

  private async resolveFacts(
    proposal: AgentProposalV1,
    product: StableProductDocument | null,
    purpose: ImageSelectionPurpose = "PRICE_CARD",
  ): Promise<BusinessFactEnvelopeV1 | null> {
    if (
      proposal.productId === null ||
      proposal.businessFactQuery.intent === "NONE"
    ) {
      return null;
    }
    const query: CatalogFactQuery = {
      shopAlias: this.options.shopAlias,
      productId: proposal.productId,
      intent: proposal.businessFactQuery.intent,
      offerType: proposal.businessFactQuery.offerType,
      color: proposal.businessFactQuery.color,
      size: proposal.businessFactQuery.size,
      deliveryRegion: proposal.businessFactQuery.deliveryRegion,
    };
    const facts = await this.factsReader.resolve(query);
    if (
      product &&
      facts.status === "OK" &&
      facts.facts &&
      facts.productId === product.productId
    ) {
      // Chỉ những ảnh sắp gửi mới được coi là đã xác minh. Gán cả danh sách ảnh
      // của sản phẩm vào đây làm gói facts vượt trần 6 phần tử của
      // `ProductFactsV1`, khiến guard trượt schema và chặn luôn câu báo giá.
      return {
        ...facts,
        facts: { ...facts.facts, imageUrls: verifiedImageUrls(product, purpose) },
      };
    }
    return facts;
  }

  private conversationEvent(
    message: InboundMessageV1,
    receiveSequence: number,
    productId: string | null,
    customerUrlRequiresHandoff = false,
  ): InboundConversationEvent {
    const text = (message.text ?? "").toLocaleLowerCase("vi");
    const postSale = isPostSaleRequest(message.text ?? "");
    const humanRequest = /(nhân viên|người tư vấn|gặp shop|gọi cho)/iu.test(text);
    return {
      eventKey: message.eventKey,
      messageId: message.messageId,
      occurredAt: message.occurredAt,
      receiveSequence,
      actor: message.isEcho ? "HUMAN" : "CUSTOMER",
      journey: postSale ? "POST_SALE" : "PRE_SALE",
      requestedHandoffReason: postSale
        ? postSaleHandoffReason(message.text ?? "")
        : customerUrlRequiresHandoff
          ? "SENSITIVE_CASE"
        : humanRequest
          ? "CUSTOMER_REQUESTED_HUMAN"
          : null,
      requestedSalesStage: this.salesStage(text, productId),
      salesStageTrigger: "NORMAL",
      productId,
      objectionType: this.objectionType(text),
    };
  }

  private salesStage(
    text: string,
    productId: string | null,
  ): SalesStage | null {
    if (/(chốt|lấy|đặt|mua|ok lấy)/iu.test(text)) return "READY_TO_BUY";
    if (
      hasCustomerMeasurementSignal(text) ||
      hasSizeOnlyContinuationSignal(text) ||
      /(size|sz|eo|ngực|mông|cao|nặng)/iu.test(text)
    ) {
      return "FIT_CONSULTING";
    }
    if (/(đắt|giá cao|phân vân|so sánh)/iu.test(text)) {
      return "OBJECTION_HANDLING";
    }
    return productId ? "PRODUCT_MATCHED" : null;
  }

  private objectionType(text: string): ObjectionType {
    if (/(đắt|giá cao)/iu.test(text)) return "PRICE";
    if (/(size|sz|vừa|chật|rộng)/iu.test(text)) return "SIZE_FIT";
    if (/(bao lâu|khi nào|giao)/iu.test(text)) return "DELIVERY";
    if (/(chất|vải)/iu.test(text)) return "MATERIAL";
    if (/(màu)/iu.test(text)) return "COLOR";
    return "NONE";
  }

  private handoffReason(
    proposal: AgentProposalV1,
    blockedReasonCodes: readonly string[],
  ): HandoffReason {
    if (blockedReasonCodes.includes("UNVERIFIED_PRODUCT")) {
      return "UNVERIFIED_PRODUCT_ID";
    }
    if (blockedReasonCodes.length > 0) return "UNVERIFIED_BUSINESS_FACT";
    return proposal.handoffReason === "CUSTOMER_REQUESTED_HUMAN"
      ? "CUSTOMER_REQUESTED_HUMAN"
      : "AGENT_REQUEST";
  }
}
