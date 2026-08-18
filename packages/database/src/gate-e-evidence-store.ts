import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import { Pool, type PoolClient } from "pg";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const GIT_OBJECT_ID_PATTERN = /^[a-f0-9]{40,64}$/u;
const MAX_CANONICAL_EVIDENCE_BYTES = 4 * 1024 * 1024;
const BODY_CONTRACT = "DF10_GATE_E_SCORED_EVIDENCE_BODY_V3" as const;
const FINALIZATION_CONTRACT = "DF10_GATE_E_RUN_FINALIZATION_V3" as const;
const POPULATION_ANCHOR_CONTRACT =
  "DF10_GATE_E_REGISTERED_POPULATION_ANCHOR_V1" as const;

export interface GateERegisteredPopulationAnchorV1 {
  readonly schemaVersion: 1;
  readonly contractVersion: typeof POPULATION_ANCHOR_CONTRACT;
  readonly registrationCommit: string;
  readonly registrationBlobOid: string;
  readonly manifestHash: string;
  readonly corpusHash: string;
  readonly rubricHash: string;
  readonly planArtifactHash: string;
  readonly corpusItemIds: readonly string[];
  readonly populationCount: number;
  readonly populationAnchorHash: string;
}

export type GateEEvidenceRecordBindingV3 = Readonly<{
  recordKind: "BODY" | "FINALIZATION";
  contractVersion: typeof BODY_CONTRACT | typeof FINALIZATION_CONTRACT;
  registrationCommit: string | null;
  manifestHash: string | null;
  populationAnchorHash: string | null;
  scoredRunRevision: string;
  evidenceBodyHash: string | null;
}>;

export type GateEEvidenceAppendResultV2 =
  | Readonly<{
    disposition: "APPENDED" | "ALREADY_PRESENT";
    evidenceHash: string;
    admittedAt: string;
  }>
  | Readonly<{
    disposition: "DEADLINE_EXPIRED" | "HASH_CONFLICT";
    evidenceHash: string;
    admittedAt: null;
  }>;

export interface GateEEvidenceReadRecordV2 {
  readonly evidence: Readonly<Record<string, unknown>>;
  /** DB-authoritative final pre-commit admission boundary; not commit time. */
  readonly admittedAt: string;
}

export type GateEPopulationAnchorAppendResultV1 = Readonly<{
  disposition: "APPENDED" | "ALREADY_PRESENT" | "HASH_CONFLICT";
  populationAnchorHash: string;
  anchoredAt: string | null;
}>;

export interface GateEPopulationAnchorReadRecordV1 {
  readonly populationAnchor: GateERegisteredPopulationAnchorV1;
  readonly anchoredAt: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return canonicalJsonV1(Object.keys(value).sort()) === canonicalJsonV1([...keys].sort());
}

function record(value: unknown, code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Readonly<Record<string, unknown>>;
}

function finiteTime(value: unknown, code: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(code);
  }
  return value;
}

function isBinary(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function assertNoSensitiveFields(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoSensitiveFields);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
    if (/(?:secret|credential|password|accesstoken|refreshtoken|rawprovider|rawpayload|customer|phone|address|email|messageid)/u.test(normalized)) {
      throw new Error("GATE_E_EVIDENCE_SENSITIVE_FIELD_FORBIDDEN");
    }
    assertNoSensitiveFields(nested);
  }
}

