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
    manifestFieldComparisons: [
      ["candidateSourceRevision", "edb7971bd637ca02abde46d0ec4121e256e2023f"],
      ["candidateContentFingerprint", TRACK_B_GATE_E_V22_BINDING.candidateContentFingerprint],
      ["manifestHash", TRACK_B_GATE_E_V22_BINDING.manifestHash],
      ["modelId", "gemini-3.5-flash-lite"],
      ["providerModelVersion", "gemini-3.5-flash-lite"],
      ["providerObservationHash", "a9b8d35f07802754fd228d7dd0fb262bbf689467618fe05d43bd34cc9a70f091"],
      ["corpusHash", "e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd"],
      ["rubricHash", "89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986"],
      ["planArtifactHash", "45c8e53bf0c260d23f6a62f7ec630794042360e911324874a16afbf469edcea3"],
      ["interpreterPolicyHash", "50575db31121ec72839cda10a2bd1bf50f1e0aa86c77c587af6e05e7267c72e3"],
      ["firstRequestEnvelopeHash", "5758574b2dfdf1b8b88db65ecee858780fb5ceeb50d7f997cd1c1418a720a9af"],
    ].map(([field, expected]) => ({ field, expected, observed: expected, matches: true })) as
      unknown as TrackBReleaseCandidateEvidence["manifestFieldComparisons"],
    gateECertification: {
      status: "VERIFIED_DURABLE" as const,
      populationAnchorHash: TRACK_B_GATE_E_V22_BINDING.populationAnchorHash,
      evidenceBodyHash: TRACK_B_GATE_E_V22_BINDING.evidenceBodyHash,
      finalizationHash: TRACK_B_GATE_E_V22_BINDING.finalizationHash,
      bodyAdmittedAt: "2026-09-01T00:00:00.000Z",
      finalizationAdmittedAt: "2026-09-01T00:01:00.000Z",
    },
    registrationProvenance: {
      disposition: "REGISTRATION_PROVENANCE_VERIFIED" as const,
      registrationCommit: "d".repeat(40),
      registrationBlobOid: "e".repeat(40),
      manifestHash: TRACK_B_GATE_E_V22_BINDING.manifestHash,
      scoredRunRevision: activationReleaseRevision,
      registrationCommitTime: "2026-09-01T00:00:00.000Z",
      scoredRunStartedAt: "2026-09-01T00:02:00.000Z",
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
