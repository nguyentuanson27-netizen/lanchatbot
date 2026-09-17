import {
  TRACK_C_RESPONDER_SEGMENT_ROLES,
  type TrackCResponderSegmentRole,
} from "./track-c-c3-responder-realization.js";
import {
  TRACK_C_PROTECTED_PROPOSITIONS,
  TRACK_C_PROTECTED_RESOLUTIONS,
  type TrackCProtectedProposition,
  type TrackCProtectedResolution,
} from "./track-c-c3-response-plan-control.js";

type TrackCPlanForResponderGuard = Readonly<{
  answer: Readonly<{
    mode: string;
    protectedProposition: TrackCProtectedProposition;
    protectedResolution: TrackCProtectedResolution;
  }>;
  nextMove: Readonly<{ action: string; decisionInput: string }>;
  canonicalAction: Readonly<{ type: string }>;
}>;

type TrackCResponderOutputForGuard = Readonly<{
  segments: readonly Readonly<Record<string, unknown>>[];
  strategy: string;
  cta: string;
}>;

function parseOutput(value: unknown): TrackCResponderOutputForGuard {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(record.segments) || typeof record.strategy !== "string" ||
      typeof record.cta !== "string" || record.segments.some((segment) =>
        segment === null || typeof segment !== "object" || Array.isArray(segment)
      )) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
  for (const segment of record.segments) {
    const role = (segment as Readonly<Record<string, unknown>>).role;
    if (!TRACK_C_RESPONDER_SEGMENT_ROLES.includes(
      role as TrackCResponderSegmentRole,
    )) {
      throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
    }
  }
  return {
    segments: record.segments as readonly Readonly<Record<string, unknown>>[],
    strategy: record.strategy,
    cta: record.cta,
  };
}

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

function roleSegments(
  output: TrackCResponderOutputForGuard,
  role: TrackCResponderSegmentRole,
) {
  return output.segments.filter((segment) => segment.role === role);
}

function semanticMismatch(): never {
  throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
}

/**
 * The Responder declares the semantic status of every segment. A supported
 * assertion must be a VERIFIED_CLAIM and its proposition is filled from the
 * code-owned claim reference registry, never trusted from the model.
 */
function assertResponderSemantics(
  plan: TrackCPlanForResponderGuard,
  output: TrackCResponderOutputForGuard,
): void {
  let unresolvedAnswers = 0;
  for (const segment of output.segments) {
    const proposition = segment.protectedProposition;
    const resolution = segment.protectedResolution;
    if (!TRACK_C_PROTECTED_PROPOSITIONS.includes(
      proposition as TrackCProtectedProposition,
    ) || !TRACK_C_PROTECTED_RESOLUTIONS.includes(
      resolution as TrackCProtectedResolution,
    )) {
      semanticMismatch();
    }
    const isAnswer = segment.role === "ANSWER";
    if (segment.kind === "VERIFIED_CLAIM") {
      if (!isAnswer || resolution !== "SUPPORTED" || proposition === "NONE" ||
          segment.supportedProposition !== proposition) {
        semanticMismatch();
      }
      continue;
    }
    if (isAnswer && plan.answer.protectedResolution === "UNRESOLVED" &&
        proposition === plan.answer.protectedProposition &&
        resolution === "UNRESOLVED") {
      unresolvedAnswers += 1;
      continue;
    }
    if (proposition !== "NONE" || resolution !== "NOT_APPLICABLE") {
      semanticMismatch();
    }
  }
  if (plan.answer.protectedResolution === "UNRESOLVED" &&
      unresolvedAnswers !== 1) {
    semanticMismatch();
  }
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
    segment.kind === "ACTION_REQUEST" && segment.action === action &&
      segment.role === "CANONICAL_ACTION"
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
  value: unknown,
): void {
  const output = parseOutput(value);
  assertResponderSemantics(plan, output);
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
          output.cta !== "ASK_CHECKOUT_DETAILS" ||
          roleSegments(output, "CANONICAL_ACTION").length !== 1) {
        throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
      }
      return;
    case "HOLD_POSITION":
      if (output.strategy !== "HOLD_POSITION" || output.cta !== "NONE" ||
          requestSegments(output).length > 0 || questionCount(output) > 0 ||
          roleSegments(output, "CANONICAL_ACTION").length !== 1) {
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
  if (roleSegments(output, "CANONICAL_ACTION").length !== 0) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
  const nextMoves = roleSegments(output, "NEXT_MOVE");
  if ((plan.nextMove.action === "ASK" &&
       (nextMoves.length !== 1 ||
        nextMoves[0]?.decisionInput !== plan.nextMove.decisionInput)) ||
      (plan.nextMove.action === "NONE" &&
       (nextMoves.length !== 0 || questionCount(output) > 0))) {
    throw new Error("TRACK_C_RESPONDER_PLAN_MISMATCH");
  }
}
