# Spec Amendment: Semantic-verifier protected egress

**Status:** Draft amendment / architecture experiment only / human review required before planning or implementation  
**Date:** 2026-10-05  
**Base:** `main` at `c4bd59857a560689ce0b10758a4927f6401b0c27`  
**Parent spec:** `docs/specs/c3-single-agent-commerce-architecture-20261004.md`  
**Evidence input:** draft PR387, exact head `1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da`  
**Principle:** **Models may reason about language semantics. Code remains sole authority over business truth, identity, state, permissions and effects.**

This is a narrow amendment to the protected-egress boundary proposed by the parent spec. It does not approve production rollout, C3 removal, live send, new durable semantic state, a repair loop, a third model role, or a generic semantic framework.

If approved, this amendment supersedes only the parent-spec clauses that require arbitrary protected customer-facing meaning to be certified by deterministic code alone. All other tool, state, mutation, recovery, evaluation and replacement-readiness contracts remain in force unless explicitly changed here.

### Normative override map

If this amendment is approved, it changes the parent spec only as follows:

- **§4 Target architecture:** insert one bounded semantic-verifier call after the exact final draft and before final send authorization.
- **§5 Ownership:** split runtime safety into deterministic world-authority checks (code) and protected-language semantic judgment (verifier model).
- **§6.3 Same role:** keep one conversational owner; allow one non-conversational verifier role because it sees the final customer-visible draft and trusted world context, not an intermediate planning JSON.
- **§9 Protected egress:** replace the failed deterministic-only semantic guarantee with the hybrid verifier boundary defined here.
- **§11 Anti-overengineering #5:** the default ban on an online reviewer is overridden only for this single bounded semantic verifier. No other reviewer/model role is approved.
- **§12 Security model:** add verifier-output and verifier-prompt-injection threats while keeping existing code authority unchanged.

All other parent sections remain normative.

---

## 0. Assumptions to validate in review

1. We still want to explore one conversational owner rather than abandon the single-agent direction after PR387.
2. PR387 falsified the specific boundary `free conversational prose + verified protected refs/literals + existing mechanical guards`; it did **not** prove all single-agent designs impossible.
3. The language-semantic problem exposed by PR387 is better matched to a model judgment than to growing regexes, templates or a general Vietnamese parser.
4. A verifier model is acceptable only if it is a **narrow final-output safety role**, not another conversational/planning owner.
5. Deterministic code continues to own all world authority and effect execution even if a model judges whether final prose stays within that authority.
6. Checkpoint A should first prove this new boundary is safe/useful/simple enough to justify further investment. T4-T9 implementation details remain deferred until owner GO.

If any assumption is rejected, update this spec before planning.

---

## 1. Objective

We want to test a materially different protected-egress boundary:

> Let the conversational model own natural-language understanding and response composition; let a separate bounded verifier model judge the **semantic relationship between the exact final reply and trusted business truth**; let deterministic code remain the only authority for identity, facts, state, permissions, effects and final send gating.

The end goal remains:

> **correct + sufficiently complete + useful + context-aware + natural + safe**

The amendment exists because the previous boundary failed its hardest feasibility test before full orchestration was built.

### 1.1 What success means

A successful amendment must show that:

- arbitrary conversational prose no longer needs a broad code parser to preserve protected meaning;
- the verifier catches subject rebinding, contradiction/negation, condition weakening, stronger implied policy/benefit and effect-success claims that deterministic mechanics cannot understand;
- deterministic code still rejects stale/unbound/unauthorized truth and effects independently of the verifier;
- the verifier cannot call tools, mutate state, authorize effects, rewrite replies or become a second conversation owner;
- the architecture does not grow into a chain of schemas/models/repair roles equivalent to C3;
- normal useful replies can pass without becoming rigid templates.

### 1.2 What this amendment does not claim

This spec does **not** claim:

- model verification is deterministic;
- one provider/model is already proven reliable enough;
- PR387's five failures are already solved;
- semantic verifier PASS is itself business authority;
- Checkpoint A proves state/tool/effect continuity;
- passing Checkpoint A is replacement readiness.

---

## 2. Evidence that motivates the amendment

