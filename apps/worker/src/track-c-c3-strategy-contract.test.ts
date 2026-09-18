import { describe, expect, it } from "vitest";
import {
  compileTrackCStrategistDecision,
  selectTrackCConversationLane,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";

const stockEvidence: TrackCSelectableEvidence = {
  ref: "E_STOCK",
  capability: "STOCK",
  subject: { productId: "SQ9012", displayName: "Mẫu A" },
  value: { status: "IN_STOCK" },
  provenance: {
    contentHash: "a".repeat(64),
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
    const task = compileTrackCStrategistDecision({
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

    expect(task.answer).toMatchObject({ kind: "ANSWER", status: "UNRESOLVED" });
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
});
