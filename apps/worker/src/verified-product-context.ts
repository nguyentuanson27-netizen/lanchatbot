import { normalizeProductCode } from "@lana/business-tools";

export type VerifiedProductContextSource =
  | "CURRENT_TURN"
  | "STATE"
  | "PREVIOUS_BOT"
  | "MESSAGE_CODE"
  | "MEDIA_OR_AD";

export interface VerifiedProductContextCandidate {
  readonly productId: string;
  readonly source: VerifiedProductContextSource;
  readonly verified: boolean;
  readonly observedAt: string;
  readonly expiresAt: string | null;
  readonly stateRevision: number | null;
  readonly fence: number | null;
}

export interface VerifiedProductContextInput {
  readonly candidates: readonly VerifiedProductContextCandidate[];
  readonly expectedStateRevision: number;
  readonly minimumFence: number;
  readonly conversationOwner: "BOT" | "HUMAN";
  readonly hasActiveClarification: boolean;
  readonly activeStateSelectionProductIds: readonly string[];
  readonly resetRequested: boolean;
  readonly explicitProductIds: readonly string[];
  readonly now: Date;
}

export interface VerifiedProductContextResolution {
  readonly productId: string | null;
  readonly source: VerifiedProductContextSource | null;
  readonly reasonCodes: readonly string[];
}

const SOURCE_PRECEDENCE: Readonly<Record<VerifiedProductContextSource, number>> = {
  CURRENT_TURN: 0,
  STATE: 1,
  PREVIOUS_BOT: 2,
  MESSAGE_CODE: 3,
  MEDIA_OR_AD: 4,
};

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLocaleLowerCase("vi-VN");
}

/** Only explicit product abandonment resets verified fallback context. */
export function productContextResetRequested(value: string): boolean {
  const text = asciiFold(value)
    .trim()
    .replace(/[.!?]+$/gu, "")
    .replace(/\s+/gu, " ");
  return /^(?:bo (?:qua )?(?:mau|san pham|sp) nay|khong xem (?:mau|san pham|sp) nay nua|(?:doi sang|xem) (?:mau|san pham|sp) khac|bat dau lai|reset)(?: nhe| nha| a)?$/u
    .test(text);
}

function validTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isFresh(candidate: VerifiedProductContextCandidate, now: Date): boolean {
  const observedAt = validTimestamp(candidate.observedAt);
  if (observedAt === null || observedAt > now.getTime()) return false;
  if (candidate.expiresAt === null) return true;
  const expiresAt = validTimestamp(candidate.expiresAt);
  return expiresAt !== null && expiresAt > now.getTime();
}

function normalizedDistinctProductIds(
  candidates: readonly VerifiedProductContextCandidate[],
): readonly string[] {
  return [...new Set(candidates.map(({ productId }) =>
    normalizeProductCode(productId)
  ))];
}

/**
 * Resolves only independently verified product context. Invalid model output is
 * intentionally absent from this contract: proposal validity must never decide
 * whether verified context survives.
 */
export function resolveVerifiedProductContext(
  input: VerifiedProductContextInput,
): VerifiedProductContextResolution {
  if (input.conversationOwner !== "BOT") {
    return { productId: null, source: null, reasonCodes: ["CONTEXT_OWNER_HUMAN"] };
  }
  const explicitIds = [...new Set(input.explicitProductIds.map(normalizeProductCode))];
  if (explicitIds.length > 1) {
    return { productId: null, source: null, reasonCodes: ["CONTEXT_EXPLICIT_MULTI_PRODUCT"] };
  }
  if (input.resetRequested && explicitIds.length === 0) {
    return { productId: null, source: null, reasonCodes: ["CONTEXT_RESET_REQUESTED"] };
  }

  const rejected: string[] = [];
  const eligible = input.candidates
    .filter((candidate) => {
      if (!candidate.verified) {
        rejected.push("CONTEXT_CANDIDATE_UNVERIFIED");
        return false;
      }
      if (!isFresh(candidate, input.now)) {
        rejected.push("CONTEXT_CANDIDATE_STALE");
        return false;
      }
      if (
        candidate.source === "STATE" &&
        candidate.stateRevision !== input.expectedStateRevision
      ) {
        rejected.push("CONTEXT_STATE_REVISION_MISMATCH");
        return false;
      }
      if (candidate.fence === null || !Number.isSafeInteger(candidate.fence)) {
        rejected.push("CONTEXT_FENCE_MISSING");
        return false;
      }
      if (candidate.fence < input.minimumFence) {
        rejected.push("CONTEXT_FENCE_STALE");
        return false;
      }
      return true;
    })
    .sort((left, right) => SOURCE_PRECEDENCE[left.source] - SOURCE_PRECEDENCE[right.source]);

  if (explicitIds.length === 1) {
    const explicitId = explicitIds[0]!;
    const explicitMatch = eligible.find((candidate) =>
      normalizeProductCode(candidate.productId) === explicitId
    );
    if (!explicitMatch) {
      return {
        productId: null,
        source: null,
        reasonCodes: ["CONTEXT_EXPLICIT_PRODUCT_NOT_VERIFIED", ...new Set(rejected)],
      };
    }
    return {
      productId: normalizeProductCode(explicitMatch.productId),
      source: explicitMatch.source,
      reasonCodes: ["CONTEXT_EXPLICIT_PRODUCT_VERIFIED"],
    };
  }

  if (input.hasActiveClarification) {
    return { productId: null, source: null, reasonCodes: ["CONTEXT_PRODUCT_AMBIGUOUS"] };
  }

  const activeStateSelectionIds = [...new Set(
    input.activeStateSelectionProductIds.map(normalizeProductCode),
  )];
  const eligibleStateSelectionIds = activeStateSelectionIds.filter((productId) =>
    eligible.some((candidate) =>
      normalizeProductCode(candidate.productId) === productId
    )
  );
  if (eligibleStateSelectionIds.length > 1) {
    return {
      productId: null,
      source: null,
      reasonCodes: ["CONTEXT_PRODUCT_AMBIGUOUS"],
    };
  }

  const highestPriority = eligible[0]
    ? SOURCE_PRECEDENCE[eligible[0].source]
    : null;
  const authoritativeTier = highestPriority === null
    ? []
    : eligible.filter((candidate) =>
        SOURCE_PRECEDENCE[candidate.source] === highestPriority
      );
  const authoritativeIds = normalizedDistinctProductIds(authoritativeTier);
  if (authoritativeIds.length > 1) {
    return {
      productId: null,
      source: null,
      reasonCodes: ["CONTEXT_CANDIDATES_CONFLICT"],
    };
  }

  const selected = authoritativeTier[0];
  if (!selected) {
    return {
      productId: null,
      source: null,
      reasonCodes: ["CONTEXT_NOT_AVAILABLE", ...new Set(rejected)],
    };
  }
  return {
    productId: normalizeProductCode(selected.productId),
    source: selected.source,
    reasonCodes: [`CONTEXT_SELECTED_${selected.source}`],
  };
}
