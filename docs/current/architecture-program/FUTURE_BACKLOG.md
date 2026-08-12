# Deferred Active Backlog — DF and UR

**Activation condition:** Gate BF passed and immutable `POST_BF_V1` captured.
**Operating mode:** `ENGINEERING_PREPROD`.
**Plan rationale:** `PREPROD_DF_UR_PLAN_AMENDMENT.md`.

Original DF01-DF13 and UR00-UR10 identifiers remain traceable. PREPROD groups them into fewer execution slices and replaces production-scale traffic evidence with deterministic/replay/comparator/controlled evidence appropriate to the current environment.

## DF Release Trains

- `DF-A`: DF-P1..DF-P3 / original DF01-DF06.
- `DF-B`: DF-P4..DF-P6 / original DF07-DF10.
- `DF-C`: DF-P7 / original DF11-DF13.

### DF-P1 — Minimum decision observability (DF01-DF03)

Expose bounded, versioned, PII-safe fields required to explain/replay architecture decisions: dialogue evidence, buying intent, claim validation, readiness, phase/barrier, context version, strategy/CTA, reconciliation, guard, and side-effect plan.

Additive schema only. Do not reinterpret historical rows or turn this into production dashboard/SLO work.

### DF-P2 — Targeted normalization (DF04)

Move only consumers required by the new architecture to named normalization primitives. No broad legacy cleanup.

### DF-P3 — Canonical evidence and readiness (DF05-DF06)

- keep one approved buying-intent authority;
- add dialogue evidence separately;
- add typed protected-claim provenance, including size/fit;
- derive fresh product-aware readiness immediately before side effects;
- model evidence alone cannot authorize cart/order/protected effects.

### DF-P4 — Derived phase and barriers (DF07-DF08)

Derive `ConversationPhaseV2` and finite-lifecycle barriers deterministically from canonical/commerce state. Keep `ORDER_REVIEW` and `ORDER_CONFIRMED` distinct, keep ownership/handoff separate, and support backward phase movement when authoritative state changes.

Verification: transition table + integration + incident/counterexample replay. No runtime SHADOW stage or traffic-volume requirement.

### DF-P5 — Context V2 (DF09)

Version Context V2 and migrate intended consumers: strategy, CTA, post-media logic, output interpretation, and audit metadata.

### DF-P6 — Locked offline/replay evaluation (DF10)

Build a versioned corpus from accepted BF incidents/counterexamples, safe relevant historical cases, and controlled fixtures for product switching, correction, media, URL, size, order review, confirmation, and protected side effects.

Before first scored run freeze corpus membership/strata, each case’s `MUST_PASS` expected behavior, safety/factual/side-effect assertions, and any additional objective quality rubric/acceptance rule.

Also freeze an immutable `ContextV2CandidateManifest` for the exact evaluated generative candidate. At minimum it binds:

- model provider/name/version or immutable model identifier;
- generation configuration that can affect output;
- prompt/template version and content hash;
- Context V2 version/schema and relevant consumer contract version;
- verified-evidence envelope/schema version used to construct model input;
- relevant policy/config versions that affect candidate generation or interpretation;
- exact Git source revision used for the scored DF-P6 run;
- corpus/rubric version and content hash.

The manifest has a canonical hash recorded with the evaluation evidence.

Acceptance:

- V2 passes 100% of frozen safety-critical, protected-claim, side-effect, and other `MUST_PASS` assertions;
- required rules cannot change after results are inspected without a reviewed amendment and rerun;
- the scored results are tied to one exact `ContextV2CandidateManifest` hash;
- any material change to a candidate-identity field invalidates the prior Gate-E evaluation and requires a complete DF-P6 rerun;
- V1 may be evaluated for diagnosis/comparison but is not the quality gold standard;
- qualitative style/preferences are supplemental only.

No `>=100` organic/live-pair or production-statistical-confidence requirement in `ENGINEERING_PREPROD`.

## Gate E-PREPROD

- [ ] Canonical buying intent has one approved authority.
- [ ] Dialogue evidence is separate from buying intent.
- [ ] Protected claims have typed verified provenance.
- [ ] Product-aware readiness is fresh and deterministic before side effects.
- [ ] Phase/barrier contracts are versioned, deterministic, and PII-safe.
- [ ] Context V2 and intended consumers are implemented.
- [ ] Accepted BF incident/counterexample replay passes.
- [ ] DF-P6 corpus/rubric is frozen before scoring.
- [ ] Exact `ContextV2CandidateManifest` and canonical hash are frozen before scoring.
- [ ] V2 passes all frozen required safety/factual/side-effect/behavior assertions using that exact candidate manifest.
- [ ] Evaluation paths are side-effect-free and cost bounded.

Not Gate E requirements: runtime SHADOW, organic traffic volume, fixed live pair count, traffic canary, or production statistical confidence.

### DF-P7 — Direct controlled Commerce authority (DF11-DF13)

Implement database-backed:

```text
LEGACY | COMMERCE
```

Target transition:

```text
LEGACY -> COMMERCE
```

Before activation:

- transition matrix and BF/DF replay pass;
- missing commerce state fails closed;
- Context V2, derived phase, final reconciliation, and legacy authority demotion switch coherently;
- no COMMERCE decision consumes legacy `salesStage` as authority;
- the immutable release artifact carries the exact Gate-E `ContextV2CandidateManifest` hash;
- any material candidate-identity change since Gate E forces DF-P6 rerun before activation;
- complete `LEGACY` rollback is ready;
- the page-scoped quiescent cutover protocol from `contracts/BEHAVIOR_CONTROL_PLANE.md` is verified.

