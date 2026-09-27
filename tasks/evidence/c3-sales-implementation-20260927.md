# C3 sales implementation evidence — 27 September 2026

## Source and scope

The worktree started at merged PR375 commit
`7c1f10f2a27db2b6258581f21955d1bc62681821` on
`feat/c3-sales-rootcause-sol-20260927`. The exploratory Luna probes below ran
against different **uncommitted** candidate revisions on that base. Their
`sourceHead` field alone does not identify the candidate diff. The exact-source
reruns below use implementation commit `c2b22d3faa093d545d5a555bd741d0385de10b26`.
All runtime ports were in-memory fakes; no
customer message, live catalog/index write, deployment, or POS order occurred.

## Reproduced and changed

| Boundary | Baseline failure | Candidate behavior and proof |
| --- | --- | --- |
| Mixed buying decision and size question | `Lấy size M nhé, size S còn không?` became a canonical commitment but POS received `S`, the last size in the whole message. | A focused SalesCycle test first failed with POS query `S`. The cart selection now scopes the size to the exact purchase evidence clause; ambiguous two-size commitments ask which size before POS lookup. |
| Recipient/payment capture | `Số điện thoại` could become the recipient name. The folded `hoi` in Hội An suppressed an explicit COD choice. | Two failing checkout tests reproduced both; current candidate rejects a field label as name and keeps the explicit COD selection. This is a bounded format correction, not a general checkout intent producer. |
| C3 on cart opening | Baseline SalesCycle built a fixed cart/checkout message and skipped C3 on every effectful cart turn. | A naive C3 call omitted total and shipping, while one size correction fell back after the size guard rejected a customer-choice acknowledgement. The current path allows C3 only on a freshly ready `CART_OPEN`, retains the code-rendered cart amounts and rechecks the combined outbound payload. The size edit and preview paths remain under SalesCycle wording. |

The same-turn C3 input now carries exact `CART_OPEN` readiness, the bound
current cart and the actual missing checkout fields. Prior-turn `CART_READY`
readback may supply cart facts but cannot masquerade as same-turn effect
readiness. A SalesCycle regression covers both sources and the current cart
revision. The Responder does not own cart, price, payment, or order effects.

## Luna runtime probes

`gpt-6-luna`, medium reasoning, was used through the opt-in
`track-c-c3-luna-runtime-smoke.test.ts` entrypoint. It preserved every turn,
the executed model stages, state snapshots and fake accepted outbound
messages in each raw artifact. The test's provider adapter is test-only.

| Probe | Synthetic journeys | Observed result |
| --- | --- | --- |
| `LUNA_C3_SALES_SOL_20260927` | 2, 14 turns, 16 C3 calls | Both reached internal `PURCHASE_CONFIRMED`. Cart opening and size edit did not call C3. The price objection response only acknowledged concern. |
| `LUNA_C3_CART_ADAPTIVE_PROBE_20260927` | 1, 7 turns | Simply enabling C3 on cart turns caused two guard fallbacks. Its input offered no missing checkout fields or cart evidence. |
| `LUNA_C3_CART_BOUND_PROBE_20260927` | 1, 7 turns | C3 handled cart opening and requested missing checkout fields, but its reply omitted the verified 829.000đ total. The size edit still fell back. |
| `LUNA_C3_CART_COMPOSED_PROBE_20260927` | 1, 7 turns | C3 handled cart opening with the code-rendered `CB182 size M ×1`, 799.000đ item price, 30.000đ shipping and 829.000đ total followed by one checkout request. The size edit still fell back; the journey reached internal `PURCHASE_CONFIRMED`, not a POS receipt. |

The final probe's raw `runtime-smoke-artifacts.json` SHA-256 is
`8FE519F01CC4AAF338BED9AA9CDCEEB430ACCBE92BF254AAC5D240CCE5791E91`.
It resides in the owner-local `LUNA_C3_CART_COMPOSED_PROBE_20260927`
directory alongside prompts, schemas and raw stage outputs. The baseline
two-journey archive SHA-256 is
`865E6D0359A3DB0F01687248C498A4222FA2D7F84708A93AB73F68C6EEB5EE51`.

## Exact-source Luna reruns

