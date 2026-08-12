# PREPROD DF/UR Plan Amendment

**Status:** Proposed architecture-program amendment; review required before merge
**Mode:** `ENGINEERING_PREPROD`
**Scope:** Deferred DF/UR execution and evidence strategy only
**Non-goals:** Gate BF disposition, runtime mutation, deployment authorization, production-readiness claim, destructive cleanup

## 1. Why this amendment exists

The project is not public production. It currently has one bounded `PREPROD_TEST_PAGE`, low/irregular organic traffic, and overlapping legacy defects that can prevent a complete human conversation from reaching the component under test.

The original DF/UR architecture direction remains valid, but some evidence mechanics assume a production-like population: large live shadow samples, statistical non-inferiority, percentage canaries, and long traffic-based observation windows. Those mechanisms are not meaningful when the required population does not yet exist. Synthetic traffic may be useful test data, but it must not be presented as production statistical evidence.

This amendment therefore changes **execution grouping and PREPROD evidence mechanics**, not the core architecture, safety, or rollback contracts.

## 2. What remains invariant

The following remain binding:

- protected business claims require fresh typed verified provenance;
- model output is advisory and cannot authorize protected side effects;
- safety boundaries remain fail-closed;
- SSRF/phishing, PII, secret, authz, least-privilege, idempotency, concurrency and data-integrity controls remain mandatory;
- sales authority keeps `LEGACY -> SHADOW -> COMMERCE`;
- state-read authority keeps `LEGACY -> SHADOW -> V2`;
- `SHADOW` is not skipped, but PREPROD may evidence it with deterministic dual-compute/replay and bounded controlled scenarios instead of production traffic volume;
- complete `LEGACY` rollback remains available while replacement authority is being proven;
- immutable Git/release/runtime provenance remains mandatory for any deployed Release Train.

## 3. PREPROD evidence hierarchy

Use the cheapest evidence that actually proves the owning boundary:

1. deterministic unit/contract tests;
2. focused integration tests across real boundaries;
3. immutable BF incident and counterexample replay;
4. locked offline model/context corpus with pre-declared expected behaviors;
5. deterministic `SHADOW` dual-compute/replay and transition matrices;
6. concurrency/idempotency/revision-fence tests for stateful work;
7. bounded human E2E only at architecture checkpoints where a complete journey is expected to be possible;
8. exact artifact/runtime readback and rollback evidence for owner-authorized test-page deployment.

A component may be accepted from focused evidence when unrelated legacy defects prevent an E2E path from reaching it. That exception does not remove the later full-journey checkpoints.

## 4. DF PREPROD execution slices

Keep original DF01-DF13 identifiers for traceability, but execute them as seven slices.

### DF-P1 — Minimal architecture telemetry (DF01-DF03)

Add only bounded, versioned, PII-safe fields needed to explain/replay architecture decisions: dialogue evidence, buying intent, claim validation, readiness, phase/barrier, context version, strategy/CTA, reconciliation, guard and final side-effect plan.

Do not require production dashboards, SLOs, warehouse-style analytics migration, or reinterpretation of historical rows.

### DF-P2 — Targeted normalization (DF04)

Move only consumers needed by the new architecture to named normalization primitives. Do not use this work as a broad legacy refactor.

### DF-P3 — Canonical evidence and readiness (DF05-DF06)

Create the canonical evidence boundary: approved buying-intent authority, separate dialogue evidence, typed protected-claim provenance, and product-aware deterministic readiness immediately before side effects.

### DF-P4 — Derived phase and barriers (DF07-DF08)

Derive `ConversationPhaseV2` and finite-lifecycle barriers deterministically from canonical/commerce state. Keep ownership/handoff separate and allow backward phase movement when authoritative state changes.

### DF-P5 — Context V2 (DF09)

Version Context V2 and migrate the intended consumers: strategy, CTA, post-media logic, output interpretation and audit metadata.

### DF-P6 — Locked offline evaluation (DF10)

Do not require `>=100` organic/live pairs in PREPROD. Build a versioned corpus from accepted BF incidents/counterexamples, relevant safe historical conversations, and controlled fixtures for product switching, correction, media, URL, size, order review and confirmation.

Before the first scored run, freeze:

- corpus membership and strata;
- each case's `MUST_PASS` expected behaviors;
- safety/factual/side-effect assertions;
- any additional objective quality rubric and its acceptance rule.

Gate on V2 meeting the frozen expected-behavior contract. V1 may be run against the same corpus for diagnosis/comparison, but **V1 is not the quality gold standard** because the current baseline contains known defects.

Mandatory PREPROD rule:

- 100% of safety-critical, protected-claim, side-effect and other `MUST_PASS` assertions pass for V2;
- no required rubric/threshold may be changed after results are inspected unless a reviewed amendment invalidates and reruns the evaluation;
- qualitative style/preferences remain supplemental and cannot override a failed required assertion.

This is objective engineering evidence, not production statistical confidence. Real-population statistical validation remains for `PRODUCTION_HARDENING` if it is still appropriate then.

### DF-P7 — Commerce authority (DF11-DF13)

Implement and exercise `LEGACY -> SHADOW -> COMMERCE` in order. PREPROD `SHADOW` uses deterministic dual-compute/replay and bounded controlled scenarios; it does not require a minimum organic traffic count.

Before `COMMERCE` acceptance: transition matrix and BF/DF replay pass, missing commerce state fails closed, Context V2/derived phase/reconciliation/legacy-authority demotion switch coherently, no COMMERCE decision relies on legacy `salesStage`, and complete `LEGACY` rollback is verified.

