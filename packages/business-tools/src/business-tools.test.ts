import { describe, expect, it } from "vitest";
import type { AgentProposalV1, BusinessFactEnvelopeV1 } from "@lana/contracts";
import { composeVerifiedProductFacts } from "./facts.js";
import { FakeInventorySnapshotPort, FakeStableCatalogSearchPort } from "./fakes.js";
import { guardAgentProposal } from "./guard.js";
import { aggregateInventory, InventoryAuthorityService } from "./inventory.js";
import { ProductSearchService } from "./search.js";
import type {
  InventorySnapshot,
  PosVariation,
  StableProductDocument,
} from "./types.js";

const now = new Date("2026-07-13T00:00:00.000Z");

function row(productCode: string, color: string, size: string, remainQuantity: number): PosVariation {
  return { productCode, sku: `${productCode}-${color}-${size}`, color, size, remainQuantity };
}

function snapshot(variations: PosVariation[], observedAt = "2026-07-12T23:55:00.000Z"): InventorySnapshot {
  return { status: "OK", shopConfigured: true, observedAt, variations };
}

const sd396: StableProductDocument = {
  productId: "SD396",
  parentProductId: "SD396",
  canonicalCode: "SD396",
  aliases: ["đầm đi tiệc"],
  title: "Đầm SD396",
  colors: ["ĐEN"],
  materials: ["LỤA"],
  silhouettes: ["DÁNG A"],
  occasions: ["DỰ TIỆC"],
  imageUrls: ["https://cdn.example.test/sd396.jpg"],
  images: [],
  catalogVersion: "catalog-1",
};

const sd397: StableProductDocument = {
  ...sd396,
  productId: "SD397",
  parentProductId: "SD397",
  canonicalCode: "SD397",
  aliases: [],
  title: "Đầm SD397",
  imageUrls: ["https://cdn.example.test/sd397.jpg"],
};

describe("inventory aggregation", () => {
  it("sums warehouses and ignores unsupported sizes for a direct product", () => {
    const result = aggregateInventory(
      "SD396",
      snapshot([
        row("SD396", "Đỏ", "S", 2),
        row("SD396", "đỏ", "S", 3),
        row("SD396", "Đỏ", "XXL", 99),
      ]),
      "POS_LIVE",
      now,
      10 * 60_000,
    );
    expect(result.status).toBe("OK");
    if (result.status === "OK") expect(result.offers).toEqual([
      expect.objectContaining({ offerType: "DIRECT", color: "ĐỎ", size: "S", quantity: 5 }),
    ]);
  });

  it("calculates SV set quantity as MIN(AO, CV) for the same colour and size", () => {
    const result = aggregateInventory(
      "SV100",
      snapshot([
        row("SV100-AO", "Đỏ", "M", 5),
        row("SV100-CV", "Đỏ", "M", 3),
        row("SV100-CV", "Đen", "M", 20),
      ]),
      "POS_LIVE",
      now,
      10 * 60_000,
    );
    expect(result.status).toBe("OK");
    if (result.status === "OK") expect(result.offers).toEqual([
      expect.objectContaining({ offerType: "SET", color: "ĐỎ", size: "M", quantity: 3 }),
    ]);
  });

  it("calculates SQ set quantity as MIN(AO, QUAN)", () => {
    const result = aggregateInventory(
      "SQ149",
      snapshot([row("SQ149-AO", "Đen", "L", 2), row("SQ149-QUAN", "Đen", "L", 7)]),
      "POS_LIVE",
      now,
      10 * 60_000,
    );
    expect(result.status).toBe("OK");
    if (result.status === "OK") expect(result.offers[0]).toEqual(
      expect.objectContaining({ offerType: "SET", quantity: 2 }),
    );
  });

  it("separates CB SET_CV and SET_QUAN", () => {
    const result = aggregateInventory(
      "CB10",
      snapshot([
        row("CB10-AO", "Kem", "S", 9),
        row("CB10-CV", "Kem", "S", 4),
        row("CB10-QUAN", "Kem", "S", 6),
      ]),
      "POS_LIVE",
      now,
      10 * 60_000,
    );
    expect(result.status).toBe("OK");
    if (result.status === "OK") expect(result.offers).toEqual([
      expect.objectContaining({ offerType: "SET_CV", quantity: 4 }),
      expect.objectContaining({ offerType: "SET_QUAN", quantity: 6 }),
    ]);
  });

  it("fails closed for missing components, missing config, shop errors and stale data", () => {
    expect(aggregateInventory("SV1", snapshot([row("SV1-AO", "Đen", "S", 1)]), "POS_LIVE", now, 600_000).status).toBe("NOT_FOUND");
    expect(aggregateInventory("SD1", { ...snapshot([]), shopConfigured: false }, "POS_LIVE", now, 600_000).status).toBe("CONFIG_NOT_FOUND");
    expect(aggregateInventory("SD1", { ...snapshot([]), status: "SHOP_ERROR" }, "POS_LIVE", now, 600_000).status).toBe("SHOP_ERROR");
    expect(aggregateInventory("SD1", snapshot([row("SD1", "Đen", "S", 1)], "2026-07-12T20:00:00.000Z"), "POS_LIVE", now, 600_000).status).toBe("STALE");
  });

  it("uses a fresh approved snapshot after live POS failure but rejects a stale fallback", async () => {
    const live = new FakeInventorySnapshotPort(new Map([
      ["SD396", { ...snapshot([]), status: "SHOP_ERROR" as const }],
    ]));
    const freshFallback = new FakeInventorySnapshotPort(new Map([
      ["SD396", snapshot([row("SD396", "Đen", "M", 2)])],
    ]));
    const freshService = new InventoryAuthorityService(live, freshFallback, 60_000, 600_000);
    const fresh = await freshService.resolve("SD396", now);
    expect(fresh.status).toBe("OK");
    if (fresh.status === "OK") expect(fresh.source).toBe("POS_SNAPSHOT");

    const staleFallback = new FakeInventorySnapshotPort(new Map([
      ["SD396", snapshot([row("SD396", "Đen", "M", 2)], "2026-07-10T00:00:00.000Z")],
    ]));
    expect((await new InventoryAuthorityService(live, staleFallback, 60_000, 600_000).resolve("SD396", now)).status).toBe("STALE");
  });
});

