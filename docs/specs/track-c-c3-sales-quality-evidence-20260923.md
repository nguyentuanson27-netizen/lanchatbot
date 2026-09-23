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
