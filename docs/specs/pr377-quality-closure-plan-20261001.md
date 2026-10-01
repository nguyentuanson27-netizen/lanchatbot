# PR377 quality-closure plan — prompt ownership, semantic guard, runtime proof and DEV70 R2

Status: docs-only closure amendment for PR377.  
Planning baseline: PR377 head `349a2d68dfe0d138ef5c854463939febd91b6bd7`.  
This document does **not** create P13 or a second roadmap. It narrows the remaining work inside the existing P00–P12 plan and records the execution order after the 2026-10-01 DEV70/prompt reviews.

## 1. Objective

Close the remaining PR377 quality gaps without replacing the architecture that already works.

The target remains:

- Producer interprets the latest customer delta and source-bound customer context.
- Strategist decides the current decision, relevant evidence and at most one justified next input/action.
- Responder realizes the already-compiled task into natural Vietnamese Messenger wording.
- Code owns commercial facts, numeric derivation, binding, permissions, cart/checkout state, effects and receipts.
- Model output remains untrusted until deterministic validation passes.

The closure work must improve all four of these together:

1. the system answers the **actual customer question**;
2. it preserves every requested part of compound questions;
3. the guard blocks unauthorized claims without blocking harmless references/uncertainty;
4. the final reply helps the customer decide without forcing a funnel or inventing a capability.

Exact-head CI on `349a2d68` is green. The remaining blockers are semantic/quality acceptance and evaluation evidence, not basic CI wiring.

## 2. Non-goals

This plan must not:

- add a new model router, online reviewer, memory service or orchestration framework;
- expand the public six-field Strategist output only to make prompt wording easier;
- replace source authority with model self-annotations;
- add regex exceptions case-by-case to make DEV70 green;
- make conversion/revenue claims from synthetic evaluation;
- merge, deploy, enable customer traffic, change authority/allowlists or write live data;
- tune HOLDOUT or change the frozen rubric after reading candidate scores;
- silently treat PR379 as part of PR377 ancestry.

The existing P00–P12 plan remains the authority. This document is a closure amendment for the still-open acceptance items.

## 3. Current verified state to preserve

PR377 already contains useful source work that should not be rewritten without a failing regression:

- source-bound customer-input bridge and current-cart readback;
- independent purchase intent plus policy question;
- variant correction plus purchase, including preserving untouched size/color;
- separation of product-question evidence from cart mutation authority;
- recipient/payment/preview/confirmation coverage through runtime with fake external ports;
- bounded alternative search with current/rejected-product exclusion and POS validation;
- code-owned compatible-offer price comparison;
- 30-message history window plus redacted inbound/context event;
- isolated fact-read failures;
- bounded Responder recovery without an extra model call/effect;
- existing turn quota reused across C3 roles/retries;
- human-owner no-call preflight;
- privacy-safe durable failure reasons and payload-free role telemetry.

Do not reopen these abstractions merely because an output-quality case fails. Localize failures to the owning boundary first.

## 4. Findings that remain open

### 4.1 Required — Responder can re-strategize

The current design says Strategist owns adaptive choice, but the adaptive Responder is also instructed to:

- read the whole dialogue and prioritize the latest decision;
- prefer one concern when several appear;
- decide whether known budget/measurements should be asked again;
- connect customer preference/experience to selected evidence.

Those instructions give the second model enough discretion to disagree with the Strategist/compiler.

Observed failure families consistent with this overlap include:

- price comparison becoming weight comparison;
- wrinkle resistance becoming fabric smoothness;
- ETA/deadline relation being reinterpreted incorrectly;
- a corrected product code causing the model to infer a question not actually present.

### 4.2 Required — Strategist prompt has an internal KEEP_OPEN contradiction

For unsupported shop-owned facts the prompt correctly says:

- keep `ANSWER`;
- preserve the requested proposition;
- use empty evidence when no fact exists;
- do not ask the customer to supply shop-owned evidence.

But it also says `KEEP_OPEN` is valid only after the current need is resolved.

For an unresolved shop-owned question with no useful customer input, the schema still requires either ASK or KEEP_OPEN. The prose therefore gives the model incompatible guidance.

