# Admin Policy Review UX — phased rollout

Date: 2026-08-08

## Goal

Make Admin Policy Review practical for a large policy queue, especially many `SIZE_CHART` artifacts, while preserving the current policy-control safety model.

The rollout is intentionally split into independently reviewable and mergeable phases. A later phase must not be folded back into an earlier PR merely for convenience.

## Safety invariants

All phases keep the existing control-plane boundaries:

- PostgreSQL remains the source of truth for policy artifacts and active pointers.
- Existing RBAC and page scope remain authoritative.
- Existing lifecycle transitions remain authoritative.
- Optimistic concurrency continues to use the exact artifact/pointer revision.
- Canary Live and Publish gates remain unchanged.
- Simulation remains page-scoped and side-effect free.
- No production deploy, page allowlist change, prompt change, outbound ownership change, or migration is part of these UI phases.

## Live PR stack and ownership

The review stack is intentionally linear so every slice stays independently reviewable:

1. `main → #140` — Phase 1A: Admin API/store read boundary.
2. `#140 → #136` — Phase 1B: Admin Web client API/runtime/route synchronization.
3. `#136 → #147` — Phase 1C: policy review CSS and rollout/ownership documentation.
4. `#147 → #153` — Phase 1D: table/drawer UI and targeted UI regressions.
5. `#153 → #139` — Phase 2A: batch API, response contract and ambiguous-result recovery.
6. `#139 → #148` — Phase 2B: current-page selection, bulk Validate/Approve UI and CSS.

Do not retarget a later slice around an earlier slice or merge the stack out of order.

## Phase 1 — list, filtering and safe review drawer

Phase 1 is delivered by four stacked slices: #140 owns the read boundary, #136 owns client API/runtime/route synchronization, #147 owns policy review CSS and rollout documentation, and #153 owns table/drawer rendering and interaction tests.

### Admin API/store — #140 (Phase 1A)

Provide a read-oriented review boundary with:

- server-side `search`, artifact kind, lifecycle and active/inactive filtering;
- server-side sorting for newest update, oldest validated item and artifact key;
- deterministic cursor pagination using `version_id` as the tie breaker;
- pointer-aware active filtering constrained by the authenticated page scope;
- a detail context endpoint that returns the reviewed artifact, its previous version, active pointer context and eligible rollback candidates independently of the current list page.

Search remains parameterized. Literal `%`, `_` and the chosen escape character must be escaped with a PostgreSQL-valid one-character `ESCAPE` clause.

PostgreSQL `bigint` revisions may arrive from `pg` as decimal strings. Phase 1 normalizes safe non-negative revision strings explicitly and never silently falls back to `0`.

### Admin Web — #136 (Phase 1B) + #147 (Phase 1C) + #153 (Phase 1D)

#136 owns the client API, runtime state/recovery helpers and route synchronization required by the review surface. #147 owns policy review CSS and this rollout document. #153 owns the visible table/drawer implementation and targeted UI regressions.

Together they replace the large card grid with:

- compact table;
- search and filter controls;
- quick views (`Cần duyệt`, `Bản nháp`, `Đang chạy`, `Tất cả`);
- cursor navigation reflected in the route;
- generic review drawer with metadata, previous-version diff, pointer context and the existing single-artifact lifecycle actions;
- keyboard navigation (`J/K`, `Enter`, `A`) and `Duyệt & sang mục tiếp theo`.

Page-scoped Canary/Publish/Simulation actions require a concrete page. Sentinel `ALL` is never sent as a page id. If both identity and policy scopes are `ALL`, concrete page ids are loaded from the existing page directory and actions stay disabled until that resolution succeeds.

Drawer detail loading is latest-request-wins. Opening B aborts/invalidates A, and closing the drawer invalidates the active request, so a late response can never replace the currently reviewed artifact.

### Explicitly not in Phase 1

- no multi-select;
- no bulk Validate/Approve;
- no batch mutation endpoint;
- no ambiguous batch recovery;
- no specialized `SIZE_CHART` matrix renderer/editor;
- no new business validation rules.

## Phase 2 — bulk Validate/Approve

Phase 2 is delivered only after the full Phase 1 stack is accepted. #139 owns Phase 2A batch API/contract/recovery; #148 owns current-page selection, bulk controls and CSS.

It may add only current-page selection and bulk `VALIDATE` / `APPROVE` with a maximum of 100 items. Every request item carries `version_id + expected_revision`. Results preserve request order and return independent success/failure information. A successful result must bind to the request revision and return exactly `expected_revision + 1`.

A revision conflict returns the current revision when it can be read. The implementation must handle PostgreSQL bigint string values rather than dropping conflict metadata.

Network/timeout/5xx ambiguity must reconcile selected ids before any retry. The client must never replay the complete batch automatically and must never auto-retry a revision conflict.

Bulk Canary, Publish, Retire, Rollback and selected-version Simulation remain out of scope.

## Phase 3 — SIZE_CHART read-only review

Phase 3 is another separate PR after the generic review flow is stable.

It may add a specialized read-only size-chart matrix using only measurement kinds already defined by the current contract. If content cannot be mapped safely, the generic read-only representation remains the fallback.

A specialized editor or new authoritative size validation is deferred to a later spec because those changes affect business semantics and require their own source/contract review.

## Verification gates

Each phase must independently satisfy:

1. targeted regression tests for the behavior introduced in that phase;
2. repository typecheck/tests/build through `pnpm check`;
3. code review in correctness → security → architecture → simplicity → performance order;
4. no accidental files from a later phase in the PR diff;
5. browser/runtime walkthrough when a browser/DevTools connector is available.

A green CI run does not replace the browser walkthrough for UI behavior. If browser tooling is unavailable, that limitation is recorded explicitly and the PR remains subject to human/runtime review before ship.

## Merge order

1. Merge #140 (Phase 1A) independently.
2. Merge #136 (Phase 1B) onto the accepted #140 boundary.
3. Merge #147 (Phase 1C styles/docs) onto #136.
4. Merge #153 (Phase 1D table/drawer UI) onto #147.
5. Merge #139 (Phase 2A) onto the accepted #153 boundary.
6. Merge #148 (Phase 2B) onto #139.
7. Rebase/retarget Phase 3 onto the appropriate merged baseline and review it independently.

No phase or slice is considered complete merely because the combined prototype existed on an earlier branch.

## Production release boundary — r6.1

The six UI/API phase PRs above remain source-only changes and did not individually
authorize production mutation. Production rollout is owned by the separate
`20260809-admin-policy-review-r6.1` release boundary after the per-service Admin
image selector fix in PR #160 and the runtime/build dependency security patches
in PR #162.

That release may recreate exactly `admin-api` and `admin-web` through the reviewed
scripts under `deploy/releases/20260809-admin-policy-review-r6.1`. It must preserve
the current `admin-simulation-worker` image and every other container identity.
The release has no migration, backfill, Messenger production test, routing change,
page-allowlist change, behavior-mode change or secret change.

Cutover remains blocked until a browser or human walkthrough record, exhaustive
deployment and rollback service evidence, target artifact smoke, Compose config,
health/readiness, rollback readiness and fresh runtime-state parity all pass.
