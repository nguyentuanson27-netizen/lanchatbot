/*
 * Track C C3 V6 directive plan contract (offline evaluation only).
 *
 * V5's conversation plan is five free-text strings the Responder may ignore, so
 * the Strategist decides nothing the pipeline can check: the Responder re-runs
 * the whole canonical rule chain from its own copy of the rules. This contract
 * inverts that. The plan is a closed set of enums plus code-owned claim
 * references, the Responder's schema is narrowed to what the plan selected, and
 * the reply is checked against the plan deterministically instead of by a judge.
 *
 * Two consequences are structural, not stylistic:
 * - a plan cannot leak a factual value (price, size, policy text), because it
 *   has no free-text field to leak into;
 * - a reply cannot cite a claim, ask a question, or pick a CTA the plan did not
 *   select, because that is a parse/conformance failure, not a quality opinion.
 *
 * Evaluation-only. No runtime, persistence, delivery, or effect port.
 */

/** First-matching canonical rule. The Strategist selects it; the Responder obeys it. */
export type TrackCV6Rule =
  | "PRODUCT_UNREADY"
  | "MEASUREMENTS_REQUIRED"
  | "CHECKOUT_DETAILS"
  | "ORDER_CONFIRMED_HOLD"
  | "NO_ELIGIBLE_CLAIM"
  | "ANSWER";

/** What the customer just expressed that the reply must recognise before facts. */
export type TrackCV6Acknowledge =
  | "NONE"
  | "PRICE_CONCERN"
  | "COMPARISON"
  | "PAST_EXPERIENCE"
  | "FIT_CONCERN"
  | "DEADLINE_CONCERN"
  | "SUPPLIED_INFO"
  | "COMMITMENT";

/** The single decision target the reply may pursue after the answer is complete. */
export type TrackCV6AskFor =
  | "NONE"
  | "PRODUCT"
  | "MEASUREMENT"
  | "CHECKOUT_DETAILS"
  | "BUDGET"
  | "COMPARISON_CRITERION"
  | "DELIVERY_DEADLINE"
  | "FIT_PREFERENCE"
  | "VARIANT";

export type TrackCV6Strategy =
  | "ANSWER_VERIFIED_FACTS"
  | "ASK_CLARIFICATION"
  | "HOLD_POSITION";

export type TrackCV6Cta =
  | "NONE"
  | "ASK_PRODUCT"
  | "ASK_MEASUREMENTS"
  | "ASK_CHECKOUT_DETAILS";

export interface TrackCV6DirectivePlan {
  readonly contractVersion: "TRACK_C_C3_DIRECTIVE_PLAN_V1";
  readonly rule: TrackCV6Rule;
  /** Exactly the claims the reply may state, in code-owned reference form. */
  readonly claimRefs: readonly string[];
  readonly acknowledge: TrackCV6Acknowledge;
  readonly askFor: TrackCV6AskFor;
  /** Non-claim supporting facts the reply may add: 0, 1, or 2. */
  readonly supportFacts: 0 | 1 | 2;
}

const RULES: readonly TrackCV6Rule[] = Object.freeze([
  "PRODUCT_UNREADY",
  "MEASUREMENTS_REQUIRED",
  "CHECKOUT_DETAILS",
  "ORDER_CONFIRMED_HOLD",
  "NO_ELIGIBLE_CLAIM",
  "ANSWER",
]);

const ACKNOWLEDGEMENTS: readonly TrackCV6Acknowledge[] = Object.freeze([
  "NONE",
  "PRICE_CONCERN",
  "COMPARISON",
  "PAST_EXPERIENCE",
  "FIT_CONCERN",
  "DEADLINE_CONCERN",
  "SUPPLIED_INFO",
  "COMMITMENT",
]);

const ASK_TARGETS: readonly TrackCV6AskFor[] = Object.freeze([
  "NONE",
  "PRODUCT",
  "MEASUREMENT",
  "CHECKOUT_DETAILS",
  "BUDGET",
  "COMPARISON_CRITERION",
  "DELIVERY_DEADLINE",
  "FIT_PREFERENCE",
  "VARIANT",
]);

