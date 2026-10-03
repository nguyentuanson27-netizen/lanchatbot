import type { TrackCRequestedObligation, TrackCSelectableEvidence, TrackCResponderTask } from "./track-c-c3-strategy-contract.js";
import { trackCObligationMatchesEvidence } from "./track-c-c3-conversational-guard.js";

export type TrackCObligationOutcome = "ANSWERED" | "BOUNDED_UNAVAILABLE" | "ACTIONED" | "ASK_REQUIRED_INPUT" | "HANDOFF";

export type TrackCObligationResolution = Readonly<{
  obligationId: string;
  kind: TrackCRequestedObligation["kind"];
  capability: TrackCRequestedObligation["capability"];
  scope: TrackCRequestedObligation["scope"];
  subject: Readonly<{ productId: string | null; variantId: string | null; size: string | null; color: string | null;
    component: TrackCRequestedObligation["component"] | null }>;
  status: "SUPPORTED" | "UNSUPPORTED" | "FAILED" | "STALE" | "ACKNOWLEDGED";
  outcome: TrackCObligationOutcome;
  relation: Readonly<{ etaMinDays: number; etaMaxDays: number; deadlineDays: number;
    relation: "ETA_WITHIN_DEADLINE_IF_ESTIMATE_HOLDS" | "ETA_NOT_GUARANTEED_BY_DEADLINE" }> | null;
  evidenceRefs: readonly Readonly<{ ref: string; contentHash: string }>[];
  limitation: Readonly<{ kind: "NO_VERIFIED_EVIDENCE" | "LOOKUP_FAILED" | "STALE_EVIDENCE" }> | null;
}>;

export function trackCResolveObligations(requested: readonly TrackCRequestedObligation[],
  evidence: readonly TrackCSelectableEvidence[], boundProductIds: readonly string[] = []): readonly TrackCObligationResolution[] {
  const resolutions = Object.freeze(requested.map((entry, index) => {
    const shopScope = entry.capability === "POLICY" || entry.capability === "PROMOTION_OFFER";
    const productId = entry.productId ?? (!shopScope && boundProductIds.length === 1 ? boundProductIds[0]! : null);
    const matches = evidence.filter((fact) => trackCObligationMatchesEvidence(
      entry.kind === "PRODUCT_SEARCH" ? entry : { ...entry, productId }, fact));
    const status = entry.kind === "PRODUCT_REJECT" ? "ACKNOWLEDGED" as const
      : entry.lookupStatus ?? (matches.length > 0 ? "SUPPORTED" as const : "UNSUPPORTED" as const);
    return Object.freeze({
      obligationId: entry.id ?? `obligation:${index}:${entry.kind}:${entry.capability ?? "NONE"}:${entry.scope ?? "NONE"}`,
      kind: entry.kind, capability: entry.capability, scope: entry.scope,
      subject: Object.freeze({ productId, variantId: entry.variantId ?? null, size: entry.size ?? null, color: entry.color ?? null,
        component: entry.component ?? null }),
      relation: status !== "SUPPORTED" || entry.scope !== "DELIVERY_DEADLINE" ? null : Object.freeze({
        etaMinDays: matches[0]!.value.minDays as number, etaMaxDays: matches[0]!.value.maxDays as number,
        deadlineDays: entry.deadlineDays!, relation: (matches[0]!.value.maxDays as number) <= entry.deadlineDays!
          ? "ETA_WITHIN_DEADLINE_IF_ESTIMATE_HOLDS" as const : "ETA_NOT_GUARANTEED_BY_DEADLINE" as const,
      }),
      status, outcome: status === "SUPPORTED" ? "ANSWERED" as const
        : status === "ACKNOWLEDGED" ? "ACTIONED" as const : "BOUNDED_UNAVAILABLE" as const,
      evidenceRefs: Object.freeze(matches.map(({ ref, provenance }) => Object.freeze({ ref, contentHash: provenance.contentHash }))),
      limitation: status === "SUPPORTED" || status === "ACKNOWLEDGED" ? null : Object.freeze({
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
  const topic = trackCObligationTopic({ kind: resolution.kind, capability: resolution.capability,
    scope: resolution.scope, productId: resolution.subject.productId });
  const subject = resolution.subject;
  const label = [subject.productId === null ? null : `mẫu ${subject.productId}`,
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
  segments: readonly Readonly<{ kind: string; text: string; claimContentHash?: string }>[]): void {
  if (task.obligationResolutions === undefined) {
    if (task.requestedObligations !== undefined) throw new Error("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
    return;
  }
  const expected = trackCResolveObligations(task.requestedObligations ?? [], task.evidence, boundProductIds);
  if (JSON.stringify(expected) !== JSON.stringify(task.obligationResolutions)) {
    throw new Error("TRACK_C_OBLIGATION_RESOLUTION_INVALID");
  }
  for (const resolution of expected) {
    if (resolution.kind === "FACT_REQUEST" && resolution.subject.productId !== null &&
        !boundProductIds.some((id) => id.toUpperCase() === resolution.subject.productId!.toUpperCase())) {
      throw new Error("TRACK_C_REQUESTED_OBLIGATION_BINDING_INVALID");
    }
    const limitation = trackCObligationOutcomeText(resolution);
    if (limitation !== null && !segments.some((segment) => segment.kind === "GENERAL" && segment.text === limitation)) {
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
  };
  const capabilities: Readonly<Record<string, string>> = {
    PRICE: "giá", STOCK: "tình trạng còn hàng", SIZE_FIT: "độ vừa vặn",
    ETA: "thời gian giao hàng", PRODUCT_ATTRIBUTES: "thuộc tính sản phẩm",
    OFFER_CONFIGURATION: "cấu hình sản phẩm",
    PROMOTION_OFFER: "ưu đãi", POLICY: "chính sách", PRODUCT_COMPARISON: "thuộc tính so sánh",
  };
  return scopes[obligation.scope ?? ""] ?? capabilities[obligation.capability ?? ""] ?? "lựa chọn khác";
}
