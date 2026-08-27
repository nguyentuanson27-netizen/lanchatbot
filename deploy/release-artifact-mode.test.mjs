import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertReviewedReleaseFileMode } from "./release-artifact-mode.mjs";

if (process.platform === "linux") {
  const scratch = mkdtempSync(join(tmpdir(), "lana-df13-release-artifact-mode-"));
  try {
    const executable = join(scratch, "release-entrypoint.sh");
    const internalBody = join(scratch, "release-body.sh");
    writeFileSync(executable, "#!/bin/sh\nexit 0\n");
    writeFileSync(internalBody, "internal\n");
    chmodSync(executable, 0o755);
    chmodSync(internalBody, 0o644);

    assert.doesNotThrow(() => assertReviewedReleaseFileMode({
      repositoryRoot: scratch,
      relativePath: "release-entrypoint.sh",
      expectedMode: 0o755,
      label: "immutable entrypoint",
    }), "an immutable release artifact without .git must validate its preserved executable mode");
    assert.doesNotThrow(() => assertReviewedReleaseFileMode({
      repositoryRoot: scratch,
      relativePath: "release-body.sh",
      expectedMode: 0o644,
      label: "immutable internal body",
    }), "an immutable release artifact without .git must validate its preserved non-executable mode");

    chmodSync(executable, 0o644);
    assert.throws(() => assertReviewedReleaseFileMode({
      repositoryRoot: scratch,
      relativePath: "release-entrypoint.sh",
      expectedMode: 0o755,
      label: "immutable entrypoint",
    }), /RELEASE_ARTIFACT_FILE_MODE_MISMATCH/u, "a malformed immutable artifact must fail closed");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

console.log("DF13 immutable release artifact file-mode contract: PASS");
