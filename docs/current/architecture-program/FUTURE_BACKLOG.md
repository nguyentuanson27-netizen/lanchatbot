# Deferred Active Backlog — DF and UR

**Activation condition:** Gate BF passed and immutable `POST_BF_V1` captured.
**Operating mode:** `ENGINEERING_PREPROD`.
**Plan rationale:** `PREPROD_DF_UR_PLAN_AMENDMENT.md`.

The original DF01-DF13 and UR00-UR10 identifiers remain traceable. PREPROD groups work into fewer execution slices and replaces unavailable production-traffic evidence with deterministic/replay/controlled evidence. Durable authority and rollback contracts are not weakened.

## DF Release Trains

- `DF-A`: DF-P1..DF-P3 / original DF01-DF06.
- `DF-B`: DF-P4..DF-P6 / original DF07-DF10.
- `DF-C`: DF-P7 / original DF11-DF13.

### DF-P1 — Minimal architecture telemetry (DF01-DF03)

Expose only bounded, versioned, PII-safe fields needed to explain and replay architecture decisions: dialogue evidence, buying intent, claim validation, readiness, phase/barrier, context version, strategy/CTA, reconciliation, guard and side-effect plan.

Additive schema only. Do not reinterpret historical rows or turn this into production dashboard/SLO work.

### DF-P2 — Targeted normalization (DF04)

Move only consumers required by the new architecture to named normalization primitives. No broad legacy cleanup.

### DF-P3 — Canonical evidence and readiness (DF05-DF06)

- keep the approved hybrid buying-intent authority;
- add dialogue evidence separately;
- add typed protected-claim provenance, including size/fit;
- derive fresh product-aware readiness immediately before side effects;
- model evidence alone cannot authorize cart/order/protected effects.

### DF-P4 — Derived phase and barriers (DF07-DF08)

Derive `ConversationPhaseV2` and finite-lifecycle barriers deterministically from canonical/commerce state. Keep ownership/handoff separate. Support backward phase movement when authoritative state changes.

Verification: transition matrix + incident/replay corpus; no traffic-volume requirement.

### DF-P5 — Context V2 (DF09)

Version Context V2 and migrate intended consumers: strategy, CTA, post-media logic, output interpretation and audit metadata.

### DF-P6 — Locked offline evaluation (DF10)

Build a versioned corpus from accepted BF incidents/counterexamples, relevant safe historical conversations, and controlled fixtures for product switching, correction, media, URL, size, order review and confirmation.

Before first scored run, freeze corpus membership/strata, each case's `MUST_PASS` expected behaviors, safety/factual/side-effect assertions, and any additional objective quality rubric/acceptance rule.

Acceptance:

- V2 passes 100% of frozen safety-critical, protected-claim, side-effect and other `MUST_PASS` assertions;
- required rules cannot be changed after results are seen without a reviewed amendment and rerun;
- V1 may be evaluated for diagnosis/comparison but is not the quality gold standard;
- qualitative style/preferences are supplemental only.

No `>=100` live-pair or production-statistical-confidence requirement in `ENGINEERING_PREPROD`.

## Gate E-PREPROD

- [ ] Canonical buying intent has one approved authority.
- [ ] Dialogue evidence is separate from buying intent.
- [ ] Protected claims have typed verified provenance.
- [ ] Product-aware readiness is fresh and deterministic before side effects.
- [ ] Phase/barrier contracts are versioned, deterministic and PII-safe.
- [ ] Context V2 and intended consumers are implemented.
- [ ] Accepted BF incident/counterexample replay passes.
- [ ] DF-P6 corpus/rubric is frozen before scoring.
- [ ] V2 passes all frozen `MUST_PASS` safety/factual/side-effect/required-behavior assertions.
- [ ] Evaluation paths are side-effect-free and cost bounded.

Gate E-PREPROD is engineering evidence only; it is not production readiness.

### DF-P7 — Commerce authority (DF11-DF13)

Implement database-backed `LEGACY | SHADOW | COMMERCE` and exercise the durable order:

```text
LEGACY -> SHADOW -> COMMERCE
```

`SHADOW` is mandatory as an authority stage, but PREPROD may evidence it with deterministic dual-compute/replay and bounded controlled scenarios instead of organic traffic volume.

Before COMMERCE acceptance: transition matrix and BF/DF replay pass; missing commerce state fails closed; Context V2/derived phase/reconciliation/legacy-authority demotion switch coherently; no COMMERCE decision consumes legacy `salesStage`; complete `LEGACY` rollback is verified.

Then run the controlled human critical-journey set on `PREPROD_TEST_PAGE`.

