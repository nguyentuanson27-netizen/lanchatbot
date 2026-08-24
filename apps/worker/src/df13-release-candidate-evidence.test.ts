import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import {
  GATE_E_PREPROD_V15_BINDING,
  prepareDf13ReleaseCandidateEvidence,
  validateDf13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateSourceReader,
} from "./df13-release-candidate-evidence.js";

const activationReleaseRevision = "a".repeat(40);
const activationReleaseTreeOid = "b".repeat(40);
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

const sourceReader: Df13ReleaseCandidateSourceReader = {
  async refreshTrustedRef() {},
  async resolveRef() { return activationReleaseRevision; },
  async resolveTreeOid() { return activationReleaseTreeOid; },
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
      releaseSource: {
        resolvedRevision: activationReleaseRevision,
        treeOid: activationReleaseTreeOid,
      },
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
      migration: {
        contractVersion: "DF13_PENDING_COMMERCE_MIGRATIONS_V2",
        status: "PENDING_NON_AUTO_APPLIED",
        artifacts: [
          {
            path: "packages/database/pending-migrations/0035_df13_commerce_behavior_mode.up.sql",
          },
          {
            path: "packages/database/pending-migrations/0035_df13_commerce_behavior_mode.down.sql",
          },
          {
            path: "packages/database/pending-migrations/0036_df13_commerce_authority_fence.up.sql",
          },
          {
            path: "packages/database/pending-migrations/0036_df13_commerce_authority_fence.down.sql",
          },
        ],
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
    expect(Object.isFrozen(evidence.migration)).toBe(true);
    expect(Object.isFrozen(evidence.migration.artifacts)).toBe(true);
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

  it("fails closed when the requested revision is not the refreshed trusted release head", async () => {
    await expect(prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision,
      git: {
        ...sourceReader,
        async resolveRef() { return "b".repeat(40); },
      },
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_ACTIVATION_RELEASE_NOT_TRUSTED_HEAD"],
    });
  });

  it("fails closed when the trusted release ref moves during evidence derivation", async () => {
    let refReads = 0;
    await expect(prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision,
      git: {
        ...sourceReader,
        async resolveRef() {
          refReads += 1;
          return refReads === 1 ? activationReleaseRevision : "b".repeat(40);
        },
      },
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_TRUSTED_RELEASE_REF_CHANGED"],
    });
  });

  it("fails closed when the trusted release tree cannot be re-derived", async () => {
    await expect(prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision,
      git: {
        ...sourceReader,
        async resolveTreeOid() { throw new Error("tree missing"); },
      },
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_RELEASE_TREE_UNAVAILABLE"],
    });
  });

  it("returns a manifest mismatch instead of throwing when a required field is missing", async () => {
    await expect(prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision,
      git: {
        ...sourceReader,
        async readBlob(revision, path) {
          const content = await sourceReader.readBlob(revision, path);
          if (path !== "evaluation/gate-e/df10-v15/manifest.json") return content;
          const manifest = JSON.parse(content) as Record<string, unknown>;
          delete manifest.corpusHash;
          return JSON.stringify(manifest);
        },
        async resolveBlobOid(revision, path) {
          const content = await this.readBlob(revision, path);
          return gitBlobOid(content);
        },
      },
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: [
        "DF13_GATE_E_MANIFEST_IDENTITY_MISMATCH",
        "DF13_GATE_E_MANIFEST_FIELD_MISMATCH",
      ],
    });
  });

  it("blocks a semantically identical manifest whose exact blob/content identity changed", async () => {
    await expect(prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision,
      git: {
        ...sourceReader,
        async readBlob(revision, path) {
          const content = await sourceReader.readBlob(revision, path);
          return path === "evaluation/gate-e/df10-v15/manifest.json"
            ? content + " "
            : content;
        },
        async resolveBlobOid(revision, path) {
          const content = await this.readBlob(revision, path);
          return gitBlobOid(content);
        },
      },
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: ["DF13_GATE_E_MANIFEST_IDENTITY_MISMATCH"],
    });
  });

  it("fails closed when any pending DF13 migration artifact cannot be re-derived", async () => {
    await expect(prepareDf13ReleaseCandidateEvidence({
      activationReleaseRevision,
      git: {
        ...sourceReader,
        async readBlob(revision, path) {
          if (path.startsWith("packages/database/pending-migrations/0036_")) {
            throw new Error("artifact missing");
          }
          return sourceReader.readBlob(revision, path);
        },
      },
    })).resolves.toMatchObject({
      status: "BLOCKED",
      sideEffects: "NOT_EXECUTED",
      reasonCodes: expect.arrayContaining([
        "DF13_PENDING_MIGRATION_ARTIFACT_UNAVAILABLE",
      ]),
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

  it("rejects substituted manifest blob identity even when hashes are well-shaped and self-hash is recomputed", async () => {
    const { evidenceHash: _evidenceHash, ...body } = await exactSourceEvidence();
    const substituted = withEvidenceHash({
      ...body,
      manifestArtifact: {
        ...body.manifestArtifact,
        blobOid: "f".repeat(40),
        contentSha256: "e".repeat(64),
      },
    });

    expect(validateDf13ReleaseCandidateEvidence(substituted, {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision,
    })).toMatchObject({
      status: "MISMATCH",
      reasonCodes: expect.arrayContaining([
        "DF13_RELEASE_EVIDENCE_MANIFEST_IDENTITY_INVALID",
      ]),
    });
  });

  it("rejects a substituted pending-migration identity even when the package self-hash is recomputed", async () => {
    const { evidenceHash: _evidenceHash, ...body } = await exactSourceEvidence();
    const substituted = withEvidenceHash({
      ...body,
      migration: {
        ...body.migration,
        artifacts: body.migration.artifacts.map((artifact, index) =>
          index === 0
            ? { ...artifact, blobOid: "f".repeat(40), contentSha256: "e".repeat(64) }
            : artifact
        ),
      },
    });

    expect(validateDf13ReleaseCandidateEvidence(substituted, {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision,
    })).toMatchObject({
      status: "MISMATCH",
      reasonCodes: expect.arrayContaining([
        "DF13_RELEASE_EVIDENCE_PENDING_MIGRATION_IDENTITY_INVALID",
      ]),
    });
  });

  it("returns MISMATCH instead of throwing for a malformed nested evidence object", async () => {
    const { evidenceHash: _evidenceHash, ...body } = await exactSourceEvidence();
    const malformed = withEvidenceHash({
      ...body,
      releaseSource: null as never,
    });

    expect(validateDf13ReleaseCandidateEvidence(malformed, {
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
      activationReleaseRevision,
    })).toEqual({
      status: "MISMATCH",
      reasonCodes: ["DF13_RELEASE_EVIDENCE_MALFORMED"],
    });
  });
});
