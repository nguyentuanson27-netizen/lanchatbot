import {
  foldVietnameseForRecall,
  normalizeVietnameseNfc,
} from "@lana/business-tools";

export type ConfirmationDecision = "CONFIRM" | "REJECT" | "UNCLEAR";

export type ConfirmationSource =
  | "DETERMINISTIC_CLASSIFIER"
  | "MODEL_STRUCTURED_OUTPUT";

/**
 * B0 contract for the future confirmation V2 path. This module is deliberately
 * not wired into the active sales-cycle consumer: CF-03 owns runtime mode
 * resolution and is the only slice allowed to activate it.
 */
export interface ConfirmationClassification {
  readonly decision: ConfirmationDecision;
  readonly terminal: boolean;
  readonly evidenceDetected: boolean;
  readonly source: ConfirmationSource | null;
  readonly reasonCode: string | null;
}

export interface ConfirmationModelEvidence {
  readonly decision: ConfirmationDecision;
  readonly evidenceText: string | null;
  readonly confidence: number;
}

export const ASK_CONFIRMATION_CLARIFICATION = "ASK_CONFIRMATION_CLARIFICATION";

export type ConfirmationAction = typeof ASK_CONFIRMATION_CLARIFICATION;

const MODEL_CONFIDENCE_MINIMUM = 0.85;

