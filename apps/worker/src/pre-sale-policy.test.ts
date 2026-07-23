import { describe, expect, it } from "vitest";
import type { RuntimePolicyBundle } from "@lana/chat-runtime";
import {
  classifyPreSalePolicyIntent,
  renderPreSalePolicyReply,
} from "./pre-sale-policy.js";

const care = {
  exchange: {
    windowDaysFromReceipt: 15,
    maxExchangesPerOrder: 1,
    supportedActions: ["SIZE", "COLOR", "MODEL"],
    saleRestriction: { discountThresholdBps: 3_000, allowedActions: ["SIZE", "COLOR"] },
    requiredConditions: { originalTags: true, unused: true, unwashed: true, clean: true, undamaged: true },
    totalTwoWayShippingFeeVnd: 30_000,
    modelExchangePricing: "NEW_PRODUCT_LIST_PRICE_NO_SALE",
    customerPaysPositivePriceDifference: true,
    fulfillmentMethod: "COURIER_SWAP",
  },
  returns: {
    eligibleReasons: ["MANUFACTURING_FABRIC_DEFECT", "MANUFACTURING_SEAM_DEFECT", "WRONG_PRODUCT_SENT"],
    reportingWindowDaysFromReceipt: 5,
    shopShippingCoveragePercent: 100,
    refundBusinessDaysMin: 1,
    refundBusinessDaysMax: 3,
    refundStartsAfter: "SHOP_CONFIRMS_ELIGIBLE_ERROR",
  },
  inspection: { tryOnMode: "HOLD_UP_ONLY", refusedParcelShippingFeeVnd: 30_000 },
  marketplacePricing: { shopeePriceMatch: false, reason: "PLATFORM_SUBSIDY_AND_VOUCHERS" },
  customerFaq: {
    discloseLightingAndDisplayColorVariance: true,
    handWashPreferred: true,
    machineWashAllowedWithLaundryBagAndGentleCycle: true,
  },
} as const;

const bundle = {
  sideEffects: "LIVE_OUTBOUND",
  artifacts: {
    shopPolicy: {
      defaultShippingFeeVnd: 30_000,
      deliveryPromiseText: "3-7 hôm hàng tới",
      customerCare: care,
    },
  },
} as unknown as RuntimePolicyBundle;

describe("pre-sale customer-care policy", () => {
  it.each([
    ["có được đổi trả không", "EXCHANGE_AND_RETURN"],
    ["shop có hỗ trợ đổi size không", "EXCHANGE_SIZE"],
    ["có được đổi mẫu khác không", "EXCHANGE_MODEL"],
    ["có được đổi màu không", "EXCHANGE_COLOR"],
    ["đổi sang mẫu khác được không", "EXCHANGE_MODEL"],
    ["đổi màu khác được không", "EXCHANGE_COLOR"],
    ["có được mặc thử không", "TRY_ON"],
    ["không nhận hàng có mất phí ship không", "REFUSED_PARCEL_FEE"],
    ["giá có giống shopee không", "SHOPEE_PRICE"],
    ["giặt máy được không", "WASHING_CARE"],
    ["màu có giống hình không", "IMAGE_ACCURACY"],
  ] as const)("classifies %s", (text, intent) => {
    expect(classifyPreSalePolicyIntent(text)).toBe(intent);
  });

  it.each([
    "cho chị đổi size",
    "chị đã nhận hàng và muốn đổi size",
    "shop giao sai sản phẩm rồi",
    "hàng chị nhận bị lỗi đường may",
  ])("never treats an actual after-sales action as a policy FAQ: %s", (text) => {
    expect(classifyPreSalePolicyIntent(text)).toBeNull();
  });

  it("renders only trusted structured policy values", () => {
    expect(renderPreSalePolicyReply("EXCHANGE_SIZE", bundle)).toContain("15 ngày");
    expect(renderPreSalePolicyReply("EXCHANGE_SIZE", bundle)).toContain("30.000đ");
    expect(renderPreSalePolicyReply("RETURN_AND_REFUND", bundle)).toContain("1–3 ngày");
  });

  it("fails closed without a live or approved customer-care policy", () => {
    expect(renderPreSalePolicyReply("EXCHANGE_SIZE", null)).toBeNull();
    expect(renderPreSalePolicyReply("EXCHANGE_SIZE", {
      ...bundle,
      sideEffects: "DISABLED",
    })).toBeNull();
  });
});
