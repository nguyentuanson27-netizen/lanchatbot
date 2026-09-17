import { describe, expect, it } from "vitest";
import {
  TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION,
} from "./track-c-c3-two-pass-candidate.js";

describe("Track C C3 Strategist output diagnostics contract", () => {
  it("spells out the NONE sentinel required by the local response-plan parser", () => {
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      'When nextMove.action = NONE, set nextMove.decisionInput = "NONE", nextMove.target = "NONE", and nextMove.purpose = "NONE".',
    );
  });
});
