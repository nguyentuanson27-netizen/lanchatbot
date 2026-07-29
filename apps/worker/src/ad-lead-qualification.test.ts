import { describe, expect, it } from "vitest";
import {
  deriveAdLeadQualification,
  detectExplicitBuyingNegation,
} from "./ad-lead-qualification.js";

const base = {
  text: "",
  productMatched: false,
  resolvedAttachment: false,
  businessIntent: null,
  preSalePolicyIntent: null,
  objectionType: "NONE",
  buyingCommitted: false,
  orderPreviewCreated: false,
  purchaseConfirmed: false,
} as const;

describe("ad lead qualification", () => {
  it("keeps an ambiguous acknowledgement at re-engaged only", () => {
    expect(deriveAdLeadQualification({ ...base, text: "ok" })).toEqual({
      meaningfulLabels: [],
      ambiguousAcknowledgement: true,
      buyingNegated: false,
    });
  });

  it("treats a pre-sale return question as meaningful without post-sale conversion", () => {
    const result = deriveAdLeadQualification({
      ...base,
      text: "mua roi co doi tra duoc khong?",
      preSalePolicyIntent: "RETURN_POLICY",
    });
    expect(result.meaningfulLabels).toContain("PRE_SALE_RETURN_POLICY");
    expect(result.meaningfulLabels).not.toContain("PURCHASE_CONFIRMED");
  });

  it("detects explicit negation without promoting buying commitment", () => {
    expect(detectExplicitBuyingNegation("ch\u1ecb kh\u00f4ng l\u1ea5y m\u1eabu n\u00e0y")).toBe(true);
    const result = deriveAdLeadQualification({
      ...base,
      text: "ch\u1ecb kh\u00f4ng l\u1ea5y m\u1eabu n\u00e0y",
    });
    expect(result.buyingNegated).toBe(true);
    expect(result.meaningfulLabels).toEqual(["BUYING_NEGATED"]);
  });

  it("makes explicit negation win conflicting runtime evidence", () => {
    const result = deriveAdLeadQualification({
      ...base,
      text: "khong chot",
      buyingCommitted: true,
      orderPreviewCreated: true,
      purchaseConfirmed: true,
    });
    expect(result.meaningfulLabels).toEqual(["BUYING_NEGATED"]);
  });
  it("joins an order preview as deterministic commitment evidence", () => {
    const result = deriveAdLeadQualification({
      ...base,
      text: "",
      orderPreviewCreated: true,
    });
    expect(result.meaningfulLabels).toContain("ORDER_PREVIEW_CREATED");
  });
  it("uses deterministic runtime evidence for qualification milestones", () => {
    const result = deriveAdLeadQualification({
      ...base,
      text: "ch\u1ed1t size M",
      productMatched: true,
      businessIntent: "SIZE",
      buyingCommitted: true,
    });
    expect(result.meaningfulLabels).toEqual(expect.arrayContaining([
      "BUYING_COMMITTED",
      "PRODUCT_MATCHED",
      "SIZE_OR_MEASUREMENT",
      "SIZE_QUESTION",
    ]));
  });
});
