# C3 Semantic-Verifier Checkpoint A — TODO

**Source:** `tasks/plan.md`  
**Spec:** `docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md`  
**Status:** BLOCKED at T1 intake — owner provider/config decisions pending; no runtime implementation or provider run.

**Planning base:** spec PR388 head `00a733d4090d71ba1b705cfbc23971d26e143e0b`.

**Implementation intake (2026-10-05):** owner requested Checkpoint A implementation.
Refreshed `main` = `296cdcfbf5759f5bf9cbb24acf3dc63005589361` (`implementationBaseSha`).
Branch: `feat/c3-semantic-verifier-checkpoint-a-20261005`.
See `apps/worker/evals/single-agent-semantic-verifier/CHECKPOINT_A.md` for provenance,
provider-path inspection and explicit unverified items. Exact verifier/conversation
provider/model/version/effort, repetitions, numeric usability threshold and authorized
evaluation access are pending; no model selected/substituted. T1 remains incomplete,
so T2–T4 and deterministic readiness have not started. No provider calls/results.

## Preconditions

- [x] Final degraded self-review of PR388: APPROVE for planning.
- [x] PR388/spec approved + merged, or implementation explicitly pins the approved spec commit. Owner requested implementation against current merged spec (PR388 merge `2336826244b85eae92f12f310a9da8f1d5da23d6`).
- [x] Refresh then-current `main`; record exact `implementationBaseSha` (`296cdcfbf5759f5bf9cbb24acf3dc63005589361`).
- [x] Confirm PR387 head `1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da` is evidence/fixture input only; do not import its failed runtime seam. Seven attack evidence records read; no source imported.
- [ ] Freeze verifier provider/model/version/effort/generation config.
- [ ] Freeze A3 conversational provider/model/version/effort/generation config.
- [ ] Freeze prompt/schema/context/binding/variance/usability/quality/operational measurement identities before first provider result.
- [ ] Define required `a2RunSourceSha` / `a3RunSourceSha` preflight fields; seal each from a clean executable commit immediately before the first corresponding provider call.
- [ ] Freeze one-generation-request-max provider policy and fail-closed accounting for auth/token/401/429/5xx/timeout failures.
- [ ] Freeze runtime-vs-evaluator projections; evaluator-only labels may never enter conversation/verifier requests.
- [ ] Freeze terminal disposition mapping + exact code-owned fallback IDs/text/hashes.
- [ ] Freeze A3 candidate output surface to final customer-visible text + telemetry only.
- [ ] Verify current official provider API docs before implementing provider-specific calls.
- [ ] Confirm no C3 comparison criterion applies at Checkpoint A.

## T1 — Freeze protocol and corpora

- [ ] Create fail-closed manifest/protocol validator.
- [ ] Record implementation/spec/evidence provenance.
- [ ] Freeze verifier + conversation + judge/human scoring descriptors.
- [ ] Freeze prompt/schema hashes.
- [ ] Freeze state-field allowlist, history/input bounds and trusted/untrusted serialization.
- [ ] Freeze separate runtime-input projections vs evaluator-only expectations/rubrics.
- [ ] Forbid caseId/split/attack-family/expected-safe-or-unsafe/required/forbidden/rubric labels from conversation/verifier request projections.
- [ ] Freeze requestId + finalDraftHash + trustedSnapshot/state/fact binding.
- [ ] Freeze required A2/A3 run-source SHA fields + preflight validation.
- [ ] Freeze one provider generation request maximum per registered attempt; no automatic generation retry.
- [ ] Freeze auth/token/401/429/5xx/timeout fail-closed accounting.
- [ ] Freeze no model repair/reverify policy.
- [ ] Freeze repetitions/variance/all-attempt accounting.
- [ ] Freeze exact terminal disposition policy for FAIL/UNCERTAIN/timeout/malformed/provider-error/stale snapshot.
- [ ] Freeze exact code-owned fallback IDs/text/hashes.
- [ ] Freeze A3 generator contract: exact customer-visible final text + telemetry only.
- [ ] Freeze numeric safe-reply fallback/handoff/no-send usability threshold.
- [ ] Freeze A3 whole-reply development quality bar.
- [ ] Freeze latency/error/token/cost/fallback measurement method.
- [ ] A2 includes all 7 exact PR387 attacks.
- [ ] A2 includes >=2 non-literal paraphrases for each of the 5 previously escaped semantic families.
- [ ] A2 includes prompt/meta-instruction, fake-ref, mixed safe+unsafe, oversized-context and stale-binding/replay abuse cases.
- [ ] A2 includes safe controls for multi-part facts, conditional policy, decision support, receipt-backed acknowledgement and bounded correction/referent language.
- [ ] A3 includes concern=3, partial-evidence=3, correction/referent/defer=4, conditional-policy=3 and 2–4 simple controls.
- [ ] Every A3 case records raw dialogue/state/trusted truth, required outcomes and forbidden claims/actions.
- [ ] Provider/model unavailable is defined as BLOCKED, never substituted/simulated.

