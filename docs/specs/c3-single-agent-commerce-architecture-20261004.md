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

### 7.1 Bounded subject references, not model-authored identity

The model may choose **which in-scope subject the customer is referring to**. It may not invent or override protected business identity.

For every turn, runtime/tools should expose a bounded set of references for subjects already in scope, for example products returned by search, the currently bound product/variant, or cart lines. The reference may reuse an existing scoped ID if that ID is already safe; this spec does **not** require a new opaque-handle subsystem.

The invariant is:

- runtime/tool issues or allowlists the reference for this turn;
- model may select that reference because it understands the customer's language;
- code resolves the reference to protected product/variant/cart/order identity;
- code re-checks tenant/customer/conversation scope, freshness/binding and revision;
- model cannot name an arbitrary protected resource outside the supplied reference set;
- ambiguous/stale reference selection returns clarification/refresh, never a guessed identity.

Conceptually:

~~~ts
type SubjectRef = {
  ref: string;               // server-issued or server-allowlisted for this turn
  kind: "PRODUCT" | "VARIANT" | "CART_LINE";
  label: string;             // customer-visible context, not authority
  bindingVersion?: string;   // optional existing freshness/binding token
};
~~~

The exact representation should reuse existing binding/reference types where possible.

### 7.2 Model-visible mutation arguments are minimal

Prefer:

~~~ts
type ChangeCurrentCartVariantRequest = {
  subjectRef: string;
  component: "TOP" | "BOTTOM" | "SET";
  requestedSize: string;
};
~~~

Do not let the model choose protected execution identity such as:

- tenant;
- customer;
- conversation;
- raw cart/order ID outside the supplied subject-reference set;
- authorization scope;
- current revision.

Those come from trusted server-side execution context.

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

### 7.3 Mutations need idempotency and readback

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
- validate model arguments and selected subject reference;
- enforce tenant/customer/conversation/cart binding;
- enforce source/freshness/permission/revision rules;
- require success receipt/readback before a model may claim success;
- after ambiguous transport/result, reconcile by operation identity before retry;
- never blindly retry an unknown-commit mutation.

### 7.4 All tools

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

No new durable semantic-memory store is approved by this spec.

History means **what was said**. State means **what currently remains true**.

### 8.1 Same-agent state proposal

Removing Producer must not create a new extractor model under another name.

The same conversational owner may propose bounded state operations for **existing writable customer-state fields**. The implementation plan must derive the allowlist from current state owners rather than inventing a universal semantic schema.

Conceptually, only simple operations are needed:

~~~ts
type CustomerStateOp =
  | { op: "SET"; field: ExistingWritableCustomerField; value: unknown }
  | { op: "CLEAR"; field: ExistingWritableCustomerField }
  | { op: "REPLACE"; field: ExistingWritableCustomerField; value: unknown };
~~~

Every proposed operation is bound by code to the current source message and, where the existing state owner supports it, the expected state revision.

Code validates:

- field is on the existing writable allowlist;
- value shape/domain is valid;
- source message belongs to the current conversation/turn;
- current correction/clear/replace semantics are respected;
- stale revision/conflict is rejected or re-read;
- business facts, protected identity, cart/order/payment state and effect receipts are **not** writable customer fields.

The model may propose a state update and request a domain tool from the same conversational turn. No second semantic model is required.

### 8.2 Reference selection and state commit are distinct

For a message such as:

> "Không lấy mẫu đang trong giỏ nữa; lấy mẫu thứ hai lúc nãy, áo M, quần L. Chưa chốt nhé."

the intended ownership is:

~~~text
runtime supplies bounded refs for current cart item + prior candidate(s)
        |
        v
same conversational model
- selects the supplied ref that "mẫu thứ hai" refers to
- proposes allowed customer-state corrections/preferences
- does NOT infer purchase commitment from "chưa chốt"
        |
        v
code
- validates selected ref -> protected identity
- validates SET/CLEAR/REPLACE operations against existing state owners
- commits only valid customer-state changes
- performs no cart/order effect unless a separately authorized action exists
~~~

If the reference is ambiguous or stale, no state/effect commit is guessed; the conversational model receives the bounded failure and clarifies.

A model statement is never itself a cart/order mutation receipt.

---

