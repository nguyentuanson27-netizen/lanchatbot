import { createHash } from "node:crypto";
import {
  detectBuyingSignal,
  extractCustomerMeasurements,
  assembleReply,
  buildVerifiedFactBlocks,
  mergeCustomerProfile,
  normalizeProductCode,
  ProductSearchService,
  recommendSize,
  selectProductMediaV2,
  guardAgentProposal,
  selectImages,
  verifiedImageUrls,
  type CatalogFactQuery,
  type CustomerImageIntent,
  type ImageSelectionPurpose,
  type MediaProductSearchResult,
  type StableProductDocument,
  type CustomerProfileFieldEvidence,
  type ScopedSizeChart,
} from "@lana/business-tools";
import {
  BusinessFactQueriesV2Schema,
  type AgentProposalV1,
  type BusinessFactQueriesV2,
  type BusinessFactEnvelopeV1,
  type CustomerProfileV1,
  type HandoffReasonV2,
  type InboundMessageV1,
  type MeasurementKind,
  type ProductComponentRole,
  type ProductFactsV2,
  type RequestedBusinessFactV2,
} from "@lana/contracts";
import type {
  RuntimePolicyChannel,
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
  SalesCycleRuntimeState,
} from "@lana/chat-runtime";
import {
  decideRuntimeMultiItemOffer,
  outboundRuntimePolicy,
  runtimePolicyAuditReference,
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
import type { VertexShadowModel } from "./vertex.js";
import type { ChatHistoryPort } from "./redis-chat-history.js";
import {
  aggregateMedia,
  aggregateVideoFrames,
  containsCustomerUrl,
  extractAdProductCodes,
  mediaItemFromSearch,
  selectedProductId,
  type MediaAggregation,
  type MediaAnalysisItem,
} from "./media-resolution.js";
import type {
  RealtimeMediaRecognition,
  RealtimeMediaRecognitionService,
} from "./realtime-media-recognition.js";
import { buildRealtimeProductFactsV2 } from "./realtime-product-facts-v2.js";
import type { VideoFrameExtraction } from "./video-frame-extractor.js";
import {
  createRealtimeSalesState,
  evaluateRealtimeSalesCycle,
  type RealtimeSalesCycleTelemetry,
} from "./realtime-sales-cycle.js";
import {
  classifyPreSalePolicyIntent,
  renderPreSalePolicyReply,
} from "./pre-sale-policy.js";

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
  // A bare product code means the customer wants the standard product-info
  // card. That card starts with the verified price, so it is a PRICE lookup.
  if (productCodeOnly(value) !== null) return "PRICE";
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
    "C thích set nào và cho em xin chiều cao, cân nặng hoặc số đo để tư vấn size nha.",
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
    /^(Áo dài|Áo|Đầm|Váy|Set|Combo|Quần|Chân váy)\b/u,
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
  return residual.length >= 2
    ? productTypeLowercase(title)
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
    ? `${sentenceCase(material)} ${materialEffect}.`
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
): AgentProposalV1 | null {
  if (facts.status !== "OK" || facts.facts === null) return null;
  const price = facts.facts.salePriceVnd ?? facts.facts.listPriceVnd;
  if (price === null) return null;
  const displayName = productDisplayName(product);
  const designLine = productDescriptionLine(product);
  const sizeLine = facts.facts.sizes.length > 0
    ? `Size ${facts.facts.sizes.join(", ")}`
    : "Size đang cập nhật";
  const followUp = (profile !== null
    ? profileHasBodyMeasurements(profile)
    : hasBodyProfile(context))
    ? "Chị gửi thêm số đo 3 vòng để em chốt size chuẩn form cho mình nha."
    : "Chị cho em xin chiều cao cân nặng hoặc số đo 3 vòng em tư vấn size cho mình nha.";
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
  return {
    schemaVersion: 1,
    intent: "product_info",
    conversationStage: "PRODUCT_MATCHED",
    productId: product.productId,
    action: "REPLY",
    reply: [
      `Dạ ${displayName} có giá ${shortPrice(price)} ạ`,
      designLine,
      sizeLine,
      followUp,
    ].join("\n"),
    attachments: v2Overview
      ? v2Overview.selection.selected.map(({ url }) => url)
      : selectImages(product, "PRICE_CARD").images.map((image) => image.url),
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

const IMAGE_INTENT_REPLIES: Readonly<Record<CustomerImageIntent, string>> = {
  FEEDBACK: "Dạ em gửi chị ảnh khách đã mặc mẫu này ạ",
  DETAIL: "Dạ em gửi chị ảnh cận chất liệu ạ",
  BACK: "Dạ em gửi chị ảnh mặt sau ạ",
  SIZE_GUIDE: "Dạ em gửi chị bảng size ạ",
  PRODUCT_ONLY: "Dạ em gửi chị ảnh sản phẩm ạ",
  GENERIC: "Dạ em gửi chị thêm ảnh mẫu này ạ",
};

/**
 * Lượt trả lời chỉ để gửi ảnh khách vừa xin.
 *
 * Câu chữ cố định và không nhắc giá/tồn/size, nên guard không phải đối chiếu số
 * liệu nào; phần cần kiểm là URL đính kèm, vốn đã được `resolveFacts` giới hạn
 * đúng bằng tập ảnh này.
 */
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
    reply: `Dạ em đang kiểm tra mẫu ${product.productId} ạ`,
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
    reply: `Dạ em đã tìm thấy mẫu ${productId} ạ. ${detail}`,
    attachments: [],
    handoffReason: null,
  };
}

