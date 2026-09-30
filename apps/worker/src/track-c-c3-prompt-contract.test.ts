import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./track-c-c3-strategy-contract-runner.ts", import.meta.url),
  "utf8",
);

function promptBlock(start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`prompt block missing: ${start}`);
  return source.slice(from, to);
}

const strategist = promptBlock(
  "const STRATEGIST_INSTRUCTION",
  "const RESPONDER_INSTRUCTION",
);
const responder = promptBlock(
  "const RESPONDER_INSTRUCTION",
  "const ADAPTIVE_RESPONDER_INSTRUCTION",
);
const adaptiveResponder = promptBlock(
  "const ADAPTIVE_RESPONDER_INSTRUCTION",
  "// Temporary realization limit",
);

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
    expectSectionsInOrder(strategist, [
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
    expect(strategist).toContain("Resolve the customer's current decision first");
    expect(strategist).toContain("smallest real remaining buying friction");
    expect(strategist).toContain("selectableEvidence list is the only commercial factual authority");
    expect(strategist).toContain("Never upgrade a buying signal into commitment");
    expect(strategist).toContain("KEEP_OPEN is not a default escape hatch");
    expect(strategist).toContain("Missing shop evidence cannot be supplied by a customer answer");
  });

  it.each([
    ["fixed", responder],
    ["adaptive", adaptiveResponder],
  ])("keeps the %s Responder execution-only while making the sales realization order explicit", (_lane, prompt) => {
    expectSectionsInOrder(prompt, [
      "# ROLE",
      "# OBJECTIVE",
      "# AUTHORITY",
      "# REALIZATION PROCEDURE",
      "# HARD RULES",
      "# SPECIAL CASES",
    ]);
    expect(prompt).toContain("Follow the Strategist's decision; do not choose a new strategy");
    expect(prompt).toContain("useful answer, relevance to the customer's stated decision, then the supplied progression");
    expect(prompt).toContain("The Strategist owns adaptive choice; code owns validation, binding, exact checkout fields and effect permission");
    expect(prompt).toContain("Never claim that an order, payment, delivery, message, or other effect has happened");
  });
});
