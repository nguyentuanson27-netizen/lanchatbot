# Round19 — actual readiness and execution evidence

Environment: C3_CHECKPOINT_A_ROUND=19; installed transport tests C3_TEST_CODEX_TRANSPORT=1. Existing local credential path supplied through C3_VERTEX_CREDENTIAL_FILE only; no credential contents retained. Implementation branch retained; main refreshed to296cdcfbf5759f5bf9cbb24acf3dc63005589361, starting/specf793a6afc97dac5788b9a46b1247df4015034c00. T1 frozen savepoint170764a3; no results existed at freeze.

| Actual command/check | Observed result |
|---|---|
| git fetch origin main; git rev-parse origin/main | exit0, refreshed main above |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round19.mjs | exit0;397historical evalfiles inventoried,84A2 exact,42A3 runtime exact,2offline contracts revised,0generations |
| node --test apps/worker/evals/single-agent-semantic-verifier/round-19.test.mjs before selection support | exit1 RED UNKNOWN_CHECKPOINT_ROUND,0/1 module test |
| same focused command after selection support/before retention assertion | exit1 RED1/3, changed runtime/evaluator incorrectly accepted |
| same focused command after minimal retention assertion | exit0 GREEN3/3;42paired runtime body equivalence and injected evaluator-marker capture test |
| node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs with C3_TEST_CODEX_TRANSPORT=1 | exit0,115/115,0skip |
| node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs with C3_TEST_CODEX_TRANSPORT=1 | exit0,11/11,0skip;local stubs,not provider result |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts | exit0,21/21 |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker build | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round16.mjs with current approved credential route | exit0;Codex0.159.2/binary identity and VertexGeminiHIGH/global available;0generation |

Protocol source delta17added/7removed lines;3new focused tests. Fixed19 selection/retained-population validation only. Provider adapters, boundary/shared/production source unchanged. Runtime semantic roles/layers/gates/state added0. No parser/router/template/regex/framework/repair/reverify/thirdrole/production wiring. Same prompts/runtime/config/numeric bars; evaluator-only review correction frozen before results. Subsequent commands/results appended only after actual execution.

node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs and git diff --check both exit0 after readiness;FROZEN_PROTOCOL_VALID,84A2/42A3. Clean source commit follows before runtime A2 seal.

## T3 — actual provider run and seal

Clean runtime a2RunSourceSha a0936818550e94184dd9b029c158b784dbc1bd68. C3_CHECKPOINT_A_ROUND=19; A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim(). Actual protocol.mjs --preflight-a2,run-a2.mjs,protocol.mjs --validate-a2,c3-audit-round19.mjs,c3-report-round19.mjs all exit0. A2PASS84/84=57UNSAFE/27SAFE;unsafeeligiblefalsePASS0,safe terminalfailure1/27=3.70%(r4-safe-policy).80generations,max1/retry0,error0/timeout0,usage complete.7sources/11assets/80captured bodies matchseals;396/397historical evalfiles exact,onlyprotocol support changed. Interim reportA3NOT_RUN/missing review; no terminal owner disposition implied. Only nowA3permitted;commit clean evidence before its runtime seal.

## T4 — actual A3 execution and review

Clean runtime a3RunSourceSha `8ad2a61957ef0ce17b1365606d40e82e85ab94d7`, after committed A2 PASS evidence. Environment `C3_CHECKPOINT_A_ROUND=19`, `A3_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim()`, `A2_STATUS=PASS`; approved credential supplied locally, contents not retained.

| Actual command/check | Observed result |
|---|---|
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3 | exit 0, sealed source/input identities and A2 prerequisite valid |
| node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs | exit 0, 42 owner + 42 mandatory verifier generations, max 1 per role slot, retry/error/timeout 0 |
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3 | exit 0, 42 registered attempts retained; raw pre-review quality BLOCKED/human-null preserved |
| node C:/Users/nguye/AppData/Local/Temp/c3-review-round19-compact.mjs, ranges 0–4, 1–6, 4–9, 8–15, 13–21, 17–26, 22–31, 28–37, 34–42, 40–42 | all 42 complete histories/current customer messages/actual terminal replies inspected; pending rows revisited when complete |
| Direct frozen profile, exchange policy, permission/receipt and current binding readback | completed for concern/fallback diagnosis; no new runtime facts or provider calls |
| node C:/Users/nguye/AppData/Local/Temp/c3-score-round19.mjs | exit 0, 42 connected primary reviews and 420 diagnostic ratings; 33 PASS/9 FAIL, quality FAIL |
| node C:/Users/nguye/AppData/Local/Temp/c3-audit-round19.mjs | exit 0, 7 sources/11 frozen assets/164 captured bodies match; 396/397 historical eval files byte-identical, only protocol support changed |
| node C:/Users/nguye/AppData/Local/Temp/c3-report-round19.mjs | exit 0, complete report, all 42 histories and nine failed-turn reviews exported |
| node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round19.mjs | exit 0, exact 42 terminal exports/420 ratings, raw JSON and frozen inputs preserved, Markdown links valid, human packet unfilled |

Actual dispositions: 36 SEND_ELIGIBLE/6 FALLBACK/0 HANDOFF/0 NO_SEND. Fallback 14.29% exceeds 10%; concern 8/11, partial 6/9, policy 7/9 below 90%; correction 9/10 and simple 3/3. Recommendation STOP independently of unresolved primary safety concern in `r7-price-ready-fit`. Six captured verifier FAILs were retained; no rejected candidate substituted for the customer's fallback.

Total 164 generation + 1 OAuth request, 744622 input/68475 output tokens, usage complete, cost unexposed. Gemini owner 242113 input/54020 output includes 2112 candidate + 51908 thinking tokens. Existing raw owner aggregate reads OpenAI-shaped usage keys and shows zero for Gemini; raw evidence retained unchanged, audit normalizes actual Gemini usageMetadata. A3 verifier p50/p95 6879/16195 ms; added verification 6881/16204 ms; end-to-end 12919/22909 ms. Primary subjective/nonblind review is not independent/human/owner acceptance. Same generation inputs/config/prompts as Round18: new scores do not establish causal generation improvement. No executable, frozen input or production change after seals; no further provider run/post-A.
