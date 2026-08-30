import type { AgentBuyingIntentV1 } from "@lana/contracts";
import { foldVietnameseForRecall } from "./vietnamese-text.js";

export type BuyingSignalReason =
  | "DIRECT_PURCHASE_VERB"
  | "SHIP_REQUEST"
  | "CONFIRMED_SIZE"
  | "CONFIRMED_COLOR"
  | "COMPONENT_SELECTION"
  | "MODEL_BUYING_COMMITTED"
  | "MODEL_BUYING_NEGATED"
  | "MODEL_BUYING_CONSIDERING"
  | "MODEL_DETERMINISTIC_CONFLICT_LESS_AGGRESSIVE"
  | "MODEL_REQUEST_EVIDENCE_MISMATCH";

export interface BuyingSignalContext {
  readonly hasProductContext?: boolean;
}

export interface BuyingSignalDetection {
  readonly isBuyingSignal: boolean;
  readonly reasons: readonly BuyingSignalReason[];
}

export interface HybridBuyingSignalDetection extends BuyingSignalDetection {
  readonly decision: "NONE" | "CONSIDERING" | "COMMITTED" | "NEGATED";
  readonly source: "DETERMINISTIC" | "MODEL_STRUCTURED_OUTPUT" | null;
  readonly quantity: number | null;
}