## 9. Protected egress and verification boundary

The candidate must preserve the repository's durable model-claim boundary:

> code verifies every protected claim and rejects undeclared protected claims.

Protected claims include the existing durable categories such as price, stock, size/fit recommendation, ETA, shipping/freeship, promotion/offer, product media and effect claims.

### 9.1 Minimal output contract

The candidate should not introduce a new claim graph. It should reuse the existing verified evidence/claim boundary and keep the model's output surface minimal.

Conceptually, the model owns:

- conversational free text for acknowledgement, customer context, reasoning glue, questions and transitions;
- selection/order of verified protected facts that are relevant;
- requested actions through bounded tool calls.

Protected business content is declared through an existing or minimal structured reference to verified evidence/receipt. Code resolves and realizes that protected content from authoritative data.

Conceptual shape only:

~~~ts
type CandidateReply = {
  freeText: string[];
  protectedClaimRefs: string[]; // reuse existing claim/evidence refs where possible
};
~~~

This is not approval for a new standalone schema if the existing responder/evidence contract can express the same boundary more simply.

### 9.2 Protected prose invariant

Free text must not become a second channel for undeclared business facts.

For protected claims:

- subject comes from verified bound evidence/receipt;
- protected value and material condition come from verified evidence;
- negation/availability semantics are preserved by the verified realization;
- freshness remains attached to the underlying evidence;
- an effect-success commitment requires a success receipt/readback.

The model may choose **which** verified claim to use and where it belongs conversationally, but it may not manufacture or paraphrase a protected value in an undeclared free-text channel.

The first candidate retains the existing durable undeclared-claim rejection/repair boundary rather than replacing it with a new generic Vietnamese semantic parser.

If surrounding free text changes subject, reverses negation, drops a material condition, strengthens a commitment, or introduces an undeclared protected claim, the proposal must fail closed under the existing claim boundary. A single bounded repair may be attempted using safe reason codes and already verified evidence. After bounded failure, use the existing safe clarification/handoff behavior while preserving independently verified context.

If the current durable claim boundary cannot enforce this guarantee for the candidate's output form without adding a new broad language-understanding subsystem, the candidate remains **evaluation-only**. The spec does not weaken the existing claim guarantee to make the architecture simpler.

Required adversarial coverage includes:

- protected claim outside the declared protected surface;
- correct value attached to the wrong subject;
- negation inversion;
- dropped material condition;
- stale evidence;
- effect-success wording without receipt.

### 9.3 Runtime hard guard vs offline quality

The runtime hard guard owns machine-verifiable authority, permission, effect and privacy invariants. It must not decide whether the answer is useful, reconstruct full customer intent, infer concern, or become a generic semantic-completeness engine.

Locked offline evaluation owns:

- explicit-need completeness;
- context/correction use;
- useful partial answers;
- decision support;
- next-step appropriateness;
- coherence/naturalness.

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

## 13. Evaluation protocol

The first implementation is an isolated candidate/shadow path. It must not send live customer messages or mutate live business systems.

The PR base SHA is documentation provenance, not automatically the experiment baseline.

### 13.1 Experiment manifest and substrate

Every comparison run must record:

~~~text
implementationBaseSha
comparisonBaselineSha
businessSafetySubstrate identity/config
model/provider/version
thinking/effort
generation parameters
history/truncation policy
business/source snapshot + freshness time
corpus identity
rubric/judge identity
request/run identity
~~~

For an architecture-isolation claim, candidate and C3 should share the same accepted business/safety substrate. The intended independent variable is semantic orchestration.

If the candidate also changes authority adapters, policy data, context richness or other substrate behavior, the result may still be useful, but it must be reported as a **package-level improvement**, not proof that semantic orchestration alone caused the delta.

### 13.2 Development evidence

Development may start with a small corpus, but it must include both:

1. **Paired single-turn evidence** — same message/history/pre-state/business truth to compare the decision/reply for one turn.
2. **Stateful journey evidence** — same initial state and customer scenario, then each path continues using the history/state/effects it actually produced.

The journey corpus must include clear customer follow-up branches where the two paths ask different questions. It must not reset canonical state from a perfect fixture on every turn.

"No silent drop" is evaluated from the raw customer message/history to the customer-visible outcome, not only from model-extracted obligations to outcomes.

