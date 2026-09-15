import type {
  ContextV2,
  ContextV2CandidateOutputV2,
} from "@lana/contracts";

type CheckoutRenderContext = Pick<ContextV2, "checkoutCompleteness">;

type CheckoutRenderOutput = Pick<
  ContextV2CandidateOutputV2,
  "segments" | "strategy" | "cta"
>;

type CheckoutField = NonNullable<
  ContextV2["checkoutCompleteness"]
>["missingFields"][number];

const CHECKOUT_REQUEST_TERMS = Object.freeze([
  "họ tên",
  "họ và tên",
  "tên đầy đủ",
  "tên người nhận",
  "số điện thoại",
  "điện thoại",
  "sđt",
  "sdt",
  "địa chỉ nhận hàng",
  "địa chỉ",
  "thông tin nhận hàng",
  "phương thức thanh toán",
  "hình thức thanh toán",
  "cod",
  "chuyển khoản",
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

function mentionsCheckoutField(text: string): boolean {
  return CHECKOUT_REQUEST_TERMS.some((term) => text.includes(term));
}

function containsCheckoutRequest(text: string): boolean {
  const clauses = text.match(/[^.!?\n]+[.!?]?/gu) ?? [text];
  return clauses.some((clause) => {
    const normalized = clause.trim();
    if (!mentionsCheckoutField(normalized)) return false;
    return normalized.endsWith("?") || REQUEST_CUES.some((cue) =>
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
    if ((requestSegment && mentionsCheckoutField(text)) ||
        containsCheckoutRequest(text)) {
      throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
    }
  }
}

/**
 * User-visible checkout boundary. The model owns the conversational action;
 * code only constrains checkout data collection to canonical missing fields
 * and rejects checkout requests hidden inside a non-checkout action.
 */
export function renderTrackCCheckoutSafeReply(
  context: CheckoutRenderContext,
  output: CheckoutRenderOutput,
): string {
  const checkoutRequested = isCheckoutRequestDeclared(output);
  if (!checkoutRequested) {
    assertNoUndeclaredCheckoutRequest(output);
    return rawReply(output);
  }

  const completeness = context.checkoutCompleteness;
  if (completeness === null || completeness === undefined) {
    return rawReply(output);
  }

  if (completeness.state !== "REQUIRED") {
    throw new Error("TRACK_C_UNAUTHORIZED_CHECKOUT_REQUEST");
  }

  const fields = completeness.missingFields.map(checkoutFieldLabel);
  return [
    "Em cần thêm thông tin nhận hàng còn thiếu để tiếp tục ạ.",
    `Chị cho em xin ${joinVi(fields)} nhé.`,
  ].join("\n");
}
