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

  it("chooses the most relevant supported sales move instead of a fixed funnel step", () => {
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Choose the single sales move that best addresses the customer's current decision or objection using only available code-owned evidence and capabilities.",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Do not default to sizing, checkout, or any fixed funnel step when another supported move is more relevant.",
    );
  });

  it("keeps checkout PII outside ordinary sales nextMove without blocking policy discussion", () => {
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Ordinary nextMove must never request recipient name, phone number, or full delivery address.",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Payment policy or a non-executing payment preference may be discussed as an ordinary commercial decision",
    );
  });

  it("keeps canonical action as a model decision constrained by code-owned state", () => {
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Choose canonicalAction from the current conversational need and code-owned constraints, not from state alone.",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "responsePlanConstraints is code-owned permission input, not a required action.",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).not.toContain(
      "Canonical precedence:",
    );
  });

  it("renders the selected next move without making a new sales decision", () => {
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "not a consultant, analyst, CRM, or customer-service script",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Render exactly the supplied nextMove.target as one short, concrete, natural customer question ending with ?.",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Do not introduce another decision variable",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "nextMove.purpose is internal reasoning only",
    );
  });
});
