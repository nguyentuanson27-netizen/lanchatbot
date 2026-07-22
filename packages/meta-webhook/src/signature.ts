import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";
const SHA256_HEX_LENGTH = 64;

/** Verify Meta's signature over the exact bytes received from the network. */
export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX) || appSecret.length === 0) {
    return false;
  }

  const suppliedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  if (
    suppliedHex.length !== SHA256_HEX_LENGTH ||
    !/^[0-9a-f]{64}$/i.test(suppliedHex)
  ) {
    return false;
  }

  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
