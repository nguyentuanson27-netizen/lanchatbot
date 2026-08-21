import { describe, expect, it } from "vitest";
import {
  compareCommerceAuthority,
  projectCommerceAuthorityCandidate,
  type CommerceAuthorityCandidate,
} from "./commerce-authority-comparison.js";

const pageId = "1198992073286645";
const conversationId = "conversation-1";

function commerceCandidate(
  overrides: Partial<CommerceAuthorityCandidate> = {},
): CommerceAuthorityCandidate {
  return {
    pageId,
    conversationId,
    revision: 4,
    stage: "CART_OPEN",
    productScope: { kind: "SINGLE", productId: "CB182" },
    artifacts: {
      hasCart: true,
      hasOrderPreview: false,
      hasPurchaseConfirmation: false,
    },
    ...overrides,
  };
}

describe("DF11 commerce authority comparison", () => {
  it("is disabled by default and cannot select COMMERCE or plan side effects", () => {
    expect(compareCommerceAuthority({
      legacy: {
        pageId,
        conversationId,
        owner: "BOT",
        stage: "READY_TO_BUY",
        productId: "CB182",
      },
      commerce: null,
    })).toEqual({
      contractVersion: "COMMERCE_AUTHORITY_COMPARISON_V1",
      status: "DISABLED",
      activeAuthority: "LEGACY",
      candidateAuthority: "COMMERCE",
      sideEffects: "DISABLED",
      differences: [],
    });
  });

  it("compares equivalent legacy and commerce projections without changing authority", () => {
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: {
        pageId,
        conversationId,
        owner: "BOT",
        stage: "READY_TO_BUY",
        productId: "CB182",
      },
      commerce: commerceCandidate(),
    })).toEqual({
      contractVersion: "COMMERCE_AUTHORITY_COMPARISON_V1",
      status: "MATCH",
      activeAuthority: "LEGACY",
      candidateAuthority: "COMMERCE",
      sideEffects: "DISABLED",
      differences: [],
    });
  });

  it("reports a missing commerce candidate without falling back to a second authority", () => {
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: {
        pageId,
        conversationId,
        owner: "BOT",
        stage: "READY_TO_BUY",
        productId: "CB182",
      },
      commerce: null,
    })).toEqual({
      contractVersion: "COMMERCE_AUTHORITY_COMPARISON_V1",
      status: "COMMERCE_STATE_UNAVAILABLE",
      activeAuthority: "LEGACY",
      candidateAuthority: "COMMERCE",
      sideEffects: "DISABLED",
      differences: ["COMMERCE_STATE_UNAVAILABLE"],
    });
  });

  it("reports phase, product, and scope divergence as non-authoritative evidence", () => {
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: {
        pageId,
        conversationId,
        owner: "BOT",
        stage: "ORDER_REVIEW",
        productId: "CB182",
      },
      commerce: commerceCandidate({
        pageId: "other-page",
        conversationId: "other-conversation",
        stage: "CART_OPEN",
        productScope: { kind: "SINGLE", productId: "CB183" },
      }),
    })).toEqual({
      contractVersion: "COMMERCE_AUTHORITY_COMPARISON_V1",
      status: "MISMATCH",
      activeAuthority: "LEGACY",
      candidateAuthority: "COMMERCE",
      sideEffects: "DISABLED",
      differences: [
        "COMMERCE_SCOPE_MISMATCH",
        "PHASE_MISMATCH",
        "PRODUCT_SCOPE_MISMATCH",
      ],
    });
  });

  it.each([
    ["discovery", "BOT", "DISCOVERY", commerceCandidate({
      stage: "DISCOVERY",
      productScope: { kind: "NONE" },
      artifacts: { hasCart: false, hasOrderPreview: false, hasPurchaseConfirmation: false },
    })],
    ["product evaluation", "BOT", "PRODUCT_MATCHED", commerceCandidate({
      stage: "FACTS_PRESENTED",
      productScope: { kind: "NONE" },
      artifacts: { hasCart: false, hasOrderPreview: false, hasPurchaseConfirmation: false },
    })],
    ["fit consultation", "BOT", "FIT_CONSULTING", commerceCandidate({
      stage: "SIZE_RECOMMENDED",
      productScope: { kind: "NONE" },
      artifacts: { hasCart: false, hasOrderPreview: false, hasPurchaseConfirmation: false },
    })],
    ["cart active", "BOT", "READY_TO_BUY", commerceCandidate()],
    ["order review", "BOT", "ORDER_REVIEW", commerceCandidate({
      stage: "ORDER_PREVIEW",
      artifacts: { hasCart: true, hasOrderPreview: true, hasPurchaseConfirmation: false },
    })],
    ["human echo retains order phase through handoff", "HUMAN", "ORDER_REVIEW", commerceCandidate({
      stage: "HANDED_OFF",
      artifacts: { hasCart: true, hasOrderPreview: true, hasPurchaseConfirmation: false },
    })],
  ] as const)("matches canonical %s without treating ownership as phase", (_name, owner, stage, commerce) => {
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: { pageId, conversationId, owner, stage, productId: commerce.productScope.kind === "SINGLE" ? commerce.productScope.productId : null },
      commerce,
    })).toMatchObject({ status: "MATCH", differences: [] });
  });

  it.each([
    ["legacy objection handling", "BOT", "OBJECTION_HANDLING", commerceCandidate({
      stage: "FACTS_PRESENTED",
      productScope: { kind: "NONE" },
      artifacts: { hasCart: false, hasOrderPreview: false, hasPurchaseConfirmation: false },
    }), "LEGACY_PHASE_UNCOMPARABLE"],
    ["legacy post-sale", "HUMAN", "POST_SALE", commerceCandidate({
      stage: "PURCHASE_CONFIRMED",
      artifacts: { hasCart: true, hasOrderPreview: true, hasPurchaseConfirmation: true },
    }), "LEGACY_PHASE_UNCOMPARABLE"],
    ["product evaluation versus fit consultation", "BOT", "PRODUCT_MATCHED", commerceCandidate({
      stage: "SIZE_RECOMMENDED",
      productScope: { kind: "NONE" },
      artifacts: { hasCart: false, hasOrderPreview: false, hasPurchaseConfirmation: false },
    }), "PHASE_MISMATCH"],
    ["invalid commerce artifacts", "BOT", "READY_TO_BUY", commerceCandidate({
      stage: "CART_OPEN",
      artifacts: { hasCart: false, hasOrderPreview: false, hasPurchaseConfirmation: false },
    }), "COMMERCE_PHASE_UNAVAILABLE"],
  ] as const)("fails closed for %s", (_name, owner, stage, commerce, expectedDifference) => {
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: { pageId, conversationId, owner, stage, productId: commerce.productScope.kind === "SINGLE" ? commerce.productScope.productId : null },
      commerce,
    })).toMatchObject({ status: "MISMATCH", differences: [expectedDifference] });
  });

  it("fails closed for present empty, multiple, and asymmetric product scope", () => {
    const zeroProduct = projectCommerceAuthorityCandidate({
      routing: { pageId, conversationId }, revision: 8, stage: "CART_OPEN",
      cart: { value: { lines: [] } }, hasOrderPreview: false, hasPurchaseConfirmation: false,
    });
    const multiProduct = projectCommerceAuthorityCandidate({
      routing: { pageId, conversationId }, revision: 8, stage: "CART_OPEN",
      cart: { value: { lines: [{ parentProductId: "CB182" }, { parentProductId: "CB183" }] } },
      hasOrderPreview: false, hasPurchaseConfirmation: false,
    });
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: { pageId, conversationId, owner: "BOT", stage: "READY_TO_BUY", productId: null },
      commerce: zeroProduct,
    })).toMatchObject({ status: "MISMATCH", differences: ["PRODUCT_SCOPE_UNAVAILABLE"] });
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: { pageId, conversationId, owner: "BOT", stage: "READY_TO_BUY", productId: null },
      commerce: multiProduct,
    })).toMatchObject({ status: "MISMATCH", differences: ["PRODUCT_SCOPE_UNAVAILABLE"] });
    expect(compareCommerceAuthority({
      enabled: true,
      legacy: { pageId, conversationId, owner: "BOT", stage: "READY_TO_BUY", productId: null },
      commerce: commerceCandidate(),
    })).toMatchObject({ status: "MISMATCH", differences: ["PRODUCT_SCOPE_MISMATCH"] });
  });

  it("projects only authority-relevant commerce state and never checkout recipient data", () => {
    expect(projectCommerceAuthorityCandidate({
      routing: { pageId, conversationId },
      revision: 8,
      stage: "ORDER_PREVIEW",
      cart: { value: { lines: [{ parentProductId: "CB182" }] } },
      hasOrderPreview: true,
      hasPurchaseConfirmation: false,
    })).toEqual({
      pageId,
      conversationId,
      revision: 8,
      stage: "ORDER_PREVIEW",
      productScope: { kind: "SINGLE", productId: "CB182" },
      artifacts: { hasCart: true, hasOrderPreview: true, hasPurchaseConfirmation: false },
    });
  });
});
