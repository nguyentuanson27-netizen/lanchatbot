import { describe, expect, it, vi } from "vitest";
import { runtimeBehaviorModeContentHash } from "@lana/database";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import {
  createDf13FirstPreprodOperationProof,
} from "./df13-first-preprod-behavior-writer.js";
import {
  executeDf13FirstPreprodCommerceVersionPreparation,
  type Df13FirstPreprodCommerceVersionPreparerPort,
} from "./df13-first-preprod-commerce-version-preparer.js";

const pageId = "1198992073286645";
const channel = "MESSENGER";
const legacyPayload = {
  confirmationMode: "V2_ACTIVE" as const,
  salesAuthorityMode: "LEGACY" as const,
  stateReadMode: "LEGACY" as const,
  authorityBundleHash: null,
};

const legacy = {
  ...legacyPayload,
  pageId,
  channel,
  modeVersionId: "10000000-0000-4000-8000-000000000001",
  contentHash: runtimeBehaviorModeContentHash(legacyPayload),
  pointerRevision: 3,
};

function proof(verifiedAt = new Date().toISOString()) {
  return createDf13FirstPreprodOperationProof({
    operationId: "10000000-0000-4000-8000-000000000010",
    pageId,
    channel,
    authorityConsumerServiceIds: ["realtime-worker"],
    admission: "SEALED",
    queuedEligibleWork: 0,
    inFlightEligibleWork: 0,
    unreconciledEligibleWork: 0,
    processState: "STOPPED",
    verifiedAt,
  });
}

describe("DF13 first-PREPROD COMMERCE version preparer", () => {
  it("creates the immutable exact COMMERCE target without moving the LEGACY pointer", async () => {
    const port: Df13FirstPreprodCommerceVersionPreparerPort = {
      readCurrent: vi.fn(async () => legacy),
      prepareExact: vi.fn(async () => ({
        pageId,
        channel,
        modeVersionId: "10000000-0000-4000-8000-000000000002",
        confirmationMode: "V2_ACTIVE" as const,
        salesAuthorityMode: "COMMERCE" as const,
        stateReadMode: "LEGACY" as const,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        contentHash: runtimeBehaviorModeContentHash({
          confirmationMode: "V2_ACTIVE",
          salesAuthorityMode: "COMMERCE",
          stateReadMode: "LEGACY",
          authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        }),
      })),
    };

    const result = await executeDf13FirstPreprodCommerceVersionPreparation({
      proof: proof(),
      expectedCurrent: legacy,
      port,
    });

    expect(result).toMatchObject({
      status: "PREPARED",
      version: {
        salesAuthorityMode: "COMMERCE",
        stateReadMode: "LEGACY",
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
    });
    expect(port.prepareExact).toHaveBeenCalledTimes(1);
  });
});
