# Draft Spec: Track C C3 strategy contract simplification

**Status:** Draft / evidence input contract, scope and checkout alignment

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

The initial implementation slice retains code-owned factual segments and the
bounded nonfactual wording surface reviewed in PR #371 at exact HEAD
`da12894e84551b66f8048782a5e170925f720197`, in
`apps/worker/src/track-c-c3-strategy-contract-runner.ts`. This is an explicit,
temporary implementation limit, not a requirement that all future replies use
fixed templates. It does not by itself satisfy the naturalness or
question-resolution requirements. If that surface cannot express a partial
answer and its remaining uncertainty, record the realization capability gap;
do not discard valid evidence or treat completion as successful resolution.

The next bounded correction reuses that same vocabulary in the existing
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

## 6d. Known implementation gaps

Recorded as gaps against this spec, not as revisions to it.

- **C3 is not wired into the runtime.** Neither `realtime-server.ts` nor
  `realtime-runner.ts` calls the contract runner; the legacy path still owns
  live replies. Until an integration slice exists, no offline result is
  evidence of live behaviour.
- **Single-product context.** `ContextV2` carries one `productAttributes` and
  one `productPresentation`. A reply covering several bound products cannot
  name them all, so a multi-product answer stops rather than guessing. Closing
  this needs product-keyed projections and matching producer/binding work, not
  a field changed to an array.
- **Negative freeship is not producible.** The cart-policy producer emits
  `FREESHIP` only with `eligible: true`; a non-free cart is represented by
  `SHIPPING_FEE` when the fee is known.
- **Cart answers need a current-cart binding.** `ContextV2` carries no cart
  identity or revision, so no cart-scoped fact can be revalidated before egress
  and none is stated. Closing this needs that binding in the input contract,
  not a renderer.
- **ETA semantics are inconsistent upstream.** `catalog-projection.ts` sums
  preparation and transit, while `realtime-product-facts-v2.ts` assigns
  `etaToCustomer` from preparation bounds alone. Fulfilment projections here
  report preparation and delivery as separate spans, but the upstream
  disagreement is unresolved and is a prerequisite for any deadline reasoning.
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
