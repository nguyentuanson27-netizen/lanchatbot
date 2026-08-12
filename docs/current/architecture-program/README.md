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
| Process, Gate, PR/release, or environment classification | `OPERATING_MODE.md` |
| BF-01–BF-10 implementation/review | Relevant issue/wave sections + `contracts/MODEL_CLAIM_BOUNDARY.md` |
| Policy-gated behavior | `contracts/BEHAVIOR_CONTROL_PLANE.md` |
| Release/deploy/evidence | `contracts/RELEASE_INTEGRITY.md` |
| Dataset/package work | `contracts/DATASET_BOUNDARY.md` |
| DF work after Gate BF | `FUTURE_BACKLOG.md` + relevant contracts |
| Commerce authority cutover | Gate E/F in `FUTURE_BACKLOG.md` + all contracts |
| State V2 | UR-00–UR-10 in `FUTURE_BACKLOG.md` + all contracts |
| Historical audit/regression | One completed checkpoint and, only if needed, one full file under `archive/source/` |

## Source-of-truth rule

On a branch containing this directory, the following ownership applies. The two original full planning files remain immutable historical source material under `archive/source/`; disagreement in IDs, dependencies, or gates stops execution.

- `ACTIVE_BACKLOG.md` owns current BF order, dependencies, and Gate BF.
- `OPERATING_MODE.md` owns current environment classification, PR-versus-Release-Train process, Gate semantics, and the `PRODUCTION_HARDENING` trigger.
- `BF_ISSUE_SPECS.md` owns detailed BF acceptance criteria.
- `ACTIVE_IMPLEMENTATION_PLAN.md` owns active architecture and rollout.
- `FUTURE_BACKLOG.md` owns deferred DF/UR work and activates after Gate BF.
- `contracts/` owns durable invariants.
- `CURRENT_BASELINE.md` and `program-state.json` record the last accepted checkpoint but never replace fresh runtime evidence.
- `archive/` is immutable historical context.
- `incidents/` preserves accepted incident inputs; diagnosis is not reopened unless contradictory evidence is presented.

## Completion/archive policy

When a PR slice or Release Train completes:

1. Update baseline/state from reviewed append-only evidence.
2. Keep only status, immutable commits/tags, gate, durable contracts, rollback, residuals, and evidence links in active context.
3. Move verbose implementation detail to a dated `archive/completed/` checkpoint.
4. Promote future-dependent invariants into `contracts/` first.
5. Never rewrite historical evidence to match a later interpretation.

## Current position

```text
Completed: Release Integrity -> Confirmation -> Dataset Boundary -> R3
Mode: ENGINEERING_PREPROD; live page role: PREPROD_TEST_PAGE
Architecture flow: BF -> DF-A (DF01-06) -> DF-B (DF07-10) -> DF-C (DF11-13) -> UR dependency/vertical trains
Gates BF/E/F/U: engineering/architecture evidence only; never automatic production readiness or deploy authority
```

This package never by itself authorizes merge, migration, activation, service recreation, Messenger production testing, deployment, page expansion, or destructive data work.
