# PREPROD DF/UR Plan Amendment

**Status:** Accepted and authoritative when present on merged `main`; proposed on unmerged feature branches
**Mode:** `ENGINEERING_PREPROD`
**Scope:** Deferred DF/UR architecture execution, evidence, Gate, and authority-transition strategy
**Non-goals:** changing the recorded Gate BF owner-waiver disposition or `POST_BF_V1`, runtime mutation, deployment authorization, production-readiness claim, destructive cleanup

## 1. Decision

Simplify the post-BF DF/UR program for the environment that actually exists today: one bounded `PREPROD_TEST_PAGE`, low/irregular organic traffic, and overlapping legacy defects that can prevent complete human conversations from reaching the component under test.

This amendment keeps correctness/security/data/rollback architecture strict, but removes production-scale rollout mechanisms from the current mandatory path when they do not produce meaningful evidence in PREPROD.

In particular:

- remove mandatory runtime `SHADOW` authority modes from DF and UR;
- replace `LEGACY -> SHADOW -> COMMERCE` with controlled `LEGACY -> COMMERCE`;
- replace `LEGACY -> SHADOW -> V2` with controlled `LEGACY -> V2`;
- require a verified quiescent boundary around every direct authority cutover so bounded control-plane propagation cannot create unsafe mixed authority;
- keep side-effect-free legacy/new comparators as verification tooling where they provide semantic evidence;
- replace live sampled Context V2/`>=100` organic pair/statistical gates with a locked reproducible offline/replay corpus and pre-declared objective acceptance rules;
- bind offline generative PASS to an immutable exact candidate manifest/content fingerprint, then re-derive and compare that identity from the later activation release;
- remove traffic-percentage canary/default pinning/long-soak requirements from PREPROD hard Gates;
- make production-grade resumable/batched migration orchestration conditional on measured data volume/lock/runtime risk;
- defer UR08-UR10 retirement/destructive cleanup until later stability/hardening evidence intentionally closes the legacy rollback path.

## 2. Why simplification is required

### 2.1 PREPROD is not a production traffic population

The project is explicitly `ENGINEERING_PREPROD`; the connected page is a `PREPROD_TEST_PAGE`, not public production. A Gate that requires large natural samples or percentage traffic rollout can remain blocked because traffic does not arrive, even when the owning implementation is correct.

That makes the Gate partly a test of traffic availability rather than a test of architecture correctness.

### 2.2 Overlapping defects make early full-conversation human E2E unreliable

A legacy defect can block a conversation before it reaches the component being verified. Component-level acceptance must therefore be allowed to use deterministic contract/integration/replay evidence at the owning boundary, with full human journeys reserved for explicit later system checkpoints.

### 2.3 Production mechanisms without production scale create complexity without proportional evidence

Runtime SHADOW lifecycle, live paired model sampling, statistical promotion, percentage canaries, broad mixed-authority pinning, dashboard completeness, and production-grade migration orchestration are valuable when real traffic/scale justifies them. Building them as mandatory PREPROD architecture adds code, control-plane states, review surface, and failure modes before their evidence is meaningful.

### 2.4 Direct cutover still needs an atomicity boundary

Removing runtime SHADOW does not make a control-plane mode switch instantaneous. The existing propagation contract is bounded, so different authority consumers can temporarily observe different revisions unless the cutover is fenced.

PREPROD therefore uses a **quiescent cutover boundary**, not traffic canary/pinning ceremony:

1. hold all new authority-dependent eligible work for the target page;
2. prove no authority-dependent message, read, classification, context/phase/CTA/reconciliation decision, command, cart/order transition, or side-effect plan is in flight;
3. drain or hold every eligible queued event that can observe or consume the changing authority;
4. CAS the new authority revision;
5. keep all authority-dependent work held while the revision propagates;
6. release only after every relevant authority consumer reads back the exact revision/hash/source.

If that cannot be proven, activation aborts/fails closed to complete `LEGACY` authority. Narrow episode/cart pinning is only a fallback design option if a future implementation cannot safely quiesce a specific lifecycle; it is not the default PREPROD topology.

### 2.5 Offline evaluation must identify the exact candidate being accepted

After removing live Context-V2 shadow, DF-P6 becomes the primary generative evidence before authority cutover. A result labeled merely “Context V2 PASS” is insufficient if model, generation config, prompt, context/evidence schema, or source changes later.

