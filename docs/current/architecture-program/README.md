# LANA Chatbot Architecture Program — Context Index

**Purpose:** Keep planning context small while preserving durable contracts and evidence.
**Status:** Repository planning authority for BF/DF/UR on this branch; never deployment authorization.
**Operating mode:** `ENGINEERING_PREPROD`; see `OPERATING_MODE.md`.

## Default reading order for BF

1. root `AGENTS.md`
2. root `README.md`
3. `OPERATING_MODE.md`
4. this `README.md`
5. `CURRENT_BASELINE.md`
6. `program-state.json`
7. `ACTIVE_BACKLOG.md`
8. matching BF section from `BF_ISSUE_SPECS.md`
9. matching rollout section from `ACTIVE_IMPLEMENTATION_PLAN.md`
10. directly relevant `contracts/`
11. fresh runtime/release evidence when live state matters

Do not load `FUTURE_BACKLOG.md` during BF work unless the change explicitly affects a future contract. After Gate BF + immutable `POST_BF_V1`, future DF/UR planning becomes active.

## Context routing

| Task | Additional files |
|---|---|
| Process/Gate/PR/release/PREPROD evidence | `OPERATING_MODE.md` |
| BF implementation/review | matching BF docs + relevant contracts |
| Policy-gated behavior | `contracts/BEHAVIOR_CONTROL_PLANE.md` |
| Release/deploy/evidence | `contracts/RELEASE_INTEGRITY.md` |
| Dataset/package work | `contracts/DATASET_BOUNDARY.md` |
| DF work after Gate BF | `FUTURE_BACKLOG.md` + `PREPROD_DF_UR_PLAN_AMENDMENT.md` + relevant contracts |
| Commerce authority | Gate E/F-PREPROD + all relevant contracts |
| State V2 | UR sections / Gate U-PREPROD + all relevant contracts |
| Production hardening | `OPERATING_MODE.md` + deferred hardening section in `FUTURE_BACKLOG.md` |
| Historical audit | one relevant completed checkpoint/archive source only as needed |

## Source-of-truth ownership

- `ACTIVE_BACKLOG.md`: current BF order/dependencies/Gate BF.
- `OPERATING_MODE.md`: environment classification, release batching, PREPROD evidence semantics, Gate semantics, `PRODUCTION_HARDENING` trigger.
- `BF_ISSUE_SPECS.md`: BF acceptance criteria.
- `ACTIVE_IMPLEMENTATION_PLAN.md`: active BF architecture/rollout.
- `FUTURE_BACKLOG.md`: deferred DF/UR work after Gate BF.
- `PREPROD_DF_UR_PLAN_AMENDMENT.md`: rationale for PREPROD regrouping/evidence changes.
- `contracts/`: durable invariants.
- `CURRENT_BASELINE.md` and `program-state.json`: last accepted checkpoint only; fresh runtime evidence wins for live facts.
- `archive/`: immutable historical context.
- `incidents/`: accepted incident inputs unless contradictory evidence appears.

Disagreement in IDs, dependencies or Gates stops execution until reconciled.

## Completion/archive policy

A merged source PR records source provenance only. It does not imply release/runtime acceptance.

At evidence-bearing train/Gate completion:

1. update baseline/state from reviewed append-only evidence;
2. keep only current status, immutable identities, Gate, durable contracts, rollback/residuals/evidence links in active context;
3. move verbose completed detail to archive;
4. promote future durable invariants into `contracts/` first;
5. never rewrite historical evidence to fit a later interpretation.

## Current/deferred roadmap

```text
Current:
  BF -> Gate BF -> immutable POST_BF_V1

Deferred PREPROD:
  DF-A: DF-P1..DF-P3 / DF01-06
  -> DF-B: DF-P4..DF-P6 / DF07-10
  -> Gate E-PREPROD
  -> DF-C: DF-P7 / DF11-13 / LEGACY -> SHADOW -> COMMERCE
  -> controlled human E2E
  -> Gate F-PREPROD
  -> UR-A: UR-P1..UR-P2 / UR00-03
  -> UR-B: UR-P3 / UR04-07 / LEGACY -> SHADOW -> V2
  -> Gate U-PREPROD
  -> controlled full human E2E on State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> production-readiness / rollout decision
  -> later UR08 -> UR09 -> UR10 under separate approvals
```

Key distinction: PREPROD may replace unavailable traffic volume with deterministic/replay/controlled evidence, but it does not skip durable authority stages, rollback, protected-claim verification or objective expected-behavior checks.

This package never by itself authorizes merge, migration, activation, service recreation, Messenger production testing, deployment, page expansion, production-hardening transition, or destructive data work.