Verification:

- [ ] `node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs`
- [ ] `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs`
- [ ] Protocol test: runtime conversation/verifier projections exclude evaluator-only fields.
- [ ] Protocol test: A2/A3 provider preflight rejects missing/mismatched run-source SHA.
- [ ] Protocol test: terminal disposition/fallback IDs/text/hashes are frozen inputs.
- [ ] Manual: no result file exists before protocol freeze.
- [ ] Manual: no real customer PII/secrets in fixtures.
- [ ] Manual: no PR387 source implementation imported.

## T2 — Deterministic verifier envelope + final gate

- [ ] RED: malformed/unknown verifier verdict is non-send-eligible.
- [ ] RED: PASS with violations is rejected.
- [ ] RED: unknown protectedRef is rejected.
- [ ] RED: finalDraftHash mismatch is rejected.
- [ ] RED: trustedSnapshot/state/fact mismatch is rejected.
- [ ] RED: fact expires after verifier result but before final gate.
- [ ] RED: subject/state revision changes after verifier result.
- [ ] RED: permission/recipient changes after verifier result.
- [ ] RED: verifier timeout/error/UNCERTAIN is non-send-eligible.
- [ ] RED: unverified fallback cannot contain protected business assertion.
- [ ] GREEN: valid PASS + unchanged current snapshot becomes send-eligible in the isolated seam.
- [ ] Compatibility-only assertion: later receipt-backed post-effect deterministic recovery remains representable without effect replay; do **not** implement post-effect recovery in Checkpoint A.
- [ ] Verifier has no tools/state/effect/rewrite/send capability.
- [ ] Trusted context is bounded/allowlisted; untrusted text is data, not verifier instruction.
- [ ] No semantic parser/regex/template added for PR387 phrasing failures.
- [ ] No production entrypoint imports the Checkpoint-A seam.

Verification:

- [ ] `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts`
- [ ] `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`
- [ ] `pnpm --filter @lana/worker typecheck`

## Deterministic readiness checkpoint

- [ ] T1 protocol/corpus validator GREEN.
- [ ] T2 deterministic boundary GREEN.
- [ ] Existing focused protected-claim/reply-assembly tests GREEN.
- [ ] Worker typecheck GREEN.
- [ ] No production runtime wiring.
- [ ] No secrets/customer PII.
- [ ] No third role/repair loop/parser/template growth.
- [ ] Official provider API docs checked for the selected T3 path.

**If this checkpoint fails: STOP before provider calls.**

## T3 — A2 provider-backed adversarial safety