Gate E therefore freezes a canonical `ContextV2CandidateManifest` containing the exact evaluated candidate identity plus a canonical content fingerprint of candidate-affecting source/build artifacts. Gate F may use a later immutable release revision for authority plumbing, but it must re-derive the candidate projection and fingerprint from that final artifact and prove field-by-field equality. Copying the old manifest hash into a later release is insufficient. Any mismatch or non-reproducible field invalidates the prior DF-P6 evidence and requires rerun on the final candidate.

This preserves provenance without forcing the final DF-P7 release SHA to exist before Gate E, which would violate the dependency order.

### 2.6 Simplification does not lower the safety bar

This amendment does not waive:

- fresh typed protected-claim provenance;
- deterministic readiness and final reconciliation;
- model/side-effect authority separation;
- SSRF/phishing fail-closed behavior;
- PII/secrets/auth/authz/least-privilege controls;
- additive/backward-compatible database discipline;
- atomicity, idempotency, concurrency, revision/fence protections;
- exact readback, immutable release identity, bounded propagation, quiescent direct cutover, and complete `LEGACY` rollback.

The change is primarily **which evidence mechanism is mandatory at the current stage**, plus simplification of future authority topology from three modes to two.

## 3. Review contract

Review every future requirement as one of:

- `CURRENT_REQUIRED`: correctness/security/architecture/data/authority/rollback invariant needed now. Missing = blocker.
- `CURRENT_VERIFICATION`: deterministic/integration/replay/comparator/controlled evidence required to prove a current invariant in PREPROD.
- `DEFERRED_PRODUCTION_HARDENING`: traffic-scale or operational mechanism that must not block current Gates unless a later explicit decision promotes it to required.

A reviewer should not argue that shadow/canary/statistical rollout is generally useful; the review question is whether it is required to prove the current PREPROD contract. Conversely, the word “simplification” must never justify skipping a current correctness/security/rollback invariant.

For direct cutover, quiescence and exact revision convergence are `CURRENT_REQUIRED`. For DF-P6, exact candidate identity and activation-release binding are `CURRENT_REQUIRED` provenance.

## 4. PREPROD evidence hierarchy

Use the cheapest evidence that proves the owning boundary:

1. deterministic unit/contract tests;
2. focused integration tests across real boundaries;
3. immutable BF incident/counterexample replay;
4. locked offline model/context corpus with pre-declared expected behaviors and immutable candidate identity;
5. side-effect-free legacy/new comparator when semantic equivalence matters;
6. transition/concurrency/idempotency/revision-fence matrices;
7. bounded human E2E only at checkpoints where a complete journey should now be possible;
8. exact artifact/runtime readback, quiescent activation evidence, and complete rollback evidence for owner-authorized test-page deployment.

Synthetic fixtures are valid test data but never production statistical evidence. Natural traffic/soak is supplemental in PREPROD unless a specific changed risk explicitly requires it.

## 5. DF PREPROD execution slices

Keep original DF01-DF13 identifiers for traceability, but execute seven slices.

### DF-P1 — Minimum decision observability (DF01-DF03)

Add only bounded, versioned, PII-safe telemetry required to explain/replay a decision: dialogue evidence, buying intent, protected-claim validation, readiness, phase/barrier, context version, strategy/CTA, reconciliation, guard, and side-effect plan.

Do not require production dashboard/SLO completeness or reinterpret historical rows.

### DF-P2 — Targeted normalization (DF04)

Move only consumers required by the new architecture to named normalization primitives. Do not use this as a broad legacy refactor.

### DF-P3 — Canonical evidence and readiness (DF05-DF06)

Create the canonical evidence boundary: one approved buying-intent authority, separate dialogue evidence, typed protected-claim provenance, and fresh product-aware deterministic readiness immediately before side effects.

### DF-P4 — Derived phase and barriers (DF07-DF08)

Derive `ConversationPhaseV2` and finite-lifecycle barriers deterministically from canonical/commerce state. Keep ownership/handoff separate, preserve `ORDER_REVIEW != ORDER_CONFIRMED`, and allow backward movement when authoritative state changes.

Verify with transition tables, incident/counterexample replay, and integration tests. No runtime shadow stage is required.

### DF-P5 — Context V2 (DF09)

Version Context V2 and migrate intended consumers: strategy, CTA, post-media logic, output interpretation, and audit metadata.

### DF-P6 — Locked offline/replay evaluation (DF10)

Build a versioned corpus from accepted BF incidents/counterexamples, safe relevant historical cases, and controlled fixtures for correction, product switching, media, URL, size, order review, confirmation, and protected side effects.

Before the first scored run, freeze:

- corpus membership/strata;
- each case’s `MUST_PASS` behavior;
- safety/factual/side-effect assertions;
- any additional objective quality rubric and acceptance rule;
- an immutable `ContextV2CandidateManifest` containing:
  - model provider/name/version or immutable model identifier;
  - generation configuration that can affect output;
  - prompt/template version and content hash;
  - Context V2 version/schema and relevant consumer-contract version;
  - verified-evidence envelope/schema version;
  - relevant policy/config versions affecting candidate generation or interpretation;
  - exact Git source revision used for the scored run;
  - corpus/rubric version and content hash;
  - canonical content fingerprint for the reviewed set of candidate-affecting source and
    built artifacts, including model-input construction and output interpretation.

Record the canonical manifest hash with the scored result.

Mandatory PREPROD acceptance:

- V2 passes 100% of frozen safety-critical, protected-claim, side-effect, and other `MUST_PASS` assertions;
- required rules cannot be changed after results are inspected without a reviewed amendment and full rerun;
- PASS is valid only for the exact recorded candidate-manifest hash;
- any material candidate-identity change invalidates Gate-E evidence and requires full DF-P6 rerun;
- V1 may be run for diagnosis/comparison but is not the gold standard because the baseline contains known defects;
- qualitative style preferences are supplemental and cannot override failed required assertions.

No organic traffic count, `>=100` live pair, or production statistical-confidence requirement is mandatory in PREPROD.

### DF-P7 — Direct controlled Commerce authority cutover (DF11-DF13)

Implement database-backed `LEGACY | COMMERCE`.

Before activation prove:

- full transition matrix and BF/DF replay;
- missing commerce state with committed intent fails closed;
- Context V2, derived phase, final reconciliation, and legacy regex/`salesStage` authority demotion switch coherently;
- no COMMERCE decision consumes legacy `salesStage` as authority;
- the immutable activation release carries the exact Gate-E `ContextV2CandidateManifest` hash and re-derives its candidate projection/content fingerprint from the final artifact;
- the re-derived fields match Gate E exactly; copying the prior hash is not accepted as evidence;
- any mismatch, missing derivation input, or material candidate identity change since Gate E has triggered a DF-P6 rerun on the final candidate;
- the quiescent cutover protocol is verified;
- exact control-plane readback works;
- complete rollback to `LEGACY` works.

Then, after explicit owner authorization, activate `COMMERCE` only on the `PREPROD_TEST_PAGE` inside the quiescent boundary. Keep all authority-dependent work held until every relevant authority consumer reads back the exact new revision/hash/source, then release held work and run the controlled critical human journeys.

## 6. Gate E-PREPROD

Gate E proves canonical evidence + Context V2 engineering readiness, not production statistical readiness.

Required:

- one approved buying-intent authority;
- dialogue evidence separate from buying intent;
- typed verified protected-claim provenance;
- fresh deterministic product-aware readiness;
- versioned deterministic PII-safe phase/barrier contracts;
- Context V2 and intended consumers implemented;
- BF incident/counterexample replay passes;
- DF-P6 corpus/rubric frozen before scoring;
- exact `ContextV2CandidateManifest`, candidate content fingerprint, and canonical hash frozen before scoring;
- V2 passes every frozen required assertion using that exact candidate manifest;
- evaluation paths are side-effect-free and cost bounded.

Not required: runtime SHADOW, organic traffic volume, a fixed live pair count, traffic canary, or production statistical confidence.

## 7. Gate F-PREPROD

Required:

- Commerce FSM is authoritative when mode=`COMMERCE`; phase is derived;
- Context V2, derived phase, reconciliation, and legacy authority demotion switch coherently;
- no COMMERCE decision consumes legacy `salesStage` as authority;
- missing commerce state with committed intent fails closed;
- transition matrix and BF/DF replay pass;
- immutable release re-derives and matches the exact Gate-E candidate projection/content fingerprint; a carried hash alone is insufficient;
- direct authority cutover satisfies the page-scoped quiescent boundary and all relevant consumers converge to the exact authority revision before authority-dependent work resumes;
- controlled PREPROD critical human journeys pass;
- exact runtime identity/control-plane readback is verified for the deployed candidate;
- complete `COMMERCE -> LEGACY` rollback is verified.

Traffic-percent canary, default mixed-authority pinning, quantitative shadow, or long natural-traffic soak are not Gate F requirements in the current mode.

## 8. UR PREPROD plan

### UR-P1 — State V2 contract/go-no-go (UR00)

Approve exact state scope, encryption/AAD/key use, independent expiry envelopes, revision/fence semantics, transaction boundary, product selection/reset representation, migration/read policy, and rollback.

### UR-P2 — Atomic State V2 persistence (UR01-UR03)

