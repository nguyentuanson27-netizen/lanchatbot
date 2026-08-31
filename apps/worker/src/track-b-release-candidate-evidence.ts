import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  deriveGateECandidateContentFingerprint,
  GATE_E_CANDIDATE_SOURCE_PATHS_V1,
  type GateECandidateSourceReader,
} from "./gate-e-registration.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import { TRACK_B_GATE_E_V22_BINDING } from "./df13-gate-e-binding.js";

export const TRACK_B_GATE_E_V22_MANIFEST_PATH =
  "evaluation/gate-e/track-b-v22/manifest.json" as const;
export const TRACK_B_TRUSTED_RELEASE_REF = "refs/remotes/origin/main" as const;
export const TRACK_B_REQUIRED_MIGRATION_ARTIFACTS = Object.freeze([
  Object.freeze({
    path: "packages/database/pending-migrations/0037_track_b_commerce_authority_replacement.up.sql",
    contentSha256: "40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20",
  }),
  Object.freeze({
    path: "packages/database/pending-migrations/0037_track_b_commerce_authority_replacement.down.sql",
    contentSha256: "6b01671bca2a9dcb570ec8cf3efff065991e0457539cd834f0d7cd1a0acc23d5",
  }),
] as const);

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const OBJECT_PATTERN = /^[a-f0-9]{40,64}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export interface TrackBReleaseCandidateSourceReader extends GateECandidateSourceReader {
  refreshTrustedRef(): Promise<void>;
  resolveRef(ref: typeof TRACK_B_TRUSTED_RELEASE_REF): Promise<string>;
  resolveTreeOid(commit: string): Promise<string>;
}

export type TrackBReleaseCandidateEvidence = Readonly<{
  schemaVersion: 1;
  contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1";
  status: "SOURCE_READY_NO_ACTIVATION" | "BLOCKED";
  sideEffects: "NOT_EXECUTED";
  activationReleaseRevision: string;
  releaseSource: Readonly<{
    trustedRef: typeof TRACK_B_TRUSTED_RELEASE_REF;
    resolvedRevision: string | null;
    treeOid: string | null;
  }>;
  gateE: typeof TRACK_B_GATE_E_V22_BINDING;
  manifestArtifact: Readonly<{
    path: typeof TRACK_B_GATE_E_V22_MANIFEST_PATH;
    blobOid: string | null;
    contentSha256: string | null;
  }>;
  candidateProjection: Awaited<ReturnType<typeof deriveGateECandidateContentFingerprint>> | null;
  candidateContentFingerprint: string | null;
  migration: Readonly<{
    contractVersion: "TRACK_B_REQUIRED_MIGRATION_V1";
    status: "PENDING_SEPARATE_AUTHORIZATION";
    artifacts: readonly Readonly<{
      path: typeof TRACK_B_REQUIRED_MIGRATION_ARTIFACTS[number]["path"];
      blobOid: string;
      contentSha256: string;
    }>[];
  }>;
  authorityMutation: Readonly<{
    previousBundleHash: string;
    targetBundleHash: string;
    consumers: readonly string[];
    authorityIndependentBypassClasses: readonly [];
  }>;
  reasonCodes: readonly string[];
  evidenceHash: string;
}>;

export type TrackBReleaseCandidateEvidenceValidation =
  | Readonly<{ status: "MATCHED"; reasonCodes: readonly [] }>
  | Readonly<{ status: "MISMATCH"; reasonCodes: readonly string[] }>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function same(left: unknown, right: unknown): boolean {
  return canonicalJsonV1(left) === canonicalJsonV1(right);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return Object.freeze(value);
}

function buildEvidence(
  input: Omit<TrackBReleaseCandidateEvidence, "evidenceHash">,
): TrackBReleaseCandidateEvidence {
  return deepFreeze({ ...input, evidenceHash: sha256(canonicalJsonV1(input)) });
}

function baseEvidence(activationReleaseRevision: string): Omit<
  TrackBReleaseCandidateEvidence,
  "evidenceHash"
> {
  return {
    schemaVersion: 1,
    contractVersion: "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1",
    status: "BLOCKED",
    sideEffects: "NOT_EXECUTED",
    activationReleaseRevision,
    releaseSource: {
      trustedRef: TRACK_B_TRUSTED_RELEASE_REF,
      resolvedRevision: null,
      treeOid: null,
    },
    gateE: TRACK_B_GATE_E_V22_BINDING,
    manifestArtifact: {
      path: TRACK_B_GATE_E_V22_MANIFEST_PATH,
      blobOid: null,
      contentSha256: null,
    },
    candidateProjection: null,
    candidateContentFingerprint: null,
    migration: {
      contractVersion: "TRACK_B_REQUIRED_MIGRATION_V1",
      status: "PENDING_SEPARATE_AUTHORIZATION",
      artifacts: [],
    },
    authorityMutation: {
      previousBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      targetBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
      authorityIndependentBypassClasses: [],
    },
    reasonCodes: [],
  };
}

