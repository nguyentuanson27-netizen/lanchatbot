import { isIP } from "node:net";
import {
  normalizeProductCode,
  type StableProductDocument,
} from "@lana/business-tools";
import type { AgentProposalV1, CustomerUrlPolicyV1 } from "@lana/contracts";

export type CustomerUrlClass =
  | "APPROVED_FIRST_PARTY_PRODUCT"
  | "APPROVED_SHOP_CDN"
  | "UNSUPPORTED_EXTERNAL"
  | "SUSPICIOUS_DANGEROUS";

export type CustomerUrlDisposition =
  | "CONTINUE"
  | "VERIFY_ADMIN_MEDIA"
  | "EXPLAIN_UNSUPPORTED"
  | "HANDOFF";

export interface CustomerUrlItem {
  readonly classification: CustomerUrlClass;
  readonly normalizedUrl: string | null;
  readonly productCode: string | null;
  readonly reasonCode: string;
}

export interface CustomerUrlDecision {
  readonly policy: CustomerUrlPolicyV1;
  readonly disposition: CustomerUrlDisposition;
  readonly items: readonly CustomerUrlItem[];
  readonly productCodes: readonly string[];
  readonly candidateProductCodes: readonly string[];
  readonly reasonCodes: readonly string[];
  readonly explanationAllowed: boolean;
}

const URL_TOKEN_BOUNDARY = String.raw`(?:\/|(?=$|[\s),.;!?\]}]))`;
const DOMAIN_LIKE = String.raw`(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?[.\u3002\uff0e\uff61])+(?:[\p{L}]{2,63}|xn--[a-z0-9-]{2,59})`;
const NUMERIC_HOST_LIKE = String.raw`(?:(?:\d{1,12}\.){1,3}\d{1,12}|0x[a-f0-9]+|\d{7,12})`;
const SHORT_NUMERIC_AUTHORITY_LIKE = String.raw`\d{1,12}(?::[^/\s]+)?\/(?=[\p{L}%._~-])`;
const BRACKETED_HOST_LIKE = String.raw`\[[a-f0-9:.%]+\]`;
const HOST_LIKE = `(?:${DOMAIN_LIKE}|localhost|${NUMERIC_HOST_LIKE}|${BRACKETED_HOST_LIKE})`;
const USERINFO_LIKE = `(?:[\\p{L}\\p{N}._~-]+(?::[^@\\s/]+)?|${DOMAIN_LIKE})@`;
const BARE_AUTHORITY_LIKE = `(?:${USERINFO_LIKE}(?:${HOST_LIKE}|\\d{1,12})(?::[^/\\s]+)?\\/|${SHORT_NUMERIC_AUTHORITY_LIKE}|${HOST_LIKE}(?::[^/\\s]+)?${URL_TOKEN_BOUNDARY})`;
const URL_CANDIDATE = new RegExp(
  String.raw`(?<![\p{L}\p{N}@._-])(?:https?:\/{0,2}|[a-z][a-z0-9+.-]{1,15}:\/\/|(?:javascript|data|file|ftp|blob):(?:\/\/)?|\/\/|www[.\u3002\uff0e\uff61]|${BARE_AUTHORITY_LIKE})[^\s<>"']*`,
  "giu",
);
const CONTROL_OR_BIDI = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const FIRST_PARTY_HOST = "www.lanadesign.vn";
const ADMIN_MEDIA_HOST = "admin.lanadesign.vn";
const ADMIN_MEDIA_PATH = /^\/lana-public\/products\/(.+)-([a-f0-9]{24})\.(jpg|png|webp)$/u;
const TRACKING_QUERY_KEY = /^(?:utm_[a-z0-9_]+|fbclid|gclid|_ga)$/u;
const EXPLANATION_ALLOWED_WORDS = new Set([
  "a", "access", "an", "anh", "ban", "ben", "can", "cannot", "check",
  "chi", "chia", "chua", "code", "cung", "de", "do", "duoc", "duong",
  "em", "gui", "help", "here", "hinh", "ho", "hoac", "i", "image", "instead",
  "it", "ket", "khong", "kiem", "link", "lien", "long", "ma", "minh", "mo", "nay",
  "nhe", "not", "ngoai", "open", "or", "pham", "photo", "please", "product",
  "provide", "safely", "san", "se", "send", "share", "so", "support", "t",
  "that", "the", "theo", "this", "toan", "tra", "truy", "unable", "us", "vao",
  "vi", "vui", "we", "with", "your",
]);

