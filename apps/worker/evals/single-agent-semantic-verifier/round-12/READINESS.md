# Round12 — actual commands and evidence

Implementation base after `git fetch origin main`: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Clean starting HEAD `f14d6b26bc0688ad52f80dc9bef2db9cfcce204b`; existing isolated branch/PR390. T1 savepoint `640b8204` freezes inputs before any provider generation.

| Command actually executed from repository root | Observed result |
|---|---|
| `git fetch origin main`; `git rev-parse origin/main`; `git rev-parse HEAD`; `git status --short` | exit0; current main/base recorded; initial clean tree |
| `node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round12.mjs` | exit0;66A2/28A3,233older evaluation files inventoried; no provider calls |
| `node --test apps/worker/evals/single-agent-semantic-verifier/round-12.test.mjs` before selector support | exit1;0/3PASS: UNKNOWN_CHECKPOINT_ROUND and PROFILE_BOUND, observed RED |
| Same focused test after minimum implementation | exit0;3/3PASS,0skips, GREEN |
| `C3_CHECKPOINT_A_ROUND=12 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | exit0;91/91PASS,0skips; protocol/boundary/runner/provider adapters including installed-client local stub, no provider generation |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | exit0;77/77PASS (43boundary/34Vertex) |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | exit0;21/21PASS |
| `pnpm --filter @lana/worker build` | exit0;dependency build hooks and worker build completed |
| `pnpm --filter @lana/worker typecheck` | exit0;dependency build hooks and worker typecheck completed |
| `pnpm --filter @lana/worker lint` | exit0;repository lint script completed |
| `C3_CHECKPOINT_A_ROUND=12 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs` | exit0;FROZEN_PROTOCOL_VALID,66A2/28A3 |
| `node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round12.mjs` with process-local approved credential route | exit0; Codex0.159.2/login and existing Vertex route available, no generation/token/credential output |
| `rg -n 'single-agent-semantic-verifier-boundary' apps/worker/src --glob '*.ts'` | only boundary test imports; no production wiring |
| `git diff --check`; `git diff --cached --check` for T1 | exit0 |

Environment values are assigned with PowerShell `$env:`; shell-independent table notation above abbreviates those assignments. No shared source/provider API changed; existing clients reused. Bounded request tests include evaluator-marker injection and byte-identical captured request checks for both roles.233older evaluation files are retained except the intentional protocol selector/count lines; historical JSON/MD/TXT results stay byte-identical. Whole-conversation review protocol/numeric bars unchanged. No third role/parser/router/template/repair/state/tool/mutation or post-effect implementation.

Provider preflight/run/validation source SHAs are captured at runtime only, after committed clean source. Their actual results are appended after execution; no PASS is claimed in advance. Both model identity/config/fallback/prompt/schema/corpus hashes are frozen in manifest.json.
