import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";
import {
  LocalEnvelopeCipher,
  PostgresRealtimeInboxStore,
  PostgresTrackBCommerceAuthorityWriter,
} from "@lana/database";

const databaseUrl = process.env.POLICY_STORE_TEST_DATABASE_URL;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const upPath = resolve(repositoryRoot,
  "packages/database/pending-migrations/0038_track_b_commerce_admission_gate.up.sql");
const downPath = resolve(repositoryRoot,
  "packages/database/pending-migrations/0038_track_b_commerce_admission_gate.down.sql");
const pageId = "1198992073286645";
const otherPageId = "1198992073286646";

async function configure(client: Client, schema: string): Promise<void> {
  await client.query(`SET search_path TO ${schema}, public`);
}

async function insertWork(client: Client, table: string, idColumn: string, id: string,
  page: string, status: string): Promise<void> {
  await client.query(
    `INSERT INTO ${table} (${idColumn}, page_id, status) VALUES ($1,$2,$3)`,
    [id, page, status],
  );
}

async function claim(client: Client, table: string, idColumn: string, id: string,
  status: string): Promise<number> {
  const result = await client.query(
    `UPDATE ${table}
        SET status=$2, lease_owner='worker', lease_token=gen_random_uuid(),
            lease_until=clock_timestamp() + interval '1 minute'
      WHERE ${idColumn}=$1`,
    [id, status],
  );
  return result.rowCount ?? 0;
}

