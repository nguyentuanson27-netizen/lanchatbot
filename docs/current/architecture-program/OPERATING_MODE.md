# LANA Chatbot — Operating Mode

**Status:** Authoritative repository-wide governance
**Current mode:** `ENGINEERING_PREPROD`
**Live page role:** `PREPROD_TEST_PAGE`
**Approved page:** `1198992073286645`

This document defines how changes are reviewed, grouped, verified, and released. It does not replace fresh runtime-state evidence, authorize a deployment, change the page allowlist, or weaken any safety invariant.

## 1. Current operating mode

The project operates in `ENGINEERING_PREPROD` until the owner explicitly requests a transition to `PRODUCTION_HARDENING`.

The currently connected live page is the `PREPROD_TEST_PAGE`. It is a bounded engineering environment for controlled human testing and release-train validation; it is not a declaration that the system or any Gate is public-production-ready. Historical files may use the word “production” to describe where evidence was captured. Those records remain immutable and do not override the current operating mode.

## 2. Change and release units

### Pull request

A PR is the unit of change, focused review, and focused verification:

- keep the diff small and independently understandable;
- run tests and static checks that directly cover the changed contract, its consumers, and its risk boundary;
- run applicable secret/PII, security, migration-diff, ownership, and data-integrity checks;
- require exact-head review before merge;
- do not create a deploy expectation merely because the PR merged.

Routine PRs do not each require a release tag, full repository verification, a release manifest, or a test-page deployment. A PR may still require broader verification when its own risk or dependency surface demands it.

### Release Train

A Release Train is the default unit of integration, full verification, immutable release preparation, and deployment to the `PREPROD_TEST_PAGE` when separately authorized by the owner. At the train boundary:

1. verify every included PR and dependency from an immutable GitHub commit;
2. run frozen install, full repository checks, integration/replay suites, architecture and release-integrity guards, and all applicable security/data checks;
3. create reviewed release metadata, immutable tag, rollback identity, and runtime evidence under the existing release-integrity contract;
4. deploy only the intended services to the `PREPROD_TEST_PAGE` after explicit owner authorization;
5. verify readback, health, restart/UID, routing/allowlist, migration ledger, queues, soak, and rollback readiness.

Merging a PR, passing a Gate, or completing a Release Train review does not by itself authorize deployment.

## 3. Architecture-program PREPROD execution groups

The architecture-program keeps the original DF01-DF13 and UR00-UR10 identifiers for traceability, but PREPROD execution groups them into fewer vertical slices. `PREPROD_DF_UR_PLAN_AMENDMENT.md` records the rationale and `FUTURE_BACKLOG.md` owns the detailed deferred work.

Default DF grouping:

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `DF-A` | `DF-P1` through `DF-P3` | DF01-DF06 | Minimal telemetry and targeted normalization precede canonical evidence/readiness completion. |
| `DF-B` | `DF-P4` through `DF-P6` | DF07-DF10 | Derived phase/barrier and Context V2 precede controlled offline paired evaluation. |
| `DF-C` | `DF-P7` | DF11-DF13 | Commerce authority implementation, controlled PREPROD activation, human E2E and rollback form the authority boundary. |

Default UR grouping:

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `UR-A` | `UR-P1` through `UR-P2` | UR00-UR03 | State V2 contract/go-no-go precedes schema/reducer/atomic persistence. |
| `UR-B` | `UR-P3` | UR04-UR07 | Controlled migration, comparator, V2 read switch and complete-LEGACY rollback form one vertical. |
| `UR-C` | `UR-P4` | UR08-UR09 | Writer then reader retirement remains ordered and separately reviewable. |
| `UR-X` | separate destructive work | UR10 | Archival/drop remains a separate owner-approved change and is never implied by Gate U-PREPROD. |

Individual slices may use multiple focused PRs and merge incrementally. By default, full repository verification and test-page deployment occur once per completed Release Train, not once per original DF/UR identifier.

The owner may approve a different train boundary when dependency, rollback, or operational risk requires it. Any exception must be recorded before release preparation and must not weaken the logical dependency graph.

