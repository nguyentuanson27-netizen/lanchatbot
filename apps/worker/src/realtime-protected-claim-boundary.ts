import {
  ProtectedClaimV1Schema,
  type ProtectedClaimV1,
} from "@lana/contracts";

export type RealtimeProtectedClaimReasonCode =
  | `PROTECTED_CLAIM_DUPLICATE:${string}`
  | `PROTECTED_CLAIM_EVIDENCE_MISSING:${string}`
  | `PROTECTED_CLAIM_SCHEMA_INVALID:${string}`
  | `PROTECTED_CLAIM_STALE:${string}`
  | `PROTECTED_CLAIM_FUTURE:${string}`
  | `PROTECTED_CLAIM_PRODUCT_SCOPE_MISMATCH:${string}`
  | `PROTECTED_CLAIM_VARIANT_SCOPE_MISMATCH:${string}`
  | `PROTECTED_CLAIM_CART_SCOPE_MISMATCH:${string}`
  | `PROTECTED_CLAIM_UNDECLARED:${ProtectedClaimV1["type"]}`
  | `PROTECTED_CLAIM_EVIDENCE_UNAVAILABLE:${ProtectedClaimV1["type"]}`;

export interface RealtimeProtectedClaimAuthorizationInput {
  readonly declaredClaimIds: readonly string[];
  readonly observedClaimTypes: readonly ProtectedClaimV1["type"][];
  readonly availableClaims: readonly unknown[];
  readonly expectedProductIds: readonly string[];
  readonly expectedProductScopes?: readonly Readonly<{
    productId: string;
    variantId: string | null;
  }>[];
  readonly expectedCart?: Readonly<{
    cartId: string;
    cartVersion: number;
  }> | null;
  readonly now: Date;
}

export interface RealtimeProtectedClaimAuthorizationResult {
  readonly outcome: "AUTHORIZED" | "BLOCKED";
  readonly claims: readonly ProtectedClaimV1[];
  readonly reasonCodes: readonly RealtimeProtectedClaimReasonCode[];
}

function candidateClaimId(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "claimId" in value &&
    typeof value.claimId === "string"
  ) return value.claimId;
  return "UNKNOWN";
}

function claimReason(
  claim: ProtectedClaimV1,
  input: RealtimeProtectedClaimAuthorizationInput,
): RealtimeProtectedClaimReasonCode | null {
  const observedAt = Date.parse(claim.provenance.observedAt);
  const expiresAt = Date.parse(claim.provenance.expiresAt);
  if (observedAt > input.now.getTime()) {
    return `PROTECTED_CLAIM_FUTURE:${claim.claimId}`;
  }
  if (expiresAt <= input.now.getTime()) {
    return `PROTECTED_CLAIM_STALE:${claim.claimId}`;
  }
  if (claim.scope.kind === "PRODUCT") {
    const productScope = claim.scope;
    if (!input.expectedProductIds.includes(productScope.productId)) {
      return `PROTECTED_CLAIM_PRODUCT_SCOPE_MISMATCH:${claim.claimId}`;
    }
    const expectedScope = input.expectedProductScopes?.find(({ productId }) =>
      productId === productScope.productId
    );
    if (expectedScope && productScope.variantId !== expectedScope.variantId) {
      return `PROTECTED_CLAIM_VARIANT_SCOPE_MISMATCH:${claim.claimId}`;
    }
    return null;
  }
  const expectedCart = input.expectedCart ?? null;
  if (
    claim.scope.kind === "CART" &&
    (expectedCart === null ||
      claim.scope.cartId !== expectedCart.cartId ||
      claim.scope.cartVersion !== expectedCart.cartVersion)
  ) return `PROTECTED_CLAIM_CART_SCOPE_MISMATCH:${claim.claimId}`;
  return null;
}

/**
 * Authorizes exact protected-claim references against typed, current runtime
 * evidence. The result never grants side-effect authority: every accepted
 * claim still carries the contract literal `authorization: "NONE"`.
 */
