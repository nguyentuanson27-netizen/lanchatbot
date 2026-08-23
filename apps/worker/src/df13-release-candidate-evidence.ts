import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  GATE_E_CANDIDATE_SOURCE_PATHS_V1,
  deriveGateECandidateContentFingerprint,
  type GateECandidateSourceReader,
} from "./gate-e-registration.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import { GATE_E_PREPROD_V15_BINDING } from "./df13-gate-e-binding.js";

export { GATE_E_PREPROD_V15_BINDING } from "./df13-gate-e-binding.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const BLOB_OID_PATTERN = /^[a-f0-9]{40,64}$/u;

export const GATE_E_PREPROD_V15_MANIFEST_PATH =
  "evaluation/gate-e/df10-v15/manifest.json" as const;

export const DF13_TRUSTED_RELEASE_REF = "refs/remotes/origin/main" as const;

export interface Df13ReleaseCandidateSourceReader extends GateECandidateSourceReader {
  refreshTrustedRef(): Promise<void>;
  resolveRef(ref: typeof DF13_TRUSTED_RELEASE_REF): Promise<string>;
}

const GATE_E_PREPROD_V15_MANIFEST_FIELDS = Object.freeze({
  schemaVersion: 1,
  contractVersion: "DF10_GATE_E_REGISTERED_MANIFEST_V1",
  registrationStatus: "REGISTERED_FOR_SCORING",
  draftManifestHash: "9464c861159e2625705a3130f44b363c9d530e4ec710ad20ff5ae0905efa0cf7",
  planArtifactHash: "45c8e53bf0c260d23f6a62f7ec630794042360e911324874a16afbf469edcea3",
  corpusHash: "e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd",
  rubricHash: "89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986",
  candidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
  candidateContentFingerprint: GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint,
  modelId: "gemini-3.5-flash-lite",
  providerModelVersion: "gemini-3.5-flash-lite",
  providerObservationHash: "88c438baafa17960f3ac43cdb4d452ce2d7ec106a3384a44120af8c5f4d20224",
  executionCaps: {
    concurrencyMaximum: 1,
    observationRequestMaximum: 1,
    pageScope: "OFFLINE_NO_PAGE",
    perRequestOutputTokenMaximum: 1_024,
    providerTimeoutMs: 30_000,
    runTimeoutMs: 900_000,
    scoredRequestMaximum: 51,
    sideEffects: "FORBIDDEN",
    totalOutputTokenMaximum: 32_768,
  },
});

type FieldComparison = Readonly<{
  field: string;
  expected: unknown;
  observed: unknown;
  matches: boolean;
}>;

const MISSING_MANIFEST_FIELD = Object.freeze({
  status: "MISSING_MANIFEST_FIELD" as const,
});

type CandidateProjection = Awaited<ReturnType<typeof deriveGateECandidateContentFingerprint>>;

export type Df13ReleaseCandidateEvidence = Readonly<{
  schemaVersion: 1;
  contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1";
  status: "SOURCE_READY_NO_ACTIVATION" | "BLOCKED";
  sideEffects: "NOT_EXECUTED";
  activationReleaseRevision: string;
  releaseSource: Readonly<{
    trustedRef: typeof DF13_TRUSTED_RELEASE_REF;
    resolvedRevision: string | null;
  }>;
  gateE: typeof GATE_E_PREPROD_V15_BINDING;
  manifestArtifact: Readonly<{
    path: typeof GATE_E_PREPROD_V15_MANIFEST_PATH;
    blobOid: string | null;
    contentSha256: string | null;
  }>;
  candidateProjection: CandidateProjection | null;
  fieldComparisons: readonly FieldComparison[];
  authorityConsumerContract: Readonly<{
    authorityBundleHash: string;
    consumers: readonly string[];
    authorityIndependentBypassClasses: readonly [];
  }>;
  rollback: Readonly<{
    contractVersion: "DF13_COMPLETE_LEGACY_ROLLBACK_EVIDENCE_V1";
    target: "EXACT_PRE_CUTOVER_LEGACY_POINTER";
    requiredConsumerConvergence: readonly string[];
    status: "REQUIRED_NOT_EXECUTED";
  }>;
  reasonCodes: readonly string[];
  evidenceHash: string;
}>;

export type Df13ReleaseCandidateEvidenceValidation =
  | Readonly<{ status: "MATCHED"; reasonCodes: readonly [] }>
  | Readonly<{ status: "MISMATCH"; reasonCodes: readonly string[] }>;

