# Phase C — selection/private checkout implementation, 29/10/2026

Implementation base: `ff0783771ef558c2136aef440e02f4a0a7c18b21`. Approved plan: `a5e6270ae7ac5b3195e6d0da03e6841a7fe41e81`. Executable reviewed/tested source: **`5b35328bb743ab646dbe1c58a2910be779ff24e8`**. Main/C3 reference refreshed in this task remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Architecture + boundary amendment last change: `e5e54c85da5045d0529dd1bbe61c2fde8dd96c8b`; Phase C qualification plan last change: `a851c25816d678a26c6a37035d6808e822184479`.

[Approved fix plan](c3-phase-c-selection-checkout-fix-plan-20261029.md) · [Plan review](c3-phase-c-selection-checkout-plan-review-20261029.md) · [Implementation review](c3-phase-c-selection-checkout-implementation-review-20261029.md) · [Exact commands/artifact hashes](c3-phase-c-selection-checkout-verification-20261029.json). Report/task-only delivery changes do not change executable source identity.

## What changed and why

**F0 producer audit.** `pos-snapshot-core.ts` buildIndex uses `__NO_COLOR__` for missing source color; its stock grouping is SKU/color/size, not an aggregate over all physical colors. Direct rows use existing parent variation/BOM/source identities. No color is inferred from the sentinel. No POS/Redis/Qdrant/Sheets publication or source data correction occurred.

Diagnostic source had AO L unlabelled stock9 and BE L stock0. The actual shop policy permits zero-stock ordering: BE0 can be PRE_ORDER. The implementation must not force NO_COLOR as the only sellable tuple in that world. The positive two-size PG fixture explicitly uses can_order_when_zero=false; it tests independent unlabelled tuples, not an actual-shop inventory/policy decision.

**F1 candidate tuple contract.** Existing resolver accepts a code-owned `selectionMode:CANDIDATE_TUPLES` opt-in. Default legacy selection remains the default. Candidate read/selection/error projections distinguish product/offer/size/color/variant/BOM/source identities and requested quantity. Each option exposes IN_STOCK/PRE_ORDER/OUT_OF_STOCK/UNKNOWN plus source version/times and identity hash. The bounded source scan is64rows; tool presentation is first8exact query tuples, explicitly marked incomplete, never a color×size cross product.

One fulfillable identity can be selected without inventing a physical color; multiple fulfillable tuples require customer choice. Explicit requested colors never fall back to NO_COLOR. Stale/hidden stock, mismatched price/BOM/identity and changed bindings still block. Failure output no longer turns raw availableColors/availableSizes into a suggestion that BE0 is in stock. Existing trusted source retains stock0 and preorder evidence.

Actual PostgreSQL exposed a second cause: per-line product IDs included duplicates when one parent had M and L lines. The strict readiness validator correctly rejected PRODUCT_SCOPE_INVALID. The fix canonicalizes the product-scope set at three callers; it does not relax the validator or merge variant/cart lines. Display omits the source sentinel while preserving each committed size and original state identity.

**F2 private payment intake and progress.** Candidate SINGLE_FIELD intake uses a closed full-segment recognizer for one field/two payment enums. Natural receipt-payment phrasing and existing affirmative COD/CK verb forms persist through CHECKOUT_DETAILS_CAPTURED. Negation/questions/conditions/mixed choices/unsupported residual text cannot infer a method or use candidate model fallback. Known labeled name/phone/address fields stay private. Default legacy matching/model fallback is unchanged; no raw private message is routed to owner/verifier/public history.

Unresolved payment persists as singleton PAYMENT_METHOD clarification. Old COD alone cannot authorize preview/confirmation or appear as a resolved method in public checkout view. Name-only capture, forged resolve/replacement/widening, stale source and replay cannot remove that blocker.

A shared pure helper derives clarification changes from actual captured fields, identically in domain and locked DB replay. No-progress payment disputes/recaptures carry the question count and full fingerprint history, including across product changes. A null→filled required field may reset the no-progress budget; correction, same value and duplicate cannot. Existing cap3 is unchanged.

Two narrow intermediate states close the discovered budget bypasses:
- count0/fingerprints=[] is valid only for exact PAYMENT_METHOD after a proven new required-field capture while payment is still unresolved. It is not a question asked/sent; the next normal REQUESTED starts count1. Preview/confirm remain blocked.
- Complete recapture of a previously present method retains count/history with code-only ORDER_PREVIEW readiness marker. Generic resolve/confirm/replacement cannot clear it. Only a newly validated PREVIEW_CREATED ends this episode; stale/failed preview leaves it unchanged. Intermediate CAS therefore cannot erase the blocker. The marker is never rendered as a field requested from the customer.

