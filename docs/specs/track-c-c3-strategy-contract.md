# Draft Spec: Track C C3 strategy contract simplification

**Status:** Draft / authority and realization clarification

**Source:** PR #369, exact head `ab89c7fea17ff00ec367c9ce69652e13b02069ac`

**Principle:** **Agent owns choice. Code owns authority.**

This revision clarifies evidence status, Responder realization, and goal handling
before further implementation in #371. It retains the six-field Strategist
decision, two lanes, progression invariant, and all authority boundaries. This
document alone does not change runtime code or benchmark acceptance semantics.

## Objective

Keep the current guarded Strategist/Responder design for adaptive turns, but simplify the contracts and add a fixed first-contact lane for Facebook Messenger.

The runtime has two lanes:

```text
FIRST_CONTACT_FIXED
input -> code-owned first-contact policy -> Responder -> final guard

ADAPTIVE_FOLLOWUP
input -> Strategist -> code validate/resolve/derive/compile -> Responder -> final guard
```

The first lane is intentionally policy-driven. The second lane is where the Strategist owns adaptive sales decisions.

## 1. First contact: fixed Messenger policy

Use `FIRST_CONTACT_FIXED` only when trusted metadata/canonical context says this is a first meaningful inbound such as ad/referral entry, a new customer asking price, or a new customer sending a single product image.

Do not infer first-contact status from dialogue wording alone.

```text
trusted FIRST_CONTACT_FIXED signal exists
  -> fixed lane

trusted signal absent
  -> use the current/adaptive safe lane
```

The fixed reply target is:

```text
Dạ mẫu {PRODUCT} có giá {PRICE} ...

{useful product information} + {one authorized selling point when available}

{exactly one progression question}
```

Rules:

- answer the immediate question first;
- expose useful product information quickly;
- use color/material/product facts only from code-owned evidence;
- use at most one selling point;
- selling-point wording must come from an explicit verified/curated claim or an allowlisted deterministic projection;
- if no authorized selling point exists, omit it rather than inventing a benefit;
- use exactly one progression mechanism;
- do not invent discounts, availability, policy, benefits, or effects.

First-contact progression priority:

1. If product classification/variant must be resolved first, ask that classification.
2. Else, when multiple colors are a meaningful choice, ask color.
3. Else, ask for height + weight or the relevant measurements needed for fit guidance.

Do **not** ask usual worn size as the first fit question.

Example:

```text
Customer: "Mẫu SV999 bao nhiêu em?"

Reply shape:
"Dạ mẫu SV999 có giá 849.000đ chị nha. Mẫu có màu trắng và đen, chất liệu ..., [one authorized selling point]. Chị cho em xin chiều cao và cân nặng để em tư vấn size sát hơn nha?"
```

## 2. Follow-up: adaptive sales strategy

From the customer's next real response onward, the Strategist owns the adaptive conversational choice.

The Strategist decides:

- what the customer is trying to decide now;
- which objection, uncertainty, preference, correction, or commitment matters first;
- which eligible evidence is useful;
- whether one follow-up input would materially change the next recommendation, comparison, qualification, or transaction;
- which permitted canonical action, if any, should happen now.

It must not follow a fixed funnel such as `price -> size -> checkout`.

Objections come before progression. Explicit buying commitment should stop exploratory discovery and move only to the smallest permitted controlled action.

Missing evidence is not negative evidence.

## 3. Minimal Strategist contract

The Strategist should output decisions, not validation metadata.

```ts
type OrdinaryDecisionInput =
  | Exclude<TrackCDecisionInput, "NONE" | "PRODUCT" | "MEASUREMENTS">
  | "USUAL_SIZE";

type StrategistDecision = {
  replyAct: "ANSWER" | "ACKNOWLEDGE" | "CLARIFY";

  goal: string;

  proposition: TrackCProtectedProposition | "NONE";

  evidenceRefs: string[];

  continuation:
    | { type: "ASK"; input: OrdinaryDecisionInput }
    | { type: "KEEP_OPEN" }
    | null;

  canonicalAction:
    | "NONE"
    | "ASK_PRODUCT"
    | "ASK_MEASUREMENTS"
    | "ASK_CHECKOUT_DETAILS"
    | "HOLD_POSITION";
};
```

### `replyAct`

`replyAct` is the smallest conversational discriminator the code cannot derive safely from evidence:

- `ANSWER` — answer the customer's question/concern; code derives evidence status for the selected proposition capability, not a verdict that the question has been answered;
- `ACKNOWLEDGE` — acknowledgement without inventing an effect;
- `CLARIFY` — the current need itself needs clarification.