### 4.3 Required — compound-question coverage is handed off through free-text `goal`

The six-field Strategist contract is intentionally small, but currently the Responder must recover important structure from `goal`:

- exact current need;
- supported requested parts;
- unsupported requested parts;
- known customer input;
- remaining limitation;
- next input and why it matters.

That makes `goal` a semantic transport format even though it is free text. This is fragile for cases such as price + wrinkle resistance and availability + policy.

### 4.4 Required — guard conflates mention, acknowledgement, uncertainty and authoritative claims

Known false-positive families:

- customer price offer reference vs shop price claim;
- customer size selection acknowledgement vs fit recommendation;
- unconfirmed dispatch wording vs fulfillment effect;
- product referent mention vs product factual assertion;
- locality request vs sensitive recipient-address collection.

Known false-negative/semantic-miss families:

- wrong requested attribute but otherwise safe factual wording;
- inverted numeric/time relation;
- valid facts attached to the wrong current decision.

The solution cannot be another list of Vietnamese surface exceptions.

### 4.5 Required — sales progression can still be polite but unhelpful

Objection handling can end in an acknowledgement such as “em hiểu chị đang lăn tăn giá” without helping the customer decide.

A next question is useful only when the answer changes an executable recommendation, comparison, qualification or transaction. The system should not ask merely to continue the conversation.

### 4.6 Required — DEV70 generation did not prove full runtime ownership

The official run on `349a2d68` processed all 70 cases, but it primarily exercised Strategist → Responder → deterministic guard through the registered C2 adapter.

It did not independently prove every full-runtime path for:

- Producer interpretation;
- search/POS orchestration;
- cart mutation;
- checkout transitions;
- commit/receipt;
- final live-runtime fallback.

### 4.7 Required — evaluation evidence needs a clean UTF-8/reporting chain

The prior DEV70 artifact showed Vietnamese text rendered with `?` in parts of the captured CLI/log path. It is not yet proven whether the provider received corrupted bytes or only the reporting layer decoded them incorrectly.

The old report also obscured first-contact call topology and did not retain detailed stage/reason codes consistently.

No further quality conclusion should depend on an ambiguous input capture.

## 5. Target ownership after the fix

### Strategist owns

- the current customer need;
- relevant referent recovery from history;
- objection/criterion interpretation;
- one proposition;
- the selected evidence set;
- which requested parts remain unsupported;
- at most one justified progression;
- preservation of canonical buying intent and hard stops.

Strategist does **not** write customer-facing copy, calculate business values or create effects.

### Responder owns

- Vietnamese Messenger wording only;
- acknowledgement of customer context already authorized by the compiled task;
- exact realization of selected factual units;
- exactly one supplied question/request when the task contains one;
- natural joining/order of already-authorized reply parts.

Responder must **not**:

- reinterpret the current customer need;
- choose a different concern;
- select or drop evidence;
- decide whether a known customer input is missing;
- create a new progression;
- infer a benefit from a product attribute;
- derive a numeric comparison;
- change action/checkout semantics.

### Code owns

- product/cart/offer binding and revisions;
- commercial facts and projections;
- numeric/time comparison results;
- missing checkout and measurement fields;
- permitted canonical actions;
- state transitions, effects and receipts;
- semantic/task-consistency checks that can be expressed structurally;
- final output guard.

The underlying model resource may still be the same for both calls. Separation is by role and contract, not by model family.

## 6. Prompt design changes

### 6.1 Strategist: reduce duplication and add explicit precedence

Refactor the Strategist instruction into five sections:

1. **ROLE AND OWNERSHIP**
2. **PRECEDENCE**
3. **DECISION ALGORITHM**
4. **OUTPUT FIELD RULES**
5. **HARD INVARIANTS + bounded counterexamples**

The precedence block must be explicit:

#### Conversational focus

1. Latest inbound current need wins.
2. A correction/short answer may complete the immediately pending need.
3. Older dialogue is supporting context only.
4. Do not resurrect an already answered topic.

#### Authority

1. Canonical code context owns state/action authority.
2. `selectableEvidence` owns shop facts.
3. Dialogue owns customer-reported context only.
4. Missing evidence is never negative evidence.

