import type { CommerceAuthorityConsumerPort } from "@lana/chat-runtime";
import { GATE_E_PREPROD_V15_BINDING } from "./df13-gate-e-binding.js";
import {
  DF13_COMMERCE_SOURCE_ONLY_DISABLED,
  type Df13CommerceActivationAuthority,
} from "./df13-commerce-default-off-consumer.js";
import type { Df13CommerceFenceRequest } from "./df13-commerce-authority-fence.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
} from "./df13-commerce-authority-bundle.js";
import {
  validateDf13ReleaseCandidateEvidence,
  type Df13ReleaseCandidateEvidence,
} from "./df13-release-candidate-evidence.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";
import {
  validateTrackBReleaseCandidateEvidence,
  type TrackBReleaseCandidateEvidence,
} from "./track-b-release-candidate-evidence.js";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;

export interface Df13ReleaseSourcePointer {
  readonly schemaVersion: 1;
  readonly release: string;
  readonly repository: "https://github.com/nguyentuanson27-netizen/lanchatbot";
  readonly tag: string;
  readonly commit: string;
  readonly createdAt: string;
}

export type Df13CommercePreprodStartupInput =
  | Readonly<{ mode: "LEGACY" }>
  | Readonly<{
    mode: "COMMERCE";
    releaseEvidence: Df13ReleaseCandidateEvidence | TrackBReleaseCandidateEvidence;
    expectedAuthority: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0];
    releaseSource: Df13ReleaseSourcePointer;
    authorityTransition?: "ROLLBACK_TRACK_B";
  }>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key)) &&
    keys.every((key) => Object.hasOwn(value, key));
}

