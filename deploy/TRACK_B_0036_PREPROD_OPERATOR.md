# Track B migration 0036 PREPROD operator

This operator is restricted to `ENGINEERING_PREPROD`, database `lana_chatbot`,
and Messenger page `1198992073286645`. It does not deploy an application,
change a behavior pointer, send Messenger traffic, change routing, or activate
an authority. The migration remains outside automatic discovery.

The operator pins the accepted `0036` up/down hashes, the current `0035`
ledger row, PostgreSQL 17 target image, current realtime release and exact
behavior pointer revision 6. A changed target fails before backup or DDL.

Run only from a clean worktree whose `HEAD` and fetched `origin/main` both equal
the supplied `SOURCE_REVISION`:

```text
SOURCE_REVISION=<exact-merged-main> deploy/track-b-0036-preprod-backup-rehearse.sh
SOURCE_REVISION=<same-exact-main> MIGRATION_AUTHORIZED=YES_I_AM_AUTHORIZED deploy/track-b-0036-preprod-apply.sh
```

The first command creates a custom-format backup with SHA-256, restores it to
an isolated disposable PostgreSQL 17 database, and exercises `up/down/up`,
idempotency, live-scope conflict, immutable identity, lease release and the
down-migration refusal after durable fence evidence exists. It drops only the
disposable database after success and retains the backup and rehearsal marker.

The apply command re-verifies the exact target, source, backup and rehearsal,
then applies the migration and ledger row in one transaction. It performs exact
table/index/constraint/function/trigger/owner/grant, empty-evidence and pointer
readback. A post-apply mismatch runs the safe down migration and ledger removal
while the new fence tables are still empty. Once durable fence evidence exists,
schema down is intentionally prohibited; operational rollback must preserve
the additive schema and restore the exact prior authority/service identities.

Credentials remain inside the existing PostgreSQL container environment and
are never emitted or persisted by these scripts.
