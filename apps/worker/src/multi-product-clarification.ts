import { normalizeProductCode } from "@lana/business-tools";
import type { AgentProposalV1 } from "@lana/contracts";

export type MultiProductResolutionPolicy = "LEGACY" | "CLARIFY_V1";

export interface MultiProductResolutionDecision {
  readonly disposition: "CONTINUE" | "CLARIFY_SELECTION" | "FAIL_CLOSED";
  readonly productIds: readonly string[];
  readonly reasonCodes: readonly string[];
}

export interface MultiProductClarificationVerification {
  readonly accepted: boolean;
  readonly reasonCodes: readonly string[];
}

function distinctProductIds(productIds: readonly string[]): readonly string[] {
  const distinct = new Map<string, string>();
  for (const productId of productIds) {
    const normalized = normalizeProductCode(productId);
    if (normalized && !distinct.has(normalized)) distinct.set(normalized, productId);
  }
  return [...distinct.values()];
}

export function decideMultiProductResolution(input: {
  readonly policy: MultiProductResolutionPolicy;
  readonly productIds: readonly string[];
}): MultiProductResolutionDecision {
  const productIds = distinctProductIds(input.productIds);
  if (input.policy === "CLARIFY_V1" && productIds.length > 10) {
    return {
      disposition: "FAIL_CLOSED",
      productIds,
      reasonCodes: ["MULTI_PRODUCT_CANDIDATE_LIMIT_EXCEEDED"],
    };
  }
  if (input.policy === "CLARIFY_V1" && productIds.length > 1) {
    return {
      disposition: "CLARIFY_SELECTION",
      productIds,
      reasonCodes: ["MULTI_PRODUCT_SELECTION_REQUIRED"],
    };
  }
  return { disposition: "CONTINUE", productIds, reasonCodes: [] };
}

function productCodesInReply(reply: string): readonly string[] {
  return [...new Set(
    (reply.match(/\b[A-Z]{1,6}\s*[-_.]?\s*\d{1,8}[A-Z0-9]*\b/gu) ?? [])
      .map(normalizeProductCode),
  )];
}

function hasUnverifiedCommercialClaim(
  reply: string,
): boolean {
  const remainder = reply.normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .replace(/\b[A-Z]{1,6}\s*[-_.]?\s*\d{1,8}[A-Z0-9]*\b/gu, " ")
    .toLocaleLowerCase("vi");
  return /https?:|www\.|\d|\b(?:gia|giam|sale|khuyen mai|con hang|het hang|ton kho|size|kich thuoc|chat lieu|ship|giao hang|dep hon|tot hon|hop hon)\b/iu
    .test(remainder);
}

function isBoundedSelectionQuestion(reply: string): boolean {
  if (
    !reply.endsWith("?") ||
    (reply.match(/\?/gu) ?? []).length !== 1 ||
    /[\r\n]/u.test(reply)
  ) return false;
  const words = reply.normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .replace(/\b[A-Z]{1,6}\s*[-_.]?\s*\d{1,8}[A-Z0-9]*\b/gu, " ")
    .toLocaleLowerCase("vi")
    .match(/[a-z]+/gu) ?? [];
  const allowed = new Set([
    "a", "chi", "cho", "chon", "de", "em", "giua", "giup", "hai", "hay",
    "ho", "lua", "ma", "mau", "minh", "muon", "nao", "san", "pham",
    "thich", "tiep", "tro", "trong", "truoc", "tu", "ung", "van", "va",
    "xem", "xin",
  ]);
  return words.length > 0 && words.every((word) => allowed.has(word));
}

export function verifyMultiProductClarificationProposal(
  proposal: AgentProposalV1,
  candidateIds: readonly string[],
): MultiProductClarificationVerification {
  const candidates = distinctProductIds(candidateIds).map(normalizeProductCode);
  const candidateSet = new Set(candidates);
  const reply = proposal.reply.trim();
  const mentioned = productCodesInReply(reply);
  const reasonCodes: string[] = [];

  if (mentioned.some((productId) => !candidateSet.has(productId))) {
    return { accepted: false, reasonCodes: ["MULTI_PRODUCT_UNVERIFIED_PRODUCT"] };
  }
  if (
    proposal.intent !== "multi_product_selection" ||
    proposal.conversationStage !== "PRODUCT_MATCHED" ||
    proposal.action !== "REPLY" || proposal.productId !== null ||
    proposal.attachments.length > 0 || proposal.handoffReason !== null ||
    (proposal.protectedClaimIds?.length ?? 0) > 0 ||
    proposal.businessFactQuery.intent !== "NONE" ||
    proposal.businessFactQuery.offerType !== null ||
    proposal.businessFactQuery.color !== null ||
    proposal.businessFactQuery.size !== null ||
    proposal.businessFactQuery.deliveryRegion !== null ||
    reply.length < 10 || reply.length > 500 || !isBoundedSelectionQuestion(reply)
  ) {
    reasonCodes.push("MULTI_PRODUCT_DRAFT_BOUNDARY_INVALID");
  }
  if (candidates.some((productId) => !mentioned.includes(productId))) {
    reasonCodes.push("MULTI_PRODUCT_CANDIDATE_OMITTED");
  }
  if (hasUnverifiedCommercialClaim(reply)) {
    reasonCodes.push("MULTI_PRODUCT_UNVERIFIED_COMMERCIAL_CLAIM");
  }
  return { accepted: reasonCodes.length === 0, reasonCodes };
}
