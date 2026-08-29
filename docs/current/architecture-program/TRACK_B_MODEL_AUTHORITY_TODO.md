# Track B — Execution Checklist

**Status:** `B1_COMPLETE_REVIEW_PENDING / B2 NOT STARTED`
**B1 evidence:** `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md`
**Selected direction:** demote post-generation deterministic authority only. `BaselineModelCapability` stays byte-frozen; the Context V2 candidate stays offline. Escalation ladder in execution-plan §2.

## Before implementation

- [x] Bind the 2026-08-29 owner message authorizing Track B **source implementation only** (`sourceThreadId=019ff0ed-3760-7e81-98f4-5e91e8ca35b0`). This does not authorize merge, deploy, migration, authority/pointer mutation, routing, Messenger action or public-production promotion.
- [x] Re-read `AGENTS.md`, `OPERATING_MODE.md`, `program-state.json`, this plan and the relevant contracts from the exact merged `main` head.
- [x] Follow `SOLO_PREPROD_MINIMAL`: `branch -> code + focused verification -> PR -> exact-head verification -> merge -> deploy exact commit -> smoke`. Do not reintroduce Release Train or a second approval record.
- [x] Keep `stateReadMode=LEGACY`; do not start UR/State V2 without a separate evidence-backed approval.
- [x] Treat the BF-04 P0 size-claim residual as open until new evidence proves otherwise.

## B1 — Scope lock

- [x] The generation capability serving COMMERCE is `BaselineModelCapability`, byte-frozen.
- [x] `AgentProposalV1` already carries reply, strategyAnalysis, salesSignals, protectedClaimIds, action, businessFactQuery.
- [x] The baseline prompt already assigns strategy as a model proposal for the app to check.
- [x] The drift is post-generation: `decideWave2SalesStrategy` at `4563` and `applyWave2ReplyPolicy` at `4581`.
- [x] `df13-commerce-runtime-composition.ts` is admission/fence only; reply orchestration is `RealtimeRunner`.
- [x] The authority-bundle payload is declarative — no runtime code branches on its fields, only `contractHash`.
- [x] BF-04 is a text detector plus exemption classifier; structured claims are the closure mechanism.
- [x] No reply-behavior differential runner exists. `shadow-runner.ts` is the reuse target but claims jobs and writes shadow-evaluation rows, so its comparison core must be extracted.
- [x] `GATE_E_CANDIDATE_SOURCE_PATHS_V1` covers none of the live orchestration path.
- [x] Canonical self-hosted CI is functional on exact heads.
- [x] Trace the effect/commit path in `packages/chat-runtime/src/sales-cycle-runtime.ts` and the commerce-kernel policy/negotiation transitions.
- [x] Complete the KEEP / DEMOTE / SPLIT classification for every reachable component, using V5's taxonomy.
- [x] Produce the exact focused-test map per changed boundary.
- [x] Re-estimate and lock the source-PR decomposition before B2.1.
- [x] Resolve bundle semantics: baseline `AgentProposalV1.strategyAnalysis` is not the `CONTEXT_V2_STRATEGY_INPUT_V1` contract, so Track B changes the authority bundle and behavior identity. B3.2 is an owner-scoped authority mutation with pointer/CAS/readback/rollback; `0036` remains conditional on source proof.
- [ ] **Checkpoint:** B1 residuals closed and independent review has no blocker.

## B2.1 — Post-generation seam

- [ ] Add one explicit stage boundary between model generation and final delivery inside `RealtimeRunner`.
- [ ] Reuse the DF13 composition/executor/context/finalization owners; no sibling top-level runtime.
- [ ] Preserve existing persistence, queue, authority resolver and LEGACY rollback behavior.
- [ ] Add focused characterization tests.
- [ ] Extract the side-effect-free reply comparison core from `shadow-runner.ts` in this first source PR, before any behavior-changing slice.
- [ ] Produce r31.3 differential evidence for realtime behavior touched by the seam change; no later realtime PR may wait until B3 for its first differential.

## B2.2 — Model owns strategy and wording

