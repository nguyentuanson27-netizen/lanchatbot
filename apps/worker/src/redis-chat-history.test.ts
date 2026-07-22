import { describe, expect, it } from "vitest";
import { chatHistoryKey, RedisChatHistoryStore } from "./redis-chat-history.js";

describe("RedisChatHistoryStore", () => {
  it("uses a non-PII versioned key", () => {
    expect(chatHistoryKey("df37e57f-c6e1-4edb-b2e4-89c08ca3c3d9"))
      .toBe("history:v1:df37e57f-c6e1-4edb-b2e4-89c08ca3c3d9");
  });

  it("rejects unsafe conversation keys and invalid retention", () => {
    expect(() => chatHistoryKey("sender-raw-id")).toThrow("CHAT_HISTORY_CONVERSATION_ID_INVALID");
    expect(() => new RedisChatHistoryStore("redis://localhost", 10, 150))
      .toThrow("CHAT_HISTORY_CONFIG_INVALID");
  });
});