type Df13ReleaseCandidateEvidenceRequest = Readonly<{
  gateEManifestHash: string;
  gateECandidateSourceRevision: string;
  activationReleaseRevision: string;
}>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
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
  input: Omit<Df13ReleaseCandidateEvidence, "evidenceHash">,
): Df13ReleaseCandidateEvidence {
  return deepFreeze({
    ...input,
    evidenceHash: sha256(canonicalJsonV1(input)),
  });
}

function validateDf13ReleaseCandidateEvidenceUnchecked(
  evidence: Df13ReleaseCandidateEvidence,
  request: Df13ReleaseCandidateEvidenceRequest,
): Df13ReleaseCandidateEvidenceValidation {
  const reasonCodes: string[] = [];
  const { evidenceHash, ...evidenceBody } = evidence;
  if (!SHA256_PATTERN.test(evidenceHash) || evidenceHash !== sha256(canonicalJsonV1(evidenceBody))) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_HASH_INVALID");
  }
  if (
    evidence.schemaVersion !== 1 ||
    evidence.contractVersion !== "DF13_RELEASE_CANDIDATE_EVIDENCE_V1" ||
    evidence.status !== "SOURCE_READY_NO_ACTIVATION" ||
    evidence.sideEffects !== "NOT_EXECUTED" ||
    evidence.reasonCodes.length !== 0
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_STATUS_INVALID");
  }
  if (
    request.gateEManifestHash !== GATE_E_PREPROD_V15_BINDING.manifestHash ||
    request.gateECandidateSourceRevision !== GATE_E_PREPROD_V15_BINDING.candidateSourceRevision ||
    request.activationReleaseRevision !== evidence.activationReleaseRevision ||
    !COMMIT_PATTERN.test(request.activationReleaseRevision)
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_REQUEST_BINDING_INVALID");
  }
  if (
    evidence.releaseSource.trustedRef !== DF13_TRUSTED_RELEASE_REF ||
    evidence.releaseSource.resolvedRevision !== evidence.activationReleaseRevision
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_TRUSTED_SOURCE_INVALID");
  }
  if (!same(evidence.gateE, GATE_E_PREPROD_V15_BINDING)) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_GATE_E_BINDING_INVALID");
  }
  if (
    evidence.manifestArtifact.path !== GATE_E_PREPROD_V15_MANIFEST_PATH ||
    evidence.manifestArtifact.blobOid !== GATE_E_PREPROD_V15_BINDING.manifestBlobOid ||
    evidence.manifestArtifact.contentSha256 !==
      GATE_E_PREPROD_V15_BINDING.manifestContentSha256
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_MANIFEST_IDENTITY_INVALID");
  }

  const expectedManifestFields = new Map<string, unknown>([
    ...Object.entries(GATE_E_PREPROD_V15_MANIFEST_FIELDS),
    ["manifestHash", GATE_E_PREPROD_V15_BINDING.manifestHash],
  ]);
  const comparisons = new Map(
    evidence.fieldComparisons.map((comparison) => [comparison.field, comparison]),
  );
  if (
    comparisons.size !== expectedManifestFields.size ||
    evidence.fieldComparisons.length !== expectedManifestFields.size ||
    [...expectedManifestFields].some(([field, expected]) => {
      const comparison = comparisons.get(field);
      return !comparison || !comparison.matches ||
        !same(comparison.expected, expected) || !same(comparison.observed, expected);
    })
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_MANIFEST_COMPARISON_INVALID");
  }

  const projection = evidence.candidateProjection;
  if (
    projection === null ||
    projection.schemaVersion !== 1 ||
    projection.contractVersion !== "DF10_GATE_E_CANDIDATE_CONTENT_FINGERPRINT_V1" ||
    projection.candidateSourceRevision !== request.activationReleaseRevision ||
    projection.entries.length !== GATE_E_CANDIDATE_SOURCE_PATHS_V1.length ||
    projection.entries.some((entry, index) =>
      entry.path !== GATE_E_CANDIDATE_SOURCE_PATHS_V1[index] ||
      !BLOB_OID_PATTERN.test(entry.blobOid) ||
      !SHA256_PATTERN.test(entry.contentSha256)
    ) ||
    projection.contentFingerprint !== sha256(canonicalJsonV1(projection.entries)) ||
    projection.contentFingerprint !== GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_CANDIDATE_PROJECTION_INVALID");
  }
  if (
    evidence.authorityConsumerContract.authorityBundleHash !==
      DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash ||
    !same(evidence.authorityConsumerContract.consumers, DF13_COMMERCE_AUTHORITY_CONSUMERS_V1) ||
    evidence.authorityConsumerContract.authorityIndependentBypassClasses.length !== 0
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_AUTHORITY_BUNDLE_INVALID");
  }
  if (
    evidence.rollback.contractVersion !== "DF13_COMPLETE_LEGACY_ROLLBACK_EVIDENCE_V1" ||
    evidence.rollback.target !== "EXACT_PRE_CUTOVER_LEGACY_POINTER" ||
    !same(evidence.rollback.requiredConsumerConvergence, DF13_COMMERCE_AUTHORITY_CONSUMERS_V1) ||
    evidence.rollback.status !== "REQUIRED_NOT_EXECUTED"
  ) {
    reasonCodes.push("DF13_RELEASE_EVIDENCE_ROLLBACK_CONTRACT_INVALID");
  }
  return reasonCodes.length === 0
    ? { status: "MATCHED", reasonCodes: [] }
    : { status: "MISMATCH", reasonCodes };
}

