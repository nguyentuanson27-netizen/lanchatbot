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
    productId: "CB182",
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
        productId: "CB183",
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

  it("projects only authority-relevant commerce state and never checkout recipient data", () => {
    expect(projectCommerceAuthorityCandidate({
      routing: { pageId, conversationId },
      revision: 8,
      stage: "ORDER_PREVIEW",
      cart: { value: { lines: [{ parentProductId: "CB182" }] } },
    })).toEqual({
      pageId,
      conversationId,
      revision: 8,
      stage: "ORDER_PREVIEW",
      productId: "CB182",
    });
  });
});
