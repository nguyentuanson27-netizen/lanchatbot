import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EnvelopeEncryption } from "./envelope.js";
import { MemoryKeyProvider } from "./memory-key-provider.js";
import type { EncryptedSecretEnvelopeV1, SecretAad } from "./types.js";

const aad: SecretAad = {
  environment: "test",
  provider: "META",
  pageId: "page-123",
  secretType: "META_PAGE_ACCESS_TOKEN",
  secretVersion: 1,
  rowId: "018f-test-row",
};

function copy(envelope: EncryptedSecretEnvelopeV1): EncryptedSecretEnvelopeV1 {
  return { ...envelope };
}

describe("EnvelopeEncryption", () => {
  it("round-trips using AES-256-GCM without exposing plaintext in the envelope", async () => {
    const provider = new MemoryKeyProvider();
    provider.addKey("kek-v1", randomBytes(32));
    const service = new EnvelopeEncryption(provider);
    const plaintext = Buffer.from("test-token-never-log", "utf8");
    const envelope = await service.encrypt(plaintext, aad);

    expect(JSON.stringify(envelope)).not.toContain(plaintext.toString("utf8"));
    await expect(service.decrypt(envelope, aad)).resolves.toEqual(plaintext);
  });

  it("rejects tampered ciphertext and authentication tags", async () => {
    const provider = new MemoryKeyProvider();
    provider.addKey("kek-v1");
    const service = new EnvelopeEncryption(provider);
    const envelope = await service.encrypt(Buffer.from("secret"), aad);

    const tamperedCiphertext = copy(envelope);
    const bytes = Buffer.from(tamperedCiphertext.ciphertext, "base64");
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    tamperedCiphertext.ciphertext = bytes.toString("base64");
    await expect(service.decrypt(tamperedCiphertext, aad)).rejects.toThrow("Secret decryption failed");

    const tamperedTag = copy(envelope);
    const tag = Buffer.from(tamperedTag.authTag, "base64");
    tag[0] = (tag[0] ?? 0) ^ 1;
    tamperedTag.authTag = tag.toString("base64");
    await expect(service.decrypt(tamperedTag, aad)).rejects.toThrow("Secret decryption failed");

    const tamperedWrappedKey = copy(envelope);
    const wrapped = Buffer.from(tamperedWrappedKey.encryptedDek, "base64");
    wrapped[0] = (wrapped[0] ?? 0) ^ 1;
    tamperedWrappedKey.encryptedDek = wrapped.toString("base64");
    await expect(service.decrypt(tamperedWrappedKey, aad)).rejects.toThrow("Secret decryption failed");
  });

  it("rejects a different page/environment/version through AAD", async () => {
    const provider = new MemoryKeyProvider();
    provider.addKey("kek-v1");
    const service = new EnvelopeEncryption(provider);
    const envelope = await service.encrypt(Buffer.from("secret"), aad);

    await expect(service.decrypt(envelope, { ...aad, pageId: "other-page" })).rejects.toThrow(
      "Encrypted secret AAD mismatch",
    );
    await expect(service.decrypt(envelope, { ...aad, environment: "production" })).rejects.toThrow(
      "Encrypted secret AAD mismatch",
    );
    await expect(service.decrypt(envelope, { ...aad, secretVersion: 2 })).rejects.toThrow(
      "Encrypted secret AAD mismatch",
    );
  });

  it("supports KEK rotation and fails closed after old-key revocation", async () => {
    const provider = new MemoryKeyProvider();
    provider.addKey("kek-v1");
    const service = new EnvelopeEncryption(provider);
    const oldEnvelope = await service.encrypt(Buffer.from("old-secret"), aad);

    provider.addKey("kek-v2");
    provider.activate("kek-v2");
    const newEnvelope = await service.encrypt(Buffer.from("new-secret"), { ...aad, secretVersion: 2 });
    expect(oldEnvelope.kekVersion).toBe("kek-v1");
    expect(newEnvelope.kekVersion).toBe("kek-v2");
    await expect(service.decrypt(oldEnvelope, aad)).resolves.toEqual(Buffer.from("old-secret"));

    provider.revoke("kek-v1");
    await expect(service.decrypt(oldEnvelope, aad)).rejects.toThrow("Secret decryption failed");
    await expect(service.decrypt(newEnvelope, { ...aad, secretVersion: 2 })).resolves.toEqual(
      Buffer.from("new-secret"),
    );
  });
});