After explicit owner authorization, activate only on `PREPROD_TEST_PAGE` using that quiescent boundary, verify exact authority revision/hash/source readback across every relevant consumer, then release held eligible work and run the controlled critical human journeys.

## Gate F-PREPROD

- [ ] Commerce FSM is authoritative in `COMMERCE`; phase is derived.
- [ ] Context V2, derived phase, reconciliation, and legacy authority demotion switch coherently.
- [ ] No COMMERCE decision consumes legacy `salesStage` as authority.
- [ ] Missing commerce state with committed intent fails closed.
- [ ] Full transition matrix and BF/DF replay pass.
- [ ] Activated immutable release is bound to the exact Gate-E `ContextV2CandidateManifest` hash.
- [ ] Quiescent cutover holds new eligible protected work, proves no authority-sensitive in-flight/queued work can cross the boundary, and releases work only after all relevant consumers read back the exact new revision.
- [ ] Controlled PREPROD critical human journeys pass.
- [ ] Exact runtime identity/control-plane readback is verified for the deployed candidate.
- [ ] Complete `COMMERCE -> LEGACY` rollback is verified.

Not Gate F requirements: quantitative shadow, traffic-percent canary, default mixed-authority episode pinning, or long natural-traffic soak.

## UR PREPROD Release Trains

- `UR-A`: UR-P1..UR-P2 / original UR00-UR03.
- `UR-B`: UR-P3 / original UR04-UR07.
- UR08-UR09 are deferred later retirement work.
- UR10 remains separately approved destructive cleanup.

### UR-P1 — State V2 contract/go-no-go (UR00)

Approve exact state scope, encryption/AAD/key use, independent expiry envelopes, revision/fence semantics, transaction boundary, product selection/reset representation, migration/read policy, and rollback.

### UR-P2 — Atomic State V2 persistence (UR01-UR03)

Create additive State V2 schema/reducer/persistence so State V2, legacy compatibility projections, events, Outbox, handoff, and tags succeed/fail together. Prove concurrency, idempotency, and revision/fence behavior.

### UR-P3 — Measured migration/comparator and direct V2 read authority (UR04-UR07)

Required migration behavior: dry-run, idempotent, bounded, PII-safe, conflict-aware, reason-coded comparator evidence.

Build resumable/multi-batch/rate-throttled orchestration only when measured dataset size, execution time, lock pressure, or operational risk requires it.

Use side-effect-free legacy/V2 comparison as verification tooling. It is not a runtime `SHADOW` authority mode. Conflicts remain ineligible and reason-coded. Never merge partial V2/legacy fields.

Switch:

```text
LEGACY -> V2
```

only after comparator/readback evidence, explicit approval, and verification of the same page-scoped quiescent cutover contract. Hold eligible state-dependent work through CAS propagation until every relevant read-authority consumer reports the exact V2 revision/hash/source; abort or return to complete `LEGACY` if quiescence or exact readback cannot be proven.

Verify complete rollback to `LEGACY` and keep the rollback path available after Gate U.

## Gate U-PREPROD

Gate U proves State V2 architecture and rollback boundary. Full human E2E is a separate mandatory checkpoint after the Gate and before `PRODUCTION_HARDENING`.

- [ ] State V2 design/security/database/runtime review is approved.
- [ ] Core/commerce envelopes use approved encryption/independent-expiry semantics.
- [ ] Atomic persistence is idempotent, concurrency tested, and revision/fence protected.
- [ ] Measured migration/comparator/replay passes with conflicts ineligible.
- [ ] Direct V2 read cutover satisfies the quiescent-boundary contract and exact readback passes on PREPROD.
- [ ] Complete `V2 -> LEGACY` rollback passes.
- [ ] Legacy rollback remains available after the Gate.
- [ ] UR08/UR09 retirement and UR10 destructive cleanup remain deferred/separately approved.

After Gate U-PREPROD, run the controlled full human E2E checkpoint on State V2. Failure blocks progression into production hardening.

## UR08-UR10 — Deferred retirement/cleanup

- **UR08:** stop legacy commercial writes only after later stability/hardening evidence intentionally closes the rollback window.
- **UR09:** remove legacy readers/flags later after UR08 and a zero-consumer/readback sweep.
- **UR10:** archival/drop remains a separate destructive ADR/change after retention, audit/legal, backup, and restore requirements.

## Production hardening

Begins only after explicit owner instruction. Traffic-scale and operational-readiness mechanisms belong here when measured risk/traffic makes them useful:

- real traffic shadow sampling or A/B-like comparison;
- statistically meaningful evaluation with pre-registered thresholds;
- traffic canaries and realistic long soak;
- capacity/load evidence;
- production-complete SLOs, dashboards, alerts, and runbooks;
- production migration/rollback rehearsal;
- final security/compliance/operational-readiness review;
- public-production go/no-go.

The prior `>=100` pair/non-inferiority idea may be reconsidered against the real future population; synthetic traffic cannot satisfy production statistical evidence.

## Resulting roadmap

```text
Gate BF + immutable POST_BF_V1
  -> DF-A: DF-P1..DF-P3
  -> DF-B: DF-P4..DF-P6
  -> Gate E-PREPROD / freeze candidate manifest
  -> DF-C: DF-P7 / bind release to candidate manifest / quiescent LEGACY -> COMMERCE
  -> controlled critical human E2E
  -> Gate F-PREPROD
  -> UR-A: UR-P1..UR-P2
  -> UR-B: UR-P3 / quiescent LEGACY -> V2
  -> Gate U-PREPROD
  -> controlled full human E2E on State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> production-readiness/rollout decision
  -> later UR08
  -> later UR09
  -> later UR10 under separate approval
```
