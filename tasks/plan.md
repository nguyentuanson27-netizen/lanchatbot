# C3 Single-Agent Candidate — Implementation Plan

**Status:** Draft / plan-only / no runtime implementation in this PR  
**Date:** 2026-10-05  
**Source spec:** `docs/specs/c3-single-agent-commerce-architecture-20261004.md`  
**Spec source head used for planning:** `7228044a8f5be0738c95f310f33295fede4cb245` (PR385)  
**Primary execution rule:** **Prove the hardest hypothesis first. Stop if protected egress cannot be both safe and meaningfully conversational without rebuilding C3-like semantic machinery.**

## 0. Preconditions and scope

Implementation MUST NOT start until:

1. PR385 is merged.
2. The implementation branch is cut from the resulting `main`.
3. `implementationBaseSha` is recorded.
4. The comparison C3 lane is selected from the same accepted business/safety substrate and `comparisonBaselineSha` is recorded.
5. If PR377 remains unmerged, its DEV70 evidence may inform fixtures/failure hypotheses, but its source must not be silently mixed into only one side of the matched comparison.

This plan does not approve production traffic, model-pin changes, new durable semantic state, C3 removal, or live effects.

## 1. Objective

Implement the smallest experiment that can answer this question:

> Can one conversational model preserve customer meaning and produce a better whole reply while code continues to own protected facts, identity, state authority, permissions and effects?

The first experiment is intentionally **not** a price/stock demo. Simple factual turns are positive controls only. The decisive evidence must require the model to connect customer context, partial evidence, correction and conditional policy into one coherent reply.

## 2. Dependency graph

~~~text
T1 Freeze base + feasibility corpus + matched protocol
 |
 v
T2 Deterministic protected-egress surface + adversarial RED/GREEN
 |
 v
T3 Provider-backed whole-reply feasibility comparison
 |
 +---- FAIL safety / naturalness / complexity ----> STOP + record evidence
 |
 v
CHECKPOINT A — owner GO/STOP
 |
 v
T4 Minimal read-only single-agent tool loop
 |
 v
T5 Bounded refs + existing-state updates + effective-state ordering
 |
 v
T6 Mutation idempotency + post-effect recovery
 |
 v
T7 Stateful matched journeys + structural-complexity audit
 |
 v
T8 Real-adapter send-disabled pre-opt-in verification
 |
 v
CHECKPOINT B — promotion/migration decision (separate approval)
~~~

Tasks after Checkpoint A are conditional. Do not build them merely because they appear in this plan.

## 3. First experiment: what must actually be proven

### 3.1 Hypothesis

The candidate must show more than:

~~~text
model chooses fact ref -> code prints verified fact
~~~

It must show that the same conversational owner can connect dialogue context and verified evidence into a useful customer decision while preserving the durable protected-claim boundary.

### 3.2 Locked semantic families

Create a compact feasibility corpus with **at least 3 cases from each family below** plus 2–4 simple fact controls. Keep it small enough for line-by-line review.

#### A. Concern / decision support

Mandatory seed:

> “Chị thích mẫu này nhưng sợ mua về ít mặc.”

Evidence/state should be intentionally bounded so the bot cannot invent a product benefit.

Required outcome:

- recognize that the blocker is expected usage / decision confidence, not a missing shop fact;
- use known context if present;
- ask at most one genuinely decision-changing clarification when needed;
- avoid inventing versatility, durability, comfort, quality or occasion coverage;
- make the reply move the decision forward rather than only acknowledge the concern.

#### B. Multi-part request with partial evidence

Mandatory seed:

> “Giá bao nhiêu, vải có nhăn không, mặc đi làm ổn không?”

Design the fixture so only part of the requested business evidence is available.

Required outcome:

- answer every supported part;
- explicitly bound what is unknown instead of converting unknown into a negative fact;
- do not silently drop the unsupported part;
- give at most one useful next step/clarification tied to the customer's decision;
- preserve one coherent reply rather than a bag of independent fact lines.

#### C. Cross-turn correction / referent / defer

Mandatory journey ingredients:

- customer corrects weight, e.g. 48kg -> 58kg;
- customer changes which product is being discussed;
- customer changes component size;
- customer says “chưa chốt”.

Required outcome:

- accepted correction becomes the effective state before dependent size/fit lookup;
- stale pre-correction tool results are not reused as current;
- bounded subject reference resolves to the correct trusted identity;
- the final reply and persisted state agree about product/size/commitment;
- “chưa chốt” prevents purchase/effect progression.

