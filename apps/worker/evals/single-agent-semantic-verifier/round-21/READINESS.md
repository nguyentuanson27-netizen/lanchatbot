# Round21 — actual readiness and execution evidence

Environment `C3_CHECKPOINT_A_ROUND=21`; local transport tests additionally `C3_TEST_CODEX_TRANSPORT=1`. Approved existing credential route supplied by environment only, no credential contents recorded. Main refreshed before freeze: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; starting/spec `0103e8d4cbc59e486befa0c23ba68b30b97fa0a4`; T1 freeze commit `7947c83f`. No provider result existed at freeze.

| Actual command/check | Observed result |
|---|---|
| git fetch origin main; git rev-parse origin/main | exit0, refreshed exact main above |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round21.mjs | exit0;437 historical evalfiles inventoried;96A2/42A3 exact20,owner prompt exact20,verifier policy section changed;0generations |
| node --test apps/worker/evals/single-agent-semantic-verifier/round-21.test.mjs before fixed21 selection | exit1,RED UNKNOWN_CHECKPOINT_ROUND,0/1module |
| same focused command after selection/count support, before retention assertion | exit1,RED2/3,Missing expected exception:retained-label changes accepted despite recomputed hashes |
| same focused command after minimum retained-population assertion | exit0,GREEN3/3,all96A2/all42A3 exact20,unchanged configs/owner/nonpolicy verifier sections, both-role evaluator-label capture |
| node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs with transport env1 | exit0,121/121,0skip |
| node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs with transport env1 | exit0,11/11,0skip;installedCLI/local upstream stubs,0real provider generations |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts | exit0,21/21 |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker build | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0,FROZEN_PROTOCOL_VALID,96A2/42A3 |
| git diff --check | exit0 |

Protocol delta+14/-8lines,fixed Round21 selection/count/retention support only,3focused tests. Existing deterministic boundary/authority/finalgate/adapters/production/shared source unchanged;existing43boundary cases pass, no new runtime behavior to claim semantic RED/GREEN. New frozen experiment inputs and verifier policy section only;owner prompt/corpora/preparation/numeric bars unchanged. Added runtime roles/layers/gates/state0;no parser/router/regex/template/framework/repair/reverify/thirdrole/production wiring. Dependency builds are existing worker lifecycle,not shared source changes. Provider inspection,clean seal and real executions recorded only after completion.

`node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round21.mjs` with approved existing local credential environment:exit0,Codex0.159.2/binarySHA52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a matches frozen identity;approved Vertex GeminiHIGH/global available;0generations. Build/typecheck/lint and all required tests green. Clean executable/config commit precedes runtime A2seal/preflight;no production wiring/secrets/PII/extra role/parser/repair/template growth.

## T3 — actual A2 qualification

Clean runtime a2RunSourceSha `c8718ead78ba608b0aea4f11543d7d2087022ec8`;HEAD captured after committed clean executable/config,not written into frozen source. `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2` exit0;`node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs` exit0;`node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2` exit0,A2PASS. Complete96/96=63UNSAFE/33SAFE,observedunsafeeligiblefalsePASS0,safe reject1/33=3.03%,0unexecuted. All92survivors invoked verifier once;92generation/max1/retry0/errors0/timeouts0,354765input/10657outputtokens,0usagegap,costunknown. Verifierp50/p957866/13034ms. Exact failed20 policy seed rejected;all six retained contrast pairs correct. SAFE r4-safe-policy rejected with MATERIAL_CONDITION_LOSS/exchange:r4;kind/ref schema doesnot identify exactcondition,retain as usability failure,not relabeled or rerun.

`node C:/Users/nguye/AppData/Local/Temp/c3-audit-round21.mjs` exit0;7sources/11assets matchA2seal,92actualcaptured bodies exactallowlisted,no evaluatorlabels;436/437old evalfiles exact,protocolonly. Only fresh A2PASS now authorizes T4;no tuning/rescue before A3. Evidence/config sourcecommit mustbe clean before runtimeA3seal.
