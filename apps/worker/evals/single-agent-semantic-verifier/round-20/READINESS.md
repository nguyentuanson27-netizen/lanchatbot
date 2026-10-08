# Round20 — actual readiness and execution evidence

Environment `C3_CHECKPOINT_A_ROUND=20`; installed transport tests `C3_TEST_CODEX_TRANSPORT=1`. Approved existing local credential route supplied by environment only; no credential contents retained. Existing isolated implementation branch/PR390. Refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, starting/spec `15b8efd996bee13ce6147eee830e92b598169f78`, T1 freeze savepoint `11bebc9b`. No provider result existed at freeze.

| Actual command/check | Observed result |
|---|---|
| git fetch origin main; git rev-parse origin/main | exit 0, exact refreshed main above |
| node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round20.mjs | exit 0;420 historical evalfiles inventoried,84 retained A2+12paired controls=96,42A3 exact19,new separate prompts frozen,0generations |
| node --test apps/worker/evals/single-agent-semantic-verifier/round-20.test.mjs before fixed selection | exit 1 RED UNKNOWN_CHECKPOINT_ROUND,0/1module |
| same focused command after selection/count support | exit 1 RED2/3, initial tamper probe hit existing A2_ABUSE guard rather than retention risk |
| same command after probe corrected, before retention assertion | exit 1 RED2/3, Missing expected exception: changed retained labels accepted despite recomputed hashes |
| same command after minimum fixed20 retention assertion | exit 0 GREEN3/3,42A3/84oldA2 retained, six contrast pairs and evaluator-marker capture |
| node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs with transport env1 | exit 0,118/118,0skip |
| node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs with transport env1, first explicit run | exit 1,10/11;25ms timeout fired before request forwarding, TIMEOUT with0requests rather than expected1; preserve this timing failure |
| same explicit Codex command, unchanged source after earlier concurrent checks finished | exit 0,11/11,0skip; local stubs/installedCLI, not real provider evidence |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit 0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts | exit 0,21/21 |
| pnpm --filter @lana/worker typecheck | exit 0 |
| pnpm --filter @lana/worker build | exit 0 |
| pnpm --filter @lana/worker lint | exit 0 |
| node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit 0,FROZEN_PROTOCOL_VALID,96A2/42A3 |
| git diff --check | exit 0 |

Initial timeout-test failure reflects its wall-clock assumption that a25ms local deadline starts after forwarding; the actual adapter returned fail-closed TIMEOUT with0requests. Full118 suite passed before this isolated timing failure and unchanged explicit suite passed afterward. No timeout semantics, request counting, production adapter or test deadline changed to rescue it; no real provider retry/generation occurred during these tests.

Protocol delta +15/-8lines;3focused tests. Fixed20 selection/count/retained-population support only. New owner/verifier prompts address approved scope/decision behavior; A3 context/facts/evaluator unchanged. Boundary/shared/provider adapters/production unchanged. Runtime semantic roles/layers/gates/state added0;no parser/router/regex/template/genericframework/repair/reverify/thirdrole or production wiring. Subsequent actual provider/validation/delivery evidence appended only after execution.

`node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round20.mjs` with approved local credential environment: exit0, Codex0.159.2/binary SHA52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a matched frozen identity; Vertex GeminiHIGH/global credentials available, provider generations0. Existing dist/vertex.js helper inspected after build, no new API/client source. Clean executable/config commit precedes runtime A2 seal.
