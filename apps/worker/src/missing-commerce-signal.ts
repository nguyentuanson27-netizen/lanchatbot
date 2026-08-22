import { createHash } from "node:crypto";
import {
  CanonicalBuyingIntentV1Schema,
  ProductBindingV2Schema,
  SalesCycleStageV1Schema,
  canonicalJsonV1,
  deriveConversationPhaseV2,
  type CanonicalBuyingIntentV1,
  type ProductBindingV2,
  type SalesCycleStageV1,
} from "@lana/contracts";

export interface CommerceReadinessCandidate {
  /** Routing identity is fingerprinted locally and never emitted by the signal. */
  readonly scope: {
    readonly pageId: string;
    readonly conversationId: string;
  };
  readonly revision: number;
  /** The PII-safe canonical commerce projection used to prove candidate identity. */
  readonly canonicalContent: {
    /** The exact canonical intent snapshot used to construct this commerce state. */
    readonly buyingIntent: CanonicalBuyingIntentV1;
    readonly stage: SalesCycleStageV1;
    readonly productBinding: ProductBindingV2;
    readonly hasCart: boolean;
    readonly hasOrderPreview: boolean;
    readonly hasPurchaseConfirmation: boolean;
  };
}

type MissingCommerceSignalStatus =
  | "DISABLED"
  | "INVALID_CANONICAL_INTENT"
  | "NOT_COMMITTED"
  | "INVALID_COMMERCE_STATE"
  | "STALE_COMMERCE_STATE"
  | "UNVERIFIABLE_COMMERCE_PRODUCT_BINDING"
  | "COMMERCE_STATE_PRESENT"
  | "MISSING_COMMERCE_STATE";

type FutureCommerceDisposition =
  | "NOT_EVALUATED"
  | "NOT_REQUIRED"
  | "SATISFIED"
  | "BLOCK_COMMERCE_CUTOVER";

type MissingCommerceSignalReason =
  | "CANONICAL_BUYING_INTENT_INVALID"
  | "CANONICAL_INTENT_NOT_COMMITTED"
  | "COMMERCE_STATE_INVALID"
  | "COMMERCE_STATE_INTENT_FINGERPRINT_MISMATCH"
  | "COMMERCE_PRODUCT_BINDING_UNREADY"
  | "COMMITTED_INTENT_PRODUCT_UNAVAILABLE"
  | "COMMERCE_PRODUCT_BINDING_NOT_RESOLVED"
  | "COMMERCE_PRODUCT_BINDING_CARDINALITY_UNPROVABLE"
  | "COMMERCE_PRODUCT_BINDING_MISMATCH"
  | "COMMERCE_STAGE_ARTIFACT_INCOHERENT"
  | "COMMERCE_CART_ABSENT_FOR_COMMITTED_INTENT"
  | "COMMERCE_STATE_PRESENT"
  | "MISSING_COMMERCE_STATE_FOR_COMMITTED_INTENT";

export interface MissingCommerceSignal {
  readonly contractVersion: "MISSING_COMMERCE_SIGNAL_V1";
  readonly status: MissingCommerceSignalStatus;
  /** DF12 observes readiness only; customer-visible authority remains LEGACY. */
  readonly activeAuthority: "LEGACY";
  readonly candidateAuthority: "COMMERCE";
  /** This result cannot send, mutate state, tag, order, or authorize any effect. */
  readonly sideEffects: "DISABLED";
  /** A future cutover must reject unsafe or incomplete readiness evidence. */
  readonly futureCommerceDisposition: FutureCommerceDisposition;
  /** Re-derived from parsed canonical intent, never copied from an input hash. */
  readonly canonicalIntentFingerprint: string | null;
  /** Re-derived from the exact scope, revision, and canonical commerce projection. */
  readonly commerceContentFingerprint: string | null;
  readonly reasonCodes: readonly MissingCommerceSignalReason[];
}

