# C3 Single-Agent Candidate — TODO

**Source:** `tasks/plan.md`  
**Spec:** `docs/specs/c3-single-agent-commerce-architecture-20261004.md`  
**Status:** Owner approved T1–T3 only; implementation started on `feat/c3-single-agent-checkpoint-a-20261005`. Evidence: `apps/worker/evals/single-agent-feasibility/`. Checkpoint A owner GO remains pending.

## Precondition

- [x] PR385 merged as `432376b05ca8c8e1aff0dea397534f4a6805c618`.
- [x] After plan approval, refresh `main` and record that exact SHA as `implementationBaseSha`: `c4bd59857a560689ce0b10758a4927f6401b0c27`.
- [x] Freeze same-substrate C3 `comparisonBaselineSha` for regression/migration comparison: same exact main SHA; no PR377 source imported into either lane.
- [ ] Confirm matched model/version/effort/generation/judge settings for comparative claims.
- [x] Confirm **goal-first, baseline-second** evaluation: absolute product/safety gates define candidate pass/fail; C3 deltas are reported separately.

## First feasibility experiment — mandatory before full candidate

- [x] **T1 — Freeze bases, corpus and intended protocol** (static evidence only; provider-observed matching remains unconfirmed).
  - [x] At least 3 concern/decision-support cases (3).
  - [x] At least 3 multi-part/partial-evidence cases (3).
  - [x] At least 3 correction/referent/defer **egress-feasibility** cases using raw accepted dialogue + frozen current state/evidence (4).
  - [x] At least 3 conditional-policy cases (3).
  - [x] Add only 2–4 simple price/stock/direct-fact positive controls (2).
  - [x] Each case defines raw dialogue/state, verified truth, required outcomes and forbidden claims/actions.
  - [x] Correction/referent/defer feasibility cases explicitly do **not** claim persisted-state, trusted-ref or dependent-tool proof.
  - [x] Paired manifest rejects model/config/judge/substrate mismatch (25 static validator tests); unobserved comparative claim rejected.

- [ ] **T2 — Minimal protected-egress surface**
  - [x] RED: undeclared protected claim (probe rejects).
  - [x] RED: wrong subject (strict safety assertion FAIL; prose overrides subject).
  - [x] RED: negation inversion (strict safety assertion FAIL).
  - [x] RED: dropped material policy condition (strict safety assertion FAIL).
  - [x] RED: stronger implied policy/benefit in surrounding prose (strict safety assertion FAIL).
  - [x] RED: stale evidence (probe rejects).
  - [x] RED: effect-success wording without receipt (strict safety assertion FAIL).
  - [ ] GREEN without generic semantic parser, case switches or template proliferation.
  - [ ] Normal compound replies remain coherent/natural.

  **T2 status: FAIL / STOP for the tested surface.** Twelve mechanical seam tests pass, but hard safety is 2 PASS / 5 FAIL. Exact strict RED command: `node --test apps/worker/evals/single-agent-feasibility/egress-safety.red.mjs`. All seven attempts retained in `egress-attempts.json`; no guard weakened, no semantic parser/production regex added. Mechanics PASS is not feasibility PASS.

- [ ] **T3 — Provider-backed whole-reply feasibility comparison**
  - [ ] Same model/version/effort/generation config for C3 and candidate.
  - [ ] Evaluate the exact final customer-visible reply, not only factual slots.
  - [ ] Score understanding, completeness, context use, partial-answer quality, usefulness, next step, coherence, repetition/contradiction, naturalness and factual/action safety.
  - [ ] Retain all attempts including reject/timeout/fallback/handoff.
  - [ ] Owner reviews paired final replies directly.
  - [ ] Produce explicit GO/STOP evidence note.
  - [ ] Label T1–T3 results as **development/feasibility evidence**, not promotion evidence.

  **T3 = BLOCKED / not run.** T2 hard safety prerequisite failed. Local Vertex project/service-account credential/token environment is unavailable; no provider-observed identity or paired whole-reply scores were fabricated. Evidence/recommendation: `apps/worker/evals/single-agent-feasibility/CHECKPOINT_A.md` (STOP). No T4–T9 work or owner GO.

## CHECKPOINT A

- [ ] Owner GO decision recorded.
- [ ] Hard safety parity proven.
- [ ] No silent customer-need loss in locked feasibility corpus.
- [ ] Semantic cases meet the development whole-reply quality bar for understanding, completeness, usefulness, coherence, naturalness and safety, not only correct fact assembly. Checkpoint A does not require preregistered improvement versus C3; that replacement criterion belongs to Gate B / T7–T8.
- [ ] No broad semantic parser/template/regex growth.
- [ ] Still one conversational semantic owner.

**If any item above fails: STOP. Do not continue T4–T9 without spec amendment + owner decision.**

## Conditional implementation after GO

- [ ] **T4 — Minimal read-only single-agent loop**
  - [ ] One-call no-tool fast path.
  - [ ] Independent read-only tools share a round.
  - [ ] Dependent tool round only when new world data requires it.
  - [ ] Finite loop/fallback.
  - [ ] No new model roles/framework dependency.

- [ ] **T5 — Bounded refs + existing-state updates**
  - [ ] Runtime-supplied/allowlisted subject refs only.
  - [ ] SET/CLEAR/REPLACE only on existing writable customer-state owners.
  - [ ] 48kg -> 58kg effective-state-before-size lookup.
  - [ ] Product/size correction + “chưa chốt” remains consistent.
  - [ ] Conflict/reject cannot reuse stale dependent result.

