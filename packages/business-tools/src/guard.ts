import {
  AgentProposalV1Schema,
  BusinessFactEnvelopeV1Schema,
  GuardedReplyPlanV1Schema,
  SizeRecommendationProtectedClaimV1Schema,
  type AgentProposalV1,
  type ProductFactsV1,
  type SizeRecommendationProtectedClaimV1,
} from "@lana/contracts";
import type { GuardInput, GuardResult } from "./types.js";

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
const ORDER_INFO_REQUEST_PATTERN = /(?:xin|gửi|cho\s+(?:em|shop))[^.!?\n]{0,36}(?:tên|họ\s*tên|số\s*điện\s*thoại|sđt|địa\s*chỉ)|(?:tên|sđt|địa\s*chỉ)[^.!?\n]{0,24}(?:nhận\s*hàng|đặt\s*hàng)/iu;
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
const SIZE_PREDICATES = [
  ["khuyen", "nghi"],
  ["phu", "hop"],
  ["can", "nhac"],
  ["tu", "van"],
  ["de", "xuat"],
  ["goi", "y"],
  ["nen", "chon"],
  ["nen", "lay"],
  ["nen", "mac"],
  ["hop"],
  ["vua"],
  ["chon"],
  ["lay"],
  ["mac"],
] as const;
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
type SizePredicate = { readonly start: number; readonly end: number };
function normalizedVietnameseForGuard(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLocaleLowerCase("vi-VN");
}
function tokenizeSizeText(value: string): readonly SizeToken[] {
  return [...value.matchAll(/[a-z0-9]+|[(),;.!?/:=\u2013\u2014-]|\n/gu)].map(
    (m) => ({ text: m[0], start: m.index, end: m.index + m[0].length }),
  );
}
function findSizeMentions(
  tokens: readonly SizeToken[],
): readonly SizeMention[] {
  const result: SizeMention[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const first = tokens[i];
    if (!first || !SIZE_VALUES.has(first.text)) continue;
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
function findSizePredicates(
  tokens: readonly SizeToken[],
): readonly SizePredicate[] {
  const result: SizePredicate[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const phrase = SIZE_PREDICATES.find((p) =>
      p.every((word, offset) => tokens[i + offset]?.text === word),
    );
    if (!phrase) continue;
    const end = i + phrase.length - 1;
    if (
      phrase.length === 1 &&
      phrase[0] === "vua" &&
      tokens.slice(end + 1, end + 4).some((token) =>
        /^(?:ve|cap|nhap|het)$/u.test(token.text),
      )
    ) continue;
    const first = tokens[i];
    const last = tokens[end];
    if (!first || !last) continue;
    result.push({ start: first.start, end: last.end });
    i = end;
  }
  return result;
}
function hasSentenceBoundary(value: string): boolean {
  return /[.;!?\n]/u.test(value);
}
function mentionDistance(m: SizeMention, p: SizePredicate): number {
  if (m.end <= p.start) return p.start - m.end;
  if (p.end <= m.start) return m.start - p.end;
  return 0;
}
function punctuationScope(
  value: string,
  start: number,
  end: number,
): { start: number; end: number } {
  const before = Math.max(
    ...[",", ";", ".", "!", "?", "\n"].map((mark) =>
      value.lastIndexOf(mark, start - 1),
    ),
  );
  const after = value.slice(end).search(/[,;.!?\n]/u);
  return {
    start: before + 1,
    end: after === -1 ? value.length : end + after + 1,
  };
}
function isAffirmativeSizeCandidate(
  value: string,
  tokens: readonly SizeToken[],
  mention: SizeMention,
  predicateStart: number,
  predicateEnd: number,
  scopeStart: number,
  scopeEnd: number,
): boolean {
  const fragment = value.slice(scopeStart, scopeEnd).trim();
  const unitEnd = Math.max(mention.end, predicateEnd);
  const beforePredicate = value.slice(scopeStart, predicateStart);
  const suffix = value.slice(unitEnd, scopeEnd).trim();
  const local = tokens.filter(
    (token) => token.start >= scopeStart && token.end <= scopeEnd,
  );
  if (/\b(?:khong|chua|chang)\b/u.test(beforePredicate)) return false;
  if (mention.sizes.length >= 3 && /[:=/]/u.test(fragment)) return false;
  if (/\b(?:dung|phai)\s+(?:khong|ko|hong)\s*\?*$/u.test(suffix)) return true;
  if (fragment.includes("?")) return false;
  const coBefore = local.some(
    (token) => token.text === "co" && token.start < predicateEnd,
  );
  const questionAfter = local.some(
    (token) =>
      /^(?:khong|ko|hong)$/u.test(token.text) && token.start >= unitEnd,
  );
  if (coBefore && questionAfter) return false;
  const count = local.filter((token) => SIZE_VALUES.has(token.text)).length;
  if (
    local.some((token) => token.text === "hay" || token.text === "hoac") &&
    count >= 2
  )
    return false;
  if (/\b(?:lieu|nao|bao\s+nhieu)\b/u.test(fragment) && fragment.includes("?"))
    return false;
  if (/\b(?:khong|ko|hong|ha)\s*\?*$/u.test(suffix)) return false;
  return true;
}
/** Defense in depth only; typed Size Engine provenance remains authoritative. */
export function detectConcreteSizeRecommendations(
  text: string,
): readonly string[] {
  const value = normalizedVietnameseForGuard(text);
  const tokens = tokenizeSizeText(value);
  const mentions = findSizeMentions(tokens);
  const predicates = findSizePredicates(tokens);
  const byMention = new Map<
    number,
    { mention: SizeMention; predicates: SizePredicate[] }
  >();
  for (const predicate of predicates) {
    const nearest = mentions
      .filter((mention) => {
        const between = value.slice(
          Math.min(mention.end, predicate.end),
          Math.max(mention.start, predicate.start),
        );
        return (
          mentionDistance(mention, predicate) <= 80 &&
          !hasSentenceBoundary(between)
        );
      })
      .sort(
        (a, b) =>
          mentionDistance(a, predicate) - mentionDistance(b, predicate) ||
          Number(b.start >= predicate.end) - Number(a.start >= predicate.end),
      )[0];
    if (!nearest) continue;
    const entry = byMention.get(nearest.start) ?? {
      mention: nearest,
      predicates: [],
    };
    entry.predicates.push(predicate);
    byMention.set(nearest.start, entry);
  }
  const candidates = [...byMention.values()]
    .map(({ mention, predicates: matched }) => ({
      mention,
      predicateStart: Math.min(...matched.map((p) => p.start)),
      predicateEnd: Math.max(...matched.map((p) => p.end)),
      start: Math.min(mention.start, ...matched.map((p) => p.start)),
      end: Math.max(mention.end, ...matched.map((p) => p.end)),
    }))
    .sort((a, b) => a.start - b.start);
  const result = new Set<string>();
  candidates.forEach((candidate, index) => {
    const punctuation = punctuationScope(value, candidate.start, candidate.end);
    const previous = candidates[index - 1];
    const next = candidates[index + 1];
    const start =
      previous &&
      !hasSentenceBoundary(value.slice(previous.end, candidate.start))
        ? Math.max(
            punctuation.start,
            Math.floor((previous.end + candidate.start) / 2),
          )
        : punctuation.start;
    const end =
      next && !hasSentenceBoundary(value.slice(candidate.end, next.start))
        ? Math.min(punctuation.end, Math.ceil((candidate.end + next.start) / 2))
        : punctuation.end;
    if (
      !isAffirmativeSizeCandidate(
        value,
        tokens,
        candidate.mention,
        candidate.predicateStart,
        candidate.predicateEnd,
        start,
        end,
      )
    )
      return;
    for (const size of candidate.mention.sizes)
      result.add(size.toLocaleUpperCase("vi-VN"));
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
): readonly string[] {
  const assertedSizes = detectConcreteSizeRecommendations(proposal.reply);
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
      sendAuthorized: false,
    });
  }

  const proposal = proposalResult.data;
  const text = proposal.reply;
  const shippingClaim = text.match(SHIP_FEE_PATTERN)?.[0] ?? "";
  const textWithoutShippingFee = shippingClaim.length === 0 ? text : text.replace(shippingClaim, "");
  const blocked = new Set<string>();
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
  if (hasUnverifiedAttachment) {
    blocked.add("UNVERIFIED_ATTACHMENT");
  }

  const prices = parseMoney(textWithoutShippingFee);
  if (prices.length > 0 || PRICE_CLAIM_PATTERN.test(textWithoutShippingFee)) {
    const allowed = new Set([facts?.listPriceVnd, facts?.salePriceVnd].filter((value): value is number => value !== null && value !== undefined));
    if (facts === null || prices.length === 0 || prices.some((price) => !allowed.has(price))) {
      blocked.add("UNAUTHORIZED_PRICE");
    }
  }
  if (STOCK_PATTERN.test(text)) {
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
    if (!consistent) blocked.add("UNAUTHORIZED_STOCK");
  }
  if (ETA_PATTERN.test(text)) {
    const eta = facts?.deliveryEta;
    if (eta === null || eta === undefined) blocked.add("UNAUTHORIZED_ETA");
    else {
      const mentioned = [...text.matchAll(ETA_VALUES_PATTERN)].flatMap((match) =>
        [match[1], match[2]].filter((value): value is string => value !== undefined).map(Number),
      );
      if (mentioned.length === 0 || mentioned.some((days) => days < eta.minDays || days > eta.maxDays)) {
        blocked.add("UNAUTHORIZED_ETA");
      }
    }
  }

  if (PROMOTION_PATTERN.test(text)) {
    const authorization = input.promotion;
    if (
      authorization === undefined ||
      proposal.productId !== authorization.productId ||
      Date.parse(authorization.expiresAt) <= input.now.getTime() ||
      !authorization.allowedPhrases.some((phrase) => normalizedContains(text, phrase))
    ) {
      blocked.add("UNAUTHORIZED_PROMOTION");
    }
  }
  if (FREESHIP_PATTERN.test(text)) {
    const shipping = input.shipping;
    if (
      shipping === undefined ||
      proposal.productId !== shipping.productId ||
      !shipping.freeShipping ||
      Date.parse(shipping.expiresAt) <= input.now.getTime()
    ) {
      blocked.add("UNAUTHORIZED_FREESHIP");
    }
  }
  if (SHIP_FEE_PATTERN.test(text)) {
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
    }
  }

  for (const reason of validateSizeRecommendations(proposal, input)) {
    blocked.add(reason);
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
    // A later ownership/delivery gate is the only component allowed to promote this to send intent.
    sendAuthorized: false,
  });
}
