import { describe, expect, it, vi } from "vitest";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { Df13CommerceFreshProcessExecutor } from "./df13-commerce-fresh-process-executor.js";

const exactIdentity = {
  pageId: "1198992073286645",
  channel: "MESSENGER",
  modeVersionId: "10000000-0000-4000-8000-000000000001",
  contentHash: `sha256:${"a".repeat(64)}`,
  authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
  pointerRevision: 4,
  source: "DATABASE" as const,
};

describe("Df13CommerceFreshProcessExecutor", () => {
  it("uses only the immutable startup authority and never needs a per-turn fence provider", async () => {
    const authorizeExactCommerceIdentity = vi.fn(async () => ({ status: "ADMITTED" as const }));
    const executor = new Df13CommerceFreshProcessExecutor({
      activationAuthority: {
        authorizeExactCommerceIdentity,
        authorizeExactCommerceRequest: vi.fn(),
      },
    });

    await expect(executor.admitCommerceAuthority(exactIdentity)).resolves.toEqual({ status: "ADMITTED" });
    await expect(executor.assertExactCommerceAuthority(exactIdentity)).resolves.toEqual({ status: "ADMITTED" });
    expect(authorizeExactCommerceIdentity).toHaveBeenCalledTimes(2);
  });

  it("returns the activation block without falling back to LEGACY", async () => {
    const executor = new Df13CommerceFreshProcessExecutor({
      activationAuthority: {
        authorizeExactCommerceIdentity: vi.fn(async () => ({
          status: "BLOCKED" as const,
          reasonCode: "DF13_COMMERCE_RELEASE_EVIDENCE_INVALID",
        })),
        authorizeExactCommerceRequest: vi.fn(),
      },
    });

    await expect(executor.assertExactCommerceAuthority(exactIdentity)).resolves.toEqual({
      status: "BLOCKED",
      reasonCode: "DF13_COMMERCE_RELEASE_EVIDENCE_INVALID",
    });
  });
});