function safeModelHandoffFallback(
  proposal: AgentProposalV1,
  productId: string | null,
): AgentProposalV1 {
  const reply = productId
    ? `Dạ em đã tìm thấy mẫu ${productId} ạ. Chị muốn xem giá, size, tình trạng hàng hay thời gian giao dự kiến ạ?`
    : "Dạ chị gửi giúp em mã sản phẩm hoặc ảnh mẫu chị đang quan tâm để em kiểm tra chính xác ạ.";
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

function productComponentRole(product: StableProductDocument): ProductComponentRole {
  const value = normalizedVietnamese(`${product.title} ${product.canonicalCode}`);
  if (/\b(?:chan\s*vay|cv)\b/u.test(value)) return "SKIRT";
  if (/\bquan\b/u.test(value)) return "PANTS";
  if (/\b(?:vay|dam|ao\s*dai)\b/u.test(value)) return "DRESS";
  if (/\b(?:ao\s*khoac|jacket)\b/u.test(value)) return "JACKET";
  if (/\bao\b/u.test(value)) return "TOP";
  return "OTHER";
}

function productCategory(product: StableProductDocument): string {
  const value = normalizedVietnamese(product.title);
  if (/\bao\s*dai\b/u.test(value)) return "AO_DAI";
  if (/\bchan\s*vay\b/u.test(value)) return "CHAN_VAY";
  if (/\bquan\b/u.test(value)) return "QUAN";
  if (/\b(?:vay|dam)\b/u.test(value)) return "VAY";
  if (/\bset\b/u.test(value)) return "SET";
  if (/\bao\b/u.test(value)) return "AO";
  return "ALL";
}

interface MultiFactResolution {
  readonly queryId: string;
  readonly rawProductRef: string;
  readonly product: StableProductDocument | null;
  readonly resolution: "RESOLVED" | "AMBIGUOUS" | "NOT_FOUND";
  readonly facts: readonly {
    readonly requestedFact: RequestedBusinessFactV2;
    readonly envelope: BusinessFactEnvelopeV1;
  }[];
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
  return BusinessFactQueriesV2Schema.parse({
    schemaVersion: 2,
    queries: references.slice(0, 3).map((reference, index) => ({
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

function multiFactReply(
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
  lines.push("C chọn mẫu và size muốn lấy để em kiểm tra đúng biến thể nha.");
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
  return `${label} của ${productDisplayName(product)}: ${answer}. C cần em kiểm tra thêm giá hay size nha.`;
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
  const chartArtifacts = Object.values(
    policyResolution?.bundle?.artifacts.sizeCharts ?? {},
  );
  const charts: ScopedSizeChart[] = chartArtifacts.map(({ chart, scope }) => ({
    chart,
    scope: scope ? {
      level: scope.level,
      ...(scope.parentProductIds.length > 0
        ? { parentProductIds: scope.parentProductIds }
        : {}),
      ...(scope.categories.length > 0 ? { categories: scope.categories } : {}),
      ...(scope.componentRole === null ? {} : { componentRole: scope.componentRole }),
      ...(scope.forms.length > 0 ? { forms: scope.forms } : {}),
      ...(scope.materials.length > 0 ? { materials: scope.materials } : {}),
    } : {
      level:
        chart.category.trim().toLocaleUpperCase("vi-VN") === "ALL"
          ? "GLOBAL"
          : chart.componentRole === null
            ? "CATEGORY"
            : "COMPONENT",
      categories: [chart.category],
      ...(chart.componentRole === null
        ? {}
        : { componentRole: chart.componentRole }),
    },
  }));
  const role = productComponentRole(product);
  const decision = recommendSize({
    profile,
    target: {
      brand: "LANA",
      parentProductId: product.productId,
      componentProductId: product.productId,
      componentRole: role,
      category: productCategory(product),
      form: product.silhouettes[0] ?? null,
      material: product.materials[0] ?? null,
    },
    charts,
    generatedAt: now.toISOString(),
    recommendationId: deterministicUuid(
      `lana:size:v1:${product.productId}:${profile.profileId}:${profile.revision}`,
    ),
  });
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
      reply: `Chị cho em xin thêm ${fields} để em chốt size chuẩn form nha.`,
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
  generate: VertexShadowModel["generate"];
  groundWithFacts: VertexShadowModel["groundWithFacts"];
  groundDraftWithFacts?: VertexShadowModel["groundDraftWithFacts"];
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
    };
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
    const byId = new Map(products.map((product) => [product.productId, product]));
    // At most three query tasks are active. Facts inside one product query stay
    // ordered and execute sequentially, preventing a 3x4 fan-out burst.
    return Promise.all(queries.queries.map(async (query) => {
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
        const envelope = await this.factsReader.resolve({
          shopAlias: this.options.shopAlias,
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
    }));
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
    const message: InboundMessageV1 = {
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
    const policyAuditRef = policyResolution?.bundle
      ? runtimePolicyAuditReference(policyResolution.bundle)
      : null;
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
      text: redactAnalyticsMessage(original.text ?? "").text,
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
    const hasCustomerUrl = !message.isEcho && containsCustomerUrl(message.text ?? "");
    const resolution = message.isEcho || hasCustomerUrl ||
        isPostSaleRequest(message.text ?? "") ||
        preSalePolicyIntent !== null
      ? this.emptyResolution()
      : await this.resolveProducts(message, state, claim.pageId);
    let resolvedProduct = resolution.primary;
    let productResolutionOrigin: ProductResolution["origin"] = resolution.origin;
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
    let mediaClarificationHandled = false;
    if (resolution.clarification) {
      const clarification = resolution.clarification;
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
    let handoff = applied.handoff;
    let businessFacts: BusinessFactEnvelopeV1 | null = null;
    let handoffGuardReasonCodes: readonly string[] = [];
    let salesCyclePlan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null = null;
    let salesDesiredTag: "NHAN_VIEN" | "DA_CHOT_DON" | null = null;
    let salesHandoffReasonCode: string | null = null;
    let salesTelemetry: RealtimeSalesCycleTelemetry | null = null;
    let buyingSignalOverride = false;
    let modelCalled = false;
    let modelVersion: string | null = null;
    let modelLatencyMs = 0;
    let modelPromptTokens = 0;
    let modelOutputTokens = 0;
    let modelTotalTokens = 0;
    let hasModelTokenUsage = false;
    let salesHandled = false;
    let guardedPlanHash: string | null = null;
    let multiFactAudit: NonNullable<
      RealtimeDecisionEventPlan["details"]["factQueryResults"]
    > = [];
    const buyingSignal = message.isEcho
      ? { isBuyingSignal: false as const, reasons: [] as const }
      : detectBuyingSignal(message.text ?? "", {
          hasProductContext: Boolean(
            resolvedProduct?.productId ?? nextState.currentProductId,
          ),
        });
    const imageIntent = message.isEcho
      ? null
      : explicitCustomerImageIntent(message.text ?? "");
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
    const imageRequest = imageIntent !== null && resolution.primary !== null
      ? mediaV2
        ? {
            intent: imageIntent,
            images: mediaV2.selection.selected.map(({ url }) => url),
            reasonCode: mediaV2.unavailableReason ?? "OK",
            customerTextUnits: mediaV2.customerTextUnits,
          }
        : (() => {
            const selection = selectImages(resolvedProduct!, imageIntent);
            return {
              intent: imageIntent,
              images: selection.images.map(({ url }) => url),
              reasonCode: selection.reasonCode,
              customerTextUnits: [] as readonly string[],
            };
          })()
      : null;
    const advisoryIntent =
      this.options.catalogAdvisoryEnabled && !message.isEcho
        ? catalogAdvisoryIntent(message.text ?? "")
        : null;
    const multiFactQueries =
      this.options.multiFactQueryEnabled && !message.isEcho
        ? buildBusinessFactQueries(
            message.eventKey,
            message.text ?? "",
            resolution.references,
          )
        : null;
    const shouldUseMultiFacts = multiFactQueries !== null && (
      multiFactQueries.queries.length > 1 ||
      (multiFactQueries.queries[0]?.requestedFacts.length ?? 0) > 1
    );
    if (applied.status === "APPLIED" && applied.authorization.allowEvaluate) {
      if (preSalePolicyIntent !== null) {
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
        resolution.clarification &&
        resolution.clarification.action !== "CLEAR"
      ) {
        mediaClarificationHandled = true;
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
      } else if (resolution.media.requiresHandoff) {
        handoffGuardReasonCodes = [
          "MEDIA_UNCERTAIN_RATIO_EXCEEDED",
          `MEDIA_UNCERTAIN_${resolution.media.uncertainCount}_OF_${resolution.media.totalCount}`,
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
            const sizeProposal = sizeEngineProposal(
              {
                ...proposal,
                businessFactQuery: {
                  ...proposal.businessFactQuery,
                  intent: "SIZE",
                },
              },
              resolutions[0]!.product!,
              customerProfile,
              policyResolution,
              productFactsV2,
              now,
            );
            if (sizeProposal.action === "HANDOFF") {
              handoffGuardReasonCodes = [
                ...new Set([
                  ...handoffGuardReasonCodes,
                  "VERIFIED_SIZE_CHART_UNAVAILABLE",
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
              proposal = sizeProposal;
            } else {
              proposal = {
                ...proposal,
                reply: [reply, sizeProposal.reply].filter(Boolean).join("\n"),
                attachments: sizeProposal.attachments,
              };
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
            handoff === null &&
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
        const reply = multiProductReply(
          resolution.products,
          allFacts,
          policyResolution,
        );
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
          resolution.origin === "SELECTION" || resolution.origin === "TEXT_CODE"
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
        } else if (directProductInfo && resolvedProduct) {
          proposal = productInfoLookupProposal(resolvedProduct);
        } else {
          modelCalled = true;
          const initial = await this.model.generate(
            modelContext,
            this.options.promptVersion,
          );
          modelVersion = initial.modelVersion;
          modelLatencyMs += initial.latencyMs;
          modelPromptTokens += initial.tokenUsage.promptTokenCount ?? 0;
          modelOutputTokens += initial.tokenUsage.candidatesTokenCount ?? 0;
          modelTotalTokens += initial.tokenUsage.totalTokenCount ?? 0;
          hasModelTokenUsage ||= Object.keys(initial.tokenUsage).length > 0;
          proposal = {
            ...initial.proposal,
            productId:
              resolvedProduct?.productId ?? initial.proposal.productId,
          };
          const inferredCurrentProductId = aiContinuationProductId(
            message.text ?? "",
            proposal.productId,
            nextState.currentProductId,
          );
          if (!resolvedProduct && inferredCurrentProductId) {
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
                reply:
                  "Em ghi nhận mình chốt mẫu này, c gửi em size/màu muốn lấy nha.",
                attachments: [],
                handoffReason: null,
              }
            : {
                ...proposal,
                productId: null,
                action: "ASK_PRODUCT_SELECTION",
                reply:
                  "C chốt mẫu nào gửi em mã hoặc ảnh mẫu đó giúp em nha.",
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
          const deterministicProductInfo = imageRequest
            ? proposal
            : directProductInfo && resolvedProduct
              ? verifiedProductInfoProposal(
                  resolvedProduct,
                  facts,
                  modelContext,
                  this.options.customerProfileEnabled ? customerProfile : null,
                  productFactsV2,
                  now,
                )
              : null;
          if (deterministicProductInfo) {
            proposal = deterministicProductInfo;
          } else if (
            facts.status === "OK" &&
            resolvedProduct &&
            this.options.groundedDraftEnabled &&
            this.options.verifiedFactAssemblerEnabled &&
            this.model.groundDraftWithFacts
          ) {
            const factBlocks = buildVerifiedFactBlocks(
              facts,
              proposal.businessFactQuery.intent,
              resolvedProduct,
            );
            try {
              modelCalled = true;
              const grounded = await this.model.groundDraftWithFacts(
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
              modelTotalTokens += grounded.tokenUsage.totalTokenCount ?? 0;
              hasModelTokenUsage ||= Object.keys(grounded.tokenUsage).length > 0;
              const assembled = assembleReply(
                factBlocks,
                grounded.draft,
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
                attachments: [...assembled.imageUrls],
              };
            } catch (error) {
              if (!(error instanceof Error) || error.message !== "GROUNDED_SCHEMA_INVALID") {
                throw error;
              }
              handoffGuardReasonCodes = [
                ...new Set([...handoffGuardReasonCodes, "GROUNDED_SCHEMA_INVALID"]),
              ];
              const assembled = assembleReply(
                factBlocks,
                {
                  schemaVersion: 1,
                  advisoryText: "",
                  objectionResponse: "",
                  suggestedQuestion: "",
                  suggestedNextStep: "",
                  attachmentImageIndices: [],
                },
                facts,
                resolvedProduct,
              );
              proposal = {
                ...proposal,
                reply: assembled.text || proposal.reply,
                attachments: [],
              };
            }
          } else {
            modelCalled = true;
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
            modelTotalTokens += grounded.tokenUsage.totalTokenCount ?? 0;
            hasModelTokenUsage ||= Object.keys(grounded.tokenUsage).length > 0;
            proposal = {
              ...grounded.proposal,
              salesSignals: proposal.salesSignals ?? grounded.proposal.salesSignals,
            };
          }
        }
        if (
          this.options.customerProfileEnabled &&
          customerProfile &&
          resolvedProduct &&
          proposal.businessFactQuery.intent === "SIZE"
        ) {
          proposal = sizeEngineProposal(
            proposal,
            resolvedProduct,
            customerProfile,
            policyResolution,
            productFactsV2,
            now,
          );
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
        const verifiedProductIds = new Set<string>();
        if (resolvedProduct) verifiedProductIds.add(resolvedProduct.productId);
        if (facts?.status === "OK") verifiedProductIds.add(facts.productId);
        let guarded = guardAgentProposal({
          proposal,
          facts,
          verifiedProductIds,
          buyingSignal: buyingSignal.isBuyingSignal,
          now,
        });
        guardedPlanHash = createHash("sha256").update(JSON.stringify({
          action: guarded.action,
          productId: guarded.productId,
          handoffReason: guarded.handoffReason,
          blockedReasonCodes: guarded.blockedReasonCodes,
          textUnitHashes: guarded.textUnits.map((text) =>
            createHash("sha256").update(text).digest("hex")
          ),
          imageCount: guarded.imageUrls.length,
        })).digest("hex");
        handoffGuardReasonCodes = [
          ...new Set([
            ...handoffGuardReasonCodes,
            ...guarded.blockedReasonCodes,
          ]),
        ];
        if (
          guarded.action === "HANDOFF" &&
          !modelHandoffPermitted(message.text ?? "", facts)
        ) {
          proposal = safeModelHandoffFallback(
            proposal,
            continuationProductId(
              resolvedProduct?.productId ?? null,
              proposal.productId,
              nextState.currentProductId,
            ),
          );
          guarded = guardAgentProposal({
            proposal,
            facts: null,
            verifiedProductIds,
            buyingSignal: buyingSignal.isBuyingSignal,
            now,
          });
          guardedPlanHash = createHash("sha256").update(JSON.stringify({
            action: guarded.action,
            productId: guarded.productId,
            handoffReason: guarded.handoffReason,
            blockedReasonCodes: guarded.blockedReasonCodes,
            textUnitHashes: guarded.textUnits.map((text) =>
              createHash("sha256").update(text).digest("hex")
            ),
            imageCount: guarded.imageUrls.length,
          })).digest("hex");
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
            this.handoffReason(proposal, guarded.blockedReasonCodes),
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
          ];
        }
      }
    }

    if (
      salesCycleRecord &&
      !message.isEcho &&
      preSalePolicyIntent === null &&
      !mediaClarificationHandled &&
      handoff === null
    ) {
      const sales = await evaluateRealtimeSalesCycle({
        pageId: claim.pageId,
        conversationId: record.conversationId,
        customerHash: claim.conversationHash,
        state: salesCycleRecord.state,
        stateRevision: salesCycleRecord.stateRevision,
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
          businessFacts?.productId ??
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
        salesSignals: proposal?.salesSignals ?? null,
        shopAlias: this.options.shopAlias,
        policyResolution,
        facts: this.factsReader,
        now,
      });
      salesCyclePlan = sales.plan;
      salesHandled = sales.handled;
      salesTelemetry = sales.telemetry ?? null;
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
          guardOutcome:
            guardedPlanHash === null
              ? "NOT_APPLICABLE"
              : handoffGuardReasonCodes.length > 0 || handoff !== null
                ? "BLOCKED"
                : "ALLOWED",
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
          modelTokenUsage: {
            prompt: hasModelTokenUsage ? modelPromptTokens : null,
            output: hasModelTokenUsage ? modelOutputTokens : null,
            total: hasModelTokenUsage ? modelTotalTokens : null,
          },
          buyingSignalOverride,
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
        },
      });
    };
    if (resolvedProduct) {
      pushDecisionEvent("PRODUCT_RESOLVED");
      pushDecisionEvent("PRODUCT_MATCHED");
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
              },
            }
          : {}),
        ...(desiredTag && tagId
          ? {
              pancakeTagPlan: {
                desiredTag,
                tagId,
                handoffGeneration: nextState.revision,
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
        ...(this.options.decisionTelemetryEnabled && decisionEvents.length > 0
          ? { decisionEvents }
          : {}),
        ...(inboxBatchGuard ? { inboxBatchGuard } : {}),
      },
      now,
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

  private async exactProduct(value: string): Promise<StableProductDocument | null> {
    const result = await this.productSearch.searchText(value);
    return result.status === "MATCHED" &&
        (result.matchKind === "EXACT_CODE" || result.matchKind === "ALIAS")
      ? result.product
      : null;
  }

  private async searchImages(
    urls: readonly string[],
  ): Promise<readonly MediaProductSearchResult[]> {
    if (this.productSearch.searchImages) {
      return this.productSearch.searchImages(urls, 3);
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
      const selectedByLabel = selectedProductId(text, activeClarification.candidates);
      const code = productCodeOnly(text);
      const selectedByCode = code
        ? activeClarification.candidates.find((candidate) =>
            normalizeProductCode(candidate.productId) === code
          )?.productId ?? null
        : null;
      const selected = selectedByLabel ?? selectedByCode;
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
    ])].slice(0, 3);
    if (this.options.multiFactQueryEnabled && textCodes.length > 1) {
      const references = await Promise.all(textCodes.map(async (code) => {
        const product = await this.exactProduct(code);
        return {
          raw: code,
          product,
          resolution: product === null ? "NOT_FOUND" as const : "RESOLVED" as const,
        };
      }));
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
      const results = useRecognition
        ? await Promise.all(imageAttachments.map((item) =>
            this.mediaRecognition!.recognize(item.attachment.url)
          ))
        : await this.searchImages(
            imageAttachments.map((item) => item.attachment.url),
          );
      imageAttachments.forEach((item, index) => {
        const result = results[index] ?? {
          status: "ERROR" as const,
          reasonCode: "IMAGE_SEARCH_RESULT_MISSING",
        };
        if (useRecognition) {
          const recognition = result as RealtimeMediaRecognition;
          if (recognition.status === "MATCHED") {
            mediaItems.push(mediaItemFromSearch(
              item.ordinal,
              "IMAGE",
              {
                status: "MATCHED",
                matchKind: "SEMANTIC",
                product: recognition.product,
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
          mediaItems.push(mediaItemFromSearch(
            item.ordinal,
            "IMAGE",
            result as MediaProductSearchResult,
          ));
        }
      });
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
        : containsCustomerUrl(message.text ?? "")
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
