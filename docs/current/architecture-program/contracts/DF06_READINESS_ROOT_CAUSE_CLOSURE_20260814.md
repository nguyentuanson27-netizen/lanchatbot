# DF06 readiness root-cause closure matrix — 2026-08-14

Status: source-only implementation evidence for DF-P3 in Release Train DF-A. It is not deploy authorization and does not change the BF03/BF04 residuals.

## Invariants

1. `MAX_READINESS_PRODUCT_IDS_V1` equals the canonical `CartV1` line capacity. Readiness does not introduce a second commerce product-count policy.
2. `canonicalizeReadinessProductIdsV1` is the single product-ID normalization and validation choke point. Arbitrary runtime input returns a bounded deterministic envelope; invalid input is data for `BLOCKED`, never an exception.
3. A blocked worker path returns no committable mutation plan. It retains no checkout PII, cart-ready event, preview event, or cart mutation.
4. Every ready cart effect binds the exact final cart SHA-256, exact parent-product set, cart id/revision, required protected claims, and typed deterministic effect evidence.
5. The database recomputes the final cart and effect semantics inside the transaction. Missing, stale, conflicting, mismatched, incomplete, or forged readiness is rejected.
6. Protected multi-product outbound uses one fact-set aggregation boundary. It covers every product scope once, and the final Meta payload SHA-256 is bound to the readiness checked by the transaction.
7. Model evidence alone has authorization `NONE` and cannot authorize cart, order, or protected effects.

## Closure matrix

| Input/boundary | Expected result | Executable evidence |
|---|---|---|
| Product counts 0/1/3/4/10/11/49/50/51 | 0 unresolved; 1–50 schema-safe; 51 bounded to 50 and `BLOCKED` | `canonical-evidence-readiness.test.ts`, `effect-readiness.test.ts` |
| Non-array, non-string, blank, whitespace-normalized, >128-char IDs | Bounded deterministic `BLOCKED`; no throw | `canonical-evidence-readiness.test.ts`, `effect-readiness.test.ts` |
| Duplicate IDs | Canonicalized once and `BLOCKED` as invalid scope | same table/property-style suites |
| Missing/stale/cross-product/conflicting claims | `BLOCKED` with registered deterministic reason | `effect-readiness.test.ts`, database runtime tests |
| Fourth distinct valid product | Allowed when its exact claims and mutation evidence are ready | `realtime-sales-cycle.test.ts` |
| Fifty-line cart plus product 51 | No throw, no mutation plan, cart remains 50 lines | `realtime-sales-cycle.test.ts` |
| Checkout readiness blocked or final facts become stale | No plan, no PII, no `CART_READY`, no preview event | `realtime-sales-cycle.test.ts` |
| Changed offer/quantity/component under the same parent product | Final cart hash mismatch; transaction rejects | `realtime-runtime.test.ts` |
| Cart mutation with missing/forged typed evidence | Transaction rejects | `realtime-runtime.test.ts` |
| `CART_READY`/preview missing required PRICE/STOCK/ETA coverage | Transaction rejects | `realtime-runtime.test.ts` |
| Multi-product fact reply beyond ten text product references | All product scopes are claimed and readiness-bound; no truncation | `bf02-realtime-runner.test.ts`, `bf08-realtime-runner.integration.test.ts` |
| Blocked readiness telemetry | Actual registered reason codes persist instead of `NOT_EVALUATED`/empty reasons | `decision-observability.test.ts`, `realtime-sales-cycle.test.ts` |

Rollback is source rollback of the DF-P3 branch/PR only. No migration, authority cutover, routing change, runtime mutation, or deployment is part of this closure.
