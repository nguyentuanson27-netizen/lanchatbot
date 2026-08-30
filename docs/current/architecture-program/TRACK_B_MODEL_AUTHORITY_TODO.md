# Track B — Execution Checklist

**Status:** `B2.4_MERGED / B3_SOURCE_IN_PROGRESS`
**B1 evidence:** `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md`
**Selected direction:** demote post-generation deterministic authority only. `BaselineModelCapability` and its observed request envelope stay byte-frozen; the Context V2 candidate stays offline. If that direction proves insufficient, Track B stops incomplete; it has no prompt-edit or candidate-promotion alternative.

## Before implementation

- [x] Bind the owner source-work authorization (`sourceThreadId=019ff0ed-3760-7e81-98f4-5e91e8ca35b0`). The 2026-08-30 process update permits normal merge of focused Track B source PRs only after clean self-review, final no-blockers from that PR's fixed Sol High reviewer, real exact-head canonical CI PASS and immediate remote-head/base/mergeability revalidation. It does not authorize deploy, tag/release, migration, authority/pointer/CAS mutation, routing, Messenger action, operational acceptance or public-production promotion.
- [x] Re-read `AGENTS.md`, `OPERATING_MODE.md`, `program-state.json`, this plan and the relevant contracts from the exact merged `main` head.
- [x] Follow `SOLO_PREPROD_MINIMAL`: `branch -> code + focused verification -> PR -> exact-head verification -> merge -> deploy exact commit -> smoke`. Do not reintroduce Release Train or a second approval record.
- [x] Keep `stateReadMode=LEGACY`; do not start UR/State V2 without a separate evidence-backed approval.
- [x] Treat the BF-04 P0 size-claim residual as open until new evidence proves otherwise.

## B1 — Scope lock

- [x] The generation capability serving COMMERCE is `BaselineModelCapability`, byte-frozen.
- [x] Reconcile the pre-existing contract/source drift: current realtime serializes the admitted DF13 state including its Context V2 projection into baseline model context. `MODEL_EVALUATION_BOUNDARY.md` V4 records that exact frozen envelope while still prohibiting candidate capability/prompt/schema/request-identity imports.
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
- [x] Distinguish pure `applySalesCycleCommand`, non-live persisted `executePersistedSalesCycleCommand`, live `evaluateRealtimeSalesCycle`, protected-outbound grouping, `RealtimeCommitInput` and DF13 `commitThroughFinalizers`.
- [x] Complete the KEEP / DEMOTE / SPLIT classification for every reachable component, using V5's taxonomy.
- [x] Produce the exact focused-test map per changed boundary.
- [x] Re-estimate and lock the source-PR decomposition before B2.1.
- [x] Resolve bundle semantics: baseline `AgentProposalV1.strategyAnalysis` is not the `CONTEXT_V2_STRATEGY_INPUT_V1` contract, so Track B changes the authority bundle and behavior identity. B3.2 is an owner-scoped authority mutation with pointer/CAS/readback/rollback; `0036` remains conditional on source proof.
- [x] **Checkpoint:** B1 residuals closed, independently reviewed and merged in PR #272.

## B2.1 — Post-generation seam

- [x] Add one explicit stage boundary between model generation and final delivery inside `RealtimeRunner`.
- [x] Reuse the DF13 composition/executor/context/finalization owners; no sibling top-level runtime.
- [x] Preserve existing persistence, queue, authority resolver and LEGACY rollback behavior.
- [x] Add focused characterization tests.
- [x] Extract the side-effect-free reply comparison core from `shadow-runner.ts` in this first source PR, before any behavior-changing slice.
- [x] Produce r31.3 differential evidence for realtime behavior touched by the seam change; no later realtime PR may wait until B3 for its first differential.

## B2.2 — Model owns strategy and wording

