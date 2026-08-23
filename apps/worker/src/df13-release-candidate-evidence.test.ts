import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import type { GateECandidateSourceReader } from "./gate-e-registration.js";
import {
  GATE_E_PREPROD_V15_BINDING,
  prepareDf13ReleaseCandidateEvidence,
  validateDf13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateEvidence,
} from "./df13-release-candidate-evidence.js";

const sourceRevision = GATE_E_PREPROD_V15_BINDING.candidateSourceRevision;
const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function readSourceFile(path: string): Promise<string> {
  return readFile(resolve(sourceRoot, path), "utf8");
}

function assertCandidateRevision(revision: string): void {
  if (revision !== sourceRevision) {
    throw new Error("TEST_CANDIDATE_REVISION_UNEXPECTED");
  }
}

function gitBlobOid(content: string): string {
  return createHash("sha1")
    .update(
      "blob " + Buffer.byteLength(content, "utf8") +
        String.fromCharCode(0) + content,
      "utf8",
    )
    .digest("hex");
}

const sourceReader: GateECandidateSourceReader = {
  readBlob: async (revision, path) => {
    assertCandidateRevision(revision);
    return readSourceFile(path);
  },
  resolveBlobOid: async (revision, path) => {
    assertCandidateRevision(revision);
    return gitBlobOid(await readSourceFile(path));
  },
};

function exactSourceEvidence(): Promise<Df13ReleaseCandidateEvidence> {
  return prepareDf13ReleaseCandidateEvidence({
    activationReleaseRevision: sourceRevision,
    git: sourceReader,
  });
}

function withEvidenceHash(
  evidence: Omit<Df13ReleaseCandidateEvidence, "evidenceHash">,
): Df13ReleaseCandidateEvidence {
  return {
    ...evidence,
    evidenceHash: createHash("sha256")
      .update(canonicalJsonV1(evidence), "utf8")
      .digest("hex"),
  };
}

describe("DF13 release-candidate source evidence", () => {
  it("re-derives the immutable Gate E projection without creating an activation artifact", async () => {
    const evidence = await exactSourceEvidence();
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
    expect(evidence.reasonCodes).toEqual([]);
    expect(evidence.fieldComparisons.every(({ matches }) => matches)).toBe(true);
    expect(evidence.candidateProjection).not.toBeNull();
    expect(evidence.candidateProjection!.entries.length).toBeGreaterThan(1);
    expect(evidence.evidenceHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("fails closed when the release source revision is malformed", async () => {
    const evidence = await prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: "not-a-commit",
      git: sourceReader,
    });

    expect(evidence).toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_ACTIVATION_RELEASE_REVISION_INVALID"],
    });
  });

  it("fails closed when a source evidence package is self-hash substituted", async () => {
    const evidence = await exactSourceEvidence();
    const validation = validateDf13ReleaseCandidateEvidence({
      ...evidence,
      evidenceHash: "f".repeat(64),
    }, {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision:
        GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision: sourceRevision,
    });

    expect(validation.status).toBe("MISMATCH");
    expect(validation.reasonCodes).toContain("DF13_RELEASE_EVIDENCE_HASH_INVALID");
  });

  it("fails closed when an evidence manifest comparison is substituted", async () => {
    const { evidenceHash: _evidenceHash, ...body } = await exactSourceEvidence();
    const evidence = withEvidenceHash({
      ...body,
      fieldComparisons: body.fieldComparisons.map((comparison) =>
        comparison.field === "modelId"
          ? {
            ...comparison,
            observed: "substituted-model",
            matches: false,
          }
          : comparison
      ),
    });
    const validation = validateDf13ReleaseCandidateEvidence(evidence, {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision:
        GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision: sourceRevision,
    });

    expect(validation.status).toBe("MISMATCH");
    expect(validation.reasonCodes).toContain(
      "DF13_RELEASE_EVIDENCE_MANIFEST_COMPARISON_INVALID",
    );
  });
});
