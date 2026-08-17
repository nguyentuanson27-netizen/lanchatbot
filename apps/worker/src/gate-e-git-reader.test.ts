import { describe, expect, it } from "vitest";
import {
  createGateEScoredRunGitReader,
  type GateEGitCommandRunnerV1,
} from "./gate-e-git-reader.js";

describe("Gate E trusted Git evidence reader", () => {
  it("uses fixed argv, fresh trusted main, reachable history, and committer time", async () => {
    const head = "a".repeat(40);
    const earlier = "b".repeat(40);
    const blob = "c".repeat(40);
    const calls: readonly string[][] = [];
    const mutableCalls = calls as string[][];
    const runGit: GateEGitCommandRunnerV1 = async (args) => {
      mutableCalls.push([...args]);
      const key = args.join(" ");
      if (key.startsWith("fetch ")) return { exitCode: 0, stdout: "", stderr: "" };
      if (key.startsWith("rev-parse --verify HEAD")) {
        return { exitCode: 0, stdout: `${head}\n`, stderr: "" };
      }
      if (key.startsWith("status ")) return { exitCode: 0, stdout: "", stderr: "" };
      if (key.startsWith("rev-list ")) {
        return { exitCode: 0, stdout: `${earlier}\n${head}\n`, stderr: "" };
      }
      if (key === `rev-parse --verify ${earlier}:evaluation/gate-e/manifest.json`) {
        return { exitCode: 0, stdout: `${blob}\n`, stderr: "" };
      }
      if (key.startsWith("show -s --format=%cI")) {
        return { exitCode: 0, stdout: "2026-08-18T10:00:00+07:00\n", stderr: "" };
      }
      if (key.startsWith("merge-base ")) return { exitCode: 0, stdout: "", stderr: "" };
      throw new Error(`unexpected argv: ${key}`);
    };
    const reader = createGateEScoredRunGitReader({ cwd: "C:/repo", runGit });

    await reader.refreshTrustedRef();
    expect(await reader.resolveRef("HEAD")).toBe(head);
    expect(await reader.isWorktreeClean()).toBe(true);
    expect(await reader.findBlobIntroductionCommit(
      "evaluation/gate-e/manifest.json", blob, head,
    )).toBe(earlier);
    expect(await reader.isAncestor(earlier, head)).toBe(true);
    expect(await reader.commitTime(earlier)).toBe("2026-08-18T10:00:00+07:00");
    expect(calls[0]).toEqual([
      "fetch", "--no-tags", "origin",
      "+refs/heads/main:refs/remotes/origin/main",
    ]);
    expect(calls).toContainEqual([
      "rev-list", "--reverse", head, "--", "evaluation/gate-e/manifest.json",
    ]);
  });

  it("rejects refs, paths, and ancestry errors instead of invoking a shell", async () => {
    const head = "a".repeat(40);
    const runGit: GateEGitCommandRunnerV1 = async (args) => ({
      exitCode: args[0] === "merge-base" ? 128 : 0,
      stdout: args[0] === "rev-parse" ? head : "",
      stderr: "failure",
    });
    const reader = createGateEScoredRunGitReader({ cwd: "C:/repo", runGit });
    await expect(reader.readBlob(head, "../secret")).rejects.toThrow(
      "GATE_E_GIT_PATH_INVALID",
    );
    await expect(reader.resolveRef("refs/heads/evil" as "HEAD")).rejects.toThrow(
      "GATE_E_GIT_REF_INVALID",
    );
    await expect(reader.isAncestor(head, "b".repeat(40))).rejects.toThrow(
      "GATE_E_GIT_COMMAND_FAILED",
    );
  });

  it("preserves exact blob bytes when deriving source fingerprints", async () => {
    const head = "a".repeat(40);
    const reader = createGateEScoredRunGitReader({
      cwd: "C:/repo",
      runGit: async () => ({
        exitCode: 0,
        stdout: " leading and trailing bytes \n\n",
        stderr: "",
      }),
    });
    await expect(reader.readBlob(head, "apps/worker/src/source.ts")).resolves.toBe(
      " leading and trailing bytes \n\n",
    );
  });
});
