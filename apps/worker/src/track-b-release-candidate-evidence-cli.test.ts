import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { TrackBReleaseCandidateSourceReader } from "./track-b-release-candidate-evidence.js";
import {
  parseTrackBReleaseCandidateEvidenceCliArgs,
  runTrackBReleaseCandidateEvidenceCli,
} from "./track-b-release-candidate-evidence-cli.js";

const activationReleaseRevision = "a".repeat(40);
const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));

function gitBlobOid(content: string): string {
  return createHash("sha1")
    .update(`blob ${Buffer.byteLength(content, "utf8")}\0${content}`, "utf8")
    .digest("hex");
}

const sourceReader: TrackBReleaseCandidateSourceReader = {
  async refreshTrustedRef() {},
  async resolveRef() { return activationReleaseRevision; },
  async resolveTreeOid() { return "b".repeat(40); },
  readBlob: async (_revision, path) => readFile(resolve(sourceRoot, path), "utf8"),
  resolveBlobOid: async (_revision, path) =>
    gitBlobOid(await readFile(resolve(sourceRoot, path), "utf8")),
};

describe("Track B release-candidate evidence CLI", () => {
  it("accepts only one exact revision option", () => {
    expect(parseTrackBReleaseCandidateEvidenceCliArgs([
      "--revision",
      activationReleaseRevision,
    ])).toEqual({ activationReleaseRevision });
    expect(() => parseTrackBReleaseCandidateEvidenceCliArgs([])).toThrow(
      "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_ARGUMENTS_INVALID",
    );
    expect(() => parseTrackBReleaseCandidateEvidenceCliArgs([
      "--ref",
      "main",
    ])).toThrow("TRACK_B_RELEASE_CANDIDATE_EVIDENCE_CLI_ARGUMENTS_INVALID");
  });

  it("emits a self-validating side-effect-free v22 release packet", async () => {
    await expect(runTrackBReleaseCandidateEvidenceCli({
      activationReleaseRevision,
      git: sourceReader,
    })).resolves.toMatchObject({
      status: "SOURCE_READY_NO_ACTIVATION",
      sideEffects: "NOT_EXECUTED",
      validation: { status: "MATCHED", reasonCodes: [] },
      evidence: {
        activationReleaseRevision,
        contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1",
        status: "SOURCE_READY_NO_ACTIVATION",
        sideEffects: "NOT_EXECUTED",
        releaseSource: { treeOid: "b".repeat(40) },
      },
    });
  });
});
