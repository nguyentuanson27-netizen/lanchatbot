import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  deriveGateECandidateContentFingerprint,
  GATE_E_CANDIDATE_SOURCE_PATHS_V1,
  verifyGateERegistrationProvenance,
  verifyStoredGateEEvidenceCertification,
  type GateEEvidenceReaderV2,
  type GateECandidateSourceReader,
  type GateEGitEvidenceReader,
} from "./gate-e-registration.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import { TRACK_B_GATE_E_V22_BINDING } from "./df13-gate-e-binding.js";

export const TRACK_B_GATE_E_V22_MANIFEST_PATH =
  "evaluation/gate-e/track-b-v22/manifest.json" as const;
export const TRACK_B_GATE_E_V22_REGISTRATION_PATH =
  "evaluation/gate-e/track-b-v22/registration.json" as const;
export const TRACK_B_TRUSTED_RELEASE_REF = "refs/remotes/origin/main" as const;
export const TRACK_B_REQUIRED_MIGRATION_ARTIFACTS = Object.freeze([
  Object.freeze({
    path: "packages/database/pending-migrations/0037_track_b_commerce_authority_replacement.up.sql",
    contentSha256: "40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20",
  }),
  Object.freeze({
    path: "packages/database/pending-migrations/0037_track_b_commerce_authority_replacement.down.sql",
    contentSha256: "c5b2ea232bf586aeaf1e034c017dbf1d002fda904c4c4e3ebd9daace4ae73ce3",
  }),
] as const);

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const OBJECT_PATTERN = /^[a-f0-9]{40,64}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const TRACK_B_GATE_E_V22_MANIFEST_FIELDS = Object.freeze({
  candidateSourceRevision: TRACK_B_GATE_E_V22_BINDING.candidateSourceRevision,
  candidateContentFingerprint: TRACK_B_GATE_E_V22_BINDING.candidateContentFingerprint,
  manifestHash: TRACK_B_GATE_E_V22_BINDING.manifestHash,
  modelId: "gemini-3.5-flash-lite",
  providerModelVersion: "gemini-3.5-flash-lite",
  providerObservationHash: "a9b8d35f07802754fd228d7dd0fb262bbf689467618fe05d43bd34cc9a70f091",
  corpusHash: "e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd",
  rubricHash: "89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986",
  planArtifactHash: "45c8e53bf0c260d23f6a62f7ec630794042360e911324874a16afbf469edcea3",
  interpreterPolicyHash: "50575db31121ec72839cda10a2bd1bf50f1e0aa86c77c587af6e05e7267c72e3",
  firstRequestEnvelopeHash: "5758574b2dfdf1b8b88db65ecee858780fb5ceeb50d7f997cd1c1418a720a9af",
});

type ManifestFieldComparison = Readonly<{
  field: keyof typeof TRACK_B_GATE_E_V22_MANIFEST_FIELDS;
  expected: string;
  observed: string | null;
  matches: boolean;
}>;

