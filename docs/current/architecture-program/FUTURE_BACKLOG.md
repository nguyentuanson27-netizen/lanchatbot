# Deferred Active Backlog — DF and UR

**Activation condition:** Gate BF passed and the immutable post-fix V1 baseline has been captured.
**Default context now:** Do not load this file for BF-01 through BF-10 unless a bug fix explicitly changes a future contract.
**Operating mode:** `ENGINEERING_PREPROD`; logical dependencies remain binding while evidence strategy must match the actual PREPROD environment.
**Plan amendment:** `PREPROD_DF_UR_PLAN_AMENDMENT.md` explains why traffic-dependent validation is deferred to `PRODUCTION_HARDENING`.

Completed RI, CF, and DB detail lives in `archive/completed/`; lasting invariants live in `contracts/`.

## PREPROD execution model

The original DF01-DF13 and UR00-UR10 identifiers are preserved for traceability. PREPROD execution groups them into fewer vertical slices so implementation and verification match the current environment instead of assuming production traffic.

Default DF Release Trains:

- `DF-A`: `DF-P1` through `DF-P3` — telemetry, targeted normalization, canonical evidence/readiness.
- `DF-B`: `DF-P4` through `DF-P6` — phase/barrier, Context V2, offline paired evaluation.
- `DF-C`: `DF-P7` — commerce authority implementation and controlled PREPROD activation.

Default UR Release Trains:

- `UR-A`: `UR-P1` through `UR-P2` — State V2 contract through atomic persistence.
- `UR-B`: `UR-P3` — controlled migration, comparator and V2 read switch/rollback.
- `UR-C`: `UR-P4` — ordered legacy writer/reader retirement.
- `UR-X`: UR10 destructive archival/drop remains separate and is not implied by Gate U-PREPROD.

Each slice may contain multiple focused PRs. Frozen install, full repository verification, cross-item integration/replay, immutable release preparation, and any owner-authorized `PREPROD_TEST_PAGE` deployment happen at Release Train boundaries unless a recorded dependency/rollback reason requires otherwise.

PREPROD evidence defaults to deterministic tests, integration tests, incident/counterexample replay, offline paired evaluation, transition matrices, controlled human scenarios, exact runtime readback and rollback evidence. Organic traffic volume is not manufactured merely to satisfy a numeric gate.

## DF-P1 — Minimal architecture telemetry (DF01-DF03)

- Expose bounded, versioned, PII-safe dialogue evidence, buying intent, protected-claim validation, readiness, legacy/derived phase, barrier, context version, strategy, CTA, side-effect plan, guard, reconciliation, media and URL outcome dimensions needed for debugging/replay.
- Add the approved additive schema to the partitioned `conversation_events` parent and future/default partitions.
- Populate explicit versioned fields for new events; do not reinterpret historical rows or change `messages.sales_stage`.
- Stop new architecture consumers from depending on ambiguous `stage`.

**Gate:** behavior unchanged except additive telemetry; restore/partition/least-privilege/PII tests pass; the harness can compare relevant legacy and derived outputs.

**PREPROD non-goals:** production dashboards, SLOs, production alerting, warehouse-style analytics migration and historical data reinterpretation.

## DF-P2 — Targeted normalization (DF04)

Migrate only consumers required by the new architecture toward named NFC, recall-folding and ASCII-tokenization primitives. A utility move must not hide a broad behavior change or become a repository-wide cleanup.

## DF-P3 — Canonical evidence and readiness (DF05-DF06)

- Reuse the existing hybrid buying-intent resolver.
- Add dialogue evidence separately from buying intent.
- Add typed protected-claim provenance, including size/fit.
- Derive product-aware readiness from fresh verified evidence immediately before side effects.
- Keep informational intent `NOT_APPLICABLE`; model evidence alone cannot open a cart or authorize other protected effects.

**Gate:** canonical evidence is typed/versioned; protected claims fail closed without verified provenance; readiness is deterministic, product-scoped and fresh.

## DF-P4 — Derived phase and barriers (DF07-DF08)