## 4. PREPROD evidence semantics

Engineering evidence must match the environment that actually exists.

While the project remains `ENGINEERING_PREPROD`, the preferred evidence stack is:

1. deterministic unit/contract tests;
2. focused integration tests;
3. immutable incident and counterexample replay;
4. controlled offline model/context comparison where needed;
5. transition/concurrency/idempotency matrices for stateful authority work;
6. bounded controlled human E2E only after the architecture is sufficiently converged to support the target journey;
7. exact runtime identity/readback/rollback evidence for any owner-authorized test-page deployment.

Do not manufacture synthetic Messenger traffic merely to satisfy a numeric traffic gate. Synthetic fixtures are valid deterministic test data but are not production statistical evidence.

Overlapping legacy defects may prevent an end-to-end conversation from reaching the component under test. In that case, focused deterministic/integration evidence may close the component-level acceptance criteria if it proves the actual owning boundary. Full human E2E becomes mandatory at the explicit architecture checkpoints defined by Gate F-PREPROD and Gate U-PREPROD.

## 5. Gate semantics

Gate BF, Gate E-PREPROD, Gate F-PREPROD, and Gate U-PREPROD are engineering/architecture evidence gates. They show that their stated contracts and evidence thresholds have passed within the current program scope.

They do **not** automatically mean:

- public-production readiness;
- permission to deploy, migrate, activate a policy, expand a page/brand, or send a production test;
- completion of production capacity, SLO, alerting, incident-response, compliance, or operational-readiness work.

For PREPROD gates, correctness/security requirements remain strict while traffic-dependent evidence is replaced by deterministic/replay/controlled evidence where `FUTURE_BACKLOG.md` explicitly says so.

## 6. Production-hardening trigger

`PRODUCTION_HARDENING` begins only after an explicit owner instruction naming that mode or explicitly authorizing the public-production hardening phase. The transition must be recorded in this document or a superseding authoritative governance decision before its ceremony is treated as mandatory.

That phase is the proper home for traffic-dependent validation such as, as applicable:

- real eligible legacy/new or V1/V2 shadow sampling;
- statistically meaningful paired comparison and pre-registered thresholds;
- the previously proposed `>=100` real eligible pair and non-inferiority target if still appropriate at that future point;
- production traffic strategy and percentage canaries;
- sustained soak against realistic volume;
- capacity/load evidence;
- SLOs and alerting;
- incident runbooks and rollback drills;
- final security/compliance/operational-readiness review;
- final public-production go/no-go approval.

Until then, do not infer those requirements from an engineering Gate, do not describe the `PREPROD_TEST_PAGE` as public production, and do not claim production statistical confidence from synthetic fixtures.

## 7. Invariants preserved in every mode

The operating-mode change alters batching and evidence ceremony only. The following remain mandatory at PR and Release Train boundaries wherever applicable:

- every protected business claim has fresh, typed, verified provenance;
- the model may propose decisions and wording but cannot authorize side effects;
- URL/network handling remains SSRF/phishing fail-closed;
- PII, credentials, and secrets remain protected and excluded from repository evidence/logs/prompts;
- authentication, authorization, least privilege, and audit requirements remain enforced;
- database changes remain additive/backward-compatible unless separately approved, with backup/restore and data-safety controls proportional to risk;
- authority transitions preserve explicit legacy/new modes, deterministic comparison where required, readback, bounded propagation, and complete rollback;
- GitHub/immutable-tag provenance, per-service artifact identity, append-only evidence, runtime-state parity, and release integrity remain mandatory for every deployed Release Train;
- no silent data loss, partial authority merge, unsafe fallback, direct VPS source edit, or destructive cleanup is authorized by this mode.

## 8. Precedence and historical records

For current process questions, this file is the operating-mode authority and is routed from root `AGENTS.md`, root `README.md`, and the architecture-program index. Durable contracts continue to own technical invariants. Fresh generated runtime evidence owns live runtime facts. Archive, history, manifests, and baseline evidence retain their original wording and must not be rewritten to match this governance change.
