# DF06 readiness root-cause closure matrix — 2026-08-14

Status: source-only implementation evidence for DF-P3 in Release Train DF-A. It is not deploy authorization and does not change the BF03/BF04 residuals.

## Invariants

1. Within the DF06 commerce authority/readiness path, `canonicalizeProductIdsV1` is the only untyped product-ID transform. It trims and converts to NFC once. Typed schemas accept exact canonical values and never silently transform authority scope.
2. `MAX_CART_LINES_V1 = 50` is only a cart-capacity policy. The protected-text/effect envelope has a separate technical bound and never reuses cart capacity.
3. Every side-effect authority and readiness binds the current `sourceMessageIdHash`. A stale or different message is rejected inside the transaction.
4. `CartMutationBatchEvidenceV1` defines an atomic N-mutation batch. Every receipt binds its exact action, product, offer, source message, before cart, and after cart; receipts form one contiguous chain and only the final receipt equals the final cart.
5. `CanonicalCartStateV1` defines the complete cart hash preimage. The database locks the prior encrypted cart, replays the canonical transition under the bound policy, and compares the complete replayed cart to the proposed final cart.
6. Readiness is layered: `CART_READY` → `PREVIEW_READY` → `PURCHASE_CONFIRMATION_READY`. Every child binds the exact parent readiness and prior artifact.
7. Commerce Meta output binds its exact claim set and final payload, plus the exact sales parent, cart, offer set, and preview. The outbound claim set may be a semantically validated subset/superset for the rendered text; Meta readiness cannot independently authorize commerce output.
8. A blocked worker path returns no committable mutation plan and retains no checkout PII, cart-ready event, preview event, or cart mutation.
9. Model evidence has authorization `NONE` and cannot authorize cart, order, or protected effects.
10. `CART_OPENED` carries `CartOpenEvidenceV1`: the current buying intent, one exact seed line, cart draft, policy reference, and immutable `SALES_EPISODE` policy pin are bound together. The database reads the pin and independently creates the complete cart and initial negotiation state.
11. `NEGOTIATION_EVENT` carries `NegotiationTransitionEvidenceV1`. The database derives the next tier from the locked negotiation ledger and exact current-message event; caller-supplied `cartReplayContext.customerState` is only a claim to compare, never authority.
12. Artifact timestamps preserve the worker decision preimage, while policy and POS freshness authorization use the database `clock_timestamp()` captured inside the commit transaction.
13. Every applied cart mutation and `CART_READY` transition also replays the locked negotiation ledger through the same pure reprice transition used by the worker. A caller cannot change the concession tier, quote, processed-event chain, or objection ledger independently of the cart transition.
14. `CHECKOUT_DETAILS_CAPTURED` carries `CheckoutDetailsTransitionEvidenceV1`, binding the current message, command, exact raw patch, prior draft, resulting draft, and apply time. The database replays checkout normalization, preview validation, and purchase-confirmation derivation from locked state with the same shared transition kernel.
15. Applied sales events form one contiguous stage/revision chain from the locked state to the proposed state. Event labels do not authorize an arbitrary final `stage`, checkout draft, preview, confirmation, or negotiation snapshot.

The current worker emits one receipt per message. The contract and database verifier support an atomic N-receipt batch only when every receipt independently carries approved authority and the complete chain replays to the exact final cart.

The canonical cart reducer and shop-policy evaluator live in the lower-level `@lana/commerce-kernel`. Both the worker-side business facade and database transaction verifier consume that single implementation; the database does not reverse-depend on `@lana/business-tools`.

## Closure matrix

| Input or boundary | Required result | Executable evidence |
|---|---|---|
| Product counts 0/1/3/4/49/50/51 | Generic ingress remains bounded and deterministic; cart effects permit at most 50; 51 is `BLOCKED`; protected text does not inherit the cart limit | contract and business-tools table tests |
| Non-array, non-string, blank, whitespace-changed, non-NFC, or overlength IDs | One canonicalization attempt, then deterministic `BLOCKED`; no throw | canonical identifier and readiness property-style tests |
| Duplicate/conflicting IDs | Deterministically canonicalized once and `BLOCKED` as invalid scope | readiness property-style tests |
| Current message differs from authority/readiness source | Transaction rejects `CURRENT_MESSAGE_BINDING_MISMATCH` | database runtime tests |
| Fourth valid product | Allowed when its exact claims and mutation evidence are ready | sales-cycle tests |
| Fifty-line cart plus product 51 | No throw, no mutation plan, cart remains unchanged | sales-cycle tests |
| Blocked checkout or facts become stale after local evaluation | No plan, PII, `CART_READY`, preview, or cart mutation survives | sales-cycle tests |
| Atomic N mutation batch | Receipts connect prior after-hash to next before-hash; wrong order, gap, duplicate command, wrong final hash, action, product, or offer is rejected | commerce binding contract and database replay tests |
| Full cart field changes under an unchanged line/product set | Complete canonical cart hash/replay mismatch; transaction rejects | canonical cart and database replay tests |
| Cart mutation or `CART_READY` carries a forged negotiation tier, quote, or ledger | DB replays negotiation from the locked state and rejects the complete state mismatch | shared transition-kernel and database transaction tests |
| New cart changes a timestamp/status/total while resealing its self-declared hash | DB recreates the cart from the one-line draft plus pinned policy and rejects `CART_OPEN_FULL_REPLAY_MISMATCH` | cart-open contract, worker, and database transaction tests |
| Cart-open policy is valid at artifact time but expired at DB transaction time | Canonical replay is blocked using the transaction authorization clock; no state commits | commerce-kernel and database transaction tests |
| Caller submits one price objection but claims `CAUTIOUS` directly | DB derives `HESITANT` from the locked `READY` ledger and rejects the forged transition | negotiation contract, worker, and database transaction tests |
| Cart-open or negotiation evidence uses a different message/command/evidence hash | Transaction rejects the typed transition evidence before state commit | contract and database transaction tests |
| Missing, stale, conflicting, cross-product, wrong-offer, wrong-price, or insufficient-stock claims | `BLOCKED` before worker mutation or transaction rejection | business-tools and database tests |
| `CART_READY` with incomplete claim coverage | Transaction rejects `EFFECT_READINESS_CLAIM_MISSING` | database runtime tests |
| Preview or confirmation with missing/wrong parent artifact | Transaction rejects parent/cart/preview binding mismatch | readiness and database tests |
| Checkout patch, preview recipient/payment, or confirmation identity is forged while its self-declared hash is resealed | DB replays the exact checkout/preview/confirmation transition from locked state and rejects the artifact mismatch | shared transition-kernel and database transaction tests |
| Proposed sales stage/revision does not equal the contiguous applied-event chain | Transaction rejects `SALES_STAGE_EVENT_CHAIN_MISMATCH` | database runtime tests |
| Commerce Meta changes cart, offer, preview, claim set, or sales parent | Transaction rejects `PROTECTED_OUTBOUND_SALES_READINESS_MISMATCH` | worker and database tests |
| Protected text references 51 valid products | No cart-capacity reason is introduced; the independent technical envelope applies | business-tools tests |
| Blocked readiness telemetry | Registered readiness reason codes persist instead of `NOT_EVALUATED`/empty reasons | observability and sales-cycle tests |

Rollback is source rollback of the DF-P3 branch/PR plus the reversible `0033` migration source. The migration is not executed here. No authority cutover, routing change, runtime mutation, or deployment is part of this closure.