#### Action

1. Hard stop if required.
2. Canonical request if code requires one.
3. One ordinary missing customer input only if it changes the next executable decision.
4. Otherwise no customer request.

Remove repeated versions of the same progression/evidence rules from multiple sections after tests protect behavior.

### 6.2 Fix KEEP_OPEN semantics

Define `KEEP_OPEN` as:

> No further customer input or canonical action is useful for this turn.

It is valid when:

- the current need is fully resolved; **or**
- a bounded limitation was given because the missing information is shop-owned and the customer cannot resolve it.

This removes the current contradiction without changing the six-field output contract.

### 6.3 Responder: remove re-strategizing

Replace “read the whole dialogue and prioritize the latest decision” with:

> The compiled task already represents the current decision. Dialogue is available only for natural reference, tone and customer wording. Do not reinterpret which question, concern, evidence, progression or subject should be handled.

Remove model responsibility for:

- deciding whether budget is already known;
- deciding which measurements are missing;
- choosing a concern from decision signals;
- deciding whether to resume a pending question.

Those checks belong to Strategist/compiler/code.

### 6.4 Remove or neutralize `customerDecisionSignals` in the Responder request

Preferred change: do not include `customerDecisionSignals` in the model-facing Responder request when they are not required to render wording.

If removal is blocked by compatibility, retain the field but state and test:

> Signals cannot change the compiled task, selected concern, evidence, subject or progression.

Do not let the Responder use these signals as a second intent router.

### 6.5 Forbid model-authored preference → benefit inference

The Responder may acknowledge customer context, but must not transform:

- “cạp chun” into “sẽ thoải mái hơn”;
- “phom suông” into “sẽ che bụng”;
- a stated preference match into “hợp chị hơn” or “đáng tiền hơn”;

unless that benefit/recommendation is itself code-owned evidence.

A neutral bridge such as “Với phần chị đang quan tâm:” is allowed.

## 7. Compound-question handoff

Do not expand the public Strategist six-field contract by default.

### Preferred path

At implementation start, inspect whether the existing typed customer fact request / producer output can be carried through the compiler.

If it is already available at the compiler boundary, add an **internal** responder-task representation such as:

```ts
requestedParts: [
  { capability: "PRICE", status: "SUPPORTED" },
  { capability: "WRINKLE_RESISTANCE", status: "UNSUPPORTED" }
]
```

This is internal task structure, not model authority and not a new public Strategist output field.

The Responder then realizes the supplied coverage and no longer parses `goal` to discover which requested part is missing.

### Fallback path

If no reusable typed request exists without introducing a new subsystem, keep the six-field contract and temporarily standardize `goal` to fixed sections:

```text
NEED: ...
KNOWN: ...
ANSWER: ...
LIMIT: ...
NEXT: ...
```

The compiler validates the sections needed for the selected task.

Do not create a new taxonomy/store/state machine only to avoid a bounded string format.

### Decision gate

Use the preferred typed path only if it reuses already-existing producer/request data. Otherwise land the fixed-goal format first and record the residual.

## 8. Guard repair strategy

The guard fix must be two-sided.

### 8.1 Create semantic statement classes at the compiler/guard boundary where possible

Use a small internal distinction, not a public model taxonomy:

- verified commercial fact;
- code-derived comparison/relation;
- customer selection/reference acknowledgement;
- customer offer/reference;
- bounded uncertainty;
- fit recommendation;
- business effect.

The purpose is to tell the guard what kind of authorized statement it is validating. Model text cannot self-authorize the class.

### 8.2 Required positive/negative pairs

At minimum add paired regressions for:

| Invariant | Must allow | Must reject |
|---|---|---|
| Price | “690k là mức chị đề xuất” / refusal of that offer | shop claims approved price 690k without evidence |
| Size | “chị chọn L” | “L chắc chắn vừa chị” without fit authority |
| Dispatch | “chưa xác nhận ngày shop gửi” | “shop sẽ gửi hôm nay” without effect authority |
| Product reference | “mẫu SQ9012 chị đang xem” | invented attribute about SQ9012 |
| Locality | request province/city for ETA | premature full recipient address collection |
| Comparison | code-derived cheaper/more expensive relation | model-derived unsupported superiority/value |
| Missing fact | bounded “chưa có dữ liệu xác nhận” | negative fact inferred from absence |

