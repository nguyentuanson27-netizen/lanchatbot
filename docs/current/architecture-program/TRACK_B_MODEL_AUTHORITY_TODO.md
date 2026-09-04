# Track B — Execution Checklist

**Status:** `B2.4_MERGED / B3.1_V22_GATE_E_PASS / MIGRATIONS_0036_0037_0038_PREPROD_APPLIED_VERIFIED / B3.2_V2_LKG_SOURCE_MERGED / MIGRATION_0039_OPERATOR_IN_PROGRESS / CURRENT_V2_UNCHANGED`
**B1 evidence:** `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md`
**Selected direction:** demote post-generation deterministic authority only. `BaselineModelCapability` and its observed request envelope stay byte-frozen; the Context V2 candidate stays offline. The owner-authorized B3.1 remediation may change only the failed offline candidate/interpreter evaluation contract and must create a new candidate identity; it is neither a live prompt alternative nor candidate promotion. If the live direction proves insufficient, Track B stops incomplete.

## Before implementation

- [x] Bind the owner source-work authorization (`sourceThreadId=019ff0ed-3760-7e81-98f4-5e91e8ca35b0`). The 2026-08-30 process update permits normal merge of focused Track B source PRs only after clean self-review, final no-blockers from that PR's fixed Sol High reviewer, real exact-head canonical CI PASS and immediate remote-head/base/mergeability revalidation. It does not authorize deploy, tag/release, migration, authority/pointer/CAS mutation, routing, Messenger action, operational acceptance or public-production promotion.
- [x] Bind the authoritative 2026-08-31 owner operational authorization to `ENGINEERING_PREPROD`: B3.1 Gate E, exact affected-service release/deploy, separately governed page-scoped authority/behavior CAS, bounded canary/smoke, owner-controlled Messenger E2E only for page `1198992073286645`, and rollback rehearsal. The later separate owner decision authorized migration `0036`; its governed rehearsal, apply and exact PREPROD readback passed before v21 registration. Public production, page expansion, UR/State V2, LEGACY deletion and unrelated routing/control-plane changes remain outside authorization.
- [x] Record `OWNER_ACCEPTED_SECRET_EXPOSURE_RESIDUAL` exactly: the owner declined PREPROD credential rotation/service-secret update and accepted the private-task exposure residual. This is neither remediation nor evidence that the credential was revoked, rotated or made safe; the value must never be repeated or committed.
- [x] Bind the later authoritative owner remediation-loop authorization: every failed attempt remains immutable and requires a newly reviewed source fix, candidate identity, registration and bounded scored run. The loop stops rather than bypassing provider budget/quota, credentials, ambiguous behavior, non-truthful evidence or a contradictory product-policy contract.
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

