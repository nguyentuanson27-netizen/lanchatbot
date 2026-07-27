import { describe, expect, it } from "vitest";
import { buildReplacementPlan, parseGoldV2 } from "./dataset-gold-v2-replace.js";

const gold = {
  schemaVersion: "gold-v2",
  unit: "MESSAGE",
  range: { from: 1, to: 1 },
  conversations: [{
    n: 1,
    key: "transcript:1",
    startTruncated: false,
    ann: [{ t: 0, l: "PRICE_QUESTION", ev: "giá bao nhiêu" }],
    conv: [{ l: "NO_EXPLICIT_CHECKOUT_OBSERVED", derived: true }],
  }],
};

describe("gold-v2 replacement", () => {
  it("validates and plans audited message and conversation labels", () => {
    const parsed = parseGoldV2(gold);
    const keyHash = "8f56dcbf069ad40b5dab7941748734f23301712ecf867acf34736d1eb5d36311";
    const plan = buildReplacementPlan(parsed, [{
      conversation_id: "conversation-1",
      source_key_hash: keyHash,
      messages: new Map([[0, { role: "CUSTOMER", text: "shop ơi giá bao nhiêu ạ" }]]),
    }]);
    expect(plan).toMatchObject({
      goldConversations: 1,
      importedConversations: 1,
      failedConversations: 0,
      annotations: 2,
    });
    expect(plan.conversations[0]?.annotations).toEqual([
      expect.objectContaining({ labelCode: "PRICE_QUESTION", evidenceStart: 8, evidenceEnd: 21 }),
      expect.objectContaining({ labelCode: "NO_EXPLICIT_CHECKOUT_OBSERVED", turnIndex: null }),
    ]);
  });

  it("uses only the redacted turn when raw evidence was replaced by a placeholder", () => {
    const parsed = parseGoldV2(gold);
    const keyHash = "8f56dcbf069ad40b5dab7941748734f23301712ecf867acf34736d1eb5d36311";
    const plan = buildReplacementPlan(parsed, [{
      conversation_id: "conversation-1",
      source_key_hash: keyHash,
      messages: new Map([[0, { role: "CUSTOMER", text: "[ADDRESS_1]" }]]),
    }]);
    expect(plan.conversations[0]?.annotations[0]).toMatchObject({
      evidenceText: "[ADDRESS_1]",
      evidenceStart: 0,
      evidenceEnd: 11,
    });
  });
  it("shifts audited turn indexes after a start-truncated unknown turn", () => {
    const parsed = parseGoldV2({
      ...gold,
      conversations: [{ ...gold.conversations[0], startTruncated: true }],
    });
    const keyHash = "8f56dcbf069ad40b5dab7941748734f23301712ecf867acf34736d1eb5d36311";
    const plan = buildReplacementPlan(parsed, [{
      conversation_id: "conversation-1",
      source_key_hash: keyHash,
      messages: new Map([
        [0, { role: "UNKNOWN", text: "truncated" }],
        [1, { role: "CUSTOMER", text: "shop ơi giá bao nhiêu ạ" }],
      ]),
    }]);
    expect(plan.conversations[0]?.annotations[0]).toMatchObject({ turnIndex: 1 });
  });
  it("rejects duplicate source keys", () => {
    expect(() => parseGoldV2({
      ...gold,
      range: { from: 1, to: 2 },
      conversations: [gold.conversations[0], { ...gold.conversations[0], n: 2 }],
    })).toThrow("GOLD_V2_DUPLICATE");
  });
});
