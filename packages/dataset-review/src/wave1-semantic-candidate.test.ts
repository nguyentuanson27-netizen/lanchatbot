import { describe, expect, it } from "vitest";
import type { Wave1BenchmarkConversation } from "./benchmark-bundle.js";
import { predictWave1SemanticCandidate } from "./wave1-semantic-candidate.js";

function conversation(
  messages: Wave1BenchmarkConversation["messages"],
): Wave1BenchmarkConversation {
  return {
    conversationId: "c".repeat(64),
    sourceOrdinal: 1,
    duplicateGroupId: "d".repeat(64),
    qualityFlags: [],
    startTruncated: false,
    messages,
    annotations: [],
    labelCodes: new Set(),
  };
}

function labels(fixture: Wave1BenchmarkConversation): readonly string[] {
  return predictWave1SemanticCandidate([fixture]).map(({ labelCode }) => labelCode);
}

describe("Wave 1 semantic candidate", () => {
  it("separates committed, negated, and retracted in chronology", () => {
    const fixture = conversation([
      { turnIndex: 0, role: "CUSTOMER", redactedText: "Chốt mẫu này size M" },
      { turnIndex: 1, role: "SHOP", redactedText: "Dạ em ghi nhận" },
      { turnIndex: 2, role: "CUSTOMER", redactedText: "Thôi không lấy nữa" },
    ]);
    const predictions = predictWave1SemanticCandidate([fixture]);
    expect(
      predictions.find(({ turnIndex }) => turnIndex === 0)?.labelCode,
    ).toBe("BUYING_COMMITTED");
    expect(
      predictions
        .filter(({ turnIndex }) => turnIndex === 2)
        .map(({ labelCode }) => labelCode),
    ).toEqual(expect.arrayContaining(["BUYING_RETRACTED", "ORDER_CANCELLATION"]));
  });

  it("recognizes continuation, measurement, size, and variant selection", () => {
    const fixture = conversation([
      { turnIndex: 0, role: "SHOP", redactedText: "Chị cao và nặng bao nhiêu ạ?" },
      { turnIndex: 1, role: "CUSTOMER", redactedText: "1m60 52kg size M" },
    ]);
    expect(labels(fixture)).toEqual(
      expect.arrayContaining([
        "MEASUREMENTS_PROVIDED",
        "SIZE_QUESTION",
        "VARIANT_SELECTION",
        "CONTINUATION",
      ]),
    );
  });

  it("separates pre-sale policy from post-sale requests", () => {
    const preSale = conversation([
      {
        turnIndex: 0,
        role: "CUSTOMER",
        redactedText: "Nếu không vừa có được đổi trả không?",
      },
    ]);
    expect(labels(preSale)).toContain("PRE_SALE_RETURN_POLICY_QUESTION");
    expect(labels(preSale)).not.toContain("RETURN_REQUEST");

    const postSale = conversation([
      { turnIndex: 0, role: "SHOP", redactedText: "Đơn đã giao thành công" },
      {
        turnIndex: 1,
        role: "CUSTOMER",
        redactedText: "Hàng bị rách, mình muốn trả hàng hoàn tiền",
      },
    ]);
    expect(labels(postSale)).toEqual(
      expect.arrayContaining(["RETURN_REQUEST", "PRODUCT_COMPLAINT"]),
    );
  });

  it("does not infer customer buying intent from shop text", () => {
    const fixture = conversation([
      {
        turnIndex: 0,
        role: "SHOP",
        redactedText: "Chị chốt mẫu này shop lên đơn nhé?",
      },
    ]);
    expect(labels(fixture)).not.toContain("BUYING_COMMITTED");
  });
});