The frozen DEV70 contract simulation ran on `c2b22d3` with GPT-6 Luna,
medium reasoning, and preserved all input turns, prompts, both model-stage
outputs, selected evidence, guarded results and final replies. The owner-local
archive is `LUNA6_DEV70_C3_c2b22d3_20260927T104534Z/case-records.json`
(SHA-256 `BF64FCBBA717834C57A307FFA4206929FF2FBD813941732DAC9B688628296168`).
The [readable full history](c3-luna-dev70-c2b22d3-full-history.md) is committed
with this evidence. The result is 57 `COMPLETED_NOT_JUDGED`, 11 `FAILED`, and
2 expected pre-model stale rejects. These are execution counts, not a sales
quality score. Of the 57 completed cases, the Strategist chose `KEEP_OPEN` in
46, `ASK` in 3, and a canonical action in 8. `KEEP_OPEN` can be right for a
direct factual answer, but the four price-objection cases Q013–Q016 all end
without a useful next move. Q035/Q043/Q063 include cautious model wording
rejected by the final guard; Q086 includes an unsupported size choice that
should remain blocked. Q081's comparison failed because ordering two verified
prices lacks a separately bound comparison claim. Q096's acknowledgement of
a size change was rejected as an unverified size recommendation. The 11
failures require per-case guard/input review before changing the verifier.

The 11 rejected DEV cases split by the observed owning boundary, based on
the raw responder output and frozen expected behavior:

| Cases | Observed boundary | Current judgment |
| --- | --- | --- |
| Q017 | Responder draft schema/validation | Conditional 690k offer was expressed safely but no final reply was realized; inspect draft rule. |
| Q026 | Current-cart promotion with two products | Replayed `UNAUTHORIZED_PROMOTION` despite a selected 100.000đ cart adjustment. Check that the selected cart claim, current revision and authorization are bound through the final guard. |
| Q034, Q035, Q036 | Fit wording/guard | All replay as `SIZE_RECOMMENDATION_UNDECLARED`. Q034 includes a positive alternative; Q035 is uncertainty about XL; Q036 mixes verified M advice with an unverified waist-fit limitation. Each needs a two-sided guard test. |
| Q043 | Variant stock mapping/guard | Cautious exact-variant stock uncertainty replayed as `SIZE_RECOMMENDATION_UNDECLARED`; no authoritative color/size stock mapping was provided. Do not convert missing mapping to out of stock. |
| Q063 | ETA deadline wording/guard | Replayed `UNAUTHORIZED_ETA`. “Có thể kịp” needs a bounded temporal rule; a 2–4 day range must not become a delivery promise. |
| Q081 | Derived comparison | Two price claims do not authorize an unbound “rẻ hơn” statement; code must derive and bind the ordering. |
| Q086 | Split-size question and fit wording | The customer explicitly requested top S and bottom M. The model did not choose those sizes. The responder's "Vì thân trên chị nhỏ hơn phần dưới" implies that these choices suit her body without verified fit evidence; the separate split-size policy claim is available. The replayed `SIZE_RECOMMENDATION_UNDECLARED` reason does not isolate which clause triggered it. |
| Q096 | Variant edit/effect receipt | Replayed `SIZE_RECOMMENDATION_UNDECLARED` for acknowledging a conversational change; no persisted mutation was proven in this fixture. |
| Q100 | Checkout completeness and final guard | The raw reply says it cannot finalize the order or process payment; it does not claim an order was created. It does assert that contact and address details are sufficient, though the visible history only contains the customer's statement that they were sent above. Replayed guard reason: `SIZE_RECOMMENDATION_UNDECLARED`, apparently triggered by the mention of the customer's previously chosen size M; the unverified completeness assertion is a separate concern. |

An offline replay of the archived raw strategist/responder outputs against the
unchanged C3 compiler and guard recovered the reason suffix that the DEV70
recorder had truncated. It made no provider call or state mutation. The precise
reasons were: Q026 `UNAUTHORIZED_PROMOTION`; Q034, Q035, Q036, Q043, Q086,
Q096 and Q100 `SIZE_RECOMMENDATION_UNDECLARED`; Q063 `UNAUTHORIZED_ETA`.
Q017 failed draft validation and Q081 failed unbound factual text before that
guard. These are **detector reasons**, not proof that the whole rejected sentence
was unsafe. Q100 is a size-detector collision with a reported prior selection;
Q043 is a size-detector collision with cautious stock uncertainty. Q086 still
contains an unsupported body-to-fit implication even though the size labels
were supplied by the customer. The replay does not identify which individual
clause triggered a detector when a segment contains several clauses.

