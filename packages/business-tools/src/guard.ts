import {
  AgentProposalV1Schema,
  BusinessFactEnvelopeV1Schema,
  GuardedReplyPlanV1Schema,
  SizeRecommendationProtectedClaimV1Schema,
  type AgentProposalV1,
  type GuardedProtectedClaimTypeV1,
  type GuardedProtectedClaimValidationV1,
  type ProductFactsV1,
  type SizeRecommendationProtectedClaimV1,
} from "@lana/contracts";
import type { GuardInput, GuardResult } from "./types.js";
import { foldVietnameseForRecall } from "./vietnamese-text.js";

const RAW_URL_PATTERN = /https?:\/\/\S+/iu;
const PRICE_PATTERN = /(?:\d[\d.,]*)\s*(?:k\b|nghìn\b|vnd\b|triệu\b|đ|₫)/giu;
const PRICE_CLAIM_PATTERN = /\b(?:giá|price)\D{0,16}\d[\d.,]*/iu;
const STOCK_PATTERN = /\b(?:còn\s+hàng|còn\s+(?:size|sz)|hết\s+hàng|hết\s+(?:size|sz)|sẵn\s+hàng|pre[- ]?order|đặt\s+trước|sắp\s+về|còn\s+(?:áo|quần|chân\s+váy|set|mẫu))\b/iu;
const ETA_PATTERN = /\b\d+\s*(?:-|–|đến)?\s*\d*\s*(?:ngày|day)\b/iu;
// Avoid JavaScript `\b` around Vietnamese words ending in a non-ASCII letter
// (for example "giá"), because `\b` is based on ASCII word characters.
const PROMOTION_PATTERN = /(?:khuyến\s*mãi|ưu\s*đãi|giảm\s*giá|giảm\s+\d|voucher|mã\s+giảm)/iu;
const FREESHIP_PATTERN = /\b(?:freeship|free\s*ship|miễn\s+phí\s+(?:giao|ship))\b/iu;
const SHIP_FEE_PATTERN = /(?:phí\s*(?:ship|giao)|ship)\D{0,12}(?:\d[\d.,]*)\s*(?:k\b|nghìn\b|vnd\b|đ|₫)/iu;
const ETA_VALUES_PATTERN = /\b(\d+)\s*(?:(?:-|–|đến)\s*(\d+))?\s*(?:ngày|day)\b/giu;
const RECIPIENT_NAME_PATTERN = String.raw`tên(?!\s+(?:mẫu|sản\s*phẩm|sp)\b)`;
const ORDER_INFO_REQUEST_PATTERN = new RegExp(
  String.raw`(?:xin|gửi|cho\s+(?:em|shop))[^.!?\n]{0,36}(?:${RECIPIENT_NAME_PATTERN}|họ\s*tên|số\s*điện\s*thoại|sđt|địa\s*chỉ)|(?:${RECIPIENT_NAME_PATTERN}|sđt|địa\s*chỉ)[^.!?\n]{0,24}(?:nhận\s*hàng|đặt\s*hàng)`,
  "iu",
);
const SIZE_VALUES = new Set([
  "xxxs",
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  ...Array.from({ length: 17 }, (_, i) => String(i + 34)),
]);
const SIZE_RANGE_SEPARATORS = new Set([
  "-",
  "\u2013",
  "\u2014",
  "/",
  "den",
  "to",
]);
const PROTECTED_CLAIM_TYPE_ORDER = [
  "PRICE",
  "STOCK",
  "SIZE_FIT",
  "ETA",
  "SHIPPING_FEE",
  "FREESHIP",
  "PROMOTION_OFFER",
  "PRODUCT_MEDIA",
] as const satisfies readonly GuardedProtectedClaimTypeV1[];
type SizeToken = {
  readonly text: string;
  readonly start: number;
  readonly end: number;
};
type SizeMention = {
  readonly start: number;
  readonly end: number;
  readonly sizes: readonly string[];
};
type SizeMentionScope = {
  readonly localStart: number;
  readonly localEnd: number;
  readonly sentenceStart: number;
  readonly sentenceEnd: number;
};
function normalizedVietnameseForGuard(value: string): string {
  return foldVietnameseForRecall(value);
}
function tokenizeSizeText(value: string): readonly SizeToken[] {
  return [...value.matchAll(/[a-z0-9]+|[(),;.!?/:=\u2013\u2014-]|\n/gu)].map(
    (match) => ({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    }),
  );
}
function hasExplicitNumericSizeHint(
  tokens: readonly SizeToken[],
  index: number,
): boolean {
  return /^(?:size|sz|co)$/u.test(tokens[index - 1]?.text ?? "");
}
function discoverSizeMentions(
  tokens: readonly SizeToken[],
): readonly SizeMention[] {
  const result: SizeMention[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const first = tokens[i];
    if (!first || !SIZE_VALUES.has(first.text)) continue;
    if (/^\d+$/u.test(first.text) && !hasExplicitNumericSizeHint(tokens, i)) {
      continue;
    }
    const sizes = [first.text];
    let end = i;
    while (end + 2 < tokens.length) {
      const separator = tokens[end + 1];
      if (!separator || !SIZE_RANGE_SEPARATORS.has(separator.text)) break;
      let valueIndex = end + 2;
      if (tokens[valueIndex]?.text === "den") valueIndex += 1;
      const valueToken = tokens[valueIndex];
      if (!valueToken || !SIZE_VALUES.has(valueToken.text)) break;
      sizes.push(valueToken.text);
      end = valueIndex;
    }
    const last = tokens[end];
    if (!last) continue;
    result.push({ start: first.start, end: last.end, sizes });
    i = end;
  }
  return result;
}
function hasLocalBoundary(value: string): boolean {
  return /[,/;.!?\n\u2013\u2014-]/u.test(value);
}
function punctuationScope(
  value: string,
  start: number,
  end: number,
): { start: number; end: number } {
  const before = Math.max(
    ...[",", ";", ".", "!", "?", "/", "-", "\u2013", "\u2014", "\n"].map((mark) =>
      value.lastIndexOf(mark, start - 1),
    ),
  );
  const after = value.slice(end).search(/[,/;.!?\n\u2013\u2014-]/u);
  return {
    start: before + 1,
    end: after === -1 ? value.length : end + after + 1,
  };
}
function sentenceScope(
  value: string,
  start: number,
  end: number,
): { start: number; end: number } {
  const before = Math.max(
    ...[";", ".", "!", "?", "\n"].map((mark) =>
      value.lastIndexOf(mark, start - 1),
    ),
  );
  const after = value.slice(end).search(/[;.!?\n]/u);
  return {
    start: before + 1,
    end: after === -1 ? value.length : end + after + 1,
  };
}
function wordBoundaryStart(value: string, index: number): number {
  let cursor = index;
  while (cursor > 0 && /[a-z0-9]/u.test(value[cursor - 1] ?? "")) cursor -= 1;
  return cursor;
}
function wordBoundaryEnd(value: string, index: number): number {
  let cursor = index;
  while (cursor < value.length && /[a-z0-9]/u.test(value[cursor] ?? "")) cursor += 1;
  return cursor;
}
function scopeForSizeMention(
  value: string,
  mentions: readonly SizeMention[],
  index: number,
): SizeMentionScope {
  const mention = mentions[index];
  if (!mention) {
    return {
      localStart: 0,
      localEnd: value.length,
      sentenceStart: 0,
      sentenceEnd: value.length,
    };
  }
  const punctuation = punctuationScope(value, mention.start, mention.end);
  const sentence = sentenceScope(value, mention.start, mention.end);
  const previous = mentions[index - 1];
  const next = mentions[index + 1];
  const localStart =
    previous && !hasLocalBoundary(value.slice(previous.end, mention.start))
      ? Math.max(
          punctuation.start,
          wordBoundaryStart(value, Math.floor((previous.end + mention.start) / 2)),
        )
      : punctuation.start;
  const localEnd =
    next && !hasLocalBoundary(value.slice(mention.end, next.start))
      ? Math.min(
          punctuation.end,
          wordBoundaryEnd(value, Math.ceil((mention.end + next.start) / 2)),
        )
      : punctuation.end;
  return {
    localStart,
    localEnd,
    sentenceStart: sentence.start,
    sentenceEnd: sentence.end,
  };
}
function mentionsInScope(
  mentions: readonly SizeMention[],
  start: number,
  end: number,
): number {
  return mentions
    .filter((mention) => mention.start >= start && mention.end <= end)
    .reduce((count, mention) => count + mention.sizes.length, 0);
}
function hasCustomerSizeContext(value: string): boolean {
  return /\b(?:chi|em|ban|khach|so\s*do|dang\s+(?:chi|em|nguoi|nay)|cho\s+(?:chi|em|ban|khach))\b/u.test(
    value,
  );
}
function isPureSizeQuestion(
  local: string,
  beforeMention: string,
  afterMention: string,
  sentence: string,
  sentenceMentionCount: number,
): boolean {
  const tagQuestion =
    /\b(?:dung|phai)\s+(?:khong|ko|hong)\s*\?*\s*$/u.test(
      afterMention,
    );
  if (tagQuestion) return false;
  const selectionQuestion =
    sentenceMentionCount >= 2 &&
    /\b(?:hay|hoac)\b/u.test(sentence) &&
    (sentence.includes("?") ||
      /\b(?:theo\s+(?:chi|em|ban)|muon|chon)\b/u.test(sentence));
  if (selectionQuestion) return true;
  if (
    /\bco\b[^.!?\n]{0,60}$/u.test(beforeMention) &&
    /\b(?:khong|ko|hong)\b/u.test(afterMention)
  ) {
    return true;
  }
  if (
    /\bco\b/u.test(afterMention) &&
    /\b(?:khong|ko|hong)\b/u.test(afterMention)
  ) {
    return true;
  }
  if (/(?:\b(?:khong|ko|hong|ha)\s*\?*|\ba\s*\?)\s*$/u.test(afterMention)) {
    return true;
  }
  return (
    local.includes("?") &&
    /\b(?:hop|vua|phu\s+hop|chon|lay|mac|size|co)\b/u.test(local)
  );
}
function isExplicitlyNegatedOrUncertain(
  beforeMention: string,
  afterMention: string,
): boolean {
  const before = beforeMention.slice(-80);
  const after = afterMention.slice(0, 80);
  if (/\bkhong\s+chi\b/u.test(before)) return false;
  if (/^\s*\b(?:khong|chua|chang)\b/u.test(after)) return true;

  const explicitUncertainty =
    /\b(?:khong\s+(?:phai|nghi)|chua\s+chac|(?:khong|chua)\s+the)\b/u;
  if (explicitUncertainty.test(before)) return true;

  const matches = [...before.matchAll(/\b(?:khong|chua|chang)\b/gu)];
  const lastNegation = matches.at(-1);
  if (!lastNegation) return false;

  const afterNegation = before.slice(lastNegation.index + lastNegation[0].length);
  const hasNewAffirmativeBinding =
    /\b(?:so\s+do|tuong\s+ung|thuoc|roi\s+vao|xep|nen\s+chon|de\s+xuat|chi\s+hop|se\s+vua|phu\s+hop\s+nhat)\b/u.test(
      afterNegation,
    );
  return !hasNewAffirmativeBinding;
}
function hasUninterruptedPrecedingNegation(
  value: string,
  mentions: readonly SizeMention[],
  mention: SizeMention,
  sentenceStart: number,
): boolean {
  const lastLocalBoundary = Math.max(
    ...[",", ";", ".", "!", "?", "/", "-", "\u2013", "\u2014", "\n"].map(
      (mark) => value.lastIndexOf(mark, mention.start - 1),
    ),
  );
  const searchStart = Math.max(
    sentenceStart,
    mention.start - 96,
    lastLocalBoundary + 1,
  );
  const prefix = value.slice(searchStart, mention.start);
  const matches = [...prefix.matchAll(/\b(?:khong|chua|chang)\b/gu)];
  const last = matches.at(-1);
  if (!last) return false;
  const negationStart = searchStart + last.index;
  if (
    mentions.some(
      (other) =>
        other.start > negationStart &&
        other.end <= mention.start &&
        other.start !== mention.start,
    )
  ) {
    return false;
  }
  const afterNegation = value.slice(negationStart, mention.start);
  return !/\b(?:so\s+do|tuong\s+ung|thuoc|roi\s+vao|xep|nen\s+chon|de\s+xuat|chi\s+hop|se\s+vua|phu\s+hop\s+nhat)\b/u.test(
    afterNegation,
  );
}
function isPureCatalogMention(
  local: string,
  beforeMention: string,
  afterMention: string,
  sentence: string,
  mention: SizeMention,
): boolean {
  const listCueBefore =
    /\bsize\b[^.!?\n]{0,24}(?:[:=]|\bdang\s+co\b|\bco\b|\bphu\s+hop\s*:)\s*$/u.test(
      beforeMention,
    );
  if (
    listCueBefore &&
    (mention.sizes.length >= 2 || /[:=]\s*$/u.test(beforeMention))
  ) return true;
  const explicitCatalogSpan =
    /\b(?:catalog|danh\s+sach|bang\s+size|ma\s+size|size\s+code)\b/u.test(
      local,
    ) ||
    (/\bsize\b[^.!?\n]{0,16}$/u.test(beforeMention) &&
      /^\s*\b(?:hop\s+le|code)\b/u.test(afterMention));
  if (explicitCatalogSpan && !hasCustomerSizeContext(local)) return true;
  const sentenceCatalogCue =
    /\b(?:catalog|danh\s+sach|bang\s+size|ma\s+size|size\s+code)\b/u.test(
      sentence,
    ) ||
    /\bsize\b[^.!?\n]{0,24}(?:[:=]|\bdang\s+co\b)/u.test(sentence);
  return !hasCustomerSizeContext(sentence) && sentenceCatalogCue;
}
function isTemporalStockMention(
  beforeMention: string,
  afterMention: string,
): boolean {
  return (
    /\b(?:con|het)\s+(?:size|sz)\s*$/u.test(beforeMention) ||
    (/\b(?:size|sz)\s*$/u.test(beforeMention) &&
      /^\s*\b(?:con|het|san)\s+hang\b/u.test(afterMention)) ||
    (/\b(?:mau|hang|san\s+pham)\b[^.!?\n]{0,24}\b(?:size|sz)\s*$/u.test(
      beforeMention,
    ) &&
      /^\s*\b(?:vua\s+(?:moi\s+)?ve|moi\s+ve|sap\s+ve)\b/u.test(
        afterMention,
      ))
  );
}
function isExplicitNonCustomerFact(
  value: string,
  mentions: readonly SizeMention[],
  mention: SizeMention,
  scope: SizeMentionScope,
): boolean {
  const previous = mentions
    .filter((other) => other.end <= mention.start)
    .at(-1);
  const before = value.slice(
    Math.max(scope.sentenceStart, previous?.end ?? mention.start - 64),
    mention.start,
  );
  const after = value.slice(mention.end, scope.localEnd);
  const subject = String.raw`(?:nguoi\s+mau|mannequin|san\s+pham|mau(?:\s+(?:[a-z0-9]+|nay|do))?)`;
  const beforeMatch = before.match(
    new RegExp(`\\b${subject}\\b[^.!?\\n]{0,40}(?:size|sz)?\\s*$`, "u"),
  );
  if (beforeMatch && !hasCustomerSizeContext(beforeMatch[0])) return true;
  const afterMatch = after.match(
    new RegExp(`^\\s*(?:(?:phu\\s+hop|tuong\\s+thich)\\s+voi|cua|tren)\\s+\\b${subject}\\b`, "u"),
  );
  return afterMatch !== null && !hasCustomerSizeContext(afterMatch[0]);
}
function classifySafeExemptionForMention(
  value: string,
  mentions: readonly SizeMention[],
  mention: SizeMention,
  scope: SizeMentionScope,
): "QUESTION" | "NEGATION" | "CATALOG" | "STOCK" | "NON_CUSTOMER" | null {
  const local = value.slice(scope.localStart, scope.localEnd);
  const sentence = value.slice(scope.sentenceStart, scope.sentenceEnd);
  const mentionStart = mention.start - scope.localStart;
  const mentionEnd = mention.end - scope.localStart;
  const beforeMention = local.slice(0, Math.max(0, mentionStart));
  const afterMention = local.slice(Math.max(0, mentionEnd));
  const sentenceMentionCount = mentionsInScope(
    mentions,
    scope.sentenceStart,
    scope.sentenceEnd,
  );
  if (
    isPureSizeQuestion(
      local,
      beforeMention,
      afterMention,
      sentence,
      sentenceMentionCount,
    )
  ) {
    return "QUESTION";
  }
  if (
    isExplicitlyNegatedOrUncertain(beforeMention, afterMention) ||
    hasUninterruptedPrecedingNegation(
      value,
      mentions,
      mention,
      scope.sentenceStart,
    )
  ) {
    return "NEGATION";
  }
  if (
    isPureCatalogMention(
      local,
      beforeMention,
      afterMention,
      sentence,
      mention,
    )
  ) {
    return "CATALOG";
  }
  if (isTemporalStockMention(beforeMention, afterMention)) return "STOCK";
  if (isExplicitNonCustomerFact(
      value,
      mentions,
      mention,
      scope,
    )) {
    return "NON_CUSTOMER";
  }
  return null;
}
/** Defense in depth only; typed Size Engine provenance remains authoritative. */
export function detectConcreteSizeRecommendations(
  text: string,
): readonly string[] {
  const value = normalizedVietnameseForGuard(text);
  const tokens = tokenizeSizeText(value);
  const mentions = discoverSizeMentions(tokens);
  const result = new Set<string>();
  mentions.forEach((mention, index) => {
    const scope = scopeForSizeMention(value, mentions, index);
    if (
      classifySafeExemptionForMention(value, mentions, mention, scope) !== null
    ) {
      return;
    }
    for (const size of mention.sizes) {
      result.add(size.toLocaleUpperCase("vi-VN"));
    }
  });
  return [...result].sort();
}
function sizeClaimReason(
  claim: SizeRecommendationProtectedClaimV1,
  input: GuardInput,
): string | null {
  const context = input.sizeClaimContext;
  if (!context) return "SIZE_RECOMMENDATION_MISSING_PROVENANCE";
  if (claim.source !== "VERIFIED_SIZE_ENGINE_V1" || !claim.evidenceRef) {
    return "SIZE_RECOMMENDATION_SOURCE_INVALID";
  }
  const parsedClaim = SizeRecommendationProtectedClaimV1Schema.safeParse(claim);
  if (!parsedClaim.success) return "SIZE_RECOMMENDATION_EVIDENCE_BASIS_INVALID";
  if (
    context.activeProductId === null ||
    claim.productId !== context.activeProductId
  ) return "SIZE_RECOMMENDATION_PRODUCT_SCOPE_MISMATCH";
  if (claim.variantId !== context.activeVariantId) {
    return "SIZE_RECOMMENDATION_VARIANT_SCOPE_MISMATCH";
  }
  if (
    context.customerProfileId === null ||
    context.customerProfileRevision === null ||
    claim.customerProfileId !== context.customerProfileId ||
    claim.customerProfileRevision !== context.customerProfileRevision
  ) return "SIZE_RECOMMENDATION_MEASUREMENT_SCOPE_MISMATCH";
  const observedAt = Date.parse(claim.observedAt);
  const expiresAt = Date.parse(claim.expiresAt);
  if (
    !Number.isFinite(observedAt) ||
    !Number.isFinite(expiresAt) ||
    observedAt > input.now.getTime() ||
    expiresAt <= input.now.getTime()
  ) return "SIZE_RECOMMENDATION_STALE";
  return null;
}

