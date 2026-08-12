# Unbounded text products + media guard r5.7 deployment

This directory is the reviewed `ENGINEERING_PREPROD` Release Train automation for
`20260812-unbounded-text-media-guard-r5.7.1`. It materializes and builds only from the final
annotated GitHub tag, then recreates exactly `realtime-worker`. It never
recreates Admin, delivery, data, or adjacent services and performs no
migration, backfill, routing, page-allowlist, Messenger, n8n, or policy-pointer
mutation.

This immutable follow-up supersedes the undeployed r5.7 tag. That release
failed closed before build because its reviewed live CLOSING query used the
canonical tab-delimited PostgreSQL invocation but parsed a pipe delimiter.
This release corrects the parser and adds a regression assertion; it does not
change runtime behavior or broaden deployment scope.

The only live page is `1198992073286645`, classified by repository governance
as `PREPROD_TEST_PAGE`. This release does not claim public-production readiness.

The cutover preserves the exact active published bundle: BF-01
`CLARIFY_RECONCILED_V1`, BF-06 `PER_ASSET_V1`, BF-07 `CLARIFY_V1`, and BF-08
`CLASSIFIED_ALLOWLIST_V1`. BF-03 remains absent and non-activatable. No policy
pointer or artifact mutation is part of this release.

The behavior change removes the text-product count cap while keeping fact work
at fixed concurrency three and stable input order. More than ten images takes
the canonical silent-handoff path before URL, recognition, model, fact, or
grounding work; ten images remains a normal turn.

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
environment, pins only the host-side Compose selector `REALTIME_IMAGE`, arms automatic
rollback, and runs `docker compose up -d --no-deps realtime-worker`. It requires
all non-target container IDs, the migration ledger, routing, allowlist, and all
container Config.Env keys and values—including `REALTIME_RELEASE_ID` and the
existing credential-bearing URL entries—to remain byte-equivalent by digest. No secret entry or value may be
added or changed.

After health, readiness, queue, duplicate, log, UID, policy-default, and bounded
3/3 soak gates pass, runtime-state is freshly captured, verified, and promoted.
Any failure after the environment backup restores the exact r5.5 realtime
image and the previous overall BF10 delivery r5.6 release, preserving delivery,
PostgreSQL, Redis, Qdrant, Inbox, and Outbox.
