# Admin Policy Review r6.1 deployment

This directory is the reviewed production automation for
`20260809-admin-policy-review-r6.1`. It deploys the already merged Admin Policy
Review stack to exactly `admin-api` and `admin-web`. It does not run migrations,
change routing, change the page allowlist, mutate behavior modes, or send a
Messenger test.

## Required non-secret inputs

The operator supplies these values from fresh read-only production evidence:

- `RELEASE_COMMIT`: the full commit peeled from the annotated r6.1 tag.
- `PREVIOUS_RELEASE_DIR`: the currently resolved, verified release directory.
- `ROLLBACK_ADMIN_API_IMAGE` and `ROLLBACK_ADMIN_WEB_IMAGE`: exact current image
  references for the two targets.
- `PRESERVED_ADMIN_SIMULATION_IMAGE`: exact current Simulation Worker image.
- `RUNTIME_STATE_SERVICE_EVIDENCE_FILE`: exhaustive deployment evidence matching
  `service-inventory.json`.
- `RUNTIME_STATE_ROLLBACK_EVIDENCE_FILE`: exhaustive evidence for the rollback
  state.
- `ADMIN_UI_WALKTHROUGH_EVIDENCE_FILE`: a non-secret human/browser acceptance
  JSON based on `admin-ui-walkthrough.example.json`. All seven checks must be
  `PASS`; its content is never printed and only its SHA-256 is recorded.
- `DEPLOYMENT_AUTHORIZED=YES_I_AM_AUTHORIZED` for cutover/rollback execution.

Production secrets remain in `/opt/lana-chatbot/shared/.env.infrastructure` and
must never be printed, copied into prompts, or committed.

## Ordered flow

1. Run `preflight.sh`. It fetches and verifies the annotated tag, confirms the
   live rollback identities, mode `600` env file, healthy Admin services, and
   absence of an existing release/evidence path.
2. Run `run-build.sh`. It materializes the tag into a new release directory,
   creates `.release-source.json` once, builds the immutable image and validates
   Compose with three independent image pins. It does not recreate containers.
3. Prepare and validate both exhaustive runtime-state service-evidence files and
   the UI walkthrough evidence.
4. Run `cutover.sh`. It backs up the protected env, pins the two target images,
   preserves the Simulation Worker image, snapshots non-target container IDs and
   runs `docker compose up -d --no-deps admin-api admin-web`.
5. Cutover waits for health, proves the two target image IDs, proves all
   non-target container IDs are unchanged, atomically switches `current`, then
   captures/verifies/promotes runtime-state and runs postcheck.
6. Run `soak.sh` (default `3` samples, `60` seconds apart).

Any error after the protected env backup invokes `rollback.sh`. Rollback restores
the two prior image identities with the new per-service selectors, preserves the
Simulation Worker, restores the previous symlink and promotes a freshly verified
rollback runtime-state candidate. It never deletes application data.

The release scripts are intentionally release-specific. Do not copy them to a new
tag and change values on the VPS; make a reviewed GitHub change instead.