/** Canonical shape each rule forces. Derived by code so the plan cannot disagree. */
const RULE_SHAPE: Readonly<Record<TrackCV6Rule, Readonly<{
  strategy: TrackCV6Strategy;
  cta: TrackCV6Cta;
  askFor: TrackCV6AskFor | null;
  clarificationTarget: "PRODUCT" | "MEASUREMENTS" | "CHECKOUT_DETAILS" | null;
  action:
    | "PROVIDE_PRODUCT"
    | "PROVIDE_MEASUREMENTS"
    | "PROVIDE_CHECKOUT_DETAILS"
    | null;
  claimsAllowed: boolean;
  singleGeneralSegment: boolean;
}>>> = Object.freeze({
  PRODUCT_UNREADY: Object.freeze({
    strategy: "ASK_CLARIFICATION",
    cta: "ASK_PRODUCT",
    askFor: "PRODUCT",
    clarificationTarget: "PRODUCT",
    action: "PROVIDE_PRODUCT",
    claimsAllowed: false,
    singleGeneralSegment: false,
  }),
  MEASUREMENTS_REQUIRED: Object.freeze({
    strategy: "ASK_CLARIFICATION",
    cta: "ASK_MEASUREMENTS",
    askFor: "MEASUREMENT",
    clarificationTarget: "MEASUREMENTS",
    action: "PROVIDE_MEASUREMENTS",
    claimsAllowed: false,
    singleGeneralSegment: false,
  }),
  CHECKOUT_DETAILS: Object.freeze({
    strategy: "ASK_CLARIFICATION",
    cta: "ASK_CHECKOUT_DETAILS",
    askFor: "CHECKOUT_DETAILS",
    clarificationTarget: "CHECKOUT_DETAILS",
    action: "PROVIDE_CHECKOUT_DETAILS",
    claimsAllowed: false,
    singleGeneralSegment: false,
  }),
  ORDER_CONFIRMED_HOLD: Object.freeze({
    strategy: "HOLD_POSITION",
    cta: "NONE",
    askFor: "NONE",
    clarificationTarget: null,
    action: null,
    claimsAllowed: false,
    singleGeneralSegment: true,
  }),
  NO_ELIGIBLE_CLAIM: Object.freeze({
    strategy: "ANSWER_VERIFIED_FACTS",
    cta: "NONE",
    askFor: "NONE",
    clarificationTarget: null,
    action: null,
    claimsAllowed: false,
    singleGeneralSegment: true,
  }),
  ANSWER: Object.freeze({
    strategy: "ANSWER_VERIFIED_FACTS",
    cta: "NONE",
    askFor: null,
    clarificationTarget: null,
    action: null,
    claimsAllowed: true,
    singleGeneralSegment: false,
  }),
});

/** Targets a plain ANSWER turn may pursue; canonical asks belong to their rule. */
const ANSWER_ASK_TARGETS: readonly TrackCV6AskFor[] = Object.freeze([
  "NONE",
  "BUDGET",
  "COMPARISON_CRITERION",
  "DELIVERY_DEADLINE",
  "FIT_PREFERENCE",
  "VARIANT",
]);

export function trackCV6RuleShape(rule: TrackCV6Rule) {
  return RULE_SHAPE[rule];
}

/**
 * Provider response schema for the Strategist pass. `claimRefs` is restricted to
 * the exact references this request carries, so an invented reference is
 * rejected by the provider schema before it can reach the Responder.
 */
