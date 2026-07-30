import { describe, expect, it } from "vitest";
import type { BusinessFactEnvelopeV1, GroundedReplyDraftV1 } from "@lana/contracts";
import type { StableProductDocument } from "./types.js";
import {
  assembleReply,
  buildVerifiedFactBlocks,
  validateAdvisoryAgainstFacts,
} from "./reply-assembler.js";

const product: StableProductDocument = {
  productId: "AD398",
  parentProductId: "AD398",
  canonicalCode: "AD398",
  aliases: [],
  title: "Áo dài Dao Phụng",
  descriptionXml: "Áo thêu 3D, thiết kế 6 tà và áo lót 2 lớp.",
  colors: ["TRẮNG"],
  materials: ["REN", "TƠ ÓNG"],
  silhouettes: ["SUÔNG"],
  occasions: ["SỰ KIỆN"],
  imageUrls: [],
  images: [],
  catalogVersion: "catalog-v2",
};

const facts: BusinessFactEnvelopeV1 = {
  schemaVersion: 1,
  status: "OK",
  source: "POS_SNAPSHOT",
  observedAt: "2026-07-23T08:00:00.000Z",
  expiresAt: "2099-07-23T08:00:00.000Z",
  productId: "AD398",
  facts: {
    schemaVersion: 1,
    productId: "AD398",
    parentProductId: "AD398",
    offerType: "AO_DAI",
    listPriceVnd: 1_299_000,
    salePriceVnd: 1_199_000,
    sizes: ["S", "M", "L"],
    stockStatus: "IN_STOCK",
    stockQuantity: 2,
    deliveryEta: { minDays: 3, maxDays: 7 },
    fulfillmentPolicy: "READY_STOCK",
    imageUrls: [
      "https://cdn.example/ad398-main.jpg",
      "https://cdn.example/ad398-detail.jpg",
    ],
  },
  reasonCode: null,
};

const emptyDraft: GroundedReplyDraftV1 = {
  schemaVersion: 1,
  advisoryText: "",
  objectionResponse: "",
  suggestedQuestion: "",
  suggestedNextStep: "",
  attachmentImageIndices: [],
};

describe("verified reply assembler", () => {
  it("renders the trusted price block exactly from typed facts", () => {
    const result = buildVerifiedFactBlocks(facts, "PRICE", product);
    expect(result).toEqual({
      blocks: [{
        kind: "PRICE",
        productId: "AD398",
        text: [
          "Áo dài Dao Phụng (mã AD398) hiện có giá 1.199.000đ chị nhé.",
          "Chất liệu: ren, tơ óng",
          "Form dáng: suông",
          "Size: S, M, L",
        ].join("\n"),
        sourceField: "facts.salePriceVnd",
        sourceVersion: "POS_SNAPSHOT:2026-07-23T08:00:00.000Z",
      }],
      reasonCodes: [],
    });
    expect(assembleReply(result, emptyDraft, facts, product).text).toBe(
      [
        "Áo dài Dao Phụng (mã AD398) hiện có giá 1.199.000đ chị nhé.",
        "Chất liệu: ren, tơ óng",
        "Form dáng: suông",
        "Size: S, M, L",
      ].join("\n"),
    );
  });

  it.each([
    "Mẫu này chỉ 500k thôi ạ",
    "Kho còn 2 sản phẩm",
    "Có size S M nha",
    "Nhận hàng sau 3 ngày",
  ])("blocks model-authored business facts: %s", (advisoryText) => {
    const validation = validateAdvisoryAgainstFacts(advisoryText, product);
    expect(validation.accepted).toBe(false);
    expect(validation.reasonCodes).toContain("MODEL_FACT_IN_ADVISORY");
  });

  it.each([
    "Phần thêu 3D tạo điểm nhấn tinh tế.",
    "Áo lót 2 lớp giúp tổng thể chỉn chu.",
    "Thiết kế 6 tà bay nhẹ khi di chuyển.",
  ])("keeps numeric catalog details only when verified metadata contains them: %s", (text) => {
    expect(validateAdvisoryAgainstFacts(text, product)).toEqual({ accepted: true, reasonCodes: [] });
  });

  it("drops an invalid image index and keeps only a verified URL", () => {
    const assembled = assembleReply(
      buildVerifiedFactBlocks(facts, "PRICE", product),
      { ...emptyDraft, attachmentImageIndices: [1, 9] },
      facts,
      product,
    );
    expect(assembled.imageUrls).toEqual(["https://cdn.example/ad398-detail.jpg"]);
    expect(assembled.reasonCodes).toContain("GROUNDED_IMAGE_INDEX_OUT_OF_RANGE");
  });

  it("blocks facts from another product", () => {
    const result = buildVerifiedFactBlocks(
      { ...facts, productId: "CB182", facts: facts.facts ? { ...facts.facts, productId: "CB182" } : null },
      "PRICE",
      product,
    );
    expect(result).toEqual({ blocks: [], reasonCodes: ["CROSS_PRODUCT_FACT_BLOCKED"] });
  });

  it("reports unavailable facts before attempting cross-product validation", () => {
    const result = buildVerifiedFactBlocks(
      { ...facts, status: "NOT_FOUND", facts: null, reasonCode: "SNAPSHOT_NOT_FOUND" },
      "PRICE",
      product,
    );
    expect(result).toEqual({ blocks: [], reasonCodes: ["VERIFIED_FACTS_UNAVAILABLE"] });
  });

  it("never keeps an advisory URL outside the verified image index", () => {
    const assembled = assembleReply(
      buildVerifiedFactBlocks(facts, "PRICE", product),
      { ...emptyDraft, advisoryText: "Xem ảnh https://evil.example/a.jpg" },
      facts,
      product,
    );
    expect(assembled.text).not.toContain("evil.example");
    expect(assembled.reasonCodes).toContain("MODEL_URL_IN_ADVISORY");
  });
});
