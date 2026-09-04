import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const databaseUrl = process.env.POLICY_STORE_TEST_DATABASE_URL;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const pathFor = (name: string) => resolve(root, `packages/database/pending-migrations/${name}`);
const pageId = "1198992073286645";
const otherPageId = "1198992073286646";
const v2Bundle = "56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8";
const content = "sha256:95ead755ea456c1e01c215d2421c2cf23f64fb536168ed49d5729bc4ec91f394";
const currentVersion = "ccd021a6-24e3-4a46-87a0-6d63f506cb86";

test("0039 admits only exact page-scoped same-identity V2 LKG fences and rolls down fail closed", {
  skip: databaseUrl ? false : "POLICY_STORE_TEST_DATABASE_URL is not configured",
}, async () => {
  assert.ok(databaseUrl);
  const [replacementSql, upSql, downSql] = await Promise.all([
    readFile(pathFor("0037_track_b_commerce_authority_replacement.up.sql"), "utf8"),
    readFile(pathFor("0039_track_b_v2_lkg_cutover_fence.up.sql"), "utf8"),
    readFile(pathFor("0039_track_b_v2_lkg_cutover_fence.down.sql"), "utf8"),
  ]);
  const client = new Client({ connectionString: databaseUrl });
  const contender = new Client({ connectionString: databaseUrl });
  const schema = `track_b_0039_${process.pid}`;
  await Promise.all([client.connect(), contender.connect()]);
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await Promise.all([
      client.query(`SET search_path TO ${schema}, public`),
      contender.query(`SET search_path TO ${schema}, public`),
    ]);
    await client.query(`
      CREATE TABLE schema_migrations (migration_name text PRIMARY KEY, checksum_sha256 text NOT NULL);
      CREATE TABLE runtime_behavior_mode_versions (
        mode_version_id uuid PRIMARY KEY, page_id text NOT NULL, channel text NOT NULL,
        confirmation_mode text NOT NULL, sales_authority_mode text NOT NULL,
        state_read_mode text NOT NULL, authority_bundle_hash text, content_hash text NOT NULL
      );
      CREATE TABLE runtime_behavior_mode_pointers (
        page_id text NOT NULL, channel text NOT NULL, active_version_id uuid NOT NULL,
        pointer_revision bigint NOT NULL, PRIMARY KEY(page_id,channel)
      );
      CREATE TABLE df13_commerce_cutover_fences (
        fence_id uuid PRIMARY KEY, operation_id uuid NOT NULL, page_id text NOT NULL,
        channel text NOT NULL, pre_cutover_version_id uuid NOT NULL,
        pre_cutover_content_hash text NOT NULL, pre_cutover_pointer_revision bigint NOT NULL,
        target_version_id uuid NOT NULL, target_content_hash text NOT NULL,
        target_authority_bundle_hash text NOT NULL, request_fingerprint text NOT NULL,
        epoch bigint NOT NULL, token_hash text, lease_until timestamptz,
        released_at timestamptz, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
      );
      CREATE FUNCTION guard_df13_commerce_cutover_fence_insert_identity()
      RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
      CREATE TRIGGER guard_df13_commerce_cutover_fence_insert_identity
        BEFORE INSERT ON df13_commerce_cutover_fences FOR EACH ROW
        EXECUTE FUNCTION guard_df13_commerce_cutover_fence_insert_identity();
      INSERT INTO schema_migrations VALUES
        ('0036_df13_commerce_authority_fence','d709617e10554a0186b9233a404ef7faadfdf3576ba3c133efe51a56c2214425'),
        ('0037_track_b_commerce_authority_replacement','40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20'),
        ('0038_track_b_commerce_admission_gate','9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140');
      INSERT INTO runtime_behavior_mode_versions VALUES
        ('${currentVersion}','${pageId}','MESSENGER','V2_ACTIVE','COMMERCE','LEGACY','${v2Bundle}','${content}'),
        ('80000000-0000-4000-8000-000000000001','${pageId}','MESSENGER','V2_ACTIVE','COMMERCE','LEGACY','${v2Bundle}','${content}'),
        ('80000000-0000-4000-8000-000000000002','${otherPageId}','MESSENGER','V2_ACTIVE','COMMERCE','LEGACY','${v2Bundle}','${content}');
      INSERT INTO runtime_behavior_mode_pointers VALUES ('${pageId}','MESSENGER','${currentVersion}',11);
    `);
    await client.query(replacementSql);
    await client.query(upSql);

    const insertFence = (overrides: string = "") => client.query(`
      INSERT INTO df13_commerce_cutover_fences
        (fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
         pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,
         request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at)
      VALUES (gen_random_uuid(),gen_random_uuid(),'${pageId}','MESSENGER','${currentVersion}','${content}',
              11,'${currentVersion}','${content}','${v2Bundle}',repeat('a',64),1,repeat('b',64),
              clock_timestamp()+interval '1 minute',clock_timestamp(),clock_timestamp()) ${overrides}`);
    await insertFence();
    await client.query("UPDATE df13_commerce_cutover_fences SET released_at=clock_timestamp(),token_hash=NULL,lease_until=NULL");
    await assert.rejects(
      client.query(`INSERT INTO df13_commerce_cutover_fences
        SELECT gen_random_uuid(),gen_random_uuid(),page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
          pre_cutover_pointer_revision,'80000000-0000-4000-8000-000000000001',target_content_hash,
          target_authority_bundle_hash,repeat('c',64),2,repeat('d',64),clock_timestamp()+interval '1 minute',NULL,
          clock_timestamp(),clock_timestamp() FROM df13_commerce_cutover_fences LIMIT 1`),
      /authority transition is invalid/u,
    );
    await client.query("UPDATE runtime_behavior_mode_pointers SET pointer_revision=12");
    await assert.rejects(insertFence(), /pre-cutover pointer is not current/u);
    await client.query("UPDATE runtime_behavior_mode_pointers SET pointer_revision=11");
    await client.query(`INSERT INTO runtime_behavior_mode_pointers VALUES
      ('${otherPageId}','MESSENGER','80000000-0000-4000-8000-000000000002',11)`);
    await assert.rejects(client.query(`
      INSERT INTO df13_commerce_cutover_fences
        (fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
         pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,
         request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at)
      VALUES (gen_random_uuid(),gen_random_uuid(),'${otherPageId}','MESSENGER',
        '80000000-0000-4000-8000-000000000002','${content}',11,
        '80000000-0000-4000-8000-000000000002','${content}','${v2Bundle}',repeat('f',64),1,
        repeat('0',64),clock_timestamp()+interval '1 minute',clock_timestamp(),clock_timestamp())`),
    /authority transition is invalid/u);

    await client.query("BEGIN");
    await client.query("SELECT 1 FROM runtime_behavior_mode_pointers WHERE page_id=$1 AND channel='MESSENGER' FOR UPDATE", [pageId]);
    const waiting = contender.query(`
      INSERT INTO df13_commerce_cutover_fences
        (fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
         pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,
         request_fingerprint,epoch,token_hash,lease_until,created_at,updated_at)
      VALUES (gen_random_uuid(),gen_random_uuid(),'${pageId}','MESSENGER','${currentVersion}','${content}',
        11,'${currentVersion}','${content}','${v2Bundle}',repeat('1',64),2,repeat('2',64),
        clock_timestamp()+interval '1 minute',clock_timestamp(),clock_timestamp())`);
    assert.equal(await Promise.race([waiting.then(() => "DONE"), new Promise((r) => setTimeout(() => r("WAIT"), 75))]), "WAIT");
    await client.query("COMMIT");
    await waiting;

    await client.query("UPDATE df13_commerce_cutover_fences SET released_at=NULL,token_hash=repeat('e',64),lease_until=clock_timestamp()-interval '1 minute' WHERE fence_id=(SELECT fence_id FROM df13_commerce_cutover_fences LIMIT 1)");
    await assert.rejects(client.query(downSql), /0039 down requires zero unreleased cutover fences/u);
    await client.query("UPDATE df13_commerce_cutover_fences SET released_at=clock_timestamp(),token_hash=NULL,lease_until=NULL");
    await client.query(downSql);
    const restored = await client.query(`SELECT encode(public.digest(p.prosrc,'sha256'),'hex') AS hash
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname=$1 AND p.proname='guard_df13_commerce_cutover_fence_insert_identity'`, [schema]);
    assert.equal(restored.rows[0]?.hash, "c72ab14e75111ce7f216e516a6f2edc86cfd4bf53d50d9c2359d064f20bdd4e3");
    await client.query(upSql);
    await assert.rejects(client.query(upSql), /0039 requires exact 0037 replacement guard identity/u);
  } finally {
    try { await client.query("ROLLBACK"); } catch { /* no active transaction */ }
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await Promise.all([client.end(), contender.end()]);
  }
});
