# Draft Spec: Track C C3 strategy contract simplification

**Status:** Draft / discussion capture  
**Base:** `feat/track-c-c3-v5-two-pass-prompts`  
**Principle:** **Agent owns choice. Code owns authority.**

## Objective

Keep the two-pass Strategist/Responder architecture, but reduce model-owned protocol so each layer has one clear responsibility:

- fixed first-contact acquisition replies are policy-driven and do not require the Strategist;
- follow-up turns use the Strategist for adaptive sales decisions;
- code validates authority and derives deterministic state;
- the Responder realizes an already-approved task in natural Vietnamese;
- final code guards continue to own PII, factual, checkout, and effect boundaries.

This spec is intentionally small. It records the agreed direction before implementation and is not an implementation PR.

## 1. Interaction lanes

### 1.1 First contact: fixed acquisition policy

Trusted first meaningful inbound cases such as ad/referral entry, a new customer asking price, or a new customer sending a single product image should use a fixed response policy.

The first-contact lane should **bypass the Strategist**. Code builds a responder task from trusted acquisition metadata, resolved product context, and eligible evidence.

Expected semantic form:

```text
Dạ mẫu {PRODUCT} có giá {PRICE} ...

{useful color/material/product information} + {exactly one verified selling point}

{exactly one relevant continuation question}
```

Rules:

- answer the customer's immediate question first;
- expose useful product information quickly because the channel is Facebook Messenger;
- include exactly one selling point and only when supported by evidence;
- ask exactly one continuation question;
- do not let the Responder invent discounts, availability, benefits, policy, or other unsupported claims;
- first-contact/acquisition status must come from trusted metadata or canonical context, never inference from dialogue wording alone.

Continuation priority for the fixed lane:

1. If a product classification/variant must be resolved first (for example set type, top/skirt/dress grouping), ask that classification.
2. Otherwise, when color choice is a meaningful product decision and multiple colors exist, ask color.
3. Otherwise, when fit qualification is the useful next step, ask for height + weight or the relevant body measurements for that product/category.

**Do not ask usual worn size as the first fit question.** `USUAL_SIZE` is a fallback only after the customer says they do not have or do not know the requested measurements.

Example:

```text
Customer: "Mẫu SV999 bao nhiêu em?"

Reply shape:
"Dạ mẫu SV999 có giá 849.000đ chị nha. Mẫu có màu trắng và đen, chất liệu ..., [one verified selling point]. Chị cho em xin chiều cao và cân nặng để em tư vấn size sát hơn nha?"
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

Proposed minimal shape:

```ts
type StrategistDecision = {
  goal: string;

  proposition: TrackCProtectedProposition | "NONE";

  evidenceRefs: string[];

  continuation:
    | { type: "ASK"; input: DecisionInput }
    | { type: "KEEP_OPEN" };

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

Code still executes after Model 1 and before Model 2, but it is a thin authority/compiler seam rather than a sales decision engine.

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
    | { type: "KEEP_OPEN" };

  canonicalRequest: ResolvedCanonicalRequest | null;
};
```

The exact type names are not fixed by this draft; the important boundary is that the Responder receives execution instructions, not the Strategist DSL.

Target Responder responsibility:

- write one natural Vietnamese Messenger reply;
- follow the approved task;
- use only supplied evidence for factual claims;
- realize exactly one supplied continuation;
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

Every ordinary customer-facing reply should keep the conversation moving through one of two forms:

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

## 7. Measurement fallback

Fit qualification should prefer measurements over habitual size.

Expected progression:

```text
Need fit qualification
  -> ask height + weight and/or relevant measurements

Customer says measurements are unavailable/unknown
  -> adaptive Strategist may ask USUAL_SIZE as fallback
```

`USUAL_SIZE` therefore belongs to follow-up strategy, not the fixed first-contact script.

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
- trusted acquisition origin is never inferred from customer text alone.

## 9. Implementation slices

Do not change the Strategist contract, Responder contract, and first-contact behavior in one large commit.

Recommended sequence:

1. **First-contact fixed lane** — define trusted classification and fixed acquisition task; bypass Strategist for that lane.
2. **Simplify Strategist contract** — remove deterministic/redundant fields while temporarily compiling back into the current Responder contract if needed.
3. **Introduce explicit ResponderTask** — separate Strategist vocabulary from Responder vocabulary.
4. **Simplify Responder output** — remove model-managed realization metadata that code already owns.

After each slice, run focused regression before continuing. Do not weaken a failing guard merely to increase benchmark completion.

## 10. Acceptance criteria

This design is ready for implementation when:

- first-contact cases have a code-owned fixed semantic form and do not require Strategist choice;
- first-contact fit qualification asks measurements first, with usual size only as a later fallback;
- follow-up Strategist output contains only conversational choices that are not deterministic from context/evidence;
- the Strategist selects relevant evidence from an eligible code-owned set;
- code derives factual resolution, checkout fields, effect authority, and other deterministic state;
- Model 2 no longer needs definitions of Strategist-only mode vocabulary;
- Model 2 cannot choose a different sales strategy or evidence set;
- every ordinary reply has exactly one `ASK` or `KEEP_OPEN` continuation;
- hard PII/factual/effect boundaries remain unchanged;
- implementation is delivered incrementally with regression evidence after each slice.

## 11. Open questions

These should be resolved before implementation, not guessed in code:

1. What exact trusted production signal classifies `FIRST_CONTACT_FIXED` for ad/referral/new-price/image-only inbound?
2. What is the exact first-contact useful-information selection policy per product category?
3. How is the one verified selling point selected when multiple eligible selling points exist?
4. Which measurements are required/preferred by product category before falling back to `USUAL_SIZE`?
5. Can the Responder safely return only `{ "text": string }` while preserving the required deterministic final factual guard, or is a smaller structured binding seam still necessary?

## Boundaries

- **Always:** keep agent choice separate from code authority; preserve fail-closed validation; add regression coverage for every changed contract boundary.
- **Ask first:** widening production acquisition metadata, adding new effect capability, changing checkout/PII authority, or changing benchmark semantics.
- **Never:** add case-specific benchmark branches, infer trusted acquisition origin from dialogue wording, make code choose the business next step, or weaken guards to improve completion rate.
