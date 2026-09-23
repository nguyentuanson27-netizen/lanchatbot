# C3 sales-quality evidence, 2026-09-23

Baseline for this follow-up: draft PR #374 at `afcd5cb37d5b0e96b9167c583e52752030bd36c2`.
This review uses six new synthetic conversations outside DEV70. Each run calls
the shared C3 Strategist and Responder core with the existing simulation facts;
it does not contact customers or mutate a live cart. The cases test whether
the reply addresses the customer's actual buying decision, selects relevant
verified facts, avoids repeating known facts, and makes a useful next move.
They are qualitative probes, not a statistical conversion measure.

| Concern | Current pinned Flash Lite output | Assessment |
| --- | --- | --- |
| Known price versus budget/value | Generic acknowledgement, no product evidence | Does not help customer weigh value |
| Comparison with stated preference | Repeats overview, design and material | Relevant facts, but redundant and unnatural |
| Earlier uncomfortable purchase | Generic acknowledgement and broad product overview | Does not establish what failed last time |
| Specific waist fit with other measures already known | Asks for a measurement, but generically | Directionally useful; specificity is weak |
| Dispatch date versus delivery duration | States 2–4 day delivery estimate | Wrong event; question remains unanswered |
| Delivery deadline versus verified ETA | Gives ETA and a conservative deadline conclusion | Useful and appropriately bounded |

An exploratory full-core `gemini-3.5-flash` run improved the known-price and
dispatch cases and asked for the specific waist measurement. The earlier bad
experience reply was still broad. Two of six cases could not be judged due to
provider timeout/transient errors. This is insufficient evidence to change the
pinned model. The exploratory run is not part of the PR implementation.

Code checks after this follow-up: 44 focused C3 runner tests passed; worker
TypeScript compilation passed. Those checks prove contract handling, not the
sales-quality outcomes above. The product registry already supplies typed
attribute projections that satisfy the spec's allowlisted deterministic
projection route. A generic description override is not proof that each
promotional benefit in its prose was verified or curated; no separate selling
point column is a prerequisite for using the existing typed projections.

Remaining acceptance work: improve selection of relevant existing typed
attributes and decision-specific conversational realization without widening
factual/effect authority; then run judged out-of-sample and DEV70 regression
through the runtime entrypoint. If free-form description benefits are later
needed, bind each to product identity, source version and exact curated wording.
Do not activate traffic on the basis of this report.

### Follow-up: realization preview

The Strategist now receives the exact deterministic sentence that selecting
each fact would print. Re-running the same six synthetic conversations on the
pinned Flash Lite model changed the value objection from generic acknowledgement
to acknowledgement plus material/design facts, and reduced the comparison reply
from repeated overview plus fields to one overview. The prior poor-experience
reply still added price and broad attributes without finding the failed aspect;
the dispatch-date question still received a delivery-duration estimate. The
waist question remained generic, and the deadline conclusion remained bounded.
This is a narrower evidence-selection improvement, not a sales-quality pass.
An exploratory stronger Strategist request for the prior-experience case timed
out, so it provides no acceptance evidence.

### GPT-6 Luna root-cause follow-up at `ff6839c`

The candidate now requires a canonical `MEASUREMENTS_REQUIRED` blocker before
offering adaptive `ASK_MEASUREMENTS`; fixed first contact remains separate.
The Strategist instruction makes known facts, exact question scope, and the
reason for any next input explicit. The bounded `DECISION_CRITERION` wording
can ask which part of a previous purchase was uncomfortable or which product
point remains hard to justify against the customer's budget. No commercial
fact, effect authority, output field, or model pin was added.

An offline GPT-6 Luna `medium` run sent all 70 frozen DEV cases through the
current C3 core, with Luna supplying both model stages and the code compiler,
projector, and final guard retained. The run completed 62 guarded replies;
four cart cases lacked the full canonical cart identity/revision needed by the
current-cart binding, two stale captures rejected before a model call, and two
multi-product price answers failed because a safe display label was not
available. The run is not a judged 62/70 sales score. It used a temporary
evaluation-only provider identity adapter and did not execute realtime
transport, Outbox, or customer traffic. The full histories, decisions and
replies are retained in the owner-local `LUNA_DEV70_ROOTFIX_GATED_20260923`
artifact, bound to code commit `ff6839c`.

