import { existsSync, lstatSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";

function fail(code) {
  throw new Error(code);
}

function resolveReleaseFile(repositoryRoot, relativePath) {
  if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) fail("RELEASE_ARTIFACT_REPOSITORY_ROOT_INVALID");
  if (typeof relativePath !== "string" || relativePath.length === 0 || isAbsolute(relativePath)) fail("RELEASE_ARTIFACT_RELATIVE_PATH_INVALID");
  const root = resolve(repositoryRoot);
  const filePath = resolve(root, relativePath);
  const pathWithinRoot = relative(root, filePath);
  if (pathWithinRoot.length === 0 || pathWithinRoot === ".." || pathWithinRoot.startsWith("../") || pathWithinRoot.startsWith("..\\") || isAbsolute(pathWithinRoot)) {
    fail("RELEASE_ARTIFACT_RELATIVE_PATH_INVALID");
  }
  return { root, filePath };
}

function expectedGitMode(expectedMode) {
  return `100${expectedMode.toString(8).padStart(3, "0")}`;
}

export function assertReviewedReleaseFileMode({ repositoryRoot, relativePath, expectedMode, label }) {
  if (!Number.isInteger(expectedMode) || expectedMode < 0 || expectedMode > 0o777) fail("RELEASE_ARTIFACT_EXPECTED_MODE_INVALID");
  if (typeof label !== "string" || label.length === 0) fail("RELEASE_ARTIFACT_LABEL_INVALID");
  const { root, filePath } = resolveReleaseFile(repositoryRoot, relativePath);
  let file;
  try {
    file = lstatSync(filePath);
  } catch {
    fail(`RELEASE_ARTIFACT_FILE_MISSING:${relativePath}`);
  }
  if (!file.isFile() || file.isSymbolicLink()) fail(`RELEASE_ARTIFACT_FILE_UNTRUSTED:${relativePath}`);

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
