import { createHash, randomBytes } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { canonicalJsonV1 } from "@lana/contracts";
import { Pool, type PoolClient } from "pg";
import { migrateDownOne, migrateUp } from "./migrate.js";
import {
  PostgresGateEEvidenceStoreV2,
  classifyGateEEvidenceRecordV3,
} from "./gate-e-evidence-store.js";

const databaseUrl = process.env.GATE_E_STORE_TEST_DATABASE_URL;
const postgresDescribe = databaseUrl ? describe.sequential : describe.skip;
const sha256 = (value: string): string => createHash("sha256")
  .update(value, "utf8")
  .digest("hex");

function evidenceBody(seed = randomBytes(8).toString("hex")) {
  const revision = sha256(`revision:${seed}`).slice(0, 40);
  const manifestHash = sha256(`manifest:${seed}`);
  const registrationCommit = sha256(`registration:${seed}`).slice(0, 40);
  const startedAt = new Date(Date.now() - 1_000).toISOString();
  const completedAt = new Date().toISOString();
  const item = Object.freeze({
    corpusItemId: `gate-e-${seed}`,
    contextHash: sha256(`context:${seed}`),
    requestEnvelopeHash: sha256(`request:${seed}`),
    providerModelVersion: "gemini-3.5-flash-lite",
    candidateOutputHash: sha256(`candidate:${seed}`),
    interpretationRequestEnvelopeHash: sha256(`interpret-request:${seed}`),
    interpretationOutputHash: sha256(`interpret-output:${seed}`),
    score: Object.freeze({
      corpusItemId: `gate-e-${seed}`,
      disposition: "MUST_PASS",
      claimSafety: 1,
      contextIntegrity: 1,
      sideEffectViolations: 0,
      heuristicEffectSuspicion: 0,
      reasonCodes: Object.freeze([]),
    }),
  });
  return Object.freeze({
    schemaVersion: 1,
    contractVersion: "DF10_GATE_E_SCORED_EVIDENCE_BODY_V3",
    admissibility: "UNFINALIZED_TECHNICAL_EVIDENCE",
    executionBoundary: "CLEAN_TRUSTED_EXACT_HEAD_REQUEST_BYTES_V1",
    scoredRunRevision: revision,
    manifestHash,
    registrationProvenance: Object.freeze({
      disposition: "REGISTRATION_PROVENANCE_VERIFIED",
      registrationCommit,
      registrationBlobOid: sha256(`blob:${seed}`).slice(0, 40),
      manifestHash,
      scoredRunRevision: revision,
      registrationCommitTime: new Date(Date.now() - 2_000).toISOString(),
      scoredRunStartedAt: startedAt,
    }),
    startedAt,
    completedAt,
    items: Object.freeze([item]),
    summary: Object.freeze({
      schemaVersion: 1,
      contractVersion: "DF10_GATE_E_TECHNICAL_SCORE_SUMMARY_V1",
      disposition: "TECHNICAL_ASSERTIONS_PASS",
      population: 1,
      scored: 1,
      eligibleCoverage: 1,
      claimSafety: 1,
      contextIntegrity: 1,
      sideEffectViolations: 0,
      mustPass: 1,
      reasonCodes: Object.freeze([]),
    }),
  });
}

function finalization(bodyHash: string, revision: string, notAfter: string) {
  return Object.freeze({
    schemaVersion: 1,
    contractVersion: "DF10_GATE_E_RUN_FINALIZATION_V3",
    disposition: "FINALIZED_TRUSTED_EXACT_HEAD",
    evidenceBodyHash: bodyHash,
    scoredRunRevision: revision,
    trustedRevision: revision,
    finalClean: true,
    preparedAt: new Date().toISOString(),
    notAfter,
  });
}