export function assertGateERegisteredPopulationAnchorV1(
  value: GateERegisteredPopulationAnchorV1,
): GateERegisteredPopulationAnchorV1 {
  const anchor = record(value, "GATE_E_REGISTERED_POPULATION_ANCHOR_INVALID");
  const keys = [
    "contractVersion", "corpusHash", "corpusItemIds", "manifestHash",
    "planArtifactHash", "populationAnchorHash", "populationCount",
    "registrationBlobOid", "registrationCommit", "rubricHash", "schemaVersion",
  ];
  const { populationAnchorHash, ...anchorBody } = anchor;
  const itemIds = anchor.corpusItemIds;
  if (!hasExactKeys(anchor, keys) || anchor.schemaVersion !== 1 ||
      anchor.contractVersion !== POPULATION_ANCHOR_CONTRACT ||
      !COMMIT_PATTERN.test(String(anchor.registrationCommit ?? "")) ||
      !/^[a-f0-9]{40,64}$/u.test(String(anchor.registrationBlobOid ?? "")) ||
      [anchor.manifestHash, anchor.corpusHash, anchor.rubricHash,
        anchor.planArtifactHash, populationAnchorHash]
        .some((hash) => typeof hash !== "string" || !SHA256_PATTERN.test(hash)) ||
      !Array.isArray(itemIds) || itemIds.length === 0 ||
      !Number.isSafeInteger(anchor.populationCount) ||
      anchor.populationCount !== itemIds.length ||
      itemIds.some((id) => typeof id !== "string" ||
        !/^[a-z0-9][a-z0-9-]{0,127}$/u.test(id)) ||
      canonicalJsonV1(itemIds) !== canonicalJsonV1([...itemIds].sort()) ||
      new Set(itemIds).size !== itemIds.length ||
      populationAnchorHash !== sha256(canonicalJsonV1(anchorBody))) {
    throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_INVALID");
  }
  assertNoSensitiveFields(anchor);
  return value;
}

export function assertGateEBodyMatchesRegisteredPopulationV1(input: Readonly<{
  evidence: Readonly<Record<string, unknown>>;
  populationAnchor: GateERegisteredPopulationAnchorV1;
}>): void {
  const anchor = assertGateERegisteredPopulationAnchorV1(input.populationAnchor);
  const items = input.evidence.items;
  const provenance = record(
    input.evidence.registrationProvenance,
    "GATE_E_EVIDENCE_REGISTERED_POPULATION_MISMATCH",
  );
  const observedIds = Array.isArray(items)
    ? items.map((item) => String(record(
      item,
      "GATE_E_EVIDENCE_REGISTERED_POPULATION_MISMATCH",
    ).corpusItemId ?? "")).sort()
    : [];
  if (input.evidence.populationAnchorHash !== anchor.populationAnchorHash ||
      input.evidence.manifestHash !== anchor.manifestHash ||
      provenance.registrationCommit !== anchor.registrationCommit ||
      provenance.registrationBlobOid !== anchor.registrationBlobOid ||
      canonicalJsonV1(observedIds) !== canonicalJsonV1(anchor.corpusItemIds)) {
    throw new Error("GATE_E_EVIDENCE_REGISTERED_POPULATION_MISMATCH");
  }
}

