# Spec: C3 single-agent commerce architecture candidate

**Status:** Draft / architecture experiment only / human review required before planning or implementation  
**Date:** 2026-10-04  
**Base:** main at 7a7d98119e55bd689ef428c8f8c5bfa71b020652  
**Related:** C3 strategy contract, PR377, PR380 quality-closure work  
**Primary principle:** **Model owns conversational reasoning. Code owns business truth, permissions, state transitions and effects.**

This document proposes a new candidate architecture for the sales conversation path. It is not a rewrite approval, not a migration approval, and not evidence that the candidate is better than the current C3 runtime. The first implementation, if approved, must be a bounded shadow/evaluation path that reuses the existing commerce and safety core.

---

## 1. Objective

Build toward a chatbot that is good enough for real customer conversations, not merely a pipeline that is internally valid.

The target chatbot must:

1. understand the customer's latest message without silently dropping explicit needs;
2. preserve relevant context and corrections across turns;
3. bind references to the correct product, variant, cart and conversation state;
4. separate customer-reported context from verified business facts, deterministic derivations and unknowns;
5. ground business claims in current authoritative data;
6. use deterministic code for deterministic relations and effects;
7. produce an outcome for each explicit customer need;
8. avoid repeating known questions and respect defer, stop and handoff;
9. use the language/reasoning strength of current models instead of reducing them to narrow classifiers and renderers;
10. verify the final outgoing reply against hard safety and authority invariants.

Success is measured at the customer-turn level: the reply must be correct, complete enough, useful, context-aware, natural and safe.

Architecture simplicity is a means to this goal, not the goal itself.

---

## 2. Why a new architecture experiment is justified

### 2.1 The original C3 principle is still correct

The existing C3 spec established the principle:

> Agent owns choice. Code owns authority.

That principle remains the foundation of this proposal.

The problem is not that C3 protects business authority. Those protections are valuable and must be retained.

The problem is that the adaptive path accumulated multiple semantic representations and ownership handoffs while addressing real failures over time.

The current PR377 candidate describes a path in which customer meaning can pass through typed customer input, canonical state, requested obligations, evidence projection/matching, resolution, Strategist decisions, compiler handoff, Responder realization and final guards.

Each addition has a local reason. The aggregate cost is that the same customer meaning is translated repeatedly before the final reply.

### 2.2 Current evidence does not prove customer-facing quality closure

At PR377 exact head 462c025d009049e54f11b7908f634ea3e0b506e4, deterministic verification and CI are strong, and the Producer-inclusive DEV70 run records:

- 51 guard-accepted cases;
- 10 candidate rejections;
- 7 Producer rejections;
- 2 pre-model stale cases;
- 61 typed obligations mapped to 61 outcomes in accepted cases;
- 0 silent drops among those accepted obligations;
- GPT-6.1 Sol / low for Producer, Strategist and Responder;
- judge disabled;
- P11 remains open;
- P12 remains blocked.

The same PR explicitly states that guard acceptance is not semantic quality acceptance.

This matters because the remaining problem is increasingly not only whether information survives a typed contract. It is whether the final customer receives a coherent, useful answer after all of the conversions and guards.

### 2.3 Failure pattern motivating the experiment

Across the C3 quality-closure work, recurring classes include:

- the model can understand a customer concept but a later schema or scope validator rejects the representation;
- history contains useful context but not every consumer sees one canonical current meaning;
- business evidence exists but customer-language vocabulary and evidence vocabulary do not line up cleanly;
- deterministic safety can be correct while the final answer remains generic, repetitive or unhelpful;
- a final writer has less semantic freedom because earlier stages have already compressed the conversation into narrow representations;
- adding a new failure-specific semantic representation can fix one class while increasing the number of future translation boundaries.

This proposal treats those as a possible architecture-level source of quality loss, not as proof that every current C3 abstraction is wrong.

---

## 3. Theory of operation

### 3.1 Preserve semantic continuity

Modern capable models are strong at jointly handling:

