# Current Authoritative Planning Baseline

**Evidence date:** 2026-08-03
**Nature:** Last owner-confirmed deploy/evidence checkpoint. Every task must compare it with freshly fetched GitHub and read-only production evidence before acting.

## Git and release

| Field | Value |
|---|---|
| Evidence PR | `#126` |
| Evidence merge on `origin/main` | `381ed381b119de4b4888170a348ecc6ae11f027f` |
| Release | `20260803-dataset-store-boundary-r3` |
| R3 implementation commit | `0a5844a57cb1dd9c5687158cb9774a466d512024` |
| Tagged release commit | `9288708c536080587acf4b08d84b5a509ef768bc` |
| Tag object | `8b21464c77ea75c035719fc00ad94ebaf846c587` |
| Image | `lana-chatbot-app:dataset-store-boundary-r3` |
| Image ID | `sha256:923c0f254b7ecc15aace27f0f50e098125cf45f514643f515b88aa20003dfcb5` |
| Runtime-state SHA | `1744af5cf9d79b90e8033a738e3414350af39c25e5bd00f9890acdcc50e61fad` |
| Runtime evidence | `deploy/manifests/20260803-dataset-store-boundary-r3-runtime.json` |

## Runtime state at the checkpoint

- Migration: `0030_runtime_behavior_modes`; no R3 migration or backfill.
- Confirmation mode: `V2_ACTIVE`.
- Sales-authority mode: `LEGACY`.
- State-read mode: `LEGACY`.
- Behavior revision: `3`; source `DATABASE`.
- Approved page allowlist: only `1198992073286645`.
- Admin API, delivery, and realtime health/readiness passed.
- Target services had restart count `0`; Node ran as UID `1000`, non-root.
- Outbox remained `0 -> 0`; duplicates `0` during the deployment evidence window.
- Frozen install, full test/build, boundary smoke, guarded cutover, runtime-state verification, and soak `3/3` passed.

These observations describe the captured checkpoint, not a perpetual health guarantee.

## Rollback

- Authoritative release rollback: `r32.2.4`.
- Authoritative Admin API rollback image: `r32.1`.
- Behavior control-plane emergency paths remain governed by their own audited CAS revisions.

## Fail-closed residuals

1. `ADMIN_IMAGE` is still shared. Do not recreate `admin-web` or `admin-simulation-worker` until per-service image selectors are pinned and reviewed.
2. Host-only release scripts are not canonical source. Before reuse, require a reviewed repository artifact or fresh hash verification.
3. A host `.env.infrastructure.backup-<tag>` is retained for audit. Do not copy its contents into reports, logs, commits, or prompts.
4. Do not expand the single-page allowlist in a bug-fix or authority-cutover release.

## Incident status

Ten production defects are accepted as already diagnosed in `incidents/20260803-lana-chatbot-error-report-en.md`. Remaining architecture work is paused while BF-01 through BF-10 are planned and executed. Diagnosis is not reopened unless new contradictory evidence appears.
