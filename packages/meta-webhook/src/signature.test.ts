import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature } from "./signature.js";

describe("verifyMetaSignature", () => {
  it("accepts a signature over exact raw bytes", () => {
    const body = Buffer.from('{"entry":[]}');
    const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, signature, "secret")).toBe(true);
  });

  it("rejects missing, malformed, and byte-mismatched signatures", () => {
    const body = Buffer.from('{"entry":[]}');
    const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, undefined, "secret")).toBe(false);
    expect(verifyMetaSignature(body, "sha256=bad", "secret")).toBe(false);
    expect(verifyMetaSignature(Buffer.from('{"entry":[] }'), signature, "secret")).toBe(false);
  });
});
