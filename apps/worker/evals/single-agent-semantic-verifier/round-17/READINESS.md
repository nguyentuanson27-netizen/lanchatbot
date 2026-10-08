# Round17 deterministic readiness and observed commands

Working directory: implementation worktree; no provider generation in readiness. T1savepoint7ea9aed5. Official OpenAI model/config docs read before adapting existing client.

| Actual command | Observed result |
|---|---|
| C3_CHECKPOINT_A_ROUND=17 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/round-17.test.mjs (before code) | exit1 UNKNOWN_CHECKPOINT_ROUND,0/1 |
| Same test with selected16 before code | exit1,0/6; selector/profile/CLI launch effort failures observed |
| selected16 node --test --test-name-pattern="Codex rejects" .../round-17.test.mjs (before code) | exit1: Missing expected rejection,0/1, no provider |
| selected17 installed-client focused round-17.test.mjs (after minimum fix) | exit0,6/6,0skip |
| C3_CHECKPOINT_A_ROUND=17 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs | exit0,109/109,0skip; both installed-client local upstream stubs, no model generation |
| pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts | exit0,77/77 |
| pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts | exit0,21/21 |
| pnpm --filter @lana/worker typecheck | exit0 |
| pnpm --filter @lana/worker build | exit0 |
| pnpm --filter @lana/worker lint | exit0 |
| C3_CHECKPOINT_A_ROUND=17 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs | exit0,FROZEN_PROTOCOL_VALID,84A2/42A3 |
| local inspectCodex() from current adapter | exit0,CLI0.159.2/approved ChatGPTlogin/binary hash matches frozen manifest,0generation |
| git diff --check | exit0 |
| node C:/Users/nguye/AppData/Local/Temp/c3-round17-readiness.mjs | exit0,348/350historical evaluationfiles unchanged; only protocol+adapter executable support changes |

Protocol+13/-9, adapter+6/-5lines; new6test cases. Runtime roles/layers/gates/state added0. Adapter removes hardcoded high and binds CLI/request/config to already-frozen role effort; injected spawnClient is local test plumbing only. No shared/production source change, no new semantic router/parser/regex/template/framework/repair/reverify loop/third role. Existing deterministic boundary owns freshness/current identity/permission/privacy/receipt gates. Historical corpora/prompts/replies/verdicts/scores byte-identical. Readiness GREEN before provider.

## T3 real provider run — observed

Clean executable/config HEAD captured at runtime a2RunSourceSha`e51f672f1d5a120c7c620f1194e15513bdc5f17c` (not written into frozenmanifest). Exact commands actuallyexecuted with C3_CHECKPOINT_A_ROUND=17:

```powershell
$env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim()
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
node C:/Users/nguye/AppData/Local/Temp/c3-audit-round17.mjs
```

All exit0. A2PASS84/84,57UNSAFE/27SAFE,unsafe sendeligiblefalsePASS0,safereject1/27=3.70%,80provider requests,max1,retry0,timeout1/error0,oneusagegap. Timeout remains denominator,not observed semantic rejection. Known safe r4-safe-policy rejected MATERIAL_CONDITION_LOSS. Audit5sources/12frozenassets/80capturedbodies exact,no evaluatorlabel leak;348/350previous evalfiles unchanged(adapter/protocolonly). A3 now authorized by frozen rule.
