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
15. State-advancing sales events (`APPLIED | HANDOFF`) form one contiguous stage/revision chain from the locked state to the proposed state. One shared predicate defines that outcome set for the writer and database. `SALES_STAGE_TRANSITIONS_V1` exhaustively binds every persisted `(stageBefore, commandKind, outcome, stageAfter)` tuple and is consumed by both the reducer and database; event labels do not authorize an arbitrary final `stage`, checkout draft, clarification, preview, confirmation, or negotiation snapshot.
16. A versioned DF06 commit locks and validates the complete top-level sales-state envelope. `schemaVersion`, `conversationKey`, `routing`, `processedCommandIds`, `revision`, `stage`, and `updatedAt` are derived from the locked state plus the contiguous applied-event chain; caller-controlled replacements are rejected.
17. Readiness lifetime remains deliberately bounded to 60 seconds. Sales and protected Meta readiness use the same temporal classifier for interval, lifetime, future-skew, and transaction-time staleness. The database permits at most five minutes of future clock skew for cross-host artifacts, but it never extends an artifact's declared expiry and always re-evaluates authorization against transaction time.
18. A deterministic buying hint may guide the first Wave 2 reply strategy or error fallback before canonical evidence exists. It has no side-effect authority; cart, order, handoff, and protected effects consume only the canonical buying-intent/readiness boundary.
19. Final protected commerce readiness is one fail-closed gate over the complete output tuple. `BLOCKED` removes outbound messages and claims, the sales mutation plan, checkout PII, and the requested commerce tag before commit planning.
20. `CART_TTL_MS_V1` is the shared cart/sales-cycle TTL semantics used by the contract, reducer, worker, and database. `cart.value`, `cart.expiresAt`, `plan.cartExpiresAt`, and the persisted `cart_expires_at` must describe the same locked transition; non-open commands preserve the prior expiry exactly.
21. Database validation uses exhaustive command dispatch, not a second copy of the runtime state machine. Commands with sufficient bound evidence are replayed through shared pure kernels. Every other command has a named branch and must preserve every protected field it does not own.
22. `CLARIFICATION_REQUESTED` and `CLARIFICATION_RESOLVED` carry `ClarificationTransitionEvidenceV1`, bind the current message/command/before/after state, and replay through the same pure kernel in the writer and database. Legacy missing `clarification` is canonical `null`.
23. The complete top-level key inventory is fail-closed for versioned DF06 state. An undeclared field cannot be persisted merely because existing validators do not know its semantics.

Clarification is not side-effect authority. Its typed receipt licenses only the clarification field; it cannot rewrite cart, checkout, preview, confirmation, negotiation, or another protected artifact.

Legacy missing `clarification` remains canonical `null`. A legacy row with a present but non-canonical clarification object fails closed; this source change does not coerce or migrate such a row. Any future activation must inventory compatibility before deploy rather than silently discard an active clarification.

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
| Proposed sales stage/revision is continuous but its `(stageBefore, commandKind, outcome, stageAfter)` tuple is not a reducer-authorized transition | Shared exhaustive contract rejects it and the transaction rolls back with `SALES_STAGE_EVENT_CHAIN_MISMATCH` | contract Cartesian matrix, reducer tests, and database runtime tests |
| Each legitimate `APPLIED` command kind | Its declared protected transition either replays exactly or preserves fields it does not own, and a real `store.commit` resolves | table-driven positive database transaction matrix |
| Legitimate state-changing `HANDOFF` for confirmation revalidation or payment-receipt review | Writer retains the canonical state-only plan; database derives revision/stage/idempotency state and commits it without inventing effect readiness | worker and positive database `store.commit` tests |
| `HANDOFF` or `APPLIED` changes a protected field not owned by that command | Exhaustive dispatch rejects the proposed transition; no state commits | database command/outcome matrix tests |
| Clarification state is absent in a legacy row, requested, retried, forged, or resolved | Missing is canonical `null`; request/resolve replays exact evidence; a forged state or missing receipt is rejected | contract, shared-kernel, worker, and positive/negative database commit tests |
| Locked `cart_expires_at` column differs from the locked encrypted cart expiry, or a non-open command changes both state and plan expiry | Transaction rejects `CART_EXPIRY_BINDING_MISMATCH`; it does not auto-heal or migrate the row | database transaction tests |
| `CART_OPENED` follows persisted checkout/preview residue | Canonical open replay resets checkout/preview rather than carrying stale PII/artifacts into the new cart | positive database transaction test |
| Sales or protected Meta readiness declares a lifetime longer than 60 seconds | Shared temporal classification rejects it even when checked/expiry timestamps are otherwise fresh; existing sales/Meta error surfaces are preserved | contract boundary table and database transaction tests |
| Proposed versioned state adds an undeclared top-level field | Transaction rejects `SALES_STATE_KEY_INVALID` | database envelope test |
| Caller replaces top-level conversation identity, routing, processed-command ledger, schema version, revision, stage, or update time | DB derives the exact envelope from locked state plus applied events and rejects `SALES_STATE_ENVELOPE_REPLAY_MISMATCH` | database runtime table tests |
| Worker/POS timestamp is slightly ahead of DB transaction time | At most five minutes future skew is accepted; declared expiry remains exact and stale artifacts are rejected | database boundary tests |
| Commerce Meta changes cart, offer, preview, claim set, or sales parent | Transaction rejects `PROTECTED_OUTBOUND_SALES_READINESS_MISMATCH` | worker and database tests |
| Final protected commerce readiness changes to `BLOCKED` after sales evaluation | Complete commerce tuple is discarded; no outbound, mutation plan, checkout PII, or commerce tag reaches commit planning | worker final-gate tests |
| Protected text references 51 valid products | No cart-capacity reason is introduced; the independent technical envelope applies | business-tools tests |
| Blocked readiness telemetry | Registered readiness reason codes persist instead of `NOT_EVALUATED`/empty reasons | observability and sales-cycle tests |

`lockCurrentInboxBatch` intentionally maps a missing row or lost processing lease to `SUPERSEDED`. This is the stale-writer containment result, replacing the earlier `INBOX_BATCH_SOURCE_BINDING_INVALID` label; it does not authorize a send or state commit.

Rollback is source rollback of the DF-P3 branch/PR plus the reversible `0033` migration source. The migration is not executed here. No authority cutover, routing change, runtime mutation, or deployment is part of this closure.
