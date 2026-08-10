# Admin Policy Review r6.9 deployment

This directory is the production automation for
`20260810-admin-policy-review-r6.9`. It supersedes the unexecuted r6.8 release
candidate after PR #174 restored benchmark fixtures to the Docker build context,
while the currently deployed rollback authority remains r6.7. It
deploys PR #171 to exactly `admin-api` and `admin-web`. It backs up PostgreSQL,
restore-tests the backup, exercises migration 0031 up and down on the restored
database, then applies the additive 0031 migration before the target services
are recreated. It does not backfill or rewrite data, change routing, change the
page allowlist, mutate behavior modes, or send a Messenger test.

## Required non-secret inputs

The operator supplies these values from fresh read-only production and GitHub
evidence:

- `RELEASE_COMMIT` and `RELEASE_TAG_OBJECT`: exact full identities of the
  annotated r6.9 tag.
- `RELEASE_FETCH_SOURCE`: `origin` or an operator-verified Git bundle containing
  both the immutable tag and `refs/heads/main`.
- `PREVIOUS_RELEASE_DIR` and `PREVIOUS_COMPOSE_SHA256`: exact current release and
  checksum of its Compose definition.
- `ROLLBACK_ADMIN_API_IMAGE` / `ROLLBACK_ADMIN_API_IMAGE_ID` and
  `ROLLBACK_ADMIN_WEB_IMAGE` / `ROLLBACK_ADMIN_WEB_IMAGE_ID`: immutable live
  rollback identities.
- `PRESERVED_ADMIN_SIMULATION_IMAGE`: exact Simulation Worker image reference.
- `RUNTIME_STATE_SERVICE_EVIDENCE_FILE` and
  `RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE`: exhaustive evidence matching
  `service-inventory.json`.
- `ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE`: non-secret human/browser acceptance JSON
  based on `admin-ui-walkthrough.example.json`; all seven checks must pass.
- `DEPLOYMENT_AUTHORIZED=YES_I_AM_AUTHORIZED` for cutover or rollback.

Production secrets remain in `/opt/lana-chatbot/shared/.env.infrastructure` and
must never be printed, copied into prompts, or committed.

## Ordered flow

1. Materialize the exact GitHub tag in `/opt/lana-chatbot/repository`. If the
   VPS deploy key is unavailable, import an operator-verified Git bundle; never
   edit source files on the VPS.
2. Run `preflight.sh`. It fetches the tag and `main` from the declared source,
   validates the tag object, peeled commit, GitHub origin, manifest/Compose
   checksums, live rollback refs and image IDs, previous Compose checksum,
   healthy Admin services, clean paths, and the native pnpm audit.
3. Run `run-build.sh`. It archives the immutable tag, builds the r6.9 image,
   records its image ID, validates Compose, and runs Admin API/Admin Web artifact
   smoke without recreating production containers.
4. Prepare and validate exhaustive deployment/rollback service evidence and the
   seven-check browser or human walkthrough evidence.
5. Run `cutover.sh`. It takes the global deployment lock, captures and verifies
   the pre-cutover runtime state and non-image Admin boundary, backs up the env,
   creates and checksums a PostgreSQL custom-format backup, restores it into an
   isolated temporary database, tests migration 0031 up/down, then arms
   automatic rollback, pins only the two target images, applies migration 0031
   through the exact target image, verifies the migration ledger and runs
   `docker compose up -d --no-deps admin-api admin-web`.
6. Cutover proves target image IDs, target health, every required and optional
   inventory identity, Admin config/secret-mount boundary parity, the exact
   0030-to-0031 migration transition,
   routing, allowlist and non-secret config invariants. It then switches
   `current`, promotes runtime-state, runs postcheck and completes a fixed 3/3
   soak while automatic rollback remains armed.

Any error after the env backup invokes `rollback.sh` while retaining the global
lock. Rollback has a minimal incident dependency set: it restores the exact env
backup and recreates only Admin API/Web from the previous release's Compose file
plus the reviewed image-only override. Both rollback image IDs, boundary parity,
runtime invariants, non-target identities, health, symlink and runtime-state
promotion must pass. Because 0031 is additive and r6.7-compatible, application
rollback intentionally retains schema 0031 and never deletes application data.

The intentionally adjacent Authentik and n8n projects remain outside the
`lana-chatbot-production-v1` inventory. The optional reporting sidecar is now
enumerated and its absence or container identity is preserved across cutover.