- [ ] Promote `strategyAnalysis` / `salesSignals` from optional advisory input to strategy authority for normal conversation.
- [ ] Stop `applyWave2ReplyPolicy` rewriting a valid model reply: no `limitQuestions` truncation, no deterministic CTA append on the migrated path.
- [ ] Stop the second `decideWave2SalesStrategy` call overriding model-proposed strategy.
- [ ] Keep the early pre-evidence buying hint (DF06 §18) — it has a contractual basis and no side-effect authority.
- [ ] Do **not** edit `BaselineModelCapability` or the baseline prompt. If evidence shows a prompt change is unavoidable, stop and escalate per execution-plan §2 rather than editing inside this slice.
- [ ] Validate model output as untrusted structured input.
- [ ] Test that valid model wording ships unmodified, and that invalid claims/actions are rejected rather than silently rewritten.

## B2.3a — Claim verification

- [ ] Verify protected claims against typed current facts and provenance.
- [ ] Reject **undeclared** protected claims (`MODEL_CLAIM_BOUNDARY.md`); size/fit is protected.
- [ ] Shrink the final text guard to defense-in-depth; it may reject, never approve.
- [ ] Preserve verified facts and media when later stages fail (r31.3).
- [ ] No mode may restore an unverified business claim (`BEHAVIOR_CONTROL_PLANE.md`).
- [ ] Reason-code every rejection, override, repair and safe fallback.

## B2.3b — Effect reconciliation

- [ ] Treat model actions and effects as requests only; model evidence has authorization `NONE` (DF06 §9).
- [ ] Keep deterministic cart/checkout/payment/handoff authorization, CAS, version, idempotency and trusted-port checks.
- [ ] Resolve ambiguity or deterministic/model conflict to the **less aggressive** action and emit evidence.
- [ ] Preserve atomic state and effect-intent behavior.
- [ ] Test duplicate, stale, conflicting, unauthorized and transaction-failure paths.

## B2.3c — Negotiation split

- [ ] Move normal objection and conversational negotiation direction to model authority.
- [ ] Keep deterministic monetary limits, policy ceilings, arithmetic, freshness, fingerprints and CAS/version/idempotency.
- [ ] Remove `READY/HESITANT/CAUTIOUS` progression as normal conversational authority where it still affects the active path.
- [ ] Test allowed and denied concessions, and stale/replay cases.

## B2.3d — Size and bounded repair

- [ ] Keep verified size computation and provenance deterministic.
- [ ] Make normal size wording model-owned, using only claims that passed the protected-claim boundary.
- [ ] Fail closed when reply text contains a concrete size recommendation with no declared, verified, in-scope claim.
- [ ] Bounded repair is **exactly one** request (`MODEL_CLAIM_BOUNDARY.md`), then an approved safe clarification or handoff carrying no unsupported business claim.
- [ ] Deterministic fallback from verified facts as r31.3 requires; never a second sales-copy pipeline.
- [ ] Prove the fallback preserves verified facts and media and executes no failed or unauthorized effect.
- [ ] Add explicit BF-04 bypass regressions for the migrated path.
- [ ] **Checkpoint:** authority boundary, BF-04 disposition and r31.3 evidence reviewed before B2.4.

## B2.4 — Cut obsolete post-generation reachability

- [ ] Prove active COMMERCE no longer invokes obsolete post-generation strategy, objection/CTA playbook or model-rewrite authority.
- [ ] Keep the verified-facts fallback producers (`AGENTS.md:47`, malformed **output**) and the early buying hint (DF06 §18).
- [ ] Do not edit `sales-stage.ts`; it is already demoted to telemetry under COMMERCE.
- [ ] Extract still-needed recovery/correctness semantics before disconnecting wrappers.
- [ ] Require replacement, consumer migration, rollback review and zero-use proof before any destructive deletion.

## B3 — Live-path differential and replay