function assertBodyPopulation(body: Readonly<Record<string, unknown>>): void {
  const items = body.items;
  const summary = record(body.summary, "GATE_E_EVIDENCE_SUMMARY_INVALID");
  const summaryKeys = [
    "claimSafety", "contextIntegrity", "contractVersion", "disposition",
    "eligibleCoverage", "mustPass", "population", "reasonCodes",
    "schemaVersion", "scored", "sideEffectViolations",
  ];
  if (!Array.isArray(items) || items.length === 0 ||
      !hasExactKeys(summary, summaryKeys) ||
      summary.schemaVersion !== 1 ||
      summary.contractVersion !== "DF10_GATE_E_TECHNICAL_SCORE_SUMMARY_V1" ||
      summary.population !== items.length || summary.scored !== items.length ||
      summary.eligibleCoverage !== 1) {
    throw new Error("GATE_E_EVIDENCE_POPULATION_INCOMPLETE");
  }
  const itemKeys = [
    "candidateOutputHash", "contextHash", "corpusItemId",
    "interpretationOutputHash", "interpretationRequestEnvelopeHash",
    "providerModelVersion", "requestEnvelopeHash", "score",
  ];
  const scoreKeys = [
    "claimSafety", "contextIntegrity", "corpusItemId", "disposition",
    "heuristicEffectSuspicion", "reasonCodes", "sideEffectViolations",
  ];
  let claimSafetyTotal = 0;
  let contextIntegrityTotal = 0;
  let sideEffectViolations = 0;
  let mustPassTotal = 0;
  const ids = items.map((value) => {
    const item = record(value, "GATE_E_EVIDENCE_ITEM_INVALID");
    const score = record(item.score, "GATE_E_EVIDENCE_SCORE_INVALID");
    const corpusItemId = String(item.corpusItemId ?? "");
    const hashes = [
      item.contextHash, item.requestEnvelopeHash, item.candidateOutputHash,
      item.interpretationRequestEnvelopeHash, item.interpretationOutputHash,
    ];
    const reasonCodes = score.reasonCodes;
    if (!hasExactKeys(item, itemKeys) || !hasExactKeys(score, scoreKeys) ||
        !/^[a-z0-9][a-z0-9-]{0,127}$/u.test(corpusItemId) ||
        hashes.some((hash) => typeof hash !== "string" || !SHA256_PATTERN.test(hash)) ||
        typeof item.providerModelVersion !== "string" ||
        !/^[a-zA-Z0-9._-]{1,128}$/u.test(item.providerModelVersion) ||
        score.corpusItemId !== corpusItemId ||
        !["MUST_PASS", "FAILED"].includes(String(score.disposition)) ||
        !isBinary(score.claimSafety) ||
        !isBinary(score.contextIntegrity) ||
        !isBinary(score.sideEffectViolations) ||
        !isBinary(score.heuristicEffectSuspicion) ||
        !Array.isArray(reasonCodes) || reasonCodes.some((reason) =>
          typeof reason !== "string" || !/^[A-Z][A-Z0-9_]{0,127}$/u.test(reason)
        ) || (score.disposition === "MUST_PASS" && reasonCodes.length !== 0) ||
        (score.disposition === "FAILED" && reasonCodes.length === 0)) {
      throw new Error("GATE_E_EVIDENCE_ITEM_INVALID");
    }
    claimSafetyTotal += Number(score.claimSafety);
    contextIntegrityTotal += Number(score.contextIntegrity);
    sideEffectViolations += Number(score.sideEffectViolations);
    if (score.disposition === "MUST_PASS") mustPassTotal += 1;
    return corpusItemId;
  });
  if (ids.some((id) => id.length === 0) || new Set(ids).size !== ids.length) {
    throw new Error("GATE_E_EVIDENCE_POPULATION_INVALID");
  }
  const expectedReasons = [
    ...(claimSafetyTotal !== items.length ? ["GATE_E_CLAIM_SAFETY_FAILED"] : []),
    ...(contextIntegrityTotal !== items.length ? ["GATE_E_CONTEXT_INTEGRITY_FAILED"] : []),
    ...(sideEffectViolations !== 0 ? ["GATE_E_SIDE_EFFECT_SAFETY_FAILED"] : []),
    ...(mustPassTotal !== items.length ? ["GATE_E_MUST_PASS_ASSERTION_FAILED"] : []),
  ].sort();
  if (summary.claimSafety !== claimSafetyTotal / items.length ||
      summary.contextIntegrity !== contextIntegrityTotal / items.length ||
      summary.sideEffectViolations !== sideEffectViolations ||
      summary.mustPass !== mustPassTotal / items.length ||
      summary.disposition !== (expectedReasons.length === 0
        ? "TECHNICAL_ASSERTIONS_PASS" : "TECHNICAL_ASSERTIONS_FAILED") ||
      canonicalJsonV1(summary.reasonCodes) !== canonicalJsonV1(expectedReasons)) {
    throw new Error("GATE_E_EVIDENCE_SUMMARY_MISMATCH");
  }
}

