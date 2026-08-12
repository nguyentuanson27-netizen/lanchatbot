# PREPROD DF/UR Plan Amendment

**Status:** Proposed architecture-program amendment; review required before merge
**Mode:** `ENGINEERING_PREPROD`
**Scope:** Deferred DF/UR execution and evidence strategy only
**Non-goals:** Gate BF disposition, runtime mutation, deployment authorization, production-readiness claim, destructive cleanup

## 1. Context

The architecture direction remains valid, but the original DF/UR evidence plan assumes a level of organic traffic and end-to-end conversational stability that the current project does not yet have.

The project currently operates with one `PREPROD_TEST_PAGE`, not public production. Several legacy defects overlap, so a full human conversation can fail before it reaches the component under test. That makes production-style traffic gates a poor fit for the current phase.

In particular, the original plan depends on mechanisms such as:

- live Context V1/V2 shadow sampling;
- at least 100 stratified eligible live pairs;
- statistical non-inferiority over those pairs;
- traffic canary/divergence evidence;
- long observation windows that assume meaningful user volume.

Those are valid production-hardening mechanisms, but they are not honest or useful engineering gates when the project cannot naturally generate the required population. Creating synthetic traffic merely to satisfy a numeric threshold would produce false confidence.

## 2. Decision

Keep the DF01-DF13 and UR00-UR10 identifiers for traceability, but execute them as smaller PREPROD-oriented vertical slices.

The evidence hierarchy in `ENGINEERING_PREPROD` becomes:

1. deterministic unit/contract tests;
2. focused integration tests across real boundaries;
3. immutable incident and counterexample replay;
4. controlled offline V1/V2 evaluation where model comparison is needed;
5. transition/concurrency/idempotency matrices for stateful authority work;
6. bounded controlled human E2E only after the architecture is sufficiently converged to support a complete journey;
7. exact runtime identity/readback/rollback evidence for any owner-authorized test-page deployment.

This amendment changes the **evidence mechanism and execution grouping**, not the correctness or safety bar.

The following remain mandatory:

- fresh typed provenance for protected claims;
- deterministic authorization of side effects;
- fail-closed behavior at safety boundaries;
- SSRF/phishing, PII, secret, authz, least-privilege, idempotency and data-integrity controls;
- explicit authority transitions and complete rollback;
- immutable Git/release/runtime provenance for deployed Release Trains.

## 3. DF PREPROD execution slices

The original DF IDs are preserved and grouped into seven execution slices.

### DF-P1 — Minimal architecture telemetry (DF01-DF03)

Add only the bounded, versioned, PII-safe fields needed to explain and replay architecture decisions: dialogue evidence, buying intent, protected-claim validation, readiness, phase/barrier, context version, strategy/CTA, guard/reconciliation and final side-effect plan.

Do not require production dashboards, SLOs, warehouse-style analytics migration or reinterpretation of historical rows.

### DF-P2 — Targeted normalization (DF04)

Move only consumers required by the new architecture to named normalization primitives. Do not use normalization work as a broad legacy refactor.

### DF-P3 — Canonical evidence and readiness (DF05-DF06)

Create the canonical evidence boundary:

- keep buying intent on the existing approved hybrid resolver;
- add dialogue evidence as a separate versioned contract;
- add typed protected-claim provenance, including size/fit;
- derive product-aware readiness from fresh verified evidence immediately before side effects;
- keep model output advisory: model evidence alone cannot authorize cart/order/state effects.

### DF-P4 — Derived phase and barriers (DF07-DF08)

Derive `ConversationPhaseV2` and finite-lifecycle barriers deterministically from commerce/canonical evidence. Keep ownership/handoff separate. Support backward phase movement when authoritative state changes.

Verification is a deterministic transition matrix plus replay, not traffic volume.

### DF-P5 — Context V2 (DF09)

Version Context V2 and migrate the intended consumers: strategy, CTA, post-media logic, output interpretation and audit metadata. Context V2 consumes canonical dialogue evidence, verified claims, buying intent, readiness, derived phase/barrier and product/media context.