test("0038 atomically holds Track B claims, permits drain, isolates pages, and rolls down safely", {
  skip: databaseUrl ? false : "POLICY_STORE_TEST_DATABASE_URL is not configured",
}, async () => {
  assert.ok(databaseUrl);
  const [upSql, downSql] = await Promise.all([
    readFile(upPath, "utf8"),
    readFile(downPath, "utf8"),
  ]);
  const client = new Client({ connectionString: databaseUrl });
  const contender = new Client({ connectionString: databaseUrl });
  const schema = `track_b_0038_${process.pid}`;
  await Promise.all([client.connect(), contender.connect()]);
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await configure(client, schema);
    await configure(contender, schema);
    await client.query(`
      CREATE TABLE df13_commerce_cutover_fences (
        fence_id uuid PRIMARY KEY,
        page_id text NOT NULL,
        channel text NOT NULL,
        epoch bigint NOT NULL DEFAULT 1,
        token_hash text,
        lease_until timestamptz,
        released_at timestamptz
      );
      CREATE TABLE schema_migrations (
        migration_name text PRIMARY KEY, checksum_sha256 text NOT NULL
      );
      CREATE TABLE webhook_inbox (
        inbox_id uuid PRIMARY KEY, page_id text NOT NULL, status text NOT NULL,
        event_key text NOT NULL DEFAULT 'event', conversation_hash text NOT NULL DEFAULT 'conversation',
        provider_occurred_at timestamptz, received_at timestamptz NOT NULL DEFAULT now(),
        receive_sequence bigint NOT NULL DEFAULT 1, attempt_count integer NOT NULL DEFAULT 0,
        next_attempt_at timestamptz, event_kind text NOT NULL DEFAULT 'CUSTOMER',
        evaluation_group_id uuid, lease_owner text, lease_token uuid, lease_until timestamptz,
        payload_ciphertext bytea, payload_nonce bytea, payload_auth_tag bytea,
        payload_encrypted_dek bytea, payload_key_ref text, payload_expires_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE conversation_ingress_heads (
        page_id text NOT NULL, conversation_hash text NOT NULL, generation bigint NOT NULL,
        last_customer_receive_sequence bigint, quiet_until timestamptz, next_attempt_at timestamptz,
        attempt_count integer NOT NULL DEFAULT 0, lease_owner text, lease_token uuid,
        lease_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (page_id,conversation_hash)
      );
      CREATE TABLE meta_outbox (
        outbox_id uuid PRIMARY KEY, page_id text NOT NULL, status text NOT NULL,
        lease_owner text, lease_token uuid, lease_until timestamptz
      );
      CREATE TABLE pancake_tag_outbox (
        operation_id uuid PRIMARY KEY, page_id text NOT NULL, status text NOT NULL,
        lease_owner text, lease_token uuid, lease_until timestamptz
      );
      CREATE FUNCTION guard_df13_commerce_cutover_fence_insert_identity()
      RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
      COMMENT ON FUNCTION guard_df13_commerce_cutover_fence_insert_identity() IS
        'Exact 0036 first cutover plus Track B V1-to-V2 replacement and V2-to-V1 rollback guard; never moves a pointer.';
    `);
    await client.query(upSql);
    const installed = await client.query(
      `SELECT count(*)::int AS exact_count
         FROM pg_trigger AS t
         JOIN pg_class AS c ON c.oid=t.tgrelid
         JOIN pg_namespace AS n ON n.oid=c.relnamespace
         JOIN pg_proc AS p ON p.oid=t.tgfoid
        WHERE n.nspname=$1 AND t.tgenabled='A' AND t.tgtype=19
          AND p.proname='guard_track_b_cutover_admission'
          AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
          AND (c.relname,t.tgname) IN (
            ('webhook_inbox','track_b_cutover_admission_webhook_inbox'),
            ('meta_outbox','track_b_cutover_admission_meta_outbox'),
            ('pancake_tag_outbox','track_b_cutover_admission_pancake_tag_outbox')
          )`,
      [schema],
    );
    assert.equal(installed.rows[0]?.exact_count, 3);
    await client.query(
      `INSERT INTO schema_migrations (migration_name,checksum_sha256)
       VALUES ('0038_track_b_commerce_admission_gate',
               '7d1f3f8916e0a7ba63502d4fc7e2b794e20b65ac833a8c84776012cf80be56ca')`,
    );

    const ids = {
      inbox: "10000000-0000-4000-8000-000000000001",
      meta: "10000000-0000-4000-8000-000000000002",
      pancake: "10000000-0000-4000-8000-000000000003",
      other: "10000000-0000-4000-8000-000000000004",
      drainingInbox: "10000000-0000-4000-8000-000000000005",
      drainingMeta: "10000000-0000-4000-8000-000000000006",
      drainingPancake: "10000000-0000-4000-8000-000000000007",
      changedSearchPath: "10000000-0000-4000-8000-000000000009",
    };
    await insertWork(client, "webhook_inbox", "inbox_id", ids.inbox, pageId, "QUEUED");
    await insertWork(client, "meta_outbox", "outbox_id", ids.meta, pageId, "PENDING");
    await insertWork(client, "pancake_tag_outbox", "operation_id", ids.pancake, pageId, "PENDING");
    await insertWork(client, "webhook_inbox", "inbox_id", ids.other, otherPageId, "QUEUED");
    await insertWork(client, "webhook_inbox", "inbox_id", ids.drainingInbox, pageId, "PROCESSING");
    await insertWork(client, "meta_outbox", "outbox_id", ids.drainingMeta, pageId, "SENDING");
    await insertWork(client, "pancake_tag_outbox", "operation_id", ids.drainingPancake, pageId, "APPLYING");
    await insertWork(client, "webhook_inbox", "inbox_id", ids.changedSearchPath, pageId, "QUEUED");
    const fenceToken = "30000000-0000-4000-8000-000000000001";
    await client.query(
      `INSERT INTO df13_commerce_cutover_fences
         (fence_id,page_id,channel,epoch,token_hash,lease_until,released_at)
       VALUES ('20000000-0000-4000-8000-000000000001',$1,'MESSENGER',1,$2,
               clock_timestamp()-interval '1 minute',NULL)`,
      [pageId, createHash("sha256").update(fenceToken, "utf8").digest("hex")],
    );

    const storeUrl = new URL(databaseUrl);
    storeUrl.searchParams.set("options", `-c search_path=${schema},public`);
    const authorityWriter = new PostgresTrackBCommerceAuthorityWriter(storeUrl.toString(), {
      admissionSchema: schema,
    });
    try {
      assert.deepEqual(await authorityWriter.readAdmissionHold({
        pageId,
        channel: "MESSENGER",
        lease: {
          fenceId: "20000000-0000-4000-8000-000000000001",
          fenceToken,
          epoch: 1,
        },
      }), {
        status: "HELD",
        source: "DATABASE",
        pageId,
        channel: "MESSENGER",
        fenceId: "20000000-0000-4000-8000-000000000001",
        epoch: 1,
        released: false,
        guardedClaims: [
          "webhook_inbox:PROCESSING",
          "meta_outbox:SENDING",
          "pancake_tag_outbox:APPLYING",
        ],
      });
    } finally {
      await authorityWriter.close();
    }

    // New inbound remains durably queued, including under an expired-but-unreleased fence.
    const durable = await client.query(
      `INSERT INTO webhook_inbox (inbox_id,page_id,status)
       VALUES ('10000000-0000-4000-8000-000000000008',$1,'QUEUED') RETURNING status`,
      [pageId],
    );
    assert.equal(durable.rows[0]?.status, "QUEUED");
    assert.equal(await claim(client, "webhook_inbox", "inbox_id", ids.inbox, "PROCESSING"), 0);
    assert.equal(await claim(client, "meta_outbox", "outbox_id", ids.meta, "SENDING"), 0);
    assert.equal(await claim(client, "pancake_tag_outbox", "operation_id", ids.pancake, "APPLYING"), 0);
    assert.equal(await claim(client, "webhook_inbox", "inbox_id", ids.other, "PROCESSING"), 1);

    // A caller-controlled search_path cannot redirect the trigger's fence lookup.
    await contender.query("SET search_path TO public");
    const changedPathClaim = await contender.query(
      `UPDATE ${schema}.webhook_inbox
          SET status='PROCESSING', lease_owner='worker',
              lease_token='30000000-0000-4000-8000-000000000009',
              lease_until=clock_timestamp()+interval '1 minute'
        WHERE inbox_id=$1`,
      [ids.changedSearchPath],
    );
    assert.equal(changedPathClaim.rowCount, 0);
    await configure(contender, schema);

    // Exercise the actual batch-claim store twice. Admission-held polls must not
    // consume the conversation head's retry budget.
    await client.query(
      `INSERT INTO conversation_ingress_heads
         (page_id,conversation_hash,generation,last_customer_receive_sequence,quiet_until,attempt_count)
       VALUES ($1,'held-conversation',1,10,clock_timestamp()-interval '1 second',3)`,
      [pageId],
    );
    await client.query(
      `INSERT INTO webhook_inbox
         (inbox_id,page_id,status,event_key,conversation_hash,receive_sequence,event_kind,attempt_count)
       VALUES ('10000000-0000-4000-8000-000000000010',$1,'QUEUED','held-event',
               'held-conversation',10,'CUSTOMER',0)`,
      [pageId],
    );
    const inboxStore = new PostgresRealtimeInboxStore(
      storeUrl.toString(),
      new LocalEnvelopeCipher("00".repeat(32), "track-b-0038-test-key"),
    );
    try {
      assert.equal(await inboxStore.claimNextBatch("held-worker", 30_000), null);
      assert.equal(await inboxStore.claimNextBatch("held-worker", 30_000), null);
    } finally {
      await inboxStore.close();
    }
    const heldHead = await client.query(
      `SELECT attempt_count,lease_owner,lease_token,lease_until
         FROM conversation_ingress_heads WHERE conversation_hash='held-conversation'`,
    );
    assert.deepEqual(heldHead.rows[0], {
      attempt_count: 3, lease_owner: null, lease_token: null, lease_until: null,
    });

    // Existing leases can complete and drain; only acquisition/lease replacement is blocked.
    assert.equal((await client.query(
      "UPDATE webhook_inbox SET status='PROCESSED' WHERE inbox_id=$1", [ids.drainingInbox])).rowCount, 1);
    assert.equal((await client.query(
      "UPDATE meta_outbox SET status='SENT_ACCEPTED' WHERE outbox_id=$1", [ids.drainingMeta])).rowCount, 1);
    assert.equal((await client.query(
      "UPDATE pancake_tag_outbox SET status='APPLIED' WHERE operation_id=$1", [ids.drainingPancake])).rowCount, 1);

    await client.query("UPDATE df13_commerce_cutover_fences SET released_at=clock_timestamp()");
    assert.equal(await claim(client, "webhook_inbox", "inbox_id", ids.inbox, "PROCESSING"), 1);
    await client.query("UPDATE webhook_inbox SET status='QUEUED', lease_owner=NULL, lease_token=NULL, lease_until=NULL WHERE inbox_id=$1", [ids.inbox]);
    await client.query("DELETE FROM df13_commerce_cutover_fences");

    // Fence acquisition wins the advisory-lock race: the concurrent claim waits, then remains held.
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`df13-cutover:${pageId}:MESSENGER`]);
    await client.query(
      `INSERT INTO df13_commerce_cutover_fences
         (fence_id,page_id,channel,lease_until,released_at)
       VALUES ('20000000-0000-4000-8000-000000000002',$1,'MESSENGER',clock_timestamp()+interval '1 minute',NULL)`,
      [pageId],
    );
    const blockedClaim = claim(contender, "webhook_inbox", "inbox_id", ids.inbox, "PROCESSING");
    const beforeCommit = await Promise.race([
      blockedClaim.then(() => "SETTLED"),
      new Promise<string>((resolve) => setTimeout(() => resolve("WAITING"), 75)),
    ]);
    assert.equal(beforeCommit, "WAITING");
    await client.query("COMMIT");
    assert.equal(await blockedClaim, 0);

    await assert.rejects(client.query(downSql), /0038 down requires zero unreleased cutover fences/u);
    assert.equal(await claim(client, "webhook_inbox", "inbox_id", ids.inbox, "PROCESSING"), 0,
      "failed down must leave the guard installed");
    await client.query("UPDATE df13_commerce_cutover_fences SET released_at=clock_timestamp()");
    await client.query(downSql);
    assert.equal(await claim(client, "webhook_inbox", "inbox_id", ids.inbox, "PROCESSING"), 1);

    // The migration is reversible and re-applicable on the same clean target.
    await client.query("UPDATE webhook_inbox SET status='QUEUED', lease_owner=NULL, lease_token=NULL, lease_until=NULL WHERE inbox_id=$1", [ids.inbox]);
    await client.query("DELETE FROM df13_commerce_cutover_fences");
    await client.query(upSql);
    await client.query(
      `INSERT INTO df13_commerce_cutover_fences
         (fence_id,page_id,channel,lease_until,released_at)
       VALUES ('20000000-0000-4000-8000-000000000003',$1,'MESSENGER',clock_timestamp()+interval '1 minute',NULL)`,
      [pageId],
    );
    assert.equal(await claim(client, "webhook_inbox", "inbox_id", ids.inbox, "PROCESSING"), 0);
  } finally {
    try { await client.query("ROLLBACK"); } catch { /* no active transaction */ }
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await Promise.all([client.end(), contender.end()]);
  }
});
