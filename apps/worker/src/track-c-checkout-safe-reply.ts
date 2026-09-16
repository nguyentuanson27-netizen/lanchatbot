import type {
  ContextV2,
  ContextV2CandidateOutputV2,
} from "@lana/contracts";

type CheckoutRenderContext = Pick<
  ContextV2,
  "checkoutCompleteness" | "phase" | "buyingIntent"
>;

type CanonicalActionContext = Pick<
  ContextV2,
  | "checkoutCompleteness"
  | "phase"
  | "buyingIntent"
  | "productBinding"
  | "barriers"
>;

type CheckoutRenderOutput = Pick<
  ContextV2CandidateOutputV2,
  "segments" | "strategy" | "cta"
>;

type CheckoutField = NonNullable<
  ContextV2["checkoutCompleteness"]
>["missingFields"][number];

export type TrackCCanonicalActionSelection = Readonly<{
  type:
    | "NONE"
    | "ASK_PRODUCT"
    | "ASK_MEASUREMENTS"
    | "ASK_CHECKOUT_DETAILS"
    | "HOLD_POSITION";
  requestedFields: readonly CheckoutField[];
}>;

export type TrackCOrdinaryNextMoveSelection = Readonly<{
  action: "ASK" | "NONE";
  target: string;
}>;

export type TrackCCanonicalActionConstraints = Readonly<{
  allowedTypes: readonly TrackCCanonicalActionSelection["type"][];
  checkoutRequestedFields: readonly CheckoutField[];
}>;

const LEGACY_CHECKOUT_FIELDS = Object.freeze([
  "FULL_NAME",
  "PHONE",
  "ADDRESS",
] as const satisfies readonly CheckoutField[]);

const CHECKOUT_RECIPIENT_PII_TERMS = Object.freeze([
  "họ tên",
  "họ và tên",
  "tên đầy đủ",
  "tên người nhận",
  "số điện thoại",
  "điện thoại",
  "sđt",
  "sdt",
  "địa chỉ nhận hàng",
  "địa chỉ giao hàng",
  "thông tin nhận hàng",
  "full_name",
  "recipient name",
  "phone",
  "phone number",
  "delivery address",
  "shipping address",
] as const);

const GENERIC_ADDRESS_TERMS = Object.freeze([
  "địa chỉ",
  "address",
] as const);

const SHOP_ADDRESS_TERMS = Object.freeze([
  "shop",
  "store",
  "cửa hàng",
  "lana store",
] as const);

const REQUEST_CUES = Object.freeze([
  "cho em",
  "gửi em",
  "chị gửi",
  "chị cho",
  "mình gửi",
  "mình cho",
  "cung cấp",
  "giúp em",
] as const);

function checkoutFieldLabel(field: CheckoutField): string {
  switch (field) {
    case "FULL_NAME":
      return "họ tên";
    case "PHONE":
      return "số điện thoại";
    case "ADDRESS":
      return "địa chỉ nhận hàng";
    case "PAYMENT_METHOD":
      return "phương thức thanh toán";
  }
}

