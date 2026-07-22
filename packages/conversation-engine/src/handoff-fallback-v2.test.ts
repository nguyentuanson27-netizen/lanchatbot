import { createHash } from "node:crypto";
import { HandoffDecisionV2Schema, type HandoffReasonV2 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import {
  AFTER_SALES_HOLDING_REPLY_V2,
  HANDOFF_REASONS_V2,
  decideHandoffFallbackV2,
  type HandoffFallbackCommandV2,
} from "./handoff-fallback-v2.js";

const NOW = "2026-07-22T05:00:00.000Z";
const OBSERVED_AT = "2026-07-22T04:59:59.000Z";

const AFTER_SALES_REASONS = new Set<HandoffReasonV2>([
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
]);

const EXPECTED_CATEGORY = {
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
} as const;

function reasonCommand(
  reason: HandoffReasonV2,
  commandId = `command:${reason}`,
): HandoffFallbackCommandV2 {
  return {
    schemaVersion: 2,
    commandId,
    decidedAt: NOW,
    trigger: { kind: "REASON_CODE", reason },
    evidence: [
      {
        source: reason === "ADMIN_REQUEST" ? "ADMIN_CONTROL" : "INBOUND_MESSAGE",
        reference: `event:${reason}`,
        observedAt: OBSERVED_AT,
      },
    ],
  };
}

describe("handoff/fallback v2 reason matrix", () => {
  it.each(HANDOFF_REASONS_V2)("maps %s without model-selected policy", (reason) => {
    const decision = decideHandoffFallbackV2(reasonCommand(reason));

    expect(HandoffDecisionV2Schema.safeParse(decision).success).toBe(true);
    expect(decision.reason).toBe(reason);
    if (AFTER_SALES_REASONS.has(reason)) {
      expect(decision).toMatchObject({
        category: "AFTER_SALES",
        customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF",
        customerMessages: [AFTER_SALES_HOLDING_REPLY_V2],
        tag: "VAN_DON",
      });
      return;
    }

    expect(decision).toMatchObject({
      category: EXPECTED_CATEGORY[reason as keyof typeof EXPECTED_CATEGORY],
      customerMessagePolicy: "SILENT_HANDOFF",
      customerMessages: [],
      tag: "NHAN_VIEN",
    });
  });

  it("uses ADMIN_CONTROL provenance only for an authenticated admin command", () => {
    expect(decideHandoffFallbackV2(reasonCommand("ADMIN_REQUEST")).provenance.decisionSource)
      .toBe("ADMIN_CONTROL");

    const untrustedAdmin = reasonCommand("ADMIN_REQUEST") as unknown as {
      evidence: Array<{ source: string }>;
    };
    untrustedAdmin.evidence[0]!.source = "INBOUND_MESSAGE";
    const closed = decideHandoffFallbackV2(untrustedAdmin, { fallbackDecidedAt: NOW });
    expect(closed).toMatchObject({
      reason: "DEPENDENCY_FAILURE",
      customerMessages: [],
      tag: "NHAN_VIEN",
    });
  });
});

describe("mandatory pre-confirmation revalidation handoff", () => {
  const facts = [
    ["PRICE", "PRICE_CHANGED_BEFORE_CONFIRMATION"],
    ["STOCK", "STOCK_CHANGED_BEFORE_CONFIRMATION"],
    ["SIZE", "SIZE_CHANGED_BEFORE_CONFIRMATION"],
    ["ETA", "ETA_CHANGED_BEFORE_CONFIRMATION"],
  ] as const;

  it.each(facts)("silently hands off changed/stale/unavailable %s", (fact, reason) => {
    for (const outcome of ["CHANGED", "STALE", "UNAVAILABLE"] as const) {
      const decision = decideHandoffFallbackV2({
        schemaVersion: 2,
        commandId: `revalidate:${fact}:${outcome}`,
        decidedAt: NOW,
        trigger: { kind: "PRE_CONFIRMATION_REVALIDATION", fact, outcome },
        evidence: [
          {
            source: "BUSINESS_TOOL",
            reference: `facts:${fact}:revision-4`,
            observedAt: OBSERVED_AT,
          },
        ],
      });

      expect(decision).toMatchObject({
        category: "BUSINESS_FACT_UNAVAILABLE",
        reason,
        customerMessagePolicy: "SILENT_HANDOFF",
        customerMessages: [],
        tag: "NHAN_VIEN",
      });
    }
  });
});

describe("payment receipt after purchase confirmation", () => {
  it("does not verify payment and silently routes the bill to NHAN_VIEN", () => {
    const decision = decideHandoffFallbackV2({
      schemaVersion: 2,
      commandId: "payment-receipt:message-1",
      decidedAt: NOW,
      trigger: {
        kind: "PAYMENT_RECEIPT_AFTER_PURCHASE_CONFIRMED",
        milestone: "PURCHASE_CONFIRMED",
      },
      evidence: [
        {
          source: "INBOUND_MESSAGE",
          reference: "meta-message-with-image-1",
          observedAt: OBSERVED_AT,
        },
      ],
    });

    expect(decision).toMatchObject({
      category: "SAFETY_OR_COMPLIANCE",
      reason: "PAYMENT_RECEIPT_REVIEW_REQUIRED",
      customerMessagePolicy: "SILENT_HANDOFF",
      customerMessages: [],
      tag: "NHAN_VIEN",
    });
  });
});

describe("provenance, idempotency, and fail-closed behavior", () => {
  it("hashes evidence and never exposes its raw reference", () => {
    const rawReference = "meta-event-key:private-123";
    const command = reasonCommand("PRICE_UNAVAILABLE", "same-command");
    const decision = decideHandoffFallbackV2({
      ...command,
      evidence: [{ ...command.evidence[0]!, reference: rawReference }],
    });
    const expected = `sha256:${createHash("sha256")
      .update(`INBOUND_MESSAGE\u0000${rawReference}`, "utf8")
      .digest("hex")}`;

    expect(decision.provenance.evidence).toEqual([
      {
        source: "INBOUND_MESSAGE",
        referenceHash: expected,
        observedAt: OBSERVED_AT,
      },
    ]);
    expect(JSON.stringify(decision)).not.toContain(rawReference);
  });

  it("returns the same decision ID when the same command is retried", () => {
    const command = reasonCommand("DEPENDENCY_FAILURE", "runtime-command-42");
    const first = decideHandoffFallbackV2(command);
    const retry = decideHandoffFallbackV2(structuredClone(command));

    expect(retry.decisionId).toBe(first.decisionId);
    expect(retry).toEqual(first);
  });

  it("does not reuse a decision ID when one command ID carries a different payload", () => {
    const first = decideHandoffFallbackV2(reasonCommand("PRICE_UNAVAILABLE", "collision-1"));
    const second = decideHandoffFallbackV2(reasonCommand("STOCK_UNAVAILABLE", "collision-1"));
    expect(first.decisionId).not.toBe(second.decisionId);
  });

  it.each([
    null,
    "bad command",
    {},
    { schemaVersion: 2, commandId: "missing-fields" },
    {
      ...reasonCommand("PRICE_UNAVAILABLE"),
      trigger: { kind: "REASON_CODE", reason: "MODEL_INVENTED_REASON" },
    },
    {
      ...reasonCommand("PRICE_UNAVAILABLE"),
      modelSelectedTag: "VAN_DON",
      customerMessages: ["fabricated fallback"],
    },
    {
      ...reasonCommand("PRICE_UNAVAILABLE"),
      evidence: [],
    },
    {
      ...reasonCommand("PRICE_UNAVAILABLE"),
      decidedAt: "not-a-date",
    },
  ])("fails malformed input closed without a fabricated fallback: %#", (input) => {
    const decision = decideHandoffFallbackV2(input, { fallbackDecidedAt: NOW });

    expect(HandoffDecisionV2Schema.safeParse(decision).success).toBe(true);
    expect(decision).toMatchObject({
      category: "SYSTEM_FAILURE",
      reason: "DEPENDENCY_FAILURE",
      customerMessagePolicy: "SILENT_HANDOFF",
      customerMessages: [],
      tag: "NHAN_VIEN",
      decidedAt: NOW,
    });
    expect(decision.provenance.evidence).toHaveLength(1);
    expect(decision.provenance.evidence[0]?.referenceHash).toMatch(
      /^sha256:[a-f0-9]{64}$/u,
    );
    expect(JSON.stringify(decision)).not.toContain("fabricated fallback");
  });

  it("fails a circular malformed object closed instead of throwing", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      decideHandoffFallbackV2(circular, { fallbackDecidedAt: NOW }),
    ).not.toThrow();
    expect(
      decideHandoffFallbackV2(circular, { fallbackDecidedAt: NOW }),
    ).toMatchObject({ reason: "DEPENDENCY_FAILURE", tag: "NHAN_VIEN" });
  });

  it("fails an input proxy with throwing traps closed instead of throwing", () => {
    const throwingProxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("untrusted proxy trap");
        },
      },
    );

    expect(() =>
      decideHandoffFallbackV2(throwingProxy, { fallbackDecidedAt: NOW }),
    ).not.toThrow();
    expect(
      decideHandoffFallbackV2(throwingProxy, { fallbackDecidedAt: NOW }),
    ).toMatchObject({ reason: "DEPENDENCY_FAILURE", tag: "NHAN_VIEN" });
  });
});
