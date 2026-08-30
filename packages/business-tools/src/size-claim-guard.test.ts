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
  structuredRejectOnly?: boolean;
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
    ...(overrides.structuredRejectOnly
      ? { sizeClaimTextMode: "STRUCTURED_REJECT_ONLY" as const }
      : {}),
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
  it.each([
    ["Theo s\u1ed1 \u0111o, L s\u1ebd v\u1eeba v\u1edbi ch\u1ecb nh\u1ea5t.", ["L"]],
    ["Theo so do, L se vua voi chi nhat.", ["L"]],
    ["Ch\u1ecb h\u1ee3p (size L), \u0111\u00fang kh\u00f4ng?", ["L"]],
    ["Chi hop (size L), dung khong?", ["L"]],
    ["D\u00e1ng ch\u1ecb th\u00ec L l\u00e0 ph\u00f9 h\u1ee3p nh\u1ea5t.", ["L"]],
    ["Dang chi thi L la phu hop nhat.", ["L"]],
    ["Size L c\u00f3 h\u1ee3p ch\u1ecb kh\u00f4ng nh\u01b0ng theo s\u1ed1 \u0111o ch\u1ecb h\u1ee3p size M.", ["M"]],
    ["Size L co hop chi khong nhung theo so do chi hop size M.", ["M"]],
    ["Theo ch\u1ecb size L h\u1ee3p h\u01a1n hay size M?", []],
    ["Theo chi size L hop hon hay size M?", []],
    ["Em kh\u00f4ng ngh\u0129 ch\u1ecb h\u1ee3p size L.", []],
    ["Em khong nghi chi hop size L.", []],
    ["Ch\u1ecb ch\u01b0a ch\u1eafc h\u1ee3p size L.", []],
    ["Chi chua chac hop size L.", []],
    ["Kh\u00f4ng ph\u1ea3i ch\u1ecb h\u1ee3p size L \u0111\u00e2u.", []],
    ["Khong phai chi hop size L dau.", []],
  ])("classifies each required Unicode/ASCII mention: %s", (reply, expected) => {
    expect(detectConcreteSizeRecommendations(reply)).toEqual(expected);
  });

  it.each([
    ["Ch\u1ecb h\u1ee3p (size L).", ["L"]],
    ["(L) s\u1ebd v\u1eeba v\u1edbi ch\u1ecb nh\u1ea5t.", ["L"]],
    ["Size L ph\u00f9 h\u1ee3p nh\u1ea5t v\u1edbi ch\u1ecb.", ["L"]],
    ["Em \u0111\u1ec1 xu\u1ea5t - L.", ["L"]],
    ["Theo s\u1ed1 \u0111o, ch\u1ecb n\u00ean ch\u1ecdn M-L.", ["L", "M"]],
    ["Size c\u00f3 S/M/L\nTheo s\u1ed1 \u0111o ch\u1ecb h\u1ee3p size M.", ["M"]],
    ["M\u1eabu c\u00f2n size S song ch\u1ecb h\u1ee3p size L.", ["L"]],
    ["Ch\u1ecb h\u1ee3p size L b\u1edfi v\u00ec s\u1ed1 \u0111o ph\u00f9 h\u1ee3p.", ["L"]],
    ["D\u00f9 m\u1eabu c\u00f2n size S, size L ph\u00f9 h\u1ee3p nh\u1ea5t v\u1edbi ch\u1ecb.", ["L"]],
    ["Size L ph\u00f9 h\u1ee3p nh\u1ea5t v\u1edbi ch\u1ecb - \u0111\u00fang kh\u00f4ng?", ["L"]],
    ["Size ph\u00f9 h\u1ee3p: S/M/L.", []],
    ["M\u1eabu size M v\u1eeba v\u1ec1.", []],
    ["M\u1eabu size M v\u1eeba m\u1edbi v\u1ec1.", []],
    ["Size L kh\u00f4ng ph\u00f9 h\u1ee3p v\u1edbi ch\u1ecb.", []],
    ["Size L ph\u00f9 h\u1ee3p v\u1edbi ch\u1ecb?", []],
    ["Ch\u1ecb c\u00f3 h\u1ee3p size L kh\u00f4ng", []],
    ["Ch\u1ecb m\u1eb7c size M c\u00f3 v\u1eeba kh\u00f4ng?", []],
    ["Em ch\u01b0a th\u1ec3 t\u01b0 v\u1ea5n size L.", []],
  ])("keeps mention-scoped behavior under metamorphic composition: %s", (reply, expected) => {
    expect(detectConcreteSizeRecommendations(reply)).toEqual(expected);
  });

  it.each([
    ["Theo s\u1ed1 \u0111o, ch\u1ecb thu\u1ed9c size L.", ["L"]],
    ["Theo so do, chi thuoc size L.", ["L"]],
    ["S\u1ed1 \u0111o n\u00e0y t\u01b0\u01a1ng \u1ee9ng size L.", ["L"]],
    ["So do nay tuong ung size L.", ["L"]],
    ["Theo s\u1ed1 \u0111o, form n\u00e0y size L l\u00e0 chu\u1ea9n nh\u1ea5t cho ch\u1ecb.", ["L"]],
    ["Theo so do, form nay size L la chuan nhat cho chi.", ["L"]],
    ["Theo s\u1ed1 \u0111o, em x\u1ebfp ch\u1ecb v\u00e0o size L.", ["L"]],
    ["Theo so do, em xep chi vao size L.", ["L"]],
    ["Theo s\u1ed1 \u0111o ch\u1ecb r\u01a1i v\u00e0o L.", ["L"]],
    ["S\u1ed1 \u0111o n\u00e0y \u0111\u00fang c\u1ee1 L.", ["L"]],
    ["L\u1ea5y L l\u00e0 v\u1eeba.", ["L"]],
    ["L chu\u1ea9n form ch\u1ecb.", ["L"]],
    ["C\u1ee1 L d\u00e0nh cho s\u1ed1 \u0111o n\u00e0y.", ["L"]],
    ["Theo s\u1ed1 \u0111o, ch\u1ecb thu\u1ed9c c\u1ee1 M-L.", ["L", "M"]],
    ["Theo so do, chi thuoc co M-L.", ["L", "M"]],
    ["Theo s\u1ed1 \u0111o, ch\u1ecb thu\u1ed9c size 40.", ["40"]],
  ])("fails closed for unclassified size assertions: %s", (reply, expected) => {
    expect(detectConcreteSizeRecommendations(reply)).toEqual(expected);
  });

  it.each([
    ["Ng\u01b0\u1eddi m\u1eabu m\u1eb7c size S.", []],
    ["Nguoi mau mac size S.", []],
    ["Mannequin size M.", []],
    ["M\u1eabu A c\u00f3 size L.", []],
    ["Mau A co size L.", []],
    ["Size L h\u1ee3p l\u1ec7 trong catalog.", []],
    ["Size L hop le trong catalog.", []],
    ["Chu\u1ea9n h\u00f3a size code L trong catalog.", []],
    ["Size: S/M/L.", []],
    ["S\u1ed1 \u0111o v\u00f2ng eo 40 cm.", []],
    [
      "M\u1eabu A size L h\u1ee3p l\u1ec7, theo s\u1ed1 \u0111o ch\u1ecb n\u00ean ch\u1ecdn size M.",
      ["M"],
    ],
    [
      "Size L ph\u00f9 h\u1ee3p v\u1edbi m\u1eabu A, theo s\u1ed1 \u0111o ch\u1ecb h\u1ee3p size M.",
      ["M"],
    ],
    [
      "Ng\u01b0\u1eddi m\u1eabu m\u1eb7c size S; theo s\u1ed1 \u0111o ch\u1ecb thu\u1ed9c size L.",
      ["L"],
    ],
    [
      "M\u1eabu A c\u00f3 size L\nTheo s\u1ed1 \u0111o ch\u1ecb r\u01a1i v\u00e0o size M.",
      ["M"],
    ],
    [
      "Theo s\u1ed1 \u0111o ch\u1ecb r\u01a1i v\u00e0o size M - size L ph\u00f9 h\u1ee3p v\u1edbi m\u1eabu A.",
      ["M"],
    ],
  ])("exempts only proven safe mention spans: %s", (reply, expected) => {
    expect(detectConcreteSizeRecommendations(reply)).toEqual(expected);
  });

  it("keeps safe and unsafe mentions isolated across arbitrary composition", () => {
    const safeFragments = [
      "M\u1eabu A c\u00f3 size S",
      "Ng\u01b0\u1eddi m\u1eabu m\u1eb7c size S",
      "Size: S",
      "M\u1eabu size S v\u1eeba m\u1edbi v\u1ec1",
      "Em ch\u01b0a th\u1ec3 t\u01b0 v\u1ea5n size S",
      "Size S c\u00f3 ph\u00f9 h\u1ee3p kh\u00f4ng",
    ];
    const unsafeFragments = [
      "theo s\u1ed1 \u0111o ch\u1ecb thu\u1ed9c size M",
      "s\u1ed1 \u0111o n\u00e0y t\u01b0\u01a1ng \u1ee9ng size M",
      "em x\u1ebfp ch\u1ecb v\u00e0o size M",
    ];
    const separators = [", ", "; ", " - ", "\n", " trong khi ", " song ", " / "];
    for (const safe of safeFragments) {
      for (const unsafe of unsafeFragments) {
        for (const separator of separators) {
          expect(
            detectConcreteSizeRecommendations(`${safe}${separator}${unsafe}`),
            `safe-first: ${safe}${separator}${unsafe}`,
          ).toEqual(["M"]);
          expect(
            detectConcreteSizeRecommendations(`${unsafe}${separator}${safe}`),
            `unsafe-first: ${unsafe}${separator}${safe}`,
          ).toEqual(["M"]);
        }
      }
    }
  });
  it("fails closed and emits the bounded reason for the new assertion families", () => {
    for (const reply of [
      "Theo s\u1ed1 \u0111o, ch\u1ecb thu\u1ed9c size L.",
      "S\u1ed1 \u0111o n\u00e0y t\u01b0\u01a1ng \u1ee9ng size L.",
      "Theo s\u1ed1 \u0111o, form n\u00e0y size L l\u00e0 chu\u1ea9n nh\u1ea5t cho ch\u1ecb.",
      "Theo s\u1ed1 \u0111o, em x\u1ebfp ch\u1ecb v\u00e0o size L.",
      "Theo s\u1ed1 \u0111o ch\u1ecb r\u01a1i v\u00e0o L.",
    ]) {
      expect(guard(reply, null)).toMatchObject({
        action: "HANDOFF",
        blockedReasonCodes: ["SIZE_RECOMMENDATION_UNDECLARED"],
      });
    }
    for (const reply of [
      "Ng\u01b0\u1eddi m\u1eabu m\u1eb7c size S.",
      "Mannequin size M.",
      "M\u1eabu A c\u00f3 size L.",
      "Size L h\u1ee3p l\u1ec7 trong catalog.",
    ]) {
      expect(guard(reply, null)).toMatchObject({
        action: "REPLY",
        blockedReasonCodes: [],
      });
    }
  });
  it("drives the final guard only for undeclared affirmative assertions", () => {
    for (const reply of [
      "Theo s\u1ed1 \u0111o, L s\u1ebd v\u1eeba v\u1edbi ch\u1ecb nh\u1ea5t.",
      "Ch\u1ecb h\u1ee3p (size L), \u0111\u00fang kh\u00f4ng?",
      "D\u00e1ng ch\u1ecb th\u00ec L l\u00e0 ph\u00f9 h\u1ee3p nh\u1ea5t.",
    ]) {
      expect(guard(reply, null)).toMatchObject({
        action: "HANDOFF",
        blockedReasonCodes: ["SIZE_RECOMMENDATION_UNDECLARED"],
      });
    }
    for (const reply of [
      "Theo ch\u1ecb size L h\u1ee3p h\u01a1n hay size M?",
      "Em kh\u00f4ng ngh\u0129 ch\u1ecb h\u1ee3p size L.",
      "Ch\u1ecb ch\u01b0a ch\u1eafc h\u1ee3p size L.",
      "Kh\u00f4ng ph\u1ea3i ch\u1ecb h\u1ee3p size L \u0111\u00e2u.",
    ]) {
      expect(guard(reply, null)).toMatchObject({ action: "REPLY", blockedReasonCodes: [] });
    }
  });

});