- natural Vietnamese;
- compound messages;
- correction and negation;
- cross-turn referents;
- implied concern and buying intent;
- relevant-history selection;
- synthesis of multiple facts;
- deciding what clarification is useful;
- natural response composition.

The architecture should preserve those capabilities through the customer turn instead of forcing customer meaning through a sequence of independent semantic schemas unless code truly requires a typed boundary.

### 3.2 Centralize business truth

The model must not become the authority for:

- price;
- stock;
- policy;
- product/variant identity;
- cart revision;
- payment state;
- order state;
- side effects;
- permissions;
- deterministic arithmetic or eligibility.

Those remain code/tool-owned.

The model may reason over verified results, but it may not manufacture them.

### 3.3 Repeat a model call only when the world changed

A second or third model invocation is justified when the model receives information that was not available during the prior invocation, for example:

- product search results;
- current POS stock;
- destination-bound ETA;
- policy lookup;
- cart mutation receipt;
- checkout readback.

A model invocation is not justified merely to translate another model's semantic output into a second semantic representation.

The intended default is:

~~~text
context + latest customer message
          |
          v
 conversational model
          |
     enough data?
       /      \
     yes       no
      |         |
      |       domain tool
      |         |
      |     new verified result
      |         |
      +---------+
          |
          v
       final reply
          |
          v
   deterministic guard
~~~

This is one conversational role with a bounded tool loop, not a fixed multi-agent pipeline.

### 3.4 Raw dialogue and structured state are complementary

Structured state must not replace the relevant raw dialogue.

The model should receive both:

- recent/relevant customer dialogue, preserving nuance;
- canonical state, preserving durable current truth.

For example, a canonical preference such as loose fit can coexist with the original customer sentence explaining that she sits in an office all day and dislikes a tight waist.

The structured state is memory and authority support, not a lossy substitute for language.

### 3.5 Final guard is a safety boundary, not a second language reasoner

The final guard should answer questions code can know with high confidence:

- Is a factual claim grounded?
- Is it bound to the correct subject?
- Is the source still fresh?
- Is an effect claim backed by a successful receipt?
- Is PII exposure allowed?
- Is an explicit required customer need completely missing?
- Does the reply contain directly contradictory authoritative claims?

The final guard should not reconstruct the customer's full intent, choose conversational strategy, or re-plan the answer.

If it must do so, upstream ownership is wrong.

---

## 4. Target architecture

~~~text
        inbound customer message
                  +
       relevant raw conversation
                  +
        canonical current state
                  |
                  v
      admission / ownership / safety
              preflight
                  |
                  v
      SINGLE CONVERSATIONAL AGENT
      understand + reason + decide
                  |
                  | tool calls only when needed
                  v
       HARDENED DOMAIN TOOL LAYER
   product | search | policy | state | cart
   checkout | deterministic derivations
                  |
                  v
      authoritative tool result / receipt
                  |
                  +-------------------+
                                      |
                                      v
                          SAME CONVERSATIONAL AGENT
                          continue reasoning + reply
                                      |
                                      v
                           THIN FINAL CODE GUARD
                                      |
                                      v
                              Outbox / delivery
~~~

The exact model provider is not an architectural invariant. The conversational role must be provider-independent at the interface level.

The architecture must support a one-model-call fast path when all required context and verified facts are already available.

Tool use is dynamic, not mandatory.

---

## 5. Ownership model

| Concern | Owner |
|---|---|
| Understand current customer language | Conversational model |
| Interpret correction, negation, referent and concern | Conversational model |
| Select what information is relevant to the current decision | Conversational model |
| Choose whether a clarification is useful | Conversational model within allowed actions |
| Decide response organization and wording | Conversational model |
| Customer profile/current durable state | Existing canonical code/state owners |
| Product and variant identity | Code/domain tools |
| Price, stock, promotion, policy, ETA | Authoritative business sources + code |
| Search execution and verified filtering | Existing business/search tools |
| Arithmetic, comparison, deadline and eligibility when deterministic | Code |
| Cart/checkout/order mutation permission | Commerce kernel/code |
| CAS/revision/fencing | Code |
| Side-effect execution | Code/domain tool |
| Side-effect success claim | Allowed only from a returned receipt/readback |
| PII/private recipient boundaries | Code |
| Human ownership/handoff | Existing code owner |
| Outbox and delivery guarantees | Existing messaging core |
| Final authority/safety verification | Code |
| Conversational quality evaluation | Offline evaluation/judge + human review, not runtime permission logic |

