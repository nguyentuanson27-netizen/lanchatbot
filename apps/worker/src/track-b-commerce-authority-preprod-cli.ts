import { canonicalJsonV1 } from "@lana/contracts";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import {
  createTrackBCommerceAuthorityPreprodAdapter,
  DockerComposeTrackBPreprodServiceController,
  ReleaseLocalRollbackRecordStore,
  TRACK_B_RUNTIME_CONFIG_KEYS_V1,
  TRACK_B_PREPROD_FIXED_SCOPE,
  TrackBPreprodImageBuilder,
  TrackBPostgresPreprodDatabaseBoundary,
  TrackBPreprodServicePairController,
  trackBBuildIdV1,
} from "./track-b-commerce-authority-preprod-adapter.js";
import {
  createTrackBReleaseLocalRollbackRecord,
  executeTrackBCommerceAuthorityMutation,
  recoverTrackBCommerceAuthorityMutationAfterInterruption,
  validateTrackBCommerceAuthorityMutationEnvelope,
  type TrackBReleaseLocalRollbackRecord,
  type TrackBServiceReleaseIdentity,
} from "./track-b-commerce-authority-activation.js";
import {
  validateTrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidence,
} from "./track-b-release-candidate-evidence.js";
import { parseDf13CommercePreprodStartupInput } from "./df13-commerce-preprod-startup-authority.js";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";

const DATABASE_SECRET_FILE = "/opt/lana-chatbot/shared/secrets/runtime_behavior_mode_database_url";
const OPERATION_ROOT = "/opt/lana-chatbot/releases/track-b/operations";
const ROLLBACK_ROOT = "/opt/lana-chatbot/releases/track-b/rollback-records";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256 = /^[a-f0-9]{64}$/u;

type PrepareInput = Readonly<{
  schemaVersion: 1;
  environment: "ENGINEERING_PREPROD";
  pageId: "1198992073286645";
  channel: "MESSENGER";
  operationId: string;
  direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
  previousService: TrackBServiceReleaseIdentity;
  targetService: TrackBServiceReleaseIdentity;
  previousImageTag: string;
  targetImageTag: string;
  releaseTag: string;
  releaseCreatedAt: string;
  previousStartupPackageFile: string;
  targetStartupPackageFile: string;
  rollbackRecordHash: string | null;
  rollbackTargetVersionId: string | null;
  rollbackStartupPackageFile: string | null;
  recoveryStartupPackageFile: string;
  releaseEvidence: TrackBReleaseCandidateEvidence;
}>;

type BuildInput = Readonly<{
  schemaVersion: 1;
  environment: "ENGINEERING_PREPROD";
  pageId: "1198992073286645";
  channel: "MESSENGER";
  sourceCommit: string;
  sourceTree: string;
  imageTag: string;
  runtimeConfig: Record<(typeof TRACK_B_RUNTIME_CONFIG_KEYS_V1)[number], string>;
}>;

export type TrackBPreprodOperationPacket = Readonly<{
  schemaVersion: 1;
  contractVersion: "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V1";
  environment: "ENGINEERING_PREPROD";
  pageId: "1198992073286645";
  channel: "MESSENGER";
  operationId: string;
  direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  rollbackRecord: TrackBReleaseLocalRollbackRecord;
  previousImageTag: string;
  targetImageTag: string;
  releaseTag: string;
  releaseCreatedAt: string;
  sourceStartupPackageFile: string;
  operationTargetStartupPackageFile: string;
  recoveryStartupPackageFile: string;
  releaseEvidence: TrackBReleaseCandidateEvidence | null;
  packetHash: string;
}>;

function hash(value: unknown) {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_B_B3_2_OPERATOR_INPUT_INVALID");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function startupPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith(`${TRACK_B_PREPROD_FIXED_SCOPE.startupRoot}/`) ||
      value.includes("..") || !value.endsWith(".json")) {
    throw new Error("TRACK_B_B3_2_STARTUP_PACKAGE_PATH_INVALID");
  }
  return value;
}

