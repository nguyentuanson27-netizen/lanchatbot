# Verification before the single24-case batch

All commands below were actually executed from the repository root. Logs are retained in the task's local TEMP folder; no credentials were printed. No shared package/schema was changed.

| Command | Observed result |
| --- | --- |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts` before initial offer fix |22tests:20PASS/2FAIL, observed RED |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` before initial projection fix |16tests:14PASS/2FAIL, observed RED |
| Focused tools/adapter suites after minimum fixes |39worker and25adapter/protocolPASS; then separate size-filter and canonical-property-order regressions each observed RED before GREEN |
| `pnpm --filter @lana/worker test` |Exit1: dependency builds and benchmark validators passed;1,736src tests passed but3historical suites failed ENOENT because a tracked symlink was checked out as a Windows text placeholder. Eval phase was not reached. This command is not claimed PASS. |
| `pnpm --filter @lana/worker exec vitest run src` with the exact historical symlink represented by a temporary Windows junction |130files/1,759testsPASS. Verified junction target stayed in repo; removed only junction and restored exact tracked placeholder bytes afterward. No source/fixture content change. |
| `pnpm --filter @lana/worker test:evals` |482tests:480PASS/2optionalSKIP/0FAIL |
| `pnpm --filter @lana/worker typecheck` |Exit0, including dependency builds |
| `pnpm --filter @lana/worker build` |Exit0, including dependency builds |
| `pnpm --filter @lana/worker lint` |Exit0 |
| Tools test before review correction |25tests:24PASS/1FAIL, observed RED: unresolved product incorrectly produced verified empty offers |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/realtime-protected-claim-boundary.test.ts src/realtime-reply-assembler.test.ts` |75PASS after correction. Last two supplied paths do not exist and were not selected; use the actual protected/reply commands below for that coverage. |
| `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` and `pnpm --filter @lana/worker exec tsc -p tsconfig.json` after correction |Both exit0 |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` |21/21PASS |
| `pnpm --filter @lana/worker exec vitest run src/track-b-protected-claim-boundary.test.ts` |17/17PASS |
| Independent reviewer focused tests |53worker +26adapter/protocolPASS before correction;25toolsPASS and finding closed after correction |
| `git diff --check` |PASS before savepoints |

The complete src/eval suites were executed before the final narrow status correction; affected75worker +17boundary +21protected/reply tests and compiler/build were executed afterward. The provider runner also performs the canonical worker build from the sealed source before each source check/run. No claim that the failed aggregate command passed, or that skipped optional tests ran. State/effect tests prove those changed projection contracts deterministically; no additional stateful provider batch is included.

Checked current official [Google function-calling documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling) before changing provider request projection: preserve native opaque parts/signatures and function-call association; use clear parameter descriptions/enums; NONE disables calls. No provider API/model/generation-config substitution. Prompt size changed10,504→9,982owner bytes; verifier is10,875bytes. No new semantic role, storage, gate, parser or framework.
