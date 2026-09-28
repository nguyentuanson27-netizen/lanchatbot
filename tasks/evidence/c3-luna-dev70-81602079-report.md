# C3 sales continuation — Luna DEV70 and runtime review (2026-09-28)

## Revision and execution boundary

- Executable source: `8160207913bd3fe63827a894247eb86295783822`. Later `1df6bc88` adds only a runtime comparison handoff test; executable code is unchanged.
- Candidate and producer: GPT-6 Luna, medium reasoning, through the Codex CLI adapter. C3 uses a test-only Gemini provider identity because the production transport contract requires that identity. No production Gemini call is claimed.
- Frozen DEV70 rubric SHA-256: `3e07e0cd235b38ab5f90cc8692e6a2a050eff65a894b430117ab1b46c7e5efb2`. The fixture and rubric were not edited.
- Owner-local candidate adapter SHA-256: `29A3FC56C57900A988320C53F5DA6F31829590194589F8AD8139758F06BBBC8A`; diagnostic stage-judge adapter SHA-256: `624D0FD92FEAF67963B0484F2760EDC3CB9704A21AF13F55059FD6FD77313547`. Both invoke Codex CLI with `gpt-6-luna` and `model_reasoning_effort=medium`; the judge reads the frozen rubric and full Strategist selectable evidence. These scripts are local diagnostic adapters, not production code.
- [Full DEV70 conversation history](c3-luna-dev70-81602079-full-history.md) includes dialogue, selected evidence, stage prompts, raw model output, task, guard result and final reply for all 70 cases. SHA-256: `831653678CF5A38F6E5409906467D4D18345F660E1A67BF0327750D517CA58D5`.

## Execution result

Of 70 DEV cases, 62 completed with `COMPLETED_NOT_JUDGED`, six failed in the C3 seam or guard, and two rejected stale evidence as expected (Q027, Q066). Completion is not a quality pass. The six failures are:

| Case | Observed cause | Current disposition |
| --- | --- | --- |
| Q024 | Luna said freeship eligibility could not be confirmed; final guard blocked the uncertainty sentence. | Guard false-positive candidate; no final answer from offline candidate. |
| Q035 | Luna correctly refused to infer XL fit from usual XXL, but guard blocked that sentence. The materialized canonical context permitted only `NONE`, so `ASK_MEASUREMENTS` required by the fixture was unavailable. | Input/contract mismatch plus guard; do not blame a model for not using an unavailable action. |
| Q043 | Luna declined to assert stock for black size M without matching evidence; guard blocked the explicit uncertainty. | Guard false-positive candidate. |
| Q067 | Luna distinguished dispatch date from delivery ETA but repeated the 2–4 day ETA in free prose without selecting that claim; guard blocked it. | Model output and guard interaction; retain the dispatch question on fallback. |
| Q096 | Luna acknowledged the customer's correction to size L; guard blocked the acknowledgement. No cart effect was established by this offline case. | Guard/contract conflict; runtime cart mutation must still require kernel authority. |
| Q100 | Raw output explicitly said there was **no** confirmation that an order had been placed. Effect-claim guard nevertheless rejected it. | Negated-effect guard false positive; this is not a fabricated POS-order claim. |

Q086's customer explicitly asked for top S and bottom M; Luna did not originate those sizes. The remaining question is whether the supplied split-size policy and offer configuration justify the answer. Q081 now states both prices and the code-derived cheaper conclusion from two fresh product-level price claims. The current protected price claim lacks explicit offer kind, so cross-offer comparison remains outside this path.

## Stateful synthetic journeys

- [Budget/no-option stop history](c3-luna-budget-stop-93c7def6-full-history.md), executable source `93c7def6`: Luna producer kept the 700k conditional request as `CONSIDERING`; search excluded the current 799k product; no cart opened; the customer stopped. SHA-256: `E3C8D7C857D3BD98F337BEC44DBCEB90B94CC5A6484B8D8EA1DF14A24FA4C9E8`.
- [Objection/fact/checkout history](c3-luna-objection-checkout-bc2cb7d5-full-history.md), executable source `bc2cb7d5`: the customer advanced to buying only after cotton material was answered. C3 was chosen at first cart quote and subsequent eligible turns with no C3 fallback; code retained 799k price, 30k shipping and 829k total. The final `PURCHASE_CONFIRMED` is internal synthetic state, with no POS receipt or conversion measurement. SHA-256: `A4E37DA67CA4FC2DBE462470B73863D27BB6DCE3D40BC3C6CE635A5E3EFC5128`.

These histories preserve prompts, raw model responses, state before/after, effects and customer-visible replies. The later price-comparison implementation does not change either one-product journey; their exact source revisions remain listed above.

## Quality and residual

The [per-case diagnostic score table](c3-luna-dev70-81602079-diagnostic-scores.md)
(SHA-256 `23EC43BC7A937DC3C8BDFC6B4E5D1AAAC225CAF63892EE986164A041641CC9EB`)
records every execution status and the 62 judged cases. GPT-6 Luna medium
returned **24 PASS, 9 PASS_WITH_NOTE and 29 FAIL** on the frozen rubric;
the other 8 cases were not scored. This adapter passes the full eligible
evidence and the frozen rubric, but it is **not** the pinned Gemini stage
judge. The 29 failures include 31 stage-level `FACT_GROUNDING` floor misses,
8 `QUESTION_RESOLUTION` misses and 5 `NEXT_MOVE_QUALITY` misses (dimensions
can overlap). Q081's derived price answer passed. Diagnostic scoring is not
production conversion evidence or a customer-smoke gate.

Manual review of the accepted replies confirms material quality residuals:
Q052 cites fabric material without resolving wrinkle resistance and brings
back an unrelated earlier concern; Q061–Q064 often repeat the same ETA caveat;
Q084–Q086 select or state extra offer prices when the question asks for a
specific component or split-size policy; Q003 asks the customer to reconfirm
black after stating it is available. Price objections Q013–Q016 are mostly
acknowledgements because no relevant value or alternative evidence is
available; a correct refusal to invent benefits is not a successful sales
consultation. Q015's comparison remains customer-attributed and received a
`FACT_GROUNDING` floor miss, so it needs a source-bound review before smoke.

Three judge hard failures (Q074–Q076) concern policy/payment wording whose
selected simulation evidence contains the policy statements; the candidate
also adds repetitive prose. They require human/source review rather than
automatic acceptance of either the judge label or the candidate wording.
Saved candidate/judge artifacts are PII-redacted: Q092's synthetic checkout
field becomes `[NAME]` in the diagnostic reply, which can distort its score.
The actual runtime checkout history is separate and retains the guarded
canonical field request. No blind holdout quality claim is made.

The business path is safer for conditional buying and bound comparisons, but sales quality is not yet established. The remaining work includes guard treatment of uncertainty and negated effects, relevant answers to price concerns, executable budget/product alternatives with verified price and stock, live catalog coverage/readback, and broader history and checkout recovery. No deploy, merge, customer send, live catalog/index write or real POS order occurred.
