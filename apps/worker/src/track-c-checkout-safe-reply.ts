import type {
  ContextV2,
  ContextV2CandidateOutputV2,
} from "@lana/contracts";

type CheckoutRenderContext = Pick<
  ContextV2,
  "checkoutCompleteness" | "productBinding" | "barriers"
>;

type CheckoutField = NonNullable<
  ContextV2["checkoutCompleteness"]
>["missingFields"][number];

function checkoutFieldLabel(field: CheckoutField): string {
  switch (field) {
    case "FULL_NAME":
      return "họ tên";
    case "PHONE":
      return "số điện thoại";
    case "ADDRESS":
      return "địa chỉ";
    case "PAYMENT_METHOD":
      return "phương thức thanh toán";
  }
}

function joinVi(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} và ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} và ${items.at(-1)}`;
}

function rawReply(output: Pick<ContextV2CandidateOutputV2, "segments">): string {
  return output.segments.map(({ text }) => text).join("\n");
}

/**
 * User-visible checkout rendering boundary. Model-authored prose is never used
 * to decide which checkout fields may be requested. When checkout is the active
 * objective, the reply is rendered only from canonical Context V2 state.
 */
export function renderTrackCCheckoutSafeReply(
  context: CheckoutRenderContext,
  output: Pick<ContextV2CandidateOutputV2, "segments">,
): string {
  const completeness = context.checkoutCompleteness;
  if (completeness === null || completeness === undefined) {
    return rawReply(output);
  }

  const productClarificationRequired =
    context.productBinding.status === "UNRESOLVED" ||
    context.productBinding.status === "AMBIGUOUS" ||
    context.productBinding.status === "STALE";
  const higherPriorityObjective = productClarificationRequired ||
    context.barriers.active.includes("PRODUCT_CONTEXT_UNREADY") ||
    context.barriers.active.includes("MEASUREMENTS_REQUIRED");
  if (higherPriorityObjective) return rawReply(output);

  if (completeness.state === "COMPLETE") {
    return "Dạ em đã có đủ thông tin cần thiết để tiếp tục ạ.";
  }

  const fields = completeness.missingFields.map(checkoutFieldLabel);
  return [
    "Em cần thêm thông tin nhận hàng còn thiếu để tiếp tục ạ.",
    `Chị cho em xin ${joinVi(fields)} nhé.`,
  ].join("\n");
}
