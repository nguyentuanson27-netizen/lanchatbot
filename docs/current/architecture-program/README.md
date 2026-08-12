# LANA Chatbot Architecture Program — Context Index

**Purpose:** Keep default planning context small without losing completed evidence or durable contracts.
**Status:** Repository planning authority for BF/DF/UR on the branch containing this directory; never deployment authorization.
**Operating mode:** `ENGINEERING_PREPROD`; see `OPERATING_MODE.md` for the authoritative process boundary.

## Default reading order for a BF task

1. Repository-root `AGENTS.md`.
2. Repository-root `README.md`.
3. `OPERATING_MODE.md`.
4. This `README.md`.
5. `CURRENT_BASELINE.md`.
6. `program-state.json`.
7. `ACTIVE_BACKLOG.md`.
8. Only the matching `BF-xx` section from `BF_ISSUE_SPECS.md`.
9. Only the matching wave/rollout section from `ACTIVE_IMPLEMENTATION_PLAN.md`.
10. Only directly relevant files under `contracts/`.
11. Fresh generated runtime-state and release manifest after fetching GitHub `main` whenever live status matters.

Do not load `FUTURE_BACKLOG.md` or `archive/` during a BF task unless the change explicitly touches a later contract.

After Gate BF, `FUTURE_BACKLOG.md` becomes active and completed BF detail moves to `archive/completed/`.

## Context routing

| Task | Additional files |
|---|---|
| Process, Gate, PR/release, environment classification, or PREPROD evidence semantics | `OPERATING_MODE.md` |
| BF-01–BF-10 implementation/review | Relevant issue/wave sections + `contracts/MODEL_CLAIM_BOUNDARY.md` |
| Policy-gated behavior | `contracts/BEHAVIOR_CONTROL_PLANE.md` |
| Release/deploy/evidence | `contracts/RELEASE_INTEGRITY.md` |
| Dataset/package work | `contracts/DATASET_BOUNDARY.md` |
| DF work after Gate BF | `FUTURE_BACKLOG.md` + `PREPROD_DF_UR_PLAN_AMENDMENT.md` + relevant contracts |
| Commerce authority cutover | Gate E/F-PREPROD in `FUTURE_BACKLOG.md` + all contracts |
| State V2 | UR PREPROD slices / Gate U-PREPROD in `FUTURE_BACKLOG.md` + all contracts |
| Production-hardening preparation | `OPERATING_MODE.md` + deferred production-hardening section in `FUTURE_BACKLOG.md` |
| Historical audit/regression | One completed checkpoint and, only if needed, one full file under `archive/source/` |

## Source-of-truth rule

On a branch containing this directory, the following ownership applies. The two original full planning files remain immutable historical source material under `archive/source/`; disagreement in IDs, dependencies, or gates stops execution.

- `ACTIVE_BACKLOG.md` owns current BF order, dependencies, and Gate BF.
- `OPERATING_MODE.md` owns current environment classification, PR-versus-Release-Train process, PREPROD evidence semantics, Gate semantics, and the `PRODUCTION_HARDENING` trigger.
- `BF_ISSUE_SPECS.md` owns detailed BF acceptance criteria.
- `ACTIVE_IMPLEMENTATION_PLAN.md` owns active BF architecture and rollout.
- `FUTURE_BACKLOG.md` owns deferred DF/UR work and activates after Gate BF.
- `PREPROD_DF_UR_PLAN_AMENDMENT.md` records the rationale for grouping original DF/UR IDs into PREPROD execution slices and deferring traffic-dependent validation.
- `contracts/` owns durable invariants.
- `CURRENT_BASELINE.md` and `program-state.json` record the last accepted checkpoint but never replace fresh runtime evidence.
- `archive/` is immutable historical context.
- `incidents/` preserves accepted incident inputs; diagnosis is not reopened unless contradictory evidence is presented.

## Completion/archive policy

Merging a source-only PR records source provenance in Git/GitHub. It does not by itself update `CURRENT_BASELINE.md` or `program-state.json`, create a completed runtime checkpoint, or imply release/runtime acceptance.

When an evidence-bearing Release Train or Gate acceptance completes:

1. Update baseline/state from reviewed append-only evidence.
2. Keep only status, immutable commits/tags, gate, durable contracts, rollback, residuals, and evidence links in active context.
3. Move verbose implementation detail to a dated `archive/completed/` checkpoint.
4. Promote future-dependent invariants into `contracts/` first.
5. Never rewrite historical evidence to match a later interpretation.

## Current position

```text
Completed: Release Integrity -> Confirmation -> Dataset Boundary -> R3
Mode: ENGINEERING_PREPROD; live page role: PREPROD_TEST_PAGE
Current active track: BF -> Gate BF -> immutable POST_BF_V1
Deferred architecture flow after Gate BF:
  DF-A (DF-P1..P3 / original DF01-06)
  -> DF-B (DF-P4..P6 / original DF07-10)
  -> Gate E-PREPROD
  -> DF-C (DF-P7 / original DF11-13)
  -> controlled human E2E
  -> Gate F-PREPROD
  -> UR-A/B/C (UR-P1..P4 / original UR00-09)
  -> Gate U-PREPROD
  -> controlled human E2E after State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> production readiness / rollout
  -> UR-X / UR10 destructive cleanup only by separate later approval
Engineering Gates never imply automatic production readiness or deploy authority.
```

This package never by itself authorizes merge, migration, activation, service recreation, Messenger production testing, deployment, page expansion, production-hardening transition, or destructive data work.
