# Deferred Active Backlog — DF and UR

**Activation condition:** Gate BF is passed or explicitly accepted with recorded owner waivers, and the immutable `POST_BF_V1` comparison baseline has been captured.
**Current status:** **GATE_E_PREPROD_ACCEPTED; DF11–DF13 SOURCE COMPLETE / OPERATIONAL_ACCEPTANCE_PENDING.** The v15 immutable evidence bindings are recorded in `GATE_E_PREPROD_ACCEPTANCE_20260821.md`. DF13 source contracts, the default-off fence-bound consumer, and release-evidence tooling are merged source-only; this does not close BF-03/BF-04/BF-10 residuals, authorize deployment, or activate `COMMERCE`.
**Default context now:** Do not load this file for BF work except when a BF residual explicitly changes a future contract.
**Operating mode:** `ENGINEERING_PREPROD`; logical dependencies stay item-level, while full verification and test-page deployment default to Release Train boundaries.
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
- corpus/rubric version and content hash;
- canonical content fingerprint of the reviewed candidate-affecting source/build artifacts,
  including model-input construction and output interpretation.

The manifest has a canonical hash recorded with the evaluation evidence.

Acceptance:

- V2 passes 100% of frozen safety-critical, protected-claim, side-effect, and other `MUST_PASS` assertions;
- required rules cannot change after results are inspected without a reviewed amendment and rerun;
- the scored results are tied to one exact `ContextV2CandidateManifest` hash;
- any material change to a candidate-identity field invalidates the prior Gate-E evaluation and requires a complete DF-P6 rerun;
- V1 may be evaluated for diagnosis/comparison but is not the quality gold standard;
- qualitative style/preferences are supplemental only.

No `>=100` organic/live-pair or production-statistical-confidence requirement in `ENGINEERING_PREPROD`.

## Gate E-PREPROD — accepted v15

All Gate E requirements were accepted under the immutable v15 record:

- [x] Canonical buying intent, dialogue evidence, protected-claim provenance, readiness, phase/barrier, and Context V2 contracts passed the frozen assertions.
- [x] BF incident/counterexample corpus and rubric were frozen before scoring.
- [x] Exact `ContextV2CandidateManifest` and candidate content fingerprint were bound before scoring.
- [x] All `14/14` frozen required assertions passed: claim safety, Context integrity, and coverage are `100%`; side-effect violations are `0`.
- [x] Evaluation remained side-effect-free and within the accepted one-run/`51`-request execution record.

The exact scored main, candidate revision, manifest, evidence BODY, FINALIZATION, and `FINALIZED_TRUSTED_EXACT_HEAD` admissibility are immutable in `GATE_E_PREPROD_ACCEPTANCE_20260821.md`.

Not Gate E requirements: runtime SHADOW, organic traffic volume, fixed live pair count, traffic canary, or production statistical confidence.

### DF-P7 — Direct controlled Commerce authority (DF11-DF13)

Source work begins with DF11. DF11, DF12, and DF13 remain separate focused PR units; this state does not authorize a release, canary, migration, or control-plane activation.

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
- a COMMERCE behavior-mode version persists the exact authority-bundle hash, includes it in its canonical `content_hash`, and every consumer readback proves that same database-resolved version/hash/bundle identity;
- the immutable release artifact carries the exact Gate-E `ContextV2CandidateManifest` hash and re-derives the candidate projection/content fingerprint from the final artifact;
- the re-derived fields match Gate E exactly; copying the prior hash is not evidence;
- any mismatch, unavailable derivation input, or material candidate-identity change since Gate E forces DF-P6 rerun on the final candidate before activation;
- complete `LEGACY` restart rollback is ready; and
- the owner-selected stopped-process boundary in `DF13_PREPROD_FRESH_PROCESS_DECISION.md` is verified for the first PREPROD exercise. A later hot cutover must verify the page-scoped quiescent protocol from `contracts/BEHAVIOR_CONTROL_PLANE.md`.

DF13 source boundary: the pending `0035_df13_commerce_behavior_mode` artifact
lives outside the auto-discovered active migration directory and must not be
promoted or applied under this track. The COMMERCE version contract is
source-only; shared LEGACY control-plane reads and version writes remain
compatible before that schema promotion. The enabled generic behavior-mode
operator remains LEGACY-only, and the generic version CAS rejects COMMERCE
targets. The pure fence admission and release-evidence contract bind the
prospective immutable request without touching the runtime. The merged DF13
provider/dispatcher and default-off consumer wrapper remain valid source
foundations. For the first PREPROD exercise,
`DF13_PREPROD_FRESH_PROCESS_DECISION.md` replaces an in-process durable-fence
controller with a sealed, stopped, and drained fresh-process boundary. Normal
startup stays `LEGACY`; an isolated PREPROD `COMMERCE` startup still needs the
reviewed immutable release package and exact authority identity. Operational
acceptance must establish stop/drain, one-service-set, smoke/integration, and
exact LEGACY restart evidence before a separately authorized replacement may
exist. There is no generic operator shortcut from `LEGACY` to `COMMERCE`.

The reviewed fresh-process `RealtimeRunner` composition must select one final
sales authority before state/model/product or commit work. A rejected
COMMERCE-origin result cannot fall through to the LEGACY pipeline, and an exact
COMMERCE identity remains blocked until the reviewed COMMERCE executor is bound.

After explicit owner authorization, exercise only `PREPROD_TEST_PAGE` using the stopped-process replacement boundary, verify the one fresh COMMERCE service set and its candidate/build identity, then run the controlled critical human journeys. No release may run both authorities together.

## Gate F-PREPROD

- [ ] Commerce FSM is authoritative in `COMMERCE`; phase is derived.
- [ ] Context V2, derived phase, reconciliation, and legacy authority demotion switch coherently.
- [ ] No COMMERCE decision consumes legacy `salesStage` as authority.
- [ ] Missing commerce state with committed intent fails closed.
- [ ] Full transition matrix and BF/DF replay pass.
- [ ] Activated immutable release re-derives and matches the exact Gate-E candidate projection/content fingerprint; a carried manifest hash alone is insufficient.
- [ ] First PREPROD replacement seals admission, proves no authority-dependent in-flight/queued work, runs one fresh COMMERCE service set, and proves exact LEGACY restart rollback. A later hot cutover holds work and proves exact revision convergence before release.
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
  -> Gate E-PREPROD accepted v15 / immutable candidate-manifest evidence
  -> DF-C: DF-P7 source work / later re-derive candidate fingerprint and quiescent LEGACY -> COMMERCE only with separate activation authorization
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
