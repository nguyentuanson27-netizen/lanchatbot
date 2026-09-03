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
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`);
      await admin.end();
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
    const resolvedAt = new Date();
    await pool.query(`INSERT INTO runtime_behavior_mode_resolution_audit (
      resolution_id,page_id,channel,confirmation_mode,mode_version_id,content_hash,
      pointer_revision,source,status,reason_codes,worker_id,pointer_updated_at,resolved_at,propagation_ms
    ) VALUES ($1,$2,$3,'V2_ACTIVE',$4,$5,7,'DATABASE','RESOLVED','{}','realtime-worker-1',
      clock_timestamp(),$6,0)`, [randomUUID(), pageId, channel, targetVersionId, targetContentHash,
      resolvedAt]);
    await expect(writer.readExactActivationAudit({ pageId, channel, pointerRevision: 7,
      previousVersionId, previousContentHash, targetVersionId, targetContentHash,
      actor: "TRACK_B_B3_2_WRITER", reason: `TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:${operationId}` }))
      .resolves.toBe("EXACT");
    await expect(writer.readExactRuntimeResolution({ pageId, channel,
      modeVersionId: targetVersionId, contentHash: targetContentHash, pointerRevision: 7,
      authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V2.contractHash,
      workerId: "realtime-worker-1", notBefore: new Date(resolvedAt.getTime() - 1_000).toISOString() }))
      .resolves.toBe("EXACT");
  });
});
