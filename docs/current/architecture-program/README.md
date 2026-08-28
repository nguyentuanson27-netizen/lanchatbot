# LANA Chatbot Architecture Program — Context Index

**Purpose:** Keep planning context small while preserving durable contracts and evidence.
**Status:** Repository planning authority for BF/DF/UR on this branch; never deployment authorization.
**Operating mode:** `ENGINEERING_PREPROD`; see `OPERATING_MODE.md`.
**Current program point:** `GATE_F_PREPROD_ACCEPTED / DF_C_COMPLETE`; PREPROD remains on the exact verified COMMERCE release with `stateReadMode=LEGACY`. See `DF13_GATE_F_PREPROD_ACCEPTANCE_20260828.md`.

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

Do not load `FUTURE_BACKLOG.md` or `archive/` during a BF task unless the change explicitly touches a later contract.

Only after a recorded **GATE_BF_PASSED** or **GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS**
verdict does FUTURE_BACKLOG.md become active and completed BF detail move to
archive/completed/. A source merge, deployment, or evidence PR is not a substitute for
that explicit verdict.

## Context routing

| Task | Additional files |
|---|---|
| Process/Gate/PR/release/PREPROD evidence or CI-unavailable fallback | `OPERATING_MODE.md` |
| BF implementation/review | matching BF docs + relevant contracts |
| Policy-gated behavior | `contracts/BEHAVIOR_CONTROL_PLANE.md` |
| Model baseline/candidate generation and offline evaluation | `contracts/MODEL_EVALUATION_BOUNDARY.md` |
| Gate E registration/evaluation execution | `GATE_E_PREPROD_EXECUTION_PLAN.md` + `GATE_E_EVIDENCE_ADMISSION_ADR.md` + `contracts/MODEL_EVALUATION_BOUNDARY.md` |
| Gate E accepted / DF-C source work | `GATE_E_PREPROD_ACCEPTANCE_20260821.md` + `FUTURE_BACKLOG.md` + `PREPROD_DF_UR_PLAN_AMENDMENT.md` + relevant contracts |
| DF13 operational-acceptance preparation | `DF13_PREPROD_FRESH_PROCESS_DECISION.md` + `DF13_OPERATIONAL_ACCEPTANCE_PREPARATION.md` + `contracts/DF13_FENCE_AND_RELEASE_EVIDENCE.md` + `contracts/RELEASE_INTEGRITY.md` |
| DF13 / Gate F accepted runtime | `DF13_GATE_F_PREPROD_ACCEPTANCE_20260828.md` + `program-state.json` |
| V5 Track B model-authority implementation | `TRACK_B_MODEL_AUTHORITY_EXECUTION_PLAN.md` + `TRACK_B_MODEL_AUTHORITY_TODO.md` + `V5_OWNER_ADOPTION_20260827.md` + `program-state.json` + `contracts/MODEL_EVALUATION_BOUNDARY.md` + relevant DF13/behavior contracts |
| Release/deploy/evidence | `contracts/RELEASE_INTEGRITY.md` |
| Dataset/package work | `contracts/DATASET_BOUNDARY.md` |
| DF work after Gate BF / post-Gate-F sequencing | `FUTURE_BACKLOG.md` + `PREPROD_DF_UR_PLAN_AMENDMENT.md` + `V5_OWNER_ADOPTION_20260827.md` + relevant contracts |
| Commerce authority | Gate E/F-PREPROD + `contracts/BEHAVIOR_CONTROL_PLANE.md` + `contracts/DF13_FENCE_AND_RELEASE_EVIDENCE.md` + relevant contracts |
| State V2 | UR sections / Gate U-PREPROD + `contracts/BEHAVIOR_CONTROL_PLANE.md` + relevant contracts |
| Production hardening | `OPERATING_MODE.md` + deferred hardening section in `FUTURE_BACKLOG.md` |
| Historical audit | one relevant completed checkpoint/archive source only as needed |

## Source-of-truth ownership

