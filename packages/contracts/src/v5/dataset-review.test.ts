import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLE_TO_DATASET_ROLE,
  LabelSchemaV1Schema,
  PrelabelResponseV1Schema,
} from "./dataset-review.js";

const baseLabel = {
  code: "BUYING_COMMITTED",
  name: "Buying committed",
  description: "",
  scope: "CUSTOMER_MESSAGE",
  evidenceRequired: true,
  confidenceRequired: true,
  mutuallyExclusiveGroup: "BUYING",
  parentCode: null,
  isSafetyCritical: false,
  isActive: true,
  displayOrder: 0,
} as const;

describe("LabelSchemaV1", () => {
  it("accepts a minimal valid schema", () => {
    const parsed = LabelSchemaV1Schema.safeParse({
      schemaVersion: 1,
      name: "Wave 1",
      version: "wave1-v1",
      guidelineVersion: "g-v1",
      labels: [baseLabel],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate label codes", () => {
    const parsed = LabelSchemaV1Schema.safeParse({
      schemaVersion: 1,
      name: "Wave 1",
      version: "wave1-v1",
      guidelineVersion: "g-v1",
      labels: [baseLabel, baseLabel],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a parentCode that is not defined", () => {
    const parsed = LabelSchemaV1Schema.safeParse({
      schemaVersion: 1,
      name: "Wave 1",
      version: "wave1-v1",
      guidelineVersion: "g-v1",
      labels: [{ ...baseLabel, parentCode: "MISSING_PARENT" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a lowercase label code", () => {
    const parsed = LabelSchemaV1Schema.safeParse({
      schemaVersion: 1,
      name: "Wave 1",
      version: "wave1-v1",
      guidelineVersion: "g-v1",
      labels: [{ ...baseLabel, code: "buying_committed" }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("PrelabelResponseV1", () => {
  it("accepts a strict annotation with turnIndex + evidence", () => {
    const parsed = PrelabelResponseV1Schema.safeParse({
      annotations: [
        {
          labelCode: "BUYING_COMMITTED",
          scope: "CUSTOMER_MESSAGE",
          turnIndex: 7,
          secondTurnIndex: null,
          evidenceText: "chị lấy mẫu này size M",
          confidence: "HIGH",
          reason: "explicit selection",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown top-level keys (no markdown/prose leakage)", () => {
    const parsed = PrelabelResponseV1Schema.safeParse({
      annotations: [],
      explanation: "here is why",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects secondTurnIndex before turnIndex", () => {
    const parsed = PrelabelResponseV1Schema.safeParse({
      annotations: [
        {
          labelCode: "CONTINUATION",
          scope: "SEQUENCE",
          turnIndex: 5,
          secondTurnIndex: 2,
          evidenceText: "abc",
          confidence: "LOW",
          reason: "",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("ADMIN_ROLE_TO_DATASET_ROLE", () => {
  it("maps existing admin roles onto dataset capability roles", () => {
    expect(ADMIN_ROLE_TO_DATASET_ROLE.OWNER).toBe("DATASET_ADMIN");
    expect(ADMIN_ROLE_TO_DATASET_ROLE.APPROVER).toBe("ADJUDICATOR");
    expect(ADMIN_ROLE_TO_DATASET_ROLE.EDITOR).toBe("ANNOTATOR");
    expect(ADMIN_ROLE_TO_DATASET_ROLE.VIEWER).toBe("BENCHMARK_VIEWER");
  });
});
