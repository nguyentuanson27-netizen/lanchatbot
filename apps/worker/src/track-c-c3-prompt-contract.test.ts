import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_RESPONDER_INSTRUCTION,
  RESPONDER_INSTRUCTION,
  STRATEGIST_INSTRUCTION,
} from "./track-c-c3-prompts.js";

function expectSectionsInOrder(text: string, sections: readonly string[]): void {
  let cursor = -1;
  for (const section of sections) {
    const next = text.indexOf(section);
    expect(next, `${section} should be present`).toBeGreaterThan(cursor);
    cursor = next;
  }
}

describe("Track C C3 sales prompt contract", () => {
  it("gives the Strategist an ordered sales decision procedure without weakening authority", () => {
    expectSectionsInOrder(STRATEGIST_INSTRUCTION, [
      "# ROLE",
      "# SALES OBJECTIVE",
      "# AUTHORITY",
      "# DECISION PROCEDURE",
      "# OBJECTIONS AND BUYING SIGNALS",
      "# EVIDENCE",
      "# PROGRESSION",
      "# OUTPUT CONTRACT",
      "# HARD INVARIANTS",
      "# EXAMPLES",
    ]);
    expect(STRATEGIST_INSTRUCTION).toContain("Resolve the customer's current decision first");
    expect(STRATEGIST_INSTRUCTION).toContain("smallest real remaining buying friction");
    expect(STRATEGIST_INSTRUCTION).toContain("selectableEvidence list is the only commercial factual authority");
    expect(STRATEGIST_INSTRUCTION).toContain("Never upgrade a buying signal into commitment");
    expect(STRATEGIST_INSTRUCTION).toContain("KEEP_OPEN is not a default escape hatch");
    expect(STRATEGIST_INSTRUCTION).toContain("Missing shop evidence cannot be supplied by a customer answer");
  });

  it.each([
    ["fixed", RESPONDER_INSTRUCTION],
    ["adaptive", ADAPTIVE_RESPONDER_INSTRUCTION],
  ])("keeps the %s Responder execution-only while making the sales realization order explicit", (_lane, prompt) => {
    expectSectionsInOrder(prompt, [
      "# ROLE",
      "# OBJECTIVE",
      "# AUTHORITY",
      "# REALIZATION PROCEDURE",
      "# HARD RULES",
      "# SPECIAL CASES",
    ]);
    expect(prompt).toContain("do not choose a new strategy");
    expect(prompt).toContain("useful answer, relevance to the customer's stated decision, then the supplied progression");
    expect(prompt).toContain("The Strategist owns adaptive choice; code owns validation, binding, exact checkout fields and effect permission");
    expect(prompt).toContain("Never claim that an order, payment, delivery, message, or other effect has happened");
  });

  it("keeps the adaptive Responder explicitly subordinate to the Strategist", () => {
    expect(ADAPTIVE_RESPONDER_INSTRUCTION).toContain(
      "Follow the Strategist's decision; do not choose a new strategy",
    );
    expect(ADAPTIVE_RESPONDER_INSTRUCTION).toContain(
      "All shop facts must remain inside the supplied factualTexts",
    );
  });
});