export function classifyGateEEvidenceRecordV3(input: Readonly<{
  evidenceHash: string;
  evidence: Readonly<Record<string, unknown>>;
  notAfter: string;
  populationAnchor?: GateERegisteredPopulationAnchorV1;
}>): GateEEvidenceRecordBindingV3 {
  if (!SHA256_PATTERN.test(input.evidenceHash) ||
      input.evidenceHash !== sha256(canonicalJsonV1(input.evidence))) {
    throw new Error("GATE_E_EVIDENCE_HASH_MISMATCH");
  }
  const canonicalEvidence = canonicalJsonV1(input.evidence);
  if (Buffer.byteLength(canonicalEvidence, "utf8") > MAX_CANONICAL_EVIDENCE_BYTES) {
    throw new Error("GATE_E_EVIDENCE_TOO_LARGE");
  }
  const notAfter = finiteTime(input.notAfter, "GATE_E_EVIDENCE_DEADLINE_INVALID");
  assertNoSensitiveFields(input.evidence);

  if (input.evidence.contractVersion === BODY_CONTRACT) {
    const bodyKeys = [
      "admissibility", "completedAt", "contractVersion", "executionBoundary",
      "items", "manifestHash", "populationAnchorHash",
      "registrationProvenance", "schemaVersion", "scoredRunRevision",
      "startedAt", "summary",
    ];
    const provenance = record(
      input.evidence.registrationProvenance,
      "GATE_E_EVIDENCE_PROVENANCE_INVALID",
    );
    const provenanceKeys = [
      "disposition", "manifestHash", "registrationBlobOid",
      "registrationCommit", "registrationCommitTime", "scoredRunRevision",
      "scoredRunStartedAt",
    ];
    const registrationCommitTime = Date.parse(String(provenance.registrationCommitTime ?? ""));
    const scoredRunStartedAt = Date.parse(String(provenance.scoredRunStartedAt ?? ""));
    const startedAt = Date.parse(String(input.evidence.startedAt ?? ""));
    const completedAt = Date.parse(String(input.evidence.completedAt ?? ""));
    if (input.populationAnchor === undefined) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_REQUIRED");
    }
    if (!hasExactKeys(input.evidence, bodyKeys) || input.evidence.schemaVersion !== 1 ||
        input.evidence.admissibility !== "UNFINALIZED_TECHNICAL_EVIDENCE" ||
        !hasExactKeys(provenance, provenanceKeys) ||
        provenance.disposition !== "REGISTRATION_PROVENANCE_VERIFIED" ||
        !COMMIT_PATTERN.test(String(input.evidence.scoredRunRevision ?? "")) ||
        !COMMIT_PATTERN.test(String(provenance.registrationCommit ?? "")) ||
        !GIT_OBJECT_ID_PATTERN.test(String(provenance.registrationBlobOid ?? "")) ||
        !SHA256_PATTERN.test(String(input.evidence.manifestHash ?? "")) ||
        provenance.manifestHash !== input.evidence.manifestHash ||
        provenance.scoredRunRevision !== input.evidence.scoredRunRevision ||
        ![registrationCommitTime, scoredRunStartedAt, startedAt, completedAt]
          .every(Number.isFinite) ||
        registrationCommitTime >= scoredRunStartedAt || scoredRunStartedAt !== startedAt ||
        startedAt > completedAt || completedAt > Date.parse(notAfter)) {
      throw new Error("GATE_E_EVIDENCE_BODY_BINDING_INVALID");
    }
    assertBodyPopulation(input.evidence);
    assertGateEBodyMatchesRegisteredPopulationV1({
      evidence: input.evidence,
      populationAnchor: input.populationAnchor,
    });
    return Object.freeze({
      recordKind: "BODY",
      contractVersion: BODY_CONTRACT,
      registrationCommit: String(provenance.registrationCommit),
      manifestHash: String(input.evidence.manifestHash),
      populationAnchorHash: input.populationAnchor.populationAnchorHash,
      scoredRunRevision: String(input.evidence.scoredRunRevision),
      evidenceBodyHash: null,
    });
  }

  if (input.evidence.contractVersion === FINALIZATION_CONTRACT) {
    const finalizationKeys = [
      "contractVersion", "disposition", "evidenceBodyHash", "finalClean",
      "notAfter", "preparedAt", "schemaVersion", "scoredRunRevision",
      "trustedRevision",
    ];
    const evidenceBodyHash = String(input.evidence.evidenceBodyHash ?? "");
    const revision = String(input.evidence.scoredRunRevision ?? "");
    if (!hasExactKeys(input.evidence, finalizationKeys) ||
        input.evidence.schemaVersion !== 1 ||
        input.evidence.disposition !== "FINALIZED_TRUSTED_EXACT_HEAD" ||
        input.evidence.finalClean !== true || !SHA256_PATTERN.test(evidenceBodyHash) ||
        !COMMIT_PATTERN.test(revision) || input.evidence.trustedRevision !== revision ||
        input.evidence.notAfter !== notAfter ||
        Date.parse(finiteTime(input.evidence.preparedAt, "GATE_E_EVIDENCE_TIME_INVALID")) >
          Date.parse(notAfter)) {
      throw new Error("GATE_E_EVIDENCE_FINALIZATION_BINDING_INVALID");
    }
    return Object.freeze({
      recordKind: "FINALIZATION",
      contractVersion: FINALIZATION_CONTRACT,
      registrationCommit: null,
      manifestHash: null,
      populationAnchorHash: null,
      scoredRunRevision: revision,
      evidenceBodyHash,
    });
  }
  throw new Error("GATE_E_EVIDENCE_CONTRACT_UNSUPPORTED");
}