### 13.3 Scenario contract

Each locked scenario defines:

- initial/pre-turn state;
- latest customer message or scripted customer branch;
- relevant business truth;
- required customer outcomes;
- allowed facts/actions;
- forbidden facts/actions;
- deterministic expected state/effect when applicable.

Exact prose is not required except where an existing code-owned receipt/policy surface is itself an invariant.

### 13.4 Promotion protocol must be preregistered

Before a promotion-candidate run, freeze:

- exact baseline/candidate source identities;
- dev corpus vs sealed holdout;
- history window/truncation policy;
- rubric and numeric/minimum-improvement threshold;
- blind/randomized A/B ordering;
- tie and judge-disagreement handling;
- repeated-generation/variance policy where nondeterminism matters;
- retry policy and accounting for every attempt;
- exact provider/model/request identity;
- corpus/rubric provenance.

Thresholds and rubric do not change after results are observed.

The whole population is accounted for: accepted replies, rejects, timeouts, fallbacks and handoffs. A safe handoff may still be a quality failure when the bot had enough information to answer.

### 13.5 Promotion hard gates

No promotion if the candidate regresses:

- product/variant subject safety;
- protected claim authority;
- stale cart protection;
- effect permission/receipt;
- PII;
- ownership/handoff;
- revision/CAS behavior;
- deterministic state/effect acceptance;
- explicit customer needs in the locked corpus.

Quality dimensions for both paired turns and journeys:

- understanding;
- completeness/question resolution;
- context use;
- usefulness/decision support;
- next step;
- naturalness/coherence;
- factual/action safety.

Guard acceptance alone is insufficient.

---

## 14. Structural and operational gates

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

### 14.1 "Do not build C3 again" is a pass/fail gate

Promotion fails if the candidate introduces any of these patterns:

- model-authored semantic artifact whose only purpose is to feed another model role;
- separate semantic model role without new world information that the current conversational role could consume directly;
- domain tool that silently becomes an intent/concern/language classifier;
- runtime guard that reconstructs intent, completeness or conversational strategy;
- new durable semantic state when existing state owners are sufficient;
- new semantic boundary that adds responsibility without retiring/replacing an old semantic responsibility.

For representative scenarios, the experiment must trace one raw customer need from message -> model -> tool/state -> final customer outcome and identify every semantic mapper/validator crossed in baseline and candidate.

No fixed percentage quota is required. The gate is qualitative but falsifiable: reviewers must be able to point to which C3 semantic responsibilities disappeared or collapsed. A candidate that merely renames Producer -> planner -> writer does not pass.

Operational metrics remain outcomes, not architecture targets by themselves. No latency or cost improvement is claimed in advance.

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

## 16. Experiment, recovery, migration and rollback

Implementation, if approved, proceeds in this order:

1. isolated candidate runner with existing read-only business tools;
2. paired single-turn and stateful fake-port evaluation;
3. real-model paired/journey comparison;
4. stateful mutation tests with fake ports;
5. **production persistence/business adapters against ephemeral/test infrastructure, external send disabled**;
6. only after the previous gates pass, bounded opt-in with current fallback;
7. only after acceptance, plan deprecation of superseded semantic roles.

### 16.1 Pre-effect vs post-effect recovery

Fallback semantics must distinguish whether durable state/effect has committed.

**Before any durable commit:** the runtime may safely abandon the candidate attempt and use an approved fallback path, subject to normal duplicate-source controls.

**After a durable state/effect commit:** the original turn must not be replayed from the pre-turn snapshot as if nothing happened.

After commit:

- receipt/current committed state becomes the recovery source of truth;
- sourceMessageId and operationId remain attached to the recovery attempt;
- fallback/continuation receives committed state/receipt;
- mutating tools are suppressed or idempotency/reconciliation proves replay is safe;
- guard rejection, model timeout or loop exhaustion does **not** roll back an already committed business effect;
- if a safe deterministic receipt acknowledgement exists, it may be used; otherwise use a bounded handoff/clarification based on committed state;
- accepted history must not record an unsent rejected draft as customer-visible output;
- Outbox retry retries delivery of an accepted reply, not the business effect.

For an `AMBIGUOUS` mutation result, reconciliation by operation identity happens before any lane fallback or action replay that could repeat the effect.

