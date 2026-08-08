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

## Phase 1 — list, filtering and safe review drawer

Phase 1 is the scope of PR #136.

### Admin API/store

Provide a read-oriented review boundary with:

- server-side `search`, artifact kind, lifecycle and active/inactive filtering;
- server-side sorting for newest update, oldest validated item and artifact key;
- deterministic cursor pagination using `version_id` as the tie breaker;
- pointer-aware active filtering constrained by the authenticated page scope;
- a detail context endpoint that returns the reviewed artifact, its previous version, active pointer context and eligible rollback candidates independently of the current list page.

Search remains parameterized. Literal `%`, `_` and the chosen escape character must be escaped with a PostgreSQL-valid one-character `ESCAPE` clause.

PostgreSQL `bigint` revisions may arrive from `pg` as decimal strings. Phase 1 normalizes safe non-negative revision strings explicitly and never silently falls back to `0`.

### Admin Web

Replace the large card grid with:

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

Phase 2 is a separate PR based on the accepted Phase 1 boundary.

It may add only current-page selection and bulk `VALIDATE` / `APPROVE` with a maximum of 100 items. Every request item carries `version_id + expected_revision`. Results preserve request order and return independent success/failure information.

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

1. Merge Phase 1 independently.
2. Rebase/retarget Phase 2 onto the merged Phase 1 and review it independently.
3. Rebase/retarget Phase 3 onto the appropriate merged baseline and review it independently.

No phase is considered complete merely because the combined prototype existed on an earlier branch.