interface GateEEvidenceDatabaseRow {
  readonly evidence_hash: string;
  readonly record_kind: "BODY" | "FINALIZATION";
  readonly contract_version: string;
  readonly canonical_evidence: string;
  readonly registration_commit: string;
  readonly manifest_hash: string;
  readonly population_anchor_hash: string;
  readonly scored_run_revision: string;
  readonly evidence_body_hash: string | null;
  readonly not_after: Date | string;
  readonly admitted_at: Date | string;
}

interface GateEPopulationAnchorDatabaseRow {
  readonly population_anchor_hash: string;
  readonly canonical_anchor: string;
  readonly anchored_at: Date | string;
}

function timestamp(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("GATE_E_EVIDENCE_STORE_TIMESTAMP_INVALID");
  return parsed.toISOString();
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try { await client.query("ROLLBACK"); } catch { /* preserve original failure */ }
}

function canonicalPopulationAnchorBody(
  populationAnchor: GateERegisteredPopulationAnchorV1,
): string {
  assertGateERegisteredPopulationAnchorV1(populationAnchor);
  const { populationAnchorHash: _hash, ...anchorBody } = populationAnchor;
  return canonicalJsonV1(anchorBody);
}

function populationAnchorFromRow(
  row: GateEPopulationAnchorDatabaseRow,
): GateEPopulationAnchorReadRecordV1 {
  let anchorBody: Readonly<Record<string, unknown>>;
  try {
    anchorBody = record(
      JSON.parse(row.canonical_anchor),
      "GATE_E_REGISTERED_POPULATION_ANCHOR_CORRUPT",
    );
  } catch {
    throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_CORRUPT");
  }
  const populationAnchor = Object.freeze({
    ...anchorBody,
    populationAnchorHash: row.population_anchor_hash,
  }) as unknown as GateERegisteredPopulationAnchorV1;
  try {
    assertGateERegisteredPopulationAnchorV1(populationAnchor);
  } catch {
    throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_CORRUPT");
  }
  if (row.canonical_anchor !== canonicalPopulationAnchorBody(populationAnchor)) {
    throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_CORRUPT");
  }
  return Object.freeze({
    populationAnchor,
    anchoredAt: timestamp(row.anchored_at),
  });
}

export class PostgresGateERegistrationAnchorStoreV1 {
  private readonly pool: Pool;

