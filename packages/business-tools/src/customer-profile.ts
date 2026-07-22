import {
  BodyMeasurementV1Schema,
  CustomerSizeHistoryV1Schema,
  CustomerProfileV1Schema,
  MeasurementProvenanceV1Schema,
  type BodyMeasurementV1,
  type CustomerProfileV1,
  type MeasurementKind,
} from "@lana/contracts";

export type CustomerProfileFieldSource =
  | "CUSTOMER_MESSAGE"
  | "HUMAN_CONFIRMED"
  | "ADMIN_APPROVED_IMPORT";

export interface CustomerProfileFieldEvidence {
  readonly source: CustomerProfileFieldSource;
  readonly sourceEventHash: string | null;
  readonly observedAt: string;
  readonly confidence: number;
}

export interface EvidencedValue<T> {
  readonly value: T;
  readonly evidence: CustomerProfileFieldEvidence;
}

export interface CustomerSizeHistoryPatch {
  readonly productId: string | null;
  readonly componentRole: CustomerProfileV1["sizeHistory"][number]["componentRole"];
  readonly size: string;
  readonly outcome: CustomerProfileV1["sizeHistory"][number]["outcome"];
  readonly evidence: CustomerProfileFieldEvidence;
}

export interface CustomerProfilePatch {
  readonly profileId: string;
  /** Revision read by the caller. Persistence must use it as the CAS condition. */
  readonly expectedRevision: number;
  readonly measurements?: readonly BodyMeasurementV1[];
  readonly fitPreference?: EvidencedValue<CustomerProfileV1["fitPreference"]>;
  readonly preferences?: {
    readonly colors?: EvidencedValue<readonly string[]>;
    readonly styles?: EvidencedValue<readonly string[]>;
    readonly materials?: EvidencedValue<readonly string[]>;
  };
  readonly sizeHistory?: readonly CustomerSizeHistoryPatch[];
}

/**
 * Evidence for fields whose V1 contract intentionally stores only their value.
 * Measurement and size-history evidence remains embedded in CustomerProfileV1;
 * this map lets persistence layers perform deterministic field-level merges for
 * fit and preference fields without placing raw identity data in the profile.
 */
export interface CustomerProfileMergeState {
  readonly profile: CustomerProfileV1;
  readonly fieldEvidence: Readonly<Record<string, CustomerProfileFieldEvidence>>;
}

export interface CustomerProfileMergeResult extends CustomerProfileMergeState {
  readonly changedFields: readonly string[];
  readonly ignoredFields: readonly string[];
  readonly cas: Readonly<{
    expectedRevision: number;
    nextRevision: number;
  }>;
}

const SOURCE_PRIORITY: Readonly<Record<CustomerProfileFieldSource, number>> = {
  CUSTOMER_MESSAGE: 1,
  ADMIN_APPROVED_IMPORT: 2,
  HUMAN_CONFIRMED: 3,
};

const evidenceFromMeasurement = (
  measurement: BodyMeasurementV1,
): CustomerProfileFieldEvidence => measurement.provenance;

const parseEvidence = (
  evidence: CustomerProfileFieldEvidence,
): CustomerProfileFieldEvidence => MeasurementProvenanceV1Schema.parse(evidence);

const evidenceWins = (
  candidate: CustomerProfileFieldEvidence,
  current: CustomerProfileFieldEvidence | undefined,
): boolean => {
  if (current === undefined) return true;

  const candidateTime = Date.parse(candidate.observedAt);
  const currentTime = Date.parse(current.observedAt);
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  if (candidate.confidence !== current.confidence) {
    return candidate.confidence > current.confidence;
  }
  return SOURCE_PRIORITY[candidate.source] > SOURCE_PRIORITY[current.source];
};

const normalizeList = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim().replace(/\s+/gu, " ");
    const key = normalized.toLocaleLowerCase("vi-VN");
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output.slice(0, 20);
};

const sameValue = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const sizeHistoryKey = (entry: CustomerProfileV1["sizeHistory"][number]): string =>
  [
    entry.productId ?? "*",
    entry.componentRole,
    entry.size.toLocaleUpperCase("vi-VN"),
    entry.outcome,
    entry.sourceEventHash ?? "",
    entry.recordedAt,
  ].join("|");

const latestEvidenceTime = (
  changedEvidence: readonly CustomerProfileFieldEvidence[],
  currentUpdatedAt: string,
): string => {
  let latest = Date.parse(currentUpdatedAt);
  for (const evidence of changedEvidence) {
    latest = Math.max(latest, Date.parse(evidence.observedAt));
  }
  return new Date(latest).toISOString();
};

/**
 * Merge one partial customer update without replacing unrelated fields.
 * Newer evidence wins; ties use confidence, then source authority. A replay of
 * the same patch is idempotent and does not advance profile revision.
 */
