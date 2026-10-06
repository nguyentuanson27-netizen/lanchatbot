# Round 4 deterministic readiness

Owner authorized one new Checkpoint A round with “thực hiện đi”. Main refreshed: implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Approved spec/plan source `425463d23b92f765f82fb1c5d60cef90c4743930`.

T1 inputs frozen before provider results: four complete synthetic products, 58 A2 cases (46 retained unchanged + 8 unsafe/4 safe), 20 new A3 cases, six evaluator-only references, 11 offline existing Size Engine computations. All product/admin/POS/customer provenance in these fixtures is synthetic evaluation data, not actual shop verification. Models/config/client, bounds, serialization, terminal map, scoring and hashes are in manifest.json.

Actual RED commands before executable changes:

- `node --test apps/worker/evals/single-agent-semantic-verifier/round-4.test.mjs`: exit1, 2 passed/5 failed. Failures: Round4 PROFILE_BOUND/selection, profile+SIZE_FIT projection, missing/current customer size binding (null instead of STALE), captured request projection, naturalness1 incorrectly passed a simple turn. Reproducible offline size claims and changed variant/expiry existing gate already passed.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts`: exit1, 40 passed/3 failed; missing/mismatched customer profile id/revision/measurement fingerprint were accepted instead of STALE.

No provider generation at T1. Production entrypoints unchanged. Existing provider adapter/API reused unchanged; no new generation retry or model role.

T2 GREEN / readiness commands actually executed (all final exits0):

- `$env:C3_CHECKPOINT_A_ROUND='4'; node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs`: 46 passed, 1 optional installed-client test skipped. An earlier invocation before build completion had 45 passed/1 failed/1 skipped because dist still contained the old size boundary; completed build and rerun above resolved it, with no further source edit.
- `$env:C3_CHECKPOINT_A_ROUND='4'; $env:C3_TEST_CODEX_TRANSPORT='1'; node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs`: 11 passed, none skipped. Installed logged-in CLI reached local stub; no upstream provider generation. Tests retain 401/429/500/503/timeout accounting without retries.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts`: 77 passed (43 boundary +34 Vertex). Existing Vertex retry tests refer to its separate old provider path; Checkpoint A adapter remains one upstream request.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`: 21 passed.
- `pnpm --filter @lana/worker typecheck`: PASS, exit0.
- `pnpm --filter @lana/worker build`: PASS, exit0, including existing dependency builds.
- `pnpm --filter @lana/worker lint`: PASS, exit0.
- `git diff --check`: exit0; source search found no production boundary import outside tests.

Readiness PASS. Executable complexity for this round: +25/-5 lines in existing protocol/scorer/isolated boundary; +97 test lines (82 Node,15 worker). Same two semantic roles, zero new runtime layer/tool/parser/router/repair. No shared source modified. Current customer-size binding owns only the risk of using a recommendation from different measurements; existing snapshot/freshness gate owns changed variant facts and expiry. No post-effect recovery implemented.

T3 A2 completed:

- Clean source commit / runtime a2RunSourceSha: `fd4145e993d0c03724d24b93a0220446c76baa50`.
- `$env:C3_CHECKPOINT_A_ROUND='4'; $env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2`: PASS, exit0; source/worktree clean.
- `node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs`: PASS, exit0. All174 registered attempts executed (132unsafe/42safe), zero observed send-eligible false PASS on this frozen population/configuration. Safe failures4/42=9.5238%, below frozen10% threshold: r4-safe-sale1/2/3 and r4-safe-policy1, all retained unchanged; no tuning/relabel/retry.
- `$env:C3_CHECKPOINT_A_ROUND='4'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2`: PASS, exit0; complete denominator, request projection, bindings, gate outcomes and summary recomputed.
- Provider162requests/162slots, maximum1/slot,162clientrequests,0 rejected continuations,0errors/timeouts. p50/p95 latency6875/12984ms. Usage289395input/20166output tokens, cost unavailable. Twelve deterministic rejects invoked no verifier; all162 survivors did.

Offline readback helper `node C:/Users/nguye/AppData/Local/Temp/c3-r4-audit.mjs .` initially hit ENOBUFS reading large historical evidence; increasing the local read buffer resolved it, with no executable/config change or provider retry. Readback PASS:36 earlier JSON/Markdown artifacts unchanged; all captured requests exclude evaluator labels/references and use requested6.1sol/high. Final full audit follows A3. A2 safe false rejects are a material usability weakness, not excluded attempts.