### DF-P6 — Offline paired evaluation (DF10)

Replace the PREPROD requirement for at least 100 live shadow pairs with a controlled evaluation corpus built from:

- the ten BF incidents and accepted counterexamples;
- relevant historical conversations when available and safe to use;
- product-switch, correction, media, URL, size, order-review and confirmation fixtures;
- explicitly labelled synthetic variants used only as test data.

Run V1 and V2 side-effect-free against the same eligible inputs. Gate on zero safety regression and explicit review of behavioral/factual differences.

The former `>=100` live-pair and `V2 - V1 >= -0.15` statistical gate is deferred to `PRODUCTION_HARDENING`, where a realistic population can exist. Synthetic fixtures must not be presented as production statistical evidence.

### DF-P7 — Commerce authority cutover (DF11-DF13)

Implement database-backed `LEGACY | SHADOW | COMMERCE`, but use `SHADOW` in PREPROD primarily for deterministic dual-compute/replay rather than as a required live-traffic stage.

Before `COMMERCE` activation:

- transition matrix passes;
- BF/DF replay corpus passes;
- missing commerce state with committed intent fails closed;
- Context V2, derived phase, final reconciliation and legacy regex-authority demotion switch coherently;
- no COMMERCE decision depends on legacy `salesStage` authority;
- complete `LEGACY` rollback is verified.

After those checks, run bounded controlled human E2E on the `PREPROD_TEST_PAGE` before Gate F-PREPROD is accepted.

## 4. Gate E-PREPROD

Gate E remains an engineering/architecture gate, but its evidence must fit the current environment.

Required:

- [ ] Canonical buying intent has one approved authority.
- [ ] Dialogue evidence is separate from buying intent.
- [ ] Protected claims have typed verified provenance.
- [ ] Product-aware readiness is fresh and deterministic before side effects.
- [ ] Phase/barrier contracts are versioned, deterministic and PII-safe.
- [ ] Context V2 contract and intended consumers are implemented.
- [ ] Full accepted BF incident/counterexample replay passes.
- [ ] Offline V1/V2 evaluation has zero safety regression.
- [ ] Evaluation/shadow paths are side-effect-free and cost bounded.

Not required in `ENGINEERING_PREPROD`:

- organic traffic volume;
- a fixed minimum live pair count;
- production statistical confidence;
- traffic-percent canary evidence.

## 5. Gate F-PREPROD

Required:

- [ ] Commerce FSM is authoritative in `COMMERCE`; conversation phase is derived.
- [ ] Context V2, derived phase, final reconciliation and legacy authority demotion switch coherently.
- [ ] No COMMERCE decision consumes legacy `salesStage` as authority.
- [ ] Missing commerce state with committed intent fails closed with bounded evidence.
- [ ] Full transition matrix and BF/DF replay pass.
- [ ] Controlled `PREPROD_TEST_PAGE` human E2E passes for the critical journey set.
- [ ] Exact runtime identity/readback is verified for any deployed candidate.
- [ ] Emergency complete-`LEGACY` rollback is verified.

## 6. UR PREPROD execution slices

State V2 remains pre-production architecture work because deferring the persistence migration until after public production would increase operational risk. The original UR IDs are preserved and grouped into four slices.

### UR-P1 — State V2 contract/go-no-go (UR00)

Approve the exact State V2 scope, encryption/AAD/key usage, independent expiry envelopes, revision/fence semantics, transaction boundary, product selection/reset representation, migration/read policy and rollback.

### UR-P2 — Atomic State V2 persistence (UR01-UR03)

Implement additive schema, deterministic reducer and atomic persistence so State V2, legacy compatibility projections, events, Outbox, handoff and tags succeed or fail together. Prove concurrency, idempotency and revision/fence behavior.

### UR-P3 — Controlled migration and read switch (UR04-UR07)

Use bounded, resumable, PII-safe backfill only for the data needed to verify the test environment. Compare V2 with active legacy reads side-effect-free using deterministic/replay evidence. Conflicts remain ineligible and reason-coded.

Switch reads `LEGACY -> V2` only after comparator/readback evidence and verify complete rollback to `LEGACY`. Do not require production traffic canary volume in PREPROD.

