import type {
  ContextV2,
  ContextV2CandidateOutputV2,
} from "@lana/contracts";

type CheckoutRenderContext = Pick<
  ContextV2,
  "checkoutCompleteness" | "productBinding" | "barriers"
>;

type CheckoutRenderOutput = Pick<
  ContextV2CandidateOutputV2,
  "segments" | "strategy" | "cta"
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

function assertCanonicalRequest(
  output: CheckoutRenderOutput,
  target: "PRODUCT" | "MEASUREMENTS",
  action: "PROVIDE_PRODUCT" | "PROVIDE_MEASUREMENTS",
  cta: "ASK_PRODUCT" | "ASK_MEASUREMENTS",
): void {
  const clarifications = output.segments.filter((segment) =>
    segment.kind === "CLARIFICATION" && segment.target === target
  );
  const actions = output.segments.filter((segment) =>
    segment.kind === "ACTION_REQUEST" && segment.action === action
  );
  const otherRequests = output.segments.filter((segment) =>
    (segment.kind === "CLARIFICATION" && segment.target !== target) ||
    (segment.kind === "ACTION_REQUEST" && segment.action !== action)
  );
  if (output.strategy !== "ASK_CLARIFICATION" || output.cta !== cta ||
      clarifications.length !== 1 || actions.length !== 1 ||
      otherRequests.length > 0) {
    throw new Error("TRACK_C_CANONICAL_REQUEST_OUTPUT_INVALID");
  }
}

/**
 * User-visible checkout rendering boundary. Canonical request precedence is
 * enforced in code. When checkout is deferred behind product or measurement
 * clarification, model-authored prose is not allowed to widen that request.
 */
export function renderTrackCCheckoutSafeReply(
  context: CheckoutRenderContext,
  output: CheckoutRenderOutput,
): string {
  const completeness = context.checkoutCompleteness;
  const productClarificationRequired =
    context.productBinding.status === "UNRESOLVED" ||
    context.productBinding.status === "AMBIGUOUS" ||
    context.productBinding.status === "STALE" ||
    context.barriers.active.includes("PRODUCT_CONTEXT_UNREADY");

  if (productClarificationRequired) {
    assertCanonicalRequest(output, "PRODUCT", "PROVIDE_PRODUCT", "ASK_PRODUCT");
    if (completeness !== null && completeness !== undefined) {
      return [
        "Em chưa xác định được mẫu chị đang muốn hỏi ạ.",
        "Chị cho em biết mẫu sản phẩm nhé.",
      ].join("\n");
    }
    return rawReply(output);
  }

  if (context.barriers.active.includes("MEASUREMENTS_REQUIRED")) {
    assertCanonicalRequest(
      output,
      "MEASUREMENTS",
      "PROVIDE_MEASUREMENTS",
      "ASK_MEASUREMENTS",
    );
    if (completeness !== null && completeness !== undefined) {
      return [
        "Em cần thêm số đo còn thiếu để tư vấn size chính xác hơn ạ.",
        "Chị cho em xin số đo còn thiếu nhé.",
      ].join("\n");
    }
    return rawReply(output);
  }

  if (completeness === null || completeness === undefined) {
    return rawReply(output);
  }

  if (completeness.state === "COMPLETE") {
    return "Dạ em đã có đủ thông tin cần thiết để tiếp tục ạ.";
  }

  const fields = completeness.missingFields.map(checkoutFieldLabel);
  return [
    "Em cần thêm thông tin nhận hàng còn thiếu để tiếp tục ạ.",
    `Chị cho em xin ${joinVi(fields)} nhé.`,
  ].join("\n");
}
