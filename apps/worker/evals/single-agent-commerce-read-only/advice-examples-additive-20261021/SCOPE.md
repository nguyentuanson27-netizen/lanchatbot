# Add examples without deleting instructions — 2026-10-21

Owner requested implementation after approving the five dialogues in chat. Use those replies verbatim as fictional examples of sales advice; they do not contain the benchmark's product names, prices or expected answers. Add explicit premises for the image-capable fictional shop and the successful cart receipt so examples cannot grant actual capabilities/effects. No new policy/product source is created.

## Change and hypothesis

Control is the exact current `owner.vi.txt`. Candidate `owner-examples-additive.vi.txt` is the byte-for-byte baseline plus a separator and the exact illustrative section from the preceding candidate. No instruction is deleted, shortened, rewritten or moved. Same five approved replies and capability/receipt premises, no new examples or case-specific edits. Shared default and B2/B3 remain unchanged. Models, verifier, source data, corpus and runner are identical.

This isolates adding the example block on top of the existing instructions. The previous combined treatment removed advice/voice rules and therefore did not establish whether examples themselves help. The new comparison does not independently separate example content from extra prompt length. No new model role, planning object, parser/router, repair loop or extra generation.

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

Reuse existing prompt-registration, adapter and protocol tests; run worker build and diff/secret checks. Self-review exact byte preservation of the entire baseline prefix and the entire previously approved illustrative suffix. No new unit test to count natural-language features. No new runtime code: one candidate prompt, registrations and a small copied evaluation launcher reusing existing native runner; evidence/report only. Do not claim unrun lint/typecheck or full-suite checks.

## Review clarification before this run

Retain the previously frozen whole-turn questions and decision rule, but report the nature of each issue explicitly: advice/choice logic, expression only, unavailable capability, source limitation, or protected safety. Aesthetic reasoning from soft/draping form to a lighter visual impression is allowed; do not fail a reply merely for lacking a direct decoration fact. A reply may be usable with voice polish. Reusing the example's valid extra-price argument is successful transfer, not an error because it resembles the example. A higher-value upsell and a justified cheaper option are both acceptable. No forced product choice. Partial-source cases prove handling missing evidence, not sales completion. A size invitation may be natural sales dialogue while still unusable in B1 without recommend_size; do not call it unnatural or a false completed effect solely for that reason.

Keep historical primary labels intact. Compare arms within this run under these clarified criteria; do not report changed historical scores as model improvement. One sample per arm still cannot show stable progress. These clarifications were recorded before any new result.
