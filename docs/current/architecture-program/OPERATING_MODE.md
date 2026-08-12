# LANA Chatbot — Operating Mode

**Status:** Authoritative repository-wide governance
**Current mode:** `ENGINEERING_PREPROD`
**Live page role:** `PREPROD_TEST_PAGE`
**Approved page:** `1198992073286645`

This document defines how changes are reviewed, grouped, verified, and released. It does not replace fresh runtime-state evidence, authorize deployment, change the page allowlist, or weaken durable correctness/security/rollback invariants.

## 1. Current operating mode

The project operates in `ENGINEERING_PREPROD` until the owner explicitly requests `PRODUCTION_HARDENING`.

The connected page is a bounded engineering test environment. It is not public production, does not provide a production traffic population, and is not evidence that an architecture Gate is production-ready.

Current evidence strategy must therefore prove the owning technical boundary without pretending PREPROD has production traffic characteristics.

## 2. Review classes

Every future requirement is classified as one of:

- `CURRENT_REQUIRED`: correctness, security, architecture, data-integrity, authority, or rollback behavior needed now. Missing evidence blocks the owning Gate.
- `CURRENT_VERIFICATION`: deterministic/integration/replay/controlled evidence used to prove a current requirement in PREPROD.
- `DEFERRED_PRODUCTION_HARDENING`: traffic-scale or operational-readiness work that becomes mandatory only after an explicit hardening decision or measured scale/risk justifies it.

Reviewers must not treat a deferred production-hardening mechanism as a missing PREPROD acceptance criterion. Conversely, PREPROD simplification must never be used to waive a `CURRENT_REQUIRED` invariant.

## 3. PR and Release Train units

A PR is the unit of focused change/review/verification. Keep scope small, use exact-head review, run the checks applicable to the changed contract/risk boundary, and never treat merge as deployment authorization.

A Release Train is the default unit of integration, full repository verification, immutable release preparation, and any separately owner-authorized `PREPROD_TEST_PAGE` deployment.

At a train boundary verify included PRs/dependencies, run full applicable repository/integration/security/data checks, create immutable release/rollback identity if deploying, then verify runtime readback/health/routing/migration/queues/rollback readiness.

## 4. Architecture-program PREPROD grouping

Original DF01-DF13 and UR00-UR10 identifiers remain traceable. PREPROD groups them into fewer vertical slices because production-scale rollout ceremony is not a useful item boundary in the current environment.

### DF

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `DF-A` | `DF-P1..DF-P3` | DF01-DF06 | Minimum decision telemetry/normalization then canonical evidence/readiness. |
| `DF-B` | `DF-P4..DF-P6` | DF07-DF10 | Deterministic phase/barrier, Context V2, locked offline/replay evaluation. |
| `DF-C` | `DF-P7` | DF11-DF13 | Direct controlled `LEGACY -> COMMERCE` activation, readback, critical journeys, rollback. |

### UR

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `UR-A` | `UR-P1..UR-P2` | UR00-UR03 | State V2 contract then atomic persistence. |
| `UR-B` | `UR-P3` | UR04-UR07 | Measured migration/comparator then direct controlled `LEGACY -> V2` read switch/rollback. |
| deferred retirement | — | UR08-UR09 | Resume only after later stability/hardening evidence intentionally closes the legacy rollback window. |
| destructive cleanup | — | UR10 | Separate later approval only. |

The owner may approve different train boundaries when dependency/rollback/operational risk requires it, but regrouping may not weaken logical dependencies or durable contracts.

## 5. PREPROD evidence semantics

Preferred evidence stack:

1. deterministic unit/contract tests;
2. focused integration tests;
3. immutable incident/counterexample replay;
4. locked offline model/context corpus with pre-declared expected behavior;
5. side-effect-free legacy/new comparator where semantic equivalence matters;
6. transition/concurrency/idempotency/revision-fence matrices;
7. bounded controlled human E2E at explicit architecture/system checkpoints;
8. exact runtime identity/readback/rollback evidence for an owner-authorized deployed candidate.

Do not manufacture Messenger traffic merely to satisfy a numeric Gate. Synthetic fixtures are valid deterministic test data but are not production statistical evidence.

Overlapping legacy defects may prevent a human conversation from reaching the component under test. Focused deterministic/integration evidence may therefore close a component-level criterion when it proves the actual owning boundary. Full-journey testing remains mandatory at the explicit later checkpoints defined by the roadmap.

Natural traffic, long soak, live sample volume, statistical confidence, and traffic-percentage canaries are supplemental in `ENGINEERING_PREPROD` unless a specific changed risk has an explicit owner-approved requirement.

## 6. Authority transition semantics

`SHADOW` is not a mandatory runtime authority mode in PREPROD.

Current target topology:

```text
sales authority: LEGACY -> COMMERCE
state read:       LEGACY -> V2
```

Before either switch, the replacement path must be proven by its Gate using deterministic/replay/comparator evidence. Activation then requires explicit approval, audited CAS, exact readback, bounded propagation, controlled scenarios, and complete rollback to `LEGACY`.

A legacy/new comparator may be used offline or in controlled side-effect-free verification. It is verification tooling, not a third authority state.

## 7. Production-hardening trigger

`PRODUCTION_HARDENING` begins only after explicit owner instruction and a recorded governance transition.

That phase is the proper home for traffic-scale and operational-readiness mechanisms when measured risk/traffic makes them useful, including:

- real eligible legacy/new or V1/V2 traffic sampling;
- statistically meaningful comparison with pre-registered thresholds;
- traffic strategy/canaries and realistic soak;
- capacity/load evidence;
- SLOs, dashboards, alerting, incident runbooks and rollback drills;
- final security/compliance/operational-readiness review;
- public-production go/no-go.

The old `>=100` pair/non-inferiority concept is not automatically carried forward unchanged; it must be reassessed against the real future population before becoming mandatory.

## 8. Invariants preserved in every mode

- every protected business claim has fresh typed verified provenance;
- model output may propose decisions/wording but cannot authorize protected side effects;
- URL/network handling remains SSRF/phishing fail-closed;
- PII, credentials and secrets remain protected;
- auth/authz/least privilege/audit requirements remain enforced;
- database changes remain additive/backward-compatible unless separately approved;
- no partial authority merge or mixed legacy/new field synthesis is allowed;
- readback, bounded propagation and complete `LEGACY` rollback remain required for authority changes;
- no silent data loss, unsafe fallback, direct VPS source edit, premature retirement or destructive cleanup is authorized;
- Git/release/runtime provenance remains mandatory for deployed Release Trains.

## 9. Precedence

For process questions this file owns operating mode, batching, PREPROD evidence semantics, Gate semantics and the `PRODUCTION_HARDENING` trigger. `contracts/` owns durable technical invariants. `FUTURE_BACKLOG.md` plus `PREPROD_DF_UR_PLAN_AMENDMENT.md` own post-Gate-BF DF/UR execution. Fresh runtime evidence owns live facts; archives/history remain immutable.
