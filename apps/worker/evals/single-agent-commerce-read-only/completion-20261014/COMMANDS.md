# Commands and observed results

Working directory: `C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005`. Commands below were actually executed. Unit/integration development reruns make zero provider generations; they are not repetitions of the B1 population. Final provider source is `97f24609c0ab362893238fe1cabd3e1e6e8f690d`. All28provider generations belong to its one eight-case N1 batch.

## Observed RED and corrected checks

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts
```

Exit1:20PASS/1FAIL at21:43:56. The delayed committed-response case incorrectly recovered SEND_ELIGIBLE after the original receipt should have expired. Change expiry from readback clock+5min to committed updatedAt+5min, then:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-read-only.test.ts
```

Exit0:33PASS/3files at21:44:07. Earlier observed source RED→GREEN covered missing source timestamp/content, independent offer binding, current permission readback, persistent receipt query and latency including readback; these were followed by the focused checks below. An intermediate database build failed because a SQL row enum was typed string; corrected to the existing command-kind type, then builds passed. These failed checks are not represented as initial PASS.

The [development database reports](development/INDEX.json) retain all14available earlier invocations:10failed/4passed, all disposable databases dropped,0provider generations. Failures included missing required admin metadata in test setup, event-envelope time mismatch, canonical provenance/offer binding mismatch, missing prepared pin/readiness inputs, native quantity intent rejected by the existing permission contract, and the incorrect bank assertion expecting1message when the existing transaction creates a3message group. The input/setup assumptions and narrow native mapping were corrected; no CAS, inbox fence, protected replay or current-permission guard was disabled. Final two clean-source runs below supersede these for integration acceptance without erasing them.

One attempted PowerShell argument-array loop failed before running checks (`Unknown option: 'filter @lana/worker typecheck'`); it was replaced with literal commands below. A Windows fixture delete/junction setup was rejected before execution; the completed full-test setup used reversible Move-Item operations, verified the exact existing target, and restored the original16bytes. Neither rejected setup is counted as an executed test.

## Focused final checks

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/realtime-sales-cycle.test.ts src/realtime-protected-claim-boundary.test.ts src/realtime-reply-assembler.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/track-b-protected-claim-boundary.test.ts src/realtime-product-facts-v2.test.ts
pnpm --filter @lana/database exec vitest run src/realtime-runtime.test.ts
pnpm --filter @lana/business-tools exec vitest run src/qdrant.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts.test.ts src/size.test.ts
pnpm --filter @lana/business-tools exec vitest run src/product-facts-v2.test.ts src/product-facts-v2-projection.test.ts src/size-recommender.test.ts
pnpm --filter @lana/business-tools exec vitest run src/size-engine.test.ts src/size-claim-guard.test.ts src/policy-engine.test.ts
```

All exit0. Results respectively176worker/9files,17Node,28worker/2files,38database/1file,29business/4files,12business/2files and123business/3files. Two outdated worker filenames and three outdated business filenames in those filters matched no file; actual matched counts are stated, not inflated. The correct protected/product/size/policy tests were explicitly run in subsequent commands. Totals after the receipt fix:204focused worker,17native/protocol,38database and164business tests, all PASS.

```powershell
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm --filter @lana/database typecheck
pnpm --filter @lana/business-tools typecheck
```

All exit0. Worker pretypecheck/prebuild performed the relevant shared dependency builds, including database and business-tools, as required by their package scripts. Worker lint was run again after the final receipt change, exit0. Both final source-check and provider command below also invoke `pnpm --filter @lana/worker build` from source and abort on build failure; both completed successfully. No separate unobserved shared-script result is claimed.

```powershell
pnpm --filter @lana/worker test
```

Full completion baseline, [captured stdout](worker-full-baseline.txt):126Vitest files/1705tests PASS;459Node tests discovered,457PASS/0FAIL/2SKIP. Skips are opt-in installed-Codex login-to-local-stub probes (high/medium); no required B protocol/native test was skipped. The final B provider batch actually invoked the approved high Codex route seven times. Windows legacy fixture alias restored exactly; no fixture data changed. This full baseline preceded the final receipt-expiry test/change; the affected33tests plus the broader focused set above ran afterward. No later full-suite count is fabricated and no redundant full rerun was made for documentation/evidence.

## Final real-source and real-database commands

The process supplies the existing approved Vertex credential file in `C3_VERTEX_CREDENTIAL_FILE`; the value/private key is not copied to Git. Each `source-session.py` invocation reuses the existing ops credential route, temporary tunnels and in-memory source secrets. Provider child gets no test database admin route.

```powershell
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out "$env:TEMP/c3-b-final-97f24609-source"
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "$env:TEMP/c3-b-final-97f24609-cod" COD
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "$env:TEMP/c3-b-final-97f24609-bank" BANK_TRANSFER
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out "$env:TEMP/c3-b-final-97f24609-provider"
```

All exit0. Preflight:8cases/config ready/Codex0.159.2/zero generations, not yet connection proof. Source-check: policy/products/offers/freshness/current snapshot PASS; free-text search correctly AMBIGUOUS;1embedding/zero owner-verifier generations. COD and bank, run concurrently in different disposable databases:9/9groups each, clean97f24609, both databases dropped. Provider:8/8recorded,28generations,0errors/timeouts/retries, source completion identity valid. Runner exit0 means complete evidence collection, not that quality passed. Raw committed before primary; no extra generation follows the result.

Offline actual-wire audit ran against the28captured request projections and raw hashes:0evaluator leaks,7mandatory verifier calls for7final drafts,7binding matches, actual models/one upstream per generation/budgets/denominator PASS. [AUDIT](AUDIT.json)/[METRICS](METRICS.json) retain the results; actual whole-terminal primary4/8adequate, not an automated keyword judge. `git diff --check`, JS syntax checks and Python AST parse passed. Credential/private-key/token/connection-string pattern scan of retained raw artifacts found no matches; real customer inputs were not used.

Official provider documentation rechecked before the real batch: [function calling](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) and [thought signatures](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thought-signatures). Native continuation preserves model parts/signatures/call IDs and keeps function results paired; code enforces tool/generation caps even for the observed response containing a call while modeNONE was supplied. An older GenerationConfig URL failed to open; it was not counted as a successful documentation read.

No A2/A3 rerun, second B provider batch, hidden retry, live source/customer/cart mutation, live delivery, deployment, migration of the source database or Phase C command was executed.
