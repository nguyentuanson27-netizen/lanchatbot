import type { TrackCRequestedObligation, TrackCSelectableEvidence, TrackCResponderTask } from "./track-c-c3-strategy-contract.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";
import { realtimeCustomerObligationSubjectScope } from "@lana/contracts";
import { trackCConsultationClarification } from "./track-c-c3-consultation.js";

export type TrackCObligationOutcome = "ANSWERED" | "SUPPORTED_RESPONSE" | "BOUNDED_UNAVAILABLE" | "ACTIONED" | "ASK_REQUIRED_INPUT" | "HANDOFF";

export type TrackCObligationResolution = Readonly<{
  obligationId: string;
  kind: TrackCRequestedObligation["kind"];
  capability: TrackCRequestedObligation["capability"];
  scope: TrackCRequestedObligation["scope"];
  decisionConcern?: TrackCRequestedObligation["decisionConcern"];
  clarificationTarget?: string;
  subject: Readonly<{ productId: string | null; variantId: string | null; size: string | null; color: string | null;
    component: TrackCRequestedObligation["component"] | null; subjectScope?: "PRODUCT" | "CART" | "SHOP";
    offerScope?: "FULL_SET" | "TOP" | "BOTTOM" | "TWO_PIECE" | "THREE_PIECE" }>;
  status: "SUPPORTED" | "UNSUPPORTED" | "FAILED" | "STALE" | "ACKNOWLEDGED";
  outcome: TrackCObligationOutcome;
  relation: Readonly<{ etaMinDays: number; etaMaxDays: number; deadlineDays: number;
    relation: "ETA_WITHIN_DEADLINE_IF_ESTIMATE_HOLDS" | "ETA_NOT_GUARANTEED_BY_DEADLINE" }> | null;
  evidenceRefs: readonly Readonly<{ ref: string; contentHash: string }>[];
  limitation: Readonly<{ kind: "NO_VERIFIED_EVIDENCE" | "LOOKUP_FAILED" | "STALE_EVIDENCE" }> | null;
}>;

