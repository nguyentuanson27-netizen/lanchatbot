import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { canonicalJsonV1 } from "@lana/contracts";
import { behaviorModeContentHash } from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V2 } from "./df13-commerce-authority-bundle.js";
import { createTrackBReleaseLocalRollbackRecord } from "./track-b-commerce-authority-activation.js";
import { TRACK_B_RUNTIME_CONFIG_KEYS_V1 } from "./track-b-commerce-authority-preprod-adapter.js";
import { createTrackBPreprodOperationStartupPackages, parseTrackBPreprodBuildInput,
  parseTrackBPreprodOperationPacket, parseTrackBPreprodPrepareInput,
  matchesTrackBOperationTargetStartupBaseline,
  persistTrackBPreprodRuntimeStartupArtifact,
  proveFreshTrackBInitialLkgRuntime,
  validateTrackBPreprodStartupArtifacts,
  validateTrackBV2LastKnownGoodSelection } from "./track-b-commerce-authority-preprod-cli.js";

vi.mock("./track-b-release-candidate-evidence.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./track-b-release-candidate-evidence.js")>(),
  validateTrackBReleaseCandidateEvidence: vi.fn((evidence: Record<string, unknown>) =>
    evidence.invalid === true ? { status: "MISMATCH", reasonCodes: ["TEST_INVALID"] }
      : { status: "MATCHED", reasonCodes: [] }),
}));

