import { createHash } from "node:crypto";
import type { MessageRoleV1 } from "@lana/contracts";
import { parseTranscript } from "./parse.js";
import { NORMALIZATION_VERSION, lengthBin } from "./normalize.js";
import { ConversationRedactor, REDACTION_VERSION, hasResidualPii, type PiiType } from "./redact.js";
import { computeQualityFlags, type QualityFlag } from "./quality-flags.js";
import { customerSequenceFingerprint, messageChecksum } from "./dedup.js";

// Pure per-record import computation. Takes a raw transcript `value` string and
// produces everything the persistence layer needs, WITHOUT touching a database
// or performing encryption. The store encrypts rawText/rawPayload itself. Keeping
// this pure makes the whole parse -> redact -> flag -> dedup path unit-testable.

export interface MessageImport {
  readonly turnIndex: number;
  readonly role: MessageRoleV1;
  readonly rawText: string;
  readonly redactedText: string;
  readonly messageChecksum: string;
  readonly startsWithRolePrefix: boolean;
}

export interface ConversationImport {
  readonly conversationKeyHash: string;
  readonly messageCount: number;
  readonly customerMessageCount: number;
  readonly shopMessageCount: number;
  readonly lengthBin: ReturnType<typeof lengthBin>;
  readonly duplicateGroupId: string;
  readonly qualityFlags: readonly QualityFlag[];
  readonly normalizationVersion: string;
  readonly redactionVersion: string;
  readonly startTruncated: boolean;
  readonly piiCounts: Readonly<Record<PiiType, number>>;
  readonly messages: readonly MessageImport[];
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function computeConversationImport(
  rawValue: string,
  sourceKey: string,
): ConversationImport {
  const parsed = parseTranscript(rawValue);
  const redactor = new ConversationRedactor();

  const messages: MessageImport[] = parsed.messages.map((message) => {
    const redactedText = redactor.redact(message.text);
    if (hasResidualPii(redactedText)) {
      throw new Error("REDACTION_RESIDUAL_PII");
    }
    return {
      turnIndex: message.turnIndex,
      role: message.role,
      rawText: message.text,
      redactedText,
      // Checksum is computed over redacted content only — never raw PII.
      messageChecksum: messageChecksum(message.role, redactedText),
      startsWithRolePrefix: message.startsWithRolePrefix,
    };
  });

  const redactedCustomerSequence = messages
    .filter((message) => message.role === "CUSTOMER")
    .map((message) => message.redactedText);
  const piiCounts = redactor.report().counts;
  const qualityFlags = computeQualityFlags({ transcript: parsed, piiCounts });

  return {
    conversationKeyHash: sha256Hex(sourceKey),
    messageCount: parsed.messageCount,
    customerMessageCount: parsed.customerMessageCount,
    shopMessageCount: parsed.shopMessageCount,
    lengthBin: lengthBin(parsed.messageCount),
    duplicateGroupId: customerSequenceFingerprint(redactedCustomerSequence),
    qualityFlags,
    normalizationVersion: NORMALIZATION_VERSION,
    redactionVersion: REDACTION_VERSION,
    startTruncated: parsed.startTruncated,
    piiCounts,
    messages,
  };
}

// Aggregate an import report (§7.1) from a set of computed conversations. Counts
// only — never raw content. length_bin distribution and PII totals feed the
// dataset dashboard.
export interface ImportReport {
  readonly totalRecords: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly duplicateGroups: number;
  readonly truncated: number;
  readonly piiTotals: Record<PiiType, number>;
  readonly lengthBins: Record<string, number>;
}

export function buildImportReport(
  conversations: readonly ConversationImport[],
  failed: number,
): ImportReport {
  const piiTotals: Record<PiiType, number> = {
    PHONE: 0, EMAIL: 0, URL: 0, ORDER_ID: 0, ADDRESS: 0, PERSON: 0,
  };
  const lengthBins: Record<string, number> = {};
  const groups = new Set<string>();
  let truncated = 0;
  for (const conversation of conversations) {
    groups.add(conversation.duplicateGroupId);
    if (conversation.startTruncated) truncated += 1;
    lengthBins[conversation.lengthBin] = (lengthBins[conversation.lengthBin] ?? 0) + 1;
    for (const type of Object.keys(piiTotals) as PiiType[]) {
      piiTotals[type] += conversation.piiCounts[type];
    }
  }
  return {
    totalRecords: conversations.length + failed,
    succeeded: conversations.length,
    failed,
    duplicateGroups: groups.size,
    truncated,
    piiTotals,
    lengthBins,
  };
}
