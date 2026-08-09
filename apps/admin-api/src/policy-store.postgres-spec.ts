import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { AdminQueryError, type AdminIdentity } from "./types.js";
import { PostgresAdminStore } from "./store.js";

const { Pool } = pg;
const databaseUrl = process.env.POLICY_STORE_TEST_DATABASE_URL;
const postgresDescribe = databaseUrl ? describe : describe.skip;
const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/database/migrations",
);
const owner: AdminIdentity = {
  email: "owner@example.test",
  role: "OWNER",
  pageScope: "ALL",
  subject: "policy-postgres-test-owner",
};

interface Fixture {
  readonly adminPool: pg.Pool;
  readonly schema: string;
  readonly store: PostgresAdminStore;
}

let fixture: Fixture | undefined;

postgresDescribe("Admin policy destructive PostgreSQL semantics", () => {
  beforeEach(async () => {
    fixture = await createFixture(databaseUrl!);
  });

  afterEach(async () => {
    if (!fixture) return;
    await fixture.store.close();
    await fixture.adminPool.query(`DROP SCHEMA IF EXISTS "${fixture.schema}" CASCADE`);
    await fixture.adminPool.end();
    fixture = undefined;
  });

  it("rejects stale revisions before mutating pointers or tombstones", async () => {
    const versionId = await seedVersion(fixture!, "DRAFT", 3);
    const pointerId = await seedPointer(fixture!, versionId, 4);

    await assert.rejects(
      fixture!.store.deactivateArtifactPointer(owner, pointerId, {
        expectedRevision: 3,
        correlationId: randomUUID(),
      }),
      (error) => error instanceof AdminQueryError && error.code === "ADMIN_ARTIFACT_VERSION_CONFLICT",
    );
    await assert.rejects(
      fixture!.store.deleteArtifactVersion(owner, versionId, {
        expectedRevision: 2,
        correlationId: randomUUID(),
      }),
      (error) => error instanceof AdminQueryError && error.code === "ADMIN_ARTIFACT_VERSION_CONFLICT",
    );

    assert.equal(await scalar(fixture!, "SELECT revision FROM admin_active_pointers WHERE pointer_id = $1", [pointerId]), "4");
    assert.equal(await scalar(fixture!, "SELECT count(*) FROM admin_artifact_deletions", []), "0");
  });

  it("rejects deletion while any active pointer references the artifact", async () => {
    const versionId = await seedVersion(fixture!, "PUBLISHED", 5);
    await seedPointer(fixture!, versionId, 2);

    await assert.rejects(
      fixture!.store.deleteArtifactVersion(owner, versionId, {
        expectedRevision: 5,
        correlationId: randomUUID(),
      }),
      (error) => error instanceof AdminQueryError && error.code === "ADMIN_ARTIFACT_DELETE_ACTIVE",
    );
    assert.equal(await scalar(fixture!, "SELECT count(*) FROM admin_artifact_deletions", []), "0");
  });

  it("makes exact deactivation and deletion retries idempotent", async () => {
    const activeVersionId = await seedVersion(fixture!, "PUBLISHED", 5, "size-chart:retry-active");
    const pointerId = await seedPointer(fixture!, activeVersionId, 2, "PUBLISHED", "size-chart:retry-active");
    const deletionVersionId = await seedVersion(fixture!, "DRAFT", 7, "size-chart:retry-delete");

    const firstPointer = await fixture!.store.deactivateArtifactPointer(owner, pointerId, {
      expectedRevision: 2,
      correlationId: randomUUID(),
    });
    const retriedPointer = await fixture!.store.deactivateArtifactPointer(owner, pointerId, {
      expectedRevision: 2,
      correlationId: randomUUID(),
    });
    const firstDeletion = await fixture!.store.deleteArtifactVersion(owner, deletionVersionId, {
      expectedRevision: 7,
      correlationId: randomUUID(),
    });
    const retriedDeletion = await fixture!.store.deleteArtifactVersion(owner, deletionVersionId, {
      expectedRevision: 7,
      correlationId: randomUUID(),
    });

    assert.equal(firstPointer?.active, false);
    assert.equal(retriedPointer?.active, false);
    assert.equal(firstDeletion?.deleted, true);
    assert.equal(retriedDeletion?.deleted, true);
    assert.equal(await scalar(fixture!, "SELECT revision FROM admin_active_pointers WHERE pointer_id = $1", [pointerId]), "3");
    assert.equal(await scalar(fixture!, "SELECT count(*) FROM admin_artifact_events WHERE action = 'POINTER_CHANGED'", []), "1");
    assert.equal(await scalar(fixture!, "SELECT count(*) FROM admin_artifact_deletions WHERE version_id = $1", [deletionVersionId]), "1");
  });

  it("keeps tombstones append-only and prevents reactivation", async () => {
    const versionId = await seedVersion(fixture!, "DRAFT", 1);
    await fixture!.store.deleteArtifactVersion(owner, versionId, {
      expectedRevision: 1,
      correlationId: randomUUID(),
    });

    await assert.rejects(
      query(fixture!, `INSERT INTO admin_active_pointers (
        artifact_key, artifact_kind, page_id, channel, version_id, updated_by_subject
      ) VALUES ('size-chart:postgres-test','SIZE_CHART','page-1','PUBLISHED',$1,'owner')`, [versionId]),
      /deleted admin artifact version cannot be activated/u,
    );
    await assert.rejects(
      query(fixture!, "UPDATE admin_artifact_deletions SET deleted_at = now() WHERE version_id = $1", [versionId]),
      /admin_artifact_deletions is append-only/u,
    );
    await assert.rejects(
      query(fixture!, "DELETE FROM admin_artifact_deletions WHERE version_id = $1", [versionId]),
      /admin_artifact_deletions is append-only/u,
    );
  });

  it("serializes concurrent publish and deactivate without a PostgreSQL deadlock", async () => {
    const versionId = await seedVersion(fixture!, "CANARY", 4);
    const pointerId = await seedPointer(fixture!, versionId, 2, "CANARY_SHADOW");
    const advisoryKey = 171004;
    await query(fixture!, `CREATE FUNCTION block_pointer_event_for_test()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'POINTER_CHANGED' THEN
          PERFORM pg_advisory_xact_lock(${advisoryKey});
        END IF;
        RETURN NEW;
      END;
      $$`);
    await query(fixture!, `CREATE TRIGGER block_pointer_event_for_test
      BEFORE INSERT ON admin_artifact_events
      FOR EACH ROW EXECUTE FUNCTION block_pointer_event_for_test()`);

    const gate = await fixture!.adminPool.connect();
    await gate.query("BEGIN");
    await gate.query("SELECT pg_advisory_xact_lock($1)", [advisoryKey]);
    try {
      const deactivate = fixture!.store.deactivateArtifactPointer(owner, pointerId, {
        expectedRevision: 2,
        correlationId: randomUUID(),
      });
      await waitForDatabaseState(fixture!, `
        SELECT count(*)::int AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND application_name = 'lana-admin-command-api'
          AND wait_event = 'advisory'`, 1);

      const publish = fixture!.store.transitionArtifactVersion(owner, versionId, {
        expectedRevision: 4,
        action: "PUBLISH",
        pageId: "page-1",
        canaryMode: null,
        correlationId: randomUUID(),
      });
      await waitForDatabaseState(fixture!, `
        SELECT count(*)::int AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND application_name = 'lana-admin-command-api'
          AND wait_event_type = 'Lock'
          AND wait_event <> 'advisory'`, 1);

      await gate.query("COMMIT");
      const outcomes = await Promise.allSettled([deactivate, publish]);
      assert.equal(outcomes[0]?.status, "fulfilled");
      for (const outcome of outcomes) {
        if (outcome.status === "rejected") {
          const reason = outcome.reason as Error & { code?: string };
          assert.notEqual(reason.code, "40P01", reason.message);
          assert.doesNotMatch(reason.message, /deadlock detected/iu);
        }
      }
      if (outcomes[1]?.status === "rejected") {
        assert.ok(outcomes[1].reason instanceof AdminQueryError);
        assert.equal(outcomes[1].reason.code, "ADMIN_ARTIFACT_TRANSITION_INVALID");
      }
      assert.equal(await scalar(fixture!, "SELECT active FROM admin_active_pointers WHERE pointer_id = $1", [pointerId]), false);
      assert.equal(await scalar(fixture!, "SELECT count(*) FROM admin_artifact_events WHERE action = 'POINTER_CHANGED'", []), "1");
    } finally {
      await gate.query("ROLLBACK").catch(() => undefined);
      gate.release();
    }
  });
});

