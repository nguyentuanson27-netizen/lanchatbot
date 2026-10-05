# C3 Single-Agent Candidate — Implementation Plan

**Status:** Plan for review / no runtime implementation in this PR  
**Date:** 2026-10-05  
**Source spec:** `docs/specs/c3-single-agent-commerce-architecture-20261004.md`  
**Merged spec source:** PR385 / `main` merge SHA `432376b05ca8c8e1aff0dea397534f4a6805c618`  
**Primary execution rule:** **Prove the hardest hypothesis first. Stop if protected egress cannot be both safe and meaningfully conversational without rebuilding C3-like semantic machinery.**

## 0. Preconditions and scope

PR385 is merged. Implementation MUST NOT start until:

1. This plan is reviewed/approved.
2. The implementation branch is cut from then-current `main` (refresh; do not assume the planning SHA is still current).
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
T7 Preregister promotion protocol + seal holdout
 |
 v
T8 Paired single-turn + stateful matched promotion evidence
 |
 v
T9 Real-adapter send-disabled pre-opt-in verification
 |
 v
CHECKPOINT B — promotion/migration decision (separate approval)
~~~

Tasks after Checkpoint A are conditional. Do not build them merely because they appear in this plan.

**Evidence phases are intentionally different:**

- **T1–T3 are development/feasibility evidence.** Their corpus is visible to implementers and may be used to refine the candidate. They can decide whether the architecture is worth continuing, but they are not promotion evidence.
- **T7 freezes promotion protocol + sealed holdout before any promotion-candidate result is observed, for both promotion modes: paired single-turn and stateful journeys.**
- **T8 is the first run that may support an architecture-promotion claim.** It runs and reports both promotion modes separately. Development and sealed-holdout results must also remain separate.

## 3. First experiment: what must actually be proven

### 3.1 Hypothesis

The candidate must show more than:

~~~text
model chooses fact ref -> code prints verified fact
~~~

It must show that the same conversational owner can connect dialogue context and verified evidence into a useful customer decision while preserving the durable protected-claim boundary.

### 3.2 Development/feasibility semantic families

Create a compact **development** feasibility corpus with **at least 3 cases from each family below** plus 2–4 simple fact controls. Keep it small enough for line-by-line review.

This corpus is intentionally visible to implementation work. Passing it can justify Checkpoint A GO, but it cannot later be relabeled as sealed promotion evidence.

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

#### C. Cross-turn correction / referent / defer — egress feasibility only

Mandatory dialogue ingredients:

- customer corrects weight, e.g. 48kg -> 58kg;
- customer changes which product is being discussed;
- customer changes component size;
- customer says “chưa chốt”.

For **T1–T3**, use raw accepted dialogue plus a frozen current canonical snapshot / verified evidence that is identical for baseline and candidate. This phase tests whether the conversational owner understands and expresses the corrected situation; it does **not** claim to prove state persistence, trusted-reference resolution or dependent-tool ordering.

Required feasibility outcome:

- final reply follows the latest correction/referent rather than an older contradicted value;
- reply does not reuse stale evidence that the frozen scenario marks superseded;
- reply does not invent a purchase/effect commitment after “chưa chốt”;
- the whole reply remains coherent across the correction and product/size context.

The runtime transition `correction -> accepted effective state -> dependent tool -> reply`, bounded-reference resolution, and persisted-state agreement are proved later in **T5** and exercised end-to-end in **T8** using traces each path actually creates. Fixture answers must not substitute for those runtime invariants.

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
- [ ] Paired feasibility inputs are identical except orchestration. Correction/referent/defer cases use the same frozen accepted dialogue/current snapshot/evidence on both sides and are explicitly labeled **egress feasibility only**; no T1–T3 result claims persisted-state/tool-ordering proof.

**Verification:**

- [ ] Fixture/manifest validator rejects missing/mismatched comparison identity.
- [ ] Manual review confirms no case expectation depends on exact prose except code-owned protected wording.
- [ ] No production/runtime file changed.

**Dependencies:** Plan approval; refresh exact `main` before build.

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

