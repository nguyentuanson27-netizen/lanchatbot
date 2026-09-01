import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GateEEvidenceReaderV2 } from "./gate-e-registration.js";
import type { TrackBReleaseCandidateSourceReader } from "./track-b-release-candidate-evidence.js";
import {
  parseTrackBReleaseCandidateEvidenceCliArgs,
  runTrackBReleaseCandidateEvidenceCli,
} from "./track-b-release-candidate-evidence-cli.js";

const activationReleaseRevision = "a".repeat(40);
const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));

const verifyCertification = vi.hoisted(() => vi.fn());
const verifyProvenance = vi.hoisted(() => vi.fn());

vi.mock("./gate-e-registration.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./gate-e-registration.js")>(),
  verifyStoredGateEEvidenceCertification: verifyCertification,
  verifyGateERegistrationProvenance: verifyProvenance,
}));

const evidenceStore = {} as GateEEvidenceReaderV2;

function gitBlobOid(content: string): string {
  return createHash("sha1")
    .update(`blob ${Buffer.byteLength(content, "utf8")}\0${content}`, "utf8")
    .digest("hex");
}

const sourceReader: TrackBReleaseCandidateSourceReader = {
  async refreshTrustedRef() {},
  async resolveRef() { return activationReleaseRevision; },
  async resolveTreeOid() { return "b".repeat(40); },
  async findBlobIntroductionCommit() { return "c".repeat(40); },
  async isAncestor() { return true; },
  async commitTime() { return "2026-09-01T00:00:00.000Z"; },
  readBlob: async (_revision, path) => readFile(resolve(sourceRoot, path), "utf8"),
  resolveBlobOid: async (_revision, path) =>
    gitBlobOid(await readFile(resolve(sourceRoot, path), "utf8")),
};

describe("Track B release-candidate evidence CLI", () => {
  beforeEach(() => {
    verifyCertification.mockReset().mockResolvedValue({
      disposition: "FINALIZED_TRUSTED_EXACT_HEAD" as const,
      evidenceBodyHash: "639c0eec9f929c1458148fdc3ef60c49ee88ea22205ec240def85e9a377eced1",
      finalizationHash: "9af67aec9b2ed8569a010c1a93efcc2a5ed491c83f675e9eb8c7db1cc8517064",
      bodyAdmittedAt: "2026-09-01T00:00:00.000Z",
      finalizationAdmittedAt: "2026-09-01T00:01:00.000Z",
    });
    verifyProvenance.mockReset().mockImplementation(async (input: Readonly<{
      scoredRunRevision: string;
      scoredRunStartedAt: string;
    }>) => ({
      disposition: "REGISTRATION_PROVENANCE_VERIFIED" as const,
      registrationCommit: "c".repeat(40),
      registrationBlobOid: "d".repeat(40),
      manifestHash: "3cb70725d079ae36ccec59e2ff886f1e08fed77bd4b3d49a0dddaf380ddae432",
      scoredRunRevision: input.scoredRunRevision,
      registrationCommitTime: "2026-09-01T00:00:00.000Z",
      scoredRunStartedAt: input.scoredRunStartedAt,
    }));
  });
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
      evidenceStore,
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

  it.each([
    "GATE_E_EVIDENCE_RECORD_MISSING_OR_MISMATCHED",
    "GATE_E_EVIDENCE_CERTIFICATION_INVALID",
  ])("blocks when durable Gate E certification fails: %s", async (failure) => {
    verifyCertification.mockRejectedValueOnce(new Error(failure));

    const result = await runTrackBReleaseCandidateEvidenceCli({
      activationReleaseRevision,
      git: sourceReader,
      evidenceStore,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.evidence.gateECertification).toBeNull();
    expect(result.evidence.reasonCodes).toContain(
      "TRACK_B_RELEASE_GATE_E_CERTIFICATION_UNAVAILABLE",
    );
    expect(result.validation.status).toBe("MISMATCH");
  });

  it("blocks when field-by-field registration provenance cannot be rederived", async () => {
    verifyProvenance.mockRejectedValueOnce(new Error("GATE_E_MANIFEST_INTEGRITY_INVALID"));

    const result = await runTrackBReleaseCandidateEvidenceCli({
      activationReleaseRevision,
      git: sourceReader,
      evidenceStore,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.evidence.registrationProvenance).toBeNull();
    expect(result.evidence.reasonCodes).toContain(
      "TRACK_B_RELEASE_REGISTRATION_REDERIVATION_UNAVAILABLE",
    );
  });
});
