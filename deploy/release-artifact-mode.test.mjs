import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertReviewedReleaseFileMode, resolveTrustedReleaseFilePath } from "./release-artifact-mode.mjs";

function directoryStat() {
  return { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false };
}

function fileStat() {
  return { isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false };
}

function symlinkStat() {
  return { isDirectory: () => false, isFile: () => false, isSymbolicLink: () => true };
}

const logicalRoot = resolve("release-artifact-root");
const logicalFile = resolve(logicalRoot, "deploy", "entrypoint.sh");
const outsideFile = resolve(logicalRoot, "..", "outside", "entrypoint.sh");
const trustedFileSystem = {
  lstatSync: (path) => path === logicalRoot ? directoryStat() : path === logicalFile ? fileStat() : (() => { throw new Error("UNEXPECTED_PATH"); })(),
  realpathSync: (path) => path,
};
assert.deepEqual(resolveTrustedReleaseFilePath({
  repositoryRoot: logicalRoot,
  relativePath: "deploy/entrypoint.sh",
  fileSystem: trustedFileSystem,
}), { root: logicalRoot, filePath: logicalFile }, "a regular release artifact file inside its canonical root must be admitted");
assert.throws(() => resolveTrustedReleaseFilePath({
  repositoryRoot: logicalRoot,
  relativePath: "../outside/entrypoint.sh",
  fileSystem: trustedFileSystem,
}), /RELEASE_ARTIFACT_RELATIVE_PATH_INVALID/u, "a lexical traversal must fail closed");
assert.throws(() => resolveTrustedReleaseFilePath({
  repositoryRoot: logicalRoot,
  relativePath: "deploy/entrypoint.sh",
  fileSystem: {
    ...trustedFileSystem,
    lstatSync: (path) => path === logicalRoot ? symlinkStat() : fileStat(),
  },
}), /RELEASE_ARTIFACT_REPOSITORY_ROOT_UNTRUSTED/u, "a symlinked root must fail closed");
assert.throws(() => resolveTrustedReleaseFilePath({
  repositoryRoot: logicalRoot,
  relativePath: "deploy/entrypoint.sh",
  fileSystem: {
    ...trustedFileSystem,
    realpathSync: (path) => path === logicalFile ? outsideFile : path,
  },
}), /RELEASE_ARTIFACT_FILE_OUTSIDE_ROOT/u, "an intermediate symlink escape must fail closed");
assert.throws(() => resolveTrustedReleaseFilePath({
  repositoryRoot: logicalRoot,
  relativePath: "deploy/entrypoint.sh",
  fileSystem: {
    ...trustedFileSystem,
    lstatSync: (path) => path === logicalRoot ? directoryStat() : symlinkStat(),
  },
}), /RELEASE_ARTIFACT_FILE_UNTRUSTED/u, "a final symlink must fail closed");

if (process.platform === "linux") {
  const scratch = mkdtempSync(join(tmpdir(), "lana-df13-release-artifact-mode-"));
  try {
    const releaseRoot = join(scratch, "release");
    const outsideRoot = join(scratch, "outside");
    mkdirSync(releaseRoot);
    mkdirSync(outsideRoot);
    const executable = join(releaseRoot, "release-entrypoint.sh");
    const internalBody = join(releaseRoot, "release-body.sh");
    writeFileSync(executable, "#!/bin/sh\nexit 0\n");
    writeFileSync(internalBody, "internal\n");
    chmodSync(executable, 0o755);
    chmodSync(internalBody, 0o644);

    assert.doesNotThrow(() => assertReviewedReleaseFileMode({
      repositoryRoot: scratch,
      relativePath: "release/release-entrypoint.sh",
      expectedMode: 0o755,
      label: "immutable entrypoint",
    }), "an immutable release artifact without .git must validate its preserved executable mode");
    assert.doesNotThrow(() => assertReviewedReleaseFileMode({
      repositoryRoot: releaseRoot,
      relativePath: "release-body.sh",
      expectedMode: 0o644,
      label: "immutable internal body",
    }), "an immutable release artifact without .git must validate its preserved non-executable mode");

    chmodSync(executable, 0o644);
    assert.throws(() => assertReviewedReleaseFileMode({
      repositoryRoot: releaseRoot,
      relativePath: "release-entrypoint.sh",
      expectedMode: 0o755,
      label: "immutable entrypoint",
    }), /RELEASE_ARTIFACT_FILE_MODE_MISMATCH/u, "a malformed immutable artifact must fail closed");

    chmodSync(executable, 0o755);
    const outsideExecutable = join(outsideRoot, "outside-entrypoint.sh");
    writeFileSync(outsideExecutable, "#!/bin/sh\nexit 0\n");
    chmodSync(outsideExecutable, 0o755);
    const releaseRootAlias = join(scratch, "release-alias");
    symlinkSync(releaseRoot, releaseRootAlias);
    assert.throws(() => assertReviewedReleaseFileMode({
      repositoryRoot: releaseRootAlias,
      relativePath: "release-entrypoint.sh",
      expectedMode: 0o755,
      label: "symlinked release root",
    }), /RELEASE_ARTIFACT_REPOSITORY_ROOT_UNTRUSTED/u, "a symlinked artifact root must fail closed");

    const intermediateLink = join(releaseRoot, "deploy");
    symlinkSync(outsideRoot, intermediateLink);
    assert.throws(() => assertReviewedReleaseFileMode({
      repositoryRoot: releaseRoot,
      relativePath: "deploy/outside-entrypoint.sh",
      expectedMode: 0o755,
      label: "intermediate symlink escape",
    }), /RELEASE_ARTIFACT_FILE_OUTSIDE_ROOT/u, "an intermediate symlink escape must fail closed");

    const finalLink = join(releaseRoot, "final-link.sh");
    symlinkSync(outsideExecutable, finalLink);
    assert.throws(() => assertReviewedReleaseFileMode({
      repositoryRoot: releaseRoot,
      relativePath: "final-link.sh",
      expectedMode: 0o755,
      label: "final symlink",
    }), /RELEASE_ARTIFACT_FILE_UNTRUSTED/u, "a final symlink must fail closed");
    assert.throws(() => assertReviewedReleaseFileMode({
      repositoryRoot: releaseRoot,
      relativePath: "../outside/outside-entrypoint.sh",
      expectedMode: 0o755,
      label: "traversal",
    }), /RELEASE_ARTIFACT_RELATIVE_PATH_INVALID/u, "a traversal path must fail closed");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

console.log("DF13 immutable release artifact file-mode contract: PASS");
