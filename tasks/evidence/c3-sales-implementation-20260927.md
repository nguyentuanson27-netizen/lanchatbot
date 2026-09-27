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
- No conversion evidence, blind holdout, real customer smoke, or POS receipt
  was observed. The current candidate is **not ready for customer smoke**.
