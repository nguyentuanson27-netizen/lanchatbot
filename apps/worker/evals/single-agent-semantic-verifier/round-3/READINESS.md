# Round3 deterministic readiness evidence

No provider request preceded this freeze or RED observation.

| Actually executed command (repository root) | Observed result |
|---|---|
| `node --test apps/worker/evals/single-agent-semantic-verifier/round-3.test.mjs` | RED: 1/6 PASS, 5 FAIL; missing profile projection/bounds, consultation bar and Round3 selector |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts` | RED: 32/39 PASS, 7 FAIL; ignored profile subject/source/hash/freshness/authority/bounds and protected refs |

The prior 30 boundary tests stayed green. Subsequent GREEN results will be recorded after minimum implementation. This document records actual verification; it is not another runtime gate.
