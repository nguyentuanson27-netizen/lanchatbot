import { describe, expect, it } from "vitest";
import { LabelSchemaV1Schema } from "@lana/contracts";
import {
  WAVE1_LABEL_SCHEMA,
  WAVE1_SCHEMA_VERSION,
} from "./wave1-schema.js";

describe("WAVE1_LABEL_SCHEMA", () => {
  it("is a valid label schema", () => {
    expect(LabelSchemaV1Schema.safeParse(WAVE1_LABEL_SCHEMA).success).toBe(true);
    expect(WAVE1_LABEL_SCHEMA.version).toBe(WAVE1_SCHEMA_VERSION);
  });

  it("only scopes customer intents to CUSTOMER messages", () => {
    const customerIntents = ["PRICE_QUESTION", "SIZE_QUESTION", "MEASUREMENTS_PROVIDED", "BUYING_COMMITTED"];
    for (const code of customerIntents) {
      const label = WAVE1_LABEL_SCHEMA.labels.find((entry) => entry.code === code);
      expect(label?.scope).toBe("CUSTOMER_MESSAGE");
    }
  });

  it("does not contain forbidden inferred-outcome labels", () => {
    const codes = new Set(WAVE1_LABEL_SCHEMA.labels.map((label) => label.code));
    expect(codes.has("HANDOFF_OCCURRED")).toBe(false);
    expect(codes.has("ABANDONED")).toBe(false);
    // The observational counterparts must exist instead.
    expect(codes.has("NO_EXPLICIT_CHECKOUT_OBSERVED")).toBe(true);
    expect(codes.has("POSSIBLE_HANDOFF_LANGUAGE")).toBe(true);
  });

  it("marks safety-critical labels", () => {
    const premature = WAVE1_LABEL_SCHEMA.labels.find((label) => label.code === "PREMATURE_PII_REQUEST");
    expect(premature?.isSafetyCritical).toBe(true);
  });

  it("groups buying-state labels as mutually exclusive", () => {
    const committed = WAVE1_LABEL_SCHEMA.labels.find((label) => label.code === "BUYING_COMMITTED");
    expect(committed?.mutuallyExclusiveGroup).toBe("BUYING_STATE");
  });
});
