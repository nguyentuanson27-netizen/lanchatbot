import { describe, expect, it } from "vitest";
import {
  compileTrackCFixedFirstContactTask,
  compileTrackCStrategistDecision,
  selectTrackCConversationLane,
} from "./track-c-c3-strategy-contract.js";

describe("Track C C3 simplified strategy contract", () => {
  it("uses the fixed lane only for a trusted first meaningful acquisition", () => {
    expect(selectTrackCConversationLane([])).toBe("ADAPTIVE_FOLLOWUP");
    expect(selectTrackCConversationLane([{
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: false,
      authorization: "NONE",
    }])).toBe("ADAPTIVE_FOLLOWUP");
    expect(selectTrackCConversationLane([{
      kind: "TRACK_C_TRUSTED_ACQUISITION_V1",
      origin: "ADVERTISEMENT",
      firstMeaningfulInbound: true,
      authorization: "NONE",
    }])).toBe("FIRST_CONTACT_FIXED");
  });

  it("uses one fixed progression and never asks usual size first", () => {
    const task = compileTrackCFixedFirstContactTask({
      productResolved: true,
      colorChoiceMeaningful: true,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: ["PRODUCT_PRESENTATION_VARIANT_001"],
      authorizedSellingPointRef: "CLAIM_002",
    });

    expect(task.answer.status).toBe("SUPPORTED");
    expect(task.evidenceRefs).toEqual([
      "CLAIM_001",
      "PRODUCT_PRESENTATION_VARIANT_001",
      "CLAIM_002",
    ]);
    expect(task.continuation).toEqual({ type: "ASK", input: "COLOR" });
    expect(task.canonicalRequest).toBeNull();
  });

  it("asks measurements when color is not a meaningful choice", () => {
    const task = compileTrackCFixedFirstContactTask({
      productResolved: true,
      colorChoiceMeaningful: false,
      priceEvidenceRef: "CLAIM_001",
      productEvidenceRefs: [],
      authorizedSellingPointRef: null,
    });

    expect(task.continuation).toBeNull();
    expect(task.canonicalRequest).toEqual({ type: "ASK_MEASUREMENTS" });
    expect(task.evidenceRefs).toEqual(["CLAIM_001"]);
  });

  it("keeps product and measurements canonical-only and permits usual size only as a fallback", () => {
    const decision = {
      replyAct: "ANSWER",
      goal: "Resolve the fit concern without guessing.",
      proposition: "SIZE_FIT",
      evidenceRefs: [],
      continuation: { type: "ASK", input: "USUAL_SIZE" },
      canonicalAction: "NONE",
    };

    expect(() => compileTrackCStrategistDecision({
      decision,
      evidenceCapabilities: new Map(),
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: false,
    })).toThrow("TRACK_C_STRATEGIST_USUAL_SIZE_NOT_FALLBACK");

    expect(compileTrackCStrategistDecision({
      decision,
      evidenceCapabilities: new Map(),
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: true,
    })).toMatchObject({
      answer: { kind: "ANSWER", status: "UNRESOLVED" },
      continuation: { type: "ASK", input: "USUAL_SIZE" },
    });

    expect(() => compileTrackCStrategistDecision({
      decision: { ...decision, continuation: { type: "ASK", input: "PRODUCT" } },
      evidenceCapabilities: new Map(),
      permittedCanonicalActions: ["NONE"],
      measurementsUnavailable: true,
    })).toThrow("TRACK_C_STRATEGIST_DECISION_INVALID");
  });
});