These are existing clarification-state refinements; no customer-profile field, generic parser, semantic memory or additional model role was added. Domain/shared guards apply to the corresponding new states; ordinary legacy clarification behavior and the default payment recognizer are covered by regression tests.

## RED → GREEN, failures retained

- Observed catalog RED: the isolated source selection expected READY but returned old INVALID. Minimum candidate opt-in fixed it.
- Observed domain RED: old direct preview was APPLIED after payment ambiguity. Guards reject it.
- Review found contradiction/widening bypasses; both received focused negative coverage before closure.
- Actual PG01 at cb723e9b failed the new test before runtime selection because its synthetic fulfillment policy was null. Fixture was completed at27033e2a; runtime policy was not relaxed.
- Actual PG02/PG03 at27033e2a/98632a17 failed M+L: one cart line persisted; actual tool reason PRODUCT_SCOPE_INVALID. The trace is retained. The synthetic owner/verifier stubs used by this invariant harness are not provider false-PASS evidence.
- Reviewer reproduced NAME attempt2→payment dispute→same COD→NAME attempt1. Observed worker RED and sentinel-display RED preceded the fixes at e46be004.
- Actual PG04 at e46be004 passed both new composed cases, DB dropped,0provider.
- Full PG01 at e46be004:18PASS then existing “code clarification has a committed receipt and accepted capture after owner” FAIL. Existing phrase “Chị trả COD nhé.” was unsupported. The old test was preserved. Two COD/CK affirmative-verb REDs→minimum closed-grammar compatibility fix at5b35328b→110focused PASS. No fixture expectation was weakened.
- Full PG02 at5b35328b: **70/70PASS, clean source, database dropped,0provider**. The existing7named real-adapter invariants passed validation with the repository's unchanged validator.

All failed raw runs and command logs remain outside the repo with SHA-256 references in the verification record. They were not discarded from the evidence or rewritten into PASS. No model attempts/generations were performed in this implementation task.

## Verification and review

At final executable5b35328b: worker/catalog/intake/session/effects/read/ingress/context/public-history/boundary plus protected-claims/reply-assembler: **485PASS/12files**. Worker build/typecheck/lint: **exit0**. Complete worker Node evals: **756PASS/0FAIL/2SKIP (758total)**.

Shared contracts/kernel/chat-runtime/database suite at e46be004: **566PASS/30SKIP,62passed/4skipped files**. Shared sources are byte-identical at5b35328b; all four shared typechecks passed. The skipped cases are retained as SKIP, not claimed as integration verification. Shared builds ran directly and through canonical worker dependency builds. Independent review ran181tests at e46be004 and100 at5b35328b, allPASS. Counts from repeated or overlapping runs are not added to manufacture a larger unique population.

Final full PostgreSQL at5b35328b: **70/70checksPASS,7/7named invariantsPASS**, DB dropped,0provider generations/live send. Clean HEAD was rechecked by the real-adapter validator before writing reports. Final record-only independent audit is pending; code approval is already recorded at5b35328b.

Structural delta from implementation base is recorded by file in JSON. Runtime additions are a20-line closed payment recognizer, candidate tuple projection in the existing resolver, and narrowly shared clarification/readiness guards/helper. Online semantic roles/layers added: **0**; one conversational owner and at most one verifier remain. No advice/verifier prompt rewrite, model/API/config change, tool-generation cap increase, repair/reverify loop, generation retry, production entrypoint wiring, live send, merge or deployment.

## Status and limits

**Implementation: APPROVE. Provider diagnostic/qualification after this fix: NOT_RUN. Phase C remains BLOCKED; B_NOT_GO / A OWNER_BYPASS / C3 NOT_RUN unchanged.** Prior campaign source36e45015 (12PASS/2FAIL/8UNRESOLVED) and diagnostic source6c5023ab (20requests) remain immutable.

Synthetic domain inputs with real PostgreSQL/Outbox capture establish the tested persistence/readiness behavior; they do not establish improved sales quality, naturalness, actual-shop j1 outcome or verifier semantics. Closed payment grammar does not understand every possible utterance; outside it, clarification remains fail-closed. Development exposure mappings/near-duplicate review, fresh source-bound holdout and matched C3 parity are still required by the qualification plan. Stop here; do not automatically open a new model campaign or promotion.