export function mergeCustomerProfile(
  currentState: CustomerProfileMergeState,
  patch: CustomerProfilePatch,
): CustomerProfileMergeResult {
  const current = CustomerProfileV1Schema.parse(currentState.profile);
  if (patch.profileId !== current.profileId) {
    throw new Error("CUSTOMER_PROFILE_ID_MISMATCH");
  }
  if (!Number.isInteger(patch.expectedRevision) || patch.expectedRevision < 1) {
    throw new Error("CUSTOMER_PROFILE_EXPECTED_REVISION_INVALID");
  }
  if (patch.expectedRevision !== current.revision) {
    throw new Error("CUSTOMER_PROFILE_REVISION_CONFLICT");
  }

  const evidence: Record<string, CustomerProfileFieldEvidence> = Object.fromEntries(
    Object.entries(currentState.fieldEvidence).map(([path, item]) => [path, parseEvidence(item)]),
  );
  const measurements = new Map<MeasurementKind, BodyMeasurementV1>(
    current.measurements.map((measurement) => [measurement.kind, measurement]),
  );
  const changedFields: string[] = [];
  const ignoredFields: string[] = [];
  const changedEvidence: CustomerProfileFieldEvidence[] = [];

  for (const candidate of patch.measurements ?? []) {
    const parsed = BodyMeasurementV1Schema.parse(candidate);
    const path = `measurements.${parsed.kind}`;
    const previous = measurements.get(parsed.kind);
    const candidateEvidence = evidenceFromMeasurement(parsed);
    const previousEvidence = previous
      ? evidenceFromMeasurement(previous)
      : evidence[path];
    if (evidenceWins(candidateEvidence, previousEvidence)) {
      measurements.set(parsed.kind, parsed);
      evidence[path] = candidateEvidence;
      if (!sameValue(previous, parsed)) {
        changedFields.push(path);
        changedEvidence.push(candidateEvidence);
      }
    } else {
      ignoredFields.push(path);
    }
  }

  let fitPreference = current.fitPreference;
  if (patch.fitPreference !== undefined) {
    const path = "fitPreference";
    const candidateEvidence = parseEvidence(patch.fitPreference.evidence);
    if (evidenceWins(candidateEvidence, evidence[path])) {
      const evidenceChanged = !sameValue(evidence[path], candidateEvidence);
      evidence[path] = candidateEvidence;
      if (fitPreference !== patch.fitPreference.value || evidenceChanged) {
        fitPreference = patch.fitPreference.value;
        changedFields.push(path);
        changedEvidence.push(candidateEvidence);
      }
    } else {
      ignoredFields.push(path);
    }
  }

  const preferences = {
    colors: [...current.preferences.colors],
    styles: [...current.preferences.styles],
    materials: [...current.preferences.materials],
  };
  for (const key of ["colors", "styles", "materials"] as const) {
    const candidate = patch.preferences?.[key];
    if (candidate === undefined) continue;
    const path = `preferences.${key}`;
    const candidateEvidence = parseEvidence(candidate.evidence);
    if (evidenceWins(candidateEvidence, evidence[path])) {
      const normalized = normalizeList(candidate.value);
      const evidenceChanged = !sameValue(evidence[path], candidateEvidence);
      evidence[path] = candidateEvidence;
      if (!sameValue(preferences[key], normalized) || evidenceChanged) {
        preferences[key] = normalized;
        changedFields.push(path);
        changedEvidence.push(candidateEvidence);
      }
    } else {
      ignoredFields.push(path);
    }
  }

  const historyByKey = new Map(
    current.sizeHistory.map((entry) => [sizeHistoryKey(entry), entry]),
  );
  const candidateHistoryEvidence = new Map<string, CustomerProfileFieldEvidence>();
  for (const candidate of patch.sizeHistory ?? []) {
    const candidateEvidence = parseEvidence(candidate.evidence);
    const entry: CustomerProfileV1["sizeHistory"][number] = {
      productId: candidate.productId,
      componentRole: candidate.componentRole,
      size: candidate.size.trim().toLocaleUpperCase("vi-VN"),
      outcome: candidate.outcome,
      sourceEventHash: candidateEvidence.sourceEventHash,
      recordedAt: candidateEvidence.observedAt,
    };
    const parsed = CustomerSizeHistoryV1Schema.parse(entry);
    const key = sizeHistoryKey(parsed);
    if (!historyByKey.has(key)) {
      historyByKey.set(key, parsed);
      candidateHistoryEvidence.set(key, candidateEvidence);
    }
  }
  const sizeHistory = [...historyByKey.values()]
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    .slice(0, 50);
  const retainedHistoryKeys = new Set(sizeHistory.map(sizeHistoryKey));
  for (const [key, candidateEvidence] of candidateHistoryEvidence) {
    if (!retainedHistoryKeys.has(key)) continue;
    const path = `sizeHistory.${key}`;
    evidence[path] = candidateEvidence;
    changedFields.push(path);
    changedEvidence.push(candidateEvidence);
  }
  for (const path of Object.keys(evidence)) {
    if (!path.startsWith("sizeHistory.")) continue;
    const key = path.slice("sizeHistory.".length);
    if (!retainedHistoryKeys.has(key)) delete evidence[path];
  }

  if (changedFields.length === 0) {
    return {
      profile: current,
      fieldEvidence: evidence,
      changedFields,
      ignoredFields,
      cas: {
        expectedRevision: current.revision,
        nextRevision: current.revision,
      },
    };
  }

  const merged = CustomerProfileV1Schema.parse({
    ...current,
    revision: current.revision + 1,
    measurements: [...measurements.values()],
    fitPreference,
    preferences,
    sizeHistory,
    updatedAt: latestEvidenceTime(changedEvidence, current.updatedAt),
  });

  return {
    profile: merged,
    fieldEvidence: evidence,
    changedFields,
    ignoredFields,
    cas: {
      expectedRevision: current.revision,
      nextRevision: merged.revision,
    },
  };
}
