import type { MessageRoleV1 } from "@lana/contracts";

// Transcript parsing for Redis history exports. The `value` field is a single
// string where each message starts with a role prefix. We must:
//  - detect the two known prefixes,
//  - join continuation lines into the preceding message,
//  - treat content before the first prefix as an UNKNOWN, start-truncated turn,
//  - preserve order, emoji, Unicode and teencode exactly (no spelling fixes),
//  - normalise only line endings.

export const CUSTOMER_PREFIX = "[Khách hàng]:";
export const SHOP_PREFIX = "[Nhân viên Shop]:";

export interface ParsedMessage {
  readonly turnIndex: number;
  readonly role: MessageRoleV1;
  readonly text: string;
  readonly startsWithRolePrefix: boolean;
}

export interface ParsedTranscript {
  readonly messages: readonly ParsedMessage[];
  readonly messageCount: number;
  readonly customerMessageCount: number;
  readonly shopMessageCount: number;
  readonly startTruncated: boolean;
}

interface Draft {
  role: MessageRoleV1;
  lines: string[];
  startsWithRolePrefix: boolean;
}

function normalizeLineEndings(value: string): string {
  // Normalise CRLF/CR to LF without touching any other character.
  return value.replace(/\r\n?/gu, "\n");
}

function detectPrefix(line: string): { role: MessageRoleV1; rest: string } | null {
  const trimmedStart = line.replace(/^\s+/u, "");
  const leading = line.length - trimmedStart.length;
  if (trimmedStart.startsWith(CUSTOMER_PREFIX)) {
    return { role: "CUSTOMER", rest: line.slice(leading + CUSTOMER_PREFIX.length) };
  }
  if (trimmedStart.startsWith(SHOP_PREFIX)) {
    return { role: "SHOP", rest: line.slice(leading + SHOP_PREFIX.length) };
  }
  return null;
}

export function parseTranscript(rawValue: string): ParsedTranscript {
  const normalized = normalizeLineEndings(rawValue);
  const lines = normalized.split("\n");
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let startTruncated = false;

  for (const line of lines) {
    const prefix = detectPrefix(line);
    if (prefix) {
      // Strip a single leading space that separates prefix from content.
      const rest = prefix.rest.startsWith(" ") ? prefix.rest.slice(1) : prefix.rest;
      current = { role: prefix.role, lines: [rest], startsWithRolePrefix: true };
      drafts.push(current);
      continue;
    }
    if (current === null) {
      // Content before any prefix: a truncated opening turn of unknown role.
      if (line.length === 0 && drafts.length === 0) {
        // Ignore a pure leading blank line; it is not real content.
        continue;
      }
      startTruncated = true;
      current = { role: "UNKNOWN", lines: [line], startsWithRolePrefix: false };
      drafts.push(current);
      continue;
    }
    // Continuation line belongs to the message in progress.
    current.lines.push(line);
  }

  const messages: ParsedMessage[] = drafts.map((draft, turnIndex) => ({
    turnIndex,
    role: draft.role,
    // Join preserves internal newlines; trim only trailing newlines that come
    // from the split, never internal content.
    text: draft.lines.join("\n").replace(/\n+$/u, ""),
    startsWithRolePrefix: draft.startsWithRolePrefix,
  }));

  let customerMessageCount = 0;
  let shopMessageCount = 0;
  for (const message of messages) {
    if (message.role === "CUSTOMER") customerMessageCount += 1;
    else if (message.role === "SHOP") shopMessageCount += 1;
  }

  return {
    messages,
    messageCount: messages.length,
    customerMessageCount,
    shopMessageCount,
    startTruncated,
  };
}
