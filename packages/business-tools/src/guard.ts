import {
  AgentProposalV1Schema,
  BusinessFactEnvelopeV1Schema,
  GuardedReplyPlanV1Schema,
  type AgentProposalV1,
  type ProductFactsV1,
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

  if (!productVerified) blocked.add("UNVERIFIED_PRODUCT");
  if (RAW_URL_PATTERN.test(text)) blocked.add("RAW_URL_IN_TEXT");
  if (proposal.attachments.some((url) => facts === null || !facts.imageUrls.includes(url))) {
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

  const blockedReasonCodes = [...blocked].sort();
  const isBlocked = blockedReasonCodes.length > 0;
  return GuardedReplyPlanV1Schema.parse({
    schemaVersion: 1,
    action: isBlocked ? "HANDOFF" : proposal.action,
    textUnits: isBlocked || text.trim().length === 0 ? [] : [text],
    imageUrls: isBlocked ? [] : proposal.attachments,
    productId: proposal.productId,
    handoffReason: isBlocked ? "BUSINESS_POLICY_GUARD" : proposal.handoffReason,
    blockedReasonCodes,
    // A later ownership/delivery gate is the only component allowed to promote this to send intent.
    sendAuthorized: false,
  });
}