The key change is that semantic conversational ownership is not split across Producer, Strategist and Responder by default.

---

## 6. Model interaction contract

### 6.1 Do not recreate the current semantic pipeline under new names

The candidate must not begin by creating equivalents of:

- a new Producer role;
- a new Strategist role;
- a new Responder role;
- a new obligation graph;
- a new concern taxonomy;
- a new semantic handoff grammar;
- a new online reviewer model;
- a new durable conversation-state store.

Any new typed structure must be justified by a concrete code boundary that cannot safely operate on existing canonical state or normal tool arguments.

### 6.2 Agent context

The initial model context should contain only information relevant to the turn:

- latest inbound message;
- recent dialogue;
- selected older dialogue when relevant;
- current canonical customer/session state;
- current bound product/cart context;
- already-available verified facts when cheap/current;
- available domain tools with precise descriptions;
- explicit hard rules: model output is not business authority and tool success must be observed before claiming effects.

Do not dump every historical record or every business fact into every turn.

### 6.3 Tool loop

The runtime must impose a finite loop.

For the first experiment:

- target 1 model invocation for a turn that needs no new external fact/action;
- target 2 invocations when one tool round is required;
- allow a third invocation when a second dependent tool round is genuinely required;
- do not permit an unbounded loop;
- if the bounded loop cannot resolve the turn safely, produce a bounded clarification/unavailable/handoff outcome rather than continuing indefinitely.

The exact hard implementation cap is part of the implementation plan, but it must be finite and recorded in telemetry before any production opt-in.

### 6.4 No semantic telephone

The same conversational role should continue after a tool result whenever the model/provider API supports the required continuation pattern.

A second independent model role must not be introduced merely to re-read a JSON interpretation produced by the first role.

---

## 7. Hardened domain tools

The tool layer is the main safety boundary.

A tool must expose domain behavior, not unrestricted data mutation.

Prefer:

~~~ts
type ChangeCartVariantRequest = {
  cartId: string;
  expectedRevision: number;
  component: "TOP" | "BOTTOM" | "SET";
  requestedSize: string;
};

type ChangeCartVariantResult =
  | {
      status: "SUCCESS";
      cartRevision: number;
      readback: {
        component: "TOP" | "BOTTOM" | "SET";
        size: string;
      };
    }
  | {
      status: "STALE" | "AMBIGUOUS" | "UNAVAILABLE" | "REJECTED";
      reasonCode: string;
    };
~~~

over a generic mutation such as "save arbitrary customer/cart JSON".

Tool requirements:

- validate all model-provided arguments;
- bind operations to the current authorized conversation/customer/cart;
- enforce source, freshness and revision rules in code;
- return typed results;
- return receipts/readback for mutating operations;
- expose only data needed by the conversational task;
- never treat prompt instructions as permission;
- record sanitized diagnostics;
- never return secrets or unnecessary PII;
- keep retrieval tenant/shop scoped;
- cap tool/model loop consumption.

Existing business and commerce modules should be wrapped/reused before new services are created.

---

## 8. State and memory

### 8.1 Keep existing state owners

The candidate must first reuse the existing:

- customer/session state;
- product binding;
- commerce/cart state;
- accepted conversation history;
- Outbox recovery;
- existing profile/preferences where authoritative.

No new durable memory store is approved by this spec.

### 8.2 History is evidence; state is current truth

The runtime should distinguish:

- what was said historically;
- what remains the current customer preference/selection;
- what is verified business truth;
- what is unknown.

Corrections must update current state without erasing useful historical nuance.

### 8.3 The model may propose; code commits

Where the model interprets a customer-provided state change, code must validate the proposed change before persisting it.

A model statement such as "customer changed bottom size to M" is not itself a cart mutation receipt.