export function trackCV6PlanResponseSchema(claimRefs: readonly string[]) {
  return Object.freeze({
    type: "OBJECT",
    required: Object.freeze([
      "rule",
      "claimRefs",
      "acknowledge",
      "askFor",
      "supportFacts",
    ]),
    properties: Object.freeze({
      rule: Object.freeze({ type: "STRING", enum: [...RULES] }),
      claimRefs: Object.freeze({
        type: "ARRAY",
        maxItems: Math.max(claimRefs.length, 1),
        items: Object.freeze({ type: "STRING", enum: [...claimRefs] }),
      }),
      acknowledge: Object.freeze({
        type: "STRING",
        enum: [...ACKNOWLEDGEMENTS],
      }),
      askFor: Object.freeze({ type: "STRING", enum: [...ASK_TARGETS] }),
      supportFacts: Object.freeze({
        type: "INTEGER",
        minimum: 0,
        maximum: 2,
      }),
    }),
  });
}

function assertNoExtraKeys(
  record: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): void {
  const keys = Object.keys(record).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length ||
      keys.some((key, index) => key !== expected[index])) {
    throw new Error("TRACK_C_V6_PLAN_SHAPE_INVALID");
  }
}

/**
 * Parses one Strategist output. Every field is closed-vocabulary, so a plan that
 * parses is already free of factual leakage, unknown claim references, and
 * rule/shape contradictions.
 */
export function parseTrackCV6DirectivePlan(
  value: unknown,
  availableClaimRefs: readonly string[],
): TrackCV6DirectivePlan {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_C_V6_PLAN_SHAPE_INVALID");
  }
  const record = value as Readonly<Record<string, unknown>>;
  assertNoExtraKeys(record, [
    "rule",
    "claimRefs",
    "acknowledge",
    "askFor",
    "supportFacts",
  ]);

  const rule = record.rule as TrackCV6Rule;
  if (!RULES.includes(rule)) throw new Error("TRACK_C_V6_PLAN_RULE_INVALID");
  const acknowledge = record.acknowledge as TrackCV6Acknowledge;
  if (!ACKNOWLEDGEMENTS.includes(acknowledge)) {
    throw new Error("TRACK_C_V6_PLAN_ACKNOWLEDGE_INVALID");
  }
  const askFor = record.askFor as TrackCV6AskFor;
  if (!ASK_TARGETS.includes(askFor)) {
    throw new Error("TRACK_C_V6_PLAN_ASK_INVALID");
  }
  const supportFacts = record.supportFacts;
  if (supportFacts !== 0 && supportFacts !== 1 && supportFacts !== 2) {
    throw new Error("TRACK_C_V6_PLAN_SUPPORT_FACTS_INVALID");
  }
  if (!Array.isArray(record.claimRefs) ||
      record.claimRefs.some((ref) => typeof ref !== "string")) {
    throw new Error("TRACK_C_V6_PLAN_SHAPE_INVALID");
  }
  const claimRefs = record.claimRefs as readonly string[];
  if (new Set(claimRefs).size !== claimRefs.length) {
    throw new Error("TRACK_C_V6_PLAN_CLAIM_REF_DUPLICATE");
  }
  if (claimRefs.some((ref) => !availableClaimRefs.includes(ref))) {
    throw new Error("TRACK_C_V6_PLAN_CLAIM_REF_UNKNOWN");
  }

  const shape = RULE_SHAPE[rule];
  if (!shape.claimsAllowed && claimRefs.length > 0) {
    throw new Error("TRACK_C_V6_PLAN_CLAIM_REF_FORBIDDEN");
  }
  if (shape.askFor !== null && askFor !== shape.askFor) {
    throw new Error("TRACK_C_V6_PLAN_ASK_NOT_CANONICAL");
  }
  if (shape.askFor === null && !ANSWER_ASK_TARGETS.includes(askFor)) {
    throw new Error("TRACK_C_V6_PLAN_ASK_NOT_CANONICAL");
  }
  if (rule !== "ANSWER" && supportFacts !== 0) {
    throw new Error("TRACK_C_V6_PLAN_SUPPORT_FACTS_FORBIDDEN");
  }
  if (acknowledge === "NONE" && supportFacts > 0) {
    throw new Error("TRACK_C_V6_PLAN_SUPPORT_FACTS_UNMOTIVATED");
  }

  return Object.freeze({
    contractVersion: "TRACK_C_C3_DIRECTIVE_PLAN_V1",
    rule,
    claimRefs: Object.freeze([...claimRefs]),
    acknowledge,
    askFor,
    supportFacts,
  });
}