function asciiFold(value: string): string {
  return foldVietnameseForRecall(value)
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function negativeOrHesitantOnly(text: string): boolean {
  const negative = /(?:^|\s)(?:khong|ko|k|chua)\s+(?:lay|mua|chot|dat)(?:\s|$)/u.test(text);
  const hesitant = /(?:de\s+(?:chi|minh|em)\s+(?:xem|nghi)|suy\s+nghi|chua\s+quyet|tham\s+khao\s+them)/u.test(text);
  if (!negative && !hesitant) return false;
  return !/(?:nhung|con|ma)\s+(?:chi\s+)?(?:chot|lay|mua|dat|ship)(?:\s|$)/u.test(text);
}

export function detectBuyingSignal(
  value: string,
  context: BuyingSignalContext = {},
): BuyingSignalDetection {
  const text = asciiFold(value);
  if (!text || negativeOrHesitantOnly(text)) {
    return { isBuyingSignal: false, reasons: [] };
  }

  const reasons = new Set<BuyingSignalReason>();
  const directPurchase =
    /(?:^|\s)(?:chot|mua|dat)(?:\s|$)/u.test(text) ||
    (
      /(?:^|\s)lay(?:\s|$)/u.test(text) &&
      !/(?:^|\s)lay\s+(?:anh|hinh|link|ma|thong\s+tin)(?:\s|$)/u.test(text)
    );
  if (directPurchase) reasons.add("DIRECT_PURCHASE_VERB");

  if (
    /(?:^|\s)ship\s+(?:cho|minh|chi|c|em|mau|sp|san\s+pham|set|bo|ao|quan)(?:\s|$)/u.test(text)
  ) {
    reasons.add("SHIP_REQUEST");
  }

  if (
    /(?:^|\s)(?:lay|chot)\s+(?:ao|quan|chan\s+vay|cv|set|bo)(?:\s|$)/u.test(text)
  ) {
    reasons.add("COMPONENT_SELECTION");
  }

  if (context.hasProductContext) {
    const confirmation =
      /(?:^|\s)(?:ok|oke|duoc|dong\s+y|lay|chot)(?:\s|$)/u.test(text) &&
      !/(?:^|\s)(?:duoc|ok|oke)\s+(?:khong|ko|k)(?:\s|$)/u.test(text);
    const closingParticle = /(?:\s|^)(?:nhe|nha|a)$/u.test(text);
    if (
      /(?:^|\s)(?:size|sz)\s*(?:s|m|l|xl)(?:\s|$)/u.test(text) &&
      (confirmation || closingParticle)
    ) {
      reasons.add("CONFIRMED_SIZE");
    }
    if (
      /(?:^|\s)mau\s+(?!(?:nay|do|kia|nao)(?:\s|$))[a-z0-9]{2,}(?:\s|$)/u.test(text) &&
      (confirmation || closingParticle)
    ) {
      reasons.add("CONFIRMED_COLOR");
    }
  }

  return {
    isBuyingSignal: reasons.size > 0,
    reasons: [...reasons].sort(),
  };
}

export function containsBuyingSignal(
  value: string,
  context: BuyingSignalContext = {},
): boolean {
  return detectBuyingSignal(value, context).isBuyingSignal;
}

function exactEvidence(value: string, evidenceText: string | null): boolean {
  return evidenceText !== null &&
    value.normalize("NFC").includes(evidenceText.normalize("NFC"));
}

function informationQuestion(value: string): boolean {
  const text = asciiFold(value);
  return (
    value.includes("?") ||
    /\b(?:bao nhieu|gia gi|gia sao|con hang|con size|co .* khong|duoc khong|the nao|tu van|xem anh|gui anh)\b/u
      .test(text)
  );
}

function validCommittedAction(
  action: AgentBuyingIntentV1["requestedAction"],
): boolean {
  return action === "OPEN_CART" ||
    action === "ADD_TO_CART" ||
    action === "SET_QUANTITY" ||
    action === "PROCEED_TO_PAYMENT";
}

/**
 * Model evidence can extend the deterministic recognizer for long-tail
 * purchase language, but never executes a side effect by itself. Callers must
 * still verify product context, variants, cart state and policy.
 */
export function resolveHybridBuyingSignal(
  value: string,
  context: BuyingSignalContext = {},
  modelSignal: AgentBuyingIntentV1 | null | undefined = null,
): HybridBuyingSignalDetection {
  const deterministic = detectBuyingSignal(value, context);
  const matchedModelSignal =
    context.hasProductContext === true &&
    modelSignal !== null &&
    modelSignal !== undefined &&
    exactEvidence(value, modelSignal.evidenceText);
  const usableModelSignal = matchedModelSignal && modelSignal.confidence >= 0.9;
  if (matchedModelSignal && modelSignal.decision === "NEGATED") {
    return {
      isBuyingSignal: false,
      reasons: deterministic.isBuyingSignal
        ? ["MODEL_BUYING_NEGATED", "MODEL_DETERMINISTIC_CONFLICT_LESS_AGGRESSIVE"]
        : ["MODEL_BUYING_NEGATED"],
      decision: "NEGATED",
      source: "MODEL_STRUCTURED_OUTPUT",
      quantity: null,
    };
  }
  if (matchedModelSignal && modelSignal.decision === "CONSIDERING") {
    return {
      isBuyingSignal: false,
      reasons: deterministic.isBuyingSignal
        ? ["MODEL_BUYING_CONSIDERING", "MODEL_DETERMINISTIC_CONFLICT_LESS_AGGRESSIVE"]
        : ["MODEL_BUYING_CONSIDERING"],
      decision: "CONSIDERING",
      source: "MODEL_STRUCTURED_OUTPUT",
      quantity: null,
    };
  }
  if (
    deterministic.isBuyingSignal &&
    usableModelSignal &&
    modelSignal.decision === "COMMITTED" &&
    modelSignal.requestedAction === "OPEN_CART"
  ) {
    return {
      ...deterministic,
      decision: "COMMITTED",
      source: "DETERMINISTIC",
      quantity: null,
    };
  }
  if (
    usableModelSignal &&
    modelSignal.decision === "COMMITTED" &&
    validCommittedAction(modelSignal.requestedAction) &&
    !informationQuestion(value)
  ) {
    return {
      isBuyingSignal: true,
      reasons: [...new Set([
        ...deterministic.reasons,
        "MODEL_BUYING_COMMITTED" as const,
      ])].sort(),
      decision: "COMMITTED",
      source: "MODEL_STRUCTURED_OUTPUT",
      quantity: modelSignal.quantity,
    };
  }
  if (deterministic.isBuyingSignal) {
    return {
      ...deterministic,
      decision: "COMMITTED",
      source: "DETERMINISTIC",
      quantity: null,
    };
  }
  if (!usableModelSignal) {
    return {
      isBuyingSignal: false,
      reasons: [],
      decision: "NONE",
      source: null,
      quantity: null,
    };
  }

  if (
    modelSignal.decision !== "COMMITTED" ||
    !validCommittedAction(modelSignal.requestedAction) ||
    informationQuestion(value)
  ) {
    return {
      isBuyingSignal: false,
      reasons: [],
      decision: "NONE",
      source: null,
      quantity: null,
    };
  }
  return {
    isBuyingSignal: true,
    reasons: ["MODEL_BUYING_COMMITTED"],
    decision: "COMMITTED",
    source: "MODEL_STRUCTURED_OUTPUT",
    quantity: modelSignal.quantity,
  };
}