function previousStartupPath(value: unknown): string {
  if (typeof value !== "string" || value.includes("..") || !value.endsWith(".json") ||
      (!value.startsWith(`${TRACK_B_PREPROD_FIXED_SCOPE.startupRoot}/`) &&
       !value.startsWith("/opt/lana-chatbot/shared/df13/"))) {
    throw new Error("TRACK_B_B3_2_STARTUP_PACKAGE_PATH_INVALID");
  }
  return value;
}

function imageTag(value: unknown): string {
  if (typeof value !== "string" ||
      !/^[a-z0-9][a-z0-9._/-]{0,127}:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(value)) {
    throw new Error("TRACK_B_B3_2_IMAGE_TAG_INVALID");
  }
  return value;
}

function releaseTag(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(value)) {
    throw new Error("TRACK_B_B3_2_RELEASE_TAG_INVALID");
  }
  return value;
}

function instant(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("TRACK_B_B3_2_RELEASE_TIMESTAMP_INVALID");
  }
  return new Date(value).toISOString();
}

export function parseTrackBPreprodPrepareInput(value: unknown): PrepareInput {
  const input = object(value);
  if (!exactKeys(input, ["schemaVersion", "environment", "pageId", "channel", "operationId", "direction",
    "previousService", "targetService", "previousImageTag", "targetImageTag",
    "releaseTag", "releaseCreatedAt",
    "previousStartupPackageFile", "targetStartupPackageFile",
    "rollbackRecordHash", "rollbackTargetVersionId", "rollbackStartupPackageFile",
    "recoveryStartupPackageFile", "releaseEvidence"]) ||
      input.schemaVersion !== 1 || input.environment !== "ENGINEERING_PREPROD" ||
      input.pageId !== TRACK_B_PREPROD_FIXED_SCOPE.pageId || input.channel !== "MESSENGER" ||
      typeof input.operationId !== "string" || !UUID_V4.test(input.operationId) ||
      !["ACTIVATE_TRACK_B", "ROLLBACK_TRACK_B"].includes(String(input.direction)) ||
      (input.direction === "ACTIVATE_TRACK_B" &&
        (input.rollbackRecordHash !== null || input.rollbackTargetVersionId !== null ||
         input.rollbackStartupPackageFile !== null)) ||
      (input.direction === "ROLLBACK_TRACK_B" &&
        (typeof input.rollbackRecordHash !== "string" || !SHA256.test(input.rollbackRecordHash) ||
         typeof input.rollbackTargetVersionId !== "string" || !UUID_V4.test(input.rollbackTargetVersionId) ||
         typeof input.rollbackStartupPackageFile !== "string"))) {
    throw new Error("TRACK_B_B3_2_OPERATOR_SCOPE_INVALID");
  }
  return {
    schemaVersion: 1,
    environment: "ENGINEERING_PREPROD",
    pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
    channel: "MESSENGER",
    operationId: input.operationId.toLowerCase(),
    direction: input.direction as PrepareInput["direction"],
    previousService: input.previousService as TrackBServiceReleaseIdentity,
    targetService: input.targetService as TrackBServiceReleaseIdentity,
    previousImageTag: imageTag(input.previousImageTag),
    targetImageTag: imageTag(input.targetImageTag),
    releaseTag: releaseTag(input.releaseTag),
    releaseCreatedAt: instant(input.releaseCreatedAt),
    previousStartupPackageFile: previousStartupPath(input.previousStartupPackageFile),
    targetStartupPackageFile: startupPath(input.targetStartupPackageFile),
    rollbackRecordHash: input.rollbackRecordHash as string | null,
    rollbackTargetVersionId: input.rollbackTargetVersionId as string | null,
    rollbackStartupPackageFile: input.rollbackStartupPackageFile === null
      ? null : startupPath(input.rollbackStartupPackageFile),
    recoveryStartupPackageFile: startupPath(input.recoveryStartupPackageFile),
    releaseEvidence: input.releaseEvidence as TrackBReleaseCandidateEvidence,
  };
}