type ConformanceSegment = Readonly<{
  kind: string;
  text: string;
  target?: string;
  action?: string;
  claimRef?: string;
}>;

function segmentsOf(output: unknown): readonly ConformanceSegment[] {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("TRACK_C_V6_REPLY_SHAPE_INVALID");
  }
  const record = output as Readonly<Record<string, unknown>>;
  if (!Array.isArray(record.segments)) {
    throw new Error("TRACK_C_V6_REPLY_SHAPE_INVALID");
  }
  return record.segments as readonly ConformanceSegment[];
}

/**
 * Proves the reply realises the plan and nothing else. This is the check V5 had
 * no way to run: there, a reply that ignored the plan was indistinguishable from
 * one that followed it until a judge read both.
 *
 * `claimRef` is still present on segments here - conformance runs before the
 * reference resolver rewrites them into provenance hashes.
 */
export function assertTrackCV6PlanConformance(
  plan: TrackCV6DirectivePlan,
  output: unknown,
): void {
  const record = output as Readonly<Record<string, unknown>>;
  const segments = segmentsOf(output);
  const shape = RULE_SHAPE[plan.rule];

  if (record.strategy !== shape.strategy) {
    throw new Error("TRACK_C_V6_REPLY_STRATEGY_MISMATCH");
  }
  if (record.cta !== shape.cta) {
    throw new Error("TRACK_C_V6_REPLY_CTA_MISMATCH");
  }
  if (segments.length === 0) {
    throw new Error("TRACK_C_V6_REPLY_SHAPE_INVALID");
  }
  if (segments.some(({ kind }) => kind === "EFFECT_CLAIM")) {
    throw new Error("TRACK_C_V6_REPLY_EFFECT_CLAIM_FORBIDDEN");
  }

  const used = segments.flatMap((segment) =>
    segment.kind === "VERIFIED_CLAIM" && typeof segment.claimRef === "string"
      ? [segment.claimRef]
      : []
  );
  if (new Set(used).size !== used.length) {
    throw new Error("TRACK_C_V6_REPLY_CLAIM_REF_DUPLICATE");
  }
  if ([...used].sort().join("|") !== [...plan.claimRefs].sort().join("|")) {
    throw new Error("TRACK_C_V6_REPLY_CLAIM_SET_MISMATCH");
  }

  const clarifications = segments.filter(({ kind }) => kind === "CLARIFICATION");
  const actions = segments.filter(({ kind }) => kind === "ACTION_REQUEST");
  if (shape.clarificationTarget === null) {
    if (clarifications.length > 0 || actions.length > 0) {
      throw new Error("TRACK_C_V6_REPLY_CANONICAL_SEGMENT_FORBIDDEN");
    }
  } else {
    if (clarifications.length !== 1 || actions.length !== 1 ||
        clarifications[0]?.target !== shape.clarificationTarget ||
        actions[0]?.action !== shape.action) {
      throw new Error("TRACK_C_V6_REPLY_CANONICAL_SEGMENT_MISSING");
    }
  }

  if (shape.singleGeneralSegment &&
      (segments.length !== 1 || segments[0]?.kind !== "GENERAL")) {
    throw new Error("TRACK_C_V6_REPLY_SINGLE_SEGMENT_REQUIRED");
  }

  const questions = segments.reduce(
    (total, { text }) => total + [...String(text)].filter((c) => c === "?").length,
    0,
  );
  if (plan.askFor === "NONE" && questions > 0) {
    throw new Error("TRACK_C_V6_REPLY_UNPLANNED_QUESTION");
  }
  if (plan.askFor !== "NONE" && questions !== 1) {
    throw new Error("TRACK_C_V6_REPLY_QUESTION_COUNT_INVALID");
  }
}
