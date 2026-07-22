import { describe, expect, it } from "vitest";
import { PHASE1_SEND_ENABLED, assertPhase1EnvironmentSendDisabled } from "./index.js";

describe("Phase-1 worker safety", () => {
  it("is compiled send-disabled", () => {
    expect(PHASE1_SEND_ENABLED).toBe(false);
    expect(() => assertPhase1EnvironmentSendDisabled({ CHATBOT_SEND_ENABLED: "false" })).not.toThrow();
  });

  it("rejects attempts to enable live sending", () => {
    expect(() => assertPhase1EnvironmentSendDisabled({ CHATBOT_SEND_ENABLED: "true" })).toThrow(
      "PHASE1_LIVE_SEND_FORBIDDEN",
    );
  });
});