export function authorizeRealtimeProtectedClaimProposal(
  input: RealtimeProtectedClaimAuthorizationInput,
): RealtimeProtectedClaimAuthorizationResult {
  const reasons = new Set<RealtimeProtectedClaimReasonCode>();
  const validClaimsById = new Map<string, ProtectedClaimV1>();
  const invalidClaimIds = new Set<string>();
  for (const candidate of input.availableClaims) {
    const parsed = ProtectedClaimV1Schema.safeParse(candidate);
    if (!parsed.success) {
      invalidClaimIds.add(candidateClaimId(candidate));
      continue;
    }
    validClaimsById.set(parsed.data.claimId, parsed.data);
  }

  const declared = new Set<string>();
  const declaredTypes = new Set<ProtectedClaimV1["type"]>();
  const authorized: ProtectedClaimV1[] = [];
  for (const claimId of input.declaredClaimIds) {
    if (declared.has(claimId)) {
      reasons.add(`PROTECTED_CLAIM_DUPLICATE:${claimId}`);
      continue;
    }
    declared.add(claimId);
    if (invalidClaimIds.has(claimId)) {
      reasons.add(`PROTECTED_CLAIM_SCHEMA_INVALID:${claimId}`);
      continue;
    }
    const claim = validClaimsById.get(claimId);
    if (!claim) {
      reasons.add(`PROTECTED_CLAIM_EVIDENCE_MISSING:${claimId}`);
      continue;
    }
    declaredTypes.add(claim.type);
    const rejection = claimReason(claim, input);
    if (rejection) {
      reasons.add(rejection);
      continue;
    }
    authorized.push(claim);
  }

  for (const type of new Set(input.observedClaimTypes)) {
    if (!declaredTypes.has(type)) {
      reasons.add(`PROTECTED_CLAIM_UNDECLARED:${type}`);
    }
  }

  if (reasons.size > 0) {
    return {
      outcome: "BLOCKED",
      claims: [],
      reasonCodes: [...reasons].sort(),
    };
  }
  return {
    outcome: "AUTHORIZED",
    claims: authorized.sort((left, right) => left.claimId.localeCompare(right.claimId)),
    reasonCodes: [],
  };
}

export interface BindRealtimeProtectedClaimProposalInput {
  readonly requestedClaimTypes: readonly ProtectedClaimV1["type"][];
  readonly modelDeclaredClaimIds: readonly string[];
  readonly deterministicClaimTypes: readonly ProtectedClaimV1["type"][];
  readonly availableClaims: readonly unknown[];
  readonly expectedProductIds: readonly string[];
  readonly expectedProductScopes?: RealtimeProtectedClaimAuthorizationInput["expectedProductScopes"];
  readonly expectedCart?: RealtimeProtectedClaimAuthorizationInput["expectedCart"];
  readonly now: Date;
}

/**
 * Binds the model's existing structured fact request and explicitly classified
 * deterministic producers to exact evidence IDs. Reply prose is deliberately
 * absent from this API, so facts cannot be inferred from text or regexes.
 */
export function bindRealtimeProtectedClaimProposal(
  input: BindRealtimeProtectedClaimProposalInput,
): Readonly<{
  claimIds: readonly string[];
  reasonCodes: readonly RealtimeProtectedClaimReasonCode[];
}> {
  const requestedTypes = [...new Set([
    ...input.requestedClaimTypes,
    ...input.deterministicClaimTypes,
  ])];
  const parsedClaims = input.availableClaims.flatMap((candidate) => {
    const parsed = ProtectedClaimV1Schema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
  const boundIds = new Set(input.modelDeclaredClaimIds);
  const reasons = new Set<RealtimeProtectedClaimReasonCode>();
  for (const type of requestedTypes) {
    const candidates = parsedClaims.filter((claim) => claim.type === type);
    if (candidates.length === 0) {
      reasons.add(`PROTECTED_CLAIM_EVIDENCE_UNAVAILABLE:${type}`);
      continue;
    }
    for (const claim of candidates) boundIds.add(claim.claimId);
  }
  if (reasons.size > 0) {
    return { claimIds: [], reasonCodes: [...reasons].sort() };
  }
  const authorization = authorizeRealtimeProtectedClaimProposal({
    declaredClaimIds: [...boundIds],
    observedClaimTypes: requestedTypes,
    availableClaims: input.availableClaims,
    expectedProductIds: input.expectedProductIds,
    ...(input.expectedProductScopes === undefined
      ? {}
      : { expectedProductScopes: input.expectedProductScopes }),
    ...(input.expectedCart === undefined ? {} : { expectedCart: input.expectedCart }),
    now: input.now,
  });
  return authorization.outcome === "AUTHORIZED"
    ? { claimIds: authorization.claims.map(({ claimId }) => claimId), reasonCodes: [] }
    : { claimIds: [], reasonCodes: authorization.reasonCodes };
}
