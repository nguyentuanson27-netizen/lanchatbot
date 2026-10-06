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

T4 A3 / checkpoint completed:

- Clean a3RunSourceSha: `216e41d5f02d5b6bfa453ec4857e2fdb8d8a5b8f`; `$env:C3_CHECKPOINT_A_ROUND='4'; $env:A3_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(); $env:A2_STATUS='PASS'; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3`: exit0.
- `node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs`: exit0, all60 owner+60 verifier slots complete;60SEND_ELIGIBLE,0fallback/handoff/no-send and0provider errors/timeouts. Exit0 records complete capture, not quality acceptance.
- `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3`: exit0; captured requests/exact final surface/current gates and all registrations validated. Raw quality remains an unscored BLOCKED placeholder, separate offline review resolves quality FAIL.
- `node C:/Users/nguye/AppData/Local/Temp/c3-r4-assessment.mjs .` with C3_CHECKPOINT_A_ROUND=4: exit0; all20 histories and60 actual terminal replies read,600manual scores and individual reasons assembled in a3-codex-assessment.json.38/60 pass,22 naturalness failures. Families concern5/12,partial4/12,correction14/15,policy6/12,simple9/9. Primary agent review, not independent/human acceptance; no judge provider call.
- `node C:/Users/nguye/AppData/Local/Temp/c3-r4-audit.mjs . write`: exit0;282captured provider records/requests,282clientrequests,max1per slot,0rejected continuations, all returned6.1sol;36historical artifacts and all sealed executable/frozen sources unchanged. Zero evaluator labels/references in requests. audit.json records final counts.
- `node C:/Users/nguye/AppData/Local/Temp/c3-r4-report.mjs .`: exit0; CHECKPOINT_A.md generated from frozen inputs/evidence/manual assessment.

A3 verifier p50/p95=6065/10685ms; added verification=6068/10691ms, full end-to-end=14612/24793ms. Total usage across A2+A3=727951input/34249output tokens; cost unavailable. See full report and A3_CONVERSATIONS.md. Recommendation STOP; no new model requests, tuning, automatic next round or post-A work.

Delivery readback: `git fetch origin main; git rev-parse origin/main` still296cdcfbf5759f5bf9cbb24acf3dc63005589361. `git diff --check` exit0; native source review found the change confined to the declared3modules. `git push origin feat/c3-semantic-verifier-checkpoint-a-20261005` exit0 published T4evidence commit426af09f387be09aff0a678c06606ae443471ec5. `gh pr edit 390 --title ... --body-file C:/Users/nguye/AppData/Local/Temp/c3-r4-pr-body.md` and `gh pr view 390 --json title,url,isDraft,headRefOid,statusCheckRollup` exit0: draftPR390 updated to Round4/STOP, published head matched. GitHub pnpm-check CI was queued at this readback; no CI PASS inferred. Follow-up delivery documentation does not change any sealed executable/config/input or captured result.
