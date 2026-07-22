export interface SecretAad {
  environment: string;
  provider: string;
  pageId: string;
  secretType: string;
  secretVersion: number;
  rowId: string;
}

export interface KeyWrapContext {
  kekVersion?: string;
  aad: Uint8Array;
}

export interface WrappedKey {
  algorithm: "AES-256-GCM";
  kekVersion: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
}

export interface KeyProvider {
  readonly name: string;
  wrapKey(plaintextDek: Uint8Array, context: KeyWrapContext): Promise<WrappedKey>;
  unwrapKey(wrappedKey: WrappedKey, context: KeyWrapContext): Promise<Buffer>;
}

export interface EncryptedSecretEnvelopeV1 {
  envelopeVersion: 1;
  algorithm: "AES-256-GCM";
  keyProvider: string;
  kekVersion: string;
  ciphertext: string;
  nonce: string;
  authTag: string;
  encryptedDek: string;
  encryptedDekNonce: string;
  encryptedDekAuthTag: string;
  aadSha256: string;
}