function validateSizeRecommendations(
  proposal: AgentProposalV1,
  input: GuardInput,
  assertedSizes: readonly string[],
): readonly string[] {
  if (assertedSizes.length === 0) return [];
  const context = input.sizeClaimContext;
  const declared = new Set(proposal.protectedClaimIds ?? []);
  const claims = context?.claims ?? [];
  const declaredClaims = claims.filter((claim) => declared.has(claim.id));
  if (declaredClaims.length === 0) return [
    declared.size === 0
      ? "SIZE_RECOMMENDATION_UNDECLARED"
      : "SIZE_RECOMMENDATION_MISSING_PROVENANCE",
  ];
  const reasons = new Set<string>();
  for (const size of assertedSizes) {
    const eligible = declaredClaims.some((claim) => {
      const reason = sizeClaimReason(claim, input);
      if (reason !== null) {
        reasons.add(reason);
        return false;
      }
      const allowed = new Set([
        ...claim.value.recommendedSizes,
        ...claim.value.alternativeSizes,
      ].map((value) => value.toLocaleUpperCase("vi-VN")));
      if (!allowed.has(size)) {
        reasons.add("SIZE_RECOMMENDATION_VALUE_MISMATCH");
        return false;
      }
      return true;
    });
    if (!eligible && reasons.size === 0) {
      reasons.add("SIZE_RECOMMENDATION_MISSING_PROVENANCE");
    }
  }
  return [...reasons].sort();
}

