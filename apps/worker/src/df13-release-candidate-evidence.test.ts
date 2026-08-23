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

const activationReleaseRevision = "a".repeat(40);
const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function readSourceFile(path: string): Promise<string> {
  return readFile(resolve(sourceRoot, path), "utf8");
}

function gitBlobOid(content: string): string {
  return createHash("sha1")
    .update(
      "blob " + Buffer.byteLength(content, "utf8") + String.fromCharCode(0) + content,
      "utf8",
    )
    .digest("hex");
}

const sourceReader: GateECandidateSourceReader = {
  readBlob: async (_revision, path) => readSourceFile(path),
  resolveBlobOid: async (_revision, path) => gitBlobOid(await readSourceFile(path)),
};

async function exactSourceEvidence(): Promise<Df13ReleaseCandidateEvidence> {
  return prepareDf13ReleaseCandidateEvidence({
    activationReleaseRevision,
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
  it("re-derives the exact Gate E projection without claiming runtime activation", async () => {
    const evidence = await exactSourceEvidence();

    expect(evidence).toMatchObject({
      contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1",
      status: "SOURCE_READY_NO_ACTIVATION",
      sideEffects: "NOT_EXECUTED",
      activationReleaseRevision,
      gateE: {
        manifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
        evidenceBodyHash: GATE_E_PREPROD_V15_BINDING.evidenceBodyHash,
        finalizationHash: GATE_E_PREPROD_V15_BINDING.finalizationHash,
        evidenceAdmissibility: "FINALIZED_TRUSTED_EXACT_HEAD",
        durableStoreStatus: "APPENDED",
      },
      candidateProjection: {
        candidateSourceRevision: activationReleaseRevision,
        contentFingerprint: GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint,
      },
      rollback: {
        contractVersion: "DF13_COMPLETE_LEGACY_ROLLBACK_EVIDENCE_V1",
        target: "EXACT_PRE_CUTOVER_LEGACY_POINTER",
        status: "REQUIRED_NOT_EXECUTED",
      },
    });
    expect(evidence.reasonCodes).toEqual([]);
    expect(evidence.fieldComparisons.every(({ matches }) => matches)).toBe(true);
    expect(evidence.evidenceHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("runtime-freezes the full evidence package rather than only its top level", async () => {
    const evidence = await exactSourceEvidence();

    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.gateE)).toBe(true);
    expect(Object.isFrozen(evidence.fieldComparisons)).toBe(true);
    expect(Object.isFrozen(evidence.fieldComparisons[0])).toBe(true);
    expect(Object.isFrozen(evidence.candidateProjection)).toBe(true);
    expect(Object.isFrozen(evidence.candidateProjection?.entries)).toBe(true);
    expect(Object.isFrozen(evidence.rollback)).toBe(true);
  });

  it("fails closed when the release revision is malformed", async () => {
    await expect(prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision: "not-a-commit",
      git: sourceReader,
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_ACTIVATION_RELEASE_REVISION_INVALID"],
    });
  });

  it("rejects self-hash substitution and rollback-contract substitution", async () => {
    const exact = await exactSourceEvidence();
    const request = {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision,
    };

    expect(validateDf13ReleaseCandidateEvidence({
      ...exact,
      evidenceHash: "f".repeat(64),
    }, request)).toMatchObject({
      status: "MISMATCH",
      reasonCodes: expect.arrayContaining(["DF13_RELEASE_EVIDENCE_HASH_INVALID"]),
    });

    const { evidenceHash: _evidenceHash, ...body } = exact;
    const substituted = withEvidenceHash({
      ...body,
      rollback: {
        ...body.rollback,
        target: "ANY_LEGACY_POINTER" as never,
      },
    });
    expect(validateDf13ReleaseCandidateEvidence(substituted, request)).toMatchObject({
      status: "MISMATCH",
      reasonCodes: expect.arrayContaining([
        "DF13_RELEASE_EVIDENCE_ROLLBACK_CONTRACT_INVALID",
      ]),
    });
  });

  it("rejects a substituted manifest field even when the package self-hash is recomputed", async () => {
    const { evidenceHash: _evidenceHash, ...body } = await exactSourceEvidence();
    const substituted = withEvidenceHash({
      ...body,
      fieldComparisons: body.fieldComparisons.map((comparison) =>
        comparison.field === "modelId"
          ? { ...comparison, observed: "substituted-model", matches: false }
          : comparison
      ),
    });

    expect(validateDf13ReleaseCandidateEvidence(substituted, {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision,
    })).toMatchObject({
      status: "MISMATCH",
      reasonCodes: expect.arrayContaining([
        "DF13_RELEASE_EVIDENCE_MANIFEST_COMPARISON_INVALID",
      ]),
    });
  });
});