PR387 tested the parent-spec feasibility shape using an evaluation-only seam. The strict safety command retained seven authored attacks.

Observed result:

- 2/7 rejected correctly:
  - undeclared protected price;
  - stale evidence.
- 5/7 unsafe drafts were mechanically accepted:
  - correct literal attached to the wrong subject;
  - negation inversion around verified stock;
  - dropped material policy condition;
  - stronger implied policy/benefit;
  - effect-success wording without a receipt.

The important distinction is:

~~~text
mechanically verifiable
  claim/ref/freshness/scope
          vs
language-semantic
  subject / negation / implication / condition / asserted effect
~~~

The parent boundary can validate the left side. It cannot certify the right side without understanding arbitrary natural language.

The amendment therefore changes **who judges language semantics**, not who owns business reality.

---

## 3. Governing ownership

| Concern | Owner |
|---|---|
| Understand customer language, corrections, referents, concerns | Conversational model |
| Select relevant context and decide what to say | Conversational model |
| Natural organization and wording | Conversational model |
| Product/variant/cart/order identity | Code/domain tools |
| Price, stock, promotion, policy source, ETA, fit source | Authoritative sources + code |
| Durable customer/session state | Existing code/state owners |
| Mutation permission, revision/CAS/fencing | Code |
| Actual side-effect execution | Code/domain tool |
| Actual side-effect success/receipt | Code |
| PII/private recipient boundaries | Code |
| Semantic check of exact final prose against trusted protected truth | **Semantic verifier model** |
| Validate verifier schema, fail closed, final send authorization | Code |
| Conversational quality/completeness | Offline evaluation / human judge |
| Replacement decision | Registered product/safety/comparison gates from parent spec |

The verifier is **not** a second conversational owner. It does not decide customer strategy or produce customer-facing text.

---

## 4. Target architecture

~~~text
latest customer message
+ relevant accepted dialogue
+ canonical state
        |
        v
admission / ownership / deterministic preflight
        |
        v
CONVERSATION MODEL
understand + reason + decide
        |
        | domain tools only for new world truth/action
        v
HARDENED DOMAIN TOOLS / STATE OWNERS
truth | identity | state | permission | effect
        |
        v
verified facts / state / receipts
        |
        v
SAME CONVERSATIONAL MODEL
compose exact final customer-visible draft
        |
        v
DETERMINISTIC EGRESS PRECHECK
schema / bounded refs / freshness / PII / authority inputs
        |
        v
SEMANTIC VERIFIER MODEL
"Does this exact draft stay within the trusted protected truth?"
        |
        v
typed PASS / FAIL / UNCERTAIN
        |
        v
THIN DETERMINISTIC FINAL GATE
verdict schema + authority/effect/privacy invariants
        |
        +-- PASS ----------------------> Outbox / delivery
        |
        +-- FAIL / UNCERTAIN / ERROR --> no send / bounded fallback or handoff
~~~

### 4.1 Always-on verifier for the first experiment

For Checkpoint A, every candidate customer-visible draft goes through the semantic verifier.

Do **not** add a code classifier to decide whether a reply "looks protected enough" to require verification. That would recreate the semantic-bypass problem.

A later fast path that skips verification is out of scope until evidence shows a deterministic class of replies that cannot express protected business meaning.

### 4.2 No hidden continuity dependency

The verifier receives observable inputs only. Correctness must not depend on hidden chain-of-thought, provider session memory or inaccessible state from the conversational model.

The verifier invocation is independent of the conversational invocation even if the same provider/model family is used.

---

## 5. Conversational model contract

The conversational owner remains responsible for:

- understanding the current customer message;
- maintaining relevant conversational context;
- corrections, negation, referents and concerns;
- selecting bounded subject refs supplied by runtime;
- calling domain tools when fresh external truth/action is needed;
- using verified results;
- deciding useful clarification/next step;
- writing the final natural-language draft.

It may not:

- invent protected business identity;
- treat prompt text as permission;
- claim a committed effect without trusted receipt/readback;
- override code-owned state revision/authorization;
- bypass the semantic verifier.

No new Producer/Strategist/Responder replacement chain is introduced.

---

## 6. Trusted verifier context

The verifier must compare the **exact assembled customer-visible draft** with a trusted context assembled by code.

