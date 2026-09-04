import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { migrateUp } from "./migrate.js";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V2 } from "./df13-commerce-authority-bundle.js";
import { PostgresDf13CommerceCutoverFenceStore } from "./df13-commerce-cutover-fence.js";
import type { Df13CommerceCutoverFenceLease } from "./df13-commerce-cutover-fence.js";
import { runtimeBehaviorModeContentHash } from "./runtime-behavior-mode.js";
import { PostgresTrackBCommerceAuthorityWriter } from "./track-b-commerce-authority-writer.js";

const baseUrl = process.env.POLICY_STORE_TEST_DATABASE_URL ?? process.env.GATE_E_STORE_TEST_DATABASE_URL;
const postgresDescribe = baseUrl ? describe.sequential : describe.skip;
const pageId = "1198992073286645";
const channel = "MESSENGER";

async function waitForDatabaseClientsToClose(admin: Pool, databaseName: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (true) {
    const result = await admin.query<{ active_clients: number }>(
      `SELECT count(*)::integer AS active_clients
         FROM pg_stat_activity
        WHERE datname = $1`,
      [databaseName],
    );
    if (result.rows[0]?.active_clients === 0) return;
    if (Date.now() >= deadline) throw new Error("TRACK_B_TEST_DATABASE_CLIENTS_DID_NOT_CLOSE");
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
  }
}

