import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyCustomerUrls,
  customerUrlItemAuthorizesProduct,
  redactCustomerUrlsForModel,
  verifyCustomerUrlExplanationProposal,
} from "./customer-url-policy.js";

interface ReplayCase {
  readonly name: string;
  readonly text: string;
  readonly expectedDisposition: "CONTINUE" | "HANDOFF";
  readonly expectedClass: "APPROVED_FIRST_PARTY_PRODUCT" | "APPROVED_SHOP_CDN" |
    "UNSUPPORTED_EXTERNAL" | "SUSPICIOUS_DANGEROUS";
  readonly expectedReason: string;
  readonly expectedProductCodes: readonly string[];
}

const replay = JSON.parse(readFileSync(
  new URL("../../../benchmarks/bf08/classified-customer-url-v1.json", import.meta.url),
  "utf8",
)) as readonly ReplayCase[];

describe("BF-08 classified customer URL policy", () => {
  it.each(replay)("replays $name", (fixture) => {
    const decision = classifyCustomerUrls(fixture.text, "CLASSIFIED_ALLOWLIST_V1");
    expect(decision).toMatchObject({
      disposition: fixture.expectedDisposition,
      productCodes: fixture.expectedProductCodes,
    });
    expect(decision.items[0]?.classification).toBe(fixture.expectedClass);
    expect(decision.reasonCodes).toContain(fixture.expectedReason);
  });

  it("normalizes approved first-party product URLs for offline exact lookup", () => {
    expect(classifyCustomerUrls(
      "xem HTTPS://WWW.LANADESIGN.VN:443/products/SD398?utm_source=chat#detail",
      "CLASSIFIED_ALLOWLIST_V1",
    )).toMatchObject({
      disposition: "CONTINUE",
      productCodes: ["SD398"],
      items: [{
        classification: "APPROVED_FIRST_PARTY_PRODUCT",
        normalizedUrl: "https://www.lanadesign.vn/products/SD398",
        productCode: "SD398",
      }],
    });
    expect(classifyCustomerUrls(
      "www.lanadesign.vn/sv695",
      "CLASSIFIED_ALLOWLIST_V1",
    )).toMatchObject({ disposition: "CONTINUE", productCodes: ["SV695"] });
  });

  it("allows only the repository-evidenced CDN path when a product code is recoverable offline", () => {
    const canonicalUrl =
      "https://admin.lanadesign.vn/lana-public/products/sv695-0123456789abcdef01234567.jpg";
    const approved = classifyCustomerUrls(
      canonicalUrl,
      "CLASSIFIED_ALLOWLIST_V1",
    );
    expect(approved).toMatchObject({
      disposition: "CONTINUE",
      productCodes: ["SV695"],
      items: [{ classification: "APPROVED_SHOP_CDN", productCode: "SV695" }],
    });
    const item = approved.items[0]!;
    const product = {
      productId: "SV695",
      parentProductId: "SV695",
      canonicalCode: "SV695",
      aliases: [],
      title: "Verified product",
      colors: [], materials: [], silhouettes: [], occasions: [],
      imageUrls: [canonicalUrl],
      images: [{
        url: canonicalUrl,
        role: "PRIMARY" as const,
        angle: "FRONT" as const,
        imageType: "MODEL" as const,
        intents: [], partsVisible: [], sortOrder: 0, qualityScore: 1,
        feedback: false, observedAt: "2026-08-10T00:00:00.000Z",
        sourceContentSha256: "a".repeat(64), reviewStatus: "APPROVED" as const,
        metadataVerified: true,
      }],
      catalogVersion: "catalog-v2",
    };
    expect(customerUrlItemAuthorizesProduct(item, product)).toBe(true);
    expect(customerUrlItemAuthorizesProduct(item, {
      ...product,
      images: [{ ...product.images[0]!, url: canonicalUrl.replace("0123", "ffff") }],
    })).toBe(false);
    for (const text of [
      "https://admin.lanadesign.vn/private/sv695.jpg",
      "https://admin.lanadesign.vn/lana-public/products/%2e%2e/secret.jpg",
      "https://admin.lanadesign.vn/lana-public/products/sv695-fake.jpg",
      "https://content.pancake.vn/customer-controlled.jpg",
      "https://scontent.xx.fbcdn.net/customer-controlled.jpg",
    ]) {
      expect(classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1").disposition)
        .toBe("HANDOFF");
    }
  });

  it.each([
    ["http://www.lanadesign.vn/sv695", "CUSTOMER_URL_HTTPS_REQUIRED"],
    ["https://user:secret@www.lanadesign.vn/sv695", "CUSTOMER_URL_CREDENTIALS_FORBIDDEN"],
    ["https://www.lanadesign.vn:444/sv695", "CUSTOMER_URL_PORT_FORBIDDEN"],
    ["https://lanadesign.vn.evil.test/sv695", "CUSTOMER_URL_DECEPTIVE_HOST"],
    ["https://127.0.0.1/admin", "CUSTOMER_URL_PRIVATE_ADDRESS"],
    ["https://169.254.169.254/latest/meta-data", "CUSTOMER_URL_PRIVATE_ADDRESS"],
    ["https://[::1]/admin", "CUSTOMER_URL_PRIVATE_ADDRESS"],
    ["https://xn--lanadesgn-2za.vn/sv695", "CUSTOMER_URL_DECEPTIVE_HOST"],
    ["https://example.com/sv695", "CUSTOMER_URL_UNSUPPORTED_EXTERNAL"],
  ])("blocks %s with %s", (text, reasonCode) => {
    const decision = classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1");
    expect(decision.disposition).toBe("HANDOFF");
    expect(decision.reasonCodes).toContain(reasonCode);
  });

  it("fails the whole turn closed when approved and blocked URLs are mixed", () => {
    const decision = classifyCustomerUrls(
      "so sÃ¡nh https://www.lanadesign.vn/sv695 vá»›i https://example.com/sv695",
      "CLASSIFIED_ALLOWLIST_V1",
    );
    expect(decision).toMatchObject({
      disposition: "HANDOFF",
      productCodes: [],
    });
    expect(decision.reasonCodes).toContain("CUSTOMER_URL_MIXED_TRUST");
  });

  it("deduplicates repeated canonical URLs but lets the most dangerous URL win", () => {
    expect(classifyCustomerUrls(
      "https://www.lanadesign.vn/sv695 https://www.lanadesign.vn:443/sv695#same",
      "CLASSIFIED_ALLOWLIST_V1",
    )).toMatchObject({ disposition: "CONTINUE", productCodes: ["SV695"] });
    const dangerous = classifyCustomerUrls(
      "https://www.lanadesign.vn/sv695 https://169.254.169.254/latest/meta-data",
      "CLASSIFIED_ALLOWLIST_V1",
    );
    expect(dangerous.disposition).toBe("HANDOFF");
    expect(dangerous.reasonCodes).toEqual(expect.arrayContaining([
      "CUSTOMER_URL_PRIVATE_ADDRESS",
      "CUSTOMER_URL_MIXED_TRUST",
    ]));
  });

  it("preserves the strict fallback and exposes no resolver authority", () => {
    expect(classifyCustomerUrls(
      "https://www.lanadesign.vn/sv695",
      "STRICT_BLOCK_ALL",
    )).toMatchObject({
      disposition: "HANDOFF",
      productCodes: [],
      explanationAllowed: false,
      reasonCodes: ["CUSTOMER_URL_STRICT_BLOCK_ALL"],
    });
  });

  it("redacts raw URLs before any model context", () => {
    const raw = "xem https://user:secret@example.com/a?token=top-secret vÃ  www.lanadesign.vn/sv695";
    const redacted = redactCustomerUrlsForModel(raw);
    expect(redacted).toBe("xem [CUSTOMER_URL] vÃ  [CUSTOMER_URL]");
    expect(redacted).not.toContain("secret");
    expect(redacted).not.toContain("lanadesign.vn");
  });

  it("accepts only a bounded claim-free model explanation", () => {
    const proposal = {
      schemaVersion: 1 as const,
      intent: "customer_url_unsupported",
      conversationStage: "DISCOVERY" as const,
      productId: null,
      action: "REPLY" as const,
      reply: "Em khÃ´ng thá»ƒ má»Ÿ liÃªn káº¿t nÃ y an toÃ n. Chá»‹ gá»­i mÃ£ sáº£n pháº©m hoáº·c áº£nh Ä‘á»ƒ em kiá»ƒm tra nhÃ©.",
      attachments: [],
      handoffReason: null,
      businessFactQuery: {
        intent: "NONE" as const,
        offerType: null,
        color: null,
        size: null,
        deliveryRegion: null,
      },
    };
    expect(verifyCustomerUrlExplanationProposal(proposal)).toEqual({ accepted: true, reasonCodes: [] });
    expect(verifyCustomerUrlExplanationProposal({
      ...proposal,
      reply: "Má»Ÿ https://example.com Ä‘á»ƒ mua giÃ¡ 699k.",
    })).toEqual({
      accepted: false,
      reasonCodes: expect.arrayContaining([
        "CUSTOMER_URL_EXPLANATION_RAW_URL",
        "CUSTOMER_URL_EXPLANATION_UNVERIFIED_CLAIM",
      ]),
    });
  });
});