- [x] The owner selected the exact final merged Track B candidate for PREPROD deployment; rederive its identity from fresh `origin/main` after every required source PR merge. Local and unmerged candidates receive no promotion ceremony.
- [x] Merge the focused operational entrypoint and PREPROD credential-shape correction in PRs #281/#282. Final entrypoint main is `9b9533641b275403923f7c037247199a0ec760ae`; this is source readiness, not Gate-E acceptance.
- [x] Observe provider identity once against clean exact main `9b9533641b275403923f7c037247199a0ec760ae`: model/version matched `gemini-3.5-flash-lite`, request envelope `b07e16598466a411ca5e64bc2f83d179c5c348849ffa1d5307083ad85f0c8f7b`, candidate fingerprint `cddaa90c358e14747f46b7e5c76ca203bee8fb80a7e8ed4d70d917bb6a7ac7dd`. The first pre-OAuth credential-parse failure consumed no provider model request and produced no evidence claim.
- [x] Merge and anchor the immutable `evaluation/gate-e/track-b-v16` registration bundle before any scored provider request. PR #283 merged as `972241e24cf61d0cccf04b3df3a74fc6a0f10cf1`; the immutable registration anchor hash is `ad665e734d5ead9e52523878ce4eda1feb1e669b4e836573c9736baf25a772e0`.
- [x] Execute exactly one bounded scored run for `track-b-v16`. The admissible exact-head run finalized as `TECHNICAL_ASSERTIONS_FAILED`: immutable evidence hash `ae06604149c6d6042bd09fe9dba94e2f58dcbe39ddc00dfa1d357c162834cb4e`, finalization hash `27c84ba57167273e46d618e637485fb53a4aab59955ea66e3878aa496a1ddb14`. These failed population/scores remain in the denominator and must never be overwritten, relabeled, excluded or reused as a later candidate's evidence.
- [x] Bind the owner-authorized remediation only to the two observed failures: BF-05 `GATE_E_CLAIM_SEGMENT_EVIDENCE_MISMATCH`; BF-06 `GATE_E_EFFECT_DECLARATION_INTERPRETATION_MISMATCH` plus `GATE_E_INTERPRETER_EFFECT_NOT_ALLOWED` and one side-effect violation. No deploy or activation is admitted by this failed run.
- [x] Trace the source mismatch without reconstructing provider output: BF-05 allowed a “natural” size phrase while the deterministic evidence matcher accepts only an explicitly recognizable verified size token; BF-06 registered first-person completed placement wording (`em để ngay bên dưới`) as the positive media example even though the same semantic boundary must reject wording interpreted as a completed message effect. Remediation makes both contracts unambiguous while retaining the existing matcher and effect allowlist.
- [x] Merge the smallest source remediation without weakening claim/effect authorization, provenance, rubric thresholds, interpreter allowlist or whole-group safety. PR #284 reviewed head `3c044c3fddb571f5c56b6b73c14b00fa2d074ee7` merged as `270a55a576f5cc0e01e8d09ad3057e3385bc10bf`; canonical CI run `33351267185`, job `99365049727` passed on the exact reviewed head.
- [x] Observe the remediated candidate once against clean trusted exact main `270a55a576f5cc0e01e8d09ad3057e3385bc10bf`: provider identity matched `gemini-3.5-flash-lite`, request envelope `02c1a90e23f6c14cc21f74a93767fa4eb6948eaf29f882d65bafb6557cf9405b`, candidate fingerprint `1a4f4c76aa2f3296099f13914cd8749064bf84d694e5c01761e767168946e9ff`, manifest hash `5a87a4fe775c794467d6d3f1129647c15d5cb9679883338858e63e0c80b10b1c`, interpreter policy hash `347c97a6dfb0bc31cebc90d8d614609893a617fd8d2668b97bec93e858c6e404`.
- [x] Merge and anchor the immutable `evaluation/gate-e/track-b-v17` registration. PR #285 reviewed head `5b28a0ef51625d7bae8813eb5266d257fd882de7` merged as `628e172f527e97c2fbbce38a8e509b5bc6a2aa1c`; population anchor `c4f7a6efea5496f04e51fe677ef23a99b74901133cc840146119d9eeda2eed6e` read back with the exact registration commit/blob, manifest and all 14 frozen case IDs.
- [x] Execute the authorized bounded v17 scored-run invocation once. It failed closed during interpreter preflight, before corpus scoring or evidence construction, with `GATE_E_INTERPRETER_CALIBRATION_FAILED:claim-product_media-adversarial-negative:clarificationTargets:requestedActions`. Exact durable readback for the v17 manifest, anchor and scored revision returned zero BODY and zero FINALIZATION records; no absent hash is invented.
- [x] Root-cause the v17 preflight mismatch without weakening its adversarial probe: the wording describes a future shop action and asks the customer for nothing, but the interpreter returned customer `PRODUCT` clarification / `PROVIDE_PRODUCT` action labels. The smallest contract-correct remediation makes the actor/direction boundary explicit while retaining the same wording, empty expected classification, closed coverage and completed-effect rules.
- [x] Merge the focused v17-preflight remediation without changing the probe or safety contract. PR #286 reviewed head `2b5dac19ca92249db904ff4ab6e1c6f7f7b6d3b9` merged as `62e9ab6c5914484e737c0cd6dd0df667b01d77e6`; canonical CI run `33357192009`, job `99381492213` passed on the exact reviewed head.
- [x] Observe the new exact candidate once against clean trusted main `62e9ab6c5914484e737c0cd6dd0df667b01d77e6`: provider identity matched `gemini-3.5-flash-lite`, request envelope `02c1a90e23f6c14cc21f74a93767fa4eb6948eaf29f882d65bafb6557cf9405b`, candidate fingerprint `75a62d4873dc84d4af0402fe00428e12bbd214459d0c17fe1f019591e462c409`, manifest hash `9867e0e1add3ec980d9fb02e0388f49319086a91690792f8cf9e379a711a4145`, interpreter policy hash `50575db31121ec72839cda10a2bd1bf50f1e0aa86c77c587af6e05e7267c72e3`.
- [x] Merge and anchor `track-b-v18`: PR #287 reviewed head `db23bb174d847437e5323caea9a3c08b253a65b2` merged as `a11dfa88b85a0e9768a57fa7c8b33d11ef1e5482`; population anchor `a6395adbb6e37ed89658a162137517e95bd0e192c537f25a5b5ecd505e72e377` read back against the exact registration commit/blob, manifest and all 14 cases.
- [x] Preserve the admissible v18 failed run unchanged: `TECHNICAL_ASSERTIONS_FAILED`, evidence `29739234086984c2110c8471f9c99a33eb0a175d8a2878cb72f7346377afb294`, finalization `04bcc0f3bf31f4e48a8354ae6f2cffc3c2cdb9a499b545e4578755bec87b66c4`, admissibility `FINALIZED_TRUSTED_EXACT_HEAD`. Coverage and context integrity were `1`, side-effect violations `0`; BF-08 alone failed with `GATE_E_RUNTIME_GUARD_PREMATURE_ORDER_INFO_REQUEST`, so claim safety and MUST_PASS were `13/14`.
- [x] Root-cause v18 at the candidate instruction boundary: BF-08 has `PRODUCT_CONTEXT_UNREADY` and an unresolved product, and its structured semantics were correct, but the generated wording still requested premature order information. The existing priority rule selected product clarification but did not state the corresponding checkout-wording prohibition explicitly. Retain the guard and corpus obligation; make unresolved-product precedence prohibit recipient, phone, address, payment and other checkout-detail requests.
- [x] Merge the focused BF-08 candidate-instruction remediation: PR #288 reviewed head `f40cdf4602254279a56144acd11fbd0dd4db2254` merged as `330c0b058cdca9616ae2724b20edd85bac2e7bb0`; canonical CI run `33362832392`, job `99397422338` passed on the exact reviewed head.
- [x] Observe the new exact v19 candidate once against clean trusted main `330c0b058cdca9616ae2724b20edd85bac2e7bb0`: provider identity matched `gemini-3.5-flash-lite`, request envelope `e120625bb47a00c992dbb3c22a1e7ce71fdd4cc8a592ab6a15a9aa759bd4e1e1`, candidate fingerprint `35f137baaf7f272042afd1dc87aaa760888e0b869052996db41596eaf7f04060`, manifest hash `5ee730005fbf35833ca97d104d0096d2bcd9e747a8cddb6d9fe3263e5f20655d`, interpreter policy hash `50575db31121ec72839cda10a2bd1bf50f1e0aa86c77c587af6e05e7267c72e3`.
- [x] Merge and anchor the immutable `evaluation/gate-e/track-b-v19` registration: PR #289 reviewed head `e69f8dd2298423a81f67f166bba48fffcdcbd5d3` merged as `6c74d4093d8f4436ba7215ce91e89667d3de7a5b`; population anchor `705bcfeaa87c9cd2649e8e1ab7a7dd4ca9081a15cfc22ac2a34db1f91a6f883c` read back against the exact registration commit/blob, manifest and all 14 cases.
- [x] Preserve the admissible v19 failed run unchanged: `TECHNICAL_ASSERTIONS_FAILED`, evidence `c33db91bb8f547c9a3e249cebb9b0ca8b6d83afed279c16823b6bd9a92d41333`, finalization `e4dfb26e14793b0092408e0e55c2199c90853164b8e4ee9dfad64c0f0769a147`, admissibility `FINALIZED_TRUSTED_EXACT_HEAD`. Coverage and context integrity were `1`, side-effect violations `0`; BF-05 alone failed with `GATE_E_CLAIM_SEGMENT_EVIDENCE_MISMATCH`, so claim safety and MUST_PASS were `13/14`. BF-08 passed. Never retry or relabel v19.
- [x] Root-cause v19 at the candidate/verifier wording boundary: the candidate declaration and registered interpreter both matched the required BF-05 evidence, while the deterministic claim-segment verifier alone could not prove a registered affirmative size token from the generated wording. Keep the verifier and corpus obligation unchanged; require each SIZE_FIT segment to include a standalone affirmative clause using the exact first `recommendedSizes` token, excluding question, negation, uncertainty, catalog/list and stock phrasing.
- [x] Merge the focused BF-05 candidate-instruction remediation: PR #290 reviewed head `84c5688a45e364091345cadd100d81308ed110bf` merged as `0eb3e9b709cf7368df3ef5c4f010517c2664d581`; canonical CI run `33370939607`, job `99421690892` passed on that exact head.
- [x] Observe the new exact v20 candidate once against clean trusted main `0eb3e9b709cf7368df3ef5c4f010517c2664d581`: provider identity matched `gemini-3.5-flash-lite`, request envelope `da6c2eea3c93f95d0f499737c64a37fe30c4dfc581073dd425052358949142de`, candidate fingerprint `35f3d595cfc6fdf3d9ddc75bdd5da17801a3cba3d04fa1814424706606bf7eee`, manifest hash `a8c2e6af0d25c05ccdaa125287095561032b1c05eadd1c20b39d5487e5357461`, provider observation hash `74d528850ea4b098b690b438bd970784d04da7c137346d00678d8c9e82b23f7e` and unchanged interpreter policy hash `50575db31121ec72839cda10a2bd1bf50f1e0aa86c77c587af6e05e7267c72e3`.
- [x] Merge and anchor the immutable `evaluation/gate-e/track-b-v20` registration, then run exactly one governed bounded scored invocation. PR #291 merged registration head `133f5a61acf4b0a9d094553de59919bb5af1927a` as `21204865aef4f5f462701417b083074cc7ce8439`; the exact v20 run passed with admissibility `FINALIZED_TRUSTED_EXACT_HEAD`. Preserve that evidence as historical PASS only: later migration-tooling changes altered candidate-source `package.json`, so v20 is non-reproducible for current release activation and must never be relabelled as current-candidate evidence.
- [x] Re-derive current final-main candidate `8ffe7a0ded58fdf10b431717bb36200df2b8b912` field-by-field for a new v21 registration: provider identity `gemini-3.5-flash-lite`, request envelope `da6c2eea3c93f95d0f499737c64a37fe30c4dfc581073dd425052358949142de`, candidate fingerprint `a9e08b7132262e14904a551de820300a417d128fae6d8ac58d29141fe5d1a479`, manifest hash `11935e3d163f54e6cb6dd37f92461d91460fd8ddd47c90e36f658b13d47b245c`, provider observation hash `a4498e19547ff2c6a95c311ed46e803a1e2446115cf02492aeb1c2e94d69279e`, corpus `e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd`, rubric `89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986` and plan `45c8e53bf0c260d23f6a62f7ec630794042360e911324874a16afbf469edcea3`.
- [x] Merge and anchor the immutable `evaluation/gate-e/track-b-v21` registration, then run exactly one governed bounded scored invocation. PR #294 reviewed head `1b6db72ddd7c84d4e9e5e25a349d9e616e98650c` merged as scored revision `6596feaf566edf30ab82f9c8a79ec570d13c948b`; population anchor `19793120cbd44de37926586150994747c2478f9b56cd3f67f504a8ea73f8c54e` was appended and read back. Preserve the admissible v21 failure unchanged: evidence `2d9d3b821afa3e0e98bae52ac29543694f6f5453c1da92bb3c5fff60909d3f06`, finalization `77381a0723e7ea9316d83771e1578e8159915e2f65b4840dd30f412a1789078f`, admissibility `FINALIZED_TRUSTED_EXACT_HEAD`. Coverage and context integrity were `1`, side-effect violations `0`; only `product-switch-stale-binding` failed with `GATE_E_RUNTIME_GUARD_PREMATURE_ORDER_INFO_REQUEST`, so claim safety and MUST_PASS were `13/14`. Never retry, relabel, overwrite or exclude v21.
- [x] Root-cause the v21 product-switch failure at the candidate-instruction boundary without weakening the guard or reconstructing provider output: product-unready precedence was explicit, but a later global tone-example line still offered recipient, phone and address wording to every branch. Scope each wording example to its own first-matching canonical-state rule so STALE, AMBIGUOUS and UNRESOLVED product selection cannot borrow checkout wording; keep the product-switch assertion, runtime guard, corpus, rubric and denominators unchanged.
- [x] Merge the focused v21 product-switch instruction remediation. PR #295 reviewed head `6c491257e1b3b8f76b61e580c9c8fc9f6ae43e96` merged as `edb7971bd637ca02abde46d0ec4121e256e2023f`; canonical CI run `33423591155`, job `99591655411` passed on that exact reviewed head.
- [x] Re-derive the exact v22 candidate from clean trusted main `edb7971bd637ca02abde46d0ec4121e256e2023f`: provider identity `gemini-3.5-flash-lite`, request envelope `5758574b2dfdf1b8b88db65ecee858780fb5ceeb50d7f997cd1c1418a720a9af`, candidate fingerprint `58a4cbb9fb417764c0922c2b2f2012766793b5b4145921c17b1863bca3011331`, manifest hash `3cb70725d079ae36ccec59e2ff886f1e08fed77bd4b3d49a0dddaf380ddae432`, provider observation hash `a9b8d35f07802754fd228d7dd0fb262bbf689467618fe05d43bd34cc9a70f091`, unchanged corpus `e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd`, rubric `89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986`, plan `45c8e53bf0c260d23f6a62f7ec630794042360e911324874a16afbf469edcea3` and interpreter policy `50575db31121ec72839cda10a2bd1bf50f1e0aa86c77c587af6e05e7267c72e3`.
- [x] Merge and anchor the immutable `evaluation/gate-e/track-b-v22` registration. PR #296 reviewed head `8ecab8fdec2e845bd987a8d086ee76b8c7d41596` merged as scored revision `c9e8d366c3cfa05a57c5dfc051605204f1154b89`; canonical CI run `33427692751`, job `99605188174` passed on that exact reviewed head. Population anchor `32e54c647b05f0044cfd7ffaf8593a514119de41a6e4ec377f3c8b6800fd6696` was appended and read back against registration blob `23e7f2d38ead26ea23dde875ac4ace2068fc5f59`, manifest and all 14 cases.
- [x] Execute exactly one governed bounded v22 scored invocation. The durable result is `TECHNICAL_ASSERTIONS_PASS` with admissibility `FINALIZED_TRUSTED_EXACT_HEAD`: evidence `639c0eec9f929c1458148fdc3ef60c49ee88ea22205ec240def85e9a377eced1`, finalization `9af67aec9b2ed8569a010c1a93efcc2a5ed491c83f675e9eb8c7db1cc8517064`, population/scored `14/14`, claim safety/context integrity/coverage/MUST_PASS `1`, side-effect violations `0`, no failed items and no reason codes. Both records were appended and read back exactly. This is the deploy gate for the exact candidate identity, not live-runtime acceptance.
- [x] Use existing provenance and release-evidence machinery; do not invent a competing promotion manifest.
- [x] Keep provider credentials out of GitHub Actions and the repository; the v22 provider observation ran through the authorized PREPROD secret boundary and persisted redacted identity only. `OWNER_ACCEPTED_SECRET_EXPOSURE_RESIDUAL` remains an accepted residual, not credential remediation, revocation, rotation or proof of safety.
- [ ] Only if the governing contract still creates a concrete unacceptable blocker, propose the smallest separately authorized amendment. Do not pre-build a new evidence profile.
- [ ] Do not mutate authority, config or database pointers and do not deploy in this slice.

