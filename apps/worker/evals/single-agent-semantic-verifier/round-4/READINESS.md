# Round 4 deterministic readiness

Owner authorized one new Checkpoint A round with “thực hiện đi”. Main refreshed: implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Approved spec/plan source `425463d23b92f765f82fb1c5d60cef90c4743930`.

T1 inputs frozen before provider results: four complete synthetic products, 58 A2 cases (46 retained unchanged + 8 unsafe/4 safe), 20 new A3 cases, six evaluator-only references, 11 offline existing Size Engine computations. All product/admin/POS/customer provenance in these fixtures is synthetic evaluation data, not actual shop verification. Models/config/client, bounds, serialization, terminal map, scoring and hashes are in manifest.json.

Actual RED commands before executable changes:

- `node --test apps/worker/evals/single-agent-semantic-verifier/round-4.test.mjs`: exit1, 2 passed/5 failed. Failures: Round4 PROFILE_BOUND/selection, profile+SIZE_FIT projection, missing/current customer size binding (null instead of STALE), captured request projection, naturalness1 incorrectly passed a simple turn. Reproducible offline size claims and changed variant/expiry existing gate already passed.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts`: exit1, 40 passed/3 failed; missing/mismatched customer profile id/revision/measurement fingerprint were accepted instead of STALE.

No provider generation at T1. Production entrypoints unchanged. Existing provider adapter/API reused unchanged; no new generation retry or model role.
