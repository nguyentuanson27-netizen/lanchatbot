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
4. controlled offline V1/V2 evaluation against a locked corpus and pre-registered rubric;
5. mandatory `SHADOW` authority stages exercised with deterministic dual-compute/replay and bounded controlled scenarios even when organic traffic volume is unavailable;
6. transition/concurrency/idempotency matrices for stateful authority work;
7. bounded controlled human E2E only after the architecture is sufficiently converged to support a complete journey;
8. exact runtime identity/readback/rollback evidence for any owner-authorized test-page deployment.

This amendment changes the **evidence mechanism and execution grouping**, not the correctness, quality, safety, authority-transition, or rollback bar.

The following remain mandatory:

- fresh typed provenance for protected claims;
- deterministic authorization of side effects;
- fail-closed behavior at safety boundaries;
- SSRF/phishing, PII, secret, authz, least-privilege, idempotency and data-integrity controls;
- sales authority transition topology `LEGACY -> SHADOW -> COMMERCE`;
- state-read authority transition topology `LEGACY -> SHADOW -> V2`;
- complete `LEGACY` rollback and a usable legacy comparison path until later hardening/rollout evidence permits separately approved retirement;
- immutable Git/release/runtime provenance for deployed Release Trains.

`SHADOW` is therefore **not optional**. PREPROD changes how `SHADOW` is evidenced: deterministic/replay/controlled evidence can replace unavailable production traffic volume, but the authority stage itself is preserved.

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

### DF-P6 — Locked offline paired evaluation (DF10)

Replace the PREPROD requirement for at least 100 live shadow pairs with a controlled evaluation corpus built from:

- the ten BF incidents and accepted counterexamples;
- relevant historical conversations when available and safe to use;
- product-switch, correction, media, URL, size, order-review and confirmation fixtures;
- explicitly labelled synthetic variants used only as test data.

Before running the comparison, commit/freeze a versioned corpus manifest and rubric. Each eligible case must declare:

- its stratum;
- objective `MUST_PASS` safety/factual/behavioral assertions;
- the scoring rule for non-safety correctness/helpfulness/context coherence where an objective expected behavior exists;
- any case that is intentionally qualitative-only and therefore excluded from numeric acceptance.

Run V1 and V2 side-effect-free against the same eligible inputs. Gate E-PREPROD requires all of the following pre-registered engineering rules:

1. **Safety:** 100% of safety-critical `MUST_PASS` assertions pass for V2; zero safety regression from V1.
2. **Factual/contract correctness:** 100% of required factual/protected-claim/side-effect assertions pass for V2.
3. **Non-safety quality non-regression:** within every pre-registered stratum, V2 must pass at least as many required non-safety rubric assertions as V1; aggregate required non-safety pass count must also be `V2 >= V1`.
4. **No post-hoc rubric changes:** corpus membership, strata, required assertions and scoring rules cannot be changed after results are inspected except through a reviewed amendment that invalidates and reruns the evaluation.
5. **Qualitative review remains supplemental:** style/preference findings may inform future work but cannot override a failed required assertion or be used to manufacture a pass.

This is deterministic PREPROD engineering evidence, **not** a claim of production statistical confidence.

The former `>=100` live-pair and `V2 - V1 >= -0.15` statistical gate is deferred to `PRODUCTION_HARDENING`, where a realistic population can exist. Synthetic fixtures must not be presented as production statistical evidence.

### DF-P7 — Commerce authority cutover (DF11-DF13)

Implement database-backed `LEGACY | SHADOW | COMMERCE` and preserve the mandatory transition topology:

```text
LEGACY -> SHADOW -> COMMERCE
```

`SHADOW` must be entered and verified before `COMMERCE`. In PREPROD, its evidence may come primarily from deterministic dual-compute/replay plus bounded controlled scenarios rather than organic traffic volume.

Before `COMMERCE` activation:

- locked DF-P6 evaluation passes;
- transition matrix passes;
- BF/DF replay corpus passes;
- missing commerce state with committed intent fails closed;
- Context V2, derived phase, final reconciliation and legacy regex-authority demotion switch coherently;
- no COMMERCE decision depends on legacy `salesStage` authority;
- `SHADOW` divergence is reason-coded and contains no safety-critical/unclassified divergence in the controlled evidence set;
- complete `LEGACY` rollback is verified.

After those checks, run bounded controlled human E2E on the `PREPROD_TEST_PAGE` before Gate F-PREPROD is accepted.

## 4. Gate E-PREPROD

Gate E remains an engineering/architecture gate, but its evidence must fit the current environment without weakening the quality bar.

Required:

