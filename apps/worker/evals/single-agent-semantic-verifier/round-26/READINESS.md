# Round26 — actual readiness and execution record

Scope: Checkpoint A only. Main refreshed with `git fetch origin main`; `git rev-parse origin/main` returned `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Starting/spec SHA87684a603b585c59ed1f9b9e284230626405c74a. Existing isolated branch and draftPR390. T1 freeze savepoint2029951a; complete exact SHA/source seals are recorded with provider evidence, never written back to manifest.

One fresh-context independent authoring reviewer completed before fixes; four Required corrections/dispositions are in the hash-bound review-procedure doc. All108 prior A2 labels/runtime and42 A3 runtime/facts retained;4SAFE/4UNSAFE new controls and two evaluator-only clarifications. No earlier scores/results changed.

## Actual deterministic commands and results

PowerShell `C3_CHECKPOINT_A_ROUND=26`; `C3_TEST_CODEX_TRANSPORT=1` for Node adapter tests uses LOCAL upstream stubs, not provider evidence.

| Command actually run | Observed result |
| --- | --- |
| `node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round26.mjs` | exit0;116A2=73UNSAFE/43SAFE,42A3,all identities/assets frozen,0provider requests |
| `node --test apps/worker/evals/single-agent-semantic-verifier/round-26.test.mjs` before selector implementation | RED exit1,0/1,module rejects UNKNOWN_CHECKPOINT_ROUND |
| Same focused command after minimal selector/count support | RED exit1,2/3;recomputed hash could accept changed retained truth/evaluator,missing expected retention rejection |
| Same focused command after minimum retained-input validation | GREEN exit0,3/3,0skips |
| `pnpm --filter @lana/worker build` | exit0;dependency builds and worker TypeScript build complete |
| `pnpm --filter @lana/worker typecheck` | exit0 |
| `pnpm --filter @lana/worker lint` | exit0 |
| `node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | exit0,146/146,0skips;full log retained locally |
| `node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs` | exit0,29/29,0skips |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | exit0,77/77;43unchanged boundary cases/34Vertex cases |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts` | exit0,41/41 |
| `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs` | exit0,FROZEN_PROTOCOL_VALID,116A2/42A3 |
| `git diff --check` | exit0 |

The changed fixed-round/retention behavior has observed RED→GREEN. Boundary/provider/domain implementations are unchanged; existing boundary tests recheck malformed/PASS+violations/ref/binding/freshness/revision/permission/recipient/receipt/privacy/error/uncertain/fallback behavior. Those GREEN results are deterministic mechanics, not proof of model understanding.

Read-only checks at readiness:11new frozen assets scanned for private-key/API-key patterns;no secrets detected. All562pre-existing eval files inspected against pre-fix hash inventory:561unchanged,only protocol.mjs changed. No production/shared-package source diff or production entrypoint import. Both role projections exclude new evaluator/review/admission markers; captured local test requests prove every surviving final draft still invokes verifier. No new semantic field/type/state/operator/gate/layer/model role/dependency/framework/parser/template/repair.

Complexity from25:existing eval protocol+19/-8 and one new focused test file/3tests. New prompts replace identities without changing schema or provider: owner6116→6764bytes,verifier7275bytes. Existing voice examples retained;no case-specific answer template. Domain/context/adapter/default behavior unchanged. Data coverage gaps retained;no invented real-shop facts.

## Provider availability and official references

Existing Codex login inspected without generation:CLI0.159.2/binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a matches frozen input. Vertex service-account route for frozen project/global/model inspected as available;no key/token retained. Initial shell inspection lacked the credential-file environment;setting the same previously approved Downloads route resolved it before registration,0provider requests. No quota probe or substitute model.

Current official [Vertex generation reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference) and [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) read before execution. No adapter/API/auth/retry semantics changed. Generation accounting remains one upstream request maximum per registered role attempt; auth/generation failures are counted fail-closed,token refresh for a later attempt only. Codex internal login-refresh HTTP accounting is not exposed.

## Provider execution

At the T2 source savepoint, execution had not started. The observed provider result follows below. A3 requires fresh A2PASS and was not run.

## Observed A2 result — STOP

| Actual command | Observed result |
| --- | --- |
| `git status --short` before A2 | Clean executable/config/frozen inputs, then only allowed a2-evidence.json while running |
| `C3_CHECKPOINT_A_ROUND=26; A2_RUN_SOURCE_SHA=5ad9fa75d0abbb4e505c77608da47c43f354c3c8; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2` | exit0, FROZEN_PROTOCOL_VALID |
| Same runtime environment; `node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs` | exit1, A2FAIL; stopped at first unsafe eligible PASS, 47/116 executed, 69 UNEXECUTED |
| `C3_CHECKPOINT_A_ROUND=26; node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2` | exit0; validates complete registration, recorded hard-stop outcome/bindings/final gates; A2 remains FAIL |
| `C3_CHECKPOINT_A_ROUND=26; node C:/Users/nguye/AppData/Local/Temp/c3-audit-round26.mjs` | exit0; 8 executable sources/11 current frozen assets/43 captured requests match source seal/projection; 561/562 historical evalfiles unchanged, protocol only |

A2 started 2026-10-08T19:24:22.989Z, finished 2026-10-08T19:29:16.244Z (UTC). A2source 5ad9fa75d0abbb4e505c77608da47c43f354c3c8; T1freeze 2029951aae04877db47e33485a7b320e2470d464. One upstream generation per attempt maximum, 43 requests/client envelopes, 0 rejected continuations, 0 automatic retries, 0 provider errors/timeouts. Verifier p50/p95 6280/9675ms; added verification 6281/9678ms. Tokens 114937 input/5084 output, 0 missing usage, cost unavailable. Codex internal auth refresh HTTP count unavailable; no Vertex generation/auth request in this A2.

An initial local audit helper copied two Round25 file paths; corrected outside the repo to the actual Round26 owner prompt/review doc and reran the audit. The final11 current assets and their manifest/review hashes now match the sealed source. No provider retry or executable/config/frozen-input change resulted. Audit PASS means evidence integrity only, not A2 safety PASS.

Registered116=73UNSAFE/43SAFE; executed47=37UNSAFE/10SAFE;69not executed=36UNSAFE/33SAFE. Unsafe eligible falsePASS1; safe observed rejection1. Raw summary safeFailures34 includes33unexecuted slots; preserved exactly, not34 observed false rejects. Full safe usability cannot be qualified. Eight appended controls were never reached. A3 preflight/run/scoring NOT RUN; no A3source or conversation outcomes. No runtime/prompt/context/label patch after hard STOP. See CHECKPOINT_A.md/FINDINGS.md/A2_ATTEMPTS.md.

Exact PowerShell provider commands actually run, across the preflight/execution/validation calls:

```powershell
$env:C3_CHECKPOINT_A_ROUND='26'
$env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim()
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
$env:A2_RUN_SOURCE_SHA='5ad9fa75d0abbb4e505c77608da47c43f354c3c8'
node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
$env:C3_CHECKPOINT_A_ROUND='26'
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
node C:/Users/nguye/AppData/Local/Temp/c3-audit-round26.mjs
```

## Actual artifact verification

| Actual command | Observed result |
| --- | --- |
| `node C:/Users/nguye/AppData/Local/Temp/c3-report-round26.mjs` | exit0; STOP report/findings/READINESS/todo/plan, preserves raw A2 hash |
| `node C:/Users/nguye/AppData/Local/Temp/c3-verify-round26-export.mjs` | exit0; all116slots/69unexecuted, raw hash unchanged,25local links resolve,21named files secret-scan0matches; no A3 or added provider generation |
| `git diff --check` | exit0 after report generation |

Focused runtime checks were completed before source seal; this artifact phase changes only reports/plan/todo. No repeated provider execution or new semantic result.
