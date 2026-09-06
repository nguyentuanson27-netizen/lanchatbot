import { describe, expect, it } from "vitest";
import {
  TRACK_C_C3_SALES_QUALITY_CANDIDATE,
  TRACK_C_C3_SALES_QUALITY_SYSTEM_INSTRUCTION,
  buildTrackCC3SalesQualityCandidateRequest,
} from "./track-c-c3-sales-quality-candidate.js";

describe("Track C C3 sales-quality candidate", () => {
  it("declares one bounded prompt/playbook hypothesis without changing the generator", () => {
    expect(TRACK_C_C3_SALES_QUALITY_CANDIDATE).toEqual({
      id: "TRACK_C_C3_SALES_QUALITY_V1",
      primaryHypothesis:
        "Answer the customer intent first, resolve hesitation with verified facts, then use only the smallest stage-fit next step.",
      materialAxes: ["PROMPT_PLAYBOOK"],
      generatorModel: "gemini-3.5-flash-lite",
      providerModelVersion: "gemini-3.5-flash-lite",
    });
  });

  it("adds the proposed naturalness, objection, and CTA guidance without weakening canonical safety", () => {
    const instruction = TRACK_C_C3_SALES_QUALITY_SYSTEM_INSTRUCTION;

    expect(instruction).toContain(
      "never override the first-matching canonical-state rules, verified-claim requirements, provenance, guard, or effect restrictions",
    );
    expect(instruction).toContain(
      "lead with the most direct helpful response to the customer's actual question or concern",
    );
    expect(instruction).toContain(
      "acknowledge it briefly and constructively",
    );
    expect(instruction).toContain(
      "use at most one smallest useful next-step objective",
    );
    expect(instruction).toContain(
      "A required CLARIFICATION plus its matching ACTION_REQUEST counts as one next-step objective",
    );
    expect(instruction).toContain("do not create urgency or pressure");

    expect(instruction).toContain("Use only the verified claims and canonical state in Context V2.");
    expect(instruction).toContain("Never claim to have sent a message, changed a cart, confirmed an order, or performed any side effect.");
    expect(instruction).toContain("PRODUCT_CONTEXT_UNREADY");
    expect(instruction).toContain("MEASUREMENTS_REQUIRED");
    expect(instruction).toContain("Do not claim stock, availability, price, delivery");
    expect(instruction).toContain("Return only the registered JSON response schema.");
  });

  it("uses the existing fail-closed frozen-capture request boundary", () => {
    expect(() => buildTrackCC3SalesQualityCandidateRequest({
      modelResource:
        "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite",
      capture: null,
      evaluationAt: new Date("2026-09-05T00:00:00.000Z"),
    })).toThrow("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_INVALID");
  });
});