export function validateDf13ReleaseCandidateEvidence(
  evidence: Df13ReleaseCandidateEvidence,
  request: Df13ReleaseCandidateEvidenceRequest,
): Df13ReleaseCandidateEvidenceValidation {
  try {
    return validateDf13ReleaseCandidateEvidenceUnchecked(evidence, request);
  } catch {
    return {
      status: "MISMATCH",
      reasonCodes: ["DF13_RELEASE_EVIDENCE_MALFORMED"],
    };
  }
}

function baseEvidence(
  activationReleaseRevision: string,
): Omit<Df13ReleaseCandidateEvidence, "status" | "reasonCodes" | "evidenceHash" | "fieldComparisons"> {
  return {
    schemaVersion: 1,
    contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1",
    sideEffects: "NOT_EXECUTED",
    activationReleaseRevision,
    releaseSource: {
      trustedRef: DF13_TRUSTED_RELEASE_REF,
      resolvedRevision: null,
    },
    gateE: GATE_E_PREPROD_V15_BINDING,
    manifestArtifact: {
      path: GATE_E_PREPROD_V15_MANIFEST_PATH,
      blobOid: null,
      contentSha256: null,
    },
    candidateProjection: null,
    authorityConsumerContract: {
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
      consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
      authorityIndependentBypassClasses: [],
    },
    rollback: {
      contractVersion: "DF13_COMPLETE_LEGACY_ROLLBACK_EVIDENCE_V1",
      target: "EXACT_PRE_CUTOVER_LEGACY_POINTER",
      requiredConsumerConvergence: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
      status: "REQUIRED_NOT_EXECUTED",
    },
  };
}

function compareManifest(manifest: Record<string, unknown>): readonly FieldComparison[] {
  const comparisons: FieldComparison[] = Object.entries(
    GATE_E_PREPROD_V15_MANIFEST_FIELDS,
  ).map(([field, expected]) => {
    const present = Object.hasOwn(manifest, field);
    const observed = present ? manifest[field] : MISSING_MANIFEST_FIELD;
    return {
      field,
      expected,
      observed,
      matches: present && same(expected, observed),
    };
  });
  const manifestHashPresent = Object.hasOwn(manifest, "manifestHash");
  const reportedHash = manifestHashPresent
    ? manifest.manifestHash
    : MISSING_MANIFEST_FIELD;
  const { manifestHash: _manifestHash, ...manifestBody } = manifest;
  comparisons.push({
    field: "manifestHash",
    expected: GATE_E_PREPROD_V15_BINDING.manifestHash,
    observed: reportedHash,
    matches: manifestHashPresent &&
      reportedHash === GATE_E_PREPROD_V15_BINDING.manifestHash &&
      typeof reportedHash === "string" && SHA256_PATTERN.test(reportedHash) &&
      reportedHash === sha256(canonicalJsonV1(manifestBody)),
  });
  return comparisons;
}

/**
 * Builds source-only evidence from immutable Git content. It neither creates a
 * release nor observes a host; copied hashes cannot substitute for re-reading
 * the manifest and every candidate-affecting blob at the requested revision.
 */
