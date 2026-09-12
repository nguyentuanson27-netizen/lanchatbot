# Track C C2 quality benchmark V2

This directory is the canonical Track C C2 quality benchmark. It replaces the previous 50-case C2 quality suite with **100 QUALITY cases**: **70 DEV + 30 exposed HOLDOUT regression cases**. The separate **15 OWNER/SAFETY** cases remain supplemental observations and are not counted as C2 quality cases.

## Ownership

- **C1** remains the authority for hard safety, protected facts, and effect/runtime contracts.
- **C2** owns this corpus, rubric, materialization contract, scoring, evaluation evidence, and aggregate quality gate.
- **C3** owns candidate experiments. The current two-pass candidate is connected through `track-c-c3-two-pass-quality-adapter.ts`; later prompt revisions can use the same C2 corpus without forking it.

The benchmark therefore does not belong to prompt V5/V6/V7. Candidate identity is recorded separately from benchmark identity.

### Benchmark revision R2.5

`benchmark_revision` is **R2.5**. Relative to R2.4, the C2-owned execution seam distinguishes a catalog size label carried by integrity-valid product-presentation evidence from an unbound fit recommendation. The catalog-aware guard mode is scoped only to that exact presentation hash; every other segment remains reject-only. Corpus, splits, rubric, scoring weights and the aggregate gate are unchanged.

Any change to a pinned bundle component changes the bundle fingerprint, so it must land with a revision bump rather than being repinned under the existing revision: evidence that cites `TRACK_C_C2_QUALITY_BENCHMARK_V2` plus a revision must always denote one bundle fingerprint.

## Execution lanes

All 100 quality cases can run in `BEHAVIOR_SIMULATION`. `PRODUCTION_CONTRACT` uses `contract-reachability.json`; the current effective distribution is **47 supported / 53 blocked by contract**. A simulation pass is not production support.

Production materialization uses real protected-claim schemas and canonical Context V2 construction. Producer/runtime-unreachable states fail closed instead of being fabricated. The current C3 two-pass adapter reuses the existing strategist/responder request builders and exposes no persistence, checkout, payment, delivery, or other effect port.

## Supplemental conversation journeys

`journeys.json` contains six small authored multi-turn scenarios used to review conversation progression. They are **supplemental**: `quality_population_delta` is zero, so they do not change the frozen 100 QUALITY population, 70/30 split, rubric, scoring weights, or aggregate quality gate.

They are also **manual review corpus, not regression evidence**: `evidence_class` is `MANUAL_REVIEW_ONLY`. No executable evaluator consumes `expected.required_behaviors`, `expected.forbidden_behaviors`, or `expected.next_move` yet, so a passing journey run proves only that the turns execute and stay inside the eval-only boundary - never that the replies satisfy the authored expectations. Scoring and evaluation are C2-owned: if these expectations are later meant to gate CI, they need a C2 per-turn evaluator, and the evidence class changes with it. `journey-contract.mjs` holds the authored contract and `validate-journeys.mjs` runs it over the bundle: evidence scope against `product_binding` (an empty binding admits no product-scoped evidence), buying intent mirroring `AgentBuyingIntentV1Schema`, next-move shape against the corpus action vocabulary, and canonical-state agreement. `track-c-c2-journey-contract.test.ts` exercises the same module with negative fixtures, so malformed authored state fails before any model runs.

Each journey turn owns its customer message, canonical/context state, required/forbidden behavior, and expected next move. C3's thin journey adapter materializes that authored state independently for every turn and only accumulates real dialogue; the actual Lana reply from one turn becomes history for the next turn. The adapter does not infer a sales state machine or mutate canonical state.

Accumulated dialogue stays inside the shared Track C offline-candidate bound of 15 messages, which is exactly the longest supported journey (8 customer turns plus the 7 replies between them). That dialogue is PII-guarded, so the adapter appends each reply in its redacted form; the unredacted reply stays on the turn result.

Trusted acquisition metadata and checkout completeness in these fixtures are simulation/eval wiring only. `benchmarkSimulationMetadata` is a closed union of those two kinds: the benchmark runner rejects any other shape at the sink, so only validated fixture-authored signal reaches the prompt. `origin` / `first_meaningful_inbound` are never inferred from dialogue and grant no fact/effect authority. Checkout completeness carries only `REQUIRED`/`COMPLETE` plus missing-field names, not recipient PII. The production `GAP_AD_ORIGIN` and `GAP_CHECKOUT_COMPLETENESS` remain open until production runtime contracts provide equivalent authoritative signals; Q100 remains regression evidence rather than production-closure evidence.

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
