# Phase C — opening checkout media implementation

Owner requested fixing first-contact checkout while deferring conflicting component colours. Implementation base: `84b3989e1977972ef0a30ab55fa7a5872662bd46`; runtime implementation: `603c391b7e348b3b9b61d631c4ac15f0ec34bcda`; final clean test/run source: `dd88d38396c15c82ef315e8352c4494a29d7ba9b`. Follow-up executable changes after603 are test fixtures/diagnostics only; worker runtime and shared-package bytes are unchanged. [Approved plan](c3-phase-c-opening-checkout-media-plan-20261102.md).

## Resulting behavior

Opening add→confirm and existing-cart confirm can commit the existing native clarification plus approved product photos in one atomic response group. Missing customer fields are requested through the existing checkout flow. Private partial details and complete-details preview use code-owned output with zero owner/verifier generations; no private customer text is supplied to either model. Actual purchase-confirmed transfer remains silent. Returning checkout retains its existing behavior.

The persisted session has one optional terminal-media callback. A narrow code-owned helper prepares exact planned-cart product/component photos, using current composed tools for public checkout and bounded exact-cart reads for private checkout. Public work debits the existing turn's remaining six primitive units before I/O, with no fresh allowance. Four-image/six-message caps remain. Private-only execution reports actual preparation units.

Before transaction dispatch, code rechecks authority, policy and exact planned-cart selection sources, including complete canonical variant/offer identity and original native query/result pairs. The full native-text-plus-image payload receives protected-outbound readiness and a durable media binding before commit. Source/authority failures before dispatch cannot become false COMMIT_UNKNOWN; actual post-dispatch unknown/readback handling is retained. Outbox gates the entire group before sequence0, including restart and media revocation. Failed preparation creates no partial text or checkout advancement; earlier valid committed effects are preserved.

Offline code-owned capture requires the versioned witness, actual execution identity, accepted scoped Outbox membership, ordered payload hashes, durable media-binding hash and native receipts/revision. Clarification still proves the exact missing-field output; preview still proves native preview/cart identity. Model-written FINAL cannot use this exception. Historical no-image captures remain compatible.

## Review fixes

- R1: replaced product-only source comparison with exact canonical variant/offer identity and replay of original native selection queries/results. Same-product distinct variants have positive and stock-change/expiry negative controls.
- R2: typed pre-dispatch SOURCE/AUTHORITY failure attribution, full readiness before commit, and an explicit beforeDispatch boundary preserve true unknown-commit recovery.
- R3: durable Outbox proof and actual inbound execution identity bind clarification/preview capture; altered binding hashes fail closed.
- Reviewer retracted an accounting concern after confirming private-failure work counters were already present; five focused accounting controls PASS.

## Observed verification

RED was observed before implementation: two opening public/private checkout controls failed. Focused GREEN, capture RED→GREEN and intermediate failures are retained in hashed logs. Final checks:

| Check | Observed result |
| --- | --- |
| Worker commerce/boundary/protected regression | 893 PASS |
| Full worker evaluation Node tests | 819 PASS, 0 FAIL, 2 existing SKIP |
| Existing protected claims/reply assembly | 21 PASS |
| Worker build, typecheck, lint | PASS; typecheck/lint exit0 recorded atdd88 |
| Focused actual PostgreSQL checkout matrix | 8/8 PASS |
| Full actual disposable PostgreSQL matrix | 118/118 PASS: 110 retained/opening-photo plus8 checkout controls |
| Existing PostgreSQL invariant validator | 7/7 PASS |

Counts overlap and are not model attempts. The full118 includes `C opening add-confirm batch commits its native question and photo atomically` in the retained/opening cohort: fresh empty-cart fixture, one native add+confirm batch, committed one-line cart, no purchase confirmation, missing-field clarification plus photo, zero verifier and at most six primitive units. The eight new checkout controls additionally prove existing-cart/private paths and strict durable capture. PostgreSQL source was clean dd88, providerGenerations0/sendEnabledfalse, disposable database dropped. Full fixture uses real PostgreSQL with synthetic domain inputs/current policy capture; it is not a customer-facing live run. Commands, exact source hashes and47 artifact hashes: [machine evidence](c3-phase-c-opening-checkout-media-verification-20261102.json).

Prior PostgreSQL failures remain recorded: PG01/02 strict capture correctly rejected an older unaccepted setup ACK contaminating the measurement. The fixture now cancels that scoped undelivered group through the audited cancellation path, preserves its row/audit and asserts no prior accepted output. PG03 native preview/proof passed; an overbroad test included raw diagnostic traces in a model-privacy assertion. The assertion now checks the actual model history projection. Runtime privacy was not weakened and raw native diagnostic records were retained.

## Limits and disposition

Same independent reviewer **APPROVE IMPLEMENTATION** at executable `dd88d38396c15c82ef315e8352c4494a29d7ba9b`, runtime603 byte parity, after all47 artifact and15 source hashes matched. No remaining blocking implementation/evidence finding; [review record](c3-phase-c-opening-checkout-media-review-20261102.md). No new semantic role, parser, prompt/schema/provider change, retry loop, budget increase, shared-package source/migration or production entrypoint wiring. Structural delta: one code-owned media helper and one optional persisted-session callback, plus exact offline capture/proof support.

Conflicting component colours retain the existing silent handoff. Unknown history, missing/stale shop or media source, insufficient budget and failed authority remain fail closed. Private input without a valid cart does not create an implicit cart. Standalone compositions retain the confirm fence unless persisted media support is supplied.

Model quality/stability and new Phase C qualification were not run. C3 preparation/information parity remains INFORMATION_PARITY_NOT_ESTABLISHED, replacement machine-blocked; Phase C remains BLOCKED / C3 comparison NOT_RUN / B_NOT_GO. No automatic provider campaign, merge, deploy, shop-source write or live send.
