import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { KeyProvider, KeyWrapContext, WrappedKey } from "./types.js";

interface KeyEntry {
  key: Buffer;
  revoked: boolean;
}

/** Test/local provider only. Production must use KMS, Vault or an HSM-backed implementation. */
export class MemoryKeyProvider implements KeyProvider {
  public readonly name = "memory-test-only";
  private readonly keys = new Map<string, KeyEntry>();
  private activeVersion: string | null = null;

  public addKey(version: string, key: Uint8Array = randomBytes(32)): void {
    if (!version.trim()) throw new Error("KEK version is required");
    if (key.byteLength !== 32) throw new Error("KEK must be 32 bytes");
    if (this.keys.has(version)) throw new Error("KEK version already exists");
    this.keys.set(version, { key: Buffer.from(key), revoked: false });
    this.activeVersion ??= version;
  }

  public activate(version: string): void {
    this.requireUsable(version);
    this.activeVersion = version;
  }

  public revoke(version: string): void {
    const entry = this.keys.get(version);
    if (!entry) throw new Error("Unknown KEK version");
    entry.revoked = true;
    if (this.activeVersion === version) this.activeVersion = null;
  }

  public async wrapKey(plaintextDek: Uint8Array, context: KeyWrapContext): Promise<WrappedKey> {
    const version = context.kekVersion ?? this.activeVersion;
    if (!version) throw new Error("No active KEK version");
    const key = this.requireUsable(version);
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(context.aad);
    const ciphertext = Buffer.concat([cipher.update(plaintextDek), cipher.final()]);
    return {
      algorithm: "AES-256-GCM",
      kekVersion: version,
      ciphertext: ciphertext.toString("base64"),
      nonce: nonce.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
    };
  }

  public async unwrapKey(wrappedKey: WrappedKey, context: KeyWrapContext): Promise<Buffer> {
    if (wrappedKey.algorithm !== "AES-256-GCM") throw new Error("Unsupported key wrap algorithm");
    if (context.kekVersion && context.kekVersion !== wrappedKey.kekVersion) {
      throw new Error("KEK version mismatch");
    }
    const key = this.requireUsable(wrappedKey.kekVersion);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(wrappedKey.nonce, "base64"));
    decipher.setAAD(context.aad);
    decipher.setAuthTag(Buffer.from(wrappedKey.authTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(wrappedKey.ciphertext, "base64")),
      decipher.final(),
    ]);
  }

  private requireUsable(version: string): Buffer {
    const entry = this.keys.get(version);
    if (!entry || entry.revoked) throw new Error("KEK version is unavailable");
    return entry.key;
  }
}

