# Commands thực chạy

Source run: `688a40cc33eff686c76039fda683587f1e81276f`; prompt source75f075b1. Logs/check hashes trong PREPARATION.json.

| Command | Observed result |
|---|---|
| `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` | 38PASS/1optionalSKIP, exit0 |
| `pnpm --filter @lana/worker test:evals` | 468PASS/2optionalSKIP, exit0 |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts` | 122PASS, exit0 |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21PASS, exit0 |
| `pnpm --filter @lana/worker typecheck` | PASS, exit0 |
| `pnpm --filter @lana/worker build` | PASS, exit0 |
| `pnpm --filter @lana/worker lint` | PASS, exit0 |

- `git fetch origin main` / `git rev-parse origin/main`:296cdcfb.
- `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs`: RED exit1/7PASS1FAIL, GREEN exit0/8PASS.
- Windows test junction finally restored tracked v4 link-text byte-exact; no source alias diff.

```powershell
$salesPromptRunTemp = Join-Path $env:TEMP 'c3-b-owner-task-prompt-run-20261015'
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest apps/worker/evals/single-agent-commerce-read-only/owner-task-prompt-run-20261015/manifest.json --preflight --out (Join-Path $salesPromptRunTemp 'preflight')
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest apps/worker/evals/single-agent-commerce-read-only/owner-task-prompt-run-20261015/manifest.json --run --out (Join-Path $salesPromptRunTemp 'raw')
```

Credential file path loaded from existing authorized local pointer into process env only, never copied into Git. Both commands exit0: preflightSOURCE_PREFLIGHT_PASS/0generation, runCOMPLETE_REVIEW_PENDING/10recorded/20requests. Clean source identity verified before preflight/run; code source stable throughout.

Raw5370a335 committed before semantic primary1a9a28e9. Terminal/source extraction ran before raw commit but was not read/scored until raw preservation; no rejected draft inspected until primary committed.

```powershell
py -3.11 (Join-Path $salesPromptRunTemp 'primary-input.py')
py -3.11 (Join-Path $salesPromptRunTemp 'metrics.py')
node (Join-Path $salesPromptRunTemp 'binding-audit.mjs')
```

Offline extraction10terminal/10contexts; metrics20requests/input equality/firewallPASS; final audit10bindings/16rawblobsPASS. Initial offline assumptions about business authorization and absent Gemini HTTP-body telemetry failed and were corrected without source/raw/model rerun. Exact evidence limits in CHECKPOINT_B.md.

Post-run scripts (external, no generation):
- `primary-input.py` SHA256 `4c4c893e07e25a097c8b96eb78a2438fd996d936eb67c08c55568df2ab3130d8`.
- `metrics.py` SHA256 `80b77ef4b3eff51cd736bc94c87855887e4433d27407acc456ad042f09b94fa7`.
- `binding-audit.mjs` SHA256 `2c648f0233b3323d36431551b8bbf5622e6e07b29c000b512e40d0b69bcc1719`.

Source/frozen-input diff-check passed before seal. Whole-evidence check originally flags provider trailing spaces in transcript; display normalized only, raw unchanged. Final diff-check/readbacks recorded at delivery. No full worker src rerun; relevant focused/full eval/typecheck/build/lint above actually ran.
