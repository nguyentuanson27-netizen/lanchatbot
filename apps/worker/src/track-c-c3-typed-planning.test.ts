import { describe, expect, it } from "vitest";
import { compileTrackCStrategistDecision, type TrackCRequestedObligation, type TrackCSelectableEvidence } from "./track-c-c3-strategy-contract.js";

const fact: TrackCSelectableEvidence = { ref: "current-price", capability: "PRICE", subject: { productId: "ITEM42" },
  value: { amountVnd: 725000 }, deterministicText: "Giá hiện tại là 725.000đ.", provenance: { contentHash: "b".repeat(64), authority: "RUNTIME" } };
const requests: readonly TrackCRequestedObligation[] = [
  { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "ITEM42" },
  { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WRINKLE_RESISTANCE", productId: "ITEM42" },
];
const absentGoal = "NEED: NONE\nKNOWN: NONE\nANSWER: NONE\nLIMIT: NONE\nNEXT: NONE";
const base = { evidence: [fact], boundProductIds: ["ITEM42"], measurementsUnavailable: false,
  productResolved: true, hardStop: false, requireStructuredGoal: true };

describe("typed task is the sole planning authority", () => {
  it("rejects an unrelated price when only an unsupported property was requested", () => {
    expect(() => compileTrackCStrategistDecision({ ...base, permittedCanonicalActions: ["NONE"],
      requestedObligations: requests.slice(1), decision: { replyAct: "ANSWER", proposition: "PRICE", evidenceRefs: [fact.ref],
        goal: absentGoal, canonicalAction: "NONE", continuation: { type: "KEEP_OPEN" } } }))
      .toThrow("TRACK_C_STRATEGIST_REQUEST_SCOPE_INVALID");
  });
  it.each(["HOLD_POSITION", "ASK_MEASUREMENTS", "ASK_CHECKOUT_DETAILS"] as const)(
    "derives %s despite absent NEED/NEXT prose", (action) => {
      const result = compileTrackCStrategistDecision({ ...base, permittedCanonicalActions: [action],
        checkoutRequestedFields: ["PHONE"], measurementRequestedFields: ["WAIST_CM"],
        decision: { replyAct: "ACKNOWLEDGE", proposition: "NONE", evidenceRefs: [], goal: absentGoal,
          continuation: null, canonicalAction: action } });
      expect(result.task.canonicalRequest?.type).toBe(action);
      expect(result.task.continuation).toBeNull();
      expect(result.task.semanticHandoff?.next).toBe(action === "HOLD_POSITION" ? null : action);
    });
  it("keeps a resolved terminal answer despite a contradictory NEXT diagnostic", () => {
    const result = compileTrackCStrategistDecision({ ...base, permittedCanonicalActions: ["NONE"],
      requestedObligations: requests.slice(0, 1), decision: { replyAct: "ANSWER", proposition: "PRICE", evidenceRefs: [fact.ref],
        goal: absentGoal.replace("NEXT: NONE", "NEXT: ask measurements"), canonicalAction: "NONE", continuation: { type: "KEEP_OPEN" } } });
    expect(result.task.continuation).toEqual({ type: "KEEP_OPEN" });
    expect(result.task.canonicalRequest).toBeNull();
    expect(result.task.semanticHandoff?.next).toBeNull();
  });
  it.each([false, true])("derives unsupported limitations without LIMIT prose, supported sibling %s", (supported) => {
    const result = compileTrackCStrategistDecision({ ...base, permittedCanonicalActions: ["NONE"],
      requestedObligations: supported ? requests : requests.slice(1),
      decision: { replyAct: "ANSWER", proposition: supported ? "PRICE" : "PRODUCT_ATTRIBUTES", evidenceRefs: supported ? [fact.ref] : [],
        goal: absentGoal, canonicalAction: "NONE", continuation: { type: "KEEP_OPEN" } } });
    expect(result.task.obligationResolutions?.at(-1)).toMatchObject({ scope: "WRINKLE_RESISTANCE", status: "UNSUPPORTED" });
    expect(result.task.semanticHandoff?.limit).toBe("PRODUCT_ATTRIBUTES/WRINKLE_RESISTANCE unsupported");
    expect(result.task.evidence).toEqual(supported ? [fact] : []);
  });
  it("still rejects two typed progressions regardless of prose", () => {
    expect(() => compileTrackCStrategistDecision({ ...base, permittedCanonicalActions: ["ASK_CHECKOUT_DETAILS"],
      checkoutRequestedFields: ["PHONE"], decision: { replyAct: "ACKNOWLEDGE", proposition: "NONE", evidenceRefs: [], goal: absentGoal,
        canonicalAction: "ASK_CHECKOUT_DETAILS", continuation: { type: "ASK", input: "COLOR" } } }))
      .toThrow("TRACK_C_STRATEGIST_PROGRESSION_INVALID");
  });
});