Then run the approved controlled human critical-journey set before Gate F-PREPROD.

## 5. Gate E-PREPROD

Gate E is an engineering/architecture gate, not production readiness.

Required:

- canonical buying intent has one approved authority;
- dialogue evidence is separate from buying intent;
- protected claims have typed verified provenance;
- product-aware readiness is fresh and deterministic;
- phase/barrier contracts are versioned, deterministic and PII-safe;
- Context V2 and intended consumers are implemented;
- accepted BF incident/counterexample replay passes;
- the DF-P6 corpus/rubric is frozen before scoring;
- V2 passes all frozen `MUST_PASS` safety, factual, side-effect and required behavioral assertions;
- evaluation paths are side-effect-free and cost bounded.

Not required in `ENGINEERING_PREPROD`: organic traffic volume, a fixed live pair count, production statistical confidence, or traffic-percent canary evidence.

## 6. Gate F-PREPROD

Required:

- `LEGACY -> SHADOW -> COMMERCE` is exercised in order;
- Commerce FSM is authoritative in `COMMERCE` and phase is derived;
- Context V2, derived phase, reconciliation and legacy authority demotion switch coherently;
- no COMMERCE decision consumes legacy `salesStage` as authority;
- missing commerce state with committed intent fails closed;
- full transition matrix and BF/DF replay pass;
- controlled PREPROD human critical journeys pass;
- exact runtime identity/readback is verified for any deployed candidate;
- complete `LEGACY` rollback is verified.

## 7. UR PREPROD plan

State V2 stays pre-production architecture work, but actual legacy retirement does not need to happen before production hardening.

### UR-P1 — State V2 contract/go-no-go (UR00)

Approve exact state scope, encryption/AAD/key usage, independent expiry envelopes, revision/fence semantics, transaction boundary, product selection/reset representation, migration/read policy and rollback.

### UR-P2 — Atomic State V2 persistence (UR01-UR03)

Implement additive schema, deterministic reducer and atomic persistence so State V2, legacy compatibility projections, events, Outbox, handoff and tags succeed or fail together. Prove concurrency, idempotency and revision/fence behavior.

### UR-P3 — Controlled migration and read authority (UR04-UR07)

Use bounded resumable PII-safe backfill only as needed for the PREPROD dataset. Exercise `LEGACY -> SHADOW -> V2` in order. Compare V2 with legacy reads side-effect-free using deterministic/replay evidence; conflicts remain ineligible and reason-coded. Never merge partial V2/legacy fields.

Switch V2 read authority only after comparator/readback evidence and verify complete rollback to `LEGACY`. Keep the legacy comparison/rollback path available after Gate U.

### UR08-UR09 — Deferred legacy retirement

Do not execute legacy writer/reader retirement merely to complete PREPROD architecture. Keep these original IDs for the later ordered retirement after production-hardening/rollout evidence closes the rollback window:

1. UR08 stops legacy commercial writes only after explicit approval to close that rollback window;
2. UR09 removes legacy readers/flags in a later release after UR08 and a zero-consumer/readback check.

### UR10 — Destructive cleanup later still

Archival/drop remains a separate destructive ADR/change after retention, audit/legal, backup and restore requirements are satisfied. It is never implied by Gate U.

## 8. Gate U-PREPROD and human acceptance

Gate U proves the State V2 architecture and rollback boundary. It does **not** include the full human E2E checkpoint in its own checklist.

Required Gate U evidence:

- State V2 design/security/database/runtime review is approved;
- encryption/expiry semantics are implemented as designed;
- atomic persistence is idempotent, concurrency tested and revision/fence protected;
- controlled backfill/comparator/replay passes with conflicts ineligible;
- `LEGACY -> SHADOW -> V2` is exercised in order;
- V2 read switch and complete `LEGACY` rollback pass on PREPROD;
- UR08/UR09 retirement remains deferred and the legacy comparison/rollback path remains available;
- UR10 remains separately approved destructive work.

After Gate U-PREPROD, run the controlled full human E2E checkpoint on State V2 before entering production hardening. This keeps the architecture gate and system-level acceptance checkpoint distinct.

## 9. Production hardening

`PRODUCTION_HARDENING` begins only after explicit owner instruction. This is where traffic-dependent and operational-readiness evidence belongs, as applicable:

- real eligible V1/V2 or legacy/new shadow sampling;
- statistically meaningful comparison and pre-registered thresholds;
- traffic canaries and realistic soak;
- capacity/load evidence;
- SLOs, dashboards, alerting and incident runbooks;
- final security/compliance/operational-readiness review;
- public-production go/no-go and rollback rehearsal.

The former `>=100` real eligible-pair/non-inferiority idea may be reconsidered here against the real population; it is not automatically mandatory forever.

## 10. Resulting roadmap

```text
Gate BF + immutable POST_BF_V1
  -> DF-P1..DF-P6
  -> Gate E-PREPROD
  -> DF-P7 / LEGACY -> SHADOW -> COMMERCE
  -> controlled human E2E
  -> Gate F-PREPROD
  -> UR-P1..UR-P3 / LEGACY -> SHADOW -> V2
  -> Gate U-PREPROD
  -> controlled full human E2E on State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> real traffic / operational readiness as applicable
  -> public-production readiness / rollout decision
  -> later UR08 stop legacy writes
  -> later UR09 remove legacy readers/flags
  -> later UR10 destructive cleanup under separate approval
```

## 11. Change boundary

This amendment does not pass Gate BF, create `POST_BF_V1`, activate DF, deploy anything, mutate runtime/database/policy/page routing, authorize production hardening, or authorize destructive cleanup.