This table is a triage, not an assertion that every rejected answer should be
allowed. Unsupported fit inference in Q086 and any actual order-completion claim
must remain blocked; Q100's raw reply contains no such completion claim. The 57 completed cases also need rubric review: the first-contact
price form was preserved in Q001–Q003, but Q013–Q016 and the runtime price
objection demonstrate that execution success alone does not create sales
progression.

The stateful RealtimeRunner rerun on the same commit used `gpt-6-luna` for
`cart_size_checkout` and `objection_fact_checkout`. Both finished at internal
`PURCHASE_CONFIRMED` with no external order. The cart-opening turn selected C3
and retained the verified 799.000đ item price, 30.000đ shipping and 829.000đ
total. The size edit and preview still used SalesCycle wording. The price
objection yielded only “chị cứ thong thả cân nhắc”; after checkout details,
the reply awkwardly asked for “hình thức thanh toán COD”. Thus the runtime
effect path works in these two synthetic journeys, but sales progression and
natural wording remain deficient. The owner-local raw archive is
`LUNA_C3_C2B22D3_RUNTIME_20260927/runtime-smoke-artifacts.json` (SHA-256
`3A25E4C8392D2886D782F1A88CA89BE0AB2DCAAC2288A5F69DE189296EED2892`).

Verification on the implementation commit: worker 1,792 tests passed and one
opt-in test skipped in the default run; business-tools 378 tests passed;
worker typecheck passed; the opt-in two-journey Luna RealtimeRunner smoke
passed. The DEV70 harness is a contract simulation and does not exercise all
runtime entrypoint decisions.

## Outstanding acceptance

- The typed customer-input producer still runs after some routing and product
  decisions. Handoff/post-sale, same-turn preference, and variant edit cannot
  yet be attributed to one validated early input.
- The size guard rejects a harmless customer-choice acknowledgement on an
  actual cart edit as `SIZE_RECOMMENDATION_UNDECLARED`. It correctly continues
  to reject unsupported fit claims. A receipt-bound effect statement needs a
  separate design and two-sided verification before C3 owns edit wording.
- C3 remains absent from order preview and internal confirmation. It lacks a
  typed, publishable effect result for free prose on those turns.
- The catalog producer/readback, approved selling points, two-sided free-prose
  guard review, search/comparison, fallback and long-history work in P00–P10
  are not closed by these probes. The prior source audit found typed attributes
  in 0/107 indexed products despite source registry fields; the new candidate
  has not published or read back a local isolated index. A completed Luna
  smoke test is not a sales quality score.
- Source inspection confirms `p23c-profiles.ts` builds typed attributes from
  explicit registry fields, `p23c-jobs.ts` copies them into `product_attributes`,
  and `qdrant.ts` validates that field on read. This code path cannot supply
  approved value propositions to current indexed products until an authorized
  publish/readback occurs. Registry `AUTO_OK` and `NEED_REVIEW` are extraction
  states, not approval to claim a benefit; this PR does not infer selling
  points from material names or publish to the live index.
- No conversion evidence, blind holdout, real customer smoke, or POS receipt
  was observed. The current candidate is **not ready for customer smoke**.

## Continuation on executable source c782e90 (2026-09-27)

Executable source and the C3 spec were committed at
`c782e905e47277ee8f2ae939e47023a3fd8c9663` after the following local checks. Later evidence-only edits do not
change that source. The branch still inherits PR371 and PR375; PR376 stays
draft against `codex/c3-runtime-canonical-integration`.

- The opt-in RealtimeRunner harness now calls GPT-6 Luna for the initial
  `RealtimeModelPort.generate()` and `groundWithFacts()` stages, using the
  production prompt/schema adapters. It records these separately from C3
  Strategist/Responder calls, plus full prompt/output files, state, commits,
  guard fallback and sent-by-fake-transport replies. It does not use the old
  regex `synthetic-baseline` proposal on called producer turns. The provider
  identity adapter is test-only; the business, history, POS and send ports
  remain in-memory fakes. The initial direct product-price turn still bypasses
  this producer by existing runtime design, so this is not an early producer
  for every routing decision.
