import { describe, expect, it } from "vitest";
import { WAVE1_LABEL_SCHEMA, type ValidationMessage } from "@lana/dataset-review";
import {
  buildPrelabelSystemInstruction,
  buildPrelabelUserPrompt,
  computePrelabelInputChecksum,
  type PrelabelInputContext,
} from "./dataset-prelabel-prompt.js";

const context: PrelabelInputContext = {
  promptVersion: "prelabel-v1",
  schemaVersion: WAVE1_LABEL_SCHEMA.version,
  model: "gemini-test",
  modelVersion: "gemini-test-001",
  guidelineVersion: WAVE1_LABEL_SCHEMA.guidelineVersion,
};

const messages: readonly ValidationMessage[] = [
  { turnIndex: 0, role: "CUSTOMER", messageId: "m0", redactedText: "sđt [PHONE_1] lấy mẫu này" },
  { turnIndex: 1, role: "SHOP", messageId: "m1", redactedText: "dạ 629k ạ" },
];

describe("buildPrelabelSystemInstruction", () => {
  it("lists schema labels with scope and demands strict JSON", () => {
    const text = buildPrelabelSystemInstruction(WAVE1_LABEL_SCHEMA);
    expect(text).toContain("BUYING_COMMITTED [CUSTOMER_MESSAGE]");
    expect(text).toContain("PrelabelResponseV1");
    expect(text).toContain("KHONG TIN CAY");
  });
});

describe("buildPrelabelUserPrompt", () => {
  it("wraps redacted transcript as untrusted and never contains raw PII", () => {
    const prompt = buildPrelabelUserPrompt(messages, context);
    expect(prompt).toContain("<UNTRUSTED_TRANSCRIPT_JSON>");
    expect(prompt).toContain("[PHONE_1]");
    expect(prompt).not.toMatch(/\d{9,}/u);
  });
});

describe("computePrelabelInputChecksum", () => {
  it("is stable for identical input and changes when the redacted text changes", () => {
    const a = computePrelabelInputChecksum(WAVE1_LABEL_SCHEMA, messages, context);
    const b = computePrelabelInputChecksum(WAVE1_LABEL_SCHEMA, messages, context);
    expect(a).toBe(b);
    const changed = computePrelabelInputChecksum(
      WAVE1_LABEL_SCHEMA,
      [{ ...messages[0]!, redactedText: "khác" }, messages[1]!],
      context,
    );
    expect(changed).not.toBe(a);
  });

  it("changes when the model version changes", () => {
    const a = computePrelabelInputChecksum(WAVE1_LABEL_SCHEMA, messages, context);
    const b = computePrelabelInputChecksum(WAVE1_LABEL_SCHEMA, messages, {
      ...context,
      modelVersion: "gemini-test-002",
    });
    expect(a).not.toBe(b);
  });
});
