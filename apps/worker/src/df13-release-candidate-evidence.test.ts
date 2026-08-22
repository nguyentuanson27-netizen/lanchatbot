import { describe, expect, it } from "vitest";
import { createGateEScoredRunGitReader } from "./gate-e-git-reader.js";
import {
  GATE_E_PREPROD_V15_BINDING,
  GATE_E_PREPROD_V15_MANIFEST_PATH,
  prepareDf13ReleaseCandidateEvidence,
} from "./df13-release-candidate-evidence.js";

describe("DF13 release-candidate source evidence", () => {
  it("re-derives the Gate E projection from the candidate source and records no activation", async () => {
    const git = createGateEScoredRunGitReader({ cwd: process.cwd() });
    const sourceRevision = await git.resolveRef("HEAD");

    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: sourceRevision,
      git,
    });

    expect(evidence).toMatchObject({
      contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1",
      status: "SOURCE_READY_NO_ACTIVATION",
      sideEffects: "NOT_EXECUTED",
      activationReleaseRevision: sourceRevision,
      gateE: {
        manifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
        evidenceBodyHash: GATE_E_PREPROD_V15_BINDING.evidenceBodyHash,
        finalizationHash: GATE_E_PREPROD_V15_BINDING.finalizationHash,
        evidenceAdmissibility: "FINALIZED_TRUSTED_EXACT_HEAD",
        durableStoreStatus: "APPENDED",
        candidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
        candidateContentFingerprint:
          GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint,
      },
      candidateProjection: {
        candidateSourceRevision: sourceRevision,
        contentFingerprint: GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint,
      },
      rollback: { status: "REQUIRED_NOT_EXECUTED" },
    });
    expect(evidence.fieldComparisons.every(({ matches }) => matches)).toBe(true);
    expect(evidence.candidateProjection).not.toBeNull();
    expect(evidence.candidateProjection!.entries.length).toBeGreaterThan(1);
    expect(evidence.evidenceHash).toMatch(/^[a-f0-9]{64}$/u);
  }, 20_000);

  it("fails closed when the release source revision is malformed", async () => {
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: "not-a-commit",
      git: createGateEScoredRunGitReader({ cwd: process.cwd() }),
    });

    expect(evidence).toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_ACTIVATION_RELEASE_REVISION_INVALID"],
    });
  });

  it("fails closed when the Gate E manifest field binding differs", async () => {
    const sourceGit = createGateEScoredRunGitReader({ cwd: process.cwd() });
    const sourceRevision = await sourceGit.resolveRef("HEAD");
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: sourceRevision,
      git: {
        async readBlob(commit, path) {
          const content = await sourceGit.readBlob(commit, path);
          if (path !== GATE_E_PREPROD_V15_MANIFEST_PATH) return content;
          const manifest = JSON.parse(content) as Record<string, unknown>;
          return JSON.stringify({
            ...manifest,
            modelId: "substituted-model",
          });
        },
        resolveBlobOid: sourceGit.resolveBlobOid.bind(sourceGit),
      },
    });

    expect(evidence).toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: expect.arrayContaining([
        "DF13_GATE_E_MANIFEST_FIELD_MISMATCH",
      ]),
    });
    expect(evidence.fieldComparisons.find(({ field }) => field === "modelId"))
      .toMatchObject({ matches: false });
  }, 20_000);
});