**Description:** Use the actual intended candidate egress surface and the same model/version/effort/generation settings on both candidate and C3. Run the visible **development/feasibility** semantic corpus and review the entire final reply.

This task is the first major architecture gate, but it is **not promotion evidence**. For correction/referent/defer cases it evaluates the reply against frozen accepted dialogue/current evidence only; it does not claim to prove candidate-owned persistence, reference resolution or dependent-tool ordering.

**Acceptance criteria:**

- [ ] Every concern, partial-evidence, correction/referent and conditional-policy case retains a complete per-attempt trace: raw input/history/frozen current state, verified facts, model request/result, assembled final reply, guard result and quality result.
- [ ] Correction/referent/defer feasibility results are labeled as **egress understanding evidence only** and do not assert persisted-state, trusted-ref or dependent-tool correctness.
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

A GO at Checkpoint A means only: **protected egress + conversational ownership are feasible enough to justify implementing the real tool/state/effect path.** It is not a promotion decision and does not prove stateful correctness.

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

### Task 7 — Preregister promotion protocol and seal the holdout

**Description:** Before any run whose result may be used for promotion, freeze the comparison protocol required by spec §13.4 and seal a holdout corpus that implementation work has not inspected or tuned against.

This task produces **no promotion score**. Its output is the immutable protocol/holdout identity used by Task 8.

**Acceptance criteria:**

- [ ] Freeze exact baseline/candidate source identities and matched model/version/effort/generation/judge settings.
- [ ] Separate development corpus from sealed holdout; record holdout identity/hash without exposing case contents to candidate-tuning work.
- [ ] Preregister **paired single-turn promotion mode**: baseline and candidate receive the same customer message, accepted history, canonical pre-turn state, business/source snapshot and freshness inputs; only the intended orchestration differs.
- [ ] Preregister **stateful-journey promotion mode**: both paths start from the same initial state/business world/customer-simulation policy, then each path must consume the history/state/effects it actually produced.
- [ ] Freeze history/truncation policy, rubric, numeric/minimum-improvement threshold, blind/randomized A/B ordering, tie/judge-disagreement handling, repeated-generation/variance policy, retry policy and all-attempt accounting **for each mode**.
- [ ] Define mode-specific pass accounting: quality/safety/completeness and minimum-improvement results are reported separately for paired single-turn and stateful journeys; one mode cannot compensate for failure in the other.
- [ ] Freeze provider/model/request identity requirements plus corpus/rubric provenance.
- [ ] Thresholds/rubric/accounting rules cannot change after Task 8 results are observed.

**Verification:**

- [ ] Manifest/registration validator fails closed when any preregistered field is missing or mismatched.
- [ ] Owner can review the protocol/thresholds without seeing sealed holdout contents.
- [ ] Development and holdout identities are distinct and cannot be silently substituted.

**Dependencies:** Task 6.

**Files likely touched:** 2–4 evaluation registration/manifest files.

**Estimated scope:** S–M.

### Task 8 — Paired single-turn + stateful matched promotion evidence

**Description:** Run both preregistered promotion modes on the sealed holdout using the **complete candidate** after the real tool/state/effect path exists.

Mode 1 keeps the comparison input identical to isolate reply/decision quality on the same situation. Mode 2 allows paths to diverge after the same initial conditions to measure accumulated conversational/state quality. This is the first task in this plan whose results may support an architecture-promotion claim.

#### Mode A — Paired single-turn

For every paired holdout case, baseline and candidate receive the same:

- customer message;
- accepted history;
- canonical pre-turn state;
- business/source snapshot and freshness;
- matched model/version/effort/generation/judge settings.

Only the intended orchestration may differ.

**Acceptance criteria:**

- [ ] Run paired single-turn cases on the **complete candidate**, not the earlier T1–T3 egress-only shape.
- [ ] Report quality, hard safety, explicit-need completeness and registered minimum-improvement result for paired single-turn separately.
- [ ] Retain exact paired final customer-visible replies plus the common frozen input/pre-state/business truth for owner review.
- [ ] No candidate-only richer context/business data is injected into paired cases.

#### Mode B — Stateful journeys

**Acceptance criteria:**