describe("stable product search", () => {
  const thresholds = { textMinScore: 0.75, imageMinScore: 0.8, minTopGap: 0.05, maxCandidates: 3 };

  it("checks exact code before alias and vector search", async () => {
    const port = new FakeStableCatalogSearchPort([sd396], [{ document: sd397, score: 0.99 }]);
    const result = await new ProductSearchService(port, thresholds).searchText(" sd396 ");
    expect(result).toMatchObject({ status: "MATCHED", matchKind: "EXACT_CODE" });
    expect(port.calls).toEqual(["exact:SD396"]);
  });

  it("uses semantic search directly for natural-language needs", async () => {
    const port = new FakeStableCatalogSearchPort([sd396], [{ document: sd397, score: 0.99 }]);
    const result = await new ProductSearchService(port, thresholds).searchText("đầm đi tiệc");
    expect(result).toMatchObject({ status: "MATCHED", matchKind: "SEMANTIC" });
    expect(port.calls).toEqual(["text:đầm đi tiệc"]);
  });

  it("returns up to three candidates when top score is low or top gap is too small", async () => {
    const lowPort = new FakeStableCatalogSearchPort([], [
      { document: sd396, score: 0.7 },
      { document: sd397, score: 0.65 },
    ]);
    expect(await new ProductSearchService(lowPort, thresholds).searchText("đầm lụa")).toMatchObject({ status: "AMBIGUOUS", reasonCode: "LOW_SCORE" });

    const closePort = new FakeStableCatalogSearchPort(
      [],
      [],
      [
        { document: sd396, score: 0.9 },
        { document: sd397, score: 0.88 },
      ],
    );
    expect(await new ProductSearchService(closePort, thresholds).searchImage("https://example.test/photo.jpg")).toMatchObject({ status: "AMBIGUOUS", reasonCode: "TOP_GAP_TOO_SMALL" });
  });

  it("rejects dynamic price/stock fields returned by a Qdrant adapter", async () => {
    const polluted = { document: { ...sd396, salePriceVnd: 699_000 }, score: 0.9 };
    const port = new FakeStableCatalogSearchPort([], [polluted as never]);
    await expect(new ProductSearchService(port, thresholds).searchText("đầm")).rejects.toThrow();
  });
});

function goodFacts(): BusinessFactEnvelopeV1 {
  const inventory = aggregateInventory(
    "SD396",
    snapshot([row("SD396", "Đen", "M", 2)]),
    "POS_LIVE",
    now,
    600_000,
  );
  return composeVerifiedProductFacts({
    now,
    product: sd396,
    offerType: "DIRECT",
    price: {
      productId: "SD396",
      listPriceVnd: 799_000,
      salePriceVnd: 699_000,
      source: "POS_LIVE",
      observedAt: "2026-07-12T23:55:00.000Z",
      expiresAt: "2026-07-13T00:10:00.000Z",
    },
    inventory,
    parentPolicy: {
      parentProductId: "SD396",
      policyCode: "READY_STOCK",
      preparationDaysMin: 0,
      preparationDaysMax: 1,
      policyVersion: "policy-1",
      observedAt: "2026-07-12T23:55:00.000Z",
      expiresAt: "2026-07-13T01:00:00.000Z",
    },
    transit: {
      minDays: 2,
      maxDays: 3,
      observedAt: "2026-07-12T23:55:00.000Z",
      expiresAt: "2026-07-13T01:00:00.000Z",
    },
  });
}