- [x] Promote `strategyAnalysis` / `salesSignals` from optional advisory input to strategy authority for normal conversation.
- [x] Stop `applyWave2ReplyPolicy` rewriting a valid model reply: no `limitQuestions` truncation, no deterministic CTA append on the migrated path.
- [x] Stop the second `decideWave2SalesStrategy` call overriding model-proposed strategy.
- [x] Stop `postMediaProofCta` appending deterministic post-guard sales CTA copy.
- [x] Keep message grouping/splitting but stop `limitResponseGroupPoliteness` deleting valid normal model wording.
- [x] Keep the early pre-evidence buying hint (DF06 §18) — it has a contractual basis and no side-effect authority.
- [x] Do **not** edit `BaselineModelCapability`, the baseline prompt or the observed serialized request envelope. If evidence shows a change is unavoidable, stop Track B incomplete and request a new separately scoped owner decision.
- [x] Validate model output as untrusted structured input.
- [x] Test that valid model wording ships unmodified, and that invalid claims/actions are rejected rather than silently rewritten.

## B2.3a — Claim verification

The 2026-08-30 owner source-work instruction supersedes the earlier combined
PR shape: B2.3a lands as one focused PR and B2.3d remains a separate later
slice. This split does not waive BF-04 or the exactly-one-repair acceptance
criteria, and it does not authorize merge, deployment or authority mutation.

- [x] Bind each existing structured fact request and verified deterministic
  producer classification by exact claim type plus product/variant or cart
  scope to exact typed claim IDs, then authorize every non-size claim against
  current provenance and scope before whole-group delivery. Type-wide binding
  across multi-product replies is forbidden. Model evidence retains
  `authorization: NONE`.
- [x] Split `catalogAdvisoryReply`, `renderPreSalePolicyReply`,
  `multiFactReply`, `multiProductReply`, `verifiedProductInfoProposal` and its
  XML helpers, `requestedImagesProposal`, `productInfoLookupProposal`, and
  `assembleReply`: model-skipping paths now retain only exact verified
  fact/media rendering, bounded status/safety text and policy denials; XML
  descriptive synthesis, deterministic multi-item offer copy and normal sales
  CTAs were removed. Structured shipping/ETA output without the required
  cart/product provenance now fails closed at the whole-group gate; policy FAQ
  branches no longer emit an exact shipping-fee amount outside that binding.
- [x] Reject **undeclared non-size** protected claims at the structured
  boundary. Size/fit remains on the existing detector and one-repair path for
  B2.3d; this PR does not claim BF-04 closure.
- [x] Keep the final text guard as defense-in-depth: its observations may only
  reject; exact typed claim authorization is required for delivery.
- [x] Preserve verified facts and media when the existing size repair falls
  back, and retain whole-group delivery under r31.3.
- [x] Keep incident/behavior mode unable to restore an unverified business
  claim (`BEHAVIOR_CONTROL_PLANE.md`).
- [x] Reason-code missing, invalid, duplicate, stale, future, undeclared and
  scope-mismatched structured claims.
- [x] Exercise the migrated live-path claim seam against the immutable
  r31.3 snapshot captured from exact pre-B2.3a head
  `89b1bee02109e17b6b3b2a0e714e24d3bdb70a60`; preserve verified fact, claim,
  effect, commit and whole-group hashes, and block a group carrying a
  model-declared ID with no typed evidence.
- [x] **Checkpoint:** exact B2.3a head has clean self-review, one fixed
  independent Sol High reviewer verdict, and canonical repository CI PASS.

## B2.3b — Effect reconciliation