Observed improvement: the dispatch-date question no longer receives the
delivery-duration ETA; the wrinkle question no longer treats material as
wrinkle evidence; unrelated measurement prompts after stock, policy, offer,
and delivery answers disappeared; a previous-discomfort holdout asks which
part was uncomfortable. A known-price value objection with verified design
attributes selects a relevant design projection.

Remaining sales-quality gaps are material. A budget objection with only a
price fact can still end in generic acknowledgement; design projections do
not explain value by themselves. The available bounded Responder surface is
still formulaic. DEV fit case `V5V4Q035` asks for fit guidance while its frozen
canonical context has no measurement blocker, so the safe reply is unresolved;
that input disagreement must be fixed at the producer/fixture boundary rather
than widening `ASK_MEASUREMENTS` globally. DEV deadline cases receive the
verified ETA but lack a canonical deadline constraint for a guarded conclusion.
The four cart fixtures need full current-cart binding, and multi-product
answers need authoritative product-keyed labels. The six independent holdouts
remain qualitative probes, not conversion or behavioral acceptance evidence.

Verification for the code change: worker TypeScript build passed, 45 focused
C3 runner tests passed, and the realtime runner C3 entrypoint test passed.
The present result does not authorize a model switch, merge, deploy, or
traffic activation.

### Full-history Luna follow-up at `032dac7`

The next bounded-voice revision ran all 70 frozen DEV histories through the
compiled C3 core with GPT-6 Luna in both model stages. The unjudged execution
result was 66 guarded replies, two expected stale materialization rejects,
and two multi-product label failures. The four cart cases that previously
lacked bindings were run with current-cart readbacks materialized from the
frozen R2.9 fixtures. Their cart IDs, revisions, hashes, expiry, policy source
and claim equality are recorded in the owner-local
`LUNA6_DEV70_C3_032dac7_20260923T091721Z` artifact. These are synthetic
simulation inputs, not production cart evidence. The complete histories,
both-stage model outputs, final replies, manifest and qualitative comparison
are preserved there. No judge ran and 66 is not a sales-quality score.

The revised vocabulary produced more specific acknowledgements for price
concerns and a correction, and the budget-gap case asked whether to stay
within the customer's budget or keep considering the model. It also exposed
remaining defects: another price-comparison case repeated a known price;
a prior-quality concern asked a broad criterion question; an out-of-stock
alternative request stated only the stock fact; an unsupported media request
became a cautious limit rather than a content-free acknowledgement; and a
purchase request with no canonical effect receipt still received only an
acknowledgement. The frozen fit case without `MEASUREMENTS_REQUIRED` and the
deadline cases without structured constraints remained unresolved in the
same ways. Six independent full-core Luna holdouts on that commit found one
budget turn asking for an amount already supplied. Completion and bounded
wording therefore still do not satisfy behavioral acceptance.

The following source revision narrows `BUDGET` amount requests in the prompt,
requires the Responder to state an uncovered part of a compound request, and
adds a C3-only negative freeship claim when the current cart has a known
positive shipping fee. The legacy cart claim set remains unchanged. These
changes need a new exact-head behavioral run before claiming improvement.

### Full-history Luna follow-up at `fe19c68`

The `fe19c68` candidate ran all 70 frozen R2.9 DEV histories through the
compiled C3 core with GPT-6 Luna in both model stages. The owner-local
`LUNA6_DEV70_C3_fe19c68_20260923T093524Z` artifact preserves all 70
histories, 131 model-stage calls, prompts, schema, model outputs, final replies,
cart provenance and a manifest. Sixty-six replies completed the final guard
without a quality judge; two multi-product cases failed for missing
authoritative labels and two expired cases rejected before the model. Those
figures are execution status, not a sales score. Four cart cases used synthetic
current-cart readbacks from frozen fixtures, not production carts. The frozen
negative-freeship case has no complete cart snapshot, so it remains unresolved
even though the current C3 producer can state non-free shipping for a known,
bound cart.

