import { LocalEnvelopeCipher } from "@lana/database";
import { describe, expect, it, vi } from "vitest";
import { upsertEncryptedCustomerIdentity } from "./identity-projection.js";

describe("encrypted customer identity projection", () => {
  it("stores only ciphertext and binds the name to the conversation AAD", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const cipher = new LocalEnvelopeCipher("00".repeat(32), "test-key-v1");

    await expect(upsertEncryptedCustomerIdentity(
      { query },
      cipher,
      {
        pageId: "page-1",
        conversationId: "018f1b72-0000-7000-8000-000000000001",
        customerName: "  Nguyễn   Thị Lan ",
        observedAt: "2026-07-18T08:00:00.000Z",
      },
    )).resolves.toBe(true);

    const [, values] = query.mock.calls[0] as [string, unknown[]];
    expect(values).not.toContain("Nguyễn Thị Lan");
    expect(values[2]).toBeInstanceOf(Buffer);
    expect(cipher.decryptValue({
      ciphertext: values[2] as Buffer,
      nonce: values[3] as Buffer,
      authTag: values[4] as Buffer,
    }, "lana:admin-identity:v1:page-1:018f1b72-0000-7000-8000-000000000001:PANCAKE"))
      .toBe("Nguyễn Thị Lan");
  });

  it("does not persist an absent customer name", async () => {
    const query = vi.fn();
    const cipher = new LocalEnvelopeCipher("00".repeat(32), "test-key-v1");
    await expect(upsertEncryptedCustomerIdentity(
      { query },
      cipher,
      {
        pageId: "page-1",
        conversationId: "018f1b72-0000-7000-8000-000000000001",
        customerName: null,
        observedAt: "2026-07-18T08:00:00.000Z",
      },
    )).resolves.toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});