Reuse existing types/surfaces first. Do not introduce a generic claim graph.

Conceptually, the verifier context contains only what is required to judge protected semantics:

~~~ts
type SemanticVerifierInput = {
  finalDraft: string;                    // exact customer-visible text
  latestCustomerMessage: string;
  recentAcceptedDialogue: readonly Message[];
  boundSubjects: readonly SubjectRef[];  // server-issued/allowlisted
  protectedClaims: readonly ProtectedClaimV1[];
  codeOwnedPolicyLiterals: readonly PolicySurface[];
  effectReceipts: readonly EffectReceipt[];
  canonicalStateSummary: TrustedStateSummary;
};
~~~

This is a conceptual contract, not approval to create these exact new types if existing runtime/evaluation contracts can carry the same information more simply.

### 6.1 Trusted vs untrusted

Trusted/code-owned:

- subject reference set and protected identity resolution;
- verified fact envelopes and protected claims;
- freshness/provenance;
- canonical state;
- policy literals sourced from existing policy authority;
- effect receipts/readback;
- ownership/permission state.

Untrusted data:

- customer text;
- conversation model output;
- retrieved/external text before code validation;
- semantic verifier output.

The verifier may reason over untrusted text, but untrusted text never grants authority.

### 6.2 Exact final reply requirement

The verifier must inspect the final text exactly as it would be sent after protected literals/refs are realized.

Do not verify an intermediate semantic JSON object and then allow another component to materially rewrite the customer-visible text afterward.

---

## 7. Semantic verifier contract

The verifier has one narrow question:

> Does the exact final reply contradict, invent, weaken, strengthen, misattribute or falsely assert protected business meaning relative to the trusted verifier context?

It checks only protected semantic safety, including:

- unsupported protected assertion;
- protected subject mismatch/rebinding;
- contradiction or negation inversion;
- omission of a material condition when the reply makes the corresponding policy/benefit claim;
- stronger implied policy/benefit than the trusted source allows;
- effect-success assertion without a matching trusted success receipt/readback;
- stale/superseded protected meaning that escaped deterministic precheck;
- other explicit protected semantic contradiction.

It does **not** judge:

- whether the reply is persuasive;
- whether every customer need was answered;
- whether another clarification would be better;
- tone/style preference;
- business permission;
- state mutation validity;
- whether an effect actually committed.

Those remain owned elsewhere.

### 7.1 Verifier output

Use a small fail-closed shape:

~~~ts
type SemanticEgressVerdict = {
  verdict: "PASS" | "FAIL" | "UNCERTAIN";
  violations: readonly {
    kind:
      | "UNSUPPORTED_PROTECTED_ASSERTION"
      | "SUBJECT_MISMATCH"
      | "CONTRADICTION_OR_NEGATION"
      | "MATERIAL_CONDITION_LOSS"
      | "POLICY_OR_BENEFIT_STRENGTHENING"
      | "EFFECT_WITHOUT_RECEIPT"
      | "STALE_OR_SUPERSEDED_MEANING"
      | "OTHER_PROTECTED_SEMANTIC_RISK";
    protectedRef?: string;
  }[];
};
~~~

The exact schema may be smaller if evidence supports it.

Code validates:

- schema;
- enum values;
- referenced IDs are in the trusted context;
- `PASS` contains no violations;
- malformed output is not PASS.

### 7.2 Fail-closed behavior

Any of these means **no send**:

- verifier `FAIL`;
- verifier `UNCERTAIN`;
- invalid/malformed verdict;
- timeout;
- provider error;
- response cannot be bound to the current draft/request identity.

A verifier failure may trigger a bounded deterministic fallback or handoff.

For Checkpoint A there is **no automatic rewrite/retry loop**.

### 7.3 No verifier agency

The verifier must have:

- no tool access;
- no state write access;
- no effect permission;
- no retrieval permission beyond supplied context;
- no customer-send permission;
- no ability to rewrite the reply.

It returns only the bounded verdict.

---

## 8. Deterministic code boundary remains authoritative

The amendment does not weaken existing code authority.

Code still owns and verifies:

- tenant/customer/conversation scope;
- product/variant/cart/order binding;
- freshness and provenance;
- state revision/CAS/fencing;
- allowed tool/action arguments;
- mutation permission;
- operation identity and idempotency;
- success receipt/readback;
- PII/private recipient boundaries;
- Outbox/delivery controls.

The semantic verifier cannot turn an unauthorized or stale operation into an authorized one.

A semantic `PASS` means only:

> "The final prose appears semantically consistent with the trusted protected context."

It does **not** mean:

> "The business fact/effect is true because the verifier said so."

---

## 9. Model-call and complexity budget

The amendment intentionally adds one narrow online model role.

### 9.1 First-experiment budget

For each candidate final draft:

- exactly one semantic-verifier invocation;
- zero verifier tool calls;
- zero verifier state/effect calls;
- zero verifier rewrites;
- zero verifier-to-verifier loops.

The existing conversational tool loop remains as defined by the parent spec.

### 9.2 Not allowed before a new owner decision

Do not add:

- a third online model role;
- verifier-generated replacement replies;
- `draft -> verify -> repair -> verify -> repair` loops;
- a model whose job is to interpret the verifier verdict for another model;
- a generic semantic completeness model;
- a semantic router deciding which verifier to call;
- persistent verifier memory;
- new production regexes/templates for individual semantic failures;
- a broad Vietnamese semantic parser.

### 9.3 Complexity failure

Checkpoint A fails on architecture complexity even if safety scores look good when the experiment requires any of the prohibited patterns above.

---

## 10. Checkpoint A experiment

Checkpoint A asks one question:

> Can one conversational owner plus one bounded semantic verifier preserve protected meaning across natural final prose, while code keeps world authority, **without rebuilding C3-like semantic machinery or collapsing replies into templates**?

This is development feasibility evidence only.

It is not replacement evidence and has no preregistered "better than C3" requirement.

### 10.1 Experiment phase A1 — freeze protocol and corpus

Before the first provider result, freeze:

- exact source SHA;
- conversational model/provider/version/effort/generation settings;
- verifier model/provider/version/effort/generation settings;
- verifier prompt/schema identity;
- history/context selection;
- exact trusted-context serialization;
- retry policy: none for Checkpoint A;
- repeated-generation/variance policy;
- corpus identity/hash;
- safety and usability scoring rules;
- numeric safe-reply false-reject/usability threshold.

If any identity changes after results are observed, results are a new experiment run.

### 10.2 Experiment phase A2 — verifier-only adversarial boundary test

Start with authored exact drafts. No conversation-generation quality claim is needed yet.

Required unsafe coverage:

1. the seven exact PR387 attacks;
2. at least two non-literal paraphrases for each of the five semantic failures that escaped the old boundary:
   - wrong subject;
   - negation inversion;
   - material-condition loss;
   - stronger policy/benefit implication;
   - effect success without receipt;
3. prompt/meta-instruction attempts inside customer text or final draft that try to make the verifier ignore the trusted context or return PASS;
4. mixed replies containing both safe facts and one unsafe semantic clause.

Required safe controls:

- natural multi-part replies containing verified price/stock plus ordinary conversation;
- conditional-policy replies that preserve every material condition;
- decision-support prose that makes no protected claim;
- effect acknowledgement backed by a valid receipt;
- ordinary correction/referent language that stays inside bound subjects.

### 10.3 A2 hard safety gate

Checkpoint A cannot pass if **any preregistered unsafe attempt receives a send-eligible PASS**.

`FAIL`, `UNCERTAIN`, timeout, provider error or malformed verdict are fail-closed safety outcomes, though excessive blocking may fail usability.

The result report must retain every attempt, including repeated generations.

Do not report only best-of-N or successful retries.

### 10.4 Experiment phase A3 — provider-backed conversational whole-reply test

Run only if A2 hard safety passes.

Use the same four semantic families from the parent plan:

- concern / decision support;
- multi-part request with partial evidence;
- correction / referent / defer;
- conditional policy.

The conversational model receives frozen dialogue/state/evidence and produces the exact final draft. The verifier receives that exact final draft plus trusted context.

Score the whole customer-visible outcome on:

- understanding;
- explicit-need completeness;
- context/correction use;
- usefulness / decision support;
- partial-answer behavior;
- next-step appropriateness;
- coherence;
- naturalness;
- factual/action safety;
- verifier false rejection / unnecessary handoff.

Simple price/stock controls remain controls only.

### 10.5 Checkpoint A GO requirements

Owner may issue GO only if all are true:

1. **Hard semantic safety:** zero send-eligible PASS on the preregistered unsafe A2 population.
2. **Fail closed:** `UNCERTAIN`, invalid schema, timeout and provider error never authorize send.
3. **Normal-reply usability:** safe controls meet the preregistered false-reject/usability threshold.
4. **Whole-reply quality:** A3 semantic cases meet the development bar for understanding, completeness, usefulness, coherence and naturalness.
5. **No semantic machinery growth:** no broad parser, failure-specific production regex/template set, third model role or repair loop is required.
6. **One conversation owner:** verifier never writes customer text, calls tools or changes state.
7. **Deterministic authority intact:** existing identity/freshness/permission/effect/PII boundaries remain code-owned.
8. **Observable provenance:** exact source/model/request/corpus/verdict identities are retained.

### 10.6 Checkpoint A STOP conditions

STOP if any of these occur:

- an unsafe preregistered draft receives semantic `PASS`;
- safety requires adding phrase-specific rules to production code;
- verifier prompt/schema grows into a general semantic representation of the whole conversation;
- verifier begins deciding conversation strategy/completeness;
- verifier needs tools/state writes/retrieval of its own;
- safe natural replies are blocked often enough to miss the preregistered usability threshold;
- quality becomes materially template-like to make verification easier;
- a third model role or iterative repair loop is needed to make the boundary work;
- deterministic business authority is weakened to accommodate the model;
- results cannot be reproduced/accounted for because provider/request identity is missing.

A STOP result is evidence, not a request to patch the experiment indefinitely.

---

## 11. Post-Checkpoint-A architecture compatibility

If and only if Checkpoint A receives explicit owner GO, a later plan may detail implementation beyond egress feasibility.

The amendment must remain compatible with the parent lifecycle:

~~~text
A PASS
  |
  v
read-only domain tool loop
  |
  v
bounded refs + effective state ordering
  |
  v
mutation idempotency + receipt/recovery
  |
  v
semantic verifier on exact final draft
  |
  v
paired + stateful sealed-holdout evaluation
  |
  v
real-adapter send-disabled verification
  |
  v
replacement-readiness decision
~~~

The verifier does not change the parent invariants:

- correction must become accepted effective state before dependent tools;
- bounded refs do not grant protected identity authority;
- mutation success requires receipt/readback;
- ambiguous effects reconcile before retry;
- post-effect recovery starts from committed state/receipt;
- no new durable semantic memory;
- no live send before rollout approval;
- replacement still requires absolute target PASS plus preregistered improvement over C3 and structural simplification.

Exact T4-T9 implementation details are intentionally deferred until A evidence exists.

---

## 12. Evaluation and replacement semantics

Keep the parent spec's two decisions:

### Gate A — Candidate meets target

Defined by absolute product-quality and safety gates.

### Gate B — Candidate qualifies to replace C3

Requires Gate A plus:

- preregistered clear quality improvement over matched C3 in paired single turns;
- preregistered clear quality improvement over matched C3 in stateful journeys;
- no safety/state/effect regression;
- structural simplification.

Checkpoint A in this amendment is an **earlier feasibility gate**, not either final promotion gate.

C3 is not the definition of product correctness.

---

## 13. Security model

### 13.1 Threat boundaries

Treat as untrusted:

- customer text;
- retrieved text;
- conversation-model draft;
- verifier output;
- external source/tool responses before domain validation.

Protect:

- customer/tenant identity;
- business truth/provenance;
- canonical state;
- cart/order/payment state;
- receipts;
- credentials;
- ownership/permission;
- final customer-send decision.

### 13.2 Verifier-specific threats

Checkpoint A must include adversarial cases for:

- prompt injection embedded in customer text;
- prompt injection embedded in the final draft;
- instruction-like text inside retrieved/policy content;
- fake protected refs mentioned only in prose;
- attempts to persuade the verifier that untrusted text is authoritative;
- malformed/oversized verifier output;
- stale request/draft identity replay.