- [ ] Journeys include corrections, product switches, partial lookup failure, defer/stop, policy, cart edit and effect recovery.
- [ ] Correction/ref/state cases prove the real trace `customer correction -> accepted effective state -> bounded trusted ref/tool input -> dependent tool result -> persisted state/final reply`; no fixture-injected “correct state” substitutes for the transition.
- [ ] Each path consumes its own resulting history/state/effects after the common initial conditions.
- [ ] Report quality, hard safety, explicit-need completeness and registered minimum-improvement result for stateful journeys separately.

#### Shared promotion requirements

- [ ] Raw customer needs are mapped to customer-visible outcomes; extracted intermediate obligations are not used as the completeness denominator.
- [ ] Structural audit identifies every semantic representation/validator crossed by representative C3 vs candidate turns and shows which old semantic responsibilities were actually collapsed/replaced.
- [ ] Development, paired-single-turn holdout and stateful-journey holdout results are reported as distinct evidence sets.
- [ ] A strong result in one promotion mode cannot offset a failed registered gate in the other mode.

**Verification:**

- [ ] Task 7 preregistration identity is validated before the first holdout result in either mode is scored.
- [ ] Matched model/config/judge rules from the spec are enforced by manifest validation.
- [ ] Whole final replies are retained for both modes; resulting state/tool/effect traces are additionally retained for journeys.
- [ ] All accepts, rejects, timeouts, fallbacks and handoffs remain in the registered denominator for their mode.
- [ ] Produce separate paired-single-turn and stateful-journey score/gate summaries plus one combined readiness summary that cannot hide a failed mode.
- [ ] No claim of architecture superiority from an unmatched/package-level run.

**Dependencies:** Task 7.

**Files likely touched:** 3–5 evaluation/journey files.

**Estimated scope:** M.

### Task 9 — Real-adapter send-disabled pre-opt-in gate

**Description:** Exercise production persistence/business adapters on isolated/ephemeral infrastructure with external customer send disabled.

**Acceptance criteria:**

- [ ] Prove stale DB revision, duplicate source message, operationId idempotency, ambiguous reconciliation and crash-after-commit.
- [ ] Accepted-history/Outbox recovery cannot duplicate the business effect.
- [ ] No production/live customer message, real order/payment mutation or deployment occurs.

**Verification:**

- [ ] Focused real-adapter integration tests pass.
- [ ] Relevant package typecheck/build/lint pass.
- [ ] `pnpm check` passes before any opt-in proposal.

**Dependencies:** Task 8.

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

### Checkpoint B after Tasks 8–9

~~~bash
pnpm --filter @lana/worker test
pnpm check
~~~

Checkpoint B requires **both registered promotion modes** to pass independently:

- paired single-turn meets its hard safety/completeness gates and registered minimum-improvement threshold;
- stateful journeys meet their hard safety/state/effect/completeness gates and registered minimum-improvement threshold.

Do not average or aggregate a failed mode into a pass.

Then review the two sealed-holdout evidence sets plus the structural audit against Definition of Done and the PR385 promotion gates. Development-corpus results are supporting evidence only. Production opt-in/migration remains a separate owner-approved plan.

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
- Promotion protocol/holdout design for Task 7 may be prepared after interfaces from Tasks 4–6 are understood, but it must be **sealed before any Task 8 promotion result is observed**.
- Task 8 is sequential after Task 7 preregistration.
- Task 9 is sequential after the stateful promotion path exists.

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

- PR385 is merged; plan is approved; implementation base SHA is refreshed/recorded immediately before build;
- every task has acceptance + verification + dependency;
- first feasibility experiment has owner-reviewable whole-reply cases from all four semantic families and explicitly does **not** overclaim persisted-state/tool-ordering evidence;
- Checkpoint A is explicitly a development feasibility stop/go gate;
- promotion protocol + sealed holdout are preregistered before Task 8 for **both paired single-turn and stateful-journey modes**;
- both promotion modes must pass independently at Checkpoint B;
- development and promotion evidence cannot be conflated;
- no task is larger than one focused session / ~5 files without further split;
- production opt-in/migration remains outside this plan until candidate evidence exists.