---

## 9. Mapping to the ten quality requirements

| Requirement | Candidate handling |
|---|---|
| 1. Understand full latest message | One conversational model reads the message in context instead of several semantic owners reclassifying it |
| 2. Preserve cross-turn meaning | Existing canonical state + relevant raw history are supplied together |
| 3. Resolve referents correctly | Model resolves language; domain tools/code bind actual product/variant/cart identity |
| 4. Separate information classes | Dialogue/customer context, verified tool facts, deterministic derivations and unknowns remain distinct |
| 5. Ground business claims | Domain tools and current authoritative sources own claims |
| 6. Deterministic relations in code | Existing derivation/business core remains responsible |
| 7. Every explicit need gets an outcome | End-to-end turn evaluation checks unresolved/answered/action/clarification/handoff outcomes; avoid an online obligation subsystem unless proven necessary |
| 8. Do not re-ask; know when to stop | Canonical state plus model understanding; hard stop/handoff stays code-enforced |
| 9. Use model capability | Same conversational role can reason over raw language and fresh tool results and compose the final answer |
| 10. Verify final reply | Thin deterministic authority/effect/PII/completeness guard |

---

## 10. What is retained from C3

The candidate is not a greenfield rewrite.

Retain and reuse where applicable:

- admission and trusted ownership boundaries;
- business fact envelopes/provenance;
- evidence/source freshness rules;
- product/variant binding;
- POS/catalog adapters;
- Qdrant/product search infrastructure where it remains the current source;
- policy authority;
- deterministic price/comparison/ETA/eligibility logic that is already correct;
- cart/checkout/commerce-kernel behavior;
- CAS/fencing/revision checks;
- effect permission and effect receipts;
- PII/private checkout boundaries;
- human handoff;
- accepted-history recovery;
- Outbox/commit/delivery guarantees;
- existing safety regressions;
- current benchmark assets as comparison baselines.

The experiment should replace only the conversational semantic orchestration needed to test the hypothesis.

---

## 11. What is not automatically carried forward

The following are not deleted by this spec, but they are not architectural requirements for the candidate path:

- dedicated Customer Input Producer call;
- six-field Strategist contract;
- three-field Responder contract;
- requested-obligation graph as online orchestration;
- requestedObligationIndexes;
- concern-to-evidence taxonomy as a mandatory online layer;
- semantic handoff grammar between model roles;
- final guard logic whose only purpose is validating intermediate semantic representations.

If the experiment later proves one of these is necessary, the implementation proposal must identify the repeated failure it prevents and why a simpler existing boundary cannot solve it.

---

## 12. Anti-overengineering rules

The implementation must follow these constraints:

1. No new semantic subsystem for a single benchmark case.
2. No new enum or persistent field solely because one model output used a new phrase.
3. No new model role without new information/authority that the existing conversational role cannot receive directly.
4. No new durable state store until current profile/session/history owners are proven insufficient.
5. No online model reviewer by default.
6. No new general agent framework dependency unless the existing TypeScript runtime cannot implement the bounded loop simply.
7. No n8n runtime dependency is implied by this architecture; n8n's agent-node shape is only analogous to the model + memory + tools pattern.
8. Every new semantic abstraction must replace duplicated responsibility or protect a repeated invariant across multiple scenarios.
9. Benchmark failures must first be classified as model, context, tool, authority, state or guard failures before architecture changes are proposed.
10. Evaluation cases must not be hard-coded in production logic.

---

## 13. Security and threat model

### Assets

- customer identity and PII;
- recipient/checkout data;
- authenticated business facts;
- cart/order state;
- policy and price authority;
- model/tool credentials;
- conversation ownership;
- mutation/effect permissions.

### Trust boundaries

- customer text -> runtime;
- conversation/history retrieval -> model context;
- model output -> tool invocation;
- tool output -> model;
- model final text -> final guard;
- final accepted reply -> Outbox/delivery;
- external catalog/POS/policy sources -> business core.

### Required controls

