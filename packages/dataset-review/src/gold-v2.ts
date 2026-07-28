import type { AnnotationScopeV1, MessageRoleV1 } from "@lana/contracts";
import { WAVE1_LABEL_SCHEMA } from "./wave1-schema.js";

export interface GoldV2MessageAnnotation {
  readonly t: number;
  readonly l: string;
  readonly ev: string;
}

export interface GoldV2ConversationAnnotation {
  readonly l: string;
  readonly derived?: unknown;
}

export interface GoldV2Conversation {
  readonly n: number;
  readonly key: string;
  readonly startTruncated: boolean;
  readonly ann: readonly GoldV2MessageAnnotation[];
  readonly conv: readonly GoldV2ConversationAnnotation[];
}

export interface GoldV2 {
  readonly schemaVersion: "gold-v2";
  readonly unit: "MESSAGE";
  readonly range: { readonly from: number; readonly to: number };
  readonly conversations: readonly GoldV2Conversation[];
}

export interface GoldV2ProjectionMessage {
  readonly role: MessageRoleV1 | string;
  readonly text: string;
}

export interface ResolvedGoldV2Annotation {
  readonly labelCode: string;
  readonly scope: AnnotationScopeV1;
  readonly turnIndex: number | null;
  readonly evidenceText: string | null;
  readonly evidenceStart: number | null;
  readonly evidenceEnd: number | null;
  readonly derived: boolean;
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function string(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function integer(value: unknown, code: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(code);
  return value as number;
}

export function parseGoldV2(value: unknown): GoldV2 {
  const root = record(value, "GOLD_V2_ROOT_INVALID");
  if (root.schemaVersion !== "gold-v2" || root.unit !== "MESSAGE") {
    throw new Error("GOLD_V2_HEADER_INVALID");
  }
  const range = record(root.range, "GOLD_V2_RANGE_INVALID");
  const from = integer(range.from, "GOLD_V2_RANGE_FROM_INVALID");
  const to = integer(range.to, "GOLD_V2_RANGE_TO_INVALID");
  if (!Array.isArray(root.conversations)) throw new Error("GOLD_V2_CONVERSATIONS_INVALID");

  const seenN = new Set<number>();
  const seenKey = new Set<string>();
  const conversations = root.conversations.map((entry, index): GoldV2Conversation => {
    const item = record(entry, `GOLD_V2_CONVERSATION_INVALID:${index}`);
    const n = integer(item.n, `GOLD_V2_N_INVALID:${index}`);
    const key = string(item.key, `GOLD_V2_KEY_INVALID:${index}`);
    if (seenN.has(n) || seenKey.has(key)) throw new Error(`GOLD_V2_DUPLICATE:${index}`);
    seenN.add(n);
    seenKey.add(key);
    if (typeof item.startTruncated !== "boolean") {
      throw new Error(`GOLD_V2_TRUNCATED_INVALID:${index}`);
    }
    if (!Array.isArray(item.ann) || !Array.isArray(item.conv)) {
      throw new Error(`GOLD_V2_ANNOTATIONS_INVALID:${index}`);
    }
    const ann = item.ann.map((annotation, annotationIndex): GoldV2MessageAnnotation => {
      const row = record(
        annotation,
        `GOLD_V2_MESSAGE_ANNOTATION_INVALID:${index}:${annotationIndex}`,
      );
      return {
        t: integer(row.t, `GOLD_V2_TURN_INVALID:${index}:${annotationIndex}`),
        l: string(row.l, `GOLD_V2_LABEL_INVALID:${index}:${annotationIndex}`),
        ev: string(row.ev, `GOLD_V2_EVIDENCE_INVALID:${index}:${annotationIndex}`),
      };
    });
    const conv = item.conv.map(
      (annotation, annotationIndex): GoldV2ConversationAnnotation => {
        const row = record(
          annotation,
          `GOLD_V2_CONVERSATION_ANNOTATION_INVALID:${index}:${annotationIndex}`,
        );
        return {
          l: string(row.l, `GOLD_V2_CONVERSATION_LABEL_INVALID:${index}:${annotationIndex}`),
          ...(row.derived !== undefined ? { derived: row.derived } : {}),
        };
      },
    );
    return { n, key, startTruncated: item.startTruncated, ann, conv };
  });
  if (conversations.length !== to - from + 1) {
    throw new Error("GOLD_V2_RANGE_COUNT_MISMATCH");
  }
  return {
    schemaVersion: "gold-v2",
    unit: "MESSAGE",
    range: { from, to },
    conversations,
  };
}

function scopeRole(scope: AnnotationScopeV1): MessageRoleV1 | null {
  if (scope === "CUSTOMER_MESSAGE") return "CUSTOMER";
  if (scope === "SHOP_MESSAGE") return "SHOP";
  return null;
}

export function resolveGoldV2Annotations(
  source: GoldV2Conversation,
  messages: ReadonlyMap<number, GoldV2ProjectionMessage>,
): readonly ResolvedGoldV2Annotation[] {
  const labelScopes = new Map(
    WAVE1_LABEL_SCHEMA.labels.map((label) => [label.code, label.scope]),
  );
  const annotations: ResolvedGoldV2Annotation[] = [];

  for (const annotation of source.ann) {
    const scope = labelScopes.get(annotation.l);
    if (!scope || scope === "CONVERSATION" || scope === "SEQUENCE") {
      throw new Error(`GOLD_V2_MESSAGE_LABEL_SCOPE_INVALID:${annotation.l}`);
    }
    const requiredRole = scopeRole(scope);
    const normalizedEvidence = annotation.ev.replace(/\r\n?/gu, "\n");
    const exactCandidates = [...messages.entries()].filter(
      ([, message]) =>
        message.role === requiredRole && message.text.includes(normalizedEvidence),
    );
    const preferredTurns = source.startTruncated
      ? [annotation.t, annotation.t + 1]
      : [annotation.t];
    const exact = exactCandidates.length === 1
      ? exactCandidates[0]
      : exactCandidates.find(([turn]) => preferredTurns.includes(turn));
    const redacted = exact
      ? undefined
      : preferredTurns
        .map((turn) => [turn, messages.get(turn)] as const)
        .find(
          ([, message]) =>
            message?.role === requiredRole && /\[[A-Z_]+_\d+\]/u.test(message.text),
        );
    const resolved = exact ?? redacted;
    if (!resolved) {
      throw new Error(`GOLD_V2_EVIDENCE_NOT_FOUND:${source.n}:${annotation.t}`);
    }
    const [resolvedTurn, message] = resolved;
    if (!message) {
      throw new Error(`GOLD_V2_TURN_NOT_FOUND:${source.n}:${resolvedTurn}`);
    }
    const exactStart = message.text.indexOf(normalizedEvidence);
    const evidenceText = exactStart >= 0 ? normalizedEvidence : message.text;
    const evidenceStart = exactStart >= 0 ? exactStart : 0;
    annotations.push({
      labelCode: annotation.l,
      scope,
      turnIndex: resolvedTurn,
      evidenceText,
      evidenceStart,
      evidenceEnd: evidenceStart + evidenceText.length,
      derived: false,
    });
  }

  for (const annotation of source.conv) {
    const scope = labelScopes.get(annotation.l);
    if (scope !== "CONVERSATION") {
      throw new Error(`GOLD_V2_CONVERSATION_LABEL_SCOPE_INVALID:${annotation.l}`);
    }
    annotations.push({
      labelCode: annotation.l,
      scope,
      turnIndex: null,
      evidenceText: null,
      evidenceStart: null,
      evidenceEnd: null,
      derived: annotation.derived === true,
    });
  }

  return annotations;
}