- [ ] Canonical buying intent has one approved authority.
- [ ] Dialogue evidence is separate from buying intent.
- [ ] Protected claims have typed verified provenance.
- [ ] Product-aware readiness is fresh and deterministic before side effects.
- [ ] Phase/barrier contracts are versioned, deterministic and PII-safe.
- [ ] Context V2 contract and intended consumers are implemented.
- [ ] Full accepted BF incident/counterexample replay passes.
- [ ] Offline V1/V2 corpus manifest, strata, required assertions and rubric are frozen before result inspection.
- [ ] V2 passes 100% of safety-critical and required factual/contract assertions.
- [ ] V2 has no per-stratum or aggregate regression in required non-safety rubric pass count versus V1.
- [ ] Evaluation/shadow paths are side-effect-free and cost bounded.

Not required in `ENGINEERING_PREPROD`:

- organic traffic volume;
- a fixed minimum live pair count;
- production statistical confidence;
- traffic-percent canary evidence.

Those traffic-dependent mechanisms are deferred; the locked offline quality rule above is their PREPROD engineering replacement, not a statistical substitute.

## 5. Gate F-PREPROD

Required:

- [ ] `LEGACY -> SHADOW -> COMMERCE` is exercised in order; `SHADOW` is not skipped.
- [ ] Commerce FSM is authoritative in `COMMERCE`; conversation phase is derived.
- [ ] Context V2, derived phase, final reconciliation and legacy authority demotion switch coherently.
- [ ] No COMMERCE decision consumes legacy `salesStage` as authority.
- [ ] Missing commerce state with committed intent fails closed with bounded evidence.
- [ ] Full transition matrix and BF/DF replay pass.
- [ ] Controlled `SHADOW` comparison has no safety-critical/unclassified divergence in the approved evidence set.
- [ ] Controlled `PREPROD_TEST_PAGE` human E2E passes for the critical journey set.
- [ ] Exact runtime identity/readback is verified for any deployed candidate.
- [ ] Emergency complete-`LEGACY` rollback is verified and remains usable after the Gate.

## 6. UR PREPROD execution slices

State V2 remains pre-production architecture work because deferring the persistence migration until after public production would increase operational risk. The original UR IDs are preserved and grouped into four planning/execution slices, but actual legacy retirement is deliberately later than PREPROD Gate U.

### UR-P1 — State V2 contract/go-no-go (UR00)

Approve the exact State V2 scope, encryption/AAD/key usage, independent expiry envelopes, revision/fence semantics, transaction boundary, product selection/reset representation, migration/read policy and rollback.

### UR-P2 — Atomic State V2 persistence (UR01-UR03)

Implement additive schema, deterministic reducer and atomic persistence so State V2, legacy compatibility projections, events, Outbox, handoff and tags succeed or fail together. Prove concurrency, idempotency and revision/fence behavior.

### UR-P3 — Controlled migration and mandatory SHADOW read switch (UR04-UR07)

Use bounded, resumable, PII-safe backfill only for the data needed to verify the test environment. Compare V2 with active legacy reads side-effect-free using deterministic/replay evidence. Conflicts remain ineligible and reason-coded.

Preserve the mandatory state-read topology:

```text
LEGACY -> SHADOW -> V2
```

`SHADOW` must be entered and verified before V2 read authority. In PREPROD, the comparison can be driven by deterministic/replay and bounded controlled scenarios instead of production traffic volume. Never merge partial V2/legacy fields.

Switch to V2 only after comparator/readback evidence and verify complete rollback to `LEGACY`. The legacy read path remains intact and operational after PREPROD acceptance so it can support later hardening comparison, canary and rollback rehearsal.

After the V2 read switch, rerun the approved controlled human E2E critical journey set **before Gate U-PREPROD**.

### UR-P4 — Legacy retirement readiness (UR08-UR09)

In `ENGINEERING_PREPROD`, UR-P4 proves retirement readiness but does **not** yet stop legacy writes or remove legacy readers/flags.

Required PREPROD work:

- perform a global consumer/dependency sweep;
- identify the exact UR08 writer-stop and UR09 reader/flag-removal changes;
- prove that legacy and V2 paths do not form partial/co-authoritative merges;
- document rollback dependencies and the minimum observation window needed before retirement;
- keep the complete legacy comparison/rollback path usable through `PRODUCTION_HARDENING` and the public-production rollout decision.

Actual UR08/UR09 retirement remains ordered and separately approved:

1. UR08 may stop legacy commercial writes only after future production-hardening/rollout evidence establishes that the legacy rollback window can close.
2. UR09 may remove legacy readers/flags only in a later focused release after UR08 and a global zero-consumer/readback check.

This amendment does not authorize either retirement step.

### UR10 — Destructive cleanup remains deferred

Archival/drop remains a separate destructive ADR/change. It is not required for Gate U-PREPROD and is not authorized by this amendment. Retaining legacy storage/compatibility is preferred until production rollout, rollback-window closure and a later explicit owner decision justify destructive cleanup.