### 8.3 Do not solve semantic defects with regex accumulation

Regex remains appropriate for:

- exact codes/tokens;
- formatting;
- bounded deterministic phrase recognition;
- PII format detection.

It is not evidence that arbitrary Vietnamese prose is semantically correct.

If a fact family cannot be safely opened after the finite experiment, keep deterministic projection for that family and record the residual.

## 9. Sales usefulness / P07 closure

Strategist progression must pass a decision-impact test:

> Would the customer’s answer change the next recommendation, comparison, qualification or permitted transaction that the runtime can actually execute?

Three cases:

1. **Relevant verified evidence exists:** answer with it.
2. **Executable capability exists:** use the capability, e.g. alternative search for an explicit request with a known budget.
3. **Neither exists:** answer/limit briefly and stop naturally.

Do not:

- ask a generic discovery question just to continue;
- ask for a known budget/measurement;
- promise a lookup that runtime cannot perform;
- treat every objection as ACKNOWLEDGE;
- treat every objection as a retrieval request.

Required objection regressions include the price/value, previous-bad-experience and fit-concern families already observed in DEV70.

## 10. Runtime proof after prompt/guard repair

Do not use DEV70 alone to close P05/P06/P08/P09/P10.

Run a bounded set of full RealtimeRunner journeys with the real Producer/orchestration and safe fake business ports.

Minimum journey set:

1. explicit purchase + policy question;
2. variant correction + purchase;
3. selected M + stock query for S;
4. conditional lower-price offer;
5. price + unsupported wrinkle-resistance question;
6. explicit alternative search under budget with rejected/current exclusions;
7. same-offer price comparison;
8. long-history correction / pending question;
9. checkout details → preview → confirmation;
10. human/post-sale handoff while cart exists;
11. Responder transport/JSON/guard failure → bounded recovery;
12. independent lookup failure and commit failure.

For each journey assert:

- final customer-facing reply;
- canonical state;
- cart/checkout state where relevant;
- effects/receipts;
- model call count and roles;
- no unauthorized mutation;
- no stale preview/duplicate effect;
- no permanent Inbox failure for a recoverable wording failure.

Fake POS/model/delivery ports are acceptable here; the purpose is orchestration correctness, not live commerce proof.

## 11. DEV70 R2 and evaluation closure

PR379 owns the realistic DEV70 R2 corpus and is intentionally separate from PR377 runtime source.

Before the final P11 run:

1. Freeze the exact R2 source identity.
   - If PR379 has merged, record its merge SHA.
   - If it is still open, explicitly pin the reviewed PR379 head and do not call it PR377 ancestry.
2. Verify UTF-8 bytes immediately before provider/CLI invocation and round-trip decoding into the artifact.
3. Record call topology by role; first-contact must not be reported as a missing Strategist output.
4. Preserve detailed `stage` and `reasonCodes[]`.
5. Preserve final reply source: model / deterministic fact / recovery / pre-model reject.
6. Run GPT-6 Luna with the agreed reasoning level on all 70 frozen DEV cases.
7. Run the registered judge/rubric without changing thresholds after seeing outputs.
8. Review both:
   - rejected candidates;
   - accepted candidates that are semantically wrong or unhelpful.

Report separately:

- authority/grounding failures;
- question-resolution failures;
- semantic attribute/relation mismatches;
- compound completeness;
- helpfulness / next-step quality;
- naturalness;
- guard false positives;
- guard false negatives;
- calls/tokens/latency;
- provider/judge errors.

Do not report “guard accepted / 70” as a quality score.

## 12. Execution slices and dependencies

This is the implementation order inside the existing P00–P12 roadmap.

### Slice A — P03/P04/P07: prompt ownership + semantic handoff

**First because:** it attacks accepted-but-wrong replies and second-model overlap before evaluation is rerun.

Work:

- add RED regressions for semantic miss/false-positive families;
- fix KEEP_OPEN contradiction;
- simplify Strategist precedence;
- remove Responder re-strategizing;
- move known-input checks to compiler/code;
- implement typed requested-part handoff if existing producer data can be reused; otherwise structured-goal fallback;
- add neutral customer-context bridge rules.

