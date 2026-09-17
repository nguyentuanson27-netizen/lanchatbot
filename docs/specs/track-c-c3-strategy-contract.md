# Draft Spec: Track C C3 strategy contract simplification

**Status:** Draft / discussion capture  
**Base:** `feat/track-c-c3-v5-two-pass-prompts`  
**Principle:** **Agent owns choice. Code owns authority.**

## Objective

Keep the Strategist/Responder separation for adaptive turns, while adding a code-owned first-contact lane that can call the Responder directly. Reduce model-owned protocol so each layer has one clear responsibility:

- fixed first-contact acquisition replies are policy-driven and do not require the Strategist;
- follow-up turns use the Strategist for adaptive sales decisions;
- code validates authority and derives deterministic state;
- the Responder realizes an already-approved task in natural Vietnamese;
- final code guards continue to own PII, factual, checkout, and effect boundaries.

The runtime therefore has two explicit lanes rather than assuming every customer-facing turn is two-pass:

```text
FIRST_CONTACT_FIXED
input -> code classify/authority -> Responder -> final guard

ADAPTIVE_FOLLOWUP
input -> Strategist -> code validate/resolve/derive/compile -> Responder -> final guard
```

This spec is intentionally small. It records the agreed direction before implementation and is not an implementation PR.

## 1. Interaction lanes

### 1.1 First contact: fixed acquisition policy

Trusted first meaningful inbound cases such as ad/referral entry, a new customer asking price, or a new customer sending a single product image should use a fixed response policy.

The first-contact lane should **bypass the Strategist**. Code builds a responder task from trusted acquisition metadata, resolved product context, and eligible evidence.

First-contact classification is fail-closed:

```text
trusted FIRST_CONTACT_FIXED signal exists
  -> fixed first-contact lane

trusted signal absent
  -> do not infer first-contact/acquisition status from dialogue wording or history heuristics
  -> fall back to the adaptive/current safe lane
```

Expected semantic form:

```text
Dạ mẫu {PRODUCT} có giá {PRICE} ...

{useful color/material/product information} + {one authorized selling point}

{exactly one relevant continuation/progression question}
```

Rules:

- answer the customer's immediate question first;
- expose useful product information quickly because the channel is Facebook Messenger;
- target exactly one selling point and only when it is authorized by code-owned evidence;
- selling-point authority must come from an explicit curated/verified claim or a separately allowlisted deterministic projection; raw product facts must not be freely rewritten into new benefits;
- if no authorized selling point is available, omit that slot and treat it as a data-quality gap rather than allowing the Responder to invent one;
- ask exactly one progression question when the turn is non-terminal;
- do not let the Responder invent discounts, availability, benefits, policy, or other unsupported claims;
- first-contact/acquisition status must come from trusted metadata or canonical context, never inference from dialogue wording alone.

Continuation/progression priority for the fixed lane:

1. If a product classification/variant must be resolved first (for example set type, top/skirt/dress grouping), ask that classification.
2. Otherwise, when color choice is a meaningful product decision and multiple colors exist, ask color.
3. Otherwise, when fit qualification is the useful next step, ask for height + weight or the relevant body measurements for that product/category.

**Do not ask usual worn size as the first fit question.** `USUAL_SIZE` is a fallback only after the customer says they do not have or do not know the requested measurements.

Example:

```text
Customer: "Mẫu SV999 bao nhiêu em?"

Reply shape:
"Dạ mẫu SV999 có giá 849.000đ chị nha. Mẫu có màu trắng và đen, chất liệu ..., [one authorized selling point]. Chị cho em xin chiều cao và cân nặng để em tư vấn size sát hơn nha?"
```

### 1.2 Follow-up: adaptive sales strategy

From the customer's next real response onward, the Strategist owns the adaptive conversational choice.

The Strategist should decide:

- what the customer is trying to decide now;
- which objection, uncertainty, preference, correction, or commitment should be handled first;
- which eligible evidence is actually useful for that decision;
- whether one customer input would materially change the next recommendation, comparison, qualification, or transaction;
- which permitted canonical action, if any, is appropriate now.

