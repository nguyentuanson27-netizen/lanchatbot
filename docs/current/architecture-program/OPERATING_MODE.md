# LANA Chatbot — Operating Mode

**Status:** Authoritative repository-wide governance
**Current mode:** `ENGINEERING_PREPROD`
**Live page role:** `PREPROD_TEST_PAGE`
**Approved page:** `1198992073286645`

This document defines how changes are reviewed, grouped, verified, and released. It does not replace fresh runtime-state evidence, authorize deployment, change the page allowlist, or weaken durable safety/authority/rollback invariants.

## 1. Current operating mode

The project operates in `ENGINEERING_PREPROD` until the owner explicitly requests `PRODUCTION_HARDENING`.

The connected page is a bounded engineering test environment. It is not evidence that the system or any architecture Gate is public-production-ready.

## 2. PR and Release Train units

### Pull request

A PR is the unit of focused change/review/verification:

- keep scope small and independently understandable;
- run checks that cover the changed contract, consumers and risk boundary;
- apply security/PII/data/migration checks where relevant;
- require exact-head review;
- merge never implies deployment.

### Release Train

A Release Train is the default unit of integration, full repository verification, immutable release preparation, and any separately owner-authorized `PREPROD_TEST_PAGE` deployment.

At a train boundary verify included PRs/dependencies, run full applicable repository/integration/security/data checks, create immutable release/rollback identity if deploying, then verify runtime readback/health/routing/migration/queues/rollback readiness.

## 3. Architecture-program PREPROD grouping

Original DF01-DF13 and UR00-UR10 identifiers remain traceable. PREPROD groups them into fewer vertical slices because traffic-dependent ceremony is not a useful per-item boundary in the current environment.

### DF

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `DF-A` | `DF-P1..DF-P3` | DF01-DF06 | Minimal telemetry/normalization then canonical evidence/readiness. |
| `DF-B` | `DF-P4..DF-P6` | DF07-DF10 | Derived phase/barrier, Context V2, locked offline evaluation. |
| `DF-C` | `DF-P7` | DF11-DF13 | `LEGACY -> SHADOW -> COMMERCE`, controlled human E2E and rollback. |

### UR

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `UR-A` | `UR-P1..UR-P2` | UR00-UR03 | State V2 contract then atomic persistence. |
| `UR-B` | `UR-P3` | UR04-UR07 | Controlled migration and `LEGACY -> SHADOW -> V2` with rollback. |
| later retirement | — | UR08-UR09 | Executed only after later rollback-window closure. |
| destructive cleanup | — | UR10 | Separate later approval only. |

The owner may approve a different train boundary when dependency/rollback/operational risk requires it, but no regrouping may weaken logical dependencies or durable contracts.

## 4. PREPROD evidence semantics

Evidence must match the environment that actually exists.

Preferred stack:

1. deterministic unit/contract tests;
2. focused integration tests;
3. immutable incident/counterexample replay;
4. locked offline model/context corpus with pre-declared expected behavior;
5. deterministic SHADOW dual-compute/replay and bounded controlled scenarios;
6. transition/concurrency/idempotency matrices;
7. bounded human E2E at explicit architecture/system checkpoints;
8. exact runtime identity/readback/rollback evidence for any deployed candidate.

Do not manufacture Messenger traffic merely to satisfy a numeric gate. Synthetic fixtures are valid test data but are not production statistical evidence.

Overlapping legacy defects may prevent E2E traffic from reaching the component under test. Focused evidence may therefore close a component-level acceptance criterion when it proves the actual owning boundary. Full-journey testing remains mandatory at the explicit later checkpoints defined by the roadmap.

Traffic scarcity may change the **source/volume of SHADOW evidence**, never the authority topology:

```text
sales authority: LEGACY -> SHADOW -> COMMERCE
state read authority: LEGACY -> SHADOW -> V2
```

These match the durable behavior-control-plane contract.

## 5. Gate semantics

Gate BF, Gate E-PREPROD, Gate F-PREPROD and Gate U-PREPROD are engineering/architecture evidence gates. They do not automatically mean public-production readiness or deployment authorization.

For PREPROD:

- correctness/security/claim provenance/side-effect authorization remain strict;
- traffic-dependent evidence may be replaced only by an explicit deterministic/replay/controlled mechanism in `FUTURE_BACKLOG.md`;
- a missing production population is not permission to skip SHADOW, rollback, or objective expected-behavior checks;
- full human E2E may be a separate checkpoint after an architecture Gate when the roadmap intentionally separates architecture proof from system-level acceptance.

## 6. Production-hardening trigger

`PRODUCTION_HARDENING` begins only after explicit owner instruction and a recorded governance transition.

That phase is the proper home for traffic-dependent/operational evidence, as applicable:

- real eligible legacy/new or V1/V2 shadow sampling;
- statistically meaningful comparison with pre-registered thresholds;
- traffic strategy/canaries and realistic soak;
- capacity/load evidence;
- SLOs, alerting, incident runbooks and rollback drills;
- final security/compliance/operational-readiness review;
- public-production go/no-go.

The old `>=100` pair/non-inferiority concept is not automatically carried forward unchanged; it should be reassessed against the real future population before becoming mandatory.

Legacy comparison and complete-`LEGACY` rollback paths remain available through production hardening and the rollout decision. PREPROD Gate U does not retire them.

## 7. Invariants preserved in every mode

- every protected business claim has fresh typed verified provenance;
- the model may propose decisions/wording but cannot authorize protected side effects;
- URL/network handling remains SSRF/phishing fail-closed;
- PII, credentials and secrets remain protected;
- auth/authz/least privilege/audit requirements remain enforced;
- database changes remain additive/backward-compatible unless separately approved;
- sales authority preserves `LEGACY -> SHADOW -> COMMERCE`;
- state read preserves `LEGACY -> SHADOW -> V2`;
- readback, bounded propagation and complete `LEGACY` rollback remain required;
- no partial authority merge, silent data loss, unsafe fallback, direct VPS source edit, premature retirement or destructive cleanup is authorized;
- Git/release/runtime provenance remains mandatory for deployed Release Trains.

## 8. Precedence

For process questions this file owns operating mode, batching, PREPROD evidence semantics, Gate semantics and the `PRODUCTION_HARDENING` trigger. Durable contracts own technical invariants; fresh runtime evidence owns live facts; archives/history remain immutable.