Acceptance:

- old happy paths remain green;
- compound questions retain every requested part;
- Responder cannot select a different current concern/progression;
- known budget/measurement cannot reach Responder as a duplicate ASK task;
- Q052/Q063/Q081-style semantic switches fail deterministically.

### Slice B — P03/P04: two-sided guard repair

**Depends on:** Slice A task semantics.

Work:

- introduce the minimum internal statement distinction needed by guard;
- add paired allow/reject controls;
- keep model output untrusted;
- remove superseded case-specific exceptions only when regression coverage exists.

Acceptance:

- known harmless acknowledgement/uncertainty cases pass;
- corresponding unauthorized facts/effects still fail;
- no general “contains size/price/dispatch so allow it” rule;
- no weakening of cart/effect/PII authority.

### Slice C — P05/P06/P08/P09/P10: full-runtime journeys

**Depends on:** A/B stable enough that wording failures are meaningful.

Work:

- run and fix only the owning layer for the 12 journeys in section 10;
- reuse current Producer, kernel, search, history and recovery;
- no new state store.

Acceptance:

- final reply + state/effects assertions pass;
- Producer interpretation is exercised rather than injected;
- search/comparison runs through its actual orchestration path;
- long-history cases preserve relevant context;
- failures preserve independent facts and do not invent success.

### Slice D — P00/P11: clean evaluation chain + DEV70 R2

**Depends on:** source candidate from A–C and frozen PR379 R2 identity.

Work:

- verify UTF-8;
- run all 70;
- judge all eligible cases;
- classify every reject/error and accepted semantic failure;
- compare against the pre-fix run only where population/source conditions are compatible.

Acceptance:

- every case traceable to exact source/model/role calls;
- no unexplained encoding ambiguity;
- no silent missing stage/reason;
- frozen rubric unchanged;
- required regressions pass or remain explicit blockers.

### Slice E — P12: closure

Work:

- update `tasks/todo.md` using separate statuses:
  - Implementation
  - Deterministic verification
  - Real-model / experience acceptance
- update relevant spec amendments with current truth;
- exact-head build/test/CI;
- whole-PR self-review;
- list residuals and rollback.

Acceptance:

- no ancestor CI is presented as exact-head evidence;
- no task is marked complete from schema/mock pass alone;
- no deployment/traffic implication is inferred.

## 13. Required regression seeds

Use these as invariant seeds, not fixture-specific routing rules:

- customer asks wrinkle resistance; material alone must not answer it;
- customer asks which product is cheaper; answer must remain about price;
- ETA 2–4 days and customer deadline at day 5 must not be described as “5 is inside 2–4”;
- customer lower-price offer can be referenced/refused without authorizing that price;
- “chị chọn L” can be acknowledged without becoming a fit recommendation;
- “chưa xác nhận shop gửi ngày nào” is uncertainty, not a dispatch effect;
- product name used as a referent is not itself a new product claim;
- province/city needed for ETA is not automatically recipient-address collection;
- price + unsupported wrinkle question returns both the verified price and the unsupported limitation;
- known budget/measurements are not re-requested;
- corrected product code resumes only a genuinely pending question;
- an explicit alternative request invokes retrieval; price resistance alone does not;
- alternative search excludes current and rejected IDs;
- price comparison requires compatible, current operands;
- fallback never upgrades partial facts to whole-question completion.

Vary wording, clause order, punctuation and product state. Never branch on case ID or exact DEV wording.

## 14. Likely implementation anchors

Primary files to inspect before editing:

- `apps/worker/src/track-c-c3-prompts.ts`
- `apps/worker/src/track-c-c3-strategy-contract.ts`
- `apps/worker/src/track-c-c3-strategy-contract-runner.ts`
- `apps/worker/src/track-c-c3-projection-egress.ts`
- existing realtime Producer/runner/search/history/checkout tests
- existing business-tools guard tests
- current C2 benchmark adapter/evaluator and PR379 R2 corpus

Do not assume every fix belongs in these files. Use the failing regression to locate the owning boundary before editing.