It must not follow a fixed funnel such as `price -> size -> checkout`.

Objections come before progression. Explicit buying commitment should stop exploratory selling and move only to the smallest permitted controlled action.

Missing evidence is not negative evidence.

## 2. Strategist contract

The Strategist should output decisions, not deterministic validation metadata.

`USUAL_SIZE` must be an explicit decision-input semantic, not an alias for `SIZE`: choosing a size to buy and reporting the size a customer usually wears are different signals.

Proposed minimal shape:

```ts
type DecisionInput = ExistingDecisionInput | "USUAL_SIZE";

type StrategistDecision = {
  goal: string;

  proposition: TrackCProtectedProposition | "NONE";

  evidenceRefs: string[];

  continuation:
    | { type: "ASK"; input: DecisionInput }
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

`continuation` replaces the current multi-field `nextMove` representation.

- `ASK` means exactly one missing customer input would materially change the next sales decision.
- `KEEP_OPEN` means keep the conversation naturally open without introducing another decision variable or pressure step.
- `null` means a canonical request already owns the next step, or the turn is intentionally terminal/held.

The key cardinality invariant is:

```text
canonicalAction = NONE and turn is non-terminal
  -> exactly one continuation: ASK or KEEP_OPEN

canonicalAction != NONE
  -> continuation = null
  -> the compiled canonicalRequest is the single progression mechanism

HOLD_POSITION / terminal hold
  -> continuation = null
  -> do not reopen the conversation
```

A canonical request and an ordinary continuation must never be realized together in the same turn.

The Strategist should not be required to output fields that code can derive deterministically.

Candidate fields to remove from the model-owned contract:

- `protectedResolution`;
- `nextMove.action` + `target` + `purpose` duplication;
- `canonicalAction.requestedFields`;
- `terminal` where it is derivable from canonical state/action;
- `avoid`;
- `effectIntent` when effects are disabled;
- a shared `DIRECT / BOUNDED_UNCERTAINTY / ACKNOWLEDGE / CLARIFY / HOLD` taxonomy solely for cross-model transport.

`avoid`-style rules belong in the Responder prompt and deterministic guards, not in per-turn Strategist output.

## 3. Strategist prompt responsibility

The Strategist prompt should focus on sales reasoning rather than protocol serialization.

Core decision rules:

1. Resolve the customer's current decision first.
2. Identify the actual blocker; do not invent one.
3. Select the smallest useful evidence set.
4. Choose at most one meaningful continuation input.
5. Do not use a fixed sales funnel.
6. Handle objections before progression.
7. Treat explicit buying commitment differently from acknowledgement.
8. Missing evidence is not a negative fact.
9. Never invent facts, effects, discounts, availability, policies, or actions.

A useful mental model for the Strategist is:

```text
1. What is the customer trying to decide?
2. What is blocking that decision?
3. Which eligible evidence helps?
4. Is there exactly one input that would materially change what we do next?
```

## 4. Code seam between Strategist and Responder

Code still executes after Model 1 and before Model 2 on the adaptive lane, but it is a thin authority/compiler seam rather than a sales decision engine.

It should only:

```text
VALIDATE -> RESOLVE -> DERIVE -> COMPILE
```

It must not choose a different sales strategy.

Responsibilities include:

- validate selected evidence refs;
- validate product/variant/scope binding;
- validate proposition capability;
- validate selected canonical action against code-owned permissions;
- derive `SUPPORTED / UNRESOLVED / NOT_APPLICABLE` from evidence and proposition;
- derive exact checkout requested fields;
- enforce PII permissions;
- keep effect authority code-owned;
- derive terminal/hold semantics where deterministic;
- compile the approved decision into a Responder-specific task.

Do not ask the model to output a value when code already knows the only valid value.

## 5. Responder task and output

The Responder should not interpret the Strategist's internal planning ontology directly.

Code should compile a new task contract, for example:

```ts
type ResponderTask = {
  answer:
    | { kind: "SUPPORTED_FACT"; goal: string }
    | { kind: "UNRESOLVED_FACT"; goal: string }
    | { kind: "ACKNOWLEDGEMENT"; goal: string }
    | { kind: "CLARIFICATION"; goal: string };

  evidence: ResolvedEvidence[];

  continuation:
    | { type: "ASK"; input: DecisionInput }
    | { type: "KEEP_OPEN" }
    | null;

  canonicalRequest: ResolvedCanonicalRequest | null;
};
```

The exact type names are not fixed by this draft; the important boundary is that the Responder receives execution instructions, not the Strategist DSL.

Responder progression invariant:

- ordinary non-terminal reply: `continuation` is non-null and `canonicalRequest` is null;
- canonical request reply: `continuation` is null and `canonicalRequest` is non-null;
- terminal/hold reply: both may be null and the Responder must not reopen the conversation.

Target Responder responsibility:

- write one natural Vietnamese Messenger reply;
- follow the approved task;
- use only supplied evidence for factual claims;
- realize exactly the supplied progression mechanism: ordinary continuation or canonical request, never both;
- do not choose a different strategy, evidence set, canonical action, or effect;
- do not expose internal protocol tokens.

Long-term target output should be minimal, ideally:

```json
{
  "text": "Dạ có chị nha, mẫu SV999 có màu trắng ạ..."
}
```

If structured output is still needed for final validation, keep only the minimum structure required by deterministic guards. Do not require the Responder to re-serialize facts already known by code through `role`, `protectedResolution`, `claimRef`, placeholder, strategy, and CTA metadata unless a specific guard demonstrably requires it.

## 6. Continuation behavior

For an ordinary non-terminal reply that has no canonical request, the conversation must keep moving through exactly one of two forms:

```ts
continuation:
  | { type: "ASK"; input: DecisionInput }
  | { type: "KEEP_OPEN" };