export function parseTrackBPreprodBuildInput(value: unknown): BuildInput {
  const input = object(value);
  if (!exactKeys(input, ["schemaVersion", "environment", "pageId", "channel", "sourceCommit",
    "sourceTree", "imageTag", "runtimeConfig"]) || input.schemaVersion !== 1 ||
      input.environment !== "ENGINEERING_PREPROD" ||
      input.pageId !== TRACK_B_PREPROD_FIXED_SCOPE.pageId || input.channel !== "MESSENGER" ||
      typeof input.sourceCommit !== "string" || !/^[a-f0-9]{40}$/u.test(input.sourceCommit) ||
      typeof input.sourceTree !== "string" || !/^[a-f0-9]{40}$/u.test(input.sourceTree)) {
    throw new Error("TRACK_B_B3_2_BUILD_INPUT_INVALID");
  }
  const runtimeConfig = object(input.runtimeConfig);
  if (!exactKeys(runtimeConfig, TRACK_B_RUNTIME_CONFIG_KEYS_V1) ||
      Object.values(runtimeConfig).some((entry) => typeof entry !== "string")) {
    throw new Error("TRACK_B_B3_2_RUNTIME_CONFIG_INVALID");
  }
  return { schemaVersion: 1, environment: "ENGINEERING_PREPROD",
    pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId, channel: "MESSENGER",
    sourceCommit: input.sourceCommit, sourceTree: input.sourceTree,
    imageTag: imageTag(input.imageTag),
    runtimeConfig: runtimeConfig as BuildInput["runtimeConfig"] };
}

