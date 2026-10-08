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

Pending at this savepoint. Only clean committed source/preflight can start A2. A3 only after fresh A2 PASS. Results, source seals and actual commands will be appended from observed evidence; no result is claimed here.
