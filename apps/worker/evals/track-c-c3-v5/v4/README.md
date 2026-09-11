# Track C C3 V5 conversation benchmark V4 R2.2

V4 R2.2 keeps the benchmark shape in PR #358: **100 QUALITY cases (70 DEV + 30 exposed HOLDOUT regression cases)** plus **15 OWNER/SAFETY cases** scored separately. It adds executable benchmark-only materialization, two-pass generation, deterministic scoring/evaluation, aggregate quality gates, and owner/safety observation gates without widening the production runtime/effect surface.

## Execution lanes

Every QUALITY case remains available in `BEHAVIOR_SIMULATION`. Simulation may expose registered `simulation_fact_refs` only through the eval-only request overlay; those facts never authorize effects, canonical state changes, persistence, delivery, checkout, or payment behavior.

Production evidence uses `PRODUCTION_CONTRACT`. The authored per-case declaration is preserved as corpus provenance, while `contract-reachability.json` is the effective production classification overlay. The current effective distribution is:

- 100 behavior-simulation cases
- 47 production-contract supported cases
- 53 blocked-by-contract cases

A simulation pass is **not** production support and is **not** a smoke pass.

## Runtime contract materialization

`runtime-materialization.json` pins deterministic compact-fixture -> production-contract projection. The TypeScript materializer in `apps/worker/src/track-c-c3-v5-benchmark-materialization.ts`:

- parses registered protected-claim families into the real claim schemas;
- uses deterministic claim IDs/content hashes and UTC freshness windows;
- binds `SIZE_FIT` evidence to the registered measurement fingerprint;
- rejects an unregistered size-evidence basis instead of defaulting it to measurement authority;
- rejects malformed product/cart scopes instead of inventing product IDs or cart versions;
- constructs canonical Context V2 state for production-supported fixtures;
- rejects producer/runtime-unreachable combinations rather than fabricating state;
- allows explicitly synthetic Context V2 combinations only on `BEHAVIOR_SIMULATION`.

Cart-scoped `SHIPPING_FEE`, `FREESHIP`, and `PROMOTION_OFFER` claims require canonical cart reachability. A BROWSING fixture with a cart-scoped protected claim is therefore blocked from production-contract scoring even when the claim shape is schema-representable.

## Two-pass benchmark runner

`apps/worker/src/track-c-c3-v5-benchmark-runner.ts` is an evaluation-only execution seam around the existing C3 strategist/responder request builders. It does not widen the C1 fixture registry or change live runtime behavior.

The runner:

- validates the frozen capture before the first provider call;
- produces zero provider calls for stale/integrity preflight rejection;
- uses exactly strategist then responder calls for executable cases;
- checks the pinned provider identity;
- maps responder `claimRef` values back to exact frozen provenance content hashes;
- rejects unknown/duplicate/direct provenance references;
- rejects `EFFECT_CLAIM` output;
- on `PRODUCTION_CONTRACT`, runs the existing deterministic business guard segment-by-segment against the exact frozen product claim scope, so protected-looking facts hidden in `GENERAL` receive no authority and are rejected;
- keeps multi-product claims isolated by validating each verified segment against only its own claim/product scope;
- exposes no persistence, outbox, delivery, checkout, payment, or other effect port;
- injects `simulation_fact_refs` only on `BEHAVIOR_SIMULATION` and fails closed if simulation facts are supplied to `PRODUCTION_CONTRACT`.

Current effective production cases do not require cart-scoped protected replies. The V5 production runner therefore fails closed on a cart-scoped verified segment until a future adapter can supply the exact cart-policy guard authorization; it never synthesizes that authority merely to make a benchmark pass.

## Quality scoring, judge boundary, and run identity

`rubric.json` uses integer 0-4 scores with explicit weights, lane thresholds, domain floors, hard-failure override, and separate strategist/responder scoring.

`apps/worker/src/track-c-c3-v5-benchmark-scoring.ts` applies those numeric rules deterministically. Both required stages must pass; a strong responder cannot hide a strategist failure and vice versa. Production factual-grounding floors remain stricter than simulation floors.

`apps/worker/src/track-c-c3-v5-benchmark-evaluator.ts` composes a hash-pinned `TrackCV5StageJudgePort` with the deterministic scorer. Judge input deliberately omits case ID and split, and all dialogue, expectations, candidate text, and authoritative evidence are proven model-safe against the existing DLP/customer-URL policy before the first judge call.

The judge-declared rubric hash must equal the canonical SHA-256 of the exact rubric object used for scoring; a syntactically valid but mismatched hash is rejected before the judge provider is called. Evaluation output records the frozen bundle fingerprint, candidate source revision, candidate request/composition identity, candidate provider version, judge provider/model/location/config identity, rubric hash, and a deterministic run fingerprint.

Provider-backed quality scores are admissible only after an owner-selected judge implementation supplies the pinned provider/model/location/rubric/generation identity. The benchmark adapter itself does not silently choose a judge.

## Aggregate quality gate

`apps/worker/src/track-c-c3-v5-benchmark-gate.ts` applies the registered typed result outcomes without mixing infrastructure reliability into model quality:

