import { createHash } from "node:crypto";
import { mkdtemp, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runtimeBehaviorModeContentHash } from "@lana/database";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import { parseDf13CommercePreprodStartupInput } from "./df13-commerce-preprod-startup-authority.js";
import {
  executeDf13FirstPreprodCommerceVersionPreparationCli,
  assertDf13FirstPreprodReleaseSourceAttestation,
  assertDf13FirstPreprodImmutableTag,
  parseDf13FirstPreprodCommerceVersionPreparationJson,
  redactedDf13FirstPreprodPreparationSummary,
  resolveDf13FirstPreprodStartupOutputFile,
  safeDf13FirstPreprodPreparationErrorCode,
  writeDf13FirstPreprodStartupPackage,
} from "./df13-first-preprod-commerce-version-preparer-cli.js";
import { createDf13FirstPreprodOperationProof } from "./df13-first-preprod-behavior-writer.js";
import { prepareDf13ReleaseCandidateEvidence, type Df13ReleaseCandidateSourceReader } from "./df13-release-candidate-evidence.js";

const revision = "a".repeat(40);
const root = fileURLToPath(new URL("../../..", import.meta.url));
const pageId = "1198992073286645";
const channel = "MESSENGER";
const execFile = promisify(execFileCallback);

async function file(path: string): Promise<string> {
  return readFile(resolve(root, path), "utf8");
}