Implement additive schema, deterministic reducer, and atomic persistence so State V2, legacy compatibility projections, events, Outbox, handoff, and tags succeed/fail together. Prove concurrency, idempotency, and revision/fence behavior.

### UR-P3 — Measured migration/comparator and direct V2 read cutover (UR04-UR07)

Required migration properties: dry-run, idempotent, bounded, PII-safe, conflict-aware, reason-coded comparator evidence.

Add resumable/multi-batch/rate-throttled orchestration only if measured dataset size, execution duration, lock pressure, or operational risk demonstrates the need.

The comparator may read legacy and V2 representations side-effect-free, but it is verification tooling rather than a `SHADOW` runtime read authority.

After comparator/readback evidence passes, switch `LEGACY -> V2` only with explicit approval and the same page-scoped quiescent cutover protocol. Never merge partial V2/legacy fields. Keep every authority-dependent input/read/decision held through propagation until all relevant read-authority consumers read back the exact V2 revision/hash/source. Abort/fail closed to complete `LEGACY` if quiescence or convergence cannot be proven.

Verify complete rollback to `LEGACY` and keep that rollback path available after Gate U.

### UR08-UR10 — Deferred later cleanup

Do not retire legacy merely to complete PREPROD architecture.

- UR08 stops legacy commercial writes only after later stability/hardening evidence intentionally closes the rollback window.
- UR09 removes legacy readers/flags later after UR08 and a zero-consumer/readback sweep.
- UR10 archival/drop remains a separate destructive ADR/change after retention, audit/legal, backup, and restore requirements.

## 9. Gate U-PREPROD

Gate U proves State V2 architecture and its rollback boundary. The full human E2E is a separate mandatory checkpoint immediately after Gate U and before `PRODUCTION_HARDENING`.

Required Gate U evidence:

- State V2 design/security/database/runtime review approved;
- encryption/independent-expiry semantics implemented as designed;
- atomic persistence idempotent, concurrency tested, revision/fence protected;
- measured migration/comparator/replay passes with conflicts ineligible;
- direct V2 read switch satisfies the quiescent-boundary contract and exact readback passes on PREPROD;
- complete `V2 -> LEGACY` rollback passes;
- legacy rollback remains available;
- UR08-UR10 remain deferred/separately approved.

After Gate U, run the controlled full human E2E on State V2. Failure blocks progression into production hardening even though Gate U itself is architecture evidence.

## 10. Deferred production hardening

Only an explicit owner decision starts `PRODUCTION_HARDENING`. That phase may add, based on measured risk/traffic:

- real traffic shadow sampling or A/B-like comparison;
- statistically meaningful paired evaluation with pre-registered thresholds;
- traffic-percent canary and realistic long soak;
- capacity/load evidence;
- production-complete dashboards/SLOs/alerts/runbooks;
- production migration rehearsal/rollback drills;
- final security/compliance/operational-readiness review;
- public-production go/no-go.

These mechanisms are deferred because they are not currently meaningful, not because they are permanently forbidden.

## 11. Resulting roadmap

```text
GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS + immutable POST_BF_V1 (recorded)
  -> DF-P1..DF-P6
  -> Gate E-PREPROD / freeze exact candidate manifest
  -> DF-P7 / re-derive candidate fingerprint / quiescent LEGACY -> COMMERCE
  -> controlled critical human E2E
  -> Gate F-PREPROD
  -> UR-P1..UR-P3 / quiescent LEGACY -> V2
  -> Gate U-PREPROD
  -> controlled full human E2E on State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> traffic/operational readiness only as measured need requires
  -> public-production readiness / rollout decision
  -> later UR08 -> UR09 -> UR10 under separate approvals
```

## 12. Source-of-truth and supersession

`FUTURE_BACKLOG.md` and this amendment own post-Gate-BF DF/UR execution when this decision is merged into `main`. Future-facing references in `ACTIVE_IMPLEMENTATION_PLAN.md` to phase/barrier shadow, sampled second live model calls, paired live evaluation, shadow/canary evidence, or three-state authority topology are superseded by this amendment after the recorded Gate BF owner-waiver decision. The accepted BF residuals remain unchanged unless separately reconciled.

Archives, historical manifests, baseline evidence, and past runtime records remain immutable and must not be rewritten to match this later planning decision.

## 13. Change boundary

This amendment does not alter the already recorded `GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS` disposition or `POST_BF_V1`, deploy anything, mutate runtime/database/policy/page routing, authorize production hardening, or authorize destructive cleanup. It activates only the documented DF-A source-work plan when merged.