### UR-P4 — Ordered legacy retirement (UR08-UR09)

After V2 read behavior and rollback are proven, stop legacy commercial writes, then remove legacy readers/flags in a later focused change after a global consumer sweep. Do not combine writer and reader retirement into one irreversible step.

### UR10 — Destructive cleanup remains deferred

Archival/drop remains a separate destructive ADR/change. It is not required for Gate U-PREPROD and is not authorized by this amendment. Prefer retaining rollback/debug compatibility until production readiness and a later explicit owner decision justify destructive cleanup.

## 7. Gate U-PREPROD

Required:

- [ ] ADR/security/database/runtime reviews approve the exact State V2 design.
- [ ] Core and commerce envelopes have the approved encryption/expiry semantics.
- [ ] Atomic persistence is idempotent, revision/fence protected and concurrency tested.
- [ ] Controlled backfill/comparator/replay passes with conflicts ineligible.
- [ ] V2 read switch and complete `LEGACY` rollback pass on PREPROD.
- [ ] Legacy writer then reader retirement is ordered and separately reviewable.
- [ ] Controlled human E2E is rerun after the State V2 read switch.
- [ ] UR10 remains separately approved and destructive work remains deferred.

## 8. Production hardening after Gate U-PREPROD

`PRODUCTION_HARDENING` begins only after the existing explicit owner trigger. This is where traffic-dependent ceremony belongs, including as applicable:

- real eligible V1/V2 or legacy/new-authority shadow sampling;
- statistically meaningful comparison and pre-registered thresholds;
- the former `>=100` real eligible pair and non-inferiority target, if still appropriate when the phase begins;
- production traffic strategy and percentage canaries;
- sustained soak against realistic volume;
- capacity/load testing;
- SLOs, dashboards, alerting, runbooks and incident drills;
- final security/compliance/operational-readiness review;
- public-production go/no-go and rollback rehearsal.

These requirements are deferred, not deleted. They become mandatory only under the production-hardening governance decision appropriate to the future environment.

## 9. Resulting roadmap

```text
Gate BF + immutable POST_BF_V1
  -> DF-P1 telemetry (DF01-03)
  -> DF-P2 targeted normalization (DF04)
  -> DF-P3 canonical evidence/readiness (DF05-06)
  -> DF-P4 phase/barrier (DF07-08)
  -> DF-P5 Context V2 (DF09)
  -> DF-P6 offline evaluation (DF10)
  -> Gate E-PREPROD
  -> DF-P7 commerce authority (DF11-13)
  -> controlled human E2E
  -> Gate F-PREPROD
  -> UR-P1 State V2 contract (UR00)
  -> UR-P2 atomic persistence (UR01-03)
  -> UR-P3 migration/read switch (UR04-07)
  -> UR-P4 legacy retirement (UR08-09)
  -> Gate U-PREPROD
  -> controlled human E2E after State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> production readiness / rollout
  -> UR10 destructive cleanup only under separate later approval
```

## 10. Alternatives considered

### Keep the original traffic gates unchanged

Rejected for PREPROD because the project does not have a reliable organic population large enough to make those gates reachable or meaningful.

### Generate synthetic traffic until numeric thresholds are met

Rejected because synthetic fixtures are useful for deterministic coverage but cannot honestly stand in for production statistical evidence.

### Skip DF/UR architecture and proceed directly to human testing

Rejected because current overlapping legacy defects make human E2E a poor component-level diagnostic, and postponing canonical evidence/authority/State V2 work would increase production risk.

### Chosen direction

Keep the architecture and safety invariants, simplify execution grouping, use deterministic/replay evidence during PREPROD, and reserve traffic-dependent validation for the future environment where it can be measured honestly.

## 11. Change boundary

This document does not:

- declare Gate BF passed;
- create `POST_BF_V1`;
- authorize DF activation before its existing dependency;
- mutate policy, database, runtime, page allowlist, routing or Messenger traffic;
- authorize deployment or production hardening;
- authorize UR10 destructive cleanup.
