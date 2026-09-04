import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { behaviorModeContentHash } from "@lana/chat-runtime";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  createTrackBReleaseLocalRollbackRecord,
  executeTrackBCommerceAuthorityMutation,
  type TrackBServiceReleaseIdentity,
} from "./track-b-commerce-authority-activation.js";
import {
  DockerComposeTrackBPreprodServiceController,
  ReleaseLocalRollbackRecordStore,
  TRACK_B_RUNTIME_CONFIG_KEYS_V1,
  TrackBPreprodImageBuilder,
  TrackBPreprodServicePairController,
  createTrackBCommerceAuthorityPreprodAdapter,
  trackBBuildIdV1,
  trackBCommandEnvironmentV1,
  trackBLegacyBuildIdV1,
  trackBRuntimeConfigHashV1,
} from "./track-b-commerce-authority-preprod-adapter.js";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2 } from "./df13-commerce-authority-bundle.js";

vi.mock("./track-b-release-candidate-evidence.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./track-b-release-candidate-evidence.js")>(),
  validateTrackBReleaseCandidateEvidence: vi.fn(() => ({ status: "MATCHED", reasonCodes: [] })),
}));

const targetRuntimeConfig = Object.assign(
  Object.fromEntries(TRACK_B_RUNTIME_CONFIG_KEYS_V1.map((key) => [key, "false"])), {
  APP_SEND_ENABLED: "true",
  CHATBOT_SEND_ENABLED: "true",
  DF13_COMMERCE_PREPROD_STARTUP_FILE: "/run/df13/commerce-startup.json",
  DF13_COMMERCE_PREPROD_STARTUP_MODE: "COMMERCE",
  HISTORY_WRITE_ENABLED: "true",
  REALTIME_BEHAVIOR_MODE_CHANNEL: "MESSENGER",
  REALTIME_BEHAVIOR_MODE_ENABLED: "true",
  REALTIME_CONFIRMATION_MODE: "LEGACY",
  REALTIME_MODE: "LIVE",
  REALTIME_RELEASE_ID: "5".repeat(40),
  REALTIME_WORKER_ID: "realtime-worker-1",
  RUNTIME_POLICY_CHANNEL: "CANARY_SHADOW",
  RUNTIME_POLICY_ENABLED: "true",
  RUNTIME_POLICY_PUBLISHED_ENABLED: "false",
  SALES_CYCLE_ENABLED: "true",
}) as Record<(typeof TRACK_B_RUNTIME_CONFIG_KEYS_V1)[number], string>;

const previousService: TrackBServiceReleaseIdentity = {
  service: "realtime-worker",
  releaseRevision: "1".repeat(40),
  buildId: "2".repeat(64),
  imageId: "3".repeat(64),
  runtimeConfigHash: "4".repeat(64),
};
const targetService: TrackBServiceReleaseIdentity = {
  service: "realtime-worker",
  releaseRevision: "5".repeat(40),
  buildId: "6".repeat(64),
  imageId: "7".repeat(64),
  runtimeConfigHash: trackBRuntimeConfigHashV1(targetRuntimeConfig),
};
const candidateEvidence = { activationReleaseRevision: targetService.releaseRevision,
  releaseSource: { treeOid: "8".repeat(40) } } as never;
const lkgEvidence = { activationReleaseRevision: previousService.releaseRevision,
  releaseSource: { treeOid: "9".repeat(40) } } as never;

function pointer(modeVersionId: string, pointerRevision: number, authorityBundleHash: string) {
  const payload = { confirmationMode: "V2_ACTIVE" as const, salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const, authorityBundleHash };
  return { version: { schemaVersion: 1 as const, modeVersionId,
    pageId: "1198992073286645", channel: "MESSENGER", ...payload,
    contentHash: behaviorModeContentHash(payload), createdBy: "operator", reason: "prepared",
    createdAt: "2026-09-02T00:00:00.000Z" }, pointerRevision,
  updatedBy: "operator", reason: "active", updatedAt: "2026-09-02T00:00:00.000Z" };
}
const rollbackRecord = createTrackBReleaseLocalRollbackRecord({
  candidate: { service: targetService, sourceTree: "8".repeat(40), imageTag: "lana:v2-candidate",
    startupPackageHash: "a".repeat(64), authority: { pointerRevision: 7,
      modeVersionId: "10000000-0000-4000-8000-000000000002",
      contentHash: `sha256:${"b".repeat(64)}`,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash },
    gateEEvidence: candidateEvidence, migrationSchemaHash: "c".repeat(64) },
  lastKnownGood: { service: previousService, sourceTree: "9".repeat(40), imageTag: "lana:v2-lkg",
    startupPackageHash: "d".repeat(64), authority: { pointerRevision: 6,
      modeVersionId: "10000000-0000-4000-8000-000000000001",
      contentHash: `sha256:${"9".repeat(64)}`,
      bundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash },
    gateEEvidence: lkgEvidence, migrationSchemaHash: "c".repeat(64) },
  lastKnownGoodSelection: { source: "CURRENT_ACCEPTED_V2", priorRecordHash: null },
});