## 7. Gate U-PREPROD

Gate U-PREPROD proves that State V2 is a viable PREPROD authority with a complete legacy rollback path. It does **not** require or authorize legacy retirement.

Required:

- [ ] ADR/security/database/runtime reviews approve the exact State V2 design.
- [ ] Core and commerce envelopes have the approved encryption/expiry semantics.
- [ ] Atomic persistence is idempotent, revision/fence protected and concurrency tested.
- [ ] Controlled backfill/comparator/replay passes with conflicts ineligible.
- [ ] `LEGACY -> SHADOW -> V2` is exercised in order; `SHADOW` is not skipped.
- [ ] V2 read switch and complete `LEGACY` rollback pass on PREPROD.
- [ ] Controlled human E2E passes after the State V2 read switch.
- [ ] UR-P4 retirement-readiness sweep/documentation is complete while legacy writers/readers remain available for comparison/rollback.
- [ ] UR08/UR09 actual retirement and UR10 destructive cleanup remain separately approved later work.

## 8. Production hardening after Gate U-PREPROD

`PRODUCTION_HARDENING` begins only after the existing explicit owner trigger. This is where traffic-dependent ceremony belongs, including as applicable:

- real eligible V1/V2 or legacy/new-authority shadow sampling while legacy comparison paths still exist;
- statistically meaningful comparison and pre-registered thresholds;
- the former `>=100` real eligible pair and non-inferiority target, if still appropriate when the phase begins;
- production traffic strategy and percentage canaries;
- sustained soak against realistic volume;
- capacity/load testing;
- SLOs, dashboards, alerting, runbooks and incident drills;
- final security/compliance/operational-readiness review;
- public-production go/no-go and rollback rehearsal.

These requirements are deferred, not deleted. They become mandatory only under the production-hardening governance decision appropriate to the future environment.

Legacy comparison/rollback paths must remain usable throughout this phase. Actual UR08/UR09 retirement happens only after the separately approved rollback window is closed; UR10 remains later still.

## 9. Resulting roadmap

```text
Gate BF + immutable POST_BF_V1
  -> DF-P1 telemetry (DF01-03)
  -> DF-P2 targeted normalization (DF04)
  -> DF-P3 canonical evidence/readiness (DF05-06)
  -> DF-P4 phase/barrier (DF07-08)
  -> DF-P5 Context V2 (DF09)
  -> DF-P6 locked offline evaluation (DF10)
  -> Gate E-PREPROD
  -> DF-P7 LEGACY -> SHADOW -> COMMERCE (DF11-13)
  -> controlled human E2E
  -> Gate F-PREPROD
  -> UR-P1 State V2 contract (UR00)
  -> UR-P2 atomic persistence (UR01-03)
  -> UR-P3 LEGACY -> SHADOW -> V2 (UR04-07)
  -> controlled human E2E after State V2 read switch
  -> UR-P4 retirement readiness; legacy retained (UR08-09)
  -> Gate U-PREPROD
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> real shadow/canary/statistical/operational readiness with LEGACY rollback still available
  -> public-production readiness / rollout decision
  -> separately approved rollback-window closure
  -> UR08 stop legacy writes
  -> later UR09 remove legacy readers/flags
  -> UR10 destructive cleanup only under separate later approval
```

## 10. Alternatives considered

### Keep the original traffic gates unchanged

Rejected for PREPROD because the project does not have a reliable organic population large enough to make those gates reachable or meaningful.

### Generate synthetic traffic until numeric thresholds are met

Rejected because synthetic fixtures are useful for deterministic coverage but cannot honestly stand in for production statistical evidence.

### Make SHADOW optional in PREPROD

Rejected because `SHADOW` is part of the durable authority-transition and rollback topology. PREPROD may change how it is evidenced, not whether the stage exists.

### Retire legacy before production hardening

Rejected because later real shadow/canary/rollback evidence may still require the legacy comparison and rollback path. PREPROD proves retirement readiness; actual retirement waits for separately approved rollback-window closure.

### Skip DF/UR architecture and proceed directly to human testing

Rejected because current overlapping legacy defects make human E2E a poor component-level diagnostic, and postponing canonical evidence/authority/State V2 work would increase production risk.

### Chosen direction

Keep the architecture, quality, safety, authority-transition and rollback invariants; simplify execution grouping; use deterministic/replay evidence during PREPROD; and reserve traffic-dependent validation for the future environment where it can be measured honestly.

## 11. Change boundary

This document does not:

- declare Gate BF passed;
- create `POST_BF_V1`;
- authorize DF activation before its existing dependency;
- mutate policy, database, runtime, page allowlist, routing or Messenger traffic;
- authorize deployment or production hardening;
- authorize UR08/UR09 retirement;
- authorize UR10 destructive cleanup.