function trimCandidate(value: string): string {
  let output = value;
  while (/[),.;!?\]}]$/u.test(output)) output = output.slice(0, -1);
  return output;
}

function extractCandidates(value: string): readonly string[] {
  return (value.match(URL_CANDIDATE) ?? [])
    .map(trimCandidate)
    .filter(Boolean);
}

function privateOrReservedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (
    host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    host === "0.0.0.0" || host === "::" || host === "::1"
  ) return true;
  const kind = isIP(host);
  if (kind === 4) {
    const parts = host.split(".").map(Number);
    const [a = 0, b = 0] = parts;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }
  if (kind === 6) {
    if (/^(?:fc|fd)/u.test(host) || /^fe[89ab]/u.test(host)) return true;
    const mapped = host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/u)?.[1];
    return mapped ? privateOrReservedHost(mapped) : true;
  }
  return false;
}

function normalizedProductCode(value: string): string | null {
  if (!/^[a-z]{1,8}[a-z0-9._-]*\d[a-z0-9._-]*$/iu.test(value)) return null;
  const code = normalizeProductCode(value);
  return /^[A-Z]{1,8}\d{1,8}[A-Z0-9]*$/u.test(code) ? code : null;
}

function productCodeFromFirstPartyPath(pathname: string): string | null {
  if (pathname.includes("%")) return null;
  const match = pathname.match(/^\/(?:products\/)?([^/]+)\/?$/u);
  return match?.[1] ? normalizedProductCode(match[1]) : null;
}

function dangerous(
  reasonCode: string,
  normalizedUrl: string | null = null,
): CustomerUrlItem {
  return {
    classification: "SUSPICIOUS_DANGEROUS",
    normalizedUrl,
    productCode: null,
    reasonCode,
  };
}