function parseMoney(text: string): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(PRICE_PATTERN)) {
    const raw = match[1] ?? match[0];
    const normalized = raw.toLowerCase().replace(/[^\d.,]/g, "");
    const suffix = match[0].toLowerCase();
    const isScaled = suffix.includes("triệu") || /(?:k|nghìn)/u.test(suffix);
    const numeric = Number(isScaled ? normalized.replace(",", ".") : normalized.replace(/[.,]/g, ""));
    if (!Number.isFinite(numeric)) continue;
    values.push(suffix.includes("triệu") ? numeric * 1_000_000 : /(?:k|nghìn)/u.test(suffix) ? numeric * 1_000 : numeric);
  }
  return values;
}

function factIsUsable(input: GuardInput, proposal: AgentProposalV1): ProductFactsV1 | null {
  const parsed = BusinessFactEnvelopeV1Schema.safeParse(input.facts);
  if (!parsed.success || parsed.data.status !== "OK" || parsed.data.facts === null) return null;
  if (parsed.data.expiresAt === null || Date.parse(parsed.data.expiresAt) <= input.now.getTime()) return null;
  if (proposal.productId === null || parsed.data.productId !== proposal.productId) return null;
  return parsed.data.facts;
}

function normalizedContains(text: string, allowedPhrase: string): boolean {
  return text.toLocaleLowerCase("vi").includes(allowedPhrase.toLocaleLowerCase("vi"));
}

