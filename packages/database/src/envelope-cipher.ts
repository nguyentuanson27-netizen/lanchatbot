import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { CipherBundle } from "./repositories.js";

const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const WRAPPED_DEK_BYTES = NONCE_BYTES + TAG_BYTES + KEY_BYTES;

export interface EncryptedValue {
  readonly ciphertext: Buffer;
  readonly nonce: Buffer;
  readonly authTag: Buffer;
}

function encryptWithKey(
  plaintext: Buffer,
  key: Buffer,
  aad: Buffer,
): EncryptedValue {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, nonce, authTag: cipher.getAuthTag() };
}

function decryptWithKey(
  value: EncryptedValue,
  key: Buffer,
  aad: Buffer,
): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, value.nonce);
  decipher.setAAD(aad);
  decipher.setAuthTag(value.authTag);
  return Buffer.concat([decipher.update(value.ciphertext), decipher.final()]);
}

function decodeKey(value: string): Buffer {
  const trimmed = value.trim();
  const key = /^[a-f0-9]{64}$/iu.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  if (key.length !== KEY_BYTES) throw new Error("REALTIME_DATA_KEY_INVALID");
  return key;
}

/**
 * Local envelope encryption for the first realtime release. The KEK must be
 * mounted as a read-only Docker secret and rotated by changing keyRef.
 */
export class LocalEnvelopeCipher {
  private readonly kek: Buffer;

  constructor(
    encodedKek: string,
    readonly keyRef: string,
  ) {
    this.kek = decodeKey(encodedKek);
    if (!/^[A-Za-z0-9._:-]{3,128}$/u.test(keyRef)) {
      throw new Error("REALTIME_DATA_KEY_REF_INVALID");
    }
  }

  encryptJson(
    value: unknown,
    aadText: string,
    expiresAt: Date,
  ): CipherBundle {
    const aad = Buffer.from(aadText, "utf8");
    const dek = randomBytes(KEY_BYTES);
    const payload = encryptWithKey(
      Buffer.from(JSON.stringify(value), "utf8"),
      dek,
      aad,
    );
    const wrapped = encryptWithKey(dek, this.kek, aad);
    return {
      ...payload,
      encryptedDek: Buffer.concat([
        wrapped.nonce,
        wrapped.authTag,
        wrapped.ciphertext,
      ]),
      keyRef: this.keyRef,
      expiresAt,
    };
  }

  decryptJson<T>(bundle: CipherBundle, aadText: string): T {
    if (bundle.keyRef !== this.keyRef) {
      throw new Error("REALTIME_DATA_KEY_VERSION_UNAVAILABLE");
    }
    if (bundle.encryptedDek.length !== WRAPPED_DEK_BYTES) {
      throw new Error("REALTIME_ENCRYPTED_DEK_INVALID");
    }
    const aad = Buffer.from(aadText, "utf8");
    const dek = decryptWithKey(
      {
        nonce: bundle.encryptedDek.subarray(0, NONCE_BYTES),
        authTag: bundle.encryptedDek.subarray(
          NONCE_BYTES,
          NONCE_BYTES + TAG_BYTES,
        ),
        ciphertext: bundle.encryptedDek.subarray(NONCE_BYTES + TAG_BYTES),
      },
      this.kek,
      aad,
    );
    const plaintext = decryptWithKey(bundle, dek, aad);
    return JSON.parse(plaintext.toString("utf8")) as T;
  }

  encryptValue(value: string, aadText: string): EncryptedValue {
    return encryptWithKey(
      Buffer.from(value, "utf8"),
      this.kek,
      Buffer.from(aadText, "utf8"),
    );
  }

  decryptValue(value: EncryptedValue, aadText: string): string {
    return decryptWithKey(
      value,
      this.kek,
      Buffer.from(aadText, "utf8"),
    ).toString("utf8");
  }

  fingerprint(value: string, namespace: string): string {
    return createHash("sha256")
      .update(namespace)
      .update("\0")
      .update(value)
      .digest("hex");
  }
}

