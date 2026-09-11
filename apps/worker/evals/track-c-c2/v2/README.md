# Track C C2 quality benchmark V2

This directory is the canonical Track C C2 quality benchmark. It replaces the previous 50-case C2 quality suite with **100 QUALITY cases**: **70 DEV + 30 exposed HOLDOUT regression cases**. The separate **15 OWNER/SAFETY** cases remain supplemental observations and are not counted as C2 quality cases.

## Ownership

- **C1** remains the authority for hard safety, protected facts, and effect/runtime contracts.
- **C2** owns this corpus, rubric, materialization contract, scoring, evaluation evidence, and aggregate quality gate.
- **C3** owns candidate experiments. The current two-pass candidate is connected through `track-c-c3-two-pass-quality-adapter.ts`; later prompt revisions can use the same C2 corpus without forking it.

The benchmark therefore does not belong to prompt V5/V6/V7. Candidate identity is recorded separately from benchmark identity.

## Execution lanes

All 100 quality cases can run in `BEHAVIOR_SIMULATION`. `PRODUCTION_CONTRACT` uses `contract-reachability.json`; the current effective distribution is **47 supported / 53 blocked by contract**. A simulation pass is not production support.

Production materialization uses real protected-claim schemas and canonical Context V2 construction. Producer/runtime-unreachable states fail closed instead of being fabricated. The current C3 two-pass adapter reuses the existing strategist/responder request builders and exposes no persistence, checkout, payment, delivery, or other effect port.

## Quality evaluation

`rubric.json` defines deterministic scoring thresholds and stage diagnostics. The current V2 execution/scoring harness is intentionally bound to the existing two-pass strategist/responder candidate. A future candidate with a different stage shape may reuse the same C2 corpus, but it must provide a compatible adapter/scoring contract rather than silently being treated as two-pass.

The aggregate C2 gate binds an explicit expected population. Partial populations, relabeled cases, infrastructure failures, unsupported production cases executed as model calls, and unexpected pre-model rejects fail closed.

Provider-backed scores remain inadmissible until the owner-selected judge provider/model/location/config identity is pinned.

## HOLDOUT and reproducibility

The embedded 30-case HOLDOUT is an **exposed regression checkpoint**, not blind evidence. A future blind HOLDOUT must be sealed after candidate/adapter/rubric freeze.

Frozen corpus hashes remain:

- DEV 70: `714d803526d38993b0504997feea01590db1ce3b636c32efb6fc4b92f849d37f`
- HOLDOUT 30: `ef5ca6d4ce14eb0d518610c786601cb3eac1a3de17ef471d25dc6523fa0b43f8`
- OWNER/SAFETY 15: `cded9ca5c536c952894a6acda7d575118fb2149d6840ba48e4be6564aca20a1e`

Run from `apps/worker`:

```bash
pnpm benchmark:c2:validate
```

`pnpm test` runs the C2 validators before Vitest.

## Compatibility bridge

Some implementation symbols still retain the historical `TrackCV5...` names internally so this migration does not rewrite already-reviewed benchmark logic. `track-c-quality-benchmark-v2.ts` is the C2-owned public type/API surface, and `track-c-c3-two-pass-quality-adapter.ts` is the C3-owned candidate adapter. The historical eval path is only a symlink to this canonical C2 directory for existing internal tests; it is not a second corpus or authority.

The historical `track-c-quality-suite*` and `track-c-quality-judge` modules are retained only to keep the existing B3 replay/offline evidence API source-compatible during this migration. Their 50-case suite is legacy comparison evidence and must not be used as C2 V2 benchmark/ship evidence or extended with new C2 cases. C2 V2 corpus validation, scoring and aggregate gate live in this 100-case benchmark surface.