describe("BF-04 verified size claims", () => {
  it.each([
    "Chị có hợp size L không?",
    "Mẫu còn size L ở kho.",
    "Size: S/M/L.",
    "Người mẫu mặc size S.",
    "Em chưa thể tư vấn size L khi thiếu số đo.",
  ])("uses every size token only as a reject-only signal on a migrated size turn: %s", (reply) => {
    const result = guard(reply, null, { structuredRejectOnly: true });
    expect(result).toMatchObject({ action: "HANDOFF", textUnits: [] });
    expect(result.blockedReasonCodes).toContain("SIZE_RECOMMENDATION_UNDECLARED");
    expect(result.protectedClaimValidation?.claimTypes).toContain("SIZE_FIT");
  });

  it("requires exact verified values even in question or catalog phrasing on a migrated size turn", () => {
    expect(guard("Chị có hợp size XL không?", verifiedClaim(), {
      structuredRejectOnly: true,
    })).toMatchObject({
      action: "HANDOFF",
      blockedReasonCodes: ["SIZE_RECOMMENDATION_VALUE_MISMATCH"],
    });
    expect(guard("Size: M/L.", verifiedClaim(), {
      structuredRejectOnly: true,
    })).toMatchObject({ action: "REPLY", blockedReasonCodes: [] });
  });

  it("does not let a question mark erase an affirmative measurement basis", () => {
    expect(detectConcreteSizeRecommendations("Theo số đo chị size L?")).toEqual(["L"]);
    expect(guard("Theo số đo chị size L?", null)).toMatchObject({
      action: "HANDOFF",
      blockedReasonCodes: ["SIZE_RECOMMENDATION_UNDECLARED"],
    });
  });

  it("blocks SD398: size L cannot emit without a declared Size Engine claim", () => {
    const result = guard("Theo số đo, chị hợp size L.", null);
    expect(result).toMatchObject({
      action: "HANDOFF",
      textUnits: [],
      blockedReasonCodes: ["SIZE_RECOMMENDATION_UNDECLARED"],
      protectedClaimValidation: {
        outcome: "BLOCKED",
        claimTypes: ["SIZE_FIT"],
        validatedCount: 0,
        rejectedCount: 1,
      },
    });
  });

  it("allows a fresh, scoped Size Engine recommendation with matching value", () => {
    const result = guard("Theo số đo, chị hợp size L; mặc thoải mái có thể cân nhắc size M.", verifiedClaim());
    expect(result).toMatchObject({
      action: "REPLY",
      textUnits: ["Theo số đo, chị hợp size L; mặc thoải mái có thể cân nhắc size M."],
      blockedReasonCodes: [],
      protectedClaimValidation: {
        outcome: "VALIDATED",
        claimTypes: ["SIZE_FIT"],
        validatedCount: 1,
        rejectedCount: 0,
      },
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
    expect(result).toMatchObject({
      action: "REPLY",
      blockedReasonCodes: [],
      protectedClaimValidation: {
        outcome: "NO_PROTECTED_CLAIMS",
        claimTypes: [],
        validatedCount: 0,
        rejectedCount: 0,
      },
    });
  });
});