Q015 no longer repeats the shop price already stated in the dialogue; Q016
asks which aspect of the previous purchase felt uncomfortable. Q046 regressed:
the Strategist selected an unsupported alternative/comparison proposition and
dropped the verified out-of-stock fact in the same question. Q062 repeats
`Dạ` in the acknowledgement and ETA projection, and the frozen deadline cases
still lack a canonical deadline constraint for a precise conclusion. Q096's
fixture says checkout details are missing in dialogue but sends
`checkoutRequestedFields=[]` and permits only `NONE`, so its missing checkout
question is an input mismatch, not a model omission. Q100 remains an
acknowledgement without an effect receipt. Six independent full-core holdouts
in `LUNA6_FULL_C3_FE19C68_20260923` confirm the budget improvement and show
the same awkward measurement preamble and padded deadline wording. Both runs
were offline, with an evaluation-only provider identity adapter, no realtime
transport, Outbox or customer traffic; no judge ran.

The next source revision addresses the contract-wide compound-selection rule,
removes repeated opening politeness from code-owned factual projections, and
omits the generic preamble when the canonical action asks for a missing
measurement. This does not add
product alternatives, media transport, structured deadlines, multi-product
labels, or transaction effects.

### Exact-code follow-up at `e695677`

The revised code ran all 70 R2.9 DEV histories again with GPT-6 Luna medium
through the compiled C3 core. The owner-local
`LUNA6_DEV70_C3_e695677_20260923T095106Z` artifact contains 70/70 readable
histories and records, 131 model-stage calls, prompt/schema/output evidence,
cart provenance, comparison and `sales-voice-review.json`; its manifest binds
the run to code commit `e695677e02e4cbf7ade3982e5f74908d65b2aa6e`.
The execution outcome remained 66 guarded replies, two multi-product label
failures and two expected pre-model stale rejects. No judge or sales pass rate
was run. The six independent full-core holdouts at
`LUNA6_FULL_C3_E695677_20260923` also completed; they remain qualitative.
Neither evaluation drove realtime transport, Outbox or customer traffic.

The code-owned wording removed adjacent repeated `Dạ` in the 66 completed
DEV replies (9 on `fe19c68`, zero on `e695677`). Neutral confirmations and
thanks now receive appropriate bounded acknowledgements, and the purchase
request receives a specific intent acknowledgement without pretending an
order was placed. A measurement holdout asks directly for the missing waist
measure. Known budget values are not re-requested. The comparison holdout
states verified design attributes without claiming an unsupported superiority.

Sales resolution is still incomplete. Q046 now states the verified out-of-stock
fact, but the alternative request is silently left unanswered even though the
Strategist goal notes the gap. Q035's frozen fit context lacks the canonical
`MEASUREMENTS_REQUIRED` blocker and the model asks for a purchase size instead
of fit measurements. Q014 asks a decision question although its fixture expects
no next step; Q016's wording is less specific about the previous bad
experience. Q062 reports the 2–4 day ETA without directly resolving the
tomorrow deadline, because the frozen input has no structured deadline
constraint. Q024 lacks a complete current-cart binding; its old fixture flag
must not be read as a current producer gap. Q096's dialogue and canonical
checkout fields disagree. Q100 has no order effect receipt. These remain
behavioral or input-authority gaps against the spec, not compiler failures.

Verification on the same code commit: worker build and 245 focused worker
tests passed, including realtime C3 entrypoint, SalesCycle transition/cart
claims, checkout reachability, projection equality, current-cart validation
and the r31.3 replay seam. The protected-cart producer tests passed on the
`fe19c68` source slice; the producer is unchanged at `e695677`. Exact draft
PR HEAD and remote CI evidence are tracked in draft PR #374.

The first full CI dispatch at documentation HEAD `0c03e9e` found three stale
expectations in `track-c-c3-post-pr358-behavior.test.ts`: those tests still
offered `ASK_MEASUREMENTS` without a canonical `MEASUREMENTS_REQUIRED` blocker.
The current contract intentionally requires that blocker. The tests now
expect `NONE` without it and still verify that an actual blocker permits the
measurement question ahead of checkout. The focused file passed 11/11 after
the correction; the replacement exact-head CI result is linked from PR #374.
