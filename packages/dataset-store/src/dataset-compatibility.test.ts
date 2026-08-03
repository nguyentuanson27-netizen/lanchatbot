import { describe, expect, it } from "vitest";
import { LocalEnvelopeCipher, type CipherBundle } from "@lana/database";

const FIXTURE_AAD = "dataset-review:raw-item:v1:dataset-legacy:source-key-hash";
const FIXTURE_PAYLOAD = {
  schemaVersion: 1,
  source: "legacy-dataset-fixture",
  count: 1,
};

// A fixed C1 compatibility fixture encrypted with an intentionally public all-zero
// test key. It contains no customer data and proves stored bundle shape/AAD remains
// readable after persistence moved from @lana/database to @lana/dataset-store.
const C1_FIXTURE: CipherBundle = {
  ciphertext: Buffer.from("3fd005275d8f12b938438ef2d8117cec562bee2ea95accf6980e3c4aee062ef52049d4503140cd9622c51113a24385ce2815f51e0ae78c5228833a5d2bb23c", "hex"),
  nonce: Buffer.from("9a0e0be55ac3cf5531b4623d", "hex"),
  authTag: Buffer.from("47d58096ac53847ca02f03c0e680d4e6", "hex"),
  encryptedDek: Buffer.from("557610fac89e947af5db7f40ebd81149817b6196b30e52807b3416dab01cac068903ab9d4964fcf298e2d1c7d9d66e4c13a57016baf0cc9efbb8576c", "hex"),
  keyRef: "dataset-key-v1",
  expiresAt: new Date("2026-08-03T00:00:00.000Z"),
};

describe("dataset-store C1 encrypted-data compatibility", () => {
  const cipher = new LocalEnvelopeCipher("00".repeat(32), "dataset-key-v1");

  it("preserves fixed pre-extraction bundle and AAD isolation", () => {
    expect(cipher.decryptJson<typeof FIXTURE_PAYLOAD>(C1_FIXTURE, FIXTURE_AAD)).toEqual(FIXTURE_PAYLOAD);
    expect(() => cipher.decryptJson(C1_FIXTURE, `${FIXTURE_AAD}:different`)).toThrow();
  });
});