function cloneJson(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error("DF13_COMMERCE_STARTUP_INPUT_INVALID");
    return JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("DF13_COMMERCE_STARTUP_INPUT_INVALID");
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

/** Parses the redacted, immutable startup package before it reaches runtime. */
export function parseDf13CommercePreprodStartupInput(
  value: unknown,
): Df13CommercePreprodStartupInput {
  const input = record(cloneJson(value));
  if (!input) throw new Error("DF13_COMMERCE_STARTUP_INPUT_INVALID");
  if (input.mode === "LEGACY" && hasOnlyKeys(input, ["mode"])) {
    return deepFreeze({ mode: "LEGACY" as const });
  }
  if (
    input.mode !== "COMMERCE" ||
    !(hasOnlyKeys(input, ["mode", "releaseEvidence", "expectedAuthority", "releaseSource"]) ||
      hasOnlyKeys(input, ["mode", "releaseEvidence", "expectedAuthority", "releaseSource",
        "authorityTransition"])) ||
    record(input.releaseEvidence) === null ||
    record(input.expectedAuthority) === null ||
    record(input.releaseSource) === null
  ) {
    throw new Error("DF13_COMMERCE_STARTUP_INPUT_INVALID");
  }
  if (input.authorityTransition !== undefined &&
      input.authorityTransition !== "ROLLBACK_TRACK_B") {
    throw new Error("DF13_COMMERCE_STARTUP_INPUT_INVALID");
  }
  return deepFreeze({
    mode: "COMMERCE" as const,
    releaseEvidence: input.releaseEvidence as
      Df13ReleaseCandidateEvidence | TrackBReleaseCandidateEvidence,
    expectedAuthority: input.expectedAuthority as Parameters<
      CommerceAuthorityConsumerPort["admitCommerceAuthority"]
    >[0],
    releaseSource: input.releaseSource as Df13ReleaseSourcePointer,
    ...(input.authorityTransition === "ROLLBACK_TRACK_B"
      ? { authorityTransition: "ROLLBACK_TRACK_B" as const } : {}),
  });
}

function sourcePointerMatches(
  source: Df13ReleaseSourcePointer,
  evidence: Df13ReleaseCandidateEvidence | TrackBReleaseCandidateEvidence,
): boolean {
  return source.schemaVersion === 1 &&
    source.repository === "https://github.com/nguyentuanson27-netizen/lanchatbot" &&
    source.release.trim().length > 0 &&
    source.tag === source.release &&
    COMMIT_PATTERN.test(source.commit) &&
    Number.isFinite(Date.parse(source.createdAt)) &&
    source.commit === evidence.activationReleaseRevision &&
    evidence.releaseSource.resolvedRevision === source.commit;
}

function startupPackageReason(
  input: Exclude<Df13CommercePreprodStartupInput, { mode: "LEGACY" }>,
): string | null {
  const evidence = input.releaseEvidence;
  const trackB = evidence.contractVersion === "TRACK_B_RELEASE_CANDIDATE_EVIDENCE_V1";
  const validation = trackB
    ? validateTrackBReleaseCandidateEvidence(evidence, {
      activationReleaseRevision: evidence.activationReleaseRevision,
    })
    : validateDf13ReleaseCandidateEvidence(evidence, {
      activationReleaseRevision: evidence.activationReleaseRevision,
      gateEManifestHash: GATE_E_PREPROD_V15_BINDING.manifestHash,
      gateECandidateSourceRevision: GATE_E_PREPROD_V15_BINDING.candidateSourceRevision,
    });
  if (validation.status !== "MATCHED") return "DF13_COMMERCE_RELEASE_EVIDENCE_INVALID";
  if (!sourcePointerMatches(input.releaseSource, evidence)) {
    return "DF13_COMMERCE_RELEASE_SOURCE_MISMATCH";
  }
  if (!exactIdentity(input.expectedAuthority)) {
    return "DF13_COMMERCE_EXPECTED_AUTHORITY_INVALID";
  }
  const expectedBundleHash = trackB
    ? input.authorityTransition === "ROLLBACK_TRACK_B"
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
      : DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash
    : DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash;
  if (input.authorityTransition !== undefined &&
      (!trackB || input.authorityTransition !== "ROLLBACK_TRACK_B")) {
    return "DF13_COMMERCE_RELEASE_AUTHORITY_MISMATCH";
  }
  if (input.expectedAuthority.authorityBundleHash !== expectedBundleHash) {
    return "DF13_COMMERCE_RELEASE_AUTHORITY_MISMATCH";
  }
  return null;
}

function exactIdentity(
  input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
): boolean {
  return input.pageId === DF13_COMMERCE_PREPROD_SCOPE_V1.pageId &&
    input.channel === DF13_COMMERCE_PREPROD_SCOPE_V1.channel &&
    input.source === "DATABASE" &&
    (input.authorityBundleHash === DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash ||
      input.authorityBundleHash === DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash) &&
    UUID_V4_PATTERN.test(input.modeVersionId) &&
    CONTENT_HASH_PATTERN.test(input.contentHash) &&
    Number.isSafeInteger(input.pointerRevision) && input.pointerRevision >= 1;
}

function authorityIdentity(request: Df13CommerceFenceRequest) {
  return {
    pageId: request.pageId,
    channel: request.channel,
    modeVersionId: request.authority.modeVersionId,
    contentHash: request.authority.contentHash,
    pointerRevision: request.authority.pointerRevision,
    authorityBundleHash: request.authority.authorityBundleHash,
    source: request.authority.source,
  } as const;
}

function sameIdentity(
  left: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  right: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
): boolean {
  return left.pageId === right.pageId &&
    left.channel === right.channel &&
    left.modeVersionId === right.modeVersionId &&
    left.contentHash === right.contentHash &&
    left.pointerRevision === right.pointerRevision &&
    left.authorityBundleHash === right.authorityBundleHash &&
    left.source === right.source;
}

/**
 * Explicit fresh-process admission for the isolated PREPROD path. The caller
 * has to supply both a self-validating re-derived release-evidence package and
 * the create-once release-source pointer. Absence of those inputs is not a
 * permissive mode: source stays exactly default-off.
 */
export function createDf13CommercePreprodStartupAuthority(
  input: Df13CommercePreprodStartupInput,
): Df13CommerceActivationAuthority {
  const immutableInput = parseDf13CommercePreprodStartupInput(input);
  if (immutableInput.mode === "LEGACY") return DF13_COMMERCE_SOURCE_ONLY_DISABLED;
  const packageReason = startupPackageReason(immutableInput);
  const evaluate = (
    identity: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ) => {
    if (packageReason !== null) return { status: "BLOCKED" as const, reasonCode: packageReason };
    if (!exactIdentity(identity) || !sameIdentity(identity, immutableInput.expectedAuthority)) {
      return { status: "BLOCKED" as const, reasonCode: "DF13_COMMERCE_STARTUP_IDENTITY_INVALID" };
    }
    return { status: "ADMITTED" as const };
  };
  return Object.freeze({
    async authorizeExactCommerceIdentity(
      identity: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
    ) {
      return evaluate(identity);
    },
    async authorizeExactCommerceRequest(request: Df13CommerceFenceRequest) {
      return evaluate(authorityIdentity(request));
    },
  });
}