- The producer prompt/schema now bounds intent and stage labels and describes
  first-cart purchase, quantity edit, variant choice and preview confirmation
  separately. `variantIntent` is optional in persisted contract data but
  required in new Vertex generations. A validated `CHANGE` narrows an edit
  already authorized by the existing deterministic edit phrase boundary;
  `QUESTION`/`COMMENT` suppress a false edit. The new type does not by itself
  authorize a mutation or solve all alternative phrasings. A first-cart
  `SET_QUANTITY` model label is rescoped to `OPEN_CART` only with independent
  deterministic commitment and no open cart.
- A C3 Responder may omit a trailing factual realization: the compiler fills
  it from the selected, verified sentence. Any model-supplied sentence still
  has to match its positional fact. This resolved the observed current-cart
  shipping fallback in the local replay, without relaxing factual authority.
- An isolated source-path test runs a registry row through profile producer,
  approved Qdrant job payload, JSON readback, stable product adapter,
  ProductFacts V2 and C3 selectable evidence. It proves transport and
  authority preservation for one synthetic SQ149 fixture, not current live
  coverage or an actual Qdrant write/read. `UNKNOWN` wrinkle resistance does
  not become a wrinkle or value claim. The historical 0/107 indexed figure
  remains a 25/09 observation, not a new measurement.

The raw local probes before the final commit remain separate from final-source
acceptance. `LUNA_C3_FULL_INTENT_CART_R4_20260927/runtime-smoke-artifacts.json`
(SHA-256 `4215EEA7A4FEB11C0FE0226D8686C6BFEA61D7B5208B1FAF975C9908F18C4AB9`)
reached internal `PURCHASE_CONFIRMED`, but 3 of 6 producer calls failed schema
validation and the shipping turn fell back despite a verified 30.000đ fee.
`LUNA_C3_FULL_INTENT_CART_R5_20260927/runtime-smoke-artifacts.json`
(SHA-256 `AD75379665A60B3BDF7A765BFE053D216ED02641F32EACBFF27C7A252FA120A0`)
showed valid producer calls for purchase, variant edit and shipping inquiry;
the shipping answer used the verified 30.000đ fee with C3 selected. Its later
Strategist and producer calls failed because the Codex CLI returned a usage
limit, so the strengthened harness correctly failed. Both archives label
their pre-commit HEAD as `bf80d205` and include source-file fingerprints for
their actual uncommitted test snapshots. Neither is evidence on `c782e90`.
The earlier two-turn budget probe also had a weak `KEEP_OPEN` reply that did
not resolve the price objection.

On source `c782e90`: worker 1,795 tests passed and one opt-in test skipped;
business tools 379 tests passed; contracts focused tests 10 passed; worker
typecheck and `git diff --check` passed. No DEV70 Luna rerun, rubric judge,
full-intent run on this exact source, DRY_RUN server candidate check, live
catalog/index readback, POS order or customer send has been completed. The
provider usage limit is a current obstacle for Luna evaluation only; it does
not close the independent implementation items below. There is no new quality
score. `COMPLETED_NOT_JUDGED` remains unscored, and reaching an internal
purchase stage in a scripted journey is not conversion evidence.

Current acceptance judgment: the tested cart/variant kernel boundaries are
correct for their covered cases; sales dialogue quality has not passed the
frozen rubric; this candidate is **not ready for customer smoke**. The early
semantic producer/consumer convergence, broader variant phrasing authority,
handoff/post-sale and preference timing, search/comparison, resilient
fallback, long-history journeys, two-sided free-prose guard review and exact
source Luna DEV70 remain open. No live write, deployment or merge occurred.

### Later executable amendment: c93635c

Source/spec commit `c93635c41f44f6154e718dd385edb4ee7cd005e6` adds one
bounded DRY_RUN observation at the existing guarded C3 candidate boundary:
reply SHA-256, claim types, READY result and source revisions are logged; no
reply text or customer identifiers are logged. The RealtimeRunner test runs
that path with `mode=DRY_RUN`, `sendEnabled=false`, a fake C3 transport and
asserts the candidate diagnostic while the committed outbound message list
stays empty. The existing human-owner test asserts later turns make no C3
calls and do not mutate commerce state. The server already connects C3 only
under its local DRY_RUN test switch; this test exercises its runner path, not
an entire booted server with real Vertex credentials.

For this amendment, all 74 RealtimeRunner tests and worker TypeScript
checking passed. The earlier 1,795-test worker and 379-test business-tools
runs belong to `c782e90`; only the runner diagnostic and its test changed
afterward. No Luna or rubric result exists on `c93635c`.
