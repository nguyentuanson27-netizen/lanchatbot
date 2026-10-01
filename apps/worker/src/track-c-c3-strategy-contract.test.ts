import { describe, expect, it, vi } from "vitest";
import * as database from "@lana/database";
import {
  compileTrackCFixedFirstContactTask,
  compileTrackCStrategistDecision,
  selectTrackCConversationLane,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";

const stockEvidence: TrackCSelectableEvidence = {
  ref: "E_STOCK",
  capability: "STOCK",
  subject: { productId: "SQ9012", displayName: "Mẫu A" },
  value: { status: "IN_STOCK" },
  deterministicText: "Dạ mẫu này hiện còn hàng ạ.",
  provenance: {
    contentHash: "a".repeat(64),
    authority: "RUNTIME",
  },
};

const priceEvidence: TrackCSelectableEvidence = {
  ref: "E_PRICE",
  capability: "PRICE",
  subject: { productId: "SQ9012", displayName: "Mẫu A" },
  value: { amountVnd: 849000 },
  deterministicText: "Dạ giá hiện tại của mẫu này là 849.000đ ạ.",
  provenance: {
    contentHash: "b".repeat(64),
    authority: "RUNTIME",
  },
};

describe("Track C C3 clean strategy contract", () => {
  it("uses the fixed lane only for the exact trusted acquisition signal", () => {
    expect(selectTrackCConversationLane([])).toBe("ADAPTIVE_FOLLOWUP");
    expect(selectTrackCConversationLane([{
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: true,
      authorization: "NONE",
    }])).toBe("FIRST_CONTACT_FIXED");
    expect(selectTrackCConversationLane([{
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
      origin: "ORGANIC",
      firstMeaningfulInbound: true,
      authorization: "NONE",
    }])).toBe("ADAPTIVE_FOLLOWUP");
  });

  it("keeps unresolved propositions selectable without granting a fact", () => {
    const { task } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Làm rõ tình trạng còn hàng.",
        proposition: "STOCK",
        evidenceRefs: [],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [stockEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });

    expect(task.answer).toMatchObject({ kind: "ANSWER", evidenceStatus: "UNRESOLVED" });
    expect(task.evidence).toEqual([]);
  });

  it("rejects a provider-valid continuation that the compiler would reject", () => {
    expect(() => compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Hỏi thêm thông tin phù hợp.",
        proposition: "NONE",
        evidenceRefs: [],
        continuation: { type: "ASK" },
        canonicalAction: "NONE",
      },
      evidence: [stockEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    })).toThrow("TRACK_C_STRATEGIST_DECISION_INVALID");
  });

  it("does not mark a proposition supported when its selected evidence has another capability", () => {
    const { task } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Làm rõ tình trạng còn hàng.",
        proposition: "STOCK",
        evidenceRefs: [priceEvidence.ref],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [priceEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });

    expect(task.answer).toMatchObject({ kind: "ANSWER", evidenceStatus: "UNRESOLVED" });
    expect(task.requiredEvidenceRefs).toEqual([]);
  });

  it("allows acknowledgement-only intent without factual evidence", () => {
    const { task } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "ACKNOWLEDGE",
        goal: "Ghi nhận băn khoăn của khách.",
        proposition: "STOCK",
        evidenceRefs: [],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [stockEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });

    expect(task.answer).toMatchObject({
      kind: "ACKNOWLEDGE",
    });
    expect(task.evidence).toEqual([]);
    expect(task.requiredEvidenceRefs).toEqual([]);
  });

  it("allows grounded evidence for an acknowledge-and-explain response", () => {
    const { task } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "ACKNOWLEDGE",
        goal: "Ghi nhận băn khoăn rồi giải thích tình trạng còn hàng.",
        proposition: "STOCK",
        evidenceRefs: [stockEvidence.ref],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [stockEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });

    expect(task.answer).toEqual({ kind: "ACKNOWLEDGE", goal: "Ghi nhận băn khoăn rồi giải thích tình trạng còn hàng." });
    expect(task.evidence).toEqual([stockEvidence]);
  });

  it("retains price evidence and the unanswered part of a compound question without adding progression", () => {
    const { decision, task } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Trả lời giá đã xác minh; chưa có evidence về khả năng chống nhăn.",
        proposition: "PRICE",
        evidenceRefs: [priceEvidence.ref],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [priceEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });

    expect(task.answer).toMatchObject({
      kind: "ANSWER",
      evidenceStatus: "SUPPORTED",
      proposition: "PRICE",
    });
    expect(task.continuation).toEqual({ type: "KEEP_OPEN" });
    expect(task.canonicalRequest).toBeNull();
    expect(task.evidence).toEqual([priceEvidence]);
    expect(task.answer.goal).toBe(decision.goal);
  });

  it("still rejects quarantined goals at the shared PII boundary", () => {
    const redact = vi.spyOn(database, "redactAnalyticsMessage").mockReturnValueOnce({
      text: "[PII_REDACTED_MESSAGE]", dlpStatus: "QUARANTINED",
    });
    try {
      expect(() => compileTrackCStrategistDecision({
        decision: {
          replyAct: "ACKNOWLEDGE", goal: "Unsafe planning text.",
          proposition: "NONE", evidenceRefs: [],
          continuation: { type: "KEEP_OPEN" }, canonicalAction: "NONE",
        },
        evidence: [], permittedCanonicalActions: ["NONE"],
        measurementsUnavailable: false, productResolved: true, hardStop: false,
      })).toThrow("TRACK_C_STRATEGIST_DECISION_INVALID");
    } finally {
      redact.mockRestore();
    }
  });

  it("allows supported evidence with a typed ordinary ASK chosen by the Strategist", () => {
    const { task } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Trả lời giá rồi hỏi tiêu chí có thể thay đổi bước tư vấn tiếp theo.",
        proposition: "PRICE",
        evidenceRefs: [priceEvidence.ref],
        continuation: { type: "ASK", input: "DECISION_CRITERION" },
        canonicalAction: "NONE",
      },
      evidence: [priceEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });

    expect(task.answer).toMatchObject({
      kind: "ANSWER",
      evidenceStatus: "SUPPORTED",
      proposition: "PRICE",
    });
    expect(task.continuation).toEqual({
      type: "ASK",
      input: "DECISION_CRITERION",
    });
  });

  it("requires canonical action to be the only progression mechanism", () => {
    const { task: valid } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "CLARIFY",
        goal: "Xin số đo cần thiết.",
        proposition: "NONE",
        evidenceRefs: [],
        continuation: null,
        canonicalAction: "ASK_MEASUREMENTS",
      },
      evidence: [],
      permittedCanonicalActions: ["ASK_MEASUREMENTS"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    });
    expect(valid.continuation).toBeNull();
    expect(valid.canonicalRequest).toEqual({ type: "ASK_MEASUREMENTS" });

    expect(() => compileTrackCStrategistDecision({
      decision: {
        replyAct: "CLARIFY",
        goal: "Xin số đo cần thiết.",
        proposition: "NONE",
        evidenceRefs: [],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "ASK_MEASUREMENTS",
      },
      evidence: [],
      permittedCanonicalActions: ["ASK_MEASUREMENTS"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    })).toThrow("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  });

  it("keeps HOLD_POSITION closed for acknowledgement-only protected intent", () => {
    const { task } = compileTrackCStrategistDecision({
      decision: {
        replyAct: "ACKNOWLEDGE",
        goal: "Ghi nhận và không mở lại cuộc hội thoại.",
        proposition: "STOCK",
        evidenceRefs: [],
        continuation: null,
        canonicalAction: "HOLD_POSITION",
      },
      evidence: [stockEvidence],
      permittedCanonicalActions: ["HOLD_POSITION"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: true,
    });

    expect(task.answer).toMatchObject({
      kind: "ACKNOWLEDGE",
    });
    expect(task.evidence).toEqual([]);
    expect(task.continuation).toBeNull();
    expect(task.canonicalRequest).toEqual({ type: "HOLD_POSITION" });
  });

  it("rejects an unknown selected evidence reference", () => {
    expect(() => compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Trả lời tình trạng còn hàng.",
        proposition: "STOCK",
        evidenceRefs: ["E_UNKNOWN"],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [stockEvidence],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    })).toThrow("TRACK_C_STRATEGIST_EVIDENCE_INVALID");
  });

  it("rejects selected evidence outside the bound product referent", () => {
    const otherProduct = {
      ...stockEvidence,
      ref: "E_OTHER_PRODUCT",
      subject: { productId: "SQ0000", displayName: "Mẫu khác" },
      provenance: { ...stockEvidence.provenance, contentHash: "c".repeat(64) },
    } as const satisfies TrackCSelectableEvidence;

    expect(() => compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Trả lời tình trạng còn hàng.",
        proposition: "STOCK",
        evidenceRefs: [otherProduct.ref],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [otherProduct],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
      boundProductIds: ["SQ9012"],
    })).toThrow("TRACK_C_EVIDENCE_BINDING_INVALID");
  });

  it("rejects duplicate selected provenance instead of treating it as two facts", () => {
    const duplicate = {
      ...stockEvidence,
      ref: "E_STOCK_DUPLICATE",
    } as const satisfies TrackCSelectableEvidence;

    expect(() => compileTrackCStrategistDecision({
      decision: {
        replyAct: "ANSWER",
        goal: "Trả lời tình trạng còn hàng.",
        proposition: "STOCK",
        evidenceRefs: [stockEvidence.ref, duplicate.ref],
        continuation: { type: "KEEP_OPEN" },
        canonicalAction: "NONE",
      },
      evidence: [stockEvidence, duplicate],
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
      productResolved: true,
      hardStop: false,
    })).toThrow("TRACK_C_EVIDENCE_PROVENANCE_DUPLICATE");
  });

  it("follows fixed first-contact priority: product identity, color, then measurements", () => {
    const unresolved = compileTrackCFixedFirstContactTask({
      productResolved: false,
      classificationOrVariantRequired: true,
      colorChoiceMeaningful: true,
      evidence: [priceEvidence],
      boundProductIds: ["SQ9012"],
    });
    const colors = compileTrackCFixedFirstContactTask({
      productResolved: true,
      classificationOrVariantRequired: false,
      colorChoiceMeaningful: true,
      evidence: [priceEvidence],
      boundProductIds: ["SQ9012"],
    });
    const measurements = compileTrackCFixedFirstContactTask({
      productResolved: true,
      classificationOrVariantRequired: false,
      colorChoiceMeaningful: false,
      evidence: [priceEvidence],
      boundProductIds: ["SQ9012"],
    });

    expect(unresolved.canonicalRequest).toEqual({ type: "ASK_PRODUCT" });
    expect(colors.continuation).toEqual({ type: "ASK", input: "COLOR" });
    expect(measurements.canonicalRequest).toEqual({ type: "ASK_MEASUREMENTS" });
  });

  it("keeps fixed progression priority when price is unresolved", () => {
    const task = compileTrackCFixedFirstContactTask({
      productResolved: true,
      classificationOrVariantRequired: false,
      colorChoiceMeaningful: false,
      evidence: [],
      boundProductIds: ["SQ9012"],
    });

    expect(task.answer).toMatchObject({
      kind: "ANSWER",
      evidenceStatus: "UNRESOLVED",
      proposition: "PRICE",
    });
    expect(task.continuation).toBeNull();
    expect(task.canonicalRequest).toEqual({ type: "ASK_MEASUREMENTS" });
  });
});
