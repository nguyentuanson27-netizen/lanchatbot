import type {
  AnnotationScopeV1,
  LabelDefinitionV1,
  LabelSchemaV1,
  MessageRoleV1,
  PrelabelAnnotationV1,
} from "@lana/contracts";

// Evidence + role/scope validation for AI/heuristic proposals (§10.4). A proposal
// is only accepted into the review queue if it passes every check; the model is
// never trusted to place absolute offsets — the backend exact-matches
// evidenceText inside the addressed message and derives offsets itself.

export interface ValidationMessage {
  readonly turnIndex: number;
  readonly role: MessageRoleV1;
  readonly messageId: string;
  readonly redactedText: string;
}

export type EvidenceValidationError =
  | "LABEL_NOT_IN_SCHEMA"
  | "LABEL_INACTIVE"
  | "SCOPE_MISMATCH"
  | "TURN_OUT_OF_RANGE"
  | "SECOND_TURN_OUT_OF_RANGE"
  | "ROLE_SCOPE_MISMATCH"
  | "EVIDENCE_REQUIRED"
  | "EVIDENCE_NOT_FOUND"
  | "EVIDENCE_AMBIGUOUS";

export interface ValidatedEvidence {
  readonly messageId: string;
  readonly turnIndex: number;
  readonly startOffset: number;
  readonly endOffset: number;
}

export type PrelabelValidationResult =
  | { readonly ok: true; readonly evidence: ValidatedEvidence | null }
  | { readonly ok: false; readonly error: EvidenceValidationError };

function scopeRole(scope: AnnotationScopeV1): MessageRoleV1 | null {
  if (scope === "CUSTOMER_MESSAGE") return "CUSTOMER";
  if (scope === "SHOP_MESSAGE") return "SHOP";
  return null; // CONVERSATION / SEQUENCE are not tied to a single role.
}

// Exact-match evidenceText inside a message. Returns the single match offsets, or
// null when there is no match, or "ambiguous" when it occurs more than once.
export function locateEvidence(
  messageText: string,
  evidenceText: string,
): { startOffset: number; endOffset: number } | "ambiguous" | null {
  if (evidenceText.length === 0) return null;
  const first = messageText.indexOf(evidenceText);
  if (first < 0) return null;
  const second = messageText.indexOf(evidenceText, first + 1);
  if (second >= 0) return "ambiguous";
  return { startOffset: first, endOffset: first + evidenceText.length };
}

export function findLabel(
  schema: LabelSchemaV1,
  labelCode: string,
): LabelDefinitionV1 | undefined {
  return schema.labels.find((label) => label.code === labelCode);
}

export function validatePrelabelAnnotation(
  annotation: PrelabelAnnotationV1,
  schema: LabelSchemaV1,
  messages: readonly ValidationMessage[],
): PrelabelValidationResult {
  const label = findLabel(schema, annotation.labelCode);
  if (!label) return { ok: false, error: "LABEL_NOT_IN_SCHEMA" };
  if (!label.isActive) return { ok: false, error: "LABEL_INACTIVE" };
  if (label.scope !== annotation.scope) return { ok: false, error: "SCOPE_MISMATCH" };

  const message = messages.find((entry) => entry.turnIndex === annotation.turnIndex);
  if (!message) return { ok: false, error: "TURN_OUT_OF_RANGE" };

  if (annotation.secondTurnIndex !== null) {
    const second = messages.find((entry) => entry.turnIndex === annotation.secondTurnIndex);
    if (!second) return { ok: false, error: "SECOND_TURN_OUT_OF_RANGE" };
  }

  const requiredRole = scopeRole(annotation.scope);
  if (requiredRole !== null && message.role !== requiredRole) {
    // e.g. a CUSTOMER_MESSAGE intent claimed against a SHOP turn — the rule that
    // customer intent may only be labelled on CUSTOMER messages (§9.5).
    return { ok: false, error: "ROLE_SCOPE_MISMATCH" };
  }

  if (!label.evidenceRequired) {
    return { ok: true, evidence: null };
  }

  if (annotation.evidenceText === null || annotation.evidenceText.length === 0) {
    return { ok: false, error: "EVIDENCE_REQUIRED" };
  }
  const located = locateEvidence(message.redactedText, annotation.evidenceText);
  if (located === null) return { ok: false, error: "EVIDENCE_NOT_FOUND" };
  if (located === "ambiguous") return { ok: false, error: "EVIDENCE_AMBIGUOUS" };

  return {
    ok: true,
    evidence: {
      messageId: message.messageId,
      turnIndex: message.turnIndex,
      startOffset: located.startOffset,
      endOffset: located.endOffset,
    },
  };
}

export interface MutualExclusionConflict {
  readonly group: string;
  readonly labelCodes: readonly string[];
}

// Detect mutually-exclusive label conflicts among a set of labels addressing the
// same target (same scope + same turn). Two labels in the same
// mutuallyExclusiveGroup on the same target conflict.
export function findMutualExclusionConflicts(
  schema: LabelSchemaV1,
  labels: readonly { readonly labelCode: string; readonly turnIndex: number | null }[],
): MutualExclusionConflict[] {
  const byGroupTarget = new Map<string, Set<string>>();
  for (const entry of labels) {
    const definition = findLabel(schema, entry.labelCode);
    if (!definition?.mutuallyExclusiveGroup) continue;
    const key = `${definition.mutuallyExclusiveGroup}@${entry.turnIndex ?? "conversation"}`;
    const set = byGroupTarget.get(key) ?? new Set<string>();
    set.add(entry.labelCode);
    byGroupTarget.set(key, set);
  }
  const conflicts: MutualExclusionConflict[] = [];
  for (const [key, set] of byGroupTarget) {
    if (set.size > 1) {
      conflicts.push({ group: key.split("@")[0] ?? key, labelCodes: [...set].sort() });
    }
  }
  return conflicts;
}
