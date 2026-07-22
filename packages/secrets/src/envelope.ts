import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { encodeSecretAad, hashAad } from "./aad.js";
import type {
  EncryptedSecretEnvelopeV1,
  KeyProvider,
  SecretAad,
  WrappedKey,
} from "./types.js";

const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

function decodeBase64(value: string, expectedBytes: number | null, field: string): Buffer {
  const decoded = Buffer.from(value, "base64");
  if (expectedBytes !== null && decoded.length !== expectedBytes) {
    throw new Error(`Invalid encrypted envelope field: ${field}`);
  }
  return decoded;
}

function wrappedKeyFromEnvelope(envelope: EncryptedSecretEnvelopeV1): WrappedKey {
  return {
    algorithm: "AES-256-GCM",
    kekVersion: envelope.kekVersion,
    ciphertext: envelope.encryptedDek,
    nonce: envelope.encryptedDekNonce,
    authTag: envelope.encryptedDekAuthTag,
  };
}

export class EnvelopeEncryption {
  public constructor(private readonly keyProvider: KeyProvider) {}

  public async encrypt(
    plaintext: Uint8Array,
    aadInput: SecretAad,
    kekVersion?: string,
  ): Promise<EncryptedSecretEnvelopeV1> {
    if (plaintext.byteLength === 0) throw new Error("Secret plaintext cannot be empty");
    const aad = encodeSecretAad(aadInput);
    const dek = randomBytes(KEY_BYTES);
    const nonce = randomBytes(NONCE_BYTES);
    try {
      const cipher = createCipheriv("aes-256-gcm", dek, nonce, { authTagLength: TAG_BYTES });
      cipher.setAAD(aad);
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const wrapped = await this.keyProvider.wrapKey(dek, { aad, ...(kekVersion ? { kekVersion } : {}) });
      return {
        envelopeVersion: 1,
        algorithm: "AES-256-GCM",
        keyProvider: this.keyProvider.name,
        kekVersion: wrapped.kekVersion,
        ciphertext: ciphertext.toString("base64"),
        nonce: nonce.toString("base64"),
        authTag: authTag.toString("base64"),
        encryptedDek: wrapped.ciphertext,
        encryptedDekNonce: wrapped.nonce,
        encryptedDekAuthTag: wrapped.authTag,
        aadSha256: hashAad(aad).toString("base64"),
      };
    } finally {
      dek.fill(0);
      aad.fill(0);
    }
  }

  public async decrypt(envelope: EncryptedSecretEnvelopeV1, aadInput: SecretAad): Promise<Buffer> {
    if (envelope.envelopeVersion !== 1 || envelope.algorithm !== "AES-256-GCM") {
      throw new Error("Unsupported encrypted secret envelope");
    }
    if (envelope.keyProvider !== this.keyProvider.name) {
      throw new Error("Encrypted secret belongs to a different key provider");
    }
    const aad = encodeSecretAad(aadInput);
    const expectedAadHash = hashAad(aad);
    const storedAadHash = decodeBase64(envelope.aadSha256, 32, "aadSha256");
    if (!timingSafeEqual(expectedAadHash, storedAadHash)) {
      aad.fill(0);
      expectedAadHash.fill(0);
      storedAadHash.fill(0);
      throw new Error("Encrypted secret AAD mismatch");
    }

    let dek: Buffer | undefined;
    try {
      dek = await this.keyProvider.unwrapKey(wrappedKeyFromEnvelope(envelope), {
        aad,
        kekVersion: envelope.kekVersion,
      });
      if (dek.length !== KEY_BYTES) throw new Error("Key provider returned an invalid DEK");
      const nonce = decodeBase64(envelope.nonce, NONCE_BYTES, "nonce");
      const authTag = decodeBase64(envelope.authTag, TAG_BYTES, "authTag");
      const ciphertext = decodeBase64(envelope.ciphertext, null, "ciphertext");
      const decipher = createDecipheriv("aes-256-gcm", dek, nonce, { authTagLength: TAG_BYTES });
      decipher.setAAD(aad);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      // Do not expose provider/decryption detail that could become an oracle or leak metadata.
      throw new Error("Secret decryption failed");
    } finally {
      dek?.fill(0);
      aad.fill(0);
      expectedAadHash.fill(0);
      storedAadHash.fill(0);
    }
  }
}

