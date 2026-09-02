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
  previousService: TrackBServiceReleaseIdentity;
  targetService: TrackBServiceReleaseIdentity;
  previousImageTag: string;
  targetImageTag: string;
  releaseTag: string;
  releaseCreatedAt: string;
  previousStartupPackageFile: string;
  targetStartupPackageFile: string;
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
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  rollbackRecord: TrackBReleaseLocalRollbackRecord;
  previousImageTag: string;
  targetImageTag: string;
  releaseTag: string;
  releaseCreatedAt: string;
  previousStartupPackageFile: string;
  targetStartupPackageFile: string;
  releaseEvidence: TrackBReleaseCandidateEvidence;
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

function parsePrepareInput(value: unknown): PrepareInput {
  const input = object(value);
  if (!exactKeys(input, ["schemaVersion", "environment", "pageId", "channel", "operationId",
    "previousService", "targetService", "previousImageTag", "targetImageTag",
    "releaseTag", "releaseCreatedAt",
    "previousStartupPackageFile", "targetStartupPackageFile",
    "releaseEvidence"]) || input.schemaVersion !== 1 || input.environment !== "ENGINEERING_PREPROD" ||
      input.pageId !== TRACK_B_PREPROD_FIXED_SCOPE.pageId || input.channel !== "MESSENGER" ||
      typeof input.operationId !== "string" || !UUID_V4.test(input.operationId)) {
    throw new Error("TRACK_B_B3_2_OPERATOR_SCOPE_INVALID");
  }
  return {
    schemaVersion: 1,
    environment: "ENGINEERING_PREPROD",
    pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
    channel: "MESSENGER",
    operationId: input.operationId.toLowerCase(),
    previousService: input.previousService as TrackBServiceReleaseIdentity,
    targetService: input.targetService as TrackBServiceReleaseIdentity,
    previousImageTag: imageTag(input.previousImageTag),
    targetImageTag: imageTag(input.targetImageTag),
    releaseTag: releaseTag(input.releaseTag),
    releaseCreatedAt: instant(input.releaseCreatedAt),
    previousStartupPackageFile: previousStartupPath(input.previousStartupPackageFile),
    targetStartupPackageFile: startupPath(input.targetStartupPackageFile),
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
    "operationId", "previous", "target", "rollbackRecord", "previousImageTag", "targetImageTag",
    "releaseTag", "releaseCreatedAt",
    "previousStartupPackageFile",
    "targetStartupPackageFile", "releaseEvidence", "packetHash"]) ||
      packet.schemaVersion !== 1 || packet.contractVersion !== "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V1" ||
      packet.environment !== "ENGINEERING_PREPROD" || packet.pageId !== TRACK_B_PREPROD_FIXED_SCOPE.pageId ||
      packet.channel !== "MESSENGER" || typeof packet.operationId !== "string" ||
      !UUID_V4.test(packet.operationId) || typeof packet.packetHash !== "string" ||
      !SHA256.test(packet.packetHash)) throw new Error("TRACK_B_B3_2_OPERATION_PACKET_INVALID");
  const { packetHash, ...body } = packet;
  if (hash(body) !== packetHash) throw new Error("TRACK_B_B3_2_OPERATION_PACKET_HASH_MISMATCH");
  previousStartupPath(packet.previousStartupPackageFile);
  startupPath(packet.targetStartupPackageFile);
  imageTag(packet.previousImageTag);
  imageTag(packet.targetImageTag);
  releaseTag(packet.releaseTag);
  instant(packet.releaseCreatedAt);
  if (!validateTrackBCommerceAuthorityMutationEnvelope({
    operationId: packet.operationId,
    direction: "ACTIVATE_TRACK_B",
    previous: packet.previous as RuntimeBehaviorModePointer,
    target: packet.target as RuntimeBehaviorModePointer,
    rollbackRecord: packet.rollbackRecord as TrackBReleaseLocalRollbackRecord,
    releaseEvidence: packet.releaseEvidence as TrackBReleaseCandidateEvidence,
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

async function databaseUrl(): Promise<string> {
  const value = (await readFile(DATABASE_SECRET_FILE, "utf8")).trim();
  if (!value) throw new Error("TRACK_B_B3_2_DATABASE_CREDENTIAL_UNAVAILABLE");
  return value;
}

async function prepare(inputPath: string): Promise<void> {
  const input = parsePrepareInput(await readJson(resolve(inputPath)));
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
  if (await previousController.inspectRunning(input.previousService) === null ||
      await targetController.inspectImageAvailable(input.targetService) === null) {
    throw new Error("TRACK_B_B3_2_SERVICE_PREFLIGHT_UNPROVEN");
  }
  const database = new TrackBPostgresPreprodDatabaseBoundary(await databaseUrl(), input.operationId);
  try {
    const previous = await database.readActivePointer();
    if (previous === null) throw new Error("TRACK_B_B3_2_PREVIOUS_POINTER_MISSING");
    const previousStartup = parseDf13CommercePreprodStartupInput(
      await readJson(input.previousStartupPackageFile),
    );
    if (previousStartup.mode !== "COMMERCE" ||
        previousStartup.releaseSource.commit !== input.previousService.releaseRevision ||
        previousStartup.expectedAuthority.pageId !== input.pageId ||
        previousStartup.expectedAuthority.channel !== input.channel ||
        previousStartup.expectedAuthority.modeVersionId !== previous.version.modeVersionId ||
        previousStartup.expectedAuthority.contentHash !== previous.version.contentHash ||
        previousStartup.expectedAuthority.pointerRevision !== previous.pointerRevision ||
        previousStartup.expectedAuthority.authorityBundleHash !== previous.version.authorityBundleHash ||
        previousStartup.expectedAuthority.source !== "DATABASE") {
      throw new Error("TRACK_B_B3_2_PREVIOUS_STARTUP_PACKAGE_MISMATCH");
    }
    const version = await database.prepareTarget(previous);
    const target = pointerWithTarget(previous, version);
    const rollbackRecord = createTrackBReleaseLocalRollbackRecord({
      selectedSourceCommit: input.targetService.releaseRevision,
      previousService: input.previousService,
      targetService: input.targetService,
      previousAuthority: {
        modeVersionId: previous.version.modeVersionId,
        contentHash: previous.version.contentHash,
        bundleHash: previous.version.authorityBundleHash ?? "",
      },
      targetAuthority: {
        modeVersionId: target.version.modeVersionId,
        contentHash: target.version.contentHash,
        bundleHash: target.version.authorityBundleHash ?? "",
      },
    });
    const validation = validateTrackBReleaseCandidateEvidence(input.releaseEvidence, {
      activationReleaseRevision: rollbackRecord.selectedSourceCommit,
    });
    if (validation.status !== "MATCHED") throw new Error("TRACK_B_B3_2_RELEASE_EVIDENCE_INVALID");
    const targetStartupPackage = {
      mode: "COMMERCE" as const,
      releaseEvidence: input.releaseEvidence,
      expectedAuthority: {
        pageId: input.pageId,
        channel: input.channel,
        modeVersionId: target.version.modeVersionId,
        contentHash: target.version.contentHash,
        pointerRevision: target.pointerRevision,
        authorityBundleHash: target.version.authorityBundleHash,
        source: "DATABASE" as const,
      },
      releaseSource: {
        schemaVersion: 1 as const,
        release: input.releaseTag,
        repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
        tag: input.releaseTag,
        commit: input.targetService.releaseRevision,
        createdAt: input.releaseCreatedAt,
      },
    };
    parseDf13CommercePreprodStartupInput(targetStartupPackage);
    await persistExclusive(input.targetStartupPackageFile, targetStartupPackage);
    const rollbackStore = new ReleaseLocalRollbackRecordStore(ROLLBACK_ROOT);
    await rollbackStore.persist(rollbackRecord);
    const body = {
      schemaVersion: 1 as const,
      contractVersion: "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V1" as const,
      environment: "ENGINEERING_PREPROD" as const,
      pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
      channel: "MESSENGER" as const,
      operationId: input.operationId,
      previous,
      target,
      rollbackRecord,
      previousImageTag: input.previousImageTag,
      targetImageTag: input.targetImageTag,
      releaseTag: input.releaseTag,
      releaseCreatedAt: input.releaseCreatedAt,
      previousStartupPackageFile: input.previousStartupPackageFile,
      targetStartupPackageFile: input.targetStartupPackageFile,
      releaseEvidence: input.releaseEvidence,
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
    startupPackageFile: packet.previousStartupPackageFile,
    imageReference: packet.previousImageTag,
    expectedImageId: packet.rollbackRecord.previousService.imageId,
    labelPolicy: "OCI_REVISION_ONLY" });
  const targetController = new DockerComposeTrackBPreprodServiceController({ ...common,
    startupPackageFile: packet.targetStartupPackageFile,
    imageReference: packet.targetImageTag,
    expectedImageId: packet.rollbackRecord.targetService.imageId });
  const service = new TrackBPreprodServicePairController({
    previousIdentity: packet.rollbackRecord.previousService,
    targetIdentity: packet.rollbackRecord.targetService,
    previous: previousController,
    target: targetController,
  });
  const rollbackStore = new ReleaseLocalRollbackRecordStore(ROLLBACK_ROOT);
  const ports = createTrackBCommerceAuthorityPreprodAdapter({ database, service, rollbackStore,
    quiescence: { timeoutMs: 120_000, pollMs: 1_000,
      wait: (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)) } });
  try {
    const execute = recovery ? recoverTrackBCommerceAuthorityMutationAfterInterruption :
      executeTrackBCommerceAuthorityMutation;
    const result = await execute({ operationId: packet.operationId,
      direction: "ACTIVATE_TRACK_B", previous: packet.previous, target: packet.target,
      rollbackRecord: packet.rollbackRecord, releaseEvidence: packet.releaseEvidence, ports });
    process.stdout.write(`${JSON.stringify({ status: result.status, reasonCodes: result.reasonCodes,
      operationId: packet.operationId, packetHash: packet.packetHash })}\n`);
    if (result.status !== "TARGET_ACTIVE" && result.status !== "PREVIOUS_RESTORED") process.exitCode = 2;
  } finally { await database.close(); }
}

async function main() {
  const [command, path, extra] = process.argv.slice(2);
  if (extra !== undefined || !path || !["build", "prepare", "activate", "recover"].includes(command ?? "")) {
    throw new Error("usage: track-b-authority:preprod <build|prepare|activate|recover> <exact-json-path>");
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
