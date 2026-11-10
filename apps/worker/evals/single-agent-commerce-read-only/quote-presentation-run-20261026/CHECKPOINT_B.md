# Quote-presentation diagnostic — STOP, no positive signal

**Completed:17 fresh controls +6 paired final-reply slots; B NOT GO.** This is a captured-world final-reply diagnostic, not full B1/B2/B3, native tool choice, persisted handoff, live freshness or actual delivery qualification. No customer messages were sent.

Implementation base: `ce734c405fb6d7ddac0bf196eaa5a530c476f950`. Exact clean run source: `beac5ec91c76249994337f4beaabbc73bc52455f`. Historical input source: `468d85ea6577c428cf2f6f155c9774926537364b`. Source/worktree stayed unchanged until the registered campaign finished. [Approved plan](../../../../../docs/specs/c3-phase-b-quote-presentation-diagnostic-plan-20261026.md), [implementation savepoint](IMPLEMENTATION.md), [frozen inputs](frozen-inputs.json), [run identity/config](REGISTRATION.json), [actual commands](COMMANDS.json).

## Result and decision

Same reviewer approved the narrowed plan and exact executable before generation. Blind assessment was written and its SHA256 frozen before opening mapping: `fdca307141c711af2b4959fd8acb314d8fa65a7a31a8d3e47f13fffb82fea165`. [Blind whole-turn review](BLIND_REVIEW_RESULT.md), [six exact terminal replies](CONVERSATIONS_XY.md), [revealed mapping](UNMASKED_MAPPING.json).

A retained the real captured openingQuote. B removed only its registered read_product response.data.openingQuote. No prompt, runtime, facts, canonical verifier context or model was changed. Random preregistered X/Y shuffle happened to yield X=A/Y=B in all three pairs; it was not redrawn.

| Case | Blind result | Interpretation after unmasking |
| --- | --- | --- |
| b1-buying-concern-v2 | NEITHER | A acknowledges preference but returns the choice through two conditional paths; unfinished “(mã áo)” and an assumed wardrobe item weaken usefulness. B confidently recommends the set but stacks adjectives and dismisses the concern instead of giving convincing advice. Neither resolves both need and usefulness well. |
| b1-price | TIE | Both retain set/components,799k, materials/form and S/M/L/XL. Minor voice differences are not an improvement. |
| b1-price-v3 | TIE | Both retain the required complete-set quote; one versus two sentences does not establish a useful difference. |

All6 drafts survived hard precheck, received exactly one mandatory verifier, and reached SEND_ELIGIBLE **in their captured historical worlds**. No fallback/handoff/no-send in these6 outcomes. This is not six sales-quality PASSes. The concern pair remains weak despite verifier PASS; sales quality is outside verifier's protected-semantics role.

**STOP this hypothesis. Keep openingQuote runtime unchanged.** No positive signal, no runtime promotion, no automatic full51, prompt rewrite, vision/source cleanup or second run. Old full51 findings and B NOT GO remain. One concern N1 cannot establish a general cause or a stable improvement.

Final evidence review found one reporting error (probe eligible, not blocked) and requested clearer thinking-token attribution; both corrected. The same reviewer's confirmation turn then failed because the workspace was out of credits. [Full review trail](INDEPENDENT_REVIEW.md). Executable and blind outcome reviews completed; **corrected-report independent sign-off remains uncompleted**, not APPROVE. No model substitution or further generation.

## Findings and limits

1. The proposed common cause was too broad: actual preceding requests show two of three concern cases did not receive openingQuote at all, yet were long. Those cases were excluded from provider treatment, not turned into apparent wins through variance.
2. Removing the field did not improve the exposed concern in this sample. The remaining problem is the sales decision itself: one response explains and hands the decision back; the other reassures with overlapping praise without addressing the customer's preference. This observation does not isolate prompt layout, model priors or source presentation as the unique cause.
3. Both quote controls kept source information after removal, but N1 is insufficient to remove the runtime form or qualify repeat-price/photos/ads/stateful cases. Their existing invariants remain.
4. The semantic verifier allowed these subjective style claims consistently with its scope. Expanding it into a sales-quality judge would change its role and would not provide the missing advice. No verifier change is justified by this diagnostic.
5. Further advice work needs a separately registered capability experiment that can distinguish a better customer decision from more facts, more adjectives or shorter text. Do not append the same general style rules, add case-specific answers, relabel the current result, or run the full population in search of a favorable score. No such experiment is authorized by this report.

