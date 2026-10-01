# Draft Spec: Track C C3 strategy contract simplification

**Status:** Draft / PR377 Slice A prompt ownership and semantic handoff; real-model acceptance OPEN

**Source:** PR #369, clarified in merged PR #372, extended here alongside the
implementation on PR #371.

**Principle:** **Agent owns choice. Code owns authority.**

Earlier revisions clarified evidence status, Responder realization and goal
handling. This one adds the evidence input contract (§6b), checkout
completeness against the real runtime state machine (§6c), and the known
implementation gaps (§6d). It retains the six-field Strategist decision, the
two lanes, the progression invariant and every authority boundary.

Sections 6b and 6c describe the input and checkout contracts. The runtime
implementation and remaining limits are recorded in the integration appendix
below. Historical gap notes in §6d describe the PR371 baseline; use the
appendix for the current implementation status.

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

**P07 amendment, 2026-10-01 (candidate source change):** keep the fixed price/
product-information form, but request only an input that is still missing. When
all applicable first-contact inputs are already known, the reply ends without a
new question. This deliberately changes the earlier mandatory-one-question rule;
it does not change lane admission, the six-field Strategist schema, or effect
authority. Implementation/evidence and limits: [P06-P09 amendment](pr377-p06-p09-runtime-20261001.md).

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

