# Spec: C3 single-agent commerce architecture candidate

**Status:** Draft / architecture experiment only / human review required before implementation planning  
**Date:** 2026-10-04  
**Base:** main at `7a7d98119e55bd689ef428c8f8c5bfa71b020652`  
**Related:** current C3 strategy contract, PR377, PR380 quality-closure work  
**Principle:** **Model owns conversational reasoning. Code owns business truth, permissions, state transitions and effects.**

This spec proposes a bounded architecture experiment. It does not approve a rewrite, migration, production rollout, new durable state, or removal of current C3.

---

## 1. Objective

The goal is a chatbot that is good enough for real customer conversations, not merely a pipeline that is internally valid.

A successful customer turn must satisfy ten requirements:

1. understand the latest message without silently dropping explicit needs;
2. preserve relevant context and corrections across turns;
3. bind references to the correct product, variant, cart and conversation;
4. distinguish customer-reported context, verified business facts, deterministic derivations and unknowns;
5. ground business claims in current authoritative data;
6. keep deterministic relations and effects in code;
7. produce a usable outcome for each explicit customer need;
8. avoid repeating known questions and respect defer, stop and handoff;
9. use the language/reasoning strength of current capable models rather than reducing them to narrow classifiers/renderers;
10. protect the final outgoing reply with machine-verifiable authority, effect and privacy boundaries.

The customer-facing quality bar is:

> **correct + sufficiently complete + useful + context-aware + natural + safe**

Architecture simplicity is a means to that quality bar, not the end goal.

---

## 2. Why evaluate a new path

### 2.1 What C3 got right

The original C3 principle remains correct:

> **Agent owns choice. Code owns authority.**

The current system has hard-earned protections that this candidate must reuse:

- product/variant binding;
- POS/catalog/policy authority;
- source provenance and freshness;
- cart revision/CAS/fencing;
- PII/private checkout boundaries;
- effect permission and receipts;
- human ownership/handoff;
- accepted-history recovery;
- Outbox/commit/delivery guarantees.

This proposal is not evidence that those parts are wrong.

### 2.2 What current evidence does not prove

At PR377 exact head `462c025d009049e54f11b7908f634ea3e0b506e4`, the Producer-inclusive DEV70 record reports:

- 51 guard accepted;
- 10 candidate rejected;
- 7 Producer rejected;
- 2 pre-model stale;
- 61 typed obligations -> 61 outcomes in accepted cases;
- 0 silent drops among those accepted obligations;
- GPT-6.1 Sol / low for Producer, Strategist and Responder;
- judge disabled;
- P11 OPEN;
- P12 BLOCKED.

PR377 itself states that guard acceptance is not semantic quality acceptance.

The remaining failure pattern includes cases where:

- a model understands a customer concept but a later schema/scope validator rejects its representation;
- useful context exists in history but does not survive every consumer boundary;
- evidence exists but customer-language and evidence vocabularies do not align cleanly;
- safety is correct while the final answer remains generic, repetitive or unhelpful;
- each local fix risks adding another semantic representation or validator.

The hypothesis is that repeated semantic translation is now one possible source of quality loss.

---

## 3. Design hypothesis

### 3.1 Preserve semantic continuity

A capable conversational model is good at jointly handling:

- natural Vietnamese;
- compound messages;
- correction and negation;
- cross-turn referents;
- implied concern;
- selecting relevant context;
- synthesizing verified results;
- useful clarification;
- natural response composition.

The candidate should let one conversational owner keep that responsibility across a turn.

### 3.2 Centralize reality in code

The model is never authority for:

- price, stock, promotion or policy;
- product/variant/cart/order identity;
- payment/order state;
- permissions;
- deterministic arithmetic/eligibility;
- whether a side effect actually happened.

Those remain code/tool-owned.

### 3.3 Call the model again only for new world information

A second or third invocation is justified when new information becomes available, such as:

- search results;
- live stock;
- policy lookup;
- ETA;
- mutation receipt/readback.

A model call is **not** justified merely to translate another model's semantic output.

### 3.4 Raw dialogue and structured state are complementary

Structured state is current truth support. Raw dialogue preserves nuance.

Neither replaces the other.

### 3.5 Runtime safety and conversational quality are different jobs

Free-form Vietnamese cannot be fully validated for semantic completeness and usefulness by deterministic code without rebuilding a language reasoner.

Therefore:

- **runtime hard guards** own machine-verifiable permission/safety invariants;
- **locked offline evaluation** owns semantic completeness, relevance, usefulness and naturalness.

This separation is an architectural invariant.

---

## 4. Target architecture

