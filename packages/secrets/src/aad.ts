import { createHash } from "node:crypto";
import type { SecretAad } from "./types.js";

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Secret AAD field is required: ${field}`);
  if (normalized.length > 256) throw new Error(`Secret AAD field is too long: ${field}`);
  return normalized;
}

/** Stable field order is part of the persisted envelope contract. */
export function encodeSecretAad(input: SecretAad): Buffer {
  if (!Number.isSafeInteger(input.secretVersion) || input.secretVersion < 1) {
    throw new Error("Secret AAD secretVersion must be a positive integer");
  }
  return Buffer.from(
    JSON.stringify({
      environment: required(input.environment, "environment"),
      provider: required(input.provider, "provider"),
      pageId: required(input.pageId, "pageId"),
      secretType: required(input.secretType, "secretType"),
      secretVersion: input.secretVersion,
      rowId: required(input.rowId, "rowId"),
    }),
    "utf8",
  );
}

export function hashAad(aad: Uint8Array): Buffer {
  return createHash("sha256").update(aad).digest();
}

