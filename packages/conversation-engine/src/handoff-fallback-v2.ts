import { createHash } from "node:crypto";
import {
  HandoffDecisionV2Schema,
  type HandoffCategoryV2,
  type HandoffDecisionV2,
  type HandoffEvidenceV2,
  type HandoffReasonV2,
} from "@lana/contracts";

export const HANDOFF_FALLBACK_RULESET_VERSION_V2 =
  "handoff-fallback-2026-07-22.v2";

export const AFTER_SALES_HOLDING_REPLY_V2 =
  "Em đã chuyển bộ phận vận đơn kiểm tra và hỗ trợ mình ngay ạ.";

export const HANDOFF_REASONS_V2 = [
  "AFTER_SALES_REQUEST",
  "ORDER_STATUS",
  "DELIVERY_TRACKING",
  "DELIVERY_DELAY",
  "CHANGE_DELIVERY_INFO",
  "CANCEL_ORDER",
  "PAYMENT_AFTER_ORDER",
  "EXCHANGE",
  "RETURN",
  "REFUND",
  "DEFECT",
  "WARRANTY",
  "WRONG_OR_MISSING_ITEM",
  "CUSTOMER_REQUESTED_HUMAN",
  "PRICE_UNAVAILABLE",
  "STOCK_UNAVAILABLE",
  "SIZE_RULE_UNAVAILABLE",
  "ETA_UNAVAILABLE",
  "POLICY_UNAVAILABLE",
  "PRODUCT_AMBIGUOUS",
  "UNSUPPORTED_REQUEST",
  "SAFETY_OR_COMPLIANCE",
  "DEPENDENCY_FAILURE",
  "ADMIN_REQUEST",
  "PRICE_CHANGED_BEFORE_CONFIRMATION",
  "STOCK_CHANGED_BEFORE_CONFIRMATION",
  "SIZE_CHANGED_BEFORE_CONFIRMATION",
  "ETA_CHANGED_BEFORE_CONFIRMATION",
  "PAYMENT_RECEIPT_REVIEW_REQUIRED",
] as const satisfies readonly HandoffReasonV2[];

const REASON_SET = new Set<string>(HANDOFF_REASONS_V2);

const CATEGORY_BY_REASON = {
  AFTER_SALES_REQUEST: "AFTER_SALES",
  ORDER_STATUS: "AFTER_SALES",
  DELIVERY_TRACKING: "AFTER_SALES",
  DELIVERY_DELAY: "AFTER_SALES",
  CHANGE_DELIVERY_INFO: "AFTER_SALES",
  CANCEL_ORDER: "AFTER_SALES",
  PAYMENT_AFTER_ORDER: "AFTER_SALES",
  EXCHANGE: "AFTER_SALES",
  RETURN: "AFTER_SALES",
  REFUND: "AFTER_SALES",
  DEFECT: "AFTER_SALES",
  WARRANTY: "AFTER_SALES",
  WRONG_OR_MISSING_ITEM: "AFTER_SALES",
  CUSTOMER_REQUESTED_HUMAN: "CUSTOMER_REQUESTED_HUMAN",
  PRICE_UNAVAILABLE: "BUSINESS_FACT_UNAVAILABLE",
  STOCK_UNAVAILABLE: "BUSINESS_FACT_UNAVAILABLE",
  SIZE_RULE_UNAVAILABLE: "BUSINESS_FACT_UNAVAILABLE",
  ETA_UNAVAILABLE: "BUSINESS_FACT_UNAVAILABLE",
  POLICY_UNAVAILABLE: "POLICY_UNAVAILABLE",
  PRODUCT_AMBIGUOUS: "AMBIGUOUS_REQUEST",
  UNSUPPORTED_REQUEST: "AMBIGUOUS_REQUEST",
  SAFETY_OR_COMPLIANCE: "SAFETY_OR_COMPLIANCE",
  DEPENDENCY_FAILURE: "SYSTEM_FAILURE",
  ADMIN_REQUEST: "ADMIN_REQUEST",
  PRICE_CHANGED_BEFORE_CONFIRMATION: "BUSINESS_FACT_UNAVAILABLE",
  STOCK_CHANGED_BEFORE_CONFIRMATION: "BUSINESS_FACT_UNAVAILABLE",
  SIZE_CHANGED_BEFORE_CONFIRMATION: "BUSINESS_FACT_UNAVAILABLE",
  ETA_CHANGED_BEFORE_CONFIRMATION: "BUSINESS_FACT_UNAVAILABLE",
  PAYMENT_RECEIPT_REVIEW_REQUIRED: "SAFETY_OR_COMPLIANCE",
} as const satisfies Record<HandoffReasonV2, HandoffCategoryV2>;

const REVALIDATION_REASON = {
  PRICE: "PRICE_CHANGED_BEFORE_CONFIRMATION",
  STOCK: "STOCK_CHANGED_BEFORE_CONFIRMATION",
  SIZE: "SIZE_CHANGED_BEFORE_CONFIRMATION",
  ETA: "ETA_CHANGED_BEFORE_CONFIRMATION",
} as const satisfies Record<string, HandoffReasonV2>;