function joinVi(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} và ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} và ${items.at(-1)}`;
}

function rawReply(output: CheckoutRenderOutput): string {
  return output.segments.map(({ text }) => text).join("\n");
}

function isCheckoutRequestDeclared(output: CheckoutRenderOutput): boolean {
  return output.cta === "ASK_CHECKOUT_DETAILS" || output.segments.some((segment) =>
    (segment.kind === "CLARIFICATION" && segment.target === "CHECKOUT_DETAILS") ||
    (segment.kind === "ACTION_REQUEST" &&
      segment.action === "PROVIDE_CHECKOUT_DETAILS")
  );
}

function mentionsShopAddress(text: string): boolean {
  const hasAddress = GENERIC_ADDRESS_TERMS.some((term) => text.includes(term));
  return hasAddress && SHOP_ADDRESS_TERMS.some((term) => text.includes(term));
}

function mentionsCheckoutPii(text: string): boolean {
  if (CHECKOUT_RECIPIENT_PII_TERMS.some((term) => text.includes(term))) {
    return true;
  }
  if (!GENERIC_ADDRESS_TERMS.some((term) => text.includes(term))) return false;
  return !mentionsShopAddress(text);
}

function containsCheckoutPiiRequest(text: string): boolean {
  const clauses = text.match(/[^.!?\n]+[.!?]?/gu) ?? [text];
  return clauses.some((clause) => {
    const normalized = clause.trim();
    if (!mentionsCheckoutPii(normalized)) return false;
    const imperative = /^(?:(?:chị|mình)\s+)?(?:vui lòng\s+)?(?:nhập|điền|để lại)\b/u
      .test(normalized);
    return normalized.endsWith("?") || imperative || REQUEST_CUES.some((cue) =>
      normalized.includes(cue)
    );
  });
}

function assertNoUndeclaredCheckoutRequest(output: CheckoutRenderOutput): void {
  if (isCheckoutRequestDeclared(output)) return;
  for (const segment of output.segments) {
    const text = segment.text.normalize("NFC").toLocaleLowerCase("vi-VN");
    const requestSegment = segment.kind === "CLARIFICATION" ||
      segment.kind === "ACTION_REQUEST";
    if ((requestSegment && mentionsCheckoutPii(text)) ||
        containsCheckoutPiiRequest(text)) {
      throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
    }
  }
}

function assertNoUnauthorizedEffectClaim(output: CheckoutRenderOutput): void {
  for (const segment of output.segments) {
    const text = segment.text.normalize("NFC");
    if (/\basset[_-][\p{L}\p{N}_-]+\b/iu.test(text)) {
      throw new Error("TRACK_C_INTERNAL_TOKEN_LEAK");
    }
    const normalized = text.toLocaleLowerCase("vi-VN");
    if (/\bem\s+(?:đã\s+)?(?:gửi|đính kèm)\s+(?:chị|mình)\b/u.test(normalized)) {
      throw new Error("TRACK_C_UNAUTHORIZED_EFFECT_CLAIM");
    }
  }
}

function permittedCheckoutFields(
  context: CheckoutRenderContext,
): readonly CheckoutField[] | null {
  const completeness = context.checkoutCompleteness;
  if (completeness !== null && completeness !== undefined) {
    return completeness.state === "REQUIRED"
      ? completeness.missingFields
      : null;
  }
  const legacyCheckoutPermitted = context.phase.phase === "ORDER_REVIEW" &&
    context.phase.sourceStage === "ORDER_PREVIEW" &&
    context.buyingIntent.decision === "COMMITTED" &&
    context.buyingIntent.requestedAction === "PROCEED_TO_PAYMENT";
  return legacyCheckoutPermitted ? LEGACY_CHECKOUT_FIELDS : null;
}

function productClarificationPermitted(context: CanonicalActionContext): boolean {
  return context.productBinding.status === "UNRESOLVED" ||
    context.productBinding.status === "AMBIGUOUS" ||
    context.productBinding.status === "STALE" ||
    context.barriers.active.includes("PRODUCT_CONTEXT_UNREADY");
}

function holdPositionPermitted(context: CanonicalActionContext): boolean {
  return context.phase.phase === "ORDER_CONFIRMED" ||
    context.phase.sourceStage === "PURCHASE_CONFIRMED";
}

export function trackCCanonicalActionConstraints(
  context: CanonicalActionContext,
): TrackCCanonicalActionConstraints {
  const allowedTypes: TrackCCanonicalActionSelection["type"][] = ["NONE"];
  if (productClarificationPermitted(context)) allowedTypes.push("ASK_PRODUCT");
  if (context.barriers.active.includes("MEASUREMENTS_REQUIRED")) {
    allowedTypes.push("ASK_MEASUREMENTS");
  }
  const checkoutRequestedFields = permittedCheckoutFields(context) ?? [];
  if (checkoutRequestedFields.length > 0) {
    allowedTypes.push("ASK_CHECKOUT_DETAILS");
  }
  if (holdPositionPermitted(context)) allowedTypes.push("HOLD_POSITION");
  return Object.freeze({
    allowedTypes: Object.freeze(allowedTypes),
    checkoutRequestedFields: Object.freeze([...checkoutRequestedFields]),
  });
}

export function assertTrackCOrdinaryNextMoveSafe(
  nextMove: TrackCOrdinaryNextMoveSelection,
): void {
  if (nextMove.action !== "ASK") return;
  const target = nextMove.target.normalize("NFC").toLocaleLowerCase("vi-VN");
  if (mentionsCheckoutPii(target)) {
    throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  }
  const paymentPreference = /\b(?:payment method|payment preference|cod|bank transfer|chuyển khoản)\b/u
    .test(target);
  if (!paymentPreference && (/\s(?:or|and|hoặc|và)\s/u.test(target) || target.includes("/"))) {
    throw new Error("TRACK_C_MULTIPLE_NEXT_MOVE_TARGETS");
  }
}

export function assertTrackCCanonicalActionPermitted(
  context: CanonicalActionContext,
  action: TrackCCanonicalActionSelection,
): void {
  const constraints = trackCCanonicalActionConstraints(context);
  if (!constraints.allowedTypes.includes(action.type)) {
    throw new Error("TRACK_C_CANONICAL_ACTION_NOT_PERMITTED");
  }
  if (action.type === "ASK_CHECKOUT_DETAILS" &&
      JSON.stringify(action.requestedFields) !==
        JSON.stringify(constraints.checkoutRequestedFields)) {
    throw new Error("TRACK_C_CANONICAL_ACTION_NOT_PERMITTED");
  }
}

function assertDeclaredCheckoutRequest(
  output: CheckoutRenderOutput,
  permittedFields: readonly CheckoutField[],
): void {
  const checkoutClarifications = output.segments.filter((segment) =>
    segment.kind === "CLARIFICATION" && segment.target === "CHECKOUT_DETAILS"
  );
  const checkoutActions = output.segments.filter((segment) =>
    segment.kind === "ACTION_REQUEST" &&
    segment.action === "PROVIDE_CHECKOUT_DETAILS"
  );
  const otherRequests = output.segments.filter((segment) =>
    (segment.kind === "CLARIFICATION" &&
      segment.target !== "CHECKOUT_DETAILS") ||
    (segment.kind === "ACTION_REQUEST" &&
      segment.action !== "PROVIDE_CHECKOUT_DETAILS")
  );
  if (output.strategy !== "ASK_CLARIFICATION" ||
      output.cta !== "ASK_CHECKOUT_DETAILS" ||
      checkoutClarifications.length !== 1 || checkoutActions.length !== 1 ||
      otherRequests.length > 0 ||
      checkoutActions[0]?.requestedFields === undefined ||
      JSON.stringify(checkoutActions[0].requestedFields) !==
        JSON.stringify(permittedFields)) {
    throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  }
}

/**
 * User-visible checkout boundary. The model owns the conversational action;
 * code only constrains checkout data collection to canonical permitted fields
 * and rejects checkout requests hidden inside a non-checkout action.
 */
export function renderTrackCCheckoutSafeReply(
  context: CheckoutRenderContext,
  output: CheckoutRenderOutput,
): string {
  assertNoUnauthorizedEffectClaim(output);
  const checkoutRequested = isCheckoutRequestDeclared(output);
  if (!checkoutRequested) {
    assertNoUndeclaredCheckoutRequest(output);
    return rawReply(output);
  }

  const permittedFields = permittedCheckoutFields(context);
  if (permittedFields === null) {
    throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  }
  assertDeclaredCheckoutRequest(output, permittedFields);

  const fields = permittedFields.map(checkoutFieldLabel);
  return [
    "Em cần thêm thông tin nhận hàng còn thiếu để tiếp tục ạ.",
    `Chị cho em xin ${joinVi(fields)} nhé.`,
  ].join("\n");
}
