import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createTrackBReleaseLocalRollbackRecord,
  type TrackBServiceReleaseIdentity,
} from "./track-b-commerce-authority-activation.js";
import {
  DockerComposeTrackBPreprodServiceController,
  ReleaseLocalRollbackRecordStore,
  TRACK_B_RUNTIME_CONFIG_KEYS_V1,
  TrackBPreprodImageBuilder,
  createTrackBCommerceAuthorityPreprodAdapter,
  trackBBuildIdV1,
  trackBLegacyBuildIdV1,
  trackBRuntimeConfigHashV1,
} from "./track-b-commerce-authority-preprod-adapter.js";

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
const rollbackRecord = createTrackBReleaseLocalRollbackRecord({
  selectedSourceCommit: targetService.releaseRevision,
  previousService,
  targetService,
  previousAuthority: {
    modeVersionId: "10000000-0000-4000-8000-000000000001",
    contentHash: `sha256:${"9".repeat(64)}`,
    bundleHash: "a".repeat(64),
  },
  targetAuthority: {
    modeVersionId: "10000000-0000-4000-8000-000000000002",
    contentHash: `sha256:${"b".repeat(64)}`,
    bundleHash: "c".repeat(64),
  },
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
      previousService: { ...previousService, buildId: "d".repeat(64) },
    })).rejects.toThrow("TRACK_B_B3_2_ROLLBACK_RECORD_INVALID");
    await writeFile(join(directory, `${"f".repeat(64)}.json`), "{}\n", "utf8");
    await expect(store.read("f".repeat(64))).rejects.toThrow(
      "TRACK_B_B3_2_ROLLBACK_RECORD_INVALID",
    );
  });
});

describe("Track B PREPROD Docker service boundary", () => {
  it("derives the unlabeled prior build identity from exact observed OCI, image and safe config", async () => {
    const config = { ...targetRuntimeConfig, REALTIME_RELEASE_ID: previousService.releaseRevision };
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
      labelPolicy: "OCI_REVISION_ONLY", run,
    });
    await expect(controller.inspectRunning(expected)).resolves.toEqual(expected);
    await expect(controller.inspectRunning({ ...expected, buildId: "f".repeat(64) })).resolves.toBeNull();
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

  it("stages by proving an exact local image without starting a container", async () => {
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
      imageReference: "lana-chatbot-app:track-b-target",
      expectedImageId: targetService.imageId,
      run,
    });
    await expect(controller.stage(previousService, targetService)).resolves.toEqual(targetService);
    expect(run.mock.calls.some(([, args]) => args[0] === "create" && args.includes("--network") &&
      args.includes("none"))).toBe(true);
    expect(run.mock.calls.some(([, args]) => args[0] === "compose")).toBe(false);
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
      args: ["compose", "--project-directory", "/opt/lana-chatbot/current/deploy", "-f",
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

  it("can stop the exact failed target by image identity even when runtime config readback failed", async () => {
    let stopped = false;
    const run = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "image") return JSON.stringify({ Id: `sha256:${targetService.imageId}`,
        Config: { Labels: { "org.opencontainers.image.revision": targetService.releaseRevision,
          "com.lana.build-id": targetService.buildId,
          "com.lana.runtime-config-hash": targetService.runtimeConfigHash } } });
      if (args[0] === "stop") { stopped = true; return "lana-chatbot-realtime-worker"; }
      return JSON.stringify({ Image: `sha256:${targetService.imageId}`, RestartCount: 0,
        State: { Status: stopped ? "exited" : "running", Health: { Status: "unhealthy" } },
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
  it("proves admission through the 0038 database boundary and bounded zero-work quiescence", async () => {
    const database = {
      acquireFence: vi.fn(), releaseFence: vi.fn(), readAdmissionHold: vi.fn(async () => ({
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
      acquireFence: vi.fn(), releaseFence: vi.fn(), readAdmissionHold: vi.fn(async () => held),
      readQuiescence: vi.fn(async () => ({ activeInbox: 1, activeMetaOutbox: 0,
        activePancakeOutbox: 0, inFlightAuthorityDependentWork: 1,
      queuedAuthorityDependentWork: 9 })), mutateExactPointer: vi.fn(),
      readActivePointer: vi.fn(), readActivationAudit: vi.fn(),
      proveRuntimeResolution: vi.fn(),
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