function failedPopulationBody(): Readonly<Record<string, unknown>> {
  const value = structuredClone(evidenceBody()) as Record<string, unknown>;
  const template = (value.items as Array<Record<string, unknown>>)[0]!;
  const items = [0, 1, 2].map((index) => {
    const item = structuredClone(template);
    const itemId = `gate-e-failed-population-${index}`;
    item.corpusItemId = itemId;
    item.contextHash = sha256(`context:${index}`);
    item.requestEnvelopeHash = sha256(`request:${index}`);
    item.candidateOutputHash = sha256(`candidate:${index}`);
    item.interpretationRequestEnvelopeHash = sha256(`interpret-request:${index}`);
    item.interpretationOutputHash = sha256(`interpret-output:${index}`);
    const score = item.score as Record<string, unknown>;
    score.corpusItemId = itemId;
    if (index === 2) {
      score.disposition = "FAILED";
      score.claimSafety = 0;
      score.reasonCodes = ["GATE_E_CLAIM_SAFETY_FAILED"];
    }
    return item;
  });
  value.items = items;
  value.summary = {
    schemaVersion: 1,
    contractVersion: "DF10_GATE_E_TECHNICAL_SCORE_SUMMARY_V1",
    disposition: "TECHNICAL_ASSERTIONS_FAILED",
    population: 3,
    scored: 3,
    eligibleCoverage: 1,
    claimSafety: 2 / 3,
    contextIntegrity: 1,
    sideEffectViolations: 0,
    mustPass: 2 / 3,
    reasonCodes: [
      "GATE_E_CLAIM_SAFETY_FAILED",
      "GATE_E_MUST_PASS_ASSERTION_FAILED",
    ],
  };
  return value;
}

async function appendBodySql(
  client: PoolClient,
  body: ReturnType<typeof evidenceBody>,
  notAfter: string,
  overrideNotAfter = notAfter,
) {
  const canonical = canonicalJsonV1(body);
  const evidenceHash = sha256(canonical);
  const binding = classifyGateEEvidenceRecordV3({ evidenceHash, evidence: body, notAfter });
  return client.query<{ disposition: string; admitted_at: Date | null }>(
    `SELECT * FROM lana_gate_e_append_evidence_v2(
      $1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz
    )`,
    [evidenceHash, binding.recordKind, binding.contractVersion, canonical,
      binding.registrationCommit, binding.manifestHash, binding.scoredRunRevision,
      binding.evidenceBodyHash, overrideNotAfter],
  );
}

async function appendRawSql(
  client: PoolClient,
  evidence: Readonly<Record<string, unknown>>,
  recordKind: "BODY" | "FINALIZATION",
  registrationCommit: string,
  manifestHash: string,
  scoredRunRevision: string,
  evidenceBodyHash: string | null,
  notAfter: string,
) {
  const canonical = canonicalJsonV1(evidence);
  return client.query(
    `SELECT * FROM lana_gate_e_append_evidence_v2(
      $1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz
    )`,
    [sha256(canonical), recordKind, evidence.contractVersion, canonical,
      registrationCommit, manifestHash, scoredRunRevision, evidenceBodyHash,
      notAfter],
  );
}