~~~text
latest customer message
+ recent/relevant accepted dialogue
+ existing canonical state
        |
        v
admission / ownership / safety preflight
        |
        v
SINGLE CONVERSATIONAL AGENT
understand + reason + decide
        |
        | tool calls only when required
        v
HARDENED DOMAIN TOOLS
product | search | policy | state | cart | checkout | derivations
        |
        v
verified result / receipt
        |
        +----------------------+
                               |
                               v
                    SAME CONVERSATIONAL ROLE
                    continue reasoning + reply
                               |
                               v
                    RUNTIME HARD GUARD
                               |
                               v
                         Outbox / delivery
~~~

The exact provider/model is not an architectural invariant.

The candidate must support a one-model-call fast path when required verified context is already available.

---

## 5. Ownership

| Concern | Owner |
|---|---|
| Understand current customer language | Conversational model |
| Correction, negation, referent, concern | Conversational model |
| Select relevant information / useful clarification | Conversational model within allowed actions |
| Response organization and wording | Conversational model |
| Customer/session durable state | Existing code/state owners |
| Product/variant/cart/order identity | Code/domain tools |
| Price, stock, promotion, policy, ETA | Authoritative sources + code |
| Search execution and verified filtering | Existing business/search tools |
| Deterministic arithmetic/comparison/deadline/eligibility | Code |
| Mutation permission, CAS/revision | Commerce code |
| Side-effect execution | Code/domain tool |
| Side-effect success claim | Only after success receipt/readback |
| PII/private recipient boundaries | Code |
| Human ownership/handoff | Existing code owner |
| Outbox/delivery guarantees | Existing messaging core |
| Runtime hard safety verification | Code |
| Conversational quality | Locked offline judge/human evaluation |

The main change is that conversational semantics are not split across Producer, Strategist and Responder by default.

---

## 6. Conversational agent contract

### 6.1 Context selection

For the first experiment, context selection is intentionally simple:

- latest inbound message;
- fixed recent accepted-turn window;
- existing canonical customer/session state;
- current bound product/cart context;
- older dialogue already explicitly referenced by existing canonical state;
- already-available current verified facts when cheap;
- available domain tools and their precise contracts.

Do **not** add a new semantic history selector, summarizer model, vector-memory subsystem or durable memory store for the first experiment.

Only add more selective history retrieval after repeated locked RED scenarios prove the bounded context insufficient.

### 6.2 Tool loop

Target:

- 1 model invocation: no new external fact/action required;
- 2 invocations: one tool round;
- 3 invocations: only when a second tool round genuinely depends on the first.

Independent lookups should share one tool round.

Example:

~~~text
customer asks price + black/M stock
  -> model
  -> price + stock tools in the same round
  -> model final reply
~~~

Do not turn independent price, stock and policy lookups into separate model loops.

The runtime must have a finite hard cap. The exact cap is an owner decision to freeze before production opt-in.

If the cap is reached, use a bounded clarification, unavailable response or handoff.

### 6.3 Same role, observable continuity

"Same agent" means the same conversational ownership, not hidden reasoning continuity.

Correctness may depend only on observable inputs supplied to each invocation:

- conversation messages;
- tool request;
- tool result;
- canonical state/context.

The system must not depend on hidden chain-of-thought or inaccessible provider session state.

A second model role must not exist solely to re-read a semantic JSON object produced by the first.

---

## 7. Hardened domain tools

The tool layer is the main privileged boundary.

### 7.1 Model-visible arguments are minimal

Prefer:

~~~ts
type ChangeCurrentCartVariantRequest = {
  component: "TOP" | "BOTTOM" | "SET";
  requestedSize: string;
};
~~~

Do not let the model choose protected identity such as:

- tenant;
- customer;
- conversation;
- cart/order ID;
- authorization scope;
- current revision.

Those come from server-owned execution context.

Example:

~~~ts
type CommerceExecutionScope = {
  tenantId: string;
  conversationId: string;
  customerId: string;
  cartId: string;
  expectedRevision: number;
  sourceMessageId: string;
  operationId: string;
};
~~~

### 7.2 Mutations need idempotency and readback

A mutation result must separate committed success from ambiguity:

~~~ts
type ChangeCurrentCartVariantResult =
  | {
      status: "SUCCESS";
      operationId: string;
      cartRevision: number;
      readback: {
        component: "TOP" | "BOTTOM" | "SET";
        size: string;
      };
    }
  | {
      status: "STALE" | "AMBIGUOUS" | "UNAVAILABLE" | "REJECTED";
      operationId: string;
      reasonCode: string;
    };
~~~

Rules:

- generate/bind operation identity at the trusted runtime boundary;
- validate model arguments;
- enforce tenant/customer/conversation/cart binding;
- enforce source/freshness/permission/revision rules;
- require success receipt/readback before a model may claim success;
- after ambiguous transport/result, reconcile by operation identity before retry;
- never blindly retry an unknown-commit mutation.

### 7.3 All tools

All tools must:

- return typed results;
- expose minimum necessary data;
- keep retrieval tenant/shop scoped;
- treat model requests as untrusted;
- never treat prompt text as permission;
- omit secrets and unnecessary PII;
- return explicit stale/unknown/unbound states where applicable;
- record sanitized diagnostics;
- respect finite model/tool budgets.

Reuse existing business/commerce modules before creating new services.

---

## 8. State and memory

Keep existing owners first:

- customer/session state;
- product binding;
- commerce/cart state;
- accepted history;
- profile/preferences where authoritative;
- Outbox recovery.

No new durable memory store is approved by this spec.

History means **what was said**. State means **what currently remains true**.

The model may propose a customer-state change; code validates/commits it.

A model statement is never itself a cart/order mutation receipt.

---

## 9. Verification boundary

### 9.1 Runtime hard guard

The runtime guard may block on machine-checkable invariants such as:

- unauthorized PII exposure;
- effect claim without successful receipt;
- protected subject/identity mismatch;
- stale fact/cart binding;
- wrong protected price/stock/policy value where the claim is machine-identifiable;
- forbidden action;
- ownership/handoff violation;
- machine-identifiable contradiction between protected structured claims.

It must **not**:

- reconstruct full customer intent;
- infer concern;
- decide whether the answer is useful;
- choose conversational strategy;
- build a generic free-form Vietnamese semantic-completeness engine.

If a high-impact claim cannot be safely machine-checked, use one of three options:

1. omit it;
2. realize it through an existing bounded code-owned surface;
3. keep the candidate in evaluation until a repeated invariant justifies a narrow typed boundary.

### 9.2 Locked offline quality evaluation

Offline evaluation owns:

- explicit-need completeness;
- context/correction use;
- useful partial answers;
- decision support;
- next-step appropriateness;
- coherence;
- ordinary-language contradiction;
- naturalness.

Silent drop is a **promotion/evaluation hard gate**, not a generic runtime prose parser.

---

## 10. Reuse and non-goals

### Reuse from C3

Retain where applicable:

- admission/ownership;
- business fact envelopes/provenance;
- freshness/binding;
- POS/catalog/Qdrant search;
- policy authority;
- deterministic derivations already proven correct;
- cart/checkout/commerce kernel;
- CAS/fencing;
- effect receipts;
- PII boundaries;
- human handoff;
- accepted history;
- Outbox/delivery;
- existing safety regressions and benchmark assets.

### Not automatically carried into the candidate path

The candidate does not require by default:

- dedicated Customer Input Producer call;
- six-field Strategist;
- three-field Responder;
- online requested-obligation graph;
- requestedObligationIndexes;
- mandatory concern taxonomy;
- semantic handoff grammar;
- guard logic whose only job is validating intermediate semantic representations.

These are not deleted by this spec.

If one later proves necessary, the implementation proposal must identify the repeated failure it prevents and why an existing simpler boundary cannot solve it.

---

## 11. Anti-overengineering constraints

1. No semantic subsystem for one benchmark case.
2. No enum/persistent field solely because one model used a new phrase.
3. No model role without new information/authority that the existing conversational role cannot receive.
4. No new durable state until current owners are proven insufficient.
5. No online reviewer model by default.
6. No general agent-framework dependency unless current TypeScript runtime is proven insufficient.
7. n8n's agent-node shape is only an analogy; this spec adds no n8n runtime dependency.
8. A new semantic abstraction must replace duplicated responsibility or protect a repeated invariant across multiple scenarios.
9. Classify failures as model/context/tool/authority/state/guard before changing architecture.
10. Never hard-code benchmark case IDs/phrases into production behavior.

---

## 12. Security model

### Assets / boundaries

Protect:

- customer identity and PII;
- recipient/checkout data;
- business facts;
- cart/order/payment state;
- credentials;
- ownership;
- mutation permission.

Treat as untrusted:

- customer text;
- retrieved text;
- model output;
- model tool arguments;
- external tool/source responses.

### Required controls

- prompt text never grants permission;
- protected execution identity is server-owned;
- every privileged tool validates schema/scope/authorization;
- mutations use operation identity and revision/fencing;
- ambiguous mutation results reconcile before retry;
- retrieval remains tenant/shop scoped;
- secrets/unnecessary PII stay out of model context;
- effect claims require success receipts;
- logs/traces are sanitized;
- model/tool loop is finite.