- Derive `ConversationPhaseV2` deterministically from commerce/canonical state; keep `ORDER_REVIEW` and `ORDER_CONFIRMED` distinct and allow backward movement when authoritative state changes.
- Keep ownership/handoff separate.
- Represent objections as PII-safe, finite-lifecycle barriers. Wall-clock expiry is cleanup, not primary semantic resolution evidence.

**PREPROD verification:** transition matrix + incident/replay corpus. Live traffic volume is not required.

## DF-P5 — Context V2 (DF09)

Version Context V2 and migrate strategy, CTA, post-media logic, output interpretation and audit metadata. Context V2 consumes canonical dialogue evidence, verified claims, buying intent, readiness, derived phase/barrier and product/media context.

The new context remains side-effect-free until the authority slice explicitly activates its consumers.

## DF-P6 — Offline paired evaluation (DF10)

Use the immutable post-Gate-BF V1 baseline and compare V1/V2 against a controlled corpus composed of:

- all accepted BF incidents and counterexamples;
- relevant historical conversations where available and safe;
- product-switch, correction, media, URL, size, order-review and confirmation fixtures;
- explicitly labelled synthetic variants used only as test data.

Run V1 and V2 side-effect-free against the same eligible inputs. Require zero safety regression and explicit review of factual/behavioral differences.

The former PREPROD requirement for at least 100 live stratified pairs and the paired non-inferiority threshold `V2 - V1 >= -0.15` is deferred to `PRODUCTION_HARDENING`, where a realistic population can exist. Synthetic fixtures cannot be counted as production statistical evidence.

## Gate E-PREPROD — Canonical evidence and model context

Gate E-PREPROD is an engineering/architecture evidence gate for `DF-A`/`DF-B`. It is not production readiness or deployment authorization.

- [ ] Canonical buying intent reuses the approved hybrid resolver.
- [ ] Dialogue evidence is separate from buying intent.
- [ ] Protected claims have typed verified provenance.
- [ ] Product-aware readiness is fresh and deterministic before side effects.
- [ ] Phase/barrier contracts are versioned, deterministic and PII-safe.
- [ ] Context V2 and intended consumers are implemented.
- [ ] The accepted BF incident/counterexample replay corpus passes.
- [ ] Offline V1/V2 evaluation has zero safety regression.
- [ ] Evaluation paths are side-effect-free and quota/cost bounded.

Not required in `ENGINEERING_PREPROD`: organic traffic volume, a fixed live pair count, production statistical confidence or traffic-percent canary evidence.

## DF-P7 — Commerce authority (DF11-DF13)

- Implement database-backed `LEGACY | SHADOW | COMMERCE`.
- In PREPROD, `SHADOW` may be used for deterministic dual-compute/replay and bounded controlled scenarios; it is not a traffic-volume gate.
- Activate derived phase, Context V2 consumers, final reconciliation and legacy regex-authority demotion coherently.
- Emit bounded evidence and fail closed on missing commerce state with committed intent.
- Ensure no `COMMERCE` decision consumes legacy `salesStage` as authority.
- Verify full transition coverage, BF/DF replay and emergency complete-`LEGACY` rollback before controlled human E2E.

After those checks, run the approved critical human journey set on `PREPROD_TEST_PAGE` before Gate F-PREPROD is accepted.

## Gate F-PREPROD — Funnel authority

Gate F-PREPROD is an engineering/architecture authority gate. It is not production readiness or deployment authorization.

- [ ] Commerce FSM is authoritative in `COMMERCE`; conversation phase is derived.
- [ ] Context V2, derived phase, final reconciliation and legacy authority demotion switch coherently.
- [ ] No COMMERCE decision consumes legacy `salesStage` as authority.
- [ ] Missing commerce state with committed intent fails closed with bounded evidence.
- [ ] Full transition matrix and BF/DF replay pass.
- [ ] Controlled `PREPROD_TEST_PAGE` human E2E passes for the critical journey set.
- [ ] Exact runtime identity/readback is verified for any deployed candidate.
- [ ] Emergency complete-`LEGACY` rollback is verified.

## UR-P1 — State V2 contract/go-no-go (UR00)

