# Actual commands — review93 fix

CWD: repository root on PR391 branch. Logs and launcher under C:/Users/nguye/AppData/Local/Temp. No credentials printed or committed.

```powershell
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts-v2.test.ts src/size-engine.test.ts
pnpm --filter @lana/worker test
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-review93-source-20261018
node C:/Users/nguye/AppData/Local/Temp/c3-review93-freeze.mjs
```

RED/intermediate failures and final results in IMPLEMENTATION.md. Last focused45PASS; full worker1844Vitest/499NodePASS+2optionalSKIP. Typecheck/build/lint exit0; source readback exit0/0generations; freeze exit0. Runtime source seal and provider/preflight commands will be appended after execution, never claimed in advance.

## Completed remaining commands and evidence

```powershell
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-review93-cod-controls-20261018 COD
node C:/Users/nguye/AppData/Local/Temp/c3-review93-prompt-self-review.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-freeze-candidate.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-review93-diagnostic.py
python C:/Users/nguye/AppData/Local/Temp/c3-review93-candidate.py
python C:/Users/nguye/AppData/Local/Temp/c3-review93-resume.py
node C:/Users/nguye/AppData/Local/Temp/c3-review93-collect-diagnostic.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-primary.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-audit.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-collect-candidate.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-candidate-primary.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-audit-candidate.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-diagnose.mjs
```

Focused worker168PASS; controls25PASS/0generations/DBdropped, exit0. Prompt self-review/freeze exit0. Diagnostic dispatcher exit0/8outcomes. Candidate initial dispatcher exit1 after11processes:10completed,1login pre-registration failure with0requests. Explicit undispatched continuation exit0/17processes; candidate total45outcomes retained. Collect/primary/audit/diagnosis helpers exit0; these are offline operations, not generations. Helpers' invocation order above is grouped by purpose, not an alternate evidence chronology; raw/primary commits are recorded in CHECKPOINT_B.md.

Existing config preflight: run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --preflight; stateful preflight: isolated-integration.mjs --provider-preflight. Both observed before diagnostic and before candidate,0generations, exit0; raw output files retained. Exact provider process argv and exitCode for every dispatch follow; these include the failed setup and undispatched continuation. No generation retries.

Exact argv/exit codes are retained once in [diagnostic dispatches](diagnostic-commands.json), [initial candidate dispatches](candidate-commands.json), and [explicit undispatched continuation](candidate-resume-commands.json). These machine-readable arrays are the authoritative per-process command record.

Final offline reporting checks actually run:

```powershell
node C:/Users/nguye/AppData/Local/Temp/c3-review93-final-check.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-review93-scan.mjs
git diff --check
```

Final check exit0:189evidence files,145JSON/323JSONL records parsed,14local report links,168raw disk hashes,163identical Git blobs plus5CRLF-normalized metadata files,21frozen executable/config inputs matching disk and sealed source; primary unchanged,0secret-pattern hits. Modified/untracked scan8files/0hits; diff check exit0. The first offline final-check invocation used an incorrect root for runtime filenames and failed ENOENT; correcting the helper to apps/worker/src resolved it. No source/evidence content or provider attempt changed to satisfy the check. This is an evidence integrity check, not additional runtime testing.