postgresDescribe("Track B B3.2 concrete PostgreSQL readback", () => {
  const databaseName = `track_b_adapter_${randomBytes(6).toString("hex")}`;
  let admin: Pool;
  let pool: Pool;
  let databaseUrl: string;
  let writer: PostgresTrackBCommerceAuthorityWriter;
  let fence: PostgresDf13CommerceCutoverFenceStore;
  let previousVersionId: string;
  let targetVersionId: string;
  let previousContentHash: string;
  let targetContentHash: string;
  let operationId: string;
  let lease: Df13CommerceCutoverFenceLease;

  beforeAll(async () => {
    const parsed = new URL(baseUrl!);
    const adminUrl = new URL(parsed);
    adminUrl.pathname = "/postgres";
    admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
    await admin.query(`CREATE DATABASE ${databaseName}`);
    const testUrl = new URL(parsed);
    testUrl.pathname = `/${databaseName}`;
    databaseUrl = testUrl.toString();
    pool = new Pool({ connectionString: databaseUrl, max: 2 });
    await migrateUp(pool);
    for (const name of [
      "0035_df13_commerce_behavior_mode",
      "0036_df13_commerce_authority_fence",
      "0037_track_b_commerce_authority_replacement",
      "0038_track_b_commerce_admission_gate",
      "0039_track_b_v2_lkg_cutover_fence",
    ]) {
      const sql = await readFile(resolve(import.meta.dirname, `../pending-migrations/${name}.up.sql`), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query("INSERT INTO schema_migrations (migration_name, checksum_sha256) VALUES ($1,$2)",
          [name, checksum]);
        await pool.query("COMMIT");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }
    const v2LkgDown = await readFile(resolve(import.meta.dirname,
      "../pending-migrations/0039_track_b_v2_lkg_cutover_fence.down.sql"), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(v2LkgDown);
      await pool.query("DELETE FROM schema_migrations WHERE migration_name=$1", [
        "0039_track_b_v2_lkg_cutover_fence",
      ]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
    const v2LkgUp = await readFile(resolve(import.meta.dirname,
      "../pending-migrations/0039_track_b_v2_lkg_cutover_fence.up.sql"), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(v2LkgUp);
      await pool.query("INSERT INTO schema_migrations (migration_name, checksum_sha256) VALUES ($1,$2)", [
        "0039_track_b_v2_lkg_cutover_fence",
        createHash("sha256").update(v2LkgUp).digest("hex"),
      ]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
    previousVersionId = randomUUID();
    previousContentHash = runtimeBehaviorModeContentHash({ confirmationMode: "V2_ACTIVE",
      salesAuthorityMode: "COMMERCE", stateReadMode: "LEGACY",
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash });
    await pool.query(`INSERT INTO runtime_behavior_mode_versions (
      mode_version_id,page_id,channel,schema_version,confirmation_mode,sales_authority_mode,
      state_read_mode,authority_bundle_hash,content_hash,created_by,reason,created_at
    ) VALUES ($1,$2,$3,1,'V2_ACTIVE','COMMERCE','LEGACY',$4,$5,'fixture','fixture',clock_timestamp())`,
    [previousVersionId, pageId, channel, DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      previousContentHash]);
    await pool.query(`INSERT INTO runtime_behavior_mode_pointers (
      page_id,channel,active_version_id,pointer_revision,updated_by,reason,updated_at
    ) VALUES ($1,$2,$3,1,'fixture','fixture revision 1',clock_timestamp())`,
    [pageId, channel, previousVersionId]);
    for (let revision = 2; revision <= 6; revision += 1) {
      await pool.query(`UPDATE runtime_behavior_mode_pointers
        SET pointer_revision=$3,updated_by='fixture',reason=$4
        WHERE page_id=$1 AND channel=$2`,
      [pageId, channel, revision, `fixture revision ${revision}`]);
    }
    writer = new PostgresTrackBCommerceAuthorityWriter(databaseUrl);
    operationId = randomUUID();
    const prepared = await writer.prepareTarget({ pageId, channel,
      expectedCurrent: { modeVersionId: previousVersionId, contentHash: previousContentHash,
        pointerRevision: 6, authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash },
      actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_PREPARE:${operationId}` });
    targetVersionId = prepared.modeVersionId;
    targetContentHash = prepared.contentHash;
    expect(targetVersionId).toBe(previousVersionId);
    fence = new PostgresDf13CommerceCutoverFenceStore(databaseUrl, 60_000);
  }, 120_000);

  afterAll(async () => {
    await fence?.close();
    await writer?.close();
    await pool?.end();
    if (admin) {
      try {
        await waitForDatabaseClientsToClose(admin, databaseName);
        await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
        for (const migrationRole of [
          "lana_gate_e_registration_writer",
          "lana_gate_e_evidence_writer",
          "lana_gate_e_evidence_reader",
        ]) {
          await admin.query(`DROP ROLE IF EXISTS ${migrationRole}`);
        }
      } finally {
        await admin.end();
      }
    }
  });

  it("proves 0038 admission and page-scoped zero-work quiescence on real PostgreSQL", async () => {
    const acquired = await fence.acquire({ operationId, pageId, channel,
      preCutover: { modeVersionId: previousVersionId, contentHash: previousContentHash,
        pointerRevision: 6 },
      target: { modeVersionId: targetVersionId, contentHash: targetContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash } });
    expect(acquired.status).toBe("HELD");
    if (acquired.status !== "HELD") throw new Error("fixture fence unavailable");
    lease = acquired.lease;
    await expect(writer.readAdmissionHold({ pageId, channel, lease: acquired.lease }))
      .resolves.toMatchObject({ status: "HELD", guardedClaims: [
        "webhook_inbox:PROCESSING", "meta_outbox:SENDING", "pancake_tag_outbox:APPLYING",
      ] });
    await expect(writer.readOperationalQuiescence({ pageId, channel })).resolves.toEqual({
      activeInbox: 0, activeMetaOutbox: 0, activePancakeOutbox: 0,
      inFlightAuthorityDependentWork: 0, queuedAuthorityDependentWork: 0,
    });
  });

  it("proves exact activation audit and fresh DATABASE startup resolution on real PostgreSQL", async () => {
    await writer.mutateExactPointer({ pageId, channel, operation: "ACTIVATE_V2_CANDIDATE",
      expectedCurrent: { modeVersionId: previousVersionId, contentHash: previousContentHash,
        pointerRevision: 6, authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash },
      target: { modeVersionId: targetVersionId, contentHash: targetContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash },
      lease, actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:${operationId}` });
    const watermark = await writer.readDatabaseClock();
    await pool.query(`INSERT INTO runtime_behavior_mode_resolution_audit (
      resolution_id,page_id,channel,confirmation_mode,mode_version_id,content_hash,
      pointer_revision,source,status,reason_codes,worker_id,pointer_updated_at,resolved_at,propagation_ms,created_at
    ) VALUES ($1,$2,$3,'V2_ACTIVE',$4,$5,7,'DATABASE','RESOLVED','{}','realtime-worker-1',
      clock_timestamp(),$6::timestamptz + interval '1 hour',0,
      $6::timestamptz - interval '0.000001 seconds')`, [randomUUID(), pageId, channel,
      targetVersionId, targetContentHash, watermark]);
    await expect(writer.readExactRuntimeResolution({ pageId, channel,
      modeVersionId: targetVersionId, contentHash: targetContentHash, pointerRevision: 7,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      workerId: "realtime-worker-1", notBefore: watermark })).resolves.toBe("MISSING");
    await pool.query(`INSERT INTO runtime_behavior_mode_resolution_audit (
      resolution_id,page_id,channel,confirmation_mode,mode_version_id,content_hash,
      pointer_revision,source,status,reason_codes,worker_id,pointer_updated_at,resolved_at,propagation_ms
    ) VALUES ($1,$2,$3,'V2_ACTIVE',$4,$5,7,'DATABASE','RESOLVED','{}','realtime-worker-1',
      clock_timestamp(),clock_timestamp(),0)`, [randomUUID(), pageId, channel, targetVersionId,
      targetContentHash]);
    await expect(writer.readExactActivationAudit({ pageId, channel, pointerRevision: 7,
      previousVersionId, previousContentHash, targetVersionId, targetContentHash,
      actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:${operationId}` }))
      .resolves.toBe("EXACT");
    await expect(writer.readExactRuntimeResolution({ pageId, channel,
      modeVersionId: targetVersionId, contentHash: targetContentHash, pointerRevision: 7,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      workerId: "realtime-worker-1", notBefore: watermark }))
      .resolves.toBe("EXACT");
  });

  it("preserves exact released-fence observation when a permitted 0039 down makes schema compatibility stale", async () => {
    const request = { operationId, pageId, channel,
      preCutover: { modeVersionId: previousVersionId, contentHash: previousContentHash,
        pointerRevision: 6 },
      target: { modeVersionId: targetVersionId, contentHash: targetContentHash,
        authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash } };
    await expect(fence.release(lease)).resolves.toEqual({ status: "RELEASED" });
    const down = await readFile(resolve(import.meta.dirname,
      "../pending-migrations/0039_track_b_v2_lkg_cutover_fence.down.sql"), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(down);
      await pool.query("DELETE FROM schema_migrations WHERE migration_name=$1", [
        "0039_track_b_v2_lkg_cutover_fence",
      ]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
    await expect(fence.observe(request)).resolves.toMatchObject({
      status: "ALREADY_RELEASED", fenceId: lease.fenceId, epoch: lease.epoch,
    });
    await expect(writer.readTrackBV2LkgSchemaCompatibility()).resolves.toEqual({
      status: "AMBIGUOUS", source: "DATABASE", migrationSchemaHash: null,
    });

    const up = await readFile(resolve(import.meta.dirname,
      "../pending-migrations/0039_track_b_v2_lkg_cutover_fence.up.sql"), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(up);
      await pool.query("INSERT INTO schema_migrations (migration_name, checksum_sha256) VALUES ($1,$2)", [
        "0039_track_b_v2_lkg_cutover_fence", createHash("sha256").update(up).digest("hex"),
      ]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  });

  it("rejects an admission trigger rebound to an otherwise identical guard in another schema", async () => {
    await expect(writer.readTrackBV2LkgSchemaCompatibility()).resolves.toMatchObject({
      status: "EXACT", source: "DATABASE", migrationSchemaHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    await pool.query("CREATE SCHEMA track_b_clone");
    const sourceResult = await pool.query(
      "SELECT pg_get_functiondef('public.guard_track_b_cutover_admission()'::regprocedure) AS definition",
    );
    const source = String(sourceResult.rows[0]?.definition ?? "");
    const clone = source.replace("FUNCTION public.guard_track_b_cutover_admission()",
      "FUNCTION track_b_clone.guard_track_b_cutover_admission()");
    if (clone === source) throw new Error("fixture guard clone source unavailable");
    await pool.query(clone);
    await pool.query("DROP TRIGGER track_b_cutover_admission_meta_outbox ON meta_outbox");
    await pool.query(`CREATE TRIGGER track_b_cutover_admission_meta_outbox
      BEFORE UPDATE ON meta_outbox
      FOR EACH ROW EXECUTE FUNCTION track_b_clone.guard_track_b_cutover_admission()`);
    await pool.query("ALTER TABLE meta_outbox ENABLE ALWAYS TRIGGER track_b_cutover_admission_meta_outbox");
    await expect(writer.readTrackBV2LkgSchemaCompatibility()).resolves.toEqual({
      status: "AMBIGUOUS", source: "DATABASE", migrationSchemaHash: null,
    });
  });
});
