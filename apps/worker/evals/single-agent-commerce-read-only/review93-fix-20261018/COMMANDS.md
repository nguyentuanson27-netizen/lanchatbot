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
