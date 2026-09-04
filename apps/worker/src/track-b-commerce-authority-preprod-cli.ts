import { canonicalJsonV1 } from "@lana/contracts";
import { execFile as execFileCallback } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
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
  type TrackBPreprodDatabaseBoundary,
} from "./track-b-commerce-authority-preprod-adapter.js";
import {
  createTrackBReleaseLocalRollbackRecord,
  executeTrackBCommerceAuthorityMutation,
  recoverTrackBCommerceAuthorityMutationAfterInterruption,
  validateTrackBCommerceAuthorityMutationEnvelope,
  type TrackBReleaseLocalRollbackRecord,
  type TrackBServiceReleaseIdentity,
  type TrackBV2RollbackReleaseIdentity,
} from "./track-b-commerce-authority-activation.js";
import {
  validateTrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidence,
} from "./track-b-release-candidate-evidence.js";
import { createDf13CommercePreprodStartupAuthority,
  parseDf13CommercePreprodStartupInput } from "./df13-commerce-preprod-startup-authority.js";

const DATABASE_SECRET_FILE = "/opt/lana-chatbot/shared/secrets/runtime_behavior_mode_database_url";
const execFile = promisify(execFileCallback);
const POSTGRES_CONTAINER = "lana-chatbot-postgres";
const OPERATION_ROOT = "/opt/lana-chatbot/releases/track-b/operations";
const ROLLBACK_ROOT = "/opt/lana-chatbot/releases/track-b/rollback-records";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256 = /^[a-f0-9]{64}$/u;
const TRACK_B_CURRENT_LKG_RUNTIME_FRESHNESS = Object.freeze({ maximumAttempts: 120, pollMs: 1_000 });
export type CommerceStartup = Exclude<ReturnType<typeof parseDf13CommercePreprodStartupInput>,
  { mode: "LEGACY" }>;

type PrepareInput = Readonly<{
  schemaVersion: 3;
  environment: "ENGINEERING_PREPROD";
  pageId: "1198992073286645";
  channel: "MESSENGER";
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  candidateService: TrackBServiceReleaseIdentity;
  lastKnownGoodService: TrackBServiceReleaseIdentity;
  candidateImageTag: string;
  lastKnownGoodImageTag: string;
  candidateStartupPackageFile: string;
  lastKnownGoodStartupPackageFile: string;
  operationTargetStartupPackageFile: string;
  recoveryStartupPackageFile: string;
  candidateReleaseEvidence: TrackBReleaseCandidateEvidence;
  lastKnownGoodReleaseEvidence: TrackBReleaseCandidateEvidence;
  lastKnownGoodRecordHash: string | null;
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
  schemaVersion: 2;
  contractVersion: "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V2_LKG";
  environment: "ENGINEERING_PREPROD";
  pageId: "1198992073286645";
  channel: "MESSENGER";
  operationId: string;
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  rollbackRecord: TrackBReleaseLocalRollbackRecord;
  candidateImageTag: string;
  lastKnownGoodImageTag: string;
  sourceStartupPackageFile: string;
  sourceStartupPackageHash: string;
  operationTargetStartupPackageFile: string;
  operationTargetStartupPackageHash: string;
  recoveryStartupPackageFile: string;
  recoveryStartupPackageHash: string;
  releaseEvidence: TrackBReleaseCandidateEvidence;
  packetHash: string;
}>;

