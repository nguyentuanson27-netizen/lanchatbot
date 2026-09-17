# Draft Spec: Track C C3 strategy contract simplification

**Status:** Draft / discussion capture  
**Base:** `feat/track-c-c3-v5-two-pass-prompts`  
**Principle:** **Agent owns choice. Code owns authority.**

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

- `ANSWER` — answer the customer's question/concern; code determines whether the fact is supported or unresolved;
- `ACKNOWLEDGE` — acknowledgement without inventing an effect;
- `CLARIFY` — the current need itself needs clarification.

Do not restore the larger `DIRECT / BOUNDED_UNCERTAINTY / ACKNOWLEDGE / CLARIFY / HOLD` transport taxonomy.

### `continuation`

`continuation` replaces `nextMove.action + target + purpose + decisionInput`.

- `ASK` means one ordinary customer input would materially change what happens next;
- `KEEP_OPEN` means keep the conversation naturally open without introducing a new decision variable;
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

## 6. Responder task

The Responder should receive an execution task, not the Strategist's planning schema.

A small shape is enough:

```ts
type ResponderTask = {
  answer:
    | { kind: "FACT"; status: "SUPPORTED" | "UNRESOLVED"; goal: string }
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
  -> FACT + code-derived SUPPORTED/UNRESOLVED status

replyAct = ACKNOWLEDGE
  -> ACKNOWLEDGE

replyAct = CLARIFY
  -> CLARIFY
```

Responder responsibilities:

- write one natural Vietnamese Messenger reply;
- follow the supplied task;
- use only supplied evidence for factual claims;
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

Current R2.16 expects exactly two generator calls for scored two-pass cases. `FIRST_CONTACT_FIXED` intentionally uses only the Responder.

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
- code derives factual resolution, checkout fields, and effect authority;
- Model 2 receives a small execution task instead of the Strategist plan DSL;
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
5. Can the final Responder output safely become only `{ "text": string }`, or does the final factual guard still need a small binding structure?
6. Which benchmark revision/schema owns lane-specific generator-call cardinality?

## Boundaries

- **Always:** agent chooses adaptive strategy; code owns authority; preserve fail-closed validation.
- **Ask first:** widening acquisition metadata, changing checkout/PII authority, adding effect capability, or changing benchmark semantics.
- **Never:** infer trusted acquisition origin from dialogue wording, add case-specific benchmark branches, create duplicate representations for the same request, add a fake Strategist call, or weaken guards to raise completion.
