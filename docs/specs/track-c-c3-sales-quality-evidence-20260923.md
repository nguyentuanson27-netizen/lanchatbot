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
sales-quality outcomes above. The approved selling-point field and its review
semantics remain unidentified. The product registry already supplies typed
attribute projections, but a generic description override is not proof that
each promotional benefit in its prose was approved.

Remaining acceptance work: identify the approved selling-point source; bind
its claims to product identity, source version and exact customer-facing
wording; improve decision-specific conversational realization without widening
factual/effect authority; then run judged out-of-sample and DEV70 regression
through the runtime entrypoint. Do not activate traffic on the basis of this
report.