## 15. Verification order

For each source slice:

1. write a regression that fails for the intended reason;
2. make the smallest owning-layer change;
3. run focused tests;
4. run adjacent regression suites;
5. only after the slice is stable, move to the next slice.

Before P12 closure run the repository’s existing required build/test/CI path.

At minimum the final candidate should include focused coverage equivalent to:

```text
track-c-c3-strategy-contract-runner
track-c-c3-projection-egress
realtime-customer-input
realtime-sales-cycle
realtime-runner
realtime-server-c3
realtime-alternatives
track-c-c3-price-comparison
track-c-c3-checkout-reachability
business-tools / size-claim guard
dataset-boundary validation
workspace build/typecheck
exact-head CI
```

Database integration is required again only if transaction/history/CAS persistence code changes.

## 16. Security and privacy gates

Preserve:

- human-owner and hard-stop no-call paths;
- private checkout capture boundary;
- no raw prompt/output/provider error in production telemetry;
- no customer PII copied into Strategist goal;
- no model text authorizing business actions;
- no weakening of cart/offer/revision/freshness checks;
- no live catalog/index/customer write from evaluation.

Offline evaluation artifacts may contain the data required for review only under the existing owner-local handling rules; they are not production telemetry.

## 17. Decision gates

### Gate 1 — typed requested-part coverage

If existing Producer/request structure can be carried through without a new subsystem, use it internally.

Otherwise use the fixed `goal` sections first. Do not create a new public schema solely for elegance.

### Gate 2 — free-prose guard ceiling

If finite paired controls still cannot safely distinguish a fact family in free prose:

- retain deterministic projection for that family;
- record the residual;
- do not add an online model reviewer by default.

An online semantic verifier would require a separate architecture decision with measured error rate, latency, cost and failure behavior.

### Gate 3 — model change

Do not change provider/model simply because a prompt case fails.

Only compare model variants after the same source/facts/contracts/rubric are stable. Change one role at a time when attribution matters.

## 18. Definition of Done for PR377 closure

PR377 can move beyond draft only when all applicable conditions are true:

### Correctness

- task-specific acceptance above passes;
- compound questions retain supported and unsupported parts;
- no known serious accepted-but-wrong semantic regression remains;
- no unauthorized commerce effect/fact is accepted in the required controls;
- runtime journeys verify final reply and state/effects.

### Quality

- prompt ownership is non-overlapping and documented;
- repeated/conflicting prompt rules are removed where tests now protect behavior;
- no case-specific production routing/template was added;
- no unrelated refactor is mixed in.

### Integration

- Producer → Strategist → Responder → guard flow works with surrounding runtime;
- search/history/cart/checkout/recovery remain compatible;
- exact-head CI passes.

### Evaluation

- DEV70 R2 source identity is pinned;
- UTF-8 chain is verified;
- all 70 generations and eligible judge results are retained;
- rejects, judge/provider errors and accepted semantic failures are reported explicitly;
- quality claims use judge/manual evidence, not guard admission rate.

### Documentation / ship readiness

- P00–P12 checklist reflects implementation vs deterministic vs real-model acceptance separately;
- residuals are visible;
- rollback is a normal source revert with no migration/live switch;
- no merge/deploy/traffic is implied by this plan.

## 19. Rollback and scope control

Each implementation slice should be independently revertible.

No database migration, data rewrite, provider activation or public interface migration is planned. If a prompt/guard change worsens a protected behavior, revert that slice rather than layering another exception.

The simplest acceptable end state is preferred over a more “intelligent” architecture:

- two clear model roles;
- typed/code-owned authority;
- a small compiler task;
- deterministic validation;
- bounded recovery;
- one frozen realistic DEV70 evaluation.

## 20. Planned handoff

After this docs-only PR is reviewed, implementation should proceed on PR377 in the Slice A → B → C → D → E order.

Every progress update must state separately:

- what source behavior was changed;
- what deterministic tests actually passed;
- what full-runtime journey actually passed;
- what real-model evidence exists;
- what remains open.

Do not use “P03 done” or “P11 pass” as shorthand unless all acceptance dimensions for that task are explicitly satisfied.