describe("Track B PREPROD rollback record store", () => {
  it("persists one immutable canonical self-hashed record and reads it back", async () => {
    const directory = await mkdtemp(join(tmpdir(), "track-b-rollback-"));
    const store = new ReleaseLocalRollbackRecordStore(directory);
    await store.persist(rollbackRecord);
    await expect(store.read(rollbackRecord.recordHash)).resolves.toEqual(rollbackRecord);
    expect(JSON.parse(await readFile(join(directory, `${rollbackRecord.recordHash}.json`), "utf8")))
      .toEqual(rollbackRecord);
  });

  it("rejects conflicting content and malformed persisted records", async () => {
    const directory = await mkdtemp(join(tmpdir(), "track-b-rollback-"));
    const store = new ReleaseLocalRollbackRecordStore(directory);
    await store.persist(rollbackRecord);
    await expect(store.persist({
      ...rollbackRecord,
      lastKnownGood: { ...rollbackRecord.lastKnownGood,
        service: { ...previousService, buildId: "d".repeat(64) } },
      lastKnownGoodSelection: rollbackRecord.lastKnownGoodSelection,
    })).rejects.toThrow("TRACK_B_B3_2_ROLLBACK_RECORD_INVALID");
    await writeFile(join(directory, `${"f".repeat(64)}.json`), "{}\n", "utf8");
    await expect(store.read("f".repeat(64))).rejects.toThrow(
      "TRACK_B_B3_2_ROLLBACK_RECORD_INVALID",
    );
  });
});