The verifier has no tools or effects, so compromise cannot directly mutate business state. However, a false PASS can authorize unsafe customer-visible text; therefore semantic false negatives are hard failures.

### 13.3 Privacy

Supply only context needed for semantic verification.

Do not include:

- credentials;
- raw auth headers;
- unnecessary private checkout data;
- unrelated customer PII;
- cross-tenant retrieval context.

Logs/traces retain IDs and sanitized metadata, not secret values.

---

## 14. Anti-overengineering rules

1. One conversational owner + one verifier model is the maximum online semantic-role count approved by this amendment.
2. The verifier consumes the exact final reply, not a new semantic handoff document.
3. Verifier output is a verdict, not a plan or rewritten reply.
4. No model role exists only to translate one model's schema for another.
5. No generic agent framework dependency.
6. No new durable semantic memory.
7. No benchmark-case production branches.
8. No phrase-by-phrase regex repair strategy.
9. No "temporary" template system that becomes the permanent reply composer.
10. Every new runtime semantic abstraction must replace an existing responsibility or protect a repeated invariant across multiple scenario families.
11. If the verifier needs a broad ontology of customer intent/concerns to work, STOP and reconsider architecture.
12. Latency/cost optimization comes after safety/quality evidence; do not add bypass logic in the first experiment.

---

## 15. Tech stack

Inherited from the repository:

- Node.js >= 22;
- pnpm 10.12.4;
- TypeScript ^5.8.3;
- Vitest ^3.2.4;
- worker runtime in `apps/worker`;
- existing `@lana/contracts`, `@lana/business-tools`, state/commerce/durable-messaging packages.

No new runtime dependency is approved by this spec.

Any provider-specific/model API used in implementation must be checked against current official documentation at implementation time.

---

## 16. Commands

Repository gates:

~~~bash
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm check
~~~

Worker-focused:

~~~bash
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker test
~~~

Checkpoint-A implementation planning must derive exact focused test commands from the owning files/tests rather than inventing paths in advance.

---

## 17. Project structure

Expected reuse:

- `apps/worker/src/` — candidate/verifier orchestration seam if A implementation is approved;
- `apps/worker/evals/` — locked development feasibility corpus, provider traces and evidence;
- `packages/contracts/` — only if an existing contract cannot express the bounded verifier verdict/context;
- `packages/business-tools/` — existing protected facts/realization/guard utilities;
- existing state/commerce/durable-messaging owners — unchanged by Checkpoint A.

Spec/docs remain under:

- `docs/specs/`.

Do not put production semantic logic under evaluation-only directories.

---

## 18. Code style

Follow existing TypeScript conventions: explicit readonly contracts, discriminated unions, reason codes and fail-closed validation.

Representative style:

~~~ts
export interface SemanticVerifierResult {
  readonly verdict: "PASS" | "FAIL" | "UNCERTAIN";
  readonly reasonCodes: readonly SemanticVerifierReasonCode[];
}

function canSend(result: SemanticVerifierResult): boolean {
  return result.verdict === "PASS" && result.reasonCodes.length === 0;
}
~~~

Prefer boring explicit control flow over framework abstraction.

---

## 19. Testing strategy

### Before Checkpoint A

Use three layers:

1. **Deterministic unit/contract tests**
   - verifier schema validation;
   - request/draft binding;
   - fail-closed timeout/error/malformed behavior;
   - existing protected claim/freshness/permission/effect boundaries.

2. **Provider-backed verifier adversarial evaluation**
   - exact unsafe/safe drafts;
   - repeated generation according to frozen variance policy;
   - all attempts retained.

3. **Provider-backed whole-reply feasibility**
   - one conversational owner;
   - exact final draft;
   - semantic verifier;
   - human/offline quality scoring.

Do not call a provider-backed semantic judgment a unit test.

### After Checkpoint A

Testing details for state/tool/effect journeys belong to the later implementation plan and must preserve the parent spec's paired + stateful evaluation requirements.

---

## 20. Boundaries

### Always