### Abuse cases

Test at least:

- prompt injection requesting bypass of tool restrictions;
- invented price/stock without verified data;
- model attempts to override tenant/customer/cart/order identity;
- stale revision mutation;
- duplicate/ambiguous mutation retry;
- malformed/stale tool result;
- PII propagation outside allowed boundary;
- effect claim after failed/ambiguous result;
- loop/token exhaustion attempt.

---

## 13. Paired evaluation protocol

The first implementation is an isolated candidate/shadow path. It must not send live customer messages or mutate live business systems.

### 13.1 Freeze the comparison

Before a promotion-candidate run, current C3 and candidate must use:

- same customer message;
- same accepted history;
- same canonical pre-turn state;
- same business/source snapshot and freshness time;
- same model family/version;
- same thinking/effort;
- same generation parameters that affect output;
- same tool/business data;
- same case set;
- same judge model/configuration or same human rubric/process.

The intended independent variable is **semantic orchestration**.

Call count, latency, token use and tool count are measured outcomes and need not be equal.

If provider limitations prevent a matched setup, record the mismatch and do not attribute the quality delta solely to architecture.

### 13.2 Scenario contract

Each locked scenario should define:

- state before;
- latest customer message;
- relevant business truth;
- required customer outcomes;
- allowed facts/actions;
- forbidden facts/actions;
- deterministic expected state after, when applicable.

Do not require exact prose except where an existing code-owned wording/receipt is itself an invariant.

### 13.3 Promotion hard gates

No promotion if the candidate regresses:

- product/variant subject safety;
- price/stock/policy authority;
- stale cart protection;
- effect permission/receipt;
- PII;
- ownership/handoff;
- revision/CAS behavior;
- deterministic state/effect acceptance;
- explicit customer needs in the locked corpus.

### 13.4 Quality dimensions

Measure both paths on:

- understanding;
- completeness/question resolution;
- context use;
- usefulness/decision support;
- next step;
- naturalness/coherence;
- factual/action safety.

Guard acceptance alone is insufficient.

The numeric quality threshold is an owner decision and must be frozen before the first promotion-candidate run.

---

## 14. Complexity and operational measurements

Record baseline and candidate values for:

- online model roles;
- model invocations per turn;
- tool rounds/calls;
- semantic representations crossed before final reply;
- semantic validators/mappers;
- hard guards;
- end-to-end latency;
- token/cost usage;
- provider errors;
- fallback/handoff/guard reasons.

The candidate fails the architectural objective if quality improves only by recreating Producer -> planner -> writer under new names.

No latency or cost improvement is claimed in advance.

---

## 15. Alternatives considered

| Alternative | Why not default |
|---|---|
| Continue patching current C3 | Appropriate for local bugs, but repeated semantic gaps risk more representations/validators without proving end-to-end quality |
| Producer -> one final model | Still allows upstream semantic compression to become the final model's only view |
| Two-model interpreter -> responder | Still creates a semantic telephone unless the split proves measurable value |
| Full rewrite | Loses hard-earned authority/cart/PII/effect/delivery protections |
| Adopt n8n/general agent runtime | Useful mental model, but a new framework is unnecessary until current runtime is proven insufficient |
| Single conversational owner + existing tools | Smallest experiment that changes semantic ownership while preserving business/safety core |

Rejected alternatives may be revisited only with new evidence.

---

## 16. Experiment, migration and rollback

Implementation, if approved, should proceed in this order:

1. isolated candidate runner with existing read-only business tools;
2. deterministic/frozen-corpus comparison;
3. real-model paired comparison;
4. stateful fake-port journeys;
5. bounded opt-in with current fallback;
6. only after acceptance, plan deprecation of superseded semantic roles.

Before production opt-in:

- current C3 remains rollback;
- candidate has kill switch/opt-in;
- no irreversible schema migration;
- no candidate-only durable state requirement;
- ambiguous effects are never blindly retried.

Do not keep two permanent architectures.

If the candidate does not produce clear quality improvement, delete the experiment rather than preserve neutral complexity.

---

## 17. Implementation constraints

### Stack

Current baseline:

- Node.js >= 22;
- pnpm 10.12.4;
- TypeScript 5.8.3;
- Vitest 3.2.4.

No new runtime dependency is approved by this spec.

Any version-sensitive provider/tool-call API must be checked against current official documentation during implementation.

### Existing ownership areas

Expected reuse:

- `apps/worker/src` for orchestration/candidate runner;
- `packages/business-tools` for verified business/search capabilities;
- `packages/commerce-kernel` for cart/order/effect authority;
- `packages/contracts` only for stable cross-boundary types;
- existing chat/conversation runtime/provider abstractions;
- existing benchmark/evaluation assets.

This spec does not authorize moving modules just to match the architecture diagram.

### Code style

- narrow typed interfaces at privileged business/action boundaries;
- natural-language context is not forced into enums unless code actually needs the enum;
- model output never directly mutates authoritative state;
- explicit typed status for stale/unknown/ambiguous results;
- avoid pass-through wrappers;
- no benchmark-case switches.

---

## 18. Verification strategy

Implementation follows RED -> GREEN -> REFACTOR where practical.

### Unit

Cover:

- tool argument validation;
- protected server-owned execution identity;
- freshness/binding/revision;
- mutation idempotency;
- ambiguous-result reconciliation;
- deterministic derivations;
- runtime hard guard;
- loop budget/fallback.

### Integration

Cover:

- model/tool adapter with fake model outputs;
- independent tools in one round;
- dependent second tool round;
- state update/readback;
- malformed/stale tool output;
- hard stop/handoff;
- PII boundaries.

### Stateful runtime

Using fake business/history/commit/delivery ports, verify:

- cross-turn state;
- corrections;
- cart mutation/readback;
- checkout/effect boundaries;
- fallback/ownership transitions.

### Real-model evaluation

Persist exact:

- source SHA;
- model/version/config;
- prompt/context inputs;
- tool requests/results;
- final reply;
- guard/evaluation result.

Schema completion or runtime guard acceptance is not a quality pass.

Workspace commands for later implementation verification are:

~~~bash
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm check
~~~

This spec PR does not claim those commands were run.

---

## 19. Boundaries

### Always

- preserve business authority/freshness/product/cart bindings;
- preserve PII/effect/ownership/Outbox invariants;
- validate privileged tool boundaries;
- keep protected execution identity server-owned;
- keep model/tool loop finite;
- compare candidate/baseline on frozen paired inputs;
- report actual model/tool call counts and failures.

### Ask first

- new durable state/schema;
- new model/provider dependency;
- new external integration;
- auth/PII boundary change;
- new production tool permission;
- live traffic;
- C3 removal;
- evaluation threshold change after a run starts.

### Never

- live-send experiment output without rollout approval;
- use simulation facts as production authority;
- let prompt text grant permission;
- let model output directly commit cart/order/payment effects;
- add benchmark-specific production branches;
- weaken guard/assertions to improve acceptance;
- claim quality closure from guard acceptance;
- add generic runtime free-form semantic completeness checking;
- use an unbounded agent loop;
- delete current safety behavior before parity is proven.

---

## 20. Spec acceptance criteria

This spec is ready for implementation planning only if reviewers agree that:

1. the customer-facing quality objective is explicit;
2. evidence for the experiment is stated without claiming current C3 is globally broken;
3. ownership is clear: model owns conversation; code owns reality/authority/effects;
4. current C3 business/safety infrastructure to reuse is named;
5. runtime hard safety is separated from offline conversational-quality evaluation;
6. protected tool identity and mutation idempotency are explicit;
7. history selection has a simple first-experiment owner and does not add another semantic model;
8. model calls are driven by new world information, with independent tools sharing a round;
9. the paired evaluation isolates semantic orchestration as the intended independent variable;
10. anti-overengineering and migration/rollback constraints are explicit;
11. this PR changes no runtime behavior.

Human approval is required before implementation planning.

---

## 21. Open owner decisions

1. **Promotion threshold:** exact paired judge/human quality threshold to freeze before promotion-candidate evaluation.
2. **First-contact lane:** preserve current fixed first-contact unchanged initially, or include it in the paired candidate corpus.
3. **Hard model/tool-loop cap:** target is 1 call with no tools, 2 with one independent tool round, 3 only for dependent work; freeze the exact production cap after baseline measurement.
4. **Candidate name:** keep "C3 single-agent candidate" or use a neutral experiment name.

---

## 22. Decision summary

~~~text
MODEL
  understand + reason + converse
      |
      v
HARDENED CODE TOOLS
  truth + state + permissions + effects
      |
      v
SAME CONVERSATIONAL ROLE
  continue with new world information
      |
      v
RUNTIME HARD GUARD
  machine-verifiable safety only
      |
      v
OUTBOX
~~~

Offline locked evaluation, not the runtime guard, decides whether the conversation is complete, useful and natural.

The experiment succeeds only if this smaller semantic path produces a measurably better chatbot while preserving the hard-earned business and safety invariants of C3.