## Operational evidence

[Operational totals and raw hashes](OPERATIONAL.json), [17 controls](CONTROLS.json). Raw evidence retained outside source: `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-presentation-model-20261026`.

- Complete denominator:23 outcomes =17 controls (8safe/8unsafe/1probe) +6 diagnostic slots (3cases×2arms×N1). Max29 and actual29 generation requests:17 control verifiers +6owners +6diagnostic verifiers. Max1 request per generation; retry0. No provider errors/timeouts; no omitted attempts. All8unsafe controls blocked and8safe controls eligible; probe retained and eligible (no expected label). This is scoped controls evidence, not a new full A2 run. Independent evidence review corrected the earlier mistaken description of the probe as blocked; raw outcome was never changed.
- Actual owner: Vertex `gemini-3.5-flash-lite`, version same, HIGH/global; verifier: Codex-login `gpt-6.1-sol`, version same, high. Exact config in REGISTRATION: owner8192max output/text/plain/candidateCount1/thinkingHIGH; temperature/topP omitted; verifier bounded relay/toolsnone/retry0/90s. Models/prompts identical across arms.
- Owner prompt SHA256 `71292eea99022f78c3ba5264eb4de6c8394dd2f345eb80bacb10a933c4e8e8db`; verifier `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. Manifest bytes `cf1db09a6390e8ddd06e7f61339e2a99e9a0c78d2373e022a18ad4225ec5eb92`; frozen input payload `7c5d962a6fccc9cbc82cfe5e17a35d629a3df50c10bf4f8093e68eea97557458`. Schema/source config/corpus hashes in REGISTRATION. Five unexposed records passed offline no-change proof; zero provider calls for them.
- Golden constructed A equals normalized original wire; A/B diff only the registered presentation node per exposed case.6/6 actual owner request hashes match.23/23 actual forwarded verifier bodies match frozen/request log bodies.29captured bodies scanned:0 evaluator-only or secret-key leaks. Local mock captures also test injected evaluator wrappers do not reach actual adapter HTTP bodies. This scan is scoped to captured wires, not a universal PII proof.
- Usage:179,216 input tokens /11,643 output tokens.9,693 combined reasoning/thinking tokens already included in output accounting:8,331 Gemini owner thinking +1,362 verifier reasoning (1,128 controls +234 diagnostic). Provider exposed no cost, recorded null. Verifier telemetry latency across23 samples p50/p95:10.923s/15.322s. Added verification time in6 paired owner outcomes, including local wrapper overhead:8.444s/11.015s. Different sample populations explain these statistics; no live customer latency claim.
- Diagnostic terminal rate:6/6 historical SEND_ELIGIBLE;0/6 fallback/handoff/no-send. Code static fallback remains manifest-owned and unused; frozen fallback ID/text/hash remain in manifest/run source. Historical snapshot, draft binding, freshness, recipient/permission/privacy gates all retained; no receipt/state/write/send effects in this probe.

## Checks actually run

- RED: missing module, then concrete trace/signal failures before minimum fixes; empty preflight draft rejected as MALFORMED, corrected to non-protected probe without weakening gate.
- Focused diagnostic6PASS. Earlier combined diagnostic+Gemini+existing advice81PASS, then final focused6PASS.
- `node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs" "apps/worker/evals/single-agent-semantic-verifier/*.test.mjs"`:638PASS,2SKIP,0FAIL (640registered tests). No real provider generations in these local tests.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts`:75PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21PASS.
- `pnpm --filter @lana/worker build`, `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit`, `pnpm --filter @lana/worker lint`:each exit0. Dependencies were built by worker prebuild; no shared package source changed.
- Python driver AST parse and git diff check PASS. Exact-head reviewer independently6PASS and matched all8 frozen captures to original artifacts/logs/wires with0mismatches.
- `python apps/worker/evals/single-agent-commerce-read-only/quote-presentation-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-presentation-model-20261026"`:exit0; ordered offline preflight→fresh source capture→controls preflight→17controls→diagnostic preflight→6slots. Exact child commands/results in COMMANDS.json. No generation retry, overwrite, substitute model or excluded error.

Structural delta: evaluation-only runner/tests/extractor/driver and frozen evidence;0 runtime branches,0 semantic roles/layers,0 production regex/templates,0 repair loops. No merge, deploy, live send, source-store mutation or B GO.
