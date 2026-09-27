# C3 sales implementation evidence — 27 September 2026

## Source and scope

The worktree started at merged PR375 commit
`7c1f10f2a27db2b6258581f21955d1bc62681821` on
`feat/c3-sales-rootcause-sol-20260927`. The Luna probes below ran against
different **uncommitted** candidate revisions on that base. Their `sourceHead`
field alone does not identify the candidate diff. A clean-HEAD rerun is
required before a final quality claim. All ports were in-memory fakes; no
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
  are not closed by these probes. A completed Luna smoke test is not a sales
  quality score. Frozen DEV70 has not been rerun on this candidate.
- No conversion evidence, blind holdout, real customer smoke, or POS receipt
  was observed. The current candidate is **not ready for customer smoke**.