- [ ] Complete and reuse the pure comparison core introduced in B2.1; it must claim no queue rows and create no side effects.
- [ ] Reuse `commerce-authority-comparison.ts` for the state half of the differential.
- [ ] Replay the live baseline path before versus after demotion on the same inputs and report differences.
- [ ] Pin model/provider-model identity, prompt/template identity, generation config, policy/schema/config identity and fixed fact fixtures.
- [ ] Cover unsupported and protected claims, PII/security, unauthorized effects, stale or missing facts, malformed output, the single-repair budget, verified-facts fallback and BF-04 size regressions.
- [ ] Prove no customer message and no state mutation can occur.
- [ ] Do not build a second replay framework; do not require the full Wave1 population.
- [ ] Reuse the adapter for Track C.

## Merge boundary

- [ ] Focused tests pass.
- [ ] r31.3 differential evidence reviewed, intentional deviations documented.
- [ ] Side-effect-free replay passes required assertions.
- [ ] Exact-head canonical CI run is green; a zero-step run is unavailable, not a pass.
- [ ] No artifact states or implies that a Gate-E candidate PASS accepts the live runtime.

## B3.1 — Pre-deploy re-evaluation (deploy gate only)

- [ ] Only for a candidate selected for PREPROD deployment; local and unmerged candidates need no promotion ceremony.
- [ ] Provide the minimal operational entrypoint around the existing runner; reuse `executeGateEScoredRun(...)` and do not rebuild scorer or evidence logic.
- [ ] Run the current governing re-evaluation path for the exact candidate.
- [ ] Use existing provenance and release evidence; do not invent a competing promotion manifest.
- [ ] Keep provider credentials out of GitHub Actions and the repository; run the provider-backed rerun in an authorized local/VPS/manual or scheduled environment.
- [ ] Only if the governing contract still creates a concrete unacceptable blocker, propose the smallest separately authorized amendment. Do not pre-build a new evidence profile.
- [ ] Do not mutate authority, config or database pointers and do not deploy in this slice.

## B3.2 — Owner-scoped deploy

- [ ] Treat deployment as an authority-bundle/behavior identity mutation; do not claim source-deploy-only.
- [ ] Produce the new canonical bundle hash and behavior content identity from source, plus the exact previous bundle/version/hash/revision/source rollback identity.
- [ ] Ask the owner for one instruction explicitly authorizing the deploy **and** authority/pointer mutation; the current source-work authorization is insufficient.
- [ ] Use the reviewed page-scoped pointer/CAS/readback/rollback path. Apply migration `0036` only if source evidence proves that exact path requires it and the owner separately authorizes it.
- [ ] Deploy only the exact merged commit/build for affected services.
- [ ] Preserve the exact previous affected-service release/build/commit as the release-local rollback identity.
- [ ] Run pre-activation readiness, then post-activation readback, smoke and controlled test-page checks.
- [ ] Identify one accepted COMMERCE PREPROD baseline for Track C.

## Track B completion

- [ ] Normal COMMERCE strategy, objection/CTA choice and wording are model-owned.
- [ ] Deterministic authority is limited to facts/provenance, protected claims, security/PII, policy, reconciliation/effects, CAS/idempotency and bounded fail-closed recovery.
- [ ] `BaselineModelCapability` unchanged, or an approved deviation exists via the escalation ladder.
- [ ] The Context V2 candidate remained offline, or its promotion was separately decided with the §6 status change made first.
- [ ] DF13 remains the single COMMERCE composition/authority seam.
- [ ] Invalid output is bounded to one repair and cannot execute protected effects.
- [ ] BF-04 is closed with evidence or remains explicitly fenced without increased exposure or misrepresentation.
- [ ] Obsolete post-generation authority is unreachable from active COMMERCE.
- [ ] Live-path differential and replay evidence reviewed.
- [ ] No Gate-E result represented as live-runtime acceptance.
- [ ] Any deployed candidate passed the pre-deploy re-evaluation boundary.
- [ ] No UR/State V2/admin/multi-page/production-hardening scope creep.
- [ ] Rollback remains viable until separately closed with evidence.
- [ ] Owner records Track B completion and Track C start.
