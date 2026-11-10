# Commands thực sự đã chạy

Cwd: repository working tree. Detailed log hashes/exit codes: PREPARATION.json. Provider scripts dùng existing credential route in memory; không ghi credential vào commands/evidence.

| Command | Kết quả |
| --- | --- |
| `pnpm --filter @lana/worker test:evals` | 474PASS/2optionalSKIP, exit0 |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts` | 122PASS/7files, exit0 |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21PASS/2files, exit0 |
| `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` | 44PASS/1optionalSKIP, exit0 |
| `pnpm --filter @lana/worker typecheck` | PASS, exit0 |
| `pnpm --filter @lana/worker build` | PASS, exit0 |
| `pnpm --filter @lana/worker lint` | PASS, exit0 |

RED→GREEN commands: `node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` observed11PASS/1FAIL/1skip→12PASS/1skip; `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs` observed8PASS/2FAIL→10PASS, then native registration10PASS/1FAIL; combined finalGREEN23PASS/1skip before adding Gemini capture test. Full focused final above44PASS/1skip. Logs in PREPARATION.json.

Native manifest with altered toolSchemaHashes.gemini: `node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest <temporary invalid-tool-schema-manifest.json> --preflight --out <temporary must-not-dispatch>` expected exit1/COMPARISON_FROZEN_INPUT, no output/credential/source/provider dispatch. This is rejection evidence, not successful source preflight.

Preflight and the single batch below each executed once; Source session enforces live PostgreSQL SELECT-only and closes SSH tunnels. `$salesToolsTemp` was `Join-Path $env:TEMP c3-b-owner-tools-run-20261015`; service account path loaded from existing approved pointer, never printed.

```powershell
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest apps/worker/evals/single-agent-commerce-read-only/owner-tools-run-20261015/manifest.json --preflight --out (Join-Path $salesToolsTemp 'preflight')
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest apps/worker/evals/single-agent-commerce-read-only/owner-tools-run-20261015/manifest.json --run --out (Join-Path $salesToolsTemp 'raw')
```

Preflight exit0/SOURCE_PREFLIGHT_PASS/0generations, embedding1. Run exit0/COMPLETE_REVIEW_PENDING,10recorded/23HTTP200,0retry/error/timeout. Source clean at seal and completion. No additional attempt or generation after primary.

Offline extraction `py -3.11 <temporary>/primary-input.py` only after raw9403e2e6 committed; metrics `py -3.11 <temporary>/metrics.py` and binding/firewall/readback `node <temporary>/audit.mjs` only after primary91a12ffa. Audit first failed byte comparison on documentation CRLF versus Git LF; corrected documentation-only assumption and offline rerunPASS. Runtime/frozen manifest/raw/primary labels unchanged, no model rerun.

`git diff --check` initially identified trailing provider spaces in the Markdown transcript. Display trims these; raw/PRIMARY_INPUT exact text unchanged. Final diff and delivery/readback performed after report.

Full worker src suite, new A2/A3 provider qualification, state/effect provider scenario, deploy and live send were not run. Worker/shared source code unchanged in this task; existing focused boundary and business-tools checks above were actually rerun. Windows v4 test junction restored byte-exact in finally.
