import { createHash } from "node:crypto";
import {
  CanonicalBuyingIntentV1Schema,
  CanonicalDialogueEvidenceV1Schema,
  canonicalJsonV1,
  type AgentBuyingIntentV1,
  type CanonicalBuyingIntentV1,
  type CanonicalDialogueEvidenceV1,
} from "@lana/contracts";
import { resolveHybridBuyingSignal } from "./buying-signal.js";
import { foldVietnameseForRecall, normalizeVietnameseNfc } from "./vietnamese-text.js";

export interface BuildCanonicalDecisionEvidenceV1Input {
  readonly text: string;
  readonly sourceMessageId: string;
  readonly productId: string | null;
  readonly modelBuyingIntent: AgentBuyingIntentV1 | null | undefined;
  readonly evaluatedAt: Date;
}

export interface CanonicalDecisionEvidenceV1 {
  readonly dialogueEvidence: CanonicalDialogueEvidenceV1;
  readonly buyingIntent: CanonicalBuyingIntentV1;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const canonicalJson = canonicalJsonV1;

function explicitQuantity(text: string): number | null {
  const folded = foldVietnameseForRecall(text)
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
  const match = folded.match(
    /(?:^|\s)(\d{1,2})\s*(?:set|bo|sp|san pham|mau)(?:\s|$)/u,
  );
  const quantity = Number(match?.[1]);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 20
    ? quantity
    : null;
}

function dialogueAct(
  text: string,
  decision: CanonicalBuyingIntentV1["decision"],
): CanonicalDialogueEvidenceV1["act"] {
  const folded = foldVietnameseForRecall(text);
  if (text.includes("?") || /\b(?:bao nhieu|duoc khong|co .* khong|the nao)\b/u.test(folded)) {
    return "QUESTION";
  }
  if (decision === "NEGATED") return "REJECTION";
  if (decision === "COMMITTED") return "CONFIRMATION";
  if (/\b(?:doi lai|khong phai|y minh la|sua lai)\b/u.test(folded)) {
    return "CORRECTION";
  }
  if (/\b(?:cho|minh|chi|em|gui|lay|xem|tu van)\b/u.test(folded)) {
    return "REQUEST";
  }
  if (folded.trim().length === 0) return "AMBIGUOUS";
  return "STATEMENT";
}

function isInformationQuestion(text: string): boolean {
  const folded = foldVietnameseForRecall(text);
  return text.includes("?") ||
    /\b(?:bao nhieu|gia gi|gia sao|con hang|con size|co .* khong|duoc khong|the nao|tu van|xem anh|gui anh)\b/u
      .test(folded);
}

export function hasGuardedModelBuyingCommitmentEvidence(
  text: string,
  signal: AgentBuyingIntentV1 | null | undefined,
): boolean {
  if (
    !signal ||
    signal.decision !== "COMMITTED" ||
    signal.requestedAction === "NONE" ||
    signal.confidence < 0.9 ||
    signal.evidenceText === null ||
    isInformationQuestion(text)
  ) return false;
  return normalizeVietnameseNfc(text).includes(
    normalizeVietnameseNfc(signal.evidenceText),
  );
}

function confidenceBand(value: number | null): "LOW" | "MEDIUM" | "HIGH" {
  if (value === null || value >= 0.9) return "HIGH";
  if (value >= 0.7) return "MEDIUM";
  return "LOW";
}

export function hashCanonicalBuyingIntentV1(
  intent: CanonicalBuyingIntentV1,
): string {
  return sha256(canonicalJson(intent));
}

export function buildCanonicalDecisionEvidenceV1(
  input: BuildCanonicalDecisionEvidenceV1Input,
): CanonicalDecisionEvidenceV1 {
  const sourceMessageIdHash = sha256(input.sourceMessageId);
  const normalizedTextHash = sha256(normalizeVietnameseNfc(input.text));
  const resolved = resolveHybridBuyingSignal(
    input.text,
    { hasProductContext: input.productId !== null },
    input.modelBuyingIntent,
  );
  // A question/commitment conflict always chooses the less aggressive
  // interpretation before any commerce consumer sees the canonical result.
  const decision = resolved.decision === "COMMITTED" && isInformationQuestion(input.text)
    ? "NONE" as const
    : resolved.decision;
  const observed = decision !== "NONE";
  const deterministic = resolveHybridBuyingSignal(
    input.text,
    { hasProductContext: input.productId !== null },
    null,
  );
  const contributors = !observed
    ? []
    : resolved.source === "MODEL_STRUCTURED_OUTPUT"
      ? decision === "COMMITTED" && deterministic.decision === "COMMITTED"
        ? ["DETERMINISTIC_RUNTIME", "MODEL_STRUCTURED_OUTPUT"] as const
        : ["MODEL_STRUCTURED_OUTPUT"] as const
      : resolved.source === "DETERMINISTIC"
        ? ["DETERMINISTIC_RUNTIME"] as const
        : [];
  const requestedAction = decision === "COMMITTED"
    ? resolved.source === "MODEL_STRUCTURED_OUTPUT"
      ? input.modelBuyingIntent?.requestedAction ?? "OPEN_CART"
      : "OPEN_CART"
    : "NONE";
  const quantity = decision === "COMMITTED"
    ? explicitQuantity(input.text) ?? resolved.quantity
    : null;
  const buyingIntent = CanonicalBuyingIntentV1Schema.parse({
    schemaVersion: 1,
    authorityVersion: "CANONICAL_BUYING_INTENT_V1",
    decision,
    requestedAction,
    quantity,
    productId: decision === "COMMITTED" ? input.productId : null,
    contributors,
    sourceMessageIdHash,
    evidenceHash: observed
      ? sha256(canonicalJson([
          normalizedTextHash,
          decision,
          requestedAction,
          quantity,
          input.productId,
          resolved.reasons,
          contributors,
        ]))
      : null,
    reasonCodes: observed ? resolved.reasons : [],
    evaluatedAt: input.evaluatedAt.toISOString(),
    authorization: "NONE",
  });
  const act = dialogueAct(input.text, buyingIntent.decision);
  const dialogueContributors = [...new Set([
    "DETERMINISTIC_RUNTIME" as const,
    ...contributors,
  ])];
  const dialogueEvidence = CanonicalDialogueEvidenceV1Schema.parse({
    schemaVersion: 1,
    contractVersion: "CANONICAL_DIALOGUE_EVIDENCE_V1",
    act,
    contributors: dialogueContributors,
    confidenceBand: confidenceBand(
      contributors.some((value) => value === "MODEL_STRUCTURED_OUTPUT")
        ? input.modelBuyingIntent?.confidence ?? null
        : null,
    ),
    sourceMessageIdHash,
    evidenceHash: sha256(canonicalJson([
      normalizedTextHash,
      act,
      dialogueContributors,
      resolved.reasons,
    ])),
    reasonCodes: resolved.reasons,
    authorization: "NONE",
  });
  return { dialogueEvidence, buyingIntent };
}