- model output and tool arguments are untrusted;
- every tool validates schema, identity, scope and permission;
- tools must not accept arbitrary SQL, shell, URL or code execution from the model;
- secrets and unnecessary private data must not enter model context;
- recipient data remains behind current private checkout boundaries;
- mutations require canonical current identifiers and revision/fencing where applicable;
- the agent loop has finite model/tool budgets;
- retrieval remains shop/tenant scoped;
- effect claims require returned success receipts;
- logs/traces record sanitized IDs and diagnostics, not raw secrets/PII;
- prompt text is never a permission boundary.

### Abuse cases to test

- customer attempts prompt injection asking the bot to ignore tool restrictions;
- model invents stock/price without calling or receiving verified data;
- stale cart revision mutation;
- model tries to mutate a different product/cart/customer;
- tool returns malformed/stale data;
- customer message includes PII in a context where it must not be propagated;
- model claims an order/cart change after a failed tool result;
- repeated tool-loop request attempts to exhaust rate/token budget.

---

## 14. Expected results

These are hypotheses to test, not claims already proven.

### Expected quality improvement

The candidate should improve:

- semantic continuity across compound customer messages;
- cross-turn use of customer preferences and concerns;
- handling of corrections and defer/stop language;
- relevance of evidence to the actual buying decision;
- naturalness and coherence of the final response;
- ability to return a useful partial answer when one lookup fails;
- ability to use current capable models for end-to-end conversational reasoning.

### Expected architecture improvement

The candidate should reduce:

- semantic representations per customer turn;
- model-to-model semantic handoffs;
- validators that interpret natural language;
- fixed model calls that do not receive new world information;
- benchmark-specific patches;
- cases where a correct upstream understanding is rejected only because an intermediate representation cannot express it.

### Expected operational trade-offs

The agent loop may increase variance in model-call count and latency relative to a fixed pipeline.

The experiment must therefore record:

- model invocations per customer turn;
- tool calls per turn;
- tool-loop depth;
- end-to-end latency;
- provider/model errors;
- token/cost usage;
- guard rejection reason;
- handoff/fallback reason.

No latency or cost improvement is claimed in advance.

---

## 15. Evaluation strategy

### 15.1 Compare against current C3, do not replace it first

The first implementation must run as an isolated candidate/shadow evaluation path.

It must not:

- send messages to live customers;
- mutate live carts/orders;
- change model pins for current production;
- remove the current C3 path;
- weaken current guards.

Use fake/isolated mutation ports for stateful evaluation.

### 15.2 Evaluation corpus

Reuse existing current assets where they remain valid, including DEV70 and current stateful sales journeys.

Add only the minimum scenarios needed to cover the ten quality requirements where the existing corpus has no explicit assertion.

Scenario definitions should specify:

- state before;
- latest customer message;
- relevant business truth;
- required customer needs/outcomes;
- allowed facts/actions;
- forbidden facts/actions;
- expected state after when deterministic.

Do not prescribe exact prose except for code-owned receipts/policy text where exact wording is itself an invariant.

### 15.3 Hard gates

The candidate cannot be promoted if it regresses any existing hard invariant:

- wrong product/variant subject;
- invented price/stock/policy;
- stale cart mutation;
- unauthorized effect;
- PII leak;
- cross-owner continuation after hard handoff;
- missing effect receipt;
- invalid revision/CAS behavior;
- explicit customer need silently dropped in the locked acceptance corpus.

### 15.4 Conversational quality gate

Guard acceptance alone is insufficient.

The candidate and current C3 must be evaluated on the same frozen source/history/business data for:

- understanding;
- completeness/question resolution;
- relevant context use;
- usefulness/decision support;
- next-step appropriateness;
- naturalness/coherence;
- factual/action safety.

A registered judge or explicit human review may score these dimensions.

The exact numeric promotion threshold is an **open owner decision** and must be frozen before the first promotion-candidate run. It must not be tuned after seeing candidate results.

At minimum, promotion requires:

- no hard-safety regression;
- no worse deterministic state/effect acceptance;
- a clear measured improvement in conversational quality over current C3;
- no increase in architecture complexity that recreates Producer -> planner -> writer semantic handoffs under new names.