export async function prepareDf13ReleaseCandidateEvidence(input: Readonly<{
  activationReleaseRevision: string;
  git: Df13ReleaseCandidateSourceReader;
}>): Promise<Df13ReleaseCandidateEvidence> {
  const base = baseEvidence(input.activationReleaseRevision);
  if (!COMMIT_PATTERN.test(input.activationReleaseRevision)) {
    return buildEvidence({
      ...base,
      status: "BLOCKED",
      fieldComparisons: [],
      reasonCodes: ["DF13_ACTIVATION_RELEASE_REVISION_INVALID"],
    });
  }

  let trustedRevision: string;
  try {
    await input.git.refreshTrustedRef();
    trustedRevision = await input.git.resolveRef(DF13_TRUSTED_RELEASE_REF);
  } catch {
    return buildEvidence({
      ...base,
      status: "BLOCKED",
      fieldComparisons: [],
      reasonCodes: ["DF13_TRUSTED_RELEASE_REF_UNAVAILABLE"],
    });
  }
  const releaseSource = {
    trustedRef: DF13_TRUSTED_RELEASE_REF,
    resolvedRevision: COMMIT_PATTERN.test(trustedRevision) ? trustedRevision : null,
  } as const;
  if (trustedRevision !== input.activationReleaseRevision) {
    return buildEvidence({
      ...base,
      releaseSource,
      status: "BLOCKED",
      fieldComparisons: [],
      reasonCodes: ["DF13_ACTIVATION_RELEASE_NOT_TRUSTED_HEAD"],
    });
  }

  let manifestText: string;
  let manifestBlobOid: string;
  try {
    [manifestText, manifestBlobOid] = await Promise.all([
      input.git.readBlob(input.activationReleaseRevision, GATE_E_PREPROD_V15_MANIFEST_PATH),
      input.git.resolveBlobOid(input.activationReleaseRevision, GATE_E_PREPROD_V15_MANIFEST_PATH),
    ]);
  } catch {
    return buildEvidence({
      ...base,
      releaseSource,
      status: "BLOCKED",
      fieldComparisons: [],
      reasonCodes: ["DF13_GATE_E_MANIFEST_UNAVAILABLE"],
    });
  }

  let manifest: Record<string, unknown> | null;
  try {
    manifest = record(JSON.parse(manifestText));
  } catch {
    manifest = null;
  }
  const manifestContentSha256 = sha256(manifestText);
  if (!manifest || !BLOB_OID_PATTERN.test(manifestBlobOid)) {
    return buildEvidence({
      ...base,
      releaseSource,
      status: "BLOCKED",
      manifestArtifact: {
        path: GATE_E_PREPROD_V15_MANIFEST_PATH,
        blobOid: BLOB_OID_PATTERN.test(manifestBlobOid) ? manifestBlobOid : null,
        contentSha256: manifestContentSha256,
      },
      fieldComparisons: [],
      reasonCodes: ["DF13_GATE_E_MANIFEST_INVALID"],
    });
  }

  const fieldComparisons = compareManifest(manifest);
  let candidateProjection: CandidateProjection | null = null;
  const reasonCodes: string[] = [];
  if (manifestBlobOid !== GATE_E_PREPROD_V15_BINDING.manifestBlobOid ||
      manifestContentSha256 !== GATE_E_PREPROD_V15_BINDING.manifestContentSha256) {
    reasonCodes.push("DF13_GATE_E_MANIFEST_IDENTITY_MISMATCH");
  }
  try {
    candidateProjection = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision: input.activationReleaseRevision,
      git: input.git,
    });
  } catch {
    reasonCodes.push("DF13_GATE_E_CANDIDATE_REDERIVATION_UNAVAILABLE");
  }
  if (
    candidateProjection &&
    candidateProjection.contentFingerprint !== GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint
  ) {
    reasonCodes.push("DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH");
  }
  try {
    const finalTrustedRevision = await input.git.resolveRef(DF13_TRUSTED_RELEASE_REF);
    if (finalTrustedRevision !== trustedRevision ||
        finalTrustedRevision !== input.activationReleaseRevision) {
      reasonCodes.push("DF13_TRUSTED_RELEASE_REF_CHANGED");
    }
  } catch {
    reasonCodes.push("DF13_TRUSTED_RELEASE_REF_UNAVAILABLE");
  }
  if (fieldComparisons.some(({ matches }) => !matches)) {
    reasonCodes.push("DF13_GATE_E_MANIFEST_FIELD_MISMATCH");
  }

  return buildEvidence({
    ...base,
    releaseSource,
    status: reasonCodes.length === 0 ? "SOURCE_READY_NO_ACTIVATION" : "BLOCKED",
    manifestArtifact: {
      path: GATE_E_PREPROD_V15_MANIFEST_PATH,
      blobOid: manifestBlobOid,
      contentSha256: manifestContentSha256,
    },
    candidateProjection,
    fieldComparisons,
    reasonCodes,
  });
}

export const DF13_RELEASE_CANDIDATE_EVIDENCE_SOURCE_PATHS_V1 = Object.freeze([
  GATE_E_PREPROD_V15_MANIFEST_PATH,
  ...GATE_E_CANDIDATE_SOURCE_PATHS_V1,
] as const);