## B3.2 — Owner-scoped deploy

- [ ] Treat deployment as an authority-bundle/behavior identity mutation; do not claim source-deploy-only.
- [x] Derive the truthful V2 bundle payload from source: strategy `AGENT_PROPOSAL_V1_STRATEGY_ANALYSIS`, CTA `AGENT_PROPOSAL_V1_SALES_SIGNALS`, unchanged fixed consumer set and no bypass classes. The canonical V2 bundle hash is `56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8`. Historical V1 pointer/bundle evidence remains immutable but is not a Track B rollback target.
- [x] Bind the 2026-08-31 owner instruction authorizing exact affected-service deploy and separately governed authority/pointer mutation in `ENGINEERING_PREPROD`; migration `0036` remains separately gated.
- [x] Merge the focused B3.2 source correction in PR #311: immutable v22 evidence and the truthful V2 bundle remain preserved, while the reviewed mutation protocol is corrected to `STAGE_STOPPED -> durable fence -> prove admission HELD -> stop exact source + prove zero in-flight work (queued/held may remain) -> exact CAS/readback -> START_TARGET -> exact runtime/audit/full-consumer readback -> release fence`. Service start is explicit and cannot be hidden in fence release. The self-hashed release-local record is verified before staging. Before-CAS failure restores/readbacks the exact prior service when stopped and discards the target before release; post-CAS failure reverses the exact audited CAS under the still-held lease, restores/readbacks the exact prior service, then releases. Interrupted recovery also requires an exact database admission readback before service or pointer recovery. A lost release acknowledgement is reconciled from the durable released fence plus exact pointer/runtime/audit/consumer state and must report released ambiguity rather than falsely retaining a hold. Any ambiguity before release retains the fence. Reviewed head `b8bbf381b4870a4b41c631c80b28eab12eaff9cd` merged as `ae742d0fdec51333a6cc70b11975231dd4f3a366`; this is source completion only, not deploy, activation or operational acceptance.
- [x] Resolve the database dependency before activation: migration `0037_track_b_commerce_authority_replacement` passed the governed fresh backup/restore and complete `up -> down -> up` rehearsal, was applied once to the exact approved `ENGINEERING_PREPROD` target, and passed exact live ledger/schema/ACL/role/empty-state readback. At that migration checkpoint the service/pointer still had its recorded V1 identity; that is historical evidence, not current-state authority. The current runtime is V2 and remains untouched until a fresh operational readback binds it as the initial LKG V2.
- [x] PR #301 merged pending migration `0038_track_b_commerce_admission_gate` as source only at `main@6bc572e3180e75ba0fc10b3859787ffa79b5b66d`. It depends on exact applied `0036/0037` ledger hashes and the exact `0037` replacement-guard function identity, then atomically holds `webhook_inbox -> PROCESSING`, `meta_outbox -> SENDING`, and `pancake_tag_outbox -> APPLYING` for the matching page while any matching `MESSENGER` fence is unreleased, including after lease expiry. New inbound remains durable/queued and existing leases can drain. Installation/removal serialize against fence acquisition, and down refuses unless there are zero unreleased fences. Current source hashes are up `9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140`, down `5dd292a169a5ecce5f21896bf8e11f1d7727a34a55758c92b8abc98f3de64d9a`. Source merge alone did not apply the migration.
- [x] Use the reviewed `deploy/track-b-0038-preprod-operator.sh` boundary for the owner-authorized exact-main fresh backup, isolated restore, real-PostgreSQL `up -> down -> up` acceptance, live apply and exact readback. Migration `0038` is applied and verified on the approved ENGINEERING_PREPROD target; the operator did not deploy/start/stop services, create/release a fence, move the behavior pointer or send traffic.
- [x] Merge the replacement `TrackBCommerceAuthorityMutationPorts` PREPROD adapter, self-hashed operation packet and pending `0039_track_b_v2_lkg_cutover_fence` source artifact in PR #311. PR #310 is closed/superseded and excluded from the canonical path. Migration 0039 remains unapplied until its separately reviewed operator completes fresh backup/rehearsal; its hashes are up `f9bb37c95ba77b6947958442cc223f5f4583d43cba4591de5abfaed002e068ca`, down `191e1846a549d99d4c6d4a804fc0148b0458f0fda6944a04e20d48286f7e7301`. It permits only the page-scoped same-version/same-content `COMMERCE/V2_ACTIVE` V2 service cutover under a new pointer revision and removes V1 rollback admission from the current Track B guard without rewriting applied 0037 history. The new record binds candidate V2 and LKG V2 source/tree, image/tag/build/config, pointer/version/bundle, mounted startup hash, a full-precision database-watermarked runtime resolution received by the database within the bounded read-only 120-probe window, Gate E evidence and database-derived migrations-through-0039 compatibility. Schema-drift recovery observes the exact durable fence read-only before reporting retained/released/unknown state and performs no mutation when that state is unknown. Runtime/recovery routing binds service identity plus the pointer-selected startup artifact; re-entry accepts only one exact service-plus-mount match and treats service-only, missing or duplicate matches as ambiguous. Only `ACTIVATE_V2_CANDIDATE` and `ROLLBACK_TO_LKG_V2` are admitted; missing/stale/ambiguous/incompatible LKG fails closed, and no V1 or third-authority fallback exists.
- [ ] Merge and run the focused migration 0039 PREPROD operator. The source boundary pins the current accepted V2 pointer, exact container image/revision/runtime-config and mounted-startup file identity, migrations-through-0038 ledger, fresh backup, isolated `up -> down -> up`, exact V2-LKG guard/catalog/ACL/role readback, zero-unreleased-fence down precondition, conflict/race tests and exact recovery. Source merge alone is not migration apply or operational acceptance.
- [ ] Deploy only the exact merged commit/build for affected services.
- [ ] Fresh-read the currently accepted V2 and bind its exact compatible release/service/pointer/startup/Gate-E/schema identity as the initial Track B LKG V2 before any later operational mutation.
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
- [ ] V2-to-exact-LKG-V2 rollback remains viable; V1/LEGACY is never selected by Track B.
- [ ] Owner records Track B completion; the administration task separately validates the handoff and owns any Track C task creation.
