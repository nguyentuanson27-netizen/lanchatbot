import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import { behaviorModeContentHash } from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1, DF13_COMMERCE_AUTHORITY_BUNDLE_V2 } from "./df13-commerce-authority-bundle.js";
import { createTrackBReleaseLocalRollbackRecord } from "./track-b-commerce-authority-activation.js";
import { TRACK_B_RUNTIME_CONFIG_KEYS_V1 } from "./track-b-commerce-authority-preprod-adapter.js";
import { parseTrackBPreprodBuildInput, parseTrackBPreprodOperationPacket } from "./track-b-commerce-authority-preprod-cli.js";

vi.mock("./track-b-release-candidate-evidence.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./track-b-release-candidate-evidence.js")>(),
  validateTrackBReleaseCandidateEvidence: vi.fn(() => ({ status: "MATCHED", reasonCodes: [] })),
}));

function pointer(versionId: string, revision: number, authorityBundleHash: string) {
  const payload = { confirmationMode: "V2_ACTIVE" as const, salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const, authorityBundleHash };
  return { version: { schemaVersion: 1 as const, modeVersionId: versionId,
    pageId: "1198992073286645", channel: "MESSENGER", ...payload,
    contentHash: behaviorModeContentHash(payload), createdBy: "operator", reason: "prepared",
    createdAt: "2026-09-02T00:00:00.000Z" }, pointerRevision: revision,
  updatedBy: "operator", reason: "active", updatedAt: "2026-09-02T00:00:00.000Z" };
}

function packet() {
  const previous = pointer("10000000-0000-4000-8000-000000000001", 6,
    DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash);
  const target = pointer("10000000-0000-4000-8000-000000000002", 7,
    DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash);
  const rollbackRecord = createTrackBReleaseLocalRollbackRecord({ selectedSourceCommit: "5".repeat(40),
    previousService: { service: "realtime-worker", releaseRevision: "1".repeat(40),
      buildId: "2".repeat(64), imageId: "3".repeat(64), runtimeConfigHash: "4".repeat(64) },
    targetService: { service: "realtime-worker", releaseRevision: "5".repeat(40),
      buildId: "6".repeat(64), imageId: "7".repeat(64), runtimeConfigHash: "8".repeat(64) },
    previousAuthority: { modeVersionId: previous.version.modeVersionId,
      contentHash: previous.version.contentHash, bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash },
    targetAuthority: { modeVersionId: target.version.modeVersionId,
      contentHash: target.version.contentHash, bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash } });
  const body = {
    schemaVersion: 1,
    contractVersion: "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V1",
    environment: "ENGINEERING_PREPROD",
    pageId: "1198992073286645",
    channel: "MESSENGER",
    operationId: "10000000-0000-4000-8000-000000000001",
    previous, target, rollbackRecord,
    previousImageTag: "lana-chatbot-app:track-b-previous",
    targetImageTag: "lana-chatbot-app:track-b-target",
    releaseTag: "track-b-v22-release",
    releaseCreatedAt: "2026-09-02T00:00:00.000Z",
    previousStartupPackageFile: "/opt/lana-chatbot/releases/track-b/previous.json",
    targetStartupPackageFile: "/opt/lana-chatbot/releases/track-b/target.json",
    releaseEvidence: { activationReleaseRevision: "5".repeat(40) },
  };
  return { ...body, packetHash: createHash("sha256")
    .update(canonicalJsonV1(body), "utf8").digest("hex") };
}

describe("Track B PREPROD operator packet boundary", () => {
  it("accepts a fixed-scope build input only with the exact non-secret runtime projection", () => {
    const runtimeConfig = Object.fromEntries(TRACK_B_RUNTIME_CONFIG_KEYS_V1.map((key) => [key, "pinned"]));
    expect(parseTrackBPreprodBuildInput({ schemaVersion: 1, environment: "ENGINEERING_PREPROD",
      pageId: "1198992073286645", channel: "MESSENGER", sourceCommit: "1".repeat(40),
      sourceTree: "2".repeat(40), imageTag: "lana-chatbot-app:track-b-target", runtimeConfig }))
      .toMatchObject({ environment: "ENGINEERING_PREPROD", runtimeConfig });
    expect(() => parseTrackBPreprodBuildInput({ schemaVersion: 1,
      environment: "PUBLIC_PRODUCTION", pageId: "1198992073286645", channel: "MESSENGER",
      sourceCommit: "1".repeat(40), sourceTree: "2".repeat(40),
      imageTag: "lana-chatbot-app:track-b-target", runtimeConfig }))
      .toThrow("TRACK_B_B3_2_BUILD_INPUT_INVALID");
  });

  it("accepts only a self-hashed fixed PREPROD/page/channel packet", () => {
    expect(parseTrackBPreprodOperationPacket(packet())).toMatchObject({
      environment: "ENGINEERING_PREPROD", pageId: "1198992073286645", channel: "MESSENGER",
    });
  });

  it("rejects public-production scope even with a recomputed hash", () => {
    const { packetHash: _old, ...body } = { ...packet(), environment: "PUBLIC_PRODUCTION" };
    const changed = { ...body, packetHash: createHash("sha256")
      .update(canonicalJsonV1(body), "utf8").digest("hex") };
    expect(() => parseTrackBPreprodOperationPacket(changed))
      .toThrow("TRACK_B_B3_2_OPERATION_PACKET_INVALID");
  });

  it("rejects packet substitution and startup traversal", () => {
    expect(() => parseTrackBPreprodOperationPacket({ ...packet(), operationId:
      "20000000-0000-4000-8000-000000000001" }))
      .toThrow("TRACK_B_B3_2_OPERATION_PACKET_HASH_MISMATCH");
    const { packetHash: _old, ...body } = { ...packet(), targetStartupPackageFile:
      "/opt/lana-chatbot/releases/track-b/../secrets.json" };
    const changed = { ...body, packetHash: createHash("sha256")
      .update(canonicalJsonV1(body), "utf8").digest("hex") };
    expect(() => parseTrackBPreprodOperationPacket(changed))
      .toThrow("TRACK_B_B3_2_STARTUP_PACKAGE_PATH_INVALID");
  });

  it("rejects a self-hashed packet with an invalid authority envelope before execution", () => {
    const { packetHash: _old, ...body } = { ...packet(), target: {} };
    const changed = { ...body, packetHash: createHash("sha256")
      .update(canonicalJsonV1(body), "utf8").digest("hex") };
    expect(() => parseTrackBPreprodOperationPacket(changed))
      .toThrow("TRACK_B_B3_2_OPERATION_PACKET_ENVELOPE_INVALID");
  });
});
