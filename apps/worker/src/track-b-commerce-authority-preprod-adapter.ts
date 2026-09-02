import { canonicalJsonV1 } from "@lana/contracts";
import type {
  Df13CommerceCutoverFenceAcquireResult,
  Df13CommerceCutoverFenceLease,
  Df13CommerceCutoverFenceRequest,
} from "@lana/database";
import {
  PostgresDf13CommerceCutoverFenceStore,
  PostgresRuntimeBehaviorModeStore,
  PostgresTrackBCommerceAuthorityWriter,
} from "@lana/database";
import type { RuntimeBehaviorModePointer } from "@lana/chat-runtime";
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, open, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  createTrackBReleaseLocalRollbackRecord,
  type TrackBCommerceAdmissionReadback,
  type TrackBCommerceAuthorityMutationPorts,
  type TrackBCommerceConsumerReadback,
  type TrackBReleaseLocalRollbackRecord,
  type TrackBServiceReleaseIdentity,
} from "./track-b-commerce-authority-activation.js";
import type { CommerceAuthorityConsumer } from "./df13-commerce-authority-bundle.js";

const execFile = promisify(execFileCallback);
const PAGE_ID = "1198992073286645";
const CHANNEL = "MESSENGER";
const SHA256 = /^[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const COMPOSE_FILE = "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml";
const PROJECT_DIRECTORY = "/opt/lana-chatbot/current/deploy";
const COMPOSE_ENV_FILE = "/opt/lana-chatbot/shared/.env.infrastructure";
const REPOSITORY_ROOT = "/opt/lana-chatbot/repository";
const DOCKERFILE = "/opt/lana-chatbot/repository/deploy/Dockerfile";
const STARTUP_ROOT = "/opt/lana-chatbot/releases/track-b";
const CONTAINER = "lana-chatbot-realtime-worker";
const STAGED_CONTAINER = "lana-chatbot-track-b-staged-realtime-worker";
const STAGED_LABEL = "TRACK_B_B3_2_STOPPED_NON_ADMITTING";

export const TRACK_B_RUNTIME_CONFIG_KEYS_V1 = Object.freeze([
  "APP_SEND_ENABLED",
  "CHATBOT_SEND_ENABLED",
  "DF13_COMMERCE_PREPROD_STARTUP_FILE",
  "DF13_COMMERCE_PREPROD_STARTUP_MODE",
  "HISTORY_WRITE_ENABLED",
  "META_PAGE_ID",
  "NODE_ENV",
  "REALTIME_BEHAVIOR_MODE_CHANNEL",
  "REALTIME_BEHAVIOR_MODE_ENABLED",
  "REALTIME_BUYING_SIGNAL_GUARD_V1",
  "REALTIME_CATALOG_ADVISORY_V1",
  "REALTIME_CONFIRMATION_CANARY_PAGE_IDS",
  "REALTIME_CONFIRMATION_MODE",
  "REALTIME_CONTEXT_HISTORY_LIMIT",
  "REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1",
  "REALTIME_CUSTOMER_PROFILE_V1",
  "REALTIME_DECISION_AUDIT_V2",
  "REALTIME_DECISION_TELEMETRY_ENABLED",
  "REALTIME_GROUNDED_DRAFT_V1",
  "REALTIME_MEDIA_CLARIFICATION_ENABLED",
  "REALTIME_MEDIA_CUTOUT_MODE",
  "REALTIME_MEDIA_ENABLED_PAGE_IDS",
  "REALTIME_MEDIA_SELECTOR_V2_GUARD_ENABLED",
  "REALTIME_MESSAGE_GROUPING_V2",
  "REALTIME_MODE",
  "REALTIME_MULTI_FACT_QUERY_V2",
  "REALTIME_RECORDED_REPLAY_CAPTURE_ENABLED",
  "REALTIME_RELEASE_ID",
  "REALTIME_VERIFIED_FACT_ASSEMBLER_V1",
  "REALTIME_VERIFIED_VARIANT_V2",
  "REALTIME_WAVE2_STRATEGY_V1",
  "REALTIME_WORKER_ID",
  "RUNTIME_POLICY_CANARY_LIVE_ENABLED",
  "RUNTIME_POLICY_CHANNEL",
  "RUNTIME_POLICY_ENABLED",
  "RUNTIME_POLICY_PUBLISHED_ENABLED",
  "SALES_CYCLE_ENABLED",
] as const);

export function trackBRuntimeConfigHashV1(
  values: Readonly<Record<(typeof TRACK_B_RUNTIME_CONFIG_KEYS_V1)[number], string>>,
): string {
  const exact = Object.fromEntries(TRACK_B_RUNTIME_CONFIG_KEYS_V1.map((key) => [key, values[key]]));
  if (Object.keys(values).length !== TRACK_B_RUNTIME_CONFIG_KEYS_V1.length ||
      Object.values(exact).some((value) => typeof value !== "string")) {
    throw new Error("TRACK_B_B3_2_RUNTIME_CONFIG_INVALID");
  }
  return createHash("sha256").update(canonicalJsonV1(exact), "utf8").digest("hex");
}

export function trackBBuildIdV1(input: Readonly<{
  sourceCommit: string;
  sourceTree: string;
  runtimeConfigHash: string;
}>): string {
  if (!COMMIT.test(input.sourceCommit) || !COMMIT.test(input.sourceTree) ||
      !SHA256.test(input.runtimeConfigHash)) throw new Error("TRACK_B_B3_2_BUILD_ID_INPUT_INVALID");
  return createHash("sha256").update(canonicalJsonV1({ schemaVersion: 1,
    contractVersion: "TRACK_B_BUILD_ID_V1", ...input }), "utf8").digest("hex");
}

export function trackBLegacyBuildIdV1(input: Readonly<{
  sourceCommit: string;
  imageId: string;
  runtimeConfigHash: string;
}>): string {
  if (!COMMIT.test(input.sourceCommit) || !SHA256.test(input.imageId) ||
      !SHA256.test(input.runtimeConfigHash)) throw new Error("TRACK_B_B3_2_LEGACY_BUILD_ID_INPUT_INVALID");
  return createHash("sha256").update(canonicalJsonV1({ schemaVersion: 1,
    contractVersion: "TRACK_B_LEGACY_OBSERVED_BUILD_ID_V1", ...input }), "utf8").digest("hex");
}

function exactService(left: TrackBServiceReleaseIdentity | null, right: TrackBServiceReleaseIdentity) {
  return left !== null && canonicalJsonV1(left) === canonicalJsonV1(right);
}

function validService(value: TrackBServiceReleaseIdentity): boolean {
  return value.service === "realtime-worker" && COMMIT.test(value.releaseRevision) &&
    SHA256.test(value.buildId) && SHA256.test(value.imageId) && SHA256.test(value.runtimeConfigHash);
}

function validRecord(value: TrackBReleaseLocalRollbackRecord): boolean {
  if (!value || value.schemaVersion !== 1 ||
      value.contractVersion !== "TRACK_B_RELEASE_LOCAL_ROLLBACK_RECORD_V1" ||
      !SHA256.test(value.recordHash) || !COMMIT.test(value.selectedSourceCommit) ||
      !validService(value.previousService) || !validService(value.targetService) ||
      value.targetService.releaseRevision !== value.selectedSourceCommit) return false;
  const rebuilt = createTrackBReleaseLocalRollbackRecord({
    selectedSourceCommit: value.selectedSourceCommit,
    previousService: value.previousService,
    targetService: value.targetService,
    previousAuthority: value.previousAuthority,
    targetAuthority: value.targetAuthority,
  });
  return canonicalJsonV1(rebuilt) === canonicalJsonV1(value);
}

export class ReleaseLocalRollbackRecordStore {
  readonly #root: string;

  constructor(root: string) {
    const normalized = resolve(root);
    if (!normalized || normalized === resolve("/") || normalized === resolve(".")) {
      throw new Error("TRACK_B_B3_2_ROLLBACK_ROOT_INVALID");
    }
    this.#root = normalized;
  }

  #path(recordHash: string): string {
    if (!SHA256.test(recordHash)) throw new Error("TRACK_B_B3_2_ROLLBACK_HASH_INVALID");
    return join(this.#root, `${recordHash}.json`);
  }

  async persist(record: TrackBReleaseLocalRollbackRecord): Promise<void> {
    if (!validRecord(record)) throw new Error("TRACK_B_B3_2_ROLLBACK_RECORD_INVALID");
    await mkdir(this.#root, { recursive: true, mode: 0o700 });
    const path = this.#path(record.recordHash);
    const payload = `${canonicalJsonV1(record)}\n`;
    let handle;
    try {
      handle = await open(path, "wx", 0o600);
      await handle.writeFile(payload, "utf8");
      await handle.sync();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await this.read(record.recordHash);
      if (existing === null || canonicalJsonV1(existing) !== canonicalJsonV1(record)) {
        throw new Error("TRACK_B_B3_2_ROLLBACK_RECORD_CONFLICT");
      }
      return;
    } finally {
      await handle?.close();
    }
    const directory = await open(dirname(path), "r");
    try {
      try { await directory.sync(); } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EPERM" && code !== "ENOTSUP" && code !== "EINVAL") throw error;
      }
    } finally { await directory.close(); }
    const readback = await this.read(record.recordHash);
    if (readback === null || canonicalJsonV1(readback) !== canonicalJsonV1(record)) {
      throw new Error("TRACK_B_B3_2_ROLLBACK_RECORD_READBACK_MISMATCH");
    }
  }

  async read(recordHash: string): Promise<TrackBReleaseLocalRollbackRecord | null> {
    const path = this.#path(recordHash);
    try { await access(path, constants.R_OK); } catch { return null; }
    let value: unknown;
    try { value = JSON.parse(await readFile(path, "utf8")); } catch {
      throw new Error("TRACK_B_B3_2_ROLLBACK_RECORD_INVALID");
    }
    if (!validRecord(value as TrackBReleaseLocalRollbackRecord)) {
      throw new Error("TRACK_B_B3_2_ROLLBACK_RECORD_INVALID");
    }
    return value as TrackBReleaseLocalRollbackRecord;
  }
}

export type TrackBServiceCommandRunner = (
  command: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>>,
) => Promise<string>;

export function trackBCommandEnvironmentV1(
  inherited: Readonly<NodeJS.ProcessEnv>,
  overrides: Readonly<Record<string, string>>,
): NodeJS.ProcessEnv {
  const environment = { ...inherited, ...overrides };
  if (!Object.hasOwn(overrides, "REALTIME_RELEASE_ID")) {
    delete environment.REALTIME_RELEASE_ID;
  }
  return environment;
}

export class TrackBPreprodImageBuilder {
  readonly #run: TrackBServiceCommandRunner;

  constructor(run: TrackBServiceCommandRunner = defaultRunner) { this.#run = run; }

  async build(input: Readonly<{
    sourceCommit: string;
    sourceTree: string;
    imageReference: string;
    runtimeConfig: Readonly<Record<(typeof TRACK_B_RUNTIME_CONFIG_KEYS_V1)[number], string>>;
  }>): Promise<TrackBServiceReleaseIdentity> {
    if (!/^[a-z0-9][a-z0-9._/-]{0,127}:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(input.imageReference) ||
        !COMMIT.test(input.sourceCommit) || !COMMIT.test(input.sourceTree)) {
      throw new Error("TRACK_B_B3_2_BUILD_INPUT_INVALID");
    }
    const runtimeConfigHash = trackBRuntimeConfigHashV1(input.runtimeConfig);
    const buildId = trackBBuildIdV1({ sourceCommit: input.sourceCommit,
      sourceTree: input.sourceTree, runtimeConfigHash });
    const status = await this.#run("git", ["-C", REPOSITORY_ROOT, "status", "--porcelain"], {});
    const commit = await this.#run("git", ["-C", REPOSITORY_ROOT, "rev-parse", "HEAD"], {});
    const tree = await this.#run("git", ["-C", REPOSITORY_ROOT, "rev-parse", "HEAD^{tree}"], {});
    if (status !== "" || commit !== input.sourceCommit || tree !== input.sourceTree) {
      throw new Error("TRACK_B_B3_2_BUILD_SOURCE_MISMATCH");
    }
    await this.#run("docker", ["build", "--pull=false",
      "--label", `org.opencontainers.image.revision=${input.sourceCommit}`,
      "--label", `com.lana.build-id=${buildId}`,
      "--label", `com.lana.runtime-config-hash=${runtimeConfigHash}`,
      "-t", input.imageReference, "-f", DOCKERFILE, REPOSITORY_ROOT], {});
    const postStatus = await this.#run("git", ["-C", REPOSITORY_ROOT, "status", "--porcelain"], {});
    const postCommit = await this.#run("git", ["-C", REPOSITORY_ROOT, "rev-parse", "HEAD"], {});
    const postTree = await this.#run("git", ["-C", REPOSITORY_ROOT, "rev-parse", "HEAD^{tree}"], {});
    if (postStatus !== "" || postCommit !== input.sourceCommit || postTree !== input.sourceTree) {
      throw new Error("TRACK_B_B3_2_BUILD_SOURCE_DRIFT");
    }
    const value = parseOne(await this.#run("docker", ["image", "inspect", "--format", "{{json .}}",
      input.imageReference], {}), "TRACK_B_B3_2_IMAGE_INSPECT_INVALID");
    const imageId = String(value.Id ?? "").replace(/^sha256:/u, "");
    const expected = { service: "realtime-worker" as const, releaseRevision: input.sourceCommit,
      buildId, imageId, runtimeConfigHash };
    if (!SHA256.test(imageId) || !identityFromInspect(value, expected, "EXACT_ALL")) {
      throw new Error("TRACK_B_B3_2_BUILD_READBACK_MISMATCH");
    }
    return Object.freeze(expected);
  }
}