function hash(value: unknown) {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

function pointer(versionId: string, revision: number) {
  const payload = { confirmationMode: "V2_ACTIVE" as const, salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const, authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash };
  return { version: { schemaVersion: 1 as const, modeVersionId: versionId,
    pageId: "1198992073286645", channel: "MESSENGER", ...payload,
    contentHash: behaviorModeContentHash(payload), createdBy: "operator", reason: "prepared",
    createdAt: "2026-09-03T00:00:00.000Z" }, pointerRevision: revision,
  updatedBy: "operator", reason: "active", updatedAt: "2026-09-03T00:00:00.000Z" };
}

const lkgService = { service: "realtime-worker" as const, releaseRevision: "1".repeat(40),
  buildId: "2".repeat(64), imageId: "3".repeat(64), runtimeConfigHash: "4".repeat(64) };
const candidateService = { service: "realtime-worker" as const, releaseRevision: "5".repeat(40),
  buildId: "6".repeat(64), imageId: "7".repeat(64), runtimeConfigHash: "8".repeat(64) };
const lkgEvidence = { contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1",
  activationReleaseRevision: lkgService.releaseRevision,
  releaseSource: { resolvedRevision: lkgService.releaseRevision, treeOid: "9".repeat(40) } } as never;
const candidateEvidence = { contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1",
  activationReleaseRevision: candidateService.releaseRevision,
  releaseSource: { resolvedRevision: candidateService.releaseRevision, treeOid: "a".repeat(40) } } as never;

function startup(service: typeof lkgService, authority: ReturnType<typeof pointer>, evidence: never) {
  return { mode: "COMMERCE" as const, releaseEvidence: evidence,
    expectedAuthority: { pageId: "1198992073286645", channel: "MESSENGER" as const,
      modeVersionId: authority.version.modeVersionId, contentHash: authority.version.contentHash,
      pointerRevision: authority.pointerRevision, authorityBundleHash: authority.version.authorityBundleHash,
      source: "DATABASE" as const },
    releaseSource: { schemaVersion: 1 as const, release: `track-b-${service.releaseRevision.slice(0, 8)}`,
      repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
      tag: `track-b-${service.releaseRevision.slice(0, 8)}`, commit: service.releaseRevision,
      createdAt: "2026-09-03T00:00:00.000Z" } };
}

function packet(direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2" = "ACTIVATE_V2_CANDIDATE") {
  const lkgBase = pointer("10000000-0000-4000-8000-000000000001", 6);
  const candidateBase = pointer("10000000-0000-4000-8000-000000000002", 7);
  const previous = direction === "ACTIVATE_V2_CANDIDATE" ? lkgBase : candidateBase;
  const target = direction === "ACTIVATE_V2_CANDIDATE" ? candidateBase : { ...lkgBase, pointerRevision: 8 };
  const source = startup(direction === "ACTIVATE_V2_CANDIDATE" ? lkgService : candidateService,
    previous, direction === "ACTIVATE_V2_CANDIDATE" ? lkgEvidence : candidateEvidence);
  const generated = createTrackBPreprodOperationStartupPackages({ direction, previous, target,
    releaseEvidence: direction === "ACTIVATE_V2_CANDIDATE" ? candidateEvidence : lkgEvidence,
    recoveryReleaseEvidence: direction === "ACTIVATE_V2_CANDIDATE" ? lkgEvidence : candidateEvidence,
    targetReleaseSource: startup(direction === "ACTIVATE_V2_CANDIDATE" ? candidateService : lkgService,
      target, direction === "ACTIVATE_V2_CANDIDATE" ? candidateEvidence : lkgEvidence).releaseSource,
    recoveryReleaseSource: source.releaseSource });
  const rollbackRecord = createTrackBReleaseLocalRollbackRecord({
    candidate: { service: candidateService, sourceTree: "a".repeat(40), imageTag: "lana:v2-candidate",
      startupPackageHash: hash(direction === "ACTIVATE_V2_CANDIDATE" ? generated.operationTarget : source),
      authority: { pointerRevision: candidateBase.pointerRevision,
        modeVersionId: candidateBase.version.modeVersionId, contentHash: candidateBase.version.contentHash,
        bundleHash: candidateBase.version.authorityBundleHash }, gateEEvidence: candidateEvidence,
      migrationSchemaHash: "b".repeat(64) },
    lastKnownGood: { service: lkgService, sourceTree: "9".repeat(40), imageTag: "lana:v2-lkg",
      startupPackageHash: hash(direction === "ROLLBACK_TO_LKG_V2" ? generated.operationTarget : source),
      authority: { pointerRevision: direction === "ROLLBACK_TO_LKG_V2" ? 8 : lkgBase.pointerRevision,
        modeVersionId: lkgBase.version.modeVersionId, contentHash: lkgBase.version.contentHash,
        bundleHash: lkgBase.version.authorityBundleHash }, gateEEvidence: lkgEvidence,
      migrationSchemaHash: "b".repeat(64) },
    lastKnownGoodSelection: direction === "ACTIVATE_V2_CANDIDATE"
      ? { source: "CURRENT_ACCEPTED_V2" as const, priorRecordHash: null }
      : { source: "PRIOR_ACCEPTED_V2_RECORD" as const, priorRecordHash: "c".repeat(64) },
  });
  const body = { schemaVersion: 2 as const, contractVersion: "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V2_LKG" as const,
    environment: "ENGINEERING_PREPROD" as const, pageId: "1198992073286645" as const,
    channel: "MESSENGER" as const, operationId: "10000000-0000-4000-8000-000000000001",
    direction, previous, target, rollbackRecord, candidateImageTag: "lana:v2-candidate",
    lastKnownGoodImageTag: "lana:v2-lkg",
    sourceStartupPackageFile: "/opt/lana-chatbot/releases/track-b/source.json",
    sourceStartupPackageHash: hash(source),
    operationTargetStartupPackageFile: "/opt/lana-chatbot/releases/track-b/target.json",
    operationTargetStartupPackageHash: hash(generated.operationTarget),
    recoveryStartupPackageFile: "/opt/lana-chatbot/releases/track-b/recovery.json",
    recoveryStartupPackageHash: hash(generated.recovery),
    releaseEvidence: direction === "ACTIVATE_V2_CANDIDATE" ? candidateEvidence : lkgEvidence };
  return { value: { ...body, packetHash: hash(body) }, source, generated };
}

describe("Track B PREPROD V2/LKG operator boundary", () => {
  it("latches one database-native watermark and polls until a fresh exact runtime audit arrives", async () => {
    const current = pointer("10000000-0000-4000-8000-000000000001", 6);
    const watermark = "2026-09-03T02:00:00.123456+00";
    const database = { readDatabaseClock: vi.fn(async () => watermark),
      proveRuntimeResolution: vi.fn()
        .mockResolvedValueOnce("MISSING" as const)
        .mockResolvedValueOnce("MISSING" as const)
        .mockResolvedValueOnce("EXACT" as const) };
    const wait = vi.fn(async () => undefined);
    await expect(proveFreshTrackBInitialLkgRuntime({ database, pointer: current,
      freshness: { maximumAttempts: 3, pollMs: 1, wait } })).resolves.toBe("EXACT");
    expect(database.readDatabaseClock).toHaveBeenCalledOnce();
    expect(database.proveRuntimeResolution).toHaveBeenCalledTimes(3);
    expect(database.proveRuntimeResolution).toHaveBeenNthCalledWith(1, { pointer: current, notBefore: watermark });
    expect(database.proveRuntimeResolution).toHaveBeenNthCalledWith(2, { pointer: current, notBefore: watermark });
    expect(database.proveRuntimeResolution).toHaveBeenNthCalledWith(3, { pointer: current, notBefore: watermark });
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("fails closed on a bounded all-missing observation and stops immediately on ambiguity", async () => {
    const current = pointer("10000000-0000-4000-8000-000000000001", 6);
    const timeoutDatabase = { readDatabaseClock: vi.fn(async () => "2026-09-03T02:00:00.123456+00"),
      proveRuntimeResolution: vi.fn(async (): Promise<"EXACT" | "MISSING" | "AMBIGUOUS"> => "MISSING") };
    const timeoutWait = vi.fn(async () => undefined);
    await expect(proveFreshTrackBInitialLkgRuntime({ database: timeoutDatabase, pointer: current,
      freshness: { maximumAttempts: 2, pollMs: 1, wait: timeoutWait } })).resolves.toBe("MISSING");
    expect(timeoutDatabase.readDatabaseClock).toHaveBeenCalledOnce();
    expect(timeoutDatabase.proveRuntimeResolution).toHaveBeenCalledTimes(2);
    expect(timeoutWait).toHaveBeenCalledOnce();

    const ambiguousDatabase = { readDatabaseClock: vi.fn(async () => "2026-09-03T02:00:00.123456+00"),
      proveRuntimeResolution: vi.fn(async (): Promise<"EXACT" | "MISSING" | "AMBIGUOUS"> => "AMBIGUOUS") };
    const ambiguousWait = vi.fn(async () => undefined);
    await expect(proveFreshTrackBInitialLkgRuntime({ database: ambiguousDatabase, pointer: current,
      freshness: { maximumAttempts: 3, pollMs: 1, wait: ambiguousWait } })).resolves.toBe("AMBIGUOUS");
    expect(ambiguousDatabase.readDatabaseClock).toHaveBeenCalledOnce();
    expect(ambiguousDatabase.proveRuntimeResolution).toHaveBeenCalledOnce();
    expect(ambiguousWait).not.toHaveBeenCalled();
  });

  it("persists immutable startup artifacts read-only", async () => {
    const directory = await mkdtemp(join(tmpdir(), "track-b-startup-"));
    const path = join(directory, "startup.json");
    const value = { mode: "COMMERCE" };
    try {
      await persistTrackBPreprodRuntimeStartupArtifact(path, value);
      expect((await stat(path)).mode & 0o777).toBe(0o444);
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(value);
      await chmod(path, 0o600);
      await writeFile(path, `${canonicalJsonV1(value)}\n`);
      await persistTrackBPreprodRuntimeStartupArtifact(path, value);
      expect((await stat(path)).mode & 0o777).toBe(0o444);
      await expect(persistTrackBPreprodRuntimeStartupArtifact(path, { mode: "LEGACY" }))
        .rejects.toThrow("TRACK_B_B3_2_OPERATION_PACKET_CONFLICT");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("accepts exact V2 candidate and LKG V2 packets in both directions", () => {
    expect(parseTrackBPreprodOperationPacket(packet().value).direction).toBe("ACTIVATE_V2_CANDIDATE");
    expect(parseTrackBPreprodOperationPacket(packet("ROLLBACK_TO_LKG_V2").value).direction)
      .toBe("ROLLBACK_TO_LKG_V2");
  });

  it("refuses V1 fallback, stale LKG, schema mismatch and public scope", () => {
    for (const changed of [{ ...packet().value, direction: "ROLLBACK_TRACK_B" },
      { ...packet().value, environment: "PUBLIC_PRODUCTION" }]) {
      expect(() => parseTrackBPreprodOperationPacket(changed)).toThrow();
    }
    const base = packet().value;
    const staleBody = { ...base, rollbackRecord: createTrackBReleaseLocalRollbackRecord({
      candidate: base.rollbackRecord.candidate,
      lastKnownGood: { ...base.rollbackRecord.lastKnownGood, migrationSchemaHash: "f".repeat(64) },
      lastKnownGoodSelection: base.rollbackRecord.lastKnownGoodSelection,
    }) };
    const { packetHash: _ignored, ...body } = staleBody;
    expect(() => parseTrackBPreprodOperationPacket({ ...body, packetHash: hash(body) }))
      .toThrow("TRACK_B_B3_2_OPERATION_PACKET_ENVELOPE_INVALID");
  });

  it("rejects packet substitution, startup traversal and invalid authority envelopes", () => {
    expect(() => parseTrackBPreprodOperationPacket({ ...packet().value,
      operationId: "20000000-0000-4000-8000-000000000001" }))
      .toThrow("TRACK_B_B3_2_OPERATION_PACKET_HASH_MISMATCH");
    for (const changed of [
      { ...packet().value,
        operationTargetStartupPackageFile: "/opt/lana-chatbot/releases/track-b/../secrets.json" },
      { ...packet().value, target: {} },
    ]) {
      const { packetHash: _old, ...body } = changed;
      expect(() => parseTrackBPreprodOperationPacket({ ...body, packetHash: hash(body) })).toThrow();
    }
  });

  it("accepts only the exact immutable certified LKG selection", () => {
    const accepted = packet().value.rollbackRecord;
    const exact = { accepted, acceptedRecordHash: accepted.recordHash,
      candidate: accepted.candidate, lastKnownGood: accepted.lastKnownGood };
    expect(validateTrackBV2LastKnownGoodSelection(exact)).toBe(true);
    expect(validateTrackBV2LastKnownGoodSelection({ ...exact, accepted: null })).toBe(false);
    expect(validateTrackBV2LastKnownGoodSelection({ ...exact,
      acceptedRecordHash: "f".repeat(64) })).toBe(false);
    expect(validateTrackBV2LastKnownGoodSelection({ ...exact,
      lastKnownGood: { ...accepted.lastKnownGood, imageTag: "lana:stale-v2" } })).toBe(false);
    expect(validateTrackBV2LastKnownGoodSelection({ ...exact,
      candidate: accepted.lastKnownGood, lastKnownGood: accepted.candidate })).toBe(false);
  });

  it("binds LKG certification, startup and recovery artifacts exactly", async () => {
    const fixture = packet("ROLLBACK_TO_LKG_V2");
    const byPath = new Map<string, unknown>([[fixture.value.sourceStartupPackageFile, fixture.source],
      [fixture.value.operationTargetStartupPackageFile, fixture.generated.operationTarget],
      [fixture.value.recoveryStartupPackageFile, fixture.generated.recovery]]);
    await expect(validateTrackBPreprodStartupArtifacts(fixture.value,
      async (path) => byPath.get(path))).resolves.toMatchObject({
      sourceStartup: fixture.source, operationTargetStartup: fixture.generated.operationTarget });
    await expect(validateTrackBPreprodStartupArtifacts(fixture.value,
      async (path) => path === fixture.value.operationTargetStartupPackageFile
        ? { ...fixture.generated.operationTarget, authorityTransition: undefined } : byPath.get(path)))
      .rejects.toThrow();
    for (const path of byPath.keys()) {
      const original = byPath.get(path);
      byPath.set(path, { ...(original as object), drift: true });
      await expect(validateTrackBPreprodStartupArtifacts(fixture.value,
        async (key) => byPath.get(key)))
        .rejects.toThrow("TRACK_B_B3_2_STARTUP_PACKAGE_CONTENT_MISMATCH");
      byPath.set(path, original);
    }
  });

  it("keeps target and recovery release provenance distinct across both directions", () => {
    for (const direction of ["ACTIVATE_V2_CANDIDATE", "ROLLBACK_TO_LKG_V2"] as const) {
      const fixture = packet(direction);
      const targetRevision = direction === "ACTIVATE_V2_CANDIDATE"
        ? candidateService.releaseRevision : lkgService.releaseRevision;
      const recoveryRevision = direction === "ACTIVATE_V2_CANDIDATE"
        ? lkgService.releaseRevision : candidateService.releaseRevision;
      expect(fixture.generated.operationTarget.releaseSource.commit).toBe(targetRevision);
      expect(fixture.generated.recovery.releaseSource.commit).toBe(recoveryRevision);
      expect(fixture.generated.recovery.expectedAuthority.pointerRevision)
        .toBe(fixture.value.target.pointerRevision + 1);
      if (direction === "ROLLBACK_TO_LKG_V2") {
        expect(fixture.generated.operationTarget.authorityTransition).toBe("ROLLBACK_TO_LKG_V2");
        expect(fixture.generated.recovery).not.toHaveProperty("authorityTransition");
      } else {
        expect(fixture.generated.operationTarget).not.toHaveProperty("authorityTransition");
        expect(fixture.generated.recovery.authorityTransition).toBe("ROLLBACK_TO_LKG_V2");
      }
    }
  });

  it("permits only a prior exact LKG startup when rollback derives a later CAS revision", () => {
    const lkg = pointer("10000000-0000-4000-8000-000000000001", 6);
    const rollbackTarget = { ...lkg, pointerRevision: 8 };
    const lkgStartup = startup(lkgService, lkg, lkgEvidence);

    expect(matchesTrackBOperationTargetStartupBaseline({
      direction: "ROLLBACK_TO_LKG_V2", startup: lkgStartup, target: rollbackTarget,
    })).toBe(true);
    expect(matchesTrackBOperationTargetStartupBaseline({
      direction: "ACTIVATE_V2_CANDIDATE", startup: lkgStartup, target: rollbackTarget,
    })).toBe(false);
    expect(matchesTrackBOperationTargetStartupBaseline({
      direction: "ROLLBACK_TO_LKG_V2", startup: lkgStartup, target: lkg,
    })).toBe(false);
  });

  it("requires exact fixed-scope prepare and build inputs", () => {
    const prepare = { schemaVersion: 3, environment: "ENGINEERING_PREPROD",
      pageId: "1198992073286645", channel: "MESSENGER",
      operationId: "10000000-0000-4000-8000-000000000001", direction: "ACTIVATE_V2_CANDIDATE",
      candidateService, lastKnownGoodService: lkgService, candidateImageTag: "lana:v2-candidate",
      lastKnownGoodImageTag: "lana:v2-lkg",
      candidateStartupPackageFile: "/opt/lana-chatbot/releases/track-b/candidate.json",
      lastKnownGoodStartupPackageFile: "/opt/lana-chatbot/releases/track-b/lkg.json",
      operationTargetStartupPackageFile: "/opt/lana-chatbot/releases/track-b/target.json",
      recoveryStartupPackageFile: "/opt/lana-chatbot/releases/track-b/recovery.json",
      candidateReleaseEvidence: candidateEvidence, lastKnownGoodReleaseEvidence: lkgEvidence,
      lastKnownGoodRecordHash: null };
    expect(parseTrackBPreprodPrepareInput(prepare).direction).toBe("ACTIVATE_V2_CANDIDATE");
    expect(() => parseTrackBPreprodPrepareInput({ ...prepare, direction: "ROLLBACK_TRACK_B" })).toThrow();
    expect(() => parseTrackBPreprodPrepareInput({ ...prepare, direction: "ROLLBACK_TO_LKG_V2",
      lastKnownGoodRecordHash: null })).toThrow();
    expect(() => parseTrackBPreprodPrepareInput({ ...prepare,
      migrationSchemaHash: "b".repeat(64) })).toThrow("TRACK_B_B3_2_OPERATOR_SCOPE_INVALID");
    const runtimeConfig = Object.fromEntries(TRACK_B_RUNTIME_CONFIG_KEYS_V1.map((key) => [key, "false"]));
    expect(parseTrackBPreprodBuildInput({ schemaVersion: 1, environment: "ENGINEERING_PREPROD",
      pageId: "1198992073286645", channel: "MESSENGER", sourceCommit: "1".repeat(40),
      sourceTree: "2".repeat(40), imageTag: "lana:v2", runtimeConfig })).toMatchObject({ imageTag: "lana:v2" });
    expect(() => parseTrackBPreprodBuildInput({ schemaVersion: 1,
      environment: "PUBLIC_PRODUCTION", pageId: "1198992073286645", channel: "MESSENGER",
      sourceCommit: "1".repeat(40), sourceTree: "2".repeat(40), imageTag: "lana:v2",
      runtimeConfig })).toThrow("TRACK_B_B3_2_BUILD_INPUT_INVALID");
  });
});