function proposal(reply: string, attachments: string[] = []): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "hoi_gia",
    conversationStage: "consulting",
    productId: "SD396",
    action: "REPLY",
    reply,
    attachments,
    handoffReason: null,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

describe("facts and deterministic policy guard", () => {
  it("combines parent preparation days and verified transit into customer delivery ETA", () => {
    const facts = goodFacts();
    expect(facts.status).toBe("OK");
    expect(facts.facts?.deliveryEta).toEqual({ minDays: 2, maxDays: 4 });
    expect(facts.facts?.fulfillmentPolicy).toBe("READY_STOCK");
  });

  it("returns STALE and no facts when any authority is expired", () => {
    const inventory = aggregateInventory("SD396", snapshot([row("SD396", "Đen", "M", 2)]), "POS_LIVE", now, 600_000);
    const result = composeVerifiedProductFacts({
      now,
      product: sd396,
      offerType: "DIRECT",
      price: { productId: "SD396", listPriceVnd: null, salePriceVnd: 699_000, source: "POS_SNAPSHOT", observedAt: "2026-07-12T23:00:00.000Z", expiresAt: "2026-07-12T23:59:00.000Z" },
      inventory,
      parentPolicy: { parentProductId: "SD396", policyCode: "READY_STOCK", preparationDaysMin: 0, preparationDaysMax: 1, policyVersion: "1", observedAt: "2026-07-12T23:00:00.000Z", expiresAt: "2026-07-13T01:00:00.000Z" },
      transit: { minDays: 2, maxDays: 3, observedAt: "2026-07-12T23:00:00.000Z", expiresAt: "2026-07-13T01:00:00.000Z" },
    });
    expect(result).toMatchObject({ status: "STALE", facts: null, reasonCode: "BUSINESS_FACT_STALE" });
  });

  it("allows only verified price, stock, ETA and attachment while keeping sendAuthorized false", () => {
    const result = guardAgentProposal({
      proposal: proposal("Mẫu SD396 còn hàng, giá 699k và dự kiến giao trong 2-4 ngày ạ", [sd396.imageUrls[0] as string]),
      facts: goodFacts(),
      verifiedProductIds: new Set(["SD396"]),
      now,
    });
    expect(result.blockedReasonCodes).toEqual([]);
    expect(result.action).toBe("REPLY");
    expect(result.sendAuthorized).toBe(false);
    expect(result).toMatchObject({
      protectedClaimValidation: {
        outcome: "VALIDATED",
        claimTypes: ["PRICE", "STOCK", "ETA", "PRODUCT_MEDIA"],
        validatedCount: 4,
        rejectedCount: 0,
      },
    });
  });

  it("uses the verified media selection instead of the legacy facts image set", () => {
    const fullLookUrl = "https://cdn.example/sd396-full-look.jpg";
    const result = guardAgentProposal({
      proposal: proposal("Mẫu SD396 giá 699k ạ", [fullLookUrl]),
      facts: goodFacts(),
      verifiedProductIds: new Set(["SD396"]),
      verifiedAttachmentUrls: new Set([fullLookUrl]),
      now,
    });

    expect(result).toMatchObject({
      action: "REPLY",
      imageUrls: [fullLookUrl],
      blockedReasonCodes: [],
    });
  });

  it("drops only an unverified attachment when the text-only fallback is enabled", () => {
    const result = guardAgentProposal({
      proposal: proposal("Mẫu SD396 giá 699k ạ", ["https://evil.test/x.jpg"]),
      facts: goodFacts(),
      verifiedProductIds: new Set(["SD396"]),
      verifiedAttachmentUrls: new Set(),
      allowTextOnlyOnUnverifiedAttachment: true,
      now,
    });

    expect(result).toMatchObject({
      action: "REPLY",
      textUnits: ["Mẫu SD396 giá 699k ạ"],
      imageUrls: [],
      blockedReasonCodes: ["UNVERIFIED_ATTACHMENT"],
      handoffReason: null,
      protectedClaimValidation: {
        outcome: "PARTIALLY_BLOCKED",
        claimTypes: ["PRICE", "PRODUCT_MEDIA"],
        validatedCount: 1,
        rejectedCount: 1,
      },
    });
  });

  it("blocks invented price, promotion, freeship and ship fee", () => {
    const result = guardAgentProposal({
      proposal: proposal("Giá 599k, đang giảm giá, freeship và phí ship 30k ạ"),
      facts: goodFacts(),
      verifiedProductIds: new Set(["SD396"]),
      now,
    });
    expect(result.blockedReasonCodes).toEqual(expect.arrayContaining([
      "UNAUTHORIZED_PRICE",
      "UNAUTHORIZED_PROMOTION",
      "UNAUTHORIZED_FREESHIP",
      "UNAUTHORIZED_SHIP_FEE",
    ]));
    expect(result).toMatchObject({
      action: "HANDOFF",
      textUnits: [],
      imageUrls: [],
      sendAuthorized: false,
      protectedClaimValidation: {
        outcome: "BLOCKED",
        claimTypes: ["PRICE", "SHIPPING_FEE", "FREESHIP", "PROMOTION_OFFER"],
        validatedCount: 0,
        rejectedCount: 4,
      },
    });
  });

  it("blocks stale facts, raw URLs, unverified products and attachments", () => {
    const staleFacts = { ...goodFacts(), expiresAt: "2026-07-12T23:00:00.000Z" };
    const result = guardAgentProposal({
      proposal: { ...proposal("Mẫu còn hàng: https://evil.test/x"), productId: "UNKNOWN", attachments: ["https://evil.test/x.jpg"] },
      facts: staleFacts,
      verifiedProductIds: new Set(["SD396"]),
      now,
    });
    expect(result.blockedReasonCodes).toEqual(expect.arrayContaining([
      "RAW_URL_IN_TEXT",
      "UNAUTHORIZED_STOCK",
      "UNVERIFIED_ATTACHMENT",
      "UNVERIFIED_PRODUCT",
    ]));
  });

  it("blocks NO_REPLY when the deterministic layer found a buying signal", () => {
    const result = guardAgentProposal({
      proposal: {
        ...proposal(""),
        action: "NO_REPLY",
      },
      facts: null,
      verifiedProductIds: new Set(["SD396"]),
      buyingSignal: true,
      now,
    });
    expect(result.blockedReasonCodes).toContain("NO_REPLY_OVERRIDE_BUYING_SIGNAL");
  });

  it("blocks collecting order PII before a buying signal", () => {
    const result = guardAgentProposal({
      proposal: proposal("Chị gửi em họ tên, số điện thoại và địa chỉ nhận hàng nha."),
      facts: null,
      verifiedProductIds: new Set(["SD396"]),
      buyingSignal: false,
      now,
    });
    expect(result.blockedReasonCodes).toContain("PREMATURE_ORDER_INFO_REQUEST");
  });

  it("does not mistake a product model name request for order PII", () => {
    const result = guardAgentProposal({
      proposal: proposal("Chị gửi em tên mẫu hoặc mã mẫu chị đang xem nha."),
      facts: null,
      verifiedProductIds: new Set(["SD396"]),
      buyingSignal: false,
      now,
    });
    expect(result.blockedReasonCodes).not.toContain(
      "PREMATURE_ORDER_INFO_REQUEST",
    );
  });

  it("still blocks a bare recipient-name request before a buying signal", () => {
    const result = guardAgentProposal({
      proposal: proposal(
        "Chị gửi em tên người nhận, số điện thoại và địa chỉ nhận hàng nha.",
      ),
      facts: null,
      verifiedProductIds: new Set(["SD396"]),
      buyingSignal: false,
      now,
    });
    expect(result.blockedReasonCodes).toContain("PREMATURE_ORDER_INFO_REQUEST");
  });

  it("does not fabricate a protected-claim rejection for a non-claim guard block", () => {
    const result = guardAgentProposal({
      proposal: proposal("See https://evil.test/x"),
      facts: null,
      verifiedProductIds: new Set(["SD396"]),
      now,
    });

    expect(result.blockedReasonCodes).toEqual(["RAW_URL_IN_TEXT"]);
    expect(result).toMatchObject({
      protectedClaimValidation: {
        outcome: "NO_PROTECTED_CLAIMS",
        claimTypes: [],
        validatedCount: 0,
        rejectedCount: 0,
      },
    });
  });

  it("emits a bounded no-claim summary for invalid proposals", () => {
    const result = guardAgentProposal({
      proposal: { reply: "unparsed customer or model text" },
      facts: null,
      verifiedProductIds: new Set(),
      now,
    });

    expect(result).toMatchObject({
      action: "HANDOFF",
      blockedReasonCodes: ["INVALID_AGENT_PROPOSAL"],
      protectedClaimValidation: {
        outcome: "NO_PROTECTED_CLAIMS",
        claimTypes: [],
        validatedCount: 0,
        rejectedCount: 0,
      },
    });
  });
});