async function defaultRunner(
  command: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>>,
): Promise<string> {
  const result = await execFile(command, [...args], {
    encoding: "utf8",
    env: trackBCommandEnvironmentV1(process.env, environment),
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return result.stdout.trim();
}

type DockerInspect = {
  Id?: unknown;
  Image?: unknown;
  RestartCount?: unknown;
  State?: { Status?: unknown; Health?: { Status?: unknown } };
  Config?: { Image?: unknown; Labels?: Record<string, unknown> };
};

function parseOne(output: string, code: string): DockerInspect {
  let parsed: unknown;
  try { parsed = JSON.parse(output); } catch { throw new Error(code); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(code);
  return parsed as DockerInspect;
}

function identityFromInspect(value: DockerInspect, expected: TrackBServiceReleaseIdentity,
  labelPolicy: "EXACT_ALL" | "OCI_REVISION_ONLY") {
  const labels = value.Config?.Labels ?? {};
  const imageId = typeof value.Image === "string" ? value.Image : value.Id;
  const observed: TrackBServiceReleaseIdentity = {
    service: "realtime-worker",
    releaseRevision: String(labels["org.opencontainers.image.revision"] ?? ""),
    buildId: String(labels["com.lana.build-id"] ?? ""),
    imageId: String(imageId ?? "").replace(/^sha256:/u, ""),
    runtimeConfigHash: String(labels["com.lana.runtime-config-hash"] ?? ""),
  };
  if (labelPolicy === "OCI_REVISION_ONLY") {
    const legacyBuildId = trackBLegacyBuildIdV1({ sourceCommit: expected.releaseRevision,
      imageId: expected.imageId, runtimeConfigHash: expected.runtimeConfigHash });
    return observed.releaseRevision === expected.releaseRevision && observed.imageId === expected.imageId &&
      expected.buildId === legacyBuildId
      ? expected : null;
  }
  return exactService(observed, expected) ? observed : null;
}

export class DockerComposeTrackBPreprodServiceController {
  readonly #composeFile: string;
  readonly #projectDirectory: string;
  readonly #startupPackageFile: string;
  readonly #imageReference: string;
  readonly #expectedImageId: string;
  readonly #runtimeReleaseId: string | null;
  readonly #run: TrackBServiceCommandRunner;
  readonly #labelPolicy: "EXACT_ALL" | "OCI_REVISION_ONLY";
  readonly #health: Readonly<{ timeoutMs: number; pollMs: number; wait: (milliseconds: number) => Promise<void> }>;

  constructor(input: Readonly<{
    composeFile: string;
    projectDirectory: string;
    startupPackageFile: string;
    imageReference: string;
    expectedImageId: string;
    runtimeReleaseId?: string;
    run?: TrackBServiceCommandRunner;
    labelPolicy?: "EXACT_ALL" | "OCI_REVISION_ONLY";
    health?: Readonly<{ timeoutMs: number; pollMs: number; wait: (milliseconds: number) => Promise<void> }>;
  }>) {
    const labelPolicy = input.labelPolicy ?? "EXACT_ALL";
    const startupInScope = input.startupPackageFile.startsWith(`${STARTUP_ROOT}/`) ||
      (labelPolicy === "OCI_REVISION_ONLY" &&
       input.startupPackageFile.startsWith("/opt/lana-chatbot/shared/df13/"));
    if (input.composeFile !== COMPOSE_FILE || input.projectDirectory !== PROJECT_DIRECTORY ||
        !startupInScope ||
        input.startupPackageFile.includes("..")) {
      throw new Error("TRACK_B_B3_2_SERVICE_SCOPE_INVALID");
    }
    if (!/^[a-z0-9][a-z0-9._/-]{0,127}:[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(input.imageReference) ||
        !SHA256.test(input.expectedImageId)) {
      throw new Error("TRACK_B_B3_2_IMAGE_REFERENCE_INVALID");
    }
    if ((input.runtimeReleaseId !== undefined &&
         !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(input.runtimeReleaseId)) ||
        (labelPolicy === "OCI_REVISION_ONLY" && input.runtimeReleaseId === undefined)) {
      throw new Error("TRACK_B_B3_2_RUNTIME_RELEASE_ID_INVALID");
    }
    this.#composeFile = input.composeFile;
    this.#projectDirectory = input.projectDirectory;
    this.#startupPackageFile = input.startupPackageFile;
    this.#imageReference = input.imageReference;
    this.#expectedImageId = input.expectedImageId;
    this.#runtimeReleaseId = input.runtimeReleaseId ?? null;
    this.#run = input.run ?? defaultRunner;
    this.#labelPolicy = labelPolicy;
    this.#health = input.health ?? { timeoutMs: 120_000, pollMs: 1_000,
      wait: (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)) };
  }

  async #inspectImage(expected: TrackBServiceReleaseIdentity) {
    const value = parseOne(await this.#run("docker", [
      "image", "inspect", "--format", "{{json .}}", this.#imageReference,
    ], {}), "TRACK_B_B3_2_IMAGE_INSPECT_INVALID");
    return identityFromInspect(value, expected, this.#labelPolicy);
  }

  #composeEnvironment(expected: TrackBServiceReleaseIdentity, mode: "COMMERCE"):
    Record<string, string> {
    return {
      REALTIME_IMAGE: this.#imageReference,
      REALTIME_RELEASE_ID: this.#runtimeReleaseId ?? expected.releaseRevision,
      DF13_COMMERCE_PREPROD_STARTUP_MODE: mode,
      DF13_COMMERCE_PREPROD_STARTUP_HOST_FILE: this.#startupPackageFile,
    };
  }

  #composeArgs(...tail: readonly string[]): readonly string[] {
    return ["compose", "--env-file", COMPOSE_ENV_FILE,
      "--project-directory", this.#projectDirectory,
      "-f", this.#composeFile, ...tail];
  }

  async #inspectContainer(expected: TrackBServiceReleaseIdentity, verifyRuntime: boolean,
    container = CONTAINER): Promise<Readonly<{
    identity: TrackBServiceReleaseIdentity;
    status: string;
    healthy: boolean;
  }> | null> {
    if (!await this.#inspectImage(expected)) return null;
    const value = parseOne(await this.#run("docker", [
      "inspect", "--format", "{{json .}}", container,
    ], {}), "TRACK_B_B3_2_CONTAINER_INSPECT_INVALID");
    const identity = identityFromInspect(value, expected, this.#labelPolicy);
    if (!identity || typeof value.State?.Status !== "string") return null;
    if (verifyRuntime && value.State.Status === "running") {
      const output = await this.#run("docker", ["exec", container, "printenv",
        ...TRACK_B_RUNTIME_CONFIG_KEYS_V1], {});
      const lines = output.split(/\r?\n/u);
      if (lines.length !== TRACK_B_RUNTIME_CONFIG_KEYS_V1.length) return null;
      const runtimeConfig = Object.fromEntries(
        TRACK_B_RUNTIME_CONFIG_KEYS_V1.map((key, index) => [key, lines[index] ?? ""]),
      ) as Record<(typeof TRACK_B_RUNTIME_CONFIG_KEYS_V1)[number], string>;
      if (trackBRuntimeConfigHashV1(runtimeConfig) !== expected.runtimeConfigHash) return null;
    }
    return { identity, status: value.State.Status,
      healthy: value.State.Status === "running" &&
        (value.State.Health === undefined || value.State.Health.Status === "healthy") &&
        value.RestartCount === 0 };
  }

  async #stagedContainerId(): Promise<string> {
    return (await this.#run("docker", ["ps", "-a", "--filter",
      `name=^/${STAGED_CONTAINER}$`, "--format", "{{.ID}}"], {})).trim();
  }

  async #mainContainerId(): Promise<string> {
    return (await this.#run("docker", ["ps", "-a", "--filter",
      `name=^/${CONTAINER}$`, "--format", "{{.ID}}"], {})).trim();
  }

  async #inspectStaged(expected: TrackBServiceReleaseIdentity): Promise<TrackBServiceReleaseIdentity | null> {
    const observed = await this.#inspectContainer(expected, false, STAGED_CONTAINER);
    if (observed === null || !["created", "exited"].includes(observed.status)) return null;
    const value = parseOne(await this.#run("docker", [
      "inspect", "--format", "{{json .}}", STAGED_CONTAINER,
    ], {}), "TRACK_B_B3_2_STAGED_CONTAINER_INSPECT_INVALID");
    return value.Config?.Labels?.["com.lana.track-b.stage"] === STAGED_LABEL
      ? observed.identity : null;
  }

  async inspectRunning(expected: TrackBServiceReleaseIdentity): Promise<TrackBServiceReleaseIdentity | null> {
    const observed = await this.#inspectContainer(expected, true);
    return observed?.healthy ? observed.identity : null;
  }

  async inspectImageAvailable(expected: TrackBServiceReleaseIdentity): Promise<TrackBServiceReleaseIdentity | null> {
    if (!validService(expected) || this.#expectedImageId !== expected.imageId) return null;
    return this.#inspectImage(expected);
  }

  async inspectPresent(expected: TrackBServiceReleaseIdentity):
    Promise<TrackBServiceReleaseIdentity | "ABSENT" | "AMBIGUOUS"> {
    if (await this.#mainContainerId() === "") return "ABSENT";
    return (await this.#inspectContainer(expected, false))?.identity ?? "AMBIGUOUS";
  }

  async stage(_source: TrackBServiceReleaseIdentity, target: TrackBServiceReleaseIdentity):
    Promise<TrackBServiceReleaseIdentity | "AMBIGUOUS" | null> {
    if (!validService(target) || this.#expectedImageId !== target.imageId) return null;
    const image = await this.#inspectImage(target);
    if (!image) return null;
    await this.#run("docker", this.#composeArgs("config", "--quiet"),
      this.#composeEnvironment(target, "COMMERCE"));
    const existing = await this.#stagedContainerId();
    if (existing !== "") return await this.#inspectStaged(target) ?? "AMBIGUOUS";
    try {
      await this.#run("docker", ["create", "--name", STAGED_CONTAINER, "--network", "none",
        "--label", `com.lana.track-b.stage=${STAGED_LABEL}`, "--entrypoint", "/bin/true",
        this.#imageReference], {});
    } catch (error) {
      const reconciled = await this.#stagedContainerId();
      if (reconciled === "") throw error;
    }
    return await this.#inspectStaged(target) ?? "AMBIGUOUS";
  }

  async discard(target: TrackBServiceReleaseIdentity): Promise<"DISCARDED" | "AMBIGUOUS"> {
    if (await this.#stagedContainerId() === "") return "DISCARDED";
    if (!await this.#inspectStaged(target)) return "AMBIGUOUS";
    await this.#run("docker", ["rm", STAGED_CONTAINER], {});
    return await this.#stagedContainerId() === "" ? "DISCARDED" : "AMBIGUOUS";
  }

  async stop(expected: TrackBServiceReleaseIdentity): Promise<TrackBServiceReleaseIdentity | null> {
    const observed = await this.#inspectContainer(expected, false);
    if (!observed) return null;
    if (observed.status === "running") {
      await this.#run("docker", ["stop", "--time", "30", CONTAINER], {});
    } else if (observed.status !== "exited") return null;
    const value = parseOne(await this.#run("docker", [
      "inspect", "--format", "{{json .}}", CONTAINER,
    ], {}), "TRACK_B_B3_2_CONTAINER_INSPECT_INVALID");
    return value.State?.Status === "exited" && identityFromInspect(value, expected, this.#labelPolicy) ? expected : null;
  }

  async start(expected: TrackBServiceReleaseIdentity, mode: "COMMERCE"): Promise<TrackBServiceReleaseIdentity | null> {
    if (!validService(expected) || this.#expectedImageId !== expected.imageId) return null;
    if (!await this.#inspectStaged(expected)) return null;
    await this.#run("docker", ["rm", STAGED_CONTAINER], {});
    if (await this.#stagedContainerId() !== "") return null;
    await this.#run("docker", this.#composeArgs("up", "-d", "--no-deps", "--force-recreate",
      "realtime-worker"), this.#composeEnvironment(expected, mode));
    const deadline = Date.now() + this.#health.timeoutMs;
    let observed = await this.inspectRunning(expected);
    while (observed === null && Date.now() < deadline) {
      await this.#health.wait(this.#health.pollMs);
      observed = await this.inspectRunning(expected);
    }
    return observed;
  }
}

export class TrackBPreprodServicePairController implements TrackBPreprodServiceBoundary {
  readonly #previousIdentity: TrackBServiceReleaseIdentity;
  readonly #targetIdentity: TrackBServiceReleaseIdentity;
  readonly #previous: DockerComposeTrackBPreprodServiceController;
  readonly #target: DockerComposeTrackBPreprodServiceController;
  readonly #startRoutes: readonly Readonly<{
    identity: TrackBServiceReleaseIdentity;
    pointer: RuntimeBehaviorModePointer;
    controller: DockerComposeTrackBPreprodServiceController;
  }>[];

  constructor(input: Readonly<{
    previousIdentity: TrackBServiceReleaseIdentity;
    targetIdentity: TrackBServiceReleaseIdentity;
    previous: DockerComposeTrackBPreprodServiceController;
    target: DockerComposeTrackBPreprodServiceController;
    startRoutes: readonly Readonly<{
      identity: TrackBServiceReleaseIdentity;
      pointer: RuntimeBehaviorModePointer;
      controller: DockerComposeTrackBPreprodServiceController;
    }>[];
  }>) {
    if (!validService(input.previousIdentity) || !validService(input.targetIdentity) ||
        exactService(input.previousIdentity, input.targetIdentity)) {
      throw new Error("TRACK_B_B3_2_SERVICE_PAIR_INVALID");
    }
    this.#previousIdentity = input.previousIdentity;
    this.#targetIdentity = input.targetIdentity;
    this.#previous = input.previous;
    this.#target = input.target;
    if (input.startRoutes.length < 3 || input.startRoutes.some((route) =>
      (!exactService(route.identity, input.previousIdentity) &&
       !exactService(route.identity, input.targetIdentity)) || route.pointer.pointerRevision < 1)) {
      throw new Error("TRACK_B_B3_2_SERVICE_START_ROUTES_INVALID");
    }
    const routeKeys = new Set(input.startRoutes.map((route) => canonicalJsonV1({
      identity: route.identity, pointer: route.pointer,
    })));
    if (routeKeys.size !== input.startRoutes.length) {
      throw new Error("TRACK_B_B3_2_SERVICE_START_ROUTES_INVALID");
    }
    this.#startRoutes = Object.freeze([...input.startRoutes]);
  }

  #controller(identity: TrackBServiceReleaseIdentity) {
    if (exactService(identity, this.#previousIdentity)) return this.#previous;
    if (exactService(identity, this.#targetIdentity)) return this.#target;
    throw new Error("TRACK_B_B3_2_SERVICE_IDENTITY_UNKNOWN");
  }

  async stage(source: TrackBServiceReleaseIdentity, target: TrackBServiceReleaseIdentity) {
    return this.#controller(target).stage(source, target);
  }
  async discard(target: TrackBServiceReleaseIdentity) { return this.#controller(target).discard(target); }
  async stop(expected: TrackBServiceReleaseIdentity) { return this.#controller(expected).stop(expected); }
  async start(expected: TrackBServiceReleaseIdentity, mode: "COMMERCE",
    pointer: RuntimeBehaviorModePointer) {
    const route = this.#startRoutes.find((candidate) => exactService(candidate.identity, expected) &&
      canonicalJsonV1(candidate.pointer) === canonicalJsonV1(pointer));
    if (!route) throw new Error("TRACK_B_B3_2_SERVICE_START_ROUTE_UNKNOWN");
    return route.controller.start(expected, mode);
  }
  async inspectRunning(expected: TrackBServiceReleaseIdentity) {
    return this.#controller(expected).inspectRunning(expected);
  }
  async inspectPresent(expected: TrackBServiceReleaseIdentity) {
    return this.#controller(expected).inspectPresent(expected);
  }
}

export interface TrackBPreprodDatabaseBoundary {
  acquireFence(request: Df13CommerceCutoverFenceRequest): Promise<Df13CommerceCutoverFenceAcquireResult>;
  releaseFence(lease: Df13CommerceCutoverFenceLease): Promise<{ status: "RELEASED" | "STALE_OR_MISSING" }>;
  readAdmissionHold(input: { pageId: string; channel: string; lease: Df13CommerceCutoverFenceLease }): Promise<TrackBCommerceAdmissionReadback>;
  readQuiescence(input: { pageId: string; channel: string }): Promise<{
    activeInbox: number; activeMetaOutbox: number; activePancakeOutbox: number;
    inFlightAuthorityDependentWork: number; queuedAuthorityDependentWork: number;
  }>;
  mutateExactPointer(input: {
    direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
    previous: RuntimeBehaviorModePointer;
    target: RuntimeBehaviorModePointer;
    lease: Df13CommerceCutoverFenceLease;
  }): Promise<{ status: "ACKNOWLEDGED" | "ACK_LOST" | "CAS_MISMATCH" }>;
  readActivePointer(): Promise<RuntimeBehaviorModePointer | null>;
  readActivationAudit(input: {
    pointerRevision: number; previousVersionId: string; previousContentHash: string;
    targetVersionId: string; targetContentHash: string; actor: "TRACK_B_B3_2_WRITER"; reason: string;
  }): Promise<"EXACT" | "MISSING" | "AMBIGUOUS">;
  proveRuntimeResolution(input: {
    pointer: RuntimeBehaviorModePointer;
    notBefore: string;
  }): Promise<"EXACT" | "MISSING" | "AMBIGUOUS">;
  readExactVersion(input: { pageId: string; channel: string; modeVersionId: string }):
    Promise<RuntimeBehaviorModePointer["version"] | null>;
}

export interface TrackBPreprodServiceBoundary {
  stage(source: TrackBServiceReleaseIdentity, target: TrackBServiceReleaseIdentity): Promise<TrackBServiceReleaseIdentity | "AMBIGUOUS" | null>;
  discard(target: TrackBServiceReleaseIdentity): Promise<"DISCARDED" | "AMBIGUOUS">;
  stop(expected: TrackBServiceReleaseIdentity): Promise<TrackBServiceReleaseIdentity | null>;
  start(expected: TrackBServiceReleaseIdentity, mode: "COMMERCE",
    pointer: RuntimeBehaviorModePointer): Promise<TrackBServiceReleaseIdentity | null>;
  inspectRunning(expected: TrackBServiceReleaseIdentity): Promise<TrackBServiceReleaseIdentity | null>;
  inspectPresent(expected: TrackBServiceReleaseIdentity):
    Promise<TrackBServiceReleaseIdentity | "ABSENT" | "AMBIGUOUS">;
}

export function createTrackBCommerceAuthorityPreprodAdapter(input: Readonly<{
  database: TrackBPreprodDatabaseBoundary;
  service: TrackBPreprodServiceBoundary;
  rollbackStore: Pick<ReleaseLocalRollbackRecordStore, "read" | "persist">;
  quiescence: Readonly<{ timeoutMs: number; pollMs: number; wait: (milliseconds: number) => Promise<void> }>;
}>): TrackBCommerceAuthorityMutationPorts {
  let lastStartedAt: string | null = null;
  let lastStartedPointer: RuntimeBehaviorModePointer | null = null;
  const scopeAdmission = (lease: Df13CommerceCutoverFenceLease) =>
    input.database.readAdmissionHold({ pageId: PAGE_ID, channel: CHANNEL, lease });
  const ports: TrackBCommerceAuthorityMutationPorts = {
    readPersistedRollbackRecord: input.rollbackStore.read.bind(input.rollbackStore),
    acquireFence: input.database.acquireFence.bind(input.database),
    proveAdmissionHeld: ({ lease }) => scopeAdmission(lease),
    async stopSourceAndProveQuiescence({ lease, sourceService }) {
      const stopped = await input.service.stop(sourceService);
      if (!exactService(stopped, sourceService)) throw new Error("TRACK_B_B3_2_SOURCE_STOP_UNPROVEN");
      const deadline = Date.now() + input.quiescence.timeoutMs;
      let observed = await input.database.readQuiescence({ pageId: PAGE_ID, channel: CHANNEL });
      while (observed.inFlightAuthorityDependentWork !== 0 && Date.now() < deadline) {
        await input.quiescence.wait(input.quiescence.pollMs);
        observed = await input.database.readQuiescence({ pageId: PAGE_ID, channel: CHANNEL });
      }
      const admission = await scopeAdmission(lease);
      return {
        status: observed.inFlightAuthorityDependentWork === 0 ? "QUIESCENT" as const : "BUSY" as const,
        observedStoppedService: stopped,
        ...observed,
        admission: admission.status === "HELD" ? "HELD" as const : "UNCONTROLLED" as const,
      };
    },
    async stageAffectedService({ sourceService, targetService }) {
      const source = await input.service.inspectRunning(sourceService);
      if (!exactService(source, sourceService)) {
        return { status: "BLOCKED", admission: "UNCONTROLLED",
          observedSourceService: source, stagedService: null };
      }
      const staged = await input.service.stage(sourceService, targetService);
      if (staged === "AMBIGUOUS") {
        return { status: "BLOCKED", admission: "UNCONTROLLED",
          observedSourceService: source, stagedService: targetService };
      }
      return { status: staged ? "STAGED_STOPPED" : "BLOCKED", admission: staged ? "NON_ADMITTING" : "UNCONTROLLED",
        observedSourceService: source, stagedService: staged } as const;
    },
    async discardStagedService({ stagedService }) {
      return { status: await input.service.discard(stagedService) };
    },
    async mutateExactPointer(mutation) {
      return input.database.mutateExactPointer(mutation);
    },
    readActivePointer: input.database.readActivePointer.bind(input.database),
    async startStagedService({ lease, stagedService, pointer }) {
      const admission = await scopeAdmission(lease);
      if (admission.status !== "HELD") return { status: "BLOCKED", admission: "UNCONTROLLED", observedService: null };
      lastStartedAt = new Date().toISOString();
      const observed = await input.service.start(stagedService, "COMMERCE", pointer);
      return { status: observed ? "HEALTHY" as const : "BLOCKED" as const,
        admission: "HELD" as const, observedService: observed };
    },
    async restorePreviousService({ lease, failedService, previousService, pointer }) {
      const admission = await scopeAdmission(lease);
      if (admission.status !== "HELD") return { status: "BLOCKED", admission: "UNCONTROLLED", observedService: null };
      const failed = await input.service.inspectPresent(failedService);
      const prior = await input.service.inspectPresent(previousService);
      const failedExact = failed !== "ABSENT" && failed !== "AMBIGUOUS";
      const priorExact = prior !== "ABSENT" && prior !== "AMBIGUOUS";
      if ((failedExact && priorExact) || (!failedExact && !priorExact &&
          (failed === "AMBIGUOUS" || prior === "AMBIGUOUS"))) {
        return { status: "BLOCKED", admission: "HELD", observedService: null };
      }
      if (!failedExact) {
        const discarded = await input.service.discard(failedService);
        if (discarded !== "DISCARDED") {
          return { status: "BLOCKED", admission: "HELD", observedService: null };
        }
      }
      const serviceToStop = failedExact ? failedService : priorExact ? previousService : null;
      if (serviceToStop !== null && !await input.service.stop(serviceToStop)) {
        return { status: "BLOCKED", admission: "HELD", observedService: null };
      }
      const staged = await input.service.stage(failedService, previousService);
      if (!exactService(staged === "AMBIGUOUS" ? null : staged, previousService)) {
        return { status: "BLOCKED", admission: "HELD", observedService: null };
      }
      lastStartedAt = new Date().toISOString();
      const observed = await input.service.start(previousService, "COMMERCE", pointer);
      return { status: observed ? "HEALTHY" as const : "BLOCKED" as const,
        admission: "HELD" as const, observedService: observed };
    },
    async readRuntimeAuthority({ lease, service, pointer }) {
      const admission = await scopeAdmission(lease);
      const observedService = await input.service.inspectRunning(service);
      const proof = lastStartedAt === null ? "MISSING" :
        await input.database.proveRuntimeResolution({ pointer, notBefore: lastStartedAt });
      const exact = admission.status === "HELD" && exactService(observedService, service) && proof === "EXACT";
      if (exact) lastStartedPointer = pointer;
      return { status: exact ? "EXACT" : "AMBIGUOUS", service: observedService,
        modeVersionId: exact ? pointer.version.modeVersionId : null,
        contentHash: exact ? pointer.version.contentHash : null,
        pointerRevision: exact ? pointer.pointerRevision : null,
        authorityBundleHash: exact ? pointer.version.authorityBundleHash ?? null : null,
        fenceId: exact ? lease.fenceId : null,
        admission: exact ? "HELD" : "UNCONTROLLED" };
    },
    async readReleasedRuntimeAuthority({ service, pointer, fenceId, epoch }) {
      const observed = await input.service.inspectRunning(service);
      const active = await input.database.readActivePointer();
      const pointerExact = active !== null && active.pointerRevision === pointer.pointerRevision &&
        active.version.modeVersionId === pointer.version.modeVersionId &&
        active.version.contentHash === pointer.version.contentHash &&
        active.version.authorityBundleHash === pointer.version.authorityBundleHash;
      const resolution = pointerExact
        ? await input.database.proveRuntimeResolution({ pointer: active!, notBefore: active!.updatedAt })
        : "MISSING";
      const exact = observed && pointerExact && resolution === "EXACT";
      return { status: exact ? "EXACT" : "AMBIGUOUS", service: observed,
        modeVersionId: active?.version.modeVersionId ?? null, contentHash: active?.version.contentHash ?? null,
        pointerRevision: active?.pointerRevision ?? null,
        authorityBundleHash: active?.version.authorityBundleHash ?? null,
        fenceId, epoch, admission: exact ? "OPEN" : "AMBIGUOUS" } as const;
    },
    readActivationAudit: input.database.readActivationAudit.bind(input.database),
    async readConsumerAuthorities({ consumers }) {
      if (lastStartedAt === null || lastStartedPointer === null) return [];
      const proof = await input.database.proveRuntimeResolution({
        pointer: lastStartedPointer,
        notBefore: lastStartedAt,
      });
      if (proof !== "EXACT") return [];
      return consumers.map((consumer) => ({
        consumer, source: "DATABASE" as const,
        modeVersionId: lastStartedPointer!.version.modeVersionId,
        contentHash: lastStartedPointer!.version.contentHash,
        pointerRevision: lastStartedPointer!.pointerRevision,
        authorityBundleHash: lastStartedPointer!.version.authorityBundleHash ?? null,
      }));
    },
    async readReleasedConsumerAuthorities({ consumers }) {
      const pointer = await input.database.readActivePointer();
      if (pointer === null) return [];
      if (await input.database.proveRuntimeResolution({ pointer, notBefore: pointer.updatedAt }) !== "EXACT") {
        return [];
      }
      return consumers.map((consumer) => ({ consumer, source: "DATABASE" as const,
        modeVersionId: pointer.version.modeVersionId, contentHash: pointer.version.contentHash,
        pointerRevision: pointer.pointerRevision,
        authorityBundleHash: pointer.version.authorityBundleHash ?? null }));
    },
    releaseFence: input.database.releaseFence.bind(input.database),
  };
  return Object.freeze(ports);
}

export class TrackBPostgresPreprodDatabaseBoundary implements TrackBPreprodDatabaseBoundary {
  readonly #operationId: string;
  readonly #fence: PostgresDf13CommerceCutoverFenceStore;
  readonly #writer: PostgresTrackBCommerceAuthorityWriter;
  readonly #mode: PostgresRuntimeBehaviorModeStore;

  constructor(connectionString: string, operationId: string) {
    if (!UUID_V4.test(operationId)) throw new Error("TRACK_B_B3_2_OPERATION_ID_INVALID");
    this.#operationId = operationId.toLowerCase();
    this.#fence = new PostgresDf13CommerceCutoverFenceStore(connectionString);
    this.#writer = new PostgresTrackBCommerceAuthorityWriter(connectionString);
    this.#mode = new PostgresRuntimeBehaviorModeStore(connectionString, 1);
  }

  async close(): Promise<void> {
    await Promise.all([this.#fence.close(), this.#writer.close(), this.#mode.close()]);
  }

  acquireFence(request: Df13CommerceCutoverFenceRequest) { return this.#fence.acquire(request); }
  releaseFence(lease: Df13CommerceCutoverFenceLease) { return this.#fence.release(lease); }
  readAdmissionHold(input: { pageId: string; channel: string; lease: Df13CommerceCutoverFenceLease }) {
    return this.#writer.readAdmissionHold(input);
  }
  readQuiescence(input: { pageId: string; channel: string }) {
    return this.#writer.readOperationalQuiescence(input);
  }
  readExactVersion(input: { pageId: string; channel: string; modeVersionId: string }) {
    return this.#writer.readExactVersion(input);
  }
  readActivePointer() { return this.#mode.loadActiveMode({ pageId: PAGE_ID, channel: CHANNEL }); }

  async prepareTarget(previous: RuntimeBehaviorModePointer) {
    return this.#writer.prepareTarget({
      pageId: PAGE_ID,
      channel: CHANNEL,
      expectedCurrent: {
        modeVersionId: previous.version.modeVersionId,
        contentHash: previous.version.contentHash,
        pointerRevision: previous.pointerRevision,
        authorityBundleHash: previous.version.authorityBundleHash ?? "",
      },
      actor: "TRACK_B_B3_2_WRITER",
      reason: `TRACK_B_B3_2_PREPARE:${this.#operationId}`,
    });
  }

  async mutateExactPointer(input: {
    direction: "ACTIVATE_TRACK_B" | "ROLLBACK_TRACK_B";
    previous: RuntimeBehaviorModePointer;
    target: RuntimeBehaviorModePointer;
    lease: Df13CommerceCutoverFenceLease;
  }): Promise<{ status: "ACKNOWLEDGED" | "ACK_LOST" | "CAS_MISMATCH" }> {
    try {
      await this.#writer.mutateExactPointer({
        pageId: PAGE_ID, channel: CHANNEL,
        operation: input.direction,
        expectedCurrent: {
          modeVersionId: input.previous.version.modeVersionId,
          contentHash: input.previous.version.contentHash,
          pointerRevision: input.previous.pointerRevision,
          authorityBundleHash: input.previous.version.authorityBundleHash ?? "",
        },
        target: {
          modeVersionId: input.target.version.modeVersionId,
          contentHash: input.target.version.contentHash,
          authorityBundleHash: input.target.version.authorityBundleHash ?? "",
        },
        lease: input.lease,
        actor: "TRACK_B_B3_2_WRITER",
        reason: `TRACK_B_B3_2_${input.direction === "ACTIVATE_TRACK_B" ? "ACTIVATE" : "ROLLBACK"}:${this.#operationId}`,
      });
      return { status: "ACKNOWLEDGED" };
    } catch (error) {
      if (error instanceof Error && error.message === "TRACK_B_B3_2_POINTER_CAS_MISMATCH") {
        return { status: "CAS_MISMATCH" };
      }
      throw error;
    }
  }

  readActivationAudit(input: {
    pointerRevision: number; previousVersionId: string; previousContentHash: string;
    targetVersionId: string; targetContentHash: string; actor: "TRACK_B_B3_2_WRITER"; reason: string;
  }) {
    return this.#writer.readExactActivationAudit({ pageId: PAGE_ID, channel: CHANNEL, ...input });
  }

  proveRuntimeResolution(input: { pointer: RuntimeBehaviorModePointer; notBefore: string }) {
    return this.#writer.readExactRuntimeResolution({
      pageId: PAGE_ID, channel: CHANNEL,
      modeVersionId: input.pointer.version.modeVersionId,
      contentHash: input.pointer.version.contentHash,
      pointerRevision: input.pointer.pointerRevision,
      authorityBundleHash: input.pointer.version.authorityBundleHash ?? "",
      workerId: "realtime-worker-1",
      notBefore: input.notBefore,
    });
  }
}

export const TRACK_B_PREPROD_FIXED_SCOPE = Object.freeze({
  pageId: PAGE_ID,
  channel: CHANNEL,
  composeFile: COMPOSE_FILE,
  projectDirectory: PROJECT_DIRECTORY,
  repositoryRoot: REPOSITORY_ROOT,
  dockerfile: DOCKERFILE,
  startupRoot: STARTUP_ROOT,
});