export type HandoffEvidenceSourceInputV2 = HandoffEvidenceV2["source"];

export interface HandoffEvidenceInputV2 {
  readonly source: HandoffEvidenceSourceInputV2;
  /** An event key, state revision, or tool-call key. Raw values never leave this engine. */
  readonly reference: string;
  readonly observedAt: string;
}

export type HandoffFallbackTriggerV2 =
  | {
      readonly kind: "REASON_CODE";
      readonly reason: HandoffReasonV2;
    }
  | {
      readonly kind: "PRE_CONFIRMATION_REVALIDATION";
      readonly fact: "PRICE" | "STOCK" | "SIZE" | "ETA";
      readonly outcome: "CHANGED" | "STALE" | "UNAVAILABLE";
    }
  | {
      readonly kind: "PAYMENT_RECEIPT_AFTER_PURCHASE_CONFIRMED";
      readonly milestone: "PURCHASE_CONFIRMED";
    };

export interface HandoffFallbackCommandV2 {
  readonly schemaVersion: 2;
  /** Stable runtime command key. decisionId also binds the canonical payload to detect collisions. */
  readonly commandId: string;
  readonly decidedAt: string;
  readonly trigger: HandoffFallbackTriggerV2;
  readonly evidence: readonly HandoffEvidenceInputV2[];
}

export interface HandoffFallbackOptionsV2 {
  /** Audit time used only when the command itself cannot be trusted. */
  readonly fallbackDecidedAt?: string;
}

const EVIDENCE_SOURCES = new Set<HandoffEvidenceSourceInputV2>([
  "INBOUND_MESSAGE",
  "CONVERSATION_STATE",
  "BUSINESS_TOOL",
  "POLICY_ENGINE",
  "ADMIN_CONTROL",
]);

const REVALIDATION_FACTS = new Set(["PRICE", "STOCK", "SIZE", "ETA"]);
const REVALIDATION_OUTCOMES = new Set(["CHANGED", "STALE", "UNAVAILABLE"]);
const CANONICAL_UTC_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const FAIL_CLOSED_TIME = "1970-01-01T00:00:00.000Z";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function isCanonicalUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    CANONICAL_UTC_TIMESTAMP.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function parseEvidence(value: unknown): HandoffEvidenceInputV2[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null;

  const parsed: HandoffEvidenceInputV2[] = [];
  for (const item of value) {
    if (!isRecord(item) || !hasExactKeys(item, ["source", "reference", "observedAt"])) {
      return null;
    }
    if (
      typeof item.source !== "string" ||
      !EVIDENCE_SOURCES.has(item.source as HandoffEvidenceSourceInputV2) ||
      typeof item.reference !== "string" ||
      item.reference.length === 0 ||
      item.reference.length > 4_096 ||
      !isCanonicalUtcTimestamp(item.observedAt)
    ) {
      return null;
    }
    parsed.push({
      source: item.source as HandoffEvidenceSourceInputV2,
      reference: item.reference,
      observedAt: item.observedAt,
    });
  }
  return parsed;
}

function parseTrigger(value: unknown): HandoffFallbackTriggerV2 | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;

  if (value.kind === "REASON_CODE") {
    if (
      !hasExactKeys(value, ["kind", "reason"]) ||
      typeof value.reason !== "string" ||
      !REASON_SET.has(value.reason)
    ) {
      return null;
    }
    return { kind: "REASON_CODE", reason: value.reason as HandoffReasonV2 };
  }

  if (value.kind === "PRE_CONFIRMATION_REVALIDATION") {
    if (
      !hasExactKeys(value, ["kind", "fact", "outcome"]) ||
      typeof value.fact !== "string" ||
      !REVALIDATION_FACTS.has(value.fact) ||
      typeof value.outcome !== "string" ||
      !REVALIDATION_OUTCOMES.has(value.outcome)
    ) {
      return null;
    }
    return {
      kind: "PRE_CONFIRMATION_REVALIDATION",
      fact: value.fact as "PRICE" | "STOCK" | "SIZE" | "ETA",
      outcome: value.outcome as "CHANGED" | "STALE" | "UNAVAILABLE",
    };
  }

  if (value.kind === "PAYMENT_RECEIPT_AFTER_PURCHASE_CONFIRMED") {
    if (
      !hasExactKeys(value, ["kind", "milestone"]) ||
      value.milestone !== "PURCHASE_CONFIRMED"
    ) {
      return null;
    }
    return {
      kind: "PAYMENT_RECEIPT_AFTER_PURCHASE_CONFIRMED",
      milestone: "PURCHASE_CONFIRMED",
    };
  }

  return null;
}

