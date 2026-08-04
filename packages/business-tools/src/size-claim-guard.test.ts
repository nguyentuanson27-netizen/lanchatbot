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
    evidenceRef: `size-engine:v1:22222222-2222-4222-8222-222222222222:chart-398:measurements:${"a".repeat(64)}`,
    source: "VERIFIED_SIZE_ENGINE_V1",
    observedAt: "2026-08-04T00:00:00.000Z",
    expiresAt: "2026-08-04T00:05:00.000Z",
    customerProfileId: profileId,
    customerProfileRevision: 7,
    measurementFingerprint: "a".repeat(64),
    evidenceBasis: {
      kind: "CURRENT_MEASUREMENTS",
      measurementFingerprint: "a".repeat(64),
      sourceEventHashes: ["b".repeat(64)],
    },
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

  it("keeps detecting a recommendation when another clause is a catalog, negative, question, or stock statement", () => {
    expect(detectConcreteSizeRecommendations("Size c\u00f3 S/M/L, ch\u1ecb h\u1ee3p size L.")).toEqual(["L"]);
    expect(detectConcreteSizeRecommendations("Em ch\u01b0a th\u1ec3 t\u01b0 v\u1ea5n size M, nh\u01b0ng ch\u1ecb h\u1ee3p size L.")).toEqual(["L"]);
    expect(detectConcreteSizeRecommendations("Ch\u1ecb h\u1ee3p size L, \u0111\u00fang kh\u00f4ng?")).toEqual(["L"]);
    expect(detectConcreteSizeRecommendations("Ch\u1ecb h\u1ee3p size L \u0111\u00fang kh\u00f4ng?")).toEqual(["L"]);
    expect(detectConcreteSizeRecommendations("M\u1eabu c\u00f2n size M, theo s\u1ed1 \u0111o ch\u1ecb h\u1ee3p size L.")).toEqual(["L"]);
    expect(detectConcreteSizeRecommendations("Em \u0111\u1ec1 xu\u1ea5t L.")).toEqual(["L"]);
    expect(detectConcreteSizeRecommendations("Size ph\u00f9 h\u1ee3p nh\u1ea5t l\u00e0 L.")).toEqual(["L"]);
  });
  it.each([
    ["Size c\u00f3 S/M/L v\u00e0 ch\u1ecb h\u1ee3p size L.", ["L"]],
    ["Size co S/M/L va chi hop size L", ["L"]],
    ["Ch\u1ecb h\u1ee3p size L v\u00e0 size c\u00f3 S/M/L.", ["L"]],
    ["M\u1eabu c\u00f2n size M v\u00e0 ch\u1ecb h\u1ee3p size L.", ["L"]],
    ["Chi hop size L ma mau con size M", ["L"]],
    ["Em ch\u01b0a th\u1ec3 t\u01b0 v\u1ea5n size M m\u00e0 ch\u1ecb h\u1ee3p size L.", ["L"]],
    ["Em chua the tu van size M ma chi hop size L", ["L"]],
    ["Ch\u1ecb h\u1ee3p size L; m\u1eabu c\u00f2n size M.", ["L"]],
    ["Size c\u00f3 S/M/L v\u1edbi s\u1ed1 \u0111o ch\u1ecb h\u1ee3p size L.", ["L"]],
    ["Em ch\u01b0a th\u1ec3 t\u01b0 v\u1ea5n size M d\u00f9 ch\u1ecb h\u1ee3p size L.", ["L"]],
    ["M\u1eabu c\u00f2n size M trong khi ch\u1ecb h\u1ee3p size L", ["L"]],
    ["Ch\u1ecb h\u1ee3p size L c\u00f2n m\u1eabu c\u00f3 S/M/L", ["L"]],
    ["Size co S/M/L song theo so do chi hop size M-L", ["L", "M"]],
    ["Kh\u00f4ng th\u1ec3 t\u01b0 v\u1ea5n size S. Ch\u1ecb h\u1ee3p size M", ["M"]],
    ["Size L c\u00f3 ph\u00f9 h\u1ee3p kh\u00f4ng trong khi theo s\u1ed1 \u0111o ch\u1ecb h\u1ee3p size M", ["M"]],
    ["Ch\u1ecb c\u00f3 h\u1ee3p size L kh\u00f4ng song em \u0111\u1ec1 xu\u1ea5t size M", ["M"]],
  ])("isolates conjunction and punctuation micro-clauses: %s", (reply, expected) => {
    expect(detectConcreteSizeRecommendations(reply)).toEqual(expected);
  });
  it("does not treat negatives, questions, stock messages or catalog lists as fit assertions", () => {
    expect(detectConcreteSizeRecommendations("Em chưa thể tư vấn size L khi thiếu số đo.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Chị muốn chọn size L hay M ạ?")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Mẫu còn size L ở kho.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Size: S/M/L.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Size dang co: M, L.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Size: M, L.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Size L c\u00f3 ph\u00f9 h\u1ee3p kh\u00f4ng?")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Size M co hop voi chi khong?")).toEqual([]);
    expect(detectConcreteSizeRecommendations("M\u1eabu c\u00f2n size M v\u00e0 size L kh\u00f4ng?")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Size c\u00f3 S/M/L v\u00e0 em ch\u01b0a th\u1ec3 t\u01b0 v\u1ea5n size L.")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Ch\u1ecb c\u00f3 h\u1ee3p size L kh\u00f4ng?")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Ch\u1ecb c\u00f3 h\u1ee3p size L kh\u00f4ng")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Ch\u1ecb m\u1eb7c size M c\u00f3 v\u1eeba kh\u00f4ng?")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Chi mac size M co vua khong")).toEqual([]);
    expect(detectConcreteSizeRecommendations("Ch\u1ecb kh\u00f4ng h\u1ee3p size L.")).toEqual([]);
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
    expect(guard("Chị hợp size L.", verifiedClaim(), { activeVariantId: "variant-L" }))
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
