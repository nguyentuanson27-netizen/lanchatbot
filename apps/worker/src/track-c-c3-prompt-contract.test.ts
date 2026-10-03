import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_RESPONDER_INSTRUCTION,
  RESPONDER_INSTRUCTION,
  STRATEGIST_INSTRUCTION,
  resolveTrackCC3SystemInstruction,
} from "./track-c-c3-prompts.js";

function expectSectionsInOrder(text: string, sections: readonly string[]): void {
  let cursor = -1;
  for (const section of sections) {
    const next = text.indexOf(section);
    expect(next, `${section} should be present`).toBeGreaterThan(cursor);
    cursor = next;
  }
}

const runnerSource = readFileSync(
  new URL("./track-c-c3-strategy-contract-runner.ts", import.meta.url),
  "utf8",
);

function legacyPrompt(name: string): string {
  const marker = `const ${name} = [`;
  const from = runnerSource.indexOf(marker);
  const to = runnerSource.indexOf(`].join("\\n");`, from + marker.length);
  if (from < 0 || to < 0) throw new Error(`legacy prompt block missing: ${name}`);
  return runnerSource.slice(from + marker.length, to)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith('"'))
    .map((line) => JSON.parse(line.endsWith(",") ? line.slice(0, -1) : line) as string)
    .join("\n");
}

describe("Track C C3 sales prompt contract", () => {
  it("gives the Strategist an ordered sales decision procedure without weakening authority", () => {
    expectSectionsInOrder(STRATEGIST_INSTRUCTION, [
      "# ROLE AND OWNERSHIP",
      "# PRECEDENCE",
      "# DECISION ALGORITHM",
      "# OUTPUT FIELD RULES",
      "# HARD INVARIANTS",
    ]);
    expect(STRATEGIST_INSTRUCTION).toContain("Resolve the customer's current decision first");
    expect(STRATEGIST_INSTRUCTION).toContain("smallest real remaining buying friction");
    expect(STRATEGIST_INSTRUCTION).toContain("selectableEvidence list is the only commercial factual authority");
    expect(STRATEGIST_INSTRUCTION).toContain("Never upgrade a buying signal into commitment");
    expect(STRATEGIST_INSTRUCTION).toContain("No further customer input or canonical action is useful for this turn");
    expect(STRATEGIST_INSTRUCTION).toContain("bounded limitation for missing shop-owned information");
    expect(STRATEGIST_INSTRUCTION).not.toContain("use it only after the current need is resolved");
    expect(STRATEGIST_INSTRUCTION).toContain("canonical hard stop requires HOLD_POSITION");
    expect(STRATEGIST_INSTRUCTION).toContain("Missing shop evidence cannot be supplied by a customer answer");
    expect(STRATEGIST_INSTRUCTION).toContain("code owns complete matching factual coverage and bounded limitations");
    expect(STRATEGIST_INSTRUCTION).toContain("omitting a ref or returning an empty list never removes a required fact");
    expect(STRATEGIST_INSTRUCTION).not.toContain("Select evidence for every supported requested part");
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
    expect(prompt).toContain("Code supplies each consultationObligation's exact bounded outcome");
    expect(prompt).toContain("acknowledgement cannot mark that concern answered or replace its outcome");
  });

  it("keeps the adaptive Responder explicitly subordinate to the Strategist", () => {
    expect(ADAPTIVE_RESPONDER_INSTRUCTION).toContain(
      "Follow the Strategist's decision; do not choose a new strategy",
    );
    expect(ADAPTIVE_RESPONDER_INSTRUCTION).toContain("Speak as em to chị");
    expect(ADAPTIVE_RESPONDER_INSTRUCTION).toContain(
      "All shop facts must remain inside the supplied factualTexts",
    );
  });

  it.each([
    ["fixed", RESPONDER_INSTRUCTION],
    ["adaptive", ADAPTIVE_RESPONDER_INSTRUCTION],
  ])("removes semantic routing and inference from the %s writer", (_lane, prompt) => {
    expect(prompt).toContain("The compiled task already represents the current decision");
    expect(prompt).toContain("Do not reinterpret intent, choose a different concern, select or drop evidence");
    expect(prompt).toContain("Code supplies missing input fields");
    expect(prompt).toContain("Never infer preference-to-benefit");
    expect(prompt).toContain("Never calculate a comparison or time relation");
    for (const old of ["Read the entire dialogue", "Prefer the latest concern",
      "customerDecisionSignals", "if dialogue already gives an amount",
      "Briefly connect the customer's stated preference"])
      expect(prompt).not.toContain(old);
  });

  it("routes only the exact legacy C3 prompt revisions to the centralized prompts", () => {
    const legacyStrategist = legacyPrompt("STRATEGIST_INSTRUCTION");
    const legacyResponder = legacyPrompt("RESPONDER_INSTRUCTION");
    const legacyAdaptive = legacyPrompt("ADAPTIVE_RESPONDER_INSTRUCTION");
    expect(resolveTrackCC3SystemInstruction(legacyStrategist)).toBe(STRATEGIST_INSTRUCTION);
    expect(resolveTrackCC3SystemInstruction(legacyResponder)).toBe(RESPONDER_INSTRUCTION);
    expect(resolveTrackCC3SystemInstruction(legacyAdaptive)).toBe(ADAPTIVE_RESPONDER_INSTRUCTION);
    expect(resolveTrackCC3SystemInstruction(`${legacyStrategist}\ncustom experiment`))
      .toBe(`${legacyStrategist}\ncustom experiment`);
    expect(resolveTrackCC3SystemInstruction("unrelated Track C evaluator prompt"))
      .toBe("unrelated Track C evaluator prompt");
  });
});