export interface EvaluateMissingCommerceSignalInput {
  /** Defaults to false. Enabling remains side-effect-free and cannot select authority. */
  readonly enabled?: boolean;
  /** Parsed at this deterministic boundary before any readiness decision. */
  readonly buyingIntent: unknown;
  /** `null` is an explicit missing state; any malformed non-null value fails closed. */
  readonly commerce: unknown | null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

function parseCommerceReadinessCandidate(value: unknown): CommerceReadinessCandidate | null {
  const candidate = record(value);
  if (candidate === null || !hasExactKeys(candidate, ["scope", "revision", "canonicalContent"])) {
    return null;
  }
  const scope = record(candidate.scope);
  if (scope === null || !hasExactKeys(scope, ["pageId", "conversationId"]) ||
      !nonEmptyBoundedString(scope.pageId) || !nonEmptyBoundedString(scope.conversationId)) {
    return null;
  }
  if (typeof candidate.revision !== "number" ||
      !Number.isSafeInteger(candidate.revision) || candidate.revision < 0) {
    return null;
  }
  const canonicalContent = record(candidate.canonicalContent);
  if (canonicalContent === null || !hasExactKeys(canonicalContent, [
    "buyingIntent",
    "stage",
    "productBinding",
    "hasCart",
    "hasOrderPreview",
    "hasPurchaseConfirmation",
  ])) {
    return null;
  }
  const stage = SalesCycleStageV1Schema.safeParse(canonicalContent.stage);
  const buyingIntent = CanonicalBuyingIntentV1Schema.safeParse(canonicalContent.buyingIntent);
  const productBinding = ProductBindingV2Schema.safeParse(canonicalContent.productBinding);
  if (!stage.success || !buyingIntent.success || !productBinding.success ||
      typeof canonicalContent.hasCart !== "boolean" ||
      typeof canonicalContent.hasOrderPreview !== "boolean" ||
      typeof canonicalContent.hasPurchaseConfirmation !== "boolean") {
    return null;
  }
  return {
    scope: { pageId: scope.pageId, conversationId: scope.conversationId },
    revision: candidate.revision,
    canonicalContent: {
      buyingIntent: buyingIntent.data,
      stage: stage.data,
      productBinding: productBinding.data,
      hasCart: canonicalContent.hasCart,
      hasOrderPreview: canonicalContent.hasOrderPreview,
      hasPurchaseConfirmation: canonicalContent.hasPurchaseConfirmation,
    },
  };
}

function fingerprint(
  domain: "COMMERCE_READINESS_CANONICAL_INTENT_V1" | "COMMERCE_READINESS_CANDIDATE_V1",
  value: object,
): string {
  return createHash("sha256")
    .update(`${domain}\n${canonicalJsonV1(value)}`, "utf8")
    .digest("hex");
}

function canonicalIntentFingerprint(value: CanonicalBuyingIntentV1): string {
  return fingerprint("COMMERCE_READINESS_CANONICAL_INTENT_V1", value);
}

function commerceCandidateFingerprint(value: CommerceReadinessCandidate): string {
  return fingerprint("COMMERCE_READINESS_CANDIDATE_V1", value);
}

/** Reuse the phase contract so readiness cannot accept an incoherent commerce state. */
function commerceArtifactsAreCoherent(candidate: CommerceReadinessCandidate): boolean {
  try {
    deriveConversationPhaseV2({
      commerceStage: candidate.canonicalContent.stage,
      hasCart: candidate.canonicalContent.hasCart,
      hasPreview: candidate.canonicalContent.hasOrderPreview,
      hasConfirmation: candidate.canonicalContent.hasPurchaseConfirmation,
      salesCycleRevision: candidate.revision,
    });
    return true;
  } catch {
    return false;
  }
}

function signal(
  status: MissingCommerceSignalStatus,
  futureCommerceDisposition: FutureCommerceDisposition,
  reasonCodes: readonly MissingCommerceSignalReason[],
  canonicalIntentFingerprint: string | null,
  commerceContentFingerprint: string | null,
): MissingCommerceSignal {
  return Object.freeze({
    contractVersion: "MISSING_COMMERCE_SIGNAL_V1" as const,
    status,
    activeAuthority: "LEGACY" as const,
    candidateAuthority: "COMMERCE" as const,
    sideEffects: "DISABLED" as const,
    futureCommerceDisposition,
    canonicalIntentFingerprint,
    commerceContentFingerprint,
    reasonCodes: Object.freeze([...reasonCodes]),
  });
}

/**
 * DF12 readiness-only boundary. It consumes validated canonical evidence and
 * records the future fail-closed disposition without changing current
 * authority or authorizing a side effect.
 */
export function evaluateMissingCommerceSignal(
  input: EvaluateMissingCommerceSignalInput,
): MissingCommerceSignal {
  if (input.enabled !== true) {
    return signal("DISABLED", "NOT_EVALUATED", [], null, null);
  }

  const buyingIntent = CanonicalBuyingIntentV1Schema.safeParse(input.buyingIntent);
  if (!buyingIntent.success) {
    return signal(
      "INVALID_CANONICAL_INTENT",
      "BLOCK_COMMERCE_CUTOVER",
      ["CANONICAL_BUYING_INTENT_INVALID"],
      null,
      null,
    );
  }
  const intentFingerprint = canonicalIntentFingerprint(buyingIntent.data);
  if (buyingIntent.data.decision !== "COMMITTED") {
    return signal(
      "NOT_COMMITTED",
      "NOT_REQUIRED",
      ["CANONICAL_INTENT_NOT_COMMITTED"],
      intentFingerprint,
      null,
    );
  }
  if (input.commerce === null) {
    return signal(
      "MISSING_COMMERCE_STATE",
      "BLOCK_COMMERCE_CUTOVER",
      ["MISSING_COMMERCE_STATE_FOR_COMMITTED_INTENT"],
      intentFingerprint,
      null,
    );
  }
  const commerce = parseCommerceReadinessCandidate(input.commerce);
  if (commerce === null) {
    return signal(
      "INVALID_COMMERCE_STATE",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_STATE_INVALID"],
      intentFingerprint,
      null,
    );
  }
  const commerceContentFingerprint = commerceCandidateFingerprint(commerce);
  if (canonicalIntentFingerprint(commerce.canonicalContent.buyingIntent) !== intentFingerprint) {
    return signal(
      "STALE_COMMERCE_STATE",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_STATE_INTENT_FINGERPRINT_MISMATCH"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  if (!commerceArtifactsAreCoherent(commerce)) {
    return signal(
      "INVALID_COMMERCE_STATE",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_STAGE_ARTIFACT_INCOHERENT"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  if (!commerce.canonicalContent.hasCart) {
    return signal(
      "MISSING_COMMERCE_STATE",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_CART_ABSENT_FOR_COMMITTED_INTENT"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  if (buyingIntent.data.productId === null) {
    return signal(
      "UNVERIFIABLE_COMMERCE_PRODUCT_BINDING",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMITTED_INTENT_PRODUCT_UNAVAILABLE"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  if (commerce.canonicalContent.productBinding.status === "STALE" ||
      commerce.canonicalContent.productBinding.status === "UNRESOLVED" ||
      commerce.canonicalContent.productBinding.status === "AMBIGUOUS") {
    return signal(
      "STALE_COMMERCE_STATE",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_PRODUCT_BINDING_UNREADY"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  if (commerce.canonicalContent.productBinding.status !== "RESOLVED") {
    return signal(
      "UNVERIFIABLE_COMMERCE_PRODUCT_BINDING",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_PRODUCT_BINDING_NOT_RESOLVED"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  const boundProductIds = commerce.canonicalContent.productBinding.productIds;
  if (boundProductIds.length !== 1) {
    return signal(
      "UNVERIFIABLE_COMMERCE_PRODUCT_BINDING",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_PRODUCT_BINDING_CARDINALITY_UNPROVABLE"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  if (boundProductIds[0] !== buyingIntent.data.productId) {
    return signal(
      "UNVERIFIABLE_COMMERCE_PRODUCT_BINDING",
      "BLOCK_COMMERCE_CUTOVER",
      ["COMMERCE_PRODUCT_BINDING_MISMATCH"],
      intentFingerprint,
      commerceContentFingerprint,
    );
  }
  return signal(
    "COMMERCE_STATE_PRESENT",
    "SATISFIED",
    ["COMMERCE_STATE_PRESENT"],
    intentFingerprint,
    commerceContentFingerprint,
  );
}
