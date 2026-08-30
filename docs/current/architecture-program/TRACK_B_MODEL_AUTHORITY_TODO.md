# Track B — Execution Checklist

**Status:** `B2.3A_MERGED / B2.3B_SOURCE_IN_PROGRESS`
**B1 evidence:** `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md`
**Selected direction:** demote post-generation deterministic authority only. `BaselineModelCapability` and its observed request envelope stay byte-frozen; the Context V2 candidate stays offline. If that direction proves insufficient, Track B stops incomplete; it has no prompt-edit or candidate-promotion alternative.

## Before implementation

- [x] Bind the 2026-08-29 owner message authorizing Track B **source implementation only** (`sourceThreadId=019ff0ed-3760-7e81-98f4-5e91e8ca35b0`). This does not authorize merge, deploy, migration, authority/pointer mutation, routing, Messenger action or public-production promotion.
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
- [ ] **Checkpoint:** exact B2.3b head has clean self-review, one fixed independent Sol High reviewer verdict, and canonical repository CI PASS.

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
