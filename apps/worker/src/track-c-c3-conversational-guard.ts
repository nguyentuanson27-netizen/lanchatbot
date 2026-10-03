import type { ContextV2, RealtimeCustomerInput } from "@lana/contracts";
import type { ShadowContextMessage } from "@lana/database";
import type {
  TrackCRequestedObligation,
  TrackCResponderTask,
  TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";
import { trackCOutcomeTexts } from "./track-c-c3-obligation-resolution.js";

/** Only the compiler/runtime can supply this context, never the output schema.
 * These references authorize no fact, fit advice, cart change or other effect. */
export type TrackCConversationGuardContext = Readonly<{
  task: TrackCResponderTask;
  dialogue: readonly ShadowContextMessage[];
  customerVariant?: RealtimeCustomerInput["variant"];
}>;

type NonFactStatement = "CUSTOMER_PRICE_REFERENCE" | "CUSTOMER_SIZE_SELECTION" |
  "PRODUCT_REFERENCE" | "LOCALITY_REQUEST" | "BOUNDED_UNCERTAINTY" | "CODE_OWNED_OUTCOME";

function folded(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d").toLowerCase().replace(/\s+/gu, " ").trim();
}

function body(value: string): string {
  return folded(value).replace(/^da[, ]+/u, "").replace(/[.!?;]$/u, "")
    .replace(/ (?:a|nhe|nha)$/u, "").trim();
}

// Formatting recognition only. A reference must repeat a complete source
// token; no currency conversion, price approval or budget inference occurs.
function amountTokens(value: string): readonly string[] {
  return [...folded(value).matchAll(/(?<![a-z0-9])\d[\d.,]{0,14}\s*(?:k|nghin|trieu|vnd|dong|d|₫)(?![a-z0-9])/gu)]
    .map(([token]) => token.replace(/\s+/gu, ""));
}

/** Closed request grammar contains no recipient values or address slot.
 * Full equality, not substring masking, is required before the DLP boundary. */
export function trackCPiiFreeLocalityRequest(value: unknown, task: TrackCResponderTask): value is string {
  if (typeof value !== "string" || value.length > 200 ||
      task.continuation?.type !== "ASK" || task.continuation.input !== "LOCALITY") return false;
  return /^chi (?:cho em (?:biet|xin) |(?:muon nhan hang )?o )tinh (?:hoac|hay|\/) thanh pho(?: nao)?(?: nhan hang)?(?: de em kiem tra (?:giao hang|eta))?$/u.test(body(value));
}

function classify(value: string, context: ContextV2,
  source: TrackCConversationGuardContext | null): NonFactStatement | null {
  if (source === null) return null;
  const phrase = body(value);
  if (source.task.obligationResolutions !== undefined && trackCOutcomeTexts(source.task).includes(value.trim())) {
    return "CODE_OWNED_OUTCOME";
  }
  if (source.task.obligationResolutions === undefined && closedTopicUncertainty(value, context)) return "BOUNDED_UNCERTAINTY";
  if (trackCPiiFreeLocalityRequest(value, source.task)) return "LOCALITY_REQUEST";
  const referent = /^mau ([a-z]{1,6}\d{1,8}[a-z0-9]*|nay) chi dang xem$/u.exec(phrase)?.[1];
  if (referent && context.productBinding.status === "RESOLVED" &&
      (referent === "nay" ? context.productBinding.productIds.length === 1 :
        context.productBinding.productIds.some((id) => folded(id) === referent))) return "PRODUCT_REFERENCE";
  const latest = [...source.dialogue].reverse().find(({ direction, senderType, messageType }) =>
    direction === "INBOUND" && senderType === "CUSTOMER" && messageType === "TEXT")?.text ?? "";
  const amounts = amountTokens(value);
  if (amounts.length === 1 && amountTokens(latest).includes(amounts[0]!)) {
    // Substitute just the source-bound numeric token. The remaining entire
    // sentence must be a reference/refusal, never a shop price declaration.
    const shape = phrase.replace(/\d[\d.,]{0,14}\s*(?:k|nghin|trieu|vnd|dong|d|₫)(?![a-z0-9])/u, "AMOUNT");
    if (shape === "AMOUNT la muc chi de xuat" || shape === "AMOUNT la muc chi nhac den" ||
        /^em chua (?:the )?xac nhan (?:gia|muc gia|muc) AMOUNT chi de xuat$/u.test(shape)) {
      return "CUSTOMER_PRICE_REFERENCE";
    }
  }
  const size = /^chi (?:da )?chon (?:size )?([a-z0-9]+)$/u.exec(phrase)?.[1];
  const variant = source.customerVariant;
  if (size && variant && variant.operation !== "NONE" && variant.size && variant.productId &&
      context.productBinding.status === "RESOLVED" && context.productBinding.productIds.includes(variant.productId) &&
      folded(variant.size) === size && variant.evidenceText && latest.normalize("NFC").includes(variant.evidenceText.normalize("NFC")) &&
      folded(variant.evidenceText).split(/[^a-z0-9]+/u).includes(size)) return "CUSTOMER_SIZE_SELECTION";
  return null;
}

/** Exempt only a complete non-fact segment from keyword-level claim checks.
 * Mixed uncertainty receives no exemption; mixed customer-reference prose is
 * rejected to prevent implicit claims inheriting its price/size/subject.
 * Factual segments NEVER use this projection. */
export function trackCUnclassifiedConversation(value: string, context: ContextV2,
  source: TrackCConversationGuardContext | null = null): string {
  if (source !== null && trackCOutcomeTexts(source.task).includes(value.trim())) return "";
  const classes = sentences(value).map((sentence) => classify(sentence, context, source));
  if (classes.some((kind) => kind !== null)) {
    // Mixed uncertainty receives NO exemption. In particular a following
    // request or an independent effect/claim must still cross the original
    // guards. Customer references are stricter: an implicit following claim
    // could inherit their price/size/product without repeating the token.
    if (classes.some((kind) => kind === null) &&
        classes.every((kind) => kind === null || kind === "BOUNDED_UNCERTAINTY")) return value;
    if (classes.some((kind) => kind === null) ||
        classes.filter((kind) => kind === "LOCALITY_REQUEST").length > 1) {
      throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
    }
    return "";
  }
  return value;
}

const ATTRIBUTE_SCOPE_FIELD = Object.freeze({
  MATERIALS: "materials",
  COLORS: "colors",
  STYLES: "styles",
  SILHOUETTE: "silhouettes",
  OCCASION: "occasions",
  WRINKLE_RESISTANCE: "wearWrinkleResistance",
  STRETCH: "wearStretch",
  OPACITY: "wearOpacity",
  LINING: "wearLining",
  BREATHABILITY: "wearBreathability",
  CARE_INSTRUCTIONS: "careInstructions",
  WAIST_CONSTRUCTION: "design.waist",
} as const);

export function trackCObligationMatchesEvidence(
  obligation: TrackCRequestedObligation,
  evidence: TrackCSelectableEvidence,
): boolean {
  if (obligation.kind === "PRODUCT_SEARCH") {
    // Discovery/price does not prove shape or an avoidance criterion. Keep
    // this request bounded until the same candidate has verified attributes.
    if (obligation.criteria !== undefined) return false;
    return obligation.lookupStatus === undefined && evidence.subject?.productId !== undefined &&
      evidence.subject.productId !== obligation.productId && ["PRICE", "PRODUCT_PRESENTATION"].includes(evidence.capability);
  }
  if (obligation.lookupStatus !== undefined || obligation.kind !== "FACT_REQUEST" ||
      obligation.capability === null ||
      evidence.capability !== obligation.capability) return false;
  if (obligation.capability === "PRODUCT_COMPARISON" && obligation.scope === "CHEAPER") {
    const ids = evidence.value.productIds;
    return obligation.productId !== null && obligation.relatedProductId !== undefined &&
      Array.isArray(ids) && ids.length === 2 && new Set(ids).size === 2 &&
      ids.includes(obligation.productId) && ids.includes(obligation.relatedProductId) &&
      typeof evidence.value.differenceVnd === "number" && evidence.value.differenceVnd >= 0 &&
      Array.isArray(evidence.value.sourceClaimHashes) && evidence.value.sourceClaimHashes.length === 2;
  }
  if (obligation.productId === null && evidence.subject?.productId !== undefined) return false;
  if (obligation.productId !== null) {
    const evidenceProductId = evidence.subject?.productId;
    if (evidenceProductId === undefined ||
        evidenceProductId.normalize("NFC").toLocaleUpperCase("vi-VN") !==
        obligation.productId.normalize("NFC").toLocaleUpperCase("vi-VN")) {
      return false;
    }
  }
  if (obligation.variantId !== undefined && evidence.subject?.variantId !== obligation.variantId) return false;
  if (obligation.size !== undefined && evidence.subject?.variantLabel?.size?.toLocaleUpperCase("vi-VN") !==
      obligation.size.toLocaleUpperCase("vi-VN")) return false;
  if (obligation.component !== undefined && evidence.value.component !== obligation.component) return false;
  if (obligation.capability === "STOCK" && obligation.component === undefined &&
      ["TOP", "BOTTOM"].includes(String(evidence.value.component))) return false;
  if (obligation.color !== undefined && !(obligation.capability === "PRODUCT_ATTRIBUTES" && obligation.scope === "COLORS") &&
      evidence.subject?.variantLabel?.color?.toLocaleUpperCase("vi-VN") !==
      obligation.color.toLocaleUpperCase("vi-VN")) return false;
  if (obligation.scope === null) return true;
  if (obligation.capability === "PRODUCT_ATTRIBUTES") {
    const field = ATTRIBUTE_SCOPE_FIELD[
      obligation.scope as keyof typeof ATTRIBUTE_SCOPE_FIELD
    ];
    return (field !== undefined && Object.hasOwn(evidence.value, field)) ||
      (obligation.scope === "SILHOUETTE" && Object.hasOwn(evidence.value, "design.silhouette"));
  }
  if (obligation.capability === "OFFER_CONFIGURATION") {
    return evidence.value.offerScope === obligation.scope;
  }
  if (obligation.capability === "ETA" && obligation.scope === "DELIVERY_DEADLINE") {
    return Number.isInteger(obligation.deadlineDays) && obligation.deadlineDays! >= 0 &&
      Number.isInteger(evidence.value.minDays) && Number.isInteger(evidence.value.maxDays) &&
      (evidence.value.minDays as number) >= 0 && (evidence.value.maxDays as number) >= (evidence.value.minDays as number);
  }
  return false;
}

/** Typed semantic admission: the compiler already knows the requested
 * capability/scope. Never infer that scope back from Vietnamese prose. */
export function assertTrackCRequestedObligationCoverage(
  requested: readonly TrackCRequestedObligation[],
  available: readonly TrackCSelectableEvidence[],
  selected: readonly TrackCSelectableEvidence[],
): void {
  const answers = requested.filter(({ kind }) => kind === "FACT_REQUEST" || kind === "PRODUCT_SEARCH");
  if (answers.length === 0) return;
  if (selected.some((entry) => !answers.some((obligation) => trackCObligationMatchesEvidence(obligation, entry)))) {
    throw new Error("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
  }
  for (const obligation of answers) {
    const hasAvailable = available.some((entry) =>
      trackCObligationMatchesEvidence(obligation, entry)
    );
    if (hasAvailable && !selected.some((entry) =>
      trackCObligationMatchesEvidence(obligation, entry)
    )) {
      throw new Error("TRACK_C_STRATEGIST_REQUEST_COVERAGE_INVALID");
    }
  }
}

function sentences(value: string): readonly string[] {
  return value.split(/(?<=[.!?;])(?:\s+|$)|\r?\n/u).filter((text) => text.trim());
}

/** A whole epistemic clause, not a negated product/effect assertion. Numeric
 * values, unbound identifiers, independent predicates and concrete promises
 * are outside this finite grammar and retain the conservative guard. */
function trackCIsBoundedUncertainty(value: string, context: ContextV2): boolean {
  let clause = body(value);
  if (!/^(?:phan nay )?(?:(?:em|shop|ben em|hien tai|hien) )?(?:chua|khong) (?:co (?:du )?(?:thong tin|du lieu|xac nhan)|(?:the )?xac nhan(?: duoc)?|xac dinh(?: duoc)?) /u.test(clause)) return false;
  // Only exact canonical product tokens may be treated as referents here.
  clause = clause.replace(/[a-z0-9_-]+/gu, (token) =>
    context.productBinding.status === "RESOLVED" &&
    context.productBinding.productIds.some((id) => folded(id) === token) ? "product" : token);
  if (/[\d%₫,:;.!?\n]/u.test(clause) || /\b(?:nhung|va|nen|vi vay|tuy nhien|dong thoi|chac chan|cam ket|dam bao|hom nay|ngay mai)\b/u.test(clause)) return false;
  // "the time the shop will dispatch" is an unconfirmed event, not an
  // assertion that dispatch will occur. Nothing after that event can promise
  // timing, approve a price or append another effect.
  clause = clause.replace(/\b(?:ngay|thoi diem) (?:shop|ben em|em) se gui(?: hang| product)?(?: cho chi)?$/u, "dispatch-time");
  return !/\b(?:se|da|vua)\b/u.test(clause);
}


/** Closed nominal grammar, not a growing blacklist of ways to join claims.
 * Only these finite unsupported topics can bypass keyword-level checks.
 * Unknown topics retain the legacy guard; no arbitrary trailing predicate
 * becomes safe merely by starting with "not confirmed". */
function nominalTopic(value: string): boolean {
  return /^(?:(?:kha nang )?chong nhan|do nhan|do min|trong luong|(?:vai|chat lieu) co de nhan(?: khi ngoi lau| hay khong)?|(?:ngay|lich|thoi diem) (?:(?:shop|ben em|em) )?(?:se )?gui(?: hang| product)?(?: cho chi)?)(?: cua (?:mau )?(?:nay|product))?$/u.test(value);
}

function closedTopicUncertainty(value: string, context: ContextV2): boolean {
  if (!trackCIsBoundedUncertainty(value, context)) return false;
  const normalized = body(value).replace(/[a-z0-9_-]+/gu, (token) =>
    context.productBinding.status === "RESOLVED" &&
    context.productBinding.productIds.some((id) => folded(id) === token) ? "product" : token);
  const topic = normalized.replace(/^(?:phan nay )?(?:(?:em|shop|ben em|hien tai|hien) )?(?:chua|khong) (?:co (?:du )?(?:thong tin|du lieu|xac nhan)|(?:the )?xac nhan(?: duoc)?|xac dinh(?: duoc)?)(?: (?:de )?xac nhan)?(?: ve)?\s*/u, "");
  return nominalTopic(topic);
}

/** Legacy callers without typed requests receive an explicit completeness limit. */
export function trackCRecoveryLimitation(task: TrackCResponderTask): string | null {
  return task.obligationResolutions !== undefined ? null : "Em chưa xác nhận được đầy đủ thông tin chị hỏi.";
}