export function validateTrackBReleaseCandidateEvidence(
  evidence: TrackBReleaseCandidateEvidence,
  request: Readonly<{ activationReleaseRevision: string }>,
): TrackBReleaseCandidateEvidenceValidation {
  const reasonCodes: string[] = [];
  try {
    const { evidenceHash, ...body } = evidence;
    if (!SHA256_PATTERN.test(evidenceHash) || evidenceHash !== sha256(canonicalJsonV1(body))) {
      reasonCodes.push("TRACK_B_RELEASE_EVIDENCE_HASH_INVALID");
    }
    if (
      evidence.schemaVersion !== 1 ||
      evidence.contractVersion !== "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1" ||
      evidence.status !== "SOURCE_READY_NO_ACTIVATION" ||
      evidence.sideEffects !== "NOT_EXECUTED" ||
      evidence.reasonCodes.length !== 0
    ) reasonCodes.push("TRACK_B_RELEASE_EVIDENCE_STATUS_INVALID");
    if (
      request.activationReleaseRevision !== evidence.activationReleaseRevision ||
      !COMMIT_PATTERN.test(request.activationReleaseRevision) ||
      evidence.releaseSource.trustedRef !== TRACK_B_TRUSTED_RELEASE_REF ||
      evidence.releaseSource.resolvedRevision !== request.activationReleaseRevision ||
      !OBJECT_PATTERN.test(evidence.releaseSource.treeOid ?? "")
    ) reasonCodes.push("TRACK_B_RELEASE_SOURCE_INVALID");
    if (!same(evidence.gateE, TRACK_B_GATE_E_V22_BINDING)) {
      reasonCodes.push("TRACK_B_RELEASE_GATE_E_BINDING_INVALID");
    }
    if (
      evidence.manifestArtifact.path !== TRACK_B_GATE_E_V22_MANIFEST_PATH ||
      evidence.manifestArtifact.blobOid !== TRACK_B_GATE_E_V22_BINDING.manifestBlobOid ||
      evidence.manifestArtifact.contentSha256 !== TRACK_B_GATE_E_V22_BINDING.manifestContentSha256 ||
      evidence.candidateContentFingerprint !== TRACK_B_GATE_E_V22_BINDING.candidateContentFingerprint
    ) reasonCodes.push("TRACK_B_RELEASE_CANDIDATE_IDENTITY_INVALID");
    const projection = evidence.candidateProjection;
    if (
      projection === null ||
      projection.schemaVersion !== 1 ||
      projection.contractVersion !== "DF10_GATE_E_CANDIDATE_CONTENT_FINGERPRINT_V1" ||
      projection.candidateSourceRevision !== request.activationReleaseRevision ||
      projection.entries.length !== GATE_E_CANDIDATE_SOURCE_PATHS_V1.length ||
      projection.entries.some((entry, index) =>
        entry.path !== GATE_E_CANDIDATE_SOURCE_PATHS_V1[index] ||
        !OBJECT_PATTERN.test(entry.blobOid) ||
        !SHA256_PATTERN.test(entry.contentSha256)
      ) ||
      projection.contentFingerprint !== sha256(canonicalJsonV1(projection.entries)) ||
      projection.contentFingerprint !== TRACK_B_GATE_E_V22_BINDING.candidateContentFingerprint ||
      evidence.candidateContentFingerprint !== projection.contentFingerprint
    ) reasonCodes.push("TRACK_B_RELEASE_CANDIDATE_PROJECTION_INVALID");
    if (
      evidence.authorityMutation.previousBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash ||
      evidence.authorityMutation.targetBundleHash !== DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash ||
      !same(evidence.authorityMutation.consumers, DF13_COMMERCE_AUTHORITY_CONSUMERS_V1) ||
      evidence.authorityMutation.authorityIndependentBypassClasses.length !== 0
    ) reasonCodes.push("TRACK_B_RELEASE_AUTHORITY_MUTATION_INVALID");
    if (
      evidence.migration.contractVersion !== "TRACK_B_REQUIRED_MIGRATION_V1" ||
      evidence.migration.status !== "PENDING_SEPARATE_AUTHORIZATION" ||
      evidence.migration.artifacts.length !== TRACK_B_REQUIRED_MIGRATION_ARTIFACTS.length ||
      evidence.migration.artifacts.some((artifact, index) =>
        artifact.path !== TRACK_B_REQUIRED_MIGRATION_ARTIFACTS[index]?.path ||
        !OBJECT_PATTERN.test(artifact.blobOid) ||
        artifact.contentSha256 !== TRACK_B_REQUIRED_MIGRATION_ARTIFACTS[index]?.contentSha256
      )
    ) reasonCodes.push("TRACK_B_RELEASE_MIGRATION_IDENTITY_INVALID");
  } catch {
    return { status: "MISMATCH", reasonCodes: ["TRACK_B_RELEASE_EVIDENCE_MALFORMED"] };
  }
  return reasonCodes.length === 0
    ? { status: "MATCHED", reasonCodes: [] }
    : { status: "MISMATCH", reasonCodes };
}

