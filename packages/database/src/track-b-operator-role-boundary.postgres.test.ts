import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { migrateUp } from "./migrate.js";
import { PostgresDf13CommerceCutoverFenceStore } from "./df13-commerce-cutover-fence.js";
import { PostgresTrackBCommerceAuthorityWriter } from "./track-b-commerce-authority-writer.js";

const baseUrl = process.env.TRACK_B_OPERATOR_ROLE_TEST_DATABASE_URL;
const postgresDescribe = baseUrl ? describe.sequential : describe.skip;
const role = "lana_track_b_authority_operator";
const page = "1198992073286645";

postgresDescribe("0040 Track B operator PostgreSQL boundary", () => {
  const databaseName = `track_b_operator_${randomBytes(6).toString("hex")}`;
  let admin: Pool;
  let pool: Pool;
  let operator: Pool;
  let operatorUrl: URL;

  beforeAll(async () => {
    const parsed = new URL(baseUrl!);
    const adminUrl = new URL(parsed); adminUrl.pathname = "/postgres";
    admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
    await admin.query("SELECT pg_advisory_lock(hashtextextended('track-b-0040-test-role',0))");
    await admin.query(`DROP ROLE IF EXISTS ${role}`);
    await admin.query(`CREATE DATABASE ${databaseName}`);
    const testUrl = new URL(parsed); testUrl.pathname = `/${databaseName}`;
    operatorUrl = new URL(testUrl);
    pool = new Pool({ connectionString: testUrl.toString(), max: 1 });
    await migrateUp(pool);
    for (const name of ["0035_df13_commerce_behavior_mode", "0036_df13_commerce_authority_fence", "0037_track_b_commerce_authority_replacement", "0038_track_b_commerce_admission_gate", "0039_track_b_v2_lkg_cutover_fence"]) {
      const sql = await readFile(resolve(import.meta.dirname, `../pending-migrations/${name}.up.sql`), "utf8");
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations(migration_name,checksum_sha256) VALUES($1,$2)", [name, createHash("sha256").update(sql).digest("hex")]);
    }
    await admin.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS`);
    const sql = await readFile(resolve(import.meta.dirname, "../pending-migrations/0040_track_b_operator_role_boundary.up.sql"), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations(migration_name,checksum_sha256) VALUES($1,$2)", ["0040_track_b_operator_role_boundary", createHash("sha256").update(sql).digest("hex")]);
    await admin.query(`ALTER ROLE ${role} LOGIN PASSWORD 'track-b-0040-test-only'`);
    operatorUrl.username = role; operatorUrl.password = "track-b-0040-test-only";
    operator = new Pool({ connectionString: operatorUrl.toString(), max: 1 });
  }, 60_000);

  afterAll(async () => {
    await operator?.end();
    await pool?.end();
    if (admin) {
      await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1", [databaseName]);
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
      await admin.query(`DROP ROLE IF EXISTS ${role}`);
      await admin.query("SELECT pg_advisory_unlock(hashtextextended('track-b-0040-test-role',0))");
      await admin.end();
    }
  });

  it("allows exact-page reads and hides cross-page rows", async () => {
    await pool.query("INSERT INTO pages(page_id,page_alias,meta_app_id) VALUES($1,'approved','app'),('other','other','app') ON CONFLICT DO NOTHING", [page]);
    await pool.query("INSERT INTO webhook_inbox(page_id,event_key,conversation_hash,signature_key_version,status) VALUES($1,'approved-event','approved','v1','RECEIVED'),('other','other-event','other','v1','RECEIVED')", [page]);
    const visible = await operator.query("SELECT page_id,status FROM webhook_inbox ORDER BY page_id");
    expect(visible.rows).toEqual([{ page_id: page, status: "RECEIVED" }]);
  });

  it("preserves the exact 0039 schema identity and rejects trigger configuration drift", async () => {
    const writer = new PostgresTrackBCommerceAuthorityWriter(operatorUrl.toString(), { restrictedOperator: true });
    await expect(writer.readTrackBV2LkgSchemaCompatibility()).resolves.toMatchObject({
      status: "EXACT", source: "DATABASE", migrationSchemaHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    try {
      await pool.query("ALTER FUNCTION public.guard_df13_commerce_cutover_fence_insert_identity() SET search_path=pg_catalog,public");
      await expect(writer.readTrackBV2LkgSchemaCompatibility()).resolves.toEqual({
        status: "AMBIGUOUS", source: "DATABASE", migrationSchemaHash: null,
      });
    } finally {
      await pool.query("ALTER FUNCTION public.guard_df13_commerce_cutover_fence_insert_identity() RESET search_path");
      await writer.close();
    }
    const restored = new PostgresTrackBCommerceAuthorityWriter(operatorUrl.toString(), { restrictedOperator: true });
    await expect(restored.readTrackBV2LkgSchemaCompatibility()).resolves.toMatchObject({ status: "EXACT" });
    await restored.close();
  });

  it("executes the fixed-scope acquire, CAS, reverse-CAS, and release lifecycle", async () => {
    const operationId = "40000000-0000-4000-8000-000000000010";
    const versionId = "40000000-0000-4000-8000-000000000012";
    const contentHash = "sha256:95ead755ea456c1e01c215d2421c2cf23f64fb536168ed49d5729bc4ec91f394";
    const bundle = "56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8";
    await pool.query("INSERT INTO runtime_behavior_mode_versions(mode_version_id,page_id,channel,schema_version,confirmation_mode,sales_authority_mode,state_read_mode,authority_bundle_hash,content_hash,created_by,reason,created_at) VALUES($1,$2,'MESSENGER',1,'V2_ACTIVE','COMMERCE','LEGACY',$3,$4,'fixture','fixture',now())", [versionId, page, bundle, contentHash]);
    await pool.query("INSERT INTO runtime_behavior_mode_pointers(page_id,channel,active_version_id,pointer_revision,updated_by,reason,updated_at) VALUES($1,'MESSENGER',$2,1,'fixture','fixture',now())", [page, versionId]);
    const writer = new PostgresTrackBCommerceAuthorityWriter(operatorUrl.toString(), { restrictedOperator: true });
    const fence = new PostgresDf13CommerceCutoverFenceStore(operatorUrl.toString(), 60_000, true);
    const identity = { modeVersionId: versionId, contentHash, pointerRevision: 1, authorityBundleHash: bundle };
    const prepared = await writer.prepareTarget({ pageId: page, channel: "MESSENGER", expectedCurrent: identity,
      actor: "TRACK_B_B3_2_WRITER", reason: "TRACK_B_B3_2_PREPARE:40000000-0000-4000-8000-000000000013" });
    expect(prepared.modeVersionId).toBe(versionId);
    const acquired = await fence.acquire({ operationId, pageId: page, channel: "MESSENGER",
      preCutover: { modeVersionId: versionId, contentHash, pointerRevision: 1 },
      target: { modeVersionId: versionId, contentHash, authorityBundleHash: bundle } });
    expect(acquired.status).toBe("HELD");
    if (acquired.status !== "HELD") throw new Error("fixture acquire failed");
    const forward = await writer.mutateExactPointer({ pageId: page, channel: "MESSENGER",
      operation: "ACTIVATE_V2_CANDIDATE", expectedCurrent: identity,
      target: { modeVersionId: versionId, contentHash, authorityBundleHash: bundle }, lease: acquired.lease,
      actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:${operationId}` });
    expect(forward.pointerRevision).toBe(2);
    const reverse = await writer.mutateExactPointer({ pageId: page, channel: "MESSENGER",
      operation: "ROLLBACK_TO_LKG_V2", expectedCurrent: { ...identity, pointerRevision: 2 },
      target: { modeVersionId: versionId, contentHash, authorityBundleHash: bundle }, lease: acquired.lease,
      actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_ROLLBACK_TO_LKG_V2:${operationId}` });
    expect(reverse.pointerRevision).toBe(3);
    expect(await fence.release(acquired.lease)).toEqual({ status: "RELEASED" });
    const ambiguousOperation = "40000000-0000-4000-8000-000000000014";
    const ambiguous = await fence.acquire({ operationId: ambiguousOperation, pageId: page, channel: "MESSENGER",
      preCutover: { modeVersionId: versionId, contentHash, pointerRevision: 3 },
      target: { modeVersionId: versionId, contentHash, authorityBundleHash: bundle } });
    if (ambiguous.status !== "HELD") throw new Error("fixture ambiguity acquire failed");
    await writer.mutateExactPointer({ pageId: page, channel: "MESSENGER", operation: "ACTIVATE_V2_CANDIDATE",
      expectedCurrent: { ...identity, pointerRevision: 3 }, target: { modeVersionId: versionId, contentHash, authorityBundleHash: bundle },
      lease: ambiguous.lease, actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:${ambiguousOperation}` });
    await pool.query("INSERT INTO runtime_behavior_mode_activation_audit(page_id,channel,previous_version_id,new_version_id,new_pointer_revision,actor,reason,occurred_at) VALUES($1,'MESSENGER',$2,$2,4,'conflict','conflict',now())", [page, versionId]);
    await expect(writer.mutateExactPointer({ pageId: page, channel: "MESSENGER", operation: "ROLLBACK_TO_LKG_V2",
      expectedCurrent: { ...identity, pointerRevision: 4 }, target: { modeVersionId: versionId, contentHash, authorityBundleHash: bundle },
      lease: ambiguous.lease, actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_ROLLBACK_TO_LKG_V2:${ambiguousOperation}` })).rejects.toThrow(/PRIOR_AUDIT_INVALID/u);
    expect((await pool.query("SELECT pointer_revision FROM runtime_behavior_mode_pointers WHERE page_id=$1", [page])).rows[0]?.pointer_revision).toBe("4");
    expect(await fence.release(ambiguous.lease)).toEqual({ status: "RELEASED" });
    await Promise.all([writer.close(), fence.close()]);
  });

  it("rejects an expired-lease token reuse and invalidates the old token on fresh reacquire", async () => {
    const operationId = "40000000-0000-4000-8000-000000000020";
    const versionId = "40000000-0000-4000-8000-000000000012";
    const contentHash = "sha256:95ead755ea456c1e01c215d2421c2cf23f64fb536168ed49d5729bc4ec91f394";
    const bundle = "56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8";
    await pool.query("INSERT INTO runtime_behavior_mode_versions(mode_version_id,page_id,channel,schema_version,confirmation_mode,sales_authority_mode,state_read_mode,authority_bundle_hash,content_hash,created_by,reason,created_at) VALUES($1,$2,'MESSENGER',1,'V2_ACTIVE','COMMERCE','LEGACY',$3,$4,'fixture','fixture',now()) ON CONFLICT (mode_version_id) DO NOTHING", [versionId, page, bundle, contentHash]);
    await pool.query("INSERT INTO runtime_behavior_mode_pointers(page_id,channel,active_version_id,pointer_revision,updated_by,reason,updated_at) VALUES($1,'MESSENGER',$2,4,'fixture','fixture',now()) ON CONFLICT (page_id,channel) DO UPDATE SET active_version_id=EXCLUDED.active_version_id,pointer_revision=EXCLUDED.pointer_revision,updated_by=EXCLUDED.updated_by,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at", [page, versionId]);
    const canonical = `{"channel":"MESSENGER","operationId":"${operationId}","pageId":"${page}","preCutover":{"contentHash":"${contentHash}","modeVersionId":"${versionId}","pointerRevision":4},"schemaVersion":1,"target":{"authorityBundleHash":"${bundle}","contentHash":"${contentHash}","modeVersionId":"${versionId}"}}`;
    const fingerprint = createHash("sha256").update(canonical).digest("hex");
    const oldHash = "d".repeat(64); const newHash = "e".repeat(64);
    const first = await operator.query("SELECT * FROM track_b_operator_acquire_fence(gen_random_uuid(),$1,$2,$3,4,$4,$5,$6,60000)", [operationId, versionId, contentHash, bundle, fingerprint, oldHash]);
    const fenceId = first.rows[0]?.result_fence_id;
    await pool.query("UPDATE df13_commerce_cutover_fences SET lease_until=clock_timestamp()-interval '1 second' WHERE fence_id=$1", [fenceId]);
    await expect(operator.query("SELECT * FROM track_b_operator_acquire_fence(gen_random_uuid(),$1,$2,$3,4,$4,$5,$6,60000)", [operationId, versionId, contentHash, bundle, fingerprint, oldHash])).rejects.toThrow(/TOKEN_REUSE/u);
    const renewed = await operator.query("SELECT * FROM track_b_operator_acquire_fence(gen_random_uuid(),$1,$2,$3,4,$4,$5,$6,60000)", [operationId, versionId, contentHash, bundle, fingerprint, newHash]);
    expect(renewed.rows[0]?.result_epoch).toBe("2");
    expect((await operator.query("SELECT track_b_operator_release_fence($1,2,$2) AS released", [fenceId, oldHash])).rows[0]?.released).toBe(false);
    expect((await operator.query("SELECT track_b_operator_release_fence($1,2,$2) AS released", [fenceId, newHash])).rows[0]?.released).toBe(true);
  });

  it("rejects direct mutation and cross-page function inputs, plus rollback while credentialed", async () => {
    await expect(operator.query("UPDATE runtime_behavior_mode_pointers SET reason='bypass' WHERE page_id=$1", [page])).rejects.toMatchObject({ code: "42501" });
    await expect(operator.query("INSERT INTO runtime_behavior_mode_activation_audit(page_id,channel,previous_version_id,new_version_id,new_pointer_revision,actor,reason,occurred_at) SELECT page_id,channel,active_version_id,active_version_id,pointer_revision,'bypass','bypass',now() FROM runtime_behavior_mode_pointers WHERE page_id=$1", [page])).rejects.toMatchObject({ code: "42501" });
    const operationId = "40000000-0000-4000-8000-000000000001";
    const versionId = "40000000-0000-4000-8000-000000000002";
    const contentHash = `sha256:${"a".repeat(64)}`;
    const bundle = "56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8";
    const canonical = `{"channel":"MESSENGER","operationId":"${operationId}","pageId":"${page}","preCutover":{"contentHash":"${contentHash}","modeVersionId":"${versionId}","pointerRevision":1},"schemaVersion":1,"target":{"authorityBundleHash":"${bundle}","contentHash":"${contentHash}","modeVersionId":"${versionId}"}}`;
    const fingerprint = createHash("sha256").update(canonical).digest("hex");
    await expect(operator.query("SELECT result_status FROM track_b_operator_acquire_fence(gen_random_uuid(),$1,$2,$3,1,$4,repeat('f',64),repeat('d',64),60000)", [operationId, versionId, contentHash, bundle])).rejects.toThrow(/FINGERPRINT_INVALID/u);
    const wrongScope = await operator.query("SELECT result_status FROM track_b_operator_acquire_fence(gen_random_uuid(),$1,$2,$3,1,$4,$5,repeat('d',64),60000)", [operationId, versionId, contentHash, bundle, fingerprint]);
    expect(wrongScope.rows).toEqual([{ result_status: "PARKED" }]);
    const down = await readFile(resolve(import.meta.dirname, "../pending-migrations/0040_track_b_operator_role_boundary.down.sql"), "utf8");
    await expect(pool.query(down)).rejects.toThrow(/deprovisioned NOLOGIN/u);
    await admin.query(`ALTER ROLE ${role} NOLOGIN`);
  });
});
