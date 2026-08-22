# @lana/database

Durable PostgreSQL contracts for the chatbot. No command in this package connects to production unless the operator explicitly supplies a production `DATABASE_URL`; no such URL belongs in source control.

## Migration model

- `migrateUp` verifies SHA-256 of every already-applied migration and refuses changed history.
- Each new migration runs in its own transaction.
- `schema_migrations` is the authoritative applied-version list.
- `pending-migrations/` holds source-only artifacts that `migrateUp` does not
  discover. An owner-authorized release must explicitly promote such an
  artifact into `migrations/` before it can be applied.
- Migrations use `IF NOT EXISTS` where PostgreSQL supports it, while the migration ledger prevents accidental partial replay.
- `messages` and `conversation_events` are range-partitioned on `occurred_at` and start with a default partition. Production operations should call `lana_create_history_partitions(month)` ahead of time and drain the default partition before attaching a range that already has rows.
- `message_identities` provides global inbound/outbound idempotency because a PostgreSQL partitioned unique key must include its partition key.

## Rollback

Rollback is destructive and disabled by default:

```text
ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true node dist/migrate.js down
```

It rolls back one migration. Before any staging/production rollback:

1. pause writers;
2. take and verify a restore point;
3. inspect the matching `.down.sql`;
4. confirm outstanding Inbox/Outbox rows are preserved or intentionally drained;
5. run the rollback under change approval;
6. verify migration version and readiness before resuming writers.

Application rollback normally deploys the previous compatible binary without reversing schema. Do not reverse `0001_core` in any environment containing real Inbox/Outbox/history data.

## Retention

- Redis state and redacted analytics projections: 20 days from activity. Redis trimming belongs to the application maintenance worker and must pause when PostgreSQL projection/archive lag is unsafe.
- PostgreSQL `messages` and `conversation_events`: 6 months. `lana_apply_retention()` is the row-level safety job. In production, prefer monthly partition drop after verifying the cutoff and backup/key policy.
- Encrypted webhook and Meta Outbox operational payloads: erase within 24 hours after terminal state by setting ciphertext/key reference columns to null.
- `audit_log`: append-only and contains no chat, PII or secret. Proposed retention is 12 months and requires a separate audited DBA partition-purge procedure.
- Image binary and signed/private image URLs are never stored in analytical tables.

Run retention at least daily and alert when it has not succeeded for 26 hours. Backup retention does not override the privacy limit: production should use encrypted monthly partitions and crypto-erasure where required.

## Safety boundaries

- A `PAUSED` Page may be registered without provider secrets for shadow/scaffolding. An `ACTIVE` Page is rejected by the database unless Meta verify/send secrets, Pancake read/tag secret and both blocking tag IDs are configured.
- `recordVerifiedWebhook` must only be called after Meta signature verification.
- PostgreSQL Inbox is the durable duplicate guard; Redis `SET NX EX 1728000` is only a fast guard.
- Meta send and Pancake tag use separate Outbox tables.
- `AMBIGUOUS` Meta sends are not automatically retried.
- The analytical history contains `customer_hash`, redacted text and hashed provider IDs only.

## Gate E evidence boundary

Migration `0034_gate_e_evidence_store_v2` defines a dedicated source-only,
append-only evidence store. Application code uses only
the population-anchor register/read functions and
`lana_gate_e_append_evidence_v2` / hash-scoped evidence reader through three
disjoint no-login roles. The registration writer cannot append evidence; the
evidence writer cannot register a population; none has table DML. The persisted
`admitted_at` value is the database clock sampled at the final owned pre-commit
admission boundary. It is not an exact or post-commit timestamp. The store is
explicitly rooted in the `public` schema. Migration `0034` creates and owns its
roles, tables, functions and triggers. It fails on any occupied owned namespace
instead of adopting pre-existing roles, objects, ownership or ACLs. Applying
this migration, provisioning role membership, observing a provider, running a
score or accepting Gate E each requires separate authorization.

PostgreSQL roles are cluster-wide. Migration 0034 therefore supports one owned
Gate E store namespace per cluster, even when the cluster contains several
databases. Operators must choose the governed store database and must not apply
0034 independently in another database on the same cluster.
