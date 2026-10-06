# Round3 deterministic readiness evidence

No provider request preceded this freeze or RED observation.

| Actually executed command (repository root) | Observed result |
|---|---|
| `node --test apps/worker/evals/single-agent-semantic-verifier/round-3.test.mjs` | RED: 1/6 PASS, 5 FAIL; missing profile projection/bounds, consultation bar and Round3 selector |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts` | RED: 32/39 PASS, 7 FAIL; ignored profile subject/source/hash/freshness/authority/bounds and protected refs |

The prior 30 boundary tests stayed green. Subsequent GREEN results will be recorded after minimum implementation. This document records actual verification; it is not another runtime gate.

| Actually executed command | Final observed result |
|---|---|
| `$env:C3_CHECKPOINT_A_ROUND='3'; node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | GREEN:39 PASS,0 FAIL,1 optional installed-login test skipped |
| `$env:C3_TEST_CODEX_TRANSPORT='1'; node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` | GREEN:11/11, including existing installed login against local stub; zero real provider generations |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | GREEN:73/73 (39 boundary +34 existing Vertex) |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | GREEN:21/21 |
| `pnpm --filter @lana/worker typecheck` | PASS, exit0 |
| `pnpm --filter @lana/worker build` | PASS, exit0 |
| `pnpm --filter @lana/worker lint` | PASS, exit0 (project script uses TypeScript noEmit) |
| `git diff --check` | PASS, exit0 |

Intermediate implementation failures are retained here: an attempted Zod import was unavailable in worker, so boundary collection and first worker build failed. Removed that import and reused bounded structural checks without adding dependencies or changing shared packages. An early Node run saw the old compiled boundary from that failed build; reran after the successful build. A Round3 validation unit check initially read the profile file through the ambient Round1 selector, fixed to the explicit frozen Round3 file. The historical retained-A2 CLI regression inherited the Round3 environment and looked for not-yet-produced Round3 evidence; pinned that historical test to its owning Round1. Final commands above passed after these corrections, before any provider generation.

Self-review: only isolated evaluation seam imports changed; no production entrypoint references it. Four optional bounded profile records reuse existing snapshot binding/precheck/finalGate; strict structure/source/subject/hash/freshness checks own this new supplied-data boundary. Added0 online roles,0 provider frameworks,0 semantic parsers,0 repair loops,0 tools/effects/state writes. Provider adapter/API unchanged. All authored customer data are synthetic; source/evidence must exclude secrets.
