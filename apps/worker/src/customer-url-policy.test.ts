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
  readonly expectedDisposition: "CONTINUE" | "VERIFY_ADMIN_MEDIA" |
    "EXPLAIN_UNSUPPORTED" | "HANDOFF";
  readonly expectedClass: "APPROVED_FIRST_PARTY_PRODUCT" | "APPROVED_SHOP_CDN" |
    "UNSUPPORTED_EXTERNAL" | "SUSPICIOUS_DANGEROUS";
  readonly expectedReason: string;
  readonly expectedProductCodes: readonly string[];
  readonly expectedCandidateProductCodes?: readonly string[];
}

const replay = JSON.parse(readFileSync(
  new URL("../../../benchmarks/bf08/classified-customer-url-v1.json", import.meta.url),
  "utf8",
)) as readonly ReplayCase[];

describe("BF-08 classified customer URL policy", () => {
  it("does not intervene in a normal no-URL turn", () => {
    expect(classifyCustomerUrls("please check product SV695", "CLASSIFIED_ALLOWLIST_V1"))
      .toMatchObject({ disposition: "CONTINUE", items: [], reasonCodes: [], productCodes: [] });
    expect(classifyCustomerUrls("size:M; code:SV695", "CLASSIFIED_ALLOWLIST_V1"))
      .toMatchObject({ disposition: "CONTINUE", items: [] });
  });

  it.each([
    ["lanadesign.vn/sv695", "EXPLAIN_UNSUPPORTED"],
    ["example.com/a", "EXPLAIN_UNSUPPORTED"],
    ["//evil.test/path", "EXPLAIN_UNSUPPORTED"],
  ] as const)("classifies and redacts URL form %s", (text, disposition) => {
    expect(classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1").disposition)
      .toBe(disposition);
    expect(redactCustomerUrlsForModel(`check ${text}`)).toBe("check [CUSTOMER_URL]");
  });

  it.each([
    "https:/example.com/a?token=raw-sentinel",
    "https:example.com/a?token=raw-sentinel",
    "www。lanadesign.vn/sv695",
    "https://www.lanadesign.vn/%ZZ",
    "169.254.169.254/latest/meta-data",
    "localhost/admin",
  ])("blocks and redacts malformed or private URL-like input %s", (text) => {
    expect(classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1")).toMatchObject({
      disposition: "HANDOFF",
    });
    expect(redactCustomerUrlsForModel(text)).toBe("[CUSTOMER_URL]");
  });

  it("fails closed when the URL candidate bound is exceeded", () => {
    const text = Array.from({ length: 9 }, (_, index) => `https://example${index}.com/a`).join(" ");
    expect(classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1")).toMatchObject({
      disposition: "HANDOFF",
      reasonCodes: expect.arrayContaining(["CUSTOMER_URL_LIMIT_EXCEEDED"]),
    });
    expect(redactCustomerUrlsForModel(text)).not.toContain("example8.com");
    const approvedThenPrivate = [
      ...Array.from({ length: 8 }, () => "https://www.lanadesign.vn/sv695"),
      "https://169.254.169.254/latest/meta-data",
    ].join(" ");
    expect(classifyCustomerUrls(approvedThenPrivate, "CLASSIFIED_ALLOWLIST_V1")).toMatchObject({
      disposition: "HANDOFF",
      reasonCodes: expect.arrayContaining([
        "CUSTOMER_URL_LIMIT_EXCEEDED",
        "CUSTOMER_URL_PRIVATE_ADDRESS",
      ]),
    });
  });

  it.each(replay)("replays $name", (fixture) => {
    const decision = classifyCustomerUrls(fixture.text, "CLASSIFIED_ALLOWLIST_V1");
    expect(decision).toMatchObject({
      disposition: fixture.expectedDisposition,
      productCodes: fixture.expectedProductCodes,
      candidateProductCodes: fixture.expectedCandidateProductCodes ?? [],
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
      disposition: "VERIFY_ADMIN_MEDIA",
      productCodes: [],
      candidateProductCodes: ["SV695"],
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
    for (const rejected of [
      { ...product, images: [] },
      { ...product, images: [{ ...product.images[0]!, reviewStatus: null }] },
      { ...product, images: [{ ...product.images[0]!, metadataVerified: false }] },
      { ...product, productId: "SD398", canonicalCode: "SD398" },
      { ...product, images: [{ ...product.images[0]!, url: canonicalUrl.replace("0123", "ffff") }] },
    ]) {
      expect(customerUrlItemAuthorizesProduct(item, rejected)).toBe(false);
    }
    expect(customerUrlItemAuthorizesProduct(item, {
      ...product,
      images: [
        { ...product.images[0]!, metadataVerified: false },
        { ...product.images[0]!, role: "ADDITIONAL" as const },
      ],
    })).toBe(true);
    for (const text of [
      "https://admin.lanadesign.vn/private/sv695.jpg",
      "https://admin.lanadesign.vn/lana-public/products/sv695-fake.jpg",
      "https://content.pancake.vn/customer-controlled.jpg",
      "https://scontent.xx.fbcdn.net/customer-controlled.jpg",
    ]) {
      expect(classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1").disposition)
        .toBe("EXPLAIN_UNSUPPORTED");
    }
    expect(classifyCustomerUrls(
      "https://admin.lanadesign.vn/lana-public/products/%2e%2e/secret.jpg",
      "CLASSIFIED_ALLOWLIST_V1",
    ).disposition).toBe("HANDOFF");
  });

  it.each(["jpg", "png", "webp"])("recognizes generated Admin media .%s names", (extension) => {
    expect(classifyCustomerUrls(
      `https://admin.lanadesign.vn/lana-public/products/sv695-0123456789abcdef01234567.${extension}`,
      "CLASSIFIED_ALLOWLIST_V1",
    )).toMatchObject({
      disposition: "VERIFY_ADMIN_MEDIA",
      candidateProductCodes: ["SV695"],
    });
  });

  it.each([
    "https://admin.lanadesign.vn/lana-public/products/sv695-0123456789abcdef0123456.jpg",
    "https://admin.lanadesign.vn/lana-public/products/sv695-0123456789abcdef012345678.jpg",
    "https://admin.lanadesign.vn/lana-public/products/sv695-0123456789ABCDEF01234567.jpg",
    "https://admin.lanadesign.vn/lana-public/products/sv695-0123456789abcdef01234567.gif",
    "https://admin.lanadesign.vn/lana-public/products/sv695-0123456789abcdef01234567.jpg?token=secret",
    "https://admin.lanadesign.vn/lana-public/products%252f..%252fsecret.jpg",
  ])("rejects forged Admin media path %s", (text) => {
    expect(classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1").disposition)
      .not.toBe("VERIFY_ADMIN_MEDIA");
  });

  it.each([
    "javascript:alert(1)",
    "data:text/plain,secret",
    "file:///etc/passwd",
    "ftp://example.com/file",
    "blob:https://example.com/id",
    "https://2130706433/admin",
    "https://0x7f000001/admin",
    "https://[fc00::1]/admin",
    "https://[fe80::1]/admin",
    "https://[::ffff:127.0.0.1]/admin",
    "https://www.lanadesign.vn\\@evil.test/sv695",
    "https://www.lanadesign.vn/products/../sv695",
    "https://www.lanadesign.vn/products/%2e%2e/sv695",
  ])("fails closed for dangerous URL syntax %s", (text) => {
    expect(classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1").disposition).toBe("HANDOFF");
  });

  it.each([
    ["http://www.lanadesign.vn/sv695", "CUSTOMER_URL_HTTPS_REQUIRED", "HANDOFF"],
    ["https://user:secret@www.lanadesign.vn/sv695", "CUSTOMER_URL_CREDENTIALS_FORBIDDEN", "HANDOFF"],
    ["https://www.lanadesign.vn:444/sv695", "CUSTOMER_URL_PORT_FORBIDDEN", "HANDOFF"],
    ["https://lanadesign.vn.evil.test/sv695", "CUSTOMER_URL_DECEPTIVE_HOST", "HANDOFF"],
    ["https://127.0.0.1/admin", "CUSTOMER_URL_PRIVATE_ADDRESS", "HANDOFF"],
    ["https://169.254.169.254/latest/meta-data", "CUSTOMER_URL_PRIVATE_ADDRESS", "HANDOFF"],
    ["https://[::1]/admin", "CUSTOMER_URL_PRIVATE_ADDRESS", "HANDOFF"],
    ["https://xn--lanadesgn-2za.vn/sv695", "CUSTOMER_URL_DECEPTIVE_HOST", "HANDOFF"],
    ["https://example.com/sv695", "CUSTOMER_URL_UNSUPPORTED_EXTERNAL", "EXPLAIN_UNSUPPORTED"],
  ] as const)("classifies %s with %s", (text, reasonCode, disposition) => {
    const decision = classifyCustomerUrls(text, "CLASSIFIED_ALLOWLIST_V1");
    expect(decision.disposition).toBe(disposition);
    expect(decision.reasonCodes).toContain(reasonCode);
  });

  it("fails the whole turn closed when approved and blocked URLs are mixed", () => {
    const decision = classifyCustomerUrls(
      "compare https://www.lanadesign.vn/sv695 with https://example.com/sv695",
      "CLASSIFIED_ALLOWLIST_V1",
    );
    expect(decision).toMatchObject({
      disposition: "EXPLAIN_UNSUPPORTED",
      productCodes: [],
      explanationAllowed: true,
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
    const raw = "check https://user:secret@example.com/a?token=top-secret and www.lanadesign.vn/sv695";
    const redacted = redactCustomerUrlsForModel(raw);
    expect(redacted).toBe("check [CUSTOMER_URL] and [CUSTOMER_URL]");
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
      reply: "I cannot safely open that link. Please send the product code or an image so I can check it.",
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
    expect(verifyCustomerUrlExplanationProposal({ ...proposal, reply: "Open https://example.com for price 699k." })).toEqual({
      accepted: false,
      reasonCodes: expect.arrayContaining([
        "CUSTOMER_URL_EXPLANATION_RAW_URL",
        "CUSTOMER_URL_EXPLANATION_UNVERIFIED_CLAIM",
      ]),
    });
    for (const rejected of [
      { ...proposal, action: "NO_REPLY" as const },
      { ...proposal, productId: "SV695" },
      { ...proposal, handoffReason: "SENSITIVE_CASE" as const },
      { ...proposal, attachments: ["https://example.com/a.jpg"] },
      { ...proposal, businessFactQuery: { ...proposal.businessFactQuery, intent: "PRICE" as const } },
      { ...proposal, protectedClaimIds: ["claim-1"] },
      { ...proposal, reply: "" },
      { ...proposal, reply: "x".repeat(501) },
      { ...proposal, reply: "Visit www.example.com" },
      { ...proposal, reply: "This item is in stock in size M with free shipping tomorrow." },
      { ...proposal, reply: "Send your phone number and address to place the order." },
      { ...proposal, reply: "Mẫu này còn hàng và được miễn phí vận chuyển." },
      { ...proposal, reply: "Chị gửi số điện thoại và địa chỉ để đặt hàng nhé." },
      { ...proposal, reply: "This link is safe, please open it." },
      { ...proposal, reply: "This is our official link. Please send the product code." },
      { ...proposal, reply: "Liên kết này an toàn, chị cứ mở nhé. Chị cũng có thể gửi mã sản phẩm." },
      { ...proposal, reply: "I cannot open that link. Please send the product code. This dress costs less than usual and can ship promptly." },
    ]) {
      expect(verifyCustomerUrlExplanationProposal(rejected).accepted).toBe(false);
    }
  });
});