/** Re-derives the immutable release packet from refreshed origin/main. */
export async function prepareTrackBReleaseCandidateEvidence(input: Readonly<{
  activationReleaseRevision: string;
  git: TrackBReleaseCandidateSourceReader;
}>): Promise<TrackBReleaseCandidateEvidence> {
  const base = baseEvidence(input.activationReleaseRevision);
  const reasonCodes: string[] = [];
  if (!COMMIT_PATTERN.test(input.activationReleaseRevision)) {
    return buildEvidence({ ...base, reasonCodes: ["TRACK_B_RELEASE_REVISION_INVALID"] });
  }
  let trustedRevision: string | null = null;
  let treeOid: string | null = null;
  try {
    await input.git.refreshTrustedRef();
    trustedRevision = await input.git.resolveRef(TRACK_B_TRUSTED_RELEASE_REF);
    if (trustedRevision === input.activationReleaseRevision) {
      treeOid = await input.git.resolveTreeOid(input.activationReleaseRevision);
    }
  } catch {
    reasonCodes.push("TRACK_B_RELEASE_TRUSTED_SOURCE_UNAVAILABLE");
  }
  if (trustedRevision !== input.activationReleaseRevision || !OBJECT_PATTERN.test(treeOid ?? "")) {
    reasonCodes.push("TRACK_B_RELEASE_NOT_EXACT_TRUSTED_HEAD");
  }
  let manifestBlobOid: string | null = null;
  let manifestContentSha256: string | null = null;
  try {
    const [text, oid] = await Promise.all([
      input.git.readBlob(input.activationReleaseRevision, TRACK_B_GATE_E_V22_MANIFEST_PATH),
      input.git.resolveBlobOid(input.activationReleaseRevision, TRACK_B_GATE_E_V22_MANIFEST_PATH),
    ]);
    manifestBlobOid = oid;
    manifestContentSha256 = sha256(text);
  } catch {
    reasonCodes.push("TRACK_B_RELEASE_MANIFEST_UNAVAILABLE");
  }
  if (
    manifestBlobOid !== TRACK_B_GATE_E_V22_BINDING.manifestBlobOid ||
    manifestContentSha256 !== TRACK_B_GATE_E_V22_BINDING.manifestContentSha256
  ) reasonCodes.push("TRACK_B_RELEASE_MANIFEST_IDENTITY_MISMATCH");
  let candidateProjection: Awaited<ReturnType<
    typeof deriveGateECandidateContentFingerprint
  >> | null = null;
  let candidateContentFingerprint: string | null = null;
  try {
    candidateProjection = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision: input.activationReleaseRevision,
      git: input.git,
    });
    candidateContentFingerprint = candidateProjection.contentFingerprint;
  } catch {
    reasonCodes.push("TRACK_B_RELEASE_CANDIDATE_REDERIVATION_UNAVAILABLE");
  }
  if (candidateContentFingerprint !== TRACK_B_GATE_E_V22_BINDING.candidateContentFingerprint) {
    reasonCodes.push("TRACK_B_RELEASE_CANDIDATE_FINGERPRINT_MISMATCH");
  }
  const migrationArtifacts: Array<TrackBReleaseCandidateEvidence["migration"]["artifacts"][number]> = [];
  for (const expected of TRACK_B_REQUIRED_MIGRATION_ARTIFACTS) {
    try {
      const [content, blobOid] = await Promise.all([
        input.git.readBlob(input.activationReleaseRevision, expected.path),
        input.git.resolveBlobOid(input.activationReleaseRevision, expected.path),
      ]);
      const contentSha256 = sha256(content);
      if (!OBJECT_PATTERN.test(blobOid) || contentSha256 !== expected.contentSha256) {
        reasonCodes.push("TRACK_B_RELEASE_MIGRATION_IDENTITY_MISMATCH");
      } else {
        migrationArtifacts.push({ path: expected.path, blobOid, contentSha256 });
      }
    } catch {
      reasonCodes.push("TRACK_B_RELEASE_MIGRATION_UNAVAILABLE");
    }
  }
  try {
    const finalTrustedRevision = await input.git.resolveRef(TRACK_B_TRUSTED_RELEASE_REF);
    if (finalTrustedRevision !== trustedRevision || finalTrustedRevision !== input.activationReleaseRevision) {
      reasonCodes.push("TRACK_B_RELEASE_TRUSTED_REF_CHANGED");
    }
  } catch {
    reasonCodes.push("TRACK_B_RELEASE_TRUSTED_SOURCE_UNAVAILABLE");
  }
  return buildEvidence({
    ...base,
    status: reasonCodes.length === 0 ? "SOURCE_READY_NO_ACTIVATION" : "BLOCKED",
    releaseSource: {
      trustedRef: TRACK_B_TRUSTED_RELEASE_REF,
      resolvedRevision: trustedRevision,
      treeOid,
    },
    manifestArtifact: {
      path: TRACK_B_GATE_E_V22_MANIFEST_PATH,
      blobOid: manifestBlobOid,
      contentSha256: manifestContentSha256,
    },
    candidateProjection,
    candidateContentFingerprint,
    migration: {
      contractVersion: "TRACK_B_REQUIRED_MIGRATION_V1",
      status: "PENDING_SEPARATE_AUTHORIZATION",
      artifacts: migrationArtifacts,
    },
    reasonCodes,
  });
}