#### D. Conditional policy

Use a verified conditional policy such as an exchange/try-on rule with a material condition.

Required outcome:

- code-owned protected policy text retains the condition;
- surrounding conversational prose must not weaken, reverse or over-generalize it;
- advice must remain compatible with the verified condition;
- whole reply remains natural enough to be useful.

#### Positive controls

Include a few simple price/stock/direct-fact turns only to prove the candidate does not regress trivial cases. **They cannot be used as evidence that the architecture hypothesis succeeded.**

### 3.3 Whole-reply evaluation

Every case is scored on the **entire customer-visible reply**, not isolated factual blocks.

Review/judge input must include the final assembled reply exactly as the customer would see it.

Assess at minimum:

- understanding of the customer's actual decision/problem;
- explicit-need completeness;
- cross-turn context/correction use;
- factual/action safety;
- partial-answer behavior;
- usefulness / decision support;
- next-step appropriateness;
- coherence across free text + protected fact surfaces;
- repetition / contradiction;
- naturalness.

A friendly preface plus correct factual blocks is not a quality pass if the full reply is disjointed, repetitive, incomplete or decision-useless.

### 3.4 First-experiment stop conditions

STOP before building the full candidate if any of these are true:

- protected claim safety requires broad new semantic parsing of arbitrary Vietnamese;
- each unsafe phrasing class creates another production regex/template patch;
- safe output becomes materially template-like and loses the desired conversational quality;
- the candidate mainly selects references while code composes the substantive answer;
- whole-reply quality shows no clear advantage over matched C3 on the semantic families above;
- safety regresses even if average quality improves;
- the experiment requires a second model role whose only purpose is semantic handoff.

Do not “fix” a failed feasibility experiment by adding a new semantic subsystem without a spec amendment and owner decision.

## 4. Implementation tasks

### Task 1 — Freeze exact bases, corpus and comparison protocol

**Description:** Establish reproducible experiment identity before changing runtime behavior. Inventory the existing C3 candidate/evaluation surfaces and choose the smallest reusable path for the egress experiment.

**Acceptance criteria:**

- [ ] Record exact `implementationBaseSha`, `comparisonBaselineSha`, shared business/safety substrate, model/version/effort/generation config and judge/rubric identity.
- [ ] Lock the feasibility corpus covering all four semantic families plus simple positive controls; every case defines raw dialogue/state, verified business truth, required outcomes and forbidden claims/actions.
- [ ] Paired single-turn inputs are identical except orchestration; stateful journeys share initial conditions/customer policy and then retain each path's own resulting history/state.

**Verification:**

- [ ] Fixture/manifest validator rejects missing/mismatched comparison identity.
- [ ] Manual review confirms no case expectation depends on exact prose except code-owned protected wording.
- [ ] No production/runtime file changed.

**Dependencies:** None after PR385 merge.

**Files likely touched:** 2–4 files, preferably existing Track C evaluation/manifest locations plus focused validation.

**Estimated scope:** M.

### Task 2 — Prove the minimal protected-egress surface deterministically

**Description:** Reuse existing `ProtectedClaimV1`, verified evidence/receipt surfaces and current guard/reply assembly where possible. Add only the minimum candidate output seam needed to test conversational free text around code-verifiable protected content.

Start RED with unsafe outputs before writing the new seam.

**Acceptance criteria:**

- [ ] Deterministic tests reject: undeclared protected claim, wrong subject, negation inversion, dropped material condition, stronger implied conditional policy, stale evidence and effect-success wording without receipt.
- [ ] Normal compound replies can contain customer-context/decision-support prose without requiring a new generic semantic parser or per-case phrase switch.
- [ ] The implementation reuses current protected-claim/evidence types or documents why one minimal new boundary is unavoidable; no ClaimGraph/general NLP validation subsystem.

**Verification:**

~~~bash
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker exec vitest run <focused-egress-tests>
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/worker typecheck
~~~

Add exact focused test path once Task 1 inventory chooses the owning module.

**Dependencies:** Task 1.

**Files likely touched:** 3–5 files across the owning egress module/tests and existing business-tools boundary.

**Estimated scope:** M.

### Task 3 — Run the first provider-backed whole-reply feasibility comparison

**Description:** Use the actual intended candidate egress surface and the same model/version/effort/generation settings on both candidate and C3. Run the locked semantic corpus and review the entire final reply.

This task is the first major architecture gate.

**Acceptance criteria:**

