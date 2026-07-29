import { describe, expect, it } from "vitest";
import { LabelSchemaV1Schema } from "@lana/contracts";
import {
  WAVE2_LABEL_SCHEMA,
  WAVE2_SCHEMA_VERSION,
} from "./wave2-schema.js";

describe("WAVE2_LABEL_SCHEMA", () => {
  it("matches the approved Wave 2 annotation taxonomy", () => {
    expect(LabelSchemaV1Schema.safeParse(WAVE2_LABEL_SCHEMA).success).toBe(true);
    expect(WAVE2_LABEL_SCHEMA.version).toBe(WAVE2_SCHEMA_VERSION);
    const codes = new Set(WAVE2_LABEL_SCHEMA.labels.map(({ code }) => code));
    for (const code of [
      "NEED_OCCASION",
      "BARRIER_PRICE",
      "CHOICE_OVERLOAD",
      "STRATEGY_SHOW_PROOF",
      "BARRIER_RESOLVED",
      "READY_TO_CLOSE",
      "NOT_ENOUGH_CONTEXT",
    ]) {
      expect(codes.has(code)).toBe(true);
    }
  });

  it("requires evidence before calling a barrier resolved", () => {
    const label = WAVE2_LABEL_SCHEMA.labels.find(
      ({ code }) => code === "BARRIER_RESOLVED",
    );
    expect(label?.evidenceRequired).toBe(true);
  });
});