- `ACTIVE_BACKLOG.md`: current BF order/dependencies/Gate BF.
- `OPERATING_MODE.md`: environment classification, release batching, PREPROD evidence semantics, Gate semantics, and `PRODUCTION_HARDENING` trigger.
- `BF_ISSUE_SPECS.md`: BF acceptance criteria.
- `ACTIVE_IMPLEMENTATION_PLAN.md`: active BF architecture/rollout. Its future-facing DF/UR shadow/canary text is superseded after Gate BF by the files below.
- `FUTURE_BACKLOG.md`: authoritative deferred DF/UR work after Gate BF.
- `PREPROD_DF_UR_PLAN_AMENDMENT.md`: authoritative on merged `main`; rationale/review contract for PREPROD simplification and future-topology changes.
- `V5_OWNER_ADOPTION_20260827.md`: binds the adopted PR #258 plan and makes it canonical for post-Gate-F sequencing only.
- `TRACK_B_MODEL_AUTHORITY_EXECUTION_PLAN.md`: execution-ready refinement for V5 Track B once separately owner-authorized; it narrows implementation/verification details without authorizing implementation, runtime mutation, deployment, or UR/State V2 work.
- `TRACK_B_MODEL_AUTHORITY_TODO.md`: checklist companion to the Track B execution plan; never evidence by itself.
- `DF13_PREPROD_FRESH_PROCESS_DECISION.md`: authoritative on merged `main` for the first stopped-process DF13 PREPROD replacement; it narrowly supersedes the prior hot-cutover mechanism for that exercise only.
- `contracts/`: durable technical invariants.
- `CURRENT_BASELINE.md`: immutable `POST_BF_V1` runtime comparison checkpoint. `program-state.json` and `GATE_E_PREPROD_ACCEPTANCE_20260821.md` record the later Gate E governance disposition; fresh runtime evidence still wins for live facts.
- `archive/`: immutable historical context.
- `incidents/`: accepted incident inputs unless contradictory evidence appears.

- ACTIVE_BACKLOG.md owns current BF order, the Gate BF matrix, and current blocker
-  disposition.
- `OPERATING_MODE.md` owns current environment classification, PR-versus-Release-Train process, Gate semantics, and the `PRODUCTION_HARDENING` trigger.
- `BF_ISSUE_SPECS.md` owns detailed BF acceptance criteria.
- `ACTIVE_IMPLEMENTATION_PLAN.md` owns active architecture and rollout.
- `FUTURE_BACKLOG.md` owns deferred DF/UR work and activates after Gate BF.
- `contracts/` owns durable invariants.
- CURRENT_BASELINE.md, program-state.json, and the later Gate E acceptance record preserve reconciled checkpoints and dispositions; they never replace fresh runtime evidence.
- `archive/` is immutable historical context.
- `incidents/` preserves accepted incident inputs; diagnosis is not reopened unless contradictory evidence is presented.

Disagreement in IDs, dependencies, authority topology, Gate status, or owner-waiver
disposition stops execution until reconciled.

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
Completed before the incident track: Release Integrity -> Confirmation -> Dataset Boundary -> R3
Mode: ENGINEERING_PREPROD; live page role: PREPROD_TEST_PAGE
Current governance: GATE_E_PREPROD_ACCEPTED (v15); POST_BF_V1 remains recorded
Accepted residuals: BF-03 deferred/non-activatable; BF-04 PARTIAL / KNOWN_GAP; BF-10 natural-terminal evidence pending

Active PREPROD roadmap:
  DF-A: DF-P1..DF-P3 / DF01-06
  -> DF-B: DF-P4..DF-P6 / DF07-10
  -> Gate E-PREPROD accepted (v15 evidence)
  -> DF-C: DF-P7 / DF11-13 source complete; first controlled LEGACY -> COMMERCE uses the separately authorized stopped-process PREPROD replacement
  -> controlled critical human E2E (passed)
  -> Gate F-PREPROD accepted / DF-C complete
  -> V5 Track B: complete normal model authority (next; not automatically authorized)
  -> V5 Track C: bounded safety + sales-quality learning loop
  -> UR / State V2 / Gate U only when a concrete trigger and separate approval require a narrow slice
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> production-readiness / rollout decision
  -> later UR08 -> UR09 -> UR10 under separate approvals
Gates BF/E/F/U: engineering/architecture evidence only; never automatic production readiness or deploy authority
```

Key distinction: PREPROD removes mandatory runtime SHADOW, live statistical gates, traffic-percent canaries, premature legacy retirement, and other production-scale ceremony that currently lacks meaningful traffic/scale. The first DF13 exercise also uses a stopped-process replacement rather than a zero-downtime controller. It does **not** remove deterministic verification, protected-claim safety, authority separation, security, exact build/configuration identity, or complete `LEGACY` rollback.

Production mechanisms may be reintroduced later only by an explicit `PRODUCTION_HARDENING` decision based on measured traffic/risk rather than assumed future scale.

This package never by itself authorizes merge, migration, activation, service recreation, Messenger production testing, deployment, page expansion, production-hardening transition, or destructive data work.