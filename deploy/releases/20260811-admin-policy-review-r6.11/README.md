# Admin Policy Review r6.11 deployment

This directory is the production automation for
`20260811-admin-policy-review-r6.11`. It deploys PR #182 to exactly
`admin-web`. The current `admin-api`, Admin Simulation Worker and every other
service are preserved and verified by immutable container identity.

The release fixes Admin Policy selection and batch-recovery behavior only. It
does not apply a migration, rewrite data, change routing, change the page
allowlist, mutate runtime/control-plane modes, update secrets, or send a
Messenger test. Production must already be at migration
`0031_admin_policy_safe_deletion` with the pinned ledger checksum and schema
guards. The rollback authority is the Admin Web image and release live at
fresh preflight, expected to be r6.10.

## Required non-secret inputs

The operator derives these values from fresh read-only GitHub and production
evidence:

- `RELEASE_COMMIT` and `RELEASE_TAG_OBJECT`: exact full identities of the
  annotated r6.11 tag.
- `RELEASE_FETCH_SOURCE`: `origin` or an operator-verified Git bundle containing
  both the immutable tag and `refs/heads/main`.
- `PREVIOUS_RELEASE_DIR` and `PREVIOUS_COMPOSE_SHA256`: exact current release and
  checksum of its Compose definition.
- `PRESERVED_ADMIN_API_IMAGE` / `PRESERVED_ADMIN_API_IMAGE_ID`: immutable live
  Admin API identity, which must not change.
- `ROLLBACK_ADMIN_WEB_IMAGE` / `ROLLBACK_ADMIN_WEB_IMAGE_ID`: immutable live
  Admin Web rollback identity.
- `PRESERVED_ADMIN_SIMULATION_IMAGE`: exact Simulation Worker image reference.
- `RUNTIME_STATE_SERVICE_EVIDENCE_FILE` and
  `RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE`: exhaustive evidence matching
  `service-inventory.json`.
- `ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE`: non-secret browser/human acceptance JSON
  based on `admin-ui-walkthrough.example.json`.
- `DEPLOYMENT_AUTHORIZED=YES_I_AM_AUTHORIZED` for cutover or rollback.

Production secrets remain in `/opt/lana-chatbot/shared/.env.infrastructure` and
must never be printed, copied into prompts, or committed.

## Ordered flow

1. Materialize the exact merged annotated tag in
   `/opt/lana-chatbot/repository`; never edit VPS source files.
2. Run `preflight.sh`. It validates tag/commit/main provenance, the release
   manifest and Compose checksums, live rollback/preservation identities,
   healthy services, clean paths and the native pnpm audit.
3. Run `run-build.sh`. It archives the immutable tag, builds a new image,
   validates the Admin Web artifact, and proves Compose with the preserved
   Admin API and Simulation images without recreating production containers.
4. Prepare exhaustive deployment/rollback service evidence and the ten-check
   UI walkthrough evidence.
5. Run `cutover.sh`. It acquires the global deployment lock, verifies runtime
   and Admin configuration boundaries, backs up and restore-tests PostgreSQL,
   verifies the existing 0031 schema without executing DDL, arms automatic
   rollback, pins only `ADMIN_WEB_IMAGE`, and runs
   `docker compose up -d --no-deps admin-web`.
6. Cutover proves the Admin Web target image, unchanged Admin API and all other
   service identities, health, routing/config boundaries and runtime-state
   parity. It switches `current`, promotes runtime state, runs postcheck, and
   completes a fixed 3/3 soak while automatic rollback remains armed.

Any failure after the env backup invokes `rollback.sh` while retaining the
deployment lock. Rollback restores the exact env backup, recreates only
`admin-web` from the previous release Compose plus the reviewed image-only
override, verifies all preserved identities, switches `current` back, and
promotes rollback runtime state. No schema rollback or data deletion occurs.
