import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  GATE_E_CANDIDATE_SOURCE_PATHS_V1,
  deriveGateECandidateContentFingerprint,
  type GateECandidateSourceReader,
} from "./gate-e-registration.js";
import {
  GATE_E_PREPROD_V15_BINDING,
} from "./df13-commerce-cutover.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-contract.js";

export { GATE_E_PREPROD_V15_BINDING } from "./df13-commerce-cutover.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export const GATE_E_PREPROD_V15_MANIFEST_PATH =
  "evaluation/gate-e/df10-v15/manifest.json" as const;

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

type CandidateProjection = Awaited<ReturnType<typeof deriveGateECandidateContentFingerprint>>;

export type Df13ReleaseCandidateEvidence = Readonly<{
  schemaVersion: 1;
  contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1";
  status: "SOURCE_READY_NO_ACTIVATION" | "BLOCKED";
  sideEffects: "NOT_EXECUTED";
  activationReleaseRevision: string;
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
    status: "REQUIRED_NOT_EXECUTED";
  }>;
  reasonCodes: readonly string[];
  evidenceHash: string;
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

function buildEvidence(input: Omit<Df13ReleaseCandidateEvidence, "evidenceHash">): Df13ReleaseCandidateEvidence {
  return Object.freeze({
    ...input,
    evidenceHash: sha256(canonicalJsonV1(input)),
  });
}

function baseEvidence(
  activationReleaseRevision: string,
): Omit<Df13ReleaseCandidateEvidence, "status" | "reasonCodes" | "evidenceHash" | "fieldComparisons"> {
  return {
    schemaVersion: 1,
    contractVersion: "DF13_RELEASE_CANDIDATE_EVIDENCE_V1",
    sideEffects: "NOT_EXECUTED",
    activationReleaseRevision,
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
      status: "REQUIRED_NOT_EXECUTED",
    },
  };
}

function compareManifest(manifest: Record<string, unknown>): readonly FieldComparison[] {
  const comparisons: FieldComparison[] = Object.entries(
    GATE_E_PREPROD_V15_MANIFEST_FIELDS,
  ).map(([field, expected]) => ({
    field,
    expected,
    observed: manifest[field],
    matches: same(expected, manifest[field]),
  }));
  const reportedHash = manifest.manifestHash;
  const { manifestHash: _manifestHash, ...manifestBody } = manifest;
  comparisons.push({
    field: "manifestHash",
    expected: GATE_E_PREPROD_V15_BINDING.manifestHash,
    observed: reportedHash,
    matches: reportedHash === GATE_E_PREPROD_V15_BINDING.manifestHash &&
      typeof reportedHash === "string" &&
      SHA256_PATTERN.test(reportedHash) &&
      reportedHash === sha256(canonicalJsonV1(manifestBody)),
  });
  return comparisons;
}

/**
 * Produces a source-only candidate evidence package. It reads both the Gate E
 * manifest and every candidate-affecting blob from the proposed release
 * revision; no caller-supplied hash can turn a mismatch into a pass.
 */
export async function prepareDf13ReleaseCandidateEvidence(input: Readonly<{
  activationReleaseRevision: string;
  git: GateECandidateSourceReader;
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
      status: "BLOCKED",
      fieldComparisons: [],
      reasonCodes: ["DF13_GATE_E_MANIFEST_UNAVAILABLE"],
    });
  }
  let manifest: Record<string, unknown> | null = null;
  try {
    manifest = record(JSON.parse(manifestText));
  } catch {
    manifest = null;
  }
  if (!manifest || !/^[a-f0-9]{40,64}$/u.test(manifestBlobOid)) {
    return buildEvidence({
      ...base,
      status: "BLOCKED",
      manifestArtifact: {
        path: GATE_E_PREPROD_V15_MANIFEST_PATH,
        blobOid: /^[a-f0-9]{40,64}$/u.test(manifestBlobOid) ? manifestBlobOid : null,
        contentSha256: sha256(manifestText),
      },
      fieldComparisons: [],
      reasonCodes: ["DF13_GATE_E_MANIFEST_INVALID"],
    });
  }
  const fieldComparisons = compareManifest(manifest);
  let candidateProjection: CandidateProjection | null = null;
  const reasonCodes: string[] = [];
  try {
    candidateProjection = await deriveGateECandidateContentFingerprint({
      candidateSourceRevision: input.activationReleaseRevision,
      git: input.git,
    });
  } catch {
    reasonCodes.push("DF13_GATE_E_CANDIDATE_REDERIVATION_UNAVAILABLE");
  }
  if (candidateProjection &&
      candidateProjection.contentFingerprint !== GATE_E_PREPROD_V15_BINDING.candidateContentFingerprint) {
    reasonCodes.push("DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH");
  }
  if (fieldComparisons.some(({ matches }) => !matches)) {
    reasonCodes.push("DF13_GATE_E_MANIFEST_FIELD_MISMATCH");
  }
  return buildEvidence({
    ...base,
    status: reasonCodes.length === 0 ? "SOURCE_READY_NO_ACTIVATION" : "BLOCKED",
    manifestArtifact: {
      path: GATE_E_PREPROD_V15_MANIFEST_PATH,
      blobOid: manifestBlobOid,
      contentSha256: sha256(manifestText),
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
