import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";

describe("LocalEnvelopeCipher", () => {
  it("round-trips JSON with envelope encryption and authenticated context", () => {
    const cipher = new LocalEnvelopeCipher(
      randomBytes(32).toString("base64"),
      "local-kek-v1",
    );
    const bundle = cipher.encryptJson(
      { senderId: "customer-1", text: "hello" },
      "lana:realtime-inbox:v1:page-1:event-1",
      new Date("2026-08-01T00:00:00.000Z"),
    );
    expect(bundle.ciphertext.toString("utf8")).not.toContain("customer-1");
    expect(
      cipher.decryptJson(
        bundle,
        "lana:realtime-inbox:v1:page-1:event-1",
      ),
    ).toEqual({ senderId: "customer-1", text: "hello" });
    expect(() =>
      cipher.decryptJson(
        bundle,
        "lana:realtime-inbox:v1:page-1:wrong-event",
      ),
    ).toThrow();
  });
});