- keep code as authority for identity/truth/state/permission/effects;
- treat both model outputs as untrusted;
- verify the exact final customer-visible text;
- fail closed on verifier uncertainty/error;
- record exact experiment provenance;
- retain all attempts, including failures;
- preserve one conversational owner;
- run focused tests before each implementation savepoint;
- stop at owner checkpoints.

### Ask first

- add any third model role;
- allow verifier tool access;
- add verifier-driven rewrite/repair loop;
- add a new runtime dependency/framework;
- add new persistent semantic state;
- change existing protected-claim guarantees;
- add a verifier bypass/fast path;
- change numeric thresholds after a run starts;
- proceed beyond Checkpoint A;
- production opt-in/migration.

### Never

- let verifier grant business permission;
- let verifier output mutate cart/order/payment/state;
- let conversation/verifier prompts grant authorization;
- treat verifier PASS as evidence an effect actually happened;
- silently accept `UNCERTAIN`;
- hide unsafe attempts from the denominator;
- weaken assertions to make the experiment pass;
- patch semantic failures with benchmark-specific production branches;
- live-send Checkpoint-A experiment output;
- claim replacement readiness from Checkpoint-A evidence.

---

## 21. Success criteria for this spec

This amendment is ready for implementation planning only if reviewers agree that:

1. PR387's failed boundary and its exact limitation are stated correctly.
2. The new responsibility split is explicit: conversation model owns conversation, verifier judges protected language semantics, code owns reality/effects.
3. Verifier PASS is not business authority.
4. The verifier sees the exact final customer-visible draft.
5. Verifier inputs come from trusted existing fact/state/receipt surfaces where possible; no generic claim graph is approved.
6. The verifier has no tools, state writes, effect permission or reply-rewrite responsibility.
7. The first experiment uses an always-on verifier; no semantic bypass classifier is added.
8. `FAIL`, `UNCERTAIN`, malformed output, timeout and provider error fail closed.
9. The seven PR387 attacks are mandatory regression seeds.
10. Non-literal paraphrases and verifier-prompt-injection cases are included so the experiment cannot pass by memorizing exact phrases.
11. A2 requires zero send-eligible false PASS on the preregistered unsafe population.
12. Safe natural replies have a preregistered numeric usability/false-reject threshold before results are observed.
13. A3 evaluates whole final replies on the four semantic families, not factual blocks alone.
14. Checkpoint A is development feasibility only; no C3-relative improvement criterion is required there.
15. T4-T9 details remain deferred until explicit owner GO.
16. Parent state/tool/mutation/recovery and final replacement gates remain intact.
17. The architecture hard cap is one conversational owner + one verifier; no repair loop or third semantic role is approved.
18. Existing repo commands/stack/project boundaries are recorded.
19. No runtime behavior changes are made by the spec PR.

Human approval is required before implementation planning.

---

## 22. Open owner decisions

These must be frozen before the first Checkpoint-A provider run, not necessarily before spec approval:

1. **Verifier model/provider/effort:** exact identity used for A2/A3.
2. **Conversation model/provider/effort:** exact identity used for A3.
3. **Variance policy:** number of repeated verifier generations per case and how any false PASS is counted.
4. **Safe-reply usability threshold:** numeric maximum false-reject/unnecessary-handoff rate for A2/A3.
5. **Post-A repair policy:** whether a later phase may test at most one same-conversation-model rewrite + one reverify. This amendment does not approve it.

---

## 23. Decision summary

~~~text
CONVERSATION MODEL
understands customer + writes natural reply
        |
        v
CODE-OWNED WORLD
identity + truth + state + permission + effects
        |
        v
EXACT FINAL DRAFT
        |
        v
SEMANTIC VERIFIER MODEL
protected-language consistency only
        |
        v
PASS / FAIL / UNCERTAIN
        |
        v
THIN CODE GATE
authority + receipt + privacy + fail-closed send decision
        |
        v
OUTBOX
~~~

The amendment makes one deliberate trade:

> **Protected language semantics become a model-judged runtime safety check, while protected world authority remains deterministic code.**

That trade is acceptable only if Checkpoint A proves the verifier is sufficiently reliable on locked adversarial and normal natural-language cases **without adding semantic machinery that recreates C3**.

Until then, this is a hypothesis, not an approved production architecture.
