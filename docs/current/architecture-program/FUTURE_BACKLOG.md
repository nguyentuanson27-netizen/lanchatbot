# Deferred Active Backlog — DF and UR

**Activation condition:** Gate BF passed and the immutable post-fix V1 baseline has been captured.
**Default context now:** Do not load this file for BF-01 through BF-10 unless a bug fix explicitly changes a future contract.
**Operating mode:** `ENGINEERING_PREPROD`; logical dependencies stay item-level, while full verification and test-page deployment default to Release Train boundaries.

Completed RI, CF, and DB detail lives in `archive/completed/`; lasting invariants live in `contracts/`.

## Default Release Trains

- `DF-A`: DF-01 through DF-06. Telemetry and normalization precede completion of canonical evidence/readiness.
- `DF-B`: DF-07 through DF-10. Phase/barrier shadow precedes Context V2 paired evaluation.
- `DF-C`: DF-11 through DF-13. Authority implementation, shadow evidence, and controlled promotion remain ordered.

Each DF item normally remains a focused PR. Frozen install, full repository verification, cross-item integration/replay, immutable release preparation, and any owner-authorized `PREPROD_TEST_PAGE` deployment happen once the train is complete. Splitting or combining a train requires an explicit recorded dependency/rollback reason.

UR is grouped by dependency/vertical outcome rather than one UR item per deploy: `UR-A` (UR-00–03, design through atomic dual-write), `UR-B` (UR-04–05, backfill/comparator), `UR-C` (UR-06–07, V2 read/canary/rollback), `UR-D` (UR-08–09, ordered retirement), and separately approved destructive `UR-X` (UR-10). UR-00 remains a go/no-go dependency before schema work, and UR-10 is never implied by another train or Gate.

## DF-01 through DF-03 — Observability and explicit analytics

- DF-01 exposes bounded, PII-safe legacy/derived phase, commerce stage, barrier, buying intent, readiness, context version, strategy, CTA, side-effect plan, guard, policy source, dialogue, claim-validation, reconciliation, media, and URL dimensions.
- DF-02 adds the approved additive schema to the partitioned `conversation_events` parent and future/default partitions. It does not reinterpret historical rows or change `messages.sales_stage`.
- DF-03 populates explicit versioned fields for new events and stops new dashboards from consuming ambiguous `stage`.

**Gate:** behavior unchanged except additive telemetry; restore/partition/least-privilege/PII tests pass; the harness compares legacy and derived outputs.

## DF-04 — Normalization consumers

Migrate duplicated normalization toward named NFC, recall-folding, and ASCII-tokenization primitives. Consumer migration is incremental; a utility move must not hide a broad behavior change.

## DF-05 through DF-06 — Canonical evidence and readiness

- Reuse the existing hybrid buying-intent resolver.
- Add dialogue evidence separately from buying intent.
- Add typed protected-claim provenance, including size/fit.
- Derive product-aware readiness from fresh verified evidence immediately before side effects.
- Keep informational intent `NOT_APPLICABLE`; model evidence alone cannot open a cart.

## DF-07 through DF-08 — Phase and barrier shadow

- Derive `ConversationPhaseV2` from commerce state in shadow; keep `ORDER_REVIEW` and `ORDER_CONFIRMED` distinct and allow backward movement when state changes.
- Keep ownership/handoff separate.
- Represent objections as PII-safe, finite-lifecycle barriers. Wall-clock expiry is cleanup, not primary resolution evidence.

## DF-09 through DF-10 — Context V2 and paired evaluation

- Version Context V2 and migrate strategy, CTA, post-media logic, output interpretation, and audit metadata.
- In `SHADOW`, live behavior stays Context V1 while an asynchronous, side-effect-free sampled call receives V2.
- Use the immutable post-Gate-BF baseline.
- Review at least 100 stratified eligible pairs, require zero safety regressions, and require the pre-registered paired non-inferiority bound `V2 - V1 >= -0.15`.

## DF-11 through DF-13 — Commerce authority

- Implement database-backed `LEGACY | SHADOW | COMMERCE`.
- Activate derived phase, Context V2 consumers, final reconciliation, and regex demotion atomically.
- Emit and fail closed on missing commerce state with committed intent.
- Promote only after transition coverage, zero safety-critical/unclassified divergence, controlled canary, readback/pin/rollback evidence, and explicit approval.

## Gate E — Canonical evidence and model context

Gate E is an engineering/architecture evidence gate for DF-A/DF-B. It is not a production-readiness or deployment authorization.

- [ ] Canonical buying intent reuses the existing hybrid resolver.
- [ ] Dialogue evidence is separate from buying intent.
- [ ] Protected claims have typed verified provenance.
- [ ] Product-aware readiness is fresh and deterministic before side effects.
- [ ] Phase/barrier contracts are versioned and PII-safe.
- [ ] Paired shadow is side-effect-free and quota/cost bounded.
- [ ] At least 100 stratified pairs meet safety and non-inferiority gates.

## Gate F — Funnel authority

Gate F is an engineering/architecture authority gate for DF-C. It is not a production-readiness or deployment authorization.

- [ ] Commerce FSM is authoritative and conversation phase is derived.
- [ ] Context V2, derived phase, V2 consumers, final reconciliation, and regex demotion activate atomically.
- [ ] No live decision consumes legacy `salesStage` in `COMMERCE`.
- [ ] Quantitative shadow, canary, readback, pinning, emergency override, and rollback pass.
- [ ] Missing commerce state with committed intent alerts and fails closed.

## UR-00 — State V2 ADR/go-no-go

Approve exact state scope, security/AAD/keys, independent retention envelopes, transaction boundary, migration/backfill/read policy, rollback, and multiple-considered-product representation before schema work.

## UR-01 through UR-03 — Schema, reducer, atomic dual-write

Create independently expiring encrypted core/commerce envelopes sharing one revision/fence. The deterministic reducer returns data/plans only. Extend the existing PostgreSQL commit transaction so State V2, legacy projections, events, Outbox, handoff, and tags succeed or fail atomically.

## UR-04 through UR-05 — Backfill and comparator

Run idempotent, dry-run, bounded, resumable, PII-safe backfill after dual-write. Compare V2 with active legacy reads side-effect-free; conflicts remain ineligible and divergences are reason-coded.

## UR-06 through UR-07 — V2 read mode, canary, rollback

Use database-backed `LEGACY | SHADOW | V2`. Never merge partial V2/legacy fields. Require readback, bounded cache/LKG, zero safety-critical/unclassified divergence, controlled canary, and emergency complete-`LEGACY` rollback.

## UR-08 through UR-10 — Retirement and deferred cleanup

- UR-08 stops legacy commercial writes only after the approved V2 rollback window.
- UR-09 removes legacy readers/flags in a later cleanup release after a global consumer sweep.
- UR-10 keeps archival/drop as a separately approved destructive-change ADR after retention, legal/audit review, backup, and restore test.

## Gate U — Unified state

Gate U is an engineering/architecture evidence gate across the approved UR trains. It does not authorize public production promotion or UR-10 destructive work.

- [ ] ADR/security/database/runtime reviews approve the exact design.
- [ ] Core and commerce envelopes are encrypted and expire independently.
- [ ] Dual-write is atomic, idempotent, revision/fence protected, and concurrency tested.
- [ ] Backfill and comparator pass with conflicts ineligible.
- [ ] V2 read canary and emergency complete-`LEGACY` rollback pass.
- [ ] Legacy writers/readers retire only in separate approved releases.
- [ ] Storage deletion remains separately approved under UR-10.