- [ ] **T6 — Mutation + recovery**
  - [ ] Server-owned protected execution scope.
  - [ ] operationId/idempotency.
  - [ ] success receipt/readback.
  - [ ] ambiguous reconciliation before retry.
  - [ ] post-effect model/guard failure cannot replay effect.

- [ ] **T7 — Preregister promotion protocol + seal holdout**
  - [ ] Freeze exact baseline/candidate source + matched model/version/effort/generation/judge settings.
  - [ ] Separate development corpus from sealed holdout; record holdout identity/hash without exposing contents to candidate tuning.
  - [ ] Preregister **paired single-turn** mode with same message/history/pre-state/business snapshot/freshness for baseline and candidate.
  - [ ] Preregister **stateful journey** mode with same initial state/business world/customer policy, then each path uses its own resulting state/history/effects.
  - [ ] Freeze history/truncation, rubric and numeric **absolute product-quality thresholds** for each mode.
  - [ ] Freeze blind/randomized A/B ordering and tie/judge-disagreement handling.
  - [ ] Freeze repeated-generation/variance and retry/all-attempt accounting.
  - [ ] Freeze **comparative replacement criteria** for paired single-turn and stateful journeys: preregistered clear quality-improvement rule over C3 + any non-compensable quality dimensions.
  - [ ] Freeze hard comparative non-regression rules for safety/state/effect behavior.
  - [ ] Freeze structural evidence required to prove C3 semantic responsibilities were actually removed/collapsed.
  - [ ] Build sealed holdout from target product capabilities, not known C3 failures.
  - [ ] Freeze provider/model/request and corpus/rubric provenance.
  - [ ] One promotion mode cannot compensate for failure in the other.
  - [ ] Validator fails closed for missing/mismatched preregistration fields.

- [ ] **T8 — Paired single-turn + stateful matched promotion evidence**
  - [ ] Validate T7 preregistration before first holdout result in either mode is scored.
  - [ ] **Paired single-turn:** run complete candidate with exactly same message, accepted history, canonical pre-turn state and business snapshot as baseline.
  - [ ] **Paired single-turn:** report candidate absolute quality/safety/completeness/product-quality gate and retain exact paired final replies + common input.
  - [ ] **Paired single-turn:** report matched C3 delta separately and evaluate the preregistered paired-turn replacement criterion; it is not the correctness threshold but is required for replacement readiness.
  - [ ] **Stateful journeys:** each path consumes its own resulting state/history/effects after common initial conditions.
  - [ ] **Stateful journeys:** real correction trace proves correction -> accepted effective state -> bounded trusted ref/tool input -> dependent result -> persisted state/final reply.
  - [ ] **Stateful journeys:** report candidate absolute quality/safety/state/effect/completeness/product-quality gate separately.
  - [ ] **Stateful journeys:** report matched C3 delta separately and evaluate the preregistered journey replacement criterion; it is not the correctness threshold but is required for replacement readiness.
  - [ ] Raw customer need -> final customer outcome completeness accounting in both modes.
  - [ ] Matched comparison manifest enforced.
  - [ ] Retain whole replies for both modes; retain resulting state/tool/effect traces for journeys.
  - [ ] Trace semantic boundaries for representative baseline/candidate turns.
  - [ ] Identify concrete C3 responsibilities collapsed/replaced.
  - [ ] Report development, paired-single-turn holdout and journey-holdout results separately.
  - [ ] Both promotion modes must pass their **absolute** gates independently; no averaged/aggregate pass hides a failed mode.
  - [ ] Better-than-C3 results cannot rescue an absolute failure.
  - [ ] Emit `Candidate meets target` verdict from absolute gates only.
  - [ ] Emit `Candidate qualifies to replace C3` verdict only after target PASS + clear preregistered improvement in both comparison modes + no safety/state/effect regression + structural simplification.
  - [ ] Neutral matched quality may yield target PASS but must yield replacement-ready FAIL.
  - [ ] Any hard/non-compensable comparative regression defined in T7 fails replacement readiness.

- [ ] **T9 — Real-adapter send-disabled gate**
  - [ ] Ephemeral/test persistence infrastructure.
  - [ ] External customer send disabled.
  - [ ] Stale DB revision.
  - [ ] Duplicate source message.
  - [ ] crash/timeout after committed mutation.
  - [ ] ambiguous reconciliation.
  - [ ] idempotent retry.
  - [ ] accepted-history/Outbox recovery without duplicate effect.

## Final verification before any opt-in proposal

- [ ] Focused tests green after each task.
- [ ] Relevant package typechecks/builds green.
- [ ] `pnpm --filter @lana/worker test` green.
- [ ] `pnpm check` green.
- [ ] Final review: correctness -> security -> architecture -> simplicity -> performance.
- [ ] Project Definition of Done checked.
- [ ] Promotion claim uses only preregistered sealed-holdout evidence; development corpus is not relabeled as holdout.
- [ ] Absolute product/safety gates define `Candidate meets target`; C3-relative scoring does not define correctness.
- [ ] Paired single-turn and stateful-journey absolute gates both pass independently; neither mode can compensate for the other.
- [ ] Replacement readiness additionally passes preregistered quality-improvement criteria vs C3 in both modes, hard safety/state/effect non-regression, and structural simplification.
- [ ] Neutral matched quality is recorded as target-met but not replacement-ready; no migration proceeds from that result.
- [ ] No live traffic/deploy/C3 removal performed by this plan.