{one useful progression question when an input is missing; otherwise no question}
```

Rules:

- answer the immediate question first;
- expose useful product information quickly;
- use color/material/product facts only from code-owned evidence;
- use at most one selling point;
- selling-point wording must come from an explicit verified/curated claim or an allowlisted deterministic projection;
- if no authorized selling point exists, omit it rather than inventing a benefit;
- use at most one progression mechanism; do not repeat a known input;
- do not invent discounts, availability, policy, benefits, or effects.

First-contact progression priority:

1. If product classification/variant must be resolved first, ask that classification.
2. Else, when multiple colors are a meaningful choice and no offered color has
   already been selected, ask color.
3. Else, ask only for missing height/weight, not measurements already in the
   current customer profile. Existing verified fit guidance or all relevant
   measurements can satisfy this input requirement.
4. If no applicable input remains, use `KEEP_OPEN` with no question. Never
   invent a new discovery topic to meet a question count.

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

The PR377 quality-closure Slice A amendment below now requires every adaptive
**model** decision to encode this existing string as exactly five ordered lines:

```text
NEED: current need
KNOWN: relevant customer context, or NONE
ANSWER: supported requested parts, or NONE
LIMIT: unsupported requested parts and their limit, or NONE
NEXT: the single missing input and decision it changes, or NONE
```

The six public fields do not change. Code splits the normalized, PII-safe string
into an internal `semanticHandoff`; the Responder receives those sections rather
than a free-text goal from which it must discover question coverage. The 500
character total limit stays in force. Direct code-owned compiler calls retain
the prior API; both adaptive live and frozen-evaluation model paths require the
new grammar and reject noncompliant output before the Responder.

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
- `KEEP_OPEN` means no further customer input or canonical action is useful for this turn. It is valid after a resolved need **or** a bounded limitation for missing shop-owned information the customer cannot supply; no closing sentence is mandatory;
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
`goal` LIMIT section to identify the unanswered wrinkle question for the internal handoff. Do not substitute material
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
  // Internal semantic instructions only, not factual or action authority.
  semanticHandoff?: {
    need: string;
    known: string | null;
    answer: string | null;
    limit: string | null;
    next: string | null;
  };
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

For adaptive model-facing requests, `answer.goal` is omitted when the compiled
`semanticHandoff` is present. Internal task/decision records retain the normalized
goal for identity and diagnostics. Fixed code-owned tasks keep their existing
wording surface. `customerDecisionSignals` is not sent to the Responder.

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

**Current adaptive wording:** the 2026-09-24 follow-up below supersedes the
historical bounded nonfactual vocabulary in this section. Trusted first contact
retains that fixed surface; selected factual projections retain their binding.

Code owns which factual assertions are authorized; the Responder realizes the
compiled task within the available safe wording surface. It must not replace
the strategy, repair a bad evidence selection by choosing another fact, or
derive new factual conclusions from `goal` or dialogue. Acknowledging
customer-reported context does not turn it into verified commercial evidence.

The initial implementation slice retains code-owned factual segments and the
bounded nonfactual wording surface reviewed in PR #371 at exact HEAD
`da12894e84551b66f8048782a5e170925f720197`, in
`apps/worker/src/track-c-c3-strategy-contract-runner.ts`. This is an explicit,
temporary implementation limit, not a requirement that all future replies use
fixed templates. It does not by itself satisfy the naturalness or
question-resolution requirements. If that surface cannot express a partial
answer and its remaining uncertainty, record the realization capability gap;
do not discard valid evidence or treat completion as successful resolution.

The earlier bounded correction reused that same vocabulary in the existing
`answerText` slot for adaptive `ANSWER / SUPPORTED`: the Responder may choose null, an
existing acknowledgement, or the existing uncertainty sentence when the
compiled goal identifies an unanswered part. Code emits every selected factual
projection unchanged and places that uncertainty once after the facts. This
does not authorize free-form context acknowledgement or factual paraphrase;
the Strategist's six fields and the single progression remain unchanged.
`UNRESOLVED` still has its one code-owned uncertainty sentence and a null
model slot. Checkout retains null model slots and exact canonical fields;
HOLD_POSITION retains acknowledgement-only wording and no progression. Trusted
fixed first contact retains its existing schema and wording permissions.
Schema vocabulary and exact membership validation close factual, effect and
additional-question channels in this slot; the existing PII check still applies.
Correct choice of uncertainty remains realization quality, not a regex verdict.

For PRICE, STOCK and ETA projections made entirely from validated typed
numbers/enums and allowlisted labels, the final guard checks exact projection,
claim identity, product binding and freshness without reclassifying the same
sentence using semantic keywords. This does not exempt arbitrary model text,
free-text evidence, or SIZE_FIT provenance from their guards.

The same rule now extends to the remaining typed groups, each projected from
its own validated fields: the published policies (inspection, exchange, sale
exchange, refund, payment, customization, split size), store location, care
guidance, offer configuration, promotion semantics, product lifecycle,
fulfilment spans, and every populated product attribute group. A projection reads only
fields of the group it belongs to. An unrecognised enum value or an
unrepresentable shape yields no wording, which is reported as an unmet
realization rather than guessed at or silently dropped.

Cart-scoped evidence carries `cartId` and `cartVersion` on its subject so the
value can be revalidated against the current cart before egress. It is
deliberately left without wording until that revalidation exists. Stating a
shipping fee, a freeship status or a cart promotion asserts it about the cart
as it is now, and the input contract carries no current cart identity or
revision to check the claim against, so the figure could come from a cart the
customer has since changed. The group therefore keeps its authority, is
reported as a realization limit, and is answered only once the input contract
carries the binding. A formatter alone does not open cart answers.

A field-level projection's content hash is derived from its source hash, its
field and its value. The final validator and the production guard rebuild that
derivation from the authoritative source rather than trusting a hash supplied
with the output, and bind each projection to its exact wording and product. A
projection the source does not derive is rejected.

Wherever the same fact is rendered twice — once when projecting it and once
when the guard re-derives it to compare — both sides must resolve their inputs
through the same rule. A presentation speaks only for the product it describes,
so variant labels are resolved through one shared binding check on both paths;
building the two strings from different inputs rejects correct answers.

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

## 6b. Evidence input contract

### Input timing: pre-decision input versus post-turn capture

The evidence C3 decides from and the record of what a turn did are two
different artifacts, taken at two different moments.

- **Pre-decision input.** Before the Strategist runs, the turn assembles the
  evidence that is valid for the current product/cart scope, from the
  authoritative producers, at one canonical revision. This is what the
  Strategist may choose from.
- **Post-turn capture.** After the reply is authorized, the turn records what
  happened, for audit and replay.

These must not be substituted for one another. At the time of writing,
`apps/worker/src/realtime-runner.ts` calls the model first and then builds its
`ContextV2` capture from the final state with
`verifiedClaims: protectedOutboundClaims` — a set already selected, filtered and
authorized *for the outbound reply*. Using that as the pre-decision input would
show C3 only the facts a previous path had already chosen, and would show them
after the decision it was meant to inform. The capture keeps its existing
meaning; a pre-decision envelope is a separate artifact.

Because state can change while the model runs, revision and freshness are
rechecked at the send and effect boundary, not only at selection time. Raw PII
and whole-database dumps are never the answer to an input gap.

### Subject scope, provenance and freshness

Every selectable evidence entry keeps the scope it was produced under, rather
than collapsing to an optional product identifier:

| Scope | Carries | Why |
|---|---|---|
| `PRODUCT` | `productId`, `displayName` when known | Binds the fact to a bound product |
| `VARIANT` | `productId`, `variantId`, `variantLabel` | Names the exact colour/size a fact covers |
| `OFFER` | `offerId` | Separates an offer's terms from the product's |
| `CART` | `cartId`, `cartVersion` | Allows revalidation against the current cart |
| `SHOP` | `shopId` | Binds published policy and store facts |

A customer-facing variant label comes from the authoritative presentation
mapping. Variant identifiers are opaque: parsing a naming convention out of
them is not an authority, and it silently produced nothing for every scheme that
did not follow it.

### Authority versus realization availability

`evidenceStatus` describes capability support. It does not certify that the
customer's question was resolved; that remains a matter for strategy,
realization and behavioural evaluation.

Authority and the ability to state something are separate properties:

- Evidence does not lose authority because no projection exists for it yet.
- The selection surface reports which entries can be stated, so the Strategist
  can choose accordingly.
- When a selection is partly realizable, the realizable part is answered and
  the rest is carried on the task as unrealized evidence, so the reply can name
  what it does not cover. A capability counts as supported only when it can
  also be stated.
- When none of it is realizable, the turn produces an honest limited answer.
  Discarding the evidence silently, and failing the whole turn, are both wrong.
- Integrity, binding and scope violations still reject. A realization gap is
  not a reason to relax them.

### Product attributes

Every populated group of the typed product attribute contract is projected,
one selectable entry per field, so a selection can carry the single attribute a
question needs instead of a whole bundle. Absent values stay absent: `null`
means the catalog has not verified that property, and it is never derived from
a neighbouring field. A material does not imply a care instruction, a wrinkle
property, or a fit.

## 6c. Checkout completeness

For a current inbound checkout message, payment is a **selection** only when
the customer chooses one supported method. Merely asking about bank transfer,
mentioning it hypothetically, or rejecting it does not fill the field. If the
customer rejects transfer and selects COD, the current selection is COD. The
same current-message rule applies to recipient values: an evidence substring
must identify the actual value, not a nearby payment word. Clear unlabelled
recipient input may be parsed locally inside the private SalesCycle boundary;
ambiguous recipient roles remain missing. Neither the Strategist nor the
Responder receives raw recipient PII to compensate for redaction.

An open, unconfirmed cart is pre-sale for edits to that cart. The same words
can be after-sales when the customer explicitly refers to an existing order or
delivered item. This routing distinction preserves HUMAN ownership once a
handoff has actually occurred.

The checkout field set mirrors the runtime `missingCheckout` set, payment
method included. A missing payment choice is a missing field like any other.

The request is permitted at the state the runtime actually reaches. The runtime
raises its `CHECKOUT_DETAILS_MISSING` clarification while the cart is open and
builds an order preview only once checkout data is complete and revalidation
has passed. Requiring an order preview *and* missing fields therefore described
a state the runtime cannot produce. An open cart permits the request; the
preview stage stays permitted for a draft invalidated by a later mutation.

These four are distinct and must not be collapsed:

```text
complete information -> valid preview -> customer confirmation -> successful effect
```

C3 states only outcomes for which the runtime produced evidence. Model text is
never an effect receipt, and C3 does not host a second checkout state machine.

## 6d. Implementation gap status

This inventory records status against the contract; the runtime integration
appendix below describes the completed boundaries in detail.

- **Runtime call: implemented in the draft.** `realtime-runner.ts` calls the
  shared C3 core after canonical input construction when its gate permits it.
  The production model pin and traffic remain unchanged.
- **Multi-product scope: partial.** A text fact request can bind several
  resolved products and their POS price/stock claims in C3. Each selected
  claim retains its product scope, and equal values receive distinct C3-only
  selection hashes. The shared legacy claim hash is unchanged. `ContextV2`
  still carries one `productAttributes` and one `productPresentation`, so
  attribute/presentation comparisons across several products remain open.
  Two separately bound prices do not authorize a model-authored cheaper-than
  conclusion; prose now rejects that assertion until code owns a dual-source
  comparison realization.
- **Negative freeship: implemented for C3 when known.** A canonical current
  cart with a positive shipping fee now yields a cart-bound `FREESHIP` false
  claim; a null fee yields no conclusion. The legacy claim set is unchanged.
  Frozen Q024 can still phrase an uncertain negative without this cart-bound
  source; the DEV70 review keeps that authority gap open.
- **Current-cart binding: implemented in the runtime input.** C3 receives the
  cart identity, revision, hash, policy source and expiry outside `ContextV2`.
  The final guard and Outbox commit readback recheck that binding. Frozen
  cases without a complete cart cannot state cart-scoped facts.
- **ETA semantics: preparation and delivery are separated.** Static ProductFacts
  no longer expose preparation days as `etaToCustomer`; a customer ETA needs a
  current destination-bound runtime lookup with transit and preparation spans.
  Deadline reasoning remains unavailable without that complete source. The
  stateful Luna journey with a city but no transit source does not promise a
  delivery date.
- **Media has no transport binding.** Until an attachment result exists, a
  reply must not claim an image was sent.

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

## Runtime integration appendix (stacked on PR371 at 88a1ce4)

The realtime runner now composes C3 after inbound canonical decision evidence,
product/business fact resolution and the SalesCycle transition for the turn.
`buildRealtimeC3Input` produces the pre-decision Context V2 from the resulting
commerce state and independently verified product and cart evidence. The
existing end-of-turn Context V2 capture remains a separate historical artifact.
The offline capture/simulation adapter and live adapter call the same C3 core,
including lane selection, projectors, compilers and final guard. Live input
rejects simulation and capture-only fields.

| Input | Authority and binding | Consumer and last check |
| --- | --- | --- |
| Turn identity, buying intent, barriers | Inbound canonical decision producer; conversation and SalesCycle revisions | Context V2, action compiler; transaction conversation CAS |
| Product price and stock | Business fact envelopes and protected-claim producer; product ID, provenance and expiry | Selectable evidence, Responder guard, protected outbound readiness |
| Design and care attributes | ProductFacts V2 presentation/attribute projector; product and catalog scope | Selectable evidence and projection equality guard |
| Checkout completeness | SalesCycle checkout draft in CART_OPEN/ORDER_PREVIEW; four presence flags only | Canonical action compiler; SalesCycle owns draft and preview |
| Cart fee and offer | Canonical cart plus pinned policy and CART_READY; cart ID, revision, hash, expiry | Cart claim producer, exact formatter/guard equality; locked SalesCycle readback or mutation CAS at Outbox commit |

The model receives presence and missing-field names, not recipient name,
phone or address values. The allowed payment options are COD plus bank transfer
only when the pinned policy has a bank-transfer artifact. A clarification that
remains active in CART_OPEN can ask only the fields still missing even when the
next message no longer repeats a proceed-to-payment intent. The code-owned
checkout transition remains responsible for capture, revalidation and preview.
The inbound URL classifier permits a labeled Vietnamese checkout phone and a
standalone phone only while CART_OPEN or ORDER_PREVIEW; a numeric host with a path remains
subject to the existing URL policy. Dialogue is redacted before the live C3
adapter receives it.

Cart claims are enabled only when the pinned policy matches the current
bundle, a fresh CART_READY result binds the current cart, and the existing
cart-policy producer can reconstruct the exact claim. The final guard checks
the same cart identity/revision and producer value. A read-only cart turn
passes a SalesCycle readback through the existing atomic commit transaction;
it locks the row and checks revision, cart hash, expiry and readiness before
the Outbox row can be created. Cart mutation turns use the existing SalesCycle
plan CAS. A changed cart rejects the transaction and follows the ordinary
bounded inbox retry path.

The realtime runner owns the one response group and calls the shared C3 core
only when a single product is bound, the bot still owns the conversation, and
the current commerce branch can safely replace its text reply. The existing
SalesCycle owns all mutations, preview, confirmation and effects. The existing
Inbox/Outbox and delivery gate own deduplication and send. Provider failure,
invalid model output, projection/guard failure or unavailable canonical input
falls back to the existing guarded reply; the candidate cannot bypass the
verified-fact preservation check. `REALTIME_C3_LOCAL_TEST_ENABLED` wires a
model transport only in `DRY_RUN`; injected transport supports deterministic
LIVE-mode runner tests. No production activation is part of this change.

Enabled in this slice: a guarded product price reply and current-cart
shipping/free-shipping/promotion wording when the canonical producer supplies
those claims. ETA remains excluded because upstream delivery semantics are
unresolved. Multi-product and media replies retain their existing paths.
Trusted first-contact acquisition is still unavailable to this live adapter,
so it uses the adaptive lane; it never infers ad origin from dialogue. The
bounded realization surface remains in place, and no behavioral conversion
claim follows from deterministic integration tests. R2.8 benchmark ownership
review remains separate; this change does not edit the bundle, rubric or
historical runs.

## Sales-quality follow-up (after `afcd5cb`)

The C3 decision boundary must distinguish a newly requested shop fact from a
customer weighing a fact she already knows. In particular, a value objection
after a known price is not resolved by repeating the price. The Strategist now
receives the canonical dialogue act and reason codes as decision hints and is
instructed to select only relevant verified evidence for the exact question.
Those hints cannot grant factual or effect authority. The Responder still
selects only bounded nonfactual wording; an overly specific acknowledgement
that can misstate the customer's concern is not admitted.
The Strategist also sees the exact code-owned realization sentence of each
selectable evidence entry when one exists. This lets it compare the actual
sentences for overlap and question scope before selecting refs; it does not
grant new authority or permit the model to author factual wording.

The existing Google Sheets product registry feeds typed design, occasion, wear,
care and material attributes through ProductAttributes V1. Field-scoped,
deterministic projections of populated attributes are an authorized
selling-point surface under section 1; no separate approved-selling-point
column is required for those projections. `DESCRIPTION_OVERRIDE` also comes
from the registry, but description authority alone does not approve each
benefit in free-form prose. Any new promotional claim sourced from that prose
needs an explicit verified/curated claim with exact wording and product/source
binding before C3 can use it. Do not infer benefits from materials or model
knowledge. The registry's derived `AUTO_OK`/`NEED_REVIEW` extraction status is
not a human approval of promotional wording.

An exploratory `gemini-3.5-flash` run is not a model migration: held-out sales
probes still found an unconvincing reply to a prior poor-fit experience, and
provider timeout/transient errors prevented two of six outcomes from being
judged. The realtime server and C3 model pin remain unchanged. Compiler
success and response completion do not satisfy the behavioral acceptance
criterion above.

### Follow-up: adaptive measurement permission

On adaptive turns, product binding alone no longer makes
`ASK_MEASUREMENTS` available. The canonical pre-decision context must carry
`MEASUREMENTS_REQUIRED`, and the customer must still be able to provide the
measurement. This prevents a permitted but unrelated fit request from being
attached to a price, stock, policy, offer or delivery answer. Trusted fixed
first contact retains its separately specified measurement progression.

The decision prompt asks the Strategist to identify what the customer already
knows, the exact property or event still open, and why a proposed input would
change the current decision. These checks guide model choice; they do not turn
compiler acceptance into a semantic-quality certificate. If a real fit need
arrives without a canonical measurement blocker, the owning producer/state
transition must be corrected. C3 must not recover by allowing measurement
requests after every product-bound turn.

### Follow-up: request resolution and bounded voice

An adaptive request for media, an alternative, or a purchase step remains a
request when the available evidence cannot realize it. The Strategist must
select the relevant capability and report the unresolved part rather than
turning the turn into a content-free acknowledgement. A known budget gap is
not a reason to repeat the price or invent a value claim; a decision question
is useful only when its answer changes the next advice.

The Responder may choose from a slightly wider set of code-owned, nonfactual
acknowledgements and questions using the full redacted dialogue. Some frozen
and live turns lack a reliable objection reason code, so absence of that code
does not remove safe wording choices. The model still cannot author factual
text or effect claims. The uncertainty sentence now uses ordinary shop
language, while provenance, binding, exact checkout fields and the final guard
remain unchanged. This is a realization improvement, not proof that the
customer's question was answered or that a sale progressed.

### Follow-up: known non-free current cart

When the canonical cart has a known positive shipping fee, the cart-policy
producer can now expose a `FREESHIP` claim with `eligible: false` to C3, bound
to the same cart ID, revision, policy source and expiry as the fee. A null fee
does not imply a negative eligibility claim. C3 states the negative conclusion
through a code-owned sentence and revalidates it at the existing current-cart
boundary. The legacy protected outbound path does not request this additional
claim, so its claim set and reply path are unchanged. Frozen cases without a
full current-cart binding remain unable to state either positive or negative
cart claims.

### Follow-up: compound requests and composed voice

For a question with several requested parts, the Strategist declares one
supported proposition when any part has relevant, realizable evidence, selects
the evidence for each supported part, and names the unresolved parts in its
existing goal. This applies to stock plus a request for an alternative just as
it does to price plus another property. The current decision shape stays
minimal; `evidenceStatus` still reports authority for the declared capability
and is not a certificate that every part was answered. With no supported part,
the unresolved answer remains. No model-authored factual text is introduced.

Customer-facing factual projections omit an automatic opening `Dạ`, so a
concern acknowledgement followed by a verified fact does not repeat that word
across adjacent sentences. The exact projection equality check still binds the
full sentence to its source claim. When a fit answer is blocked specifically by
a canonical measurement request, the requested missing measurement itself is
the response; a generic uncertainty preamble adds no information. Confirmation,
thanks and purchase intent have bounded, nonfactual acknowledgement choices;
none is an order or payment effect receipt.

The unjudged `e695677` Luna DEV70 run is recorded in the sales-quality
evidence note. It showed the stock fact survives one compound stock/alternative
request, but the Responder can still omit the unavailable alternative even
when the goal names it. This remains an open behavioral gap under this
contract; `SUPPORTED` is not whole-question resolution. Frozen fit and
checkout cases with inconsistent canonical state remain producer/fixture work.

### Follow-up: editorial realization and stateful sales smoke (2026-09-23)

The six-field strategy contract and canonical authority remain unchanged. The
Strategist starts from the latest request, uses history to recover known inputs,
and asks a follow-up only when its answer enables an available recommendation
or a permitted transaction step. A missing shop fact cannot be obtained by
asking the customer another preference question. A lower-price conditional offer
does not establish commitment at the verified shop price.

The Responder's existing `factualTexts` now accepts either all selected evidence
texts, in order, or an empty array to use all original projections. A partial
array fails closed. For each supplied text the guard permits only removal of
the final politeness particle and an optional opening `Dạ, `; every factual word,
number, subject, negation, condition and punctuation stays bound to the source.
This supersedes the zero-length-only slot described above. It does **not** yet
provide unrestricted natural factual paraphrasing or prove naturalness acceptance.
Acknowledgements, uncertainty and progression remain bounded choices. Color
confirmation questions may name colors present in selected authoritative
evidence; this neither binds a variant nor establishes buying commitment.

The shared core composes validated segments into one customer-facing text,
removing only the final politeness particle of non-final segments. Runtime hashes
that actual outgoing text at the existing protected outbound boundary. Evidence
segments and claim hashes remain available for validation and diagnostics.
Multi-product facts without display names use their canonical product IDs as
labels, never an invented product name. Refund reason alternatives use `hoặc`;
the reporting deadline remains a required condition.

The opt-in Luna runtime smoke uses `RealtimeRunner.processOne`, persisted
in-memory conversation/commerce state and mock business ports. It retains every
synthetic turn, model request/response, fallback reason and state transition.
It is runtime-entrypoint evidence, not live integration or conversion evidence.
Luna uses a test-only identity adapter; the production model pin is unchanged.
Frozen DEV70 remains unmodified and is a separate behavioral probe. Neither
completion nor passing the schema is a sales-quality score. Full question
coverage, useful next steps and customer-facing tone must be reviewed from the
resulting transcripts, with remaining gaps reported explicitly.

The response schema enumerates the same editorial variants accepted by the
guard, closing a mismatch where a writer obeyed the voice instruction but
removed repeated particles inside a multi-sentence policy. Those policies are
now composed at their typed projector, retaining every condition and amount.
For a supported ANSWER, `answerText` selects null (request covered) or the
existing uncertainty sentence (a requested part remains uncovered). A generic
acknowledgement cannot replace that choice. This reduces the competing wording
choices; whole-question coverage still requires behavioral evaluation.

Runtime follow-ups do not require a new commerce mutation: a persisted canonical
SalesCycle record is sufficient to build a fresh decision context. Existing
ownership, media, handled-effect, cart-readback and protected-outbound checks
still apply. This closes the gap where advisory turns silently bypassed C3
because the cart had not changed. Size token extraction at the commerce
boundary uses Unicode letter boundaries so Vietnamese words such as `sẽ` and
`lấy` cannot become sizes S and L. Color confirmation wording is offered only
for a catalog color literally mentioned in the latest inbound; it does not
infer interest from catalog availability alone.

Commerce advancement shares the conversation ownership boundary: after a
handoff, a HUMAN-owned conversation cannot capture checkout details, create a
preview or confirm purchase through SalesCycle. A later inbound is not an
implicit return to BOT ownership. The Luna runtime journey exposed this missing
entrypoint check; regression coverage exercises details, payment and confirmation
after handoff. Automatic cart size editing remains a separate unmet capability;
handoff preserves the cart and must not be reported as a successful size edit.


### Follow-up: authored adaptive prose, preserved first quote (2026-09-24)

Owner instruction: preserve the first-contact quote form and minimize templates
on subsequent turns. This changes the temporary implementation limit; it does
not change the Strategist contract or give either model commerce authority.

- `FIRST_CONTACT_FIXED`: same trusted acquisition classifier, fact selection,
  response schema and fixed price/useful-fact/single-question form.
- `ADAPTIVE_FOLLOWUP`: the Responder authors `answerText` (up to 600 characters)
  and the one requested `progressionText` (up to 300), using dialogue and the
  compiled goal. Neither field has a sentence enum. Code no longer inserts
  generic unresolved/partial-answer sentences into this lane. The writer names
  the actual unanswered part, acknowledges reported context only when useful,
  and asks for missing customer input that can advance the current decision.
- `factualTexts` remains the lossless editorial projection of every selected
  fact, in order, with claim hash, subject, scope, freshness and current-cart
  checks. This slice enables free conversational prose, **not arbitrary factual
  paraphrase**. The three existing fields are retained for that boundary.
- A direct, fully sourced `BUSINESS_LOCATION` answer uses the selected
  code-owned projection without a model preface. The generic customer-PII
  detector can misread “địa chỉ shop” in that redundant preface as a customer
  address. The selected factual text still passes the normal PII, exact
  realization and provenance checks; no model-provided address is authorized.
- Checkout requests remain code-owned exact missing fields/payment options;
  both prose slots are null. KEEP_OPEN/HOLD_POSITION have no progression.
  Model output cannot execute a cart, order, payment or messaging effect.
- The existing PII/production/checkout guards also check authored prose. A small
  conservative assertion/effect check rejects common unbound statements; it is
  not a semantic proof for unrestricted Vietnamese. Question count is enforced,
  but relevance, indirect requests, unsupported implications and tone remain
  behavioral review responsibilities. Passing schema/guards does not certify
  sales quality or readiness for customer traffic.
- Customer dialogue describing an order is context, not an effect receipt.
  Authored prose must not convert “chị đã xác nhận đơn” or a passive order
  confirmation into a completed order claim without a bound external receipt.

Runtime ownership correction: after a successful, validated adaptive C3 reply,
legacy reply claim types no longer dictate the evidence the Strategist must
select. The old subset check forced a price objection back to a price card.
The fixed acquisition lane still preserves baseline fact types. A failed C3
call or rejected draft still uses the already-built verified fallback. This is
an intentional C3-enabled behavior change, tested through `processOne`; C3-off
r31.3 behavior and failure preservation are unchanged. No price-objection phrase
list, benchmark-case switch, additional model judge or durable state is added.

Complexity delta: reuse the existing three fields, remove adaptive sentence
banks and generic text injection, retain existing fact/effect boundaries. The
known two PII-free locality question exceptions are DLP compatibility only;
they are not supplied as response choices. The remaining limitations (automatic
size editing, older checkout opening payment wording, unsupported capabilities,
heuristic prose safety and model-dependent relevance) must be reported with the
new Luna histories, not hidden by compiler completion counts.


The first free-prose Luna run exposed a boundary mismatch: the writer sometimes
repeated selected facts in `answerText`, and a mention of unconfirmed promotion
triggered the legacy offer guard. The corrected prompt/schema labels this field
as an optional nonfactual preface, uses em/chị, and explicitly leaves direct
answers to the selected fact slots. Product assertion checks use clause starts,
not a nested topic inside a reported concern or uncertainty. Only C3 GENERAL
text may pass the promotion keyword check when **every** promotion mention is
inside a bounded uncertainty clause; any amount/percentage, promise or separate
affirmative offer remains rejected, as do all other guard reasons. No promotion
authority is created, and the shared legacy guard is unchanged. This remains a
conservative syntactic check with disclosed limits, not a semantic safety proof.


Final follow-up to that run: the same bounded uncertainty rule covers freeship
mentions (not positive free-shipping claims). Polite Vietnamese requests may end
with a period: the single progression slot is still required for ASK, but code
rejects more than one question mark rather than requiring exactly one. This
syntactic check cannot prove that a sentence contains only one semantic request.
Free-prose slots trim outer whitespace before their existing validation; factual
projection strings remain exact. These changes have focused regression evidence;
a fresh full Luna run is still required after the recorded provider usage limit.

### Follow-up: current fit evidence and task-shaped prose (2026-09-24)

Root-cause review starts from `7c6623a`, retaining the reviewed PR371 ancestry.
The original permission rule remains: adaptive `ASK_MEASUREMENTS` requires a
canonical `MEASUREMENTS_REQUIRED` barrier; a resolved product is insufficient.

- Realtime passes its existing verified Size Engine claim to the C3 producer.
  The producer uses the existing protected-claim builder, expected product and
  freshness checks. It must not discard that claim by supplying `sizeClaim: null`.
- For a current fit request identified by existing typed runtime intent, the
  producer also consumes the current Size Engine decision. `ASK_MORE` with a
  verified chart for the bound product and missing body measurements contributes
  an ephemeral `MEASUREMENTS_REQUIRED` barrier. No chart, a preference-only
  question, a successful recommendation, or an unrelated turn does not grant
  this permission. The captured context retains the same measurement blocker.
  This does not advance commerce, infer commitment, or persist a new state.
- Only the commerce clarification reason `CHECKOUT_DETAILS_MISSING` contributes
  `CHECKOUT_DETAILS_REQUIRED`. A product/variant clarification is not missing
  recipient details. Existing stage, current-cart and commitment checks remain.
- On an adaptive ASK with no selected factual text, `answerText` is null and
  `progressionText` is the entire authored reply. It can briefly give customer
  context before its one assigned request. This removes two competing prose
  slots for one question without supplying any sentence bank. With selected
  facts, prose may identify a remaining unanswered part; `SUPPORTED` never
  means the entire customer request has been answered.
- Strategist instructions distinguish missing customer criteria from missing
  shop evidence. Qualification can establish which available evidence matters;
  it cannot promise a lookup, alternative or effect the runtime cannot execute.
  ETA estimates establish neither guaranteed arrival nor impossibility.

The first-contact quote schema and wording are unchanged. Lossless factual
projection, exact checkout fields and authority guards remain code-owned. No
DEV70 case identifiers, new phrase templates, model judge or durable state are
added. Prompt changes require fresh model-output review; deterministic tests do
not establish naturalness, sales effectiveness or semantic completeness.

Known limit: the previous Luna fit journey provided no size chart and disabled
customer profiles. It does not prove that a measurement request should have
been permitted. The runtime regression now distinguishes verified-chart missing
measurements, a usable recommendation, absent shop evidence and unrelated turns.
Body-part-specific concerns beyond the Size Engine's present recommendation
basis and automatic cart size editing remain separate capabilities; this
follow-up does not claim to complete them.

### Follow-up: payment choices in the cart reply (2026-09-26)

The cart-opening and cart-edit replies list only payment methods supported by
the resolved policy. COD remains available; bank transfer appears only when a
published payment artifact enables it and its version reference resolves. The
checkout clarification and payment selection use the same resolved authority.
This changes the older cart reply that listed transfer even with no payment
artifact. Its protected outbound payload and effect-authorization hash therefore
change together; the pre-B2.3b differential records that deliberate deviation
as a violation against its immutable baseline while keeping the original claim
hashes. A no-artifact and an enabled-transfer cart-opening test exercise both
branches. No payment effect or payment instruction is created by this wording.

The subsequent actual Luna run exposed a typed bypass: an unresolved `SIZE_FIT`
decision selected ordinary `ASK SIZE` and asked for body measurements. The
compiler rejects that combination; it does not turn all purchase size choices
into canonical requests. `ASK_MEASUREMENTS` remains the only measurement path.
This finite check is not a semantic classifier for arbitrary prose.

Money detection also uses Unicode token boundaries for Vietnamese currency
units, so a product code followed by `kỹ` is not read as a `k` amount. The
bare-price keyword fallback masks whole verified product identifiers only;
currency parsing still inspects the original text. Actual and invented price
amounts remain subject to the same source authority. No sentence whitelist is
introduced.

### Follow-up: current-cart variant edits and preview renewal (2026-09-25)

Before a cart exists, a bare size/color answer or an explicit “chọn size/màu”
choice remains a variant selection, even with a polite closing particle or a
model `COMMITTED` label. It cannot authorize `OPEN_CART`. An explicit purchase
verb in the same message, or a separate positive buying commitment, can still
advance the commerce flow after product and POS checks. This intentionally
narrows the earlier deterministic `CONFIRMED_SIZE`/`CONFIRMED_COLOR` inference
for variant-only utterances; the no-cart journey and direct-purchase controls
cover the difference.

The verified variant selected on a no-cart turn remains in conversation
state. A later explicit commitment may use that selection when the customer
does not repeat the size or colour. POS selection still checks the current
product and variant before opening the cart; a selection alone remains
insufficient to buy. The runtime journey covers this cross-turn case through
checkout, preview and internal confirmation.

A customer correction to the size or color of an open cart is a cart edit, not
a new buying commitment. The runtime identifies a unique cart line, resolves
the requested variant through the current POS snapshot, and submits a
`SET_LINE_VARIANT` mutation with the complete POS-resolved replacement line.
The older `SET_COMPONENT_VARIANT` kernel operation cannot atomically replace a
multi-component offer and its authoritative unit price, so it is not used for
this flow. The new operation preserves line, parent product, offer and quantity
identity, while the cart kernel recalculates the policy totals. A deterministic
authority receipt binds the source message, exact mutation and resulting cart;
the locked transaction replays the mutation and negotiation before commit.
Ambiguous product/color requests, unavailable variants and stale source facts
leave the existing cart unchanged.

Any edit invalidates the prior order preview. The reply presents the revised
cart and asks only for missing checkout fields. When a complete existing
recipient draft is still current, the customer can explicitly confirm those
details to produce a new preview bound to the revised cart. Purchase
confirmation requires this new preview; an old preview cannot authorize a
later confirmation. The variant edit does not create a POS order or receipt.

### Follow-up: destination-bound ETA (2026-09-25)

The catalog fulfillment policy's preparation days are not a customer delivery
estimate. The static ProductFacts V2 producer has no destination region, so
its `etaToCustomer` is null. An ETA reply requires a current region-bound
catalog lookup that combines preparation and carrier transit ranges, including
the preorder preparation rule when applicable. A missing region, transit range
or expired source cannot be presented as a delivery promise. Media wording
remains subject to the existing verified attachment/effect boundary.

### Follow-up: explicit alternative search (2026-09-25)

An explicit request to find another product bypasses current-product
continuation. Semantic search excludes the currently bound product before it
chooses the best candidate, so the same product cannot be returned as its own
alternative. Candidate admission still uses the existing search thresholds.
This retrieval correction does not authorize a price, stock or comparative
claim for the new product. Those claims require separate current evidence and
product binding.

### Follow-up: explicit durable customer preferences (2026-09-25)

When the customer explicitly states a color, material or style preference,
the existing pseudonymous profile records the bounded value with source event
hash and time. An explicit rejection removes that value; an explicit change of
mind replaces the old value for that field. A cart variant edit by itself is
not a durable preference. The model receives only the minimized preference
values in its existing profile context. These preferences guide retrieval and
conversation; they never authorize product facts, checkout details or effects.
Temporary budget, occasion and rejected-product context remains a separate
session capability and is not silently written into the durable profile.

### Follow-up: bounded session decision context (2026-09-26)

The existing conversation-state transaction may retain only explicitly stated
session budget, occasion and rejected product codes. Corrections replace the
previous budget or occasion; explicit re-selection removes a rejected code.
This context is customer-reported, never a shop price, product attribute,
checkout field or effect authority. It is not copied into the durable customer
profile. The C3 runtime receives a typed, PII-safe session note plus the most
recent 14 dialogue messages when such context exists, or the most recent 15
messages otherwise. This respects the existing 15-message provider contract
while preserving a previously stated decision input beyond the 30-message
history read. The ordinary model sees the session context in its existing
state payload. Unresolved-question memory and richer free-form corrections
remain open; neither can be inferred from a reply without tracking whether
the question was actually answered.

### Follow-up: accepted history recovery (2026-09-25)

On the next customer turn, the canonical history reader scans a bounded set
of accepted Outbox units that have no history identity. It decrypts only the
still-retained accepted payload, records each unit through the existing
idempotent history writer, then reads the resulting PostgreSQL history for
model context. Redis remains a projection and a read fallback. Recovery
never invokes the delivery sender or changes Outbox acceptance. Pending,
ambiguous and failed units are excluded. Payloads past their encryption
retention cannot be reconstructed by this path. An isolated PostgreSQL fault
injection verifies rollback and idempotent recovery; a runtime test verifies
that a failed Redis projection append does not displace the canonical
PostgreSQL read. The encrypted Outbox recovery window is at most 20 days,
while canonical message retention is six months. Recovery after Outbox
payload expiry remains impossible if the canonical write never succeeded.

### Follow-up: empty hard-stop acknowledgement (2026-09-25)

For an adaptive `ACKNOWLEDGE` with canonical `HOLD_POSITION` and no selected
evidence, the response schema permits only “Dạ vâng chị ạ.” or “Dạ em cảm
ơn chị ạ.” The compiler checks the same bound and uses the first phrase if
the model leaves all prose empty. The continuation stays empty. This covers
a customer's closing thanks without echoing an unverified order claim or
reopening checkout. A model-authored effect claim, including a passive
“đơn đã được shop xác nhận”, remains rejected; this acknowledgement does
not prove a POS order exists.

### Follow-up: product identification versus recipient details (2026-09-25)

When the current product binding is stale, `ASK_PRODUCT` may request the
model name, code or image, including “tên hoặc ảnh mẫu”. That request does
not collect the recipient's name for checkout. The shared premature-order
guard distinguishes these product-identification alternatives while still
rejecting requests for “họ tên”, “tên người nhận”, phone or delivery address
before a buying signal. The product remains unresolved until a later verified
binding; this wording change grants no stock or cart authority.

### Follow-up: unconfirmed dispatch wording (2026-09-25)

An ETA claim describes delivery time only; it does not establish when the
shop will dispatch the item. The Responder may say that the dispatch date is
unknown, including a subordinate mention of when the shop will send it. The
effect guard distinguishes that bounded uncertainty from an assertion that
the shop will send it. An affirmative shipping promise in the same or a later
clause remains rejected. This wording does not grant fulfillment authority.

### PR377 P00–P04 implementation amendment (2026-10-01)

This amendment records the bounded implementation selected by the P00–P04
root-cause pass. It does not change the six-field Strategist contract, the fixed
first-contact policy, commerce authority, or the rule that model output is
untrusted until code validates it.

- **P00 evidence boundary:** exact-head CI remains the integration authority.
  Historical failing runs remain historical; a later green head does not rewrite
  their result or cause. Source-only findings, focused reproduction, and full
  runtime evidence stay distinct.
- **P01 cart/variant input:** malformed, stale, mismatched, or ambiguous cart
  binding is fail-closed for cart evidence without deleting independent product
  facts. Cart and claim expiry strings must parse as finite dates. Product
  variant IDs are opaque identifiers: customer-facing color/size is emitted only
  from one product-bound presentation mapping; missing, cross-product, or
  duplicate mapping is a realization capability gap, never a cue to parse the
  ID text.
- **P02 catalog authority:** the acceptance path is producer -> isolated Qdrant
  index -> production adapter -> ProductFacts/C3 selectable evidence. APPROVED
  source fields may surface; `UNKNOWN` stays unknown and unapproved image rows
  do not publish a product. XML description prose is not promoted into approved
  wear properties, size fit, policy, or destination ETA. The integration test
  owns a loopback Qdrant process and temporary collection and never writes a
  live index.
- **P03 bounded realization/guard:** `factualTexts` may reorder complete
  source-owned realization units on adaptive turns, but every selected unit must
  appear exactly once and remain lossless. It may not split, merge, paraphrase,
  change subject/condition/negation, or use an ambiguous match to rebind a fact.
  The bounded uncertainty exception covers only an unconfirmed mention with no
  value or promise for the already guarded stock/fit/ETA/offer topics. This is a
  conservative syntactic allowance, not a semantic certificate for Vietnamese
  free prose.
- **P04 compound coverage and recovery:** `SUPPORTED` describes the selected
  proposition, not whole-turn completeness. A valid `answerText` that names an
  unanswered part survives selected-facts recovery. If authored prose itself is
  rejected, recovery may pair already-selected verified facts with the fixed
  incomplete-answer limit; it may not invent the missing fact, strategy, effect,
  or customer request. A public shop-location fact remains source-owned even
  when a model preface is rejected by customer-PII DLP.

Focused verification for this amendment covers cart expiry/binding, opaque
variant mapping, production projection guard, adaptive Responder recovery and a
real isolated Qdrant round-trip. Exact PR-head CI is still required after these
changes are committed; this section does not claim that future head green in
advance.


## PR377 quality-closure Slice A amendment (2026-10-01)

This implements only Slice A of PR380 at `c26c7d7a20b8461937dd3080b592c47caccd32f2`.
It does not close semantic guard Slice B, the twelve-journey Slice C matrix,
real-model runtime acceptance, DEV70 R2, P11 or P12. PR377 remains draft.

### Ownership and precedence

Strategist owns the current need, history referent, evidence selection,
unsupported requested parts and one justified progression. Latest inbound has
focus precedence; a correction may complete an immediately pending question;
older context cannot reopen answered topics. Canonical code context owns
state/action authority, selected evidence owns shop facts, and dialogue owns
customer-reported context only. Hard stops precede ordinary progression.

Both fixed and adaptive Responders own wording only. The compiled task fixes
intent, concern, evidence and progression. Dialogue can help tone and reference,
not re-route the task. The writer cannot derive a preference-to-benefit bridge,
price comparison, ETA relation, fit or business effect. Complete selected factual
units and existing derivation/guard paths remain unchanged. Legacy prompt
identity specimens remain frozen; the shared instruction resolver maps them to
the current centralized prompts, as tested by the prompt-contract suite.

### Known inputs are compiled, not re-interpreted by the writer

The current validated session budget reaches C3 as `knownBudgetVnd`; only its
presence (`budgetKnown`) is added to Strategist constraints. When known, BUDGET
is absent from the provider continuation schema and is rejected independently
by the compiler. The compiler does not invent a substitute progression. This
also holds when the product is unresolved.

Current verified, product-bound Size Engine `ASK_MORE.missingInputs` supplies
`measurementRequestedFields` using the existing MeasurementKind enum. Code
removes already-known positive finite measurements and excludes FIT_PREFERENCE.
An empty field list cannot authorize ASK_MEASUREMENTS. The canonical responder
task carries the exact remaining fields; neither goal nor dialogue selects them.
No measurement metadata in the live adapter means no adaptive measurement
request. Historical direct/frozen callers retain the height/weight default;
stateful real-runtime evaluation uses the actual Producer/Size Engine bridge.
Fixed first-contact selection and its known-input checks stay code-owned.

### Why the bounded goal fallback, not a new typed subsystem

The existing Producer fact query has one intent (NONE/PRICE/STOCK/SIZE/ETA),
plus a separate single policy question. It cannot represent price plus an
unsupported product attribute without changing the Producer contract and its
consumers. Therefore this slice uses the closure plan's five-section goal
fallback, not a new request taxonomy, store or orchestration layer.

The compiler validates section count/order/nonemptiness after the existing PII
redaction. NEED cannot be NONE. NEXT is present exactly when the validated
decision requests an input; it cannot authorize that request. A terminal
UNRESOLVED answer or selected unrealizable evidence requires LIMIT. All evidence,
permission, binding and freshness checks remain independent of those strings.

A supplied limitation requires a non-null answer slot when the task has an open
answer slot. This is a **structural presence check**, not proof that arbitrary
Vietnamese text states the correct limitation. With a question-only task, its
single progression slot remains the only prose slot. Checkout-details and hard
stop tasks have closed answer semantics: a goal with a LIMIT is rejected rather
than silently dropping it or opening a checkout prose side channel. A Strategist
must not hide an unresolved question in those closed slots.

At the Slice A checkpoint, coverage correspondence, wrongful attribute
substitutions, unsafe inference and semantic recovery remained open. The Slice B
amendment below supersedes that checkpoint for its finite guarded families only;
arbitrary natural-language meaning and real-model acceptance remain unverified.

### Verification boundary

New regressions cover prompt ownership, KEEP_OPEN, signal removal, known budget
schema/compiler rejection, exact missing measurement handoff, structured goal
validation/PII/closed slots, and a price plus unsupported-attribute request with
both reply parts retained. A null limitation is rejected. Existing scripted
fixtures were migrated to the same grammar without changing their business
assertions, facts, rubric or thresholds. These are deterministic controls only;
no real model, DEV70 generation or judge was invoked.


## PR377 quality-closure Slice B: two-sided semantic guard (2026-10-01)

This amendment follows local Slice A `541c3e3ad414de4fc91920c6c719e278d452fef7`.
It does not close P11/P12 or authorize real-model evaluation, merge, deployment,
traffic, a different rubric or an authority transition.

### Guard ownership and finite boundary

The existing source-bound, immutable factual projections remain mandatory.
`track-c-c3-conversational-guard.ts` distinguishes a small set of non-fact
statements in GENERAL segments: customer price reference/refusal, customer
size selection, bound product referent, locality request and bounded uncertainty.
These are internal guard classifications, never model-authored permission tags.
No exemption applies to VERIFIED_CLAIM, FACT_PROJECTION or EFFECT_CLAIM segments.

A customer price mention repeats one complete amount token from both the latest
customer inbound and the compiled KNOWN context. It does not approve that price,
change a budget, authorize a discount or turn a conditional offer into commitment.
Size acknowledgement requires the validated Producer selection and source span
for that exact size/product; a stock question mentioning another size cannot
select it. A reference may only name a currently bound product. Neither kind of
acknowledgement asserts fit, a product attribute or a completed cart change.

The existing runtime Producer output and redacted dialogue are passed to both
C3 compilation and its final RealtimeRunner egress check. They do not enter the
writer schema as new authority, and no extra model/history/business call occurs.

Only complete finite statement forms can bypass keyword-level fact detection.
Mixed reference plus unknown prose is rejected, not stripped. Mixed uncertainty
with another clause retains all original guards. Unknown uncertainty vocabulary
gets no new exemption. The supported epistemic forms use closed nominal topics,
not a blacklist of conjunctions: a prefix such as "not confirmed" cannot license
an independent positive/negative property claim later in the same sentence.

The locality exception is full-string equality against a closed request grammar
for an already assigned ASK LOCALITY. It contains no recipient values or address
slot. Full address/name/phone requests remain subject to the existing PII and
canonical-checkout boundaries; DLP and recipient capture are not disabled.

### Requested-property coverage and recovery

The six-field Strategist contract and Slice A structured-goal fallback stay
unchanged. An internal LIMIT must be expressed epistemically and retain its
assigned topic. The finite paired topic anchors are wrinkle resistance,
smoothness, weight and dispatch time. They preserve Vietnamese diacritics so a
receipt mention does not become a wrinkle topic. A generic acknowledgement or an
uncertainty about another attribute is not coverage.

For a NEED that explicitly requests wrinkle resistance, material/smoothness or
price evidence alone cannot certify an answer with LIMIT NONE. Reuse the
existing typed `wearWrinkleResistance=REDUCED_WRINKLING` field when selected and
realizable, or keep the wrinkle limitation. The compiler neither chooses new
facts nor derives wear properties from a fabric name.

Supported selected facts survive eligible Responder transport/JSON/guard
recovery. For the finite limitation families, recovery uses fixed topic labels,
not raw model goal text, so price plus unsupported wrinkle still names both
parts. Existing eligibility, cancellation, provider, effect, cart, freshness,
provenance and unrealisable-evidence restrictions remain in force.

Price ordering stays in the existing compatible-offer code derivation. ETA
relations stay in the existing numeric deadline helper. Exact projected facts
cannot be changed from cheaper to lighter; unrelated superiority/value or
implicit arrival promises in prose remain unauthorized. An ETA of 2-4 days
never licenses a model claim that a 5-day deadline is inside that interval.
Unconfirmed dispatch is not a shop commitment, including passive dispatch wording.

### Verification and explicit residuals

Paired controls exercise shared C3 compilation/guard/recovery and the real
Producer -> RealtimeRunner orchestration with safe scripted model and business
ports. The added runtime trace option is test-only and stores synthetic input,
reply, before/after state, commit payload/receipt and role calls outside the repo.
This is not the full Slice C matrix and is not real-model acceptance.

The guard does not certify arbitrary Vietnamese paraphrases, intent extraction
or every possible property/relation. Unknown topic recovery remains generic.
The finite grammar may conservatively reject safe wording; expand only with a
structural owning-boundary fix and paired tests, not DEV case exceptions.

A separate pre-existing runtime limitation was reproduced against Slice A:
verified active-variant state plus a parent-scoped price can fail the pre-C3
`PROTECTED_CLAIM_VARIANT_SCOPE_MISMATCH` guard. The runtime remains fail-closed
with human ownership/no outbound in this control. Slice B preserves that
boundary; resolving its intended scope belongs to the remaining runtime work,
not a wording exemption. No completed variant/checkout journey is inferred from
selection acknowledgement controls.

Evidence: `tasks/evidence/pr377-slice-b-20261001.md` and the external exact-source
handoff/command ledger. Real-model runtime acceptance and DEV70 R2: NOT RUN;
P11: OPEN; P12: BLOCKED pending remaining Slice C work and Agent 2.
