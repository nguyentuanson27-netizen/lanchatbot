# Track B — Execution Checklist

**Status:** `PLAN_ONLY / DO NOT MARK RUNTIME WORK COMPLETE FROM THIS FILE`

## Before implementation

- [ ] Re-read current merged governance on `main` before the first Track B code PR is shipped/deployed.
- [ ] Confirm whether PR #269 / `SOLO_PREPROD_MINIMAL` is merged and active; do not assume plan-time status.
- [ ] Lock the exact implementation head used for B1.
- [ ] Keep `stateReadMode=LEGACY`; do not start UR/State V2 without a separate evidence-backed decision.

## B1 — Scope lock

- [ ] Trace exact current COMMERCE hot path from authority admission to commit/Outbox.
- [ ] Classify every reachable candidate as `KEEP`, `SPLIT/REWRITE`, or `RETIRE_AFTER_CUTOVER`.
- [ ] Lock exact B2.1/B2.2 files and focused tests.
- [ ] Record any legacy-state semantic leakage as evidence only.
- [ ] Stop/amend plan if a state migration, second permanent runtime, or materially wider slice is required.
- [ ] **Checkpoint:** B1 findings accepted before B2.1.

## B2.1 — CommerceRuntime boundary

- [ ] Add small explicit `CommerceRuntime` boundary inside existing worker.
- [ ] Route COMMERCE through boundary without creating new persistence/queue/control plane.
- [ ] Preserve LEGACY rollback path.
- [ ] Add characterization/focused boundary tests.
- [ ] Run applicable affected-workspace verification.

## B2.2 — Model authority

- [ ] Add structured model proposal: semantic/sales intent + normal draft + claims + requested actions/effects.
- [ ] Validate model output as untrusted structured input.
- [ ] Make normal COMMERCE strategy and wording model-owned.
- [ ] Prevent deterministic sales strategy/FSM/CTA/reply assembly from overriding valid normal model output.
- [ ] Add valid/malformed/adversarial proposal tests.

## B2.3a — Claim verification

- [ ] Verify protected claims against typed current facts/provenance.
- [ ] Reject/regenerate on unsupported or stale protected claims.
- [ ] Shrink final text guard to defense-in-depth.
- [ ] Remove normal deterministic sales-copy repair authority on migrated path.
- [ ] Test price/stock/promo/size, stale provenance and PII/security failures.

## B2.3b — Effect reconciliation

- [ ] Treat model actions/effects as requests only.
- [ ] Keep deterministic cart/checkout/payment/handoff authorization.
- [ ] Preserve CAS/version/idempotency/trusted-port checks.
- [ ] Preserve atomic state/effect-intent behavior.
- [ ] Test duplicate, stale, conflict, unauthorized and transaction failure paths.

## B2.3c — Negotiation split

- [ ] Move normal objection/conversational negotiation strategy to model authority.
- [ ] Keep deterministic monetary limits, policy authorization, arithmetic, freshness, fingerprints and CAS/version/idempotency.
- [ ] Remove `READY/HESITANT/CAUTIOUS`-style progression as normal conversational authority.
- [ ] Test allowed/denied concessions and stale/replay cases.

## B2.3d — Size + fallback

- [ ] Keep verified size computation/provenance deterministic.
- [ ] Make normal size wording model-owned.
- [ ] Add fixed maximum bounded regeneration.
- [ ] Add fixed safe fallback after regeneration exhaustion.
- [ ] Prove fallback cannot execute failed/unauthorized protected effects.
- [ ] **Checkpoint:** authority boundary accepted before B2.4.

## B2.4 — Cut old COMMERCE authority reachability

- [ ] Prove active COMMERCE no longer invokes old normal deterministic strategy/FSM/copy-repair authority.
- [ ] Extract any still-needed recovery/correctness semantics before disconnecting wrappers.
- [ ] Preserve code required by proven LEGACY rollback/non-COMMERCE consumers.
- [ ] Require zero-use proof before destructive deletion.
- [ ] Run focused COMMERCE + affected rollback-route verification.

## B3 — Full-agent replay

- [ ] Resolve current exact existing Gate-E/replay evaluator integration path.
- [ ] Implement exactly one side-effect-free full-agent replay adapter.
- [ ] Pin candidate-affecting model/prompt/config/fact/policy identity needed for reproducibility.
- [ ] Capture/block all external/state side effects.
- [ ] Add `MUST_PASS` unsupported-claim, protected-fact, PII/security, unauthorized-effect and fail-closed cases.
- [ ] Reuse this adapter for Track C; do not create a second evaluator platform.

## B3.1 — Accepted PREPROD baseline

- [ ] Determine whether candidate identity changed materially and whether owning Gate-E/scored evidence must be rerun/re-derived.
- [ ] Reuse existing scored-run mechanism with minimal wiring only.
- [ ] Keep provider credentials out of GitHub Actions/repository.
- [ ] Complete focused CI/checks required by active merged governance.
- [ ] If owner authorizes deploy: deploy exact merged commit only.
- [ ] If deployed: retain exact previous affected-service release/build/commit rollback target.
- [ ] If deployed: run applicable smoke/controlled checks and record exact runtime identity.
- [ ] Do not infer deploy/runtime success from merge.
- [ ] Identify one accepted COMMERCE baseline for Track C.

## Track B completion

- [ ] Normal COMMERCE strategy + wording are model-owned.
- [ ] Deterministic authority is limited to facts/provenance, security/PII, policy, reconciliation/effects, CAS/idempotency and bounded fail-closed behavior.
- [ ] Old deterministic sales authority is unreachable from active COMMERCE or explicitly rollback/non-COMMERCE only.
- [ ] Full-agent replay passes all required `MUST_PASS` safety/correctness cases without side effects.
- [ ] Required focused tests/checks pass on the exact implementation heads where claimed.
- [ ] No UR/State V2/admin/multi-page/production-hardening scope creep.
- [ ] Rollback remains viable until separately closed with evidence.
- [ ] Owner records Track B completion / Track C start decision.
