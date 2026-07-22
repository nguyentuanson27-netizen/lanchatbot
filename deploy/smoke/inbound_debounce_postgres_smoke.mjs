import { Pool } from "pg";
import {
  LocalEnvelopeCipher,
  PostgresRealtimeInboxStore,
} from "./index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pageId = "debounce-smoke-page";
const conversationHash = "debounce-smoke-conversation";
const store = new PostgresRealtimeInboxStore(
  databaseUrl,
  new LocalEnvelopeCipher("00".repeat(32), "smoke-kek-v1"),
  { customerDebounceMs: 5_000, maxPoolSize: 2 },
);
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

const enqueue = async (eventKey, kind = "CUSTOMER") =>
  store.enqueue({
    pageId,
    metaAppId: "smoke-meta-app",
    eventKey,
    providerMessageId: eventKey,
    conversationHash,
    occurredAt: new Date(),
    receivedAt: new Date(),
    signatureKeyVersion: "smoke-signature-v1",
    eventKind: kind,
    envelope: { eventKey, kind },
  });

try {
  await enqueue("burst-1");
  await sleep(120);
  const duplicate = await enqueue("burst-1");
  assert(!duplicate.inserted, "DUPLICATE_WAS_INSERTED");
  await enqueue("burst-2");
  await sleep(120);
  await enqueue("burst-3");

  assert(
    (await store.claimNextBatch("smoke-worker", 30_000)) === null,
    "BATCH_CLAIMED_BEFORE_QUIET_WINDOW",
  );
  await sleep(5_150);
  const first = await store.claimNextBatch("smoke-worker", 30_000);
  assert(first?.eventKind === "CUSTOMER", "FIRST_BATCH_KIND_INVALID");
  assert(first?.items.length === 3, "FIRST_BATCH_SIZE_INVALID");
  assert(await store.completeBatch(first, true), "FIRST_BATCH_NOT_COMPLETED");

  await enqueue("stale-1");
  await sleep(5_150);
  const stale = await store.claimNextBatch("smoke-worker", 30_000);
  assert(stale?.items.length === 1, "STALE_BATCH_NOT_CLAIMED");
  await enqueue("stale-2");
  assert(!(await store.isBatchCurrent(stale)), "STALE_BATCH_STILL_CURRENT");
  assert(
    !(await store.completeBatch(stale, true)),
    "SUPERSEDED_BATCH_WAS_COMPLETED",
  );
  assert(
    (await store.claimNextBatch("smoke-worker", 30_000)) === null,
    "SUPERSEDED_BATCH_RECLAIMED_BEFORE_NEW_QUIET_WINDOW",
  );
  await sleep(5_150);
  const regrouped = await store.claimNextBatch("smoke-worker", 30_000);
  assert(regrouped?.items.length === 2, "SUPERSEDED_MESSAGES_NOT_REGROUPED");
  assert(await store.completeBatch(regrouped, true), "REGROUPED_BATCH_NOT_COMPLETED");

  await enqueue("customer-before-page-echo");
  await sleep(5_150);
  const customerBeforeEcho = await store.claimNextBatch("smoke-worker", 30_000);
  assert(customerBeforeEcho?.eventKind === "CUSTOMER", "CUSTOMER_NOT_CLAIMED");
  await enqueue("page-echo", "PAGE_ECHO");
  assert(
    !(await store.isBatchCurrent(customerBeforeEcho)),
    "PAGE_ECHO_DID_NOT_INVALIDATE_CUSTOMER_BATCH",
  );
  assert(
    !(await store.completeBatch(customerBeforeEcho, true)),
    "CUSTOMER_BATCH_SURVIVED_PAGE_ECHO",
  );
  const pageEcho = await store.claimNextBatch("smoke-worker", 30_000);
  assert(pageEcho?.eventKind === "PAGE_ECHO", "PAGE_ECHO_NOT_PRIORITIZED");
  assert(await store.completeBatch(pageEcho, true), "PAGE_ECHO_NOT_COMPLETED");
  const customerDrain = await store.claimNextBatch("smoke-worker", 30_000);
  assert(customerDrain?.items.length === 1, "OLD_CUSTOMER_NOT_DRAINED");
  assert(await store.completeBatch(customerDrain, true), "OLD_CUSTOMER_DRAIN_FAILED");

  const result = await pool.query(
    `SELECT
       count(*) FILTER (WHERE status = 'PROCESSED')::integer AS processed,
       count(*)::integer AS total
     FROM webhook_inbox
     WHERE page_id = $1 AND conversation_hash = $2`,
    [pageId, conversationHash],
  );
  const head = await pool.query(
    `SELECT quiet_until, last_customer_receive_sequence
     FROM conversation_ingress_heads
     WHERE page_id = $1 AND conversation_hash = $2`,
    [pageId, conversationHash],
  );
  assert(result.rows[0]?.processed === 7, "PROCESSED_COUNT_INVALID");
  assert(result.rows[0]?.total === 7, "INBOX_AUDIT_COUNT_INVALID");
  assert(head.rows[0]?.quiet_until === null, "QUIET_CLOCK_NOT_RETIRED");
  assert(
    head.rows[0]?.last_customer_receive_sequence === null,
    "CUSTOMER_WATERMARK_NOT_RETIRED",
  );
  process.stdout.write("POSTGRES_DEBOUNCE_SMOKE_OK processed=7 total=7\n");
} finally {
  await store.close();
  await pool.end();
}