async function createFixture(baseUrl: string): Promise<Fixture> {
  const adminPool = new Pool({ connectionString: baseUrl, max: 4 });
  const schema = `policy_${randomUUID().replaceAll("-", "")}`;
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  await adminPool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public");
  const client = await adminPool.connect();
  try {
    await client.query(`SET search_path TO "${schema}", public`);
    await client.query(await readFile(resolve(migrationsDirectory, "0014_admin_policy_control.up.sql"), "utf8"));
    await client.query(await readFile(resolve(migrationsDirectory, "0031_admin_policy_safe_deletion.up.sql"), "utf8"));
  } finally {
    client.release();
  }
  const scopedUrl = new URL(baseUrl);
  scopedUrl.searchParams.set("options", `-c search_path=${schema},public`);
  return {
    adminPool,
    schema,
    store: new PostgresAdminStore(scopedUrl.toString(), scopedUrl.toString()),
  };
}

async function seedVersion(
  current: Fixture,
  lifecycle: "DRAFT" | "CANARY" | "PUBLISHED",
  revision: number,
  artifactKey = "size-chart:postgres-test",
): Promise<string> {
  const content = { schemaVersion: 1, kind: "SIZE_CHART", chart: { bands: [] } };
  const result = await query(current, `INSERT INTO admin_artifact_versions (
      artifact_key, artifact_kind, version_number, lifecycle, revision,
      content, content_hash, created_by_subject, updated_by_subject
    ) VALUES ($1,'SIZE_CHART',1,$2,$3,$4::jsonb,$5,'owner','owner')
    RETURNING version_id`, [
    artifactKey,
    lifecycle,
    revision,
    JSON.stringify(content),
    structuredContentHash(content),
  ]);
  return String(result.rows[0]?.version_id);
}

