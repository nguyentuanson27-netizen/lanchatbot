import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Df13ReleaseCandidateSourceReader } from "./df13-release-candidate-evidence.js";
import {
  parseDf13ReleaseCandidateEvidenceCliArgs,
  runDf13ReleaseCandidateEvidenceCli,
} from "./df13-release-candidate-evidence-cli.js";

const activationReleaseRevision = "a".repeat(40);
const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));

function gitBlobOid(content: string): string {
  return createHash("sha1")
    .update(
      "blob " + Buffer.byteLength(content, "utf8") + String.fromCharCode(0) + content,
      "utf8",
    )
    .digest("hex");
}

const sourceReader: Df13ReleaseCandidateSourceReader = {
  async refreshTrustedRef() {},
  async resolveRef() { return activationReleaseRevision; },
  async resolveTreeOid() { return "b".repeat(40); },
  readBlob: async (_revision, path) => readFile(resolve(sourceRoot, path), "utf8"),
  resolveBlobOid: async (_revision, path) =>
    gitBlobOid(await readFile(resolve(sourceRoot, path), "utf8")),
};

describe("DF13 release-candidate evidence CLI", () => {
  it("accepts only an exact revision option", () => {
    expect(parseDf13ReleaseCandidateEvidenceCliArgs([
      "--revision",
      activationReleaseRevision,
    ])).toEqual({ activationReleaseRevision });
    expect(() => parseDf13ReleaseCandidateEvidenceCliArgs([])).toThrow(
      "DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_ARGUMENTS_INVALID",
    );
    expect(() => parseDf13ReleaseCandidateEvidenceCliArgs([
      "--ref",
      "main",
    ])).toThrow("DF13_RELEASE_CANDIDATE_EVIDENCE_CLI_ARGUMENTS_INVALID");
  });

  it("reports stale historical Gate E evidence without an activation path", async () => {
    await expect(runDf13ReleaseCandidateEvidenceCli({
      activationReleaseRevision,
      git: sourceReader,
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      validation: {
        status: "MISMATCH",
        reasonCodes: expect.arrayContaining([
          "DF13_RELEASE_EVIDENCE_STATUS_INVALID",
          "DF13_RELEASE_EVIDENCE_CANDIDATE_PROJECTION_INVALID",
        ]),
      },
      evidence: {
        activationReleaseRevision,
        status: "BLOCKED",
        sideEffects: "NOT_EXECUTED",
        reasonCodes: ["DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH"],
        releaseSource: {
          treeOid: "b".repeat(40),
        },
      },
    });
  });
});