describe("Track B PREPROD Docker service boundary", () => {
  it("requires a valid explicit runtime release id for a legacy OCI-only service", () => {
    const common = {
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/shared/df13/previous.json",
      imageReference: "lana-chatbot-app:track-b-previous",
      expectedImageId: previousService.imageId,
      labelPolicy: "OCI_REVISION_ONLY" as const,
    };
    expect(() => new DockerComposeTrackBPreprodServiceController(common))
      .toThrow("TRACK_B_B3_2_RUNTIME_RELEASE_ID_INVALID");
    expect(() => new DockerComposeTrackBPreprodServiceController({ ...common,
      runtimeReleaseId: "invalid release id" }))
      .toThrow("TRACK_B_B3_2_RUNTIME_RELEASE_ID_INVALID");
  });

  it("removes an inherited release override for legacy recovery but pins an exact target", () => {
    const inherited = { PATH: "safe", REALTIME_RELEASE_ID: "stale-operator-value" };
    expect(trackBCommandEnvironmentV1(inherited, {
      REALTIME_IMAGE: "lana-chatbot-app:track-b-previous",
    })).toEqual({ PATH: "safe", REALTIME_IMAGE: "lana-chatbot-app:track-b-previous" });
    expect(trackBCommandEnvironmentV1(inherited, {
      REALTIME_IMAGE: "lana-chatbot-app:track-b-target",
      REALTIME_RELEASE_ID: targetService.releaseRevision,
    })).toEqual({ PATH: "safe", REALTIME_IMAGE: "lana-chatbot-app:track-b-target",
      REALTIME_RELEASE_ID: targetService.releaseRevision });
    expect(inherited.REALTIME_RELEASE_ID).toBe("stale-operator-value");
  });

  it("derives the unlabeled prior build identity from exact observed OCI, image and safe config", async () => {
    const runtimeReleaseId = "20260828-df13-preprod-commerce-1111111";
    const config = { ...targetRuntimeConfig, REALTIME_RELEASE_ID: runtimeReleaseId };
    const runtimeConfigHash = trackBRuntimeConfigHashV1(config);
    const expected = { ...previousService, runtimeConfigHash,
      buildId: trackBLegacyBuildIdV1({ sourceCommit: previousService.releaseRevision,
        imageId: previousService.imageId, runtimeConfigHash }) };
    const run = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "exec") return TRACK_B_RUNTIME_CONFIG_KEYS_V1.map((key) => config[key]).join("\n");
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${expected.imageId}`,
        Config: { Labels: { "org.opencontainers.image.revision": expected.releaseRevision } } });
      return JSON.stringify({ Image: `sha256:${expected.imageId}`, RestartCount: 0,
        State: { Status: "running", Health: { Status: "healthy" } },
        Config: { Labels: { "org.opencontainers.image.revision": expected.releaseRevision } } });
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/shared/df13/previous.json",
      imageReference: "lana-chatbot-app:track-b-previous", expectedImageId: expected.imageId,
      runtimeReleaseId,
      labelPolicy: "OCI_REVISION_ONLY", run,
    });
    await expect(controller.inspectRunning(expected)).resolves.toEqual(expected);
    await expect(controller.inspectRunning({ ...expected, buildId: "f".repeat(64) })).resolves.toBeNull();
    const mismatchedReleaseController = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/shared/df13/previous.json",
      imageReference: "lana-chatbot-app:track-b-previous", expectedImageId: expected.imageId,
      runtimeReleaseId: "20260828-df13-preprod-commerce-deadbee",
      labelPolicy: "OCI_REVISION_ONLY", run,
    });
    await expect(mismatchedReleaseController.inspectRunning(expected)).resolves.toBeNull();
  });

  it("refuses a running service when its exact startup artifact cannot be read", async () => {
    const startupPackageFile = "/opt/lana-chatbot/releases/track-b/__test-unbound-startup.json";
    const run = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "exec") return TRACK_B_RUNTIME_CONFIG_KEYS_V1
        .map((key) => targetRuntimeConfig[key]).join("\n");
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${targetService.imageId}`,
        Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
        } } });
      return JSON.stringify({ Image: `sha256:${targetService.imageId}`, RestartCount: 0,
        State: { Status: "running", Health: { Status: "healthy" } },
        Config: { Env: ["DF13_COMMERCE_PREPROD_STARTUP_FILE=/run/df13/commerce-startup.json"], Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
        } },
        Mounts: [{ Type: "bind", Source: startupPackageFile,
          Destination: "/run/df13/commerce-startup.json", RW: false }] });
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile, startupPackageHash: "a".repeat(64),
      imageReference: "lana-chatbot-app:track-b-target", expectedImageId: targetService.imageId, run,
      readStartupPackage: vi.fn(async () => { throw new Error("unreadable"); }),
    });

    await expect(controller.inspectRunning(targetService)).resolves.toBeNull();
  });

  it("proves the real Compose read-only startup bind and rejects every ambiguous mount shape", async () => {
    const startupPackageFile = "/opt/lana-chatbot/releases/track-b/commerce-startup.json";
    const startup = { schemaVersion: 1, release: "track-b-v2" };
    const startupPackageHash = createHash("sha256").update(canonicalJsonV1(startup), "utf8").digest("hex");
    const inspectFor = (mounts: unknown) => JSON.stringify({ Image: `sha256:${targetService.imageId}`,
      RestartCount: 0, State: { Status: "running", Health: { Status: "healthy" } },
      Config: { Env: ["DF13_COMMERCE_PREPROD_STARTUP_FILE=/run/df13/commerce-startup.json"], Labels: {
        "org.opencontainers.image.revision": targetService.releaseRevision,
        "com.lana.build-id": targetService.buildId,
        "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
      } }, Mounts: mounts });
    const runFor = (mounts: unknown) => vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "exec") return TRACK_B_RUNTIME_CONFIG_KEYS_V1.map((key) => targetRuntimeConfig[key]).join("\n");
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${targetService.imageId}`,
        Config: { Labels: { "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash } } });
      return inspectFor(mounts);
    });
    const controllerFor = (mounts: unknown) => new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy", startupPackageFile,
      startupPackageHash, imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId, run: runFor(mounts),
      readStartupPackage: vi.fn(async () => startup),
    });
    const exact = [{ Type: "bind", Source: startupPackageFile,
      Destination: "/run/df13/commerce-startup.json", RW: false }];
    await expect(controllerFor(exact).inspectRunning(targetService)).resolves.toEqual(targetService);
    for (const mounts of [
      [],
      [...exact, exact[0]],
      [{ ...exact[0], Source: "/opt/lana-chatbot/releases/track-b/other.json" }],
      [{ ...exact[0], Destination: "/run/df13/other.json" }],
      [...exact, { ...exact[0], Destination: "/run/df13/duplicate.json" }],
      [{ ...exact[0], Type: "volume" }],
      [{ ...exact[0], RW: true }],
    ]) {
      await expect(controllerFor(mounts).inspectRunning(targetService)).resolves.toBeNull();
    }
    const mismatchedHash = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile, startupPackageHash, imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId, run: runFor(exact),
      readStartupPackage: vi.fn(async () => ({ ...startup, release: "other" })),
    });
    await expect(mismatchedHash.inspectRunning(targetService)).resolves.toBeNull();
  });

  it("builds only a clean exact source tree and reads back all immutable image labels", async () => {
    const sourceTree = "9".repeat(40);
    const buildId = trackBBuildIdV1({ sourceCommit: targetService.releaseRevision, sourceTree,
      runtimeConfigHash: targetService.runtimeConfigHash });
    const calls: readonly string[][] = [];
    const mutableCalls = calls as string[][];
    const run = vi.fn(async (command: string, args: readonly string[]) => {
      mutableCalls.push([command, ...args]);
      if (command === "git" && args.includes("status")) return "";
      if (command === "git" && args.at(-1) === "HEAD") return targetService.releaseRevision;
      if (command === "git") return sourceTree;
      if (args[0] === "build") return "";
      return JSON.stringify({ Id: `sha256:${targetService.imageId}`, Config: { Labels: {
        "org.opencontainers.image.revision": targetService.releaseRevision,
        "com.lana.build-id": buildId,
        "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
      } } });
    });
    const identity = await new TrackBPreprodImageBuilder(run).build({
      sourceCommit: targetService.releaseRevision,
      sourceTree,
      imageReference: "lana-chatbot-app:track-b-target",
      runtimeConfig: targetRuntimeConfig,
    });
    expect(identity).toEqual({ ...targetService, buildId });
    const build = mutableCalls.find((entry) => entry[0] === "docker" && entry[1] === "build");
    expect(build).toContain("--pull=false");
    expect(build).toContain(`/opt/lana-chatbot/repository`);
    expect(JSON.stringify(mutableCalls)).not.toMatch(/password|token|secret/i);
  });

  it("fails a build when the clean source tree drifts during Docker build", async () => {
    let built = false;
    const run = vi.fn(async (command: string, args: readonly string[]) => {
      if (command === "docker") { built = true; return ""; }
      if (args.includes("status")) return built ? " M apps/worker/src/realtime-runner.ts" : "";
      if (args.at(-1) === "HEAD") return targetService.releaseRevision;
      return "9".repeat(40);
    });
    await expect(new TrackBPreprodImageBuilder(run).build({
      sourceCommit: targetService.releaseRevision, sourceTree: "9".repeat(40),
      imageReference: "lana-chatbot-app:track-b-target", runtimeConfig: targetRuntimeConfig,
    })).rejects.toThrow("TRACK_B_B3_2_BUILD_SOURCE_DRIFT");
  });

  it("stages by proving an exact local image without starting a container", async () => {
    const readStartupPackage = vi.fn(async () => { throw new Error("stage must not read runtime bind"); });
    const run = vi.fn(async (command: string, args: readonly string[]) => {
      expect(command).toBe("docker");
      if (args[0] === "ps") return "";
      if (args[0] === "create") return "staged-id";
      if (args[0] === "inspect") return JSON.stringify({
        Image: `sha256:${targetService.imageId}`,
        State: { Status: "created" },
        Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
          "com.lana.track-b.stage": "TRACK_B_B3_2_STOPPED_NON_ADMITTING",
        } },
      });
      return JSON.stringify({
        Id: `sha256:${targetService.imageId}`,
        Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
        } },
      });
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      startupPackageHash: "a".repeat(64),
      imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId,
      run, readStartupPackage,
    });
    await expect(controller.stage(previousService, targetService)).resolves.toEqual(targetService);
    expect(run.mock.calls.some(([, args]) => args[0] === "create" && args.includes("--network") &&
      args.includes("none"))).toBe(true);
    expect(run.mock.calls.some(([, args]) => args[0] === "compose" &&
      args.includes("config") && args.includes("--quiet") &&
      args.includes("/opt/lana-chatbot/shared/.env.infrastructure"))).toBe(true);
    expect(run.mock.calls.some(([, args]) => args[0] === "compose" && args.includes("up"))).toBe(false);
    expect(readStartupPackage).not.toHaveBeenCalled();
  });

  it("refuses to stage when the exact PREPROD compose environment is incomplete", async () => {
    const run = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "image") return JSON.stringify({
        Id: `sha256:${targetService.imageId}`,
        Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
        } },
      });
      if (args[0] === "compose" && args.includes("config")) {
        throw new Error("COMPOSE_REQUIRED_VARIABLE_MISSING");
      }
      return "";
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId,
      run,
    });
    await expect(controller.stage(previousService, targetService))
      .rejects.toThrow("COMPOSE_REQUIRED_VARIABLE_MISSING");
    expect(run.mock.calls.some(([, args]) => args[0] === "create")).toBe(false);
  });

  it("starts only the exact realtime target through compose with non-secret environment", async () => {
    const calls: Array<{ command: string; args: readonly string[]; env: Record<string, string> }> = [];
    const run = vi.fn(async (command: string, args: readonly string[], env: Record<string, string>) => {
      calls.push({ command, args, env });
      if (args[0] === "ps") return "";
      if (args[0] === "rm") return "staged-id";
      if (args[0] === "compose") return "";
      if (args[0] === "exec") return TRACK_B_RUNTIME_CONFIG_KEYS_V1
        .map((key) => targetRuntimeConfig[key]).join("\n");
      if (args[0] === "image") return JSON.stringify({
        Id: `sha256:${targetService.imageId}`,
        Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
        } },
      });
      const staged = args.at(-1) === "lana-chatbot-track-b-staged-realtime-worker";
      return JSON.stringify({
        Id: "container-id",
        Image: `sha256:${targetService.imageId}`,
        RestartCount: 0,
        State: staged ? { Status: "created" } :
          { Status: "running", Health: { Status: "healthy" } },
        Config: { Image: `sha256:${targetService.imageId}`, Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
          ...(staged ? { "com.lana.track-b.stage": "TRACK_B_B3_2_STOPPED_NON_ADMITTING" } : {}),
        } },
      });
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId,
      run,
    });
    await expect(controller.start(targetService, "COMMERCE")).resolves.toEqual(targetService);
    expect(calls.find(({ args }) => args[0] === "compose")).toEqual({
      command: "docker",
      args: ["compose", "--env-file", "/opt/lana-chatbot/shared/.env.infrastructure",
        "--project-directory", "/opt/lana-chatbot/current/deploy", "-f",
        "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml", "up", "-d", "--no-deps",
        "--force-recreate", "realtime-worker"],
      env: {
        REALTIME_IMAGE: "lana-chatbot-app:track-b-target",
        REALTIME_RELEASE_ID: targetService.releaseRevision,
        DF13_COMMERCE_PREPROD_STARTUP_MODE: "COMMERCE",
        DF13_COMMERCE_PREPROD_STARTUP_HOST_FILE:
          "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      },
    });
    expect(JSON.stringify(calls)).not.toMatch(/password|token|secret/i);
  });

  it("fails closed when the running container configuration differs from the pinned hash", async () => {
    const run = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "image") return JSON.stringify({
        Id: `sha256:${targetService.imageId}`,
        Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
        } },
      });
      if (args[0] === "exec") return TRACK_B_RUNTIME_CONFIG_KEYS_V1
        .map((key) => key === "APP_SEND_ENABLED" ? "false" : targetRuntimeConfig[key]).join("\n");
      return JSON.stringify({
        Image: `sha256:${targetService.imageId}`,
        RestartCount: 0,
        State: { Status: "running", Health: { Status: "healthy" } },
        Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
        } },
      });
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId,
      run,
    });
    await expect(controller.inspectRunning(targetService)).resolves.toBeNull();
  });

  it("can stop an exact restarting service by image identity before reviewed recovery", async () => {
    let stopped = false;
    const run = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${targetService.imageId}`,
        Config: { Labels: { "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash } } });
      if (args[0] === "stop") { stopped = true; return "lana-chatbot-realtime-worker"; }
      return JSON.stringify({ Image: `sha256:${targetService.imageId}`, RestartCount: 0,
        State: { Status: stopped ? "exited" : "restarting", Health: { Status: "unhealthy" } },
        Config: { Labels: { "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash } } });
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId,
      run,
    });
    await expect(controller.stop(targetService)).resolves.toEqual(targetService);
    expect(run).toHaveBeenCalledWith("docker",
      ["stop", "--time", "30", "lana-chatbot-realtime-worker"], {});
  });

  it("marks a partially created but unprovable stage ambiguous for reviewed cleanup", async () => {
    let created = false;
    const run = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${targetService.imageId}`,
        Config: { Labels: { "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash } } });
      if (args[0] === "ps") return created ? "staged-id" : "";
      if (args[0] === "create") { created = true; return "staged-id"; }
      return JSON.stringify({ Image: `sha256:${targetService.imageId}`,
        State: { Status: "created" }, Config: { Labels: {
          "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash,
          "com.lana.track-b.stage": "WRONG",
        } } });
    });
    const controller = new DockerComposeTrackBPreprodServiceController({
      composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      imageReference: "lana-chatbot-app:track-b-target", expectedImageId: targetService.imageId, run,
    });
    await expect(controller.stage(previousService, targetService)).resolves.toBe("AMBIGUOUS");
  });

  it("refuses non-PREPROD paths and non-digest images", () => {
    const base = {
      projectDirectory: "/opt/lana-chatbot/current/deploy",
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/commerce-startup.json",
      imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId,
      run: vi.fn(),
    };
    expect(() => new DockerComposeTrackBPreprodServiceController({
      ...base, composeFile: "/srv/public-production/docker-compose.yml",
    })).toThrow("TRACK_B_B3_2_SERVICE_SCOPE_INVALID");
    expect(() => new DockerComposeTrackBPreprodServiceController({
      ...base, composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      imageReference: "lana-chatbot-app:latest",
      expectedImageId: "not-a-digest",
    })).toThrow("TRACK_B_B3_2_IMAGE_REFERENCE_INVALID");
  });
});

describe("Track B PREPROD mutation adapter", () => {
  it("recovers an exact stopped LKG V2 source before CAS and releases only after convergence", async () => {
    const priorConfig = { ...targetRuntimeConfig,
      REALTIME_RELEASE_ID: previousService.releaseRevision };
    const priorRuntimeConfigHash = trackBRuntimeConfigHashV1(priorConfig);
    const prior = { ...previousService, runtimeConfigHash: priorRuntimeConfigHash };
    const previous = pointer("10000000-0000-4000-8000-000000000001", 6,
      DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash);
    const target = pointer("10000000-0000-4000-8000-000000000002", 7,
      DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash);
    const record = createTrackBReleaseLocalRollbackRecord({
      candidate: { ...rollbackRecord.candidate, service: targetService,
        authority: { pointerRevision: target.pointerRevision, modeVersionId: target.version.modeVersionId,
          contentHash: target.version.contentHash, bundleHash: target.version.authorityBundleHash } },
      lastKnownGood: { ...rollbackRecord.lastKnownGood, service: prior,
        authority: { pointerRevision: previous.pointerRevision, modeVersionId: previous.version.modeVersionId,
          contentHash: previous.version.contentHash, bundleHash: previous.version.authorityBundleHash } },
      lastKnownGoodSelection: rollbackRecord.lastKnownGoodSelection,
    });
    let main = { identity: prior, status: "running" };
    let mainRuntimeConfig = priorConfig;
    let staged: TrackBServiceReleaseIdentity | null = null;
    const composeCalls: Array<{ args: readonly string[]; env: Record<string, string> }> = [];
    const run = vi.fn(async (_command: string, args: readonly string[], env: Record<string, string>) => {
      const tag = String(args.at(-1));
      const expected = tag.includes("previous") ? prior : targetService;
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${expected.imageId}`,
        Config: { Labels: { "org.opencontainers.image.revision": expected.releaseRevision,
          "com.lana.build-id": expected.buildId,
          "com.lana.runtime-config-hash": expected.runtimeConfigHash } } });
      if (args[0] === "ps") return String(args[3]).includes("track-b-staged")
        ? staged ? "staged-id" : "" : "main-id";
      if (args[0] === "create") { staged = expected; return "staged-id"; }
      if (args[0] === "rm") { staged = null; return "staged-id"; }
      if (args[0] === "stop") { main = { ...main, status: "exited" }; return "container"; }
      if (args[0] === "compose") {
        if (args.includes("config")) return "";
        composeCalls.push({ args, env });
        mainRuntimeConfig = { ...priorConfig, REALTIME_RELEASE_ID: env.REALTIME_RELEASE_ID ?? "" };
        main = { identity: prior, status: "running" }; return "";
      }
      if (args[0] === "exec") return TRACK_B_RUNTIME_CONFIG_KEYS_V1
        .map((key) => mainRuntimeConfig[key]).join("\n");
      const stagedInspect = args.at(-1) === "lana-chatbot-track-b-staged-realtime-worker";
      const observed = stagedInspect ? staged : main.identity;
      return JSON.stringify({ Image: `sha256:${observed?.imageId}`, RestartCount: 0,
        State: { Status: stagedInspect ? "created" : main.status, Health: { Status: "healthy" } },
        Config: { Labels: { "org.opencontainers.image.revision": observed?.releaseRevision,
          "com.lana.build-id": observed?.buildId,
          "com.lana.runtime-config-hash": observed?.runtimeConfigHash,
          ...(stagedInspect ? { "com.lana.track-b.stage": "TRACK_B_B3_2_STOPPED_NON_ADMITTING" } : {}) } } });
    });
    const common = { composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy", run };
    const currentPriorController = new DockerComposeTrackBPreprodServiceController({ ...common,
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/prior-rev6.json",
      imageReference: "lana-chatbot-app:track-b-previous", expectedImageId: prior.imageId });
    const targetController = new DockerComposeTrackBPreprodServiceController({ ...common,
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/target-rev7.json",
      imageReference: "lana-chatbot-app:track-b-target", expectedImageId: targetService.imageId });
    const reversePriorController = new DockerComposeTrackBPreprodServiceController({ ...common,
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/prior-rev8.json",
      imageReference: "lana-chatbot-app:track-b-previous", expectedImageId: prior.imageId });
    const service = new TrackBPreprodServicePairController({ previousIdentity: prior,
      targetIdentity: targetService, previous: currentPriorController, target: targetController,
      startRoutes: [
        { identity: prior, pointer: previous, controller: currentPriorController },
        { identity: targetService, pointer: target, controller: targetController },
        { identity: prior, pointer: { ...previous, pointerRevision: 8 }, controller: reversePriorController },
      ] });
    const lease = { fenceId: "20000000-0000-4000-8000-000000000001",
      fenceToken: "30000000-0000-4000-8000-000000000001", epoch: 1 };
    const releaseFence = vi.fn(async () => ({ status: "RELEASED" as const }));
    const database = { acquireFence: vi.fn(async () => ({ status: "HELD" as const, lease })),
      observeFence: vi.fn(),
      releaseFence, readAdmissionHold: vi.fn(async () => ({ status: "HELD" as const,
        source: "DATABASE" as const, pageId: "1198992073286645", channel: "MESSENGER",
        fenceId: lease.fenceId, epoch: 1, released: false,
        guardedClaims: ["webhook_inbox:PROCESSING", "meta_outbox:SENDING",
          "pancake_tag_outbox:APPLYING"] })),
      readQuiescence: vi.fn(async () => ({ activeInbox: 0, activeMetaOutbox: 0,
        activePancakeOutbox: 0, inFlightAuthorityDependentWork: 0,
        queuedAuthorityDependentWork: 0 })),
      mutateExactPointer: vi.fn(async () => ({ status: "CAS_MISMATCH" as const })),
      readActivePointer: vi.fn(async () => previous), readActivationAudit: vi.fn(),
      proveRuntimeResolution: vi.fn(async () => "EXACT" as const),
      readDatabaseClock: vi.fn(async () => "2026-09-03T00:00:00.000000+00"), readExactVersion: vi.fn(),
      readTrackBV2LkgSchemaCompatibility: vi.fn(async () => ({ status: "EXACT" as const,
        source: "DATABASE" as const, migrationSchemaHash: record.candidate.migrationSchemaHash })) };
    const ports = createTrackBCommerceAuthorityPreprodAdapter({ database, service,
      rollbackStore: { read: vi.fn(async () => record), persist: vi.fn() },
      quiescence: { timeoutMs: 10, pollMs: 1, wait: async () => undefined } });
    const readConsumers = vi.fn(ports.readConsumerAuthorities);
    const observedPorts = { ...ports, readConsumerAuthorities: readConsumers };
    await expect(executeTrackBCommerceAuthorityMutation({ operationId:
      "40000000-0000-4000-8000-000000000001", direction: "ACTIVATE_V2_CANDIDATE", previous,
    target, rollbackRecord: record, releaseEvidence: record.candidate.gateEEvidence,
    ports: observedPorts })).resolves.toEqual({
      status: "BLOCKED_PREVIOUS", sideEffects: "CONTROL_PLANE_ONLY",
      reasonCodes: ["TRACK_B_B3_2_POINTER_NOT_MUTATED"],
    });
    expect(main).toEqual({ identity: prior, status: "running" });
    expect(composeCalls).toHaveLength(1);
    expect(composeCalls[0]?.args).toContain("/opt/lana-chatbot/shared/.env.infrastructure");
    expect(composeCalls[0]?.env).toMatchObject({
      REALTIME_IMAGE: "lana-chatbot-app:track-b-previous",
      DF13_COMMERCE_PREPROD_STARTUP_HOST_FILE:
        "/opt/lana-chatbot/releases/track-b/prior-rev6.json",
    });
    expect(composeCalls[0]?.env).toHaveProperty("REALTIME_RELEASE_ID",
      previousService.releaseRevision);
    expect(database.proveRuntimeResolution).toHaveBeenCalledWith({ pointer: previous,
      notBefore: "2026-09-03T00:00:00.000000+00" });
    expect(database.readDatabaseClock.mock.invocationCallOrder[0])
      .toBeLessThan(database.proveRuntimeResolution.mock.invocationCallOrder[0] ?? 0);
    expect(readConsumers).toHaveBeenCalledTimes(1);
    expect(releaseFence).toHaveBeenCalledWith(lease);
  });

  it("restages and restarts the exact prior service through concrete controllers after target failure", async () => {
    const runtimeReleaseId = "20260828-df13-preprod-commerce-1111111";
    const priorConfig = { ...targetRuntimeConfig, REALTIME_RELEASE_ID: runtimeReleaseId };
    const priorRuntimeConfigHash = trackBRuntimeConfigHashV1(priorConfig);
    const prior = { ...previousService, runtimeConfigHash: priorRuntimeConfigHash,
      buildId: trackBLegacyBuildIdV1({ sourceCommit: previousService.releaseRevision,
        imageId: previousService.imageId, runtimeConfigHash: priorRuntimeConfigHash }) };
    let main = { identity: targetService, status: "running" };
    let mainRuntimeConfig = targetRuntimeConfig;
    let staged: TrackBServiceReleaseIdentity | null = null;
    const run = vi.fn(async (_command: string, args: readonly string[], env: Record<string, string>) => {
      const tag = String(args.at(-1));
      const expected = tag.includes("previous") ? prior : targetService;
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${expected.imageId}`,
        Config: { Labels: { "org.opencontainers.image.revision": expected.releaseRevision,
          ...(expected === targetService ? { "com.lana.build-id": expected.buildId,
            "com.lana.runtime-config-hash": expected.runtimeConfigHash } : {}) } } });
      if (args[0] === "ps") return String(args[3]).includes("track-b-staged")
        ? staged ? "staged-id" : "" : "main-id";
      if (args[0] === "create") { staged = expected; return "staged-id"; }
      if (args[0] === "rm") { staged = null; return "staged-id"; }
      if (args[0] === "stop") { main = { ...main, status: "exited" }; return "container"; }
      if (args[0] === "compose") {
        if (args.includes("config")) return "";
        mainRuntimeConfig = { ...priorConfig, REALTIME_RELEASE_ID: env.REALTIME_RELEASE_ID ?? "" };
        main = { identity: prior, status: "running" }; return "";
      }
      if (args[0] === "exec") return TRACK_B_RUNTIME_CONFIG_KEYS_V1
        .map((key) => mainRuntimeConfig[key]).join("\n");
      const stagedInspect = args.at(-1) === "lana-chatbot-track-b-staged-realtime-worker";
      const observed = stagedInspect ? staged : main.identity;
      return JSON.stringify({ Image: `sha256:${observed?.imageId}`, RestartCount: 0,
        State: { Status: stagedInspect ? "created" : main.status, Health: { Status: "healthy" } },
        Config: { Labels: { "org.opencontainers.image.revision": observed?.releaseRevision,
          ...(observed === targetService ? { "com.lana.build-id": observed.buildId,
            "com.lana.runtime-config-hash": observed.runtimeConfigHash } : {}),
          ...(stagedInspect ? { "com.lana.track-b.stage": "TRACK_B_B3_2_STOPPED_NON_ADMITTING" } : {}) } } });
    });
    const common = { composeFile: "/opt/lana-chatbot/current/deploy/docker-compose.vps.yml",
      projectDirectory: "/opt/lana-chatbot/current/deploy", run };
    const previousController = new DockerComposeTrackBPreprodServiceController({ ...common,
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/rollback.json",
      imageReference: "lana-chatbot-app:track-b-previous", expectedImageId: prior.imageId,
      runtimeReleaseId,
      labelPolicy: "OCI_REVISION_ONLY" });
    const targetController = new DockerComposeTrackBPreprodServiceController({ ...common,
      startupPackageFile: "/opt/lana-chatbot/releases/track-b/target.json",
      imageReference: "lana-chatbot-app:track-b-target", expectedImageId: targetService.imageId });
    const recoveryPointer = { pointerRevision: 8 } as never;
    const service = new TrackBPreprodServicePairController({ previousIdentity: prior,
      targetIdentity: targetService,
      previous: previousController, target: targetController,
      startRoutes: [
        { identity: prior, pointer: { pointerRevision: 6 } as never, controller: previousController },
        { identity: targetService, pointer: { pointerRevision: 7 } as never, controller: targetController },
        { identity: prior, pointer: recoveryPointer, controller: previousController },
      ] });
    const held = { status: "HELD" as const, source: "DATABASE" as const,
      pageId: "1198992073286645", channel: "MESSENGER", fenceId:
        "20000000-0000-4000-8000-000000000001", epoch: 1, released: false,
      guardedClaims: ["webhook_inbox:PROCESSING", "meta_outbox:SENDING",
        "pancake_tag_outbox:APPLYING"] };
    const adapter = createTrackBCommerceAuthorityPreprodAdapter({ service,
      database: { acquireFence: vi.fn(), observeFence: vi.fn(), releaseFence: vi.fn(), readAdmissionHold: vi.fn(async () => held),
        readQuiescence: vi.fn(), mutateExactPointer: vi.fn(), readActivePointer: vi.fn(),
        readActivationAudit: vi.fn(), proveRuntimeResolution: vi.fn(),
        readDatabaseClock: vi.fn(async () => "2026-09-03T00:00:00.000000+00"), readExactVersion: vi.fn(),
        readTrackBV2LkgSchemaCompatibility: vi.fn() },
      rollbackStore: { read: vi.fn(), persist: vi.fn() },
      quiescence: { timeoutMs: 1, pollMs: 1, wait: async () => undefined } });
    await expect(adapter.restorePreviousService({ lease: { fenceId: held.fenceId,
      fenceToken: "30000000-0000-4000-8000-000000000001", epoch: 1 },
    failedService: targetService, previousService: prior, pointer: recoveryPointer })).resolves.toEqual({
      status: "HEALTHY", admission: "HELD", observedService: prior });
    expect(main).toEqual({ identity: prior, status: "running" });
  });

  it("restores the exact prior image when a failed start leaves no main container", async () => {
    const service = {
      inspectPresent: vi.fn(async () => "ABSENT" as const),
      discard: vi.fn(async () => "DISCARDED" as const),
      stop: vi.fn(),
      stage: vi.fn(async () => previousService),
      start: vi.fn(async () => previousService),
      inspectRunning: vi.fn(),
    };
    const held = { status: "HELD" as const, source: "DATABASE" as const,
      pageId: "1198992073286645", channel: "MESSENGER", fenceId:
        "20000000-0000-4000-8000-000000000001", epoch: 1, released: false,
      guardedClaims: ["webhook_inbox:PROCESSING", "meta_outbox:SENDING",
        "pancake_tag_outbox:APPLYING"] };
    const adapter = createTrackBCommerceAuthorityPreprodAdapter({ service,
      database: { acquireFence: vi.fn(), observeFence: vi.fn(), releaseFence: vi.fn(), readAdmissionHold: vi.fn(async () => held),
        readQuiescence: vi.fn(), mutateExactPointer: vi.fn(), readActivePointer: vi.fn(),
        readActivationAudit: vi.fn(), proveRuntimeResolution: vi.fn(),
        readDatabaseClock: vi.fn(async () => "2026-09-03T00:00:00.000000+00"), readExactVersion: vi.fn(),
        readTrackBV2LkgSchemaCompatibility: vi.fn() },
      rollbackStore: { read: vi.fn(), persist: vi.fn() },
      quiescence: { timeoutMs: 1, pollMs: 1, wait: async () => undefined } });
    await expect(adapter.restorePreviousService({ lease: { fenceId: held.fenceId,
      fenceToken: "30000000-0000-4000-8000-000000000001", epoch: 1 },
    failedService: targetService, previousService,
    pointer: { pointerRevision: 8 } as never })).resolves.toEqual({
      status: "HEALTHY", admission: "HELD", observedService: previousService });
    expect(service.stop).not.toHaveBeenCalled();
    expect(service.stage).toHaveBeenCalledWith(targetService, previousService);
    expect(service.start).toHaveBeenCalledWith(previousService, "COMMERCE",
      { pointerRevision: 8 });
  });

  it("proves admission through the 0038 database boundary and bounded zero-work quiescence", async () => {
    const database = {
      acquireFence: vi.fn(), observeFence: vi.fn(), releaseFence: vi.fn(), readAdmissionHold: vi.fn(async () => ({
        status: "HELD" as const, source: "DATABASE" as const,
        pageId: "1198992073286645", channel: "MESSENGER",
        fenceId: "20000000-0000-4000-8000-000000000001", epoch: 1,
        released: false, guardedClaims: [
          "webhook_inbox:PROCESSING", "meta_outbox:SENDING", "pancake_tag_outbox:APPLYING",
        ],
      })),
      readQuiescence: vi.fn()
        .mockResolvedValueOnce({ activeInbox: 1, activeMetaOutbox: 0, activePancakeOutbox: 0,
          inFlightAuthorityDependentWork: 1, queuedAuthorityDependentWork: 3 })
        .mockResolvedValueOnce({ activeInbox: 0, activeMetaOutbox: 0, activePancakeOutbox: 0,
          inFlightAuthorityDependentWork: 0, queuedAuthorityDependentWork: 3 }),
      mutateExactPointer: vi.fn(), readActivePointer: vi.fn(), readActivationAudit: vi.fn(),
      proveRuntimeResolution: vi.fn(),
      readDatabaseClock: vi.fn(async () => "2026-09-03T00:00:00.000000+00"), readExactVersion: vi.fn(),
      readTrackBV2LkgSchemaCompatibility: vi.fn(),
    };
    const service = {
      stage: vi.fn(), discard: vi.fn(), stop: vi.fn(async () => previousService),
      start: vi.fn(), inspectRunning: vi.fn(async () => previousService),
      inspectPresent: vi.fn(async () => previousService),
    };
    const store = { read: vi.fn(), persist: vi.fn() };
    const adapter = createTrackBCommerceAuthorityPreprodAdapter({
      database, service, rollbackStore: store, quiescence: {
        timeoutMs: 200, pollMs: 1, wait: async () => undefined,
      },
    });
    const lease = { fenceId: "20000000-0000-4000-8000-000000000001",
      fenceToken: "30000000-0000-4000-8000-000000000001", epoch: 1 };
    await expect(adapter.proveAdmissionHeld({ lease })).resolves.toMatchObject({ status: "HELD" });
    await expect(adapter.stopSourceAndProveQuiescence({ lease, sourceService: previousService }))
      .resolves.toEqual({
        status: "QUIESCENT", observedStoppedService: previousService,
        activeInbox: 0, activeMetaOutbox: 0, activePancakeOutbox: 0,
        inFlightAuthorityDependentWork: 0, queuedAuthorityDependentWork: 3,
        admission: "HELD",
      });
    expect(database.readAdmissionHold).toHaveBeenCalledTimes(2);
  });

  it("fails quiescence closed on timeout and leaves queued work untouched", async () => {
    const held = { status: "HELD" as const, source: "DATABASE" as const,
      pageId: "1198992073286645", channel: "MESSENGER",
      fenceId: "20000000-0000-4000-8000-000000000001", epoch: 1,
      released: false, guardedClaims: [
        "webhook_inbox:PROCESSING", "meta_outbox:SENDING", "pancake_tag_outbox:APPLYING",
      ] };
    const database = {
      acquireFence: vi.fn(), observeFence: vi.fn(), releaseFence: vi.fn(), readAdmissionHold: vi.fn(async () => held),
      readQuiescence: vi.fn(async () => ({ activeInbox: 1, activeMetaOutbox: 0,
        activePancakeOutbox: 0, inFlightAuthorityDependentWork: 1,
      queuedAuthorityDependentWork: 9 })), mutateExactPointer: vi.fn(),
      readActivePointer: vi.fn(), readActivationAudit: vi.fn(),
      proveRuntimeResolution: vi.fn(),
      readDatabaseClock: vi.fn(async () => "2026-09-03T00:00:00.000000+00"), readExactVersion: vi.fn(),
      readTrackBV2LkgSchemaCompatibility: vi.fn(),
    };
    const adapter = createTrackBCommerceAuthorityPreprodAdapter({
      database,
      service: { stage: vi.fn(), discard: vi.fn(), stop: vi.fn(async () => previousService),
        start: vi.fn(), inspectRunning: vi.fn(async () => previousService),
        inspectPresent: vi.fn(async () => previousService) },
      rollbackStore: { read: vi.fn(), persist: vi.fn() },
      quiescence: { timeoutMs: 0, pollMs: 1, wait: async () => undefined },
    });
    await expect(adapter.stopSourceAndProveQuiescence({
      lease: { fenceId: held.fenceId, fenceToken: "30000000-0000-4000-8000-000000000001", epoch: 1 },
      sourceService: previousService,
    })).resolves.toMatchObject({ status: "BUSY", queuedAuthorityDependentWork: 9 });
  });
});
