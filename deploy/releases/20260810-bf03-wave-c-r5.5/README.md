# BF-03 + Wave C r5.5 deployment

This directory is the reviewed production automation for
`20260810-bf03-wave-c-r5.5`. It materializes and builds only from the final
annotated GitHub tag, then recreates exactly `realtime-worker`. It never
recreates Admin, delivery, data, or adjacent services and performs no
migration, backfill, routing, page-allowlist, Messenger, n8n, or policy-pointer
mutation.

The code cutover intentionally retains the active published policy bundle. The
missing Wave-C fields therefore resolve to `LEGACY`, `LEGACY`, and
`STRICT_BLOCK_ALL`. BF-03 remains foundation-only and non-activatable. Policy
rollout is outside this automation because no reviewed complete canary bundle
or immutable activation/rollback artifact exists.

The operator must supply exact fresh baseline identities:

- `RELEASE_COMMIT` and `RELEASE_TAG_OBJECT` for the final annotated tag;
- `PREVIOUS_RELEASE_DIR` and `PREVIOUS_COMPOSE_SHA256`;
- `ROLLBACK_REALTIME_IMAGE`, `ROLLBACK_REALTIME_IMAGE_ID`, and
  `ROLLBACK_REALTIME_RELEASE_ID`;
- exhaustive deployment and rollback runtime-state service evidence files;
- `DEPLOYMENT_AUTHORIZED=YES_I_AM_AUTHORIZED` for cutover or rollback.

`preflight.sh` validates tag/main/manifest/Compose provenance, the live BF-01
rollback identity, the current release, exact migration, health, non-root PID1,
and clean immutable output paths. `run-build.sh` archives the final tag, writes
the create-once release source pointer, builds the immutable image, records its
ID and labels, runs artifact smoke, and validates Compose without touching live
containers.

`cutover.sh` takes the global lock, verifies fresh runtime-state parity, records
a secret-safe hash of the existing runtime boundary, backs up the infrastructure
environment, pins only `REALTIME_IMAGE` and `REALTIME_RELEASE_ID`, arms automatic
rollback, and runs `docker compose up -d --no-deps realtime-worker`. It requires
all non-target container IDs, the migration ledger, routing, allowlist, and all
non-release Config.Env values—including the existing credential-bearing URL
entries—to remain byte-equivalent by digest. No secret entry or value may be
added or changed.

After health, readiness, queue, duplicate, log, UID, policy-default, and bounded
3/3 soak gates pass, runtime-state is freshly captured, verified, and promoted.
Any failure after the environment backup restores the exact BF-01 image and
previous release, preserving PostgreSQL, Redis, Qdrant, Inbox, and Outbox.