- `SCORED` requires a real two-pass candidate result with exactly two generator calls;
- `EXPECTED_PRE_MODEL_REJECT` is valid only for a declared preflight fixture and requires zero generator calls;
- `CONTRACT_SKIP` is valid only where the lane permits it, and a production blocked case must be skipped before any generator call;
- `ADAPTER_ERROR`, `PROVIDER_ERROR`, and `JUDGE_ERROR` fail the quality gate as infrastructure failures but do not become model-quality failures;
- a scored `FAIL` remains a model-quality failure independently of infrastructure counts.

This is the deterministic ship/regression aggregation layer for the per-case scorer/evaluator outputs; it executes no runtime effect.

## Owner/safety and capability probes

`owner-safety-route-map.json` normalizes benchmark route vocabulary to actual ownership/capability observations. `owner-safety-capability-matrix.json` expands capability-capable routes into positive and negative probes so an implementation that always returns HUMAN cannot pass.

The owner/safety observation gate in `track-c-c3-v5-benchmark-gate.ts` checks the exact expected HUMAN/capability outcome and requires zero model provider calls, zero effect attempts, zero persistence mutations, zero outbox writes, no customer effect claim, and no protected effect execution.

Positive authorized-capability probes are **not production evidence** until the matching real capability ports exist. This PR evaluates observed routing safely but does not invent synthetic production capabilities to satisfy the benchmark.

## Holdout policy

The embedded 30-case HOLDOUT was inspected during benchmark authoring/review, so `holdout-policy.json` classifies it as `EXPOSED_REGRESSION_CHECKPOINT`, not blind evidence.

A future blind HOLDOUT must be registered only after candidate prompt, adapter contract, and rubric freeze; its case bodies must remain unavailable to tuning; and execution must bind the exact benchmark bundle, candidate request, and judge identities.

## Identity and reproducibility

R2.2 records two identity layers:

1. **Core benchmark bundle**: corpus hashes + facts/rubric/reachability/materialization/owner-safety artifacts + materializer/runner source.
2. **Quality harness**: the frozen core bundle fingerprint + scoring/evaluator/aggregate-gate source.

Current frozen identities are recorded in `manifest.json`. Validators recompute them from actual file bytes and fail on drift.

Expanded corpus hashes remain:

- DEV 70: `714d803526d38993b0504997feea01590db1ce3b636c32efb6fc4b92f849d37f`
- HOLDOUT 30: `ef5ca6d4ce14eb0d518610c786601cb3eac1a3de17ef471d25dc6523fa0b43f8`
- OWNER/SAFETY 15: `cded9ca5c536c952894a6acda7d575118fb2149d6840ba48e4be6564aca20a1e`

## Validation

From `apps/worker` run:

```bash
pnpm benchmark:v5:validate
```

That command runs both:

```bash
node evals/track-c-c3-v5/v4/validate-benchmark.mjs
node evals/track-c-c3-v5/v4/validate-quality-harness.mjs
```

`pnpm test` also runs the benchmark validators before Vitest. New tests cover production two-pass execution/provenance binding, per-scope multi-product guard behavior, rejection of protected facts hidden in `GENERAL`, fail-closed malformed materialization, stale zero-call preflight, effect-claim rejection, simulation-fact isolation, strategist/responder scoring separation, hard-failure override, production grounding floors, judge/rubric/run identity pinning, judge-input privacy boundaries, typed aggregate outcomes, call-count invariants, and owner/safety capability observations.

The Track C focused CI lane explicitly runs worker typecheck, lint, `benchmark:v5:validate`, the existing focused Track C tests, and the V5 runner/scoring/evaluator/gate regression suites. `scripts/ci/ci-workflow.test.mjs` asserts that these V5 gates remain present.

The core validator checks case count/order, 70/30 split, binding cardinality, claim/fact references, product scope, same-cart coherence, effective contract reachability, deterministic runtime materialization, OWNER/SAFETY route/capability coverage, domain vocabulary, next-step distribution, expanded content hashes, and core bundle fingerprint. The quality-harness validator separately pins scorer/evaluator/gate source to the frozen core bundle.

## Lifecycle use

- **DEV**: repeated tuning/debug regression.
- **EXPOSED HOLDOUT**: stable regression only; never call it blind.
- **BLIND HOLDOUT**: future sealed registration satisfying `holdout-policy.json`.
- **BEHAVIOR_SIMULATION**: desired behavior for capabilities not yet production-representable.
- **PRODUCTION_CONTRACT**: only effectively supported fixtures materialized through real current contracts.
- **SMOKE/INTEGRATION**: select only production-supported scenarios after production-contract quality passes; effects remain disabled unless separately authorized.
- **OWNER/SAFETY**: pre-model ownership/authority/capability observations and zero-effect gate.
- **SHIP/POST-SHIP**: aggregate typed outcomes and compare only compatible bundle/candidate/judge identities for regression/drift.

## Scope boundary

This PR changes benchmark/evaluation infrastructure only. It does **not** change the production V5 prompt, Context V2 contract, protected-claim registry, persistence, Messenger delivery, checkout/payment effects, or deployment behavior.

Remaining operational dependencies are intentionally explicit rather than faked:

- bind `TrackCV5StageJudgePort` to the owner-selected hash-pinned judge before recording provider-backed quality scores;
- connect positive OWNER/SAFETY probes to real authorized capability ports when those capabilities exist;
- create a fresh sealed HOLDOUT before making blind-evaluation claims.