```

`ASK`:

- exactly one input;
- only when the answer would materially change the next recommendation, comparison, qualification, or transaction;
- never re-ask known information.

`KEEP_OPEN`:

- no new decision variable;
- no checkout pressure;
- no generic repeated "cần gì cứ nhắn em" template on every turn;
- wording should stay tied to the current topic.

Canonical requests are separate from ordinary continuation. If a controlled canonical request such as product, measurement, or checkout details is selected, it is itself the single progression mechanism for that reply and ordinary `continuation` must be null.

A terminal/hold reply may have no progression mechanism and must not append a `KEEP_OPEN` sentence merely to satisfy a schema.

## 7. Measurement fallback

Fit qualification should prefer measurements over habitual size.

Expected progression:

```text
Need fit qualification
  -> ask height + weight and/or relevant measurements

Customer says measurements are unavailable/unknown
  -> adaptive Strategist may ask USUAL_SIZE as fallback
```

`USUAL_SIZE` therefore belongs to follow-up strategy, not the fixed first-contact script, and must be represented as its own decision-input semantic.

## 8. Authority and safety boundaries that do not change

This simplification must not weaken existing hard boundaries:

- Context V2 / code-owned evidence remains factual authority;
- model output remains untrusted;
- evidence scope/freshness/binding remains code validated;
- recipient name, phone, and delivery address remain behind checkout authority;
- exact checkout missing fields remain code-owned;
- side effects remain disabled unless separately authorized by a real capability;
- final factual/PII/effect guards remain fail-closed;
- benchmark simulation facts grant factual authority only, never effect or persistence authority;
- trusted acquisition origin is never inferred from customer text alone;
- selling-point wording cannot widen a raw product fact into an unsupported benefit.

## 9. Benchmark and generator-call cardinality

The current R2.16 quality contract treats scored two-pass cases as exactly two generator calls. The proposed first-contact lane intentionally bypasses the Strategist and therefore has one generator call.

Implementation must **not** add a no-op/fake Strategist call just to preserve the old count.

Before the first-contact lane can be considered benchmark-ready, the benchmark/execution contract must explicitly model expected generator-call cardinality by lane, for example:

```text
FIRST_CONTACT_FIXED
  -> 1 generator call: Responder

