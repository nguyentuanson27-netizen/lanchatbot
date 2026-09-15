import { describe, expect, it } from "vitest";
import {
  TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION,
} from "./track-c-c3-two-pass-candidate.js";

describe("Track C C3 V5 typed two-pass prompt boundary", () => {
  it("makes Strategist choose exact evidence and one executable next move", () => {
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Select the exact code-owned claimRef values the Responder may use",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Return one typed response plan, not a prose brief",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "A valid nextMove must change what the shop can recommend, compare, qualify, or transact on the following turn.",
    );
  });

  it("keeps Responder focused on wording instead of re-running sales policy", () => {
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Use only responsePlan, selectedEvidence, and the frozen dialogue",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Do not choose a different fact, sales strategy, recovery route, canonical action, or next move.",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).not.toContain(
      "Apply the first matching canonical rule below",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).not.toContain(
      "checkoutCompleteness",
    );
  });
});
