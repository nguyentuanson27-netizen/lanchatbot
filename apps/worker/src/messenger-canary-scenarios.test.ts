import { describe, expect, it } from "vitest";
import { extractCustomerMeasurements, type StableProductDocument } from "@lana/business-tools";
import type { AgentProposalV1 } from "@lana/contracts";
import {
  buildBusinessFactQueries,
  explicitCustomerBusinessIntents,
  explicitCustomerImageIntent,
  extractVariantMentions,
  isPostSaleRequest,
  isPreSalePolicyQuestion,
} from "./realtime-runner.js";

const proposal: AgentProposalV1 = {
  schemaVersion: 1,
  intent: "test",
  conversationStage: "CONSULTING",
  productId: "CB182",
  action: "REPLY",
  reply: "",
  attachments: [],
  handoffReason: null,
  businessFactQuery: {
    intent: "NONE",
    offerType: null,
    color: "MODEL_INVENTED_COLOR",
    size: "MODEL_INVENTED_SIZE",
    deliveryRegion: null,
  },
};

const product = (id: string): StableProductDocument => ({
  productId: id,
  parentProductId: id,
  canonicalCode: id,
  aliases: [],
  title: `Mẫu ${id}`,
  colors: [],
  materials: [],
  silhouettes: [],
  occasions: [],
  imageUrls: [],
  images: [],
  catalogVersion: "test-v1",
});

const measurementKinds = (text: string): string[] =>
  extractCustomerMeasurements({
    text,
    observedAt: "2026-07-23T00:00:00.000Z",
    sourceEventHash: "a".repeat(64),
  }).map(({ kind }) => kind).sort();

describe("30 deterministic Messenger canary scenarios", () => {
  const intentScenarios = [
    ["CB182 giá bao nhiêu", ["PRICE"]],
    ["CB182 còn hàng không", ["STOCK"]],
    ["CB182 có size nào", ["SIZE"]],
    ["CB182 giao mấy ngày", ["ETA"]],
    ["CB182 giá và còn size M không", ["PRICE", "STOCK", "SIZE"]],
    ["mẫu này bao nhiêu tiền", ["PRICE"]],
    ["mẫu này còn màu đen size L không", ["STOCK", "SIZE"]],
    ["bao lâu nhận được hàng", ["ETA"]],
  ] as const;
  it.each(intentScenarios)("routes business intent: %s", (text, expected) => {
    expect(explicitCustomerBusinessIntents(text)).toEqual(expected);
  });

  const mediaScenarios = [
    ["cho xin ảnh cận chất", "DETAIL"],
    ["có feedback không", "FEEDBACK"],
    ["cho xem bảng size", "SIZE_GUIDE"],
    ["xin ảnh sản phẩm thật không người mẫu", "PRODUCT_ONLY"],
    ["gửi thêm ảnh mẫu", "GENERIC"],
    ["ảnh mặt sau", "BACK"],
  ] as const;
  it.each(mediaScenarios)("routes media intent: %s", (text, expected) => {
    expect(explicitCustomerImageIntent(text)).toBe(expected);
  });

  const profileScenarios = [
    ["cao 1m60 nặng 50kg", ["HEIGHT_CM", "WEIGHT_KG"]],
    ["chieu cao 158cm can nang 49 ky", ["HEIGHT_CM", "WEIGHT_KG"]],
    ["số đo 3 vòng 86-68-92", ["BUST_CM", "HIPS_CM", "WAIST_CM"]],
    ["v1 88 v2 70 v3 94", ["BUST_CM", "HIPS_CM", "WAIST_CM"]],
    ["eo 72", ["WAIST_CM"]],
    ["0984997797, mẫu 699k", []],
  ] as const;
  it.each(profileScenarios)("extracts safe profile: %s", (text, expected) => {
    expect(measurementKinds(text)).toEqual(expected);
  });

  const routingScenarios = [
    ["shop có được đổi size không", true, false],
    ["chị đã nhận hàng, đổi size cho chị", false, true],
    ["đơn của chị tới đâu rồi", false, true],
    ["phí đổi trả thế nào trước khi mua", true, false],
  ] as const;
  it.each(routingScenarios)("separates policy and after-sale: %s", (text, policy, postSale) => {
    expect(isPreSalePolicyQuestion(text)).toBe(policy);
    expect(isPostSaleRequest(text)).toBe(postSale);
  });

  it("uses customer text, never model output, for a labelled variant", () => {
    expect(extractVariantMentions("màu kem size M", proposal)).toEqual({
      color: "kem",
      size: "M",
    });
  });

  it("accepts a sole size follow-up", () => {
    expect(extractVariantMentions("L", proposal)).toEqual({ color: null, size: "L" });
  });

  it("accepts an explicitly labelled colour follow-up", () => {
    expect(extractVariantMentions("màu be", proposal)).toEqual({
      color: "be",
      size: null,
    });
  });

  it("does not accept model-invented variant evidence", () => {
    expect(extractVariantMentions("mẫu này đẹp", proposal)).toEqual({
      color: null,
      size: null,
    });
  });

  it("scopes different facts to two explicit products", () => {
    const cb182 = product("CB182");
    const sv695 = product("SV695");
    const queries = buildBusinessFactQueries(
      "event-1",
      "CB182 hỏi giá, SV695 còn size nào",
      [
        { raw: "CB182", product: cb182, resolution: "RESOLVED" },
        { raw: "SV695", product: sv695, resolution: "RESOLVED" },
      ],
    );
    expect(queries?.queries.map(({ productRef, requestedFacts }) => ({
      raw: productRef.raw,
      requestedFacts,
    }))).toEqual([
      { raw: "CB182", requestedFacts: ["PRICE"] },
      // "còn size nào" asks both whether a sellable variant exists and which
      // size it is, so both facts must remain scoped to SV695.
      { raw: "SV695", requestedFacts: ["STOCK", "SIZE"] },
    ]);
  });

  it("preserves an unknown product reference instead of falling back", () => {
    const queries = buildBusinessFactQueries(
      "event-2",
      "CB182 giá bao nhiêu, XX999 còn hàng không",
      [
        { raw: "CB182", product: product("CB182"), resolution: "RESOLVED" },
        { raw: "XX999", product: null, resolution: "NOT_FOUND" },
      ],
    );
    expect(queries?.queries[1]?.productRef).toEqual({
      raw: "XX999",
      productId: null,
      resolution: "NOT_FOUND",
    });
  });
});