---

## 16. Complexity measurements

Before implementation, record the current baseline for the evaluated path:

- online model roles;
- model invocations per turn;
- semantic representations crossed before final reply;
- semantic validators/mappers;
- business/domain tool boundaries;
- hard safety guards.

For the candidate, record the same.

A candidate that improves benchmark output by adding another chain of semantic translators does not satisfy this architecture goal.

The desired shape is one conversational owner plus deterministic domain boundaries.

---

## 17. Migration strategy if the experiment succeeds

Migration is deliberately outside this spec PR.

A later reviewed plan should use vertical slices:

1. isolated candidate runner using existing read-only business tools;
2. deterministic and frozen-corpus comparison;
3. real-model shadow comparison;
4. stateful fake-port journeys;
5. bounded opt-in path with existing current fallback;
6. only after acceptance, deprecate superseded semantic roles/boundaries.

Do not delete Producer/Strategist/Responder or obligation code before the candidate has passed the agreed quality and safety gates.

Do not maintain two permanent architectures. The experiment must either converge to a migration decision or be removed.

---

## 18. Rollback and failure policy

Before any production opt-in:

- current C3 remains a rollback path;
- the candidate has a kill switch/opt-in gate;
- no schema migration makes rollback impossible;
- no new durable state is required for candidate-only semantics;
- a candidate tool/model failure resolves through bounded fallback or current safe behavior;
- effects are never retried blindly after an ambiguous result.

If the candidate does not produce a clear quality improvement, remove the experiment rather than preserving neutral complexity.

---

## 19. Tech stack

Current workspace baseline:

- Node.js >= 22;
- pnpm 10.12.4;
- TypeScript 5.8.3;
- Vitest 3.2.4;
- existing worker/runtime and package boundaries.

No new runtime dependency is approved by this spec.

The implementation should first use existing project/provider abstractions and documented model/tool-call capabilities. Any version-sensitive provider API must be verified against official documentation during implementation.

---

## 20. Commands

Workspace commands from the current root package.json:

~~~bash
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm check
~~~

Implementation work must discover and use focused worker tests during RED/GREEN and the full relevant workspace checks before claiming completion.

This documentation PR itself does not claim these commands were run.

---

## 21. Project structure

Expected ownership, subject to the later implementation plan:

~~~text
docs/specs/
  c3-single-agent-commerce-architecture-20261004.md   # this contract

apps/worker/src/
  ...                                                 # orchestration and candidate runner
  realtime-runner.ts                                  # existing runtime entrypoint where applicable

packages/business-tools/
  ...                                                 # existing verified business/search capabilities

packages/commerce-kernel/
  ...                                                 # existing cart/order/effect authority

packages/contracts/
  ...                                                 # only shared types that truly cross stable boundaries

packages/chat-runtime/
packages/conversation-engine/
  ...                                                 # reuse existing runtime/provider abstractions where appropriate

benchmarks/
evaluation/
  ...                                                 # frozen comparison/evaluation assets
~~~

This spec does not authorize moving modules merely to make the directory tree match the diagram.

---

## 22. Code style

Prefer explicit domain tools and discriminated results over generic model-driven mutation.

Example:

~~~ts
export type ProductAvailabilityResult =
  | {
      status: "VERIFIED";
      productId: string;
      variantId: string;
      stockStatus: "IN_STOCK" | "OUT_OF_STOCK";
      observedAt: string;
      expiresAt: string;
    }
  | {
      status: "UNKNOWN" | "STALE" | "UNBOUND";
      reasonCode: string;
    };
~~~

Rules:

- narrow typed interfaces at business/action boundaries;
- normal natural-language context is not forced into enums unless code needs the enum;
- model output never directly mutates authoritative state;
- errors use explicit result/status semantics where current project patterns do;
- avoid pass-through wrappers that only rename existing behavior;
- no case-ID switches or benchmark phrase lists.

---

## 23. Testing strategy

### Unit

Test:

- tool input validation;
- binding/freshness/revision rules;
- deterministic derivations;
- final guard authority checks;
- loop budget/fallback behavior.