function hash(value: unknown) {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

export function validateTrackBV2LastKnownGoodSelection(input: Readonly<{
  accepted: TrackBReleaseLocalRollbackRecord | null;
  acceptedRecordHash: string;
  candidate: TrackBV2RollbackReleaseIdentity;
  lastKnownGood: TrackBV2RollbackReleaseIdentity;
}>): boolean {
  return input.accepted !== null && input.accepted.recordHash === input.acceptedRecordHash &&
    canonicalJsonV1(input.accepted.candidate) === canonicalJsonV1(input.candidate) &&
    canonicalJsonV1(input.accepted.lastKnownGood) === canonicalJsonV1(input.lastKnownGood);
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

function imageTag(value: unknown): string {
  if (typeof value !== "string" ||
      !/^[a-z0-9][a-z0-9._/-]{0,127}:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(value)) {
    throw new Error("TRACK_B_B3_2_IMAGE_TAG_INVALID");
  }
  return value;
}

export function parseTrackBPreprodPrepareInput(value: unknown): PrepareInput {
  const input = object(value);
  if (!exactKeys(input, ["schemaVersion", "environment", "pageId", "channel", "operationId", "direction",
    "candidateService", "lastKnownGoodService", "candidateImageTag", "lastKnownGoodImageTag",
    "candidateStartupPackageFile", "lastKnownGoodStartupPackageFile",
    "operationTargetStartupPackageFile", "recoveryStartupPackageFile",
    "candidateReleaseEvidence", "lastKnownGoodReleaseEvidence",
    "lastKnownGoodRecordHash"]) ||
      input.schemaVersion !== 3 || input.environment !== "ENGINEERING_PREPROD" ||
      input.pageId !== TRACK_B_PREPROD_FIXED_SCOPE.pageId || input.channel !== "MESSENGER" ||
      typeof input.operationId !== "string" || !UUID_V4.test(input.operationId) ||
      !["ACTIVATE_V2_CANDIDATE", "ROLLBACK_TO_LKG_V2"].includes(String(input.direction)) ||
      (input.direction === "ACTIVATE_V2_CANDIDATE" && input.lastKnownGoodRecordHash !== null) ||
      (input.direction === "ROLLBACK_TO_LKG_V2" &&
        (typeof input.lastKnownGoodRecordHash !== "string" || !SHA256.test(input.lastKnownGoodRecordHash)))) {
    throw new Error("TRACK_B_B3_2_OPERATOR_SCOPE_INVALID");
  }
  return {
    schemaVersion: 3,
    environment: "ENGINEERING_PREPROD",
    pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
    channel: "MESSENGER",
    operationId: input.operationId.toLowerCase(),
    direction: input.direction as PrepareInput["direction"],
    candidateService: input.candidateService as TrackBServiceReleaseIdentity,
    lastKnownGoodService: input.lastKnownGoodService as TrackBServiceReleaseIdentity,
    candidateImageTag: imageTag(input.candidateImageTag),
    lastKnownGoodImageTag: imageTag(input.lastKnownGoodImageTag),
    candidateStartupPackageFile: startupPath(input.candidateStartupPackageFile),
    lastKnownGoodStartupPackageFile: startupPath(input.lastKnownGoodStartupPackageFile),
    operationTargetStartupPackageFile: startupPath(input.operationTargetStartupPackageFile),
    recoveryStartupPackageFile: startupPath(input.recoveryStartupPackageFile),
    candidateReleaseEvidence: input.candidateReleaseEvidence as TrackBReleaseCandidateEvidence,
    lastKnownGoodReleaseEvidence: input.lastKnownGoodReleaseEvidence as TrackBReleaseCandidateEvidence,
    lastKnownGoodRecordHash: input.lastKnownGoodRecordHash as string | null,
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
  const baseKeys = ["schemaVersion", "contractVersion", "environment", "pageId", "channel",
    "operationId", "direction", "previous", "target", "rollbackRecord", "candidateImageTag", "lastKnownGoodImageTag",
    "sourceStartupPackageFile", "sourceStartupPackageHash",
    "operationTargetStartupPackageFile", "operationTargetStartupPackageHash",
    "recoveryStartupPackageFile", "recoveryStartupPackageHash", "releaseEvidence", "packetHash"] as const;
  if (!exactKeys(packet, baseKeys) ||
      packet.schemaVersion !== 2 || packet.contractVersion !== "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V2_LKG" ||
      packet.environment !== "ENGINEERING_PREPROD" || packet.pageId !== TRACK_B_PREPROD_FIXED_SCOPE.pageId ||
      packet.channel !== "MESSENGER" || typeof packet.operationId !== "string" ||
      !UUID_V4.test(packet.operationId) ||
      !["ACTIVATE_V2_CANDIDATE", "ROLLBACK_TO_LKG_V2"].includes(String(packet.direction)) ||
      !SHA256.test(String(packet.sourceStartupPackageHash)) ||
      !SHA256.test(String(packet.operationTargetStartupPackageHash)) ||
      !SHA256.test(String(packet.recoveryStartupPackageHash)) ||
      typeof packet.packetHash !== "string" ||
      !SHA256.test(packet.packetHash)) throw new Error("TRACK_B_B3_2_OPERATION_PACKET_INVALID");
  const { packetHash, ...body } = packet;
  if (hash(body) !== packetHash) throw new Error("TRACK_B_B3_2_OPERATION_PACKET_HASH_MISMATCH");
  startupPath(packet.sourceStartupPackageFile);
  startupPath(packet.operationTargetStartupPackageFile);
  startupPath(packet.recoveryStartupPackageFile);
  imageTag(packet.candidateImageTag);
  imageTag(packet.lastKnownGoodImageTag);
  if (!validateTrackBCommerceAuthorityMutationEnvelope({
    operationId: packet.operationId,
    direction: packet.direction as TrackBPreprodOperationPacket["direction"],
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

async function persistExclusive(path: string, value: unknown, mode = 0o600): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const payload = `${canonicalJsonV1(value)}\n`;
  let handle;
  let created = false;
  try {
    handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR |
      constants.O_NOFOLLOW, mode);
    created = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  }
  try {
    if (created) {
      await handle.writeFile(payload, "utf8");
      await handle.sync();
    } else {
      const existing = JSON.parse(await handle.readFile("utf8")) as unknown;
      if (canonicalJsonV1(existing) !== canonicalJsonV1(value)) {
        throw new Error("TRACK_B_B3_2_OPERATION_PACKET_CONFLICT");
      }
    }
    await handle.chmod(mode);
    try { await handle.sync(); } catch (error) {
      if (process.platform !== "win32" ||
          (error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    }
    const metadata = await handle.stat();
    if (!metadata.isFile() || (metadata.mode & 0o777) !== mode) {
      throw new Error("TRACK_B_B3_2_OPERATION_ARTIFACT_MODE_MISMATCH");
    }
  } finally { await handle.close(); }
  const directory = await open(dirname(path), "r");
  try {
    try { await directory.sync(); } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EPERM" && code !== "ENOTSUP" && code !== "EINVAL") throw error;
    }
  } finally { await directory.close(); }
  const readback = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const metadata = await readback.stat();
    const persisted = JSON.parse(await readback.readFile("utf8")) as unknown;
    if (!metadata.isFile() || (metadata.mode & 0o777) !== mode ||
        canonicalJsonV1(persisted) !== canonicalJsonV1(value)) {
      throw new Error("TRACK_B_B3_2_OPERATION_PACKET_READBACK_MISMATCH");
    }
  } finally { await readback.close(); }
}

export async function persistTrackBPreprodRuntimeStartupArtifact(path: string,
  value: unknown): Promise<void> {
  await persistExclusive(path, value, 0o444);
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

/**
 * A rollback's immutable LKG startup proves the previously accepted release.
 * Its historical pointer revision intentionally precedes the new forward CAS
 * revision encoded in the generated operation-target startup artifact.
 */
export function matchesTrackBOperationTargetStartupBaseline(input: Readonly<{
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  startup: CommerceStartup;
  target: RuntimeBehaviorModePointer;
}>): boolean {
  const expected = input.startup.expectedAuthority;
  const immutableIdentityMatches = input.startup.mode === "COMMERCE" &&
    expected.modeVersionId === input.target.version.modeVersionId &&
    expected.contentHash === input.target.version.contentHash &&
    expected.authorityBundleHash === input.target.version.authorityBundleHash &&
    expected.source === "DATABASE";
  if (!immutableIdentityMatches) return false;
  return input.direction === "ACTIVATE_V2_CANDIDATE"
    ? expected.pointerRevision === input.target.pointerRevision
    : Number.isSafeInteger(expected.pointerRevision) && expected.pointerRevision >= 1 &&
      expected.pointerRevision < input.target.pointerRevision;
}

export function createTrackBPreprodOperationStartupPackages(input: Readonly<{
  direction: "ACTIVATE_V2_CANDIDATE" | "ROLLBACK_TO_LKG_V2";
  previous: RuntimeBehaviorModePointer;
  target: RuntimeBehaviorModePointer;
  releaseEvidence: TrackBReleaseCandidateEvidence;
  recoveryReleaseEvidence: TrackBReleaseCandidateEvidence;
  targetReleaseSource: CommerceStartup["releaseSource"];
  recoveryReleaseSource: CommerceStartup["releaseSource"];
}>) {
  const startupPackage = (authority: RuntimeBehaviorModePointer,
    evidence: TrackBReleaseCandidateEvidence,
    releaseSource: CommerceStartup["releaseSource"],
    transition?: "ROLLBACK_TO_LKG_V2") => ({
      mode: "COMMERCE" as const,
      releaseEvidence: evidence,
      expectedAuthority: {
        pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
        channel: "MESSENGER" as const,
        modeVersionId: authority.version.modeVersionId,
        contentHash: authority.version.contentHash,
        pointerRevision: authority.pointerRevision,
        authorityBundleHash: authority.version.authorityBundleHash,
        source: "DATABASE" as const,
      },
      releaseSource,
      ...(transition ? { authorityTransition: transition } : {}),
    });
  const operationTarget = startupPackage(input.target, input.releaseEvidence,
    input.targetReleaseSource,
    input.direction === "ROLLBACK_TO_LKG_V2" ? "ROLLBACK_TO_LKG_V2" : undefined);
  const recovery = startupPackage({ ...input.previous,
    pointerRevision: input.target.pointerRevision + 1 }, input.recoveryReleaseEvidence,
  input.recoveryReleaseSource,
  input.direction === "ACTIVATE_V2_CANDIDATE" ? "ROLLBACK_TO_LKG_V2" : undefined);
  parseDf13CommercePreprodStartupInput(operationTarget);
  parseDf13CommercePreprodStartupInput(recovery);
  return Object.freeze({ operationTarget, recovery });
}

function startupMatchesPointer(value: ReturnType<typeof parseDf13CommercePreprodStartupInput>,
  pointer: RuntimeBehaviorModePointer): boolean {
  return value.mode === "COMMERCE" && value.expectedAuthority.pageId === TRACK_B_PREPROD_FIXED_SCOPE.pageId &&
    value.expectedAuthority.channel === "MESSENGER" &&
    value.expectedAuthority.modeVersionId === pointer.version.modeVersionId &&
    value.expectedAuthority.contentHash === pointer.version.contentHash &&
    value.expectedAuthority.pointerRevision === pointer.pointerRevision &&
    value.expectedAuthority.authorityBundleHash === pointer.version.authorityBundleHash &&
    value.expectedAuthority.source === "DATABASE";
}

export async function validateTrackBPreprodStartupArtifacts(packet: TrackBPreprodOperationPacket,
  reader: (path: string) => Promise<unknown> = readJson): Promise<Readonly<{
    sourceStartup: CommerceStartup;
    operationTargetStartup: CommerceStartup;
    recoveryStartup: CommerceStartup;
  }>> {
  const [sourceRaw, operationTargetRaw, recoveryRaw] = await Promise.all([
    reader(packet.sourceStartupPackageFile), reader(packet.operationTargetStartupPackageFile),
    reader(packet.recoveryStartupPackageFile),
  ]);
  if (hash(sourceRaw) !== packet.sourceStartupPackageHash ||
      hash(operationTargetRaw) !== packet.operationTargetStartupPackageHash ||
      hash(recoveryRaw) !== packet.recoveryStartupPackageHash) {
    throw new Error("TRACK_B_B3_2_STARTUP_PACKAGE_CONTENT_MISMATCH");
  }
  const source = parseDf13CommercePreprodStartupInput(sourceRaw);
  const operationTarget = parseDf13CommercePreprodStartupInput(operationTargetRaw);
  const recovery = parseDf13CommercePreprodStartupInput(recoveryRaw);
  if (!startupMatchesPointer(source, packet.previous) || source.mode !== "COMMERCE") {
    throw new Error("TRACK_B_B3_2_SOURCE_STARTUP_PACKAGE_MISMATCH");
  }
  const sourceIdentity = packet.direction === "ACTIVATE_V2_CANDIDATE"
    ? packet.rollbackRecord.lastKnownGood : packet.rollbackRecord.candidate;
  const targetIdentity = packet.direction === "ACTIVATE_V2_CANDIDATE"
    ? packet.rollbackRecord.candidate : packet.rollbackRecord.lastKnownGood;
  if (source.releaseSource.commit !== sourceIdentity.service.releaseRevision ||
      canonicalJsonV1(source.releaseEvidence) !== canonicalJsonV1(sourceIdentity.gateEEvidence)) {
    throw new Error("TRACK_B_B3_2_SOURCE_STARTUP_PACKAGE_MISMATCH");
  }
  const sourceAdmission = await createDf13CommercePreprodStartupAuthority(source)
    .authorizeExactCommerceIdentity(source.expectedAuthority);
  if (sourceAdmission.status !== "ADMITTED") {
    throw new Error("TRACK_B_B3_2_SOURCE_STARTUP_PACKAGE_NOT_ADMITTED");
  }
  if (operationTarget.mode !== "COMMERCE" || recovery.mode !== "COMMERCE" ||
      canonicalJsonV1(recovery.releaseEvidence) !== canonicalJsonV1(sourceIdentity.gateEEvidence)) {
    throw new Error("TRACK_B_B3_2_GENERATED_STARTUP_PACKAGE_MISMATCH");
  }
  const evidence = operationTarget.releaseEvidence as TrackBReleaseCandidateEvidence;
  if (canonicalJsonV1(evidence) !== canonicalJsonV1(targetIdentity.gateEEvidence) ||
      validateTrackBReleaseCandidateEvidence(evidence, {
    activationReleaseRevision: targetIdentity.service.releaseRevision,
  }).status !== "MATCHED") {
    throw new Error("TRACK_B_B3_2_GENERATED_STARTUP_PACKAGE_MISMATCH");
  }
  const expected = createTrackBPreprodOperationStartupPackages({ direction: packet.direction,
    previous: packet.previous, target: packet.target, releaseEvidence: evidence,
    recoveryReleaseEvidence: sourceIdentity.gateEEvidence,
    targetReleaseSource: operationTarget.releaseSource,
    recoveryReleaseSource: recovery.releaseSource });
  if (operationTarget.releaseSource.commit !== targetIdentity.service.releaseRevision ||
      recovery.releaseSource.commit !== sourceIdentity.service.releaseRevision) {
    throw new Error("TRACK_B_B3_2_GENERATED_STARTUP_PACKAGE_MISMATCH");
  }
  if (canonicalJsonV1(operationTarget) !== canonicalJsonV1(expected.operationTarget) ||
      canonicalJsonV1(recovery) !== canonicalJsonV1(expected.recovery)) {
    throw new Error("TRACK_B_B3_2_GENERATED_STARTUP_PACKAGE_MISMATCH");
  }
  if (hash(source) !== sourceIdentity.startupPackageHash ||
      hash(operationTarget) !== targetIdentity.startupPackageHash) {
    throw new Error("TRACK_B_B3_2_STARTUP_PACKAGE_IDENTITY_MISMATCH");
  }
  return Object.freeze({ sourceStartup: source, operationTargetStartup: operationTarget,
    recoveryStartup: recovery });
}

export function resolveTrackBPreprodDatabaseUrl(value: string, inspection: unknown): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("TRACK_B_B3_2_DATABASE_CREDENTIAL_INVALID"); }
  const inspected = object(inspection);
  const state = object(inspected.State);
  const health = object(state.Health);
  const config = object(inspected.Config);
  const labels = object(config.Labels);
  const networkSettings = object(inspected.NetworkSettings);
  const networks = object(networkSettings.Networks);
  const networkEntries = Object.values(networks).map(object);
  const address = networkEntries.length === 1 ? networkEntries[0]?.IPAddress : null;
  const octets = typeof address === "string" && /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(address)
    ? address.split(".").map(Number) : [];
  const privateAddress = octets.length === 4 && octets.every((part) => part >= 0 && part <= 255) &&
    (octets[0] === 10 || (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) ||
      (octets[0] === 192 && octets[1] === 168));
  if (parsed.protocol !== "postgresql:" || parsed.hostname !== "postgres" || parsed.port !== "5432" ||
      parsed.search !== "" || parsed.hash !== "" ||
      parsed.username.length === 0 || parsed.password.length === 0 || parsed.pathname !== "/lana_chatbot" ||
      inspected.Name !== `/${POSTGRES_CONTAINER}` ||
      state.Running !== true || health.Status !== "healthy" ||
      labels["com.docker.compose.project"] !== "lana-chatbot" ||
      labels["com.docker.compose.service"] !== "postgres" || typeof address !== "string" ||
      !privateAddress) {
    throw new Error("TRACK_B_B3_2_DATABASE_ENDPOINT_UNPROVEN");
  }
  parsed.hostname = address;
  return parsed.toString();
}

async function databaseUrl(): Promise<string> {
  const value = (await readFile(DATABASE_SECRET_FILE, "utf8")).trim();
  if (!value) throw new Error("TRACK_B_B3_2_DATABASE_CREDENTIAL_UNAVAILABLE");
  const inspected = await execFile("docker", ["inspect", POSTGRES_CONTAINER], {
    encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024,
  });
  let parsed: unknown;
  try { [parsed] = JSON.parse(inspected.stdout) as unknown[]; } catch {
    throw new Error("TRACK_B_B3_2_DATABASE_ENDPOINT_UNPROVEN");
  }
  return resolveTrackBPreprodDatabaseUrl(value, parsed);
}

export async function proveFreshTrackBInitialLkgRuntime(input: Readonly<{
  database: Pick<TrackBPreprodDatabaseBoundary, "readDatabaseClock" | "proveRuntimeResolution">;
  pointer: RuntimeBehaviorModePointer;
  freshness?: Readonly<{
    maximumAttempts: number;
    pollMs: number;
    wait: (milliseconds: number) => Promise<void>;
  }>;
}>): Promise<"EXACT" | "MISSING" | "AMBIGUOUS"> {
  const notBefore = await input.database.readDatabaseClock();
  const freshness = input.freshness ?? {
    ...TRACK_B_CURRENT_LKG_RUNTIME_FRESHNESS,
    wait: (milliseconds: number) => new Promise<void>((resolveWait) => setTimeout(resolveWait, milliseconds)),
  };
  if (!Number.isSafeInteger(freshness.maximumAttempts) || freshness.maximumAttempts < 1 ||
      !Number.isSafeInteger(freshness.pollMs) || freshness.pollMs < 1) {
    throw new Error("TRACK_B_B3_2_CURRENT_LKG_RUNTIME_OBSERVATION_INVALID");
  }
  for (let attempt = 0; attempt < freshness.maximumAttempts; attempt += 1) {
    const result = await input.database.proveRuntimeResolution({ pointer: input.pointer, notBefore });
    if (result !== "MISSING" || attempt + 1 === freshness.maximumAttempts) return result;
    await freshness.wait(freshness.pollMs);
  }
  return "MISSING";
}

async function prepare(inputPath: string): Promise<void> {
  const input = parseTrackBPreprodPrepareInput(await readJson(resolve(inputPath)));
  const [candidateStartupRaw, lastKnownGoodStartupRaw] = await Promise.all([
    readJson(input.candidateStartupPackageFile), readJson(input.lastKnownGoodStartupPackageFile),
  ]);
  const candidateStartup = parseDf13CommercePreprodStartupInput(candidateStartupRaw);
  const lastKnownGoodStartup = parseDf13CommercePreprodStartupInput(lastKnownGoodStartupRaw);
  if (candidateStartup.mode !== "COMMERCE" || lastKnownGoodStartup.mode !== "COMMERCE" ||
      candidateStartup.expectedAuthority.authorityBundleHash !== lastKnownGoodStartup.expectedAuthority.authorityBundleHash ||
      candidateStartup.expectedAuthority.authorityBundleHash !== input.candidateReleaseEvidence.authorityMutation.targetBundleHash ||
      candidateStartup.releaseSource.commit !== input.candidateService.releaseRevision ||
      lastKnownGoodStartup.releaseSource.commit !== input.lastKnownGoodService.releaseRevision ||
      canonicalJsonV1(candidateStartup.releaseEvidence) !== canonicalJsonV1(input.candidateReleaseEvidence) ||
      canonicalJsonV1(lastKnownGoodStartup.releaseEvidence) !== canonicalJsonV1(input.lastKnownGoodReleaseEvidence)) {
    throw new Error("TRACK_B_B3_2_V2_RELEASE_STARTUP_INVALID");
  }
  for (const startup of [candidateStartup, lastKnownGoodStartup]) {
    if ((await createDf13CommercePreprodStartupAuthority(startup)
      .authorizeExactCommerceIdentity(startup.expectedAuthority)).status !== "ADMITTED") {
      throw new Error("TRACK_B_B3_2_V2_RELEASE_STARTUP_INVALID");
    }
  }
  for (const [evidence, service] of [[input.candidateReleaseEvidence, input.candidateService],
    [input.lastKnownGoodReleaseEvidence, input.lastKnownGoodService]] as const) {
    if (validateTrackBReleaseCandidateEvidence(evidence, {
      activationReleaseRevision: service.releaseRevision,
    }).status !== "MATCHED") throw new Error("TRACK_B_B3_2_RELEASE_EVIDENCE_INVALID");
    const expectedBuildId = trackBBuildIdV1({ sourceCommit: service.releaseRevision,
      sourceTree: evidence.releaseSource.treeOid ?? "", runtimeConfigHash: service.runtimeConfigHash });
    if (expectedBuildId !== service.buildId) throw new Error("TRACK_B_B3_2_BUILD_ID_MISMATCH");
  }
  const rollbackStore = new ReleaseLocalRollbackRecordStore(ROLLBACK_ROOT);
  const controllerInput = {
    composeFile: TRACK_B_PREPROD_FIXED_SCOPE.composeFile,
    projectDirectory: TRACK_B_PREPROD_FIXED_SCOPE.projectDirectory,
  };
  const candidateController = new DockerComposeTrackBPreprodServiceController({
    ...controllerInput, startupPackageFile: input.candidateStartupPackageFile,
    startupPackageHash: hash(candidateStartup), imageReference: input.candidateImageTag,
    expectedImageId: input.candidateService.imageId,
  });
  const lastKnownGoodController = new DockerComposeTrackBPreprodServiceController({
    ...controllerInput, startupPackageFile: input.lastKnownGoodStartupPackageFile,
    startupPackageHash: hash(lastKnownGoodStartup), imageReference: input.lastKnownGoodImageTag,
    expectedImageId: input.lastKnownGoodService.imageId,
  });
  const currentController = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? lastKnownGoodController : candidateController;
  const currentService = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.lastKnownGoodService : input.candidateService;
  const stagedController = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? candidateController : lastKnownGoodController;
  const stagedService = input.direction === "ACTIVATE_V2_CANDIDATE"
    ? input.candidateService : input.lastKnownGoodService;
  if (await currentController.inspectRunning(currentService) === null ||
      await stagedController.inspectImageAvailable(stagedService) === null) {
    throw new Error("TRACK_B_B3_2_SERVICE_PREFLIGHT_UNPROVEN");
  }
  const database = new TrackBPostgresPreprodDatabaseBoundary(await databaseUrl(), input.operationId);
  try {
    const previous = await database.readActivePointer();
    if (previous === null) throw new Error("TRACK_B_B3_2_PREVIOUS_POINTER_MISSING");
    const currentStartup = input.direction === "ACTIVATE_V2_CANDIDATE"
      ? lastKnownGoodStartup : candidateStartup;
    const currentStartupReleaseRevision = currentService.releaseRevision;
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
    const schemaCompatibility = await database.readTrackBV2LkgSchemaCompatibility();
    const migrationSchemaHash = schemaCompatibility.migrationSchemaHash;
    if (schemaCompatibility.status !== "EXACT" || schemaCompatibility.source !== "DATABASE" ||
        migrationSchemaHash === null) {
      throw new Error("TRACK_B_B3_2_SCHEMA_COMPATIBILITY_UNPROVEN");
    }
    if (await proveFreshTrackBInitialLkgRuntime({ database, pointer: previous }) !== "EXACT") {
      throw new Error("TRACK_B_B3_2_CURRENT_LKG_RUNTIME_UNPROVEN");
    }
    const suppliedIdentity = (role: "candidate" | "lastKnownGood",
      startup: CommerceStartup): TrackBV2RollbackReleaseIdentity => {
      const candidate = role === "candidate";
      const evidence = candidate ? input.candidateReleaseEvidence : input.lastKnownGoodReleaseEvidence;
      return {
        service: candidate ? input.candidateService : input.lastKnownGoodService,
        sourceTree: evidence.releaseSource.treeOid ?? "",
        imageTag: candidate ? input.candidateImageTag : input.lastKnownGoodImageTag,
        startupPackageHash: hash(startup),
        authority: {
          pointerRevision: startup.expectedAuthority.pointerRevision,
          modeVersionId: startup.expectedAuthority.modeVersionId,
          contentHash: startup.expectedAuthority.contentHash,
          bundleHash: startup.expectedAuthority.authorityBundleHash,
        },
        gateEEvidence: evidence,
        migrationSchemaHash,
      };
    };
    if (input.direction === "ROLLBACK_TO_LKG_V2") {
      const accepted = await rollbackStore.read(input.lastKnownGoodRecordHash!);
      if (!validateTrackBV2LastKnownGoodSelection({ accepted,
        acceptedRecordHash: input.lastKnownGoodRecordHash!,
        candidate: suppliedIdentity("candidate", candidateStartup),
        lastKnownGood: suppliedIdentity("lastKnownGood", lastKnownGoodStartup) })) {
        throw new Error("TRACK_B_B3_2_LKG_SELECTION_UNPROVEN");
      }
    }
    const targetBaselineStartup = input.direction === "ACTIVATE_V2_CANDIDATE"
      ? candidateStartup : lastKnownGoodStartup;
    const version = input.direction === "ACTIVATE_V2_CANDIDATE"
      ? await database.prepareTarget(previous)
      : await database.readExactVersion({ pageId: input.pageId, channel: input.channel,
        modeVersionId: targetBaselineStartup.expectedAuthority.modeVersionId });
    if (version === null || version.authorityBundleHash !==
        input.candidateReleaseEvidence.authorityMutation.targetBundleHash) {
      throw new Error("TRACK_B_B3_2_V2_TARGET_INVALID");
    }
    const target = pointerWithTarget(previous, version);
    if (!matchesTrackBOperationTargetStartupBaseline({ direction: input.direction,
      startup: targetBaselineStartup, target })) {
      throw new Error("TRACK_B_B3_2_TARGET_STARTUP_PACKAGE_MISMATCH");
    }
    const operationTargetStartupPath = input.operationTargetStartupPackageFile;
    if (input.recoveryStartupPackageFile === operationTargetStartupPath) {
      throw new Error("TRACK_B_B3_2_STARTUP_PACKAGE_PATH_CONFLICT");
    }
    const startupPackages = createTrackBPreprodOperationStartupPackages({
      direction: input.direction,
      previous,
      target,
      releaseEvidence: input.direction === "ACTIVATE_V2_CANDIDATE"
        ? input.candidateReleaseEvidence : input.lastKnownGoodReleaseEvidence,
      recoveryReleaseEvidence: input.direction === "ACTIVATE_V2_CANDIDATE"
        ? input.lastKnownGoodReleaseEvidence : input.candidateReleaseEvidence,
      targetReleaseSource: targetBaselineStartup.releaseSource,
      recoveryReleaseSource: currentStartup.releaseSource,
    });
    await persistTrackBPreprodRuntimeStartupArtifact(operationTargetStartupPath,
      startupPackages.operationTarget);
    await persistTrackBPreprodRuntimeStartupArtifact(input.recoveryStartupPackageFile,
      startupPackages.recovery);
    const releaseIdentity = (role: "candidate" | "lastKnownGood"): TrackBV2RollbackReleaseIdentity => {
      const candidate = role === "candidate";
      const service = candidate ? input.candidateService : input.lastKnownGoodService;
      const evidence = candidate ? input.candidateReleaseEvidence : input.lastKnownGoodReleaseEvidence;
      const roleIsTarget = (candidate && input.direction === "ACTIVATE_V2_CANDIDATE") ||
        (!candidate && input.direction === "ROLLBACK_TO_LKG_V2");
      const authority = roleIsTarget ? target : previous;
      const startupHash = roleIsTarget ? hash(startupPackages.operationTarget) :
        hash(candidate ? candidateStartup : lastKnownGoodStartup);
      return {
        service,
        sourceTree: evidence.releaseSource.treeOid ?? "",
        imageTag: candidate ? input.candidateImageTag : input.lastKnownGoodImageTag,
        startupPackageHash: startupHash,
        authority: { pointerRevision: authority.pointerRevision,
          modeVersionId: authority.version.modeVersionId, contentHash: authority.version.contentHash,
          bundleHash: authority.version.authorityBundleHash ?? "" },
        gateEEvidence: evidence,
        migrationSchemaHash,
      };
    };
    const rollbackRecord = createTrackBReleaseLocalRollbackRecord({
      candidate: releaseIdentity("candidate"), lastKnownGood: releaseIdentity("lastKnownGood"),
      lastKnownGoodSelection: input.direction === "ACTIVATE_V2_CANDIDATE"
        ? { source: "CURRENT_ACCEPTED_V2", priorRecordHash: null }
        : { source: "PRIOR_ACCEPTED_V2_RECORD", priorRecordHash: input.lastKnownGoodRecordHash },
    });
    const body = {
      schemaVersion: 2 as const,
      contractVersion: "TRACK_B_B3_2_PREPROD_OPERATION_PACKET_V2_LKG" as const,
      environment: "ENGINEERING_PREPROD" as const,
      pageId: TRACK_B_PREPROD_FIXED_SCOPE.pageId,
      channel: "MESSENGER" as const,
      operationId: input.operationId,
      direction: input.direction,
      previous,
      target,
      rollbackRecord,
      candidateImageTag: input.candidateImageTag,
      lastKnownGoodImageTag: input.lastKnownGoodImageTag,
      sourceStartupPackageFile: input.direction === "ACTIVATE_V2_CANDIDATE"
        ? input.lastKnownGoodStartupPackageFile : input.candidateStartupPackageFile,
      sourceStartupPackageHash: hash(currentStartup),
      operationTargetStartupPackageFile: operationTargetStartupPath,
      operationTargetStartupPackageHash: hash(startupPackages.operationTarget),
      recoveryStartupPackageFile: input.recoveryStartupPackageFile,
      recoveryStartupPackageHash: hash(startupPackages.recovery),
      releaseEvidence: input.direction === "ACTIVATE_V2_CANDIDATE"
        ? input.candidateReleaseEvidence : input.lastKnownGoodReleaseEvidence,
    };
    const packet = parseTrackBPreprodOperationPacket({ ...body, packetHash: hash(body) });
    await validateTrackBPreprodStartupArtifacts(packet);
    await rollbackStore.persist(rollbackRecord);
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
  await validateTrackBPreprodStartupArtifacts(packet);
  const database = new TrackBPostgresPreprodDatabaseBoundary(await databaseUrl(), packet.operationId);
  const common = {
    composeFile: TRACK_B_PREPROD_FIXED_SCOPE.composeFile,
    projectDirectory: TRACK_B_PREPROD_FIXED_SCOPE.projectDirectory,
  };
  const candidateController = new DockerComposeTrackBPreprodServiceController({ ...common,
    startupPackageFile: packet.direction === "ACTIVATE_V2_CANDIDATE"
      ? packet.operationTargetStartupPackageFile : packet.sourceStartupPackageFile,
    startupPackageHash: packet.direction === "ACTIVATE_V2_CANDIDATE"
      ? packet.operationTargetStartupPackageHash : packet.sourceStartupPackageHash,
    imageReference: packet.candidateImageTag,
    expectedImageId: packet.rollbackRecord.candidate.service.imageId });
  const lastKnownGoodController = new DockerComposeTrackBPreprodServiceController({ ...common,
    startupPackageFile: packet.direction === "ACTIVATE_V2_CANDIDATE"
      ? packet.sourceStartupPackageFile : packet.operationTargetStartupPackageFile,
    startupPackageHash: packet.direction === "ACTIVATE_V2_CANDIDATE"
      ? packet.sourceStartupPackageHash : packet.operationTargetStartupPackageHash,
    imageReference: packet.lastKnownGoodImageTag,
    expectedImageId: packet.rollbackRecord.lastKnownGood.service.imageId });
  const recoveryController = new DockerComposeTrackBPreprodServiceController({ ...common,
    startupPackageFile: packet.recoveryStartupPackageFile,
    startupPackageHash: packet.recoveryStartupPackageHash,
    imageReference: packet.direction === "ACTIVATE_V2_CANDIDATE"
      ? packet.lastKnownGoodImageTag : packet.candidateImageTag,
    expectedImageId: packet.direction === "ACTIVATE_V2_CANDIDATE"
      ? packet.rollbackRecord.lastKnownGood.service.imageId : packet.rollbackRecord.candidate.service.imageId,
  });
  const sourceIdentity = packet.direction === "ACTIVATE_V2_CANDIDATE"
    ? packet.rollbackRecord.lastKnownGood.service : packet.rollbackRecord.candidate.service;
  const operationTargetIdentity = packet.direction === "ACTIVATE_V2_CANDIDATE"
    ? packet.rollbackRecord.candidate.service : packet.rollbackRecord.lastKnownGood.service;
  const sourceController = packet.direction === "ACTIVATE_V2_CANDIDATE"
    ? lastKnownGoodController : candidateController;
  const operationTargetController = packet.direction === "ACTIVATE_V2_CANDIDATE"
    ? candidateController : lastKnownGoodController;
  const recoveryPointer = { ...packet.previous, pointerRevision: packet.target.pointerRevision + 1 };
  const service = new TrackBPreprodServicePairController({
    previousIdentity: packet.rollbackRecord.lastKnownGood.service,
    targetIdentity: packet.rollbackRecord.candidate.service,
    previous: lastKnownGoodController,
    target: candidateController,
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
      releaseEvidence: packet.releaseEvidence });
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
