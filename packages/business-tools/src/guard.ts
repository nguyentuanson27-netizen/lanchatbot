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
const SIZE_TOKEN = "(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\\d|50)";
const SIZE_REFERENCE_PATTERN = new RegExp(
  `(?:\\bsize|\\bsz|kich\\s*co|co)\\s*(?:la|:|=|\\u2013|-)?\\s*(${SIZE_TOKEN})(?:\\s*(?:-|\\u2013|den|to|/)\\s*(?:den\\s*)?(${SIZE_TOKEN}))?\\b`,
  "giu",
);
const BARE_SIZE_FIT_PATTERN = new RegExp(
  `\\b(?:mac|hop|vua|chon|lay|nen\\s*(?:chon|lay)|tu\\s*van|de\\s*xuat|goi\\s*y|khuyen\\s*nghi)\\s*(?:size\\s*)?(${SIZE_TOKEN})\\b`,
  "giu",
);
const SIZE_CATALOG_LIST_PATTERN = new RegExp(
  `(?:\\bsize|\\bsz|kich\\s*co|co)\\s*[:=]?\\s*${SIZE_TOKEN}(?:\\s*[/,;]\\s*${SIZE_TOKEN})+`,
  "iu",
);
const SIZE_CATALOG_LABEL_PATTERN = new RegExp(
  `^\\s*(?:size|sz|kich\\s*co|co)\\s*[:=]\\s*${SIZE_TOKEN}\\s*[.!]?$`,
  "iu",
);
const SIZE_STOCK_CONTEXT_PATTERN = /(?:con|het|san\s*hang|available|ton\s*kho|pre\s*order|dat\s*truoc)\s*(?:size|sz|kich\s*co|co)?\s*(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)\b/iu;
const SIZE_NEGATION_PATTERN = /(?:khong|chua|chang)\s+(?:the\s+)?(?:tu\s*van|goi\s*y|khuyen|xac\s*dinh|chon|ket\s*luan|bao)\b/iu;
const SIZE_FIT_ASSERTION_PATTERN = /\b(?:hop|vua|phu\s*hop|de\s*xuat|goi\s*y|khuyen\s*nghi)\b/iu;
const SIZE_INFORMATION_QUESTION_PATTERN = new RegExp(
  `^\\s*(?:size|sz|kich\\s*co|co)\\s*${SIZE_TOKEN}\\b[^.!?]{0,48}\\b(?:co\\s+)?(?:hop|vua|phu\\s*hop)\\b[^.!?]{0,32}\\b(?:khong|ko|hong|ha|a)\\s*[?]?$`,
  "iu",
);
const SIZE_SELECTION_QUESTION_PATTERN = new RegExp(
  `\\b(?:muon\\s+)?chon\\b[^.!?]{0,48}\\b(?:size|sz|kich\\s*co|co)?\\s*${SIZE_TOKEN}\\b[^.!?]{0,24}\\b(?:hay|hoac)\\b`,
  "iu",
);
const SIZE_RECOMMENDATION_DESCRIPTOR_PATTERN = new RegExp(
  `\\b(?:size|sz|kich\\s*co|co)\\s+(?:phu\\s*hop(?:\\s*nhat)?|nen\\s*(?:chon|lay)|de\\s*xuat)\\s*(?:la|:|=)?\\s*(${SIZE_TOKEN})\\b`,
  "giu",
);
const SIZE_AVAILABILITY_PATTERN = new RegExp(
  `\\b(?:co|con|het|san\\s*hang|available|ton\\s*kho|pre\\s*order|dat\\s*truoc)\\s*(?:size|sz|kich\\s*co|co)\\s*${SIZE_TOKEN}\\b`,
  "iu",
);

const SIZE_CATALOG_AVAILABILITY_PATTERN = new RegExp(
  `\\b(?:size|sz|kich\\s*co|co)(?:\\s+dang)?\\s+co\\s*[:=]?\\s*${SIZE_TOKEN}(?:\\s*[/,;]\\s*${SIZE_TOKEN})*\\b`,
  "iu",
);
function normalizedVietnameseForGuard(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLocaleLowerCase("vi-VN");
}

/**
 * Defense in depth only: this catches a concrete fit assertion omitted from
 * the structured claim references. Exclusions apply only to the clause that
 * contains the match, so a mixed sentence cannot hide a later assertion.
 */
export function detectConcreteSizeRecommendations(text: string): readonly string[] {
  const sizes = new Set<string>();
  const microClauses = normalizedVietnameseForGuard(text)
    .replace(/\n/gu, ",")
    .split(
      /[,;\n]+|(?<=[.!?])|\b(?:va|ma|nhung|tuy\s+nhien|con|nen)\b|(?=\btheo\s+so\s+do\b)/u,
    )
    .map((clause) => clause.trim())
    .filter(Boolean);
  for (const clause of microClauses) {
    if (
      SIZE_NEGATION_PATTERN.test(clause) ||
      SIZE_CATALOG_LIST_PATTERN.test(clause) ||
      SIZE_CATALOG_LABEL_PATTERN.test(clause) ||
      SIZE_STOCK_CONTEXT_PATTERN.test(clause) ||
      SIZE_AVAILABILITY_PATTERN.test(clause) ||
      SIZE_CATALOG_AVAILABILITY_PATTERN.test(clause)
    ) {
      continue;
    }
    const descriptorMatches = [...clause.matchAll(SIZE_RECOMMENDATION_DESCRIPTOR_PATTERN)];
    const bareFitMatches = [...clause.matchAll(BARE_SIZE_FIT_PATTERN)];
    const isPureInformationQuestion =
      clause.includes("?") &&
      descriptorMatches.length === 0 &&
      (
        SIZE_INFORMATION_QUESTION_PATTERN.test(clause) ||
        SIZE_SELECTION_QUESTION_PATTERN.test(clause)
      );
    if (isPureInformationQuestion) continue;

    if (SIZE_FIT_ASSERTION_PATTERN.test(clause)) {
      for (const match of clause.matchAll(SIZE_REFERENCE_PATTERN)) {
        sizes.add((match[1] ?? "").toLocaleUpperCase("vi-VN"));
        if (match[2]) sizes.add(match[2].toLocaleUpperCase("vi-VN"));
      }
    }
    for (const match of bareFitMatches) {
      sizes.add((match[1] ?? "").toLocaleUpperCase("vi-VN"));
    }
    for (const match of descriptorMatches) {
      sizes.add((match[1] ?? "").toLocaleUpperCase("vi-VN"));
    }
  }
  return [...sizes].filter(Boolean).sort();
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
