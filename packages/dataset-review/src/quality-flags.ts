import type { ParsedTranscript } from "./parse.js";
import { normalizeForFingerprint } from "./normalize.js";
import type { PiiType } from "./redact.js";

export type QualityFlag =
  | "START_TRUNCATED"
  | "POSSIBLY_CAPPED_AT_30"
  | "MISSING_ATTACHMENT_CONTEXT"
  | "PRODUCT_REFERENCE_NOT_EVALUABLE"
  | "REPEATED_SHOP_MESSAGE"
  | "REPEATED_CUSTOMER_MESSAGE"
  | "UNICODE_ANOMALY"
  | "CONTAINS_PHONE"
  | "CONTAINS_ADDRESS"
  | "CONTAINS_ORDER_ID"
  | "LOW_CUSTOMER_CONTENT";

// Deictic references the customer uses to point at an attachment/product that
// the transcript does not carry (§7.3). Any match sets MISSING_ATTACHMENT_CONTEXT.
const DEICTIC_REFERENCES = [
  "mẫu này",
  "set này",
  "cái này",
  "hình này",
  "ảnh này",
  "mẫu trên",
  "mẫu kia",
];

const PRODUCT_CODE = /\b[A-Z]{2,}[-_]?\d{2,}\b/u;
// Control chars (except \t \n), the replacement char, zero-width joiners and BOM
// code points that usually indicate a decoding/copy-paste anomaly.
const UNICODE_ANOMALY =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD\u200B-\u200D\uFEFF]/u;

export interface QualityFlagInput {
  readonly transcript: ParsedTranscript;
  readonly piiCounts: Readonly<Record<PiiType, number>>;
  readonly lowCustomerContentMaxMessages?: number;
}

export function computeQualityFlags(input: QualityFlagInput): QualityFlag[] {
  const { transcript, piiCounts } = input;
  const flags = new Set<QualityFlag>();

  if (transcript.startTruncated) flags.add("START_TRUNCATED");
  if (transcript.messageCount >= 30) flags.add("POSSIBLY_CAPPED_AT_30");

  const customerMessages = transcript.messages.filter((message) => message.role === "CUSTOMER");
  const anyProductCode = transcript.messages.some((message) => PRODUCT_CODE.test(message.text));
  // Shop turns always carry the shop prefix, so an UNKNOWN (prefixless) turn is
  // customer-side content — include it when looking for deictic references.
  const customerSideMessages = transcript.messages.filter(
    (message) => message.role === "CUSTOMER" || message.role === "UNKNOWN",
  );
  const anyDeictic = customerSideMessages.some((message) => {
    const lowered = message.text.toLowerCase();
    return DEICTIC_REFERENCES.some((phrase) => lowered.includes(phrase));
  });
  if (anyDeictic) {
    flags.add("MISSING_ATTACHMENT_CONTEXT");
    if (!anyProductCode) flags.add("PRODUCT_REFERENCE_NOT_EVALUABLE");
  }

  if (hasRepeat(transcript, "SHOP")) flags.add("REPEATED_SHOP_MESSAGE");
  if (hasRepeat(transcript, "CUSTOMER")) flags.add("REPEATED_CUSTOMER_MESSAGE");

  if (transcript.messages.some((message) => UNICODE_ANOMALY.test(message.text))) {
    flags.add("UNICODE_ANOMALY");
  }

  if (piiCounts.PHONE > 0) flags.add("CONTAINS_PHONE");
  if (piiCounts.ADDRESS > 0) flags.add("CONTAINS_ADDRESS");
  if (piiCounts.ORDER_ID > 0) flags.add("CONTAINS_ORDER_ID");

  const maxLowCustomer = input.lowCustomerContentMaxMessages ?? 1;
  const meaningfulCustomer = customerMessages.filter(
    (message) => normalizeForFingerprint(message.text).length > 0,
  ).length;
  if (meaningfulCustomer <= maxLowCustomer) flags.add("LOW_CUSTOMER_CONTENT");

  return [...flags].sort();
}

function hasRepeat(transcript: ParsedTranscript, role: "SHOP" | "CUSTOMER"): boolean {
  const seen = new Set<string>();
  for (const message of transcript.messages) {
    if (message.role !== role) continue;
    const normalized = normalizeForFingerprint(message.text);
    if (normalized.length === 0) continue;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}
