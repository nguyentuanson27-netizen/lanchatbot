# Track C C3 V5 conversation benchmark V4 R2

V4 R2 replaces the V3 benchmark files in PR #358 while keeping the same high-level shape: **100 QUALITY cases (70 DEV + 30 HOLDOUT)** plus **15 OWNER/SAFETY** cases scored separately.

## Why V4 uses two execution lanes

The current candidate input exposes protected claim families for `PRICE`, `STOCK`, `SIZE_FIT`, `ETA`, `SHIPPING_FEE`, `FREESHIP`, `PROMOTION_OFFER`, and `PRODUCT_MEDIA`. Important Lana scenarios such as material/design, human-readable variants, exchange/payment/store policy, retail/combo semantics, channel pricing and fulfillment stage are not all available in the production candidate egress yet.

Each quality case therefore declares:

- `BEHAVIOR_SIMULATION`: may use synthetic eval-only `simulation_fact_refs` to test desired non-effect conversational behavior.
- `PRODUCTION_CONTRACT: SUPPORTED`: executable using only data the current production candidate contract can represent.
- `PRODUCTION_CONTRACT: BLOCKED_BY_CONTRACT`: valuable behavior case, but excluded from production-contract scores until every listed gap is closed.

Simulation facts never authorize order/payment/message effects and never override canonical state.

## R2 repair

The earlier V4 R1 checkpoint was proxy-run and inspected, so it is retired as a holdout. R2 keeps the schema, 10 quality chunks and 70/30 split, but replaces the HOLDOUT checkpoint content. No model/provider output is claimed for R2 HOLDOUT.

R2 also repairs product-history contamination found during fixture review: blocked product-specific cases now use dialogue consistent with their resolved binding. A static scope check guards against future dialogue/binding drift, with explicit exceptions only for the two referent-correction scenarios that intentionally mention an earlier product.

Q100 remains an exposed DEV regression for `GAP_CHECKOUT_COMPLETENESS`: the dialogue says delivery details are already known, while the current canonical candidate contract cannot represent that completeness strongly enough to prevent a duplicate checkout-details request. This is intentionally **not** changed into a passing prompt fixture.

## Suite layout

- 100 QUALITY cases: 70 DEV + 30 HOLDOUT R2
- 60/100 `PRODUCTION_CONTRACT: SUPPORTED`
- 40/100 `BLOCKED_BY_CONTRACT`
- 15 OWNER/SAFETY cases scored separately
- no golden/reference reply

Expanded content hashes:

- DEV 70: `dcb1578e80079bc31121ad4f0d296f3ebdc9c39b9bd2e4e5edcbe9b8e82b40d2`
- HOLDOUT R2 30: `a8a1feb0638b8b37c3e27d898b5798550b5172050ad04cda5cd268bf446ccb86`
- OWNER/SAFETY 15: `cded9ca5c536c952894a6acda7d575118fb2149d6840ba48e4be6564aca20a1e`

## Adapter contract

For behavior simulation, resolve `simulation_fact_refs` only into an evaluation-only evidence section. For production-contract evaluation, materialize `runtime_claim_refs` through the real Context V2 claim/provenance path and run the real two-pass candidate + validator with effects disabled. `BLOCKED_BY_CONTRACT` cases must be skipped in production-contract scoring rather than approximated.

## Scoring priorities

Correctness/canonical precedence → factual grounding → context use → useful next move → Lana naturalness → concision. Hard-fail invented protected/business facts, unauthorized effect claims, stale protected-claim use, canonical-precedence violations, and instruction-like dialogue that overrides authority.

## Scope boundary

This PR is benchmark/spec work only. It does not change the V5 prompt, Context V2 production contract, claim registry, persistence, Messenger delivery, checkout effects, payment effects, or deployment behavior.
