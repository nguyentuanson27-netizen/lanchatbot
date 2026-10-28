# Owner-approved dialogue examples — 2026-10-21

Owner requested implementation after approving the five dialogues in chat. Use those replies verbatim as fictional examples of sales advice; they do not contain the benchmark's product names, prices or expected answers. Add explicit premises for the image-capable fictional shop and the successful cart receipt so examples cannot grant actual capabilities/effects. No new policy/product source is created.

## Change and hypothesis

Control: current full `owner.vi.txt`, not the unsuccessful capability-deletion candidate. Candidate: `owner-examples.vi.txt`. Replace repetitive advice and voice instructions with shorter guidance and five approved dialogues. Retain the entire source/tool, inference boundary, size/state/transactions and policy block byte-for-byte after normalizing file line endings; keep the job/role paragraph unchanged. No verifier, model/config, runtime/tool declarations, source descriptions or corpus change. Candidate is explicitly selected through the existing frozen prompt registration; baseline/default and B2/B3 are unchanged.

Hypothesis: concrete owner-approved conversation examples help the same owner choose a relevant sales reason and express it naturally in other situations. This combines examples with reducing repetitive instructions; a better result cannot isolate which component caused improvement. Prompt size is measured, not optimized as a goal. Do not introduce a planning object, second owner, parser/router, phrase filter, repair loop or extra generation.

## Frozen measurement

Use existing native B1 runner with AUTO function calls and native tool history. Owner Vertex global Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol high via existing Codex login route. Same generation/config/source identities as previous measurement. Per registered turn: at most three owner and one verifier generation, one upstream request each, retry 0. Every hard-precheck survivor goes through verifier and final deterministic gate/readback. Capture-only, no live send or upstream mutation.

Six existing cases, one sample per arm: slots 7,15,23,17 (known advice findings), 3 (material/price/stock with POS unavailable), 12 (simple price question). Alternating arm order in REGISTRATION.json. Twelve total outcomes, at most48 owner/verifier requests. All errors, missing outcomes, source drift and fallbacks remain in denominator; no replacement attempts. Embedding/source calls reported separately. Finish the registered set despite quality failures; infrastructure inability is reported without simulation.

The five example conversations are not replayed as test cases. These are known development cases, mostly one product, not a new holdout or proof of broad generalization. The test does not cover competing-shop price objections, image understanding, stateful correction, B2/B3, delivery or real conversion. Fictional example prices/products must not appear as actual shop facts. Record any such leakage as an error, not successful style imitation.

Freeze prompt/config/corpus, commit clean source before dispatch, capture runtime HEAD without embedding it back into frozen inputs. Reuse existing provider/source preflight and readbacks. No provider API changes. Source changes after seal invalidate the old run identity. Paired source evidence must match for attribution; different tool choices alone do not prove source drift.

## Review fixed before provider

Read the whole history and actual terminal reply before rejected drafts or verifier reasons, then lock primary review. Agent review, not human owner adjudication; arm identity is known, not blind scoring. Use existing labels USABLE_WITH_POLISH, NEEDS_EDIT and FALLBACK_QUALITY_FAIL.

- Does the shop help the customer's current buying decision with a reason relevant to that concern? An appropriate whole-set upsell is valid; do not require the cheaper choice or a single predetermined outfit.
- Is the reply natural and sendable without substantive rewriting? Read the paragraph in context; do not count keywords, adjectives, sentences, apologies or calls to action.
- Does it preserve all explicitly requested answers, use corrections/history, and propose only currently usable next steps? Brief replies are not automatically better.
- Does it keep product/price/policy/effect meaning within verified sources and the owner's accepted qualitative sales inference? Verifier PASS is not a quality score.

Report each pair and distinguish partial improvements from a usable whole turn. A useful signal requires at least two of the four advice pairs to improve concretely, no substantive regression in other advice/controls, no incorrect send-eligible facts/effects or example contamination. Fallback counts as the actual customer outcome; a justified verifier block still hurts usefulness. If a pair is unclear, say so. One sample per arm cannot establish stability or a model capability ceiling.

Stop after12 and report; no automatic prompt revisions, larger model run, default promotion or verifier changes. Even a positive signal requires later stateful/generalization evidence before broad adoption. A remains OWNER_BYPASS, no B/live GO.

## Checks and complexity

Reuse existing prompt-registration, adapter and protocol tests; run worker build and diff/secret checks. Self-review both section preservation and exact approved replies. No new unit test to count natural-language features. No new runtime code: one candidate prompt, registrations and a small copied evaluation launcher reusing existing native runner; evidence/report only. Do not claim unrun lint/typecheck or full-suite checks.