function structuredContentHash(content: unknown): string {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, canonicalize(item)]),
      );
    }
    return value;
  };
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(content))).digest("hex")}`;
}

async function seedPointer(
  current: Fixture,
  versionId: string,
  revision: number,
  channel: "CANARY_SHADOW" | "PUBLISHED" = "PUBLISHED",
  artifactKey = "size-chart:postgres-test",
): Promise<string> {
  const result = await query(current, `INSERT INTO admin_active_pointers (
      artifact_key, artifact_kind, page_id, channel, version_id,
      active, revision, updated_by_subject
    ) VALUES ($1,'SIZE_CHART','page-1',$2,$3,true,$4,'owner')
    RETURNING pointer_id`, [artifactKey, channel, versionId, revision]);
  return String(result.rows[0]?.pointer_id);
}

async function query(current: Fixture, sql: string, values: readonly unknown[] = []): Promise<pg.QueryResult> {
  const client = await current.adminPool.connect();
  try {
    await client.query(`SET search_path TO "${current.schema}", public`);
    return await client.query(sql, [...values]);
  } finally {
    client.release();
  }
}

async function scalar(current: Fixture, sql: string, values: readonly unknown[]): Promise<unknown> {
  const result = await query(current, sql, values);
  return result.rows[0]?.[Object.keys(result.rows[0] ?? {})[0] ?? ""];
}

async function waitForDatabaseState(current: Fixture, sql: string, expected: number): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = await current.adminPool.query<{ count: number }>(sql);
    if (Number(result.rows[0]?.count ?? 0) >= expected) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error("Timed out waiting for PostgreSQL concurrency state");
}
