import { execFile } from "node:child_process";
import type { GateEScoredRunGitReader } from "./gate-e-registration.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const OBJECT_PATTERN = /^[a-f0-9]{40,64}$/u;
const SAFE_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/u;
const TRUSTED_REF = "refs/remotes/origin/main" as const;

export interface GateEGitCommandResultV1 {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export type GateEGitCommandRunnerV1 = (
  args: readonly string[],
) => Promise<GateEGitCommandResultV1>;

function assertCommit(commit: string): void {
  if (!COMMIT_PATTERN.test(commit)) throw new Error("GATE_E_GIT_COMMIT_INVALID");
}

function assertPath(path: string): void {
  if (!SAFE_PATH_PATTERN.test(path) || path.startsWith("/") ||
      path.includes("..") || path.includes("//")) {
    throw new Error("GATE_E_GIT_PATH_INVALID");
  }
}

function defaultRunner(cwd: string): GateEGitCommandRunnerV1 {
  return (args) => new Promise((resolve) => {
    execFile("git", [...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      const exitCode = error === null
        ? 0
        : typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number"
          ? (error as unknown as { code: number }).code
          : 128;
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function successful(
  run: GateEGitCommandRunnerV1,
  args: readonly string[],
  trim = true,
): Promise<string> {
  const result = await run(args);
  if (result.exitCode !== 0) throw new Error("GATE_E_GIT_COMMAND_FAILED");
  return trim ? result.stdout.trim() : result.stdout;
}

export function createGateEScoredRunGitReader(input: Readonly<{
  cwd: string;
  runGit?: GateEGitCommandRunnerV1;
}>): GateEScoredRunGitReader {
  const run = input.runGit ?? defaultRunner(input.cwd);
  return Object.freeze({
    refreshTrustedRef: async () => {
      await successful(run, [
        "fetch", "--no-tags", "origin",
        "+refs/heads/main:refs/remotes/origin/main",
      ]);
    },
    resolveRef: async (ref: "HEAD" | typeof TRUSTED_REF) => {
      if (ref !== "HEAD" && ref !== TRUSTED_REF) {
        throw new Error("GATE_E_GIT_REF_INVALID");
      }
      const commit = await successful(run, ["rev-parse", "--verify", `${ref}^{commit}`]);
      assertCommit(commit);
      return commit;
    },
    isWorktreeClean: async () =>
      (await successful(run, ["status", "--porcelain=v1", "--untracked-files=all"])) === "",
    resolveBlobOid: async (commit: string, path: string) => {
      assertCommit(commit);
      assertPath(path);
      const oid = await successful(run, ["rev-parse", "--verify", `${commit}:${path}`]);
      if (!OBJECT_PATTERN.test(oid)) throw new Error("GATE_E_GIT_BLOB_INVALID");
      return oid;
    },
    readBlob: async (commit: string, path: string) => {
      assertCommit(commit);
      assertPath(path);
      return successful(run, ["show", `${commit}:${path}`], false);
    },
    findBlobIntroductionCommit: async (
      path: string,
      blobOid: string,
      reachableFrom: string,
    ) => {
      assertPath(path);
      if (!OBJECT_PATTERN.test(blobOid)) throw new Error("GATE_E_GIT_BLOB_INVALID");
      assertCommit(reachableFrom);
      const history = (await successful(run, [
        "rev-list", "--reverse", reachableFrom, "--", path,
      ])).split(/\r?\n/u).filter(Boolean);
      for (const commit of history) {
        assertCommit(commit);
        const result = await run(["rev-parse", "--verify", `${commit}:${path}`]);
        if (result.exitCode === 0 && result.stdout.trim() === blobOid) return commit;
      }
      throw new Error("GATE_E_GIT_BLOB_INTRODUCTION_NOT_FOUND");
    },
    isAncestor: async (ancestor: string, descendant: string) => {
      assertCommit(ancestor);
      assertCommit(descendant);
      const result = await run(["merge-base", "--is-ancestor", ancestor, descendant]);
      if (result.exitCode === 0) return true;
      if (result.exitCode === 1) return false;
      throw new Error("GATE_E_GIT_COMMAND_FAILED");
    },
    commitTime: async (commit: string) => {
      assertCommit(commit);
      const timestamp = await successful(run, ["show", "-s", "--format=%cI", commit]);
      if (!Number.isFinite(Date.parse(timestamp))) {
        throw new Error("GATE_E_GIT_COMMIT_TIME_INVALID");
      }
      return timestamp;
    },
  });
}
