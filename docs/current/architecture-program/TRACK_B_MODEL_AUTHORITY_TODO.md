# Track B — Execution Checklist

**Status:** `B1_FIRST_PASS_DONE / B2 NOT STARTED`
**B1 evidence:** `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md`
**Selected direction:** promote the Context V2 candidate capability to live COMMERCE generation; baseline stays byte-frozen **and stays on the live path as the per-turn fallback** whenever no valid Context V2 capture exists (`MODEL_EVALUATION_BOUNDARY.md` §11).

## Before implementation

- [ ] Receive a separate owner command authorizing Track B implementation; merge of the plan PR is not authorization.
- [ ] Re-read `AGENTS.md`, `OPERATING_MODE.md`, `program-state.json`, this plan, and relevant contracts from the exact merged `main` head.
- [ ] Follow `SOLO_PREPROD_MINIMAL` (PR #269, merged and active): `branch -> code + focused verification -> PR -> exact-head verification -> merge -> deploy exact commit -> smoke`. Do not reintroduce Release Train or a second approval record as a default gate.
- [ ] Lock the exact implementation head used for B1.
- [ ] Keep `stateReadMode=LEGACY`; do not start UR/State V2 without a separate evidence-backed approval.
- [ ] Treat current BF-04 P0 size-claim residual as open until new evidence proves otherwise.

## B1 — Scope / authority / request-identity / provenance lock

- [x] Trace the generation capability actually serving COMMERCE — it is `BaselineModelCapability`, byte-frozen.
- [x] Confirm `ContextV2CandidateOutputV2` already carries model-owned segments/strategy/CTA and was scored at Gate E v15.
- [x] Confirm `df13-commerce-runtime-composition.ts` is admission/fence only; reply orchestration is `RealtimeRunner`.
- [x] Confirm the authority-bundle payload is declarative — no runtime code reads its fields, only `contractHash`.
- [x] Map the BF-04 bypass shape (text detector + exemption classifier) and the structured-claim closure direction.
- [x] Confirm no reply-behavior differential runner exists. `shadow-runner.ts` is the reuse target but is queue-driven and writes shadow-evaluation rows, so B3 must extract its comparison core; `commerce-authority-comparison.ts` covers the state half.
- [x] Confirm canonical self-hosted CI is functional on exact heads.
- [ ] Design the deterministic capture-validity selector between candidate and baseline. §11 forbids calling the candidate without a valid built capture, and `AGENTS.md:47` forbids failing the turn, so the baseline is the fallback branch. Selector must be deterministic and inside the fence. **Highest-risk open item; close before B2.1.**
- [ ] Trace the effect/commit path in `sales-cycle-runtime.ts` and the commerce-kernel policy/negotiation transitions.
- [ ] Separate already-demoted legacy `salesStage` from current `SalesCycleStageV1` / DF13-context authority.
- [ ] Classify reachable components as `KEEP`, `SPLIT/REWRITE`, `RETIRE_AFTER_CUTOVER`, or `ROLLBACK_ONLY`.
- [ ] Lock exact B2.1/B2.2 files and focused tests.
- [x] Inventory candidate source coverage — the frozen set contains no `realtime-runner.ts`, no `df13-*`, and nothing from `chat-runtime`/`commerce-kernel`/`conversation-engine`.
- [ ] Draft the extended candidate-source list covering the live orchestration path.
- [ ] Record which changed/new files require candidate-source/fingerprint re-derivation.
- [ ] Prove baseline/candidate generation capabilities do not share prompt builders, request builders, response identity rules, or public generation methods.
- [ ] Record the regression-pinned baseline request envelope.
- [ ] Record the full candidate request identity: model resource, system instruction, prompt/content, response schema, generation config, safety settings, and every other provider-affecting field.
- [ ] Map BF-04 unverified size-claim bypasses relevant to B2.3d.
- [x] Activation impact determined: provisionally **source-deploy only**, valid while `authorityIndependentBypassClasses` stays empty, the consumer set is unchanged, and the derivation label stays truthful. Re-check in every B2 slice.
- [ ] Record the exact activation/authorization scope Track B will ask the owner to grant in one instruction (expected: scoped deploy only, no authority mutation).
- [ ] Re-estimate remaining Track B work from B1 evidence.
- [ ] Stop/amend plan if a state migration, second permanent runtime/control plane, or materially wider slice is required.
- [ ] **Checkpoint:** B1 findings reviewed before B2.1.

## B2.1 — Extend existing DF13 seam

- [ ] Extend/reuse DF13 composition/executor/context/finalization; do not add a sibling top-level `CommerceRuntime`.
- [ ] Add only minimum internal stage interfaces needed for proposal -> verification -> reconciliation -> fallback/finalization.
- [ ] Preserve existing persistence/queue/authority resolver and LEGACY rollback behavior.
- [ ] Add focused composition/executor characterization tests.
- [ ] Run affected-workspace verification required by `SOLO_PREPROD_MINIMAL`.
- [ ] Produce r31.3 differential evidence for realtime behavior touched by the seam change.

## B2.2 — Model authority + evaluation-boundary preservation

- [ ] Extend `ContextV2CandidateOutputV2` rather than designing a new proposal contract; widen the strategy/CTA enums for objection handling, negotiation and post-sale — **minimally**, since §18 requires a matched positive and adversarial-negative registered probe per reachable class and coverage closure is checked before corpus scoring.
- [ ] Register the Track B candidate prompt-family version with an explicit owner predicate; unknown `context-v2-candidate-*` versions fail closed (§15).
- [ ] Design the candidate/baseline selector and cover both branches in tests.
- [ ] **Blocking:** revise `MODEL_EVALUATION_BOUNDARY.md` §1 **and §6** before B2.2 ships. §6 currently forbids a candidate from sending customer messages or becoming a live semantic authority, which is exactly what promotion does. The revision is a status change for the promoted capability, keeping §6 intact for whatever stays an offline candidate.
- [ ] Do not edit `BaselineModelCapability`; keep prompt/request builders and response identity rules separate.
- [ ] Validate model output as untrusted structured input.
- [ ] Make normal COMMERCE strategy, objection handling, CTA choice, and wording model-owned.
- [ ] Do not target already-demoted legacy `salesStage` unless B1 proves active authority/rollback need.
- [ ] Remove/demote current deterministic strategy selection only where B1 proves it still owns normal conversation rather than correctness.
- [ ] Preserve valid model wording when claims/effects are valid.
- [ ] Keep baseline and candidate capabilities separate: no shared prompt builder, request builder, response identity rule, or public generation method.
- [ ] Bind all changed candidate request fields into candidate request identity, including system instruction, prompt/content, response schema, generation config, safety settings, and other provider-affecting fields.
- [ ] Do not change the regression-pinned baseline request envelope without explicit approved deviation + realtime differential evidence.
- [ ] Add valid/malformed/adversarial proposal tests.
- [ ] Add builder/method-separation and request-identity regression tests/assertions.
- [ ] Differential-test against r31.3 and record intended deviations.

## B2.3a — Protected claim verification

- [ ] Verify price/stock/promo/size/ETA and other protected claims against typed current facts/provenance.
- [ ] Reject/regenerate unsupported, stale, or mismatched claims.
- [ ] Keep final text guard as defense-in-depth rather than primary reverse-parser/copy repair.
- [ ] Preserve verified facts/media on downstream failure per r31.3.
- [ ] Test protected-claim mismatches, stale provenance, malformed output, PII/security, and facts/media preservation.

## B2.3b — Effect reconciliation

- [ ] Treat model actions/effects as requests only.
- [ ] Keep deterministic cart/checkout/payment/handoff authorization.
- [ ] Preserve policy, CAS/version/idempotency/trusted-port and transaction checks.
- [ ] Remove conversational stage sequencing only where it is not protecting an explicit correctness invariant.
- [ ] Test duplicate, stale, conflict, unauthorized, protected-transition and transaction failure paths.

## B2.3c — Negotiation split

- [ ] Move normal objection/conversational negotiation direction to model authority.
- [ ] Keep deterministic monetary limits, policy authorization, arithmetic, evidence freshness, fingerprints and CAS/version/idempotency.
- [ ] Remove `READY/HESITANT/CAUTIOUS`-style progression as normal sales authority only where B1 proves current reachability.
- [ ] Test allowed/denied concessions, stale evidence, replay/id collision and money arithmetic.

## B2.3d — Size + deterministic verified-facts fallback

- [ ] Do not activate model-owned size wording until the BF-04 fence precondition is satisfied.
- [ ] Either close relevant BF-04 bypasses on the migrated path with regression evidence, or prove/fence that Track B cannot emit/authorize that unsafe claim class while leaving BF-04 explicitly open.
- [ ] Keep verified size computation/provenance deterministic.
- [ ] Allow model wording only from verified size facts that passed the claim boundary.
- [ ] Add fixed maximum bounded regeneration.
- [ ] After exhaustion, use deterministic fallback from verified facts/current safe outputs as required by r31.3.
- [ ] Ensure fallback is not a second normal sales-strategy/copy pipeline.
- [ ] Ensure fallback preserves verified facts/media and cannot execute failed/unauthorized effects.
- [ ] Test BF-04 bypass regressions, size boundaries, regeneration budget, fallback, facts/media preservation and no-effect behavior.
- [ ] **Checkpoint:** review authority boundary + BF-04 disposition + r31.3 evidence before B2.4.

## B2.4 — Cut obsolete COMMERCE authority reachability

- [ ] Prove active COMMERCE no longer invokes obsolete deterministic normal strategy/objection/CTA/model-rewrite authority.
- [ ] Do **not** remove `BaselineModelCapability` or the verified-facts fallback producers from the live path; they serve every turn without a valid capture (§11 + `AGENTS.md:47`).
- [ ] Do not edit/delete legacy `sales-stage.ts` merely because it is old; require current reachability or rollback evidence.
- [ ] Preserve recovery/correctness semantics required by r31.3 before disconnecting wrappers.
- [ ] Preserve code required by proven LEGACY rollback/non-COMMERCE consumers.
- [ ] Require replacement + consumer migration + rollback review + zero-use proof before destructive deletion.
- [ ] Run focused COMMERCE, affected rollback-route, and r31.3 differential verification.

## B3 — Full-agent replay

- [ ] Build the r31.3 runtime differential harness by extending `shadow-runner.ts`; it does not exist today and every B2 slice's required evidence depends on it.
- [ ] Use exactly one side-effect-free full-agent replay adapter for the migrated DF13 path.
- [ ] Reuse existing evaluation primitives; do not create a second evaluator platform.
- [ ] Pin model/prompt/config/fact/policy identities needed for reproducibility.
- [ ] Capture/block all external/state side effects.
- [ ] Add focused runtime assertions for unsupported/protected claims, PII/security, unauthorized effects, stale/missing facts, malformed model output, verified-facts fallback, and applicable BF-04 size regressions.
- [ ] Produce r31.3 differential evidence with intentional deviations explicit.
- [ ] Reuse this adapter for Track C.

## B3.1 — Governed Gate-E evidence only

- [ ] Freeze final Track B candidate-source set including every new authority-affecting file.
- [ ] Freeze final candidate request identity including model resource, system instruction, prompt/content, response schema, generation config, safety settings and every other provider-affecting field.
- [ ] Re-derive candidate fingerprint/request identity from the exact final registered candidate.
- [ ] Create a separate immutable Track B corpus/rubric artifact for the future Gate-E scored run; do not mutate/relabel accepted v15 artifacts.
- [ ] Pre-register exact candidate + request identity + corpus/rubric/plan identities in required ancestry/time order.
- [ ] Use existing `executeGateEScoredRun(...)`; do not create a second scored-run implementation.
- [ ] Keep provider credentials out of GitHub Actions/repository.
- [ ] Record governed Gate-E evidence for the exact candidate.
- [ ] Prove baseline/candidate builder/method separation still holds.
- [ ] Do **not** mutate authority/config/database pointers or deploy in B3.1.
- [ ] **Checkpoint:** exact-candidate evidence accepted before B3.2.

## B3.2 — Separately authorized activation / deploy / readback / smoke

- [ ] Confirm B3.2 uses the exact candidate accepted in B3.1; no post-evidence authority-affecting source/request change is allowed without re-evaluation.
- [ ] From B1, determine whether activation requires authority-bundle/hash change, behavior pointer/config mutation, migration, or source deploy only.
- [ ] Ask the owner for **one** deploy instruction that explicitly scopes the deploy and every authority/config mutation activation requires; that instruction is the authorization for that scope.
- [ ] Request additional authorization only for a mutation outside that granted scope (authority-mode switch, migration, routing/page-allowlist, destructive data action not named in the instruction).
- [ ] Do not require a Release Train, a second approval record, tag/manifest ceremony, or runtime-state promotion as a default gate.
- [ ] Do not pull migration `0036` into scope unless the exact activation path proves it is required and it falls inside the authorized scope.
- [ ] Verify the exact head on a functioning canonical CI run; if a remote run starts zero repository steps, treat it as unavailable, not pass, and use only `CI_UNAVAILABLE_FALLBACK` bound to that head.
- [ ] If authority/config changes: perform exact DF13 fence/readback verification.
- [ ] Deploy exact merged commit/build only when authorized.
- [ ] Preserve exact previous affected-service release/build/commit and previous authority/config state as rollback identity.
- [ ] Run applicable readiness/smoke/controlled checks and record exact runtime identity.
- [ ] Identify one accepted COMMERCE PREPROD baseline for Track C.

## Track B completion

- [ ] Normal COMMERCE strategy + wording are model-owned.
- [ ] Deterministic authority is limited to facts/provenance, protected claims, security/PII, policy, reconciliation/effects, CAS/idempotency and bounded fail-closed recovery.
- [ ] DF13 remains the single COMMERCE composition/authority seam.
- [ ] Baseline/candidate generation capability separation remains intact.
- [ ] Final candidate identity includes all authority-affecting source files and provider-affecting request fields.
- [ ] Deterministic fallback is verified-facts based, r31.3-compatible, and not a normal sales copywriter.
- [ ] BF-04 is either closed with evidence for the migrated path or remains explicitly fenced/open without increased exposure or misrepresentation.
- [ ] Obsolete deterministic sales authority is unreachable from active COMMERCE or explicitly rollback/non-COMMERCE only.
- [ ] Full-agent replay passes required safety/correctness assertions without side effects and r31.3 differential evidence is reviewed.
- [ ] Future Gate-E evidence uses a new immutable corpus/rubric + valid registration for the exact candidate.
- [ ] B3.1 evidence is accepted before B3.2 runtime mutation/deploy.
- [ ] Every authority/config mutation was inside an explicitly scoped owner instruction, or separately authorized when outside it.
- [ ] Required focused tests/checks pass on a functioning canonical CI run where claimed; zero-step CI is never called pass.
- [ ] No UR/State V2/admin/multi-page/production-hardening scope creep.
- [ ] Rollback remains viable until separately closed with evidence.
- [ ] Owner records Track B completion / Track C start decision.
