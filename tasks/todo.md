# C3 Single-Agent Candidate — TODO

**Source:** `tasks/plan.md`  
**Spec:** `docs/specs/c3-single-agent-commerce-architecture-20261004.md`  
**Status:** PLAN ONLY — PR385 is merged; implementation waits for plan approval.

## Precondition

- [x] PR385 merged as `432376b05ca8c8e1aff0dea397534f4a6805c618`.
- [ ] After plan approval, refresh `main` and record that exact SHA as `implementationBaseSha`.
- [ ] Freeze same-substrate C3 `comparisonBaselineSha`.
- [ ] Confirm matched model/version/effort/generation/judge settings.

## First feasibility experiment — mandatory before full candidate

- [ ] **T1 — Freeze bases, corpus and protocol**
  - [ ] At least 3 concern/decision-support cases.
  - [ ] At least 3 multi-part/partial-evidence cases.
  - [ ] At least 3 correction/referent/defer cases/journey steps.
  - [ ] At least 3 conditional-policy cases.
  - [ ] Add only 2–4 simple price/stock/direct-fact positive controls.
  - [ ] Each case defines raw dialogue/state, verified truth, required outcomes and forbidden claims/actions.
  - [ ] Paired manifest rejects model/config/judge/substrate mismatch.

- [ ] **T2 — Minimal protected-egress surface**
  - [ ] RED: undeclared protected claim.
  - [ ] RED: wrong subject.
  - [ ] RED: negation inversion.
  - [ ] RED: dropped material policy condition.
  - [ ] RED: stronger implied policy/benefit in surrounding prose.
  - [ ] RED: stale evidence.
  - [ ] RED: effect-success wording without receipt.
  - [ ] GREEN without generic semantic parser, case switches or template proliferation.
  - [ ] Normal compound replies remain coherent/natural.

- [ ] **T3 — Provider-backed whole-reply feasibility comparison**
  - [ ] Same model/version/effort/generation config for C3 and candidate.
  - [ ] Evaluate the exact final customer-visible reply, not only factual slots.
  - [ ] Score understanding, completeness, context use, partial-answer quality, usefulness, next step, coherence, repetition/contradiction, naturalness and factual/action safety.
  - [ ] Retain all attempts including reject/timeout/fallback/handoff.
  - [ ] Owner reviews paired final replies directly.
  - [ ] Produce explicit GO/STOP evidence note.

## CHECKPOINT A

- [ ] Owner GO decision recorded.
- [ ] Hard safety parity proven.
- [ ] No silent customer-need loss in locked feasibility corpus.
- [ ] Semantic cases show clear whole-reply quality improvement, not only correct fact assembly.
- [ ] No broad semantic parser/template/regex growth.
- [ ] Still one conversational semantic owner.

**If any item above fails: STOP. Do not continue T4–T8 without spec amendment + owner decision.**

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

- [ ] **T7 — Stateful matched journeys + structural audit**
  - [ ] Each path consumes its own resulting state/history.
  - [ ] Raw customer need -> final customer outcome completeness accounting.
  - [ ] Matched comparison manifest enforced.
  - [ ] Trace semantic boundaries for representative baseline/candidate turns.
  - [ ] Identify concrete C3 responsibilities collapsed/replaced.

- [ ] **T8 — Real-adapter send-disabled gate**
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
- [ ] No live traffic/deploy/C3 removal performed by this plan.
