import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import {
  createDf13CommercePreprodStartupAuthority,
  parseDf13CommercePreprodStartupInput,
} from "./df13-commerce-preprod-startup-authority.js";
import {
  prepareDf13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateSourceReader,
} from "./df13-release-candidate-evidence.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

const validateReleaseEvidence = vi.hoisted(() => vi.fn(() => ({
  status: "MATCHED" as const,
  reasonCodes: [] as const,
})));

// This unit suite isolates startup-package admission. The real evidence seam
// separately asserts that the changed Track B source fails closed as stale.
vi.mock("./df13-release-candidate-evidence.js", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("./df13-release-candidate-evidence.js")
  >();
  return {
    ...actual,
    validateDf13ReleaseCandidateEvidence: validateReleaseEvidence,
  };
});

const revision = "a".repeat(40);
const root = fileURLToPath(new URL("../../..", import.meta.url));

async function file(path: string): Promise<string> {
  return readFile(resolve(root, path), "utf8");
}

function blobOid(content: string): string {
  return createHash("sha1")
    .update(`blob ${Buffer.byteLength(content, "utf8")}\0${content}`, "utf8")
    .digest("hex");
}

const reader: Df13ReleaseCandidateSourceReader = {
  async refreshTrustedRef() {},
  async resolveRef() { return revision; },
  async resolveTreeOid() { return "b".repeat(40); },
  readBlob: async (_revision, path) => file(path),
  resolveBlobOid: async (_revision, path) => blobOid(await file(path)),
};

async function authority() {
  const evidence = await prepareDf13ReleaseCandidateEvidence({
    activationReleaseRevision: revision,
    git: reader,
  });
  return createDf13CommercePreprodStartupAuthority({
    mode: "COMMERCE",
    releaseEvidence: evidence,
    expectedAuthority: identity,
    releaseSource: {
      schemaVersion: 1,
      release: "df13-preprod-test",
      repository: "https://github.com/nguyentuanson27-netizen/lanchatbot",
      tag: "df13-preprod-test",
      commit: revision,
      createdAt: "2026-08-24T00:00:00.000Z",
    },
  });
}

const identity = {
  pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
  channel: DF13_COMMERCE_PREPROD_SCOPE_V1.channel,
  modeVersionId: "10000000-0000-4000-8000-000000000001",
  contentHash: `sha256:${"a".repeat(64)}`,
  pointerRevision: 7,
  authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
  source: "DATABASE" as const,
};

describe("DF13 pre-production startup authority", () => {
  it("accepts only the closed Commerce startup-package shape", async () => {
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: revision,
      git: reader,
    });
    expect(parseDf13CommercePreprodStartupInput({
      mode: "COMMERCE",
      releaseEvidence: evidence,
      expectedAuthority: identity,
      releaseSource: {
        schemaVersion: 1,
        release: "df13-preprod-test",
        repository: "https://github.com/nguyentuanson27-netizen/lanchatbot",
        tag: "df13-preprod-test",
        commit: revision,
        createdAt: "2026-08-24T00:00:00.000Z",
      },
    })).toMatchObject({ mode: "COMMERCE", expectedAuthority: identity });
    expect(() => parseDf13CommercePreprodStartupInput({
      mode: "COMMERCE",
      releaseEvidence: evidence,
      expectedAuthority: identity,
      releaseSource: {},
      unexpected: true,
    })).toThrow("DF13_COMMERCE_STARTUP_INPUT_INVALID");
  });

  it("deep-freezes a copied Commerce startup package before authority validation", async () => {
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: revision,
      git: reader,
    });
    const startupInput = {
      mode: "COMMERCE" as const,
      releaseEvidence: JSON.parse(JSON.stringify(evidence)) as typeof evidence,
      expectedAuthority: { ...identity },
      releaseSource: {
        schemaVersion: 1 as const,
        release: "df13-preprod-test",
        repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
        tag: "df13-preprod-test",
        commit: revision,
        createdAt: "2026-08-24T00:00:00.000Z",
      },
    };
    const parsed = parseDf13CommercePreprodStartupInput(startupInput);

    expect(parsed.mode).toBe("COMMERCE");
    if (parsed.mode !== "COMMERCE") throw new Error("TEST_EXPECTED_COMMERCE");
    expect(Object.isFrozen(parsed.releaseEvidence)).toBe(true);
    expect(Object.isFrozen(parsed.expectedAuthority)).toBe(true);
    expect(Object.isFrozen(parsed.releaseSource)).toBe(true);

    const startup = createDf13CommercePreprodStartupAuthority(startupInput);
    startupInput.expectedAuthority.contentHash = `sha256:${"b".repeat(64)}`;
    (startupInput.releaseEvidence as { activationReleaseRevision: string }).activationReleaseRevision = "c".repeat(40);

    await expect(startup.authorizeExactCommerceIdentity(identity)).resolves.toEqual({
      status: "ADMITTED",
    });
  });

  it("admits only an exact DATABASE Commerce identity bound to a validated immutable release package", async () => {
    const startup = await authority();

    await expect(startup.authorizeExactCommerceIdentity(identity)).resolves.toEqual({
      status: "ADMITTED",
    });
    await expect(startup.authorizeExactCommerceIdentity({
      ...identity,
      contentHash: `sha256:${"b".repeat(64)}`,
    })).resolves.toMatchObject({ status: "BLOCKED" });
    await expect(startup.authorizeExactCommerceIdentity({
      ...identity,
      source: "CACHE",
    })).resolves.toMatchObject({ status: "BLOCKED" });
  });

  it("leaves source default-off without a COMMERCE startup package", async () => {
    const startup = createDf13CommercePreprodStartupAuthority({ mode: "LEGACY" });
    await expect(startup.authorizeExactCommerceIdentity(identity)).resolves.toEqual({
      status: "SOURCE_DISABLED",
    });
  });

  it("blocks a COMMERCE startup whose release source cannot prove the evidence revision", async () => {
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: revision,
      git: reader,
    });
    const startup = createDf13CommercePreprodStartupAuthority({
      mode: "COMMERCE",
      releaseEvidence: evidence,
      expectedAuthority: identity,
      releaseSource: {
        schemaVersion: 1,
        release: "df13-preprod-test",
        repository: "https://github.com/nguyentuanson27-netizen/lanchatbot",
        tag: "df13-preprod-test",
        commit: "c".repeat(40),
        createdAt: "2026-08-24T00:00:00.000Z",
      },
    });

    await expect(startup.authorizeExactCommerceIdentity(identity)).resolves.toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_COMMERCE_RELEASE_SOURCE_MISMATCH",
    });
  });
});
