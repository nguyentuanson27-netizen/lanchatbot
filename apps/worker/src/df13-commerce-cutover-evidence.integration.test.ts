import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { behaviorModeContentHash, type RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import { describe, expect, it } from "vitest";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  DF13_COMMERCE_PREPROD_SCOPE_V1,
  GATE_E_PREPROD_V15_BINDING,
  executeCommerceCutover,
  type CommerceCutoverPorts,
} from "./df13-commerce-cutover.js";
import type { Df13ReleaseCandidateSourceReader } from "./df13-release-candidate-evidence.js";

const pageId = DF13_COMMERCE_PREPROD_SCOPE_V1.pageId;
const activationReleaseRevision = "a".repeat(40);
const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function readSourceFile(path: string): Promise<string> {
  return readFile(resolve(sourceRoot, path), "utf8");
}

function gitBlobOid(content: string): string {
  return createHash("sha1")
    .update("blob " + Buffer.byteLength(content, "utf8") + String.fromCharCode(0) + content, "utf8")
    .digest("hex");
}

function sourceReader(
  transformManifest: (content: string) => string = (content) => content,
): Df13ReleaseCandidateSourceReader {
  async function content(path: string): Promise<string> {
    const source = await readSourceFile(path);
    return path === "evaluation/gate-e/df10-v15/manifest.json"
      ? transformManifest(source)
      : source;
  }
  return {
    async refreshTrustedRef() {},
    async resolveRef() { return activationReleaseRevision; },
    async readBlob(_revision, path) { return content(path); },
    async resolveBlobOid(_revision, path) { return gitBlobOid(await content(path)); },
  };
}

function pointer(
  salesAuthorityMode: "LEGACY" | "COMMERCE",
  pointerRevision: number,
): RuntimeBehaviorModePointer {
  const payload = {
    confirmationMode: "V2_ACTIVE" as const,
    salesAuthorityMode,
    stateReadMode: "LEGACY" as const,
    authorityBundleHash: salesAuthorityMode === "COMMERCE"
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
      : null,
  };
  return {
    version: {
      schemaVersion: 1,
      modeVersionId: `20000000-0000-4000-8000-${String(pointerRevision).padStart(12, "0")}`,
      pageId,
      channel: "MESSENGER",
      ...payload,
      contentHash: behaviorModeContentHash(payload),
      createdBy: "integration-test",
      reason: "source-only evidence seam",
      createdAt: "2026-08-23T00:00:00.000Z",
    },
    pointerRevision,
    updatedBy: "integration-test",
    reason: "source-only evidence seam",
    updatedAt: "2026-08-23T00:00:00.000Z",
  };
}

function preflightInput() {
  return {
    pageId,
    channel: "MESSENGER",
    currentPointer: pointer("LEGACY", 5),
    targetPointer: pointer("COMMERCE", 6),
    candidate: {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision,
    },
    missingCommerceSignal: {
      contractVersion: "MISSING_COMMERCE_SIGNAL_V1" as const,
      status: "COMMERCE_STATE_PRESENT" as const,
      activeAuthority: "LEGACY" as const,
      candidateAuthority: "COMMERCE" as const,
      sideEffects: "DISABLED" as const,
      futureCommerceDisposition: "SATISFIED" as const,
      canonicalIntentFingerprint: "a".repeat(64),
      commerceContentFingerprint: "b".repeat(64),
      reasonCodes: ["COMMERCE_STATE_PRESENT"],
    },
    verification: {
      transitionMatrixPassed: true,
      bfDfReplayPassed: true,
      rollbackVerified: true,
    },
  } as const;
}

function ports(
  releaseCandidateSource: Df13ReleaseCandidateSourceReader,
  onHold: () => void = () => undefined,
): CommerceCutoverPorts {
  const target = pointer("COMMERCE", 6);
  return {
    releaseCandidateSource,
    async holdAuthorityDependentWork() {
      onHold();
      return { status: "HELD", fenceToken: "fence-integration" };
    },
    async proveQuiescence() {
      return { status: "QUIESCENT", inFlightAuthorityDependentWork: 0, queuedWork: "HELD" };
    },
    async activateCommerce() { return { status: "ACKNOWLEDGED" }; },
    async readActivePointer() { return target; },
    async readActivationAudit() { return "EXACT"; },
    async readConsumerAuthorities() {
      return DF13_COMMERCE_AUTHORITY_CONSUMERS_V1.map((consumer) => ({
        consumer,
        source: "DATABASE" as const,
        modeVersionId: target.version.modeVersionId,
        contentHash: target.version.contentHash,
        pointerRevision: target.pointerRevision,
        salesAuthorityMode: "COMMERCE" as const,
        stateReadMode: "LEGACY" as const,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      }));
    },
    async rollbackToLegacy() { return { status: "ACKNOWLEDGED" }; },
    async releaseAuthorityDependentWork() {},
  };
}

describe("DF13 cutover release-evidence seam", () => {
  it("executes the real evidence prepare/validate path before the source-only cutover protocol", async () => {
    await expect(executeCommerceCutover({
      preflight: preflightInput(),
      ports: ports(sourceReader()),
    })).resolves.toMatchObject({
      status: "COMMERCE_ACTIVE",
      sideEffects: "CONTROL_PLANE_ONLY",
    });
  });

  it("preserves a definitive manifest-integrity reason and never acquires the fence", async () => {
    let held = false;
    const reader = sourceReader((content) => {
      const manifest = JSON.parse(content) as Record<string, unknown>;
      delete manifest.corpusHash;
      return JSON.stringify(manifest);
    });

    await expect(executeCommerceCutover({
      preflight: preflightInput(),
      ports: ports(reader, () => { held = true; }),
    })).resolves.toMatchObject({
      status: "BLOCKED_LEGACY",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: [
        "DF13_GATE_E_MANIFEST_IDENTITY_MISMATCH",
        "DF13_GATE_E_MANIFEST_FIELD_MISMATCH",
      ],
    });
    expect(held).toBe(false);
  });
});
