import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it } from "vitest";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import { TRACK_B_GATE_E_V22_BINDING } from "./df13-gate-e-binding.js";
import { deriveGateECandidateContentFingerprint } from "./gate-e-registration.js";
import {
  validateTrackBReleaseCandidateEvidence,
  TRACK_B_REQUIRED_MIGRATION_ARTIFACTS,
  type TrackBReleaseCandidateEvidence,
} from "./track-b-release-candidate-evidence.js";

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJsonV1(value), "utf8").digest("hex");
}

const sourceRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function evidence(): Promise<TrackBReleaseCandidateEvidence> {
  const activationReleaseRevision = "c9e8d366c3cfa05a57c5dfc051605204f1154b89";
  const candidateProjection = await deriveGateECandidateContentFingerprint({
    candidateSourceRevision: activationReleaseRevision,
    git: {
      readBlob: async (_revision, path) => readFile(resolve(sourceRoot, path), "utf8"),
      resolveBlobOid: async (_revision, path) => {
        const content = await readFile(resolve(sourceRoot, path), "utf8");
        return createHash("sha1")
          .update(`blob ${Buffer.byteLength(content, "utf8")}\0${content}`, "utf8")
          .digest("hex");
      },
    },
  });
  const migrationArtifacts = await Promise.all(TRACK_B_REQUIRED_MIGRATION_ARTIFACTS.map(async (artifact) => {
    const content = await readFile(resolve(sourceRoot, artifact.path), "utf8");
    return {
      path: artifact.path,
      blobOid: createHash("sha1")
        .update(`blob ${Buffer.byteLength(content, "utf8")}\0${content}`, "utf8")
        .digest("hex"),
      contentSha256: createHash("sha256").update(content, "utf8").digest("hex"),
    };
  }));
  const body = {
    schemaVersion: 1 as const,
    contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1" as const,
    status: "SOURCE_READY_NO_ACTIVATION" as const,
    sideEffects: "NOT_EXECUTED" as const,
    activationReleaseRevision,
    releaseSource: {
      trustedRef: "refs/remotes/origin/main" as const,
      resolvedRevision: activationReleaseRevision,
      treeOid: "a".repeat(40),
    },
    gateE: TRACK_B_GATE_E_V22_BINDING,
    manifestArtifact: {
      path: "evaluation/gate-e/track-b-v22/manifest.json" as const,
      blobOid: TRACK_B_GATE_E_V22_BINDING.manifestBlobOid,
      contentSha256: TRACK_B_GATE_E_V22_BINDING.manifestContentSha256,
    },
    candidateProjection,
    candidateContentFingerprint: TRACK_B_GATE_E_V22_BINDING.candidateContentFingerprint,
    migration: {
      contractVersion: "TRACK_B_REQUIRED_MIGRATION_V1" as const,
      status: "PENDING_SEPARATE_AUTHORIZATION" as const,
      artifacts: migrationArtifacts,
    },
    authorityMutation: {
      previousBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      targetBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
      authorityIndependentBypassClasses: [] as readonly [],
    },
    reasonCodes: [] as readonly string[],
  };
  return { ...body, evidenceHash: hash(body) };
}

describe("Track B release candidate evidence", () => {
  it("binds final v22 evidence and the exact V1-to-V2 authority mutation", async () => {
    expect(validateTrackBReleaseCandidateEvidence(await evidence(), {
      activationReleaseRevision: "c9e8d366c3cfa05a57c5dfc051605204f1154b89",
    })).toEqual({ status: "MATCHED", reasonCodes: [] });
  });

  it("rejects copied evidence that substitutes the historical bundle as target", async () => {
    const valid = await evidence();
    const body = {
      ...valid,
      authorityMutation: {
        ...valid.authorityMutation,
        targetBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      },
    };
    const { evidenceHash: _discarded, ...withoutHash } = body;
    const copied = { ...withoutHash, evidenceHash: hash(withoutHash) } as TrackBReleaseCandidateEvidence;

    expect(validateTrackBReleaseCandidateEvidence(copied, {
      activationReleaseRevision: valid.activationReleaseRevision,
    })).toEqual({
      status: "MISMATCH",
      reasonCodes: ["TRACK_B_RELEASE_AUTHORITY_MUTATION_INVALID"],
    });
  });

  it("rejects a substituted 0037 artifact even when the evidence hash is recomputed", async () => {
    const valid = await evidence();
    const { evidenceHash: _discarded, ...body } = valid;
    const substitutedBody = {
      ...body,
      migration: {
        ...body.migration,
        artifacts: body.migration.artifacts.map((artifact, index) => index === 0
          ? { ...artifact, contentSha256: "f".repeat(64) }
          : artifact),
      },
    };
    const substituted = {
      ...substitutedBody,
      evidenceHash: hash(substitutedBody),
    } as TrackBReleaseCandidateEvidence;

    expect(validateTrackBReleaseCandidateEvidence(substituted, {
      activationReleaseRevision: valid.activationReleaseRevision,
    })).toEqual({
      status: "MISMATCH",
      reasonCodes: ["TRACK_B_RELEASE_MIGRATION_IDENTITY_INVALID"],
    });
  });
});
