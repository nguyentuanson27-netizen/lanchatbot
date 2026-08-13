import { describe, expect, it } from "vitest";
import {
  buildCanonicalDecisionEvidenceV1,
  hasGuardedModelBuyingCommitmentEvidence,
  hashCanonicalBuyingIntentV1,
} from "./canonical-evidence.js";

describe("DF05 canonical decision evidence", () => {
  it("resolves deterministic buying intent once into the canonical authority", () => {
    const result = buildCanonicalDecisionEvidenceV1({
      text: "Chốt 2 set mẫu này",
      sourceMessageId: "mid.123",
      productId: "SP-001",
      modelBuyingIntent: null,
      evaluatedAt: new Date("2026-08-13T05:00:00.000Z"),
    });

    expect(result.buyingIntent).toMatchObject({
      authorityVersion: "CANONICAL_BUYING_INTENT_V1",
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: 2,
      productId: "SP-001",
      contributors: ["DETERMINISTIC_RUNTIME"],
      authorization: "NONE",
    });
    expect(result.dialogueEvidence.authorization).toBe("NONE");
    expect(result.dialogueEvidence).not.toHaveProperty("requestedAction");
  });

  it("detects a guarded model commitment attempt without treating it as authority", () => {
    const text = "làm đơn mẫu này cho mình";
    expect(hasGuardedModelBuyingCommitmentEvidence(text, {
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: null,
      evidenceText: text,
      confidence: 0.97,
    })).toBe(true);
    expect(hasGuardedModelBuyingCommitmentEvidence("mẫu này được không?", {
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: null,
      evidenceText: "mẫu này được không?",
      confidence: 0.99,
    })).toBe(false);
  });

  it("records accepted model evidence without granting effect authority", () => {
    const text = "làm đơn mẫu này cho mình";
    const result = buildCanonicalDecisionEvidenceV1({
      text,
      sourceMessageId: "mid.124",
      productId: "SP-001",
      modelBuyingIntent: {
        decision: "COMMITTED",
        requestedAction: "OPEN_CART",
        quantity: null,
        evidenceText: text,
        confidence: 0.97,
      },
      evaluatedAt: new Date("2026-08-13T05:00:00.000Z"),
    });

    expect(result.buyingIntent).toMatchObject({
      decision: "COMMITTED",
      contributors: ["DETERMINISTIC_RUNTIME", "MODEL_STRUCTURED_OUTPUT"],
      authorization: "NONE",
    });
    expect(result.dialogueEvidence.contributors).toContain(
      "MODEL_STRUCTURED_OUTPUT",
    );
  });

  it("keeps an unresolved committed request observable but unscoped", () => {
    const result = buildCanonicalDecisionEvidenceV1({
      text: "chốt mẫu này",
      sourceMessageId: "mid.125",
      productId: null,
      modelBuyingIntent: null,
      evaluatedAt: new Date("2026-08-13T05:00:00.000Z"),
    });

    expect(result.buyingIntent).toMatchObject({
      decision: "COMMITTED",
      productId: null,
      authorization: "NONE",
    });
  });

  it("does not let a question become committed buying intent", () => {
    const text = "mẫu này chốt được không?";
    const result = buildCanonicalDecisionEvidenceV1({
      text,
      sourceMessageId: "mid.126",
      productId: "SP-001",
      modelBuyingIntent: {
        decision: "COMMITTED",
        requestedAction: "OPEN_CART",
        quantity: null,
        evidenceText: text,
        confidence: 0.99,
      },
      evaluatedAt: new Date("2026-08-13T05:00:00.000Z"),
    });

    expect(result.buyingIntent.decision).toBe("NONE");
    expect(result.dialogueEvidence.act).toBe("QUESTION");
  });

  it("produces stable PII-safe hashes without retaining raw message identifiers", () => {
    const result = buildCanonicalDecisionEvidenceV1({
      text: "chốt mẫu này",
      sourceMessageId: "mid.customer-specific",
      productId: "SP-001",
      modelBuyingIntent: null,
      evaluatedAt: new Date("2026-08-13T05:00:00.000Z"),
    });

    expect(result.buyingIntent.sourceMessageIdHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(result)).not.toContain("mid.customer-specific");
    expect(hashCanonicalBuyingIntentV1(result.buyingIntent)).toMatch(
      /^[a-f0-9]{64}$/u,
    );
  });
});