- [ ] Every concern, partial-evidence, correction/referent and conditional-policy case retains a complete per-attempt trace: raw input/history/state, verified facts, model request/result, assembled final reply, guard result and quality result.
- [ ] Whole-reply quality evaluation is blind/paired where supported; all accepts, rejects, fallbacks and timeouts remain in the denominator.
- [ ] Owner review can inspect paired final replies directly; simple fact controls are reported separately and cannot dominate the conclusion.

**Verification:**

- [ ] Deterministic corpus/harness validators pass.
- [ ] Real-model run records exact provider/model/request identity; if credentials/model environment are unavailable, mark this task BLOCKED rather than simulate results.
- [ ] Produce a concise GO/STOP evidence note covering safety, whole-reply quality and structural complexity.

**Dependencies:** Task 2.

**Files likely touched:** 2–5 evaluation/harness/evidence files; no live runtime wiring.

**Estimated scope:** M.

## CHECKPOINT A — GO / STOP

Proceed only with explicit owner approval after reviewing Task 3 evidence.

**GO requires all of:**

- hard safety parity;
- no silent loss of explicit customer needs in the locked feasibility corpus;
- whole replies are clearly more useful/coherent on semantic cases, not merely correct factual blocks;
- protected egress did not require broad semantic parsing/template proliferation;
- the candidate still has one conversational semantic owner.

If evidence is mixed or neutral, prefer STOP/remove experiment over preserving neutral complexity.

---

### Task 4 — Minimal read-only single-agent tool loop

**Description:** After Checkpoint A only, build the smallest side-effect-free loop that gives one conversational owner relevant dialogue/current state, lets it request existing read-only product/search/policy capabilities, returns verified results to the same role, and assembles one final reply.

**Acceptance criteria:**

- [ ] One-call fast path exists when all needed current facts are already present.
- [ ] Independent read-only tools may execute in one round; extra model calls occur only for new dependent world information.
- [ ] No Producer/Strategist/Responder replacement roles, new memory service or generic agent framework dependency.

**Verification:**

- [ ] Focused worker tests cover no-tool, one-round parallel tools, dependent second round and loop cap.
- [ ] Existing protected-claim tests remain green.
- [ ] Worker typecheck/build pass.

**Dependencies:** Checkpoint A.

**Files likely touched:** 3–5 worker/runtime files.

**Estimated scope:** M.

### Task 5 — Bounded references and existing-state updates

**Description:** Add bounded runtime-supplied subject references and same-agent SET/CLEAR/REPLACE proposals only for existing writable customer-state owners. Close effective-state ordering before dependent tools.

**Acceptance criteria:**

- [ ] Model cannot supply arbitrary tenant/customer/cart/order identity; code resolves only allowlisted in-scope refs.
- [ ] 48kg -> 58kg correction is accepted/resolved before size/fit lookup consumes state; conflict/reject path cannot use stale 48kg result as current.
- [ ] Product change + component size change + “chưa chốt” keeps state, tool result and final reply consistent without creating purchase commitment.

**Verification:**

- [ ] Focused tests cover valid/stale/ambiguous refs and state revision conflict.
- [ ] Stateful integration test proves correction -> effective state -> dependent tool -> reply.
- [ ] No new durable semantic store/model extractor.

**Dependencies:** Task 4.

**Files likely touched:** 3–5 files using existing profile/session/binding owners.

**Estimated scope:** M.

### Task 6 — Mutation idempotency and post-effect recovery

**Description:** Introduce the first bounded mutating tool only after read-only/state behavior is proven. Reuse commerce-kernel/CAS/revision behavior, trusted execution scope, operation identity and receipt/readback.

**Acceptance criteria:**

- [ ] Model-visible arguments exclude protected execution identity; server injects scope/revision/operationId.
- [ ] SUCCESS requires receipt/readback before the final reply can claim the effect.
- [ ] Timeout/guard/model failure after commit resumes from committed state/receipt and cannot replay the effect from pre-turn state; AMBIGUOUS reconciles before retry/fallback.

**Verification:**

- [ ] Focused tests cover stale revision, duplicate source, ambiguous commit, idempotent retry and crash-after-commit.
- [ ] Existing commerce-kernel protected-transition tests remain green.
- [ ] No live customer send.

**Dependencies:** Task 5.

**Files likely touched:** 3–5 commerce/worker integration files.

**Estimated scope:** M.

### Task 7 — Stateful matched journeys and structural audit

**Description:** Expand from the feasibility corpus to matched stateful journeys where each architecture continues with the history/state/effects it produced. Measure quality and architecture, not just isolated turns.

**Acceptance criteria:**