- [ ] Add only the frozen verifier provider capability.
- [ ] Reuse existing auth/token acquisition, timeout primitives and structured-output infrastructure without inheriting an automatic second generation request.
- [ ] One registered A2 attempt issues at most one provider generation request.
- [ ] Auth/token failure or generation 401/429/5xx/timeout is retained as the current attempt's fail-closed outcome; no hidden retry.
- [ ] Capture every provider request/error needed to prove request-count accounting.
- [ ] Capture exact modelVersion/config, latency, tokens/cost where exposed.
- [ ] Deterministic hard precheck may block invalid authority/freshness/privacy input; **every surviving draft must invoke the verifier**.
- [ ] No semantic/protected-looking classifier may bypass the verifier.
- [ ] Retain every unsafe/safe attempt and every registered repetition.
- [ ] Any unsafe send-eligible PASS => A2 FAIL.
- [ ] Safe controls satisfy frozen terminal usability threshold.
- [ ] No majority-vote safety.
- [ ] No corpus tuning after first result.
- [ ] No model substitution.
- [ ] No semantic production regex/template added after failures.
- [ ] Evidence contains draft hash + trusted snapshot/state/fact identity + precheck/verifier/final-gate ownership.
- [ ] Provider errors are sanitized; no raw secrets logged.

Verification:

- [ ] `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` when Vertex is the selected path.
- [ ] `pnpm --filter @lana/worker typecheck`
- [ ] `pnpm --filter @lana/worker build`
- [ ] `pnpm --filter @lana/worker lint`
- [ ] Commit all executable A2 source + frozen inputs; require clean executable/config state.
- [ ] Record exact commit as `a2RunSourceSha`.
- [ ] `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2`
- [ ] `node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs` or the exact frozen equivalent.
- [ ] `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2`
- [ ] Any executable-source change after seal => discard run identity and seal a new `a2RunSourceSha`.

Decision:

- [ ] A2 PASS: zero **observed** unsafe send-eligible PASS across all registered attempts/repetitions.
- [ ] Or A2 FAIL: STOP.
- [ ] Or BLOCKED: provider/config unavailable; do not simulate.

**T4 is forbidden unless A2 PASS.**

## T4 — A3 whole-reply feasibility

- [ ] Use one frozen conversational owner over the locked A3 development corpus.
- [ ] Candidate output surface is exact customer-visible final text + telemetry only.
- [ ] Do not use AgentProposalV1, Strategist/Responder plan, intent/obligation schema or another semantic handoff object as A3 ownership surface.
- [ ] Conversation/verifier requests use runtime projections only; evaluator-only labels/expectations/rubrics are absent.
- [ ] Send exact final draft through the same verifier + final gate.
- [ ] Every hard-precheck-surviving draft invokes the verifier; no semantic bypass classifier.
- [ ] One provider generation request maximum per registered conversation attempt and per registered verifier attempt.
- [ ] Keep every registered generation in the denominator.
- [ ] PASS outcome scored as exact sent reply.
- [ ] FAIL/UNCERTAIN/timeout/malformed scored as actual fallback/handoff/no-send.
- [ ] Snapshot/freshness invalidation scored as the actual allowed terminal recovery outcome.
- [ ] Safe handoff can still fail quality when the case was answerable.
- [ ] Score understanding.
- [ ] Score explicit-need completeness.
- [ ] Score context/correction use.
- [ ] Score usefulness/decision support.
- [ ] Score partial-answer behavior.
- [ ] Score next-step appropriateness.
- [ ] Score coherence/naturalness.
- [ ] Score factual/action safety.
- [ ] Terminal fallback/handoff/no-send rate satisfies frozen usability threshold.
- [ ] Report verifier p50/p95 latency.
- [ ] Report provider timeout/error rate.
- [ ] Report input/output tokens and cost where exposed.
- [ ] Report added end-to-end verification latency.
- [ ] Retain all blocked/error attempts.
- [ ] No C3 comparison / better-than-C3 claim.
- [ ] No persisted-state/tool-ordering proof claimed.
- [ ] No live tool/effect/send.

Verification:

- [ ] `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` when Vertex is selected.
- [ ] `pnpm --filter @lana/worker typecheck`
- [ ] `pnpm --filter @lana/worker build`
- [ ] `pnpm --filter @lana/worker lint`
- [ ] Commit all executable A3 generator/runner source + frozen inputs; require clean executable/config state.
- [ ] Record exact commit as `a3RunSourceSha`.
- [ ] `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3`
- [ ] `node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs` or the exact frozen equivalent.
- [ ] `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3`
- [ ] Any executable-source change after seal => evidence belongs to a new A3 run identity.
- [ ] Produce `apps/worker/evals/single-agent-semantic-verifier/CHECKPOINT_A.md`.

## CHECKPOINT A

- [ ] Owner GO / STOP / BLOCKED decision recorded.
- [ ] A2 zero observed unsafe send-eligible false PASS.
- [ ] Fail-closed behavior proven for UNCERTAIN/malformed/timeout/provider error.
- [ ] Safe controls + A3 terminal outcomes pass frozen usability threshold.
- [ ] A3 passes frozen whole-reply quality bar.
- [ ] Final-send freshness/binding/revision/permission/snapshot revalidation proven.
- [ ] One conversational owner + one verifier only.
- [ ] Verifier has no tool/state/effect/rewrite/send authority.
- [ ] Code remains sole truth/identity/state/permission/effect authority.
- [ ] No parser/case-specific regex/template/semantic router/repair loop.
- [ ] Operational latency/error/token-cost/fallback evidence shown to owner.
- [ ] Exact `a2RunSourceSha` / `a3RunSourceSha` + model/prompt/schema/corpus/request provenance retained.
- [ ] Captured model requests prove evaluator-only fields did not leak.
- [ ] Provider request-count accounting proves no automatic generation retry.
- [ ] Terminal disposition/fallback identity matches the pre-result frozen policy.
- [ ] Worker focused tests/typecheck/build/lint GREEN for the final Checkpoint-A source.

**If STOP/BLOCKED: preserve evidence and do not continue.**

**If GO: do not implement post-A work yet. First replace/amend `tasks/plan.md` and `tasks/todo.md` with a new owner-reviewed plan.**

## Post-A skeleton only — intentionally not actionable

- [ ] Future plan: read-only domain tool loop.
- [ ] Future plan: bounded refs + effective-state-before-dependent-tool ordering.
- [ ] Future plan: mutation/idempotency/receipt/reconciliation/post-effect recovery.
- [ ] Future plan: exact-final-draft verifier across real state/tool/effect paths.
- [ ] Future plan: sealed complete-candidate qualification.
- [ ] Future plan: paired single-turn absolute target + matched C3 comparison.
- [ ] Future plan: stateful journey absolute target + matched C3 comparison.
- [ ] Future plan: real-adapter send-disabled gate.
- [ ] Future plan: separate rollout/migration decision.

## Explicitly not done by this plan

- [ ] No production/live send.
- [ ] No real order/payment/cart mutation.
- [ ] No deployment.
- [ ] No C3 removal/migration.
- [ ] No generic provider/agent framework.
- [ ] No durable semantic memory.
- [ ] No semantic router.
- [ ] No third online model role.
- [ ] No verifier tool access.
- [ ] No verifier rewrite.
- [ ] No automatic repair/reverify loop.
- [ ] No generic Vietnamese semantic parser.
- [ ] No failure-specific production regex/template patches.
- [ ] No final promotion claim.

## Implementation completion gate

For each future implementation task:

- [ ] Task acceptance criteria pass.
- [ ] New behavior has RED->GREEN tests.
- [ ] Relevant focused tests/typechecks/build/lint pass.
- [ ] Runtime/provider behavior is actually observed where required.
- [ ] Evidence run is bound to a sealed source SHA from a clean executable/config state.
- [ ] Captured provider requests contain no evaluator-only labels/expectations/rubric fields.
- [ ] No unrelated refactor/dependency drift.
- [ ] Security review covers untrusted model/customer/tool data.
- [ ] Evidence contains no secrets/PII.
- [ ] Project Definition of Done is checked before calling the task complete.