- [x] Treat the existing structured model action as a request only; model evidence retains `authorization: NONE` (DF06 §9) and a model-only request cannot pass readiness.
- [x] Preserve deterministic cart/checkout/payment/handoff authorization and the existing transaction-time CAS, version, idempotency, fence, policy and trusted-port checks; bind cart-open, ADD default-one/explicit quantity and SET quantity to the exact payload again in final database verification.
- [x] Resolve deterministic/model conflict to the **less aggressive** action and emit `MODEL_*` conflict evidence codes.
- [x] Preserve atomic state and effect-intent behavior; no new persistence, commit or side-effect port is introduced.
- [x] Record the renderer disposition: exact transaction/effect facts, policy denials and minimal safe confirmations stay deterministic; negotiation prose remains deferred to B2.3c and is not changed by this focused slice.
- [x] Exercise exact action and quantity-evidence mismatch, model-only authorization, adversarial resealed cart-open/ADD/SET quantity mismatch at the database transaction boundary, positive corroborated mutation, duplicate/stale/CAS/idempotency/transaction invariants and side-effect-free r31.3 live-sales-cycle replays pinned to pre-B2.3b `933a227a0ff08702e87ea697d7284d7024f74dbf`.
- [x] Keep B2.3b conflict/mismatch codes in canonical buying-intent provenance without widening the migration-frozen dialogue/admin allowlist; assert the historical Gate-E identity fails closed for changed Track B source pending B3.1 re-evaluation.
- [x] **Checkpoint:** reviewed source head `97e4a1f1cee8dffd07519454260c0f5d28fe87a9` had clean self-review, the fixed independent Sol High reviewer returned APPROVE with no Required/P0/P1/P2, and canonical repository CI run `33291355341` passed all repository steps. This docs-only closure must retain those source bytes and pass its own exact-head CI before merge readiness.

## B2.3c — Negotiation split

- [x] Move normal objection and conversational negotiation direction to a bounded model proposal built only after the final proposal/claim guard on COMMERCE; reject protected-claim wording at this pre-transition seam and append exact post-transition cart facts deterministically.
- [x] Keep deterministic monetary limits, policy ceilings, arithmetic, freshness, trusted inbound identity, fingerprints and CAS/version/idempotency; the model proposal has no monetary/effect field.
- [x] Retain `READY/HESITANT/CAUTIOUS` only as the monetary-policy ledger; it no longer selects normal COMMERCE negotiation prose. Preserve the deterministic renderer and text-authorizing classifier only on explicit LEGACY rollback; COMMERCE text matching is rejection-only.
- [x] Test allowed and denied proposals/concessions, malformed, undeclared, out-of-scope and unbound proposals, replay/idempotency, preserved arithmetic and no-side-effect rejection.
- [x] Exercise the live sales-cycle boundary against the immutable r31.3 capture from pre-B2.3c `8591ed9fa5522f9ea50259fa3bf086efddb93cc8`; preserve fact/claim/commit/whole-group invariants and expose the payload-bound readiness-hash delta.
- [x] **Checkpoint:** reviewed source head `c87aa3eb3941f1fd555ba160bbc9c92661476cf7` had clean self-review, the fixed independent Sol High reviewer returned APPROVE with no Required/P0/P1/P2, and canonical repository CI run `33295354299` job `99219132217` passed all repository steps. This docs-only closure must retain those source bytes and pass its own exact-head CI before merge readiness.

## B2.3d — Size and bounded repair

- [x] Keep verified size computation and provenance deterministic.
- [x] Make normal COMMERCE size wording model-owned, using only claims that passed the protected-claim boundary; retain deterministic prose only for explicit LEGACY rollback.
- [x] Fail closed when reply text contains a concrete size recommendation with no declared, verified, in-scope claim. Other protected claim IDs do not count as a `SIZE_FIT` declaration.
- [x] Bounded repair is **exactly one** request (`MODEL_CLAIM_BOUNDARY.md`), then an approved safe clarification or handoff carrying no unsupported business claim.
- [x] Deterministic fallback from verified facts as r31.3 requires; never a second sales-copy pipeline.
- [x] Prove the fallback preserves verified facts and media and executes no failed or unauthorized effect; repaired declarations are rebound so unknown IDs remain fail-closed.
- [x] Add explicit BF-04 COMMERCE regressions for undeclared and mismatched values, non-size inbound plus missing profile/model-intent mismatch, invalid repair, single-repair cap, safe fallback and exact `SIZE_FIT` outbound authorization. The conservative fence applies to every COMMERCE proposal, not a finite inbound/model-intent vocabulary. Exercise the live path against the immutable pre-B2.3d `78a03fe599202c6e275300af33622cb16ab80769` r31.3 capture: verified facts, claims, commit and whole-group invariants remain stable; model-owned wording/strategy and the payload-bound effect-authorization hash are exposed as the exact expected delta. The older pre-B2.3a catalog-size capture now explicitly records the B2.3d safe-fallback claim/effect delta while retaining B2.3a whole-group containment.
- [x] **Source disposition:** `BF04_SOURCE_CLOSURE_CANDIDATE`; exact B2.3d head `1ec597f3d81aa208fdf7e90f17cf7ac022bd6717` was independently approved and canonical CI passed before merge commit `a89a50cb52183a3ffc4f3d7bd313ea675564c07b`. Deployed/operational BF-04 status remains unchanged.
- [x] **Checkpoint:** authority boundary, BF-04 disposition and r31.3 evidence reviewed before B2.4.

