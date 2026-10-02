import { describe, expect, it } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import { buildRealtimeC3Dialogue } from "./realtime-c3-dialogue.js";

const message = (text: string, i: number): ShadowContextMessage => ({
  direction: i % 2 === 0 ? "INBOUND" : "OUTBOUND", senderType: i % 2 === 0 ? "CUSTOMER" : "BOT",
  messageType: "TEXT", text, attachmentCount: 0, occurredAt: new Date(1_700_000_000_000 + i * 1000).toISOString(),
});

describe("bounded C3 continuity from the existing history", () => {
  it("keeps the unanswered question and clarification after crossing the 15-message window", () => {
    const history = [message("What material is that dress?", 0), message("Which product code?", 1),
      ...Array.from({ length: 18 }, (_, i) => message(`Other turn ${i}`, i + 2)), message("SD396", 20)];
    const dialogue = buildRealtimeC3Dialogue(history);
    expect(dialogue).toHaveLength(21);
    expect(dialogue.at(-1)?.text).toBe("SD396");
    expect(dialogue.map(({ text }) => text)).toEqual(history.map(({ text }) => text));
  });

  it("keeps short history unchanged and uses current session values, not older amounts", () => {
    const history = [message("budget 900k", 0), message("actually 650k", 2)];
    expect(buildRealtimeC3Dialogue(history)).toEqual(history);
    const dialogue = buildRealtimeC3Dialogue(history, { budgetVnd: 650_000, occasion: "WORK", rejectedProductIds: ["SD10"] });
    expect(JSON.parse(dialogue[0]!.text)).toMatchObject({ budgetCustomerReported: "650k", occasion: "WORK" });
    expect(dialogue.slice(1)).toEqual(history);
  });

  it("keeps the context event valid JSON even for maximum-size stored preferences", () => {
    const rejectedProductIds = Array.from({ length: 8 }, (_, i) => `SD${i}1`);
    const values = Array.from({ length: 5 }, () => '"'.repeat(48));
    const [entry] = buildRealtimeC3Dialogue([message("continue", 0)], {
      budgetVnd: 650_000, occasion: "WORK", rejectedProductIds,
    }, { measurements: { HEIGHT_CM: 165, WEIGHT_KG: 55 },
      preferences: { colors: values, styles: values, materials: values },
      selection: { productId: "SD10", size: "M", color: '"'.repeat(80) } });
    expect(entry!.text.length).toBeLessThanOrEqual(2_000);
    expect(JSON.parse(entry!.text)).toMatchObject({ rejectedProductIds,
      knownCustomerInputs: { measurements: { HEIGHT_CM: 165, WEIGHT_KG: 55 },
        selection: { productId: "SD10", size: "M", color: '"'.repeat(80) } } });
  });

  it("redacts customer URLs inside structured context without damaging JSON", () => {
    const [entry] = buildRealtimeC3Dialogue([message("continue", 0)], undefined, {
      selection: { productId: "SD10", size: "M", color: "https://example.test/private?token=hidden" },
      preferences: { colors: [], styles: [], materials: ["demo@example.test"] },
    });
    expect(() => JSON.parse(entry!.text)).not.toThrow();
    expect(entry!.text).not.toContain("example.test");
    expect(entry!.text).not.toContain("hidden");
  });

  it("redacts older contact details and bounds the existing source without inventing a summary", () => {
    const history = Array.from({ length: 40 }, (_, i) => message(i === 10
      ? "email demo@example.com phone 0900000000" : `turn ${i} ` + "x".repeat(2000), i));
    const dialogue = buildRealtimeC3Dialogue(history);
    expect(dialogue).toHaveLength(31);
    expect(dialogue.every(({ text }) => text.length <= 2_000)).toBe(true);
    expect(JSON.stringify(dialogue)).not.toContain("demo@example.com");
    expect(JSON.stringify(dialogue)).not.toContain("0900000000");
    expect(dialogue[0]!.text).toContain("turn 9");
  });
});