Approve exact state scope, security/AAD/keys, independent retention envelopes, revision/fence semantics, transaction boundary, migration/backfill/read policy, rollback and multiple-considered-product/active-selection representation before schema work.

## UR-P2 — Atomic State V2 persistence (UR01-UR03)

Create independently expiring encrypted core/commerce envelopes sharing one revision/fence. The deterministic reducer returns data/plans only. Extend the existing PostgreSQL commit transaction so State V2, legacy compatibility projections, events, Outbox, handoff and tags succeed or fail atomically.

Prove concurrency, idempotency and revision/fence behavior before migration/read switching.

## UR-P3 — Controlled migration and V2 read switch (UR04-UR07)

- Run idempotent, dry-run, bounded, resumable, PII-safe backfill only as needed to verify the PREPROD dataset and migration contract.
- Compare V2 with active legacy reads side-effect-free using deterministic/replay evidence; conflicts remain ineligible and divergences are reason-coded.
- Use database-backed `LEGACY | SHADOW | V2`; never merge partial V2/legacy fields.
- Require readback, bounded cache/LKG behavior and complete `LEGACY` rollback before V2 read acceptance.

A production traffic canary is not required in PREPROD; realistic traffic validation is deferred to `PRODUCTION_HARDENING`.

## UR-P4 — Ordered legacy retirement (UR08-UR09)

- UR08 stops legacy commercial writes only after V2 reads and complete rollback have been proven.
- UR09 removes legacy readers/flags in a later focused release after a global consumer sweep.
- Writer and reader retirement remain separate, reviewable and reversible where technically possible.

## UR10 — Destructive cleanup remains separately deferred

Archival/drop remains a separately approved destructive-change ADR after retention, legal/audit review, backup and restore test. It is not required for Gate U-PREPROD and is never implied by another train or Gate.

## Gate U-PREPROD — Unified state

Gate U-PREPROD is an engineering/architecture evidence gate across the approved UR slices. It does not authorize public production promotion or UR10 destructive work.

- [ ] ADR/security/database/runtime reviews approve the exact design.
- [ ] Core and commerce envelopes use the approved encryption/expiry semantics.
- [ ] Atomic persistence is idempotent, revision/fence protected and concurrency tested.
- [ ] Controlled backfill/comparator/replay passes with conflicts ineligible.
- [ ] V2 read switch and emergency complete-`LEGACY` rollback pass on PREPROD.
- [ ] Legacy writers/readers retire only in ordered, separately reviewable releases.
- [ ] Controlled human E2E is rerun after the State V2 read switch.
- [ ] Storage deletion remains separately approved under UR10.

## Production hardening — deferred traffic-dependent validation

`PRODUCTION_HARDENING` begins only after the explicit owner trigger defined by `OPERATING_MODE.md`. This is where production-like evidence belongs, including as applicable:

- real eligible V1/V2 or legacy/new-authority shadow sampling;
- statistically meaningful comparison and pre-registered thresholds;
- the former `>=100` real eligible pair and non-inferiority target, if still appropriate when the phase begins;
- production traffic strategy and percentage canaries;
- sustained soak against realistic volume;
- capacity/load testing;
- SLOs, dashboards, alerts, runbooks and incident drills;
- final security/compliance/operational-readiness review;
- public-production go/no-go and rollback rehearsal.

These controls are deferred, not deleted. They must not be falsely satisfied with synthetic traffic while the project remains `ENGINEERING_PREPROD`.

## Resulting roadmap

```text
Gate BF + immutable POST_BF_V1
  -> DF-A: DF-P1..DF-P3
  -> DF-B: DF-P4..DF-P6
  -> Gate E-PREPROD
  -> DF-C: DF-P7
  -> controlled human E2E
  -> Gate F-PREPROD
  -> UR-A: UR-P1..UR-P2
  -> UR-B: UR-P3
  -> UR-C: UR-P4
  -> Gate U-PREPROD
  -> controlled human E2E after State V2
  -> explicit owner trigger: PRODUCTION_HARDENING
  -> production readiness / rollout
  -> UR-X / UR10 destructive cleanup only under separate later approval
```
