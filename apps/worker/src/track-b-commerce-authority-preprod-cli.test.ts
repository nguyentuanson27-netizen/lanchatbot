import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import { behaviorModeContentHash } from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1, DF13_COMMERCE_AUTHORITY_BUNDLE_V2 } from "./df13-commerce-authority-bundle.js";
import { createTrackBReleaseLocalRollbackRecord } from "./track-b-commerce-authority-activation.js";
import { TRACK_B_RUNTIME_CONFIG_KEYS_V1 } from "./track-b-commerce-authority-preprod-adapter.js";
import { createTrackBPreprodOperationStartupPackages, parseTrackBPreprodBuildInput,
  parseTrackBPreprodOperationPacket,
  parseTrackBPreprodPrepareInput,
  trackBLegacyRuntimeReleaseIdV1,
  validateTrackBPreprodStartupArtifacts } from "./track-b-commerce-authority-preprod-cli.js";

vi.mock("./track-b-release-candidate-evidence.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./track-b-release-candidate-evidence.js")>(),
  validateTrackBReleaseCandidateEvidence: vi.fn((evidence: Record<string, unknown>) =>
    evidence.invalid === true
      ? { status: "MISMATCH", reasonCodes: ["TEST_INVALID_EVIDENCE"] }
      : { status: "MATCHED", reasonCodes: [] }),
}));

vi.mock("./df13-release-candidate-evidence.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./df13-release-candidate-evidence.js")>(),
  validateDf13ReleaseCandidateEvidence: vi.fn(() => ({ status: "MATCHED", reasonCodes: [] })),
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
    direction: "ACTIVATE_TRACK_B",
    previous, target, rollbackRecord,
    previousImageTag: "lana-chatbot-app:track-b-previous",
    targetImageTag: "lana-chatbot-app:track-b-target",
    releaseTag: "track-b-v22-release",
    releaseCreatedAt: "2026-09-02T00:00:00.000Z",
    sourceStartupPackageFile: "/opt/lana-chatbot/releases/track-b/previous.json",
    sourceStartupPackageHash: "a".repeat(64),
    operationTargetStartupPackageFile: "/opt/lana-chatbot/releases/track-b/target.json",
    operationTargetStartupPackageHash: "b".repeat(64),
    recoveryStartupPackageFile: "/opt/lana-chatbot/releases/track-b/recovery.json",
    recoveryStartupPackageHash: "c".repeat(64),
    releaseEvidence: { contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1",
      activationReleaseRevision: "5".repeat(40),
      releaseSource: { resolvedRevision: "5".repeat(40) } },
  };
  return { ...body, packetHash: createHash("sha256")
    .update(canonicalJsonV1(body), "utf8").digest("hex") };
}

function legacyStartup(activation: ReturnType<typeof packet>):
  Parameters<typeof trackBLegacyRuntimeReleaseIdV1>[0] {
  const revision = activation.rollbackRecord.previousService.releaseRevision;
  return {
    mode: "COMMERCE" as const,
    releaseEvidence: {
      contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1",
      activationReleaseRevision: revision,
      releaseSource: { resolvedRevision: revision },
    },
    expectedAuthority: {
      pageId: "1198992073286645",
      channel: "MESSENGER" as const,
      modeVersionId: activation.previous.version.modeVersionId,
      contentHash: activation.previous.version.contentHash,
      pointerRevision: activation.previous.pointerRevision,
      authorityBundleHash: activation.previous.version.authorityBundleHash,
      source: "DATABASE" as const,
    },
    releaseSource: {
      schemaVersion: 1 as const,
      release: "20260828-df13-preprod-commerce-1111111",
      repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
      tag: "20260828-df13-preprod-commerce-1111111",
      commit: revision,
      createdAt: "2026-08-28T00:00:00.000Z",
    },
  } as unknown as Parameters<typeof trackBLegacyRuntimeReleaseIdV1>[0];
}

