# Phase C — owner result meaning implementation, 10/11/2026

**IMPLEMENTED / independently APPROVED**, exact source `86acecc40b16486eca686422500cf3d6f30995ed`, base `de6579ec5f3be29ed12271e19bafacd1f7eba0c2`. No new provider run. Previous screen remains STOP; code approval does not establish better conversations.

[Approved scope](c3-phase-c-owner-result-meaning-repair-20261110.md), SHA256 `4729fb560fb0f8eddca7f9d7d0fd61c0ac1e11543ccb554dbd18657c17567a3e`; [review amendment](c3-phase-c-owner-result-meaning-review-amendment-20261110.md), SHA256 `23e336ae515413389f08c743e6f0f6683b4913bff23d0a41a4012484c009bd4a`. Both preserved exactly. [Code R1](evidence/c3-owner-result-meaning-20261110/code-r1.md) REQUEST_CHANGES → fixes → [same reviewer's exact-head R2](evidence/c3-owner-result-meaning-20261110/code-r2.md) APPROVE, zero blocking findings.

## Resulting behavior

- A known uncommitted cart selection failure can distinguish missing customer colour/size needed to buy from a target that can be requested through quote_product before cart creation. Code derives target from exact bound product/offer/selection evidence; quantity must still follow the customer's whole request. It does not copy one attempted line quantity into the order total, combine model proposals, calculate a total, dispatch a quote, mutate cart, or claim a receipt.
- Route discovery does not require a completed exact price read that J1 did not perform. `sourcePriceStatus` distinguishes current exact cached evidence from a required quote read. `calculationStatus=NOT_CALCULATED` always holds for this hint. Policy/source/budget/authority/final gates still execute when quote is actually requested. There is no hint when actual owner declaration cannot call quote.
- A code-only WeakMap binds the original known pre-commit selection result to unchanged state/authority. Cloned/forged results, unknown commits and later state changes cannot reuse it. Scope/permission/privacy/recipient/binding and current source evidence checks remain; REPLACE_LINE uses the new target and current cart line/quantity/binding. No extra I/O or transaction operation.
- Owner-facing `fitEvaluation` groups exact engine target/source/results and the profile revision/fingerprint used **for that call**. Historical calls remain historical; they are not relabeled current. Missing inputs, null versus empty alternatives and legitimate engine alternatives are preserved. Fit engine/chart/selection rules are unchanged.
- Owner-facing `supportEvaluation` groups NOT_EVALUATED/UNKNOWN and missing prerequisites **for that call**, without turning an incomplete evaluation into no-discount policy. Later valid cart/negotiation results remain distinct. Domain statuses, actual concessions and receipts are unchanged.
- Native functionResponses and final completedToolTurns use the same owner projection. Original request inputs/trusted context and signed native model parts are unchanged. Fit domain responses add only code-produced profile revision/fingerprint metadata; the underlying recommendation is unchanged. Verifier context and prompt are not rewritten.

The prompt now describes public offerTypes correctly, removes obsolete SINGLE/COMPARE/DETAILS_ONLY instructions, two-unit quote accounting, quote-owned photo lookup and blanket writer prohibition. Current batch/work details come from the tool declaration. A duplicate size paragraph was consolidated while source/fit/purchase rules remain in the prompt and declaration. Sales objective, voice, policy and handoff rules are preserved; no case examples or customer reply templates added.

Owner prompt is **19,752 bytes**, down from20,077 (325 bytes/1.6% smaller). Exact SHA256 `0d8eaa82d7f0b03a5e409c8a33c977e008ee891f2ddfbbaa2c477870a3439f37`, updated in manifest. Verifier/model/provider/effort/retry/caps unchanged. One owner plus at most one verifier; no online semantic role, parser/router or repair loop added.

## Verification actually run

[Exact commands, outcomes and raw/archive log hashes](evidence/c3-owner-result-meaning-20261110/verification.json):

- Worker commerce/catalog/verifier boundary focused suite: **1114/1114**,37files.
- Node adapter/protocol/schema/presentation/quote tests: **133/133**.
- Existing protected claims/reply assembler: **22/22**.
- Worker canonical build, typecheck and lint: **PASS**. Dataset boundary: **PASS**. Exact implementation diff-check: **PASS**.

Observed meaningful RED: quote-route tests14PASS/2FAIL before implementation; owner presentation/prompt0PASS/3FAIL. Independent review reproduced historical fit mislabeling; after regression assertions,3PASS/5FAIL before the per-call correction, then8/8PASS. Full final suites include these tests. Reviewer independently ran the8 presentation tests and inspected complete final verification logs.

Controls include original-result proof versus clone, state change and typed READBACK uncertainty with unchanged state; stale/wrong-source/permission/privacy/recipient/binding/shop-gap suppression; replacement identity/quantity; real selector/effects/quote output carried into an actual next-owner request with the full prompt below65KB; unchanged native signatures, historical M→L/profile changes, UNKNOWN→evaluated support, null/missing inputs and engine alternatives.

Fixture UUID/capability setup errors and a test TypeScript error were corrected and retained, not counted as semantic RED. A lost-reply fixture reconciled correctly; an explicit READBACK-unknown fixture was needed to exercise uncertainty. A partial coordinator lacked its mandatory accounting port; the test was corrected to check real wrapper output into the next request rather than weakening the production accounting guard. Evidence records distinguish raw command bytes from normalized display logs.

## Remaining limits

No new PostgreSQL/model acceptance in this change: transaction execution, CAS/receipts/storage and fit arithmetic did not change. The new proof is request-local/no-I/O, covered by real domain fixtures and authority negatives; prior PG14 evidence remains attached to its original source, not reattributed to this commit. No shop source writes, merge/deploy/live send.

J1/J4/P07 model task improvement is **NOT_VERIFIED**. S16 still lacks customer-wearing provenance; previous13/27 results remain STOP. A next model run needs fresh frozen/reviewed inputs and a preregistered targeted/control population. Do not open full, force tool choice, lower verifier safeguards, add per-case examples or rerun until a lucky PASS.
