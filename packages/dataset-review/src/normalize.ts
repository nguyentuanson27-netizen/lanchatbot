import type { LengthBinV1 } from "@lana/contracts";

export const NORMALIZATION_VERSION = "norm-v1";

// Message-count length bins used for stratified splits and dashboard buckets.
export function lengthBin(messageCount: number): LengthBinV1 {
  if (messageCount <= 5) return "1_5";
  if (messageCount <= 10) return "6_10";
  if (messageCount <= 20) return "11_20";
  return "OVER_20";
}

// Normalise a message for fingerprinting/comparison only. This is NOT applied to
// stored content: whitespace collapse + lowercase + Unicode NFC. Teencode and
// emoji are intentionally preserved.
export function normalizeForFingerprint(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}
