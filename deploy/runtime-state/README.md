# Runtime-state integrity

This directory implements RI-01 through RI-04. Repository checks validate contracts and fixtures only; they never claim live host parity.

## Generated authority

Production identity is the agreement of:

1. `/opt/lana-chatbot/current` resolved to a new immutable release directory;
2. that release's create-once `.release-source.json`, whose immutable tag resolves to its full fetched commit;
3. a schema-valid candidate containing every required production service, per-service rollback, migrations, routing and named secret-free digests;
4. a fresh recapture of the host immediately before atomic promotion;
5. append-only history and byte-for-byte `current.json` readback.

`UNVERIFIED`, `MISMATCH`, a missing required service, a wrong full OCI revision where revision evidence is required, or any parity difference exits non-zero and preserves the prior `current.json`.

## Approved deployment flow only

After explicit production authorization, automation may:

1. materialize a new release from an immutable GitHub tag/commit;
2. run `create-release-source.sh` once before activation—the script refuses overwrite;
3. perform the existing health, containment, migration and guarded symlink checks;
4. prepare a versioned service-evidence map; migration and routing are queried directly from PostgreSQL with fixed read-only statements;
5. run `capture-current.sh`, `verify-current.sh`, then `promote-current.sh`.

The migration projection is `{ "latestMigration": "...", "rows": [{ "migration": "...", "checksumSha256": "..." }] }`. The routing projection is `{ "canaryPageIds": ["..."], "rows": [{ "page_id": "...", "status": "...", "routing_owner": "...", "app_send_enabled": true, "kill_switch": false }] }`.

The service-evidence file must match `service-inventory.json`. Each deployed entry supplies `expectedImageId`, `revisionRequired`, optional full `expectedRevision`, and a complete `rollback`. Values come from the candidate/deployment evidence and prior known-good state, never from an unreviewed raw environment dump. Unknown environment keys and secret-shaped keys are excluded from canonical digests.

No script here authorizes deploy, migration, restart, symlink, routing, allowlist, or test-message actions on its own. Existing release directories, source pointers, history records and candidates are immutable.