describe("Track B PREPROD operator packet boundary", () => {
  it("derives the exact legacy runtime release id from immutable evidence-bound startup content", () => {
    const activation = packet();
    const startup = legacyStartup(activation);
    const revision = activation.rollbackRecord.previousService.releaseRevision;
    expect(trackBLegacyRuntimeReleaseIdV1(startup, revision))
      .toBe("20260828-df13-preprod-commerce-1111111");
    expect(() => trackBLegacyRuntimeReleaseIdV1({ ...startup,
      releaseSource: { ...startup.releaseSource, tag: "substituted-release" } }, revision))
      .toThrow("TRACK_B_B3_2_LEGACY_RUNTIME_RELEASE_ID_MISMATCH");
    expect(() => trackBLegacyRuntimeReleaseIdV1(startup, "2".repeat(40)))
      .toThrow("TRACK_B_B3_2_LEGACY_RUNTIME_RELEASE_ID_MISMATCH");
  });

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
    const { packetHash: _old, ...body } = { ...packet(), operationTargetStartupPackageFile:
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

  it("accepts a governed V2-to-V1 rollback packet and requires a distinct rollback startup path", () => {
    const activation = packet();
    const rollbackTarget = { ...activation.previous,
      pointerRevision: activation.target.pointerRevision + 1 };
    const { packetHash: _old, ...activationBody } = activation;
    const body = { ...activationBody, direction: "ROLLBACK_TRACK_B",
      previous: activation.target, target: rollbackTarget, releaseEvidence: null,
      sourceStartupPackageFile: activation.operationTargetStartupPackageFile,
      operationTargetStartupPackageFile: "/opt/lana-chatbot/releases/track-b/rollback-v1.json",
      recoveryStartupPackageFile: "/opt/lana-chatbot/releases/track-b/rollback-recovery-v2.json",
      legacyStartupPackageFile: activation.sourceStartupPackageFile,
      legacyStartupPackageHash: "e".repeat(64) };
    const rollback = { ...body, packetHash: createHash("sha256")
      .update(canonicalJsonV1(body), "utf8").digest("hex") };
    expect(parseTrackBPreprodOperationPacket(rollback)).toMatchObject({
      direction: "ROLLBACK_TRACK_B", previous: activation.target, target: rollbackTarget,
      releaseEvidence: null,
    });
  });

  it("requires exact rollback version and generated startup inputs only for rollback preparation", () => {
    const activationPacket = packet();
    const common = { schemaVersion: 1, environment: "ENGINEERING_PREPROD",
      pageId: "1198992073286645", channel: "MESSENGER",
      operationId: "10000000-0000-4000-8000-000000000001",
      previousService: activationPacket.rollbackRecord.previousService,
      targetService: activationPacket.rollbackRecord.targetService,
      previousImageTag: activationPacket.previousImageTag,
      targetImageTag: activationPacket.targetImageTag, releaseTag: activationPacket.releaseTag,
      releaseCreatedAt: activationPacket.releaseCreatedAt,
      previousStartupPackageFile: activationPacket.sourceStartupPackageFile,
      targetStartupPackageFile: activationPacket.operationTargetStartupPackageFile,
      rollbackRecordHash: null,
      recoveryStartupPackageFile: "/opt/lana-chatbot/releases/track-b/recovery.json",
      releaseEvidence: activationPacket.releaseEvidence };
    const rollback = { ...common, direction: "ROLLBACK_TRACK_B",
      rollbackRecordHash: activationPacket.rollbackRecord.recordHash,
      rollbackTargetVersionId: activationPacket.previous.version.modeVersionId,
      rollbackStartupPackageFile: "/opt/lana-chatbot/releases/track-b/rollback-v1.json" };
    expect(parseTrackBPreprodPrepareInput(rollback)).toMatchObject({ direction: "ROLLBACK_TRACK_B",
      rollbackTargetVersionId: activationPacket.previous.version.modeVersionId });
    expect(() => parseTrackBPreprodPrepareInput({ ...rollback, rollbackTargetVersionId: null }))
      .toThrow("TRACK_B_B3_2_OPERATOR_SCOPE_INVALID");
    expect(() => parseTrackBPreprodPrepareInput({ ...rollback, rollbackRecordHash: null }))
      .toThrow("TRACK_B_B3_2_OPERATOR_SCOPE_INVALID");
  });

  it("pins fresh post-reversal startup revisions for symmetric recovery", () => {
    const activation = packet();
    const common = { previous: activation.previous, target: activation.target,
      releaseEvidence: activation.releaseEvidence as never, releaseTag: activation.releaseTag,
      releaseCreatedAt: activation.releaseCreatedAt,
      targetServiceRevision: activation.rollbackRecord.targetService.releaseRevision };
    const forward = createTrackBPreprodOperationStartupPackages({ ...common,
      direction: "ACTIVATE_TRACK_B" });
    expect(forward.recovery).toMatchObject({ authorityTransition: "ROLLBACK_TRACK_B",
      expectedAuthority: { modeVersionId: activation.previous.version.modeVersionId,
        pointerRevision: activation.target.pointerRevision + 1 } });
    const rollbackTarget = { ...activation.previous,
      pointerRevision: activation.target.pointerRevision + 1 };
    const reverse = createTrackBPreprodOperationStartupPackages({ ...common,
      direction: "ROLLBACK_TRACK_B", previous: activation.target, target: rollbackTarget });
    expect(reverse.operationTarget).toMatchObject({ authorityTransition: "ROLLBACK_TRACK_B",
      expectedAuthority: { pointerRevision: rollbackTarget.pointerRevision } });
    expect(reverse.recovery).not.toHaveProperty("authorityTransition");
    expect(reverse.recovery).toMatchObject({ expectedAuthority: {
      modeVersionId: activation.target.version.modeVersionId,
      pointerRevision: rollbackTarget.pointerRevision + 1 } });
  });

  it("binds and revalidates all startup package contents before execution", async () => {
    const activation = packet();
    const packages = createTrackBPreprodOperationStartupPackages({ direction: "ACTIVATE_TRACK_B",
      previous: activation.previous, target: activation.target,
      releaseEvidence: activation.releaseEvidence as never, releaseTag: activation.releaseTag,
      releaseCreatedAt: activation.releaseCreatedAt,
      targetServiceRevision: activation.rollbackRecord.targetService.releaseRevision });
    const source = { ...packages.recovery,
      expectedAuthority: { ...packages.recovery.expectedAuthority,
        modeVersionId: activation.previous.version.modeVersionId,
        contentHash: activation.previous.version.contentHash,
        pointerRevision: activation.previous.pointerRevision } };
    const canonicalHash = (value: unknown) => createHash("sha256")
      .update(canonicalJsonV1(value), "utf8").digest("hex");
    const legacy = legacyStartup(activation);
    const { packetHash: _old, ...base } = activation;
    const body = { ...base, sourceStartupPackageHash: canonicalHash(source),
      operationTargetStartupPackageHash: canonicalHash(packages.operationTarget),
      recoveryStartupPackageHash: canonicalHash(packages.recovery),
      legacyStartupPackageFile: "/opt/lana-chatbot/shared/df13/legacy/commerce-startup-v2.json",
      legacyStartupPackageHash: canonicalHash(legacy) };
    const bound = parseTrackBPreprodOperationPacket({ ...body,
      packetHash: canonicalHash(body) });
    const artifacts = new Map<string, unknown>([
      [bound.sourceStartupPackageFile, source],
      [bound.operationTargetStartupPackageFile, packages.operationTarget],
      [bound.recoveryStartupPackageFile, packages.recovery],
      [bound.legacyStartupPackageFile!, legacy],
    ]);
    const reader = async (path: string) => artifacts.get(path);
    await expect(validateTrackBPreprodStartupArtifacts(bound, reader))
      .resolves.toBe("20260828-df13-preprod-commerce-1111111");
    const bindSource = (changedSource: unknown) => {
      const changedBody = { ...body, sourceStartupPackageHash: canonicalHash(changedSource) };
      artifacts.set(bound.sourceStartupPackageFile, changedSource);
      return parseTrackBPreprodOperationPacket({ ...changedBody,
        packetHash: canonicalHash(changedBody) });
    };
    const invalidTrackBSource = { ...source,
      releaseEvidence: { ...(source.releaseEvidence as object), invalid: true } };
    await expect(validateTrackBPreprodStartupArtifacts(bindSource(invalidTrackBSource), reader))
      .rejects.toThrow("TRACK_B_B3_2_SOURCE_STARTUP_PACKAGE_NOT_ADMITTED");
    const { authorityTransition: _transition, ...sourceWithoutTransition } = source;
    const missingTransitionSource = { ...sourceWithoutTransition,
      releaseEvidence: { ...(source.releaseEvidence as Record<string, unknown>),
        activationReleaseRevision: activation.rollbackRecord.previousService.releaseRevision,
        releaseSource: { resolvedRevision: activation.rollbackRecord.previousService.releaseRevision } },
      releaseSource: { ...source.releaseSource,
        commit: activation.rollbackRecord.previousService.releaseRevision } };
    await expect(validateTrackBPreprodStartupArtifacts(bindSource(missingTransitionSource), reader))
      .rejects.toThrow("TRACK_B_B3_2_SOURCE_STARTUP_PACKAGE_NOT_ADMITTED");
    const wrongTransitionSource = { ...source, authorityTransition: "UNREVIEWED_TRANSITION" };
    await expect(validateTrackBPreprodStartupArtifacts(bindSource(wrongTransitionSource), reader))
      .rejects.toThrow("DF13_COMMERCE_STARTUP_INPUT_INVALID");
    const invalidHistoricalSource = { ...sourceWithoutTransition,
      releaseEvidence: { contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1" } };
    await expect(validateTrackBPreprodStartupArtifacts(bindSource(invalidHistoricalSource), reader))
      .rejects.toThrow();
    artifacts.set(bound.sourceStartupPackageFile, source);
    for (const path of artifacts.keys()) {
      const original = artifacts.get(path);
      artifacts.set(path, { ...(original as object), drift: true });
      await expect(validateTrackBPreprodStartupArtifacts(bound, reader))
        .rejects.toThrow("TRACK_B_B3_2_STARTUP_PACKAGE_CONTENT_MISMATCH");
      artifacts.set(path, original);
    }
    const semanticDrift = { ...packages.operationTarget,
      expectedAuthority: { ...packages.operationTarget.expectedAuthority,
        pointerRevision: packages.operationTarget.expectedAuthority.pointerRevision + 1 } };
    artifacts.set(bound.operationTargetStartupPackageFile, semanticDrift);
    const semanticBody = { ...body,
      operationTargetStartupPackageHash: canonicalHash(semanticDrift) };
    const semanticPacket = parseTrackBPreprodOperationPacket({ ...semanticBody,
      packetHash: canonicalHash(semanticBody) });
    await expect(validateTrackBPreprodStartupArtifacts(semanticPacket, reader))
      .rejects.toThrow("TRACK_B_B3_2_GENERATED_STARTUP_PACKAGE_MISMATCH");
    artifacts.set(bound.operationTargetStartupPackageFile, packages.operationTarget);
    const substitutedLegacy = { ...legacy,
      releaseSource: { ...legacy.releaseSource, tag: "substituted-release" } };
    artifacts.set(bound.legacyStartupPackageFile!, substitutedLegacy);
    const legacyDriftBody = { ...body, legacyStartupPackageHash: canonicalHash(substitutedLegacy) };
    const legacyDriftPacket = parseTrackBPreprodOperationPacket({ ...legacyDriftBody,
      packetHash: canonicalHash(legacyDriftBody) });
    await expect(validateTrackBPreprodStartupArtifacts(legacyDriftPacket, reader))
      .rejects.toThrow("TRACK_B_B3_2_LEGACY_RUNTIME_RELEASE_ID_MISMATCH");
    artifacts.set(bound.legacyStartupPackageFile!, legacy);
    let legacyReads = 0;
    const changingReader = async (path: string) => {
      if (path !== bound.legacyStartupPackageFile) return artifacts.get(path);
      legacyReads += 1;
      return legacyReads === 1 ? legacy : substitutedLegacy;
    };
    await expect(validateTrackBPreprodStartupArtifacts(bound, changingReader))
      .resolves.toBe("20260828-df13-preprod-commerce-1111111");
    expect(legacyReads).toBe(1);
    const substituted = { ...body,
      sourceStartupPackageFile: "/opt/lana-chatbot/releases/track-b/substituted.json" };
    expect(() => parseTrackBPreprodOperationPacket({ ...substituted,
      packetHash: bound.packetHash })).toThrow("TRACK_B_B3_2_OPERATION_PACKET_HASH_MISMATCH");
  });
});