Do not restore the larger `DIRECT / BOUNDED_UNCERTAINTY / ACKNOWLEDGE / CLARIFY / HOLD` transport taxonomy.

Handling an objection before progression does not force `ACKNOWLEDGE` for every
concern. The Strategist may choose `ANSWER` to address a concern directly.

### `goal`

`goal` describes the current conversational objective and, when asking for an
input, the specific missing input and why it matters. It is never factual,
checkout, or effect authority. Commercial facts and their exact values come
from resolved evidence; requested checkout fields come from canonical state.

Customer-reported budget, measurements, and preferences may inform strategy
and be acknowledged as customer-provided context, subject to the same PII
boundary. The compiled goal may carry that PII-safe context for the Responder.
It cannot establish shop price, stock, verified fit, policy, an order effect, or
checkout completion. For example, a reported weight is a fit input, not proof
that a size fits; a reported budget is not an authorized shop price.

Code validates the goal's shape and length, applies the existing PII redaction,
and accepts only the resulting PII-safe text. A successful redaction need not
reject the whole decision merely because it changed the text; quarantined or
otherwise unsafe output still fails closed. Do not add currency/number bypasses
to the shared PII boundary. Code must not fill in redacted details or infer a
different strategy from the remaining text.

Compile, return, hash, and export one normalized decision. Raw model goal text
must not survive through a second conversation-plan or reporting path. Any
diagnostic copy must pass the same PII-safe logging boundary.

### `continuation`

`continuation` replaces `nextMove.action + target + purpose + decisionInput`.

- `ASK` means one ordinary customer input would materially change what happens next;
- `KEEP_OPEN` means keep the conversation naturally open without introducing a new decision variable; the answer itself can do this and no closing sentence is mandatory;
- `null` means a canonical action owns the progression for this turn.

`PRODUCT` and `MEASUREMENTS` are **not** ordinary continuation inputs. They remain canonical actions through `ASK_PRODUCT` and `ASK_MEASUREMENTS`, so there is only one representation for those requests.

`USUAL_SIZE` is separate from `SIZE`: reporting the size a customer usually wears is a fallback fit signal, not the same as selecting a purchase size.

### Progression invariant

```text
canonicalAction = NONE
  -> continuation = ASK or KEEP_OPEN

canonicalAction != NONE
  -> continuation = null
  -> canonicalAction is the single progression mechanism

HOLD_POSITION
  -> continuation = null
  -> do not reopen the conversation
```

There is no separate generic `terminal` field in this draft. `HOLD_POSITION` is the explicit no-reopen state currently needed.

Candidate fields to remove from model-owned output:

- `protectedResolution`;
- `nextMove.action`;
- `nextMove.target`;
- `nextMove.purpose`;
- `canonicalAction.requestedFields`;
- `terminal`;
- `avoid`;
- `effectIntent` when effects are disabled.

## 4. Strategist prompt responsibility

Keep the prompt focused on sales decisions:

1. Resolve the customer's current decision first.
2. Identify the real blocker; do not invent one.
3. Select the smallest useful evidence set.
4. Choose at most one useful follow-up input.
5. Do not use a fixed sales funnel.
6. Handle objections before progression.
7. Treat explicit buying commitment differently from acknowledgement.
8. Missing evidence is not a negative fact.
9. Never invent facts, effects, discounts, availability, policies, or actions.

Useful mental model:

```text
1. What is the customer trying to decide?
2. What is blocking that decision?
3. Which eligible evidence helps?
4. Is there one input that would materially change what we do next?
```

## 5. Code seam between Model 1 and Model 2

On the adaptive lane, code runs after the Strategist and before the Responder.

Its job is only:

```text
VALIDATE -> RESOLVE -> DERIVE -> COMPILE
```

It must not choose a different sales strategy.

Code owns:

- evidence ref validity;
- product/variant/scope binding;
- proposition capability;
- canonical-action permission;
- `SUPPORTED / UNRESOLVED / NOT_APPLICABLE` derivation;
- exact checkout requested fields;
- PII permissions;
- effect authority;
- compilation into a Responder task.

Do not ask the model to output a value when code already knows the only valid value.

### Evidence authority versus question resolution

The Strategist owns selection of evidence that answers the exact property,
event, and scope in the customer's current question. Related subject matter or
a shared capability label alone is insufficient. Material does not establish
wrinkle resistance; delivery ETA does not establish dispatch time. Retain
verified evidence that directly answers part of a compound question; leave the
selection empty only when no eligible evidence answers any part. For example,
for price plus wrinkle resistance, retain verified price and use the existing
goal to identify the unanswered wrinkle question. Do not substitute material
for wrinkle evidence or invent a negative answer. No extra decision field or
per-question taxonomy is needed.

