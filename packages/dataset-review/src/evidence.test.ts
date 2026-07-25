import { describe, expect, it } from "vitest";
import { PrelabelAnnotationV1Schema } from "@lana/contracts";
import {
  findMutualExclusionConflicts,
  locateEvidence,
  validatePrelabelAnnotation,
  type ValidationMessage,
} from "./evidence.js";
import { WAVE1_LABEL_SCHEMA } from "./wave1-schema.js";

function ann(partial: Record<string, unknown>) {
  return PrelabelAnnotationV1Schema.parse({
    secondTurnIndex: null,
    reason: "",
    ...partial,
  });
}

const messages: readonly ValidationMessage[] = [
  { turnIndex: 0, role: "CUSTOMER", messageId: "m0", redactedText: "chị lấy mẫu này size M" },
  { turnIndex: 1, role: "SHOP", messageId: "m1", redactedText: "shop có size S M L XL nha" },
  { turnIndex: 2, role: "SHOP", messageId: "m2", redactedText: "cho em xin chiều cao cân nặng nha" },
];

describe("locateEvidence", () => {
  it("returns offsets for a unique exact match", () => {
    expect(locateEvidence("chị lấy mẫu này size M", "mẫu này")).toEqual({
      startOffset: 8,
      endOffset: 15,
    });
  });
  it("returns null when not found and 'ambiguous' when repeated", () => {
    expect(locateEvidence("abc", "xyz")).toBeNull();
    expect(locateEvidence("ok ok", "ok")).toBe("ambiguous");
  });
});

describe("validatePrelabelAnnotation", () => {
  it("accepts a customer buying-committed with matching evidence and derives offsets", () => {
    const result = validatePrelabelAnnotation(
      ann({ labelCode: "BUYING_COMMITTED", scope: "CUSTOMER_MESSAGE", turnIndex: 0, evidenceText: "chị lấy mẫu này size M", confidence: "HIGH" }),
      WAVE1_LABEL_SCHEMA,
      messages,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.evidence?.messageId).toBe("m0");
  });

  it("rejects a customer SIZE_QUESTION placed on a shop turn that merely lists sizes", () => {
    // Hard-negative: shop lists S M L XL — this must not create a customer size intent.
    const result = validatePrelabelAnnotation(
      ann({ labelCode: "SIZE_QUESTION", scope: "CUSTOMER_MESSAGE", turnIndex: 1, evidenceText: "size S M L XL", confidence: "HIGH" }),
      WAVE1_LABEL_SCHEMA,
      messages,
    );
    expect(result).toEqual({ ok: false, error: "ROLE_SCOPE_MISMATCH" });
  });

  it("rejects MEASUREMENTS_PROVIDED when it is the shop asking for height/weight", () => {
    const result = validatePrelabelAnnotation(
      ann({ labelCode: "MEASUREMENTS_PROVIDED", scope: "CUSTOMER_MESSAGE", turnIndex: 2, evidenceText: "chiều cao cân nặng", confidence: "MEDIUM" }),
      WAVE1_LABEL_SCHEMA,
      messages,
    );
    expect(result).toEqual({ ok: false, error: "ROLE_SCOPE_MISMATCH" });
  });

  it("rejects evidence that does not exact-match the message", () => {
    const result = validatePrelabelAnnotation(
      ann({ labelCode: "BUYING_COMMITTED", scope: "CUSTOMER_MESSAGE", turnIndex: 0, evidenceText: "chốt đơn luôn", confidence: "HIGH" }),
      WAVE1_LABEL_SCHEMA,
      messages,
    );
    expect(result).toEqual({ ok: false, error: "EVIDENCE_NOT_FOUND" });
  });

  it("rejects a label outside the schema", () => {
    const result = validatePrelabelAnnotation(
      ann({ labelCode: "HANDOFF_OCCURRED", scope: "CONVERSATION", turnIndex: 0, evidenceText: null, confidence: "LOW" }),
      WAVE1_LABEL_SCHEMA,
      messages,
    );
    expect(result).toEqual({ ok: false, error: "LABEL_NOT_IN_SCHEMA" });
  });

  it("accepts a conversation observational label with no evidence required", () => {
    const result = validatePrelabelAnnotation(
      ann({ labelCode: "NO_EXPLICIT_CHECKOUT_OBSERVED", scope: "CONVERSATION", turnIndex: 0, evidenceText: null, confidence: "MEDIUM" }),
      WAVE1_LABEL_SCHEMA,
      messages,
    );
    expect(result).toEqual({ ok: true, evidence: null });
  });
});

describe("findMutualExclusionConflicts", () => {
  it("detects two BUYING_STATE labels on the same turn", () => {
    const conflicts = findMutualExclusionConflicts(WAVE1_LABEL_SCHEMA, [
      { labelCode: "BUYING_CANDIDATE", turnIndex: 0 },
      { labelCode: "BUYING_COMMITTED", turnIndex: 0 },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.group).toBe("BUYING_STATE");
  });

  it("allows the same exclusive group on different turns", () => {
    const conflicts = findMutualExclusionConflicts(WAVE1_LABEL_SCHEMA, [
      { labelCode: "BUYING_CANDIDATE", turnIndex: 0 },
      { labelCode: "BUYING_COMMITTED", turnIndex: 4 },
    ]);
    expect(conflicts).toHaveLength(0);
  });
});
