import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runtimeBehaviorModeContentHash } from "@lana/database";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { parseDf13CommercePreprodStartupInput } from "./df13-commerce-preprod-startup-authority.js";
import {
  executeDf13FirstPreprodCommerceVersionPreparationCli,
  parseDf13FirstPreprodCommerceVersionPreparationJson,
} from "./df13-first-preprod-commerce-version-preparer-cli.js";
import { createDf13FirstPreprodOperationProof } from "./df13-first-preprod-behavior-writer.js";
import { prepareDf13ReleaseCandidateEvidence, type Df13ReleaseCandidateSourceReader } from "./df13-release-candidate-evidence.js";

const revision = "a".repeat(40);
const root = fileURLToPath(new URL("../../..", import.meta.url));
const pageId = "1198992073286645";
const channel = "MESSENGER";

async function file(path: string): Promise<string> {
  return readFile(resolve(root, path), "utf8");
}

function blobOid(content: string): string {
  return createHash("sha1")
    .update(`blob ${Buffer.byteLength(content, "utf8")}\0${content}`, "utf8")
    .digest("hex");
}

const reader: Df13ReleaseCandidateSourceReader = {
  async refreshTrustedRef() {},
  async resolveRef() { return revision; },
  async resolveTreeOid() { return "b".repeat(40); },
  readBlob: async (_revision, path) => file(path),
  resolveBlobOid: async (_revision, path) => blobOid(await file(path)),
};

describe("DF13 first-PREPROD COMMERCE version preparer CLI", () => {
  it("accepts only the dedicated prepare operation document shape", () => {
    expect(() => parseDf13FirstPreprodCommerceVersionPreparationJson({
      kind: "PREPARE_COMMERCE",
      proof: {},
      expectedCurrent: {},
      releaseEvidence: {},
      releaseSource: {},
    })).not.toThrow();
    expect(() => parseDf13FirstPreprodCommerceVersionPreparationJson({
      kind: "ACTIVATE_COMMERCE",
      proof: {},
      expectedCurrent: {},
      releaseEvidence: {},
      releaseSource: {},
    })).toThrow("DF13_FIRST_PREPROD_PREPARER_OPERATION_KIND_INVALID");
    expect(() => parseDf13FirstPreprodCommerceVersionPreparationJson({
      kind: "PREPARE_COMMERCE",
      proof: {},
      expectedCurrent: {},
      releaseEvidence: {},
      releaseSource: {},
      unexpected: true,
    })).toThrow("DF13_FIRST_PREPROD_PREPARER_OPERATION_INVALID");
  });

  it("binds a prepared COMMERCE version into an immutable startup package without moving a pointer", async () => {
    const legacyPayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "LEGACY" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: null,
    };
    const commercePayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
    };
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: revision,
      git: reader,
    });
    const operation = {
      kind: "PREPARE_COMMERCE" as const,
      proof: createDf13FirstPreprodOperationProof({
        operationId: "10000000-0000-4000-8000-000000000010",
        pageId,
        channel,
        authorityConsumerServiceIds: ["realtime-worker"],
        admission: "SEALED",
        queuedEligibleWork: 0,
        inFlightEligibleWork: 0,
        unreconciledEligibleWork: 0,
        processState: "STOPPED",
        verifiedAt: new Date().toISOString(),
      }),
      expectedCurrent: {
        pageId,
        channel,
        modeVersionId: "10000000-0000-4000-8000-000000000001",
        ...legacyPayload,
        contentHash: runtimeBehaviorModeContentHash(legacyPayload),
        pointerRevision: 3,
      },
      releaseEvidence: evidence,
      releaseSource: {
        schemaVersion: 1 as const,
        release: "df13-preprod-test",
        repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
        tag: "df13-preprod-test",
        commit: revision,
        createdAt: "2026-08-25T00:00:00.000Z",
      },
    };
    const port = {
      readCurrent: vi.fn(async () => ({
        ...operation.expectedCurrent,
        updatedBy: "known-good",
        reason: "known-good",
        updatedAt: "2026-08-24T00:00:00.000Z",
      })),
      prepareExact: vi.fn(async () => ({
        pageId,
        channel,
        modeVersionId: "10000000-0000-4000-8000-000000000002",
        ...commercePayload,
        contentHash: runtimeBehaviorModeContentHash(commercePayload),
      })),
    };

    const result = await executeDf13FirstPreprodCommerceVersionPreparationCli({ operation, port });

    expect(result).toMatchObject({
      status: "PREPARED_POINTER_UNCHANGED",
      startup: {
        mode: "COMMERCE",
        expectedAuthority: {
          pointerRevision: 4,
          authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        },
      },
    });
    expect(parseDf13CommercePreprodStartupInput(result.startup)).toMatchObject({
      mode: "COMMERCE",
      expectedAuthority: { modeVersionId: "10000000-0000-4000-8000-000000000002" },
    });
    expect(port.prepareExact).toHaveBeenCalledOnce();
  });
});
