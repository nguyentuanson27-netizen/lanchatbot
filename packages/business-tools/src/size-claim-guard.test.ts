import { describe, expect, it } from "vitest";
import {
  AgentProposalV1Schema,
  SizeRecommendationProtectedClaimV1Schema,
  type SizeRecommendationProtectedClaimV1,
} from "@lana/contracts";
import {
  detectConcreteSizeRecommendations,
  guardAgentProposal,
} from "./guard.js";

const now = new Date("2026-08-04T00:00:00.000Z");
const profileId = "11111111-1111-4111-8111-111111111111";
const claimId = "22222222-2222-4222-8222-222222222222";

function proposal(reply: string, protectedClaimIds: readonly string[] = []) {
  return AgentProposalV1Schema.parse({
    schemaVersion: 1,
    intent: "size_consulting",
    conversationStage: "FIT_CONSULTING",
    productId: "SD398",
    action: "REPLY",
    reply,
    attachments: [],
    handoffReason: null,
    protectedClaimIds,
    businessFactQuery: {
      intent: "SIZE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  });
}

function verifiedClaim(
  overrides: Partial<SizeRecommendationProtectedClaimV1> = {},
): SizeRecommendationProtectedClaimV1 {
  return SizeRecommendationProtectedClaimV1Schema.parse({
    id: claimId,
    type: "SIZE_RECOMMENDATION",
    value: { recommendedSizes: ["L"], alternativeSizes: ["M"] },
    productId: "SD398",
    variantId: null,
    evidenceRef: "size-engine:v1:22222222-2222-4222-8222-222222222222:chart-398",
    source: "VERIFIED_SIZE_ENGINE_V1",
    observedAt: "2026-08-04T00:00:00.000Z",
    expiresAt: "2026-08-04T00:05:00.000Z",
    customerProfileId: profileId,
    customerProfileRevision: 7,
    measurementFingerprint: "a".repeat(64),
    ...overrides,
  });
}

function guard(reply: string, claim: SizeRecommendationProtectedClaimV1 | null, overrides: {
  activeProductId?: string | null;
  activeVariantId?: string | null;
  customerProfileId?: string | null;
  customerProfileRevision?: number | null;
  declared?: boolean;
} = {}) {
  return guardAgentProposal({
    proposal: proposal(reply, claim && overrides.declared !== false ? [claim.id] : []),
    facts: null,
    verifiedProductIds: new Set(["SD398"]),
    sizeClaimContext: {
      activeProductId: overrides.activeProductId ?? "SD398",
      activeVariantId: overrides.activeVariantId ?? null,
      customerProfileId: overrides.customerProfileId ?? profileId,
      customerProfileRevision: overrides.customerProfileRevision ?? 7,
      claims: claim ? [claim] : [],
    },
    now,
  });
}

describe("BF-04 size recommendation detector", () => {
  it("catches semantic paraphrases, Vietnamese diacritics, ASCII fold and ranges", () => {
    expect(detectConcreteSizeRecommendations("Theo số đo, chị hợp size L.")).toEqual(["L"]);
    expect(detectConcreteSizeRecommendations("Chi hop kich co M-den L.")).toEqual(["L", "M"]);
    expect(detectConcreteSizeRecommendations("Em tư vấn chị mặc size M nhé.")).toEqual(["M"]);
  });

  it("does not treat negatives, questions, stock messages or catalog lists as fit assertions", () => {
    expect(detectConcreteSizeRecommendations("Em chưa thể tư vấn size L khi thiếu số đo.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Chị muốn chọn size L hay M ạ?")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Mẫu còn size L ở kho.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Size: S/M/L.")).toEqual([]);
  });
});

describe("BF-04 verified size claims", () => {
  it("blocks SD398: size L cannot emit without a declared Size Engine claim", () => {
    const result = guard("Theo số đo, chị hợp size L.", null);
    expect(result).toMatchObject({
      action: "HANDOFF",
      textUnits: [],
      blockedReasonCodes: ["SIZE_RECOMMENDATION_UNDECLARED"],
    });
  });

  it("allows a fresh, scoped Size Engine recommendation with matching value", () => {
    const result = guard("Theo số đo, chị hợp size L; mặc thoải mái có thể cân nhắc size M.", verifiedClaim());
    expect(result).toMatchObject({
      action: "REPLY",
      textUnits: ["Theo số đo, chị hợp size L; mặc thoải mái có thể cân nhắc size M."],
      blockedReasonCodes: [],
    });
  });

  it("fails closed for wrong product, variant, measurements, expiry and values", () => {
    expect(guard("Chị hợp size L.", verifiedClaim({ productId: "OTHER" })))
      .toMatchObject({ blockedReasonCodes: ["SIZE_RECOMMENDATION_PRODUCT_SCOPE_MISMATCH"] });
    expect(guard("Chị hợp size L.", verifiedClaim({ variantId: "variant-L" })))
      .toMatchObject({ blockedReasonCodes: ["SIZE_RECOMMENDATION_VARIANT_SCOPE_MISMATCH"] });
    expect(guard("Chị hợp size L.", verifiedClaim(), { customerProfileRevision: 8 }))
      .toMatchObject({ blockedReasonCodes: ["SIZE_RECOMMENDATION_MEASUREMENT_SCOPE_MISMATCH"] });
    expect(guard("Chị hợp size L.", verifiedClaim({ observedAt: "2026-08-03T23:00:00.000Z", expiresAt: "2026-08-03T23:59:59.000Z" })))
      .toMatchObject({ blockedReasonCodes: ["SIZE_RECOMMENDATION_STALE"] });
    expect(guard("Chị hợp size XL.", verifiedClaim()))
      .toMatchObject({ blockedReasonCodes: ["SIZE_RECOMMENDATION_VALUE_MISMATCH"] });
  });

  it("does not require a fit claim for a catalog list", () => {
    const result = guard("Size: S/M/L.", null);
    expect(result).toMatchObject({ action: "REPLY", blockedReasonCodes: [] });
  });
});