For `ANSWER`, code derives `answer.evidenceStatus` after validating references,
freshness, binding, scope, and capability:

- `SUPPORTED`: eligible selected evidence supports the declared proposition
  capability. This is a bounded authority result, not proof of relevance to the
  natural-language question or successful question resolution. It does not
  mean every part of a compound question is supported or answered.
- `UNRESOLVED`: no eligible selected evidence supports that capability. Missing
  evidence is not a negative fact, and invalid evidence still fails validation.
- `NOT_APPLICABLE`: the `ANSWER` task declares proposition `NONE`, so there is no
  factual answer proposition to resolve.

`ACKNOWLEDGE` and `CLARIFY` keep the smaller task branches below without an
evidence-status field. Any facts attached to those tasks still require the same
authority validation.

Use `evidenceStatus` instead of the ambiguous `status` name in the compiled
answer. This replaces one internal task field; it adds no Strategist output
field. Existing consumers using `answer.status` need an explicit coordinated
update before adopting this revision, not two concurrent status authorities.

Valid selected evidence without a safe realization is a capability gap, not
missing evidence, a negative fact, or automatically a strategy error. Execution
completion and evidence status must remain separate from behavioral assessment.
Do not add a model-authored `isRelevant`/`protectedResolution` certificate or a
semantic regex engine to turn an authority result into a quality verdict.

## 6. Responder task

The Responder should receive an execution task, not the Strategist's planning schema.

A small shape is enough:

```ts
type ResponderTask = {
  answer:
    | {
        kind: "ANSWER";
        evidenceStatus: "SUPPORTED" | "UNRESOLVED" | "NOT_APPLICABLE";
        goal: string;
      }
    | { kind: "ACKNOWLEDGE"; goal: string }
    | { kind: "CLARIFY"; goal: string };

  evidence: ResolvedEvidence[];

  continuation:
    | { type: "ASK"; input: OrdinaryDecisionInput }
    | { type: "KEEP_OPEN" }
    | null;

  canonicalRequest: ResolvedCanonicalRequest | null;
};
```

Code maps Strategist intent into this task:

```text
replyAct = ANSWER
  -> ANSWER + code-derived evidenceStatus

replyAct = ACKNOWLEDGE
  -> ACKNOWLEDGE

replyAct = CLARIFY
  -> CLARIFY
```

Responder responsibilities:

- write one natural Vietnamese Messenger reply;
- follow the supplied task;
- use only supplied evidence for factual claims, except acknowledgement of
  customer-reported context as permitted by the compiled goal in section 3;
- realize exactly one progression mechanism: ordinary continuation or canonical request;
- do not choose another strategy, evidence set, canonical action, or effect;
- do not expose internal protocol tokens.

Target output should be as small as practical, ideally:

```json
{
  "text": "Dạ có chị nha, mẫu SV999 có màu trắng ạ..."
}
```

Keep extra structured output only if a deterministic final guard demonstrably needs it.

### Realization boundary and current implementation limit

Code owns which factual assertions are authorized; the Responder realizes the
compiled task within the available safe wording surface. It must not replace
the strategy, repair a bad evidence selection by choosing another fact, or
derive new factual conclusions from `goal` or dialogue. Acknowledging
customer-reported context does not turn it into verified commercial evidence.

For the next implementation slice, retain code-owned factual segments and the
bounded nonfactual wording surface reviewed in PR #371 at exact HEAD
`da12894e84551b66f8048782a5e170925f720197`, in
`apps/worker/src/track-c-c3-strategy-contract-runner.ts`. This is an explicit,
temporary implementation limit, not a requirement that all future replies use
fixed templates. It does not by itself satisfy the naturalness or
question-resolution requirements. If that surface cannot express a partial
answer and its remaining uncertainty, record the realization capability gap;
do not discard valid evidence or treat completion as successful resolution.

Before expanding model-authored wording, specify which text it may author and
how factual binding, checkout/PII, effects, and the single progression are
enforced at that surface. This revision does not authorize unrestricted factual
paraphrase. It does not assume that arbitrary natural text can be fully verified
by a small deterministic guard. The single-text output above remains a target,
not an instruction to remove necessary binding structure now.

The final guard protects hard authority and progression boundaries. Semantic
relevance and sales quality remain responsibilities of strategy/realization and
behavioral evaluation, not new Vietnamese keyword rules in the guard. Deadline
or comparison conclusions require an authorized structured derivation; a model
goal alone never grants that authority.