function classifyCandidate(raw: string): CustomerUrlItem {
  if (raw.length > 2_048 || raw.includes("\\") || CONTROL_OR_BIDI.test(raw)) {
    return dangerous("CUSTOMER_URL_INVALID");
  }
  if (/[\u3002\uff0e\uff61]/u.test(raw)) {
    return dangerous("CUSTOMER_URL_DECEPTIVE_HOST");
  }
  if (/%(?![a-f0-9]{2})/iu.test(raw)) return dangerous("CUSTOMER_URL_INVALID");
  const rawPath = raw.split(/[?#]/u, 1)[0] ?? raw;
  if (
    /%(?:2e|2f|5c|25)/iu.test(rawPath) ||
    /\/(?:\.{1,2})(?:\/|$)/u.test(rawPath)
  ) return dangerous("CUSTOMER_URL_INVALID");
  if (/xn--/iu.test(raw)) return dangerous("CUSTOMER_URL_DECEPTIVE_HOST");
  if (/^https?:(?!\/\/)/iu.test(raw)) return dangerous("CUSTOMER_URL_INVALID");
  let url: URL;
  try {
    const hasBareUserInfo = /^[^/?#\s]+@/iu.test(raw);
    url = new URL(
      raw.startsWith("//")
        ? `https:${raw}`
        : hasBareUserInfo || /^www\./iu.test(raw) || !/^[a-z][a-z0-9+.-]{1,15}:/iu.test(raw)
          ? `https://${raw}`
          : raw,
    );
  } catch {
    return dangerous("CUSTOMER_URL_INVALID");
  }
  const protocol = url.protocol.toLowerCase();
  if (protocol === "http:") return dangerous("CUSTOMER_URL_HTTPS_REQUIRED");
  if (protocol !== "https:") return dangerous("CUSTOMER_URL_SCHEME_FORBIDDEN");
  if (url.username || url.password) return dangerous("CUSTOMER_URL_CREDENTIALS_FORBIDDEN");
  if (url.port && url.port !== "443") return dangerous("CUSTOMER_URL_PORT_FORBIDDEN");

  const hostname = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (!hostname || privateOrReservedHost(hostname)) {
    return dangerous("CUSTOMER_URL_PRIVATE_ADDRESS");
  }
  url.hostname = hostname;
  url.hash = "";

  if (hostname === FIRST_PARTY_HOST || hostname === ADMIN_MEDIA_HOST) {
    for (const key of [...url.searchParams.keys()]) {
      if (!TRACKING_QUERY_KEY.test(key.toLowerCase())) {
        return dangerous("CUSTOMER_URL_QUERY_FORBIDDEN", url.toString());
      }
      url.searchParams.delete(key);
    }
    url.search = url.searchParams.toString() ? `?${url.searchParams.toString()}` : "";
  }

  if (hostname === FIRST_PARTY_HOST) {
    const productCode = productCodeFromFirstPartyPath(url.pathname);
    if (!productCode) {
      return {
        classification: "UNSUPPORTED_EXTERNAL",
        normalizedUrl: url.toString(),
        productCode: null,
        reasonCode: "CUSTOMER_URL_PATH_NOT_APPROVED",
      };
    }
    return {
      classification: "APPROVED_FIRST_PARTY_PRODUCT",
      normalizedUrl: url.toString(),
      productCode,
      reasonCode: "CUSTOMER_URL_APPROVED_FIRST_PARTY_PRODUCT",
    };
  }

  if (hostname === ADMIN_MEDIA_HOST) {
    if (url.pathname.includes("%") || url.search) {
      return dangerous("CUSTOMER_URL_PATH_NOT_APPROVED", url.toString());
    }
    const match = url.pathname.match(ADMIN_MEDIA_PATH);
    const productCode = match?.[1] ? normalizedProductCode(match[1]) : null;
    if (!productCode) {
      return {
        classification: "UNSUPPORTED_EXTERNAL",
        normalizedUrl: url.toString(),
        productCode: null,
        reasonCode: "CUSTOMER_URL_PATH_NOT_APPROVED",
      };
    }
    return {
      classification: "APPROVED_SHOP_CDN",
      normalizedUrl: url.toString(),
      productCode,
      reasonCode: "CUSTOMER_URL_APPROVED_SHOP_CDN",
    };
  }

  if (hostname === "lanadesign.vn") {
    return {
      classification: "UNSUPPORTED_EXTERNAL",
      normalizedUrl: url.toString(),
      productCode: null,
      reasonCode: "CUSTOMER_URL_PATH_NOT_APPROVED",
    };
  }
  if (hostname.includes("lanadesign") || hostname.split(".").some((label) => label.startsWith("xn--"))) {
    return dangerous("CUSTOMER_URL_DECEPTIVE_HOST", url.toString());
  }
  return {
    classification: "UNSUPPORTED_EXTERNAL",
    normalizedUrl: url.toString(),
    productCode: null,
    reasonCode: "CUSTOMER_URL_UNSUPPORTED_EXTERNAL",
  };
}

export function classifyCustomerUrls(
  value: string,
  policy: CustomerUrlPolicyV1,
): CustomerUrlDecision {
  const candidates = extractCandidates(value);
  if (candidates.length === 0) {
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
  if (candidates.length > 8) {
    const overflowItems = candidates.slice(0, 32).map(classifyCandidate);
    const overflowDangerReasons = overflowItems
      .filter(({ classification }) => classification === "SUSPICIOUS_DANGEROUS")
      .map(({ reasonCode }) => reasonCode);
    return {
      policy,
      disposition: "HANDOFF",
      items: overflowItems,
      productCodes: [],
      candidateProductCodes: [],
      reasonCodes: policy === "STRICT_BLOCK_ALL"
        ? ["CUSTOMER_URL_STRICT_BLOCK_ALL"]
        : [...new Set(["CUSTOMER_URL_LIMIT_EXCEEDED", ...overflowDangerReasons])],
      explanationAllowed: false,
    };
  }
  const unique = new Map<string, CustomerUrlItem>();
  for (const candidate of candidates) {
    const item = classifyCandidate(candidate);
    unique.set(item.normalizedUrl ?? `invalid:${candidate}`, item);
  }
  const items = [...unique.values()];
  if (policy === "STRICT_BLOCK_ALL") {
    return {
      policy,
      disposition: "HANDOFF",
      items,
      productCodes: [],
      candidateProductCodes: [],
      reasonCodes: ["CUSTOMER_URL_STRICT_BLOCK_ALL"],
      explanationAllowed: false,
    };
  }

  const dangerousItems = items.filter(({ classification }) =>
    classification === "SUSPICIOUS_DANGEROUS"
  );
  const unsupportedItems = items.filter(({ classification }) =>
    classification === "UNSUPPORTED_EXTERNAL"
  );
  const approvedItems = items.filter(({ classification }) =>
    classification === "APPROVED_FIRST_PARTY_PRODUCT" ||
    classification === "APPROVED_SHOP_CDN"
  );
  const mixedTrust = approvedItems.length > 0 &&
    (dangerousItems.length > 0 || unsupportedItems.length > 0);
  const baseReasons = [...new Set(items.map(({ reasonCode }) => reasonCode))];
  const reasonCodes = mixedTrust
    ? [...baseReasons, "CUSTOMER_URL_MIXED_TRUST"]
    : baseReasons;
  if (dangerousItems.length > 0) {
    return {
      policy,
      disposition: "HANDOFF",
      items,
      productCodes: [],
      candidateProductCodes: [],
      reasonCodes,
      explanationAllowed: false,
    };
  }
  if (unsupportedItems.length > 0) {
    return {
      policy,
      disposition: "EXPLAIN_UNSUPPORTED",
      items,
      productCodes: [],
      candidateProductCodes: [],
      reasonCodes,
      explanationAllowed: true,
    };
  }
  const productCodes = [...new Set(items
    .filter(({ classification }) => classification === "APPROVED_FIRST_PARTY_PRODUCT")
    .map(({ productCode }) => productCode)
    .filter((code): code is string => code !== null))];
  const candidateProductCodes = [...new Set(items
    .filter(({ classification }) => classification === "APPROVED_SHOP_CDN")
    .map(({ productCode }) => productCode)
    .filter((code): code is string => code !== null))];
  return {
    policy,
    disposition: candidateProductCodes.length > 0 ? "VERIFY_ADMIN_MEDIA" : "CONTINUE",
    items,
    productCodes,
    candidateProductCodes,
    reasonCodes,
    explanationAllowed: false,
  };
}

export function redactCustomerUrlsForModel(value: string): string {
  return value.replace(URL_CANDIDATE, (candidate) => {
    const trimmed = trimCandidate(candidate);
    return `[CUSTOMER_URL]${candidate.slice(trimmed.length)}`;
  });
}

export function customerUrlItemAuthorizesProduct(
  item: CustomerUrlItem,
  product: StableProductDocument,
): boolean {
  if (!item.productCode) return false;
  const productCodes = [product.productId, product.canonicalCode, ...product.aliases]
    .map(normalizeProductCode);
  if (!productCodes.includes(item.productCode)) return false;
  if (item.classification === "APPROVED_FIRST_PARTY_PRODUCT") return true;
  if (item.classification !== "APPROVED_SHOP_CDN" || !item.normalizedUrl) return false;
  return product.images.some((image) =>
    image.url === item.normalizedUrl &&
    image.reviewStatus === "APPROVED" &&
    image.metadataVerified === true
  );
}

export function verifyCustomerUrlExplanationProposal(
  proposal: AgentProposalV1,
): { readonly accepted: boolean; readonly reasonCodes: readonly string[] } {
  const reasons: string[] = [];
  const allowedKeys = new Set([
    "schemaVersion", "intent", "conversationStage", "productId", "action", "reply",
    "attachments", "handoffReason", "protectedClaimIds", "businessFactQuery",
  ]);
  if (
    Object.keys(proposal).some((key) => !allowedKeys.has(key)) ||
    proposal.schemaVersion !== 1 || proposal.intent !== "customer_url_unsupported" ||
    proposal.action !== "REPLY" || proposal.productId !== null ||
    proposal.handoffReason !== null || proposal.attachments.length !== 0 ||
    (proposal.protectedClaimIds?.length ?? 0) !== 0 ||
    proposal.businessFactQuery.intent !== "NONE" ||
    proposal.businessFactQuery.offerType !== null ||
    proposal.businessFactQuery.color !== null ||
    proposal.businessFactQuery.size !== null ||
    proposal.businessFactQuery.deliveryRegion !== null
  ) reasons.push("CUSTOMER_URL_EXPLANATION_BOUNDARY_INVALID");
  const reply = proposal.reply.trim();
  if (reply.length < 1 || reply.length > 500) {
    reasons.push("CUSTOMER_URL_EXPLANATION_LENGTH_INVALID");
  }
  if (/(?:https?:\/\/|www\.)/iu.test(reply)) {
    reasons.push("CUSTOMER_URL_EXPLANATION_RAW_URL");
  }
  const foldedReply = reply.normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/\u0111/gu, "d")
    .toLocaleLowerCase("vi")
    .replace(/\bkhong[^\p{L}\p{N}]+ho[^\p{L}\p{N}]+tro\b/gu, "khong ho tro")
    .replace(/\b(?:khong|chua)[^\p{L}\p{N}]+the\b/gu, (value) =>
      value.startsWith("khong") ? "khong the" : "chua the"
    )
    .replace(/\bkiem[^\p{L}\p{N}]+tra\b/gu, "kiem tra")
    .replace(/\btruy[^\p{L}\p{N}]+cap\b/gu, "truy cap")
    .replace(/\blien[^\p{L}\p{N}]+ket\b/gu, "lien ket")
    .replace(/\bma[^\p{L}\p{N}]+san[^\p{L}\p{N}]+pham\b/gu, "ma san pham")
    .replace(/\bhinh[^\p{L}\p{N}]+anh\b/gu, "hinh anh")
    .replace(/\s+/gu, " ")
    .trim();
  const statesSafeLimitation =
    /\b(?:cannot|can't|unable|do not support)\b.{0,80}\b(?:open|access|check)\b/iu.test(foldedReply) ||
    /\b(?:khong the|chua the|khong ho tro)\b.{0,80}\b(?:mo|truy cap|kiem tra)\b/iu.test(foldedReply);
  const requestsSafeInput =
    /\b(?:product code|image)\b/iu.test(foldedReply) ||
    /\b(?:ma san pham|hinh anh|anh)\b/iu.test(foldedReply);
  const clausePrefixBefore = (index: number): string =>
    foldedReply.slice(0, index).split(
      /[,.!?;]|\b(?:but|however|then|nhung|tuy nhien|sau do)\b/giu,
    ).at(-1) ?? "";
  const clauseSuffixAfter = (index: number): string =>
    foldedReply.slice(index).split(
      /[,.!?;]|\b(?:but|however|then|nhung|tuy nhien|sau do)\b/giu,
    )[0] ?? "";
  const isNegatedAction = (clausePrefix: string): boolean => {
    const negation = [...clausePrefix.matchAll(
      /\b(?:cannot|can't|unable(?: to)?|do not|don't|not able to|khong the|chua the|khong ho tro)\b/giu,
    )].at(-1);
    if (!negation) return false;
    const actorPrefix = clausePrefix.slice(0, negation.index ?? 0).split(
      /[,.!?;]|\b(?:but|however|then|nhung|tuy nhien|sau do)\b/giu,
    ).at(-1) ?? "";
    if (!/\b(?:i(?:\s+am)?|we(?:\s+are)?|em|toi|chung toi)\s*$/iu.test(actorPrefix)) {
      return false;
    }
    const tail = clausePrefix.slice((negation.index ?? 0) + negation[0].length);
    const tailWords = tail.match(/[\p{L}\p{N}]+/gu) ?? [];
    return tailWords.every((word) =>
      ["safely", "securely", "directly", "reliably", "currently", "now", "an", "toan"]
        .includes(word)
    );
  };
  const firstActionIndex = [...foldedReply.matchAll(
    /\b(?:open|access|click|visit|follow|check|mo|bam|truy cap|kiem tra)\b/giu,
  )][0]?.index ?? -1;
  const hasAffirmativeLinkAction = [...foldedReply.matchAll(
    /\b(?:open|access|click|visit|follow|mo|bam|truy cap)\b/giu,
  )].some((match) => {
    return match.index !== firstActionIndex ||
      !isNegatedAction(clausePrefixBefore(match.index));
  });
  const hasAffirmativeCustomerCheck = [...foldedReply.matchAll(
    /\b(?:check|kiem tra)\b/giu,
  )].some((match) => {
    const clausePrefix = clausePrefixBefore(match.index);
    if (match.index === firstActionIndex && isNegatedAction(clausePrefix)) return false;
    const checksLink = /\b(?:this|that|the)?\s*(?:link|lien ket)\b/iu.test(
      clauseSuffixAfter(match.index + match[0].length),
    );
    if (checksLink) return true;
    const botDirected = /\b(?:(?:so|then)\s+)?(?:i|we)\s*(?:can|will|may)?\s*$/iu
        .test(clausePrefix) ||
      /\b(?:de\s+)?(?:em|toi|chung toi)\s*(?:co the|se)?\s*$/iu
        .test(clausePrefix);
    return !botDirected;
  });
  const givesUnsafeLinkGuidance =
    /\b(?:this|the) link (?:is|looks|appears|seems) (?:safe|official|trusted|legitimate)\b/iu.test(foldedReply) ||
    /\b(?:please|you can|you should|go ahead and) (?:open|click|visit|follow|access)\b/iu.test(foldedReply) ||
    /\b(?:link|lien ket) (?:nay )?(?:an toan|chinh thuc|uy tin|khong nguy hiem)\b/iu.test(foldedReply) ||
    /\b(?:cu|hay|vui long|chi co the) (?:mo|bam|truy cap)\b/iu.test(foldedReply) ||
    /\b(?:bam vao|truy cap) (?:link|lien ket)\b/iu.test(foldedReply) ||
    /\b(?:safe|official|trusted|legitimate) link\b/iu.test(foldedReply) ||
    hasAffirmativeLinkAction || hasAffirmativeCustomerCheck;
  if (!statesSafeLimitation || !requestsSafeInput || givesUnsafeLinkGuidance) {
    reasons.push("CUSTOMER_URL_EXPLANATION_SAFETY_INVALID");
  }
  if (
    /\d/u.test(reply) ||
    (foldedReply.match(/[\p{L}]+/gu) ?? [])
      .some((word) => !EXPLANATION_ALLOWED_WORDS.has(word)) ||
    /\b(?:price|stock|size|delivery|shipping|freeship|discount|promotion|sale|eta|tomorrow|available)\b/iu.test(reply) ||
    /\b(?:phone|address|place (?:an )?order|payment|card)\b/iu.test(reply) ||
    /(?:giá|còn hàng|hết hàng|kích cỡ|giao hàng|vận chuyển|phí ship|miễn phí|freeship|khuyến mãi|giảm giá|ngày mai)/iu.test(reply) ||
    /(?:số điện thoại|địa chỉ|đặt hàng|thanh toán|thẻ ngân hàng)/iu.test(reply)
  ) reasons.push("CUSTOMER_URL_EXPLANATION_UNVERIFIED_CLAIM");
  const reasonCodes = [...new Set(reasons)];
  return { accepted: reasonCodes.length === 0, reasonCodes };
}
