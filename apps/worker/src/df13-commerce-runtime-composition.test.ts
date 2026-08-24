import { describe, expect, it, vi } from "vitest";
import {
  behaviorModeContentHash,
  type RuntimeBehaviorModePointer,
  type RuntimeBehaviorModeSourcePort,
} from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import {
  DF13_COMMERCE_SOURCE_ONLY_DISABLED,
  type Df13CommerceActivationAuthority,
} from "./df13-commerce-default-off-consumer.js";
import { Df13CommerceRuntimeExecutor } from "./df13-commerce-runtime-executor.js";
import { createDf13CommerceRuntimeComposition } from "./df13-commerce-runtime-composition.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";
import { selectDf13RuntimeAuthority } from "./df13-runtime-authority-boundary.js";

function pointer(authority: "LEGACY" | "COMMERCE"): RuntimeBehaviorModePointer {
  const payload = {
    confirmationMode: "LEGACY" as const,
    salesAuthorityMode: authority,
    stateReadMode: "LEGACY" as const,
    authorityBundleHash: authority === "COMMERCE"
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
      : null,
  };
  return {
    version: {
      schemaVersion: 1,
      modeVersionId: "10000000-0000-4000-8000-000000000001",
      pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
      channel: DF13_COMMERCE_PREPROD_SCOPE_V1.channel,
      ...payload,
      contentHash: behaviorModeContentHash(payload),
      createdBy: "test",
      reason: "test",
      createdAt: "2026-08-24T00:00:00.000Z",
    },
    pointerRevision: 1,
    updatedBy: "test",
    reason: "test",
    updatedAt: "2026-08-24T00:00:00.000Z",
  };
}

function executor(activationAuthority: Df13CommerceActivationAuthority = DF13_COMMERCE_SOURCE_ONLY_DISABLED) {
  return new Df13CommerceRuntimeExecutor({
    activationAuthority,
    fenceProvider: { acquire: vi.fn() },
    fenceCommitter: { commitAuthorityDependentWork: vi.fn() },
  });
}

describe("DF13 Commerce runtime composition", () => {
  it("binds the real runner-facing resolver to the single executor while default-off rejects Commerce before work", async () => {
    const source: RuntimeBehaviorModeSourcePort = {
      loadActiveMode: vi.fn(async () => pointer("COMMERCE")),
      recordResolution: vi.fn(async () => undefined),
    };
    const commerceExecutor = executor();
    const composition = createDf13CommerceRuntimeComposition({
      source,
      confirmationAllowedPageIds: [DF13_COMMERCE_PREPROD_SCOPE_V1.pageId],
      runtimeAuthorityMode: "LEGACY",
      cacheTtlMs: 5_000,
      lastKnownGoodTtlMs: 300_000,
      commerceExecutor,
    });

    await expect(composition.behaviorModeResolver.resolve({
      resolutionId: "10000000-0000-4000-8000-000000000010",
      pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
      channel: "MESSENGER",
      workerId: "realtime-worker-test",
      now: new Date("2026-08-24T00:00:01.000Z"),
    })).resolves.toMatchObject({
      status: "REJECTED",
      source: "FAIL_SAFE",
      authorityProvenance: "COMMERCE_POINTER",
      reasonCodes: ["RUNTIME_BEHAVIOR_COMMERCE_CONSUMER_REJECTED"],
    });
    expect(composition.commerceExecutor).toBe(commerceExecutor);
  });

  it("preserves a DATABASE LEGACY resolution without calling the Commerce executor", async () => {
    const source: RuntimeBehaviorModeSourcePort = {
      loadActiveMode: vi.fn(async () => pointer("LEGACY")),
    };
    const commerceExecutor = executor();
    const admit = vi.spyOn(commerceExecutor, "admitCommerceAuthority");
    const composition = createDf13CommerceRuntimeComposition({
      source,
      confirmationAllowedPageIds: [DF13_COMMERCE_PREPROD_SCOPE_V1.pageId],
      runtimeAuthorityMode: "LEGACY",
      cacheTtlMs: 5_000,
      lastKnownGoodTtlMs: 300_000,
      commerceExecutor,
    });

    await expect(composition.behaviorModeResolver.resolve({
      resolutionId: "10000000-0000-4000-8000-000000000011",
      pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
      channel: "MESSENGER",
      workerId: "realtime-worker-test",
      now: new Date("2026-08-24T00:00:01.000Z"),
    })).resolves.toMatchObject({
      status: "RESOLVED",
      source: "DATABASE",
      salesAuthorityMode: "LEGACY",
      authorityProvenance: "LEGACY_POINTER",
    });
    expect(admit).not.toHaveBeenCalled();
  });

  it("uses a fresh DATABASE read for every Commerce authority decision after startup", async () => {
    const source: RuntimeBehaviorModeSourcePort = {
      loadActiveMode: vi.fn(async () => pointer("COMMERCE")),
      recordResolution: vi.fn(async () => undefined),
    };
    const commerceExecutor = executor({
      authorizeExactCommerceIdentity: vi.fn(async () => ({ status: "ADMITTED" as const })),
      authorizeExactCommerceRequest: vi.fn(async () => ({ status: "ADMITTED" as const })),
    });
    const composition = createDf13CommerceRuntimeComposition({
      source,
      confirmationAllowedPageIds: [DF13_COMMERCE_PREPROD_SCOPE_V1.pageId],
      runtimeAuthorityMode: "COMMERCE",
      cacheTtlMs: 5_000,
      lastKnownGoodTtlMs: 300_000,
      commerceExecutor,
    });
    const resolve = (resolutionId: string) => composition.behaviorModeResolver.resolve({
      resolutionId,
      pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
      channel: "MESSENGER",
      workerId: "realtime-worker-test",
      now: new Date("2026-08-24T00:00:01.000Z"),
    });

    const preflight = await resolve("10000000-0000-4000-8000-000000000012");
    const turn = await resolve("10000000-0000-4000-8000-000000000013");

    expect(preflight.source).toBe("DATABASE");
    expect(turn.source).toBe("DATABASE");
    expect(selectDf13RuntimeAuthority({
      pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
      channel: "MESSENGER",
      resolution: preflight,
    }).status).toBe("COMMERCE_SELECTED");
    expect(selectDf13RuntimeAuthority({
      pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
      channel: "MESSENGER",
      resolution: turn,
    }).status).toBe("COMMERCE_SELECTED");
    expect(source.loadActiveMode).toHaveBeenCalledTimes(2);
  });
});