function parseCommand(value: unknown): HandoffFallbackCommandV2 | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "commandId",
      "decidedAt",
      "trigger",
      "evidence",
    ]) ||
    value.schemaVersion !== 2 ||
    typeof value.commandId !== "string" ||
    value.commandId.trim().length === 0 ||
    value.commandId.length > 256 ||
    !isCanonicalUtcTimestamp(value.decidedAt)
  ) {
    return null;
  }

  const trigger = parseTrigger(value.trigger);
  const evidence = parseEvidence(value.evidence);
  if (trigger === null || evidence === null) return null;

  if (
    trigger.kind === "REASON_CODE" &&
    trigger.reason === "ADMIN_REQUEST" &&
    !evidence.some((item) => item.source === "ADMIN_CONTROL")
  ) {
    return null;
  }
  if (
    trigger.kind === "PAYMENT_RECEIPT_AFTER_PURCHASE_CONFIRMED" &&
    !evidence.some((item) => item.source === "INBOUND_MESSAGE")
  ) {
    return null;
  }

  return {
    schemaVersion: 2,
    commandId: value.commandId,
    decidedAt: value.decidedAt,
    trigger,
    evidence,
  };
}

function safeParseCommand(value: unknown): HandoffFallbackCommandV2 | null {
  try {
    return parseCommand(value);
  } catch {
    // Getters and proxies are untrusted input too; they must not bypass fail-closed.
    return null;
  }
}

function canonicalize(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : JSON.stringify(String(value));
  }
  if (typeof value === "bigint") return JSON.stringify(`${value.toString()}n`);
  if (typeof value !== "object") return JSON.stringify(`[${typeof value}]`);
  if (seen.has(value)) return JSON.stringify("[Circular]");

  seen.add(value);
  if (Array.isArray(value)) {
    const result = `[${value.map((item) => canonicalize(item, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }

  const record = value as Record<string, unknown>;
  const result = `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key], seen)}`)
    .join(",")}}`;
  seen.delete(value);
  return result;
}

function safeCanonicalize(value: unknown): string {
  try {
    return canonicalize(value, new WeakSet<object>());
  } catch {
    return JSON.stringify("[Unserializable handoff command]");
  }
}

function sha256Reference(value: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function deterministicDecisionId(commandId: string): string {
  const hash = createHash("sha256")
    .update(`${HANDOFF_FALLBACK_RULESET_VERSION_V2}\u0000${commandId}`, "utf8")
    .digest("hex");
  const variant = ((Number.parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function reasonForTrigger(trigger: HandoffFallbackTriggerV2): HandoffReasonV2 {
  if (trigger.kind === "REASON_CODE") return trigger.reason;
  if (trigger.kind === "PRE_CONFIRMATION_REVALIDATION") {
    return REVALIDATION_REASON[trigger.fact];
  }

  // Receipt images are evidence for accounting staff, never proof of payment.
  return "PAYMENT_RECEIPT_REVIEW_REQUIRED";
}

function trustedFallbackTime(options: HandoffFallbackOptionsV2 | undefined): string {
  return isCanonicalUtcTimestamp(options?.fallbackDecidedAt)
    ? options.fallbackDecidedAt
    : FAIL_CLOSED_TIME;
}

/**
 * Deterministically selects the handoff policy. Model output is deliberately not
 * an input: callers can provide only a trigger and evidence, never a tag, message,
 * category, or customer-message policy.
 */
export function decideHandoffFallbackV2(
  input: unknown,
  options?: HandoffFallbackOptionsV2,
): HandoffDecisionV2 {
  const command = safeParseCommand(input);
  const decidedAt = command?.decidedAt ?? trustedFallbackTime(options);
  const reason = command === null ? "DEPENDENCY_FAILURE" : reasonForTrigger(command.trigger);
  const category = CATEGORY_BY_REASON[reason];
  const isAfterSales = category === "AFTER_SALES";
  const commandIdentity = command === null
    ? `malformed:${sha256Reference(safeCanonicalize(input))}`
    : `${command.commandId}\u0000${safeCanonicalize(command)}`;
  const evidence: HandoffEvidenceV2[] =
    command === null
      ? [
          {
            source: "CONVERSATION_STATE",
            referenceHash: sha256Reference(
              `MALFORMED_COMMAND\u0000${safeCanonicalize(input)}`,
            ),
            observedAt: decidedAt,
          },
        ]
      : command.evidence.map((item) => ({
          source: item.source,
          referenceHash: sha256Reference(`${item.source}\u0000${item.reference}`),
          observedAt: item.observedAt,
        }));

  return HandoffDecisionV2Schema.parse({
    schemaVersion: 2,
    decisionId: deterministicDecisionId(commandIdentity),
    category,
    reason,
    customerMessagePolicy: isAfterSales
      ? "HOLDING_REPLY_THEN_HANDOFF"
      : "SILENT_HANDOFF",
    customerMessages: isAfterSales ? [AFTER_SALES_HOLDING_REPLY_V2] : [],
    tag: isAfterSales ? "VAN_DON" : "NHAN_VIEN",
    provenance: {
      decisionSource:
        reason === "ADMIN_REQUEST" ? "ADMIN_CONTROL" : "DETERMINISTIC_RULE_ENGINE",
      rulesetVersion: HANDOFF_FALLBACK_RULESET_VERSION_V2,
      evidence,
    },
    decidedAt,
  });
}
