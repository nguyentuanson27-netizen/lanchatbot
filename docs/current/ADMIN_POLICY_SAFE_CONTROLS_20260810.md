# Admin Policy safe controls — 2026-08-10

## Scope

This change improves the existing Admin Policy Review UI without changing chatbot runtime behavior or activating a production release:

- safe auto-refresh can be switched on or off and defaults to on;
- manual refresh remains available in both states;
- policy artifacts can be filtered by exact version and revision;
- size-chart content is rendered as a concise Vietnamese measurement table;
- an OWNER can deactivate an active pointer with an expected-revision guard;
- an OWNER can remove an inactive artifact version from the review list.

## Safe removal semantics

“Delete” is a user-visible removal, not a physical database delete. Migration `0031_admin_policy_safe_deletion` records an append-only tombstone in `admin_artifact_deletions`. The original artifact and event history remain available for audit and incident analysis.

The API refuses removal while any active pointer still references the artifact. Pointer deactivation is a separate operation, requires the current pointer revision, is limited to OWNER, and preserves the pointer record as inactive. A database trigger also prevents a tombstoned version from becoming active again.

## Interfaces

- `DELETE /admin/v1/policy/pointers/:id` with `expected_revision`
- `DELETE /admin/v1/policy/review-artifacts/:id` with `expected_revision`
- `GET /admin/v1/policy/review-artifacts` accepts exact positive `version` and non-negative `revision`

All mutations remain behind Policy Control enablement, authenticated admin identity, OWNER authorization and PostgreSQL revision checks.

## Rollback

Before production deployment, back up PostgreSQL according to the current deployment runbook. Code rollback is compatible with the tombstone table remaining present. Migration rollback drops only the new tombstone data and guards; it does not delete artifact versions or artifact events.