For multiple mutations in one turn, each committed operation has its own operation identity/receipt and recovery accounts for the committed prefix.

### 16.2 Real-adapter send-disabled gate

Before any production opt-in, focused verification must use the real persistence/business adapter path with ephemeral/test DB or equivalent isolated infrastructure and external customer send disabled.

At minimum prove:

- stale DB revision;
- duplicate source message;
- crash/timeout after committed mutation;
- ambiguous mutation reconciliation;
- operationId idempotency;
- accepted-history/Outbox recovery;
- no duplicate side effect across fallback/retry.

This is boundary verification, not a production-scale rollout requirement.

### 16.3 Rollback

Before production opt-in:

- current C3 remains rollback for future/uncommitted turns;
- candidate has kill switch/opt-in;
- no irreversible schema migration;
- no candidate-only durable state requirement.

A kill switch does not undo already committed effects.

Do not keep two permanent architectures. If the candidate does not produce clear quality improvement, remove the experiment rather than preserve neutral complexity.

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

- tool argument/reference validation;
- server-owned protected execution identity;
- state SET/CLEAR/REPLACE validation against existing writable owners;
- source/revision conflicts;
- freshness/binding/revision;
- mutation idempotency;
- ambiguous-result reconciliation;
- protected-claim egress and existing undeclared-claim rejection;
- wrong-subject / negation / condition / no-receipt adversarial cases;
- deterministic derivations;
- loop budget/fallback.

### Integration

Cover:

- model/tool adapter with fake model outputs;
- bounded subject reference selection -> protected identity validation;
- same-agent state proposal + domain tool request;
- independent tools in one round;
- dependent second tool round;
- state update/readback;
- malformed/stale tool output;
- post-effect model/guard failure without effect replay;
- hard stop/handoff;
- PII boundaries.

### Stateful runtime

Using fake ports first, then the real-adapter send-disabled gate from §16.2, verify:

- cross-turn state produced by the path itself;
- corrections/referent changes;
- cart mutation/readback;
- checkout/effect boundaries;
- crash/retry after commit;
- duplicate source-message handling;
- accepted-history/Outbox recovery;
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

- preserve the durable protected-claim boundary; do not weaken it for conversational freedom;
- preserve business authority/freshness/product/cart bindings;
- preserve PII/effect/ownership/Outbox invariants;
- let the model select only runtime-supplied/allowlisted subject references;
- validate privileged tool/state boundaries in code;
- keep protected execution identity server-owned;
- keep model/tool loop finite;
- distinguish pre-effect fallback from post-effect recovery;
- compare candidate/baseline on frozen manifests;
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
5. protected egress preserves the durable "verify every protected claim / reject undeclared claims" contract;
6. referent selection uses a bounded runtime-supplied reference set while code retains protected identity authority;
7. same-agent state patching is limited to existing writable state owners and does not recreate Producer;
8. mutation idempotency plus post-effect recovery prevents replay after committed effects;
9. paired evaluation records exact baseline/candidate/substrate provenance and includes stateful journeys;
10. promotion protocol has preregistered holdout/rubric/accounting rules;
11. "do not build C3 again" is a falsifiable structural gate, not only a principle;
12. real-adapter send-disabled verification is required before opt-in;
13. runtime safety guards remain distinct from offline conversational-quality evaluation;
14. this PR changes no runtime behavior.

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
  understand + select bounded refs
  + propose existing-state updates
      |
      v
HARDENED CODE TOOLS / STATE OWNERS
  identity + truth + permissions + effects
      |
      v
VERIFIED PROTECTED EGRESS
  protected facts/receipts remain code-verifiable
      |
      v
SAME CONVERSATIONAL ROLE
  continue with new world information
      |
      v
RUNTIME HARD GUARD
  authority/effect/privacy only
      |
      v
OUTBOX
~~~

After any committed state/effect, recovery continues from the committed state/receipt; it does not replay the turn from pre-state.

Offline locked evaluation, not the runtime guard, decides whether the conversation is complete, useful and natural.

The experiment succeeds only if this smaller semantic path is measurably better across paired turns **and stateful journeys**, preserves the durable claim/effect safety contract, and passes the structural "do not build C3 again" gate.