## 7. Measurement fallback

Fit qualification should prefer measurements over habitual size.

```text
Need fit qualification
  -> ASK_MEASUREMENTS
  -> ask height + weight and/or relevant measurements

Customer says measurements are unavailable/unknown
  -> adaptive Strategist may use continuation ASK / USUAL_SIZE
```

`USUAL_SIZE` is therefore a follow-up fallback, not the fixed first-contact fit question.

## 8. Authority and safety boundaries that do not change

This simplification must preserve:

- Context V2 / code-owned evidence as factual authority;
- model output treated as untrusted;
- evidence scope/freshness/binding validation;
- recipient name, phone, and delivery address behind checkout authority;
- exact checkout missing fields owned by code;
- side effects disabled unless separately authorized by a real capability;
- fail-closed factual/PII/effect guards;
- benchmark simulation facts granting factual authority only, never effect/persistence authority;
- trusted acquisition origin never inferred from customer wording;
- no widening raw product facts into unsupported selling claims.

## 9. Benchmark call cardinality

The original #369 described R2.16 as expecting exactly two generator calls for
scored two-pass cases. That is historical context, not an assertion about the
current benchmark revision. The authoritative Track C C2 benchmark artifacts
under `apps/worker/evals/track-c-c2/v2/` at the evaluated commit determine the
applicable revision and call contract.
`FIRST_CONTACT_FIXED` intentionally uses only the Responder.

Do not add a fake/no-op Strategist call to satisfy the old count.

Before first-contact cases are benchmark-ready, the benchmark contract must support lane-specific call cardinality:

```text
FIRST_CONTACT_FIXED
  -> 1 generator call: Responder

ADAPTIVE_FOLLOWUP
  -> 2 generator calls: Strategist + Responder

PRE_MODEL_REJECT / CONTRACT_SKIP
  -> 0 generator calls where already required
```

The benchmark revision/schema change must be reviewed separately by the benchmark owner.

## 10. Implementation order

Keep the work incremental:

1. Add the trusted first-contact lane and fixed task shape.
2. Update benchmark call-cardinality expectations for the new lane.
3. Simplify the Strategist contract: add `replyAct`, add `USUAL_SIZE`, remove redundant fields, and keep product/measurement requests canonical-only.
4. Compile into the smaller Responder task and then simplify Responder output only as far as the final guard safely allows.

Run focused regressions after each slice. Do not weaken guards to improve completion.

## 11. Acceptance criteria

Implementation is ready when:

- first-contact status comes from trusted metadata/canonical context only;
- fixed first-contact replies follow the Messenger form and use exactly one progression mechanism;
- selling points are authorized or omitted;
- first fit qualification asks measurements, not usual size;
- `USUAL_SIZE` is a separate fallback signal;
- Strategist has a minimal `replyAct` and does not output deterministic validation metadata;
- ordinary `PRODUCT`/`MEASUREMENTS` continuation paths do not duplicate canonical actions;
- code derives evidence authority status, checkout fields, and effect authority without claiming that capability support proves question resolution;
- Model 2 receives a small execution task instead of the Strategist plan DSL;
- task, conversation plan, identity, and exports consistently use the normalized PII-safe goal;
- behavioral review verifies evidence relevance, question resolution, and useful progression separately from completion and evidence status;
- the realization surface and its safety enforcement are explicit; bounded templates alone are not naturalness acceptance evidence;
- canonical action and ordinary continuation cannot both be realized;
- `HOLD_POSITION` does not reopen the conversation;
- benchmark call cardinality matches the runtime lane;
- existing PII/factual/effect boundaries remain unchanged.

## 12. Open questions

Resolve these before implementation rather than guessing:

1. What exact production signal classifies `FIRST_CONTACT_FIXED`?
2. What useful product-info priority applies by product category?
3. What is the source/priority for authorized selling-point claims?
4. Which measurements are preferred by product category?
5. For a later realization expansion, which model-authored wording can the final guard safely admit, and can the output become only `{ "text": string }` without losing necessary binding structure? The next slice retains the bounded surface in section 6.
6. Which benchmark revision/schema owns lane-specific generator-call cardinality?

## Boundaries

- **Always:** agent chooses adaptive strategy; code owns authority; preserve fail-closed validation.
- **Ask first:** widening acquisition metadata, changing checkout/PII authority, adding effect capability, or changing benchmark semantics.
- **Never:** infer trusted acquisition origin from dialogue wording, add case-specific benchmark branches, create duplicate representations for the same request, add a fake Strategist call, or weaken guards to raise completion.
