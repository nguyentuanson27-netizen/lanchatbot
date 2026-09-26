# Redis projection failure and history retention — 2026-09-25

The `RealtimeRunner.processOne` three-message burst test now injects
`REDIS_UNAVAILABLE` from every Redis history append. The canonical history
port first recovers an accepted bot Outbox unit, then returns that PostgreSQL
message for the model context. The test confirms the model sees the recovered
bot reply, all three failed projection writes were attempted, the Redis read
fallback was not used, and one reply plan was committed. The full runner
file passed 71/71; this is a throwing-port outage simulation, not an actual
Redis process outage.

The separate isolated PostgreSQL fault injection recorded in
`c3-isolated-postgres-20260925.md` proves the canonical write rolls back
atomically on failure and recovers once without changing delivery status or
attempt counts. The two checks together cover the intended Redis-projection
and canonical-write boundaries without adding a new history store.

Retention readback from source:

- `realtime-runtime.ts` encrypts Outbox payloads with a 20-day expiry.
- `chat-history.ts` selects only accepted/delivered/read units with a Meta
  message ID, acceptance time, no canonical identity, and
  `payload_expires_at > now()`.
- Migration `0009_chat_history_outreach.up.sql` erases eligible encrypted
  Outbox payloads at expiry and retains canonical message/identity rows for
  six months.

Therefore the recovery path must run before the 20-day payload expiry. A
canonical row missing past that point cannot be rebuilt from Outbox. No live
retention job, Redis process, Meta sender or customer data was touched.