function normalizedTokens(text: string): string {
  return normalizeVietnameseNfc(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function classification(
  decision: ConfirmationDecision,
  evidenceDetected: boolean,
  source: ConfirmationSource | null,
  reasonCode: string | null,
): ConfirmationClassification {
  return {
    decision,
    terminal: decision !== "UNCLEAR",
    evidenceDetected,
    source,
    reasonCode,
  };
}

function exactEvidence(text: string, evidenceText: string | null): boolean {
  if (!evidenceText) return false;
  return normalizeVietnameseNfc(text).includes(normalizeVietnameseNfc(evidenceText));
}

function hasConfirmationVocabulary(tokens: string): boolean {
  return /(?:^| )(?:ok|oke|okay|\u0111\u1ed3ng \u00fd|x\u00e1c nh\u1eadn|ch\u1ed1t|l\u00ean \u0111\u01a1n|l\u1ea5y)(?= |$)/u.test(tokens);
}

function hasClearRejection(tokens: string): boolean {
  return /(?:^| )(?:\u0111\u1eebng|d\u1eebng|kh\u00f4ng|ko|k|h\u1ee7y) (?:l\u1ea5y|ch\u1ed1t|x\u00e1c nh\u1eadn|l\u00ean \u0111\u01a1n)(?= |$)/u.test(tokens);
}

function hasHesitation(tokens: string): boolean {
  return /(?:^| )(?:ch\u01b0a (?:\u0111\u00e2u|em)?|\u0111\u1ec3 (?:ch\u1ecb|em)? ?(?:suy ngh\u0129|c\u00e2n nh\u1eafc|xem l\u1ea1i))(?= |$)/u.test(tokens);
}

function hasMediaRequest(tokens: string): boolean {
  return /(?:^| )(?:l\u1ea5y|xin|g\u1eedi|xem) (?:th\u00eam )?\u1ea3nh(?= |$)/u.test(tokens);
}

function hasQuestion(text: string, tokens: string): boolean {
  return /[?\uFF1F]/u.test(text) || /(?:^| )(?:\u0111\u01b0\u1ee3c kh\u00f4ng|ph\u1ea3i kh\u00f4ng|ch\u01b0a em)(?= |$)/u.test(tokens);
}

function hasAmbiguousUnaccentedDzung(tokens: string, recall: string): boolean {
  return !/(?:^| )(?:\u0111\u00fang|\u0111\u1eebng|d\u1eebng)(?= |$)/u.test(tokens)
    && /\bdung\b/u.test(recall)
    && /\b(?:chot|len don|xac nhan|lay)\b/u.test(recall);
}

function deterministicClassification(text: string): ConfirmationClassification {
  const normalized = normalizeVietnameseNfc(text);
  const tokens = normalizedTokens(normalized);
  const recall = foldVietnameseForRecall(normalized)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  const vocabularyDetected = hasConfirmationVocabulary(tokens)
    || /\b(?:ok|oke|okay|dong y|xac nhan|chot|len don|lay|dung)\b/u.test(recall);

  if (!vocabularyDetected) {
    return classification("UNCLEAR", false, null, null);
  }
  if (hasQuestion(normalized, tokens)) {
    return classification("UNCLEAR", true, "DETERMINISTIC_CLASSIFIER", "CONFIRMATION_QUESTION");
  }
  if (hasClearRejection(tokens)) {
    return classification("REJECT", true, "DETERMINISTIC_CLASSIFIER", "CONFIRMATION_EXPLICIT_REJECTION");
  }
  if (hasHesitation(tokens)) {
    return classification("UNCLEAR", true, "DETERMINISTIC_CLASSIFIER", "CONFIRMATION_HESITANT");
  }
  if (hasMediaRequest(tokens)) {
    return classification("UNCLEAR", true, "DETERMINISTIC_CLASSIFIER", "CONFIRMATION_MEDIA_REQUEST");
  }
  if (hasAmbiguousUnaccentedDzung(tokens, recall)) {
    return classification("UNCLEAR", true, "DETERMINISTIC_CLASSIFIER", "CONFIRMATION_AMBIGUOUS_UNACCENTED");
  }
  if (
    /(?:^| )(?:ok|oke|okay|\u0111\u1ed3ng \u00fd|x\u00e1c nh\u1eadn)(?= |$)/u.test(tokens)
    || /(?:^| )(?:cho|gi\u00fap) (?:ch\u1ecb|c|em|e)? ?(?:l\u1ea5y|ch\u1ed1t|l\u00ean \u0111\u01a1n)(?= |$)/u.test(tokens)
    || /(?:^| )(?:ch\u1ed1t|l\u00ean \u0111\u01a1n)(?= |$)/u.test(tokens)
    || /(?:^| )l\u1ea5y(?: (?:\u0111i|nha|nh\u00e9|a))?$/u.test(tokens)
  ) {
    return classification("CONFIRM", true, "DETERMINISTIC_CLASSIFIER", "CONFIRMATION_DETERMINISTIC_MATCH");
  }
  return classification("UNCLEAR", true, "DETERMINISTIC_CLASSIFIER", "CONFIRMATION_AMBIGUOUS");
}

/**
 * Computes the CF-02 classifier contract without changing active behavior.
 * Terminal deterministic decisions win. Non-terminal ambiguity and questions
 * deliberately remain non-terminal even when model evidence is present; a
 * future CF-03 mode owner will turn them into clarification behavior.
 */
export function classifyConfirmationContract(
  text: string,
  modelEvidence: ConfirmationModelEvidence | null | undefined,
): ConfirmationClassification {
  const deterministic = deterministicClassification(text);
  if (deterministic.terminal) return deterministic;

  const modelIsUsable = modelEvidence
    && modelEvidence.confidence >= MODEL_CONFIDENCE_MINIMUM
    && exactEvidence(text, modelEvidence.evidenceText);
  if (!modelIsUsable) return deterministic;

  if (
    deterministic.reasonCode === "CONFIRMATION_QUESTION"
    || deterministic.reasonCode === "CONFIRMATION_HESITANT"
    || deterministic.reasonCode === "CONFIRMATION_MEDIA_REQUEST"
    || deterministic.reasonCode === "CONFIRMATION_AMBIGUOUS_UNACCENTED"
  ) return deterministic;

  if (modelEvidence.decision === "CONFIRM") {
    return classification("CONFIRM", true, "MODEL_STRUCTURED_OUTPUT", "CONFIRMATION_MODEL_MATCH");
  }
  if (modelEvidence.decision === "REJECT") {
    return classification("REJECT", true, "MODEL_STRUCTURED_OUTPUT", "CONFIRMATION_MODEL_REJECTED");
  }
  return classification("UNCLEAR", true, "MODEL_STRUCTURED_OUTPUT", "CONFIRMATION_MODEL_UNCLEAR");
}

/**
 * Declares the bounded CF-03 action code without dispatching it. Callers must
 * also enforce the ORDER_PREVIEW boundary and an active runtime mode.
 */
export function confirmationClarificationAction(
  result: ConfirmationClassification,
): ConfirmationAction | null {
  return result.decision === "UNCLEAR" && result.evidenceDetected
    ? ASK_CONFIRMATION_CLARIFICATION
    : null;
}
