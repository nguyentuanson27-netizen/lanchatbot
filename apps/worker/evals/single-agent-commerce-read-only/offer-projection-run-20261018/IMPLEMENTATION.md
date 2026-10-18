# Owner offer projection — implementation and readiness, 2026-10-18

Owner authorizes fix and one model replay under the [reviewed plan](../../../../../docs/specs/c3-phase-b-offer-projection-fix-plan-20261018.md). Intake `bca8805e8c7d21f17de63f0dd0d7008686dfec90`, refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Source fix savepoint `cf137da4`; [scope](SCOPE.md) fixes denominator/stop before provider results. No post-result runtime patch is part of this request.

## Implementation and observed tests

- B owner adapter removes duplicated root offerType/variantId/facts/availability only for a known unfiltered, non-partial multi-option read with one matching option retaining the same facts and metadata/status/reasons. Comparisons are in the same raw native response before reason sanitization; no comparison against newer trusted evidence is used to erase history.
- Explicit single offers, unknown request scope, null selling options, empty root facts, source/version/time/variant/value differences, unique availability/ETA and partial reads retain root scope. Product content remains independently available; native model parts/signatures, call/response IDs and original inputs are preserved.
- Declaration now describes per-option values and any remaining scoped root facts. No tool parameter schema, source resolver, protected claim, verifier input, effect/state/receipt/final gate or budget changes. No case-answer/production regex/template, parser, model role, repair or retry.
- T2 decision: keep both prompts byte-identical. Existing instructions cover the relevant boundaries, and another rewrite lacks demonstrated benefit. The measured hypothesis is clearer offer presentation, not a promised fix for all hallucination/voice/provider failures.

Observed initial RED: adapter36PASS/2FAIL, exit1, for root duplication and historical same-response folding. Minimum GREEN38PASS. Additional partial-read counterexample then exposed38PASS/1FAIL, exit1; preserving partial root shape fixed it:39PASS, exit0. Focused adapter/protocol/candidate **50PASS**; worker read-only/tools/state/effects/ingress/boundary **191PASS**; protected-claims/reply-assembler **21PASS**, all exit0. No disabled tests. The synthetic test prices/product IDs are not added to model prompts or corpus.

Full worker suite completed exit0: **1856Vitest PASS**, Node**504PASS/2optionalSKIP**. Worker typecheck/lint exit0. The source-check runner actually invoked canonical `pnpm --filter @lana/worker build` and completed exit0, so that build is reused rather than repeated standalone. Source readback SOURCE_ADAPTERS_READ_BACK/0generations exit0 with the existing candidate-description source hash check. Tests prove projection/authority compatibility, not natural sales quality or semantic reliability.

Self-review confirms all parameter schemas and other declarations identical to intake; only read_product description changes. Both prompts unchanged. A first task-local self-review invocation mixed CommonJS require and top-level await and failed before executing; corrected to ESM imports and rerun exit0. No runtime/test weakening or evidence replacement.

## Commands actually run so far

```powershell
git fetch origin main
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker test
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/contract-replay-20261018/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-source-20261018
git diff --check
```

Adapter command repeated only after tests/implementation changed. Logs retained under `C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-*-20261018.log`; exact RED and partial-RED failures preserved. Current provider results NOT_RUN at this preparation stage, historical45outcomes immutable; A OWNER_BYPASS, B sales/live STOP. No shared/source/policy/production entrypoint change or mutation controls added for unchanged effects.

Complexity:16changed/added adapter lines including declaration,92test lines, no runtime worker/state/effect edit, no new contract/gate/schema. Frozen request bounds and roles unchanged. Existing Lana Ops credential/source route reused for read-only live source and isolated test DB/capture runs; no secret copied into source/logs. Config/stateful preflights run after the clean sealed source is captured; their zero-generation results and all subsequent provider evidence are retained separately, not claimed here before execution. No new remote CI/full-repository pnpm check PASS claimed.
