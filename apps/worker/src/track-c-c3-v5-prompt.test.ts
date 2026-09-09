import { describe, expect, it } from "vitest";
import {
  TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION,
  TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION,
  TRACK_C_C3_TWO_PASS_PROMPT_VERSION,
} from "./track-c-c3-two-pass-candidate.js";

describe("Track C C3 V5 two-pass prompt policy", () => {
  it("pins V5 as a Strategist -> Responder prompt policy", () => {
    expect(TRACK_C_C3_TWO_PASS_PROMPT_VERSION).toBe("V5");
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "Conversation continuation is preferred only when it helps the customer make the same or next closely related decision.",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).toContain(
      "A transaction CTA is not the default.",
    );
    expect(TRACK_C_C3_STRATEGIST_SYSTEM_INSTRUCTION).not.toContain(
      "a useful bridge is the default",
    );
  });

  it("defaults customer-facing Vietnamese to chị/em and keeps continuation decision-supportive", () => {
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Default Vietnamese address is chị/em",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Conversation continuation is preferred when it genuinely helps the customer make the same or next closely related decision. A purchase CTA is not the default.",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Do not manufacture a question merely to make the conversation longer.",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).not.toContain(
      "a useful bridge is the default",
    );
  });

  it("keeps PR #356 provenance ownership code-side", () => {
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "never copy, invent, or return a provenance hash",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "copy only the exact code-owned claimRef",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).not.toContain(
      "claimContentHash",
    );
  });

  it("keeps resolve-first and hard-close gating explicit", () => {
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Fully answer the customer's latest question or concern before any continuation.",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "Price, stock, shipping, size, or product-information questions alone do not establish purchase commitment.",
    );
    expect(TRACK_C_C3_RESPONDER_SYSTEM_INSTRUCTION).toContain(
      "When buyingIntent.decision is COMMITTED",
    );
  });
});
