import { describe, expect, it } from "vitest";
import {
  TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION,
} from "./track-c-c3-two-pass-candidate.js";

describe("Track C C3 V5 sales progression prompt policy", () => {
  it("requires each open-sales next move to change the next sales action", () => {
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "A valid nextMove must change what the shop can recommend, compare, qualify, or transact on the following turn.",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "If the customer's answer would not materially change the next sales action, choose a different nextMove.",
    );
  });

  it("renders abstract sales planning as concrete Vietnamese shop chat", () => {
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "not a consultant, analyst, CRM, or customer-service script",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Translate abstract planning language into simple everyday shop language.",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Prefer short concrete questions about the actual product choice, size, colour, budget, timing, fit, or comparison.",
    );
  });
});