export function parseTrackBPreprodOperationPacket(value: unknown): TrackBPreprodOperationPacket {
  const packet = object(value);
  if (!exactKeys(packet, ["schemaVersion", "contractVersion", "environment", "pageId", "channel",
    "operationId", "direction", "previous", "target", "rollbackRecord", "previousImageTag", "targetImageTag",
    "releaseTag", "releaseCreatedAt",
    "sourceStartupPackageFile", "operationTargetStartupPackageFile",
    "recoveryStartupPackageFile", "releaseEvidence", "packetHash"]) ||
      packet.schemaVersion !== 1 || packet.contractVersion !== "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V1" ||
      packet.environment !== "ENGINEERING_PREPROD" || packet.pageId !== TRACK_B_PREPROD_FIXED_SCOPE.pageId ||
      packet.channel !== "MESSENGER" || typeof packet.operationId !== "string" ||
      !UUID_V4.test(packet.operationId) ||
      !["ACTIVATE_TRACK_B", "ROLLBACK_TRACK_B"].includes(String(packet.direction)) ||
      typeof packet.packetHash !== "string" ||
      !SHA256.test(packet.packetHash)) throw new Error("TRACK_B_B3_2_OPERATION_PACKET_INVALID");
  const { packetHash, ...body } = packet;
  if (hash(body) !== packetHash) throw new Error("TRACK_B_B3_2_OPERATION_PACKET_HASH_MISMATCH");
  if (packet.direction === "ACTIVATE_TRACK_B") previousStartupPath(packet.sourceStartupPackageFile);
  else startupPath(packet.sourceStartupPackageFile);
  startupPath(packet.operationTargetStartupPackageFile);
  startupPath(packet.recoveryStartupPackageFile);
  imageTag(packet.previousImageTag);
  imageTag(packet.targetImageTag);
  releaseTag(packet.releaseTag);
  instant(packet.releaseCreatedAt);
  if (!validateTrackBCommerceAuthorityMutationEnvelope({
    operationId: packet.operationId,
    direction: packet.direction as TrackBPreprodOperationPacket["direction"],
    previous: packet.previous as RuntimeBehaviorModePointer,
    target: packet.target as RuntimeBehaviorModePointer,
    rollbackRecord: packet.rollbackRecord as TrackBReleaseLocalRollbackRecord,
    ...(packet.releaseEvidence === null ? {} :
      { releaseEvidence: packet.releaseEvidence as TrackBReleaseCandidateEvidence }),
  })) throw new Error("TRACK_B_B3_2_OPERATION_PACKET_ENVELOPE_INVALID");
  return packet as unknown as TrackBPreprodOperationPacket;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function persistExclusive(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
    await handle.writeFile(`${canonicalJsonV1(value)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readJson(path);
    if (canonicalJsonV1(existing) !== canonicalJsonV1(value)) {
      throw new Error("TRACK_B_B3_2_OPERATION_PACKET_CONFLICT");
    }
  } finally { await handle?.close(); }
  const directory = await open(dirname(path), "r");
  try {
    try { await directory.sync(); } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EPERM" && code !== "ENOTSUP" && code !== "EINVAL") throw error;
    }
  } finally { await directory.close(); }
  if (canonicalJsonV1(await readJson(path)) !== canonicalJsonV1(value)) {
    throw new Error("TRACK_B_B3_2_OPERATION_PACKET_READBACK_MISMATCH");
  }
}

function pointerWithTarget(previous: RuntimeBehaviorModePointer, version: RuntimeBehaviorModePointer["version"]): RuntimeBehaviorModePointer {
  return {
    version,
    pointerRevision: previous.pointerRevision + 1,
    updatedBy: "TRACK_B_B3_2_WRITER",
    reason: "PRE_CAS_EXPECTATION_ONLY",
    updatedAt: previous.updatedAt,
  };
}

export function createTrackBPreprodOperationStartupPackages(input: Readonly<{
  direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  releaseEvidence: TrackBReleaseCandidateEvidence;
  releaseTag: string;
  releaseCreatedAt: string;
  targetServiceRevision: string;
}>) {
  const startupPackage = (authority: RuntimeBehaviorModePointer,
    transition?: "ROLLBACK_TRACK_B") => ({
      mode: "COMMERCE" as const,
      releaseEvidence: input.releaseEvidence,
      expectedAuthority: {
        pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
        channel: "MESSENGER" as const,
        modeVersionId: authority.version.modeVersionId,
        contentHash: authority.version.contentHash,
        pointerRevision: authority.pointerRevision,
        authorityBundleHash: authority.version.authorityBundleHash,
        source: "DATABASE" as const,
      },
      releaseSource: {
        schemaVersion: 1 as const,
        release: input.releaseTag,
        repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
        tag: input.releaseTag,
        commit: input.targetServiceRevision,
        createdAt: input.releaseCreatedAt,
      },
      ...(transition ? { authorityTransition: transition } : {}),
    });
  const operationTarget = startupPackage(input.target,
    input.direction === "ROLLBACK_TRACK_B" ? "ROLLBACK_TRACK_B" : undefined);
  const recovery = startupPackage({ ...input.previous,
    pointerRevision: input.target.pointerRevision + 1 },
  input.direction === "ACTIVATE_TRACK_B" ? "ROLLBACK_TRACK_B" : undefined);
  parseDf13CommercePreprodStartupInput(operationTarget);
  parseDf13CommercePreprodStartupInput(recovery);
  return Object.freeze({ operationTarget, recovery });
}

async function databaseUrl(): Promise<string> {
  const value = (await readFile(DATABASE_SECRET_FILE, "utf8")).trim();
  if (!value) throw new Error("TRACK_B_B3_2_DATABASE_CREDENTIAL_UNAVAILABLE");
  return value;
}

async function prepare(inputPath: string): Promise<void> {
  const input = parseTrackBPreprodPrepareInput(await readJson(resolve(inputPath)));
  const controllerInput = {
    composeFile: TRACK_B_PREPROD_FIXED_SCOPE.composeFile,
    projectDirectory: TRACK_B_PREPROD_FIXED_SCOPE.projectDirectory,
  };
  const previousController = new DockerComposeTrackBPreprodServiceController({
    ...controllerInput, startupPackageFile: input.previousStartupPackageFile,
    imageReference: input.previousImageTag, expectedImageId: input.previousService.imageId,
    labelPolicy: "OCI_REVISION_ONLY",
  });
  const targetController = new DockerComposeTrackBPreprodServiceController({
    ...controllerInput, startupPackageFile: input.targetStartupPackageFile,
    imageReference: input.targetImageTag, expectedImageId: input.targetService.imageId,
  });
  const currentController = input.direction === "ACTIVATE_TRACK_B" ? previousController : targetController;
  const currentService = input.direction === "ACTIVATE_TRACK_B" ? input.previousService : input.targetService;
  const stagedController = input.direction === "ACTIVATE_TRACK_B" ? targetController : previousController;
  const stagedService = input.direction === "ACTIVATE_TRACK_B" ? input.targetService : input.previousService;
  if (await currentController.inspectRunning(currentService) === null ||
      await stagedController.inspectImageAvailable(stagedService) === null) {
    throw new Error("TRACK_B_B3_2_SERVICE_PREFLIGHT_UNPROVEN");
  }
  const database = new TrackBPostgresPreprodDatabaseBoundary(await databaseUrl(), input.operationId);
  try {
    const previous = await database.readActivePointer();
    if (previous === null) throw new Error("TRACK_B_B3_2_PREVIOUS_POINTER_MISSING");
    const currentStartup = parseDf13CommercePreprodStartupInput(
      await readJson(input.direction === "ACTIVATE_TRACK_B"
        ? input.previousStartupPackageFile : input.targetStartupPackageFile),
    );
    const currentStartupReleaseRevision = currentStartup.mode === "COMMERCE" &&
      currentStartup.authorityTransition === "ROLLBACK_TRACK_B"
      ? input.targetService.releaseRevision
      : currentService.releaseRevision;
    if (currentStartup.mode !== "COMMERCE" ||
        currentStartup.releaseSource.commit !== currentStartupReleaseRevision ||
        currentStartup.expectedAuthority.pageId !== input.pageId ||
        currentStartup.expectedAuthority.channel !== input.channel ||
        currentStartup.expectedAuthority.modeVersionId !== previous.version.modeVersionId ||
        currentStartup.expectedAuthority.contentHash !== previous.version.contentHash ||
        currentStartup.expectedAuthority.pointerRevision !== previous.pointerRevision ||
        currentStartup.expectedAuthority.authorityBundleHash !== previous.version.authorityBundleHash ||
        currentStartup.expectedAuthority.source !== "DATABASE") {
      throw new Error("TRACK_B_B3_2_PREVIOUS_STARTUP_PACKAGE_MISMATCH");
    }
    const version = input.direction === "ACTIVATE_TRACK_B"
      ? await database.prepareTarget(previous)
      : await database.readExactVersion({ pageId: input.pageId, channel: input.channel,
        modeVersionId: input.rollbackTargetVersionId! });
    if (version === null || (input.direction === "ROLLBACK_TRACK_B" &&
        version.authorityBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash)) {
      throw new Error("TRACK_B_B3_2_ROLLBACK_TARGET_INVALID");
    }
    const target = pointerWithTarget(previous, version);
    const rollbackStore = new ReleaseLocalRollbackRecordStore(ROLLBACK_ROOT);
    const rollbackRecord = input.direction === "ACTIVATE_TRACK_B"
      ? createTrackBReleaseLocalRollbackRecord({
        selectedSourceCommit: input.targetService.releaseRevision,
        previousService: input.previousService,
        targetService: input.targetService,
        previousAuthority: { modeVersionId: previous.version.modeVersionId,
          contentHash: previous.version.contentHash,
          bundleHash: previous.version.authorityBundleHash ?? "" },
        targetAuthority: { modeVersionId: target.version.modeVersionId,
          contentHash: target.version.contentHash,
          bundleHash: target.version.authorityBundleHash ?? "" },
      })
      : await rollbackStore.read(input.rollbackRecordHash!);
    if (rollbackRecord === null || (input.direction === "ROLLBACK_TRACK_B" &&
        (canonicalJsonV1(rollbackRecord.previousService) !== canonicalJsonV1(input.previousService) ||
         canonicalJsonV1(rollbackRecord.targetService) !== canonicalJsonV1(input.targetService) ||
         rollbackRecord.previousAuthority.modeVersionId !== target.version.modeVersionId ||
         rollbackRecord.previousAuthority.contentHash !== target.version.contentHash ||
         rollbackRecord.previousAuthority.bundleHash !== target.version.authorityBundleHash ||
         rollbackRecord.targetAuthority.modeVersionId !== previous.version.modeVersionId ||
         rollbackRecord.targetAuthority.contentHash !== previous.version.contentHash ||
         rollbackRecord.targetAuthority.bundleHash !== previous.version.authorityBundleHash))) {
      throw new Error("TRACK_B_B3_2_ROLLBACK_RECORD_MISMATCH");
    }
    const validation = validateTrackBReleaseCandidateEvidence(input.releaseEvidence, {
      activationReleaseRevision: rollbackRecord.selectedSourceCommit,
    });
    if (validation.status !== "MATCHED") throw new Error("TRACK_B_B3_2_RELEASE_EVIDENCE_INVALID");
    const expectedBuildId = trackBBuildIdV1({ sourceCommit: input.targetService.releaseRevision,
      sourceTree: input.releaseEvidence.releaseSource.treeOid ?? "", runtimeConfigHash:
        input.targetService.runtimeConfigHash });
    if (expectedBuildId !== input.targetService.buildId) {
      throw new Error("TRACK_B_B3_2_TARGET_BUILD_ID_MISMATCH");
    }
    const operationTargetStartupPath = input.direction === "ACTIVATE_TRACK_B"
      ? input.targetStartupPackageFile : input.rollbackStartupPackageFile!;
    if (input.recoveryStartupPackageFile === operationTargetStartupPath) {
      throw new Error("TRACK_B_B3_2_STARTUP_PACKAGE_PATH_CONFLICT");
    }
    const startupPackages = createTrackBPreprodOperationStartupPackages({
      direction: input.direction,
      previous,
      target,
      releaseEvidence: input.releaseEvidence,
      releaseTag: input.releaseTag,
      releaseCreatedAt: input.releaseCreatedAt,
      targetServiceRevision: input.targetService.releaseRevision,
    });
    await persistExclusive(operationTargetStartupPath, startupPackages.operationTarget);
    await persistExclusive(input.recoveryStartupPackageFile, startupPackages.recovery);
    await rollbackStore.persist(rollbackRecord);
    const body = {
      schemaVersion: 1 as const,
      contractVersion: "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V1" as const,
      environment: "ENGINEERING_PREPROD" as const,
      pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
      channel: "MESSENGER" as const,
      operationId: input.operationId,
      direction: input.direction,
      previous,
      target,
      rollbackRecord,
      previousImageTag: input.previousImageTag,
      targetImageTag: input.targetImageTag,
      releaseTag: input.releaseTag,
      releaseCreatedAt: input.releaseCreatedAt,
      sourceStartupPackageFile: input.direction === "ACTIVATE_TRACK_B"
        ? input.previousStartupPackageFile : input.targetStartupPackageFile,
      operationTargetStartupPackageFile: operationTargetStartupPath,
      recoveryStartupPackageFile: input.recoveryStartupPackageFile,
      releaseEvidence: input.direction === "ACTIVATE_TRACK_B" ? input.releaseEvidence : null,
    };
    const packet = { ...body, packetHash: hash(body) };
    await mkdir(OPERATION_ROOT, { recursive: true, mode: 0o700 });
    await persistExclusive(`${OPERATION_ROOT}/${input.operationId}.json`, packet);
    process.stdout.write(`${JSON.stringify({ status: "PREPARED", operationId: input.operationId,
      packetHash: packet.packetHash, rollbackRecordHash: rollbackRecord.recordHash })}\n`);
  } finally { await database.close(); }
}

async function build(inputPath: string): Promise<void> {
  const input = parseTrackBPreprodBuildInput(await readJson(resolve(inputPath)));
  const identity = await new TrackBPreprodImageBuilder().build({
    sourceCommit: input.sourceCommit,
    sourceTree: input.sourceTree,
    imageReference: input.imageTag,
    runtimeConfig: input.runtimeConfig,
  });
  process.stdout.write(`${JSON.stringify({ status: "BUILT", identity })}\n`);
}

async function runPacket(packetPath: string, recovery: boolean): Promise<void> {
  const packet = parseTrackBPreprodOperationPacket(await readJson(resolve(packetPath)));
  const database = new TrackBPostgresPreprodDatabaseBoundary(await databaseUrl(), packet.operationId);
  const common = {
    composeFile: TRACK_B_PREPROD_FIXED_SCOPE.composeFile,
    projectDirectory: TRACK_B_PREPROD_FIXED_SCOPE.projectDirectory,
  };
  const previousController = new DockerComposeTrackBPreprodServiceController({ ...common,
    startupPackageFile: packet.direction === "ACTIVATE_TRACK_B"
      ? packet.sourceStartupPackageFile : packet.operationTargetStartupPackageFile,
    imageReference: packet.previousImageTag,
    expectedImageId: packet.rollbackRecord.previousService.imageId,
    labelPolicy: "OCI_REVISION_ONLY" });
  const targetController = new DockerComposeTrackBPreprodServiceController({ ...common,
    startupPackageFile: packet.direction === "ACTIVATE_TRACK_B"
      ? packet.operationTargetStartupPackageFile : packet.sourceStartupPackageFile,
    imageReference: packet.targetImageTag,
    expectedImageId: packet.rollbackRecord.targetService.imageId });
  const recoveryController = new DockerComposeTrackBPreprodServiceController({ ...common,
    startupPackageFile: packet.recoveryStartupPackageFile,
    imageReference: packet.direction === "ACTIVATE_TRACK_B"
      ? packet.previousImageTag : packet.targetImageTag,
    expectedImageId: packet.direction === "ACTIVATE_TRACK_B"
      ? packet.rollbackRecord.previousService.imageId : packet.rollbackRecord.targetService.imageId,
    ...(packet.direction === "ACTIVATE_TRACK_B" ? { labelPolicy: "OCI_REVISION_ONLY" as const } : {}),
  });
  const sourceIdentity = packet.direction === "ACTIVATE_TRACK_B"
    ? packet.rollbackRecord.previousService : packet.rollbackRecord.targetService;
  const operationTargetIdentity = packet.direction === "ACTIVATE_TRACK_B"
    ? packet.rollbackRecord.targetService : packet.rollbackRecord.previousService;
  const sourceController = packet.direction === "ACTIVATE_TRACK_B" ? previousController : targetController;
  const operationTargetController = packet.direction === "ACTIVATE_TRACK_B" ? targetController : previousController;
  const recoveryPointer = { ...packet.previous, pointerRevision: packet.target.pointerRevision + 1 };
  const service = new TrackBPreprodServicePairController({
    previousIdentity: packet.rollbackRecord.previousService,
    targetIdentity: packet.rollbackRecord.targetService,
    previous: previousController,
    target: targetController,
    startRoutes: [
      { identity: sourceIdentity, pointer: packet.previous, controller: sourceController },
      { identity: operationTargetIdentity, pointer: packet.target, controller: operationTargetController },
      { identity: sourceIdentity, pointer: recoveryPointer, controller: recoveryController },
    ],
  });
  const rollbackStore = new ReleaseLocalRollbackRecordStore(ROLLBACK_ROOT);
  const ports = createTrackBCommerceAuthorityPreprodAdapter({ database, service, rollbackStore,
    quiescence: { timeoutMs: 120_000, pollMs: 1_000,
      wait: (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)) } });
  try {
    const execute = recovery ? recoverTrackBCommerceAuthorityMutationAfterInterruption :
      executeTrackBCommerceAuthorityMutation;
    const result = await execute({ operationId: packet.operationId,
      direction: packet.direction, previous: packet.previous, target: packet.target,
      rollbackRecord: packet.rollbackRecord, ports,
      ...(packet.releaseEvidence === null ? {} : { releaseEvidence: packet.releaseEvidence }) });
    process.stdout.write(`${JSON.stringify({ status: result.status, reasonCodes: result.reasonCodes,
      operationId: packet.operationId, packetHash: packet.packetHash })}\n`);
    if (result.status !== "TARGET_ACTIVE" && result.status !== "PREVIOUS_RESTORED") process.exitCode = 2;
  } finally { await database.close(); }
}

async function main() {
  const [command, path, extra] = process.argv.slice(2);
  if (extra !== undefined || !path || !["build", "prepare", "execute", "recover"].includes(command ?? "")) {
    throw new Error("usage: track-b-authority:preprod <build|prepare|execute|recover> <exact-json-path>");
  }
  if (command === "build") await build(path);
  else if (command === "prepare") await prepare(path);
  else await runPacket(path, command === "recover");
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error: unknown) => {
    const code = error instanceof Error && /^TRACK_B_[A-Z0-9_]+$/u.test(error.message)
      ? error.message : "TRACK_B_B3_2_OPERATOR_FAILED";
    process.stderr.write(`${JSON.stringify({ status: "BLOCKED", code, operationId: randomUUID() })}\n`);
    process.exitCode = 1;
  });
}