export interface TrackBReleaseCandidateSourceReader extends GateECandidateSourceReader, GateEGitEvidenceReader {
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
  manifestFieldComparisons: readonly ManifestFieldComparison[];
  gateECertification: Readonly<{
    status: "VERIFIED_DURABLE";
    populationAnchorHash: string;
    evidenceBodyHash: string;
    finalizationHash: string;
    bodyAdmittedAt: string;
    finalizationAdmittedAt: string;
  }> | null;
  registrationProvenance: Awaited<ReturnType<typeof verifyGateERegistrationProvenance>> | null;
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
    manifestFieldComparisons: [],
    gateECertification: null,
    registrationProvenance: null,
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
    if (
      evidence.manifestFieldComparisons.length !== Object.keys(TRACK_B_GATE_E_V22_MANIFEST_FIELDS).length ||
      new Set(evidence.manifestFieldComparisons.map(({ field }) => field)).size !==
        Object.keys(TRACK_B_GATE_E_V22_MANIFEST_FIELDS).length ||
      evidence.manifestFieldComparisons.some((comparison) =>
        TRACK_B_GATE_E_V22_MANIFEST_FIELDS[comparison.field] !== comparison.expected ||
        comparison.observed !== comparison.expected ||
        comparison.matches !== true
      )
    ) reasonCodes.push("TRACK_B_RELEASE_MANIFEST_FIELDS_INVALID");
    if (
      evidence.gateECertification === null ||
      evidence.gateECertification.status !== "VERIFIED_DURABLE" ||
      evidence.gateECertification.populationAnchorHash !== TRACK_B_GATE_E_V22_BINDING.populationAnchorHash ||
      evidence.gateECertification.evidenceBodyHash !== TRACK_B_GATE_E_V22_BINDING.evidenceBodyHash ||
      evidence.gateECertification.finalizationHash !== TRACK_B_GATE_E_V22_BINDING.finalizationHash ||
      !Number.isFinite(Date.parse(evidence.gateECertification.bodyAdmittedAt)) ||
      !Number.isFinite(Date.parse(evidence.gateECertification.finalizationAdmittedAt)) ||
      Date.parse(evidence.gateECertification.bodyAdmittedAt) >
        Date.parse(evidence.gateECertification.finalizationAdmittedAt)
    ) reasonCodes.push("TRACK_B_RELEASE_GATE_E_CERTIFICATION_INVALID");
    if (
      evidence.registrationProvenance === null ||
      evidence.registrationProvenance.disposition !== "REGISTRATION_PROVENANCE_VERIFIED" ||
      evidence.registrationProvenance.manifestHash !== TRACK_B_GATE_E_V22_BINDING.manifestHash ||
      !OBJECT_PATTERN.test(evidence.registrationProvenance.registrationBlobOid) ||
      !COMMIT_PATTERN.test(evidence.registrationProvenance.registrationCommit) ||
      evidence.registrationProvenance.scoredRunRevision !== request.activationReleaseRevision ||
      !Number.isFinite(Date.parse(evidence.registrationProvenance.registrationCommitTime)) ||
      !Number.isFinite(Date.parse(evidence.registrationProvenance.scoredRunStartedAt)) ||
      Date.parse(evidence.registrationProvenance.registrationCommitTime) >
        Date.parse(evidence.registrationProvenance.scoredRunStartedAt)
    ) reasonCodes.push("TRACK_B_RELEASE_REGISTRATION_PROVENANCE_INVALID");
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
  evidenceStore: GateEEvidenceReaderV2;
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
  let manifestFieldComparisons: readonly ManifestFieldComparison[] = [];
  try {
    const [text, oid] = await Promise.all([
      input.git.readBlob(input.activationReleaseRevision, TRACK_B_GATE_E_V22_MANIFEST_PATH),
      input.git.resolveBlobOid(input.activationReleaseRevision, TRACK_B_GATE_E_V22_MANIFEST_PATH),
    ]);
    manifestBlobOid = oid;
    manifestContentSha256 = sha256(text);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const { manifestHash: parsedManifestHash, ...manifestBody } = parsed;
    if (parsedManifestHash !== sha256(canonicalJsonV1(manifestBody))) {
      reasonCodes.push("TRACK_B_RELEASE_MANIFEST_SELF_HASH_INVALID");
    }
    const interpreter = parsed.interpreterRegistration as Record<string, unknown> | undefined;
    const requests = parsed.requests as readonly Record<string, unknown>[] | undefined;
    const requestIdentity = requests?.[0]?.requestIdentity as Record<string, unknown> | undefined;
    const observed: Record<keyof typeof TRACK_B_GATE_E_V22_MANIFEST_FIELDS, unknown> = {
      candidateSourceRevision: parsed.candidateSourceRevision,
      candidateContentFingerprint: parsed.candidateContentFingerprint,
      manifestHash: parsed.manifestHash,
      modelId: parsed.modelId,
      providerModelVersion: parsed.providerModelVersion,
      providerObservationHash: parsed.providerObservationHash,
      corpusHash: parsed.corpusHash,
      rubricHash: parsed.rubricHash,
      planArtifactHash: parsed.planArtifactHash,
      interpreterPolicyHash: interpreter?.policyHash,
      firstRequestEnvelopeHash: requestIdentity?.requestEnvelopeHash,
    };
    manifestFieldComparisons = Object.entries(TRACK_B_GATE_E_V22_MANIFEST_FIELDS).map(
      ([field, expected]) => {
        const value = observed[field as keyof typeof observed];
        return Object.freeze({
          field: field as keyof typeof TRACK_B_GATE_E_V22_MANIFEST_FIELDS,
          expected,
          observed: typeof value === "string" ? value : null,
          matches: value === expected,
        });
      },
    );
    if (manifestFieldComparisons.some((comparison) => !comparison.matches)) {
      reasonCodes.push("TRACK_B_RELEASE_MANIFEST_FIELDS_MISMATCH");
    }
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
  let gateECertification: TrackBReleaseCandidateEvidence["gateECertification"] = null;
  let registrationProvenance: TrackBReleaseCandidateEvidence["registrationProvenance"] = null;
  try {
    const scoredRunStartedAt = await input.git.commitTime(input.activationReleaseRevision);
    registrationProvenance = await verifyGateERegistrationProvenance({
      registrationPath: TRACK_B_GATE_E_V22_REGISTRATION_PATH,
      scoredRunRevision: input.activationReleaseRevision,
      scoredRunStartedAt,
      git: input.git,
    });
  } catch {
    reasonCodes.push("TRACK_B_RELEASE_REGISTRATION_REDERIVATION_UNAVAILABLE");
  }
  try {
    const certification = await verifyStoredGateEEvidenceCertification({
      populationAnchorHash: TRACK_B_GATE_E_V22_BINDING.populationAnchorHash,
      evidenceBodyHash: TRACK_B_GATE_E_V22_BINDING.evidenceBodyHash,
      finalizationHash: TRACK_B_GATE_E_V22_BINDING.finalizationHash,
      evidenceStore: input.evidenceStore,
    });
    gateECertification = {
      status: "VERIFIED_DURABLE",
      populationAnchorHash: TRACK_B_GATE_E_V22_BINDING.populationAnchorHash,
      evidenceBodyHash: certification.evidenceBodyHash,
      finalizationHash: certification.finalizationHash,
      bodyAdmittedAt: certification.bodyAdmittedAt,
      finalizationAdmittedAt: certification.finalizationAdmittedAt,
    };
  } catch {
    reasonCodes.push("TRACK_B_RELEASE_GATE_E_CERTIFICATION_UNAVAILABLE");
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
    manifestFieldComparisons,
    gateECertification,
    registrationProvenance,
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
