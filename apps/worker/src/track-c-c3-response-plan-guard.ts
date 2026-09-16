type TrackCPlanForResponderGuard = Readonly<{
  answer: Readonly<{ mode: string }>;
  nextMove: Readonly<{ action: string }>;
  canonicalAction: Readonly<{ type: string }>;
}>;

type TrackCResponderOutputForGuard = Readonly<{
  segments: readonly Readonly<Record<string, unknown>>[];
  strategy: string;
  cta: string;
}>;

function questionCount(output: TrackCResponderOutputForGuard): number {
  return output.segments.reduce((count, segment) => {
    const text = typeof segment.text === "string" ? segment.text : "";
    return count + (text.match(/\?/gu)?.length ?? 0);
  }, 0);
}

function requestSegments(output: TrackCResponderOutputForGuard) {
  return output.segments.filter((segment) =>
    segment.kind === "CLARIFICATION" || segment.kind === "ACTION_REQUEST"
  );
}

function assertCanonicalRequest(
  output: TrackCResponderOutputForGuard,
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
  if (output.strategy !== "ASK_CLARIFICATION" || output.cta !== cta ||
      clarifications.length !== 1 || actions.length !== 1 ||
      requestSegments(output).length !== 2) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
}

function assertBoundedUncertainty(output: TrackCResponderOutputForGuard): void {
  const text = output.segments
    .map((segment) => typeof segment.text === "string" ? segment.text : "")
    .join(" ")
    .normalize("NFC")
    .toLocaleLowerCase("vi-VN");
  const explicitUncertainty = /(?:chưa|không)\s+(?:thể\s+)?xác nhận\b|chưa có (?:đủ )?(?:thông tin|dữ liệu|căn cứ)\b/u;
  if (!explicitUncertainty.test(text)) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
}

/**
 * Structural adherence only. Model 1 still owns the semantic sales decision;
 * this guard checks that Model 2 did not omit or invent the planned action.
 */
export function assertTrackCResponderFollowsPlan(
  plan: TrackCPlanForResponderGuard,
  output: TrackCResponderOutputForGuard,
): void {
  if (plan.answer.mode === "BOUNDED_UNCERTAINTY") {
    assertBoundedUncertainty(output);
  }

  switch (plan.canonicalAction.type) {
    case "ASK_PRODUCT":
      assertCanonicalRequest(output, "PRODUCT", "PROVIDE_PRODUCT", "ASK_PRODUCT");
      return;
    case "ASK_MEASUREMENTS":
      assertCanonicalRequest(
        output,
        "MEASUREMENTS",
        "PROVIDE_MEASUREMENTS",
        "ASK_MEASUREMENTS",
      );
      return;
    case "ASK_CHECKOUT_DETAILS":
      if (output.strategy !== "ASK_CLARIFICATION" ||
          output.cta !== "ASK_CHECKOUT_DETAILS") {
        throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
      }
      return;
    case "HOLD_POSITION":
      if (output.strategy !== "HOLD_POSITION" || output.cta !== "NONE" ||
          requestSegments(output).length > 0 || questionCount(output) > 0) {
        throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
      }
      return;
    case "NONE":
      break;
    default:
      throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }

  if (output.cta !== "NONE" || requestSegments(output).length > 0) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
  const questions = questionCount(output);
  if ((plan.nextMove.action === "ASK" && questions !== 1) ||
      (plan.nextMove.action === "NONE" && questions !== 0)) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
}
