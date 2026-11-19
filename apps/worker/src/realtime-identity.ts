import { createHash } from "node:crypto";
import type { CustomerProfileV1 } from "@lana/contracts";

export function deterministicUuid(input: string): string {
  const hash = createHash("sha256").update(input).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

// The gateway key can include a version prefix. The profile stores a digest only.
function profileDigest(customerHash: string): string {
  const normalized = customerHash.trim().toLocaleLowerCase("en-US");
  return /^[a-f0-9]{64}$/u.test(normalized)
    ? normalized
    : createHash("sha256").update(customerHash).digest("hex");
}

export function newCustomerProfile(
  pageId: string,
  customerHash: string,
  now: Date,
): CustomerProfileV1 {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    profileId: deterministicUuid(`lana:customer-profile:v1:${pageId}:${customerHash}`),
    customerKey: {
      namespace: `META_PAGE:${pageId}`.slice(0, 64),
      algorithm: "HMAC_SHA256",
      digest: profileDigest(customerHash),
    },
    revision: 1,
    measurements: [],
    fitPreference: null,
    preferences: { colors: [], styles: [], materials: [] },
    sizeHistory: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