async function git(directory: string, args: readonly string[]): Promise<string> {
  return (await execFile("git", ["-C", directory, ...args], { encoding: "utf8" })).stdout.trim();
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

describe("DF13 first-PREPROD COMMERCE version preparer CLI", () => {
  it("accepts only the dedicated prepare operation document shape", () => {
    expect(() => parseDf13FirstPreprodCommerceVersionPreparationJson({
      kind: "PREPARE_COMMERCE",
      proof: {},
      expectedCurrent: {},
      releaseEvidence: {},
      releaseSource: {},
    })).not.toThrow();
    expect(() => parseDf13FirstPreprodCommerceVersionPreparationJson({
      kind: "ACTIVATE_COMMERCE",
      proof: {},
      expectedCurrent: {},
      releaseEvidence: {},
      releaseSource: {},
    })).toThrow("DF13_FIRST_PREPROD_PREPARER_OPERATION_KIND_INVALID");
    expect(() => parseDf13FirstPreprodCommerceVersionPreparationJson({
      kind: "PREPARE_COMMERCE",
      proof: {},
      expectedCurrent: {},
      releaseEvidence: {},
      releaseSource: {},
      unexpected: true,
    })).toThrow("DF13_FIRST_PREPROD_PREPARER_OPERATION_INVALID");
  });

  it("binds a prepared COMMERCE version into an immutable startup package without moving a pointer", async () => {
    const legacyPayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "LEGACY" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: null,
    };
    const commercePayload = {
      confirmationMode: "V2_ACTIVE" as const,
      salesAuthorityMode: "COMMERCE" as const,
      stateReadMode: "LEGACY" as const,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
    };
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: revision,
      git: reader,
    });
    const operation = {
      kind: "PREPARE_COMMERCE" as const,
      proof: createDf13FirstPreprodOperationProof({
        operationId: "10000000-0000-4000-8000-000000000010",
        pageId,
        channel,
        authorityConsumerServiceIds: ["realtime-worker"],
        admission: "SEALED",
        queuedEligibleWork: 0,
        inFlightEligibleWork: 0,
        unreconciledEligibleWork: 0,
        processState: "STOPPED",
        verifiedAt: new Date().toISOString(),
      }),
      expectedCurrent: {
        pageId,
        channel,
        modeVersionId: "10000000-0000-4000-8000-000000000001",
        ...legacyPayload,
        contentHash: runtimeBehaviorModeContentHash(legacyPayload),
        pointerRevision: 3,
      },
      releaseEvidence: evidence,
      releaseSource: {
        schemaVersion: 1 as const,
        release: "df13-preprod-test",
        repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
        tag: "df13-preprod-test",
        commit: revision,
        treeOid: "b".repeat(40),
        createdAt: "2026-08-25T00:00:00.000Z",
      },
    };
    const port = {
      readCurrent: vi.fn(async () => ({
        ...operation.expectedCurrent,
        updatedBy: "known-good",
        reason: "known-good",
        updatedAt: "2026-08-24T00:00:00.000Z",
      })),
      prepareExact: vi.fn(async () => ({
        pageId,
        channel,
        modeVersionId: "10000000-0000-4000-8000-000000000002",
        ...commercePayload,
        contentHash: runtimeBehaviorModeContentHash(commercePayload),
      })),
    };

    const verifyImmutableReleaseTag = vi.fn(async () => {});
    const result = await executeDf13FirstPreprodCommerceVersionPreparationCli({ operation, port, verifyImmutableReleaseTag });

    expect(result).toMatchObject({
      status: "PREPARED_POINTER_UNCHANGED",
      startup: {
        mode: "COMMERCE",
        expectedAuthority: {
          pointerRevision: 4,
          authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
        },
      },
    });
    expect(parseDf13CommercePreprodStartupInput(result.startup)).toMatchObject({
      mode: "COMMERCE",
      expectedAuthority: { modeVersionId: "10000000-0000-4000-8000-000000000002" },
    });
    expect(port.prepareExact).toHaveBeenCalledOnce();

    for (const releaseSource of [
      { ...operation.releaseSource, tag: "refs/heads/main" },
      { ...operation.releaseSource, commit: "c".repeat(40) },
      { ...operation.releaseSource, treeOid: "c".repeat(40) },
    ]) {
      await expect(executeDf13FirstPreprodCommerceVersionPreparationCli({ operation: { ...operation, releaseSource }, port, verifyImmutableReleaseTag }))
        .rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
    }
    await expect(executeDf13FirstPreprodCommerceVersionPreparationCli({
      operation: { ...operation, releaseSource: { ...operation.releaseSource, tag: "main", release: "main" } },
      port,
      verifyImmutableReleaseTag: async () => { throw new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH"); },
    })).rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH");

    const attested = { ...operation.releaseSource };
    delete (attested as { treeOid?: string }).treeOid;
    expect(() => assertDf13FirstPreprodReleaseSourceAttestation(operation.releaseSource, attested)).not.toThrow();
    expect(() => assertDf13FirstPreprodReleaseSourceAttestation(operation.releaseSource, { ...attested, commit: "c".repeat(40) }))
      .toThrow("DF13_FIRST_PREPROD_PREPARER_RELEASE_SOURCE_MISMATCH");
    expect(verifyImmutableReleaseTag).toHaveBeenCalledOnce();
    const summary = redactedDf13FirstPreprodPreparationSummary(result);
    expect(summary).not.toContain("startup");
    expect(summary).toContain("PREPARED_POINTER_UNCHANGED");
    expect(safeDf13FirstPreprodPreparationErrorCode(new Error("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH")))
      .toBe("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH");
    expect(safeDf13FirstPreprodPreparationErrorCode(new Error("unstructured private runtime detail")))
      .toBe("DF13_FIRST_PREPROD_PREPARER_FAILED");
  });

  it("attests one stable annotated tag object and rejects lightweight, branch, and moved refs", async () => {
    const repository = await mkdtemp(join(tmpdir(), "lana-df13-release-tag-"));
    await git(repository, ["init", "--quiet"]);
    await git(repository, ["config", "user.email", "df13-test@example.invalid"]);
    await git(repository, ["config", "user.name", "DF13 test"]);
    await writeFile(join(repository, "candidate.txt"), "first\n", "utf8");
    await git(repository, ["add", "candidate.txt"]);
    await git(repository, ["commit", "--quiet", "-m", "first"]);
    const firstCommit = await git(repository, ["rev-parse", "HEAD"]);
    const firstTree = await git(repository, ["rev-parse", "HEAD^{tree}"]);
    const tag = "df13-preprod-annotated";
    await git(repository, ["tag", "-a", tag, "-m", "immutable DF13 candidate", firstCommit]);
    const source = {
      schemaVersion: 1 as const,
      release: tag,
      repository: "https://github.com/nguyentuanson27-netizen/lanchatbot" as const,
      tag,
      commit: firstCommit,
      treeOid: firstTree,
      createdAt: "2026-08-25T00:00:00.000Z",
    };
    await expect(assertDf13FirstPreprodImmutableTag(source, repository)).resolves.toBeUndefined();

    await git(repository, ["tag", "df13-preprod-lightweight", firstCommit]);
    await expect(assertDf13FirstPreprodImmutableTag({ ...source, release: "df13-preprod-lightweight", tag: "df13-preprod-lightweight" }, repository))
      .rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH");
    await git(repository, ["branch", "df13-preprod-branch", firstCommit]);
    await expect(assertDf13FirstPreprodImmutableTag({ ...source, release: "df13-preprod-branch", tag: "df13-preprod-branch" }, repository))
      .rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH");

    await writeFile(join(repository, "candidate.txt"), "second\n", "utf8");
    await git(repository, ["commit", "--quiet", "-am", "second"]);
    const secondCommit = await git(repository, ["rev-parse", "HEAD"]);
    let refReadCount = 0;
    await expect(assertDf13FirstPreprodImmutableTag(source, repository, async (args) => {
      if (args.join(" ") === `rev-parse --verify refs/tags/${tag}` && ++refReadCount === 2) {
        await git(repository, ["tag", "-f", "-a", tag, "-m", "moved DF13 candidate", secondCommit]);
      }
      return git(repository, args);
    })).rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_RELEASE_TAG_MISMATCH");
  }, 15_000);

  it("writes a canonical create-once startup package only inside a non-symlink evidence directory", async () => {
    const evidenceDir = await mkdtemp(join(tmpdir(), "lana-df13-evidence-"));
    const output = join(evidenceDir, "startup.json");
    const resolved = await resolveDf13FirstPreprodStartupOutputFile(output, evidenceDir);
    await writeDf13FirstPreprodStartupPackage(resolved, { z: 1, a: { b: 2 } });
    expect(await readFile(output, "utf8")).toBe('{"a":{"b":2},"z":1}\n');
    expect((await stat(output)).mode & 0o222).toBe(0);
    await expect(writeDf13FirstPreprodStartupPackage(resolved, { z: 2 })).rejects.toMatchObject({ code: "EEXIST" });

    const symlinkParent = `${evidenceDir}-link`;
    await symlink(evidenceDir, symlinkParent, "junction");
    await expect(resolveDf13FirstPreprodStartupOutputFile(join(symlinkParent, "blocked.json"), evidenceDir))
      .rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_OUTPUT_PATH_FORBIDDEN");
    await expect(resolveDf13FirstPreprodStartupOutputFile(join(symlinkParent, "blocked.json"), symlinkParent))
      .rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_OUTPUT_DIR_INVALID");
    await expect(resolveDf13FirstPreprodStartupOutputFile(join(evidenceDir, "..", "escaped.json"), evidenceDir))
      .rejects.toThrow("DF13_FIRST_PREPROD_PREPARER_OUTPUT_PATH_FORBIDDEN");
  });
});
