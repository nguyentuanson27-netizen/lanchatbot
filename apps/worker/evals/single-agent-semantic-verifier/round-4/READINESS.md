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

Readiness PASS. Executable complexity for this round: +25/-5 lines in existing protocol/scorer/isolated boundary; +98 test lines. Same two semantic roles, zero new runtime layer/tool/parser/router/repair. No shared source modified. Current customer-size binding owns only the risk of using a recommendation from different measurements; existing snapshot/freshness gate owns changed variant facts and expiry. No post-effect recovery implemented.