## Gate F-PREPROD

- [ ] `LEGACY -> SHADOW -> COMMERCE` is exercised in order.
- [ ] Commerce FSM is authoritative in `COMMERCE`; phase is derived.
- [ ] Context V2, derived phase, reconciliation and legacy authority demotion switch coherently.
- [ ] No COMMERCE decision consumes legacy `salesStage` as authority.
- [ ] Missing commerce state with committed intent fails closed.
- [ ] Full transition matrix and BF/DF replay pass.
- [ ] Controlled PREPROD human critical journeys pass.
- [ ] Exact runtime identity/readback is verified for any deployed candidate.
- [ ] Complete `LEGACY` rollback is verified.

## UR PREPROD Release Trains

- `UR-A`: UR-P1..UR-P2 / original UR00-UR03.
- `UR-B`: UR-P3 / original UR04-UR07.
- UR08-UR09 remain later ordered retirement work.
- UR10 remains separately approved destructive cleanup.

### UR-P1 — State V2 contract/go-no-go (UR00)

Approve exact state scope, encryption/AAD/key usage, independent expiry envelopes, revision/fence semantics, transaction boundary, product selection/reset representation, migration/read policy and rollback.

### UR-P2 — Atomic State V2 persistence (UR01-UR03)

Create additive State V2 schema/reducer/persistence so State V2, legacy compatibility projections, events, Outbox, handoff and tags succeed or fail together. Prove concurrency, idempotency and revision/fence behavior.

### UR-P3 — Controlled migration and V2 read authority (UR04-UR07)

Use bounded resumable PII-safe backfill only as needed for PREPROD verification. Exercise:

```text
LEGACY -> SHADOW -> V2
```

Compare V2 with active legacy reads side-effect-free using deterministic/replay evidence. Conflicts remain ineligible and reason-coded. Never merge partial V2/legacy fields.

Switch V2 read authority only after comparator/readback evidence and verify complete rollback to `LEGACY`. Keep the legacy comparison/rollback path operational after Gate U.

## Gate U-PREPROD

Gate U proves the State V2 architecture and rollback boundary; full human E2E is a separate checkpoint after the Gate.

- [ ] State V2 design/security/database/runtime review is approved.
- [ ] Core/commerce envelopes use the approved encryption/expiry semantics.
- [ ] Atomic persistence is idempotent, concurrency tested and revision/fence protected.
- [ ] Controlled backfill/comparator/replay passes with conflicts ineligible.
- [ ] `LEGACY -> SHADOW -> V2` is exercised in order.
- [ ] V2 read switch and complete `LEGACY` rollback pass on PREPROD.
- [ ] Legacy comparison/rollback remains available after the Gate.
- [ ] UR08/UR09 retirement and UR10 destructive cleanup remain deferred/separately approved.

After Gate U-PREPROD, run the controlled full human E2E checkpoint on State V2 before entering `PRODUCTION_HARDENING`.

## UR08-UR10 — Later retirement/cleanup

- **UR08:** stop legacy commercial writes only after later hardening/rollout evidence explicitly closes the rollback window.
- **UR09:** remove legacy readers/flags in a later focused release after UR08 and a zero-consumer/readback check.
- **UR10:** archival/drop remains a separate destructive ADR/change after retention, audit/legal, backup and restore requirements.

## Production hardening

Begins only after explicit owner instruction. Traffic-dependent and operational-readiness evidence belongs here, as applicable:

- real eligible V1/V2 or legacy/new shadow sampling;
- statistically meaningful comparison with pre-registered thresholds;
- traffic canaries and realistic soak;
- capacity/load evidence;
- SLOs, dashboards, alerting and runbooks;
- final security/compliance/operational-readiness review;
- public-production go/no-go and rollback rehearsal.

The prior `>=100` eligible-pair/non-inferiority idea may be reconsidered against the real future population; synthetic traffic cannot satisfy it.

## Resulting roadmap

```text
Gate BF + immutable POST_BF_V1
  -> DF-A: DF-P1..DF-P3
  -> DF-B: DF-P4..DF-P6
  -> Gate E-PREPROD
  -> DF-C: DF-P7 / LEGACY -> SHADOW -> COMMERCE
  -> controlled human E2E
  -> Gate F-PREPROD
  -> UR-A: UR-P1..UR-P2
  -> UR-B: UR-P3 / LEGACY -> SHADOW -> V2
  -> Gate U-PREPROD
  -> controlled full human E2E on State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> production-readiness/rollout decision
  -> later UR08
  -> later UR09
  -> later UR10
```
