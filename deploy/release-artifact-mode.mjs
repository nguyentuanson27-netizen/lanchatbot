import { existsSync, lstatSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";

function fail(code) {
  throw new Error(code);
}

function isOutsideRoot(path) {
  return path.length === 0 || path === ".." || path.startsWith("../") || path.startsWith("..\\") || isAbsolute(path);
}

export function resolveTrustedReleaseFilePath({ repositoryRoot, relativePath, fileSystem = { lstatSync, realpathSync } }) {
  if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) fail("RELEASE_ARTIFACT_REPOSITORY_ROOT_INVALID");
  if (typeof relativePath !== "string" || relativePath.length === 0 || isAbsolute(relativePath)) fail("RELEASE_ARTIFACT_RELATIVE_PATH_INVALID");
  if (!fileSystem || typeof fileSystem.lstatSync !== "function" || typeof fileSystem.realpathSync !== "function") fail("RELEASE_ARTIFACT_FILE_SYSTEM_INVALID");
  const configuredRoot = resolve(repositoryRoot);
  let rootStat;
  let root;
  try {
    rootStat = fileSystem.lstatSync(configuredRoot);
    root = fileSystem.realpathSync(configuredRoot);
  } catch {
    fail("RELEASE_ARTIFACT_REPOSITORY_ROOT_UNTRUSTED");
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || root !== configuredRoot) fail("RELEASE_ARTIFACT_REPOSITORY_ROOT_UNTRUSTED");
  const filePath = resolve(root, relativePath);
  const pathWithinRoot = relative(root, filePath);
  if (isOutsideRoot(pathWithinRoot)) {
    fail("RELEASE_ARTIFACT_RELATIVE_PATH_INVALID");
  }
  let file;
  let resolvedFile;
  try {
    file = fileSystem.lstatSync(filePath);
    resolvedFile = fileSystem.realpathSync(filePath);
  } catch {
    fail(`RELEASE_ARTIFACT_FILE_MISSING:${relativePath}`);
  }
  if (!file.isFile() || file.isSymbolicLink()) fail(`RELEASE_ARTIFACT_FILE_UNTRUSTED:${relativePath}`);
  if (isOutsideRoot(relative(root, resolvedFile))) fail(`RELEASE_ARTIFACT_FILE_OUTSIDE_ROOT:${relativePath}`);
  return { root, filePath: resolvedFile };
}

function expectedGitMode(expectedMode) {
  return `100${expectedMode.toString(8).padStart(3, "0")}`;
}

export function assertReviewedReleaseFileMode({ repositoryRoot, relativePath, expectedMode, label, fileSystem = { lstatSync, realpathSync } }) {
  if (!Number.isInteger(expectedMode) || expectedMode < 0 || expectedMode > 0o777) fail("RELEASE_ARTIFACT_EXPECTED_MODE_INVALID");
  if (typeof label !== "string" || label.length === 0) fail("RELEASE_ARTIFACT_LABEL_INVALID");
  const { root, filePath } = resolveTrustedReleaseFilePath({ repositoryRoot, relativePath, fileSystem });
  const file = fileSystem.lstatSync(filePath);

  if (existsSync(resolve(root, ".git"))) {
    const indexed = spawnSync("git", ["ls-files", "--stage", "--", relativePath], { cwd: root, encoding: "utf8" });
    if (indexed.status !== 0) fail(`RELEASE_ARTIFACT_GIT_INDEX_UNAVAILABLE:${relativePath}`);
    const actualMode = indexed.stdout.trim().split(/\s+/u, 1)[0];
    if (actualMode !== expectedGitMode(expectedMode)) fail(`RELEASE_ARTIFACT_FILE_MODE_MISMATCH:${label}:${actualMode || "UNTRACKED"}`);
    return;
  }

  const actualMode = file.mode & 0o777;
  if (actualMode !== expectedMode) fail(`RELEASE_ARTIFACT_FILE_MODE_MISMATCH:${label}:${actualMode.toString(8)}`);
}