export function trackCResolveObligations(requested: readonly TrackCRequestedObligation[],
  evidence: readonly TrackCSelectableEvidence[], boundProductIds: readonly string[] = [],
  canonicalRequest: TrackCResponderTask["canonicalRequest"] = null,
  continuation: TrackCResponderTask["continuation"] = null): readonly TrackCObligationResolution[] {
  const resolutions = Object.freeze(requested.map((entry, index) => {
    const subjectScope = realtimeCustomerObligationSubjectScope(entry);
    const productId = entry.productId ?? (subjectScope === "PRODUCT" &&
      (entry.kind === "FACT_REQUEST" || entry.kind === "CONSULTATION") && boundProductIds.length === 1 ? boundProductIds[0]! : null);
    const matches = evidence.filter((fact) => trackCObligationMatchesEvidence(
      entry.kind === "PRODUCT_SEARCH" ? entry : { ...entry, productId }, fact, evidence));
    const status = entry.kind === "PRODUCT_REJECT" ? "ACKNOWLEDGED" as const
      : entry.lookupStatus ?? (matches.length > 0 ? "SUPPORTED" as const : "UNSUPPORTED" as const);
    const clarificationTarget = entry.kind === "CONSULTATION" && status === "UNSUPPORTED"
      ? trackCConsultationClarification({ ...entry, productId }, canonicalRequest, continuation) : null;
    const asksRequiredInput = clarificationTarget !== null || status === "UNSUPPORTED" && entry.kind === "FACT_REQUEST" &&
      ((productId === null && canonicalRequest?.type === "ASK_PRODUCT") ||
       (entry.capability === "SIZE_FIT" && canonicalRequest?.type === "ASK_MEASUREMENTS"));
    return Object.freeze({
      obligationId: entry.id ?? `obligation:${index}:${entry.kind}:${entry.capability ?? "NONE"}:${entry.scope ?? "NONE"}`,
      kind: entry.kind, capability: entry.capability, scope: entry.scope,
      ...(entry.kind !== "CONSULTATION" ? {} : { decisionConcern: entry.decisionConcern ?? "DECISION_CRITERION_UNKNOWN" as const }),
      ...(clarificationTarget === null ? {} : { clarificationTarget }),
      subject: Object.freeze({ productId, variantId: entry.variantId ?? null, size: entry.size ?? null, color: entry.color ?? null,
        component: entry.component ?? null, ...(entry.subjectScope == null ? {} : { subjectScope }),
        ...(entry.offerScope === undefined ? {} : { offerScope: entry.offerScope }) }),
      relation: status !== "SUPPORTED" || entry.scope !== "DELIVERY_DEADLINE" ? null : Object.freeze({
        etaMinDays: matches[0]!.value.minDays as number, etaMaxDays: matches[0]!.value.maxDays as number,
        deadlineDays: entry.deadlineDays!, relation: (matches[0]!.value.maxDays as number) <= entry.deadlineDays!
          ? "ETA_WITHIN_DEADLINE_IF_ESTIMATE_HOLDS" as const : "ETA_NOT_GUARANTEED_BY_DEADLINE" as const,
      }),
      status, outcome: status === "SUPPORTED" ? entry.kind === "CONSULTATION" ? "SUPPORTED_RESPONSE" as const : "ANSWERED" as const
        : status === "ACKNOWLEDGED" ? "ACTIONED" as const
        : asksRequiredInput ? "ASK_REQUIRED_INPUT" as const : "BOUNDED_UNAVAILABLE" as const,
      evidenceRefs: Object.freeze(matches.map(({ ref, provenance }) => Object.freeze({ ref, contentHash: provenance.contentHash }))),
      limitation: status === "SUPPORTED" || status === "ACKNOWLEDGED" || asksRequiredInput ? null : Object.freeze({
        kind: status === "FAILED" ? "LOOKUP_FAILED" as const : status === "STALE" ? "STALE_EVIDENCE" as const : "NO_VERIFIED_EVIDENCE" as const,
      }),
    });
  }));
  if (resolutions.length !== requested.length || new Set(resolutions.map(({ obligationId }) => obligationId)).size !== requested.length) {
    throw new Error("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
  }
  return resolutions;
}

export function trackCLimitationText(resolution: TrackCObligationResolution): string | null {
  if (resolution.limitation === null) return null;
  if (resolution.kind === "CONSULTATION") {
    const concerns: Readonly<Record<NonNullable<TrackCRequestedObligation["decisionConcern"]>, string>> = {
      PRICE_HESITATION: "Thông tin hiện có chưa đủ để kết luận khoản tiền cho mẫu này phù hợp với mức chị muốn chi.",
      FIT_RISK: "Em chưa có đủ cơ sở đã xác nhận để kết luận mẫu này sẽ vừa và phù hợp với chị.",
      TRUST_RISK: "Thông tin hiện có chưa đủ để em kết luận băn khoăn của chị khi mua online đã được giải quyết.",
      USAGE_FREQUENCY: "Em chưa có đủ thông tin về nhu cầu sử dụng để kết luận chị sẽ mặc mẫu này thường xuyên.",
      DECISION_CRITERION_UNKNOWN: "Em chưa thể trả lời đầy đủ phần băn khoăn này của chị.",
    };
    return concerns[resolution.decisionConcern ?? "DECISION_CRITERION_UNKNOWN"];
  }
  const topic = trackCObligationTopic({ kind: resolution.kind, capability: resolution.capability,
    scope: resolution.scope, productId: resolution.subject.productId });
  const subject = resolution.subject;
  const label = [subject.productId === null ? null : `mẫu ${subject.productId}`,
    subject.offerScope === "THREE_PIECE" ? "cấu hình ba món" : subject.offerScope === "TWO_PIECE" ? "cấu hình hai món"
      : subject.component === "TOP" ? "phần áo" : subject.component === "BOTTOM" ? "phần dưới" : subject.component === "FULL_SET" ? "nguyên bộ" : null,
    subject.size === null ? null : `size ${subject.size}`, subject.color === null ? null : `màu ${subject.color}`].filter(Boolean).join(" ");
  return `Em chưa có thông tin xác nhận về ${topic}${label ? ` của ${label}` : ""}.`;
}

export function trackCLimitationTexts(task: TrackCResponderTask): readonly string[] {
  return (task.obligationResolutions ?? []).flatMap((resolution) => {
    const text = trackCLimitationText(resolution);
    return text === null ? [] : [text];
  });
}

export function trackCObligationOutcomeText(resolution: TrackCObligationResolution): string | null {
  const limitation = trackCLimitationText(resolution);
  if (limitation !== null) return limitation;
  if (resolution.kind === "CONSULTATION") {
    if (resolution.outcome === "ASK_REQUIRED_INPUT") {
      return resolution.decisionConcern === "USAGE_FREQUENCY" ? "Để tư vấn phần này, em cần biết nhu cầu mặc thực tế của chị."
        : resolution.decisionConcern === "FIT_RISK" ? "Để tư vấn độ vừa, em cần thông tin còn thiếu của chị."
        : "Để tư vấn phần này, em cần biết tiêu chí chị còn cân nhắc.";
    }
    if (resolution.outcome === "SUPPORTED_RESPONSE") {
      return resolution.decisionConcern === "FIT_RISK" ? "Em gửi thông tin tư vấn size đã xác nhận để chị cân nhắc độ vừa."
        : resolution.decisionConcern === "TRUST_RISK" ? "Em gửi chính sách đã xác nhận để chị cân nhắc khi mua online."
        : resolution.decisionConcern === "USAGE_FREQUENCY" ? "Chị đối chiếu thông tin dịp sử dụng đã xác nhận dưới đây với nhu cầu mặc của mình nhé."
        : "Em gửi thông tin lựa chọn đã xác nhận để chị cân nhắc khoản chi.";
    }
  }
  if (resolution.kind === "PRODUCT_REJECT") {
    return resolution.subject.productId === null ? "Dạ em ghi nhận chị không chọn mẫu đang xem."
      : `Dạ em ghi nhận chị không chọn mẫu ${resolution.subject.productId}.`;
  }
  if (resolution.relation !== null) {
    return resolution.relation.relation === "ETA_WITHIN_DEADLINE_IF_ESTIMATE_HOLDS"
      ? "Khoảng giao dự kiến nằm trong hạn chị cần nếu ước tính này giữ đúng; đây chưa phải cam kết ngày nhận."
      : "Khoảng giao dự kiến này không bảo đảm kịp hạn chị cần.";
  }
  return null;
}

export function trackCOutcomeTexts(task: TrackCResponderTask): readonly string[] {
  return (task.obligationResolutions ?? []).flatMap((resolution) => {
    const value = trackCObligationOutcomeText(resolution);
    return value === null ? [] : [value];
  });
}

/** The existing final guard consumes code resolutions, never a model status
 * or a grammatical assertion that a limitation is safe. */
export function assertTrackCResolutionCoverage(task: TrackCResponderTask, boundProductIds: readonly string[],
  segments: readonly Readonly<{ kind: string; text: string; claimContentHash?: string; target?: string; obligationId?: string | undefined }>[]): void {
  const labeled = segments.filter(({ obligationId }) => obligationId !== undefined);
  if (task.obligationResolutions === undefined) {
    if (task.requestedObligations !== undefined || labeled.length > 0) throw new Error("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
    return;
  }
  const expected = trackCResolveObligations(task.requestedObligations ?? [], task.evidence, boundProductIds, task.canonicalRequest, task.continuation);
  if (JSON.stringify(expected) !== JSON.stringify(task.obligationResolutions)) {
    throw new Error("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
  }
  const consultations = expected.filter(({ kind }) => kind === "CONSULTATION");
  const consultationIds = new Set(consultations.map(({ obligationId }) => obligationId));
  if (labeled.length !== consultations.length || new Set(labeled.map(({ obligationId }) => obligationId)).size !== labeled.length ||
      labeled.some((segment) => segment.kind !== "GENERAL" || !consultationIds.has(segment.obligationId!) || segment.text.trim().length === 0)) {
    throw new Error("TRACK_C_RESPONDER_CONSULTATION_INVALID");
  }
  for (const resolution of expected) {
    const ordinaryClarification = resolution.clarificationTarget !== undefined && task.continuation?.type === "ASK" &&
      task.continuation.input === resolution.clarificationTarget;
    // The existing Responder progression slot owns wording and cardinality.
    // Reuse its final handoff rather than infer a question from prose here.
    const clarification = ordinaryClarification ? segments.at(-1)?.kind === "GENERAL" &&
      segments.at(-1)?.obligationId === undefined && Boolean(segments.at(-1)?.text.trim())
      : segments.some((segment) => segment.kind === "CLARIFICATION" &&
        segment.target === (task.canonicalRequest?.type === "ASK_PRODUCT" ? "PRODUCT" : "MEASUREMENTS"));
    if (resolution.outcome === "ASK_REQUIRED_INPUT" && !clarification) {
      throw new Error("TRACK_C_RESPONDER_REQUIRED_INPUT_REQUIRED");
    }
    if ((resolution.kind === "FACT_REQUEST" || resolution.kind === "CONSULTATION") && resolution.subject.productId !== null &&
        !boundProductIds.some((id) => id.toUpperCase() === resolution.subject.productId!.toUpperCase())) {
      throw new Error("TRACK_C_REQUESTED_OBLIGATION_BINDING_INVALID");
    }
    const limitation = trackCObligationOutcomeText(resolution);
    if (limitation !== null && !segments.some((segment) => segment.kind === "GENERAL" && segment.text === limitation &&
        (resolution.kind !== "CONSULTATION" || segment.obligationId === resolution.obligationId))) {
      throw new Error("TRACK_C_RESPONDER_LIMIT_REQUIRED");
    }
    if (resolution.evidenceRefs.some(({ contentHash }) => !segments.some((segment) =>
      segment.kind === "VERIFIED_CLAIM" && segment.claimContentHash === contentHash))) {
      throw new Error("TRACK_C_RESPONDER_OBLIGATION_FACT_REQUIRED");
    }
  }
}

/** Code-owned topic labels carry no factual value or effect permission. */
export function trackCObligationTopic(obligation: TrackCRequestedObligation): string {
  const scopes: Readonly<Record<string, string>> = {
    WRINKLE_RESISTANCE: "khả năng chống nhăn", MATERIALS: "chất liệu",
    COLORS: "màu", STYLES: "kiểu dáng", SILHOUETTE: "phom dáng", OCCASION: "dịp sử dụng",
    STRETCH: "độ co giãn", OPACITY: "độ xuyên thấu", LINING: "lớp lót",
    BREATHABILITY: "độ thoáng", CARE_INSTRUCTIONS: "cách chăm sóc",
    FULL_SET: "cấu hình nguyên bộ", TOP: "cấu hình áo", BOTTOM: "cấu hình phần dưới",
    TWO_PIECE: "cấu hình hai món", THREE_PIECE: "cấu hình ba món",
    SMOOTHNESS: "độ mịn", WEIGHT: "trọng lượng", COMFORT: "độ thoải mái",
    DISPATCH_TIME: "thời điểm shop gửi hàng", DELIVERY_DEADLINE: "khả năng đáp ứng hạn nhận hàng",
    CUSTOMER_OFFER: "mức chị đề xuất", FUTURE_PROMOTION: "ưu đãi tương lai",
    COMPARATIVE_PROPERTY: "thuộc tính so sánh",
    CHEAPER: "so sánh giá", WAIST_CONSTRUCTION: "cấu tạo cạp",
    SPLIT_SIZE: "chính sách phối size", ALTERATION: "chính sách sửa đồ",
  };
  const capabilities: Readonly<Record<string, string>> = {
    PRICE: "giá", STOCK: "tình trạng còn hàng", SIZE_FIT: "độ vừa vặn",
    ETA: "thời gian giao hàng", PRODUCT_ATTRIBUTES: "thuộc tính sản phẩm",
    OFFER_CONFIGURATION: "cấu hình sản phẩm",
    PROMOTION_OFFER: "ưu đãi", POLICY: "chính sách", PRODUCT_COMPARISON: "thuộc tính so sánh",
    SHIPPING_FEE: "phí giao hàng", FREESHIP: "miễn phí giao hàng", CART_TOTAL: "tổng tiền giỏ hàng",
    PRODUCT_MEDIA: "hình ảnh sản phẩm", PRODUCT_PRESENTATION: "thông tin sản phẩm",
    CARE_GUIDANCE: "cách chăm sóc", BUSINESS_LOCATION: "địa điểm và giờ hoạt động của shop",
    FULFILLMENT_STATUS: "trạng thái xử lý đơn", PRODUCT_LIFECYCLE: "tình trạng sản xuất sản phẩm",
  };
  return scopes[obligation.scope ?? ""] ?? capabilities[obligation.capability ?? ""] ?? "lựa chọn khác";
}