postgresDescribe("Gate E V2 durable PostgreSQL evidence admission", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl!, max: 8 });
    await migrateUp(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
  });

  it("atomically admits BODY and cross-bound FINALIZATION by DB boundary time", async () => {
    const store = new PostgresGateEEvidenceStoreV2(databaseUrl!);
    const body = evidenceBody();
    const bodyHash = sha256(canonicalJsonV1(body));
    const notAfter = new Date(Date.now() + 10_000).toISOString();
    try {
      const bodyReceipt = await store.appendBeforeDeadlineAtomically({
        evidenceHash: bodyHash,
        evidence: body,
        notAfter,
        signal: new AbortController().signal,
      });
      expect(bodyReceipt.disposition).toBe("APPENDED");
      expect(bodyReceipt.admittedAt).not.toBeNull();
      expect(Date.parse(bodyReceipt.admittedAt!)).toBeLessThanOrEqual(Date.parse(notAfter));

      const terminal = finalization(bodyHash, body.scoredRunRevision, notAfter);
      const terminalHash = sha256(canonicalJsonV1(terminal));
      const terminalReceipt = await store.appendBeforeDeadlineAtomically({
        evidenceHash: terminalHash,
        evidence: terminal,
        notAfter,
        signal: new AbortController().signal,
      });
      expect(terminalReceipt.disposition).toBe("APPENDED");
      expect(Date.parse(terminalReceipt.admittedAt!))
        .toBeGreaterThanOrEqual(Date.parse(bodyReceipt.admittedAt!));
      await expect(store.readByHash(terminalHash)).resolves.toMatchObject({
        evidence: terminal,
        admittedAt: terminalReceipt.admittedAt,
      });

      const otherBody = evidenceBody();
      const otherBodyHash = sha256(canonicalJsonV1(otherBody));
      await store.appendBeforeDeadlineAtomically({
        evidenceHash: otherBodyHash,
        evidence: otherBody,
        notAfter,
        signal: new AbortController().signal,
      });
      const wrongRevision = "f".repeat(40);
      const mismatchedTerminal = finalization(otherBodyHash, wrongRevision, notAfter);
      await expect(store.appendBeforeDeadlineAtomically({
        evidenceHash: sha256(canonicalJsonV1(mismatchedTerminal)),
        evidence: mismatchedTerminal,
        notAfter,
        signal: new AbortController().signal,
      })).rejects.toThrow("GATE_E_EVIDENCE_FINALIZATION_BODY_INVALID");

      const invalidTerminal = { ...terminal, finalClean: false };
      const directClient = await pool.connect();
      try {
        await expect(appendRawSql(
          directClient,
          invalidTerminal,
          "FINALIZATION",
          body.registrationProvenance.registrationCommit,
          body.manifestHash,
          body.scoredRunRevision,
          bodyHash,
          notAfter,
        )).rejects.toThrow(/GATE_E_EVIDENCE_FINALIZATION_BINDING_INVALID/iu);
      } finally {
        directClient.release();
      }
    } finally {
      await store.close();
    }
  });

  it("serializes concurrent identical writes and rejects binding/deadline conflicts", async () => {
    const firstStore = new PostgresGateEEvidenceStoreV2(databaseUrl!);
    const secondStore = new PostgresGateEEvidenceStoreV2(databaseUrl!);
    const body = evidenceBody();
    const evidenceHash = sha256(canonicalJsonV1(body));
    const notAfter = new Date(Date.now() + 10_000).toISOString();
    try {
      const results = await Promise.all([firstStore, secondStore].map((store) =>
        store.appendBeforeDeadlineAtomically({
          evidenceHash,
          evidence: body,
          notAfter,
          signal: new AbortController().signal,
        })
      ));
      expect(results.map(({ disposition }) => disposition).sort()).toEqual([
        "ALREADY_PRESENT", "APPENDED",
      ]);
      expect(results[0]?.admittedAt).toBe(results[1]?.admittedAt);

      const client = await pool.connect();
      try {
        const conflict = await appendBodySql(
          client,
          body,
          notAfter,
          new Date(Date.parse(notAfter) + 1_000).toISOString(),
        );
        expect(conflict.rows[0]?.disposition).toBe("HASH_CONFLICT");
      } finally {
        client.release();
      }

      const conflictingBody = evidenceBody();
      const firstDeadline = new Date(Date.now() + 10_000).toISOString();
      const secondDeadline = new Date(Date.parse(firstDeadline) + 1_000).toISOString();
      const firstClient = await pool.connect();
      const secondClient = await pool.connect();
      try {
        const conflicting = await Promise.all([
          appendBodySql(firstClient, conflictingBody, firstDeadline),
          appendBodySql(secondClient, conflictingBody, firstDeadline, secondDeadline),
        ]);
        expect(conflicting.map((result) => result.rows[0]?.disposition).sort())
          .toEqual(["APPENDED", "HASH_CONFLICT"]);
      } finally {
        firstClient.release();
        secondClient.release();
      }
    } finally {
      await Promise.all([firstStore.close(), secondStore.close()]);
    }
  });

  it("returns immutable original admission metadata on an identical retry after deadline", async () => {
    const store = new PostgresGateEEvidenceStoreV2(databaseUrl!);
    const body = evidenceBody();
    const evidenceHash = sha256(canonicalJsonV1(body));
    const notAfter = new Date(Date.now() + 700).toISOString();
    try {
      const first = await store.appendBeforeDeadlineAtomically({
        evidenceHash, evidence: body, notAfter,
        signal: new AbortController().signal,
      });
      await pool.query("SELECT pg_sleep(0.8)");
      const retry = await store.appendBeforeDeadlineAtomically({
        evidenceHash, evidence: body, notAfter,
        signal: new AbortController().signal,
      });
      expect(first.disposition).toBe("APPENDED");
      expect(retry).toEqual({
        disposition: "ALREADY_PRESENT",
        evidenceHash,
        admittedAt: first.admittedAt,
      });
    } finally {
      await store.close();
    }
  });

  it("durably preserves failed items in the full-population denominator", async () => {
    const store = new PostgresGateEEvidenceStoreV2(databaseUrl!);
    const body = failedPopulationBody();
    const evidenceHash = sha256(canonicalJsonV1(body));
    try {
      await expect(store.appendBeforeDeadlineAtomically({
        evidenceHash,
        evidence: body,
        notAfter: new Date(Date.now() + 10_000).toISOString(),
        signal: new AbortController().signal,
      })).resolves.toMatchObject({ disposition: "APPENDED", evidenceHash });
      await expect(store.readByHash(evidenceHash)).resolves.toMatchObject({
        evidence: body,
      });
    } finally {
      await store.close();
    }
  });

  it("rolls back when the final deferred DB-clock boundary misses notAfter", async () => {
    const body = evidenceBody();
    const evidenceHash = sha256(canonicalJsonV1(body));
    const notAfter = new Date(Date.now() + 300).toISOString();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      expect((await appendBodySql(client, body, notAfter)).rows[0]?.disposition)
        .toBe("APPENDED");
      await client.query("SELECT pg_sleep(0.5)");
      await expect(client.query("COMMIT")).rejects.toMatchObject({ code: "23514" });
      await client.query("ROLLBACK");
      const absent = await pool.query(
        "SELECT * FROM lana_gate_e_read_evidence_by_hash_v2($1)",
        [evidenceHash],
      );
      expect(absent.rowCount).toBe(0);
    } finally {
      client.release();
    }
  });

  it("guards rollback, append-only tables, and least-privilege roles", async () => {
    const body = evidenceBody();
    const hash = sha256(canonicalJsonV1(body));
    const notAfter = new Date(Date.now() + 10_000).toISOString();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await appendBodySql(client, body, notAfter);
      await client.query("ROLLBACK");
      expect((await pool.query(
        "SELECT * FROM lana_gate_e_read_evidence_by_hash_v2($1)", [hash],
      )).rowCount).toBe(0);

      const malformed = structuredClone(evidenceBody());
      (malformed.items[0]!.score as Record<string, unknown>).claimSafety = "1";
      await expect(appendRawSql(
        client,
        malformed,
        "BODY",
        malformed.registrationProvenance.registrationCommit,
        malformed.manifestHash,
        malformed.scoredRunRevision,
        null,
        notAfter,
      )).rejects.toThrow(/GATE_E_EVIDENCE_ITEM_SHAPE_INVALID/iu);

      const store = new PostgresGateEEvidenceStoreV2(databaseUrl!);
      try {
        await store.appendBeforeDeadlineAtomically({
          evidenceHash: hash, evidence: body, notAfter,
          signal: new AbortController().signal,
        });
      } finally { await store.close(); }

      await expect(pool.query(
        "UPDATE gate_e_evidence_records_v2 SET manifest_hash = manifest_hash WHERE evidence_hash = $1",
        [hash],
      )).rejects.toThrow(/append-only/iu);
      await expect(pool.query(
        "DELETE FROM gate_e_evidence_admissions_v2 WHERE evidence_hash = $1", [hash],
      )).rejects.toThrow(/append-only/iu);
      await expect(pool.query(
        "TRUNCATE gate_e_evidence_admissions_v2, gate_e_evidence_records_v2",
      ))
        .rejects.toThrow(/append-only/iu);

      await client.query("SET ROLE lana_gate_e_evidence_reader");
      await expect(appendBodySql(client, evidenceBody(), notAfter))
        .rejects.toMatchObject({ code: "42501" });
      await client.query("RESET ROLE");
      await client.query("SET ROLE lana_gate_e_evidence_writer");
      await expect(client.query(
        "INSERT INTO gate_e_evidence_admissions_v2 (evidence_hash, admitted_at) VALUES ($1, now())",
        [hash],
      )).rejects.toMatchObject({ code: "42501" });
      await client.query("RESET ROLE");

      const roles = await client.query<{
        rolcanlogin: boolean;
        rolsuper: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolinherit: boolean;
        rolreplication: boolean;
        rolbypassrls: boolean;
        inherited_roles: string;
      }>(`
        SELECT r.rolcanlogin, r.rolsuper, r.rolcreatedb, r.rolcreaterole,
               r.rolinherit, r.rolreplication, r.rolbypassrls,
               count(m.roleid)::text AS inherited_roles
          FROM pg_roles r
          LEFT JOIN pg_auth_members m ON m.member = r.oid
         WHERE r.rolname IN (
           'lana_gate_e_evidence_writer', 'lana_gate_e_evidence_reader'
         )
         GROUP BY r.oid, r.rolcanlogin, r.rolsuper, r.rolcreatedb,
                  r.rolcreaterole, r.rolinherit, r.rolreplication,
                  r.rolbypassrls
      `);
      expect(roles.rows).toHaveLength(2);
      for (const role of roles.rows) {
        expect(role).toEqual({
          rolcanlogin: false,
          rolsuper: false,
          rolcreatedb: false,
          rolcreaterole: false,
          rolinherit: false,
          rolreplication: false,
          rolbypassrls: false,
          inherited_roles: "0",
        });
      }
    } finally {
      try { await client.query("RESET ROLE"); } catch { /* disposable DB */ }
      client.release();
    }
  });

  it("fails closed on reader corruption and a connection-ambiguous COMMIT", async () => {
    const corruptStore = new PostgresGateEEvidenceStoreV2(databaseUrl!);
    const corruptBody = evidenceBody();
    const corruptHash = sha256(canonicalJsonV1(corruptBody));
    const notAfter = new Date(Date.now() + 20_000).toISOString();
    await corruptStore.appendBeforeDeadlineAtomically({
      evidenceHash: corruptHash, evidence: corruptBody, notAfter,
      signal: new AbortController().signal,
    });
    const corruptionClient = await pool.connect();
    await corruptionClient.query("SET session_replication_role = replica");
    try {
      await corruptionClient.query(
        "UPDATE gate_e_evidence_records_v2 SET manifest_hash = $2 WHERE evidence_hash = $1",
        [corruptHash, "0".repeat(64)],
      );
    } finally {
      await corruptionClient.query("SET session_replication_role = origin");
      corruptionClient.release();
    }
    await expect(corruptStore.readByHash(corruptHash))
      .rejects.toThrow("GATE_E_EVIDENCE_READER_CORRUPT");
    await corruptStore.close();

    await pool.query(`
      CREATE OR REPLACE FUNCTION gate_e_test_delay_commit_v2()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN PERFORM pg_sleep(2); RETURN NULL; END $$;
      CREATE CONSTRAINT TRIGGER gate_e_test_delay_commit_v2
      AFTER INSERT ON gate_e_evidence_records_v2
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
      EXECUTE FUNCTION gate_e_test_delay_commit_v2();
    `);
    const ambiguousUrl = new URL(databaseUrl!);
    ambiguousUrl.searchParams.set("application_name", "gate_e_ambiguity_test");
    const ambiguousStore = new PostgresGateEEvidenceStoreV2(ambiguousUrl.toString());
    const ambiguousBody = evidenceBody();
    const ambiguousHash = sha256(canonicalJsonV1(ambiguousBody));
    const pending = ambiguousStore.appendBeforeDeadlineAtomically({
      evidenceHash: ambiguousHash,
      evidence: ambiguousBody,
      notAfter,
      signal: new AbortController().signal,
    });
    let terminated = false;
    for (let attempt = 0; attempt < 100 && !terminated; attempt += 1) {
      const active = await pool.query<{ pid: number }>(
        `SELECT pid FROM pg_stat_activity
          WHERE application_name = 'gate_e_ambiguity_test'
            AND query = 'COMMIT' AND state = 'active'`,
      );
      if (active.rows[0]) {
        terminated = Boolean((await pool.query<{ stopped: boolean }>(
          "SELECT pg_terminate_backend($1) AS stopped", [active.rows[0].pid],
        )).rows[0]?.stopped);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    expect(terminated).toBe(true);
    await expect(pending).rejects.toThrow("GATE_E_EVIDENCE_COMMIT_AMBIGUOUS");
    await ambiguousStore.close();
    await pool.query("DROP TRIGGER gate_e_test_delay_commit_v2 ON gate_e_evidence_records_v2");
    await pool.query("DROP FUNCTION gate_e_test_delay_commit_v2()");
  }, 15_000);

  it("reverses migration 0034 cleanly in the disposable database", async () => {
    const previous = process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK;
    process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK = "true";
    try {
      await expect(migrateDownOne(pool)).resolves.toEqual({
        name: "0034_gate_e_evidence_store_v2",
        direction: "down",
      });
      const boundary = await pool.query<{ function_count: string; role_count: string }>(`
        SELECT
          (SELECT count(*) FROM pg_proc
            WHERE proname IN (
              'lana_gate_e_append_evidence_v2',
              'lana_gate_e_read_evidence_by_hash_v2'
            ))::text AS function_count,
          (SELECT count(*) FROM pg_roles
            WHERE rolname IN (
              'lana_gate_e_evidence_writer',
              'lana_gate_e_evidence_reader'
            ))::text AS role_count
      `);
      expect(boundary.rows[0]).toEqual({ function_count: "0", role_count: "0" });
    } finally {
      if (previous === undefined) {
        delete process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK;
      } else {
        process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK = previous;
      }
    }
  });
});