- [ ] Journeys include corrections, product switches, partial lookup failure, defer/stop, policy, cart edit and effect recovery.
- [ ] Raw customer needs are mapped to customer-visible outcomes; extracted intermediate obligations are not used as the completeness denominator.
- [ ] Structural audit identifies every semantic representation/validator crossed by representative C3 vs candidate turns and shows which old semantic responsibilities were actually collapsed/replaced.

**Verification:**

- [ ] Matched model/config/judge rules from the spec are enforced by manifest validation.
- [ ] Whole final replies and resulting state are retained for owner review.
- [ ] No claim of architecture superiority from an unmatched/package-level run.

**Dependencies:** Task 6.

**Files likely touched:** 3–5 evaluation/journey files.

**Estimated scope:** M.

### Task 8 — Real-adapter send-disabled pre-opt-in gate

**Description:** Exercise production persistence/business adapters on isolated/ephemeral infrastructure with external customer send disabled.

**Acceptance criteria:**

- [ ] Prove stale DB revision, duplicate source message, operationId idempotency, ambiguous reconciliation and crash-after-commit.
- [ ] Accepted-history/Outbox recovery cannot duplicate the business effect.
- [ ] No production/live customer message, real order/payment mutation or deployment occurs.

**Verification:**

- [ ] Focused real-adapter integration tests pass.
- [ ] Relevant package typecheck/build/lint pass.
- [ ] `pnpm check` passes before any opt-in proposal.

**Dependencies:** Task 7.

**Files likely touched:** 3–5 integration/evaluation files.

**Estimated scope:** M.

## 5. Verification checkpoints

### Checkpoint after Tasks 1–2

- deterministic egress/red-team tests green;
- experiment identities/corpus frozen;
- no runtime behavior change.

### Checkpoint A after Task 3

Human GO/STOP decision. Do not continue automatically.

### Checkpoint after Tasks 4–6

Run focused worker/business-tools/chat-runtime/commerce-kernel tests, then:

~~~bash
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/chat-runtime typecheck
pnpm --filter @lana/commerce-kernel typecheck
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
~~~

### Checkpoint B after Tasks 7–8

~~~bash
pnpm --filter @lana/worker test
pnpm check
~~~

Then review against Definition of Done and the PR385 promotion/structural gates. Production opt-in/migration remains a separate owner-approved plan.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| First experiment passes only trivial fact assembly | Semantic corpus is mandatory; simple price/stock are controls only |
| Protected free prose weakens policy/claim meaning | Adversarial whole-reply tests + feasibility STOP rule |
| Judge rewards fluent but incomplete reply | Score whole final reply + explicit required/forbidden outcomes + owner paired review |
| Candidate gets stronger model/config than baseline | Matched manifest is required; otherwise package-level result only |
| State correction races dependent tool | Effective-state-before-dependent-tool invariant |
| Tool layer becomes semantic pipeline | Domain tools return truth/action results only; structural audit blocks intent classifiers |
| New schemas accumulate | Reuse existing claims/state/bindings; every new semantic boundary must retire/replace responsibility |
| Side effect commits but reply fails | operationId + receipt + post-effect recovery; no pre-state replay |
| Experiment becomes permanent second architecture | explicit GO/STOP checkpoints and removal on neutral/failed evidence |

## 7. Parallelization

Before Checkpoint A, keep work mostly sequential because the output surface and corpus define the experiment.

After Checkpoint A:

- Task 4 must precede Task 5.
- Task 5 must precede Task 6.
- Some evaluation fixture preparation for Task 7 may proceed in parallel only after interfaces from Tasks 4–5 are stable.
- Task 8 is sequential after mutation/recovery behavior exists.

Avoid parallel agents making independent semantic schemas for the same concept.

## 8. Explicit non-goals

Do not add in this implementation plan:

- a replacement orchestration framework;
- n8n runtime dependency;
- another semantic model role;
- generic Vietnamese claim parser;
- universal state graph;
- new durable memory service;
- online model reviewer;
- benchmark-case-specific production branches;
- migration/deletion of C3 before evidence;
- live traffic or deployment.

## 9. Plan Definition of Done

This plan is ready for implementation only when:

- PR385 is merged and implementation base SHA is recorded;
- every task has acceptance + verification + dependency;
- first feasibility experiment has owner-reviewable whole-reply cases from all four semantic families;
- Checkpoint A is explicitly a stop/go gate;
- no task is larger than one focused session / ~5 files without further split;
- production opt-in/migration remains outside this plan until candidate evidence exists.