ADAPTIVE_FOLLOWUP
  -> 2 generator calls: Strategist + Responder

PRE_MODEL_REJECT / CONTRACT_SKIP
  -> 0 generator calls where already required by the benchmark contract
```

The exact benchmark revision/change belongs to the benchmark owner and must be reviewed separately. This spec defines the runtime requirement; it does not silently redefine benchmark semantics.

## 10. Implementation slices

Do not change the Strategist contract, Responder contract, and first-contact behavior in one large commit.

Recommended sequence:

1. **First-contact fixed lane contract** — define trusted classification, safe fallback when trusted acquisition signal is absent, selling-point authority, and fixed acquisition task shape. Do not fake a Strategist call.
2. **Benchmark lane cardinality** — update/approve benchmark expectations so first-contact fixed cases can legitimately use one generator call while adaptive cases remain two-pass.
3. **Simplify Strategist contract** — remove deterministic/redundant fields, add explicit `USUAL_SIZE`, and temporarily compile back into the current Responder contract if needed.
4. **Introduce explicit ResponderTask** — separate Strategist vocabulary from Responder vocabulary and enforce exactly one progression mechanism.
5. **Simplify Responder output** — remove model-managed realization metadata that code already owns.

After each slice, run focused regression before continuing. Do not weaken a failing guard merely to increase benchmark completion.

## 11. Acceptance criteria

This design is ready for implementation when:

- runtime has two explicit lanes: one-call `FIRST_CONTACT_FIXED` and adaptive Strategist/Responder follow-up;
- first-contact classification uses a trusted signal only; missing trusted signal falls back safely and is never inferred from dialogue wording;
- first-contact cases have a code-owned fixed semantic form and do not require Strategist choice;
- first-contact selling points come only from explicit authorized evidence/allowlisted projection; missing selling-point authority degrades by omission rather than invention;
- first-contact fit qualification asks measurements first, with usual size only as a later fallback;
- `USUAL_SIZE` is represented explicitly and is not conflated with `SIZE`;
- follow-up Strategist output contains only conversational choices that are not deterministic from context/evidence;
- the Strategist selects relevant evidence from an eligible code-owned set;
- code derives factual resolution, checkout fields, effect authority, and other deterministic state;
- Model 2 no longer needs definitions of Strategist-only mode vocabulary;
- Model 2 cannot choose a different sales strategy or evidence set;
- an ordinary non-terminal reply has exactly one `ASK` or `KEEP_OPEN` continuation;
- a canonical request is the single progression mechanism for its turn and cannot be paired with ordinary continuation;
- terminal/hold turns are allowed to have no continuation and must not be reopened;
- benchmark expectations explicitly support lane-specific generator-call cardinality before the fixed first-contact lane is scored as valid;
- hard PII/factual/effect boundaries remain unchanged;
- implementation is delivered incrementally with regression evidence after each slice.

## 12. Open questions

These should be resolved before implementation, not guessed in code:

1. What exact trusted production signal classifies `FIRST_CONTACT_FIXED` for ad/referral/new-price/image-only inbound?
2. What is the exact first-contact useful-information selection policy per product category?
3. What is the canonical source and priority order for authorized selling-point claims when multiple candidates exist?
4. Which measurements are required/preferred by product category before falling back to `USUAL_SIZE`?
5. Can the Responder safely return only `{ "text": string }` while preserving the required deterministic final factual guard, or is a smaller structured binding seam still necessary?
6. What benchmark revision/schema change will own lane-specific generator-call cardinality?

## Boundaries

- **Always:** keep agent choice separate from code authority; preserve fail-closed validation; add regression coverage for every changed contract boundary; omit unsupported selling points instead of inventing them.
- **Ask first:** widening production acquisition metadata, adding new effect capability, changing checkout/PII authority, or changing benchmark semantics/revision.
- **Never:** add case-specific benchmark branches, infer trusted acquisition origin from dialogue wording, make code choose the business next step, add a fake Strategist call only to satisfy an old benchmark count, or weaken guards to improve completion rate.