### Integration

Test:

- model/tool adapter with fake model outputs;
- one tool round and dependent two-tool rounds;
- state update/readback;
- tool failure/malformed result;
- hard stop/handoff;
- PII boundaries.

### Stateful runtime

Use RealtimeRunner or the actual candidate entrypoint with fake business/history/commit/delivery ports to verify:

- cross-turn state;
- corrections;
- cart mutation/readback;
- checkout/effect boundaries;
- fallback and ownership transitions.

### Real-model evaluation

Use exact source/model/config records and persist the full model/tool trace needed for review.

Do not classify schema completion or guard acceptance as customer-quality success.

### TDD

For implementation, each behavior change follows RED -> GREEN -> REFACTOR where practical.

Do not weaken existing regressions to make the candidate pass.

---

## 24. Boundaries

### Always

- preserve code-owned business authority;
- preserve source/freshness/product/cart binding;
- preserve PII/effect/ownership/Outbox invariants;
- treat model and retrieved text as untrusted;
- validate every privileged tool boundary;
- keep the agent loop finite;
- compare exact candidate and baseline inputs when claiming improvement;
- record real call counts and failures;
- report unresolved quality gaps.

### Ask first

- new durable state/schema;
- new model/provider dependency;
- new external integration;
- auth/PII boundary changes;
- new production tool permission;
- live-traffic opt-in;
- current C3 removal;
- benchmark/rubric threshold changes after evaluation starts.

### Never

- send experiment output to live customers without explicit rollout approval;
- use simulation facts as production authority;
- let prompt text grant business permission;
- allow model output to directly commit cart/order/payment effects;
- add case-specific production branches to pass the corpus;
- disable guards/assertions to improve acceptance numbers;
- claim quality closure from guard acceptance alone;
- introduce an unbounded tool/model loop;
- delete current C3 safety behavior before parity is proven.

---

## 25. Success criteria for this spec PR

This documentation PR is complete when reviewers can answer yes to all of the following:

1. The quality objective is explicit and customer-facing.
2. The reason for evaluating a new path is supported by current C3/PR377 evidence without claiming PR377 is a failure overall.
3. The new ownership boundary is unambiguous: model owns conversation; code owns truth/authority/effects.
4. Existing C3 safety/business infrastructure to reuse is named.
5. Non-goals and anti-overengineering constraints are explicit.
6. Security/tool trust boundaries are explicit.
7. The candidate cannot silently become a permanent second architecture without a migration decision.
8. Evaluation compares the candidate against current C3 on the same frozen inputs.
9. Guard acceptance is explicitly separated from customer-quality acceptance.
10. No runtime/code behavior is changed by this PR.

Human approval of this spec is required before creating the implementation plan.

---

## 26. Open questions requiring owner review

1. **Promotion threshold:** What exact paired-judge/human quality threshold should be frozen before the first promotion-candidate run?
2. **First-contact lane:** Should the experiment initially preserve the current fixed first-contact policy unchanged, or include first contact in the single-agent comparison corpus while still preserving its business-authority rules?
3. **Model-call cap:** The experiment should target 1 call without tools, 2 with one tool round, and 3 only for dependent tool work. What exact hard runtime cap should be adopted after baseline measurement?
4. **Candidate naming:** Keep "C3 single-agent candidate" for the experiment, or use a neutral name that does not imply automatic replacement of C3?

None of these open questions requires runtime code in this PR.

---

## 27. Decision summary

The candidate architecture is intentionally small:

~~~text
MODEL
  understand + reason + converse
     |
     v
HARDENED CODE TOOLS
  truth + state + permissions + effects
     |
     v
SAME MODEL
  continue with new world information
     |
     v
THIN CODE GUARD
     |
     v
OUTBOX
~~~

The architecture does not try to make code better at language than the model.

It does not try to make the model a database, policy engine, transaction coordinator or permission system.

The experiment is successful only if this simpler semantic path produces a chatbot that is measurably better for customers while preserving the hard-earned safety and business invariants of C3.