## B2.4 — Cut obsolete post-generation reachability

- [x] Split post-generation strategy APIs by authority: COMMERCE receives no legacy callback; only the explicit LEGACY route can invoke the second `decideWave2SalesStrategy` and `applyWave2ReplyPolicy`.
- [x] Make the post-media CTA rollback-only by name and call-site; COMMERCE does not invoke the helper and rely on an internal `null` return.
- [x] Split final delivery APIs and bind selection directly to runtime authority: every active COMMERCE response has no wording-authority option and cannot reach `limitResponseGroupPoliteness`; LEGACY retains the cleanup.
- [x] Keep the verified-facts fallback producers (`AGENTS.md:47`, malformed **output**) and the early buying hint (DF06 §18).
- [x] Do not edit `sales-stage.ts`; it remains telemetry-only under COMMERCE.
- [x] Preserve structured claim/size repair, negotiation/effect reconciliation, whole-group delivery and DF13 commit/fence semantics before disconnecting wrappers.
- [x] Retain rather than delete legacy helpers because explicit LEGACY rollback and rollback tests remain proven consumers.
- [x] Execute the B2.4 r31.3 capture through the actual `RealtimeRunner` against immutable pre-B2.4 `main@a89a50cb52183a3ffc4f3d7bd313ea675564c07b`; preserve deliberately cleanup-sensitive model wording plus verified facts, protected claims, effect authorization, commit and whole-group delivery, while retaining invalid-repair/fallback and LEGACY rollback evidence.
- [x] **Checkpoint:** PR #279 merged reviewed B2.4 head `0221c37d239003e8c737cfc0d37962e2064dbf49` as `c22d0a5181e1e4e67401bf00b79ce9f49cbb663d` after fixed-reviewer no-blockers and canonical CI run `33310735157`, job `99255238013` PASS.

## B3 — Live-path differential and replay

- [x] Complete and reuse the pure comparison core introduced in B2.1; the B3 adapter exposes no queue, delivery, persistence, provider or protected-effect port.
- [x] Reuse `commerce-authority-comparison.ts` for the state half of the differential.
- [x] Replay the immutable exact pre-B2.4 live capture versus the current live path on the same input and report differences without permitting claim/effect drift; derive state comparison from the executed commit/loaded state, take product scope only from the BUILT canonical Context V2 capture binding (fail closed when blocked/absent), and require the exact expected PII-safe projection per capture.
- [x] Pin configured provider-model separately from the deterministic fixture model and bind the unchanged live-path source revision, baseline, grounded, grounded-draft, size-repair and customer-URL-explanation prompts, accepted grounded-draft and verified-fact-assembler runner flags, customer-URL policy, exact structured-agent and structured-grounded-draft generation configs and Vertex response schemas, policy/schema/config, complete business fixtures, captured inputs, risk assertions and expected state projections.
- [x] Cover unsupported and protected claims, PII/security, unauthorized effects, stale and missing facts, malformed output, the single-repair budget, verified-facts fallback and BF-04 size regressions; reject a risk label that lacks an executable reason-coded postcondition.
- [x] Prove capture-only execution records zero customer messages, durable state mutations, queue claims and protected effects.
- [x] Do not build a second replay framework; do not require the full Wave1 population.
- [x] Keep the adapter generic and reusable by Track C.

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
- [ ] `BaselineModelCapability`, baseline prompt and exact observed request envelope remained byte-unchanged.
- [ ] The Context V2 candidate remained offline/evaluation-only; Track B contains no promotion path.
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
