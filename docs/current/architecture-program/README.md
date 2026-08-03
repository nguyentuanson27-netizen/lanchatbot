# LANA Chatbot Architecture Program — Context Index

**Purpose:** Keep default planning context small without losing completed evidence or durable contracts.
**Status:** Repository planning authority for BF/DF/UR on the branch containing this directory; never deployment authorization.

## Default reading order for a BF task

1. Repository-root `AGENTS.md`.
2. Repository-root `README.md`.
3. This `README.md`.
4. `CURRENT_BASELINE.md`.
5. `program-state.json`.
6. `ACTIVE_BACKLOG.md`.
7. Only the matching `BF-xx` section from `BF_ISSUE_SPECS.md`.
8. Only the matching wave/rollout section from `ACTIVE_IMPLEMENTATION_PLAN.md`.
9. Only directly relevant files under `contracts/`.
10. Fresh generated runtime-state and release manifest after fetching GitHub `main` whenever production status matters.

Do not load `FUTURE_BACKLOG.md` or `archive/` during a BF task unless the change explicitly touches a later contract.

After Gate BF, `FUTURE_BACKLOG.md` becomes active and completed BF detail moves to `archive/completed/`.

## Context routing

| Task | Additional files |
|---|---|
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
- `BF_ISSUE_SPECS.md` owns detailed BF acceptance criteria.
- `ACTIVE_IMPLEMENTATION_PLAN.md` owns active architecture and rollout.
- `FUTURE_BACKLOG.md` owns deferred DF/UR work and activates after Gate BF.
- `contracts/` owns durable invariants.
- `CURRENT_BASELINE.md` and `program-state.json` record the last accepted checkpoint but never replace fresh runtime evidence.
- `archive/` is immutable historical context.
- `incidents/` preserves accepted incident inputs; diagnosis is not reopened unless contradictory evidence is presented.

## Completion/archive policy

When a slice completes:

1. Update baseline/state from reviewed append-only evidence.
2. Keep only status, immutable commits/tags, gate, durable contracts, rollback, residuals, and evidence links in active context.
3. Move verbose implementation detail to a dated `archive/completed/` checkpoint.
4. Promote future-dependent invariants into `contracts/` first.
5. Never rewrite historical evidence to match a later interpretation.

## Current position

```text
Completed: Release Integrity -> Confirmation -> Dataset Boundary -> R3
Paused: DF/UR
Active: BF waves A/B/C -> Gate BF
Then: DF-01..DF-13 -> Gate E/F -> UR-00..UR-10 -> Gate U
```

This package never by itself authorizes merge, migration, activation, service recreation, Messenger production testing, deployment, page expansion, or destructive data work.
