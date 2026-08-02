import { describe, expect, it } from "vitest";
import {
  ASK_CONFIRMATION_CLARIFICATION,
  classifyConfirmationContract,
  confirmationClarificationAction,
} from "./confirmation-classifier.js";

describe("CF-02 confirmation classifier contract", () => {
  it.each([
    ["\u0110\u00fang, ch\u1ed1t \u0111\u01a1n gi\u00fap ch\u1ecb", "CONFIRM", "CONFIRMATION_DETERMINISTIC_MATCH"],
    ["\u0110\u1eebng ch\u1ed1t \u0111\u01a1n", "REJECT", "CONFIRMATION_EXPLICIT_REJECTION"],
    ["D\u1eebng ch\u1ed1t \u0111\u01a1n", "REJECT", "CONFIRMATION_EXPLICIT_REJECTION"],
  ] as const)("keeps accented terminal Vietnamese signals distinct: %s", (text, decision, reasonCode) => {
    expect(classifyConfirmationContract(text, null)).toMatchObject({
      decision,
      terminal: true,
      evidenceDetected: true,
      source: "DETERMINISTIC_CLASSIFIER",
      reasonCode,
    });
  });

  it.each([
    ["Ch\u1ed1t \u0111\u01a1n \u0111\u01b0\u1ee3c kh\u00f4ng?", "CONFIRMATION_QUESTION"],
    ["Ch\u1ed1t \u0111\u01a1n kh\u00f4ng", "CONFIRMATION_QUESTION"],
    ["ok \u0111\u1ec3 ch\u1ecb suy ngh\u0129", "CONFIRMATION_HESITANT"],
    ["Ch\u01b0a ch\u1ed1t \u0111\u01a1n", "CONFIRMATION_HESITANT"],
    ["Dung chot don", "CONFIRMATION_AMBIGUOUS_UNACCENTED"],
  ] as const)("keeps questions, hesitation, and unaccented ambiguity non-terminal: %s", (text, reasonCode) => {
    const result = classifyConfirmationContract(text, null);
    expect(result).toMatchObject({
      decision: "UNCLEAR",
      terminal: false,
      evidenceDetected: true,
      source: "DETERMINISTIC_CLASSIFIER",
      reasonCode,
    });
    expect(confirmationClarificationAction(result, "ORDER_PREVIEW")).toBe(ASK_CONFIRMATION_CLARIFICATION);
    expect(confirmationClarificationAction(result, "CHECKOUT_CAPTURE")).toBeNull();
  });

  it("treats an explicit negative phrase as terminal rejection", () => {
    expect(classifyConfirmationContract("Kh\u00f4ng mu\u1ed1n ch\u1ed1t \u0111\u01a1n", null)).toMatchObject({
      decision: "REJECT",
      terminal: true,
      evidenceDetected: true,
      reasonCode: "CONFIRMATION_EXPLICIT_REJECTION",
    });
  });

  it("does not turn a question into a rejection even with otherwise usable model evidence", () => {
    expect(classifyConfirmationContract("Ch\u1ed1t \u0111\u01a1n \u0111\u01b0\u1ee3c kh\u00f4ng?", {
      decision: "REJECT",
      confidence: 0.99,
      evidenceText: "Ch\u1ed1t \u0111\u01a1n \u0111\u01b0\u1ee3c kh\u00f4ng?",
    })).toMatchObject({
      decision: "UNCLEAR",
      terminal: false,
      reasonCode: "CONFIRMATION_QUESTION",
    });
  });

  it("considers model evidence only after exact-evidence and confidence safeguards", () => {
    const text = "tri\u1ec3n khai gi\u00fap ch\u1ecb";
    expect(classifyConfirmationContract(text, {
      decision: "CONFIRM",
      confidence: 0.99,
      evidenceText: text,
    })).toMatchObject({
      decision: "CONFIRM",
      terminal: true,
      evidenceDetected: true,
      source: "MODEL_STRUCTURED_OUTPUT",
      reasonCode: "CONFIRMATION_MODEL_MATCH",
    });
    expect(classifyConfirmationContract(text, {
      decision: "CONFIRM",
      confidence: 0.99,
      evidenceText: "kh\u00f4ng c\u00f3 trong tin nh\u1eafn",
    })).toMatchObject({
      decision: "UNCLEAR",
      terminal: false,
      evidenceDetected: false,
      source: null,
      reasonCode: null,
    });
    expect(classifyConfirmationContract(text, {
      decision: "CONFIRM",
      confidence: 0.84,
      evidenceText: text,
    })).toMatchObject({
      decision: "UNCLEAR",
      terminal: false,
      evidenceDetected: false,
      source: null,
      reasonCode: null,
    });
  });
});