function protectedClaimValidation(
  observed: ReadonlySet<GuardedProtectedClaimTypeV1>,
  rejected: ReadonlySet<GuardedProtectedClaimTypeV1>,
): GuardedProtectedClaimValidationV1 {
  const claimTypes = PROTECTED_CLAIM_TYPE_ORDER.filter((claimType) =>
    observed.has(claimType)
  );
  const rejectedCount = claimTypes.filter((claimType) =>
    rejected.has(claimType)
  ).length;
  const validatedCount = claimTypes.length - rejectedCount;
  const outcome = claimTypes.length === 0
    ? "NO_PROTECTED_CLAIMS"
    : rejectedCount === 0
      ? "VALIDATED"
      : validatedCount === 0
        ? "BLOCKED"
        : "PARTIALLY_BLOCKED";
  return { outcome, claimTypes, validatedCount, rejectedCount };
}

export function guardAgentProposal(input: GuardInput): GuardResult {
  const proposalResult = AgentProposalV1Schema.safeParse(input.proposal);
  if (!proposalResult.success) {
    return GuardedReplyPlanV1Schema.parse({
      schemaVersion: 1,
      action: "HANDOFF",
      textUnits: [],
      imageUrls: [],
      productId: null,
      handoffReason: "INVALID_AGENT_PROPOSAL",
      blockedReasonCodes: ["INVALID_AGENT_PROPOSAL"],
      protectedClaimValidation: protectedClaimValidation(new Set(), new Set()),
      sendAuthorized: false,
    });
  }

  const proposal = proposalResult.data;
  const text = proposal.reply;
  const shippingClaim = text.match(SHIP_FEE_PATTERN)?.[0] ?? "";
  const textWithoutShippingFee = shippingClaim.length === 0 ? text : text.replace(shippingClaim, "");
  const blocked = new Set<string>();
  const observedProtectedClaims = new Set<GuardedProtectedClaimTypeV1>();
  const rejectedProtectedClaims = new Set<GuardedProtectedClaimTypeV1>();
  const productVerified = proposal.productId === null || input.verifiedProductIds.has(proposal.productId);
  const facts = factIsUsable(input, proposal);
  const verifiedAttachmentUrls = input.verifiedAttachmentUrls ?? (
    facts === null ? null : new Set(facts.imageUrls)
  );

  if (input.buyingSignal && proposal.action === "NO_REPLY") {
    blocked.add("NO_REPLY_OVERRIDE_BUYING_SIGNAL");
  }
  if (!input.buyingSignal && ORDER_INFO_REQUEST_PATTERN.test(text)) {
    blocked.add("PREMATURE_ORDER_INFO_REQUEST");
  }

  if (!productVerified) blocked.add("UNVERIFIED_PRODUCT");
  if (RAW_URL_PATTERN.test(text)) blocked.add("RAW_URL_IN_TEXT");
  const hasUnverifiedAttachment = proposal.attachments.some((url) =>
    verifiedAttachmentUrls === null || !verifiedAttachmentUrls.has(url)
  );
  if (proposal.attachments.length > 0) {
    observedProtectedClaims.add("PRODUCT_MEDIA");
  }
  if (hasUnverifiedAttachment) {
    blocked.add("UNVERIFIED_ATTACHMENT");
    rejectedProtectedClaims.add("PRODUCT_MEDIA");
  }

  const prices = parseMoney(textWithoutShippingFee);
  const hasPriceClaim =
    prices.length > 0 || PRICE_CLAIM_PATTERN.test(textWithoutShippingFee);
  if (hasPriceClaim) {
    observedProtectedClaims.add("PRICE");
    const allowed = new Set([facts?.listPriceVnd, facts?.salePriceVnd].filter((value): value is number => value !== null && value !== undefined));
    if (facts === null || prices.length === 0 || prices.some((price) => !allowed.has(price))) {
      blocked.add("UNAUTHORIZED_PRICE");
      rejectedProtectedClaims.add("PRICE");
    }
  }
  const hasStockClaim = STOCK_PATTERN.test(text);
  if (hasStockClaim) {
    observedProtectedClaims.add("STOCK");
    const normalizedText = text.toLocaleLowerCase("vi");
    const saysAvailable = /\b(?:còn\s+hàng|sẵn\s+hàng)\b/iu.test(normalizedText);
    const saysUnavailable = /\bhết\s+hàng\b/iu.test(normalizedText);
    const saysPreorder = /\b(?:pre[- ]?order|đặt\s+trước)\b/iu.test(normalizedText);
    const saysComingSoon = /\bsắp\s+về\b/iu.test(normalizedText);
    const availableSize = normalizedText.match(/\bcòn\s+(?:size|sz)\s*(s|m|l|xl)\b/iu)?.[1]?.toUpperCase();
    const unavailableSize = normalizedText.match(/\bhết\s+(?:size|sz)\s*(s|m|l|xl)\b/iu)?.[1]?.toUpperCase();
    const componentSpecific = /\bcòn\s+(?:áo|quần|chân\s+váy|set|mẫu)\b/iu.test(normalizedText);
    const consistent =
      facts !== null &&
      (!saysAvailable || facts.stockStatus === "IN_STOCK" || facts.stockStatus === "LOW_STOCK") &&
      (!saysUnavailable || facts.stockStatus === "OUT_OF_STOCK") &&
      (!saysPreorder || facts.stockStatus === "PRE_ORDER") &&
      (!saysComingSoon || facts.stockStatus === "COMING_SOON") &&
      (availableSize === undefined || facts.sizes.includes(availableSize)) &&
      (unavailableSize === undefined || !facts.sizes.includes(unavailableSize)) &&
      !componentSpecific;
    if (!consistent) {
      blocked.add("UNAUTHORIZED_STOCK");
      rejectedProtectedClaims.add("STOCK");
    }
  }
  const hasEtaClaim = ETA_PATTERN.test(text);
  if (hasEtaClaim) {
    observedProtectedClaims.add("ETA");
    const eta = facts?.deliveryEta;
    if (eta === null || eta === undefined) {
      blocked.add("UNAUTHORIZED_ETA");
      rejectedProtectedClaims.add("ETA");
    }
    else {
      const mentioned = [...text.matchAll(ETA_VALUES_PATTERN)].flatMap((match) =>
        [match[1], match[2]].filter((value): value is string => value !== undefined).map(Number),
      );
      if (mentioned.length === 0 || mentioned.some((days) => days < eta.minDays || days > eta.maxDays)) {
        blocked.add("UNAUTHORIZED_ETA");
        rejectedProtectedClaims.add("ETA");
      }
    }
  }

  const hasPromotionClaim = PROMOTION_PATTERN.test(text);
  if (hasPromotionClaim) {
    observedProtectedClaims.add("PROMOTION_OFFER");
    const authorization = input.promotion;
    if (
      authorization === undefined ||
      proposal.productId !== authorization.productId ||
      Date.parse(authorization.expiresAt) <= input.now.getTime() ||
      !authorization.allowedPhrases.some((phrase) => normalizedContains(text, phrase))
    ) {
      blocked.add("UNAUTHORIZED_PROMOTION");
      rejectedProtectedClaims.add("PROMOTION_OFFER");
    }
  }
  const hasFreeshipClaim = FREESHIP_PATTERN.test(text);
  if (hasFreeshipClaim) {
    observedProtectedClaims.add("FREESHIP");
    const shipping = input.shipping;
    if (
      shipping === undefined ||
      proposal.productId !== shipping.productId ||
      !shipping.freeShipping ||
      Date.parse(shipping.expiresAt) <= input.now.getTime()
    ) {
      blocked.add("UNAUTHORIZED_FREESHIP");
      rejectedProtectedClaims.add("FREESHIP");
    }
  }
  const hasShippingFeeClaim = SHIP_FEE_PATTERN.test(text);
  if (hasShippingFeeClaim) {
    observedProtectedClaims.add("SHIPPING_FEE");
    const shipping = input.shipping;
    const fees = parseMoney(shippingClaim);
    if (
      shipping === undefined ||
      proposal.productId !== shipping.productId ||
      shipping.feeVnd === null ||
      Date.parse(shipping.expiresAt) <= input.now.getTime() ||
      fees.length !== 1 ||
      fees.some((fee) => fee !== shipping.feeVnd)
    ) {
      blocked.add("UNAUTHORIZED_SHIP_FEE");
      rejectedProtectedClaims.add("SHIPPING_FEE");
    }
  }

  const assertedSizes = detectConcreteSizeRecommendations(text);
  const sizeClaimReasons = validateSizeRecommendations(
    proposal,
    input,
    assertedSizes,
  );
  if (assertedSizes.length > 0) {
    observedProtectedClaims.add("SIZE_FIT");
  }
  for (const reason of sizeClaimReasons) {
    blocked.add(reason);
    rejectedProtectedClaims.add("SIZE_FIT");
  }
  const blockedReasonCodes = [...blocked].sort();
  const hasHardBlock = blockedReasonCodes.some((reason) => reason !== "UNVERIFIED_ATTACHMENT");
  const useTextOnlyAttachmentFallback =
    hasUnverifiedAttachment &&
    input.allowTextOnlyOnUnverifiedAttachment === true &&
    !hasHardBlock &&
    text.trim().length > 0;
  const isBlocked = hasHardBlock || (hasUnverifiedAttachment && !useTextOnlyAttachmentFallback);
  return GuardedReplyPlanV1Schema.parse({
    schemaVersion: 1,
    action: isBlocked ? "HANDOFF" : proposal.action,
    textUnits: isBlocked || text.trim().length === 0 ? [] : [text],
    imageUrls: isBlocked || useTextOnlyAttachmentFallback ? [] : proposal.attachments,
    productId: proposal.productId,
    handoffReason: isBlocked ? "BUSINESS_POLICY_GUARD" : proposal.handoffReason,
    blockedReasonCodes,
    protectedClaimValidation: protectedClaimValidation(
      observedProtectedClaims,
      rejectedProtectedClaims,
    ),
    // A later ownership/delivery gate is the only component allowed to promote this to send intent.
    sendAuthorized: false,
  });
}
