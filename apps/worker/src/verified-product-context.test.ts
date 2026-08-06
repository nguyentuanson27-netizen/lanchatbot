import { describe, expect, it } from "vitest";
import {
  resolveVerifiedProductContext,
  type VerifiedProductContextCandidate,
  type VerifiedProductContextInput,
} from "./verified-product-context.js";

const now = new Date("2026-08-06T02:00:00.000Z");

function candidate(
  overrides: Partial<VerifiedProductContextCandidate> = {},
): VerifiedProductContextCandidate {
  return {
    productId: "SD398",
    source: "STATE",
    verified: true,
    observedAt: "2026-08-06T01:59:00.000Z",
    expiresAt: "2026-08-06T03:00:00.000Z",
    stateRevision: 12,
    fence: 120,
    ...overrides,
  };
}

function input(
  overrides: Partial<VerifiedProductContextInput> = {},
): VerifiedProductContextInput {
  return {
    candidates: [candidate()],
    expectedStateRevision: 12,
    minimumFence: 120,
    conversationOwner: "BOT",
    hasActiveClarification: false,
    resetRequested: false,
    explicitProductIds: [],
    now,
    ...overrides,
  };
}

describe("resolveVerifiedProductContext", () => {
  it("preserves the verified SD398 state context after grounded schema failure", () => {
    const resolution = resolveVerifiedProductContext(input());

    expect(resolution).toEqual({
      productId: "SD398",
      source: "STATE",
      reasonCodes: ["CONTEXT_SELECTED_STATE"],
    });
  });

  it("prefers current-turn verified evidence over matching state context", () => {
    const resolution = resolveVerifiedProductContext(input({
      candidates: [
        candidate(),
        candidate({
          source: "CURRENT_TURN",
          stateRevision: null,
          fence: 121,
        }),
      ],
    }));

    expect(resolution.source).toBe("CURRENT_TURN");
    expect(resolution.productId).toBe("SD398");
  });

  it("accepts an explicit product switch only when that product is verified", () => {
    const resolution = resolveVerifiedProductContext(input({
      explicitProductIds: ["sd375"],
      candidates: [
        candidate(),
        candidate({
          productId: "SD375",
          source: "MESSAGE_CODE",
          stateRevision: null,
          fence: 121,
        }),
      ],
    }));

    expect(resolution).toEqual({
      productId: "SD375",
      source: "MESSAGE_CODE",
      reasonCodes: ["CONTEXT_EXPLICIT_PRODUCT_VERIFIED"],
    });
  });

  it("does not fall back to the old product when an explicit new code is unverified", () => {
    const resolution = resolveVerifiedProductContext(input({
      explicitProductIds: ["SD375"],
    }));

    expect(resolution.productId).toBeNull();
    expect(resolution.reasonCodes).toContain("CONTEXT_EXPLICIT_PRODUCT_NOT_VERIFIED");
  });

  it("fails closed for stale, revision-mismatched, or stale-fence state", () => {
    const stale = resolveVerifiedProductContext(input({
      candidates: [candidate({ expiresAt: "2026-08-06T01:00:00.000Z" })],
    }));
    const revisionMismatch = resolveVerifiedProductContext(input({
      candidates: [candidate({ stateRevision: 11 })],
    }));
    const staleFence = resolveVerifiedProductContext(input({
      candidates: [candidate({ fence: 119 })],
    }));

    expect(stale.productId).toBeNull();
    expect(stale.reasonCodes).toContain("CONTEXT_CANDIDATE_STALE");
    expect(revisionMismatch.productId).toBeNull();
    expect(revisionMismatch.reasonCodes).toContain("CONTEXT_STATE_REVISION_MISMATCH");
    expect(staleFence.productId).toBeNull();
    expect(staleFence.reasonCodes).toContain("CONTEXT_FENCE_STALE");
  });

  it("fails closed for reset, ambiguity, or human ownership", () => {
    const reset = resolveVerifiedProductContext(input({ resetRequested: true }));
    const clarification = resolveVerifiedProductContext(input({
      hasActiveClarification: true,
    }));
    const human = resolveVerifiedProductContext(input({
      conversationOwner: "HUMAN",
    }));

    expect(reset.reasonCodes).toEqual(["CONTEXT_RESET_REQUESTED"]);
    expect(clarification.reasonCodes).toEqual(["CONTEXT_PRODUCT_AMBIGUOUS"]);
    expect(human.reasonCodes).toEqual(["CONTEXT_OWNER_HUMAN"]);
  });

  it("does not choose among conflicting verified product candidates", () => {
    const resolution = resolveVerifiedProductContext(input({
      candidates: [
        candidate(),
        candidate({
          productId: "SD375",
          source: "PREVIOUS_BOT",
          stateRevision: null,
          fence: 120,
        }),
      ],
    }));

    expect(resolution).toEqual({
      productId: null,
      source: null,
      reasonCodes: ["CONTEXT_CANDIDATES_CONFLICT"],
    });
  });

  it("rejects multiple explicit product references", () => {
    const resolution = resolveVerifiedProductContext(input({
      explicitProductIds: ["SD398", "SD375"],
    }));

    expect(resolution.reasonCodes).toEqual(["CONTEXT_EXPLICIT_MULTI_PRODUCT"]);
    expect(resolution.productId).toBeNull();
  });
});