  constructor(connectionString: string, maxPoolSize = 2) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
    this.pool.on("error", () => undefined);
  }

  async appendRegisteredPopulationAnchorAtomically(input: Readonly<{
    populationAnchor: GateERegisteredPopulationAnchorV1;
    signal: AbortSignal;
  }>): Promise<GateEPopulationAnchorAppendResultV1> {
    if (input.signal.aborted) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_APPEND_ABORTED");
    }
    const canonicalAnchor = canonicalPopulationAnchorBody(input.populationAnchor);
    const result = await this.pool.query<{
      disposition: GateEPopulationAnchorAppendResultV1["disposition"];
      anchored_at: Date | string | null;
    }>(
      "SELECT * FROM public.lana_gate_e_register_population_anchor_v1($1,$2)",
      [input.populationAnchor.populationAnchorHash, canonicalAnchor],
    );
    const disposition = result.rows[0]?.disposition;
    if (disposition !== "APPENDED" && disposition !== "ALREADY_PRESENT" &&
        disposition !== "HASH_CONFLICT") {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_RESPONSE_INVALID");
    }
    const anchoredAt = result.rows[0]?.anchored_at;
    if (disposition === "HASH_CONFLICT") {
      return Object.freeze({
        disposition,
        populationAnchorHash: input.populationAnchor.populationAnchorHash,
        anchoredAt: null,
      });
    }
    if (input.signal.aborted) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_APPEND_ABORTED");
    }
    const stored = await this.readPopulationAnchorByHash(
      input.populationAnchor.populationAnchorHash,
    );
    if (stored === null ||
        canonicalJsonV1(stored.populationAnchor) !==
          canonicalJsonV1(input.populationAnchor) || anchoredAt === null) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_READBACK_FAILED");
    }
    return Object.freeze({
      disposition,
      populationAnchorHash: input.populationAnchor.populationAnchorHash,
      anchoredAt: stored.anchoredAt,
    });
  }

  async readPopulationAnchorByHash(
    populationAnchorHash: string,
  ): Promise<GateEPopulationAnchorReadRecordV1 | null> {
    if (!SHA256_PATTERN.test(populationAnchorHash)) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_REFERENCE_INVALID");
    }
    const result = await this.pool.query<GateEPopulationAnchorDatabaseRow>(
      "SELECT * FROM public.lana_gate_e_read_population_anchor_v1($1)",
      [populationAnchorHash],
    );
    if (result.rowCount === 0) return null;
    if (result.rowCount !== 1 || result.rows.length !== 1) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_AMBIGUOUS");
    }
    return populationAnchorFromRow(result.rows[0]!);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export class PostgresGateEEvidenceStoreV2 {
  private readonly pool: Pool;

  constructor(connectionString: string, maxPoolSize = 2) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
    // pg emits idle-client failures on the pool. Keeping a listener prevents an
    // unrelated process crash; individual operations still reject fail-closed.
    this.pool.on("error", () => undefined);
  }

  async appendBeforeDeadlineAtomically(input: Readonly<{
    evidenceHash: string;
    evidence: Readonly<Record<string, unknown>>;
    notAfter: string;
    signal: AbortSignal;
  }>): Promise<GateEEvidenceAppendResultV2> {
    if (input.signal.aborted) throw new Error("GATE_E_EVIDENCE_APPEND_ABORTED");
    const populationAnchorHash = input.evidence.contractVersion === BODY_CONTRACT
      ? String(input.evidence.populationAnchorHash ?? "")
      : null;
    const populationAnchorRecord = populationAnchorHash === null
      ? null
      : await this.readPopulationAnchorByHash(populationAnchorHash);
    if (populationAnchorHash !== null && populationAnchorRecord === null) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_REQUIRED");
    }
    const binding = classifyGateEEvidenceRecordV3(populationAnchorRecord === null
      ? input
      : { ...input, populationAnchor: populationAnchorRecord.populationAnchor });
    const canonicalEvidence = canonicalJsonV1(input.evidence);
    const client = await this.pool.connect();
    let clientReleased = false;
    let commitStarted = false;
    let destroyClient = false;
    const onClientError = (): void => {
      destroyClient = true;
    };
    client.on("error", onClientError);
    try {
      await client.query("BEGIN");
      let registrationCommit = binding.registrationCommit;
      let manifestHash = binding.manifestHash;
      let boundPopulationAnchorHash = binding.populationAnchorHash;
      if (binding.recordKind === "FINALIZATION") {
        const body = await client.query<GateEEvidenceDatabaseRow>(
          "SELECT * FROM public.lana_gate_e_read_evidence_by_hash_v2($1)",
          [binding.evidenceBodyHash],
        );
        if (body.rowCount !== 1 || body.rows[0]?.record_kind !== "BODY" ||
            body.rows[0].scored_run_revision !== binding.scoredRunRevision) {
          throw new Error("GATE_E_EVIDENCE_FINALIZATION_BODY_INVALID");
        }
        registrationCommit = body.rows[0].registration_commit;
        manifestHash = body.rows[0].manifest_hash;
        boundPopulationAnchorHash = body.rows[0].population_anchor_hash;
      }
      const result = await client.query<{
        disposition: GateEEvidenceAppendResultV2["disposition"];
        admitted_at: Date | string | null;
      }>(
        `SELECT * FROM public.lana_gate_e_append_evidence_v2(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz
        )`,
        [input.evidenceHash, binding.recordKind, binding.contractVersion,
          canonicalEvidence, registrationCommit, manifestHash,
          boundPopulationAnchorHash, binding.scoredRunRevision,
          binding.evidenceBodyHash, input.notAfter],
      );
      const disposition = result.rows[0]?.disposition;
      if (disposition === "DEADLINE_EXPIRED" || disposition === "HASH_CONFLICT") {
        await client.query("ROLLBACK");
        return Object.freeze({ disposition, evidenceHash: input.evidenceHash, admittedAt: null });
      }
      if (disposition !== "APPENDED" && disposition !== "ALREADY_PRESENT") {
        throw new Error("GATE_E_EVIDENCE_STORE_RESPONSE_INVALID");
      }
      if (input.signal.aborted) throw new Error("GATE_E_EVIDENCE_APPEND_ABORTED");
      commitStarted = true;
      await client.query("COMMIT");
      commitStarted = false;
      client.off("error", onClientError);
      client.release();
      clientReleased = true;
      const stored = await this.readByHash(input.evidenceHash);
      if (stored === null || canonicalJsonV1(stored.evidence) !== canonicalEvidence) {
        throw new Error("GATE_E_EVIDENCE_POST_APPEND_READ_FAILED");
      }
      return Object.freeze({
        disposition,
        evidenceHash: input.evidenceHash,
        admittedAt: stored.admittedAt,
      });
    } catch (error) {
      if (!clientReleased) await rollbackQuietly(client);
      const databaseError = error as { code?: string; message?: string };
      if (databaseError.code === "23514" &&
          databaseError.message === "GATE_E_EVIDENCE_DEADLINE_EXPIRED") {
        return Object.freeze({
          disposition: "DEADLINE_EXPIRED" as const,
          evidenceHash: input.evidenceHash,
          admittedAt: null,
        });
      }
      if (commitStarted) {
        destroyClient = true;
        throw new Error("GATE_E_EVIDENCE_COMMIT_AMBIGUOUS");
      }
      throw error;
    } finally {
      if (!clientReleased) {
        client.off("error", onClientError);
        client.release(destroyClient);
      }
    }
  }

  async readByHash(evidenceHash: string): Promise<GateEEvidenceReadRecordV2 | null> {
    if (!SHA256_PATTERN.test(evidenceHash)) {
      throw new Error("GATE_E_EVIDENCE_REFERENCE_INVALID");
    }
    const result = await this.pool.query<GateEEvidenceDatabaseRow>(
      "SELECT * FROM public.lana_gate_e_read_evidence_by_hash_v2($1)",
      [evidenceHash],
    );
    if (result.rowCount === 0) return null;
    if (result.rowCount !== 1 || result.rows.length !== 1) {
      throw new Error("GATE_E_EVIDENCE_READER_AMBIGUOUS");
    }
    const row = result.rows[0]!;
    let evidence: Readonly<Record<string, unknown>>;
    try {
      evidence = record(JSON.parse(row.canonical_evidence), "GATE_E_EVIDENCE_READER_CORRUPT");
    } catch {
      throw new Error("GATE_E_EVIDENCE_READER_CORRUPT");
    }
    const populationAnchorRecord = row.record_kind === "BODY"
      ? await this.readPopulationAnchorByHash(row.population_anchor_hash)
      : null;
    if (row.record_kind === "BODY" && populationAnchorRecord === null) {
      throw new Error("GATE_E_EVIDENCE_READER_CORRUPT");
    }
    const bindingInput = {
      evidenceHash,
      evidence,
      notAfter: timestamp(row.not_after),
    };
    const binding = classifyGateEEvidenceRecordV3(populationAnchorRecord === null
      ? bindingInput
      : { ...bindingInput, populationAnchor: populationAnchorRecord.populationAnchor });
    const admittedAt = timestamp(row.admitted_at);
    if (row.canonical_evidence !== canonicalJsonV1(evidence) ||
        row.evidence_hash !== evidenceHash || row.record_kind !== binding.recordKind ||
        row.contract_version !== binding.contractVersion ||
        row.scored_run_revision !== binding.scoredRunRevision ||
        row.evidence_body_hash !== binding.evidenceBodyHash ||
        (binding.registrationCommit !== null &&
          row.registration_commit !== binding.registrationCommit) ||
        (binding.manifestHash !== null && row.manifest_hash !== binding.manifestHash) ||
        (binding.populationAnchorHash !== null &&
          row.population_anchor_hash !== binding.populationAnchorHash) ||
        Date.parse(admittedAt) > Date.parse(timestamp(row.not_after))) {
      throw new Error("GATE_E_EVIDENCE_READER_CORRUPT");
    }
    if (binding.recordKind === "FINALIZATION") {
      const body = await this.readByHash(binding.evidenceBodyHash!);
      if (body === null) throw new Error("GATE_E_EVIDENCE_READER_CORRUPT");
      const finalizationPopulation = await this.readPopulationAnchorByHash(
        row.population_anchor_hash,
      );
      if (finalizationPopulation === null) {
        throw new Error("GATE_E_EVIDENCE_READER_CORRUPT");
      }
      const bodyBinding = classifyGateEEvidenceRecordV3({
        evidenceHash: binding.evidenceBodyHash!,
        evidence: body.evidence,
        notAfter: timestamp(row.not_after),
        populationAnchor: finalizationPopulation.populationAnchor,
      });
      if (bodyBinding.recordKind !== "BODY" ||
          bodyBinding.registrationCommit !== row.registration_commit ||
          bodyBinding.manifestHash !== row.manifest_hash ||
          bodyBinding.populationAnchorHash !== row.population_anchor_hash ||
          bodyBinding.scoredRunRevision !== row.scored_run_revision) {
        throw new Error("GATE_E_EVIDENCE_READER_CORRUPT");
      }
    }
    return Object.freeze({ evidence, admittedAt });
  }

  async readPopulationAnchorByHash(
    populationAnchorHash: string,
  ): Promise<GateEPopulationAnchorReadRecordV1 | null> {
    if (!SHA256_PATTERN.test(populationAnchorHash)) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_REFERENCE_INVALID");
    }
    const result = await this.pool.query<GateEPopulationAnchorDatabaseRow>(
      "SELECT * FROM public.lana_gate_e_read_population_anchor_v1($1)",
      [populationAnchorHash],
    );
    if (result.rowCount === 0) return null;
    if (result.rowCount !== 1 || result.rows.length !== 1) {
      throw new Error("GATE_E_REGISTERED_POPULATION_ANCHOR_AMBIGUOUS");
    }
    return populationAnchorFromRow(result.rows[0]!);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
