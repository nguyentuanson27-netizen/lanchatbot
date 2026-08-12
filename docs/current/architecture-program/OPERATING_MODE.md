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

## 3. Architecture-program Release Trains

Logical dependencies and acceptance criteria remain unchanged. The default deployment grouping is:

| Train | Scope | Dependency rule |
|---|---|---|
| `DF-A` | DF-01 through DF-06 | Telemetry/normalization precede canonical evidence and readiness completion. |
| `DF-B` | DF-07 through DF-10 | Phase/barrier shadow precedes Context V2 paired evaluation. |
| `DF-C` | DF-11 through DF-13 | Authority implementation, shadow evidence, and controlled promotion remain ordered. |

Individual DF items may use separate PRs and merge incrementally. By default, full verification and test-page deployment occur once per completed train, not once per DF item.

UR work is also batched by dependency and vertical outcome rather than defaulting to one UR item per deployment:

| Train | Default scope | Boundary |
|---|---|---|
| `UR-A` | UR-00 through UR-03 | ADR/go-no-go must pass before schema/reducer/atomic dual-write implementation; deployable output is the reviewed dual-write vertical. |
| `UR-B` | UR-04 through UR-05 | Backfill tooling and side-effect-free comparator are verified together. |
| `UR-C` | UR-06 through UR-07 | V2 read mode, bounded canary, and complete-LEGACY rollback form one vertical. |
| `UR-D` | UR-08 through UR-09 | Writer then reader retirement remains ordered and uses the approved rollback window. |
| `UR-X` | UR-10 | Destructive archival/drop remains a separate owner-approved change and is never implied by Gate U. |

The owner may approve a different train boundary when dependency, rollback, or operational risk requires it. Any exception must be recorded before release preparation and must not weaken the logical dependency graph.

## 4. Gate semantics

Gate BF, Gate E, Gate F, and Gate U are engineering/architecture evidence gates. They show that their stated contracts and evidence thresholds have passed within the current program scope.

They do **not** automatically mean:

- public-production readiness;
- permission to deploy, migrate, activate a policy, expand a page/brand, or send a production test;
- completion of production capacity, SLO, alerting, incident-response, compliance, or operational-readiness work.

## 5. Production-hardening trigger

`PRODUCTION_HARDENING` begins only after an explicit owner instruction naming that mode or explicitly authorizing the public-production hardening phase. The transition must be recorded in this document or a superseding authoritative governance decision before its ceremony is treated as mandatory.

That phase may add full production ceremony such as capacity/load evidence, SLOs and alerting, incident runbooks, on-call/rollback drills, security/compliance review, production traffic strategy, and final go/no-go approval. Until then, do not infer those requirements from an engineering Gate, and do not describe the `PREPROD_TEST_PAGE` as public production.

## 6. Invariants preserved in every mode

The operating-mode change alters batching and ceremony only. The following remain mandatory at PR and Release Train boundaries wherever applicable:

- every protected business claim has fresh, typed, verified provenance;
- the model may propose decisions and wording but cannot authorize side effects;
- URL/network handling remains SSRF/phishing fail-closed;
- PII, credentials, and secrets remain protected and excluded from repository evidence/logs/prompts;
- authentication, authorization, least privilege, and audit requirements remain enforced;
- database changes remain additive/backward-compatible unless separately approved, with backup/restore and data-safety controls proportional to risk;
- authority transitions preserve `LEGACY -> SHADOW -> NEW`, explicit readback, bounded propagation, and complete rollback;
- GitHub/immutable-tag provenance, per-service artifact identity, append-only evidence, runtime-state parity, and release integrity remain mandatory for every deployed Release Train;
- no silent data loss, partial authority merge, unsafe fallback, direct VPS source edit, or destructive cleanup is authorized by this mode.

## 7. Precedence and historical records

For current process questions, this file is the operating-mode authority and is routed from root `AGENTS.md`, root `README.md`, and the architecture-program index. Durable contracts continue to own technical invariants. Fresh generated runtime evidence owns live runtime facts. Archive, history, manifests, and baseline evidence retain their original wording and must not be rewritten to match this governance change.
